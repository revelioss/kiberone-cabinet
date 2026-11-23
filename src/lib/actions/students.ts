"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { campusFromGroup } from "../format";
import { clearUserSessions, hashPassword, requireAdmin } from "../auth";
import { parseCsv } from "../csv";
import { prisma } from "../db";
import { removeUpload } from "../storage";
import { parseActiveFlag, parseOptionalInt, validateLogin, validateName, validatePassword, validateUrl } from "../validate";
import { importOneCrmStudent } from "../crm-import";
import { createAlfaApi } from "../alfacrm/sync";

export type AccountState = {
  message: string;
  password?: string;
  studentId?: string;
};

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

async function ensureLoginFree(login: string, userId?: string) {
  const existing = await prisma.user.findUnique({ where: { login } });
  if (existing && existing.id !== userId) return "Такой логин уже занят.";
  return null;
}

async function ensureCrmFree(alfacrmId: number | null, studentId?: string) {
  if (alfacrmId == null) return null;
  const existing = await prisma.student.findUnique({ where: { alfacrmId } });
  if (existing && existing.id !== studentId) return "Этот ID AlfaCRM уже привязан к другому ученику.";
  return null;
}

export async function createStudent(_prev: AccountState, formData: FormData): Promise<AccountState> {
  await requireAdmin();
  const fullName = text(formData, "fullName");
  const login = text(formData, "login");
  const password = String(formData.get("password") || "");
  const groupName = text(formData, "groupName");
  const portfolioUrl = text(formData, "portfolioUrl");
  const driveUrl = text(formData, "driveUrl");
  const driveFolderName = text(formData, "driveFolderName") || fullName;
  const crm = parseOptionalInt(text(formData, "alfacrmId"));
  const nameError = validateName(fullName);
  const loginError = validateLogin(login);
  const passwordError = validatePassword(password, true);
  const urlError = validateUrl(portfolioUrl) || validateUrl(driveUrl);
  if (nameError || loginError || passwordError || urlError || !crm.ok) {
    return { message: nameError || loginError || passwordError || urlError || crm.error || "Проверьте поля." };
  }
  const taken = (await ensureLoginFree(login)) || (await ensureCrmFree(crm.value));
  if (taken) return { message: taken };

  const student = await prisma.student.create({
    data: {
      fullName,
      groupName,
      campus: campusFromGroup(groupName),
      portfolioUrl,
      driveUrl,
      driveFolderName,
      alfacrmId: crm.value,
      user: {
        create: {
          login,
          passwordHash: await hashPassword(password),
          role: "STUDENT",
          isActive: true,
        },
      },
    },
  });
  revalidatePath("/admin/students");
  return {
    message: "Ученик создан. Передайте логин и пароль. Пароль больше нигде не покажется.",
    password,
    studentId: student.id,
  };
}

export async function updateAccount(_prev: AccountState, formData: FormData): Promise<AccountState> {
  await requireAdmin();
  const studentId = text(formData, "studentId");
  const student = await prisma.student.findUnique({ where: { id: studentId }, include: { user: true } });
  if (!student) return { message: "Ученик не найден." };
  const fullName = text(formData, "fullName");
  const login = text(formData, "login");
  const password = String(formData.get("password") || "");
  const groupName = text(formData, "groupName");
  const crm = parseOptionalInt(text(formData, "alfacrmId"));
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "1";
  const nameError = validateName(fullName);
  const loginError = validateLogin(login);
  const passwordError = validatePassword(password, false);
  if (nameError || loginError || passwordError || !crm.ok) {
    return { message: nameError || loginError || passwordError || (!crm.ok ? crm.error : "") || "Проверьте поля." };
  }
  const taken = (await ensureLoginFree(login, student.userId)) || (await ensureCrmFree(crm.value, student.id));
  if (taken) return { message: taken };

  await prisma.user.update({
    where: { id: student.userId },
    data: {
      login,
      isActive,
      ...(password ? { passwordHash: await hashPassword(password) } : {}),
    },
  });
  await prisma.student.update({
    where: { id: student.id },
    data: { fullName, groupName, campus: campusFromGroup(groupName), alfacrmId: crm.value },
  });
  if (password || !isActive) await clearUserSessions(student.userId);
  revalidatePath(`/admin/students/${student.id}`);
  revalidatePath("/admin/students");
  if (password) {
    return { message: "Пароль обновлён. Сообщите его ученику — повторно он не покажется.", password };
  }
  return { message: isActive ? "Данные входа сохранены." : "Аккаунт отключён, войти им больше нельзя." };
}

