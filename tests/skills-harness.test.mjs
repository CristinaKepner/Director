import test from "node:test";
import assert from "node:assert/strict";
import { createHost } from "../server/src/host.mjs";
function hostFor(t, extra = {}) {
  const host = createHost({ demo: "none", ffmpeg: "none", ...extra });
  host.run("project.new", { name: "skill fixture" });
  t.after(() => host.close());
  return host;
}
test("host exposes existing Flova skills through shared actions", (t) => {
  const host = hostFor(t);
  const result = host.run("skills.list", { query: "flova-005" });
  assert.equal(result.ok, true);
  assert.equal(
    result.items[0].id,
    "flova-005-ai-short-drama-one-stop-generation",
  );
});
test("skill invocation returns guidance without generating or changing the graph", (t) => {
  const host = hostFor(t);
  const before = host.run("workflow.read").graph;
  const result = host.run("skills.invoke", { id: "lemo-opuscar" });
  assert.equal(result.ok, true);
  assert.equal(result.mode, "planning-context");
  assert.match(result.documents[0].content, /Lemo-Opuscar/);
  assert.deepEqual(host.run("workflow.read").graph, before);
});
const flovaId = "flova-005-ai-short-drama-one-stop-generation";
const compose = {
  steps: [
    {
      action: "workflow.compose",
      payload: { nodes: [{ id: "idea", type: "text" }], edges: [] },
    },
  ],
  notes: [],
};
const readSkill = {
  notes: [],
  steps: [{ action: "skills.invoke", payload: { id: flovaId, goal: "短剧" } }],
};
const identity = { name: "fixture", model: "fixture", models: ["fixture"] };
function guidedPlanner() {
  const contexts = [];
  const plan = async (_, context) => {
    contexts.push(context);
    return contexts.length === 1 ? readSkill : compose;
  };
  return { ...identity, contexts, plan };
}
const agentRequest = {
  action: "agent.run",
  payload: { text: "使用短剧 skill 编排", mode: "lead" },
};
function assertSkillContext(planner) {
  assert.equal(planner.contexts.length, 2);
  assert.equal(
    planner.contexts[1].summary.toolResults[0].result.skill.id,
    flovaId,
  );
}
test("Agent reads a skill through Harness then proposes actual workflow actions", async (t) => {
  const planner = guidedPlanner();
  const host = hostFor(t, { llm: () => planner });
  const out = await host.invokeAsync(agentRequest);
  assert.equal(out.ok, true);
  assertSkillContext(planner);
  assert.equal(host.run("workflow.read").graph.nodes[0].type, "text");
});
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createSkillHarness } from "../server/src/features/skills/harness.mjs";
import { createLlmPlanner } from "../server/src/features/agent/llm.mjs";
import { planWithReads } from "../server/src/features/agent/planner-reads.mjs";
import { execFileSync } from "node:child_process";
const library = createSkillHarness();
test("list paginates all 135 skills and four reference libraries without loading bodies", () => {
  const first = library.list({ limit: 30 });
  const last = library.list({ offset: 120 });
  assert.equal(first.total, 139);
  assert.equal(first.nextOffset, 30);
  assert.equal(last.items.length, 19);
  assert.equal(last.nextOffset, null);
  assert.equal(first.items[0].content, undefined);
});
function referencePage(offset, limit) {
  return library.read({ id: flovaId, path: "reference.md", offset, limit });
}
test("long Flova references are readable page by page with explicit continuation", () => {
  const first = referencePage(0, 100);
  const next = referencePage(first.nextOffset, 100);
  const combined = referencePage(0, 200);
  assert.equal(first.ok, true);
  assert.equal(first.nextOffset, 100);
  assert.equal(first.content + next.content, combined.content);
  assert.equal(next.sha256, first.sha256);
});
test("reference libraries expose actual file paths and source content", () => {
  const id = "reference-PDoomVideo";
  const found = library.files({ id, query: "STORYBOARD" });
  assert.equal(found.items[0].path, "source/STORYBOARD.md");
  const read = library.read({ id, path: found.items[0].path });
  assert.equal(read.ok, true);
  assert.ok(read.content.length > 100);
});
const invalidRequests = [
  ["read", { id: flovaId, path: "../../package.json" }, "SKILL_FILE_NOT_FOUND"],
  ["read", { id: flovaId, path: "/etc/passwd" }, "SKILL_FILE_NOT_FOUND"],
  ["invoke", { id: "not-installed" }, "SKILL_NOT_FOUND"],
  ["list", { offset: -1 }, "SKILL_RANGE_INVALID"],
  ["list", { limit: 1000 }, "SKILL_RANGE_INVALID"],
  ["list", { query: {} }, "SKILL_QUERY_INVALID"],
  ["read", { id: flovaId, limit: 0 }, "SKILL_RANGE_INVALID"],
  ["invoke", { id: flovaId, goal: "x".repeat(4001) }, "SKILL_GOAL_INVALID"],
];
for (const [method, input, error] of invalidRequests) {
  test(`reject invalid ${method}: ${JSON.stringify(input).slice(0, 65)}`, () => {
    assert.deepEqual(library[method](input), { ok: false, error });
  });
}
function temporary(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "director-skill-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
const catalogFile = new URL("../skills-library/catalog.json", import.meta.url);
const lemoFile = new URL(
  "../skills-library/installed/lemo-opuscar/SKILL.md",
  import.meta.url,
);
function fixtureEntry() {
  const original = JSON.parse(fs.readFileSync(catalogFile));
  const entry = original.entries.find((item) => item.id === "lemo-opuscar");
  return { ...entry, directory: "skill" };
}
function fixtureLibrary(t) {
  const root = temporary(t);
  fs.mkdirSync(path.join(root, "skill"));
  fs.copyFileSync(lemoFile, path.join(root, "skill/SKILL.md"));
  const catalog = { version: 1, entries: [fixtureEntry()] };
  fs.writeFileSync(path.join(root, "catalog.json"), JSON.stringify(catalog));
  return { root, service: createSkillHarness({ root }) };
}
test("changed skill content fails integrity checking instead of silently invoking", (t) => {
  const { root, service } = fixtureLibrary(t);
  fs.appendFileSync(path.join(root, "skill/SKILL.md"), "changed");
  assert.equal(
    service.invoke({ id: "lemo-opuscar" }).error,
    "SKILL_CONTENT_CHANGED",
  );
});
test("symlinks cannot read files outside the registered library", (t) => {
  const { root, service } = fixtureLibrary(t);
  const file = path.join(root, "skill/SKILL.md");
  fs.unlinkSync(file);
  fs.symlinkSync("/etc/hosts", file);
  assert.equal(
    service.read({ id: "lemo-opuscar" }).error,
    "SKILL_PATH_INVALID",
  );
});
test("missing library gives a concrete unavailable result", (t) => {
  const service = createSkillHarness({ root: temporary(t) });
  assert.equal(service.list().error, "SKILL_LIBRARY_UNAVAILABLE");
});
const capabilityNames = [
  "workflow.compose",
  "workflow.execute",
  "exec",
  "generation.submit",
];
const capabilities = () => capabilityNames.map((name) => ({ name }));
const expectedActions = ["workflow.compose", "workflow.execute"];
test("invoke maps only registered actions and never grants generation execution", () => {
  const service = createSkillHarness({ capabilities });
  const result = service.invoke({ id: flovaId });
  assert.deepEqual(
    result.availableActions.map((a) => a.name),
    expectedActions,
  );
  assert.match(result.rules.join("\n"), /显式确认和生成预算/);
  assert.equal(result.documents.length, 2);
});
const steps = [
  { action: "skills.invoke", payload: { id: flovaId } },
  {
    action: "workflow.execute",
    payload: { confirm: true, maxGenerations: 20 },
  },
];
function gatewayReply(t) {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      choices: [{ message: { content: JSON.stringify({ steps }) } }],
    }),
  );
  return steps.map(({ action }) => ({ name: action, params: {} }));
}
test("LLM allowlist accepts skill calls while retaining execution gating", async (t) => {
  const capabilities = gatewayReply(t);
  const planner = createLlmPlanner({ apiKey: "fixture" });
  const context = { capabilities, summary: {}, history: [] };
  const result = await planner.plan("使用短剧技能", context);
  assert.deepEqual(
    result.steps.map((step) => step.action),
    ["skills.invoke"],
  );
});
const forbidRead = () => assert.fail("must not execute read");
const staleAccess = { read: forbidRead, isCurrent: () => false };
test("project switch prevents a skill result from continuing into the new project", async () => {
  const result = planWithReads(
    guidedPlanner(),
    "短剧",
    { summary: {} },
    staleAccess,
  );
  await assert.rejects(result, /PROJECT_CHANGED/);
});
const mixed = { steps: [...readSkill.steps, ...compose.steps] };
const currentAccess = { read: forbidRead, isCurrent: () => true };
test("mixed skill/write plans still require the ordinary plan handling", async () => {
  const planner = { plan: async () => mixed };
  const result = await planWithReads(
    planner,
    "短剧",
    { summary: {} },
    currentAccess,
  );
  assert.equal(result, mixed);
});
const cliPath = new URL("../server/bin/director.mjs", import.meta.url).pathname;
const skillCommand = [
  cliPath,
  "skills.invoke",
  "--id",
  "lemo-opuscar",
  "--json",
];
function offlineSkill(project) {
  const args = [...skillCommand, "--project", project];
  return JSON.parse(execFileSync(process.execPath, args));
}
test("offline CLI can retrieve skills without creating or saving a project", (t) => {
  const project = path.join(temporary(t), "untouched.director.json");
  assert.equal(offlineSkill(project).mode, "planning-context");
  assert.equal(fs.existsSync(project), false);
});
