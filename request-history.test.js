import test from 'node:test';import assert from 'node:assert/strict';import {agencyRequestHistory,displayMessageIds,historyProjectionStats} from './request-history.js';
test('only trusted display turns are omitted from a real request; durable history and action tool pairs survive',()=>{
 const msgs=[{role:'system'},{role:'user',id:'old-display'},{role:'assistant',id:'rendered'},{role:'user',id:'old-agency'},{role:'assistant',id:'call'},{role:'tool',id:'result'},{role:'user',id:'current'}];
 const kept=agencyRequestHistory(msgs,new Set(['old-display','rendered']));
 assert.deepEqual(kept.map(m=>m.id),[undefined,'old-agency','call','result','current']);assert.equal(msgs.length,7);
});

test('only explicitly identified display messages are removed; injected developer and unknown messages survive',()=>{
 const messages=Object.freeze([{role:'user',id:'display'},{role:'assistant',id:'unknown'},{role:'developer',id:'policy'},{role:'system',id:'system'},{role:'user',id:'current'}].map(Object.freeze));
 assert.deepEqual(agencyRequestHistory(messages,new Set(['display','policy','system'])).map(m=>m.id),['unknown','policy','system','current']);
 assert.equal(agencyRequestHistory(messages,new Set()),messages);
});

test('tool calls and results remain atomic even when several calls share one assistant message',()=>{
 const messages=[{role:'assistant',id:'calls',content:[{type:'tool-call',id:'a'},{type:'tool-call',id:'b'}]},
   {role:'tool',id:'a-result',toolCallId:'a'},{role:'tool',id:'b-result',toolCallId:'b'},{role:'user',id:'current'}];
 assert.equal(agencyRequestHistory(messages,new Set(['calls','a-result'])),messages);
 assert.equal(agencyRequestHistory(messages,new Set(['a-result','b-result'])),messages);
 assert.deepEqual(agencyRequestHistory(messages,new Set(['calls','a-result','b-result'])),[messages[3]]);
 assert.equal(agencyRequestHistory(messages.slice(0,2),new Set(['calls','a-result'])).length,2);
});

test('duplicate or unmatched tool identifiers are retained conservatively',()=>{
 const messages=[{role:'assistant',id:'call',content:[{type:'tool-call',id:'a'}]},
   {role:'tool',id:'r1',toolCallId:'a'},{role:'tool',id:'r2',toolCallId:'a'},{role:'tool',id:'orphan',toolCallId:'missing'}];
 assert.equal(agencyRequestHistory(messages,new Set(messages.map(m=>m.id))),messages);
});

test('event-backed provenance excludes real action and mixed user turns from display classification',()=>{
 const user=(id,source)=>({type:'user/message',data:{id,role:'user',source}}),assistant=id=>({type:'assistant/message',data:{message:{id,role:'assistant'}}});
 const events=[{type:'turn/start'},user('display',{kind:'censhu-inner-life',displayEntryId:'entry'}),user('clock',{kind:'time-context'}),assistant('rendered'),{type:'turn/end'},
   {type:'turn/start'},user('mixed-display',{kind:'censhu-inner-life',executionRequestId:'gemini'}),user('human',{kind:'user'}),assistant('mixed-reply'),{type:'turn/end'},
   {type:'turn/start'},user('real',{kind:'plugin:dsh-censhu-agency',agencyId:'run'}),assistant('real-reply'),{type:'turn/end'}];
 const before=structuredClone(events);
 assert.deepEqual([...displayMessageIds(events)],['display','clock','rendered']);assert.deepEqual(events,before);
});

test('unchanged native context reused from a display turn is not removed from a real request',()=>{
 const display={id:'display',role:'user',source:{kind:'censhu-inner-life',displayEntryId:'entry'}},rendered={id:'rendered',role:'assistant'};
 const contexts=['runtime-context','skill-catalog','time-context'].map(kind=>({id:kind,role:'user',source:{kind},content:'still current'}));
 const events=[{type:'turn/start'},{type:'user/message',data:display},...contexts.map(data=>({type:'user/message',data})),{type:'assistant/message',data:{message:rendered}},{type:'turn/end'}];
 const current={id:'current',role:'user',source:{kind:'plugin:dsh-censhu-agency'}},messages=Object.freeze([display,...contexts,rendered,current].map(Object.freeze));
 assert.deepEqual(agencyRequestHistory(messages,displayMessageIds(events)),[...contexts,current]);assert.equal(messages.length,6);
});

