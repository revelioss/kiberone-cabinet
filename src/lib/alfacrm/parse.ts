export type ParsedBonus = {
  externalId: string;
  amount: number;
  balanceAfter: number | null;
  note: string;
  kind: string;
  occurredAt: Date;
};

export type ParsedLesson = {
  externalId: string;
  occurredOn: Date;
  timeFrom: string;
  timeTo: string;
  topic: string;
  subject: string;
  status: "planned" | "held" | "missed" | "cancelled" | "unknown";
  homeworkText: string;
  groupIds: number[];
};

export type ParsedTest = {
  externalId: string;
  title: string;
  score: number | null;
  maxScore: number | null;
  takenAt: Date;
  comment: string;
};

export type Membership = {
  groupId: number;
  name: string;
  from: Date | null;
  to: Date | null;
};

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function extractItems(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter((item) => asRecord(item)).map((item) => asRecord(item)!);
  }
  const record = asRecord(payload);
  if (!record) return [];
  if (Array.isArray(record.items)) {
    return record.items.filter((item) => asRecord(item)).map((item) => asRecord(item)!);
  }
  const model = asRecord(record.model);
  if (model) return [model];
  return [];
}

export function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function parseDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (value == null) return null;
  const source = String(value).trim();
  if (!source) return null;
  const dotted = source.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (dotted) {
    return new Date(Date.UTC(Number(dotted[3]), Number(dotted[2]) - 1, Number(dotted[1]), 12));
  }
  const iso = source.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12));
  }
  const timestamp = Date.parse(source);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp);
}

export function parseBalance(payload: unknown): number | null {
  const direct = toNumber(payload);
  if (direct != null) return direct;
  const record = asRecord(payload);
  if (!record) return null;
  const nested = asRecord(record.model) ?? asRecord(record.data) ?? record;
  for (const key of ["balance_bonus", "balance", "amount", "value", "bonus"]) {
    const parsed = toNumber(nested[key]);
    if (parsed != null) return parsed;
  }
  return null;
}

export function customerBonusFallback(customer: Record<string, unknown> | null, preferredField?: string) {
  if (!customer) return null;
  const keys = [
    preferredField,
    "balance_bonus",
    "bonus_balance",
    "custom_bonus",
    "custom_kiberons",
    "custom_kiberony",
  ].filter((key): key is string => Boolean(key));
  for (const key of keys) {
    const parsed = toNumber(customer[key]);
    if (parsed != null) return parsed;
  }
  return null;
}

function text(value: unknown) {
  return value == null ? "" : String(value).trim();
}

function clock(value: unknown) {
  const source = text(value);
  const match = source.match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "";
}

function idList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => toNumber(item)).filter((item): item is number => item != null);
}

export function bonusKind(type: unknown, amount: number) {
  const numeric = toNumber(type);
  if (numeric === 1) return { kind: "spend", amount: -Math.abs(amount) };
  if (numeric === 2) return { kind: "commodity", amount: -Math.abs(amount) };
  if (numeric === 3) return { kind: "compensation", amount: -Math.abs(amount) };
  if (amount < 0) return { kind: "spend", amount };
  return { kind: "accrue", amount };
}

export function parseBonusItem(item: Record<string, unknown>, customerId: number, index: number): ParsedBonus | null {
  const rawAmount = toNumber(item.amount);
  if (rawAmount == null || rawAmount === 0) return null;
  const itemCustomer = toNumber(item.customer_id);
  if (itemCustomer != null && itemCustomer !== customerId) return null;
  const occurredAt = parseDate(item.date) ?? parseDate(item.created_at) ?? parseDate(item.document_date);
  if (!occurredAt) return null;
  const signed = bonusKind(item.type, rawAmount);
  const rawId = toNumber(item.id);
  const note = text(item.note) || text(item.comment);
  const externalId = rawId != null
    ? `bonus:${customerId}:${rawId}`
    : `bonus:${customerId}:${occurredAt.toISOString().slice(0, 10)}:${signed.amount}:${note}:${index}`;
  return {
    externalId,
    amount: signed.amount,
    balanceAfter: toNumber(item.balance_bonus) ?? toNumber(item.calc_balance_bonus),
    note,
    kind: signed.kind,
    occurredAt,
  };
}

export function lessonBelongsToStudent(
  lesson: Record<string, unknown>,
  customerId: number,
  memberships: Membership[],
) {
  const customers = idList(lesson.customer_ids);
  if (customers.includes(customerId)) return true;
  const details = Array.isArray(lesson.details) ? lesson.details : [];
  if (details.some((detail) => toNumber(asRecord(detail)?.customer_id) === customerId)) return true;
  const groups = idList(lesson.group_ids);
  if (groups.length === 0 || memberships.length === 0) return false;
  const when = parseDate(lesson.date) ?? parseDate(lesson.lesson_date);
  return groups.some((groupId) =>
    memberships.some((membership) => {
      if (membership.groupId !== groupId) return false;
      if (!when) return true;
      if (membership.from && when < membership.from) return false;
      if (membership.to && when > membership.to) return false;
      return true;
    }),
  );
}

