import { campusFromGroup } from "./format";
import { prisma } from "./db";
import { hashPassword, generatePassword } from "./password";
import { customerName, toNumber } from "./alfacrm/parse";
import { createAlfaApi, runSync, type SyncResult } from "./alfacrm/sync";
import { validateLogin, validateUrl } from "./validate";
import { loginCandidate, suggestedLogin } from "./student-login";

export type CrmImportResult = {
  ok: boolean;
  message: string;
  already?: boolean;
  studentId?: string;
  login?: string;
  password?: string;
  sync?: SyncResult;
};

async function uniqueLogin(fullName: string, alfacrmId: number) {
  const base = suggestedLogin(fullName, alfacrmId);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const login = loginCandidate(base, alfacrmId, attempt);
    if (validateLogin(login)) continue;
    const existing = await prisma.user.findUnique({ where: { login } });
    if (!existing) return login;
  }
  throw new Error("Не удалось подобрать свободный логин.");
}

function portfolioFromCustomer(customer: Record<string, unknown>) {
  const raw = customer.custom_portfolio_url == null ? "" : String(customer.custom_portfolio_url).trim();
  return validateUrl(raw) == null ? raw : "";
}

export async function importOneCrmStudent(alfacrmId: number): Promise<CrmImportResult> {
  if (!Number.isSafeInteger(alfacrmId) || alfacrmId <= 0) {
    return { ok: false, message: "Укажите ID клиента в AlfaCRM." };
  }

  const api = createAlfaApi();
  const customer = await api.fetchCustomer(alfacrmId);
  const customerId = customer ? toNumber(customer.id) : null;
  if (!customer || customerId !== alfacrmId) {
    return { ok: false, message: "Среди действующих учеников AlfaCRM такого ID нет. В CRM ничего не записывалось." };
  }

  const existing = await prisma.student.findUnique({ where: { alfacrmId } });
  if (existing) {
    const sync = await runSync({ trigger: "manual", studentId: existing.id });
    return {
      ok: true,
      already: true,
      message: "Этот ученик уже есть в кабинете. Данные обновлены из CRM, новый пароль не создавался.",
      studentId: existing.id,
      login: undefined,
      sync,
    };
  }

  const fullName = customerName(customer) || `Ученик ${alfacrmId}`;
  const login = await uniqueLogin(fullName, alfacrmId);
  const password = generatePassword();
  const portfolioUrl = portfolioFromCustomer(customer);

  const student = await prisma.student.create({
    data: {
      fullName,
      groupName: "",
      campus: campusFromGroup(""),
      portfolioUrl,
      driveUrl: "",
      driveFolderName: fullName,
      alfacrmId,
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

  const sync = await runSync({ trigger: "manual", studentId: student.id });

  return {
    ok: true,
    message: "Ученик добавлен из AlfaCRM. Передайте логин и пароль. Пароль больше нигде не покажется.",
    studentId: student.id,
    login,
    password,
    sync,
  };
}
