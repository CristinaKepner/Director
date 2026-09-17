// Agent 线程分组。信息不删，只是不一次全摆出来 —— 但有一条底线：折叠不能把坏消息藏起来。
import test from "node:test";
import assert from "node:assert/strict";
import { threadItems } from "../web/js/thread.js";

const tool = (id, ok = true) => ({ id, role: "tool", text: `步骤 ${id}\nx.y {}\n→ ${ok ? "ok" : "fail"}`, ok });
const job = (id) => ({ id, role: "agent", text: `01 镜 · Seedance · v2v 生成完成。`, jobId: `job_${id}`, media: { url: `/media/${id}.mp4`, kind: "video" } });

test("三十步的计划是一张卡，不是三十行", () => {
  const msgs = [{ id: "u", role: "user", text: "建一条片子" }, ...Array.from({ length: 30 }, (_, i) => tool(`t${i}`))];
  const items = threadItems(msgs);
  assert.equal(items.length, 2, "一条用户消息 + 一组步骤");
  assert.equal(items[1].kind, "tools");
  assert.equal(items[1].items.length, 30, "步骤一条没丢，只是收起来了");
});

test("失败的那一步跟着进组，但组里查得到它（渲染层靠这个把它露在外面）", () => {
  const items = threadItems([tool("a"), tool("b", false), tool("c")]);
  assert.equal(items.length, 1);
  assert.deepEqual(items[0].items.filter((m) => m.ok === false).map((m) => m.id), ["b"]);
});

test("中间插了别的消息，就是两组 —— 不能把两轮对话的步骤混在一起", () => {
  const items = threadItems([tool("a"), { id: "u", role: "user", text: "再来" }, tool("b")]);
  assert.deepEqual(items.map((x) => x.kind), ["tools", "msg", "tools"]);
});

test("「完成 3/3 步。」紧跟在步骤组后面是废话；后面还有话才留，而且只留那部分", () => {
  const done = threadItems([tool("a"), { id: "r", role: "agent", text: "完成 1/1 步。" }]);
  assert.equal(done.length, 1, "全成了就不再重复一遍");

  const partial = threadItems([tool("a"), { id: "r", role: "agent", text: "完成 1/2 步。\n未处理：没听懂「机位低一点」。" }]);
  assert.equal(partial.length, 2);
  assert.equal(partial[1].m.text, "未处理：没听懂「机位低一点」。", "没做成的那半句必须留着");

  // 不跟在步骤组后面的同一句话不动它：那可能是别的上下文
  const alone = threadItems([{ id: "r", role: "agent", text: "完成 3/3 步。" }]);
  assert.equal(alone.length, 1);
});

test("连着出片收成一排；普通回复不算出片", () => {
  const items = threadItems([job("a"), job("b"), job("c"), { id: "r", role: "agent", text: "要不要再来一版？" }]);
  assert.deepEqual(items.map((x) => x.kind), ["media", "msg"]);
  assert.equal(items[0].items.length, 3);
});
