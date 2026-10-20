# 空工程引导与创作主页面：实现清单

[功能说明](README.md)

## 源码入口

- [core/features/creation/creation.js](../../../core/features/creation/creation.js)
- [core/features/creation/creation-actions.js](../../../core/features/creation/creation-actions.js)
- [web/js/features/creation/creation-workspace.js](../../../web/js/features/creation/creation-workspace.js)
- [web/js/features/creation/creation-start.js](../../../web/js/features/creation/creation-start.js)
- [web/js/features/creation/creation-dialog.js](../../../web/js/features/creation/creation-dialog.js)
- [web/js/features/creation/creation-markup.js](../../../web/js/features/creation/creation-markup.js)
- [web/js/features/creation/creation-overview.js](../../../web/js/features/creation/creation-overview.js)
- [web/js/features/creation/creation-upload.js](../../../web/js/features/creation/creation-upload.js)
- [web/js/features/creation/creation-commands.js](../../../web/js/features/creation/creation-commands.js)

跨运行环境按同名功能目录关联；共享 Action 注册、全局 UI 和宿主装配未复制进功能目录。

## 实际注册操作

| 操作 | 用途 | 必填参数 | 可撤销标记 |
| --- | --- | --- | --- |
| `creation.context` | 读取当前创作内容，不包含历史对话 | — | 否 |
| `creation.media` | 把工程素材加入节点 | — | 是 |
| `creation.start` | 记录起步方式与创作目标 | — | 是 |

操作清单来自迁移时的 `core/index.js` capabilities；执行仍须经过状态机、预算、配置与权限校验。这里只展示注册声明，不替代服务端前置条件。
