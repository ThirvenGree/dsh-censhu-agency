import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {presenceFacts,presenceLevel,readPresence} from './presence.js';
import {openCues,updateNote} from './prospective.js';

const out=JSON.stringify({idleSeconds:185,fullscreen:true,process:'game'});
const home=level=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'presence-'));if(level){fs.mkdirSync(path.join(dir,'censhu-agency'));fs.writeFileSync(path.join(dir,'censhu-agency/presence.json'),JSON.stringify({level}));}return dir;};

test('facts say what the computer shows and leave the decision to her',()=>{
 const v=presenceFacts(out);
 assert.equal(v.键鼠空闲分钟,3);assert.equal(v.前台全屏,true);assert.equal(v.前台程序,'game');assert.match(v.说明,/由你判断/);
 assert.equal(presenceFacts(out,'activity').前台程序,undefined,'activity level has no program name');
 assert.equal(presenceFacts(JSON.stringify({idleSeconds:1,fullscreen:false,process:'bad/name'})).前台程序,undefined);
 for(const bad of ['','not json','{}',JSON.stringify({idleSeconds:-1,fullscreen:false})])assert.equal(presenceFacts(bad),null);
});
test('the level comes from the file and defaults to app',async()=>{
 assert.equal(presenceLevel(home()),'app');assert.equal(presenceLevel(home('activity')),'activity');assert.equal(presenceLevel(home('nonsense')),'app');
 let ran=0;const run=async()=>{ran++;return out;};
 assert.equal(await readPresence(home('off'),{run,platform:'win32'}),null);assert.equal(ran,0,'off never runs the probe');
 assert.equal(await readPresence(home(),{run,platform:'linux'}),null);assert.equal(ran,0);
 assert.equal((await readPresence(home(),{run,platform:'win32'})).前台程序,'game');
});
test('a failing probe costs the turn nothing',async()=>{
 assert.equal(await readPresence(home(),{run:async()=>{throw Error('timeout');},platform:'win32'}),null);
});

test('something noted today comes up tomorrow when its time arrives, and stops once it expires',()=>{
 const notes=[],day1=Date.UTC(2026,10,3),day2=day1+86400000,end=day2+3600000;
 updateNote(notes,{text:'把窗框画完',triggerCue:'画窗台时',notBefore:day2,expiresAt:end},'life',day1,'n');
 assert.deepEqual(openCues(notes,'life',[],day1),[],'not yet');
 assert.deepEqual(openCues(notes,'life',[],day2).map(n=>n.id),['n'],'next day it is back');
 assert.deepEqual(openCues(notes,'other',[],day2),[],'only for its own session');
 assert.deepEqual(openCues(notes,'life',[],end),[],'expired');
});
test('once considered it waits for something new, across days',()=>{
 const notes=[],day1=Date.UTC(2026,10,3),day2=day1+86400000;
 const n=updateNote(notes,{text:'问问考试',triggerCue:'青枔提到学校时'},'life',day1,'n');n.deliveredAt=day1+1000;
 assert.deepEqual(openCues(notes,'life',[],day2),[]);
 assert.deepEqual(openCues(notes,'life',[{at:day1+500}],day2),[],'older change does not count');
 assert.deepEqual(openCues(notes,'life',[{at:day2-1}],day2).map(x=>x.id),['n']);
});
