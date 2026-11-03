import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const control=fileURLToPath(new URL('./control.mjs',import.meta.url));
export function installControl(profile){
 const modules=path.join(profile,'node_modules'),home=path.resolve(profile,'../..');
 const session=JSON.parse(fs.readFileSync(path.join(home,'characters/censhu/integration.json'),'utf8')).sessionId;
 if(!session)throw Error('主动进行尚未绑定会话');
 const plans=[];
 function patch(pkg,file,from,to){
   const root=path.join(modules,pkg);if(!fs.existsSync(root))return;
   const dest=path.join(root,file),row=plans.find(x=>x.dest===dest)||{dest,src:fs.readFileSync(dest,'utf8').replaceAll('\r\n','\n')};
   if(!plans.includes(row))plans.push(row);
   if(row.src.includes(to)||to.includes("if(agencyOwner()){agencySignal('抖音来信'")&&row.src.includes('mark.agencyOffer={id,last:'))return;
   if(row.src.split(from).length!==2)throw Error('请重新适配 '+pkg+'/'+file+'：'+from.slice(0,65));
   row.src=row.src.replace(from,()=>to);
 }
 patch('dsh-bili-whale','lib/scheduler.js','  async function tick() {','  async function tick() {\n    if(agencyOwner())return;');
 patch('dsh-bili-whale','lib/session-delivery.js','      const job=tail.then(async()=>{', '      if(agencyOwner()){agencySignal("B站通知",request.requestId,("有来自 B 站的实际通知。"+(request.content?.[0]?.text||"").split("\\n").slice(0,3).join(" ").slice(0,500)));return Promise.resolve();}\n      const job=tail.then(async()=>{');
 patch('dsh-douyin-browser-local','scheduled-watch.mjs','async perform(){const limits','async perform(){if(agencyOwner())return;const limits');
 const spark=path.join(modules,'dsh-douyin-browser-local/spark-service.mjs');
 if(fs.existsSync(spark))plans.push({dest:spark,src:fs.readFileSync(spark,'utf8').replaceAll('\r\n','\n').replace('    if(agencyOwner())return this.state();\n','')});
 patch('dsh-douyin-browser-local','spark-service.mjs','      let operationId;',`      let agencyOrder=null,agencyId=null;
      if(agencyOwner()){agencyId=agencySignal('抖音问候',day(this.now())+':'+contact.id+':'+signature(messages),'当前授权联系人 '+contact.id+' 存在一次问候机会');agencyOrder=agencyTakeReply(agencyId);if(!agencyOrder)continue;}
      let operationId;`);
 patch('dsh-douyin-browser-local','spark-service.mjs','greetingProvider: this.greetingProvider });\n        const greeting =', 'greetingProvider: agencyOrder?async()=>({text:agencyOrder.text}):this.greetingProvider });\n        const greeting =');
 patch('dsh-douyin-browser-local','spark-service.mjs',"          this.update(operationId, { status: 'sending' });","          if(agencyOrder){const {reviewOutbound,conversationEvidence}=await import('./outbound-review.mjs');await reviewOutbound({channel:'dm-reply',text:greeting.text,history:conversationEvidence([],current),signal});}\n          this.update(operationId, { status: 'sending' });");
 patch('dsh-douyin-browser-local','spark-service.mjs','        if (!confirmed && delivery?.deliveryUncertain)',"        if(agencyId)agencySignal('抖音回执',agencyId,confirmed?'问候已确认 '+delivery.messageId:'问候结果未确认');\n        if (!confirmed && delivery?.deliveryUncertain)");

 patch('dsh-douyin-browser-local','chat-service.mjs','          const date = dayKey();\n          const evidence=',"          if(agencyOwner()){agencySignal('抖音来信',contact.id+':'+incoming.map(x=>x.id).join(','),'会话 '+contact.id+' 有 '+incoming.length+' 条新消息；如需了解内容请读取原会话。');continue;}\n          const date = dayKey();\n          const evidence=");
 patch('dsh-douyin-browser-local','chat-service.mjs','async processAutoBacklog(contact, mark, snapshot, messages, signal) {','async processAutoBacklog(contact, mark, snapshot, messages, signal) {\n    if(agencyOwner())return;'.replace(String.fromCharCode(10),'\n'));
 for(const file of ['lib/index.js','lib/app.js'])patch('dsh-pet',file,'const schedule = automaticWhisperSchedule(standaloneAiPolicy(), pet.whisperEnabled === true, whisperPeriodSec(found.conf));','if(petId==="main" && agencyOwner())continue;\n                    const schedule = automaticWhisperSchedule(standaloneAiPolicy(), pet.whisperEnabled === true, whisperPeriodSec(found.conf));');
 patch('dsh-cen-shu-life','lib/drawing-inspiration.js','  async tick(){','  async tick(){\n    if(agencyOwner(this.engine.config.sessionIds[0]))return;');
 // Migrate the short-lived all-director guard to a write-side guard; mood interpretation stays live.
 const director=path.join(modules,'dsh-cen-shu-life/lib/life-director.js');
 if(fs.existsSync(director)){
   const before=fs.readFileSync(director,'utf8').replaceAll('\r\n','\n');
   plans.push({dest:director,src:before.replace('if(agencyOwner(sessionId))return this.view();\n ','').replace('if(agencyOwner(d.sessionId))return;','')});
 }
 patch('dsh-cen-shu-life','lib/life-director.js'," if(v.decision==='act'){"," if(v.decision==='act'&&!agencyOwner(d.sessionId)){");
 patch('dsh-cen-shu-life','lib/life-director.js','selectionDue=now-e.state.lastCheck','selectionDue=!agencyOwner(sessionId)&&now-e.state.lastCheck');
 patch('dsh-cen-shu-life','lib/life-director.js','this.record.lastResult={decision:v.decision','this.record.lastResult=agencyOwner(d.sessionId)?{decision:"mood-only",progress:[],intentions:null}:{decision:v.decision');
 patch('dsh-cen-shu-life','lib/timed-events.js','先选择decision=proceed','只描述到来的外部情况和自然感受。岑舒是否行动、想做什么以及是否联系谁，由主动进行在之后决定，不能把自愿行动写成已经发生。先选择decision=proceed');
 patch('dsh-cen-shu-life','lib/engine.js','if(this.director){this.advance(now);return;}','if(this.director||agencyOwner(this.config.sessionIds[0])){this.advance(now);return;}');
 patch('dsh-cen-shu-life','lib/shared-context.js','  notifyInnerState({id})',`  agencyLife(request){
   const id=resolve(request);if(!agencyOwner(id))throw Error('主动控制未绑定');
   const now=engine.now(), c=clock(now,engine.config.timezone);
   if(request.action==='start')return engine.add(request.templateId,{now,id:request.eventId});
   const ev=engine.state.active.find(x=>x.id===request.eventId);
   if(request.action==='end'){if(!ev)throw Error('事件已结束');return engine.end(ev.id,'自然结束',now);}
   if(request.action==='advance'){
     if(!ev||ev.stage!==request.stage)throw Error('阶段已变化');
     const next=ev.stages?.[ev.stage+1];if(!next)throw Error('已是最后阶段');
     ev.stage++;ev.stageText=next.text;engine.publishMoodEvent(ev,'stage',now);engine.changes.append('event-stage',{eventId:ev.id,name:ev.name,stage:ev.stage,stageText:ev.stageText,...engine.observation(ev)},now);engine.persist();return {id:ev.id,stage:ev.stage};
   }
   return {available:engine.allTemplates().filter(t=>engine.eligible(t,c,now)).map(t=>({id:t.id,name:t.name})),ongoing:engine.state.active.map(x=>({id:x.id,name:x.name,stage:x.stage,detail:x.stageText}))};
  },
  notifyInnerState({id})`);
 patch('dsh-cen-shu-life','lib/host.js','const text=latestLifeContext+', "const self=agencyCurrent(engine.home,sid);const text=(self?'\\n【岑舒自己最近选择的活动与念头】'+JSON.stringify({activity:self.activity,thought:self.thought,at:self.at})+'\\n':'')+latestLifeContext+");
 patch('@michengai/dsh-automation','lib/index.js','    const startedAt = toIso();\n    const sessionId = ',"    if(run.trigger==='schedule' && definition.name==='学习' && agencyOwner()){agencySignal('学习提醒',run.id,'已到设定的学习时间，可自行决定是否探索。');await this.runs.update(run.id,current=>({...current,status:'succeeded',finishedAt:toIso(),summary:'机会已交由主动进行，尚未执行学习'}));await this.pruneWorkspaceHistory(run.targetSnapshot.workspaceId);return;}\n    const startedAt = toIso();\n    const sessionId = ");
 patch('dsh-censhu-inner-life','lib/thoughts.js','async tick(force=false){const c=this.c,r=this.record;', 'async tick(force=false){const c=this.c,r=this.record;if(agencyOwner(c.sourceId())&&!force&&!r.proposals?.length)return;');
 for(const file of ['lib/index.js','lib/app.js'])patch('dsh-pet',file,'ctx.provide("petApi7340", { balance: {', 'ctx.provide("petApi7340", { agencySay:async(text)=>{if(!agencyOwner())throw Error("主动进行未接手");const response=await handlePetRoute("/dsh-pet-7340/broadcast?pet=main","POST",JSON.stringify({text}));return response.obj;},balance: {');
 patch('dsh-censhu-inner-life','lib/host.js','core.ingest();void core.interests.tick()', 'core.ingest();if(!agencyOwner(core.sourceId()))void core.interests.tick()');
 patch('dsh-censhu-inner-life','lib/host.js',"ctx.provide('cenShuInnerLife',{version:1,", "ctx.provide('cenShuInnerLife',{version:1,agencyReview:async(part)=>{if(part==='interests')await core.interests.tick();else if(part==='thoughts')await core.thoughts.tick(true);else throw Error('未知审核项');return part==='interests'?core.interests.view():core.thoughts.view();},");
 patch('dsh-cen-shu-life','lib/engine.js','return {...c,thoughts:readThoughts', "const self=agencyCurrent(this.home,this.config.sessionIds[0]);return {...c,...(self?{scheduledActivity:c.activity,activity:self.activity,currentThought:self.thought}:{}),thoughts:readThoughts");
 patch('dsh-cen-shu-life','lib/engine.js',"if(event.forecastExpiresAt&&now>=event.forecastExpiresAt)this.end(event.id,'天气资料已到期',now);","if(event.forecastExpiresAt&&now>=event.forecastExpiresAt)this.end(event.id,'天气资料已到期',now);else if(event.origin==='gemini-4h'&&event.endsAt<=now&&agencyOwner(this.config.sessionIds[0]))this.end(event.id,'到期结束',now);");
 patch('dsh-douyin-browser-local','chat-service.mjs','  startGroupVideos() {','  startGroupVideos() {\n    if(agencyOwner())return;');
 patch('dsh-douyin-browser-local','chat-service.mjs',"if(agencyOwner()){agencySignal('抖音来信',contact.id+':'+incoming.map(x=>x.id).join(','),'会话 '+contact.id+' 有 '+incoming.length+' 条新消息；如需了解内容请读取原会话。');continue;}","if(agencyOwner()){const id=agencySignal('抖音来信',contact.id+':'+incoming.map(x=>x.id).join(','),'会话 '+contact.id+' 有 '+incoming.length+' 条新消息；可读取原会话。');mark.agencyOffer={id,last:incoming.at(-1).id,fingerprint:messageFingerprint(incoming.at(-1))};this.persist();continue;}");
 patch('dsh-douyin-browser-local','chat-service.mjs','          this.qualifyNativeBacklog(contact, mark, snapshot, messages);',`          if(agencyOwner()&&mark.agencyOffer){
            const offer=mark.agencyOffer,order=agencyTakeReply(offer.id);
            if(order){delete mark.agencyOffer;this.persist();
              const last=messages.at(-1);
              if(last?.id!==offer.last||last.sender!=='incoming'||messageFingerprint(last)!==offer.fingerprint){agencySignal('抖音回执',offer.id,'待答已变化，本次未发送');continue;}
              mark.pending={phase:'model',incoming:[last],at:new Date().toISOString()};this.persist();
              try{const result=await this.deliverReply(contact,mark,{text:order.text},messages,signal,snapshot);agencySignal('抖音回执',offer.id,result?.confirmed?'发送已确认 '+result.messageId:'结果待核实');}
              catch(error){agencySignal('抖音回执',offer.id,'审核或发送失败，未确认');throw error;}continue;
            }
          }
          this.qualifyNativeBacklog(contact, mark, snapshot, messages);`);
 patch('dsh-douyin-browser-local','autonomous-watch.mjs','  start({ startSession = true, maxRequests: _legacyMaxRequests } = {}, { explicit = false } = {}) {','  start({ startSession = true, maxRequests: _legacyMaxRequests } = {}, { explicit = false } = {}) {\n    if(agencyOwner())throw Error("主动进行已接管观看选择，请用逐步浏览、观察、补看和互动工具");');
 for(const r of plans){
   const imp="import {owner as agencyOwner,signal as agencySignal,current as agencyCurrent} from './censhu-control.mjs';";
   if(!r.src.includes(imp))r.src=imp+'\n'+r.src;
   if((r.dest.endsWith('chat-service.mjs')||r.dest.endsWith('spark-service.mjs'))&&!r.src.includes('takeReply as agencyTakeReply'))r.src="import {takeReply as agencyTakeReply} from './censhu-control.mjs';\n"+r.src;
   const check=spawnSync(process.execPath,['--input-type=module','--check'],{input:r.src,encoding:'utf8'});if(check.status!==0)throw Error(r.dest+' '+check.stderr);
 }
 for(const {dest,src} of plans){fs.copyFileSync(control,path.join(path.dirname(dest),'censhu-control.mjs'));if(fs.readFileSync(dest,'utf8')===src)continue;if(!fs.existsSync(dest+'.before-agency-control.bak'))fs.copyFileSync(dest,dest+'.before-agency-control.bak');fs.writeFileSync(dest+'.agency-tmp',src);fs.renameSync(dest+'.agency-tmp',dest);}
 const dir=path.join(home,'censhu-agency');fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'control.json.tmp'),JSON.stringify({version:1,sessionId:session,adapters:plans.map(x=>path.relative(modules,x.dest)),hashes:Object.fromEntries(plans.map(x=>[path.relative(modules,x.dest),createHash('sha256').update(fs.readFileSync(x.dest)).digest('hex')])),at:Date.now()}));fs.renameSync(path.join(dir,'control.json.tmp'),path.join(dir,'control.json'));
 return plans.length;
}
