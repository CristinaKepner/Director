# Director Console · 导演台

> 创作从这一帧开始。面向生成式影视预演的浏览器 3D 导演台：人类、CLI 和 Agent 操作**同一套 Director Runtime、同一份场景、同一套镜头数据和同一套 Action**。

对照文档：`director-console-development-spec.md`（Director OS 规格）、`PRODUCT.md`（精细化 vs 白模 + prompt 的产品决策）。

## 运行

```bash
cd director-console
node bin/director-server.mjs --port 5175      # 或 npm run dev；系统 node 18 即可，Node 22 更佳
# 打开 http://127.0.0.1:5175/ （code-server 下用 …/proxy/5175/，站点只用相对路径，穿前缀代理无需配置）
```

静态站点，Three.js r170 已 vendored 在 `vendor/three/`，不依赖 CDN，无构建步骤。

```bash
npm test          # Phase 0 验收：无 UI 跑通 建场 → 建镜 → 录 Take → 提示词 → 撤销 → 状态机 → Agent 规划
npm run smoke     # 无头 Chromium 冒烟（借 ../director-stage 的 playwright）：截图 + 通过桥接驱动页面
```

## 界面

| 区域 | 内容 |
|---|---|
| 顶栏 | 工程名 · 本地自动保存 · 保真度（白模语义 / 形态可读）· 着色 SHADED/CLAY/WIRE · 画幅 · 构建模式 布景/调度 · 状态机 · Program 机位 · 撤销/重做 · 导出/导入 · 示例 |
| 中央 | 导演视图：自由观察（含 Program 画中画、Gizmo、机位视锥、灯光辅助、运镜路径）/ Program（16:9 安全画幅、三分线、动作安全区）|
| 左 | Outliner（机位 / 演员道具 / 布景 / 灯光）+ Inspector（人物 11 个关节滑杆与姿态预设、机位焦距/光圈/景别×覆盖角自动构图、灯光类型/组/强度/跟随、镜头运镜参数、场景环境与灯光预设）|
| 右 | Agent Director：Collaborative（出方案 → 确认）/ Agent Lead / Manual，工具卡片可「定位」「撤销到此前」|
| 底 | 镜头条（镜号 标题 镜头 运动 时长 时间码 状态）· Timeline（帧尺、播放头、关键帧、序列）· Takes（代理视频、快照、Circle/Reject、恢复快照）· Storyboard · Generation（Image / T2V / V2V / Negative，中英，供应商与模式）· Events · Health |

默认示例「城市边缘」：三人站位 + 手枪 + 路边车 + 楼群，Program 40 mm，三镜：01 相遇之前 40 mm 推近 6 s / 02 目光 70 mm 固定 4 s / 03 蓄势待发 35 mm 环绕 5 s。

## 两条保真度，一份数据

- **白模语义（默认）**：圆柱 = 人、长盒 = 车、小锥 = 枪、高盒 = 楼。几何只负责身份、站位、遮挡、轴线；注意力放在镜头语言和 T2V / V2V 提示词。
- **形态可读**：车分车身 / 座舱 / 轮 / 车灯，人物有头颈、脊柱、肩肘髋膝 11 个可动关节（姿态预设 idle/walk/run/drive/sit/aim/crouch/wave/point/fall），楼有发光窗，灯光分 key / neon / practical。

切换只改投影；`semanticType`、`id`、`continuity`、`usedByShots` 不变。

## Agent 控制导演台

三条入口，都落到 `js/actions.js` 的 Action Registry（88 个 Action，`context.capabilities` 可列出参数与状态机许可）：

