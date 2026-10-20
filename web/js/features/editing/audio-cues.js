import {dispatch,api} from '../../client.js';
import {store} from '../../../../core/store.js';
import {cutTimeline} from '../../../../core/features/editing/cut.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createAudioCueEditor(root,{toast}){
  const tracks=root.querySelector('.te-tracks'),panel=document.createElement('div');panel.className='te-audio-panel';panel.hidden=true;root.querySelector('#teEditor').before(panel);
  const lanes={};for(const [kind,label] of [['voice','旁白'],['music','音乐段'],['sfx','音效']]){const row=document.createElement('div');row.className='te-track';row.innerHTML=`<span class="te-track-label">${label}</span><div class="te-lane te-cue-lane" aria-label="${label}轨道"></div>`;tracks.insertBefore(row,root.querySelector('#tePlayhead'));lanes[kind]=row.querySelector('.te-lane');}
  const add=document.createElement('button');add.className='te-audio-add';add.textContent='＋ 添加声音片段 · 可跨镜头';tracks.insertBefore(add,root.querySelector('#tePlayhead'));
  let selected=null,key='',uploading=false;
  const report=r=>{if(r?.ok)return true;toast(r?.hint||r?.error||'声音未保存',true);return false;};
  function open(id){selected=id;key='';root.classList.add('editing-audio');panel.hidden=false;render(store.get());}
  add.onclick=e=>{e.stopPropagation();open('new');};
  root.addEventListener('click',e=>{if(e.target.closest('.te-audio-panel,.te-cue,.te-audio-add'))return;if(e.target.closest('[data-track],[data-command]')){panel.hidden=true;root.classList.remove('editing-audio');}});
  function render(d){
    const cues=d.project.audioClips||[],total=cutTimeline(d).at(-1)?.end||1;
    const next=JSON.stringify([d.project.id,cues,d.assets.filter(a=>a.mediaKind==='audio'),total,selected]);if(next===key)return;key=next;
    for(const [kind,lane] of Object.entries(lanes)){lane.innerHTML=cues.filter(c=>c.track===kind).map(c=>`<button class="te-cue ${selected===c.id?'selected':''}" data-cue="${esc(c.id)}" data-kind="${kind}" style="left:${Math.min(100,c.start/total*100)}%;width:${Math.max(.5,Math.min(total-c.start,c.duration)/total*100)}%" title="${esc(c.label)} · ${c.start.toFixed(2)}–${(c.start+c.duration).toFixed(2)} 秒" aria-label="编辑声音 ${esc(c.label)}">${c.muted?'静音 · ':''}${esc(c.label||kind)}</button>`).join('');lane.querySelectorAll('button').forEach(b=>b.onclick=e=>{e.stopPropagation();open(b.dataset.cue);});}
    if(panel.hidden)return;
    const c=cues.find(c=>c.id===selected)||{track:'voice',start:0,duration:5,sourceIn:0,volume:1,label:''};
    panel.innerHTML=`<label>轨道<select data-audio="track" aria-label="声音轨道">${[['voice','旁白'],['music','配乐'],['sfx','音效']].map(([k,n])=>`<option value="${k}" ${c.track===k?'selected':''}>${n}</option>`).join('')}</select></label><label>素材<select data-audio="url" aria-label="声音素材">${c.url?`<option value="${esc(c.url)}">${esc(c.label||'当前声音')}</option>`:'<option value="">选择素材或导入录音</option>'}${d.assets.filter(a=>a.mediaKind==='audio'&&a.url!==c.url).map(a=>`<option value="${esc(a.url)}">${esc(a.label)}</option>`).join('')}</select></label><label>名称<input data-audio="label" aria-label="声音名称" value="${esc(c.label)}" maxlength="300"></label>${[['start','开始秒数',0],['duration','持续秒数',.05],['sourceIn','素材入点',0],['volume','音量 0–1',0]].map(([k,n,min])=>`<label>${n}<input data-audio="${k}" aria-label="声音${n}" type="number" step="${k==='volume'?.05:.1}" min="${min}" max="${k==='volume'?1:3600}" value="${Math.round(c[k]*100)/100}"></label>`).join('')}<label>静音<input type="checkbox" data-audio="muted" aria-label="静音声音片段" ${c.muted?'checked':''}></label><button data-audio-command="save">保存声音片段</button><button data-audio-command="upload" ${uploading?'disabled':''}>导入录音 / 音乐</button>${c.id?'<button data-audio-command="delete">删除</button>':''}<input type="file" accept="audio/*" hidden><small>全片绝对时间，可跨越镜头边界；修改同步到连播和导出。分支切换前会自动保留。</small>`;
    panel.querySelector('[data-audio="url"]').onchange=e=>{if(!panel.querySelector('[data-audio="label"]').value)panel.querySelector('[data-audio="label"]').value=e.target.selectedOptions[0].textContent;};
    panel.onclick=async e=>{e.stopPropagation();const cmd=e.target.dataset.audioCommand;if(!cmd)return;
      try{if(cmd==='save'){const p=Object.fromEntries([...panel.querySelectorAll('[data-audio]')].map(el=>[el.dataset.audio,el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value]));if(c.id)p.id=c.id;const r=await dispatch('audio.cue-update',p);if(report(r)){selected=r.id;key='';render(store.get());toast('声音片段已保存');}}
      if(cmd==='delete'){if(report(await dispatch('audio.cue-delete',{id:c.id}))){selected='new';key='';render(store.get());}}
      if(cmd==='upload')panel.querySelector('input[type=file]').click();}catch(err){toast(err.message,true);}
    };
    panel.querySelector('input[type=file]').onchange=async e=>{
      const file=e.target.files[0];if(!file||uploading)return;uploading=true;
      try{const up=await api.post(`upload?label=${encodeURIComponent(file.name)}`,file,{headers:{'content-type':file.type||'audio/mpeg'},timeout:120000});if(!report(up))return;
        if(report(await dispatch('asset.add',{url:up.url,label:file.name,mediaKind:'audio',kind:'upload'}))){key='';render(store.get());panel.querySelector('[data-audio="url"]').value=up.url;panel.querySelector('[data-audio="label"]').value=file.name;toast('已导入；调整时间后保存声音片段');}
      }catch(err){toast(err.message,true);}finally{uploading=false;}
    };
  }
  return {render};
}
export function createCuePlayback(mediaHref,toast){
  const players=new Map(),failed=new Set();
  const pause=()=>players.forEach(p=>p.pause());
  function sync(cues,time,playing){
    const ids=new Set(cues.map(c=>c.id));for(const [id,p] of players)if(!ids.has(id)){p.pause();p.removeAttribute('src');players.delete(id);}
    for(const c of cues){let p=players.get(c.id);if(!p){p=new Audio();p.preload='metadata';p.addEventListener('error',()=>{if(!failed.has(c.url)){failed.add(c.url);toast(`声音素材无法播放：${c.label||'未命名'}`,true);}});players.set(c.id,p);}const url=mediaHref(c.url);if(p.dataset.url!==url){p.pause();p.src=url;p.dataset.url=url;}
      const active=playing&&!c.muted&&time>=c.start&&time<c.start+c.duration;const at=Math.max(0,time-c.start)+(c.sourceIn||0);p.volume=Math.max(0,Math.min(1,c.volume??1));
      if(Number.isFinite(p.duration)&&at<p.duration){if(Math.abs(p.currentTime-at)>.18)p.currentTime=at;if(active&&p.paused)p.play().catch(()=>{});}if(!active||at>=p.duration)p.pause();
    }
  }
  return {sync,pause};
}
