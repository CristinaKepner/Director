# 端到端测试记录：60 s 高端时尚品牌 TVC（2026-09-10）

一次完整走通「AI 分镜 → 白模 3D 预演 → 逐镜 Take → 故事版 → 真实生成 → 对话反馈再生成」的记录。全部通过 Director Console 的后端 API 与页面完成，工程保存在后端 `server/data/project.json`（工程名 `Maison — 60s TVC`）。

## 1. Brief → 分镜（LLM Agent）

- 入口：`POST /api/agent`，lead 模式，规划后端 `gpt-5.6-sol`（AIGW 网关）。
- 输入：为高端时尚品牌制作一条 60 秒 TVC 品牌短片，参考 Apple 的极简产品质感和 CHANEL 的经典优雅调性，要有故事创意和产品展示，适合信息流广告投放，画幅 16:9，给出分镜表。
- 结果：一次规划 23 个 Action 全部成功（场景 + 风格 + 灯光预设 + 画幅、5 个语义实体、4 个机位、9 个镜头，合计 60 s），并返回 Markdown 分镜表。耗时 79 s，9.5k tokens。
- 记录：[`storyboard-llm.md`](storyboard-llm.md)（分镜表 + Agent 备注 + 全部 Action 与参数）。

## 2. 白模 3D 预演（页面）

- 顺播全部 9 镜（`timeline.play {sequence:true}`，Program 视角），沿途截图：`preview-01.png` … `preview-06.png`。
- 镜头条：`shots.png`。

## 3. 逐镜 Take（页面录制 → 后端存储）

- 9 个镜头各录一条 Take：页面用 MediaRecorder 录 Program 画面，上传到后端 `/media/take_*.webm`，全部 Circle。`takes.png`。
- 抓帧数 67–98 帧/条（无头 Chromium + SwiftShader，真机会更接近 24 fps × 时长）。

## 4. 故事版

- 每镜抓 Program 关键帧 → `storyboard.add`，9 张卡片：`storyboard.png`。
- 导出：[`storyboard-export.md`](storyboard-export.md)、[`storyboard-export.html`](storyboard-export.html)。

## 5. 真实生成（火山 Ark）

| 镜头 | 模式 | 模型 | 结果 |
|---|---|---|---|
| 01 光中初见 | t2i | Seedream 5.0（2560×1440） | `gen-shot01-seedream5.jpg` |
| 04 选择时刻 | i2v（首帧 = 故事版关键帧） | Seedance 2.5，7 s 720p | `gen-shot04-seedance25-i2v-frame.jpg`（视频在后端 `/media/job_7pivz955.mp4`） |
| 09 Maison 永恒定格 | t2v | Seedance 2.5，8 s 720p | `gen-shot09-seedance25-t2v-frame.jpg`（`/media/job_7pke5nso.mp4`） |
| 06 与她同行 | v2v（参考 = 圈选 Take 白模视频） | Seedance 2.5 | **失败 `NO_PUBLIC_MEDIA_URL`**：Ark 的 reference_video 只接受公网 URL，不接受 data URL；本机不对外，且把 Take 视频传到第三方公网托管被拒绝。解决：后端启动带 `--public-url https://<可被 Ark 访问的地址>`，或提供一个你认可的公网媒体托管 |

生成完成后，后端把结果贴进 Agent 对话（带媒体），故事版卡片与「生成」表也直接显示，点开在画面上预览。

## 6. 对话反馈 → 再生成

- 输入：「看了 04 镜的生成结果：主角的外套换成正红色，站位往光线方向再走 0.8m，产品保持在手上；改完重新编译提示词，用 seedance-2.5 的 i2v 再生成一次 04 镜。」
- Agent（gpt-5.6-sol，13.7 s）规划 6 步全部成功：`entity.update`（continuity.look = 正红色外套）→ `entity.transform`（主角 -0.57, 0, 1.57）→ `entity.transform`（手袋随手）→ `entity.update`（手袋 continuity）→ `generation.prompt` → `generation.submit`（i2v · seedance-2.5）。
- 结果：`/media/job_fe9eqj9e.mp4`，抓帧 `gen-shot04-iteration-redcoat-frame.jpg`。

## 复现

```bash
npm run dev -- --ark-key-file ~/.ark-key --llm-key-file ~/.aigw-key
curl -X POST :5175/api/agent -d '{"text":"<brief>","mode":"lead","force":true}'
node tools/tvc-run.mjs           # 顺播 → 逐镜 Take → 故事版 → 导出（需 ../director-stage 的 playwright）
curl -X POST :5175/api/actions -d '{"action":"generation.submit","payload":{"shotId":"shot_01","mode":"t2i","provider":"seedream-5"}}'
```
