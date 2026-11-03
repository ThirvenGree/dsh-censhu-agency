import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export async function verifySent(session,id,{root=process.env.QQ_BRIDGE_ROOT||path.join(os.homedir(),'OneDrive','文档','Playground','qq-bridge'),request=fetch}={}){
 if(!/^-?\d+$/.test(String(id))||!Number.isSafeInteger(Number(id)))return false;
 const load=async file=>JSON.parse(await fs.readFile(path.join(root,file),'utf8'));
 const sessions=(await load('state/sessions.json')).sessions;
 const binding=Object.entries(sessions).find(([k,v])=>/^private:\d+$/.test(k)&&String(v).replace(/^session-/,'')===String(session).replace(/^session-/,''))?.[0];
 if(!binding)return false;
 const {httpUrl,accessToken}=(await load('config.json')).snowluma;
 const base=new URL(httpUrl);
 if(!['127.0.0.1','localhost','[::1]'].includes(base.hostname)||!['http:','https:'].includes(base.protocol))return false;
 const action=async(name,args)=>{
   const r=await request(new URL('/'+name,base),{method:'POST',redirect:'error',signal:AbortSignal.timeout(3500),headers:{'content-type':'application/json',authorization:'Bearer '+accessToken},body:JSON.stringify(args)});
   if(!r.ok)return null;
   const body=await r.json();return body.status==='ok'&&body.retcode===0?body.data:null;
 };
 const [login,m]=await Promise.all([action('get_login_info',{}),action('get_msg',{message_id:Number(id)})]);
 return !!login?.user_id&&m?.message_type==='private'&&String(m.message_id)===String(id)&&String(m.sender?.user_id)===String(login.user_id)&&String(m.target_id)===binding.slice(8);
}
