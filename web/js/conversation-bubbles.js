import { threadItems } from './thread.js';
export function conversationBubbles(messages) {
  return threadItems(messages).flatMap(item => {
    if (item.kind === 'tools') return [toolMessages(item.items)];
    if (item.kind === 'media') return item.items.map(messageBubble);
    return [messageBubble(item.m)];
  });
}
function messageBubble(message) {
  if (message.role === 'thinking') return foldedMessage(message, '思考过程');
  const bubble = node('div', '', `msg ${message.role === 'user' ? 'user' : 'agent'}`);
  bubble.append(node('div', message.role === 'user' ? '你' : 'Agent', 'history-speaker'));
  bubble.append(node('div', message.text || '', 'history-body'));
  appendMedia(bubble, message.media);
  if (message.plan || message.ask) bubble.append(foldedMessage(message, '查看当时的方案与选项'));
  return bubble;
}
function toolMessages(messages) {
  const failed = messages.filter(message => message.ok === false).length;
  const details = node('details', '', `msg tool${failed ? ' fail' : ''}`);
  details.append(node('summary', `${messages.length} 项操作记录${failed ? ` · ${failed} 项失败` : ''}`));
  messages.forEach(message => details.append(node('pre', message.text || JSON.stringify(message, null, 2))));
  return details;
}
function foldedMessage(message, label) {
  const details = node('details', '', 'history-details');
  details.append(node('summary', label));
  details.append(node('pre', message.thinking?.reasoning || JSON.stringify(message.plan || message.ask || message, null, 2)));
  return details;
}
function appendMedia(bubble, media) {
  if (!media?.url || !/^(\/media\/|https?:\/\/)/.test(media.url)) return;
  const type = { image: 'img', video: 'video', audio: 'audio' }[media.kind];
  if (!type) return;
  const element = node(type, '');
  element.src = media.url;
  element.controls = true;
  element.style.maxWidth = '100%';
  bubble.append(element);
}
function node(tag, text, className = '') {
  const element = document.createElement(tag);
  element.textContent = text;
  element.className = className;
  return element;
}
