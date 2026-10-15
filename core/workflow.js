// Project-owned planning graph. Generation remains an explicit operation in the existing runtime.
export const NODE_TYPES = {
  text: {label:'Text · 文本', group:'资产', params:{text:''}},
  table: {label:'Table · 表格', group:'资产', params:{text:'名称,描述\n角色,主角'}},
  image: {label:'Image · 图片', group:'资产', params:{url:''}},
  video: {label:'Video · 视频', group:'资产', params:{url:''}},
  audio: {label:'Audio · 音频', group:'资产', params:{url:''}},
  views: {label:'三视图', group:'参考', params:{views:'正面、侧面、背面',prompt:'保持角色身份一致'}},
  light: {label:'光照', group:'参考', params:{prompt:'柔光，主光位于左前方 45°'}},
  camera: {label:'运镜', group:'参考', params:{prompt:'缓慢推进，50mm，6 秒'}},
  'image-generate': {label:'Image Generation', group:'生成', params:{prompt:'角色定妆照'}},
  'image-edit': {label:'Image Editing', group:'生成', params:{prompt:'修复面部瑕疵，保留身份与纹理'}},
  'video-generate': {label:'Video · Seedance', group:'生成', params:{prompt:'根据上游参考生成视频'}},
  if: {label:'Semantic If', group:'控制', params:{condition:'人脸上有明显瑕疵',threshold:0.7}},
  loop: {label:'Semantic Loop', group:'控制', params:{condition:'仍有面部瑕疵，需要继续修复',threshold:0.7,maxIterations:3}},
};
export function createNode(type, id, index = 0) {
  const definition = NODE_TYPES[type];
  if (!definition) throw new Error('未知节点类型');
  return {id,type,label:definition.label,x:40+(index%4)*270,y:40+Math.floor(index/4)*190,params:{...definition.params}};
}
function reaches(graph, start, target, seen = new Set()) {
  if (start === target) return true;
  if (seen.has(start)) return false;
  seen.add(start);
  return graph.edges.filter(e => e.from===start).some(e => reaches(graph,e.to,target,seen));
}
export function connectNodes(graph, from, to, branch = 'next') {
  if (!graph.nodes.some(n=>n.id===from) || !graph.nodes.some(n=>n.id===to)) throw new Error('节点不存在');
  if (from === to) throw new Error('不能连接自身；重复处理请使用 Loop 节点');
  if (!['next','true','false'].includes(branch)) throw new Error('无效分支');
  if (graph.edges.some(e=>e.from===from && e.to===to && e.branch===branch)) throw new Error('连线重复');
  if (reaches(graph,to,from)) throw new Error('连线会产生循环；请使用有上限的 Loop 节点');
  return {id:`${from}:${branch}:${to}`,from,to,branch};
}
export function inspectCondition(node, evidence, iteration = 0) {
  if (node.type==='loop' && iteration>=node.params.maxIterations) return {status:'limit',branch:null};
  if (!Number.isFinite(evidence?.score) || evidence.score<0 || evidence.score>1) return {status:'needs-review',branch:null};
  return {status:'reviewed',branch:evidence.score>=node.params.threshold?'true':'false'};
}
const TEMPLATE = [
  ['brief','text',40,60],['views','views',40,260],['image','image-generate',320,60],
  ['quality','if',600,60],['repair','image-edit',880,60],['style','image-edit',1160,250],
  ['camera','camera',1160,460],['video','video-generate',1440,250],
];
const CONNECTIONS = [
  ['brief','image'],['views','image'],['image','quality'],['quality','repair','true'],
  ['quality','style','false'],['repair','style'],['style','video'],['camera','video'],
];
export function characterWorkflow() {
  const nodes = TEMPLATE.map(([id,type,x,y])=>({...createNode(type,id),x,y}));
  nodes.find(n=>n.id==='style').params.prompt = '添加角色配饰、贴画与妆容，保持身份一致';
  nodes.find(n=>n.id==='style').label = '妆造与配饰';
  const graph = {version:1,nodes,edges:[]};
  graph.edges = CONNECTIONS.map(([from,to,branch])=>connectNodes(graph,from,to,branch));
  return graph;
}
export function validateNode(node) {
  if (!NODE_TYPES[node.type] || typeof node.label!=='string' || node.label.length>100) throw new Error('节点名称或类型无效');
  if (![node.x,node.y].every(Number.isFinite)) throw new Error('节点坐标无效');
  if (!node.params || Object.values(node.params).some(v=>typeof v==='string' && v.length>10000)) throw new Error('参数过长');
  if (['if','loop'].includes(node.type)) validateControl(node.params);
  return node;
}
function validateControl(params) {
  if (typeof params.condition!=='string' || !params.condition.trim()) throw new Error('请输入判断条件');
  if (!Number.isFinite(params.threshold) || params.threshold<0 || params.threshold>1) throw new Error('阈值须在 0–1 之间');
  if (params.maxIterations!==undefined && (!Number.isInteger(params.maxIterations) || params.maxIterations<1 || params.maxIterations>10)) throw new Error('循环上限须为 1–10 次');
}
