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
  const signature=JSON.stringify([life.mode?.id,(diary.entries||[]).filter(x=>x.expiresAt>now&&!x.supersededAt&&x.shareState!=='private').slice(-3).map(x=>x.id),(interests.items||[]).filter(x=>!x.expiresAt||x.expiresAt>now).slice(-5).map(x=>[x.id,x.state]),(active?.lifeIntentions||[]).filter(x=>x.expiresAt>now).map(x=>[x.id,x.status])]);
  return {feed,signature,pace:active?.values||{},context:{
    手头的事:(life.active||[]).map(x=>({id:x.id,事件:x.name,进度:x.stageText})),
    心情:life.mode,自己的打算:(active?.lifeIntentions||[]).filter(x=>x.expiresAt>now).map(x=>x.text),
    最近的独处念头:(diary.entries||[]).filter(x=>x.expiresAt>now&&!x.supersededAt&&x.shareState!=='private').slice(-3).map(x=>({id:x.id,感受:x.feeling,想法:x.intention})),
    兴趣:(interests.items||[]).filter(x=>!x.expiresAt||x.expiresAt>now).slice(-5).map(x=>x.topic)
  }};
}
export function opportunity(snap,state,now){
  const {feed,pace}=snap;
  const cursor=state.generation===feed.generation?state.cursor:feed.sequence;
  const fresh=feed.items.filter(x=>x.sequence>cursor&&now-x.at<4*3600000);
  const after=now-(state.lastAt||now);
  const merge=Math.max(30,Math.min(600,Number(pace.innerMergeSeconds)||90))*1000;
  const idle=Math.max(10,Math.min(180,Number(pace.innerMinimumMinutes)||45))*60000;
  const idlePending=state.nextConsiderAt?now<state.nextConsiderAt:after<idle;
  if(after<merge||(!fresh.length&&snap.signature===state.signature&&idlePending&&!state.notes.some(n=>n.due&&n.due<=now)))return null;
  const batch=fresh.slice(0,24);
  return {cursor:batch.at(-1)?.sequence??feed.sequence,generation:feed.generation,
    reason:batch.length?'生活有变化':snap.signature!==state.signature?'心情、兴趣或打算发生变化':state.notes.some(n=>n.due&&n.due<=now)?'自己的提醒':'自然空当',
    changes:batch.map(x=>({id:x.data?.eventId||x.id,kind:x.kind,name:x.data?.name||x.data?.title,stage:x.data?.stageText,感受:x.data?.reflection||x.data?.reason})),
    context:snap.context};
}
export function message(op,notes,id){
 return {id,role:'user',source:{kind:'speak-up',agencyId:id},content:[{type:'text',text:[
 '【岑舒自己的主动时刻 · 内部处境，非青枔来信】现在你想怎么做？',
 '眼前资料仅供参考。可以产生自己的目的，继续原事，穿插小事，改变主意，保持不确定或什么也不做。考虑这一步占用的手、眼和精力，手头忙也可能突然想起谁。留意明确约定、共同经历和当下就想做的小事；对方没有回复的原因未知。',
 '可以直接用已获准的工具，自行根据实际结果继续或停下，发消息的形式和数量由你决定。只有你想对外联系时才实际调用相应工具；私人内容只留给自己。旧记录是背景，勿重复已执行的动作。文字结语仅留在本会话。',
 '你负责综合判断 Gemini 摘要和原始线索。根据工具回执可以修正决定。若愿意改变生活里的具体打算或决定下次何时再考虑，可调用 censhu_agency_arrange；新事件和自己的明确提醒仍可提前到来。',
 '想稍后做的事用 censhu_agency_note 记下线索、做到哪一步和可选提醒时间；已完成或改变心意时按编号撤下。无需给每个想法建待办。',
 JSON.stringify({处境:op.context,刚发生:op.changes,自己留的线索:notes})
 ].join('\n')}]};
}
