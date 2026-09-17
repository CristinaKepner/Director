import { makeEnv } from "./env.mjs";

export function runEpisode(taskId, policy) {
  const env = makeEnv({ task: taskId });
  env.reset();
  policy(env);
  const r = env.evaluate();
  return { ...r, steps: env.steps, probes: env.probeCount };
}

export function compare(taskId, policies) {
  return Object.entries(policies).map(([name, p]) => ({ name, ...runEpisode(taskId, p) }));
}
