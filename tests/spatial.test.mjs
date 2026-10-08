// core/spatial.js: the evaluated trajectory, the move classifier and the top-down map.
// These are the numbers the console's map panel shows and the RL environment scores on.
import test from "node:test";
import assert from "node:assert/strict";
import * as R from "../core/index.js";
import { cameraTrajectory, trajectoryKinematics, classifyMove, framingReport, topDownMap, mapToSvg, mapToAscii, MAP_CHANNELS, expectedHeightFill, occluderOf } from "../core/spatial.js";

const sys = { source: "system", silent: true };
const demo = () => { R.dispatch("scene.demo", { name: "city-edge" }, sys); return R.store.get(); };

test("the classifier names every preset move from its evaluated path alone", () => {
  const d0 = demo();
  for (const [type, params] of [["static"], ["dolly-in"], ["dolly-out"], ["truck"], ["pedestal"], ["pan"], ["orbit", { degrees: 90 }], ["crane"]]) {
    R.dispatch("motion.set", { shotId: "shot_01", type, params }, sys);
    const d = R.store.get(), k = trajectoryKinematics(cameraTrajectory(d, d.shots[0]), d.project.fps);
    assert.equal(classifyMove(k).type, type, `${type} read as ${classifyMove(k).type}: ${JSON.stringify(k)}`);
  }
  assert.ok(d0);
});

test("a truck past a watched subject is not an orbit", () => {
  demo();
  R.dispatch("motion.set", { shotId: "shot_01", type: "truck", params: { distance: 4 } }, sys);
  const d = R.store.get(), k = trajectoryKinematics(cameraTrajectory(d, d.shots[0]), 24);
  assert.ok(Math.abs(k.orbitDeg) > 20, "the bearing does sweep like an orbit would");
  assert.equal(classifyMove(k).type, "truck", "but the path is a straight rail, not an arc");
});

test("framing: a dolly-in makes the subject bigger, a crate on the sight line is reported by name", () => {
  const d = demo(), tr = cameraTrajectory(d, d.shots[0]), f = framingReport(tr);
  assert.equal(f.subjectId, "hero");
  assert.equal(f.inFrameRatio, 1);
  assert.ok(f.heightFillEnd > f.heightFillStart * 1.5);
  assert.equal(f.occludedRatio, 0);
  const s = tr[0], hero = d.entities.find((e) => e.id === "hero").transform.position;
  R.dispatch("entity.create", { id: "wall", type: "prop", displayName: "Wall", dimensions: [3, 3, 0.3], position: [(s.position[0] + hero[0]) / 2, 0, (s.position[2] + hero[2]) / 2], yaw: Math.atan2(hero[0] - s.position[0], hero[2] - s.position[2]) }, sys);
  const d2 = R.store.get(), f2 = framingReport(cameraTrajectory(d2, d2.shots[0]));
  assert.ok(f2.occludedRatio > 0.5);
  assert.deepEqual(f2.occluders, ["wall"]);
  assert.equal(occluderOf(d2, s.position, [hero[0], 1.2, hero[2]], 0, ["hero"]).id, "wall");
});

test("film.check reports a subject hidden behind a solid proxy, and its fix clears it", () => {
  const d = demo(), s = cameraTrajectory(d, d.shots[1])[0], hero = d.entities.find((e) => e.id === "hero").transform.position;
  assert.ok(!R.dispatch("film.check", {}, sys).findings.some((f) => f.code === "SUBJECT_OCCLUDED"));
  R.dispatch("entity.create", { id: "wall", type: "prop", displayName: "Wall", dimensions: [2.5, 3, 0.3], position: [(s.position[0] + hero[0]) / 2, 0, (s.position[2] + hero[2]) / 2], yaw: Math.atan2(hero[0] - s.position[0], hero[2] - s.position[2]) }, sys);
  const f = R.dispatch("film.check", { shotIds: ["shot_02"] }, sys).findings.find((x) => x.code === "SUBJECT_OCCLUDED");
  assert.ok(f, "the frustum test alone says this shot is fine");
  assert.equal(f.level, "error");
  assert.ok(R.dispatch(f.fix.action, f.fix.payload, sys).ok);
  assert.ok(!R.dispatch("film.check", { shotIds: ["shot_02"] }, sys).findings.some((x) => x.code === "SUBJECT_OCCLUDED"));
});

