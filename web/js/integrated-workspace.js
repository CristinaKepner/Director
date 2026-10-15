import {initWorkflowEditor} from './workflow-editor.js';
export function initIntegratedWorkspace(toast) {
  const app=document.getElementById('app'),stage=app.querySelector('.stage');
  const journey=document.getElementById('journeyWorkspace'),toggle=document.getElementById('journeyToggle');
  const nav=document.createElement('nav'),workflow=document.createElement('section');
  nav.className='workspace-tabs';nav.setAttribute('aria-label','主工作区');
  nav.innerHTML='<button data-workspace="stage">3D 舞台</button><button data-workspace="workflow">节点工作流</button>';
  nav.prepend(toggle);stage.prepend(nav);stage.append(journey,workflow);
  workflow.id='workflowWorkspace';workflow.className='workflow-workspace';workflow.hidden=true;
  initWorkflowEditor(workflow,toast);bindWorkspace(nav,app,workflow,toggle);
}
function bindWorkspace(nav,app,workflow,toggle) {
  nav.addEventListener('click',e=>{
    if (e.target.closest('#journeyToggle')) {app.classList.remove('workflow-mode');workflow.hidden=true;return;}
    const button=e.target.closest('[data-workspace]');
    if (!button) return;
    if (app.classList.contains('journey-mode')) toggle.click();
    const open=button.dataset.workspace==='workflow';
    app.classList.toggle('workflow-mode',open);workflow.hidden=!open;
  });
}
