// Login page controller. Order of events on arrival:
//   1. mount i18n + language motion                      (synchronous)
//   2. GET /api/config → configure the sign-in surface
//   3. GET /api/session?optional=1 → signed in? go to `next`
//   4. anonymous → one silent TapNow attempt (entry or first time this tab)
//   5. still here → start the world art, mark the page visible for entry timing
import { T, lang, onLang, mountLanguage } from './i18n.js';
import { uiText, errorText, hasErrorCopy } from './copy.js';
import { mountSso, takeEntryHint } from './sso.js';
import { mountLoginMotion, setLoginBusy, loginWorldStats } from './login-motion.js';
import { mountLangMotion } from './login-lang.js';
import { tapnowLink, onTapnowOrigin } from './origin.js';
import { embedMode, embedSilentFirst, embedNeedsForm, embedRetry, embedContractTooNew, embedReport } from './embed.js';

const $ = (id) => document.getElementById(id);
const text = (key) => uiText(lang(), key);
mountLanguage();
mountLangMotion();

const params = new URLSearchParams(location.search);
const fromTapnow = params.get('from') === 'tapnow';
const hasHint = params.has('tn_uid') || params.has('tn_org');
const hint = takeEntryHint(params);
if (fromTapnow || hasHint) {
  params.delete('from');
  history.replaceState(null, '', location.pathname + (params.size ? '?' + params : '') + location.hash);
}
const embedded = embedMode();
const root = document.documentElement;
const authError = params.get('auth_error');
const EMBED_TIMEOUT = 6e4;
const contractTooNew = embedded && embedContractTooNew();
const embedLoading = () => root.dataset.embed === 'tapnow' && root.dataset.embedPage !== 'form';

function showEmbedForm() {
  root.dataset.embedPage = 'form';
  delete root.dataset.tapnowSignIn;
}
function labelEmbed() {
  const el = $('embedLoading');
  el.setAttribute('aria-label', text('embed-loading'));
  $('embedFailedText').textContent = text(el.dataset.state === 'updating' ? 'embed-updating' : 'embed-load-failed');
  $('embedRetry').textContent = text('embed-retry');
}
function embedFailed(state = 'failed', reason = 'no-silent') {
  if (!embedLoading()) return;
  const el = $('embedLoading');
  if (el.dataset.state) return;
  el.dataset.state = state;
  root.dataset.tapnowSignIn = 'failed';
  el.removeAttribute('aria-busy');
  labelEmbed();
  sso.visible('embedFailed');
  embedReport(state, reason, reason === 'auth-error' ? authError : null);
}
if (embedded && !contractTooNew && embedNeedsForm(authError)) showEmbedForm();
if (embedLoading()) {
  labelEmbed();
  onLang(labelEmbed);
}
$('embedRetry').onclick = () => location.replace(embedRetry({ href: location.href }));

let toastTimer;
function toast(msg) {
  $('toast').textContent = msg;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($('toast').hidden = true), 6e3);
}

