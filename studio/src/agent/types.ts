export interface ToolCall {
  name: string
  args: Record<string, unknown>
}

/** 可选的 LLM 配置(存 localStorage,不配置则使用离线指令解析) */
export interface LLMConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export const LLM_KEY = 'tap-replica.llm'

export function readLLM(): LLMConfig | null {
  try {
    const raw = localStorage.getItem(LLM_KEY)
    if (!raw) return null
    const c = JSON.parse(raw) as LLMConfig
    return c.baseUrl && c.model ? c : null
  } catch {
    return null
  }
}

export function writeLLM(c: LLMConfig | null) {
  try {
    if (c) localStorage.setItem(LLM_KEY, JSON.stringify(c))
    else localStorage.removeItem(LLM_KEY)
  } catch { /* noop */ }
}
