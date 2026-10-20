export function needsReview(message) {
  return Object.assign(new Error(message), { review: true });
}
export async function performNode(node, input, s, run) {
  if (node.type === "if")
    return { output: input, branch: await verdict(node, input, s, run) };
  if (node.type === "loop") return repeatRepair(node, input, s, run);
  if (node.type.endsWith("-generate") || node.type === "image-edit")
    return { output: await generate(node, input, s, run) };
  return { output: sourceOutput(node, input, s) };
}
function sourceOutput(node, input, s) {
  if (["image", "video", "audio"].includes(node.type))
    return assetInput(node, input, s);
  if (node.type === "html")
    throw needsReview("HTML 节点仅预览；请先导出图片作为生成输入");
  const text = [...input.text, ...nodeText(node)];
  return { ...input, text };
}
function assetInput(node, input, s) {
  const url =
    node.params.url || s.assets?.find((a) => a.id === node.params.assetId)?.url;
  if (!url) throw needsReview(`${node.id} 缺少媒体，请选择素材`);
  return { ...input, media: [...input.media, { kind: node.type, url }] };
}
async function verdict(node, input, s, run) {
  if (!s.judge) throw needsReview("未连接多模态判断器");
  const result = await s.judge(node, input, s.signal);
  s.signal?.throwIfAborted();
  run.evidence ||= [];
  run.evidence.push({ nodeId: node.id, ...result });
  validateVerdict(result, node.params.threshold);
  return result.conditionSatisfied ? "true" : "false";
}
function validateVerdict(v, threshold) {
  if (!validVerdict(v)) throw needsReview("判断器未返回有效证据");
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1)
    throw needsReview("判断阈值必须在 0–1");
  if (v.confidence < threshold)
    throw needsReview(`判断置信度不足：${v.reason}`);
}
async function generate(node, input, s, run) {
  reserveGeneration(s, run);
  const media = await s.generate(node, input, s.signal);
  s.signal?.throwIfAborted();
  if (!media?.url) throw needsReview("生成结果缺少媒体地址");
  run.candidates ||= [];
  run.candidates.push({ nodeId: node.id, ...media });
  return { text: input.text, media: [media] };
}
async function repeatRepair(node, input, s, run) {
  const max = loopLimit(node.params.maxIterations);
  for (let i = 0; i <= max; i++) {
    if ((await verdict(node, input, s, run)) === "false")
      return { output: input, branch: "false" };
    if (i === max) throw needsReview("循环已达到修复上限，请人工复核");
    input = await generate({ ...node, type: "image-edit" }, input, s, run);
  }
}

function validVerdict(v) {
  return (
    v &&
    typeof v.conditionSatisfied === "boolean" &&
    validConfidence(v.confidence) &&
    typeof v.reason === "string" &&
    Boolean(v.reason)
  );
}
function reserveGeneration(s, run) {
  if (!Number.isInteger(s.maxGenerations) || run.used >= s.maxGenerations)
    throw needsReview("已达到本次生成次数上限");
  if (!s.generate) throw needsReview("未连接生成模型");
  run.used++;
  s.onChange?.(structuredClone(run));
}
function loopLimit(value) {
  if (!Number.isInteger(value) || value < 1 || value > 10)
    throw needsReview("循环上限须为 1–10 次");
  return value;
}

function nodeText(node) {
  return [
    node.params.text || node.params.prompt || "",
    node.params.views || "",
  ].filter(Boolean);
}
function validConfidence(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}
