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

test('history measurements report filtered message counts and label token estimates',()=>{
 const before=[{id:'a',content:'展示'.repeat(100)},{id:'b',content:'real'}],after=[before[1]],stats=historyProjectionStats(before,after);
 assert.equal(stats.removed,1);assert.equal(stats.beforeChars-stats.afterChars,stats.removedChars);
 assert.ok(stats.removedEstimatedTokens>0);assert.equal(stats.estimated,true);assert.equal(stats.estimateMethod,'message-json-chars/2');
});
