// Query the configured gateway; never substitute another provider's static model list.
export function planningModels(data) {
  return [...new Set((data?.data || []).filter(m => typeof m.id === 'string' && m.id.trim()).map(m => m.id))];
}
export async function discoverModels({ baseUrl, apiKey, fetchImpl = fetch }) {
  const res = await fetchImpl(`${baseUrl.replace(/\/+$/, '')}/models`, {
    headers: { authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Model catalog HTTP ${res.status}`);
  const models = planningModels(await res.json());
  if (!models.length) throw new Error('No models available');
  return models;
}
