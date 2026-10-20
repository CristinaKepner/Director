# 提示词、图像与视频生成：实现清单

[功能说明](README.md)

## 源码入口

- [core/features/generation/prompts.js](../../../core/features/generation/prompts.js)
- [core/features/generation/seedance.js](../../../core/features/generation/seedance.js)
- [core/features/generation/seedance-library.js](../../../core/features/generation/seedance-library.js)
- [server/src/features/generation/ark.mjs](../../../server/src/features/generation/ark.mjs)
- [server/src/features/generation/mosshub.mjs](../../../server/src/features/generation/mosshub.mjs)
- [server/src/features/generation/routing.mjs](../../../server/src/features/generation/routing.mjs)
- [server/src/features/generation/model-catalog.mjs](../../../server/src/features/generation/model-catalog.mjs)

跨运行环境按同名功能目录关联；共享 Action 注册、全局 UI 和宿主装配未复制进功能目录。

## 实际注册操作

| 操作 | 用途 | 必填参数 | 可撤销标记 |
| --- | --- | --- | --- |
| `generation.cancel` | 取消任务 | id | 否 |
| `generation.prompt` | 把镜头编译成结构化 image / video(T2V,I2V) / v2v 提示词（中英）+ 负面词，存为新版本 | — | 是 |
| `generation.reference` | 为实体生成参考图（角色定妆照 / 产品图，中性背景、正面全身或整件产品），完成后自动登记为该实体的未批准资产。provider 默认 seedream-5 | entityId | 否 |
| `generation.resume-query` | 恢复已有远端视频任务的查询，不重新创建付费任务 | id | 否 |
| `generation.retry` | 重试失败/取消的任务 | id | 否 |
| `generation.revise` | 按镜头修改草稿生成候选，保留当前采用版；不重做其他镜头 | shotId | 否 |
| `generation.select-provider` | 选择默认视频或图像生成模型；顶部与生成面板共用，不提交生成任务。 | provider | 是 |
| `generation.status` | 查询任务 | — | 否 |
| `generation.submit` | 提交生成任务。mode: t2i/i2i/t2v/i2v/v2v；provider: minimax-h3/minimax-h3-max/mosshub-seedream-pro/mosshub-gemini-image/seedance-2.5/seedance-2/seedream-5/kling-2.5/veo-3/runway-gen4/higgsfield/flux-kontext/gpt-image；v2v 自动使用圈选 Take 的白模视频 | — | 是 |
| `prompt.template` | 指定这一镜（或整条工程）用哪个 Seedance 提示词模板；clear=true 改回自动挑。不带参数就只回报当前用的是哪个 | — | 是 |

操作清单来自迁移时的 `core/index.js` capabilities；执行仍须经过状态机、预算、配置与权限校验。这里只展示注册声明，不替代服务端前置条件。
