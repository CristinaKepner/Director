// Three.js projection of the Director Runtime. This file never mutates the Source of Truth directly:
// pointer/gizmo interactions end in dispatch(); playback advances the transport via store.light().
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { RectAreaLightHelper } from "three/addons/helpers/RectAreaLightHelper.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { store } from "../../core/store.js";
import { setHooks } from "../../core/actions.js";
import { dispatch } from "./client.js";
import { cameraStateAt, entityStateAt, lightStateAt, gaitOffsets, sequenceLayout, subjectPoint } from "../../core/motion.js";
import { ASPECTS } from "../../core/schema.js";

const HELPER_LAYER = 1; // grid, labels, camera markers, light helpers, paths — visible in free view only
let renderer, scene, world, helpers, freeCam, programCam, orbit, gizmo, gizmoHelper, clock, canvas, host, raycaster;
let hemi, ground, grid, fogObj;
let roomObj = null, roomSig = "";
const gltfLoader = new GLTFLoader();
const gltfCache = new Map(); // url → Promise<scene>
const entityMap = new Map(), lightMap = new Map(), camMap = new Map();
let pathLines = { motion: null, keys: null, entity: [] };
let pipFrame, safeFrame, lastRect = { x: 0, y: 0, w: 1, h: 1 };
let pointerDown = null;
let fpsAcc = { frames: 0, t: 0 };
let captureQueue = [];
let recording = null;
let envSig = "", selSig = "";
const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);

export function initViewport(el) {
  host = el;
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.autoClear = false;
  el.appendChild(renderer.domElement);
  canvas = renderer.domElement;
  canvas.tabIndex = 0;
  RectAreaLightUniformsLib.init();

  scene = new THREE.Scene();
  scene.background = new THREE.Color("#07080d");
  fogObj = new THREE.FogExp2("#07080d", 0.02);
  scene.fog = fogObj;
  world = new THREE.Group();
  helpers = new THREE.Group();
  scene.add(world, helpers);

  hemi = new THREE.HemisphereLight("#26304a", "#150c0c", 0.3);
  scene.add(hemi);
  ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: "#101318", roughness: 0.35, metalness: 0.25 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.005;
  ground.receiveShadow = true;
  scene.add(ground);
  grid = new THREE.GridHelper(120, 120, "#2a3340", "#151920");
  grid.position.y = 0.012;
  grid.layers.set(HELPER_LAYER);
  helpers.add(grid);
  const axes = new THREE.AxesHelper(1.2);
  axes.layers.set(HELPER_LAYER);
  helpers.add(axes);

  freeCam = new THREE.PerspectiveCamera(50, 1, 0.05, 800);
  freeCam.position.set(13, 6.5, 15);
  freeCam.layers.enable(HELPER_LAYER);
  programCam = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 800);
  programCam.filmGauge = 36;
  orbit = new OrbitControls(freeCam, canvas);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.08;
  orbit.maxPolarAngle = 1.56;
  orbit.target.set(0, 1, 0);

  gizmo = new TransformControls(freeCam, canvas);
  gizmoHelper = gizmo.getHelper();
  gizmoHelper.traverse((o) => o.layers.set(HELPER_LAYER));
  scene.add(gizmoHelper);
  gizmo.addEventListener("dragging-changed", (e) => (orbit.enabled = !e.value && store.get().project.viewMode === "free"));
  gizmo.addEventListener("mouseUp", commitGizmo);

  raycaster = new THREE.Raycaster();
  raycaster.layers.enableAll();
  canvas.addEventListener("pointerdown", (e) => (pointerDown = { x: e.clientX, y: e.clientY, t: performance.now(), b: e.button }));
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("dblclick", onDblClick);

  pipFrame = document.createElement("div");
  pipFrame.className = "pip-frame";
  pipFrame.innerHTML = `<span>PROGRAM</span>`;
  safeFrame = document.createElement("div");
  safeFrame.className = "safe-frame";
  safeFrame.innerHTML = `<div class="thirds"></div><div class="action-safe"></div><div class="center"></div>`;
  el.appendChild(pipFrame);
  el.appendChild(safeFrame);
  pipFrame.onclick = () => dispatch("project.set-view", { mode: "program" });

  new ResizeObserver(() => resize()).observe(el);
  resize();
  clock = new THREE.Clock();
  store.subscribe((d, info) => {
    if (info?.light) return;
    try {
      sync(d);
    } catch (err) {
      console.error("viewport sync", err);
    }
  });
  sync(store.get());
  renderer.setAnimationLoop(tick);
  setHooks({ recorder: recorderHook, capture: captureProgramFrame });
  window.__dc = Object.assign(window.__dc || {}, { renderer, scene, viewportReady: true, captureProgramFrame, focusSelected, resetView });
  return { captureProgramFrame, focusSelected, resetView };
}

function resize() {
  const w = host.clientWidth || 640, h = host.clientHeight || 360;
  renderer.setSize(w, h, false);
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  freeCam.aspect = w / h;
  freeCam.updateProjectionMatrix();
  layoutFrames();
}

function aspectRatio() {
  return ASPECTS[store.get().project.aspect] || 16 / 9;
}

// Rect (CSS pixels, origin top-left) of the program frame letterboxed in the host.
function programRect(full = false) {
  const W = host.clientWidth || 640, H = host.clientHeight || 360;
  const a = aspectRatio();
  if (full) {
    let w = W, h = W / a;
    if (h > H) {
      h = H;
      w = H * a;
    }
    return { x: (W - w) / 2, y: (H - h) / 2, w, h };
  }
  let w = Math.min(W * 0.3, 420), h = w / a;
  if (h > H * 0.4) {
    h = H * 0.4;
    w = h * a;
  }
  return { x: W - w - 14, y: H - h - 14, w, h };
}

function layoutFrames() {
  const d = store.get();
  const program = d.project.viewMode === "program";
  const r = programRect(program);
  lastRect = r;
  const css = (el, rr) => Object.assign(el.style, { left: `${rr.x}px`, top: `${rr.y}px`, width: `${rr.w}px`, height: `${rr.h}px` });
  pipFrame.hidden = program || !d.project.pip;
  safeFrame.hidden = !program || !d.project.safeFrame;
  css(pipFrame, r);
  css(safeFrame, r);
}

