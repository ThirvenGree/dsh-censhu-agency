import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {choiceRetryStatus,requestChoiceRetry} from './continuity.js';
import {apply} from './host.js';

const now=Date.parse('2026-11-04T10:00:00+08:00');
const options={enabled:true,agentsIdle:true,sessionId:'role'};
const fixture=()=>({choice:{phase:'retry',run:'old-run',sessionId:'role',thread:'original-thread',retryAt:now+3600000,finished:true,failures:4,
  changes:[{id:'event',sourceRefs:['original']}],notes:[{id:'plan',revision:3}],notices:[{id:'notice'}]},
  notes:[{id:'plan',revision:3}],geminiRetryAt:now+600000,rounds:{day:'2026-11-04',count:24},nextConsiderAt:now+7200000,
  actionLedger:{done:'receipt'},cursor:7,generation:'g',history:[]});

test('manual recovery clears only the waiting time of an untouched retry opportunity',()=>{
 const state=fixture(),before=structuredClone(state);
 assert.equal(choiceRetryStatus(state,options).available,true);
 assert.deepEqual(requestChoiceRetry(state,options,'old-run',now),{run:'old-run',previousRetryAt:now+3600000});
 const expected=structuredClone(before);expected.choice.retryAt=0;expected.choice.manualRetryRequestedAt=now;
 assert.deepEqual(state,expected);
 assert.equal(choiceRetryStatus(state,options).available,false);
 assert.throws(()=>requestChoiceRetry(state,options,'old-run',now),{status:409});
});

test('recovery rejects actions, expressed choices, unknown results, pending delivery, active turns and stale runs',()=>{
 for(const flag of ['actionStarted','expressed','needsVerification','confirmed']){
  const state=fixture();state.choice[flag]=true;const before=structuredClone(state);
  assert.throws(()=>requestChoiceRetry(state,options,'old-run',now),{status:409});assert.deepEqual(state,before);
 }
 for(const phase of ['delivered','verify','completed','expressed','confirmed','superseded']){
  const state=fixture();state.choice.phase=phase;assert.equal(choiceRetryStatus(state,options).available,false);
 }
 for(const altered of [{stopped:true},{running:true},{agentsIdle:false},{enabled:false},{sessionId:'other'}]){
  assert.equal(choiceRetryStatus(fixture(),{...options,...altered}).available,false);
 }
 const state=fixture();state.pending={run:'pending'};assert.equal(choiceRetryStatus(state,options).available,false);
 assert.throws(()=>requestChoiceRetry(fixture(),options,'stale-run',now),{status:409});
 assert.throws(()=>requestChoiceRetry(fixture(),options,undefined,now),{status:409});
});

test('POST recovery uses the local CSRF guard, persists the original opportunity and lets the normal tick enforce limits',async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'agency-retry-')),previousHome=process.env.DSH_HOME,clock=Date.now;
 const routes=new Map(),offs=[],stateFile=path.join(home,'censhu-agency/state.json');
 const write=(name,value)=>{const file=path.join(home,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value));};
 const state={version:1,lastAt:now,cursor:7,generation:'g',...fixture(),worker:{id:'life',role:'role',phase:'ready'}};
 write('censhu-agency/state.json',state);write('censhu-agency/control.json',{version:2,sessionId:'role'});
 write('characters/censhu/integration.json',{sessionId:'role'});write('censhu-inner-life/display-session.json',{sessionId:'life'});
 write('speak-up-config.json',{总开关:true,试运行:false,目标会话:['role']});
 write('cen-shu-life/life-changes.json',{version:1,generation:'g',sequence:7,items:[]});
 write('censhu-inner-life/actions.json',{done:{receipt:'keep-existing-receipt'}});
 const ledger=fs.readFileSync(path.join(home,'censhu-inner-life/actions.json'),'utf8');
 const main={session:{id:'role'},status:'idle'},life={session:{id:'life'},status:'idle'};
 const noop=()=>()=>{};
 const ctx={provide(name,value){this[name]=value;},agents:{get:id=>id==='role'?main:id==='life'?life:undefined,roots:()=>[main,life]},workspaceRegistry:{},
  tools:{register:noop,guard:noop,get:()=>null},on:noop,cenShuLifeShared:{},cenShuInnerLife:{},
  sessionController:{resolveAgent:()=>assert.fail('daily limit should stop the turn before resolving an agent')},
  webServer:{register(route){routes.set(route.path,route);return ()=>routes.delete(route.path);}},
  effect(fn){const off=fn();if(typeof off==='function')offs.push(off);}};
 const call=(route,method='GET',headers={})=>{
  let code,body;routes.get('/censhu-agency/'+route).handler({method,headers:{host:'127.0.0.1:1234',origin:'http://127.0.0.1:1234',...headers},socket:{localPort:1234,remoteAddress:'127.0.0.1'}},
   {writeHead(c){code=c;},end(text){body=text?JSON.parse(text):null;}});return {code,body};
 };
 try{
  process.env.DSH_HOME=home;Date.now=()=>now;apply(ctx);await new Promise(setImmediate);
  const visible=call('state');assert.equal(visible.code,200);assert.equal(visible.body.recovery.available,true);
  const headers={'x-censhu-csrf':visible.body.csrf,'x-censhu-run':'old-run'};
  assert.equal(call('retry').code,405);assert.equal(call('retry','POST',{'x-censhu-run':'old-run'}).code,403);
  assert.equal(call('retry','POST',{...headers,origin:'https://evil.example'}).code,403);
  assert.equal(call('retry','POST',{...headers,'x-censhu-run':'new-run'}).code,409);
  life.status='running';assert.equal(call('retry','POST',headers).code,409);life.status='idle';
  const accepted=call('retry','POST',headers);assert.deepEqual(accepted,{code:200,body:{ok:true,run:'old-run',scheduled:true}});
  const saved=JSON.parse(fs.readFileSync(stateFile));assert.equal(saved.choice.retryAt,0);
  for(const key of ['run','thread','changes','notes','notices','failures'])assert.deepEqual(saved.choice[key],state.choice[key]);
  for(const key of ['geminiRetryAt','rounds','nextConsiderAt','actionLedger','cursor','generation'])assert.deepEqual(saved[key],state[key]);
  assert.equal(saved.history.at(-1).type,'恢复原打算');assert.equal(saved.history.at(-1).run,'old-run');
  assert.equal(call('retry','POST',headers).code,409);
  await new Promise(setImmediate);
  assert.equal(call('state').body.status,'今日主动回合已达24次');
  assert.equal(fs.readFileSync(path.join(home,'censhu-inner-life/actions.json'),'utf8'),ledger);
 }finally{
  for(const off of offs.reverse())off();Date.now=clock;
  if(previousHome===undefined)delete process.env.DSH_HOME;else process.env.DSH_HOME=previousHome;
  fs.rmSync(home,{recursive:true,force:true});
 }
});

test('crashed delivered turn reconsiders with the same action-ledger thread',async()=>{
 const {recoverInterruptedChoice}=await import('./continuity.js');
 const choice={phase:'delivered',run:'r',thread:'stable-task',notes:[]};
 const events=[{type:'user/message',data:{id:'r'}},{type:'tool/call',data:{name:'generate_image'}}];
 const next=recoverInterruptedChoice(choice,events,123);
 assert.equal(next.phase,'retry');assert.equal(next.thread,'stable-task');assert.equal(next.needsVerification,true);
 assert.throws(()=>recoverInterruptedChoice(choice,[],123),/核对/);
 assert.equal(recoverInterruptedChoice(choice,[...events,{type:'turn/end'}],123),choice);
});
