const reads = new Set([
  "skills.list",
  "skills.files",
  "skills.read",
  "skills.invoke",
  "workflow.read",
  "creation.context",
  "context.assets",
  "context.scene",
  "context.shot",
  "context.entity",
  "context.sequence",
]);
export async function planWithReads(planner, text, context, access) {
  for (let round = 0; round < 3; round++) {
    const plan = await planner.plan(text, context);
    if (!access.isCurrent()) throw new Error("PROJECT_CHANGED");
    if (!readOnly(plan)) return plan;
    if (round === 2) return exhausted(plan);
    context = await readContext(plan, context, access);
  }
}
function readOnly(plan) {
  return (
    plan.steps?.length &&
    !plan.ask?.length &&
    plan.steps.every((s) => reads.has(s.action))
  );
}
async function readContext(plan, context, access) {
  const results = [];
  for (const step of plan.steps) {
    if (!access.isCurrent()) throw new Error("PROJECT_CHANGED");
    results.push(await readStep(step, access));
  }
  const toolResults = [...(context.summary.toolResults || []), ...results];
  return { ...context, summary: { ...context.summary, toolResults } };
}
function exhausted(plan) {
  const reply = "已经补齐读取，但规划器仍未形成可执行方案，本轮未修改工程。";
  return {
    ...plan,
    steps: [],
    reply,
    needsConfirm: false,
    notes: [...(plan.notes || []), "已达到本轮读取上限，未无限重复调用模型。"],
  };
}

async function readStep(step, access) {
  return { ...step, result: await access.read(step) };
}
