import type { Item } from "./types";
type Props = { item: Item; href: (url: string) => string };
export default function MediaPreview({ item, href }: Props) {
  const src = href(String(item.params["url"] || ""));
  if (!src) return <p>从工程素材中添加参照，或填写媒体地址。</p>;
  if (item.type === "image")
    return <img src={src} alt={item.label} draggable={false} />;
  return playback(item.type, src);
}
function playback(type: string, src: string) {
  if (type === "video")
    return (
      <video className="nodrag nowheel" src={src} controls preload="metadata" />
    );
  return (
    <audio className="nodrag nowheel" src={src} controls preload="metadata" />
  );
}
