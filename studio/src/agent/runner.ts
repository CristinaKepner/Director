import { useStudio } from '../store'
import { TOOLS, runTool, toolsForLLM } from './tools'
import { parseCommands } from './nlu'
import { LLMConfig, ToolCall, readLLM } from './types'

/* ─────────────────────────────────────────────────────────────
   Agent 规划层:自然语言 → 工具调用
   优先使用已配置的 LLM(Function Calling);未配置时用离线中文解析
   ───────────────────────────────────────────────────────────── */

const S = () => useStudio.getState()

export const helpText = () => {
  const groups = new Map<string, string[]>()
  for (const t of TOOLS) {
    if (!groups.has(t.group)) groups.set(t.group, [])
    groups.get(t.group)!.push(t.title)
  }
  return [
    '我能直接操控导演台,例如:',
    ...[...groups.entries()].map(([g, list]) => `· ${g}:${list.join('、')}`),
    '',
    '也可以直接说人话:',
    '「放一个红色的立方体在左边」「把角色向右移动 2 米」「镜头推近」「加一盏主光,亮度 3」',
    '「切换到俯视」「焦距调到 50mm」「拍一张照片」「开始录制」「打开故事板」',
  ].join('\n')
}

async function callLLM(cfg: LLMConfig, userText: string, history: { role: string; content: string }[]): Promise<{ calls: ToolCall[]; say?: string }> {
  const url = cfg.baseUrl.replace(/\/$/, '') + '/chat/completions'
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            '你是 3D 片场(3D 导演台)的操控 Agent。把用户意图翻译成工具调用。' +
            '只调用必要的工具,参数必须来自工具 schema。用中文简洁回复。',
        },
        ...history.slice(-8),
        { role: 'user', content: userText },
      ],
      tools: toolsForLLM(),
      tool_choice: 'auto',
    }),
  })
  if (!res.ok) throw new Error(`LLM ${res.status} ${res.statusText}`)
  const data = await res.json()
  const msg = data?.choices?.[0]?.message ?? {}
  const calls: ToolCall[] = (msg.tool_calls ?? []).map((c: { function: { name: string; arguments: string } }) => {
    let args: Record<string, unknown> = {}
    try { args = JSON.parse(c.function.arguments || '{}') } catch { /* noop */ }
    return { name: c.function.name, args }
  })
  return { calls, say: typeof msg.content === 'string' ? msg.content : undefined }
}

export interface PlanResult {
  calls: ToolCall[]
  say?: string
  usedLLM: boolean
  error?: string
}

/** 把一句话规划为工具调用(LLM 优先,失败回退离线解析) */
export async function planTools(text: string, history: { role: string; content: string }[] = []): Promise<PlanResult> {
  const cfg = readLLM()
  if (cfg) {
    try {
      const { calls, say } = await callLLM(cfg, text, history)
      return { calls, say, usedLLM: true }
    } catch (e) {
      return {
        calls: parseCommands(text), usedLLM: false,
        error: `LLM 调用失败,已回退离线解析:${e instanceof Error ? e.message : String(e)}`,
      }
    }
  }
  return { calls: parseCommands(text), usedLLM: false }
}

export { runTool, TOOLS }
export const storeToast = (t: string) => S().toast(t)
