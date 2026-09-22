// Film assembler — cuts the shot list into one continuous film with ffmpeg.
// Implements the core hook contract: { name, ready, assemble(edit, update) }.
//   edit   { id, out, width, height, fps, clips: [{ shotId, index, title, seconds, source, path }] }
//   update (patch) → progress back into the job record
// Every clip is first normalised (scale + pad to the project frame, constant fps, no audio, yuv420p) so a
// MediaRecorder webm proxy and a 720p Seedance mp4 can sit in the same timeline, then concat-demuxed.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const CANDIDATES = ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/usr/bin/ffmpeg"];

export function findFfmpeg(explicit) {
  const tries = [explicit, process.env.FFMPEG, ...CANDIDATES].filter(Boolean);
  for (const p of tries) if (isExe(p)) return p;
  // last resort: PATH
  for (const dir of (process.env.PATH || "").split(path.delimiter)) {
    const p = path.join(dir, "ffmpeg");
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

function probeDuration(ffprobe, file) {
  return new Promise((resolve) => {
    const c = spawn(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file], { stdio: ["ignore", "pipe", "ignore"] });
    let o = "";
    c.stdout.on("data", (b) => (o += b));
    c.on("exit", () => resolve(Number(o.trim()) || 0));
    c.on("error", () => resolve(0));
  });
}

function run(bin, args, { onLine } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let tail = "";
    const tap = (buf) => {
      const s = buf.toString();
      tail = (tail + s).slice(-4000);
      if (onLine) for (const line of s.split(/[\r\n]+/)) if (line.trim()) onLine(line.trim());
    };
    child.stdout.on("data", tap);
    child.stderr.on("data", tap);
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve(tail) : reject(Object.assign(new Error(`ffmpeg exit ${code}\n${tail.slice(-800)}`), { code: "FFMPEG_FAILED" }))));
  });
}

