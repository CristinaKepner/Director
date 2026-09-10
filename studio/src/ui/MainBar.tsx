import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useStudio, useEntities } from '../store'
import { FOCALS, PlacementSpec, Prim } from '../types'
import { MODEL_LIBRARY } from '../library'
import {
  IconArrowDown, IconArrowUp, IconBox, IconCaret, IconCamera, IconClapper, IconCube, IconDots, IconEdit, IconGround,
  IconHistory, IconMousePointer, IconPerson, IconPlus, IconTimeline, IconTrash, IconCopy, IconUpload, IconX,
} from './icons'
import PropertyBar from './PropertyBar'

/* ─────────────────────────────────────────────────────────────
   底部主操作条:4 个胶囊组(取景器 / 状态·模式·对象·放置 / 镜头管理 / 时间轴)
   ───────────────────────────────────────────────────────────── */

type MenuKind = 'state' | 'mode' | 'objects' | 'place' | null

export default function MainBar() {
  const viewfinder = useStudio(s => s.viewfinder)
  const setViewfinder = useStudio(s => s.setViewfinder)
  const timelineOpen = useStudio(s => s.timeline.open)
  const setTimeline = useStudio(s => s.setTimeline)
  const openP = useStudio(s => s.openP)
  const openPanel = useStudio(s => s.openPanel)
  const selection = useStudio(s => s.selection)
  const controlId = useStudio(s => s.controlId)
  const activeStateId = useStudio(s => s.activeStateId)

  const [menu, setMenu] = useState<MenuKind>(null)
  const stateRef = useRef<HTMLButtonElement>(null)
  const modeRef = useRef<HTMLButtonElement>(null)
  const objRef = useRef<HTMLButtonElement>(null)
  const placeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(null)
    }
    const onControl = (e: Event) => {
      const id = (e as CustomEvent<string>).detail
      if (id) useStudio.getState().setControl(id)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('studio-control', onControl)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('studio-control', onControl)
    }
  }, [])

  const toggle = (k: MenuKind) => setMenu(m => (m === k ? null : k))

  // 操控模式:整条主操作条替换为操控底栏
  if (controlId) return <ControlBar id={controlId} />

  return (
    <div className="bottom-center">
      {/* 取景器 */}
      <div className="hud-pill">
        <button
          className={'hud-btn' + (viewfinder ? ' active' : '')}
          aria-label={viewfinder ? '关闭取景器' : '打开取景器'}
          aria-pressed={viewfinder}
          onClick={() => setViewfinder(!viewfinder)}
        >
          {viewfinder ? <IconX /> : <IconCamera />}
          <span className="hud-label-collapse"><span>取景器</span></span>
        </button>
      </div>

      {/* 状态 / 模式 / 对象 / 放置 —— 选中对象时替换为属性条 */}
      <div className="hud-pill">
        {selection && activeStateId !== 'baseline' ? (
          <PropertyBar />
        ) : activeStateId === 'baseline' ? (
          <>
            <div className="bar-group">
              <button
                ref={stateRef}
                className="hud-btn"
                aria-label="场景基准"
                aria-expanded={menu === 'state'}
                onClick={() => toggle('state')}
              >
                <span>场景基准</span>
                <IconCaret className="caret" />
              </button>
              <button
                ref={modeRef}
                className="hud-btn"
                aria-label={modeLabel()}
                aria-expanded={menu === 'mode'}
                onClick={() => toggle('mode')}
              >
                <IconMousePointer />
                <span className="hud-label-collapse"><span><ModeLabel /></span></span>
                <IconCaret className="caret" />
              </button>
            </div>
            <span className="hud-divider" />
            <div className="bar-group">
              <span className="baseline-hint">右击场景任意位置,即可添加对象</span>
              <button
                ref={placeRef}
                className="hud-btn icon-only"
                aria-label="放置"
                aria-expanded={menu === 'place'}
                onClick={() => toggle('place')}
              >
                <IconPlus />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bar-group">
              <button
                ref={stateRef}
                className="hud-btn"
                aria-label="示例状态"
                aria-expanded={menu === 'state'}
                onClick={() => toggle('state')}
              >
                <span className="hud-label-collapse" style={{ marginLeft: 0, opacity: 1, gridTemplateColumns: '1fr' }}>
                  <span><StateLabel /></span>
                </span>
                <IconCaret className="caret" />
              </button>
              <button
                ref={modeRef}
                className="hud-btn"
                aria-label={modeLabel()}
                aria-expanded={menu === 'mode'}
                onClick={() => toggle('mode')}
              >
                <IconMousePointer />
                <span className="hud-label-collapse"><span><ModeLabel /></span></span>
                <IconCaret className="caret" />
              </button>
            </div>
            <span className="hud-divider" />
            <div className="bar-group">
              <button
                ref={objRef}
                className="hud-btn"
                aria-label="选择对象"
                aria-expanded={menu === 'objects'}
                onClick={() => toggle('objects')}
              >
                <IconBox />
                <span className="hud-label-collapse"><span>对象</span></span>
                <IconCaret className="caret" />
              </button>
              <button
                ref={placeRef}
                className="hud-btn icon-only"
                aria-label="放置"
                aria-expanded={menu === 'place'}
                onClick={() => toggle('place')}
              >
                <IconPlus />
              </button>
            </div>
          </>
        )}
      </div>

      {/* 镜头管理 */}
      <div className="hud-pill">
        <button
          className={'hud-btn' + (openPanel === 'shots' ? ' active' : '')}
          aria-label="镜头管理"
          onClick={() => openP(openPanel === 'shots' ? null : 'shots')}
        >
          <IconClapper />
          <span className="hud-label-collapse"><span>镜头管理</span></span>
        </button>
      </div>

      {/* 时间轴 */}
      <div className="hud-pill">
        <button
          className={'hud-btn' + (timelineOpen ? ' active' : '')}
          aria-label={timelineOpen ? '关闭时间轴' : '打开时间轴'}
          onClick={() => setTimeline({ open: !timelineOpen })}
        >
          <IconTimeline />
          <span className="hud-label-collapse"><span>时间轴</span></span>
        </button>
      </div>

      {menu === 'state' && <StateMenu anchor={stateRef.current} close={() => setMenu(null)} />}
      {menu === 'mode' && <ModeMenu anchor={modeRef.current} close={() => setMenu(null)} />}
      {menu === 'objects' && <ObjectsMenu anchor={objRef.current} close={() => setMenu(null)} />}
      {menu === 'place' && <PlaceMenu anchor={placeRef.current} close={() => setMenu(null)} />}
    </div>
  )
}

