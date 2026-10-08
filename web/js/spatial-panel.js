// 俯视图面板：把「机位实际怎么走、主体在画面里怎么样」摆出来。
// 数据全部来自 core/spatial.js —— 和 context.map / context.trajectory、和研究用的 RL 环境是同一份几何，
// 所以导演在这里看到的，就是策略被打分时用的那一份。纯本地计算，不花钱。
import { cameraTrajectory, trajectoryKinematics, classifyMove, framingReport, topDownMap, mapToSvg, sizeFromHeightFill } from "../../core/spatial.js";
import { MOTION_TYPES, SHOT_SIZES } from "../../core/schema.js";
import { sceneForShot } from "../../core/actions.js";

const esc = (s) => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const pct = (x) => `${Math.round(x * 100)}%`;
const moveName = (t) => MOTION_TYPES[t]?.zh || ({ keyframed: "关键帧", zoom: "变焦", tilt: "俯仰" }[t] ?? t);

// 一条小曲线：主体占画面高度的多少，随时间怎么变。推镜应该往上走，固定机位应该是平的。
function spark(values, { w = 220, h = 36, lo = null, hi = null, mark = null } = {}) {
  if (values.length < 2) return "";
  const a = lo ?? Math.min(...values), b = hi ?? Math.max(...values), span = b - a || 1;
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)},${(h - 2 - ((v - a) / span) * (h - 4)).toFixed(1)}`).join(" ");
  const line = mark === null ? "" : `<line x1="0" x2="${w}" y1="${(h - 2 - ((mark - a) / span) * (h - 4)).toFixed(1)}" y2="${(h - 2 - ((mark - a) / span) * (h - 4)).toFixed(1)}" stroke="currentColor" stroke-opacity=".25" stroke-dasharray="3 3"/>`;
  return `<svg class="sp-spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${line}<polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`;
}