// ---------- store → scene ----------
function sync(d) {
  const env = d.scene.environment;
  const sig = JSON.stringify(env) + d.project.shading;
  if (sig !== envSig) {
    envSig = sig;
    scene.background = new THREE.Color(env.bg || "#07080d");
    fogObj.color.set(env.bg || "#07080d");
    fogObj.density = env.fog ?? 0.02;
    renderer.toneMappingExposure = env.exposure ?? 1.2;
    hemi.color.set(env.sky || "#26304a");
    hemi.groundColor.set(env.ground || "#150c0c");
    hemi.intensity = (env.ambient ?? 0.2) * 2.4;
    ground.material.roughness = env.wet ? 0.22 : 0.85;
    ground.material.metalness = env.wet ? 0.35 : 0.05;
    ground.material.color.set(env.wet ? "#0d1016" : "#1a1c20");
    ground.material.needsUpdate = true;
    applyShading(d.project.shading || "shaded");
  }
  // studio room: floor pattern + walls + cyclorama replace the endless ground
  const rsig = JSON.stringify(env.room || null);
  if (rsig !== roomSig) {
    roomSig = rsig;
    if (roomObj) {
      world.remove(roomObj);
      roomObj = null;
    }
    if (env.room) {
      roomObj = buildRoom(env.room);
      world.add(roomObj);
    }
    ground.visible = !env.room;
    grid.visible = !env.room;
  }
  // entities
  const live = new Set();
  for (const ent of d.entities) {
    live.add(ent.id);
    const esig = `${d.project.fidelity}|${ent.semanticType}|${ent.proxy.geometry}|${(ent.proxy.dimensions || []).join(",")}|${ent.proxy.color}|${ent.assetRef || ""}|${ent.displayName}`;
    let rec = entityMap.get(ent.id);
    if (!rec || rec.sig !== esig) {
      if (rec) world.remove(rec.obj);
      const obj = ent.assetRef ? buildAsset(ent) : d.project.fidelity === "stylized" ? buildStylized(ent) : buildBlockout(ent);
      obj.userData = { id: ent.id, kind: "entity" };
      const lab = label(ent.displayName, ent.semanticType);
      lab.position.y = (ent.proxy.dimensions?.[1] || 1) * (ent.semanticType === "building" ? 1.02 : 1) + 0.35;
      obj.add(lab);
      world.add(obj);
      rec = { obj, sig: esig };
      entityMap.set(ent.id, rec);
    }
    setHighlight(rec.obj, d.project.selectedKind === "entity" && d.project.selectedId === ent.id);
  }
  for (const [id, rec] of entityMap) if (!live.has(id)) {
    world.remove(rec.obj);
    entityMap.delete(id);
  }
  // lights
  const liveL = new Set();
  for (const l of d.lights) {
    liveL.add(l.id);
    let rec = lightMap.get(l.id);
    if (!rec || rec.type !== l.type || rec.shadow !== !!l.castShadow) {
      if (rec) {
        world.remove(rec.light);
        helpers.remove(rec.marker);
        if (rec.light.target) world.remove(rec.light.target);
      }
      rec = buildLight(l);
      world.add(rec.light);
      if (rec.light.target) world.add(rec.light.target);
      helpers.add(rec.marker);
      lightMap.set(l.id, rec);
    }
    rec.light.color.set(l.color);
    rec.marker.children[0].material.color.set(l.color);
    if (l.type === "spot") {
      rec.light.angle = l.angle ?? 0.55;
      rec.light.penumbra = l.penumbra ?? 0.4;
    }
    if (l.type === "area") {
      rec.light.width = l.width ?? 2;
      rec.light.height = l.height ?? 1;
    }
    if (l.type === "hemisphere") rec.light.groundColor.set(d.scene.environment.ground || "#150c0c");
    rec.marker.children[1].visible = d.project.selectedKind === "light" && d.project.selectedId === l.id;
  }
  for (const [id, rec] of lightMap) if (!liveL.has(id)) {
    world.remove(rec.light);
    helpers.remove(rec.marker);
    if (rec.light.target) world.remove(rec.light.target);
    lightMap.delete(id);
  }
  // camera markers
  const liveC = new Set();
  for (const c of d.cameras) {
    liveC.add(c.id);
    let m = camMap.get(c.id);
    if (!m) {
      m = makeCamMarker(c);
      helpers.add(m);
      camMap.set(c.id, m);
    }
    const isProgram = c.id === d.project.programCameraId;
    m.userData.program = isProgram;
    m.children[0].material.color.set(isProgram ? "#e2b15a" : "#8d93a3");
    m.children[0].material.emissive.set(d.project.selectedKind === "camera" && d.project.selectedId === c.id ? "#4a3510" : "#000000");
    m.userData.frustum.visible = isProgram;
    m.userData.label.material.map = textTexture(`${c.name} · ${c.lens.focalLength}mm`, isProgram ? "#e2b15a" : "#aab0c0");
    m.userData.label.material.needsUpdate = true;
  }
  for (const [id, m] of camMap) if (!liveC.has(id)) {
    helpers.remove(m);
    camMap.delete(id);
  }
  // selection → gizmo
  const selKey = `${d.project.selectedKind}:${d.project.selectedId}:${d.project.viewMode}:${d.project.gizmoMode}`;
  if (selKey !== selSig) {
    selSig = selKey;
    gizmo.setMode(d.project.gizmoMode || "translate");
    let target = null;
    if (d.project.viewMode === "free") {
      if (d.project.selectedKind === "entity") target = entityMap.get(d.project.selectedId)?.obj;
      else if (d.project.selectedKind === "camera") target = camMap.get(d.project.selectedId);
      else if (d.project.selectedKind === "light") target = lightMap.get(d.project.selectedId)?.marker;
    }
    if (target) gizmo.attach(target);
    else gizmo.detach();
  }
  gizmo.showX = gizmo.showY = gizmo.showZ = true;
  if (d.project.selectedKind === "entity" && d.project.gizmoMode === "rotate") gizmo.showX = gizmo.showZ = false;
  orbit.enabled = d.project.viewMode === "free" && !gizmo.dragging;
  programCam.aspect = aspectRatio();
  programCam.updateProjectionMatrix();
  rebuildPaths(d);
  layoutFrames();
}

function applyShading(mode) {
  if (mode === "clay") scene.overrideMaterial = new THREE.MeshStandardMaterial({ color: "#9a9a92", roughness: 0.9 });
  else if (mode === "wire") scene.overrideMaterial = new THREE.MeshBasicMaterial({ color: "#7ad0c8", wireframe: true });
  else scene.overrideMaterial = null;
}

