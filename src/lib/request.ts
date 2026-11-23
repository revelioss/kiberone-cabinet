import { headers } from "next/headers";

export async function clientIp() {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headerStore.get("x-real-ip") || "local";
}

export function safeNextPath(value: FormDataEntryValue | null, role: "ADMIN" | "STUDENT") {
  if (role === "ADMIN") return "/admin";
  const next = typeof value === "string" ? value : "";
  if (next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/admin") && !next.startsWith("/api")) {
    return next;
  }
  return "/";
}
