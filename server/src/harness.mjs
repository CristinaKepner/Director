import {harnessSignature,runIsFresh,localCutChecks,harnessIssue,reportSummary} from '../../core/harness.js';
import {chosenVideo,revisionPrompt,KEEP_OPTIONS,cutTimeline} from '../../core/cut.js';
import {PROVIDERS} from '../../core/schema.js';
export function createHarnessRunner({R,inspector,checkpoint=()=>{},pollMs=250,waitMs=35*60*1000}) {
  const {store,dispatch,getHooks}=R,active=new Map();let closed=false;
  const runOf=id=>store.get().harness?.runs.find(r=>r.id===id);
  const change=(id,fn)=>{store.patch(d=>{const r=d.harness?.runs.find(r=>r.id===id);if(r){fn(r);r.updatedAt=new Date().toISOString();}});checkpoint();};
  const event=(r,note)=>{r.note=note;r.events.push({at:new Date().toISOString(),phase:r.phase,note});r.events=r.events.slice(-100);};
  function guard(id,signal){const r=runOf(id);if(closed||signal.aborted||!r||!['queued','running'].includes(r.status))throw new Error('STOPPED');if(!runIsFresh(store.get(),r)){change(id,x=>{x.status='stale';event(x,'工程已改变，旧报告和修复不会应用；请重新检查');});throw new Error('STOPPED');}return r;}
  function finish(id,status,note){change(id,r=>{r.status=status;r.summary=reportSummary(r.reports);event(r,note);});}
  async function inspect(id,shotId,signal,jobId=null){
    let run=guard(id,signal),visual=run.spec.visual&&inspector.visualReady;
    if(visual&&run.used.checks>=run.spec.maxChecks){visual=false;}
    if(visual)change(id,r=>{r.used.checks++;event(r,`检查 ${shotId} 的画面与接镜`);});
    else change(id,r=>event(r,`检查 ${shotId} 的文件、时长与音轨`));
    const d=structuredClone(store.get());if(jobId)d.shots.find(s=>s.id===shotId).selectedGenerationId=jobId;
    const out=await inspector.inspect({d,shotId,runId:id,attempt:run.used.attempts,visual,baselineJobId:jobId?run.baselineJobId:null,signal});guard(id,signal);
    const reports=[...localCutChecks(d,[shotId]),...out.reports];
    if(run.spec.visual&&!visual)reports.push(harnessIssue('visual-budget','unclear',inspector.visualReady?'视觉检查预算已用完':'视觉服务未连接',{shotId,start:cutTimeline(d).find(r=>r.shot.id===shotId).start,end:cutTimeline(d).find(r=>r.shot.id===shotId).end,detail:'这项不会当作通过。'}));
    change(id,r=>{r.reports=r.reports.filter(i=>i.shotId!==shotId&&!reports.some(n=>n.id===i.id)).concat(reports);r.evidence||={};r.evidence[shotId]=out.evidence||[];r.coverage=out.coverage;r.summary=reportSummary(r.reports);if(out.usage){r.usage||=[];r.usage.push(out.usage);}});
    return reports;
  }
  async function waitJob(id,signal){
    let r=guard(id,signal),job=store.get().jobs.find(j=>j.id===r.pendingJobId);
    if(!job){finish(id,'needs_review','缺少提交记录，无法确认是否计费，不自动重提');return null;}
    if(job.harnessInterrupted){
      if(!job.adapter?.taskId){finish(id,'needs_review','应用中断时尚未记下远端任务号，请核对服务商任务；未重复提交');return null;}
      const resumed=dispatch('generation.resume-query',{id:job.id},{source:'agent',actorId:'harness'});
      if(!resumed.ok){finish(id,'needs_review',resumed.hint||resumed.error);return null;}
    }
    const until=Date.now()+waitMs;
    while(Date.now()<until){guard(id,signal);job=store.get().jobs.find(j=>j.id===runOf(id).pendingJobId);if(!job||!['queued','running'].includes(job.status))break;await new Promise(resolve=>{const t=setTimeout(done,pollMs);function done(){clearTimeout(t);signal.removeEventListener('abort',done);resolve();}signal.addEventListener('abort',done,{once:true});});}
    guard(id,signal);
    if(job?.status==='done'&&job.result?.url)return job;
    // Never blindly resubmit an uncertain upstream operation, including a timeout/transport error.
    finish(id,'needs_review',job?.status==='running'?'生成仍在服务商处理中；候选完成后可在镜头版本查看':`生成未完成：${job?.error||job?.status||'任务记录丢失'}。保留采用版，未自动重试。`);return null;
  }
  async function repair(id,signal){
    let r=guard(id,signal);const shotId=r.shotIds[0],fix=r.issue.fix;
    if(fix.kind==='cut'){
      if(r.phase==='repair'){
        const allowed=['caption','captionRange','volume'];if(!fix.patch||Object.keys(fix.patch).some(k=>!allowed.includes(k)))throw new Error('修复建议包含未允许的编辑字段');
        change(id,x=>{x.beforeCut=structuredClone(store.get().shots.find(s=>s.id===shotId).cut||{});x.phase='cut_reserved';event(x,'准备应用可撤销的剪辑修复');});
        const out=dispatch('shot.cut-update',{shotId,...fix.patch},{source:'agent',actorId:'harness'});if(!out.ok)throw new Error(out.hint||out.error);
        change(id,x=>{x.signature=harnessSignature(store.get());x.phase='recheck';event(x,'剪辑修复已应用，正在复查');});
      }else if(r.phase==='cut_reserved'){finish(id,'needs_review','剪辑提交时中断，请重新检查当前工程；未重复修改');return;}
      await inspect(id,shotId,signal);r=guard(id,signal);finish(id,r.reports.some(i=>i.status!=='pass')?'needs_review':'completed','剪辑修复已复查，可撤销；查看报告中的剩余问题');return;
    }
    if(fix.kind!=='regenerate')throw new Error('该建议需要人工处理');
    while(true){
      r=guard(id,signal);
      if(r.phase==='repair'){
        const d=store.get(),s=d.shots.find(s=>s.id===shotId),baseline=chosenVideo(d,s),provider=s.cut?.provider||baseline?.provider||d.project.videoProvider,P=PROVIDERS[provider];
        const adapter=getHooks().generation;
        if(!P||!adapter?.supports?.(provider)){finish(id,'needs_review','当前视频模型未连接，未提交生成');return;}
        const raw=(s.range.outFrame-s.range.inFrame)/d.project.fps,seconds=Math.max(P.minSeconds||0,Math.ceil(raw));
        if(r.used.attempts>=r.spec.maxAttempts||r.used.videoSeconds+seconds>r.spec.maxVideoSeconds){finish(id,'needs_review','已达到生成次数或秒数预算，保留现有版本');return;}
        if(d.jobs.some(j=>j.shotId===shotId&&['queued','running'].includes(j.status))){finish(id,'needs_review','这一镜已有生成任务，请完成后再修复');return;}
        if(!r.spec.visual||!inspector.visualReady||r.used.checks>=r.spec.maxChecks){finish(id,'needs_review','画面修复需要可用的视觉复查和检查预算，未提交生成');return;}
        const prompt=revisionPrompt(d,s,{instruction:`${r.issue.fix.instruction}\n验收要求：${r.spec.brief}\n${r.feedback||''}`,keep:s.cut?.keep||Object.keys(KEEP_OPTIONS)},baseline);
        const dry=dispatch('generation.submit',{shotId,provider,mode:'t2v',prompt},{dryRun:true,silent:true});if(!dry.ok){finish(id,'needs_review',dry.hint||dry.error);return;}
        // Reserve and persist BEFORE the external request. A crash here is not permission to resubmit.
        change(id,x=>{x.used.attempts++;x.used.videoSeconds+=seconds;x.phase='submit_reserved';event(x,`提交第 ${x.used.attempts} 个候选，计入 ${seconds}s 生成预算`);});
        const out=dispatch('generation.submit',{shotId,provider,mode:'t2v',prompt},{source:'agent',actorId:'harness',harnessRunId:id,harnessAttempt:runOf(id).used.attempts});
        if(!out.ok){finish(id,'needs_review',out.hint||out.error);return;}
        change(id,x=>{x.pendingJobId=out.id;x.phase='waiting';});
      }else if(r.phase==='submit_reserved'){finish(id,'needs_review','提交时中断且结果未知，请核对服务商任务；未重复提交');return;}
      r=guard(id,signal);
      let job;
      if(r.phase==='waiting'){job=await waitJob(id,signal);if(!job)return;change(id,x=>{x.candidateJobId=job.id;x.candidateChecked=false;x.phase='candidate_check';event(x,'候选已生成，原采用版保留，正在复查');});}
      r=guard(id,signal);const reports=await inspect(id,shotId,signal,r.candidateJobId);guard(id,signal);
      change(id,x=>{x.candidateChecked=true;const attempt=x.attempts.find(a=>a.jobId===x.candidateJobId);if(attempt)attempt.summary=reportSummary(reports);});
      const unresolved=reports.filter(i=>i.status==='fail'&&i.fix?.kind==='regenerate');
      r=runOf(id);
      if(unresolved.length&&r.used.attempts<r.spec.maxAttempts&&r.used.checks<r.spec.maxChecks){change(id,x=>{x.feedback=`上一候选仍存在：${unresolved.map(i=>i.summary).join('；')}。请针对这些问题修复。`;x.phase='repair';});continue;}
      finish(id,'needs_review',reports.some(i=>i.status==='fail')?'候选复查仍有问题，请对比后决定是否采用':'候选已复查，请对比后采用；无法判断的项目需人工确认');return;
    }
  }
  async function work(id,signal){
    let r=guard(id,signal);change(id,x=>{x.status='running';event(x,'开始执行');});
    if(r.kind==='repair')return repair(id,signal);
    if(r.cursor===0)change(id,x=>{x.reports=localCutChecks(store.get(),x.shotIds).filter(i=>!i.shotId);});
    while((r=guard(id,signal)).cursor<r.shotIds.length){await inspect(id,r.shotIds[r.cursor],signal);guard(id,signal);change(id,x=>x.cursor++);}
    r=guard(id,signal);finish(id,r.reports.some(i=>i.status!=='pass')?'needs_review':'completed',r.reports.some(i=>i.status!=='pass')?'检查完成，问题已定位到时间线':'检查完成；已覆盖项目通过，视觉结论仅覆盖采样画面');
  }
  const unsubscribe=store.subscribe((d,info)=>{if(info?.loaded)for(const c of active.values())c.abort();});
  return {ready:true,visualReady:inspector.visualReady,checkpoint,
    start(id){if(closed||active.has(id))return;const ctl=new AbortController();active.set(id,ctl);queueMicrotask(()=>work(id,ctl.signal).catch(e=>{const r=runOf(id);if(!ctl.signal.aborted&&r&&['running','queued'].includes(r.status))finish(id,'failed',String(e.message).slice(0,500));}).finally(()=>{active.delete(id);if(runOf(id)?.status==='queued'&&!closed)this.start(id);}));},
    stop(id){active.get(id)?.abort();checkpoint();},
    close(){closed=true;for(const [id,c]of active){c.abort();const r=runOf(id);if(r&&['queued','running'].includes(r.status))change(id,x=>{x.status='paused';event(x,'应用退出，运行已保存，可继续');});}unsubscribe();}
  };
}
