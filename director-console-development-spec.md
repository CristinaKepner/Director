# 3D 导演台产品详细开发文档

版本：0.1
定位：面向生成式影视预演与视觉制作的完整 3D Director Console

## 1. 产品定义

本产品不是一个 Agent 外挂，也不是把几个图像/视频模型通过 MCP 串联起来的工作流工具。产品本体是一个功能完整的 3D 导演台，Agent 是其中的一类导演操作者。

人类和 Agent 必须操作同一套导演运行时、同一份场景状态、同一套镜头数据和同一套动作协议。所有能在 UI 中完成的操作，都必须能通过 Action API / CLI / Agent Tool 完成；所有 Agent 做过的操作，都必须能在导演台中被观察、撤销、修改和继续编辑。

产品长期定位：

> Director OS for Generative Visual Production：以 Shot、Take 和 Storyboard 为核心，把场景、白模、资产、摄影机、镜头、灯光、运动、录制、评审和生成任务统一起来。

## 2. 设计原则

1. **导演台是视觉核心**：进入产品后首先看到 3D 场景和当前摄影机画面，而不是聊天窗口。
2. **Shot 是一等公民**：场景最终要被组织成镜头，镜头最终要进入故事版。
3. **Agent 与人类使用同一套动作**：不为 Agent 另做隐藏接口，不让 Agent 直接修改前端状态。
4. **白模先行、资产可替换**：圆柱体、盒子和低模可以代表角色、车辆、树、花和建筑；语义必须稳定。
5. **状态可解释**：任何动作都能看到执行中、成功、失败、影响对象和可撤销操作。
6. **所有内容可版本化**：Scene、Entity、Camera、Shot、Take、Storyboard 和 Generation Job 都有版本。
7. **导演状态安全优先**：编辑、排练、录制、评审和发布状态允许的动作不同。
8. **核心数据引擎无关**：第一阶段使用 Three.js，但数据模型不能写死为 Three.js 的对象结构。
9. **实时能力逐步增强**：先做浏览器内完整导演体验，再增加分布式渲染、真实追踪和外部引擎适配。

## 3. 产品形态

### 3.1 主界面

- 中央：3D Director View，占据 60%–75% 区域。
- 右侧：Agent Session，使用 assistant-ui 的 Thread、Composer、Tool UI 和自定义工具卡片。
- 左侧：Scene Outliner、Entity、Camera、Light、Asset 面板，可折叠。
- 底部：Timeline、Shot Deck、Take Browser、Storyboard 抽屉。
- 顶部：项目、场景、当前模式、当前 Program Camera、FPS、渲染状态、录制状态。
- 3D 视图内：Safe Frame、焦距、景别、Camera Frustum、灯光辅助线、对象语义标签、路径和关键帧。

### 3.2 工作空间

- **Director Workspace**：Program/Preview、Shot Deck、故事版和 Agent。
- **Scene Workspace**：场景树、模型、代理几何体、环境和资产。
- **Camera Workspace**：摄影机、焦段、对焦、运动和多机位。
- **Lighting Workspace**：灯光、灯光组、环境、颜色和动画。
- **Timeline Workspace**：镜头切换、对象动画、镜头曲线、Cue 和 Marker。
- **Review Workspace**：Take、批注、版本比较和生成结果。
- **Technical Workspace**：渲染状态、资产加载、事件日志、性能诊断和连接状态。

### 3.3 Agent 操作模式

- Agent Lead：Agent 自动编排，人类审核关键节点。
- Collaborative：Agent 先提出方案，人类确认后执行。
- Manual：人类手工布景和拍摄，Agent 负责解释、记录、总结和生成提示词。

## 4. 完整能力范围

### 场景和资产

