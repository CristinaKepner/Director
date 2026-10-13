import test from 'node:test';
import assert from 'node:assert/strict';
import {store,createEmptyProject,loadProjectData,persistable,historyInfo} from '../core/store.js';
import {dispatch,setHooks} from '../core/actions.js';
import {activeJourney,journeySignature,planFromProject,validPlan,retimePlan,buildJourneyPlan} from '../core/journey.js';
import {cutTimeline,cutSignature,chosenVideo} from '../core/cut.js';
const go=(a,p={})=>{const r=dispatch(a,p);assert.equal(r.ok,true,JSON.stringify(r));return r;};
const tick=()=>new Promise(r=>setImmediate(r));
function start(){loadProjectData(createEmptyProject());setHooks({journey:null});go('journey.start',{brief:'五个朋友在巴黎铁塔下笑闹',seconds:30,aspect:'9:16'});}
function ready(){start();go('journey.choose',{optionId:'experience'});go('journey.choose',{optionId:'balanced'});go('journey.choose',{optionId:'narrated'});}
function frames(){return store.get().shots.map(s=>({shotId:s.id,png:'data:image/png;base64,aGVsbG8='}));}
function renderResult(){return {clips:cutTimeline(store.get()).map(r=>({shotId:r.shot.id,url:'/media/test.mp4',seconds:r.seconds})),audioClips:[{id:'voice',track:'voice',url:'/media/voice.m4a',start:1,duration:4,sourceIn:0,volume:1,muted:false}],url:'/media/preview.mp4'};}

test('old projects load with an empty journey; decisions preserve original and restore edits after save/reopen',()=>{
 start();const root=store.get().journey.nodes[0].id,startId=activeJourney(store.get()).id;
 go('journey.choose',{optionId:'experience'});assert.equal(store.get().shots.length,6);assert.equal(Math.round(cutTimeline(store.get()).at(-1).end),30);assert.equal(store.get().project.aspect,'9:16');
 const a=activeJourney(store.get()).id;
 go('journey.shot-update',{shotId:store.get().shots[0].id,dialogue:'不完美，也很快乐。',description:'朋友笑着回头'});
 const edited=journeySignature(store.get());go('journey.restore',{nodeId:startId});const saved=store.get().journey.nodes.find(n=>n.label==='保留手动修改');assert.ok(saved);assert.equal(store.get().shots.length,0);
 go('journey.choose',{optionId:'reveal'});const b=activeJourney(store.get()).id;assert.notEqual(a,b);assert.equal(store.get().journey.nodes.find(n=>n.id===a).parentId,startId);
 loadProjectData(persistable());go('journey.restore',{nodeId:saved.id});assert.equal(journeySignature(store.get()),edited);go('journey.restore',{nodeId:root});assert.equal(store.get().shots.length,0);assert.equal(historyInfo().undo,0);
});

test('one-dimension pace choice keeps authored content and sound choice keeps timing',()=>{
 start();go('journey.choose',{optionId:'observe'});const before=planFromProject(store.get());go('journey.choose',{optionId:'brisk'});const after=planFromProject(store.get());assert.deepEqual(before.map(p=>[p.title,p.description,p.dialogue,p.framing]),after.map(p=>[p.title,p.description,p.dialogue,p.framing]));assert.notDeepEqual(before.map(p=>p.seconds),after.map(p=>p.seconds));assert.ok(Math.abs(cutTimeline(store.get()).at(-1).end-30)<.001);go('journey.choose',{optionId:'music'});assert.deepEqual(planFromProject(store.get()),after);
});

test('late render stays a candidate when the branch changes and cannot overwrite current edits',async()=>{
 ready();const node=activeJourney(store.get()).id,result=renderResult();let finish;setHooks({journey:{ready:true,render:()=>new Promise(r=>finish=r)}});
 const j=go('journey.render',{frames:frames()});await tick();go('journey.restore',{nodeId:store.get().journey.nodes[1].id});go('journey.choose',{optionId:'reveal'});const current=journeySignature(store.get());finish(result);await tick();await tick();assert.equal(journeySignature(store.get()),current);assert.equal(store.get().jobs.find(x=>x.id===j.id).status,'done');assert.equal(dispatch('journey.adopt-render',{jobId:j.id}).error,'STALE_RENDER');
 go('journey.restore',{nodeId:node});go('journey.adopt-render',{jobId:j.id});assert.ok(chosenVideo(store.get(),store.get().shots[0]));assert.equal(store.get().project.audioClips[0].id,'voice');assert.equal(dispatch('film.plan').data.ready,6);
});

