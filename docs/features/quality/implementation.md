# 检查、证据与有预算修复：实现清单

[功能说明](README.md)

## 源码入口

- [core/features/quality/contract.js](../../../core/features/quality/contract.js)
- [core/features/quality/harness.js](../../../core/features/quality/harness.js)
- [core/features/quality/harness-actions.js](../../../core/features/quality/harness-actions.js)
- [web/js/features/quality/harness-panel.js](../../../web/js/features/quality/harness-panel.js)
- [server/src/features/quality/harness.mjs](../../../server/src/features/quality/harness.mjs)
- [server/src/features/quality/harness-inspector.mjs](../../../server/src/features/quality/harness-inspector.mjs)
- [server/src/features/quality/judge.mjs](../../../server/src/features/quality/judge.mjs)

跨运行环境按同名功能目录关联；共享 Action 注册、全局 UI 和宿主装配未复制进功能目录。

## 实际注册操作

| 操作 | 用途 | 必填参数 | 可撤销标记 |
| --- | --- | --- | --- |
| `annotation.add` | 在镜头/Take/物体上加时间码批注 | targetId, text | 是 |
| `harness.adopt` | 采用已复查的候选版本；工程改变时拒绝，支持撤销 | runId | 否 |
| `harness.cancel` | 停止本次运行，不再提交后续生成；已生成候选保留 | runId | 否 |
| `harness.check` | 检查当前片段或全片；按工程预算执行本地和可选视觉检查，保存证据，不修改剪辑 | — | 否 |
| `harness.configure` | 设置成片验收要求和每次运行的预算上限；不启动模型 | — | 是 |
| `harness.pause` | 暂停检查与后续修复；已提交的模型任务可能继续完成 | runId | 否 |
| `harness.repair` | 按检查记录修复一个问题：直接编辑可撤销，画面问题生成候选并复查；不自动采用候选 | runId, issueId | 否 |
| `harness.resume` | 从检查点继续；已有远端任务只恢复查询，不重新提交 | runId | 否 |
| `harness.status` | 读取可恢复的检查/修复运行、问题时间段、预算、证据与候选版本 | — | 否 |
| `review.compare` | 比较两个 Take 的机位/灯光/物体差异 | a, b | 否 |
| `review.contract` | 核对这一镜锁住的约束：拿评估出来的逐帧几何和锁定时的基准比。每条给 pass / violate / unverifiable，附最坏的一帧和回退点。shotId 不给就查全片有锁的镜头 | — | 否 |
| `review.verdict` | 读验收结论 | — | 否 |
| `review.verify` | 自动验收：把这一镜新生成的结果和已批准的那一版对比 —— 要改的改了没有，锁住的有没有漂 | — | 否 |

操作清单来自迁移时的 `core/index.js` capabilities；执行仍须经过状态机、预算、配置与权限校验。这里只展示注册声明，不替代服务端前置条件。
