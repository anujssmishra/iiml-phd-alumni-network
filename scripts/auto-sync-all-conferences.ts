import { denyPilotIngestion } from "../src/lib/conference-ingestion-policy";

// Refuse before constructing a database client, fetching or recording timestamps.
try { denyPilotIngestion(); }
catch (error) {
  console.error(error instanceof Error ? error.message : "Conference sync is unavailable.");
  process.exitCode = 1;
}
