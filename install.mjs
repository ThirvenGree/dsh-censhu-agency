import {installControl} from './control-install.mjs';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),name='dsh-censhu-agency';
const profile=path.join(process.env.DSH_HOME||path.join(os.homedir(),'.dsh'),'profiles/desktop');
const file=path.join(profile,'package.json'),pkg=JSON.parse(fs.readFileSync(file));
for(const [pkg,file,marker] of [['dsh-cen-shu-life','shared-context.js','agencyLife(request)'],['dsh-censhu-inner-life','host.js','agencyProtocol:1']]){
 const src=fs.readFileSync(path.join(profile,'node_modules',pkg,'lib',file),'utf8');if(!src.includes(marker))throw Error('请先安装提供原生主动接口的 '+pkg);
}
const link=path.join(profile,'node_modules',name);
if(fs.existsSync(link)&&fs.realpathSync(link)!==fs.realpathSync(root))throw Error('已有其他安装来源');
if(!fs.existsSync(link))fs.symlinkSync(root,link,'junction');
if(!fs.existsSync(file+'.before-agency.bak'))fs.copyFileSync(file,file+'.before-agency.bak');
pkg.dependencies[name]='link:'+root.replaceAll('\\','/');const bundles=pkg.dsh.profile.bundles;
if(!bundles.includes(name))bundles.push(name);
fs.writeFileSync(file+'.agency.tmp',JSON.stringify(pkg,null,2));fs.renameSync(file+'.agency.tmp',file);

console.log('集中行动适配',installControl(profile));
