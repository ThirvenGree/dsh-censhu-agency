import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import {lifeInputs,revise,nextWindow} from './integration.js';
import {opportunity} from './core.js';
test('主模型安排能推迟自然空当，但不会吞掉生活变化',()=>{
 const now=Date.now(), state={lastAt:now-3600000,cursor:0,generation:'g',signature:'a',notes:[],nextConsiderAt:nextWindow(30,now)};
 const snap={feed:{generation:'g',sequence:0,items:[]},signature:'a',pace:{innerMinimumMinutes:10}};
 assert.equal(opportunity(snap,state,now),null);
 snap.feed.items.push({sequence:1,id:'new',kind:'event-start',at:now,data:{}});snap.feed.sequence=1;
 assert.equal(opportunity(snap,state,now).cursor,1);
});
test('真实生活引擎：调低意向、回读权重、回执重放和拒绝陈旧版本',{skip:!process.env.LIFE_PLUGIN_ROOT},async()=>{
 const load=file=>import(pathToFileURL(path.resolve(process.env.LIFE_PLUGIN_ROOT,'lib',file)));
 const {LifeEngine}=await load('engine.js'),{sharedLifeContext}=await load('shared-context.js'),{ContentEvolution}=await load('content-evolution.js'),{intentionChoice}=await load('life-intentions.js');
 const home=mkdtempSync(path.join(os.tmpdir(),'agency-life-'));
 try{
 const engine=new LifeEngine({home,now:()=>Date.parse('2026-10-30T18:00:00+08:00'),random:()=>0});engine.saveConfig({sessionIds:['main'],personaEvolutionEnabled:false});
 engine.templates.events=[{id:'books',name:'整理旧书',category:'personal',when:{hours:[7,23]},weight:1,cooldownHours:0,stages:[{minutes:20,text:'整理书桌'}]}];
 const raw={version:1,templates:[],scheduleNotes:[],behaviorNotes:[],personaFacts:[],intentions:[{text:'晚点整理旧书',startHour:18,endHour:21,validMinutes:120,templateNames:['整理旧书'],priority:2}]};
 await new ContentEvolution(engine,{generate:async()=>raw}).refresh(true);
 const service=sharedLifeContext(engine,{}),i=lifeInputs(service,'main').intentions[0],a={...i,direction:'lower',priority:.5,reason:'想先把手里的事情做好'};
 assert.equal(intentionChoice(engine,'books').priority,2);revise(service,'main','one',a);
 assert.equal(intentionChoice(engine,'books').priority,.5);assert.equal(revise(service,'main','one',a).replayed,true);assert.throws(()=>revise(service,'main','two',a),/版本/);
 assert.equal(lifeInputs(service,'main').intentions[0].priority,.5);
 const current=lifeInputs(service,'main').intentions[0];
 if(service.browserInterests)assert.ok(service.browserInterests({sessionId:'main'}).intentions.some(x=>x.text===current.text));
 revise(service,'main','three',{...current,reason:'今天想先休息',direction:'cancel',priority:0});
 assert.equal(service.status().intentions.find(x=>x.id===i.id).status,'cancelled');
 if(service.browserInterests)assert.equal(service.browserInterests({sessionId:'main'}).intentions.some(x=>x.text===current.text),false);
 assert.equal(intentionChoice(engine,'books').priority,0);
 }finally{rmSync(home,{recursive:true,force:true});}
});

