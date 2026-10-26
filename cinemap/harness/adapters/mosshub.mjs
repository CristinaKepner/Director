// MossHub gateway: Seedream Pro (image, OpenAI images endpoint), MiniMax H3 (video, hailuo
// endpoint), Gemini image. Same contract as the Ark adapter.
import fs from 'node:fs';
import path from 'node:path';
export const MOSSHUB_MODELS = { 'minimax-h3': 'MiniMax-H3', 'minimax-h3-max': 'MiniMax-H3-Max', 'mosshub-seedream-pro': 'doubao-seedream-5-0-pro-260628', 'mosshub-gemini-image': 'gemini-3-pro-image' };
export function createMosshubAdapter({ apiKey, baseUrl, mediaDir, mediaUrl = (n) => `/media/${n}`, log = () => {}, getJob = () => null, available = null }) {
  if (!apiKey) throw new Error('mosshub adapter needs apiKey');
  const base = (baseUrl || 'https://api.mosshub.cn/v1').replace(/\/v1\/?$/, '').replace(/\/$/, '');
  const models = Object.fromEntries(Object.entries(MOSSHUB_MODELS).filter(([, id]) => !available || available.includes(id)));
  async function call(url, body) {
    const r = await fetch(base + url, { method: body ? 'POST' : 'GET', headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(180000) });
    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`MossHub HTTP ${r.status}: invalid JSON`);
    }
    if (!r.ok || data.error) throw new Error(data.error?.message || `MossHub HTTP ${r.status}`);
    return data;
  }
  async function save(url, id, kind) {
    let bytes, mime;
    const enc = url.match(/^data:([^;]+);base64,(.+)$/s);
    if (enc) {
      mime = enc[1];
      bytes = Buffer.from(enc[2], 'base64');
    } else {
      const r = await fetch(url, { signal: AbortSignal.timeout(180000) });
      if (!r.ok) throw new Error(`Result download HTTP ${r.status}`);
      mime = r.headers.get('content-type') || '';
      bytes = Buffer.from(await r.arrayBuffer());
    }
    const name = `${id}.${kind === 'video' ? 'mp4' : /jpe?g/.test(mime) ? 'jpg' : 'png'}`;
    fs.mkdirSync(mediaDir, { recursive: true });
    fs.writeFileSync(path.join(mediaDir, name), bytes);
    return { url: mediaUrl(name), bytes: bytes.length };
  }
  const cancelled = (id) => !getJob(id) || getJob(id).status === 'cancelled';
  async function video(job, update, model) {
    const minimum = model.endsWith('-Max') ? 5 : 4;
    const duration = Math.max(minimum, Math.min(15, Math.round(job.seconds || minimum)));
    const content = [{ type: 'text', text: job.prompt }];
    if (job.mode === 'i2v') {
      if (!job.inputs?.image) throw new Error('NO_REFERENCE_IMAGE');
      content.push({ type: 'image_url', image_url: { url: job.inputs.image }, role: 'first_frame' });
    }
    update(job.id, { status: 'running', progress: 5, adapter: { name: 'mosshub', model, duration } });
    const created = await call('/hailuo/v2/video_generation', { model, content, duration, resolution: '768P', ratio: job.aspect || '16:9' });
    const id = created.task_id || created.task?.task_id || created.id;
    if (!id) throw new Error('MossHub did not return task_id');
    update(job.id, { progress: 10, adapter: { name: 'mosshub', model, taskId: id, duration } });
    const started = Date.now();
    while (Date.now() - started < 30 * 60 * 1000) {
      if (cancelled(job.id)) return;
      await new Promise((r) => setTimeout(r, 5000));
      const out = await call(`/hailuo/v2/query/video_generation/${encodeURIComponent(id)}`);
      const t = out.task || out;
      const status = String(t.status || '').toLowerCase();
      if (['failed', 'cancelled', 'expired'].includes(status)) throw new Error(t.error?.message || t.error || status);
      if (['succeeded', 'success', 'completed'].includes(status)) {
        const url = t.content?.video_url || t.content?.url || t.video_url || t.result?.video_url || t.result?.url || t.output?.video_url;
        if (!url) throw new Error('Task succeeded without video URL');
        const result = await save(url, job.id, 'video');
        if (!cancelled(job.id)) update(job.id, { status: 'done', progress: 100, result: { kind: 'video', model, duration, ...result } });
        return;
      }
      update(job.id, { progress: Math.min(85, 10 + (Date.now() - started) / 10000) });
    }
    throw new Error('MossHub video task timed out');
  }
  async function image(job, update, model) {
    const refs = job.mode === 'i2i' && job.inputs?.image ? [job.inputs.image] : [];
    update(job.id, { status: 'running', progress: 15, adapter: { name: 'mosshub', model } });
    let url;
    if (model === 'gemini-3-pro-image') {
      const parts = [{ text: job.prompt }];
      for (const ref of refs) {
        const m = ref.match(/^data:([^;]+);base64,(.+)$/s);
        if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
      }
      const out = await call(`/v1beta/models/${model}:generateContent`, { contents: [{ role: 'user', parts }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: job.aspect || '16:9' } } });
      const img = out.candidates?.flatMap((c) => c.content?.parts || []).map((p) => p.inlineData || p.inline_data).find(Boolean);
      if (img) url = `data:${img.mimeType || img.mime_type || 'image/png'};base64,${img.data}`;
    } else {
      const out = await call('/v1/images/generations', { model, prompt: job.prompt, n: 1, size: '2K', response_format: 'url', watermark: false, ...(refs.length ? { image: refs } : {}) });
      url = out.data?.[0]?.url || (out.data?.[0]?.b64_json ? `data:image/png;base64,${out.data[0].b64_json}` : null);
    }
    if (!url) throw new Error('No generated image in response');
    const result = await save(url, job.id, 'image');
    if (!cancelled(job.id)) update(job.id, { status: 'done', progress: 100, result: { kind: 'image', model, ...result } });
  }
  return {
    name: 'mosshub',
    models,
    supports: (id) => !!models[id],
    submit(job, update) {
      const model = models[job.provider];
      (job.mode.endsWith('2i') ? image : video)(job, update, model).catch((e) => {
        log(`mosshub ${job.id} failed: ${e.message}`);
        if (!cancelled(job.id)) update(job.id, { status: 'failed', error: e.message });
      });
    },
  };
}
export function routeGeneration(adapters) {
  const real = adapters.filter(Boolean);
  if (!real.length) return null;
  const find = (id) => real.find((a) => a.supports(id));
  return { name: real.map((a) => a.name).join('+'), models: Object.assign({}, ...real.map((a) => a.models)), supports: (id) => !!find(id), submit: (job, update) => find(job.provider).submit(job, update) };
}
