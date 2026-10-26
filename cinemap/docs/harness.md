# Cinemap harness · 人、CLI 和助手操作同一个世界

复刻版把 Director 的 harness 思路搬到了 Cinemap 的白模世界：**只留一个入口**（Action Registry），
每次调用都有契约、可校验、可观测、可撤销；助手不是特权用户，它提出计划，计划的每一步照样走这个入口。

## 分层

```
Shell     editor.html（Three.js 白模工坊） · agent.html（助手面板） · bin/cinemap.mjs（CLI） · curl
             ↓ 只发 Action，只持有视图状态（选中、镜头、面板开合）
Host      harness/host.mjs     每个项目一个 runtime · 助手循环（规划 → 确认 → 执行）· SSE 推完整快照 · 落盘
Runtime   harness/world.mjs    世界的 Source of Truth · 20 个 Action · 状态机（EDIT / PLANNING）
          harness/registry.mjs dispatch 流水线：状态许可 → 幂等键 → 必填 → validate → dry-run → 快照入撤销栈 → handler → 事件
Planners  harness/planner.mjs  rules（内置，永不失败） · llm（OpenAI 兼容网关，流式思考，参数协商，PLANNABLE 白名单）
Shared    shared/worldgen.js · shared/spots.js   服务端与页面共用：起点底图生成、找空位
```

四条边界与 Director 一致：Shell 只能发 Action；Runtime 不 import DOM；能力通过注入（planner、assets）；Host 推完整快照不推增量。

## Action 清单

| 组 | Action | 说明 |
|---|---|---|
| world | `place` `remove` `move` `rotate` `scale` `clear` | 构件：`kind` 是内置 13 种或 `asset:<id>`；`place` 不给坐标时按 `near` 找空位；`clear kind=all` 要确认 |
| world | `time` `weather` `backdrop` `size` | 世界设置（时钟 5–23、七种天气、远景色板、地台 512/1024/2048） |
| project | `undo` `redo` `undo-to {eventId}` | 快照式撤销（80 步）；`undo-to` 把助手刚才那一串全撤了 |
| context | `world` `items` `events` `assets` | 只读；助手回答「场景里有什么」靠它们 |
| agent | `run` `confirm {skip}` `cancel` `run-step` `plan` `set-mode` `set-backend` `say` | 助手循环 |

`GET /api/capabilities` 从注册表自动生成（CLI、助手工具清单、文档都从这一份来）。

## 事件与撤销

每个 Action 产出一条事件 `{id, at, action, source, actorId, label, payload, targetIds, before, after, ok, ms}`：
`source` 是 human / agent / cli，`actorId` 是人名或助手角色（scene-builder / director-planner）。
`before` / `after` 是受影响构件的快照，助手面板的工具卡片直接拿它们对 diff（「x 12.0 → 5.0」），
卡片上的「撤到这里」调 `project.undo-to`。

撤销是快照式：`pushHistory` 存整份可持久化世界，任何 handler 都不用写逆操作。助手的一次执行包在
`batch` 里，撤销一步就是撤销整次执行。

## 助手循环

```
POST /api/projects/:id/agent {text, mode?, backend?, force?}
  → 规划：llm（有 key 且 backend ≠ rules）/ rules
      流式：SSE 侧信道帧 {seq, thinking:{model, phase, reasoning, steps, chars}}，面板实时滚动
      失败：回退 rules，面板说明原因
  → 只读计划（全是 context.*）：当场执行，答案写进 reply
  → 反问（ask 非空）：先摆问题，等用户选
  → 执行：lead 直接做 · collaborative 待确认（每步一个勾选框，agent.confirm {skip:[i]} 只做勾上的）· manual 逐条 agent.run-step
      needsConfirm（批量删除 / 一次放超过 12 个）在任何模式下都要确认，除非 force
```

