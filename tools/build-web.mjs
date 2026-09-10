#!/usr/bin/env node
// Assemble a self-contained static frontend in dist/: web/ + core/ keep their relative layout, so nothing is
// rewritten. Serve dist/ from any static host and point the page at the backend (meta director-api / ?api=).
//   node tools/build-web.mjs [--out dist] [--api https://api.example.com/api/]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const arg = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : d;
};
const out = path.resolve(arg("--out", path.join(root, "dist")));
const api = arg("--api", null);

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const copy = (rel) => fs.cpSync(path.join(root, rel), path.join(out, rel), { recursive: true, filter: (src) => !/\.(log|tmp)$/.test(src) });
copy("web");
copy("core");
fs.writeFileSync(path.join(out, "index.html"), `<!doctype html><meta http-equiv="refresh" content="0; url=./web/">`);
if (api) {
  const idx = path.join(out, "web", "index.html");
  fs.writeFileSync(idx, fs.readFileSync(idx, "utf8").replace("<head>", `<head>\n    <meta name="director-api" content="${api}" />`));
}
const size = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((a, e) => a + (e.isDirectory() ? size(path.join(dir, e.name)) : fs.statSync(path.join(dir, e.name)).size), 0);
console.log(`dist → ${out} (${(size(out) / 1024 / 1024).toFixed(1)} MB)${api ? `, API pinned to ${api}` : ", API = ../api/ relative to the page"}`);
