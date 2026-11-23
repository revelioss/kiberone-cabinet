import { campusFromGroup } from "../format";
import { prisma } from "../db";
import { alfaMode, readAlfaConfig, type AlfaApi, LiveAlfaApi } from "./client";
import { MockAlfaApi } from "./mock";
import {
  activeGroupNames,
  bonusesFromLessons,
  customerBonusFallback,
  customerName,
  lessonBelongsToStudent,
  parseBalance,
  parseBonusItem,
  parseDate,
  parseLesson,
  parseMemberships,
  parseTest,
  studyStatusName,
  toNumber,
} from "./parse";

type SyncTrigger = "manual" | "cron" | "script" | "seed" | "login";

export function syncAgeExceeded(finishedAt: Date | null | undefined, maxAgeHours: number, now = Date.now()) {
  if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0) return false;
  if (!finishedAt) return true;
  return now - finishedAt.getTime() >= maxAgeHours * 60 * 60 * 1000;
}

export function syncMaxAgeHours() {
  const hours = Number(process.env.SYNC_MAX_AGE_HOURS ?? "6");
  return Number.isFinite(hours) ? hours : 6;
}

export async function syncIsStale() {
  const hours = syncMaxAgeHours();
  if (hours <= 0) return false;
  const latest = await prisma.syncRun.findFirst({
    where: { status: "ok" },
    orderBy: { finishedAt: "desc" },
  });
  return syncAgeExceeded(latest?.finishedAt, hours);
}

export function scheduleSyncIfStale() {
  void (async () => {
    try {
      if (!(await syncIsStale())) return;
      const active = await prisma.syncRun.findFirst({
        where: { status: "running", startedAt: { gt: new Date(Date.now() - 20 * 60 * 1000) } },
      });
      if (active) return;
      await runSync({ trigger: "login" });
    } catch (error) {
      console.error("Синхронизация при входе не запустилась", error);
    }
  })();
}

export type SyncResult = {
  ok: boolean;
  mode: "live" | "mock";
  message: string;
  stats: {
    students: number;
    updated: number;
    missing: number;
    bonuses: number;
    lessons: number;
    tests: number;
    warnings: string[];
  };
};

let running: Promise<SyncResult> | null = null;

export function createAlfaApi(): AlfaApi {
  const config = readAlfaConfig();
  if (!config) return new MockAlfaApi();
  return new LiveAlfaApi(config);
}

function dateWindow() {
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 400);
  const to = new Date();
  to.setUTCDate(to.getUTCDate() + 120);
  const format = (date: Date) => date.toISOString().slice(0, 10);
  return { date_from: format(from), date_to: format(to) };
}

function mapById(items: Record<string, unknown>[]) {
  const map = new Map<number, string>();
  for (const item of items) {
    const id = toNumber(item.id);
    const name = item.name == null ? "" : String(item.name).trim();
    if (id != null && name) map.set(id, name);
  }
  return map;
}

