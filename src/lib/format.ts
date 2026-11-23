const TIME_ZONE = "Asia/Almaty";

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(date);
}

export function formatDateShort(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    timeZone: TIME_ZONE,
  }).format(date);
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(date);
}

export function toInputDate(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TIME_ZONE,
  }).format(date);
}

export function formatAmount(value: number) {
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1).replace(".", ",");
  return text;
}

export function kiberonWord(value: number) {
  const abs = Math.abs(Math.trunc(value)) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return "киберонов";
  if (last === 1) return "киберон";
  if (last >= 2 && last <= 4) return "киберона";
  return "киберонов";
}

export function campusFromGroup(groupName: string) {
  const found: string[] = [];
  if (/гоголя/i.test(groupName)) found.push("Гоголя");
  if (/стр/i.test(groupName)) found.push("Стр");
  return found.join(", ");
}

export function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

export function lessonStatusLabel(status: string) {
  switch (status) {
    case "held":
      return "Были";
    case "missed":
      return "Не были";
    case "planned":
      return "Скоро";
    case "cancelled":
      return "Отменён";
    default:
      return "Без отметки";
  }
}

export function homeworkStatusLabel(status: string) {
  switch (status) {
    case "submitted":
      return "Сдано";
    case "checked":
      return "Проверено";
    default:
      return "Нужно сделать";
  }
}

export function bonusKindLabel(kind: string) {
  switch (kind) {
    case "spend":
      return "Списание";
    case "commodity":
      return "Магазин";
    case "compensation":
      return "Компенсация";
    default:
      return "Начисление";
  }
}
