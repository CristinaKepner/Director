// ─── 类型 ─────────────────────────────────────────────────────────────
export type Vec3 = [number, number, number]

export type Prim =
  | 'box' | 'sphere' | 'cylinder' | 'cone' | 'rock' | 'crate' | 'lamp'
  | 'tree' | 'actor' | 'camera' | 'model'
  | 'plant' | 'chair' | 'table' | 'sofa' | 'fence' | 'sign' | 'arch' | 'stairs'

export type Kind = 'camera' | 'actor' | 'prop'

export interface Entity {
  id: string
  name: string
  kind: Kind
  prim: Prim
  color: string
  position: Vec3
  rotationY: number
  scale: number
  height?: number
  pose?: string
  /** 姿态微调:覆盖预设姿态的字段(骨盆/大腿/小腿/肩/肘/根) */
  poseTune?: Record<string, number>
  /** 循环动作:挥手 / 鼓掌 / 点头 / 呼吸 */
  acting?: string
  /** 看向/转向目标实体(头部与躯干自动转向) */
  lookAtId?: string
  locked?: boolean
  focalMm?: number
  /** 曝光三要素:光圈 f 值 / 快门分母(1/x 秒) / ISO */
  aperture?: number
  shutter?: number
  iso?: number
  /** 摄像机跟随目标实体 id */
  followId?: string
  /** 跟随方式:对准(机位不动) / 平移(保持相对偏移) / 环绕(绕目标转) */
  followMode?: 'aim' | 'track' | 'orbit'
  /** 跟随时的相对偏移(设置跟随瞬间计算) */
  followOffset?: Vec3
  /** 环绕跟随角速度(rad/s) */
  orbitSpeed?: number
  /** 进入场景时的初始摆放,用于「恢复初始摆放」 */
  initial?: { position: Vec3; rotationY: number; scale: number }
  userModelUrl?: string
}

export interface Keyframe {
  t: number
  position: Vec3
  rotationY: number
  scale: number
  /** 该帧→下一帧的插值曲线 */
  ease?: 'linear' | 'in' | 'out' | 'inout'
  /** 该帧起的表演动作(可空 = 无动作) */
  acting?: string
  /** 该帧起的基础姿态(可空 = 沿用实体姿态);用于"走到位后换姿态" */
  pose?: string
  /** 该帧起的焦距 mm(相机专用,用于推拉变焦) */
  focalMm?: number
}

/** 镜头轨片段:时间区间内使用某台机位出画(空 camId = 自由视角) */
export interface Cut {
  id: string
  t0: number
  t1: number
  camId: string
}

export interface StateDelta {
  additions: Entity[]
  removals: string[]
  overrides: Record<string, Partial<Entity>>
}

export interface SceneState {
  id: string
  name: string
  delta: StateDelta
}

export interface Keyframe { t: number; position: Vec3; rotationY: number; scale: number }

/** 打光轨关键帧:记录每盏灯的强度/颜色快照(按灯 id 对齐) */
export interface LightKey { t: number; defs: { id: string; intensity: number; color: string }[] }

export type Mode = { type: '3d' } | { type: 'top' } | { type: 'cam'; id: string }

export type PanelKey = 'settings' | 'env' | 'genHistory' | 'shots'

export type Aspect =
  | '16:9' | '9:16' | '4:3' | '3:4' | '1:1' | '3:2' | '2:3' | '4:5' | '9:19.5' | '9:21'
  | '1.33:1' | '1.37:1' | '1.43:1' | '1.66:1' | '1.85:1' | '2.00:1' | '2.20:1' | '2.35:1' | '2.39:1'

export const ASPECTS: Record<Aspect, number> = {
  '16:9': 16 / 9, '9:16': 9 / 16, '4:3': 4 / 3, '3:4': 3 / 4, '1:1': 1,
  '3:2': 3 / 2, '2:3': 2 / 3, '4:5': 4 / 5, '9:19.5': 9 / 19.5, '9:21': 9 / 21,
  '1.33:1': 1.33, '1.37:1': 1.37, '1.43:1': 1.43, '1.66:1': 1.66, '1.85:1': 1.85,
  '2.00:1': 2.0, '2.20:1': 2.2, '2.35:1': 2.35, '2.39:1': 2.39,
}

/** 画幅比例菜单顺序(对齐原站) */
export const ASPECT_LIST = Object.keys(ASPECTS) as Aspect[]

export interface PlacementSpec {
  name: string
  kind: Kind
  prim: Prim
  color: string
  height?: number
  modelUrl?: string
  focalMm?: number
}

export interface Toast { id: number; text: string }

/* ─── Agent / 故事板 / 灯光 / 运镜 / 模型库 ───────────────────── */

export type LightType = 'softbox' | 'key' | 'fill' | 'rim' | 'sun' | 'spot' | 'point'

export interface LightDef {
  id: string
  name: string
  type: LightType
  color: string
  intensity: number
  /** 水平方向角(度) */
  angle: number
  /** 高度(米) */
  height: number
  /** 柔化程度 0–1(0=硬光,1=极柔) */
  softness: number
  enabled: boolean
}

