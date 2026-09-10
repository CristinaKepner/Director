import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/inspire/qb-ilm/project/video-generation/public/zqc/director-stage/package.json");
const { chromium } = require("playwright");
const BASE = "http://127.0.0.1:5175", OUT = "/inspire/qb-ilm/project/video-generation/public/zqc/director-console/docs/tvc";
const api = async (p, body) => (await fetch(`${BASE}/api/${p}`, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {})).json();
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
await page.addInitScript(() => localStorage.clear());
await page.goto(`${BASE}/web/?noguide=1`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__dc?.ready && window.__dc?.viewportReady, null, { timeout: 30000 });
await page.waitForTimeout(1500);
const d0 = await page.evaluate(() => { const d = window.__dc.store.get(); return { project: d.project.name, shots: d.shots.map((s) => [s.id, s.index, s.title, (s.range.outFrame - s.range.inFrame) / d.project.fps, s.motion.type, Math.round(s.lens.focalLength)]), cams: d.cameras.length, ents: d.entities.map((e) => e.id) }; });
console.log(JSON.stringify(d0));
const shots = d0.shots.map((s) => s[0]);
// 1. blockout preview of the whole film: sequence playback, screenshots along the way
await page.evaluate(() => window.__dc.dispatch("project.set-view", { mode: "program" }));
await page.evaluate(() => window.__dc.dispatch("timeline.play", { sequence: true }));
for (let i = 0; i < 6; i++) { await page.waitForTimeout(9000); await page.screenshot({ path: `${OUT}/preview-${String(i + 1).padStart(2, "0")}.png` }); }
await page.evaluate(() => window.__dc.dispatch("timeline.stop"));
// 2. one take per shot (page records the proxy video, uploads it)
for (const id of shots) {
  await page.evaluate((id) => window.__dc.dispatch("shot.select", { id }), id);
  await page.waitForTimeout(400);
  const r = await page.evaluate((id) => window.__dc.dispatch("take.record", { shotId: id }), id);
  const secs = d0.shots.find((s) => s[0] === id)[3];
  await page.waitForTimeout(secs * 1000 + 3500);
  console.log("take", id, r.ok, r.id);
}
await page.waitForTimeout(3000);
// 3. storyboard: keyframe capture per shot from the page, then circle takes
for (const id of shots) {
  await page.evaluate(async (id) => { await window.__dc.dispatch("shot.select", { id }); await new Promise((r) => setTimeout(r, 250)); const A = await import("/core/actions.js"); const kf = await A.getHooks().capture(); return window.__dc.dispatch("storyboard.add", { shotId: id, keyframes: [kf] }); }, id);
}
const st = await api("state?events=0");
for (const t of st.snapshot.takes) await api("actions", { action: "take.review", payload: { id: t.id, status: "circle" } });
// 4. exports (usage: node tools/tvc-run.mjs — after the TVC brief has been planned by the agent)
const md = await api("actions", { action: "storyboard.export", payload: { format: "md" } });
const html = await api("actions", { action: "storyboard.export", payload: { format: "html" } });
fs.writeFileSync(`${OUT}/storyboard-export.md`, md.content || ""); fs.writeFileSync(`${OUT}/storyboard-export.html`, html.content || "");
await page.evaluate(() => document.querySelector('[data-bottom="takes"]').click()); await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}/takes.png` });
await page.evaluate(() => document.querySelector('[data-bottom="board"]').click()); await page.waitForTimeout(600); await page.screenshot({ path: `${OUT}/storyboard.png` });
await page.evaluate(() => document.querySelector('[data-bottom="shots"]').click()); await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}/shots.png` });
const st2 = await api("state?events=0");
console.log(JSON.stringify({ takes: st2.snapshot.takes.map((t) => [t.id, t.shotId, t.status, !!t.videoUrl, t.capturedFrames]), cards: st2.snapshot.storyboard.length, errs }));
await browser.close();
