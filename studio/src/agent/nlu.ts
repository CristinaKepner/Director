import { FOCALS } from '../types'
import { HDRI_PRESETS, LIGHT_PRESETS, MODEL_LIBRARY, PATH_PRESETS } from '../library'
import { ToolCall } from './types'

/* ─────────────────────────────────────────────────────────────
   中文指令解析(离线可用):把自然语言映射为导演台工具调用
   ───────────────────────────────────────────────────────────── */

const CN_NUM: Record<string, number> = {
  零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
}

/** 抽取文本中的数字(支持中文数字与"半") */
export function pickNumber(s: string, fallback?: number): number | undefined {
  const m = s.match(/-?\d+(?:\.\d+)?/)
  if (m) return Number(m[0])
  for (const [k, v] of Object.entries(CN_NUM)) if (s.includes(k)) return v
  if (s.includes('半')) return 0.5
  return fallback
}

const COLOR_MAP: Record<string, string> = {
  红: '#e0524d', 蓝: '#5b8fd6', 绿: '#5f9e4a', 黄: '#e8c44a', 橙: '#e08a3c', 紫: '#8f6fc8',
  粉: '#e08aa8', 白: '#e8e8ec', 黑: '#2b2b30', 灰: '#9a9aa2', 棕: '#a97e50', 青: '#4fb3b8',
}

