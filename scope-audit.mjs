import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const home=process.env.DSH_HOME||path.join(os.homedir(),'.dsh'), profile=path.join(home,'profiles/desktop');
const groups=[
 ['主观选择入口','dsh-censhu-agency'],
 ['交付机会或执行工具','dsh-censhu-inner-life dsh-cen-shu-life dsh-speak-up dsh-bili-whale dsh-douyin-browser-local dsh-pet @michengai/dsh-automation'],
 ['读取处境、维护记忆或审核','@openviking/dsh-memory-plugin dsh-cosplay dsh-memory-evolve dsh-feiyu-mood @furongjun1999/dsh-memory @kenz1117/dsh-engram dsh-mnemon dsh-context dsh-plugin-links'],
 ['由用户或已有任务调用','dshmarket redfox-community-dsh @wxg-prc-cpg/browser-skill-dsh-plugin dsh-meme qq-mode-console qq-agent-presets dsh-web-search-custom dsh-browser-router dsh-better-sidebar dsh-elevenlabs-voice'],
 ['宿主、编排和基础设施','@deepseek-ai/dsh-base @deepseek-ai/dsh-web-app billion-context @deepseek-ai/dsh-experimental-auto-review @deepseek-ai/dsh-experimental-agent-team-profile @deepseek-ai/dsh-experimental-terminal-bundle dsh-collaborative-compaction']
];
const known=new Map(groups.flatMap(([label,s])=>s.split(' ').map(id=>[id,label])));
const roots=[path.join(profile,'node_modules'),...(process.env.DSH_BUNDLED_MODULES?[process.env.DSH_BUNDLED_MODULES]:[])];
const rows=[];
for(const id of JSON.parse(fs.readFileSync(path.join(profile,'package.json'))).dsh.profile.bundles){
 const base=roots.map(r=>path.join(r,id)).find(r=>fs.existsSync(path.join(r,'package.json')));
 if(!base){rows.push({id,status:'未读取安装包',kind:known.get(id)||'待审查'});continue;}
 const pkg=JSON.parse(fs.readFileSync(path.join(base,'package.json')));
 const scanned=[],signals=new Set(),visited=new Set();
 function scan(dir){
   const abs=fs.realpathSync(dir);if(visited.has(abs))return;visited.add(abs);
   for(const item of fs.readdirSync(dir,{withFileTypes:true})){
     const file=path.join(dir,item.name);
     if(item.isDirectory()&&!/^(?:node_modules|test[s]?|fixtures|vendor|runtime|assets|coverage|dist-electron|\.git)$/i.test(item.name))scan(file);
     if(!item.isFile()||!(/\.(?:[mc]?js|ts|ya?ml)$/i.test(item.name))||/\.test\.|\.d\.ts$|^test[-.]|\.min\.js$/.test(item.name))continue;
     const src=fs.readFileSync(file,'utf8');scanned.push(path.relative(base,file));
     for(const [name,re] of [['定时',/setInterval\(|ctx\.interval\(|scheduleNext\(/],['发起回合',/\.followup\(|sessionController\.prompt\(/],['随机或评分',/Math\.random\(|minScore|skipChance/],['模型调用',/googleStructured\(|\.judge\(|\.generate\(/]])if(re.test(src))signals.add(name);
   }
 }
 scan(base);rows.push({id,version:pkg.version,files:scanned.length,signals:[...signals],kind:known.get(id)||'待审查',status:scanned.length?'已扫描':'未找到入口'});
}
const result={at:new Date().toISOString(),rows};if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2));
for(const r of rows)console.log(r.id,r.files||0,r.status,r.kind,(r.signals||[]).join('/'));
