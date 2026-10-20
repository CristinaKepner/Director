# 时间线、字幕、声音与成片导出

[返回功能索引](../README.md) · [实现与操作清单](implementation.md)

## 已有能力

镜头裁切/速度/排序，字幕、原声静音/音量，独立旁白/音乐/音效片段，FFmpeg 导出。

## 用户流程

选择采用版本 → 调整剪辑 → 添加字幕与声音 → 预览 → 检查素材齐全 → 合成导出。

## 业务规则

音频片段使用绝对时间跨切点；缺失媒体明确失败，不悄悄缩短成片。字幕文本按文字处理，不能变成 ASS 指令。

## 数据归属

project.audioClips/cutMusic、shot cut 字段、采用版本和输出任务。

## 依赖与边界

FFmpeg 是外部依赖；已知背景混音测试在当前环境可能阻塞，需与结构迁移分开报告。

## 验证

- [tests/cut.test.mjs](../../../tests/cut.test.mjs)
- [server/tests/film-edit.test.mjs](../../../server/tests/film-edit.test.mjs)
- [tests/stage-workspace.test.mjs](../../../tests/stage-workspace.test.mjs)

以上是关联测试入口，不代表本轮均已通过；本轮实际结果见 [迁移与验证记录](../migration.md)。

## 相关原文

- [docs/creative-journey.md](../../creative-journey.md)
- [docs/technical-reference.md](../../technical-reference.md)
