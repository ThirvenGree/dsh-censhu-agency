import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export function installPlanningAdapter(profile){
 const lib=path.join(profile,'node_modules/dsh-censhu-inner-life/lib');
 const target=path.join(lib,'planning-context.js');
 if(!fs.existsSync(target))return '独处插件未安装';
 const source=fs.readFileSync(target,'utf8');
 const marker="import {agencyPlans} from './agency-plans.js';";
 const anchor='personality:core.personality.active()';
 if(!source.includes(marker)&&!source.includes('})), '+anchor)&&!source.includes('})),'+anchor))throw Error('独处规划接口结构变化，未安装联动');
 fs.copyFileSync(fileURLToPath(new URL('./agency-plans.js',import.meta.url)),path.join(lib,'agency-plans.js'));
 if(!source.includes(marker)){
   if(!fs.existsSync(target+'.before-agency.bak'))fs.copyFileSync(target,target+'.before-agency.bak');
   const adapted=source.replace(/\}\)\),\s*personality:core\.personality\.active\(\)/,'})).concat(agencyPlans(core.dir,sessionId,now)),personality:core.personality.active()');
   if(adapted===source)throw Error('独处规划适配未应用');
   fs.writeFileSync(target+'.agency.tmp',marker+'\n'+adapted);fs.renameSync(target+'.agency.tmp',target);
 }
 const host=path.join(lib,'host.js');
 const bridgeImport="import {agencyDisplay,receiveDiary,tickWithAgency} from './inner-agency.js';";
 const original=fs.readFileSync(host,'utf8');
 if(!original.includes(bridgeImport)){
   const edits=[
     ['  const originalSave=core.save.bind(core);','  const nativeTick=core.tick.bind(core);core.tick=(args)=>tickWithAgency(core,nativeTick,args);\n  const originalSave=core.save.bind(core);'],
     original.includes('[...journal.rows,...core.browseTimeline.rows]')?
       ['[...journal.rows,...core.browseTimeline.rows]','[...journal.rows,...core.browseTimeline.rows,...agencyDisplay(dir,core.sourceId())]']:
       ['core.view(),journal.rows);','core.view(),[...journal.rows,...agencyDisplay(dir,core.sourceId())]);'],
     ["ctx.provide('cenShuInnerLife',{version:1,","ctx.provide('cenShuInnerLife',{version:1,receiveAgencyDiary:request=>receiveDiary(core,request),"]
   ];
   let updated=original;
   for(const [from,to] of edits){if(updated.split(from).length!==2)throw Error('独处行动适配不兼容');updated=updated.replace(from,to);}
   fs.copyFileSync(fileURLToPath(new URL('./inner-agency.js',import.meta.url)),path.join(lib,'inner-agency.js'));
   if(!fs.existsSync(host+'.before-agency.bak'))fs.copyFileSync(host,host+'.before-agency.bak');
   fs.writeFileSync(host+'.agency.tmp',bridgeImport+'\n'+updated);fs.renameSync(host+'.agency.tmp',host);
 }else fs.copyFileSync(fileURLToPath(new URL('./inner-agency.js',import.meta.url)),path.join(lib,'inner-agency.js'));
 return '独处行动、审核、记忆和原生会话展示已接入';
}
