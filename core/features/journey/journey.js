// Creative decisions are durable checkpoints; assets and jobs stay in shared ledgers.
import { cutTimeline } from '../editing/cut.js';
export const JOURNEY_STEPS = ['direction', 'pace', 'sound'];
export const STEP_NAMES = {direction:'叙事方向',pace:'镜头节奏',sound:'声音关系',done:'音画分镜'};
export const OPTIONS = {
  direction:[
    {id:'experience',title:'跟着主角进入',subtitle:'先给感受，再展开过程',reason:'适合只有氛围和人物印象时，从一个具体瞬间开始。',beats:['一个瞬间','进入现场','人物靠近','变化发生','情绪高点','留下余韵'],framing:['close','wide','medium','close','wide','wide']},
    {id:'reveal',title:'先看结果，再揭晓',subtitle:'用一个结果制造好奇',reason:'适合产品展示、幕后记录：先让人想看，再解释怎么发生。',beats:['结果先行','回到起点','关键细节','尝试与调整','对比揭晓','一句邀请'],framing:['wide','medium','close','medium','wide','close']},
    {id:'observe',title:'像朋友一样旁观',subtitle:'保留自然的停顿与互动',reason:'适合旅行和日常，不必先想好剧情，让小动作带着故事走。',beats:['环境里的线索','有人走进画面','一个小动作','互相回应','一起完成','不急着结束'],framing:['wide','wide','close','medium','wide','medium']}
  ],
  pace:[
    {id:'balanced',title:'自然推进',subtitle:'短开头 → 展开 → 收束',reason:'把时间留给中段，开场和结尾简洁。',weights:[.1,.17,.18,.2,.23,.12]},
    {id:'brisk',title:'先抓住，再加速',subtitle:'快速入场，重点停留',reason:'前半段快速切换，让关键变化得到最长停留。',weights:[.07,.1,.14,.15,.34,.2]},
    {id:'breathing',title:'留出呼吸',subtitle:'先观察，再慢慢靠近',reason:'给环境、眼神和动作更完整的时间。',weights:[.22,.18,.14,.16,.16,.14]}
  ],
  sound:[
    {id:'narrated',title:'旁白带路',subtitle:'临时配音 + 轻配乐',reason:'用说话串起每镜，适合先检查信息是否讲清。',voice:true,music:true,gain:.12},
    {id:'music',title:'让音乐讲述',subtitle:'配乐 + 画面字幕',reason:'减少解释，用镜头顺序与节奏传达情绪。',voice:false,music:true,gain:.26},
    {id:'voice',title:'像在讲给朋友听',subtitle:'只留旁白与停顿',reason:'先听表达是否自然，再决定是否需要音乐。',voice:true,music:false,gain:0}
  ]
};
const KEYS = ['scene','entities','cameras','lights','shots','takes','storyboard','annotations'];
const PROJECT_KEYS = ['name','fps','aspect','resolution','style','styleZh','currentShotId','programCameraId','cutMusic','audioClips','filmUrl'];
export function journeySnapshot(d) {
  return structuredClone({ ...Object.fromEntries(KEYS.map(k=>[k,d[k]])), project:Object.fromEntries(PROJECT_KEYS.filter(k=>d.project[k]!==undefined).map(k=>[k,d.project[k]])) });
}
export function snapshotSignature(snapshot){const copy=structuredClone(snapshot);delete copy.project.currentShotId;delete copy.project.programCameraId;delete copy.project.filmUrl;return JSON.stringify(copy);}
export const journeySignature = d => snapshotSignature(journeySnapshot(d));
export function restoreJourney(d,snapshot) {
  for(const k of KEYS)d[k]=structuredClone(snapshot[k] || []);
  for(const k of PROJECT_KEYS){delete d.project[k];if(snapshot.project[k]!==undefined)d.project[k]=structuredClone(snapshot.project[k]);}
  Object.assign(d.project,{playing:false,recording:null,playhead:0,selectedId:null,selectedKind:null,currentState:'EDIT'});
}
export function planFromProject(d) {
  return cutTimeline(d).map((r,i)=>({title:r.shot.title,description:r.shot.description||'',dialogue:r.shot.dialogue||'',seconds:r.seconds,framing:r.shot.journeyFrame||['wide','medium','close'][i%3]}));
}
export function buildJourneyPlan(brief,seconds,direction='experience') {
  const o=OPTIONS.direction.find(o=>o.id===direction)||OPTIONS.direction[0];
  const subject=brief.trim().replace(/\s+/g,' '), short=subject.slice(0,80);
  // A transparent starter, not a pretend model response. The connected planner can refine it.
  const actions=[`从「${short}」中挑一个最想记住的瞬间。`,`交代${short}的现场和主体。`,`靠近一个能表达主题的细节。`,`让动作或互动带来变化。`,`完整呈现最想让观众看到的一刻。`,`回到最初的感受，用一个动作结束。`];
  return o.beats.map((title,i)=>({title,description:actions[i],dialogue:i===0?'想留下这样的瞬间。':['','我们从这里开始。','看这个细节。','变化，就在这一刻。','这就是我们想留下的画面。','把这一刻，留给自己。'][i],seconds:seconds/6,framing:o.framing[i]}));
}
export function validPlan(plan) {
  return Array.isArray(plan)&&plan.length>=1&&plan.length<=24&&plan.every(p=>typeof p.title==='string'&&p.title.length<=120&&typeof p.description==='string'&&p.description.length<=2000&&typeof p.dialogue==='string'&&p.dialogue.length<=300&&Number.isFinite(p.seconds)&&p.seconds>=1&&p.seconds<=60&&['wide','medium','close'].includes(p.framing))&&plan.reduce((n,p)=>n+p.seconds,0)<=180;
}
export function retimePlan(plan,seconds,pace,fps=24) {
  const weights=OPTIONS.pace.find(p=>p.id===pace)?.weights;
  const raw=plan.map((p,i)=>weights?.length===plan.length?weights[i]:p.seconds),sum=raw.reduce((n,x)=>n+x,0);
  let used=0;const total=Math.round(seconds*fps);
  return plan.map((p,i)=>{const n=i===plan.length-1?total-used:Math.max(fps,Math.round(total*raw[i]/sum));used+=n;return {...p,seconds:n/fps};});
}
export function activeJourney(d){return d.journey?.nodes.find(n=>n.id===d.journey.head)||null;}
export function journeyPath(d,id=d.journey?.head){const nodes=d.journey?.nodes||[],out=[],seen=new Set();while(id&&!seen.has(id)){seen.add(id);const n=nodes.find(n=>n.id===id);if(!n)break;out.unshift(n);id=n.parentId;}return out;}
