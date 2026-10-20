import {OPTIONS,JOURNEY_STEPS,STEP_NAMES,activeJourney,journeySnapshot,journeySignature,snapshotSignature,restoreJourney,buildJourneyPlan,planFromProject,retimePlan,validPlan} from './journey.js';
import {cutTimeline} from '../editing/cut.js';
export function registerJourneyActions({register,store,hooks,dispatch,uid,clearHistory}) {
  const fail=(error,hint)=>({ok:false,error,hint});
  const now=()=>new Date().toISOString();
  function checkpoint(label,extra={}) {
    const d=store.get(),parent=activeJourney(d),id=uid('path');
    const node={...structuredClone(parent||{}),id,parentId:parent?.id||null,label,createdAt:now(),decision:null,renderJobId:null,...extra,agentMessages:structuredClone(d.agent.messages.slice(-60)),snapshot:journeySnapshot(d)};
    store.patch(x=>{x.journey||={head:null,nodes:[]};x.journey.nodes.push(node);x.journey.head=id;});
    return id;
  }
  function stash(){const d=store.get(),n=activeJourney(d);if(n&&snapshotSignature(n.snapshot)!==journeySignature(d))return checkpoint('保留手动修改',{source:'manual'});return n?.id;}
  function applyPlan(plan){
    let d=store.get();
    if(!d.cameras.length)dispatch('camera.create',{name:'分镜预演机位'});
    store.patch(x=>{x.shots=[];x.storyboard=[];x.project.audioClips=[];delete x.project.cutMusic;delete x.project.filmUrl;});
    for(const [i,p] of plan.entries()){
      const out=dispatch('shot.create',{title:p.title,description:p.description,dialogue:p.dialogue,duration:p.seconds,index:String(i+1).padStart(2,'0'),motion:p.framing==='close'?'push-in':'static'});
      if(!out.ok)throw new Error(out.hint||out.error);
      store.patch(x=>{const s=x.shots.find(s=>s.id===out.id);s.journeyFrame=p.framing;s.cut={caption:p.dialogue,muted:true};});
    }
    store.patch(x=>{x.project.currentShotId=x.shots[0]?.id;});
  }
  const def=(doc,params,handler)=>({doc,params,undoable:false,handler});
  register('journey.start',def('从模糊印象开始创作路径，保存当前工程为可恢复的原版；不调用生成模型',{brief:'string',seconds:'12..180',aspect:'16:9|9:16|1:1',useExisting:'boolean'},p=>{
    if(typeof p.brief!=='string'||!p.brief.trim()||p.brief.length>1500)return fail('BAD_BRIEF','写下一点人物、氛围或想留下的画面（1500 字以内）');
    const seconds=p.seconds??30;if(!Number.isFinite(seconds)||seconds<12||seconds>180)return fail('BAD_DURATION','先选择 12–180 秒的分镜');
    if(p.aspect&&!['16:9','9:16','1:1'].includes(p.aspect))return fail('BAD_ASPECT','请选择横屏、竖屏或方形');
    if(store.get().project.recording)return fail('RECORDING','结束录制后再开始新路径');
    stash();
    if(!activeJourney(store.get()))checkpoint('原始工程',{stage:'done',source:'original',brief:'原始工程',choices:{}});
    const existing=p.useExisting?planFromProject(store.get()):null;
    if(existing?.length&&!validPlan(existing))return fail('PLAN_TOO_LARGE','当前镜头超出快速分镜范围，请先缩短至 180 秒、24 镜以内');
    const id=checkpoint('新的印象',{stage:'direction',source:'starter',brief:p.brief.trim(),seconds,aspect:p.aspect||store.get().project.aspect,choices:{},existingPlan:existing?.length?existing:null});
    clearHistory();return {ok:true,id};
  }));
  register('journey.choose',def('选择一个可视化方案，创建子分支并保留所有其他选择',{optionId:'string'},({optionId})=>{
    const n=activeJourney(store.get()),option=OPTIONS[n?.stage]?.find(o=>o.id===optionId);
    if(!option)return fail('BAD_CHOICE','此步骤的方案已改变，请重新选择');
    stash();const d=store.get(),parent=activeJourney(d),choices={...parent.choices,[parent.stage]:optionId};
    let plan=planFromProject(d);
    if(parent.stage==='direction'){
      plan=parent.existingPlan?structuredClone(parent.existingPlan):buildJourneyPlan(parent.brief,parent.seconds,optionId);
      if(parent.existingPlan&&optionId==='reveal')plan=[plan.at(-1),...plan.slice(0,-1)];
      plan=retimePlan(plan,parent.seconds,'balanced',d.project.fps);
      if(!validPlan(plan))return fail('BAD_PLAN','镜头过长，请缩短总时长或增加镜头');
      applyPlan(plan);dispatch('project.set-aspect',{aspect:parent.aspect});
      store.patch(x=>x.project.resolution=parent.aspect==='9:16'?{width:1080,height:1920}:parent.aspect==='1:1'?{width:1080,height:1080}:{width:1920,height:1080});
    }else if(parent.stage==='pace'){
      plan=retimePlan(plan,cutTimeline(d).at(-1)?.end||parent.seconds,optionId,d.project.fps);
      if(!validPlan(plan))return fail('BAD_PLAN','单镜需在 1–60 秒内，试试其他节奏');
      // Changing timing preserves authored content and media, but requires a fresh animatic.
      store.patch(x=>{x.shots.forEach((s,i)=>{s.range.outFrame=s.range.inFrame+Math.round(plan[i].seconds*x.project.fps);if(s.cut){delete s.cut.sourceIn;delete s.cut.sourceOut;delete s.cut.speed;}});});
    }
    const stage=JOURNEY_STEPS[JOURNEY_STEPS.indexOf(parent.stage)+1]||'done';
    const id=checkpoint(option.title,{stage,choices,decision:{dimension:parent.stage,optionId,reason:option.reason,alternatives:OPTIONS[parent.stage].map(o=>({id:o.id,title:o.title}))},source:'choice'});
    clearHistory();return {ok:true,id};
  }));
  register('journey.checkpoint',def('保存当前音画分镜的检查点',{label:'string'},({label})=>{if(!activeJourney(store.get()))return fail('NO_JOURNEY','先开启创作路径');if(label!==undefined&&(typeof label!=='string'||label.length>120))return fail('BAD_LABEL');const id=checkpoint(label?.trim()||'手动检查点',{source:'manual'});clearHistory();return {ok:true,id};}));
  register('journey.restore',def('回到一个检查点；离开前自动保存当前分支的修改',{nodeId:'string'},({nodeId})=>{
    const node=store.get().journey?.nodes.find(n=>n.id===nodeId);if(!node)return fail('NO_CHECKPOINT','检查点不存在');
    if(store.get().project.recording)return fail('RECORDING','结束录制后再切换分支');
    if(store.get().agent.busy)return fail('AGENT_BUSY','当前导演任务结束后再切换分支');
    stash();store.patch(d=>{restoreJourney(d,node.snapshot);d.journey.head=nodeId;d.agent.messages=structuredClone(node.agentMessages||[]);d.agent.pendingPlan=null;});clearHistory();return {ok:true,id:nodeId};
  }));
  register('journey.shot-update',def('修改分镜画面、旁白和景别；旧预演保留，需重新预演后采用',{shotId:'string',title:'string',description:'string',dialogue:'string',framing:'wide|medium|close',seconds:'1..60'},p=>{
    const s=store.get().shots.find(s=>s.id===p.shotId);if(!s)return fail('NO_SHOT');
    const item={...planFromProject(store.get())[store.get().shots.indexOf(s)],...Object.fromEntries(['title','description','dialogue','seconds','framing'].filter(k=>p[k]!==undefined).map(k=>[k,p[k]]))};
    const plan=planFromProject(store.get()).map((a,i)=>i===store.get().shots.indexOf(s)?item:a);if(!validPlan(plan))return fail('BAD_PLAN','每镜 1–60 秒，总长不超过 180 秒；旁白不超过 300 字');
    store.patch(d=>{const shot=d.shots.find(s=>s.id===p.shotId);Object.assign(shot,{title:item.title,description:item.description,dialogue:item.dialogue,journeyFrame:item.framing});shot.range.outFrame=shot.range.inFrame+Math.round(item.seconds*d.project.fps);shot.cut={...shot.cut,caption:item.dialogue};delete shot.cut.sourceIn;delete shot.cut.sourceOut;});return {ok:true};
  }));
  register('journey.refine',def('用已连接的文字模型细化当前分镜；结果作为候选，手动采用',{ },()=>{
    const d=store.get();let n=activeJourney(d);if(!n||!d.shots.length)return fail('NO_PLAN','先选择叙事方向');if(!hooks.journey?.refine)return fail('NO_PLANNER','尚未连接文字模型，可以直接修改每镜的画面和旁白');
    if(d.jobs.some(j=>j.kind==='journey-plan'&&['queued','running'].includes(j.status)))return fail('PLAN_BUSY','分镜细化中');
    stash();n=activeJourney(store.get());
    const id=uid('plan'),projectId=d.project.id;
    store.patch(x=>x.jobs.push({id,kind:'journey-plan',nodeId:n.id,status:'running',createdAt:now(),signature:journeySignature(d),note:'文字模型细化画面与旁白'}));
    Promise.resolve().then(()=>hooks.journey.refine({brief:n.brief,choices:n.choices,plan:planFromProject(d)})).then(out=>{
      if(!validPlan(out.plan)||out.plan.length!==d.shots.length||out.plan.some((p,i)=>Math.abs(p.seconds-planFromProject(d)[i].seconds)>.05))throw new Error('模型返回的分镜不完整，原稿已保留');
      if(store.get().project.id===projectId)store.patch(x=>{const j=x.jobs.find(j=>j.id===id);if(j)Object.assign(j,{status:'done',result:out,note:'待预览采用'});});
    }).catch(e=>{if(store.get().project.id===projectId)store.patch(x=>{const j=x.jobs.find(j=>j.id===id);if(j)Object.assign(j,{status:'failed',error:e.message});});});
    return {ok:true,id};
  }));
  register('journey.adopt-plan',def('采用文字模型细化的候选分镜，并新建检查点',{jobId:'string'},({jobId})=>{
    const d=store.get(),j=d.jobs.find(j=>j.id===jobId&&j.kind==='journey-plan'&&j.status==='done');if(!j)return fail('NO_PLAN');
    if(activeJourney(d)?.id!==j.nodeId||journeySignature(d)!==j.signature)return fail('STALE_PLAN','当前分支已改动，请重新细化，候选仍保留');
    stash();applyPlan(j.result.plan);const id=checkpoint('采用细化分镜',{source:'model',model:j.result.model,usage:j.result.usage});clearHistory();return {ok:true,id};
  }));
  function adopt(jobId){
    const d=store.get(),j=d.jobs.find(j=>j.id===jobId&&j.kind==='journey-render'&&j.status==='done');if(!j?.result)return fail('NO_RENDER');
    if(activeJourney(d)?.id!==j.nodeId||journeySignature(d)!==j.signature)return fail('STALE_RENDER','当前分镜已变化，请重新预演；旧结果保留在原分支记录里');
    store.patch(x=>{
      for(const c of j.result.clips){const s=x.shots.find(s=>s.id===c.shotId);if(!s)continue;const id=uid('animatic');x.jobs.push({id,kind:'animatic',mode:'animatic',provider:'local',model:'构图动态分镜',shotId:s.id,status:'done',result:{kind:'video',url:c.url,seconds:c.seconds},journeyJobId:j.id,createdAt:now()});s.selectedGenerationId=id;s.cut={...s.cut,sourceIn:0,sourceOut:c.seconds,speed:1,muted:true};}
      x.project.audioClips=structuredClone(j.result.audioClips);delete x.project.cutMusic;x.project.filmUrl=null;
      x.jobs.find(a=>a.id===j.id).adopted=true;
    });
    const id=checkpoint('音画预演',{source:'animatic',stage:'done',renderJobId:j.id});clearHistory();return {ok:true,id};
  }
  register('journey.render',def('用构图草图、本机临时配音和原创节拍制作动态分镜；不调用视频生成模型',{frames:'[{shotId,png}]'},({frames})=>{
    const d=store.get();let n=activeJourney(d);if(!n||!validPlan(planFromProject(d)))return fail('NO_PLAN','先完成方向选择，并检查每镜时长');
    if(!hooks.journey?.ready)return fail('NO_RENDERER','连接带 FFmpeg 的导演台后端后可预演');
    if(!Array.isArray(frames)||frames.length!==d.shots.length||frames.some((f,i)=>f.shotId!==d.shots[i].id||typeof f.png!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(f.png)||f.png.length>2000000))return fail('BAD_FRAMES','分镜草图不完整，请重新预演');
    if(d.jobs.some(j=>j.kind==='journey-render'&&['queued','running'].includes(j.status)))return fail('RENDER_BUSY','已有音画预演正在制作');
    stash();n=activeJourney(store.get());
    const id=uid('animatic'),projectId=d.project.id,signature=journeySignature(d),sound=n.choices?.sound||'narrated';
    const job={id,kind:'journey-render',nodeId:n.id,signature,status:'queued',progress:0,createdAt:now(),note:'准备构图草图'};
    store.patch(x=>x.jobs.push(job));
    const update=p=>{if(store.get().project.id===projectId)store.patch(x=>{const j=x.jobs.find(j=>j.id===id);if(j)Object.assign(j,p);});};
    Promise.resolve().then(()=>hooks.journey.render({id,plan:planFromProject(d).map((p,i)=>({...p,shotId:d.shots[i].id,png:frames[i].png})),sound,aspect:d.project.aspect,fps:d.project.fps},p=>update({...p,status:'running'}))).then(out=>{
      update({status:'done',progress:100,result:out,note:'音画预演完成'});
      if(store.get().project.id===projectId&&activeJourney(store.get())?.id===n.id&&journeySignature(store.get())===signature)adopt(id);
    }).catch(e=>update({status:'failed',error:e.message,note:'未替换当前片段，可修改后重试'}));
    return {ok:true,id};
  }));
  register('journey.adopt-render',def('采用当前检查点对应的音画预演',{jobId:'string'},({jobId})=>adopt(jobId)));
  register('audio.cue-update',{doc:'增加或修改独立的旁白/配乐/音效片段，时间基于全片，可跨镜头',params:{id:'string',track:'voice|music|sfx',url:'string',label:'string',start:'seconds',duration:'seconds',sourceIn:'seconds',volume:'0..1',muted:'boolean'},handler(p){
    const cues=store.get().project.audioClips||[],old=cues.find(c=>c.id===p.id);if(p.id&&!old)return fail('NO_CUE');
    const c={id:p.id||uid('audio'),track:'voice',start:0,duration:5,sourceIn:0,volume:1,muted:false,...old,...p};
    if(!['voice','music','sfx'].includes(c.track)||typeof c.url!=='string'||!c.url||!['start','duration','sourceIn','volume'].every(k=>Number.isFinite(c[k]))||c.start<0||c.start>3600||c.sourceIn<0||c.sourceIn>3600||c.duration<=0||c.duration>3600||c.volume<0||c.volume>1||typeof c.muted!=='boolean'||(c.label!=null&&(typeof c.label!=='string'||c.label.length>300)))return fail('BAD_CUE','检查声音的开始时间、时长、素材入点和音量');
    store.patch(d=>{d.project.audioClips=[...(d.project.audioClips||[]).filter(a=>a.id!==c.id),c];});return {ok:true,id:c.id};
  }});
  register('audio.cue-delete',{doc:'移除声音片段，保留原素材，可撤销',params:{id:'string'},handler({id}){store.patch(d=>{d.project.audioClips=(d.project.audioClips||[]).filter(c=>c.id!==id);});return {ok:true};}});
}
