// One env per worker. core/store.js is a module-level singleton, so worker isolation
// is free: each thread gets its own module instance and therefore its own world.
import { parentPort, workerData } from "node:worker_threads";
import { makeEnv } from "./env.mjs";

const env = makeEnv({ task: workerData.task });
const ok = (id, data) => parentPort.postMessage({ id, ok: true, data });

parentPort.on("message", ({ id, cmd, args = [] }) => {
  try {
    switch (cmd) {
      case "reset":     return ok(id, env.reset());
      case "step":      { const r = env.step(args[0], args[1]); return ok(id, { ok: r.ok, error: r.error, obs: r.obs }); }
      case "evaluate":  return ok(id, env.evaluate());
      case "attribute": return ok(id, env.attribute(args[0], args[1]));
      case "probe":     { const p = env.probe(); return ok(id, { reqs: p.reqs, goal: p.goal }); }
      default: throw new Error(`unknown cmd ${cmd}`);
    }
  } catch (err) { parentPort.postMessage({ id, ok: false, error: String(err.message || err) }); }
});
