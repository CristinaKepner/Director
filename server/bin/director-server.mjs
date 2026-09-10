#!/usr/bin/env node
// Director backend: authoritative Director Runtime + HTTP/SSE API (+ optional static hosting of ../web).
//   node server/bin/director-server.mjs [--port 5175] [--host 0.0.0.0] [--project server/data/project.json]
//                                       [--media-dir DIR] [--api-only] [--static DIR] [--token SECRET] [--cors ORIGIN] [--demo city-edge|none]
//                                       [--ark-key-file FILE | ARK_API_KEY=…] [--ark-model seedance-2.5=doubao-seedance-2-5-260628] [--public-url https://host]
//                                       [--llm-key-file FILE | AIGW_API_KEY=…] [--llm-base https://aigw.sotatts.online/v1] [--llm-model gpt-5.6-sol|deepseek-v4-flash]
// Contract: docs/backend-api.md
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { createHost } from "../src/host.mjs";
import { createApp } from "../src/api.mjs";
import { createArkAdapter } from "../src/adapters/ark.mjs";
import { createLlmPlanner } from "../src/adapters/llm.mjs";

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
// Volcengine Ark (Seedance / Seedream): ARK_API_KEY, or --ark-key-file FILE; ARK_BASE_URL and --ark-model provider=model override defaults
const ARK_KEY = process.env.ARK_API_KEY || (arg("--ark-key-file", null) && fs.readFileSync(arg("--ark-key-file"), "utf8").trim()) || null;
// LLM planner for the Agent Director (OpenAI-compatible gateway): AIGW_API_KEY / LLM_API_KEY or --llm-key-file; --llm-base URL; --llm-model ID
const LLM_KEY = process.env.AIGW_API_KEY || process.env.LLM_API_KEY || (arg("--llm-key-file", null) && fs.readFileSync(arg("--llm-key-file"), "utf8").trim()) || null;
const LLM_BASE = process.env.LLM_BASE_URL || arg("--llm-base", null);
const LLM_MODEL = process.env.LLM_MODEL || arg("--llm-model", null);
const PUBLIC_URL = process.env.DIRECTOR_PUBLIC_URL || arg("--public-url", null); // where Ark can fetch /media/* from (needed for v2v)
const ARK_MODELS = Object.fromEntries(args.flatMap((a, i) => (a === "--ark-model" && args[i + 1]?.includes("=") ? [args[i + 1].split("=")] : [])));

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const generation = ARK_KEY ? (ctx) => createArkAdapter({ apiKey: ARK_KEY, baseUrl: process.env.ARK_BASE_URL, models: ARK_MODELS, ...ctx }) : null;
const llm = LLM_KEY ? (ctx) => createLlmPlanner({ apiKey: LLM_KEY, baseUrl: LLM_BASE, model: LLM_MODEL, ...ctx }) : null;
const host = createHost({ projectFile: PROJECT === "none" ? null : PROJECT, mediaDir: MEDIA, demo: DEMO === "none" ? null : DEMO, generation, llm, publicUrl: PUBLIC_URL, log });
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
