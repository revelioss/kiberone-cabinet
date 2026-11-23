import { CreateStudentForm } from "@/components/account-forms";
import { PageTitle } from "@/components/page-title";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Новый ученик" };

export default async function NewStudentPage() {
  await requireAdmin();
  return (
    <div className="grid gap-4">
      <PageTitle title="Новый ученик" subtitle="После создания покажем пароль один раз. Запишите его и отдайте ученику." />
      <div className="rounded-[24px] bg-white p-4 ring-1 ring-sky-100 md:p-6">
        <CreateStudentForm />
      </div>
    </div>
  );
}
