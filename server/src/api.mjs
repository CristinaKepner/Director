// HTTP layer of the Director backend. Plain node:http, no dependencies.
// Contract: docs/backend-api.md. All /api responses are JSON {ok, ...}; state changes stream over SSE /api/events.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".webm": "video/webm", ".mp4": "video/mp4", ".md": "text/markdown; charset=utf-8", ".ico": "image/x-icon", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8" };
const MAX_JSON = 20 * 1024 * 1024;
const MAX_MEDIA = 200 * 1024 * 1024;

export function createApp(host, opts = {}) {
  const log = opts.log || (() => {});
  const staticRoot = opts.static === false ? null : path.resolve(opts.static || REPO_ROOT);
  const token = opts.token || null;
  const cors = opts.cors || "*";
  const started = Date.now();
  const sse = new Set();

  host.subscribe((msg) => {
    if (!sse.size) return;
    const payload = `event: state\nid: ${msg.seq}\ndata: ${JSON.stringify(msg)}\n\n`;
    for (const res of sse) res.write(payload);
  });

  const json = (res, code, body) => {
    res.writeHead(code, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": cors });
    res.end(JSON.stringify(body));
  };

  function readBody(req, limit = MAX_JSON) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      req.on("data", (c) => {
        size += c.length;
        if (size > limit) {
          reject(Object.assign(new Error("PAYLOAD_TOO_LARGE"), { code: 413 }));
          req.destroy();
          return;
        }
        chunks.push(c);
      });
      req.on("end", () => resolve(Buffer.concat(chunks)));
      req.on("error", reject);
    });
  }
  async function readJson(req) {
    const buf = await readBody(req);
    if (!buf.length) return {};
    try {
      return JSON.parse(buf.toString("utf8"));
    } catch {
      throw Object.assign(new Error("BAD_JSON"), { code: 400 });
    }
  }

  function authorized(req, url) {
    if (!token) return true;
    const h = req.headers.authorization || "";
    return h === `Bearer ${token}` || url.searchParams.get("token") === token;
  }

  function serveFile(res, abs, cacheable = false) {
    fs.stat(abs, (err, st) => {
      if (err || !st.isFile()) {
        res.writeHead(404, { "content-type": "text/plain" });
        return res.end("not found");
      }
      res.writeHead(200, { "content-type": MIME[path.extname(abs).toLowerCase()] || "application/octet-stream", "cache-control": cacheable ? "public, max-age=86400" : "no-cache", "content-length": st.size, "access-control-allow-origin": cors });
      fs.createReadStream(abs).pipe(res);
    });
  }

  async function handleApi(req, res, url) {
    const p = url.pathname.replace(/\/+$/, "") || "/";
    const m = req.method;

    if (p === "/api/health" && m === "GET") return json(res, 200, host.health({ clients: sse.size, uptimeSec: Math.round((Date.now() - started) / 1000), static: !!staticRoot }));
    if (!authorized(req, url)) return json(res, 401, { ok: false, error: "UNAUTHORIZED" });

    if (p === "/api/capabilities" && m === "GET") {
      const caps = host.capabilities();
      const group = url.searchParams.get("group");
      return json(res, 200, { ok: true, count: caps.length, data: group ? caps.filter((c) => c.name.startsWith(group + ".")) : caps });
    }
    let mm = p.match(/^\/api\/capabilities\/([a-z.-]+)$/);
    if (mm && m === "GET") {
      const c = host.capabilities().find((x) => x.name === mm[1]);
      return c ? json(res, 200, { ok: true, ...c }) : json(res, 404, { ok: false, error: "UNKNOWN_ACTION" });
    }
    if (p === "/api/state" && m === "GET") return json(res, 200, { ok: true, version: host.version(), snapshot: host.snapshot(Number(url.searchParams.get("events") || 120)) });
    if (p === "/api/context" && m === "GET") {
      const what = url.searchParams.get("what") || "scene";
      const payload = Object.fromEntries([...url.searchParams].filter(([k]) => k !== "what"));
      return json(res, 200, host.invoke({ action: `context.${what}`, payload, meta: { source: "api", actorId: "reader" } }));
    }
    if ((p === "/api/actions" || p === "/api/invoke") && m === "POST") {
      const body = await readJson(req);
      if (!body.action && !Array.isArray(body.batch)) return json(res, 400, { ok: false, error: "MISSING_ACTION", hint: "{action, payload, meta} or {batch:[{action,payload}], meta}" });
      const t0 = Date.now();
      const out = host.invoke(body);
      if (body.withState || url.searchParams.get("state") === "1") out.snapshot = host.snapshot();
      log(`${body.action || `batch[${body.batch.length}]`} ← ${body.meta?.source || "api"}/${body.meta?.actorId || body.meta?.actor || "-"} → ${out.ok ? "ok" : out.error} (${Date.now() - t0} ms)`);
      return json(res, 200, out);
    }
    mm = p.match(/^\/api\/actions\/([a-z.-]+)$/);
    if (mm && m === "POST") {
      const body = await readJson(req);
      const out = host.invoke({ action: mm[1], payload: body.payload ?? body, meta: body.meta || {} });
      if (url.searchParams.get("state") === "1") out.snapshot = host.snapshot();
      return json(res, 200, out);
    }
    if (p === "/api/agent" && m === "POST") {
      const body = await readJson(req);
      if (!body.text) return json(res, 400, { ok: false, error: "MISSING_TEXT" });
      const out = host.invoke({ action: body.planOnly ? "agent.plan" : "agent.run", payload: { text: body.text, mode: body.mode || "lead", force: body.force !== false }, meta: { source: "agent", actorId: body.actor || "remote-agent" } });
      if (out.ok && !body.planOnly) out.agentSays = host.store.get().agent.messages.filter((x) => x.role === "agent").slice(-1).map((x) => x.text);
      if (body.withState) out.snapshot = host.snapshot();
      return json(res, 200, out);
    }
    if (p === "/api/project" && m === "GET") {
      const data = host.R.persistable(host.store.get());
      if (url.searchParams.get("download") === "1") res.setHeader("content-disposition", `attachment; filename="${(data.project.name || "project").replace(/[^\w.-]+/g, "_")}.json"`);
      return json(res, 200, { ok: true, version: host.version(), data });
    }
    if (p === "/api/project" && (m === "PUT" || m === "POST")) {
      const body = await readJson(req);
      const data = body.data || body;
      if (!data || !data.project) return json(res, 400, { ok: false, error: "BAD_PROJECT" });
      return json(res, 200, host.invoke({ action: "project.load", payload: { data }, meta: { source: "api", actorId: body.actor || "api-client" } }));
    }
    if (p === "/api/project/save" && m === "POST") return json(res, 200, host.save());
    if (p === "/api/events" && m === "GET") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive", "x-accel-buffering": "no", "access-control-allow-origin": cors });
      res.write(`event: hello\ndata: ${JSON.stringify({ service: host.health().service, version: host.version(), snapshot: host.snapshot() })}\n\n`);
      sse.add(res);
      log(`events: client connected (${sse.size})`);
      const ka = setInterval(() => res.write(": keepalive\n\n"), 15000);
      ka.unref?.();
      req.on("close", () => {
        clearInterval(ka);
        sse.delete(res);
        log(`events: client left (${sse.size})`);
      });
      return;
    }
    mm = p.match(/^\/api\/takes\/([\w-]+)\/media$/);
    if (mm && m === "POST") {
      const buf = await readBody(req, MAX_MEDIA);
      if (!buf.length) return json(res, 400, { ok: false, error: "EMPTY_BODY" });
      const out = host.saveMedia(mm[1], buf, req.headers["content-type"] || "video/webm");
      log(`media ${mm[1]} ← ${buf.length} bytes → ${out.ok ? out.url : out.error}`);
      return json(res, out.ok ? 200 : 404, out);
    }
    mm = p.match(/^\/api\/takes\/([\w-]+)$/);
    if (mm && m === "GET") {
      const t = host.store.get().takes.find((x) => x.id === mm[1]);
      return t ? json(res, 200, { ok: true, data: t }) : json(res, 404, { ok: false, error: "TAKE_NOT_FOUND" });
    }
    return json(res, 404, { ok: false, error: "NOT_FOUND", hint: "see docs/backend-api.md" });
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const p = url.pathname;
    if (req.method === "OPTIONS") {
      res.writeHead(204, { "access-control-allow-origin": cors, "access-control-allow-headers": "content-type, authorization", "access-control-allow-methods": "GET,POST,PUT,OPTIONS", "access-control-max-age": "600" });
      return res.end();
    }
    try {
      if (p.startsWith("/api/") || p === "/api") return await handleApi(req, res, url);
      if (p.startsWith("/media/")) {
        const abs = host.mediaPath(decodeURIComponent(p.slice("/media/".length)));
        if (!abs) {
          res.writeHead(404, { "content-type": "text/plain" });
          return res.end("not found");
        }
        return serveFile(res, abs, true);
      }
      if (!staticRoot) return json(res, 404, { ok: false, error: "API_ONLY", hint: "frontend is served elsewhere; API lives under /api" });
      // static frontend: repo root is served so web/ can import ../core/ ; "/" opens the console
      if (p === "/" || p === "") {
        res.writeHead(302, { location: `${url.pathname.replace(/\/?$/, "")}/web/` });
        return res.end();
      }
      let file = path.normalize(decodeURIComponent(p)).replace(/^(\.\.[/\\])+/, "");
      if (file.endsWith("/") || file.endsWith("\\")) file += "index.html";
      const abs = path.join(staticRoot, file);
      if (!abs.startsWith(staticRoot)) return json(res, 403, { ok: false, error: "FORBIDDEN" });
      if (/[\\/](server|docs|tests|tools|node_modules|\.git)([\\/]|$)/.test(abs.slice(staticRoot.length))) return json(res, 404, { ok: false, error: "NOT_FOUND" });
      return serveFile(res, abs, abs.includes(`${path.sep}vendor${path.sep}`));
    } catch (err) {
      const code = err.code && Number.isInteger(err.code) ? err.code : 500;
      json(res, code, { ok: false, error: code === 500 ? "SERVER_ERROR" : err.message, message: String(err.message || err) });
    }
  });

  return { server, sse, staticRoot };
}
