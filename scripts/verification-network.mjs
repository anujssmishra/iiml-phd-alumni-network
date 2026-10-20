import { appendFileSync, existsSync, lstatSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

export function createNetworkProof() {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), "iiml-offline-network-")));
  writeFileSync(join(directory, "proof.json"), JSON.stringify({ version: 1 }), { flag: "wx", mode: 0o600 });
  writeFileSync(join(directory, "attempts.jsonl"), "", { flag: "wx", mode: 0o600 });
  return directory;
}

export function requireNetworkProof(directory = process.env.VERIFICATION_NETWORK_DIR) {
  if (!directory || resolve(directory) !== realpathSync(directory) || dirname(directory) !== realpathSync(tmpdir()) || !/^iiml-offline-network-[A-Za-z0-9]+$/.test(basename(directory))) throw new Error("Invalid verification network proof directory.");
  for (const file of [directory, join(directory, "proof.json"), join(directory, "attempts.jsonl")]) {
    const stat = lstatSync(file);
    if ((stat.mode & 0o077) !== 0 || (process.getuid && stat.uid !== process.getuid()) || (file === directory ? !stat.isDirectory() : !stat.isFile() || stat.nlink !== 1)) throw new Error("Network proof must use owned private regular files.");
  }
  if (JSON.parse(readFileSync(join(directory, "proof.json"), "utf8")).version !== 1) throw new Error("Unknown network proof version.");
  return directory;
}

export function recordNetworkAttempt(api, directory = requireNetworkProof()) {
  // Never write destination URLs, headers, tokens, query strings or bodies.
  appendFileSync(join(directory, "attempts.jsonl"), JSON.stringify({ api, pid: process.pid }) + "\n");
}

export function assertNoNetworkAttempts(directory) {
  requireNetworkProof(directory);
  const lines = readFileSync(join(directory, "attempts.jsonl"), "utf8").trim();
  if (lines) {
    const attempts = lines.split("\n").map(line => JSON.parse(line));
    const categories = [...new Set(attempts.map(attempt => attempt.api))].join(", ");
    throw new Error(`Verification attempted forbidden network access (${attempts.length} attempts: ${categories}); private evidence: ${directory}`);
  }
}

export function networkEnvironment(mode, directory, environment = process.env) {
  requireNetworkProof(directory);
  const preload = pathToFileURL(resolve("scripts/verification-network-preload.mjs")).href;
  return {
    ...environment,
    // Do not inherit arbitrary preload/loader flags into the verification tree.
    NODE_OPTIONS: `--import=${preload}`,
    VERIFICATION_NETWORK_MODE: mode,
    VERIFICATION_NETWORK_DIR: directory,
    CHECKPOINT_DISABLE: "1",
    PRISMA_HIDE_UPDATE_MESSAGE: "1",
    NEXT_TELEMETRY_DISABLED: "1",
    __NEXT_AGENT_UPGRADE: "",
    npm_config_offline: "true",
    npm_config_update_notifier: "false",
  };
}

export function allowedVerificationUrl(value, websocket = false) {
  try {
    const url = new URL(value);
    return (websocket ? ["ws:", "wss:"] : ["http:", "https:"]).includes(url.protocol)
      && ["127.0.0.1", "[::1]"].includes(url.hostname) && url.port === "3100" && !url.username && !url.password;
  } catch { return false; }
}

export function verificationChromiumArguments(proxy) {
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(proxy ?? "")) throw new Error("Invalid owned verification proxy.");
  return [
    `--proxy-server=${proxy}`,
    "--proxy-bypass-list=<-loopback>;127.0.0.1:3100;[::1]:3100",
    "--disable-quic",
    "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE [::1]",
  ];
}

export function hasNetworkProof(environment = process.env) {
  return Boolean(environment.VERIFICATION_NETWORK_DIR && existsSync(environment.VERIFICATION_NETWORK_DIR));
}
