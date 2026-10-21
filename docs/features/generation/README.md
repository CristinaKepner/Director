# 提示词、图像与视频生成

[返回功能索引](../README.md) · [实现与操作清单](implementation.md)

## 已有能力

提示词编译和模板库，Ark/MossHub 适配器、模型目录、任务提交/查询/重试与版本候选。

## 用户流程

镜头/节点约束 → 编译提示词和参考 → 检查供应商能力 → 提交 → 查询 → 保留候选 → 用户采用。

## 业务规则

不未经同意替换模型或忽略参考；i2v/v2v/t2v 区分输入。节点任务受自己的预算，不能通过通用 retry 绕开。

## 数据归属

jobs、生成配置和模板；适配器不成为工程的第二份状态。

## 依赖与边界

模型替身测试只证明请求契约；真实额度、模型能力和质量需线上验收。

## 验证

- [tests/seedance.test.mjs](../../../tests/seedance.test.mjs)
- [tests/workflow-service.test.mjs](../../../tests/workflow-service.test.mjs)
- [server/tests/model-routing.test.mjs](../../../server/tests/model-routing.test.mjs)

以上是关联测试入口，不代表本轮均已通过；本轮实际结果见 [迁移与验证记录](../migration.md)。

## 相关原文

- [docs/backend-api.md](../../backend-api.md)
- [docs/capability-test.md](../../capability-test.md)
- [docs/tvc/README.md](../../tvc/README.md)

## 0.9.20 修复与验证边界

[v2v 媒体准备、隧道依赖与发布说明](../../releases/0.9.20.md)。
