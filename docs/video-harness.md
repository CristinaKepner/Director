# 视频 Agent Harness · 0.9.15

Harness 让导演台的 Agent 有可保存的任务、可执行的工具、检查证据、修复循环和停止条件。使用当前工程的镜头、采用版与时间线，不创建另一套编辑页面。

## 操作

在时间线点「验收要求与预算」设定全片时长、片头时长、群像人数和动作要求。空白表示不限定。巴黎示例可设 120 秒、3 秒、5 人。

1. 「检查当前片段」或「检查全片」生成报告，原剪辑不变。
2. 点时间线上的问号 / 感叹号或报告条目，跳到对应时刻，看证据帧与说明。
3. 字幕范围问题可「应用剪辑修复」，支持撤销。画面问题点「生成修复候选」，使用当前镜头在「AI 改画面」中选择的模型，未选择时沿用采用版模型。
4. 每个候选生成后复查；明确未达标时在本次预算内再试。最后「对比原版与候选」，由用户「采用候选」。其他镜头保留。
5. 「暂停 / 继续 / 停止」控制后续步骤。「导出记录」保存本次 JSON，包括预算、事件、证据路径、版本与判定。

也可在右侧 Agent 里说「检查这一镜」「按最新报告修复这一镜」「暂停检查」。检查为异步任务，以时间线的运行记录为准。

## 覆盖与边界

- 本地检查：全片与片头时长、剪辑入出点、字幕范围、采用版媒体文件、解码、源片长度、连续黑场、原声音轨与电平。黑场可能是创作意图，记为待确认。
- 视觉检查：每镜抽取 6–12 帧，带片段时间戳；检查动作、群像人数、场景。有可用定妆参考时检查人物；有上一镜尾帧时检查接镜；修复候选附带原版对照帧检查保持项。
- 画面结论只覆盖采样时刻，不保证帧间无缺陷。未配置视觉模型、证据不足、参考不可读、返回格式无效、预算用完都记为 `unclear`，不记为通过。
- 声音目前检查音轨和电平，不校验对白语义、口型同步或音乐节拍。缺少定妆参考时不宣称跨镜身份一致。
- 自动画面修复复用 Seedance / MiniMax 等已连接的视频适配器，生成单镜候选，不保证一次修好。长度按原始镜头生成，以保留现有素材入出点；候选不会自动替换采用版。

## 预算和恢复

每次运行保存冻结的要求和预算：最多 1–3 个候选、0–180 秒视频生成、0–100 次视觉检查。默认 2 个候选、30 秒、16 次视觉检查。生成秒数是保守预留额度，不是人民币金额；实际费用按服务商结算。失败或中断也不退回已预留额度，避免超支。视觉检查不生成新视频。

状态：`queued → running → completed / needs_review / failed / stale`；运行中可 `paused → queued` 继续，或 `cancelled` 停止。每次检查、生成预约、远端任务号和结果都保存检查点。重启把未结束运行暂停；恢复已有远端任务只做 GET 查询。提交结果未知、没有远端任务号时不自动重提。暂停或停止不保证服务商取消已经提交的任务，候选仍可能完成并计费。

报告关联工程内容签名。镜头、剪辑、字幕、已批准参考、场景、要求或采用版发生变化，旧运行不能修复或采用，必须重新检查。撤销剪辑保留运行记录和 harness 生成任务，避免丢失已付费候选。

## Action/API

沿用 `POST /api/action` 和 CLI 的统一 Action 注册表，所有 UI 编辑与 Agent 操作使用同一入口：

| Action | 参数 | 用途 |
|---|---|---|
| `harness.configure` | `targetSeconds, introSeconds, people, brief, visual, maxAttempts, maxVideoSeconds, maxChecks` | 保存要求与预算 |
| `harness.check` | `shotId` 可省略 | 当前镜头或全片检查 |
| `harness.status` | `runId` 可省略 | 查询运行与报告 |
| `harness.repair` | `runId, issueId` | 按有效报告启动局部修复 |
| `harness.pause / resume / cancel` | `runId` | 暂停、恢复、停止 |
| `harness.adopt` | `runId` | 明确采用已复查候选，可撤销 |
| `generation.resume-query` | `id` | 查询已有远端任务，不创建新任务 |

后台模块：`core/features/quality/harness.js`（要求、签名、本地判定），`core/features/quality/harness-actions.js`（操作），`server/src/features/quality/harness.mjs`（执行与恢复），`server/src/features/quality/harness-inspector.mjs`（FFmpeg/视觉检查）。界面在 `web/js/features/quality/harness-panel.js`，复用已有播放台与时间线。工程 JSON 的 `harness.runs` 保存完整记录；`project.harnessSpec` 保存要求。

启动后台时配置已有视频模型与 `--llm-key-file`、`--llm-base`、可选 `--judge-model`。桌面版沿用启动时配置的 GPT / Claude / Gemini 视觉模型与内置 FFmpeg（当前默认 gpt-6-astra），`--judge-model` 可单独指定；文本专用规划模型不用于看图。参照读取保留原有模型配置。

## 回归验证

`npm run test:harness` 覆盖预算、候选循环、局部修复、撤销、报告过期、暂停/恢复/停止、提交不确定状态、重启查询、FFmpeg 证据和视觉模型返回校验；`npm run test:all` 同时覆盖原有编辑、生成与导出。生成循环使用适配器夹具，不需要付费生成整片。真实视觉调用另用隔离预览工程检验。
