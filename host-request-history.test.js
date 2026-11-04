import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {apply} from './host.js';

test('agency host dispatch projects frozen native requests and exposes counts without changing life UI events',{skip:!process.env.DSH_RUNTIME_ROOT},async()=>{
 const load=name=>import(pathToFileURL(path.join(process.env.DSH_RUNTIME_ROOT,'node_modules/@deepseek-ai',name,'lib/index.js')));
 const {Context}=await load('cordis');const {LlmRuntime,LlmAdapter,markAgentLoopRequest,freezeMessage}=await load('dsh-llm');
 const native=new Context(),runtime=new LlmRuntime(native),originalBoundary=runtime.adapterStream;
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'agency-history-host-')),oldHome=process.env.DSH_HOME,clock=Date.now;
 const now=Date.parse('2026-11-03T10:00:00+08:00'),offs=[],routes=new Map(),received=[],downstream=[];
 const save=(file,value)=>{const dest=path.join(home,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(value));};
 save('censhu-agency/control.json',{version:2,sessionId:'role'});save('characters/censhu/integration.json',{sessionId:'role'});
 save('speak-up-config.json',{总开关:true,试运行:false,目标会话:['role']});save('censhu-inner-life/display-session.json',{sessionId:'life'});
 save('cen-shu-life/life-changes.json',{version:1,generation:'g',sequence:0,items:[]});
 save('censhu-agency/state.json',{version:1,notes:[],history:[],lastAt:now-3600000,choice:{phase:'retry',sessionId:'role',thread:'original',notes:[],changes:[],notices:[]}});
 const display=freezeMessage({id:'display',role:'user',source:{kind:'censhu-inner-life',displayEntryId:'entry'},content:[{type:'text',text:'展示重复资料'.repeat(100)}]});
 const rendered=freezeMessage({id:'rendered',role:'assistant',source:{kind:'model',provider:'fixture',model:'fixture'},content:[{type:'text',text:'展示正文'}]});
 const events=[{seq:0,type:'turn/start'},{seq:1,type:'user/message',data:display},{seq:2,type:'assistant/message',data:{message:rendered}},{seq:3,type:'turn/end'}],originalEvents=structuredClone(events);
 let onEvent,finished=false,request;
 class Adapter extends LlmAdapter{async *stream(options){received.push(options);yield {type:'finish',reason:{kind:'stop'}};}}
 const offAdapter=native.llm.registerAdapter(['fixture'],new Adapter());
 const offDownstream=native.on('llm/stream',(options,next)=>{downstream.push(options);return next();});
 const main={session:{id:'role'},status:'idle',options:{provider:'fixture',model:'fixture'}};
 const agent={session:{id:'life',snapshotEvents:()=>events},status:'idle',ctx:{on:()=>()=>{}},async followup(msg){
   events.push({seq:4,type:'user/message',data:msg});onEvent(this.session,{type:'user/message',data:msg});
   request=markAgentLoopRequest(Object.freeze({provider:'fixture',model:'fixture',sessionId:'life',messages:Object.freeze([display,rendered,freezeMessage(msg)])}));
   const prepared=await native.llm.prepareCall({provider:'fixture',model:'fixture'});
   for await(const chunk of prepared.stream(request))assert.equal(chunk.type,'finish');
   onEvent(this.session,{type:'turn/end',data:{reason:{kind:'completed'}}});
 },async whenIdle(){finished=true;}};
 const noop=()=>()=>{};
 const ctx={llm:native.llm,agents:{roots:()=>[main,agent]},workspaceRegistry:{},webServer:{register(route){routes.set(route.path,route);return ()=>routes.delete(route.path);}},
   tools:{register:noop,guard:noop,get:()=>null},on(name,fn){if(name==='session/event')onEvent=fn;return ()=>{};},effect(fn){const off=fn();if(typeof off==='function')offs.push(off);},
   sessionController:{resolveAgent:async id=>id==='life'?agent:main},cenShuLifeShared:{status:()=>({enabled:true,sessionIds:['role'],intentions:[]}),snapshot:()=>({memories:[]})},
   cenShuInnerLife:{registerAgencyWorker(){},claimAgencyActionTurn:()=>()=>{}}};
 try{
   process.env.DSH_HOME=home;Date.now=()=>now;apply(ctx);
   for(let i=0;i<100&&!finished;i++)await new Promise(resolve=>setTimeout(resolve,5));
   const state=JSON.parse(fs.readFileSync(path.join(home,'censhu-agency/state.json')));
   assert.ok(finished,JSON.stringify(state.history.slice(-3)));assert.equal(received.length,1);assert.equal(downstream.length,1);assert.equal(downstream[0],request);
   assert.equal(request.messages.length,3);assert.equal(received[0].messages.length,1);assert.equal(received[0].messages[0].id,request.messages[2].id);
   assert.deepEqual(events.slice(0,4),originalEvents);assert.equal(state.lastHistoryProjection.removed,2);assert.ok(state.lastHistoryProjection.removedEstimatedTokens>0);
   let body;routes.get('/censhu-agency/state').handler({method:'GET',headers:{host:'127.0.0.1:1234'},socket:{localPort:1234,remoteAddress:'127.0.0.1'}},{writeHead(){},end(text){body=JSON.parse(text);}});
   assert.equal(body.lastHistoryProjection.removed,2);assert.equal(body.requestProjection.boundary,'adapterStream');
 }finally{
   for(const off of offs.reverse())off();offDownstream();offAdapter();Date.now=clock;
   if(oldHome===undefined)delete process.env.DSH_HOME;else process.env.DSH_HOME=oldHome;
   fs.rmSync(home,{recursive:true,force:true});
 }
 assert.equal(runtime.adapterStream,originalBoundary);
});
