import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useStudio, useEntities } from '../store'
import { Entity, FOCALS, Vec3 } from '../types'
import { POSES as POSE_TABLE } from '../scene/models'
import {
  IconCamera, IconCaret, IconCopy, IconCube, IconDots, IconFocus, IconGround, IconLock,
  IconLoop, IconPerson, IconPlus, IconRefresh, IconTrash,
} from './icons'

/* ─────────────────────────────────────────────────────────────
   属性条:选中对象时替换主条中组(名称 / 高度 / 姿态·焦距 / 颜色 / 锁定 / 更多)
   ───────────────────────────────────────────────────────────── */

const POSES = ['站立', '行走', '跑步', '蹲下', '跪姿', '地坐', '坐椅', '躺卧', '侧卧', '举手', '指向', '眺望', '叉腰', '抱臂']
/** 循环动作 */
const ACTIONS = ['无', '挥手', '鼓掌', '点头', '呼吸']
/** 微调字段:名称/标签/范围 */
const POSE_TUNE_FIELDS: [string, string, number, number][] = [
  ['pelvisY', '骨盆', 0.05, 0.6],
  ['thighX', '大腿', -2.4, 0.6],
  ['shinX', '小腿', 0, 2.6],
  ['shoulderX', '肩', -2.9, 1.2],
  ['elbowX', '肘', -2.2, 0.4],
]
const COLORS = [
  '#f2f2f2', '#cfe8ff', '#ffc7d6', '#ffd9b8', '#ffe7ad', '#d3f4c1',
  '#9bd7ff', '#d7ccff', '#8d8d95', '#b08a5a', '#f5d20f', '#3e7a3a',
]
const DEFAULT_HEIGHT = (e: Entity) => (e.kind === 'actor' ? 1.7 : 1)

type MenuKind = 'name' | 'pose' | 'focal' | 'exposure' | 'color' | 'more' | null

export default function PropertyBar() {
  const selection = useStudio(s => s.selection)
  const entities = useEntities()
  const e = entities.find(x => x.id === selection)
  if (!e) return null
  return <Bar key={e.id} entity={e} />
}

