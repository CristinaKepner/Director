// 前端是浏览器直接加载的 ES 模块：一个具名导入对不上，整个模块图加载失败，界面一片死 ——
// 0.7.0 就是这样发出去的（ui.js 从 seedance.js 要 SEEDANCE_CATEGORIES，而那个名字只在 core/index.js 里起过别名）。
// node 下的单测从来不加载 web/js，所以这里按源码把每一条具名导入核一遍。
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IMPORT = /import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/g;
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

function exportsOf(file, seen = new Set()) {
  if (seen.has(file)) return new Set();
  seen.add(file);
  const src = strip(fs.readFileSync(file, "utf8")), out = new Set();
  for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g)) out.add(m[1]);
  for (const m of src.matchAll(/export\s+(?:const|let|var)\s+([^=;]+?=[^;]*?)(?:;|\n)/g)) for (const n of m[1].matchAll(/(?:^|,)\s*([A-Za-z_$][\w$]*)\s*=/g)) out.add(n[1]);
  for (const m of src.matchAll(/export\s*\{([^}]*)\}(?:\s*from\s*["']([^"']+)["'])?/g)) for (const part of m[1].split(",")) { const p = part.trim().split(/\s+as\s+/); if (p[0]) out.add((p[1] || p[0]).trim()); }
  for (const m of src.matchAll(/export\s*\*\s*from\s*["']([^"']+)["']/g)) for (const n of exportsOf(path.resolve(path.dirname(file), m[1]), seen)) out.add(n);
  return out;
}

test("web/js 里每一条具名导入，对方模块都真的导出了这个名字", () => {
  const dir = path.join(root, "web/js"), bad = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".js"))) {
    const file = path.join(dir, f), src = strip(fs.readFileSync(file, "utf8"));
    for (const m of src.matchAll(IMPORT)) {
      if (!m[2].startsWith(".")) continue; // three / three/addons 走 importmap，不在这里核
      const target = path.resolve(dir, m[2]);
      assert.ok(fs.existsSync(target), `${f} 导入的 ${m[2]} 不存在`);
      const have = exportsOf(target);
      for (const part of m[1].split(",")) { const name = part.trim().split(/\s+as\s+/)[0].trim(); if (name && !have.has(name)) bad.push(`${f}: { ${name} } from "${m[2]}"`); }
    }
  }
  assert.deepEqual(bad, [], `这些导入在浏览器里会让整个界面加载失败：\n${bad.join("\n")}`);
});
