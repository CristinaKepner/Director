// 参照编译器：结构化分析 → Action 计划。纯函数，不碰 store、不调模型、不 import 环境。
//
// 为什么要有这一层。第 13 节已经认过一次同样的错：反问的选项原来是把答案作为文本发回规划器，
// 让模型重新推一遍该干什么 —— 而提问的那一方本来就知道每个答案对应什么动作。
// 参照这条链上一层还留着一模一样的毛病：读取器已经给出了 shotSize、focalMm、heightMeters、
// keyDirection、motion.type、beats[].seconds，referenceBrief() 把这些数字压成一段中文散文，
// 再交给 LLM 猜回 Action。代价是实打实的：
//
//   · 没有规划器就整条链走不通（PLANNER_NOT_READY）
//   · 慢且计费（实测单场 115–195 秒），而这一步本来一个乘法就够
//   · 不确定：同一份分析两次建出不同的场，还出现过一步不建（BUILD_SAID_NOTHING_DONE）
//   · 数字会漂：24mm 写成「约 24mm」，模型顺手给 35mm，没人会发现
//   · 没法测
//
// 所以空间参数走编译，语言走模型。编译出来的 steps 是一份能打印、能 diff、能重放的中间产物：
// 每一步都带 why，出了问题看得见是哪一步把什么翻错了。
import { SHOT_SIZES, COVERAGE_ANGLES, MOTION_TYPES, SEMANTIC_PROXY, LIGHT_PRESETS } from "./schema.js";

// 复刻什么，是四个开关，不是四段提示词。反问选项直接带 mode 过来（选项自带下一步）。
export const REPLICATE_MODES = {
  motion: { zh: "运镜和构图照搬，主体换成我的", scene: false, subjects: "placeholder", camera: true, light: false, beats: true },
  full: { zh: "整条复刻，包括主体和场景", scene: true, subjects: true, camera: true, light: true, beats: true },
  light: { zh: "只要打光和色调", scene: true, subjects: "minimal", camera: "neutral", light: true, beats: false },
  beats: { zh: "只要节奏，镜头我自己来", scene: false, subjects: "minimal", camera: "neutral", light: false, beats: true },
};

// 从导演随口的一句话里听出他要复刻哪一部分。听不出来就返回 null —— 那就该反问，
// 而不是替他猜一个默认值然后闷头建场（建完再改意图，前面的 Action 全白跑）。
// 顺序有讲究：「整条」「只要光」这类说得最明确的先判，「运镜」放最后兜住泛指。
const MODE_WORDS = [
  ["full", /整条|全部|完全|一模一样|原样|照搬全部|连.{0,4}(场景|人|景).{0,3}一起|everything|exact/i],
  ["light", /打光|灯光|光线|光位|布光|色调|色温|氛围光|只要光|lighting|color ?grade/i],
  ["beats", /节奏|拍子|卡点|剪辑点|切点|时长分配|pacing|rhythm/i],
  ["motion", /运镜|机位|构图|镜头运动|推拉|摇移|跟拍|景别|焦段|camera|framing/i],
];
// 没说复刻什么，就整条复刻。以前这里停下来反问（「你要它的运镜还是它的光」），
// 结果是导演贴完链接看到一句「等你说要复刻哪一部分」，然后录白模那步报 NO_SHOTS ——
// 一个都没建。问得再具体也是在流程中间设一道闸。现在先按整条建出来，参照已经读过、
// 存在工程里，之后想换成「只要运镜」是一次免费的重编译，不是重来。
export const DEFAULT_REPLICATE_MODE = "full";

export function inferReplicateMode(text) {
  const t = String(text || "").trim();
  if (!t) return null;
  for (const [mode, re] of MODE_WORDS) if (re.test(t)) return mode;
  return null;
}

// ---- 台面分块 ----
// 一条片子里有几个场景，白模的台就分几块：1 / 3 / 6 / 9 宫格（一排最多三块）。
// 以前几个场景全建在同一个原点上，人和道具叠在一起，镜头对哪一场都拍到别的场的东西。
// 每块是一个独立的地面，场次里的主体、机位内光源都按这块的中心平移；机位跟着主体走，不用另算。
export const PAD = { w: 10, d: 10, pitchX: 16, pitchZ: 20 };

