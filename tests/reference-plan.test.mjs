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

// ---- 整条视频：按场景分块 ----
// 一条片子几个场景，台就分几块（1/3/6/9 宫格）。以前几个场景全建在原点上，人和道具叠成一堆。
const SCENE = (name, from, to, extra = {}) => ({
  name, from, to, brief: `${name}里发生的事`,
  scene: { name, setting: "室内" },
  subjects: [{ semanticType: "character", displayName: `${name}的人`, screenPosition: "中央" }],
  camera: { shotSize: "CU", angle: "eye", heightMeters: 1.5, focalMm: 85, framing: "居中" },
  lighting: { keyDirection: "左前", ratio: "柔和" },
  motion: { type: "static" },
  beats: [],
  ...extra,
});
const WHOLE = {
  summary: "三场戏", brief: "一条三场的小片",
  scene: { name: "整条", timeOfDay: "夜" },
  subjects: [{ semanticType: "character", displayName: "整条的人", screenPosition: "中央" }],
  camera: { shotSize: "MS", angle: "eye", heightMeters: 1.6, focalMm: 35 },
  lighting: { keyDirection: "正面", ratio: "柔和" },
  motion: { type: "push-in", speed: "slow" },
  beats: [],
  scenes: [SCENE("天台", 0, 4), SCENE("楼梯", 4, 9, { camera: {}, motion: {} }), SCENE("厨房", 9, 15)],
};

test("没说复刻什么 → 默认整条，不再停下来问", () => {
  assert.equal(R.DEFAULT_REPLICATE_MODE, "full");
  assert.equal(compileReference(ANALYSIS, {}).mode, "full");
});

test("宫格：1 / 3 / 6 / 9，一排最多三块", () => {
  const g = (n) => R.padGrid(n);
  assert.deepEqual([g(1).cols, g(1).rows], [1, 1]);
  assert.deepEqual([g(2).cols, g(2).rows], [2, 1]);
  assert.deepEqual([g(3).cols, g(3).rows], [3, 1]);
  assert.deepEqual([g(6).cols, g(6).rows], [3, 2]);
  assert.deepEqual([g(9).cols, g(9).rows], [3, 3]);
  // 块和块不重叠：中心间距大于块宽
  const cells = g(9).cells;
  for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) {
    const dx = Math.abs(cells[i].x - cells[j].x), dz = Math.abs(cells[i].z - cells[j].z);
    assert.ok(dx >= R.PAD.w + 1 || dz >= R.PAD.d + 1, `块 ${i} 和 ${j} 挨得太近`);
  }
});

test("三场 → 三块台、三个机位、三个镜头，主体各在自己那块上", () => {
  const plan = compileReference(WHOLE, { mode: "full", prefix: "w" });
  assert.equal(plan.scenes, 3);
  assert.equal(plan.pads.length, 3);
  const padsStep = stepOf(plan, "scene.pads");
  assert.ok(padsStep, "要有 scene.pads");
  assert.equal(padsStep.payload.pads.length, 3);
  assert.equal(plan.steps.filter((s) => s.action === "shot.create").length, 3);
  assert.equal(plan.steps.filter((s) => s.action === "camera.create").length, 3);
  // 每一场的主体落在自己那块的范围里
  plan.ids.scenes.forEach((sid, k) => {
    const pad = plan.pads[k];
    for (const id of sid.subjects) {
      const st = plan.steps.find((s) => s.action === "entity.create" && s.payload.id === id);
      assert.ok(Math.abs(st.payload.position[0] - pad.x) <= pad.w / 2, `${id} 的 x 不在第 ${k + 1} 块上`);
      assert.ok(Math.abs(st.payload.position[2] - pad.z) <= pad.d / 2, `${id} 的 z 不在第 ${k + 1} 块上`);
    }
  });
  // 镜头按场次顺序，时长按起止秒
  const shots = plan.steps.filter((s) => s.action === "shot.create").map((s) => s.payload);
  assert.deepEqual(shots.map((s) => s.title), ["天台", "楼梯", "厨房"]);
  assert.deepEqual(shots.map((s) => s.duration), [4, 5, 6]);
  assert.equal(plan.seconds, 15);
  // 只有第一个机位设成 Program
  assert.equal(plan.steps.filter((s) => s.action === "camera.pilot").length, 1);
});

