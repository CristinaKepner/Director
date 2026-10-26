// Local template catalog for the replica. Entries, names and blurbs are our own; covers are
// drawn as isometric slabs from a seeded pattern so no image assets are needed.
const T = (id, kind, category, zh, en, dzh, den, facets, dims = [512, 512]) => ({
  id,
  kind,
  category,
  name: en,
  name_zh: zh,
  names: { ja: en, ko: en },
  desc: den,
  desc_zh: dzh,
  descs: { ja: den, ko: den },
  aliases: [],
  dims,
  facets,
  poster: `/api/templates/${id}/media/poster?v=1`,
  preview: `/api/templates/${id}/media/preview?v=1`,
  preview_sm: `/api/templates/${id}/media/preview-sm?v=1`,
  cover: `/api/templates/${id}/media/cover?v=1`,
});
export const TEMPLATES = [
  T('blank', 'landscape', 'Landscapes', '空白', 'Blank', '一块平整的空地，什么都没有，从零开始搭你的世界。', 'A flat empty plate. Start your world from nothing.', { environment: [], region: [], space: ['exterior'], style: [], use: [] }),
  T('tutorial', 'tutorial', 'Stories', '新手教程', 'Tutorial', '两分钟：放一座灯塔，再给渔村拍一段。', 'Two minutes: place a lighthouse, then film the fishing village.', { environment: ['coast'], region: [], space: ['exterior'], style: [], use: ['film'] }),
  T('harbor_town', 'town', 'Cities', '海边小镇', 'Harbour Town', '一座靠海的白模小镇：码头、灯塔、渔船和坡上的房子。', 'A white-model town by the sea: quay, lighthouse, boats and houses on the slope.', { environment: ['coast'], region: ['asia'], space: ['exterior'], style: ['modern'], use: ['film'] }),
  T('valley_village', 'village', 'Nature', '山谷村落', 'Valley Village', '两山之间的河谷，一条小河穿过村子，远处是雪线。', 'A river valley between two ridges, a creek through the village, snow on the far peaks.', { environment: ['mountain', 'forest-fields'], region: [], space: ['exterior'], style: ['rural'], use: [] }),
  T('hill_town', 'town', 'Cities', '山坡小镇', 'Hill Town', '沿坡而建的小镇，一条主街盘上山顶的教堂。', 'A hillside town whose main street climbs to the chapel on top.', { environment: ['hill'], region: ['europe'], space: ['exterior'], style: ['historic'], use: ['film'] }),
  T('old_street', 'street', 'Stories', '老街', 'Old Street', '一条 300 米的老街：骑楼、茶楼、戏台和巷子。', 'A 300 m old street: arcades, a tea house, a stage and alleys.', { environment: ['urban'], region: ['asia'], space: ['exterior'], style: ['historic'], use: ['film'] }, [300, 120]),
  T('campus', 'campus', 'Cities', '校园', 'Campus', '教学楼、操场、林荫道和一座钟楼。', 'Lecture halls, a field, tree-lined paths and a clock tower.', { environment: ['urban'], region: [], space: ['exterior'], style: ['modern'], use: [] }),
  T('desert_station', 'station', 'Film', '荒漠车站', 'Desert Station', '铁路穿过荒漠，一座孤零零的车站和水塔。', 'A railway through the desert, a lonely station and a water tower.', { environment: ['desert'], region: ['americas'], space: ['exterior'], style: ['historic'], use: ['film'] }, [2048, 2048]),
  T('snow_village', 'village', 'Nature', '雪村', 'Snow Village', '雪后的小村，烟囱冒烟，湖面结了冰。', 'A village after snowfall: smoking chimneys and a frozen lake.', { environment: ['snow'], region: [], space: ['exterior'], style: ['rural'], use: [] }),
  T('night_market', 'street', 'Stories', '夜市', 'Night Market', '一条灯火通明的夜市，摊位、招牌和人群。', 'A lantern-lit night market with stalls, signs and crowds.', { environment: ['urban'], region: ['asia'], space: ['exterior'], style: ['modern'], use: ['film'] }, [200, 80]),
  T('island', 'landscape', 'Nature', '离岛', 'Small Island', '一座小岛，环岛一圈沙滩，中间一座山。', 'A small island ringed by beach with a hill in the middle.', { environment: ['coast'], region: [], space: ['exterior'], style: [], use: [] }),
  T('studio_lot', 'lot', 'Film', '片场', 'Studio Lot', '几座摄影棚、一条外景街和道具仓库。', 'Sound stages, a backlot street and the prop warehouse.', { environment: ['urban'], region: [], space: ['exterior'], style: ['modern'], use: ['film'] }),
  T('courtyard', 'interior', 'Interiors', '四合院', 'Courtyard House', '一座可以掀开屋顶看的四合院，正房、厢房和影壁。', 'A courtyard house with a liftable roof: main hall, wings and screen wall.', { environment: ['urban'], region: ['asia'], space: ['interior'], style: ['historic'], use: ['film'] }, [40, 30]),
  T('loft', 'interior', 'Interiors', '阁楼公寓', 'Loft Apartment', '一间开放式阁楼，露出的梁和一整面的窗。', 'An open loft with exposed beams and a wall of windows.', { environment: ['urban'], region: [], space: ['interior'], style: ['modern'], use: ['film'] }, [18, 12]),
];
export const CATEGORY_FILTERS = [
  ['all', '全部', 'All'],
  ['cities', '城市', 'Cities'],
  ['stories', '故事', 'Stories'],
  ['interiors', '室内', 'Interiors'],
  ['nature', '自然', 'Nature'],
  ['film', '影视片场', 'Film sets'],
  ['mine', '我的', 'Mine'],
];

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const hashOf = (str) => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
// Isometric slab with a seeded scatter of blocks, trees and a water patch: the cover art.
export function coverSvg(t) {
  const r = rng(hashOf(t.id));
  const env = t.facets.environment[0] || 'plain';
  const ground = { coast: '#dfe7d3', desert: '#e9e0c9', snow: '#f1f3f1', mountain: '#d9e3cf', hill: '#dbe5cc', urban: '#e4e4df', 'forest-fields': '#d7e3c6' }[env] || '#dfe6d5';
  const side = '#cfd1cb', sideDark = '#c2c4be';
  const W = 480, H = 320, cx = 240, cy = 150, ax = 170, ay = 88;
  const iso = (u, v, z = 0) => [cx + (u - v) * ax, cy + (u + v) * ay - z];
  const poly = (pts, fill) => `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" fill="${fill}"/>`;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" shape-rendering="crispEdges">`;
  out += `<rect width="${W}" height="${H}" fill="#f7f8f6"/>`;
  const d = 26;
  out += poly([iso(0, 1, -d), iso(1, 1, -d), iso(1, 1), iso(0, 1)], side);
  out += poly([iso(1, 0, -d), iso(1, 1, -d), iso(1, 1), iso(1, 0)], sideDark);
  out += poly([iso(0, 0), iso(1, 0), iso(1, 1), iso(0, 1)], ground);
  if (env === 'coast' || t.id === 'island') {
    const u0 = t.id === 'island' ? 0 : 0.55;
    out += poly([iso(u0, 0), iso(1, 0), iso(1, 1), iso(u0, 1)], '#bcd6e6');
    if (t.id === 'island') out += poly([iso(0.3, 0.3), iso(0.7, 0.3), iso(0.7, 0.7), iso(0.3, 0.7)], ground);
  }
  const blocks = t.id === 'blank' ? 0 : 10 + Math.floor(r() * 18);
  const items = [];
  for (let i = 0; i < blocks; i++) items.push({ u: 0.08 + r() * 0.84, v: 0.08 + r() * 0.84, w: 0.05 + r() * 0.07, h: 8 + r() * 26, tree: r() < (env === 'forest-fields' || env === 'mountain' ? 0.6 : 0.3) });
  items.sort((a, b) => a.u + a.v - (b.u + b.v));
  for (const it of items) {
    if (it.tree) {
      const [x, y] = iso(it.u, it.v);
      out += `<circle cx="${x.toFixed(1)}" cy="${(y - 10).toFixed(1)}" r="${(5 + it.h * 0.25).toFixed(1)}" fill="#a9c3ad"/><rect x="${(x - 1).toFixed(1)}" y="${(y - 6).toFixed(1)}" width="2" height="7" fill="#b9b2a4"/>`;
      continue;
    }
    const { u, v, w, h } = it;
    out += poly([iso(u, v + w, -h), iso(u + w, v + w, -h), iso(u + w, v + w), iso(u, v + w)], '#e2e3df');
    out += poly([iso(u + w, v, -h), iso(u + w, v + w, -h), iso(u + w, v + w), iso(u + w, v)], '#d3d5d0');
    out += poly([iso(u, v, -h), iso(u + w, v, -h), iso(u + w, v + w, -h), iso(u, v + w, -h)], '#f6f6f3');
  }
  if (t.id === 'tutorial' || t.id === 'harbor_town') {
    const [x, y] = iso(0.7, 0.25);
    out += `<rect x="${x - 4}" y="${y - 44}" width="8" height="44" fill="#f4f4f1"/><rect x="${x - 6}" y="${y - 50}" width="12" height="6" fill="#c9cbc6"/>`;
  }
  out += '</svg>';
  return out;
}
