import type { Node } from "@xyflow/react";
export interface Item {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  params: Record<string, string | number>;
}
export interface Snapshot {
  projectId: string;
  nodes: Item[];
  edges: {
    id: string;
    from: string;
    to: string;
    branch?: "next" | "true" | "false";
  }[];
  agentFocus: string | null;
}
export interface Bridge {
  read: () => Snapshot;
  subscribe: (listener: () => void) => () => void;
  run: (action: string, payload: unknown) => Promise<unknown>;
  select: (id: string) => void;
  mediaHref: (url: string) => string;
}
export type MediaNode = Node<
  { item: Item; agent: boolean; href: (url: string) => string },
  "media"
>;
