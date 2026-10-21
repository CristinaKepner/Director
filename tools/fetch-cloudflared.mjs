#!/usr/bin/env node
// Official release asset digests (GitHub API), pinned for reproducible desktop builds.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const version = "2026.10.2";
const pins = {
  arm64: [
    "arm64",
    "529a07089ac2d46762578389230fa148e5cb6ce2689200fc006956864042d17a",
  ],
  x64: [
    "amd64",
    "b64efd5a2772fc124b855f60eb3d33ba1a4f2ba67b19ddc58d32b705d42b82c9",
  ],
};
function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
function cachedArchive(arch, cache) {
  return (
    fs.existsSync(cache) && digest(fs.readFileSync(cache)) === pins[arch][1]
  );
}
async function archive(arch, cache) {
  if (cachedArchive(arch, cache)) return;
  const url = `https://github.com/cloudflare/cloudflared/releases/download/${version}/cloudflared-darwin-${pins[arch][0]}.tgz`;
  const response = await fetch(url, { signal: AbortSignal.timeout(180000) });
  if (!response.ok)
    throw new Error(`cloudflared download HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  verifyArchive(bytes, arch);
  fs.writeFileSync(cache, bytes);
}
function verifyArchive(bytes, arch) {
  if (digest(bytes) !== pins[arch][1])
    throw new Error("cloudflared release SHA-256 mismatch");
}
function verifyExecutable(target, arch) {
  if (process.platform !== "darwin") return;
  execFileSync("codesign", ["--force", "--sign", "-", target]);
  if (process.arch === arch)
    execFileSync(target, ["--version"], { timeout: 10000 });
}
function install(arch, cache, work) {
  execFileSync("tar", ["-xzf", cache, "-C", work, "cloudflared"]);
  const target = path.join(root, "desktop/build/bin", arch, "cloudflared");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(work, "cloudflared"), target);
  fs.chmodSync(target, 0o755);
  verifyExecutable(target, arch);
  console.log(`cloudflared ${version} ${arch}: verified and bundled`);
}
const cacheDir = path.join(root, "tmp/v2v-release");
fs.mkdirSync(cacheDir, { recursive: true });
async function bundle(arch) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "director-cloudflared-"));
  const cache = path.join(cacheDir, `cloudflared-${arch}.tgz`);
  try {
    await archive(arch, cache);
    install(arch, cache, work);
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}
for (const arch of Object.keys(pins)) await bundle(arch);
