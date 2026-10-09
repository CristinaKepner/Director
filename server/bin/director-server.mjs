#!/usr/bin/env node
// Director backend: authoritative Director Runtime + HTTP/SSE API (+ optional static hosting of ../web).
//   node server/bin/director-server.mjs [--port 5175] [--host 0.0.0.0] [--project server/data/project.json]
//                                       [--media-dir DIR] [--api-only] [--static DIR] [--token SECRET] [--cors ORIGIN] [--demo city-edge|none]
//                                       [--ark-key-file FILE | ARK_API_KEY=…] [--ark-model seedance-2.5=doubao-seedance-2-5-260628] [--public-url https://host]
//                                       [--llm-key-file FILE | AIGW_API_KEY=…] [--llm-base URL] [--llm-model ID] [--ark-base URL]
//                                       体验网关：两条上游一起指过去 --llm-base https://gw/v1 --ark-base https://gw/ark，密钥换成体验码
//                                       [--mosshub-key-file FILE | MOSSHUB_API_KEY=…] [--mosshub-base URL] (Gemini planning, MiniMax video, Seedream/Gemini image)
//                                       [--ffmpeg /path/to/ffmpeg]   (成片拼接 film.export；默认自动探测)
//                                       [--ytdlp /path/to/yt-dlp] [--tools-dir DIR] [--ytdlp-url URL]  (贴链接下素材；探不到就自动装一份到 tools-dir)
//                                       [--tunnel cloudflared]       (把 /media 只读放到公网，v2v 需要；控制接口不出网)
//                                       [--publish feishu --feishu-token-file FILE --feishu-parent <docx token>]  (v2v reference videos via your own Feishu Drive)
// Contract: docs/backend-api.md
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { createHost } from "../src/host.mjs";
import { createApp } from "../src/api.mjs";
import { createArkAdapter } from "../src/adapters/ark.mjs";
import { createMosshubAdapter } from "../src/adapters/mosshub.mjs";
import { routePlanners, routeGeneration } from "../src/adapters/routing.mjs";
import { discoverCatalog } from "../src/adapters/model-catalog.mjs";
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
// 出片那条上游的地址。以前只认 ARK_BASE_URL 环境变量 —— 而要把客户端指向自己的体验网关，
// 这两条上游必须一起改，少一条就等于把火山密钥仍然发在客户端里。
const ARK_BASE = process.env.ARK_BASE_URL || arg("--ark-base", null);
const LLM_MODEL = process.env.LLM_MODEL || arg("--llm-model", null);
const LLM_TIMEOUT = Number(process.env.LLM_TIMEOUT || arg("--llm-timeout", 0)) || 0; // 毫秒；大计划需要更长
const PUBLIC_URL = process.env.DIRECTOR_PUBLIC_URL || arg("--public-url", null); // where Ark can fetch /media/* from (needed for v2v)
const TUNNEL = process.env.DIRECTOR_TUNNEL || arg("--tunnel", null); // "cloudflared": 自动开一条只读 /media 的公网隧道
// media publisher for v2v when the backend is not public: --publish feishu --feishu-token-file FILE [--feishu-parent <docx token>]
const PUBLISH = process.env.DIRECTOR_PUBLISH || arg("--publish", "none");
const FEISHU_TOKEN_FILE = process.env.FEISHU_TOKEN_FILE || arg("--feishu-token-file", null);
const FEISHU_PARENT = process.env.FEISHU_PARENT || arg("--feishu-parent", null);
const FFMPEG = process.env.FFMPEG || arg("--ffmpeg", null); // film.export assembler; auto-detected when omitted. --ffmpeg none = 当作机器上没有（复现新机器）
const YTDLP = process.env.YT_DLP || arg("--ytdlp", null); // 贴链接用的下载器；不给就自动探测，探不到就自己装一份。--ytdlp none = 当作机器上没有（复现新机器）
const TOOLS = process.env.DIRECTOR_TOOLS_DIR || arg("--tools-dir", null); // 自己装的下载器放哪；默认媒体目录旁边的 tools/
const YTDLP_URL = process.env.YT_DLP_URL || arg("--ytdlp-url", null); // 内网/自建镜像：直接指定下载地址
const ARK_MODELS = Object.fromEntries(args.flatMap((a, i) => (a === "--ark-model" && args[i + 1]?.includes("=") ? [args[i + 1].split("=")] : [])));

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const MOSSHUB_KEY_FILE = arg("--mosshub-key-file", null);
const MOSSHUB_KEY = process.env.MOSSHUB_API_KEY || (MOSSHUB_KEY_FILE && fs.readFileSync(MOSSHUB_KEY_FILE,"utf8").trim());
const MOSSHUB_BASE = process.env.MOSSHUB_BASE_URL || arg("--mosshub-base", "https://api.mosshub.cn/v1");
let mossCatalog = { planning: [], video: [], image: [] };
if (MOSSHUB_KEY) {
  try { mossCatalog = await discoverCatalog({baseUrl:MOSSHUB_BASE,apiKey:MOSSHUB_KEY}); }
  catch (err) { log(`MossHub 模型列表不可用：${err.message}`); }
}
const generation = ARK_KEY || MOSSHUB_KEY ? ctx => routeGeneration([
  ARK_KEY && createArkAdapter({apiKey:ARK_KEY,baseUrl:ARK_BASE,models:ARK_MODELS,...ctx}),
  MOSSHUB_KEY && createMosshubAdapter({apiKey:MOSSHUB_KEY,baseUrl:MOSSHUB_BASE,catalog:mossCatalog,...ctx}),
],ctx.fallback) : null;
const llm = LLM_KEY || mossCatalog.planning.length ? ctx => routePlanners([
  LLM_KEY && createLlmPlanner({apiKey:LLM_KEY,baseUrl:LLM_BASE,model:LLM_MODEL || "gpt-6-astra",timeoutMs:LLM_TIMEOUT || undefined,...ctx}),
  mossCatalog.planning.length && createLlmPlanner({apiKey:MOSSHUB_KEY,baseUrl:MOSSHUB_BASE,models:mossCatalog.planning,model:process.env.MOSSHUB_MODEL || mossCatalog.planning[0],timeoutMs:LLM_TIMEOUT || undefined,...ctx}),
],LLM_MODEL || (LLM_KEY ? "gpt-6-astra" : process.env.MOSSHUB_MODEL)) : null;
let publicUrl = PUBLIC_URL; // --tunnel fills this in once cloudflared reports its hostname
// 隧道要一两分钟才建得起来（实测常要换两三条）。这段时间里界面只会说「v2v 需要公网地址」——
// 看着和「这台机器做不了」一模一样，而其实再等四十秒就好了。所以把「正在建」也当成一种状态报出去。
let tunnelState = TUNNEL ? "starting" : "off";
let tunnelError = null;
const publisher = createPublisher({ kind: PUBLISH, feishuTokenFile: FEISHU_TOKEN_FILE, feishuParentNode: FEISHU_PARENT, log });
const JUDGE_MODEL = process.env.JUDGE_MODEL || arg("--judge-model", null); // 验收用的多模态模型，默认 gemini-3.1-pro-preview
const host = createHost({ projectFile: PROJECT === "none" ? null : PROJECT, mediaDir: MEDIA, demo: DEMO === "none" ? null : DEMO, generation, llm, publicUrl: () => publicUrl, tunnelState: () => tunnelState, tunnelError: () => tunnelError, publisher, ffmpeg: FFMPEG, ytdlp: YTDLP, ytdlpUrl: YTDLP_URL, toolsDir: TOOLS, judgeKey: LLM_KEY, judgeBase: LLM_BASE, judgeModel: JUDGE_MODEL, log });
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
  tunnel = createMediaTunnel({ mediaDir: host.mediaDir, bin: process.env.CLOUDFLARED || null, log });
  try {
    publicUrl = await tunnel.start({ onAttempt: (n) => { tunnelState = `starting:${n}`; host.announceHealth(); } });
    tunnelState = tunnel.verified ? "up" : "unverified";
    log(`public media        ${publicUrl}/media/   (v2v 参考视频从这里取)${tunnel.verified ? "" : "   ⚠️ 未经本机验证"}`);
    // 隧道是后端起来之后几十秒才建好的。页面早就连上了、也早就问过一次 health，
    // 不主动告诉它，界面上的 v2v 会一直灰着 —— 后端却已经能做了。
    host.announceHealth();
  } catch (err) {
    // 失败也要收摊：不 stop 的话 cloudflared 子进程和本地媒体服务会一直挂着，
    // 重启几次就攒出一堆孤儿进程（实测见过跨天还活着的）。
    tunnel?.stop();
    tunnel = null;
    tunnelState = "failed";
    tunnelError = { code: err.code || "TUNNEL_FAILED", message: err.message };
    host.announceHealth();
    log(`media tunnel 启动失败：${err.message}；v2v 仍会返回 NO_PUBLIC_MEDIA_URL，其它功能不受影响`);
    if (err.cloudflared) log(`cloudflared 最后几行：\n${err.cloudflared}`);
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
