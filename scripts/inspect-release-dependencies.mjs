import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

// Read-only, deliberately limited inventory. No registry access or package edits.
const targets = ["@next/eslint-plugin-next", "eslint-config-next", "fast-glob", "micromatch", "braces", "prisma", "@prisma/config", "deepmerge-ts"];
if (!existsSync(".next/standalone/server.js")) throw new Error("Build the local standalone artifact first.");
const skippedSymlinks = new Set();
function walk(directory, visit) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) skippedSymlinks.add(path);
    else if (entry.isDirectory()) walk(path, visit);
    else if (entry.isFile()) visit(path);
  }
}
const matchedPackageManifests = [];
let packageManifestsScanned = 0;
walk(".next/standalone", path => {
  if (basename(path) !== "package.json") return;
  packageManifestsScanned++;
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  if (targets.includes(manifest.name)) matchedPackageManifests.push({ name: manifest.name, version: manifest.version, path });
});
const matchedTraces = [];
let traceManifestsScanned = 0;
walk(".next", path => {
  if (!path.endsWith(".nft.json") || path.includes("/dev/")) return;
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  traceManifestsScanned++;
  const matches = manifest.files.filter(file => targets.some(name => file.includes(`node_modules/${name}/`)));
  if (matches.length) matchedTraces.push({ path, matches });
});
console.log(JSON.stringify({
  recordedAt: new Date().toISOString(),
  scope: "Local .next/standalone package names and production .nft.json paths; no bundled-code reachability proof",
  packageManifestsScanned, targetPackages: targets, matchedPackageManifests,
  traceManifestsScanned, matchedTraces, skippedSymlinks: [...skippedSymlinks].sort(),
  limitations: [
    "Working tree artifact, not clean-checkout exact-candidate or deployed contents",
    "Named-package/path absence does not establish bundled-code absence",
    "Symbolic links are reported, not followed; inspect them separately",
    "On-host migration tooling and untrusted-input reachability are not assessed",
  ],
}, null, 2));
