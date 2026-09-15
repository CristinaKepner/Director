// 规划器的截断抢救。
//
// 起因是真事：让 gpt-6-astra 一次规划一条 10 分钟的片子，它照做了 —— 输出 18,482 字符 ——
// 撞上 token 上限停在数组中间，JSON.parse 抛错，整份丢掉，回落到规则规划器答「没听懂」。
// 80 个已经规划好的镜头因为尾巴不完整全部作废。少几个镜头比什么都没有强得多。
import { test } from "node:test";
import assert from "node:assert/strict";
import { createLlmPlanner } from "../src/adapters/llm.mjs";

const CTX = { capabilities: [{ name: "shot.create", doc: "建镜头", params: {} }], summary: {}, history: [], model: "stub" };

// 造一个完整计划，再从中间截断 —— 和真实截断的形状一致
function planJson(n) {
  return JSON.stringify({
    reply: "建好了",
    notes: ["占位"],
    steps: Array.from({ length: n }, (_, i) => ({
      action: "shot.create",
      label: `第 ${i + 1} 镜`,
      payload: { title: `镜头 ${i + 1}`, duration: 6 },
    })),
    suggest: ["录白模"],
  });
}

function stubGateway(body) {
  const real = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    JSON.stringify({ choices: [{ message: { content: body } }], usage: { total_tokens: 1 } }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
  return () => { globalThis.fetch = real; };
}

test("完整的计划照常解析", async () => {
  const restore = stubGateway(planJson(40));
  try {
    const p = await createLlmPlanner({ apiKey: "k" }).plan("建一条片子", CTX);
    assert.equal(p.steps.length, 40);
    assert.equal(p.reply, "建好了");
  } finally { restore(); }
});

test("被截断的计划要抢救出已经读到的镜头，而不是整份丢掉", async () => {
  const full = planJson(80);
  const cut = full.slice(0, Math.floor(full.length * 0.72)); // 停在某个 step 的中间
  assert.throws(() => JSON.parse(cut), "前提：这段确实是坏 JSON");

  const restore = stubGateway(cut);
  try {
    const p = await createLlmPlanner({ apiKey: "k" }).plan("建一条 10 分钟的片子", CTX);
    assert.ok(p.steps.length > 30, `该抢救出大部分镜头，实际 ${p.steps.length}`);
    assert.ok(p.steps.length < 80, "被截断了，不可能是全部");
    assert.equal(p.truncated, true, "要标明这份计划不完整");
    assert.ok(p.notes.some((n) => n.includes("截断")), "notes 里要说清楚，否则导演以为建全了");
    // 抢救出来的每一步都得是完整可执行的，不能有半个 payload
    for (const s of p.steps) {
      assert.equal(s.action, "shot.create");
      assert.equal(typeof s.payload.title, "string");
      assert.equal(s.payload.duration, 6);
    }
  } finally { restore(); }
});

test("彻底不是 JSON 的回复仍然报错，不假装抢救到了东西", async () => {
  const restore = stubGateway("我觉得这条片子应该这样拍……");
  try {
    await assert.rejects(() => createLlmPlanner({ apiKey: "k" }).plan("建一条片子", CTX));
  } finally { restore(); }
});
