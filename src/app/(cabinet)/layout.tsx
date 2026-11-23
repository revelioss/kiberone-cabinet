import { CabinetShell } from "@/components/cabinet/shell";
import { requireStudent } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CabinetLayout({ children }: { children: React.ReactNode }) {
  const { student } = await requireStudent();
  const place = [student.groupName, student.campus].filter(Boolean).join(" · ");
  return (
    <CabinetShell name={student.fullName} groupName={place}>
      {children}
    </CabinetShell>
  );
}
