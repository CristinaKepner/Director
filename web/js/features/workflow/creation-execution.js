import { escapeHTML as esc } from "../creation/creation-markup.js";
export async function executeNodes(state) {
  const count = Number(
    state.root.querySelector("[data-generation-limit]").value,
  );
  if (!Number.isInteger(count) || count < 1 || count > 20)
    return state.status("生成上限须为 1–20 次");
  if (!confirmExecution(count)) return;
  await state.run("workflow.execute", { confirm: true, maxGenerations: count });
}
export function renderExecution(state, data) {
  const run = data.project.workflowRun,
    root = state.root.querySelector(".creation-execution");
  if (!run) return showEmptyExecution(root);
  const stale = run.signature !== JSON.stringify(data.project.workflow);
  root.innerHTML = `<strong>${esc(labels[run.status] || run.status)} · 预算占用 ${run.used || 0}/${run.maxGenerations} 次${stale ? " · 图已修改，结果为旧版本" : ""}</strong><p>${esc(run.reason || "")}</p>${(run.records || []).map(recordMarkup).join("")}${candidateMarkup(run)}`;
}
function recordMarkup(record) {
  return `<span class="creation-run-node">${esc(record.label || record.id)} · ${esc(labels[record.status] || record.status)}${record.reason ? "：" + esc(record.reason) : ""}</span>`;
}
const labels = {
  running: "正在执行",
  completed: "执行完成",
  failed: "执行失败",
  "needs-review": "需要确认",
  cancelled: "已停止",
  done: "完成",
  skipped: "分支跳过",
};

function confirmExecution(count) {
  return confirm(
    `执行当前节点图？最多提交 ${count} 次生成，语义判断也会调用模型计费。遇到不确定判断或失败即停止；候选不会自动替换成片。`,
  );
}
function showEmptyExecution(root) {
  root.textContent =
    "先让 Agent 编排，再确认运行。条件不确定时会停下来交给你。";
}

function candidateMarkup(run) {
  if (run.status === "running") return "";
  return (run.candidates || [])
    .map(
      (media, index) =>
        `<button data-use-output="${index}">候选 ${index + 1} · 加入素材与节点</button>`,
    )
    .join("");
}
export async function useOutput(state, index, run) {
  const media = run?.candidates?.[index];
  if (!media || run.status === "running") return;
  await state.run("creation.media", {
    url: media.url,
    mediaKind: media.kind,
    label: `节点候选 ${index + 1}`,
  });
}
