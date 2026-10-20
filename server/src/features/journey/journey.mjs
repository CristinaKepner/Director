// Local animatic renderer. No remote generation, cloned voice or stock music dependency.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {mediaDuration} from '../editing/film.mjs';
import {OPTIONS} from '../../../../core/features/journey/journey.js';
function run(bin,args){return new Promise((resolve,reject)=>{const p=spawn(bin,args,{stdio:['ignore','ignore','pipe']});let err='';const timer=setTimeout(()=>{p.kill('SIGKILL');reject(new Error('本机音画预演超时，请缩短后重试'));},180000);p.stderr.on('data',b=>{err=(err+b).slice(-4000);});p.on('error',e=>{clearTimeout(timer);reject(e);});p.on('close',code=>{clearTimeout(timer);code===0?resolve():reject(new Error(`本机音画合成失败：${err.split('\n').filter(l=>/Error|Invalid|No such|failed/i.test(l)).slice(-2).join(' ').slice(0,280)||`进程退出 ${code}`}`));});});}
export function createJourneyRenderer({film,mediaDir,refine=null}){
  const bin=film.bin,mediaUrl=n=>`/media/${n}`;
  return {ready:film.ready,refine,
    async render({id,plan,sound,aspect,fps},update){
      if(!film.ready)throw new Error('找不到 FFmpeg');
      const audio=OPTIONS.sound.find(o=>o.id===sound)||OPTIONS.sound[0];
      if(audio.voice&&plan.some(p=>p.dialogue.trim())&&(process.platform!=='darwin'||!fs.existsSync('/usr/bin/say')))throw new Error('本机临时配音需要 macOS 语音。请选择「让音乐讲述」，或在时间线导入录音。');
      const work=fs.mkdtempSync(path.join(os.tmpdir(),'director-animatic-'));
      fs.mkdirSync(mediaDir,{recursive:true});
      const [width,height]=aspect==='9:16'?[720,1280]:aspect==='1:1'?[960,960]:[1280,720];
      const clips=[],audioClips=[],created=[];let at=0;
      try{
        for(const [i,p] of plan.entries()){
          update({progress:Math.round(i/plan.length*72),note:`制作 ${i+1}/${plan.length} 镜 · 构图草图${audio.voice?'与临时配音':''}`});
          const png=path.join(work,`${i}.png`);fs.writeFileSync(png,Buffer.from(p.png.split(',')[1],'base64'));
          const name=`${id}-${i+1}.mp4`,file=path.join(mediaDir,name);created.push(file);
          await run(bin,['-y','-loop','1','-i',png,'-vf',`scale=${width}:${height},zoompan=z='min(zoom+0.00015,1.06)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=${width}x${height}:fps=${fps},format=yuv420p`,'-t',String(p.seconds),'-an','-c:v','libx264','-preset','veryfast','-crf','21','-movflags','+faststart',file]);
          clips.push({shotId:p.shotId,title:p.title,seconds:p.seconds,url:mediaUrl(name),caption:p.dialogue,index:i+1});
          if(audio.voice&&p.dialogue.trim()){
            const textFile=path.join(work,`${i}.txt`),speech=path.join(work,`${i}.aiff`);fs.writeFileSync(textFile,p.dialogue);
            await run('/usr/bin/say',['-v',/[\u3400-\u9fff]/.test(p.dialogue)?'Tingting':'Samantha','-r','210','-f',textFile,'-o',speech]);
            const duration=await mediaDuration(bin,speech),room=p.seconds-.35;
            if(!duration)throw new Error(`第 ${i+1} 镜临时配音为空，请检查系统语音`);
            const speed=Math.max(1,duration/room);
            if(speed>2)throw new Error(`第 ${i+1} 镜旁白太长：需要约 ${duration.toFixed(1)} 秒，目前只有 ${p.seconds.toFixed(1)} 秒。请缩短旁白或延长镜头。`);
            const voiceName=`${id}-voice-${i+1}.m4a`,voiceFile=path.join(mediaDir,voiceName);created.push(voiceFile);
            await run(bin,['-y','-i',speech,'-af',`atempo=${speed},afade=t=out:st=${Math.max(0,duration/speed-.08)}:d=0.08`,'-c:a','aac','-ar','48000','-b:a','160k',voiceFile]);
            audioClips.push({id:`${id}-voice-${i+1}`,track:'voice',label:`${i+1} · ${p.dialogue.slice(0,24)}`,text:p.dialogue,url:mediaUrl(voiceName),start:at+.15,duration:Math.min(room,duration/speed),sourceIn:0,volume:1,muted:false,origin:'local-tts',shotId:p.shotId});
          }
          at+=p.seconds;
        }
        if(audio.music){
          const name=`${id}-score.m4a`,file=path.join(mediaDir,name);created.push(file);
          // Original procedural pad: A minor intervals, soft pulse. Stored once as an ordinary editable cue.
          const expr='0.22*(sin(2*PI*220*t)+0.5*sin(2*PI*261.6256*t)+0.35*sin(2*PI*329.6276*t))*(0.65+0.35*pow(sin(PI*1.2*t),2))';
          await run(bin,['-y','-f','lavfi','-i',`aevalsrc='${expr}':s=48000:d=${at}`,'-af',`afade=t=in:d=1,afade=t=out:st=${Math.max(0,at-1.5)}:d=1.5`,'-c:a','aac','-b:a','160k',file]);
          audioClips.push({id:`${id}-music`,track:'music',label:'本机原创氛围配乐',url:mediaUrl(name),start:0,duration:at,sourceIn:0,volume:audio.gain,muted:false,origin:'procedural'});
        }
        update({progress:76,note:'合成音画预演 · 字幕与声音保留为独立轨道'});
        const preview=await film.assemble({id:`${id}-preview`,width,height,fps,clips,audioClips},p=>update({progress:76+Math.round((p.progress||0)*.23),note:p.note||'合成预演'}));
        if(!preview.ok)throw new Error(preview.message||preview.hint||preview.error);
        return {clips,audioClips,url:preview.url,seconds:at,kind:'video',fidelity:'animatic',note:'构图草图 + 本机临时配音 / 原创合成配乐；可继续替换真实素材'};
      }catch(e){for(const file of created)fs.rmSync(file,{force:true});throw e;}
      finally{fs.rmSync(work,{recursive:true,force:true});}
    }
  };
}
