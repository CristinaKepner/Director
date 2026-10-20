import crypto from "node:crypto";
import { PROVIDERS } from "../../../../core/schema.js";
export function workflowJob(node, input, project, runId) {
  const video = node.type === "video-generate";
  const job = {
    ...jobConfig(node, project, video),
    ...jobContent(node, input, video),
  };
  Object.assign(job, jobIdentity(runId));
  validateJob(job, input.media);
  return job;
}
function jobConfig(node, project, video) {
  const fallback = video ? "seedance-2" : "seedream-5";
  const chosen = video ? project.videoProvider : project.imageProvider;
  return {
    provider: node.params.provider || chosen || fallback,
    aspect: project.aspect || "16:9",
    seconds: Number(node.params.seconds || 5),
  };
}
function jobContent(node, input, video) {
  const prompt = [...input.text, node.params.prompt || node.params.condition]
    .filter(Boolean)
    .join("\n");
  return {
    prompt,
    mode: modeOf(node, input.media),
    inputs: inputsOf(input.media, video),
  };
}
function modeOf(node, media) {
  if (node.type !== "video-generate")
    return node.type === "image-edit" || media.some((m) => m.kind === "image")
      ? "i2i"
      : "t2i";
  if (media.some((m) => m.kind === "video")) return "v2v";
  return media.some((m) => m.kind === "image") ? "i2v" : "t2v";
}
function inputsOf(media, video) {
  const images = media.filter((m) => m.kind === "image");
  const refs = imageReferences(images, media, video);
  return {
    image: images[0]?.url,
    video: media.find((m) => m.kind === "video")?.url,
    references: refs.map((m, i) => ({ url: m.url, name: `参考 ${i + 1}` })),
  };
}
function validateJob(job, media) {
  const p = PROVIDERS[job.provider];
  if (!p?.modes.includes(job.mode))
    throw new Error("该模型不支持节点要求的模式");
  if (job.mode === "i2i" && !job.inputs.image)
    throw new Error("图像编辑需要上游图片");
  validateDuration(job.seconds, p);
  validateMedia(job, media);
}
function validateMedia(job, media) {
  if (job.inputs.references.some((r) => !r.url.startsWith("/media/")))
    throw new Error("多图参考请先导入工程");
  if (media.some((m) => m.kind === "audio"))
    throw new Error("当前工作流适配器尚未接通音频参考，请移除该连线后运行");
  mediaCounts(job, media);
}
export async function submitWorkflowJob(job, ctx) {
  ctx.signal.throwIfAborted();
  if (!ctx.adapter?.supports?.(job.provider)) throw new Error("生成模型未连接");
  const ready = ctx.adapter.modeReady?.(job.mode, job.provider);
  if (ready && !ready.ok) throw new Error(ready.hint || ready.error);
  ctx.store.patch((d) => d.jobs.unshift(job));
  ctx.checkpoint();
  return waitForJob(job, ctx);
}
function waitForJob(job, ctx) {
  const signal = AbortSignal.any([ctx.signal, AbortSignal.timeout(1200000)]);
  return new Promise((resolve, reject) =>
    beginSubmission(job, ctx, signal, resolve, reject),
  );
}
function beginSubmission(job, ctx, signal, resolve, reject) {
  const abort = () => abortJob(job, ctx, reject);
  const settle = (error, result) => {
    signal.removeEventListener("abort", abort);
    error ? reject(error) : resolve(result);
  };
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) return abort();
  submitAdapter(job, ctx, signal, settle);
}
function jobUpdate(job, patch, ctx, signal, settle) {
  if (signal.aborted) return;
  const exists = ctx.store.get().jobs.some((j) => j.id === job.id);
  if (!exists) return settle(new Error("工程已切换"));
  ctx.store.patch((d) => patchJob(d, job.id, patch));
  ctx.checkpoint();
  finishJob(job, patch, settle);
}
function patchJob(data, id, patch) {
  Object.assign(
    data.jobs.find((j) => j.id === id),
    patch,
  );
}
function finishJob(job, patch, settle) {
  if (patch.status === "failed")
    settle(new Error(patch.error || "模型生成失败"));
  if (patch.status === "done")
    settle(null, {
      ...patch.result,
      kind: job.mode.endsWith("2i") ? "image" : "video",
    });
}

function jobIdentity(runId) {
  return {
    id: "wf_" + crypto.randomUUID(),
    workflowRunId: runId,
    status: "queued",
    progress: 0,
  };
}
function validateDuration(seconds, provider) {
  if (
    !Number.isFinite(seconds) ||
    seconds < 1 ||
    seconds > (provider.maxSeconds || 30)
  )
    throw new Error("生成时长超出模型范围");
}
function mediaCounts(job, media) {
  const videos = media.filter((m) => m.kind === "video").length;
  const images = media.filter((m) => m.kind === "image").length;
  if (videos > 1 || images > 5)
    throw new Error("参考媒体数量超出当前工作流适配器限制");
  if (!job.mode.endsWith("2v") && videos)
    throw new Error("图像节点不接受视频参考，请先提取图片");
}

function submitAdapter(job, ctx, signal, settle) {
  try {
    ctx.adapter.submit(job, (_, patch) =>
      jobUpdate(job, patch, ctx, signal, settle),
    );
  } catch (e) {
    settle(e);
  }
}
function abortJob(job, ctx, reject) {
  if (ctx.store.get().jobs.some((j) => j.id === job.id))
    ctx.store.patch((d) => patchJob(d, job.id, { status: "cancelled" }));
  ctx.checkpoint();
  reject(new Error("运行已停止或等待超时；远端任务可能继续计费，不自动重提"));
}

function imageReferences(images, media, video) {
  const multiple = images.length > 1 || media.some((m) => m.kind === "video");
  return video && multiple ? images : images.slice(1);
}
