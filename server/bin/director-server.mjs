#!/usr/bin/env node
// Director backend: authoritative Director Runtime + HTTP/SSE API (+ optional static hosting of ../web).
//   node server/bin/director-server.mjs [--port 5175] [--host 0.0.0.0] [--project server/data/project.json]
//                                       [--media-dir DIR] [--api-only] [--static DIR] [--token SECRET] [--cors ORIGIN] [--demo city-edge|none]
// Contract: docs/backend-api.md
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHost } from "../src/host.mjs";
import { createApp } from "../src/api.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (k) => args.includes(k);
const arg = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d;
};

const PORT = Number(process.env.PORT || arg("--port", 5175));
const HOST = process.env.HOST || arg("--host", "0.0.0.0");
const PROJECT = process.env.DIRECTOR_PROJECT || arg("--project", path.join(here, "..", "data", "project.json"));
const MEDIA = process.env.DIRECTOR_MEDIA_DIR || arg("--media-dir", null);
const TOKEN = process.env.DIRECTOR_TOKEN || arg("--token", null);
const CORS = process.env.DIRECTOR_CORS || arg("--cors", "*");
const DEMO = arg("--demo", "city-edge");
const STATIC = flag("--api-only") ? false : arg("--static", path.resolve(here, "..", ".."));

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const host = createHost({ projectFile: PROJECT === "none" ? null : PROJECT, mediaDir: MEDIA, demo: DEMO === "none" ? null : DEMO, log });
const { server } = createApp(host, { static: STATIC, token: TOKEN, cors: CORS, log });

server.listen(PORT, HOST, () => {
  log(`Director backend ${host.health().service}  http://127.0.0.1:${PORT}/api/health`);
  if (STATIC) log(`console UI          http://127.0.0.1:${PORT}/web/   (static root ${STATIC})`);
  else log(`api-only mode: serve web/ from any static host and point it at this API (window.DIRECTOR_API or ?api=)`);
  log(`project file        ${host.projectFile || "(none — in-memory)"}   media ${host.mediaDir}`);
  const proxy = process.env.VSCODE_PROXY_URI;
  if (proxy) log(`via code-server proxy: ${proxy.replace("{{port}}", String(PORT))}web/`);
  log(`try: node server/bin/director.mjs --remote http://127.0.0.1:${PORT} context.scene`);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    log(`${sig}: saving and shutting down`);
    host.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1500).unref();
  });
}
