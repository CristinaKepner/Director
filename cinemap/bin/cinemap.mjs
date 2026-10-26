#!/usr/bin/env node
// CLI for the cinemap harness — the same Action entry the editor and the agent use.
//   cinemap.mjs capabilities [--project ID]
//   cinemap.mjs projects
//   cinemap.mjs invoke <projectId> <action> ['{"json":"payload"}'] [--dry-run]
//   cinemap.mjs agent <projectId> "<text>" [--mode lead|collaborative|manual] [--backend rules|model]
//   cinemap.mjs context <projectId>
// Signs in through the local mock TapNow authorize page (no real account involved).
const BASE = process.env.CINEMAP_URL || 'http://localhost:5180';
const [cmd, ...rest] = process.argv.slice(2);
const flag = (k, d = null) => (rest.includes(k) ? rest[rest.indexOf(k) + 1] ?? d : d);
const positional = rest.filter((a, i) => !a.startsWith('--') && !['--mode', '--backend', '--project'].includes(rest[i - 1]));
let cookie = '';
async function signIn() {
  const start = await fetch(`${BASE}/api/tapnow/sso/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'interactive', returnTo: '/' }) }).then((r) => r.json());
  const allow = await fetch(`${BASE}/mock-tapnow/authorize`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state: start.state, decision: 'allow', name: 'CLI' }) });
  cookie = (allow.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ');
}
const call = (path, init = {}) => fetch(`${BASE}${path}`, { ...init, headers: { 'Content-Type': 'application/json', 'x-cinemap-source': 'cli', cookie, ...(init.headers || {}) } }).then((r) => r.json());
const show = (x) => console.log(JSON.stringify(x, null, 2));
await signIn();
if (cmd === 'capabilities') {
  const caps = await call(`/api/capabilities${flag('--project') ? `?project=${flag('--project')}` : ''}`);
  for (const c of caps) console.log(`${c.name.padEnd(20)} ${c.undoable ? '↶' : ' '} ${c.doc}${c.required?.length ? `  [${c.required.join(', ')}]` : ''}`);
} else if (cmd === 'projects') show((await call('/api/projects')).projects.map((p) => ({ id: p.id, name: p.name, starter: p.starter })));
else if (cmd === 'invoke') {
  const [projectId, action, payload] = positional;
  show(await call(`/api/projects/${projectId}/actions`, { method: 'POST', body: JSON.stringify({ action, payload: payload ? JSON.parse(payload) : {}, meta: { source: 'cli', dryRun: rest.includes('--dry-run') } }) }));
} else if (cmd === 'agent') {
  const [projectId, text] = positional;
  show(await call(`/api/projects/${projectId}/agent`, { method: 'POST', body: JSON.stringify({ text, mode: flag('--mode') || undefined, backend: flag('--backend') || undefined }) }));
} else if (cmd === 'context') {
  const c = await call(`/api/projects/${positional[0]}/context`);
  show({ state: c.state, size: c.size, settings: c.settings, items: c.items.length, events: c.events.slice(-5), history: c.history });
} else console.log('usage: capabilities | projects | invoke <project> <action> [json] | agent <project> "<text>" | context <project>');
