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
  const until = Date.now() + 8000; // simulated queue: ~2 s, poll so a loaded CI box does not flake
  while (Date.now() < until && store.get().jobs.find((j) => j.id === r.id).status !== "done") await new Promise((res) => setTimeout(res, 100));
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

test("assets: reference job → asset → approve → references travel with the shot", async () => {
  dispatch("project.set-state", { state: "EDIT" });
  const r = dispatch("generation.reference", { entityId: "hero", view: "front" });
  assert.equal(r.ok, true, JSON.stringify(r));
  const until = Date.now() + 8000;
  while (Date.now() < until && store.get().jobs.find((j) => j.id === r.id).status !== "done") await new Promise((res) => setTimeout(res, 100));
  const job = store.get().jobs.find((j) => j.id === r.id);
  assert.equal(job.kind, "reference");
  assert.equal(job.status, "done");
  const added = dispatch("asset.add", { entityId: "hero", url: "/media/hero-ref.jpg", label: "hero front" });
  assert.equal(added.ok, true);
  assert.equal(store.get().assets.find((a) => a.id === added.id).approved, false);
  assert.equal(dispatch("asset.approve", { id: added.id }).approved, true);
  dispatch("project.set-state", { state: "EDIT" });
  const refs = R.referencesForShot(store.get(), store.get().shots.find((s) => s.id === "shot_01"));
  assert.equal(refs.length, 1);
  assert.equal(refs[0].entityId, "hero");
  const sub = dispatch("generation.submit", { shotId: "shot_01", mode: "t2i", provider: "seedream-5" });
  assert.equal(sub.ok, true, JSON.stringify(sub));
  assert.equal(store.get().jobs.find((j) => j.id === sub.id).inputs.references.length, 1);
  assert.ok(dispatch("context.assets").data.some((a) => a.id === added.id));
  assert.equal(dispatch("asset.delete", { id: added.id }).ok, true);
  const ex = dispatch("project.export");
  assert.ok(Array.isArray(ex.data.assets));
  dispatch("project.set-state", { state: "EDIT" });
});

test("film: plan reports per-shot sources, export assembles in shot order", async () => {
  dispatch("scene.demo", { name: "city-edge" }, { source: "cli" });

  // nothing recorded yet → every shot is missing, and export says so instead of half-assembling
  let plan = dispatch("film.plan");
  assert.equal(plan.data.shots, 3);
  assert.equal(plan.data.ready, 0);
  assert.equal(plan.data.fullSeconds, 15);

  R.setHooks({ film: null });
  assert.equal(dispatch("film.export").error, "NO_ASSEMBLER");

  // a take with a proxy video makes that shot playable; the newer generation result wins over it
  const t = dispatch("take.record", { shotId: "shot_01" }, { source: "cli" });
  dispatch("take.finish", { id: t.id, videoUrl: "/media/take_a.webm" });
  dispatch("take.review", { id: t.id, status: "circle" });
  plan = dispatch("film.plan");
  assert.equal(plan.data.ready, 1);
  assert.equal(plan.data.clips[0].kind, "blockout");
  assert.equal(dispatch("film.plan", { source: "generated" }).data.ready, 0);

  // assembler hook contract: it receives the cut, in shot order, with each clip's real length
  let got = null;
  R.setHooks({
    film: {
      name: "fake",
      ready: true,
      assemble: async (edit) => {
        got = edit;
        return { ok: true, url: "/media/film.mp4", bytes: 123, seconds: edit.clips.reduce((n, c) => n + c.seconds, 0), clips: edit.clips.length };
      },
    },
  });
  const r = dispatch("film.export", { source: "blockout", name: "cut" });
  assert.equal(r.ok, true);
  assert.equal(r.used, 1);
  assert.equal(r.of, 3);
  await new Promise((res) => setTimeout(res, 50));
  assert.equal(got.clips[0].shotId, "shot_01");
  assert.equal(got.clips[0].seconds, 6);
  assert.equal(got.fps, 24);
  const job = store.get().jobs.find((j) => j.id === r.id);
  assert.equal(job.status, "done");
  assert.equal(job.result.url, "/media/film.mp4");
  R.setHooks({ film: null });
});

