# Director-RL — research environment

An RL environment for **learning spatial editing and repair from executable feedback**:
a VLM policy inspects spatial evidence, makes local edits, reads back what the edit
actually did, and repairs what it broke.

Nothing in `core/`, `server/` or `web/` is modified. This directory only *uses* the
runtime's existing primitives and registers a few research-only Actions of its own.

## Why the runtime already works as an environment

| Need | Runtime primitive |
|---|---|
| action space + legality mask | `capabilities()` → per-Action params and `allowedIn` state permissions |
| step | `dispatch(name, payload, meta)`, with `dryRun` to look before leaping |
| reset / branch | `persistable()` + `loadProjectData()`; `undoToEvent(eventId)` |
| trajectory log | `emitEvent` |
| termination / retry class | `classifyFailure()` |
| parallel envs | `core/store.js` is a module-level singleton, so one worker = one isolated world |

## What this adds

- `env.mjs` — `reset / observe / legalActions / step / snapshot / restore`, plus
  `evaluatedGeometry()` (what the camera *actually* does, per frame, after keyframe
  precedence and preset arithmetic) and `contractCheck()` with **three-valued**
  verdicts: `pass` / `violate` / `unverifiable`.
- `task.mjs` — a task is an initial world, a goal the edit must achieve, and a contract
  it must not break. Goal probes read evaluated state, never the declared payload.
- `reward.mjs` — conjunctive return. `unverifiable` is never a pass, so an unchecked
  requirement cannot buy success.
- `actions.mjs` — research-only Actions. They exist because the shipped action space
  **cannot express the repair** (see below).
- `attribute()` — branch-and-compare credit assignment: from one intermediate state,
  ask of each candidate action what it repairs and what it breaks. Possible only
  because evaluated geometry is observable without generating a frame.
- `vec-env.mjs` — worker-backed parallel environments.
- `evolve.mjs` — gap detection and **gated self-extension**. The environment says where it
  is incomplete: an `unverifiable` verdict is a missing probe, and a state where no action
  repairs a requirement while the goal survives is a missing action. Proposals are admitted
  only against fixtures built by construction that the proposer never sees — because the
  cheapest probe to write is one that always returns `pass`.

## Three measured properties of this environment

Run `npm run research:probe` and `npm run research:attribute`.

1. **A declared-correct edit can violate its contract.** `camera.nudge` is documented as
   a translation holding the look-at target and the lens fixed, and it does exactly
   that — yet the viewing direction rotates `1.689°` across all 144 frames, because
   holding a world point while the camera moves is not holding orientation. Every
   program-state lock passes.
2. **The repair is not expressible at camera level.** `cameraStateAt` derives the aim
   from `shot.targetIds[0] || cam.target` — an *entity* — not from `cam.pose.lookAt`,
   and `camera.look-at` only accepts an entity id. Preserving orientation requires an
   explicit R, so the only repair is to bake per-frame keyframes
   (`research.shot.bake`), which is why that Action exists here.
3. **Goal and constraint can be jointly unsatisfiable.** Sweeping the shipped camera/shot
   actions from a violated state, exactly one repairs the orientation requirement —
   trucking the camera back — and it does so by destroying the goal. Within the shipped
   action space the requested change and the property to preserve cannot both hold
   (`npm run research:coverage`).
4. **A success flag is not evidence that an edit happened.** `shot.update` accepts a
   `motion` payload, returns `ok: true`, and changes nothing: the key is not in its
   schema and unknown keys are dropped silently.

Together these are the argument for execution feedback: none of the three is visible
to a policy that reasons over the program text and trusts the return value.

## Reference policies

`policies.mjs` ships three scripted policies as a floor for any learned one:

| policy | behaviour | reward |
|---|---|---|
| `naivePolicy` | executes the instruction, never checks | −0.27 (orientation violated) |
| `wrongRepairPolicy` | checks, then repairs the wrong thing | −0.55 (two requirements broken) |
| `repairPolicy` | checks, diagnoses, bakes the translated path | **+0.95, success** |

## Commands

```bash
npm run test:research      # environment property tests
npm run test:everything    # runtime + api + research
npm run research:probe     # how far a program-local edit reaches in evaluated geometry
npm run research:attribute # per-action credit assignment from one state
npm run research:coverage  # can any shipped action repair the violation?
npm run research:evolve    # gap detection + admission test for self-proposed probes
```

## Not built yet

No policy training, no LLM/VLM in the loop, no dataset, no reward model. Self-extension is
an admission test, not a synthesis method: degenerate probes are rejected, but nothing here
proposes good ones. The
environment, the contract scoring, the attribution primitive and parallel rollout are
in place; the learning loop is the next piece.
