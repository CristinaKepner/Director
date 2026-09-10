// Engine-agnostic Director Schema: presets, semantic proxy tables, state machine and shared helpers.
// Nothing in this file may import Three.js. It is the Source of Truth vocabulary shared by UI, CLI and Agent.

export const STATE_MACHINE = ["EDIT", "BLOCKING", "REHEARSAL", "ARMED", "RECORDING", "REVIEW", "GENERATING", "APPROVED"];

// Which actions each director state accepts. "*" = everything, "!x" = deny prefix.
export const STATE_RULES = {
  EDIT: { allow: ["*"] },
  BLOCKING: { allow: ["*"] },
  REHEARSAL: { allow: ["*"], deny: ["entity.delete", "scene.create", "shot.delete", "project.load"] },
  ARMED: { allow: ["take.", "camera.", "shot.select", "shot.preview", "timeline.", "context.", "health.", "project.set-state", "project.undo", "project.redo"] },
  RECORDING: { allow: ["take.stop", "take.finish", "context.", "health.", "timeline.seek", "project.set-state"] },
  REVIEW: { allow: ["*"] },
  GENERATING: { allow: ["*"], deny: ["take.record", "shot.delete", "entity.delete", "project.load"] },
  APPROVED: { allow: ["context.", "health.", "storyboard.export", "project.", "review.", "annotation.", "shot.select", "camera.pilot", "timeline.", "take.review", "generation.status"] },
};

export const FIDELITY = {
  blockout: { label: "白模语义", note: "圆柱=人 · 长盒=车 · 小锥=枪。几何只负责身份、站位、遮挡与轴线；预算留给 T2V / V2V。" },
  stylized: { label: "形态可读", note: "车分车头/座舱/轮子，人物有可动关节，楼有发光窗，灯光分主光/霓虹/practical。" },
};

// Semantic type -> default proxy. The proxy is what the blockout fidelity draws; the stylized builder may add detail.
export const SEMANTIC_PROXY = {
  character: { geometry: "cylinder", dimensions: [0.55, 1.75, 0.4], color: "#c9b79b", label: "人 = 直立圆柱" },
  vehicle: { geometry: "box", dimensions: [1.9, 1.2, 4.4], color: "#3d6d93", label: "车 = 长盒" },
  prop: { geometry: "box", dimensions: [0.6, 0.6, 0.6], color: "#8a7a5a", label: "道具 = 小盒" },
  weapon: { geometry: "cone", dimensions: [0.14, 0.3, 0.08], color: "#6a655c", label: "枪 = 小锥" },
  building: { geometry: "box", dimensions: [8, 16, 8], color: "#5e6066", label: "建筑 = 高盒" },
  tree: { geometry: "cylinder", dimensions: [1.4, 4.5, 1.4], color: "#3f5d3a", label: "树 = 圆柱" },
  flower: { geometry: "sphere", dimensions: [0.4, 0.4, 0.4], color: "#8a4d6d", label: "花 = 小球" },
  lamp: { geometry: "cylinder", dimensions: [0.14, 5.5, 0.14], color: "#c9b27a", label: "路灯 = 细柱" },
  environment: { geometry: "plane", dimensions: [40, 0.02, 40], color: "#1b1e24", label: "环境 = 平面" },
  smoke: { geometry: "sphere", dimensions: [2, 1, 2], color: "#8d8d8d", label: "烟雾 = 半透明球" },
};

export const SEMANTIC_TYPES = Object.keys(SEMANTIC_PROXY);

// Shot sizes (景别). distance factor is multiplied by subject height to place the camera.
export const SHOT_SIZES = {
  ECU: { zh: "极特写", en: "extreme close-up", distance: 0.72, height: 0.92, focal: 85, aim: 0.9 },
  CU: { zh: "特写", en: "close-up", distance: 1.1, height: 0.9, focal: 65, aim: 0.86 },
  MCU: { zh: "中近景", en: "medium close-up", distance: 1.3, height: 0.82, focal: 50, aim: 0.78 },
  MS: { zh: "中景", en: "medium shot", distance: 2.9, height: 0.7, focal: 35, aim: 0.66 },
  MLS: { zh: "中全景", en: "medium long shot", distance: 1.8, height: 0.6, focal: 28, aim: 0.55 },
  WS: { zh: "全景", en: "wide shot", distance: 3.0, height: 0.55, focal: 24, aim: 0.5 },
  ELS: { zh: "大远景", en: "extreme long shot", distance: 5.8, height: 0.7, focal: 18, aim: 0.5 },
};

