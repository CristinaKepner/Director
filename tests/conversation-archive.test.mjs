import test from 'node:test';
import assert from 'node:assert/strict';
import { conversationVersions } from '../core/features/conversation/conversation-archive.js';
const message = { id: 'm', role: 'user', text: '<script>original</script>' };
const node = { id: 'v', label: '初版', createdAt: '2026-10-15', agentMessages: [message] };
test('读取历史检查点原文，不改工程或过滤消息', () => {
  const state = { journey: { nodes: [node] } };
  const before = structuredClone(state);
  assert.deepEqual(conversationVersions(state)[0].messages, [message]);
  assert.deepEqual(state, before);
});
test('整合档案优先于检查点，保留来源与空版本', () => {
  const versions = [{ id: 'a', label: '旧版', source: 'backup', messages: [] }];
  assert.deepEqual(conversationVersions({ project: { conversationArchive: { versions } }, journey: { nodes: [node] } }), versions);
});
test('没有历史记录时返回空清单', () => {
  assert.deepEqual(conversationVersions({}), []);
});