const snapshot=(kind,id,role='user')=>({id,role,source:{kind},content:[{type:'text',text:kind}]});
const agencyTurn=(id,size=10)=>[{id,role:'user',source:{kind:'plugin:dsh-censhu-agency',agencyId:id},content:[{type:'text',text:'x'.repeat(size)}]},{id:id+'-reply',role:'assistant',content:[{type:'text',text:'y'}]}];

test('only the newest copy of each host snapshot reaches the model',()=>{
 const messages=[snapshot('system-prompt','s1','system'),snapshot('skill-catalog','c1'),snapshot('runtime-context','r1'),...agencyTurn('old'),
   snapshot('system-prompt','s2','system'),snapshot('skill-catalog','c2'),snapshot('runtime-context','r2'),snapshot('time-context','t2'),...agencyTurn('now')];
 assert.deepEqual(agencyRequestHistory(messages,new Set()).map(m=>m.id),['old','old-reply','s2','c2','r2','t2','now','now-reply']);
});

test('old agency turns leave once the turn limit is passed; the newest stays whatever its size',()=>{
 const messages=['a','b','c','d'].flatMap(id=>agencyTurn(id));
 assert.deepEqual(agencyRequestHistory(messages,new Set(),{turns:2,chars:1e6}).map(m=>m.id),['c','c-reply','d','d-reply']);
 const sized=[...agencyTurn('a',100),...agencyTurn('b',100),...agencyTurn('huge',5000)];
 assert.deepEqual(agencyRequestHistory(sized,new Set(),{turns:9,chars:1000}).map(m=>m.id),['huge','huge-reply']);
});

test('display turns do not use up the character budget',()=>{
 const display=[{id:'shown',role:'assistant',content:[{type:'text',text:'z'.repeat(9000)}]}];
 const messages=[...agencyTurn('a'),...display,...agencyTurn('b')];
 assert.deepEqual(agencyRequestHistory(messages,new Set(['shown']),{turns:9,chars:1000}).map(m=>m.id),['a','a-reply','b','b-reply']);
});

test('a tool call and result that straddle the cut stay together',()=>{
 const call={id:'call',role:'assistant',content:[{type:'tool-call',id:'t'}]},result={id:'result',role:'tool',toolCallId:'t',content:[]};
 assert.deepEqual(agencyRequestHistory([...agencyTurn('a'),call,...agencyTurn('b'),result],new Set(),{turns:1,chars:1e6}).map(m=>m.id),['call','b','b-reply','result']);
 assert.deepEqual(agencyRequestHistory([...agencyTurn('a'),call,result,...agencyTurn('b')],new Set(),{turns:1,chars:1e6}).map(m=>m.id),['b','b-reply']);
});

test('tool changes keep only the last change per tool and every message id',()=>{
 const reg=(id,...content)=>Object.freeze({id,role:'developer',source:{kind:'tool-registry'},content});
 const add=toolName=>({type:'tool-addition',toolName}),del=toolName=>({type:'tool-removal',toolName});
 const out=agencyRequestHistory([reg('r1',add('a'),add('b')),reg('r2',del('a')),reg('r3',add('a'))],new Set());
 assert.deepEqual(out.map(m=>m.id),['r1','r2','r3']);assert.deepEqual(out.map(m=>m.content),[[add('b')],[],[add('a')]]);
});

test('an over-window turn is not offered again; later turns back off until one completes',async()=>{
 const {settleChoice,isContextOverflow,noteContextOverflow,choiceRetryStatus}=await import('./continuity.js');
 assert.equal(isContextOverflow('context ~875559.1 tokens exceeds the model window 792576 (model=deepseek-flash)'),true);
 assert.equal(isContextOverflow('HTTP 402 balance'),false);assert.equal(isContextOverflow(undefined),false);
 const choice={run:'r',sessionId:'s'};settleChoice(choice,'error',1000,{overflow:true});
 assert.equal(choice.phase,'context-overflow');assert.equal(choice.failures,undefined);assert.equal(choice.retryAt,undefined);
 assert.equal(choiceRetryStatus({choice},{enabled:true,agentsIdle:true,sessionId:'s'}).available,false);
 const started={actionStarted:true};settleChoice(started,'error',1000,{overflow:true});assert.equal(started.phase,'verify');
 const state={rounds:{day:'d',count:3}},hour=3600000;
 noteContextOverflow(state,0,'d');assert.equal(state.contextOverflow.retryAt,hour);assert.equal(state.rounds.count,2);
 noteContextOverflow(state,0,'d');assert.equal(state.contextOverflow.retryAt,4*hour);
 noteContextOverflow(state,0,'other');assert.equal(state.contextOverflow.retryAt,16*hour);assert.equal(state.rounds.count,1);
 noteContextOverflow(state,0,'d');assert.equal(state.contextOverflow.retryAt,24*hour);
});

