import { useEffect, useState } from 'react'
import { useStudio, useEntities } from '../store'
import ThreeStage from '../scene/ThreeStage'
import TopBar from './TopBar'
import FocalRuler from './FocalRuler'
import BottomLeft from './BottomLeft'
import MainBar from './MainBar'
import SidePanels from './Panels'
import ShortcutsDialog from './ShortcutsDialog'
import Timeline from './Timeline'
import Viewfinder from './Viewfinder'
import AgentPanel, { AgentFab } from './AgentPanel'
import ContextBar from './ContextBar'
import PathCard from './PathCard'
import Storyboard from './Storyboard'
import { LibraryDialog } from './LibraryPanel'

/* ─────────────────────────────────────────────────────────────
   导演台外壳:舞台保持视觉重心,Agent 侧栏可收起
   ───────────────────────────────────────────────────────────── */

export default function Studio() {
  const toasts = useStudio(s => s.toasts)

  return (
    <div className="shell">
      <div className="stage-wrap">
        <ThreeStage />
        <TopBar />
        <FocalRuler />
        <BottomLeft />
        <MainBar />
        <ContextBar />
        <PathCard />
        <Timeline />
        <Viewfinder />
        <SidePanels />
        <ShortcutsDialog />
        <LibraryDialog />
        <AgentFab />
        <FpsChip />
        <PiPFrame />
        <div className="toasts">
          {toasts.map(t => <div key={t.id} className="toast">{t.text}</div>)}
        </div>
      </div>
      <AgentPanel />
      <Storyboard />
    </div>
  )
}

/** 机位模式画中画监看窗:显示下一台机位预览,点击切台 */
function PiPFrame() {
  const mode = useStudio(s => s.mode)
  const controlId = useStudio(s => s.controlId)
  const setMode = useStudio(s => s.setMode)
  const pipLarge = useStudio(s => s.pipLarge)
  const togglePipLarge = useStudio(s => s.togglePipLarge)
  const entities = useEntities()
  const cams = entities.filter(e => e.kind === 'camera')
  let next: typeof cams[number] | undefined
  if (cams.length >= 2 && mode.type === 'cam') {
    const idx = cams.findIndex(c => c.id === mode.id)
    next = cams[(idx + 1) % cams.length]
  }
  if (mode.type !== 'cam' && !controlId) return null
  return (
    <div
      className={`pip-frame${pipLarge ? ' pip-large' : ''}${next ? ' clickable' : ''}`}
      role={next ? 'button' : undefined}
      aria-label={next ? `切换到 ${next.name}` : undefined}
      title={next ? '单击切台,双击切换大小' : '双击切换大小'}
      onClick={next ? () => setMode({ type: 'cam', id: next.id }) : undefined}
      onDoubleClick={ev => { ev.stopPropagation(); togglePipLarge() }}
    >
      <span className="pip-label">{next ? `下一台 · ${next.name}` : '监看 · 自由视角'}</span>
    </div>
  )
}

/** 性能面板:右上角 FPS 读数(设置里开关) */
function FpsChip() {
  const show = useStudio(s => s.showFps)
  const [fps, setFps] = useState(0)
  useEffect(() => {
    if (!show) return
    const t = window.setInterval(() => setFps(window.__studio_debug?.fps ?? 0), 400)
    return () => window.clearInterval(t)
  }, [show])
  if (!show) return null
  return <div className="fps-chip" aria-label={`FPS ${fps}`}>FPS {fps}</div>
}
