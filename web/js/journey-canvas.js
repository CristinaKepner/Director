import {activeJourney,journeyPath,OPTIONS,STEP_NAMES,planFromProject} from '../../core/journey.js';
import {cutTimeline,chosenVideo} from '../../core/cut.js';

export const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const esc=escapeHTML;
export const seconds=n=>`${Math.round(n*10)/10}s`;
export const stamp=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${(n%60).toFixed(1).padStart(4,'0')}`;
export const icon=(name)=>`<svg class="gi" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const field=(a,b)=>`<div class="jc-kv"><span>${a}</span><b>${esc(b)}</b></div>`;
const text=(v)=>`<p class="jc-copy">${esc(v)}</p>`;
export const GRAPH={width:1170,height:490};

// A view of the existing project, not a second, independently executable graph.
// Wires run through reserved gaps; they describe the actual data dependencies.
export function graphMarkup(d,{shotId,thumb,mediaHref,candidate,busy,refineReady}){
  const n=activeJourney(d),plan=planFromProject(d),rows=cutTimeline(d),i=Math.max(0,d.shots.findIndex(s=>s.id===shotId));
  const s=d.shots[i],p=plan[i],jobs=d.jobs.filter(j=>j.kind?.startsWith('journey-'));
  const running=jobs.find(j=>['queued','running'].includes(j.status)),ready=d.shots.filter(s=>chosenVideo(d,s)).length;
  const voice=d.project.audioClips?.filter(c=>c.track==='voice')||[],music=d.project.audioClips?.filter(c=>c.track==='music')||[];
  const render=jobs.find(j=>j.id===n?.renderJobId)||jobs.filter(j=>j.kind==='journey-render'&&j.nodeId===n?.id).at(-1);
  const refine=jobs.filter(j=>j.kind==='journey-plan'&&j.nodeId===n?.id).at(-1);
  const decision=journeyPath(d).filter(x=>x.decision&&x.source==='choice').at(-1),asset=d.assets.find(a=>a.mediaKind==='image'&&a.approved)||d.assets.find(a=>a.mediaKind==='image');
  const pic=(q,index=i)=>`<img src="${thumb({...q,brief:n?.brief,index},d.project.aspect)}" alt="构图草图">`;
  const nodes=[];
  function node(id,x,y,w,title,body,{symbol='box',state='',action='',height}={}){
    nodes.push({id,x,y,w,port:y+16,html:`<article class="jc-node ${state}" data-node="${id}" style="left:${x}px;top:${y}px;width:${w}px;${height?`min-height:${height}px`:''}"><i class="jc-port in"></i><header>${icon(symbol)}<button ${action||`data-inspect="${id}"`}>${esc(title)}</button><span class="jc-node-state">${state==='working'?'运行中':state==='needs-pick'?'请你选择':state==='ready'?'●':''}</span></header><div class="jc-node-body">${body}</div><i class="jc-port out"></i></article>`});
  }
  node('brief',0,30,160,'创作印象',text(n?.brief||'一个画面、一点情绪，从这里展开。')+`<button class="jc-text-button" data-act="new">＋ 新的印象</button>`,{symbol:'bulb'});
  node('reference',0,182,160,asset?.label||'视觉参照',asset?`<img src="${esc(mediaHref(asset.url))}" alt="${esc(asset.label||'参考图')}"><small>工程素材 · ${asset.approved?'已批准':'待批准'}</small>`:`<div class="jc-ref-empty">${icon('image')}<span>放进你的参考画面</span></div><small>链接、图片或视频</small>`,{symbol:'link',action:'data-act="references"'});
  node('voice',0,333,160,'旁白素材',field('片段',voice.length?`${voice.length} 段临时配音`:'尚未制作')+field('表达',n?.choices?.sound==='music'?'无旁白':'跟随分镜文案'),{symbol:'msg',action:'data-act="audio"'});
  node('music',0,415,160,'音乐素材',field('配乐',music.length?`${music.length} 段 · 独立轨道`:'预演时制作'),{symbol:'gauge',action:'data-act="audio"'});

  node('look',190,49,160,'画面设定',field('风格',d.project.styleZh||d.project.style||'构图草图')+field('画幅',d.project.aspect)+field('帧率',`${d.project.fps} fps`),{symbol:'sliders'});
  node('camera',190,210,160,'机位与景别',p?field('景别',{wide:'全景',medium:'中景',close:'近景'}[p.framing])+field('时长',seconds(p.seconds))+field('镜头',`第 ${i+1} 镜`):text('选定方向后建立镜头'),{symbol:'camera'});
  node('scene',190,336,160,'场景构图',p?`${pic(p)}<small>构图草图 · 点击修改画面</small>`:text('人物与场景会在这里可视化'),{symbol:'box'});

  let choice;
  if(OPTIONS[n?.stage])choice=`<p class="jc-question">${{direction:'想让观众从哪里进入？',pace:'这一段，怎样呼吸？',sound:'让什么带着故事走？'}[n.stage]}</p><div class="jc-options">${OPTIONS[n.stage].map((o,k)=>{const cp=candidate(n,o,d);return `<div><button data-preview="${o.id}" class="jc-option-preview" aria-label="预览 ${esc(o.title)}">${pic(cp[0],k)}<em>${k+1} ${n.stage==='sound'?'♫':'▶'}</em></button><button data-pick="${o.id}" ${busy?'disabled':''}>${esc(o.title)} ${icon('arrow')}</button><small>${esc(o.subtitle)}</small></div>`;}).join('')}</div><small>一次只改变${STEP_NAMES[n.stage]} · 选择会保存为分支</small>`;
  else choice=`<p class="jc-question">${esc(decision?.label||'先建立创作方向')}</p>${p?pic(p):''}<small>${esc(decision?.decision?.reason||'从一个印象，逐步做出决定。')}</small><button class="jc-text-button" data-act="decisions">查看选择与其他分支 ${icon('chev-r')}</button>`;
  node('choice',382,49,196,`选择 · ${STEP_NAMES[n?.stage]||'叙事方向'}`,choice,{symbol:'columns',state:OPTIONS[n?.stage]?'needs-pick':'ready',action:'data-act="decisions"'});
  node('sequence',382,414,196,'镜头顺序',field('顺序',plan.length?plan.map((_,i)=>String(i+1).padStart(2,'0')).join(' → '):'等待选择')+field('节奏',OPTIONS.pace.find(x=>x.id===n?.choices?.pace)?.title||'待定'),{symbol:'list',action:'data-act="timeline"'});

  node('plan',610,30,170,'分镜细化',field('方式',refine?.result?.model||'已连接的文字模型')+`<small>${esc(refine?.error||refine?.note||'画面与旁白一起细化')}</small>`+(refine?.status==='done'?`<div class="jc-actions"><button data-plan-preview="${refine.id}">预览</button><button data-adopt-plan="${refine.id}">采用</button></div>`:`<button data-act="refine" ${!refineReady||running||!p?'disabled':''}>细化候选 ${icon('sparkles')}</button>`),{symbol:'sparkles',state:refine?.status==='running'?'working':''});
  node('render',610,199,170,'动态分镜',field('画面','构图草图 · 本机制作')+field('进度',running?.kind==='journey-render'?`${running.progress||0}%`:render?.status==='done'?'已完成':render?.status==='failed'?'失败，可重试':'尚未制作')+`<small>${esc(render?.error||render?.note||'先预演，再决定正式生成')}</small><button data-act="render" ${busy||running||!p?'disabled':''}>${icon('play')} 制作音画预演</button>`+(render?.status==='done'&&!render.adopted?`<div class="jc-actions"><button data-play="${render.id}">看候选</button><button data-adopt-render="${render.id}">采用</button></div>`:''),{symbol:'clapper',state:running?.kind==='journey-render'?'working':render?.status==='done'?'ready':''});
  node('tts',610,367,170,'旁白 · 临时配音',field('文案',p?.dialogue||'留白')+field('声音',n?.choices?.sound==='music'?'音乐与字幕':'本机系统语音'),{symbol:'msg',action:'data-inspect="camera"'});
  node('checks',812,49,155,'预演检查',`<div class="jc-check">${icon(ready===plan.length&&ready?'check':'timer')}<div>镜头素材<small>${ready} / ${plan.length} 镜有视频</small></div></div><div class="jc-check">${icon('check')}<div>画幅与时长<small>${esc(d.project.aspect)} · ${seconds(rows.at(-1)?.end||0)}</small></div></div><div class="jc-check">${icon(voice.length||music.length?'check':'timer')}<div>音画关系<small>${voice.length} 段旁白 · ${music.length} 段音乐</small></div></div><small>以上为工程检查，成片质量可继续交给视频 Harness。</small><button data-act="checks">打开质量检查</button>`,{symbol:'shield'});
  const pageStart=Math.floor(i/3)*3;
  plan.slice(pageStart,pageStart+3).forEach((q,k)=>{const index=pageStart+k,shot=d.shots[index],video=chosenVideo(d,shot);node(`out${k}`,998,30+k*113,170,`Shot ${String(index+1).padStart(2,'0')}`,`<button class="jc-output" data-shot="${shot.id}">${pic(q,index)}<span>${esc(q.title)}<small>${stamp(rows[index].start)} · ${seconds(q.seconds)}</small></span></button>`,{symbol:'image',action:`data-shot="${shot.id}"`,state:video?'ready':''});});
  node('output',998,391,170,'音画预演',field('全片',`${plan.length} 镜 · ${seconds(rows.at(-1)?.end||0)}`)+`<button data-act="play" ${!p?'disabled':''}>${icon('play')} 连播分镜</button>`,{symbol:'clapper',state:ready===plan.length&&ready?'ready':''});

  const edges=[['brief','choice',17],['reference','camera',168],['look','plan',17],['camera','render',398],['scene','render',404],['choice','render',182],['voice','tts',390],['music','sequence',482],['plan','render',182],['render','checks',349],['tts','output',488],['sequence','output',482],...plan.slice(pageStart,pageStart+3).map((_,k)=>['checks',`out${k}`,355])];
  const wire=([from,to,lane],index)=>{const a=nodes.find(n=>n.id===from),b=nodes.find(n=>n.id===to);const x=a.x+a.w,y=a.port,xx=b.x,yy=b.port,offset=(index%3)*5;const mid=lane+offset;return `<path d="M${x},${y} C${x+16},${y} ${x+16},${mid} ${x+25},${mid} L${xx-25},${mid} C${xx-12},${mid} ${xx-12},${yy} ${xx},${yy}"/>`;};
  return `<svg class="jc-wires" width="${GRAPH.width}" height="${GRAPH.height}" aria-hidden="true">${edges.map(wire).join('')}</svg>${[[0,'REFERENCES · 参照'],[190,'CONTROLS · 画面'],[382,'LOGIC · 决策'],[610,'GENERATE · 生成'],[812,'CHECKS · 检查'],[998,'OUTPUT · 产物']].map(([x,t])=>`<span class="jc-column" style="left:${x}px">${t}</span>`).join('')}${nodes.map(n=>n.html).join('')}`;
}

