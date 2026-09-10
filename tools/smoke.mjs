#!/usr/bin/env node
// Headless smoke: boots the page in Chromium (playwright borrowed from ../director-stage), checks for runtime errors,
// screenshots free + program views, then drives the page through the bridge (the Agent control path).
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const require = createRequire(path.resolve(root, "../director-stage/package.json"));
const { chromium } = require("playwright");
const BASE = process.env.SMOKE_URL || "http://127.0.0.1:5175";
const OUT = process.env.SMOKE_OUT || path.join(root, ".smoke");
fs.mkdirSync(OUT, { recursive: true });

const api = async (p, body) => (await fetch(`${BASE}/api/${p}`, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {})).json();

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
await page.addInitScript(() => localStorage.clear());
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__dc?.ready && window.__dc?.viewportReady, null, { timeout: 30000 });
await page.waitForTimeout(1500);

const ctx = await page.evaluate(() => window.__dc.dispatch("context.scene").data);
console.log(`page: ${ctx.scene.name} · shots ${ctx.shots.length} · cameras ${ctx.cameras.length} · lights ${ctx.lights.length}`);
await page.screenshot({ path: path.join(OUT, "01-free.png") });
await page.evaluate(() => window.__dc.dispatch("project.set-view", { mode: "program" }));
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, "02-program-40mm.png") });
await page.evaluate(() => window.__dc.dispatch("project.set-fidelity", { fidelity: "stylized" }));
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(OUT, "03-program-stylized.png") });
await page.evaluate(() => window.__dc.dispatch("project.set-view", { mode: "free" }));
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, "04-free-stylized.png") });

// bridge / agent control path
const health = await api("health");
console.log(`bridge health: pages=${health.pages}`);
const r1 = await api("invoke", { action: "camera.transform", payload: { id: "cam_program", height: 0.4 }, meta: { source: "cli", actorId: "smoke" } });
const r2 = await api("invoke", { action: "camera.look-at", payload: { id: "cam_program", target: "rival" } });
const r3 = await api("agent", { text: "03 镜改成环绕 90 度 并 让对手举枪" });
const r4 = await api("invoke", { action: "generation.prompt", payload: { shotId: "shot_03" } });
const r5 = await api("invoke", { action: "take.record", payload: { shotId: "shot_02", name: "smoke T1" } });
await page.waitForTimeout(8000); // 4 s shot + encoder flush (slow under swiftshader)
const takes = await page.evaluate(() => window.__dc.dispatch("context.scene").data.takes);
const ctx2 = await api("context");
await page.evaluate(() => window.__dc.dispatch("project.set-view", { mode: "program" }));
await page.evaluate(() => window.__dc.dispatch("shot.select", { id: "shot_03" }));
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, "05-after-agent.png") });
await page.evaluate(() => (document.querySelector('[data-bottom="gen"]').click(), 0));
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, "06-generation.png") });

const cam = ctx2.data.cameras.find((c) => c.id === "cam_program");
const results = {
  consoleErrors,
  pageErrors: await page.evaluate(() => window.__dc.errors),
  bridge: { health: health.ok, transform: r1.ok, lookAt: r2.ok, agent: r3.ok && r3.results?.every((x) => x.ok), prompt: r4.ok, record: r5.ok },
  camAfter: cam && { y: cam.position[1], target: cam.target },
  shot03: ctx2.data.shots.find((s) => s.id === "shot_03"),
  rivalPose: ctx2.data.entities.find((e) => e.id === "rival")?.pose,
  takes,
  fps: await page.evaluate(() => window.__dc.store.get().health.fps),
};
console.log(JSON.stringify(results, null, 2));
await browser.close();
const ok = !results.pageErrors.length && Object.values(results.bridge).every(Boolean) && results.camAfter?.y === 0.4 && results.camAfter?.target === "rival" && results.shot03?.motion === "orbit" && results.rivalPose === "aim" && takes.length >= 1;
console.log(ok ? "SMOKE OK" : "SMOKE FAILED");
process.exit(ok ? 0 : 1);