// ---------- per-frame ----------
function tick() {
  const dt = Math.min(clock.getDelta(), 0.1);
  const d = store.get();
  const fps = d.project.fps;
  const shot = d.shots.find((s) => s.id === d.project.currentShotId);
  let playhead = d.project.playhead;

  if (d.project.playing) {
    playhead += dt * fps;
    if (d.project.playSequence) {
      const layout = sequenceLayout(d.shots);
      const total = layout.at(-1)?.end || 0;
      if (playhead >= total) playhead = d.project.loop ? 0 : total;
      const seg = layout.find((x) => playhead >= x.start && playhead < x.end) || layout.at(-1);
      const segShot = d.shots.find((s) => s.id === seg?.shotId);
      store.light((x) => {
        x.project.playhead = playhead;
        if (segShot && x.project.currentShotId !== segShot.id) {
          x.project.currentShotId = segShot.id;
          x.project.programCameraId = segShot.cameraId;
        }
        if (playhead >= total && !x.project.loop) x.project.playing = false;
      });
    } else if (shot) {
      if (playhead >= shot.range.outFrame) {
        if (recording) {
          store.light((x) => {
            x.project.playhead = shot.range.outFrame;
            x.project.playing = false;
          });
          stopRecording();
        } else if (d.project.loop) playhead = shot.range.inFrame + (playhead - shot.range.outFrame);
        else {
          playhead = shot.range.outFrame;
          store.light((x) => {
            x.project.playhead = playhead;
            x.project.playing = false;
          });
        }
      }
      if (d.project.playing) store.light((x) => (x.project.playhead = playhead));
    } else store.light((x) => (x.project.playing = false));
  }
  const d2 = store.get();
  const curShot = d2.shots.find((s) => s.id === d2.project.currentShotId);
  const seqOffset = d2.project.playSequence ? sequenceLayout(d2.shots).find((x) => x.shotId === curShot?.id)?.start || 0 : 0;
  const localFrame = playhead - seqOffset;

  // entities: path + pose
  for (const ent of d2.entities) {
    const rec = entityMap.get(ent.id);
    if (!rec) continue;
    const st = entityStateAt(ent, localFrame);
    rec.obj.position.set(st.position[0], st.position[1], st.position[2]);
    rec.obj.rotation.set(ent.transform.rotation[0], st.yaw ?? ent.transform.rotation[1], ent.transform.rotation[2]);
    rec.obj.scale.set(...ent.transform.scale);
    if (rec.obj.userData.joints) applyPose(rec.obj, ent, localFrame, d2.project.playing);
  }
  // lights: keyframes + attach
  for (const l of d2.lights) {
    const rec = lightMap.get(l.id);
    if (!rec) continue;
    const st = lightStateAt(l, localFrame);
    rec.light.intensity = (l.enabled === false ? 0 : st.intensity) * rec.scale;
    let pos = l.transform.position;
    if (l.attachTo) {
      const host = entityMap.get(l.attachTo)?.obj;
      if (host) {
        const off = V3(l.offset || [0, 1, 0]).applyAxisAngle(new THREE.Vector3(0, 1, 0), host.rotation.y);
        pos = [host.position.x + off.x, host.position.y + off.y, host.position.z + off.z];
      }
    }
    rec.light.position.set(pos[0], pos[1], pos[2]);
    rec.marker.position.copy(rec.light.position);
    if (rec.light.target) {
      const tp = Array.isArray(l.target) ? l.target : entityMap.get(l.target)?.obj.position.toArray() || [0, 0.8, 0];
      if (l.attachTo && Array.isArray(l.target)) {
        const host = entityMap.get(l.attachTo)?.obj;
        if (host) {
          const rel = V3([l.target[0] - l.transform.position[0], l.target[1] - l.transform.position[1], l.target[2] - l.transform.position[2]]).applyAxisAngle(new THREE.Vector3(0, 1, 0), host.rotation.y);
          rec.light.target.position.set(pos[0] + rel.x, pos[1] + rel.y, pos[2] + rel.z);
        }
      } else rec.light.target.position.set(tp[0], tp[1], tp[2]);
      rec.light.target.updateMatrixWorld();
      if (rec.line) {
        const pts = rec.line.geometry.attributes.position.array;
        pts[0] = 0; pts[1] = 0; pts[2] = 0;
        pts[3] = rec.light.target.position.x - pos[0]; pts[4] = rec.light.target.position.y - pos[1]; pts[5] = rec.light.target.position.z - pos[2];
        rec.line.geometry.attributes.position.needsUpdate = true;
      }
    }
    if (l.type === "area") {
      const tp = Array.isArray(l.target) ? l.target : [0, 0.8, 0];
      rec.light.lookAt(tp[0], tp[1], tp[2]);
    }
  }
  // cameras
  for (const c of d2.cameras) {
    const m = camMap.get(c.id);
    if (!m) continue;
    if (gizmo.dragging && gizmo.object === m) continue;
    m.position.set(...c.pose.position);
    orientMarker(m, c, d2, localFrame, curShot);
  }
  // program camera state
  const cam = d2.cameras.find((c) => c.id === d2.project.programCameraId);
  if (cam) {
    const st = curShot && curShot.cameraId === cam.id ? cameraStateAt(d2, curShot, localFrame) : null;
    const pos = st ? st.position : cam.pose.position;
    programCam.position.set(pos[0], pos[1], pos[2]);
    const focal = st ? st.focalLength : cam.lens.focalLength;
    programCam.setFocalLength(focal);
    const look = st ? st.lookAt : targetPoint(cam, d2, localFrame);
    if (look) programCam.lookAt(look[0], look[1], look[2]);
    else programCam.rotation.set(...cam.pose.rotation);
    if (st?.roll) programCam.rotateZ(st.roll);
    const m = camMap.get(cam.id);
    if (m && st && !(gizmo.dragging && gizmo.object === m)) {
      m.position.copy(programCam.position);
      m.quaternion.copy(programCam.quaternion);
    }
  }
  orbit.update();
  render(d2);
  // health
  fpsAcc.frames += 1;
  fpsAcc.t += dt;
  if (fpsAcc.t >= 0.5) {
    const info = renderer.info.render;
    const fpsv = Math.round(fpsAcc.frames / fpsAcc.t);
    fpsAcc = { frames: 0, t: 0 };
    store.light((x) => {
      x.health.fps = fpsv;
      x.health.drawCalls = info.calls;
      x.health.triangles = info.triangles;
    });
  }
  if (recording) recording.frames += 1;
  if (captureQueue.length) {
    const jobs = captureQueue;
    captureQueue = [];
    const url = grabProgram();
    jobs.forEach((fn) => fn(url));
  }
}

function targetPoint(cam, d, frame) {
  const ent = d.entities.find((e) => e.id === cam.target);
  return ent ? subjectPoint(ent, frame, cam.preset) : null;
}

function orientMarker(m, c, d, frame, curShot) {
  const look = targetPoint(c, d, frame);
  if (look) m.lookAt(look[0], look[1], look[2]);
  else m.rotation.set(...c.pose.rotation);
  const f = m.userData.frustum;
  const hfov = 2 * Math.atan(c.lens.sensorWidth / (2 * c.lens.focalLength));
  const a = aspectRatio();
  const depth = 1.6;
  const w = Math.tan(hfov / 2) * depth, h = w / a;
  const pts = f.geometry.attributes.position.array;
  const corners = [[-w, h], [w, h], [w, -h], [-w, -h]];
  let k = 0;
  for (let i = 0; i < 4; i++) {
    pts[k++] = 0; pts[k++] = 0; pts[k++] = 0;
    pts[k++] = corners[i][0]; pts[k++] = corners[i][1]; pts[k++] = depth;
  }
  for (let i = 0; i < 4; i++) {
    const A = corners[i], B = corners[(i + 1) % 4];
    pts[k++] = A[0]; pts[k++] = A[1]; pts[k++] = depth;
    pts[k++] = B[0]; pts[k++] = B[1]; pts[k++] = depth;
  }
  f.geometry.attributes.position.needsUpdate = true;
}

