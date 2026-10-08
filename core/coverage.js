// 一条素材 → 多机位覆盖。
//
// 出处是 Scenario 的那条实测：一条 19.53 秒的固定机位素材，没有第二台机器、没有重拍，
// Seedance 2.5 把同一瞬间从 13 个新机位又拍了一遍，原声保持同步。做法是一段带时间码的机位清单，
// 每段只说一件事 —— 这一秒镜头站在哪、用什么焦段 —— 外加一条硬约束：
// 表演、身体、手、服装、环境、音轨全都不许动，唯一的变量是机位和镜头。
//
// 为什么这件事该由导演台来做，而不是让人自己写那 13 段。那份清单里每一句都是一个机位描述：
// 「从他右上方约 40 度俯视的中近景」「镜头贴在桌面高度」「过右肩」。人写这些是在猜角度和高度，
// 而导演台这边它们是**算出来的**：景别定距离和焦段（SHOT_SIZES），覆盖角定方位和高度（COVERAGE_ANGLES），
// 主体的实际尺寸定机位离地多少米 —— 和 camera.frame 真正摆机位用的是同一套公式。
// 所以这里生成的不是一段文案，是一份「每一条都能在 3D 里摆出来」的机位表。
import { SHOT_SIZES, COVERAGE_ANGLES } from "./schema.js";
import { entityStateAt } from "./motion.js";

// 一副「牌」：常用的机位组合，按变化幅度排开。挑的时候顺着走，相邻两段不会撞在同一个方位上 ——
// 原帖 13 段里没有两段连着重复，这是剪起来能看的前提。
//
// note 里只说**方位和用意**（在他右前方、过右肩、落在手上），绝不说高低和俯仰。
// 高度和俯仰角是下面按主体尺寸算出来的，牌面上再写一遍就会自相矛盾：
// 写过一版「正脸，坐姿视平」，而算出来是俯 26 度 —— 一句互相打架的机位指令，
// 模型只会二选一，而你不知道它选了哪个。
const DECK = [
  { size: "MCU", angle: "front_right", note: { zh: "从他右前上方", en: "from his upper front-right" } },
  { size: "ECU", angle: "front", note: { zh: "在原机位轴线上，正脸", en: "on the A-camera axis, dead front" } },
  { size: "ECU", angle: "low", note: { zh: "贴着桌面的微距，落在手上", en: "macro at table height, on the hands" } },
  { size: "WS", angle: "overhead", note: { zh: "从高处俯看整张桌子", en: "from high above, looking down over the whole table" } },
  { size: "MCU", angle: "low", note: { zh: "镜头搁在桌面上，几乎与台面齐平", en: "lens resting on the table, almost level with the surface" } },
  { size: "WS", angle: "front", note: { zh: "第一人称视角", en: "first-person POV" } },
  { size: "ELS", angle: "front", note: { zh: "退到最远，慢慢拉开", en: "pulled back all the way, slow dolly out" } },
  { size: "MS", angle: "profile_left", note: { zh: "在他左侧，正侧面", en: "square to his left side" } },
  { size: "MCU", angle: "rear_right", note: { zh: "在他身后，过右肩", en: "behind him, over the right shoulder" } },
  { size: "ECU", angle: "front_left", note: { zh: "落在嘴和下颌上", en: "on the mouth and jaw" } },
  { size: "MS", angle: "profile_right", note: { zh: "从他右侧慢慢环到正面", en: "slow orbit from his right toward the front" } },
  { size: "MLS", angle: "back", note: { zh: "在他背后，看他面对的东西", en: "from behind, on what he faces" } },
  { size: "CU", angle: "front_left", note: { zh: "前左 3/4", en: "front three-quarter from the left" } },
];

// 一段多长。原帖 19.53 秒切了 13 段，平均 1.5 秒；段长在 1–3 秒之间。
// 比这更碎就不是机位切换了，是闪频。
export const SEG_MIN = 1, SEG_MAX = 3, SEG_TARGET = 1.5;
export const MAX_ANGLES = DECK.length;

