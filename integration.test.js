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
 assert.ok(service.browserInterests({sessionId:'main'}).intentions.some(x=>x.text===current.text));
 revise(service,'main','three',{...current,reason:'今天想先休息',direction:'cancel',priority:0});
 assert.equal(service.browserInterests({sessionId:'main'}).intentions.some(x=>x.text===current.text),false);
 assert.equal(intentionChoice(engine,'books').priority,0);
 }finally{rmSync(home,{recursive:true,force:true});}
});
