import { create } from 'zustand'
import { useMemo } from 'react'
import {
  Aspect, AgentMsg, CameraPath, Entity, FOCALS, Keyframe, LightKey, LS, LightDef, Mode, ModelDef, PanelKey, PlacementSpec,
  Cut, Prim, SceneState, Shot, StateDelta, Toast, Vec3, baseScene, emptyDelta, uid,
} from './types'
import { DEFAULT_LIGHTS, LIGHT_PRESETS, MODEL_LIBRARY, PATH_PRESETS, pathById } from './library'

interface Snapshot {
  baseEntities: Entity[]
  states: SceneState[]
  blocking: Record<string, Vec3[]>
  blockingClosed: Record<string, boolean>
  blockingSeg: Record<string, number[]>
  keys: Record<string, Keyframe[]>
  lightKeys: LightKey[]
  label: string
}

export type SidebarTab = 'agent' | 'light' | 'path' | 'library'

interface StudioStore {
  /** 每次实体集合或属性变更自增,供渲染层比对重建 */
  sceneVersion: number
  // 场景数据
  baseEntities: Entity[]
  states: SceneState[]
  /** 'baseline' 表示正在编辑场景基准 */
  activeStateId: string
  selection: string | null
  mode: Mode
  focalIdx: number
  aspect: Aspect
  viewfinder: boolean
  placement: { spec: PlacementSpec; scaleMul: number; ground: Vec3 | null } | null
  pendingGround: Vec3 | null
  openPanel: PanelKey | null
  shortcutsOpen: boolean
  placementMenuOpen: boolean
  moreMenuFor: string | null
  camChipMenuFor: string | null
  hintDismissed: boolean
  showTips: boolean
  tip: string | null
  timeline: { open: boolean; playing: boolean; loop: boolean; time: number; duration: number; selectedKey: number | null; rate: number }
  /** 色调映射与曝光 */
  grade: { tone: 'none' | 'aces' | 'filmic' | 'reinhard'; exposure: number }
  /** 角色走位路径:实体 id → 地面路点 */
  blocking: Record<string, Vec3[]>
  /** 走位路径是否闭合成回路(末点回到起点) */
  blockingClosed: Record<string, boolean>
  /** 走位分段时长(秒,与段数等长);缺省 = 在时间轴内按弧长匀速。段时长>0 而段长为 0 = 原地停留 */
  blockingSeg: Record<string, number[]>
  /** 正在绘制走位的实体 */
  blockingFor: string | null
  /** 走位卡列表悬停的路点索引(3D 高亮联动) */
  pathHover: number | null
  /** 镜头轨:时间轴上的分镜(时间区间 → 机位),时间轴打开时优先于手动切台 */
  cuts: Cut[]
  /** 显示性能面板(FPS/绘制调用) */
  showFps: boolean
  /** 显示其他机位的视锥助手 */
  showFrustums: boolean
  /** 画中画放大档 */
  pipLarge: boolean
  /** 直接操纵模式:平移 / 旋转 */
  gizmoMode: 'translate' | 'rotate'
  keys: Record<string, Keyframe[]>
  lightKeys: LightKey[]
  moveSpeed: number
  /** 运镜播放参数:速度倍率 + 往返 + 缓动曲线 */
  pathOpts: { speed: number; pingPong: boolean; ease: 'linear' | 'in' | 'out' | 'inout' }
  invertY: boolean
  wheelZoom: boolean
  resolution: string
  settingsPage: 'root' | 'resolution' | 'mouse'
  env: {
    stage: 'blank' | 'room' | 'scene3d'
    groundH: number
    groundSize: number
    grid: boolean
    light: 'studio' | 'natural' | 'night'
    lightDir: number
    bg: 'none' | 'same' | 'pano'
    /** HDRI 预设 id 或 'custom' */
    hdri: string
    /** 房间参数 */
    room: { w: number; d: number; h: number; pattern: 'plain' | 'standard' | 'calibration'; spacing: number }
    /** 全景图 data/blob URL */
    pano: string | null
  }
  genAssets: { id: string; name: string; prim: Prim; color: string }[]
  toasts: Toast[]
  past: Snapshot[]
  future: Snapshot[]

  // 派生
  effectiveEntities: () => Entity[]
  getEntity: (id: string) => Entity | undefined

  // 操作
  select: (id: string | null) => void
  clickChip: (id: string) => void
  setMode: (m: Mode) => void
  setFocalIdx: (i: number) => void
  stepFocal: (d: 1 | -1) => void
  setAspect: (a: Aspect) => void
  setViewfinder: (v: boolean) => void
  openP: (p: PanelKey | null) => void
  toggleP: (p: PanelKey) => void
  setShortcuts: (v: boolean) => void
  setPlacementMenu: (v: boolean) => void
  startPlacement: (spec: PlacementSpec) => void
  setPlacementGround: (g: Vec3 | null) => void
  scalePlacement: (d: number) => void
  confirmPlacement: () => void
  cancelPlacement: () => void
  setPendingGround: (g: Vec3 | null) => void

  snapshot: (label: string) => void
  undo: () => void
  redo: () => void
  commitEntity: (id: string, patch: Partial<Entity>, label?: string) => void
  /** 无历史记录的姿态微调键盘操控) */
  nudge: (id: string, dx: number, dy: number, dz: number) => void
  removeEntity: (id: string) => void
  duplicateEntity: (id: string) => void
  resetPlacementOf: (id: string) => void
  renameEntity: (id: string, name: string) => void
  dropToGround: (id: string) => void

  setActiveState: (id: string, enterBaseline?: boolean) => void
  editBaseline: () => void
  addState: () => void
  dupState: (id: string) => void
  renameState: (id: string) => void
  delState: (id: string) => void

