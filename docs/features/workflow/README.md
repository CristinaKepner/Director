# 节点编排与运行

[返回功能索引](../README.md) · [实现与操作清单](implementation.md)

## 已有能力

资产 Text/Table/Image/Video/Audio，三视图/光照/运镜参考，图像生成/编辑、视频、If/Loop、HTML 预览。

## 用户流程

读取当前图 → Agent compose 或用户连线 → 校验 → 确认生成预算 → 运行 → 查看候选 → 手动加入素材。

## 业务规则

写入先完整校验；拒绝自连、重复边、缺失节点和图环。If true 修复、false 绕过；threshold 是置信度下限。Loop 内部有限修复，1–10 次；单次生成预算 1–20，未知判断或上限暂停。

## 数据归属

project.workflow、project.workflowRun；jobs 以 workflowRunId 归属；资产通过 assetId 引用。

## 依赖与边界

无自动排版/碰撞、大图优化、跨运行缓存或自动采用。HTML 仅沙箱预览，不自动导出视频。音频参考不被默默丢弃。

## 验证

- [tests/workflow.test.mjs](../../../tests/workflow.test.mjs)
- [tests/workflow-agent.test.mjs](../../../tests/workflow-agent.test.mjs)
- [tests/workflow-runner.test.mjs](../../../tests/workflow-runner.test.mjs)
- [tests/workflow-service.test.mjs](../../../tests/workflow-service.test.mjs)

以上是关联测试入口，不代表本轮均已通过；本轮实际结果见 [迁移与验证记录](../migration.md)。

## 相关原文

- [docs/workflow-canvas.md](../../workflow-canvas.md)
