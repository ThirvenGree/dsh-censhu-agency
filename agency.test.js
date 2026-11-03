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
