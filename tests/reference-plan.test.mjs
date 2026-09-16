// 参照编译器：结构化分析 → Action 计划。
//
// 这一层存在的理由就是「同一份分析，每次编出同一个场，而且编得出来的都是数字」。
// 所以测的不是"像不像"，是：数字有没有活着走到 Action 里、翻不动的有没有说出来。
import test from "node:test";
import assert from "node:assert/strict";
import * as R from "../core/index.js";

const { compileReference, normalizeShotSize, normalizeMotion, normalizeCoverage, pickLightPreset, dispatch, store, SHOT_SIZES, MOTION_TYPES } = R;

// 一份真实形状的分析（字段照 server/src/adapters/reference.mjs 里那份 SYS 提示词）
const ANALYSIS = {
  summary: "黄昏天台，女孩背对城市抽烟",
  brief: "黄昏的天台，一个女孩背对城市天际线，手里夹着烟，逆光",
  scene: { name: "天台黄昏", timeOfDay: "黄昏", palette: "橙金与深蓝", mood: "孤独", setting: "室外天台" },
  subjects: [
    { semanticType: "character", displayName: "女孩", look: "米色风衣", screenPosition: "中央偏左", sizeInFrame: "约1/3" },
    { semanticType: "building", displayName: "远处高楼", screenPosition: "背景右侧" },
  ],
  camera: { shotSize: "MCU", angle: "low", heightMeters: 1.15, focalMm: 50, aperture: 1.8, framing: "主体在左三分线，右侧留白给天际线" },
  lighting: { keyDirection: "正后方逆光", ratio: "高反差", colorTemp: "暖", practicals: ["霓虹招牌"] },
  motion: { type: "push-in", description: "缓慢推近", speed: "slow" },
  beats: [{ seconds: 3, text: "远景停住" }, { seconds: 4.5, text: "缓缓推近到手部" }],
  notes: [],
};

const stepOf = (plan, action) => plan.steps.find((s) => s.action === action);

test("分析里的数字要原样活到 Action 里，不能在路上变成'约多少'", () => {
  const plan = compileReference(ANALYSIS, { mode: "full", prefix: "t1" });
  const frame = stepOf(plan, "camera.frame");
  assert.equal(frame.payload.focalLength, 50, "50mm 就是 50mm");
  assert.equal(frame.payload.height, 1.15, "机位高度是读出来的米数，不是景别默认值");
  assert.equal(frame.payload.size, "MCU");
  const cam = stepOf(plan, "camera.create");
  assert.equal(cam.payload.aperture, 1.8);

  const shot = stepOf(plan, "shot.create");
  assert.equal(shot.payload.duration, 7.5, "时长按参照自己的拍数合计 3 + 4.5");
  assert.equal(shot.payload.motion.type, "push-in");
  const beats = stepOf(plan, "shot.beats");
  assert.equal(beats.payload.beats.length, 2);
  assert.deepEqual(beats.payload.beats.map((b) => b.seconds), [3, 4.5]);
});

test("同一份分析编两次，结果一模一样（这正是不让模型猜的目的）", () => {
  const a = compileReference(ANALYSIS, { mode: "full", prefix: "same" });
  const b = compileReference(ANALYSIS, { mode: "full", prefix: "same" });
  assert.deepEqual(a.steps, b.steps);
});

