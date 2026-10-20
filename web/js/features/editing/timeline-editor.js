// Editorial tracks extend the existing bottom drawer; the stage remains the monitor.
import { store, historyInfo } from '../../../../core/store.js';
import { chosenVideo, videoVersions, cutTimeline, cutMedia, cutCaption, cutSrt, KEEP_OPTIONS } from '../../../../core/features/editing/cut.js';
import { PROVIDERS } from '../../../../core/schema.js';
import { dispatch, client, isOnline, api } from '../../client.js';
import { createHarnessPanel } from '../quality/harness-panel.js';
import { createAudioCueEditor } from './audio-cues.js';
import { stagePlayback } from '../stage/stage-workspace.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time = n => `${String(Math.floor(n / 60)).padStart(2,'0')}:${String(Math.floor(n % 60)).padStart(2,'0')}`;
const precise = n => `${time(n)}.${String(Math.round(n*10)%10)}`;
const number = n => Math.round(n*1000)/1000;
const title = s => (s.title || '未命名镜头').replace(/^\d+\s*[·.、]\s*/, '');
const model = j => j?.kind === 'animatic' ? '动态分镜' : j?.provider === 'minimax-h3-max' ? 'MiniMax H3 Max' : j?.provider === 'seedance-2.5' ? 'Seedance 2.5' : PROVIDERS[j?.provider]?.name || '视频版本';

