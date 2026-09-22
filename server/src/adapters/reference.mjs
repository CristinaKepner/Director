// 参照读取：一张图 / 一段视频 → 结构化的场景描述 + 一句可以直接拿去建场的 brief。
//
// 为什么这是入口而不是"说一句话"：创作者最难的一步恰恰是想那句话。但他们手里有图、有片子、
// 有想复刻的参考。而一张画面里恰好编码了最难用语言表达的东西 —— 景别、机位高度、焦段感、
// 光位、色调、构图关系。用嘴说这些要专业词汇，用图给只要拖一下。
//
// 这一层只负责"看懂"，不负责建场。看懂的结果交给 planner 去翻成 Action，
// 所以撤销、事件日志、状态机一样都不少。
const SYS = `你是电影摄影指导。给你一组画面（来自同一个镜头，按时间顺序，带秒数），读出可以用来复刻它的拍摄参数。
只输出一个 JSON 对象：
{
 "summary":"一句话说这是什么画面",
 "brief":"<可以直接拿去建场的一句话，像导演口述：谁在什么场景做什么，什么景别什么光。不要写'这张图片显示'>",
 "scene":{"name":"<场次名>","timeOfDay":"<晨/午/黄昏/夜/室内无自然光>","palette":"<主色调，具体到颜色>","mood":"<氛围>","setting":"<室内外与空间类型>"},
 "subjects":[{"semanticType":"character|vehicle|prop|building|animal|food","displayName":"<中文名>","look":"<外观：服装/材质/颜色，越具体越好>","screenPosition":"<在画面里的位置，如 中央偏左/前景右下>","sizeInFrame":"<占画幅比例，如 约1/3>","count":<同类有几个，一个人是 1，七个伴舞写 7>}],
 "camera":{"shotSize":"ECU|CU|MCU|MS|MLS|LS|ELS","angle":"eye|low|high|overhead|dutch","heightMeters":<机位离地高度估计>,"focalMm":<等效焦段估计>,"aperture":<光圈估计>,"framing":"<构图说明：主体在三分线哪、有无前景遮挡、留白在哪>"},
 "lighting":{"keyDirection":"<主光方向，如 左后方45度>","ratio":"<明暗比，如 高反差/柔和>","colorTemp":"<色温感受>","practicals":["<画面内可见光源>"]},
 "motion":{"type":"static|push-in|dolly-out|truck-left|truck-right|pan|tilt|crane|orbit|handheld","description":"<运镜怎么走>","speed":"slow|medium|fast"},
 "beats":[{"seconds":<这一拍多久>,"text":"<这一拍发生什么>"}],
 "notes":["<你不确定的地方>"]
}
规则：
- 只给一帧时，motion 填 static、beats 给空数组。多帧时才判断运镜：主体在画面里横移而背景透视跟着变是 truck；主体不动而背景横扫是 pan；主体变大变小是 push-in / dolly-out 或变焦。看不准就写 static 并记进 notes。
- heightMeters / focalMm / aperture 都是估计值，按画面透视和景深给一个合理数字，不要留空。
- subjects 只列画面里真实存在、且需要在 3D 里摆位的主体，最多 6 个。背景楼群、地面这类不用逐个列。
- brief 是给导演台建场用的，要能独立成立：读它的人看不到原图。`;

