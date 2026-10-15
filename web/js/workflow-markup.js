import {NODE_TYPES} from '../../core/workflow.js';
import {escapeHTML as esc} from './journey-canvas.js';
const labels = {text:'内容 / CSV',url:'素材 URL / 媒体路径',prompt:'处理要求',views:'视角',condition:'语义条件（条件成立时走 true）',threshold:'触发阈值（0–1）',maxIterations:'最大循环次数（1–10）'};
export function workflowToolbar() {
  const options = Object.entries(NODE_TYPES).map(([key,n])=>`<option value="${key}">${n.group} · ${n.label}</option>`).join('');
  return `<header class="wf-toolbar"><select aria-label="节点类型" data-wf-type>${options}</select><button data-wf="add">＋ 添加节点</button><button data-wf="template">人设预处理模板</button><button data-wf="fit">适合画布</button><button data-wf="zoom-in" aria-label="放大工作流">＋</button><button data-wf="zoom-out" aria-label="缩小工作流">−</button><span>规划模式 · 不自动调用模型</span></header>`;
}
function port(node, branch, label) {
  return `<button class="wf-port" data-wf="output" data-node="${esc(node.id)}" data-branch="${branch}" aria-label="${esc(node.label)} ${label}输出">${label} ○</button>`;
}
function outputs(node) {
  return ['if','loop'].includes(node.type) ? port(node,'true','true')+port(node,'false','false') : port(node,'next','输出');
}
export function nodeMarkup(node, selected, pending) {
  const definition = NODE_TYPES[node.type];
  if (!definition) return '';
  return `<article class="wf-node ${selected===node.id?'selected':''} ${pending===node.id?'connecting':''}" style="left:${node.x}px;top:${node.y}px" data-node="${esc(node.id)}">
    <header data-drag="${esc(node.id)}"><small>${definition.group}</small><button data-wf="select" data-node="${esc(node.id)}">${esc(node.label)}</button></header>
    <p>${esc(node.params.condition||node.params.prompt||node.params.text||node.params.url||'点击标题编辑参数')}</p>
    <footer><button class="wf-port" data-wf="input" data-node="${esc(node.id)}" aria-label="${esc(node.label)} 输入">○ 输入</button><span>${outputs(node)}</span></footer></article>`;
}
export function edgeMarkup(edge, graph) {
  const from = graph.nodes.find(n=>n.id===edge.from), to = graph.nodes.find(n=>n.id===edge.to);
  if (!from || !to) return '';
  const x = from.x+230, y = from.y+120, end = to.y+120;
  return `<g><path d="M${x} ${y} C${x+80} ${y},${to.x-80} ${end},${to.x} ${end}"/><text x="${x+20}" y="${y-10}">${esc(edge.branch)}</text></g>`;
}
function field([key,value]) {
  const numeric = typeof value==='number';
  const control = numeric ? `<input type="number" step="${key==='threshold'?'.05':'1'}" min="${key==='threshold'?'0':'1'}" max="${key==='threshold'?'1':'10'}" name="${key}" value="${value}">` : `<textarea rows="3" name="${key}">${esc(value)}</textarea>`;
  return `<label>${labels[key]||esc(key)}${control}</label>`;
}
function edgeRow(edge, graph) {
  const target = graph.nodes.find(n=>n.id===edge.to);
  return `<li>${esc(edge.branch)} → ${esc(target?.label||edge.to)} <button data-wf="disconnect" data-edge="${esc(edge.id)}" aria-label="删除连线">×</button></li>`;
}
export function inspectorMarkup(node, graph) {
  if (!node) return '<p class="wf-empty">添加节点，拖动标题调整位置。<br>点击输出端口，再点击目标输入端口连接。<br>选择标题可编辑参数。<br>⌘ Z 撤销 · 滚动画布浏览</p>';
  return `<form data-wf-form><header><b>节点参数</b><button type="button" data-wf="deselect" aria-label="关闭参数">×</button></header>
    <label>名称<input name="label" maxlength="100" value="${esc(node.label)}"></label>${Object.entries(node.params).map(field).join('')}
    <button type="submit">保存参数</button><button type="button" data-wf="remove">删除节点</button>
    <p>生成节点仅规划；实际生成请使用主页面的生成面板。</p></form>
    ${['if','loop'].includes(node.type)?'<div class="wf-review"><label>人工评估：条件成立置信度<input data-score type="number" min="0" max="1" step=".05" placeholder="0–1"></label><button data-wf="review">预览分支</button><output data-review></output><small>这里只演示阈值路由，不是自动视觉检测。</small></div>':''}
    <ul>${graph.edges.filter(e=>e.from===node.id).map(e=>edgeRow(e,graph)).join('')}</ul>`;
}
