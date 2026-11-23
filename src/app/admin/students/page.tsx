import Link from "next/link";
import { Notice } from "@/components/notice";
import { PageTitle } from "@/components/page-title";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatAmount, formatDateTime } from "@/lib/format";
import { cn } from "cn";

export const metadata = { title: "Ученики" };

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ok?: string; error?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const query = (params.q || "").trim();
  const students = await prisma.student.findMany({
    where: query
      ? {
          OR: [
            { fullName: { contains: query } },
            { groupName: { contains: query } },
            { user: { login: { contains: query } } },
          ],
        }
      : undefined,
    include: { user: true },
    orderBy: { fullName: "asc" },
    take: 200,
  });
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle title="Ученики" subtitle="Поиск по имени, логину или группе." />
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/students/from-crm" className={cn(buttonVariants({ size: "lg" }))}>
            Из AlfaCRM
          </Link>
          <Link href="/admin/students/new" className={cn(buttonVariants({ size: "lg", variant: "secondary" }))}>
            Вручную
          </Link>
        </div>
      </div>
      <Notice ok={params.ok} error={params.error} />
      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Найти ученика"
          className="h-11 flex-1 rounded-xl border bg-white px-3"
        />
        <button className={cn(buttonVariants({ size: "lg", variant: "secondary" }))} type="submit">
          Найти
        </button>
      </form>
      {students.length === 0 ? (
        <p className="rounded-[22px] bg-white px-4 py-8 text-sm text-muted-foreground ring-1 ring-sky-100">Никого не нашли.</p>
      ) : (
        <ul className="grid gap-2">
          {students.map((student) => (
            <li key={student.id}>
              <Link href={`/admin/students/${student.id}`} className="block rounded-[22px] bg-white px-4 py-3 ring-1 ring-sky-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#17315c]">{student.fullName}</p>
                    <p className="text-sm text-muted-foreground">
                      {student.user.login} · {student.groupName || "без группы"}
                      {student.campus ? ` · ${student.campus}` : ""} · CRM {student.alfacrmId ?? "—"}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-bold">{formatAmount(student.kiberonBalance)}</p>
                    <p className={student.user.isActive ? "text-emerald-700" : "text-rose-600"}>
                      {student.user.isActive ? "активен" : "выключен"}
                    </p>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Синхронизация: {formatDateTime(student.lastSyncedAt)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
