# 合并 handoff（TapNow 3D 片场复刻）

来源：`/inspire/qb-ilm/project/video-generation/public/zqc/handoff/`（2026-09-10）。内容是一个独立的浏览器 3D 导演台复刻（Vite + React 19 + Three.js r182 + zustand），带 15 秒样片《走廊遭遇》、glTF 模型、60+ Agent 工具，以及两份原站探查文档。

## 合并后的位置

| 原路径 | 仓库里 | 说明 |
|---|---|---|
| `handoff/tapnow-studio-replica/` | `studio/` | 源码原样并入（去掉 `node_modules/`、`dist/`）；`vite.config.ts` 加了 `base: './'`，让产物能挂在任意路径前缀下 |
| `handoff/docs/*.md` | `docs/handoff/` | 原站界面架构、功能面探查 |
| `handoff/README.md` | `docs/handoff/handoff-README.md` | 接续开发包说明 |

## 怎么跑

```bash
npm run build:studio       # = cd studio && bun install && bun run build  → studio/dist（已 gitignore）
npm run dev                # 后端同时把 studio/dist 挂在 /studio/
```

打开 `…/proxy/5175/studio/`（导演台 `⋯` 菜单里也有「Studio · 走位/镜头轨」入口）。首次进入自动载入 15 s 样片，时间轴 ▶ 播放。它自己的 Agent 面板走 localStorage 里的 LLM 配置（`tap-replica.llm`），与导演台后端无关。

## 已移植进导演台本体（不是并排，是合进 core / viewport / UI）

| 能力 | 来源（studio） | 落在哪 | 用法 |
|---|---|---|---|
| 走位系统：路点 + 每段秒数 + 原地停留 + 自动朝向 | `PathCard`、15 s 样片的 A 路径 | `entity.walk` Action（core/actions.js）→ 编译成 `entity.path` 关键帧；`motion.js` 对相同位置的相邻关键帧保持不动、走位段线性匀速 | `entity.walk {id, waypoints:[[x,z]…], durations:[s…]}`；属性面板「走位 · 动线」填路点即可；Agent 可直接规划 |
| 摄影棚房间：棋盘 / 纯白 / 校准图案地面 + 墙 + 圆角回幕 | `scene/models.ts buildRoom` | `scene.room` Action + `environment.room`；`viewport.js buildRoom()`（Canvas 纹理地面、侧墙、四分之一圆回幕） | `scene.room {width, depth, height, pattern, spacing, walls, cyc, color}`；场景属性里「房间 · 影棚」 |
| glTF 模型 | `public/models/*.glb`（13 个） | `web/vendor/models/` + `MODEL_LIBRARY`（schema.js）；`entity.create {model}` / `entity.replace-proxy {model|asset}`；`viewport.js buildAsset()`：白模占位 → 异步装载 → 按实体高度缩放、落地 | 属性面板「模型」下拉；`entity.create {model:"person"}` |
| 19 档画幅 | `types.ts ASPECTS` | `ASPECTS`（schema.js） | `⋯` 菜单「画幅」 |
| 影棚布光预设：柔光影棚 / 单侧硬光 / 正午日光 | `library.ts LIGHT_PRESETS`（角度 + 高度 → 位置） | `LIGHT_PRESETS`（schema.js） | `scene.preset {preset:"softbox-studio"}` |
| Three.js r182 | studio 依赖 | `web/vendor/three/`（three.module.js + three.core.js + 用到的 addons + GLTFLoader） | — |
| 上下文建议条（"现在能做什么"） | `ContextBar.tsx` | Agent 面板最多三条跟进度走的建议（`ui.js renderChips`） | — |

验证：`npm test`（走位 / 停留 / 房间 / 模型库用例）、`npm run smoke`、无头页面里 `scene.room` + `softbox-studio` + `entity.create {model:"chair"}` + `entity.replace-proxy {model:"person"}` + `entity.walk` 全部生效、无报错。

## 两边的数据模型对照（为下一步统一做准备）

| 概念 | Director Console（core/） | Studio（studio/src/types.ts） | 备注 |
|---|---|---|---|
| 场景对象 | `entities[]`：semanticType、proxy{geometry,dimensions}、transform、pose、joints、continuity、path[] | `Entity`：kind(camera/actor/prop)、prim、color、position、rotationY、scale | Studio 把机位也当 Entity；Console 机位单独在 `cameras[]` |
| 机位 | `cameras[]`：lens{focalLength,aperture}、pose、target、rig | `Entity(kind=camera)` + 焦距关键帧 | Console 有 look-at 目标与 rig 语义 |
| 时间上的变化 | 每镜 `motion{type,params}` + `keyframes[]`（机位）、`entity.path[]`（动线）、`light.keyframes[]` | `Keyframe{t,position,rotationY,scale}`（任何实体）、走位 `PathCard`（路点 + 分段时长，含原地停留段）、`LightKey` | Studio 的走位/停留段模型更完整，是值得移植的部分 |
| 分镜 | `shots[]`：cameraId、range{in,out}、lens、motion、description、prompts、takes | `Cut{camId, …}`（镜头轨：按时间切机位） | Console 的 shot 是独立单元（各有时长、提示词、Take）；Studio 的 Cut 是一条总时间轴上的切点 |
| 多状态 | 无（用撤销/快照） | `SceneState{delta: additions/removals/overrides}` | Studio 的"状态 = 场景增量"可用来做 Console 的"布景方案"对比 |
| 画幅 | `ASPECTS`（6 档） | `ASPECTS`（19 档） | 可直接扩表 |
| 灯光 | type/group/intensity/attachTo/keyframes | `LightDef{type: softbox/key/fill/rim/sun/spot/point, softness, height}` + 5 套预设 | 预设可合并进 `LIGHT_PRESETS` |
| 模型 | 程序化白模 / 形态可读 | 19 种程序化模型 + `public/models/*.glb` | Console 的 `entity.replace-proxy` 目前只记 `assetRef`，glTF 装载是下一步 |
| 生成 | 后端 Ark 适配器（Seedream / Seedance） | `Shot{kind:image/video,url}` 生成历史（无真实供应商） | Studio 的生成历史面板可以直接读 Console 的 `/api/state` jobs |
| Agent | 后端 LLM 规划器 → Action Registry | 前端 Function Calling（60+ 工具）→ zustand | 工具清单大量重叠（摆位、看向、对位、走位、焦距、录制） |

## 下一步（未做，按价值排序）

1. **步态**：走位时的迈步 / 摆臂（studio 的 gait）接到 Console 的关节人偶上（现在走位只移动与转向）。
2. **glTF 骨骼姿态**：装载的 Person / Humanoid 模型目前是静态网格，姿态预设只对白模人偶生效。
3. **镜头轨导入**：写 `tools/import-studio.mjs`，把 Studio 导出的场景 JSON / 镜头清单（`export.ts`）映射成 Console 工程（Cut → shot，Keyframe → camera keyframes / entity.path）。
4. **同一个 Agent**：让 Studio 的 AgentPanel 改走 `POST /api/agent`，密钥留在后端。
