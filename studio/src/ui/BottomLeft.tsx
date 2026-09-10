import { useStudio } from '../store'
import { IconCrosshair, IconKeyboard, IconRedo, IconUndo } from './icons'

/** 左下:操作方式 / 恢复初始视角 / 撤销 / 重做 */
export default function BottomLeft() {
  const pastLen = useStudio(s => s.past.length)
  const futureLen = useStudio(s => s.future.length)
  const setShortcuts = useStudio(s => s.setShortcuts)
  const resetView = useStudio(s => s.resetView)
  const undo = useStudio(s => s.undo)
  const redo = useStudio(s => s.redo)

  return (
    <div className="bottom-left">
      <div className="hud-pill">
        <button className="hud-btn" aria-label="操作方式" onClick={() => setShortcuts(true)}>
          <IconKeyboard />
        </button>
        <button className="hud-btn" aria-label="恢复初始视角" onClick={resetView}>
          <IconCrosshair />
        </button>
        <span className="hud-divider" />
        <button className="hud-btn icon-only" aria-label="撤销" disabled={pastLen === 0} onClick={undo}>
          <IconUndo />
        </button>
        <button className="hud-btn icon-only" aria-label="重做" disabled={futureLen === 0} onClick={redo}>
          <IconRedo />
        </button>
      </div>
    </div>
  )
}
