// TapNow single sign-on from the login page.
//  silent      — on arrival, once per tab: ask the server for an authorize URL in silent mode
//                and follow it; TapNow bounces back with auth_error=TAPNOW_SSO_LOGIN_REQUIRED
//                when there is no TapNow session.
//  interactive — the big button.
//  reconcile   — re-link an existing session after TapNow reports a mismatch.
//  redeem      — first sign-in with an invitation code.
// Entry timing is measured from the first page the user landed on, across the round trip.
import { lang, onLang } from './i18n.js';
import { setLoginBusy } from './login-motion.js';
import { uiText } from './copy.js';
import { reachableTapnowOrigin, setTapnowOrigins } from './origin.js';
import { imeSafeEnter } from './ime.js';

const K_ATTEMPTED = 'cinemap.sso.attempted';
const K_RECONCILED = 'cinemap.sso.reconciled';
const K_RECONCILING = 'cinemap.sso.reconciling';
const K_TIMING = 'cinemap.sso.entryTiming';
const $ = (id) => document.getElementById(id);

export function takeEntryHint(params) {
  const uid = params.get('tn_uid');
  const org = params.get('tn_org');
  params.delete('tn_uid');
  params.delete('tn_org');
  return uid && org ? { uid, org } : null;
}
export const entryMatches = (hint, session, id) =>
  !!(hint && session?.authenticated && session.id === id && session.eligible && session.connected && String(session.tapnowUserId) === hint.uid && String(session.orgId) === hint.org);