test("the map is the same picture three ways: layers, raster, text", () => {
  const d = demo(), m = topDownMap(d, { shotId: "shot_03", size: 32 });
  assert.equal(m.raster.data.length, MAP_CHANNELS.length * 32 * 32);
  const sum = (name) => { const c = MAP_CHANNELS.indexOf(name); return m.raster.data.slice(c * 1024, (c + 1) * 1024).reduce((a, b) => a + b, 0); };
  for (const ch of ["subject", "camera_path", "view_cone", "characters"]) assert.ok(sum(ch) > 0, `${ch} channel is empty`);
  // direction of travel is in the pixels: the path channel is time-coded, not a flat 1
  const path = [...m.raster.data.slice(MAP_CHANNELS.indexOf("camera_path") * 1024, (MAP_CHANNELS.indexOf("camera_path") + 1) * 1024)].filter((v) => v > 0);
  assert.ok(Math.max(...path) - Math.min(...path) > 0.5);
  assert.ok(m.entities.find((e) => e.id === "rival").subject);
  const svg = mapToSvg(m);
  assert.ok(svg.startsWith("<svg") && svg.includes("</svg>") && !svg.includes("NaN"));
  const ascii = mapToAscii(m, 32);
  assert.equal(ascii.split("\n").length, 32);
  assert.ok(ascii.includes("S") && ascii.includes("C"));
});

test("context.map / context.trajectory expose the same evidence to CLI, HTTP and the agent", () => {
  demo();
  const t = R.dispatch("context.trajectory", { shotId: "shot_03", samples: 12 }, sys);
  assert.ok(t.ok); assert.equal(t.declared, "orbit"); assert.equal(t.evaluated.type, "orbit"); assert.equal(t.mismatch, false); assert.equal(t.samples.length, 12);
  const r = R.dispatch("context.map", { as: "raster", size: 16 }, sys);
  assert.ok(Array.isArray(r.raster.data) && r.raster.data.length === MAP_CHANNELS.length * 256, "raster must survive JSON");
  assert.ok(R.dispatch("context.map", { as: "svg" }, sys).svg.startsWith("<svg"));
  assert.equal(R.capabilities().find((c) => c.name === "context.map").undoable, false);
});

test("the shipped shot-size table is not monotonic; the scorer does not inherit that", () => {
  const raw = (k) => 1 / (2 * R.SHOT_SIZES[k].distance * (36 / (2 * R.SHOT_SIZES[k].focal)) / (16 / 9));
  assert.ok(raw("MS") < raw("MLS"), "as shipped, a medium shot frames WIDER than a medium long shot");
  const order = ["ELS", "WS", "MLS", "MS", "MCU", "CU", "ECU"].map((k) => expectedHeightFill(k));
  for (let i = 1; i < order.length; i++) assert.ok(order[i] > order[i - 1], "scoring bands must tighten from ELS to ECU");
});

test("整条复刻：俯视图只画这一场，隔壁那场的人不进图", () => {
  const d = demo(), shot = d.shots[0], subj = R.store.get().entities.find((e) => e.id === (shot.targetIds || [])[0]) || d.entities.find((e) => e.transform?.position);
  const [sx, , sz] = subj.transform.position;
  // 隔壁那块台就挨着这一场的主体：宫格里相邻两场只隔一个 pitch，大景别的机位一扫就能扫到
  const near = { ...subj, id: "next_scene_guy", padId: "pad_b", transform: { ...subj.transform, position: [sx + 1.5, 0, sz + 1.5] } };
  const tiled = { ...d, scene: { ...d.scene, pads: [{ id: "pad_a", x: sx, z: sz, w: 200, d: 200 }, { id: "pad_b", x: sx + 1.5, z: sz + 1.5, w: 4, d: 4 }] }, shots: d.shots.map((s) => (s.id === shot.id ? { ...s, padId: "pad_a" } : s)), entities: [...d.entities, near] };
  const sh = tiled.shots.find((s) => s.id === shot.id);
  assert.ok(topDownMap(tiled, { shotId: sh.id }).entities.some((e) => e.id === "next_scene_guy"), "不收的话，隔壁那场的人会画进来");
  const w = R.sceneForShot(tiled, sh);
  assert.ok(!topDownMap(w, { shotId: sh.id }).entities.some((e) => e.id === "next_scene_guy"));
  assert.ok(w.entities.length === d.entities.length, "这一场自己的和没分到台的都还在");
  assert.equal(R.sceneForShot(d, shot), d, "没分块的工程原样返回");
});
