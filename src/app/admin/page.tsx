import Link from "next/link";
import { PageTitle } from "@/components/page-title";
import { alfaMode } from "@/lib/alfacrm/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Панель преподавателя" };

export default async function AdminHome() {
  await requireAdmin();
  const [students, active, last] = await Promise.all([
    prisma.student.count(),
    prisma.user.count({ where: { role: "STUDENT", isActive: true } }),
    prisma.syncRun.findFirst({ orderBy: { startedAt: "desc" } }),
  ]);
  const mode = alfaMode();
  return (
    <div className="grid gap-4">
      <PageTitle title="Сводка" subtitle="Каждый ученик входит только в свой кабинет. Создавать аккаунты может преподаватель." />
      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-[22px] bg-white p-4 ring-1 ring-sky-100">
          <p className="text-sm text-muted-foreground">Учеников</p>
          <p className="text-3xl font-extrabold text-[#17315c]">{students}</p>
        </article>
        <article className="rounded-[22px] bg-white p-4 ring-1 ring-sky-100">
          <p className="text-sm text-muted-foreground">Могут войти</p>
          <p className="text-3xl font-extrabold text-[#17315c]">{active}</p>
        </article>
        <article className="rounded-[22px] bg-white p-4 ring-1 ring-sky-100">
          <p className="text-sm text-muted-foreground">Режим CRM</p>
          <p className="text-xl font-extrabold text-[#17315c]">{mode === "mock" ? "Демо" : "AlfaCRM"}</p>
        </article>
      </div>
      <section className="rounded-[22px] bg-white p-4 ring-1 ring-sky-100">
        <h2 className="font-bold text-[#17315c]">Последняя синхронизация</h2>
        {last ? (
          <p className="mt-2 text-sm leading-6">
            {formatDateTime(last.startedAt)} · {last.mode === "mock" ? "демо" : "живая CRM"} · {last.message}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Ещё не запускалась.</p>
        )}
        <Link href="/admin/sync" className="mt-3 inline-block text-sm font-medium text-[#1d4f91]">
          Открыть синхронизацию
        </Link>
      </section>
      {mode === "mock" ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Ключ AlfaCRM не задан, поэтому кибероны и уроки берутся из учебных карточек с ID 9001, 9002 и 9003.
          Настоящие данные появятся, когда в переменных окружения будут почта, ключ API и номер филиала.
        </p>
      ) : null}
    </div>
  );
}
