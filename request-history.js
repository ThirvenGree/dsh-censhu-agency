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
