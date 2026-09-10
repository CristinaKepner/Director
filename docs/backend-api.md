# Director Console 后端接口文档

> 版本：director-server/0.5 · 运行时 director-runtime/0.4 · 2026-09-10
> 代码：`server/`（HTTP 层 `src/api.mjs`，运行时宿主 `src/host.mjs`，入口 `bin/director-server.mjs`，CLI `bin/director.mjs`）。共享运行时在 `core/`。

## 1. 架构与职责

Director Console 拆成三层，前后端只通过本文档的 HTTP/SSE 契约通信：

| 层 | 目录 | 职责 | 运行环境 |
|---|---|---|---|
| Core（Director Runtime） | `core/` | 引擎无关的词汇表（schema）、Source of Truth（store）、Action Registry（约 95 个 Action）、状态机、撤销/重做、运镜求值、提示词编译、示例工程、规则型 Agent 规划器 | Node ≥ 18 与浏览器（纯 ES Module，无 DOM 依赖） |
| Backend | `server/` | 持有一份权威的 Core 运行时实例；对外提供 REST + SSE；工程文件持久化；Take 代理视频存储；录制看门狗；可选托管前端静态文件 | Node ≥ 18，零依赖 |
| Frontend | `web/` | Three.js 导演台。本地保留一份 Core 副本用于渲染与即时反馈；所有改变工程的 Action 发给后端，后端返回/推送的快照回写本地副本 | 浏览器（静态站点，可独立部署到任意静态服务器） |

要点：

- **后端是 Source of Truth。** 人、CLI、外部 Agent、浏览器改的是同一份工程；每个 Action 都进 Event Log，可撤销。
- **前端只拥有纯视图状态**（选中项、视口模式、播放头、底栏 Tab、Gizmo 模式等，见 §6），这些字段不会被后端快照覆盖。
- **无后端时前端退化为单机模式**：同样的 Core 在页面内执行，工程存 localStorage。前端不需要改代码。
- **多客户端**：所有连到 `/api/events` 的客户端收到同一份快照，天然多人同屏。

```
   浏览器 web/  ──POST /api/actions──▶  server/  (core 实例 = Source of Truth)  ──autosave──▶ project.json
        ▲                                   │                                            └─▶ media/*.webm
        └────────SSE /api/events ───────────┘
   CLI director.mjs --remote ──POST /api/actions──▶ 同上
   外部 Agent (curl / SDK) ────────────────────────▶ 同上
```

## 2. 启动与配置

```bash
node server/bin/director-server.mjs [选项]         # 或 npm run dev / npm start
node server/bin/director.mjs serve [选项]          # 等价
```

| 选项 | 环境变量 | 默认 | 说明 |
|---|---|---|---|
| `--port` | `PORT` | 5175 | 监听端口 |
| `--host` | `HOST` | 0.0.0.0 | 监听地址 |
| `--project FILE` | `DIRECTOR_PROJECT` | `server/data/project.json` | 工程文件；启动时若存在则载入，之后每次变更 500 ms 后自动落盘（原子写）。传 `none` 则只在内存 |
| `--media-dir DIR` | `DIRECTOR_MEDIA_DIR` | 工程文件旁的 `media/` | Take 代理视频/缩略图目录，经 `/media/<file>` 提供 |
| `--demo NAME` | — | `city-edge` | 无工程文件时载入的示例（`city-edge` / `fast-pursuit` / `none`） |
| `--api-only` | — | 关 | 不托管静态文件，只提供 `/api` 与 `/media`（前端另行部署） |
| `--static DIR` | — | 仓库根目录 | 静态根；`/` 跳转到 `/web/`，页面通过 `../core/` 引入共享运行时 |
| `--token SECRET` | `DIRECTOR_TOKEN` | 无 | 开启后除 `/api/health` 外所有 `/api` 需要 `Authorization: Bearer SECRET`（或 `?token=`） |
| `--cors ORIGIN` | `DIRECTOR_CORS` | `*` | `Access-Control-Allow-Origin` |

