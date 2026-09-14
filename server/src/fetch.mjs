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
import { spawn } from "node:child_process";

const CANDIDATES = ["/opt/homebrew/bin/yt-dlp", "/usr/local/bin/yt-dlp", "/opt/local/bin/yt-dlp", "/usr/bin/yt-dlp"];

export function findYtDlp(explicit) {
  const tries = [explicit, process.env.YT_DLP, ...CANDIDATES].filter(Boolean);
  for (const p of tries) if (isExe(p)) return p;
  for (const dir of (process.env.PATH || "").split(path.delimiter)) {
    const p = path.join(dir, "yt-dlp");
    if (isExe(p)) return p;
  }
  return null;
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
  const bin = findYtDlp(opts.ytdlp);
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

  return {
    name: "yt-dlp",
    ready: !!bin && !!mediaDir,
    bin,
    ffmpeg,

    /** 先看看这是什么：标题、时长、封面。不下载，几秒就回。 */
    async probe(rawUrl) {
      if (!bin) return { ok: false, error: "YTDLP_NOT_FOUND", hint: "装一个 yt-dlp（brew install yt-dlp）就能贴链接了" };
      const u = safeUrl(rawUrl);
      if (!u.ok) return u;
      try {
        const out = await run(bin, [...COMMON, "-J", u.url], { timeoutMs: 90_000 });
        const j = JSON.parse(out);
        return {
          ok: true,
          url: u.url,
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
      if (!bin) return { ok: false, error: "YTDLP_NOT_FOUND", hint: "装一个 yt-dlp（brew install yt-dlp）就能贴链接了" };
      if (!mediaDir) return { ok: false, error: "NO_MEDIA_DIR" };
      const u = safeUrl(task.url);
      if (!u.ok) return u;
      const onProgress = task.onProgress || (() => {});
      fs.mkdirSync(mediaDir, { recursive: true });

      const stem = `ref_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      const args = [
        ...COMMON,
        "-f", "bv*+ba/b",
        "--merge-output-format", "mp4",
        // 参照素材只用来读画面，音轨用不上；统一成 h264/yuv420p，后面 v2v 和抽帧都能直接吃
        "--postprocessor-args", "ffmpeg:-c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p -an -movflags +faststart",
        "--recode-video", "mp4",
        "--max-filesize", String(maxBytes),
        "--newline",
        "-P", mediaDir,
        "-o", `${stem}.%(ext)s`,
      ];
      // 只要其中一段：省带宽也省后面抽帧的时间
      const from = Number(task.from), to = Number(task.to);
      if (Number.isFinite(from) && Number.isFinite(to) && to > from) {
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
        return { ok: false, error: err.code || "FETCH_FAILED", message: String(err.message || err).slice(0, 400), hint: explain(err.message) };
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
