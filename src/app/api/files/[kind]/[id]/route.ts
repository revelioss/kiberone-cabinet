import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readUpload } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ kind: string; id: string }> },
) {
  const { kind, id } = await context.params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Нужно войти" }, { status: 401 });

  const record =
    kind === "certificate"
      ? await prisma.certificate.findUnique({ where: { id } })
      : kind === "achievement"
        ? await prisma.achievement.findUnique({ where: { id } })
        : null;
  if (!record || !record.filePath) return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
  const owns = user.role === "ADMIN" || (user.student && user.student.id === record.studentId);
  if (!owns) return NextResponse.json({ error: "Нет доступа" }, { status: 403 });

  const bytes = await readUpload(record.filePath);
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": record.mimeType || "application/octet-stream",
      "Content-Disposition": `${record.mimeType.startsWith("image/") ? "inline" : "attachment"}; filename="${encodeURIComponent(record.fileName || "file")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