async function request(url, body) {
  const r = await fetch(url, { method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type': 'application/json' } : {}, ...(body ? { body: JSON.stringify(body) } : {}) });
  let data;
  try {
    data = await r.json();
  } catch {
    throw new Error(T('The connection was interrupted. Please try again.', '连接中断了，请重试。'));
  }
  if (!r.ok) throw Object.assign(new Error(data.error || T('Connection failed. Please try again.', '连接失败，请重试。')), { status: r.status, info: data });
  return data;
}

// Only project and share paths may be used as `next`; anything else lands on the home page.
const NEXT_RE = /^\/(p\/[\w-]{1,80}|share\/[A-Za-z0-9_-]{16,64}(\?remix=1)?)$/;
const returnTo = ({ keepEntry = false } = {}) => {
  const q = new URLSearchParams(location.search);
  const next = q.get('next');
  for (const k of ['auth_error', 'auth_notice', 'from', 'next']) q.delete(k);
  if (keepEntry && fromTapnow) {
    q.set('from', 'tapnow');
    if (hint) {
      q.set('tn_uid', hint.uid);
      q.set('tn_org', hint.org);
    }
  }
  const dest = NEXT_RE.test(next || '') ? next : '/';
  return dest + (q.size ? (dest.includes('?') ? '&' : '?') + q : '') + location.hash;
};
const safePath = (p) => (typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') && !/[\\\r\n\t]/.test(p) ? p : returnTo());

let config = {};
let inviteOpen = false;
const syncInvite = () => ($('tnInviteField').hidden = !inviteOpen);
function showInvite() {
  inviteOpen = true;
  syncInvite();
  $('tnInvite').focus();
}
function clearSecrets() {
  for (const id of ['password', 'tnInvite']) $(id).value = '';
}
const errorCopy = ({ code }) => (hasErrorCopy(code) ? errorText(lang(), code) : text('generic-failure'));

const sso = mountSso({
  request,
  showInvite,
  errorCopy,
  notify: toast,
  returnTo: () => returnTo(),
  onRedeemed: (r) => {
    clearSecrets();
    location.assign(safePath(r?.returnTo));
  },
});

function relabel() {
  $('tnInviteLabel').textContent = text('invitation-code');
  const a = document.createElement('a');
  a.textContent = text('register-in-tapnow');
  a.href = tapnowLink(config.tapnowFrontendOrigin || 'https://app.tapnow.ai/');
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  $('tnRegistration').replaceChildren(text('no-tapnow-account') + ' ', a);
  if (config.loginMode !== 'tapnow') return;
  const emailLabel = $('email').closest('label');
  const passLabel = $('password').closest('label');
  emailLabel.firstChild.textContent = text(config.legacyLoginEnabled ? 'cinemap-account-or-email' : 'tapnow-email');
  passLabel.firstChild.textContent = text('tapnow-password');
  $('email').type = config.legacyLoginEnabled ? 'text' : 'email';
  $('email').autocomplete = config.legacyLoginEnabled ? 'username' : 'email';
  const submit = $('submit');
  submit.dataset.i18nIgnore = '';
  submit.firstChild.textContent = text('sign-in') + ' ';
  const note = $('tnAccountNote');
  note.textContent = text(config.legacyLoginEnabled ? 'use-your-tapnow-or-invited-cinemap-account' : 'use-your-tapnow-account');
  note.hidden = !!config.tapnowSsoEnabled;
  $('tnRegistration').hidden = !!config.tapnowSsoEnabled;
}
onTapnowOrigin(relabel);

function configure(c) {
  config = c;
  $('tnLoginExtra').hidden = c.loginMode !== 'tapnow';
  syncInvite();
  if (!c.tapnowSsoEnabled) $('password').closest('label').after($('tnLoginExtra'));
  relabel();
  sso.configure(c);
  if (c.setupRequired) {
    $('submit').disabled = true;
    $('loginMessage').textContent = text('company-services-are-not-configured-yet');
  }
}
onLang(() => config.loginMode && relabel());

// Legal links follow the UI language.
const LEGAL_LANG = { zh: '/zh', ja: '/ja' };
const relinkLegal = () => {
  for (const a of document.querySelectorAll('[data-testid=login-legal] a')) a.href = a.href.replace(/^(https?:\/\/[^/]+)(\/(zh|ja))?\/legal\//, `$1${LEGAL_LANG[lang()] ?? ''}/legal/`);
};
relinkLegal();
onLang(relinkLegal);

const configReady = fetch('/api/config').then(async (r) => {
  if (!r.ok) throw new Error(T('Sign-in settings are unavailable. Please refresh.', '登录配置暂不可用，请刷新。'));
  const c = await r.json();
  configure(c);
  return c;
});
configReady.catch((err) => {
  $('loginMessage').textContent = err.message;
  if ($('tapnowSignIn')) $('tapnowSignIn').disabled = true;
});

function credentials() {
  if (config.setupRequired) throw Object.assign(new Error(), { code: 'IDENTITY_STORE_UNAVAILABLE' });
  return { email: $('email').value, password: $('password').value, ...(config.loginMode === 'tapnow' && !$('tnInviteField').hidden ? { invite_code: $('tnInvite').value.trim() } : {}) };
}
$('loginForm').onsubmit = async (e) => {
  e.preventDefault();
  $('submit').disabled = true;
  setLoginBusy(true);
  $('loginMessage').textContent = '';
  let ok = false;
  try {
    await configReady;
    await request('/api/login', credentials());
    clearSecrets();
    ok = true;
    location.assign(returnTo({ keepEntry: true }));
  } catch (err) {
    const code = err.info?.code || err.code;
    $('loginMessage').textContent = code ? errorCopy({ code }) : err.message;
    if (code === 'CINEMAP_INVITE_REQUIRED') showInvite();
  } finally {
    if (!ok) {
      setLoginBusy(false);
      $('submit').disabled = (await configReady.catch(() => ({ setupRequired: true }))).setupRequired;
    }
  }
};

(async () => {
  if (contractTooNew) {
    embedFailed('updating', 'contract');
    return;
  }
  const state = await request('/api/session?optional=1').then(
    (s) => (s?.id ? { user: s } : { anonymous: true }),
    (err) => (err.status === 401 ? { anonymous: true } : {}),
  );
  if (state.user) {
    location.replace(returnTo({ keepEntry: true }));
    return;
  }
  if (state.anonymous) {
    try {
      localStorage.removeItem('cinemap.user');
    } catch {
      /* ignore */
    }
  }
  await configReady.catch(() => {});
  if (state.anonymous && (await sso.silent(Object.assign(new Error(), { status: 401 }), { entry: fromTapnow || (embedded && embedSilentFirst()) }))) {
    if (embedLoading()) setTimeout(embedFailed, EMBED_TIMEOUT, 'failed', 'timeout');
    return;
  }
  if (embedLoading()) {
    embedFailed('failed', state.anonymous ? (authError ? 'auth-error' : 'no-silent') : 'session-unknown');
    return;
  }
  mountLoginMotion();
  sso.visible('loginVisible');
})();

window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    sso.reset();
    embedFailed('failed', 'bfcache');
  }
});
window.__cinemapLogin = { diagnostics: () => sso.diagnostics(), world: () => loginWorldStats() };