// Coverage angles relative to subject facing (yaw offset in degrees) and height factor.
export const COVERAGE_ANGLES = {
  front: { yaw: 0, height: 0.85, zh: "正面" },
  front_left: { yaw: -40, height: 0.85, zh: "前左 3/4" },
  front_right: { yaw: 40, height: 0.85, zh: "前右 3/4" },
  profile_left: { yaw: -90, height: 0.8, zh: "左侧面" },
  profile_right: { yaw: 90, height: 0.8, zh: "右侧面" },
  rear_left: { yaw: -140, height: 0.85, zh: "后左" },
  rear_right: { yaw: 140, height: 0.85, zh: "后右" },
  back: { yaw: 180, height: 0.9, zh: "背面" },
  low: { yaw: 25, height: 0.15, zh: "低机位" },
  overhead: { yaw: 0, height: 3.5, zh: "俯拍" },
};

export const CAMERA_RIGS = ["free", "handheld", "dolly", "rail", "crane", "jib", "follow", "orbit", "drone", "steadicam"];

// Motion presets (运镜). Each has a human label, a rig, and default parameters.
export const MOTION_TYPES = {
  static: { zh: "固定机位", en: "locked-off static shot, subtle breathing only", rig: "free" },
  "dolly-in": { zh: "推镜", en: "slow dolly in toward the subject", rig: "dolly", params: { amount: 0.55 } },
  "dolly-out": { zh: "拉镜", en: "dolly out revealing context", rig: "dolly", params: { amount: 0.6 } },
  truck: { zh: "横移", en: "lateral truck move keeping the subject framed", rig: "rail", params: { distance: 3 } },
  pedestal: { zh: "升降", en: "vertical pedestal move", rig: "jib", params: { distance: 1.5 } },
  pan: { zh: "摇镜", en: "pan across the scene from a fixed position", rig: "free", params: { degrees: 45 } },
  orbit: { zh: "环绕", en: "smooth orbit around the subject", rig: "orbit", params: { degrees: 150 } },
  chase: { zh: "跟拍", en: "low chase following the subject at constant distance", rig: "follow", params: { offset: [1.4, 0.4, -4.2] } },
  crane: { zh: "摇臂升起", en: "crane up revealing the skyline", rig: "crane", params: { rise: 8 } },
  handheld: { zh: "手持", en: "handheld with organic micro-shake", rig: "handheld", params: { shake: 0.03 } },
  "dolly-zoom": { zh: "滑动变焦", en: "dolly zoom (vertigo) keeping subject size constant", rig: "dolly", params: { amount: 0.5 } },
  "push-in": { zh: "缓推 + 微变焦", en: "gentle push-in with slight focal tightening", rig: "steadicam", params: { amount: 0.35 } },
  drone: { zh: "航拍掠过", en: "drone fly-over descending toward the subject", rig: "drone", params: { height: 14 } },
};

export const MOTION_TYPE_LIST = Object.keys(MOTION_TYPES);

// Character poses -> joint targets (radians). Joints not listed keep previous values.
export const POSES = {
  idle: { headYaw: 0, headPitch: 0, spine: 0, lShoulder: 0.15, rShoulder: -0.15, lElbow: 0.2, rElbow: 0.2, lHip: 0, rHip: 0, lKnee: 0, rKnee: 0 },
  walk: { lShoulder: 0.5, rShoulder: -0.5, lElbow: 0.4, rElbow: 0.4, lHip: 0.5, rHip: -0.5, lKnee: 0.2, rKnee: 0.6, spine: 0.05 },
  run: { lShoulder: 1.0, rShoulder: -1.0, lElbow: 1.4, rElbow: 1.4, lHip: 0.9, rHip: -0.9, lKnee: 0.4, rKnee: 1.2, spine: 0.25 },
  drive: { lShoulder: 1.1, rShoulder: 1.0, lElbow: 0.6, rElbow: 0.6, lHip: 1.45, rHip: 1.45, lKnee: 1.2, rKnee: 1.2, headYaw: 0.1, spine: 0.1 },
  sit: { lHip: 1.5, rHip: 1.5, lKnee: 1.5, rKnee: 1.5, lShoulder: 0.3, rShoulder: 0.3, lElbow: 0.9, rElbow: 0.9 },
  aim: { lShoulder: 1.2, rShoulder: 1.5, lElbow: 0.5, rElbow: 0.1, headYaw: -0.25, headPitch: 0.1, spine: 0.05 },
  crouch: { lHip: 1.2, rHip: 1.2, lKnee: 1.9, rKnee: 1.9, spine: 0.45, lShoulder: 0.5, rShoulder: 0.5, lElbow: 1.0, rElbow: 1.0 },
  wave: { rShoulder: 2.6, rElbow: 0.6, lShoulder: 0.15, headYaw: 0.2 },
  point: { rShoulder: 1.5, rElbow: 0.05, headYaw: -0.15 },
  fall: { spine: 1.2, lShoulder: 2.4, rShoulder: 2.4, lHip: -0.3, rHip: -0.3 },
};