test("new / load project start a fresh agent thread but keep the director's settings", () => {
  dispatch("scene.demo", { name: "city-edge" }, { source: "cli" });
  dispatch("agent.set-mode", { mode: "manual" }, { source: "cli" });
  R.say("user", "把 B 机升到 2 米");
  R.say("agent", "好的");
  assert.equal(store.get().agent.messages.length, 3);

  // 新工程：对话重来一条欢迎语。旧对话里的工具卡片指向已经不存在的对象，
  // 而且规划器会把最近几条当上下文喂给模型 —— 留着会让新工程的第一条指令带上旧实体。
  dispatch("project.new", { name: "新工程" }, { source: "human" });
  assert.equal(store.get().shots.length, 0);
  assert.equal(store.get().agent.messages.length, 1);
  assert.equal(store.get().agent.mode, "manual", "协作模式是导演的偏好，不该被清掉");

  // 载入工程同理（工程文件里本来就不带对话：persistable 会剥掉 agent）
  dispatch("scene.demo", { name: "city-edge" }, { source: "cli" });
  R.say("user", "又聊了一句");
  const data = R.persistable(store.get());
  assert.equal(data.agent, undefined);
  dispatch("project.load", { data }, { source: "human" });
  assert.equal(store.get().shots.length, 3);
  assert.equal(store.get().agent.messages.length, 1);
  assert.equal(store.get().agent.mode, "manual");
});

test("approval: the director can confirm only some of the planned steps", () => {
  dispatch("scene.demo", { name: "city-edge" }, { source: "cli" });
  dispatch("agent.set-mode", { mode: "collaborative" }, { source: "cli" });
  dispatch("entity.pose", { id: "rival", pose: "idle" }, { source: "cli" });

  dispatch("agent.run", { text: "把 B 机升到 1.2 米 并 让对手举枪 并 03 镜改成环绕 90 度" }, { source: "human" });
  const pending = store.get().agent.pendingPlan;
  assert.ok(pending, "三步以上的方案要先等确认");
  const poseAt = pending.steps.findIndex((x) => x.action === "entity.pose");
  assert.ok(poseAt >= 0);

  // 跳过「让对手举枪」，其余照做 —— skip 的下标是对着未过滤的 steps 的
  const out = dispatch("agent.confirm", { skip: [poseAt] }, { source: "human" });
  assert.equal(out.ok, true);
  assert.equal(out.skipped, 1);
  assert.equal(out.results.length, pending.steps.length - 1);
  assert.ok(!out.results.some((r) => r.action === "entity.pose"));
  assert.equal(store.get().entities.find((e) => e.id === "rival").pose, "idle", "被跳过的那步不能生效");
  assert.equal(store.get().agent.pendingPlan, null);
});

test("locks protect what the director already approved, across every entry point", () => {
  dispatch("scene.demo", { name: "city-edge" }, { source: "cli" });
  const shot = store.get().shots[0];
  const light = store.get().lights[0].id;
  const subject = shot.targetIds[0];
  const outsider = store.get().entities.find((e) => e.semanticType === "character" && !shot.targetIds.includes(e.id));

  dispatch("shot.lock", { shotId: shot.id, aspects: ["identity", "lighting", "lens"] }, { source: "human" });

  // 锁住的：灯是全场的，主体和机位按这一镜的归属判断
  assert.equal(dispatch("light.update", { id: light, intensity: 9 }, { source: "agent" }).error, "LOCKED");
  assert.equal(dispatch("entity.update", { id: subject, continuity: { look: "红外套" } }, { source: "agent" }).error, "LOCKED");
  assert.equal(dispatch("camera.lens", { id: shot.cameraId, focalLength: 85 }, { source: "agent" }).error, "LOCKED");

  // 没锁住的不该被误伤
  assert.equal(dispatch("entity.update", { id: outsider.id, continuity: { look: "蓝衣" } }, { source: "agent" }).ok, true);
  assert.equal(dispatch("camera.lens", { id: "cam_b", focalLength: 50 }, { source: "agent" }).ok, true);
  assert.equal(dispatch("camera.transform", { id: shot.cameraId, height: 1.2 }, { source: "agent" }).ok, true, "没锁构图就不该拦机位移动");

  // force 能越过，但必须留痕
  assert.equal(dispatch("light.update", { id: light, intensity: 9 }, { source: "human", force: true }).ok, true);
  assert.ok(store.get().events[0].forced?.length, "越锁要记进事件日志");

  // 约束要真的进提示词，正向和负向都要有
  const p = R.compileShot(shot.id);
  assert.match(p.video.zh, /必须与已批准的那一版保持一致/);
  assert.match(p.video.en, /MUST PRESERVE/);
  assert.match(p.negative.zh, /人物身份改变/);
  assert.deepEqual(p.meta.locks, ["identity", "lighting", "lens"]);

  dispatch("shot.unlock", { shotId: shot.id, aspects: ["lighting"] }, { source: "human" });
  assert.equal(dispatch("light.update", { id: light, intensity: 7 }, { source: "agent" }).ok, true);
});

