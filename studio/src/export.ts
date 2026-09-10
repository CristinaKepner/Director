import { useStudio } from './store'

/* ─────────────────────────────────────────────────────────────
   真实导出:场景 JSON / 镜头清单 JSON / 取景照片 PNG
   ───────────────────────────────────────────────────────────── */

function download(filename: string, content: Blob | string, type = 'application/json') {
  const blob = typeof content === 'string' ? new Blob([content], { type }) : content
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function exportSceneJSON() {
  const s = useStudio.getState()
  const data = {
    format: 'tapnow-studio-replica/scene@1',
    exportedAt: new Date().toISOString(),
    activeStateId: s.activeStateId,
    env: s.env,
    lights: s.lights,
    states: s.states.map(st => ({ id: st.id, name: st.name, delta: st.delta })),
    baseEntities: s.baseEntities,
    keyframes: s.keys,
  }
  download(`tapnow-片场-${Date.now()}.json`, JSON.stringify(data, null, 2))
  s.toast('已导出场景 JSON')
}

export function exportShotsJSON() {
  const s = useStudio.getState()
  const data = {
    format: 'tapnow-studio-replica/shots@1',
    exportedAt: new Date().toISOString(),
    shots: s.shots.map(x => ({ name: x.name, kind: x.kind, meta: x.meta, path: x.path, focalMm: x.focalMm, createdAt: x.createdAt, url: x.url })),
  }
  download(`tapnow-镜头清单-${Date.now()}.json`, JSON.stringify(data, null, 2))
  s.toast(`已导出 ${s.shots.length} 个镜头`)
}

export function exportShotFile(id: string) {
  const s = useStudio.getState()
  const shot = s.shots.find(x => x.id === id)
  if (!shot) return
  const a = document.createElement('a')
  a.href = shot.url
  a.download = `${shot.name}.${shot.kind === 'image' ? 'png' : 'webm'}`
  a.click()
  s.toast(`已导出 ${shot.name}`)
}
