/** Display-only turns remain in the life timeline. Their rendered copies are
 * unnecessary in model input once agency supplies the current situation. */
export function agencyRequestHistory(messages,displayIds){
 let displaying=false,removed=0;
 const kept=[];
 for(const m of messages){
   if(m.role==='user')displaying=displayIds.has(m.id);
   if(displaying&&m.role!=='system'){removed++;continue;}
   kept.push(m);
 }
 return removed?kept:messages;
}

export function displayMessageIds(events){
 const ids=new Set();
 let pending=[],display=false,mixed=false;
 const finish=()=>{if(display&&!mixed)for(const id of pending)ids.add(id);pending=[];display=false;mixed=false;};
 for(const {type,data} of events){
   if(type==='turn/start'){finish();continue;}
   if(type==='turn/end'){finish();continue;}
   const msg=type==='user/message'?data:data?.message;
   if(!msg?.id||!['user/message','assistant/message','tool/result'].includes(type))continue;
   pending.push(msg.id);
   if(type!=='user/message')continue;
   const source=msg.source;
   if(source?.kind==='censhu-inner-life'&&(source.displayEntryId||source.executionRequestId))display=true;
   else if(!['runtime-context','skill-catalog','time-context'].includes(source?.kind))mixed=true;
 }
 finish();return ids;
}