test("camera.nudge turns 「向右移动一点」into a number in a stated frame", () => {
  dispatch("scene.demo", { name: "city-edge" }, { source: "cli" });
  const before = structuredClone(store.get().cameras.find((c) => c.id === "cam_program"));

  const r = dispatch("camera.nudge", { id: "cam_program", direction: "right", amount: "一点" }, { source: "agent" });
  assert.equal(r.ok, true);
  assert.equal(r.moved.right, 0.15);

  const after = store.get().cameras.find((c) => c.id === "cam_program");
  const d = [0, 1, 2].map((i) => after.pose.position[i] - before.pose.position[i]);
  // 位移量就是它说的那个数，而且是平移：焦段不动、视线目标不动
  assert.ok(Math.abs(Math.hypot(...d) - 0.15) < 1e-6, "位移长度要等于声明的米数");
  assert.equal(after.lens.focalLength, before.lens.focalLength, "横移不该改焦段");
  assert.ok(Math.abs(d[1]) < 1e-9, "向右是水平的，不该有高度变化");

  // 提示词要把「平移不是摇镜」写死，否则视频模型会自己发挥
  const p = R.compileShot(store.get().shots.find((s) => s.cameraId === "cam_program").id);
  assert.match(p.video.zh, /横移右 0\.15 米/);
  assert.match(p.video.zh, /不要摇镜/);
  assert.match(p.video.en, /lateral truck right/);
  assert.match(p.negative.en, /pan, tilt, zoom/);
});

test("long take: a shot past the provider cap is chained, each segment starting from the last frame", async () => {
  const seen = [];
  R.setHooks({
    film: { name: "fake", ready: true, lastFrame: async () => "data:image/jpeg;base64,TAIL", assemble: async (e) => ({ ok: true, url: "/media/chain.mp4", bytes: 1, seconds: e.clips.reduce((n, c) => n + c.seconds, 0), clips: e.clips.length }) },
    generation: { name: "fake", submit: (job, update) => { seen.push(job); setTimeout(() => update(job.id, { status: "done", progress: 100, result: { kind: "video", url: `/media/${job.id}.mp4` } }), 5); } },
  });
  dispatch("scene.demo", { name: "city-edge" }, { source: "cli" });
  dispatch("shot.update", { id: "shot_01", duration: 60 }, { source: "cli" });

  // 一分钟超过 Seedance 2.5 的单条 30s 上限 → 切成 2 段
  const r = dispatch("shot.chain", { shotId: "shot_01", provider: "seedance-2.5" }, { source: "human" });
  assert.equal(r.ok, true);
  assert.equal(r.segments, 2);
  assert.equal(r.perSegment, 30);

  await new Promise((res) => setTimeout(res, 200));
  assert.equal(seen.length, 2);
  assert.equal(seen[0].mode, "t2v", "第一段没有前一段，从头起幅");
  assert.equal(seen[1].mode, "i2v", "第二段必须接着上一段");
  assert.equal(seen[1].inputs.image, "data:image/jpeg;base64,TAIL", "第二段的首帧就是上一段的尾帧");
  assert.match(seen[1].prompt, /segment 2 of 2/);
  const chain = store.get().jobs.find((j) => j.kind === "chain");
  assert.equal(chain.status, "done");
  assert.equal(chain.result.seconds, 60);

  // 放得下的镜头不该被拆
  dispatch("shot.update", { id: "shot_01", duration: 8 }, { source: "cli" });
  assert.equal(dispatch("shot.chain", { shotId: "shot_01", provider: "seedance-2.5" }, { source: "human" }).error, "NO_NEED");
  R.setHooks({ film: null, generation: null });
});

