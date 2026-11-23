import { PageTitle } from "@/components/page-title";
import { requireStudent } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { bonusKindLabel, formatAmount, formatDate, kiberonWord } from "@/lib/format";

export const metadata = { title: "Кибероны" };

export default async function KiberonsPage() {
  const { student } = await requireStudent();
  const rows = await prisma.bonusTransaction.findMany({
    where: { studentId: student.id },
    orderBy: { occurredAt: "desc" },
  });
  const plus = rows.filter((row) => row.amount > 0).reduce((sum, row) => sum + row.amount, 0);
  const minus = rows.filter((row) => row.amount < 0).reduce((sum, row) => sum + row.amount, 0);
  return (
    <div>
      <PageTitle
        title="Кибероны"
        subtitle={student.kiberonManualOverride ? "Цифра баланса задана школой и не перезаписывается из CRM." : "Баланс читается из бонусного счёта AlfaCRM."}
      />
      <p className="mb-4 text-3xl font-extrabold text-[#17315c]">
        {formatAmount(student.kiberonBalance)} {kiberonWord(student.kiberonBalance)}
      </p>
      <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-800">Начислено {formatAmount(plus)}</p>
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-rose-700">Потрачено {formatAmount(Math.abs(minus))}</p>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-[22px] bg-white px-4 py-8 text-sm text-muted-foreground ring-1 ring-sky-100">
          История пустая. Если в CRM есть бонусы, преподаватель может нажать «Синхронизировать».
        </p>
      ) : (
        <ul className="grid gap-2">
          {rows.map((row) => (
            <li key={row.id} className="rounded-2xl bg-white px-4 py-3 ring-1 ring-sky-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{row.note || bonusKindLabel(row.kind)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(row.occurredAt)} · {bonusKindLabel(row.kind)}
                    {row.source === "MANUAL" ? " · добавлено школой" : ""}
                  </p>
                </div>
                <p className={row.amount < 0 ? "font-bold text-rose-600" : "font-bold text-emerald-700"}>
                  {row.amount > 0 ? "+" : ""}
                  {formatAmount(row.amount)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
