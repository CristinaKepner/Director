import { Handle, Position } from "@xyflow/react";
import BranchPorts from "./BranchPorts";
export default function OutputPorts({ control }: { control: boolean }) {
  return control ? (
    <BranchPorts />
  ) : (
    <Handle id="next" type="source" position={Position.Right} />
  );
}
