import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useStudio, useEntities } from '../store'
import { stageRef } from '../scene/ThreeStage'
import { ASPECTS, ASPECT_LIST, FOCALS } from '../types'
import { IconAspect, IconCaret, IconX } from './icons'

/* ─────────────────────────────────────────────────────────────
   取景器:四向遮幅 + 16:9 构图框(三分线 / 四角)
   底栏 = 关闭取景器 + 画幅/焦距胶囊 + 快门(Shift 点击 = 录制)
   ───────────────────────────────────────────────────────────── */

type StageApi = {
  capture?: (() => string | null) | null
  startRecord?: (() => boolean) | null
  stopRecord?: (() => Promise<string | null>) | null
}
/** ThreeStage 当前只挂了 capture;舞台侧提供录制接口时优先走它 */
const stage = stageRef as unknown as StageApi

/* 焦距滑轨几何:.vf-focal 127×40,主刻度内缩 13px、间距 14.4286px,次刻度 +5.14/+10.29 */
const TRACK_INSET = 13
const TICK_GAP = 14.4286
const MINOR_OFFSETS = [5.14, 10.29]

/* 录制:舞台未提供 startRecord 时直接录 canvas(webm) */
let localRec: { mr: MediaRecorder; done: Promise<string | null> } | null = null

function startLocalRecord(): boolean {
  if (localRec) return true
  const canvas = document.querySelector('canvas')
  if (!canvas || typeof MediaRecorder === 'undefined' || typeof canvas.captureStream !== 'function') return false
  try {
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m))
    const mr = new MediaRecorder(canvas.captureStream(30), mime ? { mimeType: mime } : undefined)
    const chunks: Blob[] = []
    mr.ondataavailable = ev => { if (ev.data.size) chunks.push(ev.data) }
    const done = new Promise<string | null>(resolve => {
      mr.onstop = () => resolve(chunks.length ? URL.createObjectURL(new Blob(chunks, { type: 'video/webm' })) : null)
    })
    mr.start(200)
    localRec = { mr, done }
    return true
  } catch { return false }
}

async function stopLocalRecord(): Promise<string | null> {
  const rec = localRec
  if (!rec) return null
  localRec = null
  if (rec.mr.state !== 'inactive') rec.mr.stop()
  return rec.done
}

