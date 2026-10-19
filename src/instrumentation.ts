export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Retained flag compatibility: the scheduler itself refuses all ingestion
    // throughout P2, including when an older environment enables this flag.
    const isOptedIn =
      process.env.ENABLE_AUTO_CONFERENCE_SYNC === "true" ||
      process.env.ENABLE_AUTO_CONFERENCE_SYNC === "1";

    if (isOptedIn) {
      const { initAutoScheduler } = await import("@/lib/auto-scheduler");
      initAutoScheduler();
    }
  }
}
