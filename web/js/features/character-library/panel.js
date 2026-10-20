import { dispatch } from "../../client.js";
import { store } from "../../../../core/store.js";
import { padOf } from "../../../../core/actions.js";

export function createCharacterPanel({
  esc,
  dragAttr,
  emptyState,
  report,
  mediaHref,
  locate,
  showPreview,
}) {
  const $ = (id) => document.getElementById(id);
  const LIB_GROUPS = [
    ["角色", ["character"]],
    ["物品", ["prop", "vehicle", "weapon"]],
  ];
  return renderLibrary;
  function renderLibrary(d, active) {
    const el = $("library");
    const assets = d.assets || [];
    const pending = assets.filter((a) => !a.approved).length;
    const badge = $("libBadge");
    if (badge) {
      badge.textContent = pending || "";
      badge.classList.toggle("on", pending > 0);
    }
    if (!el || !active) return;

    const activePad =
      d.project.activePadId &&
      d.scene.pads?.some((p) => p.id === d.project.activePadId)
        ? d.project.activePadId
        : null;
    const inScope = (e) =>
      !activePad || !padOf(d, e) || padOf(d, e) === activePad;
    const padTag = (e) => {
      const q = padOf(d, e);
      const p = q && d.scene.pads.find((x) => x.id === q);
      return p && !activePad
        ? `<span class="pad-tag" data-tip="${esc(p.index + " " + p.name)}" data-tip-sub="在这块台上">${p.index}</span>`
        : "";
    };
    const groups = LIB_GROUPS.map(([name, types]) => [
      name,
      d.entities.filter((e) => types.includes(e.semanticType) && inScope(e)),
    ]).filter(([, list]) => list.length);
    const done = d.entities.filter((e) =>
      assets.some((a) => a.entityId === e.id && a.approved),
    ).length;
    const total = groups.reduce((n, [, list]) => n + list.length, 0);
    $("libCount").textContent = total ? `${done}/${total}` : "";
    if (!total) {
      el.innerHTML = emptyState("场里还没有人物或物品。");
      return;
    }

    el.innerHTML = groups
      .map(
        ([name, list]) =>
          `<div class="lib-group"><h3><span>${name}</span><span>${list.length}</span></h3>${list
            .map((e) => {
              const mine = assets.filter((a) => a.entityId === e.id);
              const ok = mine.some((a) => a.approved);
              const job = d.jobs.find(
                (j) =>
                  j.kind === "reference" &&
                  j.entityId === e.id &&
                  ["queued", "running"].includes(j.status),
              );
              const shots = d.shots.filter((sh) =>
                (sh.targetIds || []).includes(e.id),
              );
              return `<div class="lib-card${d.project.selectedId === e.id ? " sel" : ""}">
      <div class="lib-head" data-locate="${esc(e.id)}" data-tip="${esc(e.displayName)}" data-tip-sub="点一下在场里找到它">
        <span class="sw" style="background:${esc(e.proxy?.color || "#8a7a5a")}"></span><b>${esc(e.displayName)}</b>${padTag(e)}
        <span class="st${ok ? " ok" : ""}">${ok ? `<svg class="gi"><use href="#i-check"/></svg>定了` : mine.length ? "待批" : "没定妆"}</span>
      </div>
      <div class="lib-thumbs">
        ${mine
          .map(
            (
              a,
            ) => `<div class="lib-thumb${a.approved ? " ok" : ""}" ${dragAttr({ kind: "asset", id: a.id, entityId: e.id, url: a.url })} data-tip="拖到时间线的镜头段上" data-tip-sub="那一镜生成时就会带上这张">${a.mediaKind === "video" ? `<video data-preview="${esc(a.url)}" data-kind="video" src="${esc(mediaHref(a.url))}" muted loop playsinline></video>` : `<img data-preview="${esc(a.url)}" data-kind="image" src="${esc(mediaHref(a.url))}" alt="" />`}
          <button class="tk" data-approve="${a.id}" data-on="${a.approved ? 1 : 0}" data-tip="${a.approved ? "已批准" : "批准这张"}" data-tip-sub="${a.approved ? "它出现的每一镜都会自动带上这张。再点一下取消" : `批准后，${esc(e.displayName)}出现的每一镜生成时都会带上它 · ${esc(a.model || a.kind || "")}`}"><svg class="gi"><use href="#i-check"/></svg></button>
          <button class="rm" data-del="${a.id}" data-tip="删掉这张">×</button></div>`,
          )
          .join("")}
        <button class="lib-add${job ? " busy" : ""}" data-more="${esc(e.id)}" ${job ? "disabled" : ""} data-tip="${job ? "正在出" : mine.length ? "再来一张" : "定妆"}" data-tip-sub="${job ? "定妆照生成中" : "出一张定妆照。这一步计费"}">${job ? `${job.progress || 0}%` : `<svg class="gi"><use href="#i-plus"/></svg>`}</button>
      </div>
      ${
        shots.length
          ? `<div class="lib-shots">${shots
              .slice(0, 12)
              .map(
                (sh) =>
                  `<button data-goshot="${esc(sh.id)}" data-tip="${esc(sh.index + " " + sh.title)}" data-tip-sub="这一镜拍到了${esc(e.displayName)}">${esc(sh.index)}</button>`,
              )
              .join(
                "",
              )}${shots.length > 12 ? `<button disabled>+${shots.length - 12}</button>` : ""}</div>`
          : ""
      }
    </div>`;
            })
            .join("")}</div>`,
      )
      .join("");

    el.querySelectorAll("[data-approve]").forEach(
      (b) =>
        (b.onclick = (ev) => {
          ev.stopPropagation();
          report(
            dispatch("asset.approve", {
              id: b.dataset.approve,
              approved: b.dataset.on !== "1",
            }),
          );
        }),
    );
    el.querySelectorAll("[data-del]").forEach(
      (b) =>
        (b.onclick = (ev) => {
          ev.stopPropagation();
          confirm("删掉这张定妆照？") &&
            dispatch("asset.delete", { id: b.dataset.del });
        }),
    );
    el.querySelectorAll("[data-more]").forEach(
      (b) =>
        (b.onclick = () => {
          const e = store.get().entities.find((x) => x.id === b.dataset.more);
          report(
            dispatch("generation.reference", {
              entityId: b.dataset.more,
              view: e?.semanticType === "character" ? "front" : "three-quarter",
            }),
          );
        }),
    );
    el.querySelectorAll("[data-locate]").forEach(
      (n) => (n.onclick = () => locate(n.dataset.locate)),
    );
    el.querySelectorAll("[data-goshot]").forEach(
      (b) =>
        (b.onclick = () =>
          report(dispatch("shot.select", { id: b.dataset.goshot }))),
    );
    el.querySelectorAll("[data-preview]").forEach(
      (n) =>
        (n.onclick = () =>
          showPreview(n.dataset.preview, n.dataset.kind, "定妆照")),
    );
  }
}