test("读取器和运行时的词汇对不上的地方，翻译掉并且说出来", () => {
  // 读取器的提示词里写的是 LS，运行时的枚举里叫 WS —— 以前这一档直接落到默认的 MS
  const w = [];
  assert.equal(normalizeShotSize("LS", w), "WS");
  assert.equal(w.length, 0, "能翻译的不该报警");
  assert.equal(normalizeShotSize("MCU"), "MCU");
  const w2 = [];
  assert.equal(normalizeShotSize("XYZ", w2), "MS");
  assert.equal(w2.length, 1, "翻不动的要说一声，不能悄悄变默认值");

  // 读取器会给 truck-left / tilt，运行时只有 truck（带方向）和没有 tilt
  assert.deepEqual(normalizeMotion({ type: "truck-left" }), { type: "truck", params: { distance: -3 } });
  const w3 = [];
  const tilt = normalizeMotion({ type: "tilt-up" }, w3);
  assert.equal(tilt.type, "pedestal", "没有俯仰摇，降级成升降");
  assert.match(w3[0], /tilt|俯仰/, "降级了就要说清楚降成了什么");
  assert.ok(MOTION_TYPES[tilt.type], "降级的目标必须是运行时真有的运镜");

  // dutch 角运行时没有滚转轴
  const w4 = [];
  normalizeCoverage({ angle: "dutch" }, w4);
  assert.match(w4.join(""), /滚转|dutch/i);
});

test("速度只改幅度：slow 的推镜推得少", () => {
  const slow = compileReference({ ...ANALYSIS, motion: { type: "push-in", speed: "slow" } }, { mode: "full" });
  const fast = compileReference({ ...ANALYSIS, motion: { type: "push-in", speed: "fast" } }, { mode: "full" });
  const amt = (p) => stepOf(p, "shot.create").payload.motion.params.amount;
  assert.ok(amt(slow) < amt(fast), `slow ${amt(slow)} 应该小于 fast ${amt(fast)}`);
});

test("四种复刻模式是四个开关，不是四段提示词", () => {
  const motion = compileReference(ANALYSIS, { mode: "motion" });
  assert.equal(motion.steps.some((s) => s.action === "scene.preset"), false, "运镜模式不搬光");
  assert.ok(stepOf(motion, "camera.frame").payload.focalLength === 50, "但机位照搬");
  assert.match(stepOf(motion, "entity.create").payload.role || "", /占位/, "主体建成占位，等着被换掉");

  const light = compileReference(ANALYSIS, { mode: "light" });
  assert.ok(stepOf(light, "scene.preset"), "只要光的模式必须搬光");
  assert.equal(stepOf(light, "camera.frame").payload.size, "MS", "机位给中性的，不复刻景别");

  const beats = compileReference(ANALYSIS, { mode: "beats" });
  assert.ok(stepOf(beats, "shot.beats"), "只要节奏的模式必须有拍");
  assert.equal(stepOf(beats, "shot.create").payload.motion, "static");

  // 每种模式都得建出一个能录白模的镜头 —— 否则「不花钱先看一眼」就不成立
  for (const m of ["motion", "full", "light", "beats"]) {
    const p = compileReference(ANALYSIS, { mode: m });
    assert.ok(stepOf(p, "shot.create"), `${m} 模式没建出镜头`);
    assert.ok(stepOf(p, "camera.create"), `${m} 模式没建出机位`);
    assert.ok(p.steps.some((s) => s.action === "entity.create"), `${m} 模式没有可拍的东西`);
  }
});

test("逆光高反差 → 剪影；黄昏 → 日落；认不出来的要说一声", () => {
  assert.equal(pickLightPreset(ANALYSIS.lighting, ANALYSIS.scene), "silhouette");
  assert.equal(pickLightPreset({}, { timeOfDay: "黄昏" }), "sunset");
  assert.equal(pickLightPreset({}, { timeOfDay: "夜", palette: "霓虹" }), "night-neon");
  const w = [];
  pickLightPreset({}, {}, w);
  assert.equal(w.length, 1);
});

