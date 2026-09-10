# Director Console · 导演台

> 创作从这一帧开始。面向生成式影视预演的浏览器 3D 导演台：人类、CLI 和 Agent 操作**同一套 Director Runtime、同一份场景、同一套镜头数据和同一套 Action**。

对照文档：`docs/backend-api.md`（后端接口契约）、`director-console-development-spec.md`（Director OS 规格）、`PRODUCT.md`（精细化 vs 白模 + prompt 的产品决策）。

## 结构：前后端解耦

```
core/      Director Runtime —— 引擎无关、无 DOM：schema · store · actions(≈95 个 Action) · motion · prompts · demo · agent
server/    后端 —— 持有权威运行时（Source of Truth）+ REST/SSE API + 工程持久化 + Take 媒体存储 + CLI；零依赖 Node
web/       前端 —— 静态 Three.js 站点；本地保留一份 core 副本做渲染，所有改动工程的 Action 发往后端，后端快照实时回推
docs/      backend-api.md：接口、Action 分组、快照结构、SSE、录制协议、部署形态、错误码
tests/     核心运行时验收（无 UI）   server/tests/ 后端 HTTP 验收   tools/ 浏览器冒烟 · 前端打包
```

- **后端是 Source of Truth**：浏览器、CLI、curl、外部 Agent 改的是同一份工程，每个 Action 进 Event Log，可撤销；多个浏览器连上就是多人同屏。
- **前端只拥有视图状态**（选中项、视口模式、播放头、Tab、Gizmo…），不会被后端快照覆盖。
- **无后端时前端自动退化为单机模式**：同一份 core 在页面内执行，工程存 localStorage，页面右下角显示 `backend · standalone`。
- **Take 录制分工**：后端无头、负责状态与快照；浏览器负责用 MediaRecorder 录 Program 画面，上传到后端 `/media/`，刷新不再丢视频。

## 运行

```bash
cd director-console
npm run dev                # = node server/bin/director-server.mjs --port 5175（系统 node 18 即可，Node 22 更佳）
# 打开 http://127.0.0.1:5175/web/ （code-server 下用 …/proxy/5175/web/；前端只用相对路径，穿前缀代理无需配置）
```

前后端分开部署：

```bash
npm run start:api                                   # 后端只提供 /api 与 /media（--api-only），可加 --token SECRET --cors https://console.example.com
npm run build:web -- --api https://api.example.com/api/   # dist/ = web/ + core/，扔到任何静态服务器；不传 --api 则页面默认用 ../api/
```

后端选项（`--port --host --project --media-dir --demo --api-only --static --token --cors`）与环境变量见 `docs/backend-api.md` §2。工程默认落在 `server/data/project.json`（已 gitignore），每次变更 500 ms 后自动保存，Ctrl-C 时也会保存。

## 验收

```bash
npm test          # core：建场 → 建镜 → 录 Take → 提示词 → 撤销 → 状态机 → Agent 规划（10 条，无 UI）
npm run test:api  # backend：真实 HTTP + SSE + 媒体上传 + token 鉴权 + api-only（7 条，临时端口）
npm run smoke     # frontend：无头 Chromium 连接 5175 的后端，通过 API 改场景并校验页面同步、页面录 Take 并校验视频落到后端（借 ../director-stage 的 playwright）
```

## 界面

| 区域 | 内容 |
|---|---|
| 顶栏 | 工程名 · 同步/保存状态 · 保真度（白模语义 / 形态可读）· 着色 SHADED/CLAY/WIRE · 画幅 · 构建模式 布景/调度 · 状态机 · Program 机位 · 撤销/重做 · 导出/导入 · 示例 |
| 中央 | 导演视图：自由观察（含 Program 画中画、Gizmo、机位视锥、灯光辅助、运镜路径）/ Program（16:9 安全画幅、三分线、动作安全区）|
| 左 | Outliner（机位 / 演员道具 / 布景 / 灯光）+ Inspector（人物 11 个关节滑杆与姿态预设、机位焦距/光圈/景别×覆盖角自动构图、灯光类型/组/强度/跟随、镜头运镜参数、场景环境与灯光预设）|
| 右 | Agent Director：Collaborative（出方案 → 确认）/ Agent Lead / Manual，工具卡片可「定位」「撤销到此前」；右下 `backend · online/standalone` |
| 底 | 镜头条 · Timeline（帧尺、播放头、关键帧、序列）· Takes（代理视频、快照、Circle/Reject、恢复快照）· Storyboard · Generation（Image / T2V / V2V / Negative，中英，供应商与模式）· Events · Health |

