import { chosenVideo } from "../../../../core/features/editing/cut.js";
// Select only generated output, never the imported reference or a recorded blockout.
export function stageResult(d, scope = "shot") {
  const shotId = d.project.currentShotId || d.shots[0]?.id;
  const jobs = (d.jobs || []).filter((j) => {
    if (scope === "film") return j.kind === "film" &&
      (j.filmSource === "generated" || (j.clips?.length && j.clips.every((c) => c.kind === "generated")));
    return j.shotId === shotId && (!j.kind || ["chain","animatic"].includes(j.kind)) &&
      (["chain","animatic"].includes(j.kind) || ["t2v", "i2v", "v2v", "r2v"].includes(j.mode));
  });
  const video = (j) => j.status === "done" && j.result?.url &&
    (j.result.kind === "video" || (!j.result.kind && /\.(mp4|webm|mov)([?#]|$)/i.test(j.result.url)));
  return { output: scope === "shot" ? chosenVideo(d, d.shots.find(s => s.id === shotId)) : jobs.filter(video).at(-1) || null, latest: jobs.at(-1) || null };
}

// Sequence playheads are global; map geometry uses the current shot's local frame.
export function stageMapFrame(d, shot) {
  if (!shot) return 0;
  let frame = d.project.playhead || 0;
  if (d.project.playSequence) {
    for (const s of d.shots) { if (s.id === shot.id) break; frame -= s.range.outFrame - s.range.inFrame; }
    frame += shot.range.inFrame;
  }
  return Math.max(shot.range.inFrame, Math.min(shot.range.outFrame - 1, frame));
}
