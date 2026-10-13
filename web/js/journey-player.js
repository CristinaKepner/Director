import {store} from '../../core/store.js';
import {cutTimeline,cutMedia,cutCaption,chosenVideo} from '../../core/cut.js';
import {drawJourneyFrame} from './journey-frames.js';
import {planFromProject,activeJourney} from '../../core/journey.js';
import {createCuePlayback} from './audio-cues.js';
import {stamp} from './journey-canvas.js';

// Playback uses the same selected clips and absolute audio slots as export.
export function createJourneyPlayer(root,{mediaHref,toast}){
  const cues=createCuePlayback(mediaHref,toast),music=new Audio();music.loop=true;
  const screen=document.createElement('section');screen.className='jc-screen';screen.hidden=true;
  screen.innerHTML='<header><b>音画预演</b><button aria-label="收起播放器">×</button></header><div><video playsinline preload="auto"></video><canvas width="1280" height="720"></canvas><p></p></div><footer>构图草图 / 当前采用素材 · 临时配音</footer>';
  const video=screen.querySelector('video'),canvas=screen.querySelector('canvas'),caption=screen.querySelector('p');
  let time=0,playing=false,raf,last=0,source='',failed=false;
  function paint(){
    const d=store.get(),rows=cutTimeline(d),total=rows.at(-1)?.end||0;
    const row=rows.find(r=>r.end>time)||rows.at(-1),s=row?.shot;
    root.querySelector('#jcTime')?.replaceChildren(document.createTextNode(`${stamp(time)} / ${stamp(total)}`));
    const seek=root.querySelector('#jcSeek');if(seek)seek.value=time;
    const head=root.querySelector('#jcPlayhead');if(head)head.style.left=`${time/Math.max(1,total)*100}%`;
    const button=root.querySelector('.jc-play');if(button){button.setAttribute('aria-label',playing?'暂停音画分镜':'播放音画分镜');button.innerHTML=`<svg class="gi"><use href="#i-${playing?'pause':'play'}"/></svg>`;}
    if(!s)return false;
    const clip=chosenVideo(d,s),m=cutMedia(d,s),at=m.start+(time-row.start)*m.speed;
    video.hidden=!clip;canvas.hidden=!!clip;
    if(clip){
      const url=mediaHref(clip.result.url);if(source!==url){source=url;failed=false;video.pause();video.src=url;video.load();}
      video.playbackRate=m.speed;video.volume=Math.max(0,Math.min(1,s.cut?.volume??1));video.muted=!!s.cut?.muted;
      if(video.readyState>=1&&Math.abs(video.currentTime-at)>.2)video.currentTime=Math.min(at,Math.max(0,video.duration-.01));
      if(playing&&video.readyState>=2&&video.paused)video.play().catch(()=>{});
    }else{video.pause();const p=planFromProject(d)[d.shots.indexOf(s)];drawJourneyFrame(canvas.getContext('2d'),{...p,brief:activeJourney(d)?.brief,index:d.shots.indexOf(s)},1280,720);}
    const c=cutCaption(d,s),local=time-row.start;caption.textContent=local>=c.start&&local<c.end?c.text:'';
    const box=canvas.parentElement.getBoundingClientRect(),ratio=video.hidden?(d.project.aspect==='9:16'?9/16:d.project.aspect==='1:1'?1:16/9):(video.videoWidth||1280)/(video.videoHeight||720);
    caption.style.color=c.color;caption.style.fontSize=`${Math.min(box.height,box.width/ratio)*c.size/100}px`;
    caption.dataset.position=c.position;
    const ready=!clip||video.readyState>=2;
    cues.sync(d.project.audioClips||[],time,playing&&ready&&!failed);
    const musicUrl=d.project.cutMusic?.url?mediaHref(d.project.cutMusic.url):'';
    if(music.dataset.source!==musicUrl){music.pause();music.dataset.source=musicUrl;if(musicUrl)music.src=musicUrl;else music.removeAttribute('src');}
    music.volume=d.project.cutMusic?.volume??.12;
    if(musicUrl&&Number.isFinite(music.duration)&&music.duration>0){const at=time%music.duration;if(Math.abs(music.currentTime-at)>.2)music.currentTime=at;if(playing&&ready&&music.paused)music.play().catch(()=>{});}
    if(!playing||!ready)music.pause();
    return ready;
  }
  function tick(t){if(!playing)return;const ready=paint();if(ready&&last)time+=Math.min(.1,(t-last)/1000);last=t;const total=cutTimeline(store.get()).at(-1)?.end||0;if(time>=total){time=total;pause();paint();return;}raf=requestAnimationFrame(tick);}
  function pause(){playing=false;last=0;cancelAnimationFrame(raf);video.pause();music.pause();cues.pause();paint();}
  function show(){screen.hidden=false;root.querySelector('.jc-canvas-area')?.append(screen);}
  function seek(t){time=Number(t);show();paint();}
  function toggle(){if(playing){pause();return;}if(time>= (cutTimeline(store.get()).at(-1)?.end||0))time=0;show();playing=true;last=0;paint();raf=requestAnimationFrame(tick);}
  function attach(){root.querySelector('.jc-canvas-area')?.append(screen);paint();}
  function close(){pause();screen.hidden=true;}
  screen.querySelector('button').onclick=e=>{e.stopPropagation();close();};
  video.addEventListener('error',()=>{failed=true;pause();toast('这一镜的素材无法播放，请回到时间线更换素材',true);});
  return {toggle,seek,pause,close,attach,detach:()=>{pause();screen.remove();},reset:()=>{close();time=0;source='';video.removeAttribute('src');}};
}
