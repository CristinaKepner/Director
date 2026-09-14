// 第一次打开：给一个参照 → 一条能播的片子。
//
// 上一版这里是个空输入框，让人「说一句你想要的片子」。那是错的：创作者最难的一步恰恰就是想那句话。
// 空白输入框对创作者是敌人，不是入口。
//
// 但人手里有图、有片子、有想复刻的东西。而一张画面里恰好编码了最难用语言表达的部分 ——
// 景别、机位高度、焦段感、光位、色调、构图关系。用嘴说这些要专业词汇，用图给只要拖一下。
// 所以入口倒过来：拖参照在前，说一句话退成折叠起来的第二选项。
//
// 默认只跑到白模成片：白模不花钱、一两分钟出结果。真实生成计费，放在看完之后单独问。
import { store } from "../../core/store.js";
import { dispatch, client } from "./client.js";
import { runBlockout, exportFilm } from "./film.js";
import { toast, mediaHref } from "./ui.js";

const KEY = "director-console:firstrun:v2";
const EXAMPLES = [
  "一条 15 秒的咖啡品牌短片：晨光里的一杯手冲，蒸汽升起，最后落在杯子的品牌标",
  "一条 20 秒的运动鞋广告：城市夜跑，霓虹反光，三个镜头从脚步特写到全身跃起",
];

const $ = (id) => document.getElementById(id);
const seen = () => { try { return !!localStorage.getItem(KEY); } catch { return false; } };
const markSeen = () => { try { localStorage.setItem(KEY, "1"); } catch {} };
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

let ref = null; // { url, kind, name, from, to, duration }

