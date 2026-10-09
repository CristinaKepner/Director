import { store } from '../../core/store.js';
import { blockoutProgress, runBlockout } from './film.js';

export function initTaskProgress() {
  const box = document.getElementById('taskProgress');
  if (!box) return;
  let planningSince = null;
  let last = '';
  const esc = s => String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const paint = () => {
    const d = store.get();
    let label = '', detail = '', value = null, retry = false;
    const rec = d.project.recording;
    if (d.agent.busy) {
      planningSince ??= Date.now();
      label = '正在规划场景与镜头';
      detail = `已等待 ${Math.floor((Date.now()-planningSince)/1000)} 秒 · 尚未开始录制`;
    } else {
      planningSince = null;
      if (d.agent.pendingPlan) {
        label = '等待你确认方案';
        detail = '在对话中确认后才会执行，当前没有录制视频。';
      } else if (rec) {
        const shot = d.shots.find(s => s.id === rec.shotId);
        const duration = shot ? (shot.range.outFrame-shot.range.inFrame)/d.project.fps : 0;
        const elapsed = shot ? Math.max(0,Math.min(duration,(d.project.playhead-shot.range.inFrame)/d.project.fps)) : 0;
        value = duration ? elapsed/duration : null;
        label = elapsed >= duration ? '正在保存白模视频' : '正在录制白模';
        detail = `${shot?.title || ''} · ${elapsed.toFixed(1)} / ${duration.toFixed(1)} 秒。请保持窗口可见。`;
      } else if (blockoutProgress) {
        const p = blockoutProgress;
        label = p.label || ({record:'准备录制白模',save:'正在保存视频',keyframe:'正在提取关键帧',check:'检查镜头'}[p.phase] || '处理白模');
        detail = p.total ? `第 ${p.index || 0} / ${p.total} 镜 · ${p.title || ''}` : '';
        value = p.phase === 'done' ? 1 : null;
      } else {
        const current = d.project.currentShotId;
        const takes = d.takes.filter(t => t.shotId === current);
        if (takes.length && !takes.some(t=>t.videoUrl)) {
          label = '白模视频尚未录制';
          detail = '当前 Take 只有场景快照，没有视频文件。点击开始真实录制。';
          retry = true;
        }
      }
    }
    const html = label ? `<strong>${esc(label)}</strong><small>${esc(detail)}</small>${value !== null ? `<progress max="1" value="${value}"></progress>` : ''}${retry ? '<button type="button">录制当前镜头白模</button>' : ''}` : '';
    if (html !== last) {
      box.innerHTML = html; box.hidden = !html; last = html;
      box.querySelector('button')?.addEventListener('click', () => {
        runBlockout({shotIds:[store.get().project.currentShotId]}).catch(console.error);
      });
    }
  };
  setInterval(paint, 500);
  paint();
}
