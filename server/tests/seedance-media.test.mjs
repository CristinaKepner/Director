import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  createFilmAssembler,
  mediaDuration,
  findFfmpeg,
} from "../src/features/editing/film.mjs";

const bundled = path.resolve("desktop/build/bin", process.arch, "ffmpeg");
const bin = findFfmpeg(fs.existsSync(bundled) ? bundled : undefined);
const limits = { minSeconds: 2, maxSeconds: 30 };
function fixture(t, seconds = 4, size = "64x64") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "director-v2v-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "input.mp4");
  makeSource(file, seconds, size);
  return { dir, film: createFilmAssembler({ ffmpeg: bin, mediaDir: dir }) };
}
const videoInput = ["-v", "error", "-f", "lavfi", "-i"];
function makeSource(file, seconds, size) {
  const input = `testsrc2=size=${size}:rate=30`;
  const tail = ["-t", String(seconds), "-c:v", "libx264", file];
  const result = spawnSync(bin, [...videoInput, input, ...tail]);
  assert.equal(result.status, 0, result.stderr?.toString());
}
function videoInfo(file) {
  return spawnSync(bin, ["-hide_banner", "-i", file], { encoding: "utf8" })
    .stderr;
}
test(
  "short v2v input fails before upload rather than silently looping or replacing with a frame",
  { skip: !bin },
  async (t) => {
    const { film } = fixture(t, 1);
    await assert.rejects(film.toMp4("/media/input.mp4", null, limits), /2.*30/);
  },
);
test(
  "unsupported reference aspect fails instead of distorting the source",
  { skip: !bin },
  async (t) => {
    const { film } = fixture(t, 4, "640x64");
    await assert.rejects(film.toMp4("/media/input.mp4", null, limits), /画幅/);
  },
);
test(
  "small take becomes valid square 720p MP4 retaining all four seconds",
  { skip: !bin },
  async (t) => {
    const { film, dir } = fixture(t);
    const url = await film.toMp4("/media/input.mp4", null, limits);
    const file = path.join(dir, path.basename(url));
    const info = videoInfo(file);
    assert.match(info, /720x720/);
    assert.match(info, /30 fps/);
    assert.ok(Math.abs((await mediaDuration(bin, file)) - 4) < 0.05);
  },
);
