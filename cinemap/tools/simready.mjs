#!/usr/bin/env node
// SimReady (NVIDIA, CC-BY-4.0) asset import for the white-model workshop.
//   node cinemap/tools/simready.mjs catalog [query]      list asset ids (cached from the HF tree)
//   node cinemap/tools/simready.mjs import <id> [...]    fetch the USD package (no textures) → GLB
// Only the geometry payloads, the root USD, the thumbnail and the license are downloaded
// (a few MB); the multi-hundred-megabyte textures are skipped on purpose. Conversion needs
// Python 3 with `usd-core`; a venv is created under cinemap/data/usdenv on first use.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA = process.env.CINEMAP_DATA || path.join(ROOT, 'data');
const ASSETS = path.join(DATA, 'assets');
const HF = 'https://huggingface.co';
const REPO = 'nvidia/simready-assets';
const RAW = `${HF}/datasets/${REPO}/resolve/main`;
const API = `${HF}/api/datasets/${REPO}`;

const run = (bin, args, opts = {}) =>
  new Promise((resolve, reject) => {
    const c = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
    let out = '', err = '';
    c.stdout.on('data', (b) => (out += b));
    c.stderr.on('data', (b) => (err += b));
    c.on('error', reject);
    c.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(err.slice(-800) || `exit ${code}`))));
  });

export async function catalog({ refresh = false } = {}) {
  const file = path.join(DATA, 'simready-catalog.json');
  if (!refresh && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  // the tree endpoint pages 1000 entries at a time; follow the Link header until the end
  const ids = [];
  let next = `${API}/tree/main?limit=1000`;
  while (next) {
    const res = await fetch(next);
    if (!res.ok) throw new Error(`HF tree ${res.status}`);
    for (const x of await res.json()) if (x.type === 'directory') ids.push(x.path);
    next = /<([^>]+)>;\s*rel="next"/.exec(res.headers.get('link') || '')?.[1] || null;
  }
  const cat = { fetchedAt: new Date().toISOString(), license: 'CC-BY-4.0', source: `${HF}/datasets/${REPO}`, ids };
  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(cat));
  return cat;
}
export const prettyName = (id) => id.replace(/_[a-z]\d{2}$/i, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');

export function listAssets() {
  if (!fs.existsSync(ASSETS)) return [];
  return fs
    .readdirSync(ASSETS)
    .filter((id) => fs.existsSync(path.join(ASSETS, id, 'model.glb')))
    .map((id) => {
      let meta = {};
      try {
        meta = JSON.parse(fs.readFileSync(path.join(ASSETS, id, 'meta.json'), 'utf8'));
      } catch {
        /* no meta */
      }
      return { id, name: meta.name || prettyName(id), source: meta.source || 'simready', license: meta.license || 'CC-BY-4.0', meta, thumb: fs.existsSync(path.join(ASSETS, id, 'thumb.png')) ? `/assets/${id}/thumb.png` : null, model: `/assets/${id}/model.glb` };
    });
}
export const assetDir = (id) => path.join(ASSETS, id);

async function python() {
  const venv = path.join(DATA, 'usdenv');
  const bin = path.join(venv, 'bin', 'python');
  if (fs.existsSync(bin)) {
    try {
      await run(bin, ['-I', '-c', 'import pxr']);
      return bin;
    } catch {
      /* reinstall */
    }
  }
  const sys = process.env.PYTHON || 'python3';
  await run(sys, ['-m', 'venv', venv]);
  await run(bin, ['-m', 'pip', 'install', '-q', 'usd-core']);
  return bin;
}

export async function importAsset(id, { log = () => {} } = {}) {
  if (!/^[\w.-]{1,120}$/.test(id)) throw new Error('bad asset id');
  const dir = assetDir(id);
  const work = path.join(dir, 'usd');
  fs.mkdirSync(work, { recursive: true });
  log(`listing ${id}`);
  const res = await fetch(`${API}/tree/main/${encodeURIComponent(id)}?recursive=true`);
  if (!res.ok) throw new Error(`asset ${id} not found (${res.status})`);
  const files = (await res.json()).filter((x) => x.type === 'file');
  const wanted = files.filter((f) => /\/simready_usd\/(payloads\/|sm_[^/]+\.usda?$|\.thumbs\/[^/]+_thumbnail\.png$)|\/\.metadata\/LICENSE\.txt$|com\.nvidia\.simready\.packaging\.json$/.test(f.path) && !/\/Textures\//.test(f.path));
  let bytes = 0;
  for (const f of wanted) {
    const rel = f.path.slice(id.length + 1);
    const dst = path.join(work, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    const r = await fetch(`${RAW}/${f.path}`);
    if (!r.ok) throw new Error(`download ${f.path}: ${r.status}`);
    fs.writeFileSync(dst, Buffer.from(await r.arrayBuffer()));
    bytes += f.size || 0;
  }
  log(`downloaded ${wanted.length} files (${(bytes / 1e6).toFixed(1)} MB)`);
  const roots = fs.readdirSync(path.join(work, 'simready_usd')).filter((f) => /^sm_.*\.usda?$/.test(f));
  const root = roots.length ? path.join(work, 'simready_usd', roots[0]) : path.join(work, 'simready_usd', 'payloads', 'geometries.usd');
  const py = await python();
  log('converting to GLB');
  const out = await run(py, ['-I', path.join(ROOT, 'tools', 'usd2glb.py'), root, path.join(dir, 'model.glb'), '--meta', path.join(dir, 'geo.json')]);
  const geo = JSON.parse(out.trim().split('\n').pop());
  const thumb = wanted.find((f) => /_thumbnail\.png$/.test(f.path));
  if (thumb) fs.copyFileSync(path.join(work, thumb.path.slice(id.length + 1)), path.join(dir, 'thumb.png'));
  const lic = wanted.find((f) => /LICENSE\.txt$/.test(f.path));
  if (lic) fs.copyFileSync(path.join(work, lic.path.slice(id.length + 1)), path.join(dir, 'LICENSE.txt'));
  const meta = { id, name: prettyName(id), source: 'simready', license: 'CC-BY-4.0', attribution: `NVIDIA SimReady asset ${id} (${HF}/datasets/${REPO}), CC-BY-4.0`, importedAt: new Date().toISOString(), bytes, ...geo };
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
  fs.rmSync(work, { recursive: true, force: true });
  log(`done: ${geo.triangles} triangles`);
  return meta;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'catalog') {
    const c = await catalog({ refresh: rest.includes('--refresh') });
    const q = rest.find((x) => !x.startsWith('--'));
    const ids = q ? c.ids.filter((x) => x.toLowerCase().includes(q.toLowerCase())) : c.ids;
    console.log(ids.join('\n'));
    console.log(`\n${ids.length} / ${c.ids.length} assets · ${c.license} · ${c.source}`);
  } else if (cmd === 'import') {
    for (const id of rest) console.log(JSON.stringify(await importAsset(id, { log: (m) => console.error(`[${id}] ${m}`) })));
  } else if (cmd === 'list') console.log(JSON.stringify(listAssets(), null, 2));
  else console.log('usage: simready.mjs catalog [query] | import <id...> | list');
}
