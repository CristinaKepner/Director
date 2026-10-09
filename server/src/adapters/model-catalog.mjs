// Query the configured gateway; never substitute another provider's static model list.
export function planningModels(data) {
  return [...new Set((data?.data || []).filter(m => typeof m.id === 'string' &&
    (!m.supported_endpoint_types || m.supported_endpoint_types.includes('openai')) &&
    !/image|seedream|embedding|whisper|tts|rerank/i.test(m.id) &&
    !m.supported_endpoint_types?.includes('image-generation') &&
    !m.supported_endpoint_types?.includes('openai-video')).map(m => m.id))];
}
export async function discoverModels({ baseUrl, apiKey, fetchImpl = fetch }) {
  const res = await fetchImpl(`${baseUrl.replace(/\/+$/, '')}/models`, {
    headers: { authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Model catalog HTTP ${res.status}`);
  const models = planningModels(await res.json());
  if (!models.length) throw new Error('No chat models available');
  return models;
}