- 创建、复制、加载、保存和版本化 Scene。
- 添加地面、天空、HDRI、雾、环境光、背景和碰撞边界。
- 导入 GLB/GLTF、FBX、OBJ、USD/USDA/USDC 资产。
- 从文本、参考图或已有对象生成 3D 模型。
- 创建 Box、Sphere、Cylinder、Plane、Capsule 等代理几何体。
- 替换代理模型并保持语义、变换、引用关系和镜头绑定。
- 资产标签、来源、授权、版本、缺失检测和代理加载。
- 角色、车辆、道具、建筑、树木、花、灯牌等语义分类。

### 对象和布景

- 创建、删除、复制、分组、父子层级和 Prefab。
- 移动、旋转、缩放、吸附、对齐、镜像和坐标空间切换。
- 世界坐标、本地坐标、Pivot、Anchor 和 Look-at Target。
- 对象路径、动线、碰撞警告和安全区域。
- 语义名称、别名、角色、连续性信息和 Agent 备注。

### 摄影机

- Perspective、Orthographic、Cine Camera 和自由观察视图。
- Camera Pose、Focal Length、FOV、Sensor、Aperture、Focus Distance。
- Look-at、Follow、Track、Dolly、Rail、Crane、Jib、Handheld、Orbit。
- Camera Pilot、Camera Preset、Camera Rig、Camera Frustum 和 Safe Frame。
- Camera Bank、多机位、Program/Preview、CUT、Dissolve、Fade。
- 相机抖动、镜头呼吸、滚动快门和基础镜头畸变模拟。

### 灯光

- Directional、Point、Spot、Area、Hemisphere 和 HDRI 灯光。
- 强度、颜色、温度、衰减、阴影、软硬度和灯光组。
- 灯光绑定对象、灯光动画、灯光 Cue 和预设。
- 电影风格 Lighting Preset，例如夜景霓虹、日落、冷白棚、逆光和剪影。

### 运镜和动画

- 关键帧、Bezier/Spline、速度曲线、Ease in/out。
- Camera Transform Track、Lens Track、Focus Track、Target Track。
- 对象 Transform Track、车辆路径、角色动线和灯光 Track。
- 手动录制轨迹、轨迹简化、平滑、重采样、Bake 和撤销。
- 时间码、帧率、播放、暂停、逐帧、跳转、Loop 和 Marker。

### Take 和故事版

- Shot Card、Scene、Sequence、Coverage、编号、状态和缩略图。
- Preflight、Armed、Recording、Review、Circle/Reject。
- 录制白模运镜视频、关键帧、相机参数、灯光状态和对象状态。
- 故事版卡片保存：关键帧、白模视频、文字说明、镜头参数、提示词和生成结果。
- A/B Take 比较、版本图、批注、时间码评论和导演备注。

### 生成任务

- 文生图、图生图、文生视频、视频生视频。
- Shot 自动生成图像提示词、视频提示词和负面提示词。
- Prompt 与 Scene、Entity、Camera、Light、Take 建立引用关系。
- 生成队列、进度、重试、取消、失败恢复和费用/资源提示。
- 生成结果按 Shot、Take、Prompt Version 和 Model Version 归档。

### 诊断和安全

- FPS、GPU Frame Time、Draw Calls、Texture Memory、加载状态。
- 命令延迟、事件队列、录制掉帧、文件写入速度和视频编码状态。
- 场景资产缺失、模型加载失败、镜头引用失效和版本冲突。
- EDIT、BLOCKING、REHEARSAL、ARMED、RECORDING、REVIEW、GENERATING、APPROVED 状态机。
- 删除、覆盖、长时间生成、发布和真实设备操作需要确认。

## 5. 核心数据模型

### Project

```ts
interface Project {
  id: string;
  name: string;
  fps: 24 | 25 | 30 | 50 | 60;
  resolution: { width: number; height: number };
  unit: "meter" | "centimeter";
  scenes: string[];
  sequences: string[];
  storyboardIds: string[];
  currentState: DirectorState;
  version: number;
}
```

### Entity

