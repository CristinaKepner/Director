import { escapeHTML as esc } from "./creation-markup.js";
export function renderOverview(state, d) {
  const key = JSON.stringify([d.project.creation, d.assets, d.shots]);
  if (key === state.overviewKey) return;
  state.overviewKey = key;
  state.root.querySelector(".creation-overview").innerHTML = overviewMarkup(d);
}
function overviewMarkup(d) {
  const brief = d.project.creation?.brief || "把想法变成可以拍摄的镜头";
  return `<section class="creation-brief"><span class="creation-eyebrow">01 / 创作方向</span><h1>${esc(brief)}</h1><p>从目标出发，整理参照，再和 Agent 一起推进镜头。</p><button data-create="${d.project.creation ? "plan" : "guide"}">${d.project.creation ? "让 Agent 继续规划 ↗" : "选择起步方式 →"}</button></section><div class="creation-sections">${mediaSection(d.assets)}${shotsSection(d.shots)}</div>`;
}
function mediaSection(assets) {
  const cards = assets.map(mediaCard).join("");
  return `<section class="creation-library"><header><div><span class="creation-eyebrow">02 / 素材与参照</span><h3>让创意有据可依 <small>${assets.length}</small></h3></div><button data-create="library">打开素材库 ↗</button></header><div class="creation-media-grid">${cards || emptyMedia}</div></section>`;
}
function mediaCard(asset) {
  return `<button class="creation-media-card" data-attach="${esc(asset.id)}"><span>${esc(asset.mediaKind || "素材")}</span><b>${esc(asset.label || "未命名素材")}</b><small>加入节点编排 ＋</small></button>`;
}
function shotsSection(shots) {
  return `<section class="creation-shotlist"><header><div><span class="creation-eyebrow">03 / 镜头计划</span><h3>故事在这里展开 <small>${shots.length}</small></h3></div><button data-create="shot">＋ 添加镜头</button></header><div class="creation-shot-grid">${shots.map(shotCard).join("") || emptyShots}</div></section>`;
}
function shotCard(shot, index) {
  return `<button class="creation-shot-card" data-shot="${esc(shot.id)}"><span>SHOT ${String(index + 1).padStart(2, "0")}</span><b>${esc(shot.title || "未命名镜头")}</b><small>进入镜头预演 ↗</small></button>`;
}
const emptyMedia = `<div class="creation-empty"><span>▧</span><b>先放进一份灵感</b><p>导入图片、视频或音频，让参照和创作始终在一起。</p><button data-create="import">导入素材</button></div>`;
const emptyShots = `<div class="creation-empty"><span>▤</span><b>还没有镜头</b><p>请右侧 Agent 拆解创意，或先手动添加第一镜。</p><button data-create="plan">和 Agent 规划镜头 →</button></div>`;