export async function updateLinks(formData: FormData) {
  await requireAdmin();
  const studentId = text(formData, "studentId");
  const portfolioUrl = text(formData, "portfolioUrl");
  const driveUrl = text(formData, "driveUrl");
  const driveFolderName = text(formData, "driveFolderName");
  const urlError = validateUrl(portfolioUrl) || validateUrl(driveUrl);
  if (urlError) redirect(`/admin/students/${studentId}?error=${encodeURIComponent(urlError)}`);
  await prisma.student.update({
    where: { id: studentId },
    data: { portfolioUrl, driveUrl, driveFolderName },
  });
  revalidatePath(`/admin/students/${studentId}`);
  redirect(`/admin/students/${studentId}?ok=links`);
}

export async function updateRating(formData: FormData) {
  await requireAdmin();
  const studentId = text(formData, "studentId");
  const enabled = formData.get("ratingEnabled") === "on";
  const rawScore = text(formData, "ratingScore");
  let ratingScore: number | null = null;
  if (rawScore) {
    if (!/^\d{1,4}$/.test(rawScore)) {
      redirect(`/admin/students/${studentId}?error=${encodeURIComponent("Балл рейтинга — число от 0 до 9999.")}`);
    }
    ratingScore = Number(rawScore);
  }
  await prisma.student.update({
    where: { id: studentId },
    data: { ratingEnabled: enabled, ratingScore },
  });
  revalidatePath(`/admin/students/${studentId}`);
  redirect(`/admin/students/${studentId}?ok=rating`);
}

export async function deleteStudent(formData: FormData) {
  await requireAdmin();
  const studentId = text(formData, "studentId");
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { certificates: true, achievements: true },
  });
  if (!student) redirect("/admin/students");
  await Promise.all([
    ...student.certificates.map((item) => removeUpload(item.filePath)),
    ...student.achievements.map((item) => removeUpload(item.filePath)),
  ]);
  await prisma.user.delete({ where: { id: student.userId } });
  revalidatePath("/admin/students");
  redirect("/admin/students?ok=deleted");
}

