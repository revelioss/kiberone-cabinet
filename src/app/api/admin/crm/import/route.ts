import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { importOneCrmStudent } from "@/lib/crm-import";

export const dynamic = "force-dynamic";

function syncCounts(sync: { ok: boolean; mode: string; message: string; stats: Record<string, unknown> } | undefined) {
  if (!sync) return undefined;
  const stats = sync.stats ?? {};
  return {
    ok: sync.ok,
    mode: sync.mode,
    message: sync.message,
    students: stats.students ?? 0,
    updated: stats.updated ?? 0,
    missing: stats.missing ?? 0,
    bonuses: stats.bonuses ?? 0,
    lessons: stats.lessons ?? 0,
    tests: stats.tests ?? 0,
    warningCount: Array.isArray(stats.warnings) ? stats.warnings.length : 0,
  };
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const raw = body && typeof body === "object" ? (body as { alfacrmId?: unknown }).alfacrmId : undefined;
  const alfacrmId = typeof raw === "number" ? raw : typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isSafeInteger(alfacrmId) || alfacrmId <= 0) {
    return NextResponse.json({ ok: false, message: "Укажите ID клиента в AlfaCRM." }, { status: 400 });
  }
  try {
    const result = await importOneCrmStudent(alfacrmId);
    return NextResponse.json({
      ok: result.ok,
      already: result.already ?? false,
      message: result.message,
      studentId: result.studentId,
      login: result.login,
      password: result.password,
      sync: syncCounts(result.sync),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось добавить ученика.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
