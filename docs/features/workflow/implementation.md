# 节点编排与运行：实现清单

[功能说明](README.md)

## 源码入口

- [core/features/workflow/workflow.js](../../../core/features/workflow/workflow.js)
- [core/features/workflow/workflow-actions.js](../../../core/features/workflow/workflow-actions.js)
- [core/features/workflow/workflow-compose.js](../../../core/features/workflow/workflow-compose.js)
- [core/features/workflow/workflow-runtime-actions.js](../../../core/features/workflow/workflow-runtime-actions.js)
- [web/js/features/workflow/creation-bridge.js](../../../web/js/features/workflow/creation-bridge.js)
- [web/js/features/workflow/creation-execution.js](../../../web/js/features/workflow/creation-execution.js)
- [server/src/features/workflow/workflow-service.mjs](../../../server/src/features/workflow/workflow-service.mjs)
- [server/src/features/workflow/workflow-runner.mjs](../../../server/src/features/workflow/workflow-runner.mjs)
- [server/src/features/workflow/workflow-routing.mjs](../../../server/src/features/workflow/workflow-routing.mjs)
- [server/src/features/workflow/workflow-steps.mjs](../../../server/src/features/workflow/workflow-steps.mjs)
- [server/src/features/workflow/workflow-condition.mjs](../../../server/src/features/workflow/workflow-condition.mjs)
- [server/src/features/workflow/workflow-generation.mjs](../../../server/src/features/workflow/workflow-generation.mjs)
- [server/src/features/workflow/workflow-judge.mjs](../../../server/src/features/workflow/workflow-judge.mjs)
- [creation-ui/src](../../../creation-ui/src)

跨运行环境按同名功能目录关联；共享 Action 注册、全局 UI 和宿主装配未复制进功能目录。

## 实际注册操作

| 操作 | 用途 | 必填参数 | 可撤销标记 |
| --- | --- | --- | --- |
| `workflow.add` | 添加工作流规划节点 | — | 是 |
| `workflow.cancel` | 停止后续节点，已提交的远端任务可能继续计费 | — | 否 |
| `workflow.compose` | 原子追加 Agent 节点计划；nodes 内 id 为本计划临时 ID，edges 可引用临时 ID 或工程已有 ID。失败不改变工程。 | — | 是 |
| `workflow.connect` | 连接规划节点（不执行生成） | — | 是 |
| `workflow.disconnect` | 删除连线 | — | 是 |
| `workflow.execute` | 执行当前节点图，会调用模型计费；必须由用户确认次数上限。不会自动采用候选。 | — | 否 |
| `workflow.read` | 读取当前工程工作流供 Agent 规划 | — | 否 |
| `workflow.remove` | 删除节点与关联连线 | — | 是 |
| `workflow.status` | 读取当前节点执行记录与候选结果 | — | 否 |
| `workflow.template` | 追加人设预处理工作流，不覆盖已有节点 | — | 是 |
| `workflow.update` | 修改节点位置和参数 | — | 是 |

操作清单来自迁移时的 `core/index.js` capabilities；执行仍须经过状态机、预算、配置与权限校验。这里只展示注册声明，不替代服务端前置条件。
