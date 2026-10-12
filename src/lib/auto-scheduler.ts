import { syncAllConferencesBatch, isSyncInProgress } from "./batch-sync";

declare global {
  var __autoSchedulerTimer: NodeJS.Timeout | undefined;
  var __autoSchedulerStartupTimeout: NodeJS.Timeout | undefined;
  var __autoSchedulerInitialized: boolean | undefined;
}

const DEFAULT_INTERVAL_HOURS = 24;

export function isAutoSchedulerEnabled(): boolean {
  return (
    process.env.ENABLE_AUTO_CONFERENCE_SYNC === "true" ||
    process.env.ENABLE_AUTO_CONFERENCE_SYNC === "1"
  );
}

export function initAutoScheduler(): void {
  if (globalThis.__autoSchedulerInitialized) {
    return;
  }

  if (!isAutoSchedulerEnabled()) {
    console.log(
      "[auto-scheduler] Background conference sync is disabled by default. Set ENABLE_AUTO_CONFERENCE_SYNC=true to enable."
    );
    return;
  }

  globalThis.__autoSchedulerInitialized = true;

  const intervalHours = Number(process.env.AUTO_SYNC_INTERVAL_HOURS) || DEFAULT_INTERVAL_HOURS;
  const intervalMs = Math.max(1, intervalHours) * 60 * 60 * 1000;

  console.log(`[auto-scheduler] Initializing background conference sync every ${intervalHours} hours.`);

  // Grace delay before running initial startup sync (10s)
  globalThis.__autoSchedulerStartupTimeout = setTimeout(() => {
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

export function stopAutoScheduler(): void {
  if (globalThis.__autoSchedulerTimer) {
    clearInterval(globalThis.__autoSchedulerTimer);
    globalThis.__autoSchedulerTimer = undefined;
  }
  if (globalThis.__autoSchedulerStartupTimeout) {
    clearTimeout(globalThis.__autoSchedulerStartupTimeout);
    globalThis.__autoSchedulerStartupTimeout = undefined;
  }
  globalThis.__autoSchedulerInitialized = undefined;
}

export async function runScheduledSync() {
  if (isSyncInProgress()) {
    console.warn("[auto-scheduler] Scheduled sync skipped: a sync operation is already in progress.");
    return null;
  }
  console.log(`[auto-scheduler] Running scheduled conference sync...`);
  const summary = await syncAllConferencesBatch();
  console.log(
    `[auto-scheduler] Completed sync: Created ${summary.created}, Updated ${summary.updated}, Unchanged ${summary.unchanged}, Errors ${summary.errors}`
  );
  return summary;
}