test('a contact that was never sent gives the shared cooldown back; a newer reservation stays',async()=>{
 const {reserveContact,releaseContact}=await import('./safety.js'),fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'agency-release-')),dir=path.join(root,'characters/censhu'),file=path.join(dir,'initiative.json');
 try{fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'integration.json'),JSON.stringify({sessionId:'role'}));
 const now=Date.parse('2026-11-03T11:00:00+08:00'),old={at:now-7200000,source:'bridge'};fs.writeFileSync(file,JSON.stringify(old));
 const prior=reserveContact(root,'role','r1',now);assert.deepEqual(prior,old);assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).agencyRun,'r1');
 assert.equal(releaseContact(root,'r1',prior),true);assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),old);
 reserveContact(root,'role','r1',now,60);assert.equal(releaseContact(root,'other',old),false);assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).agencyRun,'r1');assert.equal(fs.existsSync(path.join(dir,'initiative.lock')),false);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('solitude facts are plain elapsed times', async()=>{
 const {solitudeFacts}=await import('./continuity.js'),now=Date.parse('2026-11-09T12:00:00+08:00'),H=3600000;
 const f=solitudeFacts({entries:[{at:now-30*H},{at:now-8*24*H}],thoughts:[{updatedAt:now-1800000}],innerAt:now-90*H,personality:[]},now);
 assert.equal(f.距上次写日记,'约 30 小时');assert.equal(f.距上次整理想法,'不到一小时');assert.equal(f.距上次更新内在状态,'约 4 天');assert.equal(f.距上次整理性格,'没有记录');assert.match(f.说明,/不写也可以/);
});

test('contact outcomes report what happened and keep the reason unknown', async()=>{
 const {contactOutcomes,validReplyOutcome}=await import('./continuity.js'),M=60000;
 const rows=[{ids:['1'],observed:{kind:'engaged',latencyMs:10*M}},{ids:['2'],observed:{kind:'brief',latencyMs:30*M}},{ids:['3']},{ids:['4']},{ids:[]}];
 const out=contactOutcomes(rows);assert.equal(out.最近发出,4);assert.equal(out.收到来信,2);assert.equal(out.最近连续未见来信,2);assert.deepEqual(out.来信方式,{有内容地接话:1,简短应答:1});assert.equal(out.回应用时中位分钟,10);assert.match(out.说明,/原因未知/);
 assert.deepEqual(contactOutcomes([{ids:['1'],observed:{}}]).来信方式,{还没判断:1});
 assert.deepEqual(validReplyOutcome({kind:'less',basis:'让少发'}),{kind:'less',basis:'让少发'});assert.equal(validReplyOutcome({kind:'angry',basis:'x'}),null);
});

test('idle facts count turns with no action and leave failed turns out', async()=>{
 const {idleFacts}=await import('./continuity.js'),H=3600000,now=Date.parse('2026-11-09T12:00:00+08:00');
 const turn=(run,at,...rows)=>[{type:'开始',run,at},...rows.map(type=>({type,run,at,detail:''})),{type:'回合结束',run,at,detail:'completed'}];
 assert.equal(idleFacts([],now),null);
 const rows=[...turn('a',now-9*H,'交给工作区'),...turn('b',now-6*H),{type:'开始',run:'c',at:now-4*H},{type:'回合结束',run:'c',at:now-4*H,detail:'error · context exceeds'},...turn('d',now-2*H),{type:'保持专注',at:now-H},{type:'保持专注',at:now-3*H}];
 const f=idleFacts(rows,now);assert.equal(f.连续没有行动的回合,2,'failed turn c is not counted');assert.equal(f.上一回合之后因专注跳过,1);assert.equal(f.距上一回合,'约 2 小时');assert.match(f.说明,/什么都不做也可以/);
});

test('history measurements report filtered message counts and label token estimates',()=>{
 const before=[{id:'a',content:'展示'.repeat(100)},{id:'b',content:'real'}],after=[before[1]],stats=historyProjectionStats(before,after);
 assert.equal(stats.removed,1);assert.equal(stats.beforeChars-stats.afterChars,stats.removedChars);
 assert.ok(stats.removedEstimatedTokens>0);assert.equal(stats.estimated,true);assert.equal(stats.estimateMethod,'message-json-chars/2');
});
