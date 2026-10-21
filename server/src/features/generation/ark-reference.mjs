import fs from "node:fs";
import net from "node:net";

function fail(code, message) {
  return Object.assign(new Error(message), { code });
}
function assertActive(active) {
  if (!active()) throw fail("REFERENCE_CANCELLED", "任务已取消，未提交生成");
}
const addressHint = "参考视频需要不含登录凭据的公网域名地址";
const invalidMediaHint =
  "公网地址返回的不是 MP4 视频（可能是登录页或错误页），未提交生成";
function publicAddress(value) {
  const u = new URL(value);
  const host = u.hostname.replace(/^\[|\]$/g, "");
  const http = ["http:", "https:"].includes(u.protocol);
  if (!http || !isPublicHost(host) || u.username || u.password) {
    throw fail("REFERENCE_MEDIA_UNREACHABLE", addressHint);
  }
  return u.href;
}
function isPublicHost(host) {
  return (
    !net.isIP(host) &&
    host.includes(".") &&
    !/\.(localhost|local|internal)$/.test(host)
  );
}
async function readPrefix(response) {
  const reader = response.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  try {
    return await collectPrefix(reader);
  } finally {
    await reader.cancel();
  }
}
async function collectPrefix(reader) {
  let bytes = Buffer.alloc(0);
  while (bytes.length < 32) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes = Buffer.concat([bytes, Buffer.from(value).subarray(0, 64)]);
  }
  return bytes;
}
function checkMedia(response, bytes) {
  checkStatus(response.status);
  const type = response.headers.get("content-type") || "";
  const isMp4 = bytes.subarray(4, 8).toString() === "ftyp";
  if (/html|json|text\//i.test(type) || !isMp4) {
    throw fail("REFERENCE_MEDIA_INVALID", invalidMediaHint);
  }
}
function checkStatus(status) {
  if ([200, 206].includes(status)) return;
  const hint = "未提交生成。请在偏好设置保存以重连，或配置可用的公网媒体地址";
  throw fail(
    "REFERENCE_MEDIA_UNREACHABLE",
    `公网参考视频返回 HTTP ${status}，${hint}`,
  );
}
function probeOptions() {
  return {
    headers: { range: "bytes=0-63" },
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  };
}
export async function verifyReferenceUrl(value, redirects = 0) {
  const url = publicAddress(value);
  const response = await fetch(url, probeOptions());
  if ([301, 302, 303, 307, 308].includes(response.status))
    return followRedirect(response, url, redirects);
  checkMedia(response, await readPrefix(response));
  return url;
}
async function followRedirect(response, url, redirects) {
  await response.body?.cancel();
  const target = response.headers.get("location");
  if (!target || redirects >= 3)
    throw fail(
      "REFERENCE_MEDIA_UNREACHABLE",
      "公网媒体地址重定向过多，未提交生成",
    );
  return verifyReferenceUrl(new URL(target, url).href, redirects + 1);
}
function sourceAddress(usable, base) {
  const name = String(usable).match(/^\/media\/([^/?#]+)$/)?.[1];
  if (name && base) return `${base.replace(/\/$/, "")}/media/${name}`;
  if (/^https?:\/\//.test(usable)) return usable;
  return null;
}
async function publishedAddress(usable, opts) {
  const abs = opts.resolveLocal?.(usable);
  if (!abs || !fs.existsSync(abs))
    throw fail("NO_REFERENCE_VIDEO", "找不到转码后的参考视频，未提交生成");
  return (await opts.publisher.publish(abs)).url;
}
async function verifiedDirect(usable, opts) {
  const direct = sourceAddress(usable, opts.publicUrl());
  if (!direct) return null;
  try {
    return await verifyReferenceUrl(direct);
  } catch (err) {
    if (!opts.publisher?.enabled) throw err;
  }
  return null;
}
async function reachableAddress(usable, opts, active) {
  const direct = await verifiedDirect(usable, opts);
  if (direct) return direct;
  assertActive(active);
  if (!opts.publisher?.enabled)
    throw fail("NO_PUBLIC_MEDIA_URL", missingHosting);
  return verifyReferenceUrl(await publishedAddress(usable, opts));
}
const missingHosting =
  "v2v 需要可访问的整段参考视频。请在偏好设置开启公网媒体连接或填写有效媒体地址；Ark key 本身不提供媒体托管";
const missingTranscode =
  "参考视频尚未完成 30 fps MP4 转码，未提交生成；请检查 ffmpeg";
function conversionArgs(job) {
  const span =
    job.inputs.videoFrom === "origin" ? job.inputs.videoSpan || null : null;
  const maxSeconds = job.provider === "seedance-2.5" ? 30 : 15;
  return [job.inputs.video, span, { minSeconds: 2, maxSeconds }];
}
async function normalize(job, opts) {
  if (!job.inputs?.video)
    throw fail(
      "NO_REFERENCE_VIDEO",
      "请先导入参考视频或圈选草片 Take，未提交生成",
    );
  const usable = await opts.toMp4?.(...conversionArgs(job));
  if (!usable) throw fail("REFERENCE_TRANSCODE_FAILED", missingTranscode);
  return usable;
}
export async function prepareArkReference(job, opts, active) {
  assertActive(active);
  const usable = await normalize(job, opts);
  assertActive(active);
  const url = await reachableAddress(usable, opts, active);
  assertActive(active);
  return { type: "video_url", video_url: { url }, role: "reference_video" };
}
const connectionErrors = ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED"];
const connectionHint =
  "无法读取公网参考视频（连接中断或超时），未提交生成。请检查网络或在偏好设置重新连接";
export function referenceFailure(err) {
  if (err.code && !connectionErrors.includes(err.code)) return err;
  return fail("REFERENCE_MEDIA_UNREACHABLE", connectionHint);
}