test("某一场缺机位 / 运镜 → 继承整条的读数，不降级成中性默认", () => {
  const plan = compileReference(WHOLE, { mode: "full", prefix: "w" });
  const cam2 = plan.steps.find((s) => s.action === "camera.create" && s.payload.id === "w_s2_cam");
  assert.equal(cam2.payload.focalLength, 35, "第 2 场没给焦段，该用整条的 35，而不是 MS 默认");
  assert.equal(cam2.payload.preset, "MS");
  const shot2 = plan.steps.find((s) => s.action === "shot.create" && s.payload.id === "w_s2_shot");
  assert.equal(typeof shot2.payload.motion === "string" ? shot2.payload.motion : shot2.payload.motion.type, "push-in", "运镜也继承整条的");
  // 给了的场用自己的
  const cam1 = plan.steps.find((s) => s.action === "camera.create" && s.payload.id === "w_s1_cam");
  assert.equal(cam1.payload.focalLength, 85);
  assert.equal(cam1.payload.preset, "CU");
});

test("单镜头分析（没有 scenes）还是老样子：不分块", () => {
  const plan = compileReference(ANALYSIS, { mode: "full", prefix: "one" });
  assert.equal(plan.scenes, 1);
  assert.equal(plan.pads.length, 0);
  assert.ok(!stepOf(plan, "scene.pads"));
  assert.equal(stepOf(plan, "camera.create").payload.id, "one_cam");
});

test("三场的计划真的能 dispatch，台面分块进了工程", () => {
  dispatch("project.new", {}, { source: "test" });
  const plan = compileReference(WHOLE, { mode: "full", prefix: "w" });
  const bad = plan.steps.map((st) => [st, dispatch(st.action, st.payload, { source: "test" })]).filter(([, r]) => !r.ok);
  assert.deepEqual(bad.map(([st, r]) => `${st.action}:${r.error}`), []);
  const d = store.get();
  assert.equal(d.scene.pads.length, 3);
  assert.equal(d.shots.length, 3);
  assert.equal(d.cameras.length, 3);
  // 每个机位对着自己那一场的主体，而且真的在那块台附近
  for (const [k, sid] of plan.ids.scenes.entries()) {
    const cam = d.cameras.find((c) => c.id === sid.camera);
    const pad = d.scene.pads[k];
    assert.equal(cam.target, sid.subjects[0]);
    assert.ok(Math.hypot(cam.pose.position[0] - pad.x, cam.pose.position[2] - pad.z) < R.PAD.pitchX / 2, `机位 ${cam.id} 跑到别的台去了`);
  }
  // scene.create 改名不拆台；clear 才拆
  dispatch("scene.create", { name: "改个名" }, { source: "test" });
  assert.equal(store.get().scene.pads.length, 3);
  dispatch("scene.create", { name: "白纸", clear: true }, { source: "test" });
  assert.ok(!store.get().scene.pads);
});

test("时间线切开：前半段保留，后半段是新镜头紧跟其后，拍按秒数分到两边", () => {
  dispatch("project.new", {}, { source: "test" });
  dispatch("entity.create", { id: "p", type: "character", displayName: "人" }, { source: "test" });
  dispatch("camera.create", { id: "c", target: "p" }, { source: "test" });
  dispatch("shot.create", { id: "a", title: "长镜", cameraId: "c", duration: 10, targetIds: ["p"] }, { source: "test" });
  dispatch("shot.create", { id: "b", title: "下一镜", cameraId: "c", duration: 3, targetIds: ["p"] }, { source: "test" });
  dispatch("shot.beats", { shotId: "a", beats: [{ seconds: 4, text: "一" }, { seconds: 6, text: "二" }] }, { source: "test" });
  const r = dispatch("shot.split", { id: "a", seconds: 6 }, { source: "test" });
  assert.ok(r.ok, r.error);
  const d = store.get();
  assert.deepEqual(d.shots.map((s) => s.id), ["a", r.tail, "b"]);
  assert.deepEqual(d.shots.map((s) => s.index), ["01", "02", "03"]);
  const [a, t] = d.shots;
  assert.equal((a.range.outFrame - a.range.inFrame) / d.project.fps, 6);
  assert.equal((t.range.outFrame - t.range.inFrame) / d.project.fps, 4);
  assert.equal(t.cameraId, "c");
  assert.deepEqual(a.beats.map((x) => x.seconds), [4, 2]);
  assert.deepEqual(t.beats.map((x) => x.seconds), [4]);
  assert.equal(dispatch("shot.split", { id: "b", seconds: 5 }, { source: "test" }).error, "SPLIT_OUT_OF_RANGE");
});