test("chain survives failures: content blocks are not retried, transient ones are, resume reuses finished segments", async () => {
  let fail = { 3: "PolicyViolation: sensitive content" };
  let transientHits = 0;
  R.setHooks({
    film: { name: "fake", ready: true, lastFrame: async () => "data:image/jpeg;base64,TAIL", assemble: async (e) => ({ ok: true, url: "/media/chain.mp4", bytes: 1, seconds: e.clips.reduce((n, c) => n + c.seconds, 0), clips: e.clips.length }) },
    generation: { name: "fake", submit: (job, update) => setTimeout(() => {
      if (job.segment === 4 && transientHits < 2) { transientHits++; return update(job.id, { status: "failed", error: "fetch failed: timeout" }); }
      const e = fail[job.segment];
      update(job.id, e ? { status: "failed", error: e } : { status: "done", progress: 100, result: { kind: "video", url: `/media/seg${job.segment}.mp4` } });
    }, 5) },
  });
  dispatch("scene.demo", { name: "city-edge" }, { source: "cli" });
  dispatch("shot.update", { id: "shot_01", duration: 60 }, { source: "cli" });

  dispatch("shot.chain", { shotId: "shot_01", provider: "seedance-2" }, { source: "human" }); // 5 × 12s
  await new Promise((r) => setTimeout(r, 300));
  let chain = store.get().jobs.filter((j) => j.kind === "chain").at(-1);
  assert.equal(chain.status, "failed");
  assert.equal(chain.failure, "content", "内容策略要被识别出来");
  assert.equal(chain.parts[2].attempt, 1, "内容类失败重试没有意义，不该重复烧钱");
  assert.deepEqual(chain.parts.map((p) => p.status), ["done", "done", "failed", "queued", "queued"]);
  assert.ok(chain.resumable);

  // 改完提示词续跑：前两段直接沿用，不重新生成
  fail = {};
  const r2 = dispatch("shot.chain", { shotId: "shot_01", provider: "seedance-2", resume: true }, { source: "human" });
  assert.equal(r2.reused, 2);
  await new Promise((r) => setTimeout(r, 400));
  chain = store.get().jobs.filter((j) => j.kind === "chain").at(-1);
  assert.equal(chain.status, "done");
  assert.equal(chain.parts[0].url, "/media/seg1.mp4", "沿用的段还是原来那一条");
  assert.equal(transientHits, 2, "瞬时故障要自动重试");
  assert.equal(chain.parts[3].attempt, 3, "第 4 段重试两次后成功");
  R.setHooks({ film: null, generation: null });
});

test("character card groups face / body / wardrobe / voice under one entity", () => {
  dispatch("scene.demo", { name: "city-edge" }, { source: "cli" });
  dispatch("asset.add", { entityId: "hero", url: "/media/face.jpg", role: "face", approved: true }, { source: "cli" });
  dispatch("asset.add", { entityId: "hero", url: "/media/fit.jpg", role: "wardrobe", approved: true }, { source: "cli" });
  dispatch("asset.add", { entityId: "hero", url: "/media/v.mp3", role: "voice", mediaKind: "audio", approved: true }, { source: "cli" });

  const card = dispatch("context.character", { id: "hero" }).data;
  assert.equal(card.roles.face.approved, 1);
  assert.equal(card.roles.wardrobe.approved, 1);
  assert.equal(card.roles.voice.approved, 1);
  assert.ok(card.usedByShots.includes("shot_01"));
  assert.deepEqual(card.missing, [], "脸 / 服装 / 声音齐了就不该再报缺");

  // 参考图要带 role 送进生成，而配音不能混进画面参考里
  const refs = R.referencesForShot(store.get(), store.get().shots[0]);
  const hero = refs.filter((r) => r.entityId === "hero");
  assert.equal(hero.length, 2, "音频不是画面参考");
  assert.deepEqual(hero.map((r) => r.role).sort(), ["face", "wardrobe"]);
  assert.match(hero.find((r) => r.role === "face").roleSay, /face/);
});

