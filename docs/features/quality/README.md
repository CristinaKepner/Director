# 检查、证据与有预算修复

[返回功能索引](../README.md) · [实现与操作清单](implementation.md)

## 已有能力

镜头约束检查、抽样视觉判定、验收运行、问题定位、修复候选、复查与采用。

## 用户流程

定义要求和预算 → 检查 → 记录证据 → 修复候选 → 复查 → 用户采用；可暂停/继续。

## 业务规则

过期报告不能作为当前验收结论；证据不足保持不确定。修复候选不自动采用，预算和内容签名限制重试/恢复。

## 数据归属

harness.runs、报告、证据帧、预算和候选 job；contract 描述镜头约束。

## 依赖与边界

抽样验收不保证整段视频质量；声音语义和口型并非全面自动检测。

## 验证

- [tests/contract.test.mjs](../../../tests/contract.test.mjs)
- [server/tests/harness.test.mjs](../../../server/tests/harness.test.mjs)

以上是关联测试入口，不代表本轮均已通过；本轮实际结果见 [迁移与验证记录](../migration.md)。

## 相关原文

- [docs/video-harness.md](../../video-harness.md)
- [docs/revision.md](../../revision.md)
