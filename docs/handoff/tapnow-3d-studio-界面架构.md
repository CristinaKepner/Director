# TapNow「3D 片场」界面架构文档

探查日期 2026-09-09 · 版本 `tap@2.15.12`(Sentry release) · 资源指纹 `eb12ae76452fad…`

---

## 1. 技术栈总览(实测,非推测)

| 层 | 证据 | 结论 |
|---|---|---|
| SPA 框架 | `#root.hydrated`、`__reactContainer$*` fiber key、`__reactRouterVersion === 6` | React + **React Router v6**,水合模式(SSR/hydrate) |
| 组件/原语 | DOM snapshot 中 Radix popper / `radix-:r3j:` id、role=menu/slider/aria-label 体系 | **Radix UI** 原语 + 自定义样式(语义化 aria 完整) |
| 画布节点图 | `react-flow__node-desc-1`、`react-flow__edge-desc-1`、`react-flow__aria-live-1` | 画布层用 **react-flow** |
| 3D 渲染 | `window.__THREE__ === "182"`、webgl2 可用、`tap_webgpu_probe_v1` 键 | **Three.js r182**;WebGL2 主渲染,存在 WebGPU 探测 |
| 协作/数据 | `window['__ $YJS$ __'] === true` | **Yjs**(CRDT)协作栈已加载 |
| 构建 | `fe-assets.tapnow.media/…/assets/index-wjOK8xfb.js`、`page-*.js`、`useUpdateCanvas-*.js`、`hurricane-free-canvas-*.js`(hash 命名) | Vite 产物,#root 单 root |
| 状态持久化 | localStorage 大量 `tapnow.*` / `tap-*` 键 | 见 §4 |
| 实验平台 | `window.__STATSIG__`(Statsig SDK + cached.evaluations.*) | **Statsig** 灰度/实验 |
| 监控 | `SENTRY_RELEASE.id = "tap@2.15.12"`、`ingest.us.sentry.io`、`sentryReplaySession` | **Sentry + Replay** |
| 录音录屏 | `window.__mp_recorder === true`、Mixpanel `__mpq_*` | **Mixpanel**(事件 + Session Replay) |
| Service Worker | `navigator.serviceWorker.controller === true` | SW 已控制页面(离线/缓存策略) |
| 全局拦截 | `__tapnowRuntimeEndpointFetchRewriteInstalled` | 客户端装了 **fetch 重写拦截层** |

## 2. 页面布局结构(DOM/区域分层)

```
<body>
 ├─ #root.hydrated                      React 挂载点(SR 水合)
 │   └─ Notifications (aria alt+T)      全局通知容器
 │   └─ application (role)
 │       ├─ 画布层(react-flow,点阵 svg_root + 节点容器)
 │       │   └─ 3D 片场节点卡片(title input + 进入片场)
 │       ├─ 左侧悬浮工具栏(+/搜索/文件夹/列表/对话/历史/N)
 │       ├─ 画布底控(隐藏节点连线/网格吸附/重置/缩放 slider)
 │       ├─ 顶部条(计数0/社区/分享/返回工作空间/重命名画布/切换画布)
 │       └─ ── 3D 片场 overlay(进入后挂载) ──
 │           ├─ <canvas>                 Three.js WebGL 渲染面
 │           ├─ 场景芯片 DOM 覆盖层       摄像机1-4/角色/角色2/立方体/树(aria-label 暴露)
 │           ├─ 顶部:返回/环境 · 提示条 · 生成历史/设置
 │           ├─ 左侧:焦距刻度 + 8 档 mm 按钮 + output "24 mm"
 │           ├─ 左下:操作方式/恢复初始视角/撤销/重做
 │           └─ 主操作 group(底部居中):
 │               打开取景器 · 示例状态 · 模式(3D/俯视/摄像机N)
 │               · 选择对象+放置 · 镜头管理 · 打开/关闭时间轴
 ├─ #translation-detector               i18n 检测占位(多语言文案探测)
 ├─ 第三方 iframes                      stripe basil iframe、adsrvr track iframe …
 └─ <script> 若干                       分析 SDK 直载
```

要点:
- **3D 片场进入/退出不导航 URL**(路由仍是 `/canvas/:id?chat_mode=agent`),为画布内的 overlay workspace;退出时 `<canvas>` 与 chip 覆盖层整体卸载(实测退出后 `document.querySelectorAll('canvas')` 为 0 —— react-flow 画布非 `<canvas>` 实现)。
- 场景对象(摄像机/角色/几何体)在 DOM 中以 `aria-label` 语义按钮呈现 → 驱动层对辅助技术与自动化友好。
- 右侧 AI 对话面板(chat_mode=agent)在整个片场生命周期保持挂载(语义树中始终可见)。

## 3. 状态与持久化(localStorage 实测键)

片场工作区命名空间:`tapnow.threeDWorkspace.*`
- `tapnow.threeDWorkspace.renderResolution` — 设置面板"渲染分辨率"
- `tapnow.threeDWorkspace.cameraMoveSpeedMultiplier` — 设置面板"移动速度"(实测 0.28×)
- `tapnow.threeDWorkspace.guideRotation.v2` — 引导环视(提示条"不再提示"态)