默认示例「城市边缘」：三人站位 + 手枪 + 路边车 + 楼群，Program 40 mm，三镜：01 相遇之前 40 mm 推近 6 s / 02 目光 70 mm 固定 4 s / 03 蓄势待发 35 mm 环绕 5 s。

## 两条保真度，一份数据

- **白模语义（默认）**：圆柱 = 人、长盒 = 车、小锥 = 枪、高盒 = 楼。几何只负责身份、站位、遮挡、轴线；注意力放在镜头语言和 T2V / V2V 提示词。
- **形态可读**：车分车身 / 座舱 / 轮 / 车灯，人物有头颈、脊柱、肩肘髋膝 11 个可动关节（姿态预设 idle/walk/run/drive/sit/aim/crouch/wave/point/fall），楼有发光窗，灯光分 key / neon / practical。

切换只改投影；`semanticType`、`id`、`continuity`、`usedByShots` 不变。

## Agent 控制导演台

所有入口都落到 `core/actions.js` 的 Action Registry（`GET /api/capabilities` 可列出参数与状态机许可）：

```bash
# 1. 页面内 Agent 会话（规则规划器：中文 / 英文 → Action 计划，在后端执行，所有页面同步看到工具卡片）
把 Program 机位降到 0.4m 并 look-at 主角 / 03 镜改成环绕 120 度 5 秒 / 让对手举枪 / 换成日落逆光
新建镜头「对峙」6秒 手持 看向对手 / 录制 shot_02 / 圈选 / 全部进故事版 / 提交 shot_03 视频生视频 seedance

# 2. HTTP：外部 Agent（例如 Claude Code）直接驱动后端，不需要浏览器
curl -X POST http://127.0.0.1:5175/api/actions -H 'content-type: application/json' -d '{"action":"entity.pose","payload":{"id":"rival","pose":"aim"},"meta":{"source":"agent","actorId":"continuity"}}'
curl -X POST http://127.0.0.1:5175/api/agent   -H 'content-type: application/json' -d '{"text":"03 镜改成环绕 90 度 并 让对手举枪"}'
curl 'http://127.0.0.1:5175/api/context?what=shot&id=shot_03'      # 也有 /api/state /api/capabilities /api/project
curl -N http://127.0.0.1:5175/api/events                           # SSE：每次变化推送事件 + 完整快照

# 3. CLI：远程模式驱动后端；本地模式不起服务、直接读写工程 JSON
node server/bin/director.mjs --remote http://127.0.0.1:5175 camera.transform --id cam_program --height 0.4
node server/bin/director.mjs --remote http://127.0.0.1:5175 agent "把 B 机升到 2m 并 look-at 搭档"
node server/bin/director.mjs demo city-edge --project stage.json
node server/bin/director.mjs shot.create --id shot_04 --camera cam_b --duration 5 --motion handheld --title 对峙 --project stage.json
node server/bin/director.mjs export --format html --out storyboard.html --project stage.json
node server/bin/director.mjs capabilities | help camera.frame | context [scene|shot|project|events|schema]
```

每个 Action：参数校验、状态机检查（EDIT/BLOCKING/REHEARSAL/ARMED/RECORDING/REVIEW/GENERATING/APPROVED）、`--dry-run`、`--json`、幂等键、事件日志（source / actorId / before / after / ms）、撤销（`project.undo`、`project.undo-to <eventId>`）。Agent 的每一步都带子代理角色（scene-builder / cinematography / motion / lighting / continuity / storyboard / generation / review）；`agent.confirm / agent.cancel / agent.run-step / agent.set-mode / agent.say` 让外部 LLM 也能接管会话。