async function syncStudent(api: AlfaApi, studentId: string, alfacrmId: number, warnings: string[]) {
  const customer = await api.fetchCustomer(alfacrmId);
  if (!customer) {
    warnings.push(`Клиент AlfaCRM ${alfacrmId} не найден.`);
    await prisma.student.update({
      where: { id: studentId },
      data: { lastSyncedAt: new Date(), syncWarning: `Клиент ${alfacrmId} не найден в AlfaCRM.` },
    });
    return { missing: true, bonuses: 0, lessons: 0, tests: 0 };
  }

  const subjects = mapById(await api.fetchSubjects());
  const statuses = mapById(await api.fetchStudyStatuses());
  const membershipRows = await api.fetchMemberships(alfacrmId);
  const groupIds = [...new Set(membershipRows.map((item) => toNumber(item.group_id)).filter((id): id is number => id != null))];
  const groupRows = await api.fetchGroups(groupIds);
  const groupNames = mapById(groupRows);
  const memberships = parseMemberships(membershipRows, groupNames);
  const names = activeGroupNames(memberships);
  const embeddedGroups = Array.isArray(customer.groups) ? customer.groups : [];
  for (const group of embeddedGroups) {
    if (group && typeof group === "object" && "name" in group && group.name) {
      names.push(String(group.name));
    }
  }

  let balance = customerBonusFallback(customer, process.env.ALFACRM_BONUS_FIELD);
  if (balance == null) {
    try {
      balance = parseBalance(await api.fetchBonusBalance(alfacrmId));
    } catch (error) {
      const message = error instanceof Error ? error.message : "balance-bonus";
      warnings.push(`Баланс клиента ${alfacrmId}: ${message}`);
    }
  }
  if (balance == null) warnings.push(`Не удалось прочитать баланс бонусов клиента ${alfacrmId}.`);

  const history = await api.fetchBonusHistory(alfacrmId);
  if (history.note && !warnings.includes(history.note)) warnings.push(history.note);

  const window = dateWindow();
  const lessonMap = new Map<number, Record<string, unknown>>();
  for (const status of [1, 2, 3]) {
    const own = await api.fetchLessons({ ...window, status, customer_id: alfacrmId });
    for (const lesson of own) {
      const id = toNumber(lesson.id);
      if (id != null) lessonMap.set(id, lesson);
    }
    for (const groupId of groupIds) {
      const grouped = await api.fetchLessons({ ...window, status, group_id: groupId });
      for (const lesson of grouped) {
        const id = toNumber(lesson.id);
        if (id != null) lessonMap.set(id, lesson);
      }
    }
  }

  const lessonRecords = [...lessonMap.values()].filter((lesson) => lessonBelongsToStudent(lesson, alfacrmId, memberships));
  const parsedLessons = lessonRecords
    .map((lesson) => parseLesson(lesson, alfacrmId, subjects.get(toNumber(lesson.subject_id) ?? -1) ?? ""))
    .filter((lesson): lesson is NonNullable<typeof lesson> => lesson != null);

  const parsedBonuses = history.supported
    ? history.items
        .map((item, index) => parseBonusItem(item, alfacrmId, index))
        .filter((item): item is NonNullable<typeof item> => item != null)
    : bonusesFromLessons(lessonRecords, alfacrmId, subjects);

  const testsPayload = await api.fetchTests(alfacrmId);
  if (testsPayload.note) warnings.push(`${customerName(customer) || alfacrmId}: ${testsPayload.note}`);
  const parsedTests = testsPayload.items
    .map((item) => parseTest(item, alfacrmId))
    .filter((item): item is NonNullable<typeof item> => item != null);

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) return { missing: true, bonuses: 0, lessons: 0, tests: 0 };

  const name = customerName(customer);
  const groupName = [...new Set(names)].join(", ") || student.groupName;
  await prisma.student.update({
    where: { id: studentId },
    data: {
      fullName: name || student.fullName,
      groupName,
      campus: campusFromGroup(groupName),
      studyStatus: studyStatusName(customer, statuses),
      kiberonBalance: student.kiberonManualOverride || balance == null ? student.kiberonBalance : balance,
      lastSyncedAt: new Date(),
      syncWarning: warnings.filter((warning) => warning.includes(String(alfacrmId)) || warning.includes(name)).join(" "),
    },
  });

  await prisma.bonusTransaction.deleteMany({
    where: history.supported
      ? { studentId, source: "CRM" }
      : { studentId, source: "CRM", externalId: { startsWith: "lesson-bonus:" } },
  });
  if (parsedBonuses.length > 0) {
    await prisma.bonusTransaction.createMany({
      data: parsedBonuses.map((bonus) => ({
        studentId,
        externalId: bonus.externalId,
        amount: bonus.amount,
        balanceAfter: bonus.balanceAfter,
        note: bonus.note,
        kind: bonus.kind,
        occurredAt: bonus.occurredAt,
        source: "CRM" as const,
      })),
    });
  }

  const seenLessons = parsedLessons.map((lesson) => lesson.externalId);
  if (seenLessons.length > 0) {
    await prisma.lessonRecord.deleteMany({
      where: {
        studentId,
        source: "CRM",
        localOverride: false,
        externalId: { notIn: seenLessons },
      },
    });
  }
  for (const lesson of parsedLessons) {
    const existing = await prisma.lessonRecord.findUnique({ where: { externalId: lesson.externalId } });
    if (existing?.localOverride) continue;
    const groupNameForLesson = lesson.groupIds.map((id) => groupNames.get(id)).filter(Boolean).join(", ");
    await prisma.lessonRecord.upsert({
      where: { externalId: lesson.externalId },
      create: {
        studentId,
        externalId: lesson.externalId,
        occurredOn: lesson.occurredOn,
        timeFrom: lesson.timeFrom,
        timeTo: lesson.timeTo,
        topic: lesson.topic,
        subject: lesson.subject,
        groupName: groupNameForLesson,
        status: lesson.status,
        homeworkText: lesson.homeworkText,
        source: "CRM",
      },
      update: {
        occurredOn: lesson.occurredOn,
        timeFrom: lesson.timeFrom,
        timeTo: lesson.timeTo,
        topic: lesson.topic,
        subject: lesson.subject,
        groupName: groupNameForLesson,
        status: lesson.status,
        homeworkText: lesson.homeworkText,
        source: "CRM",
      },
    });
    if (!lesson.homeworkText) continue;
    const homeworkId = `hw:${lesson.externalId}`;
    const existingHomework = await prisma.homeworkItem.findUnique({ where: { externalId: homeworkId } });
    if (existingHomework) {
      await prisma.homeworkItem.update({
        where: { id: existingHomework.id },
        data: {
          title: lesson.topic,
          description: lesson.homeworkText,
          dueOn: lesson.occurredOn,
        },
      });
    } else {
      await prisma.homeworkItem.create({
        data: {
          studentId,
          externalId: homeworkId,
          title: lesson.topic,
          description: lesson.homeworkText,
          dueOn: lesson.occurredOn,
          status: "new",
          source: "CRM",
        },
      });
    }
  }

  for (const test of parsedTests) {
    await prisma.testResult.upsert({
      where: { externalId: test.externalId },
      create: {
        studentId,
        externalId: test.externalId,
        title: test.title,
        score: test.score,
        maxScore: test.maxScore,
        takenAt: test.takenAt,
        comment: test.comment,
        source: "CRM",
      },
      update: {
        title: test.title,
        score: test.score,
        maxScore: test.maxScore,
        takenAt: test.takenAt,
        comment: test.comment,
      },
    });
  }

  return {
    missing: false,
    bonuses: parsedBonuses.length,
    lessons: parsedLessons.length,
    tests: parsedTests.length,
  };
}

