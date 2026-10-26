#!/usr/bin/env node
// Cinemap client replica — local host.
// Serves the rebuilt client from ./web and provides the small set of JSON routes the
// client expects (/api/config, /api/session, TapNow SSO start/callback, projects).
// The real product signs in through TapNow; here a local mock authorize page stands in
// for it so the whole flow (silent attempt → interactive → callback → session cookie)
// runs on localhost without any external service.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(ROOT, 'web');
const DATA = path.join(ROOT, 'data');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

export function createConfig(overrides = {}) {
  return {
    tapnowFrontendOrigin: 'http://localhost:5180/mock-tapnow',
    tapnowTopUpUrl: 'http://localhost:5180/mock-tapnow/account/top-up?from=cinemap',
    tapnowBillingRecordsUrl: 'http://localhost:5180/mock-tapnow/account/billing?from=cinemap',
    tapnowPricingUrl: 'http://localhost:5180/mock-tapnow/account/pricing?from=cinemap',
    tapnowPaymentCenter: true,
    betaFree: true,
    loginMode: 'tapnow',
    legacyLoginEnabled: false,
    tapnowSsoEnabled: true,
    tapnowSsoOrigins: [],
    tapnowEnabled: true,
    preview: false,
    entryTimer: false,
    personLibrary: false,
    setupRequired: false,
    ...overrides,
  };
}

const SESSION_COOKIE = 'cm_sid';
const PROJECT_RE = /^\/p\/([\w-]{1,80})$/;
const SHARE_RE = /^\/share\/([A-Za-z0-9_-]{16,64})$/;

function parseCookies(header = '') {
  const out = {};
  for (const part of String(header).split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function json(res, status, body, headers = {}) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(text);
}

function readBody(req, limit = 1 << 20) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error('body too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error('invalid json'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function safeReturnTo(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/';
  if (/[\\\r\n\t]/.test(value)) return '/';
  return value;
}

class ProjectStore {
  constructor(file) {
    this.file = file;
    this.projects = new Map();
    this.load();
  }
  load() {
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      for (const p of raw.projects || []) this.projects.set(p.id, p);
    } catch {
      /* fresh store */
    }
  }
  save() {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify({ projects: [...this.projects.values()] }, null, 2));
    } catch {
      /* data dir may be read-only in tests */
    }
  }
  list(ownerId) {
    return [...this.projects.values()]
      .filter((p) => p.ownerId === ownerId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }
  get(id) {
    return this.projects.get(id) || null;
  }
  create(ownerId, { name, starter = 'blank', prompt = '' } = {}) {
    const now = Date.now();
    const project = {
      id: crypto.randomUUID(),
      ownerId,
      name: String(name || 'Untitled world').slice(0, 100),
      starter,
      prompt: String(prompt || '').slice(0, 4000),
      createdAt: now,
      updatedAt: now,
      scene: null,
      activity: [],
    };
    this.projects.set(project.id, project);
    this.save();
    return project;
  }
  update(id, patch) {
    const p = this.projects.get(id);
    if (!p) return null;
    Object.assign(p, patch, { updatedAt: Date.now() });
    this.save();
    return p;
  }
  remove(id) {
    const ok = this.projects.delete(id);
    if (ok) this.save();
    return ok;
  }
}

