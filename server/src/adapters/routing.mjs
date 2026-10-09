// Each upstream retains its own credential and endpoint; keys never cross providers.
export function routePlanners(planners, preferred) {
  const routes = new Map();
  for (const p of planners.filter(Boolean)) for (const m of p.models) routes.set(m, p);
  if (!routes.size) return null;
  const model = routes.has(preferred) ? preferred : routes.keys().next().value;
  return { name: 'routed-llm', model, models: [...routes.keys()], baseUrl: routes.get(model).baseUrl,
    plan(text, ctx = {}) {
      const selected = ctx.model && ctx.model !== 'rules' ? ctx.model : model;
      const p = routes.get(selected);
      if (!p) throw new Error(`PLANNING_MODEL_NOT_AVAILABLE: ${selected}`);
      return p.plan(text, { ...ctx, model: selected });
    },
  };
}
export function routeGeneration(adapters, fallback) {
  const real = adapters.filter(Boolean);
  if (!real.length) return null;
  const find = id => real.find(a => a.supports(id));
  return { name: real.map(a => a.name).join('+'), models: Object.assign({}, ...real.map(a => a.models)),
    supports: id => !!find(id),
    modeReady: (mode, id) => find(id)?.modeReady?.(mode, id),
    submit(job, update) { return (find(job.provider) || fallback).submit(job, update); },
  };
}
