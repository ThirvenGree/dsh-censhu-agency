import test from 'node:test';import assert from 'node:assert/strict';import {opportunity,focusStateKey} from './core.js';
test('focus review waits on unchanged input, but admits new events, notifications and reminders',()=>{
 const now=10e6,s={lastAt:1,cursor:4,generation:'g',signature:'sig',notes:[],focusCheckedUntil:now+600000};
 const snap={feed:{generation:'g',sequence:4,items:[]},pace:{},signature:'sig',notices:[],context:{当前自述:{截止:now+3600000,留意线索:'扫描结束',关联事件:'scan'}}};
 s.focusCheckedKey=focusStateKey(snap.context.当前自述,s.notes);
 for(let n=0;n<600000;n+=20000)assert.equal(opportunity(snap,s,now+n),null);
 assert.ok(opportunity(snap,s,now+600000));assert.ok(opportunity({...snap,notices:[{id:'incoming'}]},s,now));
 assert.ok(opportunity({...snap,feed:{...snap.feed,items:[{id:'new',sequence:5,kind:'event-stage',data:{eventId:'scan'}}]}},s,now));
 assert.ok(opportunity(snap,{...s,notes:[{id:'n',due:now-1}]},now));
});
