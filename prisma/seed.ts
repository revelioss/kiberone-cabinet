import "dotenv/config";
import { hashPassword } from "../src/lib/password";
import { prisma } from "../src/lib/db";
import { runSync } from "../src/lib/alfacrm/sync";

type DemoStudent = {
  login: string;
  password: string;
  fullName: string;
  alfacrmId: number | null;
  active: boolean;
  portfolioUrl: string;
  driveUrl: string;
  ratingEnabled: boolean;
  ratingScore: number | null;
};

const demos: DemoStudent[] = [
  {
    login: "alisa",
    password: "Alisa-Demo-2026",
    fullName: "Алиса Норд",
    alfacrmId: 9001,
    active: true,
    portfolioUrl: "https://example.com/portfolio/alisa-nord",
    driveUrl: "https://drive.google.com/drive/folders/DEMO-ALISA-NORD",
    ratingEnabled: true,
    ratingScore: 86,
  },
  {
    login: "timur",
    password: "Timur-Demo-2026",
    fullName: "Тимур Бек",
    alfacrmId: 9002,
    active: true,
    portfolioUrl: "https://example.com/portfolio/timur-bek",
    driveUrl: "https://drive.google.com/drive/folders/DEMO-TIMUR-BEK",
    ratingEnabled: true,
    ratingScore: 79,
  },
  {
    login: "mira",
    password: "Mira-Demo-2026",
    fullName: "Мира Орын",
    alfacrmId: 9003,
    active: true,
    portfolioUrl: "https://example.com/portfolio/mira-oryn",
    driveUrl: "https://drive.google.com/drive/folders/DEMO-MIRA-ORYN",
    ratingEnabled: false,
    ratingScore: null,
  },
  {
    login: "lera",
    password: "Lera-Demo-2026",
    fullName: "Лера Пауза",
    alfacrmId: null,
    active: false,
    portfolioUrl: "",
    driveUrl: "",
    ratingEnabled: false,
    ratingScore: null,
  },
];

async function ensureUser(input: { login: string; password: string; role: "ADMIN" | "STUDENT"; isActive: boolean }) {
  const existing = await prisma.user.findUnique({ where: { login: input.login } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      login: input.login,
      passwordHash: await hashPassword(input.password),
      role: input.role,
      isActive: input.isActive,
    },
  });
}

async function main() {
  const demo = process.env.SEED_DEMO !== "0";
  const adminLogin = process.env.ADMIN_LOGIN || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || (demo ? "Kabinet-Admin-2026" : "");
  if (!adminPassword) {
    throw new Error("Задайте ADMIN_PASSWORD: без него нельзя создать вход преподавателя.");
  }
  await ensureUser({
    login: adminLogin,
    password: adminPassword,
    role: "ADMIN",
    isActive: true,
  });

  if (!demo) {
    console.log(`Готово. Преподаватель: ${adminLogin}. Учебные ученики не создавались.`);
    return;
  }

  for (const person of demos) {
    const user = await ensureUser({
      login: person.login,
      password: person.password,
      role: "STUDENT",
      isActive: person.active,
    });
    await prisma.student.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        fullName: person.fullName,
        alfacrmId: person.alfacrmId,
        portfolioUrl: person.portfolioUrl,
        driveUrl: person.driveUrl,
        driveFolderName: person.fullName,
        ratingEnabled: person.ratingEnabled,
        ratingScore: person.ratingScore,
      },
      update: {},
    });
  }

  await runSync({ trigger: "seed" });

  const alisa = await prisma.student.findFirst({ where: { user: { login: "alisa" } } });
  if (alisa) {
    const certificateTitle = "Грамота за проект «Космический кот»";
    const existing = await prisma.certificate.findFirst({ where: { studentId: alisa.id, title: certificateTitle } });
    if (!existing) {
      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="560" viewBox="0 0 900 560">
  <rect width="900" height="560" fill="#f4f8fc"/>
  <rect x="28" y="28" width="844" height="504" fill="none" stroke="#1d4f91" stroke-width="8"/>
  <text x="450" y="180" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#1d4f91">KIBERone Караганда</text>
  <text x="450" y="250" text-anchor="middle" font-family="sans-serif" font-size="42" fill="#17315c">Грамота</text>
  <text x="450" y="320" text-anchor="middle" font-family="sans-serif" font-size="30" fill="#17315c">Алиса Норд</text>
  <text x="450" y="380" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#355">за проект «Космический кот»</text>
  <text x="450" y="450" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#667">Учебный образец, не документ</text>
</svg>`;
      const file = await prisma.storedFile.create({
        data: {
          fileName: "gramota-alisa.svg",
          mimeType: "image/svg+xml",
          data: Buffer.from(svg),
        },
      });
      await prisma.certificate.create({
        data: {
          studentId: alisa.id,
          title: certificateTitle,
          note: "Учебный файл, не настоящая грамота.",
          fileName: file.fileName,
          filePath: file.id,
          mimeType: file.mimeType,
          issuedOn: new Date("2026-11-10T12:00:00.000Z"),
        },
      });
    }
    const achievementTitle = "Первый цикл";
    const achievement = await prisma.achievement.findFirst({ where: { studentId: alisa.id, title: achievementTitle } });
    if (!achievement) {
      await prisma.achievement.create({
        data: {
          studentId: alisa.id,
          title: achievementTitle,
          description: "Сама собрала повтор в игре и объяснила его соседу.",
          awardedOn: new Date("2026-10-20T12:00:00.000Z"),
        },
      });
    }
    const extraTitle = "Дорисовать фон космического кота";
    const extra = await prisma.homeworkItem.findFirst({ where: { studentId: alisa.id, title: extraTitle } });
    if (!extra) {
      await prisma.homeworkItem.create({
        data: {
          studentId: alisa.id,
          title: extraTitle,
          description: "Добавьте звёзды и кнопку «ещё раз». Это задание школы, его нет в карточке урока CRM.",
          status: "new",
          source: "MANUAL",
        },
      });
    }
  }

  console.log("Готово. Демо-вход: admin / Kabinet-Admin-2026, alisa / Alisa-Demo-2026");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