export function padGrid(n) {
  const count = Math.max(1, Number(n) || 1);
  const cols = count === 1 ? 1 : Math.min(3, count);
  const rows = Math.ceil(count / cols);
  const cells = [];
  for (let k = 0; k < count; k++) {
    const r = Math.floor(k / cols), c = k % cols;
    cells.push({ x: Math.round((c - (cols - 1) / 2) * PAD.pitchX * 100) / 100, z: Math.round((r - (rows - 1) / 2) * PAD.pitchZ * 100) / 100 });
  }
  return { cols, rows, cells, label: count === 1 ? "单台" : `${cols}×${rows} 宫格` };
}

// 整条视频的分析长这样：顶层还是那份（兼容只读一个镜头的旧结果），外加 scenes[] 逐场次一份。
// 某一场缺了机位 / 光 / 主体，继承整条的读数 —— 不是退到「中景 35mm 前左」那种中性默认值。
// 镜头选取降级过一次就等于没复刻。
export function sceneSegments(analysis = {}) {
  const list = Array.isArray(analysis.scenes) ? analysis.scenes.filter((x) => x && typeof x === "object") : [];
  if (!list.length) return [{ ...analysis, name: analysis.scene?.name || null, from: null, to: null }];
  const filled = (o) => o && typeof o === "object" && Object.keys(o).length > 0;
  return list.map((sg, i) => ({
    ...sg,
    name: sg.name || sg.scene?.name || `第 ${i + 1} 场`,
    from: Number.isFinite(Number(sg.from)) ? Number(sg.from) : null,
    to: Number.isFinite(Number(sg.to)) ? Number(sg.to) : null,
    brief: sg.brief || sg.summary || "",
    scene: { ...(analysis.scene || {}), ...(sg.scene || {}) },
    subjects: Array.isArray(sg.subjects) && sg.subjects.length ? sg.subjects : analysis.subjects || [],
    camera: filled(sg.camera) ? sg.camera : analysis.camera || {},
    lighting: filled(sg.lighting) ? sg.lighting : analysis.lighting || {},
    motion: sg.motion?.type ? sg.motion : analysis.motion || {},
    beats: Array.isArray(sg.beats) ? sg.beats : [],
  }));
}

// ---- 词汇对齐 ----
// 读取器的提示词和运行时的枚举各写各的，对不上的那几个一直是静默吞掉的：
// 读取器会给 LS（运行时叫 WS）、truck-left（运行时是 truck 带方向）、tilt（运行时压根没有）。
// 编译之前先翻译，翻不动的记成 warning 交给导演，而不是悄悄变成默认值。
const SHOT_SIZE_ALIAS = { LS: "WS", WIDE: "WS", WS: "WS", FS: "WS", FULL: "WS", EWS: "ELS", XLS: "ELS", VLS: "ELS", XCU: "ECU", BCU: "ECU", MED: "MS", MEDIUM: "MS", TWO: "MLS" };

export function normalizeShotSize(raw, warnings = []) {
  const k = String(raw || "").trim().toUpperCase();
  if (SHOT_SIZES[k]) return k;
  if (SHOT_SIZE_ALIAS[k] && SHOT_SIZES[SHOT_SIZE_ALIAS[k]]) return SHOT_SIZE_ALIAS[k];
  if (k) warnings.push(`景别「${raw}」不是运行时认识的名字，按中景 MS 处理`);
  return "MS";
}

// 读取器的 angle 只说俯仰（eye/low/high/overhead/dutch），运行时的 COVERAGE_ANGLES 说的是方位。
// 两者是不同的轴：方位交给 framing / 主体朝向决定，俯仰交给机位高度（heightMeters）决定。
// 所以这里只负责挑方位，高度另算 —— 以前一股脑塞进 angle，high 和 dutch 直接落到默认值。
const ANGLE_YAW = { front: "front", frontal: "front", eye: "front", low: "front", high: "front", overhead: "overhead", dutch: "front_left", side: "profile_right", profile: "profile_right", back: "back", rear: "back" };
const FRAMING_YAW = [
  [/背对|背影|从背后|over[- ]the[- ]shoulder|过肩/i, "rear_left"],
  [/侧面|侧脸|profile/i, "profile_right"],
  [/正面|正对|居中|对称|symmetr/i, "front"],
  [/斜|四分之三|3\/4|three[- ]quarter/i, "front_left"],
];

