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
/** A retry is permission to reconsider the original opportunity, never to replay
 * an external action. Keep every other cooldown and the original evidence intact. */
export function choiceRetryStatus(state,{stopped=false,running=false,agentsIdle=false,enabled=false,sessionId}={}){
 const choice=state.choice;
 const result={available:false,run:choice?.run||null,retryAt:choice?.retryAt||null};
 const blocked=reason=>({...result,reason});
 if(stopped)return blocked('插件正在停止');
 if(!enabled)return blocked('请先开启主动行动并保持接管');
 if(running||state.pending||!agentsIdle)return blocked('等待当前回合和投递核对结束');
 if(!choice?.run||choice.phase!=='retry'||choice.sessionId!==sessionId)return blocked('没有可恢复的原打算');
 if(choice.actionStarted||choice.expressed||choice.needsVerification||choice.confirmed)return blocked('已有行动、表达或待核实结果，不能重新执行');
 if(!Number.isFinite(choice.retryAt)||choice.retryAt<=0)return blocked('已安排重新考虑，继续遵守其它等待条件');
 return {...result,available:true,reason:'尚未行动或表达，可重新考虑原打算'};
}
export function requestChoiceRetry(state,options,expectedRun,now){
 const status=choiceRetryStatus(state,options);
 if(!expectedRun||expectedRun!==status.run)throw Object.assign(Error('原打算已变化，请刷新后重试'),{status:409});
 if(!status.available)throw Object.assign(Error(status.reason),{status:409});
 const choice=state.choice;
 choice.retryAt=0;
 choice.manualRetryRequestedAt=now;
 return {run:status.run,previousRetryAt:status.retryAt};
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
// Native request headers moved model selection under config. Read only an
// observed request header, never infer a model from global defaults or caches.
export function observedModel(header){
 const value=header?.config?.model??header?.model;
 return typeof value==='string'&&value?value:typeof value?.id==='string'?value.id:null;
}
export function lifeModelView(agents,worker,state){
 try{
  const agent=agents?.get?.(worker)||(agents?.list?.()||agents?.roots?.()||[]).find(a=>String(a.session?.id||a.id).replace(/^session-/,'')===String(worker).replace(/^session-/,''));
  const model=observedModel(agent?.session?.requestHeader?.());
  if(model)return {model,source:'生活会话最近请求'};
 }catch{/* No observed header yet; a persisted matching receipt may still exist. */}
 return state.mainModelSession===worker&&state.mainModel?{model:state.mainModel,source:'已保存的生活请求回执'}:{model:null,source:'尚无生活会话请求回执；不代表主动进行已暂停'};
}
