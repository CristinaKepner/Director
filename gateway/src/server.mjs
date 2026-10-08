// 体验网关：密钥留在这一侧，发出去的是体验码。
//
// 为什么必须是一台服务器，而不是客户端里的一段代码。客户端里的任何计数都是一个文件，删掉就重置；
// 客户端里的任何密钥最终都要以 `authorization: Bearer …` 发到上游，在自己的机器上抓一次包就有了。
// 这两件事没有客户端解法 —— 所以额度在这里扣，密钥在这里换。
//
// 它是一个**透明反向代理**，不是一个新 API：导演台那边只改两个 base 地址，请求体一个字节不动。
// 这样上游加了什么参数、换了什么模型，网关不用跟着改；网关只做三件事 ——
// 认体验码、换密钥、记账。
import http from "node:http";
import { REASONS } from "./store.mjs";

const MAX_BODY = 64 * 1024 * 1024; // 读参照一次要送 6–24 张图，几 MB 很正常；这里只防失控
const UPSTREAM_TIMEOUT = 900_000; // 建一整条片子的规划实测一两分钟，出片任务更久
const MAX_CONCURRENT = 4; // 一个体验码同时能压几个请求。转发给别人用的码，先卡在这里

// 按次计费的那几条：创建任务 / 出图。轮询和取消不算 —— 那是同一次出片的后续动作，
// 再收一次费等于让人不敢查进度。
const PAY_PER_CALL = [/^\/contents\/generations\/tasks\/?$/, /^\/images\/generations\/?$/];