## 录制与生成

- **Take**：Preflight(`take.arm`) → ARMED → `take.record` 进入 RECORDING。浏览器客户端带 `meta.capture` 调用后自己用 MediaRecorder 录下 Program 画面，`POST /api/takes/{id}/media` 上传 webm，再 `take.finish` → REVIEW → Circle / Reject → 故事版。CLI / 纯 API 调用则无头完成（只有快照）。后端有看门狗：客户端中途关闭也会收尾。
- **提示词**：`generation.prompt` 由镜头编译（场景、主体语义与连续性、景别、角度、机位高度、焦距、光圈、运镜、灯光组、时长、帧率、保真度）成 Image / Video(T2V·I2V) / V2V / Negative 的中英文本并记版本。V2V 文本包含「大圆柱 = 主角 A：…」的代理体映射。
- **生成任务**：`generation.submit` 校验供应商与模式（Seedance / Kling / MiniMax H3 / Veo / Runway / Higgsfield / FLUX / GPT Image），任务按 Shot / Take / Prompt Version / Model 归档；当前是可观察的模拟队列，真实供应商在后端通过 `setHooks({ generation: adapter })` 接入，进度经 SSE 推给所有页面。

## 目录

```
core/schema.js                   引擎无关词汇：语义代理、景别、覆盖角、运镜、姿态/关节、灯光预设、供应商
core/store.js                    Source of Truth + 历史（撤销/重做）+ 序列化
core/actions.js                  Action Registry（project/scene/entity/camera/light/shot/motion/timeline/take/storyboard/annotation/generation/review/context/health）
core/motion.js  core/prompts.js  运镜求值（含关键帧、动线）· 提示词编译器
core/demo.js  core/agent.js      示例工程 · Agent 规划器（scene.demo / agent.* 也是 Action）
core/index.js                    运行时入口（服务端、CLI、测试、页面共用）
server/src/host.mjs              RuntimeHost：权威运行时、自动保存、SSE 广播（每 Action 一帧）、录制看门狗、媒体存储
server/src/api.mjs               HTTP 路由：/api/* · /media/* · 静态托管（可关）· CORS · Bearer token
server/bin/director-server.mjs   后端入口      server/bin/director.mjs   CLI（--remote 走后端 / 本地读写 JSON）
web/index.html  web/css/app.css  页面与样式（vendor/three r170 已内置，无构建）
web/js/client.js                 前端 ↔ 后端：API 地址解析、SSE 同步、快照回写（保留视图字段）、dispatch 路由、媒体上传、单机降级
web/js/viewport.js               Three.js 投影：双保真、关节人偶、灯光、Program/自由观察、安全框、Gizmo、录像器
web/js/ui.js  web/js/main.js     UI 绑定 · 启动（连后端，失败则单机）
tests/runtime.test.mjs  server/tests/api.test.mjs  tools/smoke.mjs  tools/build-web.mjs
```

## 与规格的差距（诚实边界）

已落地：引擎无关 Schema、Action + Event + 撤销、状态机、白模/可读双保真、关节人偶、多机位与 13 种运镜预设 + 机位关键帧 + 物体动线、Program/PiP/安全框、Shot/Take(代理视频落后端)/Storyboard、提示词编译、Agent 三模式与工具卡片、CLI 本地与远程、独立后端（REST + SSE + 持久化 + 媒体）、多页面同步。

未落地（Phase 4–5）：真实生成供应商、GLB/USD 导入与资产替换（`entity.replace-proxy` 只记 `assetRef`）、独立 Render Worker、对象锁与冲突合并（现在是后端串行执行 + 全量快照广播）、前端 token 鉴权（受保护后端只对 CLI/API 客户端开放）、assistant-ui 组件、外部 Tracking / 硬件。