function render(d) {
  const W = canvas.width, H = canvas.height;
  const dpr = renderer.getPixelRatio();
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, W / dpr, H / dpr);
  renderer.setClearColor("#000000", 1);
  renderer.clear();
  if (d.project.viewMode === "program") {
    const r = lastRect;
    renderer.setScissorTest(true);
    renderer.setViewport(r.x, host.clientHeight - r.y - r.h, r.w, r.h);
    renderer.setScissor(r.x, host.clientHeight - r.y - r.h, r.w, r.h);
    renderer.clear();
    renderer.render(scene, programCam);
    renderer.setScissorTest(false);
    return;
  }
  renderer.render(scene, freeCam);
  if (d.project.pip && d.cameras.length) {
    const r = lastRect;
    renderer.setScissorTest(true);
    renderer.setViewport(r.x, host.clientHeight - r.y - r.h, r.w, r.h);
    renderer.setScissor(r.x, host.clientHeight - r.y - r.h, r.w, r.h);
    renderer.clear();
    renderer.render(scene, programCam);
    renderer.setScissorTest(false);
  }
}

// Render the program frame full-canvas (letterboxed) and return a JPEG data URL cropped to the frame.
function grabProgram() {
  const r = programRect(true);
  const dpr = renderer.getPixelRatio();
  renderer.setScissorTest(false);
  renderer.setClearColor("#000000", 1);
  renderer.clear();
  renderer.setScissorTest(true);
  renderer.setViewport(r.x, host.clientHeight - r.y - r.h, r.w, r.h);
  renderer.setScissor(r.x, host.clientHeight - r.y - r.h, r.w, r.h);
  renderer.render(scene, programCam);
  renderer.setScissorTest(false);
  const out = document.createElement("canvas");
  const scale = Math.min(1, 640 / (r.w * dpr));
  out.width = Math.round(r.w * dpr * scale);
  out.height = Math.round(r.h * dpr * scale);
  out.getContext("2d").drawImage(canvas, r.x * dpr, r.y * dpr, r.w * dpr, r.h * dpr, 0, 0, out.width, out.height);
  return out.toDataURL("image/jpeg", 0.72);
}

export function captureProgramFrame() {
  return new Promise((res) => captureQueue.push(res));
}

// ---------- recorder (MediaRecorder proxy video) ----------
const recorderHook = {
  start(take, shot) {
    stopRecording(true);
    const fps = store.get().project.fps;
    let rec = null, chunks = [];
    try {
      const stream = canvas.captureStream(fps);
      const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"].find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
      if (mime) {
        rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
        rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        rec.start(120);
      }
    } catch (err) {
      console.warn("MediaRecorder unavailable", err);
    }
    recording = { takeId: take.id, shotId: shot.id, rec, chunks, frames: 0, expected: shot.range.outFrame - shot.range.inFrame, thumb: null, mime: rec?.mimeType || null, started: performance.now() };
    store.light((x) => (x.health.recorder = rec ? "rolling" : "snapshot-only"));
    captureProgramFrame().then((url) => recording && (recording.thumb = url));
  },
  stop(id) {
    if (recording && (!id || recording.takeId === id)) stopRecording();
  },
};

function stopRecording(abort = false) {
  const r = recording;
  if (!r) return;
  recording = null;
  store.light((x) => (x.health.recorder = "idle"));
  const finish = (videoUrl) => {
    if (abort) return;
    const seconds = (performance.now() - r.started) / 1000;
    dispatch("take.finish", { id: r.takeId, videoUrl, thumbnail: r.thumb, frames: r.frames, droppedFrames: Math.max(0, Math.round(r.expected - r.frames)), log: [{ t: 0, msg: "roll" }, { t: r.frames, msg: `stop · ${seconds.toFixed(1)}s wall · ${r.mime || "no encoder"}` }] }, { source: "system", actorId: "recorder" });
  };
  if (r.rec && r.rec.state !== "inactive") {
    r.rec.onstop = () => finish(r.chunks.length ? URL.createObjectURL(new Blob(r.chunks, { type: r.mime })) : null);
    r.rec.stop();
  } else finish(null);
}

// ---------- interaction ----------
function onPointerUp(e) {
  const pd = pointerDown;
  pointerDown = null;
  if (!pd || pd.b !== 0 || gizmo.dragging) return;
  if (Math.hypot(e.clientX - pd.x, e.clientY - pd.y) > 5 || performance.now() - pd.t > 600) return;
  const d = store.get();
  const rect = canvas.getBoundingClientRect();
  const p = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
  const cam = d.project.viewMode === "free" ? freeCam : programCam;
  raycaster.setFromCamera(p, cam);
  const pool = [...[...entityMap.values()].map((r) => r.obj), ...(d.project.viewMode === "free" ? [...camMap.values(), ...[...lightMap.values()].map((r) => r.marker)] : [])];
  const hits = raycaster.intersectObjects(pool, true).filter((h) => !(h.object.isSprite));
  let obj = hits[0]?.object;
  while (obj && !obj.userData.kind) obj = obj.parent;
  if (obj?.userData.kind) dispatch("project.select", { kind: obj.userData.kind, id: obj.userData.id }, { source: "human", silent: true });
  else if (d.project.selectedId) dispatch("project.select", { kind: null, id: null }, { source: "human", silent: true });
}

function onDblClick() {
  const d = store.get();
  if (d.project.selectedKind === "camera") dispatch("camera.pilot", { id: d.project.selectedId });
  else if (d.project.selectedKind === "entity") focusSelected();
}

function commitGizmo() {
  const d = store.get();
  const o = gizmo.object;
  if (!o) return;
  const pos = [+o.position.x.toFixed(3), +o.position.y.toFixed(3), +o.position.z.toFixed(3)];
  const rot = [+o.rotation.x.toFixed(3), +o.rotation.y.toFixed(3), +o.rotation.z.toFixed(3)];
  const mode = d.project.gizmoMode;
  if (o.userData.kind === "entity") {
    if (mode === "scale") dispatch("entity.transform", { id: o.userData.id, scale: [+o.scale.x.toFixed(3), +o.scale.y.toFixed(3), +o.scale.z.toFixed(3)] });
    else if (mode === "rotate") dispatch("entity.transform", { id: o.userData.id, yaw: rot[1] });
    else dispatch("entity.transform", { id: o.userData.id, position: pos });
  } else if (o.userData.kind === "camera") {
    const cam = d.cameras.find((c) => c.id === o.userData.id);
    if (mode === "rotate" && cam && !cam.target) dispatch("camera.transform", { id: cam.id, rotation: rot });
    else dispatch("camera.transform", { id: o.userData.id, position: pos });
  } else if (o.userData.kind === "light") dispatch("light.update", { id: o.userData.id, position: pos });
}

