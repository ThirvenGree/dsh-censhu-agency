import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {signal,observations,replyOrder,takeReply,owner,current} from './control.mjs';
import {opportunity} from './core.js';
import {commitDelivery} from './continuity.js';
function profile(fn){return async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'agency-control-')),old=process.env.DSH_HOME;
 process.env.DSH_HOME=temp;const dir=path.join(temp,'censhu-agency');fs.mkdirSync(dir);
 fs.writeFileSync(path.join(dir,'control.json'),JSON.stringify({version:1,sessionId:'role'}));
 try{await fn(temp,dir);}finally{if(old===undefined)delete process.env.DSH_HOME;else process.env.DSH_HOME=old;fs.rmSync(temp,{recursive:true,force:true});}
};}
test('跨进程的通知在主会话接收之前保留；只有绑定角色可决定私信文字且只能领取一次',profile((h,dir)=>{
 const id=signal('抖音来信','one','有新消息');assert.equal(signal('抖音来信','one','重复通知'),id);
 const items=observations(h,'role');assert.equal(items.length,1);assert.equal(observations(h,'other').length,0);
 const state={generation:'g',signature:'s',cursor:0,lastAt:Date.now()-120000,notes:[]};
 assert.equal(opportunity({feed:{generation:'g',sequence:0,items:[]},pace:{},signature:'s',notices:items},state,Date.now()).reason,'新的外部情况');
 const p={run:'r',notes:[],notices:[id],generation:'g',cursor:0,signature:'s',at:Date.now()};state.pending=p;commitDelivery(state,p,p.at);
 assert.equal(observations(h,'role',state.seenNotices).length,0);assert.throws(()=>replyOrder(id,'hi','other'));
 replyOrder(id,'ok','role');assert.equal(takeReply(id).text,'ok');assert.equal(takeReply(id),null);
 assert.equal(owner('other'),false);assert.equal(current(h,'role'),null);
}));
test('已安装的真实视频定时入口不再起工作会话，B站收件仍可交给主动进行',{skip:!process.env.AGENCY_PROFILE},profile(async(h)=>{
 const root=path.join(process.env.AGENCY_PROFILE,'node_modules');
 const load=(n,file)=>import(pathToFileURL(path.join(root,n,file)));
 const {ScheduledWatch}=await load('dsh-douyin-browser-local','scheduled-watch.mjs');
 const {createSessionDelivery}=await load('dsh-bili-whale','lib/session-delivery.js');
 let models=0;await new ScheduledWatch({stateDir:h,getVideoLimits(){models++;throw Error('不应运行');}}).perform();
 const d=createSessionDelivery({dshHome:h,controller:{prompt(){models++;}},config:()=>({})});
 await d.send({requestId:'notice1',content:[{text:'新通知'}]});assert.equal(models,0);assert.equal(observations(h,'role')[0].source,'B站通知');
}));
test('真实生活接口只接受角色选择的合法候选，读当前所做之事以主动记录为准',{skip:!process.env.AGENCY_PROFILE},profile(async(home,dir)=>{
 const root=path.join(process.env.AGENCY_PROFILE,'node_modules','dsh-cen-shu-life','lib');
 const {LifeEngine}=await import(pathToFileURL(path.join(root,'engine.js')));const {sharedLifeContext}=await import(pathToFileURL(path.join(root,'shared-context.js')));
 const engine=new LifeEngine({home,now:()=>Date.now(),random:()=>0});engine.saveConfig({sessionIds:['role'],maxDaily:4,maxActive:2});
 engine.templates.events=[{id:'books',name:'整理旧书',category:'personal',when:{},weight:1,cooldownHours:1,stages:[{minutes:5,text:'整理'},{minutes:5,text:'归架'}]}];
 const shared=sharedLifeContext(engine,{});const call=(action,extra={})=>shared.agencyLife({action,sessionId:'role',...extra});
 assert.ok(call('list').available.some(e=>e.id==='books'));
 const ev=call('start',{templateId:'books',eventId:'agency:fixture'});assert.equal(ev.stage,0);
 assert.equal(call('advance',{eventId:ev.id,stage:0}).stage,1);
 assert.throws(()=>call('advance',{eventId:ev.id,stage:0}),/阶段/);
 call('end',{eventId:ev.id});assert.ok(!engine.state.active.some(x=>x.id===ev.id));
 fs.writeFileSync(path.join(dir,'current.json'),JSON.stringify({sessionId:'role',until:Date.now()+60000,activity:'翻照片',thought:'窗框怎么连起来的'}));
 assert.equal(engine.life().activity,'翻照片');assert.equal(engine.life().currentThought,'窗框怎么连起来的');
}));
