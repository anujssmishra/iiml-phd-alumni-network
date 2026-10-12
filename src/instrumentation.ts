export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Automatic conference ingestion is explicitly opt-in and off by default.
    // Set ENABLE_AUTO_CONFERENCE_SYNC=true to activate background ingestion.
    const isOptedIn =
      process.env.ENABLE_AUTO_CONFERENCE_SYNC === "true" ||
      process.env.ENABLE_AUTO_CONFERENCE_SYNC === "1";

    if (isOptedIn) {
      const { initAutoScheduler } = await import("@/lib/auto-scheduler");
      initAutoScheduler();
    }
  }
}
