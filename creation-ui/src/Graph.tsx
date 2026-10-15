import { ReactFlow, Background, Controls } from "@xyflow/react";
import MediaCard from "./MediaCard";
import { useGraph } from "./useGraph";
import type { Bridge } from "./types";
const options = {
  nodeTypes: { media: MediaCard },
  fitView: true,
  fitViewOptions: { padding: 0.3, maxZoom: 1 },
  minZoom: 0.2,
  maxZoom: 2,
  deleteKeyCode: null,
};
export default function Graph({ bridge }: { bridge: Bridge }) {
  const graph = useGraph(bridge);
  return (
    <ReactFlow {...options} {...graph}>
      <Background color="var(--line-2)" gap={22} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}
