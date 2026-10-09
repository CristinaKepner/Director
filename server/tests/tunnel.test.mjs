// 媒体隧道：v2v 的唯一前提是「Ark 能从公网取到这段白模视频」。
// 这里守住三件在实测里真的坏过的事：
//   1. 打包后的 app 找不到 cloudflared（launchd 的 PATH 里没有 /opt/homebrew/bin）
//   2. 把 cloudflared 自己的接口地址 api.trycloudflare.com 当成隧道地址去验证
//   3. 隧道拿到地址就当成功 —— 相当比例的 quick tunnel 给了地址却从来没通
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { findCloudflared, QUICK_TUNNEL_URL, createMediaTunnel } from "../src/tunnel.mjs";

test("cloudflared 不靠 PATH 也要找得到", () => {
  // 最小 PATH：正是从访达启动的打包 app 拿到的那一个
  const real = process.env.PATH;
  process.env.PATH = "/usr/bin:/bin:/usr/sbin:/sbin";
  try {
    const hit = findCloudflared();
    if (hit) {
      assert.ok(path.isAbsolute(hit), `应该是绝对路径：${hit}`);
      assert.ok(fs.statSync(hit).isFile());
    }
    // 显式指定的路径优先；指了一个不存在的不该让它凭空变出别的来源以外的东西
    assert.equal(findCloudflared("/definitely/not/here"), hit);
  } finally {
    process.env.PATH = real;
  }
});

test("隧道地址不能匹配到 cloudflared 自己的接口地址", () => {
  const err = "failed to request quick Tunnel: https://api.trycloudflare.com/tunnel connection refused";
  assert.equal(QUICK_TUNNEL_URL.test(err), false);
  const banner = "|  https://judge-arcade-brother-manual.trycloudflare.com  |";
  assert.equal(banner.match(QUICK_TUNNEL_URL)?.[0], "https://judge-arcade-brother-manual.trycloudflare.com");
});

test("没装 cloudflared 时当场说清楚，而不是 spawn 出一个 ENOENT", async () => {
  const real = process.env.PATH;
  const realEnv = process.env.CLOUDFLARED;
  process.env.PATH = "/nonexistent-dir-for-test";
  process.env.CLOUDFLARED = "/nonexistent-dir-for-test/cloudflared";
  try {
    if (findCloudflared()) return; // 这台机器真的装在标准位置上，这条就不适用
    const t = createMediaTunnel({ mediaDir: path.join(process.cwd(), "server", "data") });
    await assert.rejects(() => t.start(), (err) => err.code === "TUNNEL_NOT_INSTALLED");
  } finally {
    process.env.PATH = real;
    if (realEnv === undefined) delete process.env.CLOUDFLARED; else process.env.CLOUDFLARED = realEnv;
  }
});

test("连接失败后用 HTTP/2 重试，并验证公网探针", async (t) => {
  const os = await import('node:os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'director-tunnel-test-'));
  const bin = path.join(dir, 'cloudflared');
  const calls = path.join(dir, 'calls.jsonl');
  fs.writeFileSync(bin, `#!${process.execPath}
const fs = require('node:fs');
const calls = ${JSON.stringify(calls)};
const first = !fs.existsSync(calls);
fs.appendFileSync(calls, JSON.stringify(process.argv.slice(2))+'\\n');
if (first) process.exit(1);
console.log('Registered tunnel connection');
console.log('https://director-test.trycloudflare.com');
setInterval(()=>{},1000);
`, { mode: 0o755 });
  t.mock.method(globalThis, 'fetch', async (url) => {
    assert.match(url, /^https:\/\/director-test\.trycloudflare\.com\/.+\/media\/tunnel-probe-.+\.png$/);
    return new Response('probe', { status: 200 });
  });
  const tunnel = createMediaTunnel({mediaDir: dir, bin});
  try {
    await tunnel.start({attempts:2});
    assert.equal(tunnel.verified, true);
    const args = fs.readFileSync(calls,'utf8').trim().split('\n').map(JSON.parse);
    assert.deepEqual(args.map(a => a[a.indexOf('--protocol')+1]), ['auto','http2']);
    assert.equal(fs.readdirSync(dir).filter(n=>n.startsWith('tunnel-probe-')).length,0);
  } finally { tunnel.stop(); fs.rmSync(dir,{recursive:true,force:true}); }
});
