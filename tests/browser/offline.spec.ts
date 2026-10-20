import { chromium } from "@playwright/test";
import { fork } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { test, expect, protect } from "./offline-fixture";
import { assertNoNetworkAttempts, createNetworkProof, networkEnvironment, verificationChromiumArguments } from "../../scripts/verification-network.mjs";

test("offline browser hooks and deny proxy reject synthetic external HTTP, redirects and WebSockets", async () => {
  // Expected negative probes own a separate ledger: normal workload denials
  // remain fatal in the parent harness, including caught application errors.
  const proof = createNetworkProof();
  const proxy = fork(resolve("scripts/verification-deny-proxy.mjs"), [], { env: networkEnvironment("browser", proof), stdio: ["ignore", "ignore", "inherit", "ipc"] });
  const closed = new Promise(resolve => proxy.once("close", resolve));
  let browser;
  try {
    const port = await new Promise<number>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Negative-probe proxy startup timed out.")), 10_000);
      proxy.once("message", message => {
        clearTimeout(timeout);
        const port = (message as { port?: number }).port;
        if (Number.isInteger(port) && port! > 0) resolve(port!);
        else reject(new Error("Invalid negative-probe proxy port."));
      });
      proxy.once("error", reject);
      proxy.once("exit", () => { clearTimeout(timeout); reject(new Error("Negative-probe proxy stopped.")); });
    });
    browser = await chromium.launch({ args: verificationChromiumArguments(`http://127.0.0.1:${port}`) });
    const context = await browser.newContext({ serviceWorkers: "block" });
    await protect(context, proof);
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:3100/signin");
    expect(await page.evaluate(() => fetch("http://192.0.2.1:8080/synthetic").then(() => "unexpected", () => "denied"))).toBe("denied");
    expect(await page.evaluate(() => new Promise<string>(resolve => {
      const socket = new WebSocket("ws://192.0.2.1:8080/synthetic");
      socket.onclose = () => resolve("denied");
      socket.onerror = () => resolve("denied");
      setTimeout(() => resolve("timeout"), 3000);
    }))).toBe("denied");
    let redirectedRequest = false;
    context.on("request", request => { if (request.url() === "https://192.0.2.1:8080/synthetic") redirectedRequest = true; });
    await page.route("**/offline-negative-redirect", route => route.fulfill({ status: 302, headers: { location: "https://192.0.2.1:8080/synthetic" } }));
    await page.goto("http://127.0.0.1:3100/offline-negative-redirect").catch(() => null);
    expect(redirectedRequest).toBe(true);
    // Exercise the proxy independently of context routing. It must never forward.
    const proxyOnly = await browser.newContext({ serviceWorkers: "block" });
    const raw = await proxyOnly.newPage();
    expect((await raw.goto("http://192.0.2.1:8080/synthetic"))?.status()).toBe(403);
    await raw.goto("https://192.0.2.1:8080/synthetic").catch(() => null);
    const attempts = readFileSync(join(proof, "attempts.jsonl"), "utf8");
    for (const category of ["browser.request", "browser.websocket", "browser.proxy.http", "browser.proxy.connect"]) expect(attempts).toContain(`"api":"${category}"`);
    expect(() => assertNoNetworkAttempts(proof)).toThrow(/forbidden network access/);
    expect(attempts).not.toContain("192.0.2.1");
    expect(attempts).not.toContain("synthetic");
  } finally {
    await browser?.close();
    proxy.kill(); await closed;
    rmSync(proof, { recursive: true, force: true });
  }
});
