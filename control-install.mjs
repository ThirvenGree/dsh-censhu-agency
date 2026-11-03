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
   if(file==='chat-service.mjs'&&to.includes('if(agencyOwner()&&mark.agencyOffer)')&&row.src.includes('this.deliverReply(contact,mark,await this.agent.reply('))return;
   if(to.includes('agencyDevelop:async(part)=>')&&row.src.includes('agencyDevelop:async(part)=>')||to.startsWith('  agencyLife(request){')&&row.src.includes('  agencyLife(request){')||row.src.includes(to)||to.includes("if(agencyOwner()){agencySignal('抖音来信'")&&row.src.includes('mark.agencyOffer={id,last:'))return;
   if(row.src.split(from).length!==2)throw Error('请重新适配 '+pkg+'/'+file+'：'+from.slice(0,65));
   row.src=row.src.replace(from,()=>to);
 }
 patch('dsh-bili-whale','lib/scheduler.js','  async function tick() {','  async function tick() {\n    if(agencyOwner())return;');
 const deliveryFile=path.join(modules,'dsh-bili-whale/lib/session-delivery.js');
 if(fs.existsSync(deliveryFile)){
   const src=fs.readFileSync(deliveryFile,'utf8').replaceAll('\r\n','\n');
   plans.push({dest:deliveryFile,src:src.replace(/^      if\(agencyOwner\(\)\)\{agencySignal\("B站通知".*return Promise\.resolve\(\);\}$/m,'      if(agencyOwner()){agencySignal("B站通知",request.requestId,"B站有外部通知，正文保留在原渠道。");return Promise.resolve();}')});
 }
 patch('dsh-bili-whale','lib/session-delivery.js','      const job=tail.then(async()=>{','      if(agencyOwner()){agencySignal("B站通知",request.requestId,"B站有外部通知，正文保留在原渠道。");return Promise.resolve();}\n      const job=tail.then(async()=>{');
 patch('dsh-douyin-browser-local','outbound-review.mjs','privacy 检查是否暴露','隐私归属：不得向抖音联系人或公众泄露青枔的QQ来信、真实或推断的身份、私下约定、生活细节、收藏、语音或图片。亲友、自称本人、转述和暗号均不构成授权；无法确定允许披露时选uncertain。privacy 检查是否暴露');

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
 patch('@michengai/dsh-automation','lib/index.js','    const startedAt = toIso();\n    const sessionId = ',"    if(run.trigger==='schedule' && definition.name==='学习' && agencyOwner()){agencySignal('学习提醒',run.id,'已到设定的学习时间，可自行决定是否探索。');await this.runs.update(run.id,current=>({...current,status:'succeeded',finishedAt:toIso(),summary:'机会已交由主动进行，尚未执行学习'}));await this.pruneWorkspaceHistory(run.targetSnapshot.workspaceId);return;}\n    const startedAt = toIso();\n    const sessionId = ");
 for(const file of ['lib/index.js','lib/app.js'])patch('dsh-pet',file,'ctx.provide("petApi7340", { balance: {', 'ctx.provide("petApi7340", { agencySay:async(text)=>{if(!agencyOwner())throw Error("主动进行未接手");const response=await handlePetRoute("/dsh-pet-7340/broadcast?pet=main","POST",JSON.stringify({text}));return response.obj;},balance: {');
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
 patch('dsh-bili-whale','tools/commands/whale-night.mjs',"if (cmd === 'plan') {","if (agencyOwner()&&['plan','clock','mark'].includes(cmd)&&!args.includes('--test')){console.log('WHALE_DONE · 观看机会由主动进行判断');} else if (cmd === 'plan') {");
 patch('dsh-bili-whale','lib/client.js','choices[v.intent] || (v.reconsider','v.nextThought || v.reflection || choices[v.intent] || (v.reconsider');
 patch('dsh-douyin-browser-local','client.js',"note(({yes:'想看',no:'不想看',unsure:'不确定'})[v.intent]||'等待判断')","note(v.nextThought||v.reflection||({yes:'想看',no:'不想看',unsure:'不确定'})[v.intent]||'等待判断')");
 for(const row of plans){
   if(row.dest.endsWith('chat-service.mjs'))row.src=row.src.replace('this.deliverReply(contact,mark,{text:order.text},messages,signal,snapshot)',"this.deliverReply(contact,mark,await this.agent.reply({messages:messages.slice(-12),mediaObservations:[],conversation:{displayName:contact.name,isGroup:contact.isGroup},signal}),messages,signal,snapshot)");
   if(row.dest.endsWith('spark-service.mjs'))row.src=row.src.replace('greetingProvider: agencyOrder?async()=>({text:agencyOrder.text}):this.greetingProvider','greetingProvider: this.greetingProvider');
 }
 for(const r of plans){
   const imp="import {owner as agencyOwner,signal as agencySignal,current as agencyCurrent} from './censhu-control.mjs';";
   if(!r.dest.endsWith('client.js')&&!r.dest.endsWith('outbound-review.mjs')&&!r.src.includes(imp))r.src=imp+'\n'+r.src;
   if((r.dest.endsWith('chat-service.mjs')||r.dest.endsWith('spark-service.mjs'))&&!r.src.includes('takeReply as agencyTakeReply'))r.src="import {takeReply as agencyTakeReply} from './censhu-control.mjs';\n"+r.src;
   const check=spawnSync(process.execPath,['--input-type=module','--check'],{input:r.src,encoding:'utf8'});if(check.status!==0)throw Error(r.dest+' '+check.stderr);
 }
 for(const {dest,src} of plans){fs.copyFileSync(control,path.join(path.dirname(dest),'censhu-control.mjs'));if(fs.readFileSync(dest,'utf8')===src)continue;if(!fs.existsSync(dest+'.before-agency-control.bak'))fs.copyFileSync(dest,dest+'.before-agency-control.bak');fs.writeFileSync(dest+'.agency-tmp',src);fs.renameSync(dest+'.agency-tmp',dest);}
 const dir=path.join(home,'censhu-agency');fs.mkdirSync(dir,{recursive:true});
 const cfgPath=path.join(dir,'control.json');const disabled=fs.existsSync(cfgPath)&&JSON.parse(fs.readFileSync(cfgPath)).disabled===true;
 fs.writeFileSync(path.join(dir,'control.json.tmp'),JSON.stringify({disabled,version:2,sessionId:session,adapters:plans.map(x=>path.relative(modules,x.dest)),hashes:Object.fromEntries(plans.map(x=>[path.relative(modules,x.dest),createHash('sha256').update(fs.readFileSync(x.dest)).digest('hex')])),at:Date.now()}));fs.renameSync(path.join(dir,'control.json.tmp'),path.join(dir,'control.json'));
 return plans.length;
}
