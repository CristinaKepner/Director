# 3D 舞台、实体、相机与灯光

[返回功能索引](../README.md) · [实现与操作清单](implementation.md)

## 已有能力

Three.js 舞台，自由/Program/对照视图，实体变换、姿态、走位、机位和灯光控制。

## 用户流程

建场 → 添加实体 → 机位构图/灯光 → 运镜预览 → 录制白模 Take 或进入生成。

## 业务规则

机位位移使用明确坐标系，nudge 固定焦段；舞台与主工作区使用同一工程状态。模型资源路径必须随源码迁移校正。

## 数据归属

scene、entities、cameras、lights；viewport 仅负责表现和交互桥接。

## 依赖与边界

白模是构图与运动示意，不是最终真实画面；外部模型是否遵循运动仍需验收。

## 验证

- [tests/spatial.test.mjs](../../../tests/spatial.test.mjs)
- [tests/phys.test.mjs](../../../tests/phys.test.mjs)
- [tests/coverage.test.mjs](../../../tests/coverage.test.mjs)
- [tests/stage-workspace.test.mjs](../../../tests/stage-workspace.test.mjs)
- [tests/shell.test.mjs](../../../tests/shell.test.mjs)

以上是关联测试入口，不代表本轮均已通过；本轮实际结果见 [迁移与验证记录](../migration.md)。

## 相关原文

- [docs/technical-reference.md](../../technical-reference.md)
- [docs/revision.md](../../revision.md)
