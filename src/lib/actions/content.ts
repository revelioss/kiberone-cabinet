"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../auth";
import { prisma } from "../db";
import { assertDate } from "../alfacrm/sync";
import { removeUpload, saveUpload } from "../storage";

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function studentPath(formData: FormData, ok: string): never {
  const studentId = text(formData, "studentId");
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/");
  redirect(`/admin/students/${studentId}?ok=${ok}`);
}

function fail(studentId: string, message: string): never {
  redirect(`/admin/students/${studentId}?error=${encodeURIComponent(message)}`);
}

export async function saveBonus(formData: FormData) {
  await requireAdmin();
  const studentId = text(formData, "studentId");
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) fail(studentId, "Ученик не найден.");
  const amount = Number(text(formData, "amount").replace(",", "."));
  if (!Number.isFinite(amount) || amount === 0) fail(studentId, "Укажите сумму: положительную для начисления, отрицательную для списания.");
  let occurredAt: Date;
  try {
    occurredAt = assertDate(text(formData, "occurredAt"));
  } catch {
    fail(studentId, "Укажите дату операции.");
  }
  const kind = amount < 0 ? (text(formData, "kind") || "spend") : "accrue";
  await prisma.bonusTransaction.create({
    data: {
      studentId,
      amount,
      note: text(formData, "note"),
      kind,
      occurredAt,
      source: "MANUAL",
    },
  });
  if (student.kiberonManualOverride) {
    await prisma.student.update({
      where: { id: studentId },
      data: { kiberonBalance: student.kiberonBalance + amount },
    });
  }
  studentPath(formData, "bonus");
}

export async function deleteBonus(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const row = await prisma.bonusTransaction.findUnique({ where: { id }, include: { student: true } });
  if (!row || row.source !== "MANUAL") fail(text(formData, "studentId"), "Строку из CRM удалять не нужно: синхронизация вернёт её.");
  await prisma.bonusTransaction.delete({ where: { id } });
  if (row.student.kiberonManualOverride) {
    await prisma.student.update({
      where: { id: row.studentId },
      data: { kiberonBalance: row.student.kiberonBalance - row.amount },
    });
  }
  studentPath(formData, "bonus");
}

export async function setBalanceMode(formData: FormData) {
  await requireAdmin();
  const studentId = text(formData, "studentId");
  const override = formData.get("kiberonManualOverride") === "on";
  const raw = text(formData, "kiberonBalance").replace(",", ".");
  const balance = Number(raw);
  if (override && !Number.isFinite(balance)) fail(studentId, "Укажите баланс числом.");
  await prisma.student.update({
    where: { id: studentId },
    data: {
      kiberonManualOverride: override,
      ...(override ? { kiberonBalance: balance } : {}),
    },
  });
  studentPath(formData, "balance");
}

export async function saveLesson(formData: FormData) {
  await requireAdmin();
  const studentId = text(formData, "studentId");
  const id = text(formData, "id");
  let occurredOn: Date;
  try {
    occurredOn = assertDate(text(formData, "occurredOn"));
  } catch {
    fail(studentId, "Укажите дату урока.");
  }
  const topic = text(formData, "topic");
  if (topic.length < 2) fail(studentId, "Укажите тему урока.");
  const status = text(formData, "status") || "held";
  const data = {
    occurredOn,
    timeFrom: text(formData, "timeFrom"),
    timeTo: text(formData, "timeTo"),
    topic,
    subject: text(formData, "subject"),
    groupName: text(formData, "groupName"),
    status,
    homeworkText: text(formData, "homeworkText"),
  };
  if (id) {
    await prisma.lessonRecord.update({
      where: { id },
      data: { ...data, localOverride: true },
    });
  } else {
    await prisma.lessonRecord.create({
      data: { ...data, studentId, source: "MANUAL", localOverride: true },
    });
  }
  studentPath(formData, "lesson");
}

export async function deleteLesson(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const row = await prisma.lessonRecord.findUnique({ where: { id } });
  if (!row) fail(text(formData, "studentId"), "Урок не найден.");
  if (row.source === "CRM" && !row.localOverride) {
    await prisma.lessonRecord.update({ where: { id }, data: { localOverride: true, status: "cancelled" } });
  } else {
    await prisma.lessonRecord.delete({ where: { id } });
  }
  studentPath(formData, "lesson");
}

export async function releaseLesson(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  await prisma.lessonRecord.update({ where: { id }, data: { localOverride: false } });
  studentPath(formData, "lesson");
}

export async function saveHomework(formData: FormData) {
  await requireAdmin();
  const studentId = text(formData, "studentId");
  const id = text(formData, "id");
  const title = text(formData, "title");
  if (title.length < 2) fail(studentId, "Укажите название задания.");
  const dueRaw = text(formData, "dueOn");
  const dueOn = dueRaw ? assertDate(dueRaw) : null;
  const data = {
    title,
    description: text(formData, "description"),
    dueOn,
    status: text(formData, "status") || "new",
    teacherComment: text(formData, "teacherComment"),
    grade: text(formData, "grade"),
  };
  if (id) await prisma.homeworkItem.update({ where: { id }, data });
  else await prisma.homeworkItem.create({ data: { ...data, studentId, source: "MANUAL" } });
  studentPath(formData, "homework");
}

