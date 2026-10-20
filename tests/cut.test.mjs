import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../core/index.js';
import { setHooks } from '../core/actions.js';
import { chosenVideo, videoVersions, cutSignature, cutTimeline } from '../core/features/editing/cut.js';
const {store,dispatch,persistable,loadProjectData}=R;
const video=(id,shotId='shot_01',extra={})=>({id,shotId,mode:'t2v',provider:'seedance-2.5',status:'done',result:{kind:'video',url:`/media/${id}.mp4`},...extra});
function setup(){dispatch('project.set-state',{state:'EDIT'});dispatch('scene.demo',{name:'city-edge'});store.patch(d=>{d.jobs=[video('old'),video('new'),video('other','shot_02')];});}

test('only completed generated videos can be chosen, and missing chosen versions do not silently substitute',()=>{
 setup();store.patch(d=>d.jobs.push(video('image','shot_01',{mode:'t2i',result:{kind:'image',url:'/image.png'}}),video('pending','shot_01',{status:'running'})));
 assert.equal(videoVersions(store.get(),'shot_01').length,2);
 assert.equal(dispatch('shot.choose-version',{shotId:'shot_01',jobId:'other'}).error,'VERSION_NOT_PLAYABLE');
 assert.equal(dispatch('shot.choose-version',{shotId:'shot_01',jobId:'pending'}).error,'VERSION_NOT_PLAYABLE');
 assert.equal(dispatch('shot.choose-version',{shotId:'shot_01',jobId:'old'}).ok,true);
 assert.equal(chosenVideo(store.get(),store.get().shots[0]).id,'old');
 store.patch(d=>d.jobs=d.jobs.filter(j=>j.id!=='old'));
 assert.equal(chosenVideo(store.get(),store.get().shots[0]),null);
 assert.equal(dispatch('film.plan',{source:'generated'}).data.clips[0].missing,true);
});

test('adoption persists, undo/redo changes only the cut decision, export uses the chosen video',()=>{
 setup();const before=cutSignature(store.get());
 dispatch('shot.choose-version',{shotId:'shot_01',jobId:'old'});
 assert.equal(dispatch('film.plan',{source:'generated'}).data.clips[0].jobId,'old');
 assert.notEqual(cutSignature(store.get()),before);
 dispatch('project.undo');assert.equal(chosenVideo(store.get(),store.get().shots[0]).id,'new');
 dispatch('project.redo');assert.equal(chosenVideo(store.get(),store.get().shots[0]).id,'old');
 loadProjectData(persistable());assert.equal(chosenVideo(store.get(),store.get().shots[0]).id,'old');
 assert.equal(store.get().jobs.length,3);
});

test('new generations stay candidates, even for old projects without an explicit selection',()=>{
 setup();setHooks({generation:{name:'test',submit(job,update){update(job.id,{status:'done',result:{kind:'video',url:'/candidate.mp4'}});}}});
 const r=dispatch('generation.submit',{shotId:'shot_01',provider:'seedance-2.5',mode:'t2v'});
 assert.equal(r.ok,true);assert.equal(chosenVideo(store.get(),store.get().shots[0]).id,'new');
 assert.equal(store.get().jobs.find(j=>j.id===r.id).result.url,'/candidate.mp4');
 assert.equal(dispatch('shot.choose-version',{shotId:'shot_01',jobId:r.id}).ok,true);
 assert.equal(chosenVideo(store.get(),store.get().shots[0]).id,r.id);
 setHooks({generation:null});
});

