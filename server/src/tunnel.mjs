// Public media tunnel — makes /media files reachable from the internet so providers that only accept URLs
// (Ark's reference_video for v2v) can fetch them.
//
// Deliberately NOT a tunnel to the backend. It starts a second, tiny HTTP server that serves read-only GETs
// of single media files under an unguessable random prefix, and points cloudflared at *that*. The control
// API (/api/actions, /api/agent, the project) never leaves the loopback interface — someone who guesses the
// hostname can at best fetch a take they already know the filename of, and can change nothing.
//
//   --tunnel cloudflared   → https://<random>.trycloudflare.com/<random>/media/<file>
//   --public-url URL       → you already have a public address; no tunnel is started
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";

const TYPES = { ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

export function createMediaTunnel(opts = {}) {
  const mediaDir = path.resolve(opts.mediaDir);
  const log = opts.log || (() => {});
  const bin = opts.bin || "cloudflared";
  const prefix = "/" + crypto.randomBytes(9).toString("base64url"); // not a secret, just not enumerable
  let server = null;
  let child = null;
  let publicUrl = null;
  const cfLog = []; // cloudflared 自己的输出，失败时用来给出可执行的建议

  // read-only, single-file, no listing, no traversal
  const app = http.createServer((req, res) => {
    const deny = (code, msg) => { res.writeHead(code, { "content-type": "text/plain" }); res.end(msg); };
    if (req.method !== "GET" && req.method !== "HEAD") return deny(405, "method not allowed");
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { return deny(400, "bad url"); }
    if (!pathname.startsWith(`${prefix}/media/`)) return deny(404, "not found");
    const name = path.basename(pathname.slice(`${prefix}/media/`.length));
    if (!name || name.startsWith(".")) return deny(404, "not found");
    const file = path.join(mediaDir, name);
    if (path.dirname(file) !== mediaDir || !fs.existsSync(file) || !fs.statSync(file).isFile()) return deny(404, "not found");
    const stat = fs.statSync(file);
    const type = TYPES[path.extname(name).toLowerCase()] || "application/octet-stream";
    // range support: some fetchers probe with Range before downloading
    const range = req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Number(range[2]) : stat.size - 1;
      if (start >= stat.size || end >= stat.size || start > end) { res.writeHead(416, { "content-range": `bytes */${stat.size}` }); return res.end(); }
      res.writeHead(206, { "content-type": type, "content-length": end - start + 1, "content-range": `bytes ${start}-${end}/${stat.size}`, "accept-ranges": "bytes" });
      return req.method === "HEAD" ? res.end() : fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { "content-type": type, "content-length": stat.size, "accept-ranges": "bytes", "cache-control": "public, max-age=600" });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).pipe(res);
  });

  // A hostname is not a working tunnel: on networks that intercept or block cloudflared's edge connections
  // (corporate proxies, fake-IP VPNs) the address answers 530 and Ark would fail with a confusing download
  // error. So fetch a probe file through the public URL and only report success when it actually comes back.
  async function verify(url) {
    fs.mkdirSync(mediaDir, { recursive: true });
    const name = `tunnel-probe-${crypto.randomBytes(4).toString("hex")}.png`; // 无前导点：服务端拒绝点文件
    const probe = path.join(mediaDir, name);
    // 1×1 transparent PNG
    fs.writeFileSync(probe, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"));
    try {
      const deadline = Date.now() + 45_000;
      let last = 0;
      for (;;) {
        try {
          const r = await fetch(`${url}/media/${name}`, { signal: AbortSignal.timeout(8000) });
          last = r.status;
          if (r.ok) return { ok: true };
        } catch (err) {
          last = err.name === "TimeoutError" ? 408 : 0;
        }
        if (Date.now() > deadline) return { ok: false, status: last };
        await new Promise((r) => setTimeout(r, 3000));
      }
    } finally {
      fs.rmSync(probe, { force: true });
    }
  }

  function diagnose() {
  const text = cfLog.join("");
  const fakeIp = /198\.18\.\d+\.\d+/.test(text);
  // 实测结论（2026-09）：本机开着 Clash 这类 fake-IP 代理时，光加 DOMAIN-SUFFIX 规则不够 ——
  // cloudflared 最终是按**裸 IP** 连边缘的，域名规则根本匹配不上，连接又被拐回代理，
  // QUIC 直接超时、TCP 则是 TLS 握手 EOF。真正管用的是按 IP 段放行。
  const clashFix = "本机代理（Clash / Surge）在拦。注意：只加 DOMAIN-SUFFIX,argotunnel.com,DIRECT 不够 —— cloudflared 是按裸 IP 连边缘的，域名规则匹配不上。要加的是网段规则：\n  IP-CIDR,198.41.192.0/24,DIRECT,no-resolve\n  IP-CIDR,198.41.200.0/24,DIRECT,no-resolve\n再把 +.argotunnel.com 加进 fake-ip-filter，让 DNS 返回真实地址。";
  if (/failed to dial to edge with quic|QUIC connection failed/i.test(text)) return `出网被拦：连不上 Cloudflare 边缘（UDP 7844）。${fakeIp ? clashFix : "检查防火墙是否放行 UDP 7844。"}`;
  if (/TLS handshake with edge error/i.test(text)) return `TCP 7844 能连上但 TLS 握手被中断。${fakeIp ? clashFix : "中间设备在拆这条连接。"}`;
  return "cloudflared 拿到了地址但公网访问不通；看 cloudflared 输出排查网络。";
}

  async function start() {
    const port = await new Promise((resolve, reject) => {
      app.on("error", reject);
      app.listen(0, "127.0.0.1", () => resolve(app.address().port));
    });
    server = app;
    const local = `http://127.0.0.1:${port}`;
    log(`media tunnel: local origin ${local}${prefix}/media/`);

    return new Promise((resolve, reject) => {
      child = spawn(bin, ["tunnel", "--no-autoupdate", "--url", local], { stdio: ["ignore", "pipe", "pipe"] });
      let settled = false;
      let candidate = null;
      const done = (err, url) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        err ? reject(err) : resolve(url);
      };
      const timer = setTimeout(() => done(Object.assign(new Error(candidate ? `${candidate} 验证超时。${diagnose()}` : "cloudflared 在 120s 内没有给出公网地址"), { code: "TUNNEL_TIMEOUT" })), 120_000);
      const scan = (buf) => {
        const s = buf.toString();
        cfLog.push(s);
        if (cfLog.length > 200) cfLog.shift();
        const m = s.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
        if (m && !candidate) {
          candidate = `${m[0]}${prefix}`;
          log(`media tunnel: 拿到地址 ${candidate}/media/，正在验证可达性…`);
          verify(candidate).then((v) => {
            if (!v.ok) return done(Object.assign(new Error(`${candidate} 不可达（HTTP ${v.status || "无响应"}）。${diagnose()}`), { code: "TUNNEL_UNREACHABLE", cloudflared: cfLog.slice(-6).join("") }));
            publicUrl = candidate;
            log(`media tunnel: ${publicUrl}/media/  (只读，只有 /media，控制接口不出网)`);
            done(null, publicUrl);
          });
        }
      };
      child.stdout.on("data", scan);
      child.stderr.on("data", scan);
      child.on("error", (err) => done(Object.assign(new Error(`启动 cloudflared 失败：${err.message}（brew install cloudflared）`), { code: "TUNNEL_SPAWN_FAILED" })));
      child.on("exit", (code) => {
        if (!settled) done(Object.assign(new Error(`cloudflared 退出（code ${code}）`), { code: "TUNNEL_EXITED" }));
        else if (!stopping) log(`media tunnel: cloudflared 退出（code ${code}）；v2v 会退回 NO_PUBLIC_MEDIA_URL`);
      });
    });
  }

  let stopping = false;
  function stop() {
    stopping = true;
    try { child?.kill("SIGTERM"); } catch {}
    try { server?.close(); } catch {}
  }

  return { start, stop, get url() { return publicUrl; }, prefix };
}
