export const creationShell = `
<header class="creation-heading"><div><span class="creation-eyebrow">PROJECT STUDIO</span><h2>创作台</h2></div><nav class="creation-tabs"><button data-create="overview" class="active">创作概览</button><button data-create="nodes">节点编排</button><button data-create="stage">镜头预演 ↗</button></nav><button data-create="new">新建工程</button><button class="primary" data-create="generate">生成 / 成片</button></header>
<section class="creation-overview" aria-label="创作概览"></section>
<dialog class="creation-dialog" aria-labelledby="creationStartTitle"><button type="button" class="creation-dismiss" data-create="dismiss" aria-label="关闭新工程引导">×</button>
<section class="creation-start" aria-label="新工程引导">
  <div class="creation-welcome"><span>开始一段新的创作</span><h1 id="creationStartTitle">这次，你想从哪里开始？</h1><p>先确定方向，再把素材、镜头和生成串起来。</p></div>
  <div class="creation-routes"><button data-route="idea" class="active"><b>✦ 一句话生成</b><span>描述题材、主体或一个画面，从想法开始规划。</span></button><button data-route="reference"><b>▧ 依赖参照生成</b><span>带入图片、视频或链接，拆解风格、构图与节奏。</span></button></div>
  <form data-start-form><label>你想做什么？<textarea name="brief" maxlength="5000" placeholder="例如：一条 15 秒的都市轻科幻短片，从雨夜便利店开始…"></textarea></label><div data-reference-fields hidden><label>参照链接<input name="reference" placeholder="粘贴图片 / 视频链接"/></label><label class="creation-upload">或上传图片 / 视频<input data-reference-file type="file" accept="image/*,video/*"/></label></div><div class="creation-start-footer"><label>创作方式<select name="skill"><option value="explore">题材探索</option><option value="remix">参考复刻</option><option value="test">A/B 内测</option></select></label><button class="primary" type="submit">生成创作方案 →</button></div></form>
<output class="creation-modal-status" role="status"></output></section></dialog>
<section class="creation-work" hidden><nav class="creation-tools"><label>添加<select data-node-type><option value="text">文字</option><option value="table">表格</option><option value="image">图片</option><option value="video">视频</option><option value="audio">音频</option><option value="html">HTML 画面</option><option value="views">三视图</option><option value="light">光照</option><option value="camera">运镜</option></select></label><button data-create="add">＋ 节点</button><label class="creation-upload creation-file-button">＋ 导入素材<input data-media-file type="file" accept="image/*,video/*,audio/*"/></label><button data-create="assets">工程素材</button><button data-create="plan">交给 Agent</button></nav><div class="creation-assets" hidden></div><div class="creation-graph" aria-label="项目素材与节点"></div><div class="creation-details"><span>选择节点编辑。拖动端口连线，双击连线删除。</span></div><footer class="creation-legend"><span>● 你的选择</span><span>➤ Agent 的操作位置</span><span>每次规划只读取当前工程内容</span></footer></section>
<output class="creation-status" role="status"></output>`;
export function escapeHTML(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
}
export function detailsMarkup(node) {
  if (!node) return "<span>选择节点编辑。拖动端口连线，双击连线删除。</span>";
  return `<form data-node-form data-id="${escapeHTML(node.id)}"><label>名称<input name="label" maxlength="100" value="${escapeHTML(node.label)}"/></label>${parameterFields(node.params)}<div><button type="submit">保存修改</button><button type="button" data-create="remove">删除节点</button></div></form>`;
}
function paramField([key, value]) {
  const names = {
    text: "内容",
    url: "媒体地址",
    html: "HTML / CSS / JavaScript",
    prompt: "描述",
    views: "视图",
  };
  return `<label>${names[key] || escapeHTML(key)}<textarea name="${escapeHTML(key)}" maxlength="10000">${escapeHTML(value)}</textarea></label>`;
}
export function assetMarkup(asset) {
  return `<button data-attach="${escapeHTML(asset.id)}"><small>${escapeHTML(asset.mediaKind || "image")}</small>${escapeHTML(asset.label || "未命名素材")} ＋</button>`;
}

function parameterFields(params) {
  return Object.entries(params)
    .filter(([key]) => key !== "assetId")
    .map(paramField)
    .join("");
}
