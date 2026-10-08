// Seedance 提示词模板（来自 awesome-seedance，MIT）。
//
// 这一层的价值全在「导演台已经有的数字，按验证过的结构写出去」。所以测的不是措辞，是三件事：
//   · 分拍真的进了提示词，而且段首尾相接、合计等于声明的时长（上游点名的头号坑）
//   · 选模板有理由，理由说得出口，指定了就不再自动挑
//   · 能机械查的坑真的查了，而且只在该提的时候提
import test from "node:test";
import assert from "node:assert/strict";
import * as R from "../core/index.js";

const { dispatch, store, compileShot } = R;

function scene({ seconds = 12, beats = null, dialogue = "", type = "character", motion = "static", style = "" } = {}) {
  dispatch("project.new", {}, { source: "test" });
  if (style) dispatch("project.set-style", { style, styleZh: style }, { source: "test" });
  dispatch("entity.create", { id: "e1", type, displayName: "主体" }, { source: "test" });
  dispatch("camera.create", { id: "c1", name: "A", target: "e1", preset: "MCU" }, { source: "test" });
  dispatch("shot.create", { id: "s1", title: "测试镜", cameraId: "c1", duration: seconds, motion, targetIds: ["e1"], dialogue }, { source: "test" });
  if (beats) dispatch("shot.beats", { shotId: "s1", beats }, { source: "test" });
  return store.get();
}

