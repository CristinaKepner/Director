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
  const publicUrl = (opts.publicUrl || "").replace(/\/$/, ""); // e.g. https://console.example.com — Ark must be able to fetch reference videos
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

  async function submitImage(job, update, model) {
    const size = ARK_DEFAULTS.imageSizes[job.aspect] || ARK_DEFAULTS.imageSizes["16:9"];
    const body = { model, prompt: job.prompt, size, response_format: "url", watermark: false };
    if (job.mode === "i2i" && job.inputs?.image) body.image = toDataUrl(job.inputs.image, "image/png") || job.inputs.image;
    update(job.id, { status: "running", progress: 15, result: null, adapter: { name: "ark", model, size } });
    const out = await call("/images/generations", body);
    const url = out.data?.[0]?.url;
    if (!url) throw new Error("no image url in response");
    update(job.id, { progress: 85 });
    const saved = await download(url, `${job.id}.jpg`);
    update(job.id, { status: "done", progress: 100, result: { assetId: out.data[0].id || job.id, kind: "image", ...saved, size, model, usage: out.usage } });
  }

  async function submitVideo(job, update, model) {
    const seconds = Math.max(2, Math.min(12, Math.round(job.seconds || 5)));
    const ratio = /^\d+:\d+$/.test(job.aspect) ? job.aspect : "16:9";
    const hasImage = job.mode === "i2v" && !!job.inputs?.image;
    // Ark: with a first frame the output ratio follows the image (passing --ratio is rejected)
    const content = [{ type: "text", text: `${job.prompt}${hasImage ? "" : ` --ratio ${ratio}`} --duration ${seconds} --resolution ${job.resolution || ARK_DEFAULTS.resolution}` }];
    if (hasImage) content.push({ type: "image_url", image_url: { url: toDataUrl(job.inputs.image, "image/png") || job.inputs.image }, role: "first_frame" });
    if (job.mode === "v2v") {
      // Ark only accepts a web URL for reference_video (no data URLs): local take proxies need a public base URL
      const ref = job.inputs?.video;
      if (!ref) throw Object.assign(new Error("no circled take video for this shot"), { code: "NO_REFERENCE_VIDEO" });
      const m = String(ref).match(/\/media\/([^/?#]+)/);
      let url = null;
      if (m && publicUrl) url = `${publicUrl}/media/${m[1]}`;
      else if (!m && /^https?:\/\//.test(ref) && !/^https?:\/\/(127\.0\.0\.1|localhost)/.test(ref)) url = ref;
      if (!url) throw Object.assign(new Error("v2v needs a web-reachable reference video: start the backend with --public-url https://<host> (Ark fetches /media/<take>.webm from there)"), { code: "NO_PUBLIC_MEDIA_URL" });
      content.push({ type: "video_url", video_url: { url }, role: "reference_video" });
    }
    update(job.id, { status: "running", progress: 5, result: null, adapter: { name: "ark", model, seconds, ratio } });
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