export type PathKind =
  | 'push' | 'pull' | 'orbit' | 'craneUp' | 'craneDown'
  | 'panLeft' | 'panRight' | 'tiltUp' | 'tiltDown'
  | 'truckLeft' | 'truckRight' | 'dollyZoom' | 'handheld'

export interface CameraPath { id: string; kind: PathKind; name: string; duration: number; radius?: number }

export interface Shot {
  id: string
  kind: 'image' | 'video'
  url: string
  name: string
  createdAt: number
  meta?: string
  path?: PathKind
  focalMm?: number
  /** 分镜序号(由镜头轨生成时写入) */
  index?: number
  /** 出画机位名 */
  camName?: string
  /** 该镜在时间轴上的起点 / 时长(秒) */
  t0?: number
  dur?: number
  /** 分镜说明(可编辑) */
  note?: string
}

export interface AgentToolCall {
  name: string
  args: Record<string, unknown>
  result?: string
  ok?: boolean
}

export interface AgentMsg {
  id: string
  role: 'user' | 'agent' | 'tool'
  text: string
  at: number
  tool?: AgentToolCall
}

export interface ModelDef {
  id: string
  name: string
  category: string
  prim: Prim
  color: string
  height?: number
  tags: string[]
  /** GLB 白模地址(可选,entered 后真实加载) */
  modelUrl?: string
}

export const FOCALS = [8, 16, 24, 35, 50, 85, 135, 400] as const

export const emptyDelta = (): StateDelta => ({ additions: [], removals: [], overrides: {} })

// ─── 场景默认内容(对齐原站:4 机位、2 角色、立方体、树) ──────────────────
let nid = 0
export const uid = () => `e${Date.now().toString(36)}-${++nid}`

export const baseScene = (): Entity[] => [
  { id: 'cam1', name: '摄像机 1', kind: 'camera', prim: 'camera', color: '#3a3a40', position: [-3.2, 0, 3.0], rotationY: 0.6, scale: 1, focalMm: 32,
    initial: { position: [-3.2, 0, 3.0], rotationY: 0.6, scale: 1 } },
  { id: 'cam2', name: '摄像机 2', kind: 'camera', prim: 'camera', color: '#3a3a40', position: [3.4, 0, 2.6], rotationY: -0.5, scale: 1, focalMm: 32,
    initial: { position: [3.4, 0, 2.6], rotationY: -0.5, scale: 1 } },
  { id: 'cam3', name: '摄像机 3', kind: 'camera', prim: 'camera', color: '#3a3a40', position: [4.6, 0, -1.2], rotationY: -1.6, scale: 1, focalMm: 116,
    initial: { position: [4.6, 0, -1.2], rotationY: -1.6, scale: 1 } },
  { id: 'cam4', name: '摄像机 4', kind: 'camera', prim: 'camera', color: '#3a3a40', position: [5.2, 0, 0.4], rotationY: -2.2, scale: 1, focalMm: 78,
    initial: { position: [5.2, 0, 0.4], rotationY: -2.2, scale: 1 } },
  { id: 'actor1', name: '角色', kind: 'actor', prim: 'actor', color: '#a8bcd7', position: [-0.6, 0, 0.9], rotationY: 0.4, scale: 1, height: 1.7, pose: '地坐',
    initial: { position: [-0.6, 0, 0.9], rotationY: 0.4, scale: 1 } },
  { id: 'actor2', name: '角色 2', kind: 'actor', prim: 'actor', color: '#ffc7d6', position: [2.3, 0.5, 1.1], rotationY: -0.7, scale: 1, height: 1.7, pose: '坐椅',
    initial: { position: [2.3, 0.5, 1.1], rotationY: -0.7, scale: 1 } },
  { id: 'cube1', name: '立方体', kind: 'prop', prim: 'box', color: '#f2f2f2', position: [2.3, 0, 1.1], rotationY: 0.2, scale: 1,
    initial: { position: [2.3, 0, 1.1], rotationY: 0.2, scale: 1 } },
  { id: 'tree1', name: '树', kind: 'prop', prim: 'tree', color: '#3e7a3a', position: [-0.2, 0, -0.6], rotationY: 0, scale: 1.6, height: 4.5,
    initial: { position: [-0.2, 0, -0.6], rotationY: 0, scale: 1.6 } },
]

export const LS = {
  resolution: 'tapnow.threeDWorkspace.renderResolution',
  speed: 'tapnow.threeDWorkspace.cameraMoveSpeedMultiplier',
  guide: 'tapnow.threeDWorkspace.guideRotation.v2',
  scene: 'tap-replica.scene.v1',
} as const

export const entityAnchorY = (e: Entity): number => {
  if (e.kind === 'actor') return (e.height ?? 1.7) * e.scale + 0.35
  if (e.kind === 'camera') return 1.5 * e.scale + 0.25
  if (e.prim === 'tree') return 4.6 * e.scale
  return 1 * e.scale + 0.25
}
