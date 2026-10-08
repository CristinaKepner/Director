// Shell 层的常驻控件：「自由 / Program / 对照」是视图三档，任何模式下都该在原地。
//
// 起因是真事：对照那一层 z-index 5、HUD 没写 z-index，于是一进对照，这一组按钮
// 整个被盖住 —— 界面上唯一的回头路是「退出对照」，而菜单里压根没有对照这一档。
// 这些都不是 JS 逻辑，是 HTML / CSS / 菜单表里的常量，所以就按常量来守。
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

test("HUD 上三档都在，而且在同一组里", () => {
  const html = read("web/index.html");
  const seg = html.match(/<div class="seg[^"]*">([\s\S]*?)<\/div>/)?.[1] || "";
  for (const id of ["viewFree", "viewProgram", "viewCompare"]) assert.ok(seg.includes(`id="${id}"`), `${id} 不在 HUD 的那一组里`);
});

test("对照那一层不能盖住 HUD", () => {
  const css = read("web/css/app.css");
  const z = (sel) => {
    const rule = css.match(new RegExp(`\\${sel} \\{[^}]*\\}`))?.[0] || "";
    return Number(rule.match(/z-index:\s*(\d+)/)?.[1] ?? 0);
  };
  assert.ok(z(".hud") > z(".stage-compare"), `HUD 的 z-index (${z(".hud")}) 必须高于对照层 (${z(".stage-compare")})`);
});

test("菜单和 HUD 是同一组三档，少一档就会出现「菜单能去、按钮回不来」", () => {
  const main = read("desktop/main.mjs");
  for (const mode of ["free", "program", "compare"]) assert.ok(main.includes(`send("view", "${mode}")`), `舞台菜单缺 ${mode}`);
  const bridge = read("web/js/desktop.js");
  assert.match(bridge, /case "view":[\s\S]{0,200}compare/, "desktop.js 的 view 命令没处理 compare");
});

// 0.6.0 把十一个平铺 tab 收成四段流水线。「收起来」不等于「删掉」——
// 少一个面板就是真的少一块功能，所以十一个 data-bottom 一个都不能丢。
test("流水线之外的面板，必须还能打开", () => {
  const html = read("web/index.html");
  const tabs = [...html.matchAll(/data-bottom="([a-z]+)"/g)].map((m) => m[1]);
  const want = ["shots", "timeline", "takes", "board", "check", "gen", "film", "log", "health"];
  for (const k of want) assert.ok(tabs.includes(k), `面板 ${k} 没有入口了`);
  // 资产不在底部了：0.6.2 搬到左边和场景并排，叫角色库。搬家可以，入口不能丢
  assert.ok(html.includes('data-left="library"') && html.includes('id="library"'), "角色库得有入口和容器");
  // 参照同理：0.9.1 从底部抽屉搬到左栏角色库下面
  assert.ok(html.includes('id="refPanel"'), "参照得有容器（左栏角色库下面）");
  const pipe = html.match(/<div class="pipe" id="pipe">([\s\S]*?)<\/div>/)?.[1] || "";
  // 0.6.3：时间线是剪辑本身，不该折在「更多」里 —— 放在检查前面，主路径成了五段
  assert.deepEqual([...pipe.matchAll(/data-bottom="([a-z]+)"/g)].map((m) => m[1]), ["timeline", "check", "takes", "gen", "film"], "主路径：时间线 → 检查 → 草片 → 生成 → 成片");
});

// 界面上不写句子：说明退到 data-tip 里。图标必须指向雪碧图里真有的符号，
// 指错了是静默失败 —— 画面上只会少一个图标，不报错。
test("每个图标引用都要有对应的 symbol", () => {
  const html = read("web/index.html");
  const defined = new Set([...html.matchAll(/<symbol id="([\w-]+)"/g)].map((m) => m[1]));
  const used = [...html.matchAll(/<use href="#([\w-]+)"/g)].map((m) => m[1]);
  for (const f of ["web/js/ui.js", "web/js/firstrun.js", "web/js/film.js", "web/js/desktop.js"]) {
    const js = read(f);
    for (const m of js.matchAll(/setAttribute\("href", [^)]*?"#([\w-]+)"/g)) used.push(m[1]);
    for (const m of js.matchAll(/href="#([\w-]+)"/g)) used.push(m[1]);
  }
  const missing = [...new Set(used)].filter((id) => !defined.has(id));
  assert.deepEqual(missing, [], "这些图标引用没有对应的 symbol");
  assert.ok(html.includes('id="tip"'), "气泡元素得在页面里");
});

// 面板可拖：三个手柄各管一个 CSS 变量。少一个手柄就是一块拖不动的面板
test("三个面板都拖得动，尺寸走 CSS 变量", () => {
  const html = read("web/index.html"), css = read("web/css/app.css");
  for (const k of ["left", "right", "drawer"]) assert.ok(html.includes(`data-rz="${k}"`), `缺 ${k} 的拖拽手柄`);
  for (const v of ["--left-w", "--right-w", "--drawer-h"]) assert.ok(css.includes(`var(${v})`), `${v} 没被用上`);
  assert.ok(html.includes('id="phys"') && html.includes('id="models"'), "物理信息和模型标签的容器得在");
});

