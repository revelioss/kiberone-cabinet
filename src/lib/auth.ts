import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LOGIN_MAX_FAILURES, LOGIN_WINDOW_MS, SESSION_COOKIE, SESSION_DAYS } from "./constants";
import { prisma } from "./db";
import { checkPassword, hashPassword } from "./password";

export { checkPassword, hashPassword };

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function tooManyLoginAttempts(login: string, ip: string) {
  const since = new Date(Date.now() - LOGIN_WINDOW_MS);
  const failures = await prisma.loginAttempt.count({
    where: {
      success: false,
      createdAt: { gte: since },
      OR: [{ login }, { ip }],
    },
  });
  return failures >= LOGIN_MAX_FAILURES;
}

export async function recordLoginAttempt(login: string, ip: string, success: boolean) {
  await prisma.loginAttempt.create({ data: { login, ip, success } });
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
  await prisma.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  jar.delete(SESSION_COOKIE);
}

export async function clearUserSessions(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
}

export async function getSessionUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { student: true } } },
  });
  if (!session || session.expiresAt.getTime() < Date.now()) {
    if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (!session.user.isActive) return null;
  return session.user;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireStudent() {
  const user = await requireUser();
  if (user.role !== "STUDENT" || !user.student) redirect(user.role === "ADMIN" ? "/admin" : "/login");
  return { user, student: user.student };
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