export const JOINT_NAMES = ["headYaw", "headPitch", "spine", "lShoulder", "rShoulder", "lElbow", "rElbow", "lHip", "rHip", "lKnee", "rKnee"];
export const JOINT_LIMITS = { headYaw: [-1.3, 1.3], headPitch: [-0.8, 0.8], spine: [-0.5, 1.4], lShoulder: [-1, 3], rShoulder: [-1, 3], lElbow: [0, 2.5], rElbow: [0, 2.5], lHip: [-0.8, 2], rHip: [-0.8, 2], lKnee: [0, 2.2], rKnee: [0, 2.2] };

export const LIGHT_TYPES = ["directional", "spot", "point", "area", "hemisphere"];

// Cinematic lighting presets. `lights` are created relative to the world origin; env patches the scene environment.
export const LIGHT_PRESETS = {
  // ---- 合并自 handoff/studio 的影棚布光（角度按围绕主体的方位换算成位置，半径 5 m）----
  "softbox-studio": {
    zh: "柔光影棚", en: "soft studio light, large softbox key, gentle fill, clean white cyclorama",
    env: { bg: "#0e0f12", fog: 0.004, ambient: 0.32, sky: "#ffffff", ground: "#3a3a3a", exposure: 1.1, wet: false },
    lights: [
      { id: "sb_key", name: "主光 Softbox", type: "area", color: "#fff6e8", intensity: 9, position: [2.9, 4.2, 4.1], width: 2.6, height: 1.8, group: "key", castShadow: true },
      { id: "sb_fill", name: "补光", type: "area", color: "#e8f0ff", intensity: 4, position: [-4.1, 2.6, 2.9], width: 2.4, height: 1.6, group: "fill" },
      { id: "sb_rim", name: "轮廓光", type: "spot", color: "#ffffff", intensity: 6, position: [2.5, 3.4, -4.3], group: "rim" },
    ],
  },
  "hard-side": {
    zh: "单侧硬光", en: "single hard side light, deep shadows, minimal bounce",
    env: { bg: "#08090b", fog: 0.003, ambient: 0.08, sky: "#cfd8e8", ground: "#1a1a1a", exposure: 1.0, wet: false },
    lights: [
      { id: "hs_key", name: "硬光", type: "spot", color: "#ffffff", intensity: 16, position: [4.7, 4.5, 1.7], angle: 0.5, penumbra: 0.05, group: "key", castShadow: true },
      { id: "hs_bounce", name: "反射补光", type: "area", color: "#cfd8e8", intensity: 1.6, position: [-4.9, 1.8, -0.9], width: 2, height: 1.4, group: "fill" },
    ],
  },
  "noon-daylight": {
    zh: "正午日光", en: "hard overhead noon sunlight, bright sky fill, crisp shadows",
    env: { bg: "#9fc4e8", fog: 0.002, ambient: 0.55, sky: "#dff1ff", ground: "#8a8f96", exposure: 1.0, wet: false },
    lights: [
      { id: "noon_sun", name: "太阳", type: "directional", color: "#fff8ea", intensity: 2.8, position: [3, 14, 2], group: "key", castShadow: true },
      { id: "noon_sky", name: "天光", type: "hemisphere", color: "#dff1ff", intensity: 0.7, position: [0, 20, 0], group: "fill" },
    ],
  },
  "night-neon": {
    zh: "夜景霓虹", en: "night city neon, wet asphalt reflections",
    env: { bg: "#07080d", fog: 0.028, ambient: 0.12, sky: "#26304a", ground: "#150c0c", exposure: 1.3, wet: true },
    lights: [
      { id: "moon", name: "月光 Key", type: "directional", color: "#9bb7ff", intensity: 0.7, position: [-8, 18, -6], group: "key", castShadow: true },
      { id: "neon_magenta", name: "品红霓虹", type: "area", color: "#ff315a", intensity: 14, position: [-7, 4.2, 4], width: 3, height: 1.2, group: "neon" },
      { id: "neon_cyan", name: "青色霓虹", type: "area", color: "#3cf0ff", intensity: 11, position: [7, 3.6, -2], width: 3, height: 1.2, group: "neon" },
      { id: "fill_top", name: "顶部冷补光", type: "hemisphere", color: "#3a4c74", intensity: 0.5, position: [0, 20, 0], group: "fill" },
    ],
  },
  sunset: {
    zh: "日落逆光", en: "golden hour backlight, long warm shadows",
    env: { bg: "#3a2338", fog: 0.012, ambient: 0.35, sky: "#f3a56b", ground: "#2b1b25", exposure: 1.15, wet: false },
    lights: [
      { id: "sun", name: "低角度太阳", type: "directional", color: "#ffb36b", intensity: 3.2, position: [-24, 6, -30], group: "key", castShadow: true },
      { id: "sky_fill", name: "天光补光", type: "hemisphere", color: "#8fa8ff", intensity: 0.8, position: [0, 20, 0], group: "fill" },
      { id: "rim_warm", name: "暖轮廓", type: "spot", color: "#ffd2a0", intensity: 6, position: [6, 5, -10], target: [0, 1, 0], angle: 0.6, group: "rim" },
    ],
  },
  "cold-studio": {
    zh: "冷白棚拍", en: "cold white studio, soft even light",
    env: { bg: "#1c1f26", fog: 0.0, ambient: 0.6, sky: "#dfe6ff", ground: "#5c6070", exposure: 1.0, wet: false },
    lights: [
      { id: "key_soft", name: "柔光 Key", type: "area", color: "#eef3ff", intensity: 18, position: [-4, 5, 5], width: 4, height: 3, group: "key" },
      { id: "fill_soft", name: "柔光 Fill", type: "area", color: "#dfe8ff", intensity: 9, position: [5, 3.5, 4], width: 4, height: 3, group: "fill" },
      { id: "top", name: "顶光", type: "spot", color: "#ffffff", intensity: 5, position: [0, 9, 0], target: [0, 0, 0], angle: 0.8, group: "top", castShadow: true },
    ],
  },
  silhouette: {
    zh: "逆光剪影", en: "hard backlight silhouette, minimal fill",
    env: { bg: "#0a0b10", fog: 0.03, ambient: 0.05, sky: "#1a2038", ground: "#05050a", exposure: 1.2, wet: true },
    lights: [
      { id: "back_hard", name: "硬逆光", type: "spot", color: "#ffe9c4", intensity: 24, position: [0, 4, -14], target: [0, 1, 0], angle: 0.45, group: "rim", castShadow: true },
      { id: "kick", name: "蓝色 kicker", type: "point", color: "#3060ff", intensity: 3, position: [6, 1.2, -4], group: "kicker" },
    ],
  },
  "three-point": {
    zh: "经典三点光", en: "classic three-point lighting",
    env: { bg: "#101218", fog: 0.004, ambient: 0.25, sky: "#7b86a8", ground: "#2a2622", exposure: 1.05, wet: false },
    lights: [
      { id: "key", name: "Key 45°", type: "spot", color: "#fff1dc", intensity: 12, position: [-4, 4.5, 4], target: [0, 1.2, 0], angle: 0.6, group: "key", castShadow: true },
      { id: "fill", name: "Fill", type: "area", color: "#cfd9ff", intensity: 6, position: [5, 2.5, 4], width: 3, height: 2, group: "fill" },
      { id: "rim", name: "Rim", type: "spot", color: "#ffffff", intensity: 9, position: [2, 4, -5], target: [0, 1.2, 0], angle: 0.5, group: "rim" },
    ],
  },
  moonlight: {
    zh: "月夜冷光", en: "cold moonlight, deep blue shadows",
    env: { bg: "#050810", fog: 0.02, ambient: 0.1, sky: "#26365e", ground: "#0a0c14", exposure: 1.25, wet: false },
    lights: [
      { id: "moon", name: "月光", type: "directional", color: "#a9c2ff", intensity: 1.4, position: [-10, 20, -8], group: "key", castShadow: true },
      { id: "sky", name: "夜空", type: "hemisphere", color: "#2a3a66", intensity: 0.6, position: [0, 20, 0], group: "fill" },
    ],
  },
  noir: {
    zh: "黑色电影", en: "film noir venetian-blind hard light, high contrast",
    env: { bg: "#050505", fog: 0.008, ambient: 0.06, sky: "#303030", ground: "#050505", exposure: 1.1, wet: false },
    lights: [
      { id: "noir_key", name: "硬 Key", type: "spot", color: "#f5f0e6", intensity: 20, position: [-5, 6, 2], target: [0, 1.4, 0], angle: 0.35, group: "key", castShadow: true },
      { id: "noir_rim", name: "冷 Rim", type: "spot", color: "#b6c8ff", intensity: 5, position: [4, 3, -6], target: [0, 1.2, 0], angle: 0.5, group: "rim" },
    ],
  },
  daylight: {
    zh: "正午日光", en: "overcast to hard noon daylight",
    env: { bg: "#8fb3d9", fog: 0.003, ambient: 0.7, sky: "#cfe3ff", ground: "#6d6a5a", exposure: 0.95, wet: false },
    lights: [
      { id: "sun", name: "太阳", type: "directional", color: "#fff6e0", intensity: 3.5, position: [10, 30, 8], group: "key", castShadow: true },
      { id: "sky", name: "天光", type: "hemisphere", color: "#cfe3ff", intensity: 1.0, position: [0, 20, 0], group: "fill" },
    ],
  },
};