  dismissHint: () => void
  setShowTips: (v: boolean) => void
  setTip: (t: string | null) => void
  setTimeline: (p: Partial<StudioStore['timeline']>) => void
  addKeyframeFor: (id: string) => void
  addLightKey: () => void
  removeLightKey: (t: number) => void
  clearLightKeys: () => void
  setGizmoMode: (m: StudioStore['gizmoMode']) => void
  /** gizmo 拖拽中的静默写回(不进历史,松手统一 snapshot) */
  transformSilent: (id: string, patch: Partial<Entity>) => void
  setPathOpts: (p: Partial<StudioStore['pathOpts']>) => void
  setGrade: (p: Partial<StudioStore['grade']>) => void
  setShowFps: (v: boolean) => void
  setShowFrustums: (v: boolean) => void
  togglePipLarge: () => void
  startBlocking: (id: string) => void
  addBlockingPoint: (p: Vec3) => void
  clearBlocking: (id: string) => void
  endBlocking: () => void
  removeKeyframeFor: (id: string, t: number) => void
  setBlockingPoint: (id: string, index: number, p: Vec3) => void
  removeBlockingPoint: (id: string, index: number) => void
  insertBlockingPoint: (id: string, index: number, p: Vec3) => void
  reverseBlocking: (id: string) => void
  densifyBlocking: (id: string) => void
  toggleBlockingClosed: (id: string) => void
  setBlockSeg: (id: string, index: number, dur: number) => void
  setPathHover: (i: number | null) => void
  addCut: (t0: number, t1: number, camId: string) => void
  updateCut: (id: string, patch: Partial<Omit<Cut, 'id'>>) => void
  removeCut: (id: string) => void
  clearCuts: () => void
  faceToFace: (id: string, otherId: string) => void
  sampleEntityAt: (id: string, t: number) => Entity | undefined

  setMoveSpeed: (v: number) => void
  setResolution: (r: string) => void
  setSettingsPage: (p: StudioStore['settingsPage']) => void
  setInvertY: (v: boolean) => void
  setWheelZoom: (v: boolean) => void
  setEnv: (p: Partial<StudioStore['env']>) => void
  fakeGenerate: (name: string) => void
  toast: (text: string) => void
  resetView: () => void

  /* ── Agent 侧边栏 ─────────────────────────────────────────── */
  agentOpen: boolean
  sidebarTab: SidebarTab
  agentMessages: AgentMsg[]
  agentBusy: boolean
  setAgentOpen: (v: boolean) => void
  setSidebarTab: (t: SidebarTab) => void
  pushAgentMsg: (m: Omit<AgentMsg, 'id' | 'at'>) => void
  setAgentBusy: (v: boolean) => void
  clearAgent: () => void

  /* ── 故事板 ───────────────────────────────────────────────── */
  storyboardOpen: boolean
  shots: Shot[]
  setStoryboardOpen: (v: boolean) => void
  addShot: (s: Omit<Shot, 'id' | 'createdAt'>) => Shot
  removeShot: (id: string) => void
  renameShot: (id: string, name: string) => void
  setShotNote: (id: string, note: string) => void

  /* ── 灯光 ─────────────────────────────────────────────────── */
  lights: LightDef[]
  addLight: (p?: Partial<LightDef>) => string
  updateLight: (id: string, patch: Partial<LightDef>) => void
  removeLight: (id: string) => void
  applyLightPreset: (presetId: string) => void

  /* ── 运镜路径 ─────────────────────────────────────────────── */
  activePath: CameraPath | null
  runPath: (id: string) => void
  stopPath: () => void

  /* ── 录制 ─────────────────────────────────────────────────── */
  recording: boolean
  setRecording: (v: boolean) => void

  /* ── 模型库 ───────────────────────────────────────────────── */
  library: ModelDef[]
  libraryOpen: boolean
  setLibraryOpen: (v: boolean) => void

  /* ── 对象操控模式(操控角色/物品) ───────────────────────────── */
  controlId: string | null
  setControl: (id: string | null) => void
  /** 环境二级资源面板 */
  envRes: 'room' | 'scene3d' | 'light' | 'pano' | null
  setEnvRes: (v: StudioStore['envRes']) => void
}

const readLS = <T,>(k: string, d: T): T => {
  try { const v = localStorage.getItem(k); return v == null ? d : (JSON.parse(v) as T) } catch { return d }
}
const writeLS = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* noop */ } }

const SAMPLE_LIB: { name: string; prim: Prim; color: string }[] = [
  { name: '岩石', prim: 'rock', color: '#8d8d95' },
  { name: '木箱', prim: 'crate', color: '#b08a5a' },
  { name: '路灯', prim: 'lamp', color: '#f5d20f' },
]


