#!/usr/bin/env node
// Search the awesome-opus5-5-videos index. Usage:
//   find.mjs [query...] [--category motion|explainer|3d|interactive] [--tag three.js] [--slug id] [--limit 8] [--full]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const items = JSON.parse(fs.readFileSync(path.join(here, '..', 'data', 'videos.json'), 'utf8'));
const args = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] ?? d : d;
};
const full = args.includes('--full');
const category = opt('--category'), tag = opt('--tag'), slug = opt('--slug');
const limit = Number(opt('--limit', 8));
const words = args.filter((a, i) => !a.startsWith('--') && !['--category', '--tag', '--slug', '--limit'].includes(args[i - 1])).map((w) => w.toLowerCase());
let hits = items.filter((v) => (!slug || v.slug === slug) && (!category || v.category === category) && (!tag || (v.tech_tags || []).some((t) => t.toLowerCase().includes(tag.toLowerCase()))));
if (words.length) {
  hits = hits
    .map((v) => ({ v, score: words.reduce((s, w) => s + (`${v.prompt} ${v.slug} ${v.author} ${(v.tech_tags || []).join(' ')}`.toLowerCase().split(w).length - 1), 0) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.v);
}
for (const v of hits.slice(0, slug ? 1 : limit)) {
  console.log(`\n# ${v.slug} · @${v.author} · ${v.category} · ${(v.tech_tags || []).join(', ')}${v.prompt_partial ? ' · (partial prompt)' : ''}`);
  console.log(`  post: ${v.post_url}\n  remake: ${v.skillry_url}`);
  console.log(full ? `\n${v.prompt}\n` : `  ${v.prompt.replace(/\s+/g, ' ').slice(0, 220)}${v.prompt.length > 220 ? '…' : ''}`);
}
if (!hits.length) console.log('no matches');