test('revision saves context on a single candidate, preserving shot scripts, timing and other shots',()=>{
 setup();const initial=structuredClone(store.get().shots),timing=cutTimeline(store.get());let submitted;
 setHooks({generation:{name:'test',submit(job){submitted=job;}}});
 assert.equal(dispatch('generation.revise',{shotId:'shot_01'}).error,'EMPTY_REVISION');
 dispatch('shot.cut-update',{shotId:'shot_01',instruction:'让绿衣朋友先回头，其他人笑着把他拉回。',provider:'minimax-h3-max',keep:['identity','framing']});
 const r=dispatch('generation.revise',{shotId:'shot_01'});assert.equal(r.ok,true);
 assert.match(submitted.prompt,/让绿衣朋友先回头/);assert.match(submitted.prompt,/Preserve the same characters/);assert.match(submitted.prompt,/framing/);
 assert.equal(store.get().jobs.find(j=>j.id===r.id).revision.baselineJobId,'new');
 assert.equal(chosenVideo(store.get(),store.get().shots[0]).id,'new');
 assert.equal(store.get().shots[0].description,initial[0].description);
 assert.deepEqual(store.get().shots.slice(1),initial.slice(1));
 assert.deepEqual(cutTimeline(store.get()).map(r=>r.seconds),timing.map(r=>r.seconds));
 assert.equal(dispatch('generation.revise',{shotId:'shot_01'}).error,'REVISION_BUSY');
 setHooks({generation:null});
});

test('subtitle and mute edits reach the assembler and do not generate video',async()=>{
 setup();store.patch(d=>d.jobs.push(video('third','shot_03')));const count=store.get().jobs.length;let assembled;
 assert.equal(dispatch('shot.cut-update',{shotId:'shot_01',caption:'五个人，五种意见。',muted:true}).ok,true);
 assert.equal(store.get().jobs.length,count);
 setHooks({film:{name:'test',ready:true,async assemble(edit){assembled=edit;return {ok:true,url:'/film.mp4',seconds:15};}}});
 const r=dispatch('film.export',{source:'generated',allowPartial:false});assert.equal(r.ok,true);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(assembled.clips[0].caption,'五个人，五种意见。');assert.equal(assembled.clips[0].muted,true);assert.equal(assembled.clips[0].jobId,'new');
 assert.equal(store.get().jobs.find(j=>j.id===r.id).cutSignature,cutSignature(store.get()));
 setHooks({film:null});
});

test('invalid editing settings are rejected without changing the project',()=>{
 setup();const before=cutSignature(store.get());
 for(const payload of [{caption:'x'.repeat(201)},{keep:['everything']},{provider:'missing'},{muted:'yes'}])assert.equal(dispatch('shot.cut-update',{shotId:'shot_01',...payload}).error,'BAD_CUT_SETTINGS');
 assert.equal(cutSignature(store.get()),before);
});

test('music is an explicit project edit, captured in exports and retained when a shot changes',async()=>{
 setup();store.patch(d=>{d.assets.push({id:'score',mediaKind:'audio',url:'/media/score.wav',label:'Paris'});d.jobs.push(video('third','shot_03'));});
 assert.equal(dispatch('film.set-music',{assetId:'old'}).error,'AUDIO_ASSET_NOT_FOUND');assert.equal(dispatch('film.set-music',{volume:2}).error,'BAD_VOLUME');
 const before=cutSignature(store.get());assert.equal(dispatch('film.set-music',{assetId:'score',volume:.7}).ok,true);assert.notEqual(cutSignature(store.get()),before);
 dispatch('shot.choose-version',{shotId:'shot_01',jobId:'old'});assert.equal(store.get().project.cutMusic.volume,.7);
 let edit;setHooks({film:{name:'test',ready:true,async assemble(e){edit=e;return {ok:true,url:'/out.mp4'};}}});
 dispatch('film.export',{source:'generated',allowPartial:false});await new Promise(resolve=>setImmediate(resolve));assert.equal(edit.music.url,'/media/score.wav');assert.equal(edit.music.volume,.7);
 dispatch('film.set-music',{assetId:null});assert.equal(store.get().project.cutMusic,null);dispatch('project.undo');assert.equal(store.get().project.cutMusic.assetId,'score');setHooks({film:null});
});

