import test from "node:test";
import assert from "node:assert/strict";
import { stageResult, stageMapFrame } from "../web/js/stage-result.js";

const base = () => ({ project: { currentShotId: "a", playhead: 0 }, shots: [{ id: "a", range: { inFrame: 0, outFrame: 48 } }, { id: "b", range: { inFrame: 10, outFrame: 82 } }], jobs: [] });
const job = (id, patch = {}) => ({ id, shotId: "a", mode: "v2v", status: "done", result: { kind: "video", url: `https://media.example/${id}?signed=1` }, ...patch });

test("V preview ignores reference imports, images, blockouts and other shots", () => {
  const d = base();
  d.jobs = [job("output"), job("reference", { kind: "reference" }), job("import", { kind: "fetch" }), job("image", { mode: "t2i", result: { kind: "image", url: "/image.png" } }), job("other", { shotId: "b" }), job("blockout", { kind: "film", filmSource: "blockout" })];
  assert.equal(stageResult(d).output.id, "output");
  assert.equal(stageResult(d, "film").output, null);
});
test("new pending or failed generation retains previous playable result", () => {
  const d = base();
  d.jobs = [job("first"), job("second"), job("pending", { status: "running", result: null })];
  assert.equal(stageResult(d).output.id, "second");
  assert.equal(stageResult(d).latest.id, "pending");
  d.jobs.at(-1).status = "failed";
  assert.equal(stageResult(d).output.id, "second");
  d.project.currentShotId = "b";
  assert.equal(stageResult(d).output, null);
});
test("film scope excludes mixed cuts and picks fully generated exports", () => {
  const d = base();
  d.jobs = [job("generated", { kind: "film", filmSource: "generated" }), job("mixed", { kind: "film", filmSource: "auto", clips: [{ kind: "generated" }, { kind: "blockout" }] })];
  assert.equal(stageResult(d, "film").output.id, "generated");
  d.jobs.push(job("auto", { kind: "film", filmSource: "auto", clips: [{ kind: "generated" }] }));
  assert.equal(stageResult(d, "film").output.id, "auto");
});
test("simulations and image results never appear as playable V", () => {
  const d = base();
  d.jobs = [job("simulated", { result: null }), job("wrong-type", { result: { kind: "image", url: "/not-a-video.mp4" } })];
  assert.equal(stageResult(d).output, null);
  d.jobs.push(job("legacy", { result: { url: "/finished.mp4?version=2" } }));
  assert.equal(stageResult(d).output.id, "legacy");
});
test("map converts sequence frames to shot-local frames and clamps bounds", () => {
  const d = base(); d.project.playSequence = true;
  d.project.playhead = 60;
  assert.equal(stageMapFrame(d, d.shots[1]), 22);
  d.project.playhead = 0;
  assert.equal(stageMapFrame(d, d.shots[1]), 10);
  d.project.playhead = 999;
  assert.equal(stageMapFrame(d, d.shots[1]), 81);
  d.project.playSequence = false; d.project.playhead = 32;
  assert.equal(stageMapFrame(d, d.shots[1]), 32);
  assert.equal(stageMapFrame(d, null), 0);
});
