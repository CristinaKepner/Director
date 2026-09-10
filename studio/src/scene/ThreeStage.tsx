import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { hdriById } from '../library'
import { useEntities, useStudio } from '../store'
import { CameraPath, Entity, FOCALS, Kind, LightDef, Vec3, uid } from '../types'
import { applyHumanActing, applyHumanPose, buildFlatFloor, buildModel, buildRoom, buildSceneGround, humanRefs, POSES } from './models'
import type { PoseSpec, StageParts } from './models'

export interface ChipInfo { id: string; x: number; y: number; selected: boolean; active: boolean }

interface StudioDebugInfo {
  ents: number; groups: number; camPos: number[]; fov: number; mode: string; chips: number; canvas: number[]
  lights: number; path: string | null; recording: boolean; stage: string; hover: string | null; selected: string | null
  gltf: number; control: string | null; recFrames: number
  /** 'free' | 'cam' | 'control' 视角;walk 为操控步态是否在摆动 */
  view: string; walk: boolean; blend: number; legs: number[]
  /** 步态诊断:关节缓存代次 / 当前 dt / 相位 */
  jointGen: number; dt: number; phase: number; pelvisY: number; fps: number
  /** 色调/曝光、机位对焦距离、走位点总数 */
  tone: string; exposure: number; focus: number; block: number
  /** 走位采样位置(第一个走位实体的渲染坐标) */
  blockPos: number[]
  /** 机位相机世界坐标 / 视锥助手数量 */
  cinePos: number[]; frustums: number
  /** 直接操纵:是否挂载 + gizmo 原点屏幕坐标 */
  tc: number; tcPos: number[]; tcAxis: string | null; labels: number
  /** 选中实体世界包围盒尺寸 [w,h,d] */
  selBox: number[]
  /** 画中画监看的机位名(空=自由视角) */
  pip: string
  /** 选中角色头部偏航(度) */
  headYaw: number
  /** 可见走位路点总数 */
  blockDots: number
  /** 悬停中的路点索引(-1 为无) */
  blockHot: number
  /** 选中路径各点的屏幕坐标 [x0,y0,x1,y1,…] */
  blockScreen: number[]
  /** 正在拖拽的路点索引(-1 为无) */
  blockDrag: number
  /** 当前出画机位名(镜头轨/手动切台) */
  cutCam: string
  /** 当前出画机位的焦距 mm */
  cutFocal: number
  /** 最近一次切镜时间点 */
  cutAt: number
  /** 演员位置 [x,z,…](按名称排序,用于分镜核对) */
  actorPos: number[]
  /** 选中对象的当前姿态(含关键帧采样) */
  poseNow: string
  /** 取景视角:机位模型/路径线是否已隐藏(1=已隐藏,0=编辑视图) */
  cleanView: number
}

export interface StageRef {
  capture: (() => string | null) | null
  startRecord: (() => boolean) | null
  stopRecord: (() => Promise<string | null>) | null
  playPath: ((p: CameraPath) => void) | null
  focusEntity: ((id: string) => void) | null
  getCamera: (() => { pos: [number, number, number]; target: [number, number, number] }) | null
  /** 本地时间轴时钟(逐帧精确),播放头直接读取 */
  getTimelineTime: (() => number) | null
  /** 按分镜时刻+机位离屏截图(不改变编辑器状态),用于故事板分镜 */
  captureAt: ((time: number, camId: string) => string | null) | null
}

/** 供取景器截取 / 录制 / 运镜 / 自动化探针使用 */
export const stageRef: StageRef = {
  capture: null, startRecord: null, stopRecord: null, playPath: null, focusEntity: null, getCamera: null, getTimelineTime: null,
  captureAt: null,
}

declare global {
  interface Window { __studio_debug?: StudioDebugInfo; __studioStage?: StageRef }
}
if (typeof window !== 'undefined') window.__studioStage = stageRef

const mmToFov = (mm: number) => 2 * Math.atan(18 / mm) * 180 / Math.PI

const HOME_POS = new THREE.Vector3(7.5, 4.6, 11)
const HOME_TGT = new THREE.Vector3(0, 1.2, 0)

/* ── 芯片 pin 形(原站几何) ─────────────────────────────────── */
const CHIP_PATH = 'M11.5 2H36.5C41.7 2 46 6.3 46 11.5V30.2C46 33.7 44 36.8 40.9 38.5L26 46.5C24.7 47.2 23.3 47.2 22 46.5L7.1 38.5C4 36.8 2 33.7 2 30.2V11.5C2 6.3 6.3 2 11.5 2Z'
const CHIP_MASK = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 50'%3E%3Cpath fill='black' d='${CHIP_PATH}'/%3E%3C/svg%3E")`

/* ── GLTF 资源缓存(成功 / 失败都缓存,跨挂载复用) ──────────── */
interface GltfEntry { status: 'loading' | 'ok' | 'error'; scene: THREE.Group | null; waiters: ((s: THREE.Group | null) => void)[] }
const gltfCache = new Map<string, GltfEntry>()
const gltfLoader = new GLTFLoader()

function getGltf(url: string, cb: (scene: THREE.Group | null) => void) {
  const hit = gltfCache.get(url)
  if (hit) {
    if (hit.status === 'loading') hit.waiters.push(cb)
    else cb(hit.scene)
    return
  }
  const entry: GltfEntry = { status: 'loading', scene: null, waiters: [cb] }
  gltfCache.set(url, entry)
  gltfLoader.load(
    url,
    gltf => {
      entry.status = 'ok'
      entry.scene = gltf.scene
      const ws = entry.waiters.splice(0)
      for (const w of ws) w(gltf.scene)
    },
    undefined,
    () => {
      entry.status = 'error'
      const ws = entry.waiters.splice(0)
      for (const w of ws) w(null)
    },
  )
}

/** 归一化上传模型:底部对齐 y=0、水平居中,按 entity.height 或包围盒定尺寸 */
function fitUserModel(src: THREE.Object3D, targetH: number): THREE.Group {
  const inst = cloneSkinned(src) as THREE.Group
  inst.position.set(0, 0, 0)
  const box = new THREE.Box3().setFromObject(inst)
  const size = new THREE.Vector3()
  box.getSize(size)
  const scale = targetH > 0
    ? targetH / Math.max(1e-4, size.y)
    : Math.max(size.x, size.y, size.z) > 1e-4 ? 1.5 / Math.max(size.x, size.y, size.z) : 1
  inst.scale.multiplyScalar(scale)
  const box2 = new THREE.Box3().setFromObject(inst)
  const c = new THREE.Vector3()
  box2.getCenter(c)
  inst.position.set(-c.x, -box2.min.y, -c.z)
  inst.traverse(o => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true } })
  return inst
}