// "00:00:04.52" in ffmpeg's progress line → seconds
function parseTime(line) {
  const m = line.match(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : null;
}

/**
 * @param opts { ffmpeg?, mediaDir, mediaUrl(name)→url, log? }
 */
export function createFilmAssembler(opts = {}) {
  const bin = findFfmpeg(opts.ffmpeg);
  const mediaDir = path.resolve(opts.mediaDir || "data/media");
  const mediaUrl = opts.mediaUrl || ((name) => `/media/${name}`);
  const log = opts.log || (() => {});

  // a clip arrives as the runtime knows it — "/media/take_x.webm" (browser proxy or downloaded generation
  // result) or an absolute path. Remote URLs are fetched once into the work dir.
  async function localize(clip, work, i) {
    if (clip.path && fs.existsSync(clip.path)) return clip.path;
    const ref = clip.url || clip.path || "";
    if (!ref) return null;
    const m = String(ref).match(/\/media\/([^/?#]+)/);
    if (m) {
      const p = path.join(mediaDir, path.basename(decodeURIComponent(m[1])));
      if (fs.existsSync(p)) return p;
    }
    if (path.isAbsolute(ref) && fs.existsSync(ref)) return ref;
    if (/^https?:/.test(ref)) {
      const res = await fetch(ref);
      if (!res.ok) return null;
      const ext = path.extname(new URL(ref).pathname) || ".mp4";
      const dl = path.join(work, `src_${i}${ext}`);
      fs.writeFileSync(dl, Buffer.from(await res.arrayBuffer()));
      return dl;
    }
    return null;
  }

  return {
    name: "ffmpeg",
    ready: !!bin,
    bin,

    // 参考素材要读的是"这段里发生了什么"，所以按时间均匀取若干帧交给多模态模型。
    // 图片直接读原文件；视频按 from–to 区间取样，并把每帧的时间戳一起给出去 ——
    // 没有时间戳，模型分不清这是推近还是横移。
    async frames(ref, { count = 6, from = 0, to = null, width = 768 } = {}) {
      if (!bin) return [];
      const work = fs.mkdtempSync(path.join(os.tmpdir(), "director-frames-"));
      try {
        const file = await localize({ url: ref }, work, 0);
        if (!file) return [];
        const asData = (p2) => `data:image/jpeg;base64,${fs.readFileSync(p2).toString("base64")}`;
        if (/\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(file)) {
          const out = path.join(work, "still.jpg");
          await run(bin, ["-y", "-i", file, "-vf", `scale=${width}:-2`, "-frames:v", "1", out]);
          return [{ t: 0, data: asData(out) }];
        }
        const dur = await probeDuration(path.join(path.dirname(bin), "ffprobe"), file);
        const a = Math.max(0, Number(from) || 0);
        const b = Math.min(to == null ? dur : Number(to), dur || Number(to) || 0) || dur;
        const span = Math.max(0.01, b - a);
        // "auto"：整条片子按时长取帧，每 2.5 秒一帧，6 到 24 之间。读一个镜头 6 帧够了，
        // 读一整条要分场景，帧太少的话一整场可能一帧都没落到。
        const n = count === "auto" ? Math.max(6, Math.min(24, Math.ceil(span / 2.5))) : Math.max(1, Math.min(24, Number(count) || 6));
        const out = [];
        for (let i = 0; i < n; i++) {
          const t = a + (span * (i + 0.5)) / n; // 取每段的中点，避开首尾的黑场与压缩伪影
          const jpg = path.join(work, `f_${i}.jpg`);
          try {
            await run(bin, ["-y", "-ss", String(t), "-i", file, "-frames:v", "1", "-vf", `scale=${width}:-2`, "-q:v", "3", jpg]);
            out.push({ t: Math.round(t * 100) / 100, data: asData(jpg) });
          } catch (err) {
            log(`frames: ${path.basename(file)} @${t.toFixed(2)}s 抽帧失败 ${err.message}`);
          }
        }
        return out;
      } finally {
        fs.rmSync(work, { recursive: true, force: true });
      }
    },

    // 实测：Ark 的 reference_video 不收 WebM（任务能创建，抓取时才 Bad Request）。
    // 白模 Take 是 MediaRecorder 出的 webm，所以交给供应商之前要先转成 mp4。
    // 转完留在媒体目录里，同一段只转一次。
    async toMp4(ref) {
      const m = String(ref || "").match(/\/media\/([^/?#]+)/);
      const name = m ? path.basename(decodeURIComponent(m[1])) : path.basename(String(ref || ""));
      if (!name) return null;
      if (/\.mp4$/i.test(name)) return `/media/${name}`;
      if (!bin) return null;
      const src = path.join(mediaDir, name);
      if (!fs.existsSync(src)) return null;
      const outName = `${name.replace(/\.[^.]+$/, "")}_mp4.mp4`;
      const out = path.join(mediaDir, outName);
      if (fs.existsSync(out) && fs.statSync(out).size > 0) return mediaUrl(outName);
      try {
        await run(bin, ["-y", "-i", src, "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]);
        log(`ref → mp4: ${name} → ${outName}`);
        return mediaUrl(outName);
      } catch (err) {
        log(`toMp4 failed: ${err.message}`);
        return null;
      }
    },

    // 分段续拍要用上一段的最后一帧当下一段的首帧。取倒数第二帧而不是最后一帧：
    // 很多编码器的末帧会有压缩伪影，拿它当首帧会把瑕疵带进下一段。
    async lastFrame(ref, { beforeEnd = 0.08 } = {}) {
      if (!bin) return null;
      const work = fs.mkdtempSync(path.join(os.tmpdir(), "director-tail-"));
      try {
        const file = await localize({ url: ref }, work, 0);
        if (!file) return null;
        const dur = await probeDuration(path.join(path.dirname(bin), "ffprobe"), file);
        const at = Math.max(0, dur - beforeEnd);
        const jpg = path.join(work, "tail.jpg");
        await run(bin, ["-y", "-ss", String(at), "-i", file, "-frames:v", "1", "-q:v", "2", jpg]);
        return `data:image/jpeg;base64,${fs.readFileSync(jpg).toString("base64")}`;
      } catch (err) {
        log(`lastFrame failed: ${err.message}`);
        return null;
      } finally {
        fs.rmSync(work, { recursive: true, force: true });
      }
    },

    /**
     * @param edit   { id, width, height, fps, clips:[{shotId,index,title,seconds,source,path}], slate? }
     * @param update (patch) → progress/status back to the caller
     * @returns      { ok, url, file, bytes, seconds }
     */
    async assemble(edit, update = () => {}) {
      if (!bin) return { ok: false, error: "FFMPEG_NOT_FOUND", hint: "装一个 ffmpeg（brew install ffmpeg）或用 --ffmpeg 指定路径" };
      const W = even(edit.width || 1920);
      const H = even(edit.height || 1080);
      const fps = edit.fps || 24;
      const work = fs.mkdtempSync(path.join(os.tmpdir(), "director-film-"));

      try {
        const resolved = [];
        for (const [i, c] of (edit.clips || []).entries()) {
          const p = await localize(c, work, i);
          if (p) resolved.push({ ...c, path: p });
          else log(`film: clip ${c.shotId || i} 找不到素材 ${c.url || c.path || "(空)"}`);
        }
        const clips = resolved;
        if (!clips.length) return { ok: false, error: "NO_CLIPS", hint: "素材文件不在后端的 media 目录里" };
        const total = clips.reduce((n, c) => n + (c.seconds || 0), 0) || 1;
        let done = 0;
        const parts = [];
        for (const [i, c] of clips.entries()) {
          const out = path.join(work, `part_${String(i).padStart(3, "0")}.mp4`);
          const vf = [
            `scale=${W}:${H}:force_original_aspect_ratio=decrease`,
            `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black`,
            `fps=${fps}`,
            "format=yuv420p",
          ].join(",");
          const args = ["-y", "-i", c.path];
          if (c.seconds > 0) args.push("-t", String(c.seconds));
          args.push("-vf", vf, "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-movflags", "+faststart", out);
          update({ status: "running", progress: Math.round((done / total) * 90), note: `规范化 ${c.index != null ? String(c.index).padStart(2, "0") : i + 1} ${c.title || c.shotId}` });
          await run(bin, args, {
            onLine: (line) => {
              const t = parseTime(line);
              if (t != null) update({ status: "running", progress: Math.round(((done + Math.min(t, c.seconds || t)) / total) * 90) });
            },
          });
          done += c.seconds || 0;
          parts.push(out);
        }

        const listFile = path.join(work, "list.txt");
        fs.writeFileSync(listFile, parts.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n"));
        const name = `${edit.id || "film"}.mp4`;
        fs.mkdirSync(mediaDir, { recursive: true });
        const file = path.join(mediaDir, name);
        update({ status: "running", progress: 92, note: "拼接" });
        await run(bin, ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", "-movflags", "+faststart", file]);

        const bytes = fs.statSync(file).size;
        log(`film assembled: ${name} ${clips.length} clips ${total.toFixed(1)}s ${(bytes / 1e6).toFixed(1)} MB`);
        update({ status: "done", progress: 100, note: null });
        return { ok: true, url: mediaUrl(name), file, bytes, seconds: total, clips: clips.length };
      } catch (err) {
        log(`film assemble failed: ${err.message}`);
        update({ status: "failed", error: err.message });
        return { ok: false, error: err.code || "ASSEMBLE_FAILED", message: err.message };
      } finally {
        fs.rmSync(work, { recursive: true, force: true });
      }
    },
  };
}

const even = (n) => Math.max(2, Math.round(n / 2) * 2);
