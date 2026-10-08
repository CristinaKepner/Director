// 链接 → 本地素材。给「复刻」用的进料口。
//
// 为什么值得单独做一层：抖音/B站上刷到一条「我也想拍成这样」的片子，人没法把它说清楚，
// 但能把链接贴过来。链接进来落成本地 mp4，后面就接上已有的那条路 —— reference.analyze
// 读出景别/机位/光位/运镜，planner 翻成 Action 建场，白模预演，再生成。
// 所以这里只负责「拿到文件」，不碰理解，也不碰建场。
//
// 外部二进制 + 用户给的 URL，几条硬规矩：
//   · 永远 spawn 数组参数，不过 shell；
//   · 只认 http/https，其余（file: / data: / 本地路径）当场拒；
//   · 有总时长上限、体积上限和超时，别让一条 3 小时的直播录像把磁盘塞满。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";

const CANDIDATES = ["/opt/homebrew/bin/yt-dlp", "/usr/local/bin/yt-dlp", "/opt/local/bin/yt-dlp", "/usr/bin/yt-dlp"];
export const YTDLP_NAME = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";

// system=false：只认自己管的那一份（显式路径 / toolsDir）。测试要的是一台「什么都没装」的机器，
// 而开发机上偏偏装了 brew 版的 yt-dlp —— 不给这个开关，这条路就永远测不到。
export function findYtDlp(explicit, toolsDir, { system = true } = {}) {
  const mine = [explicit, toolsDir && path.join(toolsDir, YTDLP_NAME)].filter(Boolean);
  for (const p of mine) if (isExe(p)) return p;
  if (!system) return null;
  for (const p of [process.env.YT_DLP, ...CANDIDATES].filter(Boolean)) if (isExe(p)) return p;
  for (const dir of (process.env.PATH || "").split(path.delimiter)) {
    const p = path.join(dir, YTDLP_NAME);
    if (isExe(p)) return p;
  }
  return null;
}

// ---- 自带下载器 ----
//
// 「贴链接要 yt-dlp（brew install yt-dlp）」是一句把人挡在门外的话。装 Homebrew 本身
// 就是一次几百兆的编译工具链，而这个产品的第一步就是贴一条链接 —— 第一步要人先去装包管理器，
// 等于没有第一步。所以缺了就自己取一份：yt-dlp 官方发的是**独立可执行文件**（自带 Python），
// 放进应用自己的目录、chmod +x 就能用，不进系统、不要管理员、卸载就是删一个文件。
//
// 取回来的是要执行的东西，所以按供应链来对待：
//   · 先拿官方的 SHA2-256SUMS，逐字节校验；对不上当场删掉，不给「大概是对的」留余地
//   · 镜像只有在校验通过时才算数；拿不到官方校验和，就只认 github.com 本尊
//   · 永远落在临时文件里校验完再改名，半截的下载不会被当成可执行文件留下
const YTDLP_REPO = "https://github.com/yt-dlp/yt-dlp/releases/latest/download";
// github.com 在一部分网络里连不上，所以留几个公开的只读镜像。它们只负责搬运字节，
// 是不是官方那一份由校验和说了算（见上）。
const MIRRORS = ["https://ghfast.top/", "https://gh-proxy.com/", "https://ghproxy.net/"];

function ytdlpAsset() {
  if (process.platform === "darwin") return "yt-dlp_macos"; // universal2：Intel 和 Apple Silicon 同一个文件
  if (process.platform === "win32") return "yt-dlp.exe";
  if (process.arch === "arm64") return "yt-dlp_linux_aarch64";
  if (process.arch === "arm") return "yt-dlp_linux_armv7l";
  return "yt-dlp_linux";
}

async function getBuffer(url, { timeoutMs = 120_000 } = {}) {
  const r = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(timeoutMs), headers: { "user-agent": "director-console" } });
  if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { code: `HTTP_${r.status}` });
  return Buffer.from(await r.arrayBuffer());
}

