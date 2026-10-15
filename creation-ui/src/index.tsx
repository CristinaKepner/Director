import { createRoot } from "react-dom/client";
import Graph from "./Graph";
import type { Bridge } from "./types";
import "@xyflow/react/dist/style.css";
export function mountCreationGraph(root: HTMLElement, bridge: Bridge) {
  const app = createRoot(root);
  app.render(<Graph bridge={bridge} />);
  return () => app.unmount();
}
