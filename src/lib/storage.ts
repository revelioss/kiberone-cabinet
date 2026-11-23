import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from "./constants";
import { prisma } from "./db";

export function safeBaseName(fileName: string) {
  const base = fileName.split(/[/\\]/).pop()?.replace(/[^\w.\-()+\s\u0400-\u04FF]/g, "_") ?? "";
  return base.slice(0, 120) || "file";
}

export async function saveUpload(file: File) {
  if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
    throw new Error("Можно загрузить PDF или картинку PNG, JPG, WEBP, GIF, SVG.");
  }
  if (file.size <= 0) throw new Error("Файл пустой.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Файл больше 8 МБ.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const saved = await prisma.storedFile.create({
    data: {
      fileName: safeBaseName(file.name),
      mimeType: file.type,
      data: bytes,
    },
  });
  return { stored: saved.id, fileName: saved.fileName, mimeType: saved.mimeType };
}

export async function readUpload(id: string) {
  const file = await prisma.storedFile.findUnique({ where: { id } });
  if (!file) throw new Error("Файл не найден.");
  return Buffer.from(file.data);
}

export async function removeUpload(id: string) {
  if (!id) return;
  await prisma.storedFile.deleteMany({ where: { id } });
}