export default function ThreeStage() {
  const mountRef = useRef<HTMLDivElement>(null)
  const [chips, setChips] = useState<ChipInfo[]>([])
  const [tool, setTool] = useState<{ id: string; kind: Kind; x: number; y: number } | null>(null)
  const toolRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const mount = mountRef.current!
    const S = useStudio
    let disposed = false

    /* ── 渲染器 / 场景 / 相机 ── */
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    const baseRatio = Math.min(devicePixelRatio, 1.25)
    renderer.setPixelRatio(baseRatio)
    // 录制/截图分辨率:设置里的「渲染分辨率」决定录制与快门的像素比(交互时保持 baseRatio)
    const ratioFor = (res: string) => Math.min(devicePixelRatio, res === '4K' ? 2 : res === '2K' ? 1.6 : 1.25)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap // 让 shadow.radius(softness)真实生效
    // 阴影贴图只在场景/灯光/实体变化时重绘(性能:静态帧不重画阴影)
    renderer.shadowMap.autoUpdate = false
    let shadowDirty = true
    renderer.toneMapping = THREE.NoToneMapping
    renderer.toneMappingExposure = 1
    mount.appendChild(renderer.domElement)
    const el = renderer.domElement

    const scene = new THREE.Scene()
    const cam = new THREE.PerspectiveCamera(mmToFov(24), 1, 0.1, 500)
    const cine = new THREE.PerspectiveCamera(mmToFov(32), 1, 0.1, 500)
    const cinePip = new THREE.PerspectiveCamera(mmToFov(24), 16 / 9, 0.1, 500)
    cam.position.copy(HOME_POS)
    const target = HOME_TGT.clone()

    // 低强度半球光垫底;主光由 store.lights 驱动
    const amb = new THREE.HemisphereLight('#9fb0c8', '#0a0a0c', 0.22)
    scene.add(amb)

    /* ── 灯光组(仅在 lights 引用变化时重建) ── */
    const lightGroup = new THREE.Group()
    scene.add(lightGroup)
    let lightsRef: LightDef[] | null = null
    let lightGroundH = NaN
    let lightEnvKind: string | null = null
    let lightHdri: string | null = null

    const shadowSetup = (l: THREE.DirectionalLight | THREE.SpotLight, softness: number, key = false) => {
      const s = Math.max(0, Math.min(1, softness))
      l.castShadow = true
      // 主光 1536,其他 1024;softness 越高再降档(半径已柔化,不用再防鞘)
      const ms = key ? 1536 : 1024
      l.shadow.mapSize.set(ms, ms)
      l.shadow.radius = 0.6 + s * 5.5
      l.shadow.bias = -0.0006
      l.shadow.normalBias = 0.02
      if ((l as THREE.DirectionalLight).isDirectionalLight) {
        const c = (l as THREE.DirectionalLight).shadow.camera
        c.left = c.bottom = -16
        c.right = c.top = 16
        c.near = 0.5
        c.far = 70
        c.updateProjectionMatrix()
      } else {
        const c = (l as THREE.SpotLight).shadow.camera
        c.near = 0.5
        c.far = 60
      }
    }

    const applyLights = () => {
      const st = S.getState()
      if (st.lights === lightsRef && st.env.groundH === lightGroundH && st.env.light === lightEnvKind && st.env.hdri === lightHdri) return
      lightsRef = st.lights
      lightGroundH = st.env.groundH
      lightEnvKind = st.env.light
      lightHdri = st.env.hdri

      for (const o of [...lightGroup.children]) {
        lightGroup.remove(o)
        if ((o as THREE.Light).isLight) (o as THREE.Light).dispose()
      }

      amb.intensity = st.env.hdri !== 'custom'
        ? 0.08
        : st.env.light === 'natural' ? 0.5 : st.env.light === 'night' ? 0.12 : 0.32

      const focus = new THREE.Vector3(0, st.env.groundH + 1, 0)
      const active = st.lights.filter(l => l.enabled)

      // 无启用灯光时,用环境面板的「光照类型 / 方向」兜底
      if (!active.length) {
        const d = new THREE.DirectionalLight('#ffffff', st.env.light === 'night' ? 0.45 : st.env.light === 'natural' ? 2.2 : 1.6)
        const rad = (st.env.lightDir / 180) * Math.PI
        d.position.set(Math.cos(rad) * 9, st.env.groundH + 9, Math.sin(rad) * 9)
        d.target.position.copy(focus)
        shadowSetup(d, 0.35)
        lightGroup.add(d, d.target)
        return
      }

      for (const [j, l] of active.entries()) {
        const rad = (l.angle / 180) * Math.PI
        const x = Math.cos(rad) * 6
        const z = Math.sin(rad) * 6
        const y = st.env.groundH + l.height
        const soft = l.softness

        if (l.type === 'point') {
          const p = new THREE.PointLight(l.color, l.intensity, 0, 1.8)
          p.position.set(x, y, z)
          p.userData.lightId = l.id
          lightGroup.add(p)
          continue
        }
        if (l.type === 'spot') {
          const sp = new THREE.SpotLight(l.color, l.intensity, 0, THREE.MathUtils.lerp(0.16, 0.62, soft), soft * 0.85, 1.4)
          sp.position.set(x, y, z)
          sp.target.position.copy(focus)
          sp.userData.lightId = l.id
          // 性能:只让第一盏灯(主光)castShadow,其余灯只照亮不生阴影
          const casting = j === 0
          if (casting) { sp.castShadow = true; sp.shadow.mapSize.set(1024, 1024) }
          lightGroup.add(sp, sp.target)
          continue
        }
        // softbox / key / fill / rim / sun → 平行光
        const d = new THREE.DirectionalLight(l.color, l.type === 'sun' ? l.intensity * 1.25 : l.intensity)
        d.position.set(x, y, z)
        d.target.position.copy(focus)
        d.userData.lightId = l.id
        // 性能:只有主光越 casting shadow;填充/轮廓光照亮即可不生阴影
        const casting = j === 0 || l.type === 'key' || l.type === 'sun'
        if (casting) shadowSetup(d, soft, j === 0)
        else d.castShadow = false
        lightGroup.add(d, d.target)
      }
      shadowDirty = true
    }
    applyLights()

    /* ── HDRI 环境:程序化等距柱状天空 → PMREM 环境贴图 + 一盏太阳 ── */
    const pmrem = new THREE.PMREMGenerator(renderer)
    const hdriGroup = new THREE.Group()
    scene.add(hdriGroup)
    let envRT: THREE.WebGLRenderTarget | null = null
    let hdriSig: string | null = null

    const skyTexture = (sky: [string, string, string]) => {
      const cv = document.createElement('canvas')
      cv.width = 128; cv.height = 64
      const ctx = cv.getContext('2d')!
      const g = ctx.createLinearGradient(0, 0, 0, 64)
      g.addColorStop(0, sky[0]); g.addColorStop(0.5, sky[1]); g.addColorStop(1, sky[2])
      ctx.fillStyle = g
      ctx.fillRect(0, 0, 128, 64)
      const tex = new THREE.CanvasTexture(cv)
      tex.mapping = THREE.EquirectangularReflectionMapping
      tex.colorSpace = THREE.SRGBColorSpace
      return tex
    }

    const applyHdri = () => {
      const st = S.getState()
      const id = st.env.hdri
      if (id === hdriSig) return
      hdriSig = id

      for (const o of [...hdriGroup.children]) {
        hdriGroup.remove(o)
        if ((o as THREE.Light).isLight) (o as THREE.Light).dispose()
      }
      if (envRT) { envRT.dispose(); envRT = null }
      scene.environment = null
      scene.environmentIntensity = 1
      if (id === 'custom') return

      const preset = hdriById(id)
      const sky = skyTexture(preset.sky)
      envRT = pmrem.fromEquirectangular(sky)
      sky.dispose()
      scene.environment = envRT.texture
      scene.environmentIntensity = preset.intensity * 0.42

      const sun = new THREE.DirectionalLight(preset.sun.color, preset.sun.intensity)
      const el = (preset.sun.elevation * Math.PI) / 180
      const az = Math.PI * 0.25
      sun.position.set(Math.cos(el) * Math.cos(az) * 12, st.env.groundH + Math.sin(el) * 12, Math.cos(el) * Math.sin(az) * 12)
      sun.target.position.set(0, st.env.groundH + 1, 0)
      sun.castShadow = true
      sun.shadow.mapSize.set(2048, 2048)
      sun.shadow.radius = 2.5
      sun.shadow.bias = -0.0006
      sun.shadow.normalBias = 0.02
      const c = sun.shadow.camera
      c.left = c.bottom = -14; c.right = c.top = 14; c.near = 0.5; c.far = 60
      c.updateProjectionMatrix()
      hdriGroup.add(sun, sun.target)
    }
    applyHdri()

    /* ── 场地(stage):空白 = 超平坦素面 / 房间 = 棋盘格 + 两面墙 / 3D 场景 = 旧地面 ── */
    let stageParts: StageParts | null = null
    let grid: THREE.GridHelper | null = null
    let stageSig = ''
    let framedStage: string | null = null

    const applyStageHome = () => {
      const e = S.getState().env
      if (e.stage === 'room') {
        const rm = e.room
        cam.position.set(rm.w * 0.3, e.groundH + rm.h * 0.62, rm.d * 0.36)
        target.set(0, e.groundH + rm.h * 0.3, -rm.d * 0.18)
      } else {
        cam.position.copy(HOME_POS)
        target.copy(HOME_TGT)
      }
    }

    const syncStage = () => {
      const st = S.getState()
      const e = st.env
      const rm = e.room
      const sig = `${e.stage}|${e.groundH}|${e.groundSize}|${e.grid}|${e.bg}|${rm.w}|${rm.d}|${rm.h}|${rm.pattern}|${rm.spacing}`
      if (sig === stageSig) return
      stageSig = sig

      if (stageParts) { scene.remove(stageParts.group); stageParts.dispose(); stageParts = null }
      if (grid) { scene.remove(grid); grid.geometry.dispose(); (grid.material as THREE.Material).dispose(); grid = null }

      const parts = e.stage === 'room' ? buildRoom(e) : e.stage === 'scene3d' ? buildSceneGround(e) : buildFlatFloor(e)
      parts.group.position.y = e.groundH
      scene.add(parts.group)
      stageParts = parts

      if (e.grid && e.stage !== 'room') {
        grid = new THREE.GridHelper(Math.max(40, e.groundSize * 2), Math.max(2, Math.round(e.groundSize * 2)), '#464650', '#2c2c33')
        grid.position.y = e.groundH + 0.004
        ;(grid.material as THREE.Material).transparent = true
        ;(grid.material as THREE.Material).opacity = 0.85
        scene.add(grid)
      }

      const bg = e.bg === 'pano' ? '#161622' : e.bg === 'same' ? '#101014' : (e.stage === 'blank' ? '#050505' : '#0b0b0d')
      scene.background = new THREE.Color(bg)
      if (e.stage === 'room' || e.stage === 'blank') scene.fog = null
      else {
        const floorSize = e.stage === 'scene3d' ? Math.max(200, e.groundSize * 12) : Math.max(160, e.groundSize * 8)
        scene.fog = new THREE.Fog(bg, floorSize * 0.25, floorSize * 0.5)
      }

      if (framedStage !== e.stage) { framedStage = e.stage; applyStageHome() }
      shadowDirty = true
    }
    syncStage()

    /* ── 选中视觉:橙色描边 + 脚下三轴 gizmo + 角色圆环/朝向箭头 ── */
    const boxHelper = new THREE.BoxHelper(new THREE.Object3D(), '#f58a00')
    const boxMat = boxHelper.material as THREE.LineBasicMaterial
    boxMat.transparent = true
    boxMat.opacity = 0.92
    boxMat.depthTest = false
    boxHelper.visible = false
    scene.add(boxHelper)

    const gizmo = new THREE.Group()
    const gizmoMat = (c: string) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, depthWrite: false, depthTest: false })
    const axisArrow = (dir: 'x' | 'y' | 'z', color: string) => {
      const m = new THREE.Group()
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 10), gizmoMat(color))
      shaft.position.y = 0.35
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 12), gizmoMat(color))
      tip.position.y = 0.85
      m.add(shaft, tip)
      if (dir === 'x') m.rotation.z = -Math.PI / 2
      else if (dir === 'z') m.rotation.x = Math.PI / 2
      return m
    }
    gizmo.add(axisArrow('x', '#ff5a5a'), axisArrow('y', '#5aff8a'), axisArrow('z', '#5a8aff'))
    const rotArc = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.042, 8, 28, Math.PI / 2), gizmoMat('#f0d887'))
    rotArc.rotation.x = -Math.PI / 2
    gizmo.add(rotArc)
    gizmo.renderOrder = 20
    gizmo.visible = false
    scene.add(gizmo)

    const selMarks = new THREE.Group()
    const actorRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.6, 0.022, 10, 64),
      new THREE.MeshBasicMaterial({ color: '#7fd8d0', transparent: true, opacity: 0.75, depthWrite: false }),
    )
    actorRing.rotation.x = -Math.PI / 2
    actorRing.position.y = 0.012
    const actorArrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.07, 0.4, 14),
      new THREE.MeshBasicMaterial({ color: '#f58a00', transparent: true, opacity: 0.9, depthWrite: false }),
    )
    actorArrow.rotation.x = Math.PI / 2 // 指向 +Z
    actorArrow.position.set(0, 0.07, 0.82)
    selMarks.add(actorRing, actorArrow)
    selMarks.visible = false
    scene.add(selMarks)

    /* ── 实体 reconcile(沿用 groups Map;GLTF 真实加载) ── */
    const groups = new Map<string, THREE.Group>()
    const failedToast = new Set<string>()

    const attachUserModel = (e: Entity, g: THREE.Group, url: string) => {
      const token = (g.userData.token = ((g.userData.token as number) ?? 0) + 1)
      getGltf(url, src => {
        if (disposed || g.userData.token !== token || !g.parent) return
        if (!src) {
          if (!failedToast.has(url)) { failedToast.add(url); S.getState().toast(`模型加载失败:${e.name}`) }
          return
        }
        g.clear()
        g.add(fitUserModel(src, e.height ?? 0))
        g.userData.gltf = true
      })
    }

    /** 姿态状态:平滑过渡到目标姿态(参数插值,不重建模型) */
    interface PoseState { key: string; ver: number; cur: PoseSpec; target: PoseSpec }
    const poseStates = new Map<string, PoseState>()
    const POSEF = ['pelvisY', 'pelvisX', 'thighX', 'shinX', 'shoulderX', 'elbowX', 'shoulderZ', 'rootX', 'rootY', 'rootZ'] as const
    const poseSpecOf = (pose?: string, tune?: Partial<PoseSpec>): PoseSpec => {
      const base = POSES[pose ?? '站立'] ?? POSES['站立']
      return tune ? { ...base, ...tune } : { ...base }
    }
    const tuneOf = (e: { poseTune?: Record<string, number> }): Partial<PoseSpec> | undefined =>
      e.poseTune as Partial<PoseSpec> | undefined
    const poseKeyOf = (pose?: string, tune?: Partial<PoseSpec>): string => {
      let k = pose ?? '站立'
      if (tune) for (const f of POSEF) if (tune[f] !== undefined) k += `|${f}:${(tune[f] as number).toFixed(3)}`
      return k
    }
    const poseEq = (a: PoseSpec, b: PoseSpec): boolean => {
      for (const f of POSEF) {
        const av = (a[f] ?? 0) as number
        const bv = (b[f] ?? 0) as number
        if (Math.abs(av - bv) > 1e-3) return false
      }
      return true
    }
    const poseLerp = (a: PoseSpec, b: PoseSpec, t: number): PoseSpec => {
      const out = { ...b } as PoseSpec
      for (const f of POSEF) {
        const av = (a[f] ?? 0) as number
        const bv = (b[f] ?? 0) as number
        ;(out[f] as number) = av + (bv - av) * t
      }
      return out
    }
    const syncStructure = () => {
      const st = S.getState()
      const ents = st.effectiveEntities()
      const seen = new Set<string>()
      const gy = st.env.groundH
      for (const e of ents) {
        seen.add(e.id)
        let g = groups.get(e.id)
        const sig = `${e.prim}|${e.color}|${e.height ?? ''}|${e.userModelUrl ?? ''}`
        if (g && g.userData.sig !== sig) { scene.remove(g); groups.delete(e.id); g = undefined }
        if (!g) {
          g = buildModel(e)
          g.userData.sig = sig
          g.userData.token = 0
          scene.add(g)
          groups.set(e.id, g)
          poseStates.delete(e.id)
          if (e.userModelUrl) attachUserModel(e, g, e.userModelUrl)
        }
        g.position.set(e.position[0], e.position[1] + gy, e.position[2])
        g.rotation.y = e.rotationY
        g.scale.setScalar(e.scale)
      }
      for (const [id, g] of [...groups]) if (!seen.has(id)) { scene.remove(g); groups.delete(id) }
      shadowDirty = true
    }
    syncStructure()

    /* ── 放置幽灵 ── */
    const ghost = new THREE.Group()
    scene.add(ghost)
    let gPrim = '', gColor = '', gUrl = ''
    let gHeight = -1

    const syncGhost = () => {
      ghost.clear()
      const pl = S.getState().placement
      if (!pl) return
      const pseudo: Entity = {
        id: uid(), name: 'ghost', kind: 'prop', prim: pl.spec.prim, color: pl.spec.color,
        position: [0, 0, 0], rotationY: 0, scale: 1, height: pl.spec.height,
      }
      const g = buildModel(pseudo)
      g.traverse(o => {
        const m = o as THREE.Mesh
        if (m.isMesh) {
          const color = (m.material as THREE.MeshStandardMaterial).color
          m.material = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.45, depthWrite: false })
        }
      })
      ghost.add(g)
      if (pl.spec.modelUrl) {
        const url = pl.spec.modelUrl
        const token = `${pl.spec.prim}|${url}`
        g.userData.ghostUrl = token
        getGltf(url, src => {
          if (disposed || !src || g.userData.ghostUrl !== token || !g.parent) return
          g.clear()
          g.add(fitUserModel(src, pl.spec.height ?? 0))
        })
      }
    }

    /* ── 拾取 / 指针 ── */
    const ray = new THREE.Raycaster()
    const ndcV = new THREE.Vector2()
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const hitV = new THREE.Vector3()
    const ndc = (ev: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect()
      return ndcV.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1)
    }
    const pickEntity = (ev: { clientX: number; clientY: number }): string | null => {
      ray.setFromCamera(ndc(ev), cam)
      for (const [id, g] of groups) if (ray.intersectObject(g, true).length) return id
      return null
    }
    const groundHit = (ev: { clientX: number; clientY: number }): THREE.Vector3 | null => {
      ray.setFromCamera(ndc(ev), cam)
      groundPlane.constant = -S.getState().env.groundH
      return ray.ray.intersectPlane(groundPlane, hitV) ? hitV : null
    }
    /** 命中走位路点(仅选中/正在绘制的路径可交互) */
    const pickBlockDot = (ev: { clientX: number; clientY: number }): { id: string; index: number } | null => {
      const st = S.getState()
      const id = st.blockingFor ?? st.selection
      if (!id) return null
      const viz = pathViz.get(id)
      if (!viz) return null
      ray.setFromCamera(ndc(ev), cam)
      const hits = ray.intersectObjects(viz.dots, false)
      if (!hits.length) return null
      return { id, index: hits[0].object.userData.blockIndex as number }
    }

    const drag = { active: false, orbit: false, pan: false, lx: 0, ly: 0, moved: 0 }
    /** 路点拖拽中(释放时写回 store) */
    let blockDrag: { id: string; index: number } | null = null
    /** 拖拽预览位置:不写 store,释放时一次提交(避免每帧触发 React 重渲染) */
    let blockDragPos: Vec3 | null = null
    let hoverId: string | null = null
    const sph = new THREE.Spherical()
    const _panV = new THREE.Vector3()
    const _orb = new THREE.Vector3()

    const pan = (dx: number, dy: number) => {
      const f = cam.position.distanceTo(target) * 0.0012
      _panV.setFromMatrixColumn(cam.matrix, 0)
      _panV.multiplyScalar(-dx * f)
      _orb.setFromMatrixColumn(cam.matrix, 1).multiplyScalar(dy * f)
      _panV.add(_orb)
      cam.position.add(_panV)
      target.add(_panV)
    }
    const orbit = (dx: number, dy: number) => {
      sph.setFromVector3(_orb.copy(cam.position).sub(target))
      sph.theta -= dx * 0.005
      const sgn = S.getState().invertY ? -1 : 1
      sph.phi = Math.max(0.08, Math.min(Math.PI - 0.08, sph.phi - dy * 0.005 * sgn))
      cam.position.copy(target).add(_orb.setFromSpherical(sph))
    }

    const onDown = (ev: PointerEvent) => {
      if (tc.dragging) return
      if (ev.button === 0) {
        const bd = pickBlockDot(ev)
        if (bd) {
          const st = S.getState()
          if (ev.altKey) {
            // Alt+点击:删除该路点(store 内自压快照)
            st.removeBlockingPoint(bd.id, bd.index)
            st.toast(`已删除第 ${bd.index + 1} 个路点`)
            return
          }
          blockDrag = bd
          drag.active = true; drag.lx = ev.clientX; drag.ly = ev.clientY; drag.moved = 0
          drag.orbit = false; drag.pan = false
          return
        }
      }
      drag.active = true; drag.lx = ev.clientX; drag.ly = ev.clientY; drag.moved = 0
      drag.orbit = ev.button === 0 || ev.button === 1
      drag.pan = ev.button === 1 && ev.altKey
      if (ev.button === 0 && ev.altKey) {
        const ph = groundHit(ev)
        if (ph) target.copy(ph)
      }
    }
    const onMove = (ev: PointerEvent) => {
      if (tc.dragging) return
      if (blockDrag) {
        const hit = groundHit(ev)
        if (hit) {
          blockDragPos = [hit.x, hit.y, hit.z]
          const viz = pathViz.get(blockDrag.id)
          const pts = S.getState().blocking[blockDrag.id]
          if (viz && pts) {
            const preview = [...pts]
            preview[blockDrag.index] = blockDragPos
            for (let i = 0; i < preview.length; i++) {
              const p = preview[i]
              viz.dots[i].position.set(p[0], p[1] + 0.04, p[2])
              viz.labels[i].position.set(p[0], p[1] + 0.34, p[2])
            }
            viz.line.geometry.setFromPoints(seqPoints(preview, viz.closed))
          }
          drag.moved += 2
        }
        return
      }
      const st = S.getState()
      if (st.placement) { const hit = groundHit(ev); if (hit) st.setPlacementGround([hit.x, hit.y, hit.z]) }
      if (drag.active) {
        const dx = ev.clientX - drag.lx, dy = ev.clientY - drag.ly
        drag.lx = ev.clientX; drag.ly = ev.clientY
        drag.moved += Math.abs(dx) + Math.abs(dy)
        if (drag.pan || st.mode.type === 'top') pan(dx, dy)
        else if (drag.orbit && st.mode.type !== 'cam') orbit(dx, dy)
      }
    }
    // 拾取节流:150ms 内不重复 raycast(高帧率下 pointermove 不再每帧开启 raycaster)
    let hoverAt = 0
    const onHover = (ev: PointerEvent) => {
      if (tc.dragging) return
      if (drag.active || S.getState().placement) { hoverId = null; return }
      const now = performance.now()
      if (now - hoverAt < 150) return
      hoverAt = now
      const bd = pickBlockDot(ev)
      const changed = bd
        ? (blockHot?.id !== bd.id || blockHot?.index !== bd.index)
        : blockHot !== null
      if (changed) {
        blockHot = bd
        applyBlockStyles()
        el.style.cursor = bd ? 'grab' : ''
      }
      hoverId = bd ? null : pickEntity(ev)
    }
    const onLeave = () => {
      hoverId = null
      if (blockHot) { blockHot = null; applyBlockStyles(); el.style.cursor = '' }
    }

    const onUp = (ev: PointerEvent) => {
      const st = S.getState()
      if (blockDrag) {
        const moved = drag.moved >= 6
        const { id, index } = blockDrag
        blockDrag = null
        drag.active = false; drag.orbit = false; drag.pan = false
        if (moved && blockDragPos) {
          st.snapshot('移动走位点')
          st.setBlockingPoint(id, index, blockDragPos)
          st.toast(`路点 ${index + 1} → ${blockDragPos.map(v => v.toFixed(2)).join(', ')}`)
        } else {
          st.select(id)
        }
        blockDragPos = null
        return
      }
      if (drag.active && drag.moved < 6 && ev.button === 0) {
        if (st.blockingFor) {
          const hit = groundHit(ev)
          if (hit) st.addBlockingPoint([hit.x, hit.y, hit.z])
        } else if (st.placement) st.confirmPlacement()
        else {
          const id = pickEntity(ev)
          if (id) st.clickChip(id)
          else if (!ev.altKey) st.select(null)
        }
      }
      drag.active = false; drag.orbit = false; drag.pan = false
    }
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault()
      const st = S.getState()
      if (st.placement) { st.scalePlacement(-ev.deltaY); return }
      if (!st.wheelZoom) return
      sph.setFromVector3(_orb.copy(cam.position).sub(target))
      sph.radius = Math.max(2, Math.min(80, sph.radius * (1 + ev.deltaY * 0.001)))
      cam.position.copy(target).add(_orb.setFromSpherical(sph))
    }
    const onContext = (ev: MouseEvent) => {
      ev.preventDefault()
      const st = S.getState()
      const hit = groundHit(ev)
      if (hit && !st.placement) st.setPendingGround([hit.x, hit.y, hit.z])
    }
    const onDbl = (ev: MouseEvent) => {
      const st = S.getState()
      const id = pickEntity(ev)
      if (!id) return
      const g = groups.get(id)
      if (g) { target.copy(g.position); st.select(id); st.setTip(null) }
    }

    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    el.addEventListener('pointermove', onHover)
    el.addEventListener('pointerleave', onLeave)
    window.addEventListener('pointerup', onUp)
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('contextmenu', onContext)
    el.addEventListener('dblclick', onDbl)

    /* ── 运镜路径 ── */
    let path: CameraPath | null = null
    let pathStart = 0
    const pathBase = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), fov: 24 }
    const startPath = (p: CameraPath) => {
      path = p
      pathStart = performance.now()
      pathBase.pos.copy(cam.position)
      pathBase.tgt.copy(target)
      pathBase.fov = cam.fov
    }
    const onRunPath = (ev: Event) => {
      const p = (ev as CustomEvent<CameraPath>).detail
      if (p) startPath(p)
    }
    const onStopPath = () => { path = null }
    window.addEventListener('studio-run-path', onRunPath)
    window.addEventListener('studio-stop-path', onStopPath)

    /* ── 机位/操控视角平滑过渡 + 第一视角驾驶状态 ── */
    let viewPrev = false        // 上一帧是否处于机位/操控视角
    let viewCamPrev: string | null = null  // 上一帧渲染用的机位(切镜=硬切)
    let viewBlend = 1           // 过渡进度 0→1
    const vbFrom = { pos: new THREE.Vector3(), tgt: new THREE.Vector3() }
    const vbTo = { pos: new THREE.Vector3(), tgt: new THREE.Vector3() }
    const cinePos = new THREE.Vector3()
    const cineTgt = new THREE.Vector3()
    let lastCinePos: THREE.Vector3 | null = null
    let lastCineTgt: THREE.Vector3 | null = null
    /* ── 操控/走位步态:关节缓存(名字来自 models.buildHuman) ── */
    interface JointSet {
      group: THREE.Object3D
      hips: THREE.Object3D[]
      knees: THREE.Object3D[]
      shoulders: THREE.Object3D[]
      elbows: THREE.Object3D[]
      base: number[]
      pelvis: THREE.Object3D | null
      pelvisBaseY: number
      pelvisStandY: number
      phase: number
      stand: number
    }
    const jointCache = new Map<string, JointSet>()
    let ctlId: string | null = null
    let lastRenderCam: THREE.Camera
    let ctlMoving = false
    let jointGen = 0
    let fpsEma = 60
    const blockingMoving = new Set<string>()
    let poseAnimating = false
    let actPhase = 0
    /** 时间轴采样出的表演动作(优先于实体静态 acting) */
    const sampledActing = new Map<string, string>()
    /** 时间轴采样出的姿态(优先于实体静态 pose) */
    const sampledPose = new Map<string, string>()
    /** 时间轴采样出的焦距 mm(相机变焦) */
    const sampledFocal = new Map<string, number>()
    /** 本地时间轴时钟:逐帧采样用它,store 仅低频同步 */
    let tlTime = S.getState().timeline.time
    let tlCommitAt = 0

    const captureJoints = (id: string): JointSet | null => {
      const g = groups.get(id)
      if (!g) return null
      const pick = (names: string[]) => {
        const out: THREE.Object3D[] = []
        g.traverse(o => { if (names.includes(o.name)) out.push(o) })
        return out
      }
      const hips = pick(['hipL', 'hipR'])
      if (!hips.length) return null
      const knees = pick(['kneeL', 'kneeR'])
      const shoulders = pick(['shoulderL', 'shoulderR'])
      const elbows = pick(['elbowL', 'elbowR'])
      const pelvis = g.getObjectByName('pelvis') ?? null
      const modelH = S.getState().getEntity(id)?.height ?? 1.7
      jointGen++
      return {
        group: g, hips, knees, shoulders, elbows,
        base: [...hips, ...knees, ...shoulders, ...elbows].map(o => o.rotation.x),
        pelvis,
        pelvisBaseY: pelvis ? pelvis.position.y : 0,
        pelvisStandY: 0.47 * modelH,
        phase: 0,
        stand: 0,
      }
    }
    const restoreJoints = (js: JointSet) => {
      const all = [...js.hips, ...js.knees, ...js.shoulders, ...js.elbows]
      all.forEach((o, i) => { if (o) o.rotation.x = js.base[i] })
      if (js.pelvis) js.pelvis.position.y = js.pelvisBaseY
      shadowDirty = true
    }
    /** 每帧驱动一个角色的关节:起身过渡 + 行走摆动 / 静止缓回 */
    const walkEntity = (id: string, dt: number, moving: boolean, fast: boolean) => {
      let js = jointCache.get(id)
      if (js && js.group !== groups.get(id)) { jointCache.delete(id); js = undefined } // 模型重建 → 缓存失效
      if (!js) {
        const made = captureJoints(id)
        if (!made) return
        jointCache.set(id, made)
        js = made
      }
      if (js.stand < 1) { js.stand = Math.min(1, js.stand + dt / 0.5); shadowDirty = true }
      const standBase = [0, 0, 0.03, 0.03, 0.06, 0.06, -0.14, -0.14]
      const eff = js.base.map((v, i) => v + (standBase[i] - v) * js.stand)
      const [bH0, bH1, bK0, bK1, bS0, bS1, bE0, bE1] = eff
      if (js.pelvis) js.pelvis.position.y = js.pelvisBaseY + (js.pelvisStandY - js.pelvisBaseY) * js.stand
      if (moving) {
        js.phase += dt * (fast ? 13 : 8)
        const s = Math.sin(js.phase)
        const c = Math.sin(js.phase + Math.PI)
        const amp = 0.6
        const h = js.hips, kn = js.knees, sh = js.shoulders, el = js.elbows
        if (h[0]) h[0].rotation.x = bH0 + s * amp
        if (h[1]) h[1].rotation.x = bH1 + c * amp
        if (kn[0]) kn[0].rotation.x = bK0 + Math.max(0, -s) * 0.9
        if (kn[1]) kn[1].rotation.x = bK1 + Math.max(0, -c) * 0.9
        if (sh[0]) sh[0].rotation.x = bS0 + c * amp * 0.7
        if (sh[1]) sh[1].rotation.x = bS1 + s * amp * 0.7
        if (el[0]) el[0].rotation.x = bE0 - 0.35 - Math.abs(c) * 0.25
        if (el[1]) el[1].rotation.x = bE1 - 0.35 - Math.abs(s) * 0.25
        if (js.pelvis) js.pelvis.position.y += Math.abs(Math.sin(js.phase * 2)) * 0.018 * js.stand
        shadowDirty = true
      } else {
        const ease = Math.min(1, dt * 6)
        let dirty = false
        const easeTo = (o: THREE.Object3D | undefined, b: number) => {
          if (!o) return
          const next = o.rotation.x + (b - o.rotation.x) * ease
          if (Math.abs(next - o.rotation.x) > 1e-4) dirty = true
          o.rotation.x = next
        }
        easeTo(js.hips[0], bH0); easeTo(js.hips[1], bH1)
        easeTo(js.knees[0], bK0); easeTo(js.knees[1], bK1)
        easeTo(js.shoulders[0], bS0); easeTo(js.shoulders[1], bS1)
        easeTo(js.elbows[0], bE0); easeTo(js.elbows[1], bE1)
        if (dirty) shadowDirty = true
      }
    }

    /** 走位路径采样:分段时长优先(可表达停留),否则按弧长匀速;返回是否在移动(决定步态) */
    const blockLenCache = new WeakMap<Vec3[], { closed: boolean; lens: number[]; total: number }>()
    const sampleBlocking = (pts: Vec3[], tSec: number, closed: boolean, segDur: number[] | undefined, spanSec: number): { pos: Vec3; rotY: number; moving: boolean } => {
      const n = pts.length
      const segCount = closed && n >= 2 ? n : n - 1
      let cache = blockLenCache.get(pts)
      if (!cache || cache.closed !== closed || cache.lens.length !== segCount) {
        const lens: number[] = []
        let total = 0
        for (let i = 0; i < segCount; i++) {
          const a = pts[i], b = pts[(i + 1) % n]
          const d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
          lens.push(d)
          total += d
        }
        cache = { closed, lens, total }
        blockLenCache.set(pts, cache)
      }
      const { lens, total } = cache
      const segAt = (i: number, f: number) => {
        const a = pts[i], b = pts[(i + 1) % n]
        return {
          pos: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f] as Vec3,
          rotY: Math.atan2(b[0] - a[0], b[2] - a[2]),
        }
      }
      // 分段时长模式:每段占固定秒数,末尾超出则停在终点
      if (segDur && segDur.length >= segCount && segDur.some(d => d > 0)) {
        const tt = Math.max(0, tSec)
        let acc = 0
        for (let i = 0; i < segCount; i++) {
          const d = segDur[i] ?? 0
          if (tt <= acc + d || i === segCount - 1) {
            const local = d > 1e-6 ? Math.min(1, (tt - acc) / d) : 1
            const len = lens[i]
            const f = len > 1e-6 ? local : 0
            const r = segAt(i, f)
            return { ...r, moving: len > 0.02 && d > 1e-6 && (tt - acc) < d }
          }
          acc += d
        }
        return { pos: pts[n - 1], rotY: 0, moving: false }
      }
      // 未设分段:在时间轴时长内按弧长匀速走完
      if (total < 1e-6) return { pos: pts[0], rotY: 0, moving: false }
      const u = spanSec > 1e-3 ? tSec / spanSec : 0
      let dist = Math.max(0, Math.min(0.999999, u)) * total
      for (let i = 0; i < lens.length; i++) {
        const seg = lens[i]
        if (dist <= seg || i === lens.length - 1) {
          const f = seg > 1e-6 ? Math.min(1, dist / seg) : 0
          return { ...segAt(i, f), moving: true }
        }
        dist -= seg
      }
      return { pos: pts[n - 1], rotY: 0, moving: false }
    }
    // 打光轨采样
    let lightSampled = false
    const _colA = new THREE.Color()
    const _colB = new THREE.Color()

    /* ── 聚焦 / 操控事件 ── */
    const focusOn = (id: string) => {
      const g = groups.get(id)
      if (!g) return
      const e = S.getState().getEntity(id)
      const ay = e
        ? e.kind === 'actor' ? (e.height ?? 1.7) * e.scale * 0.55
          : e.kind === 'camera' ? 1.2 * e.scale : 0.6 * e.scale
        : 0.6
      target.set(g.position.x, g.position.y + ay, g.position.z)
      S.getState().select(id)
    }
    const onFocus = (ev: Event) => focusOn((ev as CustomEvent<string>).detail)
    /** 聚焦到坐标(走位卡「定位」):把轨道中心挪到该点,距离保持 */
    const onFocusPoint = (ev: Event) => {
      const p = (ev as CustomEvent<Vec3>).detail
      if (!p?.length) return
      target.set(p[0], p[1] + S.getState().env.groundH + 0.2, p[2])
    }
    const onControl = (ev: Event) => {
      const id = (ev as CustomEvent<string>).detail
      if (!id || !groups.get(id)) return
      S.getState().setControl(id)
    }
    window.addEventListener('studio-focus', onFocus)
    window.addEventListener('studio-focus-point', onFocusPoint)
    window.addEventListener('studio-control', onControl)

    window.addEventListener('studio-reset-view', applyStageHome)

    /* ── 键盘 ── */
    const pressed = new Set<string>()
    const onKey = (ev: KeyboardEvent) => {
      const st = S.getState()
      const ae = document.activeElement as HTMLElement | null
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return
      const k = ev.key.toLowerCase()
      if (ev.metaKey || ev.ctrlKey) {
        if (k === 'z') { ev.preventDefault(); ev.shiftKey ? st.redo() : st.undo() }
        return
      }
      pressed.add(k)
      const sel = st.selection ? st.getEntity(st.selection) : undefined
      if (ev.key === '[') st.stepFocal(-1)
      else if (ev.key === ']') st.stepFocal(1)
      else if (ev.key === 'Escape') {
        if (st.blockingFor) st.endBlocking()
        else if (st.placement) st.cancelPlacement()
        else if (st.placementMenuOpen) st.setPlacementMenu(false)
        else if (st.moreMenuFor) useStudio.setState({ moreMenuFor: null })
        else if (st.viewfinder) st.setViewfinder(false)
        else if (st.controlId) st.setControl(null)
        else if (st.mode.type !== '3d') st.setMode({ type: '3d' })
        else if (st.selection) st.select(null)
        else if (st.openPanel) st.openP(null)
      } else if (ev.key === ' ') { ev.preventDefault(); if (st.timeline.open) st.setTimeline({ playing: !st.timeline.playing }) }
      else if (/^[1-9]$/.test(ev.key)) {
        // 数字键 1–9 直接切到第 N 台摄像机
        const cams = st.effectiveEntities().filter(x => x.kind === 'camera')
        const cam = cams[Number(ev.key) - 1]
        if (cam) st.setMode({ type: 'cam', id: cam.id })
      }
      else if (sel) {
        if (k === 'f') focusOn(sel.id)
        else if (k === 't') st.setGizmoMode('translate')
        else if (k === 'r') st.setGizmoMode('rotate')
        else if (k === 'g' && !st.controlId && !sel.locked) st.dropToGround(sel.id)
        else if (k === 'l') st.commitEntity(sel.id, { locked: !sel.locked }, sel.locked ? '解锁' : '锁定')
        else if ((ev.key === 'Delete' || ev.key === 'Backspace') && !sel.locked) st.removeEntity(sel.id)
        else if (k === 'c') {
          if (sel.kind === 'camera') st.setMode({ type: 'cam', id: sel.id })
          else st.setControl(sel.id)
        }
      }
    }
    const onKeyUp = (ev: KeyboardEvent) => pressed.delete(ev.key.toLowerCase())
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)

    /* ── 录制(canvas.captureStream + MediaRecorder) ── */
    let recorder: MediaRecorder | null = null
    let recChunks: Blob[] = []
    let recResolve: ((url: string | null) => void) | null = null
    let recTrack: CanvasCaptureMediaStreamTrack | null = null

    const pickMime = () => {
      if (typeof MediaRecorder === 'undefined') return ''
      for (const m of ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']) {
        if (MediaRecorder.isTypeSupported(m)) return m
      }
      return ''
    }
    const startRecord = (): boolean => {
      if (recorder) return false
      // 录制时按设置的分辨率提升像素比,结束恢复(交互帧率不受影响)
      const hi = ratioFor(S.getState().resolution)
      if (hi !== baseRatio) { renderer.setPixelRatio(hi); resize() }
      let stream: MediaStream
      try { stream = el.captureStream(0) } catch { return false }
      recTrack = (stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined) ?? null
      const mimeType = pickMime()
      let rec: MediaRecorder
      try {
        // 主路径显式码率;不支持时回退默认构造
        rec = new MediaRecorder(stream, { videoBitsPerSecond: 8_000_000 })
      } catch {
        try {
          rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 })
        } catch { stream.getTracks().forEach(t => t.stop()); recTrack = null; return false }
      }
      recorder = rec
      recChunks = []
      rec.ondataavailable = ev => { if (ev.data && ev.data.size) recChunks.push(ev.data) }
      rec.onstop = () => {
        const blob = new Blob(recChunks, { type: rec.mimeType || 'video/webm' })
        recChunks = []
        recTrack = null
        stream.getTracks().forEach(t => t.stop())
        if (recorder === rec) recorder = null
        // 恢复交互像素比
        if (renderer.getPixelRatio() !== baseRatio) { renderer.setPixelRatio(baseRatio); resize() }
        const url = blob.size > 0 ? URL.createObjectURL(blob) : null
        const done = recResolve
        done?.(url)
      }
      try { rec.start() } catch { recorder = null; recTrack = null; stream.getTracks().forEach(t => t.stop()); return false }
      S.getState().setRecording(true)
      return true
    }
    const stopRecord = (): Promise<string | null> => {
      const rec = recorder
      if (!rec) return Promise.resolve(null)
      return new Promise<string | null>(resolve => {
        recResolve = resolve
        try { rec.stop() } catch {
          recResolve = null
          if (recorder === rec) recorder = null
          resolve(null)
        }
      })
    }

    /* ── store 订阅:结构 / 灯光 / 场地 / 录制开关 / 色调 ── */
    let lastVersion = S.getState().sceneVersion
    let recFlag = S.getState().recording
    let gradeSig = ''
    const applyGrade = () => {
      const g = S.getState().grade
      const sig = `${g.tone}|${g.exposure}`
      if (sig === gradeSig) return
      gradeSig = sig
      renderer.toneMapping = g.tone === 'aces' ? THREE.ACESFilmicToneMapping
        : g.tone === 'filmic' ? THREE.CineonToneMapping
          : g.tone === 'reinhard' ? THREE.ReinhardToneMapping
            : THREE.NoToneMapping
      renderer.toneMappingExposure = g.exposure
    }
    applyGrade()
    const unsubStore = S.subscribe(st => {
      if (st.sceneVersion !== lastVersion) { lastVersion = st.sceneVersion; syncStructure() }
      // 外部 seek / 暂停时把本地时钟对齐到 store
      if (!st.timeline.playing || Math.abs(st.timeline.time - tlTime) > 0.25) tlTime = st.timeline.time
      applyLights()
      applyHdri()
      syncStage()
      applyGrade()
      if (st.recording !== recFlag) {
        recFlag = st.recording
        if (st.recording && !recorder) startRecord()
        else if (!st.recording && recorder) void stopRecord()
      }
    })

    /* ── 走位路径可视化(黄线 + 路点) ── */
    const blockingGroup = new THREE.Group()
    scene.add(blockingGroup)
    /** 单条走位路径的可视化对象(共享几何/材质,diff 更新) */
    interface PathViz {
      count: number
      closed: boolean
      line: THREE.Line
      dots: THREE.Mesh[]
      labels: THREE.Sprite[]
    }
    const pathViz = new Map<string, PathViz>()
    /** 高亮点 hover 索引(entityId → index;-1 为无) */
    let blockHot: { id: string; index: number } | null = null
    const BLK_DOT_GEO = new THREE.SphereGeometry(0.095, 12, 10)
    const BLK_MAT = {
      sel: new THREE.MeshBasicMaterial({ color: '#f0d887' }),
      dim: new THREE.MeshBasicMaterial({ color: '#e6d08a', transparent: true, opacity: 0.34 }),
      hot: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
      start: new THREE.MeshBasicMaterial({ color: '#7ee2a8' }),
      end: new THREE.MeshBasicMaterial({ color: '#ff9f6e' }),
    }
    const BLK_LINE_MAT = {
      sel: new THREE.LineBasicMaterial({ color: '#f0d887', transparent: true, opacity: 0.95 }),
      dim: new THREE.LineBasicMaterial({ color: '#e6d08a', transparent: true, opacity: 0.3 }),
    }
    /** 路点标注 sprite:起 / 终 / 序号 */
    const blockLabel = (text: string, tone: 'start' | 'end' | 'mid'): THREE.Sprite => {
      const cv = document.createElement('canvas')
      cv.width = 64; cv.height = 64
      const ctx = cv.getContext('2d')!
      ctx.font = '700 34px system-ui, sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      const color = tone === 'start' ? '#7ee2a8' : tone === 'end' ? '#ff9f6e' : '#f0d887'
      ctx.beginPath()
      ctx.arc(32, 32, 27, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(10,10,12,.86)'
      ctx.fill()
      ctx.lineWidth = 4
      ctx.strokeStyle = color
      ctx.stroke()
      ctx.fillStyle = color
      ctx.fillText(text, 32, 35)
      const tex = new THREE.CanvasTexture(cv)
      tex.colorSpace = THREE.SRGBColorSpace
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }))
      sp.scale.set(0.46, 0.46, 1)
      return sp
    }
    const disposeSprite = (sp: THREE.Sprite) => {
      const m = sp.material as THREE.SpriteMaterial
      m.map?.dispose()
      m.dispose()
    }
    const dropPathViz = (id: string, viz: PathViz) => {
      blockingGroup.remove(viz.line, ...viz.dots, ...viz.labels)
      viz.line.geometry.dispose()
      for (const l of viz.labels) disposeSprite(l)
      pathViz.delete(id)
    }
    const _blkV = new THREE.Vector3()
    const seqPoints = (pts: Vec3[], closed: boolean): THREE.Vector3[] => {
      const out: THREE.Vector3[] = []
      for (const p of pts) out.push(new THREE.Vector3(p[0], p[1] + 0.04, p[2]))
      if (closed) out.push(out[0].clone())
      return out
    }
    const syncBlocking = () => {
      const st = S.getState()
      const b = st.blocking
      const closedMap = st.blockingClosed
      for (const [id, viz] of [...pathViz]) {
        const pts = b[id]
        if (!pts || pts.length < 2) { dropPathViz(id, viz); continue }
        const closed = !!closedMap[id]
        if (viz.count !== pts.length || viz.closed !== closed) { dropPathViz(id, viz); continue }
        // 仅坐标变化:原地更新(dragging 高频路径,零重建)
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i]
          viz.dots[i].position.set(p[0], p[1] + 0.04, p[2])
          viz.labels[i].position.set(p[0], p[1] + 0.34, p[2])
        }
        const seq = seqPoints(pts, closed)
        viz.line.geometry.setFromPoints(seq)
      }
      for (const [id, pts] of Object.entries(b)) {
        if (pts.length < 2 || pathViz.has(id)) continue
        const closed = !!closedMap[id]
        const seq = seqPoints(pts, closed)
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(seq), BLK_LINE_MAT.sel)
        blockingGroup.add(line)
        const dots: THREE.Mesh[] = []
        const labels: THREE.Sprite[] = []
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i]
          const dot = new THREE.Mesh(BLK_DOT_GEO, i === 0 ? BLK_MAT.start : i === pts.length - 1 ? BLK_MAT.end : BLK_MAT.sel)
          dot.position.set(p[0], p[1] + 0.04, p[2])
          dot.userData.blockIndex = i
          dots.push(dot)
          blockingGroup.add(dot)
          const lab = blockLabel(i === 0 ? '起' : i === pts.length - 1 ? '终' : String(i + 1), i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'mid')
          lab.position.set(p[0], p[1] + 0.34, p[2])
          labels.push(lab)
          blockingGroup.add(lab)
        }
        pathViz.set(id, { count: pts.length, closed, line, dots, labels })
      }
      applyBlockStyles()
    }
    /** 选中/绘制中的路径加亮并显示序号,其余弱化;走位卡悬停也高亮 */
    const applyBlockStyles = () => {
      const st = S.getState()
      for (const [id, viz] of pathViz) {
        const active = st.selection === id || st.blockingFor === id
        viz.line.material = active ? BLK_LINE_MAT.sel : BLK_LINE_MAT.dim
        for (let i = 0; i < viz.dots.length; i++) {
          const hot = (blockHot !== null && blockHot.id === id && blockHot.index === i) ||
            (st.pathHover === i && st.selection === id)
          const base = i === 0 ? BLK_MAT.start : i === viz.count - 1 ? BLK_MAT.end : BLK_MAT.sel
          viz.dots[i].material = hot ? BLK_MAT.hot : active ? base : BLK_MAT.dim
          viz.dots[i].scale.setScalar(hot ? 1.45 : 1)
          viz.labels[i].visible = active
        }
      }
    }

    /** 机位名 sprite(canvas 文本) */
    const nameSprite = (text: string): THREE.Sprite => {
      const cv = document.createElement('canvas')
      cv.width = 160; cv.height = 44
      const ctx = cv.getContext('2d')!
      ctx.font = '600 22px system-ui, sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillStyle = 'rgba(10,10,12,.72)'
      const w = Math.min(152, ctx.measureText(text).width + 22)
      ctx.beginPath()
      ctx.roundRect((160 - w) / 2, 8, w, 28, 14)
      ctx.fill()
      ctx.strokeStyle = 'rgba(240,216,135,.55)'
      ctx.stroke()
      ctx.fillStyle = '#f0d887'
      ctx.fillText(text, 80, 23)
      const tex = new THREE.CanvasTexture(cv)
      tex.colorSpace = THREE.SRGBColorSpace
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }))
      sp.scale.set(1.1, 0.3, 1)
      return sp
    }

    /* ── 机位视锥助手(设置开关,按需创建/销毁) ── */
    const frustumMap = new Map<string, { cam: THREE.PerspectiveCamera; helper: THREE.CameraHelper; label?: THREE.Sprite }>()
    const syncFrustums = () => {
      const show = S.getState().showFrustums && !viewActiveNow   // 取景画面里视锥属于编辑辅助
      if (!show) {
        if (frustumMap.size) {
          for (const f of frustumMap.values()) {
            scene.remove(f.helper); f.helper.dispose()
            if (f.label) { scene.remove(f.label); (f.label.material as THREE.SpriteMaterial).map?.dispose(); (f.label.material as THREE.SpriteMaterial).dispose() }
          }
          frustumMap.clear()
        }
        return
      }
      const cams = S.getState().effectiveEntities().filter(e => e.kind === 'camera')
      const seen = new Set<string>()
      for (const e of cams) {
        seen.add(e.id)
        let f = frustumMap.get(e.id)
        const g = groups.get(e.id)
        if (!g) continue
        if (!f) {
          const pc = new THREE.PerspectiveCamera(mmToFov(e.focalMm ?? 24), 16 / 9, 0.25, 24)
          const helper = new THREE.CameraHelper(pc)
          scene.add(helper)
          const label = nameSprite(e.name)
          scene.add(label)
          f = { cam: pc, helper, label }
          frustumMap.set(e.id, f)
        }
        const eyeY = g.position.y + 1.28 * e.scale
        f.cam.position.set(g.position.x, eyeY, g.position.z)
        f.cam.lookAt(g.position.x + Math.sin(e.rotationY), eyeY, g.position.z + Math.cos(e.rotationY))
        f.cam.fov = mmToFov(e.focalMm ?? 24)
        f.cam.updateProjectionMatrix()
        f.cam.updateMatrixWorld()
        f.helper.update()
        if (f.label) {
          f.label.position.set(g.position.x, eyeY + 0.42, g.position.z)
          // 按相机距离缩放:标签在屏幕上保持恒定可读大小
          const dist = cam.position.distanceTo(f.label.position)
          f.label.scale.set(dist * 0.13, dist * 0.036, 1)
        }
      }
      for (const [id, f] of [...frustumMap]) {
        if (!seen.has(id)) {
          scene.remove(f.helper); f.helper.dispose()
          if (f.label) { scene.remove(f.label); (f.label.material as THREE.SpriteMaterial).map?.dispose(); (f.label.material as THREE.SpriteMaterial).dispose() }
          frustumMap.delete(id)
        }
      }
    }

    /* ── 直接操纵(TransformControls):选中实体后拖拽平移/旋转 ── */
    const tc = new TransformControls(cam, el)
    const tcHelper = tc.getHelper()
    tcHelper.traverse(o => { o.frustumCulled = false })
    scene.add(tcHelper)
    tc.size = 0.9
    tc.translationSnap = 0.25          // 平移吸附 0.25m
    tc.rotationSnap = (Math.PI / 180) * 15  // 旋转吸附 15°
    let tcActive = false
    tc.addEventListener('dragging-changed', ev => {
      if (ev.value) {
        // gizmo 拖拽接管指针,取消轨道/平移相机手势
        drag.active = false; drag.orbit = false; drag.pan = false
      }
    })
    let tcScreen: number[] = []
    tc.addEventListener('mouseDown', () => {
      // 拖拽开始:压入一次历史快照(撤销可回到拖前),拖拽全程静默写回
      const id = (tc.object?.userData as { entityId?: string } | undefined)?.entityId
      if (id) S.getState().snapshot(tc.mode === 'rotate' ? '旋转对象' : '移动对象')
      tcActive = true
    })
    tc.addEventListener('mouseUp', () => { tcActive = false })
    tc.addEventListener('objectChange', () => {
      const g = tc.object
      const id = (g?.userData as { entityId?: string } | undefined)?.entityId
      if (!g || !id) return
      const patch: Partial<Entity> = {
        position: [g.position.x, Math.max(0, g.position.y - S.getState().env.groundH), g.position.z],
        scale: g.scale.x,
      }
      if (tc.mode === 'rotate') patch.rotationY = g.rotation.y
      S.getState().transformSilent(id, patch)
    })
    let lastCursorHover: string | null | undefined = undefined
    let boxKey = ''
    /* ── 主循环 ── */
    const clock = new THREE.Clock()
    let raf = 0
    const chipsBuf: ChipInfo[] = []
    let committed: ChipInfo[] = []
    let committedLen = 0
    let lastChipSig = ''
    let lastToolId: string | null = null
    const toolPos = { x: 0, y: 0 }

    // 每帧复用,避免分配
    const _fwd = new THREE.Vector3()
    const _right = new THREE.Vector3()
    const _mv = new THREE.Vector3()
    const _anchor = new THREE.Vector3()
    const _off = new THREE.Vector3()
    const _look = new THREE.Vector3()
    const _up = new THREE.Vector3(0, 1, 0)
    const _box3 = new THREE.Box3()

    const dbg: StudioDebugInfo = {
      ents: 0, groups: 0, camPos: [0, 0, 0], fov: 0, mode: '3d', chips: 0, canvas: [0, 0, 0, 0],
      lights: 0, path: null, recording: false, stage: 'blank', hover: null, selected: null, gltf: 0, control: null, recFrames: 0,
      view: 'free', walk: false, blend: 1, legs: [0, 0], jointGen: 0, dt: 0, phase: 0, pelvisY: 0, fps: 60,
      tone: 'none', exposure: 1, focus: 0, block: 0, blockPos: [], cinePos: [], frustums: 0, tc: 0, tcPos: [], tcAxis: null, labels: 0, selBox: [], pip: '', headYaw: 0, blockDots: 0, blockHot: -1, blockScreen: [], blockDrag: -1, cutCam: '', cutFocal: 0, cutAt: -1, actorPos: [], poseNow: '', cleanView: 0,
    }
    window.__studio_debug = dbg
    let blkRefA: Record<string, Vec3[]> | null = null
    let blkRefB: Record<string, boolean> | null = null
    let blkSel: string | null = null
    let blkFor: string | null = null
    let blkHover: number | null = null
    /** 当前是否处于取景(成片)视角:机位只是视角选项,不入镜 */
    let viewActiveNow = false

    const tick = () => {
      raf = requestAnimationFrame(tick)
      const st = S.getState()
      const dt = Math.min(clock.getDelta(), 0.1)
      const ents = st.effectiveEntities()
      const byId = new Map(ents.map(e => [e.id, e]))
      const gy = st.env.groundH
      // 走位路径 viz:仅在 blocking / closed / selection 变化时同步(拖拽时逐帧原地更新)
      if (st.blocking !== blkRefA || st.blockingClosed !== blkRefB || st.selection !== blkSel || st.blockingFor !== blkFor || st.pathHover !== blkHover) {
        blkRefA = st.blocking; blkRefB = st.blockingClosed; blkSel = st.selection; blkFor = st.blockingFor; blkHover = st.pathHover
        syncBlocking()
      }
      fpsEma = fpsEma * 0.9 + (1 / Math.max(dt, 1e-4)) * 0.1

      // 时间轴推进:本地时钟逐帧采样,store 每 100ms 提交一次(避免每帧触发 React 渲染)
      let tlTimeNow = st.timeline.time
      if (st.timeline.open && st.timeline.playing) {
        tlTime = tlTime + dt * (st.timeline.rate || 1)
        if (tlTime >= st.timeline.duration) tlTime = st.timeline.loop ? 0 : st.timeline.duration
        tlTimeNow = tlTime
        const ended = !st.timeline.loop && tlTime >= st.timeline.duration - 1e-6
        if (ended || performance.now() - tlCommitAt > 100) {
          tlCommitAt = performance.now()
          useStudio.setState({ timeline: { ...S.getState().timeline, time: tlTime, playing: !ended } })
        }
      } else {
        tlTime = st.timeline.time
        tlTimeNow = tlTime
      }

      // ── 取景(成片)视角解析:镜头轨 > 手动机位 > 操控 ──
      // 取景时画面只保留场景内容:机位(视角选项)与编辑辅助一律不入镜
      let cutCamId: string | null = null
      if (st.timeline.open && st.cuts.length) {
        const cutT = st.timeline.playing ? tlTimeNow : st.timeline.time
        const cut = st.cuts.find(c => cutT >= c.t0 - 1e-6 && cutT < c.t1) ?? (cutT >= st.timeline.duration - 1e-6 ? st.cuts[st.cuts.length - 1] : null)
        if (cut && cut.camId) cutCamId = cut.camId
      }
      const viewCamId = cutCamId ?? (st.mode.type === 'cam' ? st.mode.id : null)
      const viewActive = !!viewCamId || !!st.controlId
      viewActiveNow = viewActive
      // 机位模型与走位路径线:非场景内容,取景时一律不入镜(幂等,按需赋值)
      for (const e of ents) {
        if (e.kind !== 'camera') continue
        const cg = groups.get(e.id)
        if (cg && cg.visible === viewActive) cg.visible = !viewActive
      }
      if (blockingGroup.visible === viewActive) blockingGroup.visible = !viewActive
      syncFrustums()

      // 打光轨采样:播放时按关键帧插值灯光强度/颜色(不写 store)
      const lks = st.lightKeys
      const playingNow = st.timeline.open && st.timeline.playing
      if (playingNow && lks.length > 0 && lightGroup.children.length > 0) {
        const tt = tlTimeNow
        let ka = lks[0], kb = lks[lks.length - 1]
        for (const lk of lks) { if (lk.t <= tt) ka = lk; }
        for (let i = lks.length - 1; i >= 0; i--) { if (lks[i].t >= tt) kb = lks[i]; }
        const span = kb.t - ka.t
        const f = span > 1e-6 ? Math.min(1, Math.max(0, (tt - ka.t) / span)) : (tt < ka.t ? 0 : 1)
        for (const o of lightGroup.children) {
          const ltId = o.userData?.lightId as string | undefined
          const lt = o as THREE.Light
          if (!('isLight' in lt) || !lt.isLight) continue
          const da = ltId ? ka.defs.find(x => x.id === ltId) : undefined
          const db = ltId ? kb.defs.find(x => x.id === ltId) : undefined
          if (da && db) {
            lt.intensity = da.intensity + (db.intensity - da.intensity) * f
            _colA.set(da.color); _colB.set(db.color)
            lt.color.lerpColors(_colA, _colB, f)
          }
        }
        lightSampled = true
        shadowDirty = true
      } else if (lightSampled) {
        lightSampled = false
        lightsRef = null // 强制从 store 恢复灯光
        applyLights()
      }

      // WASD 驾驶:自由视角以相机为正前;机位/操控以被驾实体朝向为正前(第一视角)
      const spd = st.moveSpeed * 12 * dt * (pressed.has('shift') ? 3 : 1)
      const modeNow = st.mode
      const camMode = modeNow.type === 'cam'
      const drive = st.controlId ?? (camMode ? modeNow.id : null)
      if (drive) {
        const de = byId.get(drive)
        const ry = de ? de.rotationY : 0
        _fwd.set(Math.sin(ry), 0, Math.cos(ry))
        _right.set(-Math.cos(ry), 0, Math.sin(ry))
      } else {
        cam.getWorldDirection(_fwd); _fwd.y = 0; _fwd.normalize()
        _right.setFromMatrixColumn(cam.matrix, 0); _right.y = 0; _right.normalize()
      }
      _mv.set(0, 0, 0)
      if (pressed.has('w')) _mv.add(_fwd)
      if (pressed.has('s')) _mv.sub(_fwd)
      if (pressed.has('d')) _mv.add(_right)
      if (pressed.has('a')) _mv.sub(_right)
      if (camMode || st.controlId) {
        if (pressed.has('e')) _mv.y += 1
        if (pressed.has('q')) _mv.y -= 1
      }
      ctlMoving = false
      if (drive && _mv.lengthSq() > 0 && !(st.timeline.open && st.timeline.playing)) {
        _mv.normalize().multiplyScalar(spd)
        const de = byId.get(drive)
        if (de && !de.locked) {
          st.nudge(de.id, _mv.x, _mv.y, _mv.z)
          ctlMoving = drive === st.controlId
        }
      }

      // 运镜路径(在相机姿态之前应用)
      let pathFov = 0
      if (path && st.mode.type !== 'top') {
        const curPath = path
        const speed = Math.max(0.25, st.pathOpts.speed)
        const dur = Math.max(0.2, curPath.duration) / speed
        let prog = (performance.now() - pathStart) / 1000 / dur
        if (st.pathOpts.pingPong) {
          if (prog >= 2) { path = null; S.getState().stopPath(); prog = 1 }
          else { const cyc = prog % 2; prog = cyc <= 1 ? cyc : 2 - cyc }
        }
        const t = Math.min(1, prog)
        const ease = st.pathOpts.ease
        const k = ease === 'linear' ? t
          : ease === 'in' ? t * t
            : ease === 'out' ? 1 - (1 - t) * (1 - t)
              : t * t * (3 - 2 * t)
        cam.position.copy(pathBase.pos)
        target.copy(pathBase.tgt)
        _fwd.copy(pathBase.tgt).sub(pathBase.pos)
        const d0 = _fwd.length()
        if (d0 > 1e-4) _fwd.divideScalar(d0)
        _right.copy(_fwd).cross(_up).normalize()
        switch (curPath.kind) {
          case 'push': cam.position.addScaledVector(_fwd, d0 * 0.42 * k); break
          case 'pull': cam.position.addScaledVector(_fwd, -d0 * 0.5 * k); break
          case 'orbit': {
            const rad = curPath.radius && curPath.radius > 0 ? curPath.radius : d0
            _off.copy(pathBase.pos).sub(pathBase.tgt).setLength(rad).applyAxisAngle(_up, Math.PI * 2 * k)
            cam.position.copy(pathBase.tgt).add(_off)
            break
          }
          case 'craneUp': cam.position.y += 2.6 * k; target.y += 0.5 * k; break
          case 'craneDown': cam.position.y = Math.max(gy + 0.4, cam.position.y - 2.2 * k); target.y -= 0.4 * k; break
          case 'panLeft': case 'panRight': {
            _off.copy(target).sub(cam.position).applyAxisAngle(_up, (curPath.kind === 'panLeft' ? 1 : -1) * 0.55 * k)
            target.copy(cam.position).add(_off)
            break
          }
          case 'tiltUp': case 'tiltDown': {
            _off.copy(target).sub(cam.position).applyAxisAngle(_right, (curPath.kind === 'tiltUp' ? 1 : -1) * 0.45 * k)
            target.copy(cam.position).add(_off)
            break
          }
          case 'truckLeft': case 'truckRight': {
            const s = curPath.kind === 'truckLeft' ? -1 : 1
            cam.position.addScaledVector(_right, s * 2.2 * k)
            target.addScaledVector(_right, s * 2.2 * k)
            break
          }
          case 'dollyZoom': {
            cam.position.addScaledVector(_fwd, d0 * 0.45 * k)
            const d1 = Math.max(0.4, cam.position.distanceTo(target))
            pathFov = (2 * Math.atan(Math.tan((pathBase.fov * Math.PI) / 360) * (d0 / d1)) * 180) / Math.PI
            break
          }
          case 'handheld': {
            const tt = clock.elapsedTime
            const amp = 0.06 * (0.3 + k)
            cam.position.x += (Math.sin(tt * 7.3) * 0.6 + Math.sin(tt * 15.1) * 0.4) * amp
            cam.position.y += (Math.sin(tt * 9.1 + 1.7) * 0.5 + Math.sin(tt * 19.7) * 0.3) * amp
            target.x += Math.sin(tt * 6.1 + 0.9) * amp * 0.5
            target.y += Math.sin(tt * 8.7) * amp * 0.4
            break
          }
        }
        if (t >= 1 && !st.pathOpts.pingPong) { path = null; S.getState().stopPath() }
      }

      // 相机姿态
      if (st.mode.type === 'top') {
        cam.position.set(target.x, 26, target.z)
        cam.up.set(0, 0, -1)
        cam.lookAt(target.x, gy, target.z)
      } else {
        cam.up.set(0, 1, 0)
        cam.lookAt(target)
      }
      cam.fov = pathFov || mmToFov(FOCALS[st.focalIdx])
      cam.updateProjectionMatrix()
      // 实体位姿逐帧同步;gizmo 拖拽中的实体以 tc 为权威,跳过
      let entMoved = false
      const tcDragId = tc.dragging ? (tc.object?.userData as { entityId?: string } | undefined)?.entityId : undefined
      blockingMoving.clear()
      sampledActing.clear()
      sampledPose.clear()
      sampledFocal.clear()
      for (const e of ents) {
        if (tcDragId && e.id === tcDragId) continue
        const g = groups.get(e.id); if (!g) continue
        const keys = st.keys[e.id]
        const blockPts = st.blocking[e.id]
        let sample = e
        const hasPath = !!blockPts && blockPts.length >= 2
        // 走位路径优先驱动位置/朝向(角色调度);时间轴打开即采样,播放中附加步态;关键帧仅补缩放/动作
        if (st.timeline.open && hasPath) {
          const bp = sampleBlocking(blockPts, tlTimeNow, !!st.blockingClosed[e.id], st.blockingSeg[e.id], st.timeline.duration)
          sample = { ...e, position: bp.pos, rotationY: bp.rotY }
          if (e.kind === 'actor' && st.timeline.playing && bp.moving) blockingMoving.add(e.id)
        }
        if (st.timeline.open && keys?.length) {
          const ks = st.sampleEntityAt(e.id, tlTimeNow)
          if (ks) {
            sample = hasPath ? { ...sample, scale: ks.scale, acting: ks.acting, pose: ks.pose, focalMm: ks.focalMm } : ks
            if (sample.acting !== undefined) sampledActing.set(e.id, sample.acting)
          }
        }
        if (sample.pose !== undefined) sampledPose.set(e.id, sample.pose)
        if (sample.focalMm !== undefined) sampledFocal.set(e.id, sample.focalMm)
        const px = sample.position[0], py = sample.position[1] + gy, pz = sample.position[2]
        if (g.position.x !== px || g.position.y !== py || g.position.z !== pz ||
          g.rotation.y !== sample.rotationY || g.scale.x !== sample.scale) {
          g.position.set(px, py, pz)
          g.rotation.y = sample.rotationY
          g.scale.setScalar(sample.scale)
          shadowDirty = true
          entMoved = true
        }
      }

      // 姿态过渡:参数插值到目标姿态(操控/走位驱动的实体跳过,避免与步态打架)
      poseAnimating = false
      actPhase += dt
      for (const e of ents) {
        if (e.kind !== 'actor') continue
        const g = groups.get(e.id)
        if (!g || ctlId === e.id || blockingMoving.has(e.id)) continue
        let ps = poseStates.get(e.id)
        if (!ps) {
          const s0 = poseSpecOf(e.pose, tuneOf(e))
          ps = { key: poseKeyOf(e.pose, tuneOf(e)), ver: st.sceneVersion, cur: { ...s0 }, target: s0 }
          poseStates.set(e.id, ps)
          applyHumanPose(g, ps.cur)
          shadowDirty = true
          continue
        }
        if (ps.ver !== st.sceneVersion || sampledPose.get(e.id) !== undefined) {
          ps.ver = st.sceneVersion
          const poseName = sampledPose.get(e.id) ?? e.pose
          const key = poseKeyOf(poseName, tuneOf(e))
          if (ps.key !== key) { ps.key = key; ps.target = poseSpecOf(poseName, tuneOf(e)) }
        }
        const acting = sampledActing.get(e.id) ?? e.acting
        if (!poseEq(ps.cur, ps.target)) {
          ps.cur = poseLerp(ps.cur, ps.target, Math.min(1, dt * 7))
          applyHumanPose(g, ps.cur)
          shadowDirty = true
          poseAnimating = true
          if (poseEq(ps.cur, ps.target)) jointCache.delete(e.id) // 过渡结束:步态基准按新姿态重捕获
        }
        if (acting && poseEq(ps.cur, ps.target)) {
          applyHumanPose(g, ps.cur) // 动作每帧基于姿态重写关节
          applyHumanActing(g, acting, actPhase)
          shadowDirty = true
          poseAnimating = true
        }
      }

      // 看向目标:头部与躯干平滑转向(无目标时缓归正前方);与姿态/动作叠加
      for (const e of ents) {
        if (e.kind !== 'actor') continue
        const g = groups.get(e.id)
        if (!g) continue
        const refs = humanRefs(g)
        if (!refs) continue
        const tg = e.lookAtId ? groups.get(e.lookAtId) : undefined
        let headTarget = 0
        let pelvisTarget = 0
        if (tg) {
          const want = Math.atan2(tg.position.x - g.position.x, tg.position.z - g.position.z)
          const rel = Math.atan2(Math.sin(want - g.rotation.y), Math.cos(want - g.rotation.y))
          headTarget = Math.max(-1.15, Math.min(1.15, rel))
          pelvisTarget = Math.max(-0.55, Math.min(0.55, rel)) * 0.5
        }
        const rate = Math.min(1, dt * 8)
        const dh = headTarget - (refs.head?.rotation.y ?? 0)
        const dp = pelvisTarget - refs.pelvis.rotation.y
        if (Math.abs(dh) > 1e-3 || Math.abs(dp) > 1e-3) {
          if (refs.head) refs.head.rotation.y += dh * rate
          refs.pelvis.rotation.y += dp * rate
          shadowDirty = true
          poseAnimating = true
        }
      }

      // 操控/走位步态:统一关节缓存(操控第一视角 + 时间轴走位共用)
      if (st.controlId !== ctlId) {
        if (ctlId) {
          const old = jointCache.get(ctlId)
          if (old) { restoreJoints(old); jointCache.delete(ctlId) }
        }
        ctlId = st.controlId
        if (ctlId) walkEntity(ctlId, 0, false, false) // 建缓存并开始起身
      }
      if (ctlId) walkEntity(ctlId, dt, ctlMoving, pressed.has('shift'))
      if (blockingMoving.size) for (const id of blockingMoving) walkEntity(id, dt, true, false)

      // 选中视觉:橙色描边 + 直接操纵 gizmo(TransformControls)+ 角色圆环
      // 第一视角(机位/操控)下不显示边框/圆环/gizmo,避免挡住取景画面
      const selEnt = st.selection ? byId.get(st.selection) : undefined
      const sg = st.selection ? groups.get(st.selection) : undefined
      const actorSel = !!selEnt && selEnt.kind === 'actor'
      const fpView = viewActive
      const gizmoOn = !!sg && st.mode.type === '3d' && !st.placement && !fpView
      if (sg && !fpView) {
        boxHelper.visible = true
        // 静态帧(无播放/无操控/无关节动画)跳过包围盒重算,仅在变换或结构变化时更新
        const boxDynamic = st.timeline.playing || !!ctlId || blockingMoving.size > 0 || tc.dragging || poseAnimating
        let boxDirty = boxDynamic
        if (!boxDynamic) {
          const bk = `${st.selection}|${sg.position.x}|${sg.position.y}|${sg.position.z}|${sg.rotation.y}|${sg.scale.x}|${st.sceneVersion}`
          if (bk !== boxKey) { boxKey = bk; boxDirty = true }
        }
        if (boxDirty) {
          boxHelper.setFromObject(sg)
          _box3.setFromObject(sg)
          dbg.selBox = [_box3.max.x - _box3.min.x, _box3.max.y - _box3.min.y, _box3.max.z - _box3.min.z].map(v => +v.toFixed(2))
          if (boxDynamic) boxKey = ''
        }
      } else { boxHelper.visible = false; boxKey = ''; dbg.selBox = [] }
      // TransformControls 挂载/模式(旋转锁 Y,平移三轴)
      if (gizmoOn && sg) {
        if (tc.object !== sg) { sg.userData.entityId = st.selection; tc.attach(sg) }
        if (tc.mode !== st.gizmoMode) {
          tc.mode = st.gizmoMode
          const rotOnly = st.gizmoMode === 'rotate'
          tc.showX = !rotOnly; tc.showY = true; tc.showZ = !rotOnly
        }
        tcHelper.visible = true
        // 旧的装饰三轴让位给可交互 gizmo
        gizmo.visible = false
      } else {
        if (tc.object) tc.detach()
        tcHelper.visible = false
        gizmo.visible = false
      }
      selMarks.visible = !!sg && actorSel && !fpView
      if (sg && actorSel && !fpView) {
        selMarks.position.set(sg.position.x, gy + 0.012, sg.position.z)
        selMarks.rotation.y = sg.rotation.y
      }

      // 放置幽灵
      const pl = st.placement
      if (pl) {
        if (pl.spec.prim !== gPrim || pl.spec.color !== gColor || (pl.spec.height ?? 0) !== gHeight || (pl.spec.modelUrl ?? '') !== gUrl) {
          gPrim = pl.spec.prim; gColor = pl.spec.color; gHeight = pl.spec.height ?? 0; gUrl = pl.spec.modelUrl ?? ''
          syncGhost()
        }
      } else if (gPrim) { gPrim = ''; syncGhost() }
      if (pl?.ground) {
        ghost.visible = true
        ghost.position.set(pl.ground[0], pl.ground[1], pl.ground[2])
        ghost.scale.setScalar(pl.scaleMul)
      } else ghost.visible = false

      // 取景相机:机位模式 / 操控第一视角,进出均有平滑过渡
      let renderCam: THREE.Camera = cam
      const mode = st.mode
      if (viewActive !== viewPrev) {
        if (viewActive) {
          vbFrom.pos.copy(cam.position)
          vbFrom.tgt.copy(target)
          viewBlend = 0
        } else if (lastCinePos && lastCineTgt) {
          vbFrom.pos.copy(lastCinePos)
          vbFrom.tgt.copy(lastCineTgt)
          vbTo.pos.copy(cam.position)
          vbTo.tgt.copy(target)
          viewBlend = 0
        }
        viewPrev = viewActive
      }
      // 切镜:机位 id 变化时不做混合(硬切),仅进入/退出取景时才有过渡
      if (viewCamId !== viewCamPrev) {
        viewCamPrev = viewCamId
        viewBlend = 1
        dbg.cutAt = +((st.timeline.playing ? tlTimeNow : st.timeline.time).toFixed(2))
      }
      const blending = viewBlend < 1
      if (blending) viewBlend = Math.min(1, viewBlend + dt / 0.7)
      const kb = viewBlend * viewBlend * (3 - 2 * viewBlend)
      const blendPose = () => {
        _off.lerpVectors(vbFrom.pos, cinePos, kb)
        _look.lerpVectors(vbFrom.tgt, cineTgt, kb)
        cinePos.copy(_off)
        cineTgt.copy(_look)
      }
      if (viewCamId) {
        const ce = byId.get(viewCamId)
        const g = ce && groups.get(ce.id)
        if (ce && g) {
          const focalNow = sampledFocal.get(ce.id) ?? ce.focalMm ?? 32
          const focalFov = mmToFov(focalNow)
          cine.fov = blending ? THREE.MathUtils.lerp(mmToFov(FOCALS[st.focalIdx]), focalFov, kb) : focalFov
          cine.updateProjectionMatrix()
          cinePos.set(
            g.position.x + Math.sin(ce.rotationY) * 0.45 * ce.scale,
            g.position.y + 1.28 * ce.scale,
            g.position.z + Math.cos(ce.rotationY) * 0.45 * ce.scale,
          )
          const followEnt = ce.followId ? byId.get(ce.followId) : undefined
          if (followEnt) {
            const fg = groups.get(followEnt.id)
            const fx = fg ? fg.position.x : followEnt.position[0]
            const fz = fg ? fg.position.z : followEnt.position[2]
            const fy = (followEnt.height ?? 1.7) * followEnt.scale * 0.55
            const fyWorld = (fg ? fg.position.y : followEnt.position[1] + gy) + fy
            const mode2 = ce.followMode ?? 'aim'
            if (mode2 === 'track' || mode2 === 'orbit') {
              const off = ce.followOffset ?? [0, 1.6, 3.2]
              if (mode2 === 'orbit') {
                const a = clock.elapsedTime * (ce.orbitSpeed ?? 0.35)
                const ca = Math.cos(a), sa = Math.sin(a)
                cinePos.set(fx + off[0] * ca + off[2] * sa, fyWorld + off[1], fz - off[0] * sa + off[2] * ca)
              } else {
                cinePos.set(fx + off[0], fyWorld + off[1], fz + off[2])
              }
            }
            cineTgt.set(fx, fyWorld, fz)
          } else {
            cineTgt.set(Math.sin(ce.rotationY), 0, Math.cos(ce.rotationY)).add(cinePos)
          }
          if (blending) blendPose()
          cine.position.copy(cinePos)
          cine.up.set(0, 1, 0)
          cine.lookAt(cineTgt)
          lastCinePos = cine.position
          lastCineTgt = cineTgt
          renderCam = cine
        }
      } else if (st.controlId) {
        // 操控 = 被控体第一视角(角色:眼部;摄像机:镜头;道具:半高)
        const ce = byId.get(st.controlId)
        const g = ce && groups.get(ce.id)
        if (ce && g) {
          const eyeH = ce.kind === 'actor' ? (ce.height ?? 1.7) * ce.scale * 0.88
            : ce.kind === 'camera' ? 1.28 * ce.scale : (ce.height ?? 1) * ce.scale * 0.5 + 0.25
          const fpFov = ce.kind === 'camera' ? mmToFov(ce.focalMm ?? 32) : 75
          cine.fov = blending ? THREE.MathUtils.lerp(mmToFov(FOCALS[st.focalIdx]), fpFov, kb) : fpFov
          cine.updateProjectionMatrix()
          cinePos.set(
            g.position.x + Math.sin(ce.rotationY) * (ce.kind === 'camera' ? 0.45 : 0.18) * ce.scale,
            g.position.y + eyeH,
            g.position.z + Math.cos(ce.rotationY) * (ce.kind === 'camera' ? 0.45 : 0.18) * ce.scale,
          )
          cineTgt.set(Math.sin(ce.rotationY), 0, Math.cos(ce.rotationY)).add(cinePos)
          if (blending) blendPose()
          cine.position.copy(cinePos)
          cine.up.set(0, 1, 0)
          cine.lookAt(cineTgt)
          lastCinePos = cine.position
          lastCineTgt = cineTgt
          renderCam = cine
        }
      } else if (blending) {
        // 退出过渡:自由视角从机位姿态滑回进入前位置
        cam.position.lerpVectors(vbFrom.pos, vbTo.pos, kb)
        target.lerpVectors(vbFrom.tgt, vbTo.tgt, kb)
      }
      if (shadowDirty) {
        renderer.shadowMap.needsUpdate = true
        shadowDirty = false
      }
      lastRenderCam = renderCam
      renderer.render(scene, renderCam)
      // 机位/操控第一视角:右下角画中画(优先显示下一台机位 = 切台预览,否则自由相机);录制时不合成
      // 画中画监看窗:仅手动驾驶机位时显示切台预览;镜头轨出画(成片)时不叠加
      if (renderCam === cine && !recTrack && mode.type === 'cam') {
        const vw = el.clientWidth, vh = el.clientHeight
        const pipScale = st.pipLarge ? 0.34 : 0.22
        const pipW = Math.round(vw * pipScale)
        const pipH = Math.round(pipW * 9 / 16)
        const px = vw - pipW - 16
        const py = 84
        // 下一台机位(供切台预览)
        const cams = ents.filter(x => x.kind === 'camera')
        let nextCam: Entity | undefined
        if (cams.length >= 2 && mode.type === 'cam') {
          const idx = cams.findIndex(c => c.id === mode.id)
          nextCam = cams[(idx + 1) % cams.length]
        }
        dbg.pip = nextCam?.name ?? ''
        let pipCam: THREE.Camera | null = null
        if (nextCam) {
          const pg = groups.get(nextCam.id)
          if (pg) {
            const eyeY = pg.position.y + 1.28 * nextCam.scale
            cinePip.fov = mmToFov(nextCam.focalMm ?? 24)
            cinePip.position.set(
              pg.position.x + Math.sin(nextCam.rotationY) * 0.45 * nextCam.scale,
              eyeY,
              pg.position.z + Math.cos(nextCam.rotationY) * 0.45 * nextCam.scale,
            )
            _look.set(Math.sin(nextCam.rotationY), 0, Math.cos(nextCam.rotationY)).add(cinePip.position)
            cinePip.up.set(0, 1, 0)
            cinePip.aspect = pipW / pipH
            cinePip.updateProjectionMatrix()
            cinePip.lookAt(_look)
            pipCam = cinePip
          }
        }
        if (!pipCam) {
          cam.aspect = pipW / pipH
          cam.updateProjectionMatrix()
          pipCam = cam
        }
        renderer.setScissorTest(true)
        renderer.setViewport(px, py, pipW, pipH)
        renderer.setScissor(px, py, pipW, pipH)
        renderer.render(scene, pipCam)
        renderer.setScissorTest(false)
        renderer.setViewport(0, 0, vw, vh)
        cam.aspect = vw / Math.max(1, vh)
        cam.updateProjectionMatrix()
      } else {
        dbg.pip = ''
      }
      if (recTrack) { try { recTrack.requestFrame(); dbg.recFrames++ } catch { /* noop */ } }

      // 悬停光标
      if (hoverId !== lastCursorHover) { lastCursorHover = hoverId; el.style.cursor = hoverId ? 'pointer' : 'default' }
      const w = el.clientWidth, h = el.clientHeight
      const chipSig = `${renderCam.matrixWorld.elements.join(',')}|${st.selection}|${st.mode.type}|${st.mode.type === 'cam' ? st.mode.id : ''}|${viewActive}|${st.timeline.playing}|${ents.length}|${w}x${h}`
      let n = committedLen
      const chipStatic = !entMoved && chipSig === lastChipSig && committedLen > 0
      if (chipStatic) {
        n = committedLen
      } else {
        lastChipSig = chipSig
        n = 0
        for (const e of ents) {
          if (viewActive) break   // 取景画面里不出现任何对象标签(机位/角色/道具)
          const g = groups.get(e.id); if (!g) continue
          const ay = e.kind === 'actor' ? (e.height ?? 1.7) * e.scale + 0.3
            : e.prim === 'tree' ? 4.9 * e.scale
              : e.kind === 'camera' ? 1.9 * e.scale
                : e.prim === 'lamp' ? 3 * e.scale : 1.3 * e.scale
          _anchor.set(g.position.x, g.position.y + ay, g.position.z).project(renderCam)
          if (_anchor.z > 1) continue
          const x = (_anchor.x * 0.5 + 0.5) * w, y = (-_anchor.y * 0.5 + 0.5) * h
          if (x < -70 || x > w + 70 || y < -70 || y > h + 70) continue
          const c = chipsBuf[n] ?? (chipsBuf[n] = { id: '', x: 0, y: 0, selected: false, active: false })
          c.id = e.id; c.x = x; c.y = y
          c.selected = st.selection === e.id
          c.active = st.mode.type === 'cam' && st.mode.id === e.id
          n++
        }
      }

      const toolEnt = st.selection ? byId.get(st.selection) : (hoverId ? byId.get(hoverId) : undefined)
      const tg = toolEnt ? groups.get(toolEnt.id) : undefined
      let tId: string | null = null
      if (toolEnt && tg) {
        const ay = toolEnt.kind === 'actor' ? (toolEnt.height ?? 1.7) * toolEnt.scale + 0.3
          : toolEnt.prim === 'tree' ? 4.9 * toolEnt.scale
            : toolEnt.kind === 'camera' ? 1.9 * toolEnt.scale
              : toolEnt.prim === 'lamp' ? 3 * toolEnt.scale : 1.3 * toolEnt.scale
        _anchor.set(tg.position.x, tg.position.y + ay, tg.position.z).project(renderCam)
        if (_anchor.z <= 1) {
          toolPos.x = (_anchor.x * 0.5 + 0.5) * w
          toolPos.y = (-_anchor.y * 0.5 + 0.5) * h - 22
          tId = toolEnt.id
        }
      }
      if (tId !== lastToolId) {
        lastToolId = tId
        setTool(tId ? { id: tId, kind: toolEnt!.kind, x: toolPos.x, y: toolPos.y } : null)
      }
      if (tId && toolRef.current) {
        toolRef.current.style.left = `${toolPos.x}px`
        toolRef.current.style.top = `${toolPos.y}px`
      }

      // chips 脏检查(避免每帧 setState)
      let dirty = n !== committedLen
      if (!dirty) {
        for (let i = 0; i < n; i++) {
          const a = chipsBuf[i], b = committed[i]
          if (a.id !== b.id || Math.round(a.x) !== Math.round(b.x) || Math.round(a.y) !== Math.round(b.y) ||
            a.selected !== b.selected || a.active !== b.active) { dirty = true; break }
        }
      }
      if (dirty) {
        committedLen = n
        committed = chipsBuf.slice(0, n).map(c => ({ ...c }))
        setChips(committed)
      }

      // 自动化探针
      dbg.ents = ents.length
      dbg.groups = groups.size
      dbg.camPos[0] = +cam.position.x.toFixed(2)
      dbg.camPos[1] = +cam.position.y.toFixed(2)
      dbg.camPos[2] = +cam.position.z.toFixed(2)
      dbg.fov = +cam.fov.toFixed(1)
      dbg.mode = st.mode.type
      dbg.chips = n
      dbg.canvas[0] = el.width; dbg.canvas[1] = el.height; dbg.canvas[2] = el.clientWidth; dbg.canvas[3] = el.clientHeight
      dbg.lights = lightGroup.children.length
      let gltfCount = 0
      for (const g of groups.values()) if (g.userData.gltf) gltfCount++
      dbg.gltf = gltfCount
      dbg.path = path ? path.kind : null
      dbg.recording = !!recorder
      dbg.stage = st.env.stage
      dbg.hover = hoverId
      dbg.selected = st.selection
      dbg.control = st.controlId
      dbg.view = cutCamId ? 'cut' : st.controlId ? 'control' : mode.type === 'cam' ? 'cam' : 'free'
      dbg.cutCam = viewCamId ? (byId.get(viewCamId)?.name ?? '') : ''
      dbg.cutFocal = viewCamId ? +(sampledFocal.get(viewCamId) ?? byId.get(viewCamId)?.focalMm ?? 0).toFixed(1) : 0
      const actorPos: number[] = []
      for (const e of ents) {
        if (e.kind !== 'actor') continue
        const ag = groups.get(e.id)
        if (ag) actorPos.push(+ag.position.x.toFixed(2), +ag.position.z.toFixed(2), +ag.rotation.y.toFixed(2))
      }
      dbg.actorPos = actorPos
      const selE = st.selection ? byId.get(st.selection) : undefined
      dbg.poseNow = selE ? (sampledPose.get(selE.id) ?? selE.pose ?? '') : ''
      dbg.cleanView = viewActive ? 1 : 0
      dbg.walk = ctlMoving
      dbg.blend = +viewBlend.toFixed(2)
      const ctlJs = ctlId ? jointCache.get(ctlId) : (blockingMoving.size ? jointCache.get([...blockingMoving][0]) : undefined)
      dbg.legs = ctlJs ? [ctlJs.hips[0]?.rotation.x ?? 0, ctlJs.hips[1]?.rotation.x ?? 0] : [0, 0]
      dbg.jointGen = jointGen
      dbg.dt = +dt.toFixed(4)
      dbg.phase = +(ctlJs?.phase ?? 0).toFixed(2)
      dbg.pelvisY = ctlJs?.pelvis ? +ctlJs.pelvis.position.y.toFixed(3) : 0
      dbg.fps = Math.round(fpsEma)
      dbg.tone = st.grade.tone
      dbg.exposure = st.grade.exposure
      dbg.focus = mode.type === 'cam' && renderCam === cine ? +cine.position.distanceTo(lastCineTgt ?? cineTgt).toFixed(2) : 0
      dbg.block = Object.values(st.blocking).reduce((n, arr) => n + arr.length, 0)
      const blkId = (st.blockingFor && groups.has(st.blockingFor)) ? st.blockingFor
        : (st.selection && st.blocking[st.selection] && groups.has(st.selection)) ? st.selection
        : Object.keys(st.blocking).find(id => groups.has(id))
      const blkG = blkId ? groups.get(blkId) : undefined
      dbg.blockPos = blkG ? [+blkG.position.x.toFixed(2), +blkG.position.z.toFixed(2)] : []
      dbg.cinePos = renderCam === cine ? [+cine.position.x.toFixed(2), +cine.position.y.toFixed(2), +cine.position.z.toFixed(2)] : []
      dbg.frustums = frustumMap.size
      if (tc.object) {
        dbg.tc = 1
        dbg.tcAxis = tc.axis
        _anchor.setFromMatrixPosition(tc.object.matrixWorld).project(renderCam)
        dbg.tcPos = [Math.round((_anchor.x * 0.5 + 0.5) * el.clientWidth), Math.round((-_anchor.y * 0.5 + 0.5) * el.clientHeight)]
      } else { dbg.tc = 0; dbg.tcPos = []; dbg.tcAxis = null }
      dbg.labels = [...frustumMap.values()].filter(f => f.label).length
      const selG2 = st.selection ? groups.get(st.selection) : undefined
      const hy = selG2 ? humanRefs(selG2) : undefined
      dbg.headYaw = hy?.head ? +((hy.head.rotation.y * 180) / Math.PI).toFixed(1) : 0
      let dotCount = 0
      for (const viz of pathViz.values()) dotCount += viz.count
      dbg.blockDots = dotCount
      dbg.blockHot = blockHot ? blockHot.index : -1
      dbg.blockDrag = blockDrag ? blockDrag.index : -1
      const selViz = st.selection ? pathViz.get(st.selection) : undefined
      if (selViz) {
        const r = el.getBoundingClientRect()
        const out: number[] = []
        for (const d of selViz.dots) {
          _anchor.copy(d.position).project(renderCam)
          out.push(
            +(((_anchor.x + 1) / 2) * r.width + r.left).toFixed(1),
            +((1 - (_anchor.y + 1) / 2) * r.height + r.top).toFixed(1),
          )
        }
        dbg.blockScreen = out
      } else dbg.blockScreen = []
    }

    /* ── stageRef 能力 ── */
    stageRef.capture = () => {
      // 快门按设置的分辨率提升像素比,截完恢复
      const hi = ratioFor(S.getState().resolution)
      const bumped = hi !== baseRatio
      if (bumped) { renderer.setPixelRatio(hi); resize() }
      renderer.render(scene, lastRenderCam)
      const url = renderer.domElement.toDataURL('image/png')
      if (bumped) { renderer.setPixelRatio(baseRatio); resize(); renderer.render(scene, lastRenderCam) }
      return url
    }
    stageRef.startRecord = startRecord
    stageRef.stopRecord = stopRecord
    /** 按分镜时刻 + 机位离屏取帧:不写 store、不动编辑器状态,直接以该机位渲染一帧 */
    const capCam = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 500)
    stageRef.captureAt = (time, camId) => {
      const st0 = S.getState()
      const e = st0.getEntity(camId)
      if (!e || e.kind !== 'camera') return null
      const samp = st0.sampleEntityAt(camId, time) ?? e
      const [px, py, pz] = samp.position
      const ry = samp.rotationY
      const sc = samp.scale || e.scale || 1
      const focal = samp.focalMm ?? e.focalMm ?? 32
      const gy = st0.env.groundH
      const eyeY = py + gy + 1.28 * sc
      capCam.fov = mmToFov(focal)
      capCam.aspect = el.clientWidth / Math.max(1, el.clientHeight)
      capCam.updateProjectionMatrix()
      capCam.position.set(px + Math.sin(ry) * 0.45 * sc, eyeY, pz + Math.cos(ry) * 0.45 * sc)
      capCam.up.set(0, 1, 0)
      capCam.lookAt(capCam.position.x + Math.sin(ry), eyeY, capCam.position.z + Math.cos(ry))
      // 成片画面:机位模型与走位路径不入镜
      const camVis: [THREE.Object3D, boolean][] = []
      for (const c of st0.effectiveEntities()) {
        if (c.kind !== 'camera') continue
        const cg = groups.get(c.id)
        if (cg) { camVis.push([cg, cg.visible]); cg.visible = false }
      }
      const blkVis = blockingGroup.visible
      blockingGroup.visible = false
      const hi = ratioFor(st0.resolution)
      const bumped = hi !== baseRatio
      if (bumped) { renderer.setPixelRatio(hi); resize() }
      renderer.render(scene, capCam)
      const url = renderer.domElement.toDataURL('image/png')
      if (bumped) { renderer.setPixelRatio(baseRatio); resize() }
      for (const [o, v] of camVis) o.visible = v
      blockingGroup.visible = blkVis
      renderer.render(scene, lastRenderCam)   // 还原当前画面
      return url
    }
    stageRef.playPath = (p: CameraPath) => { S.setState({ activePath: p }); startPath(p) }
    stageRef.focusEntity = focusOn
    stageRef.getCamera = () => ({
      pos: cam.position.toArray() as [number, number, number],
      target: target.toArray() as [number, number, number],
    })
    stageRef.getTimelineTime = () => tlTime

    const resize = () => {
      const w = mount.clientWidth, h = mount.clientHeight
      renderer.setSize(w, h) // updateStyle=true:canvas 逻辑尺寸 = CSS 盒,缓冲区按 dpr 放大
      cam.aspect = w / h; cam.updateProjectionMatrix()
      cine.aspect = w / h; cine.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(mount)
    tick()

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      unsubStore()
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointermove', onHover)
      el.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('pointerup', onUp)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('contextmenu', onContext)
      el.removeEventListener('dblclick', onDbl)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('studio-reset-view', applyStageHome)
      window.removeEventListener('studio-focus', onFocus)
      window.removeEventListener('studio-focus-point', onFocusPoint)
      window.removeEventListener('studio-control', onControl)
      if (tc.object) tc.detach()
      scene.remove(tcHelper)
      tc.dispose()
      stageRef.capture = null
      window.removeEventListener('studio-stop-path', onStopPath)
      if (recorder) { try { recorder.stop() } catch { /* noop */ } recorder = null }
      stageRef.capture = null
      stageRef.startRecord = null
      stageRef.stopRecord = null
      stageRef.playPath = null
      stageRef.focusEntity = null
      stageRef.getCamera = null
      stageRef.getTimelineTime = null
      if (stageParts) { scene.remove(stageParts.group); stageParts.dispose() }
      if (grid) { grid.geometry.dispose(); (grid.material as THREE.Material).dispose() }
      if (envRT) envRT.dispose()
      for (const f of frustumMap.values()) { scene.remove(f.helper); f.helper.dispose() }
      frustumMap.clear()
      pmrem.dispose()
      for (const o of hdriGroup.children) if ((o as THREE.Light).isLight) (o as THREE.Light).dispose()
      boxHelper.geometry.dispose(); boxMat.dispose()
      gizmo.traverse(o => {
        const m = o as THREE.Mesh
        if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose() }
      })
      renderer.dispose()
      mount.removeChild(el)
    }
  }, [])

  const entityList = useEntities()
  const entityById = useMemo(() => new Map(entityList.map(e => [e.id, e])), [entityList])

  return (
    <>
      <div ref={mountRef} className="stage-mount" />
      <div className="chip-layer">
        {chips.map(c => <Chip key={c.id} chip={c} entity={entityById.get(c.id)} />)}
        {tool && <FloatToolbar key={tool.id} id={tool.id} kind={tool.kind} x={tool.x} y={tool.y} nodeRef={toolRef} />}
      </div>
    </>
  )
}