const segments = (text) => text.split("\n").filter((l) => /^\[\d\d:\d\d/.test(l));
const spanOf = (line) => line.match(/^\[(\d\d):(\d\d(?:\.\d)?)-(\d\d):(\d\d(?:\.\d)?)\]/).slice(1).map(Number);
const secs = (m, s) => m * 60 + s;

test("分拍真的写进提示词：段首尾相接，合计正好等于声明的时长", () => {
  scene({ seconds: 11.6, beats: [{ seconds: 4, text: "远景停住" }, { seconds: 3.6, text: "推近到手部" }, { seconds: 4, text: "她抬头" }] });
  const p = compileShot("s1");
  for (const lang of ["zh", "en"]) {
    const rows = segments(p.video[lang]);
    assert.equal(rows.length, 3, `${lang} 三拍就该有三段`);
    let prevEnd = 0;
    for (const r of rows) {
      const [am, as, zm, zs] = spanOf(r);
      assert.equal(secs(am, as), prevEnd, "段要首尾相接，不能留空档也不能重叠");
      prevEnd = secs(zm, zs);
    }
    assert.equal(prevEnd, 11.6, "最后一段必须收在声明的时长上 —— 差一点模型就会把末拍拉长去填");
    assert.ok(p.video[lang].includes("远景停住") || p.video[lang].includes("Beat 1"), "拍的内容要带进去");
  }
  // 没拍的镜头就不该凭空长出时间轴
  scene({ seconds: 4 });
  assert.equal(segments(compileShot("s1").video.zh).length, 0);
});

test("改了时长而没改拍：提示词按比例摊平盖满整条，并且说出来", () => {
  // 这条路是真会走到的：shot.beats 会把拍缩放到当时的时长，但之后 shot.update 改时长不碰拍。
  scene({ seconds: 8, beats: [{ seconds: 4, text: "一" }, { seconds: 4, text: "二" }] });
  dispatch("shot.update", { id: "s1", duration: 12 }, { source: "test" });
  const p = compileShot("s1");
  const last = spanOf(segments(p.video.zh).at(-1));
  assert.equal(secs(last[2], last[3]), 12, "摊平之后仍要盖满整条，不能只写到 8 秒");
  assert.ok(p.notes.some((n) => /对不上|合计/.test(n.text)), "对不上要说出来：" + JSON.stringify(p.notes));
});

test("选模板有理由；指定了就不再自动挑，撤销后回到自动", () => {
  scene({ seconds: 12, beats: [{ seconds: 6, text: "一" }, { seconds: 6, text: "二" }] });
  let p = compileShot("s1");
  assert.equal(p.meta.template.id, "timeline-shot-script", "有分拍就该用时间轴模板");
  assert.equal(p.meta.template.auto, true);
  assert.ok(p.meta.template.why.length > 6, "理由要写得出来，界面上要显示");

  assert.ok(dispatch("prompt.template", { id: "anime-style-lock", shotId: "s1" }, { source: "test" }).ok);
  p = compileShot("s1");
  assert.equal(p.meta.template.id, "anime-style-lock");
  assert.equal(p.meta.template.auto, false);
  R.undo();
  assert.equal(compileShot("s1").meta.template.id, "timeline-shot-script", "撤销要能回到自动挑");

  assert.equal(dispatch("prompt.template", { id: "不存在的模板" }, { source: "test" }).error, "NOT_FOUND");
});

test("信号不同挑到的模板不同：台词、车、动画风格各走各的", () => {
  const pick = (opts) => { scene(opts); return compileShot("s1").meta.template.id; };
  assert.equal(pick({ seconds: 4, dialogue: "你到底去不去" }), "dialogue-performance-beats");
  assert.equal(pick({ seconds: 4, type: "vehicle" }), "car-vehicle");
  assert.equal(pick({ seconds: 4, style: "日式动漫赛璐璐" }), "anime-style-lock");
  assert.equal(pick({ seconds: 4 }), "cinematic-narrative-short", "没有特别信号就走通用叙事");
  assert.equal(pick({ seconds: 20 }), "timeline-shot-script", "超过 8 秒即使没拍也该按时间轴写");
});

test("约束永远排在时间轴后面 —— 上游点名的块序", () => {
  scene({ seconds: 12, beats: [{ seconds: 6, text: "一" }, { seconds: 6, text: "二" }] });
  const t = compileShot("s1").video.zh;
  const lastSeg = t.lastIndexOf("[00:");
  assert.ok(t.indexOf("画面无文字") > lastSeg, "负向约束要在时间轴之后");
  assert.ok(t.indexOf("镜头不穿模") > lastSeg, "硬性限制要在时间轴之后");
  assert.ok(t.indexOf("单镜头连续拍摄") < lastSeg, "时长画幅这些全局信息在最前面");
});

test("能机械查的坑真的查了，不该提的时候不提", () => {
  // 长镜头没分拍
  scene({ seconds: 20 });
  assert.ok(compileShot("s1").notes.some((n) => /没有分拍/.test(n.text)));
  // 一拍太长
  scene({ seconds: 12, beats: [{ seconds: 9, text: "一" }, { seconds: 3, text: "二" }] });
  assert.ok(compileShot("s1").notes.some((n) => /2–5 秒/.test(n.text)));
  // 没写内容的拍根本进不来 —— 运行时在入口就挡掉了，所以这里不需要第二道检查
  scene({ seconds: 8 });
  assert.equal(dispatch("shot.beats", { shotId: "s1", beats: [{ seconds: 4, text: "" }] }, { source: "test" }).error, "NO_BEATS");
  // 正常的镜头不该被念叨
  scene({ seconds: 8, beats: [{ seconds: 4, text: "一" }, { seconds: 4, text: "二" }] });
  assert.deepEqual(compileShot("s1").notes, [], "没问题就别说话");
});

test("模板库带着出处：换了哪个 commit 查得到，许可证写得明白", () => {
  assert.equal(R.SEEDANCE_SOURCE.repo, "LearnPrompt/awesome-seedance");
  assert.equal(R.SEEDANCE_SOURCE.license, "MIT");
  assert.match(R.SEEDANCE_SOURCE.commit, /^[0-9a-f]{7,40}$/, "要记下具体 commit，不能只写 main");
  assert.equal(R.SEEDANCE_TEMPLATES.length, 25);
  assert.equal(R.SEEDANCE_CATEGORIES.length, 6);
  // 每个模板都要能被界面和 Agent 用：有标题、有分类、说得清什么时候用
  for (const t of R.templateList("zh")) {
    assert.ok(t.title && t.categoryTitle, t.id);
    assert.ok(t.useWhen.length > 10, `${t.id} 缺 useWhen`);
  }
});
