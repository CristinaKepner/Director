const importSpec = {
  doc: "登记已校验的本地参考媒体；保持待批准，拒绝跨工程写入",
  required: ["projectId", "url", "mediaKind", "requestId"],
  params: {
    projectId: "string",
    url: "string",
    mediaKind: "image|video",
    requestId: "string",
  },
  undoable: true,
};
export function registerAssetImports({ register, store, uid }) {
  register("asset.import", {
    ...importSpec,
    validate: validateImport,
    handler: (p) => saveImport(store, uid, p),
  });
}
function validateImport(p, d) {
  if (p.projectId !== d.project.id) return { error: "PROJECT_CHANGED" };
  if (!/^\/media\/[\w.-]+$/.test(p.url)) return { error: "INVALID_MEDIA_URL" };
  if (!["image", "video"].includes(p.mediaKind))
    return { error: "INVALID_MEDIA_KIND" };
  if (![p.width, p.height, p.bytes].every((n) => Number.isFinite(n) && n > 0))
    return { error: "INVALID_MEDIA_METADATA" };
  return validateDuration(p.seconds);
}
function validateDuration(seconds) {
  if (seconds != null && (!Number.isFinite(seconds) || seconds < 0))
    return { error: "INVALID_MEDIA_DURATION" };
  return null;
}
function saveImport(store, uid, p) {
  const old = store.get().assets.find((a) => a.importId === p.requestId);
  if (old) return { ok: true, asset: old, reused: true };
  const asset = importedAsset(uid("asset"), p);
  store.patch((d) => d.assets.push(asset));
  return { ok: true, id: asset.id, asset, targetIds: [asset.id] };
}
const mediaFields = [
  "url",
  "mediaKind",
  "width",
  "height",
  "bytes",
  "seconds",
  "mime",
  "posterUrl",
];
function importedAsset(id, p) {
  const media = Object.fromEntries(mediaFields.map((key) => [key, p[key]]));
  const label = String(p.label || "参考素材").slice(0, 200);
  const identity = { id, label, kind: "upload", approved: false };
  const audit = { importId: p.requestId, createdAt: new Date().toISOString() };
  return { ...media, ...identity, ...audit };
}
