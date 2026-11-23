import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const students = await prisma.student.findMany({
    include: { user: true },
    orderBy: { fullName: "asc" },
  });
  const csv = toCsv(
    ["login", "password", "fullName", "alfacrmId", "groupName", "portfolioUrl", "driveUrl", "isActive", "kiberonBalance"],
    students.map((student) => [
      student.user.login,
      "",
      student.fullName,
      student.alfacrmId ?? "",
      student.groupName,
      student.portfolioUrl,
      student.driveUrl,
      student.user.isActive ? "1" : "0",
      student.kiberonBalance,
    ]),
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=students.csv",
      "Cache-Control": "private, no-store",
    },
  });
}