每一步执行后留一张工具卡片（role=tool 的消息：action、payload、ok / error、before / after、eventId）；
思考过程存成 role=thinking 的消息，默认折叠。suggest 来自规划器对当前世界的判断，显示为可点的 chips。

## 模型接入

```bash
CINEMAP_LLM_KEY=… npm run cinemap            # 或 AIGW_API_KEY / LLM_API_KEY / --llm-key-file FILE
LLM_BASE_URL=https://gw.example.com/v1       # OpenAI 兼容；默认和 Director 同一家网关
LLM_MODEL=gpt-5.6-sol                        # 面板「规划后端」下拉列出 /api/health 的 llm.models
```

没有 key 时一切照常，只是规划器是内置规则（认构件 / 数量 / 位置 / 时间 / 天气 / 素材名）。网关参数拼法不一致
（`max_completion_tokens`、固定 temperature、无 `json_object`、不支持流式）在第一次 400 时就地协商并记住。

## 接口

| 路径 | 作用 |
|---|---|
| `GET /api/capabilities[?project=]` · `GET /api/capabilities/:name` | 能力清单 |
| `POST /api/projects/:id/actions {action, payload, meta}` | 唯一写入口；`meta.dryRun` 只校验不执行 |
| `POST /api/projects/:id/agent {text, mode, backend, force}` | 助手 |
| `GET /api/projects/:id/events` | SSE：`{seq, snapshot}` 和 `{seq, thinking}` |
| `GET /api/projects/:id/context` | 当前快照（世界 + 会话 + 事件 + 撤销栈） |
| `GET /api/health` | 规划后端、已打开的项目数、素材数 |

CLI（走本地 mock 登录，不碰真实账号）：

```bash
node cinemap/bin/cinemap.mjs capabilities
node cinemap/bin/cinemap.mjs invoke <projectId> world.place '{"kind":"tree","count":3,"near":"water"}'
node cinemap/bin/cinemap.mjs agent <projectId> "在路边放两盏路灯，黄昏" --mode collaborative
node cinemap/bin/cinemap.mjs context <projectId>
```

## 桌面客户端

`cinemap/desktop/` 用 Electron 把同一套服务端、harness 和 web 客户端包成 Cinemap.app（无签名 DMG，arm64 + x64）。

- 应用自己启动后端：`server.mjs --port <空闲端口> --data <数据目录>`，用 Electron 自带的 Node 跑（`ELECTRON_RUN_AS_NODE`），
  源码整体放在 `Contents/Resources/app-src/cinemap`（含 `vendor/three`，不含 `data/`、`tests/`）。
- 登录：后端收到一次性口令（`CINEMAP_DESKTOP_TOKEN` 环境变量，不进命令行），窗口打开
  `/desktop/session?token=…&next=/`，只接受回环地址，写入本机用户 `u_desktop` 的会话后跳转。桌面版不经过 TapNow。
- 密钥：`~/Library/Application Support/Cinemap/keys/{mosshub,ark,aigw}.key`（0600），
  `⌘,` 偏好设置里填写/清除，并可改 MossHub 地址、默认规划模型和数据目录；保存即重启后端。
  开发者家目录里的 `~/.mosshub-key` / `~/.ark-key` 作为兜底也会被读取。
- 数据：`…/Cinemap/data/`（projects.json、media/、assets/）；`backend.log` 是后端的 stdout/stderr。
- 菜单：项目（首页 ⌘1、新建 ⌘N、全部项目 ⌘O、模板库、素材库、新手教程）走 `/#…` 深链接；
  帮助里能打开本文档、数据目录、后端日志，或在浏览器里打开同一后端。
- 构建：`cd cinemap/desktop && npm ci && npm run icon && npm run dist`；`npm start` 直接跑未打包版本。

## 素材：NVIDIA SimReady

`huggingface.co/datasets/nvidia/simready-assets`：2,575 个 USD 资产，每个资产目录自带 CC-BY-4.0 许可，
整库 472 GB（大头是 4K 贴图）。复刻版只取几何：