export function focusSelected() {
  const d = store.get();
  let p = null;
  if (d.project.selectedKind === "entity") p = entityMap.get(d.project.selectedId)?.obj.position;
  if (d.project.selectedKind === "camera") p = camMap.get(d.project.selectedId)?.position;
  if (d.project.selectedKind === "light") p = lightMap.get(d.project.selectedId)?.marker.position;
  if (!p) return;
  orbit.target.set(p.x, p.y + 0.8, p.z);
  const dir = new THREE.Vector3().subVectors(freeCam.position, orbit.target).setLength(7);
  freeCam.position.copy(orbit.target).add(dir);
}

export function resetView() {
  freeCam.position.set(13, 6.5, 15);
  orbit.target.set(0, 1, 0);
}

// ---------- builders ----------
function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.05, ...opts });
}
function mesh(geo, m, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(...pos);
  o.rotation.set(...rot);
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
}

function buildBlockout(ent) {
  const g = new THREE.Group();
  const [w, h, dd] = ent.proxy.dimensions || [1, 1, 1];
  const t = ent.semanticType;
  const m = mat(ent.proxy.color || "#888", { roughness: t === "vehicle" ? 0.45 : 0.7, metalness: t === "vehicle" ? 0.5 : 0.05, transparent: t === "smoke", opacity: t === "smoke" ? 0.35 : 1 });
  const geo = ent.proxy.geometry;
  if (geo === "cylinder") g.add(mesh(new THREE.CylinderGeometry(w / 2, w / 2, h, 20), m, [0, h / 2, 0]));
  else if (geo === "capsule") g.add(mesh(new THREE.CapsuleGeometry(w / 2, Math.max(0.01, h - w), 6, 12), m, [0, h / 2, 0]));
  else if (geo === "sphere") {
    const s = mesh(new THREE.SphereGeometry(0.5, 20, 14), m, [0, h / 2, 0]);
    s.scale.set(w, h, dd);
    g.add(s);
  } else if (geo === "cone") {
    if (t === "weapon") g.add(mesh(new THREE.ConeGeometry(w / 2, h, 10), m, [0, 0, 0], [Math.PI / 2, 0, 0]));
    else g.add(mesh(new THREE.ConeGeometry(w / 2, h, 12), m, [0, h / 2, 0]));
  } else if (geo === "plane") g.add(mesh(new THREE.BoxGeometry(w, 0.02, dd), mat(ent.proxy.color, { roughness: 0.3, metalness: 0.2 }), [0, 0.01, 0]));
  else g.add(mesh(new THREE.BoxGeometry(w, h, dd), m, [0, h / 2, 0]));
  // orientation tick so blocking still shows where a person / car is facing
  if (t === "character") g.add(mesh(new THREE.BoxGeometry(0.08, 0.08, 0.1), mat("#2a2622"), [0, h * 0.86, w / 2]));
  if (t === "vehicle") g.add(mesh(new THREE.BoxGeometry(w * 0.6, 0.06, 0.12), new THREE.MeshBasicMaterial({ color: "#fff2c4" }), [0, h * 0.35, dd / 2 + 0.01]));
  return g;
}

// glTF model (library or any URL). The blockout stays as a translucent placeholder until the model arrives,
// then the model is scaled to the entity's height and grounded — semantic id / transform / shot refs never change.
function buildAsset(ent) {
  const g = buildBlockout(ent);
  g.traverse((o) => {
    if (o.isMesh && o.material) {
      o.material = o.material.clone();
      o.material.transparent = true;
      o.material.opacity = 0.25;
    }
  });
  const url = /^(https?:|\/|data:)/.test(ent.assetRef) ? ent.assetRef : new URL(`../vendor/${ent.assetRef}`, import.meta.url).toString();
  if (!gltfCache.has(url)) gltfCache.set(url, new Promise((res, rej) => gltfLoader.load(url, (gltf) => res(gltf.scene), undefined, rej)));
  gltfCache
    .get(url)
    .then((proto) => {
      const model = proto.clone(true);
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      const [w, h] = ent.proxy.dimensions || [1, 1, 1];
      const s = size.y > 1e-6 ? h / size.y : 1;
      model.scale.setScalar(s);
      const box2 = new THREE.Box3().setFromObject(model);
      const c = new THREE.Vector3();
      box2.getCenter(c);
      model.position.set(-c.x, -box2.min.y, -c.z);
      model.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          o.userData.pickId = ent.id;
        }
      });
      // drop the placeholder meshes, keep the label
      [...g.children].filter((o) => o.isMesh).forEach((o) => g.remove(o));
      g.add(model);
      g.userData.asset = url;
    })
    .catch((err) => console.warn("glTF load failed", url, err));
  return g;
}

function patternTexture(pattern, spacing, w, d, color) {
  const px = 64;
  const cw = Math.max(64, Math.round((w / spacing) * px)), ch = Math.max(64, Math.round((d / spacing) * px));
  const cv = document.createElement("canvas");
  cv.width = Math.min(4096, cw);
  cv.height = Math.min(4096, ch);
  const ctx = cv.getContext("2d");
  const nx = Math.round(w / spacing), nz = Math.round(d / spacing);
  const sx = cv.width / nx, sz = cv.height / nz;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, cv.width, cv.height);
  if (pattern === "standard") {
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) if ((i + j) % 2) {
      ctx.fillStyle = "#c9c9ce";
      ctx.fillRect(i * sx, j * sz, sx, sz);
    }
  } else if (pattern === "calibration") {
    ctx.strokeStyle = "#8a8a92";
    ctx.lineWidth = 2;
    for (let i = 0; i <= nx; i++) {
      ctx.beginPath();
      ctx.moveTo(i * sx, 0);
      ctx.lineTo(i * sx, cv.height);
      ctx.stroke();
    }
    for (let j = 0; j <= nz; j++) {
      ctx.beginPath();
      ctx.moveTo(0, j * sz);
      ctx.lineTo(cv.width, j * sz);
      ctx.stroke();
    }
    ctx.fillStyle = "#e0453a";
    ctx.beginPath();
    ctx.arc(cv.width / 2, cv.height / 2, Math.min(sx, sz) * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function buildRoom(room) {
  const w = Math.max(1, room.width || 8), dd = Math.max(1, room.depth || 12), h = Math.max(1, room.height || 4);
  const color = room.color || "#e9e9ec";
  const g = new THREE.Group();
  const floorMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.85, metalness: 0.02, map: patternTexture(room.pattern || "standard", Math.max(0.05, room.spacing || 1), w, dd, color) });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, dd), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);
  const wallMat = new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, side: THREE.DoubleSide });
  if (room.walls !== false) {
    if (room.cyc !== false) {
      // cyclorama: quarter-round between floor and back wall so the horizon disappears
      const r = Math.min(1.2, h * 0.3);
      const cyc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 24, 1, true, 0, Math.PI / 2), wallMat);
      cyc.rotation.z = Math.PI / 2;
      cyc.rotation.y = Math.PI;
      cyc.position.set(0, r, -dd / 2 + r);
      cyc.receiveShadow = true;
      g.add(cyc);
      const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h - r), wallMat);
      back.position.set(0, r + (h - r) / 2, -dd / 2);
      back.receiveShadow = true;
      g.add(back);
    } else {
      const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
      back.position.set(0, h / 2, -dd / 2);
      g.add(back);
    }
    for (const sx of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.PlaneGeometry(dd, h), wallMat);
      side.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
      side.position.set((sx * w) / 2, h / 2, 0);
      side.receiveShadow = true;
      g.add(side);
    }
  }
  g.traverse((o) => (o.userData.room = true));
  return g;
}

