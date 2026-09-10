import { useStudio } from '../store'
import { stageRef } from '../scene/ThreeStage'
import { exportSceneJSON, exportShotsJSON } from '../export'
import { ASPECT_LIST, FOCALS, PathKind, Prim, Vec3 } from '../types'
import {
  HDRI_PRESETS, LIGHT_PRESETS, LIGHT_TYPE_LABEL, MODEL_LIBRARY, PATH_PRESETS, findModel, findPath, modelById,
} from '../library'

/* ─────────────────────────────────────────────────────────────
   导演台工具层:Agent(或快捷键/命令面板)统一经由这里调度导演台
   每个工具:声明式 schema + 真实执行(直接落到 store / ThreeStage)
   ───────────────────────────────────────────────────────────── */

export interface ToolParam {
  name: string
  type: 'string' | 'number' | 'boolean'
  required?: boolean
  desc: string
  enum?: string[]
}

export interface StudioTool {
  name: string
  title: string
  group: string
  description: string
  params: ToolParam[]
  run: (args: Record<string, unknown>) => Promise<string> | string
}

const S = () => useStudio.getState()

const num = (v: unknown, d = 0): number => (typeof v === 'number' && isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && isFinite(Number(v)) ? Number(v) : d)
const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d)

/** 按 id 或名称(模糊)找实体 */
const findEntity = (q: string) => {
  const list = S().effectiveEntities()
  if (!q) return S().selection ? list.find(e => e.id === S().selection) : undefined
  return (
    list.find(e => e.id === q) ??
    list.find(e => e.name === q) ??
    list.find(e => e.name.toLowerCase().includes(q.toLowerCase())) ??
    list.find(e => q.includes(e.name))
  )
}

const entBrief = (e: { id: string; name: string; kind: string; position: Vec3; locked?: boolean }) =>
  `${e.name}(${e.kind}) @(${e.position.map(n => n.toFixed(1)).join(', ')})${e.locked ? ' [锁定]' : ''}`

const COLOR_WORDS: Record<string, string> = {
  红: '#e0524d', 红色: '#e0524d', 蓝: '#5b8fd6', 蓝色: '#5b8fd6', 绿: '#5f9e4a', 绿色: '#5f9e4a',
  黄: '#e8c44a', 黄色: '#e8c44a', 橙: '#e08a3c', 橙色: '#e08a3c', 紫: '#8f6fc8', 紫色: '#8f6fc8',
  粉: '#e08aa8', 粉色: '#e08aa8', 白: '#e8e8ec', 白色: '#e8e8ec', 黑: '#2b2b30', 黑色: '#2b2b30',
  灰: '#9a9aa2', 灰色: '#9a9aa2', 棕: '#a97e50', 棕色: '#a97e50',
}

const resolveColor = (v: string): string | undefined => {
  if (!v) return undefined
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim())) return v.trim()
  return COLOR_WORDS[v.trim()]
}

