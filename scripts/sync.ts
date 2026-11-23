import "dotenv/config";
import { prisma } from "../src/lib/db";
import { runSync } from "../src/lib/alfacrm/sync";

runSync({ trigger: "script" })
  .then((result) => {
    console.log(result.message);
    if (result.stats.warnings.length) console.log(result.stats.warnings.join("\n"));
    process.exit(result.ok ? 0 : 1);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
