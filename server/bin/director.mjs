#!/usr/bin/env node
// director — command-line client of the Director Runtime.
//   Local mode  (default): loads a project JSON, runs the action in-process (core runtime), saves it back. No server needed.
//   Remote mode (--remote URL): sends the action to the Director backend (POST /api/actions). No browser needed.
//
//   director context.scene --json
//   director scene.demo --name city-edge --project ./stage.json
//   director entity.create --id hero --type character --proxy cylinder --position 0,0,2
//   director camera.create --id cam_a --type cine --focal-length 40 --target hero
//   director camera.look-at --id cam_a --target hero
//   director shot.create --id shot_01 --camera cam_a --duration 6 --motion dolly-in
//   director take.record --shot shot_01 --name "推近 T1"
//   director generation.prompt --shot shot_01
//   director agent "把 A 机降到 0.4m 并 look-at 主角"
//   director capabilities | director help [action] | director export --out storyboard.html --format html
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
if (!argv.length || argv[0] === "-h" || argv[0] === "--help") {
  usage();
  process.exit(0);
}

// ---- parse args: <action> [positional] [--key value|--flag] ----
const flags = {};
const positional = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith("--")) {
    const k = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) flags[k] = true;
    else {
      flags[k] = next;
      i++;
    }
  } else positional.push(a);
}
const command = positional.shift();
const wantJson = !!flags.json;
const dryRun = !!flags["dry-run"];
const remote = flags.remote || process.env.DIRECTOR_REMOTE || null;
const projectFile = path.resolve(flags.project || process.env.DIRECTOR_PROJECT || "director-project.json");
const source = flags.source || "cli";
const actor = flags.actor || undefined;
for (const k of ["json", "dry-run", "remote", "project", "source", "actor", "out", "format", "idempotency-key", "token"]) delete flags[k];

