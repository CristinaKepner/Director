import * as THREE from 'three'
import { Entity } from '../types'

/* ─────────────────────────────────────────────────────────────
   程序化模型库。约定:所有 buildXxx 返回的 Group 局部原点 = 接地点(脚底 y=0),
   朝向 +Z;entity 的 rotationY / scale 由 buildModel 叠加,stage 层再叠 env.groundH。
   ───────────────────────────────────────────────────────────── */

const M = (color: string, rough = 0.96, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness })

const add = <T extends THREE.Object3D>(g: THREE.Group, o: T, x = 0, y = 0, z = 0): T => {
  o.position.set(x, y, z)
  g.add(o)
  return o
}

/** 在实体颜色基础上压暗,用于头发 / 鞋 / 配饰 */
const shade = (color: string, k: number) =>
  `#${new THREE.Color(color).multiplyScalar(k).getHexString()}`

/* ── 角色:简化人体骨架 ─────────────────────────────────────── */

export interface PoseSpec {
  /** 骨盆高度(× 身高) */
  pelvisY: number
  pelvisX?: number
  /** 大腿绕 X 旋转(负值 = 向前抬) */
  thighX: number
  /** 小腿相对大腿的弯曲角 */
  shinX: number
  shoulderX: number
  elbowX: number
  shoulderZ?: number
  /** 整体绕脚底旋转(躺卧) */
  rootX?: number
  rootY?: number
  /** 整体侧倾(侧卧) */
  rootZ?: number
  /** 迈步镜像(行走/跑步):左右腿反向摆动 */
  mirror?: boolean
}

export const POSES: Record<string, PoseSpec> = {
  '站立': { pelvisY: 0.47, thighX: 0, shinX: 0.03, shoulderX: 0.06, elbowX: -0.14, shoulderZ: 0.1 },
  '行走': { pelvisY: 0.46, thighX: -0.5, shinX: 0.55, shoulderX: 0.42, elbowX: -0.4, shoulderZ: 0.1, mirror: true },
  '地坐': { pelvisY: 0.115, pelvisX: 0.08, thighX: -2.02, shinX: 1.45, shoulderX: -1.1, elbowX: -0.7, shoulderZ: 0.22 },
  '坐椅': { pelvisY: 0.265, thighX: -Math.PI / 2, shinX: Math.PI / 2, shoulderX: -0.5, elbowX: -1.0, shoulderZ: 0.16 },
  '躺卧': { pelvisY: 0.47, thighX: 0.06, shinX: 0.16, shoulderX: 0.08, elbowX: -0.2, shoulderZ: 0.16, rootX: -Math.PI / 2, rootY: 0.1 },
  '侧卧': { pelvisY: 0.34, thighX: -0.45, shinX: 0.55, shoulderX: -0.5, elbowX: -0.85, shoulderZ: 0.3, rootZ: -Math.PI / 2, rootY: -0.15 },
  '蹲下': { pelvisY: 0.24, thighX: -1.35, shinX: 2.0, shoulderX: -0.5, elbowX: -1.1, shoulderZ: 0.15 },
  '跪姿': { pelvisY: 0.26, thighX: -0.25, shinX: 1.75, shoulderX: -0.1, elbowX: -0.35, shoulderZ: 0.12 },
  '跑步': { pelvisY: 0.44, thighX: -1.0, shinX: 1.15, shoulderX: 0.95, elbowX: -1.35, shoulderZ: 0.14, mirror: true },
  '举手': { pelvisY: 0.47, thighX: 0, shinX: 0.03, shoulderX: -2.7, elbowX: -0.15, shoulderZ: 0.28 },
  '指向': { pelvisY: 0.47, thighX: 0, shinX: 0.03, shoulderX: -1.45, elbowX: -0.05, shoulderZ: 0.22 },
  '眺望': { pelvisY: 0.47, thighX: 0, shinX: 0.03, shoulderX: -2.3, elbowX: -1.7, shoulderZ: 0.55 },
  '叉腰': { pelvisY: 0.47, thighX: 0, shinX: 0.03, shoulderX: -0.6, elbowX: -2.0, shoulderZ: 0.9 },
  '抱臂': { pelvisY: 0.47, thighX: 0, shinX: 0.03, shoulderX: -1.0, elbowX: -2.2, shoulderZ: 0.15 },
}

