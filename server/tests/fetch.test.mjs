// 进料口：链接 → 本地素材。
//
// 起因是真事：另一台 Mac 上贴链接，弹出来的是「要 yt-dlp（brew install yt-dlp）」。
// 产品的第一步是贴一条链接，而第一步要人先去装一个包管理器 —— 等于没有第一步。
// 所以这里守两件事：直链根本不该经过下载器；下载器缺了要自己取一份，而且取回来的东西要核对过。
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { createFetcher, findYtDlp, YTDLP_NAME } from "../src/fetch.mjs";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "director-fetch-"));

// 一个假的视频站：/clip.mp4 是直链，/watch 是一张网页
function serve(body) {
  const srv = http.createServer((req, res) => {
    if (req.url.startsWith("/clip.mp4") || req.url.startsWith("/nameless")) {
      res.writeHead(200, { "content-type": "video/mp4", "content-length": String(body.length) });
      return req.method === "HEAD" ? res.end() : res.end(body);
    }
    res.writeHead(200, { "content-type": "text/html" });
    res.end("<html>一张网页，不是视频文件</html>");
  });
  return new Promise((r) => srv.listen(0, "127.0.0.1", () => r({ srv, port: srv.address().port })));
}

test("直链不经过下载器：机器上没有 yt-dlp 也能把视频拿下来", async () => {
  const body = Buffer.alloc(64 * 1024, 7);
  const { srv, port } = await serve(body);
  const mediaDir = tmp();
  try {
    // system:false + 空的 toolsDir —— 一台什么都没装的机器（开发机上有 brew 版，会盖掉这条路）
    const f = createFetcher({ system: false, toolsDir: tmp(), mediaDir, log: () => {} });
    assert.equal(f.hasBin, false, "这台机器上不该找到 yt-dlp");
    assert.equal(f.ready, true, "没有下载器不等于做不了：直链仍然能下");

    const seen = [];
    const got = await f.download({ url: `http://127.0.0.1:${port}/clip.mp4`, onProgress: (p) => seen.push(p.note) });
    assert.equal(got.ok, true, got.hint || got.message);
    assert.equal(got.direct, true);
    assert.equal(got.bytes, body.length);
    assert.equal(fs.statSync(got.file).size, body.length);
    assert.ok(got.url.startsWith("/media/ref_"), got.url);
    assert.ok(seen.includes("下载中"));

    // 没有扩展名但服务器说自己回的是 video/*，也算直链
    const meta = await f.probe(`http://127.0.0.1:${port}/nameless`);
    assert.equal(meta.ok, true);
    assert.equal(meta.direct, true);
  } finally {
    srv.close();
    fs.rmSync(mediaDir, { recursive: true, force: true });
  }
});

test("体积上限拦在写盘之前，不会先塞满磁盘再报错", async () => {
  const body = Buffer.alloc(256 * 1024, 3);
  const { srv, port } = await serve(body);
  const mediaDir = tmp();
  try {
    const f = createFetcher({ system: false, toolsDir: tmp(), mediaDir, maxBytes: 1024, log: () => {} });
    const got = await f.download({ url: `http://127.0.0.1:${port}/clip.mp4` });
    assert.equal(got.ok, false);
    assert.equal(got.error, "TOO_BIG");
    assert.deepEqual(fs.readdirSync(mediaDir), [], "拦下来的下载不该在媒体目录里留半个文件");
  } finally {
    srv.close();
    fs.rmSync(mediaDir, { recursive: true, force: true });
  }
});

