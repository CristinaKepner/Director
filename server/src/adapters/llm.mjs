// LLM planner for the Agent Director: natural language → Action plan through an OpenAI-compatible chat API
// (the AIGW gateway: GPT-5.x / DeepSeek V4). The model only proposes steps; every step still goes through the
// core Action Registry (validation, state machine, event log, undo), exactly like the rule planner's output.
export const LLM_DEFAULTS = {
  baseUrl: "https://aigw.sotatts.online/v1",
  model: "gpt-5.6-sol",
  models: ["gpt-5.6-sol", "gpt-5.6-luna", "gpt-5.6-terra", "gpt-5.5", "gpt-5.4", "deepseek-v4-flash", "deepseek-v4-chat", "deepseek-v4-pro"],
  timeoutMs: 90_000,
  maxTokens: 6000,
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
  const noJsonMode = new Set(); // models that reject response_format json_object (e.g. deepseek-v4-chat)

  async function chat(model, messages) {
    const body = { model, messages, temperature: opts.temperature ?? LLM_DEFAULTS.temperature, max_tokens: opts.maxTokens || LLM_DEFAULTS.maxTokens };
    if (!noJsonMode.has(model)) body.response_format = { type: "json_object" };
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), opts.timeoutMs || LLM_DEFAULTS.timeoutMs);
    try {
      let res = await fetch(`${base}/chat/completions`, { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body: JSON.stringify(body), signal: ctl.signal });
      if (res.status === 400 && body.response_format) {
        const txt = await res.text();
        if (/not support/i.test(txt)) {
          noJsonMode.add(model);
          delete body.response_format;
          res = await fetch(`${base}/chat/completions`, { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body: JSON.stringify(body), signal: ctl.signal });
        } else throw Object.assign(new Error(txt.slice(0, 300)), { code: "HTTP_400" });
      }
      if (!res.ok) throw Object.assign(new Error((await res.text()).slice(0, 300)), { code: `HTTP_${res.status}` });
      const d = await res.json();
      return { text: d.choices?.[0]?.message?.content || "", usage: d.usage };
    } finally {
      clearTimeout(t);
    }
  }

  function systemPrompt(caps, summary) {
    const tools = caps.filter((c) => PLANNABLE.test(c.name)).map((c) => `${c.name} ${JSON.stringify(c.params || {})}${c.required?.length ? ` required=${c.required.join(",")}` : ""} — ${c.doc}`).join("\n");
    return `你是 Director Console（生成式影视预演导演台）的 Agent Director。用户用自然语言下指令，你把它翻译成 Action 计划。
只输出一个 JSON 对象：{"steps":[{"action":"<name>","payload":{...},"label":"<给人看的一句话>"}],"notes":["<做不了的部分>"],"reply":"<给导演的一句话回复>","needsConfirm":<bool>}
规则：
- 只能用下面列出的 Action 与参数；id 用 context 里的真实 id（机位 cam_*、物体、灯、镜头 shot_*），不要编造。
- 单位：米、秒、度、mm；位置是接地点 [x, y, z]，正面朝 +Z；高度用 height。
- 用户只是提问/闲聊/要建议时 steps 为空，把回答写在 reply。
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
    return { steps, notes: Array.isArray(j.notes) ? j.notes.map(String) : [], reply: typeof j.reply === "string" ? j.reply : "", needsConfirm: !!j.needsConfirm };
  }

  return {
    name: "llm",
    baseUrl: base,
    model: defaultModel,
    models,
    /**
     * @param text        user instruction
     * @param ctx         { capabilities, summary, history: [{role, text}], model? }
     * @returns           { steps, notes, reply, needsConfirm, model, usage, ms }
     */
    async plan(text, ctx) {
      const model = ctx.model && ctx.model !== "rules" ? ctx.model : defaultModel;
      const known = new Set(ctx.capabilities.map((c) => c.name));
      const messages = [{ role: "system", content: systemPrompt(ctx.capabilities, ctx.summary) }];
      for (const h of (ctx.history || []).slice(-8)) messages.push({ role: h.role === "user" ? "user" : "assistant", content: String(h.text).slice(0, 1200) });
      messages.push({ role: "user", content: text });
      const t0 = Date.now();
      const { text: out, usage } = await chat(model, messages);
      const p = parsePlan(out);
      const unknown = p.steps.filter((s) => !known.has(s.action) || !PLANNABLE.test(s.action));
      if (unknown.length) p.notes.push(`模型提出了不可用的 Action：${unknown.map((s) => s.action).join(", ")}`);
      p.steps = p.steps.filter((s) => known.has(s.action) && PLANNABLE.test(s.action));
      const ms = Date.now() - t0;
      log(`llm ${model}: ${p.steps.length} steps in ${ms} ms (${usage?.total_tokens ?? "?"} tokens)`);
      return { ...p, model, usage, ms };
    },
  };
}