function buildHuman(h: number, color: string, pose: string): THREE.Group {
  const g = new THREE.Group()
  const p = POSES[pose] ?? POSES['站立']
  const body = M(color, 0.62)
  const skin = M(shade(color, 0.82), 0.5)
  const hair = M(shade(color, 0.42), 0.85)
  const shoe = M(shade(color, 0.5), 0.7)

  const thigh = 0.2075 * h
  const shin = 0.2075 * h
  const upperArm = 0.155 * h
  const foreArm = 0.145 * h
  const torsoH = 0.32 * h
  const torsoR = 0.105 * h
  const headR = 0.075 * h

  const root = new THREE.Group()
  root.name = 'poseRoot'
  root.position.y = (p.rootY ?? 0) * h
    root.rotation.x = p.rootX ?? 0
    root.rotation.z = p.rootZ ?? 0
  g.add(root)

  const pelvis = new THREE.Group()
  pelvis.name = 'pelvis'
  pelvis.position.y = p.pelvisY * h
  pelvis.rotation.x = p.pelvisX ?? 0
  root.add(pelvis)

  // 躯干 / 颈 / 头(头部为独立关节,支持转头)
  add(pelvis, new THREE.Mesh(new THREE.CapsuleGeometry(torsoR, torsoH * 0.72, 4, 14), body), 0, torsoH * 0.5, 0)
  add(pelvis, new THREE.Mesh(new THREE.CylinderGeometry(0.042 * h, 0.05 * h, 0.08 * h, 8), skin), 0, torsoH * 1.02, 0)
  const headJoint = new THREE.Group()
  headJoint.name = 'head'
  headJoint.position.y = torsoH * 1.02 + 0.06 * h
  pelvis.add(headJoint)
  const head = add(headJoint, new THREE.Mesh(new THREE.SphereGeometry(headR, 18, 16), skin), 0, headR * 0.8, 0)
  head.scale.set(0.92, 1.06, 0.95)
  const cap = add(headJoint, new THREE.Mesh(new THREE.SphereGeometry(headR * 1.02, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hair), 0, headR * 0.86, 0)
  cap.scale.set(0.94, 1.0, 0.97)

  for (const s of [-1, 1] as const) {
    const mirror = pose === '行走' || pose === '跑步' ? s : 1
    // 腿
    const hip = new THREE.Group()
    hip.name = s < 0 ? 'hipL' : 'hipR'
    hip.position.set(s * 0.085 * h, 0, 0)
    hip.rotation.x = (pose === '行走' || pose === '跑步') && s > 0 ? -p.thighX * 0.72 : p.thighX
    pelvis.add(hip)
    add(hip, new THREE.Mesh(new THREE.CapsuleGeometry(0.055 * h, Math.max(0.01, thigh - 0.11 * h), 4, 10), body), 0, -thigh / 2, 0)
    const knee = new THREE.Group()
    knee.name = s < 0 ? 'kneeL' : 'kneeR'
    knee.position.y = -thigh
    knee.rotation.x = (pose === '行走' || pose === '跑步') && s > 0 ? p.shinX * 0.3 : p.shinX
    hip.add(knee)
    add(knee, new THREE.Mesh(new THREE.CapsuleGeometry(0.048 * h, Math.max(0.01, shin - 0.1 * h), 4, 10), body), 0, -shin / 2, 0)
    const foot = add(knee, new THREE.Mesh(new THREE.BoxGeometry(0.085 * h, 0.055 * h, 0.19 * h), shoe), 0, -shin - 0.0275 * h, 0.055 * h)
    foot.name = s < 0 ? 'footL' : 'footR'
    foot.rotation.x = -(hip.rotation.x + knee.rotation.x) // 脚掌保持水平

    // 手臂
    const shoulder = new THREE.Group()
    shoulder.name = s < 0 ? 'shoulderL' : 'shoulderR'
    shoulder.position.set(s * (torsoR + 0.028 * h), torsoH * 0.92, 0)
    shoulder.rotation.x = (pose === '行走' || pose === '跑步') ? mirror * p.shoulderX : p.shoulderX
    shoulder.rotation.z = -s * (p.shoulderZ ?? 0.1)
    pelvis.add(shoulder)
    add(shoulder, new THREE.Mesh(new THREE.CapsuleGeometry(0.042 * h, Math.max(0.01, upperArm - 0.084 * h), 4, 10), body), 0, -upperArm / 2, 0)
    const elbow = new THREE.Group()
    elbow.name = s < 0 ? 'elbowL' : 'elbowR'
    elbow.position.y = -upperArm
    elbow.rotation.x = p.elbowX
    shoulder.add(elbow)
    add(elbow, new THREE.Mesh(new THREE.CapsuleGeometry(0.036 * h, Math.max(0.01, foreArm - 0.072 * h), 4, 10), skin), 0, -foreArm / 2, 0)
    add(elbow, new THREE.Mesh(new THREE.SphereGeometry(0.045 * h, 10, 8), skin), 0, -foreArm - 0.02 * h, 0)
  }

  // 兜底:把包围盒底部对齐到 y=0(坐/躺等姿态可能有微小穿地)
  const box = new THREE.Box3().setFromObject(g)
  if (box.min.y < -0.002) root.position.y -= box.min.y
  g.userData.humanH = h
  g.userData.poseAlign = root.position.y - (p.rootY ?? 0) * h
  return g
}

/** 运行时姿态应用(不重建模型):关节引用懒缓存到 userData */
export interface HumanRefs {
  root: THREE.Object3D; pelvis: THREE.Object3D; head: THREE.Object3D | null
  hips: THREE.Object3D[]; knees: THREE.Object3D[]; shoulders: THREE.Object3D[]; elbows: THREE.Object3D[]; feet: THREE.Object3D[]
  h: number; align: number
}

/** 关节引用(懒缓存到 userData);非人体模型返回 undefined */
export function humanRefs(g: THREE.Object3D): HumanRefs | undefined {
  let refs = g.userData.poseRefs as HumanRefs | undefined
  if (refs) return refs
  const get = (n: string) => g.getObjectByName(n) ?? undefined
  const root = get('poseRoot'), pelvis = get('pelvis')
  const hips = [get('hipL'), get('hipR')], knees = [get('kneeL'), get('kneeR')]
  const shoulders = [get('shoulderL'), get('shoulderR')], elbows = [get('elbowL'), get('elbowR')]
  const feet = [get('footL'), get('footR')]
  if (!root || !pelvis || hips.some(x => !x) || knees.some(x => !x) || shoulders.some(x => !x) || elbows.some(x => !x)) return undefined
  refs = {
    root, pelvis,
    head: get('head') ?? null,
    hips: hips as THREE.Object3D[], knees: knees as THREE.Object3D[],
    shoulders: shoulders as THREE.Object3D[], elbows: elbows as THREE.Object3D[],
    feet: feet.filter(Boolean) as THREE.Object3D[],
    h: (g.userData.humanH as number) ?? 1.7,
    align: (g.userData.poseAlign as number) ?? 0,
  }
  g.userData.poseRefs = refs
  return refs
}

/** 周期性动作叠加:挥手 / 鼓掌 / 点头 / 呼吸(在姿态应用之后调用) */
export function applyHumanActing(g: THREE.Object3D, acting: string, phase: number, weight = 1): boolean {
  const refs = humanRefs(g)
  if (!refs) return false
  const { pelvis, shoulders, elbows } = refs
  const w = weight
  switch (acting) {
    case '挥手': {
      // 右手高举挥动:肩摆 ±0.32,肘随动
      const s = Math.sin(phase * 6)
      if (shoulders[1]) shoulders[1].rotation.x = -2.35 + s * 0.3 * w
      if (shoulders[1]) shoulders[1].rotation.z = -0.45 * w
      if (elbows[1]) elbows[1].rotation.x = -0.55 + Math.sin(phase * 6 + 0.8) * 0.5 * w
      break
    }
    case '鼓掌': {
      // 双手在胸前开合
      const c = (Math.sin(phase * 7) + 1) / 2
      for (let i = 0; i < 2; i++) {
        const s = i === 0 ? -1 : 1
        if (shoulders[i]) { shoulders[i].rotation.x = -1.35 * w; shoulders[i].rotation.z = -s * (0.28 + c * 0.3) * w }
        if (elbows[i]) elbows[i].rotation.x = -1.5 * w
      }
      break
    }
    case '点头': {
      const n = Math.sin(phase * 4)
      pelvis.rotation.x = (pelvis.rotation.x) + n * 0.09 * w
      break
    }
    case '呼吸': {
      const b = Math.sin(phase * 1.6)
      pelvis.position.y += b * 0.006 * refs.h * w
      if (shoulders[0]) shoulders[0].rotation.x += b * 0.02 * w
      if (shoulders[1]) shoulders[1].rotation.x += b * 0.02 * w
      break
    }
    default: return false
  }
  return true
}

export function applyHumanPose(g: THREE.Object3D, spec: PoseSpec): void {
  const refs = humanRefs(g)
  if (!refs) return
  const { root, pelvis, hips, knees, shoulders, elbows, feet, h, align } = refs
  root.rotation.x = spec.rootX ?? 0
  root.rotation.z = spec.rootZ ?? 0
  root.position.y = (spec.rootY ?? 0) * h + align
  pelvis.position.y = spec.pelvisY * h
  pelvis.rotation.x = spec.pelvisX ?? 0
  for (let i = 0; i < 2; i++) {
    const s = i === 0 ? -1 : 1
    const mirrored = !!spec.mirror
    hips[i].rotation.x = mirrored && s > 0 ? -spec.thighX * 0.72 : spec.thighX
    knees[i].rotation.x = mirrored && s > 0 ? spec.shinX * 0.3 : spec.shinX
    shoulders[i].rotation.x = mirrored ? s * spec.shoulderX : spec.shoulderX
    shoulders[i].rotation.z = -s * (spec.shoulderZ ?? 0.1)
    elbows[i].rotation.x = spec.elbowX
    if (feet[i]) feet[i].rotation.x = -(hips[i].rotation.x + knees[i].rotation.x) // 脚掌保持水平
  }
}

/* ── 摄像机:三脚架 + 机身 + 镜头(朝向 +Z) ─────────────────── */

function buildCamera(color: string): THREE.Group {
  const g = new THREE.Group()
  const shell = M(color, 0.48, 0.25)        // 彩色机身
  const trim = M(shade(color, 0.55), 0.5, 0.2)
  const metal = M('#3a3a42', 0.35, 0.65)
  const glass = M('#0c0c10', 0.2, 0.5)

  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.034, 1.02, 8), metal)
    leg.position.set(Math.cos(a) * 0.22, 0.49, Math.sin(a) * 0.22)
    leg.rotation.z = -Math.cos(a) * 0.34
    leg.rotation.x = Math.sin(a) * 0.34
    g.add(leg)
  }
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.062, 1.0, 10), metal), 0, 0.55, 0)
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 14), trim), 0, 1.07, 0)
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.5), shell), 0, 1.26, 0)
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 0.14), trim), 0, 1.42, -0.06)
  // 锥形镜头:尖端朝 +Z
  const lens = add(g, new THREE.Mesh(new THREE.ConeGeometry(0.115, 0.36, 18), glass), 0, 1.26, 0.42)
  lens.rotation.x = Math.PI / 2
  const ring = add(g, new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 8, 20), trim), 0, 1.26, 0.25)
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.025), glass), 0.26, 1.32, 0)
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.03), metal), -0.16, 1.45, 0)
  return g
}

