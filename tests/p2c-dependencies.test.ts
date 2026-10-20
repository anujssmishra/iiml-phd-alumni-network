import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { loadConfigFromFile } from "@prisma/config";
import { installNextRootGlob } from "../scripts/eslint-root-glob.mjs";

const require = createRequire(import.meta.url);
installNextRootGlob(); installNextRootGlob();
const next = createRequire(require.resolve("@next/eslint-plugin-next"));
const { getRootDirs } = next("./utils/get-root-dirs.js");
const glob = next("fast-glob").globSync;
const prisma = createRequire(require.resolve("@prisma/config"));

test("P2C scoped overrides retain framework/ORM versions and remove the affected dependency paths", () => {
  const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
  const lock = JSON.parse(readFileSync(resolve("package-lock.json"), "utf8"));
  assert.equal(pkg.dependencies.next, "16.4.0");
  assert.equal(pkg.devDependencies.prisma, "6.19.3");
  assert.equal(pkg.dependencies["@prisma/client"], "6.19.3");
  assert.equal(pkg.overrides["@prisma/config@6.19.3"]["deepmerge-ts"], "8.0.2");
  assert.equal(pkg.overrides["@next/eslint-plugin-next@16.4.0"]["fast-glob"], "npm:tinyglobby@0.2.17");
  for (const [path, entry] of Object.entries(lock.packages) as [string, { name?: string; version?: string }][]) {
    assert.equal(/node_modules\/(braces|micromatch)$/.test(path), false, path);
    if (/node_modules\/deepmerge-ts$/.test(path)) assert.equal(entry.version, "8.0.2");
    if (/node_modules\/fast-glob$/.test(path)) assert.equal(entry.name, "tinyglobby");
  }
});

test("P2C actual Next root discovery preserves literal, brace, wildcard, array and missing-root semantics", () => {
  const directory = mkdtempSync(join(tmpdir(), "iiml-dependency-globs-"));
  const previous = process.cwd();
  try {
    for (const path of ["apps/a/app", "apps/b/pages", "single/app", ".hidden/app"]) mkdirSync(join(directory, path), { recursive: true });
    writeFileSync(join(directory, "apps/not-a-directory"), "synthetic");
    process.chdir(directory);
    const roots = (rootDir?: unknown) => getRootDirs({ cwd: directory, settings: { next: { rootDir } } }).sort();
    assert.deepEqual(roots(), [directory]);
    assert.deepEqual(roots("single"), ["single"]);
    assert.deepEqual(roots("{single,apps/a}"), ["apps/a", "single"]);
    assert.deepEqual(roots("apps/*"), ["apps/a", "apps/b"]);
    assert.deepEqual(roots(["single", "apps/*", 42]), ["apps/a", "apps/b", "single"]);
    assert.deepEqual(roots("apps\\*"), ["apps/a", "apps/b"]);
    assert.deepEqual(roots("missing"), []);
    assert.deepEqual(roots("*"), ["apps", "single"]);
    assert.deepEqual(roots(join(directory, "single")), [join(directory, "single")]);
  } finally { process.chdir(previous); rmSync(directory, { recursive: true, force: true }); }
});

test("P2C root discovery refuses adversarial nesting and unsupported adapter calls before parsing", () => {
  assert.throws(() => glob("{".repeat(33) + "x" + "}".repeat(33), { onlyDirectories: true }), /nesting limit/);
  assert.throws(() => glob("x".repeat(4097), { onlyDirectories: true }), /Unsupported/);
  assert.throws(() => glob("*", { onlyFiles: true }), /Unsupported/);
  assert.throws(() => glob(["*"], { onlyDirectories: true }), /Unsupported/);
});

test("P2C patched merge preserves Prisma's supported plain-record/array/function contract in CJS and ESM", async () => {
  const path = prisma.resolve("deepmerge-ts");
  const implementations = [prisma("deepmerge-ts"), await import(pathToFileURL(path.replace(/\.cjs$/, ".mjs")).href)];
  for (const { deepmerge } of implementations) {
    const adapter = () => "synthetic-adapter";
    const a = { schema: "old.prisma", migrations: { path: "migrations", seed: "old" }, experimental: { adapter: false }, values: ["a"], adapter };
    const b = { schema: "new.prisma", migrations: { seed: "new" }, experimental: { studio: true }, values: ["b"] };
    assert.deepEqual(deepmerge(a, b), { schema: "new.prisma", migrations: { path: "migrations", seed: "new" }, experimental: { adapter: false, studio: true }, values: ["a", "b"], adapter });
    assert.equal(a.schema, "old.prisma"); assert.deepEqual(a.values, ["a"]);
    const first: { self?: unknown } = {}; first.self = first;
    const second: { self?: unknown } = {}; second.self = second;
    const merged = deepmerge(first, second);
    assert.equal(merged.self, merged);
  }
});

test("P2C installed Prisma configuration loader resolves valid config and refuses invalid config", async () => {
  const directory = mkdtempSync(join(tmpdir(), "iiml-dependency-config-"));
  try {
    const file = join(directory, "prisma.config.cjs");
    writeFileSync(file, "module.exports = { schema: './schema.prisma', migrations: { path: './migrations', seed: 'echo synthetic' } };\n");
    const result = await loadConfigFromFile({ configRoot: directory, configFile: file });
    assert.equal(result.error, undefined, JSON.stringify(result));
    assert.equal(result.config?.schema, join(directory, "schema.prisma"));
    assert.equal(result.config?.migrations?.path, join(directory, "migrations"));
    assert.equal(result.config?.migrations?.seed, "echo synthetic");
    assert.equal(dirname(result.resolvedPath!), directory);
    const invalidFile = join(directory, "invalid.config.cjs");
    writeFileSync(invalidFile, "module.exports = { schema: 42 };\n");
    const invalid = await loadConfigFromFile({ configRoot: directory, configFile: invalidFile });
    assert.ok(invalid.error);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
