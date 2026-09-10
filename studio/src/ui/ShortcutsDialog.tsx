import { useEffect } from 'react'
import { useStudio } from '../store'
import { IconX } from './icons'

const SECTIONS: { title: string; rows: [string, string[]][] }[] = [
  {
    title: '移动与视角',
    rows: [
      ['水平移动', ['W', 'A', 'S', 'D']],
      ['上升 / 下降', ['E', 'Q']],
      ['加速移动', ['Shift']],
      ['调整焦距', ['[', ']']],
    ],
  },
  {
    title: '视角导航',
    rows: [
      ['环视', ['左键拖动', '中键拖动']],
      ['围绕指定点旋转', ['Option', '左键拖动']],
      ['平移', ['Option', '中键拖动']],
      ['准心出现后调整距离', ['滚轮']],
      ['触控板环视', ['双指滑动']],
    ],
  },
  {
    title: '对象操作',
    rows: [
      ['聚焦对象', ['双击对象', 'F']],
      ['移动模式(选中后拖拽手柄)', ['T']],
      ['旋转模式(选中后拖圆环)', ['R']],
      ['落到地面', ['G']],
      ['锁定 / 解锁', ['L']],
      ['删除', ['Delete', 'Backspace']],
    ],
  },
  {
    title: '导演工具',
    rows: [
      ['切换机位', ['1', '…', '9']],
      ['角色走位', ['选中角色', '属性条 · 走位路径']],
      ['摄像机跟随 / 环绕', ['选中摄像机', '更多 · 跟随目标']],
    ],
  },
  {
    title: '编辑与时间轴',
    rows: [
      ['添加角色或物品', ['右键场景表面']],
      ['播放 / 暂停时间轴', ['Space']],
      ['撤销', ['⌘', 'Z']],
      ['重做', ['⇧', '⌘', 'Z']],
      ['退出当前模式', ['Esc']],
    ],
  },
]

export default function ShortcutsDialog() {
  const open = useStudio(s => s.shortcutsOpen)
  const setShortcuts = useStudio(s => s.setShortcuts)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShortcuts(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setShortcuts])

  if (!open) return null

  return (
    <div className="modal-mask" role="presentation" onClick={() => setShortcuts(false)}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="操作方式"
        style={{ position: 'relative' }}
        onClick={e => e.stopPropagation()}
      >
        <h3>操作方式</h3>
        <button className="close-x" aria-label="关闭" onClick={() => setShortcuts(false)}>
          <span style={{ display: 'inline-flex', width: 18, height: 18 }}><IconX /></span>
        </button>
        {SECTIONS.map(sec => (
          <div className="kb-section" key={sec.title}>
            <div className="kb-title">{sec.title}</div>
            {sec.rows.map(([label, keys]) => (
              <div className="kb-row" key={label}>
                <span>{label}</span>
                <span className="kb-keys">{keys.map((k, i) => <kbd key={i}>{k}</kbd>)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
