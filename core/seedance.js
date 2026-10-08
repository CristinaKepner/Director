// Seedance 提示词模板：选一个结构，并把导演台已有的数字按那个结构排出来。
//
// 这一层解决的是一个很具体的缺口。导演台知道**空间**：焦段、机位高度、景别、运镜、每一拍多少秒 ——
// 这些是从 3D 场景里编译出来的数字，不用猜。它不知道的是**话该怎么写**：同样的机位，
// 写成什么句式、什么顺序、哪些词放前面，Seedance 出来的东西差很远。那是几百条验证过的案例才总结得出的，
// 不是这个仓库该自己拍脑袋定的。
//
// 所以引入 awesome-seedance（MIT，见 core/seedance-library.js 顶部的 commit）：
// 它把 460 多条对照过原帖的案例蒸馏成 25 个模板，每个模板带 structure（块怎么排）、
// guidance（每块怎么写）、pitfalls（写错会怎样）。
//
// 这里只做三件事，都不含判断题：
//   pickTemplate  —— 按这一镜已有的信号挑一个模板，并说出为什么挑它
//   timelineBlock —— 把 shot.beats 排成 `[00:00-00:04] 第 1 拍：…`
//   promptNotes   —— 把 pitfalls 里能机械检查的几条真的查一遍
//
// 为什么是 beats 最要紧：他们的数据说「207 条里 63 条用了时间分段，Seedance 2.5 里升到 45%，
// 不分段的那一半六秒之后明显漂移」。而导演台**早就有** shot.beats（拆长镜头用的），
// 只是它从来没进过提示词。这一条接上去，是这次集成里唯一一处「本来就有数据、只差没写出去」的地方。
import { SEEDANCE_LIBRARY } from "./seedance-library.js";

export const SEEDANCE_SOURCE = SEEDANCE_LIBRARY.source;
export const CATEGORIES = SEEDANCE_LIBRARY.categories;
export const TEMPLATES = SEEDANCE_LIBRARY.templates;
const BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]));

export const templateById = (id) => BY_ID.get(id) || null;
export const templateTitle = (t, lang = "zh") => (t ? t.title?.[lang] || t.title?.en || t.id : "");

