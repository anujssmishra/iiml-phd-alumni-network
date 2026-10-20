import { test, expect } from "./offline-fixture";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

test("a running application refuses offline restore and legacy repair even while idle and stays usable", async ({ page }) => {
  if (process.env.APP_ENV !== "test" || !process.env.DATABASE_URL?.includes("iiml-network-check-")) throw new Error("Use the isolated browser harness.");
  const directory = mkdtempSync(join(tmpdir(), "iiml-browser-recovery-"));
  const backup = join(directory, "synthetic.db");
  try {
    await page.goto("/signin");
    const snapshot = spawnSync(process.execPath, ["scripts/backup-db.mjs", backup], { encoding: "utf8", env: process.env });
    expect(snapshot.status, snapshot.stderr).toBe(0);
    const restore = spawnSync(process.execPath, ["scripts/restore-db.mjs", backup, "--offline"], { encoding: "utf8", env: process.env });
    expect(restore.status).not.toBe(0);
    expect(restore.stderr).toContain("managed database client is still running");
    const repair = spawnSync(process.execPath, ["scripts/repair-lineage.mjs", "--offline", "--expect-lineage", "0".repeat(64)], { encoding: "utf8", env: process.env });
    expect(repair.status).not.toBe(0);
    expect(repair.stderr).toContain("managed database client is still running");
    const response = await page.goto("/signin");
    expect(response?.status()).toBe(200);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
