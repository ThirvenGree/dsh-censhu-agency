import test from 'node:test';
import assert from 'node:assert/strict';
import {opportunity,message} from './core.js';
const now=1800000000000;
const snap={signature:'a',feed:{generation:'g',sequence:8,items:[{sequence:8,at:now,id:'s',kind:'event-end',data:{eventId:'scan',name:'扫描结束'}}]},pace:{innerMergeSeconds:60,innerMinimumMinutes:40},context:{手头的事:['核对底片']}};
const state={lastAt:now-65000,cursor:7,generation:'g',signature:'a',notes:[]};
test('活动中有新进展可以开一轮，消费后不会因同一事件再开一轮',()=>{
 const op=opportunity(snap,state,now);assert.equal(op.changes[0].id,'scan');
 assert.equal(opportunity(snap,{...state,cursor:op.cursor},now),null);
 assert.equal(message(op,[],'run').source.agencyId,'run');
});
test('无需外部事件即可因挂念、心境改变或自然空当而考虑',()=>{
 const consumed={...state,cursor:8};
 assert.ok(opportunity(snap,{...consumed,notes:[{due:now}]},now));
 assert.ok(opportunity({...snap,signature:'b'},consumed,now));
 assert.ok(opportunity(snap,{...consumed,lastAt:now-41*60000},now));
});
import {commitDelivery,sendReceipt,snapshotHas} from './continuity.js';
test('只在对应事件结束后续接；重启、重复回执和中途改主意不会消费新版本',()=>{
 const note={id:'later',eventId:'scan',when:'event-end',text:'等扫描完再看',revision:1};
 const s={...state,notes:[note]};
 const start={...snap,feed:{...snap.feed,items:[{...snap.feed.items[0],kind:'event-stage'}]}};
 assert.deepEqual(opportunity(start,s,now).matched,[]);
 assert.deepEqual(opportunity(snap,s,now).matched,[note]);
 const pending={run:'one',cursor:8,generation:'g',signature:'a',at:now,notes:[{id:'later',revision:1}]};
 s.pending=pending;
 const restored=structuredClone(s);
 assert.equal(restored.cursor,7);
 assert.ok(snapshotHas([{type:'user/message',data:{source:{agencyId:'one'}}}],'one'));
 assert.ok(commitDelivery(restored,pending,now));assert.equal(restored.notes[0].deliveredRun,'one');assert.equal(commitDelivery(restored,pending,now),false);
 s.notes[0].revision=2;commitDelivery(s,pending,now);assert.equal(s.notes[0].deliveredRun,undefined);
});
test('QQ 工具成功返回和确实取得平台消息编号分别记录',()=>{
 const result=o=>({content:[{type:'text',text:JSON.stringify(o)}]});
 assert.equal(sendReceipt('mcp__snowluma__qq_send_message',result({ok:true})).type,'发送已调用 · 缺平台回执');
 assert.equal(sendReceipt('mcp__snowluma__qq_send_message',result({ok:true,messageId:-42})).type,'QQ 已确认发出');
 assert.equal(sendReceipt('mcp__snowluma__qq_send_message',{isError:true}).type,'想发 · 工具报错');
});
test('桥接统一发送携带逐条 OneBot 回执，缺少一条即不报告整批完成',()=>{
 const tool='mcp__snowluma__qq_send_message';
 const response=receipts=>({content:[{type:'text',text:JSON.stringify({ok:true,sent:2,failed:0,receipts})}]});
 assert.equal(sendReceipt(tool,response([{messageId:-51},{messageId:52}])).type,'QQ 已确认发出');
 assert.equal(sendReceipt(tool,response([{messageId:null},{messageId:52}])).type,'QQ 部分已确认');
});
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {agencyPlans} from './agency-plans.js';
test('共享规划只取本会话主动选择公开给规划且仍有效的打算',()=>{
 const home=mkdtempSync(path.join(os.tmpdir(),'agency-share-'));
 try{
 const root=path.join(home,'censhu-agency');mkdirSync(root);
 writeFileSync(path.join(root,'owner.json'),JSON.stringify({sessionId:'main',until:now+5000}));
 writeFileSync(path.join(root,'state.json'),JSON.stringify({notes:[{id:'shown',text:'查旧窗扣',sessionId:'main',shareUntil:now+2000},{id:'private',sessionId:'main'},{id:'other',sessionId:'other',shareUntil:now+10000}]}));
 const dir=path.join(home,'censhu-inner-life');
 assert.deepEqual(agencyPlans(dir,'main',now).map(n=>n.id),['shown']);
 assert.deepEqual(agencyPlans(dir,'main',now+3000),[]);
 assert.deepEqual(agencyPlans(dir,'other',now),[]);
 }finally{rmSync(home,{recursive:true,force:true});}
});
