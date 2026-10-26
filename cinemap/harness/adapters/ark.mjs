// Volcengine Ark: Seedream (image) and Seedance (video). Contract: { name, models, supports,
// submit(job, update), cancel(job) }. Results are downloaded into mediaDir because the
// signed links expire. Keys never leave this module.
import fs from 'node:fs';
import path from 'node:path';
export const ARK_DEFAULTS = {
  baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
  models: { 'seedance-2.5': 'doubao-seedance-2-5-260628', 'seedance-2': 'doubao-seedance-2-0-260128', 'seedream-5': 'doubao-seedream-5-0-260128' },
  imageSizes: { '16:9': '2560x1440', '9:16': '1440x2560', '1:1': '2048x2048', '4:3': '2240x1680' },
  videoSeconds: { 'doubao-seedance-2-5-260628': { min: 4, max: 30 }, 'doubao-seedance-2-0-260128': { min: 4, max: 12 } },
  resolution: '720p',
  pollMs: 5000,
  maxWaitMs: 15 * 60 * 1000,
};
export function createArkAdapter({ apiKey, baseUrl, mediaDir, mediaUrl = (n) => `/media/${n}`, log = () => {}, getJob = () => null, models: extra = {} }) {
  if (!apiKey) throw new Error('ark adapter needs apiKey');
  const base = (baseUrl || ARK_DEFAULTS.baseUrl).replace(/\/$/, '');
  const models = { ...ARK_DEFAULTS.models, ...extra };
  const headers = { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' };
  async function call(p, body, method = body ? 'POST' : 'GET') {
    const res = await fetch(`${base}${p}`, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(180000) });
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
    const res = await fetch(url, { signal: AbortSignal.timeout(180000) });
    if (!res.ok) return { url, remoteUrl: url, note: `download failed HTTP ${res.status}` };
    fs.mkdirSync(mediaDir, { recursive: true });
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(path.join(mediaDir, name), buf);
    return { url: mediaUrl(name), remoteUrl: url, bytes: buf.length };
  }
  const cancelled = (id) => !getJob(id) || getJob(id).status === 'cancelled';
  async function image(job, update, model) {
    const size = ARK_DEFAULTS.imageSizes[job.aspect] || ARK_DEFAULTS.imageSizes['16:9'];
    const body = { model, prompt: job.prompt, size, response_format: 'url', watermark: false };
    if (job.mode === 'i2i' && job.inputs?.image) body.image = job.inputs.image;
    update(job.id, { status: 'running', progress: 15, adapter: { name: 'ark', model, size } });
    const out = await call('/images/generations', body);
    const url = out.data?.[0]?.url;
    if (!url) throw new Error('no image url in response');
    update(job.id, { progress: 85 });
    const saved = await download(url, `${job.id}.jpg`);
    update(job.id, { status: 'done', progress: 100, result: { kind: 'image', model, size, usage: out.usage, ...saved } });
  }
  async function video(job, update, model) {
    const bounds = ARK_DEFAULTS.videoSeconds[model] || { min: 4, max: 12 };
    const seconds = Math.max(bounds.min, Math.min(bounds.max, Math.round(job.seconds || 5)));
    const hasImage = job.mode === 'i2v' && !!job.inputs?.image;
    const content = [{ type: 'text', text: `${job.prompt}${hasImage ? '' : ` --ratio ${job.aspect || '16:9'}`} --duration ${seconds} --resolution ${job.resolution || ARK_DEFAULTS.resolution}` }];
    if (hasImage) content.push({ type: 'image_url', image_url: { url: job.inputs.image }, role: 'first_frame' });
    update(job.id, { status: 'running', progress: 5, adapter: { name: 'ark', model, seconds } });
    const created = await call('/contents/generations/tasks', { model, content });
    const taskId = created.id;
    log(`ark task ${taskId} ← ${job.id} (${model}, ${seconds}s)`);
    update(job.id, { progress: 10, adapter: { name: 'ark', model, taskId, seconds } });
    const t0 = Date.now();
    const expected = 60000 + seconds * 20000;
    while (Date.now() - t0 < ARK_DEFAULTS.maxWaitMs) {
      await new Promise((r) => setTimeout(r, ARK_DEFAULTS.pollMs));
      if (cancelled(job.id)) {
        call(`/contents/generations/tasks/${taskId}`, null, 'DELETE').catch(() => {});
        return;
      }
      const t = await call(`/contents/generations/tasks/${taskId}`);
      if (t.status === 'succeeded') {
        update(job.id, { progress: 90 });
        const saved = await download(t.content.video_url, `${job.id}.mp4`);
        update(job.id, { status: 'done', progress: 100, result: { kind: 'video', model, duration: t.duration, resolution: t.resolution, usage: t.usage, ...saved } });
        return;
      }
      if (['failed', 'cancelled', 'expired'].includes(t.status)) throw Object.assign(new Error(t.error?.message || t.status), { code: t.error?.code || t.status.toUpperCase() });
      update(job.id, { progress: Math.min(85, 10 + Math.round(((Date.now() - t0) / expected) * 75)) });
    }
    throw Object.assign(new Error('timed out waiting for Ark'), { code: 'TIMEOUT' });
  }
  return {
    name: 'ark',
    models,
    supports: (p) => !!models[p],
    submit(job, update) {
      const model = models[job.provider];
      (job.mode.endsWith('2i') ? image : video)(job, update, model).catch((err) => {
        log(`ark ${job.id} failed: ${err.code || ''} ${err.message}`);
        if (!cancelled(job.id)) update(job.id, { status: 'failed', error: `${err.code ? err.code + ': ' : ''}${err.message}` });
      });
    },
  };
}
