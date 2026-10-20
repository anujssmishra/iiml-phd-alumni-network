import { test as base, expect, type BrowserContext } from "@playwright/test";
import { allowedVerificationUrl, recordNetworkAttempt, requireNetworkProof } from "../../scripts/verification-network.mjs";

const protectedContexts = new WeakSet<BrowserContext>();
export async function protect(context: BrowserContext, proof = requireNetworkProof()) {
  if (protectedContexts.has(context)) return;
  protectedContexts.add(context);
  requireNetworkProof(proof);
  context.on("request", request => {
    if (!allowedVerificationUrl(request.url())) recordNetworkAttempt("browser.request", proof);
  });
  await context.route("**/*", route => allowedVerificationUrl(route.request().url()) ? route.continue() : route.abort("blockedbyclient"));
  await context.routeWebSocket("**/*", route => {
    if (allowedVerificationUrl(route.url(), true)) route.connectToServer();
    else { recordNetworkAttempt("browser.websocket", proof); route.close(); }
  });
}

export const test = base.extend({
  browser: [async ({ browser }, runFixture) => {
    const original = browser.newContext;
    browser.newContext = async options => {
      const context = await original.call(browser, { ...options, serviceWorkers: "block" });
      await protect(context);
      return context;
    };
    try { await runFixture(browser); } finally { browser.newContext = original; }
  }, { scope: "worker" }],
  context: async ({ context }, runFixture) => { await protect(context); await runFixture(context); },
});
export { expect };
