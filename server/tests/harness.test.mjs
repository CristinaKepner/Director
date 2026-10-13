import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import * as R from '../../core/index.js';
import {chosenVideo} from '../../core/cut.js';
import {harnessSignature,harnessIssue,runIsFresh} from '../../core/harness.js';
import {createHarnessRunner} from '../src/harness.mjs';
import {createHarnessInspector} from '../src/harness-inspector.mjs';
import {createMosshubAdapter} from '../src/adapters/mosshub.mjs';
import {createArkAdapter} from '../src/adapters/ark.mjs';
import {createJudge} from '../src/adapters/judge.mjs';
const {store,dispatch,setHooks,persistable,loadProjectData}=R;
const tick=()=>new Promise(r=>setTimeout(r,3));
const record=id=>store.get().harness.runs.find(r=>r.id===id);
async function until(fn){for(let i=0;i<500;i++){if(fn())return;await tick();}assert.fail('task did not settle');}
async function done(id){await until(()=>!['queued','running'].includes(record(id).status));return record(id);}
let runner;
test.afterEach(()=>{runner?.close();runner=null;setHooks({harness:null,generation:null});});
function setup(inspect=async()=>({reports:[],evidence:[]}),generation=null){
 runner?.close();dispatch('project.set-state',{state:'EDIT'});dispatch('scene.demo',{name:'city-edge'});
 store.patch(d=>{d.shots=d.shots.slice(0,1);const s=d.shots[0];s.range={inFrame:0,outFrame:120};s.selectedGenerationId='old';s.generationJobs=['old'];s.cut={};d.project.fps=24;d.jobs=[{id:'old',shotId:s.id,provider:'seedance-2.5',mode:'t2v',status:'done',seconds:5,result:{kind:'video',url:'/media/old.mp4'}}];d.harness={runs:[]};d.project.harnessSpec={visual:true,maxAttempts:2,maxVideoSeconds:10,maxChecks:4};});
 runner=createHarnessRunner({R,inspector:{visualReady:true,inspect},pollMs:1,waitMs:200});setHooks({harness:runner,generation});
 return store.get().shots[0].id;
}
function visualFailure(shotId){return harnessIssue('visual-action','fail','人物没有按要求回头',{shotId,fix:{kind:'regenerate',instruction:'让绿衣朋友回头，其余四人保持原位。'}});}
async function failingCheck(){const out=dispatch('harness.check');assert.equal(out.ok,true);await done(out.id);return out.id;}