export async function runSync(options: { trigger: SyncTrigger; studentId?: string }): Promise<SyncResult> {
  if (running) return running;
  running = runSyncInner(options).finally(() => {
    running = null;
  });
  return running;
}

async function runSyncInner(options: { trigger: SyncTrigger; studentId?: string }): Promise<SyncResult> {
  const mode = alfaMode();
  const run = await prisma.syncRun.create({
    data: { status: "running", mode, trigger: options.trigger, message: "Синхронизация началась" },
  });
  const warnings: string[] = [];
  const stats = { students: 0, updated: 0, missing: 0, bonuses: 0, lessons: 0, tests: 0, warnings };
  try {
    const api = createAlfaApi();
    const students = await prisma.student.findMany({
      where: {
        ...(options.studentId ? { id: options.studentId } : {}),
        alfacrmId: { not: null },
        user: { isActive: true },
      },
    });
    stats.students = students.length;
    if (students.length === 0) warnings.push("Нет активных учеников с ID AlfaCRM.");
    for (const student of students) {
      if (student.alfacrmId == null) continue;
      try {
        const result = await syncStudent(api, student.id, student.alfacrmId, warnings);
        if (result.missing) stats.missing += 1;
        else stats.updated += 1;
        stats.bonuses += result.bonuses;
        stats.lessons += result.lessons;
        stats.tests += result.tests;
      } catch (error) {
        const message = error instanceof Error ? error.message : "неизвестная ошибка";
        warnings.push(`${student.fullName}: ${message}`);
      }
    }
    const message = mode === "mock"
      ? `Демо-режим. Обновлено учеников: ${stats.updated}.`
      : `AlfaCRM. Обновлено учеников: ${stats.updated}.`;
    await prisma.syncRun.update({
      where: { id: run.id },
      data: {
        status: warnings.length > 0 && stats.updated === 0 ? "error" : "ok",
        finishedAt: new Date(),
        message,
        statsJson: JSON.stringify(stats),
      },
    });
    return { ok: true, mode, message, stats };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Синхронизация остановилась.";
    await prisma.syncRun.update({
      where: { id: run.id },
      data: { status: "error", finishedAt: new Date(), message, statsJson: JSON.stringify(stats) },
    });
    return { ok: false, mode, message, stats };
  }
}

export function assertDate(value: string) {
  const parsed = parseDate(value);
  if (!parsed) throw new Error("Укажите дату.");
  return parsed;
}