test("beats: a long take is split by story beats, each segment carrying its own description", async () => {
  const seen = [];
  R.setHooks({
    film: { name: "fake", ready: true, lastFrame: async () => "data:image/jpeg;base64,TAIL", assemble: async (e) => ({ ok: true, url: "/media/chain.mp4", bytes: 1, seconds: e.clips.reduce((n, c) => n + c.seconds, 0), clips: e.clips.length }) },
    generation: { name: "fake", submit: (job, update) => { seen.push(job); setTimeout(() => update(job.id, { status: "done", progress: 100, result: { kind: "video", url: `/media/${job.id}.mp4` } }), 5); } },
  });
  dispatch("scene.demo", { name: "city-edge" }, { source: "cli" });
  dispatch("shot.update", { id: "shot_01", duration: 90 }, { source: "cli" });

  // 拆解是语言活：planner 写进来，运行时按拍执行
  const b = dispatch("shot.beats", { shotId: "shot_01", beats: [
    { text: "主角从巷口走出，镜头缓慢推近" },
    { text: "两人在街心相遇并对视" },
    { text: "对手转身离开，镜头拉远" },
  ] }, { source: "agent" });
  assert.equal(b.ok, true);
  assert.deepEqual(b.beats.map((x) => x.seconds), [30, 30, 30], "没写时长就均分镜头总长");

  const r = dispatch("shot.chain", { shotId: "shot_01", provider: "seedance-2.5" }, { source: "human" });
  assert.equal(r.segments, 3);
  assert.equal(r.plan[1].beat, "两人在街心相遇并对视");

  await new Promise((res) => setTimeout(res, 200));
  assert.equal(seen.length, 3);
  // 每段拿到的是自己那一拍，而不是复读整镜描述
  assert.match(seen[0].prompt, /0\.0s–30\.0s.*主角从巷口走出/s);
  assert.match(seen[2].prompt, /60\.0s–90\.0s.*对手转身离开/s);
  assert.ok(!seen[0].prompt.includes("对手转身离开"), "第一段不该拿到第三拍的内容");

  // 账本里带时间窗，「查看生成过程」就是把它摊开
  const chain = store.get().jobs.filter((j) => j.kind === "chain").at(-1);
  assert.deepEqual(chain.parts.map((p) => [p.from, p.to]), [[0, 30], [30, 60], [60, 90]]);
  assert.equal(chain.parts[1].beat, "两人在街心相遇并对视");
  assert.equal(chain.status, "done");

  // 一拍超过单条上限就继续对半切，内容跟着走
  dispatch("shot.beats", { shotId: "shot_01", beats: [{ seconds: 50, text: "一整段长走位" }, { seconds: 40, text: "收尾定格" }] }, { source: "agent" });
  const r2 = dispatch("shot.chain", { shotId: "shot_01", provider: "seedance-2.5" }, { source: "human" });
  assert.equal(r2.segments, 4, "50s 拍切成 2 段、40s 拍切成 2 段");
  assert.equal(r2.plan[0].beat, "一整段长走位");
  assert.equal(r2.plan[3].beat, "收尾定格");
  R.setHooks({ film: null, generation: null });
});

test("shot.beats: a destructive flag must never silently win over the payload", () => {
  dispatch("scene.demo", { name: "city-edge" }, { source: "cli" });
  dispatch("shot.update", { id: "shot_01", duration: 90 }, { source: "cli" });

  // 模型很自然地把 clear 读成「先清掉旧的再写这些」，真实的一次规划就是这么发的。
  // 以前这会返回 ok:true 却把 7 拍全丢了 —— 静默丢数据比报错糟糕得多。
  const r = dispatch("shot.beats", { shotId: "shot_01", clear: true, beats: [
    { seconds: 30, text: "一" }, { seconds: 60, text: "二" },
  ] }, { source: "agent" });
  assert.equal(r.ok, true);
  assert.equal(r.beats.length, 2, "给了 beats 就该写进去，不该被 clear 吃掉");
  assert.equal(store.get().shots.find((s) => s.id === "shot_01").beats.length, 2);

  // 不给 beats 时 clear 才是清空
  const c = dispatch("shot.beats", { shotId: "shot_01", clear: true }, { source: "agent" });
  assert.equal(c.cleared, true);
  assert.equal(store.get().shots.find((s) => s.id === "shot_01").beats, null);

  // 空 beats 且不 clear 要报错，而不是假装成功
  assert.equal(dispatch("shot.beats", { shotId: "shot_01", beats: [] }, { source: "agent" }).error, "NO_BEATS");
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
