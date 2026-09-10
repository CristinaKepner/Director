import { useRef } from 'react'
import type { ChangeEvent, KeyboardEvent as RKeyboardEvent, PointerEvent as RPointerEvent, ReactNode } from 'react'
import { useStudio, useEntities } from '../store'
import { HDRI_PRESETS, MODEL_LIBRARY } from '../library'
import { exportSceneJSON, exportShotsJSON } from '../export'
import { IconBack, IconCamera, IconCheck, IconPlus, IconRefresh } from './icons'

/* ── 小组件 ─────────────────────────────────────────────────── */

/** 给无尺寸约束场景下的图标一个确定的盒子(styles.css 只覆盖部分上下文) */
function Ico({ children, size = 16 }: { children: ReactNode; size?: number }) {
  return <span style={{ display: 'inline-flex', width: size, height: size, flex: 'none' }}>{children}</span>
}

const ChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5l7 7-7 7" />
  </svg>
)

/** 可点选的面板行(支持键盘) */
function Row({ label, active, onSelect, right }: {
  label: string
  active?: boolean
  onSelect: () => void
  right?: ReactNode
}) {
  return (
    <div
      className={`panel-row${active ? ' on' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={active}
      onClick={onSelect}
      onKeyDown={e => {
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() }
      }}
    >
      <span className="pr-label">{label}</span>
      {right != null && <span className="pr-act">{right}</span>}
    </div>
  )
}

/** 可横向拖拽的数字胶囊 */
function NumPill({ value, min, max, step, unit, label, decimals = 1, trim = false, onChange }: {
  value: number
  min: number
  max: number
  step: number
  unit?: string
  label: string
  decimals?: number
  trim?: boolean
  onChange: (v: number) => void
}) {
  const drag = useRef<{ x: number; v: number } | null>(null)
  const commit = (n: number) => onChange(Number(Math.min(max, Math.max(min, n)).toFixed(4)))
  const text = trim ? String(Number(value.toFixed(decimals))) : value.toFixed(decimals)

  const down = (e: RPointerEvent<HTMLSpanElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, v: value }
  }
  const move = (e: RPointerEvent<HTMLSpanElement>) => {
    const d = drag.current
    if (!d) return
    commit(d.v + (e.clientX - d.x) * step)
  }
  const up = (e: RPointerEvent<HTMLSpanElement>) => {
    if (!drag.current) return
    drag.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }
  const key = (e: RKeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); commit(value - step * 10) }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); commit(value + step * 10) }
  }

  return (
    <div className="num-pill">
      <span
        className="np-val"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Number(value.toFixed(2))}
        aria-valuetext={`${text}${unit ?? ''}`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => { drag.current = null }}
        onKeyDown={key}
      >
        {text}
      </span>
      {unit && <span className="np-unit">{unit}</span>}
    </div>
  )
}

/* ── 面板入口 ───────────────────────────────────────────────── */

export default function SidePanels() {
  const open = useStudio(s => s.openPanel)
  const envRes = useStudio(s => s.envRes)
  if (open === 'env') return <><EnvPanel /><EnvResPanel v={envRes} /></>
  if (open === 'settings') return <SettingsMenu />
  if (open === 'genHistory') return <GenHistoryPanel />
  if (open === 'shots') return <ShotManager />
  return null
}

/* ── 环境面板(左侧) ────────────────────────────────────────── */

function EnvPanel() {
  const env = useStudio(s => s.env)
  const envRes = useStudio(s => s.envRes)
  const setEnv = useStudio(s => s.setEnv)
  const setEnvRes = useStudio(s => s.setEnvRes)
  const toast = useStudio(s => s.toast)

  return (
    <aside className="panel" id="workspace-environment-panel" role="dialog" aria-label="环境" style={{ width: 302 }}>
      <div className="panel-scroll" style={{ flex: 1 }}>
        <div className="panel-sec-title">场地</div>
        <Row label="空白场地" active={env.stage === 'blank'} onSelect={() => setEnv({ stage: 'blank' })} />
        <Row
          label="房间"
          active={env.stage === 'room' || envRes === 'room'}
          onSelect={() => setEnv({ stage: 'room' })}
          right={<>
            <button
              aria-label="房间设置"
              onClick={e => { e.stopPropagation(); setEnvRes('room') }}
              style={{ height: 24, padding: '0 8px', borderRadius: 6, background: 'rgba(255, 255, 255, 0.1)', fontSize: 12, color: 'inherit', flex: 'none' }}
            >
              设置
            </button>
            <ChevronRight />
          </>}
        />
        <Row
          label="3D 场景"
          active={env.stage === 'scene3d' || envRes === 'scene3d'}
          onSelect={() => { setEnv({ stage: 'scene3d' }); setEnvRes('scene3d') }}
          right={<ChevronRight />}
        />

        <div className="panel-sec-title">地面</div>
        <div className="panel-field">
          <span className="pf-label">高度</span>
          <NumPill value={env.groundH} min={-5} max={5} step={0.01} unit="m" label="地面高度" onChange={v => setEnv({ groundH: v })} />
        </div>

        <div className="panel-sec-title">光照</div>
        <Row label="柔光影棚" active={envRes === 'light'} onSelect={() => setEnvRes('light')} right={<ChevronRight />} />
        <div className="panel-field">
          <span className="pf-label">方向</span>
          <input
            className="slider"
            type="range"
            min={0}
            max={360}
            step={1}
            value={env.lightDir}
            aria-label="光照方向"
            onChange={e => setEnv({ lightDir: Number(e.target.value) })}
            style={{ maxWidth: 132 }}
          />
          <span style={{ width: 36, textAlign: 'right', fontSize: 13, color: 'var(--t58)', fontVariantNumeric: 'tabular-nums' }}>{env.lightDir}°</span>
        </div>

        <div className="panel-sec-title">背景</div>
        <Row label="无背景" active={env.bg === 'none'} onSelect={() => setEnv({ bg: 'none' })} />
        <Row label="与光照一致" active={env.bg === 'same'} onSelect={() => setEnv({ bg: 'same' })} />
        <Row
          label="全景图"
          active={env.bg === 'pano' || envRes === 'pano'}
          onSelect={() => { setEnv({ bg: 'pano' }); setEnvRes('pano') }}
          right={<ChevronRight />}
        />
      </div>
      <div className="panel-actions">
        <button
          className="btn-ghost"
          aria-label="编辑全景图"
          onClick={() => setEnvRes('pano')}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <Ico><IconCamera /></Ico>编辑全景图
        </button>
      </div>
    </aside>
  )
}

/* ── 环境二级资源面板(环境面板右侧 x≈326) ─────────────────── */

type EnvRes = ReturnType<typeof useStudio.getState>['envRes']

const ROOM_PATTERNS: { id: 'plain' | 'standard' | 'calibration'; label: string }[] = [
  { id: 'plain', label: '全白' },
  { id: 'standard', label: '标准' },
  { id: 'calibration', label: '校准' },
]
const ROOM_SPACINGS = [0.25, 0.5, 1, 2]

function EnvResPanel({ v }: { v: EnvRes }) {
  if (v === 'room') return <RoomRes />
  if (v === 'scene3d') return <Scene3dRes />
  if (v === 'light') return <LightRes />
  if (v === 'pano') return <PanoRes />
  return null
}

/** 二级面板外壳(标题 + 可滚动内容 + 可选底栏) */
function ResShell({ title, footer, children }: { title: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <aside
      id="workspace-environment-resource-panel"
      className="panel"
      role="dialog"
      aria-label={title}
      style={{ left: 326, width: 280 }}
    >
      <div className="panel-scroll" style={{ flex: 1 }}>
        <div className="panel-sec-title">{title}</div>
        {children}
      </div>
      {footer}
    </aside>
  )
}

/** 小标题 + 分段选择 */
function SegField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ padding: '2px 10px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 13, color: 'var(--t48)' }}>{label}</span>
      <div className="seg">{children}</div>
    </div>
  )
}

function RoomRes() {
  const room = useStudio(s => s.env.room)
  const setEnv = useStudio(s => s.setEnv)
  const set = (p: Partial<typeof room>) => setEnv({ room: { ...room, ...p } })

  return (
    <ResShell title="房间设置">
      <div className="panel-field">
        <span className="pf-label">宽度</span>
        <NumPill value={room.w} min={1} max={30} step={0.01} unit="m" label="宽度" trim onChange={v => set({ w: v })} />
      </div>
      <div className="panel-field">
        <span className="pf-label">深度</span>
        <NumPill value={room.d} min={1} max={50} step={0.01} unit="m" label="深度" trim onChange={v => set({ d: v })} />
      </div>
      <div className="panel-field">
        <span className="pf-label">高度</span>
        <NumPill value={room.h} min={1} max={10} step={0.01} unit="m" label="高度" trim onChange={v => set({ h: v })} />
      </div>

      <div className="panel-sec-title">参考图案</div>
      <SegField label="样式">
        {ROOM_PATTERNS.map(p => (
          <button
            key={p.id}
            className={room.pattern === p.id ? 'on' : ''}
            aria-label={p.label}
            aria-pressed={room.pattern === p.id}
            onClick={() => set({ pattern: p.id })}
          >
            {p.label}
          </button>
        ))}
      </SegField>
      {room.pattern !== 'plain' && (
        <SegField label="线标注">
          {ROOM_SPACINGS.map(s => (
            <button
              key={s}
              className={room.spacing === s ? 'on' : ''}
              aria-label={`线标注间距 ${s}m`}
              aria-pressed={room.spacing === s}
              onClick={() => set({ spacing: s })}
            >
              {s}m
            </button>
          ))}
        </SegField>
      )}
    </ResShell>
  )
}

function Scene3dRes() {
  const stage = useStudio(s => s.env.stage)
  const setEnv = useStudio(s => s.setEnv)

  return (
    <ResShell title="选择已生成的 3D 场景">
      <Row label="原始场景" active={stage === 'scene3d'} onSelect={() => setEnv({ stage: 'scene3d' })} />
      <div className="panel-empty">暂无生成场景</div>
    </ResShell>
  )
}

function LightRes() {
  const hdri = useStudio(s => s.env.hdri)
  const setEnv = useStudio(s => s.setEnv)
  const toast = useStudio(s => s.toast)
  const fileRef = useRef<HTMLInputElement>(null)

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const url = URL.createObjectURL(f)
    // HDR/EXR 无法被浏览器解码,解析失败也保留选择
    const probe = new Image()
    probe.onload = probe.onerror = () => URL.revokeObjectURL(url)
    probe.src = url
    setEnv({ hdri: 'custom' })
    toast(`已应用 HDRI:${f.name}`)
  }

  return (
    <ResShell
      title="选择光照"
      footer={
        <div className="panel-actions">
          <button
            className="btn-ghost"
            aria-label="上传 HDRI"
            onClick={() => fileRef.current?.click()}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <Ico><IconPlus /></Ico>上传 HDRI
          </button>
        </div>
      }
    >
      <div className="panel-sec-title">HDRI 预设</div>
      {HDRI_PRESETS.map(h => (
        <Row
          key={h.id}
          label={h.name}
          active={hdri === h.id}
          onSelect={() => setEnv({ hdri: h.id })}
          right={
            <i style={{
              width: 18, height: 18, borderRadius: 5, flex: 'none', display: 'inline-block',
              background: `linear-gradient(180deg, ${h.sky[0]}, ${h.sky[1]} 55%, ${h.sky[2]})`,
            }} />
          }
        />
      ))}
      {hdri === 'custom' && (
        <div className="panel-row on" aria-label="自定义 HDRI">
          <span className="pr-label">自定义 HDRI</span>
          <span className="pr-act">已应用</span>
        </div>
      )}
      <input ref={fileRef} type="file" accept=".hdr,.exr" aria-label="选择 HDRI 文件" style={{ display: 'none' }} onChange={onFile} />
    </ResShell>
  )
}

function PanoRes() {
  const pano = useStudio(s => s.env.pano)
  const setEnv = useStudio(s => s.setEnv)
  const toast = useStudio(s => s.toast)
  const fileRef = useRef<HTMLInputElement>(null)

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (pano?.startsWith('blob:')) URL.revokeObjectURL(pano)
    setEnv({ pano: URL.createObjectURL(f), bg: 'pano' })
    toast('已应用全景图')
  }

  return (
    <ResShell
      title="选择全景图"
      footer={
        <div className="panel-actions">
          <button
            className="btn-ghost"
            aria-label="上传全景图"
            onClick={() => fileRef.current?.click()}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <Ico><IconPlus /></Ico>上传全景图
          </button>
        </div>
      }
    >
      {pano
        ? (
          <div className="panel-row on" aria-label="自定义全景图">
            <span className="pr-label">自定义全景图</span>
            <span className="pr-act">已应用</span>
          </div>
        )
        : <div className="panel-empty">还没有可作为全景图使用的 2:1 图片,可上传或先拍快门。</div>}
      <input ref={fileRef} type="file" accept="image/*" aria-label="选择全景图文件" style={{ display: 'none' }} onChange={onFile} />
    </ResShell>
  )
}

/* ── 设置菜单(右侧浮层) ────────────────────────────────────── */

const RESET_BTN: React.CSSProperties = {
  width: 24, height: 24, borderRadius: 9999, flex: 'none',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t48)',
}

function SettingsMenu() {
  const page = useStudio(s => s.settingsPage)
  const resolution = useStudio(s => s.resolution)
  const moveSpeed = useStudio(s => s.moveSpeed)
  const showTips = useStudio(s => s.showTips)
  const invertY = useStudio(s => s.invertY)
  const wheelZoom = useStudio(s => s.wheelZoom)
  const setSettingsPage = useStudio(s => s.setSettingsPage)
  const setResolution = useStudio(s => s.setResolution)
  const setMoveSpeed = useStudio(s => s.setMoveSpeed)
  const setShowTips = useStudio(s => s.setShowTips)
  const setInvertY = useStudio(s => s.setInvertY)
  const setWheelZoom = useStudio(s => s.setWheelZoom)
  const setShortcuts = useStudio(s => s.setShortcuts)
  const toast = useStudio(s => s.toast)
  const grade = useStudio(s => s.grade)
  const setGrade = useStudio(s => s.setGrade)
  const showFps = useStudio(s => s.showFps)
  const setShowFps = useStudio(s => s.setShowFps)
  const showFrustums = useStudio(s => s.showFrustums)
  const setShowFrustums = useStudio(s => s.setShowFrustums)

  return (
    <div className="menu-pop" role="dialog" aria-label="设置" style={{ width: 288, top: 66, right: 24, left: 'auto' }}>
      {page === 'root' && (<>
        <button className="menu-item" aria-label="导出" onClick={() => exportSceneJSON()}>
          <span className="mi-label">导出</span>
          <span className="mi-arrow"><ChevronRight /></span>
        </button>
        <button className="menu-item" aria-label="渲染分辨率" onClick={() => setSettingsPage('resolution')}>
          <span className="mi-label">渲染分辨率</span>
          <span className="mi-sub">{resolution}</span>
          <span className="mi-arrow"><ChevronRight /></span>
        </button>

        <div className="menu-item" style={{ cursor: 'default' }}>
          <span className="mi-label" style={{ flex: 'none' }}>移动速度</span>
          <input
            className="slider"
            type="range"
            min={0.05}
            max={1}
            step={0.01}
            value={moveSpeed}
            aria-label="移动速度"
            onChange={e => setMoveSpeed(Number(e.target.value))}
          />
          <output style={{ width: 44, textAlign: 'right', fontSize: 13, color: 'var(--t58)', fontVariantNumeric: 'tabular-nums' }}>{`${moveSpeed.toFixed(2)}×`}</output>
          <button aria-label="重置移动速度" style={RESET_BTN} onClick={() => setMoveSpeed(0.28)}>
            <Ico size={14}><IconRefresh /></Ico>
          </button>
        </div>

        <button className="menu-item" aria-label="鼠标与触控板" onClick={() => setSettingsPage('mouse')}>
          <span className="mi-label">鼠标与触控板</span>
          <span className="mi-arrow"><ChevronRight /></span>
        </button>

        <div className="menu-item" style={{ cursor: 'default' }}>
          <span className="mi-label">显示技巧提示</span>
          <button
            role="switch"
            aria-checked={showTips}
            aria-label="显示技巧提示"
            className={`toggle${showTips ? ' on' : ''}`}
            onClick={() => setShowTips(!showTips)}
          />
        </div>

        <div className="menu-item" style={{ cursor: 'default' }}>
          <span className="mi-label">性能面板</span>
          <button
            role="switch"
            aria-checked={showFps}
            aria-label="性能面板"
            className={`toggle${showFps ? ' on' : ''}`}
            onClick={() => setShowFps(!showFps)}
          />
        </div>

        <div className="menu-item" style={{ cursor: 'default' }}>
          <span className="mi-label">显示机位视锥</span>
          <button
            role="switch"
            aria-checked={showFrustums}
            aria-label="显示机位视锥"
            className={`toggle${showFrustums ? ' on' : ''}`}
            onClick={() => setShowFrustums(!showFrustums)}
          />
        </div>

        <div className="menu-item" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
          <span className="mi-label">色调映射</span>
          <div className="seg">
            {([['none', '关闭'], ['aces', 'ACES'], ['filmic', 'Filmic'], ['reinhard', 'Reinhard']] as const).map(([id, label]) => (
              <button key={id} className={grade.tone === id ? 'on' : ''} onClick={() => setGrade({ tone: id })}>{label}</button>
            ))}
          </div>
        </div>

        <div className="menu-item" style={{ cursor: 'default' }}>
          <span className="mi-label" style={{ flex: 'none' }}>曝光补偿</span>
          <input
            className="slider"
            type="range"
            min={0.2}
            max={2.5}
            step={0.05}
            value={grade.exposure}
            aria-label="曝光补偿"
            onChange={e => setGrade({ exposure: Number(e.target.value) })}
          />
          <output style={{ width: 44, textAlign: 'right', fontSize: 13, color: 'var(--t58)', fontVariantNumeric: 'tabular-nums' }}>{`${grade.exposure.toFixed(2)}×`}</output>
          <button aria-label="重置曝光" style={RESET_BTN} onClick={() => setGrade({ exposure: 1 })}>
            <Ico size={14}><IconRefresh /></Ico>
          </button>
        </div>

        <div className="menu-sep" />
        <button
          className="menu-item"
          aria-label="重置工程"
          onClick={() => { localStorage.removeItem('tap-replica.project'); location.reload() }}
        >
          <span className="mi-label">重置工程(清空自动保存)</span>
        </button>
        <div className="menu-sep" />
        <button className="menu-item" aria-label="帮助" onClick={() => setShortcuts(true)}>
          <span className="mi-label">帮助</span>
          <span className="mi-arrow"><ChevronRight /></span>
        </button>
      </>)}

      {page === 'resolution' && (<>
        <button className="panel-row" aria-label="返回设置" onClick={() => setSettingsPage('root')}>
          <Ico><IconBack /></Ico>
          <span className="pr-label">渲染分辨率</span>
        </button>
        <div className="panel-sep" />
        {['1K', '2K', '4K'].map(r => (
          <button
            key={r}
            className={`panel-row${resolution === r ? ' on' : ''}`}
            aria-label={`渲染分辨率 ${r}`}
            aria-pressed={resolution === r}
            onClick={() => { setResolution(r); setSettingsPage('root') }}
          >
            <span className="pr-label">{r}</span>
            {resolution === r && <span className="pr-act"><IconCheck /></span>}
          </button>
        ))}
      </>)}

      {page === 'mouse' && (<>
        <button className="panel-row" aria-label="返回设置" onClick={() => setSettingsPage('root')}>
          <Ico><IconBack /></Ico>
          <span className="pr-label">鼠标与触控板</span>
        </button>
        <div className="panel-sep" />
        <div className="panel-row" style={{ cursor: 'default' }}>
          <span className="pr-label">反转 Y 轴</span>
          <button
            role="switch"
            aria-checked={invertY}
            aria-label="反转 Y 轴"
            className={`toggle${invertY ? ' on' : ''}`}
            onClick={() => setInvertY(!invertY)}
          />
        </div>
        <div className="panel-row" style={{ cursor: 'default' }}>
          <span className="pr-label">滚轮缩放</span>
          <button
            role="switch"
            aria-checked={wheelZoom}
            aria-label="滚轮缩放"
            className={`toggle${wheelZoom ? ' on' : ''}`}
            onClick={() => setWheelZoom(!wheelZoom)}
          />
        </div>
      </>)}
    </div>
  )
}

/* ── 生成历史(右侧) ────────────────────────────────────────── */

function GenHistoryPanel() {
  const assets = useStudio(s => s.genAssets)

  return (
    <aside className="panel right" role="dialog" aria-label="生成历史" style={{ width: 320 }}>
      <div className="panel-scroll" style={{ flex: 1 }}>
        <div className="panel-sec-title">生成历史</div>
        {assets.length === 0
          ? <div className="panel-empty">还没有 3D 资产。</div>
          : assets.map(a => {
            const cat = MODEL_LIBRARY.find(m => m.prim === a.prim)?.category ?? '资产'
            return (
              <div className="panel-row" key={a.id} aria-label={`${a.name} ${cat}`}>
                <span className="pr-label">{a.name}</span>
                <span className="pr-act">
                  <i style={{ width: 12, height: 12, borderRadius: '50%', background: a.color, display: 'inline-block', flex: 'none' }} />
                  {cat}
                </span>
              </div>
            )
          })}
      </div>
    </aside>
  )
}

/* ── 镜头管理(右侧) ────────────────────────────────────────── */

function ShotManager() {
  const states = useStudio(s => s.states)
  const activeStateId = useStudio(s => s.activeStateId)
  const mode = useStudio(s => s.mode)
  const setMode = useStudio(s => s.setMode)
  const openP = useStudio(s => s.openP)
  const toast = useStudio(s => s.toast)
  const entities = useEntities()
  const cameras = entities.filter(e => e.kind === 'camera')
  const showFrustums = useStudio(s => s.showFrustums)
  const setShowFrustums = useStudio(s => s.setShowFrustums)

  const stateName = activeStateId === 'baseline'
    ? '场景基准'
    : states.find(x => x.id === activeStateId)?.name ?? '场景基准'

  return (
    <aside className="panel right" role="dialog" aria-label="镜头管理" style={{ width: 320 }}>
      <div className="panel-scroll" style={{ flex: 1 }}>
        <div className="panel-field">
          <span className="pf-label">当前状态</span>
          <span style={{ color: 'var(--t48)', fontSize: 13 }}>{stateName}</span>
        </div>
        <div className="panel-field" style={{ justifyContent: 'space-between' }}>
          <span className="pf-label">机位视锥线</span>
          <button
            role="switch"
            aria-checked={showFrustums}
            aria-label="显示机位视锥线"
            className={`toggle${showFrustums ? ' on' : ''}`}
            onClick={() => setShowFrustums(!showFrustums)}
          />
        </div>
        <div className="panel-sec-title">摄像机</div>
        {cameras.length === 0
          ? <div className="panel-empty">场景中没有摄像机</div>
          : cameras.map(c => (
            <button
              key={c.id}
              className={`panel-row${mode.type === 'cam' && mode.id === c.id ? ' on' : ''}`}
              aria-label={`${c.name} ${c.focalMm ?? 24} mm`}
              aria-pressed={mode.type === 'cam' && mode.id === c.id}
              onClick={() => setMode({ type: 'cam', id: c.id })}
            >
              <span className="pr-label">{c.name}</span>
              <span className="pr-act">{`${c.focalMm ?? 24} mm`}</span>
            </button>
          ))}
      </div>
      <div className="panel-actions">
        <button className="btn-ghost" aria-label="取消" onClick={() => openP(null)}>取消</button>
        <button className="btn-accent" aria-label="导出到故事板" onClick={() => exportShotsJSON()}>导出到故事板</button>
      </div>
    </aside>
  )
}