export function renderSpatial(el, d) {
  const shot = d.shots.find((s) => s.id === d.project.currentShotId) || d.shots[0];
  if (!shot) { el.innerHTML = `<div class="empty">还没有镜头。先建一个镜头，这里会画出机位怎么走。</div>`; return; }
  // 播放时播放头每帧都在变：图按 4 帧一档重画就够了，数字不跟着播放头变
  const frame = Math.min(shot.range.outFrame - 1, Math.max(shot.range.inFrame, Math.round((d.project.playhead || 0) / 4) * 4));
  const key = [shot.id, shot.version, frame, d.project.version, d.entities.length, d.cameras.map((c) => c.version).join("."), d.entities.map((e) => e.version).join(".")].join("|");
  if (el.dataset.spKey === key && el.querySelector(".sp")) return;
  el.dataset.spKey = key;

  const w = sceneForShot(d, shot); // 只看这一场：整条复刻的别的场不进图，也不算遮挡
  const tr = cameraTrajectory(w, shot, { samples: Math.min(96, shot.range.outFrame - shot.range.inFrame) });
  const kin = trajectoryKinematics(tr, d.project.fps), evaluated = classifyMove(kin), framing = framingReport(tr);
  const declared = shot.keyframes?.length >= 2 ? "keyframed" : shot.motion?.type || "static";
  const mismatch = declared !== "keyframed" && declared !== evaluated.type;
  const svg = mapToSvg(topDownMap(w, { shotId: shot.id, frame }), { px: 300 });
  const reads = framing ? sizeFromHeightFill(framing.heightFillMean) : null;
  const subj = framing ? d.entities.find((e) => e.id === framing.subjectId) : null;
  const blockers = framing?.occluders.map((id) => d.entities.find((e) => e.id === id)?.displayName || id) || [];

  const notes = [];
  if (mismatch) notes.push(`<div class="sp-note warn"><b>写的是「${esc(moveName(declared))}」，走出来的是「${esc(moveName(evaluated.type))}」</b><i>运镜类型是按机位实际轨迹判的，不是按镜头上填的那个词。对不上的话，生成端拿到的提示词和参考画面说的就不是一回事。</i></div>`);
  if (!framing) notes.push(`<div class="sp-note warn"><b>这一镜没说拍谁</b><i>没有主体就没法算它在不在画面里。到「检查」里给这一镜指定主体。</i></div>`);
  else {
    if (framing.inFrameRatio < 0.98) notes.push(`<div class="sp-note bad"><b>「${esc(subj?.displayName)}」只有 ${pct(framing.inFrameRatio)} 的时间在画面里</b><i>其余时间拍到的是别的东西。</i></div>`);
    if (framing.occludedRatio > 0.02) notes.push(`<div class="sp-note bad"><b>${pct(framing.occludedRatio)} 的时间被「${esc(blockers.join("、"))}」挡住</b><i>主体在视锥里，但镜头和它之间隔着东西。换个角度，或者挪开它。</i></div>`);
    if (shot.size && reads && reads !== shot.size) notes.push(`<div class="sp-note warn"><b>写的是 ${esc(shot.size)}，看起来是 ${esc(reads)}</b><i>${esc(SHOT_SIZES[reads]?.zh || "")}：主体占画面高度的 ${framing.heightFillMean.toFixed(2)} 倍。</i></div>`);
  }
  if (!notes.length) notes.push(`<div class="sp-note ok"><b>轨迹和画面都对得上</b><i>主体全程在画面里，没有遮挡，运镜和声明一致。</i></div>`);

  el.innerHTML = `<div class="sp">
    <div class="sp-map" data-tip="俯视图" data-tip-sub="蓝线是机位走的路（浅→深是先→后），黄色扇形是此刻拍到的范围，粉框是这一镜的主体">${svg}</div>
    <div class="sp-side">
      <div class="sp-head"><b>${esc(shot.index)} ${esc(shot.title)}</b><span>${kin.duration.toFixed(1)}s · 第 ${frame} 帧</span></div>
      <div class="sp-grid">
        <div><em>走出来的运镜</em><b>${esc(moveName(evaluated.type))}</b><i>把握 ${pct(evaluated.confidence)}</i></div>
        <div><em>路程</em><b>${kin.pathLength.toFixed(2)} m</b><i>最快 ${kin.speedMax.toFixed(2)} m/s</i></div>
        <div><em>推拉 / 横移 / 升降</em><b>${kin.dolly.toFixed(2)} / ${kin.truck.toFixed(2)} / ${kin.pedestal.toFixed(2)}</b><i>米，按起始机位的朝向算</i></div>
        <div><em>转了多少</em><b>${kin.yawChange.toFixed(1)}° / ${kin.pitchChange.toFixed(1)}°</b><i>左右 / 上下</i></div>
        <div><em>顺不顺</em><b>${kin.jerkRms.toFixed(1)}</b><i>加加速度 m/s³，越小越顺</i></div>
        <div><em>看起来的景别</em><b>${esc(reads || "—")}</b><i>${framing ? `在画面里 ${pct(framing.inFrameRatio)} · 被挡 ${pct(framing.occludedRatio)}` : "没有主体"}</i></div>
      </div>
      ${framing ? `<div class="sp-curve"><em>主体占画面高度（倍）</em>${spark(tr.map((s) => s.subject?.heightFill ?? 0))}<span>${framing.heightFillStart.toFixed(2)} → ${framing.heightFillEnd.toFixed(2)}</span></div>
      <div class="sp-curve"><em>主体左右位置（−1 左边缘，+1 右边缘）</em>${spark(tr.map((s) => Math.max(-1.5, Math.min(1.5, s.subject?.x ?? 0))), { lo: -1.5, hi: 1.5, mark: 0 })}<span>${framing.xStart.toFixed(2)} → ${framing.xEnd.toFixed(2)}</span></div>` : ""}
      <div class="sp-notes">${notes.join("")}</div>
    </div>
  </div>`;
}