/* ── 场景芯片:pin 形 + 图标 + 选中黄描边 ─────────────────────── */
function Chip({ chip, entity: e }: { chip: ChipInfo; entity?: Entity }) {
  if (!e) return null
  const onClick = (ev: React.MouseEvent) => {
    ev.stopPropagation()
    const st = useStudio.getState()
    if (chip.active) useStudio.setState({ moreMenuFor: e.id })
    st.clickChip(e.id)
  }
  const dot = chip.active || (chip.selected && e.kind === 'camera')
  const style = { left: chip.x - 22, top: chip.y - 22, '--chip-mask': CHIP_MASK } as CSSProperties
  return (
    <button
      className={`scene-chip ${chip.selected ? 'selected' : ''}`}
      style={style}
      aria-label={e.name}
      onPointerDown={ev => ev.stopPropagation()}
      onClick={onClick}
    >
      <span className="chip-bg" />
      <svg className="chip-ring" viewBox="0 0 48 50" aria-hidden="true" style={{ width: '100%', height: '100%' }}>
        <path d={CHIP_PATH} style={chip.selected ? { stroke: '#f0d887', strokeWidth: 1.5 } : undefined} />
      </svg>
      <ChipIcon kind={e.kind} />
      {dot && <span className="chip-dot" />}
    </button>
  )
}

