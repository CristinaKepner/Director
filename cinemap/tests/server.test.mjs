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
    assert.deepEqual(plan.steps.map((s) => [s.action, s.payload.kind ?? s.payload.hour, s.payload.count ?? null]), [['world.place', 'tree', 3], ['world.place', 'house', 1], ['world.time', 18.5, null]]);
    assert.equal(plan.steps[1].payload.near, 'water');

    const three = await fetch(`${base}/vendor/three/three.module.js`);
    assert.equal(three.status, 200);
    const escape = await fetch(`${base}/vendor/three/..%2F..%2Fpackage.json`);
    assert.notEqual(escape.status, 200);
  } finally {
    await close();
  }
});

test('harness: capabilities, actions with validation, undo, events and the agent modes', async () => {
  const { base, close } = await listen();
  try {
    const inter = await (await fetch(`${base}/api/tapnow/sso/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'interactive', returnTo: '/' }) })).json();
    const allow = await fetch(`${base}/mock-tapnow/authorize`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state: inter.state, decision: 'allow' }) });
    const h = { 'Content-Type': 'application/json', cookie: cookieOf(allow) };
    const caps = await (await fetch(`${base}/api/capabilities`)).json();
    assert.ok(caps.some((c) => c.name === 'world.place' && c.undoable));
    assert.ok(caps.some((c) => c.name === 'agent.confirm'));
    const { project } = await (await fetch(`${base}/api/projects`, { method: 'POST', headers: h, body: JSON.stringify({ name: 'H', starter: 'harbor_town' }) })).json();
    const act = (action, payload = {}, meta = {}) => fetch(`${base}/api/projects/${project.id}/actions`, { method: 'POST', headers: h, body: JSON.stringify({ action, payload, meta }) }).then((r) => r.json());
    const ctx0 = await (await fetch(`${base}/api/projects/${project.id}/context`, { headers: h })).json();
    const baseCount = ctx0.items.length;
    assert.ok(baseCount > 20);
    const bad = await act('world.place', { kind: 'dragon' });
    assert.equal(bad.ok, false);
    assert.equal(bad.error, 'UNKNOWN_KIND');
    const dry = await act('world.place', { kind: 'tree', count: 2 }, { dryRun: true });
    assert.equal(dry.dryRun, true);
    const placed = await act('world.place', { kind: 'tree', count: 2, near: 'water' });
    assert.equal(placed.ok, true);
    assert.equal(placed.ids.length, 2);
    const moved = await act('world.move', { id: placed.ids[0], x: 5, z: 5 });
    assert.equal(moved.ok, true);
    const ctx1 = await (await fetch(`${base}/api/projects/${project.id}/context`, { headers: h })).json();
    assert.equal(ctx1.items.length, baseCount + 2);
    const evt = ctx1.events.find((e) => e.id === moved.eventId);
    assert.equal(evt.source, 'human');
    assert.equal(evt.after.x, 5);
    assert.notEqual(evt.before.x, 5);
    assert.equal((await act('project.undo')).ok, true);
    assert.equal((await act('project.undo')).ok, true);
    const ctx2 = await (await fetch(`${base}/api/projects/${project.id}/context`, { headers: h })).json();
    assert.equal(ctx2.items.length, baseCount);
    // collaborative: plan waits, confirm with a skip executes the rest
    await act('agent.set-mode', { mode: 'collaborative' });
    const run = await (await fetch(`${base}/api/projects/${project.id}/agent`, { method: 'POST', headers: h, body: JSON.stringify({ text: '放两盏路灯和一棵树，黄昏' }) })).json();
    assert.equal(run.pending, true);
    assert.equal(run.plan.length, 3);
    const confirmed = await act('agent.confirm', { skip: [1] });
    assert.equal(confirmed.okCount, 2);
    assert.equal(confirmed.skipped, 1);
    const ctx3 = await (await fetch(`${base}/api/projects/${project.id}/context`, { headers: h })).json();
    assert.equal(ctx3.items.filter((i) => i.kind === 'lamp' && !i.base).length, 2);
    assert.equal(ctx3.settings.hour, 18.5);
    assert.ok(ctx3.agent.messages.some((m) => m.role === 'tool' && m.tool.action === 'world.place' && m.tool.ok));
    // lead mode executes at once; clearing everything asks for confirmation unless forced
    await act('agent.set-mode', { mode: 'lead' });
    const lead = await (await fetch(`${base}/api/projects/${project.id}/agent`, { method: 'POST', headers: h, body: JSON.stringify({ text: '清掉所有东西' }) })).json();
    assert.equal(lead.pending, true);
    assert.equal((await act('agent.cancel')).ok, true);
    const forced = await (await fetch(`${base}/api/projects/${project.id}/agent`, { method: 'POST', headers: h, body: JSON.stringify({ text: '清掉所有东西', force: true }) })).json();
    assert.equal(forced.pending, false);
    const ctx4 = await (await fetch(`${base}/api/projects/${project.id}/context`, { headers: h })).json();
    assert.equal(ctx4.items.filter((i) => !i.base).length, 0);
    // questions are answered from a read
    const ask = await (await fetch(`${base}/api/projects/${project.id}/agent`, { method: 'POST', headers: h, body: JSON.stringify({ text: '场景里有什么？' }) })).json();
    assert.ok(ask.reads?.[0]?.counts);
    // persisted across runtime close/open
    const saved = await (await fetch(`${base}/api/projects/${project.id}`, { headers: h })).json();
    assert.equal(saved.project.world.settings.hour, 18.5);
  } finally {
    await close();
  }
});

test('desktop session: the loopback token signs the window in without TapNow', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cinemap-test-'));
  const app = createApp({ config: createConfig(), dataDir, desktopToken: 'tok_test' });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  try {
    const bad = await fetch(`${base}/desktop/session?token=nope`, { redirect: 'manual' });
    assert.equal(bad.status, 403);
    const ok = await fetch(`${base}/desktop/session?token=tok_test&next=%2F%23projects`, { redirect: 'manual' });
    assert.equal(ok.status, 302);
    assert.equal(ok.headers.get('location'), '/#projects');
    const me = await (await fetch(`${base}/api/session`, { headers: { cookie: cookieOf(ok) } })).json();
    assert.equal(me.signedIn, true);
    assert.equal(me.id, 'u_desktop');
  } finally {
    await new Promise((r) => app.server.close(r));
  }
});