export function normalizeCoverage(camera = {}, warnings = []) {
  const a = String(camera.angle || "").trim().toLowerCase();
  if (a === "dutch") warnings.push("参照是斜角（dutch）构图，运行时的机位没有滚转轴 —— 白模里会是平的，斜角要在生成提示词里说");
  for (const [re, cov] of FRAMING_YAW) if (re.test(String(camera.framing || ""))) return cov;
  const hit = ANGLE_YAW[a];
  return hit && COVERAGE_ANGLES[hit] ? hit : "front_left";
}

// 机位高度：读取器给的是米，直接用。给不出来就按景别的默认比例交给 camera.frame 自己算。
export function cameraHeight(camera = {}) {
  const h = Number(camera.heightMeters);
  return Number.isFinite(h) && h > 0.05 && h < 40 ? Math.round(h * 100) / 100 : undefined;
}

const MOTION_ALIAS = {
  static: ["static"], locked: ["static"], none: ["static"],
  "push-in": ["push-in"], pushin: ["push-in"], "zoom-in": ["push-in"], "dolly-in": ["dolly-in"], dollyin: ["dolly-in"], in: ["dolly-in"],
  "dolly-out": ["dolly-out"], dollyout: ["dolly-out"], "pull-out": ["dolly-out"], "zoom-out": ["dolly-out"], out: ["dolly-out"],
  "truck-left": ["truck", { distance: -3 }], "truck-right": ["truck", { distance: 3 }], truck: ["truck"], track: ["truck"], lateral: ["truck"],
  pan: ["pan"], "pan-left": ["pan", { degrees: -45 }], "pan-right": ["pan", { degrees: 45 }],
  orbit: ["orbit"], arc: ["orbit"], crane: ["crane"], jib: ["crane"],
  handheld: ["handheld"], shaky: ["handheld"], drone: ["drone"], aerial: ["drone"],
  chase: ["chase"], follow: ["chase"], "dolly-zoom": ["dolly-zoom"], vertigo: ["dolly-zoom"],
  pedestal: ["pedestal"], "boom-up": ["pedestal", { distance: 1.5 }], "boom-down": ["pedestal", { distance: -1.5 }],
};

export function normalizeMotion(motion = {}, warnings = []) {
  const raw = String(motion.type || "static").trim().toLowerCase();
  if (MOTION_TYPES[raw]) return { type: raw };
  const hit = MOTION_ALIAS[raw];
  if (hit) return { type: hit[0], params: hit[1] };
  // tilt 是俯仰摇，运行时只有平移的升降和水平的摇镜 —— 没有能对上的，说清楚再降级
  if (/tilt/.test(raw)) {
    warnings.push(`参照是 ${raw}（俯仰摇），运行时没有这个运镜类型，先用升降（pedestal）代替 —— 要真的摇要给 MOTION_TYPES 加一档`);
    return { type: "pedestal", params: { distance: /down/.test(raw) ? -1.2 : 1.2 } };
  }
  if (raw && raw !== "static") warnings.push(`运镜「${motion.type}」不认识，按固定机位处理`);
  return { type: "static" };
}

// 速度只影响幅度：同样是推镜，slow 推一点点，fast 推到底。
const SPEED_SCALE = { slow: 0.6, medium: 1, fast: 1.5 };
function scaleMotion(m, speed) {
  const k = SPEED_SCALE[String(speed || "").toLowerCase()];
  if (!k || k === 1 || !MOTION_TYPES[m.type]?.params) return m;
  const base = { ...MOTION_TYPES[m.type].params, ...(m.params || {}) };
  const out = {};
  for (const [key, v] of Object.entries(base)) out[key] = typeof v === "number" ? Math.round(v * k * 100) / 100 : v;
  return { ...m, params: out };
}

