import { dispatch } from "../../client.js";
import {
  templateList,
  templateFor,
  CATEGORIES as SEEDANCE_CATEGORIES,
  TEMPLATES as SEEDANCE_TEMPLATES,
} from "../../../../core/features/template-recommendations/seedance.js";

export function createTemplatePanel({ esc, emptyState, report }) {
  const $ = (id) => document.getElementById(id);
  return renderTemplatePanel;
  function renderTemplatePanel(d, active) {
    const el = $("templates");
    if (!el || !active) return;
    const shot = d.shots.find((s) => s.id === d.project.currentShotId);
    const cur = shot ? templateFor(shot, d) : null;
    const fixed = shot?.promptTemplate || "";
    $("tplCount").textContent = `${SEEDANCE_TEMPLATES.length}`;
    if (!shot) {
      el.innerHTML = emptyState("还没有镜头。建一镜之后这里会自动挑一个结构。");
      return;
    }
    const list = templateList("zh");
    el.innerHTML =
      SEEDANCE_CATEGORIES.map((c) => {
        const items = list.filter((t) => t.category === c.id);
        if (!items.length) return "";
        return (
          `<div class="tpl-cat">${esc(c.title?.zh || c.id)}</div>` +
          items
            .map((t) => {
              const on = fixed ? t.id === fixed : cur?.template?.id === t.id;
              return `<div class="tpl-row${on ? " on" : ""}" data-tpl-pick="${esc(t.id)}" data-tip="${esc(t.title)}" data-tip-sub="${esc(t.useWhen.slice(0, 120))}">
        <b>${esc(t.title)}</b><span>${on ? (fixed ? "已钉住" : "自动选中") : ""}</span></div>`;
            })
            .join("")
        );
      }).join("") + (cur ? `<div class="rep-note">${esc(cur.why)}</div>` : "");
    el.querySelectorAll("[data-tpl-pick]").forEach(
      (b) =>
        (b.onclick = async () => {
          const id = b.dataset.tplPick;
          await dispatch(
            "prompt.template",
            id === fixed
              ? { shotId: shot.id, clear: true }
              : { id, shotId: shot.id },
          );
          report(await dispatch("generation.prompt", { shotId: shot.id }));
        }),
    );
  }
}
