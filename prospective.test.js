import test from 'node:test';
import assert from 'node:assert/strict';
import {validAt,unchangedNotes,updateNote,openCues} from './prospective.js';
test('cross-day intention rejects stale actions and other owners',()=>{
 const notes=[],now=Date.UTC(2026,10,3),later=now+86400000;
 const note=updateNote(notes,{text:'窗框',triggerCue:'画窗台时',sourceRefs:['asset:1'],notBefore:later,expiresAt:later+60000},'life',now,'n');
 const refs=[{id:'n',revision:1}];
 assert.equal(validAt(note,now),false);
 assert.equal(unchangedNotes(refs,notes,later),true);
 assert.throws(()=>updateNote(notes,{id:'n',revision:1,text:'other'},'other',later));
 updateNote(notes,{id:'n',revision:1,text:'改天'},'life',later);
 assert.equal(unchangedNotes(refs,notes,later),false);
 assert.equal(validAt(notes[0],later+60000),false);
});
