import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
const home=process.env.DSH_HOME||path.join(os.homedir(),'.dsh'),dir=path.join(home,'censhu-agency');
const profile=path.join(home,'profiles/desktop'),modules=path.join(profile,'node_modules');
const registration=path.join(dir,'control.json'),lease=path.join(dir,'owner.json');
function write(file,bytes){const tmp=file+'.'+randomUUID()+'.tmp';fs.writeFileSync(tmp,bytes);fs.renameSync(tmp,file);}
const command=process.argv[2]||'--check';
if(!['--release','--restore','--check','--enable'].includes(command))throw Error('使用 --check、--release、--restore 或 --enable');
const cfg=JSON.parse(fs.readFileSync(registration));
if(command!=='--check'){
 write(registration,JSON.stringify({...cfg,disabled:command!=='--enable'}));
 write(lease,JSON.stringify({until:0}));
}
if(command==='--check'||command==='--restore'){
 const changes=[];
 for(const [name,hash] of Object.entries(cfg.hashes||{})){
   const file=path.resolve(modules,name);
   if(!file.startsWith(modules+path.sep))throw Error('适配路径越界');
   const backup=file+'.before-agency-control.bak';
   const live=fs.readFileSync(file);
   const original=fs.readFileSync(backup);
   if(live.equals(original))continue;
   if(createHash('sha256').update(live).digest('hex')!==hash){
     // Both settings pages are also decorated by the links plugin; reverse only our rendering expression.
     const expr=name.replaceAll('\\','/').endsWith('dsh-bili-whale/lib/client.js')?'v.nextThought || v.reflection || choices[v.intent]':name.replaceAll('\\','/').endsWith('dsh-douyin-browser-local/client.js')?"note(v.nextThought||v.reflection||({yes:":null;
     if(!expr||live.toString().split(expr).length!==2)throw Error('第三方文件已另有更新，已停止还原：'+name);
     const replacement=expr.startsWith('note')?'note(({yes:':'choices[v.intent]';
     changes.push({file,live,original:Buffer.from(live.toString().replace(expr,replacement))});
   }else changes.push({file,live,original});
 }
 if(command==='--restore'){
   const manifest=path.join(profile,'package.json'),bytes=fs.readFileSync(manifest),pkg=JSON.parse(bytes);
   delete pkg.dependencies['dsh-censhu-agency'];pkg.dsh.profile.bundles=pkg.dsh.profile.bundles.filter(n=>n!=='dsh-censhu-agency');
   changes.push({file:manifest,live:bytes,original:Buffer.from(JSON.stringify(pkg,null,2))});
   const done=[];try{for(const c of changes){write(c.file,c.original);done.push(c);}}catch(e){for(const c of done.reverse())write(c.file,c.live);throw e;}
 }
 console.log(command,changes.length,'个文件已核对');
}else console.log(command==='--release'?'接管已解除':'接管已允许，等待宿主续租');
