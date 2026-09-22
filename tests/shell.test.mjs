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
  const want = ["shots", "timeline", "takes", "board", "ref", "check", "gen", "film", "log", "health"];
  for (const k of want) assert.ok(tabs.includes(k), `面板 ${k} 没有入口了`);
  // 资产不在底部了：0.6.2 搬到左边和场景并排，叫角色库。搬家可以，入口不能丢
  assert.ok(html.includes('data-left="library"') && html.includes('id="library"'), "角色库得有入口和容器");
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
