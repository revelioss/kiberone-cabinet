"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-extrabold text-[#17315c]">Что-то пошло не так</h1>
      <p className="mt-2 text-sm text-muted-foreground">Обновите страницу. Если ошибка повторяется, позовите преподавателя.</p>
      <button type="button" onClick={reset} className="mt-4 h-11 rounded-xl bg-[#17315c] px-4 text-white">
        Попробовать снова
      </button>
    </main>
  );
}
