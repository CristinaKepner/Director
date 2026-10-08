// 体验令牌的账本。一个进程、一个 JSON 文件，没有依赖。
//
// 为什么不用数据库：这份账本要管的是几十到几百个体验名额，写入频率是「每次调用一行」。
// 真正要守住的两件事是「扣减不能漏」和「进程被杀了账不能丢」，SQLite 能做到，
// 一个原子写的 JSON 同样能做到，而后者不用让部署的人先装东西。真长到几万条再换。
//
// 扣减分两步，因为上游要花多久、花多少，发请求的时候还不知道：
//   · reserve()  发出去之前先按悲观估计占住额度 —— 十个请求同时进来，不能十个都看到「还有余额」
//   · settle()   回来之后把占住的放掉，按上游报的真实用量入账
// 两步之间不 await，所以单线程里这就是一段临界区，不会有竞态。
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const REASONS = {
  NOT_FOUND: "这个体验码不存在",
  REVOKED: "这个体验码已经停用",
  EXPIRED: "这个体验码已经过期",
  OUT_OF_TOKENS: "体验额度里的 token 用完了",
  OUT_OF_CALLS: "体验额度里的出片次数用完了",
};

// 一次对话先占住多少 token。占太多会把正常请求挡在门外，占太少则并发时会超出上限；
// 2000 是实测单次规划的中位数量级，超出的部分由 settle() 立刻补平。
const RESERVE_TOKENS = 2000;

const now = () => Date.now();

