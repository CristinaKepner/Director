// Research-only RL environment wrapper over the Director runtime.
// Nothing here changes runtime behaviour: it only reuses dispatch / persistable /
// loadProjectData / capabilities / canRun and adds reset, branch and contract scoring.
import * as R from "../core/index.js";
import { installResearchActions, cameraAimPoint, cameraPosition } from "./actions.mjs";
import { TASKS, GOALS } from "./task.mjs";
import { score } from "./reward.mjs";

const { dispatch, store, summarize, capabilities, persistable, loadProjectData, cameraStateAt } = R;

export function makeEnv({ demo = "city-edge", task = null } = {}) {
  installResearchActions();
  const T = typeof task === "string" ? TASKS[task] : task;
  if (T) demo = T.demo || demo;
  let t = 0, probes = 0, origin = null;

  const snapshot = () => structuredClone(persistable(store.get()));
  const restore = (snap) => { loadProjectData(structuredClone(snap)); t = 0; };

  function reset() {
    const r = dispatch("scene.demo", { name: demo }, { source: "cli", silent: true });
    if (!r.ok) throw new Error(`reset failed: ${r.error}`);
    t = 0; probes = 0;
    origin = baseline();
    return observe();
  }

  // Action space, already masked by the runtime's own state machine.
  function legalActions() {
    const state = store.get().project.currentState;
    return capabilities()
      .filter((a) => a.allowedIn.includes(state))
      .map(({ name, params, required, undoable }) => ({ name, params, required, undoable }));
  }

  function observe() {
    const d = store.get();
    return { t, state: d.project.currentState, summary: summarize(d), nLegal: legalActions().length };
  }

  // One environment step. dryRun lets a policy look before it leaps.
  function step(name, payload = {}, { dryRun = false } = {}) {
    const res = dispatch(name, payload, { source: "agent", dryRun });
    if (!dryRun && res.ok) t += 1;
    return { ok: res.ok, error: res.error, res, obs: observe() };
  }

  // The "evaluated geometry" layer: what the camera actually does over time,
  // after keyframe precedence, target dependencies and preset arithmetic.
  function evaluatedGeometry({ fps = 24 } = {}) {
    const d = store.get();
    const out = {};
    for (const shot of d.shots) {
      const n = Math.max(1, (shot.range?.outFrame ?? fps) - (shot.range?.inFrame ?? 0));
      out[shot.id] = Array.from({ length: n }, (_, f) => {
        const s = cameraStateAt(d, shot, f);
        return { f, position: s.position, lookAt: s.lookAt, focalLength: s.focalLength, roll: s.roll || 0 };
      });
    }
    return out;
  }

  // Three-valued contract scoring: a requirement we cannot check is never a pass.
  function contractCheck(contract, before, after) {
    return contract.map((req) => {
      const probe = REQUIREMENTS[req.kind];
      if (!probe) return { ...req, status: "unverifiable", why: "no probe for this requirement kind" };
      try { return { ...req, ...probe(req, before, after) }; }
      catch (err) { return { ...req, status: "unverifiable", why: String(err.message || err) }; }
    });
  }

  // Everything a verdict needs, captured at one instant.
  function baseline() {
    if (!T) return { geom: evaluatedGeometry(), camPos: null, right: null };
    const pos = cameraPosition(T.camId), aim = cameraAimPoint(T.camId);
    const f = aim.map((x, i) => x - pos[i]);
    const n = Math.hypot(...f) || 1;
    const fwd = f.map((x) => x / n);
    // camera right = cross(forward, worldUp) with up = [0,1,0] -> [-fz, 0, fx],
    // matching the basis camera.nudge itself uses.
    const r = [-fwd[2], 0, fwd[0]];
    const rn = Math.hypot(...r) || 1;
    return { geom: evaluatedGeometry(), camPos: pos, right: r.map((x) => x / rn) };
  }

  function verdicts(from = origin) {
    const now = baseline();
    const reqs = contractCheck(T.contract, from.geom, now.geom);
    const g = GOALS[T.goal.kind](T.goal, from, now);
    return { reqs, goal: g, now };
  }

  // Reward is only defined for a task-bound env.
  function evaluate() {
    if (!T) throw new Error("env has no task");
    const { reqs, goal } = verdicts();
    return { ...score(T, goal, reqs, { steps: t, probes }), requirements: reqs };
  }

  // Branch-and-compare: what did THIS action improve, and what did it break?
  // Only possible because evaluated geometry is observable without generating anything.
  function attribute(name, payload = {}) {
    const before = snapshot();
    const pre = verdicts();
    const r = step(name, payload);
    const post = verdicts();
    const delta = pre.reqs.map((b, i) => {
      const a = post.reqs[i];
      const rank = { pass: 2, unverifiable: 1, violate: 0 };
      return { kind: b.kind, from: b.status, to: a.status,
               effect: rank[a.status] > rank[b.status] ? "repaired"
                     : rank[a.status] < rank[b.status] ? "broke" : "unchanged" };
    });
    const goalDelta = { from: pre.goal.status, to: post.goal.status };
    restore(before);
    return { ok: r.ok, error: r.error, delta, goalDelta };
  }

  const probe = () => { probes += 1; return verdicts(); };
  const originGeometry = () => origin.geom;

  return { task: T, reset, observe, step, legalActions, snapshot, restore,
           evaluatedGeometry, contractCheck, baseline, verdicts, evaluate, attribute, probe, originGeometry,
           get steps() { return t; }, get probeCount() { return probes; } };
}

const maxAbs = (xs) => xs.reduce((m, x) => Math.max(m, Math.abs(x)), 0);

// Probes operate on evaluated geometry, never on declared JSON fields.
export const REQUIREMENTS = {
  "focal-constant": (req, before, after) => {
    const b = before[req.shotId], a = after[req.shotId];
    if (!b || !a) return { status: "unverifiable", why: "shot absent in one branch" };
    const drift = maxAbs(a.map((s, i) => s.focalLength - b[i].focalLength));
    return { status: drift <= (req.tol ?? 1e-6) ? "pass" : "violate", drift };
  },
  "orientation-constant": (req, before, after) => {
    const b = before[req.shotId], a = after[req.shotId];
    if (!b || !a) return { status: "unverifiable", why: "shot absent in one branch" };
    const ang = a.map((s, i) => {
      const dir = (p) => { const v = [p.lookAt[0] - p.position[0], p.lookAt[1] - p.position[1], p.lookAt[2] - p.position[2]];
        const n = Math.hypot(...v) || 1; return v.map((x) => x / n); };
      const [d0, d1] = [dir(b[i]), dir(s)];
      return Math.acos(Math.max(-1, Math.min(1, d0[0] * d1[0] + d0[1] * d1[1] + d0[2] * d1[2]))) * 180 / Math.PI;
    });
    const worst = maxAbs(ang);
    return { status: worst <= (req.tolDeg ?? 1e-4) ? "pass" : "violate", worstDeg: worst };
  },
  "shot-untouched": (req, before, after) => {
    const b = before[req.shotId], a = after[req.shotId];
    if (!b || !a) return { status: "unverifiable", why: "shot absent in one branch" };
    const d = maxAbs(a.flatMap((s, i) => [...s.position.map((x, k) => x - b[i].position[k]),
                                          s.focalLength - b[i].focalLength]));
    return { status: d <= (req.tol ?? 1e-9) ? "pass" : "violate", drift: d };
  },
};
