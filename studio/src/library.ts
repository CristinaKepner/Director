import { CameraPath, LightDef, ModelDef, PathKind } from './types'

/* ─── 内置模型库(可直接放置 / 可被 Agent 调度) ─────────────────── */

export const MODEL_LIBRARY: ModelDef[] = [
  // 基础几何体
  { id: 'm-cube', name: '立方体', category: '几何体', prim: 'box', color: '#d8d8dc', tags: ['cube', 'box', '方块', '立方体'] },
  { id: 'm-sphere', name: '球', category: '几何体', prim: 'sphere', color: '#d8d8dc', tags: ['sphere', 'ball', '球', '圆球'] },
  { id: 'm-cylinder', name: '圆柱体', category: '几何体', prim: 'cylinder', color: '#d8d8dc', tags: ['cylinder', '圆柱', '柱体'] },
  { id: 'm-cone', name: '圆锥体', category: '几何体', prim: 'cone', color: '#d8d8dc', tags: ['cone', '圆锥', '锥体'] },
  // 自然
  { id: 'm-tree', name: '树', category: '自然', prim: 'tree', color: '#5f9e4a', tags: ['tree', '树', '植物', '绿植'], modelUrl: '/models/Tree.glb' },
  { id: 'm-rock', name: '岩石', category: '自然', prim: 'rock', color: '#8d8d95', tags: ['rock', '岩石', '石头'], modelUrl: '/models/Rock.glb' },
  { id: 'm-plant', name: '盆栽', category: '自然', prim: 'plant', color: '#4f8f3f', tags: ['plant', '盆栽', '绿植'], modelUrl: '/models/Bush.glb' },
  // 道具
  { id: 'm-crate', name: '木箱', category: '道具', prim: 'crate', color: '#b08a5a', tags: ['crate', '木箱', '箱子'], modelUrl: '/models/Box.glb' },
  { id: 'm-lamp', name: '路灯', category: '道具', prim: 'lamp', color: '#f5d20f', tags: ['lamp', '路灯', '灯'] },
  { id: 'm-chair', name: '椅子', category: '道具', prim: 'chair', color: '#c9a26b', tags: ['chair', '椅子', '座位'], modelUrl: '/models/Chair.glb' },
  { id: 'm-table', name: '桌子', category: '道具', prim: 'table', color: '#b98d5c', tags: ['table', '桌子', '台子'], modelUrl: '/models/Table.glb' },
  { id: 'm-sofa', name: '沙发', category: '道具', prim: 'sofa', color: '#7b8fa8', tags: ['sofa', '沙发'], modelUrl: '/models/Sofa.glb' },
  { id: 'm-fence', name: '围栏', category: '道具', prim: 'fence', color: '#9a8b73', tags: ['fence', '围栏', '栅栏'], modelUrl: '/models/Fence.glb' },
  { id: 'm-sign', name: '标志牌', category: '道具', prim: 'sign', color: '#e2e2e6', tags: ['sign', '标志', '牌子'] },
  { id: 'm-arch', name: '拱门', category: '道具', prim: 'arch', color: '#cfcfd4', tags: ['arch', '拱门', '门'] },
  { id: 'm-stairs', name: '台阶', category: '道具', prim: 'stairs', color: '#b9b9bf', tags: ['stairs', '台阶', '楼梯'] },
  // 角色 / 摄像机
  { id: 'm-actor', name: '角色', category: '角色', prim: 'actor', color: '#6f93c8', height: 1.7, tags: ['actor', '角色', '人物', '人'] },
  { id: 'm-robot', name: '机器人', category: '角色', prim: 'actor', color: '#9a9aa2', height: 1.8, tags: ['robot', '机器人'] },
  { id: 'm-camera', name: '摄像机', category: '摄像机', prim: 'camera', color: '#2b2b30', tags: ['camera', '摄像机', '机位'] },
]

export const modelById = (id: string) => MODEL_LIBRARY.find(m => m.id === id)
export const findModel = (q: string): ModelDef | undefined => {
  const s = q.trim().toLowerCase()
  if (!s) return undefined
  return (
    MODEL_LIBRARY.find(m => m.name === q.trim() || m.id === s) ??
    MODEL_LIBRARY.find(m => m.name.includes(q.trim())) ??
    MODEL_LIBRARY.find(m => m.tags.some(t => s.includes(t.toLowerCase()) || t.toLowerCase().includes(s)))
  )
}

