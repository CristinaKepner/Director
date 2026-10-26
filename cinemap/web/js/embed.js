// Embed contract with the TapNow shell: ?embed=tapnow is remembered for the tab, a silent
// sign-in is attempted once, and outcomes are reported with a beacon.
const EMBED = 'tapnow';
export const EMBED_CONTRACT = 1;
const K_EMBED = 'cinemap.embed';
const K_SILENT = 'cinemap.embed.silentTried';
const K_CONTRACT = 'cinemap.embed.contract';
const K_REPORTED = 'cinemap.embed.reported';
const storage = () => {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
};
export function embedMode({ search = globalThis.location?.search ?? '', store = storage() } = {}) {
  const on = new URLSearchParams(search).get('embed') === EMBED;
  try {
    if (on) store?.setItem(K_EMBED, EMBED);
    return on || store?.getItem(K_EMBED) === EMBED;
  } catch {
    return on;
  }
}
export function embedSilentFirst(store = storage()) {
  try {
    if (!store || store.getItem(K_SILENT)) return false;
    store.setItem(K_SILENT, '1');
    return true;
  } catch {
    return false;
  }
}
const major = (v) => {
  const m = /^\s*(\d{1,4})(?:\.\d{1,4})?\s*$/.exec(String(v ?? ''));
  return m ? Number(m[1]) : null;
};
export function embedContract({ search = globalThis.location?.search ?? '', store = storage() } = {}) {
  const q = major(new URLSearchParams(search).get('embed_contract'));
  try {
    if (q !== null) {
      store?.setItem(K_CONTRACT, String(q));
      return q;
    }
    return major(store?.getItem(K_CONTRACT));
  } catch {
    return q;
  }
}
export const embedContractTooNew = (o = {}) => (embedContract(o) ?? 1) > EMBED_CONTRACT;
const FORM_ERRORS = ['CINEMAP_INVITE_REQUIRED', 'CINEMAP_INVITE_INVALID'];
export const embedNeedsForm = (code) => FORM_ERRORS.includes(code);
export function embedRetry({ store = storage(), href = globalThis.location?.href ?? '/' } = {}) {
  try {
    store?.removeItem(K_SILENT);
  } catch {
    /* ignore */
  }
  const u = new URL(href, 'http://cinemap.invalid');
  u.searchParams.delete('auth_error');
  u.searchParams.delete('auth_notice');
  return u.pathname + u.search + u.hash;
}
export function embedReport(outcome, reason, code, { beacon = globalThis.navigator?.sendBeacon?.bind(globalThis.navigator) } = {}) {
  try {
    beacon?.('/api/tapnow/sso/embed-event', new Blob([JSON.stringify({ outcome, reason, ...(code ? { code: String(code).slice(0, 64) } : {}) })], { type: 'application/json' }));
  } catch {
    /* ignore */
  }
}
export function embedReportSignedIn({ store = storage(), report = embedReport } = {}) {
  try {
    if (store?.getItem(K_REPORTED)) return false;
    store?.setItem(K_REPORTED, '1');
  } catch {
    return false;
  }
  report('signed-in', 'ok');
  return true;
}
export const embedProjectId = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export const embedProjectPath = (id) => `/p/${encodeURIComponent(id)}?embed=${EMBED}`;
export function takeCreate(search) {
  const q = new URLSearchParams(search);
  if (!q.has('create')) return null;
  const starter = String(q.get('create') || '').trim().slice(0, 100);
  const name = String(q.get('name') || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100) || null;
  q.delete('create');
  q.delete('name');
  const rest = q.toString();
  return { starter, name, rest: rest ? '?' + rest : '' };
}
