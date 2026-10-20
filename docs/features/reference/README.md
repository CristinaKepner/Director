# 参考分析与复刻规划

[返回功能索引](../README.md) · [实现与操作清单](implementation.md)

## 已有能力

抽样帧分析、主体/机位/光照/运镜描述，参考结果编译为可编辑场景计划。

## 用户流程

导入参考 → 抽帧 → 参考分析 → 参数化场景/镜头 → 编辑或生成。

## 业务规则

单帧不足以证明运镜；不确定项应记录。人数、镜头景别与运镜约束在编译时标准化，参照分段映射场景台。

## 数据归属

project reference 相关字段与编译结果；分析模型与媒体抽帧协作。

## 依赖与边界

估计焦段和光照不是物理重建；i2v 关键帧不等价于整段视频参考。

## 验证

- [tests/reference-plan.test.mjs](../../../tests/reference-plan.test.mjs)
- [server/tests/reference-video.test.mjs](../../../server/tests/reference-video.test.mjs)

以上是关联测试入口，不代表本轮均已通过；本轮实际结果见 [迁移与验证记录](../migration.md)。

## 相关原文

- [docs/revision.md](../../revision.md)
- [docs/backend-api.md](../../backend-api.md)
