import {createHash} from 'node:crypto';

// Existing life v2 accepts a namespaced stable receipt and verifies the proposed revision itself.
export function lifeInputs(service, sessionId){
 const s=service.status();
 if(!s.enabled||!s.sessionIds.includes(sessionId))throw Error('生活接口已关闭或会话未绑定');
 return {intentions:s.intentions.filter(x=>['available','upcoming'].includes(x.status)).map(({id,text,generatedAt,revision=0,priority,status})=>({id,text,generatedAt,revision,priority,status})),mood:s.mood?.ok?{value:s.mood.mood,dimensions:s.mood.dims}:null};
}
export function revise(service,sessionId,run,a){
 const change={id:a.id,generatedAt:a.generatedAt,expectedRevision:a.revision,priority:a.priority,action:a.direction,reason:a.reason};
 const key=createHash('sha256').update(JSON.stringify([sessionId,run,change])).digest('hex');
 const result=service.submitInnerResult({sessionId,id:'inner:agency-'+key,intentionChanges:[change]}).intentions;
 if(!result?.accepted?.length)throw Error(result?.rejected?.[0]?.reason||'生活插件未采纳');
 return result;
}
export function nextWindow(minutes,now){
 if(!Number.isInteger(minutes)||minutes<5||minutes>1440)throw Error('可在5至1440分钟后重新考虑');
 return now+minutes*60000;
}
