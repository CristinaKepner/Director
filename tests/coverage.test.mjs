// 多机位覆盖：一条素材，同一瞬间换 N 个机位再拍一遍。
//
// 这件事的全部价值在于「机位是算出来的，不是形容的」。所以测的是数：
//   · 段首尾相接、盖满整条，因为原声要对得上
//   · 米数和度数跟 camera.frame 真正摆机位算出来的是同一个
//   · 描述和数字不许打架（写过一版「正脸坐姿视平」而算出来是俯 26 度）
//   · 那条硬约束一定在最后：前面每段都在说换机位，不钉住「别的不许动」，表演也会被重演
import test from "node:test";
import assert from "node:assert/strict";
import * as R from "../core/index.js";

const { dispatch, store } = R;

function scene(seconds = 19.53) {
  dispatch("project.new", {}, { source: "test" });
  dispatch("entity.create", { id: "e1", type: "character", displayName: "他" }, { source: "test" });
  dispatch("camera.create", { id: "c1", name: "A", target: "e1", preset: "MS" }, { source: "test" });
  dispatch("shot.create", { id: "s1", title: "咖啡馆", cameraId: "c1", duration: seconds, targetIds: ["e1"] }, { source: "test" });
  return store.get();
}

test("段首尾相接、盖满整条 —— 原声要对得上，中间不能有缝", () => {
  const d = scene(19.53);
  const plan = R.planCoverage(d.shots[0], d);
  assert.equal(plan.count, 13, "19.53 秒按 1.5 秒一段就是 13 个机位，和原帖一致");
  let t = 0;
  for (const s of plan.segments) {
    assert.equal(s.from, t, "不能留空档");
    assert.ok(s.to > s.from);
    t = s.to;
  }
  assert.equal(t, plan.seconds, "最后一段收在整条结尾");
  assert.equal(new Set(plan.segments.map((s) => s.index)).size, 13);
});

test("相邻两个机位不许撞在同一套上 —— 撞了剪出来就是跳帧", () => {
  const d = scene(19.53);
  const segs = R.planCoverage(d.shots[0], d).segments;
  for (let i = 1; i < segs.length; i++) {
    assert.notDeepEqual([segs[i].size, segs[i].angle], [segs[i - 1].size, segs[i - 1].angle], `第 ${i + 1} 段和上一段一模一样`);
  }
});

test("米数和度数就是 camera.frame 会摆出来的那个位置", () => {
  const d = scene(8);
  const seg = R.planCoverage(d.shots[0], d).segments[0];
  // 拿同一套参数真的去摆一次机位，高度必须对得上
  dispatch("camera.create", { id: "c2", name: "B", target: "e1" }, { source: "test" });
  const r = dispatch("camera.frame", { id: "c2", target: "e1", size: seg.size, angle: seg.angle }, { source: "test" });
  assert.ok(r.ok);
  const cam = store.get().cameras.find((c) => c.id === "c2");
  assert.ok(Math.abs(cam.pose.position[1] - seg.height) < 0.02, `机位表说 ${seg.height} m，真摆出来是 ${cam.pose.position[1]} m`);
  assert.equal(cam.lens.focalLength, seg.focal, "焦段也要是同一个");
});

test("俯仰的说法要跟算出来的高度一致，不能自相矛盾", () => {
  const d = scene(19.53);
  for (const s of R.planCoverage(d.shots[0], d).segments) {
    const above = s.pitch >= 8, below = s.pitch <= -8;
    if (above) assert.match(s.zh, /俯 \d+ 度/, `${s.zh} —— 机位在上却没说俯`);
    if (below) assert.match(s.zh, /仰 \d+ 度/, `${s.zh} —— 机位在下却没说仰`);
    if (!above && !below) assert.match(s.zh, /基本平视/);
    // 牌面上不许再写一遍高低，否则两边会打架
    assert.ok(!/视平|眼平|齐平的机位/.test(s.note.zh), `牌面不该写高低：${s.note.zh}`);
  }
});

test("硬约束在最后一行，原声那句在最前面", () => {
  const d = scene(19.53);
  const p = R.coveragePrompt(d.shots[0], d, null, "zh");
  const lines = p.split("\n").filter(Boolean);
  assert.match(lines.at(-1), /不许改动/);
  assert.match(lines.at(-1), /唯一的变量是机位和镜头/);
  assert.match(lines[1], /原声原样保留并保持同步/);
  assert.match(lines[1], /19\.5/, "要说明输出跑满多长");
  assert.equal(p.split("\n").filter((l) => /^\[\d\d:/.test(l)).length, 13);
  // 英文那版结构一样
  const en = R.coveragePrompt(d.shots[0], d, null, "en").split("\n").filter(Boolean);
  assert.match(en.at(-1), /DO NOT CHANGE/);
  assert.match(en[1], /unchanged and in sync/);
});

test("shot.coverage 存在镜头上，太短的镜头当场拒绝", () => {
  scene(19.53);
  const r = dispatch("shot.coverage", {}, { source: "test" });
  assert.ok(r.ok);
  assert.equal(r.count, 13);
  assert.equal(store.get().shots[0].coverage.segments.length, 13);
  // 编译提示词时多出 coverage 那一栏，和 video 分开
  const p = R.compileShot("s1");
  assert.equal(p.coverage.count, 13);
  assert.ok(p.coverage.zh.includes("唯一的变量"));
  assert.ok(!p.video.zh.includes("唯一的变量"), "别把它混进普通的视频提示词里");

  assert.ok(dispatch("shot.coverage", { clear: true }, { source: "test" }).ok);
  assert.equal(store.get().shots[0].coverage, undefined);
  assert.equal(R.compileShot("s1").coverage, null);

  scene(1.5);
  assert.equal(dispatch("shot.coverage", {}, { source: "test" }).error, "TOO_SHORT");
});

test("机位数量可以自己定，夹在能摆得出来的范围里", () => {
  scene(19.53);
  assert.equal(dispatch("shot.coverage", { count: 4 }, { source: "test" }).count, 4);
  assert.equal(dispatch("shot.coverage", { count: 99 }, { source: "test" }).count, R.MAX_ANGLES, "超过牌面数量要夹住");
  assert.equal(R.suggestCount(19.53), 13);
  assert.equal(R.suggestCount(3), 3, "太短也至少给 3 个，否则不叫覆盖");
});
