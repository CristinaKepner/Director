// Serializable contracts shared by the runner, timeline and agent action surface.
import {cutTimeline, cutMedia, chosenVideo, cutSignature} from './cut.js';
export const HARNESS_DEFAULTS = {targetSeconds:null,introSeconds:null,people:null,brief:'',visual:true,maxAttempts:2,maxVideoSeconds:30,maxChecks:16};
export const ACTIVE_RUN = ['queued','running'];
export function harnessSpec(d) {
  const raw=d.project.harnessSpec||{},spec={...HARNESS_DEFAULTS};
  for(const k of ['targetSeconds','introSeconds'])if(Number.isFinite(raw[k])&&raw[k]>0&&raw[k]<=36000)spec[k]=raw[k];
  if(Number.isInteger(raw.people)&&raw.people>=1&&raw.people<=100)spec.people=raw.people;
  if(typeof raw.brief==='string')spec.brief=raw.brief.slice(0,4000);
  if(typeof raw.visual==='boolean')spec.visual=raw.visual;
  for(const [k,min,max,int] of [['maxAttempts',1,3,true],['maxVideoSeconds',0,180,false],['maxChecks',0,100,true]])if(Number.isFinite(raw[k])&&raw[k]>=min&&raw[k]<=max&&(!int||Number.isInteger(raw[k])))spec[k]=raw[k];
  return spec;
}
export function harnessSignature(d) {
  const spec=harnessSpec(d);
  const data=JSON.stringify([cutSignature(d),d.project.id,d.project.fps,d.project.aspect,[spec.targetSeconds,spec.introSeconds,spec.people,spec.brief],d.shots.map(s=>[s.id,s.description,s.cut?.instruction,s.cut?.keep,s.locks,s.targetIds]),d.assets.filter(a=>a.approved),d.entities,d.cameras,d.scene]);
  // Cache identity only; not a security hash. Avoid repeating entire scene snapshots in every report.
  let hash=14695981039346656037n;for(let i=0;i<data.length;i++)hash=BigInt.asUintN(64,(hash^BigInt(data.charCodeAt(i)))*1099511628211n);
  return hash.toString(16);
}
export function runIsFresh(d,run){return !!run && run.projectId===d.project.id && run.signature===harnessSignature(d);}
export function harnessIssue(code,status,summary,{shotId=null,start=0,end=start,detail='',fix=null,evidence=[]}={}) {
  return {id:`${shotId||'film'}:${code}`,code,status,summary,shotId,start,end,detail,fix,evidence};
}
export function localCutChecks(d, shotIds) {
  const rows=cutTimeline(d), spec=harnessSpec(d), selected=new Set(shotIds), reports=[];
  const total=rows.at(-1)?.end||0;
  if(shotIds.length===d.shots.length && spec.targetSeconds!=null) reports.push(harnessIssue('duration',Math.abs(total-spec.targetSeconds)<=1/d.project.fps?'pass':'fail',`全片 ${Number(total.toFixed(3))}s / 目标 ${spec.targetSeconds}s`,{detail:'修改镜头时长后重新检查；总时长不自动拉伸。'}));
  if(rows[0] && selected.has(rows[0].shot.id) && spec.introSeconds!=null) reports.push(harnessIssue('intro',Math.abs(rows[0].seconds-spec.introSeconds)<=1/d.project.fps?'pass':'fail',`片头 ${rows[0].seconds}s / 目标 ${spec.introSeconds}s`,{shotId:rows[0].shot.id,end:rows[0].end}));
  for(const r of rows.filter(r=>selected.has(r.shot.id))){
    const s=r.shot, scope={shotId:s.id,start:r.start,end:r.end}, m=cutMedia(d,s);
    const valid=[m.start,m.end,m.speed,m.seconds].every(Number.isFinite)&&m.start>=0&&m.end>m.start&&m.speed>=.25&&m.speed<=4;
    reports.push(harnessIssue('edit-range',valid?'pass':'fail',valid?'剪辑入出点与速度有效':'剪辑范围无效',scope));
    if(!chosenVideo(d,s))reports.push(harnessIssue('missing-video','fail','这一镜没有可用的采用版',{...scope,detail:'请先生成或采用一个视频版本。'}));
    const c=s.cut?.captionRange;
    if(s.cut?.caption && c && (c.start<0||c.end>r.seconds||c.end<=c.start||c.start>=r.seconds)){
      const start=Math.max(0,Math.min(r.seconds,c.start)),end=Math.max(0,Math.min(r.seconds,c.end));
      reports.push(harnessIssue('caption-range','fail','字幕时段超出当前片段',{...scope,detail:'可将字幕时段裁到片段内；没有交集时移除该条字幕，可撤销。',fix:{kind:'cut',patch:end>start?{captionRange:{start,end}}:{caption:'',captionRange:null}}}));
    } else reports.push(harnessIssue('caption-range','pass','字幕时段有效',scope));
  }
  return reports;
}
export function reportSummary(reports){return {pass:reports.filter(i=>i.status==='pass').length,fail:reports.filter(i=>i.status==='fail').length,unclear:reports.filter(i=>i.status==='unclear').length};}
