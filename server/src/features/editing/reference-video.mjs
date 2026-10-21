import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execute = promisify(execFile);

export async function normalizeReferenceVideo(deps, ref, span, limits) {
  if (!deps.bin)
    throw new Error("参考视频需要先转为 30 fps MP4，但 ffmpeg 不可用");
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "director-reference-"));
  try {
    return await normalizeInWorkspace(deps, ref, span, limits, work);
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}
async function normalizeInWorkspace(deps, ref, span, limits, work) {
  const src = await deps.localize({ url: ref }, work, 0);
  if (!src) throw new Error("找不到参考视频文件");
  const cut = referenceSpan(span);
  if (limits) validateReference(await inspectVideo(deps.bin, src), cut, limits);
  return prepareFile(deps, src, cut, limits);
}
async function prepareFile(deps, src, cut, limits) {
  fs.mkdirSync(deps.mediaDir, { recursive: true });
  const name = await cacheName(src, cut, limits);
  const file = path.join(deps.mediaDir, name);
  if (!fs.existsSync(file)) await transcode(deps, src, cut, limits, file);
  checkSize(file);
  return deps.mediaUrl(name);
}
function referenceSpan(span) {
  if (!span) return null;
  const from = Number(span.from),
    to = Number(span.to);
  if (![from, to].every(Number.isFinite) || from < 0 || to <= from)
    throw new Error("参考视频的截取范围无效");
  return { from, to };
}
async function inspectVideo(bin, file) {
  try {
    await execute(bin, ["-hide_banner", "-i", file], { timeout: 15000 });
  } catch (err) {
    return parseProbeError(err);
  }
  throw new Error("参考视频缺少媒体信息");
}
function parseProbeError(err) {
  if (err.killed || !/Video:/.test(err.stderr))
    throw new Error("无法读取参考视频信息");
  return { ratio: videoAspect(err.stderr), seconds: videoSeconds(err.stderr) };
}
const aspectHint =
  "参考视频画幅需在 2:5 至 5:2 之间，请调整素材；不会自动拉伸或裁掉画面";
function videoAspect(text) {
  const line = text.split("\n").find((s) => /Video:/.test(s)) || "";
  const size = line.match(/\b(\d{2,5})x(\d{2,5})\b/);
  const dar = line.match(/DAR (\d+):(\d+)/);
  const pair = dar || size;
  return Number(pair?.[1]) / Number(pair?.[2]);
}
function videoSeconds(text) {
  const match = text.match(/Duration:\s*(\d+):(\d\d):(\d\d(?:\.\d+)?)/);
  if (!match) return 0;
  const [hours, minutes, seconds] = match.slice(1).map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}
function validateReference(meta, cut, limits) {
  const duration = cut
    ? Math.min(cut.to, meta.seconds) - cut.from
    : meta.seconds;
  validateDuration(duration, limits);
  if (!Number.isFinite(meta.ratio) || meta.ratio < 0.4 || meta.ratio > 2.5) {
    throw new Error(aspectHint);
  }
}
function validateDuration(seconds, limits) {
  if (seconds >= limits.minSeconds && seconds <= limits.maxSeconds) return;
  const range = `${limits.minSeconds}–${limits.maxSeconds}`;
  throw new Error(
    `参考视频需为 ${range} 秒；当前片段约 ${seconds.toFixed(2)} 秒，请调整截取范围`,
  );
}
async function cacheName(src, cut, limits) {
  const hash = createHash("sha256").update(
    JSON.stringify(["reference-cfr30-v2", cut, limits || null]),
  );
  for await (const chunk of fs.createReadStream(src)) hash.update(chunk);
  return `reference_${hash.digest("hex").slice(0, 24)}_30fps.mp4`;
}
function filters(limits) {
  if (!limits) return "fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2";
  return "fps=30,scale=w='if(gte(dar,1),trunc(720*dar/2)*2,720)':h='if(gte(dar,1),720,trunc(720/dar/2)*2)',setsar=1";
}
const encoding = [
  "-r",
  "30",
  "-fps_mode",
  "cfr",
  "-c:v",
  "libx264",
  "-preset",
  "veryfast",
  "-crf",
  "23",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
];
function transcodeArgs(src, cut, limits, dest) {
  const seek = cut ? ["-ss", String(cut.from)] : [];
  const trim = cut ? ["-t", String(cut.to - cut.from)] : [];
  const video = ["-map", "0:v:0", "-an", "-vf", filters(limits)];
  return ["-y", ...seek, "-i", src, ...trim, ...video, ...encoding, dest];
}
async function transcode(deps, src, cut, limits, file) {
  const partial = path.join(deps.mediaDir, `.reference-${randomUUID()}.mp4`);
  try {
    await deps.run(deps.bin, transcodeArgs(src, cut, limits, partial));
    checkSize(partial);
    fs.renameSync(partial, file);
  } finally {
    fs.rmSync(partial, { force: true });
  }
}
function checkSize(file) {
  const size = fs.statSync(file).size;
  if (!size || size > 200 * 1024 * 1024)
    throw new Error("参考视频文件为空或超过 200 MB，请缩短片段后重试");
}
