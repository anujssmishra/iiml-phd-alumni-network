import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { isAbsolute } from "node:path";

const require = createRequire(import.meta.url);
export function installNextRootGlob() {
  const plugin = createRequire(require.resolve("@next/eslint-plugin-next"));
  const caller = plugin.resolve("./utils/get-root-dirs.js");
  const hash = createHash("sha256").update(readFileSync(caller)).digest("hex");
  if (hash !== "886677432990a735e5ebdfb345ff1cbd40e264f9947a8432eeeb254b3a926bde") throw new Error("Review the Next ESLint root-glob adapter for the changed caller.");
  const path = plugin.resolve("fast-glob");
  const tiny = plugin("fast-glob");
  if (tiny[Symbol.for("iiml.eslint.root-glob")]) return;
  if (typeof tiny.globSync !== "function") throw new Error("Unknown root-glob replacement API.");
  // Install before importing the plugin. This modifies only the process-local
  // export of its scoped npm alias, never dependency files or other callers.
  require.cache[path].exports = Object.freeze({ globSync: createRootGlobSync(tiny.globSync), [Symbol.for("iiml.eslint.root-glob")]: true });
}

export function createRootGlobSync(globSync) {
  return function rootGlob(pattern, options) {
    if (typeof pattern !== "string" || pattern.length > 4096 || !options || options.onlyDirectories !== true || Object.keys(options).some(key => key !== "onlyDirectories")) throw new Error("Unsupported Next ESLint root-glob contract.");
    let depth = 0;
    let escaped = false;
    for (const character of pattern) {
      if (escaped) { escaped = false; continue; }
      if (character === "\\") { escaped = true; continue; }
      if (character === "{") { if (++depth > 32) throw new Error("Next ESLint root glob exceeds nesting limit."); }
      if (character === "}") depth = Math.max(0, depth - 1);
    }
    // tinyglobby otherwise expands literal roots into all descendant folders.
    return globSync(pattern, { onlyDirectories: true, expandDirectories: false, absolute: isAbsolute(pattern), cwd: process.cwd() })
      .map(path => path === "/" || /^[A-Za-z]:\/$/.test(path) ? path : path.replace(/\/$/, ""));
  };
}
