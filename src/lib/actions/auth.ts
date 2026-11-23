"use server";

import { redirect } from "next/navigation";
import { scheduleSyncIfStale } from "../alfacrm/sync";
import { checkPassword, clearUserSessions, createSession, destroySession, hashPassword, hashToken, recordLoginAttempt, requireAdmin, tooManyLoginAttempts } from "../auth";
import { SESSION_COOKIE } from "../constants";
import { cookies } from "next/headers";
import { prisma } from "../db";
import { clientIp, safeNextPath } from "../request";
import { validateLogin, validatePassword } from "../validate";

export async function login(_prev: { message: string; login: string }, formData: FormData) {
  const loginName = String(formData.get("login") || "").trim();
  const password = String(formData.get("password") || "");
  const invalid = "Неверный логин или пароль.";
  if (validateLogin(loginName) || !password) return { message: invalid, login: loginName };

  const ip = await clientIp();
  if (await tooManyLoginAttempts(loginName, ip)) {
    return { message: "Слишком много попыток. Подождите 15 минут и попробуйте снова.", login: loginName };
  }

  const user = await prisma.user.findUnique({ where: { login: loginName } });
  const matches = await checkPassword(password, user?.passwordHash ?? null);
  if (!user || !matches) {
    await recordLoginAttempt(loginName, ip, false);
    return { message: invalid, login: loginName };
  }
  if (!user.isActive) {
    await recordLoginAttempt(loginName, ip, false);
    return { message: "Аккаунт отключён. Попросите преподавателя включить его.", login: loginName };
  }

  await recordLoginAttempt(loginName, ip, true);
  scheduleSyncIfStale();
  await createSession(user.id);
  redirect(safeNextPath(formData.get("next"), user.role));
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export type ChangePasswordState = {
  message: string;
  ok?: boolean;
};

export async function changeAdminPassword(_prev: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const admin = await requireAdmin();
  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  if (!currentPassword) return { message: "Введите текущий пароль." };
  const matches = await checkPassword(currentPassword, admin.passwordHash);
  if (!matches) return { message: "Текущий пароль неверный." };
  const passwordError = validatePassword(newPassword, true, 3);
  if (passwordError) return { message: passwordError };
  if (newPassword !== confirmPassword) return { message: "Новый пароль и подтверждение не совпадают." };
  if (newPassword === currentPassword) return { message: "Новый пароль должен отличаться от текущего." };
  await prisma.user.update({
    where: { id: admin.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { userId: admin.id, tokenHash: { not: hashToken(token) } } });
  } else {
    await clearUserSessions(admin.id);
  }
  return { ok: true, message: "Пароль изменён" };
}
