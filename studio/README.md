# 3D 导演台（TapNow Studio 复刻）

在一个浏览器页面里完成**摆位 → 编排 → 分镜**的微型 3D 片场：多机位、角色走位、关键帧演出、镜头轨切分镜、故事板分镜板。

原站能力由界面探查还原（见包内 `docs/tapnow-3d-studio-界面架构.md`、`docs/tapnow-3d-studio-功能面探查.md`），本仓库是**独立实现**，不含原站代码。

---

## 快速开始

```bash
bun install          # 依赖: react19 / three 0.182 / zustand5 / vite6
bun run dev          # http://localhost:5199 (--strictPort)
bunx tsc --noEmit    # 类型检查
bun run build        # 产物到 dist/
```

首次打开会**自动载入 15 秒样片《走廊遭遇》**（`public/sequence-15s.js` 生成，含 4 机位 / 6 段分镜 / 2 名演员）。想从空场景开始：删掉 `public/sequence-15s.js`，或清空浏览器 localStorage 的 `tap-replica.project` 后刷新。

> 3D 模型在 `public/models/`，随包分发；缺少它角色会退化成基础几何体。

---

## 目录地图

```
src/
  store.ts            单一状态源(zustand):实体/状态/时间轴/关键帧/走位/镜头轨/撤销栈/自动保存
  types.ts            Entity · Keyframe · Cut · Shot · SceneState · Snapshot 等数据模型
  library.ts          资产库(模型/灯光预设/运镜预设)
  scene/
    ThreeStage.tsx    渲染与交互主循环(2240 行):相机、拾取拖拽、走位步态、关键帧采样、镜头轨出画、截图/录制
    models.ts         人物骨骼与姿态库、舞台/房间/道具构建
  ui/
    Studio.tsx        外壳:舞台 + HUD + 侧栏
    MainBar.tsx       底部主条(取景器/状态/模式/对象/放置/镜头管理/时间轴)
    PropertyBar.tsx   选中对象的属性条(姿态/焦距/颜色/更多操作:看向/对位/走位)
    Timeline.tsx      时间轴:播放/标尺/人物·对象·机位·打光·镜头 五条轨
    ContextBar.tsx    上下文操作提示条(按状态给出"现在能做什么",可点执行)
    PathCard.tsx      走位卡:路点列表 + 分段时长 + 反转/加密/闭环/预览
    Storyboard.tsx    故事板/分镜板:按镜头轨一键出图、写说明、导出分镜表
    Viewfinder.tsx    取景器(快门/录制) · Panels.tsx 环境·打光·运镜·模型库
    AgentPanel.tsx / agent/  自然语言指令(工具调用)
public/
  models/             glTF 资产
  sequence-15s.js     15s 样片编排脚本(幂等,可在控制台重跑)
15s-走廊遭遇-分镜.md   样片分镜表 + 时间表 + 微调入口
HANDOFF.md            开发日志(§1–§24:每轮能力、发现的缺陷、验证记录)——改代码前先扫它的目录
```

---

## 关键概念

**状态叠加**:`baseEntities` + 每个 `SceneState.delta`(overrides/additions/removals) → `effectiveEntities()`。样片写在独立状态「15s 走廊遭遇」里。

**时间轴五种轨**

| 轨 | 数据 | 作用 |
|---|---|---|
| 人物·对象 | `keys[entityId]: Keyframe[]` | 位置/朝向/缩放/姿态 `pose`/表演 `acting`/焦段 `focalMm` |
| 机位 | 同上(机位实体) | 镜头内运镜与变焦 |
| 打光 | `lightKeys[]` | 灯光强度/颜色随时间插值 |
| **镜头** | `cuts: {t0,t1,camId}[]` | **分镜:区间内用哪台机位出画** |
| 走位 | `blocking[id] + blockingClosed + blockingSeg` | 地面路点 + 每段秒数(段时长>0 而段长为 0 = 原地停留) |

**优先级**:有走位路径 → 路径驱动位置与朝向(时间轴打开即采样,播放中附加步态);关键帧只补 `scale/acting/pose/focalMm`。没有路径 → 关键帧全权驱动。

**取景视角**:`viewActive = 镜头轨命中 | 手动机位 | 操控`。取景时隐藏机位模型、走位线、对象标签、视锥、选中框与画中画——机位只是"视角选项",不入镜。切镜为硬切;进入/退出取景有 0.7s 过渡。

**撤销**:`Snapshot` 覆盖实体 + blocking/blockingClosed/blockingSeg + keys + lightKeys + blocks/cuts 等调度数据。

**自动保存**:localStorage `tap-replica.project`,比较持久化切片引用后防抖 800ms 落盘(含 `timelineDuration`)。**故事板图片不落盘**(体积大)。

---

## 自动化验证（本项目的主要验证方式）

三个全局探针,可用 Playwright/CDP 或控制台直接断言:

```js
window.__studioStore.getState()   // 全量状态 + 所有 action
window.__studio_debug             // 渲染态:fps / cutCam(当前出画机位) / cutFocal / cleanView(取景纯净)
                                  //  actorPos / poseNow / blockPos / blockDots / blockScreen(路点屏幕坐标)
window.__studioStage              // capture() 快门 · captureAt(t,camId) 分镜取帧 · startRecord/stopRecord
                                  //  playPath · focusEntity · getTimelineTime
```

示例(切镜是否按分镜执行):

```js
const S = window.__studioStore.getState()
S.setTimeline({ open: true, time: 7.5 })
// 下一帧读:
window.__studio_debug.cutCam        // 'CAM3 反打'
window.__studio_debug.cutFocal      // 60.1 (50→72mm 变焦中)
window.__studio_debug.cleanView     // 1 (取景画面上无编辑器辅助)
```

---

## 接续开发:已知缺口与建议

**先补的验证**(代码已写成、尚未跑完浏览器实测):故事板「按镜头轨生成」→ 卡片镜号/时间码/缩略图 → 时间码跳回导演台 → 说明落库 → 导出「分镜表.md」。清单见 `HANDOFF.md §24`。

**能力缺口**(按价值排序):

1. **成片导出**:已有 `MediaRecorder` 录制单段运镜;缺"按镜头轨整片导出"(依次 seek 各镜、逐段录制再拼接)。
2. **运镜路径可视化编辑**:相机路径目前只能录制(`CameraPath` 预设),不能像走位那样拖点改轨迹。
3. **走位曲线**:路点间是折线;可加 Catmull-Rom 平滑与"看向行进方向/固定朝向"切换。
4. **取景显示辅助开关**:当前取景强制纯净,可加"播放时仍显示走位参考"的选项。
5. **分镜表回流**:把导出的 Markdown 分镜表再导入成 `cuts`,形成文档↔时间轴闭环。
6. **多人站位模板**:`faceToFace` 已有,可扩展成围坐/对峙/一字排开。

**约束**:改动 `ThreeStage.tsx` 时注意主循环里的顺序契约——时间推进 → 取景视角解析(`viewActive`) → 灯光采样 → 实体同步(走位/关键帧)→ 姿态 → 选中视觉 → 渲染 → 叠层。`viewActive` 必须在实体同步前算好,否则取景纯净与相机过渡会不同步。
