# 运行时、HTTP/CLI 与共享装配：实现清单

[功能说明](README.md)

## 源码入口

- [core/index.js](../../../core/index.js)
- [core/store.js](../../../core/store.js)
- [core/schema.js](../../../core/schema.js)
- [core/actions.js](../../../core/actions.js)
- [server/src/api.mjs](../../../server/src/api.mjs)
- [server/src/host.mjs](../../../server/src/host.mjs)
- [server/bin](../../../server/bin)
- [web/js/main.js](../../../web/js/main.js)
- [web/js/client.js](../../../web/js/client.js)
- [web/js/ui.js](../../../web/js/ui.js)
- [web/js/firstrun.js](../../../web/js/firstrun.js)

跨运行环境按同名功能目录关联；共享 Action 注册、全局 UI 和宿主装配未复制进功能目录。

## 实际注册操作

| 操作 | 用途 | 必填参数 | 可撤销标记 |
| --- | --- | --- | --- |
| `context.assets` | 资产清单：每个实体已批准 / 待批准的参考 | — | 否 |
| `context.capabilities` | 列出全部 Action 及参数、状态机许可（Agent 工具清单） | — | 否 |
| `context.entity` | 实体详情 | id | 否 |
| `context.events` | 最近事件 | — | 否 |
| `context.history` | 撤销栈信息 | — | 否 |
| `context.map` | 俯视平面图：谁站在哪、机位怎么走、此刻拍到哪一片。as: json（矢量图层）/ svg / ascii / raster（[C,H,W] 栅格，给策略网络用） | — | 否 |
| `context.pads` | 台面分块清单：每块台上有谁、几个人、几个镜头、定妆了几个 | — | 否 |
| `context.project` | 完整工程 JSON | — | 否 |
| `context.scene` | 当前场景摘要（Agent 记忆入口） | — | 否 |
| `context.schema` | 词汇表：语义类型、姿态、运镜、景别、灯光预设、供应商 | — | 否 |
| `context.sequence` | 镜头序列时间布局 | — | 否 |
| `context.shot` | 镜头详情：参数、起止机位状态、提示词 | — | 否 |
| `context.trajectory` | 这一镜机位实际走出来的轨迹：逐帧位置/朝向/焦段、运动学（路程、速度、加加速度）、按轨迹判出来的运镜类型（和镜头声明的对不对得上），以及主体在画面里的位置、占幅、有没有被挡 | — | 否 |
| `health.report` | 运行健康：fps、draw calls、命令延迟、录像器、桥接 | — | 否 |

操作清单来自迁移时的 `core/index.js` capabilities；执行仍须经过状态机、预算、配置与权限校验。这里只展示注册声明，不替代服务端前置条件。
