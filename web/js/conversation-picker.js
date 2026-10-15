import { conversationVersions } from '../../core/conversation-archive.js';
import { conversationBubbles } from './conversation-bubbles.js';
let projectId = null;
let signature = '';
export function syncConversationPicker(state) {
  const select = document.getElementById('conversationVersion');
  const versions = conversationVersions(state);
  if (projectId !== state.project.id) resetPicker(select, state.project.id);
  refreshOptions(select, versions);
  select.onchange = () => showVersion(select, versions);
  showVersion(select, versions);
}
function resetPicker(select, id) {
  projectId = id;
  signature = '';
  select.value = '';
}
function refreshOptions(select, versions) {
  const next = JSON.stringify(versions.map(v => [v.id, v.label, v.messages.length]));
  if (signature === next) return;
  const selected = select.value;
  select.replaceChildren(new Option('当前对话', ''), ...versions.map(versionOption));
  select.value = selected;
  if (select.selectedIndex < 0) select.value = '';
  signature = next;
  delete document.getElementById('conversationHistory').dataset.version;
}
function showVersion(select, versions) {
  const version = select.value === '' ? null : versions[Number(select.value)];
  const history = document.getElementById('conversationHistory');
  document.getElementById('agentThread').hidden = Boolean(version);
  document.getElementById('agentInput').closest('.composer').hidden = Boolean(version);
  history.hidden = !version;
  if (history.dataset.version === select.value) return;
  history.dataset.version = select.value;
  renderHistory(history, version);
}
function renderHistory(history, version) {
  history.replaceChildren();
  if (!version) return;
  const note = document.createElement('p');
  note.textContent = `${version.createdAt || ''} · 历史对话，仅查看。返回「当前对话」继续创作。`;
  history.append(note);
  history.append(...conversationBubbles(version.messages));
  history.scrollTop = 0;
}

function versionOption(version, index) {
  return new Option(`${version.label} · ${version.messages.length} 条`, String(index));
}
