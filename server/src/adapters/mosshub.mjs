// MossHub's documented native endpoints: /hailuo/v2, /v1/images and Gemini generateContent.
import fs from 'node:fs';
import path from 'node:path';
export const MOSSHUB_GENERATION = {
  'minimax-h3': 'MiniMax-H3', 'minimax-h3-max': 'MiniMax-H3-Max',
  'mosshub-seedream-pro': 'doubao-seedream-5-0-pro-260628',
  'mosshub-gemini-image': 'gemini-3-pro-image',
};
export function createMosshubAdapter(opts) {
  const base = (opts.baseUrl || 'https://api.mosshub.cn/v1').replace(/\/v1\/?$/, '').replace(/\/$/, '');
  const models = Object.fromEntries(Object.entries(MOSSHUB_GENERATION).filter(([,id]) => opts.catalog.video.includes(id) || opts.catalog.image.includes(id)));
  const request = opts.fetchImpl || fetch;
  const publicBase = () => String((typeof opts.publicUrl === 'function' ? opts.publicUrl() : opts.publicUrl) || '').replace(/\/$/, '');
  const cancelled = id => opts.getJob && (!opts.getJob(id) || opts.getJob(id).status === 'cancelled');
  async function call(url, body) {
    const r = await request(base + url, { method: body ? 'POST' : 'GET',
      headers: { authorization: `Bearer ${opts.apiKey}`, 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(180000) });
    const text = await r.text(); let data;
    try { data = JSON.parse(text); } catch { throw new Error(`MossHub HTTP ${r.status}: invalid JSON`); }
    if (!r.ok || data.error) throw new Error(data.error?.message || `MossHub HTTP ${r.status}`);
    return data;
  }
  function dataUrl(ref) {
    if (!ref || ref.startsWith('data:')) return ref;
    const file = opts.resolveLocal?.(ref);
    if (!file || !fs.existsSync(file)) return ref;
    const mime = /\.png$/i.test(file) ? 'image/png' : /\.webp$/i.test(file) ? 'image/webp' : 'image/jpeg';
    return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
  }
  async function save(url, id, kind) {
    if (!opts.mediaDir) return { url, remoteUrl: url };
    let bytes, mime;
    const encoded = url.match(/^data:([^;]+);base64,(.+)$/s);
    if (encoded) { mime = encoded[1]; bytes = Buffer.from(encoded[2], 'base64'); }
    else {
      const r = await request(url, {signal: AbortSignal.timeout(180000)});
      if (!r.ok) throw new Error(`Result download HTTP ${r.status}`);
      mime = r.headers.get('content-type') || ''; bytes = Buffer.from(await r.arrayBuffer());
    }
    if (!bytes.length) throw new Error('Empty generated media');
    const ext = kind === 'video' ? 'mp4' : /jpe?g/.test(mime) ? 'jpg' : 'png';
    const name = `${id}.${ext}`; fs.mkdirSync(opts.mediaDir, { recursive: true }); fs.writeFileSync(path.join(opts.mediaDir, name), bytes);
    return { url: opts.mediaUrl?.(name) || `/media/${name}`, bytes: bytes.length };
  }
  async function videoUrl(job) {
    const ref = job.inputs?.video;
    if (!ref) throw new Error('NO_REFERENCE_VIDEO: 先录制白模视频');
    const usable = await opts.toMp4?.(ref, job.inputs.videoFrom === 'origin' ? job.inputs.videoSpan : null);
    if (!usable) throw new Error('REFERENCE_TRANSCODE_FAILED: 请检查 ffmpeg');
    const m = usable.match(/\/media\/([^/?#]+)/);
    if (m && publicBase()) return `${publicBase()}/media/${m[1]}`;
    if (!m && /^https?:\/\//.test(usable) && !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(usable)) return usable;
    if (m && opts.publisher?.enabled) return (await opts.publisher.publish(opts.resolveLocal(usable))).url;
    throw new Error('V2V_NEEDS_PUBLIC_MEDIA: 参考视频需要可访问的公网地址');
  }
  async function video(job, update, model) {
    const minimum = model.endsWith('-Max') ? 5 : 4;
    const duration = Math.max(minimum, Math.min(15, Math.round(job.seconds || minimum)));
    const content = [{ type: 'text', text: job.prompt }];
    const refs = (job.inputs?.references || []).filter(r => r.url);
    if (job.mode === 'i2v') {
      if (!job.inputs?.image) throw new Error('NO_REFERENCE_IMAGE: 图生视频需要首帧');
      content.push({type:'image_url', image_url:{url:dataUrl(job.inputs.image)}, role:'first_frame'});
    } else for (const r of refs.slice(0,9)) content.push({type:'image_url', image_url:{url:dataUrl(r.url)}, role:'reference_image'});
    if (job.mode === 'v2v') content.push({type:'video_url', video_url:{url:await videoUrl(job)}, role:'reference_video'});
    if (cancelled(job.id)) return;
    const resolution = '768P';
    const created = await call('/hailuo/v2/video_generation', {model, content, duration, resolution, ratio:job.aspect || '16:9'});
    const id = created.task_id || created.task?.task_id || created.id;
    if (!id) throw new Error('MossHub did not return task_id');
    update(job.id, {progress:10, adapter:{name:'mosshub',model,taskId:id,duration,resolution}});
    const started = Date.now();
    while (Date.now()-started < (opts.maxWaitMs || 30*60*1000)) {
      if (cancelled(job.id)) return;
      await new Promise(r => setTimeout(r, opts.pollMs ?? 5000));
      const out = await call(`/hailuo/v2/query/video_generation/${encodeURIComponent(id)}`);
      const t = out.task || out;
      const status = String(t.status || '').toLowerCase();
      if (['failed','cancelled','expired'].includes(status)) throw new Error(t.error?.message || t.error || status);
      if (['succeeded','success','completed'].includes(status)) {
        const url = t.content?.video_url || t.content?.url || t.video_url || t.result?.video_url || t.result?.url || t.output?.video_url;
        if (!url) throw new Error('Task succeeded without video URL');
        const result = await save(url,job.id,'video');
        if (!cancelled(job.id)) update(job.id,{status:'done',progress:100,result:{...result,kind:'video',model,assetId:id,duration}});
        return;
      }
      if (!cancelled(job.id)) update(job.id,{progress:Math.min(85,10+(Date.now()-started)/10000)});
    }
    throw new Error('MossHub video task timed out; check upstream task before retrying');
  }
  async function image(job, update, model) {
    const refs = [...(job.mode === 'i2i' && job.inputs?.image ? [job.inputs.image] : []), ...(job.inputs?.references || []).map(r=>r.url)].filter(Boolean);
    if (job.mode === 'i2i' && !refs.length) throw new Error('NO_REFERENCE_IMAGE');
    let url;
    if (model === 'gemini-3-pro-image') {
      const parts = [{text:job.prompt}];
      for (const ref of refs) {
        const u = dataUrl(ref); const m = u.match(/^data:([^;]+);base64,(.+)$/s);
        if (m) parts.push({inlineData:{mimeType:m[1],data:m[2]}});
        else { const r = await request(u,{signal:AbortSignal.timeout(30000)}); if (!r.ok) throw new Error('Reference image unavailable'); parts.push({inlineData:{mimeType:r.headers.get('content-type') || 'image/jpeg',data:Buffer.from(await r.arrayBuffer()).toString('base64')}}); }
      }
      const out = await call(`/v1beta/models/${model}:generateContent`, {contents:[{role:'user',parts}],generationConfig:{responseModalities:['TEXT','IMAGE'],imageConfig:{aspectRatio:job.aspect || '16:9'}}});
      const img = out.candidates?.flatMap(c=>c.content?.parts || []).map(p=>p.inlineData || p.inline_data).find(Boolean);
      if (img) url = `data:${img.mimeType || img.mime_type || 'image/png'};base64,${img.data}`;
    } else {
      const out = await call('/v1/images/generations',{model,prompt:job.prompt,n:1,size:'2K',response_format:'url',watermark:false,...(refs.length ? {image:refs.map(dataUrl)} : {})});
      url = out.data?.[0]?.url || (out.data?.[0]?.b64_json ? `data:image/png;base64,${out.data[0].b64_json}` : null);
    }
    if (!url) throw new Error('No generated image in response');
    const result = await save(url,job.id,'image');
    if (!cancelled(job.id)) update(job.id,{status:'done',progress:100,result:{...result,kind:'image',model,assetId:job.id}});
  }
  return {name:'mosshub',models,supports:id=>!!models[id],
    modeReady(mode) { return mode !== 'v2v' || publicBase() || opts.publisher?.enabled ? {ok:true} : {ok:false,error:'V2V_NEEDS_PUBLIC_MEDIA',hint:'MiniMax 视频参考需要公网媒体地址；i2v 仅使用首帧。'}; },
    submit(job,update) {
      const model = models[job.provider];
      if (!model) return update(job.id,{status:'failed',error:'MossHub model not authorized'});
      update(job.id,{status:'running',progress:3,adapter:{name:'mosshub',model}});
      (job.mode.endsWith('2i') ? image : video)(job,update,model).catch(e=>{
        if (!cancelled(job.id)) update(job.id,{status:'failed',error:e.message});
      });
    },
  };
}
