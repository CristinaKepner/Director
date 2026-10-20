# 工程管理与保存：实现清单

[功能说明](README.md)

## 源码入口

- [core/features/projects/demo.js](../../../core/features/projects/demo.js)
- [core/store.js](../../../core/store.js)

跨运行环境按同名功能目录关联；共享 Action 注册、全局 UI 和宿主装配未复制进功能目录。

## 实际注册操作

| 操作 | 用途 | 必填参数 | 可撤销标记 |
| --- | --- | --- | --- |
| `project.export` | 导出工程 JSON（Source of Truth） | — | 否 |
| `project.load` | 载入工程 JSON | data | 否 |
| `project.mark-saved` | 标记已自动保存 | — | 否 |
| `project.new` | 新建空工程（清空场景、镜头、Take、故事版） | — | 是 |
| `project.redo` | 重做 | — | 否 |
| `project.rename` | 重命名工程 | name | 是 |
| `project.select` | 在导演台中选中/定位对象 | — | 否 |
| `project.set-aspect` | 设置画幅 | aspect | 是 |
| `project.set-build-mode` | 构建模式：set 布景 / blocking 调度 | mode | 否 |
| `project.set-fidelity` | 切换保真度：blockout 白模语义 / stylized 形态可读。只改投影，不改语义数据 | fidelity | 是 |
| `project.set-fps` | 设置帧率 | fps | 是 |
| `project.set-gizmo` | Gizmo 模式 | mode | 否 |
| `project.set-shading` | 视口着色 shaded/clay/wire | mode | 否 |
| `project.set-state` | 切换导演状态机 EDIT/BLOCKING/REHEARSAL/ARMED/RECORDING/REVIEW/GENERATING/APPROVED | state | 是 |
| `project.set-style` | 设置生成风格描述（进入提示词） | — | 是 |
| `project.set-view` | 视口：free 自由观察 / program 拍摄机 / compare 白模与生成左右对照 | mode | 否 |
| `project.undo` | 撤销上一步 | — | 否 |
| `project.undo-to` | 撤销到某个事件之前 | eventId | 否 |

操作清单来自迁移时的 `core/index.js` capabilities；执行仍须经过状态机、预算、配置与权限校验。这里只展示注册声明，不替代服务端前置条件。
