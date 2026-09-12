// Frontend entry. The page is a client of the Director backend: it connects, receives the authoritative
// snapshot over SSE and sends Actions through client.dispatch(). If no backend answers, it runs standalone
// on the same core runtime with localStorage persistence (previous behaviour).
import "../../core/index.js"; // registers scene.demo / agent.* actions on the local replica
import { store } from "../../core/store.js";
import { dispatch as localDispatch } from "../../core/actions.js";
import { initViewport } from "./viewport.js";
import { bindUI, loadSaved, toast, maybeShowGuide } from "./ui.js";
import { connect, dispatch, client, onMode } from "./client.js";
import { say } from "../../core/agent.js";
import { initDesktop } from "./desktop.js";
import { film } from "./film.js";
import { maybeShowFirstRun, showFirstRun } from "./firstrun.js";

window.__dc = Object.assign(window.__dc || {}, { errors: [], ready: false });
window.addEventListener("error", (e) => window.__dc.errors.push(String(e.message || e)));
window.addEventListener("unhandledrejection", (e) => window.__dc.errors.push(String(e.reason?.message || e.reason)));

bindUI();
const isDesktop = initDesktop(); // mac client: native menu + save/open panels; no-op in a browser
initViewport(document.getElementById("viewport"));

const online = await connect();
if (online) {
  const d = store.get();
  toast(`已连接后端 · ${d.project.name}`);
} else {
  const restored = loadSaved();
  if (!restored) localDispatch("scene.demo", { name: "city-edge" }, { source: "system", actorId: "scene-builder" });
  else say("agent", `已从本地恢复工程「${store.get().project.name}」（${store.get().scene.name}，${store.get().shots.length} 个镜头）。可以继续，或从顶栏「示例…」重置。`);
  toast("单机模式：后端不可达", true);
}
onMode((m) => {
  if (m === "reconnecting") toast("后端连接断开，重连中…", true);
  else if (m === "online") toast("后端已重新连接");
});

window.__dc.store = store;
window.__dc.dispatch = dispatch; // async: routes to backend when online
window.__dc.local = localDispatch; // sync: local replica only (tests / debugging)
window.__dc.client = client;
window.__dc.desktop = isDesktop;
window.__dc.film = film; // 白模逐镜录制 · 逐镜生成 · ffmpeg 拼片（桌面端菜单与自动化都走这里）
window.__dc.ready = true;
window.__dc.firstRun = showFirstRun; // 顶栏「?」之外的入口：随时能再来一次
// 空工程 → 一句话出片；已经有工程的老用户走原来的四步引导
if (!new URLSearchParams(location.search).has("noguide")) {
  if (!maybeShowFirstRun()) maybeShowGuide();
}