// 整条片子：先分场景，再逐场读同样的参数。顶层那份仍然要给（兼容旧结果，也是「整条的气质」），
// scenes[] 每一段是一块白模台：主体、机位、光、运镜各自一份，缺了就继承顶层。
// 最多 9 段 —— 台面是 1/3/6/9 宫格；再多就合并相邻、相似的段。
const SYS_SCENES = `你是电影摄影指导兼剪辑。给你一条片子按时间均匀抽出的一组画面（带秒数），先把它切成场景段，再读出每一段可以用来复刻它的拍摄参数。
只输出一个 JSON 对象：
{
 "summary":"一句话说这条片子是什么",
 "brief":"<整条的气质，像导演口述：什么调性、什么节奏。不要写'这张图片显示'>",
 "scene":{"name":"<整条的名字>","timeOfDay":"<主要的时段>","palette":"<主色调>","mood":"<氛围>","setting":"<主要的空间类型>"},
 "subjects":[{"semanticType":"character|vehicle|prop|building|animal|food","displayName":"<中文名>","look":"<外观>","screenPosition":"<位置>","sizeInFrame":"<占幅>"}],
 "camera":{"shotSize":"ECU|CU|MCU|MS|MLS|LS|ELS","angle":"eye|low|high|overhead|dutch","heightMeters":<米>,"focalMm":<mm>,"aperture":<f>,"framing":"<最典型的构图>"},
 "lighting":{"keyDirection":"<主光方向>","ratio":"<明暗比>","colorTemp":"<色温>","practicals":["<画面内光源>"]},
 "motion":{"type":"static|push-in|dolly-out|truck-left|truck-right|pan|tilt|crane|orbit|handheld","description":"<最典型的运镜>","speed":"slow|medium|fast"},
 "scenes":[
  {
   "name":"<这一场的名字，如 天台黄昏 / 厨房特写>",
   "from":<起始秒>,"to":<结束秒>,
   "brief":"<这一场像导演口述：谁在什么场景做什么，什么景别什么光>",
   "scene":{"name":"<场次名>","timeOfDay":"","palette":"","mood":"","setting":""},
   "subjects":[{"semanticType":"character|vehicle|prop|building|animal|food","displayName":"","look":"","screenPosition":"","sizeInFrame":"","count":<同类有几个；一个人就是 1，七个伴舞就写 7>}],
   "camera":{"shotSize":"ECU|CU|MCU|MS|MLS|LS|ELS","angle":"eye|low|high|overhead|dutch","heightMeters":<米>,"focalMm":<mm>,"aperture":<f>,"framing":""},
   "lighting":{"keyDirection":"","ratio":"","colorTemp":"","practicals":[]},
   "motion":{"type":"static|push-in|dolly-out|truck-left|truck-right|pan|tilt|crane|orbit|handheld","description":"","speed":"slow|medium|fast"},
   "beats":[{"seconds":<这一拍多久>,"text":"<这一拍发生什么>"}]
  }
 ],
 "notes":["<你不确定的地方>"]
}
规则：
- 「场景段」的判据是空间或主体换了：换了地方、换了人、或者景别从全景跳到特写且明显是另一个镜头。同一个镜头里的推拉摇移不算换场。
- scenes 按时间顺序、首尾相接、覆盖整条：第一段 from=0，最后一段 to=总时长，相邻段 to 与下一段 from 相等。
- 最多 9 段。超过就把相邻、相似的段合并成一段。整条只有一个镜头就只给 1 段。
- 每一段的 camera / lighting / motion / subjects 都要填，不要留空对象；写不准就照抄整条的那份。
- heightMeters / focalMm / aperture 是估计值，给一个合理数字，不要留空。
- subjects 只列画面里真实存在、且需要在 3D 里摆位的主体。同一类的多个人（伴舞、群演、一队人）写成一条并用 count 记人数，数得清就写准确数字；每段最多 8 条。
- 人数要数：画面里有 7 个人，count 加起来就该是 7。白模会照这个数摆人。
- beats 里的 seconds 加起来应等于这一段的 to - from。`;

// 截断的 JSON：去掉最后一个不完整的元素，再按栈把括号补齐
function closeJson(raw) {
  for (let end = raw.length; end > 40; end = raw.lastIndexOf(",", end - 1)) {
    const head = raw.slice(0, end);
    const stack = [];
    let inStr = false, esc = false;
    for (const ch of head) {
      if (esc) { esc = false; continue; }
      if (ch === "\\") { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === "{" || ch === "[") stack.push(ch === "{" ? "}" : "]");
      else if (ch === "}" || ch === "]") stack.pop();
    }
    if (inStr) continue;
    try {
      return JSON.parse(head + stack.reverse().join(""));
    } catch {}
  }
  return null;
}