test('角色预算联用：三方省略原文可按会话隔离分页取回，读取不重记入场回执',{skip:!process.env.LIFE_PLUGIN_ROOT||!process.env.INNER_PLUGIN_ROOT},async()=>{
 const {roleContextBudget}=await import(pathToFileURL(path.resolve(process.env.LIFE_PLUGIN_ROOT,'lib/context-budget.js')));
 const {acknowledgeContext}=await import(pathToFileURL(path.resolve(process.env.INNER_PLUGIN_ROOT,'lib/assembly-receipt.js')));
 const {contextParts}=await import('./core.js');
 const pages={},op={context:{手头的事:[{id:'evt1',进度:'整理票根'}],备用文档:'折叠的私有资料'.repeat(2400)},changes:[]};
 let plans=0;const accepted=[],onAccepted=owner=>text=>accepted.push({owner,text});
 const budget=roleContextBudget({plan:input=>{plans++;return {reason:'本轮关注事件与日记',allocations:Object.fromEntries(['life','inner','agency'].map(k=>[k,{tokens:3000,reason:'当前任务'}])),order:input.candidates.filter(x=>!x.required&&(/角色生活模拟|临时状态/.test(x.excerpt))).map(x=>x.id)};}}),agent={session:{id:'isolated',requestContext:()=>({model:'test',contextWindow:65536})}};
 const lifeText='生活省略原文：这张旧票根还没有核实日期。\n🌿先保留不确定性。\n'.repeat(160),innerText='独处省略原文：这只是今天的感受，不是青枔说的话。\n🍃也许以后会改变想法。\n'.repeat(160);
 const lifeParts=[{key:'life:event:evt1:整理票根',text:'角色生活模拟记录，阶段：整理票根'},{owner:'inner',text:'【岑舒独处后的临时状态】[{"id":"entry-ok"}]。这是你自己的生活感受与打算'},{key:'life:omitted',text:lifeText}];
 const innerParts=[{owner:'inner',key:'inner:omitted',text:innerText}];
 const tool=budget.recallTool();
 const final=await budget.assemble(agent,()=>budget.assemble(agent,()=>budget.assemble(agent,()=>({contexts:[],sections:[],tools:[tool]}),v=>budget.add(v,agent,'sections','censhu-agency-current',contextParts(op,[],'run',pages),onAccepted('agency'))),v=>budget.add(v,agent,'contexts','censhu-inner-life-observations',innerParts,onAccepted('inner'))),v=>budget.add(v,agent,'contexts','cen-shu-life',lifeParts,onAccepted('life')));assert.equal(pages.备用文档[0],op.context.备用文档);
 assert.doesNotMatch(JSON.stringify(final),/折叠的私有资料/);assert.equal((JSON.stringify(final).match(/整理票根/g)||[]).length,1);
 assert.doesNotMatch(JSON.stringify(final),/生活省略原文|独处省略原文/);assert.equal(plans,1);
 const seen=[];acknowledgeContext({context:()=>({ids:['entry-ok','not-admitted']}),seen:(_s,ids)=>seen.push(...ids)},'isolated',final.contexts);
 assert.deepEqual(seen,['entry-ok']);
 assert.equal(accepted.length,3);const originalReceipts=structuredClone(accepted);
 const registered=final.tools.find(x=>x.name==='censhu_context_recall');assert.equal(registered,tool);
 const read=async(args,caller=agent)=>JSON.parse(await registered.execute(args,{agent:caller}));
 const first=await read({action:'catalog',limit:2});assert.equal(first.status,'ready');assert.equal(first.truncated,true);
 const ref={snapshotId:first.snapshotId,version:first.version},entries=[...first.entries];let offset=first.nextOffset;
 while(offset!==null){const page=await read({action:'catalog',...ref,offset,limit:2});assert.equal(page.status,'ready');assert.equal(page.snapshotId,ref.snapshotId);assert.equal(page.version,ref.version);entries.push(...page.entries);offset=page.nextOffset;}
 assert.equal(entries.length,first.total);assert.equal(new Set(entries.map(x=>x.itemId)).size,first.total);
 const omitted=[
  {owner:'life',source:'cen-shu-life',key:'life:omitted',text:lifeText},
  {owner:'inner',source:'censhu-inner-life-observations',key:'inner:omitted',text:innerText},
  {owner:'agency',source:'censhu-agency-current',text:'备用文档：'+JSON.stringify(op.context.备用文档)}
 ];
 for(const expected of omitted){
  const item=entries.find(x=>x.owner===expected.owner&&x.source===expected.source&&(expected.key?x.key===expected.key:x.excerpt.startsWith('备用文档：')));
  assert.ok(item,expected.owner+' 省略资料应可定位');assert.equal(item.selected,false);assert.equal(item.totalChars,expected.text.length);
  let body='',cursor=0,pageCount=0;
  do{const page=await read({action:'read',...ref,itemId:item.itemId,offset:cursor,limit:997});assert.equal(page.status,'ready');assert.equal(page.version,ref.version);assert.equal(page.item.version,item.version);assert.equal(page.totalChars,expected.text.length);body+=page.text;pageCount++;if(page.nextOffset!==null)assert.ok(page.nextOffset>cursor);assert.equal(page.truncated,page.nextOffset!==null);cursor=page.nextOffset;}while(cursor!==null);
  assert.ok(pageCount>1);assert.equal(body,expected.text);
  const foreign={session:{id:'another-session'}};
  assert.equal((await read({action:'read',...ref,itemId:item.itemId,sessionId:'isolated'},foreign)).status,'forbidden');
 }
 assert.equal((await read({action:'catalog',...ref},{session:{id:'another-session'}})).status,'forbidden');
 assert.equal((await read({action:'catalog',...ref,version:'0'.repeat(64)})).status,'version_mismatch');
 assert.deepEqual(accepted,originalReceipts);assert.deepEqual(seen,['entry-ok']);assert.equal(plans,1);
 budget.dispose();
});

test('agency receives mixed emotions and current source revision, not just score',()=>{
 const value=lifeInputs({status:()=>({enabled:true,sessionIds:['main'],intentions:[],mood:{ok:true,mood:71,dims:{worry:4},mixedMood:{label:'开心又牵挂'},reason:'旧书',updatedAt:123}})},'main');
 assert.equal(value.mood.mixedMood.label,'开心又牵挂');assert.equal(value.mood.qualitative,true);assert.equal(value.mood.dimensions,undefined);assert.equal(value.mood.updatedAt,123);
});
