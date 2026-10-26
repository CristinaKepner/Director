import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp, createConfig } from '../server.mjs';

async function listen() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cinemap-test-'));
  const app = createApp({ config: createConfig(), dataDir });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  return { app, base, close: () => new Promise((r) => app.server.close(r)) };
}
const cookieOf = (res) => (res.headers.getSetCookie?.() || [res.headers.get('set-cookie')].filter(Boolean)).map((c) => c.split(';')[0]).join('; ');

test('config and anonymous session', async () => {
  const { base, close } = await listen();
  try {
    const cfg = await (await fetch(`${base}/api/config`)).json();
    assert.equal(cfg.loginMode, 'tapnow');
    assert.equal(cfg.tapnowSsoEnabled, true);
    const s = await (await fetch(`${base}/api/session?optional=1`)).json();
    assert.deepEqual(s, { signedIn: false });
    const strict = await fetch(`${base}/api/session`);
    assert.equal(strict.status, 401);
  } finally {
    await close();
  }
});

test('project pages redirect to login with next', async () => {
  const { base, close } = await listen();
  try {
    const r = await fetch(`${base}/p/383ee4ba-0ba6-4f9f-8db8-74d3ed38fd14`, { redirect: 'manual' });
    assert.equal(r.status, 302);
    assert.equal(r.headers.get('location'), '/login?next=%2Fp%2F383ee4ba-0ba6-4f9f-8db8-74d3ed38fd14');
    const login = await fetch(`${base}/login?next=%2Fp%2Fx`);
    assert.equal(login.status, 200);
    assert.match(await login.text(), /id="tapnowSignIn"/);
  } finally {
    await close();
  }
});

test('silent SSO bounces back with TAPNOW_SSO_LOGIN_REQUIRED, interactive signs in through the mock', async () => {
  const { base, close } = await listen();
  try {
    const start = await (await fetch(`${base}/api/tapnow/sso/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'silent', returnTo: '/p/abc' }) })).json();
    assert.match(start.url, /\/api\/bff\/cinemap\/authorize\?state=/);
    const bounce = await fetch(start.url, { redirect: 'manual' });
    assert.equal(bounce.status, 302);
    assert.equal(bounce.headers.get('location'), '/login?auth_error=TAPNOW_SSO_LOGIN_REQUIRED&next=%2Fp%2Fabc');

    const inter = await (await fetch(`${base}/api/tapnow/sso/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'interactive', returnTo: '/p/abc' }) })).json();
    const hop = await fetch(inter.url, { redirect: 'manual' });
    assert.equal(hop.status, 302);
    assert.match(hop.headers.get('location'), /^\/mock-tapnow\/authorize\?state=/);
    const allow = await fetch(`${base}/mock-tapnow/authorize`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state: inter.state, decision: 'allow', name: 'Tester' }) });
    const body = await allow.json();
    assert.equal(body.next, '/p/abc');
    const cookie = cookieOf(allow);
    assert.match(cookie, /cm_sid=/);
    const me = await (await fetch(`${base}/api/session`, { headers: { cookie } })).json();
    assert.equal(me.signedIn, true);
    assert.equal(me.name, 'Tester');
    // a remembered mock account makes the silent path succeed next time
    const again = await (await fetch(`${base}/api/tapnow/sso/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'silent', returnTo: '/' }) })).json();
    const ok = await fetch(again.url, { redirect: 'manual', headers: { cookie } });
    assert.equal(ok.headers.get('location'), '/');
  } finally {
    await close();
  }
});

test('projects are private to the session owner', async () => {
  const { base, close } = await listen();
  try {
    const inter = await (await fetch(`${base}/api/tapnow/sso/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'interactive', returnTo: '/' }) })).json();
    const allow = await fetch(`${base}/mock-tapnow/authorize`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state: inter.state, decision: 'allow' }) });
    const cookie = cookieOf(allow);
    const created = await (await fetch(`${base}/api/projects`, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ name: 'Harbour' }) })).json();
    assert.equal(created.project.name, 'Harbour');
    const list = await (await fetch(`${base}/api/projects`, { headers: { cookie } })).json();
    assert.equal(list.projects.length, 1);
    const page = await fetch(`${base}/p/${created.project.id}`, { headers: { cookie } });
    assert.equal(page.status, 200);
    const missing = await fetch(`${base}/p/nope`, { headers: { cookie } });
    assert.equal(missing.status, 404);
    const anon = await fetch(`${base}/api/projects/${created.project.id}`);
    assert.equal(anon.status, 401);
  } finally {
    await close();
  }
});

