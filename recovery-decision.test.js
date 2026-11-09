import test from 'node:test';import assert from 'node:assert/strict';
import {recoveryDecision} from './recovery-decision.js';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import {apply} from './host.js';
test('recovery decisions preserve free-form judgment but reject stale batches and past scheduling',()=>{
 const context={id:'current'},args={recoveryId:'current',analysis:'三天已过。旧活动不继续，先回顾，再决定今天的事情。',reconsiderAt:5000};
 assert.equal(recoveryDecision(context,args,'run',1000).reconsiderAt,5000);
 assert.throws(()=>recoveryDecision({id:'new'},args,'run',1000),/批次/);
 assert.throws(()=>recoveryDecision(context,{...args,reconsiderAt:999},'run',1000),/七天/);
});
test('actual agency recovery tool hands model judgment to both plugins and persists next wake time',async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'recovery-handoff-')),before=process.env.DSH_HOME,clock=Date.now,now=Date.parse('2026-11-05T10:00:00+08:00');
 const write=(file,value)=>{const p=path.join(home,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(value));};
 const offs=[],registered=new Map(),received=[];let observer,finished=false,failure,result;
 const main={session:{id:'role'},status:'idle',options:{provider:'fixture',model:'fixture'}};
 const agent={session:{id:'life'},status:'idle',ctx:{on:()=>()=>{}},async followup(packet){try{
  observer(this.session,{type:'user/message',data:packet});
  result=JSON.parse(registered.get('censhu_agency_recovery').execute({recoveryId:'resume-1',analysis:'已过去三天。旧打算先保留，今天先整理收藏，半小时后再考虑。',reconsiderAt:now+1800000},{agent:this}));
  observer(this.session,{type:'turn/end',data:{reason:{kind:'completed'}}});
 }catch(e){failure=e;throw e;}},async whenIdle(){finished=true;}};
 const ctx={provide(k,v){this[k]=v;},agents:{roots:()=>[main,agent]},workspaceRegistry:{},webServer:{register:()=>()=>{}},tools:{register(t){registered.set(t.name,t);return ()=>{};},guard:()=>()=>{}},on(name,fn){if(name==='session/event')observer=fn;return ()=>{};},effect(fn){const off=fn();if(typeof off==='function')offs.push(off);},sessionController:{resolveAgent:async id=>id==='life'?agent:main},cenShuLifeShared:{status:()=>({enabled:true,sessionIds:['role'],intentions:[]}),snapshot:()=>({memories:[]}),acceptRecoveryDecision(r){received.push(['life',r]);write('life-review.json',r);return {plugin:'life',status:'accepted'};}},cenShuInnerLife:{registerAgencyWorker(){},claimAgencyActionTurn:()=>()=>{},acceptRecoveryDecision(r){received.push(['inner-life',r]);write('inner-review.json',r);return {plugin:'inner-life',status:'accepted'};}}};
 try{
  process.env.DSH_HOME=home;Date.now=()=>now;
  write('characters/censhu/integration.json',{sessionId:'role'});write('speak-up-config.json',{总开关:true,试运行:false,目标会话:['role']});write('censhu-inner-life/display-session.json',{sessionId:'life'});write('censhu-agency/control.json',{version:2,sessionId:'role'});write('censhu-agency/presence.json',{level:'off'});
  write('cen-shu-life/life-changes.json',{version:1,generation:'g',sequence:0,items:[]});
  write('censhu-agency/state.json',{version:1,lastAt:now-3600000,notes:[],history:[],runtimeRecovery:{id:'resume-1',pausedAt:now-3*86400000},choice:{phase:'retry',sessionId:'role',thread:'same',notes:[],changes:[],notices:[]}});
  apply(ctx);for(let i=0;i<100&&!finished&&!failure;i++)await new Promise(r=>setTimeout(r,10));
  if(failure)throw failure;assert.equal(finished,true,fs.readFileSync(path.join(home,'censhu-agency/state.json'),'utf8').slice(-1000));
  assert.deepEqual(received.map(x=>x[0]),['life','inner-life']);assert.equal(result.receipts.length,3);
  const saved=JSON.parse(fs.readFileSync(path.join(home,'censhu-agency/state.json')));assert.equal(saved.recoveryDecision.recoveryId,'resume-1');assert.equal(saved.nextConsiderAt,now+1800000);
 }finally{for(const off of offs.reverse())off();Date.now=clock;if(before===undefined)delete process.env.DSH_HOME;else process.env.DSH_HOME=before;fs.rmSync(home,{recursive:true,force:true});}
});