```ts
interface Entity {
  id: string;
  semanticType: "character" | "vehicle" | "prop" | "building" | "tree" | "flower" | "light" | "environment";
  displayName: string;
  aliases: string[];
  role: string;
  proxy: {
    geometry: "box" | "sphere" | "cylinder" | "capsule" | "custom";
    color?: string;
    dimensions?: [number, number, number];
  };
  assetRef?: string;
  transform: Transform;
  continuity: Record<string, unknown>;
  agentMemory: string[];
  usedByShots: string[];
  version: number;
}
```

### Camera

```ts
interface Camera {
  id: string;
  name: string;
  type: "perspective" | "cine" | "orthographic";
  pose: Transform;
  lens: {
    focalLength: number;
    fov: number;
    sensorWidth: number;
    aperture: number;
    focusDistance?: number;
  };
  target?: string;
  rig?: "free" | "handheld" | "dolly" | "rail" | "crane" | "jib" | "follow";
  tracks: string[];
  version: number;
}
```

### Shot

```ts
interface Shot {
  id: string;
  sceneId: string;
  sequenceId: string;
  index: string;
  title: string;
  description: string;
  cameraId: string;
  cameraPose: Transform;
  lens: Camera["lens"];
  targetIds: string[];
  range: { inFrame: number; outFrame: number };
  sceneVersion: number;
  lightingState: string;
  trackingProfile?: string;
  motionTrackIds: string[];
  takes: string[];
  annotations: string[];
  generationJobs: string[];
  status: "draft" | "blocking" | "rehearsal" | "recorded" | "review" | "approved";
  version: number;
}
```

### StoryboardCard

```ts
interface StoryboardCard {
  id: string;
  shotId: string;
  keyframes: string[];
  blockoutVideo?: string;
  selectedTake?: string;
  actionDescription: string;
  dialogue?: string;
  imagePrompt?: string;
  videoPrompt?: string;
  generatedAssetIds: string[];
  notes: string[];
  status: "empty" | "blocked" | "prompted" | "generated" | "approved";
}
```

### Event

```ts
interface DirectorEvent {
  id: string;
  action: string;
  source: "human" | "agent" | "cli" | "system";
  actorId?: string;
  targetIds: string[];
  payload: unknown;
  before?: unknown;
  after?: unknown;
  timestamp: string;
  undoable: boolean;
  projectVersion: number;
}
```

## 6. Action API 和 CLI

CLI 不是独立业务层，而是 Director Runtime 的命令行客户端。Web UI、Agent、未来硬件都调用同一套 Action Registry。

### 命令域

```text
project.*
scene.*
entity.*
asset.*
camera.*
light.*
motion.*
timeline.*
shot.*
take.*
storyboard.*
annotation.*
generation.*
review.*
health.*
context.*
```

### 关键命令

```bash
# 查看当前状态
 director context.scene --json
 director context.shot --id shot_001 --json
 director capabilities --json

# 场景和对象
 director scene.create --name "夜间城市"
 director entity.create --id hero_car --type vehicle --proxy box --semantic-name "主角黑色跑车"
 director entity.transform --id hero_car --position "0,0,3" --rotation "0,1.57,0"
 director entity.replace-proxy --id hero_car --asset car.glb

# 摄影机和灯光
 director camera.create --id cam_001 --type cine --focal-length 24
 director camera.pilot --id cam_001
 director camera.look-at --id cam_001 --target hero_car
 director light.create --id neon_key --type area --color "#ff315a" --intensity 1200

# 镜头和运镜
 director shot.create --id shot_001 --camera cam_001 --duration 6
 director motion.create --camera cam_001 --type chase --target hero_car --duration 6
 director timeline.add-keyframe --track camera.cam_001.transform --frame 0 --value '{...}'
 director shot.preview --id shot_001

# Take 和故事版
 director take.record --shot shot_001 --name "主车低机位跟拍"
 director take.review --id take_001 --status circle
 director storyboard.add --shot shot_001 --take take_001
 director storyboard.export --sequence main --format html,json,webm

# 生成
 director generation.prompt --shot shot_001 --mode image
 director generation.submit --shot shot_001 --mode video --provider minimax-h3
 director generation.status --job job_001
```