export const ENV_PRESETS = Object.fromEntries(Object.entries(LIGHT_PRESETS).map(([k, v]) => [k, v.env]));

// 19 档画幅（合并自 handoff/studio，与原站菜单顺序一致）
export const ASPECTS = { "16:9": 16 / 9, "9:16": 9 / 16, "4:3": 4 / 3, "3:4": 3 / 4, "1:1": 1, "3:2": 3 / 2, "2:3": 2 / 3, "4:5": 4 / 5, "9:19.5": 9 / 19.5, "9:21": 9 / 21, "1.33:1": 1.33, "1.37:1": 1.37, "1.43:1": 1.43, "1.66:1": 1.66, "1.85:1": 1.85, "2.00:1": 2, "2.20:1": 2.2, "2.35:1": 2.35, "2.39:1": 2.39 };

// glTF 模型库（合并自 handoff/studio 的 public/models，随前端 vendor 分发）：entity.create {model} / entity.replace-proxy {model}
export const MODEL_LIBRARY = {
  person: { name: "人物", zh: "人物", url: "models/Person.glb", type: "character", dims: [0.6, 1.75, 0.4], tags: ["person", "人", "人物", "演员"] },
  humanoid: { name: "人形", zh: "人形", url: "models/Humanoid.glb", type: "character", dims: [0.6, 1.75, 0.4], tags: ["humanoid", "人形"] },
  character: { name: "角色", zh: "角色", url: "models/Character.glb", type: "character", dims: [0.6, 1.7, 0.4], tags: ["character", "角色"] },
  robot: { name: "机器人", zh: "机器人", url: "models/Robot.glb", type: "character", dims: [0.8, 1.8, 0.6], tags: ["robot", "机器人"] },
  tree: { name: "树", zh: "树", url: "models/Tree.glb", type: "environment", dims: [3, 5, 3], tags: ["tree", "树", "植物"] },
  bush: { name: "灌木", zh: "灌木", url: "models/Bush.glb", type: "environment", dims: [1.2, 1, 1.2], tags: ["bush", "灌木", "绿植", "盆栽"] },
  rock: { name: "岩石", zh: "岩石", url: "models/Rock.glb", type: "environment", dims: [1.2, 0.8, 1], tags: ["rock", "岩石", "石头"] },
  house: { name: "房子", zh: "房子", url: "models/House.glb", type: "building", dims: [8, 6, 8], tags: ["house", "房子", "屋"] },
  fence: { name: "围栏", zh: "围栏", url: "models/Fence.glb", type: "environment", dims: [2, 1, 0.2], tags: ["fence", "围栏", "栅栏"] },
  box: { name: "木箱", zh: "木箱", url: "models/Box.glb", type: "prop", dims: [1, 1, 1], tags: ["box", "crate", "木箱", "箱子"] },
  chair: { name: "椅子", zh: "椅子", url: "models/Chair.glb", type: "prop", dims: [0.6, 0.9, 0.6], tags: ["chair", "椅子"] },
  table: { name: "桌子", zh: "桌子", url: "models/Table.glb", type: "prop", dims: [1.6, 0.75, 0.8], tags: ["table", "桌子"] },
  sofa: { name: "沙发", zh: "沙发", url: "models/Sofa.glb", type: "prop", dims: [2, 0.8, 0.9], tags: ["sofa", "沙发"] },
};

