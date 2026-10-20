# 当前对话与历史版本

[返回功能索引](../README.md) · [实现与操作清单](implementation.md)

## 已有能力

当前消息分组、历史检查点/整合档案、对话导出、版本选择和只读气泡。

## 用户流程

跟它说 → 对话版本 → 调取原文 → 用户/Agent 气泡和媒体 → 当前对话恢复输入。

## 业务规则

历史查看不修改镜头、不执行旧计划。连续工具折叠但失败可见；历史 HTML 文本不执行。切换工程重置选择。

## 数据归属

project.conversationArchive.versions 优先；无档案读取 journey.nodes[].agentMessages；当前 agent.messages 与历史分开。

## 依赖与边界

只展示真实留存记录，不保证完整聊天持久化；重复检查点可能包含相同消息。没有将历史选择自动注入下一次规划。

## 验证

- [tests/conversation-archive.test.mjs](../../../tests/conversation-archive.test.mjs)
- [tests/thread.test.mjs](../../../tests/thread.test.mjs)

以上是关联测试入口，不代表本轮均已通过；本轮实际结果见 [迁移与验证记录](../migration.md)。

## 相关原文

- [docs/workflow-canvas.md](../../workflow-canvas.md)