export async function deleteHomework(formData: FormData) {
  await requireAdmin();
  await prisma.homeworkItem.delete({ where: { id: text(formData, "id") } });
  studentPath(formData, "homework");
}

export async function saveTest(formData: FormData) {
  await requireAdmin();
  const studentId = text(formData, "studentId");
  const id = text(formData, "id");
  const title = text(formData, "title");
  if (title.length < 2) fail(studentId, "Укажите название теста.");
  let takenAt: Date;
  try {
    takenAt = assertDate(text(formData, "takenAt"));
  } catch {
    fail(studentId, "Укажите дату теста.");
  }
  const scoreRaw = text(formData, "score").replace(",", ".");
  const maxRaw = text(formData, "maxScore").replace(",", ".");
  const score = scoreRaw ? Number(scoreRaw) : null;
  const maxScore = maxRaw ? Number(maxRaw) : null;
  if ((scoreRaw && !Number.isFinite(score)) || (maxRaw && !Number.isFinite(maxScore))) {
    fail(studentId, "Баллы должны быть числами.");
  }
  const data = { title, score, maxScore, takenAt, comment: text(formData, "comment") };
  if (id) await prisma.testResult.update({ where: { id }, data });
  else await prisma.testResult.create({ data: { ...data, studentId, source: "MANUAL" } });
  studentPath(formData, "test");
}

export async function deleteTest(formData: FormData) {
  await requireAdmin();
  await prisma.testResult.delete({ where: { id: text(formData, "id") } });
  studentPath(formData, "test");
}

async function storedFile(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return null;
  const saved = await saveUpload(file);
  return { fileName: saved.fileName, filePath: saved.stored, mimeType: saved.mimeType };
}

export async function saveCertificate(formData: FormData) {
  await requireAdmin();
  const studentId = text(formData, "studentId");
  const id = text(formData, "id");
  const title = text(formData, "title");
  if (title.length < 2) fail(studentId, "Укажите название грамоты.");
  const issuedRaw = text(formData, "issuedOn");
  let fileFields: { fileName: string; filePath: string; mimeType: string } | null = null;
  try {
    fileFields = await storedFile(formData);
  } catch (error) {
    fail(studentId, error instanceof Error ? error.message : "Не удалось сохранить файл.");
  }
  const data = {
    title,
    note: text(formData, "note"),
    issuedOn: issuedRaw ? assertDate(issuedRaw) : null,
    ...(fileFields ?? {}),
  };
  if (id) {
    const previous = await prisma.certificate.findUnique({ where: { id } });
    if (fileFields && previous?.filePath) await removeUpload(previous.filePath);
    await prisma.certificate.update({ where: { id }, data });
  } else {
    await prisma.certificate.create({ data: { ...data, studentId } });
  }
  studentPath(formData, "certificate");
}

export async function deleteCertificate(formData: FormData) {
  await requireAdmin();
  const row = await prisma.certificate.findUnique({ where: { id: text(formData, "id") } });
  if (row) {
    await removeUpload(row.filePath);
    await prisma.certificate.delete({ where: { id: row.id } });
  }
  studentPath(formData, "certificate");
}

export async function saveAchievement(formData: FormData) {
  await requireAdmin();
  const studentId = text(formData, "studentId");
  const id = text(formData, "id");
  const title = text(formData, "title");
  if (title.length < 2) fail(studentId, "Укажите название достижения.");
  const awardedRaw = text(formData, "awardedOn");
  let fileFields: { fileName: string; filePath: string; mimeType: string } | null = null;
  try {
    fileFields = await storedFile(formData);
  } catch (error) {
    fail(studentId, error instanceof Error ? error.message : "Не удалось сохранить файл.");
  }
  const data = {
    title,
    description: text(formData, "description"),
    awardedOn: awardedRaw ? assertDate(awardedRaw) : null,
    ...(fileFields ?? {}),
  };
  if (id) {
    const previous = await prisma.achievement.findUnique({ where: { id } });
    if (fileFields && previous?.filePath) await removeUpload(previous.filePath);
    await prisma.achievement.update({ where: { id }, data });
  } else {
    await prisma.achievement.create({ data: { ...data, studentId } });
  }
  studentPath(formData, "achievement");
}

export async function deleteAchievement(formData: FormData) {
  await requireAdmin();
  const row = await prisma.achievement.findUnique({ where: { id: text(formData, "id") } });
  if (row) {
    await removeUpload(row.filePath);
    await prisma.achievement.delete({ where: { id: row.id } });
  }
  studentPath(formData, "achievement");
}
