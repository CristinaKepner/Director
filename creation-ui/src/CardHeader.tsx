import type { Item } from "./types";
export default function CardHeader({ item }: { item: Item }) {
  return (
    <header>
      <small>{item.type}</small>
      <b>{item.label}</b>
    </header>
  );
}