export function maybeShowFirstRun() {
  if (seen() || store.get().shots.length) return false;
  render();
  return true;
}
export function showFirstRun() { render(); }

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
        <h1>给我一个参照</h1>
        <p>拖一张图或一段视频进来。我读出它的景别、机位高度、焦段、光位和主体，在 3D 里把场景搭出来，再出一条能播的白模片。大约一两分钟，不花钱。</p>
      </div>

      <div class="fr-drop" id="frDrop">
        <input type="file" id="frFile" accept="image/*,video/*" hidden>
        <div class="fr-drop-in"><b>把图片或视频拖到这里</b><span>也可以点一下选文件 · 视频能只取其中几秒</span></div>
      </div>

      <details class="fr-alt">
        <summary>或者用一句话描述（想得出来的话）</summary>
        <textarea id="frInput" rows="2" placeholder="比如：一条 15 秒的咖啡品牌短片，晨光里的一杯手冲…"></textarea>
        <div class="fr-ex">${EXAMPLES.map((t, i) => `<button data-ex="${i}">${esc(t)}</button>`).join("")}</div>
        <div class="fr-actions"><button id="frGoText">按这句话开始</button></div>
      </details>

      <div class="fr-actions"><button id="frSkip">我自己来</button></div>
      <div class="fr-steps" id="frSteps" hidden></div>
    </div>`;

  const drop = $("frDrop"), file = $("frFile");
  drop.onclick = () => file.click();
  file.onchange = () => file.files[0] && accept(file.files[0]);
  drop.ondragenter = drop.ondragover = (ev) => { ev.preventDefault(); drop.classList.add("over"); };
  drop.ondragleave = () => drop.classList.remove("over");
  // 整个卡片都接住拖拽，别让人非得对准那个框
  el.ondragover = (ev) => ev.preventDefault();
  el.ondrop = drop.ondrop = (ev) => {
    ev.preventDefault();
    drop.classList.remove("over");
    const f = ev.dataTransfer?.files?.[0];
    if (f) accept(f);
  };

  el.querySelectorAll("[data-ex]").forEach((b) => (b.onclick = () => { $("frInput").value = EXAMPLES[b.dataset.ex]; $("frInput").focus(); }));
  $("frSkip").onclick = () => { markSeen(); close(); };
  $("frGoText").onclick = () => startFromText($("frInput").value.trim());
}

function close() { const el = $("firstrun"); if (el) el.hidden = true; }

// ---------- 参照 ----------
async function accept(f) {
  const kind = f.type.startsWith("video") ? "video" : f.type.startsWith("image") ? "image" : null;
  if (!kind) return toast("只认图片和视频", true);
  if (!client.base) return toast("要连上后端才能读参照", true);
  const drop = $("frDrop");
  drop.classList.add("busy");
  drop.querySelector(".fr-drop-in").innerHTML = `<b>正在上传 ${esc(f.name)}…</b><span>${(f.size / 1e6).toFixed(1)} MB</span>`;
  try {
    const r = await fetch(new URL(`upload?label=${kind}`, client.base), { method: "POST", headers: { "content-type": f.type }, body: f });
    const out = await r.json();
    if (!out.ok) throw new Error(out.error || "上传失败");
    ref = { url: out.url, kind, name: f.name, from: 0, to: null, duration: null };
    showRef();
  } catch (err) {
    drop.classList.remove("busy");
    drop.querySelector(".fr-drop-in").innerHTML = `<b>上传失败</b><span>${esc(err.message || err)}</span>`;
  }
}

function showRef() {
  const drop = $("frDrop");
  drop.classList.remove("busy");
  drop.classList.add("has");
  drop.onclick = null; // 有素材了就别再一点就弹文件框
  const src = mediaHref(ref.url);
  drop.innerHTML = ref.kind === "video"
    ? `<video id="frPrev" class="fr-prev" src="${esc(src)}" controls muted playsinline></video>
       <div class="fr-range"><span>取哪一段</span><b id="frSpan">整段</b>
         <button data-span="here">从当前位置取 4 秒</button><button data-span="all">整段</button></div>
       <div class="fr-actions"><button id="frGo" class="primary">读这段并建场</button><button data-span="reset">换一个</button></div>`
    : `<img class="fr-prev" src="${esc(src)}" alt="">
       <div class="fr-actions"><button id="frGo" class="primary">读这张并建场</button><button data-span="reset">换一个</button></div>`;

  const v = $("frPrev");
  if (v) v.onloadedmetadata = () => { ref.duration = v.duration; updateSpan(); };
  drop.querySelectorAll("[data-span]").forEach((b) => (b.onclick = (ev) => {
    ev.stopPropagation();
    const k = b.dataset.span;
    if (k === "reset") return reset();
    if (k === "all") { ref.from = 0; ref.to = null; }
    else if (v) { ref.from = Math.max(0, v.currentTime); ref.to = Math.min(ref.duration || ref.from + 4, ref.from + 4); }
    updateSpan();
  }));
  $("frGo").onclick = (ev) => { ev.stopPropagation(); startFromRef(); };
}

function updateSpan() {
  const el = $("frSpan");
  if (el) el.textContent = ref.to == null ? `整段${ref.duration ? `（${ref.duration.toFixed(1)}s）` : ""}` : `${ref.from.toFixed(1)}s – ${ref.to.toFixed(1)}s`;
}
function reset() { ref = null; render(); }

// ---------- 跑 ----------
function steps(list) {
  const box = $("frSteps");
  if (!box) return;
  box.hidden = false;
  box.innerHTML = list.map((s) => `<div class="fr-step ${s.state}"><span>${s.state === "done" ? "✓" : s.state === "run" ? "◠" : s.state === "fail" ? "✗" : "·"}</span><b>${esc(s.label)}</b><i>${esc(s.note)}</i></div>`).join("");
}

async function startFromRef() {
  if (!ref) return;
  markSeen();
  const plan = [
    { key: "read", label: "读参照：景别 / 机位 / 光位 / 主体", state: "run", note: "" },
    { key: "build", label: "在 3D 里把场景搭出来", state: "wait", note: "" },
    { key: "blockout", label: "逐镜跑白模预演", state: "wait", note: "" },
    { key: "film", label: "拼成一条能播的片子", state: "wait", note: "" },
  ];
  const set = (k, patch) => { Object.assign(plan.find((p) => p.key === k), patch); steps(plan); };
  steps(plan);
  disable(true);

  const r = await dispatch("reference.analyze", { ref: ref.url, from: ref.from || undefined, to: ref.to || undefined, count: ref.kind === "video" ? 6 : 1 });
  if (!r?.ok) { set("read", { state: "fail", note: r?.hint || r?.error || "读不了这个参照" }); return disable(false); }

  const job = await waitJob(r.id, 5 * 60 * 1000, (j) => set("read", { state: "run", note: j.note || `${j.progress || 0}%` }));
  const a = job?.result?.analysis;
  if (!a) { set("read", { state: "fail", note: job?.hint || job?.error || "分析失败" }); return disable(false); }
  const c = a.camera || {};
  set("read", { state: "done", note: `${c.shotSize || ""} ${c.focalMm ? c.focalMm + "mm" : ""} ${c.heightMeters ? c.heightMeters + "m" : ""} · ${(a.subjects || []).length} 个主体` });

  await build(briefFrom(a), set);
}

async function startFromText(text) {
  if (!text) return toast("先说一句，或者拖个参照进来", true);
  markSeen();
  const plan = [
    { key: "build", label: "理解需求，搭出场景和分镜", state: "run", note: "" },
    { key: "blockout", label: "逐镜跑白模预演", state: "wait", note: "" },
    { key: "film", label: "拼成一条能播的片子", state: "wait", note: "" },
  ];
  const set = (k, patch) => { Object.assign(plan.find((p) => p.key === k), patch); steps(plan); };
  steps(plan);
  disable(true);
  await build(text, set);
}

// 结构化分析 → 一段 planner 能吃的导演口述。比直接丢 JSON 好：planner 读的是镜头语言。
function briefFrom(a) {
  const c = a.camera || {}, l = a.lighting || {}, s = a.scene || {}, m = a.motion || {};
  const subs = (a.subjects || []).map((x) => `${x.displayName}（${x.semanticType}${x.look ? "，" + x.look : ""}${x.screenPosition ? "，在" + x.screenPosition : ""}）`).join("；");
  const beats = (a.beats || []).length ? `\n按拍拆分：${a.beats.map((b, i) => `${i + 1}) ${b.seconds}s ${b.text}`).join("；")}` : "";
  return [
    `复刻这个参照镜头：${a.brief || a.summary || ""}`,
    s.name || s.setting ? `场景：${s.name || ""}${s.setting ? "，" + s.setting : ""}${s.timeOfDay ? "，" + s.timeOfDay : ""}${s.palette ? "，主色调" + s.palette : ""}。` : "",
    subs ? `画面里的主体：${subs}。把它们建成语义代理体并按描述摆位。` : "",
    `机位：${c.shotSize || "MS"} 景别，${c.angle || "eye"} 视角，机位高度约 ${c.heightMeters ?? 1.5} 米，焦段约 ${c.focalMm ?? 40}mm，光圈 f/${c.aperture ?? 2.8}。${c.framing ? "构图：" + c.framing + "。" : ""}`,
    `灯光：主光${l.keyDirection || "正面"}，${l.ratio || "柔和"}，${l.colorTemp || "中性"}。${(l.practicals || []).length ? "画面内光源：" + l.practicals.join("、") + "。" : ""}`,
    `运镜：${m.type || "static"}${m.description ? "，" + m.description : ""}${m.speed ? "，" + m.speed : ""}。`,
    beats,
    "建成一个镜头就行，时长按上面的拍数合计；画幅 16:9。",
  ].filter(Boolean).join("\n");
}

async function build(brief, set) {
  const r = await dispatch("agent.run", { text: brief, mode: "lead", force: true });
  const shots = store.get().shots;
  if (!shots.length) { set("build", { state: "fail", note: r?.error || "没能建出镜头，换个参照或换句话再试" }); return disable(false); }
  const secs = shots.reduce((n, s) => n + (s.range.outFrame - s.range.inFrame), 0) / store.get().project.fps;
  set("build", { state: "done", note: `${shots.length} 个镜头 · 共 ${Math.round(secs)} 秒` });

  set("blockout", { state: "run", note: "" });
  const bo = await runBlockout({ onProgress: (p) => p.phase === "record" && set("blockout", { state: "run", note: `第 ${p.index}/${p.total} 镜 · ${p.title}` }) });
  if (!bo.ok) { set("blockout", { state: "fail", note: bo.hint || bo.error || "录制没成功" }); return disable(false); }
  set("blockout", { state: "done", note: `${bo.recorded}/${bo.of} 镜` });

  set("film", { state: "run", note: "" });
  const film = await exportFilm({ source: "blockout", name: `${store.get().project.name.replace(/\s+/g, "_")}_blockout`, onProgress: (p) => set("film", { state: "run", note: p.note || `${p.progress || 0}%` }) });
  if (!film?.ok) { set("film", { state: "fail", note: film?.hint || film?.error || "拼接失败" }); return disable(false); }
  set("film", { state: "done", note: `${Math.round(film.seconds)} 秒` });
  done(film);
}

async function waitJob(id, timeout, onTick) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const j = store.get().jobs.find((x) => x.id === id);
    if (j && ["done", "failed"].includes(j.status)) return j;
    if (j && onTick) onTick(j);
    if (Date.now() > deadline) return null;
    await new Promise((r) => setTimeout(r, 1200));
  }
}

function disable(on) {
  ["frGo", "frGoText", "frSkip"].forEach((id) => { const n = $(id); if (n) n.disabled = on; });
}

function done(film) {
  const el = $("firstrun");
  if (!el) return;
  el.querySelector(".fr-card").innerHTML = `
    <div class="fr-head"><h1>白模片出来了</h1><p>镜头、走位、光位、焦段都在里面，画面质感还没有。下一步拿它去生成——<b>构图和运动照着白模走，所以人物不会每次换一张脸</b>。</p></div>
    <video class="fr-video" src="${esc(mediaHref(film.url))}" controls autoplay muted loop playsinline></video>
    <div class="fr-actions">
      <button id="frOpen" class="primary">进导演台改</button>
      <button id="frRender">用 Seedance 出画面（计费）</button>
    </div>
    <div class="fr-note">白模免费，改多少次都不花钱：机位、走位、光、焦段随便调，调好再生成。生成按镜头计费，一条十几秒的片子通常几分钟出完。生成完可以在底部「成片 → 对照」里和白模并排看。</div>`;
  $("frOpen").onclick = close;
  $("frRender").onclick = async () => {
    close();
    const { renderShots } = await import("./film.js");
    toast("开始逐镜生成，进度看底部「生成」");
    const r = await renderShots({ provider: "seedance-2.5", mode: "auto" });
    const ok = (r.results || []).filter((x) => x.status === "done").length;
    toast(ok ? `生成完成 ${ok} 镜，底部「成片 → 对照」可以和白模并排看` : "生成没成功，看任务里的错误", !ok);
  };
}
