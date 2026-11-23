import { PageTitle } from "@/components/page-title";
import { requireStudent } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Грамоты" };

export default async function CertificatesPage() {
  const { student } = await requireStudent();
  const [certificates, achievements] = await Promise.all([
    prisma.certificate.findMany({ where: { studentId: student.id }, orderBy: { createdAt: "desc" } }),
    prisma.achievement.findMany({ where: { studentId: student.id }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <div className="grid gap-8">
      <section>
        <PageTitle title="Грамоты и достижения" subtitle="Их добавляет преподаватель: файл, картинка или просто название." />
        {certificates.length === 0 ? (
          <p className="rounded-[22px] bg-white px-4 py-8 text-sm text-muted-foreground ring-1 ring-sky-100">Грамот пока нет. Они появятся после конкурса или проекта.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {certificates.map((item) => (
              <li key={item.id} className="overflow-hidden rounded-[22px] bg-white ring-1 ring-sky-100">
                {item.filePath && item.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/files/certificate/${item.id}`} alt="" className="h-40 w-full object-cover" />
                ) : null}
                <div className="p-4">
                  <h2 className="font-semibold text-[#17315c]">{item.title}</h2>
                  <p className="text-xs text-muted-foreground">{formatDate(item.issuedOn)}</p>
                  {item.note ? <p className="mt-2 text-sm">{item.note}</p> : null}
                  {item.filePath ? (
                    <a className="mt-3 inline-block text-sm font-medium text-[#1d4f91]" href={`/api/files/certificate/${item.id}`}>
                      Открыть файл
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-xl font-extrabold text-[#17315c]">Достижения</h2>
        {achievements.length === 0 ? (
          <p className="rounded-[22px] bg-white px-4 py-6 text-sm text-muted-foreground ring-1 ring-sky-100">Достижений пока нет.</p>
        ) : (
          <ul className="grid gap-3">
            {achievements.map((item) => (
              <li key={item.id} className="flex gap-3 rounded-[22px] bg-white p-4 ring-1 ring-sky-100">
                {item.filePath && item.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/files/achievement/${item.id}`} alt="" className="size-16 rounded-2xl object-cover" />
                ) : (
                  <span className="grid size-16 place-items-center rounded-2xl bg-amber-100 text-2xl">★</span>
                )}
                <div>
                  <h3 className="font-semibold text-[#17315c]">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{formatDate(item.awardedOn)}</p>
                  {item.description ? <p className="mt-1 text-sm">{item.description}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
