import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {installRequestProjector} from './request-projection.js';
import {agencyRequestHistory,displayMessageIds,historyProjectionStats} from './request-history.js';

// Point at an extracted *installed* DSH app.asar tree. These tests import the
// real Cordis waterfall and LlmRuntime; no provider network or model is used.
const available=!!process.env.DSH_RUNTIME_ROOT;
const load=name=>import(pathToFileURL(path.join(process.env.DSH_RUNTIME_ROOT,'node_modules/@deepseek-ai',name,'lib/index.js')));
const drain=async stream=>{const out=[];for await(const chunk of stream)out.push(chunk);return out;};

test('installed DSH: frozen history projects at the final adapter, all middleware and the prepared adapter survive',{skip:!available},async()=>{
 const {Context}=await load('cordis');
 const {LlmRuntime,LlmAdapter,markAgentLoopRequest,isAgentLoopRequest,freezeMessage}=await load('dsh-llm');
 const ctx=new Context(),runtime=new LlmRuntime(ctx),events=[],observed=[],received=[],measurements=[];
 const user=(id,source,text)=>freezeMessage({id,role:'user',source,content:[{type:'text',text}]});
 const assistant=(id,text)=>freezeMessage({id,role:'assistant',source:{kind:'model',provider:'fixture',model:'fixture'},content:[{type:'text',text}]});
 const messages=Object.freeze([user('display',{kind:'censhu-inner-life',displayEntryId:'d'},'展示摘要'.repeat(50)),assistant('rendered','展示正文'.repeat(50)),
   user('old-action',{kind:'plugin:dsh-censhu-agency'},'以前的真实执行'),assistant('real-call','已完成的工具回执'),user('run',{kind:'plugin:dsh-censhu-agency',agencyId:'run'},'当前请求')]);
 events.push({type:'turn/start'},{type:'user/message',data:messages[0]},{type:'assistant/message',data:{message:messages[1]}},{type:'turn/end'});
 const displayIds=displayMessageIds(events),durable=structuredClone({events,messages}),signal=new AbortController().signal;
 const options=markAgentLoopRequest(Object.freeze({provider:'fixture',model:'fixture',sessionId:'life',signal,messages}));
 class Adapter extends LlmAdapter{constructor(name){super();this.name=name;}async *stream(request){received.push({name:this.name,request});yield {type:'text-delta',index:0,text:'offline fixture'};yield {type:'finish',reason:{kind:'stop'}};}}
 const originalBoundary=runtime.adapterStream,offAdapter=ctx.llm.registerAdapter(['fixture'],new Adapter('prepared'));
 const prepared=await ctx.llm.prepareCall({provider:'fixture',model:'fixture'},signal);
 offAdapter();const offReplacement=ctx.llm.registerAdapter(['fixture'],new Adapter('replacement'));
 const offPlugin=ctx.on('llm/stream',(request,next)=>{
   observed.push(request);assert.equal(request,options);assert.ok(isAgentLoopRequest(request));assert.ok(Object.isFrozen(request.messages));
   return (async function*(){await Promise.resolve();yield* next({...request,messages:[]});})();
 });
 const offProjection=installRequestProjector(ctx.llm,{id:'life',priority:10,async project(request,{prepared:bound}){
   assert.ok(bound?.registration);assert.equal(request,options);await Promise.resolve();
   const filtered=agencyRequestHistory(request.messages,displayIds);measurements.push(historyProjectionStats(request.messages,filtered));
   return {...request,messages:filtered};
 }});
 try{
   assert.throws(()=>{options.messages=[];},TypeError);
   const chunks=await drain(prepared.stream(options));assert.equal(chunks.length,2);assert.equal(chunks.at(-1).reason.kind,'stop');
   assert.equal(observed.length,1);assert.equal(received.length,1);assert.equal(received[0].name,'prepared');
   const sent=received[0].request;assert.notEqual(sent,options);assert.deepEqual(sent.messages.map(m=>m.id),['old-action','real-call','run']);
   assert.ok(Object.isFrozen(sent));assert.ok(Object.isFrozen(sent.messages));assert.equal(sent.signal,signal);assert.equal(sent.sessionId,'life');
   assert.deepEqual({events,messages},durable);assert.equal(measurements[0].removed,2);assert.ok(measurements[0].removedEstimatedTokens>0);
 }finally{offProjection();offPlugin();offReplacement();}
 assert.equal(runtime.adapterStream,originalBoundary);assert.equal(Object.hasOwn(runtime,'adapterStream'),false);
});

test('installed DSH: direct calls, multiple native service proxies, cancellation and HMR disposers are isolated',{skip:!available},async()=>{
 const {Context}=await load('cordis');const {LlmRuntime,LlmAdapter}=await load('dsh-llm');
 const ctx=new Context(),runtime=new LlmRuntime(ctx),original=runtime.adapterStream,seen=[],order=[];
 class Adapter extends LlmAdapter{async *stream(options){seen.push(options);yield {type:'finish',reason:{kind:'stop'}};}}
 const offAdapter=ctx.llm.registerAdapter(['fixture'],new Adapter()),base=Object.freeze({provider:'fixture',model:'fixture',sessionId:'unrelated',messages:Object.freeze([])});
 const old=installRequestProjector(ctx.llm,{id:'reload',project:()=>assert.fail('stale')});
 const current=installRequestProjector(ctx.extend().llm,{id:'reload',priority:10,project:o=>{order.push('current');return o;}});old();
 const later=installRequestProjector(ctx.llm,{id:'later',priority:20,async project(o){order.push('later');return o;}});
 try{await drain(ctx.llm.stream(base));assert.deepEqual(order,['current','later']);assert.equal(seen[0],base);current();
   await drain(ctx.llm.stream(base));assert.deepEqual(order,['current','later','later']);
   const aborted=new AbortController();aborted.abort();const outcome=await drain(ctx.llm.stream({...base,signal:aborted.signal}));assert.equal(outcome.at(-1).reason.kind,'stop');assert.equal(seen.at(-1).signal,aborted.signal);
 }finally{later();offAdapter();}
 assert.equal(runtime.adapterStream,original);
});
