import { PageTitle } from "@/components/page-title";
import { Badge } from "@/components/ui/badge";
import { requireStudent } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, lessonStatusLabel } from "@/lib/format";

export const metadata = { title: "Уроки" };

const tone: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  held: "default",
  missed: "destructive",
  planned: "secondary",
  cancelled: "outline",
  unknown: "outline",
};

export default async function LessonsPage() {
  const { student } = await requireStudent();
  const lessons = await prisma.lessonRecord.findMany({
    where: { studentId: student.id },
    orderBy: { occurredOn: "desc" },
  });
  const upcoming = lessons.filter((lesson) => lesson.status === "planned").sort((a, b) => a.occurredOn.getTime() - b.occurredOn.getTime());
  const past = lessons.filter((lesson) => lesson.status !== "planned");
  return (
    <div>
      <PageTitle title="Уроки" subtitle="Даты и темы приходят из AlfaCRM. Отметка «были» или «не были» берётся из карточки урока." />
      <Section title="Скоро" lessons={upcoming} empty="Ближайших уроков в расписании нет." />
      <Section title="Уже прошли" lessons={past} empty="Проведённых уроков пока нет." />
    </div>
  );
}

function Section({
  title,
  lessons,
  empty,
}: {
  title: string;
  lessons: Array<{
    id: string;
    topic: string;
    occurredOn: Date;
    timeFrom: string;
    subject: string;
    status: string;
    homeworkText: string;
  }>;
  empty: string;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 font-bold text-[#17315c]">{title}</h2>
      {lessons.length === 0 ? (
        <p className="rounded-[22px] bg-white px-4 py-6 text-sm text-muted-foreground ring-1 ring-sky-100">{empty}</p>
      ) : (
        <ul className="grid gap-2">
          {lessons.map((lesson) => (
            <li key={lesson.id} className="rounded-[22px] bg-white px-4 py-3 ring-1 ring-sky-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#17315c]">{lesson.topic}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(lesson.occurredOn)}
                    {lesson.timeFrom ? ` · ${lesson.timeFrom}` : ""}
                    {lesson.subject ? ` · ${lesson.subject}` : ""}
                  </p>
                </div>
                <Badge variant={tone[lesson.status] ?? "outline"}>{lessonStatusLabel(lesson.status)}</Badge>
              </div>
              {lesson.homeworkText ? <p className="mt-2 text-sm leading-6">Задание: {lesson.homeworkText}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
