window.__ModuleLoader__.load({id:'dsh-censhu-agency',factory(require){
 const R=require('react'), h=R.createElement;
 const css=`
 .csa{--line:color-mix(in srgb,currentColor 16%,transparent);max-width:960px;margin:auto;padding:clamp(12px,3vw,28px);line-height:1.65;color:inherit}
 .csa header,.csa article{padding:16px 20px;border:1px solid var(--line);border-radius:16px}
 .csa header{background:linear-gradient(120deg,#639c901e,#999ac916);display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
 .csa h2,.csa h3,.csa p{margin:3px 0}.csa small,.csa time{opacity:.72}.csa button{border:1px solid var(--line);border-radius:20px;padding:6px 14px;background:transparent;color:inherit;cursor:pointer}
 .csa .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(210px,100%),1fr));gap:10px;margin:12px 0}
 .csa .section{margin-top:14px}.csa details{border-top:1px solid var(--line);padding:8px 0}.csa summary{cursor:pointer}.csa .detail{white-space:pre-wrap;overflow-wrap:anywhere}.csa .error{border-left:3px solid #be754a;padding-left:9px}
 `;
 const when=t=>t?new Date(t).toLocaleTimeString('zh-CN'):'暂无记录';
 function Page(){
   const [data,set]=R.useState(null),[error,fail]=R.useState(''),refresh=R.useRef(null);
   R.useEffect(()=>{
     let live=true,busy=false;
     async function load(){if(document.hidden||busy)return;busy=true;try{
       const r=await fetch('/censhu-agency/state',{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);
       const d=await r.json();
       try{const links=await fetch('/dsh-plugin-links/state',{cache:'no-store'});if(links.ok)d.links=(await links.json()).rows?.find(x=>x.id==='dsh-censhu-agency');}catch{}
       if(live){set(d);fail('');}
     }catch(e){if(live)fail(String(e));}finally{busy=false;}}
     refresh.current=load;load();const timer=setInterval(load,8000);
     document.addEventListener('visibilitychange',load);window.addEventListener('focus',load);
     return()=>{live=false;clearInterval(timer);document.removeEventListener('visibilitychange',load);window.removeEventListener('focus',load);};
   },[]);
   const card=(title,value,caption)=>h('article',{key:title},h('small',null,title),h('h3',null,value),h('p',null,caption));
   return h('section',{className:'csa'},h('style',null,css),
     h('header',null,h('div',null,h('small',null,'岑舒 · 自主行动'),h('h2',null,'主动进行'),h('p',{'aria-live':'polite'},error||data?.status||'正在读取…')),h('button',{type:'button',onClick:()=>refresh.current?.()},'刷新状态')),
     h('div',{className:'grid'},card('处境整理','Gemini',data?.geminiRetryAt>Date.now()?'暂缓重试至 '+when(data.geminiRetryAt):'最近成功 · '+when(data?.geminiAt)),card('选择与行动',data?.mainModel||'等待模型记录','由绑定会话判断、调用工具并调整打算'),card('下次自然空当',data?.nextConsiderAt?when(data.nextConsiderAt):'跟随生活节奏','生活变化或自己的提醒可以提前唤起')),
     h('article',null,h('h3',null,'动态节奏与插件联动'),
     h('p',null,data?.rhythm?data.rhythm.source+' · 合并变化 '+data.rhythm.mergeSeconds+' 秒 · 下次自然空当 '+when(data.rhythm.nextNaturalAt):'等待读取节奏'),
     ...[['受到的影响',data?.links?.incoming,'fromLabel'],['正在影响',data?.links?.outgoing,'toLabel']].map(([title,rows,key])=>h('details',{key:title},h('summary',null,title+' · '+(rows?.length??'待核实')), ...(rows||[]).map((x,i)=>h('p',{key:i},x[key]+' · '+x.status+' · '+x.detail)))),
     h('p',null,'操作展示 · '+(data?.displayBinding?.display||'等待独处会话绑定')),data?.pending?h('p',null,'正在核对投递 · '+data.pending.phase):null,h('p',null,'生活事件、观看感受、独处兴趣和心情进入处境。岑舒可以调整生活意向，或使用主会话的工具。'),h('small',null,'最近读取生活接口 · '+when(data?.inputAt)+'　记忆 · '+(data?.memoryRead?data.memoryRead.count+' 条（'+when(data.memoryRead.at)+'）':'等待实际读取'))),
     h('details',{className:'section'},h('summary',null,'已安装插件的后台入口检查 · '+(data?.scopeAudit?.rows?.length??0)+' 项'),h('p',null,'最近扫描：'+(data?.scopeAudit?.at?new Date(data.scopeAudit.at).toLocaleString():'尚无记录')+'。清单反映安装包源码；运行中的适配状态请看下方检查。'),...(data?.scopeAudit?.rows||[]).map(r=>h('details',{key:r.id},h('summary',null,r.id+' · '+r.kind+' · '+r.status),h('p',null,'可定位的判断枚举 '+(r.choiceSites?.length||0)+' 处。数量只反映本次源码匹配。'),...(r.choiceSites||[]).map((x,i)=>h('p',{key:i},x.file+' · '+x.line+' · '+x.contract))))),
     h('article',{className:'section'},h('h3',null,'正在做什么'),h('p',null,data?.current?.activity||'尚未记录当前选择'),h('p',null,data?.current?.thought||''),h('small',null,'集中行动适配 · '+(data?.control?.length||0)+' 个入口文件'),h('details',null,h('summary',null,'查看适配检查'),...(data?.adapterAudit?.rows||[]).map(r=>h('p',{key:r.name},(r.ok?'已核对':'需要重新接入')+' · '+r.name)))),
     h('article',{className:'section'},h('h3',null,'还挂念的事'),...(data?.notes?.length?data.notes.map(n=>h('p',{key:n.id},n.text,n.eventId?' · '+n.eventId+' / '+(n.when==='event-end'?'结束':'阶段推进'):'',n.resume?' · 接下来：'+n.resume:'',n.deliveredAt?' · 已交还 '+when(n.deliveredAt):'',n.due?' · '+when(n.due):'')):[h('p',{key:'empty'},'目前没有留待稍后处理的事。')])),
     h('article',{className:'section'},h('h3',null,'行动记录'),...(data?.history||[]).map((x,i)=>h('details',{key:[x.at,x.run,x.type,i].join('-'),className:/报错|异常|未取得/.test(x.type)?'error':''},h('summary',null,h('time',null,when(x.at)),'　',x.type),h('p',{className:'detail'},x.detail))),h('small',null,'页面可见时自动更新 · '+when(data?.at))));
 }
 return {inject:['slots'],apply(ctx){const s=ctx.get('slots');s.inject('settings.section',()=>s.register({name:'settings.section',id:'censhu-agency',order:55,label:()=>'主动进行'},Page));}};
}});