export const useStudio = create<StudioStore>()((set, get) => {
  const st0: SceneState = { id: 's0', name: '示例状态', delta: emptyDelta() }
  // 两个附加示例状态:展示走位 + 多机位
  const stWalk: SceneState = {
    id: 's-demo-walk', name: '走位示例',
    delta: {
      additions: [], removals: [],
      overrides: { actor1: { position: [-2.4, 0, 2.2], rotationY: 0.1, pose: '站立' }, 'cam1': { focalMm: 35 } },
    },
  }
  const stMulti: SceneState = {
    id: 's-demo-multi', name: '多机位示例',
    delta: {
      additions: [
        { id: 'cam2b', name: '摄像机 B', kind: 'camera', prim: 'camera', color: '#2b2b30', position: [3.2, 0, 4.4], rotationY: -2.2, scale: 1, focalMm: 50 },
        { id: 'lamp1', name: '路灯', kind: 'prop', prim: 'lamp', color: '#d8d8dc', position: [-3.4, 0, -2.2], rotationY: 0, scale: 1 },
      ],
      removals: [],
      overrides: { actor2: { pose: '站立' } },
    },
  }

  // 结果缓存:结构只随 sceneVersion / activeStateId 变化,tick 每帧调用不再重复分配
  let effKey = ''
  let effVal: Entity[] | null = null
  const eff = (s: StudioStore): Entity[] => {
    const key = s.sceneVersion + '|' + s.activeStateId
    if (effVal && key === effKey) return effVal
    let out: Entity[]
    if (s.activeStateId === 'baseline') out = s.baseEntities
    else {
      const st = s.states.find(x => x.id === s.activeStateId)
      out = !st ? s.baseEntities : [
        ...s.baseEntities
          .filter(e => !st.delta.removals.includes(e.id))
          .map(e => (st.delta.overrides[e.id] ? { ...e, ...st.delta.overrides[e.id] } as Entity : e)),
        ...st.delta.additions,
      ]
    }
    effKey = key
    effVal = out
    return out
  }

  const snapOf = (s: StudioStore, label: string): Snapshot => ({
    label,
    baseEntities: JSON.parse(JSON.stringify(s.baseEntities)),
    states: JSON.parse(JSON.stringify(s.states)),
    blocking: JSON.parse(JSON.stringify(s.blocking)),
    blockingClosed: { ...s.blockingClosed },
    blockingSeg: { ...s.blockingSeg },
    keys: JSON.parse(JSON.stringify(s.keys)),
    lightKeys: JSON.parse(JSON.stringify(s.lightKeys)),
  })

  const push = (label: string) => set(s => ({ past: [...s.past.slice(-49), snapOf(s, label)], future: [] }))

  /** 在当前作用域(基准 or 状态)内修改实体 */
  const mutateEntity = (id: string, patch: Partial<Entity>) => set(s => {
    if (s.activeStateId === 'baseline') {
      return { sceneVersion: s.sceneVersion + 1, baseEntities: s.baseEntities.map(e => (e.id === id ? { ...e, ...patch } as Entity : e)) }
    }
    if (s.baseEntities.some(e => e.id === id)) {
      const states = s.states.map(st => st.id === s.activeStateId
        ? { ...st, delta: { ...st.delta, overrides: { ...st.delta.overrides, [id]: { ...st.delta.overrides[id], ...patch } } } }
        : st)
      return { sceneVersion: s.sceneVersion + 1, states }
    }
    const states = s.states.map(st => st.id === s.activeStateId
      ? { ...st, delta: { ...st.delta, additions: st.delta.additions.map(e => (e.id === id ? { ...e, ...patch } as Entity : e)) } }
      : st)
    return { sceneVersion: s.sceneVersion + 1, states }
  })

  return {
    sceneVersion: 0,
    baseEntities: baseScene(),
    states: [st0, stWalk, stMulti],
    activeStateId: st0.id,
    selection: null,
    mode: { type: '3d' },
    focalIdx: 2, // 24mm
    aspect: '16:9',
    viewfinder: false,
    placement: null,
    pendingGround: null,
    openPanel: null,
    shortcutsOpen: false,
    placementMenuOpen: false,
    moreMenuFor: null,
    camChipMenuFor: null,
    hintDismissed: readLS(LS.guide, false),
    showTips: readLS('tap-replica.showTips', true),
    tip: null,
    timeline: { open: false, playing: false, loop: false, time: 0, duration: 3, selectedKey: null, rate: 1 },
    grade: { tone: 'none', exposure: 1 },
    blocking: {},
    blockingClosed: {},
    blockingSeg: {},
    blockingFor: null,
    pathHover: null,
    cuts: [],
    showFps: false,
    showFrustums: false,
    pipLarge: false,
    gizmoMode: 'translate',
    keys: {},
    lightKeys: [],
    pathOpts: { speed: 1, pingPong: false, ease: 'inout' },
    moveSpeed: readLS(LS.speed, 0.28),
    invertY: false,
    wheelZoom: true,
    resolution: readLS(LS.resolution, '1K'),
    settingsPage: 'root',
    env: {
      stage: 'blank', groundH: -1.7, groundSize: 20, grid: true, light: 'studio', lightDir: 0, bg: 'none',
      hdri: 'softbox', room: { w: 5, d: 12, h: 3.2, pattern: 'standard', spacing: 0.5 }, pano: null,
    },
    genAssets: [],
    toasts: [],
    past: [],
    future: [],

    effectiveEntities: () => eff(get()),
    getEntity: (id) => eff(get()).find(e => e.id === id),

    select: (id) => set(s => {
      const e = id ? s.effectiveEntities().find(x => x.id === id) : undefined
      if (id && !e) return { selection: null, moreMenuFor: null, tip: null }
      return {
        selection: id,
        moreMenuFor: null,
        tip: id && e?.kind === 'actor' && get().showTips && !get().hintDismissed ? '双击角色可以围绕它查看' : null,
      }
    }),
    clickChip: (id) => {
      const e = get().getEntity(id)
      if (!e) return
      if (e.kind === 'camera') {
        set({ mode: { type: 'cam', id }, selection: id, camChipMenuFor: null, tip: null })
        get().toast('操控摄像机')
      } else {
        set({ selection: id, camChipMenuFor: null })
      }
    },
    setMode: (m) => set(s => ({
      mode: m,
      selection: m.type === 'cam' ? m.id : (m.type === '3d' ? null : s.selection),
      placement: null, placementMenuOpen: false, camChipMenuFor: null,
    })),
    setFocalIdx: (i) => set({ focalIdx: Math.max(0, Math.min(FOCALS.length - 1, i)) }),
    stepFocal: (d) => get().setFocalIdx(get().focalIdx + d),
    setAspect: (a) => set({ aspect: a }),
    setViewfinder: (v) => set({ viewfinder: v, placement: null, placementMenuOpen: false }),

    openP: (p) => set({ openPanel: p, settingsPage: 'root' }),
    toggleP: (p) => set(s => ({ openPanel: s.openPanel === p ? null : p, settingsPage: 'root' })),
    setShortcuts: (v) => set({ shortcutsOpen: v }),
    setPlacementMenu: (v) => set({ placementMenuOpen: v }),

    startPlacement: (spec) => {
      get().toast('正在下载 3D 资产...')
      set(s => ({
        placement: { spec, scaleMul: 1, ground: s.pendingGround },
        placementMenuOpen: false, pendingGround: null, openPanel: null,
      }))
    },
    setPlacementGround: (g) => set(s => (s.placement ? { placement: { ...s.placement, ground: g } } : {})),
    scalePlacement: (d) => set(s => (s.placement ? { placement: { ...s.placement, scaleMul: Math.max(0.3, s.placement.scaleMul + d * 0.0016) } } : {})),

    confirmPlacement: () => {
      const s = get()
      if (!s.placement || !s.placement.ground) return
      const { spec, scaleMul, ground } = s.placement
      const pos: Vec3 = [ground[0], ground[1] - s.env.groundH, ground[2]]
      push(`放置 ${spec.name}`)
      const existingCount = s.effectiveEntities().filter(e => e.name.startsWith(spec.name)).length
      const name = existingCount ? `${spec.name} ${existingCount + 1}` : spec.name
      const e: Entity = {
        id: uid(), name, kind: spec.kind, prim: spec.prim, color: spec.color,
        position: pos, rotationY: 0, scale: scaleMul, height: spec.height,
        pose: spec.kind === 'actor' ? '站立' : undefined,
        focalMm: spec.kind === 'camera' ? (spec.focalMm ?? 24) : undefined,
        userModelUrl: spec.modelUrl,
        initial: { position: pos, rotationY: 0, scale: scaleMul },
      }
      if (s.activeStateId === 'baseline') {
        set(x => ({ sceneVersion: x.sceneVersion + 1, baseEntities: [...x.baseEntities, e] }))
      } else {
        set(x => ({
          sceneVersion: x.sceneVersion + 1,
          states: x.states.map(st => st.id === x.activeStateId
            ? { ...st, delta: { ...st.delta, additions: [...st.delta.additions, e] } } : st),
        }))
      }
      set({ placement: null, selection: e.id })
    },
    cancelPlacement: () => set({ placement: null }),
    setPendingGround: (g) => set({ pendingGround: g, placementMenuOpen: true }),

    snapshot: (label) => push(label),
    undo: () => set(s => {
      const prev = s.past[s.past.length - 1]
      if (!prev) return {}
      return {
        sceneVersion: s.sceneVersion + 1,
        past: s.past.slice(0, -1),
        future: [...s.future, snapOf(s, 'redo')],
        baseEntities: prev.baseEntities,
        states: prev.states,
        blocking: prev.blocking,
        blockingClosed: prev.blockingClosed,
        blockingSeg: prev.blockingSeg,
        keys: prev.keys,
        lightKeys: prev.lightKeys,
        selection: null,
      }
    }),
    redo: () => set(s => {
      const next = s.future[s.future.length - 1]
      if (!next) return {}
      return {
        sceneVersion: s.sceneVersion + 1,
        future: s.future.slice(0, -1),
        past: [...s.past, snapOf(s, 'undo')],
        baseEntities: next.baseEntities,
        states: next.states,
        blocking: next.blocking,
        blockingClosed: next.blockingClosed,
        blockingSeg: next.blockingSeg,
        keys: next.keys,
        lightKeys: next.lightKeys,
        selection: null,
      }
    }),

    commitEntity: (id, patch, label) => { push(label ?? '编辑对象'); mutateEntity(id, patch) },
    nudge: (id, dx, dy, dz) => {
      const e = get().getEntity(id)
      if (!e) return
      mutateEntity(id, { position: [e.position[0] + dx, Math.max(0, e.position[1] + dy), e.position[2] + dz] })
    },
    removeEntity: (id) => {
      push('移除对象')
      set(s => {
        // 连带清理该对象的调度数据(走位/关键帧),避免悬空引用
        const blocking = { ...s.blocking }
        delete blocking[id]
        const blockingClosed = { ...s.blockingClosed }
        delete blockingClosed[id]
        const keys = { ...s.keys }
        delete keys[id]
        const orphan = {
          blocking, blockingClosed, keys,
          blockingFor: s.blockingFor === id ? null : s.blockingFor,
          controlId: s.controlId === id ? null : s.controlId,
          pathHover: null as number | null,
        }
        if (s.activeStateId === 'baseline') {
          if (s.baseEntities.some(e => e.id === id)) return { sceneVersion: s.sceneVersion + 1, baseEntities: s.baseEntities.filter(e => e.id !== id), selection: null, ...orphan }
          return {}
        }
        if (s.baseEntities.some(e => e.id === id)) {
          return {
            sceneVersion: s.sceneVersion + 1,
            states: s.states.map(st => st.id === s.activeStateId
              ? { ...st, delta: { ...st.delta, removals: [...st.delta.removals, id] } } : st),
            selection: null,
            ...orphan,
          }
        }
        return {
          sceneVersion: s.sceneVersion + 1,
          states: s.states.map(st => st.id === s.activeStateId
            ? { ...st, delta: { ...st.delta, additions: st.delta.additions.filter(e => e.id !== id) } } : st),
          selection: null,
          ...orphan,
        }
      })
    },
    duplicateEntity: (id) => {
      const e = get().getEntity(id)
      if (!e) return
      push('复制对象')
      const pos: Vec3 = [e.position[0] + 0.8, e.position[1], e.position[2] + 0.8]
      const copy: Entity = { ...JSON.parse(JSON.stringify(e)), id: uid(), name: dupName(e.name), position: pos, initial: { position: pos, rotationY: e.rotationY, scale: e.scale } }
      set(s => s.activeStateId === 'baseline'
        ? { sceneVersion: s.sceneVersion + 1, baseEntities: [...s.baseEntities, copy] }
        : { sceneVersion: s.sceneVersion + 1, states: s.states.map(st => st.id === s.activeStateId ? { ...st, delta: { ...st.delta, additions: [...st.delta.additions, copy] } } : st) })
      set({ selection: copy.id })
    },
    resetPlacementOf: (id) => {
      const e = get().getEntity(id)
      if (!e?.initial) return
      push('恢复初始摆放')
      mutateEntity(id, { position: e.initial.position, rotationY: e.initial.rotationY, scale: e.initial.scale })
    },
    renameEntity: (id, name) => { push('重命名'); mutateEntity(id, { name }) },
    dropToGround: (id) => { push('落到地面'); mutateEntity(id, { position: [get().getEntity(id)!.position[0], 0, get().getEntity(id)!.position[2]] }) },

    setActiveState: (id, enterBaseline) => set(s => ({
      sceneVersion: s.sceneVersion + 1,
      activeStateId: enterBaseline ? 'baseline' : id,
      selection: null, placement: null, placementMenuOpen: false,
    })),
    editBaseline: () => get().setActiveState('baseline', true),
    addState: () => {
      const s = get()
      push('新增状态')
      const cur = s.states.find(x => x.id === s.activeStateId)
      const delta: StateDelta = cur && s.activeStateId !== 'baseline'
        ? JSON.parse(JSON.stringify(cur.delta))
        : emptyDelta()
      const st: SceneState = { id: uid(), name: `状态 ${s.states.length + 1}`, delta }
      set(x => ({ sceneVersion: x.sceneVersion + 1, states: [...s.states, st], activeStateId: st.id, selection: null }))
    },
    dupState: (id) => {
      const s = get()
      const st = s.states.find(x => x.id === id)
      if (!st) return
      push('复制状态')
      const copy: SceneState = { id: uid(), name: dupName(st.name), delta: JSON.parse(JSON.stringify(st.delta)) }
      set(x => ({ sceneVersion: x.sceneVersion + 1, states: [...s.states, copy], activeStateId: copy.id }))
    },
    renameState: (id) => {
      const name = prompt('重命名状态', get().states.find(x => x.id === id)?.name ?? '')
      if (name) { push('重命名状态'); set(s => ({ states: s.states.map(x => x.id === id ? { ...x, name } : x) })) }
    },
    delState: (id) => {
      push('删除状态')
      set(s => {
        const states = s.states.filter(x => x.id !== id)
        return { sceneVersion: s.sceneVersion + 1, states, activeStateId: s.activeStateId === id ? (states[0]?.id ?? 'baseline') : s.activeStateId }
      })
    },

    dismissHint: () => { writeLS(LS.guide, true); set({ hintDismissed: true, tip: null }) },
    setShowTips: (v) => { writeLS('tap-replica.showTips', v); set({ showTips: v }) },
    setTip: (t) => set({ tip: t }),

    setTimeline: (p) => set(s => ({ timeline: { ...s.timeline, ...p } })),
    addKeyframeFor: (id) => {
      const s = get()
      const e = s.getEntity(id)
      if (!e) return
      push('添加关键帧')
      const k: Keyframe = {
        t: s.timeline.time, position: [...e.position] as Vec3, rotationY: e.rotationY, scale: e.scale,
        acting: e.acting, pose: e.pose, focalMm: e.focalMm,
      }
      const arr = [...(s.keys[id] ?? []), k].sort((a, b) => a.t - b.t)
      set({ keys: { ...s.keys, [id]: arr }, timeline: { ...s.timeline, selectedKey: null } })
    },
    removeKeyframeFor: (id, t) => set(s => ({ keys: { ...s.keys, [id]: (s.keys[id] ?? []).filter(k => Math.abs(k.t - t) > 1e-6) } })),
    addLightKey: () => {
      const s = get()
      const k: LightKey = { t: s.timeline.time, defs: s.lights.map(l => ({ id: l.id, intensity: l.intensity, color: l.color })) }
      const arr = [...s.lightKeys.filter(x => Math.abs(x.t - k.t) > 1e-6), k].sort((a, b) => a.t - b.t)
      set({ lightKeys: arr, timeline: { ...s.timeline, selectedKey: null } })
      s.toast(`已保存打光关键帧 @ ${k.t.toFixed(2)}s`)
    },
    removeLightKey: (t) => set(s => ({ lightKeys: s.lightKeys.filter(k => Math.abs(k.t - t) > 1e-6) })),
    clearLightKeys: () => set({ lightKeys: [] }),
    setPathOpts: (p) => set(s => ({ pathOpts: { ...s.pathOpts, ...p } })),
    setGrade: (p) => set(s => ({ grade: { ...s.grade, ...p } })),
    setShowFps: (v) => set({ showFps: v }),
    setShowFrustums: (v) => set({ showFrustums: v }),
    togglePipLarge: () => set(s => ({ pipLarge: !s.pipLarge })),
    setGizmoMode: (m) => set({ gizmoMode: m }),
    transformSilent: (id, patch) => mutateEntity(id, patch),
    startBlocking: (id) => {
      const had = (get().keys[id]?.length ?? 0) > 0
      set({ blockingFor: id, selection: id, placement: null, placementMenuOpen: false, tip: null })
      // 操作提示由底部上下文条呈现,这里只在有关键帧冲突时提醒
      if (had) get().toast('该角色已有关键帧:播放时走位接管位置,关键帧保留缩放/动作')
    },
    addBlockingPoint: (p) => set(s => {
      const id = s.blockingFor
      if (!id) return {}
      return { blocking: { ...s.blocking, [id]: [...(s.blocking[id] ?? []), p] } }
    }),
    clearBlocking: (id) => {
      push('清除走位')
      set(s => {
        const next = { ...s.blocking }
        delete next[id]
        const nextClosed = { ...s.blockingClosed }
        delete nextClosed[id]
        return { blocking: next, blockingClosed: nextClosed }
      })
    },
    setBlockingPoint: (id, index, p) => set(s => {
      const arr = s.blocking[id]
      if (!arr || index < 0 || index >= arr.length) return {}
      const next = [...arr]
      next[index] = p
      return { blocking: { ...s.blocking, [id]: next } }
    }),
    removeBlockingPoint: (id, index) => {
      push('删除走位点')
      set(s => {
        const arr = s.blocking[id]
        if (!arr || index < 0 || index >= arr.length) return {}
        const next = arr.filter((_, i) => i !== index)
        const blocking = { ...s.blocking }
        if (next.length) blocking[id] = next
        else delete blocking[id]
        const closed = { ...s.blockingClosed }
        if (next.length < 2) delete closed[id]
        return { blocking, blockingClosed: closed, sceneVersion: s.sceneVersion + 1 }
      })
    },
    insertBlockingPoint: (id, index, p) => {
      push('插入走位点')
      set(s => {
        const arr = s.blocking[id]
        if (!arr) return {}
        const next = [...arr.slice(0, index + 1), p, ...arr.slice(index + 1)]
        return { blocking: { ...s.blocking, [id]: next }, sceneVersion: s.sceneVersion + 1 }
      })
    },
    reverseBlocking: (id) => {
      push('反转路径')
      set(s => {
        const arr = s.blocking[id]
        if (!arr || arr.length < 2) return {}
        return { blocking: { ...s.blocking, [id]: [...arr].reverse() }, sceneVersion: s.sceneVersion + 1 }
      })
    },
    densifyBlocking: (id) => {
      const s = get()
      const arr = s.blocking[id]
      if (!arr || arr.length < 2) return
      if (arr.length >= 24) { s.toast('路点已足够密(24 点上限)'); return }
      push('加密路点')
      const next: Vec3[] = []
      for (let i = 0; i < arr.length - 1; i++) {
        const a = arr[i], b = arr[i + 1]
        next.push(a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2])
      }
      next.push(arr[arr.length - 1])
      set({ blocking: { ...s.blocking, [id]: next }, sceneVersion: s.sceneVersion + 1 })
      s.toast(`已加密到 ${next.length} 个路点`)
    },
    toggleBlockingClosed: (id) => {
      push('闭合回路')
      set(s => {
        const arr = s.blocking[id]
        if (!arr || arr.length < 2) return {}
        return { blockingClosed: { ...s.blockingClosed, [id]: !s.blockingClosed[id] }, sceneVersion: s.sceneVersion + 1 }
      })
    },
    setBlockSeg: (id, index, dur) => set(s => {
      const pts = s.blocking[id]
      if (!pts || pts.length < 2) return {}
      const segCount = s.blockingClosed[id] ? pts.length : pts.length - 1
      const cur = s.blockingSeg[id] ? [...s.blockingSeg[id]] : Array(segCount).fill(0)
      while (cur.length < segCount) cur.push(0)
      cur[index] = Math.max(0, Math.min(60, dur))
      return { blockingSeg: { ...s.blockingSeg, [id]: cur }, sceneVersion: s.sceneVersion + 1 }
    }),
    endBlocking: () => set({ blockingFor: null, pathHover: null }),
    setPathHover: (i) => set({ pathHover: i }),
    addCut: (t0, t1, camId) => set(s => {
      const a = Math.max(0, Math.min(t0, t1))
      const b = Math.min(s.timeline.duration, Math.max(t0, t1))
      if (b - a < 0.1) return {}
      // 覆盖式写入:裁掉与新区间重叠的既有镜头(与 NLE 的覆盖编辑一致)
      const kept: Cut[] = []
      for (const sh of s.cuts) {
        if (sh.t1 <= a + 1e-6 || sh.t0 >= b - 1e-6) { kept.push(sh); continue }
        if (sh.t0 < a - 1e-6) kept.push({ ...sh, t1: a })
        if (sh.t1 > b + 1e-6) kept.push({ ...sh, t0: b })
      }
      const next = [...kept, { id: uid(), t0: a, t1: b, camId }].sort((x, y) => x.t0 - y.t0)
      return { cuts: next, sceneVersion: s.sceneVersion + 1 }
    }),
    updateCut: (id, patch) => set(s => {
      const cuts = s.cuts.map(sh => (sh.id === id ? { ...sh, ...patch } : sh))
        .filter(sh => sh.t1 - sh.t0 > 0.05)
        .sort((x, y) => x.t0 - y.t0)
      return { cuts, sceneVersion: s.sceneVersion + 1 }
    }),
    removeCut: (id) => set(s => ({ cuts: s.cuts.filter(sh => sh.id !== id), sceneVersion: s.sceneVersion + 1 })),
    clearCuts: () => set(s => ({ cuts: [], sceneVersion: s.sceneVersion + 1 })),
    faceToFace: (id, otherId) => {
      const s = get()
      const a = s.getEntity(id), b = s.getEntity(otherId)
      if (!a || !b || id === otherId) return
      push('面对面对位')
      // 两人沿当前连线方向摆放,间距 1.6m(对话距离),互相面对;重合时按 +Z 分开
      let dx = b.position[0] - a.position[0]
      let dz = b.position[2] - a.position[2]
      const len = Math.hypot(dx, dz)
      if (len < 1e-3) { dx = 0; dz = 1 }
      else { dx /= len; dz /= len }
      const midX = (a.position[0] + b.position[0]) / 2
      const midZ = (a.position[2] + b.position[2]) / 2
      const half = 0.8
      const aPos: Vec3 = [midX - dx * half, a.position[1], midZ - dz * half]
      const bPos: Vec3 = [midX + dx * half, b.position[1], midZ + dz * half]
      const aRot = Math.atan2(dx, dz)
      s.transformSilent(id, { position: aPos, rotationY: aRot, lookAtId: otherId })
      s.transformSilent(otherId, { position: bPos, rotationY: aRot + Math.PI, lookAtId: id })
      s.toast(`${a.name} 与 ${b.name} 面对面(间距 1.6m)`)
    },
    sampleEntityAt: (id, t) => {
      const s = get()
      const e = s.getEntity(id)
      if (!e) return undefined
      const arr = s.keys[id]
      if (!arr?.length) return e
      if (t <= arr[0].t) return { ...e, position: arr[0].position, rotationY: arr[0].rotationY, scale: arr[0].scale, acting: arr[0].acting, pose: arr[0].pose ?? e.pose, focalMm: arr[0].focalMm ?? e.focalMm }
      const lastK = arr[arr.length - 1]
      if (t >= lastK.t) return { ...e, position: lastK.position, rotationY: lastK.rotationY, scale: lastK.scale, acting: lastK.acting, pose: lastK.pose ?? e.pose, focalMm: lastK.focalMm ?? e.focalMm }
      for (let i = 0; i < arr.length - 1; i++) {
        const a = arr[i], b = arr[i + 1]
        if (t >= a.t && t <= b.t) {
          const easeOf = (ease: Keyframe['ease'], k: number) =>
            ease === 'in' ? k * k : ease === 'out' ? 1 - (1 - k) * (1 - k) : ease === 'inout' ? k * k * (3 - 2 * k) : k
          const f = easeOf(a.ease, (t - a.t) / Math.max(1e-6, b.t - a.t))
          return {
            ...e,
            position: [a.position[0] + (b.position[0] - a.position[0]) * f,
                       a.position[1] + (b.position[1] - a.position[1]) * f,
                       a.position[2] + (b.position[2] - a.position[2]) * f] as Vec3,
            rotationY: a.rotationY + (b.rotationY - a.rotationY) * f,
            scale: a.scale + (b.scale - a.scale) * f,
            acting: a.acting,
            pose: a.pose ?? e.pose,
            focalMm: a.focalMm !== undefined && b.focalMm !== undefined
              ? a.focalMm + (b.focalMm - a.focalMm) * f
              : (a.focalMm ?? e.focalMm),
          }
        }
      }
      return e
    },

    setMoveSpeed: (v) => { writeLS(LS.speed, v); set({ moveSpeed: v }) },
    setResolution: (r) => { writeLS(LS.resolution, r); set({ resolution: r }) },
    setSettingsPage: (p) => set({ settingsPage: p }),
    setInvertY: (v) => set({ invertY: v }),
    setWheelZoom: (v) => set({ wheelZoom: v }),
    setEnv: (p) => set(s => ({ env: { ...s.env, ...p } })),
    fakeGenerate: (name) => {
      get().toast('正在下载 3D 资产...')
      const lib = SAMPLE_LIB.find(x => name.includes(x.name)) ?? SAMPLE_LIB[Math.floor(Math.random() * SAMPLE_LIB.length)]
      setTimeout(() => {
        set(s => ({ genAssets: [...s.genAssets, { id: uid(), ...lib }], openPanel: 'genHistory' }))
        get().toast(`已生成:${lib.name}`)
      }, 1400)
    },
    toast: (text) => {
      const id = Date.now() + Math.random()
      set(s => ({ toasts: [...s.toasts, { id, text }] }))
      setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 2200)
    },
    resetView: () => {
      set({ mode: { type: '3d' }, focalIdx: 2, selection: null, viewfinder: false })
      get().toast('已恢复初始视角')
      window.dispatchEvent(new CustomEvent('studio-reset-view'))
    },

    /* ── Agent 侧边栏 ─────────────────────────────────────────── */
    agentOpen: readLS('tap-replica.agentOpen', true),
    sidebarTab: 'agent',
    agentMessages: [],
    agentBusy: false,
    setAgentOpen: (v) => set({ agentOpen: v }),
    setSidebarTab: (t) => set({ sidebarTab: t, agentOpen: true }),
    pushAgentMsg: (m) => set(s => ({ agentMessages: [...s.agentMessages, { ...m, id: uid(), at: Date.now() }] })),
    setAgentBusy: (v) => set({ agentBusy: v }),
    clearAgent: () => set({ agentMessages: [] }),

    /* ── 故事板 ───────────────────────────────────────────────── */
    storyboardOpen: false,
    shots: [],
    setStoryboardOpen: (v) => set({ storyboardOpen: v }),
    addShot: (s) => {
      const shot: Shot = { ...s, id: uid(), createdAt: Date.now() }
      set(x => ({ shots: [shot, ...x.shots] }))
      return shot
    },
    removeShot: (id) => set(s => ({ shots: s.shots.filter(x => x.id !== id) })),
    renameShot: (id, name) => set(s => ({ shots: s.shots.map(x => (x.id === id ? { ...x, name } : x)) })),
    setShotNote: (id, note) => set(s => ({ shots: s.shots.map(x => (x.id === id ? { ...x, note } : x)) })),

    /* ── 灯光 ─────────────────────────────────────────────────── */
    lights: DEFAULT_LIGHTS,
    addLight: (p) => {
      const id = uid()
      const l: LightDef = {
        id, name: p?.name ?? `灯光 ${get().lights.length + 1}`, type: p?.type ?? 'spot',
        color: p?.color ?? '#ffffff', intensity: p?.intensity ?? 1.5, angle: p?.angle ?? 45,
        height: p?.height ?? 3.5, softness: p?.softness ?? 0.5, enabled: p?.enabled ?? true,
      }
      set(s => ({ lights: [...s.lights, l] }))
      return id
    },
    updateLight: (id, patch) => set(s => ({ lights: s.lights.map(l => (l.id === id ? { ...l, ...patch } : l)) })),
    removeLight: (id) => set(s => ({ lights: s.lights.filter(l => l.id !== id) })),
    applyLightPreset: (presetId) => {
      const p = LIGHT_PRESETS.find(x => x.id === presetId)
      if (!p) return
      set({ lights: p.lights.map((l, i) => ({ ...l, id: `lp-${presetId}-${i}` })) })
      get().toast(`已应用灯光预设:${p.name}`)
    },

    /* ── 运镜路径 ─────────────────────────────────────────────── */
    activePath: null,
    runPath: (id) => {
      const p = pathById(id) ?? PATH_PRESETS.find(x => x.kind === id)
      if (!p) { get().toast('未找到该运镜路径'); return }
      set({ activePath: p, viewfinder: false })
      window.dispatchEvent(new CustomEvent('studio-run-path', { detail: p }))
      get().toast(`运镜:${p.name}`)
    },
    stopPath: () => { set({ activePath: null }); window.dispatchEvent(new CustomEvent('studio-stop-path')) },

    /* ── 录制 ─────────────────────────────────────────────────── */
    recording: false,
    setRecording: (v) => set({ recording: v }),

    /* ── 模型库 ───────────────────────────────────────────────── */
    library: MODEL_LIBRARY,
    libraryOpen: false,
    setLibraryOpen: (v) => set({ libraryOpen: v, placementMenuOpen: v ? false : get().placementMenuOpen }),

    /* ── 对象操控模式 ─────────────────────────────────────────── */
    controlId: null,
    setControl: (id) => set({
      controlId: id,
      selection: id ?? get().selection,
      placement: null,
      placementMenuOpen: false,
      tip: id ? 'WASD 可以移动,Q / E 可以升降;按 Esc 可以结束操控' : null,
    }),
    envRes: null,
    setEnvRes: (v) => set({ envRes: get().envRes === v ? null : v }),
  }
})

