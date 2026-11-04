import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {installRequestProjector,previewRequestProjectors,requestProjectorStatus} from './request-projection.js';

const drain=async stream=>{const out=[];for await(const chunk of stream)out.push(chunk);return out;};
const request=()=>Object.freeze({provider:'fixture',model:'fixture',sessionId:'life',signal:new AbortController().signal,messages:Object.freeze([Object.freeze({id:'one',role:'user'})])});

test('life and agency share the exact request projector implementation',{skip:!process.env.LIFE_PLUGIN_ROOT},()=>{
 const normalize=value=>value.replaceAll('\r\n','\n');
 assert.equal(normalize(fs.readFileSync(new URL('./request-projection.js',import.meta.url),'utf8')),
   normalize(fs.readFileSync(path.join(process.env.LIFE_PLUGIN_ROOT,'lib/request-projection.js'),'utf8')));
});
function fixture(){
 const calls=[];
 class Runtime{async *adapterStream(options,prepared){calls.push({receiver:this,options,prepared});yield {type:'finish',reason:{kind:'stop'}};}}
 const runtime=new Runtime();return {runtime,calls,original:runtime.adapterStream};
}

test('ordered async projections compose once while a failed projector preserves the previous input',async()=>{
 const {runtime,calls,original}=fixture(),options=request(),prepared={dispatch:'bound'},order=[],errors=[];
 const offB=installRequestProjector(runtime,{id:'b',priority:20,async project(o){await Promise.resolve();order.push('b');assert.equal(o.messages.length,0);return {...o,tools:[]};}});
 const offA=installRequestProjector(runtime,{id:'a',priority:10,project(o){order.push('a');return {...o,messages:[]};}});
 const offBad=installRequestProjector(runtime,{id:'bad',priority:15,project(){throw Error('unavailable');},onError(e){errors.push(e.message);throw Error('diagnostic failed');}});
 await drain(runtime.adapterStream(options,prepared));
 assert.deepEqual(order,['a','b']);assert.deepEqual(errors,['unavailable']);assert.equal(calls.length,1);
 assert.equal(calls[0].prepared,prepared);assert.equal(calls[0].receiver,runtime);assert.equal(options.messages.length,1);
 assert.ok(Object.isFrozen(calls[0].options));assert.ok(Object.isFrozen(calls[0].options.messages));assert.ok(Object.isFrozen(calls[0].options.tools));
 offA();offBad();offB();assert.equal(runtime.adapterStream,original);assert.equal(Object.hasOwn(runtime,'adapterStream'),false);
});

test('budget previews reuse only earlier projectors without dispatching or recording a send',async()=>{
 const {runtime,calls}=fixture(),phases=[];
 const a=installRequestProjector(runtime,{id:'history',priority:10,project:(o,{phase})=>{phases.push(phase);return {...o,messages:[]};}});
 const b=installRequestProjector(runtime,{id:'final',priority:30,project:o=>{phases.push('final');return o;}});
 try{
   const projected=await previewRequestProjectors(runtime,request(),{beforePriority:30});
   assert.equal(projected.messages.length,0);assert.deepEqual(phases,['budget']);assert.equal(calls.length,0);
   assert.ok(requestProjectorStatus(runtime).projectors.every(entry=>entry.calls===0&&entry.changed===0));
   await drain(runtime.adapterStream(request()));assert.deepEqual(phases,['budget','dispatch','final']);assert.equal(calls.length,1);
 }finally{a();b();}
});

test('a replaced adapter boundary cannot advertise an uninstalled budget projection',async()=>{
 const {runtime}=fixture(),options=request(),off=installRequestProjector(runtime,{id:'history',priority:10,project:o=>({...o,messages:[]})});
 runtime.adapterStream=async function*(){yield {type:'finish'};};
 assert.equal(await previewRequestProjectors(runtime,options,{beforePriority:30}),options);assert.equal(requestProjectorStatus(runtime).installed,false);off();
});

test('invalid route changes fall back and unrelated projections continue',async()=>{
 const {runtime,calls}=fixture(),options=request(),errors=[];
 const off=installRequestProjector(runtime,{id:'bad-route',project:o=>({...o,provider:'other'}),onError:e=>errors.push(e.message)});
 await drain(runtime.adapterStream(options));assert.equal(calls[0].options,options);assert.match(errors[0],/provider/);off();
});

test('tool history can be projected as request-only declarations without mutating durable definitions',async()=>{
 const {runtime,calls}=fixture(),all=Object.freeze([{name:'keep'},{name:'later'}]),history=Object.freeze({tools:all,updates:Object.freeze([])});
 const options=Object.freeze({...request(),tools:all,toolHistory:history});
 const off=installRequestProjector(runtime,{id:'tools',project:o=>({...o,tools:[all[0]],toolHistory:{tools:[all[0]],updates:[]}})});
 await drain(runtime.adapterStream(options));assert.equal(calls[0].options.toolHistory.tools.length,1);assert.equal(history.tools.length,2);assert.equal(options.toolHistory,history);off();
});

test('proxy callers share one raw instance registry, replacement and disposal preserve other owners',async()=>{
 const {runtime,calls,original}=fixture(),proxy=new Proxy(runtime,{get(t,k,r){return k===Symbol.for('cordis.original')?t:Reflect.get(t,k,r);},set(){throw Error('must not assign proxy');}});
 const old=installRequestProjector(proxy,{id:'life',project:()=>assert.fail('replaced owner must not run')});
 const current=installRequestProjector(runtime,{id:'life',project:o=>({...o,messages:[]})});old();
 const other=installRequestProjector(proxy,{id:'other',project:o=>({...o,tools:[]})});
 await drain(runtime.adapterStream(request()));assert.deepEqual(calls[0].options.messages,[]);assert.deepEqual(calls[0].options.tools,[]);
 current();assert.notEqual(runtime.adapterStream,original);other();assert.equal(runtime.adapterStream,original);
});

test('unload does not clobber another wrapper, and an already opened stream retains its projector snapshot',async()=>{
 const {runtime,calls}=fixture();const off=installRequestProjector(runtime,{id:'life',project:o=>({...o,messages:[]})});
 const stream=runtime.adapterStream(request()),inner=runtime.adapterStream;
 const foreign=function(...args){return inner.apply(this,args);};runtime.adapterStream=foreign;assert.equal(requestProjectorStatus(runtime).installed,false);off();
 assert.equal(runtime.adapterStream,foreign);await drain(stream);assert.equal(calls[0].options.messages.length,0);
 await drain(runtime.adapterStream(request()));assert.equal(calls[1].options.messages.length,1);
});

test('native boundary failures and cancellations retain their original stream behavior',async()=>{
 const runtime={async *adapterStream(){throw Error('adapter-boundary-failed');}};
 const off=installRequestProjector(runtime,{id:'noop',project:o=>o});
 await assert.rejects(()=>drain(runtime.adapterStream(request())),/adapter-boundary-failed/);off();
});
