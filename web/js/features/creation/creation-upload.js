import { api, client } from "../../client.js";
import { store } from "../../../../core/store.js";
export async function uploadCreationMedia(file) {
  const kind = validateFile(file);
  const project = store.get().project.id;
  const result = await api.post(`upload?label=${kind}`, file, {
    headers: { "content-type": file.type },
    timeout: 120000,
  });
  validateResult(result, project);
  return { url: result.url, mediaKind: kind, label: file.name };
}

function validateFile(file) {
  if (!client.base) throw new Error("请先连接后端，再上传素材");
  if (file.size > 50_000_000) throw new Error("单个素材请控制在 50 MB 以内");
  const kind = file.type.split("/")[0];
  if (!["image", "audio", "video"].includes(kind))
    throw new Error("请选择图片、音频或视频");
  return kind;
}

function validateResult(result, project) {
  if (!result.ok) throw new Error(result.error || "上传失败");
  if (store.get().project.id !== project)
    throw new Error("工程已切换，请在当前工程重新选择素材");
}
