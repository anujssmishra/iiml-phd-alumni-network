import { spawnSync } from "node:child_process";
import { readFileSync, rmSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { createNetworkProof, networkEnvironment, assertNoNetworkAttempts } from "./verification-network.mjs";

const profile = '(version 1) (allow default) (deny network-outbound (remote ip "*:*")) (allow network-outbound (remote ip "localhost:*"))';
const actions = { check: "check", test: "test", build: "build", browser: "test:e2e" };
const args = process.argv.slice(2);
const inside = args[0] === "--inside";
const action = args[inside ? 1 : 0];
const forwarded = args.slice(inside ? 2 : 1);
if (!Object.hasOwn(actions, action) && action !== "probe") throw new Error("Usage: npm run verify:offline -- check|test|build|browser|probe [browser test paths]");
if (forwarded.length && action !== "browser") throw new Error("Only browser mode accepts extra test arguments.");

function run(command, args, environment = process.env) {
  const result = spawnSync(command, args, { env: environment, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Offline command failed (${result.status ?? result.signal}). No unconfined fallback was run.`);
}

if (!inside) {
  const environment = { ...process.env, NODE_OPTIONS: "" };
  if (process.platform === "darwin") run("/usr/bin/sandbox-exec", ["-p", profile, process.execPath, resolve("scripts/offline-run.mjs"), "--inside", action, ...forwarded], environment);
  else if (process.platform === "linux") run("unshare", ["--user", "--map-root-user", "--net", process.execPath, resolve("scripts/offline-run.mjs"), "--inside", action, ...forwarded], environment);
  else throw new Error("OS-isolated verification supports macOS sandbox-exec or Linux user/network namespaces only.");
} else {
  if (process.platform === "linux") {
    if (process.env.VERIFICATION_EXPECT_UID) {
      const expected = Number(process.env.VERIFICATION_EXPECT_UID);
      const status = readFileSync("/proc/self/status", "utf8");
      if (!Number.isInteger(expected) || expected <= 0 || process.getuid() !== expected
        || !process.env.HOME || statSync(process.env.HOME).uid !== expected
        || [...status.matchAll(/^Cap(?:Inh|Prm|Eff|Bnd|Amb):\s*0+\s*$/gm)].length !== 5
        || !/^NoNewPrivs:\s*1\s*$/m.test(status)) throw new Error("CI workload did not drop to the runner with zero capabilities and no-new-privileges.");
      console.log(`[offline] Linux workload uses original uid ${expected}, runner-owned home, zero capabilities, and no-new-privileges.`);
    }
    const link = spawnSync("ip", ["-json", "link", "show", "dev", "lo"], { encoding: "utf8" });
    if (link.error || link.status !== 0) throw new Error("Cannot inspect isolated loopback interface.");
    if (!JSON.parse(link.stdout)[0]?.flags?.includes("UP")) run("ip", ["link", "set", "lo", "up"]);
  }
  // Probe without the JS preload: observe kernel denial, not our own mock.
  // A reserved documentation IP is used, never a real event/provider endpoint.
  run(process.execPath, ["--input-type=module", "-e", `
    import net from 'node:net';
    const socket=net.connect({host:'192.0.2.1',port:443});
    socket.once('error', error=>{
      if(!['EPERM','EACCES','ENETUNREACH','EHOSTUNREACH'].includes(error.code)) process.exit(2);
      console.log('[offline] Kernel denies external IP traffic.');
    });
    socket.once('connect',()=>{socket.destroy();process.exit(3)});
    socket.setTimeout(2000,()=>{socket.destroy();process.exit(4)});
  `], { ...process.env, NODE_OPTIONS: "" });
  if (action !== "probe") {
    const proof = createNetworkProof();
    let completed = false;
    try {
      const environment = networkEnvironment(action === "browser" ? "browser" : "offline", proof);
      run("npm", ["run", actions[action], ...(forwarded.length ? ["--", ...forwarded] : [])], environment);
      assertNoNetworkAttempts(proof);
      console.log("[offline] OS-isolated run completed with zero forbidden Node/browser attempts.");
      completed = true;
    } finally {
      if (completed) rmSync(proof, { recursive: true, force: true });
      else console.error(`[offline] Private network evidence retained: ${proof}`);
    }
  }
}
