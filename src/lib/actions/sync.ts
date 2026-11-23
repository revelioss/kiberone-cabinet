"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../auth";
import { runSync } from "../alfacrm/sync";

export async function syncNow(_prev: { message: string }, formData: FormData) {
  await requireAdmin();
  const studentId = String(formData.get("studentId") || "").trim();
  const result = await runSync({ trigger: "manual", studentId: studentId || undefined });
  revalidatePath("/admin");
  revalidatePath("/admin/sync");
  revalidatePath("/admin/students");
  revalidatePath("/");
  if (studentId) revalidatePath(`/admin/students/${studentId}`);
  const tail = result.stats.warnings.slice(0, 3).join(" ");
  return { message: tail ? `${result.message} ${tail}` : result.message };
}
