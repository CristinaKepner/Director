import test from "node:test";
import assert from "node:assert/strict";
import { createArkAdapter } from "../src/features/generation/ark.mjs";

const job = {
  id: "v2v",
  provider: "seedance-2.5",
  mode: "v2v",
  prompt: "animate",
  seconds: 4,
  inputs: { video: "/media/take.webm" },
};
const mp4 = Buffer.concat([
  Buffer.from([0, 0, 0, 24]),
  Buffer.from(
    "ftypisom00000000000000000000000000000000000000000000000000000000",
  ),
]);
const options = {
  apiKey: "private-test-key",
  publicUrl: "https://media.example.test",
  toMp4: async () => "/media/take.mp4",
  getJob: () => ({ status: "running" }),
  pollMs: 1,
};
function run(opts = {}) {
  return new Promise((resolve) =>
    createArkAdapter({ ...options, ...opts }).submit(job, (_id, patch) => {
      if (["done", "failed"].includes(patch.status)) resolve(patch);
    }),
  );
}
function respond(url, init, calls, media) {
  calls.push({ url, ...init });
  if (url.includes("/media/")) return media(url);
  if (init?.method === "POST") return Response.json({ id: "remote-task" });
  return Response.json({
    status: "succeeded",
    content: { video_url: "https://result.example.test/movie.mp4" },
  });
}
function setup(
  t,
  media = () => new Response(mp4, { headers: { "content-type": "video/mp4" } }),
) {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, init) =>
    respond(url, init, calls, media),
  );
  return calls;
}
test("530 blocks v2v before any paid task is created", async (t) => {
  const calls = setup(t, () => new Response("edge failure", { status: 530 }));
  const result = await run();
  assert.equal(result.status, "failed");
  assert.match(result.error, /REFERENCE_MEDIA_UNREACHABLE/);
  assert.equal(calls.filter((c) => c.method === "POST").length, 0);
});
function htmlPage() {
  return new Response("<html>login</html>", {
    headers: { "content-type": "text/html" },
  });
}
const expectedReference = {
  type: "video_url",
  video_url: { url: "https://media.example.test/media/take.mp4" },
  role: "reference_video",
};
function cancelledAdapter() {
  const state = { status: "running" };
  const toMp4 = async () => {
    state.status = "cancelled";
    return "/media/take.mp4";
  };
  return createArkAdapter({ ...options, getJob: () => state, toMp4 });
}
function backupMedia(url) {
  return url.includes("backup")
    ? new Response(mp4)
    : new Response("edge failure", { status: 530 });
}
const backupPublisher = {
  publisher: {
    enabled: true,
    publish: async () => ({
      url: "https://backup.example.test/media/take.mp4",
    }),
  },
  resolveLocal: () => new URL("./ark-v2v.test.mjs", import.meta.url),
};
test("200 HTML login page is not accepted as a reference video", async (t) => {
  const calls = setup(t, htmlPage);
  assert.equal((await run()).status, "failed");
  assert.equal(calls.filter((c) => c.method === "POST").length, 0);
});
test("validated v2v submits the full video URL once, without leaking the key to media hosting", async (t) => {
  const calls = setup(t);
  assert.equal((await run()).status, "done");
  const posts = calls.filter((c) => c.method === "POST");
  assert.equal(posts.length, 1);
  assert.deepEqual(JSON.parse(posts[0].body).content.at(-1), expectedReference);
  assert.equal(calls[0].headers.authorization, undefined);
});
test("cancelling during reference conversion never creates a task", async (t) => {
  const calls = setup(t);
  cancelledAdapter().submit(job, () => {});
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(calls.filter((c) => c.method === "POST").length, 0);
});
test("failed primary media address falls back to a configured publisher and verifies it", async (t) => {
  const calls = setup(t, backupMedia);
  assert.equal((await run(backupPublisher)).status, "done");
  assert.equal(calls.filter((c) => c.method === "POST").length, 1);
  assert.equal(calls.filter((c) => c.url.includes("/media/")).length, 2);
});
test("network errors do not expose signed media URLs", async (t) => {
  setup(t, () => {
    throw new Error("fetch failed https://secret.example.test/?token=private");
  });
  const result = await run();
  assert.match(result.error, /REFERENCE_MEDIA_UNREACHABLE/);
  assert.doesNotMatch(result.error, /secret|private/);
});
