import {validAt} from './prospective.js';
export function matchingNotes(notes,changes,now){
 return notes.filter(n=>{
   if(n.deliveredAt||!validAt(n,now))return false;
   if(n.due&&n.due<=now)return true;
   return n.eventId&&changes.some(c=>c.id===n.eventId&&c.kind===n.when);
 });
}
export function commitDelivery(state,p,now){
 if(state.pending?.run!==p.run)return false;
 state.seenNotices=[...new Set([...(state.seenNotices||[]),...(p.notices||[])])].slice(-4000);
 state.cursor=p.cursor;state.generation=p.generation;state.signature=p.signature;state.lastAt=p.at;
 if(state.nextConsiderAt===p.previousWindow)state.nextConsiderAt=null;
 for(const n of state.notes){
   if(p.notes.some(r=>r.id===n.id&&r.revision===(n.revision||0))){
     n.due=null;n.deliveredAt=now;n.deliveredRun=p.run;
   }
 }
 if(p.ticket)state.choice={...p.ticket,sessionId:p.sessionId,run:p.run,phase:'delivered'};
 delete state.pending;return true;
}
export function settleChoice(choice,reason,now){
 if(!choice||choice.finished)return;
 choice.finished=true;
 if(choice.needsVerification){choice.phase='verify';return;}
 if(reason==='completed'){choice.phase='completed';return;}
 if(choice.actionStarted||choice.expressed){choice.phase=choice.confirmed?'confirmed':choice.actionStarted?'verify':'expressed';return;}
 choice.phase='retry';choice.failures=(choice.failures||0)+1;
 choice.retryAt=now+Math.min(60,5*2**Math.min(4,choice.failures-1))*60000;
}
export function nextIncoming(messages,ids){
 const at=messages.findLastIndex(m=>m.role==='self'&&ids.includes(String(m.id)));
 if(at<0)return null;
 return messages.slice(at+1).find(m=>m.role==='user'&&m.id&&m.at)||null;
}
export function snapshotHas(events,run){
 return events?.some(e=>e.type==='user/message'&&(e.data?.id===run||e.data?.source?.agencyId===run));
}
export function timing(pace={},state,now){
 const mergeSeconds=Math.max(1,Math.min(3600,(state.pacingChoice?.until>now&&state.pacingChoice.mergeSeconds)||Number(pace.innerMergeSeconds)||90));
 const naturalMinutes=Math.max(1,Math.min(1440,Number(pace.innerMinimumMinutes)||45));
 return {mergeSeconds,naturalMinutes,nextNaturalAt:state.nextConsiderAt||(state.lastAt||now)+naturalMinutes*60000,
 source:state.nextConsiderAt?'DSH 主模型':pace.innerMinimumMinutes?'Gemini 生活节奏':'本地备用间隔'};
}
export function sendReceipt(tool,m){
 if(!/^(?:mcp__snowluma__)?qq_(?:send_\w+|reply|speak)$/.test(tool))return null;
 if(m.isError)return {type:'想发 · 工具报错',detail:tool};
 for(const b of m.content||[]){
   if(b.type!=='text')continue;
   let r;try{r=JSON.parse(b.text);}catch{continue;}
   if(r?.ok===false||r?.verified===false)continue;
   if(r.ok===true&&Array.isArray(r.receipts)){
     const ids=r.receipts.map(x=>x?.messageId).filter(id=>/^-?[1-9]\d*$/.test(String(id)));
     if(ids.length)return {type:ids.length===r.sent&&!r.failed?'QQ 已确认发出':'QQ 部分已确认',messageIds:ids.map(String),detail:tool+' · '+ids.join('、')};
   }
   const id=r?.messageId??r?.message_id;
   if((r?.ok===true||r?.verified===true)&&/^-?[1-9]\d*$/.test(String(id)))return {type:'QQ 已确认发出',messageIds:[String(id)],detail:tool+' · '+id};
 }
 return {type:'发送已调用 · 缺平台回执',detail:tool};
}
export function unchangedSession(events,pending){
 if(!Array.isArray(events)||!Number.isSafeInteger(pending.beforeSeq))return false;
 return events.at(-1)?.seq===pending.beforeSeq&&!snapshotHas(events,pending.run);
}
