import { useStudio, useEntities } from '../store'

/* ─────────────────────────────────────────────────────────────
   走位卡:选中角色且有路径时出现,把 3D 里的路点搬成可读列表
   - 每点:序号 / 坐标 / 定位 / 删除;悬停行联动 3D 高亮
   - 底部:反转 / 加密 / 闭合 / 清除 / 播放预览
   ───────────────────────────────────────────────────────────── */

const fmt = (n: number) => (Math.round(n * 10) / 10).toFixed(1)

export default function PathCard() {
  const selection = useStudio(s => s.selection)
  const timelineOpen = useStudio(s => s.timeline.open)
  const blocking = useStudio(s => (s.selection ? s.blocking[s.selection] : undefined))
  const closed = useStudio(s => (s.selection ? !!s.blockingClosed[s.selection] : false))
  const blockingFor = useStudio(s => s.blockingFor)
  const setPathHover = useStudio(s => s.setPathHover)
  const removeBlockingPoint = useStudio(s => s.removeBlockingPoint)
  const reverseBlocking = useStudio(s => s.reverseBlocking)
  const densifyBlocking = useStudio(s => s.densifyBlocking)
  const toggleBlockingClosed = useStudio(s => s.toggleBlockingClosed)
  const clearBlocking = useStudio(s => s.clearBlocking)
  const startBlocking = useStudio(s => s.startBlocking)
  const endBlocking = useStudio(s => s.endBlocking)
  const setBlockSeg = useStudio(s => s.setBlockSeg)
  const segDur = useStudio(s => (s.selection ? s.blockingSeg[s.selection] : undefined))
  const setTimeline = useStudio(s => s.setTimeline)
  const dur = useStudio(s => s.timeline.duration)
  const entities = useEntities()

  const e = entities.find(x => x.id === selection)
  if (!e || !blocking || blocking.length < 2) return null

  const n = blocking.length
  let total = 0
  for (let i = 0; i < n - 1; i++) {
    const a = blocking[i], b = blocking[i + 1]
    total += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
  }
  if (closed) {
    const a = blocking[n - 1], b = blocking[0]
    total += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
  }
  const drawing = blockingFor === e.id
  const segCount = closed ? n : n - 1
  const segSum = (segDur ?? []).slice(0, segCount).reduce((a, b) => a + (b || 0), 0)
  const hasSeg = segSum > 0.001

  const focusPoint = (p: [number, number, number]) => {
    window.dispatchEvent(new CustomEvent('studio-focus-point', { detail: p }))
  }

  return (
    <div className={`walk-card${timelineOpen ? ' lifted' : ''}`} role="region" aria-label="走位路径">
      <div className="wk-head">
        <span className="wk-title">走位路径</span>
        <span className="wk-meta">{n} 点 · {fmt(total)}m · {hasSeg ? `${fmt(segSum)}s 分段` : `${fmt(dur)}s`}{closed ? ' · 闭环' : ''}</span>
      </div>
      <div className="wk-list">
        {blocking.map((p, i) => (
          <div
            key={i}
            className="wk-row"
            onMouseEnter={() => setPathHover(i)}
            onMouseLeave={() => setPathHover(null)}
          >
            <span className={`wk-badge${i === 0 ? ' start' : i === n - 1 ? ' end' : ''}`}>
              {i === 0 ? '起' : i === n - 1 ? '终' : i + 1}
            </span>
            <span className="wk-coord">{fmt(p[0])}, {fmt(p[2])}</span>
            {i < segCount ? (
              <input
                className="wk-seg"
                type="number"
                min={0}
                max={60}
                step={0.5}
                value={segDur?.[i] ?? 0}
                aria-label={`第 ${i + 1} 段时长(秒),0 = 自动匀速`}
                title="该段用时(秒);0 = 按弧长在时间轴内匀速"
                onChange={ev => setBlockSeg(e.id, i, Number(ev.currentTarget.value))}
              />
            ) : <span className="wk-seg-space" />}
            <button className="wk-mini" aria-label={`定位第 ${i + 1} 个路点`} onClick={() => focusPoint(p as [number, number, number])}>
              定位
            </button>
            <button
              className="wk-mini danger"
              aria-label={`删除第 ${i + 1} 个路点`}
              disabled={n <= 2}
              onClick={() => removeBlockingPoint(e.id, i)}
            >
              删除
            </button>
          </div>
        ))}
      </div>
      <div className="wk-actions">
        <button className="wk-act" onClick={() => reverseBlocking(e.id)}>反转</button>
        <button className="wk-act" onClick={() => densifyBlocking(e.id)} disabled={n >= 24}>加密</button>
        <button className={`wk-act${closed ? ' on' : ''}`} onClick={() => toggleBlockingClosed(e.id)}>
          {closed ? '取消闭环' : '闭环'}
        </button>
        <button
          className="wk-act"
          onClick={() => setTimeline({ open: true, playing: true, time: 0 })}
        >
          预览
        </button>
        <button
          className="wk-act"
          onClick={() => (drawing ? endBlocking() : startBlocking(e.id))}
        >
          {drawing ? '结束绘制' : '续画'}
        </button>
        <button className="wk-act danger" onClick={() => clearBlocking(e.id)}>清除</button>
      </div>
    </div>
  )
}
