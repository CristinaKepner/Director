import {store} from '../../core/store.js';
import {dispatch} from './client.js';
import {inspectCondition} from '../../core/workflow.js';
import {workflowToolbar,nodeMarkup,edgeMarkup,inspectorMarkup} from './workflow-markup.js';
const graphOf = () => store.get().project.workflow || {version:1,nodes:[],edges:[]};
export function initWorkflowEditor(root, toast) {
  const state = {selected:null,pending:null,drag:null,zoom:1,key:null,project:null};
  root.innerHTML = `${workflowToolbar()}<div class="wf-body"><div class="wf-viewport"><div class="wf-plane"></div></div><aside class="wf-inspector"></aside></div><footer class="wf-status" role="status">先添加节点或使用人设预处理模板。</footer>`;
  const run = async (action,payload) => {const r=await dispatch(action,payload);if(!r.ok)toast(r.hint||r.message||r.error,true);return r;};
  bindCommands(root,state,run);
  bindPointer(root,state,run);
  root.addEventListener('submit',e=>saveParams(e,root,state,run));
  store.subscribe(()=>render(root,state));
  render(root,state);
}
function render(root,state) {
  const graph=graphOf(), key=JSON.stringify(graph), project=store.get().project.id;
  if (state.key===key && state.project===project) return;
  if (state.project!==project) {state.selected=null;state.pending=null;state.project=project;}
  state.key=key;
  renderGraph(root,state,graph);
}
function renderGraph(root,state,graph) {
  const plane=root.querySelector('.wf-plane');
  plane.innerHTML=`<svg aria-hidden="true">${graph.edges.map(e=>edgeMarkup(e,graph)).join('')}</svg>${graph.nodes.map(n=>nodeMarkup(n,state.selected,state.pending?.from)).join('')}`;
  plane.style.width=`${Math.max(1800,...graph.nodes.map(n=>n.x+280))}px`;
  plane.style.height=`${Math.max(900,...graph.nodes.map(n=>n.y+200))}px`;
  root.querySelector('.wf-inspector').innerHTML=inspectorMarkup(graph.nodes.find(n=>n.id===state.selected),graph);
}
function refresh(root,state) {
  state.key=null;
  render(root,state);
}
function bindCommands(root,state,run) {
  root.addEventListener('click',async e=>{
    const button=e.target.closest('[data-wf]');
    if (!button) return;
    await command(button,root,state,run);
  });
  root.addEventListener('keydown',e=>keyboard(e,root,state,run));
}
async function command(button,root,state,run) {
  const action=button.dataset.wf;
  if (action==='add') {await run('workflow.add',{type:root.querySelector('[data-wf-type]').value});return;}
  if (action==='template') {await run('workflow.template');return;}
  if (action==='fit') {fit(root,state);return;}
  if (action.startsWith('zoom-')) {zoom(root,state,action);return;}
  if (action==='output' || action==='input') {await connection(button,root,state,run);return;}
  if (action==='select' || action==='deselect') {state.selected=action==='select'?button.dataset.node:null;refresh(root,state);return;}
  await editCommand(button,root,state,run);
}
async function editCommand(button,root,state,run) {
  if (button.dataset.wf==='remove') {await run('workflow.remove',{id:state.selected});state.selected=null;refresh(root,state);}
  if (button.dataset.wf==='disconnect') await run('workflow.disconnect',{id:button.dataset.edge});
  if (button.dataset.wf==='review') review(root,state);
}
async function connection(button,root,state,run) {
  if (button.dataset.wf==='output') state.pending={from:button.dataset.node,branch:button.dataset.branch};
  else if (state.pending) {const result=await run('workflow.connect',{...state.pending,to:button.dataset.node});if(result.ok)state.pending=null;}
  root.querySelector('.wf-status').textContent=state.pending?'选择目标节点的输入端口 · Esc 取消':'连线已保存 · 可在参数栏删除';
  refresh(root,state);
}
function fit(root,state) {
  const viewport=root.querySelector('.wf-viewport'), nodes=graphOf().nodes;
  const width=Math.max(500,...nodes.map(n=>n.x+280));
  state.zoom=Math.min(1,Math.max(.25,(viewport.clientWidth-24)/width));
  root.querySelector('.wf-plane').style.zoom=state.zoom;
  viewport.scrollTo(0,0);
}
function keyboard(e,root,state,run) {
  if (e.target.matches('input,textarea,select')) return;
  if (e.key==='Escape') {state.pending=null;refresh(root,state);}
  if ((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='z') {
    e.preventDefault();e.stopPropagation();
    run(e.shiftKey?'project.redo':'project.undo');
  }
}
function review(root,state) {
  const node=graphOf().nodes.find(n=>n.id===state.selected), value=root.querySelector('[data-score]').value;
  const result=inspectCondition(node,value===''?null:{score:Number(value)});
  root.querySelector('[data-review]').textContent=result.branch?`条件分支：${result.branch}`:'缺少有效评估，暂停等待人工确认';
}
async function saveParams(event,root,state,run) {
  if (!event.target.matches('[data-wf-form]')) return;
  event.preventDefault();
  const node=graphOf().nodes.find(n=>n.id===state.selected), data=new FormData(event.target);
  const params=Object.fromEntries(Object.keys(node.params).map(k=>[k,typeof node.params[k]==='number'?Number(data.get(k)):data.get(k)]));
  await run('workflow.update',{id:node.id,patch:{label:data.get('label'),params}});
}
function bindPointer(root,state,run) {
  root.addEventListener('pointerdown',e=>beginDrag(e,root,state));
  root.addEventListener('pointermove',e=>moveDrag(e,root,state));
  root.addEventListener('pointerup',e=>endDrag(e,root,state,run));
  root.addEventListener('pointercancel',()=>{state.drag=null;refresh(root,state);});
}
function beginDrag(e,root,state) {
  const header=e.target.closest('[data-drag]');
  if (!header || e.button!==0) return;
  const node=graphOf().nodes.find(n=>n.id===header.dataset.drag);
  state.drag={id:node.id,x:node.x,y:node.y,startX:e.clientX,startY:e.clientY,project:store.get().project.id};
  root.setPointerCapture(e.pointerId);
}
function moveDrag(e,root,state) {
  if (!state.drag) return;
  const drag=state.drag, node=root.querySelector(`[data-node="${CSS.escape(drag.id)}"]`);
  drag.nextX=Math.max(0,drag.x+(e.clientX-drag.startX)/state.zoom);
  drag.nextY=Math.max(0,drag.y+(e.clientY-drag.startY)/state.zoom);
  node.style.left=`${drag.nextX}px`;
  node.style.top=`${drag.nextY}px`;
}
async function endDrag(e,root,state,run) {
  const drag=state.drag;
  state.drag=null;
  if (!drag || drag.project!==store.get().project.id) return;
  if (Math.abs(e.clientX-drag.startX)+Math.abs(e.clientY-drag.startY)<4) {state.selected=drag.id;refresh(root,state);return;}
  await run('workflow.update',{id:drag.id,patch:{x:drag.nextX??drag.x,y:drag.nextY??drag.y}});
  refresh(root,state);
}

function zoom(root,state,action) {
  state.zoom=Math.max(.25,Math.min(1.5,state.zoom+(action==='zoom-in'?.1:-.1)));
  root.querySelector('.wf-plane').style.zoom=state.zoom;
}
