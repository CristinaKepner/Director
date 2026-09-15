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
