#!/usr/bin/env node
// Director backend: authoritative Director Runtime + HTTP/SSE API (+ optional static hosting of ../web).
//   node server/bin/director-server.mjs [--port 5175] [--host 0.0.0.0] [--project server/data/project.json]
//                                       [--media-dir DIR] [--api-only] [--static DIR] [--token SECRET] [--cors ORIGIN] [--demo city-edge|none]
//                                       [--ark-key-file FILE | ARK_API_KEY=…] [--ark-model seedance-2.5=doubao-seedance-2-5-260628] [--public-url https://host]
//                                       [--llm-key-file FILE | AIGW_API_KEY=…] [--llm-base URL] [--llm-model ID]
//                                       [--ffmpeg /path/to/ffmpeg]   (成片拼接 film.export；默认自动探测)
//                                       [--tunnel cloudflared]       (把 /media 只读放到公网，v2v 需要；控制接口不出网)
//                                       [--publish feishu --feishu-token-file FILE --feishu-parent <docx token>]  (v2v reference videos via your own Feishu Drive)
// Contract: docs/backend-api.md
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { createHost } from "../src/host.mjs";
import { createApp } from "../src/api.mjs";
import { createArkAdapter } from "../src/adapters/ark.mjs";
import { createLlmPlanner } from "../src/adapters/llm.mjs";
import { createPublisher } from "../src/publish.mjs";
import { createMediaTunnel } from "../src/tunnel.mjs";

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
const LLM_TIMEOUT = Number(process.env.LLM_TIMEOUT || arg("--llm-timeout", 0)) || 0; // 毫秒；大计划需要更长
const PUBLIC_URL = process.env.DIRECTOR_PUBLIC_URL || arg("--public-url", null); // where Ark can fetch /media/* from (needed for v2v)
const TUNNEL = process.env.DIRECTOR_TUNNEL || arg("--tunnel", null); // "cloudflared": 自动开一条只读 /media 的公网隧道
// media publisher for v2v when the backend is not public: --publish feishu --feishu-token-file FILE [--feishu-parent <docx token>]
const PUBLISH = process.env.DIRECTOR_PUBLISH || arg("--publish", "none");
const FEISHU_TOKEN_FILE = process.env.FEISHU_TOKEN_FILE || arg("--feishu-token-file", null);
const FEISHU_PARENT = process.env.FEISHU_PARENT || arg("--feishu-parent", null);
const FFMPEG = process.env.FFMPEG || arg("--ffmpeg", null); // film.export assembler; auto-detected when omitted
const ARK_MODELS = Object.fromEntries(args.flatMap((a, i) => (a === "--ark-model" && args[i + 1]?.includes("=") ? [args[i + 1].split("=")] : [])));

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const generation = ARK_KEY ? (ctx) => createArkAdapter({ apiKey: ARK_KEY, baseUrl: process.env.ARK_BASE_URL, models: ARK_MODELS, ...ctx }) : null;
const llm = LLM_KEY ? (ctx) => createLlmPlanner({ apiKey: LLM_KEY, baseUrl: LLM_BASE, model: LLM_MODEL, timeoutMs: LLM_TIMEOUT || undefined, ...ctx }) : null;
let publicUrl = PUBLIC_URL; // --tunnel fills this in once cloudflared reports its hostname
const publisher = createPublisher({ kind: PUBLISH, feishuTokenFile: FEISHU_TOKEN_FILE, feishuParentNode: FEISHU_PARENT, log });
const JUDGE_MODEL = process.env.JUDGE_MODEL || arg("--judge-model", null); // 验收用的多模态模型，默认 gemini-3.1-pro-preview
const host = createHost({ projectFile: PROJECT === "none" ? null : PROJECT, mediaDir: MEDIA, demo: DEMO === "none" ? null : DEMO, generation, llm, publicUrl: () => publicUrl, publisher, ffmpeg: FFMPEG, judgeKey: LLM_KEY, judgeBase: LLM_BASE, judgeModel: JUDGE_MODEL, log });
const { server } = createApp(host, { static: STATIC, token: TOKEN, cors: CORS, log });

server.listen(PORT, HOST, () => {
  log(`Director backend ${host.health().service}  http://127.0.0.1:${PORT}/api/health`);
  if (STATIC) log(`console UI          http://127.0.0.1:${PORT}/web/   (static root ${STATIC})`);
  else log(`api-only mode: serve web/ from any static host and point it at this API (window.DIRECTOR_API or ?api=)`);
  log(`project file        ${host.projectFile || "(none — in-memory)"}   media ${host.mediaDir}`);
  const proxy = process.env.VSCODE_PROXY_URI;
  if (proxy) log(`via code-server proxy: ${proxy.replace("{{port}}", String(PORT))}web/`);
  log(`try: node server/bin/director.mjs --remote http://127.0.0.1:${PORT} context.scene`);
  if (publicUrl) log(`public media        ${publicUrl}/media/   (v2v 参考视频从这里取)`);
  else if (!TUNNEL) log(`public media        未开放；v2v 需要 --tunnel cloudflared 或 --public-url URL`);
  if (TUNNEL) startTunnel();
});

// 只把 /media 只读放到公网（控制接口留在 loopback）。失败不影响其它功能，只是 v2v 用不了。
async function startTunnel() {
  if (TUNNEL !== "cloudflared") {
    log(`--tunnel ${TUNNEL} 不认识；目前只支持 cloudflared`);
    return;
  }
  tunnel = createMediaTunnel({ mediaDir: host.mediaDir, bin: process.env.CLOUDFLARED || "cloudflared", log });
  try {
    publicUrl = await tunnel.start();
    log(`public media        ${publicUrl}/media/   (v2v 参考视频从这里取)`);
  } catch (err) {
    tunnel = null;
    log(`media tunnel 启动失败：${err.message}；v2v 仍会返回 NO_PUBLIC_MEDIA_URL，其它功能不受影响`);
  }
}
let tunnel = null;

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    log(`${sig}: saving and shutting down`);
    tunnel?.stop();
    host.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1500).unref();
  });
}
