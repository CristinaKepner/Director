import {createNode,connectNodes,characterWorkflow,validateNode} from './workflow.js';
const empty = () => ({version:1,nodes:[],edges:[]});
function change(store, operation) {
  const graph = structuredClone(store.get().project.workflow || empty());
  const result = operation(graph);
  store.patch(d => { d.project.workflow = graph; });
  return {ok:true,...result};
}
function updateNode(graph, {id,patch}) {
  const index = graph.nodes.findIndex(n=>n.id===id);
  if (index<0) throw new Error('节点不存在');
  const old = graph.nodes[index];
  graph.nodes[index] = validateNode({...old,...patch,id,type:old.type,params:{...old.params,...patch.params}});
}
function removeNode(graph, id) {
  graph.nodes = graph.nodes.filter(n=>n.id!==id);
  graph.edges = graph.edges.filter(e=>e.from!==id && e.to!==id);
}
function appendTemplate(graph, uid) {
  const template = characterWorkflow();
  const ids = new Map(template.nodes.map(n=>[n.id,uid('node')]));
  const offset = graph.nodes.length ? Math.max(...graph.nodes.map(n=>n.y))+240 : 0;
  graph.nodes.push(...template.nodes.map(n=>({...n,id:ids.get(n.id),y:n.y+offset})));
  graph.edges.push(...template.edges.map(e=>({...e,id:uid('edge'),from:ids.get(e.from),to:ids.get(e.to)})));
}
export function registerWorkflowActions({register,store,uid}) {
  const add = ({type}) => change(store,g=>{const node=createNode(type,uid('node'),g.nodes.length);g.nodes.push(node);return {id:node.id};});
  const edit = payload => change(store,g=>updateNode(g,payload));
  const connect = ({from,to,branch}) => change(store,g=>{g.edges.push(connectNodes(g,from,to,branch));});
  register('workflow.add',{doc:'添加工作流规划节点',params:{type:'string'},handler:add});
  register('workflow.update',{doc:'修改节点位置和参数',params:{id:'string',patch:'object'},handler:edit});
  register('workflow.connect',{doc:'连接规划节点（不执行生成）',params:{from:'string',to:'string',branch:'next|true|false'},handler:connect});
  registerWorkflowUtilities({register,store,uid});
}
function registerWorkflowUtilities({register,store,uid}) {
  register('workflow.remove',{doc:'删除节点与关联连线',params:{id:'string'},handler:({id})=>change(store,g=>removeNode(g,id))});
  register('workflow.disconnect',{doc:'删除连线',params:{id:'string'},handler:({id})=>change(store,g=>{g.edges=g.edges.filter(e=>e.id!==id);})});
  register('workflow.template',{doc:'追加人设预处理工作流，不覆盖已有节点',handler:()=>change(store,g=>appendTemplate(g,uid))});
  register('workflow.read',{doc:'读取当前工程工作流供 Agent 规划',undoable:false,handler:()=>({ok:true,graph:structuredClone(store.get().project.workflow||empty())})});
}
