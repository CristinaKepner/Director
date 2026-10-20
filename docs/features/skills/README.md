# 创作 Skills 与题材模板

[返回功能索引](../README.md) · [实现与操作清单](implementation.md)

## 已有能力

项目开发 skill、133 个 Flova 创作技能、Lemo-Opuscar 和提示词模板。

## 用户流程

选择题材 → 读取 skill 的要求 → 映射实际工具 → 规划/调用受支持操作。

## 业务规则

保留作者与参考说明；原平台工具名不能冒充本项目已安装 API。skills 随 DMG 的资源目录分发。

## 数据归属

项目 .agents/skills 与 docs/flova-skills.json；不保存用户凭据。

## 依赖与边界

技能本身不提供新模型服务；Lemo-Opuscar 尚不是通用 Code2Video 后端。

## 验证

- [tests/seedance.test.mjs](../../../tests/seedance.test.mjs)

以上是关联测试入口，不代表本轮均已通过；本轮实际结果见 [迁移与验证记录](../migration.md)。

## 相关原文

- [docs/workflow-canvas.md](../../workflow-canvas.md)
- [docs/creative-journey.md](../../creative-journey.md)
