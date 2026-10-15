import { useEffect, useState } from "react";
import {
  useNodesState,
  type OnNodeDrag,
  type OnConnect,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from "@xyflow/react";
import type { Bridge, MediaNode, Snapshot } from "./types";
function nodesOf(view: Snapshot, bridge: Bridge): MediaNode[] {
  return view.nodes.map((item) => ({
    id: item.id,
    type: "media",
    position: { x: item.x, y: item.y },
    data: { item, agent: item.id === view.agentFocus, href: bridge.mediaHref },
  }));
}
function graphEvents(bridge: Bridge) {
  const onNodeDragStop = dragHandler(bridge);
  const onConnect: OnConnect = (c) =>
    void bridge.run("workflow.connect", { from: c.source, to: c.target });
  const onNodeClick: NodeMouseHandler<MediaNode> = (_, n) =>
    bridge.select(n.id);
  const onEdgeDoubleClick: EdgeMouseHandler = (_, e) =>
    void bridge.run("workflow.disconnect", { id: e.id });
  return { onNodeDragStop, onConnect, onNodeClick, onEdgeDoubleClick };
}
function mergeNodes(view: Snapshot, bridge: Bridge, old: MediaNode[]) {
  return nodesOf(view, bridge).map((n) => ({
    ...n,
    selected: old.find((p) => p.id === n.id)?.selected ?? false,
  }));
}
function useSnapshot(bridge: Bridge) {
  const [view, setView] = useState(bridge.read);
  useEffect(() => bridge.subscribe(() => setView(bridge.read())), [bridge]);
  return view;
}
function useGraphNodes(bridge: Bridge, view: Snapshot) {
  const initial = nodesOf(view, bridge);
  const [nodes, setNodes, onNodesChange] = useNodesState<MediaNode>(initial);
  useEffect(
    () => setNodes((old) => mergeNodes(view, bridge, old)),
    [view, bridge, setNodes],
  );
  return { nodes, onNodesChange };
}
export function useGraph(bridge: Bridge) {
  const view = useSnapshot(bridge);
  const graph = useGraphNodes(bridge, view);
  const edges = view.edges.map(edgeOf);
  return { ...graph, edges, ...graphEvents(bridge) };
}
function edgeOf(e: Snapshot["edges"][number]) {
  return {
    id: e.id,
    source: e.from,
    target: e.to,
    type: "smoothstep",
  };
}

function dragHandler(bridge: Bridge) {
  const onNodeDragStop: OnNodeDrag<MediaNode> = (_, n) =>
    void bridge.run("workflow.update", {
      id: n.id,
      patch: { x: n.position.x, y: n.position.y },
    });
  return onNodeDragStop;
}
