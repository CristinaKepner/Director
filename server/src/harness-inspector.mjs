import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {mediaDuration} from './film.mjs';
import {cutMedia,chosenVideo,cutTimeline} from '../../core/cut.js';
import {harnessIssue} from '../../core/harness.js';
const pickEvidence=frames=>[...new Set([0,Math.floor(frames.length/2),frames.length-1])].map(i=>frames[i]).filter(Boolean);
function exec(bin,args,signal){return new Promise((resolve,reject)=>{const c=spawn(bin,args,{stdio:['ignore','ignore','pipe'],signal});let log='';const timer=setTimeout(()=>c.kill(),45000);c.stderr.on('data',b=>log=(log+b.toString()).slice(-16000));c.on('error',e=>{clearTimeout(timer);reject(e);});c.on('close',code=>{clearTimeout(timer);code===0?resolve(log):reject(new Error(`媒体检查失败：${log.slice(-350)}`));});});}
export function createHarnessInspector({film,judge,mediaDir}){
  const fileOf=ref=>{const m=String(ref||'').match(/^\/media\/([^/?#]+)$/);return m?path.join(mediaDir,path.basename(decodeURIComponent(m[1]))):null;};
  async function frame(ref,at,name,signal){const src=fileOf(ref);if(!src||!fs.existsSync(src))return null;const file=path.join(mediaDir,`${String(name).replace(/[^\w-]/g,'_')}.jpg`);await exec(film.bin,['-y','-ss',String(Math.max(0,at)),'-i',src,'-frames:v','1','-vf','scale=512:-2','-q:v','4',file],signal);if(!fs.existsSync(file))return null;return {url:`/media/${path.basename(file)}`,data:`data:image/jpeg;base64,${fs.readFileSync(file).toString('base64')}`,sourceTime:at};}
  return {ready:film.ready,visualReady:!!judge?.ready,
    async inspect({d,shotId,runId,attempt=0,visual,baselineJobId,signal}){
      const row=cutTimeline(d).find(r=>r.shot.id===shotId),shot=row.shot,job=chosenVideo(d,shot),m=cutMedia(d,shot),scope={shotId,start:row.start,end:row.end},reports=[];
      if(!job)return {reports,evidence:[]};
      const file=fileOf(job.result.url);
      if(!file||!fs.existsSync(file))return {reports:[harnessIssue('media-file','fail','采用版视频文件不可读取',{...scope,detail:'请导入到本机媒体库后重新检查。'})],evidence:[]};
      if(!film.ready)return {reports:[harnessIssue('media-probe','unclear','缺少 FFmpeg，无法检查视频',scope)],evidence:[]};
      const dur=await mediaDuration(film.bin,file);
      if(!(dur>0))return {reports:[harnessIssue('media-decode','fail','无法读取视频时长',scope)],evidence:[]};
      reports.push(harnessIssue('source-length',m.end>dur+.1?'unclear':'pass',m.end>dur+.1?'源视频不足，导出会定格补齐':'源素材覆盖剪辑范围',{...scope,detail:`源视频 ${dur}s；使用 ${m.start}–${m.end}s。`}));
      const available=Math.max(.01,Math.min(m.end,dur)-Math.min(m.start,dur-.05)),start=Math.max(0,Math.min(m.start,dur-.05));
      let log='';
      try{log=await exec(film.bin,['-hide_banner','-ss',String(start),'-i',file,'-t',String(available),'-vf','blackdetect=d=0.25:pix_th=0.08','-af','volumedetect','-f','null','-'],signal);reports.push(harnessIssue('media-decode','pass','视频解码正常',scope));}
      catch(e){if(signal?.aborted)throw e;return {reports:[...reports,harnessIssue('media-decode','fail','视频解码失败',{...scope,detail:e.message})],evidence:[]};}
      const black=/black_start:([\d.]+) black_end:([\d.]+)/.exec(log);
      if(black)reports.push(harnessIssue('black-frames','unclear','发现连续黑场，请确认是否为有意留黑',{...scope,start:row.start+Number(black[1])/m.speed,end:Math.min(row.end,row.start+Number(black[2])/m.speed)}));
      const audio=/Stream #.*Audio:/.test(log),mean=/mean_volume:\s*(-?(?:[\d.]+|inf))/.exec(log)?.[1],peak=/max_volume:\s*(-?(?:[\d.]+|inf))/.exec(log)?.[1];
      const quiet=mean==='-inf'||mean==='inf'||Number(mean)<-55;
      reports.push(harnessIssue('audio-level',shot.cut?.muted?'pass':!audio||quiet?'unclear':'pass',shot.cut?.muted?'本镜原声已按设置静音':!audio?'源视频没有音轨':quiet?'原声音轨接近静音':'原声音轨可读取',{...scope,detail:`${peak?`峰值 ${peak} dB；`:''}声音检查覆盖音轨和电平，不判定对白或配乐内容。`}));
      const n=Math.min(12,Math.max(6,Math.ceil(row.seconds*1.2))),frames=[];
      for(let i=0;i<n;i+=3){const batch=Array.from({length:Math.min(3,n-i)},(_,k)=>i+k);const result=await Promise.all(batch.map(async k=>{const sourceTime=start+Math.max(0,available-Math.max(.08,2/d.project.fps))*k/(n-1);try{return await frame(job.result.url,sourceTime,`${runId}_${shotId.replace(/[^\w-]/g,'')}_${attempt}_${k}`,signal);}catch(e){if(signal?.aborted)throw e;return null;}}));frames.push(...result.filter(Boolean));}
      const evidence=frames.map(f=>({url:f.url,sourceTime:f.sourceTime,time:Math.max(row.start,row.start+(f.sourceTime-m.start)/m.speed)}));
      if(frames.length<n)reports.push(harnessIssue('frame-coverage','unclear',`部分画面未抽取成功（${frames.length}/${n}）`,scope));
      if(!visual||!judge?.ready){reports.push(harnessIssue('visual-unchecked','unclear',visual?'视觉检查服务尚未连接':'画面内容尚未进行视觉检查',{...scope,evidence:pickEvidence(evidence),detail:'人物、动作和接镜尚不能判为通过。'}));return {reports,evidence,coverage:{frames:frames.length,audio:'signal-only'}};}
      const context=[];
      const identities=d.assets.filter(a=>a.approved&&a.mediaKind==='image'&&(!shot.targetIds?.length||shot.targetIds.includes(a.entityId))).slice(0,5);
      for(const a of identities){const file=fileOf(a.url);if(file&&fs.existsSync(file)&&/\.(?:png|jpe?g|webp)$/i.test(file)){const mime=/\.png$/i.test(file)?'image/png':/\.webp$/i.test(file)?'image/webp':'image/jpeg';context.push({label:`定妆参考：${a.label||a.entityId}`,data:`data:${mime};base64,${fs.readFileSync(file).toString('base64')}`});}}
      const hasIdentity=context.length>0;
      if(!hasIdentity)reports.push(harnessIssue('visual-identity','unclear','没有可用定妆参考，人物身份一致性待人工确认',scope));
      const baseline=d.jobs.find(j=>j.id===baselineJobId);
      if(baseline){for(const [i,t]of [.1,.5,.9].entries()){try{const f=await frame(baseline.result.url,m.start+(m.end-m.start)*t,`${runId}_baseline_${attempt}_${i}`,signal);if(f)context.push({...f,label:`修改前采用版 ${t}`});}catch(e){if(signal?.aborted)throw e;}}}
      const prev=cutTimeline(d).find(r=>Math.abs(r.end-row.start)<.001&&r.shot.id!==shotId),prevJob=prev&&chosenVideo(d,prev.shot);
      if(prevJob){try{const pm=cutMedia(d,prev.shot),f=await frame(prevJob.result.url,Math.max(pm.start,pm.end-.12),`${runId}_${shotId.replace(/[^\w-]/g,'')}_previous_${attempt}`,signal);if(f)context.push({...f,label:'上一镜结尾，用于检查接镜'});}catch(e){if(signal?.aborted)throw e;}}
      if(baseline&&!context.some(f=>f.label.startsWith('修改前')))reports.push(harnessIssue('baseline-missing','unclear','原版对照帧不可读取，无法确认锁定项',scope));
      if(prevJob&&!context.some(f=>f.label.startsWith('上一镜')))reports.push(harnessIssue('previous-missing','unclear','上一镜尾帧不可读取，接镜待人工确认',scope));
      const verdict=await judge.inspect({shotTitle:shot.title,description:shot.description||'',requirements:d.project.harnessSpec||{},request:shot.cut?.instruction||'',locks:shot.cut?.keep||['identity','background','framing'],frames:frames.map(f=>({...f,time:(f.sourceTime-m.start)/m.speed})),context,seconds:row.seconds,hasIdentity,hasBaseline:context.some(f=>f.label.startsWith('修改前')),hasPrevious:context.some(f=>f.label.startsWith('上一镜')),signal});
      if(!verdict.ok)reports.push(harnessIssue('visual-error','unclear','视觉检查未完成',{...scope,detail:verdict.message||verdict.error,evidence:pickEvidence(evidence)}));
      else for(const check of verdict.checks){const a=Math.max(0,Math.min(row.seconds,Number(check.start)||0)),b=Math.max(a,Math.min(row.seconds,Number(check.end)||row.seconds));reports.push(harnessIssue(`visual-${check.aspect}`,check.status,check.note,{...scope,start:row.start+a,end:row.start+b,evidence:pickEvidence(evidence.filter(f=>f.time>=row.start+a&&f.time<=row.start+b)),fix:check.status==='fail'&&check.repairInstruction?{kind:'regenerate',instruction:check.repairInstruction}:null}));}
      return {reports,evidence,coverage:{frames:frames.length,audio:'signal-only',visual:'sampled',model:judge.model},usage:verdict.usage};
    }
  };
}
