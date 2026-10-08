#!/usr/bin/env node
// 把 ffmpeg 收进安装包。打包时跑一次，用户那边一次网络请求都不用。
//
// 为什么非要自带。这个产品的第一步是贴一条链接，而那一步的第二段就要抽帧给视觉模型读 ——
// 抽帧要 ffmpeg。一台刚装好的 Mac 上没有 ffmpeg，于是第一步永远走不完，界面上只有一句
// 「读参照要网关密钥和 ffmpeg」。让创作者先去装 Homebrew（一套几百兆的编译工具链）再回来，
// 等于没有第一步。成片导出、v2v 转码也是同一个依赖，所以一次解决。
//
// 和 yt-dlp 那条路不同的是：ffmpeg 在**打包时**取，不在用户机器上取。
//   · 用户不必联网，不必信任任何镜像 —— 二进制在开发者手里验过一次，随包一起发
//   · 版本锁死（PIN），换版本要显式改这里，不会某天上游一动就换了一个 ffmpeg
//   · 第一次取下来把 sha256 写进 lock 文件，之后每次重取都按它核对
//
// 用法：node tools/fetch-ffmpeg.mjs [--arch arm64|x64|both] [--out desktop/build/bin] [--force]
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };

// 锁死的版本。ffmpeg-static 的发布页对每个平台都给一个静态构建（自带全部依赖，
// 不像 Homebrew 那份链着一堆 /opt/homebrew/lib 里的 dylib，拷出来就跑不了）。
const PIN = "b6.1.1";
const BASE = `https://github.com/eugeneware/ffmpeg-static/releases/download/${PIN}`;
const ARCHES = { arm64: "ffmpeg-darwin-arm64", x64: "ffmpeg-darwin-x64" };

const out = path.resolve(root, arg("--out", "desktop/build/bin"));
const lockFile = path.join(out, "ffmpeg.lock.json");
const wanted = arg("--arch", "both") === "both" ? Object.keys(ARCHES) : [arg("--arch")];
const force = args.includes("--force");

const lock = (() => { try { return JSON.parse(fs.readFileSync(lockFile, "utf8")); } catch { return { pin: PIN, sha256: {} }; } })();
if (lock.pin !== PIN) { lock.pin = PIN; lock.sha256 = {}; } // 换版本 = 换校验和

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

async function grab(arch) {
  const dir = path.join(out, arch);
  const dest = path.join(dir, "ffmpeg");
  if (!force && fs.existsSync(dest) && fs.statSync(dest).size > 1e6) {
    const have = sha256(fs.readFileSync(dest));
    if (!lock.sha256[arch] || lock.sha256[arch] === have) {
      lock.sha256[arch] = have;
      console.log(`ffmpeg ${arch}: 已在 ${path.relative(root, dest)}（${(fs.statSync(dest).size / 1e6).toFixed(0)} MB）`);
      return;
    }
    console.log(`ffmpeg ${arch}: 本地那份和 lock 对不上，重新取`);
  }
  const url = `${BASE}/${ARCHES[arch]}`;
  process.stdout.write(`ffmpeg ${arch}: 取 ${url} … `);
  const r = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(600_000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 1e6) throw new Error(`只有 ${buf.length} 字节，多半是一张错误页`);
  const got = sha256(buf);
  if (lock.sha256[arch] && lock.sha256[arch] !== got) throw new Error(`校验和和 lock 对不上：${got} ≠ ${lock.sha256[arch]}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(dest, buf, { mode: 0o755 });
  fs.chmodSync(dest, 0o755);
  lock.sha256[arch] = got;
  console.log(`${(buf.length / 1e6).toFixed(0)} MB, sha256 ${got.slice(0, 12)}…`);

  // Apple Silicon 上没有签名的二进制根本起不来，所以补一个 ad-hoc 签名；
  // 同时把下载留下的隔离属性去掉，免得用户那边弹「无法打开，开发者无法验证」。
  if (process.platform === "darwin") {
    spawnSync("xattr", ["-dr", "com.apple.quarantine", dest], { stdio: "ignore" });
    const sign = spawnSync("codesign", ["--force", "--sign", "-", dest], { encoding: "utf8" });
    if (sign.status !== 0) console.warn(`  codesign 没成（${(sign.stderr || "").trim().slice(0, 120)}）—— 在 Apple Silicon 上可能起不来`);
  }

  // 只有和本机同架构的那一份能当场验；另一份交给那台机器
  if (arch === process.arch) {
    const v = spawnSync(dest, ["-version"], { encoding: "utf8", timeout: 30_000 });
    if (v.status !== 0) throw new Error(`下来的 ffmpeg 跑不起来：${(v.stderr || v.error?.message || "").slice(0, 200)}`);
    console.log(`  ${v.stdout.split("\n")[0]}`);
  }
}

for (const a of wanted) {
  if (!ARCHES[a]) throw new Error(`不认识的架构 ${a}；只有 ${Object.keys(ARCHES).join(" / ")}`);
  await grab(a);
}
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(lockFile, JSON.stringify(lock, null, 2) + "\n");
console.log(`lock → ${path.relative(root, lockFile)}`);
