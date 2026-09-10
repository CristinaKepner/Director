import { useEffect, useRef } from 'react'
import { useStudio } from '../store'
import { MODEL_LIBRARY } from '../library'
import { IconUpload, IconX } from './icons'

/* ─────────────────────────────────────────────────────────────
   模型库:内置模型可直接放置(也可被 Agent 调度)+ 上传 GLB/GLTF
   ───────────────────────────────────────────────────────────── */

export default function LibraryPanel() {
  const start = useStudio(s => s.startPlacement)
  const toast = useStudio(s => s.toast)
  const fileRef = useRef<HTMLInputElement>(null)
  const groups = new Map<string, typeof MODEL_LIBRARY>()
  for (const m of MODEL_LIBRARY) {
    if (!groups.has(m.category)) groups.set(m.category, [])
    groups.get(m.category)!.push(m)
  }

  const place = (m: typeof MODEL_LIBRARY[number]) => {
    start({
      name: m.name,
      kind: m.prim === 'actor' ? 'actor' : m.prim === 'camera' ? 'camera' : 'prop',
      prim: m.prim,
      color: m.color,
      height: m.height,
      modelUrl: m.modelUrl,
    })
  }

  const onFile = (f: File | undefined) => {
    if (!f) return
    const url = URL.createObjectURL(f)
    toast(`正在加载模型:${f.name}`)
    start({ name: f.name.replace(/\.(glb|gltf)$/i, ''), kind: 'prop', prim: 'model', color: '#d8d8dc', modelUrl: url })
  }

  return (
    <div className="panel-scroll" style={{ flex: 1 }}>
      <button className="btn-ghost" style={{ width: '100%', marginBottom: 10 }} onClick={() => fileRef.current?.click()}>
        <IconUpload /> 上传 3D 模型(.glb / .gltf)
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
        style={{ display: 'none' }}
        aria-label="上传 3D 模型文件"
        onChange={e => { onFile(e.target.files?.[0]); e.currentTarget.value = '' }}
      />

      {[...groups.entries()].map(([cat, list]) => (
        <div key={cat}>
          <div className="panel-sec-title">{cat}</div>
          {list.map(m => (
            <button key={m.id} className="panel-row" onClick={() => place(m)} aria-label={`放置 ${m.name}`}>
              <span className="lr-dot" style={{ background: m.color }} />
              <span className="pr-label">{m.name}</span>
              <span className="pr-act" style={{ minWidth: 0 }}>{m.height ? `${m.height}m` : ''}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

/** 「上传 3D 模型」入口打开的模型库弹窗 */
export function LibraryDialog() {
  const open = useStudio(s => s.libraryOpen)
  const setOpen = useStudio(s => s.setLibraryOpen)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])
  if (!open) return null
  return (
    <div className="modal-mask" onClick={() => setOpen(false)}>
      <div className="modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
        <h3>模型库</h3>
        <button className="close-x" aria-label="关闭模型库" onClick={() => setOpen(false)}><IconX /></button>
        <LibraryPanel />
      </div>
    </div>
  )
}
