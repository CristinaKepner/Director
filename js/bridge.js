// Browser side of the Agent bridge: the dev server relays Action requests from the CLI / external agents
// (POST /api/invoke) to this page over SSE; the page executes them through the same dispatch() and posts the result back.
import { store } from "./store.js";
import { dispatch } from "./actions.js";

let es = null, retry = 1000, base = "";

function apiUrl(path) {
  // relative to the page so it survives path-prefix proxies (code-server /proxy/<port>/)
  return new URL(`${base}api/${path}`, document.baseURI).toString();
}

export function connectBridge() {
  base = "";
  open();
}

function setStatus(s) {
  store.light((d) => (d.health.bridge = s));
  if (s === "online" || s === "offline") store.patch(() => {}, null, { bridge: s });
}

function open() {
  try {
    es = new EventSource(apiUrl("bridge/events"));
  } catch (err) {
    setStatus("offline");
    return;
  }
  es.onopen = () => {
    retry = 1000;
    setStatus("online");
  };
  es.onerror = () => {
    es.close();
    setStatus("offline");
    setTimeout(open, Math.min(retry *= 1.6, 15000));
  };
  es.addEventListener("invoke", async (ev) => {
    let msg;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      return;
    }
    const result = await execute(msg);
    try {
      await fetch(apiUrl("bridge/result"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: msg.id, result }) });
    } catch (err) {
      console.warn("bridge result post failed", err);
    }
  });
}

async function execute(msg) {
  const meta = { source: msg.meta?.source || "bridge", actorId: msg.meta?.actorId || msg.meta?.actor || "remote-agent", dryRun: !!msg.meta?.dryRun, idempotencyKey: msg.meta?.idempotencyKey };
  if (Array.isArray(msg.batch)) return { ok: true, results: msg.batch.map((b) => strip(dispatch(b.action, b.payload || {}, { ...meta, ...(b.meta || {}) }))) };
  if (msg.action === "capture.frame") {
    const cap = (await import("./actions.js")).getHooks().capture;
    return cap ? { ok: true, dataUrl: await cap() } : { ok: false, error: "NO_CAPTURE" };
  }
  return strip(dispatch(msg.action, msg.payload || {}, meta));
}

// Blob URLs are meaningless outside this page; keep payloads JSON-safe and compact.
function strip(r) {
  try {
    return JSON.parse(JSON.stringify(r, (k, v) => (typeof v === "string" && v.startsWith("blob:") ? "[blob in browser]" : typeof v === "string" && v.startsWith("data:image") && v.length > 200 ? "[dataURL]" : v)));
  } catch {
    return { ok: !!r?.ok, error: r?.error, note: "unserializable result" };
  }
}
