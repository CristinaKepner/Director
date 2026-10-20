import test from 'node:test';
import assert from 'node:assert/strict';
import {NODE_TYPES,createNode,connectNodes,inspectCondition,characterWorkflow} from '../core/features/workflow/workflow.js';

test('catalog includes assets, references, generation and semantic controls', () => {
  for (const kind of ['text','table','image','video','audio','views','light','camera','image-generate','image-edit','video-generate','if','loop']) {
    assert.ok(NODE_TYPES[kind], kind);
  }
});
test('nodes preserve editable parameters and reject unknown types', () => {
  assert.equal(createNode('if','a').params.condition, '人脸上有明显瑕疵');
  assert.throws(() => createNode('unknown','a'), /节点类型/);
});
test('connections reject dangling nodes, self loops, duplicates and cycles', () => {
  const graph = {nodes:[createNode('text','a'),createNode('image','b')],edges:[]};
  graph.edges.push(connectNodes(graph,'a','b'));
  assert.throws(() => connectNodes(graph,'a','b'), /重复/);
  assert.throws(() => connectNodes(graph,'b','a'), /循环/);
  assert.throws(() => connectNodes(graph,'a','a'), /自身/);
  assert.throws(() => connectNodes(graph,'a','missing'), /不存在/);
});
test('semantic checks require evidence and never silently treat unknown as false', () => {
  const node = createNode('if','condition');
  assert.equal(inspectCondition(node, null).status, 'needs-review');
  assert.equal(inspectCondition(node, {score:.9}).branch, 'true');
  assert.equal(inspectCondition(node, {score:.1}).branch, 'false');
  assert.equal(inspectCondition(node, {score:NaN}).status, 'needs-review');
});
test('threshold boundary and loop budget are explicit', () => {
  const node = createNode('loop','loop');
  assert.equal(inspectCondition(node, {score:node.params.threshold}, 0).branch, 'true');
  assert.equal(inspectCondition(node, {score:1}, node.params.maxIterations).status, 'limit');
});
test('character template expresses repair and bypass branches', () => {
  const graph = characterWorkflow();
  assert.equal(graph.nodes.length, 8);
  assert.ok(graph.edges.some(e => e.from==='quality' && e.branch==='true' && e.to==='repair'));
  assert.ok(graph.edges.some(e => e.from==='quality' && e.branch==='false' && e.to==='style'));
  assert.ok(graph.nodes.some(n => n.type==='video-generate'));
});

import {store,createEmptyProject,loadProjectData,persistable} from '../core/store.js';
import {dispatch} from '../core/actions.js';
const go = (action,payload) => {const result=dispatch(action,payload);assert.equal(result.ok,true,JSON.stringify(result));return result;};
test('workflow actions save, reopen, undo and remove related edges', () => {
  loadProjectData(createEmptyProject());
  const a=go('workflow.add',{type:'text'}).id, b=go('workflow.add',{type:'image'}).id;
  go('workflow.connect',{from:a,to:b});loadProjectData(persistable());
  assert.equal(go('workflow.read').graph.edges.length,1);
  go('workflow.remove',{id:a});assert.equal(go('workflow.read').graph.edges.length,0);
  go('project.undo');assert.equal(go('workflow.read').graph.nodes.length,2);
  go('workflow.update',{id:a,patch:{x:350,params:{text:'角色'}}});
  assert.equal(store.get().project.workflow.nodes[0].params.text,'角色');
});
test('invalid edit leaves existing graph unchanged', () => {
  const a=go('workflow.add',{type:'loop'}).id;
  const before=structuredClone(store.get().project.workflow);
  assert.equal(dispatch('workflow.update',{id:a,patch:{params:{maxIterations:50}}}).ok,false);
  assert.deepEqual(store.get().project.workflow,before);
});
test('templates append without overwriting previous work or creating duplicate IDs', () => {
  loadProjectData(createEmptyProject());go('workflow.template');go('workflow.template');
  const graph=go('workflow.read').graph;
  assert.equal(graph.nodes.length,16);assert.equal(new Set(graph.nodes.map(n=>n.id)).size,16);
  assert.ok(graph.edges.every(e=>graph.nodes.some(n=>n.id===e.from) && graph.nodes.some(n=>n.id===e.to)));
});
