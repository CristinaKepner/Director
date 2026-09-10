// Phase 0 acceptance: no UI, no Three.js — project, scene, entities, cameras, shots, takes, prompts, undo, state machine, agent.
import test from "node:test";
import assert from "node:assert/strict";
import * as R from "../core/index.js";

const { dispatch, store, summarize } = R;

test("demo city-edge builds the product-doc scene", () => {
  const r = dispatch("scene.demo", { name: "city-edge" }, { source: "cli" });
  assert.equal(r.ok, true, JSON.stringify(r));
  const s = summarize();
  assert.equal(s.scene.name, "城市边缘");
  assert.equal(s.shots.length, 3);
  assert.deepEqual(s.shots.map((x) => x.focal), [40, 70, 35]);
  assert.deepEqual(s.shots.map((x) => x.motion), ["dolly-in", "static", "orbit"]);
  assert.deepEqual(s.shots.map((x) => x.seconds), [6, 4, 5]);
  assert.equal(s.programCamera, "cam_program");
  assert.ok(s.entities.some((e) => e.type === "weapon"));
  assert.ok(s.lights.length >= 4);
  assert.equal(R.timecode(144, 24), "00:00:06:00");
});

test("camera actions and shot sync", () => {
  let r = dispatch("camera.transform", { id: "cam_program", height: 0.4 }, { source: "cli" });
  assert.equal(r.ok, true);
  r = dispatch("camera.look-at", { id: "cam_program", target: "hero" }, { source: "cli" });
  assert.equal(r.ok, true);
  const d = store.get();
  const cam = d.cameras.find((c) => c.id === "cam_program");
  assert.equal(cam.pose.position[1], 0.4);
  const shot = d.shots.find((s) => s.id === "shot_01");
  assert.equal(shot.cameraPose.position[1], 0.4, "current shot follows its camera");
  r = dispatch("camera.look-at", { id: "cam_program", target: "nope" });
  assert.equal(r.ok, false);
  assert.equal(r.error, "TARGET_NOT_FOUND");
  r = dispatch("camera.frame", { id: "cam_b", target: "rival", size: "CU", angle: "low" });
  assert.equal(r.ok, true);
  assert.ok(r.position[1] < 0.6, "low angle is low");
  assert.equal(r.focalLength, 65);
});

test("undo / redo restore state and dry-run does not mutate", () => {
  const before = store.get().cameras.find((c) => c.id === "cam_program").lens.focalLength;
  const dry = dispatch("camera.lens", { id: "cam_program", focalLength: 85 }, { dryRun: true });
  assert.equal(dry.dryRun, true);
  assert.equal(store.get().cameras.find((c) => c.id === "cam_program").lens.focalLength, before);
  dispatch("camera.lens", { id: "cam_program", focalLength: 85 });
  assert.equal(store.get().cameras.find((c) => c.id === "cam_program").lens.focalLength, 85);
  const u = dispatch("project.undo");
  assert.equal(u.ok, true);
  assert.equal(store.get().cameras.find((c) => c.id === "cam_program").lens.focalLength, before);
  dispatch("project.redo");
  assert.equal(store.get().cameras.find((c) => c.id === "cam_program").lens.focalLength, 85);
  dispatch("project.undo");
});

test("pose joints are clamped and stylized/blockout keep semantics", () => {
  const r = dispatch("entity.pose", { id: "rival", pose: "aim", joints: { rShoulder: 99 } });
  assert.equal(r.ok, true);
  const e = store.get().entities.find((x) => x.id === "rival");
  assert.equal(e.joints.rShoulder, 3);
  dispatch("project.set-fidelity", { fidelity: "stylized" });
  const e2 = store.get().entities.find((x) => x.id === "rival");
  assert.equal(e2.semanticType, "character");
  assert.equal(e2.id, "rival");
  dispatch("project.set-fidelity", { fidelity: "blockout" });
  const bad = dispatch("entity.pose", { id: "gun", pose: "aim" });
  assert.equal(bad.error, "NOT_A_CHARACTER");
});

