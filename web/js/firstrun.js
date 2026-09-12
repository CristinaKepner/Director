// 第一次打开：一句话 → 一条能播的片子。
//
// 原来的第一屏要求你已经知道「镜头 / 机位 / Take / 故事版」是什么，对没做过片子的人来说
// 每一个词都是一道门槛。这里把门槛收成一句话：说你想要什么片子，剩下的自动跑完，
// 跑完给你一条真的能播的白模成片，再让你指着画面说要改什么。
//
// 默认只跑到白模成片：**白模不花钱、一两分钟出结果**。真实生成是要计费的，
// 所以放在成片之后单独问一次，而不是替用户决定。
import { store } from "../../core/store.js";
import { dispatch } from "./client.js";
import { runBlockout, exportFilm } from "./film.js";
import { toast, mediaHref } from "./ui.js";

const KEY = "director-console:firstrun:v1";
const EXAMPLES = [
  "一条 15 秒的咖啡品牌短片：晨光里的一杯手冲，蒸汽升起，最后落在杯子的品牌标",
  "一条 20 秒的运动鞋广告：城市夜跑，霓虹反光，三个镜头从脚步特写到全身跃起",
  "一条 12 秒的护肤品概念片：水滴落在肌理表面缓慢晕开，极简暖白，一镜到底",
];

const $ = (id) => document.getElementById(id);
const seen = () => { try { return !!localStorage.getItem(KEY); } catch { return false; } };
const markSeen = () => { try { localStorage.setItem(KEY, "1"); } catch {} };

export function maybeShowFirstRun() {
  const d = store.get();
  if (seen() || d.shots.length) return false;
  render();
  return true;
}

export function showFirstRun() {
  render();
}

function render() {
  let el = $("firstrun");
  if (!el) {
    el = document.createElement("div");
    el.id = "firstrun";
    el.className = "firstrun";
    document.body.appendChild(el);
  }
  el.hidden = false;
  el.innerHTML = `
    <div class="fr-card">
      <div class="fr-head">
        <h1>说一句你想要的片子</h1>
        <p>剩下的我来跑：搭场景、分镜头、出一条能播的白模成片。大约一两分钟，不花钱。</p>
      </div>
      <textarea id="frInput" rows="3" placeholder="比如：一条 15 秒的咖啡品牌短片，晨光里的一杯手冲…"></textarea>
      <div class="fr-ex">${EXAMPLES.map((t, i) => `<button data-ex="${i}">${t}</button>`).join("")}</div>
      <div class="fr-actions">
        <button id="frGo" class="primary">开始</button>
        <button id="frSkip">我自己来</button>
      </div>
      <div class="fr-steps" id="frSteps" hidden></div>
    </div>`;

  el.querySelectorAll("[data-ex]").forEach((b) => (b.onclick = () => { $("frInput").value = EXAMPLES[b.dataset.ex]; $("frInput").focus(); }));
  $("frSkip").onclick = () => { markSeen(); close(); };
  $("frGo").onclick = () => start($("frInput").value.trim());
  $("frInput").onkeydown = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") start($("frInput").value.trim()); };
  setTimeout(() => $("frInput")?.focus(), 50);
}

function close() {
  const el = $("firstrun");
  if (el) el.hidden = true;
}

// 一步一步说在做什么。跑长流程时，沉默比慢更让人不安。
function steps(list) {
  const box = $("frSteps");
  if (!box) return;
  box.hidden = false;
  box.innerHTML = list.map((s) => `<div class="fr-step ${s.state}"><span>${s.state === "done" ? "✓" : s.state === "run" ? "◠" : s.state === "fail" ? "✗" : "·"}</span><b>${s.label}</b><i>${s.note || ""}</i></div>`).join("");
}

