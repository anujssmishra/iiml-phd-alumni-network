export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initAutoScheduler } = await import("@/lib/auto-scheduler");
    initAutoScheduler();
  }
}
