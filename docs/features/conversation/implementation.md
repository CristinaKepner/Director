# 当前对话与历史版本：实现清单

[功能说明](README.md)

## 源码入口

- [core/features/conversation/conversation-archive.js](../../../core/features/conversation/conversation-archive.js)
- [core/features/conversation/conversation-export.js](../../../core/features/conversation/conversation-export.js)
- [web/js/features/conversation/thread.js](../../../web/js/features/conversation/thread.js)
- [web/js/features/conversation/conversation-archive.js](../../../web/js/features/conversation/conversation-archive.js)
- [web/js/features/conversation/conversation-picker.js](../../../web/js/features/conversation/conversation-picker.js)
- [web/js/features/conversation/conversation-bubbles.js](../../../web/js/features/conversation/conversation-bubbles.js)

跨运行环境按同名功能目录关联；共享 Action 注册、全局 UI 和宿主装配未复制进功能目录。

## 实际注册操作

此功能通过界面/宿主或内容文件提供，没有独立 Action 前缀；不会为整理目录虚构新的操作。
