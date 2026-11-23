import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { Brand } from "@/components/brand";
import { getSessionUser } from "@/lib/auth";
import { alfaMode } from "@/lib/alfacrm/client";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getSessionUser();
  if (user?.role === "ADMIN") redirect("/admin");
  if (user?.role === "STUDENT") redirect("/");
  const params = await searchParams;
  const showDemo = process.env.SHOW_DEMO_LOGINS === "1" || alfaMode() === "mock";
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <Brand />
      <h1 className="mt-8 text-3xl font-extrabold tracking-tight text-[#17315c]">Личный кабинет ученика</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Логин и пароль выдаёт школа. Самостоятельно зарегистрироваться нельзя — так чужой человек не попадёт в кабинет.
      </p>
      <div className="mt-6 rounded-[28px] bg-white p-5 shadow-xl shadow-sky-900/5 ring-1 ring-sky-100">
        <LoginForm nextPath={params.next ?? ""} />
      </div>
      {showDemo ? (
        <aside className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Учебный вход, не настоящие ученики</p>
          <p className="mt-1">admin / Kabinet-Admin-2026</p>
          <p>alisa / Alisa-Demo-2026</p>
          <p>timur / Timur-Demo-2026</p>
          <p>mira / Mira-Demo-2026</p>
        </aside>
      ) : null}
    </main>
  );
}
