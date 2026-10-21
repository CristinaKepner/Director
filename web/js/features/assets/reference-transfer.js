import { client } from "../../client.js";
import { store } from "../../../../core/store.js";
const types = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
];
export function sendReference(file, options = {}) {
  validateReferenceFile(file);
  const projectId = store.get().project.id;
  const params = uploadParams(file, projectId, options.requestId);
  return transmit(file, params, projectId, options);
}
function transmit(file, params, projectId, options) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    configure(xhr, file, params, options);
    settle(xhr, options.signal, projectId, resolve, reject);
    xhr.send(file);
  });
}
export function validateReferenceFile(file) {
  if (!client.base) throw new Error("请先连接后端，再上传素材");
  if (!types.includes(file.type))
    throw new Error("支持 PNG、JPEG、WebP、MP4、MOV、WebM");
  const max = file.type.startsWith("image/") ? 20 : 200;
  if (!file.size || file.size > max * 1024 * 1024)
    throw new Error(`文件为空或超过 ${max} MB`);
}
function configure(xhr, file, params, options) {
  xhr.open("POST", new URL(`reference-media?${params}`, client.base));
  xhr.setRequestHeader("content-type", file.type);
  xhr.responseType = "json";
  xhr.timeout = 180000;
  xhr.upload.onprogress = (e) =>
    options.onProgress?.(e.lengthComputable ? e.loaded / e.total : 0);
}
function settle(xhr, signal, project, resolve, reject) {
  const abort = () => xhr.abort();
  signal?.throwIfAborted();
  signal?.addEventListener("abort", abort, { once: true });
  xhr.onloadend = () => signal?.removeEventListener("abort", abort);
  xhr.onload = () => complete(xhr, project, resolve, reject);
  xhr.onerror = () => reject(new Error("上传连接中断，请检查后端后重试"));
  xhr.ontimeout = () => reject(new Error("上传超时，请重试"));
  xhr.onabort = () => reject(new Error("已取消；已导入工程的素材会保留"));
}
function complete(xhr, project, resolve, reject) {
  if (store.get().project.id !== project)
    return reject(new Error("工程已切换，请重新选择素材"));
  const body = xhr.response;
  if (!body?.ok)
    return reject(
      new Error(body?.message || body?.error || `上传失败（${xhr.status}）`),
    );
  resolve({ ...body.asset, assetId: body.asset.id });
}
export function referenceSource(url) {
  if (!url || !/^(\/media\/|https?:\/\/)/.test(url)) return "";
  return new URL(url, client.base || location.href).href;
}

function uploadParams(file, projectId, id = crypto.randomUUID()) {
  return new URLSearchParams({ projectId, name: file.name, requestId: id });
}