每个 Action 必须支持：

- JSON Schema 输入输出。
- `--dry-run`。
- `--json`。
- `--undo` 或事件级撤销。
- `--idempotency-key`。
- 权限和状态检查。
- 能力检查。
- 事件日志。
- WebSocket 状态推送。
- 统一错误码。

## 7. Agent 工具层

Agent 工具不是单独的 MCP 业务链路，而是 Director Runtime 的受控工具映射。可以提供 CLI、HTTP、WebSocket 和内部函数调用四种入口，但它们都落到 Action Registry。

### Agent 子代理职责

- **Director Planner**：把用户需求转化为剧本、场次、角色和镜头结构。
- **Scene Builder**：创建环境、模型、代理体、材质和布景。
- **Cinematography Agent**：选择景别、焦段、机位、目标和镜头语言。
- **Motion Agent**：设计摄影机轨迹、速度、节奏和关键帧。
- **Lighting Agent**：配置灯光、环境和氛围。
- **Continuity Agent**：维护对象语义、位置、外观和镜头连续性。
- **Storyboard Agent**：组织 Shot、Take、关键帧、白模视频和文字。
- **Generation Agent**：为每个 Shot 生成提示词并提交图像/视频任务。
- **Review Agent**：比较 Take 和生成结果，提取问题并提出修改方案。

Agent 不能直接产生无法追踪的“最终场景”。所有结果都必须转化为 Scene、Entity、Camera、Light、Shot、Take 或 Generation Job。

## 8. assistant-ui 集成

assistant-ui 负责会话展示和工具调用体验，不负责保存导演状态。导演状态由 Director Runtime 管理。

自定义工具 UI：

- `SceneBuildTool`：显示新增对象和场景进度。
- `CameraPlanTool`：显示机位、焦段、目标和取景缩略图。
- `MotionPlanTool`：显示路径、时长、速度曲线和预览按钮。
- `ShotCreateTool`：显示 Shot Card 和“在导演台中打开”。
- `TakeRecordTool`：显示录制状态、帧数和回放按钮。
- `GenerationJobTool`：显示模型、提示词、进度、结果和重试。
- `DiffTool`：显示 Agent 修改前后的场景差异。
- `ApprovalTool`：确认覆盖、删除、发布和高成本操作。

工具调用卡片必须能：

- 查看目标对象。
- 在 3D 导演台中定位。
- 展开参数。
- 预览执行结果。
- 撤销动作。
- 继续修改参数。
- 将结果保存为 Shot 或 Storyboard。

## 9. Three.js 运行时架构

第一阶段使用 React Three Fiber + Three.js。R3F 适合将场景拆成声明式组件；Drei 提供 CameraControls、TransformControls、Gizmo、Bounds 等常用导演台基础能力。Three.js WebGPURenderer 可作为未来渲染路径，并在不支持 WebGPU 的环境回退到 WebGL2。

```text
DirectorRuntime
  ├── SceneGraphStore
  ├── EntityRegistry
  ├── CameraSystem
  ├── LightSystem
  ├── MotionSystem
  ├── TimelineSystem
  ├── TakeRecorder
  ├── StoryboardService
  ├── GenerationJobService
  └── RenderAdapter
       ├── ThreeWebGPUAdapter
       └── ThreeWebGLAdapter
```

Three.js 对象不是 Source of Truth。Source of Truth 是引擎无关的场景数据；Three.js 只是当前运行时投影。这样未来可以增加 Unreal 或离线渲染适配器，而不会重写 Shot、Take 和 Storyboard。

## 10. 时间轴和录制

时间轴必须由项目帧率驱动，以帧为第一单位、毫秒为辅助单位。

轨道类型：

```text
Camera Cut Track
Camera Transform Track
Lens Track
Focus Track
Target Track
Entity Transform Track
Light Track
Material Track
Audio Track
Media Track
Marker Track
Cue Track
```