进程收到 SIGINT/SIGTERM 时先保存工程再退出。

## 3. 通用约定

- 所有 `/api` 响应为 JSON，成功 `{"ok": true, ...}`，失败 `{"ok": false, "error": "CODE", ...}`；HTTP 状态：200 业务结果（包括 Action 失败）、400 请求格式错误、401 未授权、404 路由/对象不存在、413 体积超限、500 服务器异常。
- 请求体 JSON 上限 20 MB，媒体上传上限 200 MB。
- 相对路径：前端默认以页面地址的 `../api/` 作为 API 根，因此后端可以挂在任意路径前缀代理之后（如 code-server 的 `/proxy/5175/`）。

### Action 调用信封

```json
{
  "action": "camera.look-at",
  "payload": { "id": "cam_program", "target": "hero" },
  "meta": { "source": "agent", "actorId": "cinematography", "dryRun": false, "idempotencyKey": "k1" },
  "withState": true
}
```

`meta` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `source` | `human` / `agent` / `cli` / `api` / `system` | 事件来源，写入 Event Log；默认 `api` |
| `actorId` | string | 操作者/子代理名（scene-builder、cinematography、motion、lighting、continuity、storyboard、generation、review…） |
| `dryRun` | boolean | 只做参数校验与状态机检查，不改状态，返回 `wouldAffect` |
| `idempotencyKey` | string | 同 key 重复调用直接返回上次结果（`replay: true`） |
| `silent` | boolean | 不写 Event Log（高频拖拽用） |
| `capture` | boolean | 仅 `take.record` / `take.stop`：声明调用方自己录代理视频（见 §5） |

Action 结果通用字段：`ok`、`action`、`eventId`、`ms`，以及各 Action 自己的返回（`id`、`prompts`、`data`…）。失败时可能带 `hint`、`missing`（缺参数）、`issues`（Preflight 问题）、`allowed`/`state`（状态机拒绝）。

## 4. 接口一览

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 服务/运行时版本、工程摘要（id、name、version、state、scene、shots、takes、jobs）、持久化状态、连接的客户端数、运行时间。**不需要 token** |
| GET | `/api/capabilities[?group=camera]` | 全部 Action 的名字、说明、参数、必填项、允许的状态机状态、是否可撤销 |
| GET | `/api/capabilities/{action}` | 单个 Action 的说明 |
| GET | `/api/state[?events=120]` | 当前完整快照（见 §6）与版本号 |
| GET | `/api/context?what=scene` | 上下文读取；`what` = `scene` / `project` / `shot` / `entity` / `events` / `history` / `sequence` / `schema` / `capabilities`，其余查询参数作为 payload（如 `?what=shot&id=shot_02`） |
| POST | `/api/actions` | 执行一个 Action（信封见 §3）或 `{"batch":[{action,payload,meta}…], "meta":{…}}` 批量顺序执行；`withState:true` 或 `?state=1` 时附带 `snapshot` |
| POST | `/api/actions/{action}` | 同上的简写：请求体即 payload（或 `{payload, meta}`） |
| POST | `/api/invoke` | `/api/actions` 的兼容别名 |
| POST | `/api/agent` | `{text, mode?, force?, actor?, planOnly?, withState?}`：自然语言 → Agent 规划并执行（`agent.run`）；`planOnly:true` 只返回计划。结果附 `agentSays`（Agent 的回复文本） |
| GET | `/api/events` | SSE 事件流（见 §7） |
| GET | `/api/project[?download=1]` | 导出工程 JSON（`persistable` 形态）；`download=1` 加下载头 |
| PUT/POST | `/api/project` | 导入工程 JSON（`{data}` 或直接是工程对象），等价于 `project.load` |
| POST | `/api/project/save` | 立即落盘 |
| GET | `/api/takes/{id}` | 单个 Take |
| POST | `/api/takes/{id}/media` | 上传该 Take 的代理视频/缩略图：请求体为原始二进制，`Content-Type` 决定扩展名（video/webm、video/mp4、image/png、image/jpeg、image/webp）。返回 `{url:"/media/<file>", bytes, mime}` |
| GET | `/media/{file}` | 媒体文件（缓存一天） |
| GET | `/web/…`、`/core/…` | 静态前端（非 `--api-only` 时）；`/` 302 到 `/web/`。`server/`、`docs/`、`tests/`、`tools/`、`.git` 不对外 |

