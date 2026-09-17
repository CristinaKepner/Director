// A task = an initial world, a goal the edit must achieve, and a contract it must not break.
export const TASKS = {
  "truck-preserve-orientation": {
    id: "truck-preserve-orientation",
    demo: "city-edge",
    camId: "cam_program",
    shotId: "shot_01",
    instruction: "Truck the program camera 0.15 m to frame right. Keep the lens, keep the viewing direction, and do not touch any other shot.",
    goal: { kind: "lateral-translation", camId: "cam_program", meters: 0.15, axis: "right", tol: 1e-3 },
    contract: [
      { kind: "orientation-constant", shotId: "shot_01", tolDeg: 0.05 },
      { kind: "focal-constant", shotId: "shot_01", tol: 1e-6 },
      { kind: "shot-untouched", shotId: "shot_02", tol: 1e-9 },
    ],
    maxSteps: 8,
    costPerStep: 0.02,
    costPerProbe: 0.01,
  },
};

// Goal probes read evaluated state, never the declared payload.
export const GOALS = {
  // Signed along the camera's own right vector: moving the right distance the WRONG way
  // is a violation, not a pass. A magnitude-only check is gameable.
  "lateral-translation": (goal, before, after) => {
    const d = [0, 1, 2].map((i) => after.camPos[i] - before.camPos[i]);
    const sign = goal.axis === "left" ? -1 : 1;
    const along = sign * (d[0] * before.right[0] + d[1] * before.right[1] + d[2] * before.right[2]);
    const lateral = Math.hypot(...d);
    const horizontal = Math.abs(d[1]) < 1e-6;
    const onAxis = Math.abs(along - lateral) < 1e-6;       // no off-axis drift
    return {
      status: horizontal && onAxis && Math.abs(along - goal.meters) <= goal.tol ? "pass" : "violate",
      along, lateral, horizontal,
    };
  },
};
