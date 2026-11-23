import { PageTitle } from "@/components/page-title";
import { SyncForm } from "@/components/sync-form";
import { alfaMode } from "@/lib/alfacrm/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Синхронизация" };

export default async function SyncPage() {
  await requireAdmin();
  const runs = await prisma.syncRun.findMany({ orderBy: { startedAt: "desc" }, take: 12 });
  const mode = alfaMode();
  const checks = [
    ["ALFACRM_HOST", Boolean(process.env.ALFACRM_HOST)],
    ["ALFACRM_EMAIL", Boolean(process.env.ALFACRM_EMAIL)],
    ["ALFACRM_API_KEY", Boolean(process.env.ALFACRM_API_KEY)],
    ["ALFACRM_BRANCH_ID", Boolean(process.env.ALFACRM_BRANCH_ID)],
  ] as const;
  return (
    <div className="grid gap-4">
      <PageTitle
        title="Синхронизация с AlfaCRM"
        subtitle="Подтягиваются имя, группа, бонусный баланс, история бонусов, уроки с темами и посещаемостью, домашние задания с уроков и результаты тестов."
      />
      <section className="rounded-[24px] bg-white p-4 ring-1 ring-sky-100">
        <p className="mb-3 text-sm">
          Сейчас режим: <strong>{mode === "mock" ? "демо, без запросов в CRM" : "живая AlfaCRM"}</strong>
        </p>
        <ul className="mb-4 grid gap-1 text-sm">
          {checks.map(([name, ok]) => (
            <li key={name}>
              {name}: {ok ? "задано" : "пусто"}
            </li>
          ))}
        </ul>
        <SyncForm />
      </section>
      <section className="grid gap-2">
        {runs.length === 0 ? <p className="text-sm text-muted-foreground">Запусков ещё не было.</p> : null}
        {runs.map((run) => (
          <article key={run.id} className="rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-sky-100">
            <p className="font-medium">
              {formatDateTime(run.startedAt)} · {run.status} · {run.trigger}
            </p>
            <p className="text-muted-foreground">{run.message}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
