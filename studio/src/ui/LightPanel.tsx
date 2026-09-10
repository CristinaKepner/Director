import { useState } from 'react'
import { useStudio } from '../store'
import { LIGHT_PRESETS, LIGHT_TYPE_LABEL } from '../library'
import { IconCaret, IconPlus, IconTrash } from './icons'

/* ─────────────────────────────────────────────────────────────
   灯光面板:预设卡片 / 打光关键帧 / 可折叠灯卡(强度·方向·高度·柔化·色板)
   ───────────────────────────────────────────────────────────── */

export default function LightPanel() {
  const lights = useStudio(s => s.lights)
  const update = useStudio(s => s.updateLight)
  const remove = useStudio(s => s.removeLight)
  const add = useStudio(s => s.addLight)
  const applyPreset = useStudio(s => s.applyLightPreset)
  const addLightKey = useStudio(s => s.addLightKey)
  const setTimeline = useStudio(s => s.setTimeline)
  const lightKeys = useStudio(s => s.lightKeys)
  const [openId, setOpenId] = useState<string | null>(lights[0]?.id ?? null)

  return (
    <div className="panel-scroll" style={{ flex: 1 }}>
      <div className="panel-sec-title">灯光预设</div>
      <div className="preset-grid">
        {LIGHT_PRESETS.map(p => (
          <button key={p.id} className="preset-card" aria-label={`应用预设 ${p.name}`} onClick={() => applyPreset(p.id)}>
            <span className="pc-name">{p.name}</span>
            <span className="pc-dots">
              {p.lights.slice(0, 4).map((l, i) => (
                <i key={i} style={{ background: l.color, opacity: l.enabled ? 1 : 0.25 }} />
              ))}
            </span>
          </button>
        ))}
      </div>

      <div className="panel-sec-title">打光关键帧</div>
      <div className="lk-row">
        <span className="lk-count">{lightKeys.length ? `${lightKeys.length} 帧` : '未设置'}</span>
        <button
          className="btn-ghost"
          style={{ flex: 1 }}
          onClick={() => { addLightKey(); setTimeline({ open: true }) }}
        >保存打光关键帧</button>
      </div>

      <div className="panel-sec-title">灯光列表</div>
      {lights.map(l => {
        const open = openId === l.id
        return (
          <div key={l.id} className={`light-card${open ? ' open' : ''}${l.enabled ? '' : ' off'}`}>
            <div className="lc-head">
              <button
                className="lc-expand"
                aria-label={`${open ? '折叠' : '展开'} ${l.name}`}
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : l.id)}
              >
                <i className="lc-dot" style={{ background: l.enabled ? l.color : 'rgba(255,255,255,.2)' }} />
                <span className="lc-name">{l.name}</span>
                <span className="lc-type">{LIGHT_TYPE_LABEL[l.type] ?? l.type}</span>
                <IconCaret className={`caret${open ? ' up' : ''}`} />
              </button>
              <button
                className="lc-toggle"
                role="switch"
                aria-checked={l.enabled}
                aria-label={`开关 ${l.name}`}
                onClick={() => update(l.id, { enabled: !l.enabled })}
              >
                <span className={'toggle' + (l.enabled ? ' on' : '')} style={{ transform: 'scale(.72)' }} />
              </button>
              <button className="lc-del" aria-label={`删除 ${l.name}`} onClick={() => remove(l.id)}><IconTrash /></button>
            </div>
            {open && (
              <div className="lc-body">
                <SliderRow label="强度" value={l.intensity} min={0} max={10} step={0.1} onChange={v => update(l.id, { intensity: v })} />
                <SliderRow label="方向" value={l.angle} min={0} max={360} step={1} onChange={v => update(l.id, { angle: v })} unit="°" />
                <SliderRow label="高度" value={l.height} min={0} max={10} step={0.1} onChange={v => update(l.id, { height: v })} unit="m" />
                <SliderRow label="柔化" value={l.softness} min={0} max={1} step={0.01} onChange={v => update(l.id, { softness: v })} />
                <div className="swatch-row" style={{ padding: '4px 0 2px' }}>
                  {['#fff6e8', '#ffffff', '#e8f0ff', '#ffb066', '#9fb6ff', '#ffd08a', '#ff7a7a', '#7affa8'].map(c => (
                    <i key={c} className={l.color === c ? 'on' : ''} style={{ background: c }} role="button" aria-label={`颜色 ${c}`} onClick={() => update(l.id, { color: c })} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}

      <button className="add-dashed" onClick={() => { const id = add(); setOpenId(id) }}>
        <IconPlus /> 添加灯光
      </button>
    </div>
  )
}

function SliderRow({ label, value, min, max, step, onChange, unit }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; unit?: string
}) {
  return (
    <div className="panel-field" style={{ minHeight: 28, padding: '0 2px' }}>
      <span className="pf-label" style={{ flex: '0 0 36px', fontSize: 12 }}>{label}</span>
      <input
        className="slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={e => onChange(Number(e.target.value))}
      />
      <span style={{ width: 44, textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
        {value.toFixed(step < 1 ? 2 : 0)}{unit ?? ''}
      </span>
    </div>
  )
}
