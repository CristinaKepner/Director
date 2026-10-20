import { conversationVersions } from '../../../../core/features/conversation/conversation-archive.js';
export function showConversationArchive(state) {
  document.getElementById('conversationArchiveDialog')?.remove();
  const dialog = createDialog(state.project?.name);
  const versions = conversationVersions(state);
  for (const version of versions) dialog.append(versionElement(version));
  if (!versions.length) dialog.append(element('p', '此工程没有留存的历史对话。'));
  document.body.append(dialog);
  dialog.addEventListener('close', () => dialog.remove());
  dialog.showModal();
}
function createDialog(name) {
  const dialog = element('dialog', '');
  dialog.id = 'conversationArchiveDialog';
  dialog.style.cssText = 'width:min(900px,90vw);max-height:85vh;overflow:auto;padding:24px;background:#181b20;color:#eee;border:1px solid #555;border-radius:14px';
  dialog.append(element('h2', `${name || '工程'} · 历史对话`));
  dialog.append(closeButton(dialog));
  dialog.append(element('p', '按版本保留原文；不同检查点可能有重复消息。仅包含实际留存记录，不代表完整聊天历史。查看不会执行操作或恢复旧方案。'));
  return dialog;
}
function closeButton(dialog) {
  const button = element('button', '关闭历史对话');
  button.onclick = () => dialog.close();
  return button;
}
function versionElement(version) {
  const details = element('details', '');
  details.append(element('summary', `${version.label} · ${version.messages.length} 条记录`));
  details.append(element('p', `${version.createdAt || ''} · 来源：${version.source || '历史检查点'}`));
  for (const message of version.messages) details.append(messageElement(message));
  return details;
}
export function messageElement(message) {
  const article = element('article', '');
  article.style.cssText = 'padding:12px 0;border-top:1px solid #444;overflow-wrap:anywhere';
  article.append(element('strong', `${message.role || '记录'} · ${message.timestamp || message.at || ''}`));
  const text = element('pre', message.text || JSON.stringify(message, null, 2));
  text.style.cssText = 'white-space:pre-wrap;font:inherit;line-height:1.7';
  article.append(text);
  return article;
}
function element(tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}
