import { syncAllConferencesBatch } from "./batch-sync";

declare global {
  var __autoSchedulerTimer: NodeJS.Timeout | undefined;
  var __autoSchedulerInitialized: boolean | undefined;
}

const DEFAULT_INTERVAL_HOURS = 24;

export function initAutoScheduler(): void {
  if (globalThis.__autoSchedulerInitialized) {
    return;
  }
  globalThis.__autoSchedulerInitialized = true;

  const intervalHours = Number(process.env.AUTO_SYNC_INTERVAL_HOURS) || DEFAULT_INTERVAL_HOURS;
  const intervalMs = intervalHours * 60 * 60 * 1000;

  console.log(`[auto-scheduler] Initializing background conference sync every ${intervalHours} hours.`);

  // Only schedule background timers when running outside unit tests
  if (process.env.NODE_ENV !== "test") {
    // Grace delay before running initial startup sync (10s)
    setTimeout(() => {
      runScheduledSync().catch((err) => {
        console.error("[auto-scheduler] Initial sync execution error:", err);
      });
    }, 10_000);

    // Periodic recurring timer
    globalThis.__autoSchedulerTimer = setInterval(() => {
      runScheduledSync().catch((err) => {
        console.error("[auto-scheduler] Periodic sync execution error:", err);
      });
    }, intervalMs);
  }
}

export async function runScheduledSync() {
  console.log(`[auto-scheduler] Running scheduled conference sync...`);
  const summary = await syncAllConferencesBatch();
  console.log(
    `[auto-scheduler] Completed sync: Created ${summary.created}, Updated ${summary.updated}, Unchanged ${summary.unchanged}, Errors ${summary.errors}`
  );
  return summary;
}