export function createTimelineEditor({ mediaHref, toast, openDrawer, onMotion, onHarnessOpen }) {
  const root = document.createElement('section');
  root.className = 'timeline-editor'; root.setAttribute('aria-label', '成片时间线');
  root.innerHTML = `<header class="te-toolbar"><button data-command="play" aria-label="连播当前剪辑">▶ 连播</button><span class="te-clock" id="teTime">00:00.0</span><span id="teTotal" class="te-dim"></span><span class="te-divider"></span><button data-command="split" title="在播放头处分割 · S">✂ 分割</button><button data-command="duplicate" title="复制片段 · ⌘D">复制</button><button data-command="delete" title="删除片段 · Delete">删除</button><button data-command="undo" title="撤销 · ⌘Z" aria-label="撤销剪辑">↶</button><button data-command="redo" title="重做 · ⌘⇧Z" aria-label="重做剪辑">↷</button><span class="te-spacer"></span><select id="teZoom" aria-label="时间线缩放"><option value="1">适合全片</option><option value="2">放大 2×</option><option value="4">放大 4×</option><option value="8">放大 8×</option></select><button data-command="motion">机位与走位</button><button data-command="export">导出成片 ↗</button></header>
    <div class="te-scroll"><div class="te-tracks"><div class="te-ruler"><span>时间</span><div id="teTicks"></div><input id="teSeek" type="range" min="0" max="1" step="0.01" value="0" aria-label="成片播放位置"></div><div class="te-track te-video-track"><span class="te-track-label">▣ 画面</span><div id="tePictures" class="te-lane"></div></div><div class="te-track te-subtitle-track"><span class="te-track-label">T 字幕</span><div id="teCaptions" class="te-lane"></div></div><div class="te-track te-audio-track"><span class="te-track-label">♫ 配乐</span><div class="te-lane"><button id="teMusicClip" data-track="music"></button></div></div><div id="tePlayhead" aria-hidden="true"></div></div></div>
    <div class="te-editor" id="teEditor"></div><div class="te-status" id="teStatus" role="status" aria-live="polite"></div>`;
  const $ = id => root.querySelector(`#${id}`);
  const audioEditor = createAudioCueEditor(root,{toast});
  const harness = createHarnessPanel({root,mediaHref,toast,onOpen:onHarnessOpen});
  const current = () => store.get().shots.find(s => s.id === store.get().project.currentShotId) || store.get().shots[0];
  let track = 'picture', selected = null, candidateId = null, comparing = false, panelKey = '', tracksKey = '', versionsKey = '', projectId = null, busy = false;
  const drafts = new Map();
  const draft = s => {
    const base = JSON.stringify([s.cut,s.range,store.get().project.fps]);
    if (!drafts.has(s.id) || drafts.get(s.id).base !== base) drafts.set(s.id, { base, instruction:s.cut?.instruction || '', caption:s.cut?.caption || '', muted:!!s.cut?.muted, keep:s.cut?.keep || Object.keys(KEEP_OPTIONS), ...cutMedia(store.get(),s), captionSettings:cutCaption(store.get(),s), provider:s.cut?.provider || (PROVIDERS[chosenVideo(store.get(),s)?.provider] ? chosenVideo(store.get(),s).provider : 'seedance-2.5') });
    return drafts.get(s.id);
  };
  const report = r => { if (r?.ok) return true; toast(r?.hint || r?.message || r?.error || '操作未完成', true); return false; };
  async function select(id, nextTrack = track) {
    track = nextTrack; candidateId = null; comparing = false; harness.close();
    if (id && id !== current()?.id && !report(await dispatch('shot.select', {id}))) return;
    stagePlayback.preview?.({}); render(store.get());
  }
  function preview() { stagePlayback.preview?.({ jobId:candidateId, compare:comparing }); }
  function renderPanel(d, s) {
    const x = draft(s), row = cutTimeline(d).find(r => r.shot.id === s.id);
    const caption=x.captionSettings;
    const scope = `<div class="te-selection"><b>${esc(s.index)} · ${esc(title(s))}</b><span>${precise(row.start)}–${precise(row.end)} · ${number(row.seconds)}s</span><div class="te-kind-tabs"><button data-track="picture" class="${track==='picture'?'on':''}">剪辑</button><button data-track="caption" class="${track==='caption'?'on':''}">字幕</button><button data-track="music" class="${track==='music'?'on':''}">声音</button><button data-track="ai" class="${track==='ai'?'on':''}">AI 改画面</button></div></div>`;
    $('teEditor').innerHTML = scope + (track === 'picture' ? `<div class="te-cut-edit"><div class="te-field-row"><label>素材入点 <input id="teIn" type="number" min="0" step="0.1" value="${number(x.start)}" aria-label="素材入点（秒）"> s</label><span class="te-dim">→</span><label>素材出点 <input id="teOut" type="number" min="0" step="0.1" value="${number(x.end)}" aria-label="素材出点（秒）"> s</label><label>速度 <select id="teSpeed" aria-label="片段播放速度">${[.25,.5,.75,1,1.25,1.5,2,3,4].map(n=>`<option value="${n}" ${x.speed===n?'selected':''}>${n}×${n===1?' 原速':''}</option>`).join('')}</select></label><button class="te-primary" data-command="apply-cut">应用剪辑</button><button data-command="reset-cut">恢复原片段</button></div><div class="te-cut-hint"><b id="teCutDuration">剪辑后 ${number(x.seconds)}s</b><span>拖动片段两端可裁切 · 播放头处分割 · 支持撤销</span></div></div>` : track === 'ai' ? `<div class="te-content-edit"><div class="te-input-row"><textarea id="teInstruction" rows="2" maxlength="5000" aria-label="这一镜的画面修改说明" placeholder="想改这一镜的什么？例如：让绿衣朋友提前回头，其他四人笑着把他拉回队伍。">${esc(x.instruction)}</textarea><button data-command="save-instruction">保存说明</button><button id="teGenerate" class="te-primary" data-command="generate">生成候选</button></div><div class="te-options"><span>尽量保持</span>${Object.entries(KEEP_OPTIONS).map(([k,label])=>`<label><input type="checkbox" data-keep="${k}" ${x.keep.includes(k)?'checked':''}>${label}</label>`).join('')}<span class="te-spacer"></span><select id="teProvider" aria-label="修改使用的模型">${Object.entries(PROVIDERS).filter(([,p])=>p.modes.includes('t2v')).map(([k])=>`<option value="${esc(k)}" ${x.provider===k?'selected':''}>${esc(model({provider:k}))}</option>`).join('')}</select></div></div>` : track === 'caption' ? `<div class="te-caption-edit"><div class="te-input-row"><textarea id="teCaption" aria-label="这一镜的字幕" rows="2" maxlength="200" placeholder="输入这一镜的字幕">${esc(x.caption)}</textarea><button data-command="remove-caption">删除字幕</button><button class="te-primary" data-command="save-caption">保存字幕</button><button data-command="export-srt">导出 SRT</button></div><div class="te-field-row te-caption-fields"><label>显示 <input id="teCaptionIn" aria-label="字幕开始秒数" type="number" min="0" step="0.1" value="${number(caption.start)}">–<input id="teCaptionOut" aria-label="字幕结束秒数" type="number" min="0" step="0.1" value="${number(caption.end)}"> s</label><select id="teCaptionPosition" aria-label="字幕位置">${[['bottom','底部'],['center','居中'],['top','顶部']].map(([k,n])=>`<option value="${k}" ${caption.position===k?'selected':''}>${n}</option>`).join('')}</select><label>字号 <input id="teCaptionSize" type="number" min="1.5" max="6" step="0.1" value="${caption.size}" aria-label="字幕字号（画面高度百分比）">%</label><input id="teCaptionColor" type="color" value="${caption.color}" aria-label="字幕颜色"><span class="te-dim">时间相对当前片段</span></div></div>` : `<div class="te-music-edit"><label>全片配乐<select id="teMusicSelect" aria-label="全片配乐"><option value="">不使用配乐</option>${d.assets.filter(a=>a.mediaKind==='audio').map(a=>`<option value="${esc(a.id)}" ${a.id===d.project.cutMusic?.assetId?'selected':''}>${esc(a.label)}</option>`).join('')}</select></label><label class="te-gain">配乐 <output id="teGainLabel">${Math.round((d.project.cutMusic?.volume ?? .12)*100)}%</output><input id="teMusicGain" type="range" min="0" max="100" value="${Math.round((d.project.cutMusic?.volume ?? .12)*100)}" aria-label="全片配乐音量"></label><button data-command="upload">＋ 导入音乐</button><input id="teMusicFile" type="file" accept="audio/*" hidden><label class="te-gain">本镜原声 <input id="teVolume" type="range" min="0" max="100" value="${Math.round((s.cut?.volume ?? 1)*100)}" aria-label="本镜原声音量"><output id="teVolumeLabel">${Math.round((s.cut?.volume ?? 1)*100)}%</output></label><label class="te-mute"><input id="teMute" type="checkbox" ${x.muted?'checked':''}>静音原声</label></div>`) + (['picture','ai'].includes(track) ? `<div class="te-versions"><label for="teVersions">这一镜的版本</label><select id="teVersions" aria-label="预览镜头版本"></select><div><button id="teCompare" data-command="compare">双版对比</button><button id="teAdopt" data-command="adopt">采用此版</button></div></div>` : '');
    versionsKey = '';
    if(track==='caption')stagePlayback.caption?.(x.caption,x.captionSettings);
    for (const [id,key] of [['teIn','start'],['teOut','end'],['teSpeed','speed']]) $(id)?.addEventListener('input',e=>{x[key]=Number(e.target.value);$('teCutDuration').textContent=`剪辑后 ${number((x.end-x.start)/x.speed)}s · 尚未应用`;});
    for (const [id,key,numeric] of [['teCaptionIn','start',true],['teCaptionOut','end',true],['teCaptionPosition','position'],['teCaptionSize','size',true],['teCaptionColor','color']]) $(id)?.addEventListener('input',e=>{x.captionSettings[key]=numeric?Number(e.target.value):e.target.value;stagePlayback.caption?.(x.caption,x.captionSettings);$('teStatus').textContent='字幕设置尚未保存 · 已在成片浮窗预览';});
    $('teVolume')?.addEventListener('input',e=>{$('teVolumeLabel').textContent=`${e.target.value}%`;});
    $('teVolume')?.addEventListener('change',async e=>report(await dispatch('shot.cut-update',{shotId:s.id,volume:Number(e.target.value)/100})));
    $('teInstruction')?.addEventListener('input', e => { x.instruction=e.target.value; updateStatus(store.get(),s); });
    $('teCaption')?.addEventListener('input', e => { x.caption=e.target.value; stagePlayback.caption?.(x.caption,x.captionSettings); $('teStatus').textContent='字幕尚未保存 · 已在舞台成片浮窗预览'; });
    $('teProvider')?.addEventListener('change', e => { x.provider=e.target.value; updateStatus(store.get(),s); });
    root.querySelectorAll('[data-keep]').forEach(el => el.onchange=()=>{x.keep=[...root.querySelectorAll('[data-keep]:checked')].map(n=>n.dataset.keep);});
    $('teVersions')?.addEventListener('change', e => { candidateId=e.target.value || null; preview(); updateVersions(store.get(),s); });
    $('teMusicSelect')?.addEventListener('change', async e => { report(await dispatch('film.set-music',{assetId:e.target.value || null})); });
    $('teMusicGain')?.addEventListener('input', e => { $('teGainLabel').textContent=`${e.target.value}%`; });
    $('teMusicGain')?.addEventListener('change', async e => { report(await dispatch('film.set-music',{volume:Number(e.target.value)/100})); });
    $('teMute')?.addEventListener('change', async e => { report(await dispatch('shot.cut-update',{shotId:s.id,muted:e.target.checked})); });
    $('teMusicFile')?.addEventListener('change', async e => {
      const file=e.target.files?.[0]; if(!file)return;
      const button=root.querySelector('[data-command="upload"]'); button.disabled=true;
      try {
        const up=await api.post(`upload?label=${encodeURIComponent(file.name)}`,file,{headers:{'content-type':file.type || 'audio/mpeg'},timeout:120000});
        if(!report(up))return;
        const added=await dispatch('asset.add',{url:up.url,label:file.name,mediaKind:'audio',kind:'upload'});
        if(report(added) && report(await dispatch('film.set-music',{assetId:added.id})))toast('已添加全片配乐');
      } catch(err){toast(`导入失败：${err.message}`,true);} finally {button.disabled=false;}
    });
  }
  function updateVersions(d,s) {
    if (!$('teVersions'))return;
    const versions=videoVersions(d,s.id), chosen=chosenVideo(d,s);
    if(candidateId && !versions.some(j=>j.id===candidateId))candidateId=null;
    const key=JSON.stringify([versions.map(j=>j.id),chosen?.id]);
    if(key!==versionsKey){versionsKey=key;$('teVersions').innerHTML=versions.map((j,i)=>`<option value="${esc(j.id)}">${j.id===chosen?.id?'✓ 采用中':'候选'} · ${esc(model(j))} · V${i+1}</option>`).join('') || '<option value="">尚无生成版本</option>';}
    $('teVersions').value=candidateId || chosen?.id || '';
    $('teCompare').disabled=versions.length<2; $('teCompare').classList.toggle('on',comparing);
    $('teAdopt').disabled=!candidateId || candidateId===chosen?.id;
  }
  function updateStatus(d,s) {
    if(!s)return;
    const pending=d.jobs.find(j=>j.shotId===s.id && ['queued','running'].includes(j.status)), x=draft(s);
    if(track==='ai'){
      const ready=isOnline() && client.generation?.name!=='simulated' && !!client.generation?.models?.[x.provider];
      const seconds=(s.range.outFrame-s.range.inFrame)/d.project.fps, p=PROVIDERS[x.provider];
      const tooLong=seconds>(p?.maxSeconds || Infinity);
      if($('teGenerate'))$('teGenerate').disabled=busy || !!pending || !ready || tooLong || !x.instruction.trim();
      const failed=d.jobs.filter(j=>j.shotId===s.id && j.revision).at(-1);
      $('teStatus').textContent=pending?`这一镜正在生成 · ${pending.progress || 0}% · 可继续编辑其他片段`:failed?.status==='failed'?`生成失败：${failed.hint || failed.error || '请重试'}。当前采用版保留。`:!ready?'连接视频模型后即可生成候选':tooLong?`此模型单条最多 ${p.maxSeconds}s，请更换模型`:`只重新生成这一镜 ${Math.max(seconds,p?.minSeconds || 0)}s，使用模型额度；预览候选后点「采用此版」加入成片。`;
    }else if(track==='picture')$('teStatus').textContent='剪辑调整直接应用到预览与导出；原始视频保留，不调用生成模型。';
    else if(track==='caption')$('teStatus').textContent='直接编辑字幕，无需重新生成视频；已烧录在原素材中的文字不属于这条字幕轨。';
    else $('teStatus').textContent='保留各镜头原声，可单独静音；配乐会随当前剪辑一起导出。';
  }
  function render(d) {
    audioEditor.render(d);
    if(projectId!==d.project.id){projectId=d.project.id;drafts.clear();selected=null;tracksKey='';panelKey='';}
    const s=current(), rows=cutTimeline(d), total=rows.at(-1)?.end || 0;
    const history=isOnline()?d.history || {}:historyInfo();
    root.querySelector('[data-command="undo"]').disabled=!history.undo;
    root.querySelector('[data-command="redo"]').disabled=!history.redo;
    root.querySelector('[data-command="duplicate"]').disabled=!s || !chosenVideo(d,s);
    root.querySelector('[data-command="delete"]').disabled=!s;
    $('teTotal').textContent=`/ ${precise(total)} · ${rows.length} 镜`; $('teSeek').max=total || 1;
    if(!s){harness.render(d);$('teEditor').textContent='先添加镜头，即可在这里剪辑画面、字幕与声音。';$('tePictures').replaceChildren();$('teCaptions').replaceChildren();$('teStatus').textContent='';updateTime();return;}
    if(selected!==s.id){selected=s.id;candidateId=null;comparing=false;panelKey='';}
    const key=JSON.stringify([rows.map(r=>[r.shot.id,r.shot.title,r.seconds,chosenVideo(d,r.shot)?.id,r.shot.cut,cutMedia(d,r.shot)]),s.id,track]);
    if(key!==tracksKey){
      tracksKey=key;
      const step=[.5,1,2,5,10,15,30,60,120,300].find(n=>total/n<=12*Number($('teZoom').value)) || Math.ceil(total/12), ticks=[];
      for(let t=0;t<=total;t+=step)ticks.push(`<i style="left:${t/Math.max(1,total)*100}%">${time(t)}</i>`);
      $('teTicks').innerHTML=ticks.join('');
      const style=r=>`left:${r.start/total*100}%;width:${r.seconds/total*100}%`;
      $('tePictures').innerHTML=rows.map((r,i)=>{const j=chosenVideo(d,r.shot);return `<button class="te-clip ${s.id===r.shot.id?'selected':''}" data-shot="${esc(r.shot.id)}" data-track="picture" draggable="true" style="${style(r)}" aria-label="画面 ${i+1} ${esc(r.shot.title)}" title="${esc(r.shot.title)} · ${number(r.seconds)}s · 拖动调整顺序">${j?`<video src="${esc(mediaHref(j.result.url))}#t=${cutMedia(d,r.shot).start+.04}" muted playsinline preload="metadata" aria-hidden="true"></video>`:''}<span><b>${String(i+1).padStart(2,'0')} ${esc(title(r.shot))}</b><small>${number(r.seconds)}s${r.shot.cut?.speed && r.shot.cut.speed!==1?' · '+r.shot.cut.speed+'×':j?' · ✓':''}</small></span><span class="te-handle start" data-edge="start" title="拖动裁切开头"></span><span class="te-handle end" data-edge="end" title="拖动裁切结尾"></span></button>`;}).join('');
      $('teCaptions').innerHTML=rows.map((r,i)=>{const c=cutCaption(d,r.shot), present=c.text && c.end>c.start;return `<button class="te-caption-clip ${present?'':'blank'} ${s.id===r.shot.id && track==='caption'?'selected':''}" data-shot="${esc(r.shot.id)}" data-track="caption" style="${present?`left:${(r.start+c.start)/total*100}%;width:${(c.end-c.start)/total*100}%`:style(r)}" aria-label="字幕 ${i+1} ${esc(c.text || '添加字幕')}">${esc(c.text || '＋ 字幕')}</button>`;}).join('');
    }
    const music=d.project.cutMusic;
    $('teMusicClip').textContent=music?`♫ ${music.label} · ${Math.round(music.volume*100)}%`:'＋ 添加全片配乐';
    $('teMusicClip').classList.toggle('selected',track==='music'); $('teMusicClip').classList.toggle('blank',!music);
    const nextPanel=JSON.stringify([s.id,track,s.range,s.cut,music,track==='music'?d.assets.filter(a=>a.mediaKind==='audio'):null]);
    if(nextPanel!==panelKey){panelKey=nextPanel;renderPanel(d,s);}
    updateVersions(d,s);updateStatus(d,s);updateTime();harness.render(d);
  }
  function updateTime(){
    if(!root.isConnected)return;
    const state=stagePlayback.state?.(); if(!state)return;
    $('teTime').textContent=precise(state.time);
    const total=cutTimeline(store.get()).at(-1)?.end || 1; $('tePlayhead').style.left=`calc(58px + (100% - 63px) * ${Math.min(1,state.time/total)})`;
    const row=cutTimeline(store.get()).find(r=>r.shot.id===current()?.id), at=state.time-(row?.start||0);
    root.querySelector('[data-command="split"]').disabled=!row || !chosenVideo(store.get(),row.shot) || at<1/store.get().project.fps || at>row.seconds-1/store.get().project.fps; $('teSeek').value=state.time;
    root.querySelector('[data-command="play"]').textContent=state.playing?'❚❚ 暂停':'▶ 连播';
  }
  document.addEventListener('stage-preview-time',updateTime);
  root.addEventListener('keydown',e=>{
    if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
    if(e.code==='Space'){e.preventDefault();e.stopPropagation();candidateId=null;comparing=false;stagePlayback.toggle?.();if(current())updateVersions(store.get(),current());}
    else {
      const command=(e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='z' ? (e.shiftKey?'redo':'undo') : (e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='d' ? 'duplicate' : ['Delete','Backspace'].includes(e.key) ? 'delete' : e.key.toLowerCase()==='s' && !e.metaKey && !e.ctrlKey ? 'split' : null;
      if(command){e.preventDefault();e.stopPropagation();root.querySelector(`[data-command="${command}"]`)?.click();}
    }
  });
  root.onclick=async e=>{
    const b=e.target.closest('button');if(!b)return;
    try{
      if(b.dataset.track){await select(b.dataset.shot,b.dataset.track);return;}
      const s=current(), x=s && draft(s);
      switch(b.dataset.command){
        case 'undo': case 'redo': stagePlayback.preview?.({});report(await dispatch(`project.${b.dataset.command}`));render(store.get());break;
        case 'split': { const row=cutTimeline(store.get()).find(r=>r.shot.id===s.id);stagePlayback.preview?.({});if(report(await dispatch('shot.cut-split',{shotId:s.id,seconds:(stagePlayback.state?.().time || 0)-row.start})))toast('已分割，前后两段可独立编辑 · ⌘Z 撤销');break; }
        case 'duplicate': stagePlayback.preview?.({});if(report(await dispatch('shot.cut-duplicate',{shotId:s.id})))toast('已复制到下一段 · ⌘Z 撤销');break;
        case 'delete': if(s){stagePlayback.preview?.({});if(report(await dispatch('shot.delete',{id:s.id})))toast('片段已删除 · ⌘Z 撤销');}break;
        case 'apply-cut': case 'reset-cut': {
          const reset=b.dataset.command==='reset-cut';stagePlayback.preview?.({});
          if(report(await dispatch('shot.cut-update',{shotId:s.id,sourceIn:reset?0:x.start,sourceOut:reset?(s.range.outFrame-s.range.inFrame)/store.get().project.fps:x.end,speed:reset?1:x.speed})))toast('剪辑已应用到预览和导出');break;
        }
        case 'export-srt': {const blob=new Blob([cutSrt(store.get())],{type:'application/x-subrip;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${store.get().project.name}.srt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已导出整片字幕');break;}
        case 'motion': onMotion();break;
        case 'export': openDrawer('film');break;
        case 'play': candidateId=null;comparing=false;stagePlayback.toggle?.();updateVersions(store.get(),s);break;
        case 'upload': $('teMusicFile').click();break;
        case 'save-instruction': if(report(await dispatch('shot.cut-update',{shotId:s.id,instruction:x.instruction,keep:x.keep,provider:x.provider})))toast('这一镜的修改说明已保存');break;
        case 'save-caption': case 'remove-caption':
          if(report(await dispatch('shot.cut-update',{shotId:s.id,caption:b.dataset.command==='remove-caption'?'':x.caption,captionRange:b.dataset.command==='remove-caption'?null:{start:x.captionSettings.start,end:x.captionSettings.end},captionStyle:{size:x.captionSettings.size,color:x.captionSettings.color,position:x.captionSettings.position}}))) { stagePlayback.caption?.(store.get().shots.find(a=>a.id===s.id)?.cut?.caption || '',cutCaption(store.get(),store.get().shots.find(a=>a.id===s.id)));toast(b.dataset.command==='remove-caption'?'已删除这一镜字幕，可撤销':'字幕已保存'); }break;
        case 'compare': {
          comparing=!comparing;
          if(comparing && (!candidateId || candidateId===chosenVideo(store.get(),s)?.id)) candidateId=videoVersions(store.get(),s.id).find(j=>j.id!==chosenVideo(store.get(),s)?.id)?.id || null;
          preview();updateVersions(store.get(),s);break;
        }
        case 'adopt': if(candidateId && report(await dispatch('shot.choose-version',{shotId:s.id,jobId:candidateId}))){comparing=false;preview();render(store.get());toast('已替换这一镜，其他片段沿用');}break;
        case 'generate':
          if(busy)return;busy=true;updateStatus(store.get(),s);
          try{if(report(await dispatch('shot.cut-update',{shotId:s.id,instruction:x.instruction,keep:x.keep,provider:x.provider})) && report(await dispatch('generation.revise',{shotId:s.id})))toast('这一镜已提交，完成后可在版本中预览');}finally{busy=false;updateStatus(store.get(),current());}break;
      }
    }catch(err){toast(err.message,true);}
  };
  $('teSeek').oninput=e=>{ $('teTime').textContent=precise(Number(e.target.value)); };
  $('teSeek').onchange=async e=>{candidateId=null;comparing=false;await stagePlayback.seek?.(Number(e.target.value));if(current())updateVersions(store.get(),current());};
  const zoom = () => {root.querySelector('.te-tracks').style.width=`${Math.max(880,root.querySelector('.te-scroll').clientWidth)*Number($('teZoom').value)}px`;};
  $('teZoom').onchange=()=>{zoom();tracksKey='';render(store.get());};
  new ResizeObserver(zoom).observe(root);
  let trim=null, suppressClick=false;
  root.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();suppressClick=false;}},true);
  root.addEventListener('pointerdown',e=>{
    const handle=e.target.closest('[data-edge]');if(!handle)return;
    const clip=handle.closest('[data-shot]'),d=store.get(),s=d.shots.find(s=>s.id===clip.dataset.shot),m=cutMedia(d,s),job=chosenVideo(d,s);
    e.preventDefault();e.stopPropagation();stagePlayback.preview?.({});clip.draggable=false;
    trim={id:s.id,edge:handle.dataset.edge,x:e.clientX,clip,style:clip.style.cssText,m,next:{...m},scale:(cutTimeline(d).at(-1)?.end||1)/$('tePictures').clientWidth*m.speed,limit:Math.max((s.range.outFrame-s.range.inFrame)/d.project.fps,Number(job?.result?.seconds||job?.result?.duration||job?.seconds)||0)};
    root.setPointerCapture(e.pointerId);
  });
  root.addEventListener('pointermove',e=>{
    if(!trim)return;const fps=store.get().project.fps,delta=(e.clientX-trim.x)*trim.scale,m=trim.m;
    trim.next[trim.edge]=trim.edge==='start'?Math.max(0,Math.min(m.end-m.speed/fps,Math.round((m.start+delta)*fps)/fps)):Math.max(m.start+m.speed/fps,Math.min(trim.limit,Math.round((m.end+delta)*fps)/fps));
    const shift=(trim.next.start-m.start)/trim.scale,width=(trim.next.end-trim.next.start)/(m.end-m.start);
    trim.clip.style.transform=`translateX(${shift}px)`;trim.clip.style.width=`${parseFloat(trim.style.match(/width:\s*([\d.]+)/)?.[1]||0)*width}%`;
    $('teStatus').textContent=`裁切素材 ${number(trim.next.start)}–${number(trim.next.end)}s · 松手应用`;
  });
  const finishTrim=async(e,cancel=false)=>{if(!trim)return;const t=trim;trim=null;t.clip.style.cssText=t.style;t.clip.draggable=true;if(root.hasPointerCapture(e.pointerId))root.releasePointerCapture(e.pointerId);suppressClick=!cancel;
    if(!cancel && (t.next.start!==t.m.start || t.next.end!==t.m.end)){report(await dispatch('shot.cut-update',{shotId:t.id,sourceIn:t.next.start,sourceOut:t.next.end}));await select(t.id,'picture');}else updateStatus(store.get(),current());
  };
  root.addEventListener('pointerup',e=>finishTrim(e));root.addEventListener('pointercancel',e=>finishTrim(e,true));
  let dragged=null;
  root.ondragstart=e=>{const clip=e.target.closest('.te-clip');if(clip){dragged=clip.dataset.shot;e.dataTransfer.setData('text/plain',dragged);e.dataTransfer.effectAllowed='move';}};
  root.ondragover=e=>{if(dragged && e.target.closest('.te-clip')){e.preventDefault();e.dataTransfer.dropEffect='move';}};
  root.ondragend=()=>{dragged=null;};
  root.ondrop=async e=>{const target=e.target.closest('.te-clip');if(!dragged || !target)return;e.preventDefault();const id=dragged;dragged=null;report(await dispatch('shot.reorder',{id,position:store.get().shots.findIndex(s=>s.id===target.dataset.shot)}));};
  return {mount(el,d){if(!el.contains(root))el.replaceChildren(root);render(d);},openHarness(){harness.open();}};
}
