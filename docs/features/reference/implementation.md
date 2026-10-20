# 参考分析与复刻规划：实现清单

[功能说明](README.md)

## 源码入口

- [core/features/reference/reference-plan.js](../../../core/features/reference/reference-plan.js)
- [server/src/features/reference/reference.mjs](../../../server/src/features/reference/reference.mjs)

跨运行环境按同名功能目录关联；共享 Action 注册、全局 UI 和宿主装配未复制进功能目录。

## 实际注册操作

| 操作 | 用途 | 必填参数 | 可撤销标记 |
| --- | --- | --- | --- |
| `reference.analyze` | 读一张参考图或一段参考视频（可指定起止秒数），得到景别/机位/光位/主体/运镜的结构化描述，以及一句可直接建场的 brief | ref | 否 |
| `reference.fetch` | 从视频链接（B站/抖音/YouTube 等）下载一段素材到本地，作为参照。可只取其中一段 | url | 否 |
| `reference.replicate` | 复刻一条参照：链接（或已有素材）→ 下载 → 读出拍摄参数 → 在 3D 里把场景和分镜搭出来。之后录白模、生成由导演决定 | — | 否 |
| `reference.result` | 读回最近一次（或指定任务）的参照分析 | — | 否 |
| `reference.use` | 把之前读过的一条参照换回来当前用的那条。不重新读：读一次约 20 秒、一万多 token，结果本来就存在任务里 | id | 否 |

操作清单来自迁移时的 `core/index.js` capabilities；执行仍须经过状态机、预算、配置与权限校验。这里只展示注册声明，不替代服务端前置条件。