// 官方校验和清单：一行「<sha256>  <文件名>」
async function officialDigest(asset, log) {
  try {
    const txt = (await getBuffer(`${YTDLP_REPO}/SHA2-256SUMS`, { timeoutMs: 30_000 })).toString("utf8");
    const line = txt.split("\n").find((l) => l.trim().endsWith(` ${asset}`) || l.trim().endsWith(`  ${asset}`));
    const hex = line?.trim().split(/\s+/)[0];
    return /^[0-9a-f]{64}$/i.test(hex || "") ? hex.toLowerCase() : null;
  } catch (err) {
    log(`yt-dlp: 拿不到官方校验和（${err.message}）—— 这次只认 github.com 本尊`);
    return null;
  }
}

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

/**
 * 装一份自用的 yt-dlp 到 dir。已经有了就直接返回。
 * @param opts { dir, log, onProgress, url }  url：自己指定下载地址（内网镜像用），跳过镜像列表
 * @returns { ok, bin, version, source } | { ok:false, error, hint }
 */
export async function installYtDlp(opts = {}) {
  const dir = opts.dir;
  const log = opts.log || (() => {});
  const onProgress = opts.onProgress || (() => {});
  if (!dir) return { ok: false, error: "NO_TOOLS_DIR", hint: "没有可写的工具目录，下载器装不下来" };
  const dest = path.join(dir, YTDLP_NAME);
  if (isExe(dest)) return { ok: true, bin: dest, source: "cached" };

  const asset = ytdlpAsset();
  const explicit = opts.url || process.env.YT_DLP_URL || null;
  const official = `${YTDLP_REPO}/${asset}`;
  onProgress({ percent: 0, note: "准备下载器（第一次贴链接才要，约 37 MB）" });
  const want = explicit ? null : await officialDigest(asset, log);
  // 校验和拿不到就不信镜像：一个装不上的下载器，好过一个来路不明的可执行文件
  const sources = explicit ? [explicit] : want ? [official, ...MIRRORS.map((m) => m + official)] : [official];

  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${YTDLP_NAME}.${process.pid}.part`);
  const fails = [];
  for (const src of sources) {
    try {
      onProgress({ percent: 0, note: "取下载器（约 37 MB，只这一次）" });
      const buf = await getBuffer(src);
      if (buf.length < 1_000_000) throw new Error(`文件太小（${buf.length} 字节），多半是一张错误页`);
      const got = sha256(buf);
      if (want && got !== want) throw new Error(`校验和对不上（${got.slice(0, 12)}≠${want.slice(0, 12)}）`);
      fs.writeFileSync(tmp, buf, { mode: 0o755 });
      fs.chmodSync(tmp, 0o755);
      const version = await run(tmp, ["--version"], { timeoutMs: 120_000 }).then((o) => o.trim().split("\n").pop(), () => null);
      if (!version) throw new Error("下来的文件跑不起来");
      fs.renameSync(tmp, dest);
      log(`yt-dlp ${version} 已装到 ${dest}（来源 ${src.replace(/^https:\/\/([^/]+).*/, "$1")}${want ? "，校验和已核对" : ""}）`);
      return { ok: true, bin: dest, version, source: src, verified: !!want };
    } catch (err) {
      fails.push(`${src.replace(/^https:\/\/([^/]+).*/, "$1")}: ${err.message}`);
      try { fs.rmSync(tmp, { force: true }); } catch {}
    }
  }
  log(`yt-dlp 装不下来：${fails.join(" / ")}`);
  return {
    ok: false,
    error: "YTDLP_INSTALL_FAILED",
    message: fails.join(" / ").slice(0, 400),
    hint: `联网取下载器失败（${fails.length} 个来源都没成）。可以把视频直接拖进来；要修下载：检查网络/代理，或者自己下一个 yt-dlp 放到 ${dest}`,
  };
}

function isExe(p) {
  try {
    fs.accessSync(p, fs.constants.X_OK);
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

// http/https 才放行。yt-dlp 也认本地路径和一堆协议，但那些不是这个入口该干的事。
export function safeUrl(raw) {
  let u;
  try {
    u = new URL(String(raw || "").trim());
  } catch {
    return { ok: false, error: "BAD_URL", hint: "这不是一个链接。把视频页的地址整条贴进来。" };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return { ok: false, error: "BAD_PROTOCOL", hint: "只支持 http / https 链接。" };
  return { ok: true, url: u.toString(), host: u.hostname };
}

const PCT = /\[download\]\s+([\d.]+)%/;
const DEST = /\[(?:download|Merger|ExtractAudio|VideoConvertor)\]\s+(?:Destination:|Merging formats into)\s+"?(.+?)"?\s*$/;

function run(bin, args, { onLine, timeoutMs = 15 * 60 * 1000, cwd } = {}) {
  return new Promise((resolve, reject) => {
    const c = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"], cwd });
    let err = "", out = "", buf = "", killed = false;
    const timer = setTimeout(() => { killed = true; try { c.kill("SIGKILL"); } catch {} }, timeoutMs);
    c.stdout.on("data", (b) => {
      out += b;
      buf += b;
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (line && onLine) onLine(line);
      }
    });
    c.stderr.on("data", (b) => (err += b));
    c.on("error", (e) => { clearTimeout(timer); reject(e); });
    c.on("exit", (code) => {
      clearTimeout(timer);
      if (killed) return reject(Object.assign(new Error("下载超时"), { code: "FETCH_TIMEOUT" }));
      if (code !== 0) return reject(Object.assign(new Error(err.trim().split("\n").slice(-4).join(" ").slice(0, 400) || `yt-dlp exit ${code}`), { code: "FETCH_FAILED" }));
      resolve(out);
    });
  });
}

// yt-dlp 的报错对普通人没有意义，翻成「下一步该干什么」
function explain(msg) {
  const s = String(msg || "");
  if (/Unsupported URL|is not a valid URL/i.test(s)) return "这个站点不认识，或者链接不是视频页。试试作品的分享链接。";
  if (/Private video|members-only|Login|cookies|account/i.test(s)) return "这条需要登录才能看。换一条公开的，或者先把视频下到本地再拖进来。";
  if (/geo|region|country/i.test(s)) return "这条在当前网络区域看不了。";
  if (/HTTP Error 4\d\d|not available|removed|deleted/i.test(s)) return "链接失效了，或者作品已经删除。";
  if (/Unable to download|Connection|timed out|Temporary failure|resolve host/i.test(s)) return "连不上。检查网络或代理，再试一次。";
  if (/ffmpeg/i.test(s)) return "合流需要 ffmpeg：brew install ffmpeg。";
  return null;
}

/**
 * @param opts { ytdlp, mediaDir, mediaUrl, log, maxSeconds = 600, maxBytes = 600MB }
 */
export function createFetcher(opts = {}) {
  const toolsDir = opts.toolsDir || null;
  let bin = findYtDlp(opts.ytdlp, toolsDir, { system: opts.system !== false });
  const mediaDir = opts.mediaDir;
  const mediaUrl = opts.mediaUrl || ((n) => `/media/${n}`);
  const log = opts.log || (() => {});
  const maxSeconds = opts.maxSeconds ?? 600;
  const maxBytes = opts.maxBytes ?? 600 * 1024 * 1024;
  // yt-dlp 合流和转码都要 ffmpeg，而它是在 PATH 里找的。打包后的 app 继承的是 launchd 的
  // PATH（/usr/bin:/bin:/usr/sbin:/sbin），没有 /opt/homebrew/bin —— 于是装了 ffmpeg 的机器
  // 也会报「合流需要 ffmpeg」。宿主本来就知道 ffmpeg 在哪（成片拼接用的是同一个），直接告诉它。
  const ffmpeg = opts.ffmpeg || null;
  const COMMON = ["--no-playlist", "--no-warnings", "--no-progress", "--socket-timeout", "20", "--retries", "3",
    ...(ffmpeg ? ["--ffmpeg-location", ffmpeg] : [])];

  function pick(stem) {
    const hits = fs.readdirSync(mediaDir).filter((f) => f.startsWith(stem + "."));
    if (!hits.length) return null;
    // 合流后可能同时留着分轨；挑最大的那个
    return hits.map((f) => ({ f, size: fs.statSync(path.join(mediaDir, f)).size })).sort((a, b) => b.size - a.size)[0];
  }

  // 装下载器这件事同一时刻只做一次：两条链接一起贴进来，不该下两份二进制
  let installing = null;
  async function ensure(onProgress) {
    if (bin) return { ok: true, bin };
    if (!installing) {
      installing = installYtDlp({ dir: toolsDir, log, onProgress, url: opts.ytdlpUrl })
        .then((r) => { if (r.ok) bin = r.bin; installing = null; return r; }, (err) => { installing = null; throw err; });
    }
    return installing;
  }

  // 直链就不必动下载器：地址本身指着一个视频文件（或者服务器说自己回的是 video/*），
  // 那就是一次普通的 HTTP 下载。抖音/B站那种要解析页面的才需要 yt-dlp。
  const MEDIA_EXT = /\.(mp4|mov|m4v|webm|mkv|avi)(\?|#|$)/i;
  async function directHead(url) {
    if (MEDIA_EXT.test(url)) return { direct: true, type: null };
    try {
      const r = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(15_000), headers: { "user-agent": "director-console" } });
      const type = r.headers.get("content-type") || "";
      return { direct: r.ok && /^video\//i.test(type), type, bytes: Number(r.headers.get("content-length")) || null };
    } catch {
      return { direct: false, type: null };
    }
  }

  async function directDownload(u, onProgress) {
    const r = await fetch(u.url, { redirect: "follow", signal: AbortSignal.timeout(opts.timeoutMs ?? 15 * 60 * 1000), headers: { "user-agent": "director-console" } });
    if (!r.ok) return { ok: false, error: "FETCH_FAILED", message: `HTTP ${r.status}`, hint: explain(`HTTP Error ${r.status}`) };
    const total = Number(r.headers.get("content-length")) || 0;
    if (total && total > maxBytes) return { ok: false, error: "TOO_BIG", hint: `这条有 ${(total / 1e6).toFixed(0)} MB，超过 ${(maxBytes / 1e6).toFixed(0)} MB 的上限。先在本地剪一段再拖进来。` };
    const ext = (new URL(u.url).pathname.match(/\.(mp4|mov|m4v|webm|mkv|avi)$/i)?.[1] || "mp4").toLowerCase();
    const name = `ref_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const file = path.join(mediaDir, name);
    const out = fs.createWriteStream(file);
    let got = 0;
    try {
      for await (const chunk of r.body) {
        got += chunk.length;
        if (got > maxBytes) throw Object.assign(new Error("超过体积上限"), { code: "TOO_BIG" });
        if (!out.write(chunk)) await new Promise((res) => out.once("drain", res));
        if (total) onProgress({ percent: Math.min(99, Math.round((got / total) * 100)), note: "下载中" });
      }
      await new Promise((res, rej) => out.end((e) => (e ? rej(e) : res())));
    } catch (err) {
      out.destroy();
      try { fs.rmSync(file, { force: true }); } catch {}
      return { ok: false, error: err.code || "FETCH_FAILED", message: String(err.message || err).slice(0, 300), hint: err.code === "TOO_BIG" ? `超过 ${(maxBytes / 1e6).toFixed(0)} MB 的上限` : explain(err.message) };
    }
    log(`fetch: ${u.host} → ${name} (${(got / 1e6).toFixed(1)} MB, 直链)`);
    onProgress({ percent: 100, note: null });
    return { ok: true, url: mediaUrl(name), file, name, bytes: got, site: u.host, source: u.url, direct: true };
  }

  return {
    name: "yt-dlp",
    // 缺下载器不再是「做不了」：直链根本不需要它，页面链接会现装一份。
    // 真装不上时由那一次调用说清楚为什么 —— 好过在界面上先挂一句「去装 brew」。
    ready: !!mediaDir,
    get bin() { return bin; },
    hasBin: !!bin,
    toolsDir,
    ffmpeg,
    ensure,

    /** 先看看这是什么：标题、时长、封面。不下载，几秒就回。 */
    async probe(rawUrl, onProgress = () => {}) {
      const u = safeUrl(rawUrl);
      if (!u.ok) return u;
      // 直链：文件名就是能说的全部，不必为了一个标题去装下载器
      const head = await directHead(u.url);
      if (head.direct) return { ok: true, url: u.url, site: u.host, direct: true, title: decodeURIComponent(path.basename(new URL(u.url).pathname)) || u.host, uploader: null, duration: null, thumbnail: null, tooLong: null };
      const ready = await ensure(onProgress);
      if (!ready.ok) return ready;
      try {
        const out = await run(bin, [...COMMON, "-J", u.url], { timeoutMs: 90_000 });
        const j = JSON.parse(out);
        return {
          ok: true,
          url: u.url,
          direct: false,
          site: j.extractor_key || u.host,
          title: j.title || j.id || u.host,
          uploader: j.uploader || j.channel || null,
          duration: Number(j.duration) || null,
          thumbnail: j.thumbnail || null,
          tooLong: Number(j.duration) > maxSeconds ? maxSeconds : null,
        };
      } catch (err) {
        return { ok: false, error: err.code || "PROBE_FAILED", message: String(err.message || err).slice(0, 400), hint: explain(err.message) };
      }
    },

    /**
     * 下到 mediaDir，回一个 /media/ 地址。
     * @param task { url, from, to, onProgress }
     */
    async download(task = {}) {
      if (!mediaDir) return { ok: false, error: "NO_MEDIA_DIR" };
      const u = safeUrl(task.url);
      if (!u.ok) return u;
      const onProgress = task.onProgress || (() => {});
      fs.mkdirSync(mediaDir, { recursive: true });

      // 直链一条普通的 HTTP 下载就够，不动下载器，也不需要 ffmpeg
      if ((task.direct ?? (await directHead(u.url)).direct)) return directDownload(u, onProgress);
      const ready = await ensure(onProgress);
      if (!ready.ok) return ready;

      const stem = `ref_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      // 合流、转码、按秒截段，这三件事都要 ffmpeg。没有 ffmpeg 就退一步：
      // 挑一个已经合好轨的单文件下下来。清晰度可能差一档，但「贴链接能出东西」比清晰度重要，
      // 而且参照是拿来读机位和运镜的 —— 差一档不影响读。
      const args = ffmpeg
        ? [...COMMON,
           "-f", "bv*+ba/b",
           "--merge-output-format", "mp4",
           // 参照素材只用来读画面，音轨用不上；统一成 h264/yuv420p，后面 v2v 和抽帧都能直接吃
           "--postprocessor-args", "ffmpeg:-c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p -an -movflags +faststart",
           "--recode-video", "mp4"]
        : [...COMMON, "-f", "b[ext=mp4]/b[ext=mov]/b"];
      args.push(
        "--max-filesize", String(maxBytes),
        "--newline",
        "-P", mediaDir,
        "-o", `${stem}.%(ext)s`,
      );
      // 只要其中一段：省带宽也省后面抽帧的时间。切段是 ffmpeg 干的，没有就整条下下来
      const from = Number(task.from), to = Number(task.to);
      if (ffmpeg && Number.isFinite(from) && Number.isFinite(to) && to > from) {
        args.push("--download-sections", `*${from.toFixed(2)}-${to.toFixed(2)}`, "--force-keyframes-at-cuts");
      }
      args.push(u.url);

      let dest = null;
      try {
        await run(bin, args, {
          timeoutMs: opts.timeoutMs ?? 15 * 60 * 1000,
          onLine: (line) => {
            const p = line.match(PCT);
            if (p) return onProgress({ percent: Math.min(99, Number(p[1])), note: "下载中" });
            const d = line.match(DEST);
            if (d) dest = d[1];
            if (/\[Merger\]|\[VideoConvertor\]|Recoding/i.test(line)) onProgress({ percent: 99, note: "转码" });
          },
        });
      } catch (err) {
        const hint = explain(err.message) || (!ffmpeg ? "这个站点的视频是分轨的，合起来要 ffmpeg（brew install ffmpeg）。也可以把视频直接拖进来。" : null);
        return { ok: false, error: err.code || "FETCH_FAILED", message: String(err.message || err).slice(0, 400), hint };
      }

      const got = pick(stem) || (dest && fs.existsSync(dest) ? { f: path.basename(dest), size: fs.statSync(dest).size } : null);
      if (!got) return { ok: false, error: "NO_OUTPUT", hint: "下完了但没找到文件，可能被体积上限拦下了" };
      // 顺手清掉合流剩下的分轨
      for (const f of fs.readdirSync(mediaDir)) if (f.startsWith(stem + ".") && f !== got.f) { try { fs.unlinkSync(path.join(mediaDir, f)); } catch {} }
      log(`fetch: ${u.host} → ${got.f} (${(got.size / 1e6).toFixed(1)} MB)`);
      onProgress({ percent: 100, note: null });
      return { ok: true, url: mediaUrl(got.f), file: path.join(mediaDir, got.f), name: got.f, bytes: got.size, site: u.host, source: u.url };
    },
  };
}
