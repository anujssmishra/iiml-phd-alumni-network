import net from "node:net";
import dns from "node:dns";
import dnsPromises from "node:dns/promises";
import dgram from "node:dgram";
import tls from "node:tls";
import { createRequire, syncBuiltinESMExports } from "node:module";
import { allowedVerificationUrl, recordNetworkAttempt, requireNetworkProof } from "./verification-network.mjs";

const directory = requireNetworkProof();
const mode = process.env.VERIFICATION_NETWORK_MODE;
if (!["offline", "browser"].includes(mode)) throw new Error("Unknown verification network mode.");
Object.defineProperty(globalThis, Symbol.for("iiml.verification.network"), { value: Object.freeze({ version: 1, mode }) });
function denied(api) {
  recordNetworkAttempt(api, directory);
  const error = new Error(`Verification network denied: ${api}`);
  error.code = "ERR_VERIFICATION_NETWORK_DENIED";
  throw error;
}

function permittedConnect(args) {
  if (Array.isArray(args[0])) return permittedConnect(args[0]);
  const options = args[0] && typeof args[0] === "object" ? args[0] : { port: args[0], host: typeof args[1] === "string" ? args[1] : undefined };
  if (typeof options.path === "string" && options.port === undefined) return true; // Local Unix IPC, not IP traffic.
  return mode === "browser" && Number(options.port) === 3100 && [undefined, "localhost", "127.0.0.1", "::1"].includes(options.host);
}

const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  if (!permittedConnect(args)) denied("tcp");
  return Reflect.apply(connect, this, args);
};
const tlsConnect = tls.connect;
tls.connect = function (...args) {
  if (!permittedConnect(args)) denied("tls");
  return Reflect.apply(tlsConnect, this, args);
};

// No resolver request is sent, even for localhost: return its fixed local
// address where browser polling needs it. Everything else refuses before DNS.
dns.lookup = function (host, options, callback) {
  if (mode !== "browser" || !["localhost", "127.0.0.1", "::1"].includes(host)) denied("dns.lookup");
  const cb = typeof options === "function" ? options : callback;
  const address = host === "::1" || options?.family === 6 ? "::1" : "127.0.0.1";
  queueMicrotask(() => options?.all ? cb(null, [{ address, family: address === "::1" ? 6 : 4 }]) : cb(null, address, address === "::1" ? 6 : 4));
};
dnsPromises.lookup = async function (host, options) {
  if (mode !== "browser" || !["localhost", "127.0.0.1", "::1"].includes(host)) denied("dns.promises.lookup");
  const address = host === "::1" || options?.family === 6 ? "::1" : "127.0.0.1";
  const value = { address, family: address === "::1" ? 6 : 4 };
  return options?.all ? [value] : value;
};
dns.lookupService = () => denied("dns.lookupService");
dnsPromises.lookupService = async () => denied("dns.promises.lookupService");
for (const resolverModule of [dns, dnsPromises]) {
  for (const key of Object.keys(resolverModule).filter(key => /^resolve|^reverse$/.test(key) && typeof resolverModule[key] === "function")) resolverModule[key] = () => denied(`dns.${key}`);
  for (const key of Object.getOwnPropertyNames(resolverModule.Resolver.prototype).filter(key => /^resolve|^reverse$/.test(key))) resolverModule.Resolver.prototype[key] = () => denied(`resolver.${key}`);
}
for (const key of ["send", "connect"]) dgram.Socket.prototype[key] = () => denied(`udp.${key}`);
const fetch = globalThis.fetch;
globalThis.fetch = async function (input, init) {
  const url = typeof input === "string" || input instanceof URL ? String(input) : input.url;
  if (mode !== "browser" || !allowedVerificationUrl(url)) denied("fetch");
  return fetch(input, init);
};
syncBuiltinESMExports();

// Next 16.4's dev-only version indicator has no offline switch and swallows
// failed registry requests. Replace that exact tooling function before startup,
// not fetch or an application API. Never invent a current/safe version verdict.
if (mode === "browser" && process.env.NODE_ENV === "development") {
  const require = createRequire(import.meta.url);
  const installed = require("next/package.json").version;
  if (installed !== "16.4.0") throw new Error("Review the offline Next dev-version fixture for the installed Next version.");
  const path = require.resolve("next/dist/server/dev/hot-reloader-shared-utils.js");
  const original = require(path);
  if (typeof original.getVersionInfo !== "function" || typeof original.matchNextPageBundleRequest !== "function") throw new Error("Unknown Next dev-version fixture shape.");
  require.cache[path].exports = Object.freeze({ ...original, getVersionInfo: async () => ({ installed, staleness: "unknown" }) });
}
