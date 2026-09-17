// Conjunctive return: the edit must land AND every requirement must verifiably hold.
// "unverifiable" is never a pass -- an unchecked requirement cannot buy success.
export function score(task, goalVerdict, verdicts, { steps = 0, probes = 0 } = {}) {
  const violated = verdicts.filter((v) => v.status === "violate");
  const unverifiable = verdicts.filter((v) => v.status === "unverifiable");
  const allPass = verdicts.every((v) => v.status === "pass");
  const success = goalVerdict.status === "pass" && allPass;
  const cost = steps * (task.costPerStep ?? 0) + probes * (task.costPerProbe ?? 0);
  return {
    success,
    reward: (success ? 1 : 0) - cost - 0.25 * violated.length,
    cost,
    goal: goalVerdict.status,
    violated: violated.map((v) => v.kind),
    unverifiable: unverifiable.map((v) => v.kind),
  };
}
