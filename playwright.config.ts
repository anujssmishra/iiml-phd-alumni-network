import { defineConfig, devices } from "@playwright/test";
import { verificationChromiumArguments } from "./scripts/verification-network.mjs";

const production = process.env.BROWSER_SERVER_MODE === "production";
const proxy = process.env.VERIFICATION_BROWSER_PROXY;
if (!proxy || !/^http:\/\/127\.0\.0\.1:\d+$/.test(proxy) || !process.env.VERIFICATION_NETWORK_DIR) throw new Error("Use npm run test:e2e with its isolated network/database harness.");

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure", ...devices["Desktop Chrome"],
    serviceWorkers: "block",
    launchOptions: {
      // Configure Chromium directly: Playwright's Node APIRequestContext proxy
      // bypass matches hostnames only, not ports. Its requests instead use the
      // Node guard, which permits exactly the fixture port and no proxy socket.
      args: verificationChromiumArguments(proxy),
    },
  },
  webServer: {
    command: `"${process.execPath}" node_modules/next/dist/bin/next ${production ? "start" : "dev --webpack"} --hostname 127.0.0.1 --port 3100`,
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 120_000,
    env: { ...process.env, NODE_ENV: production ? "production" : "development", APP_ENV: process.env.BROWSER_APP_ENV ?? process.env.APP_ENV ?? "" },
  },
});