const dupName = (n: string) => {
  const m = n.match(/^(.*?)(?: (\d+))?$/)
  const base = m?.[1] ?? n
  return `${base} ${m?.[2] ? Number(m[2]) + 1 : 2}`
}

/** 按 sceneVersion 缓存实体列表,避免 selector 每快照返回新数组导致渲染循环 */
export function useEntities(): Entity[] {
  const v = useStudio(s => s.sceneVersion)
  return useMemo(() => useStudio.getState().effectiveEntities(), [v])
}

/* 自动化/调试探针:把 store 挂到 window(仅浏览器环境) */
if (typeof window !== 'undefined') {
  (window as unknown as { __studioStore?: typeof useStudio }).__studioStore = useStudio
}


/* 工程自动保存/恢复:结构变化防抖 800ms 落 localStorage,启动时恢复 */
if (typeof window !== 'undefined') {
  const LS_KEY = 'tap-replica.project'
  const pickProject = (s: StudioStore) => ({
    v: 1,
    baseEntities: s.baseEntities, states: s.states, activeStateId: s.activeStateId,
    lights: s.lights, env: s.env, keys: s.keys, lightKeys: s.lightKeys, blocking: s.blocking, blockingClosed: s.blockingClosed, blockingSeg: s.blockingSeg, cuts: s.cuts,
    timelineDuration: s.timeline.duration, timelineLoop: s.timeline.loop,
  })
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const d = JSON.parse(raw) as Partial<StudioStore> & { timelineDuration?: number; timelineLoop?: boolean }
      if (d && Array.isArray(d.baseEntities)) {
        useStudio.setState(d as never)
        // 成片节奏(时长/循环)属于工程数据,单独恢复到时间轴
        if (typeof d.timelineDuration === 'number') {
          useStudio.setState(s => ({ timeline: { ...s.timeline, duration: d.timelineDuration!, loop: !!d.timelineLoop } }))
        }
      }
    }
  } catch { /* 损坏的存档直接忽略 */ }
  let prev = useStudio.getState()
  let saveTimer = 0
  useStudio.subscribe(st => {
    // 只比较可持久化切片的引用:时间轴时钟/提示等高频字段不触发保存
    if (
      st.baseEntities === prev.baseEntities && st.states === prev.states && st.activeStateId === prev.activeStateId &&
      st.lights === prev.lights && st.env === prev.env && st.keys === prev.keys && st.lightKeys === prev.lightKeys &&
      st.blocking === prev.blocking && st.blockingClosed === prev.blockingClosed && st.blockingSeg === prev.blockingSeg && st.cuts === prev.cuts
    ) return
    prev = st
    window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(pickProject(useStudio.getState()))) } catch { /* 配额满则放弃 */ }
    }, 800)
  })

  /* 首次打开(无存档):载入 15s 样片《走廊遭遇》,让导演台一进来就是成片 */
  void (async () => {
    if (localStorage.getItem(LS_KEY)) return
    try {
      const code = await (await fetch('/sequence-15s.js')).text()
      new Function(code)()
      useStudio.getState().toast('已载入 15s 样片《走廊遭遇》,点时间轴 ▶ 播放')
    } catch { /* 无样片或不允许执行时保持空场景 */ }
  })()
}
