import test from 'node:test';
import assert from 'node:assert/strict';
import {observedModel,lifeModelView} from './continuity.js';
test('current and legacy observed request headers report model without defaults',()=>{
 assert.equal(observedModel({config:{model:'deepseek-flash'},model:'old'}),'deepseek-flash');
 assert.equal(observedModel({model:{id:'legacy'}}),'legacy');
 assert.equal(observedModel({config:{provider:'x'}}),null);
});
test('read-only display survives restart using native header, rejects unrelated saved model',()=>{
 const state={mainModel:'stale',mainModelSession:'other'};
 const agent={session:{id:'session-life',requestHeader:()=>({config:{model:'deepseek-flash'}})}};
 assert.deepEqual(lifeModelView({get:()=>agent},'session-life',state),{model:'deepseek-flash',source:'生活会话最近请求'});
 assert.equal(lifeModelView({},'session-life',state).model,null);
 assert.equal(lifeModelView({},'session-life',{mainModel:'saved',mainModelSession:'session-life'}).model,'saved');
 assert.equal(state.mainModel,'stale');
});
