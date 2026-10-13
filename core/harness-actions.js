import {HARNESS_DEFAULTS,harnessSpec,harnessSignature,runIsFresh,ACTIVE_RUN} from './harness.js';
import {chosenVideo} from './cut.js';
export function registerHarnessActions({register,store,hooks,dispatch,uid}) {
  const get=id=>store.get().harness?.runs?.find(r=>r.id===id);
  const fail=(error,hint)=>({ok:false,error,hint});
  const patch=(id,fn)=>store.patch(d=>{const r=d.harness?.runs.find(r=>r.id===id);if(r)fn(r);});
  register('harness.configure',{doc:'设置成片验收要求和每次运行的预算上限；不启动模型',params:{targetSeconds:'number|null',introSeconds:'number|null',people:'integer|null',brief:'string',visual:'boolean',maxAttempts:'integer 1..3',maxVideoSeconds:'number 0..180',maxChecks:'integer 0..100'},
    validate(p){
      if(Object.keys(p).some(k=>!Object.hasOwn(HARNESS_DEFAULTS,k)))return {error:'UNKNOWN_HARNESS_SETTING'};
      for(const k of ['targetSeconds','introSeconds'])if(p[k]!=null&&(!Number.isFinite(p[k])||p[k]<=0||p[k]>36000))return {error:'BAD_HARNESS_SETTING'};
      if(p.people!=null&&(!Number.isInteger(p.people)||p.people<1||p.people>100))return {error:'BAD_HARNESS_SETTING'};
      if(p.brief!==undefined&&(typeof p.brief!=='string'||p.brief.length>4000)||p.visual!==undefined&&typeof p.visual!=='boolean')return {error:'BAD_HARNESS_SETTING'};
      for(const [k,min,max,int] of [['maxAttempts',1,3,true],['maxVideoSeconds',0,180,false],['maxChecks',0,100,true]])if(p[k]!==undefined&&(!Number.isFinite(p[k])||p[k]<min||p[k]>max||(int&&!Number.isInteger(p[k]))))return {error:'BAD_HARNESS_BUDGET'};
    },handler(p){store.patch(d=>{d.project.harnessSpec={...harnessSpec(d),...p};});return {ok:true};}});
  function create(kind,shotIds,source=null,issue=null){
    const d=store.get();if(!hooks.harness)return fail('NO_HARNESS','请连接导演台后端');
    if(d.harness?.runs?.some(r=>ACTIVE_RUN.includes(r.status)||r.status==='paused'&&r.kind==='repair'))return fail('HARNESS_BUSY','已有任务运行或暂停，请先继续或停止它');
    const id=uid('run'),spec=harnessSpec(d),run={id,projectId:d.project.id,kind,status:'queued',phase:'inspect',shotIds,signature:harnessSignature(d),spec,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),cursor:0,reports:[],attempts:[],used:{checks:0,videoSeconds:0,attempts:0},events:[],sourceRunId:source?.id||null,issue:issue?structuredClone(issue):null};
    if(kind==='repair'){run.phase='repair';run.baselineJobId=chosenVideo(d,d.shots.find(s=>s.id===shotIds[0]))?.id||null;}
    store.patch(x=>{x.harness||={runs:[]};x.harness.runs.push(run);});
    hooks.harness.start(id);return {ok:true,id};
  }
  register('harness.check',{doc:'检查当前片段或全片；按工程预算执行本地和可选视觉检查，保存证据，不修改剪辑',params:{shotId:'string（省略则全片）'},undoable:false,handler({shotId}){const d=store.get();const ids=shotId?[shotId]:d.shots.map(s=>s.id);if(!ids.length||ids.some(id=>!d.shots.some(s=>s.id===id)))return fail('NO_SHOT','请先添加镜头');return create('check',ids);}});
  register('harness.repair',{doc:'按检查记录修复一个问题：直接编辑可撤销，画面问题生成候选并复查；不自动采用候选',params:{runId:'string',issueId:'string'},required:['runId','issueId'],undoable:false,handler({runId,issueId}){const r=get(runId),i=r?.reports.find(i=>i.id===issueId);if(!runIsFresh(store.get(),r))return fail('STALE_REPORT','工程已改变，请重新检查');if(!i?.fix||i.status==='pass'||!i.shotId)return fail('NO_REPAIR','该问题需要人工编辑后再检查');if(r.status!=='completed'&&r.status!=='needs_review')return fail('RUN_NOT_READY','检查结束后再修复');return create('repair',[i.shotId],r,i);}});
  for(const action of ['pause','cancel','resume'])register(`harness.${action}`,{doc:{pause:'暂停检查与后续修复；已提交的模型任务可能继续完成',cancel:'停止本次运行，不再提交后续生成；已生成候选保留',resume:'从检查点继续；已有远端任务只恢复查询，不重新提交'}[action],params:{runId:'string'},required:['runId'],undoable:false,handler({runId}){
    const r=get(runId);if(!r)return fail('NO_RUN','运行记录不存在');
    if(action==='resume'){
      if(!hooks.harness)return fail('NO_HARNESS','请连接导演台后端后继续');
      if(r.status!=='paused')return fail('NOT_PAUSED','只能继续已暂停的运行');
      if(!runIsFresh(store.get(),r)){patch(runId,x=>x.status='stale');return fail('STALE_REPORT','工程已改变，请重新检查');}
      if(store.get().harness.runs.some(x=>x.id!==r.id&&ACTIVE_RUN.includes(x.status)))return fail('HARNESS_BUSY','先等待正在运行的任务');
      patch(runId,x=>{x.status='queued';x.note='从检查点继续';});hooks.harness?.start(runId);
    }else{
      if(!ACTIVE_RUN.includes(r.status)&&r.status!=='paused')return fail('RUN_FINISHED','该运行已结束');
      patch(runId,x=>{x.status=action==='pause'?'paused':'cancelled';x.note=action==='pause'?'已暂停，已提交的模型任务仍可能计费并完成':'已停止；已提交任务的结果会保留为候选';});hooks.harness?.stop(runId);
    }
    return {ok:true};
  }});
  register('harness.adopt',{doc:'采用已复查的候选版本；工程改变时拒绝，支持撤销',params:{runId:'string'},required:['runId'],undoable:false,handler({runId}){const r=get(runId);if(!runIsFresh(store.get(),r))return fail('STALE_REPORT','工程已改变，请重新检查候选');if(!r.candidateJobId||!r.candidateChecked||r.status!=='needs_review')return fail('NO_CANDIDATE','暂无已检查的候选');const out=dispatch('shot.choose-version',{shotId:r.shotIds[0],jobId:r.candidateJobId});if(out.ok)patch(runId,x=>{x.status='completed';x.adopted=true;x.note='已采用候选，可用撤销恢复上一版';x.signature=harnessSignature(store.get());});return out;}});
  register('harness.status',{doc:'读取可恢复的检查/修复运行、问题时间段、预算、证据与候选版本',params:{runId:'string'},undoable:false,handler({runId}){return {ok:true,runs:runId?[get(runId)].filter(Boolean):store.get().harness?.runs||[],ready:!!hooks.harness};}});
}