export default function Viewfinder() {
  const vf = useStudio(s => s.viewfinder)
  const aspect = useStudio(s => s.aspect)
  const focalIdx = useStudio(s => s.focalIdx)
  const recording = useStudio(s => s.recording)
  const setViewfinder = useStudio(s => s.setViewfinder)
  const setAspect = useStudio(s => s.setAspect)
  const setFocalIdx = useStudio(s => s.setFocalIdx)

  const [menuOpen, setMenuOpen] = useState(false)
  const [frame, setFrame] = useState({ x: 0, y: 0, w: 0, h: 0 })
  const [grid, setGrid] = useState<'thirds' | 'crosshair' | 'off'>('thirds')
  const [safeArea, setSafeArea] = useState(true)
  const [centerMark, setCenterMark] = useState(true)
  const [recSecs, setRecSecs] = useState(0)
  useEffect(() => {
    if (!recording) { setRecSecs(0); return }
    const t0 = Date.now()
    const t = window.setInterval(() => setRecSecs(Math.floor((Date.now() - t0) / 1000)), 500)
    return () => window.clearInterval(t)
  }, [recording])
  const mode = useStudio(s => s.mode)
  const entities = useEntities()
  const statusCam = mode.type === 'cam' ? entities.find(e => e.id === mode.id) : undefined
  // 对焦距离:跟随目标时 = 机位到目标的距离;无目标视为无限远
  const focusText = (() => {
    if (!statusCam) return '∞'
    const tgt = statusCam.followId ? entities.find(e => e.id === statusCam.followId) : undefined
    if (!tgt) return '∞'
    const eyeY = statusCam.position[1] + 1.28 * statusCam.scale
    const ty = tgt.position[1] + (tgt.height ?? 1.7) * tgt.scale * 0.55
    const d = Math.hypot(tgt.position[0] - statusCam.position[0], ty - eyeY, tgt.position[2] - statusCam.position[2])
    return `${d.toFixed(1)}m`
  })()
  const aspectRef = useRef<HTMLButtonElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!vf) return
    const calc = () => {
      const vw = window.innerWidth, vh = window.innerHeight
      const r = ASPECTS[aspect]
      const margin = 110
      let w = vw - margin * 2, h = w / r
      if (h > vh - margin * 2) { h = vh - margin * 2; w = h * r }
      setFrame({ x: (vw - w) / 2, y: (vh - h) / 2, w, h })
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [vf, aspect])

  // 关闭取景器时收尾未结束的录制
  useEffect(() => () => {
    if (!localRec) return
    void stopLocalRecord()
    useStudio.getState().setRecording(false)
  }, [])

  if (!vf) return null

  const shoot = () => {
    const st = useStudio.getState()
    const url = stage.capture?.() ?? null
    if (!url) { st.toast('取景器未就绪,无法截取画面'); return }
    const mm = FOCALS[st.focalIdx]
    const shot = st.addShot({
      kind: 'image', url,
      name: `镜头 ${st.shots.length + 1}`,
      meta: `${mm}mm · ${st.aspect}`,
      focalMm: mm,
    })
    st.toast(`已存入故事板:${shot.name}`)
  }

  const toggleRecord = async () => {
    const st = useStudio.getState()
    if (!st.recording) {
      const ok = stage.startRecord ? stage.startRecord() : startLocalRecord()
      if (!ok) { st.toast('录制启动失败:浏览器不支持或渲染器未就绪'); return }
      st.setRecording(true)
      st.toast('开始录制,再次按住 Shift 点击快门结束')
      return
    }
    const url = stage.stopRecord ? await stage.stopRecord() : await stopLocalRecord()
    st.setRecording(false)
    if (!url) { st.toast('录制结束,但没有拿到视频数据'); return }
    const mm = FOCALS[st.focalIdx]
    const shot = st.addShot({
      kind: 'video', url,
      name: `运镜 ${st.shots.length + 1}`,
      meta: `${mm}mm · ${st.aspect}`,
      focalMm: mm,
    })
    st.toast(`已存入故事板:${shot.name}`)
  }

  const idxAt = (clientX: number) => {
    const el = trackRef.current
    if (!el) return focalIdx
    const r = el.getBoundingClientRect()
    return Math.round((clientX - r.left - TRACK_INSET) / TICK_GAP)
  }

  const onFocalDown = (ev: React.PointerEvent<HTMLDivElement>) => {
    ev.preventDefault()
    const el = ev.currentTarget
    el.setPointerCapture(ev.pointerId)
    setFocalIdx(idxAt(ev.clientX))
    const move = (e: PointerEvent) => setFocalIdx(idxAt(e.clientX))
    const up = (e: PointerEvent) => {
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const stepFocalBy = (d: number) => setFocalIdx(focalIdx + d)

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 45, pointerEvents: 'none' }}>
      {/* 遮幅 */}
      <div className="vf-shade" style={{ left: 0, top: 0, right: 0, height: frame.y }} />
      <div className="vf-shade" style={{ left: 0, top: frame.y + frame.h, right: 0, bottom: 0 }} />
      <div className="vf-shade" style={{ left: 0, top: frame.y, width: frame.x, height: frame.h }} />
      <div className="vf-shade" style={{ left: frame.x + frame.w, top: frame.y, right: 0, height: frame.h }} />

      {/* 构图框:三分线 + 区域标高 + 焦点热区 + 四角 */}
      <div className="vf-frame" style={{ left: frame.x, top: frame.y, width: frame.w, height: frame.h }}>
        {recording && (
          <span className="vf-rec" aria-label={`录制中 ${recSecs} 秒`}>
            <i className="dot" />REC {String(Math.floor(recSecs / 60)).padStart(2, '0')}:{String(recSecs % 60).padStart(2, '0')}
          </span>
        )}
        {grid === 'thirds' && (
          <>
            <div className="vf-line" style={{ left: '33.333%', top: 0, bottom: 0, width: 1 }} />
            <div className="vf-line" style={{ left: '66.667%', top: 0, bottom: 0, width: 1 }} />
            <div className="vf-line" style={{ top: '33.333%', left: 0, right: 0, height: 1 }} />
            <div className="vf-line" style={{ top: '66.667%', left: 0, right: 0, height: 1 }} />
          </>
        )}
        {grid === 'crosshair' && (
          <>
            <div className="vf-line" style={{ left: '50%', top: 0, bottom: 0, width: 1 }} />
            <div className="vf-line" style={{ top: '50%', left: 0, right: 0, height: 1 }} />
          </>
        )}
        {safeArea && (
          <>
            {/* 90% 安全区 + 80% 实际区,洛筑形 */}
            <div className="vf-safe" style={{ left: '5%', top: '5%', right: '5%', bottom: '5%' }} />
            <div className="vf-safe-inner" style={{ left: '10%', top: '10%', right: '10%', bottom: '10%' }} />
          </>
        )}
        {centerMark && (
          <span className="vf-center-mark" style={{ left: '50%', top: '50%' }} />
        )}
        <span className="vf-corner" style={{ left: 0, top: 0 }} />
        <span className="vf-corner" style={{ right: 0, top: 0 }} />
        <span className="vf-corner" style={{ left: 0, bottom: 0 }} />
        <span className="vf-corner" style={{ right: 0, bottom: 0 }} />
      </div>

      {/* 相机状态条:焦距 / FOV / 光圈 / 快门 / ISO(机位模式下读该摄像机) */}
      <div className="vf-status" style={{ position: 'absolute', top: frame.y - 28, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'auto' }}>
        <span className="vf-status-item">{statusCam ? `${statusCam.focalMm ?? 24}mm` : `${FOCALS[focalIdx]}mm`}</span>
        <span className="vf-status-sep" />
        <span className="vf-status-item">FOV {Math.round(2 * Math.atan(21.6 / (statusCam?.focalMm ?? FOCALS[focalIdx])) * (180 / Math.PI))}°</span>
        <span className="vf-status-sep" />
        <span className="vf-status-item">{`f/${statusCam?.aperture ?? 2.8}`}</span>
        <span className="vf-status-sep" />
        <span className="vf-status-item">{`1/${statusCam?.shutter ?? 50}s`}</span>
        <span className="vf-status-sep" />
        <span className="vf-status-item">{`ISO${statusCam?.iso ?? 400}`}</span>
        {statusCam && (
          <>
            <span className="vf-status-sep" />
            <span className="vf-status-item">{`对焦 ${focusText}`}</span>
          </>
        )}
      </div>

      {/* 取景器开关条(构图) */}
      <div
        className="vf-toggles"
        style={{ position: 'absolute', top: frame.y - 62, left: '50%', transform: 'translateX(-50%)', zIndex: 1, pointerEvents: 'auto', display: 'flex', gap: 8 }}
      >
        <button
          className={`hud-btn${grid === 'thirds' ? ' active' : ''}`}
          aria-label="三分法网格"
          onClick={() => setGrid('thirds')}
        >三分</button>
        <button
          className={`hud-btn${grid === 'crosshair' ? ' active' : ''}`}
          aria-label="十字网格"
          onClick={() => setGrid('crosshair')}
        >十字</button>
        <button
          className={`hud-btn${grid === 'off' ? ' active' : ''}`}
          aria-label="关闭网格"
          onClick={() => setGrid('off')}
        >无网格</button>
        <button
          className={`hud-btn${safeArea ? ' active' : ''}`}
          aria-label="安全区"
          aria-pressed={safeArea}
          onClick={() => setSafeArea(v => !v)}
        >安全区</button>
        <button
          className={`hud-btn${centerMark ? ' active' : ''}`}
          aria-label="中心标记"
          aria-pressed={centerMark}
          onClick={() => setCenterMark(v => !v)}
        >中心点</button>
      </div>

      {/* 底栏 */}
      <div
        className="vf-bar"
        style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 1, pointerEvents: 'auto' }}
      >
        <div className="hud-pill">
          <button className="hud-btn active" aria-label="关闭取景器" onClick={() => setViewfinder(false)}>
            <IconX />
            <span>取景器</span>
          </button>
        </div>

        <div className="hud-pill">
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <button
              ref={aspectRef}
              className="vf-aspect"
              aria-label="画幅比例"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(v => !v)}
            >
              <IconAspect />
              <span>{aspect}</span>
              <IconCaret className="caret" />
            </button>
            {menuOpen && (
              <Pop anchor={aspectRef.current} close={() => setMenuOpen(false)} minWidth={290}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  {ASPECT_LIST.map(a => (
                    <button
                      key={a}
                      className={`menu-item${a === aspect ? ' on' : ''}`}
                      style={{ minHeight: 25, padding: '0 10px', fontSize: 13, borderRadius: 6 }}
                      aria-label={a}
                      onClick={() => { setAspect(a); setMenuOpen(false) }}
                    >
                      <span className="mi-label">{a}</span>
                    </button>
                  ))}
                </div>
              </Pop>
            )}
          </span>

          <span className="hud-divider" />

          <span className="vf-focal">
            <span className="focal-track-wrap">
              <span className="focal-track-rot">
                <div
                  ref={trackRef}
                  className="focal-track"
                  role="slider"
                  tabIndex={0}
                  aria-label="焦距"
                  aria-valuemin={0}
                  aria-valuemax={FOCALS.length - 1}
                  aria-valuenow={focalIdx}
                  aria-valuetext={`${FOCALS[focalIdx]}mm`}
                  onPointerDown={onFocalDown}
                  onWheel={ev => stepFocalBy(ev.deltaY > 0 ? 1 : -1)}
                  onKeyDown={ev => {
                    if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') { ev.preventDefault(); stepFocalBy(-1) }
                    else if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') { ev.preventDefault(); stepFocalBy(1) }
                  }}
                >
                  {FOCALS.map((mm, i) => (
                    <span
                      key={mm}
                      className={`focal-tick${i === 0 || i === FOCALS.length - 1 ? ' edge' : ''}`}
                      style={{ left: TRACK_INSET + i * TICK_GAP }}
                    >
                      <i />
                      {i < FOCALS.length - 1 && MINOR_OFFSETS.map(o => (
                        <span key={o} className="minor" style={{ left: o }} />
                      ))}
                    </span>
                  ))}
                  <span className="focal-ind" style={{ left: TRACK_INSET + focalIdx * TICK_GAP }} />
                </div>
              </span>
            </span>
            <output className="focal-out"><b>{FOCALS[focalIdx]}</b>mm</output>
          </span>
        </div>

        <button
          className={`shutter-btn${recording ? ' rec' : ''}`}
          aria-label="截取画面"
          onClick={ev => { if (ev.shiftKey) void toggleRecord(); else shoot() }}
        />
      </div>
    </div>
  )
}

