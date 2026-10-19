import { NetworkError } from "./validation";

export function denyPilotIngestion(): never {
  throw new NetworkError("URL fetching and automatic conference ingestion are disabled during the manually curated pilot. Enter an edition-specific source and review the details manually.", 503);
}
