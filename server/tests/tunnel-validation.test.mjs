import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createMediaTunnel } from "../src/features/assets/tunnel.mjs";

const fake = `#!${process.execPath}
require('node:fs').writeFileSync(__dirname+'/pid',String(process.pid));
console.log('Registered tunnel connection');
console.log('https://director-test.trycloudflare.com');
setInterval(()=>{},1000);
`;
const probeTiming = { verifyTimeoutMs: 5, verifyDelayMs: 1 };
function cleanup(t, tunnel, mediaDir) {
  t.after(() => {
    tunnel.stop();
    fs.rmSync(mediaDir, { recursive: true, force: true });
  });
}
function fixture(t, extra = {}) {
  const mediaDir = fs.mkdtempSync(path.join(os.tmpdir(), "director-probe-"));
  const bin = path.join(mediaDir, "cloudflared");
  fs.writeFileSync(bin, fake, { mode: 0o755 });
  const options = { mediaDir, bin, ...probeTiming, ...extra };
  const tunnel = createMediaTunnel(options);
  cleanup(t, tunnel, mediaDir);
  return { tunnel, mediaDir };
}
async function rejectsProbe(t, fetch) {
  const { tunnel } = fixture(t);
  t.mock.method(globalThis, "fetch", fetch);
  await assert.rejects(tunnel.start({ attempts: 1 }), {
    code: "TUNNEL_UNREACHABLE",
  });
  assert.equal(tunnel.url, null);
  assert.equal(tunnel.verified, false);
}
async function tlsFailure() {
  throw new TypeError("TLS failed");
}
test("registered edge with failing TLS is not reported as a usable public address", async (t) => {
  await rejectsProbe(t, tlsFailure);
});
test("a 200 error page is not a verified tunnel", async (t) => {
  await rejectsProbe(t, async () => new Response("<html>portal</html>"));
});
function exitEvent() {
  const state = {};
  state.event = new Promise((resolve) => {
    state.onDisconnect = resolve;
  });
  return state;
}
function killEdge(dir) {
  const pid = Number(fs.readFileSync(path.join(dir, "pid"), "utf8"));
  process.kill(pid, "SIGTERM");
}
function realProbe(t, dir) {
  t.mock.method(globalThis, "fetch", async (url) => {
    const file = path.join(dir, path.basename(new URL(url).pathname));
    return new Response(fs.readFileSync(file));
  });
}
test(
  "edge exit revokes the verified address and notifies the host",
  { timeout: 3000 },
  async (t) => {
    const state = exitEvent();
    const { tunnel, mediaDir } = fixture(t, state);
    realProbe(t, mediaDir);
    await tunnel.start({ attempts: 1 });
    killEdge(mediaDir);
    await state.event;
    assert.equal(tunnel.url, null);
  },
);