function StateLabel() {
  const id = useStudio(s => s.activeStateId)
  const name = useStudio(s => s.states.find(x => x.id === id)?.name)
  return <>{id === 'baseline' ? '场景基准' : (name ?? '示例状态')}</>
}

function modeLabel() {
  const m = useStudio.getState().mode
  return m.type === 'cam' ? (useStudio.getState().getEntity(m.id)?.name ?? '摄像机') : m.type === 'top' ? '俯视' : '3D'
}

function ModeLabel() {
  const m = useStudio(s => s.mode)
  const name = useStudio(s => (m.type === 'cam' ? s.getEntity(m.id)?.name : undefined))
  return <>{m.type === 'cam' ? (name ?? '摄像机') : m.type === 'top' ? '俯视' : '3D'}</>
}

/* ── 菜单定位壳(在触发按钮正上方居中) ───────────────────────── */
function Pop({ anchor, close, children, minWidth }: { anchor: HTMLElement | null; close: () => void; children: React.ReactNode; minWidth?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null)

  useLayoutEffect(() => {
    // 防御:隐藏式 overflow 下程序滚动仍可能发生(如 autoFocus),先归零
    if (window.scrollY !== 0) window.scrollTo(0, 0)
    const a = anchor?.getBoundingClientRect()
    if (!a) return
    const w = ref.current?.offsetWidth ?? 200
    const left = Math.min(Math.max(8, a.left + a.width / 2 - w / 2), window.innerWidth - w - 8)
    setPos({ left, bottom: window.innerHeight - a.top + 8 })
  }, [anchor])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) return
      if (anchor?.contains(e.target as Node)) return
      close()
    }
    const t = setTimeout(() => document.addEventListener('mousedown', onDown), 0)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', onDown) }
  }, [anchor, close])
  return (
    <div
      ref={ref}
      className="menu-pop"
      style={{ left: pos?.left ?? 0, bottom: pos?.bottom ?? 0, minWidth, visibility: pos ? 'visible' : 'hidden' }}
    >
      {children}
    </div>
  )
}

