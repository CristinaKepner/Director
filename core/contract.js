// 约束核对：导演说过「这一块我满意了」（shot.lock），之后每一次改动，都要拿评估出来的逐帧几何
// 去对一遍 —— 不看 Action 返回的 ok，不看镜头上填的字段。
// 三值结论：pass / violate / unverifiable。「没法验」不算通过：身份、服装、光线这类要靠判定模型看画面，
// 这里只能老实标成「需要判定模型」，不能因为几何没动就报没事。
// 纯函数，不碰 store：给 review.contract、film.check、评测面板和研究环境共用。
import { cameraStateAt, entityStateAt, subjectPoint } from "./motion.js";
import { projectPoint, occluderOf, shotTarget, cameraBasis } from "./spatial.js";
import { LOCK_ASPECTS } from "./schema.js";

const DEG = Math.PI / 180;
const r3 = (x) => Math.round(x * 1000) / 1000;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a) => Math.hypot(...a);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const fwdOf = (s) => { const v = sub(s.lookAt, s.position), n = len(v) || 1; return v.map((x) => x / n); };
const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(fwdOf(a), fwdOf(b))))) / DEG;

/** 这一镜此刻的逐帧几何 + 主体在画面里的位置 + 谁挡在前面。锁定时存一份，之后每次核对都跟它比。 */
export function shotBaseline(d, shot) {
  const target = shotTarget(d, shot), cam = d.cameras.find((c) => c.id === shot.cameraId) || d.cameras[0];
  const frames = [];
  for (let f = shot.range.inFrame; f < shot.range.outFrame; f++) {
    const cs = cameraStateAt(d, shot, f);
    if (!cs) break;
    const row = { position: cs.position.map(r3), lookAt: cs.lookAt.map(r3), focalLength: r3(cs.focalLength) };
    if (target) {
      const aim = subjectPoint(target, f, shot.size || cam?.preset), p = projectPoint(d, shot, f, aim, cs);
      const dim = target.proxy?.dimensions || [1, 1, 1];
      row.subject = { x: r3(p.x), y: r3(p.y), inFrame: p.visible, heightFill: p.depth > 0 ? r3(dim[1] / (2 * p.depth * Math.tan(p.hfov / 2) / p.aspect)) : 0, occludedBy: occluderOf(d, cs.position, aim, f, [target.id])?.id || null };
    }
    frames.push(row);
  }
  const subjects = (shot.targetIds || []).map((id) => d.entities.find((e) => e.id === id)).filter(Boolean)
    .map((e) => ({ id: e.id, position: e.transform.position.map(r3), yaw: r3(e.transform.rotation[1]), pose: e.pose || null, pathLength: e.path?.length || 0 }));
  const set = d.entities.filter((e) => !(shot.targetIds || []).includes(e.id)).map((e) => ({ id: e.id, position: e.transform.position.map(r3), yaw: r3(e.transform.rotation[1]), dims: (e.proxy?.dimensions || []).map(r3) }));
  return { subjectId: target?.id || null, fps: d.project.fps, frames, subjects, set, lights: d.lights.map((l) => ({ id: l.id, position: (l.position || []).map(r3), intensity: l.intensity, enabled: l.enabled !== false, color: l.color })), preset: d.scene.environment?.preset || null };
}

// 每种锁分别怎么验。返回 { how, status, measured, worstFrame, why }
//   how: 几何 = 从评估出来的逐帧几何算；状态 = 从工程状态（姿态、路径、灯）比；判定模型 = 这里验不了
const worst = (n, fn) => { let w = 0, at = 0; for (let f = 0; f < n; f++) { const v = fn(f); if (v > w) { w = v; at = f; } } return { worst: r3(w), worstFrame: at }; };
const need = (b, a) => (!b?.frames?.length ? "锁定时没有记下几何基准（旧版本锁的），重新锁一次" : a.frames.length !== b.frames.length ? `镜长变了（${b.frames.length} → ${a.frames.length} 帧）` : null);