test("编出来的计划要真的能被 dispatch 执行（不是一份好看的 JSON）", () => {
  dispatch("project.new", { name: "编译器验收" }, { source: "cli" });
  const plan = compileReference(ANALYSIS, { mode: "full", prefix: "run1" });
  const results = plan.steps.map((s) => ({ s, r: dispatch(s.action, s.payload, { source: "cli", actorId: "test" }) }));
  const bad = results.filter((x) => !x.r.ok);
  assert.deepEqual(bad.map((x) => `${x.s.action}:${x.r.error}`), [], "每一步都该被运行时接受");

  const d = store.get();
  assert.equal(d.shots.length, 1);
  const shot = d.shots[0];
  assert.equal(Math.round((shot.range.outFrame - shot.range.inFrame) / d.project.fps * 10) / 10, 7.5);
  assert.equal(shot.motion.type, "push-in");
  assert.equal(shot.targetIds.length, 2, "两个主体都该是这一镜要拍的东西");
  const cam = d.cameras.find((c) => c.id === shot.cameraId);
  assert.equal(cam.lens.focalLength, 50);
  assert.ok(Math.abs(cam.pose.position[1] - 1.15) < 0.01, `机位高度应该是 1.15，实际 ${cam.pose.position[1]}`);
  assert.equal(d.project.programCameraId, cam.id, "建完要设成 Program，否则录不了白模");
  // 构图偏移白模里做不到，但这句话要跟着镜头走到生成那一层
  assert.match(shot.description, /三分线/);
});

test("分析缺胳膊少腿也要编得出东西来（模型输出被截断是常事）", () => {
  const plan = compileReference({ summary: "只剩一句话" }, { mode: "full" });
  assert.ok(stepOf(plan, "shot.create"), "再残缺也要给出一个能录的镜头");
  assert.ok(plan.steps.some((s) => s.action === "entity.create"), "没有主体就造一个占位的");
  dispatch("project.new", { name: "残缺分析" }, { source: "cli" });
  const bad = plan.steps.map((s) => dispatch(s.action, s.payload, { source: "cli" })).filter((r) => !r.ok);
  assert.deepEqual(bad.map((r) => r.error), []);
});

// 整条链的无 UI 验收：贴一个素材 → 读参照 → 建场。读取器用桩替掉（真模型要钱、要网），
// 但 replicate 之后走的全是真路径：编译、dispatch、状态机、事件日志、撤销。
// 重点是这条链现在**不需要规划器**：以前没有 LLM 密钥，这一步直接 PLANNER_NOT_READY。
test("没有规划器也能从参照建出场来", async () => {
  R.dispatch("project.new", { name: "无规划器复刻" }, { source: "cli" });
  const before = store.get().events.length;
  R.setHooks({
    reference: { name: "stub", ready: true, model: "stub-vision", analyze: async () => ({ ok: true, model: "stub-vision", frames: 6, span: { from: 0, to: 7.5 }, analysis: ANALYSIS }) },
    planner: null, // 就是要证明没有它也成
    fetcher: null,
  });
  try {
    const r = R.dispatch("reference.replicate", { ref: "/media/fake.mp4", mode: "full" }, { source: "human", actorId: "console" });
    assert.equal(r.ok, true, JSON.stringify(r));
    await new Promise((res) => setTimeout(res, 30));

    const d = store.get();
    const job = d.jobs.find((j) => j.id === r.id);
    assert.equal(job.status, "done", job.error || "");
    assert.equal(job.result.shots, 1);
    assert.equal(job.result.mode, "full");
    assert.ok(job.result.steps.length >= 5, "结果里要带着这一场是怎么建出来的");
    assert.ok(job.result.steps.every((s) => s.why), "每一步都要说得出为什么");
    assert.equal(job.phases.find((p) => p.key === "build").state, "done");

    assert.equal(d.shots.length, 1);
    assert.equal(d.cameras.find((c) => c.id === d.shots[0].cameraId).lens.focalLength, 50);
    assert.equal(d.project.reference.ref, "/media/fake.mp4", "参照本身要留着，对照那一屏要拿它当左边那栏");

    // 一次复刻是一个撤销步，不是十几个
    assert.ok(store.get().events.length > before);
    const undone = R.undo();
    assert.equal(undone.ok, true);
    assert.equal(store.get().shots.length, 0, "撤销要把整条复刻一起收回去");
  } finally {
    R.setHooks({ reference: null, planner: null, fetcher: null });
  }
});
