"use server";

import { redirect } from "next/navigation";
import { scheduleSyncIfStale } from "../alfacrm/sync";
import { checkPassword, createSession, destroySession, recordLoginAttempt, tooManyLoginAttempts } from "../auth";
import { prisma } from "../db";
import { clientIp, safeNextPath } from "../request";
import { validateLogin } from "../validate";

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