test("take flow: arm → record → review → storyboard, with state machine enforcement", () => {
  let r = dispatch("take.arm", { shotId: "shot_02" });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(store.get().project.currentState, "ARMED");
  const forbidden = dispatch("entity.delete", { id: "gun" });
  assert.equal(forbidden.error, "STATE_FORBIDDEN");
  r = dispatch("take.record", { shotId: "shot_02", name: "目光 T1" });
  assert.equal(r.ok, true);
  const take = store.get().takes.find((t) => t.id === r.id);
  assert.equal(take.status, "review");
  assert.equal(take.snapshot.cameras.length, 3);
  assert.equal(take.snapshot.lights.length, store.get().lights.length);
  assert.equal(store.get().project.currentState, "REVIEW");
  r = dispatch("take.review", { id: take.id, status: "circle" });
  assert.equal(r.ok, true);
  r = dispatch("storyboard.add", { shotId: "shot_02" });
  assert.equal(r.ok, true);
  const card = store.get().storyboard.find((c) => c.shotId === "shot_02");
  assert.equal(card.selectedTake, take.id);
  assert.equal(card.status, "prompted");
  assert.ok(store.get().entities.find((e) => e.id === "gun"), "gun still exists after forbidden delete");
});

test("prompt compiler outputs image / T2V / V2V with proxy mapping", () => {
  const r = dispatch("generation.prompt", { shotId: "shot_03" });
  assert.equal(r.ok, true);
  const p = r.prompts;
  assert.match(p.video.en, /orbit/);
  assert.match(p.video.en, /35mm/);
  assert.match(p.v2v.en, /tall cylinder = /);
  assert.match(p.v2v.en, /small cone = /);
  assert.match(p.image.zh, /环绕|构图/);
  assert.ok(p.negative.en.length > 20);
  const shot = store.get().shots.find((s) => s.id === "shot_03");
  assert.ok(shot.promptVersions.length >= 2);
});

test("generation submit validates providers and modes", async () => {
  let r = dispatch("generation.submit", { shotId: "shot_03", mode: "v2v", provider: "kling-2.5" });
  assert.equal(r.error, "MODE_NOT_SUPPORTED");
  r = dispatch("generation.submit", { shotId: "shot_03", mode: "v2v", provider: "seedance-2" });
  assert.equal(r.ok, true);
  assert.equal(store.get().project.currentState, "GENERATING");
  await new Promise((res) => setTimeout(res, 2500));
  const job = store.get().jobs.find((j) => j.id === r.id);
  assert.equal(job.status, "done");
  assert.equal(store.get().project.currentState, "REVIEW");
});

test("agent plans Chinese instructions into actions", () => {
  dispatch("project.set-state", { state: "EDIT" });
  let p = R.plan("把 Program 机位降到 0.4m 并 look-at 对手");
  const loud = p.steps.filter((s) => !s.quiet);
  assert.deepEqual(loud.map((s) => s.action), ["camera.transform", "camera.look-at"]);
  assert.equal(loud[0].payload.height, 0.4);
  assert.equal(loud[1].payload.target, "rival");
  p = R.plan("03 镜改成环绕 120 度 5 秒");
  assert.equal(p.steps[0].action, "motion.set");
  assert.deepEqual(p.steps[0].payload, { shotId: "shot_03", type: "orbit", params: { degrees: 120 }, duration: 5 });
  p = R.plan("让对手举枪");
  assert.equal(p.steps[0].action, "entity.pose");
  assert.equal(p.steps[0].payload.pose, "aim");
  p = R.plan("换成日落逆光");
  assert.equal(p.steps[0].action, "scene.preset");
  p = R.plan("给 02 镜生成提示词");
  assert.equal(p.steps[0].action, "generation.prompt");
  p = R.plan("提交 shot_01 视频生视频 seedance");
  assert.equal(p.steps.at(-1).action, "generation.submit");
  assert.equal(p.steps.at(-1).payload.mode, "v2v");
  p = R.plan("新建镜头「对峙」6秒 手持 看向对手");
  assert.equal(p.steps.at(-1).action, "shot.create");
  assert.equal(p.steps.at(-1).payload.duration, 6);
  assert.equal(p.steps.at(-1).payload.motion, "handheld");
  const out = dispatch("agent.run", { text: "把 B 机升到 2m 并 look-at 搭档", mode: "lead" }, { source: "cli" });
  assert.equal(out.ok, true);
  assert.ok(out.results.every((x) => x.ok), JSON.stringify(out.results));
  const cam = store.get().cameras.find((c) => c.id === "cam_b");
  assert.equal(cam.pose.position[1], 2);
  assert.equal(cam.target, "partner");
  const ev = store.get().events.find((e) => e.action === "camera.look-at" && e.source === "agent");
  assert.ok(ev, "agent events are tagged");
});

