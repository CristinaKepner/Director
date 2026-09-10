import { useStudio } from '../store'
import { IconCamera, IconClapper, IconEnv, IconGear, IconHistory, IconLamp } from './icons'

/** 顶部:环境胶囊 + 品牌 logo + 生成历史/故事板/设置胶囊 + 提示条/放置横幅 */
export default function TopBar() {
  const hintDismissed = useStudio(s => s.hintDismissed)
  const dismissHint = useStudio(s => s.dismissHint)
  const tip = useStudio(s => s.tip)
  const setTip = useStudio(s => s.setTip)
  const toggleP = useStudio(s => s.toggleP)
  const openPanel = useStudio(s => s.openPanel)
  const placement = useStudio(s => s.placement)
  const cancelPlacement = useStudio(s => s.cancelPlacement)
  const mode = useStudio(s => s.mode)
  const setMode = useStudio(s => s.setMode)
  const setStoryboardOpen = useStudio(s => s.setStoryboardOpen)

  const camMode = mode.type === 'cam'

  return (
    <>
      <div className="top-left">
        <div className="hud-pill">
          <button
            className={`hud-btn ${openPanel === 'env' ? 'active' : ''}`}
            aria-label="环境"
            onClick={() => toggleP('env')}
          >
            <IconEnv />
            <span className="hud-label-collapse"><span>环境</span></span>
          </button>
        </div>
      </div>

      <div className="top-center">
        <span className="brand-mark" aria-hidden="true">3D 片场</span>
      </div>

      <div className="top-right">
        <div className="hud-pill">
          <button
            className={`hud-btn icon-only ${openPanel === 'genHistory' ? 'active' : ''}`}
            aria-label="生成历史"
            onClick={() => toggleP('genHistory')}
          >
            <IconHistory />
          </button>
          <button className="hud-btn icon-only" aria-label="故事板" onClick={() => setStoryboardOpen(true)}>
            <IconClapper />
          </button>
          <button
            className={`hud-btn icon-only ${openPanel === 'settings' ? 'active' : ''}`}
            aria-label="设置"
            onClick={() => toggleP('settings')}
          >
            <IconGear />
          </button>
        </div>
      </div>

      {!placement && !camMode && (
        tip ? (
          <div className="hint-bar">
            <span className="lamp"><IconLamp size={16} /></span>
            {tip}
            <button onClick={() => setTip(null)}>知道了</button>
          </div>
        ) : !hintDismissed && (
          <div className="hint-bar">
            <span className="lamp"><IconLamp size={16} /></span>
            按住 Option 时,从场景中的任意一点开始左键拖动,可以围绕该点查看
            <button onClick={dismissHint}>不再提示</button>
          </div>
        )
      )}

      {placement && (
        <div className="place-banner">
          {placement.spec.prim === 'model'
            ? '正在下载 3D 资产...'
            : `${placement.spec.name}:点击场景可以放置对象,滚轮可以调整大小`}
          <button onClick={cancelPlacement}>取消放置</button>
        </div>
      )}

      {camMode && (
        <div className="cam-banner">
          <IconCamera />
          操控摄像机
          <button onClick={() => setMode({ type: '3d' })}>退出操控</button>
        </div>
      )}
    </>
  )
}
