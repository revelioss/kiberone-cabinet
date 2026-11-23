const CYRILLIC: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

export function transliterate(value: string) {
  return [...value.toLowerCase()].map((char) => (char in CYRILLIC ? CYRILLIC[char] : char)).join("");
}

export function suggestedLogin(fullName: string, alfacrmId: number) {
  const parts = transliterate(fullName)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  let base = parts.join(".").slice(0, 32);
  if (!/^[a-zA-Z0-9._-]{3,32}$/.test(base)) {
    base = `id${alfacrmId}`.slice(0, 32);
  }
  return base;
}

export function loginCandidate(base: string, alfacrmId: number, attempt: number) {
  if (attempt <= 0) return base.slice(0, 32);
  const suffix = attempt === 1 ? String(alfacrmId) : `${alfacrmId}${attempt}`;
  const trimmed = base.slice(0, Math.max(3, 32 - suffix.length));
  return `${trimmed}${suffix}`.slice(0, 32);
}
