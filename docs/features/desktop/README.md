# 桌面宿主、设置与更新

[返回功能索引](../README.md) · [实现与操作清单](implementation.md)

## 已有能力

Electron 启动后端、原生菜单/文件对话框、偏好设置、客户端更新和 DMG 分发。

## 用户流程

启动应用 → 宿主分配端口/启动后端 → 加载主页面 → 设置保存重连 → 构建并分发版本。

## 业务规则

密钥与本机偏好不入 Git；启动/退出归宿主管理。打包复制 core/web/server 递归目录，保留功能层级。

## 数据归属

desktop 配置、应用 userData 与用户工程目录；preload 暴露受限桥。

## 依赖与边界

未签名包不等于已公证发布；更新下载不静默替换应用。本次不改安装的应用或用户工程。

## 验证

- [tests/shell.test.mjs](../../../tests/shell.test.mjs)

以上是关联测试入口，不代表本轮均已通过；本轮实际结果见 [迁移与验证记录](../migration.md)。

## 相关原文

- [docs/distribution.md](../../distribution.md)

## 0.9.20 修复与验证边界

[v2v 媒体准备、隧道依赖与发布说明](../../releases/0.9.20.md)。
