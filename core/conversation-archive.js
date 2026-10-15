export function conversationVersions(state) {
  const archive = state.project?.conversationArchive;
  if (Array.isArray(archive?.versions)) return archive.versions;
  return (state.journey?.nodes || []).map(checkpointVersion);
}
function checkpointVersion(node) {
  return { id: node.id, label: node.label, createdAt: node.createdAt,
    source: '工程历史检查点', messages: node.agentMessages || [] };
}
