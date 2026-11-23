import { PageTitle } from "@/components/page-title";
import { requireStudent } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { firstName } from "@/lib/format";

export const metadata = { title: "Рейтинг" };

export default async function RatingPage() {
  const { student } = await requireStudent();
  if (!student.ratingEnabled || !student.groupName) {
    return (
      <div>
        <PageTitle title="Рейтинг группы" subtitle="Необязательный экран. Преподаватель включает его, когда группе это нужно." />
        <p className="rounded-[22px] bg-white px-4 py-8 text-sm text-muted-foreground ring-1 ring-sky-100">
          Для вашей группы рейтинг пока не включён.
        </p>
      </div>
    );
  }
  const peers = await prisma.student.findMany({
    where: {
      groupName: student.groupName,
      ratingEnabled: true,
      ratingScore: { not: null },
      user: { isActive: true },
    },
    orderBy: [{ ratingScore: "desc" }, { fullName: "asc" }],
  });
  const place = peers.findIndex((peer) => peer.id === student.id) + 1;
  return (
    <div>
      <PageTitle title={`Рейтинг · ${student.groupName}`} subtitle="Видны только имя и балл одногруппников. Чужие кабинеты открыть нельзя." />
      {place > 0 ? <p className="mb-4 text-lg font-bold text-[#17315c]">Ваше место: {place}</p> : null}
      <ol className="grid gap-2">
        {peers.map((peer, index) => (
          <li
            key={peer.id}
            className={`flex items-center justify-between rounded-2xl px-4 py-3 ring-1 ${peer.id === student.id ? "bg-sky-50 ring-sky-200" : "bg-white ring-sky-100"}`}
          >
            <span className="font-medium">
              {index + 1}. {firstName(peer.fullName)}
              {peer.id === student.id ? " · это вы" : ""}
            </span>
            <span className="font-bold text-[#1d4f91]">{peer.ratingScore}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