/* ── 状态菜单 ─────────────────────────────────────────────────── */
function StateMenu({ anchor, close }: { anchor: HTMLElement | null; close: () => void }) {
  const states = useStudio(s => s.states)
  const activeId = useStudio(s => s.activeStateId)
  const s = useStudio.getState

  return (
    <Pop anchor={anchor} close={close} minWidth={178}>
      {states.map(st => (
        <div key={st.id} className="state-row">
          <button
            className={'menu-item' + (st.id === activeId ? ' on' : '')}
            onClick={() => { s().setActiveState(st.id); close() }}
          >
            <span className="mi-label">{st.name}</span>
          </button>
          <span className="state-ops">
            <button aria-label={`复制状态 ${st.name}`} onClick={() => { s().dupState(st.id); close() }}><IconCopy /></button>
            <button aria-label={`重命名状态 ${st.name}`} onClick={() => { s().renameState(st.id); close() }}><IconEdit /></button>
            <button aria-label={`删除状态 ${st.name}`} onClick={() => { s().delState(st.id); close() }}><IconTrash /></button>
          </span>
        </div>
      ))}
      <div className="menu-sep" />
      <button className="menu-item" onClick={() => { s().addState(); close() }}>
        <span className="mi-icon"><IconPlus /></span>
        <span className="mi-label">新增状态</span>
      </button>
      <button className={'menu-item' + (activeId === 'baseline' ? ' on' : '')} onClick={() => { s().editBaseline(); close() }}>
        <span className="mi-label">编辑场景基准</span>
      </button>
    </Pop>
  )
}

/* ── 模式菜单 ─────────────────────────────────────────────────── */
function ModeMenu({ anchor, close }: { anchor: HTMLElement | null; close: () => void }) {
  const mode = useStudio(s => s.mode)
  const cameras = useEntities().filter(e => e.kind === 'camera')
  const s = useStudio.getState
  const camName = mode.type === 'cam' ? s().getEntity(mode.id)?.name : undefined

  return (
    <Pop anchor={anchor} close={close} minWidth={178}>
      <button className={'menu-item' + (mode.type === '3d' ? ' on' : '')} onClick={() => { s().setMode({ type: '3d' }); close() }}>
        <span className="mi-icon"><IconMousePointer /></span>
        <span className="mi-label">3D(现场)</span>
      </button>
      <button className={'menu-item' + (mode.type === 'top' ? ' on' : '')} onClick={() => { s().setMode({ type: 'top' }); close() }}>
        <span className="mi-icon"><IconCube /></span>
        <span className="mi-label">俯视</span>
      </button>
      {cameras.length > 0 && <div className="menu-sep" />}
      {cameras.map(c => (
        <button
          key={c.id}
          className={'menu-item' + (mode.type === 'cam' && mode.id === c.id ? ' on' : '')}
          onClick={() => { s().setMode({ type: 'cam', id: c.id }); close() }}
        >
          <span className="mi-icon"><IconCamera /></span>
          <span className="mi-label">{c.name}</span>
          <span className="mi-sub">{c.focalMm ?? 24} mm</span>
        </button>
      ))}
      {camName && <div className="menu-note">当前:操控 {camName}</div>}
    </Pop>
  )
}

