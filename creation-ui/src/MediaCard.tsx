import type { NodeProps } from "@xyflow/react";
import type { MediaNode } from "./types";
import CardBody from "./CardBody";
import CardHeader from "./CardHeader";
import Ports from "./Ports";
export default function MediaCard({ data, selected }: NodeProps<MediaNode>) {
  const className = cardClass(selected, data.agent);
  return (
    <article className={className}>
      <CardHeader item={data.item} />
      <CardBody item={data.item} href={data.href} />
      <Ports {...portsOf(data)} />
    </article>
  );
}

function portsOf(data: MediaNode["data"]) {
  return {
    agent: data.agent,
    control: ["if", "loop"].includes(data.item.type),
  };
}
function cardClass(selected: boolean, agent: boolean) {
  return `creation-node ${selected ? "user-selected" : ""} ${agent ? "agent-selected" : ""}`;
}
