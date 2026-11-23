import { ChangePasswordForm } from "@/components/change-password-form";
import { PageTitle } from "@/components/page-title";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Сменить пароль" };

export default async function AdminPasswordPage() {
  await requireAdmin();
  return (
    <div className="grid gap-4">
      <PageTitle
        title="Сменить пароль"
        subtitle="Новый пароль останется только у вас: в чат и в настройки хостинга его передавать не нужно."
      />
      <div className="max-w-lg rounded-[24px] bg-white p-4 ring-1 ring-sky-100 md:p-6">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
