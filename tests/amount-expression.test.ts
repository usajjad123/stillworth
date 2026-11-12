import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateAmount} from '../lib/amount-expression.ts';
import {schema} from '../lib/validation.ts';

test('arithmetic supports precedence, parentheses, signs, decimals and spreadsheet-style equals',()=>{
 for(const [expression,value] of [['1200+3500',4700],['3000-1500',1500],['2+3*4',14],['(2+3)*4',20],['= 1200 + 3500',4700],['-1200+3500',2300],['1--2',3],['0.1+0.2',0.3],['10/3',3.333333],['2×(3−1)÷4',1],['.5+.25',0.75],['0',0],['-0',0]] as const){
  const result=evaluateAmount(expression);assert.ok(result.ok,expression);if(result.ok)assert.equal(result.value===0?0:result.value,value,expression);
 }
});
test('incomplete, invalid, unsafe and excessive calculations fail instead of becoming zero',()=>{
 for(const expression of ['','1+','-','(1+2','1+2)','1/0','0/0','1..2','2(3)','Bal(sis)','globalThis.process','1e3','0x10','1,000','1;2','1'.repeat(201),'('.repeat(25)+'1'+')'.repeat(25),'1000000000001'])assert.equal(evaluateAmount(expression).ok,false,expression);
});
test('API round-trip keeps expressions and rejects values that disagree with their calculation',()=>{
 const request={revision:1,state:{version:1,rateNote:'test',rates:{SAR:1,USD:3.75,USDC:3.82,PKR:1/75},accounts:[{id:'cash',name:'Cash',currency:'SAR',kind:'savings'}],events:[{id:'audit',date:'2026-11-12',note:'Audit',type:'audit',order:1,legs:{cash:4700},balanceExpressions:{cash:'1200+3500'}}]}};
 const parsed=schema.parse(JSON.parse(JSON.stringify(request)));
 assert.equal(parsed.state.events[0].balanceExpressions?.cash,'1200+3500');assert.equal(parsed.state.events[0].legs.cash,4700);
 const bad=structuredClone(request);bad.state.events[0].legs.cash=1200;assert.equal(schema.safeParse(bad).success,false);
 const invalid=structuredClone(request);invalid.state.events[0].balanceExpressions.cash='1/0';assert.equal(schema.safeParse(invalid).success,false);
 const wrongAccount={...request,state:{...request.state,events:[{...request.state.events[0],balanceExpressions:{unknown:'4700'}}]}};assert.equal(schema.safeParse(wrongAccount).success,false);
});
