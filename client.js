window.__ModuleLoader__.load({id:'dsh-censhu-agency',factory(require){
 const R=require('react'), h=R.createElement;
 const css=`
 .csa{--paper:#eef1ee;--card:#fbfcfa;--field:#f5f7f5;--ink:#1e2a27;--ink-2:#3b4945;--muted:#66746f;--rule:#d9e0dc;--rule-2:#c4cec9;--warn:#7a5810;--warn-soft:#f5edd6;--danger:#983a38;--danger-soft:#f5e3e0;--accent:#9b3a51;--on-accent:#fff;
  --accent-soft:color-mix(in srgb,var(--accent) 10%,var(--card));--display:"FangSong","STFangsong","FangSong_GB2312","仿宋","Noto Serif SC","Noto Serif CJK SC","Songti SC",serif;
  --sans:"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC","Noto Sans CJK SC",system-ui,sans-serif;
  max-width:980px;margin:auto;padding:clamp(14px,3vw,30px) clamp(14px,3vw,30px) 30px;background:var(--paper);color:var(--ink);border-radius:16px;font:14px/1.7 var(--sans);font-variant-numeric:tabular-nums;color-scheme:light}
 [data-ds-dark-theme] .csa{--paper:#121715;--card:#1a201e;--field:#151b19;--ink:#dce5e1;--ink-2:#bccac4;--muted:#8a9893;--rule:#2b3532;--rule-2:#3b4743;--warn:#e2c27c;--warn-soft:#2e291b;--danger:#eda69c;--danger-soft:#36221f;--accent:#e48fa3;--on-accent:#0f1513;color-scheme:dark}
 @media(prefers-color-scheme:dark){:root:not([data-ds-theme-source]) .csa{--paper:#121715;--card:#1a201e;--field:#151b19;--ink:#dce5e1;--ink-2:#bccac4;--muted:#8a9893;--rule:#2b3532;--rule-2:#3b4743;--warn:#e2c27c;--warn-soft:#2e291b;--danger:#eda69c;--danger-soft:#36221f;--accent:#e48fa3;--on-accent:#0f1513;color-scheme:dark}}
 .csa *{box-sizing:border-box}.csa h1,.csa h2,.csa h3,.csa p{margin:0}
 .csa h1{font:400 clamp(26px,3.4vw,35px)/1.3 var(--display);letter-spacing:.04em}
 .csa h3{font-size:14.5px;font-weight:600;line-height:1.5;margin-bottom:6px}
 .csa p{margin:6px 0;color:var(--ink-2);overflow-wrap:anywhere}.csa small,.csa time{font-size:12px;color:var(--muted)}
 .csa button{font:inherit;cursor:pointer;border:1px solid var(--rule-2);background:var(--card);color:var(--ink);border-radius:8px;padding:7px 14px;line-height:1.5;margin-top:8px}
 .csa button:hover:not(:disabled){border-color:var(--accent)}.csa button:disabled{opacity:.5;cursor:not-allowed}
 .csa :focus-visible{outline:2px solid var(--accent);outline-offset:2px}
 .csa .hero{position:relative;margin:40px 12px 26px 0;padding:24px 28px 22px 60px;background:var(--card);border:1px solid var(--rule);border-top:3px solid var(--accent);border-radius:0 6px 6px 6px;
  box-shadow:6px 6px 0 -1px var(--card),6px 6px 0 0 var(--rule-2),12px 12px 0 -1px var(--card),12px 12px 0 0 var(--rule)}
 .csa .hero::before{content:'';position:absolute;left:23px;top:50%;width:13px;height:13px;margin-top:-6px;border-radius:50%;background:var(--paper);box-shadow:inset 0 1px 2px rgba(0,0,0,.22)}
 .csa .hero-tab{position:absolute;left:-1px;bottom:100%;padding:6px 16px 5px;background:var(--accent);color:var(--on-accent);border-radius:6px 6px 0 0;font-size:13px;font-weight:600;letter-spacing:.06em;white-space:nowrap}
 .csa .hero-body{display:flex;justify-content:space-between;align-items:flex-start;gap:12px 24px;flex-wrap:wrap}
 .csa .hero-body>div:first-child{flex:1 1 320px;min-width:0}.csa .hero p{font-size:15px;margin-top:10px}.csa .hero button{margin:0}
 .csa .hero .is-error{color:var(--danger)}
 .csa .metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(210px,100%),1fr));gap:12px;margin-bottom:14px}
 .csa .metric,.csa .card{background:var(--card);border:1px solid var(--rule);border-radius:12px;min-width:0}
 .csa .metric{padding:16px 18px}.csa .metric small{display:block}.csa .metric-value{font-size:19px;font-weight:600;line-height:1.35;margin:6px 0 2px;color:var(--ink);overflow-wrap:anywhere}
 .csa .card{padding:20px 22px;margin-bottom:14px}
 .csa .pre{white-space:pre-line}
 .csa details{margin:2px 0}
 .csa summary{cursor:pointer;list-style:none;color:var(--muted);font-size:13px;padding:6px 0;display:flex;align-items:center;gap:9px;max-width:100%}
 .csa summary::-webkit-details-marker{display:none}
 .csa summary::before{content:'';flex:none;width:6px;height:6px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(-45deg);transition:transform .15s}
 .csa details[open]>summary::before{transform:rotate(45deg)}.csa summary:hover{color:var(--ink)}
 .csa .card>details{border-top:1px solid var(--rule);padding:4px 0}
 .csa details.fold>summary{color:var(--ink);font-size:14.5px;font-weight:600}
 .csa details.fold>p{margin-left:15px}.csa details.fold details{margin-left:15px}
 .csa .note{padding:12px 0;border-top:1px solid var(--rule)}.csa .note:first-of-type{border-top:0;padding-top:2px}
 .csa .note strong{font-weight:600;color:var(--ink)}.csa .note small{font-size:12.5px}
 .csa .log{border-top:1px solid var(--rule);padding:2px 0}.csa .log:first-of-type{border-top:0}
 .csa .log summary{color:var(--ink);font-size:13.5px}.csa .log summary time{min-width:64px}
 .csa .log.error summary{color:var(--danger)}.csa .log.error summary time{color:inherit;opacity:.8}
 .csa .detail{white-space:pre-wrap;overflow-wrap:anywhere;margin:2px 0 10px 15px;padding:10px 14px;background:var(--field);border-radius:8px;font-size:13px}
 .csa .foot{display:block;margin-top:12px}
 @media(max-width:600px){.csa{border-radius:0}.csa .hero{padding:20px 18px 18px 40px}.csa .hero::before{left:14px;width:11px;height:11px}.csa .card{padding:16px}}
 @media(prefers-reduced-motion:reduce){.csa *{transition:none!important}}
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
   const card=(title,value,caption)=>h('article',{key:title,className:'metric'},h('small',null,title),h('div',{className:'metric-value'},value),h('small',null,caption));
   return h('section',{className:'csa'},h('style',null,css),
     h('header',{className:'hero'},h('div',{className:'hero-tab'},'岑舒 · 自主行动'),h('div',{className:'hero-body'},h('div',null,h('h1',null,'主动进行'),h('p',{'aria-live':'polite',className:error?'is-error':undefined},error||data?.status||'正在读取…')),h('button',{type:'button',onClick:()=>refresh.current?.()},'刷新状态'))),
     h('div',{className:'metrics'},card('处境整理','Gemini',data?.geminiRetryAt>Date.now()?'暂缓重试至 '+when(data.geminiRetryAt):'最近成功 · '+when(data?.geminiAt)),card('选择与行动',data?.mainModel||'等待模型记录','由绑定会话判断、调用工具并调整打算'),card('下次自然空当',data?.nextConsiderAt?when(data.nextConsiderAt):'跟随生活节奏','生活变化或自己的提醒可以提前唤起')),
     h('article',{className:'card'},h('h3',null,'本轮共用上下文预算'),h('p',{className:'pre'},(data?.contextBudgets||[]).map(b=>b.detail).join('\n\n')||'等候首次组装。Gemini 按每轮话题分配生活、独处与主动进行的份额。')),
     h('article',{className:'card'},h('h3',null,'主动行动与接管'),h('p',null,'主会话问题回忆 · '+(data?.interfaces?.recall===true?'工具已注册':data?.interfaces?.recall===false?'未发现接口':'等待绑定会话载入')),h('p',null,data?.ownership?.registered?(data.ownership.enabled?'已接管，允许主动行动':'已接管，主动行动暂停'):'未接管，原入口按各自设置运行'),h('p',null,'关闭主动总开关只暂停岑舒主动行动。退出接管才让原定时器接手；宿主停止续租后，运行租约最多保留90秒。'),h('button',{type:'button',disabled:!data?.csrf,onClick:async()=>{try{const r=await fetch('/censhu-agency/'+(data.ownership.registered?'release':'enable'),{method:'POST',headers:{'x-censhu-csrf':data.csrf}});if(!r.ok)throw Error('HTTP '+r.status);await refresh.current?.();}catch(e){fail(String(e));}}},data?.ownership?.registered?'退出接管，恢复原入口':'重新接管')),
     h('article',{className:'card'},h('h3',null,'动态节奏与插件联动'),
     h('p',null,data?.rhythm?data.rhythm.source+' · 合并变化 '+data.rhythm.mergeSeconds+' 秒 · 下次自然空当 '+when(data.rhythm.nextNaturalAt):'等待读取节奏'),
     ...[['受到的影响',data?.links?.incoming,'fromLabel'],['正在影响',data?.links?.outgoing,'toLabel']].map(([title,rows,key])=>h('details',{key:title},h('summary',null,title+' · '+(rows?.length??'待核实')), ...(rows||[]).map((x,i)=>h('p',{key:i},x[key]+' · '+x.status+' · '+x.detail)))),
     h('p',null,'生活与行动会话 · '+(data?.displayBinding?.display||'等待绑定岑舒的生活')),data?.pending?h('p',null,'正在核对投递 · '+data.pending.phase):null,h('p',null,'生活事件、观看感受、独处兴趣和心情进入处境。岑舒在自己的生活会话里作选择、使用工具。决定直接联系青枔时才交给 QQ 会话。'),h('small',{className:'foot'},'最近读取生活接口 · '+when(data?.inputAt)+'　记忆 · '+(data?.memoryRead?data.memoryRead.count+' 条（'+when(data.memoryRead.at)+'）':'等待实际读取'))),
     h('details',{className:'card fold'},h('summary',null,'已安装插件的后台入口检查 · '+(data?.scopeAudit?.rows?.length??0)+' 项'),h('p',null,'最近扫描：'+(data?.scopeAudit?.at?new Date(data.scopeAudit.at).toLocaleString():'尚无记录')+'。清单反映安装包源码；运行中的适配状态请看下方检查。'),...(data?.scopeAudit?.rows||[]).map(r=>h('details',{key:r.id},h('summary',null,r.id+' · '+r.kind+' · '+r.status),h('p',null,'可定位的判断枚举 '+(r.choiceSites?.length||0)+' 处。数量只反映本次源码匹配。'),...(r.choiceSites||[]).map((x,i)=>h('p',{key:i},x.file+' · '+x.line+' · '+x.contract))))),
     h('article',{className:'card'},h('h3',null,'正在做什么'),h('p',null,data?.current?.activity||'尚未记录当前选择'),h('p',null,data?.current?.thought||''),h('small',{className:'foot'},'集中行动适配 · '+(data?.control?.length||0)+' 个入口文件'),h('details',null,h('summary',null,'查看适配检查'),...(data?.adapterAudit?.rows||[]).map(r=>h('p',{key:r.name},(r.ok?'已核对':'需要重新接入')+' · '+r.name)))),
     h('article',{className:'card'},h('h3',null,'还挂念的事'),...(data?.notes?.length?data.notes.map(n=>h('p',{key:n.id,className:'note'},h('strong',null,n.text),h('small',null,n.triggerCue?' · 再考虑的情境：'+n.triggerCue:'',n.cancelWhen?' · 放下条件：'+n.cancelWhen:'',n.eventId?' · '+n.eventId+' / '+(n.when==='event-end'?'结束':'阶段推进'):'',n.resume?' · 接下来：'+n.resume:'',n.deliveredAt?' · 已交还 '+when(n.deliveredAt):'',n.due?' · '+when(n.due):''))):[h('p',{key:'empty'},'目前没有留待稍后处理的事。')])),
     h('article',{className:'card'},h('h3',null,'行动记录'),...(data?.history||[]).map((x,i)=>h('details',{key:[x.at,x.run,x.type,i].join('-'),className:'log'+(/报错|异常|未取得/.test(x.type)?' error':'')},h('summary',null,h('time',null,when(x.at)),'　',x.type),h('p',{className:'detail'},x.detail))),h('small',{className:'foot'},'页面可见时自动更新 · '+when(data?.at))));
 }
 return {inject:['slots'],apply(ctx){const s=ctx.get('slots');s.inject('settings.section',()=>s.register({name:'settings.section',id:'censhu-agency',order:55,label:()=>'主动进行'},Page));}};
}});