export function parseLesson(
  lesson: Record<string, unknown>,
  customerId: number,
  subjectName: string,
): ParsedLesson | null {
  const id = toNumber(lesson.id);
  const occurredOn = parseDate(lesson.date) ?? parseDate(lesson.lesson_date);
  if (id == null || !occurredOn) return null;
  const statusCode = toNumber(lesson.status);
  const details = Array.isArray(lesson.details) ? lesson.details : [];
  const detail = details
    .map((item) => asRecord(item))
    .find((item) => item && toNumber(item.customer_id) === customerId);
  let status: ParsedLesson["status"] = "unknown";
  if (statusCode === 1) status = "planned";
  else if (statusCode === 2) status = "cancelled";
  else if (statusCode === 3) {
    if (!detail) {
      status = idList(lesson.customer_ids).includes(customerId) ? "held" : "unknown";
    } else {
      const attend = detail.is_attend;
      const present = attend === 1 || attend === true || attend === "1" || attend === "true";
      const absent = attend === 0 || attend === false || attend === "0" || attend === "false";
      status = present ? "held" : absent ? "missed" : "unknown";
    }
  }
  const topic = text(lesson.topic) || text(lesson.name) || subjectName || "Без темы";
  return {
    externalId: `lesson:${id}:${customerId}`,
    occurredOn,
    timeFrom: clock(lesson.time_from),
    timeTo: clock(lesson.time_to),
    topic,
    subject: subjectName,
    status,
    homeworkText: text(lesson.homework),
    groupIds: idList(lesson.group_ids),
  };
}

export function bonusesFromLessons(
  lessons: Record<string, unknown>[],
  customerId: number,
  subjects: Map<number, string>,
) {
  const rows: ParsedBonus[] = [];
  for (const lesson of lessons) {
    const lessonId = toNumber(lesson.id);
    const occurredAt = parseDate(lesson.date) ?? parseDate(lesson.lesson_date);
    if (lessonId == null || !occurredAt) continue;
    const details = Array.isArray(lesson.details) ? lesson.details : [];
    const detail = details
      .map((item) => asRecord(item))
      .find((item) => item && toNumber(item.customer_id) === customerId);
    const amount = toNumber(detail?.bonus);
    if (amount == null || amount === 0) continue;
    const subjectId = toNumber(lesson.subject_id);
    const topic = text(lesson.topic) || text(lesson.name) || (subjectId != null ? subjects.get(subjectId) : "") || "урок";
    const signed = bonusKind(null, amount);
    rows.push({
      externalId: `lesson-bonus:${lessonId}:${customerId}`,
      amount: signed.amount,
      balanceAfter: null,
      note: signed.amount < 0 ? `Списание на уроке «${topic}»` : `Начисление за урок «${topic}»`,
      kind: signed.kind,
      occurredAt,
    });
  }
  return rows;
}

export function parseMemberships(items: Record<string, unknown>[], groups: Map<number, string>): Membership[] {
  const memberships: Membership[] = [];
  for (const item of items) {
    const groupId = toNumber(item.group_id);
    if (groupId == null) continue;
    memberships.push({
      groupId,
      name: groups.get(groupId) || text(item.name) || `Группа ${groupId}`,
      from: parseDate(item.b_date),
      to: parseDate(item.e_date),
    });
  }
  return memberships;
}

export function activeGroupNames(memberships: Membership[], today = new Date()) {
  const active = memberships.filter((item) => {
    if (item.to && item.to < today) return false;
    return true;
  });
  const source = active.length > 0 ? active : memberships;
  return [...new Set(source.map((item) => item.name).filter(Boolean))];
}

function pick(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value != null && String(value).trim() !== "") return value;
  }
  return null;
}

export function parseTest(record: Record<string, unknown>, customerId: number): ParsedTest | null {
  const itemCustomer = toNumber(record.customer_id);
  if (itemCustomer != null && itemCustomer !== customerId) return null;
  const id = toNumber(record.id);
  const title = text(pick(record, ["name", "title", "subject", "test", "test_name", "lesson_name"]));
  const score = toNumber(pick(record, ["score", "grade", "result", "points", "ball", "percent", "mark"]));
  const maxScore = toNumber(pick(record, ["max_score", "max", "max_grade", "max_ball", "max_points"]));
  const takenAt = parseDate(pick(record, ["date", "taken_at", "test_date", "created_at", "updated_at", "datetime"]));
  if (!title && score == null) return null;
  if (!takenAt || id == null) return null;
  return {
    externalId: `test:${id}:${customerId}`,
    title: title || "Тест",
    score,
    maxScore,
    takenAt,
    comment: text(pick(record, ["comment", "note", "description"])),
  };
}

export function studyStatusName(customer: Record<string, unknown> | null, statuses: Map<number, string>) {
  if (!customer) return "";
  const id = toNumber(customer.study_status_id);
  if (id == null) return "";
  return statuses.get(id) ?? "";
}

export function customerName(customer: Record<string, unknown> | null) {
  return customer ? text(customer.name) : "";
}
