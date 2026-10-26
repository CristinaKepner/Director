// Editor chrome: the left rail and its panels, placing kits with a ghost, the inspector,
// the world clock and settings, the voice bar, help and share.
import { KINDS, build, MATS } from './kit.js';
export function mountUI({ stage, state, t, say, onPlace, onRemove, onChange, onAsk, onVoice, saveNow }) {
  const $ = (s) => document.querySelector(s);
  const panels = { d5: $('#d5-panel'), insp: $('#insp'), settings: $('#settings'), help: $('#helpPanel'), share: $('#sharePanel') };
  const closeAll = (except) => {
    for (const [k, p] of Object.entries(panels)) if (k !== except) p.hidden = true;
    $('[data-cc=settings]').setAttribute('aria-expanded', String(!panels.settings.hidden));
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a=close]');
    if (b) b.closest('.panel').hidden = true;
  });

  // ---- rail
  let tool = 'select';
  const rail = $('#dock');
  const TOOL_PANELS = {
    terrain: () => kitPanel('terrain', t('Terrain', '地形')),
    build: () => kitPanel('build', t('Buildings', '建筑')),
    people: () => kitPanel('people', t('People', '人物')),
    script: () => listPanel(t('Script', '剧本'), [[t('Scene 1 · Arrival', '第 1 场 · 到达'), t('2 people · 1 camera', '2 人 · 1 机位')], [t('Scene 2 · The lighthouse', '第 2 场 · 灯塔'), t('Draft', '草稿')]], t('Scenes are a sketch in this replica: the real product plans blocking, cameras and lines per scene.', '复刻版里的场只是示意：原版会按场安排动线、机位和台词。')),
    actor: () => listPanel(t('Actor', '人'), [[t('Pick a person, then give them a line', '点一个人，给他排戏'), 'E']], t('Click a person on the stage to select them.', '点场景里的人来选中。')),
    path: () => listPanel(t('Path', '动线'), [[t('Click the ground to add waypoints', '点地面加路点'), 'E'], [t('Finish', '完成'), 'Enter']], t('Paths are drawn as a sketch here.', '这里的动线只画示意。')),
    camera: () => listPanel(t('Camera', '机位'), [[t('Place a camera', '放一台'), ''], [t('Follow a person', '跟拍一个人'), ''], [t('Handheld walk', '手持走一条'), '']], t('Click the ground to place, press E to finish; click a building, person or car to film it; Shift-drag for an aerial.', '点地面放，接着点 = 动线，E 完成；点楼、人、车 = 拍它；Shift 拖 = 航拍。')),
    export: () => listPanel(t('Export', '出片'), [[t('Still frame (PNG)', '静帧 PNG'), ''], [t('Turntable clip', '环绕镜头'), t('soon', '即将')], [t('World file (JSON)', '世界文件 JSON'), '']], t('Downloads happen in your browser; nothing leaves this machine.', '下载都在浏览器里完成，不会上传。'), (i) => i === 0 ? exportPng() : i === 2 ? exportJson() : say(t('Not in this replica yet.', '复刻版还没做这个。'))),
    more: () => listPanel(t('More', '更多'), [[t('Reset camera', '回到世界'), ''], [t('Hide chrome', '隐藏界面'), 'H'], [t('About this replica', '关于这个复刻'), '']], '', (i) => i === 0 ? stage.recentre(state.env.size) : i === 1 ? document.body.classList.toggle('bare') : say(t('Rebuilt from scratch on Director; the generator and kits are our own.', '在 Director 上从零重建；生成器与构件都是自制的。'))),
  };
  rail.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tool]');
    if (!b) return;
    setTool(b.dataset.tool);
  });
  function setTool(name) {
    if (name === tool && name !== 'select' && !panels.d5.hidden) {
      panels.d5.hidden = true;
      tool = 'select';
      cancelPlacing();
    } else {
      tool = name;
      cancelPlacing();
      if (TOOL_PANELS[name]) {
        closeAll('d5');
        TOOL_PANELS[name]();
        panels.d5.hidden = false;
      } else panels.d5.hidden = true;
    }
    for (const x of rail.querySelectorAll('[data-tool]')) x.classList.toggle('on', x.dataset.tool === (TOOL_PANELS[tool] && !panels.d5.hidden ? tool : 'select'));
  }
  const body = $('#d5-body');
  function kitPanel(cat, title) {
    $('#d5-title').textContent = title;
    body.innerHTML = `<p class="hint">${t('Pick a kit: a ghost follows the cursor, click to drop (Shift keeps placing, Esc cancels). Drag the view with the mouse, wheel to zoom.', '点一个构件：幽灵跟着光标走，单击放下（Shift 连续放，Esc 取消）。拖动旋转视角，滚轮推近。')}</p><div class="tiles"></div>`;
    const tiles = body.querySelector('.tiles');
    for (const [kind, k] of Object.entries(KINDS)) {
      if (k.cat !== cat) continue;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tile';
      b.innerHTML = `<i class="ic ${ICON[kind] || 'ic-house'}"></i><span></span>`;
      b.querySelector('span').textContent = t(k.en, k.zh);
      b.onclick = () => {
        for (const x of tiles.children) x.classList.toggle('on', x === b);
        startPlacing(kind);
      };
      tiles.append(b);
    }
    if (cat === 'terrain') {
      const extra = document.createElement('div');
      extra.className = 'actions';
      extra.innerHTML = `<button type="button" class="chip" data-g="grass">${t('Grass', '草地')}</button><button type="button" class="chip" data-g="sand">${t('Sand', '沙地')}</button><button type="button" class="chip" data-g="snow">${t('Snow', '雪地')}</button>`;
      extra.onclick = (e) => {
        const g = e.target.closest('[data-g]')?.dataset.g;
        if (g) setBackdrop(g);
      };
      body.append(extra);
    }
  }
  const ICON = { house: 'ic-house', shed: 'ic-export', tower: 'ic-house', lighthouse: 'ic-house', lamp: 'ic-sun', bench: 'ic-ground', tree: 'ic-terrain', pine: 'ic-terrain', rock: 'ic-ground', bush: 'ic-terrain', boat: 'ic-path', person: 'ic-actor', car: 'ic-camera' };
  function listPanel(title, rows, hint, onPick) {
    $('#d5-title').textContent = title;
    body.innerHTML = `${hint ? `<p class="hint"></p>` : ''}<div class="list"></div>`;
    if (hint) body.querySelector('.hint').textContent = hint;
    const list = body.querySelector('.list');
    rows.forEach(([label, meta], i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'item';
      b.innerHTML = `<span></span><small></small>`;
      b.firstChild.textContent = label;
      b.lastChild.textContent = meta;
      b.onclick = () => (onPick ? onPick(i) : say(t('This is a sketch of the real tool.', '这里只是原版工具的示意。')));
      list.append(b);
    });
  }

  // ---- placing with a ghost
  let placing = null;
  function startPlacing(kind) {
    cancelPlacing();
    const ghost = build(kind, 1);
    ghost.traverse((o) => o.isMesh && (o.material = MATS.ghost));
    stage.scene.add(ghost);
    placing = { kind, ghost };
    document.body.classList.add('placing');
    say(t(`Click to place a ${KINDS[kind].en.toLowerCase()} · Esc to cancel`, `单击放下${KINDS[kind].zh} · Esc 取消`), 0);
  }
  function cancelPlacing() {
    if (!placing) return;
    stage.scene.remove(placing.ghost);
    placing = null;
    document.body.classList.remove('placing');
    say('');
  }
  const canvas = stage.renderer.domElement;
  let downAt = null;
  canvas.addEventListener('pointermove', (e) => {
    if (placing) {
      const p = stage.pickGround(e);
      if (p) {
        placing.ghost.position.set(p.x, stage.groundY(p.x, p.z, state.env), p.z);
        placing.ghost.visible = true;
      }
      return;
    }
    const hit = stage.pickItem(e);
    const cap = $('#caption');
    if (hit && !drag) {
      cap.hidden = false;
      const it = hit.userData.item;
      cap.textContent = t(KINDS[it.kind]?.en ?? it.kind, KINDS[it.kind]?.zh ?? it.kind);
      const [x, y] = stage.toScreen(hit.position.clone().setY(hit.position.y + 4));
      cap.style.left = `${x}px`;
      cap.style.top = `${y}px`;
    } else cap.hidden = true;
  });
  let drag = false;
  canvas.addEventListener('pointerdown', (e) => {
    downAt = [e.clientX, e.clientY];
    drag = false;
  });
  canvas.addEventListener('pointermove', (e) => {
    if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 4) drag = true;
  });
  canvas.addEventListener('pointerup', (e) => {
    const wasDrag = drag;
    downAt = null;
    if (wasDrag || e.button !== 0) return;
    if (placing) {
      const p = stage.pickGround(e);
      if (!p) return;
      onPlace(placing.kind, p.x, p.z, placing.ghost.rotation.y);
      if (!e.shiftKey) cancelPlacing();
      return;
    }
    select(stage.pickItem(e));
  });
  canvas.addEventListener('wheel', (e) => {
    if (placing && e.shiftKey) {
      placing.ghost.rotation.y += Math.sign(e.deltaY) * 0.2;
      e.preventDefault();
    }
  }, { passive: false });

  // ---- inspector
  let selected = null;
  function select(g) {
    selected = g;
    if (!g) {
      panels.insp.hidden = true;
      return;
    }
    const it = g.userData.item;
    closeAll('insp');
    panels.insp.hidden = false;
    $('#insp-title').textContent = t(KINDS[it.kind]?.en ?? it.kind, KINDS[it.kind]?.zh ?? it.kind);
    $('#insp-dim').textContent = `${it.base ? t('From the template', '模板自带') : t('Placed by you', '你放的')} · x ${it.x.toFixed(0)} · z ${it.z.toFixed(0)}`;
    $('#insp-rot').value = ((it.rot * 180) / Math.PI + 360) % 360;
    $('#insp-rot-o').textContent = `${Math.round($('#insp-rot').value)}°`;
    $('#insp-scale').value = it.scale || 1;
    $('#insp-scale-o').textContent = (it.scale || 1).toFixed(2);
  }
  $('#insp-rot').oninput = () => {
    if (!selected) return;
    const it = selected.userData.item;
    it.rot = ($('#insp-rot').value * Math.PI) / 180;
    selected.rotation.y = it.rot;
    $('#insp-rot-o').textContent = `${Math.round($('#insp-rot').value)}°`;
    onChange(it);
  };
  $('#insp-scale').oninput = () => {
    if (!selected) return;
    const it = selected.userData.item;
    it.scale = +$('#insp-scale').value;
    selected.scale.setScalar(it.scale);
    $('#insp-scale-o').textContent = it.scale.toFixed(2);
    onChange(it);
  };
  panels.insp.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a || !selected) return;
    const it = selected.userData.item;
    if (a === 'del') {
      onRemove(it);
      select(null);
    } else if (a === 'dup') onPlace(it.kind, it.x + 6, it.z + 2, it.rot, it.scale);
    else if (a === 'focus') stage.controls.target.copy(selected.position);
  });

  // ---- world clock + settings
  const clockBtn = $('#worldClock');
  const fmt = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
  function paintClock() {
    const h = state.settings.hour;
    clockBtn.querySelector('.wc-t').textContent = fmt(h);
    clockBtn.classList.toggle('night', h < 5.5 || h > 19.5);
    $('#st-time').textContent = fmt(h);
    $('#st-hour').value = h;
    for (const b of $('#st-weather').children) b.classList.toggle('on', b.dataset.w === state.settings.weather);
    $('#st-weather-label').textContent = t({ clear: 'Clear', cloudy: 'Cloudy', overcast: 'Overcast', rain: 'Rain', storm: 'Storm', snow: 'Snow', fog: 'Fog' }[state.settings.weather] ?? '', { clear: '晴', cloudy: '多云', overcast: '阴', rain: '雨', storm: '雷雨', snow: '雪', fog: '雾' }[state.settings.weather] ?? '');
    for (const b of $('#st-backdrop').children) b.classList.toggle('on', b.dataset.bg === state.settings.backdrop);
    $('#st-auto').textContent = state.settings.backdrop === 'auto' ? t('Auto', '自动') : t('Manual', '手动');
    for (const b of $('#st-sizes').children) b.classList.toggle('on', +b.dataset.size === state.env.size);
    $('#st-size').textContent = `${state.env.size / 512} km`;
  }
  clockBtn.onclick = () => {
    const open = panels.settings.hidden;
    closeAll('settings');
    panels.settings.hidden = !open;
    $('[data-cc=settings]').setAttribute('aria-expanded', String(open));
  };
  $('[data-cc=settings]').onclick = clockBtn.onclick;
  $('#st-hour').oninput = () => setHour(+$('#st-hour').value);
  panels.settings.querySelector('.presets').onclick = (e) => {
    const h = e.target.closest('[data-hour]')?.dataset.hour;
    if (h) setHour(+h);
  };
  $('#st-weather').onclick = (e) => {
    const w = e.target.closest('[data-w]')?.dataset.w;
    if (!w) return;
    if (w === 'agent') return onAsk(t('Pick a weather that suits this world', '挑一个适合这个世界的天气'));
    setWeather(w);
  };
  $('#st-backdrop').onclick = (e) => {
    const bg = e.target.closest('[data-bg]')?.dataset.bg;
    if (bg) setBackdrop(bg);
  };
  $('#st-auto').onclick = () => setBackdrop('auto');
  $('#st-sizes').onclick = (e) => {
    const s = e.target.closest('[data-size]')?.dataset.size;
    if (s) {
      state.env.size = +s;
      stage.buildGround(state.env, state.settings);
      stage.recentre(state.env.size);
      paintClock();
      onChange();
    }
  };
  for (const tab of panels.settings.querySelectorAll('[role=tab]'))
    tab.onclick = () => {
      for (const x of panels.settings.querySelectorAll('[role=tab]')) x.setAttribute('aria-selected', String(x === tab));
      for (const pane of panels.settings.querySelectorAll('[data-pane]')) pane.hidden = pane.dataset.pane !== tab.dataset.tab;
    };
  $('#st-lang').onclick = (e) => {
    const l = e.target.closest('[data-lang]')?.dataset.lang;
    if (l) onAsk?.setLang?.(l);
  };
  function setHour(h) {
    state.settings.hour = Math.max(5, Math.min(23, h));
    stage.setClock(state.settings.hour, state.settings.weather);
    paintClock();
    onChange();
  }
  function setWeather(w) {
    state.settings.weather = w;
    stage.setClock(state.settings.hour, w);
    paintClock();
    onChange();
  }
  function setBackdrop(bg) {
    state.settings.backdrop = bg;
    stage.buildGround(state.env, state.settings);
    stage.setClock(state.settings.hour, state.settings.weather);
    paintClock();
    onChange();
  }

  // ---- corner controls
  $('[data-cc=save]').onclick = () => saveNow().then(() => say(t('Saved', '已保存')));
  $('[data-cc=history]').onclick = () => say(t('Version history is kept with the project; the viewer is not in this replica.', '版本记录随项目保存；复刻版没做查看器。'));
  $('[data-cc=library]').onclick = () => setTool('build');
  $('[data-cc=share]').onclick = () => {
    closeAll('share');
    panels.share.hidden = false;
    $('#shareUrl').value = `${location.origin}/share/${btoa(state.projectId).replace(/=/g, '').padEnd(16, 'x')}`;
  };
  $('#shareCopy').onclick = () => navigator.clipboard?.writeText($('#shareUrl').value).then(() => say(t('Link copied', '已复制链接')));
  $('#help').onclick = () => {
    const open = panels.help.hidden;
    closeAll('help');
    panels.help.hidden = !open;
  };
  $('#compass').onclick = () => stage.recentre(state.env.size);

  // ---- voice bar: hold Space to "listen" (no recogniser in the replica), "/" to type
  const vb = { hint: $('#vbHint'), input: $('#vbInput'), listen: $('#vbListen'), live: $('#vbLive') };
  let holding = false;
  const typing = () => !vb.input.hidden;
  const showInput = (on) => {
    vb.hint.hidden = on;
    vb.input.hidden = !on;
    if (on) vb.input.focus();
    else vb.input.value = '';
  };
  vb.hint.onclick = () => showInput(true);
  vb.input.onkeydown = (e) => {
    if (e.key === 'Escape') showInput(false);
    if (e.key === 'Enter' && !e.isComposing) {
      e.preventDefault();
      const text = vb.input.value.trim();
      showInput(false);
      if (text) onVoice(text);
    }
  };
  vb.input.onblur = () => !vb.input.value && showInput(false);
  vb.live.onclick = () => say(t('Live (voice in the world) needs the realtime voice service; not in this replica.', 'Live 需要实时语音服务，复刻版没有接。'));
  $('#vbPlus').onclick = () => onAsk('');
  const coach = $('#coach');
  const coachLines = [t('Hold Space and say “put a lighthouse there”', '按住 空格，说「放一座灯塔」'), t('Type / then “three trees by the water”', '按 / 打字：「水边三棵树」'), t('Click a building to inspect it', '点一栋楼看看')];
  let coachIdx = 0;
  const showCoach = () => {
    coach.hidden = false;
    $('#coachText').textContent = coachLines[coachIdx++ % coachLines.length];
  };
  coach.querySelector('.x').onclick = () => (coach.hidden = true);
  setTimeout(showCoach, 1500);
  document.addEventListener('keydown', (e) => {
    const inField = e.target.matches('input,textarea');
    if (e.key === 'Escape') {
      cancelPlacing();
      select(null);
      closeAll();
      return;
    }
    if (inField) return;
    if (e.code === 'Space' && !holding && !e.repeat) {
      holding = true;
      vb.hint.hidden = true;
      vb.listen.hidden = false;
      e.preventDefault();
    } else if (e.key === '/') {
      e.preventDefault();
      showInput(true);
    } else if (e.altKey && ['1', '2', '3', '4'].includes(e.key)) setTool(['select', 'actor', 'path', 'camera'][+e.key - 1]);
    else if (e.key.toLowerCase() === 'h') document.body.classList.toggle('bare');
    else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      onRemove(null, 'undo');
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selected) {
        onRemove(selected.userData.item);
        select(null);
      }
    }
  });
  document.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && holding) {
      holding = false;
      vb.listen.hidden = true;
      vb.hint.hidden = false;
      say(t('No microphone pipeline in this replica — press / and type the same sentence.', '复刻版没接麦克风，按 / 打同一句话。'));
    }
  });
  function exportPng() {
    stage.renderer.render(stage.scene, stage.camera);
    const a = document.createElement('a');
    a.href = stage.renderer.domElement.toDataURL('image/png');
    a.download = 'cinemap-frame.png';
    a.click();
  }
  function exportJson() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(state.world(), null, 2)], { type: 'application/json' }));
    a.download = 'cinemap-world.json';
    a.click();
  }
  paintClock();
  return { paintClock, select, setTool, cancelPlacing, closeAll, setHour, setWeather, setBackdrop };
}
