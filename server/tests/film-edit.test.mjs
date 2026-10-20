import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createFilmAssembler,findFfmpeg,mediaDuration,captionAss} from '../src/features/editing/film.mjs';
const bundled='/Applications/导演台.app/Contents/Resources/app-src/bin/ffmpeg';
const bin=findFfmpeg(process.env.FFMPEG || (fs.existsSync(bundled)?bundled:undefined));
function run(args){const r=spawnSync(bin,args,{maxBuffer:16*1024*1024});assert.equal(r.status,0,r.stderr?.toString());return r.stdout;}
test('caption formatting treats user text literally, including ASS commands',()=>{
 const ass=captionAss('五个人 {\\pos(1,1)}\n巴黎',1080,1920,10);
 assert.match(ass,/0:00:10.00/);assert.match(ass,/五个人 ｛＼pos\(1,1\)｝\\N巴黎/);assert.doesNotMatch(ass,/\{\\pos/);
});
test('assembly preserves exact cut lengths and native audio, pads silence, applies mute and refuses missing media',{skip:!bin},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'director-cut-test-'));
 try{
  const silent=path.join(dir,'silent.mp4'),voiced=path.join(dir,'voiced.mp4');
  run(['-y','-f','lavfi','-i','color=c=blue:s=128x224:r=24','-t','0.7','-c:v','libx264',silent]);
  run(['-y','-f','lavfi','-i','color=c=green:s=128x224:r=24','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','1','-c:v','libx264','-c:a','aac',voiced]);
  const assembly=createFilmAssembler({ffmpeg:bin,mediaDir:dir});
  const filters=run(['-filters']).toString();const caption=filters.includes('subtitles')?'Friends in Paris':'';
  const r=await assembly.assemble({id:'test',width:128,height:224,fps:24,clips:[{path:silent,seconds:2,caption},{path:voiced,seconds:2},{path:voiced,seconds:1,muted:true}]});
  assert.equal(r.ok,true,JSON.stringify(r));assert.ok(Math.abs(await mediaDuration(bin,r.file)-5)<0.1);
  const samples=run(['-i',r.file,'-map','0:a:0','-ac','1','-ar','48000','-f','f32le','pipe:1']);
  const rms=(from,to)=>{let sum=0,n=0;for(let i=Math.round(from*48000);i<Math.round(to*48000);i++){const v=samples.readFloatLE(i*4);sum+=v*v;n++;}return Math.sqrt(sum/n);};
  assert.ok(rms(0,1)<0.001,'silent clips receive a silent audio stream');assert.ok(rms(2.1,2.6)>0.01,'native source audio is retained');assert.ok(rms(4.1,4.6)<0.001,'mute affects only its own clip');
  const bg=await assembly.assemble({id:'music',width:128,height:224,fps:24,clips:[{path:silent,seconds:2}],music:{url:voiced,volume:.5}});
  assert.equal(bg.ok,true,JSON.stringify(bg));assert.ok(Math.abs(await mediaDuration(bin,bg.file)-2)<.05);
  const mixed=run(['-i',bg.file,'-map','0:a:0','-ac','1','-ar','48000','-f','f32le','pipe:1']);let power=0;for(let i=1000;i<10000;i++)power+=mixed.readFloatLE(i*4)**2;assert.ok(power/9000>.0001,'background music is mixed into silent shots');
  const missing=await assembly.assemble({clips:[{path:silent,seconds:1},{path:path.join(dir,'missing.mp4'),seconds:1}]});
  assert.equal(missing.error,'MISSING_MEDIA');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('trimmed accelerated export uses the correct source frames and applies gain and timed caption style',{skip:!bin},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'director-source-edit-'));
 try{
  const source=path.join(dir,'source.mp4');
  run(['-y','-f','lavfi','-i','color=c=red:s=128x224:r=24:d=1','-f','lavfi','-i','color=c=blue:s=128x224:r=24:d=1','-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=2','-filter_complex','[0:v][1:v]concat=n=2:v=1:a=0[v]','-map','[v]','-map','2:a','-c:v','libx264','-c:a','aac',source]);
  const assembly=createFilmAssembler({ffmpeg:bin,mediaDir:dir});
  const r=await assembly.assemble({id:'trim',width:128,height:224,fps:24,clips:[{path:source,sourceIn:1,sourceOut:2,speed:2,seconds:.5,volume:.2}]});
  assert.equal(r.ok,true,JSON.stringify(r));assert.ok(Math.abs(await mediaDuration(bin,r.file)-.5)<.08);
  const rgb=run(['-ss','0.1','-i',r.file,'-frames:v','1','-vf','scale=1:1','-f','rawvideo','-pix_fmt','rgb24','pipe:1']);assert.ok(rgb[2]>rgb[0]+100,'export starts in the blue second half, not at the red source beginning');
  const full=await assembly.assemble({id:'full-gain',width:128,height:224,fps:24,clips:[{path:source,sourceIn:1,sourceOut:2,speed:2,seconds:.5,volume:1}]});
  const power=f=>{const bytes=run(['-i',f,'-map','0:a','-ac','1','-ar','48000','-f','f32le','pipe:1']);let sum=0;for(let i=4000;i<12000;i++)sum+=bytes.readFloatLE(i*4)**2;return sum;};
  assert.ok(power(r.file)/power(full.file)<.08,'gain is applied to the source sound after retiming');
  const ass=captionAss('Paris',1080,1920,5,{start:1.25,end:3.5},{size:4,color:'#123456',position:'top'});
  assert.match(ass,/Dialogue: 0,0:00:01.25,0:00:03.50/);assert.match(ass,/Arial,77,&H00563412/);assert.match(ass,/,1,2,1,8,/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('macOS Chinese captions render distinct glyphs instead of repeated missing-glyph boxes',{
 skip:!bin || process.platform!=='darwin' || !fs.existsSync('/System/Library/Fonts/Supplemental/Arial Unicode.ttf')
},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'director-cjk-caption-'));
 try{
  const source=path.join(dir,'black.mp4');
  run(['-y','-f','lavfi','-i','color=c=black:s=640x360:r=24:d=0.3','-c:v','libx264',source]);
  const assembler=createFilmAssembler({ffmpeg:bin,mediaDir:dir});
  const pixels=[];
  for(const [i,caption] of ['导演台','拍电影'].entries()){
   const r=await assembler.assemble({id:`cjk-${i}`,width:640,height:360,fps:24,clips:[{path:source,seconds:.3,caption,captionStyle:{size:6}}]});
   assert.equal(r.ok,true,JSON.stringify(r));
   pixels.push(run(['-ss','0.1','-i',r.file,'-frames:v','1','-vf','crop=320:80:160:280','-f','rawvideo','-pix_fmt','gray','pipe:1']));
  }
  assert.equal(pixels[0].length,320*80);
  const difference=pixels[0].reduce((n,v,i)=>n+Math.abs(v-pixels[1][i]),0)/pixels[0].length;
  assert.ok(difference>1,'different Chinese words must render different shapes, not identical tofu boxes');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('absolute audio slots cross cuts, honor offsets and mute, and stop at the declared end',{skip:!bin},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'director-audio-slots-'));
 try{
  const source=path.join(dir,'silent.mp4'),voice=path.join(dir,'voice.wav');
  run(['-y','-f','lavfi','-i','color=c=black:s=128x224:r=24:d=1','-c:v','libx264',source]);
  run(['-y','-f','lavfi','-i','sine=frequency=440:duration=3','-c:a','pcm_s16le',voice]);
  const assembler=createFilmAssembler({ffmpeg:bin,mediaDir:dir});
  const r=await assembler.assemble({id:'slots',width:128,height:224,fps:24,clips:[{path:source,seconds:1},{path:source,seconds:1},{path:source,seconds:1}],audioClips:[{url:voice,start:.6,duration:1.2,sourceIn:.5,volume:.5},{url:voice,start:0,duration:3,volume:1,muted:true}]});
  assert.equal(r.ok,true,JSON.stringify(r));const samples=run(['-i',r.file,'-map','0:a','-ac','1','-ar','48000','-f','f32le','pipe:1']);
  const rms=(a,b)=>{let sum=0,n=0;for(let i=Math.round(a*48000);i<Math.round(b*48000);i++){sum+=samples.readFloatLE(i*4)**2;n++;}return Math.sqrt(sum/n);};
  assert.ok(rms(.1,.4)<.001);assert.ok(rms(.75,.9)>.01);assert.ok(rms(1.1,1.5)>.01,'voice remains continuous through the cut');assert.ok(rms(2.1,2.5)<.001);
  const missing=await assembler.assemble({id:'missing-cue',width:128,height:224,clips:[{path:source,seconds:1}],audioClips:[{url:'/media/missing.m4a',start:0,duration:1}]});assert.equal(missing.ok,false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
