import { useStudio, useEntities } from '../store'

/* ─────────────────────────────────────────────────────────────
   上下文操作条:按当前状态给出"现在能做什么",键位可见、动作可点
   优先级:放置 > 操控角色 > 走位绘制 > 录制 > 时间轴播放 > 选中带路径的角色 > 默认浏览
   ───────────────────────────────────────────────────────────── */

interface Chip {
  keys?: string[]
  label: string
  onClick?: () => void
}

export default function ContextBar() {
  const placement = useStudio(s => s.placement)
  const controlId = useStudio(s => s.controlId)
  const blockingFor = useStudio(s => s.blockingFor)
  const recording = useStudio(s => s.recording)
  const timelineOpen = useStudio(s => s.timeline.open)
  const playing = useStudio(s => s.timeline.playing)
  const selection = useStudio(s => s.selection)
  const blocking = useStudio(s => (s.selection ? s.blocking[s.selection]?.length ?? 0 : 0))
  const endBlocking = useStudio(s => s.endBlocking)
  const setControl = useStudio(s => s.setControl)
  const setTimeline = useStudio(s => s.setTimeline)
  const setRecording = useStudio(s => s.setRecording)
  const cancelPlacement = useStudio(s => s.cancelPlacement)
  const entities = useEntities()

  let chips: Chip[] = []
  if (placement) {
    chips = [
      { label: '点击地面放置对象' },
      { keys: ['滚轮'], label: '调整大小' },
      { keys: ['Esc'], label: '取消放置', onClick: cancelPlacement },
    ]
  } else if (controlId) {
    chips = [
      { keys: ['W', 'A', 'S', 'D'], label: '移动角色' },
      { keys: ['Q', 'E'], label: '升降' },
      { keys: ['Shift'], label: '加速' },
      { keys: ['Esc'], label: '退出操控', onClick: () => setControl(null) },
    ]
  } else if (blockingFor) {
    chips = [
      { label: '点击地面添加走位点' },
      { label: '拖拽路点调整位置' },
      { keys: ['⌥ 点击'], label: '删除路点' },
      { keys: ['Esc'], label: '结束走位', onClick: endBlocking },
    ]
  } else if (recording) {
    chips = [
      { label: '正在录制运镜' },
      { label: '停止录制', onClick: () => setRecording(false) },
    ]
  } else if (timelineOpen && playing) {
    chips = [
      { label: '时间轴播放中' },
      { keys: ['空格'], label: '暂停', onClick: () => setTimeline({ playing: false }) },
      { label: '拖动时间轴可预览任意时刻' },
    ]
  } else if (selection && blocking >= 2 && entities.some(x => x.id === selection)) {
    chips = [
      { label: '拖拽路点调整位置' },
      { keys: ['⌥ 点击'], label: '删除路点' },
      { keys: ['Space'], label: '播放走位预览', onClick: () => setTimeline({ open: true, playing: true, time: 0 }) },
    ]
  } else if (selection) {
    chips = [
      { keys: ['拖拽手柄'], label: '移动对象' },
      { keys: ['R'], label: '旋转模式' },
      { keys: ['G'], label: '落到地面' },
      { keys: ['L'], label: '锁定' },
      { keys: ['Delete'], label: '删除' },
    ]
  } else {
    chips = [
      { keys: ['左键拖动'], label: '环视' },
      { keys: ['滚轮'], label: '缩放' },
      { keys: ['⌥ 拖动'], label: '围绕指定点旋转' },
      { keys: ['双击对象'], label: '聚焦' },
      { keys: ['右键表面'], label: '添加对象' },
    ]
  }

  return (
    <div className="ctx-bar" role="status">
      {chips.map((c, i) => (
        <span
          key={i}
          className={`ctx-chip${c.onClick ? ' clickable' : ''}`}
          role={c.onClick ? 'button' : undefined}
          tabIndex={c.onClick ? 0 : undefined}
          onClick={c.onClick}
          onKeyDown={ev => { if (c.onClick && (ev.key === 'Enter' || ev.key === ' ')) c.onClick() }}
        >
          {c.keys?.map(k => <kbd key={k} className="ctx-kbd">{k}</kbd>)}
          <span className="ctx-label">{c.label}</span>
        </span>
      ))}
    </div>
  )
}
