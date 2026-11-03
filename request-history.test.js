import test from 'node:test';import assert from 'node:assert/strict';import {agencyRequestHistory} from './request-history.js';
test('only trusted display turns are omitted from a real request; durable history and action tool pairs survive',()=>{
 const msgs=[{role:'system'},{role:'user',id:'old-display'},{role:'assistant',id:'rendered'},{role:'user',id:'old-agency'},{role:'assistant',id:'call'},{role:'tool',id:'result'},{role:'user',id:'current'}];
 const kept=agencyRequestHistory(msgs,new Set(['old-display']));
 assert.deepEqual(kept.map(m=>m.id),[undefined,'old-agency','call','result','current']);assert.equal(msgs.length,7);
});
