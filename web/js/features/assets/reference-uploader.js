import { store } from "../../../../core/store.js";
import { sendReference } from "./reference-transfer.js";
import { escapeHTML as esc } from "../creation/creation-markup.js";
export function mountReferenceUploader(state) {
  const slot = state.root.querySelector("[data-upload-slot]");
  if (!slot) return;
  if (state.uploads?.project !== state.project) resetUploads(state);
  if (!state.uploads) state.uploads = createUploads(state.project);
  slot.append(state.uploads.element);
}
function resetUploads(state) {
  state.uploads?.items.forEach((item) => item.controller?.abort());
  state.uploads = null;
}
function createUploads(project) {
  const element = document.createElement("div");
  element.className = "reference-uploader";
  element.innerHTML = uploaderMarkup;
  const queue = { element, project, items: [], running: false };
  bindUpload(queue);
  return queue;
}
const uploaderMarkup = `<label class="reference-drop"><span>＋ 上传参考图片 / 视频</span><small>拖到这里，或点击选择多个文件 · 图片 20 MB / 视频 200 MB</small><input type="file" data-reference-batch multiple accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime,video/webm"></label><p class="reference-hosting">导入到当前工程后，可加入节点或用于复刻。视频生视频会在提交前检查公网可读性；本地导入成功不代表模型已可读取。</p><div class="reference-upload-list" aria-live="polite"></div>`;
function bindUpload(queue) {
  const input = queue.element.querySelector("input");
  input.onchange = () => selectFiles(queue, input);
  queue.element.ondragover = (e) => dragOver(queue, e);
  queue.element.ondragleave = () => queue.element.classList.remove("dragging");
  queue.element.ondrop = (e) => dropFiles(queue, e);
  queue.element.onclick = (e) => queueAction(queue, e);
}
function selectFiles(queue, input) {
  enqueue(queue, input.files);
  input.value = "";
}
function dragOver(queue, event) {
  event.preventDefault();
  queue.element.classList.add("dragging");
}
function dropFiles(queue, event) {
  event.preventDefault();
  queue.element.classList.remove("dragging");
  enqueue(queue, event.dataTransfer.files);
}
function enqueue(queue, files) {
  queue.items.push(...Array.from(files, queuedFile));
  renderQueue(queue);
  void drain(queue);
}
function queuedFile(file) {
  return { file, id: crypto.randomUUID(), status: "waiting", progress: 0 };
}
async function drain(queue) {
  if (queue.running || queue.project !== store.get().project.id) return;
  queue.running = true;
  try {
    for (const item of queue.items)
      if (item.status === "waiting") await transfer(queue, item);
  } finally {
    queue.running = false;
  }
}
async function transfer(queue, item) {
  if (queue.project !== store.get().project.id) return;
  item.status = "uploading";
  item.controller = new AbortController();
  await uploadItem(queue, item).catch((err) => transferError(item, err));
  renderQueue(queue);
}
function transferError(item, err) {
  item.status = item.controller.signal.aborted ? "cancelled" : "failed";
  item.error = err.message;
}
async function uploadItem(queue, item) {
  const options = { signal: item.controller.signal, requestId: item.id };
  options.onProgress = (n) => updateProgress(queue, item, n);
  renderQueue(queue);
  await sendReference(item.file, options);
  item.status = "done";
  item.progress = 1;
  item.file = { name: item.file.name };
}
function updateProgress(queue, item, n) {
  item.progress = n;
  renderQueue(queue);
}
function queueAction(queue, event) {
  const button = event.target.closest("[data-upload-action]");
  if (!button) return;
  const item = queue.items.find((x) => x.id === button.dataset.uploadId);
  if (!item) return;
  changeItem(item, button.dataset.uploadAction);
  renderQueue(queue);
  void drain(queue);
}
function changeItem(item, action) {
  item.error = "";
  if (action === "retry") item.status = "waiting";
  else {
    item.status = "cancelled";
    item.controller?.abort();
  }
}
function renderQueue(queue) {
  queue.element.querySelector(".reference-upload-list").innerHTML = queue.items
    .map(uploadRow)
    .join("");
}
function uploadRow(item) {
  const text = item.error || labels[item.status];
  const percent =
    item.status === "uploading" ? `${Math.floor(item.progress * 100)}%` : "";
  return `<div class="reference-upload-row"><b>${esc(item.file.name)}</b><span>${esc(text)} ${percent}</span>${queueButton(item)}<progress max="1" value="${item.progress}" aria-label="${esc(item.file.name)} 上传进度"></progress></div>`;
}
function queueButton(item) {
  if (item.status === "done") return "";
  const active = ["waiting", "uploading"].includes(item.status);
  const action = active ? "cancel" : "retry";
  return `<button type="button" data-upload-id="${item.id}" data-upload-action="${action}">${active ? "取消" : "重试"}</button>`;
}
const labels = {
  waiting: "等待上传",
  uploading: "上传 / 校验中",
  done: "已导入 · 待批准参考",
  failed: "上传失败",
  cancelled: "已取消",
};
