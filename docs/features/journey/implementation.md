# 创作分支与音画预演：实现清单

[功能说明](README.md)

## 源码入口

- [core/features/journey/journey.js](../../../core/features/journey/journey.js)
- [core/features/journey/journey-actions.js](../../../core/features/journey/journey-actions.js)
- [server/src/features/journey/journey.mjs](../../../server/src/features/journey/journey.mjs)

跨运行环境按同名功能目录关联；共享 Action 注册、全局 UI 和宿主装配未复制进功能目录。

## 实际注册操作

| 操作 | 用途 | 必填参数 | 可撤销标记 |
| --- | --- | --- | --- |
| `journey.adopt-plan` | 采用文字模型细化的候选分镜，并新建检查点 | — | 否 |
| `journey.adopt-render` | 采用当前检查点对应的音画预演 | — | 否 |
| `journey.checkpoint` | 保存当前音画分镜的检查点 | — | 否 |
| `journey.choose` | 选择一个可视化方案，创建子分支并保留所有其他选择 | — | 否 |
| `journey.refine` | 用已连接的文字模型细化当前分镜；结果作为候选，手动采用 | — | 否 |
| `journey.render` | 用构图草图、本机临时配音和原创节拍制作动态分镜；不调用视频生成模型 | — | 否 |
| `journey.restore` | 回到一个检查点；离开前自动保存当前分支的修改 | — | 否 |
| `journey.shot-update` | 修改分镜画面、旁白和景别；旧预演保留，需重新预演后采用 | — | 否 |
| `journey.start` | 从模糊印象开始创作路径，保存当前工程为可恢复的原版；不调用生成模型 | — | 否 |

操作清单来自迁移时的 `core/index.js` capabilities；执行仍须经过状态机、预算、配置与权限校验。这里只展示注册声明，不替代服务端前置条件。
