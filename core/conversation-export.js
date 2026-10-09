// A portable snapshot of the conversation currently retained by the runtime.
// Project exports intentionally omit Agent history, so this is a separate format.
export function exportConversation(state, exportedAt = new Date().toISOString()) {
  const messages = structuredClone(state.agent?.messages || []);
  return {
    format: 'director-conversation',
    schemaVersion: 1,
    exportedAt,
    project: { id: state.project?.id || null, name: state.project?.name || 'Untitled' },
    scope: {
      description: '当前会话中仍保留的消息；不包含已清除或因重启、切换工程而丢失的历史。',
      runtimeMessageLimit: 120,
      media: '仅保留媒体引用，不内嵌视频文件。',
    },
    messageCount: messages.length,
    messages,
    shots: (state.shots || []).map(s => ({ id: s.id, index: s.index, title: s.title })),
  };
}

export function conversationFilename(projectName, date = new Date().toISOString()) {
  const name = String(projectName || 'Untitled').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim().slice(0, 80) || 'Untitled';
  return `${name}_${date.slice(0, 19).replace(/[T:]/g, '-')}.conversation.json`;
}
