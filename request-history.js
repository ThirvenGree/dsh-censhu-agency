/** Display-only turns remain in the life timeline. Request projections remove
 * only event-backed identities, never a guessed span after a user message. */
// 2026-11-09: each of these messages carries its complete current value, so only
// the newest copy means anything. The life session kept every copy (250 skill
// catalogs, 115 system prompts): 99% of an over-window request was stale copies.
const SNAPSHOT_KINDS=new Set(['runtime-context','skill-catalog','time-context','system-prompt']);
// Upper bounds for the real agency exchange that follows the snapshots. The newest
// turn always stays, however large it is.
export const HISTORY_LIMITS=Object.freeze({turns:30,chars:240000});
const isConversation=m=>['user','assistant','tool'].includes(m.role)&&!SNAPSHOT_KINDS.has(m.source?.kind);
const isTurnStart=m=>m.role==='user'&&m.source?.kind==='plugin:dsh-censhu-agency';
/** Index of the oldest agency turn inside the limits; earlier conversation is dropped. */
function historyCut(messages,displayIds,{turns,chars}){
 let count=0,total=0,pending=0,cut=0;
 for(let i=messages.length-1;i>=0;i--){
   const m=messages[i];
   if(isConversation(m)&&!displayIds.has(m.id))pending+=JSON.stringify(m.content??'').length;
   if(!isTurnStart(m))continue;
   count++;
   if(count>1&&(count>turns||total+pending>chars))return cut;
   total+=pending;pending=0;cut=i;
 }
 return total+pending>chars?cut:0;
}
/** Tool changes are deltas, so only each tool's last change matters. Messages keep
 * their ids even when emptied: DSH checks them against toolHistory and drops all
 * updates if one is missing; the adapter already skips an empty update. */
function foldToolRegistry(messages){
 const isChange=b=>b?.type==='tool-addition'||b?.type==='tool-removal';
 const isRegistry=m=>m.role==='developer'&&m.source?.kind==='tool-registry'&&Array.isArray(m.content);
 const last=new Map();
 for(const m of messages)if(isRegistry(m))for(const b of m.content)if(isChange(b))last.set(b.toolName,b);
 let changed=false;
 const folded=messages.map(m=>{
   if(!isRegistry(m))return m;
   const content=m.content.filter(b=>!isChange(b)||last.get(b.toolName)===b);
   if(content.length===m.content.length)return m;
   changed=true;return {...m,content};
 });
 return changed?folded:messages;
}

export function agencyRequestHistory(messages,displayIds,limits=HISTORY_LIMITS){
 const newest=new Map();
 messages.forEach((m,i)=>{if(SNAPSHOT_KINDS.has(m.source?.kind))newest.set(m.source.kind,i);});
 const cut=historyCut(messages,displayIds,limits);
 const removable=messages.map((m,i)=>{
   if(SNAPSHOT_KINDS.has(m.source?.kind))return newest.get(m.source.kind)!==i;
   if(['system','developer'].includes(m.role))return false;
   return displayIds.has(m.id)||i<cut&&isConversation(m);
 });
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
 return foldToolRegistry(removable.some(Boolean)?messages.filter((_m,i)=>!removable[i]):messages);
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
