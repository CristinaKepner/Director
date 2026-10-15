import { Handle, Position } from "@xyflow/react";
export default function Ports({ agent }: { agent: boolean }) {
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      {agent && <span className="creation-agent-cursor">➤ Agent</span>}
    </>
  );
}
