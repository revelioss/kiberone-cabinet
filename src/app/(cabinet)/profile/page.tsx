import Link from "next/link";
import { logout } from "@/lib/actions/auth";
import { PageTitle } from "@/components/page-title";
import { SubmitButton } from "@/components/submit-button";
import { requireStudent } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Профиль" };

export default async function ProfilePage() {
  const { user, student } = await requireStudent();
  const links = [
    { href: "/certificates", title: "Грамоты и достижения" },
    { href: "/rating", title: "Рейтинг группы" },
    { href: "/kiberons", title: "История киберонов" },
  ];
  return (
    <div className="grid gap-4">
      <PageTitle
        title={student.fullName}
        subtitle={[student.groupName, student.campus && `филиал ${student.campus}`].filter(Boolean).join(" · ") || "Группа появится после синхронизации"}
      />
      <section className="rounded-[24px] bg-white p-4 ring-1 ring-sky-100">
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Логин</dt>
            <dd className="font-medium">{user.login}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Статус в CRM</dt>
            <dd className="font-medium">{student.studyStatus || "Не пришёл из AlfaCRM"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Последняя синхронизация</dt>
            <dd className="font-medium">{formatDateTime(student.lastSyncedAt)}</dd>
          </div>
        </dl>
        {student.syncWarning ? <p className="mt-3 text-sm text-amber-800">{student.syncWarning}</p> : null}
      </section>
      <section className="grid gap-2">
        {student.portfolioUrl ? (
          <a className="rounded-2xl bg-white px-4 py-4 font-medium text-[#17315c] ring-1 ring-sky-100" href={student.portfolioUrl} target="_blank" rel="noreferrer">
            Портфолио
          </a>
        ) : (
          <p className="rounded-2xl bg-white px-4 py-4 text-sm text-muted-foreground ring-1 ring-sky-100">Ссылку на портфолио преподаватель ещё не добавил.</p>
        )}
        {student.driveUrl ? (
          <a className="rounded-2xl bg-white px-4 py-4 ring-1 ring-sky-100" href={student.driveUrl} target="_blank" rel="noreferrer">
            <span className="block font-medium text-[#17315c]">Моя папка на Google Диске</span>
            <span className="text-sm text-muted-foreground">{student.driveFolderName || student.fullName}</span>
          </a>
        ) : (
          <p className="rounded-2xl bg-white px-4 py-4 text-sm text-muted-foreground ring-1 ring-sky-100">
            Папка на Google Диске появится, когда преподаватель вставит ссылку. Папка подписывается вашим именем.
          </p>
        )}
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="rounded-2xl bg-white px-4 py-4 font-medium text-[#17315c] ring-1 ring-sky-100">
            {link.title}
          </Link>
        ))}
      </section>
      <form action={logout}>
        <SubmitButton variant="outline">Выйти</SubmitButton>
      </form>
      <p className="text-xs leading-5 text-muted-foreground">Пароль меняет только преподаватель. Если забыли его — напишите в школу.</p>
    </div>
  );
}
