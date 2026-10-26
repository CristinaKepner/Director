// MossHub gateway. Providers are built from /v1/models at startup, so whatever the key is
// entitled to shows up: images (OpenAI images API, edits for image-to-image), videos (OpenAI
// videos API, multipart with an input_reference frame), MiniMax (hailuo endpoint), Gemini image.
import fs from 'node:fs';
import path from 'node:path';
export const MOSSHUB_KNOWN = {
  'MiniMax-H3': { provider: 'minimax-h3', name: 'MiniMax H3 (MossHub)', kind: 'video', protocol: 'hailuo', min: 4, max: 15 },
  'MiniMax-H3-Max': { provider: 'minimax-h3-max', name: 'MiniMax H3 Max (MossHub)', kind: 'video', protocol: 'hailuo', min: 5, max: 15 },
  'doubao-seedance-2-5-260628': { provider: 'mosshub-seedance-2.5', name: 'Seedance 2.5 (MossHub)', kind: 'video', protocol: 'videos', min: 4, max: 30 },
  'doubao-seedream-5-0-pro-260628': { provider: 'mosshub-seedream-pro', name: 'Seedream 5.0 Pro (MossHub)', kind: 'image', protocol: 'images' },
  'gpt-image-2.5-sunburst': { provider: 'gpt-image-2.5', name: 'GPT Image 2.5 (MossHub)', kind: 'image', protocol: 'images', edits: true },
  'moss-image': { provider: 'moss-image', name: 'Moss Image (MossHub)', kind: 'image', protocol: 'images' },
  'gemini-3-pro-image': { provider: 'mosshub-gemini-image', name: 'Gemini 3 Pro Image (MossHub)', kind: 'image', protocol: 'gemini' },
  'gemini-nano-banana-2.1': { provider: 'nano-banana-2.1', name: 'Nano Banana 2.1 (MossHub)', kind: 'image', protocol: 'gemini' },
};
// models the gateway lists but this table does not know: classify from their protocols
export function describeModel(m) {
  const known = MOSSHUB_KNOWN[m.id];
  if (known) return { id: m.id, ...known };
  const protos = m.protocols || [];
  if (protos.includes('videos')) return { id: m.id, provider: `mosshub:${m.id}`, name: `${m.id} (MossHub)`, kind: 'video', protocol: 'videos', min: 4, max: 12 };
  if (protos.includes('images_generations')) return { id: m.id, provider: `mosshub:${m.id}`, name: `${m.id} (MossHub)`, kind: 'image', protocol: 'images', edits: protos.includes('images_edits') };
  return null;
}
export function createMosshubAdapter({ apiKey, baseUrl, mediaDir, mediaUrl = (n) => `/media/${n}`, log = () => {}, getJob = () => null, catalog = [] }) {
  if (!apiKey) throw new Error('mosshub adapter needs apiKey');
  const base = (baseUrl || 'https://api.mosshub.cn/v1').replace(/\/v1\/?$/, '').replace(/\/$/, '');
  const byProvider = {};
  for (const m of catalog) {
    const d = describeModel(m);
    if (d) byProvider[d.provider] = d;
  }
  const models = Object.fromEntries(Object.entries(byProvider).map(([p, d]) => [p, d.id]));
  const auth = { authorization: `Bearer ${apiKey}` };
  async function call(url, body, { form = false, method } = {}) {
    const r = await fetch(base + url, { method: method || (body ? 'POST' : 'GET'), headers: form ? auth : { ...auth, 'content-type': 'application/json' }, body: form ? body : body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(300000) });
    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`MossHub HTTP ${r.status}: ${text.slice(0, 120)}`);
    }
    if (!r.ok || data.error) throw Object.assign(new Error(data.error?.message || `MossHub HTTP ${r.status}`), { code: data.error?.diagnostic?.upstream_code || data.error?.code, requestId: data.request_id });
    return data;
  }
  const dataToBlob = (dataUrl) => {
    const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
    return new Blob([Buffer.from(m[2], 'base64')], { type: m[1] });
  };
  async function save(src, id, kind) {
    let bytes, mime;
    const enc = typeof src === 'string' && src.match(/^data:([^;]+);base64,(.+)$/s);
    if (enc) {
      mime = enc[1];
      bytes = Buffer.from(enc[2], 'base64');
    } else if (Buffer.isBuffer(src)) {
      bytes = src;
      mime = kind === 'video' ? 'video/mp4' : 'image/png';
    } else {
      const r = await fetch(src, { signal: AbortSignal.timeout(300000) });
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
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function hailuo(job, update, d) {
    const duration = Math.max(d.min, Math.min(d.max, Math.round(job.seconds || d.min)));
    const content = [{ type: 'text', text: job.prompt }];
    if (job.mode === 'i2v' && job.inputs?.image) content.push({ type: 'image_url', image_url: { url: job.inputs.image }, role: 'first_frame' });
    update(job.id, { status: 'running', progress: 5, adapter: { name: 'mosshub', model: d.id, duration } });
    const created = await call('/hailuo/v2/video_generation', { model: d.id, content, duration, resolution: '768P', ratio: job.aspect || '16:9' });
    const id = created.task_id || created.task?.task_id || created.id;
    if (!id) throw new Error('MossHub did not return task_id');
    update(job.id, { progress: 10, adapter: { name: 'mosshub', model: d.id, taskId: id, duration } });
    const started = Date.now();
    while (Date.now() - started < 30 * 60 * 1000) {
      if (cancelled(job.id)) return;
      await sleep(5000);
      const out = await call(`/hailuo/v2/query/video_generation/${encodeURIComponent(id)}`);
      const t = out.task || out;
      const status = String(t.status || '').toLowerCase();
      if (['failed', 'cancelled', 'expired'].includes(status)) throw new Error(t.error?.message || t.error || status);
      if (['succeeded', 'success', 'completed'].includes(status)) {
        const url = t.content?.video_url || t.content?.url || t.video_url || t.result?.video_url || t.result?.url || t.output?.video_url;
        if (!url) throw new Error('Task succeeded without video URL');
        const result = await save(url, job.id, 'video');
        if (!cancelled(job.id)) update(job.id, { status: 'done', progress: 100, result: { kind: 'video', model: d.id, duration, ...result } });
        return;
      }
      update(job.id, { progress: Math.min(85, 10 + (Date.now() - started) / 10000) });
    }
    throw new Error('MossHub video task timed out');
  }
  // MossHub media tasks (docs.mosshub.cn/reference/videos): JSON create → 202 {id, status:'submitted'}
  // → GET /v1/videos/{id} until succeeded → GET /v1/videos/{id}/content streams the MP4.
  // A first frame rides in the native content[] form (text + image_url role first_frame, ratio adaptive).
  async function videos(job, update, d) {
    const duration = Math.max(d.min, Math.min(d.max, Math.round(job.seconds || 5)));
    const resolution = /MiniMax/.test(d.id) ? '768P' : '720p';
    const frame = job.mode === 'i2v' && job.inputs?.image ? job.inputs.image : null;
    const body = frame
      ? { model: d.id, content: [{ type: 'text', text: job.prompt }, { type: 'image_url', image_url: { url: frame }, role: 'first_frame' }], duration, resolution, ratio: 'adaptive' }
      : { model: d.id, prompt: job.prompt, duration, resolution, ratio: job.aspect || '16:9' };
    update(job.id, { status: 'running', progress: 5, adapter: { name: 'mosshub', model: d.id, duration } });
    let created;
    try {
      created = await call('/v1/videos', body);
    } catch (err) {
      if (!frame || !/invalid_body|unsupported/i.test(`${err.code} ${err.message}`)) throw err;
      log(`mosshub: ${d.id} rejected the first frame (${err.code}); retrying as text-to-video`);
      update(job.id, { adapter: { name: 'mosshub', model: d.id, duration, note: 'first frame rejected, text-to-video' } });
      created = await call('/v1/videos', { model: d.id, prompt: job.prompt, duration, resolution, ratio: job.aspect || '16:9' });
    }
    const id = created.id;
    if (!id) throw new Error('MossHub did not return a task id');
    log(`mosshub task ${id} ← ${job.id} (${d.id}, ${duration}s)`);
    update(job.id, { progress: 10, adapter: { name: 'mosshub', model: d.id, taskId: id, duration } });
    const started = Date.now();
    const expected = 60000 + duration * 20000;
    while (Date.now() - started < 30 * 60 * 1000) {
      if (cancelled(job.id)) {
        call(`/v1/videos/${encodeURIComponent(id)}/cancel`, {}).catch(() => {});
        return;
      }
      await sleep(5000);
      const v = await call(`/v1/videos/${encodeURIComponent(id)}`);
      const status = String(v.status || '').toLowerCase();
      if (['failed', 'cancelled', 'expired', 'error'].includes(status)) throw Object.assign(new Error(v.failure_code || v.error?.message || status), { code: v.failure_code });
      if (status === 'succeeded' || v.result_available === true) {
        update(job.id, { progress: 90 });
        const r = await fetch(`${base}/v1/videos/${encodeURIComponent(id)}/content`, { headers: auth, signal: AbortSignal.timeout(300000) });
        if (!r.ok) throw new Error(`video download HTTP ${r.status}`);
        const result = await save(Buffer.from(await r.arrayBuffer()), job.id, 'video');
        if (!cancelled(job.id)) update(job.id, { status: 'done', progress: 100, result: { kind: 'video', model: d.id, duration, resolution, ...result } });
        return;
      }
      update(job.id, { status: 'running', progress: Math.min(85, 10 + Math.round(((Date.now() - started) / expected) * 75)) });
    }
    throw new Error('MossHub video task timed out');
  }
  async function images(job, update, d) {
    const ref = job.mode === 'i2i' ? job.inputs?.image : null;
    update(job.id, { status: 'running', progress: 15, adapter: { name: 'mosshub', model: d.id } });
    let out;
    if (ref && d.edits) {
      const form = new FormData();
      form.append('model', d.id);
      form.append('prompt', job.prompt);
      form.append('image', dataToBlob(ref), 'frame.jpg');
      form.append('size', job.aspect === '9:16' ? '1024x1536' : job.aspect === '1:1' ? '1024x1024' : '1536x1024');
      out = await call('/v1/images/edits', form, { form: true });
    } else {
      // generations: Seedream takes a reference image inline; other models only take text, so a
      // frame is dropped there (the job keeps its mode for the record). Optional params are shed
      // one by one when the upstream rejects them.
      const seedream = /seedream/.test(d.id);
      const body = { model: d.id, prompt: job.prompt, n: 1 };
      if (seedream) Object.assign(body, { size: '2K', watermark: false, response_format: 'url', ...(ref ? { image: [ref] } : {}) });
      const optional = seedream ? ['image', 'watermark', 'size', 'response_format'] : [];
      for (;;) {
        try {
          out = await call('/v1/images/generations', body);
          break;
        } catch (err) {
          const k = optional.shift();
          if (!k || !/invalid_parameter|unsupported|invalid_request/i.test(`${err.code} ${err.message}`)) throw err;
          log(`mosshub: ${d.id} rejected ${k}; retrying without it`);
          delete body[k];
        }
      }
    }
    const first = out.data?.[0] || {};
    const src = first.url || (first.b64_json ? `data:image/png;base64,${first.b64_json}` : null);
    if (!src) throw new Error('No generated image in response');
    const result = await save(src, job.id, 'image');
    if (!cancelled(job.id)) update(job.id, { status: 'done', progress: 100, result: { kind: 'image', model: d.id, usage: out.usage, ...result } });
  }
  async function gemini(job, update, d) {
    const parts = [{ text: job.prompt }];
    if (job.mode === 'i2i' && job.inputs?.image) {
      const m = job.inputs.image.match(/^data:([^;]+);base64,(.+)$/s);
      if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
    }
    update(job.id, { status: 'running', progress: 15, adapter: { name: 'mosshub', model: d.id } });
    const out = await call(`/v1beta/models/${d.id}:generateContent`, { contents: [{ role: 'user', parts }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: job.aspect || '16:9' } } });
    const img = out.candidates?.flatMap((c) => c.content?.parts || []).map((p) => p.inlineData || p.inline_data).find(Boolean);
    if (!img) throw new Error('No generated image in response');
    const result = await save(`data:${img.mimeType || img.mime_type || 'image/png'};base64,${img.data}`, job.id, 'image');
    if (!cancelled(job.id)) update(job.id, { status: 'done', progress: 100, result: { kind: 'image', model: d.id, ...result } });
  }
  return {
    name: 'mosshub',
    models,
    describe: (provider) => byProvider[provider] || null,
    supports: (id) => !!byProvider[id],
    submit(job, update) {
      const d = byProvider[job.provider];
      const run = { hailuo, videos, images, gemini }[d.protocol];
      run(job, update, d).catch((e) => {
        log(`mosshub ${job.id} failed: ${e.code || ''} ${e.message}${e.requestId ? ` (request ${e.requestId})` : ''}`);
        if (!cancelled(job.id)) update(job.id, { status: 'failed', error: `${e.code ? e.code + ': ' : ''}${e.message}` });
      });
    },
  };
}
export function routeGeneration(adapters) {
  const real = adapters.filter(Boolean);
  if (!real.length) return null;
  const find = (id) => real.find((a) => a.supports(id));
  return {
    name: real.map((a) => a.name).join('+'),
    models: Object.assign({}, ...real.map((a) => a.models)),
    supports: (id) => !!find(id),
    describe: (id) => find(id)?.describe?.(id) || null,
    submit: (job, update) => find(job.provider).submit(job, update),
  };
}
