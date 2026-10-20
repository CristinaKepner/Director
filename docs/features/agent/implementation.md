# Agent 规划与任务协作：实现清单

[功能说明](README.md)

## 源码入口

- [core/features/agent/agent.js](../../../core/features/agent/agent.js)
- [server/src/features/agent/planner-reads.mjs](../../../server/src/features/agent/planner-reads.mjs)
- [server/src/features/agent/llm.mjs](../../../server/src/features/agent/llm.mjs)
- [web/js/features/agent/task-progress.js](../../../web/js/features/agent/task-progress.js)

跨运行环境按同名功能目录关联；共享 Action 注册、全局 UI 和宿主装配未复制进功能目录。

## 实际注册操作

| 操作 | 用途 | 必填参数 | 可撤销标记 |
| --- | --- | --- | --- |
| `agent.cancel` | 取消待确认的方案（不做任何改动） | — | 否 |
| `agent.confirm` | 确认并执行 Collaborative 模式下待确认的方案；skip 可以只跳过其中几步 | — | 否 |
| `agent.plan` | 只规划不执行：返回自然语言指令对应的 Action 列表 | text | 否 |
| `agent.run` | 把一句自然语言指令交给 Agent 规划并执行（mode: lead 直接执行 / collaborative 需确认 / manual 只出方案） | text | 否 |
| `agent.run-step` | 执行方案中的单独一步（Manual 模式逐条执行）：step = {action, payload, label, role} | — | 否 |
| `agent.say` | 向 Agent 会话追加一条消息（外部 LLM 后端把回复写回会话用） | — | 否 |
| `agent.set-backend` | 选择 Agent 规划后端：rules（内置规则规划器）或后端配置的 LLM 模型名（见 /api/health 的 llm.models） | backend | 否 |
| `agent.set-mode` | 设置 Agent 工作模式：collaborative 出方案再确认 / lead 直接执行 / manual 只出方案 | mode | 否 |

操作清单来自迁移时的 `core/index.js` capabilities；执行仍须经过状态机、预算、配置与权限校验。这里只展示注册声明，不替代服务端前置条件。
