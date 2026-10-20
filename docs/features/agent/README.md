# Agent 规划与任务协作

[返回功能索引](../README.md) · [实现与操作清单](implementation.md)

## 已有能力

自然语言计划、协作确认、逐步执行和任务进度；规则规划与配置后的 LLM 共存。

## 用户流程

用户输入 → 收集当前上下文 → 规划 → 按协作模式确认/执行 → 工具结果和进度回写。

## 业务规则

纯只读计划最多补读两轮，再继续原请求；不无限循环。工程切换拒绝迟到结果。节点执行不在规划白名单中，不因编排自动调用生成。

## 数据归属

agent.messages、pending plan、busy 与事件；server host 注入规划器和工具。

## 依赖与边界

画布规划使用当前工程上下文，不附带旧聊天；开放式理解需要模型。没有自动检测或嵌套本地 Codex/Claude。

## 验证

- [tests/planner-context.test.mjs](../../../tests/planner-context.test.mjs)
- [tests/creation-agent.test.mjs](../../../tests/creation-agent.test.mjs)
- [server/tests/planner.test.mjs](../../../server/tests/planner.test.mjs)
- [server/tests/model-routing.test.mjs](../../../server/tests/model-routing.test.mjs)

以上是关联测试入口，不代表本轮均已通过；本轮实际结果见 [迁移与验证记录](../migration.md)。

## 相关原文

- [docs/harness.md](../../harness.md)
- [docs/workflow-canvas.md](../../workflow-canvas.md)