function ChipIcon({ kind }: { kind: string }) {
  const common = {
    width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true,
  }
  if (kind === 'camera') return (
    <svg {...common}>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  )
  if (kind === 'actor') return (
    <svg {...common}>
      <circle cx="12" cy="8" r="4.2" />
      <path d="M19.5 21a7.5 7.5 0 0 0-15 0" />
    </svg>
  )
  return (
    <svg {...common}>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  )
}

/* ── 选中 / 悬浮浮层:聚焦 + 按类型操控 ─────────────────────── */
function FloatToolbar({ id, kind, x, y, nodeRef }: {
  id: string; kind: Kind; x: number; y: number; nodeRef: RefObject<HTMLDivElement | null>
}) {
  const secondary = kind === 'camera'
    ? { aria: '操控摄像机', label: '操控摄像机', run: () => useStudio.getState().setMode({ type: 'cam', id }) }
    : kind === 'actor'
      ? { aria: '操控角色', label: '操控角色 C', run: () => window.dispatchEvent(new CustomEvent('studio-control', { detail: id })) }
      : { aria: '操控', label: '操控 C', run: () => window.dispatchEvent(new CustomEvent('studio-control', { detail: id })) }
  return (
    <div className="float-toolbar" ref={nodeRef} style={{ left: x, top: y }}>
      <button className="hud-btn" aria-label="聚焦" onClick={() => window.dispatchEvent(new CustomEvent('studio-focus', { detail: id }))}>聚焦 F</button>
      <button className="hud-btn" aria-label={secondary.aria} onClick={secondary.run}>{secondary.label}</button>
    </div>
  )
}