export function createApp({ config = createConfig(), dataDir = DATA, webDir = WEB } = {}) {
  const sessions = new Map(); // sid -> user
  const pending = new Map(); // sso state -> { returnTo, mode, createdAt }
  const store = new ProjectStore(path.join(dataDir, 'projects.json'));
  const mockUser = {
    id: 'u_local_demo',
    name: 'Local Creator',
    email: 'creator@localhost',
    tapnowUserId: '10001',
    orgId: 'org_local',
    authenticated: true,
    eligible: true,
    connected: true,
    balance: 1200,
  };

  const sessionOf = (req) => {
    const sid = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    return sid && sessions.get(sid) ? { sid, user: sessions.get(sid) } : null;
  };
  const setSession = (res, user) => {
    const sid = crypto.randomBytes(18).toString('base64url');
    sessions.set(sid, user);
    return `${SESSION_COOKIE}=${sid}; Path=/; HttpOnly; SameSite=Lax`;
  };
  const clearCookie = () => `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

  const sendFile = (res, file, status = 200, extra = {}) => {
    const ext = path.extname(file);
    let body;
    try {
      body = fs.readFileSync(file);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(status, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-store' : /\.(woff2|png|webp|svg|ico)$/.test(ext) ? 'public, max-age=3600' : 'no-cache',
      ...extra,
    });
    res.end(body);
  };

  const redirect = (res, to, extra = {}) => {
    res.writeHead(302, { Location: to, 'Cache-Control': 'no-store', ...extra });
    res.end();
  };

  const loginUrl = (next, params = {}) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v != null) q.set(k, v);
    if (next) q.set('next', next);
    return '/login' + (q.size ? '?' + q : '');
  };

  async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;
    const method = req.method || 'GET';
    const session = sessionOf(req);

    // ---------- JSON API
    if (p === '/api/config') return json(res, 200, config);
    if (p === '/api/session') {
      if (session) return json(res, 200, { ...session.user, signedIn: true });
      return url.searchParams.get('optional') ? json(res, 200, { signedIn: false }) : json(res, 401, { error: 'unauthorized' });
    }
    if (p === '/api/logout' && method === 'POST') {
      if (session) sessions.delete(session.sid);
      return json(res, 200, { ok: true }, { 'Set-Cookie': clearCookie() });
    }
    if (p === '/api/login' && method === 'POST') {
      if (config.setupRequired) return json(res, 503, { error: 'setup', code: 'IDENTITY_STORE_UNAVAILABLE' });
      if (!config.legacyLoginEnabled) return json(res, 403, { error: 'legacy disabled', code: 'TAPNOW_CONNECTION_REQUIRED' });
      const body = await readBody(req);
      if (!body.email || !body.password) return json(res, 400, { error: 'input', code: 'LOGIN_INPUT_INVALID' });
      return json(res, 200, { ok: true, user: mockUser }, { 'Set-Cookie': setSession(res, { ...mockUser, email: body.email }) });
    }
    if (p === '/api/tapnow/sso/start' && method === 'POST') {
      if (!config.tapnowSsoEnabled) return json(res, 503, { error: 'sso off', code: 'TAPNOW_SSO_UNAVAILABLE' });
      const body = await readBody(req);
      const state = crypto.randomBytes(12).toString('base64url');
      const mode = body.mode === 'silent' ? 'silent' : 'interactive';
      pending.set(state, { returnTo: safeReturnTo(body.returnTo), mode, reconcile: !!body.reconcile, createdAt: Date.now() });
      const authorize = new URL('/api/bff/cinemap/authorize', `https://localhost`);
      authorize.searchParams.set('state', state);
      authorize.searchParams.set('mode', mode);
      // The real client only accepts an https authorize URL on the /api/bff/cinemap/authorize path.
      // Locally we hand back the same shape and let the mock host answer it over http.
      return json(res, 200, { url: authorize.href.replace('https://localhost', `http://${req.headers.host || 'localhost:5180'}`), state, mode });
    }
    if (p === '/api/bff/cinemap/authorize') {
      const state = url.searchParams.get('state') || '';
      const entry = pending.get(state);
      if (!entry) return redirect(res, loginUrl(null, { auth_error: 'TAPNOW_SSO_INVALID' }));
      if (entry.mode === 'silent') {
        // Silent mode: succeed only if the mock TapNow account is already "remembered".
        const remembered = parseCookies(req.headers.cookie).mock_tapnow === '1';
        if (!remembered) {
          pending.delete(state);
          return redirect(res, loginUrl(entry.returnTo, { auth_error: 'TAPNOW_SSO_LOGIN_REQUIRED' }));
        }
        pending.delete(state);
        return redirect(res, entry.returnTo, { 'Set-Cookie': setSession(res, mockUser) });
      }
      return redirect(res, `/mock-tapnow/authorize?state=${encodeURIComponent(state)}`);
    }
    if (p === '/mock-tapnow/authorize' && method === 'GET') {
      return sendFile(res, path.join(webDir, 'mock-tapnow.html'));
    }
    if (p === '/mock-tapnow/authorize' && method === 'POST') {
      const body = await readBody(req);
      const entry = pending.get(body.state || '');
      if (!entry) return json(res, 400, { error: 'expired', code: 'TAPNOW_SSO_EXPIRED' });
      pending.delete(body.state);
      if (body.decision !== 'allow') return json(res, 200, { next: loginUrl(entry.returnTo, { auth_error: 'TAPNOW_SSO_LOGIN_REQUIRED' }) });
      const user = { ...mockUser, name: String(body.name || mockUser.name).slice(0, 60) };
      res.setHeader('Set-Cookie', [setSession(res, user), 'mock_tapnow=1; Path=/; SameSite=Lax']);
      return json(res, 200, { next: entry.returnTo });
    }
    if (p === '/api/tapnow/sso/redeem' && method === 'POST') {
      const body = await readBody(req);
      if (!body.invite_code) return json(res, 400, { error: 'invite', code: 'CINEMAP_INVITE_REQUIRED' });
      if (body.invite_code !== 'LOCAL-DEMO') return json(res, 403, { error: 'invite', code: 'CINEMAP_INVITE_INVALID' });
      return json(res, 200, { ok: true, returnTo: '/' }, { 'Set-Cookie': setSession(res, mockUser) });
    }
    if (p === '/api/tapnow/sso/embed-event' && method === 'POST') {
      await readBody(req).catch(() => ({}));
      return json(res, 204, {});
    }

    // ---------- Projects (session required)
    if (p.startsWith('/api/projects')) {
      if (!session) return json(res, 401, { error: 'unauthorized' });
      const m = /^\/api\/projects(?:\/([\w-]{1,80}))?$/.exec(p);
      if (!m) return json(res, 404, { error: 'not found' });
      const id = m[1];
      if (!id && method === 'GET') return json(res, 200, { projects: store.list(session.user.id) });
      if (!id && method === 'POST') return json(res, 201, { project: store.create(session.user.id, await readBody(req)) });
      const project = id && store.get(id);
      if (!project || project.ownerId !== session.user.id) return json(res, 404, { error: 'not found', code: 'PROJECT_NOT_FOUND' });
      if (method === 'GET') return json(res, 200, { project });
      if (method === 'PATCH') {
        const body = await readBody(req);
        const patch = {};
        if (typeof body.name === 'string') patch.name = body.name.slice(0, 100);
        if (body.scene !== undefined) patch.scene = body.scene;
        if (Array.isArray(body.activity)) patch.activity = body.activity.slice(-500);
        return json(res, 200, { project: store.update(id, patch) });
      }
      if (method === 'DELETE') return json(res, 200, { ok: store.remove(id) });
      return json(res, 405, { error: 'method' });
    }

    // ---------- Pages
    if (p === '/login') return sendFile(res, path.join(webDir, 'login.html'));
    if (p === '/' || PROJECT_RE.test(p) || SHARE_RE.test(p)) {
      if (!session) return redirect(res, loginUrl(p === '/' ? null : p));
      const m = PROJECT_RE.exec(p);
      if (m && !store.get(m[1])) return sendFile(res, path.join(webDir, 'app.html'), 404);
      return sendFile(res, path.join(webDir, m ? 'app.html' : 'home.html'));
    }

    // ---------- Static
    if (method !== 'GET' && method !== 'HEAD') return json(res, 405, { error: 'method' });
    const rel = path.normalize(decodeURIComponent(p)).replace(/^(\.\.[/\\])+/, '');
    const file = path.join(webDir, rel);
    if (!file.startsWith(webDir)) return json(res, 403, { error: 'forbidden' });
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return sendFile(res, file);
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('not found');
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      json(res, err.status || 500, { error: err.message || 'internal' });
    });
  });
  return { server, sessions, store, config };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const portIdx = args.indexOf('--port');
  const port = Number(portIdx >= 0 ? args[portIdx + 1] : process.env.PORT || 5180);
  const { server } = createApp();
  server.listen(port, '127.0.0.1', () => {
    console.log(`cinemap replica listening on http://localhost:${port}/login`);
  });
}
