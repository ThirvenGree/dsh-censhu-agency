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
 fs.writeFileSync(path.join(dir,'control.json'),JSON.stringify({version:2,sessionId:'role'}));
 fs.writeFileSync(path.join(dir,'owner.json'),JSON.stringify({sessionId:'role',until:Date.now()+60000}));
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
test('生活候选不进入选题，必须主动采纳；放下与重复提交都可核对',{skip:!process.env.AGENCY_PROFILE},profile(async(home)=>{
 const dir=path.join(process.env.AGENCY_PROFILE,'node_modules/dsh-cen-shu-life/lib');
 const load=n=>import(pathToFileURL(path.join(dir,n+'.js')));
 const {LifeEngine}=await load('engine'),{sharedLifeContext}=await load('shared-context');
 const e=new LifeEngine({home,now:()=>1700000000000});e.saveConfig({sessionIds:['role'],lifePlanningEnabled:true,contentEvolutionEnabled:true});
 const now=e.now();e.content={expiresAt:now+90000,intentions:['茶','书'].map((x,i)=>({id:String(i),text:x,priority:1,validFrom:now-10,expiresAt:now+60000,generatedAt:now-20,revision:0,templateIds:[]}))};
 e.persistContent=()=>e.write('fixture-intentions.json',e.content);
 const life=sharedLifeContext(e,{}),send=(decision,id)=>life.agencyPlan({decision,id,run:'r',generatedAt:now-20,revision:0,sessionId:'role'});
 assert.equal(send('list').length,2);assert.equal(life.status().intentions.length,0);
 send('adopt','0');assert.equal(send('adopt','0').replayed,true);send('dismiss','1');assert.equal(send('list').length,0);
 assert.deepEqual(life.status().intentions.map(x=>x.text),['茶']);assert.throws(()=>send('dismiss','0'));
}));

test('同一凌晨可自述清醒或疲惫；没有判断时只参考正在发生的疲劳事件',{skip:!process.env.AGENCY_PROFILE},profile(async(home,dir)=>{
 const file=path.join(process.env.AGENCY_PROFILE,'node_modules/dsh-cen-shu-life/lib/engine.js');
 const {LifeEngine}=await import(pathToFileURL(file));
 const engine={home,config:{sessionIds:['role'],timezone:'Asia/Shanghai'},state:{active:[]}};
 const now=Date.parse('2026-11-03T03:00:00+08:00');
 const fatigue=()=>LifeEngine.prototype.life.call(engine,now).fatigue;
 assert.equal(fatigue(),false);
 engine.state.active.push({effect:'fatigue'});
 assert.equal(fatigue(),true);
 for(const [energy,expected,fatigued] of [['rested',false],['tired',true],['uncertain',true],['手酸但还想听完',false,false],['眼睛发涩，想歇一会儿',true,true]]){
   fs.writeFileSync(path.join(dir,'current.json'),JSON.stringify({sessionId:'role',until:Date.now()+60000,energy,fatigued}));
   assert.equal(fatigue(),expected);
 }
}));

test('delivery persists the original opportunity; only an undecided failed turn is offered again',async()=>{
 const {settleChoice}=await import('./continuity.js');
 const ticket={thread:'one',notes:[{id:'note',text:'等照片扫完再考虑'}],changes:[{id:'photo'}]};
 const p={run:'run',sessionId:'s',ticket,notes:[],notices:[]},state={pending:p,notes:[]};
 commitDelivery(state,p,1000);assert.equal(state.choice.phase,'delivered');
 for(const [flags,expected] of [[{},'retry'],[{actionStarted:true},'verify'],[{actionStarted:true,confirmed:true},'confirmed'],[{expressed:true},'expressed'],[{confirmed:true,needsVerification:true},'verify']]){
  const c=Object.assign(structuredClone(state.choice),flags);settleChoice(c,'error',2000);
  assert.equal(c.phase,expected);assert.equal(c.notes[0].id,'note');assert.equal(c.thread,'one');
  if(expected==='retry')assert.ok(c.retryAt>2000);
 }
});