// camelCase keys, coerce values, and expand a few CLI aliases used in the spec
const ALIAS = { camera: "cameraId", shot: "shotId", take: "takeId", "semantic-name": "displayName", "focal-length": "focalLength", asset: "asset", state: "state" };
function coerce(v) {
  if (v === true) return true;
  if (typeof v !== "string") return v;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null") return null;
  if (/^[\[{]/.test(v)) {
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }
  if (/^-?\d+(\.\d+)?(\s*,\s*-?\d+(\.\d+)?)+$/.test(v)) return v.split(",").map(Number);
  if (v.includes(",") && !v.includes(" ")) return v.split(",").map((s) => s.trim());
  return v;
}
const payload = {};
for (const [k, v] of Object.entries(flags)) {
  const key = ALIAS[k] || k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  payload[key] = coerce(v);
}

// ---- built-in command sugar ----
let action = command;
if (command === "capabilities") action = "context.capabilities";
else if (command === "context") action = positional[0] ? `context.${positional[0]}` : "context.scene";
else if (command === "demo") {
  action = "scene.demo";
  payload.name = payload.name || positional[0] || "city-edge";
} else if (command === "agent") {
  action = "agent.run";
  payload.text = payload.text || positional.join(" ");
  payload.mode = payload.mode || "lead";
  payload.force = true;
} else if (command === "plan") {
  action = "agent.plan";
  payload.text = payload.text || positional.join(" ");
} else if (command === "export") {
  action = "storyboard.export";
  payload.format = argvFlag("format") || payload.format || "json";
} else if (command === "save") action = "project.export";
else if (command === "help") action = "__help";
else if (command === "serve") {
  process.argv.splice(2, 1); // drop "serve"; remaining flags go to the server
  await import("./director-server.mjs");
  await new Promise(() => {});
}

function argvFlag(name) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

// ---- execute ----
const t0 = Date.now();
let result;
if (remote) result = await runRemote(action, payload);
else result = await runLocal(action, payload);
print(result);
process.exit(result && result.ok === false ? 1 : 0);

async function runLocal(action, payload) {
  const R = await import(path.join(here, "..", "..", "core", "index.js"));
  if (action === "__help") return help(R, positional[0]);
  const meta = { source, actorId: actor, dryRun, idempotencyKey: argvFlag("idempotency-key") };
  let loaded = false;
  if (fs.existsSync(projectFile)) {
    try {
      R.loadProjectData(JSON.parse(fs.readFileSync(projectFile, "utf8")));
      loaded = true;
    } catch (err) {
      return { ok: false, error: "PROJECT_LOAD_FAILED", file: projectFile, message: err.message };
    }
  }
  const r = R.dispatch(action, payload, meta);
  // give simulated generation jobs a moment so `generation.submit` can report progress in --json
  if (action === "generation.submit" && r.ok) await new Promise((res) => setTimeout(res, 50));
  const writes = !action.startsWith("context.") && action !== "health.report" && action !== "agent.plan" && !dryRun && !(action === "storyboard.export") && !(action === "project.export");
  if (writes && r.ok !== false) {
    fs.mkdirSync(path.dirname(projectFile), { recursive: true });
    fs.writeFileSync(projectFile, JSON.stringify(R.persistable(), null, 2));
    r.savedTo = projectFile;
  } else if (!loaded && writes) r.hint = `no project file at ${projectFile}`;
  if (action === "storyboard.export" && r.ok && argvFlag("out")) {
    fs.writeFileSync(argvFlag("out"), r.content);
    r.wrote = argvFlag("out");
    delete r.content;
  }
  if (action === "project.export" && r.ok) {
    const out = argvFlag("out") || projectFile;
    fs.writeFileSync(out, JSON.stringify(r.data, null, 2));
    return { ok: true, wrote: out };
  }
  if (action === "agent.run" && r.ok) {
    const msgs = R.store.get().agent.messages.filter((m) => m.role === "agent").slice(-1);
    r.agentSays = msgs.map((m) => m.text);
  }
  return r;
}

async function runRemote(action, payload) {
  const base = remote.replace(/\/$/, "");
  const headers = { "content-type": "application/json" };
  const token = process.env.DIRECTOR_TOKEN || argvFlag("token");
  if (token) headers.authorization = `Bearer ${token}`;
  try {
    if (action === "__help") {
      const res = await fetch(`${base}/api/capabilities${positional[0] ? "/" + positional[0] : ""}`, { headers });
      const out = await res.json();
      if (out.data) return { ok: true, actions: out.data.map((c) => `${c.name.padEnd(26)} ${c.doc}`) };
      return out;
    }
    const body = { action, payload, meta: { source, actorId: actor, dryRun, idempotencyKey: argvFlag("idempotency-key") } };
    const res = await fetch(`${base}/api/actions`, { method: "POST", headers, body: JSON.stringify(body) });
    const out = await res.json();
    if (action === "agent.run" && out.ok && !out.agentSays) {
      const st = await (await fetch(`${base}/api/state?events=0`, { headers })).json();
      out.agentSays = (st.snapshot?.agent?.messages || []).filter((m) => m.role === "agent").slice(-1).map((m) => m.text);
    }
    if (action === "storyboard.export" && out.ok && argvFlag("out")) {
      fs.writeFileSync(argvFlag("out"), out.content);
      out.wrote = argvFlag("out");
      delete out.content;
    }
    return out;
  } catch (err) {
    return { ok: false, error: "REMOTE_UNREACHABLE", remote: base, message: err.message, hint: "start `node server/bin/director-server.mjs` (no browser needed)" };
  }
}

function help(R, name) {
  const caps = R.capabilities();
  if (name) {
    const c = caps.find((x) => x.name === name);
    return c ? { ok: true, ...c } : { ok: false, error: "UNKNOWN_ACTION", similar: caps.filter((x) => x.name.includes(name.split(".")[0])).map((x) => x.name) };
  }
  return { ok: true, actions: caps.map((c) => `${c.name.padEnd(26)} ${c.doc}`) };
}

function print(r) {
  if (wantJson) return console.log(JSON.stringify(r, null, 2));
  if (!r) return;
  if (r.ok === false) {
    console.error(`✗ ${r.error}${r.hint ? ` — ${r.hint}` : ""}${r.missing ? ` (missing: ${r.missing.join(", ")})` : ""}${r.issues ? ` (${r.issues.join("; ")})` : ""}${r.message ? ` ${r.message}` : ""}`);
    if (r.params) console.error("  params:", JSON.stringify(r.params));
    if (r.allowed) console.error("  allowed:", r.allowed.join(", "));
    return;
  }
  if (r.actions) return console.log(r.actions.join("\n"));
  if (r.data && action === "context.capabilities") return console.log(r.data.map((c) => `${c.name.padEnd(26)} ${c.doc}  [${c.allowedIn.length === 8 ? "*" : c.allowedIn.join("/")}]`).join("\n"));
  if (r.data && action === "context.scene") {
    const s = r.data;
    console.log(`${s.project.name} · ${s.scene.name} · ${s.project.state} · ${s.project.fidelity} · v${s.project.version} · ${s.project.timecode}`);
    console.log(`cameras: ${s.cameras.map((c) => `${c.id}(${c.focal}mm→${c.target || "-"})`).join("  ")}`);
    console.log(`entities: ${s.entities.map((e) => `${e.id}:${e.type}`).join("  ")}`);
    console.log(`lights: ${s.lights.map((l) => `${l.id}:${l.type}/${l.group}`).join("  ")}`);
    console.log(`shots: ${s.shots.map((x) => `${x.index} ${x.title} ${x.focal}mm ${x.motion} ${x.seconds}s [${x.status}]`).join("  |  ")}`);
    if (s.takes.length) console.log(`takes: ${s.takes.map((t) => `${t.id}(${t.status})`).join("  ")}`);
    if (s.jobs.length) console.log(`jobs: ${s.jobs.map((j) => `${j.id} ${j.provider} ${j.mode} ${j.status} ${j.progress}%`).join("  ")}`);
    return;
  }
  if (r.prompts) {
    console.log(`── image (en)\n${r.prompts.image.en}\n── video (en)\n${r.prompts.video.en}\n── v2v (en)\n${r.prompts.v2v.en}\n── negative\n${r.prompts.negative.en}`);
    return;
  }
  if (r.agentSays) {
    for (const x of r.results || []) console.log(`${x.ok ? "✓" : "✗"} ${x.action}${x.id ? " " + x.id : ""}${x.error ? " " + x.error : ""}`);
    console.log(r.agentSays.join("\n"));
    return;
  }
  if (r.steps) {
    for (const s of r.steps) console.log(`• ${s.label}\n    ${s.action} ${JSON.stringify(s.payload)}`);
    if (r.notes?.length) console.log(`notes: ${r.notes.join("; ")}`);
    return;
  }
  const { ok, action: a, eventId, ms, savedTo, ...rest } = r;
  console.log(`✓ ${a || action}${rest.id ? " " + rest.id : ""}${Object.keys(rest).length ? " " + JSON.stringify(rest).slice(0, 400) : ""}${savedTo ? `\n  saved → ${savedTo}` : ""} (${Date.now() - t0} ms)`);
}

function usage() {
  console.log(`director — Director Runtime CLI (local project file or --remote bridge)

  director <action> [--key value ...] [--json] [--dry-run] [--project file.json] [--remote http://127.0.0.1:5175]
  director capabilities            list every action (+ allowed states)
  director help <action>           params of one action
  director context [scene|shot|project|events|history|schema]
  director demo city-edge|fast-pursuit
  director agent "把 A 机降到 0.4m 并 look-at 主角"     natural language → actions
  director plan  "..."             only show the plan
  director export --format html --out storyboard.html
  director serve [--port 5175]     start the backend (API + static web/)

  keys: kebab-case → camelCase (--focal-length → focalLength); --camera/--shot/--take → cameraId/shotId/takeId;
        "0,0,3" → [0,0,3]; JSON literals accepted; --idempotency-key, --source, --actor.
  env:  DIRECTOR_PROJECT, DIRECTOR_REMOTE, DIRECTOR_TOKEN (--token for a protected backend)`);
}
