import { Handle, Position } from "@xyflow/react";
const ports = [
  {
    id: "true",
    type: "source" as const,
    position: Position.Right,
    style: { top: "35%" },
    title: "条件成立 / 需要修复",
  },
  {
    id: "false",
    type: "source" as const,
    position: Position.Right,
    style: { top: "75%" },
    title: "条件不成立 / 无需修复",
  },
];
export default function BranchPorts() {
  return (
    <>
      {ports.map((p) => (
        <Handle key={p.id} {...p} />
      ))}
    </>
  );
}
