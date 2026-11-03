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
 return '独处规划已接入';
}
