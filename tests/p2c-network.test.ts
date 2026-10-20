import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { allowedVerificationUrl, assertNoNetworkAttempts, createNetworkProof, networkEnvironment, requireNetworkProof } from "../scripts/verification-network.mjs";

function probe(code: string, mode = "offline") {
  const proof = createNetworkProof();
  try {
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", `import assert from 'node:assert/strict'; assert.equal(globalThis[Symbol.for('iiml.verification.network')]?.mode,${JSON.stringify(mode)}); ${code}`], { env: networkEnvironment(mode, proof), encoding: "utf8", timeout: 10_000 });
    assert.equal(result.status, 0, result.stderr);
    const attempts = readFileSync(join(proof, "attempts.jsonl"), "utf8");
    assert.throws(() => assertNoNetworkAttempts(proof), /forbidden network access/);
    return attempts;
  } finally { rmSync(proof, { recursive: true, force: true }); }
}

test("P2C offline preload blocks fetch before networking and records no URLs, credentials or bodies", () => {
  const evidence = probe(`await assert.rejects(fetch('https://user:secret-token@example.invalid/private?token=private-value'), {code:'ERR_VERIFICATION_NETWORK_DENIED'});`);
  assert.equal(evidence.includes('"api":"fetch"'), true);
  for (const privateValue of ["secret-token", "private-value", "example.invalid", "private?"]) assert.equal(evidence.includes(privateValue), false);
});

test("P2C DNS callbacks, promises and independent resolvers refuse before any resolver request", () => {
  const evidence = probe(`
    import dns from 'node:dns'; import promises from 'node:dns/promises';
    assert.throws(()=>dns.lookup('fixture.invalid',()=>{}),{code:'ERR_VERIFICATION_NETWORK_DENIED'});
    await assert.rejects(promises.lookup('fixture.invalid'),{code:'ERR_VERIFICATION_NETWORK_DENIED'});
    assert.throws(()=>new dns.Resolver().resolve4('fixture.invalid',()=>{}),{code:'ERR_VERIFICATION_NETWORK_DENIED'});
    assert.throws(()=>new promises.Resolver().resolve6('fixture.invalid'),{code:'ERR_VERIFICATION_NETWORK_DENIED'});
    assert.throws(()=>dns.lookupService('192.0.2.1',443,()=>{}),{code:'ERR_VERIFICATION_NETWORK_DENIED'});
    await assert.rejects(promises.lookupService('192.0.2.1',443),{code:'ERR_VERIFICATION_NETWORK_DENIED'});
  `);
  assert.equal(evidence.trim().split("\n").length, 6);
});

test("P2C TCP, TLS, HTTP, HTTP2 and UDP cannot bypass the offline guard", () => {
  const evidence = probe(`
    import net from 'node:net'; import tls from 'node:tls'; import http from 'node:http'; import http2 from 'node:http2'; import dgram from 'node:dgram';
    assert.throws(()=>net.connect({host:'127.0.0.1',port:9}),{code:'ERR_VERIFICATION_NETWORK_DENIED'});
    assert.throws(()=>tls.connect({host:'127.0.0.1',port:9}),{code:'ERR_VERIFICATION_NETWORK_DENIED'});
    assert.throws(()=>http.get('http://127.0.0.1:9'),{code:'ERR_VERIFICATION_NETWORK_DENIED'});
    assert.throws(()=>http2.connect('http://127.0.0.1:9'),{code:'ERR_VERIFICATION_NETWORK_DENIED'});
    const socket=dgram.createSocket('udp4');
    try { assert.throws(()=>socket.send('synthetic',9,'127.0.0.1'),{code:'ERR_VERIFICATION_NETWORK_DENIED'}); } finally { socket.close(); }
  `);
  assert.equal(evidence.trim().split("\n").length, 5);
});

test("P2C Node children and workers inherit the verification preload", () => {
  const evidence = probe(`
    import {spawnSync} from 'node:child_process'; import {Worker} from 'node:worker_threads';
    const child=spawnSync(process.execPath,['-e',"const assert=require('node:assert/strict'); assert.ok(globalThis[Symbol.for('iiml.verification.network')]); assert.throws(()=>require('node:net').connect(9,'127.0.0.1'),{code:'ERR_VERIFICATION_NETWORK_DENIED'});"],{encoding:'utf8'});
    assert.equal(child.status,0,child.stderr);
    const worker=new Worker("import assert from 'node:assert/strict'; import net from 'node:net'; assert.ok(globalThis[Symbol.for('iiml.verification.network')]); assert.throws(()=>net.connect(9,'127.0.0.1'),{code:'ERR_VERIFICATION_NETWORK_DENIED'});",{eval:true});
    await new Promise((resolve,reject)=>{worker.once('error',reject);worker.once('exit',code=>code===0?resolve():reject(new Error('Worker failed')))});
  `);
  assert.equal(evidence.trim().split("\n").length, 2);
});