test('contracts validate budgets, checks do not edit the timeline, and edits invalidate reports',async()=>{
 const id=setup();for(const p of [{maxAttempts:4},{maxChecks:-1},{maxVideoSeconds:181},{people:1.2},{targetSeconds:0},{visual:'yes'},{arbitrary:true}])assert.equal(dispatch('harness.configure',p).ok,false);
 dispatch('harness.configure',{targetSeconds:120,introSeconds:3,people:5});const before=harnessSignature(store.get());const r=await done(dispatch('harness.check').id);
 assert.equal(r.status,'needs_review');assert.equal(r.reports.find(x=>x.code==='duration').status,'fail');assert.equal(harnessSignature(store.get()),before);
 dispatch('shot.cut-update',{shotId:id,caption:'changed'});assert.equal(runIsFresh(store.get(),r),false);assert.equal(dispatch('harness.repair',{runId:r.id,issueId:r.reports[0].id}).error,'STALE_REPORT');
});
test('a bounded two-attempt repair rechecks candidates, keeps the adopted source and supports undo without losing paid jobs',async()=>{
 let submissions=0, reserved=false;const id=setup(async({d,shotId})=>({reports:chosenVideo(d,d.shots[0]).id==='old'||submissions===1?[visualFailure(shotId)]:[harnessIssue('visual-action','pass','动作符合要求',{shotId})]}),{name:'fixture',supports:()=>true,submit(job,update){submissions++;const r=record(job.harnessRunId);reserved=r.used.videoSeconds===5*submissions&&r.pendingJobId===job.id&&r.attempts.length===submissions;update(job.id,{status:'done',result:{kind:'video',url:`/media/${job.id}.mp4`}});}});
 const source=await failingCheck(),out=dispatch('harness.repair',{runId:source,issueId:`${id}:visual-action`});assert.equal(out.ok,true);const r=await done(out.id);
 assert.equal(submissions,2);assert.equal(reserved,true);assert.equal(r.status,'needs_review');assert.equal(r.candidateChecked,true);assert.equal(r.used.videoSeconds,10);assert.equal(r.used.checks,2);assert.equal(chosenVideo(store.get(),store.get().shots[0]).id,'old');
 const candidate=r.candidateJobId;assert.equal(dispatch('harness.adopt',{runId:r.id}).ok,true);assert.equal(chosenVideo(store.get(),store.get().shots[0]).id,candidate);
 dispatch('project.undo');assert.equal(chosenVideo(store.get(),store.get().shots[0]).id,'old');assert.equal(store.get().jobs.filter(j=>j.harnessRunId===r.id).length,2);assert.equal(record(r.id).used.videoSeconds,10);
});
test('video and visual budgets prevent upstream submissions; transport errors never trigger automatic resubmission',async()=>{
 let calls=0;const id=setup(async({shotId})=>({reports:[visualFailure(shotId)]}),{supports:()=>true,submit(job,update){calls++;update(job.id,{status:'failed',error:'ambiguous timeout'});}});
 const source=await failingCheck();dispatch('harness.configure',{maxVideoSeconds:4});let r=await done(dispatch('harness.repair',{runId:source,issueId:`${id}:visual-action`}).id);assert.equal(calls,0);assert.match(r.note,/预算/);
 dispatch('harness.configure',{maxVideoSeconds:10,maxChecks:0});r=await done(dispatch('harness.repair',{runId:source,issueId:`${id}:visual-action`}).id);assert.equal(calls,0);assert.match(r.note,/检查预算/);
 dispatch('harness.configure',{maxChecks:4});r=await done(dispatch('harness.repair',{runId:source,issueId:`${id}:visual-action`}).id);assert.equal(calls,1);assert.equal(r.used.attempts,1);assert.equal(r.candidateJobId,undefined);
});
test('pause, quick resume and cancel stop late check writes; cancelled work cannot restart',async()=>{
 const releases=[];setup(()=>new Promise(resolve=>releases.push(resolve)));const id=dispatch('harness.check').id;await until(()=>releases.length===1);
 assert.equal(dispatch('harness.pause',{runId:id}).ok,true);assert.equal(dispatch('harness.resume',{runId:id}).ok,true);releases[0]({reports:[]});await until(()=>releases.length===2);
 assert.equal(record(id).cursor,0);assert.equal(record(id).used.checks,2);dispatch('harness.cancel',{runId:id});releases[1]({reports:[harnessIssue('late','fail','late')]});await tick();assert.equal(record(id).status,'cancelled');assert.equal(record(id).reports.length,0);assert.equal(dispatch('harness.resume',{runId:id}).error,'NOT_PAUSED');
});
test('editing while inspection is in flight rejects its old result',async()=>{
 let release;const shotId=setup(()=>new Promise(resolve=>release=resolve)),id=dispatch('harness.check').id;await until(()=>release);
 dispatch('shot.cut-update',{shotId,caption:'new'});release({reports:[harnessIssue('old','fail','old')]});await done(id);assert.equal(record(id).status,'stale');assert.equal(record(id).reports.length,0);
});
test('a deterministic subtitle repair is checked and undoable while its run ledger remains',async()=>{
 const shotId=setup();store.patch(d=>d.shots[0].cut={caption:'Paris',captionRange:{start:1,end:9}});const source=await failingCheck();const id=dispatch('harness.repair',{runId:source,issueId:`${shotId}:caption-range`}).id;await done(id);
 assert.deepEqual(store.get().shots[0].cut.captionRange,{start:1,end:5});dispatch('project.undo');assert.deepEqual(store.get().shots[0].cut.captionRange,{start:1,end:9});assert.ok(record(id));assert.equal(record(id).used.videoSeconds,0);
});
test('reload pauses running work, queries an existing remote task once and never resubmits',async()=>{
 let submit=0,resume=0;const shotId=setup(async()=>({reports:[]}),{supports:()=>true,submit(){submit++;},resume(job,update){resume++;update(job.id,{status:'done',result:{kind:'video',url:'/media/restored.mp4'}});}});
 const d=store.get(),signature=harnessSignature(d);store.patch(d=>{d.jobs.push({id:'pending',shotId,provider:'seedance-2.5',mode:'t2v',status:'running',harnessRunId:'restart',adapter:{taskId:'upstream-1'}});d.harness.runs.push({id:'restart',projectId:d.project.id,kind:'repair',status:'running',phase:'waiting',shotIds:[shotId],signature,spec:{...d.project.harnessSpec},used:{attempts:1,videoSeconds:5,checks:0},reports:[],events:[],attempts:[{jobId:'pending'}],pendingJobId:'pending',baselineJobId:'old',issue:visualFailure(shotId)});});
 loadProjectData(persistable());assert.equal(record('restart').status,'paused');assert.equal(store.get().jobs.at(-1).harnessInterrupted,true);
 assert.equal(dispatch('harness.resume',{runId:'restart'}).ok,true);await done('restart');assert.equal(resume,1);assert.equal(submit,0);assert.equal(record('restart').candidateChecked,true);assert.equal(chosenVideo(store.get(),store.get().shots[0]).id,'old');
});
test('an interrupted reserved submission without a remote id never repeats',async()=>{
 let submit=0;const shotId=setup(async()=>({reports:[]}),{supports:()=>true,submit(){submit++;}});store.patch(d=>d.harness.runs.push({id:'uncertain',projectId:d.project.id,kind:'repair',status:'paused',phase:'submit_reserved',shotIds:[shotId],signature:harnessSignature(d),spec:d.project.harnessSpec,used:{attempts:1,videoSeconds:5,checks:0},reports:[],events:[],attempts:[],issue:visualFailure(shotId)}));
 dispatch('harness.resume',{runId:'uncertain'});await done('uncertain');assert.equal(submit,0);assert.match(record('uncertain').note,/未重复提交/);
});
test('a missing remote task number and a project switch both preserve uncertain work without late writes',async()=>{
 let release;const shotId=setup(()=>new Promise(r=>release=r));const id=dispatch('harness.check').id;await until(()=>release);const saved=persistable();loadProjectData(saved);release({reports:[visualFailure(shotId)]});await tick();assert.equal(record(id).status,'paused');assert.equal(record(id).reports.length,0);
});

