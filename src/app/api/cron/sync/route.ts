import { NextResponse } from "next/server";
import { runSync } from "@/lib/alfacrm/sync";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 401 });
  }
  const result = await runSync({ trigger: "cron" });
  return NextResponse.json(result);
}