// ---- 灯光：映射到一档现成的布光预设，而不是凭空摆灯 ----
// 预设是调过的（11 档），照着分析现编三盏灯只会更难看。对不上的部分记 warning。
export function pickLightPreset(lighting = {}, scene = {}, warnings = []) {
  // palette 必须算进来：「霓虹」这种最能定调的词，读取器写的就是主色调那一栏
  const t = `${scene.timeOfDay || ""} ${scene.setting || ""} ${scene.mood || ""} ${scene.palette || ""}`;
  const key = String(lighting.keyDirection || "");
  const ratio = String(lighting.ratio || "");
  const temp = String(lighting.colorTemp || "");
  const has = (re) => re.test(t);
  if (/逆光|背光|剪影|back ?light|silhouette/i.test(key + ratio)) return "silhouette";
  if (has(/夜|night/i)) return /霓虹|neon|赛博|cyber/i.test(t + temp) ? "night-neon" : /高反差|硬|hard|noir|黑色/i.test(ratio + t) ? "noir" : "moonlight";
  if (has(/黄昏|日落|傍晚|magic|golden|sunset|dusk/i)) return "sunset";
  if (has(/影棚|studio|棚拍|白背景|无缝/i)) return /高反差|硬|hard/i.test(ratio) ? "hard-side" : "softbox-studio";
  if (has(/室内|indoor|interior|无自然光/i)) return /冷|cold|cool/i.test(temp) ? "cold-studio" : "three-point";
  if (has(/正午|中午|noon/i)) return "noon-daylight";
  if (has(/晨|早|morning|daylight|白天|室外|outdoor/i)) return "daylight";
  if (/高反差|硬|hard/i.test(ratio)) return "hard-side";
  warnings.push("参照的光位没落进任何一档预设，先用三点布光；不对就在灯光面板里调");
  return "three-point";
}

// ---- 主体摆位 ----
// 画面位置 → 世界坐标。机位是锁定看向主体的，所以主体自己没法偏出画面中心（那要靠挪机位，
// 而挪了机位就不是这个景别了）—— 能忠实还原的是**主体之间的相对位置**：谁在左、谁在右、
// 谁在前景。构图偏移写进镜头描述，交给提示词那一层，白模这边不假装做得到。
const X_HINTS = [[/最左|左边缘|far ?left/i, -2.6], [/偏左|左侧|左边|left/i, -1.4], [/最右|右边缘|far ?right/i, 2.6], [/偏右|右侧|右边|right/i, 1.4], [/中央|中间|正中|center|centre|middle/i, 0]];
const Z_HINTS = [[/前景|近处|foreground|near/i, 1.6], [/背景|远处|后方|background|far|behind/i, -3.2], [/中景|mid/i, -0.8]];

function placeSubject(sub, index, total) {
  const p = String(sub.screenPosition || "");
  let x = null, z = null;
  for (const [re, v] of X_HINTS) if (re.test(p)) { x = v; break; }
  for (const [re, v] of Z_HINTS) if (re.test(p)) { z = v; break; }
  // 说不清位置的：按出场顺序摊开，别全叠在原点上（叠在一起自检会当场报 EMPTY_FRAME 之外的怪事）
  if (x === null) x = total === 1 ? 0 : Math.round((index - (total - 1) / 2) * 1.6 * 100) / 100;
  if (z === null) z = index === 0 ? 0 : -0.6 * index;
  return [x, 0, Math.round(z * 100) / 100];
}

// 群体：读取器把「7 个伴舞」记成一条 subject 带 count=7。白模里得是 7 个人，不是一个。
// 按站位摊开：一排最多 5 个，间距 0.9 m，第二排退后 1 m 并错开半个身位；名字带序号。
// 一场最多 12 个，再多是人群，白模里摆不下也没意义。
const GROUP_MAX = 12;
export function expandSubjects(list = []) {
  const out = [];
  for (const s of list) {
    const n = Math.max(1, Math.min(GROUP_MAX, Math.round(Number(s.count) || 1)));
    if (n === 1) { out.push({ ...s, count: 1 }); continue; }
    for (let i = 0; i < n; i++) out.push({ ...s, count: 1, group: s.displayName || s.semanticType, groupIndex: i, groupSize: n, displayName: `${s.displayName || "人"} ${i + 1}` });
    if (out.length >= GROUP_MAX) break;
  }
  return out.slice(0, GROUP_MAX);
}
function groupOffset(sub) {
  if (!sub.groupSize || sub.groupSize < 2) return [0, 0];
  const perRow = 5, i = sub.groupIndex, row = Math.floor(i / perRow), col = i % perRow;
  const inRow = Math.min(perRow, sub.groupSize - row * perRow);
  return [Math.round(((col - (inRow - 1) / 2) * 0.9 + (row % 2 ? 0.45 : 0)) * 100) / 100, -row * 1.0];
}

