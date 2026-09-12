// LLM planner for the Agent Director: natural language → Action plan through an OpenAI-compatible chat API
// (the AIGW gateway: GPT-5.x / DeepSeek V4). The model only proposes steps; every step still goes through the
// core Action Registry (validation, state machine, event log, undo), exactly like the rule planner's output.
export const LLM_DEFAULTS = {
  baseUrl: "https://aigw.sotatts.online/v1",
  model: "gpt-5.6-sol",
  models: ["gpt-5.6-sol", "gpt-5.6-luna", "gpt-5.6-terra", "gpt-5.5", "gpt-5.4", "gpt-6-astra", "claude-opus-5", "claude-sonnet-4-6", "gemini-3.1-pro-preview", "deepseek-v4-flash", "deepseek-v4-chat", "deepseek-v4-pro", "glm-5.2", "MiniMax-H3"],
  // 建一整条片子（几十个 Action + 拆拍）推理模型要一两分钟；90 s 会把正常规划掐掉，
  // 然后回退到规则规划器输出一堆"没听懂" —— 那比多等一会儿糟得多。
  timeoutMs: 300_000,
  maxTokens: 12000,
  temperature: 0.2,
};

// actions the model may plan; UI-only / dangerous-in-bulk ones are left to humans
const PLANNABLE = /^(scene|entity|camera|light|shot|motion|timeline\.set-range|take\.(arm|record|review|delete)|storyboard|annotation|generation|asset|review|context\.(scene|shot|entity|sequence|assets)|project\.(rename|set-state|set-fidelity|set-fps|set-aspect|set-style|set-shading|set-build-mode|undo|redo|undo-to))/;
const ROLE_OF = (action) => ({ scene: "scene-builder", entity: "continuity", camera: "cinematography", light: "lighting", shot: "cinematography", motion: "motion", timeline: "motion", take: "review", storyboard: "storyboard", annotation: "review", generation: "generation", review: "review", context: "director-planner", project: "director-planner" })[action.split(".")[0]] || "director-planner";