test('same-branch edits during rendering are not replaced; jobs survive ordinary undo',async()=>{
 ready();let finish;const result=renderResult();setHooks({journey:{ready:true,render:()=>new Promise(r=>finish=r)}});const j=go('journey.render',{frames:frames()});await tick();go('shot.cut-update',{shotId:store.get().shots[0].id,caption:'手动字幕'});finish(result);await tick();await tick();assert.equal(store.get().shots[0].cut.caption,'手动字幕');assert.equal(store.get().jobs.find(x=>x.id===j.id).adopted,undefined);go('project.undo');assert.equal(store.get().jobs.find(x=>x.id===j.id).status,'done');
});

test('render auto-adopts a fresh result and reopen retains video and independent audio',async()=>{
 ready();const result=renderResult();setHooks({journey:{ready:true,render:async()=>result}});go('journey.render',{frames:frames()});await tick();await tick();assert.equal(activeJourney(store.get()).source,'animatic');assert.equal(store.get().project.audioClips.length,1);assert.equal(dispatch('film.plan').data.ready,6);loadProjectData(persistable());assert.equal(dispatch('film.plan').data.ready,6);assert.equal(store.get().project.audioClips.length,1);
});

test('audio slots use absolute time, are undoable, persist and invalidate export signatures',()=>{
 ready();const initial=cutSignature(store.get());const r=go('audio.cue-update',{url:'/media/voice.m4a',track:'voice',start:2.4,duration:7,volume:.7,label:'跨镜头旁白'});assert.notEqual(cutSignature(store.get()),initial);go('shot.reorder',{id:store.get().shots[0].id,position:3});assert.equal(store.get().project.audioClips[0].start,2.4);go('audio.cue-update',{id:r.id,start:4});go('project.undo');assert.equal(store.get().project.audioClips[0].start,2.4);loadProjectData(persistable());assert.equal(store.get().project.audioClips[0].duration,7);for(const p of [{start:-1},{duration:0},{volume:2},{track:'picture'}])assert.equal(dispatch('audio.cue-update',{id:r.id,...p}).ok,false);
});

test('invalid requests leave the authored project intact and interrupted renders can be retried',()=>{
 ready();const before=journeySignature(store.get());assert.equal(dispatch('journey.choose',{optionId:'invented'}).ok,false);assert.equal(dispatch('journey.shot-update',{shotId:store.get().shots[0].id,seconds:0}).ok,false);assert.equal(journeySignature(store.get()),before);store.patch(d=>d.jobs.push({id:'interrupted',kind:'journey-render',status:'running'}));loadProjectData(persistable());assert.equal(store.get().jobs.find(j=>j.id==='interrupted').status,'failed');
 assert.ok(validPlan(retimePlan(buildJourneyPlan('海边',120),120,'balanced')));
});

test('branch restoration resets Agent context and preserves a render requested from manual edits',async()=>{
 ready();const original=activeJourney(store.get()).id;
 store.patch(d=>d.agent.messages.push({role:'user',text:'只在这条分支保留的对白'}));
 go('journey.shot-update',{shotId:store.get().shots[0].id,dialogue:'手动改稿'});const result=renderResult();let finish;setHooks({journey:{ready:true,render:()=>new Promise(r=>finish=r)}});
 const r=go('journey.render',{frames:frames()});await tick();const editedNode=activeJourney(store.get()).id;assert.notEqual(editedNode,original);
 go('journey.restore',{nodeId:original});assert.ok(!store.get().agent.messages.some(m=>m.text==='只在这条分支保留的对白'));
 finish(result);await tick();await tick();go('journey.restore',{nodeId:editedNode});assert.ok(store.get().agent.messages.some(m=>m.text==='只在这条分支保留的对白'));go('journey.adopt-render',{jobId:r.id});assert.equal(store.get().shots[0].dialogue,'手动改稿');
});

test('model plans are candidates, cannot change timing, and stale plans are refused',async()=>{
 ready();const plan=planFromProject(store.get());setHooks({journey:{refine:async()=>({plan:plan.map(p=>({...p,title:'具体画面'})),model:'test'})}});
 const j=go('journey.refine');await tick();assert.notEqual(store.get().shots[0].title,'具体画面');go('journey.adopt-plan',{jobId:j.id});assert.equal(store.get().shots[0].title,'具体画面');
 setHooks({journey:{refine:async()=>({plan:plan.map(p=>({...p,seconds:1})),model:'test'})}});const invalid=go('journey.refine');await tick();assert.equal(store.get().jobs.find(j=>j.id===invalid.id).status,'failed');
 setHooks({journey:{refine:async()=>({plan:planFromProject(store.get()),model:'test'})}});const stale=go('journey.refine');await tick();go('journey.shot-update',{shotId:store.get().shots[0].id,dialogue:'保留我'});assert.equal(dispatch('journey.adopt-plan',{jobId:stale.id}).error,'STALE_PLAN');
});
