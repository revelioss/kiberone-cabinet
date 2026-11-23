import { CrmImportForm } from "@/components/crm-import-form";
import { PageTitle } from "@/components/page-title";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Добавить из AlfaCRM" };

export default async function FromCrmPage() {
  await requireAdmin();
  return (
    <div className="grid gap-4">
      <PageTitle
        title="Добавить из AlfaCRM"
        subtitle="Импорт только по одному ученику. Синхронизация потом обновляет тех, кто уже есть в кабинете, и никого не добавляет сама."
      />
      <div className="rounded-[24px] bg-white p-4 ring-1 ring-sky-100 md:p-6">
        <CrmImportForm />
      </div>
    </div>
  );
}
