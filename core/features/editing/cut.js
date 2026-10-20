// Shared editorial decisions. A generated candidate and a chosen take are different things.
export function videoVersions(d, shotId) {
  const shared = d.shots.find(s => s.id === shotId)?.cut?.sourceJobIds || [];
  return (d.jobs || []).filter(j => (j.shotId === shotId || shared.includes(j.id)) && (!j.kind || ["chain", "animatic"].includes(j.kind)) &&
    (["chain", "animatic"].includes(j.kind) || ["t2v", "i2v", "v2v", "r2v"].includes(j.mode)) &&
    j.status === "done" && j.result?.url &&
    (j.result.kind === "video" || (!j.result.kind && /\.(mp4|webm|mov)([?#]|$)/i.test(j.result.url))));
}

export function chosenVideo(d, shot) {
  const versions = videoVersions(d, shot?.id);
  // An explicit selection must not silently become a different clip if its asset is lost.
  return shot?.selectedGenerationId ? versions.find(j => j.id === shot.selectedGenerationId) || null : versions.at(-1) || null;
}

export const KEEP_OPTIONS = { identity: "人物与服装", background: "场景与光线", framing: "构图与运镜" };
// Editorial source time is independent of the rehearsal's camera/keyframe range.
export function cutMedia(d, s) {
  const duration = (s.range.outFrame - s.range.inFrame) / d.project.fps;
  const start = s.cut?.sourceIn ?? 0, end = s.cut?.sourceOut ?? duration, speed = s.cut?.speed ?? 1;
  return { start, end, speed, seconds: (end - start) / speed };
}
export const cutSeconds = (d, s) => cutMedia(d, s).seconds;
export function cutCaption(d, s) {
  const seconds = cutSeconds(d, s), range = s.cut?.captionRange;
  return { text: s.cut?.caption || '', start: Math.min(seconds, range?.start ?? 0), end: Math.min(seconds, range?.end ?? seconds),
    size: s.cut?.captionStyle?.size ?? 2.7, color: s.cut?.captionStyle?.color ?? '#ffffff', position: s.cut?.captionStyle?.position ?? 'bottom' };
}
export function cutTimeline(d) {
  let start = 0;
  return d.shots.map(s => { const seconds = cutSeconds(d, s), row = { shot: s, start, end: start + seconds, seconds }; start += seconds; return row; });
}
export function cutSignature(d) {
  return JSON.stringify([d.shots.map(s => [s.id, chosenVideo(d, s)?.id || null, cutMedia(d,s), cutCaption(d,s), s.cut?.muted || false, s.cut?.volume ?? 1]), d.project.cutMusic || null, d.project.audioClips || []]);
}

export function cutSrt(d) {
  const stamp = t => { const ms = Math.round(t * 1000); return `${String(Math.floor(ms / 3600000)).padStart(2,'0')}:${String(Math.floor(ms / 60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`; };
  return cutTimeline(d).map(r => ({ ...cutCaption(d,r.shot), at:r.start })).filter(c => c.text.trim() && c.end > c.start)
    .map((c,i) => `${i+1}\n${stamp(c.at+c.start)} --> ${stamp(c.at+c.end)}\n${c.text.replace(/\r/g,'')}\n`).join('\n');
}

export function revisionPrompt(d, shot, { instruction, keep = [] }, baseline) {
  const context = baseline?.prompt || shot.prompts?.video?.en || shot.description || "";
  return `${context}\n\nDIRECTOR REVISION — the following overrides any conflicting action above.\n${instruction.trim()}\nKeep the shot duration at ${(shot.range.outFrame-shot.range.inFrame)/d.project.fps} seconds, aspect ratio ${d.project.aspect}.\n${keep.map(k => ({ identity: "Preserve the same characters, their number, identity and wardrobe using the approved references.", background: "Preserve the location, time of day and lighting.", framing: "Preserve the camera framing, angle and movement." }[k])).filter(Boolean).join("\n")}\nGenerate only this shot, no title cards, subtitles or editing interface. Natural motion and sound.`;
}
