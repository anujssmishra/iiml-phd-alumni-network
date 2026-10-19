import { denyPilotIngestion } from "./conference-ingestion-policy";

declare global {
  var __autoSchedulerTimer: NodeJS.Timeout | undefined;
  var __autoSchedulerStartupTimeout: NodeJS.Timeout | undefined;
  var __autoSchedulerInitialized: boolean | undefined;
}

export function isAutoSchedulerEnabled(): boolean { return false; }

export function stopAutoScheduler(): void {
  if (globalThis.__autoSchedulerTimer) clearInterval(globalThis.__autoSchedulerTimer);
  if (globalThis.__autoSchedulerStartupTimeout) clearTimeout(globalThis.__autoSchedulerStartupTimeout);
  globalThis.__autoSchedulerTimer = undefined;
  globalThis.__autoSchedulerStartupTimeout = undefined;
  globalThis.__autoSchedulerInitialized = undefined;
}

export function initAutoScheduler(): void {
  stopAutoScheduler();
  console.log("[auto-scheduler] Background ingestion is disabled throughout the manually curated pilot.");
}

export async function runScheduledSync() { return denyPilotIngestion(); }
