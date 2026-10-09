import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { classifyModels } from '../src/adapters/model-catalog.mjs';
import { routePlanners, routeGeneration } from '../src/adapters/routing.mjs';
import { createMosshubAdapter } from '../src/adapters/mosshub.mjs';
const catalog={planning:['gemini-3.1-pro-preview'],video:['MiniMax-H3','MiniMax-H3-Max'],image:['gemini-3-pro-image','doubao-seedream-5-0-pro-260628']};
const json=data=>new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});
function execute(adapter,job) {
  return new Promise(resolve=>adapter.submit(job,(id,patch)=>{if(['done','failed','cancelled'].includes(patch.status))resolve(patch);}));
}
test('the five MossHub models belong to exactly one modality',()=>{
  assert.deepEqual(classifyModels({data:[
    {id:'MiniMax-H3',supported_endpoint_types:['openai','openai-video']},
    {id:'gemini-3.1-pro-preview',supported_endpoint_types:['openai']},
    {id:'gemini-3-pro-image',supported_endpoint_types:['gemini','openai']},
    {id:'MiniMax-H3-Max',supported_endpoint_types:['openai','openai-video']},
    {id:'doubao-seedream-5-0-pro-260628',supported_endpoint_types:['openai','image-generation']},
  ]}),catalog);
});
test('Astra and Gemini planning use their own gateways without leaking or falling back',async()=>{
  const seen=[];
  const planner=routePlanners([
    {models:['gpt-6-astra','gemini-3.1-pro-preview'],baseUrl:'https://old.test',plan:(text,ctx)=>{seen.push(['old',text,ctx.model]);return 'old';}},
    {models:catalog.planning,baseUrl:'https://moss.test',plan:(text,ctx)=>{seen.push(['moss',text,ctx.model]);return 'moss';}},
  ],'gpt-6-astra');
  assert.equal(planner.model,'gpt-6-astra');
  assert.equal(planner.plan('brief',{model:'gpt-6-astra'}),'old');
  assert.equal(planner.plan('brief',{model:'gemini-3.1-pro-preview'}),'moss');
  assert.deepEqual(seen,[['old','brief','gpt-6-astra'],['moss','brief','gemini-3.1-pro-preview']]);
  assert.throws(()=>planner.plan('brief',{model:'MiniMax-H3'}),/PLANNING_MODEL_NOT_AVAILABLE/);
});
for(const [provider,model,minimum] of [['minimax-h3','MiniMax-H3',4],['minimax-h3-max','MiniMax-H3-Max',5]]) {
  test(`${model} uses native video create/query and saves only an actual result`,async()=>{
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'director-moss-'));const calls=[];
    try {
      const adapter=createMosshubAdapter({apiKey:'moss-secret',catalog,mediaDir:dir,mediaUrl:n=>'/media/'+n,pollMs:0,fetchImpl:async(url,opts)=>{
        calls.push([url,opts]);
        if(url.endsWith('/video_generation'))return json({task_id:'task-1'});
        if(url.endsWith('/task-1'))return json({task:{status:'succeeded',content:{video_url:'https://cdn.test/result.mp4'}}});
        assert.equal(url,'https://cdn.test/result.mp4');assert.equal(opts.headers,undefined);return new Response('mock video',{headers:{'content-type':'video/mp4'}});
      }});
      const out=await execute(adapter,{id:'job-test',provider,mode:'t2v',seconds:1,aspect:'16:9',prompt:'film',inputs:{}});
      assert.equal(out.status,'done');assert.equal(out.result.kind,'video');assert.ok(fs.existsSync(path.join(dir,'job-test.mp4')));
      assert.equal(calls[0][0],'https://api.mosshub.cn/hailuo/v2/video_generation');
      const body=JSON.parse(calls[0][1].body);assert.equal(body.model,model);assert.equal(body.duration,minimum);assert.equal(body.resolution,'768P');
      assert.equal(calls[0][1].headers.authorization,'Bearer moss-secret');assert.match(calls[1][0],/hailuo\/v2\/query\/video_generation\/task-1$/);
    }finally{fs.rmSync(dir,{recursive:true,force:true});}
  });
}
test('MossHub v2v converts its reference before sending and never sends a local URL',async()=>{
  const calls=[];let span;
  const adapter=createMosshubAdapter({apiKey:'moss',catalog,pollMs:0,publicUrl:'https://media.test/token',toMp4:async(ref,s)=>{span=s;return '/media/cfr30.mp4';},fetchImpl:async(url,opts)=>{
    calls.push([url,opts]);return url.endsWith('/video_generation')?json({task_id:'v'}):json({task:{status:'succeeded',content:{url:'https://cdn.test/v.mp4'}}});
  }});
  const r=await execute(adapter,{id:'v',provider:'minimax-h3',mode:'v2v',prompt:'film',seconds:5,inputs:{video:'/media/raw.webm',videoFrom:'origin',videoSpan:{from:2,to:7}}});
  assert.equal(r.status,'done');assert.deepEqual(span,{from:2,to:7});
  assert.equal(JSON.parse(calls[0][1].body).content[1].video_url.url,'https://media.test/token/media/cfr30.mp4');
});
test('missing video transcode and success without video both fail, never masquerade as completed media',async()=>{
  let submissions=0;
  const base={apiKey:'moss',catalog,pollMs:0,fetchImpl:async()=>{submissions++;return json({task_id:'x',task:{status:'succeeded'}});}};
  const missing=await execute(createMosshubAdapter(base),{id:'a',provider:'minimax-h3',mode:'v2v',prompt:'film',inputs:{video:'/media/x.webm'}});
  assert.equal(missing.status,'failed');assert.equal(submissions,0);
  const bad=await execute(createMosshubAdapter(base),{id:'b',provider:'minimax-h3',mode:'t2v',prompt:'film',inputs:{}});
  assert.equal(bad.status,'failed');assert.match(bad.error,/without video URL/);
});
test('image models use image endpoints, parse inline images and never hit chat/video endpoints',async()=>{
  for(const [provider,expected] of [['mosshub-seedream-pro','/v1/images/generations'],['mosshub-gemini-image','/v1beta/models/gemini-3-pro-image:generateContent']]) {
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'director-moss-image-'));
    try {
      const adapter=createMosshubAdapter({apiKey:'moss',catalog,mediaDir:dir,fetchImpl:async(url,opts)=>{
        assert.ok(url.endsWith(expected));assert.equal(opts.headers.authorization,'Bearer moss');
        return provider.includes('seedream')?json({data:[{b64_json:'aW1hZ2U='}]}):json({candidates:[{content:{parts:[{inlineData:{mimeType:'image/png',data:'aW1hZ2U='}}]}}]});
      }});
      const r=await execute(adapter,{id:'image',provider,mode:'t2i',prompt:'frame',aspect:'16:9',inputs:{}});
      assert.equal(r.status,'done');assert.equal(r.result.kind,'image');assert.ok(fs.existsSync(path.join(dir,'image.png')));
    }finally{fs.rmSync(dir,{recursive:true,force:true});}
  }
});
test('generation router preserves Ark while routing both MiniMax variants to MossHub',()=>{
  const seen=[];const a=(name,models)=>({name,models,supports:id=>id in models,submit:job=>seen.push(name+':'+job.provider)});
  const r=routeGeneration([a('ark',{'seedance-2.5':'ark-video'}),a('mosshub',{'minimax-h3':'MiniMax-H3','minimax-h3-max':'MiniMax-H3-Max'})],a('simulated',{}));
  r.submit({provider:'seedance-2.5'});r.submit({provider:'minimax-h3-max'});assert.deepEqual(seen,['ark:seedance-2.5','mosshub:minimax-h3-max']);
});
