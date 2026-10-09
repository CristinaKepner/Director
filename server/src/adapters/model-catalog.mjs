// Authorization determines availability; modality determines which selector and endpoint to use.
export function classifyModels(data) {
  const result = { planning: [], video: [], image: [] };
  for (const m of data?.data || []) {
    if (typeof m.id !== 'string' || !m.id.trim()) continue;
    const types = m.supported_endpoint_types || [];
    const kind = types.includes('openai-video') || /^MiniMax-H3(?:-Max)?$/.test(m.id) ? 'video'
      : types.includes('image-generation') || /image|seedream/i.test(m.id) ? 'image'
      : types.length === 0 || types.includes('openai') ? 'planning' : null;
    if (kind && !result[kind].includes(m.id)) result[kind].push(m.id);
  }
  return result;
}
export const planningModels = data => classifyModels(data).planning;
export async function discoverCatalog({ baseUrl, apiKey, fetchImpl = fetch }) {
  const res = await fetchImpl(`${baseUrl.replace(/\/+$/, '')}/models`, {
    headers: { authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Model catalog HTTP ${res.status}`);
  const catalog = classifyModels(await res.json());
  if (!Object.values(catalog).some(ids => ids.length)) throw new Error('No models available');
  return catalog;
}
export async function discoverModels(opts) { return (await discoverCatalog(opts)).planning; }