export function createReferenceReader(opts = {}) {
  const apiKey = opts.apiKey;
  const base = (opts.baseUrl || "https://aigw.sotatts.online/v1").replace(/\/$/, "");
  const model = opts.model || "gemini-3.1-pro-preview"; // 要能看图
  const log = opts.log || (() => {});
  const getFrames = opts.frames; // film 组装器的 frames()

  async function ask(messages) {
    const r = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      // 6 帧 + 拍数的分析比想象中长，4000 会把 JSON 截在数组中间
      body: JSON.stringify({ model, messages, max_tokens: 20000, response_format: { type: "json_object" } }),
      signal: AbortSignal.timeout(180_000),
    });
    if (!r.ok) throw Object.assign(new Error((await r.text()).slice(0, 300)), { code: `HTTP_${r.status}` });
    const d = await r.json();
    const text = d.choices?.[0]?.message?.content || "";
    const m = text.match(/\{[\s\S]*\}/);
    const raw = m ? m[0] : text;
    if (!raw.trim()) throw Object.assign(new Error("模型没有返回内容"), { code: "BAD_ANALYSIS" });
    try {
      return { data: JSON.parse(raw), usage: d.usage };
    } catch (err) {
      // 被 max_tokens 截断时 JSON 会停在数组/对象中间。与其整份丢掉，不如把没闭合的括号补上
      // 抢救出已经读到的部分 —— 少几拍比什么都没有强，缺的东西 notes 里说清楚。
      const salvaged = closeJson(raw);
      if (salvaged) {
        salvaged.notes = [...(salvaged.notes || []), `模型输出被截断（${raw.length} 字符），这份分析可能不完整`];
        log(`reference: JSON 截断，已抢救出 ${Object.keys(salvaged).length} 个字段`);
        return { data: salvaged, usage: d.usage, truncated: true };
      }
      throw Object.assign(new Error(`解析失败：${err.message}（原文 ${raw.length} 字符）`), { code: "BAD_ANALYSIS" });
    }
  }

  return {
    name: "reference",
    ready: !!apiKey && !!getFrames,
    model,

    /**
     * @param task { ref, from, to, count, hint }
     * @returns { ok, analysis, frames, usage }
     */
    async analyze(task = {}) {
      if (!apiKey) return { ok: false, error: "NO_VISION_KEY", hint: "读参照要一个能看图的模型：启动时带 --llm-key-file" };
      if (!getFrames) return { ok: false, error: "FFMPEG_NOT_FOUND", hint: "抽帧要 ffmpeg：brew install ffmpeg" };
      const frames = await getFrames(task.ref, { count: task.count === "auto" ? "auto" : Math.max(1, Math.min(Number(task.count) || 6, 24)), from: task.from, to: task.to });
      if (!frames.length) return { ok: false, error: "NO_FRAMES", hint: "这个参照取不到画面：检查地址或格式" };

      // 多帧且没说只读一个镜头，就按整条片子分场景读。一张静帧或明确只取一小段的还是旧的单镜头读法。
      const split = task.scenes !== false && frames.length > 1;
      const head = split
        ? `这是一条片子按时间均匀抽出的 ${frames.length} 帧，秒数分别是 ${frames.map((f) => `${f.t}s`).join(" / ")}${task.duration ? `，全长约 ${task.duration}s` : ""}。${task.from != null ? `原片取的是 ${task.from}s–${task.to}s 这一段。` : ""}先分场景段，再逐段读参数。`
        : frames.length > 1
        ? `这是同一个镜头里的 ${frames.length} 帧，按时间顺序，秒数分别是 ${frames.map((f) => `${f.t}s`).join(" / ")}。${task.from != null ? `原片取的是 ${task.from}s–${task.to}s 这一段。` : ""}`
        : "这是一张静帧。";
      const user = [
        { type: "text", text: `${head}${task.hint ? `\n导演补充：${task.hint}` : ""}` },
        ...frames.map((f) => ({ type: "image_url", image_url: { url: f.data } })),
      ];
      const { data, usage } = await ask([{ role: "system", content: split ? SYS_SCENES : SYS }, { role: "user", content: user }]);
      if (split) {
        // 分段要首尾相接、按时间排好；模型偶尔会给出重叠或倒序，这里收拾一下，别让编译器背锅
        const list = (Array.isArray(data.scenes) ? data.scenes : []).filter((x) => x && typeof x === "object");
        list.sort((x, y) => (Number(x.from) || 0) - (Number(y.from) || 0));
        const end = frames.at(-1).t + (frames.length > 1 ? frames[1].t - frames[0].t : 0) / 2;
        list.forEach((sg, i) => {
          sg.from = i === 0 ? 0 : Math.max(Number(sg.from) || 0, Number(list[i - 1].to) || 0);
          sg.to = i === list.length - 1 ? Math.max(Number(sg.to) || 0, Math.round(end * 10) / 10) : Number(sg.to) || sg.from;
          if (sg.to <= sg.from) sg.to = sg.from + 1;
        });
        data.scenes = list.slice(0, 9);
        if (!data.beats?.length) data.beats = list.flatMap((sg) => sg.beats || []);
      }
      log(`reference ${model}: ${frames.length} 帧 → ${split ? `${(data.scenes || []).length} 场、` : ""}${(data.subjects || []).length} 个主体、${(data.beats || []).length} 拍 (${usage?.total_tokens ?? "?"} tokens)`);
      return { ok: true, model, analysis: data, frames: frames.length, span: frames.length > 1 ? { from: frames[0].t, to: frames.at(-1).t } : null, usage };
    },
  };
}
