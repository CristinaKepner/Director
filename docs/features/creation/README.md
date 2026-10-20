# 空工程引导与创作主页面

[返回功能索引](../README.md) · [实现与操作清单](implementation.md)

## 已有能力

一句话/参照起步，创作目标、素材和镜头计划在主页面组合。

## 用户流程

新建空工程 → 弹窗选择起步 → 填写目标/导入参照 → 概览 → 节点或镜头预演。

## 业务规则

每次新建重置引导；关闭后不因状态刷新重复弹出。异步上传或规划迟到时核对工程身份，不能写入另一个工程。

## 数据归属

project.creation、assets、project.workflow；界面只保存弹窗/选择状态。

## 依赖与边界

题材探索、参考复刻、A/B 是规划方向，不代表已完成实验。旧独立创作画布入口已移除。

## 验证

- [tests/creation.test.mjs](../../../tests/creation.test.mjs)
- [tests/creation-agent.test.mjs](../../../tests/creation-agent.test.mjs)
- [tests/stage-workspace.test.mjs](../../../tests/stage-workspace.test.mjs)

以上是关联测试入口，不代表本轮均已通过；本轮实际结果见 [迁移与验证记录](../migration.md)。

## 相关原文

- [docs/workflow-canvas.md](../../workflow-canvas.md)