export const TOOLS: StudioTool[] = [
  /* ── 视图 / 模式 ─────────────────────────────────────────── */
  {
    name: 'set_mode', title: '切换视图模式', group: '视图',
    description: '切换导演台视图:3d=自由透视现场、top=俯视、cam=进入某台摄像机视角',
    params: [
      { name: 'mode', type: 'string', required: true, desc: '3d | top | cam', enum: ['3d', 'top', 'cam'] },
      { name: 'camera', type: 'string', desc: '进入机位时的摄像机名称,如"摄像机 1"' },
    ],
    run: (a) => {
      const m = str(a.mode, '3d')
      if (m === 'top') { S().setMode({ type: 'top' }); return '已切换到俯视' }
      if (m === 'cam') {
        const e = findEntity(str(a.camera)) ?? S().effectiveEntities().find(x => x.kind === 'camera')
        if (!e) return '未找到摄像机'
        S().setMode({ type: 'cam', id: e.id })
        return `已进入 ${e.name} 视角`
      }
      S().setMode({ type: '3d' })
      return '已切换到 3D 现场'
    },
  },
  {
    name: 'set_focal', title: '设置焦距', group: '视图',
    description: `设置镜头焦距(毫米),可选值:${FOCALS.join('/')}`,
    params: [{ name: 'mm', type: 'number', required: true, desc: '焦距毫米数' }],
    run: (a) => {
      const mm = num(a.mm, 24)
      let idx = FOCALS.findIndex(f => f === mm)
      if (idx < 0) idx = FOCALS.reduce((best, f, i) => (Math.abs(f - mm) < Math.abs(FOCALS[best] - mm) ? i : best), 0)
      S().setFocalIdx(idx)
      return `焦距已设为 ${FOCALS[idx]}mm`
    },
  },
  {
    name: 'set_aspect', title: '设置画幅比例', group: '视图',
    description: `设置取景器画幅比例,可选:${ASPECT_LIST.join(' / ')}`,
    params: [{ name: 'aspect', type: 'string', required: true, desc: '画幅比例', enum: [...ASPECT_LIST] }],
    run: (a) => {
      const v = str(a.aspect, '16:9')
      if (!(ASPECT_LIST as string[]).includes(v)) return `不支持的画幅比例:${v}`
      S().setAspect(v as never)
      return `画幅比例已设为 ${v}`
    },
  },
  {
    name: 'toggle_viewfinder', title: '开关取景器', group: '视图',
    description: '打开/关闭取景器构图模式',
    params: [{ name: 'open', type: 'boolean', desc: 'true=打开,false=关闭,缺省=切换' }],
    run: (a) => {
      const open = typeof a.open === 'boolean' ? a.open : !S().viewfinder
      S().setViewfinder(open)
      return open ? '取景器已打开' : '取景器已关闭'
    },
  },
  {
    name: 'open_panel', title: '打开面板', group: '视图',
    description: '打开右侧面板:settings=设置、env=环境、genHistory=生成历史、shots=镜头管理',
    params: [{ name: 'panel', type: 'string', required: true, desc: '面板名', enum: ['settings', 'env', 'genHistory', 'shots'] }],
    run: (a) => {
      const p = str(a.panel, 'settings') as never
      S().openP(p)
      return `已打开面板:${p}`
    },
  },
  {
    name: 'close_panel', title: '关闭面板', group: '视图',
    description: '关闭当前右侧面板',
    params: [],
    run: () => { S().openP(null); return '已关闭面板' },
  },
  {
    name: 'toggle_timeline', title: '开关时间轴', group: '视图',
    description: '打开/关闭时间轴面板',
    params: [{ name: 'open', type: 'boolean', desc: '缺省=切换' }],
    run: (a) => {
      const open = typeof a.open === 'boolean' ? a.open : !S().timeline.open
      S().setTimeline({ open })
      return open ? '时间轴已打开' : '时间轴已关闭'
    },
  },
  {
    name: 'reset_view', title: '恢复初始视角', group: '视图',
    description: '恢复默认相机视角与焦距',
    params: [],
    run: () => { S().resetView(); return '已恢复初始视角' },
  },

  /* ── 对象 ─────────────────────────────────────────────────── */
  {
    name: 'list_objects', title: '列出场景对象', group: '对象',
    description: '列出当前状态下场景中的全部对象及其位置',
    params: [],
    run: () => {
      const list = S().effectiveEntities()
      return list.length ? list.map(entBrief).join('\n') : '(场景为空)'
    },
  },
  {
    name: 'select_object', title: '选中对象', group: '对象',
    description: '按名称选中场景对象',
    params: [{ name: 'name', type: 'string', required: true, desc: '对象名称,如"角色"、"摄像机 1"' }],
    run: (a) => {
      const e = findEntity(str(a.name))
      if (!e) return `未找到对象:${str(a.name)}`
      S().select(e.id)
      return `已选中 ${e.name}`
    },
  },
  {
    name: 'place_object', title: '放置对象', group: '对象',
    description: '从内置模型库放置一个对象到场景,可指定坐标/颜色/缩放',
    params: [
      { name: 'model', type: 'string', required: true, desc: '模型名或关键词,如"立方体"、"树"、"角色"' },
      { name: 'x', type: 'number', desc: 'X 坐标(米),默认 0' },
      { name: 'z', type: 'number', desc: 'Z 坐标(米),默认 0' },
      { name: 'color', type: 'string', desc: '颜色(十六进制或中文色名)' },
      { name: 'scale', type: 'number', desc: '缩放倍数,默认 1' },
    ],
    run: (a) => {
      const m = findModel(str(a.model))
      if (!m) return `模型库中没有:${str(a.model)}`
      const x = num(a.x, 0), z = num(a.z, 0), sc = num(a.scale, 1)
      const color = resolveColor(str(a.color)) ?? m.color
      S().startPlacement({ name: m.name, kind: m.prim === 'actor' ? 'actor' : m.prim === 'camera' ? 'camera' : 'prop', prim: m.prim, color, height: m.height, modelUrl: m.modelUrl })
      S().setPlacementGround([x, 0, z])
      S().confirmPlacement()
      const placed = S().effectiveEntities().slice(-1)[0]
      if (sc !== 1 && placed) S().commitEntity(placed.id, { scale: sc }, '缩放')
      return `已放置 ${m.name} 到 (${x}, ${z})`
    },
  },
  {
    name: 'move_object', title: '移动对象', group: '对象',
    description: '移动对象:可给绝对坐标 x/y/z,或相对位移 dx/dy/dz',
    params: [
      { name: 'name', type: 'string', desc: '对象名称,缺省=当前选中' },
      { name: 'x', type: 'number', desc: '目标 X' },
      { name: 'y', type: 'number', desc: '目标 Y(离地高度)' },
      { name: 'z', type: 'number', desc: '目标 Z' },
      { name: 'dx', type: 'number', desc: '相对 X 位移' },
      { name: 'dy', type: 'number', desc: '相对 Y 位移' },
      { name: 'dz', type: 'number', desc: '相对 Z 位移' },
    ],
    run: (a) => {
      const e = findEntity(str(a.name))
      if (!e) return `未找到对象:${str(a.name)}`
      const pos: Vec3 = [
        a.x !== undefined ? num(a.x) : e.position[0] + num(a.dx, 0),
        a.y !== undefined ? num(a.y) : e.position[1] + num(a.dy, 0),
        a.z !== undefined ? num(a.z) : e.position[2] + num(a.dz, 0),
      ]
      S().commitEntity(e.id, { position: pos }, '移动对象')
      return `${e.name} 已移动到 (${pos.map(n => n.toFixed(2)).join(', ')})`
    },
  },
  {
    name: 'rotate_object', title: '旋转对象', group: '对象',
    description: '设置对象朝向(绕 Y 轴,单位度)',
    params: [
      { name: 'name', type: 'string', desc: '对象名称,缺省=当前选中' },
      { name: 'deg', type: 'number', required: true, desc: '朝向角度' },
    ],
    run: (a) => {
      const e = findEntity(str(a.name))
      if (!e) return `未找到对象:${str(a.name)}`
      S().commitEntity(e.id, { rotationY: (num(a.deg) * Math.PI) / 180 }, '旋转对象')
      return `${e.name} 朝向已设为 ${num(a.deg)}°`
    },
  },
  {
    name: 'scale_object', title: '缩放对象', group: '对象',
    description: '设置对象缩放倍数',
    params: [
      { name: 'name', type: 'string', desc: '对象名称,缺省=当前选中' },
      { name: 'scale', type: 'number', required: true, desc: '缩放倍数' },
    ],
    run: (a) => {
      const e = findEntity(str(a.name))
      if (!e) return `未找到对象:${str(a.name)}`
      S().commitEntity(e.id, { scale: Math.max(0.05, num(a.scale, 1)) }, '缩放对象')
      return `${e.name} 缩放已设为 ${num(a.scale, 1)}×`
    },
  },
  {
    name: 'set_object_color', title: '设置对象颜色', group: '对象',
    description: '设置对象颜色',
    params: [
      { name: 'name', type: 'string', desc: '对象名称,缺省=当前选中' },
      { name: 'color', type: 'string', required: true, desc: '十六进制颜色或中文色名' },
    ],
    run: (a) => {
      const e = findEntity(str(a.name))
      if (!e) return `未找到对象:${str(a.name)}`
      const c = resolveColor(str(a.color))
      if (!c) return `无法识别颜色:${str(a.color)}`
      S().commitEntity(e.id, { color: c }, '设置颜色')
      return `${e.name} 颜色已设为 ${c}`
    },
  },
  {
    name: 'enter_control', title: '操控对象', group: '对象',
    description: '进入对象操控模式(WASD 移动、Q/E 升降、旋转、落地)',
    params: [{ name: 'name', type: 'string', desc: '对象名称,缺省=当前选中' }],
    run: (a) => {
      const e = findEntity(str(a.name))
      if (!e) return '未找到对象'
      S().setControl(e.id)
      return `进入 ${e.name} 操控模式(按 Esc 退出)`
    },
  },
  {
    name: 'exit_control', title: '退出操控', group: '对象',
    description: '退出对象操控模式',
    params: [],
    run: () => { S().setControl(null); return '已退出操控' },
  },
  {
    name: 'set_actor_pose', title: '设置角色姿态', group: '对象',
    description: '设置角色姿态:站立 / 地坐 / 坐椅 / 躺卧 / 行走',
    params: [
      { name: 'name', type: 'string', desc: '角色名称,缺省=当前选中' },
      { name: 'pose', type: 'string', required: true, desc: '姿态名', enum: ['站立', '地坐', '坐椅', '躺卧', '行走'] },
    ],
    run: (a) => {
      const e = findEntity(str(a.name))
      if (!e || e.kind !== 'actor') return '未找到角色'
      S().commitEntity(e.id, { pose: str(a.pose, '站立') }, '设置姿态')
      return `${e.name} 姿态:${str(a.pose, '站立')}`
    },
  },
  {
    name: 'delete_object', title: '删除对象', group: '对象',
    description: '从场景移除对象',
    params: [{ name: 'name', type: 'string', desc: '对象名称,缺省=当前选中' }],
    run: (a) => {
      const e = findEntity(str(a.name))
      if (!e) return '未找到对象'
      S().removeEntity(e.id)
      return `已移除 ${e.name}`
    },
  },
  {
    name: 'duplicate_object', title: '复制对象', group: '对象',
    description: '复制对象到旁边',
    params: [{ name: 'name', type: 'string', desc: '对象名称,缺省=当前选中' }],
    run: (a) => {
      const e = findEntity(str(a.name))
      if (!e) return '未找到对象'
      S().duplicateEntity(e.id)
      return `已复制 ${e.name}`
    },
  },
  {
    name: 'rename_object', title: '重命名对象', group: '对象',
    description: '修改对象名称',
    params: [
      { name: 'name', type: 'string', desc: '原名称,缺省=当前选中' },
      { name: 'new_name', type: 'string', required: true, desc: '新名称' },
    ],
    run: (a) => {
      const e = findEntity(str(a.name))
      if (!e) return '未找到对象'
      S().renameEntity(e.id, str(a.new_name))
      return `已重命名为 ${str(a.new_name)}`
    },
  },
  {
    name: 'lock_object', title: '锁定/解锁对象', group: '对象',
    description: '锁定对象后不可移动',
    params: [
      { name: 'name', type: 'string', desc: '对象名称,缺省=当前选中' },
      { name: 'locked', type: 'boolean', desc: '缺省=切换' },
    ],
    run: (a) => {
      const e = findEntity(str(a.name))
      if (!e) return '未找到对象'
      const locked = typeof a.locked === 'boolean' ? a.locked : !e.locked
      S().commitEntity(e.id, { locked }, locked ? '锁定' : '解锁')
      return `${e.name} ${locked ? '已锁定' : '已解锁'}`
    },
  },
  {
    name: 'drop_to_ground', title: '落到地面', group: '对象',
    description: '把对象放到地面上',
    params: [{ name: 'name', type: 'string', desc: '对象名称,缺省=当前选中' }],
    run: (a) => {
      const e = findEntity(str(a.name))
      if (!e) return '未找到对象'
      S().dropToGround(e.id)
      return `${e.name} 已落到地面`
    },
  },
  {
    name: 'focus_object', title: '聚焦对象', group: '对象',
    description: '把相机焦点移到对象上',
    params: [{ name: 'name', type: 'string', desc: '对象名称,缺省=当前选中' }],
    run: (a) => {
      const e = findEntity(str(a.name))
      if (!e) return '未找到对象'
      S().select(e.id)
      window.dispatchEvent(new CustomEvent('studio-focus', { detail: e.id }))
      return `已聚焦 ${e.name}`
    },
  },

  /* ── 灯光 ─────────────────────────────────────────────────── */
  {
    name: 'list_lights', title: '列出灯光', group: '灯光',
    description: '列出当前场景灯光',
    params: [],
    run: () => {
      const ls = S().lights
      return ls.length
        ? ls.map(l => `${l.name}(${LIGHT_TYPE_LABEL[l.type] ?? l.type}) 强度${l.intensity} 方向${l.angle}° 高度${l.height}m 柔化${l.softness}${l.enabled ? '' : ' [关闭]'}`).join('\n')
        : '(无灯光)'
    },
  },
  {
    name: 'add_light', title: '添加灯光', group: '灯光',
    description: '添加一盏灯:类型 softbox/key/fill/rim/sun/spot/point,可指定颜色/强度/方向/高度/柔化',
    params: [
      { name: 'type', type: 'string', desc: '灯光类型', enum: ['softbox', 'key', 'fill', 'rim', 'sun', 'spot', 'point'] },
      { name: 'color', type: 'string', desc: '颜色' },
      { name: 'intensity', type: 'number', desc: '强度 0–10' },
      { name: 'angle', type: 'number', desc: '水平方向角(度)' },
      { name: 'height', type: 'number', desc: '高度(米)' },
      { name: 'softness', type: 'number', desc: '柔化 0–1' },
    ],
    run: (a) => {
      const id = S().addLight({
        type: (str(a.type, 'spot') as never),
        color: resolveColor(str(a.color)) ?? '#ffffff',
        intensity: a.intensity !== undefined ? num(a.intensity, 1.5) : undefined,
        angle: a.angle !== undefined ? num(a.angle, 45) : undefined,
        height: a.height !== undefined ? num(a.height, 3.5) : undefined,
        softness: a.softness !== undefined ? num(a.softness, 0.5) : undefined,
      })
      const l = S().lights.find(x => x.id === id)!
      return `已添加灯光:${l.name}`
    },
  },
  {
    name: 'update_light', title: '调整灯光', group: '灯光',
    description: '调整灯光参数(按名称)',
    params: [
      { name: 'name', type: 'string', required: true, desc: '灯光名称' },
      { name: 'intensity', type: 'number', desc: '强度' },
      { name: 'angle', type: 'number', desc: '方向角' },
      { name: 'height', type: 'number', desc: '高度' },
      { name: 'softness', type: 'number', desc: '柔化 0–1' },
      { name: 'color', type: 'string', desc: '颜色' },
      { name: 'enabled', type: 'boolean', desc: '开关' },
    ],
    run: (a) => {
      const q = str(a.name).toLowerCase()
      const l = S().lights.find(x => x.name === str(a.name) || x.name.toLowerCase().includes(q))
      if (!l) return `未找到灯光:${str(a.name)}`
      const patch: Record<string, unknown> = {}
      if (a.intensity !== undefined) patch.intensity = num(a.intensity, l.intensity)
      if (a.angle !== undefined) patch.angle = num(a.angle, l.angle)
      if (a.height !== undefined) patch.height = num(a.height, l.height)
      if (a.softness !== undefined) patch.softness = num(a.softness, l.softness)
      if (a.color !== undefined) patch.color = resolveColor(str(a.color)) ?? l.color
      if (a.enabled !== undefined) patch.enabled = Boolean(a.enabled)
      S().updateLight(l.id, patch)
      return `${l.name} 已更新`
    },
  },
  {
    name: 'remove_light', title: '删除灯光', group: '灯光',
    description: '删除一盏灯',
    params: [{ name: 'name', type: 'string', required: true, desc: '灯光名称' }],
    run: (a) => {
      const l = S().lights.find(x => x.name === str(a.name))
      if (!l) return `未找到灯光:${str(a.name)}`
      S().removeLight(l.id)
      return `已删除灯光:${l.name}`
    },
  },
  {
    name: 'apply_light_preset', title: '应用灯光预设', group: '灯光',
    description: `应用整套灯光方案:${LIGHT_PRESETS.map(p => `${p.id}=${p.name}`).join('、')}`,
    params: [{ name: 'preset', type: 'string', required: true, desc: '预设 id 或名称' }],
    run: (a) => {
      const q = str(a.preset)
      const p = LIGHT_PRESETS.find(x => x.id === q || x.name === q || x.name.includes(q))
      if (!p) return `未找到灯光预设:${q}`
      S().applyLightPreset(p.id)
      return `已应用灯光预设:${p.name}`
    },
  },
  {
    name: 'set_hdri', title: '切换 HDRI 光照', group: '灯光',
    description: `切换环境光照(HDRI 预设):${HDRI_PRESETS.map(h => `${h.id}=${h.name}`).join('、')}`,
    params: [{ name: 'preset', type: 'string', required: true, desc: '预设 id 或名称' }],
    run: (a) => {
      const q = str(a.preset)
      const p = HDRI_PRESETS.find(x => x.id === q || x.name === q || x.name.includes(q))
      if (!p) return `未找到 HDRI 预设:${q}`
      S().setEnv({ hdri: p.id })
      return `环境光照已切换:${p.name}`
    },
  },
  {
    name: 'set_room', title: '设置房间尺寸', group: '灯光',
    description: '设置房间(场地=房间)的宽度/深度/高度与参考图案',
    params: [
      { name: 'w', type: 'number', desc: '宽度(米)' },
      { name: 'd', type: 'number', desc: '深度(米)' },
      { name: 'h', type: 'number', desc: '高度(米)' },
      { name: 'pattern', type: 'string', desc: 'plain 全白 | standard 标准 | calibration 校准', enum: ['plain', 'standard', 'calibration'] },
      { name: 'spacing', type: 'number', desc: '线标注间距(米):0.25/0.5/1/2' },
    ],
    run: (a) => {
      const room = { ...S().env.room }
      if (a.w !== undefined) room.w = num(a.w, room.w)
      if (a.d !== undefined) room.d = num(a.d, room.d)
      if (a.h !== undefined) room.h = num(a.h, room.h)
      if (a.pattern !== undefined) room.pattern = str(a.pattern, room.pattern) as typeof room.pattern
      if (a.spacing !== undefined) room.spacing = num(a.spacing, room.spacing)
      S().setEnv({ room, stage: 'room' })
      return `房间已更新:${room.w}×${room.d}×${room.h}m,${room.pattern}`
    },
  },
  {
    name: 'set_timeline_duration', title: '调整时间轴时长', group: '时间轴',
    description: '延长/缩短时间轴 1 秒(或指定时长)',
    params: [
      { name: 'seconds', type: 'number', desc: '目标时长(秒),缺省=延长 1 秒' },
      { name: 'delta', type: 'number', desc: '相对变化(秒),负数=缩短' },
    ],
    run: (a) => {
      const cur = S().timeline.duration
      const next = a.seconds !== undefined
        ? Math.max(1, Math.min(30, num(a.seconds, cur)))
        : Math.max(1, Math.min(30, cur + (a.delta !== undefined ? num(a.delta, 1) : 1)))
      S().setTimeline({ duration: next })
      return `时间轴时长:${next}s`
    },
  },
  {
    name: 'set_environment', title: '设置环境', group: '灯光',
    description: '设置场地/地面高度/光照方向/背景',
    params: [
      { name: 'stage', type: 'string', desc: 'blank | room | scene3d', enum: ['blank', 'room', 'scene3d'] },
      { name: 'ground_h', type: 'number', desc: '地面高度(米)' },
      { name: 'light_dir', type: 'number', desc: '光照方向角(度)' },
      { name: 'bg', type: 'string', desc: 'none | same | pano', enum: ['none', 'same', 'pano'] },
    ],
    run: (a) => {
      const p: Record<string, unknown> = {}
      if (a.stage !== undefined) p.stage = str(a.stage, 'room')
      if (a.ground_h !== undefined) p.groundH = num(a.ground_h, -1.7)
      if (a.light_dir !== undefined) p.lightDir = num(a.light_dir, 0)
      if (a.bg !== undefined) p.bg = str(a.bg, 'none')
      S().setEnv(p as never)
      return '环境已更新'
    },
  },

  /* ── 运镜 ─────────────────────────────────────────────────── */
  {
    name: 'list_paths', title: '列出运镜路径', group: '运镜',
    description: '列出内置专业运镜路径',
    params: [],
    run: () => PATH_PRESETS.map(p => `${p.kind} = ${p.name}(${p.duration}s)`).join('\n'),
  },
  {
    name: 'run_camera_path', title: '执行运镜', group: '运镜',
    description: `执行预制运镜:${PATH_PRESETS.map(p => p.kind).join('/')}`,
    params: [{ name: 'path', type: 'string', required: true, desc: '运镜 id 或名称' }],
    run: (a) => {
      const q = str(a.path)
      const p = findPath(q) ?? PATH_PRESETS.find(x => q.includes(x.name) || x.kind === q)
      if (!p) return `未找到运镜路径:${q}`
      S().runPath(p.id)
      return `开始运镜:${p.name}`
    },
  },
  {
    name: 'stop_camera_path', title: '停止运镜', group: '运镜',
    description: '停止当前运镜',
    params: [],
    run: () => { S().stopPath(); return '已停止运镜' },
  },

  /* ── 拍摄 / 故事板 ────────────────────────────────────────── */
  {
    name: 'capture_photo', title: '拍摄照片', group: '拍摄',
    description: '按当前机位/焦距拍摄一张照片并存入故事板',
    params: [{ name: 'name', type: 'string', desc: '照片名称' }],
    run: (a) => {
      const url = stageRef.capture?.()
      if (!url) return '拍摄失败:渲染器未就绪'
      const mm = FOCALS[S().focalIdx]
      const shot = S().addShot({ kind: 'image', url, name: str(a.name) || `镜头 ${S().shots.length + 1}`, meta: `${mm}mm · ${S().aspect}`, focalMm: mm })
      return `已拍摄并存入故事板:${shot.name}`
    },
  },
  {
    name: 'start_recording', title: '开始录制', group: '拍摄',
    description: '开始录制运镜视频(canvas 录制,webm)',
    params: [],
    run: () => {
      const ok = stageRef.startRecord?.()
      if (!ok) return '录制启动失败:浏览器不支持或渲染器未就绪'
      S().setRecording(true)
      return '开始录制'
    },
  },
  {
    name: 'stop_recording', title: '停止录制', group: '拍摄',
    description: '停止录制并把视频存入故事板',
    params: [{ name: 'name', type: 'string', desc: '视频名称' }],
    run: async (a) => {
      if (!S().recording) return '当前没有在录制'
      const url = await (stageRef.stopRecord?.() ?? Promise.resolve(null))
      S().setRecording(false)
      if (!url) return '录制结束,但没有拿到视频数据'
      const shot = S().addShot({ kind: 'video', url, name: str(a.name) || `运镜 ${S().shots.length + 1}`, meta: `${FOCALS[S().focalIdx]}mm · ${S().aspect}` })
      return `已录制并存入故事板:${shot.name}`
    },
  },
  {
    name: 'export_scene', title: '导出场景', group: '拍摄',
    description: '把当前场景(实体/状态/灯光/关键帧)导出为 JSON 文件',
    params: [],
    run: () => { exportSceneJSON(); return '已导出场景 JSON' },
  },
  {
    name: 'export_shots', title: '导出镜头清单', group: '拍摄',
    description: '把故事板里的照片/视频清单导出为 JSON 文件',
    params: [],
    run: () => { exportShotsJSON(); return '已导出镜头清单' },
  },
  {
    name: 'list_shots', title: '列出故事板', group: '拍摄',
    description: '列出故事板中的照片与视频',
    params: [],
    run: () => {
      const s = S().shots
      return s.length ? s.map(x => `${x.kind === 'image' ? '📷' : '🎬'} ${x.name} (${x.meta ?? ''})`).join('\n') : '(故事板为空)'
    },
  },
  {
    name: 'open_storyboard', title: '打开故事板', group: '拍摄',
    description: '打开故事板页面',
    params: [],
    run: () => { S().setStoryboardOpen(true); return '已打开故事板' },
  },
  {
    name: 'delete_shot', title: '删除故事板条目', group: '拍摄',
    description: '按名称删除故事板中的条目',
    params: [{ name: 'name', type: 'string', required: true, desc: '条目名称' }],
    run: (a) => {
      const q = str(a.name)
      const s = S().shots.find(x => x.name === q) ?? S().shots.find(x => x.name.includes(q))
      if (!s) return `故事板中没有:${q}`
      S().removeShot(s.id)
      return `已删除:${s.name}`
    },
  },

  /* ── 时间轴 ───────────────────────────────────────────────── */
  {
    name: 'set_timeline', title: '控制时间轴', group: '时间轴',
    description: '播放/暂停时间轴、跳转时间、开关循环',
    params: [
      { name: 'play', type: 'boolean', desc: 'true=播放,false=暂停' },
      { name: 'time', type: 'number', desc: '跳转到秒数' },
      { name: 'loop', type: 'boolean', desc: '循环开关' },
    ],
    run: (a) => {
      const p: Record<string, unknown> = { open: true }
      if (a.play !== undefined) p.playing = Boolean(a.play)
      if (a.time !== undefined) p.time = Math.max(0, Math.min(3, num(a.time)))
      if (a.loop !== undefined) p.loop = Boolean(a.loop)
      S().setTimeline(p as never)
      return '时间轴已更新'
    },
  },
  {
    name: 'add_keyframe', title: '添加关键帧', group: '时间轴',
    description: '在当前时间轴位置为对象添加关键帧',
    params: [{ name: 'name', type: 'string', desc: '对象名称,缺省=当前选中' }],
    run: (a) => {
      const e = findEntity(str(a.name))
      if (!e) return '未找到对象'
      S().addKeyframeFor(e.id)
      return `已为 ${e.name} 在 ${S().timeline.time.toFixed(1)}s 添加关键帧`
    },
  },

  /* ── 状态 ─────────────────────────────────────────────────── */
  {
    name: 'list_states', title: '列出状态', group: '状态',
    description: '列出所有场景状态',
    params: [],
    run: () => {
      const s = S()
      return [`场景基准${s.activeStateId === 'baseline' ? ' (编辑中)' : ''}`, ...s.states.map(x => `${x.name}${x.id === s.activeStateId ? ' (当前)' : ''}`)].join('\n')
    },
  },
  {
    name: 'add_state', title: '新增状态', group: '状态',
    description: '复制当前状态为新的状态',
    params: [],
    run: () => { S().addState(); return `已新增状态:${S().states.slice(-1)[0]?.name}` },
  },
  {
    name: 'switch_state', title: '切换状态', group: '状态',
    description: '按名称切换场景状态',
    params: [{ name: 'name', type: 'string', required: true, desc: '状态名称' }],
    run: (a) => {
      const q = str(a.name)
      if (q.includes('基准')) { S().editBaseline(); return '已切换到场景基准' }
      const st = S().states.find(x => x.name === q) ?? S().states.find(x => x.name.includes(q))
      if (!st) return `未找到状态:${q}`
      S().setActiveState(st.id)
      return `已切换到 ${st.name}`
    },
  },

  /* ── 模型库 ───────────────────────────────────────────────── */
  {
    name: 'list_library', title: '列出模型库', group: '模型库',
    description: '列出内置可放置模型',
    params: [],
    run: () => MODEL_LIBRARY.map(m => `${m.name}(${m.category})`).join('、'),
  },
  {
    name: 'undo', title: '撤销', group: '编辑',
    description: '撤销上一步操作',
    params: [],
    run: () => { S().undo(); return '已撤销' },
  },
  {
    name: 'redo', title: '重做', group: '编辑',
    description: '重做上一步操作',
    params: [],
    run: () => { S().redo(); return '已重做' },
  },
]

export const TOOL_MAP = new Map(TOOLS.map(t => [t.name, t]))

export const toolByName = (name: string): StudioTool | undefined =>
  TOOL_MAP.get(name) ?? TOOLS.find(t => t.name === name.toLowerCase() || t.title === name)

export async function runTool(name: string, args: Record<string, unknown>): Promise<{ ok: boolean; text: string }> {
  const t = toolByName(name)
  if (!t) return { ok: false, text: `未知工具:${name}` }
  try {
    const text = await t.run(args ?? {})
    return { ok: true, text: String(text) }
  } catch (e) {
    return { ok: false, text: `执行失败:${e instanceof Error ? e.message : String(e)}` }
  }
}

/** 给 LLM 的工具清单(紧凑 JSON) */
export const toolsForLLM = () =>
  TOOLS.map(t => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: {
        type: 'object',
        properties: Object.fromEntries(t.params.map(p => [p.name, { type: p.type, description: p.desc, ...(p.enum ? { enum: p.enum } : {}) }])),
        required: t.params.filter(p => p.required).map(p => p.name),
      },
    },
  }))

export type { Prim, PathKind }
