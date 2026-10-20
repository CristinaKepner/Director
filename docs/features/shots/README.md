# 分镜、运镜、故事版与 Take

[返回功能索引](../README.md) · [实现与操作清单](implementation.md)

## 已有能力

镜头创建/修改/复制/排序/拆分，帧区间与运动关键帧，白模 Take 和故事版。

## 用户流程

建立镜头 → 配置相机/动作/区间 → 预演 → 录制 Take → 选择镜头版本。

## 业务规则

锁定要求进入生成约束；帧与秒按 fps 换算。录制结束写入媒体引用，加载工程不继续旧录制。镜头采用与生成候选分开。

## 数据归属

shots、takes、storyboard；motion 计算帧时的相机/实体/灯光状态。

## 依赖与边界

镜头 Action 仍共享 core/actions.js 的注册与校验；本次不复制该注册器或改变状态机。

## 验证

- [tests/runtime.test.mjs](../../../tests/runtime.test.mjs)
- [tests/contract.test.mjs](../../../tests/contract.test.mjs)
- [tests/cut.test.mjs](../../../tests/cut.test.mjs)

以上是关联测试入口，不代表本轮均已通过；本轮实际结果见 [迁移与验证记录](../migration.md)。

## 相关原文

- [docs/user-flow.md](../../user-flow.md)
- [docs/revision.md](../../revision.md)
