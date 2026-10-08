#!/usr/bin/env node
// 把 awesome-seedance 的模板库取回来，生成 core/seedance-library.js。
//
//   node tools/sync-seedance.mjs [--ref main|<commit>] [--out core/seedance-library.js]
//
// 为什么要同步进来，而不是运行时去拉：
//   · 导演台是桌面应用，断网也要能用；提示词模板是编译提示词的输入，不能是一次网络请求
//   · 上游每天同步（他们从 goodcase.ai 拉），所以要记下取的是哪个 commit —— 出了问题查得到是哪一版
//   · 打包只带 core/ web/ docs/ server/，所以生成物必须落在 core/ 里
//
// 上游是 LearnPrompt/awesome-seedance（MIT）。合并规则照抄它们的 scripts/lib/library.mjs：
// data/style-library.json 是上游蒸馏管线的导出物，data/templates-local.json 是仓库自己手写的一层，
// 后者用 overrides 按 id 打补丁（按语言分的字段逐语言合并），并追加本仓独有的模板。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const REPO = "LearnPrompt/awesome-seedance";
const ref = arg("--ref", "main");
const out = path.resolve(root, arg("--out", "core/seedance-library.js"));

// 运行时真正用得上的字段。案例正文、图片、多语言里的日文这些不带进来 ——
// 生成物是要跟着安装包发的，带不用的东西只是让每台机器多存几百 KB。
const KEEP = ["id", "title", "description", "category", "tags", "useWhen", "structure", "guidance", "pitfalls", "exampleCaseUrls", "local"];
const LANG_KEYED = ["title", "description", "useWhen", "structure", "guidance", "pitfalls"];
const LANGS = ["en", "zh"];

const isObj = (v) => v != null && typeof v === "object" && !Array.isArray(v);

// 照抄上游：按语言分的字段逐语言合并，其余整体替换
function applyOverride(tpl, override) {
  const o = { ...tpl };
  for (const [k, v] of Object.entries(override || {})) {
    if (LANG_KEYED.includes(k) && isObj(v) && isObj(o[k])) o[k] = { ...o[k], ...v };
    else o[k] = v;
  }
  return o;
}

function merge(style, local) {
  const categories = (style.categories || []).map((c) => ({ ...c }));
  for (const cat of local.categories || []) {
    const i = categories.findIndex((c) => c.id === cat.id);
    if (i >= 0) categories[i] = applyOverride(categories[i], cat);
    else categories.push({ ...cat });
  }
  const catIds = new Set(categories.map((c) => c.id));
  const upstreamIds = new Set((style.templates || []).map((t) => t.id));
  for (const id of Object.keys(local.overrides || {})) {
    // 上游删了一个模板而本地还在给它打补丁 —— 这种静默失效最难查，所以直接报错
    if (!upstreamIds.has(id)) throw new Error(`overrides 指向了不存在的模板：${id}`);
  }
  const templates = (style.templates || []).map((t) => applyOverride(t, (local.overrides || {})[t.id]));
  for (const t of local.templates || []) {
    if (templates.some((x) => x.id === t.id)) throw new Error(`模板 id 重复：${t.id}`);
    templates.push({ ...t, exampleCaseUrls: t.exampleCaseUrls || (t.exampleCases || []).map((s) => `https://goodcase.ai/cases/${s}`), local: true });
  }
  for (const t of templates) if (!catIds.has(t.category)) throw new Error(`模板 ${t.id} 指向不存在的分类 ${t.category}`);
  return { categories, templates };
}

// 只留要的字段，语言只留 en / zh
function slim(obj) {
  const o = {};
  for (const k of KEEP) {
    const v = obj[k];
    if (v === undefined) continue;
    if (LANG_KEYED.includes(k) && isObj(v)) {
      const picked = {};
      for (const l of LANGS) if (v[l] !== undefined) picked[l] = v[l];
      o[k] = picked;
    } else o[k] = v;
  }
  return o;
}

async function grab(file) {
  const url = `https://raw.githubusercontent.com/${REPO}/${ref}/${file}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!r.ok) throw new Error(`${file}: HTTP ${r.status}`);
  return JSON.parse(await r.text());
}

async function commitOf() {
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/commits/${ref}`, { headers: { accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(30_000) });
    if (!r.ok) return ref;
    const j = await r.json();
    return j.sha || ref;
  } catch { return ref; }
}

const [style, local, commit] = await Promise.all([grab("data/style-library.json"), grab("data/templates-local.json"), commitOf()]);
const { categories, templates } = merge(style, local);
const data = {
  source: {
    repo: REPO,
    url: `https://github.com/${REPO}`,
    commit,
    ref,
    fetchedAt: new Date().toISOString(),
    license: "MIT",
    note: "模板库来自 awesome-seedance（MIT）。由 tools/sync-seedance.mjs 生成，别手改这个文件。",
  },
  categories: categories.map((c) => slim({ ...c, id: c.id, category: c.id })).map(({ category, ...c }) => c),
  templates: templates.map(slim),
};

const body = `// 由 tools/sync-seedance.mjs 生成，别手改。改了下一次同步就没了。
//
// 来源：${data.source.url}（MIT）
// commit：${commit}
// 取回时间：${data.source.fetchedAt}
//
// 这是 ${templates.length} 个 Seedance 提示词模板的结构、写法和坑，按 ${categories.length} 个分类组织。
// 用它的是 core/seedance.js（选模板、按结构排版）和 core/prompts.js（编译提示词）。
export const SEEDANCE_LIBRARY = ${JSON.stringify(data, null, 1)};
export default SEEDANCE_LIBRARY;
`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, body);
console.log(`${templates.length} 个模板 / ${categories.length} 个分类 → ${path.relative(root, out)}（${(body.length / 1024).toFixed(0)} KB，commit ${String(commit).slice(0, 8)}）`);
for (const c of categories) console.log(`  ${c.id.padEnd(12)} ${templates.filter((t) => t.category === c.id).length} 个`);