function buildStylized(ent) {
  const t = ent.semanticType;
  const color = ent.proxy.color || "#888";
  const [w, h, dd] = ent.proxy.dimensions || [1, 1, 1];
  const g = new THREE.Group();
  if (t === "character") return buildHumanoid(ent);
  if (t === "vehicle") {
    const body = mat(color, { roughness: 0.35, metalness: 0.6 });
    const glass = mat("#0f1a26", { roughness: 0.1, metalness: 0.8 });
    const rubber = mat("#111", { roughness: 0.95 });
    g.add(mesh(new THREE.BoxGeometry(w, h * 0.42, dd), body, [0, 0.28 + h * 0.21, 0]));
    g.add(mesh(new THREE.BoxGeometry(w * 0.86, h * 0.4, dd * 0.48), glass, [0, 0.28 + h * 0.42 + h * 0.2, -dd * 0.08]));
    g.add(mesh(new THREE.BoxGeometry(w * 0.9, h * 0.12, dd * 0.24), body, [0, 0.28 + h * 0.45, dd * 0.32]));
    const wheelR = 0.32;
    for (const [x, z] of [[w / 2 - 0.05, dd * 0.32], [-w / 2 + 0.05, dd * 0.32], [w / 2 - 0.05, -dd * 0.32], [-w / 2 + 0.05, -dd * 0.32]]) g.add(mesh(new THREE.CylinderGeometry(wheelR, wheelR, 0.24, 16), rubber, [x, wheelR, z], [0, 0, Math.PI / 2]));
    const head = new THREE.MeshBasicMaterial({ color: "#fff2c4" });
    const tail = new THREE.MeshBasicMaterial({ color: "#ff2a3a" });
    g.add(mesh(new THREE.BoxGeometry(0.28, 0.12, 0.06), head, [w * 0.32, 0.28 + h * 0.3, dd / 2 + 0.02]));
    g.add(mesh(new THREE.BoxGeometry(0.28, 0.12, 0.06), head, [-w * 0.32, 0.28 + h * 0.3, dd / 2 + 0.02]));
    g.add(mesh(new THREE.BoxGeometry(0.3, 0.1, 0.06), tail, [w * 0.32, 0.28 + h * 0.3, -dd / 2 - 0.02]));
    g.add(mesh(new THREE.BoxGeometry(0.3, 0.1, 0.06), tail, [-w * 0.32, 0.28 + h * 0.3, -dd / 2 - 0.02]));
    return g;
  }
  if (t === "building") {
    g.add(mesh(new THREE.BoxGeometry(w, h, dd), mat(color, { roughness: 0.85 }), [0, h / 2, 0]));
    g.add(mesh(new THREE.BoxGeometry(w * 1.04, 0.3, dd * 1.04), mat("#22252b"), [0, h + 0.15, 0]));
    const win = new THREE.MeshStandardMaterial({ color: "#8fd8d0", emissive: "#2f7a80", emissiveIntensity: 1.2 });
    const winDark = mat("#141922");
    const cols = Math.max(2, Math.floor(w / 1.6)), rows = Math.max(2, Math.floor(h / 2.4));
    const faces = [[0, 0, dd / 2 + 0.02, 0], [0, 0, -dd / 2 - 0.02, Math.PI], [w / 2 + 0.02, 0, 0, Math.PI / 2], [-w / 2 - 0.02, 0, 0, -Math.PI / 2]];
    for (const [fx, , fz, ry] of faces) {
      const span = ry === 0 || ry === Math.PI ? w : dd;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const lit = ((r * 7 + c * 3 + ent.id.length) % 5) < 3;
        const wm = mesh(new THREE.BoxGeometry(0.7, 1.0, 0.04), lit ? win : winDark, [0, 0, 0]);
        const u = (c + 0.5) / cols - 0.5;
        wm.position.set(fx + (ry === 0 || ry === Math.PI ? u * span * 0.9 : 0), 1.6 + r * (h - 2.4) / Math.max(1, rows - 1), fz + (ry === 0 || ry === Math.PI ? 0 : u * span * 0.9));
        wm.rotation.y = ry;
        wm.castShadow = false;
        g.add(wm);
      }
    }
    return g;
  }
  if (t === "tree") {
    g.add(mesh(new THREE.CylinderGeometry(0.12, 0.18, h * 0.45, 10), mat("#4a3524", { roughness: 0.9 }), [0, h * 0.225, 0]));
    const leaf = mat(color, { roughness: 0.9 });
    g.add(mesh(new THREE.SphereGeometry(w * 0.55, 12, 10), leaf, [0, h * 0.62, 0]));
    g.add(mesh(new THREE.SphereGeometry(w * 0.4, 12, 10), leaf, [w * 0.3, h * 0.5, 0.1]));
    g.add(mesh(new THREE.SphereGeometry(w * 0.38, 12, 10), leaf, [-w * 0.28, h * 0.55, -0.15]));
    return g;
  }
  if (t === "lamp") {
    g.add(mesh(new THREE.CylinderGeometry(0.06, 0.09, h, 10), mat("#3a3d44", { metalness: 0.6, roughness: 0.4 }), [0, h / 2, 0]));
    g.add(mesh(new THREE.BoxGeometry(0.08, 0.08, 1.2), mat("#3a3d44"), [0, h - 0.1, 0.6]));
    g.add(mesh(new THREE.BoxGeometry(0.32, 0.12, 0.5), new THREE.MeshStandardMaterial({ color: "#ffe6b0", emissive: "#ffcf7a", emissiveIntensity: 2.2 }), [0, h - 0.18, 1.15]));
    return g;
  }
  if (t === "weapon") {
    const gm = mat("#2b2b2e", { metalness: 0.6, roughness: 0.4 });
    g.add(mesh(new THREE.BoxGeometry(0.035, 0.04, 0.22), gm, [0, 0.02, 0.06]));
    g.add(mesh(new THREE.BoxGeometry(0.03, 0.11, 0.04), gm, [0, -0.045, -0.03], [0.25, 0, 0]));
    return g;
  }
  if (t === "smoke") {
    const sm = mat("#9a9a9a", { transparent: true, opacity: 0.28, roughness: 1 });
    for (const [x, y, z, r] of [[0, h * 0.4, 0, 0.5], [w * 0.3, h * 0.55, 0.2, 0.42], [-w * 0.28, h * 0.5, -0.2, 0.4], [0.1, h * 0.85, -0.3, 0.36]]) {
      const s = mesh(new THREE.SphereGeometry(r, 12, 10), sm, [x, y, z]);
      s.scale.set(w, h, dd);
      s.castShadow = false;
      g.add(s);
    }
    return g;
  }
  if (t === "flower") {
    g.add(mesh(new THREE.CylinderGeometry(0.02, 0.025, h * 0.8, 6), mat("#3f6b34"), [0, h * 0.4, 0]));
    g.add(mesh(new THREE.SphereGeometry(w * 0.4, 10, 8), mat(color), [0, h * 0.85, 0]));
    return g;
  }
  return buildBlockout(ent);
}