const bin='/Applications/导演台.app/Contents/Resources/app-src/bin/ffmpeg';
test('real media checks expose missing audio, black intervals and sampled evidence without asserting visual success',{skip:!fs.existsSync(bin)},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'director-harness-'));try{
 const generated=spawnSync(bin,['-y','-f','lavfi','-i','color=c=black:s=128x224:r=24:d=1','-c:v','libx264',path.join(dir,'old.mp4')]);assert.equal(generated.status,0);
 const shotId=setup();store.patch(d=>d.shots[0].range.outFrame=24);
 const inspector=createHarnessInspector({film:{ready:true,bin},judge:null,mediaDir:dir});const r=await inspector.inspect({d:store.get(),shotId,runId:'fixture',visual:false});
 assert.equal(r.reports.find(x=>x.code==='media-decode').status,'pass');assert.equal(r.reports.find(x=>x.code==='audio-level').status,'unclear');assert.equal(r.reports.find(x=>x.code==='black-frames').status,'unclear');assert.equal(r.reports.find(x=>x.code==='visual-unchecked').status,'unclear');assert.equal(r.evidence.length,6);assert.ok(r.evidence.every(x=>x.time>=0&&x.time<=1&&fs.existsSync(path.join(dir,path.basename(x.url)))));
 fs.unlinkSync(path.join(dir,'old.mp4'));const bad=await inspector.inspect({d:store.get(),shotId,runId:'missing',visual:true});assert.equal(bad.reports[0].code,'media-file');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('MossHub recovery only queries the original id and never creates another video',async()=>{
 const calls=[];const adapter=createMosshubAdapter({apiKey:'fixture',catalog:{video:['MiniMax-H3-Max'],image:[]},pollMs:0,fetchImpl:async(url,opts)=>{calls.push([url,opts.method]);return new Response(JSON.stringify({task:{status:'succeeded',content:{video_url:'https://fixture.invalid/result.mp4'}}}));}});
 const out=await new Promise(resolve=>adapter.resume({id:'existing',provider:'minimax-h3-max',adapter:{taskId:'original',model:'MiniMax-H3-Max',duration:5}},(id,p)=>{if(p.status)resolve(p);}));assert.equal(out.status,'done');assert.deepEqual(calls,[['https://api.mosshub.cn/hailuo/v2/query/video_generation/original','GET']]);
});
test('Ark recovery only queries the original id and never creates another video',async()=>{
 const original=globalThis.fetch,calls=[];globalThis.fetch=async(url,opts)=>{calls.push([url,opts.method]);return new Response(JSON.stringify({status:'succeeded',content:{video_url:'https://fixture.invalid/result.mp4'}}));};try{
 const adapter=createArkAdapter({apiKey:'fixture',pollMs:1,getJob:()=>({status:'running'})});const out=await new Promise(resolve=>adapter.resume({id:'existing',adapter:{taskId:'original',model:'seedance',seconds:5,ratio:'9:16'}},(id,p)=>{if(p.status)resolve(p);}));assert.equal(out.status,'done');assert.deepEqual(calls,[['https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/original','GET']]);
 }finally{globalThis.fetch=original;}
});

test('visual judge uses the compatible output limit and treats missing or malformed criteria as unclear',async()=>{
 let body;const judge=createJudge({apiKey:'fixture',model:'gpt-6-astra',ffmpeg:'fixture',fetchImpl:async(url,options)=>{body=JSON.parse(options.body);return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({checks:[{aspect:'action',status:'pass',note:'动作已出现'},{aspect:'people',status:'perfect',note:'unsupported'}]})}}]}));}});
 const out=await judge.inspect({frames:[{time:0,data:'data:image/jpeg;base64,fixture'}],seconds:5,hasBaseline:true,hasPrevious:true,hasIdentity:true});
 assert.equal(body.max_completion_tokens,4000);assert.equal(body.max_tokens,undefined);assert.equal(out.checks.length,6);assert.equal(out.checks[0].status,'pass');assert.ok(out.checks.slice(1).every(c=>c.status==='unclear'));assert.match(body.messages[0].content,/证据不足写 unclear/);
});