export function controllerMarkup(d,{shotId,thumb,mediaHref}){
  const n=activeJourney(d),plan=planFromProject(d),rows=cutTimeline(d),total=rows.at(-1)?.end||1,cues=d.project.audioClips||[];
  const percent=x=>Math.max(0,Math.min(100,x/total*100));
  return `<section class="jc-controller" aria-label="音画分镜时间线"><header><button data-act="play" class="jc-play" aria-label="播放音画分镜" ${!rows.length?'disabled':''}>${icon('play')}</button><button data-act="previous" aria-label="上一镜">‹</button><button data-act="next" aria-label="下一镜">›</button><output id="jcTime">00:00.0 / ${stamp(rows.at(-1)?.end||0)}</output><span class="jc-preview-note">● 音画预演 <small>${esc(d.project.aspect)} · ${d.project.fps} fps</small></span><span class="spacer"></span><button data-act="timeline">完整剪辑 ${icon('arrow')}</button></header><div class="jc-tracks"><div class="jc-labels"><span></span><span>${icon('clapper')} 分镜</span><span>${icon('msg')} 旁白</span><span>${icon('gauge')} 音乐 / 音效</span></div><div class="jc-lanes"><div class="jc-ruler">${Array.from({length:11},(_,i)=>`<span style="left:${i*10}%">${seconds(total*i/10)}</span>`).join('')}<input id="jcSeek" type="range" min="0" max="${total}" step="0.05" value="0" aria-label="音画时间线播放位置"></div><div class="jc-picture-lane">${rows.map((r,i)=>`<button class="jc-clip ${r.shot.id===shotId?'selected':''}" data-shot="${r.shot.id}" style="left:${percent(r.start)}%;width:${percent(r.seconds)}%" aria-label="编辑第 ${i+1} 镜 ${esc(r.shot.title)}"><span><i>SC ${String(i+1).padStart(2,'0')}</i> ${esc(r.shot.title)}<em>${seconds(r.seconds)}</em></span><div><img src="${thumb({...plan[i],brief:n?.brief,index:i},d.project.aspect)}" alt=""><img src="${thumb({...plan[i],brief:n?.brief,index:i},d.project.aspect)}" alt=""></div><small>● ${chosenVideo(d,r.shot)?'音画就绪':'构图草图'}</small></button>`).join('')}</div>${[['voice'],['music','sfx']].map(kinds=>`<div class="jc-audio-lane">${cues.filter(c=>kinds.includes(c.track)&&c.start<total).map(c=>`<button data-cue="${esc(c.id)}" class="jc-audio-clip ${c.muted?'muted':''}" style="left:${percent(c.start)}%;width:${percent(Math.min(total-c.start,c.duration))}%" aria-label="编辑声音 ${esc(c.label)}" title="${esc(c.label)} · ${seconds(c.start)} → ${seconds(c.start+c.duration)}"><span>${esc(c.label||c.track)}</span><i aria-hidden="true">${'│'.repeat(80)}</i></button>`).join('')||`<button class="jc-empty-lane" data-inspect="audio">${kinds[0]==='voice'?'添加旁白片段':'添加音乐 / 音效'}</button>`}</div>`).join('')}<div id="jcPlayhead" class="jc-playhead"></div></div></div></section>`;
}
