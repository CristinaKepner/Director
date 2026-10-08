// 约束（锁）的几何核对：锁的是导演说「满意」的那一刻；之后每一步改动都拿评估出来的逐帧几何比。
// 这些测试守的是产品立场：Action 返回 ok 不算数，三值结论里「验不了」不算通过。
import test from "node:test";
import assert from "node:assert/strict";
import * as R from "../core/index.js";

const sys = { source: "system", silent: true };
const demo = () => { R.dispatch("scene.demo", { name: "city-edge" }, sys); R.dispatch("project.set-state", { state: "EDIT" }, sys); return R.store.get(); };
const item = (rep, aspect) => rep.reports[0].items.find((i) => i.aspect === aspect);

test("锁定时记下几何基准；什么都没改，几何的都 pass，验不了的是 unverifiable 而不是 pass", () => {
  demo();
  const l = R.dispatch("shot.lock", { shotId: "shot_01", aspects: ["lens", "framing", "foreground", "background", "identity"] }, sys);
  assert.ok(l.ok && l.baselineFrames === 144);
  const r = R.dispatch("review.contract", { shotId: "shot_01" }, sys);
  for (const a of ["lens", "framing", "foreground", "background"]) assert.equal(item(r, a).status, "pass", a);
  assert.equal(item(r, "identity").status, "unverifiable");
  assert.equal(item(r, "identity").how, "判定模型");
  assert.equal(r.reports[0].ok, false, "还有一条验不了，就不能说约束全在");
});

test("「只平移不摇不变焦」的微调，评估出来视线转了 1.7°：Action 说 ok，核对说 violate", () => {
  demo();
  R.dispatch("shot.lock", { shotId: "shot_01", aspects: ["lens", "framing"] }, sys);
  const n = R.dispatch("camera.nudge", { id: "cam_program", direction: "right", amount: "一点" }, { source: "agent" });
  assert.equal(n.ok, true);
  const r = R.dispatch("review.contract", { shotId: "shot_01" }, sys), mv = item(r, "move");
  assert.equal(mv.status, "violate");
  assert.ok(mv.orientationDeg > 1.5 && mv.orientationDeg < 2, `视线转了 ${mv.orientationDeg}°`);
  assert.equal(item(r, "lens").status, "pass", "焦段真的没变");
  assert.ok(r.reports[0].rollback && r.reports[0].editsSinceLock === 1);
});

test("回退到锁定时：约束恢复，锁还在", () => {
  demo();
  R.dispatch("shot.lock", { shotId: "shot_01", aspects: ["lens", "framing"] }, sys);
  R.dispatch("camera.nudge", { id: "cam_program", direction: "right", amount: "明显" }, { source: "agent" });
  const r = R.dispatch("review.contract", { shotId: "shot_01" }, sys);
  // 这一镜跟着主角走，主体始终在画面中央：构图锁真的没坏，坏的是「只平移」这个承诺
  assert.equal(item(r, "framing").status, "pass");
  assert.equal(item(r, "move").status, "violate");
  assert.ok(R.dispatch(r.reports[0].rollback.action, r.reports[0].rollback.payload, sys).ok);
  const after = R.dispatch("review.contract", { shotId: "shot_01" }, sys);
  assert.deepEqual(R.store.get().shots[0].locks.aspects, ["lens", "framing"]);
  assert.equal(after.reports[0].violate, 0);
  assert.equal(item(after, "move"), undefined, "回退之后那次微调不存在了，也就没有它的承诺要验");
});

test("锁住焦段：camera.lens 在 dispatch 被拦下；换个绕路的办法改到焦段，核对照样抓得住", () => {
  demo();
  R.dispatch("shot.lock", { shotId: "shot_01", aspects: ["lens"] }, sys);
  assert.equal(R.dispatch("camera.lens", { id: "cam_program", focalLength: 85 }, sys).error, "LOCKED");
  // motion.set push-in 不在 lens 的 guards 里，却会让评估出来的焦段变化
  assert.ok(R.dispatch("motion.set", { shotId: "shot_01", type: "push-in" }, sys).ok);
  const r = R.dispatch("review.contract", { shotId: "shot_01" }, sys);
  assert.equal(item(r, "lens").status, "violate");
  assert.ok(/mm/.test(item(r, "lens").measured));
  const chk = R.dispatch("film.check", { shotIds: ["shot_01"] }, sys);
  const f = chk.findings.find((x) => x.code === "CONTRACT_VIOLATED");
  assert.ok(f && f.level === "error" && f.fix.action === "project.undo-to");
});

test("前景遮挡：一个东西挡到主体前面，foreground 锁报 violate，说清是哪几帧", () => {
  const d = demo();
  R.dispatch("shot.lock", { shotId: "shot_02", aspects: ["foreground"] }, sys);
  const cam = d.cameras.find((c) => c.id === "cam_b").pose.position, hero = d.entities.find((e) => e.id === "hero").transform.position;
  R.dispatch("entity.create", { id: "pole", type: "prop", displayName: "柱子", dimensions: [0.4, 3, 0.4], position: [(cam[0] + hero[0]) / 2, 0, (cam[2] + hero[2]) / 2] }, sys);
  const r = R.dispatch("review.contract", { shotId: "shot_02" }, sys);
  assert.equal(item(r, "foreground").status, "violate");
  assert.match(item(r, "foreground").measured, /帧里挡在主体前面的东西变了/);
});

test("接戏：第一镜没有上一镜是 unverifiable；越轴的切换是 violate", () => {
  demo();
  R.dispatch("shot.lock", { shotId: "shot_01", aspects: ["continuity"] }, sys);
  assert.equal(item(R.dispatch("review.contract", { shotId: "shot_01" }, sys), "continuity").status, "unverifiable");
  R.dispatch("shot.lock", { shotId: "shot_02", aspects: ["continuity"] }, sys);
  const c = item(R.dispatch("review.contract", { shotId: "shot_02" }, sys), "continuity");
  assert.equal(c.status, "violate");
  assert.match(c.measured, /越过了轴线/);
});

test("规划器：一句自然语言变成 锁 → 微调 → 核对，镜头是句子里点名的那一个", () => {
  demo();
  const p = R.plan("第三个镜头保持人物表情和场景不变，相机再向右移动一点；不要变焦，前景遮挡保留");
  const acts = p.steps.map((s) => s.action);
  assert.deepEqual(acts, ["shot.lock", "camera.nudge", "shot.lock", "shot.lock", "review.contract"]);
  assert.ok(p.steps.filter((s) => s.action === "shot.lock").every((s) => s.payload.shotId === "shot_03"));
  assert.equal(p.steps[1].payload.id, "cam_c", "第三镜的机位是 C 机，不是当前 Program");
  assert.deepEqual(p.steps[0].payload.aspects, ["performance", "identity", "background"]);
  assert.deepEqual(p.steps[2].payload.aspects, ["lens"]);
  assert.deepEqual(p.steps[3].payload.aspects, ["foreground"]);
  assert.equal(p.notes.length, 0);
});