// ---- 场次作为一等公民：属于哪块台、只看这块台、群体人数 ----
test("群体主体按 count 摊开：7 个伴舞就是 7 个人，名字带序号，站位不叠", () => {
  const list = R.expandSubjects([{ semanticType: "character", displayName: "主唱", screenPosition: "正中" }, { semanticType: "character", displayName: "伴舞", count: 6, screenPosition: "两侧" }]);
  assert.equal(list.length, 7);
  assert.deepEqual(list.slice(1, 3).map((x) => x.displayName), ["伴舞 1", "伴舞 2"]);
  const plan = compileReference({ ...ANALYSIS, subjects: [{ semanticType: "character", displayName: "伴舞", count: 6, screenPosition: "两侧" }] }, { mode: "full", prefix: "g" });
  const ents = plan.steps.filter((s) => s.action === "entity.create").map((s) => s.payload.position.join(","));
  assert.equal(ents.length, 6);
  assert.equal(new Set(ents).size, 6, "六个人不能站在同一个点上");
  assert.equal(R.expandSubjects([{ semanticType: "character", displayName: "人群", count: 40 }]).length, 12, "封顶 12");
});

test("建出来的每样东西都记着自己在哪块台上；切到某块台，自检只看这块台", () => {
  dispatch("project.new", {}, { source: "test" });
  const plan = compileReference(WHOLE, { mode: "full", prefix: "w" });
  for (const st of plan.steps) assert.ok(dispatch(st.action, st.payload, { source: "test" }).ok, st.action);
  const d = store.get();
  assert.equal(d.entities.find((e) => e.id === "w_s2_sub1").padId, "w_pad2");
  assert.equal(d.cameras.find((c) => c.id === "w_s2_cam").padId, "w_pad2");
  assert.equal(d.shots.find((s) => s.id === "w_s2_shot").padId, "w_pad2");
  assert.equal(R.padOf(d, d.entities.find((e) => e.id === "w_s3_sub1")), "w_pad3");
  // 切到第 2 块：当前镜头跟着换，Agent 摘要里只剩这块的东西，别的台只剩名字
  const r = dispatch("scene.pad-select", { id: "w_pad2" }, { source: "test" });
  assert.ok(r.ok);
  assert.equal(r.summary.characterCount, 1);
  assert.equal(store.get().project.currentShotId, "w_s2_shot");
  const sum = R.summarize(store.get());
  assert.deepEqual(sum.entities.map((e) => e.id), ["w_s2_sub1"]);
  assert.equal(sum.pads.list.length, 3);
  assert.equal(sum.shots.length, 1);
  // 自检：第 2 镜的画面里只算第 2 块台上的东西
  assert.deepEqual(R.entitiesForShot(store.get(), store.get().shots[1]).map((e) => e.id), ["w_s2_sub1"]);
  // 选别的台上的镜头，当前台跟着走；切回整台
  dispatch("shot.select", { id: "w_s3_shot" }, { source: "test" });
  assert.equal(store.get().project.activePadId, "w_pad3");
  dispatch("scene.pad-select", { id: null }, { source: "test" });
  assert.equal(store.get().project.activePadId, null);
  assert.equal(R.summarize(store.get()).entities.length, 3);
});

test("顺播全部之后再单播某一镜：播放头回到这一镜的入点，不再跳回第一镜", () => {
  dispatch("project.new", {}, { source: "test" });
  dispatch("entity.create", { id: "p", type: "character" }, { source: "test" });
  dispatch("camera.create", { id: "c", target: "p" }, { source: "test" });
  dispatch("shot.create", { id: "a", cameraId: "c", duration: 4 }, { source: "test" });
  dispatch("shot.create", { id: "b", cameraId: "c", duration: 4 }, { source: "test" });
  dispatch("timeline.play", { sequence: true }, { source: "test" });
  store.patch((d) => (d.project.playhead = 150)); // 顺播走到了第二镜中段（整条的帧）
  dispatch("timeline.pause", {}, { source: "test" });
  dispatch("shot.select", { id: "b" }, { source: "test" });
  assert.equal(store.get().project.playSequence, false, "选镜就是退出顺播");
  dispatch("timeline.play", {}, { source: "test" });
  const d = store.get();
  assert.equal(d.project.currentShotId, "b");
  assert.equal(d.project.playhead, 0, "单镜播放从这一镜入点开始");
  // 停在出点再按播放也要从头
  store.patch((x) => (x.project.playhead = 96));
  dispatch("timeline.pause", {}, { source: "test" });
  dispatch("timeline.play", {}, { source: "test" });
  assert.equal(store.get().project.playhead, 0);
});