/* ── 单体 prim ──────────────────────────────────────────────── */

export function buildModel(e: Entity): THREE.Group {
  const g = new THREE.Group()
  g.name = e.id
  switch (e.prim) {
    case 'tree': {
      // 巨型密叶写实树(对齐原站「深绿茂密+多分叉+画面主体」)
      const trunkMat = M('#5a4024', 0.95)
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 2.2, 10), trunkMat)
      trunk.position.y = 1.1
      g.add(trunk)
      for (let i = 0; i < 4; i++) {
        const a = 0.4 + i * 1.6
        const br = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, 1.5, 8), trunkMat)
        br.position.set(Math.cos(a) * 0.5, 2.35, Math.sin(a) * 0.5)
        br.rotation.set(0.35 + (i % 2) * 0.15, a, 1.0 + (i % 3) * 0.15)
        g.add(br)
      }
      const leafMats = [M('#264a1d', 0.94), M('#2f5422', 0.92), M('#335d26', 0.92), M('#1f3f15', 0.96)]
      // 密集连续叶冠:大量小叶团措叠成连续树冠,消除缝隙
      for (let i = 0; i < 72; i++) {
        const r = 0.28 + (i % 4) * 0.1
        const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), leafMats[i % leafMats.length])
        const a = (i / 72) * Math.PI * 2 + (i % 5) * 0.18
        const layer = Math.floor(i / 24)
        const ring = layer === 0 ? 0.6 : layer === 1 ? 1.18 : 1.55
        leaf.position.set(
          Math.cos(a) * ring * (0.8 + (i % 5) * 0.06),
          2.55 + layer * 0.5 + (i % 6) * 0.16,
          Math.sin(a) * ring * (0.8 + (i % 7) * 0.05),
        )
        leaf.scale.set(1, 0.72, 1)
        g.add(leaf)
      }
      // 顶部收口
      const top = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 1), leafMats[2])
      top.position.y = 4.55
      top.scale.set(1, 0.7, 1)
      g.add(top)
      g.scale.setScalar(3.2)
      break
    }
    case 'actor': {
      g.add(buildHuman(e.height ?? 1.7, e.color, e.pose ?? '站立'))
      break
    }
    case 'camera': {
      g.add(buildCamera(e.color))
      break
    }
    case 'rock': {
      const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), M(e.color, 1))
      rock.position.y = 0.52
      rock.scale.set(1.15, 0.8, 0.9)
      rock.rotation.set(0.15, 0.7, 0.08)
      g.add(rock)
      break
    }
    case 'crate': {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), M(e.color, 0.85))
      c.position.y = 0.4
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(c.geometry), new THREE.LineBasicMaterial({ color: '#6b5636' }))
      edge.position.y = 0.4
      g.add(c, edge)
      break
    }
    case 'lamp': {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.6, 8), M('#45454c', 0.5))
      pole.position.y = 1.3
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12),
        new THREE.MeshStandardMaterial({ color: e.color, emissive: e.color, emissiveIntensity: 0.8 }))
      head.position.y = 2.65
      const light = new THREE.PointLight('#ffd27a', 2.2, 5)
      light.position.y = 2.6
      g.add(pole, head, light)
      break
    }
    case 'plant': {
      const potMat = M('#b9805a', 0.9)
      add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.14, 0.3, 14), potMat), 0, 0.15, 0)
      add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.03, 14), M('#4a3a2c', 1)), 0, 0.3, 0)
      const leafMat = M(e.color, 0.8)
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2
        const leaf = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.42, 4, 8), leafMat)
        leaf.position.set(Math.cos(a) * 0.11, 0.56, Math.sin(a) * 0.11)
        leaf.rotation.x = Math.sin(a) * 0.5
        leaf.rotation.z = -Math.cos(a) * 0.5
        leaf.scale.y = 0.85 + (i % 3) * 0.14
        g.add(leaf)
      }
      break
    }
    case 'chair': {
      const mat = M(e.color, 0.75)
      const legMat = M('#6b5a45', 0.8)
      add(g, new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.46), mat), 0, 0.45, 0)
      add(g, new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.52, 0.06), mat), 0, 0.74, -0.2)
      for (const [x, z] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]] as const)
        add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.45, 8), legMat), x, 0.225, z)
      break
    }
    case 'table': {
      const mat = M(e.color, 0.7)
      add(g, new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.06, 0.8), mat), 0, 0.74, 0)
      for (const [x, z] of [[-0.54, -0.32], [0.54, -0.32], [-0.54, 0.32], [0.54, 0.32]] as const)
        add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.72, 8), M('#7d6242', 0.85)), x, 0.36, z)
      break
    }
    case 'sofa': {
      const mat = M(e.color, 0.85)
      const dark = M(shade(e.color, 0.78), 0.85)
      add(g, new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.34, 0.85), mat), 0, 0.17, 0)
      add(g, new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.56, 0.22), dark), 0, 0.62, -0.31)
      for (const s of [-1, 1] as const) add(g, new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 0.85), dark), s * 0.79, 0.42, 0)
      for (const s of [-1, 1] as const) add(g, new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.14, 0.7), mat), s * 0.4, 0.42, 0.03)
      break
    }
    case 'fence': {
      const mat = M(e.color, 0.9)
      for (const x of [-0.9, 0, 0.9] as const) add(g, new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.12, 0.09), mat), x, 0.56, 0)
      for (const y of [0.42, 0.92] as const) add(g, new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.09, 0.05), mat), 0, y, 0)
      break
    }
    case 'sign': {
      const post = M('#6d6d75', 0.6, 0.2)
      add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 1.6, 10), post), 0, 0.8, 0)
      add(g, new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.5, 0.05), M(e.color, 0.55)), 0, 1.36, 0.02)
      add(g, new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.36, 0.02), M('#ffffff', 0.5)), 0, 1.36, 0.05)
      break
    }
    case 'arch': {
      const mat = M(e.color, 0.8)
      for (const s of [-1, 1] as const) add(g, new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.6, 0.32), mat), s * 0.85, 0.8, 0)
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.1, 10, 28, Math.PI), mat)
      arc.position.y = 1.6
      g.add(arc)
      break
    }
    case 'stairs': {
      const mat = M(e.color, 0.88)
      const n = 4, rise = 0.18, depth = 0.32, w = 1.3
      for (let i = 0; i < n; i++) {
        const hgt = rise * (i + 1)
        add(g, new THREE.Mesh(new THREE.BoxGeometry(w, hgt, depth), mat), 0, hgt / 2, -i * depth)
      }
      break
    }
    case 'model': { // 上传的 GLTF 占位盒(加载完成后由 ThreeStage 替换)
      add(g, new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), M(e.color, 0.8)), 0, 0.45, 0)
      break
    }
    case 'sphere': { add(g, new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 24), M(e.color)), 0, 0.5, 0); break }
    case 'cylinder': { add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1, 24), M(e.color)), 0, 0.5, 0); break }
    case 'cone': { add(g, new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.1, 24), M(e.color)), 0, 0.55, 0); break }
    case 'box':
    default: { add(g, new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), M(e.color)), 0, 0.5, 0); break }
  }
  g.traverse(o => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true } })
  g.rotation.y = e.rotationY
  g.scale.setScalar(e.scale)
  return g
}

