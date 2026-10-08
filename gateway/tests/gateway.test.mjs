// 体验网关：密钥不出服务器，额度不在客户端。
//
// 这两件事都是「说起来对、写错一行就全塌」的类型，所以这里守的是最硬的四条：
//   · 上游收到的永远是真密钥，客户端发来的体验码到不了上游
//   · 客户端永远看不到真密钥，连报错里也不能带
//   · 额度用完就拒，而且拒的那句话人看得懂
//   · 并发压不穿上限（十个请求同时进来，不能十个都看到「还有余额」）
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { createStore } from "../src/store.mjs";
import { createGateway } from "../src/server.mjs";

const REAL_LLM_KEY = "sk-real-upstream-key-never-leaves-the-server";
const REAL_ARK_KEY = "ark-real-upstream-key";
const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "director-gw-")), "tokens.json");

// 假的上游：把收到的 authorization 记下来，按路径回不同的东西
function upstream() {
  const seen = [];
  const srv = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    seen.push({ path: req.url, auth: req.headers.authorization, body: Buffer.concat(chunks).toString("utf8") });
    if (req.url.startsWith("/chat/completions")) {
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      if (body.stream) {
        res.writeHead(200, { "content-type": "text/event-stream" });
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: "嗯" } }] })}\n\n`);
        res.write(`data: ${JSON.stringify({ choices: [], usage: { total_tokens: 777 } })}\n\n`);
        res.write("data: [DONE]\n\n");
        return res.end();
      }
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ choices: [{ message: { content: "{}" } }], usage: { total_tokens: 1234 } }));
    }
    if (req.url.startsWith("/contents/generations/tasks")) {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(req.method === "POST" ? { id: "task_1" } : { status: "succeeded" }));
    }
    res.writeHead(404).end("{}");
  });
  return new Promise((r) => srv.listen(0, "127.0.0.1", () => r({ srv, seen, base: `http://127.0.0.1:${srv.address().port}` })));
}

async function boot({ tokens = 100000, calls = 50, days = 7 } = {}) {
  const up = await upstream();
  const store = createStore(tmp());
  const { server } = createGateway({ store, llmKey: REAL_LLM_KEY, arkKey: REAL_ARK_KEY, llmBase: up.base, arkBase: up.base, log: () => {} });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const gw = `http://127.0.0.1:${server.address().port}`;
  const { code } = store.issue({ label: "测试", tokens, calls, days });
  const call = (p, opts = {}) => fetch(`${gw}${p}`, { ...opts, headers: { authorization: `Bearer ${opts.token ?? code}`, "content-type": "application/json", ...(opts.headers || {}) } });
  return { up, store, server, gw, code, call, stop: () => { server.close(); up.srv.close(); } };
}

const chat = (g, extra = {}) => g.call("/v1/chat/completions", { method: "POST", body: JSON.stringify({ model: "m", messages: [{ role: "user", content: "hi" }], ...extra }) });

test("上游拿到的是真密钥，客户端拿到的永远不是", async () => {
  const g = await boot();
  try {
    const r = await chat(g);
    assert.equal(r.status, 200);
    assert.equal(g.up.seen.at(-1).auth, `Bearer ${REAL_LLM_KEY}`, "上游必须收到真密钥");
    assert.ok(!g.up.seen.at(-1).auth.includes("dt_"), "体验码不该被透传到上游");

    // 客户端这一侧：响应头、响应体、以及各种报错里都不能出现真密钥
    const text = await r.text();
    const all = text + JSON.stringify([...r.headers]);
    assert.ok(!all.includes(REAL_LLM_KEY) && !all.includes(REAL_ARK_KEY), "响应里不能带上游密钥");

    const bad = await g.call("/v1/chat/completions", { method: "POST", token: "dt_nope", body: "{}" });
    assert.equal(bad.status, 401);
    assert.ok(!(await bad.text()).includes(REAL_LLM_KEY));
  } finally { g.stop(); }
});

test("token 按上游报的真实用量扣，流式也扣得到", async () => {
  const g = await boot();
  try {
    await chat(g);
    assert.equal(g.store.quota(g.code).tokens.used, 1234, "非流式：按 usage.total_tokens");
    await chat(g, { stream: true });
    assert.equal(g.store.quota(g.code).tokens.used, 1234 + 777, "流式：末帧的 usage 也要记上");
    assert.equal(g.store.quota(g.code).calls.used, 0, "对话不占出片次数");
  } finally { g.stop(); }
});

