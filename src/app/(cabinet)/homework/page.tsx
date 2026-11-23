import { PageTitle } from "@/components/page-title";
import { Badge } from "@/components/ui/badge";
import { requireStudent } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, homeworkStatusLabel } from "@/lib/format";

export const metadata = { title: "Задания" };

export default async function HomeworkPage() {
  const { student } = await requireStudent();
  const items = await prisma.homeworkItem.findMany({
    where: { studentId: student.id },
    orderBy: [{ status: "asc" }, { dueOn: "desc" }],
  });
  const order = { new: 0, submitted: 1, checked: 2 };
  items.sort((a, b) => (order[a.status as keyof typeof order] ?? 9) - (order[b.status as keyof typeof order] ?? 9));
  return (
    <div>
      <PageTitle title="Домашние задания" subtitle="Текст с урока подтягивается из AlfaCRM. Комментарий и отметку ставит преподаватель." />
      {items.length === 0 ? (
        <p className="rounded-[22px] bg-white px-4 py-8 text-sm text-muted-foreground ring-1 ring-sky-100">
          Заданий пока нет.
        </p>
      ) : (
        <ul className="grid gap-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-[22px] bg-white p-4 ring-1 ring-sky-100">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold text-[#17315c]">{item.title}</h2>
                <Badge variant={item.status === "checked" ? "default" : item.status === "submitted" ? "secondary" : "outline"}>
                  {homeworkStatusLabel(item.status)}
                </Badge>
              </div>
              {item.description ? <p className="mt-2 text-sm leading-6">{item.description}</p> : null}
              <p className="mt-2 text-xs text-muted-foreground">
                {item.dueOn ? `К уроку ${formatDate(item.dueOn)}` : "Без даты"}
                {item.grade ? ` · оценка ${item.grade}` : ""}
                {item.source === "MANUAL" ? " · добавлено школой" : ""}
              </p>
              {item.teacherComment ? (
                <p className="mt-3 rounded-2xl bg-sky-50 px-3 py-2 text-sm text-[#17315c]">Преподаватель: {item.teacherComment}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
