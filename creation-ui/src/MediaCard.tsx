import type { NodeProps } from "@xyflow/react";
import type { MediaNode } from "./types";
import CardBody from "./CardBody";
import CardHeader from "./CardHeader";
import Ports from "./Ports";
export default function MediaCard({ data, selected }: NodeProps<MediaNode>) {
  const className = `creation-node ${selected ? "user-selected" : ""} ${data.agent ? "agent-selected" : ""}`;
  return (
    <article className={className}>
      <CardHeader item={data.item} />
      <CardBody item={data.item} href={data.href} />
      <Ports agent={data.agent} />
    </article>
  );
}