export async function importStudents(_prev: AccountState, formData: FormData): Promise<AccountState> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { message: "Выберите CSV-файл." };
  if (file.size > 1_000_000) return { message: "Файл больше 1 МБ." };
  const rows = parseCsv(await file.text());
  if (rows.length === 0) return { message: "В файле нет строк." };
  if (rows.length > 500) return { message: "За один раз можно загрузить не больше 500 строк." };

  let created = 0;
  let updated = 0;
  const errors: string[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const line = index + 2;
    const login = (row.login || "").trim();
    const password = row.password || "";
    const fullName = (row.fullName || row.name || "").trim();
    const groupName = (row.groupName || "").trim();
    const portfolioUrl = (row.portfolioUrl || "").trim();
    const driveUrl = (row.driveUrl || "").trim();
    const crm = parseOptionalInt(row.alfacrmId || "");
    const isActive = parseActiveFlag(row.isActive ?? "1");
    const problems = [
      validateLogin(login),
      validateName(fullName),
      !crm.ok ? crm.error : null,
      validateUrl(portfolioUrl),
      validateUrl(driveUrl),
    ].filter(Boolean);
    if (problems.length > 0) {
      errors.push(`Строка ${line}: ${problems[0]}`);
      continue;
    }
    try {
      const existing = await prisma.user.findUnique({ where: { login }, include: { student: true } });
      if (!existing) {
        const passwordError = validatePassword(password, true);
        if (passwordError) {
          errors.push(`Строка ${line}: ${passwordError}`);
          continue;
        }
        const clash = await ensureCrmFree(crm.ok ? crm.value : null);
        if (clash) {
          errors.push(`Строка ${line}: ${clash}`);
          continue;
        }
        await prisma.student.create({
          data: {
            fullName,
            groupName,
            campus: campusFromGroup(groupName),
            portfolioUrl,
            driveUrl,
            driveFolderName: fullName,
            alfacrmId: crm.ok ? crm.value : null,
            user: { create: { login, passwordHash: await hashPassword(password), role: "STUDENT", isActive } },
          },
        });
        created += 1;
      } else if (existing.role !== "STUDENT" || !existing.student) {
        errors.push(`Строка ${line}: логин ${login} занят не учеником.`);
      } else {
        const passwordError = validatePassword(password, false);
        if (passwordError) {
          errors.push(`Строка ${line}: ${passwordError}`);
          continue;
        }
        const clash = await ensureCrmFree(crm.ok ? crm.value : null, existing.student.id);
        if (clash) {
          errors.push(`Строка ${line}: ${clash}`);
          continue;
        }
        await prisma.user.update({
          where: { id: existing.id },
          data: { isActive, ...(password ? { passwordHash: await hashPassword(password) } : {}) },
        });
        await prisma.student.update({
          where: { id: existing.student.id },
          data: {
            fullName,
            groupName,
            campus: campusFromGroup(groupName),
            portfolioUrl,
            driveUrl,
            driveFolderName: existing.student.driveFolderName || fullName,
            alfacrmId: crm.ok ? crm.value : null,
          },
        });
        if (password || !isActive) await clearUserSessions(existing.id);
        updated += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "ошибка записи";
      errors.push(`Строка ${line}: ${message}`);
    }
  }
  revalidatePath("/admin/students");
  const summary = `Создано: ${created}. Обновлено: ${updated}. Ошибок: ${errors.length}.`;
  return { message: errors.length ? `${summary} ${errors.slice(0, 5).join(" ")}` : summary };
}


export type CrmSearchState = {
  message: string;
  query: string;
  results: { id: number; name: string; groupName: string }[];
};

export async function searchCrmCustomers(_prev: CrmSearchState, formData: FormData): Promise<CrmSearchState> {
  await requireAdmin();
  const query = text(formData, "query");
  if (!query) return { message: "Введите ID клиента или часть имени.", query, results: [] };
  try {
    const results = await createAlfaApi().searchCustomers(query);
    if (results.length === 0) {
      return { message: "Никого не нашли среди действующих учеников AlfaCRM.", query, results: [] };
    }
    return { message: `Найдено: ${results.length}. Добавляйте по одному.`, query, results };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось выполнить поиск в AlfaCRM.";
    return { message, query, results: [] };
  }
}

export async function importCrmStudent(_prev: AccountState, formData: FormData): Promise<AccountState> {
  await requireAdmin();
  const crm = parseOptionalInt(text(formData, "alfacrmId"));
  if (!crm.ok || crm.value == null) {
    return { message: crm.ok ? "Укажите ID клиента в AlfaCRM." : crm.error || "Проверьте ID." };
  }
  try {
    const result = await importOneCrmStudent(crm.value);
    revalidatePath("/admin/students");
    if (!result.ok) return { message: result.message };
    const loginLine = result.login ? ` Логин: ${result.login}.` : "";
    return {
      message: `${result.message}${loginLine}`,
      password: result.password,
      studentId: result.studentId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось добавить ученика.";
    return { message };
  }
}