/* ─── 预制专业运镜路径 ────────────────────────────────────────── */

export const PATH_PRESETS: CameraPath[] = [
  { id: 'p-push', kind: 'push', name: '推镜(推近)', duration: 3 },
  { id: 'p-pull', kind: 'pull', name: '拉镜(拉远)', duration: 3 },
  { id: 'p-orbit', kind: 'orbit', name: '环绕', duration: 4, radius: 4 },
  { id: 'p-crane-up', kind: 'craneUp', name: '升降(升)', duration: 3 },
  { id: 'p-crane-down', kind: 'craneDown', name: '升降(降)', duration: 3 },
  { id: 'p-pan-left', kind: 'panLeft', name: '摇镜(左摇)', duration: 3 },
  { id: 'p-pan-right', kind: 'panRight', name: '摇镜(右摇)', duration: 3 },
  { id: 'p-tilt-up', kind: 'tiltUp', name: '俯仰(上仰)', duration: 2.5 },
  { id: 'p-tilt-down', kind: 'tiltDown', name: '俯仰(下俯)', duration: 2.5 },
  { id: 'p-truck-left', kind: 'truckLeft', name: '横移(左)', duration: 3 },
  { id: 'p-truck-right', kind: 'truckRight', name: '横移(右)', duration: 3 },
  { id: 'p-dolly-zoom', kind: 'dollyZoom', name: '滑动变焦(眩晕)', duration: 3 },
  { id: 'p-handheld', kind: 'handheld', name: '手持晃动', duration: 4 },
]

export const pathById = (id: string) => PATH_PRESETS.find(p => p.id === id)
export const findPath = (q: string): CameraPath | undefined => {
  const s = q.trim()
  if (!s) return undefined
  return PATH_PRESETS.find(p => p.name.includes(s) || p.kind === s || p.id === s)
}

/* ─── 灯光 ────────────────────────────────────────────────────── */

export const DEFAULT_LIGHTS: LightDef[] = [
  { id: 'l-key', name: '主光', type: 'softbox', color: '#fff6e8', intensity: 1.7, angle: 35, height: 4.2, softness: 0.8, enabled: true },
  { id: 'l-fill', name: '补光', type: 'fill', color: '#e8f0ff', intensity: 0.8, angle: -55, height: 2.6, softness: 0.9, enabled: true },
  { id: 'l-rim', name: '轮廓光', type: 'rim', color: '#ffffff', intensity: 1.4, angle: 150, height: 3.4, softness: 0.5, enabled: false },
]

export interface LightPreset { id: string; name: string; lights: Omit<LightDef, 'id'>[] }
export const LIGHT_PRESETS: LightPreset[] = [
  {
    id: 'lp-softbox', name: '柔光影棚',
    lights: [
      { name: '主光', type: 'softbox', color: '#fff6e8', intensity: 1.7, angle: 35, height: 4.2, softness: 0.8, enabled: true },
      { name: '补光', type: 'fill', color: '#e8f0ff', intensity: 0.8, angle: -55, height: 2.6, softness: 0.9, enabled: true },
      { name: '轮廓光', type: 'rim', color: '#ffffff', intensity: 1.2, angle: 150, height: 3.4, softness: 0.5, enabled: false },
    ],
  },
  {
    id: 'lp-three', name: '三点布光',
    lights: [
      { name: '主光', type: 'key', color: '#fff4e0', intensity: 2.6, angle: 45, height: 3.6, softness: 0.4, enabled: true },
      { name: '补光', type: 'fill', color: '#dfe9ff', intensity: 1.0, angle: -60, height: 2.2, softness: 0.6, enabled: true },
      { name: '轮廓光', type: 'rim', color: '#ffffff', intensity: 1.8, angle: 165, height: 3.2, softness: 0.3, enabled: true },
    ],
  },
  {
    id: 'lp-sunset', name: '黄昏暖光',
    lights: [
      { name: '夕阳', type: 'sun', color: '#ffb066', intensity: 2.4, angle: 110, height: 6, softness: 0.2, enabled: true },
      { name: '环境补光', type: 'fill', color: '#8fa8d8', intensity: 0.5, angle: -80, height: 2, softness: 1, enabled: true },
    ],
  },
  {
    id: 'lp-night', name: '夜景单灯',
    lights: [
      { name: '月光', type: 'spot', color: '#9fb6ff', intensity: 1.2, angle: 120, height: 5, softness: 0.6, enabled: true },
      { name: '道具光', type: 'point', color: '#ffd08a', intensity: 1.6, angle: 0, height: 1.2, softness: 1, enabled: true },
    ],
  },
  {
    id: 'lp-hard', name: '单侧硬光',
    lights: [
      { name: '硬光', type: 'spot', color: '#ffffff', intensity: 3.2, angle: 70, height: 4.5, softness: 0.05, enabled: true },
      { name: '反射补光', type: 'fill', color: '#cfd8e8', intensity: 0.35, angle: -100, height: 1.8, softness: 1, enabled: true },
    ],
  },
  {
    id: 'lp-daylight', name: '正午日光',
    lights: [
      { name: '日光', type: 'sun', color: '#fff8ec', intensity: 3.0, angle: 100, height: 8, softness: 0.15, enabled: true },
      { name: '天光补光', type: 'fill', color: '#cfe0ff', intensity: 0.7, angle: -70, height: 3.5, softness: 0.9, enabled: true },
    ],
  },
  {
    id: 'lp-tungsten', name: '钨丝暖调',
    lights: [
      { name: '钨丝主光', type: 'key', color: '#ffb46a', intensity: 2.2, angle: 40, height: 3.2, softness: 0.5, enabled: true },
      { name: '冷色轮廓', type: 'rim', color: '#9fb6ff', intensity: 1.1, angle: 160, height: 3.0, softness: 0.4, enabled: true },
      { name: '环境底子', type: 'fill', color: '#5a4a3a', intensity: 0.35, angle: -90, height: 1.6, softness: 1, enabled: true },
    ],
  },
]