录制流程：

```text
Preflight
  → ARMED
  → Roll
  → Capture Camera / Lens / Light / Entity State
  → Stop
  → Create Take
  → Generate Thumbnail and Proxy Video
  → Review
  → Circle / Reject
```

浏览器端可以使用 MediaRecorder 生成代理视频；高质量导出由 FFmpeg 或独立 Render Worker 执行。录像必须同时保存场景快照、镜头参数、时间线和事件日志，不能只保存一个视频文件。

## 11. 项目文件和版本

建议使用目录化项目格式：

```text
project/
  project.json
  scenes/
    scene_001.json
  entities/
    hero_car.json
  cameras/
    cam_001.json
  sequences/
    main.json
  shots/
    shot_001.json
  takes/
    take_001.json
  storyboards/
    main.json
  assets/
    manifest.json
  media/
  prompts/
  events/
    2026-09-07.ndjson
```

中期增加 USD 作为场景和资产组合层，GLB/GLTF 作为 Web 运行时资产格式。USD 的 Composition、Reference、Variant 和 Payload 适合长期管理大型可组合场景；不要把所有导演状态压缩成单个不可编辑的模型文件。

## 12. 工程目录

```text
apps/
  director-console/       # Web 导演台
  director-cli/           # CLI 客户端
  director-render-worker/ # 录制和导出

packages/
  director-schema/        # 数据模型和 JSON Schema
  director-runtime/       # Action Registry、事件、状态机
  director-agent-tools/   # Agent 工具定义
  director-three/         # Three.js/R3F 运行时
  director-camera/        # 摄影机和镜头系统
  director-motion/        # 路径、曲线和关键帧
  director-lighting/      # 灯光系统
  director-timeline/      # 时间轴
  director-take/          # Take 和录像
  director-storyboard/    # 故事版
  director-generation/    # 图像/视频生成任务
  director-assets/        # 资产和代理模型
  director-health/        # 性能和诊断
  director-adapters/      # 外部引擎或设备适配
```

## 13. 开发阶段

### Phase 0：协议和运行时基础

- 建立 Project、Scene、Entity、Camera、Light、Shot、Take、Storyboard、Event Schema。
- 实现 Action Registry、事件日志、撤销和 JSON Schema。
- 实现 `director context`、`director capabilities` 和基础 CLI。
- 建立 EDIT、BLOCKING、REHEARSAL、REVIEW 状态机。

验收：不依赖 UI，通过 CLI 创建一个项目、场景、模型、摄影机、镜头并保存项目。

### Phase 1：完整白模导演台

- 3D 视图、场景树、对象选择、Transform Gizmo。
- 代理模型、语义标注、相机 Pilot、焦距和 Look-at。
- 点光、聚光、面光、HDRI 和灯光预设。
- 路径、关键帧、基础时间轴和实时预览。

验收：人工可以完成一个 30 秒白模片段的布景、布光和运镜。

### Phase 2：Shot、Take 和故事版

- Shot Deck、Preview/Program、多机位。
- CUT、Preview、录制、回放、Circle/Reject。
- 关键帧、白模视频、参数和版本进入故事版。
- Annotation、A/B 比较和项目快照。

验收：完成“十个镜头、三次 Take、一个故事版”的完整流程。

### Phase 3：Agent 作为导演操作者

- assistant-ui 会话面板。
- Director Planner、Scene Builder、Cinematography、Motion、Lighting、Storyboard 工具。
- 工具调用卡片、执行进度、差异预览、撤销和确认。
- Agent 读取语义场景记忆和当前镜头上下文。

验收：输入一段汽车宣传片需求，Agent 能创建场景、对象、镜头、灯光、运镜和故事版。

### Phase 4：生成闭环

- Shot 到图像提示词、视频提示词的结构化生成。
- 关键帧图生图、白模视频生视频。
- Generation Job、重试、取消、结果绑定和版本比较。
- 生成结果返回故事版并可重新进入导演台。

