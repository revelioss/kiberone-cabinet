import { ImportForm } from "@/components/account-forms";
import { PageTitle } from "@/components/page-title";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Импорт учеников" };

export default async function ImportPage() {
  await requireAdmin();
  return (
    <div className="grid gap-4">
      <PageTitle
        title="Импорт и экспорт"
        subtitle="Если логин уже есть, строка обновляет ученика. Пустой пароль при обновлении пароль не меняет. Новый ученик без пароля пропускается."
      />
      <div className="flex flex-wrap gap-3 text-sm font-medium">
        <a className="rounded-full bg-white px-4 py-2 ring-1 ring-sky-100" href="/students-template.csv">
          Скачать шаблон
        </a>
        <a className="rounded-full bg-white px-4 py-2 ring-1 ring-sky-100" href="/api/admin/students.csv">
          Экспорт учеников
        </a>
      </div>
      <div className="rounded-[24px] bg-white p-4 ring-1 ring-sky-100 md:p-6">
        <ImportForm />
      </div>
    </div>
  );
}