```bash
node cinemap/tools/simready.mjs catalog bench          # 查目录（HF tree，本地缓存）
node cinemap/tools/simready.mjs import bin_waste_a01   # 根 USD + payloads（跳过 Textures）≈ 2–5 MB → data/assets/<id>/model.glb
```

转换用 `tools/usd2glb.py`（`usd-core`，首次自动在 `data/usdenv` 建 venv）：遍历 instance proxy 下的 Mesh，
应用 xform，Z-up 转 Y-up，按 metersPerUnit 换算，平面法线，写二进制 glTF。编辑器用 GLTFLoader 读入、
统一白模材质；`kind=asset:<id>` 对助手和 CLI 同样可用（`context.assets` 列出）。首页「素材」页可以搜目录并一键导入。
SimReady 没有场景模板，只有单体资产和物理变体（PhysX / MuJoCo / Newton），所以模板那半无从复刻。

## 出片：生成模型

`generation.submit {provider, prompt, mode?, seconds?, aspect?, frame?}` 是付费的慢操作：立刻返回 job id，
适配器异步推进，进度写回 `jobs[]`，每次变化推一帧快照；`generation.cancel {id}` 取消；`context.generation`
列出可用模型和最近任务。编辑器「出片」面板把当前画面抓成 JPEG 一起提交（i2i / i2v），助手规划出片时也会带上
当前画面（`POST …/agent` 的 `frame`）。生成是 needsConfirm 的步骤，任何模式都先确认。

| provider | 上游 | 种类 |
|---|---|---|
| `seedream-5` | 火山 Ark `doubao-seedream-5-0-260128` | 图（2560×1440，i2i 带当前画面） |
| `seedance-2.5` / `seedance-2` | 火山 Ark `doubao-seedance-2-5-260628` / `2-0` | 视频 4–30 s / 4–12 s，720p，i2v 首帧 |
| `mosshub-seedance-2.5` | MossHub `/v1/videos`（文档格式：model / prompt / duration / resolution / ratio；首帧走原生 `content[]` + `ratio: adaptive`） | 视频 4–30 s，720p |
| `mosshub-seedream-pro` | MossHub `/v1/images/generations` `doubao-seedream-5-0-pro-260628` | 图（2K，i2i 内联参考图） |
| `gpt-image-2.5` | MossHub `/v1/images/edits`（multipart，带当前画面）/ `generations` | 图（1536×1024） |
| `moss-image` | MossHub `/v1/images/generations` | 图（只认文字，画面会被忽略） |
| `minimax-h3` / `minimax-h3-max` | MossHub hailuo | 视频 4–15 s，768P（当前 key 未授权） |

MossHub 的 provider 表由启动时 `/v1/models` 的 `protocols` 决定：`chat_completions` 进规划器（当前 key：
claude-fable-5-1、claude-opus-5-5、deepseek-v4.1-flash-1017、gpt-6-astra、gpt-6.1-sol、grok-4.7），
`images_generations` / `images_edits` / `videos` 进出图出片；没在表里的模型按协议自动归类为 `mosshub:<id>`。
规划器会按模型协商参数：GPT 系用 `max_completion_tokens` 且不收 temperature；网关只回「rejected」不报参数名时，
逐个去掉 temperature → json_object → max_tokens 写法 → max_tokens，最多重试 6 次，学到的写法记在内存里。

密钥只从文件或环境变量读，不进日志：

```bash
node cinemap/server.mjs --mosshub-key-file ~/.mosshub-key --ark-key-file ~/.ark-key
# 或 MOSSHUB_API_KEY / ARK_API_KEY / AIGW_API_KEY（--llm-key-file）
```

MossHub 启动时会读 `/v1/models`：有 `chat_completions` 协议的模型进规划器下拉（当前是 gemini-3.1-pro-preview），
其余按 id 归到出图 / 出片。结果文件存在 `cinemap/data/media/`，经 `/media/<file>` 提供给已登录的页面。
