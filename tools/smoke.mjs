#!/usr/bin/env node
// Headless smoke for the decoupled console: boots web/ in Chromium (playwright borrowed from ../director-stage),
// checks the page connects to the backend, screenshots free + program views, then changes the project through the
// backend API (the Agent / CLI path) and verifies the page received the pushed state. Finally records a take from
// the page and checks the proxy video landed on the backend.
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const require = createRequire(path.resolve(root, "../director-stage/package.json"));
const { chromium } = require("playwright");
const BASE = (process.env.SMOKE_URL || "http://127.0.0.1:5175").replace(/\/$/, "");
const OUT = process.env.SMOKE_OUT || path.join(root, ".smoke");
fs.mkdirSync(OUT, { recursive: true });

const api = async (p, body) => (await fetch(`${BASE}/api/${p}`, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {})).json();

const health0 = await api("health");
if (!health0.ok) throw new Error(`backend not reachable at ${BASE}`);
await api("actions", { action: "scene.demo", payload: { name: "city-edge" }, meta: { source: "cli", actorId: "smoke" } });
await api("actions", { action: "project.set-state", payload: { state: "EDIT" } });

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
await page.addInitScript(() => localStorage.clear());
await page.goto(`${BASE}/web/`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__dc?.ready && window.__dc?.viewportReady, null, { timeout: 30000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(OUT, "00-guide.png") });
await page.evaluate(() => document.querySelector("#guide [data-skip]")?.click());
await page.waitForTimeout(300);

const mode = await page.evaluate(() => window.__dc.client.mode);
const ctx = await page.evaluate(() => window.__dc.local("context.scene").data);
console.log(`page: mode=${mode} · ${ctx.scene.name} · shots ${ctx.shots.length} · cameras ${ctx.cameras.length} · lights ${ctx.lights.length}`);
await page.screenshot({ path: path.join(OUT, "01-free.png") });
await page.evaluate(() => window.__dc.dispatch("project.set-view", { mode: "program" }));
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, "02-program-40mm.png") });
await page.evaluate(() => window.__dc.dispatch("project.set-fidelity", { fidelity: "stylized" }));
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(OUT, "03-program-stylized.png") });
await page.evaluate(() => window.__dc.dispatch("project.set-view", { mode: "free" }));
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, "04-free-stylized.png") });

// backend-driven changes (Agent / CLI path) must show up in the page via SSE
const health = await api("health");
console.log(`backend: ${health.service} · clients=${health.clients} · v${health.project.version}`);
const r1 = await api("actions", { action: "camera.transform", payload: { id: "cam_program", height: 0.4 }, meta: { source: "cli", actorId: "smoke" } });
const r2 = await api("actions", { action: "camera.look-at", payload: { id: "cam_program", target: "rival" } });
const r3 = await api("agent", { text: "03 镜改成环绕 90 度 并 让对手举枪" });
const r4 = await api("actions", { action: "generation.prompt", payload: { shotId: "shot_03" } });
await page.waitForFunction(() => {
  const d = window.__dc.store.get();
  const cam = d.cameras.find((c) => c.id === "cam_program");
  return cam?.pose.position[1] === 0.4 && cam?.target === "rival" && d.shots.find((s) => s.id === "shot_03")?.motion.type === "orbit" && d.entities.find((e) => e.id === "rival")?.pose === "aim";
}, null, { timeout: 10000 }).catch(() => null);
const synced = await page.evaluate(() => {
  const d = window.__dc.store.get();
  const cam = d.cameras.find((c) => c.id === "cam_program");
  return { y: cam?.pose.position[1], target: cam?.target, shot03: d.shots.find((s) => s.id === "shot_03")?.motion.type, rivalPose: d.entities.find((e) => e.id === "rival")?.pose, version: d.project.version, agentMsgs: d.agent.messages.length };
});

// page-driven take: page records the proxy video, uploads it, backend finishes the take
const r5 = await page.evaluate(() => window.__dc.dispatch("take.record", { shotId: "shot_02", name: "smoke T1" }));
await page.waitForTimeout(9000); // 4 s shot + encoder flush + upload (slow under swiftshader)
const takes = (await api("context")).data.takes;
const takeFull = takes[0] ? (await api(`takes/${takes[0].id}`)).data : null;
let mediaOk = false;
if (takeFull?.videoUrl) {
  const m = await fetch(`${BASE}${takeFull.videoUrl.startsWith("http") ? new URL(takeFull.videoUrl).pathname : takeFull.videoUrl}`);
  mediaOk = m.status === 200 && Number(m.headers.get("content-length")) > 0;
}
await page.evaluate(() => window.__dc.dispatch("project.set-view", { mode: "program" }));
await page.evaluate(() => window.__dc.dispatch("shot.select", { id: "shot_03" }));
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, "05-after-agent.png") });
await page.evaluate(() => (document.querySelector('[data-bottom="takes"]').click(), 0));
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, "06-takes.png") });
await page.evaluate(() => (document.querySelector('[data-bottom="gen"]').click(), 0));
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, "07-generation.png") });

const results = {
  mode,
  consoleErrors,
  pageErrors: await page.evaluate(() => window.__dc.errors),
  backend: { health: health.ok, transform: r1.ok, lookAt: r2.ok, agent: r3.ok && r3.results?.every((x) => x.ok), prompt: r4.ok, record: r5.ok && r5.awaiting === "client" },
  synced,
  take: takeFull && { id: takeFull.id, status: takeFull.status, videoUrl: takeFull.videoUrl, capturedFrames: takeFull.capturedFrames, mediaOk },
  backendState: (await api("health")).project.state,
  fps: await page.evaluate(() => window.__dc.store.get().health.fps),
};
console.log(JSON.stringify(results, null, 2));
await browser.close();
const ok = mode === "online" && !results.pageErrors.length && Object.values(results.backend).every(Boolean) && synced.y === 0.4 && synced.target === "rival" && synced.shot03 === "orbit" && synced.rivalPose === "aim" && takeFull?.status === "review" && mediaOk;
console.log(ok ? "SMOKE OK" : "SMOKE FAILED");
process.exit(ok ? 0 : 1);
