# 角色库：实现与操作清单

[功能说明](README.md)

## 源码入口

- [core/features/character-library/actions.js](../../../core/features/character-library/actions.js)
- [core/features/character-library/references.js](../../../core/features/character-library/references.js)
- [web/js/features/character-library/panel.js](../../../web/js/features/character-library/panel.js)

## 操作

| 操作 | 用途 | 必填参数 | 可撤销标记 |
| --- | --- | --- | --- |
| `context.character` | 角色卡：一个角色（或产品）的身份字段、按用途分组的参考资产、以及它出现在哪些镜头 | — | 否 |
| `generation.reference` | 为实体生成参考图（角色定妆照 / 产品图，中性背景、正面全身或整件产品），完成后自动登记为该实体的未批准资产。provider 默认 seedream-5 | entityId | 否 |

## 装配与边界

`core/actions.js` 显式注册功能操作，保持公共 dispatch、撤销和状态校验。`web/js/ui.js` 组合面板并提供通知、预览、定位等共享 UI 服务；面板经 client dispatch 调用同一操作层。工程状态继续由共享 store 持有。全局布局、主题和通用样式仍在 `web/css/app.css`。

## 测试

- [tests/runtime.test.mjs](../../../tests/runtime.test.mjs)

[迁移与验证记录](../migration.md)
