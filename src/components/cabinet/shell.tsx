"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, FlaskConical, House, UserRound } from "lucide-react";
import { Brand } from "@/components/brand";
import { cn } from "cn";

const items = [
  { href: "/", label: "Главная", icon: House },
  { href: "/lessons", label: "Уроки", icon: CalendarDays },
  { href: "/homework", label: "Задания", icon: BookOpen },
  { href: "/tests", label: "Тесты", icon: FlaskConical },
  { href: "/profile", label: "Профиль", icon: UserRound },
];

function active(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function CabinetShell({
  name,
  groupName,
  children,
}: {
  name: string;
  groupName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-sky-100 bg-white/80 px-4 py-6 md:flex">
        <Brand />
        <p className="mt-6 text-sm font-semibold text-[#17315c]">{name}</p>
        <p className="text-xs text-muted-foreground">{groupName || "Группа не указана"}</p>
        <nav className="mt-6 grid gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const on = active(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-medium",
                  on ? "bg-[#17315c] text-white" : "text-[#17315c] hover:bg-sky-50",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-sky-100 bg-white/85 px-4 py-3 backdrop-blur md:hidden">
          <Brand compact />
          <div className="text-right">
            <p className="text-sm font-semibold text-[#17315c]">{name}</p>
            <p className="text-xs text-muted-foreground">{groupName}</p>
          </div>
        </header>
        <main className="px-4 py-5 pb-28 md:px-8 md:py-8 md:pb-10">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-sky-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="grid grid-cols-5">
          {items.map((item) => {
            const Icon = item.icon;
            const on = active(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                    on ? "text-[#1d4f91]" : "text-slate-500",
                  )}
                >
                  <Icon className="size-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
