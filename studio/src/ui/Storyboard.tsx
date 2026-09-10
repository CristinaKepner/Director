import { useState } from 'react'
import { useStudio } from '../store'
import { IconBack, IconClapper, IconPlay, IconTrash, IconUpload, IconX } from './icons'
import { PATH_KIND_LABEL } from '../library'
import { Shot } from '../types'
import { stageRef } from '../scene/ThreeStage'

/* ─────────────────────────────────────────────────────────────
   故事板:分镜板
   - 取景器拍摄的照片 / 运镜录制的视频
   - 「按镜头轨生成分镜」:逐段以对应机位出画取帧,带镜号/时间码/机位/焦段
   - 卡片可跳回时间轴对应时刻、可写说明、可导出分镜表(Markdown)
   ───────────────────────────────────────────────────────────── */

const tc = (t: number) => `${t.toFixed(1)}s`

export default function Storyboard() {
  const open = useStudio(s => s.storyboardOpen)
  const setOpen = useStudio(s => s.setStoryboardOpen)
  const shots = useStudio(s => s.shots)
  const removeShot = useStudio(s => s.removeShot)
  const setShotNote = useStudio(s => s.setShotNote)
  const setTimeline = useStudio(s => s.setTimeline)
  const [noteFor, setNoteFor] = useState<string | null>(null)
  const S = useStudio.getState
  if (!open) return null

  // 分镜卡(有镜号的)按时间排;拍摄卡保持最新在前
  const framed = shots.filter(s => s.index != null).sort((a, b) => (a.t0 ?? 0) - (b.t0 ?? 0))
  const loose = shots.filter(s => s.index == null)
  const ordered: Shot[] = [...framed, ...loose]

  const download = (url: string, name: string, kind: 'image' | 'video') => {
    const a = document.createElement('a')
    a.href = url
    a.download = `${name}.${kind === 'image' ? 'png' : 'webm'}`
    a.click()
  }

  /** 按镜头轨逐段生成分镜卡:该镜中段时刻 + 对应机位出画 */
  const buildFromCuts = () => {
    const st = S()
    const cuts = [...st.cuts].sort((a, b) => a.t0 - b.t0)
    if (!cuts.length) { st.toast('时间轴「镜头」轨还是空的,先排出分镜'); return }
    if (!stageRef.captureAt) { st.toast('舞台未就绪,稍后再试'); return }
    let n = 0
    for (const [i, c] of cuts.entries()) {
      const cam = st.getEntity(c.camId)
      const t = c.t0 + (c.t1 - c.t0) * 0.5
      const url = stageRef.captureAt(t, c.camId)
      if (!url) continue
      const focal = st.sampleEntityAt(c.camId, t)?.focalMm ?? cam?.focalMm ?? 0
      st.addShot({
        kind: 'image', url,
        name: `S${i + 1} ${cam?.name ?? ''}`.trim(),
        meta: `${tc(c.t0)}–${tc(c.t1)} · ${focal}mm`,
        focalMm: focal,
        index: i + 1,
        camName: cam?.name,
        t0: +c.t0.toFixed(2),
        dur: +(c.t1 - c.t0).toFixed(2),
      })
      n++
    }
    st.toast(n ? `已生成 ${n} 张分镜` : '取帧失败:检查机位是否存在')
  }

  const jumpTo = (s: Shot) => {
    if (s.t0 == null) return
    setOpen(false)
    setTimeline({ open: true, playing: false, time: s.t0 + 0.02 })
  }

  const exportMd = () => {
    const rows = framed.length ? framed : shots
    const head = '# 分镜表\n\n| 镜号 | 时间 | 机位 | 焦段 | 说明 |\n|---|---|---|---|---|'
    const body = rows.map(s => {
      const t0 = s.t0 ?? 0, t1 = t0 + (s.dur ?? 0)
      const time = s.t0 != null ? `${t0.toFixed(1)}–${t1.toFixed(1)}s` : (s.meta ?? '')
      return `| ${s.index ?? '-'} | ${time} | ${s.camName ?? '-'} | ${s.focalMm ? s.focalMm + 'mm' : '-'} | ${s.note ?? ''} |`
    }).join('\n')
    const blob = new Blob([`${head}\n${body}\n`], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '分镜表.md'
    a.click()
    URL.revokeObjectURL(url)
    S().toast('已导出分镜表.md')
  }

  return (
    <div className="storyboard">
      <div className="sb-head">
        <button className="hud-btn" aria-label="返回导演台" onClick={() => setOpen(false)}>
          <IconBack />
          <span>返回导演台</span>
        </button>
        <h2>故事板</h2>
        <span className="sb-count" title="故事板图片体积大,不随工程自动保存;需要留存请用「导出分镜表」或逐张下载">
          {shots.length} 个镜头{framed.length ? ` · ${framed.length} 格分镜` : ''}
        </span>
        <span className="spacer" />
        <button className="hud-btn" aria-label="按镜头轨生成分镜" title="按时间轴「镜头」轨逐段取帧,生成带镜号的分镜卡" onClick={buildFromCuts}>
          <IconClapper />
          <span>按镜头轨生成</span>
        </button>
        {shots.length > 0 && (
          <>
            <button className="hud-btn" aria-label="导出分镜表" onClick={exportMd}>
              <IconUpload />
              <span>导出分镜表</span>
            </button>
            <button className="hud-btn" aria-label="清空故事板" onClick={() => shots.forEach(s => removeShot(s.id))}>
              <IconTrash />
              <span>清空</span>
            </button>
          </>
        )}
      </div>

      <div className="sb-body">
        {shots.length === 0 ? (
          <div className="sb-empty">
            还没有镜头。<br />
            点上方「<b>按镜头轨生成</b>」把时间轴上的分镜一次抓成故事板;也可以在取景器里按快门拍一张,或按住 Shift 点快门录一段运镜。
          </div>
        ) : (
          <div className="sb-grid">
            {ordered.map(s => (
              <div key={s.id} className={`sb-card${s.index != null ? ' framed' : ''}`}>
                <div className="sb-thumb">
                  {s.kind === 'image'
                    ? <img src={s.url} alt={s.name} onClick={() => jumpTo(s)} title={s.t0 != null ? `跳回导演台 ${tc(s.t0)}` : undefined} />
                    : <video src={s.url} controls preload="metadata" />}
                  {s.index != null && <span className="sb-index">S{s.index}</span>}
                  <span className={'sb-badge' + (s.kind === 'video' ? ' video' : '')}>
                    {s.kind === 'image' ? (s.camName ?? '照片') : s.path ? `运镜 · ${PATH_KIND_LABEL[s.path] ?? s.path}` : '运镜'}
                  </span>
                </div>
                <div className="sb-meta">
                  <span className="m-name" title={s.name}>
                    {s.t0 != null
                      ? <button className="sb-time" onClick={() => jumpTo(s)} title="跳回导演台该时刻">{tc(s.t0)}{s.dur ? `–${tc(s.t0 + s.dur)}` : ''}</button>
                      : s.name}
                  </span>
                  <span className="m-time">{s.meta ?? ''}</span>
                  {s.kind === 'video' && s.path && (
                    <button
                      aria-label={`重放运镜 ${s.name}`}
                      title={`重放:${PATH_KIND_LABEL[s.path] ?? s.path}`}
                      onClick={() => { setOpen(false); S().runPath(s.path!) }}
                    >
                      <IconPlay />
                    </button>
                  )}
                  <button aria-label={`下载 ${s.name}`} onClick={() => download(s.url, s.name, s.kind)}><IconUpload /></button>
                  <button aria-label={`删除 ${s.name}`} onClick={() => removeShot(s.id)}><IconX /></button>
                </div>
                <div className="sb-note">
                  {noteFor === s.id
                    ? (
                      <input
                        autoFocus
                        defaultValue={s.note ?? ''}
                        placeholder="这一镜要什么(动作/情绪/光)"
                        aria-label={`${s.name} 的分镜说明`}
                        onBlur={ev => { setShotNote(s.id, ev.currentTarget.value.trim()); setNoteFor(null) }}
                        onKeyDown={ev => {
                          if (ev.key === 'Enter') { setShotNote(s.id, ev.currentTarget.value.trim()); setNoteFor(null) }
                          if (ev.key === 'Escape') setNoteFor(null)
                        }}
                      />
                    )
                    : (
                      <button className="sb-note-btn" onClick={() => setNoteFor(s.id)}>
                        {s.note ? s.note : '＋ 写说明'}
                      </button>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
