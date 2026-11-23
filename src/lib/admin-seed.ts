export type AdminSeedPlan = "create-or-update" | "skip-existing" | "fail-missing";

/** Empty or unset ADMIN_PASSWORD must never change an existing admin. */
export function adminSeedPlan(adminPassword: string | undefined | null, adminExists: boolean): AdminSeedPlan {
  const password = (adminPassword ?? "").trim();
  if (password) return "create-or-update";
  return adminExists ? "skip-existing" : "fail-missing";
}

export function adminSeedSkipMessage(adminLogin: string) {
  return `ADMIN_PASSWORD не задан, существующий вход преподавателя «${adminLogin}» не менялся.`;
}

export function adminSeedMissingPasswordError() {
  return "Задайте ADMIN_PASSWORD: без него нельзя создать вход преподавателя.";
}
