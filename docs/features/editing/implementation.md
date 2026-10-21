# 时间线、字幕、声音与成片导出：实现清单

[功能说明](README.md)

## 源码入口

- [server/src/features/editing/reference-video.mjs](../../../server/src/features/editing/reference-video.mjs)

- [core/features/editing/cut.js](../../../core/features/editing/cut.js)
- [web/js/features/editing/film.js](../../../web/js/features/editing/film.js)
- [web/js/features/editing/audio-cues.js](../../../web/js/features/editing/audio-cues.js)
- [web/js/features/editing/timeline-editor.js](../../../web/js/features/editing/timeline-editor.js)
- [server/src/features/editing/film.mjs](../../../server/src/features/editing/film.mjs)

跨运行环境按同名功能目录关联；共享 Action 注册、全局 UI 和宿主装配未复制进功能目录。

## 实际注册操作

| 操作 | 用途 | 必填参数 | 可撤销标记 |
| --- | --- | --- | --- |
| `audio.cue-delete` | 移除声音片段，保留原素材，可撤销 | — | 是 |
| `audio.cue-update` | 增加或修改独立的旁白/配乐/音效片段，时间基于全片，可跨镜头 | — | 是 |
| `film.check` | 建场自检：逐镜算一遍画面里有没有东西、机位对没对准、镜头能不能生成。纯本地计算，不花钱。每条问题都带一个可以直接执行的修法 | — | 否 |
| `film.export` | 导出成片：按镜头顺序把每镜的素材拼成一条片子（需要后端的 ffmpeg 组装器） | — | 否 |
| `film.plan` | 成片清单：逐镜列出用哪段素材（generated 生成视频 / blockout 白模 Take）、缺哪几镜 | — | 否 |
| `film.set-music` | 设置整片配乐素材和混音音量，不调用生成模型 | — | 是 |
| `film.status` | 成片拼接任务状态 | — | 否 |
| `timeline.pause` | 暂停 | — | 否 |
| `timeline.play` | 播放。sequence=true 顺播全部镜头 | — | 否 |
| `timeline.seek` | 移动播放头（帧） | frame | 否 |
| `timeline.set-range` | 设置镜头入出点（帧） | — | 是 |
| `timeline.stop` | 停止并回到入点 | — | 否 |

操作清单来自迁移时的 `core/index.js` capabilities；执行仍须经过状态机、预算、配置与权限校验。这里只展示注册声明，不替代服务端前置条件。
