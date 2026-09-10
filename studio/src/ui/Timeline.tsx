import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useStudio, useEntities } from '../store'
import type { Keyframe } from '../types'
import { stageRef } from '../scene/ThreeStage'
import { IconDots, IconLoop, IconLoopOff, IconPause, IconPlay, IconPlus, IconRefresh, IconTrash } from './icons'

/* ─────────────────────────────────────────────────────────────
   时间轴:播放 / 循环 / 标尺 / 三轨关键帧(人物·对象 / 机位 / 打光)
   右侧:按匀速重新分配 · 保存关键帧 · 删除关键帧 · 时间轴操作
   ───────────────────────────────────────────────────────────── */

const BASE_INSET = 18   // 与 .tl-base 的左右内缩一致
const TICK_STEP = 1 / 60
const LABEL_STEP = 0.5
const KEY_HIT = 0.12    // 播放头命中关键帧的范围(秒)
const DURATION_MIN = 1
const DURATION_MAX = 30

type LaneId = 'cast' | 'cam' | 'light' | 'shot'
type Mark = { key: string; t: number; on: boolean; ent?: string; idx: number }

export default function Timeline() {
  const open = useStudio(s => s.timeline.open)
  if (!open) return null
  return <TimelineInner />
}

function TimelineInner() {
  const timeline = useStudio(s => s.timeline)
  const setTimeline = useStudio(s => s.setTimeline)
  const selection = useStudio(s => s.selection)
  const lightKeys = useStudio(s => s.lightKeys)
  const entities = useEntities()
  const scaleRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLButtonElement>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [lane, setLane] = useState<LaneId>('cast')
  const [selLightKey, setSelLightKey] = useState<number | null>(null)
  const cuts = useStudio(s => s.cuts)
  const cutDrag = useRef<{ id: string; mode: 'move' | 'trim'; x0: number; t0: number; t1: number; moved: boolean } | null>(null)
  const S = useStudio.getState
  const duration = timeline.duration

  // 播放推进由 ThreeStage 主循环统一驱动(避免双 rAF 重复推进)

  // 播放头:播放时用 rAF 直接读本地时钟写 DOM(不走 React 渲染)
  const headRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!timeline.playing) return
    let raf = 0
    const step = () => {
      const t = stageRef.getTimelineTime?.() ?? S().timeline.time
      if (headRef.current) headRef.current.style.left = pct(t)
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [timeline.playing, duration])

  const timeAt = (clientX: number) => {
    const el = scaleRef.current
    if (!el) return 0
    const r = el.getBoundingClientRect()
    const span = Math.max(1, r.width - BASE_INSET * 2)
    return Math.max(0, Math.min(duration, ((clientX - r.left - BASE_INSET) / span) * duration))
  }

  const onSeekDown = (ev: React.PointerEvent<HTMLDivElement>) => {
    ev.preventDefault()
    const el = ev.currentTarget
    el.setPointerCapture(ev.pointerId)
    setTimeline({ time: timeAt(ev.clientX) })
    const move = (e: PointerEvent) => setTimeline({ time: timeAt(e.clientX) })
    const up = (e: PointerEvent) => {
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const togglePlay = () => {
    if (!timeline.playing && timeline.time >= duration - 1e-3) setTimeline({ time: 0, playing: true })
    else setTimeline({ playing: !timeline.playing })
  }

  const pct = (t: number) => `calc(${BASE_INSET}px + (100% - ${BASE_INSET * 2}px) * ${t / duration})`

  // 三轨数据:人物·对象 / 机位 / 打光
  const castEnts = entities.filter(e => e.kind === 'actor' || e.kind === 'prop')
  const camEnts = entities.filter(e => e.kind === 'camera')

  const saveLaneKey = () => {
    const st = S()
    if (lane === 'shot') { addCutHere(); return }
    if (lane === 'light') { st.addLightKey(); return }
    if (!selection) { st.toast('先选中该轨对象'); return }
    const kind = st.getEntity(selection)?.kind
    const inLane = lane === 'cast' ? kind === 'actor' || kind === 'prop' : kind === 'camera'
    if (!inLane) { st.toast('先选中该轨对象'); return }
    st.addKeyframeFor(selection)
  }

  const delKey = () => {
    const st = S()
    if (lane === 'light') {
      if (selLightKey == null || !st.lightKeys[selLightKey]) { st.toast('先点击选择要删除的打光关键帧'); return }
      const k = st.lightKeys[selLightKey]
      st.removeLightKey(k.t)
      setSelLightKey(null)
      st.toast(`已删除 ${k.t.toFixed(2)}s 处的打光关键帧`)
      return
    }
    if (!selection) { st.toast('选择要删除的关键帧。'); return }
    const arr = st.keys[selection] ?? []
    if (!arr.length) { st.toast('当前对象还没有关键帧'); return }
    let idx = timeline.selectedKey
    if (idx == null || idx < 0 || idx >= arr.length) {
      let best = 0
      for (let i = 1; i < arr.length; i++) if (Math.abs(arr[i].t - timeline.time) < Math.abs(arr[best].t - timeline.time)) best = i
      idx = Math.abs(arr[best].t - timeline.time) <= KEY_HIT ? best : null
    }
    if (idx == null) { st.toast('播放头附近没有关键帧'); return }
    st.removeKeyframeFor(selection, arr[idx].t)
    setTimeline({ selectedKey: null })
    st.toast(`已删除 ${arr[idx].t.toFixed(2)}s 处的关键帧`)
  }

  /** 把当前对象的关键帧在整条时间轴上按匀速重排 */
  const redistributeKeys = () => {
    const st = S()
    if (lane === 'light') { st.toast('打光轨暂不支持匀速重排'); return }
    if (!selection) { st.toast('先选中对象'); return }
    const arr = st.keys[selection] ?? []
    if (arr.length < 2) { st.toast('至少需要 2 个关键帧才能重新分配'); return }
    const gap = timeline.duration / (arr.length - 1)
    const next = arr.map((k, i) => ({ ...k, t: i * gap }))
    useStudio.setState(s => ({
      keys: { ...s.keys, [selection]: next },
      timeline: { ...s.timeline, selectedKey: null },
    }))
    st.toast(`已按匀速重新分配 ${next.length} 个关键帧`)
  }

  const shiftDuration = (d: number) => {
    const st = S()
    const dur = Math.max(DURATION_MIN, Math.min(DURATION_MAX, st.timeline.duration + d))
    if (dur === st.timeline.duration) return
    st.setTimeline({ duration: dur, time: Math.min(st.timeline.time, dur) })
    st.toast(`时间轴时长 ${dur} 秒`)
    setMoreOpen(false)
  }

  const { ticks, labels } = useMemo(() => ({
    ticks: Array.from({ length: Math.round(duration / TICK_STEP) + 1 }, (_, i) => i * TICK_STEP),
    labels: Array.from({ length: Math.round(duration / LABEL_STEP) + 1 }, (_, i) => i * LABEL_STEP),
  }), [duration])

  const laneMarks = (ents: typeof entities): Mark[] => {
    const marks: Mark[] = []
    for (const e of ents) {
      const arr = S().keys[e.id] ?? []
      arr.forEach((k, i) => marks.push({ key: `${e.id}:${i}`, t: k.t, on: selection === e.id && timeline.selectedKey === i, ent: e.id, idx: i }))
    }
    return marks
  }

  const lightMarks: Mark[] = lightKeys.map((k, i) => ({ key: `lk:${i}`, t: k.t, on: selLightKey === i, idx: i }))

  /* ── 镜头轨:时间区间 → 机位(成片分镜) ── */
  const camName = (id: string) => entities.find(e => e.id === id)?.name ?? (id ? '缺失机位' : '自由视角')
  const pxPerSec = () => {
    const r = scaleRef.current?.getBoundingClientRect()
    if (!r) return 100
    return Math.max(1, r.width - BASE_INSET * 2) / duration
  }
  const cutAt = (t: number) => cuts.find(c => t >= c.t0 && t < c.t1)
  /** 在播放头处插入镜头:自动选该区间未占用的机位 */
  const addCutHere = () => {
    const st = S()
    if (!camEnts.length) { st.toast('先添加一台机位'); return }
    const t0 = Math.min(timeline.time, duration - 0.5)
    const t1 = Math.min(duration, t0 + 3)
    const busy = new Set(cuts.filter(c => !(c.t1 <= t0 + 1e-6 || c.t0 >= t1 - 1e-6)).map(c => c.camId))
    const free = camEnts.find(c => !busy.has(c.id)) ?? camEnts[0]
    st.addCut(t0, t1, free.id)
    setLane('shot')
    st.toast(`已加镜头 ${t0.toFixed(1)}–${t1.toFixed(1)}s · ${free.name}`)
  }
  const cycleCutCam = (id: string) => {
    const c = cuts.find(x => x.id === id)
    if (!c || !camEnts.length) return
    const idx = camEnts.findIndex(x => x.id === c.camId)
    const next = camEnts[(idx + 1) % camEnts.length]
    S().updateCut(id, { camId: next.id })
    S().toast(`镜头 ${c.t0.toFixed(1)}–${c.t1.toFixed(1)}s → ${next.name}`)
  }
  const startCutDrag = (ev: React.PointerEvent, id: string, mode: 'move' | 'trim') => {
    const c = cuts.find(x => x.id === id)
    if (!c) return
    ev.preventDefault(); ev.stopPropagation()
    const el = ev.currentTarget as HTMLElement
    el.setPointerCapture(ev.pointerId)
    cutDrag.current = { id, mode, x0: ev.clientX, t0: c.t0, t1: c.t1, moved: false }
    const move = (e: PointerEvent) => {
      const d = cutDrag.current
      if (!d) return
      const dtSec = (e.clientX - d.x0) / pxPerSec()
      if (Math.abs(e.clientX - d.x0) > 3) d.moved = true
      if (!d.moved) return
      const snap = (v: number) => Math.round(v * 20) / 20
      if (d.mode === 'move') {
        const len = d.t1 - d.t0
        const nt0 = Math.max(0, Math.min(duration - len, snap(d.t0 + dtSec)))
        S().updateCut(id, { t0: nt0, t1: nt0 + len })
      } else {
        S().updateCut(id, { t1: Math.max(d.t0 + 0.1, Math.min(duration, snap(d.t1 + dtSec))) })
      }
    }
    const up = (e: PointerEvent) => {
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.setTimeout(() => { cutDrag.current = null }, 0)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const lanes: { id: LaneId; label: string; marks: Mark[]; onMark: (m: Mark) => void; accent?: boolean }[] = [
    {
      id: 'cast',
      label: '人物·对象',
      marks: laneMarks(castEnts),
      onMark: m => {
        setLane('cast')
        if (m.ent) S().select(m.ent)
        setTimeline({ time: m.t, selectedKey: m.idx })
      },
    },
    {
      id: 'cam',
      label: '机位',
      marks: laneMarks(camEnts),
      onMark: m => {
        setLane('cam')
        if (m.ent) S().select(m.ent)
        setTimeline({ time: m.t, selectedKey: m.idx })
      },
    },
    {
      id: 'light',
      label: '打光',
      marks: lightMarks,
      accent: true,
      onMark: m => {
        setLane('light')
        setSelLightKey(m.idx)
        setTimeline({ time: m.t })
      },
    },
    {
      id: 'shot',
      label: '镜头',
      marks: [],
      onMark: () => setLane('shot'),
    },
  ]

  return (
    <div className="bottom-center" style={{ bottom: 72 }}>
      <div className="timeline-pill" role="group" aria-label="时间轴">
        <button className="icon-btn" aria-label={timeline.playing ? '暂停' : '播放时间调度'} onClick={togglePlay}>
          {timeline.playing ? <IconPause /> : <IconPlay />}
        </button>
        <button
          className={`icon-btn${timeline.loop ? ' active' : ''}`}
          aria-label={timeline.loop ? '关闭循环播放' : '开启循环播放'}
          aria-pressed={timeline.loop}
          onClick={() => setTimeline({ loop: !timeline.loop })}
        >
          {timeline.loop ? <IconLoop /> : <IconLoopOff />}
        </button>

        <div className="tl-body">
          <div
            ref={scaleRef}
            className="tl-scale"
            onPointerDown={onSeekDown}
          >
            <div className="tl-base" />
            {ticks.map(t => {
              const isHalf = Math.abs(t * 2 - Math.round(t * 2)) < 1e-6
              const isQuarter = Math.abs(t * 4 - Math.round(t * 4)) < 1e-6
              return <span key={t} className={`tl-tick ${isHalf ? 'major' : isQuarter ? 'mid' : 'minor'}`} style={{ left: pct(t) }} />
            })}
            {labels.map(t => <span key={t} className="tl-tlabel" style={{ left: pct(t) }}>{`${t}s`}</span>)}
            <div
              ref={headRef}
              className="tl-playhead"
              role="slider"
              aria-label={`播放头位于 ${timeline.time.toFixed(1)}s`}
              aria-valuemin={0}
              aria-valuemax={duration}
              aria-valuenow={Number(timeline.time.toFixed(2))}
              style={{ left: pct(timeline.time) }}
            />
          </div>
          {lanes.map(ln => (
            <div key={ln.id} className={`tl-lane${lane === ln.id ? ' on' : ''}`}>
              <button className="tl-lane-label" aria-label={`切换到${ln.label}轨道`} onClick={() => setLane(ln.id)}>{ln.label}</button>
              <div className="tl-lane-track">
                {ln.id === 'shot'
                  ? cuts.map(c => (
                      <span
                        key={c.id}
                        className={`tl-cut${cutAt(timeline.time)?.id === c.id ? ' on' : ''}`}
                        style={{
                          left: pct(c.t0),
                          width: `calc((100% - ${BASE_INSET * 2}px) * ${Math.max(0.001, (c.t1 - c.t0) / duration)})`,
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`镜头 ${camName(c.camId)} ${c.t0.toFixed(2)} 至 ${c.t1.toFixed(2)} 秒,点击切换机位,双击删除`}
                        title={`${camName(c.camId)} · ${c.t0.toFixed(2)}–${c.t1.toFixed(2)}s(点击换机位 · 拖动移动 · 右缘拖动改时长 · 双击删除)`}
                        onPointerDown={ev => startCutDrag(ev, c.id, 'move')}
                        onClick={() => { if (!cutDrag.current?.moved) cycleCutCam(c.id) }}
                        onDoubleClick={() => S().removeCut(c.id)}
                      >
                        <span className="tl-cut-name">{camName(c.camId).split(' ')[0]}</span>
                        <span
                          className="tl-cut-handle"
                          aria-hidden="true"
                          onPointerDown={ev => startCutDrag(ev, c.id, 'trim')}
                        />
                      </span>
                    ))
                  : ln.marks.map(m => (
                      <span
                        key={m.key}
                        className={`tl-key${m.on ? ' sel' : ''}${ln.accent ? ' lk' : ''}`}
                        style={{ left: pct(m.t) }}
                        role="button"
                        tabIndex={0}
                        aria-label={`${ln.label}关键帧 ${m.t.toFixed(2)} 秒`}
                        onPointerDown={ev => ev.stopPropagation()}
                        onClick={ev => { ev.stopPropagation(); ln.onMark(m) }}
                      />
                    ))}
              </div>
              <button
                className="tl-lane-add"
                aria-label={ln.id === 'shot' ? '在播放头处添加镜头' : `保存${ln.label}关键帧`}
                onClick={() => {
                  if (ln.id === 'shot') { addCutHere(); return }
                  setLane(ln.id); saveLaneKey()
                }}
              >
                <IconPlus />
              </button>
            </div>
          ))}
        </div>

        <button className="icon-btn" aria-label="按匀速重新分配" onClick={redistributeKeys}><IconRefresh /></button>
        <button
          className="icon-btn"
          aria-label={lane === 'light' ? '保存打光关键帧' : selection ? '保存关键帧' : '先选择角色、摄像机或对象,再保存关键帧'}
          disabled={lane !== 'light' && !selection}
          onClick={saveLaneKey}
        >
          <IconPlus />
        </button>
        <button className="icon-btn" aria-label="删除关键帧" onClick={delKey}>
          <IconTrash />
        </button>
        <button
          ref={moreRef}
          className="icon-btn"
          aria-label="时间轴操作"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen(v => !v)}
        >
          <IconDots />
        </button>

        {moreOpen && (
          <Pop anchor={moreRef.current} close={() => setMoreOpen(false)} minWidth={180}>
            <button className="menu-item" disabled={duration <= DURATION_MIN} onClick={() => shiftDuration(-1)}>
              <span className="mi-label">缩短时间轴 1 秒</span>
            </button>
            <button className="menu-item" disabled={!lightKeys.length} onClick={() => { S().clearLightKeys(); setSelLightKey(null); setMoreOpen(false) }}>
              <span className="mi-label">清空打光轨</span>
            </button>
            {lane !== 'light' && selection != null && timeline.selectedKey != null && (() => {
              const k = (S().keys[selection] ?? [])[timeline.selectedKey]
              if (!k) return null
              const setEase = (ease: Keyframe['ease']) => {
                useStudio.setState(s => ({
                  keys: { ...s.keys, [selection]: (s.keys[selection] ?? []).map((x, i) => (i === timeline.selectedKey ? { ...x, ease } : x)) },
                }))
                setMoreOpen(false)
              }
              return (
                <>
                  <div className="menu-sep" />
                  <div className="menu-note">选中帧插值({k.t.toFixed(2)}s 起)</div>
                  {([['linear', '线性'], ['in', '缓入'], ['out', '缓出'], ['inout', '缓入缓出']] as const).map(([id, label]) => (
                    <button key={id} className={'menu-item' + ((k.ease ?? 'linear') === id ? ' on' : '')} onClick={() => setEase(id)}>
                      <span className="mi-label">{label}</span>
                    </button>
                  ))}
                </>
              )
            })()}
            <div className="menu-sep" />
            {([0.5, 1, 2] as const).map(r => (
              <button
                key={r}
                className={'menu-item' + (timeline.rate === r ? ' on' : '')}
                onClick={() => { setTimeline({ rate: r }); setMoreOpen(false) }}
              >
                <span className="mi-label">播放速度 {r}×</span>
              </button>
            ))}
          </Pop>
        )}
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
    // 防御:overflow:hidden 下程序滚动仍可能发生(autoFocus 等),先归零再取锚点
    if (window.scrollY !== 0) window.scrollTo(0, 0)
    const a = anchor?.getBoundingClientRect()
    if (!a) return
    const w = ref.current?.offsetWidth ?? 200
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
    <div
      ref={ref}
      className="menu-pop"
      role="menu"
      style={{ left: pos?.left ?? 0, bottom: pos?.bottom ?? 0, minWidth, visibility: pos ? 'visible' : 'hidden' }}
    >
      {children}
    </div>
  )
}