const json = (res, code, obj, headers = {}) => {
  const body = JSON.stringify(obj);
  res.writeHead(code, { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(body), ...headers });
  res.end(body);
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let n = 0;
    req.on("data", (c) => {
      n += c.length;
      if (n > MAX_BODY) { reject(Object.assign(new Error("请求体过大"), { code: "TOO_LARGE" })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// 上游没报 usage 时的兜底估算。宁可高估一点：体验额度宁可少给，也不该被人白嫖到底。
const estimate = (reqBytes, resChars) => Math.ceil((reqBytes / 4 + resChars) / 3);

// SSE 流里的 usage：多数网关会在最后一帧给，拿不到就回退到估算
function usageFromStream(text) {
  let usage = null;
  for (const line of text.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const body = line.slice(5).trim();
    if (!body || body === "[DONE]") continue;
    try { const j = JSON.parse(body); if (j.usage) usage = j.usage; } catch {}
  }
  return usage;
}

/**
 * @param opts { store, llmKey, arkKey, llmBase, arkBase, log, adminKey }
 */
export function createGateway(opts = {}) {
  const store = opts.store;
  const log = opts.log || (() => {});
  const llmBase = (opts.llmBase || "https://aigw.sotatts.online/v1").replace(/\/$/, "");
  const arkBase = (opts.arkBase || "https://ark.cn-beijing.volces.com/api/v3").replace(/\/$/, "");
  const active = new Map(); // code → 并发数

  // 定期回读账本。停用一个码是出事时的第一反应（码被转发出去了、有人在刷），
  // 那一刻不能还要求管理员去重启网关 —— 重启会把正在跑的出片任务一起打断。
  // 只在「认不出这个码」时才回读是不够的：已经认识的那个码，停用了也看不见。
  const refreshMs = opts.refreshMs ?? 5000;
  const ticker = refreshMs > 0 ? setInterval(() => store.refresh(true), refreshMs) : null;
  ticker?.unref?.();

  const quotaHeaders = (code) => {
    const q = store.quota(code);
    if (!q) return {};
    return {
      "x-quota-tokens-used": String(q.tokens.used),
      "x-quota-tokens-limit": String(q.tokens.limit),
      "x-quota-calls-used": String(q.calls.used),
      "x-quota-calls-limit": String(q.calls.limit),
      ...(q.expiresAt ? { "x-quota-expires": new Date(q.expiresAt).toISOString() } : {}),
    };
  };

  function auth(req) {
    const h = String(req.headers.authorization || "");
    const code = h.replace(/^Bearer\s+/i, "").trim();
    if (!code) return { ok: false, code: 401, error: "NO_TOKEN", message: "请求里没有体验码" };
    // 认不出来先去磁盘上看一眼：管理员刚发的那个码，这个进程启动时还不存在。
    // 没有这一步，「发码」和「重启网关」就成了绑在一起的两个动作。
    if (!store.get(code)) store.refresh();
    if (!store.get(code)) return { ok: false, code: 401, error: "BAD_TOKEN", message: REASONS.NOT_FOUND };
    return { ok: true, code };
  }

  async function forward({ res, url, method, body, headers, upstreamKey, code, handle, kind, reqBytes }) {
    let settled = false;
    const settle = (actual) => { if (!settled) { settled = true; store.settle(handle, actual); } };
    try {
      const up = await fetch(url, {
        method,
        headers: { ...headers, authorization: `Bearer ${upstreamKey}` },
        body: body && body.length ? body : undefined,
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT),
        redirect: "follow",
      });
      const type = up.headers.get("content-type") || "";
      const out = { "content-type": type, ...quotaHeaders(code) };

      // 流式：边转发边看最后那一帧有没有 usage。不缓冲整条 —— 规划那一屏靠它逐步显示。
      if (/event-stream/i.test(type)) {
        res.writeHead(up.status, { ...out, "cache-control": "no-cache", connection: "keep-alive" });
        let tail = "", chars = 0;
        for await (const chunk of up.body) {
          res.write(chunk);
          const s = Buffer.from(chunk).toString("utf8");
          chars += s.length;
          tail = (tail + s).slice(-8000); // usage 在末尾，留一小段就够
        }
        res.end();
        const u = usageFromStream(tail);
        settle({ tokens: up.ok ? u?.total_tokens || estimate(reqBytes, chars) : 0, calls: 0 });
        log(`${code.slice(0, 9)}… stream ${up.status} ${u?.total_tokens ? `${u.total_tokens} tok` : "估算"}`);
        return;
      }

      const buf = Buffer.from(await up.arrayBuffer());
      res.writeHead(up.status, { ...out, "content-length": buf.length });
      res.end(buf);
      let tokens = 0, calls = 0;
      if (up.ok) {
        if (kind === "call") calls = 1;
        else {
          let u = null;
          try { u = JSON.parse(buf.toString("utf8")).usage; } catch {}
          tokens = u?.total_tokens || estimate(reqBytes, buf.length);
        }
      }
      settle({ tokens, calls });
      log(`${code.slice(0, 9)}… ${method} ${new URL(url).pathname} ${up.status}${tokens ? ` ${tokens} tok` : ""}${calls ? " +1 次" : ""}`);
    } catch (err) {
      settle({ tokens: 0, calls: 0 }); // 没到上游就不该扣额度
      log(`${code.slice(0, 9)}… 上游失败 ${err.message}`);
      if (!res.headersSent) json(res, 502, { error: { code: "UPSTREAM_FAILED", message: `上游没有响应：${String(err.message).slice(0, 200)}` } });
      else res.end();
    }
  }

  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, "http://gw");
    const p = u.pathname;

    if (p === "/health") return json(res, 200, { ok: true, service: "director-gateway/1", tokens: Object.keys(store.data.tokens).length });

    // 上游转发的两族路径。客户端那边只要把 base 指过来：
    //   --llm-base https://gw/v1      --ark-base https://gw/ark
    const isChat = p.startsWith("/v1/");
    const isArk = p.startsWith("/ark/");
    if (p === "/v1/quota" || p === "/quota") {
      const a = auth(req);
      if (!a.ok) return json(res, a.code, { error: { code: a.error, message: a.message } });
      return json(res, 200, store.quota(a.code));
    }
    if (!isChat && !isArk) return json(res, 404, { error: { code: "NOT_FOUND", message: "只转发 /v1/* 和 /ark/*" } });

    const a = auth(req);
    if (!a.ok) return json(res, a.code, { error: { code: a.error, message: a.message } });
    const code = a.code;

    const rest = isChat ? p.slice(3) : p.slice(4); // 去掉 /v1 或 /ark
    const upstream = `${isChat ? llmBase : arkBase}${rest}${u.search}`;
    const kind = isArk && req.method === "POST" && PAY_PER_CALL.some((re) => re.test(rest)) ? "call"
      : isChat ? "chat"
      : null; // Ark 的轮询 / 取消：放行，不计费

    const n = active.get(code) || 0;
    if (kind && n >= MAX_CONCURRENT) {
      return json(res, 429, { error: { code: "TOO_MANY", message: `同一个体验码最多同时跑 ${MAX_CONCURRENT} 个请求，等一个结束再试` } }, quotaHeaders(code));
    }

    let body = Buffer.alloc(0);
    if (req.method !== "GET" && req.method !== "DELETE") {
      try { body = await readBody(req); } catch { return json(res, 413, { error: { code: "TOO_LARGE", message: "请求体过大" } }); }
    }

    let handle = null;
    if (kind) {
      const r = store.reserve(code, kind);
      if (!r.ok) {
        const q = store.quota(code);
        return json(res, 402, {
          error: {
            code: r.reason,
            // 这句话会原样出现在导演台的界面上，所以写成人话，并且带上还剩多少
            message: `${REASONS[r.reason] || r.reason}。${q ? `已用 ${q.tokens.used}/${q.tokens.limit} token · ${q.calls.used}/${q.calls.limit} 次` : ""}`,
          },
        }, quotaHeaders(code));
      }
      handle = r.handle;
      active.set(code, n + 1);
      res.on("close", () => { const k = (active.get(code) || 1) - 1; k > 0 ? active.set(code, k) : active.delete(code); });
    }

    // 转发的请求头：只留内容相关的。客户端的 authorization 在这里被换掉，
    // host / connection 之类交给 fetch 自己算。
    const headers = { "content-type": req.headers["content-type"] || "application/json" };
    if (req.headers.accept) headers.accept = req.headers.accept;

    await forward({
      res, url: upstream, method: req.method, body, headers,
      upstreamKey: isChat ? opts.llmKey : opts.arkKey,
      code, handle, kind, reqBytes: body.length,
    });
  });

  // 规划一次能跑几分钟，默认的请求超时会在中途把连接掐掉
  server.requestTimeout = 0;
  server.headersTimeout = 0;
  server.timeout = 0;
  server.on("close", () => ticker && clearInterval(ticker));
  return { server, store };
}
