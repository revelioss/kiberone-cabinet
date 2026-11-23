import { PageTitle } from "@/components/page-title";
import { requireStudent } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Тесты" };

export default async function TestsPage() {
  const { student } = await requireStudent();
  const tests = await prisma.testResult.findMany({
    where: { studentId: student.id },
    orderBy: { takenAt: "desc" },
  });
  return (
    <div>
      <PageTitle title="Тесты" subtitle="Если AlfaCRM отдаёт результаты, они появляются сами. Остальные вносит преподаватель." />
      {tests.length === 0 ? (
        <p className="rounded-[22px] bg-white px-4 py-8 text-sm text-muted-foreground ring-1 ring-sky-100">Результатов пока нет.</p>
      ) : (
        <ul className="grid gap-3">
          {tests.map((test) => {
            const percent = test.score != null && test.maxScore ? Math.round((test.score / test.maxScore) * 100) : null;
            return (
              <li key={test.id} className="rounded-[22px] bg-white p-4 ring-1 ring-sky-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-[#17315c]">{test.title}</h2>
                    <p className="text-xs text-muted-foreground">{formatDate(test.takenAt)}</p>
                  </div>
                  <p className="text-right font-extrabold text-[#1d4f91]">
                    {test.score == null ? "—" : test.maxScore ? `${test.score} из ${test.maxScore}` : test.score}
                  </p>
                </div>
                {percent != null ? (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-sky-100">
                    <div className="h-full rounded-full bg-[#1d4f91]" style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
                  </div>
                ) : null}
                {test.comment ? <p className="mt-3 text-sm leading-6">{test.comment}</p> : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
