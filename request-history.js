/** Display-only turns remain in the life timeline. Request projections remove
 * only event-backed identities, never a guessed span after a user message. */
export function agencyRequestHistory(messages,displayIds){
 // DSH can reuse an unchanged runtime/skill snapshot from a preceding display
 // turn. Its age does not make it display prose; the budget owns safe snapshot
 // replacement and the latest host context must remain available to execution.
 const hostContext=new Set(['runtime-context','skill-catalog','time-context']);
 const removable=messages.map(m=>!['system','developer'].includes(m.role)&&!hostContext.has(m.source?.kind)&&displayIds.has(m.id));
 const calls=new Map(),results=new Map();
 messages.forEach((m,index)=>{
   for(const b of m.role==='assistant'&&Array.isArray(m.content)?m.content:[]){
     if(b.type==='tool-call'&&b.id){const rows=calls.get(b.id)||[];rows.push(index);calls.set(b.id,rows);}
   }
   if(m.role==='tool'&&m.toolCallId){const rows=results.get(m.toolCallId)||[];rows.push(index);results.set(m.toolCallId,rows);}
 });
 // A call and all its results form one atomic group. Retain a whole group if
 // any member is non-display, absent, or ambiguous; one assistant may call many tools.
 let changed;
 do{
   changed=false;
   for(const id of new Set([...calls.keys(),...results.keys()])){
     const a=calls.get(id)||[],b=results.get(id)||[],group=[...a,...b];
     if(a.length!==1||b.length!==1||group.some(i=>!removable[i]))for(const i of group)if(removable[i]){removable[i]=false;changed=true;}
   }
 }while(changed);
 return removable.some(Boolean)?messages.filter((_m,i)=>!removable[i]):messages;
}

export function displayMessageIds(events){
 const ids=new Set();
 let pending=[],display=false,mixed=false;
 const finish=()=>{if(display&&!mixed)for(const id of pending)ids.add(id);pending=[];display=false;mixed=false;};
 for(const {type,data} of events){
   if(type==='turn/start'||type==='turn/end'){finish();continue;}
   const msg=type==='user/message'?(data?.message||data):data?.message;
   if(!msg?.id||!['user/message','assistant/message','tool/result'].includes(type))continue;
   pending.push(msg.id);
   if(type!=='user/message')continue;
   const source=msg.source;
   if(source?.kind==='censhu-inner-life'&&(source.displayEntryId||source.executionRequestId))display=true;
   else if(!['runtime-context','skill-catalog','time-context'].includes(source?.kind))mixed=true;
 }
 finish();return ids;
}

/** Explicit heuristic, not provider token accounting; excludes tool schemas. */
export function historyProjectionStats(before,after){
 const chars=messages=>messages.reduce((n,m)=>n+JSON.stringify(m).length,0);
 const beforeChars=chars(before),afterChars=chars(after);
 return {before:before.length,after:after.length,removed:before.length-after.length,
   beforeChars,afterChars,removedChars:beforeChars-afterChars,
   beforeEstimatedTokens:Math.ceil(beforeChars/2),afterEstimatedTokens:Math.ceil(afterChars/2),
   removedEstimatedTokens:Math.ceil(beforeChars/2)-Math.ceil(afterChars/2),estimateMethod:'message-json-chars/2',estimated:true};
}
