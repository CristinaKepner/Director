# 模板推荐：实现与操作清单

[功能说明](README.md)

## 源码入口

- [core/features/template-recommendations/actions.js](../../../core/features/template-recommendations/actions.js)
- [core/features/template-recommendations/seedance.js](../../../core/features/template-recommendations/seedance.js)
- [core/features/template-recommendations/seedance-library.js](../../../core/features/template-recommendations/seedance-library.js)
- [web/js/features/template-recommendations/panel.js](../../../web/js/features/template-recommendations/panel.js)

## 操作

| 操作 | 用途 | 必填参数 | 可撤销标记 |
| --- | --- | --- | --- |
| `context.templates` | Seedance 提示词模板清单：25 个模板分 6 类，每个说清什么时候用它。来自 awesome-seedance（MIT） | — | 否 |
| `prompt.template` | 指定这一镜（或整条工程）用哪个 Seedance 提示词模板；clear=true 改回自动挑。不带参数就只回报当前用的是哪个 | — | 是 |

## 装配与边界

`core/actions.js` 显式注册功能操作，保持公共 dispatch、撤销和状态校验。`web/js/ui.js` 组合面板并提供通知、预览、定位等共享 UI 服务；面板经 client dispatch 调用同一操作层。工程状态继续由共享 store 持有。全局布局、主题和通用样式仍在 `web/css/app.css`。

## 测试

- [tests/seedance.test.mjs](../../../tests/seedance.test.mjs)

[迁移与验证记录](../migration.md)
