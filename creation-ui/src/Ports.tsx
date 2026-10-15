import { Handle, Position } from "@xyflow/react";
import OutputPorts from "./OutputPorts";
type Props = { agent: boolean; control: boolean };
export default function Ports({ agent, control }: Props) {
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <OutputPorts control={control} />
      {agent && <span className="creation-agent-cursor">➤ Agent</span>}
    </>
  );
}