// 摄影棚房间（合并自 studio 的 buildRoom）：scene.room {width, depth, height, pattern, spacing, walls, cyc}
export const ROOM_PATTERNS = ["standard", "plain", "calibration"];

export const PROVIDERS = {
  "minimax-h3": { name: "MiniMax Hailuo 03", modes: ["t2v", "i2v", "v2v"], maxSeconds: 10 },
  "seedance-2.5": { name: "Seedance 2.5 (Ark)", modes: ["t2v", "i2v", "v2v"], maxSeconds: 12 },
  "seedance-2": { name: "Seedance 2.0 (Ark)", modes: ["t2v", "i2v", "v2v"], maxSeconds: 12 },
  "seedream-5": { name: "Seedream 5.0 (Ark)", modes: ["t2i", "i2i"], maxSeconds: 0 },
  "kling-2.5": { name: "Kling 2.5", modes: ["t2v", "i2v"], maxSeconds: 10 },
  "veo-3": { name: "Veo 3", modes: ["t2v", "i2v"], maxSeconds: 8 },
  "runway-gen4": { name: "Runway Gen-4", modes: ["i2v", "v2v"], maxSeconds: 10 },
  "higgsfield": { name: "Higgsfield", modes: ["i2v", "v2v"], maxSeconds: 8 },
  "flux-kontext": { name: "FLUX Kontext", modes: ["t2i", "i2i"], maxSeconds: 0 },
  "gpt-image": { name: "GPT Image", modes: ["t2i", "i2i"], maxSeconds: 0 },
};

