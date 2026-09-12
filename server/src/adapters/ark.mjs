// Generation Adapter for Volcengine Ark (Doubao Seedance video / Seedream image).
// Implements the core hook contract: { name, submit(job, update) }. Providers it does not map fall through to
// `fallback` (the core's simulated queue) so the UI keeps working for the other vendors.
//   images:  POST {base}/images/generations                 → data[0].url (sync)
//   videos:  POST {base}/contents/generations/tasks         → {id}; GET …/tasks/{id} until succeeded|failed
// Results are downloaded into mediaDir (signed TOS links expire) and exposed as /media/<file>.
import fs from "node:fs";
import path from "node:path";

export const ARK_DEFAULTS = {
  baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
  models: {
    "seedance-2.5": "doubao-seedance-2-5-260628",
    "seedance-2": "doubao-seedance-2-0-260128",
    "seedream-5": "doubao-seedream-5-0-260128",
  },
  // Seedream 5.0 requires ≥ 3,686,400 output pixels; sizes per project aspect
  imageSizes: { "16:9": "2560x1440", "9:16": "1440x2560", "1:1": "2048x2048", "4:3": "2240x1680", "3:4": "1680x2240", "2.39:1": "2976x1248", "21:9": "2976x1280" },
  resolution: "720p",
  // 实测的单条时长边界（2026-09，逐秒探测得到）：2.5 是 4–30 s，2.0 是 4–12 s。
  // 比这更短的镜头按下界出，再由成片拼接按镜头真实时长裁回；更长的镜头必须分段续拍（见 shot.chain）。
  videoSeconds: {
    "doubao-seedance-2-5-260628": { min: 4, max: 30 },
    "doubao-seedance-2-0-260128": { min: 4, max: 12 },
  },
  videoSecondsDefault: { min: 4, max: 12 },
  pollMs: 5000,
  maxWaitMs: 15 * 60 * 1000,
};

