import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {queueDisplay,pendingDisplay,acknowledgeDisplay,watchDisplay,displayId,describeActivity,describePlan} from './timeline.js';
import {agencyDisplay} from './inner-agency.js';
test('真实变化唤醒展示，未投递内容跨重启保存，回放按会话和记录编号去重',async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'agency-display-')),dir=path.join(home,'censhu-inner-life'),base=path.join(home,'censhu-agency');let close,timer;
 try{
 const notified=new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Error('没有收到变化通知')),2500);close=watchDisplay(home,resolve);});
 fs.writeFileSync(path.join(base,'control.json'),JSON.stringify({sessionId:'main'}));fs.mkdirSync(dir);
 const row={at:Date.now(),sessionId:'main',type:'当前情况与打算',detail:describeActivity({activity:'核对照片',thought:'窗花像一只燕子',until:Date.now()+60000})};
 queueDisplay(home,row);queueDisplay(home,row);queueDisplay(home,{...row,sessionId:'other',detail:'不属于这个会话'});
 await notified;assert.equal(pendingDisplay(home,'main').length,1);
 const rows=agencyDisplay(dir,'main');assert.equal(rows.length,1);assert.match(rows[0].displayText,/窗花像一只燕子/);
 acknowledgeDisplay(home,displayId(row));assert.equal(pendingDisplay(home,'main').length,0);assert.equal(pendingDisplay(home,'other').length,1);
 assert.match(describePlan({text:'看看招牌',resume:'辨认右下角',eventId:'scan',when:'event-end'}),/辨认右下角[\s\S]*事件结束/);
 }finally{clearTimeout(timer);close?.();fs.rmSync(home,{recursive:true,force:true});}
});
