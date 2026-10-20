# 分镜、运镜、故事版与 Take：实现清单

[功能说明](README.md)

## 源码入口

- [core/features/shots/motion.js](../../../core/features/shots/motion.js)
- [core/actions.js](../../../core/actions.js)

跨运行环境按同名功能目录关联；共享 Action 注册、全局 UI 和宿主装配未复制进功能目录。

## 实际注册操作

| 操作 | 用途 | 必填参数 | 可撤销标记 |
| --- | --- | --- | --- |
| `motion.clear-keyframes` | 清除镜头关键帧 | — | 是 |
| `motion.delete-keyframe` | 删除某帧关键帧 | frame | 是 |
| `motion.keyframe` | 在镜头上加机位关键帧。缺省 position/lookAt/focalLength 时取当前机位状态 | — | 是 |
| `motion.set` | 设置镜头运镜类型与参数：static/dolly-in/dolly-out/truck/pedestal/pan/orbit/chase/crane/handheld/dolly-zoom/push-in/drone | — | 是 |
| `shot.beats` | 把一个长镜头拆成若干拍，每拍一句话说清这段发生什么。shot.chain 会按拍分段，每段用自己的描述去生成 | — | 是 |
| `shot.chain` | 长镜头分段续拍：切成若干段，逐段用上一段尾帧续拍，最后拼成一条。resume 从上次断掉的地方继续 | — | 否 |
| `shot.choose-version` | 明确采用一个已完成的视频版本；其他候选保留，可撤销 | shotId, jobId | 是 |
| `shot.coverage` | 把一条已经拍好的素材从多个新机位再拍一遍：按时长切段，每段一个机位（最多 13 个）。clear=true 取消 | — | 是 |
| `shot.create` | 创建镜头：绑定 cameraId（默认 Program）、duration 秒、motion 运镜（static/dolly-in/dolly-out/truck/pedestal/pan/orbit/chase/crane/handheld/dolly-zoom/push-in/drone）、targetIds | — | 是 |
| `shot.cut-duplicate` | 紧接当前片段复制一份可独立剪辑的采用版 | shotId | 是 |
| `shot.cut-split` | 在剪辑片段内 seconds 处分割，保留源素材连续性和字幕时段 | shotId | 是 |
| `shot.cut-update` | 保存剪辑：源素材入出点、变速、字幕时段/样式、原声音量或 AI 修改草稿；不发起生成，保留拍摄预演数据 | shotId | 是 |
| `shot.delete` | 删除镜头及其 Take / 故事版卡 / 生成任务 | id | 是 |
| `shot.duplicate` | 复制镜头 | id | 是 |
| `shot.lock` | 锁定这一镜已经满意的部分，重新生成时必须保持不变。aspects: identity/wardrobe/performance/framing/lighting/palette/background/foreground/lens/continuity | aspects | 是 |
| `shot.preview` | 预演：播放当前/指定镜头（loop 可循环） | — | 否 |
| `shot.reframe` | 按主体给这一镜重新摆机位。机位若被其他镜头共用，会先克隆一个专属机位，不影响别的镜头 | shotId, target | 是 |
| `shot.reorder` | 调整镜头顺序并重新编号 | id, position | 是 |
| `shot.restore-motion` | 从指定 Take 精确恢复这一镜的相机姿态、焦段、运镜和全部关键帧（覆盖旧轨迹）；不修改人物、灯光或其他镜头，可撤销。duration 可指定恢复后的秒数。之后 take.record 才会录制新视频。 | id, takeId | 是 |
| `shot.select` | 打开镜头：设为当前镜头，Program 切到它的机位，播放头回到入点 | id | 否 |
| `shot.split` | 在某一帧把镜头切成两个：前半段保留原 id，后半段是新镜头，紧跟其后。frame 省略则用播放头 | — | 是 |
| `shot.unlock` | 解锁：不传 aspects 就全解 | — | 是 |
| `shot.update` | 更新镜头：title/description/dialogue/duration/cameraId/targetIds/status/lightingState | id | 是 |
| `storyboard.add` | 把镜头（及选中的 Take、关键帧图）加入故事版；已存在则更新 | shotId | 是 |
| `storyboard.export` | 导出故事版 json/html/md | — | 否 |
| `storyboard.update` | 更新故事版卡：actionDescription/dialogue/note(追加)/status | id | 是 |
| `take.arm` | Preflight → ARMED：检查镜头/机位/目标，进入待录状态 | — | 否 |
| `take.delete` | 删除 Take | id | 是 |
| `take.finish` | 结束录制并写入代理视频/缩略图（由录像器调用） | id | 否 |
| `take.record` | Roll：录制当前/指定镜头的 Take（快照相机/镜头/灯光/物体；浏览器内还会录代理视频） | — | 是 |
| `take.review` | 评审 Take：circle 圈选 / reject 弃用 | id, status | 是 |
| `take.stop` | 停止录制 | — | 否 |

操作清单来自迁移时的 `core/index.js` capabilities；执行仍须经过状态机、预算、配置与权限校验。这里只展示注册声明，不替代服务端前置条件。