function Bar({ entity: e }: { entity: Entity }) {
  const S = useStudio.getState
  const entities = useEntities()
  // 只订阅选中实体的路点数(拖拽路点时 store 高频更新不触发本组件重渲染)
  const blockingCount = useStudio(s => (s.selection ? s.blocking[s.selection]?.length ?? 0 : 0))
  const blockingClosed = useStudio(s => s.blockingClosed)
  const [menu, setMenu] = useState<MenuKind>(null)
  const [liveH, setLiveH] = useState<number | null>(null)
  const nameRef = useRef<HTMLButtonElement>(null)
  const poseRef = useRef<HTMLButtonElement>(null)
  const focalRef = useRef<HTMLButtonElement>(null)
  const expRef = useRef<HTMLButtonElement>(null)
  const dotRef = useRef<HTMLButtonElement>(null)
  const moreRef = useRef<HTMLButtonElement>(null)
  const drag = useRef<{ x: number; h: number; cur: number } | null>(null)

  const height = liveH ?? e.height ?? DEFAULT_HEIGHT(e)

  const onNumDown = (ev: React.PointerEvent<HTMLButtonElement>) => {
    ev.preventDefault()
    ev.currentTarget.setPointerCapture(ev.pointerId)
    drag.current = { x: ev.clientX, h: height, cur: height }
    setLiveH(height)
  }
  const onNumMove = (ev: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (!d) return
    d.cur = Math.max(0.1, Math.min(10, d.h + (ev.clientX - d.x) * 0.01))
    setLiveH(d.cur)
  }
  const onNumUp = (ev: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (!d) return
    drag.current = null
    setLiveH(null)
    if (ev.currentTarget.hasPointerCapture(ev.pointerId)) ev.currentTarget.releasePointerCapture(ev.pointerId)
    const next = Number(d.cur.toFixed(2))
    if (Math.abs(next - d.h) > 1e-4) S().commitEntity(e.id, { height: next }, '调整高度')
  }

  const act = (fn: () => void) => () => { fn(); setMenu(null) }
  const toggleMenu = (kind: Exclude<MenuKind, null>) => setMenu(m => (m === kind ? null : kind))
  const groups: [string, Entity[]][] = [
    ['角色', entities.filter(x => x.kind === 'actor')],
    ['摄像机', entities.filter(x => x.kind === 'camera')],
    ['对象', entities.filter(x => x.kind === 'prop')],
  ]

  return (
    <div className="bar-group">
      <span style={{ position: 'relative', display: 'inline-flex' }}>
        <button
          ref={nameRef}
          className="prop-name"
          aria-label={`对象 ${e.name}`}
          aria-expanded={menu === 'name'}
          onClick={() => toggleMenu('name')}
        >
          <span className="pn-icon">
            {e.kind === 'actor' ? <IconPerson /> : e.kind === 'camera' ? <IconCamera /> : <IconCube />}
          </span>
          <span className="pn-text">{e.name}</span>
          <IconCaret className="caret" size={14} />
        </button>
        {menu === 'name' && (
          <Pop anchor={nameRef.current} close={() => setMenu(null)} minWidth={200}>
            {groups.map(([label, list]) => list.length > 0 && (
              <Fragment key={label}>
                <div className="menu-note">{label}</div>
                {list.map(en => (
                  <button
                    key={en.id}
                    className={`menu-item${en.id === e.id ? ' on' : ''}`}
                    onClick={act(() => S().select(en.id))}
                  >
                    <span className="mi-icon">
                      {en.kind === 'actor' ? <IconPerson /> : en.kind === 'camera' ? <IconCamera /> : <IconCube />}
                    </span>
                    <span className="mi-label">{en.name}</span>
                  </button>
                ))}
              </Fragment>
            ))}
          </Pop>
        )}
      </span>

      <button
        className="prop-num"
        aria-label={`高度 ${height.toFixed(2)} m`}
        onPointerDown={onNumDown}
        onPointerMove={onNumMove}
        onPointerUp={onNumUp}
        onPointerCancel={() => { drag.current = null; setLiveH(null) }}
      >
        <b>高</b>
        <span className="val">{height.toFixed(2)} m</span>
      </button>

      {e.kind === 'actor' && (
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <button
            ref={poseRef}
            className="hud-btn"
            aria-label={`姿态 ${e.pose ?? '站立'}`}
            aria-expanded={menu === 'pose'}
            onClick={() => toggleMenu('pose')}
          >
            <IconPerson />
            <span>{e.pose ?? '站立'}</span>
            <IconCaret className="caret" />
          </button>
          {menu === 'pose' && (
            <Pop anchor={poseRef.current} close={() => setMenu(null)} minWidth={232}>
              {POSES.map(p => (
                <button
                  key={p}
                  className={'menu-item' + ((e.pose ?? '站立') === p ? ' on' : '')}
                  onClick={act(() => S().commitEntity(e.id, { pose: p }, `姿态:${p}`))}
                >
                  <span className="mi-label">{p}</span>
                </button>
              ))}
              <div className="menu-sep" />
              <div className="menu-sep" />
              <div className="menu-note">循环动作</div>
              <div className="seg" style={{ margin: '0 6px 8px' }}>
                {ACTIONS.map(a => (
                  <button
                    key={a}
                    className={(e.acting ?? '无') === a ? 'on' : ''}
                    onClick={act(() => S().commitEntity(e.id, { acting: a === '无' ? undefined : a }, `动作:${a}`))}
                  >{a}</button>
                ))}
              </div>
              <div className="menu-note" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>姿态微调</span>
                {e.poseTune && (
                  <button className="mi-sub" style={{ cursor: 'pointer' }} onClick={act(() => S().commitEntity(e.id, { poseTune: undefined }, '重置微调'))}>重置</button>
                )}
              </div>
              {POSE_TUNE_FIELDS.map(([field, label, min, max]) => {
                const base = (POSE_TABLE[e.pose ?? '站立'] ?? POSE_TABLE['站立']) as unknown as Record<string, number | undefined>
                const val = e.poseTune?.[field] ?? base[field] ?? 0
                return (
                  <div className="menu-item" style={{ cursor: 'default' }} key={field}>
                    <span className="mi-label" style={{ flex: '0 0 52px' }}>{label}</span>
                    <input
                      className="slider"
                      type="range"
                      min={min}
                      max={max}
                      step={0.02}
                      value={val}
                      aria-label={`微调 ${label}`}
                      onPointerDown={() => S().snapshot('姿态微调')}
                      onChange={ev => S().transformSilent(e.id, { poseTune: { ...(e.poseTune ?? {}), [field]: Number(ev.target.value) } })}
                    />
                    <span style={{ width: 40, textAlign: 'right', fontSize: 11, color: 'var(--t58)', fontVariantNumeric: 'tabular-nums' }}>{val.toFixed(2)}</span>
                  </div>
                )
              })}
            </Pop>
          )}
        </span>
      )}

      {e.kind === 'camera' && (
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <button
            ref={focalRef}
            className="hud-btn"
            aria-label={`焦距 ${e.focalMm ?? 24}mm`}
            aria-expanded={menu === 'focal'}
            onClick={() => toggleMenu('focal')}
          >
            <IconCamera />
            <span>{e.focalMm ?? 24}mm</span>
            <IconCaret className="caret" />
          </button>
          {menu === 'focal' && (
            <Pop anchor={focalRef.current} close={() => setMenu(null)} minWidth={148}>
              {FOCALS.map(mm => (
                <button
                  key={mm}
                  className={`menu-item${(e.focalMm ?? 24) === mm ? ' on' : ''}`}
                  onClick={act(() => S().commitEntity(e.id, { focalMm: mm }, '调整焦距'))}
                >
                  <span className="mi-icon"><IconCamera /></span>
                  <span className="mi-label">{mm}mm</span>
                </button>
              ))}
            </Pop>
          )}
        </span>
      )}

      {e.kind === 'camera' && (
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <button
            ref={expRef}
            className="hud-btn"
            aria-label={`曝光 f/${e.aperture ?? 2.8} 1/${e.shutter ?? 50}s ISO${e.iso ?? 400}`}
            aria-expanded={menu === 'exposure'}
            onClick={() => toggleMenu('exposure')}
          >
            <span>{`f/${e.aperture ?? 2.8} · 1/${e.shutter ?? 50} · ISO${e.iso ?? 400}`}</span>
            <IconCaret className="caret" />
          </button>
          {menu === 'exposure' && (
            <Pop anchor={expRef.current} close={() => setMenu(null)} minWidth={230}>
              <div className="menu-note">光圈</div>
              <div className="seg" style={{ margin: '0 6px 6px' }}>
                {[1.4, 1.8, 2.8, 4, 5.6, 8].map(v => (
                  <button
                    key={v}
                    className={(e.aperture ?? 2.8) === v ? 'on' : ''}
                    onClick={() => S().commitEntity(e.id, { aperture: v }, '调整光圈')}
                  >f/{v}</button>
                ))}
              </div>
              <div className="menu-note">快门</div>
              <div className="seg" style={{ margin: '0 6px 6px' }}>
                {[24, 48, 50, 60, 120, 250].map(v => (
                  <button
                    key={v}
                    className={(e.shutter ?? 50) === v ? 'on' : ''}
                    onClick={() => S().commitEntity(e.id, { shutter: v }, '调整快门')}
                  >1/{v}</button>
                ))}
              </div>
              <div className="menu-note">ISO</div>
              <div className="seg" style={{ margin: '0 6px 8px' }}>
                {[100, 200, 400, 800, 1600].map(v => (
                  <button
                    key={v}
                    className={(e.iso ?? 400) === v ? 'on' : ''}
                    onClick={() => S().commitEntity(e.id, { iso: v }, '调整 ISO')}
                  >{v}</button>
                ))}
              </div>
            </Pop>
          )}
        </span>
      )}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        {(['X', 'Y', 'Z'] as const).map((axis, i) => (
          <NumField
            key={axis}
            label={axis}
            value={+e.position[i].toFixed(2)}
            aria={`位置 ${axis}`}
            onCommit={v => {
              const p = [...e.position] as Vec3
              p[i] = axis === 'Y' ? Math.max(0, v) : v
              S().commitEntity(e.id, { position: p }, `移动 ${axis}`)
            }}
          />
        ))}
        <NumField
          label="°"
          value={((Math.round((e.rotationY * 180) / Math.PI) % 360) + 360) % 360}
          aria="朝向角度"
          width={42}
          onCommit={v => S().commitEntity(e.id, { rotationY: ((v % 360) * Math.PI) / 180 }, '旋转')}
        />
      </span>
      <span style={{ position: 'relative', display: 'inline-flex' }}>
        <button
          ref={dotRef}
          className="prop-dot"
          aria-label="颜色"
          aria-expanded={menu === 'color'}
          onClick={() => toggleMenu('color')}
        >
          <i style={{ background: e.color }} />
        </button>
        {menu === 'color' && (
          <Pop anchor={dotRef.current} close={() => setMenu(null)} minWidth={200}>
            <div className="color-dots">
              {COLORS.map(c => (
                <i
                  key={c}
                  className={`color-dot${c.toLowerCase() === e.color.toLowerCase() ? ' on' : ''}`}
                  style={{ background: c }}
                  role="button"
                  tabIndex={0}
                  aria-label={`颜色 ${c}`}
                  onClick={act(() => S().commitEntity(e.id, { color: c }, '更换颜色'))}
                />
              ))}
            </div>
          </Pop>
        )}
      </span>

      <button
        className={`hud-btn icon-only${e.locked ? ' active' : ''}`}
        aria-label="锁定"
        aria-pressed={!!e.locked}
        onClick={() => S().commitEntity(e.id, { locked: !e.locked }, e.locked ? '解锁' : '锁定')}
      >
        <IconLock />
      </button>

      <span style={{ position: 'relative', display: 'inline-flex' }}>
        <button
          ref={moreRef}
          className="hud-btn icon-only"
          aria-label="更多操作"
          aria-expanded={menu === 'more'}
          onClick={() => toggleMenu('more')}
        >
          <IconDots />
        </button>
        {menu === 'more' && (
          <Pop anchor={moreRef.current} close={() => setMenu(null)} minWidth={236}>
            <div className="menu-note" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              名称
              <input
                defaultValue={e.name}
                aria-label="名称"
                style={{ flex: 1, minWidth: 0 }}
                onKeyDown={ev => {
                  if (ev.key !== 'Enter') return
                  const v = ev.currentTarget.value.trim()
                  if (v && v !== e.name) S().renameEntity(e.id, v)
                  setMenu(null)
                }}
              />
            </div>
            <div className="menu-sep" />
            <Item icon={<IconFocus />} label="聚焦" kbd="F"
              onClick={act(() => window.dispatchEvent(new CustomEvent('studio-focus', { detail: e.id })))} />
            {e.kind === 'actor' && (
              <Item icon={<IconPerson />} label="操控" kbd="C"
                onClick={act(() => window.dispatchEvent(new CustomEvent('studio-control', { detail: e.id })))} />
            )}
            {e.kind === 'actor' && (
              <Item icon={<IconGround />} label={blockingCount ? `走位路径(${blockingCount} 点)` : '走位路径'}
                onClick={act(() => S().startBlocking(e.id))} />
            )}
            {e.kind === 'actor' && blockingCount > 1 && (
              <>
                <Item icon={<IconRefresh />} label="反转路径" onClick={act(() => S().reverseBlocking(e.id))} />
                <Item icon={<IconPlus />} label="加密路点(段中点)" onClick={act(() => S().densifyBlocking(e.id))} />
                <Item icon={<IconLoop />} label={blockingClosed[e.id] ? '取消闭合回路' : '闭合成回路'}
                  onClick={act(() => S().toggleBlockingClosed(e.id))} />
              </>
            )}
            {e.kind === 'actor' && blockingCount > 0 && (
              <Item icon={<IconTrash />} label="清除走位" onClick={act(() => S().clearBlocking(e.id))} />
            )}
            {e.kind === 'camera' && (
              <>
                <div className="menu-sep" />
                <div className="menu-note">跟随目标</div>
                <button
                  className={'menu-item' + (!e.followId ? ' on' : '')}
                  onClick={act(() => S().commitEntity(e.id, { followId: undefined, followMode: undefined }, '取消跟随'))}
                >
                  <span className="mi-label">不跟随</span>
                </button>
                {entities.filter(x => x.kind === 'actor' || x.kind === 'prop').map(x => (
                  <button
                    key={x.id}
                    className={'menu-item' + (e.followId === x.id ? ' on' : '')}
                    onClick={act(() => S().commitEntity(e.id, {
                      followId: x.id,
                      followMode: e.followMode ?? 'aim',
                      followOffset: [
                        e.position[0] - x.position[0],
                        e.position[1] + 1.28 * e.scale - (x.position[1] + (x.height ?? 1.7) * x.scale * 0.55),
                        e.position[2] - x.position[2],
                      ] as Vec3,
                    }, `跟随 ${x.name}`))}
                  >
                    <span className="mi-label">跟随 {x.name}</span>
                  </button>
                ))}
                {e.followId && (
                  <>
                    <div className="menu-note">跟随方式</div>
                    {([['aim', '对准(机位不动)'], ['track', '平移跟随'], ['orbit', '环绕']] as const).map(([id, label]) => (
                      <button
                        key={id}
                        className={'menu-item' + ((e.followMode ?? 'aim') === id ? ' on' : '')}
                        onClick={act(() => S().commitEntity(e.id, { followMode: id }, `跟随方式:${label}`))}
                      >
                        <span className="mi-label">{label}</span>
                      </button>
                    ))}
                    {(e.followMode ?? 'aim') === 'orbit' && (
                      <>
                        <div className="menu-note">环绕速度</div>
                        <div className="seg" style={{ margin: '0 6px 8px' }}>
                          {[0.15, 0.35, 0.7, 1.2].map(v => (
                            <button
                              key={v}
                              className={(e.orbitSpeed ?? 0.35) === v ? 'on' : ''}
                              onClick={act(() => S().commitEntity(e.id, { orbitSpeed: v }, '环绕速度'))}
                            >{v}</button>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            )}
            {e.kind === 'actor' && entities.some(x => x.id !== e.id && x.kind === 'actor') && (
              <>
                <div className="menu-sep" />
                <div className="menu-note">面对面对位(自动摆成对话站位)</div>
                {entities.filter(x => x.id !== e.id && x.kind === 'actor').map(x => (
                  <button
                    key={x.id}
                    className="menu-item"
                    onClick={act(() => S().faceToFace(e.id, x.id))}
                  >
                    <span className="mi-label">与 {x.name} 面对面</span>
                  </button>
                ))}
              </>
            )}
            {e.kind === 'actor' && (
              <>
                <div className="menu-sep" />
                <div className="menu-note">看向目标</div>
                <button
                  className={'menu-item' + (!e.lookAtId ? ' on' : '')}
                  onClick={act(() => S().commitEntity(e.id, { lookAtId: undefined }, '取消看向'))}
                >
                  <span className="mi-label">不看向</span>
                </button>
                {entities.filter(x => x.id !== e.id && (x.kind === 'actor' || x.kind === 'camera')).map(x => (
                  <button
                    key={x.id}
                    className={'menu-item' + (e.lookAtId === x.id ? ' on' : '')}
                    onClick={act(() => S().commitEntity(e.id, { lookAtId: x.id }, `看向 ${x.name}`))}
                  >
                    <span className="mi-label">看向 {x.name}</span>
                  </button>
                ))}
              </>
            )}
            <Item icon={<IconGround />} label="落到地面" kbd="G" onClick={act(() => S().dropToGround(e.id))} />
            <Item icon={<IconRefresh />} label="恢复初始摆放" onClick={act(() => S().resetPlacementOf(e.id))} />
            <Item icon={<IconCopy />} label="复制" onClick={act(() => S().duplicateEntity(e.id))} />
            <Item icon={<IconLock />} label={e.locked ? '解锁' : '锁定'} kbd="L"
              onClick={act(() => S().commitEntity(e.id, { locked: !e.locked }, e.locked ? '解锁' : '锁定'))} />
            <div className="menu-sep" />
            <Item icon={<IconTrash />} label="从场景移除" kbd="Del" onClick={act(() => S().removeEntity(e.id))} />
          </Pop>
        )}
      </span>
    </div>
  )
}

function Item({ icon, label, kbd, onClick }: { icon: ReactNode; label: string; kbd?: string; onClick: () => void }) {
  return (
    <button className="menu-item" onClick={onClick}>
      <span className="mi-icon">{icon}</span>
      <span className="mi-label">{label}</span>
      {kbd && <span className="mi-sub">{kbd}</span>}
    </button>
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
    <div ref={ref} className="menu-pop" role="menu" style={{ left: pos?.left ?? 0, bottom: pos?.bottom ?? 0, minWidth, visibility: pos ? 'visible' : 'hidden' }}>
      {children}
    </div>
  )
}

/** 紧凑数值输入:Enter/失焦提交 */
function NumField({ label, value, aria, width = 52, onCommit }: {
  label: string
  value: number
  aria: string
  width?: number
  onCommit: (v: number) => void
}) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, color: 'var(--t48)' }}>
      {label}
      <input
        type="number"
        defaultValue={value}
        key={value}
        aria-label={aria}
        style={{ width, height: 24, borderRadius: 6, padding: '0 4px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', color: 'var(--t92)', fontSize: 11 }}
        onKeyDown={ev => { if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur() }}
        onBlur={ev => {
          const v = Number(ev.target.value)
          if (Number.isFinite(v) && Math.abs(v - value) > 1e-6) onCommit(+v.toFixed(2))
        }}
      />
    </label>
  )
}