验收：一个镜头可以完成“白模 → 关键帧 → 图像 → 白模视频 → 视频生成 → 结果评审”。

### Phase 5：完整导演台专业化

这一阶段的目标是把产品本身做成完整、可长期使用的 3D 导演台，而不是增加外部 MCP 链路。

- 完整多机位和镜头切换系统。
- 高级摄影机 Rig：Dolly、Rail、Crane、Jib、Follow、Handheld。
- 高级灯光、环境和灯光动画。
- 多层时间线、嵌套 Sequence、Cue 和 Marker。
- 资产管理、代理加载、缺失资产和权限。
- 多用户协作、对象锁、评论和版本图。
- 分布式 Render Worker、独立 Recorder Node 和高质量导出。
- OpenUSD 场景组合和资产 Variant。
- 外部 Tracking、Lens、MIDI/HID、OSC、DMX 适配器。
- Unreal/Unity 适配器作为导演台的渲染后端，不改变核心数据模型。
- 专业健康面板和 Latency Map。
- 真实控制台和硬件 Action Binding。

验收：导演可以只使用本产品完成从场景搭建、镜头设计、布光、运镜、录制、故事版到生成任务管理的完整制作流程；Agent 可以调用同等能力完成相同流程。

## 14. 首个完整示例

用户：制作一支速度与激情风格汽车宣传片。

Agent 执行：

1. 创建 Project：Fast Pursuit。
2. 创建 Scene：Neon City、Tunnel、Rooftop。
3. 创建 Entity：主角车辆、追逐车辆、路灯、建筑、道路和烟雾。
4. 给每个 Entity 分配语义 ID 和连续性记忆。
5. 创建 8 个 Shot，分配景别、焦段、目标和时长。
6. 设置蓝红双色灯光和夜景环境。
7. 为主角车辆创建跟车、环绕和低机位轨迹。
8. 录制每个镜头的白模 Take。
9. 选择最佳 Take，生成故事版。
10. 为每个 Shot 生成图像提示词和视频提示词。
11. 提交图生图和视频生视频任务。
12. 将结果挂回 Shot，保留模型版本、提示词版本和生成时间。
13. 生成最终故事版和镜头清单。

## 15. 关键技术结论

- 第一版可以用 Three.js，但必须采用引擎无关的 Director Schema。
- 第一版可以使用代理模型，但必须建立语义 Entity Registry。
- 第一版可以只在浏览器中录制代理视频，但必须记录完整 Take 元数据。
- 第一版不应把 Agent 做成聊天机器人，而要把它做成可观察、可撤销的导演操作员。
- assistant-ui 负责会话和工具展示；Director Runtime 负责真实状态。
- Theatre.js 可以参考其时间轴和编辑器交互，但核心时间线应由本产品自己定义。
- WebGPU 应作为渲染增强路径，WebGL2 作为兼容回退路径。
- OpenUSD 适合作为中长期场景组合格式，GLB/GLTF 适合 Web 运行时资产。
- 未来 Unreal、Unity、真实 Tracking、硬件和渲染节点都应作为适配器接入，而不是成为产品的核心状态来源。

## 16. 研究依据

- Three.js WebGPURenderer：<https://threejs.org/docs/pages/WebGPURenderer.html>
- React Three Fiber：<https://r3f.docs.pmnd.rs/>
- Drei 控制器和辅助组件：<https://drei.docs.pmnd.rs/>
- Theatre.js：<https://github.com/theatre-js/theatre>
- OpenUSD：<https://openusd.org/>
- OpenUSD FAQ：<https://openusd.org/release/usdfaq.html>
- assistant-ui 文档：<https://www.assistant-ui.com/docs>
- assistant-ui Tools API：<https://www.assistant-ui.com/docs/api-reference/tools>
- three.js Editor：<https://github.com/mrdoob/three.js/tree/dev/editor>
