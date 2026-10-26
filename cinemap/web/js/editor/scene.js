// Three.js stage: renderer, camera, orbit, lights that follow the world clock, ground, water,
// hill, roads, and a registry of item groups with picking.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { build, buildAsset, MATS } from './kit.js';
import { groundY as sharedGroundY, riverX } from '/shared/worldgen.js';

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe9eaec);
  scene.fog = new THREE.Fog(0xe9eaec, 260, 900);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 4000);
  camera.position.set(140, 110, 190);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.47;
  controls.minDistance = 12;
  controls.maxDistance = 900;
  controls.target.set(0, 0, 0);
  const hemi = new THREE.HemisphereLight(0xf4f7ff, 0xd8dccf, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff6e6, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -320;
  sun.shadow.camera.right = sun.shadow.camera.top = 320;
  sun.shadow.camera.far = 1200;
  sun.shadow.bias = -0.0008;
  scene.add(sun, sun.target);
  const world = new THREE.Group();
  scene.add(world);
  const itemsGroup = new THREE.Group();
  scene.add(itemsGroup);
  const items = new Map();
  let groundMesh = null, waterMesh = null, size = 512;

  function buildGround(env, settings) {
    world.clear();
    size = env.size;
    const half = size / 2;
    const base = { grass: 0xdde7cc, forest: 0xcedbc6, sand: 0xe8dec8, clay: 0xe6d2c3, snow: 0xeff2f0, water: 0xc8dde8, city: 0xe5e5e0, warm: 0xf2ece1, white: 0xf7f7f4, grey: 0xe1e2df };
    const auto = env.snow ? 'snow' : env.sand ? 'sand' : 'grass';
    const colorKey = settings.backdrop === 'auto' ? auto : settings.backdrop;
    const ground = new THREE.Mesh(new THREE.BoxGeometry(size, 8, size), new THREE.MeshStandardMaterial({ color: base[colorKey] ?? base.grass, roughness: 1 }));
    ground.position.y = -4;
    ground.receiveShadow = true;
    world.add(ground);
    groundMesh = ground;
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(size + 0.2, 7.6, size + 0.2), new THREE.MeshStandardMaterial({ color: 0xcfd1cb, roughness: 1 }));
    skirt.position.y = -4.3;
    world.add(skirt);
    waterMesh = null;
    if (env.water) {
      const wm = new THREE.MeshStandardMaterial({ color: 0xbfd7e6, roughness: 0.55, metalness: 0.05, transparent: true, opacity: 0.92 });
      if (env.water.kind === 'sea') {
        const w = half + env.water.at;
        const sea = new THREE.Mesh(new THREE.BoxGeometry(w, 1.2, size), wm);
        sea.position.set(-half + w / 2, 0.2, 0);
        world.add(sea);
        waterMesh = sea;
        const quay = new THREE.Mesh(new THREE.BoxGeometry(6, 2.4, size), MATS.rock);
        quay.position.set(env.water.at + 3, 1.2, 0);
        quay.receiveShadow = true;
        world.add(quay);
        const pier = new THREE.Mesh(new THREE.BoxGeometry(36, 0.6, 4), MATS.wood);
        pier.position.set(env.water.at - 18, 1.5, 24);
        pier.castShadow = true;
        world.add(pier);
        for (let i = 0; i < 6; i++) {
          const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3, 6), MATS.wood);
          pile.position.set(env.water.at - 4 - i * 6, 0.6, 22.5 + (i % 2) * 3);
          world.add(pile);
        }
      } else if (env.water.kind === 'river') {
        const pts = [];
        for (let z = -half; z <= half; z += 8) pts.push(new THREE.Vector3(riverX(env.water, z), 0.3, z));
        const curve = new THREE.CatmullRomCurve3(pts);
        const geo = new THREE.TubeGeometry(curve, 80, env.water.w, 6, false);
        geo.scale(1, 0.12, 1);
        const river = new THREE.Mesh(geo, wm);
        river.position.y = 0.4;
        world.add(river);
        waterMesh = river;
      } else if (env.water.kind === 'lake') {
        const lake = new THREE.Mesh(new THREE.CylinderGeometry(env.water.r, env.water.r, 1, 40), wm);
        lake.position.set(env.water.x, 0.2, env.water.z);
        world.add(lake);
        waterMesh = lake;
      } else if (env.water.kind === 'island') {
        const sea = new THREE.Mesh(new THREE.BoxGeometry(size, 1.2, size), wm);
        sea.position.y = 0.3;
        world.add(sea);
        waterMesh = sea;
        const isle = new THREE.Mesh(new THREE.CylinderGeometry(env.water.r, env.water.r + 10, 2.4, 48), new THREE.MeshStandardMaterial({ color: base[colorKey] ?? base.grass, roughness: 1 }));
        isle.position.y = 0.9;
        isle.receiveShadow = true;
        world.add(isle);
        const beach = new THREE.Mesh(new THREE.CylinderGeometry(env.water.r + 10, env.water.r + 16, 1.2, 48), new THREE.MeshStandardMaterial({ color: 0xe9e1cc, roughness: 1 }));
        beach.position.y = 0.3;
        world.add(beach);
      }
    }
    if (env.hill) {
      const hill = new THREE.Mesh(new THREE.ConeGeometry(env.hill.r, env.hill.h, 36), new THREE.MeshStandardMaterial({ color: base[colorKey] ?? base.grass, roughness: 1 }));
      hill.scale.y = 1;
      hill.position.set(env.hill.x, env.hill.h / 2 - 0.5, env.hill.z);
      hill.receiveShadow = hill.castShadow = true;
      world.add(hill);
    }
    for (const rd of env.roads) {
      const dx = rd.to[0] - rd.from[0], dz = rd.to[1] - rd.from[1];
      const len = Math.hypot(dx, dz);
      const road = new THREE.Mesh(new THREE.BoxGeometry(len, 0.3, rd.w), new THREE.MeshStandardMaterial({ color: rd.rail ? 0xd8d4cb : 0xf2f1ec, roughness: 1 }));
      road.position.set((rd.from[0] + rd.to[0]) / 2, 0.15, (rd.from[1] + rd.to[1]) / 2);
      road.rotation.y = -Math.atan2(dz, dx);
      road.receiveShadow = true;
      world.add(road);
      if (rd.rail) {
        for (const off of [-1.2, 1.2]) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.2, 0.3), MATS.iron);
          rail.position.set(road.position.x, 0.4, road.position.z + off);
          rail.rotation.y = road.rotation.y;
          world.add(rail);
        }
      }
    }
  }
  const groundY = (x, z, env) => sharedGroundY(x, z, env);
  function addItem(it, env) {
    const g = it.kind.startsWith('asset:') ? buildAsset(it.kind.slice(6)) : build(it.kind, hashId(it.id));
    g.position.set(it.x, groundY(it.x, it.z, env), it.z);
    g.rotation.y = it.rot || 0;
    g.scale.setScalar(it.scale || 1);
    g.userData.item = it;
    itemsGroup.add(g);
    items.set(it.id, g);
    return g;
  }
  function removeItem(id) {
    const g = items.get(id);
    if (!g) return;
    itemsGroup.remove(g);
    items.delete(id);
  }
  // full snapshots come from the server: add what is new, drop what is gone, move what changed
  function applyItems(list, env) {
    const seen = new Set();
    for (const it of list) {
      seen.add(it.id);
      const g = items.get(it.id);
      if (!g) addItem(it, env);
      else {
        g.userData.item = it;
        g.position.set(it.x, groundY(it.x, it.z, env), it.z);
        g.rotation.y = it.rot || 0;
        g.scale.setScalar(it.scale || 1);
      }
    }
    for (const id of [...items.keys()]) if (!seen.has(id)) removeItem(id);
  }
  const hashId = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 11);
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hitPoint = new THREE.Vector3();
  function pickGround(ev) {
    ndc.set((ev.clientX / innerWidth) * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(world.children, false);
    if (hits.length) return hits[0].point;
    return ray.ray.intersectPlane(plane, hitPoint) ? hitPoint.clone() : null;
  }
  function pickItem(ev) {
    ndc.set((ev.clientX / innerWidth) * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(itemsGroup.children, true);
    return hits.length ? hits[0].object.userData.root : null;
  }
  function setClock(hour, weather) {
    const t = (hour - 6) / 12; // 0 at 6:00 → 1 at 18:00
    const el = Math.sin(Math.PI * Math.min(1, Math.max(0, t)));
    const night = hour < 5.5 || hour > 19.5;
    const dusk = !night && (hour < 7.5 || hour > 17);
    sun.position.set(Math.cos(Math.PI * t) * 400, 60 + el * 420, 220);
    sun.intensity = night ? 0.15 : (0.6 + el * 1.8) * (weather === 'clear' ? 1 : weather === 'cloudy' ? 0.75 : weather === 'overcast' || weather === 'fog' ? 0.45 : 0.35);
    sun.color.set(night ? 0x8fa0c8 : dusk ? 0xffc89a : 0xfff6e6);
    hemi.intensity = night ? 0.35 : weather === 'clear' ? 0.9 : 0.75;
    hemi.color.set(night ? 0x5c6a8f : weather === 'storm' ? 0xc9d0dc : 0xf4f7ff);
    const sky = night ? 0x3a4158 : weather === 'storm' ? 0xcfd4dc : weather === 'overcast' ? 0xdfe2e6 : dusk ? 0xf0e3d6 : 0xe9eaec;
    scene.background.set(sky);
    scene.fog.color.set(sky);
    scene.fog.near = weather === 'fog' ? 60 : weather === 'rain' || weather === 'snow' || weather === 'storm' ? 160 : 260;
    scene.fog.far = weather === 'fog' ? 420 : 900;
    if (groundMesh && weather === 'snow') groundMesh.material.color.set(0xeff2f0);
  }
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();
  let onFrame = null;
  const loop = () => {
    controls.update();
    onFrame?.();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return {
    THREE, renderer, scene, camera, controls, sun, items, itemsGroup, world,
    buildGround, addItem, removeItem, applyItems, pickGround, pickItem, setClock, groundY,
    set onFrame(fn) { onFrame = fn; },
    toScreen(v) {
      const p = v.clone().project(camera);
      return [((p.x + 1) / 2) * innerWidth, ((1 - p.y) / 2) * innerHeight];
    },
    recentre(size) {
      controls.target.set(0, 0, 0);
      camera.position.set(size * 0.28, size * 0.22, size * 0.38);
    },
  };
}
