// White-model kit: every placeable thing is a THREE.Group built from primitives. Paper white
// walls, pale roofs, sage trees, chalk-blue water — the same palette as the login world.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0, ...extra });
export const MATS = {
  wall: mat(0xf6f5f2),
  roof: mat(0xe6e4df),
  wood: mat(0xeae5da),
  iron: mat(0xcfd3d5),
  rock: mat(0xdedcd5),
  tree: mat(0xa8beaa),
  pine: mat(0x96b09e),
  trunk: mat(0xd9d2c3),
  person: mat(0xf4ebd9),
  accent: mat(0xd9655a),
  glass: mat(0xd4dee8),
  ghost: new THREE.MeshStandardMaterial({ color: 0x2a6f4a, transparent: true, opacity: 0.35, roughness: 1 }),
};
const box = (w, h, d, m, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
};
const cyl = (r1, r2, h, m, x = 0, y = 0, z = 0, seg = 14) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
};
const sphere = (r, m, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
};
function gable(w, d, h, m) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(0, h);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
  geo.translate(0, 0, -d / 2);
  const mesh = new THREE.Mesh(geo, m);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}
const seeded = (seed) => {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
};

export const KINDS = {
  house: { en: 'House', zh: '房子', cat: 'build', foot: 6 },
  tower: { en: 'Tower', zh: '塔楼', cat: 'build', foot: 5 },
  lighthouse: { en: 'Lighthouse', zh: '灯塔', cat: 'build', foot: 5 },
  shed: { en: 'Shed', zh: '仓房', cat: 'build', foot: 8 },
  lamp: { en: 'Street lamp', zh: '路灯', cat: 'build', foot: 1 },
  bench: { en: 'Bench', zh: '长椅', cat: 'build', foot: 2 },
  tree: { en: 'Tree', zh: '阔叶树', cat: 'terrain', foot: 3 },
  pine: { en: 'Pine', zh: '松树', cat: 'terrain', foot: 3 },
  rock: { en: 'Rock', zh: '石头', cat: 'terrain', foot: 2 },
  bush: { en: 'Bush', zh: '灌木', cat: 'terrain', foot: 1.5 },
  boat: { en: 'Boat', zh: '小船', cat: 'build', foot: 6, water: true },
  person: { en: 'Person', zh: '居民', cat: 'people', foot: 0.8 },
  car: { en: 'Car', zh: '汽车', cat: 'build', foot: 4 },
};

