# 工程管理与保存

[返回功能索引](../README.md) · [实现与操作清单](implementation.md)

## 已有能力

创建、命名、加载、导出工程，设置画幅/帧率，撤销与重做。

## 用户流程

新建工程 → 编辑 → 自动保存；切换前桌面保留快照；导出 JSON 后可重新打开。

## 业务规则

工程是权威状态；撤销恢复内容不应重发模型请求。加载时清理录制状态、处理未完成任务。素材文件与 JSON 分开迁移。

## 数据归属

project、scene、实体/镜头/素材集合；共享 store 管理快照、版本和历史。

## 依赖与边界

普通 persistable 不保存完整实时 agent.messages；对话版本另见 conversation。

## 验证

- [tests/runtime.test.mjs](../../../tests/runtime.test.mjs)
- [tests/shell.test.mjs](../../../tests/shell.test.mjs)

以上是关联测试入口，不代表本轮均已通过；本轮实际结果见 [迁移与验证记录](../migration.md)。

## 相关原文

- [docs/technical-reference.md](../../technical-reference.md)
- [docs/backend-api.md](../../backend-api.md)