test('static files never escape the web root', async () => {
  const { base, close } = await listen();
  try {
    const r = await fetch(`${base}/..%2F..%2Fpackage.json`);
    assert.notEqual(r.status, 200);
    const js = await fetch(`${base}/js/login.js`);
    assert.equal(js.status, 200);
    assert.match(js.headers.get('content-type'), /javascript/);
  } finally {
    await close();
  }
});

test('catalog, prefs, scenes and the local agent planner', async () => {
  const { base, close } = await listen();
  try {
    const templates = await (await fetch(`${base}/api/templates`)).json();
    assert.ok(templates.length >= 10);
    assert.ok(templates.some((t) => t.id === 'blank'));
    const cover = await fetch(`${base}/api/templates/harbor_town/media/cover?v=1`);
    assert.equal(cover.status, 200);
    assert.match(cover.headers.get('content-type'), /svg/);
    assert.match(await cover.text(), /<svg/);

    const inter = await (await fetch(`${base}/api/tapnow/sso/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'interactive', returnTo: '/' }) })).json();
    const allow = await fetch(`${base}/mock-tapnow/authorize`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state: inter.state, decision: 'allow' }) });
    const cookie = cookieOf(allow);
    const h = { 'Content-Type': 'application/json', cookie };
    assert.equal((await fetch(`${base}/api/prefs?key=x`)).status, 401);
    await fetch(`${base}/api/prefs`, { method: 'POST', headers: h, body: JSON.stringify({ key: 'home.beta.dismissed', value: 1 }) });
    const pref = await (await fetch(`${base}/api/prefs?key=home.beta.dismissed`, { headers: h })).json();
    assert.equal(pref.value, 1);

    const created = await (await fetch(`${base}/api/scenes`, { method: 'POST', headers: h, body: JSON.stringify({ name: 'Valley', starter: 'valley_village' }) })).json();
    assert.equal(created.data.starter, 'valley_village');
    const one = await (await fetch(`${base}/api/scenes?id=${created.data.id}`, { headers: h })).json();
    assert.equal(one.data.name, 'Valley');
    const missing = await fetch(`${base}/api/scenes?id=nope`, { headers: h });
    assert.equal(missing.status, 404);
    const patched = await (await fetch(`${base}/api/projects/${created.data.id}`, { method: 'PATCH', headers: h, body: JSON.stringify({ world: { placed: [{ id: 'p1', kind: 'tree', x: 1, z: 2 }] }, conversation: [{ role: 'user', text: 'hi' }] }) })).json();
    assert.equal(patched.project.world.placed.length, 1);
    assert.equal(patched.project.conversation.length, 1);

    const plan = await (await fetch(`${base}/api/agent`, { method: 'POST', headers: h, body: JSON.stringify({ prompt: '在湖边放三棵树和一栋小房子，黄昏', lang: 'zh' }) })).json();
    assert.deepEqual(plan.steps.map((s) => [s.op, s.kind ?? s.hour, s.count ?? null]), [['place', 'house', 1], ['place', 'tree', 3], ['time', 18.5, null]]);
    assert.equal(plan.steps[1].near, 'water');

    const three = await fetch(`${base}/vendor/three/three.module.js`);
    assert.equal(three.status, 200);
    const escape = await fetch(`${base}/vendor/three/..%2F..%2Fpackage.json`);
    assert.notEqual(escape.status, 200);
  } finally {
    await close();
  }
});