export function createStore(file) {
  const data = (() => {
    try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return { version: 1, tokens: {} }; }
  })();
  data.tokens ||= {};
  const inflight = new Map(); // code → { tokens, calls }
  let dirty = false, timer = null, lastRefresh = 0;

  // 磁盘上可能有别的进程写的东西：网关在跑的时候，管理员会用 CLI 发新码、停用旧码。
  // 所以写之前先把磁盘那份并进来，而不是整个覆盖 —— 否则「发一个新码」会把服务端
  // 这段时间记的用量抹掉，「停用」也会被服务端的下一次写盖回去。
  // used 是只增不减的计数，两边取大的那个就是对的；revoked 只要有一边说停就停。
  function merge() {
    let disk;
    try { disk = JSON.parse(fs.readFileSync(file, "utf8")); } catch { return false; }
    let changed = false;
    for (const [code, t] of Object.entries(disk.tokens || {})) {
      const mine = data.tokens[code];
      if (!mine) { data.tokens[code] = t; changed = true; continue; }
      const u = t.used || {};
      if ((u.tokens || 0) > mine.used.tokens) { mine.used.tokens = u.tokens; changed = true; }
      if ((u.calls || 0) > mine.used.calls) { mine.used.calls = u.calls; changed = true; }
      if ((t.requests || 0) > mine.requests) mine.requests = t.requests;
      if (t.revoked && !mine.revoked) { mine.revoked = true; changed = true; }
      if (t.limits && JSON.stringify(t.limits) !== JSON.stringify(mine.limits)) { mine.limits = t.limits; changed = true; }
    }
    return changed;
  }

  // 原子写：先写同目录的临时文件再 rename。直接覆盖的话，进程在写一半时被杀，
  // 账本就成了半截 JSON —— 下次启动读不出来，所有人的额度一起清零。
  function flush() {
    timer = null;
    if (!dirty) return;
    dirty = false;
    merge();
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
    fs.renameSync(tmp, file);
  }
  function save(immediate) {
    dirty = true;
    if (immediate) return flush();
    if (!timer) timer = setTimeout(flush, 400).unref?.() || setTimeout(flush, 400);
  }

  const held = (code) => inflight.get(code) || { tokens: 0, calls: 0 };

  function state(code) {
    const t = data.tokens[code];
    if (!t) return "NOT_FOUND";
    if (t.revoked) return "REVOKED";
    if (t.expiresAt && now() > t.expiresAt) return "EXPIRED";
    return null;
  }

  return {
    file,
    data,

    issue({ label = "", tokens = 100_000, calls = 50, days = 7 } = {}) {
      const code = `dt_${crypto.randomBytes(16).toString("hex")}`;
      data.tokens[code] = {
        label: String(label).slice(0, 80),
        createdAt: now(),
        expiresAt: days > 0 ? now() + days * 86400_000 : null,
        limits: { tokens: Math.max(0, Math.round(tokens)), calls: Math.max(0, Math.round(calls)) },
        used: { tokens: 0, calls: 0 },
        revoked: false,
        lastUsedAt: null,
        requests: 0,
      };
      save(true);
      return { code, ...data.tokens[code] };
    },

    get: (code) => data.tokens[code] || null,

    // 认不出这个码时再读一次磁盘：管理员刚用 CLI 发的那一个，服务端启动时还不存在。
    // 不这么做的话，「发了码 → 对方立刻说不认识 → 重启网关」会是每次发码的固定动作。
    // 限频是为了挡住拿随机字符串来刷的：认不出来的码每秒最多让它读一次文件。
    refresh(force) {
      const t = now();
      if (!force && t - lastRefresh < 1000) return false;
      lastRefresh = t;
      return merge();
    },
    list: () => Object.entries(data.tokens).map(([code, t]) => ({ code, ...t, holding: held(code) })),

    revoke(code) {
      const t = data.tokens[code];
      if (!t) return false;
      t.revoked = true;
      save(true);
      return true;
    },

    // 额度还剩多少。给 /v1/quota 和响应头用 —— 体验的人要看得见自己还剩什么。
    quota(code) {
      const t = data.tokens[code];
      if (!t) return null;
      return {
        label: t.label,
        tokens: { used: t.used.tokens, limit: t.limits.tokens, left: Math.max(0, t.limits.tokens - t.used.tokens) },
        calls: { used: t.used.calls, limit: t.limits.calls, left: Math.max(0, t.limits.calls - t.used.calls) },
        expiresAt: t.expiresAt,
        revoked: !!t.revoked,
        requests: t.requests,
      };
    },

    /**
     * 发给上游之前先占额度。返回的 handle 必须交给 settle()，否则这份占用会一直挂着。
     * @param kind "chat"（按 token 算）| "call"（按次算）
     */
    reserve(code, kind) {
      const bad = state(code);
      if (bad) return { ok: false, reason: bad };
      const t = data.tokens[code];
      const h = held(code);
      const want = kind === "call" ? { tokens: 0, calls: 1 } : { tokens: RESERVE_TOKENS, calls: 0 };
      if (want.calls && t.used.calls + h.calls + want.calls > t.limits.calls) return { ok: false, reason: "OUT_OF_CALLS" };
      // token 这一头只看「已经用超了没有」，不要求剩余额度够这一次的悲观估计 ——
      // 否则额度只剩 1500 时，一次本来只花 300 token 的请求也会被挡住。
      if (!want.calls && t.used.tokens + h.tokens >= t.limits.tokens) return { ok: false, reason: "OUT_OF_TOKENS" };
      inflight.set(code, { tokens: h.tokens + want.tokens, calls: h.calls + want.calls });
      t.requests += 1;
      t.lastUsedAt = now();
      return { ok: true, handle: { code, want } };
    },

    // 上游回来了：放掉占用，按真实用量入账。失败的请求 actual 给 0，不该扣体验的人的额度。
    settle(handle, actual = {}) {
      if (!handle) return;
      const { code, want } = handle;
      const h = held(code);
      const rest = { tokens: Math.max(0, h.tokens - want.tokens), calls: Math.max(0, h.calls - want.calls) };
      rest.tokens || rest.calls ? inflight.set(code, rest) : inflight.delete(code);
      const t = data.tokens[code];
      if (!t) return;
      t.used.tokens += Math.max(0, Math.round(Number(actual.tokens) || 0));
      t.used.calls += Math.max(0, Math.round(Number(actual.calls) || 0));
      save();
    },

    flush: () => flush(),
  };
}
