// Run controls and evidence extend the existing editing timeline.
import {store} from '../../core/store.js';
import {harnessSpec,runIsFresh,reportSummary} from '../../core/harness.js';
import {cutTimeline,chosenVideo} from '../../core/cut.js';
import {PROVIDERS} from '../../core/schema.js';
import {dispatch,client,isOnline} from './client.js';
import {stagePlayback} from './stage-workspace.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${(n%60).toFixed(1).padStart(4,'0')}`;
const names={queued:'排队中',running:'检查 / 修复中',paused:'已暂停',completed:'已完成',needs_review:'待你检查',failed:'运行失败',stale:'工程已改变',cancelled:'已停止'};
const labels={fail:'! 需修改',unclear:'? 待确认',pass:'✓ 通过'};
export function createHarnessPanel({root,mediaHref,toast,onOpen}){
  const bar=document.createElement('div'),panel=document.createElement('section');bar.className='hp-bar';panel.className='hp-panel';panel.hidden=true;panel.setAttribute('aria-label','智能检查与修复');
  bar.innerHTML='<button data-hp="toggle" class="hp-toggle">✦ 智能检查</button><span class="hp-bar-status"></span><span class="te-spacer"></span><button data-hp="current">检查当前片段</button><button data-hp="all">检查全片</button><button data-hp="settings">验收要求与预算</button>';
  root.querySelector('.te-toolbar').after(bar);root.querySelector('#teEditor').after(panel);
  const marker=document.createElement('div');marker.className='hp-markers';marker.setAttribute('aria-label','检查问题时间点');root.querySelector('.te-tracks').append(marker);
  let open=false,settings=false,runId=null,issueId=null,showPass=false,key='',markerKey='',projectId=null,formDraft=null;
  const runs=()=>store.get().harness?.runs||[];
  const selectedRun=()=>runs().find(r=>r.id===runId)||runs().at(-1);
  function toggle(value=true){open=value;panel.hidden=!open;root.querySelector('#teEditor').hidden=open;root.querySelector('#teStatus').hidden=open;bar.querySelector('.hp-toggle').classList.toggle('on',open);if(open)onOpen?.();render(store.get());}
  const checkResult=r=>{if(!r?.ok){toast(r?.hint||r?.error||'操作未完成',true);return false;}return true;};
  function download(r){const url=URL.createObjectURL(new Blob([JSON.stringify(r,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`harness-${r.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function focusIssue(r,i){issueId=i.id;key='';if(i.shotId)await dispatch('shot.select',{id:i.shotId});await stagePlayback.seek?.(i.start||0);if(r.kind==='repair'&&r.candidateJobId)stagePlayback.preview?.({jobId:r.candidateJobId,time:i.start||0});render(store.get());}
  async function action(command,button){
    const d=store.get(),r=selectedRun();
    if(command==='toggle'){settings=false;toggle(!open);return;}
    if(command==='close'){stagePlayback.preview?.({});toggle(false);return;}
    if(command==='settings'){settings=true;formDraft={...harnessSpec(d)};key='';toggle();return;}
    if(command==='back'){settings=false;key='';toggle();return;}
    if(command==='save'){
      const values={...formDraft};for(const k of ['targetSeconds','introSeconds','people'])values[k]=values[k]===''||values[k]==null?null:Number(values[k]);for(const k of ['maxAttempts','maxVideoSeconds','maxChecks'])values[k]=Number(values[k]);
      if(checkResult(await dispatch('harness.configure',values))){settings=false;key='';toast('验收要求已保存');render(store.get());}return;
    }
    if(command==='current'||command==='all'){
      const out=await dispatch('harness.check',command==='current'?{shotId:d.project.currentShotId}:{});if(checkResult(out)){runId=out.id;issueId=null;settings=false;key='';toggle();}return;
    }
    if(!r)return;
    if(command==='export'){download(r);return;}
    if(command==='issue'){const i=r.reports.find(i=>i.id===button.dataset.issue);if(i)await focusIssue(r,i);return;}
    if(command==='repair'){
      const out=await dispatch('harness.repair',{runId:r.id,issueId});if(checkResult(out)){runId=out.id;issueId=null;key='';render(store.get());}return;
    }
    if(command==='compare'){await dispatch('shot.select',{id:r.shotIds[0]});stagePlayback.preview?.({jobId:r.candidateJobId,compare:true});return;}
    if(command==='evidence'){await stagePlayback.seek?.(Number(button.dataset.time));if(r.kind==='repair'&&r.candidateJobId)stagePlayback.preview?.({jobId:r.candidateJobId,time:Number(button.dataset.time)});return;}
    if(['pause','resume','cancel','adopt'].includes(command)){if(checkResult(await dispatch(`harness.${command}`,{runId:r.id}))){if(command==='adopt'){stagePlayback.preview?.({});toast('已采用候选 · 可撤销恢复上一版');}key='';render(store.get());}}
  }
  for(const el of [bar,panel,marker])el.addEventListener('click',e=>{const b=e.target.closest('[data-hp]');if(!b)return;e.stopPropagation();if(el===marker){runId=b.dataset.run;settings=false;toggle();}action(b.dataset.hp,b).catch(err=>toast(err.message,true));});
  panel.addEventListener('change',e=>{if(e.target.id==='hpHistory'){runId=e.target.value;issueId=null;key='';render(store.get());}if(e.target.id==='hpShowPass'){showPass=e.target.checked;key='';render(store.get());}});
  panel.addEventListener('input',e=>{if(e.target.dataset.setting&&formDraft)formDraft[e.target.dataset.setting]=e.target.type==='checkbox'?e.target.checked:e.target.value;});
  function settingsHtml(d){const spec=formDraft||harnessSpec(d),field=(k,label,attrs='')=>`<label>${label}<input data-setting="${k}" aria-label="${label}" type="number" value="${esc(spec[k])}" ${attrs}></label>`;
    return `<div class="hp-heading"><b>验收要求</b><span>空白表示不限定；修改要求后，旧报告需重新检查。</span><button data-hp="back">返回报告</button></div><div class="hp-settings"><div class="hp-spec">${field('targetSeconds','全片目标（秒）','min="1" max="36000" step="0.1"')}${field('introSeconds','片头目标（秒）','min="1" max="36000" step="0.1"')}${field('people','群像人数','min="1" max="100" step="1"')}<label class="hp-brief">画面与动作要求<textarea data-setting="brief" aria-label="画面与动作要求" maxlength="4000" rows="2" placeholder="例如：巴黎铁塔下，五位朋友互相调整站位、笑闹，最后完成转场。">${esc(spec.brief)}</textarea></label></div><div class="hp-budget">${field('maxAttempts','每次修复最多候选数','min="1" max="3" step="1"')}${field('maxVideoSeconds','每次修复生成秒数上限','min="0" max="180" step="1"')}${field('maxChecks','每次运行视觉检查上限','min="0" max="100" step="1"')}<label class="hp-visual"><input type="checkbox" data-setting="visual" ${spec.visual?'checked':''}>视觉检查（使用模型额度）</label><button class="te-primary" data-hp="save">保存要求与预算</button></div></div><div class="hp-foot">额度按候选数、生成秒数和视觉调用次数控制；具体费用按服务商结算。仅做本地检查时不会判断动作是否符合要求。</div>`;
  }
  function render(d){
    if(projectId!==d.project.id){projectId=d.project.id;runId=null;issueId=null;settings=false;key='';markerKey='';formDraft=null;}
    const r=selectedRun(),all=d.harness?.runs||[],active=all.some(x=>['queued','running'].includes(x.status)||x.status==='paused'&&x.kind==='repair'),ready=isOnline()&&client.harness?.ready;
    const summary=r?reportSummary(r.reports):null,fresh=r&&runIsFresh(d,r);
    bar.querySelector('.hp-bar-status').textContent=r?`${fresh?names[r.status]:'报告需更新'} · ${summary.fail} 需修改 · ${summary.unclear} 待确认`:'定位问题 → 局部修复 → 复查候选';
    for(const command of ['current','all'])bar.querySelector(`[data-hp="${command}"]`).disabled=!ready||active||!d.shots.length;
    bar.querySelector('[data-hp="settings"]').disabled=!ready;
    root.querySelector('#teEditor').hidden=open;root.querySelector('#teStatus').hidden=open;
    const markerRun=r,total=cutTimeline(d).at(-1)?.end||1;
    const mk=JSON.stringify([markerRun?.id,markerRun?.reports,markerRun&&runIsFresh(d,markerRun),total]);
    if(mk!==markerKey){markerKey=mk;marker.innerHTML=markerRun?(markerRun.reports||[]).filter(i=>i.shotId&&i.status!=='pass').map(i=>`<button class="hp-marker ${runIsFresh(d,markerRun)?'':'stale'}" data-hp="issue" data-run="${esc(markerRun.id)}" data-issue="${esc(i.id)}" style="left:${Math.max(0,Math.min(99,i.start/total*100))}%" title="${esc(time(i.start)+' '+i.summary)}" aria-label="${esc('检查问题 '+time(i.start)+' '+i.summary)}">${i.status==='fail'?'!':'?'}</button>`).join(''):'';}
    if(!open)return;
    const next=settings?`settings:${projectId}`:JSON.stringify([r,all.map(r=>[r.id,r.status]),fresh,issueId,showPass,client.harness]);if(next===key)return;key=next;
    if(settings){panel.innerHTML=settingsHtml(d);return;}
    if(!r){panel.innerHTML=`<div class="hp-empty"><b>让每次修改都有检查依据</b><span>在「验收要求与预算」设置时长、人数与动作要求，再检查当前片段或全片。结果会标在这条时间线上。</span><button data-hp="close">返回剪辑</button></div>`;return;}
    const reports=r.reports||[],visible=reports.filter(i=>showPass||i.status!=='pass'),i=reports.find(x=>x.id===issueId)||visible[0];if(i)issueId=i.id;
    const busy=['queued','running'].includes(r.status),paused=r.status==='paused',canRepair=fresh&&!active&&['completed','needs_review'].includes(r.status)&&i?.fix&&i.status!=='pass';
    const s=d.shots.find(s=>s.id===i?.shotId),provider=s?.cut?.provider||chosenVideo(d,s)?.provider||d.project.videoProvider,seconds=s?Math.max(PROVIDERS[provider]?.minSeconds||0,Math.ceil((s.range.outFrame-s.range.inFrame)/d.project.fps)):0;
    const budget=r.used||{},scope=r.shotIds.length===d.shots.length?'全片':`${r.shotIds.length} 镜`;
    const evidence=i?.evidence?.length?i.evidence:r.evidence?.[i?.shotId]?.slice(0,3)||[];
    panel.innerHTML=`<div class="hp-heading"><b>${esc(fresh?names[r.status]:'报告需更新')}</b><span>${summary.pass} 通过 · ${summary.fail} 需修改 · ${summary.unclear} 待确认</span><select id="hpHistory" aria-label="检查运行记录">${[...all].reverse().map((x,n)=>`<option value="${esc(x.id)}" ${x.id===r.id?'selected':''}>${all.length-n} · ${x.kind==='repair'?'局部修复':'检查'} · ${esc(names[x.status])}</option>`).join('')}</select>${busy?'<button data-hp="pause">暂停</button>':''}${paused?`<button data-hp="resume" ${fresh?'':'disabled'}>继续</button>`:''}${busy||paused?'<button data-hp="cancel">停止</button>':''}<button data-hp="export">导出记录</button><button data-hp="close">返回剪辑</button></div>
      <div class="hp-progress"><span>${esc(fresh?r.note:'工程已修改，请重新检查；旧报告仅供查看。')}</span><span>${scope} · 视觉 ${budget.checks||0}/${r.spec.maxChecks} 次 · 候选 ${budget.attempts||0}/${r.spec.maxAttempts} · 生成 ${budget.videoSeconds||0}/${r.spec.maxVideoSeconds}s</span></div>
      <div class="hp-results"><div class="hp-list" aria-label="检查结果"><label class="hp-show"><input id="hpShowPass" type="checkbox" ${showPass?'checked':''}>显示通过项</label>${visible.length?visible.map(x=>`<button class="hp-issue ${x.id===i?.id?'selected':''}" data-hp="issue" data-issue="${esc(x.id)}"><span class="hp-badge">${labels[x.status]}</span><span>${esc(x.summary)}</span><small>${time(x.start)}</small></button>`).join(''):`<p>${busy?'正在检查，结果会陆续出现…':reports.length?'已检查项目通过。勾选「显示通过项」查看明细。':'暂无检查结论。'}</p>`}</div><div class="hp-detail">${i?`<b>${esc(i.summary)}</b><p>${time(i.start)}–${time(i.end)}${s?` · ${esc(s.title)}`:''} ${r.kind==='repair'&&r.candidateJobId?'· 以下结论针对候选':''}</p>${i.detail?`<p>${esc(i.detail)}</p>`:''}<div class="hp-evidence">${evidence.map(f=>`<button data-hp="evidence" data-time="${f.time}" title="跳到 ${time(f.time)}"><img loading="lazy" src="${esc(mediaHref(f.url))}" alt="${esc(time(f.time)+' 的检查证据')}"><small>${time(f.time)}</small></button>`).join('')}<div class="hp-fix">${i.fix?`<p>${esc(i.fix.kind==='regenerate'?i.fix.instruction:'按建议调整字幕时段，可撤销。')}</p><button class="te-primary" data-hp="repair" ${canRepair?'':'disabled'}>${i.fix.kind==='regenerate'?'生成修复候选':'应用剪辑修复'}</button>${i.fix.kind==='regenerate'?`<small>每个候选约 ${seconds}s · 最多 ${harnessSpec(d).maxAttempts} 个 · 原采用版保留</small>`:''}`:'<span>在时间线中手动调整后重新检查。</span>'}</div></div>`:`<p>运行记录和证据会保存在工程里，可暂停后继续。</p>`}</div></div>
      <div class="hp-foot"><span>画面结论覆盖采样帧；声音仅检查音轨与电平。</span>${r.candidateJobId?`<button data-hp="compare">对比原版与候选</button><button class="te-primary" data-hp="adopt" ${fresh&&r.candidateChecked&&r.status==='needs_review'?'':'disabled'}>${summary.fail?'仍有问题 · 采用候选':'采用候选'}</button>`:''}</div>`;
  }
  return {render,open(){toggle(true);},close(){toggle(false);}};
}
