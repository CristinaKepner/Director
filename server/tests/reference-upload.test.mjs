import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { spawnSync } from "node:child_process";
import { createApp } from "../src/api.mjs";
import { createHost } from "../src/host.mjs";
import { importReference } from "../src/features/assets/reference-upload.mjs";
const bin = path.resolve("desktop/build/bin", process.arch, "ffmpeg");
function setup(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "director-upload-"));
  const host = createHost({ mediaDir: dir, ffmpeg: bin, log() {} });
  t.after(() => cleanup(host, dir));
  const projectId = host.store.get().project.id;
  const input = { projectId, name: "参考.png", mime: "image/png" };
  return { host, dir, input };
}
const pictureArgs = [
  "-v",
  "error",
  "-f",
  "lavfi",
  "-i",
  "color=blue:s=64x64",
  "-frames:v",
  "1",
  "-f",
  "image2pipe",
  "-vcodec",
  "png",
  "-",
];
function picture() {
  const out = spawnSync(bin, pictureArgs);
  assert.equal(out.status, 0, out.stderr.toString());
  return out.stdout;
}
const upload = (f, bytes, input = {}) =>
  importReference(f.host, Readable.from([bytes]), { ...f.input, ...input });
test("valid image imports metadata and remains unapproved, retries reuse request ID", async (t) => {
  const f = setup(t),
    bytes = picture();
  const a = await upload(f, bytes, { requestId: "test-upload" });
  const b = await upload(f, bytes, { requestId: "test-upload" });
  assert.equal(a.asset.id, b.asset.id);
  assert.equal(a.asset.approved, false);
  assert.deepEqual([a.asset.width, a.asset.bytes], [64, bytes.length]);
  assert.equal(f.host.store.get().assets.length, 1);
});
test("reject disguised HTML and leave no asset or partial media", async (t) => {
  const f = setup(t);
  await assert.rejects(
    upload(f, Buffer.from("<html>not a PNG</html>")),
    /文件内容/,
  );
  assert.equal(f.host.store.get().assets.length, 0);
  assert.equal(fs.readdirSync(f.dir).length, 0);
});
test("reject a stale project before reading the upload", async (t) => {
  const f = setup(t);
  await assert.rejects(
    upload(f, picture(), { projectId: "old-project" }),
    /工程已切换/,
  );
  assert.equal(fs.readdirSync(f.dir).length, 0);
});
test("switching projects during upload cannot attach stale media", async (t) => {
  const f = setup(t),
    bytes = picture();
  const stream = Readable.from(switched(f, bytes));
  await assert.rejects(importReference(f.host, stream, f.input), /工程已切换/);
  assert.equal(f.host.store.get().assets.length, 0);
  assert.equal(fs.readdirSync(f.dir).length, 0);
});
async function* switched(f, bytes) {
  yield bytes.subarray(0, 20);
  f.host.invoke({ action: "project.new", payload: { name: "next" } });
  yield bytes.subarray(20);
}
test("abort and unsupported type create no asset", async (t) => {
  const f = setup(t),
    signal = AbortSignal.abort();
  await assert.rejects(upload(f, picture(), { signal }));
  await assert.rejects(upload(f, picture(), { mime: "image/svg+xml" }), /PNG/);
  assert.equal(f.host.store.get().assets.length, 0);
  assert.equal(fs.readdirSync(f.dir).length, 0);
});
test("real MP4 keeps its full video, duration and preview", async (t) => {
  const f = setup(t),
    bytes = video(f.dir);
  const result = await upload(f, bytes, {
    mime: "video/mp4",
    name: "motion.mp4",
  });
  verifyVideo(f, result.asset, bytes);
});
function verifyVideo(f, asset, bytes) {
  assert.equal(asset.mediaKind, "video");
  assert.equal(asset.seconds, 4);
  assert.deepEqual(
    fs.readFileSync(f.host.mediaPath(asset.url.slice(7))),
    bytes,
  );
  assert.ok(fs.existsSync(f.host.mediaPath(asset.posterUrl.slice(7))));
}
function video(dir) {
  const file = path.join(dir, "source.mp4");
  const args = [...videoArgs, file];
  const out = spawnSync(bin, args);
  assert.equal(out.status, 0, out.stderr.toString());
  const bytes = fs.readFileSync(file);
  fs.unlinkSync(file);
  return bytes;
}
test("over-limit image is rejected without registering any asset", async (t) => {
  const f = setup(t);
  await assert.rejects(upload(f, Buffer.alloc(21 * 1024 * 1024)), /大小限制/);
  assert.equal(f.host.store.get().assets.length, 0);
  assert.equal(fs.readdirSync(f.dir).length, 0);
});
test("a broken stream is cleaned up", async (t) => {
  const f = setup(t);
  await assert.rejects(
    importReference(f.host, Readable.from(broken()), f.input),
    /disconnected/,
  );
  assert.equal(f.host.store.get().assets.length, 0);
  assert.equal(fs.readdirSync(f.dir).length, 0);
});
async function* broken() {
  yield picture().subarray(0, 20);
  throw new Error("disconnected");
}

const videoArgs = [
  "-v",
  "error",
  "-f",
  "lavfi",
  "-i",
  "testsrc2=s=64x64:r=30",
  "-t",
  "4",
  "-c:v",
  "libx264",
];

function cleanup(host, dir) {
  host.close();
  fs.rmSync(dir, { recursive: true, force: true });
}

async function httpFixture(t) {
  const f = setup(t),
    app = createApp(f.host, { static: false, token: "test-only" });
  await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    app.server.closeAllConnections();
    app.server.close();
  });
  return { ...f, url: endpoint(app.server, f.input.projectId) };
}
function endpoint(server, projectId) {
  const params = new URLSearchParams({ projectId, name: "picture.png" });
  return `http://127.0.0.1:${server.address().port}/api/reference-media?${params}`;
}
function postReference(f, token = "test-only") {
  const headers = {
    "content-type": "image/png",
    authorization: `Bearer ${token}`,
  };
  return fetch(f.url, { method: "POST", headers, body: picture() });
}
test("HTTP endpoint requires auth and returns imported media with range support", async (t) => {
  const f = await httpFixture(t);
  assert.equal((await postReference(f, "wrong")).status, 401);
  const result = await (await postReference(f)).json();
  assert.equal(result.ok, true);
  await verifyRange(new URL(result.asset.url, f.url));
});
test("missing request ID cannot reuse an unrelated existing legacy asset", async (t) => {
  const f = setup(t);
  f.host.invoke({
    action: "asset.add",
    payload: { url: "/media/old.png", label: "old" },
  });
  const result = await upload(f, picture());
  assert.notEqual(result.asset.label, "old");
  assert.equal(f.host.store.get().assets.length, 2);
});

async function verifyRange(url) {
  const media = await fetch(url, { headers: { range: "bytes=0-7" } });
  assert.equal(media.status, 206);
  assert.equal((await media.arrayBuffer()).byteLength, 8);
}