test('shared contact reservation observes other sources, rest time and duplicate handoffs',async()=>{
 const {reserveContact,dayOf}=await import('./safety.js');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'agency-contact-')),dir=path.join(root,'characters/censhu');
 try{fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'integration.json'),JSON.stringify({sessionId:'role'}));
 const now=Date.parse('2026-11-03T11:00:00+08:00');
 fs.writeFileSync(path.join(dir,'initiative.json'),JSON.stringify({at:now-1000,source:'bridge'}));
 assert.throws(()=>reserveContact(root,'role','r1',now),/冷却/);
 reserveContact(root,'role','r1',now+3600000);assert.throws(()=>reserveContact(root,'role','r1',now+7200000));
 assert.throws(()=>reserveContact(root,'role','r2',Date.parse('2026-11-04T04:30:00+08:00')));
 assert.equal(dayOf(Date.parse('2026-11-03T16:03:00Z')),'2026-11-04');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('state request blocks rebinding and cross-site access',async()=>{
 const {createRequestGuard}=await import('./request-guard.js'),g=createRequestGuard();
 for(const headers of [{host:'evil.example:3388'},{host:'localhost:3388',origin:'https://evil.example'},{host:'localhost:3388','sec-fetch-site':'cross-site'}])assert.throws(()=>g.check({headers,method:'GET',socket:{localPort:3388}},'/state'));
 g.check({headers:{host:'127.0.0.1:3388'},method:'GET',socket:{localPort:3388}},'/state');
});

test('follow-up observation requires a confirmed outgoing message and a later real incoming message',async()=>{
 const {nextIncoming}=await import('./continuity.js');
 const messages=[{id:'1',role:'user',at:1},{id:'2',role:'self',at:2},{id:'3',role:'self',at:3},{id:'4',role:'user',at:4}];
 assert.equal(nextIncoming(messages,['2','3']).id,'4');assert.equal(nextIncoming(messages,['missing']),null);assert.equal(nextIncoming(messages.slice(0,3),['2']),null);
});
test('focus batches ordinary stages without consuming them, but new events, reminders and notices can wake',()=>{
 const now=Date.now(),state={lastAt:now-3600000,generation:'g',cursor:0,signature:'s',notes:[]},stage={id:'one',kind:'event-stage',sequence:1,data:{eventId:'scan'}};
 const snap={context:{当前自述:{截止:now+600000,关联事件:'scan'}},feed:{generation:'g',sequence:1,items:[stage]},signature:'s',pace:{}};
 assert.equal(opportunity(snap,state,now),null);assert.equal(state.cursor,0);
 assert.ok(opportunity({...snap,notices:[{id:'x'}]},state,now));assert.ok(opportunity(snap,{...state,notes:[{id:'n',due:now-1}]},now));
 assert.ok(opportunity({...snap,feed:{...snap.feed,items:[{...stage,kind:'event-end'}]}},state,now));
});

test('paused host keeps the lease until explicit guarded release and reclaims without enabling actions',profile(async(home,dir)=>{
 const {apply}=await import('./host.js'),routes=new Map(),dispose=[];
 const write=(file,obj)=>{const dest=path.join(home,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(obj));};
 write('characters/censhu/integration.json',{sessionId:'role'});write('speak-up-config.json',{总开关:false});
 const noop=()=>()=>{};
 const ctx={agents:{roots:()=>[]},tools:{guard:noop,register:noop},webServer:{register:r=>{routes.set(r.path,r.handler);return ()=>{};}},on:noop,effect:f=>{const off=f();if(typeof off==='function')dispose.push(off);},cenShuLifeShared:{},cenShuInnerLife:{}};
 try{
 apply(ctx);
 const call=(name,method,token)=>{let code,body;const req={headers:{host:'localhost:3388','x-censhu-csrf':token},method,socket:{localPort:3388}};
 routes.get('/censhu-agency/'+name)(req,{writeHead:v=>code=v,end:v=>body=v});return {code,value:body?JSON.parse(body):null};};
 const state=call('state','GET').value;assert.equal(state.ownership.enabled,false);assert.equal(owner('role'),true);
 assert.equal(call('release','POST','wrong').code,403);assert.equal(owner('role'),true);
 assert.equal(call('release','POST',state.csrf).code,200);assert.equal(owner('role'),false);
 assert.equal(call('enable','POST',state.csrf).value.enabled,false);assert.equal(owner('role'),true);
 }finally{for(const off of dispose.reverse())off();}
}));
