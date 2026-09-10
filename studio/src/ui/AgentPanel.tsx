import { useMemo } from 'react'
import {
  AssistantRuntimeProvider, ComposerPrimitive, MessagePrimitive, ThreadPrimitive, useLocalRuntime,
} from '@assistant-ui/react'
import type { ChatModelAdapter } from '@assistant-ui/react'
import { useStudio, SidebarTab } from '../store'
import { helpText, planTools, runTool } from '../agent/runner'
import { readLLM } from '../agent/types'
import LightPanel from './LightPanel'
import PathPanel from './PathPanel'
import LibraryPanel from './LibraryPanel'
import { IconClose, IconSend, IconSparkles, IconX } from './icons'

/* ─────────────────────────────────────────────────────────────
   Agent 侧边栏(assistant-ui 驱动)
   对话 / 灯光 / 运镜 / 模型;Agent 可调度导演台全部工具
   ───────────────────────────────────────────────────────────── */

const TABS: { key: SidebarTab; label: string }[] = [
  { key: 'agent', label: '对话' },
  { key: 'light', label: '灯光' },
  { key: 'path', label: '运镜' },
  { key: 'library', label: '模型' },
]

const QUICK: [string, string][] = [
  ['能做什么', '你能做什么?'],
  ['拍一张照片', '拍一张照片'],
  ['开始录制', '开始录制'],
  ['推镜', '运镜推镜'],
  ['俯视', '切换到俯视'],
  ['加一盏主光', '加一盏主光,亮度 3'],
]

export default function AgentPanel() {
  const open = useStudio(s => s.agentOpen)
  const tab = useStudio(s => s.sidebarTab)
  const setTab = useStudio(s => s.setSidebarTab)
  const setOpen = useStudio(s => s.setAgentOpen)
  const clear = useStudio(s => s.clearAgent)

  return (
    <div className={'agent-side' + (open ? '' : ' closed')}>
      <div className="agent-head">
        <IconSparkles className="ah-icon" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ah-title">导演台 Agent</div>
          <div className="ah-sub">{readLLM() ? 'LLM 工具调用' : '离线指令解析 · 可配置 LLM'}</div>
        </div>
        <button className="icon-btn" aria-label="清空对话" onClick={clear}><IconClose /></button>
        <button className="icon-btn" aria-label="收起侧栏" onClick={() => setOpen(false)}><IconX /></button>
      </div>

      <div className="agent-tabs">
        {TABS.map(t => (
          <button key={t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)} aria-label={t.label}>{t.label}</button>
        ))}
      </div>

      {tab === 'agent' && <AgentChat />}
      {tab === 'light' && <LightPanel />}
      {tab === 'path' && <PathPanel />}
      {tab === 'library' && <LibraryPanel />}
    </div>
  )
}

/* ── 对话(assistant-ui) ─────────────────────────────────────── */

function AgentChat() {
  const adapter = useMemo<ChatModelAdapter>(() => ({
    async *run({ messages }) {
      const history = messages.map(m => ({
        role: m.role as string,
        content: m.content.filter(c => c.type === 'text').map(c => (c as { text: string }).text).join('\n'),
      }))
      const lastUser = [...messages].reverse().find(m => m.role === 'user')
      const text = lastUser?.content.filter(c => c.type === 'text').map(c => (c as { text: string }).text).join('\n') ?? ''
      if (!text.trim()) return

      if (/^(能做什么|帮助|命令列表|工具列表)[?？]?$/.test(text.trim())) {
        yield { content: [{ type: 'text', text: helpText() }] }
        return
      }

      const { calls, say, error } = await planTools(text, history)
      if (error) yield { content: [{ type: 'text', text: error }] }
      if (!calls.length) {
        yield { content: [{ type: 'text', text: say || '没听懂这条指令。点下面的「能做什么」看看示例,或换一种说法。' }] }
        return
      }

      const parts: Record<string, unknown>[] = []
      if (say) parts.push({ type: 'text', text: say })
      for (const c of calls) {
        const id = `tc-${Date.now()}-${parts.length}`
        parts.push({ type: 'tool-call', toolCallId: id, toolName: c.name, args: c.args })
        yield { content: parts as never }
        const { ok, text: out } = await runTool(c.name, c.args)
        const idx = parts.length - 1
        parts[idx] = { ...parts[idx], result: out, isError: !ok }
        yield { content: parts as never }
      }
    },
  }), [])

  const runtime = useLocalRuntime(adapter)

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root className="aui-root">
        <ThreadPrimitive.Viewport className="agent-log">
          <ThreadPrimitive.Empty>
            <div className="msg agent">
              我是导演台 Agent,可以直接调度导演台的全部工具:{'\n'}
              · 放一个红色的立方体在左边{'\n'}
              · 把角色向右移动 2 米{'\n'}
              · 镜头推近 / 环绕{'\n'}
              · 加一盏主光,亮度 3{'\n'}
              · 拍一张照片 / 开始录制{'\n'}
              所有操作都会真实落到导演台上。
            </div>
          </ThreadPrimitive.Empty>
          <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
        </ThreadPrimitive.Viewport>

        <div className="agent-quick">
          {QUICK.map(([label, prompt]) => (
            <ThreadPrimitive.Suggestion key={label} prompt={prompt} send>
              <button type="button">{label}</button>
            </ThreadPrimitive.Suggestion>
          ))}
        </div>

        <ComposerPrimitive.Root className="agent-input">
          <ComposerPrimitive.Input
            className="aui-composer-input"
            placeholder="告诉 Agent 要做什么…(Enter 发送,Shift+Enter 换行)"
            aria-label="Agent 输入"
            rows={2}
          />
          <ComposerPrimitive.Send className="send" aria-label="发送">
            <IconSend />
          </ComposerPrimitive.Send>
        </ComposerPrimitive.Root>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  )
}

const UserMessage = () => (
  <MessagePrimitive.Root className="msg user">
    <MessagePrimitive.Parts components={{ Text: TextPart }} />
  </MessagePrimitive.Root>
)

const AssistantMessage = () => (
  <MessagePrimitive.Root className="msg agent aui-assistant">
    <MessagePrimitive.Parts components={{ Text: TextPart, tools: { Fallback: ToolPart } }} />
  </MessagePrimitive.Root>
)

const TextPart = ({ text }: { text: string }) => <span className="aui-text">{text}</span>

const ToolPart = ({ toolName, args, result, isError }: {
  toolName: string
  args: unknown
  result?: unknown
  isError?: boolean
}) => (
  <div className="msg tool">
    <div className="tool-head">{isError ? '⚠' : result === undefined ? '⏳' : '✓'} {toolName}</div>
    <pre>{JSON.stringify(args ?? {})}</pre>
    {result !== undefined && <pre className="tool-result">{String(result)}</pre>}
  </div>
)

export function AgentFab() {
  const open = useStudio(s => s.agentOpen)
  const setOpen = useStudio(s => s.setAgentOpen)
  if (open) return null
  return (
    <button className="agent-fab" aria-label="打开 Agent 侧栏" onClick={() => setOpen(true)}>
      <IconSparkles />
    </button>
  )
}
