import Link from "next/link";
import { Award, BookOpen, CalendarDays, FolderOpen, Star, WalletCards } from "lucide-react";
import { KiberonCoin } from "@/components/brand";
import { requireStudent } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { firstName, formatAmount, formatDate, kiberonWord } from "@/lib/format";

export default async function HomePage() {
  const { student } = await requireStudent();
  const [bonuses, lessons, homeworkLeft, certificates] = await Promise.all([
    prisma.bonusTransaction.findMany({ where: { studentId: student.id }, orderBy: { occurredAt: "desc" }, take: 4 }),
    prisma.lessonRecord.findMany({ where: { studentId: student.id }, orderBy: { occurredOn: "desc" } }),
    prisma.homeworkItem.count({ where: { studentId: student.id, status: "new" } }),
    prisma.certificate.count({ where: { studentId: student.id } }),
  ]);
  const now = Date.now();
  const upcoming = lessons
    .filter((lesson) => lesson.status === "planned" && lesson.occurredOn.getTime() >= now - 36e5)
    .sort((a, b) => a.occurredOn.getTime() - b.occurredOn.getTime())[0];
  const held = lessons.filter((lesson) => lesson.status === "held").length;
  const missed = lessons.filter((lesson) => lesson.status === "missed").length;
  const tiles = [
    { href: "/kiberons", title: "Кибероны", text: "Начисления и траты", icon: WalletCards },
    { href: "/lessons", title: "Уроки", text: `${held} были · ${missed} не были`, icon: CalendarDays },
    { href: "/homework", title: "Задания", text: homeworkLeft ? `${homeworkLeft} ещё сделать` : "Всё сдано", icon: BookOpen },
    { href: "/certificates", title: "Грамоты", text: certificates ? `${certificates} в копилке` : "Пока пусто", icon: Award },
    { href: "/rating", title: "Рейтинг", text: student.ratingEnabled ? "Место в группе" : "Пока выключен", icon: Star },
    { href: student.driveUrl || "/profile", title: "Google Диск", text: student.driveFolderName || student.fullName, icon: FolderOpen },
  ];

  return (
    <div className="grid gap-5">
      <section className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(145deg,#17315c_0%,#1d4f91_58%,#2aa0c4_130%)] p-5 text-white shadow-lg shadow-sky-900/15">
        <p className="text-sm text-white/75">Привет, {firstName(student.fullName)}</p>
        <p className="mt-4 text-sm text-white/80">На счёте</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-6xl leading-none">{formatAmount(student.kiberonBalance)}</p>
            <p className="mt-2 text-lg">{kiberonWord(student.kiberonBalance)}</p>
          </div>
          <KiberonCoin className="size-20 shrink-0" />
        </div>
        <p className="mt-4 text-xs text-white/70">
          {student.kiberonManualOverride
            ? "Баланс задан школой вручную."
            : "Баланс приходит из бонусов AlfaCRM."}
          {student.groupName ? ` Группа ${student.groupName}.` : ""}
          {student.campus ? ` Филиал ${student.campus}.` : ""}
        </p>
        {student.portfolioUrl ? (
          <a href={student.portfolioUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-medium text-white underline-offset-4 hover:underline">
            Открыть портфолио
          </a>
        ) : null}
      </section>

      {upcoming ? (
        <section className="rounded-[24px] bg-white p-4 ring-1 ring-sky-100">
          <p className="text-xs font-semibold tracking-wide text-sky-700 uppercase">Ближайший урок</p>
          <p className="mt-1 text-lg font-bold text-[#17315c]">{upcoming.topic}</p>
          <p className="text-sm text-muted-foreground">
            {formatDate(upcoming.occurredOn)}
            {upcoming.timeFrom ? ` · ${upcoming.timeFrom}` : ""}
            {upcoming.subject ? ` · ${upcoming.subject}` : ""}
          </p>
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          const external = tile.href.startsWith("http");
          const className = "rounded-[22px] bg-white p-4 ring-1 ring-sky-100";
          const body = (
            <>
              <Icon className="size-5 text-[#1d4f91]" />
              <p className="mt-3 font-semibold text-[#17315c]">{tile.title}</p>
              <p className="text-xs leading-5 text-muted-foreground">{tile.text}</p>
            </>
          );
          return external ? (
            <a key={tile.title} href={tile.href} target="_blank" rel="noreferrer" className={className}>
              {body}
            </a>
          ) : (
            <Link key={tile.title} href={tile.href} className={className}>
              {body}
            </Link>
          );
        })}
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold text-[#17315c]">Последние кибероны</h2>
          <Link href="/kiberons" className="text-sm font-medium text-[#1d4f91]">
            Все
          </Link>
        </div>
        {bonuses.length === 0 ? (
          <p className="rounded-[22px] bg-white px-4 py-6 text-sm text-muted-foreground ring-1 ring-sky-100">
            Начислений пока нет. Они появятся после синхронизации с AlfaCRM.
          </p>
        ) : (
          <ul className="grid gap-2">
            {bonuses.map((bonus) => (
              <li key={bonus.id} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-sky-100">
                <span>
                  <span className="block text-sm font-medium">{bonus.note || "Операция"}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(bonus.occurredAt)}</span>
                </span>
                <span className={bonus.amount < 0 ? "font-bold text-rose-600" : "font-bold text-emerald-700"}>
                  {bonus.amount > 0 ? "+" : ""}
                  {formatAmount(bonus.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
