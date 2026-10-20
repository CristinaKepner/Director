# 复刻参照：实现与操作清单

[功能说明](README.md)

## 源码入口

- [core/features/reference-replication/reference-plan.js](../../../core/features/reference-replication/reference-plan.js)
- [server/src/features/reference-replication/reference.mjs](../../../server/src/features/reference-replication/reference.mjs)
- [core/features/reference-replication/actions.js](../../../core/features/reference-replication/actions.js)
- [web/js/features/reference-replication/panel.js](../../../web/js/features/reference-replication/panel.js)

## 操作

| 操作 | 用途 | 必填参数 | 可撤销标记 |
| --- | --- | --- | --- |
| `reference.analyze` | 读一张参考图或一段参考视频（可指定起止秒数），得到景别/机位/光位/主体/运镜的结构化描述，以及一句可直接建场的 brief | ref | 否 |
| `reference.fetch` | 从视频链接（B站/抖音/YouTube 等）下载一段素材到本地，作为参照。可只取其中一段 | url | 否 |
| `reference.replicate` | 复刻一条参照：链接（或已有素材）→ 下载 → 读出拍摄参数 → 在 3D 里把场景和分镜搭出来。之后录白模、生成由导演决定 | — | 否 |
| `reference.result` | 读回最近一次（或指定任务）的参照分析 | — | 否 |
| `reference.use` | 把之前读过的一条参照换回来当前用的那条。不重新读：读一次约 20 秒、一万多 token，结果本来就存在任务里 | id | 否 |

## 装配与边界

`core/actions.js` 显式注册功能操作，保持公共 dispatch、撤销和状态校验。`web/js/ui.js` 组合面板并提供通知、预览、定位等共享 UI 服务；面板经 client dispatch 调用同一操作层。工程状态继续由共享 store 持有。全局布局、主题和通用样式仍在 `web/css/app.css`。

## 测试

- [tests/reference-plan.test.mjs](../../../tests/reference-plan.test.mjs)
- [server/tests/reference-video.test.mjs](../../../server/tests/reference-video.test.mjs)

[迁移与验证记录](../migration.md)
