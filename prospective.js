export function validAt(note,now){
 return (!note.notBefore||note.notBefore<=now)&&(!note.expiresAt||now<note.expiresAt);
}
/** Cues she should see this turn: not yet considered, or something has changed since she last did. */
export function openCues(notes,sessionId,changes,now){
 return notes.filter(n=>n.sessionId===sessionId&&n.triggerCue&&(!n.deliveredAt||changes.some(c=>c.at>n.deliveredAt))&&validAt(n,now));
}
export function unchangedNotes(refs,notes,now){
 return refs.every(ref=>notes.some(n=>n.id===ref.id&&(n.revision||0)===ref.revision&&validAt(n,now)));
}
export function updateNote(notes,a,sessionId,now,id){
 const text=a.text?.trim();
 if(typeof text!=='string'||!text||text.length>500)throw Error('请简要写下事项');
 const old=a.id?notes.find(n=>n.id===a.id):notes.find(n=>n.text===text&&(!n.sessionId||n.sessionId===sessionId));
 if(old?.sessionId&&old.sessionId!==sessionId||a.id&&!old)throw Error('事项不存在，请重读');
 if(old&&(a.revision!==(old.revision||0)||!a.id))throw Error('请用现有编号和最新 revision 编辑');
 if(!old&&a.revision!==undefined)throw Error('新事项没有旧版本');
 const n={...old,id:old?.id||id,text,sessionId,revision:(old?.revision||0)+1,deliveredAt:null,deliveredRun:null};
 for(const k of ['why','triggerCue','cancelWhen','resume'])if(k in a){if(typeof a[k]!=='string'||a[k].length>500)throw Error('线索文字无效');n[k]=a[k];}
 for(const k of ['notBefore','expiresAt'])if(k in a){if(a[k]!==null&&(!Number.isSafeInteger(a[k])||a[k]<=0))throw Error('时间须为毫秒时间戳');n[k]=a[k];}
 if(n.expiresAt&&(n.expiresAt<=now||n.notBefore>=n.expiresAt))throw Error('意图时间窗口无效');
 if('sourceRefs' in a){if(!Array.isArray(a.sourceRefs)||a.sourceRefs.length>12||a.sourceRefs.some(r=>typeof r!=='string'||!r.trim()||r.length>250))throw Error('来源编号无效');n.sourceRefs=[...new Set(a.sourceRefs)];}
 if('minutes' in a)n.due=a.minutes>0?now+Math.min(a.minutes,43200)*60000:null;
 if('eventId' in a)n.eventId=a.eventId||null;
 if('when' in a)n.when=a.when||null;
 if('shareMinutes' in a)n.shareUntil=a.shareMinutes>0?now+Math.min(a.shareMinutes,1440)*60000:0;
 if(old)notes[notes.indexOf(old)]=n;else{if(notes.length>=40)throw Error('请先整理已有事项');notes.push(n);}
 return n;
}
