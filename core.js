import {matchingNotes,timing} from './continuity.js';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

export function read(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file,'utf8')); }
  catch (e) { if(e.code==='ENOENT') return fallback; throw e; }
}
export function save(file,value){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const tmp=file+'.'+randomUUID()+'.tmp';
  fs.writeFileSync(tmp,JSON.stringify(value));fs.renameSync(tmp,file);
}
export function situation(home,now){
  const get=(file)=>read(path.join(home,file+'.json'),{});
  const feed=get('cen-shu-life/life-changes');
  if(feed.version!==1||!Array.isArray(feed.items))throw Error('生活变化接口不可用');
  const life=get('cen-shu-life/state'), rhythm=get('cen-shu-life/rhythm').plan;
  const diary=get('censhu-inner-life/state'), interests=get('censhu-inner-life/interests');
  const active=rhythm?.expiresAt>now?rhythm:null;
  const sessionId=get('characters/censhu/integration').sessionId;
  const receipts=(diary.agencyRequests||[]).filter(x=>x.sourceId===sessionId).slice(-8);
  const remembered=(get('cen-shu-life/memory-writeback').sources||[]).filter(x=>x.sessionId===sessionId&&x.state==='reviewed'&&x.accepted>0).slice(-6);
  const privateContext={说明:'仅供自己回想。私人感受不自动对外分享。',最近日记:(diary.entries||[]).filter(x=>x.sourceId===sessionId&&x.shareState==='private'&&!x.supersededAt&&x.expiresAt>now).slice(-3).map(x=>({id:x.id,感受:x.feeling,反思:x.reflection})),之前提交:receipts.map(x=>({id:x.id,状态:x.status}))};
  const signature=JSON.stringify([privateContext.最近日记.map(x=>x.id),receipts.filter(x=>['reviewed','rejected','unconfirmed'].includes(x.status)).map(x=>[x.id,x.status]),remembered.map(x=>x.id),life.mode?.id,(diary.entries||[]).filter(x=>x.expiresAt>now&&!x.supersededAt&&x.shareState!=='private').slice(-3).map(x=>x.id),(interests.items||[]).filter(x=>!x.expiresAt||x.expiresAt>now).slice(-5).map(x=>[x.id,x.state]),(active?.lifeIntentions||[]).filter(x=>x.expiresAt>now).map(x=>[x.id,x.status])]);
  return {feed,signature,privateContext,pace:active?.values||{},context:{
    手头的事:(life.active||[]).map(x=>({id:x.id,事件:x.name,进度:x.stageText})),
    心情:life.mode,自己的打算:(active?.lifeIntentions||[]).filter(x=>x.expiresAt>now).map(x=>x.text),
    最近的独处念头:(diary.entries||[]).filter(x=>x.expiresAt>now&&!x.supersededAt&&x.shareState!=='private').slice(-3).map(x=>({id:x.id,感受:x.feeling,想法:x.intention})),
    兴趣:(interests.items||[]).filter(x=>!x.expiresAt||x.expiresAt>now).slice(-5).map(x=>x.topic)
  }};
}
export function opportunity(snap,state,now){
  const {feed,pace}=snap;
  const cursor=state.generation===feed.generation?state.cursor:feed.sequence;
  const fresh=feed.items.filter(x=>x.sequence>cursor&&(now-x.at<4*3600000||state.notes.some(n=>!n.deliveredAt&&n.eventId===x.data?.eventId&&n.when===x.kind)));
  const after=now-(state.lastAt||now);
  const schedule=timing(pace,state,now);
  const batch=fresh.slice(0,24);
  const changes=batch.map(x=>({id:x.data?.eventId||x.id,kind:x.kind,name:x.data?.name||x.data?.title,stage:x.data?.stageText,感受:x.data?.reflection||x.data?.reason}));
  const matched=matchingNotes(state.notes,changes,now);
  if(after<schedule.mergeSeconds*1000||(!changes.length&&snap.signature===state.signature&&now<schedule.nextNaturalAt&&!matched.length))return null;
  return {cursor:batch.at(-1)?.sequence??feed.sequence,generation:feed.generation,
    reason:matched.length?'续接先前的打算':batch.length?'生活有变化':snap.signature!==state.signature?'心情、兴趣或打算发生变化':state.notes.some(n=>n.due&&n.due<=now)?'自己的提醒':'自然空当',
    changes,matched,
    context:snap.context};
}
export function message(op,notes,id){
 return {id,role:'user',source:{kind:'speak-up',agencyId:id},content:[{type:'text',text:[
 '【岑舒自己的主动时刻 · 内部处境，非青枔来信】现在你想怎么做？',
 '眼前资料仅供参考。可以产生自己的目的，继续原事，穿插小事，改变主意，保持不确定或什么也不做。考虑这一步占用的手、眼和精力，手头忙也可能突然想起谁。留意明确约定、共同经历和当下就想做的小事；对方没有回复的原因未知。',
 '自行使用已有工具并读取结果。保留私人内容；已做过的动作不重复。',
 '你负责综合判断 Gemini 摘要和原始线索。根据工具回执可以修正决定。若愿意改变生活里的具体打算或决定下次何时再考虑，可调用 censhu_agency_arrange；新事件和自己的明确提醒仍可提前到来。',
 '已有记忆和自己的独处观察由你衡量。若想记下当前感受，可用 censhu_agency_diary 提交你写的内容；此前已提交或仅状态更新的日记不重复执行。',
 '想稍后做的事用 censhu_agency_note 记下线索、做到哪一步和可选提醒时间；可把笔记绑到正在发生的 eventId 和 event-stage 或 event-end，并记录切走前做到哪一步。愿意让生活、独处及浏览规划参考时，可用 shareMinutes 指定有效期，私人的线索省略；已完成或改变心意时按编号撤下。无需给每个想法建待办。',
 JSON.stringify({处境:op.context,刚发生:op.changes,自己留的线索:notes})
 ].join('\n')}]};
}