export function createLlmPlanner(opts = {}) {
  const apiKey = opts.apiKey;
  if (!apiKey) throw new Error("llm planner needs apiKey");
  const base = (opts.baseUrl || LLM_DEFAULTS.baseUrl).replace(/\/$/, "");
  const defaultModel = opts.model || LLM_DEFAULTS.model;
  const models = opts.models || LLM_DEFAULTS.models;
  const log = opts.log || (() => {});
  // Gateways front many vendors and they disagree on parameter spellings. Rather than keep a model table
  // that rots, negotiate once per model on the first 400 and remember what that model accepts.
  const quirks = new Map(); // model → { jsonMode, maxTokensKey, fixedTemperature, noStream }
  const quirkOf = (m) => quirks.get(m) || { jsonMode: true, maxTokensKey: "max_tokens", fixedTemperature: false, noStream: false };

  function buildBody(model, messages, stream) {
    const q = quirkOf(model);
    const body = { model, messages };
    if (stream && !q.noStream) body.stream = true;
    body[q.maxTokensKey] = opts.maxTokens || LLM_DEFAULTS.maxTokens;
    if (!q.fixedTemperature) body.temperature = opts.temperature ?? LLM_DEFAULTS.temperature;
    if (q.jsonMode) body.response_format = { type: "json_object" };
    return body;
  }

  // returns true when the error names a parameter we know how to drop or rename (so the call is worth retrying)
  function adapt(model, txt) {
    const q = { ...quirkOf(model) };
    let changed = false;
    if (/max_completion_tokens/.test(txt) && q.maxTokensKey !== "max_completion_tokens") { q.maxTokensKey = "max_completion_tokens"; changed = true; }
    if (/'?temperature'?[^\n]*(does not support|unsupported)/i.test(txt) && !q.fixedTemperature) { q.fixedTemperature = true; changed = true; }
    if (/response_format|json_object/i.test(txt) && q.jsonMode) { q.jsonMode = false; changed = true; }
    if (/\bstream\b[^\n]*(not support|unsupported)/i.test(txt) && !q.noStream) { q.noStream = true; changed = true; }
    if (changed) {
      quirks.set(model, q);
      log(`llm ${model}: 适配网关参数 → ${q.maxTokensKey}${q.fixedTemperature ? " · 默认 temperature" : ""}${q.jsonMode ? "" : " · 无 json_object"}`);
    }
    return changed;
  }

  // 流式：模型一边想我们一边往外推。两种可见内容——
  //   reasoning_content（DeepSeek 这类会吐思考过程）和正文里逐渐成形的计划（"label" 字段）。
  // GPT-5.6 / GPT-6 不吐思考文本，那就把"正在写第几步、写到哪一步"当作可见的工作过程。
  const LABEL_RE = /"label"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  function labelsIn(text) {
    const out = [];
    for (const m of text.matchAll(LABEL_RE)) {
      try { out.push(JSON.parse(`"${m[1]}"`)); } catch { out.push(m[1]); }
    }
    return out;
  }

  async function chat(model, messages, onDelta) {
    const timeoutMs = opts.timeoutMs || LLM_DEFAULTS.timeoutMs;
    for (let attempt = 0; ; attempt++) {
      // 每次尝试独立计时：前面那次 400 只是在协商参数，不该吃掉真正那次规划的时间
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), timeoutMs);
      try {
        const wantStream = !!onDelta && !quirkOf(model).noStream;
        const res = await fetch(`${base}/chat/completions`, { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body: JSON.stringify(buildBody(model, messages, wantStream)), signal: ctl.signal });
        if (res.ok) return wantStream && /event-stream/i.test(res.headers.get("content-type") || "") ? await readStream(res, onDelta) : await readWhole(res);
        const txt = await res.text();
        if (res.status === 400 && attempt < 4 && adapt(model, txt)) continue;
        throw Object.assign(new Error(txt.slice(0, 300)), { code: `HTTP_${res.status}` });
      } catch (err) {
        if (err?.name === "AbortError") throw Object.assign(new Error(`规划超时（${Math.round(timeoutMs / 1000)}s）：${model} 没在时限内返回`), { code: "LLM_TIMEOUT" });
        throw err;
      } finally {
        clearTimeout(t);
      }
    }
  }

  async function readWhole(res) {
    const d = await res.json();
    const m = d.choices?.[0]?.message || {};
    return { text: m.content || "", reasoning: m.reasoning_content || m.reasoning || "", usage: d.usage };
  }

  async function readStream(res, onDelta) {
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", text = "", reasoning = "", usage = null, seen = 0, last = 0;
    const push = (force) => {
      const now = Date.now();
      if (!force && now - last < 350) return; // 别把每个 token 都广播出去
      last = now;
      const labels = labelsIn(text);
      onDelta({ reasoning, content: text, steps: labels, newSteps: labels.length - seen });
      seen = labels.length;
    };
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const body = line.slice(5).trim();
        if (!body || body === "[DONE]") continue;
        let j;
        try { j = JSON.parse(body); } catch { continue; }
        const delta = j.choices?.[0]?.delta || {};
        if (delta.reasoning_content) reasoning += delta.reasoning_content;
        else if (delta.reasoning) reasoning += delta.reasoning;
        if (delta.content) text += delta.content;
        if (j.usage) usage = j.usage;
        push(false);
      }
    }
    push(true);
    return { text, reasoning, usage };
  }

  function systemPrompt(caps, summary) {
    const tools = caps.filter((c) => PLANNABLE.test(c.name)).map((c) => `${c.name} ${JSON.stringify(c.params || {})}${c.required?.length ? ` required=${c.required.join(",")}` : ""} — ${c.doc}`).join("\n");
    return `你是 Director Console（生成式影视预演导演台）的 Agent Director。用户用自然语言下指令，你把它翻译成 Action 计划。
只输出一个 JSON 对象：
{"steps":[{"action":"<name>","payload":{...},"label":"<给人看的一句话>"}],
 "notes":["<做不了的部分或你做的假设>"],
 "reply":"<给导演的一句话回复>",
 "needsConfirm":<bool>,
 "ask":[{"question":"<只在必须问时出现>","why":"<不问会怎样>","options":[{"label":"<选项>","detail":"<这么选会发生什么>","recommended":<bool>}]}],
 "suggest":["<做完这一步之后，导演接下来最可能要做的 2-3 件事，写成可以直接执行的一句指令>"]}
规则：
- 只能用下面列出的 Action 与参数；id 用 context 里的真实 id（机位 cam_*、物体、灯、镜头 shot_*），不要编造。
- 单位：米、秒、度、mm；位置是接地点 [x, y, z]，正面朝 +Z；高度用 height。
- 只有纯粹的提问/闲聊/要建议（"这个镜头为什么闷"、"推荐一个焦段"）才让 steps 为空，把回答写在 reply。
- **该问就问，但要问得专业**：只有当不同选择会导出明显不同的结果、而你无法从上下文判断时才问（例如素材本身不适合这条流程、要先做一步预处理、两种做法各有代价）。问的时候必须：先说清楚你看出了什么问题、不处理会怎样，再给 2-3 个选项、标一个 recommended。能合理默认的一律不要问，按默认做完把假设写进 notes。ask 非空时 steps 应该为空或只放不影响结论的准备步骤。
- **suggest 永远要给**：根据这一步之后工程的真实状态，给 2-3 条导演接下来最可能下的指令（可直接执行的句子，不是"你可以试试调整灯光"这种废话）。没有可推荐的就给空数组。
- 用户描述一支片子、一段广告 / TVC、一个故事，或要"分镜表 / 镜头表 / 拍一条 / 做一支"时，那是**建场请求**，不是提问：必须把它建进工程 —— scene.create 或 scene.preset 定环境、project.set-style / set-aspect 定风格画幅、entity.create 建主角与产品等语义实体、camera.create 建机位、shot.create 逐镜建镜头（时长加起来对上片长），再把分镜表写进 reply。只写文字不建工程是错的。
- 缺品牌名、产品品类这类信息不要停下来问：用合理的占位（"高端时尚单品"）建出来，把假设写进 notes，导演看了画面再改。
- **长镜头要先拆拍**：供应商单条有上限（Seedance 2.5 是 30 s，2.0 是 12 s）。镜头时长超过上限时，先用 shot.beats 把它拆成若干拍，每拍一句话说清这段发生什么（谁在做什么、镜头怎么动），时长加起来等于镜头总长；然后在 reply 里告诉导演可以用 shot.chain 分段续拍。**不要自己调 shot.chain**，那会真实计费，让导演点。拆拍要按剧情节奏拆，不是按秒数平均切。
- 用户说"一镜到底 / one take / 单镜头 / 不要剪辑"时：**只建一个镜头**，时长就是整片时长，用运镜（motion.set）和关键帧（motion.keyframe / entity 关键帧）表达段落变化，不要拆成几个镜头。片长超过供应商单条上限（Seedance 12 s）时照样只建一个镜头，把这件事写进 notes。
- 镜头里要有东西可拍：先 entity.create 把片子描述到的主体建出来（悬浮的颗粒、容器、液面这类没有专属语义类型的，用 prop + proxy 形状 + 尺寸 + 颜色近似），再让机位 look-at 它们。空场景配一段漂亮的提示词是没用的。
- 会大幅改动工程（scene.demo、project.new、删除多个对象、批量生成）时 needsConfirm=true。
- label 用用户的语言（中文指令就中文）。
- 一致性：角色 / 产品要跨镜头一致时，先 generation.reference {entityId} 生成参考图（context.assets 可查），导演批准（asset.approve）后再 generation.submit；已批准的参考会自动随该实体出现的镜头一起提交。用户说"人物 / 产品不一致"就走这条路。
- 用户对生成结果提意见（人物不对、位置不对、想换光、重新摆）时：先用 entity.update（continuity.look / color / role）、entity.transform、entity.pose、scene.preset、camera.* 改场景，再 generation.prompt 重新编译，最后 generation.submit 用同一 provider / mode 再生成一次；把改了什么写进 reply。

可用 Action：
${tools}

当前工程 context（summarize）：
${JSON.stringify(summary).slice(0, 6000)}`;
  }

  function parsePlan(text) {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw Object.assign(new Error("no JSON in model reply"), { code: "BAD_PLAN" });
    const j = JSON.parse(m[0]);
    const steps = (Array.isArray(j.steps) ? j.steps : []).filter((s) => s && typeof s.action === "string").map((s) => ({ action: s.action.trim(), payload: s.payload && typeof s.payload === "object" ? s.payload : {}, label: String(s.label || s.action), role: ROLE_OF(s.action) }));
    const ask = (Array.isArray(j.ask) ? j.ask : [])
      .filter((a) => a && typeof a.question === "string")
      .slice(0, 3)
      .map((a) => ({
        question: String(a.question),
        why: typeof a.why === "string" ? a.why : "",
        options: (Array.isArray(a.options) ? a.options : []).slice(0, 4).map((o) => ({ label: String(o?.label ?? o), detail: String(o?.detail || ""), recommended: !!o?.recommended })),
      }))
      .filter((a) => a.options.length >= 2);
    const suggest = (Array.isArray(j.suggest) ? j.suggest : []).map(String).filter((x) => x.trim()).slice(0, 3);
    return { steps, notes: Array.isArray(j.notes) ? j.notes.map(String) : [], reply: typeof j.reply === "string" ? j.reply : "", needsConfirm: !!j.needsConfirm, ask, suggest };
  }

  return {
    name: "llm",
    baseUrl: base,
    model: defaultModel,
    models,
    /**
     * @param text        user instruction
     * @param ctx         { capabilities, summary, history: [{role, text}], model?, onDelta? }
     *                    onDelta({reasoning, content, steps, newSteps}) — 规划过程中节流回调，用来把"模型在想什么"实时推给页面
     * @returns           { steps, notes, reply, needsConfirm, model, usage, ms }
     */
    async plan(text, ctx) {
      const model = ctx.model && ctx.model !== "rules" ? ctx.model : defaultModel;
      const known = new Set(ctx.capabilities.map((c) => c.name));
      const messages = [{ role: "system", content: systemPrompt(ctx.capabilities, ctx.summary) }];
      for (const h of (ctx.history || []).slice(-8)) messages.push({ role: h.role === "user" ? "user" : "assistant", content: String(h.text).slice(0, 1200) });
      messages.push({ role: "user", content: text });
      const t0 = Date.now();
      const { text: out, reasoning, usage } = await chat(model, messages, ctx.onDelta);
      const p = parsePlan(out);
      const unknown = p.steps.filter((s) => !known.has(s.action) || !PLANNABLE.test(s.action));
      if (unknown.length) p.notes.push(`模型提出了不可用的 Action：${unknown.map((s) => s.action).join(", ")}`);
      p.steps = p.steps.filter((s) => known.has(s.action) && PLANNABLE.test(s.action));
      const ms = Date.now() - t0;
      log(`llm ${model}: ${p.steps.length} steps in ${ms} ms (${usage?.total_tokens ?? "?"} tokens)`);
      return { ...p, reasoning: reasoning || "", model, usage, ms };
    },
  };
}
