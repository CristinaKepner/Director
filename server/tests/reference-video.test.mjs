import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createFilmAssembler, findFfmpeg } from '../src/film.mjs';
import { createArkAdapter } from '../src/adapters/ark.mjs';

const bin = findFfmpeg();
const probe = bin && path.join(path.dirname(bin), 'ffprobe');
const available = bin && fs.existsSync(probe);
function run(exe, args) {
  const r = spawnSync(exe, args, { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr); return r.stdout;
}
for (const [ext, rate, codec] of [['webm', 1000, 'libvpx-vp9'], ['mp4', 120, 'libx264']]) {
  test(`${rate}fps ${ext} becomes CFR30, bypasses legacy cache and retains duration`, { skip: !available }, async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'director-cfr-'));
    try {
      const file = path.join(dir, `take.${ext}`);
      run(bin, ['-v', 'error', '-f', 'lavfi', '-i', `testsrc2=size=64x64:rate=${rate}`, '-t', '1.2', '-c:v', codec, file]);
      fs.writeFileSync(path.join(dir, 'take_mp4.mp4'), 'old invalid cache');
      const film = createFilmAssembler({ ffmpeg: bin, mediaDir: dir });
      const ref = await film.toMp4(`/media/take.${ext}`);
      assert.match(ref, /_30fps\.mp4$/);
      const out = path.join(dir, path.basename(ref));
      const meta = JSON.parse(run(probe, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate,avg_frame_rate,codec_name:format=duration', '-of', 'json', out]));
      assert.equal(meta.streams[0].r_frame_rate, '30/1');
      assert.equal(meta.streams[0].avg_frame_rate, '30/1');
      assert.equal(meta.streams[0].codec_name, 'h264');
      assert.ok(Math.abs(Number(meta.format.duration) - 1.2) < 0.1);
      assert.equal(await film.toMp4(`/media/take.${ext}`), ref);
      const cut = await film.toMp4(`/media/take.${ext}`, { from: 0.12, to: 0.72 });
      assert.notEqual(cut, ref);
      const dur = Number(run(probe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', path.join(dir, path.basename(cut))]));
      assert.ok(Math.abs(dur - 0.6) < 0.1);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
}
test('missing ffmpeg fails explicitly instead of passing the original MP4 through', async () => {
  await assert.rejects(createFilmAssembler({ ffmpeg: 'none' }).toMp4('/media/take.mp4'), { code: 'REFERENCE_TRANSCODE_FAILED' });
});
test('Ark never submits when reference normalization fails or is absent', { timeout: 3000 }, async () => {
  const original = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => { requests++; throw new Error('must not submit'); };
  try {
    for (const toMp4 of [undefined, async () => null, async () => { throw new Error('conversion failed'); }]) {
      const adapter = createArkAdapter({ apiKey: 'test', publicUrl: 'https://example.test', getJob: () => ({status: 'queued'}), toMp4 });
      const failed = await new Promise(resolve => adapter.submit({ id: 'j', provider: 'seedance-2.5', mode: 'v2v', prompt: 'test', inputs: { video: '/media/take.mp4' } }, (_id, update) => { if (update.status === 'failed') resolve(update); }));
      assert.equal(failed.status, 'failed');
    }
    assert.equal(requests, 0);
  } finally { globalThis.fetch = original; }
});