// ---- 对照那一屏：原片从这一场的入点起播 ----
// 起因是真事：在 07 镜按「一起播」，草片放的是 07 镜，原片放的是整条片子的第一帧。
// 三栏并排放的不是同一时刻，对照这件事当场失去意义。
test("对照的每一栏有自己的入点，播放/拖动/回到开头都按这个入点算", () => {
  const ui = read("web/js/ui.js");
  const bind = ui.slice(ui.indexOf("function bindSync"), ui.indexOf("export function renderCompare"));
  assert.ok(/data-in=/.test(ui), "原片那一栏要把这一场的入点写进 data-in");
  assert.ok(/shotSourceSpan\(d, shot\)/.test(ui), "入点来自这一镜在原片里的那一段");
  for (const [name, re] of [["播放", /seekLocal\(v, t\)/], ["回到开头", /seekLocal\(v, 0\)/], ["拖动", /vs\(\)\.forEach\(\(v\) => seekLocal\(v, t\)\)/]]) {
    assert.ok(re.test(bind), `${name}要落在这一栏自己的入点上`);
  }
  assert.ok(!/\.currentTime = 0/.test(bind), "对照里不能再有「归零」——第 0 帧不是这一场的开头");
});

// ---- 节目画面只拍这一场 ----
// 起因是真事：台面分成九块之后，导演在「全部」底下录第一场的草片，
// 录进去的是九块台 —— 第一场的草片里站着别的场的人。
test("程序画面走 renderProgram：录草片之前先把别的台收掉", () => {
  const vp = read("web/js/viewport.js");
  assert.ok(/function programScope\(d\)/.test(vp) && /function renderProgram\(d(, r = renderer)?\)/.test(vp), "缺少节目画面的分块收范围");
  const body = vp.slice(vp.indexOf("function renderProgram"));
  assert.equal((body.match(/\.render\(scene, programCam\)/g) || []).length, 1, "节目画面只能有 renderProgram 那一处渲染；直接渲染就会把别的场录进草片");
  assert.ok(/renderProgram\(d, r\)/.test(vp), "导出静帧也走 renderProgram（换一个渲染器，不换口径）");
  assert.ok(/renderProgram\(store\.get\(\)\)/.test(vp), "抓关键帧也要收范围，否则故事版和草片口径不一致");
});

// ---- 左栏一栏三块：角色库 → 模板库 → 复刻 ----
// 这三件事在一次创作里是连着用的（照着哪条片子、谁在演、话怎么写），
// 分在三个地方就要来回切。0.7.0 把它们摞进同一栏，顺序本身就是那条路。
// 0.9.1 把参照摞进角色库那一栏，用户反馈太挤、不好操作。0.9.2 起三件素材各开各的面板，
// 轨道上排成 角色库 → 参照 → 模板库（参照紧挨在角色库下面），和「场景 / 调参数」之间隔一道线。
test("角色库、参照、模板库各是一个面板，轨道上参照紧挨在角色库下面", () => {
  const html = read("web/index.html"), ui = read("web/js/ui.js");
  const rail = html.match(/<div class="rail">([\s\S]*?)<\/div>/)?.[1] || "";
  const keys = [...rail.matchAll(/data-left="([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(keys, ["scene", "props", "library", "ref", "templates"], "轨道顺序");
  assert.ok(rail.indexOf("rail-sep") > rail.indexOf('data-left="props"') && rail.indexOf("rail-sep") < rail.indexOf('data-left="library"'), "搭场和素材之间有分隔");
  for (const [sec, body] of [["leftLibrary", 'id="library"'], ["leftRef", 'id="refPanel"'], ["leftTemplates", 'id="templates"']]) {
    const m = html.match(new RegExp(`<section id="${sec}">([\\s\\S]*?)<\\/section>`))?.[1] || "";
    assert.ok(m.includes(body), `${sec} 里要有 ${body}`);
  }
  const lib = html.match(/<section id="leftLibrary">([\s\S]*?)<\/section>/)?.[1] || "";
  assert.ok(!lib.includes("refPanel") && !lib.includes('id="templates"'), "角色库那一栏只放角色库");
  assert.ok(!html.includes('data-bottom="ref"') && !html.includes('id="replicate"'), "参照只有左栏这一个面板");
  assert.ok(/if \(tab === "ref"\) return openRef\(\)/.test(ui) && /ui\.left = "ref"/.test(ui), "老的 openDrawer('ref') 落到参照面板");
});

test("3D Jutsu 那一套：+ 物体是菜单不是 prompt，能导出静帧和 GLB，Esc 退出拍摄机视角", () => {
  const html = fs.readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
  const ui = fs.readFileSync(new URL("../web/js/ui.js", import.meta.url), "utf8");
  const vp = fs.readFileSync(new URL("../web/js/viewport.js", import.meta.url), "utf8");
  for (const id of ["addMenu", "glbFile", "stillBtn", "glbBtn", "stillSize"]) assert.ok(html.includes(`id="${id}"`), id);
  assert.ok(!/addEntity"\)\.onclick = \(\) => \{\s*const type = prompt/.test(ui), "+ 物体不再弹两次 prompt");
  assert.ok(/geo === "pyramid"/.test(vp), "四棱锥要画得出来");
  assert.ok(/export async function renderStill/.test(vp) && /export async function exportSceneGlb/.test(vp));
  assert.ok(fs.existsSync(new URL("../web/vendor/three/addons/exporters/GLTFExporter.js", import.meta.url)), "GLTFExporter 随前端 vendor 分发");
  assert.ok(/viewMode === "program"\) dispatch\("project.set-view", \{ mode: "free" \}\)/.test(ui), "Esc 回自由视角");
});