账号/系统类:`access_token`、`refresh_token`、`active_org_id`(sessionStorage)、`billing-store`(计费状态,Stripe 集成)、`device_id`、`network_fingerprint(+expire)`
画布/会话:`tap-viewport-storage`、`canvas-open-count`、`canvas-chat-open`、`starter-tutorial-storage:<uuid>`、`tap-agent-usage-education-shown:<uuid>`、`tap-tutorial-tips-storage`、`tap:ui`、`tapflow-remote-plugin-store`(远端插件商店)、`OPFS_TOOLS_EXPIRES_TMP_FILES` + `__opfs_tools_tmpfile_init__`(OPFS 临时文件工具链)
分析:`mixpanel`、`statsig`、`gdt_cookie_id`、`__mpq_*`、`_google/_uet/_pin` 等广告归因键
i18n:`tapnowI18nextLng`(i18next)

## 4. 网络面(本次会话实际加载/请求的 host)

一方域名:
- `app.tapnow.media` — 页面载体
- `fe-assets.tapnow.media` — Vite 静态资源(CDN hash 目录)
- `api?(未直接出现)`、`client-edge.tapnow.media` — 客户端边缘接口(疑似 WS/实时)
- `client-events.tapnow.media` — 事件采集
- `files.tapnow.media` — 资产文件(3D 资产下载:"正在下载 3D 资产...")
- `track.tapnow.media` — 行为埋点

三方 SaaS:**Sentry**(us ingest)、**Mixpanel**、**Statsig**、**Stripe**(billing)、**Microsoft Clarity**(`scripts.clarity.ms`、`n.clarity.ms`)、OpenAI `bzr.openai.com`/`bzrcdn.openai.com`(oaiq SDK)

广告/归因(GTM 驱动,`GTM-TZ6R72SP`):Google Ads / GA(G-JKQYQYYR96, AW-17805976690)、Meta Pixel + CAPI 参数构建器、TikTok Pixel(双线 ipv6)、X/Twitter uwt、Reddit、Pinterest、Bing(UET)、The Trade Desk、LINE、Naver、Kakao、Daum、腾讯 zhls.qq(m.qq DMP)

SEO/字体:Google Fonts;若干 untranslated 提示字符串("This text should not be translated" × 6 语言)是翻译检测哨兵文本。

## 5. 模式与交互模型(导演台状态机,实测)

```
画布页面
  │ 点击"进入片场"
  ▼
3D 片场 overlay ──────────────┐
  │ 模式下拉                   ├─ 3D(现场):自由透视,可放置/选中对象
  │                            ├─ 俯视:正交顶视,放置菜单可用
  │                            └─ 摄像机 N:点击摄像机芯片进入;返回模式按芯片
  │ 取景器(overlay):16:9 构图框/三分线/遮幅 + 画幅比+焦段控制 + 圆形按钮(?)
  │ 时间轴(sub-panel,测试版,Esc 不关):0–3s 标尺/播放/循环/添加/删除/更多
  │ 放置态(sub-mode):滚轮调大小/点击落点/取消放置/下载资产中
  │ 对象选中态:属性条(名称/高度/颜色/锁定/更多操作…)
  │ Esc 逐层回退(退出当前模式)
  ▼
返回 → 卸载导演台,画布恢复
```

并发/多状态建模:`示例状态` 下拉(示例状态 / 新增状态 / 编辑场景基准)+ 放置菜单说明("仅添加到当前状态;共享请切场景基准")→ 场景支持**多状态快照**(per-state 对象差异 + 场景基准),典型游戏引擎 "level state" 设计。时间轴(0–3s)+镜头管理(导出到画布) → 产出物是镜头序列,出口是画布节点。

## 6. 安全/隐私观察(信息性)

- 页面并行加载 ~15 个广告归因 SDK(GTM 容器统一编排)+ Clarity 会话录制 + Mixpanel Replay。
- `access_token` / `refresh_token` 存于 localStorage(XSS 可达面);`network_fingerprint` 本地缓存。
- `__tapnowRuntimeEndpointFetchRewriteInstalled` 指示全局 fetch 被包一层(端点重写/鉴权注入通用拦截器)。
- 财务流依赖 Stripe iframe(basil);`billing-store` 缓存在本地。

## 7. 自动化接管要点(以 ego-browser 为例)

- 大部分控件有稳定 `aria-label`;选择器公式:`xpath=//button[@aria-label="<名>"]`。
- 场景对象选择器同样 aria 化(`摄像机 1`…`树`);放置/子菜单条目以 innerText 匹配(菜单 portal 不暴露 role=menu 文本给 AX snapshot,需 body.innerText 验证或截图确认)。
- 模态/面板判断:统一 `document.body.innerText.includes(...)` + 截图闭环;Esc/aria 关闭按钮双通道回退。
- 3D 内容本体在 `<canvas>` 内,DOM 无法逐像素验证 → 视觉验证依赖截图。