const round = (n, p = 2) => Math.round(n * 10 ** p) / 10 ** p;
const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}${Math.round(s % 1 * 10) ? "." + Math.round((s % 1) * 10) : ""}`;

/** 这条素材切几段最合适：按 1.5 秒一段，夹在 3 到 13 之间 */
export function suggestCount(seconds) {
  return Math.max(3, Math.min(MAX_ANGLES, Math.round(seconds / SEG_TARGET)));
}

/**
 * 算出这一镜的机位表。每一条都带真实的米数和度数 —— 和 camera.frame 摆机位用的是同一套公式，
 * 所以「离地 1.15 米」不是形容词，是真能摆出来的那个数。
 * @param shot 镜头
 * @param d    工程状态
 * @param opts { count }
 */
export function planCoverage(shot, d = {}, opts = {}) {
  const fps = d.project?.fps || 24;
  const seconds = round((shot.range.outFrame - shot.range.inFrame) / fps, 2);
  const want = Math.max(2, Math.min(MAX_ANGLES, Math.round(Number(opts.count) || suggestCount(seconds))));
  const ent = (d.entities || []).find((e) => e.id === (shot.targetIds || [])[0]) || null;
  const dims = ent?.proxy?.dimensions || [1, 1.7, 1];
  const h = dims[1] || 1.7, max = Math.max(...dims);
  const st = ent ? entityStateAt(ent, shot.range.inFrame) : null;
  const eye = (st?.position?.[1] ?? ent?.transform?.position?.[1] ?? 0) + h / 2;

  const seg = seconds / want;
  const segments = [];
  for (let i = 0; i < want; i++) {
    const card = DECK[i % DECK.length];
    const S = SHOT_SIZES[card.size], A = COVERAGE_ANGLES[card.angle];
    // 和 camera.frame 一模一样的两行：距离按景别 × 主体尺寸，高度围绕主体实际高度上下摆
    const dist = round(Math.max(0.6, S.distance * Math.max(h, max * 0.6)));
    const height = round(Math.max(0.15, eye + h * ((A.height ?? S.height) - 0.5)));
    // 俯仰角：机位比主体眼高多少，换算成看下去多少度
    // 机位比主体眼高高多少，就要往下看多少度。正数 = 俯。
    // （写反过一次：算出来机位离地 1.49 米、主体眼高 0.85 米，却印成「仰 15 度」——
    //  一句自相矛盾的机位指令，模型只会二选一，而你不知道它选了哪个。）
    const pitch = Math.round((Math.atan2(height - eye, dist) * 180) / Math.PI);
    // 末段的收尾直接用 seconds 本身，不再四舍五入：整条声明 19.54 秒而机位表只排到 19.5，
    // 差的那 0.04 秒就是原声对不上的地方 —— 而「原声保持同步」正是这套做法的全部意义。
    const from = round(i * seg, 1), to = i === want - 1 ? seconds : round((i + 1) * seg, 1);
    segments.push({
      index: i + 1, from, to, span: `${clock(from)}-${clock(to)}`, size: card.size, angle: card.angle,
      focal: S.focal, distance: dist, height, pitch, note: card.note,
      zh: `机位 ${i + 1}：${card.note.zh}。${SHOT_SIZES[card.size].zh}，${S.focal}mm，离主体约 ${dist} 米，机位离地 ${height} 米${pitch >= 8 ? `，俯 ${pitch} 度` : pitch <= -8 ? `，仰 ${Math.abs(pitch)} 度` : "，基本平视"}。`,
      en: `Camera ${i + 1}: ${card.note.en}. ${S.en}, ${S.focal}mm, about ${dist}m from the subject, lens ${height}m off the floor${pitch >= 8 ? `, angled ${pitch}° down` : pitch <= -8 ? `, angled ${Math.abs(pitch)}° up` : ", essentially level"}.`,
    });
  }
  return { seconds, count: want, segments, deck: "director/coverage-1" };
}

/**
 * 编译成给模型的那段话。结构照原帖：先声明这是同一条素材的重拍、再是带时间码的机位表、
 * 最后一条硬约束。约束放最后是有道理的 —— 前面每一段都在说「换机位」，
 * 不在末尾把「别的都不许换」钉死，模型会顺手把表演也重演一遍。
 * @param source 素材说明，例如 "@video1"
 */
export function coveragePrompt(shot, d = {}, plan, lang = "zh", source = "@video1") {
  const p = plan || planCoverage(shot, d);
  if (lang === "en") {
    return [
      `${source} is one finished take: a single locked-off shot, ${p.seconds}s, with its original audio.`,
      `Photograph the same moment again from ${p.count} new camera positions. Output runs the full ${p.seconds}s and keeps the audio of ${source} unchanged and in sync.`,
      "",
      ...p.segments.map((s) => `[${s.span}] ${s.en}`),
      "",
      "DO NOT CHANGE: performance, body, hands, wardrobe, props, set, lighting or audio. The only variable is camera position and lens.",
    ].join("\n");
  }
  return [
    `${source} 是一条已经拍完的素材：单机位固定镜头，${p.seconds} 秒，带原声。`,
    `把同一瞬间从 ${p.count} 个新机位再拍一遍。输出跑满 ${p.seconds} 秒，${source} 的原声原样保留并保持同步。`,
    "",
    ...p.segments.map((s) => `[${s.span}] ${s.zh}`),
    "",
    "不许改动：表演、身体、手、服装、道具、布景、光线、音轨。唯一的变量是机位和镜头。",
  ].join("\n");
}