async function start(text) {
  if (!text) return toast("先说一句你想要什么片子", true);
  markSeen();
  const input = $("frInput"), go = $("frGo"), skip = $("frSkip");
  [input, go, skip].forEach((n) => n && (n.disabled = true));
  go.textContent = "跑着呢…";

  const plan = [
    { key: "build", label: "理解需求，搭出场景和分镜", state: "run", note: "" },
    { key: "blockout", label: "逐镜跑白模预演", state: "wait", note: "" },
    { key: "film", label: "拼成一条能播的片子", state: "wait", note: "" },
  ];
  const set = (key, patch) => { Object.assign(plan.find((p) => p.key === key), patch); steps(plan); };
  steps(plan);

  try {
    // 1. 一句话 → 工程。lead 模式直接执行，不再多问一轮。
    const r = await dispatch("agent.run", { text, mode: "lead", force: true });
    const shots = store.get().shots;
    if (!shots.length) {
      set("build", { state: "fail", note: r?.error || "没能建出镜头，换句话再说一次试试" });
      [input, go, skip].forEach((n) => n && (n.disabled = false));
      go.textContent = "再试一次";
      return;
    }
    const secs = shots.reduce((n, s) => n + (s.range.outFrame - s.range.inFrame), 0) / store.get().project.fps;
    set("build", { state: "done", note: `${shots.length} 个镜头 · 共 ${Math.round(secs)} 秒` });

    // 2. 白模：页面真的把每个镜头录一遍
    set("blockout", { state: "run", note: "" });
    const bo = await runBlockout({ onProgress: (p) => p.phase === "record" && set("blockout", { state: "run", note: `第 ${p.index}/${p.total} 镜 · ${p.title}` }) });
    if (!bo.ok) {
      set("blockout", { state: "fail", note: bo.hint || bo.error || "录制没成功" });
      return finish(false);
    }
    set("blockout", { state: "done", note: `${bo.recorded}/${bo.of} 镜` });

    // 3. 拼片
    set("film", { state: "run", note: "" });
    const film = await exportFilm({ source: "blockout", name: `${store.get().project.name.replace(/\s+/g, "_")}_blockout`, onProgress: (p) => set("film", { state: "run", note: p.note || `${p.progress || 0}%` }) });
    if (!film?.ok) {
      set("film", { state: "fail", note: film?.hint || film?.error || "拼接失败" });
      return finish(false);
    }
    set("film", { state: "done", note: `${Math.round(film.seconds)} 秒` });
    done(film);
  } catch (err) {
    toast(`没跑完：${err.message || err}`, true);
    finish(false);
  }
}

function finish(ok) {
  const go = $("frGo"), skip = $("frSkip"), input = $("frInput");
  [input, go, skip].forEach((n) => n && (n.disabled = false));
  if (go) go.textContent = ok ? "完成" : "再试一次";
}

function done(film) {
  const el = $("firstrun");
  if (!el) return;
  const url = film.url;
  el.querySelector(".fr-card").innerHTML = `
    <div class="fr-head"><h1>片子出来了</h1><p>这是白模版：镜头、节奏、调度都在里面，还没有画面质感。看完直接跟右边的 Agent 说要改什么。</p></div>
    <video class="fr-video" src="${mediaHref(url)}" controls autoplay muted loop playsinline></video>
    <div class="fr-actions">
      <button id="frOpen" class="primary">进导演台改</button>
      <button id="frRender">用 Seedance 出画面（计费）</button>
    </div>
    <div class="fr-note">白模是免费的。真实生成按镜头计费，一条十几秒的片子通常几分钟出完。</div>`;
  $("frOpen").onclick = close;
  $("frRender").onclick = async () => {
    close();
    const { renderShots } = await import("./film.js");
    toast("开始逐镜生成，进度看右边的任务");
    const r = await renderShots({ provider: "seedance-2.5", mode: "auto" });
    const okCount = (r.results || []).filter((x) => x.status === "done").length;
    toast(okCount ? `生成完成 ${okCount} 镜，「成片 → 导出成片」可以拼成片` : "生成没成功，看任务里的错误", !okCount);
  };
}
