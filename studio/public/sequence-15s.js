/* ────────────────────────────────────────────────────────────────────────────
   15 秒动作短片《走廊遭遇》编排脚本 —— 在导演台内可直接重跑
   分镜:
     S1 0.0-3.2  CAM1 全景(缓推)      A 从走廊深处走向 B
     S2 3.2-6.4  CAM2 侧移跟拍        A 逼近;B 仍背对
     S3 6.4-8.8  CAM3 反打(50→72mm)   B 急转身面对 A;A 驻足
     S4 8.8-11.4 CAM4 过肩低角度      A 抬手指向;B 后退两步
     S5 11.4-13.6 CAM1 全景横摇       A 转身离场走向出口
     S6 13.6-15.0 CAM2 拉远(35→24mm)  A 挥手告别,画面拉远
   用法:fetch('/sequence-15s.js') 后 eval;或直接粘贴到控制台
   ──────────────────────────────────────────────────────────────────────────── */
(() => {
  const S = window.__studioStore
  if (!S) return { error: 'no studio store' }
  const st = S.getState()
  const DUR = 15
  const log = []

  /* ── 0. 清理旧编排,并新建专属状态 ── */
  st.setMode({ type: '3d' })
  st.endBlocking()
  st.clearCuts()
  for (const id of Object.keys(S.getState().blocking)) st.clearBlocking(id)
  S.setState({ keys: {} })
  // 幂等:先移除同名旧状态,再在基准上新建干净状态
  const stale = S.getState().states.filter(x => x.name === '15s 走廊遭遇')
  if (stale.length) S.setState({ states: S.getState().states.filter(x => x.name !== '15s 走廊遭遇') })
  S.getState().editBaseline()
  S.getState().addState()
  const newState = S.getState().states[S.getState().states.length - 1]
  S.setState({
    activeStateId: newState.id,
    states: S.getState().states.map(x => (x.id === newState.id ? { ...x, name: '15s 走廊遭遇' } : x)),
  })
  log.push('state: ' + newState.id)

  /* ── 1. 舞台与打光 ── */
  st.setEnv({ stage: 'room', light: 'studio', lightDir: 0.6, grid: false, room: { w: 5.5, d: 13, h: 3, pattern: 'standard', spacing: 0.5 } })
  st.setTimeline({ duration: DUR, time: 0, open: true, playing: false, loop: true, rate: 1 })
  st.setAgentOpen(false)   // 打开即成片:收起侧栏露出完整取景

  /* 清场:只保留两名演员与四台机位(移除示例道具/多余角色) */
  for (const e of S.getState().effectiveEntities()) {
    if (e.kind === 'prop' || (e.kind === 'actor' && e.id !== 'actor2' && !e.name.startsWith('B ·'))) {
      S.getState().removeEntity(e.id)
    }
  }

  /* ── 2. 角色:A = actor2,B = actor2 的副本 ── */
  const ents0 = S.getState().effectiveEntities()
  const A = ents0.find(e => e.id === 'actor2')
  if (!A) return { error: 'actor2 missing' }
  S.getState().renameEntity('actor2', 'A · 小满')
  // 清掉可能存在的历史副本
  for (const e of S.getState().effectiveEntities()) {
    if (e.kind === 'actor' && e.id !== 'actor2' && e.name.startsWith('B ·')) S.getState().removeEntity(e.id)
  }
  S.getState().duplicateEntity('actor2')
  const dup = S.getState().effectiveEntities().filter(e => e.kind === 'actor' && e.id !== 'actor2').pop()
  if (!dup) return { error: 'duplicate failed' }
  const B = dup.id
  S.getState().renameEntity(B, 'B · 阿泽')

  /* 走位路径(A 全程有路径;B 用关键帧驱动,便于"面对 A 倒退") */
  const P0 = [-1.5, 0, -4.2], P1 = [-0.9, 0, -2.2], P2 = [-0.2, 0, -0.2], P3 = [1.6, 0, 3.4]
  st.clearBlocking('actor2')
  st.startBlocking('actor2')
  for (const p of [P0, P1, P2, P2, P3]) st.addBlockingPoint(p)
  st.endBlocking()
  // 分段:[走向 P1 3s][逼近 P2 3s][原地对峙 5s][离场 3s] = 14s,末尾停 1s
  for (const [i, d] of [3, 3, 5, 3].entries()) st.setBlockSeg('actor2', i, d)

  const B0 = [0.6, 0, 1.8], B1 = [0.9, 0, 3.2]

  /* ── 3. 机位布置(4 台,各司其职) ── */
  const cams = S.getState().effectiveEntities().filter(e => e.kind === 'camera')
  const camById = {}
  for (const c of cams) camById[c.id] = c
  const CAM = cams.slice(0, 4).map(c => c.id)
  if (CAM.length < 4) return { error: 'need 4 cameras, got ' + CAM.length }

  const aimAt = (from, to) => Math.atan2(to[0] - from[0], to[2] - from[2])
  const setCam = (id, name, pos, target, focal) =>
    S.getState().transformSilent(id, { name, position: pos, rotationY: aimAt(pos, target), focalMm: focal })

  const C1 = CAM[0], C2 = CAM[1], C3 = CAM[2], C4 = CAM[3]
  setCam(C1, 'CAM1 全景', [-2.2, 0.2, -5.0], [0, 0, 0], 24)
  setCam(C2, 'CAM2 跟拍', [2.3, 0.1, -1.0], [-0.9, 0, -2.2], 35)
  setCam(C3, 'CAM3 反打', [2.0, 0.15, 3.8], [-0.2, 0, -0.2], 50)
  setCam(C4, 'CAM4 过肩', [-1.9, -0.7, 0.9], [0.6, 0, 1.8], 28)

  /* ── 4. 角色关键帧(姿态 / 表演 / B 的位置与转身) ── */
  const key = (id, t, patch) => {
    if (patch) S.getState().transformSilent(id, patch)
    S.getState().setTimeline({ time: t })
    S.getState().addKeyframeFor(id)
  }
  // A:走位负责位移,关键帧只切姿态与表演
  key('actor2', 5.9, { pose: '站立' })
  key('actor2', 8.8, { pose: '指向' })
  key('actor2', 14.0, { pose: '站立', acting: '挥手' })
  // B:全程关键帧(位置 + 转身 + 姿态)
  key(B, 0, { position: B0, rotationY: 0, pose: '站立' })
  key(B, 6.4, { position: B0, rotationY: 0 })
  key(B, 7.0, { position: B0, rotationY: Math.PI })
  key(B, 8.6, { position: B0, rotationY: Math.PI, pose: '指向' })
  key(B, 10.8, { position: B1, rotationY: Math.PI, pose: '指向', acting: '点头' })
  key(B, DUR, { position: B1, rotationY: Math.PI, pose: '站立', acting: undefined })

  /* ── 5. 镜头内运镜(机位关键帧 = 推拉摇移 + 变焦) ── */
  key(C1, 0, { position: [-2.2, 0.2, -5.0], rotationY: aimAt([-2.2, 0.2, -5.0], [0, 0, 0]), focalMm: 24 })
  key(C1, 3.2, { position: [-2.05, 0.2, -4.4], rotationY: aimAt([-2.05, 0.2, -4.4], [-0.9, 0, -2.2]), focalMm: 27 })
  key(C2, 3.2, { position: [2.3, 0.1, -1.0], rotationY: aimAt([2.3, 0.1, -1.0], [-0.9, 0, -2.2]), focalMm: 35 })
  key(C2, 6.4, { position: [2.4, 0.1, 0.8], rotationY: aimAt([2.4, 0.1, 0.8], [-0.4, 0, -0.6]), focalMm: 35 })
  key(C3, 6.4, { position: [2.0, 0.15, 3.8], rotationY: aimAt([2.0, 0.15, 3.8], [-0.2, 0, -0.2]), focalMm: 50 })
  key(C3, 8.8, { position: [1.95, 0.15, 3.45], rotationY: aimAt([1.95, 0.15, 3.45], [-0.2, 0, -0.2]), focalMm: 72 })
  key(C4, 8.8, { position: [-1.9, -0.7, 0.9], rotationY: aimAt([-1.9, -0.7, 0.9], [0.6, 0, 1.8]), focalMm: 28 })
  key(C4, 11.4, { position: [-1.5, -0.65, 1.25], rotationY: aimAt([-1.5, -0.65, 1.25], [0.75, 0, 2.4]), focalMm: 32 })
  key(C1, 11.4, { position: [-2.2, 0.2, -5.0], rotationY: aimAt([-2.2, 0.2, -5.0], [0.4, 0, 0.4]), focalMm: 26 })
  key(C1, 13.6, { position: [-2.2, 0.2, -5.0], rotationY: aimAt([-2.2, 0.2, -5.0], [1.6, 0, 3.4]), focalMm: 26 })
  key(C2, 13.6, { position: [2.3, 0.1, -1.2], rotationY: aimAt([2.3, 0.1, -1.2], [1.6, 0, 3.4]), focalMm: 35 })
  key(C2, DUR, { position: [2.25, 0.45, -2.6], rotationY: aimAt([2.25, 0.45, -2.6], [1.6, 0, 3.4]), focalMm: 24 })

  /* ── 6. 打光关键帧(对峙时刻提亮主光) ── */
  const mainLight = S.getState().lights[0]
  if (mainLight) {
    const base = mainLight.intensity
    st.setTimeline({ time: 0 }); S.getState().addLightKey()
    S.getState().updateLight(mainLight.id, { intensity: base + 0.9, height: 3.0 })
    st.setTimeline({ time: 6.4 }); S.getState().addLightKey()
    S.getState().updateLight(mainLight.id, { intensity: base + 0.2, height: 3.5 })
    st.setTimeline({ time: 11.4 }); S.getState().addLightKey()
    S.getState().updateLight(mainLight.id, { intensity: base, height: 3.5 })
  }

  /* ── 7. 镜头轨(6 段分镜,覆盖式写入) ── */
  S.getState().addCut(0, 3.2, C1)
  S.getState().addCut(3.2, 6.4, C2)
  S.getState().addCut(6.4, 8.8, C3)
  S.getState().addCut(8.8, 11.4, C4)
  S.getState().addCut(11.4, 13.6, C1)
  S.getState().addCut(13.6, DUR, C2)

  /* ── 8. 收尾:回到起点待播 ── */
  st.setTimeline({ time: 0, playing: false, open: true })
  st.select(null)

  const fin = S.getState()
  return {
    ok: true,
    duration: fin.timeline.duration,
    cuts: fin.cuts.map(c => `${c.t0}-${c.t1}:${fin.effectiveEntities().find(e => e.id === c.camId)?.name}`),
    pathA: fin.blocking['actor2']?.length,
    segA: fin.blockingSeg['actor2'],
    keysA: (fin.keys['actor2'] ?? []).map(k => `${k.t}s pose=${k.pose ?? '-'} acting=${k.acting ?? '-'}`),
    keysB: (fin.keys[B] ?? []).map(k => `${k.t}s ry=${k.rotationY.toFixed(2)} pose=${k.pose ?? '-'} acting=${k.acting ?? '-'}`),
    keyCams: { c1: (fin.keys[C1] ?? []).length, c2: (fin.keys[C2] ?? []).length, c3: (fin.keys[C3] ?? []).length, c4: (fin.keys[C4] ?? []).length },
    lightKeys: fin.lightKeys.length,
    stage: fin.env.stage,
  }
})()