test("merged studio features: walk path with dwell, room, model library", () => {
  dispatch("project.set-state", { state: "EDIT" });
  const w = dispatch("entity.walk", { id: "hero", waypoints: [[-1.5, -4.2], [-0.9, -2.2], [-0.2, -0.2], [-0.2, -0.2], [1.6, 3.4]], durations: [3, 3, 5, 3], startFrame: 0 });
  assert.equal(w.ok, true, JSON.stringify(w));
  assert.equal(w.keyframes, 5);
  assert.equal(w.seconds, 14);
  const hero = store.get().entities.find((e) => e.id === "hero");
  assert.deepEqual(hero.path.map((k) => k.frame), [0, 72, 144, 264, 336]);
  assert.equal(hero.path[2].position[2], -0.2);
  assert.equal(hero.path[3].position[2], -0.2, "dwell keeps the position");
  assert.ok(Math.abs(hero.path[0].yaw - Math.atan2(0.6, 2)) < 1e-6, "faces the first segment");
  const mid = R.entityStateAt(hero, 200);
  assert.ok(Math.abs(mid.position[2] + 0.2) < 1e-6, "stays put during the dwell segment");
  assert.equal(dispatch("entity.walk", { id: "hero", clear: true }).cleared, true);
  assert.equal(store.get().entities.find((e) => e.id === "hero").path, null);
  const r = dispatch("scene.room", { width: 6, depth: 10, pattern: "calibration" });
  assert.equal(r.room.width, 6);
  assert.equal(r.room.pattern, "calibration");
  assert.equal(store.get().scene.environment.room.depth, 10);
  dispatch("scene.room", { clear: true });
  assert.equal(store.get().scene.environment.room, undefined);
  const m = dispatch("entity.create", { id: "tree1", model: "tree", position: [4, 0, -3] });
  assert.equal(m.ok, true, JSON.stringify(m));
  const tree = store.get().entities.find((e) => e.id === "tree1");
  assert.equal(tree.assetRef, "models/Tree.glb");
  assert.equal(tree.semanticType, "environment");
  assert.equal(dispatch("entity.replace-proxy", { id: "hero", model: "nope" }).error, "UNKNOWN_MODEL");
  assert.equal(dispatch("entity.replace-proxy", { id: "hero", model: "person" }).ok, true);
  assert.equal(store.get().entities.find((e) => e.id === "hero").assetRef, "models/Person.glb");
  dispatch("entity.replace-proxy", { id: "hero", asset: null });
  assert.equal(Object.keys(R.ASPECTS).length, 19);
  assert.equal(dispatch("scene.preset", { preset: "softbox-studio" }).ok, true);
});

test("capabilities expose every action with state permissions", () => {
  const caps = R.capabilities();
  assert.ok(caps.length > 60);
  const rec = caps.find((c) => c.name === "take.record");
  assert.ok(rec.allowedIn.includes("EDIT"));
  assert.ok(!rec.allowedIn.includes("RECORDING"));
});

test("export / load roundtrip", () => {
  const ex = dispatch("project.export");
  const json = JSON.stringify(ex.data);
  dispatch("project.new", { name: "blank" });
  assert.equal(store.get().shots.length, 0);
  const r = dispatch("project.load", { data: JSON.parse(json) });
  assert.equal(r.ok, true);
  assert.equal(store.get().shots.length, 3);
  assert.equal(store.get().scene.name, "城市边缘");
});