export const PRIM_LABEL: Record<string, string> = {
  box: '立方体', sphere: '球', cylinder: '圆柱体', cone: '圆锥体',
  rock: '岩石', crate: '木箱', lamp: '路灯', tree: '树', actor: '角色', camera: '摄像机', model: '模型',
  plant: '盆栽', chair: '椅子', table: '桌子', sofa: '沙发', fence: '围栏', sign: '标志牌', arch: '拱门', stairs: '台阶',
}

/* ─────────────────────────────────────────────────────────────
   场地(stage):返回 { group, dispose },group 局部地面在 y=0,
   由 ThreeStage 统一平移到 env.groundH。
   ───────────────────────────────────────────────────────────── */

export interface RoomSpec {
  w: number
  d: number
  h: number
  pattern: 'plain' | 'standard' | 'calibration'
  spacing: number
}
export interface StageEnv { groundSize: number; groundH: number; grid?: boolean; room?: RoomSpec }
export interface StageParts { group: THREE.Group; dispose: () => void }

const FLOOR_LIGHT = '#e9e9ec'
const WALL_LIGHT = '#e0e0e6'

/** 棋盘格贴图:8×8 格/repeat → repeat 决定每格实际尺寸 */
function checkerTexture(): THREE.CanvasTexture {
  const px = 512, cells = 8
  const cv = document.createElement('canvas')
  cv.width = cv.height = px
  const ctx = cv.getContext('2d')!
  const cs = px / cells
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#ececed' : '#c9c9d1'
      ctx.fillRect(x * cs, y * cs, cs, cs)
    }
  }
  const tex = new THREE.CanvasTexture(cv)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

