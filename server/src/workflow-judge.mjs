import fs from "node:fs";
import path from "node:path";
export function createWorkflowJudge(options) {
  if (!options.judge?.condition) return null;
  return async (node, input, signal) =>
    options.judge.condition(judgeTask(node, input, signal, options));
}
function judgeTask(node, input, signal, options) {
  const images = inputImages(input, options.mediaDir);
  return {
    condition: node.params.condition,
    goal: options.goal(),
    context: input.text,
    images,
    signal,
  };
}
function imageData(url, mediaDir) {
  const name = mediaName(url);
  const bytes = fs.readFileSync(path.join(mediaDir, name));
  if (bytes.length > 20 * 1024 * 1024) throw new Error("判断图片超过 20 MB");
  return `data:${mimeOf(name)};base64,${bytes.toString("base64")}`;
}
function mediaName(url) {
  if (!url.startsWith("/media/"))
    throw new Error("语义检查请先将图片导入工程；不自动读取外部地址");
  const name = decodeURIComponent(url.slice(7));
  if (path.basename(name) !== name || !name.match(/\.(png|jpe?g|webp)$/i))
    throw new Error("图片地址无效");
  return name;
}
function mimeOf(name) {
  if (/\.png$/i.test(name)) return "image/png";
  return /\.webp$/i.test(name) ? "image/webp" : "image/jpeg";
}

function inputImages(input, mediaDir) {
  return input.media
    .filter((m) => m.kind === "image")
    .map((m) => imageData(m.url, mediaDir));
}
