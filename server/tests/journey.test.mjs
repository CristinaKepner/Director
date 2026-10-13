import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createFilmAssembler,findFfmpeg,mediaDuration} from '../src/film.mjs';
import {createJourneyRenderer} from '../src/journey.mjs';
const bundled='/Applications/导演台.app/Contents/Resources/app-src/bin/ffmpeg';
const bin=findFfmpeg(process.env.FFMPEG||(fs.existsSync(bundled)?bundled:undefined));
test('local animatic produces separate picture, voice and score media and a playable complete film',{skip:!bin},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'director-journey-test-'));
 try{
  const image=spawnSync(bin,['-f','lavfi','-i','color=c=purple:s=160x90','-frames:v','1','-f','image2pipe','-vcodec','png','pipe:1']);assert.equal(image.status,0);
  const png=`data:image/png;base64,${image.stdout.toString('base64')}`,film=createFilmAssembler({ffmpeg:bin,mediaDir:dir}),renderer=createJourneyRenderer({film,mediaDir:dir});
  const sound=process.platform==='darwin'?'narrated':'music';
  const out=await renderer.render({id:'local-test',sound,aspect:'16:9',fps:24,plan:[{shotId:'a',title:'开场',description:'紫色画面',dialogue:'你好。',seconds:2,png},{shotId:'b',title:'结尾',description:'紫色画面',dialogue:'再见。',seconds:2,png}]},()=>{});
  assert.equal(out.clips.length,2);assert.ok(out.audioClips.some(c=>c.track==='music'));if(sound==='narrated')assert.equal(out.audioClips.filter(c=>c.track==='voice').length,2);
  assert.ok(Math.abs(await mediaDuration(bin,path.join(dir,path.basename(out.url)))-4)<.1);
  const decode=spawnSync(bin,['-v','error','-i',path.join(dir,path.basename(out.url)),'-f','null','-']);assert.equal(decode.status,0,decode.stderr?.toString());
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