function buildHumanoid(ent) {
  const s = (ent.proxy.dimensions?.[1] || 1.75) / 1.75;
  const color = ent.proxy.color || "#c9b79b";
  const cloth = mat(color, { roughness: 0.8 });
  const skin = mat(new THREE.Color(color).offsetHSL(0, 0.05, 0.12), { roughness: 0.7 });
  const dark = mat(new THREE.Color(color).offsetHSL(0, -0.1, -0.28), { roughness: 0.85 });
  const g = new THREE.Group();
  const J = {};
  const hips = new THREE.Group();
  hips.position.set(0, 0.95 * s, 0);
  g.add(hips);
  hips.add(mesh(new THREE.SphereGeometry(0.15 * s, 10, 8), dark, [0, 0.02 * s, 0]));
  const spine = new THREE.Group();
  hips.add(spine);
  J.spine = spine;
  spine.add(mesh(new THREE.CapsuleGeometry(0.17 * s, 0.34 * s, 6, 12), cloth, [0, 0.33 * s, 0]));
  spine.add(mesh(new THREE.BoxGeometry(0.42 * s, 0.14 * s, 0.24 * s), cloth, [0, 0.52 * s, 0]));
  const neck = new THREE.Group();
  neck.position.set(0, 0.64 * s, 0);
  spine.add(neck);
  J.head = neck;
  neck.add(mesh(new THREE.CylinderGeometry(0.05 * s, 0.05 * s, 0.08 * s, 8), skin, [0, 0.02 * s, 0]));
  neck.add(mesh(new THREE.SphereGeometry(0.125 * s, 14, 12), skin, [0, 0.16 * s, 0]));
  neck.add(mesh(new THREE.BoxGeometry(0.05 * s, 0.03 * s, 0.05 * s), dark, [0, 0.15 * s, 0.12 * s])); // nose → facing +Z
  const arm = (side) => {
    const sh = new THREE.Group();
    sh.position.set(side * 0.24 * s, 0.55 * s, 0);
    spine.add(sh);
    sh.add(mesh(new THREE.CapsuleGeometry(0.05 * s, 0.24 * s, 4, 8), cloth, [0, -0.15 * s, 0]));
    const el = new THREE.Group();
    el.position.set(0, -0.3 * s, 0);
    sh.add(el);
    el.add(mesh(new THREE.CapsuleGeometry(0.045 * s, 0.22 * s, 4, 8), skin, [0, -0.14 * s, 0]));
    el.add(mesh(new THREE.SphereGeometry(0.05 * s, 8, 6), skin, [0, -0.3 * s, 0]));
    return { sh, el };
  };
  const L = arm(-1), R = arm(1);
  J.lShoulder = L.sh; J.lElbow = L.el; J.rShoulder = R.sh; J.rElbow = R.el;
  const leg = (side) => {
    const hp = new THREE.Group();
    hp.position.set(side * 0.1 * s, 0, 0);
    hips.add(hp);
    hp.add(mesh(new THREE.CapsuleGeometry(0.07 * s, 0.32 * s, 4, 8), dark, [0, -0.22 * s, 0]));
    const kn = new THREE.Group();
    kn.position.set(0, -0.45 * s, 0);
    hp.add(kn);
    kn.add(mesh(new THREE.CapsuleGeometry(0.06 * s, 0.3 * s, 4, 8), dark, [0, -0.22 * s, 0]));
    kn.add(mesh(new THREE.BoxGeometry(0.1 * s, 0.06 * s, 0.24 * s), dark, [0, -0.46 * s, 0.05 * s]));
    return { hp, kn };
  };
  const LL = leg(-1), RL = leg(1);
  J.lHip = LL.hp; J.lKnee = LL.kn; J.rHip = RL.hp; J.rKnee = RL.kn;
  g.userData.joints = J;
  g.userData.hips = hips;
  g.userData.scale = s;
  return g;
}

function applyPose(obj, ent, frame, playing) {
  const J = obj.userData.joints;
  const j = { ...(ent.joints || {}) };
  const gait = gaitOffsets(ent, frame);
  if (gait) for (const k of Object.keys(gait)) j[k] = (j[k] || 0) + gait[k];
  J.head.rotation.set(j.headPitch || 0, j.headYaw || 0, 0);
  J.spine.rotation.x = j.spine || 0;
  J.lShoulder.rotation.x = -(j.lShoulder || 0);
  J.rShoulder.rotation.x = -(j.rShoulder || 0);
  J.lElbow.rotation.x = -(j.lElbow || 0);
  J.rElbow.rotation.x = -(j.rElbow || 0);
  J.lHip.rotation.x = -(j.lHip || 0);
  J.rHip.rotation.x = -(j.rHip || 0);
  J.lKnee.rotation.x = j.lKnee || 0;
  J.rKnee.rotation.x = j.rKnee || 0;
  // sitting / crouching lowers the hips
  const sit = Math.max(j.lHip || 0, j.rHip || 0), knee = Math.max(j.lKnee || 0, j.rKnee || 0);
  const drop = ent.pose === "sit" || ent.pose === "drive" ? 0.42 : ent.pose === "crouch" ? 0.35 : ent.pose === "fall" ? 0.5 : Math.max(0, (knee - 0.9) * 0.25 + (sit > 1.3 ? 0.2 : 0));
  obj.userData.hips.position.y = (0.95 - drop) * obj.userData.scale;
  obj.userData.hips.rotation.x = ent.pose === "fall" ? 1.2 : 0;
  void playing;
}