```bash
# 1. 页面内 Agent 会话（规则规划器：中文 / 英文 → Action 计划）
把 Program 机位降到 0.4m 并 look-at 主角 / 03 镜改成环绕 120 度 5 秒 / 让对手举枪 / 换成日落逆光
新建镜头「对峙」6秒 手持 看向对手 / 录制 shot_02 / 圈选 / 全部进故事版 / 提交 shot_03 视频生视频 seedance

# 2. CLI 本地模式：不需要 UI，直接读写工程 JSON
node bin/director.mjs demo city-edge --project stage.json
node bin/director.mjs camera.look-at --id cam_program --target rival --project stage.json
node bin/director.mjs shot.create --id shot_04 --camera cam_b --duration 5 --motion handheld --title 对峙 --project stage.json
node bin/director.mjs take.record --shot shot_04 --project stage.json
node bin/director.mjs generation.prompt --shot shot_04 --project stage.json
node bin/director.mjs agent "把 B 机升到 2m 并 look-at 搭档" --project stage.json
node bin/director.mjs export --format html --out storyboard.html --project stage.json
node bin/director.mjs capabilities | help camera.frame | context [scene|shot|project|events|schema]

# 3. 远程桥接：外部 Agent（例如 Claude Code）驱动正在打开的页面
node bin/director.mjs --remote http://127.0.0.1:5175 camera.transform --id cam_program --height 0.4
curl -X POST http://127.0.0.1:5175/api/invoke -d '{"action":"entity.pose","payload":{"id":"rival","pose":"aim"}}'
curl -X POST http://127.0.0.1:5175/api/agent  -d '{"text":"03 镜改成环绕 90 度 并 让对手举枪"}'
curl http://127.0.0.1:5175/api/capabilities | http://127.0.0.1:5175/api/context
```

每个 Action：参数校验、状态机检查（EDIT/BLOCKING/REHEARSAL/ARMED/RECORDING/REVIEW/GENERATING/APPROVED）、`--dry-run`、`--json`、幂等键、事件日志（source / actorId / before / after / ms）、撤销（`project.undo`、`project.undo-to <eventId>`）。Agent 的每一步都带子代理角色（scene-builder / cinematography / motion / lighting / continuity / storyboard / generation / review）。

## 录制与生成

- **Take**：Preflight(`take.arm`) → ARMED → `take.record` 进入 RECORDING，浏览器用 MediaRecorder 录下 Program 画面为 webm 代理视频，同时快照相机 / 镜头 / 灯光 / 物体 / 环境 → REVIEW → Circle / Reject → 故事版。无头或 CLI 下只做快照。
- **提示词**：`generation.prompt` 由镜头编译（场景、主体语义与连续性、景别、角度、机位高度、焦距、光圈、运镜、灯光组、时长、帧率、保真度）成 Image / Video(T2V·I2V) / V2V / Negative 的中英文本并记版本。V2V 文本包含「大圆柱 = 主角 A：…」的代理体映射。
- **生成任务**：`generation.submit` 校验供应商与模式（Seedance / Kling / MiniMax H3 / Veo / Runway / Higgsfield / FLUX / GPT Image），任务按 Shot / Take / Prompt Version / Model 归档；当前是可观察的模拟队列，真实供应商通过 `setHooks({ generation: adapter })` 接入，不进核心状态。

## 目录

```
index.html  css/app.css          页面与样式
js/schema.js                     引擎无关词汇：语义代理、景别、覆盖角、运镜、姿态/关节、灯光预设、供应商
js/store.js                      Source of Truth + 历史（撤销/重做）+ 持久化
js/actions.js                    Action Registry（project/scene/entity/camera/light/shot/motion/timeline/take/storyboard/annotation/generation/review/context/health）
js/motion.js  js/prompts.js      运镜求值（含关键帧、动线）· 提示词编译器
js/demo.js  js/agent.js          示例工程 · Agent 规划器（scene.demo / agent.run / agent.plan 也是 Action）
js/viewport.js                   Three.js 投影：双保真、关节人偶、灯光、Program/自由观察、安全框、Gizmo、录像器
js/ui.js  js/bridge.js  js/main.js  UI 绑定 · 桥接客户端 · 启动
js/runtime.js                    CLI / 测试 / 页面共用的运行时入口
bin/director.mjs  bin/director-server.mjs   CLI · 静态服务 + Agent 桥
tests/runtime.test.mjs  tools/smoke.mjs     无头验收 · 浏览器冒烟
```

`vite.config.ts` / `tsconfig*.json` / `src/` 是早期脚手架残留，当前站点不使用。

## 与规格的差距（诚实边界）

已落地：引擎无关 Schema、Action + Event + 撤销、状态机、白模/可读双保真、关节人偶、多机位与 13 种运镜预设 + 机位关键帧 + 物体动线、Program/PiP/安全框、Shot/Take(代理视频)/Storyboard、提示词编译、Agent 三模式与工具卡片、CLI 本地与远程、HTTP 桥。

未落地（Phase 4–5）：真实生成供应商、GLB/USD 导入与资产替换（`entity.replace-proxy` 只记 `assetRef`）、独立 Render Worker、多用户与对象锁、assistant-ui 组件（当前用原生 DOM 卡片实现同等交互）、外部 Tracking / 硬件。