export function build(kind, seed = 1) {
  const r = seeded(seed);
  const g = new THREE.Group();
  g.userData.kind = kind;
  switch (kind) {
    case 'house': {
      const w = 5 + r() * 3, d = 6 + r() * 3, h = 3 + Math.floor(r() * 2) * 2.4;
      g.add(box(w, h, d, MATS.wall, 0, h / 2, 0));
      g.add(box(w + 0.3, 0.5, d + 0.3, MATS.rock, 0, 0.25, 0));
      if (r() > 0.78) g.add(box(w + 0.2, 0.3, d + 0.2, MATS.roof, 0, h + 0.15, 0));
      else {
        const roof = gable(w + 0.4, d + 0.4, 1 + r() * 1.2, MATS.roof);
        roof.position.y = h;
        g.add(roof);
        if (r() > 0.4) g.add(box(0.7, 1.4, 0.7, MATS.wall, w * 0.25, h + 0.9, d * 0.1));
      }
      for (let i = 0; i < Math.floor(w / 1.8); i++) g.add(box(0.7, 0.9, 0.06, MATS.glass, -w / 2 + 1 + i * 1.8, 1.5, d / 2 + 0.02));
      break;
    }
    case 'shed': {
      const w = 10 + r() * 6, d = 7 + r() * 4, h = 4;
      g.add(box(w, h, d, MATS.wall, 0, h / 2, 0));
      const roof = gable(w + 0.6, d + 0.4, 1.4, MATS.roof);
      roof.position.y = h;
      roof.rotation.y = Math.PI / 2;
      roof.scale.set(d / w, 1, w / d);
      g.add(roof);
      break;
    }
    case 'tower': {
      const h = 10 + r() * 6;
      g.add(box(3.2, h, 3.2, MATS.wall, 0, h / 2, 0));
      const cone = cyl(0, 2.6, 3.4, MATS.roof, 0, h + 1.7, 0, 4);
      cone.rotation.y = Math.PI / 4;
      g.add(cone);
      g.add(box(0.5, 0.9, 0.06, MATS.glass, 0, h - 2, 1.62));
      break;
    }
    case 'lighthouse': {
      g.add(cyl(2.4, 2.9, 1, MATS.rock, 0, 0.5, 0));
      g.add(cyl(1.3, 1.7, 11, MATS.wall, 0, 6.5, 0));
      g.add(cyl(1.6, 1.6, 0.4, MATS.iron, 0, 12.1, 0));
      g.add(cyl(1.1, 1.1, 1.6, MATS.glass, 0, 13.1, 0));
      g.add(cyl(0, 1.4, 1.4, MATS.roof, 0, 14.6, 0));
      g.add(box(2.8, 2.4, 2.4, MATS.wall, 2.8, 1.2, 0));
      break;
    }
    case 'lamp': {
      g.add(cyl(0.08, 0.1, 3.4, MATS.iron, 0, 1.7, 0, 6));
      g.add(box(0.7, 0.06, 0.06, MATS.iron, 0.3, 3.3, 0));
      g.add(sphere(0.18, MATS.glass, 0.6, 3.2, 0));
      break;
    }
    case 'bench': {
      g.add(box(1.8, 0.08, 0.5, MATS.wood, 0, 0.45, 0));
      g.add(box(1.8, 0.4, 0.06, MATS.wood, 0, 0.75, -0.22));
      g.add(box(0.08, 0.45, 0.45, MATS.iron, -0.8, 0.22, 0));
      g.add(box(0.08, 0.45, 0.45, MATS.iron, 0.8, 0.22, 0));
      break;
    }
    case 'tree': {
      const s = 0.8 + r() * 0.7;
      g.add(cyl(0.14, 0.2, 1.6 * s, MATS.trunk, 0, 0.8 * s, 0, 6));
      g.add(sphere(1.5 * s, MATS.tree, 0, 2.6 * s, 0));
      g.add(sphere(1.0 * s, MATS.tree, 0.9 * s, 2.2 * s, 0.3 * s));
      g.add(sphere(0.9 * s, MATS.tree, -0.8 * s, 2.4 * s, -0.4 * s));
      break;
    }
    case 'pine': {
      const s = 0.8 + r() * 0.8;
      g.add(cyl(0.12, 0.18, 1.2 * s, MATS.trunk, 0, 0.6 * s, 0, 6));
      g.add(cyl(0, 1.4 * s, 2.4 * s, MATS.pine, 0, 2.2 * s, 0, 8));
      g.add(cyl(0, 1.05 * s, 2 * s, MATS.pine, 0, 3.6 * s, 0, 8));
      g.add(cyl(0, 0.7 * s, 1.6 * s, MATS.pine, 0, 4.8 * s, 0, 8));
      break;
    }
    case 'bush': {
      g.add(sphere(0.8, MATS.tree, 0, 0.55, 0));
      g.add(sphere(0.6, MATS.tree, 0.6, 0.45, 0.2));
      break;
    }
    case 'rock': {
      const s = 0.6 + r() * 1.2;
      const m = sphere(s, MATS.rock, 0, s * 0.35, 0);
      m.scale.set(1.3, 0.6, 1);
      m.rotation.y = r() * 3;
      g.add(m);
      break;
    }
    case 'boat': {
      const L = 4 + r() * 3;
      const hull = box(L, 0.9, 1.6, MATS.wood, 0, 0.3, 0);
      g.add(hull);
      g.add(box(L * 0.35, 0.9, 1.2, MATS.wall, -L * 0.1, 1.2, 0));
      if (r() > 0.5) {
        g.add(cyl(0.05, 0.07, 5, MATS.wood, L * 0.15, 3, 0, 6));
        g.add(box(0.05, 3.2, 1.8, MATS.wall, L * 0.15, 3.2, 0.95));
      }
      break;
    }
    case 'person': {
      const h = 1.6 + r() * 0.3;
      g.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.22, h * 0.55, 4, 8), r() > 0.8 ? MATS.accent : MATS.person)).children.at(-1).position.y = h * 0.55;
      g.add(sphere(0.17, MATS.person, 0, h, 0));
      break;
    }
    case 'car': {
      g.add(box(4, 0.9, 1.8, MATS.wall, 0, 0.75, 0));
      g.add(box(2.2, 0.8, 1.6, MATS.glass, -0.2, 1.6, 0));
      for (const [x, z] of [[-1.3, 0.9], [1.3, 0.9], [-1.3, -0.9], [1.3, -0.9]]) {
        const w = cyl(0.35, 0.35, 0.3, MATS.iron, x, 0.35, z, 10);
        w.rotation.x = Math.PI / 2;
        g.add(w);
      }
      break;
    }
    default:
      g.add(box(2, 2, 2, MATS.wall, 0, 1, 0));
  }
  g.traverse((o) => {
    if (o.isMesh) o.userData.root = g;
  });
  return g;
}

// Imported assets (SimReady → GLB): loaded once, cloned per placement, drawn as white model.
const gltfCache = new Map();
const loader = new GLTFLoader();
export function buildAsset(id) {
  const g = new THREE.Group();
  g.userData.kind = `asset:${id}`;
  const placeholder = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), MATS.ghost);
  placeholder.position.y = 0.5;
  g.add(placeholder);
  if (!gltfCache.has(id)) gltfCache.set(id, loader.loadAsync(`/assets/${id}/model.glb`).then((gltf) => gltf.scene));
  gltfCache.get(id).then((scene) => {
    g.remove(placeholder);
    const inst = scene.clone(true);
    inst.traverse((o) => {
      if (o.isMesh) {
        o.material = MATS.wall;
        o.castShadow = o.receiveShadow = true;
        o.userData.root = g;
      }
    });
    g.add(inst);
  }).catch(() => (placeholder.material = MATS.accent));
  return g;
}