function buildLight(l) {
  let light, scale = 1;
  if (l.type === "directional") {
    light = new THREE.DirectionalLight(l.color, l.intensity);
    light.castShadow = !!l.castShadow;
    light.shadow.camera.left = light.shadow.camera.bottom = -40;
    light.shadow.camera.right = light.shadow.camera.top = 40;
    light.shadow.camera.far = 120;
    light.shadow.mapSize.set(2048, 2048);
    light.shadow.bias = -0.0008;
  } else if (l.type === "spot") {
    light = new THREE.SpotLight(l.color, l.intensity, 0, l.angle ?? 0.55, l.penumbra ?? 0.4, 1);
    light.castShadow = !!l.castShadow;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.bias = -0.0005;
    scale = 3;
  } else if (l.type === "area") {
    light = new THREE.RectAreaLight(l.color, l.intensity, l.width ?? 2, l.height ?? 1);
    scale = 1;
  } else if (l.type === "hemisphere") {
    light = new THREE.HemisphereLight(l.color, "#150c0c", l.intensity);
  } else {
    light = new THREE.PointLight(l.color, l.intensity, 0, 1);
    scale = 3;
  }
  light.position.set(...l.transform.position);
  const marker = new THREE.Group();
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshBasicMaterial({ color: l.color }));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 6, 24), new THREE.MeshBasicMaterial({ color: "#e2b15a" }));
  ring.visible = false;
  marker.add(bulb, ring);
  let line = null;
  if (light.target) {
    line = new THREE.Line(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3)), new THREE.LineDashedMaterial({ color: l.color, dashSize: 0.3, gapSize: 0.15, transparent: true, opacity: 0.6 }));
    marker.add(line);
  }
  if (l.type === "area") {
    const h = new RectAreaLightHelper(light);
    h.traverse((o) => o.layers.set(HELPER_LAYER));
    light.add(h);
  }
  marker.traverse((o) => o.layers.set(HELPER_LAYER));
  marker.userData = { id: l.id, kind: "light" };
  return { light, marker, line, type: l.type, shadow: !!l.castShadow, scale };
}

function makeCamMarker(c) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.34), new THREE.MeshStandardMaterial({ color: "#d7c38a", emissive: "#000000" }));
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.18, 12), new THREE.MeshStandardMaterial({ color: "#1b1b1f", metalness: 0.5 }));
  lens.rotation.x = Math.PI / 2;
  lens.position.z = 0.25;
  const frustum = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array(16 * 3), 3)), new THREE.LineBasicMaterial({ color: "#e2b15a", transparent: true, opacity: 0.55 }));
  const lab = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTexture(c.name, "#e2b15a"), transparent: true, depthTest: false }));
  lab.scale.set(2.2, 0.55, 1);
  lab.position.y = 0.45;
  g.add(body, lens, frustum, lab);
  g.traverse((o) => o.layers.set(HELPER_LAYER));
  g.userData = { id: c.id, kind: "camera", frustum, label: lab };
  return g;
}

function textTexture(text, color = "#e7d7a6") {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "rgba(8,9,12,0.7)";
  ctx.roundRect(24, 34, 464, 60, 12);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.font = "600 34px 'IBM Plex Sans', 'PingFang SC', 'Noto Sans SC', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(text).slice(0, 22), 256, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function label(text, type) {
  const colors = { character: "#e7d7a6", vehicle: "#9fd3ff", weapon: "#ff9a9a", building: "#aab0c0", lamp: "#ffe3a3" };
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTexture(text, colors[type] || "#cfd3dc"), transparent: true, depthTest: false }));
  s.scale.set(2.4, 0.6, 1);
  s.layers.set(HELPER_LAYER);
  return s;
}

function setHighlight(obj, on) {
  if (obj.userData.hl === on) return;
  obj.userData.hl = on;
  obj.traverse((ch) => {
    if (ch.isMesh && ch.material && ch.material.emissive && !ch.userData.emissiveLocked) {
      if (!ch.userData.baseEmissive) ch.userData.baseEmissive = ch.material.emissive.clone();
      ch.material.emissive.copy(on ? new THREE.Color("#5a4118") : ch.userData.baseEmissive);
    }
  });
  let box = obj.getObjectByName("selbox");
  if (on && !box) {
    box = new THREE.BoxHelper(obj, "#e2b15a");
    box.name = "selbox";
    box.layers.set(HELPER_LAYER);
    helpers.add(box);
    obj.userData.selbox = box;
  }
  if (!on && obj.userData.selbox) {
    helpers.remove(obj.userData.selbox);
    obj.userData.selbox = null;
  }
  if (on && obj.userData.selbox) obj.userData.selbox.update();
}

function rebuildPaths(d) {
  for (const k of ["motion", "keys"]) if (pathLines[k]) {
    helpers.remove(pathLines[k]);
    pathLines[k] = null;
  }
  pathLines.entity.forEach((l) => helpers.remove(l));
  pathLines.entity = [];
  const shot = d.shots.find((s) => s.id === d.project.currentShotId);
  if (shot) {
    const pts = [];
    const n = Math.max(8, Math.min(120, shot.range.outFrame - shot.range.inFrame));
    for (let i = 0; i <= n; i++) {
      const f = shot.range.inFrame + ((shot.range.outFrame - shot.range.inFrame) * i) / n;
      const st = cameraStateAt(d, shot, f);
      if (st) pts.push(V3(st.position));
    }
    if (pts.length > 1) {
      pathLines.motion = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: "#e2b15a", transparent: true, opacity: 0.7 }));
      pathLines.motion.layers.set(HELPER_LAYER);
      helpers.add(pathLines.motion);
    }
    if (shot.keyframes?.length) {
      const g = new THREE.Group();
      for (const k of shot.keyframes) {
        const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), new THREE.MeshBasicMaterial({ color: "#7ad0c8" }));
        s.position.set(...k.position);
        g.add(s);
      }
      g.traverse((o) => o.layers.set(HELPER_LAYER));
      pathLines.keys = g;
      helpers.add(g);
    }
  }
  for (const e of d.entities) if (e.path?.length > 1) {
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(e.path.map((k) => V3([k.position[0], k.position[1] + 0.05, k.position[2]]))), new THREE.LineDashedMaterial({ color: "#7ad0c8", dashSize: 0.5, gapSize: 0.25 }));
    l.computeLineDistances();
    l.layers.set(HELPER_LAYER);
    helpers.add(l);
    pathLines.entity.push(l);
  }
}

// selection helpers exposed for UI
export function programCameraObject() {
  return programCam;
}