const TYPE_ALIAS = { person: "character", people: "character", human: "character", man: "character", woman: "character", car: "vehicle", object: "prop", item: "prop", product: "prop", food: "prop", animal: "character", plant: "tree", light: "lamp" };

function normalizeType(raw, warnings = []) {
  const k = String(raw || "").trim().toLowerCase();
  if (SEMANTIC_PROXY[k]) return k;
  if (TYPE_ALIAS[k] && SEMANTIC_PROXY[TYPE_ALIAS[k]]) return TYPE_ALIAS[k];
  if (k) warnings.push(`语义类型「${raw}」运行时没有，按道具（prop）建`);
  return "prop";
}

// ---- 编译 ----
/**
 * @param analysis  reference.analyze 的结构化输出（顶层一份；整条视频时另有 scenes[] 逐场次一份）
 * @param opts { mode, prefix, fps, hint, title, seconds }
 * @returns { steps:[{action,payload,why}], warnings:[], summary, mode, ids, pads, grid }
 */
export function compileReference(analysis = {}, opts = {}) {
  const mode = REPLICATE_MODES[opts.mode] ? opts.mode : DEFAULT_REPLICATE_MODE;
  const M = REPLICATE_MODES[mode];
  const p = opts.prefix || "ref";
  const warnings = [];
  const steps = [];
  const add = (action, payload, why) => steps.push({ action, payload, why });

  const segs = sceneSegments(analysis);
  const multi = segs.length > 1;
  const grid = padGrid(segs.length);
  const pads = multi ? segs.map((sg, k) => ({ id: `${p}_pad${k + 1}`, name: sg.name, index: k + 1, x: grid.cells[k].x, z: grid.cells[k].z, w: PAD.w, d: PAD.d, from: sg.from, to: sg.to })) : [];
  const offset = (k) => (multi ? [grid.cells[k].x, 0, grid.cells[k].z] : [0, 0, 0]);
  const shift = (pos, k) => { const o = offset(k); return [Math.round((pos[0] + o[0]) * 100) / 100, pos[1], Math.round((pos[2] + o[2]) * 100) / 100]; };

  // 1. 场次。整条复刻时台上只有一个「场」（运行时就一个 scene），分块靠 pads。
  const scene0 = analysis.scene || segs[0].scene || {};
  const sceneName = scene0.name || scene0.setting || (multi ? `复刻 · ${segs.length} 场` : "复刻场");
  if (M.scene) {
    add("scene.create", { name: sceneName, environment: {} }, `场次「${sceneName}」${scene0.timeOfDay ? "，" + scene0.timeOfDay : ""}`);
  }
  if (multi) add("scene.pads", { pads }, `台面分成 ${grid.label}：${segs.map((sg, k) => `${k + 1} ${sg.name}`).join(" / ")}`);

  // 2. 灯光：台上只能挂一套预设灯，按第一场定；后面哪一场不一样，记在那一镜上并说出来。
  let globalPreset = null;
  if (M.light) {
    globalPreset = pickLightPreset(segs[0].lighting || {}, segs[0].scene || {}, warnings);
    add("scene.preset", { preset: globalPreset }, `布光 ${LIGHT_PRESETS[globalPreset].zh}${segs[0].lighting?.keyDirection ? "（参照主光：" + segs[0].lighting.keyDirection + "）" : ""}`);
  }

  const ids = { subjects: [], camera: null, shot: null, scenes: [] };
  let totalSeconds = 0;
  let firstMotion = null, firstSize = null, firstFocal = null;

  segs.forEach((sg, k) => {
    const sp = multi ? `${p}_s${k + 1}` : p;
    const cam = sg.camera || {};
    const light = sg.lighting || {};
    const beats = Array.isArray(sg.beats) ? sg.beats.filter((b) => b && Number(b.seconds) > 0) : [];
    const subjects = expandSubjects(Array.isArray(sg.subjects) ? sg.subjects.slice(0, 8) : []);
    const sid = { pad: pads[k]?.id || null, subjects: [], camera: `${sp}_cam`, shot: `${sp}_shot` };
    const padArg = sid.pad ? { pad: sid.pad } : {};

    // 主体。placeholder 模式也要建 —— 机位得有东西可看，白模得有东西可拍；
    // 建出来的是占位，导演改名换成自己的产品或角色就行（这正是「不花钱先看构图」的前提）。
    const wanted = M.subjects === false ? [] : M.subjects === "minimal" ? subjects.slice(0, 1) : subjects;
    const useList = wanted.length ? wanted : [{ semanticType: "character", displayName: "主体", screenPosition: "中央" }];
    // 群体成员共用同一个「锚点」（按第一个成员的位置提示算），再按站位错开
    const anchors = new Map();
    const distinct = [...new Set(useList.map((s) => s.group || s.displayName || s.semanticType))];
    useList.forEach((s, i) => {
      const id = `${sp}_sub${i + 1}`;
      const type = normalizeType(s.semanticType, warnings);
      sid.subjects.push(id);
      const key = s.group || s.displayName || s.semanticType;
      if (!anchors.has(key)) anchors.set(key, placeSubject(s, distinct.indexOf(key), distinct.length));
      const base = anchors.get(key);
      const [gx, gz] = groupOffset(s);
      add("entity.create", {
        id,
        type,
        displayName: s.displayName || SEMANTIC_PROXY[type].label.split(" ")[0],
        position: shift([base[0] + gx, base[1], base[2] + gz], k),
        yaw: 0,
        ...padArg,
        ...(M.subjects === "placeholder" ? { role: "占位：换成你自己的主体" } : {}),
      }, `${multi ? `第 ${k + 1} 场 · ` : ""}${s.displayName || type}${s.screenPosition ? " · " + s.screenPosition : ""}${s.groupSize ? `（${s.group} ${s.groupIndex + 1}/${s.groupSize}）` : ""}${M.subjects === "placeholder" ? "（占位）" : ""}`);
    });

    // 画面内光源跟着这一块台走
    if (M.light) {
      for (const [i, name] of (light.practicals || []).slice(0, 4).entries()) {
        add("light.create", { id: `${sp}_prac${i + 1}`, name: String(name).slice(0, 20), type: "point", group: "practical", intensity: 6, color: "#ffd9a8", position: shift([i % 2 ? 2.4 : -2.4, 2.2, -1.6 - i * 0.8], k), ...padArg }, `${multi ? `第 ${k + 1} 场 · ` : ""}画面内光源：${name}`);
      }
    }

    // 机位。景别 / 焦段 / 高度都是分析里已有的数字，不必让模型再猜一遍。
    // 先 create 再 frame：frame 按主体的真实位置和高度算距离，所以主体挪到哪块台，机位就跟到哪块。
    const size = normalizeShotSize(cam.shotSize, warnings);
    const focal = Number(cam.focalMm) > 0 ? Math.round(Number(cam.focalMm)) : SHOT_SIZES[size].focal;
    const coverage = normalizeCoverage(cam, warnings);
    const height = cameraHeight(cam);
    const aperture = Number(cam.aperture) > 0 ? Number(cam.aperture) : undefined;
    const target = sid.subjects[0];
    if (M.camera === true) {
      add("camera.create", { id: sid.camera, name: `${multi ? k + 1 + " · " : ""}${size} ${focal}mm`, focalLength: focal, ...(aperture ? { aperture } : {}), target, preset: size, ...padArg }, `机位：${SHOT_SIZES[size].zh} ${size} · ${focal}mm${aperture ? ` · f/${aperture}` : ""}`);
      add("camera.frame", { id: sid.camera, target, size, angle: coverage, focalLength: focal, ...(height !== undefined ? { height } : {}) }, `按景别摆到${COVERAGE_ANGLES[coverage].zh}${height !== undefined ? `，离地 ${height} m` : ""}`);
    } else {
      add("camera.create", { id: sid.camera, name: `${multi ? k + 1 + " · " : ""}中景机位`, focalLength: 35, target, preset: "MS", ...padArg }, "中性机位：这个模式不复刻机位，先给一个能看见主体的");
      add("camera.frame", { id: sid.camera, target, size: "MS", angle: "front_left" }, "中景 · 前左 3/4");
    }
    if (k === 0) add("camera.pilot", { id: sid.camera }, "设为 Program");

    // 镜头。时长优先按拍数合计 —— 那是参照自己的节奏；整条视频时其次按这一场的起止秒。
    const beatTotal = beats.reduce((n, b) => n + Number(b.seconds), 0);
    const spanSecs = sg.from != null && sg.to != null && sg.to > sg.from ? sg.to - sg.from : null;
    const fallback = multi ? (opts.seconds ? opts.seconds / segs.length : 4) : opts.seconds || 4;
    const duration = Math.max(1, Math.round((beatTotal || spanSecs || fallback) * 10) / 10);
    const motion = M.camera === true ? scaleMotion(normalizeMotion(sg.motion, warnings), sg.motion?.speed) : { type: "static" };
    totalSeconds += duration;
    if (k === 0) { firstMotion = motion; firstSize = size; firstFocal = focal; }
    add("shot.create", {
      id: sid.shot,
      title: multi ? sg.name : opts.title || sg.name || analysis.summary?.slice(0, 18) || "复刻镜头",
      description: [sg.brief || sg.summary || analysis.brief || analysis.summary || "", cam.framing ? `构图：${cam.framing}` : "", opts.hint ? `导演要求：${opts.hint}` : ""].filter(Boolean).join(" "),
      cameraId: sid.camera,
      duration,
      motion: motion.params ? motion : motion.type,
      targetIds: sid.subjects,
      ...padArg,
    }, `${multi ? `第 ${k + 1} 场 · ` : ""}镜头 ${duration}s · ${MOTION_TYPES[motion.type].zh}${beatTotal ? `（按参照的 ${beats.length} 拍合计）` : spanSecs ? `（原片 ${sg.from}s–${sg.to}s）` : ""}`);

    // 拍。长镜头要分段续拍时，段边界按这里的拍走 —— 那是参照的节奏，不是模型的上限。
    if (M.beats && beats.length > 1) {
      add("shot.beats", { shotId: sid.shot, beats: beats.map((b) => ({ seconds: Math.round(Number(b.seconds) * 10) / 10, text: String(b.text || "").slice(0, 200) })) }, `拆成 ${beats.length} 拍：${beats.map((b) => `${b.seconds}s`).join(" + ")}`);
    }

    // 这一场的光和台上挂的那套不一样：记在镜头上（生成提示词会带），并说一声
    if (M.light && k > 0) {
      const mine = pickLightPreset(light, sg.scene || {}, []);
      if (mine !== globalPreset) {
        add("shot.update", { id: sid.shot, lightingState: mine }, `第 ${k + 1} 场的光是 ${LIGHT_PRESETS[mine].zh}，记在镜头上`);
        warnings.push(`第 ${k + 1} 场「${sg.name}」读出来的光是 ${LIGHT_PRESETS[mine].zh}，台上只能挂一套灯，现在挂的是第 1 场的 ${LIGHT_PRESETS[globalPreset].zh}。这一镜记了自己的光，生成时会按它来；白模里要看就在灯光面板切`);
      }
    }

    // 只有真的偏了才提醒。参照本来就是居中构图时还弹一句「白模里会在正中」，是句废话。
    const framed = String(cam.framing || "");
    if (/三分|偏左|偏右|靠左|靠右|off[- ]cent/i.test(framed) && !/居中|正中|中央|dead ?cent/i.test(framed)) {
      warnings.push(`${multi ? `第 ${k + 1} 场` : "参照"}的构图是「${framed}」：运行时的机位锁定看向主体，白模里主体会在正中。这句已经写进镜头描述，生成时会带上；要在白模里也偏，得手动挪机位`);
    }

    ids.scenes.push(sid);
    ids.subjects.push(...sid.subjects);
    if (k === 0) { ids.camera = sid.camera; ids.shot = sid.shot; }
  });

  const dur = Math.round(totalSeconds * 10) / 10;
  return {
    mode,
    steps,
    warnings,
    ids,
    pads,
    grid: multi ? grid : null,
    scenes: segs.length,
    seconds: dur,
    summary: multi
      ? `${REPLICATE_MODES[mode].zh} · ${segs.length} 场（${grid.label}）· ${steps.length} 步 · 共 ${dur}s`
      : `${REPLICATE_MODES[mode].zh} · ${steps.length} 步 · ${firstSize} ${firstFocal}mm ${MOTION_TYPES[firstMotion.type].zh} · ${dur}s${segs[0].beats?.length > 1 ? ` · ${segs[0].beats.length} 拍` : ""}`,
  };
}
