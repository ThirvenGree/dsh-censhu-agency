import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
export const dayOf=now=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(now);
export function reserveContact(home,id,run,now=Date.now(),minutes=60){
 const dir=path.join(home,'characters/censhu'),file=path.join(dir,'initiative.json'),lock=path.join(dir,'initiative.lock');
 const binding=JSON.parse(fs.readFileSync(path.join(dir,'integration.json'),'utf8'));
 if(!id||binding.sessionId!==id)throw Error('当前角色未绑定');
 const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',hourCycle:'h23'}).format(now));
 if(hour>=2&&hour<6)throw Error('主动休息时段');
 const fd=fs.openSync(lock,'wx');try{
  const prior=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
  if(prior.agencyRun===run)throw Error('本次联系已交接，不重复执行');
  if(now-Number(prior.at||0)<Math.max(60,Number(minutes)||60)*60000)throw Error('共同主动冷却中');
  const tmp=file+'.'+randomUUID()+'.tmp';fs.writeFileSync(tmp,JSON.stringify({...prior,at:now,source:'censhu-agency',agencyRun:run}));fs.renameSync(tmp,file);
 }finally{fs.closeSync(fd);fs.unlinkSync(lock);}
}