export function createArkAdapter(opts = {}) {
  const apiKey = opts.apiKey;
  if (!apiKey) throw new Error("ark adapter needs apiKey");
  const base = (opts.baseUrl || ARK_DEFAULTS.baseUrl).replace(/\/$/, "");
  const models = { ...ARK_DEFAULTS.models, ...(opts.models || {}) };
  const mediaDir = opts.mediaDir || null;
  const mediaUrl = opts.mediaUrl || ((name) => `/media/${name}`);
  const resolveLocal = opts.resolveLocal || (() => null); // "/media/x.webm" → absolute path (for v2v / i2v inputs)
  // resolved per call: with --tunnel the public address only exists after the server is up
  const publicUrl = () => String((typeof opts.publicUrl === "function" ? opts.publicUrl() : opts.publicUrl) || "").replace(/\/$/, "");
  const publisher = opts.publisher || null; // fallback: publish local media to user-owned infrastructure (see publish.mjs)
  const log = opts.log || (() => {});
  const fallback = opts.fallback || null;
  const getJob = opts.getJob || (() => null);
  const pollMs = opts.pollMs || ARK_DEFAULTS.pollMs;
  const headers = { authorization: `Bearer ${apiKey}`, "content-type": "application/json" };

  async function call(pathname, body, method = body ? "POST" : "GET") {
    const res = await fetch(`${base}${pathname}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
    if (!res.ok) throw Object.assign(new Error(json.error?.message || `HTTP ${res.status}`), { code: json.error?.code || `HTTP_${res.status}` });
    return json;
  }

  async function download(url, name) {
    if (!mediaDir) return { url, remoteUrl: url };
    const res = await fetch(url);
    if (!res.ok) return { url, remoteUrl: url, note: `download failed HTTP ${res.status}` };
    fs.mkdirSync(mediaDir, { recursive: true });
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(path.join(mediaDir, name), buf);
    return { url: mediaUrl(name), remoteUrl: url, bytes: buf.length };
  }

  // local media (take proxies / storyboard keyframes) → something Ark can read: data URLs
  function toDataUrl(ref, mime) {
    if (!ref) return null;
    if (ref.startsWith("data:")) return ref;
    const abs = resolveLocal(ref);
    if (!abs || !fs.existsSync(abs)) return null;
    const ext = path.extname(abs).toLowerCase();
    const m = mime || { ".webm": "video/webm", ".mp4": "video/mp4", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" }[ext] || "application/octet-stream";
    return `data:${m};base64,${fs.readFileSync(abs).toString("base64")}`;
  }

  const cancelled = (id) => {
    const j = getJob(id);
    return !j || j.status === "cancelled";
  };

  // approved reference assets → data URLs + a prompt suffix naming them (the model sees which image is which)
  function references(job) {
    const refs = (job.inputs?.references || []).map((r) => ({ ...r, data: toDataUrl(r.url, "image/jpeg") })).filter((r) => r.data);
    // 说清楚每张图管什么：一堆没有说明的参考图，模型只会平均一下
    const suffix = refs.length
      ? ` Reference images: ${refs.map((r, i) => `[${i + 1}] ${r.name}${r.roleSay ? ` — ${r.roleSay}` : r.look ? ` — ${r.look}` : ""}`).join("; ")}. Match every referenced attribute exactly; do not blend them together.`
      : "";
    return { refs, suffix };
  }

  async function submitImage(job, update, model) {
    const size = ARK_DEFAULTS.imageSizes[job.aspect] || ARK_DEFAULTS.imageSizes["16:9"];
    const { refs, suffix } = references(job);
    const body = { model, prompt: job.prompt + suffix, size, response_format: "url", watermark: false };
    if (job.mode === "i2i" && job.inputs?.image) body.image = toDataUrl(job.inputs.image, "image/png") || job.inputs.image;
    if (refs.length) body.image = [...(body.image ? [body.image] : []), ...refs.map((r) => r.data)].slice(0, 5); // Seedream multi-reference
    if (job.kind === "reference") body.size = { "3:4": "1728x2304", "1:1": "2048x2048", "16:9": "2560x1440" }[job.aspect] || size;
    update(job.id, { status: "running", progress: 15, result: null, adapter: { name: "ark", model, size: body.size, references: refs.length } });
    const out = await call("/images/generations", body);
    const url = out.data?.[0]?.url;
    if (!url) throw new Error("no image url in response");
    update(job.id, { progress: 85 });
    const saved = await download(url, `${job.id}.jpg`);
    update(job.id, { status: "done", progress: 100, result: { assetId: out.data[0].id || job.id, kind: "image", ...saved, size, model, usage: out.usage } });
  }

  async function submitVideo(job, update, model) {
    // Seedance rejects durations outside 4–12 s — a 3 s cut is legitimate in the edit, so clamp here and
    // let the assembler trim the clip back to the shot's real length rather than failing the job.
    const wanted = Math.round(job.seconds || 5);
    const bounds = ARK_DEFAULTS.videoSeconds[model] || ARK_DEFAULTS.videoSecondsDefault;
    const seconds = Math.max(bounds.min, Math.min(bounds.max, wanted));
    if (wanted > bounds.max) log(`ark: ${job.id} 要 ${wanted}s，但 ${model} 单条最长 ${bounds.max}s —— 这一条只会出 ${bounds.max}s，长镜头请用分段续拍`);
    const ratio = /^\d+:\d+$/.test(job.aspect) ? job.aspect : "16:9";
    const { refs, suffix } = references(job);
    // Ark refuses first/last-frame content mixed with reference images: when approved references exist,
    // identity wins and the storyboard keyframe is skipped (the shot's composition still comes from the prompt).
    const hasImage = job.mode === "i2v" && !!job.inputs?.image && !refs.length;
    // Ark: with a first frame the output ratio follows the image (passing --ratio is rejected)
    const content = [{ type: "text", text: `${job.prompt}${suffix}${hasImage ? "" : ` --ratio ${ratio}`} --duration ${seconds} --resolution ${job.resolution || ARK_DEFAULTS.resolution}` }];
    if (hasImage) content.push({ type: "image_url", image_url: { url: toDataUrl(job.inputs.image, "image/png") || job.inputs.image }, role: "first_frame" });
    for (const r of refs) content.push({ type: "image_url", image_url: { url: r.data }, role: "reference_image" });
    if (job.mode === "v2v") {
      // Ark only accepts a web URL for reference_video (no data URLs): local take proxies need a public base URL
      const ref = job.inputs?.video;
      if (!ref) throw Object.assign(new Error("no circled take video for this shot"), { code: "NO_REFERENCE_VIDEO" });
      const m = String(ref).match(/\/media\/([^/?#]+)/);
      let url = null;
      const pub = publicUrl();
      if (m && pub) url = `${pub}/media/${m[1]}`;
      else if (!m && /^https?:\/\//.test(ref) && !/^https?:\/\/(127\.0\.0\.1|localhost)/.test(ref)) url = ref;
      else if (m && publisher?.enabled) {
        const abs = resolveLocal(ref);
        if (!abs || !fs.existsSync(abs)) throw Object.assign(new Error("reference video file missing on the backend"), { code: "NO_REFERENCE_VIDEO" });
        update(job.id, { progress: 3, adapter: { name: "ark", model, publishing: publisher.kind } });
        url = (await publisher.publish(abs)).url;
      }
      if (!url) throw Object.assign(new Error("v2v needs a web-reachable reference video: start the backend with --public-url https://<host>, or --publish feishu --feishu-token-file FILE (uploads the take to your own Feishu Drive and uses its temporary download link)"), { code: "NO_PUBLIC_MEDIA_URL" });
      content.push({ type: "video_url", video_url: { url }, role: "reference_video" });
    }
    update(job.id, { status: "running", progress: 5, result: null, adapter: { name: "ark", model, seconds, ratio, requested: wanted, references: refs.length, referenceMode: refs.length ? "identity (first frame skipped)" : hasImage ? "first frame" : "text" } });
    const created = await call("/contents/generations/tasks", { model, content });
    const taskId = created.id;
    log(`ark task ${taskId} ← ${job.id} (${model}, ${seconds}s ${ratio})`);
    update(job.id, { progress: 10, adapter: { name: "ark", model, taskId, seconds, ratio } });
    const t0 = Date.now();
    const expected = 60_000 + seconds * 20_000; // rough: Seedance 2.x ≈ 1–4 min for 5–8 s
    while (Date.now() - t0 < (opts.maxWaitMs || ARK_DEFAULTS.maxWaitMs)) {
      await new Promise((r) => setTimeout(r, pollMs));
      if (cancelled(job.id)) {
        call(`/contents/generations/tasks/${taskId}`, null, "DELETE").catch(() => {});
        return;
      }
      const t = await call(`/contents/generations/tasks/${taskId}`);
      if (t.status === "succeeded") {
        update(job.id, { progress: 90 });
        const saved = await download(t.content.video_url, `${job.id}.mp4`);
        update(job.id, { status: "done", progress: 100, result: { assetId: taskId, kind: "video", ...saved, model, seed: t.seed, resolution: t.resolution, ratio: t.ratio, duration: t.duration, fps: t.framespersecond, usage: t.usage } });
        return;
      }
      if (t.status === "failed" || t.status === "cancelled" || t.status === "expired") {
        throw Object.assign(new Error(t.error?.message || t.status), { code: t.error?.code || t.status.toUpperCase() });
      }
      update(job.id, { status: "running", progress: Math.min(85, 10 + Math.round(((Date.now() - t0) / expected) * 75)) });
    }
    throw Object.assign(new Error("timed out waiting for Ark"), { code: "TIMEOUT" });
  }

  return {
    name: "ark",
    models,
    supports: (provider) => !!models[provider],
    submit(job, update) {
      const model = models[job.provider];
      if (!model) {
        if (fallback) return fallback.submit(job, update);
        return update(job.id, { status: "failed", error: `no Ark model for provider ${job.provider}` });
      }
      const run = job.mode.endsWith("2i") ? submitImage : submitVideo;
      run(job, update, model).catch((err) => {
        log(`ark ${job.id} failed: ${err.code || ""} ${err.message}`);
        if (!cancelled(job.id)) update(job.id, { status: "failed", error: `${err.code ? err.code + ": " : ""}${err.message}` });
      });
    },
  };
}
