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
  const seg = html.match(/<div class="seg">([\s\S]*?)<\/div>/)?.[1] || "";
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