test('source trimming and speed change only the edit, persist and produce an exact export plan',()=>{
 setup();const range=structuredClone(store.get().shots[0].range), before=cutSignature(store.get());
 assert.equal(dispatch('shot.cut-update',{shotId:'shot_01',sourceIn:1,sourceOut:4,speed:1.5,volume:.4}).ok,true);
 const plan=dispatch('film.plan',{source:'generated'}).data;
 assert.equal(plan.clips[0].seconds,2);assert.equal(plan.clips[0].sourceIn,1);assert.equal(plan.clips[0].speed,1.5);assert.equal(plan.clips[0].volume,.4);
 assert.deepEqual(store.get().shots[0].range,range);assert.notEqual(cutSignature(store.get()),before);
 loadProjectData(persistable());assert.equal(cutTimeline(store.get())[0].seconds,2);
 for(const p of [{sourceIn:-1},{sourceOut:1000},{sourceOut:1},{speed:0},{speed:5},{speed:NaN},{volume:2}])assert.equal(dispatch('shot.cut-update',{shotId:'shot_01',...p}).ok,false);
});

test('splitting retimed media keeps continuous source, subtitle intersections and shared versions after deleting the original',()=>{
 setup();dispatch('shot.cut-update',{shotId:'shot_01',sourceIn:1,sourceOut:4,speed:.5,caption:'hello',captionRange:{start:1,end:5}});
 const before=cutTimeline(store.get()).at(-1).end;
 const r=dispatch('shot.cut-split',{shotId:'shot_01',seconds:2});assert.equal(r.ok,true);
 const clips=dispatch('film.plan',{source:'generated'}).data.clips;
 assert.equal(clips[0].seconds,2);assert.equal(clips[1].seconds,4);assert.equal(clips[0].sourceOut,2);assert.equal(clips[1].sourceIn,2);
 assert.deepEqual(clips[0].captionRange,{start:1,end:2});assert.deepEqual(clips[1].captionRange,{start:0,end:3});assert.equal(cutTimeline(store.get()).at(-1).end,before);
 assert.equal(dispatch('shot.choose-version',{shotId:r.id,jobId:'old'}).ok,true);
 dispatch('shot.delete',{id:'shot_01'});assert.equal(chosenVideo(store.get(),store.get().shots[0]).id,'old');assert.equal(dispatch('film.plan',{source:'generated'}).data.clips[0].missing,false);
 dispatch('project.undo');assert.equal(store.get().shots.length,4);
});

test('duplicate shares media but edits independently; undo and reload retain both clips',()=>{
 setup();const r=dispatch('shot.cut-duplicate',{shotId:'shot_01'});assert.equal(r.ok,true);assert.equal(store.get().shots[1].id,r.id);
 dispatch('shot.cut-update',{shotId:r.id,sourceIn:1,sourceOut:3,speed:2,caption:'copy'});
 assert.equal(store.get().shots[0].cut?.caption,undefined);assert.equal(cutTimeline(store.get())[1].seconds,1);
 loadProjectData(persistable());assert.equal(chosenVideo(store.get(),store.get().shots[1]).id,'new');
 assert.equal(dispatch('shot.cut-split',{shotId:r.id,seconds:0}).error,'SPLIT_OUT_OF_RANGE');
});

test('caption styling, timing and SRT use final sequence time after reorder and speed',async()=>{
 const {cutSrt}=await import('../core/features/editing/cut.js');setup();
 const style={size:3.5,color:'#c4b5fd',position:'top'};
 assert.equal(dispatch('shot.cut-update',{shotId:'shot_01',sourceIn:1,sourceOut:4,speed:1.5,caption:'Paris',captionRange:{start:.25,end:1.75},captionStyle:style}).ok,true);
 const plan=dispatch('film.plan',{source:'generated'}).data.clips[0];assert.deepEqual(plan.captionStyle,style);
 assert.match(cutSrt(store.get()),/00:00:00,250 --> 00:00:01,750\nParis/);
 dispatch('shot.reorder',{id:'shot_01',position:1});const start=cutTimeline(store.get())[1].start;
 assert.ok(start>0);assert.match(cutSrt(store.get()),/Paris/);
 for(const p of [{captionRange:{start:0,end:3}},{captionRange:{start:-1,end:1}},{captionStyle:{...style,color:'red'}},{captionStyle:{...style,position:'else'}}])assert.equal(dispatch('shot.cut-update',{shotId:'shot_01',...p}).ok,false);
});
