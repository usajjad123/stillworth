import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateAudit} from '../lib/audit-calculations.ts';
import {schema} from '../lib/validation.ts';
const accounts=[{id:'K',name:'My PKR bank',currency:'PKR',kind:'savings' as const},{id:'L',name:'Sister · PKR',currency:'PKR',kind:'excluded' as const},{id:'F',name:'Cash',currency:'SAR',kind:'savings' as const},{id:'J',name:'Udhaar',currency:'SAR',kind:'savings' as const}];
const rates={SAR:1,PKR:1/75,USD:3.75,USDC:3.82};
const value=(results:ReturnType<typeof calculateAudit>['results'],id:string)=>{const result=results[id];assert.ok(result.ok,result.ok?'':result.error);return result.value};
test('same-audit source changes recalculate callers and chained references',()=>{
 const expressions={K:'3000-Bal("Sister PKR")',L:'1200+300',F:'Bal("My PKR")',J:'2*Bal(Cash)'};
 const first=calculateAudit(accounts,expressions,{},rates);
 assert.equal(value(first.results,'K'),1500);assert.equal(value(first.results,'F'),20);assert.equal(value(first.results,'J'),40);
 const changed=calculateAudit(accounts,{...expressions,L:'750'}, {},rates);
 assert.equal(value(changed.results,'K'),2250);assert.equal(value(changed.results,'F'),30);assert.equal(value(changed.results,'J'),60);
 assert.equal(value(first.results,'K'),1500);
 assert.deepEqual(first.references,{'Sister PKR':'L','My PKR':'K',Cash:'F'});
});
test('references accept quoted names, ids and sis aliases; zero and negative balances are real values',()=>{
 assert.equal(value(calculateAudit(accounts,{K:'3000-Bal(sis pkr)',L:'0'}, {},rates).results,'K'),3000);
 assert.equal(value(calculateAudit(accounts,{K:"3000-Bal('L')",L:'-1500'}, {},rates).results,'K'),4500);
});
test('self references, cycles, missing accounts and invalid sources block their callers',()=>{
 for(const expressions of ([{K:'Bal(K)'},{K:'Bal(L)',L:'Bal(K)'},{K:'Bal(missing)'},{K:'Bal(L)',L:''},{K:'Bal(L)',L:'1/0'}] as Record<string,string>[])){
  const calculation=calculateAudit(accounts,expressions,{L:99},rates);assert.equal(calculation.results.K.ok,false);
 }
 const cycle=calculateAudit(accounts,{K:'Bal(L)',L:'Bal(K)'},{},rates);assert.ok(!cycle.results.K.ok&&cycle.results.K.error.includes('Circular'));
});
test('saved ids survive renaming; ambiguous names require explicit picker binding',()=>{
 const renamed=accounts.map(a=>a.id==='L'?{...a,name:'Renamed'}:a);
 assert.equal(value(calculateAudit(renamed,{K:'3000-Bal("Sister PKR")',L:'500'},{},rates,{'Sister PKR':'L'}).results,'K'),2500);
 const duplicates=[...accounts,{id:'duplicate',name:'Cash',currency:'SAR',kind:'savings' as const}];
 assert.equal(calculateAudit(duplicates,{J:'Bal(Cash)'},{F:10,duplicate:20},rates).results.J.ok,false);
 assert.equal(value(calculateAudit(duplicates,{J:'Bal(Cash)'},{F:10,duplicate:20},rates,{Cash:'F'}).results,'J'),10);
});
test('API validates each audit independently with saved rates and reopens live dependencies',()=>{
 const state={version:1,rateNote:'test',rates:{...rates,PKR:1/100},accounts,events:[{id:'first',date:'2026-11-12',note:'First',type:'audit',order:1,legs:{K:1500,L:1500,F:20,J:40},balanceExpressions:{K:'3000-Bal("Sister PKR")',L:'1500',F:'Bal(K)',J:'2*Bal(F)'},balanceReferences:{'Sister PKR':'L'},auditRates:rates},{id:'second',date:'2026-11-13',note:'Second',type:'audit',order:2,legs:{K:3000,L:0,F:30,J:60},balanceExpressions:{K:'3000-Bal("Sister PKR")',L:'0',F:'Bal(K)',J:'2*Bal(F)'},balanceReferences:{'Sister PKR':'L'},auditRates:{...rates,PKR:1/100}}]};
 const saved=schema.parse(JSON.parse(JSON.stringify({revision:1,state}))).state;
 const first=saved.events[0],second=saved.events[1];
 assert.equal(first.legs.F,20);assert.equal(second.legs.F,30);
 const edited=calculateAudit(saved.accounts,{...first.balanceExpressions,L:'750'},first.legs,first.auditRates!,first.balanceReferences);
 assert.equal(value(edited.results,'K'),2250);assert.equal(second.legs.K,3000);
 const stale=structuredClone(state);stale.events[0].legs.K=2999;assert.equal(schema.safeParse({revision:1,state:stale}).success,false);
 const circular=structuredClone(state);circular.events[0].balanceExpressions.L='Bal(K)';assert.equal(schema.safeParse({revision:1,state:circular}).success,false);
});
