# 桌面宿主、设置与更新：实现清单

[功能说明](README.md)

## 源码入口

- [tools/fetch-cloudflared.mjs](../../../tools/fetch-cloudflared.mjs)

- [desktop/main.mjs](../../../desktop/main.mjs)
- [desktop/preload.cjs](../../../desktop/preload.cjs)
- [desktop/update.mjs](../../../desktop/update.mjs)
- [web/js/desktop.js](../../../web/js/desktop.js)

跨运行环境按同名功能目录关联；共享 Action 注册、全局 UI 和宿主装配未复制进功能目录。

## 实际注册操作

此功能通过界面/宿主或内容文件提供，没有独立 Action 前缀；不会为整理目录虚构新的操作。
