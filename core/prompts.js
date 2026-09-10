// Prompt compiler: turns Scene + Entity + Camera + Light + Shot + Take into structured T2I / T2V / V2V prompts.
// The compiler is deterministic and versioned; every compile is stored on the Shot as a prompt version.
import { store } from "./store.js";
import { SHOT_SIZES, MOTION_TYPES, LIGHT_PRESETS, heightWord, inferShotSize, hexToKelvin, kelvinWord, deg } from "./schema.js";
import { cameraStateAt, V } from "./motion.js";

export const COMPILER_VERSION = "prompt-compiler/0.3";

const TYPE_EN = { character: "person", vehicle: "vehicle", prop: "prop", weapon: "handgun", building: "building", tree: "tree", flower: "flowers", lamp: "street lamp", environment: "ground", smoke: "smoke" };
const TYPE_ZH = { character: "人物", vehicle: "车辆", prop: "道具", weapon: "手枪", building: "建筑", tree: "树", flower: "花", lamp: "路灯", environment: "地面", smoke: "烟雾" };
const PROXY_EN = { character: "tall cylinder", vehicle: "long box", weapon: "small cone", prop: "small box", building: "tall box", tree: "cylinder", lamp: "thin pole", smoke: "translucent sphere", flower: "small sphere", environment: "flat plane" };
const PROXY_ZH = { character: "大圆柱", vehicle: "长盒", weapon: "小锥/三角", prop: "小盒", building: "高盒", tree: "圆柱", lamp: "细柱", smoke: "半透明球", flower: "小球", environment: "平面" };

function entityDesc(e, lang) {
  const c = e.continuity || {};
  const bits = lang === "en"
    ? [c.look || "", c.color ? `${c.color}` : "", TYPE_EN[e.semanticType] || e.semanticType, e.role ? `(${e.role})` : ""]
    : [c.look || "", c.color || "", TYPE_ZH[e.semanticType] || e.semanticType, e.role ? `（${e.role}）` : ""];
  return `${e.displayName}: ${bits.filter(Boolean).join(" ")}`.trim();
}

function angleWords(camPos, target, targetEnt, lang) {
  const dx = camPos[0] - target[0], dz = camPos[2] - target[2];
  const camAng = Math.atan2(dx, dz); // angle of camera around subject, 0 = in front (+Z)
  const yaw = targetEnt?.transform?.rotation?.[1] || 0;
  let rel = deg(camAng - yaw);
  rel = ((rel + 540) % 360) - 180;
  const a = Math.abs(rel);
  let w;
  if (a < 25) w = ["frontal", "正面"];
  else if (a < 65) w = ["front three-quarter", "前 3/4 侧"];
  else if (a < 115) w = ["profile", "正侧面"];
  else if (a < 155) w = ["rear three-quarter", "后 3/4 侧"];
  else w = ["from behind", "背面"];
  return lang === "en" ? w[0] : w[1];
}

function lightingWords(d, lang) {
  const env = d.scene.environment;
  const preset = LIGHT_PRESETS[env.preset];
  const active = d.lights.filter((l) => l.enabled !== false && l.intensity > 0);
  const key = active.find((l) => l.group === "key") || active[0];
  const others = active.filter((l) => l !== key);
  const keyDir = key ? (key.transform.position[0] < -1 ? (lang === "en" ? "from camera-left" : "来自画面左侧") : key.transform.position[0] > 1 ? (lang === "en" ? "from camera-right" : "来自画面右侧") : lang === "en" ? "from above/behind" : "来自上方/后方") : "";
  const keyK = key ? hexToKelvin(key.color) : 5000;
  if (lang === "en") {
    return [
      preset ? preset.en : "",
      key ? `key light ${keyDir}, ${kelvinWord(keyK)} (${key.color})` : "available light only",
      ...others.slice(0, 4).map((l) => `${l.group || l.type} ${l.type} ${l.color}${l.attachTo ? ` attached to ${l.attachTo}` : ""}`),
      env.wet ? "wet reflective ground" : "",
      env.fog > 0.015 ? "volumetric haze" : "",
    ].filter(Boolean).join(", ");
  }
  return [
    preset ? preset.zh : "",
    key ? `主光${keyDir}，${keyK}K 色温（${key.color}）` : "仅环境光",
    ...others.slice(0, 4).map((l) => `${l.name}（${l.type} ${l.color}）`),
    env.wet ? "湿润反光地面" : "",
    env.fog > 0.015 ? "体积雾" : "",
  ].filter(Boolean).join("，");
}

