import test from "node:test";
import assert from "node:assert/strict";
import { createHost } from "../server/src/host.mjs";
let finish, context;
const plan = {
  model: "stub",
  reply: "旧方案",
  steps: [],
  notes: [],
  suggest: [],
};
const planner = {
  name: "stub",
  model: "stub",
  models: ["stub"],
  plan: async (_text, ctx) => {
    context = ctx;
    return new Promise((resolve) => {
      finish = resolve;
    });
  },
};
test("new project rejects a late plan and creation requests omit old history", async () => {
  const host = createHost(hostOptions);
  try {
    await checkPlanIsolation(host);
  } finally {
    host.close();
  }
});
async function checkPlanIsolation(host) {
  host.run("creation.start", { mode: "idea", brief: "当前目标" });
  host.R.say("user", "之前的对话");
  const pending = host.invokeAsync(request);
  assert.deepEqual(context.history, []);
  assert.equal(context.summary.creation.goal.brief, "当前目标");
  host.run("project.new", { name: "Next" });
  finish(plan);
  assert.equal((await pending).error, "PROJECT_CHANGED");
}

const hostOptions = {
  demo: "none",
  llm: () => planner,
  mediaDir: "/tmp/director-creation-agent",
};
const request = {
  action: "agent.run",
  payload: { text: "规划", contextMode: "canvas" },
};
