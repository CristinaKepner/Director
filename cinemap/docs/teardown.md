# Cinemap 客户端工程拆解

来源：`https://cinemap.tapnow.ai`（2026-10-26 抓取，登录页及其公开模块）。项目页 `/p/<uuid>` 需 TapNow SSO 登录后才能看到，签入后的工作区另见 `workspace.md`（待补）。

## 1. 宿主与交付

| 项 | 观察 |
| --- | --- |
| 托管 | Vercel（`data-dpl-id`、Security Checkpoint 拦截非浏览器 UA） |
| 页面壳 | Next.js 静态导出（`data-next-head`），但页面逻辑不是 React：`<script type="module" src="/login.js">` 纯 ES Module |
| 版本化静态资源 | `/v/<hash>/app/procgen/...`，根路径 `/app/procgen/...` 为不带版本的别名 |
| 字体 | 首帧用 metric-matched 本地回退（`size-adjust/ascent-override`），`requestAnimationFrame + setTimeout` 后再 `document.fonts.add()` 加载自有 woff2，避免 FCP 被字体阻塞 |
| 国际化 | en / zh 内联字典；ja / ko 走 `/app/procgen/i18n/locales/web/<code>.json` 语言包；`<html lang>`、`data-ui-lang`、cookie `wb_ui_lang`、localStorage `workshop.ui.language` 三处同步 |
| 设计系统 | `--cm-*` token（墨色/纸色、字号、圆角、阴影、动效时长、z-index），按 `:root[data-cm-type="build"]`、`data-cm-glass="off"` 切换风格 |

## 2. 登录页模块图

```
login.js            控制器：config → session → silent SSO → 显示世界
├─ i18n.js          文本节点遍历翻译、语言包加载、onLang 订阅
│   ├─ locales.js   4 个 locale 的字体栈 / 引号 / 断行策略
│   ├─ lang.js      ?lang → localStorage → navigator.languages
│   └─ tpl.js       模板匹配（{0} 占位）、韩语助词 josa
├─ sso.js           TapNow SSO：silent / interactive / reconcile / redeem，入口计时
│   ├─ tapnow-origin.js  多 origin 探测（favicon no-cors），记住可达 origin
│   └─ ime.js       输入法合成期间忽略 Enter
├─ tapnow-embed.js  被 TapNow iframe 嵌入时的契约（sessionStorage 标记、sendBeacon 上报）
├─ tapnow-copy.js   错误码 → 文案（en/zh 成对）
├─ login-lang.js    语言切换动效：clip-path 滑块 + WAAPI 淡出/位移/淡入
├─ login-motion.js  先画 2D 海报，再挂 WebGL 世界，busy 时暂停
│   ├─ login-poster.js  海报：半分辨率、Bayer 8×8 有序抖动、面板后"安静区"
│   └─ login-world.js   WebGL2 全屏片元着色器 raymarch 三个场景（山谷+河 / 白模小镇 / 海港），
│       └─ gpu-budget.js  GPU 计时查询 + 帧间隔自适应降分辨率，撑不住则定格
```

## 3. 登录状态机

1. `GET /api/config`：`loginMode: tapnow`、`tapnowSsoEnabled`、`tapnowSsoOrigins[]`、`legacyLoginEnabled`。
2. `GET /api/session?optional=1`：已登录 → `location.replace(next)`；`next` 只接受 `/p/<id>` 或 `/share/<token>`。
3. 匿名：每个 tab 只做一次 silent SSO（`sessionStorage cinemap.sso.attempted`）。`POST /api/tapnow/sso/start {mode, returnTo, origin}` → 返回 `https://<tapnow>/api/bff/cinemap/authorize?...`，客户端校验协议与路径后跳转。
4. TapNow 无会话 → 回到 `/login?auth_error=TAPNOW_SSO_LOGIN_REQUIRED&next=...`，页面不显示错误，只显示大按钮。
5. 点击按钮 → interactive 模式，同样走 authorize。邀请码首登走 `POST /api/tapnow/sso/redeem`。
6. 入口耗时：`sessionStorage cinemap.sso.entryTiming` 跨越跳转记录 `startedAt`，页面可见时打 `performance.mark('cinemap:entry:<stage>')`，并写到 `<html data-cinemap-login-timing>`。

## 4. 世界渲染（登录页背景）

- 单个全屏三角形 + 片元着色器，半分辨率 canvas，`image-rendering: pixelated`。
- 场景 = SDF 世界（房子/路灯/码头/船）+ 高度场（山、坡）+ 贴片精灵（真模型在编辑器里截的图集，鹿/车/灯塔/船）。
- 三个场景各编译一个 program（`#define K`），`KHR_parallel_shader_compile` 渐进编译；每 6.5 s 切换，切换是一道从右下到左上的"雾"扫过，新旧场景各画自己一侧（`discard`）。
- 后处理：面板矩形传入 shader，面板左上方的世界淡回纸色；底部法律链接后一块椭圆光晕；只对明度做有序抖动，亮端分 12 级、暗端 6 级，暗点保留本身色相。
- 自适应：`EXT_disjoint_timer_query_webgl2` 读 GPU 时间，超预算缩放到 ≥ 0.5；无计时扩展时按帧间隔；连续超时则 `still`（不再动）。软件渲染器（SwiftShader 等）直接走海报。

