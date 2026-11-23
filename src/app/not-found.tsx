import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-extrabold text-[#17315c]">Страница не найдена</h1>
      <Link href="/" className="mt-4 text-[#1d4f91]">
        В кабинет
      </Link>
    </main>
  );
}