test("出片按次扣；查进度和取消不再扣一次", async () => {
  const g = await boot();
  try {
    await g.call("/ark/contents/generations/tasks", { method: "POST", body: "{}" });
    assert.equal(g.store.quota(g.code).calls.used, 1);
    await g.call("/ark/contents/generations/tasks/task_1");                     // 轮询
    await g.call("/ark/contents/generations/tasks/task_1", { method: "DELETE" }); // 取消
    assert.equal(g.store.quota(g.code).calls.used, 1, "轮询和取消不能再收费 —— 否则人不敢查进度");
  } finally { g.stop(); }
});

test("额度用完就拒，拒的那句话人看得懂，而且带着还剩多少", async () => {
  const g = await boot({ tokens: 500, calls: 1 });
  try {
    await chat(g); // 一次就用掉 1234，超过 500
    const r = await chat(g);
    assert.equal(r.status, 402);
    const j = await r.json();
    assert.equal(j.error.code, "OUT_OF_TOKENS");
    assert.match(j.error.message, /用完了/);
    assert.match(j.error.message, /1234\/500/);
    assert.equal(r.headers.get("x-quota-tokens-limit"), "500");

    const v = await g.call("/ark/contents/generations/tasks", { method: "POST", body: "{}" });
    assert.equal(v.status, 200, "出片次数还有 1 次，不该被 token 那一头连坐");
    const v2 = await g.call("/ark/contents/generations/tasks", { method: "POST", body: "{}" });
    assert.equal(v2.status, 402);
    assert.equal((await v2.json()).error.code, "OUT_OF_CALLS");
  } finally { g.stop(); }
});

test("并发压不穿上限：占额度和放额度之间不能有空档", async () => {
  const g = await boot({ tokens: 100000, calls: 3 });
  try {
    const rs = await Promise.all([1, 2, 3, 4, 5].map(() => g.call("/ark/contents/generations/tasks", { method: "POST", body: "{}" })));
    assert.equal(rs.filter((r) => r.ok).length, 3, "三次额度就该只放过三个");
    assert.equal(rs.filter((r) => r.status === 402).length, 2);
    assert.equal(g.store.quota(g.code).calls.used, 3);
  } finally { g.stop(); }
});

test("停用的码当场失效；上游没响应不扣额度", async () => {
  const g = await boot();
  try {
    await chat(g);
    const used = g.store.quota(g.code).tokens.used;
    g.up.srv.close(); // 上游挂了
    const r = await chat(g);
    assert.equal(r.status, 502);
    assert.equal(g.store.quota(g.code).tokens.used, used, "没到上游就不该扣体验的人的额度");

    g.store.revoke(g.code);
    assert.equal((await chat(g)).status, 402);
  } finally { g.stop(); }
});

test("账本原子落盘：写到一半被杀，下次启动还读得出来", () => {
  const file = tmp();
  const s1 = createStore(file);
  const { code } = s1.issue({ label: "甲", tokens: 10, calls: 1 });
  const h = s1.reserve(code, "chat");
  s1.settle(h.handle, { tokens: 7 });
  s1.flush();
  const s2 = createStore(file);
  assert.equal(s2.quota(code).tokens.used, 7);
  assert.equal(s2.quota(code).tokens.left, 3);
  assert.equal(fs.readdirSync(path.dirname(file)).filter((f) => f.endsWith(".tmp")).length, 0, "临时文件要 rename 掉，不能留在目录里");
});

test("网关在跑的时候发码、停用码，都不用重启，也不会把用量抹掉", async () => {
  const g = await boot();
  try {
    await chat(g);
    assert.equal(g.store.quota(g.code).tokens.used, 1234);

    // 管理员在另一个进程里发一个新码（CLI 就是这么做的）
    const admin = createStore(g.store.file);
    const fresh = admin.issue({ label: "新来的", tokens: 5000, calls: 2 });
    admin.flush();

    // 跑着的网关立刻就认这个新码 —— 不用重启
    const r = await g.call("/v1/chat/completions", { method: "POST", token: fresh.code, body: JSON.stringify({ model: "m", messages: [] }) });
    assert.equal(r.status, 200, "刚发的码就该能用");
    // 而且原来那个码的用量没有被 CLI 那次写覆盖掉
    assert.equal(g.store.quota(g.code).tokens.used, 1234, "别的进程写账本，不能把这边记的用量抹掉");

    // 反过来：CLI 停用一个码，跑着的网关下一次请求就该拒
    const admin2 = createStore(g.store.file);
    admin2.revoke(g.code);
    admin2.flush();
    g.store.refresh.lastRefresh = 0;
    await new Promise((r2) => setTimeout(r2, 1100)); // 认不出来才去读盘，这里等过限频窗口
    const after = await g.call("/v1/chat/completions", { method: "POST", token: "dt_unknown", body: "{}" }); // 触发一次 refresh
    assert.equal(after.status, 401);
    assert.equal((await chat(g)).status, 402, "停用之后就该拒");
  } finally { g.stop(); }
});
