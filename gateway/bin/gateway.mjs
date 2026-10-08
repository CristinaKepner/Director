#!/usr/bin/env node
// 体验网关的命令行。密钥只在这台机器上，发出去的是体验码。
//
//   起服务   node gateway/bin/gateway.mjs serve --port 8787 \
//              --llm-key-file ~/.aigw-key --ark-key-file ~/.ark-key \
//              --data ~/director-gateway/tokens.json --url https://gw.example.com
//   发一个   node gateway/bin/gateway.mjs issue --label 张三 --tokens 100000 --calls 50 --days 7 --url https://gw.example.com
//   看一眼   node gateway/bin/gateway.mjs list
//   停掉     node gateway/bin/gateway.mjs revoke dt_xxx
//
// 发出去的那一行形如 `dt_abc…@https://gw.example.com`：一段字符串里既有身份也有地址，
// 体验的人在导演台的偏好设置里粘一次就行，不必分两个框填、也不用知道什么是网关。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createStore } from "../src/store.mjs";
import { createGateway } from "../src/server.mjs";

const argv = process.argv.slice(2);
const cmd = argv[0] || "help";
const arg = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d; };
const has = (k) => argv.includes(k);
const expand = (p) => (p && p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p);
const readKey = (flag, env) => {
  const f = expand(arg(flag));
  if (f) return fs.readFileSync(f, "utf8").trim();
  return process.env[env] || null;
};

const DATA = expand(arg("--data")) || path.join(os.homedir(), ".director-gateway", "tokens.json");
const store = createStore(DATA);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const fmtLeft = (q) => `${q.tokens.left}/${q.tokens.limit} token · ${q.calls.left}/${q.calls.limit} 次`;
const fmtWhen = (t) => (t ? new Date(t).toISOString().slice(0, 16).replace("T", " ") : "不过期");

if (cmd === "serve") {
  const llmKey = readKey("--llm-key-file", "AIGW_API_KEY");
  const arkKey = readKey("--ark-key-file", "ARK_API_KEY");
  if (!llmKey && !arkKey) {
    console.error("至少要有一把上游密钥：--llm-key-file（规划 / 读参照 / 验收）或 --ark-key-file（出片）");
    process.exit(1);
  }
  const port = Number(arg("--port", 8787));
  const host = arg("--host", "0.0.0.0");
  const { server } = createGateway({
    store, llmKey, arkKey,
    llmBase: arg("--llm-base"), arkBase: arg("--ark-base"), log,
  });
  server.listen(port, host, () => {
    const url = arg("--url") || `http://127.0.0.1:${port}`;
    log(`体验网关 http://${host}:${port}  账本 ${DATA}`);
    log(`上游：${llmKey ? "网关密钥已加载" : "没有网关密钥 —— 规划 / 读参照会 502"} · ${arkKey ? "火山密钥已加载" : "没有火山密钥 —— 出片会 502"}`);
    log(`客户端填这个：<体验码>@${url}`);
    log(`已发出 ${Object.keys(store.data.tokens).length} 个体验码`);
  });
  const bye = () => { store.flush(); process.exit(0); };
  process.on("SIGINT", bye);
  process.on("SIGTERM", bye);
} else if (cmd === "issue") {
  const rec = store.issue({
    label: arg("--label", ""),
    tokens: Number(arg("--tokens", 100000)),
    calls: Number(arg("--calls", 50)),
    days: Number(arg("--days", 7)),
  });
  const url = arg("--url", "");
  console.log(`体验码   ${rec.code}`);
  console.log(`给谁     ${rec.label || "（没写）"}`);
  console.log(`额度     ${rec.limits.tokens} token · ${rec.limits.calls} 次出片`);
  console.log(`到期     ${fmtWhen(rec.expiresAt)}`);
  if (url) {
    console.log("");
    console.log("把下面这一行发给他，粘进导演台「偏好设置 → 体验码」：");
    console.log(`  ${rec.code}@${url.replace(/\/$/, "")}`);
  } else {
    console.log("\n带上 --url https://你的网关地址 就会直接打印一行可以粘的字符串");
  }
} else if (cmd === "list") {
  const rows = store.list();
  if (!rows.length) console.log("还没有发出过体验码。issue 发一个。");
  for (const r of rows) {
    const q = store.quota(r.code);
    const dead = r.revoked ? "已停用" : r.expiresAt && Date.now() > r.expiresAt ? "已过期" : "在用";
    console.log(`${r.code}  ${dead.padEnd(4)}  ${String(r.label || "—").padEnd(12)}  剩 ${fmtLeft(q)}  ${r.requests} 次请求  到期 ${fmtWhen(r.expiresAt)}`);
  }
} else if (cmd === "revoke") {
  const code = argv[1];
  if (!code) { console.error("用法：revoke dt_xxx"); process.exit(1); }
  console.log(store.revoke(code) ? `${code} 已停用，下一次请求就会被拒` : `没有这个体验码：${code}`);
} else if (cmd === "stats") {
  const rows = store.list();
  const live = rows.filter((r) => !r.revoked && (!r.expiresAt || Date.now() < r.expiresAt));
  const sum = (f) => rows.reduce((n, r) => n + f(r), 0);
  console.log(`体验码   ${rows.length} 个（在用 ${live.length}）`);
  console.log(`已消耗   ${sum((r) => r.used.tokens)} token · ${sum((r) => r.used.calls)} 次出片 · ${sum((r) => r.requests)} 次请求`);
  console.log(`已承诺   ${sum((r) => r.limits.tokens)} token · ${sum((r) => r.limits.calls)} 次（全部用满的话）`);
  console.log(`账本     ${DATA}`);
} else {
  console.log(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1, 16).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
}
