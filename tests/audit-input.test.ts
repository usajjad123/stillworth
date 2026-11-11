import test from 'node:test';
import assert from 'node:assert/strict';
import {inputBalance,validBalance} from '../lib/audit-input.ts';
import {schema} from '../lib/validation.ts';
test('first digit replaces a prefilled or kept balance; later digits append',()=>{
 for(const kept of [true,false]){
  const first=inputBalance({value:'30800',entered:false,kept},'4');
  assert.equal(first.value,'4');assert.equal(first.kept,false);
  assert.equal(inputBalance(first,'2').value,'42');
 }
});
test('decimal, deletion and negative balances stay valid without accepting an empty balance',()=>{
 let d={value:'75000',entered:false,kept:false};
 d=inputBalance(d,'.');d=inputBalance(d,'5');d=inputBalance(d,'sign');
 assert.equal(d.value,'-0.5');assert.ok(validBalance(d.value));
 assert.equal(inputBalance(d,'.').value,'-0.5');
 assert.equal(inputBalance(d,'Backspace').value,'-0.');
 assert.ok(!validBalance(''));assert.ok(!validBalance('-'));assert.ok(validBalance('0'));
 assert.ok(!validBalance('Infinity'));assert.ok(!validBalance('1000000000001'));
});
test('free text descriptions survive API validation and remain optional',()=>{
 const state={version:1,rateNote:'test',rates:{SAR:1,USD:3.75,USDC:3.82,PKR:1/75},accounts:[{id:'a',name:'Cash',currency:'SAR',kind:'savings'}],events:[{id:'e',date:'2026-11-11',note:'Custom title',description:'Anything: rent, café, or a note\non two lines.',type:'audit',legs:{a:1},order:1}]};
 const result=schema.parse({revision:1,state});
 assert.equal(result.state.events[0].description,state.events[0].description);
 assert.ok(schema.safeParse({revision:1,state:{...state,events:[{...state.events[0],description:undefined}]}}).success);
 assert.ok(!schema.safeParse({revision:1,state:{...state,events:[{...state.events[0],description:'x'.repeat(2001)}]}}).success);
});
