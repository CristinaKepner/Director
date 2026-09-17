// 舞台右上角那些数是真的物理量，不是装饰 —— 所以要能算对。
import test from "node:test";
import assert from "node:assert/strict";
import * as R from "../core/index.js";
import { physicalInfo, depthOfField } from "../web/js/phys.js";

test("景深按薄透镜公式：50mm f/1.8 对 3 米，全画幅大约 40 厘米", () => {
  const d = depthOfField(50, 1.8, 3, 36);
  assert.ok(d.near < 3 && d.far > 3, "对焦点必须落在景深里");
  assert.ok(Math.abs(d.total - 0.39) < 0.05, `景深应在 0.39 m 上下，实际 ${d.total.toFixed(3)}`);
  // 光圈收小景深变深；焦段变长景深变浅 —— 方向错了比数值差一点要命得多
  assert.ok(depthOfField(50, 8, 3).total > d.total);
  assert.ok(depthOfField(85, 1.8, 3).total < d.total);
  // 过了超焦距，远端就是无穷远
  assert.equal(depthOfField(24, 11, 10).far, Infinity);
  assert.equal(depthOfField(50, 1.8, 0.01), null, "比焦距还近的对焦距离不成立");
});

test("物理信息跟着这一镜、这一帧走", () => {
  R.dispatch("scene.demo", { name: "city-edge" }, { source: "cli" });
  const d = R.store.get();
  const shot = d.shots[0];
  R.dispatch("shot.select", { id: shot.id }, { source: "human" });
  const p = physicalInfo(R.store.get());
  assert.ok(p, "有镜头就该有读数");
  assert.match(p.title, new RegExp(shot.index));
  assert.ok(p.focal > 10 && p.focal < 300);
  assert.ok(p.fov > 1 && p.fov < 120, `视角 ${p.fov}`);
  assert.ok(p.distance > 0.2, "机位和主体不会叠在一起");
  assert.ok(Math.abs(p.height - R.cameraStateAt(R.store.get(), shot, R.store.get().project.playhead).position[1]) < 1e-6, "机位高就是机位那一帧的 y");
  assert.ok(p.dof && p.dof.near < p.distance && p.dof.far > p.distance);
});

test("运镜的镜头机位在动，固定机位不动", () => {
  R.dispatch("scene.demo", { name: "city-edge" }, { source: "cli" });
  const s = R.store.get().shots[0];
  R.dispatch("shot.select", { id: s.id }, { source: "human" });
  const mid = (sh) => Math.round((sh.range.inFrame + sh.range.outFrame) / 2);

  R.dispatch("motion.set", { shotId: s.id, type: "static" }, { source: "human" });
  let sh = R.store.get().shots[0];
  assert.equal(physicalInfo(R.store.get(), mid(sh)).moving, false, "固定机位速度该是 0");

  R.dispatch("motion.set", { shotId: s.id, type: "dolly-in" }, { source: "human" });
  sh = R.store.get().shots[0];
  const a = physicalInfo(R.store.get(), sh.range.inFrame + 2), b = physicalInfo(R.store.get(), mid(sh));
  assert.equal(b.moving, true, "推镜中段机位该在动");
  assert.ok(b.speed > 0.01, `速度 ${b.speed}`);
  assert.ok(b.distance < a.distance, "推镜是越推越近");
});

test("一个镜头都没有时，读的是机位的静止状态；连机位都没有就是 null", () => {
  R.dispatch("project.new", { name: "空" }, { source: "cli" });
  assert.equal(physicalInfo(R.store.get()), null);
  R.dispatch("camera.create", { name: "A 机", focalLength: 35, position: [0, 1.6, 5] }, { source: "human" });
  const p = physicalInfo(R.store.get());
  assert.equal(p.focal, 35);
  assert.equal(p.height, 1.6);
  assert.equal(p.speed, 0);
});