### 示例

```bash
curl -s http://127.0.0.1:5175/api/health
curl -s -X POST http://127.0.0.1:5175/api/actions -H 'content-type: application/json' \
  -d '{"action":"camera.transform","payload":{"id":"cam_program","height":0.4},"meta":{"source":"agent","actorId":"cinematography"}}'
curl -s -X POST http://127.0.0.1:5175/api/actions/entity.pose -H 'content-type: application/json' -d '{"id":"rival","pose":"aim"}'
curl -s -X POST http://127.0.0.1:5175/api/agent -H 'content-type: application/json' -d '{"text":"03 镜改成环绕 90 度 并 让对手举枪"}'
curl -s 'http://127.0.0.1:5175/api/context?what=shot&id=shot_03'
curl -s -N http://127.0.0.1:5175/api/events        # SSE
curl -s -X POST http://127.0.0.1:5175/api/takes/take_abc/media -H 'content-type: video/webm' --data-binary @proxy.webm
```

## 5. Action 分组（`GET /api/capabilities` 为准）

| 组 | Action | 备注 |
|---|---|---|
| project | new, rename, set-state, set-fidelity, set-fps, set-aspect, set-style, set-shading, set-build-mode, set-view, set-gizmo, select, undo, redo, undo-to, export, load, mark-saved | `set-view` / `set-gizmo` / `select` 在前端本地执行（视图状态） |
| scene | create, environment, preset, demo | `scene.demo {name}` 载入示例工程 |
| entity | create, update, transform, pose, path, duplicate, replace-proxy, delete | 位置是接地点，正面朝 +Z；车辆 dims = [宽, 高, 长] |
| camera | create, update, lens, transform, look-at, rig, pilot, frame, delete | `camera.frame {id,target,size,angle}` 按景别×覆盖角自动放机位 |
| light | create, update, toggle, keyframe, delete | |
| shot | create, update, select, duplicate, reorder, delete, preview | |
| motion | set, keyframe, clear-keyframes, delete-keyframe | 13 种运镜预设 + 机位关键帧 |
| timeline | seek, play, pause, stop, set-range | `seek/play/pause/stop` 在前端本地执行；`set-range` 走后端 |
| take | arm, record, finish, stop, review, delete | 见下 |
| storyboard | add, update, export | `export {format: json/html/md}` 返回 `content` |
| annotation | add | |
| generation | prompt, submit, status, cancel, retry | `submit` 校验供应商与模式；当前为可观察的模拟队列，真实供应商通过 `setHooks({generation})` 接入后端 |
| review | compare | |
| agent | run, plan, confirm, cancel, run-step, set-mode, say | `run {text, mode?, force?}`；`confirm/cancel` 处理 Collaborative 模式待确认方案；`run-step {step}` 单步执行；`say {role,text}` 供外部 LLM 把回复写回会话 |
| context | scene, project, shot, entity, events, history, capabilities, sequence, schema | 只读 |
| health | report | |

### 状态机

`EDIT → BLOCKING → REHEARSAL → ARMED → RECORDING → REVIEW → GENERATING → APPROVED`。每个 Action 声明允许的状态（`allowedIn`），不允许时返回 `STATE_FORBIDDEN` 并附 `allowed`。`project.set-state` 可手动切换。

### Take 录制协议（前端负责录像，后端负责状态）

后端是无头的，没有画面可录；浏览器有画面但不是 Source of Truth。协议：