/* ── 菜单定位壳(贴着触发按钮上方居中,与主条一致) ─────────── */
function Pop({ anchor, close, children, minWidth }: {
  anchor: HTMLElement | null
  close: () => void
  children: ReactNode
  minWidth?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null)

  useLayoutEffect(() => {
    if (window.scrollY !== 0) window.scrollTo(0, 0)
    const a = anchor?.getBoundingClientRect()
    if (!a) return
    const w = ref.current?.offsetWidth ?? 160
    const left = Math.min(Math.max(8, a.left + a.width / 2 - w / 2), window.innerWidth - w - 8)
    setPos({ left, bottom: window.innerHeight - a.top + 8 })
  }, [anchor])

  useEffect(() => {
    const onDown = (ev: MouseEvent) => {
      if (ref.current?.contains(ev.target as Node)) return
      if (anchor?.contains(ev.target as Node)) return
      close()
    }
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') close() }
    const t = setTimeout(() => document.addEventListener('mousedown', onDown), 0)
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [anchor, close])

  return (
    <div ref={ref} className="menu-pop" role="menu" style={{ left: pos?.left ?? 0, bottom: pos?.bottom ?? 0, minWidth, visibility: pos ? 'visible' : 'hidden' }}>
      {children}
    </div>
  )
}
