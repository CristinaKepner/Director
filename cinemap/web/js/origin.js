// TapNow runs on several origins; pick the one reachable from this network (probe a tiny
// no-cors request), remember it for the tab, and rewrite outbound TapNow links to it.
const KEY = 'cinemap.sso.tapnowOrigin';
let origins = [];
let chosen = null;
let probing = null;
const listeners = new Set();
function probe(origin) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 1500);
  return fetch(new URL('/favicon.ico?cinemap_probe=' + Date.now(), origin), { mode: 'no-cors', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctl.signal })
    .then(() => true, () => false)
    .finally(() => clearTimeout(t));
}
const choose = (o) => {
  chosen = o;
  for (const fn of listeners) {
    try {
      fn(o);
    } catch {
      /* listener error */
    }
  }
  return o;
};
export function setTapnowOrigins(list) {
  const next = Array.isArray(list) ? list.filter((s) => typeof s === 'string') : [];
  if (next.join() !== origins.join()) {
    origins = next;
    chosen = origins.length === 1 ? origins[0] : null;
    probing = null;
  }
}
export function reachableTapnowOrigin() {
  if (origins.length < 2) return Promise.resolve(origins[0]);
  if (chosen) return Promise.resolve(chosen);
  try {
    const apex = location.hostname.split('.').slice(-2).join('.');
    const same = origins.find((o) => new URL(o).hostname.endsWith('.' + apex));
    if (same) return Promise.resolve(choose(same));
  } catch {
    /* ignore */
  }
  try {
    const ref = new URL(document.referrer).origin;
    if (origins.includes(ref)) return Promise.resolve(choose(ref));
  } catch {
    /* ignore */
  }
  try {
    const saved = sessionStorage.getItem(KEY);
    if (origins.includes(saved)) return Promise.resolve(choose(saved));
  } catch {
    /* ignore */
  }
  const list = origins;
  return (probing ||= (async () => {
    const results = list.map(probe);
    for (let i = 0; i < list.length; i++) {
      if (await results[i]) {
        try {
          sessionStorage.setItem(KEY, list[i]);
        } catch {
          /* ignore */
        }
        return list === origins ? choose(list[i]) : list[i];
      }
    }
    probing = null;
    return list[0];
  })());
}
export function tapnowLink(href) {
  if (!href || !chosen) return href;
  try {
    const u = new URL(href);
    return !origins.includes(u.origin) || u.origin === chosen ? href : chosen + u.pathname + u.search + u.hash;
  } catch {
    return href;
  }
}
export const onTapnowOrigin = (fn) => (listeners.add(fn), () => listeners.delete(fn));
