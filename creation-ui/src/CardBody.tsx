import type { Item } from "./types";
import MediaPreview from "./MediaPreview";
import HtmlPreview from "./HtmlPreview";
type Props = { item: Item; href: (url: string) => string };
export default function CardBody({ item, href }: Props) {
  item = previewItem(item);
  if (item.type === "html")
    return <HtmlPreview html={String(item.params["html"] || "")} />;
  if (["image", "video", "audio"].includes(item.type))
    return <MediaPreview item={item} href={href} />;
  return <p>{textOf(item)}</p>;
}
function textOf(item: Item) {
  return String(
    item.params["text"] ||
      item.params["prompt"] ||
      item.params["condition"] ||
      "选择节点编辑内容",
  );
}

function previewItem(item: Item): Item {
  if (!item.params["resultUrl"]) return item;
  return {
    ...item,
    type: String(item.params["resultKind"]),
    params: { url: item.params["resultUrl"] },
  };
}
