// Backend acceptance: real HTTP against an ephemeral port — no browser, no Three.js.
// Covers health, capabilities, actions (single / batch / dry-run), agent, context, state, project import/export,
// the client-capture take protocol with media upload, SSE broadcast, token auth and api-only mode.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHost } from "../src/host.mjs";
import { createApp } from "../src/api.mjs";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "director-api-"));
const projectFile = path.join(tmp, "project.json");
const host = createHost({ projectFile, autosaveMs: 20, log: () => {} });
const { server } = createApp(host, { static: false });
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const get = async (p) => (await fetch(base + p)).json();
const post = async (p, body, headers = { "content-type": "application/json" }) => (await fetch(base + p, { method: "POST", headers, body: Buffer.isBuffer(body) ? body : JSON.stringify(body) })).json();

test.after(() => {
  server.closeAllConnections?.();
  server.close();
  host.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("health and capabilities", async () => {
  const h = await get("/api/health");
  assert.equal(h.ok, true);
  assert.match(h.service, /director-server/);
  assert.equal(h.project.scene, "城市边缘");
  assert.equal(h.project.shots, 3);
  const caps = await get("/api/capabilities");
  assert.ok(caps.count > 80);
  const one = await get("/api/capabilities/take.record");
  assert.equal(one.name, "take.record");
  const grp = await get("/api/capabilities?group=agent");
  assert.ok(grp.data.map((c) => c.name).includes("agent.confirm"));
  assert.equal((await get("/api/capabilities/nope.x")).error, "UNKNOWN_ACTION");
});

test("actions: single with snapshot, shorthand route, batch, dry-run, errors", async () => {
  const r = await post("/api/actions", { action: "camera.transform", payload: { id: "cam_program", height: 0.4 }, meta: { source: "agent", actorId: "cinematography" }, withState: true });
  assert.equal(r.ok, true);
  assert.ok(r.version > 0);
  assert.equal(r.snapshot.cameras.find((c) => c.id === "cam_program").pose.position[1], 0.4);
  assert.ok(r.snapshot.history.undo >= 1);
  assert.equal(r.snapshot.events[0].source, "agent");
  const s = await post("/api/actions/entity.pose", { id: "rival", pose: "aim" });
  assert.equal(s.ok, true);
  const b = await post("/api/actions", { batch: [{ action: "camera.look-at", payload: { id: "cam_program", target: "rival" } }, { action: "context.scene" }] });
  assert.equal(b.ok, true);
  assert.equal(b.results.length, 2);
  assert.equal(b.results[1].data.cameras.find((c) => c.id === "cam_program").target, "rival");
  const dry = await post("/api/actions", { action: "camera.lens", payload: { id: "cam_program", focalLength: 85 }, meta: { dryRun: true } });
  assert.equal(dry.dryRun, true);
  assert.equal((await get("/api/context?what=scene")).data.cameras.find((c) => c.id === "cam_program").focal, 40);
  assert.equal((await post("/api/actions", {})).error, "MISSING_ACTION");
  assert.equal((await post("/api/actions", { action: "camera.look-at", payload: { id: "cam_program", target: "ghost" } })).error, "TARGET_NOT_FOUND");
  const bad = await fetch(base + "/api/actions", { method: "POST", headers: { "content-type": "application/json" }, body: "{oops" });
  assert.equal(bad.status, 400);
});

test("agent endpoint plans and executes", async () => {
  const plan = await post("/api/agent", { text: "03 镜改成环绕 90 度", planOnly: true });
  assert.equal(plan.steps[0].action, "motion.set");
  const a = await post("/api/agent", { text: "03 镜改成环绕 90 度 并 让对手举枪" });
  assert.equal(a.ok, true);
  assert.ok(a.results.every((x) => x.ok));
  assert.ok(a.agentSays.length === 1);
  const shot = (await get("/api/context?what=shot&id=shot_03")).data;
  assert.equal(shot.motion.type, "orbit");
});

test("take protocol: client capture → media upload → finish", async () => {
  const t = await post("/api/actions", { action: "take.record", payload: { shotId: "shot_02" }, meta: { capture: true } });
  assert.equal(t.ok, true);
  assert.equal(t.awaiting, "client");
  assert.equal((await get("/api/health")).project.state, "RECORDING");
  const up = await post(`/api/takes/${t.id}/media`, Buffer.from("webm-bytes"), { "content-type": "video/webm" });
  assert.equal(up.ok, true);
  assert.equal(up.url, `/media/${t.id}.webm`);
  const media = await fetch(base + up.url);
  assert.equal(media.status, 200);
  assert.equal(await media.text(), "webm-bytes");
  const f = await post("/api/actions", { action: "take.finish", payload: { id: t.id, videoUrl: up.url, frames: 90 } });
  assert.equal(f.ok, true);
  const take = (await get(`/api/takes/${t.id}`)).data;
  assert.equal(take.status, "review");
  assert.equal(take.videoUrl, up.url);
  assert.equal((await get("/api/health")).project.state, "REVIEW");
  assert.equal((await post(`/api/takes/take_nope/media`, Buffer.from("x"), { "content-type": "video/webm" })).error, "TAKE_NOT_FOUND");
  // headless record (no capture flag) finishes immediately
  await post("/api/actions", { action: "project.set-state", payload: { state: "EDIT" } });
  const h = await post("/api/actions", { action: "take.record", payload: { shotId: "shot_01" } });
  assert.equal(h.recording, false);
  assert.equal((await get("/api/health")).project.state, "REVIEW");
  await post("/api/actions", { action: "project.set-state", payload: { state: "EDIT" } });
});

test("state, project export/import, persistence", async () => {
  const st = await get("/api/state?events=5");
  assert.equal(st.snapshot.events.length <= 5, true);
  assert.ok(st.snapshot.agent.messages.length >= 1);
  const ex = await get("/api/project");
  assert.equal(ex.data.shots.length, 3);
  await post("/api/actions", { action: "project.new", payload: { name: "blank" } });
  assert.equal((await get("/api/health")).project.shots, 0);
  const im = await fetch(base + "/api/project", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(ex) }).then((r) => r.json());
  assert.equal(im.ok, true);
  assert.equal((await get("/api/health")).project.shots, 3);
  const saved = await post("/api/project/save", {});
  assert.equal(saved.ok, true);
  assert.ok(fs.existsSync(projectFile));
  assert.equal(JSON.parse(fs.readFileSync(projectFile, "utf8")).shots.length, 3);
});

test("SSE streams hello + state on change", async () => {
  const ac = new AbortController();
  const res = await fetch(base + "/api/events", { signal: ac.signal });
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  const until = async (needle) => {
    while (!buf.includes(needle)) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value);
    }
  };
  await until("event: hello");
  assert.match(buf, /"snapshot"/);
  buf = "";
  await post("/api/actions", { action: "camera.lens", payload: { id: "cam_b", focalLength: 50 } });
  await until("event: state");
  while (!buf.slice(buf.indexOf("event: state")).includes("\n\n")) {
    const { value } = await reader.read();
    buf += dec.decode(value);
  }
  const frame = buf.slice(buf.indexOf("event: state"));
  const data = JSON.parse(frame.split("data: ")[1].split("\n")[0]);
  assert.equal(data.event.action, "camera.lens");
  assert.equal(data.snapshot.cameras.find((c) => c.id === "cam_b").lens.focalLength, 50);
  ac.abort();
});

test("token auth and api-only static behaviour", async () => {
  const h2 = createHost({ projectFile: null, demo: null, log: () => {} });
  const app2 = createApp(h2, { static: false, token: "s3cret" });
  await new Promise((r) => app2.server.listen(0, "127.0.0.1", r));
  const b2 = `http://127.0.0.1:${app2.server.address().port}`;
  assert.equal((await (await fetch(b2 + "/api/health")).json()).ok, true);
  assert.equal((await fetch(b2 + "/api/state")).status, 401);
  assert.equal((await fetch(b2 + "/api/state", { headers: { authorization: "Bearer s3cret" } })).status, 200);
  assert.equal((await (await fetch(b2 + "/web/")).json()).error, "API_ONLY");
  app2.server.close();
  h2.close();
});