function motionWords(shot, hero, lang) {
  const t = shot.motion?.type || "static";
  const m = MOTION_TYPES[t] || { zh: t, en: t };
  const name = hero?.displayName || (lang === "en" ? "the subject" : "主体");
  if (shot.keyframes?.length >= 2) {
    const first = shot.keyframes[0].position, last = shot.keyframes[shot.keyframes.length - 1].position;
    const dy = last[1] - first[1], dl = V.len(V.sub(last, first));
    return lang === "en"
      ? `keyframed camera path (${shot.keyframes.length} keys, travels ${dl.toFixed(1)}m${Math.abs(dy) > 0.5 ? `, ${dy > 0 ? "rising" : "descending"} ${Math.abs(dy).toFixed(1)}m` : ""}) toward ${name}`
      : `关键帧运镜（${shot.keyframes.length} 个关键帧，位移 ${dl.toFixed(1)}m${Math.abs(dy) > 0.5 ? `，${dy > 0 ? "上升" : "下降"} ${Math.abs(dy).toFixed(1)}m` : ""}），对准 ${name}`;
  }
  return lang === "en" ? `${m.en} on ${name}` : `${m.zh}，对准 ${name}`;
}

export function compileShot(shotId, opts = {}) {
  const d = store.get();
  const shot = d.shots.find((s) => s.id === shotId);
  if (!shot) return null;
  const cam = d.cameras.find((c) => c.id === shot.cameraId);
  const targets = shot.targetIds.map((id) => d.entities.find((e) => e.id === id)).filter(Boolean);
  const hero = targets[0];
  const state = cameraStateAt(d, shot, shot.range.inFrame) || { position: cam?.pose.position || [0, 1.5, 5], lookAt: [0, 1, 0], focalLength: cam?.lens.focalLength || 35 };
  const endState = cameraStateAt(d, shot, shot.range.outFrame) || state;
  const mm = Math.round(state.focalLength);
  const dist = V.len(V.sub(state.lookAt, state.position));
  const size = cam?.preset && SHOT_SIZES[cam.preset] ? cam.preset : inferShotSize(mm, dist);
  const sizeInfo = SHOT_SIZES[size];
  const seconds = ((shot.range.outFrame - shot.range.inFrame) / d.project.fps).toFixed(1);
  const fidelity = d.project.fidelity;
  const aperture = cam?.lens.aperture || 2.8;
  const angEn = angleWords(state.position, state.lookAt, hero, "en");
  const angZh = angleWords(state.position, state.lookAt, hero, "zh");
  const heightEn = heightWord(state.position[1], false);
  const heightZh = heightWord(state.position[1], true);
  const others = d.entities.filter((e) => !targets.includes(e) && !["environment", "building", "lamp"].includes(e.semanticType)).slice(0, 4);
  const setDressing = d.entities.filter((e) => ["building", "lamp", "tree"].includes(e.semanticType));
  const styleEn = opts.style || d.project.style || "photoreal cinematic, anamorphic 2.39 feel, digital cinema clean grain";
  const styleZh = opts.styleZh || d.project.styleZh || "写实电影质感，宽银幕变形镜头感，干净的数字电影颗粒";

  const image = {
    en: [
      `${d.scene.name} — cinematic film still, ${shot.title}.`,
      hero ? `Subject: ${entityDesc(hero, "en")}.` : "No single subject; environment is the subject.",
      targets.length > 1 ? `Also in frame: ${targets.slice(1).map((e) => entityDesc(e, "en")).join("; ")}.` : "",
      `Framing: ${sizeInfo.en} (${size}), ${angEn}, ${heightEn}, ${mm}mm lens, f/${aperture}${aperture <= 2 ? " shallow depth of field" : ""}, ${d.project.aspect}.`,
      `Lighting: ${lightingWords(d, "en")}.`,
      setDressing.length ? `Environment: ${setDressing.length} background structures (${[...new Set(setDressing.map((e) => TYPE_EN[e.semanticType]))].join(", ")}).` : "",
      others.length ? `Background elements: ${others.map((e) => e.displayName).join(", ")}.` : "",
      shot.description ? `Action: ${shot.description}` : "",
      `${styleEn}. No text, no logos, no watermark.`,
    ].filter(Boolean).join(" "),
    zh: [
      `${d.scene.name}，电影静帧，${shot.title}。`,
      hero ? `主体：${entityDesc(hero, "zh")}。` : "无单一主体，环境即主体。",
      targets.length > 1 ? `同框：${targets.slice(1).map((e) => entityDesc(e, "zh")).join("；")}。` : "",
      `构图：${sizeInfo.zh}（${size}），${angZh}，${heightZh}，${mm}mm，f/${aperture}${aperture <= 2 ? "，浅景深" : ""}，${d.project.aspect}。`,
      `灯光：${lightingWords(d, "zh")}。`,
      shot.description ? `动作：${shot.description}` : "",
      `${styleZh}。无文字、无标志、无水印。`,
    ].filter(Boolean).join(""),
  };

  const continuity = targets.flatMap((e) => (e.agentMemory || []).slice(0, 2).map((m) => `${e.displayName}: ${m}`));
  const video = {
    en: [
      `Single continuous shot, ${seconds}s, ${d.project.fps}fps, ${d.project.aspect}. ${shot.title}.`,
      `Camera: ${motionWords(shot, hero, "en")}; starts ${sizeInfo.en} ${angEn} at ${heightEn}${Math.abs(endState.focalLength - state.focalLength) > 2 ? `, focal ${mm}mm → ${Math.round(endState.focalLength)}mm` : `, ${mm}mm locked, no zoom`}.`,
      hero ? `Subject: ${entityDesc(hero, "en")}${hero.path?.length ? " travelling through frame" : ""}. Identity and wardrobe stay constant.` : "",
      targets.length > 1 ? `Secondary: ${targets.slice(1).map((e) => entityDesc(e, "en")).join("; ")}.` : "",
      `Lighting: ${lightingWords(d, "en")}.`,
      shot.description ? `Action beat: ${shot.description}` : "",
      continuity.length ? `Continuity: ${continuity.join("; ")}.` : "",
      "Camera never clips through objects, horizon stays level unless handheld, motion is smooth and physically plausible.",
      `${styleEn}. No on-screen text.`,
    ].filter(Boolean).join("\n"),
    zh: [
      `单镜头连续拍摄，${seconds} 秒，${d.project.fps}fps，${d.project.aspect}。${shot.title}。`,
      `运镜：${motionWords(shot, hero, "zh")}；起始 ${sizeInfo.zh} ${angZh} ${heightZh}${Math.abs(endState.focalLength - state.focalLength) > 2 ? `，焦距 ${mm}mm → ${Math.round(endState.focalLength)}mm` : `，${mm}mm 锁定不变焦`}。`,
      hero ? `主体：${entityDesc(hero, "zh")}${hero.path?.length ? "，在画面中移动" : ""}。身份与外观保持一致。` : "",
      `灯光：${lightingWords(d, "zh")}。`,
      shot.description ? `动作：${shot.description}` : "",
      continuity.length ? `连续性：${continuity.join("；")}。` : "",
      "镜头不穿模，非手持时地平线保持水平，运动平滑且物理可信。",
      `${styleZh}。画面无文字。`,
    ].filter(Boolean).join("\n"),
  };

  const proxyMap = targets.map((e) => `${PROXY_EN[e.semanticType] || "primitive"} = ${entityDesc(e, "en")}`).join("; ");
  const proxyMapZh = targets.map((e) => `${PROXY_ZH[e.semanticType] || "几何体"} = ${entityDesc(e, "zh")}`).join("；");
  const v2v = {
    en: [
      `Video-to-video. Reference clip is a ${fidelity === "blockout" ? "grey-box blockout" : "stylized previz"} render: keep its camera motion, timing, framing, occlusion and layout exactly.`,
      `Replace proxies: ${proxyMap || "primitives with the described subjects"}.`,
      `Set: ${d.scene.name}, ${lightingWords(d, "en")}.`,
      `Camera: ${motionWords(shot, hero, "en")}, ${mm}mm, ${sizeInfo.en}.`,
      shot.description ? `Action: ${shot.description}` : "",
      `${styleEn}. Preserve the reference's motion vectors; do not add new camera moves; no text.`,
    ].filter(Boolean).join("\n"),
    zh: [
      `视频生视频。参考视频是${fidelity === "blockout" ? "灰盒白模" : "形态可读预演"}渲染：严格保留其镜头运动、时间节奏、构图、遮挡和布局。`,
      `替换代理体：${proxyMapZh || "几何体替换为描述的主体"}。`,
      `场景：${d.scene.name}，${lightingWords(d, "zh")}。`,
      `运镜：${motionWords(shot, hero, "zh")}，${mm}mm，${sizeInfo.zh}。`,
      shot.description ? `动作：${shot.description}` : "",
      `${styleZh}。保留参考视频的运动矢量，不新增镜头运动，无文字。`,
    ].filter(Boolean).join("\n"),
  };

  const negative = {
    en: "text, watermark, logo, extra limbs, deformed vehicle, warped geometry, flicker, morphing identity, camera clipping through walls, jump cut, low resolution, oversaturated, cartoon",
    zh: "文字、水印、标志、多余肢体、变形车辆、几何扭曲、闪烁、身份变化、镜头穿墙、跳切、低分辨率、过饱和、卡通",
  };

  return {
    compiler: COMPILER_VERSION,
    createdAt: new Date().toISOString(),
    meta: { shotSize: size, angle: angEn, height: heightEn, focal: mm, aperture, seconds, motion: shot.motion?.type || "static", keyframes: shot.keyframes?.length || 0, fidelity, subjects: targets.map((e) => e.id), lightingPreset: d.scene.environment.preset },
    image, video, v2v, negative,
  };
}

// Apply compiled prompts onto the shot (creates a new prompt version).
export function attachPrompts(shotId, opts = {}) {
  const p = compileShot(shotId, opts);
  if (!p) return null;
  store.patch((d) => {
    const s = d.shots.find((x) => x.id === shotId);
    if (!s) return;
    s.prompts = p;
    s.promptVersions = [...(s.promptVersions || []), { version: (s.promptVersions?.length || 0) + 1, compiler: p.compiler, createdAt: p.createdAt, meta: p.meta }].slice(-20);
    s.imagePrompt = p.image.en;
    s.videoPrompt = p.video.en;
    if (s.status === "draft") s.status = "blocking";
    s.version += 1;
  });
  return p;
}