1. 客户端 `POST /api/actions {action:"take.record", payload:{shotId}, meta:{capture:true}}`。
2. 后端创建 Take（快照机位/镜头/灯光/物体/环境），状态进入 `RECORDING`，返回 `{ok, id, recording:true, awaiting:"client", frames, fps}`，并启动看门狗（镜头时长 + 20 s）。
3. 客户端用 MediaRecorder 录下 Program 画面，结束后 `POST /api/takes/{id}/media`（webm 二进制）得到 `url`。
4. 客户端 `take.finish {id, videoUrl:url, thumbnail, frames, droppedFrames, log}` → Take 进入 `review`，状态机 `REVIEW`，所有客户端收到推送。
5. 若客户端中途关闭，看门狗超时后后端自行 `take.finish`（无视频，只有快照）。

不带 `meta.capture`（CLI、纯 API 调用）时 `take.record` 立即完成快照并进入 `REVIEW`（无头录制）。

## 6. 快照（Snapshot）结构

`GET /api/state`、`POST /api/actions … withState:true` 和 SSE 里都是同一结构（即 `persistable()` 加上 `agent` 与 `history`）：

| 字段 | 内容 |
|---|---|
| `project` | id、name、fps、resolution、aspect、unit、version、currentState、fidelity、buildMode、shading、style/styleZh、programCameraId、currentShotId、savedAt，以及视图字段（selectedId、selectedKind、viewMode、bottomTab、playhead、playing、loop、playSequence、pip、safeFrame、showHelpers、gizmoMode、previewCameraId、workspace） |
| `scene` | id、name、environment（preset、bg、fog、ambient、sky、ground、exposure、wet） |
| `entities[]` | id、semanticType、displayName、role、proxy{geometry,dimensions,color}、transform{position,rotation,scale}、pose、joints、path[]、continuity、agentMemory[]、usedByShots[] |
| `cameras[]` | id、name、lens{focalLength,aperture}、pose{position,rotation}、target、rig、preset |
| `lights[]` | id、name、type、group、color、intensity、enabled、castShadow、transform、target、attachTo、keyframes[] |
| `shots[]` | id、index、title、cameraId、lens、cameraPose、range{inFrame,outFrame}、motion{type,params}、keyframes[]、targetIds[]、description、dialogue、status、takes[]、prompts、promptVersions[]、generationJobs[] |
| `takes[]` | id、shotId、name、number、status（recording/review/circle/reject/aborted）、frames、capturedFrames、droppedFrames、range、fps、motion、keyframes、snapshot、videoUrl、thumbnail、log[]、source、createdAt、finishedAt |
| `storyboard[]` | id、shotId、status、selectedTake、keyframes[]、actionDescription、dialogue、imagePrompt、videoPrompt、notes[] |
| `jobs[]` | id、shotId、takeId、mode、provider、model、promptVersion、status、progress、result |
| `annotations[]`、`events[]` | 事件：id、timestamp、action、source、actorId、payload、targetIds、before、after、ok、ms、undoable |
| `agent` | mode（collaborative/lead/manual）、backend、busy、pendingPlan、messages[]（role: user/agent/plan/tool） |
| `history` | `{undo, redo, labels[]}` 撤销栈信息 |

前端应用快照时保留本地的视图字段（`project` 中的 selectedId、selectedKind、viewMode、bottomTab、playhead、playing、loop、playSequence、pip、safeFrame、showHelpers、gizmoMode、previewCameraId、workspace）。

## 7. SSE 事件流 `GET /api/events`

| 事件 | data | 何时 |
|---|---|---|
| `hello` | `{service, version, snapshot}` | 连接建立时，携带完整快照 |
| `state` | `{seq, version, state, event, snapshot}` | 每次运行时状态变化（Action、Agent、模拟生成任务进度、撤销…）；`event` 是最新事件的精简版（id、action、source、actorId、ok、targetIds、timestamp、ms、undoable），`snapshot` 为完整快照（events 截到 120 条） |
| 注释行 `: keepalive` | — | 每 15 s |