export const LIGHT_TYPE_LABEL: Record<string, string> = {
  softbox: '柔光箱', key: '主光', fill: '补光', rim: '轮廓光', sun: '日光', spot: '聚光', point: '点光',
}

/* ─── HDRI 环境光照预设(对齐原站「选择光照」列表) ─────────────── */

export interface HdriPreset {
  id: string
  name: string
  /** 上/中/下三色渐变,用于程序化生成环境贴图 */
  sky: [string, string, string]
  /** 环境光强度 */
  intensity: number
  /** 主光方向(度)与色温倾向 */
  sun: { color: string; intensity: number; elevation: number }
}

export const HDRI_PRESETS: HdriPreset[] = [
  { id: 'softbox', name: '柔光影棚', sky: ['#f2f4f8', '#e6e8ee', '#cfd2da'], intensity: 1.0, sun: { color: '#fff6e8', intensity: 1.6, elevation: 45 } },
  { id: 'bright-indoor', name: '明亮室内', sky: ['#ffffff', '#f0f0f4', '#dcdce4'], intensity: 1.15, sun: { color: '#ffffff', intensity: 1.2, elevation: 60 } },
  { id: 'sunny-outdoor', name: '晴天户外', sky: ['#8fc4ff', '#d8ecff', '#c8c4b0'], intensity: 1.1, sun: { color: '#fff2d6', intensity: 2.6, elevation: 55 } },
  { id: 'soft-street', name: '柔和街景', sky: ['#c8d4e2', '#dfe6ee', '#9a9aa0'], intensity: 1.0, sun: { color: '#eef2ff', intensity: 1.1, elevation: 35 } },
  { id: 'golden-hour', name: '金色时刻', sky: ['#ffd9a0', '#ffc07a', '#8f7a68'], intensity: 0.95, sun: { color: '#ffb066', intensity: 2.2, elevation: 12 } },
  { id: 'night-street', name: '夜间街道', sky: ['#1b2340', '#2a3358', '#0e1020'], intensity: 0.5, sun: { color: '#9fb6ff', intensity: 0.7, elevation: 70 } },
]

export const hdriById = (id: string) => HDRI_PRESETS.find(h => h.id === id) ?? HDRI_PRESETS[0]

export const PATH_KIND_LABEL: Record<PathKind, string> = {
  push: '推镜', pull: '拉镜', orbit: '环绕', craneUp: '升镜', craneDown: '降镜',
  panLeft: '左摇', panRight: '右摇', tiltUp: '上仰', tiltDown: '下俯',
  truckLeft: '左横移', truckRight: '右横移', dollyZoom: '滑动变焦', handheld: '手持',
}
