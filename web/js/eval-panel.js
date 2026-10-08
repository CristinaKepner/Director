// 评测面板：「按要求改了，没把已经满意的部分改坏」—— 这一句要能在导演台里被看见，而不是靠感觉。
// 三列事实，来源各不相同，都摆明：
//   约束核对   review.contract：锁住的每一条现在还在不在。几何的当场算，验不了的标「需判定模型」
//   判定结论   review.verify   ：判定模型看两版生成画面，锁住的有没有漂、要改的改了没
//   控制方式   同一镜的每一次生成：用的什么控制（文字 / 首帧 / 白模视频），判定模型说保住了几条
// 数据都从 store 来；这里只渲染和派发 Action，不算任何东西。
import { LOCK_ASPECTS, GEN_MODES } from "../../core/schema.js";
import { dispatch } from "./client.js";

const esc = (s) => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const MARK = { pass: "✓", violate: "✗", unverifiable: "?" };
const ASPECT_NOTE = { identity: "换视角后还是这个人吗", wardrobe: "衣服、颜色、配饰", performance: "表情、手势、走位", framing: "景别、主体位置、头顶留白", lighting: "主光方向、明暗比、色温", palette: "配色与调子", background: "布景与背景结构", foreground: "同一个前景物挡住画面同一块", lens: "焦段与光圈，不变焦", continuity: "和上一镜接得上：主体同侧、不越轴" };

let cache = { key: null, report: null };

