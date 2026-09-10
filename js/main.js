import "./runtime.js"; // registers scene.demo / agent.* actions
import { store } from "./store.js";
import { dispatch } from "./actions.js";
import { initViewport } from "./viewport.js";
import { bindUI, loadSaved, toast } from "./ui.js";
import { connectBridge } from "./bridge.js";
import { say } from "./agent.js";

window.__dc = Object.assign(window.__dc || {}, { errors: [], ready: false });
window.addEventListener("error", (e) => window.__dc.errors.push(String(e.message || e)));
window.addEventListener("unhandledrejection", (e) => window.__dc.errors.push(String(e.reason?.message || e.reason)));

bindUI();
initViewport(document.getElementById("viewport"));

const restored = loadSaved();
if (!restored) dispatch("scene.demo", { name: "city-edge" }, { source: "system", actorId: "scene-builder" });
else say("agent", `已从本地恢复工程「${store.get().project.name}」（${store.get().scene.name}，${store.get().shots.length} 个镜头）。可以继续，或从顶栏「示例…」重置。`);

connectBridge();

window.__dc.store = store;
window.__dc.dispatch = dispatch;
window.__dc.ready = true;
if (!restored) toast("已载入示例场景「城市边缘」· Program 40 mm · 三镜");