客户端用 `seq` 去重，用 `version` 判断新旧；断线后重连即可（`hello` 会重发完整快照）。

## 8. CLI（`server/bin/director.mjs`）

```bash
# 远程模式：驱动运行中的后端，不需要浏览器
node server/bin/director.mjs --remote http://127.0.0.1:5175 context.scene
node server/bin/director.mjs --remote http://127.0.0.1:5175 camera.look-at --id cam_program --target rival
node server/bin/director.mjs --remote http://127.0.0.1:5175 agent "把 B 机升到 2m 并 look-at 搭档"
node server/bin/director.mjs --remote http://127.0.0.1:5175 help camera.frame
# 本地模式：不起服务，直接读写工程 JSON
node server/bin/director.mjs demo city-edge --project stage.json
node server/bin/director.mjs shot.create --id shot_04 --camera cam_b --duration 5 --motion handheld --title 对峙 --project stage.json
node server/bin/director.mjs export --format html --out storyboard.html --project stage.json
```

参数约定：`--focal-length 40` → `focalLength: 40`；`--camera/--shot/--take` → `cameraId/shotId/takeId`；`0,0,3` → `[0,0,3]`；JSON 字面量可直接传；`--json` 输出原始结果；`--dry-run`；`--source`/`--actor`；`--token` 或 `DIRECTOR_TOKEN` 用于受保护的后端。

## 9. 部署形态

| 形态 | 做法 |
|---|---|
| 单进程（默认） | `node server/bin/director-server.mjs`，打开 `http://host:5175/web/`。后端托管 `web/` 与 `core/` |
| 前后端分离 | 后端 `--api-only --cors https://console.example.com`；`web/` 与 `core/` 同放到静态服务器（保持 `web/../core/` 的相对关系，或 `npm run build:web` 得到自包含的 `dist/`），页面通过 `<meta name="director-api" content="https://api.example.com/api/">`、`window.DIRECTOR_API` 或 `?api=` 指向后端 |
| 反向代理/前缀 | 前端全部使用相对路径，后端 API 用相对 `../api/`，可直接挂在任意路径前缀下（如 code-server `/proxy/5175/web/`） |
| 受保护 | `--token SECRET`；前端暂不带 token（内网/代理鉴权场景），CLI 用 `--token` |

## 10. 错误码

| 错误码 | 含义 |
|---|---|
| `UNKNOWN_ACTION` | Action 名不存在，附 `hint` |
| `MISSING_ACTION` / `MISSING_TEXT` | 请求体缺少 action / text |
| `MISSING_PARAM` | 缺必填参数，附 `missing`、`params` |
| `STATE_FORBIDDEN` | 当前状态机状态不允许，附 `state`、`allowed` |
| `INVALID` / 各 Action 自定义（`TARGET_NOT_FOUND`、`NO_SHOT`、`PREFLIGHT_FAILED`、`NOT_A_CHARACTER`、`MODE_NOT_SUPPORTED`、`TAKE_NOT_FOUND`、`NO_PENDING_PLAN`…） | 参数校验/业务失败 |
| `HANDLER_ERROR` | Action 内部异常，附 `message` |
| `NOTHING_TO_UNDO` / `NOTHING_TO_REDO` / `EVENT_NOT_IN_HISTORY` | 撤销相关 |
| `BAD_JSON` / `PAYLOAD_TOO_LARGE` / `EMPTY_BODY` / `BAD_PROJECT` | HTTP 层请求问题 |
| `UNAUTHORIZED` | 缺少或错误的 Bearer token |
| `NOT_FOUND` / `API_ONLY` | 路由不存在 / 静态托管已关闭 |

## 11. 测试

```bash
npm test          # core：tests/runtime.test.mjs（无 UI）
npm run test:api  # backend：server/tests/api.test.mjs（起临时端口，走真实 HTTP + SSE + 媒体上传）
npm run smoke     # 前端：无头 Chromium 连接后端，截图并通过 API 驱动页面
```
