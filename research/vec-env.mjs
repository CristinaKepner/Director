import { Worker } from "node:worker_threads";
import { fileURLToPath } from "node:url";

const WORKER = fileURLToPath(new URL("./worker.mjs", import.meta.url));

export function makeVecEnv({ n = 4, task }) {
  let seq = 0;
  const pending = new Map();
  const workers = Array.from({ length: n }, () => {
    const w = new Worker(WORKER, { workerData: { task } });
    w.on("message", (m) => { const p = pending.get(m.id); pending.delete(m.id);
      m.ok ? p.resolve(m.data) : p.reject(new Error(m.error)); });
    w.on("error", (e) => { for (const p of pending.values()) p.reject(e); pending.clear(); });
    return w;
  });

  const call = (w, cmd, args) => new Promise((resolve, reject) => {
    const id = ++seq; pending.set(id, { resolve, reject }); w.postMessage({ id, cmd, args });
  });

  const all = (cmd, argsPer = () => []) => Promise.all(workers.map((w, i) => call(w, cmd, argsPer(i))));

  return {
    size: n,
    reset: () => all("reset"),
    // actions: [[name, payload], ...] one per env
    step: (actions) => all("step", (i) => actions[i]),
    evaluate: () => all("evaluate"),
    probe: () => all("probe"),
    close: () => Promise.all(workers.map((w) => w.terminate())),
  };
}