## 5. 复刻策略

- 1:1 复刻结构、状态机、交互与视觉语言；代码全部重写（不复制原站混淆产物、着色器、字体与图集）。
- 登录页的世界用自写 SDF 场景实现同样的三场景 + 雾切换 + 抖动后处理；贴片精灵改为 SDF 模型（鹿、船、灯塔）。
- TapNow SSO 用本地 mock（`/mock-tapnow/authorize`）闭环，接口形状与原站一致，便于以后切回真实网关。

## 6. 登录后的客户端（2026-10-26 签入后抓取）

`/` 与 `/p/<uuid>` 是同一个 Next.js 静态页（`main#home` + `section#workspace`），由 `app/home/*.js` 控制；工作区是三层 iframe：

```
main#home                         首页（data-home="horizon"）
├─ header.home-header             品牌 / 新手教程 / 素材 / 头像（账户菜单）
├─ section#horizon.hz             远景抖动 canvas + 转盘 canvas（浮板）+ 起点轨道（hz-cell 弧形排布，
│                                 选中项居中放大）+ 「全部项目 / 全部模板」标签 + 中央 composer
│                                 （textarea 镜像占位、@ 加入角色、附件、起点、设定集、麦克风、开始）
├─ aside 欢迎卡（Cinemap Beta）    首次登录展示，偏好存 /api/prefs
├─ .hz-all                        全部模板 / 全部项目 覆盖层：返回、标题+计数、搜索、分类 chips、列表/网格
├─ dialog#previewDialog           模板预览（上一个/下一个、选用、进入）
├─ dialog#nameDialog 等           命名、反馈、操作记录、素材、TapNow
└─ section#workspace
   ├─ iframe#studio → agent.html  #stage > iframe#ws(editor.html) + aside#agentPanel（助手：直接问 / 让 agent 做、
   │                              档位、推理强度、加速、批量调用、带画面；feed；撤销这次 / 新对话；输入框 + 附件）
   ├─ .project-pill               返回、项目名（点击重命名）、保存状态
   ├─ .editor-account             头像 → 账户与项目菜单（重命名 / 另存副本 / 存为模板 / 操作记录）
   └─ #loading                    「正在打开你的世界 / 正在准备 3D 画布…」
```

editor.html（标题「程序化白模工坊」）：Three.js + importmap（three / rapier / livekit / mediapipe），
`_b/editor-inline-*.js` 主体后按需 `import()` 24 个 layer（people、immersion、template、audio、actors、shell、
undo、flow、camera、seedance、crowd、live、ambience、world、fact-prefetch、roads、perf、ready、civ、
agent-mode、room-caps、select-bar、world-clock、interior）。可见的壳层（shell layer, dock-five）：

- 左侧五段竖栏 `nav#dock`：搭世界（地形 / 建筑 / 人物）、拍戏（剧本、选择 ⌥1、人 ⌥2、动线 ⌥3、机位 ⌥4）、出片、更多、?。
- 顶部中央世界时钟 pill（`.wc`，点开 = 设置面板「世界」页：光照滑条 + 清晨/正午/午后/黄昏、天气九宫格、远景色板、地面尺寸）；右上 `#corner-controls`（存档、版本、构件库、分享、设置）。
- 底部 `voicebar`：「按住 空格 说话 · / 打字」+ Live；上方 coach chip（「按住 空格，说『放一座灯塔』」）；右下罗盘。
- 面板都是毛玻璃 `.panel`（`backdrop-filter: blur(22px)`，24px 圆角）；选中物体出现 `#insp` 检查器；状态 pill `#status`。
- 场景面板（拍戏）：场列表、动线 / 机位 / 剧本三页签、时间线（人物轨道、机位、自动剪辑）。

接口（签入后首页会读）：`/api/session`、`/api/templates`（165 条，含 facets / dims / 多语言）、`/api/scenes`、
`/api/library`、`/api/share-status`、`/api/prefs?key=`、`/api/tapnow/teams`、`/api/tapnow/generation/wallet`、
`/api/tapnow/generation/transactions`；`/api/scenes?id=<uuid>&ground=url` 用来打开项目，无权限返回 404。

### 复刻实现

- 首页 `home.html` + `js/home.js` + `js/horizon.js`：自绘远景与转盘、弧形轨道、composer、欢迎卡、全部模板 / 项目覆盖层、预览、命名、账户菜单。
- 工作区三层 iframe 同构：`app.html`（壳）→ `agent.html`（助手面板，postMessage 协议 `cm:step / cm:result / cm:ask / cm:voice / cm:save / cm:ready`）→ `editor.html`（自写 Three.js 白模工坊：`editor/kit.js` 构件、`editor/worldgen.js` 按起点+seed 生成底图、`editor/scene.js` 舞台与光照时钟、`editor/ui.js` 五段栏 / 面板 / 语音条 / 设置、`editor/actions.js` 助手步骤落位）。
- 助手由 `server.mjs` 里的本地规划器 `planAgentTurn` 代替模型：一句话 → place / clear / time / weather 步骤，便于以后替换成真实网关。
- 没有的东西：真实 procgen 生成器与 GLTF 构件库、语音识别 / Live、视频生成（Seedance）、人群与室内系统——这些是原站的核心引擎，不在客户端复刻范围内。
