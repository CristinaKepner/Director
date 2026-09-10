# 产品决策：精细化 vs 白模 + Prompt

用户要的不是再做一个聊天框挂几个视频模型，而是 **Director OS**：Shot / Take / Storyboard 为核心，人类和 Agent 操作同一份场景状态。

## 两条保真度，一个 Runtime

| | 形态可读（精细化预演） | 白模语义（模糊化 + prompt 精细化） |
|---|---|---|
| 几何 | 车头/轮拱/座舱可辨，人物关节可动，楼有发光窗 | 圆柱人、长盒车、小锥枪 |
| 灯光 | 月光 key、品红/青色霓虹、车灯 practical | 同语义灯光，强度用于提示词编译 |
| 目的 | 看清站位、遮挡、视线、表演姿态 | 把预算和时间留给 T2V / V2V |
| 导出 | 构图参考 + 运镜曲线 | 结构化 image / video prompt + Take 元数据 |
| 对应 | director-stage 的机位/焦距/走位 + 3D Jutsu 的可编辑 scene | 3D Jutsu「灰模 previz → 同一会话出片」 |

**结论：** 默认走白模语义，因为生成模型吃的是镜头语言和约束，不是预演网格面数。形态可读是开关，不是另一套数据。Entity.semanticType、id、continuity、usedByShots 在两种保真度下不变；替换 GLB 时只改 `assetRef` / `proxy`。

## Agent 控制面

不允许 Agent 写 React/Three 状态。只允许：

```
director camera.look-at --id cam_a --target hero_car
director shot.create --camera cam_a --duration 6
director generation.prompt --shot shot_002 --mode video
```

UI 按钮、CLI、Agent 工具都落到 `js/actions.js` 的 Registry。Event Log 里能看到谁改了什么。

## 和参考产品的取舍

- **director-stage**：吸收独立机位、焦距、景别、干净导出给 Seedance/Kling/H3 的思路。本原型把「复制镜头文本」升级成按 Shot 绑定的 image/video prompt，并带上灯光、运动、语义物体。
- **3D Jutsu**：吸收 prompt 出可编辑场景、Agent 改单个物体、previz 视频当 V2V 参考、同一工作区出片。本原型把 Agent 降到可撤销的导演操作员，而不是一次生成不可追踪的最终场景。
- **规格 Phase 5 的 Unreal/USD/硬件**：做成适配器位，不进 Source of Truth。

## 建议的真实生产顺序

1. 冻结 Schema 与 Action（本目录已演示）
2. 接 MediaRecorder + FFmpeg worker，让 Take 真正产出 webm
3. 接 Seedance / Kling / MiniMax H3，把 `generation.submit` 换成真队列
4. 用 assistant-ui 做工具卡片（Diff / Approval / Shot Card）
5. GLB 替换代理，语义不改
6. 再考虑关节 FK 文件、USD、多用户锁
