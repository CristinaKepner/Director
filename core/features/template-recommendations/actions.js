import {
  templateList,
  templateById,
  templateFor,
  templateTitle,
  SEEDANCE_SOURCE,
} from "./seedance.js";

export function registerTemplateActions({ register, store }) {
  const D = () => store.get();
  register("prompt.template", {
    doc: "指定这一镜（或整条工程）用哪个 Seedance 提示词模板；clear=true 改回自动挑。不带参数就只回报当前用的是哪个",
    params: {
      id: "templateId（见 context.templates）",
      shotId: "string（省略则作用于整条工程）",
      clear: "boolean",
    },
    undoable: true,
    validate: ({ id, clear }) =>
      id && !clear && !templateById(id)
        ? {
            error: "NOT_FOUND",
            hint: "没有这个模板 id，先 context.templates 看清单",
          }
        : null,
    handler({ id, shotId, clear }) {
      const d0 = D();
      const sid =
        shotId === undefined ? undefined : shotId || d0.project.currentShotId;
      if (sid !== undefined && !d0.shots.some((x) => x.id === sid))
        return { ok: false, error: "NO_SHOT" };
      if (id || clear) {
        store.patch((d) => {
          if (sid === undefined) {
            if (clear) delete d.project.promptTemplate;
            else d.project.promptTemplate = id;
          } else {
            const s2 = d.shots.find((x) => x.id === sid);
            if (clear) delete s2.promptTemplate;
            else s2.promptTemplate = id;
          }
        });
      }
      const d = D();
      const shot = d.shots.find(
        (x) => x.id === (sid === undefined ? d.project.currentShotId : sid),
      );
      const cur = shot ? templateFor(shot, d) : null;
      return {
        ok: true,
        scope: sid === undefined ? "project" : sid,
        id: id || null,
        cleared: !!clear,
        using: cur
          ? {
              id: cur.template.id,
              title: templateTitle(cur.template),
              why: cur.why,
              auto: cur.auto,
            }
          : null,
      };
    },
  });

  register("context.templates", {
    doc: "Seedance 提示词模板清单：25 个模板分 6 类，每个说清什么时候用它。来自 awesome-seedance（MIT）",
    params: { category: "string（只看某一类）" },
    undoable: false,
    handler({ category }) {
      const list = templateList("zh").filter(
        (t) => !category || t.category === category,
      );
      const d = D();
      const shot = d.shots.find((x) => x.id === d.project.currentShotId);
      const cur = shot ? templateFor(shot, d) : null;
      return {
        ok: true,
        data: {
          source: SEEDANCE_SOURCE,
          count: list.length,
          current: cur
            ? {
                id: cur.template.id,
                title: templateTitle(cur.template),
                why: cur.why,
                auto: cur.auto,
              }
            : null,
          templates: list,
        },
      };
    },
  });
}
