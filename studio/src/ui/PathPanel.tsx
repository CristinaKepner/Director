import { useStudio } from '../store'
import { PATH_PRESETS, PATH_KIND_LABEL } from '../library'
import { stageRef } from '../scene/ThreeStage'
import { IconPause, IconPlay, IconRewind } from './icons'

/* ─────────────────────────────────────────────────────────────
   运镜面板:参数工具条(速度/缓动/往返) + 运镜卡片(播放/录制)
   ───────────────────────────────────────────────────────────── */

export default function PathPanel() {
  const active = useStudio(s => s.activePath)
  const runPath = useStudio(s => s.runPath)
  const stopPath = useStudio(s => s.stopPath)
  const recording = useStudio(s => s.recording)
  const setRecording = useStudio(s => s.setRecording)
  const addShot = useStudio(s => s.addShot)
  const toast = useStudio(s => s.toast)
  const pathOpts = useStudio(s => s.pathOpts)
  const setPathOpts = useStudio(s => s.setPathOpts)

  const runWithRecord = async (id: string) => {
    if (recording) return
    const ok = stageRef.startRecord?.() ?? false
    if (!ok) { toast('录制启动失败'); runPath(id); return }
    setRecording(true)
    runPath(id)
    const p = PATH_PRESETS.find(x => x.id === id)
    const dur = (p?.duration ?? 3) * 1000 + 400
    window.setTimeout(async () => {
      const url = await (stageRef.stopRecord?.() ?? Promise.resolve(null))
      setRecording(false)
      if (url) {
        addShot({ kind: 'video', url, name: p?.name ?? '运镜', meta: `${p?.duration ?? 3}s`, path: p?.kind })
        toast(`已录制:${p?.name ?? '运镜'}`)
      } else toast('录制结束,但没拿到视频')
    }, dur)
  }

  return (
    <div className="panel-scroll" style={{ flex: 1 }}>
      <div className="panel-sec-title">运镜参数</div>
      <div className="pp-params">
        <div className="pp-field">
          <span className="pp-label">速度</span>
          <div className="seg">
            {[0.5, 1, 1.5, 2].map(v => (
              <button key={v} className={pathOpts.speed === v ? 'on' : ''} onClick={() => setPathOpts({ speed: v })}>{v}×</button>
            ))}
          </div>
        </div>
        <div className="pp-field">
          <span className="pp-label">缓动</span>
          <div className="seg">
            {([['linear', '线性'], ['in', '缓入'], ['out', '缓出'], ['inout', '平滑']] as const).map(([id, label]) => (
              <button key={id} className={pathOpts.ease === id ? 'on' : ''} onClick={() => setPathOpts({ ease: id })}>{label}</button>
            ))}
          </div>
        </div>
        <button
          className={`pp-pingpong${pathOpts.pingPong ? ' on' : ''}`}
          aria-pressed={pathOpts.pingPong}
          onClick={() => setPathOpts({ pingPong: !pathOpts.pingPong })}
        >
          <span className="pp-pp-arrow">⇄</span> 往返
        </button>
      </div>

      <div className="panel-sec-title">预制运镜</div>
      {PATH_PRESETS.map(p => {
        const isActive = active?.id === p.id
        return (
          <div key={p.id} className={`path-card${isActive ? ' on' : ''}`}>
            <button className="pc-main" aria-label={`运行 ${p.name}`} onClick={() => runPath(p.id)}>
              <span className="pc-play">{isActive ? <IconPause /> : <IconPlay />}</span>
              <span className="pc-txt">
                <span className="pc-title">{p.name}</span>
                <span className="pc-sub">{PATH_KIND_LABEL[p.kind]} · {p.duration}s</span>
              </span>
            </button>
            <button
              className="pc-rec"
              aria-label={`录制 ${p.name}`}
              disabled={recording}
              onClick={() => void runWithRecord(p.id)}
            >
              <i className={'rec-dot' + (recording ? ' live' : '')} />
            </button>
          </div>
        )
      })}

      {active && (
        <button className="btn-ghost" style={{ width: '100%', marginTop: 10 }} onClick={stopPath}>
          <IconRewind /> 停止运镜
        </button>
      )}
    </div>
  )
}
