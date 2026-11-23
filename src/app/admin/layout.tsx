import Link from "next/link";
import { logout } from "@/lib/actions/auth";
import { Brand } from "@/components/brand";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const links = [
  { href: "/admin", label: "Сводка" },
  { href: "/admin/students", label: "Ученики" },
  { href: "/admin/students/new", label: "Новый ученик" },
  { href: "/admin/import", label: "Импорт CSV" },
  { href: "/admin/sync", label: "Синхронизация" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="mx-auto min-h-dvh w-full max-w-6xl px-4 py-5 md:px-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Brand />
          <p className="mt-3 text-sm text-muted-foreground">Панель преподавателя · {admin.login}</p>
        </div>
        <form action={logout}>
          <button type="submit" className="h-11 rounded-xl px-3 text-sm font-medium text-[#17315c] underline-offset-4 hover:underline">
            Выйти
          </button>
        </form>
      </header>
      <nav className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#17315c] ring-1 ring-sky-100">
            {link.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
