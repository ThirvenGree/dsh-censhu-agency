import {installControl} from './control-install.mjs';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),name='dsh-censhu-agency';
const profile=path.join(process.env.DSH_HOME||path.join(os.homedir(),'.dsh'),'profiles/desktop');
const file=path.join(profile,'package.json'),pkg=JSON.parse(fs.readFileSync(file));
for(const [pkg,min,checks] of [
 ['dsh-cen-shu-life','1.31.1',{'shared-context.js':['agencyLife(request)','agencyPlan(request)','searchEvents(','eventPage(','agencyConversation(']}],
 ['dsh-censhu-inner-life','0.16.0',{'host.js':['agencyProtocol:2','claimAgencyActionTurn:','registerAgencyWorker:','agencyDevelop:','agencyReview:','receiveAgencyDiary:',"name:'censhu_question_recall'"]}]
]){
 const base=path.join(profile,'node_modules',pkg),ver=JSON.parse(fs.readFileSync(path.join(base,'package.json'))).version;
 const v=ver.split('.').map(Number),m=min.split('.').map(Number);const diff=v.findIndex((x,k)=>x!==m[k]);
 if(!/^\d+\.\d+\.\d+$/.test(ver)||v[0]!==m[0]||diff>=0&&v[diff]<m[diff])throw Error(pkg+' 已安装 '+ver+'，需要同主版本且至少 '+min);
 for(const [file,markers] of Object.entries(checks)){const src=fs.readFileSync(path.join(base,'lib',file),'utf8');for(const marker of markers)if(!src.includes(marker))throw Error(pkg+' '+ver+' 缺少接口 '+marker);}
 const normalize=file=>fs.readFileSync(file,'utf8').replaceAll('\r\n','\n');if(normalize(path.join(base,'lib/censhu-control.mjs'))!==normalize(path.join(root,'control.mjs')))throw Error(pkg+' 接管协议内容不匹配');
 console.log(pkg,ver,'所需接口和接管协议已核对');
}
const link=path.join(profile,'node_modules',name);
if(fs.existsSync(link)&&fs.realpathSync(link)!==fs.realpathSync(root))throw Error('已有其他安装来源');
if(!fs.existsSync(link))fs.symlinkSync(root,link,'junction');
if(!fs.existsSync(file+'.before-agency.bak'))fs.copyFileSync(file,file+'.before-agency.bak');
pkg.dependencies[name]='link:'+root.replaceAll('\\','/');const bundles=pkg.dsh.profile.bundles;
if(!bundles.includes(name))bundles.push(name);
fs.writeFileSync(file+'.agency.tmp',JSON.stringify(pkg,null,2));fs.renameSync(file+'.agency.tmp',file);

console.log('集中行动适配',installControl(profile));
