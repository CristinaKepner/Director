#!/usr/bin/env node
// 从 electron-builder 的产物生成更新 feed（latest-mac.json）。
//
//   node tools/make-update-manifest.mjs --dist desktop/dist \
//        --base https://your-host/releases/0.6.0 \
//        --notes "成片流水线；偏好设置里能填密钥" \
//        [--min-version 0.4.0] [--out desktop/dist/latest-mac.json]
//
// 把 dist 里的 dmg 和这个 latest-mac.json 一起传到 --base 指向的地方就完成了一次发布：
// 已经装在别人电脑上的客户端，下次启动（或 6 小时内）会自己发现新版本。
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const args = process.argv.slice(2);
const arg = (k, d = null) => { const i = args.indexOf(k); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d; };

const DIST = path.resolve(arg("--dist", "desktop/dist"));
const BASE = (arg("--base") || "").replace(/\/$/, "");
const NOTES = arg("--notes", "");
const MIN = arg("--min-version", null);
const PKG = JSON.parse(fs.readFileSync(path.resolve(arg("--package", "desktop/package.json")), "utf8"));
const OUT = path.resolve(arg("--out", path.join(DIST, "latest-mac.json")));

if (!BASE) {
  console.error("需要 --base <安装包将要放的 URL 前缀>，例如 https://your-host/releases/0.6.0");
  process.exit(1);
}
if (!fs.existsSync(DIST)) {
  console.error(`找不到产物目录 ${DIST}；先跑 cd desktop && npm run dist`);
  process.exit(1);
}

const sha256 = (file) => {
  const h = crypto.createHash("sha256");
  h.update(fs.readFileSync(file));
  return h.digest("hex");
};

// electron-builder 的 mac 产物命名里带 arch；universal 包没有 arch 后缀
const files = fs.readdirSync(DIST).filter((f) => f.endsWith(".dmg") || f.endsWith(".zip"));
const mac = {};
for (const f of files) {
  const arch = /arm64/.test(f) ? "arm64" : /x64|intel/.test(f) ? "x64" : "universal";
  // 同一 arch 下 dmg 优先（用户双击即可安装）
  if (mac[arch] && !f.endsWith(".dmg")) continue;
  const abs = path.join(DIST, f);
  mac[arch] = { url: `${BASE}/${encodeURIComponent(f)}`, sha256: sha256(abs), size: fs.statSync(abs).size, file: f };
}
if (!Object.keys(mac).length) {
  console.error(`${DIST} 里没有 .dmg / .zip`);
  process.exit(1);
}

const manifest = { version: PKG.version, pubDate: new Date().toISOString(), notes: NOTES, ...(MIN ? { minVersion: MIN } : {}), mac };
fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2));

console.log(`${OUT}\n`);
console.log(JSON.stringify(manifest, null, 2));
console.log(`\n发布：把下面这些一起放到 ${BASE}/`);
for (const [arch, a] of Object.entries(mac)) console.log(`  ${arch.padEnd(9)} ${a.file}  (${(a.size / 1e6).toFixed(0)} MB)`);
console.log(`  manifest  ${path.basename(OUT)}`);
console.log(`\n客户端读的更新源地址是 ${BASE}/${path.basename(OUT)} —— 确认它和 app 里配置的一致（偏好设置 → 更新）。`);