test("网页链接要下载器：装不上就说清楚下一步，而不是让人去装 brew", async () => {
  const { srv, port } = await serve(Buffer.alloc(8));
  const mediaDir = tmp();
  const toolsDir = tmp();
  try {
    // 指定一个取不到的下载器地址：自动安装这条路走完，仍然失败
    const f = createFetcher({ system: false, toolsDir, ytdlpUrl: `http://127.0.0.1:${port}/no-such-binary.bin`, mediaDir, log: () => {} });
    const got = await f.download({ url: `http://127.0.0.1:${port}/watch` });
    assert.equal(got.ok, false);
    assert.equal(got.error, "YTDLP_INSTALL_FAILED");
    assert.ok(/拖进来/.test(got.hint), got.hint);
    assert.ok(got.hint.includes(path.join(toolsDir, YTDLP_NAME)), "要告诉人这个文件该放哪");
    assert.ok(!/brew/.test(got.hint), "别再让人先去装包管理器");
    assert.deepEqual(fs.readdirSync(toolsDir), [], "失败的下载不该留下半个可执行文件");
  } finally {
    srv.close();
    fs.rmSync(mediaDir, { recursive: true, force: true });
    fs.rmSync(toolsDir, { recursive: true, force: true });
  }
});

test("自己装的那一份，下次启动就直接认得", () => {
  const toolsDir = tmp();
  try {
    assert.equal(findYtDlp(null, toolsDir, { system: false }), null);
    const p = path.join(toolsDir, YTDLP_NAME);
    fs.writeFileSync(p, "#!/bin/sh\necho 2026.01.01\n", { mode: 0o755 });
    assert.equal(findYtDlp(null, toolsDir, { system: false }), p);
  } finally {
    fs.rmSync(toolsDir, { recursive: true, force: true });
  }
});

// ---- 读参照那一关：缺的是哪一样，要说得出名字 ----
//
// 起因是真事：0.6.6 在一台新 Mac 上贴链接，弹的是「把链接下下来读参照要网关密钥和 ffmpeg」。
// 那台机器的密钥是配了的，缺的只有 ffmpeg（没装 Homebrew）—— 而这句话把两样并列，
// 人会去检查已经有的那一样。现在 ffmpeg 随包发，缺什么也各报各的。
import { createReferenceReader } from "../src/adapters/reference.mjs";
import { findFfmpeg, mediaDuration } from "../src/film.mjs";

test("缺什么报什么：密钥和 ffmpeg 不再并成一句话", () => {
  const frames = async () => [];
  assert.deepEqual(createReferenceReader({ apiKey: "k", frames }).missing, []);
  assert.equal(createReferenceReader({ apiKey: "k", frames }).ready, true);

  const noKey = createReferenceReader({ apiKey: null, frames });
  assert.equal(noKey.ready, false);
  assert.deepEqual(noKey.missing.length, 1);
  assert.match(noKey.missing[0], /密钥/);

  const noFf = createReferenceReader({ apiKey: "k", frames: null });
  assert.equal(noFf.ready, false);
  assert.deepEqual(noFf.missing.length, 1);
  assert.match(noFf.missing[0], /ffmpeg/);

  assert.equal(createReferenceReader({ apiKey: null, frames: null }).missing.length, 2);
});

test("--ffmpeg none 复现一台没装 ffmpeg 的机器；坏路径要退回去继续找", () => {
  assert.equal(findFfmpeg("none"), null, "none 就是没有，不许再去 PATH 里捡一个");
  // 给一个不存在的路径不该直接判死：机器上有别的就用别的（开发机上有 brew 版）
  const fallback = findFfmpeg("/nonexistent/ffmpeg");
  assert.ok(fallback === null || fs.statSync(fallback).isFile());
});

// 应用自带的那一份旁边没有 ffprobe —— 时长得问 ffmpeg 自己拿
test("只有 ffmpeg、没有 ffprobe 时也读得出时长", { skip: !fs.existsSync(path.resolve("desktop/build/bin/arm64/ffmpeg")) && "没有随包的 ffmpeg，跳过" }, async () => {
  const bin = path.resolve("desktop/build/bin/arm64/ffmpeg");
  assert.equal(fs.existsSync(path.join(path.dirname(bin), "ffprobe")), false, "自带的就该只有一个二进制");
  const media = path.resolve("server/data/media");
  const mp4 = fs.readdirSync(media).find((f) => /\.mp4$/i.test(f));
  if (!mp4) return; // 仓库里没有 mp4 样本就只验到这
  assert.ok((await mediaDuration(bin, path.join(media, mp4))) > 0);
});