export function mountSso({ request, showInvite = () => {}, errorCopy, notify = () => {}, onRedeemed = () => {}, onNotice = () => false, returnTo = () => location.pathname + location.search + location.hash }) {
  const form = $('loginForm');
  const button = form && $('tapnowSignIn');
  const legacy = form && $('legacySignIn');
  const invite = form && $('tnInviteSubmit');
  const message = $('loginMessage');
  let config = {};
  let busy = false;
  let configured = false;
  let signedIn = false;
  let pendingReconcileNotice = false;
  let wasReconciling = false;
  let saved;
  try {
    wasReconciling = !!sessionStorage.getItem(K_RECONCILING);
    sessionStorage.removeItem(K_RECONCILING);
  } catch {
    /* ignore */
  }
  try {
    saved = JSON.parse(sessionStorage.getItem(K_TIMING) || 'null');
    sessionStorage.removeItem(K_TIMING);
  } catch {
    /* ignore */
  }
  const navStart = performance.timeOrigin;
  const started = saved?.startedAt > Date.now() - 9e5 && saved.startedAt <= navStart ? saved.startedAt : navStart;
  const timing = { status: 'opening', startedAt: started, navigationStartedAt: navStart, roundtrip: started !== navStart, stages: {} };
  const visible = (stage) => {
    if (timing.status !== 'opening') return;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (timing.status !== 'opening') return;
        timing.stages[stage] = Math.round((Date.now() - started) * 10) / 10;
        timing.totalMs = timing.stages[stage];
        timing.status = stage;
        document.documentElement.dataset.cinemapLoginTiming = JSON.stringify(timing);
        performance.mark('cinemap:entry:' + stage);
      }),
    );
  };
  const text = (key) => uiText(lang(), key);
  const say = (s) => message && (message.textContent = s);
  const flushReconcileNotice = () => {
    if (pendingReconcileNotice) {
      pendingReconcileNotice = false;
      notify(errorCopy({ code: 'TAPNOW_RECONCILE_UNAVAILABLE' }));
    }
  };
  const markAttempted = () => {
    try {
      sessionStorage.setItem(K_ATTEMPTED, '1');
    } catch {
      /* ignore */
    }
  };
  const attempted = () => {
    try {
      return !!sessionStorage.getItem(K_ATTEMPTED);
    } catch {
      return true;
    }
  };
  const idle = () => {
    busy = false;
    if (button) button.disabled = false;
    setLoginBusy(false);
  };

  async function begin(mode = 'interactive', { reconcile = false } = {}) {
    if (busy || !config.tapnowSsoEnabled) return;
    busy = true;
    if (!reconcile) markAttempted();
    if (button) button.disabled = true;
    setLoginBusy(true);
    say(mode === 'silent' ? text('checking-tapnow-sign-in') : '');
    try {
      const origin = await reachableTapnowOrigin();
      const r = await request('/api/tapnow/sso/start', { mode, reconcile, returnTo: returnTo(), invite_code: $('tnInvite')?.value || '', ...(origin ? { origin } : {}) });
      const u = new URL(r.url);
      const localhost = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
      if ((u.protocol !== 'https:' && !localhost) || u.pathname !== '/api/bff/cinemap/authorize') throw new Error('unexpected authorize url');
      try {
        sessionStorage.setItem(K_TIMING, JSON.stringify({ startedAt: started }));
      } catch {
        /* ignore */
      }
      if (reconcile) {
        try {
          sessionStorage.setItem(K_RECONCILED, '1');
          sessionStorage.setItem(K_RECONCILING, '1');
        } catch {
          /* ignore */
        }
      }
      location.assign(u.href);
      return true;
    } catch (err) {
      if (reconcile) {
        say('');
        notify(errorCopy({ code: 'TAPNOW_RECONCILE_UNAVAILABLE' }));
      } else say(errorCopy({ code: err.info?.code || 'TAPNOW_SSO_UNAVAILABLE' }));
      idle();
    }
  }

  async function redeem() {
    if (busy || !invite || invite.hidden) return;
    const code = $('tnInvite').value.trim();
    if (!code) {
      say(errorCopy({ code: 'CINEMAP_INVITE_REQUIRED' }));
      $('tnInvite').focus();
      return;
    }
    busy = true;
    invite.disabled = true;
    invite.setAttribute('aria-busy', 'true');
    button.disabled = true;
    setLoginBusy(true);
    say('');
    relabel();
    let ok = false;
    try {
      const r = await request('/api/tapnow/sso/redeem', { invite_code: code });
      $('tnInvite').value = '';
      await onRedeemed(r);
      ok = true;
    } catch (err) {
      const c = err.info?.code || 'TAPNOW_SSO_UNAVAILABLE';
      say(errorCopy({ code: c }));
      if (c === 'TAPNOW_SSO_PENDING_EXPIRED') {
        invite.hidden = true;
        button.hidden = false;
      }
      $('tnInvite').focus();
    } finally {
      busy = false;
      invite.disabled = false;
      invite.removeAttribute('aria-busy');
      button.disabled = false;
      setLoginBusy(ok);
      relabel();
    }
  }

  function relabel() {
    if (!button) return;
    const span = button.querySelector('span');
    const tn = span.querySelector('.tn');
    const label = text('continue-with-tapnow');
    const at = label.indexOf('TapNow');
    if (tn && at >= 0) span.replaceChildren(label.slice(0, at), tn, label.slice(at + 6));
    else span.textContent = label;
    if (invite) invite.textContent = text(invite.hasAttribute('aria-busy') ? 'entering-cinemap' : 'enter-cinemap');
  }

  if (form) {
    button.onclick = () => begin();
    invite.onclick = () => redeem();
    $('tnInvite').addEventListener('keydown', (e) => {
      if (imeSafeEnter(e)) {
        e.preventDefault();
        invite.hidden ? begin() : redeem();
      }
    });
    relabel();
  }
  onLang(relabel);

  return {
    configure(c) {
      config = c;
      configured = true;
      setTapnowOrigins(c.tapnowSsoEnabled ? c.tapnowSsoOrigins : []);
      if (form) {
        const sso = !!c.tapnowSsoEnabled;
        if (sso) {
          button.hidden = false;
          legacy.hidden = true;
        } else {
          button.remove();
          legacy.hidden = false;
        }
        for (const el of [$('email'), $('password'), $('submit')]) el.disabled = sso;
        if (sso) {
          $('tnAccountNote') && ($('tnAccountNote').hidden = true);
          $('tnRegistration') && ($('tnRegistration').hidden = true);
        }
        relabel();
      }
      if ($('switchAccount')) $('switchAccount').hidden = !c.tapnowSsoEnabled;
      if (!c.tapnowSsoEnabled) return;
      const q = new URLSearchParams(location.search);
      const notice = q.get('auth_notice');
      if (notice) {
        q.delete('auth_notice');
        history.replaceState(null, '', location.pathname + (q.size ? '?' + q : '') + location.hash);
        if (['TAPNOW_ACCOUNT_SWITCHED', 'TAPNOW_ACCOUNT_MISMATCH', 'TAPNOW_RECONNECT_REQUIRED', 'TAPNOW_TEAM_FOLLOWED'].includes(notice) && !onNotice(notice)) notify(errorCopy({ code: notice }));
        if (notice === 'TAPNOW_RECONCILE_RETRY') {
          try {
            sessionStorage.removeItem(K_RECONCILED);
          } catch {
            /* ignore */
          }
          notify(errorCopy({ code: 'TAPNOW_RECONCILE_UNAVAILABLE' }));
        }
      }
      const q2 = new URLSearchParams(location.search);
      const error = q2.get('auth_error');
      if (error) {
        if (wasReconciling) {
          try {
            sessionStorage.removeItem(K_RECONCILED);
          } catch {
            /* ignore */
          }
          pendingReconcileNotice = true;
          if (signedIn) flushReconcileNotice();
        }
        markAttempted();
        q2.delete('auth_error');
        history.replaceState(null, '', location.pathname + (q2.size ? '?' + q2 : '') + location.hash);
        say(error !== 'TAPNOW_SSO_LOGIN_REQUIRED' ? errorCopy({ code: error }) : '');
        if (form && (error === 'CINEMAP_INVITE_REQUIRED' || error === 'CINEMAP_INVITE_INVALID')) {
          invite.hidden = false;
          button.hidden = true;
          showInvite();
        }
      }
    },
    async reconcile() {
      if (!configured) {
        notify(errorCopy({ code: 'TAPNOW_RECONCILE_UNAVAILABLE' }));
        return false;
      }
      return config.tapnowSsoEnabled ? (await begin('silent', { reconcile: true })) === true : false;
    },
    async silent(err, { entry = false } = {}) {
      return config.tapnowSsoEnabled && err.status === 401 && (entry || !attempted()) ? await begin('silent') : false;
    },
    signedIn() {
      signedIn = true;
      flushReconcileNotice();
    },
    reset() {
      if (busy) {
        idle();
        say('');
      }
    },
    begin,
    visible,
    diagnostics: () => timing,
    logout: markAttempted,
  };
}
