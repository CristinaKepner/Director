#!/usr/bin/env node
// Director Console dev server: static files + Agent bridge.
//   GET  /api/bridge/events   SSE stream consumed by the browser page
//   POST /api/bridge/result   browser posts {id, result}
//   POST /api/invoke          {action, payload, meta} | {batch:[...]} → executed in the connected page
//   POST /api/agent           {text, mode}            → agent.run in the page
//   GET  /api/capabilities    tool list (from the page)
//   GET  /api/context         context.scene (from the page)
//   GET  /api/health          bridge status
// No dependencies; works behind path-stripping proxies because the page only uses relative URLs.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const arg = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : d;
};
const PORT = Number(process.env.PORT || arg("--port", 5175));
const HOST = arg("--host", "0.0.0.0");
const TIMEOUT = Number(arg("--timeout", 20000));

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webm": "video/webm", ".md": "text/markdown; charset=utf-8", ".ico": "image/x-icon", ".woff2": "font/woff2" };

const clients = new Set();
const pending = new Map();
let seq = 0;
const started = Date.now();
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

function json(res, code, body) {
  const s = JSON.stringify(body);
  res.writeHead(code, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" });
  res.end(s);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function invoke(msg) {
  if (!clients.size) return Promise.resolve({ ok: false, error: "NO_CONSOLE", hint: `open http://127.0.0.1:${PORT}/ in a browser first (the page executes actions)` });
  const id = `req_${Date.now().toString(36)}_${++seq}`;
  const payload = `event: invoke\ndata: ${JSON.stringify({ id, ...msg })}\n\n`;
  // newest client wins; others still receive (results from the first responder are used)
  for (const c of clients) c.write(payload);
  return new Promise((resolve) => {
    const t = setTimeout(() => {
      pending.delete(id);
      resolve({ ok: false, error: "TIMEOUT", id });
    }, TIMEOUT);
    pending.set(id, (result) => {
      clearTimeout(t);
      pending.delete(id);
      resolve(result);
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const p = url.pathname;
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type", "access-control-allow-methods": "GET,POST,OPTIONS" });
    return res.end();
  }
  try {
    if (p === "/api/bridge/events") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive", "x-accel-buffering": "no", "access-control-allow-origin": "*" });
      res.write(`event: hello\ndata: ${JSON.stringify({ server: "director-console", port: PORT })}\n\n`);
      clients.add(res);
      log(`bridge: page connected (${clients.size})`);
      const ka = setInterval(() => res.write(": keepalive\n\n"), 15000);
      req.on("close", () => {
        clearInterval(ka);
        clients.delete(res);
        log(`bridge: page left (${clients.size})`);
      });
      return;
    }
    if (p === "/api/bridge/result" && req.method === "POST") {
      const { id, result } = await readBody(req);
      pending.get(id)?.(result);
      return json(res, 200, { ok: true });
    }
    if (p === "/api/invoke" && req.method === "POST") {
      const body = await readBody(req);
      if (!body.action && !Array.isArray(body.batch)) return json(res, 400, { ok: false, error: "MISSING_ACTION" });
      const t0 = Date.now();
      const out = await invoke(body);
      log(`invoke ${body.action || `batch[${body.batch.length}]`} → ${out.ok ? "ok" : out.error} (${Date.now() - t0} ms)`);
      return json(res, 200, out);
    }
    if (p === "/api/agent" && req.method === "POST") {
      const body = await readBody(req);
      const out = await invoke({ action: "agent.run", payload: { text: body.text, mode: body.mode || "lead", force: true }, meta: { source: "bridge", actorId: body.actor || "remote-agent" } });
      return json(res, 200, out);
    }
    if (p === "/api/capabilities") return json(res, 200, await invoke({ action: "context.capabilities", payload: {}, meta: { source: "bridge" } }));
    if (p === "/api/context") return json(res, 200, await invoke({ action: url.searchParams.get("what") === "project" ? "context.project" : "context.scene", payload: {}, meta: { source: "bridge" } }));
    if (p === "/api/health") return json(res, 200, { ok: true, pages: clients.size, pending: pending.size, uptimeSec: Math.round((Date.now() - started) / 1000), port: PORT });
    if (p.startsWith("/api/")) return json(res, 404, { ok: false, error: "NOT_FOUND" });
    // static
    let file = path.normalize(decodeURIComponent(p)).replace(/^(\.\.[/\\])+/, "");
    if (file === "/" || file === "\\") file = "/index.html";
    const abs = path.join(root, file);
    if (!abs.startsWith(root)) return json(res, 403, { error: "FORBIDDEN" });
    fs.stat(abs, (err, st) => {
      if (err || !st.isFile()) {
        res.writeHead(404, { "content-type": "text/plain" });
        return res.end("not found");
      }
      res.writeHead(200, { "content-type": MIME[path.extname(abs)] || "application/octet-stream", "cache-control": abs.includes("/vendor/") ? "public, max-age=86400" : "no-cache", "content-length": st.size });
      fs.createReadStream(abs).pipe(res);
    });
  } catch (err) {
    json(res, 500, { ok: false, error: "SERVER_ERROR", message: String(err.message || err) });
  }
});

server.listen(PORT, HOST, () => {
  log(`Director Console  http://127.0.0.1:${PORT}/   (root ${root})`);
  const proxy = process.env.VSCODE_PROXY_URI;
  if (proxy) log(`via code-server proxy: ${proxy.replace("{{port}}", String(PORT))}`);
  log(`bridge: POST /api/invoke {action,payload}  ·  CLI: node bin/director.mjs --remote http://127.0.0.1:${PORT} context.scene`);
});
