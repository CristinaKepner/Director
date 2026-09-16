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

// 打包后的 app 继承的是 launchd 的 PATH（/usr/bin:/bin:/usr/sbin:/sbin），里面没有
// /opt/homebrew/bin —— 装了 cloudflared 的机器上照样 spawn ENOENT，v2v 直接没了。
// ffmpeg 和 yt-dlp 早就按固定位置探测（film.mjs / fetch.mjs），隧道这里一直没跟上。
const CANDIDATES = ["/opt/homebrew/bin/cloudflared", "/usr/local/bin/cloudflared", "/opt/local/bin/cloudflared", "/usr/bin/cloudflared"];

export function findCloudflared(explicit) {
  const tries = [explicit, process.env.CLOUDFLARED, ...CANDIDATES].filter(Boolean);
  for (const p of tries) if (isExe(p)) return p;
  for (const dir of (process.env.PATH || "").split(path.delimiter)) {
    const p = path.join(dir, "cloudflared");
    if (isExe(p)) return p;
  }
  return null;
}

function isExe(p) {
  try {
    fs.accessSync(p, fs.constants.X_OK);
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

// cloudflared 报出来的地址不止一个：api.trycloudflare.com 是它自己的接口，会出现在
// 日志和报错里。不排掉的话，一条连接失败的日志就能让我们把接口地址当成隧道地址去验证。
export const QUICK_TUNNEL_URL = /https:\/\/(?!api\.|www\.)[a-z0-9-]+\.trycloudflare\.com/i;

const TYPES = { ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

export function createMediaTunnel(opts = {}) {
  const mediaDir = path.resolve(opts.mediaDir);
  const log = opts.log || (() => {});
  const bin = findCloudflared(opts.bin); // null = 这台机器上没有
  const prefix = "/" + crypto.randomBytes(9).toString("base64url"); // not a secret, just not enumerable
  let server = null;
  let child = null;
  let publicUrl = null;
  let verified = false; // 本机确实从公网把探针文件取回来过
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
      const deadline = Date.now() + 40_000;
      let last = 0;
      let everHttp = false; // 边缘答过话（哪怕是 404 / 530）—— 这条隧道确实在公网上存在
      let why = "";
      for (;;) {
        try {
          const r = await fetch(`${url}/media/${name}`, { signal: AbortSignal.timeout(12_000) });
          last = r.status;
          everHttp = true;
          if (r.ok) return { ok: true };
        } catch (err) {
          last = err.name === "TimeoutError" ? 408 : 0;
          why = err.cause?.message || err.message || err.name;
        }
        if (Date.now() > deadline) return { ok: false, status: last, everHttp, why };
        await new Promise((r) => setTimeout(r, 3000));
      }
    } finally {
      fs.rmSync(probe, { force: true });
    }
  }

  const tail = (n = 4) => cfLog.slice(-n).join("").trim().split("\n").slice(-n).join("\n");

  function diagnose() {
  const text = cfLog.join("");
  const fakeIp = /198\.18\.\d+\.\d+/.test(text);
  // 实测结论（2026-09）：本机开着 Clash 这类 fake-IP 代理时，光加 DOMAIN-SUFFIX 规则不够 ——
  // cloudflared 最终是按**裸 IP** 连边缘的，域名规则根本匹配不上，连接又被拐回代理，
  // QUIC 直接超时、TCP 则是 TLS 握手 EOF。真正管用的是按 IP 段放行。
  const clashFix = "本机代理（Clash / Surge）在拦。注意：只加 DOMAIN-SUFFIX,argotunnel.com,DIRECT 不够 —— cloudflared 是按裸 IP 连边缘的，域名规则匹配不上。要加的是网段规则：\n  IP-CIDR,198.41.192.0/24,DIRECT,no-resolve\n  IP-CIDR,198.41.200.0/24,DIRECT,no-resolve\n再把 +.argotunnel.com 和 +.trycloudflare.com 加进 fake-ip-filter，让 DNS 返回真实地址；\n  域名规则也加上 DOMAIN-SUFFIX,trycloudflare.com,DIRECT —— 建隧道那一步走的是这个域名，按域名匹配得上。";
  // 连 tunnel 都建不起来（而不是建起来后不通）：cloudflared 请求 api.trycloudflare.com 就超时了。
  // 实测本机开着 Clash 时最常见的就是这一条 —— 和边缘连接被拦是同一个病，位置更靠前。
  if (/failed to request quick Tunnel/i.test(text)) return `cloudflared 连 Cloudflare 的接口（api.trycloudflare.com）就超时了，隧道根本没建起来。${clashFix}`;
  if (/failed to dial to edge with quic|QUIC connection failed/i.test(text)) return `出网被拦：连不上 Cloudflare 边缘（UDP 7844）。${fakeIp ? clashFix : "检查防火墙是否放行 UDP 7844。"}`;
  if (/TLS handshake with edge error/i.test(text)) return `TCP 7844 能连上但 TLS 握手被中断。${fakeIp ? clashFix : "中间设备在拆这条连接。"}`;
  return "cloudflared 拿到了地址但公网访问不通；看 cloudflared 输出排查网络。";
}

  async function listenLocal() {
    if (server) return `http://127.0.0.1:${server.address().port}`;
    const port = await new Promise((resolve, reject) => {
      app.once("error", reject);
      app.listen(0, "127.0.0.1", () => resolve(app.address().port));
    });
    server = app;
    const local = `http://127.0.0.1:${port}`;
    log(`media tunnel: local origin ${local}${prefix}/media/`);
    return local;
  }

  // 一条隧道能不能用，不是它给不给地址决定的。实测（2026-09）：quick tunnel 有相当比例
  // 拿到了 *.trycloudflare.com 地址、cloudflared 也报 Registered，但那个主机名在公网上
  // 一直不解析 / 不路由 —— 隔几分钟再试还是连不上。而当场换一条隧道就通了。
  // 所以「拿到地址 → 验证不过 → 报失败」是把一次随机故障当成了环境故障。
  const RETRYABLE = new Set(["TUNNEL_UNREACHABLE", "TUNNEL_TIMEOUT", "TUNNEL_EXITED"]);

  async function start({ attempts = 3, onAttempt = () => {} } = {}) {
    // 没找到就当场说清楚去哪儿装，而不是 spawn 出一个 ENOENT 再翻译错误
    if (!bin) throw Object.assign(new Error(`找不到 cloudflared（找过 ${CANDIDATES.join("、")} 和 PATH）。brew install cloudflared，或用 CLOUDFLARED=/路径 指过去`), { code: "TUNNEL_NOT_INSTALLED" });
    const local = await listenLocal();
    let last = null;
    for (let i = 1; i <= attempts; i++) {
      cfLog.length = 0;
      const lastRound = i >= attempts;
      try { onAttempt(i); } catch {}
      try {
        publicUrl = await attempt(local);
        verified = true;
        return publicUrl;
      } catch (err) {
        last = err;
        // 最后一轮、而且失败原因是「本机判不了」：保留这条隧道用下去，别把本机代理
        // 的毛病变成「v2v 用不了」。会明确标成未验证，出问题时日志里说得清。
        if (lastRound && err.unverifiable) {
          publicUrl = err.url;
          verified = false;
          log(`media tunnel: ${publicUrl}/media/  ⚠️ 本机验证不过，按「已建立但未验证」用下去。若 Ark 报取不到视频，多半是本机代理在拦 trycloudflare.com：${diagnose()}`);
          return publicUrl;
        }
        try { child?.kill("SIGTERM"); } catch {}
        child = null;
        if (lastRound || !RETRYABLE.has(err.code)) break;
        log(`media tunnel: 第 ${i} 条隧道没通（${err.code}），换一条重试`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    throw last;
  }

  function attempt(local) {
    return new Promise((resolve, reject) => {
      child = spawn(bin, ["tunnel", "--no-autoupdate", "--url", local], { stdio: ["ignore", "pipe", "pipe"] });
      let settled = false;
      let abandoned = false; // 这一条已经判死、准备换一条：它之后的退出不值得再报一次
      let candidate = null;
      let registered = false; // cloudflared 说它已经连上边缘了
      const done = (err, url) => {
        if (settled) return;
        settled = true;
        abandoned = !!err;
        clearTimeout(timer);
        err ? reject(err) : resolve(url);
      };
      const timer = setTimeout(() => done(Object.assign(new Error(candidate ? `${candidate} 验证超时。${diagnose()}` : "cloudflared 在 120s 内没有给出公网地址"), { code: "TUNNEL_TIMEOUT", cloudflared: tail() })), 120_000);
      const scan = (buf) => {
        const s = buf.toString();
        cfLog.push(s);
        if (cfLog.length > 200) cfLog.shift();
        if (/Registered tunnel connection/i.test(s)) registered = true;
        const m = s.match(QUICK_TUNNEL_URL);
        if (m && !candidate) {
          candidate = `${m[0]}${prefix}`;
          log(`media tunnel: 拿到地址 ${candidate}/media/，正在验证可达性…`);
          verify(candidate).then((v) => {
            if (!v.ok) {
              // 本机一次 HTTP 应答都没拿到、而 cloudflared 已经注册上边缘 —— 这时候
              // 「不可达」只是**本机**的结论：Clash 这类代理经常把到 trycloudflare.com 的
              // TLS 直接掐断。真正要能取到视频的是 Ark 的服务器，不是这台机器。
              // 所以这种情况不判死，标成「验不了」，交给上面决定用不用。
              const blind = !v.everHttp && registered;
              return done(Object.assign(new Error(`${candidate} ${blind ? `本机验不了（${v.why || "连接被中断"}）` : `不可达（HTTP ${v.status || "无响应"}）`}。${diagnose()}`), { code: "TUNNEL_UNREACHABLE", unverifiable: blind, url: candidate, cloudflared: tail(6) }));
            }
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
        // 退出原因只有 cloudflared 自己知道（限流、被拦、参数不对）。不带上它的最后几行，
        // 日志里就只剩一句「退出（code 1）」，等于什么也没说。
        if (!settled) done(Object.assign(new Error(`cloudflared 退出（code ${code}）。${diagnose()}`), { code: "TUNNEL_EXITED", cloudflared: tail() }));
        else if (!stopping && !abandoned) log(`media tunnel: cloudflared 退出（code ${code}）；v2v 会退回 NO_PUBLIC_MEDIA_URL`);
      });
    });
  }

  let stopping = false;
  function stop() {
    stopping = true;
    try { child?.kill("SIGTERM"); } catch {}
    try { server?.close(); } catch {}
  }

  return { start, stop, get url() { return publicUrl; }, get verified() { return verified; }, prefix };
}