export const ASPECT_CHECKS = {
  lens: (b, a) => {
    const w = need(b, a); if (w) return { how: "几何", status: "unverifiable", why: w };
    const m = worst(a.frames.length, (f) => Math.abs(a.frames[f].focalLength - b.frames[f].focalLength));
    return { how: "几何", status: m.worst <= 0.05 ? "pass" : "violate", measured: `焦段最多差 ${m.worst} mm`, ...m };
  },
  framing: (b, a) => {
    const w = need(b, a); if (w) return { how: "几何", status: "unverifiable", why: w };
    if (!b.frames[0].subject || !a.frames[0].subject) return { how: "几何", status: "unverifiable", why: "这一镜没有主体，算不出构图" };
    const m = worst(a.frames.length, (f) => Math.max(Math.abs(a.frames[f].subject.x - b.frames[f].subject.x), Math.abs(a.frames[f].subject.y - b.frames[f].subject.y), Math.abs(Math.log((a.frames[f].subject.heightFill || 1e-3) / (b.frames[f].subject.heightFill || 1e-3))) * 2));
    return { how: "几何", status: m.worst <= 0.06 ? "pass" : "violate", measured: `主体在画面里的位置/大小最多漂 ${m.worst}（画面宽=2）`, ...m };
  },
  foreground: (b, a) => {
    const w = need(b, a); if (w) return { how: "几何", status: "unverifiable", why: w };
    if (!b.frames[0].subject) return { how: "几何", status: "unverifiable", why: "没有主体，谈不上谁挡在前面" };
    let changed = 0, at = -1;
    for (let f = 0; f < a.frames.length; f++) if ((a.frames[f].subject?.occludedBy || null) !== (b.frames[f].subject?.occludedBy || null)) { changed++; if (at < 0) at = f; }
    return { how: "几何", status: changed ? "violate" : "pass", measured: changed ? `${changed} 帧里挡在主体前面的东西变了` : "前景遮挡和锁定时一样", worst: changed, worstFrame: Math.max(0, at) };
  },
  background: (b, a) => {
    const w = need(b, a); if (w) return { how: "几何", status: "unverifiable", why: w };
    const ori = worst(a.frames.length, (f) => angle(a.frames[f], b.frames[f]));
    const moved = a.set.filter((e) => { const o = b.set.find((x) => x.id === e.id); return !o || len(sub(e.position, o.position)) > 0.01 || Math.abs(e.yaw - o.yaw) > 1e-3; }).map((e) => e.id);
    const gone = b.set.filter((e) => !a.set.some((x) => x.id === e.id)).map((e) => e.id);
    const bad = ori.worst > 0.5 || moved.length || gone.length;
    return { how: "几何", status: bad ? "violate" : "pass", measured: bad ? [ori.worst > 0.5 && `视线转了 ${ori.worst}°`, moved.length && `布景动了：${moved.join("、")}`, gone.length && `布景没了：${gone.join("、")}`].filter(Boolean).join("；") : "机位朝向与布景都没动", ...ori };
  },
  performance: (b, a) => {
    const diff = a.subjects.filter((s) => { const o = b.subjects.find((x) => x.id === s.id); return !o || o.pose !== s.pose || o.pathLength !== s.pathLength || len(sub(s.position, o.position)) > 0.01; }).map((s) => s.id);
    return { how: "状态", status: diff.length ? "violate" : b.subjects.length ? "pass" : "unverifiable", measured: diff.length ? `主体的姿态/走位变了：${diff.join("、")}` : b.subjects.length ? "姿态与走位和锁定时一样" : undefined, why: b.subjects.length ? undefined : "这一镜没点名主体" };
  },
  lighting: (b, a) => {
    const diff = a.lights.filter((l) => { const o = b.lights.find((x) => x.id === l.id); return !o || o.enabled !== l.enabled || Math.abs((o.intensity || 0) - (l.intensity || 0)) > 1e-6 || o.color !== l.color || len(sub(l.position.length ? l.position : [0, 0, 0], o.position.length ? o.position : [0, 0, 0])) > 0.01; }).map((l) => l.id);
    const presetChanged = a.preset !== b.preset;
    return { how: "状态", status: diff.length || presetChanged || a.lights.length !== b.lights.length ? "violate" : "pass", measured: presetChanged ? `布光预设从 ${b.preset} 换成了 ${a.preset}` : diff.length ? `灯动了：${diff.join("、")}` : "白模里的灯没动（生成结果里的光还要判定模型看）" };
  },
  identity: () => ({ how: "判定模型", status: "unverifiable", why: "人物身份只在生成画面里看得出来，白模验不了；用 review.verify 让判定模型比两版" }),
  wardrobe: () => ({ how: "判定模型", status: "unverifiable", why: "服装造型只在生成画面里看得出来；用 review.verify" }),
  palette: () => ({ how: "判定模型", status: "unverifiable", why: "色彩调子只在生成画面里看得出来；用 review.verify" }),
};

