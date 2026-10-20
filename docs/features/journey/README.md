# 创作分支与音画预演

[返回功能索引](../README.md) · [实现与操作清单](implementation.md)

## 已有能力

检查点、分支选择/恢复、分镜草图、临时配音与配乐预演。

## 用户流程

建立检查点 → 选择创作方向 → 生成分镜计划/预演 → 修改 → 恢复或继续分支。

## 业务规则

检查点包含规定的工程子集，不等价于完整事件重放。恢复与仅查看对话是两个操作；异步产物需校验来源与签名。

## 数据归属

journey.head/nodes，快照和 agentMessages；临时音画输出进入工程媒体。

## 依赖与边界

旧 0.9.17 独立路径界面已移除，领域数据与能力保留。macOS 临时 TTS 与草图不代表最终演出。

## 验证

- [tests/journey.test.mjs](../../../tests/journey.test.mjs)
- [server/tests/journey.test.mjs](../../../server/tests/journey.test.mjs)

以上是关联测试入口，不代表本轮均已通过；本轮实际结果见 [迁移与验证记录](../migration.md)。

## 相关原文

- [docs/creative-journey.md](../../creative-journey.md)
- [docs/workflow-canvas.md](../../workflow-canvas.md)