/* ── 对象菜单 ─────────────────────────────────────────────────── */
function ObjectsMenu({ anchor, close }: { anchor: HTMLElement | null; close: () => void }) {
  const [q, setQ] = useState('')
  const entities = useEntities()
  const selection = useStudio(s => s.selection)
  const s = useStudio.getState

  const filtered = entities.filter(e => e.name.toLowerCase().includes(q.toLowerCase()))
  const groups: [string, typeof filtered][] = [
    ['角色', filtered.filter(e => e.kind === 'actor')],
    ['摄像机', filtered.filter(e => e.kind === 'camera')],
    ['对象', filtered.filter(e => e.kind === 'prop')],
  ]

  return (
    <Pop anchor={anchor} close={close} minWidth={233}>
      <input
        className="menu-search"
        style={{ width: '100%', marginBottom: 6, height: 32, borderRadius: 8, padding: '0 10px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}
        placeholder="搜索场景对象"
        aria-label="搜索场景对象"
        value={q}
        onChange={e => setQ(e.target.value)}
        autoFocus
      />
      {groups.map(([label, list]) => list.length === 0 ? null : (
        <div key={label}>
          <div className="menu-note" style={{ padding: '4px 10px' }}>{label}</div>
          {list.map(e => (
            <button
              key={e.id}
              className={'menu-item' + (e.id === selection ? ' on' : '')}
              onClick={() => { s().select(e.id); if (e.kind === 'camera') s().setMode({ type: 'cam', id: e.id }); close() }}
            >
              <span className="mi-icon">{e.kind === 'actor' ? <IconPerson /> : e.kind === 'camera' ? <IconCamera /> : <IconBox />}</span>
              <span className="mi-label">{e.name}</span>
              <span className="mi-sub">{e.kind === 'actor' ? '角色' : e.kind === 'camera' ? '摄像机' : '对象'}</span>
            </button>
          ))}
        </div>
      ))}
      {filtered.length === 0 && <div className="menu-note">没有匹配的对象</div>}
    </Pop>
  )
}

/* ── 放置菜单 ─────────────────────────────────────────────────── */
type Sub = 'actor' | 'cam' | 'geom' | 'history' | 'lib' | null

function PlaceMenu({ anchor, close }: { anchor: HTMLElement | null; close: () => void }) {
  const [sub, setSub] = useState<Sub>(null)
  const s = useStudio.getState
  const start = (spec: PlacementSpec) => { s().startPlacement(spec); close() }

  return (
    <Pop anchor={anchor} close={close} minWidth={270}>
      <div className="menu-note">仅添加到当前状态。如需在所有状态中共享,请切换到场景基准。</div>
      <div className="menu-sep" />
      <button className="menu-item" onClick={() => start({ name: '角色', kind: 'actor', prim: 'actor', color: '#6f93c8', height: 1.7 })}>
        <span className="mi-icon"><span className="mi-swatch" style={{ background: '#6f93c8' }} /></span>
        <span className="mi-label">角色</span>
      </button>
      <SubRow label="新建角色" icon={<IconPlus />} open={sub === 'actor'} onHover={() => setSub('actor')} />
      {sub === 'actor' && <ActorSub close={close} />}
      <div className="menu-sep" />
      <SubRow label="添加摄像机" icon={<IconCamera />} open={sub === 'cam'} onHover={() => setSub('cam')} />
      {sub === 'cam' && (
        <div className="submenu-inline">
          <button className="menu-item" onClick={() => start({ name: '摄像机', kind: 'camera', prim: 'camera', color: '#2b2b30', focalMm: FOCALS[useStudio.getState().focalIdx] } as PlacementSpec)}>
            <span className="mi-label">选择地面位置</span>
          </button>
          <button className="menu-item" onClick={() => { s().setMode({ type: '3d' }); start({ name: '摄像机', kind: 'camera', prim: 'camera', color: '#2b2b30' } as PlacementSpec) }}>
            <span className="mi-label">以当前视角添加</span>
          </button>
        </div>
      )}
      <div className="menu-sep" />
      <button className="menu-item" onClick={() => { s().setLibraryOpen(true); close() }}>
        <span className="mi-icon"><IconPlus /></span>
        <span className="mi-label">生成 3D 对象</span>
        <span className="mi-sub">模型库</span>
      </button>
      <SubRow label="生成历史" icon={<IconHistory />} open={sub === 'history'} onHover={() => setSub('history')} />
      {sub === 'history' && (
        <div className="submenu-inline">
          {useStudio.getState().genAssets.length === 0
            ? <div className="menu-note">暂无生成历史</div>
            : useStudio.getState().genAssets.map(a => (
              <button key={a.id} className="menu-item" onClick={() => start({ name: a.name, kind: 'prop', prim: a.prim, color: a.color })}>
                <span className="mi-icon"><IconBox /></span>
                <span className="mi-label">{a.name}</span>
              </button>
            ))}
        </div>
      )}
      <SubRow label="生成示例库" tag="Beta" icon={<IconCube />} open={sub === 'lib'} onHover={() => setSub('lib')} />
      {sub === 'lib' && (
        <div className="submenu-inline">
          {MODEL_LIBRARY.slice(0, 10).map(m => (
            <button key={m.id} className="menu-item" onClick={() => start({ name: m.name, kind: m.prim === 'actor' ? 'actor' : m.prim === 'camera' ? 'camera' : 'prop', prim: m.prim, color: m.color, height: m.height })}>
              <span className="mi-icon"><span className="mi-swatch" style={{ background: m.color }} /></span>
              <span className="mi-label">{m.name}</span>
            </button>
          ))}
        </div>
      )}
      <SubRow label="几何体" icon={<IconCube />} open={sub === 'geom'} onHover={() => setSub('geom')} />
      {sub === 'geom' && (
        <div className="submenu-inline">
          {([['立方体', 'box'], ['球', 'sphere'], ['圆柱体', 'cylinder'], ['圆锥体', 'cone']] as [string, Prim][]).map(([name, prim]) => (
            <button key={prim} className="menu-item" onClick={() => start({ name, kind: 'prop', prim, color: '#d8d8dc' })}>
              <span className="mi-label">{name}</span>
            </button>
          ))}
        </div>
      )}
      <div className="menu-sep" />
      <button className="menu-item" onClick={() => { s().setLibraryOpen(true); close() }}>
        <span className="mi-icon"><IconUpload /></span>
        <span className="mi-label">上传 3D 模型</span>
      </button>
    </Pop>
  )
}

function SubRow({ label, icon, tag, open, onHover }: { label: string; icon: React.ReactNode; tag?: string; open: boolean; onHover: () => void }) {
  return (
    <button className="menu-item" style={{ justifyContent: 'flex-start' }} onMouseEnter={onHover} aria-expanded={open}>
      <span className="mi-icon">{icon}</span>
      <span className="mi-label">{label}</span>
      {tag && <span className="mi-sub">{tag}</span>}
      <span className="mi-arrow" style={{ transform: 'rotate(-90deg)' }}>›</span>
    </button>
  )
}

function ActorSub({ close }: { close: () => void }) {
  const COLORS = ['#6f93c8', '#e08aa8', '#5f9e4a', '#e8c44a', '#e08a3c', '#8f6fc8', '#4fb3b8', '#e0524d', '#e8e8ec', '#2b2b30']
  const [color, setColor] = useState(COLORS[0])
  const [name, setName] = useState('')
  const s = useStudio.getState
  return (
    <div className="submenu-inline">
      <div className="color-dots">
        {COLORS.map(c => (
          <i key={c} className={'color-dot' + (c === color ? ' on' : '')} style={{ background: c }} onClick={() => setColor(c)} role="button" aria-label={`颜色 ${c}`} />
        ))}
      </div>
      <input
        placeholder="角色名"
        aria-label="角色名"
        value={name}
        onChange={e => setName(e.target.value)}
        style={{ width: 'calc(100% - 20px)', margin: '0 10px 8px', height: 32, borderRadius: 8, padding: '0 10px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}
      />
      <button
        className="menu-item"
        onClick={() => { s().startPlacement({ name: name || '角色', kind: 'actor', prim: 'actor', color, height: 1.7 }); close() }}
      >
        <span className="mi-icon"><IconPlus /></span>
        <span className="mi-label">添加并放置</span>
      </button>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   对象操控模式底栏(对齐原站:落到地面 / 下移 / 上移 / 旋转 / 还原并退出 / 完成)
   ───────────────────────────────────────────────────────────── */
function ControlBar({ id }: { id: string }) {
  const entities = useEntities()
  const e = entities.find(x => x.id === id)
  const dropToGround = useStudio(s => s.dropToGround)
  const nudge = useStudio(s => s.nudge)
  const commit = useStudio(s => s.commitEntity)
  const resetPlacementOf = useStudio(s => s.resetPlacementOf)
  const setControl = useStudio(s => s.setControl)

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') { setControl(null); return }
      if (ev.key === 'g' || ev.key === 'G') { dropToGround(id); return }
      if (ev.key === 'q' || ev.key === 'Q') { nudge(id, 0, -0.25, 0); return }
      if (ev.key === 'e' || ev.key === 'E') { nudge(id, 0, 0.25, 0) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [id, dropToGround, nudge, setControl])

  if (!e) return null
  const deg = ((Math.round((e.rotationY * 180) / Math.PI) % 360) + 360) % 360
  const TICKS = [0, 90, 180, 270, 359]

  return (
    <div className="bottom-center">
      <div className="hud-pill">
        <button className="hud-btn" aria-label="落到地面" aria-keyshortcuts="G" onClick={() => dropToGround(id)}>
          <IconGround />
          <span>落到地面</span>
        </button>
        <button className="hud-btn" aria-label="下移" aria-keyshortcuts="Q" onClick={() => nudge(id, 0, -0.25, 0)}>
          <IconArrowDown />
          <span>下移</span>
        </button>
        <button className="hud-btn" aria-label="上移" aria-keyshortcuts="E" onClick={() => nudge(id, 0, 0.25, 0)}>
          <IconArrowUp />
          <span>上移</span>
        </button>
        <span className="hud-divider" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px 0 8px' }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--t84)' }}>旋转</span>
          <div className="rot-track">
            {TICKS.map(t => (
              <button key={t} className="rot-tick" style={{ left: (t / 359) * 100 + '%' }} aria-label={`${t}°`} onClick={() => commit(id, { rotationY: (t * Math.PI) / 180 }, '旋转')} />
            ))}
            {Array.from({ length: 59 }, (_, i) => (i + 1) * 6).filter(d => !TICKS.includes(d)).map(d => (
              <span key={d} className="rot-minor" style={{ left: (d / 359) * 100 + '%' }} />
            ))}
            <span className="rot-ind" style={{ left: (deg / 359) * 100 + '%' }} />
          </div>
          <span style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', color: 'var(--t82)', minWidth: 46, textAlign: 'right' }}>{deg}°</span>
        </div>
        <span className="hud-divider" />
        <button className="hud-btn" aria-label="还原并退出" onClick={() => { resetPlacementOf(id); setControl(null) }}>
          <span>还原并退出</span>
        </button>
        <button className="hud-btn" aria-label="完成" onClick={() => setControl(null)}>
          <span>完成</span>
        </button>
      </div>
    </div>
  )
}
