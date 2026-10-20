import { ASSET_ROLES } from "../../schema.js";

// approved references for the entities that appear in a shot (subject first), capped for the providers
export function referencesForShot(d, shot, limit = 4) {
  const ids = [];
  const cam = d.cameras.find((c) => c.id === shot.cameraId);
  if (cam?.target) ids.push(cam.target);
  for (const t of shot.targetIds || []) ids.push(t);
  for (const e of d.entities)
    if (["character", "vehicle", "weapon", "prop"].includes(e.semanticType))
      ids.push(e.id);
  const seen = new Set();
  const out = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const ent = d.entities.find((e) => e.id === id);
    if (!ent) continue;
    for (const a of (d.assets || []).filter(
      (x) =>
        x.entityId === id &&
        x.approved &&
        x.mediaKind !== "video" &&
        x.mediaKind !== "audio",
    )) {
      out.push({
        assetId: a.id,
        entityId: id,
        name: ent.displayName,
        url: a.url,
        role: a.role || null,
        roleSay: a.role ? ASSET_ROLES[a.role]?.say : null,
        look: ent.continuity?.look || "",
      });
      if (out.length >= limit) return out;
    }
  }
  return out;
}