export function renderEval(el, d) {
  const shot = d.shots.find((s) => s.id === d.project.currentShotId);
  if (!shot) { el.innerHTML = `<div class="empty">选一个镜头。</div>`; return; }
  const locked = shot.locks?.aspects?.length ? shot.locks : null;
  const key = [shot.id, shot.version, d.project.version, d.events[0]?.id].join("|");
  if (cache.key !== key) { cache = { key, report: locked ? dispatchLocal("review.contract", { shotId: shot.id }) : null }; }
  const rep = cache.report?.reports?.[0] || null;
  const gens = d.jobs.filter((j) => j.shotId === shot.id && j.status === "done" && j.result?.url && !["verify", "replicate", "reference-fetch", "reference-read"].includes(j.kind));
  const verdicts = d.jobs.filter((j) => j.shotId === shot.id && j.kind === "verify" && j.status === "done" && j.result);
  const verdictFor = (job) => verdicts.filter((v) => v.result?.jobId === job.id || v.result?.after === job.result?.url).at(-1)?.result || (shot.lastVerdict?.jobId === job.id ? shot.lastVerdict : null);

  const lockRows = !locked ? "" : rep.items.map((it) => `<tr class="${esc(it.status)}">
      <td class="ev-mark">${MARK[it.status]}</td>
      <td><b>${esc(it.zh)}</b><i>${esc(ASPECT_NOTE[it.aspect] || "")}</i></td>
      <td>${esc(it.how)}</td>
      <td>${esc(it.measured || it.why || "")}${it.worstFrame !== undefined && it.status === "violate" ? ` <code>f${it.worstFrame}</code>` : ""}</td>
      <td>${it.status === "violate" && it.worstFrame !== undefined ? `<button data-seek="${it.worstFrame + (shot.range.inFrame || 0)}">看那一帧</button>` : ""}${it.how === "判定模型" ? `<button data-act="verify" ${gens.length ? "" : "disabled"} title="${gens.length ? "" : "还没有生成结果可比"}">让判定模型看</button>` : ""}</td>
    </tr>`).join("");

  el.innerHTML = `<div class="ev">
    <div class="ev-head">
      <b>${esc(shot.index)} ${esc(shot.title)}</b>
      ${locked ? `<span class="ev-sum ${rep.violate ? "bad" : rep.unverifiable ? "warn" : "ok"}">${esc(rep.summary)}</span><span class="ev-dim">锁于 ${esc((locked.lockedAt || "").replace("T", " ").slice(5, 16))} · 之后改了 ${rep.editsSinceLock} 步</span>` : `<span class="ev-dim">这一镜还没锁任何东西。满意了就锁：之后每一次改动都会拿它核对。</span>`}
      <div class="actions">
        <button data-act="lock" data-tip="锁住满意的部分" data-tip-sub="选哪些方面不许再变；重生成时也会写进提示词">＋ 锁</button>
        ${locked ? `<button data-act="recheck">重新核对</button>` : ""}
        ${rep?.rollback ? `<button data-act="rollback" class="danger" data-tip="${esc(rep.rollback.label)}" data-tip-sub="撤销锁定之后的改动，回到锁定时的样子">回退</button>` : ""}
      </div>
    </div>
    ${locked ? `<div class="ev-lockrow">${locked.aspects.map((a) => `<span class="ev-chip" data-unlock="${esc(a)}" title="点一下解锁">${esc(LOCK_ASPECTS[a]?.zh || a)} ×</span>`).join("")}</div>
    <table class="ev-table"><thead><tr><th></th><th>锁住的</th><th>怎么验</th><th>现在</th><th></th></tr></thead><tbody>${lockRows}</tbody></table>` : `<div class="ev-pick">${Object.entries(LOCK_ASPECTS).map(([k, v]) => `<label><input type="checkbox" data-aspect="${esc(k)}" /> ${esc(v.zh)}<i>${esc(ASPECT_NOTE[k] || "")}</i></label>`).join("")}</div>`}
    <h4>各次生成保住了多少 <span class="ev-dim">同一份要求，不同控制方式 —— 判定模型看画面的结论；没验过的就是没验过</span></h4>
    ${gens.length ? `<table class="ev-table"><thead><tr><th>#</th><th>控制方式</th><th>模型</th><th>要改的</th><th>锁住的</th><th>最差一条</th><th></th></tr></thead><tbody>${[...gens].reverse().map((j, i) => {
      const v = verdictFor(j), drift = v?.drift || v?.locks || null;
      const kept = Array.isArray(drift) ? drift.filter((x) => x.ok === true || x.status === "pass" || x.drift === false).length : null, total = Array.isArray(drift) ? drift.length : locked?.aspects?.length || 0;
      return `<tr><td>${gens.length - i}</td><td>${esc(GEN_MODES[j.mode]?.zh || j.mode || "")}</td><td>${esc(j.model || j.provider || "")}</td><td>${v ? (v.applied === true ? "✓ 改了" : v.applied === false ? "✗ 没改" : esc(String(v.applied ?? "—"))) : "—"}</td><td>${v && total ? `${kept ?? "?"} / ${total}` : "—"}</td><td>${esc(v?.worst || v?.summary || "")}</td><td>${v ? "" : `<button data-verify="${esc(j.id)}" ${locked ? "" : "disabled"} title="${locked ? "" : "先锁住要保的部分"}">验收这一版</button>`}</td></tr>`;
    }).join("")}</tbody></table>` : `<div class="ev-dim">这一镜还没有生成结果。生成之后，每一版在这里各占一行。</div>`}
  </div>`;

  el.querySelector('[data-act="lock"]')?.addEventListener("click", async () => {
    const picked = [...el.querySelectorAll("[data-aspect]:checked")].map((x) => x.dataset.aspect);
    const aspects = picked.length ? picked : ["framing", "lens", "foreground", "identity"];
    await dispatch("shot.lock", { shotId: shot.id, aspects });
  });
  el.querySelector('[data-act="recheck"]')?.addEventListener("click", () => { cache.key = null; renderEval(el, d); });
  el.querySelector('[data-act="rollback"]')?.addEventListener("click", () => dispatch(rep.rollback.action, rep.rollback.payload));
  el.querySelector('[data-act="verify"]')?.addEventListener("click", () => dispatch("review.verify", { shotId: shot.id }));
  el.querySelectorAll("[data-verify]").forEach((b) => (b.onclick = () => dispatch("review.verify", { shotId: shot.id, jobId: b.dataset.verify })));
  el.querySelectorAll("[data-unlock]").forEach((b) => (b.onclick = () => dispatch("shot.unlock", { shotId: shot.id, aspects: [b.dataset.unlock] })));
  el.querySelectorAll("[data-seek]").forEach((b) => (b.onclick = () => dispatch("timeline.seek", { frame: Number(b.dataset.seek) })));
}

// 核对是纯本地几何：直接在页面这份副本上算，不走后端一个来回
import { dispatch as local } from "../../core/actions.js";
function dispatchLocal(name, payload) { return local(name, payload, { source: "system", silent: true }); }