function pickColor(s: string): string | undefined {
  const hex = s.match(/#[0-9a-fA-F]{3,6}/)
  if (hex) return hex[0]
  for (const [k, v] of Object.entries(COLOR_MAP)) if (s.includes(k)) return v
  return undefined
}

function pickModel(s: string) {
  return (
    MODEL_LIBRARY.find(m => s.includes(m.name)) ??
    MODEL_LIBRARY.find(m => m.tags.some(t => t.length > 1 && s.includes(t)))
  )
}

/** 位置短语 → 相对位移(米) */
function pickOffset(s: string): { dx: number; dz: number } {
  const n = pickNumber(s, 1) ?? 1
  let dx = 0, dz = 0
  if (/左/.test(s)) dx -= n
  if (/右/.test(s)) dx += n
  if (/前|近/.test(s)) dz -= n
  if (/后|远|退/.test(s)) dz += n
  if (dx === 0 && dz === 0 && /上/.test(s)) dz -= n
  if (dx === 0 && dz === 0 && /下/.test(s)) dz += n
  return { dx, dz }
}

function pickObjectName(s: string): string | undefined {
  const m = s.match(/(?:选中|选择|聚焦|删除|移除|复制|锁定|解锁|落地|落到地面)\s*([^\s，。,;]+)/)
  if (m) return m[1]
  const m2 = s.match(/([^\s，。,;]+?)(?:的|把|向|往|到|移|旋转|放大|缩小|变成)/)
  if (m2 && MODEL_LIBRARY.some(x => m2[1].includes(x.name))) return m2[1]
  const known = MODEL_LIBRARY.find(x => s.includes(x.name))
  if (known) return known.name
  const cam = s.match(/摄像机\s*\d?/)
  if (cam) return cam[0]
  if (/角色/.test(s)) return '角色'
  return undefined
}

/** 单条指令 → 工具调用;无法识别返回 null */
export function parseCommand(raw: string): ToolCall | null {
  const s = raw.trim()
  if (!s) return null
  const has = (...keys: string[]) => keys.some(k => s.includes(k))

  /* 帮助 */
  if (has('帮助', '能做什么', '会什么', '命令列表', '工具列表')) return { name: 'help', args: {} }

  /* 故事板 / 拍摄 */
  if (has('故事板') && has('打开', '看看', '查看', '显示')) return { name: 'open_storyboard', args: {} }
  if (has('拍张照片', '拍照', '拍摄照片', '拍一张', '拍一张照片', '截取画面', '拍下')) {
    const n = s.match(/叫\s*([^\s，。,]+)/)
    return { name: 'capture_photo', args: n ? { name: n[1] } : {} }
  }
  if (has('开始录制', '录制视频', '录像', '录一段')) return { name: 'start_recording', args: {} }
  if (has('停止录制', '结束录制', '停止录像')) return { name: 'stop_recording', args: {} }
  if (has('故事板') && has('列出', '有什么')) return { name: 'list_shots', args: {} }
  if (has('导出') && has('场景')) return { name: 'export_scene', args: {} }
  if (has('导出') && has('镜头', '故事板')) return { name: 'export_shots', args: {} }

  /* 运镜 */
  if (has('停止运镜', '停下', '停止移动')) return { name: 'stop_camera_path', args: {} }
  const path = PATH_PRESETS.find(p => s.includes(p.name) || s.includes(p.kind))
  if (path && has('运镜', '镜头', '推', '拉', '环绕', '摇', '升降', '横移', '手持', '变焦')) {
    return { name: 'run_camera_path', args: { path: path.kind } }
  }
  if (has('运镜路径', '有哪些运镜', '运镜列表')) return { name: 'list_paths', args: {} }

  /* 灯光 */
  const hdriHit = HDRI_PRESETS.find(h => s.includes(h.name))
  if (hdriHit && has('光照', '环境光', 'hdri', 'HDRI', '布光')) return { name: 'set_hdri', args: { preset: hdriHit.id } }
  if (has('房间') && has('宽', '深', '高')) {
    const w = s.match(/宽(?:度)?\s*(\d+(?:\.\d+)?)/)
    const d = s.match(/深(?:度)?\s*(\d+(?:\.\d+)?)/)
    const h = s.match(/高(?:度)?\s*(\d+(?:\.\d+)?)/)
    const args: Record<string, unknown> = {}
    if (w) args.w = Number(w[1])
    if (d) args.d = Number(d[1])
    if (h) args.h = Number(h[1])
    if (Object.keys(args).length) return { name: 'set_room', args }
  }
  if (has('延长', '缩短') && has('时间轴', '时长')) {
    const n = pickNumber(s, 1) ?? 1
    return { name: 'set_timeline_duration', args: { delta: has('缩短') ? -n : n } }
  }
  if (has('灯光预设', '布光方案', '布光')) {
    const p = LIGHT_PRESETS.find(x => s.includes(x.name))
    return { name: 'apply_light_preset', args: { preset: p?.id ?? 'lp-three' } }
  }
  if (has('列出灯光', '有哪些灯', '灯光列表')) return { name: 'list_lights', args: {} }
  if (has('加一盏灯', '添加灯光', '加个灯', '加灯光', '放一盏灯', '加一盏')) {
    const type = s.includes('柔光') ? 'softbox' : s.includes('主光') ? 'key' : s.includes('补光') ? 'fill'
      : s.includes('轮廓') ? 'rim' : s.includes('日光') ? 'sun' : s.includes('聚光') ? 'spot' : s.includes('点光') ? 'point' : 'spot'
    const args: Record<string, unknown> = { type }
    const c = pickColor(s); if (c) args.color = c
    const i = s.match(/(?:强度|亮度)\s*(\d+(?:\.\d+)?)/); if (i) args.intensity = Number(i[1])
    const h = s.match(/高度\s*(\d+(?:\.\d+)?)/); if (h) args.height = Number(h[1])
    return { name: 'add_light', args }
  }
  if (has('调亮', '调暗', '调高亮度', '调低亮度', '灯光调', '把光调')) {
    const lname = s.includes('补光') ? '补光' : s.includes('轮廓') ? '轮廓光' : s.includes('主光') ? '主光' : ''
    const cur = lname ? null : null
    const delta = has('调亮', '调高') ? 0.5 : -0.5
    const i = s.match(/(?:到|为)\s*(\d+(?:\.\d+)?)/)
    return { name: 'update_light', args: { name: lname || '主光', ...(i ? { intensity: Number(i[1]) } : {}) , ...(i ? {} : { _delta: delta }) } }
  }

  /* 环境 */
  if (has('地面高度', '地面')) {
    const n = pickNumber(s)
    if (n !== undefined && /-|负/.test(s)) return { name: 'set_environment', args: { ground_h: -Math.abs(n) } }
    if (n !== undefined) return { name: 'set_environment', args: { ground_h: n } }
  }
  if (has('光照方向', '灯光方向')) {
    const n = pickNumber(s, 0)
    return { name: 'set_environment', args: { light_dir: n } }
  }
  if (has('房间')) return { name: 'set_environment', args: { stage: 'room' } }
  if (has('空白场地')) return { name: 'set_environment', args: { stage: 'blank' } }

  /* 视图/模式 */
  if (has('俯视', '顶视')) return { name: 'set_mode', args: { mode: 'top' } }
  if (has('3d', '3D', '现场')) return { name: 'set_mode', args: { mode: '3d' } }
  const camM = s.match(/摄像机\s*(\d)?/)
  if (camM && has('进入', '切换', '机位', '视角')) return { name: 'set_mode', args: { mode: 'cam', camera: camM[1] ? `摄像机 ${camM[1]}` : '摄像机 1' } }

  if (has('焦距', '焦段', 'mm', 'MM')) {
    const n = pickNumber(s)
    if (n !== undefined) {
      const mm = FOCALS.reduce((b, f) => (Math.abs(f - n) < Math.abs(b - n) ? f : b), FOCALS[0])
      return { name: 'set_focal', args: { mm } }
    }
  }
  if (has('画幅', '比例', '16:9', '4:3', '1:1', '2.39')) {
    const a = s.includes('4:3') ? '4:3' : s.includes('1:1') ? '1:1' : s.includes('2.39') ? '2.39:1' : '16:9'
    return { name: 'set_aspect', args: { aspect: a } }
  }
  if (has('取景器')) return { name: 'toggle_viewfinder', args: { open: !s.includes('关闭') && !s.includes('退出') } }
  if (has('时间轴')) {
    if (has('打开')) return { name: 'toggle_timeline', args: { open: true } }
    if (has('关闭')) return { name: 'toggle_timeline', args: { open: false } }
    if (has('播放')) return { name: 'set_timeline', args: { play: true } }
    if (has('暂停')) return { name: 'set_timeline', args: { play: false } }
    const t = s.match(/(\d+(?:\.\d+)?)\s*(?:s|秒)/)
    if (t) return { name: 'set_timeline', args: { time: Number(t[1]) } }
    return { name: 'toggle_timeline', args: { open: true } }
  }
  if (has('设置面板', '打开设置')) return { name: 'open_panel', args: { panel: 'settings' } }
  if (has('环境面板')) return { name: 'open_panel', args: { panel: 'env' } }
  if (has('镜头管理')) return { name: 'open_panel', args: { panel: 'shots' } }
  if (has('生成历史')) return { name: 'open_panel', args: { panel: 'genHistory' } }
  if (has('关闭面板')) return { name: 'close_panel', args: {} }
  if (has('恢复初始视角', '重置视角', '回到默认视角')) return { name: 'reset_view', args: {} }

  /* 状态 */
  if (has('新建状态', '新增状态', '加一个状态')) return { name: 'add_state', args: {} }
  if (has('切换状态', '切到状态', '进入状态')) {
    const st = s.match(/状态\s*(\d+)/)
    return { name: 'switch_state', args: { name: st ? `状态 ${st[1]}` : '示例状态' } }
  }
  if (has('场景基准', '编辑基准')) return { name: 'switch_state', args: { name: '场景基准' } }
  if (has('列出状态', '有哪些状态')) return { name: 'list_states', args: {} }

  /* 编辑 */
  if (has('撤销')) return { name: 'undo', args: {} }
  if (has('重做')) return { name: 'redo', args: {} }

  /* 对象操作 */
  if (has('列出对象', '场景里有什么', '有哪些对象', '列出场景')) return { name: 'list_objects', args: {} }
  if (has('列出模型', '模型库', '有哪些模型')) return { name: 'list_library', args: {} }

  if (has('添加', '放置', '新建', '放一个', '放个', '加一个', '生成一个', '生成')) {
    const m = pickModel(s)
    if (m) {
      const args: Record<string, unknown> = { model: m.name }
      const c = pickColor(s); if (c) args.color = c
      const off = pickOffset(s)
      if (off.dx || off.dz) { args.x = off.dx * 2; args.z = off.dz * 2 }
      const sc = s.match(/(\d+(?:\.\d+)?)\s*倍/); if (sc) args.scale = Number(sc[1])
      return { name: 'place_object', args }
    }
  }
  if (has('删除', '移除', '删掉')) {
    const n = pickObjectName(s)
    return { name: 'delete_object', args: n ? { name: n } : {} }
  }
  if (has('复制', '再来一个')) {
    const n = pickObjectName(s)
    return { name: 'duplicate_object', args: n ? { name: n } : {} }
  }
  if (has('移动', '挪', '移到', '往左', '往右', '往前', '往后', '向左', '向右', '向前', '向后')) {
    const n = pickObjectName(s)
    const off = pickOffset(s)
    const args: Record<string, unknown> = {}
    if (n) args.name = n
    if (off.dx) args.dx = off.dx
    if (off.dz) args.dz = off.dz
    if (has('抬高', '升起')) args.dy = pickNumber(s, 0.5)
    if (!args.dx && !args.dz && !args.dy) { args.dx = 1 }
    return { name: 'move_object', args }
  }
  if (has('旋转', '朝向', '面向', '转')) {
    const n = pickObjectName(s)
    const deg = pickNumber(s, 90)
    return { name: 'rotate_object', args: { ...(n ? { name: n } : {}), deg } }
  }
  if (has('放大', '缩小', '缩放')) {
    const n = pickObjectName(s)
    const cur = s.match(/(\d+(?:\.\d+)?)\s*倍/)
    const sc = cur ? Number(cur[1]) : has('放大') ? 1.5 : 0.6
    return { name: 'scale_object', args: { ...(n ? { name: n } : {}), scale: sc } }
  }
  if (has('颜色', '变红', '变蓝', '变绿', '变黄', '变黑', '变白', '变色')) {
    const n = pickObjectName(s)
    const c = pickColor(s)
    if (c) return { name: 'set_object_color', args: { ...(n ? { name: n } : {}), color: c } }
  }
  if (has('坐下', '地坐', '站立', '站起来', '躺', '行走')) {
    const pose = has('地坐', '坐下') ? '地坐' : has('躺') ? '躺卧' : has('行走') ? '行走' : '站立'
    const n = pickObjectName(s)
    return { name: 'set_actor_pose', args: { ...(n ? { name: n } : {}), pose } }
  }
  if (has('锁定')) { const n = pickObjectName(s); return { name: 'lock_object', args: { ...(n ? { name: n } : {}), locked: true } } }
  if (has('解锁')) { const n = pickObjectName(s); return { name: 'lock_object', args: { ...(n ? { name: n } : {}), locked: false } } }
  if (has('落到地面', '落地', '贴地')) { const n = pickObjectName(s); return { name: 'drop_to_ground', args: n ? { name: n } : {} } }
  if (has('聚焦', '对准', '看向', '镜头对准')) { const n = pickObjectName(s); return { name: 'focus_object', args: n ? { name: n } : {} } }
  if (has('退出操控', '结束操控', '停止操控')) return { name: 'exit_control', args: {} }
  if (has('操控', '进入操控', '控制')) { const n = pickObjectName(s); return { name: 'enter_control', args: n ? { name: n } : {} } }
  if (has('选中', '选择')) { const n = pickObjectName(s); if (n) return { name: 'select_object', args: { name: n } } }
  if (has('重命名', '改名')) {
    const m = s.match(/把\s*([^\s]+)\s*(?:改名|重命名)(?:为|成)\s*([^\s，。,]+)/)
    if (m) return { name: 'rename_object', args: { name: m[1], new_name: m[2] } }
  }
  if (has('关键帧')) { const n = pickObjectName(s); return { name: 'add_keyframe', args: n ? { name: n } : {} } }

  return null
}

/** 把一段话拆成多条指令 */
export function splitCommands(raw: string): string[] {
  return raw
    .split(/然后|接着|再|并且|，|,|;|；|\n/)
    .map(x => x.trim())
    .filter(Boolean)
}

export function parseCommands(raw: string): ToolCall[] {
  return splitCommands(raw).map(parseCommand).filter((x): x is ToolCall => !!x)
}
