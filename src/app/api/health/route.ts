import { NextResponse } from "next/server";
import { alfaMode } from "@/lib/alfacrm/client";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ok: true, mode: alfaMode() });
}