export const GEN_MODES = { t2i: "文生图", i2i: "图生图", t2v: "文生视频", i2v: "图生视频", v2v: "视频生视频" };

export function uid(prefix) {
  return `${prefix}_${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 6)}`;
}

export function transform(position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
  return { position: [...position], rotation: [...rotation], scale: [...scale] };
}

export function focalToFov(mm, sensorWidth = 36) {
  return (2 * Math.atan(sensorWidth / (2 * mm)) * 180) / Math.PI;
}

export function fovToFocal(fov, sensorWidth = 36) {
  return sensorWidth / (2 * Math.tan((fov * Math.PI) / 360));
}

export function inferShotSize(mm, distance = 3) {
  // Horizontal field width at subject distance; compare to a 1.75m human.
  const width = 2 * distance * Math.tan((focalToFov(mm) * Math.PI) / 360);
  if (width < 0.35) return "ECU";
  if (width < 0.7) return "CU";
  if (width < 1.2) return "MCU";
  if (width < 2.4) return "MS";
  if (width < 4) return "MLS";
  if (width < 10) return "WS";
  return "ELS";
}

export function heightWord(y, zh = true) {
  if (y < 0.45) return zh ? "地面超低机位" : "ground-level ultra low angle";
  if (y < 1.0) return zh ? "膝高机位" : "knee-height low angle";
  if (y < 1.75) return zh ? "视平线机位" : "eye-level";
  if (y < 3.2) return zh ? "微俯机位" : "slightly high angle";
  if (y < 8) return zh ? "高机位俯拍" : "high angle";
  return zh ? "航拍视角" : "aerial top-down";
}

export function kelvinWord(k) {
  if (k <= 3000) return "very warm tungsten";
  if (k <= 4200) return "warm";
  if (k <= 5600) return "neutral daylight";
  if (k <= 7000) return "cool";
  return "very cool blue";
}

export function hexToKelvin(hex) {
  // crude: compare red vs blue channel
  const c = hex.replace("#", "");
  if (c.length !== 6) return 5000;
  const r = parseInt(c.slice(0, 2), 16), b = parseInt(c.slice(4, 6), 16);
  const ratio = (r + 1) / (b + 1);
  if (ratio > 1.6) return 2800;
  if (ratio > 1.2) return 3800;
  if (ratio > 0.9) return 5200;
  if (ratio > 0.7) return 6800;
  return 9000;
}

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function deg(r) {
  return (r * 180) / Math.PI;
}
export function rad(d) {
  return (d * Math.PI) / 180;
}