test('imported invalid budget fields cannot expand paid work and legacy retry cannot bypass the ledger',async()=>{
 setup();store.patch(d=>{d.project.harnessSpec={maxAttempts:900,maxVideoSeconds:9999,maxChecks:9999,visual:'yes'};d.jobs.push({id:'paid-failed',harnessRunId:'old-run',status:'failed'});});
 assert.equal(dispatch('generation.retry',{id:'paid-failed'}).error,'HARNESS_RETRY_BLOCKED');
 const out=dispatch('harness.check');const r=record(out.id);assert.equal(r.spec.maxAttempts,2);assert.equal(r.spec.maxVideoSeconds,30);assert.equal(r.spec.maxChecks,16);await done(out.id);
});

test('truncated and malformed visual responses are explicit failures, never partial passes',async()=>{
 for(const payload of [{finish_reason:'length',message:{content:'{"checks":['}},{message:{content:'{"checks":[broken]}'}}]){
  const judge=createJudge({apiKey:'fixture',ffmpeg:'fixture',fetchImpl:async()=>new Response(JSON.stringify({choices:[payload]}))});
  const out=await judge.inspect({frames:[{time:0,data:'data:image/jpeg;base64,fixture'}],seconds:1});assert.equal(out.ok,false);assert.ok(['VERDICT_TRUNCATED','BAD_VERDICT'].includes(out.error));
 }
});
