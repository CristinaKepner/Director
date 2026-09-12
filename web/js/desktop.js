// macOS client adapter. Loaded by main.js; a no-op in a plain browser.
// The page stays the same client of the same backend — this only swaps browser affordances
// for native ones (menu commands, save/open panels) and lets the top bar act as the title bar.
import { openDrawer, toast } from "./ui.js";
import { focusSelected, resetView } from "./viewport.js";
import { store } from "../../core/store.js";
import { runBlockout, renderShots, exportFilm } from "./film.js";

const $ = (id) => document.getElementById(id);
const click = (id) => $(id)?.click();

export function initDesktop() {
  const bridge = window.director;
  if (!bridge?.desktop) return false;

  document.body.classList.add("desktop");
  bridge.onFocus?.((focused) => document.body.classList.toggle("blur", !focused));

  bridge.onMenu?.(async (cmd, payload) => {
    const dispatch = window.__dc?.dispatch;
    switch (cmd) {
      case "undo": return click("undoBtn");
      case "redo": return click("redoBtn");
      case "export-project": return click("exportBtn");
      case "new-project":
        if (await confirmNative("新建空工程？", "当前工程会被替换。导出后再新建可以留底。")) report(dispatch?.("project.new", { name: "Untitled" }, { source: "human" }));
        return;
      case "load-project":
        return report(dispatch?.("project.load", { data: payload }, { source: "human" }));
      case "demo":
        if (await confirmNative(`载入示例「${payload}」？`, "当前工程会被替换。")) report(dispatch?.("scene.demo", { name: payload }, { source: "human" }));
        return;
      case "delete": return click("deleteSel");
      case "play": return click("playBtn");
      case "record": return click("recordBtn");
      case "view": return click(payload === "program" ? "viewProgram" : "viewFree");
      case "reset-view": return resetView();
      case "focus": return focusSelected();
      case "new-shot": return click("newShotBtn");
      case "left": return document.querySelector(`[data-left="${payload}"]`)?.click();
      case "drawer": return click("drawerBtn");
      case "agent-focus": return $("agentInput")?.focus();
      case "guide": return click("guideBtn");
      case "drawer-tab": return openDrawer(payload);
      case "film-blockout": return filmBlockout(payload);
      case "film-render": return filmRender(payload);
      case "film-export": return filmExport(payload);
      case "film-pipeline": return filmPipeline(payload);
      default: return;
    }
  });

  // 菜单只在"真的能做"时才亮：把工程当前的可用素材推给主进程
  let lastState = "";
  const pushState = () => {
    const d = store.get();
    const has = (s) => d.takes.some((t) => t.shotId === s.id && t.videoUrl) || d.jobs.some((j) => j.shotId === s.id && j.status === "done" && j.result?.url && /\.(mp4|webm|mov)$/i.test(j.result.url));
    const next = {
      shots: d.shots.length,
      takes: d.takes.filter((t) => t.videoUrl).length,
      generated: d.jobs.filter((j) => j.status === "done" && j.result?.url && /\.(mp4|webm|mov)$/i.test(j.result.url)).length,
      clips: d.shots.filter(has).length,
      pendingAssets: d.assets.filter((a) => !a.approved).length,
      currentShotId: d.project.currentShotId,
    };
    const key = JSON.stringify(next);
    if (key === lastState) return;
    lastState = key;
    bridge.state?.(next);
  };
  store.subscribe(() => pushState());
  pushState();

  // window title follows the project name
  const name = $("projectName");
  if (name) new MutationObserver(sync).observe(name, { attributes: true, attributeFilter: ["value"] });
  setInterval(sync, 1500);
  function sync() {
    const n = name?.value?.trim();
    if (n && document.title !== n) document.title = n;
  }
  return true;
}

async function confirmNative(message, detail) {
  if (window.director?.confirm) return window.director.confirm({ message, detail });
  return confirm(message);
}

async function report(p) {
  const r = await p;
  if (r && !r.ok) toast(r.error || "操作失败", true);
}

// ---- 成片流水线（菜单命令）。录制与生成都在页面里跑，因为只有这里真的在渲染 Program 画面。----
const native = () => window.director;
let running = false;

