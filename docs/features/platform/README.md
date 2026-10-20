# 运行时、HTTP/CLI 与共享装配

[返回功能索引](../README.md) · [实现与操作清单](implementation.md)

## 已有能力

统一 Action、共享 store/schema、HTTP/SSE、CLI、前端同步和应用装配。

## 用户流程

启动入口 → 注入适配器/钩子 → 注册操作 → 校验/执行 → 事件与快照同步 → 持久化。

## 业务规则

一个权威 store；浏览器不能导入 Node 专属模块。启动路径保持不变；不要把不同功能复制成多套状态。

## 数据归属

core/store.js、schema.js、actions.js；server host/api；web main/client/ui。

## 依赖与边界

共享装配保留集中模块，历史大函数只改引用；功能文件夹不宣称所有 Action 已独立成包。

## 验证

- [tests/imports.test.mjs](../../../tests/imports.test.mjs)
- [server/tests/api.test.mjs](../../../server/tests/api.test.mjs)
- [tests/runtime.test.mjs](../../../tests/runtime.test.mjs)

以上是关联测试入口，不代表本轮均已通过；本轮实际结果见 [迁移与验证记录](../migration.md)。

## 相关原文

- [docs/backend-api.md](../../backend-api.md)
- [docs/harness.md](../../harness.md)
