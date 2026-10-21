import fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execute = promisify(execFile);
export const referenceTypes = {
  "image/png": [".png", 20],
  "image/jpeg": [".jpg", 20],
  "image/webp": [".webp", 20],
  "video/mp4": [".mp4", 200],
  "video/quicktime": [".mov", 200],
  "video/webm": [".webm", 200],
};
export function referenceType(mime) {
  const type = referenceTypes[mime];
  if (!type)
    throw new Error("请选择 PNG、JPEG、WebP 图片或 MP4、MOV、WebM 视频");
  return { ext: type[0], limit: type[1] * 1024 * 1024 };
}
const previewArgs = [
  "-map",
  "0:v:0",
  "-frames:v",
  "1",
  "-vf",
  "scale=320:320:force_original_aspect_ratio=decrease",
  "-y",
];
export async function inspectReference(bin, file, poster, mime, signal) {
  if (!bin)
    throw new Error("缺少内置 FFmpeg，无法校验参考素材，请重新安装应用");
  checkSignature(file, mime);
  const args = previewCommand(file, poster);
  const options = { timeout: 30000, signal };
  const out = await execute(bin, args, options).catch(decodeFailure);
  return parseMetadata(out.stderr, mime);
}
function decodeFailure(err) {
  if (err.name === "AbortError") throw err;
  throw new Error("无法解码参考素材，请导出标准图片或 H.264 MP4 后重试");
}
function checkSignature(file, mime) {
  const fd = fs.openSync(file, "r"),
    bytes = Buffer.alloc(16);
  try {
    fs.readSync(fd, bytes, 0, 16, 0);
  } finally {
    fs.closeSync(fd);
  }
  if (!matches(bytes, mime)) throw new Error("文件内容与所选媒体格式不符");
}
const signatures = {
  "image/png": (b) =>
    b.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")),
  "image/jpeg": (b) => b[0] === 255 && b[1] === 216 && b[2] === 255,
  "image/webp": (b) =>
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP",
  "video/webm": (b) => b.readUInt32BE(0) === 0x1a45dfa3,
};
function matches(b, mime) {
  if (signatures[mime]) return signatures[mime](b);
  return ["ftyp", "moov", "mdat", "wide"].includes(b.toString("ascii", 4, 8));
}
function parseMetadata(text, mime) {
  const line = text.split("\n").find((s) => /Stream.*Video:/.test(s)) || "";
  const size = line.match(/\b([1-9]\d{0,4})x([1-9]\d{0,4})\b/);
  if (!size) throw new Error("无法读取参考素材尺寸");
  const seconds = duration(text);
  if (mime.startsWith("video/") && !seconds)
    throw new Error("无法读取视频时长");
  return { width: Number(size[1]), height: Number(size[2]), seconds };
}
function duration(text) {
  const m = text.match(/Duration:\s*(\d+):(\d\d):(\d\d(?:\.\d+)?)/);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
}

function previewCommand(file, poster) {
  const source = [
    "-hide_banner",
    "-protocol_whitelist",
    "file,pipe",
    "-i",
    file,
  ];
  return [...source, ...previewArgs, poster];
}
