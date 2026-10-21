import { escapeHTML as esc } from "../creation/creation-markup.js";
import { referenceSource } from "./reference-transfer.js";
export function referenceCard(asset) {
  const status = asset.approved ? "已批准参考" : "待批准参考";
  return `<article class="creation-media-card reference-card">${preview(asset)}<b>${esc(asset.label || "未命名素材")}</b><small>${esc(facts(asset))}</small><small>${status}</small><div><button data-attach="${esc(asset.id)}">加入节点 ＋</button>${useButton(asset)}</div></article>`;
}
function preview(asset) {
  const src = esc(referenceSource(asset.url));
  if (asset.mediaKind === "image")
    return `<img loading="lazy" src="${src}" alt="${esc(asset.label || "参考图片")}">`;
  if (asset.mediaKind === "video")
    return `<video controls preload="none" poster="${esc(referenceSource(asset.posterUrl))}" src="${src}"></video>`;
  return `<span class="reference-kind">${esc(asset.mediaKind || "素材")}</span>`;
}
function useButton(asset) {
  if (!["image", "video"].includes(asset.mediaKind)) return "";
  return `<button data-reference-use="${esc(asset.id)}">用于复刻 ↗</button>`;
}
function facts(asset) {
  const size = asset.width
    ? `${asset.width} × ${asset.height}`
    : asset.mediaKind || "素材";
  const duration = asset.seconds ? ` · ${asset.seconds.toFixed(1)} 秒` : "";
  const bytes = asset.bytes
    ? ` · ${(asset.bytes / 1048576).toFixed(1)} MB`
    : "";
  return size + duration + bytes;
}
