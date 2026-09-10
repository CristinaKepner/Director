// Agent Director: natural language → Action plan → dispatch. The agent never touches Three.js or UI state;
// every step is an Action with source="agent", so it shows up in the Event Log and can be undone.
import { dispatch, register, summarize, capabilities, batch } from "./actions.js";
import { store } from "./store.js";
import { MOTION_TYPES, LIGHT_PRESETS, POSES, SHOT_SIZES, COVERAGE_ANGLES, PROVIDERS, GEN_MODES } from "./schema.js";
import { DEMOS } from "./demo.js";

const ROLES = { scene: "scene-builder", cam: "cinematography", motion: "motion", light: "lighting", cont: "continuity", board: "storyboard", gen: "generation", review: "review", plan: "director-planner" };

export function say(role, text, extra = {}) {
  store.patch((d) => {
    d.agent.messages.push({ id: `m_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, role, text, at: new Date().toISOString(), ...extra });
    d.agent.messages = d.agent.messages.slice(-120);
  });
}

// ---------- vocabulary ----------
const MOTION_WORDS = [
  [/dolly.?zoom|滑动变焦|希区柯克/i, "dolly-zoom"],
  [/push.?in|缓推/i, "push-in"],
  [/dolly.?in|推近|推镜|推进|推上去/i, "dolly-in"],
  [/dolly.?out|拉远|拉镜|拉开/i, "dolly-out"],
  [/orbit|环绕|绕/i, "orbit"],
  [/chase|follow|跟拍|跟车|跟随/i, "chase"],
  [/crane|摇臂|升起/i, "crane"],
  [/handheld|手持/i, "handheld"],
  [/truck|横移|平移/i, "truck"],
  [/pedestal|升降/i, "pedestal"],
  [/\bpan\b|摇镜|横摇/i, "pan"],
  [/drone|航拍|无人机/i, "drone"],
  [/static|固定|锁定机位|不动/i, "static"],
];
const PRESET_WORDS = [
  [/sunset|日落|黄昏|golden/i, "sunset"],
  [/neon|霓虹|夜景/i, "night-neon"],
  [/studio|棚拍|冷白/i, "cold-studio"],
  [/silhouette|剪影|逆光/i, "silhouette"],
  [/three.?point|三点/i, "three-point"],
  [/moon|月光|月夜/i, "moonlight"],
  [/noir|黑色电影/i, "noir"],
  [/daylight|白天|正午|日光/i, "daylight"],
];
const POSE_WORDS = [
  [/举枪|瞄准|aim|持枪/i, "aim"],
  [/跑|run/i, "run"],
  [/走|walk/i, "walk"],
  [/坐|sit/i, "sit"],
  [/蹲|crouch/i, "crouch"],
  [/挥手|wave/i, "wave"],
  [/指向|指着|point/i, "point"],
  [/倒下|摔|fall/i, "fall"],
  [/开车|驾驶|drive/i, "drive"],
  [/站好|站直|站立|idle|放松/i, "idle"],
];
const SIZE_WORDS = [
  [/极特写|大特写|ECU|extreme close/i, "ECU"],
  [/特写|CU\b|close.?up/i, "CU"],
  [/中近景|MCU|medium close/i, "MCU"],
  [/中全景|MLS/i, "MLS"],
  [/中景|MS\b|medium shot/i, "MS"],
  [/大远景|ELS|extreme long/i, "ELS"],
  [/全景|远景|WS\b|wide/i, "WS"],
];
const ANGLE_WORDS = [
  [/俯拍|overhead|top.?down|鸟瞰/i, "overhead"],
  [/低机位|low angle|贴地/i, "low"],
  [/背面|从后|behind/i, "back"],
  [/后左|rear.?left/i, "rear_left"],
  [/后右|rear.?right/i, "rear_right"],
  [/左侧面|左侧|profile.?left/i, "profile_left"],
  [/右侧面|右侧|profile.?right/i, "profile_right"],
  [/前左|front.?left|左前/i, "front_left"],
  [/前右|front.?right|右前/i, "front_right"],
  [/正面|frontal|front\b/i, "front"],
];
const TYPE_WORDS = [
  [/路灯|lamp/i, "lamp"],
  [/手枪|枪|gun|pistol|weapon/i, "weapon"],
  [/警车|跑车|轿车|汽车|车辆|车|car|vehicle/i, "vehicle"],
  [/楼|建筑|building/i, "building"],
  [/树|tree/i, "tree"],
  [/花|flower/i, "flower"],
  [/烟|smoke/i, "smoke"],
  [/人|角色|character|person|演员/i, "character"],
  [/道具|prop|箱|box/i, "prop"],
];
const PROVIDER_WORDS = [
  [/seedance/i, "seedance-2"],
  [/kling|可灵/i, "kling-2.5"],
  [/minimax|hailuo|海螺|h3/i, "minimax-h3"],
  [/veo/i, "veo-3"],
  [/runway/i, "runway-gen4"],
  [/higgsfield/i, "higgsfield"],
  [/flux/i, "flux-kontext"],
  [/gpt.?image|dall/i, "gpt-image"],
];

const pick = (table, text) => table.find(([re]) => re.test(text))?.[1] || null;
const num = (re, text) => {
  const m = text.match(re);
  return m ? parseFloat(m[1]) : null;
};

// ---------- resolvers ----------
function resolveEntity(text, d, prefer) {
  const t = text.replace(/的|把|让|给|将/g, " ").trim();
  const ents = d.entities;
  const byId = ents.find((e) => t.includes(e.id));
  if (byId) return byId;
  const byName = ents.filter((e) => e.displayName && t.includes(e.displayName)).sort((a, b) => b.displayName.length - a.displayName.length)[0];
  if (byName) return byName;
  const byAlias = ents.find((e) => (e.aliases || []).some((a) => a && new RegExp(`(^|[^a-z])${a}([^a-z]|$)`, "i").test(t)));
  if (byAlias) return byAlias;
  if (/主角车|hero car/i.test(t)) return ents.find((e) => e.semanticType === "vehicle" && e.role === "hero") || ents.find((e) => e.semanticType === "vehicle");
  if (/警车|追逐车|chase/i.test(t)) return ents.find((e) => e.role === "antagonist" && e.semanticType === "vehicle") || ents.find((e) => e.id === "chase_car");
  if (/主角|hero|protagonist/i.test(t)) return ents.find((e) => e.role === "hero" && e.semanticType === "character") || ents.find((e) => e.role === "hero");
  if (/车手|司机|driver/i.test(t)) return ents.find((e) => e.role === "driver") || ents.find((e) => e.id === "driver");
  if (/对手|反派|敌人|rival|villain|antagonist/i.test(t)) return ents.find((e) => e.role === "antagonist" && e.semanticType === "character");
  if (/搭档|同伴|partner/i.test(t)) return ents.find((e) => e.role === "partner");
  const ty = pick(TYPE_WORDS, t);
  if (ty && prefer !== "skip-type") return ents.find((e) => e.semanticType === ty && e.role !== "set") || ents.find((e) => e.semanticType === ty);
  return null;
}

function resolveCamera(text, d, ctx) {
  const t = text;
  const byId = d.cameras.find((c) => t.includes(c.id));
  if (byId) return byId;
  const letter = t.match(/([ABCD])\s*[机机位]/i) || t.match(/\bcam(?:era)?\s*([ABCD])\b/i);
  if (letter) {
    const L = letter[1].toLowerCase();
    return d.cameras.find((c) => c.id === `cam_${L}`) || d.cameras.find((c) => new RegExp(`^${L}\\s`, "i").test(c.name)) || null;
  }
  if (/program|主机位|拍摄机|当前机位|机位/i.test(t) || ctx.cam) return d.cameras.find((c) => c.id === (ctx.cam || d.project.programCameraId)) || d.cameras[0];
  return d.cameras.find((c) => c.id === d.project.programCameraId) || d.cameras[0] || null;
}

function resolveShot(text, d, ctx) {
  const m = text.match(/shot[_\s-]?(\d+)/i);
  if (m) {
    const n = parseInt(m[1], 10);
    return d.shots.find((s) => s.id === `shot_${m[1]}` || parseInt(s.index, 10) === n) || null;
  }
  const zh = text.match(/(?:第\s*)?(\d+|[一二三四五六七八九十])\s*[镜号]/);
  if (zh) {
    const map = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
    const n = map[zh[1]] || parseInt(zh[1], 10);
    return d.shots.find((s) => parseInt(s.index, 10) === n) || null;
  }
  const byTitle = d.shots.find((s) => s.title && text.includes(s.title));
  if (byTitle) return byTitle;
  return d.shots.find((s) => s.id === (ctx.shot || d.project.currentShotId)) || null;
}

function parseXYZ(text) {
  const m = text.match(/(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)/);
  return m ? [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])] : null;
}

function parseDelta(text) {
  const dist = num(/(\d+(?:\.\d+)?)\s*(?:m|米)/, text) ?? 1;
  if (/往左|向左|left/i.test(text)) return [-dist, 0, 0];
  if (/往右|向右|right/i.test(text)) return [dist, 0, 0];
  if (/往前|向前|forward/i.test(text)) return [0, 0, dist];
  if (/往后|向后|back/i.test(text)) return [0, 0, -dist];
  if (/往上|向上|升高|up/i.test(text)) return [0, dist, 0];
  if (/往下|向下|降低|down/i.test(text)) return [0, -dist, 0];
  return null;
}

// ---------- planner ----------
export function plan(text, d = store.get()) {
  const steps = [];
  const ctx = { cam: null, shot: null };
  const add = (action, payload, label, role = ROLES.plan, extra = {}) => steps.push({ action, payload, label, role, ...extra });
  const clauses = text.split(/\s*(?:并且|并|然后|接着|再|,|，|;|；|\band\b)\s*/i).map((c) => c.trim()).filter(Boolean);
  const notes = [];

  for (const raw0 of clauses) {
    const raw = raw0;
    const low = raw.toLowerCase();

    if (/^(help|帮助|能做什么|怎么用)/.test(low)) {
      notes.push("help");
      continue;
    }
    if (/(context|状态|现在什么样|场景摘要|看看场景)/.test(low)) {
      add("context.scene", {}, "读取场景上下文", ROLES.cont);
      continue;
    }
    if (/^(撤销|undo)/.test(low)) {
      add("project.undo", {}, "撤销上一步", ROLES.review);
      continue;
    }
    if (/^(重做|redo)/.test(low)) {
      add("project.redo", {}, "重做", ROLES.review);
      continue;
    }
    if (/速度与激情|追车|fast pursuit|宣传片|neon city/i.test(low)) {
      add("scene.demo", { name: "fast-pursuit" }, "搭建 Fast Pursuit：Neon City、双车动线、四机位、六镜、提示词", ROLES.scene, { heavy: true });
      continue;
    }
    if (/城市边缘|city edge|默认场景|重置示例|示例场景/i.test(low)) {
      add("scene.demo", { name: "city-edge" }, "载入「城市边缘」示例：三人站位、Program 40 mm、三镜", ROLES.scene, { heavy: true });
      continue;
    }
    if (/白模|blockout|灰模|圆柱/i.test(low) && /切|换|用|到|模式|mode/.test(low)) {
      add("project.set-fidelity", { fidelity: "blockout" }, "切到白模语义（圆柱=人，长盒=车，小锥=枪）", ROLES.scene);
      continue;
    }
    if (/形态可读|stylized|精细|关节模式|可读模式/i.test(low) || (/形态|精细化/.test(low) && /切|换|到/.test(low))) {
      add("project.set-fidelity", { fidelity: "stylized" }, "切到形态可读（车分车头/座舱/轮，人物关节可动）", ROLES.scene);
      continue;
    }
    const preset = pick(PRESET_WORDS, raw);
    if (preset && /光|light|换成|改成|切|preset|氛围|打光|布光/.test(low)) {
      add("scene.preset", { preset }, `布光：${LIGHT_PRESETS[preset].zh}`, ROLES.light);
      continue;
    }
    if (/(播放|预演|preview|play)/.test(low)) {
      const s = resolveShot(raw, d, ctx);
      add("shot.preview", { id: s?.id, loop: /循环|loop/.test(low) }, `预演 ${s ? s.index + " " + s.title : "当前镜头"}`, ROLES.motion);
      continue;
    }
    if (/(录制|record|roll|拍一条|来一条)/.test(low)) {
      const s = resolveShot(raw, d, ctx);
      if (!s) {
        notes.push("没有镜头可录");
        continue;
      }
      ctx.shot = s.id;
      add("take.arm", { shotId: s.id }, `Preflight ${s.index} ${s.title}`, ROLES.review);
      add("take.record", { shotId: s.id, name: `${s.title} Agent T` }, `录制白模 Take`, ROLES.review);
      continue;
    }
    if (/(圈选|circle|选用|这条好)/.test(low)) {
      const s = resolveShot(raw, d, ctx);
      const t = d.takes.filter((x) => !s || x.shotId === s.id).at(-1);
      if (t) add("take.review", { id: t.id, status: "circle" }, `圈选 ${t.name}`, ROLES.review);
      else notes.push("没有 Take 可圈选");
      continue;
    }
    if (/(弃用|reject|作废)/.test(low)) {
      const s = resolveShot(raw, d, ctx);
      const t = d.takes.filter((x) => !s || x.shotId === s.id).at(-1);
      if (t) add("take.review", { id: t.id, status: "reject" }, `弃用 ${t.name}`, ROLES.review);
      continue;
    }
    if (/导出故事版|export storyboard/.test(low)) {
      add("storyboard.export", { format: /html/.test(low) ? "html" : /md|markdown/.test(low) ? "md" : "json" }, "导出故事版", ROLES.board);
      continue;
    }
    if (/(故事版|storyboard)/.test(low)) {
      const s = /全部|所有|all/.test(low) ? null : resolveShot(raw, d, ctx);
      const list = s ? [s] : d.shots;
      for (const sh of list) add("storyboard.add", { shotId: sh.id }, `${sh.index} ${sh.title} 进故事版`, ROLES.board);
      continue;
    }
    if (/(提交|submit|生成视频|生成图|出片|出视频|队列|queue|render)/.test(low) && !/提示词|prompt/.test(low)) {
      const s = resolveShot(raw, d, ctx);
      if (!s) {
        notes.push("没有镜头可提交");
        continue;
      }
      const provider = pick(PROVIDER_WORDS, raw) || (/(图|image|静帧)/.test(low) && !/视频/.test(low) ? "flux-kontext" : "seedance-2");
      let mode = /v2v|视频生视频|白模视频|参考视频/.test(low) ? "v2v" : /i2v|图生视频/.test(low) ? "i2v" : /i2i|图生图/.test(low) ? "i2i" : /t2i|文生图|静帧|生成图/.test(low) ? "t2i" : "t2v";
      if (!PROVIDERS[provider].modes.includes(mode)) mode = PROVIDERS[provider].modes[0];
      if (!s.prompts) add("generation.prompt", { shotId: s.id }, `编译 ${s.index} 提示词`, ROLES.gen);
      add("generation.submit", { shotId: s.id, mode, provider }, `提交 ${s.index} ${s.title} → ${PROVIDERS[provider].name} ${GEN_MODES[mode]}`, ROLES.gen, { heavy: true });
      continue;
    }
    if (/(提示词|prompt)/.test(low)) {
      const s = /全部|所有|all/.test(low) ? null : resolveShot(raw, d, ctx);
      const list = s ? [s] : d.shots;
      if (!list.length) notes.push("没有镜头");
      for (const sh of list) add("generation.prompt", { shotId: sh.id }, `编译 ${sh.index} ${sh.title} 的 image / T2V / V2V 提示词`, ROLES.gen, { showPrompts: true });
      continue;
    }
    if (/(新建镜头|新镜头|加一个镜头|加个镜头|new shot|create shot|再来一镜)/.test(low)) {
      const cam = resolveCamera(raw, d, ctx);
      const motion = pick(MOTION_WORDS, raw) || "static";
      const dur = num(/(\d+(?:\.\d+)?)\s*(?:s|秒)/, raw) || 4;
      const title = (raw.match(/[「“"『]([^」”"』]+)[」”"』]/) || [])[1] || `${MOTION_TYPES[motion].zh}镜头`;
      const target = resolveEntity(raw.replace(/镜头/g, ""), d);
      const focal = num(/(\d+)\s*mm/, raw);
      const size = pick(SIZE_WORDS, raw);
      if (cam && (size || focal)) add("camera.frame", { id: cam.id, target: target?.id || cam.target, size: size || "MS", angle: pick(ANGLE_WORDS, raw) || "front_left", focalLength: focal || undefined }, `${cam.name} 按${size ? SHOT_SIZES[size].zh : "中景"}构图`, ROLES.cam);
      add("shot.create", { title, cameraId: cam?.id, duration: dur, motion, targetIds: target ? [target.id] : undefined }, `新建镜头「${title}」${dur}s ${MOTION_TYPES[motion].zh}`, ROLES.board);
      continue;
    }
    if (/(打开|切到|选中|选择|open|select).*(shot|镜)/.test(low) || /^(shot[_\s-]?\d+|\d+\s*镜)$/.test(low)) {
      const s = resolveShot(raw, d, ctx);
      if (s) {
        ctx.shot = s.id;
        add("shot.select", { id: s.id }, `打开 ${s.index} ${s.title}`, ROLES.board);
      }
      continue;
    }
    const motion = pick(MOTION_WORDS, raw);
    if (motion && /(运镜|镜头|改成|换成|用|shot|motion|镜)/.test(low) && !/机位|cam|camera/.test(low)) {
      const s = resolveShot(raw, d, ctx);
      if (!s) {
        notes.push("没有镜头可设置运镜");
        continue;
      }
      const dur = num(/(\d+(?:\.\d+)?)\s*(?:s|秒)/, raw);
      const deg = num(/(\d+)\s*(?:度|°)/, raw);
      const params = deg ? { degrees: deg } : undefined;
      add("motion.set", { shotId: s.id, type: motion, params, duration: dur || undefined }, `${s.index} 运镜 → ${MOTION_TYPES[motion].zh}${dur ? ` ${dur}s` : ""}`, ROLES.motion);
      continue;
    }
    const pose = pick(POSE_WORDS, raw);
    if (pose && /(让|叫|把|姿势|姿态|pose|摆|做)/.test(low)) {
      const e = resolveEntity(raw, d);
      if (!e || e.semanticType !== "character") {
        notes.push("找不到要摆姿势的人物");
        continue;
      }
      add("entity.pose", { id: e.id, pose }, `${e.displayName} 姿态 → ${pose}`, ROLES.cont);
      continue;
    }
    if (/(删除|移除|去掉|delete|remove)/.test(low)) {
      const e = resolveEntity(raw, d);
      if (e) add("entity.delete", { id: e.id }, `删除 ${e.displayName}`, ROLES.scene, { destructive: true });
      else notes.push("找不到要删除的对象");
      continue;
    }
    if (/(添加|新增|放一个|放个|加一个|加个|加入|create|add|放置|来一辆|来个|建一个)/.test(low) && !/镜头|shot/.test(low)) {
      const ty = pick(TYPE_WORDS, raw) || "prop";
      const xyz = parseXYZ(raw);
      let pos = xyz || [Math.round((Math.random() * 6 - 3) * 10) / 10, 0, Math.round((Math.random() * 4 - 2) * 10) / 10];
      const near = raw.match(/在(.+?)(?:旁边|左边|右边|前面|后面|附近)/);
      if (near) {
        const ref = resolveEntity(near[1], d);
        if (ref) {
          const off = /左/.test(raw) ? [-1.6, 0, 0] : /右/.test(raw) ? [1.6, 0, 0] : /前/.test(raw) ? [0, 0, 1.8] : /后/.test(raw) ? [0, 0, -1.8] : [1.2, 0, 0.6];
          pos = ref.transform.position.map((v, i) => v + off[i]);
        }
      }
      const name = (raw.match(/[「“"『]([^」”"』]+)[」”"』]/) || [])[1] || `${{ character: "人物", vehicle: "车辆", weapon: "手枪", building: "楼", tree: "树", lamp: "路灯", flower: "花", smoke: "烟雾", prop: "道具" }[ty]} ${d.entities.filter((e) => e.semanticType === ty).length + 1}`;
      const posePick = pick(POSE_WORDS, raw);
      add("entity.create", { type: ty, displayName: name, position: pos, pose: ty === "character" ? posePick || "idle" : undefined }, `放置 ${name}（${ty}）@ ${pos.map((v) => v.toFixed(1)).join(",")}`, ROLES.scene);
      continue;
    }
    if (/(机位|cam|camera|镜头高度|焦距|焦段|光圈|look|看向|对准|构图|景别|机)/i.test(low) || pick(SIZE_WORDS, raw)) {
      const cam = resolveCamera(raw, d, ctx);
      if (!cam) {
        notes.push("场景里还没有机位");
        continue;
      }
      ctx.cam = cam.id;
      const size = pick(SIZE_WORDS, raw);
      const angle = pick(ANGLE_WORDS, raw);
      const focal = num(/(\d+(?:\.\d+)?)\s*mm/i, raw);
      const ap = num(/f\s*\/?\s*(\d+(?:\.\d+)?)/i, raw);
      const lookM = raw.match(/(?:look.?at|看向|对准|看着|瞄准)\s*(.+)$/i);
      const target = lookM ? resolveEntity(lookM[1], d) : null;
      const height = num(/(?:降到|升到|高度|放到|抬到|height)\s*(\d+(?:\.\d+)?)\s*(?:m|米)?/i, raw) ?? (/(降|升|高度|抬)/.test(raw) ? num(/(\d+(?:\.\d+)?)\s*(?:m|米)/, raw) : null);
      const delta = parseDelta(raw);
      const xyz = /(移到|放在|位置|position)/.test(raw) ? parseXYZ(raw) : null;
      let did = false;
      if (size || angle) {
        add("camera.frame", { id: cam.id, target: target?.id || cam.target, size: size || cam.preset || "MS", angle: angle || "front_left", height: height ?? undefined, focalLength: focal || undefined }, `${cam.name} → ${size ? SHOT_SIZES[size].zh : "保持景别"}${angle ? " · " + COVERAGE_ANGLES[angle].zh : ""}`, ROLES.cam);
        did = true;
      } else {
        if (lookM) {
          if (target) add("camera.look-at", { id: cam.id, target: target.id }, `${cam.name} look-at ${target.displayName}`, ROLES.cam);
          else notes.push(`找不到目标「${lookM[1]}」`);
          did = true;
        }
        if (height !== null && height !== undefined) {
          add("camera.transform", { id: cam.id, height }, `${cam.name} 高度 → ${height} m`, ROLES.cam);
          did = true;
        }
        if (xyz) {
          add("camera.transform", { id: cam.id, position: xyz }, `${cam.name} 移到 ${xyz.join(",")}`, ROLES.cam);
          did = true;
        } else if (delta) {
          add("camera.transform", { id: cam.id, delta }, `${cam.name} 移动 ${delta.join(",")}`, ROLES.cam);
          did = true;
        }
        if (focal) {
          add("camera.lens", { id: cam.id, focalLength: focal }, `${cam.name} 焦距 → ${focal} mm`, ROLES.cam);
          did = true;
        }
        if (ap) {
          add("camera.lens", { id: cam.id, aperture: ap }, `${cam.name} 光圈 → f/${ap}`, ROLES.cam);
          did = true;
        }
      }
      if (motion) {
        add("camera.rig", { id: cam.id, rig: MOTION_TYPES[motion].rig }, `${cam.name} rig → ${MOTION_TYPES[motion].rig}`, ROLES.motion);
        const s = d.shots.find((x) => x.id === d.project.currentShotId);
        if (s && s.cameraId === cam.id) add("motion.set", { shotId: s.id, type: motion }, `${s.index} 运镜 → ${MOTION_TYPES[motion].zh}`, ROLES.motion);
        did = true;
      }
      if (/(pilot|切到|用|program|拍摄机)/.test(low) && !did) {
        add("camera.pilot", { id: cam.id }, `Program → ${cam.name}`, ROLES.cam);
        did = true;
      }
      if (did) {
        add("camera.pilot", { id: cam.id }, `Program → ${cam.name}`, ROLES.cam, { quiet: true });
        continue;
      }
    }
    if (/(移到|挪到|移动|放到|往|向|靠近|move)/.test(low)) {
      const e = resolveEntity(raw, d);
      if (!e) {
        notes.push("找不到要移动的对象");
        continue;
      }
      const xyz = parseXYZ(raw);
      const delta = parseDelta(raw);
      const near = raw.match(/靠近\s*(.+)$/);
      if (xyz) add("entity.transform", { id: e.id, position: xyz }, `${e.displayName} 移到 ${xyz.join(",")}`, ROLES.cont);
      else if (delta) add("entity.transform", { id: e.id, delta }, `${e.displayName} 移动 ${delta.join(",")}`, ROLES.cont);
      else if (near) {
        const ref = resolveEntity(near[1], d);
        if (ref) {
          const p = ref.transform.position, q = e.transform.position;
          const dir = [p[0] - q[0], 0, p[2] - q[2]];
          const len = Math.hypot(dir[0], dir[2]) || 1;
          const np = [p[0] - (dir[0] / len) * 1.2, q[1], p[2] - (dir[2] / len) * 1.2];
          add("entity.transform", { id: e.id, position: np }, `${e.displayName} 靠近 ${ref.displayName}`, ROLES.cont);
        }
      } else notes.push("没解析到位置");
      continue;
    }
    if (/(2\.39|宽银幕|anamorphic)/.test(low)) add("project.set-aspect", { aspect: "2.39:1" }, "画幅 → 2.39:1", ROLES.cam);
    else if (/(16:9|16比9)/.test(low)) add("project.set-aspect", { aspect: "16:9" }, "画幅 → 16:9", ROLES.cam);
    else if (/(竖屏|9:16|vertical)/.test(low)) add("project.set-aspect", { aspect: "9:16" }, "画幅 → 9:16", ROLES.cam);
    else if (/(记住|备注|remember|note)/.test(low)) {
      const e = resolveEntity(raw, d);
      const txt = raw.replace(/.*?(记住|备注|remember|note)[:：]?\s*/, "");
      if (e) add("entity.update", { id: e.id, remember: txt }, `${e.displayName} 连续性备注 +1`, ROLES.cont);
      else notes.push("找不到要备注的对象");
    } else if (/^(edit|blocking|rehearsal|review|approved)$/i.test(low.trim()) || /进入\s*(EDIT|BLOCKING|REHEARSAL|REVIEW|APPROVED)/i.test(raw)) {
      const st = (raw.match(/(EDIT|BLOCKING|REHEARSAL|REVIEW|APPROVED)/i) || [])[1].toUpperCase();
      add("project.set-state", { state: st }, `状态机 → ${st}`, ROLES.plan);
    } else notes.push(`没听懂「${raw}」`);
  }
  return { text, steps, notes, needsConfirm: steps.some((s) => s.destructive || s.heavy) };
}

// ---------- execution ----------
function toolCard(step, result) {
  const ok = result.ok;
  const short = ok ? (result.id ? `ok · ${result.id}` : "ok") : `${result.error}${result.hint ? " · " + result.hint : ""}${result.issues ? " · " + result.issues.join("；") : ""}`;
  say("tool", `${step.label}\n${step.action} ${JSON.stringify(step.payload)}\n→ ${short}`, { action: step.action, payload: step.payload, result, eventId: result.eventId, role: "tool", actor: step.role, targetIds: result.targetIds || [result.id || step.payload.id].filter(Boolean), ok });
}

export function executePlan(p, source = "agent") {
  const results = [];
  const label = `agent: ${p.text.slice(0, 40)}`;
  const many = p.steps.filter((s) => !s.quiet).length > 1;
  const run = (bm) => {
    for (const step of p.steps) {
      const r = dispatch(step.action, step.payload, { ...bm, source, actorId: step.role });
      results.push({ step, result: r });
      if (!step.quiet || !r.ok) toolCard(step, r);
      if (step.showPrompts && r.ok && r.prompts) {
        say("agent", `【${step.payload.shotId} · Image】\n${r.prompts.image.en}\n\n【T2V】\n${r.prompts.video.en}\n\n【V2V】\n${r.prompts.v2v.en}`, { prompts: r.prompts, shotId: step.payload.shotId });
      }
      if (step.action === "context.scene" && r.ok) say("agent", "```\n" + JSON.stringify(r.data, null, 1).slice(0, 2400) + "\n```");
      if (step.action === "storyboard.export" && r.ok) say("agent", `故事版已导出（${r.format}，${r.content.length} 字）。`, { download: { name: `storyboard.${r.format}`, content: r.content } });
    }
    return { count: results.length };
  };
  if (many) batch(label, run, { source, actorId: "director-planner" });
  else run({});
  const okCount = results.filter((x) => x.result.ok).length;
  return { results, okCount, failed: results.length - okCount };
}

export function runAgent(text, opts = {}) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  say("user", raw);
  const d = store.get();
  const p = plan(raw, d);
  if (p.notes.includes("help") || (!p.steps.length && !p.notes.length)) {
    say("agent", helpText());
    return { plan: p };
  }
  if (!p.steps.length) {
    say("agent", `${p.notes.join("；")}。\n${helpText(true)}`);
    return { plan: p };
  }
  return runPlan(p, opts);
}

// Execute / stage a plan (from the rule planner or an external LLM planner) according to the agent mode:
// manual → only show it; collaborative → ask for confirmation when needed; lead → run now.
export function runPlan(p, opts = {}) {
  const d = store.get();
  const mode = opts.mode || d.agent.mode;
  if (!p.steps.length) {
    say("agent", p.reply || (p.notes.length ? `${p.notes.join("；")}。` : helpText(true)));
    return { plan: p };
  }
  if (mode === "manual") {
    say("plan", `Manual 模式：我不执行，只给方案。你可以逐条点「执行」。`, { plan: p, manual: true });
    return { plan: p };
  }
  if (mode === "collaborative" && (p.needsConfirm || p.steps.filter((s) => !s.quiet).length > 2) && !opts.force) {
    store.patch((x) => (x.agent.pendingPlan = p));
    say("plan", `方案（${p.steps.length} 步）。确认后执行，全部可撤销。`, { plan: p, pending: true });
    return { plan: p, pending: true };
  }
  const out = executePlan(p, opts.source || "agent");
  say("agent", (p.reply ? p.reply + "\n" : "") + summaryText(p, out));
  return { plan: p, ...out };
}

export function confirmPlan() {
  const p = store.get().agent.pendingPlan;
  if (!p) return null;
  store.patch((x) => {
    x.agent.pendingPlan = null;
    x.agent.messages = x.agent.messages.map((m) => (m.pending ? { ...m, pending: false, confirmed: true } : m));
  });
  const out = executePlan(p);
  say("agent", summaryText(p, out));
  return out;
}

export function cancelPlan() {
  store.patch((x) => {
    x.agent.pendingPlan = null;
    x.agent.messages = x.agent.messages.map((m) => (m.pending ? { ...m, pending: false, cancelled: true } : m));
  });
  say("agent", "已取消，没有改动。");
}

export function runStep(step) {
  const r = dispatch(step.action, step.payload, { source: "agent", actorId: step.role });
  toolCard(step, r);
  return r;
}

function summaryText(p, out) {
  const s = summarize();
  const bits = [`完成 ${out.okCount}/${out.results.length} 步${out.failed ? `（${out.failed} 步失败，见工具卡片）` : ""}。`];
  if (p.steps.some((x) => x.action === "scene.demo")) bits.push(`${s.scene.name} · 物体 ${s.entities.length} · 机位 ${s.cameras.length} · 灯 ${s.lights.length} · 镜头 ${s.shots.length}。镜头条已就绪，可以说「录制 shot_002」「给 03 镜生成 V2V 提示词」「把 A 机降到 0.4m 并 look-at 主角车」。`);
  if (p.notes.length) bits.push(`未处理：${p.notes.join("；")}。`);
  if (s.project.state === "RECORDING") bits.push("正在录制白模 Take，结束后自动进入 REVIEW。");
  return bits.join("\n");
}

function helpText(short = false) {
  const lines = [
    "我通过 Action Registry 操作导演台，每一步都进 Event Log、可撤销。试试：",
    "• 搭建一支速度与激情风格的夜景汽车宣传片 / 载入城市边缘",
    "• 把 A 机降到 0.4m 并 look-at 主角车 / Program 机位改成 70mm 特写 前左",
    "• 03 镜改成环绕 120 度 5 秒 / 新建镜头「对峙」6秒 手持 看向对手",
    "• 让对手举枪 / 让 B 跑起来 / 把主角往左移 1m",
    "• 换成日落逆光 / 切到形态可读 / 切到白模",
    "• 录制 shot_02 / 圈选 / 全部进故事版",
    "• 给 03 镜生成提示词 / 提交 shot_02 视频生视频 seedance",
    "• 查看当前 context / 撤销",
  ];
  return short ? lines.slice(0, 4).join("\n") : lines.join("\n");
}

register("agent.run", {
  doc: "把一句自然语言指令交给 Agent 规划并执行（mode: lead 直接执行 / collaborative 需确认 / manual 只出方案）",
  params: { text: "string", mode: "lead|collaborative|manual", force: "boolean (skip confirm)" },
  required: ["text"],
  undoable: false,
  handler({ text, mode, force }, meta) {
    const out = runAgent(text, { mode: mode || store.get().agent.mode || "lead", force: force === true, source: "agent" });
    return { ok: true, plan: out?.plan?.steps?.map((s) => ({ action: s.action, payload: s.payload, label: s.label, role: s.role })), notes: out?.plan?.notes, results: out?.results?.map((r) => ({ action: r.step.action, ok: r.result.ok, id: r.result.id, error: r.result.error })), pending: !!out?.pending };
  },
});

register("agent.confirm", {
  doc: "确认并执行 Collaborative 模式下待确认的方案",
  undoable: false,
  handler: () => {
    const out = confirmPlan();
    if (!out) return { ok: false, error: "NO_PENDING_PLAN" };
    return { ok: true, okCount: out.okCount, failed: out.failed, results: out.results.map((r) => ({ action: r.step.action, ok: r.result.ok, id: r.result.id, error: r.result.error })) };
  },
});

register("agent.cancel", {
  doc: "取消待确认的方案（不做任何改动）",
  undoable: false,
  handler: () => {
    if (!store.get().agent.pendingPlan) return { ok: false, error: "NO_PENDING_PLAN" };
    cancelPlan();
    return { ok: true };
  },
});

register("agent.run-step", {
  doc: "执行方案中的单独一步（Manual 模式逐条执行）：step = {action, payload, label, role}",
  params: { step: "object", messageId: "string", index: "number" },
  undoable: false,
  handler: ({ step, messageId, index }) => {
    let st = step;
    if (!st && messageId !== undefined) st = store.get().agent.messages.find((m) => m.id === messageId)?.plan?.steps?.[Number(index)];
    if (!st || !st.action) return { ok: false, error: "NO_STEP" };
    const r = runStep(st);
    return { ok: !!r.ok, result: r };
  },
});

register("agent.set-mode", {
  doc: "设置 Agent 工作模式：collaborative 出方案再确认 / lead 直接执行 / manual 只出方案",
  params: { mode: "collaborative|lead|manual" },
  required: ["mode"],
  undoable: false,
  validate: ({ mode }) => (["collaborative", "lead", "manual"].includes(mode) ? null : { error: "BAD_MODE" }),
  handler: ({ mode }) => {
    store.patch((x) => (x.agent.mode = mode));
    return { ok: true, mode };
  },
});

register("agent.set-backend", {
  doc: "选择 Agent 规划后端：rules（内置规则规划器）或后端配置的 LLM 模型名（见 /api/health 的 llm.models）",
  params: { backend: "rules | <model id>" },
  required: ["backend"],
  undoable: false,
  handler: ({ backend }) => {
    store.patch((x) => (x.agent.backend = String(backend)));
    store.light((x) => (x.health.llm = String(backend)));
    return { ok: true, backend };
  },
});

register("agent.say", {
  doc: "向 Agent 会话追加一条消息（外部 LLM 后端把回复写回会话用）",
  params: { role: "agent|user|plan", text: "string" },
  required: ["text"],
  undoable: false,
  handler: ({ role, text }) => {
    say(role || "agent", text);
    return { ok: true };
  },
});

register("agent.plan", {
  doc: "只规划不执行：返回自然语言指令对应的 Action 列表",
  params: { text: "string" },
  required: ["text"],
  undoable: false,
  handler: ({ text }) => {
    const p = plan(text);
    return { ok: true, steps: p.steps.map((s) => ({ action: s.action, payload: s.payload, label: s.label, role: s.role })), notes: p.notes, needsConfirm: p.needsConfirm };
  },
});

export { capabilities, helpText };
