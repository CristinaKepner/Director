import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { useStudio } from '../store'
import { FOCALS } from '../types'

/** 每档间距(108px 轨道 / 7 段) */
const STEP = 14.4286
/** 主刻度之间的两个次刻度偏移 */
const MINOR_A = 5.1428
const MINOR_B = 10.2857

/** 左侧焦距刻度尺:8 档可点、可拖、可滚轮、可方向键 */
export default function FocalRuler() {
  const focalIdx = useStudio(s => s.focalIdx)
  const setFocalIdx = useStudio(s => s.setFocalIdx)
  const stepFocal = useStudio(s => s.stepFocal)

  const trackRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  /** 把屏幕纵坐标映射到最近的焦距档位(轨道旋转 -90°,底部为第 0 档) */
  const idxFromClientY = (clientY: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return null
    const localX = rect.bottom - clientY
    return Math.max(0, Math.min(FOCALS.length - 1, Math.round(localX / STEP)))
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const idx = idxFromClientY(e.clientY)
    if (idx == null) return
    e.currentTarget.setPointerCapture(e.pointerId)
    draggingRef.current = true
    setFocalIdx(idx)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    const idx = idxFromClientY(e.clientY)
    if (idx != null) setFocalIdx(idx)
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = false
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const mm = FOCALS[focalIdx]

  return (
    <div className="focal-ruler" aria-label="焦距">
      <div className="focal-track-wrap">
        <div className="focal-track-rot">
          <div
            className="focal-track"
            ref={trackRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={e => { if (e.deltaY !== 0) stepFocal(e.deltaY < 0 ? 1 : -1) }}
          >
            {FOCALS.map((f, i) => (
              <button
                key={f}
                type="button"
                className={`focal-tick${i < 2 || i === FOCALS.length - 1 ? ' edge' : ''}`}
                style={{ left: Math.round(i * STEP * 1e4) / 1e4 }}
                aria-label={`${f}mm`}
                onClick={() => setFocalIdx(i)}
              >
                <i />
                {i < FOCALS.length - 1 && (
                  <>
                    <span className="minor" style={{ left: MINOR_A, pointerEvents: 'none' }} />
                    <span className="minor" style={{ left: MINOR_B, pointerEvents: 'none' }} />
                  </>
                )}
              </button>
            ))}
            <span className="focal-ind" style={{ left: Math.round(focalIdx * STEP * 1e4) / 1e4 }} />
          </div>
        </div>
      </div>

      <output className="focal-out"><b>{mm}</b><span>mm</span></output>

      <span
        role="slider"
        aria-label="焦距"
        aria-valuemin={8}
        aria-valuemax={400}
        aria-valuenow={mm}
        aria-valuetext={`${mm}mm`}
        aria-orientation="vertical"
        tabIndex={0}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        onKeyDown={e => {
          if (e.key === 'ArrowUp') { e.preventDefault(); stepFocal(1) }
          else if (e.key === 'ArrowDown') { e.preventDefault(); stepFocal(-1) }
        }}
      />
    </div>
  )
}