/** 「接得上」：这一镜的第一帧和上一镜的最后一帧，主体在画面同一侧、机位在轴线同一侧。不需要基准，直接比。 */
export function continuityCheck(d, shot) {
  const i = d.shots.findIndex((s) => s.id === shot.id), prev = i > 0 ? d.shots[i - 1] : null;
  if (!prev) return { how: "几何", status: "unverifiable", why: "这是第一镜，没有上一镜可接" };
  const tgt = shotTarget(d, shot), ptgt = shotTarget(d, prev);
  const common = tgt && ptgt && tgt.id === ptgt.id ? tgt : (shot.targetIds || []).map((id) => d.entities.find((e) => e.id === id)).find((e) => e && (prev.targetIds || []).includes(e.id));
  if (!common) return { how: "几何", status: "unverifiable", why: `和上一镜「${prev.title}」没有共同的主体，接戏关系算不出来` };
  const a = cameraStateAt(d, prev, prev.range.outFrame - 1), b = cameraStateAt(d, shot, shot.range.inFrame);
  // 主体的「看点」跟着各自机位的景别走（特写看脸，全景看腰），和 cameraStateAt 自己用的是同一个点
  const presetOf = (s) => s.size || d.cameras.find((c) => c.id === s.cameraId)?.preset;
  const pa = projectPoint(d, prev, prev.range.outFrame - 1, subjectPoint(common, prev.range.outFrame - 1, presetOf(prev)), a), pb = projectPoint(d, shot, shot.range.inFrame, subjectPoint(common, shot.range.inFrame, presetOf(shot)), b);
  // 轴线：主体面朝的方向；机位在它左边还是右边
  const st = entityStateAt(common, shot.range.inFrame), facing = [Math.sin(st.yaw || 0), 0, Math.cos(st.yaw || 0)];
  const side = (cs) => Math.sign((cs.position[0] - st.position[0]) * facing[2] - (cs.position[2] - st.position[2]) * facing[0]);
  const problems = [];
  if (!pb.visible) problems.push("接进来的第一帧里主体不在画面里");
  if (pa.visible && pb.visible && Math.sign(pa.x) !== Math.sign(pb.x) && Math.abs(pa.x) > 0.15 && Math.abs(pb.x) > 0.15) problems.push(`主体从画面${pa.x > 0 ? "右" : "左"}跳到了画面${pb.x > 0 ? "右" : "左"}`);
  if (side(a) !== side(b)) problems.push("机位越过了轴线（180° 规则）");
  return { how: "几何", status: problems.length ? "violate" : "pass", measured: problems.length ? problems.join("；") : `和「${prev.title}」接得上：主体同侧、机位没越轴`, prevShotId: prev.id };
}

/** 一次微调（camera.nudge）自己的承诺：只平移、不摇、不变焦。位移按锁定时的机位坐标系量。 */
export function moveCheck(b, a, move) {
  const w = need(b, a); if (w) return { how: "几何", status: "unverifiable", why: w };
  const { fwd, right, up } = cameraBasis(b.frames[0]);
  const d0 = sub(a.frames[0].position, b.frames[0].position);
  const got = { right: r3(dot(d0, right)), up: r3(dot(d0, up)), forward: r3(dot(d0, fwd)) };
  const err = Math.max(Math.abs(got.right - (move.right || 0)), Math.abs(got.up - (move.up || 0)), Math.abs(got.forward - (move.forward || 0)));
  const ori = worst(a.frames.length, (f) => angle(a.frames[f], b.frames[f])), foc = worst(a.frames.length, (f) => Math.abs(a.frames[f].focalLength - b.frames[f].focalLength));
  const problems = [err > 0.02 && `位移量不对：要 右${move.right || 0} 上${move.up || 0} 前${move.forward || 0}，实际 右${got.right} 上${got.up} 前${got.forward}`, ori.worst > 0.3 && `说好只平移，视线却转了 ${ori.worst}°（第 ${ori.worstFrame} 帧最明显）`, foc.worst > 0.05 && `焦段变了 ${foc.worst} mm`].filter(Boolean);
  return { how: "几何", status: problems.length ? "violate" : "pass", measured: problems.length ? problems.join("；") : `平移 右${got.right} 上${got.up} 前${got.forward} m，视线最多转 ${ori.worst}°，焦段没变`, got, orientationDeg: ori.worst, worstFrame: ori.worstFrame };
}

/**
 * 核对一镜的全部约束。返回逐条结论，加一个总评。
 * 每条：{ aspect, zh, how, status, measured, worstFrame, why }
 */
export function verifyShotContract(d, shot) {
  const b = shot.locks?.baseline, aspects = shot.locks?.aspects || [];
  const a = shotBaseline(d, shot);
  const items = [];
  for (const asp of aspects) {
    if (asp === "continuity") { items.push({ aspect: asp, zh: LOCK_ASPECTS[asp]?.zh || asp, ...continuityCheck(d, shot) }); continue; }
    const fn = ASPECT_CHECKS[asp];
    items.push({ aspect: asp, zh: LOCK_ASPECTS[asp]?.zh || asp, ...(fn ? fn(b || {}, a) : { how: "判定模型", status: "unverifiable", why: "没有这种锁的验法" }) });
  }
  const mv = shot.lastMove;
  if (mv && shot.locks?.lockedAt && mv.at > shot.locks.lockedAt) items.unshift({ aspect: "move", zh: "这次的运镜要求", ...moveCheck(b || {}, a, mv) });
  const n = (s) => items.filter((x) => x.status === s).length;
  return { shotId: shot.id, lockedAt: shot.locks?.lockedAt || null, items, pass: n("pass"), violate: n("violate"), unverifiable: n("unverifiable"),
    ok: items.length > 0 && n("violate") === 0 && n("unverifiable") === 0,
    summary: !items.length ? "这一镜没有锁任何东西" : n("violate") ? `${n("violate")} 条约束被改坏了` : n("unverifiable") ? `几何上没问题，还有 ${n("unverifiable")} 条要判定模型看画面` : "全部约束都在" };
}