/** 标定地板:按 spacing 画间距线 + 米数标注(非重复贴图,直接铺满房间) */
function calibrationTexture(w: number, d: number, spacing: number): THREE.CanvasTexture {
  const ppm = 128
  const cw = Math.min(2048, Math.max(256, Math.round(w * ppm)))
  const ch = Math.min(2048, Math.max(256, Math.round(d * ppm)))
  const cv = document.createElement('canvas')
  cv.width = cw; cv.height = ch
  const ctx = cv.getContext('2d')!
  ctx.fillStyle = '#eef0f3'
  ctx.fillRect(0, 0, cw, ch)
  const sx = cw / w, sz = ch / d // px per meter
  const step = Math.max(0.05, spacing)
  const line = (a: number, b: number, c: number, e: number, color: string, width: number) => {
    ctx.strokeStyle = color; ctx.lineWidth = width
    ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, e); ctx.stroke()
  }
  // 细线:每 spacing;中线:每 1m;粗线:每 5m
  for (let x = 0; x <= w + 1e-6; x += step) {
    const px = x * sx
    const meter = Math.abs(x / step - Math.round(x / step)) < 1e-6 && Math.abs(x - Math.round(x)) < 1e-6
    const five = Math.abs(x / 5 - Math.round(x / 5)) < 1e-6
    line(px, 0, px, ch, five ? '#8a8f99' : meter ? '#b3b8c2' : '#d2d6de', five ? 2.5 : meter ? 1.4 : 1)
  }
  for (let z = 0; z <= d + 1e-6; z += step) {
    const pz = z * sz
    const meter = Math.abs(z - Math.round(z)) < 1e-6
    const five = Math.abs(z / 5 - Math.round(z / 5)) < 1e-6
    line(0, pz, cw, pz, five ? '#8a8f99' : meter ? '#b3b8c2' : '#d2d6de', five ? 2.5 : meter ? 1.4 : 1)
  }
  // 米数标注(沿 X 轴中线)
  ctx.fillStyle = '#6f7480'
  ctx.font = `${Math.round(Math.min(30, sx * 0.42))}px ui-sans-serif, system-ui, sans-serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
  for (let m = 1; m <= Math.floor(w); m++) ctx.fillText(`${m}m`, m * sx, ch / 2 - 6)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

/** 轻微粗糙度噪点贴图(roughnessMap) */
function noiseTexture(): THREE.CanvasTexture {
  const px = 128
  const cv = document.createElement('canvas')
  cv.width = cv.height = px
  const ctx = cv.getContext('2d')!
  const img = ctx.createImageData(px, px)
  for (let i = 0; i < px * px; i++) {
    const v = 200 + Math.round(Math.random() * 45)
    img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(cv)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 4
  return tex
}

/** 空白场地:近黑地板(不受光照吸收)+ 阴影承接面(对齐原站实测:#161616 暗面 + 浅灰透视网格) */
export function buildFlatFloor(env: StageEnv): StageParts {
  const size = Math.max(160, env.groundSize * 8)
  const floorGeo = new THREE.PlaneGeometry(size, size)
  const floorMat = new THREE.MeshBasicMaterial({ color: '#1c1c1c' })
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2
  const shGeo = new THREE.PlaneGeometry(size, size)
  const shMat = new THREE.ShadowMaterial({ opacity: 0.45 })
  const shadow = new THREE.Mesh(shGeo, shMat)
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.002
  shadow.receiveShadow = true
  const group = new THREE.Group()
  group.add(floor, shadow)
  return { group, dispose: () => { floorGeo.dispose(); floorMat.dispose(); shGeo.dispose(); shMat.dispose() } }
}

/** 房间:按 env.room 生成地板(plain/standard/calibration)+ 两面后墙 + 圆角过渡 */
export function buildRoom(env: StageEnv): StageParts {
  const room: RoomSpec = env.room ?? { w: env.groundSize, d: env.groundSize, h: 5, pattern: 'standard', spacing: 1 }
  const w = Math.max(1, room.w), d = Math.max(1, room.d), wallH = Math.max(1, room.h)
  const spacing = Math.max(0.05, room.spacing)
  const halfW = w / 2, halfD = d / 2
  const group = new THREE.Group()
  const disposables: { dispose: () => void }[] = []

  // 地板
  const floorGeo = new THREE.PlaneGeometry(w, d)
  let floorMat: THREE.MeshStandardMaterial
  if (room.pattern === 'plain') {
    floorMat = new THREE.MeshStandardMaterial({ color: '#f0f0f3', roughness: 0.88, metalness: 0.02 })
  } else if (room.pattern === 'calibration') {
    const map = calibrationTexture(w, d, spacing)
    floorMat = new THREE.MeshStandardMaterial({ map, roughness: 0.86, metalness: 0.03 })
    disposables.push(map)
  } else {
    const map = checkerTexture()
    const rough = noiseTexture()
    map.repeat.set(w / (8 * spacing), d / (8 * spacing))
    rough.repeat.copy(map.repeat)
    floorMat = new THREE.MeshStandardMaterial({ map, roughnessMap: rough, roughness: 0.86, metalness: 0.04 })
    disposables.push(map, rough)
  }
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  group.add(floor)
  disposables.push(floorGeo, floorMat)

  // 两面后墙 + 地面/墙圆角(cyclorama 近似)
  const r = Math.min(0.6, wallH * 0.28, Math.min(w, d) * 0.18)
  const wallMat = new THREE.MeshStandardMaterial({ color: WALL_LIGHT, roughness: 0.96, metalness: 0.02, side: THREE.DoubleSide })
  const coveMat = new THREE.MeshStandardMaterial({ color: WALL_LIGHT, roughness: 0.95, metalness: 0.02, side: THREE.DoubleSide })
  const wallGeoA = new THREE.PlaneGeometry(w, wallH)
  const wallGeoB = new THREE.PlaneGeometry(d, wallH)
  const coveGeoA = new THREE.CylinderGeometry(r, r, w, 24, 1, true, Math.PI / 2, Math.PI / 2)
  const coveGeoB = new THREE.CylinderGeometry(r, r, d, 24, 1, true, -Math.PI / 2, Math.PI / 2)

  const back = new THREE.Mesh(wallGeoA, wallMat)
  back.position.set(0, wallH / 2, -halfD)
  const left = new THREE.Mesh(wallGeoB, wallMat)
  left.rotation.y = Math.PI / 2
  left.position.set(-halfW, wallH / 2, 0)
  const coveBack = new THREE.Mesh(coveGeoA, coveMat)
  coveBack.rotation.z = -Math.PI / 2
  coveBack.position.set(0, r, -halfD + r)
  const coveLeft = new THREE.Mesh(coveGeoB, coveMat)
  coveLeft.rotation.x = Math.PI / 2
  coveLeft.position.set(-halfW + r, r, 0)
  for (const m of [back, left, coveBack, coveLeft]) { m.receiveShadow = true; group.add(m) }
  disposables.push(wallGeoA, wallGeoB, coveGeoA, coveGeoB, wallMat, coveMat)

  return { group, dispose: () => { for (const x of disposables) x.dispose() } }
}

/** 3D 场景:旧户外感深色地面 + 阴影承接面 */
export function buildSceneGround(env: StageEnv): StageParts {
  const size = Math.max(200, env.groundSize * 12)
  const geo = new THREE.PlaneGeometry(size, size)
  const mat = new THREE.MeshStandardMaterial({ color: '#141418', roughness: 1, metalness: 0 })
  const ground = new THREE.Mesh(geo, mat)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  const shGeo = new THREE.PlaneGeometry(size, size)
  const shMat = new THREE.ShadowMaterial({ opacity: 0.5 })
  const shadow = new THREE.Mesh(shGeo, shMat)
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.002
  shadow.receiveShadow = true
  const group = new THREE.Group()
  group.add(ground, shadow)
  return {
    group,
    dispose: () => { geo.dispose(); mat.dispose(); shGeo.dispose(); shMat.dispose() },
  }
}
