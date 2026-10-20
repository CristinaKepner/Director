import { ASSET_ROLES, PROVIDERS, uid } from "../../schema.js";

export function registerCharacterActions({
  register,
  store,
  hooks,
  updateJob,
  simulatedAdapter,
}) {
  const D = () => store.get();
  register("context.character", {
    doc: "角色卡：一个角色（或产品）的身份字段、按用途分组的参考资产、以及它出现在哪些镜头",
    params: { id: "string (entityId；不传就列出全部角色)" },
    undoable: false,
    handler({ id }) {
      const d = D();
      const build = (e) => {
        const mine = (d.assets || []).filter((a) => a.entityId === e.id);
        const byRole = {};
        for (const [r, def] of Object.entries(ASSET_ROLES)) {
          const list = mine.filter((a) => a.role === r);
          if (list.length)
            byRole[r] = {
              zh: def.zh,
              approved: list.filter((a) => a.approved).length,
              total: list.length,
              assets: list.map((a) => ({
                id: a.id,
                url: a.url,
                approved: a.approved,
                label: a.label,
              })),
            };
        }
        const unroled = mine.filter((a) => !a.role);
        return {
          id: e.id,
          name: e.displayName || e.id,
          semanticType: e.semanticType,
          role: e.role || null,
          continuity: e.continuity || {},
          pose: e.pose || null,
          proxy: e.proxy || null,
          assetRef: e.assetRef || null, // 换过 GLB 就在这
          roles: byRole,
          unroled: unroled.length,
          // 卡片完整度：这几面齐了，跨镜头一致性才稳
          missing: (e.semanticType === "character"
            ? ["face", "wardrobe", "voice"]
            : ["prop"]
          ).filter((r) => !byRole[r]?.approved),
          usedByShots: d.shots
            .filter((s) => s.targetIds.includes(e.id))
            .map((s) => s.id),
        };
      };
      if (id) {
        const e = d.entities.find((x) => x.id === id);
        return e
          ? { ok: true, data: build(e) }
          : { ok: false, error: "ENTITY_NOT_FOUND" };
      }
      return {
        ok: true,
        data: d.entities
          .filter((e) =>
            ["character", "vehicle", "prop", "weapon"].includes(e.semanticType),
          )
          .map(build),
      };
    },
  });

  register("generation.reference", {
    doc: "为实体生成参考图（角色定妆照 / 产品图，中性背景、正面全身或整件产品），完成后自动登记为该实体的未批准资产。provider 默认 seedream-5",
    params: {
      entityId: "string",
      provider: "providerId (t2i)",
      prompt: "string (override)",
      view: "front|three-quarter|profile|turntable",
      role: `${Object.keys(ASSET_ROLES).join("|")}（这一张管角色的哪一面，默认 face/prop）`,
      label: "string",
    },
    required: ["entityId"],
    undoable: false,
    validate: ({ entityId, provider = "seedream-5" }, d) =>
      !d.entities.some((e) => e.id === entityId)
        ? { error: "ENTITY_NOT_FOUND" }
        : !PROVIDERS[provider]
          ? { error: "BAD_PROVIDER", allowed: Object.keys(PROVIDERS) }
          : !PROVIDERS[provider].modes.includes("t2i")
            ? {
                error: "MODE_NOT_SUPPORTED",
                provider,
                supported: PROVIDERS[provider].modes,
              }
            : null,
    handler(
      {
        entityId,
        provider = "seedream-5",
        prompt,
        view = "front",
        role,
        label,
      },
      meta,
    ) {
      const d0 = D();
      const e = d0.entities.find((x) => x.id === entityId);
      const isChar = e.semanticType === "character";
      const look = [
        e.continuity?.look,
        e.continuity?.wardrobe,
        e.continuity?.color,
      ]
        .filter(Boolean)
        .join(", ");
      const style =
        d0.project.style ||
        "photoreal, cinematic, high-end commercial photography";
      const useRole = ASSET_ROLES[role] ? role : isChar ? "face" : "prop";
      // 一张图管一件事：要脸就拍头肩、要服装就拍整套 —— 混在一张里模型两头都学不准
      const roleShot =
        {
          face: "tight head-and-shoulders portrait, face fills the frame, neutral expression",
          body: "full body, arms slightly away from the torso, neutral stance",
          wardrobe:
            "full outfit head to toe, garment clearly readable, plain styling",
          prop: "the product alone, centered",
          style: "a mood frame that defines the overall look and grade",
        }[useRole] || "";
      const text =
        prompt ||
        (isChar
          ? `Character ${ASSET_ROLES[useRole]?.en || "reference"} sheet of ${e.displayName}${e.role ? ` (${e.role})` : ""}: ${look || "consistent identity and wardrobe"}. ${roleShot}. ${view === "turntable" ? "Three views side by side: front, three-quarter, profile" : `${view.replace("-", " ")} view`}, neutral seamless grey studio background, soft even lighting, no props, no text. ${style}. The face, hair, wardrobe and proportions must be unambiguous so later shots can match them exactly.`
          : `Product reference photo of ${e.displayName}: ${look || "exact shape, material and color"}. ${view === "turntable" ? "Three angles side by side: front, three-quarter, top" : `${view.replace("-", " ")} view`}, centered on a neutral seamless grey background, soft studio lighting, no people, no text. ${style}. Material, hardware, proportions and color must be unambiguous so later shots can match them exactly.`);
      const job = {
        id: uid("job"),
        kind: "reference",
        role: useRole,
        entityId,
        shotId: null,
        takeId: null,
        mode: "t2i",
        provider,
        model: PROVIDERS[provider].name,
        prompt: text,
        negative: "text, watermark, logo, extra limbs, blurry, low quality",
        promptVersion: 0,
        compiler: "reference/1",
        seconds: 0,
        aspect: view === "turntable" ? "16:9" : isChar ? "3:4" : "1:1",
        inputs: { image: null, video: null, references: [] },
        label:
          label || `${e.displayName} · ${ASSET_ROLES[useRole]?.zh || view}`,
        status: "queued",
        progress: 0,
        result: null,
        source: meta.source || "human",
        createdAt: new Date().toISOString(),
      };
      store.patch((d) => {
        d.jobs.push(job);
        d.project.currentState = "GENERATING";
      });
      (hooks.generation || simulatedAdapter).submit(job, updateJob);
      return {
        ok: true,
        id: job.id,
        entityId,
        role: useRole,
        provider,
        adapter: (hooks.generation || simulatedAdapter).name,
        targetIds: [entityId],
      };
    },
  });
}
