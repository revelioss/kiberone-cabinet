import { z } from "zod";

const loginSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9._-]{3,32}$/, "Логин: 3–32 символа, латиница, цифры, точка, _ или -.");


const urlSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || /^https?:\/\/\S+$/i.test(value), "Ссылка должна начинаться с http:// или https://");

export function validateLogin(login: string) {
  const parsed = loginSchema.safeParse(login);
  return parsed.success ? null : parsed.error.issues[0]?.message ?? "Проверьте логин.";
}

export function validatePassword(password: string, required: boolean, minLength = 8) {
  if (!password && !required) return null;
  const schema = z
    .string()
    .min(minLength, `Пароль не короче ${minLength} символов.`)
    .max(72, "Пароль не длиннее 72 символов.");
  const parsed = schema.safeParse(password);
  return parsed.success ? null : parsed.error.issues[0]?.message ?? "Проверьте пароль.";
}

export function validateUrl(value: string) {
  const parsed = urlSchema.safeParse(value);
  return parsed.success ? null : parsed.error.issues[0]?.message ?? "Проверьте ссылку.";
}

export function validateName(value: string) {
  const name = value.trim();
  if (name.length < 2) return "Укажите имя и фамилию.";
  if (name.length > 80) return "Имя слишком длинное.";
  return null;
}

export function parseOptionalInt(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true as const, value: null };
  if (!/^\d+$/.test(trimmed)) return { ok: false as const, error: "ID AlfaCRM — целое число." };
  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return { ok: false as const, error: "ID AlfaCRM — целое число." };
  }
  return { ok: true as const, value: parsed };
}

export function parseActiveFlag(value: string) {
  const normalized = value.trim().toLowerCase();
  if (["0", "нет", "no", "false", "выкл"].includes(normalized)) return false;
  return true;
}