function begin(label) {
  if (running) { toast("已经有一个成片任务在跑了", true); return false; }
  running = true;
  native()?.busy?.(true, label);
  native()?.progress?.({ label, value: 0 });
  return true;
}
function step(label, value) {
  native()?.progress?.({ label, value });
}
function end(msg, err) {
  running = false;
  native()?.busy?.(false);
  native()?.progress?.({ label: null, value: null });
  if (msg) toast(msg, !!err);
}

const shotScope = (payload) => (payload?.current && store.get().project.currentShotId ? [store.get().project.currentShotId] : undefined);

async function filmBlockout(payload) {
  const ids = shotScope(payload);
  const total = ids?.length || store.get().shots.length;
  if (!total) return toast("还没有镜头：先让 Agent 出一版分镜", true);
  if (!(await confirmNative(`录制白模：${total} 个镜头`, "逐镜把 Program 画面录成代理视频，抓关键帧进故事版，并自动 Circle。期间别切走窗口。"))) return;
  if (!begin("录制白模")) return;
  try {
    const r = await runBlockout({
      shotIds: ids,
      onProgress: (p) => p.phase !== "done" && step(`录白模 ${p.index}/${p.total} · ${p.title}`, p.index / p.total),
    });
    end(r.ok ? `白模录完：${r.recorded}/${r.of} 镜` : `录制失败：${r.error || "没有成功的镜头"}`, !r.ok);
    native()?.notify?.({ title: "白模录制完成", body: `${r.recorded}/${r.of} 镜` });
  } catch (err) {
    end(`录制出错：${err.message || err}`, true);
  }
}

async function filmRender(payload = {}) {
  const ids = shotScope(payload);
  const total = ids?.length || store.get().shots.length;
  if (!total) return toast("还没有镜头", true);
  const mode = payload.mode || "auto";
  if (!(await confirmNative(`用 ${payload.provider || "seedance-2.5"} 生成 ${total} 个镜头？`, `模式 ${mode}${mode === "auto" ? "（有故事版关键帧走 i2v，否则 t2v）" : ""}。已批准的参考图会自动随行保证一致性。这会真实计费。`))) return;
  if (!begin("逐镜生成")) return;
  try {
    const r = await renderShots({
      shotIds: ids,
      provider: payload.provider || "seedance-2.5",
      mode,
      onProgress: (p) => (p.phase === "submit" ? step(`提交 ${p.index}/${p.total} · ${p.title}`, p.index / p.total / 2) : step(`生成中 ${p.done}/${p.total}`, 0.5 + (p.done / p.total) * 0.5)),
    });
    const done = (r.results || []).filter((x) => x.status === "done").length;
    const failed = (r.results || []).filter((x) => x.status !== "done");
    end(`生成完成：${done}/${(r.results || []).length} 镜${failed.length ? `，失败 ${failed.map((f) => f.error || "?").join("/")}` : ""}`, !r.ok);
    native()?.notify?.({ title: "逐镜生成完成", body: `${done} 镜成功${failed.length ? `，${failed.length} 镜失败` : ""}` });
  } catch (err) {
    end(`生成出错：${err.message || err}`, true);
  }
}

async function filmExport(payload = {}) {
  const source = payload.source || "auto";
  if (!begin("拼接成片")) return;
  try {
    const r = await exportFilm({
      source,
      name: `${store.get().project.name.replace(/\s+/g, "_")}_${source}`,
      onProgress: (p) => step(`拼接 ${p.note || ""}`, (p.progress || 0) / 100),
    });
    if (!r?.ok) {
      end(`拼接失败：${r?.hint || r?.message || r?.error || "未知错误"}`, true);
      return;
    }
    end(`成片完成 ${Math.round(r.seconds)}s`);
    await native()?.filmDone?.({ ...r, kind: source === "blockout" ? "blockout" : "film" });
  } catch (err) {
    end(`拼接出错：${err.message || err}`, true);
  }
}

async function filmPipeline(payload = {}) {
  if (!(await confirmNative("一条龙：录白模 → 拼白模片 → 逐镜生成 → 拼成片", "全程可能十几分钟，生成会真实计费。中途可以关窗口中断。"))) return;
  await filmBlockout({});
  await filmExport({ source: "blockout" });
  await filmRender(payload);
  await filmExport({ source: "generated" });
}