// 一拍的时长落在哪个区间才稳。上游的原话：2–5 秒；纪录片跟拍 2 秒一拍，广告 3 秒，
// 卡音乐的 MV 可以到亚秒级。低于 2 秒的那些都要求有音频输入，导演台这条链上没有，所以按 2 起。
export const BEAT_MIN = 2, BEAT_MAX = 5;
// 纯文字生成的时间分辨率大约 0.5 秒，写到 0.01 秒只是多几位数字。所以段边界一律对齐到半秒。
const snap = (s) => Math.round(s * 2) / 2;
const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}${s % 1 ? "." + String(Math.round((s % 1) * 10)) : ""}`;

const has = (t, tag) => (t?.tags || []).includes(tag);
const styleText = (d) => `${d?.project?.style || ""} ${d?.project?.styleZh || ""}`;

/**
 * 按这一镜已有的信号挑一个模板。顺序是「具体 → 通用」：
 * 先看有没有只有它能对上的信号（对白、车、动物、动画风格），再退到结构性的（分拍、长度）。
 * 返回 { template, why }；why 会显示在界面上，所以写成一句人话。
 * @param shot 镜头
 * @param d    工程状态（要 entities / project）
 */
export function pickTemplate(shot, d = {}) {
  const pick = (id, why) => (BY_ID.has(id) ? { template: BY_ID.get(id), why, auto: true } : null);
  const targets = (shot?.targetIds || []).map((id) => (d.entities || []).find((e) => e.id === id)).filter(Boolean);
  const kinds = new Set(targets.map((e) => e.semanticType));
  const seconds = d.project?.fps ? (shot.range.outFrame - shot.range.inFrame) / d.project.fps : 0;
  const beats = (shot?.beats || []).length;
  const motion = shot?.motion?.type || "static";
  const style = styleText(d);

  return (
    (shot?.dialogue?.trim() && pick("dialogue-performance-beats", "这一镜有台词：对白模板管口型和表演节奏"))
    || (kinds.has("vehicle") && pick("car-vehicle", "画面里有车：车辆模板管速度感和轮胎接地"))
    || (kinds.has("animal") && pick("pet-animal", "画面里有动物：动物模板管毛发和不可预期的动作"))
    || (/anime|动漫|二次元|赛璐璐/i.test(style) && pick("anime-style-lock", "工程风格写着动漫：动画模板锁住画风不跑"))
    || (/cartoon|卡通|3d ?动画|pixar/i.test(style) && pick("3d-cartoon", "工程风格写着 3D 卡通"))
    || (/horror|恐怖|惊悚/i.test(style) && pick("horror-suspense", "工程风格写着恐怖/惊悚"))
    || (["chase", "handheld"].includes(motion) && pick("pov-continuous-take", `运镜是${motion === "chase" ? "跟拍" : "手持"}：一镜到底模板管抖动和连贯`))
    || (["combat"].includes(motion) && pick("combat-choreography", "运镜是打斗：动作模板管招式的物理可信"))
    || (beats >= 2 && pick("timeline-shot-script", `这一镜拆了 ${beats} 拍：时间轴模板就是为分拍写的，整个案例库里承重最强的结构`))
    || (seconds > 8 && pick("timeline-shot-script", `这一镜 ${seconds.toFixed(1)} 秒：超过 8 秒不分段，六秒之后会明显漂移`))
    || pick("cinematic-narrative-short", "没有更具体的信号：按叙事短片的通用结构写")
    || { template: TEMPLATES[0], why: "默认", auto: true }
  );
}

/** 这一镜最终用哪个模板：镜头上钉的 → 工程上钉的 → 自动挑的 */
export function templateFor(shot, d = {}) {
  const fixed = shot?.promptTemplate || d.project?.promptTemplate || null;
  if (fixed && BY_ID.has(fixed)) return { template: BY_ID.get(fixed), why: shot?.promptTemplate ? "这一镜指定的" : "整条工程指定的", auto: false };
  return pickTemplate(shot, d);
}

/**
 * 把 beats 排成时间轴块。段首尾相接、合计等于镜头时长 —— 这两条是上游点名的坑：
 * 声明了 30 秒却只列到 24 秒，模型会把最后一拍拉长去填那 6 秒。
 * @returns string[]（每段一行）；没有拍就返回空数组
 */
export function timelineBlock(shot, d = {}, lang = "zh") {
  const beats = shot?.beats || [];
  if (!beats.length) return [];
  const fps = d.project?.fps || 24;
  const total = (shot.range.outFrame - shot.range.inFrame) / fps;
  const sum = beats.reduce((n, b) => n + (Number(b.seconds) || 0), 0) || total;
  const k = sum > 0 ? total / sum : 1; // 拍的合计和镜头时长对不上时按比例摊平，别让末尾空一段
  const out = [];
  let t = 0;
  beats.forEach((b, i) => {
    const dur = snap(Math.max(0.5, (Number(b.seconds) || total / beats.length) * k));
    // 最后一段的收尾必须正好落在声明的时长上。差 0.1 秒也不行 —— 上游点名的坑就是
    // 「声明 30 秒只列到 24 秒，模型会把最后一拍拉长去填」，这里对齐半秒之后很容易差那么一点。
    const a = snap(t), z = i === beats.length - 1 ? Math.round(total * 10) / 10 : snap(Math.min(total, t + dur));
    t += dur;
    const text = String(b.text || "").trim();
    out.push(lang === "en"
      ? `[${clock(a)}-${clock(z)}] Beat ${i + 1}: ${text || "continue the action"}`
      : `[${clock(a)}-${clock(z)}] 第 ${i + 1} 拍：${text || "延续上一拍的动作"}`);
  });
  return out;
}

/**
 * 把 pitfalls 里能机械查的几条真的查一遍。返回的每条都带出处（哪个模板说的），
 * 因为这些不是这个仓库的判断，是别人几百条案例里数出来的。
 * @returns [{ level, text, from }]
 */
export function promptNotes(shot, d = {}, tpl = null) {
  const notes = [];
  const t = tpl || templateFor(shot, d).template;
  const fps = d.project?.fps || 24;
  const seconds = (shot.range.outFrame - shot.range.inFrame) / fps;
  const beats = shot?.beats || [];
  const say = (level, text) => notes.push({ level, text, from: t?.id || null });

  if (!beats.length && seconds > 8) {
    say("warn", `${seconds.toFixed(1)} 秒没有分拍。案例库里声明了时长却不分段的那一半，六秒之后明显漂移 —— 先 shot.beats 拆一遍`);
  }
  if (beats.length) {
    const sum = beats.reduce((n, b) => n + (Number(b.seconds) || 0), 0);
    if (Math.abs(sum - seconds) > 0.6) {
      say("warn", `分拍合计 ${sum.toFixed(1)} 秒，镜头是 ${seconds.toFixed(1)} 秒。对不上模型会把最后一拍拉长去填 —— 提示词里已按比例摊平，但最好改一下拍`);
    }
    const bad = beats.map((b, i) => ({ i: i + 1, s: Number(b.seconds) || 0 })).filter((x) => x.s && (x.s < BEAT_MIN || x.s > BEAT_MAX));
    if (bad.length) {
      say("info", `第 ${bad.map((x) => x.i).join("、")} 拍是 ${bad.map((x) => x.s + "s").join("、")}，建议 ${BEAT_MIN}–${BEAT_MAX} 秒一拍。更短要有音频输入才卡得住`);
    }
  }
  // 身份一致：模板自己说要锁脸的时候才提，否则是句废话
  if (has(t, "character-consistency") || has(t, "reference-lock")) {
    const targets = (shot?.targetIds || []).map((id) => (d.entities || []).find((e) => e.id === id)).filter(Boolean);
    const people = targets.filter((e) => ["character", "animal"].includes(e.semanticType));
    const approved = (d.assets || []).filter((a) => a.approved && people.some((e) => e.id === a.entityId));
    if (people.length && !approved.length) {
      say("warn", `${templateTitle(t)}要靠参考图锁住身份，这一镜的 ${people.length} 个角色一张已批准的都没有 —— 跨拍会换脸`);
    }
  }
  return notes;
}

/** 给 Agent 和界面用的清单：模板都有哪些、分别管什么 */
export function templateList(lang = "zh") {
  return TEMPLATES.map((t) => ({
    id: t.id,
    title: templateTitle(t, lang),
    category: t.category,
    categoryTitle: CATEGORIES.find((c) => c.id === t.category)?.title?.[lang] || t.category,
    tags: t.tags || [],
    useWhen: t.useWhen?.[lang] || t.useWhen?.en || "",
    description: t.description?.[lang] || t.description?.en || "",
  }));
}