test("P2C browser policy permits only the fixture origin, including WebSocket and redirect destinations", () => {
  for (const url of ["http://127.0.0.1:3100/signin", "https://127.0.0.1:3100/api/auth/session", "http://[::1]:3100/"]) assert.equal(allowedVerificationUrl(url), true);
  assert.equal(allowedVerificationUrl("ws://127.0.0.1:3100/_next/webpack-hmr", true), true);
  for (const url of ["https://example.invalid/cfp", "http://127.0.0.1:3000/", "http://127.0.0.1/", "http://127.0.0.1.example.invalid:3100", "http://user:password@127.0.0.1:3100", "file:///tmp/local", "ws://127.0.0.1:3100/"]) assert.equal(allowedVerificationUrl(url), false);
});

test("P2C browser Node transport and Playwright API requests reach only the fixture port", () => {
  const evidence = probe(`
    import http from 'node:http'; import net from 'node:net'; import dns from 'node:dns/promises';
    import {request} from '@playwright/test';
    const server=http.createServer((_request,response)=>response.end('synthetic fixture'));
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(3100,'127.0.0.1',resolve)});
    const api=await request.newContext({baseURL:'http://127.0.0.1:3100'});
    try {
      assert.equal(await (await fetch('http://127.0.0.1:3100')).text(),'synthetic fixture');
      assert.equal(await (await api.get('/')).text(),'synthetic fixture');
      assert.deepEqual(await dns.lookup('localhost'),{address:'127.0.0.1',family:4});
      assert.throws(()=>net.connect(3101,'127.0.0.1'),{code:'ERR_VERIFICATION_NETWORK_DENIED'});
      await assert.rejects(fetch('http://127.0.0.1:3101'),{code:'ERR_VERIFICATION_NETWORK_DENIED'});
      await assert.rejects(dns.lookup('fixture.invalid'),{code:'ERR_VERIFICATION_NETWORK_DENIED'});
    } finally { await api.dispose(); server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); }
  `, "browser");
  assert.equal(evidence.trim().split("\n").length, 3);
});

test("P2C proof ownership checks and environment construction refuse arbitrary logs and ambient preload flags", () => {
  assert.throws(() => requireNetworkProof("/private/tmp"));
  const proof = createNetworkProof();
  try {
    assertNoNetworkAttempts(proof);
    const environment = networkEnvironment("offline", proof, { NODE_ENV: "test", NODE_OPTIONS: "--require /untrusted/preload.cjs", CHECKPOINT_DISABLE: "0", __NEXT_AGENT_UPGRADE: "security" });
    assert.equal(environment.NODE_OPTIONS.includes("untrusted"), false);
    assert.equal(environment.CHECKPOINT_DISABLE, "1");
    assert.equal(environment.npm_config_offline, "true");
    assert.equal(environment.__NEXT_AGENT_UPGRADE, "");
  } finally { rmSync(proof, { recursive: true, force: true }); }
});

test("P2C Next development version indicator stays explicitly unknown without calling fetch", () => {
  const proof = createNetworkProof();
  try {
    const environment = networkEnvironment("browser", proof, { ...process.env, NODE_ENV: "development" });
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", `
      import assert from 'node:assert/strict'; import {createRequire} from 'node:module';
      assert.equal(globalThis[Symbol.for('iiml.verification.network')]?.mode,'browser');
      const require=createRequire(import.meta.url);
      const tooling=require('next/dist/server/dev/hot-reloader-shared-utils.js');
      let calls=0; globalThis.fetch=()=>{calls++;throw new Error('Version fixture unexpectedly called fetch')};
      assert.deepEqual(await tooling.getVersionInfo(),{installed:'16.4.0',staleness:'unknown'});
      assert.equal(calls,0);
      assert.equal(typeof tooling.matchNextPageBundleRequest,'function');
    `], { env: environment, encoding: "utf8", timeout: 10_000 });
    assert.equal(result.status, 0, result.stderr);
    assertNoNetworkAttempts(proof);
  } finally { rmSync(proof, { recursive: true, force: true }); }
});
