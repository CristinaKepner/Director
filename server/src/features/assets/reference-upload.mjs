import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { inspectReference, referenceType } from "./reference-inspect.mjs";
export async function importReference(host, stream, input) {
  checkProject(host, input);
  const type = referenceType(input.mime);
  const old =
    input.requestId &&
    host.store.get().assets.find((a) => a.importId === input.requestId);
  if (!old) return receiveTemporary(host, stream, input, type);
  stream.resume();
  return { ok: true, asset: old, reused: true };
}
async function receiveTemporary(host, stream, input, type) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "director-import-"));
  try {
    return await receive(host, stream, input, type, work);
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}
function checkProject(host, input) {
  input.signal?.throwIfAborted();
  if (!input.projectId || input.projectId !== host.store.get().project.id)
    throw Object.assign(new Error("工程已切换，请在当前工程重新选择素材"), {
      code: 409,
    });
}
async function receive(host, stream, input, type, work) {
  const files = temporaryFiles(work, type.ext);
  const args = [stream, files.file, type.limit, input.signal];
  const bytes = await receiveBytes(...args);
  const bin = host.health().tools.ffmpeg;
  const inspect = [bin, files.file, files.poster, input.mime, input.signal];
  const meta = { ...(await inspectReference(...inspect)), bytes };
  checkProject(host, input);
  return commit(host, input, meta, files);
}
async function receiveBytes(stream, file, max, signal) {
  await pipeline(stream, sizeLimit(max), fs.createWriteStream(file), {
    signal,
  });
  const bytes = fs.statSync(file).size;
  if (!bytes) throw new Error("请选择非空的媒体文件");
  return bytes;
}
function sizeLimit(max) {
  let size = 0;
  return new Transform({
    transform(chunk, _, done) {
      size += chunk.length;
      done(size > max ? tooLarge() : null, chunk);
    },
  });
}
function tooLarge() {
  return Object.assign(
    new Error("素材超过上传大小限制（图片 20 MB / 视频 200 MB）"),
    { code: 413 },
  );
}
function mediaTargets(dir, ext) {
  const prefix = `reference_${randomUUID()}`;
  fs.mkdirSync(dir, { recursive: true });
  return [
    path.join(dir, prefix + ext),
    path.join(dir, prefix + "_preview.png"),
  ];
}
function commit(host, input, meta, files) {
  const targets = mediaTargets(host.mediaDir, files.ext);
  try {
    return install(host, input, meta, files, targets);
  } catch (err) {
    targets.forEach((f) => fs.rmSync(f, { force: true }));
    throw err;
  }
}
function install(host, input, meta, files, targets) {
  fs.copyFileSync(files.file, targets[0], fs.constants.COPYFILE_EXCL);
  fs.copyFileSync(files.poster, targets[1], fs.constants.COPYFILE_EXCL);
  const payload = assetPayload(input, meta, targets);
  const out = host.invoke({ action: "asset.import", payload });
  if (!out.ok) throw new Error(out.error || "素材登记失败");
  if (out.reused) targets.forEach((f) => fs.rmSync(f, { force: true }));
  return out;
}
function assetPayload(input, meta, targets) {
  const { projectId, mime } = input;
  const requestId = input.requestId || randomUUID();
  const urls = {
    url: `/media/${path.basename(targets[0])}`,
    posterUrl: `/media/${path.basename(targets[1])}`,
  };
  const record = { ...meta, ...urls, projectId, mime, requestId };
  return { ...record, label: input.name, mediaKind: mime.split("/")[0] };
}
export async function handleReferenceUpload(host, req, res, url) {
  const controller = new AbortController();
  const input = { ...requestInput(req, url), signal: controller.signal };
  const abort = () => controller.abort();
  res.once("close", abort);
  return importReference(host, req, input).finally(() =>
    res.off("close", abort),
  );
}
function requestInput(req, url) {
  const mime = String(req.headers["content-type"] || "").split(";")[0];
  const type = referenceType(mime);
  if (Number(req.headers["content-length"]) > type.limit) throw tooLarge();
  const names = ["name", "projectId", "requestId"];
  const params = Object.fromEntries(
    names.map((key) => [key, url.searchParams.get(key)]),
  );
  return { mime, ...params };
}

function temporaryFiles(work, ext) {
  return {
    file: path.join(work, `source${ext}`),
    poster: path.join(work, "poster.png"),
    ext,
  };
}
