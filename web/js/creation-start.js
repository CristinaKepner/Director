import { uploadCreationMedia } from "./creation-upload.js";
import { store } from "../../core/store.js";
export function chooseRoute(state, mode) {
  state.mode = mode;
  state.root.querySelector("[data-reference-fields]").hidden =
    mode !== "reference";
  state.root
    .querySelectorAll("[data-route]")
    .forEach((el) => el.classList.toggle("active", el.dataset.route === mode));
  state.root.querySelector("[name=skill]").value =
    mode === "reference" ? "remix" : "explore";
}
async function startInput(state, form) {
  const values = Object.fromEntries(new FormData(form));
  const file = state.root.querySelector("[data-reference-file]").files[0];
  const media =
    state.mode === "reference" && file ? await uploadCreationMedia(file) : null;
  return creationInput(values, state.mode, media);
}
function creationInput(values, mode, media) {
  return {
    ...values,
    mode,
    reference: media?.url || values.reference,
    mediaKind: media?.mediaKind,
  };
}
export async function submitStart(state, form) {
  if (state.busy) return;
  setBusy(state, form, true);
  try {
    await startProject(state, await startInput(state, form));
  } catch (error) {
    state.status(error.message);
  }
  setBusy(state, form, false);
}
async function startProject(state, input) {
  const result = await state.run("creation.start", input);
  if (!result.ok) return;
  if (input.mode === "reference") state.options.openLeft("ref");
  await state.run("agent.run", {
    text: planningPrompt(input),
    mode: "collaborative",
  });
}
export function planningPrompt(input = store.get().project.creation) {
  if (!input) return "请根据当前素材和镜头提出下一步创作方案。";
  const direction =
    input.mode === "reference" ? "参考当前素材" : "根据这个创意";
  const approach = approaches[input.skill];
  return `${direction}：${input.brief || "探索新的表达"}。请${approach}，规划素材、节点与镜头，先让我确认方案。`;
}

function setBusy(state, form, busy) {
  state.busy = busy;
  form.querySelector("[type=submit]").disabled = busy;
}

const approaches = {
  explore: "探索创意",
  remix: "拆解参照并创作新版本",
  test: "比较不同方案",
};
