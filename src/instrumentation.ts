export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const minutes = Number(process.env.SYNC_INTERVAL_MINUTES ?? "360");
  if (!Number.isFinite(minutes) || minutes <= 0) return;
  const { runSync } = await import("./lib/alfacrm/sync");
  const timer = setInterval(() => {
    runSync({ trigger: "cron" }).catch((error) => {
      console.error("Плановая синхронизация AlfaCRM не выполнилась", error);
    });
  }, minutes * 60 * 1000);
  timer.unref?.();
}
