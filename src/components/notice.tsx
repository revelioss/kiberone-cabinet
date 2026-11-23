const messages: Record<string, string> = {
  links: "Ссылки сохранены.",
  rating: "Рейтинг сохранён.",
  bonus: "Операция с киберонами сохранена.",
  balance: "Режим баланса сохранён.",
  lesson: "Урок сохранён.",
  homework: "Домашнее задание сохранено.",
  test: "Результат теста сохранён.",
  certificate: "Грамота сохранена.",
  achievement: "Достижение сохранено.",
  deleted: "Ученик удалён.",
};

export function Notice({ ok, error }: { ok?: string; error?: string }) {
  if (error) {
    return <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>;
  }
  if (!ok) return null;
  return <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{messages[ok] ?? "Сохранено."}</p>;
}
