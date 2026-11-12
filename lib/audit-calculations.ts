import {evaluateAmount,type AmountResult} from './amount-expression.ts';
type CalculationAccount={id:string;name:string;currency:string};
const normalize=(text:string)=>text.toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const aliases:Record<string,string[]>={K:['My PKR','My PKR bank','PKR bank'],L:['sis pkr','sister pkr'],M:['sis sar','sister sar']};
export function calculateAudit(accounts:CalculationAccount[],expressions:Record<string,string>,fallback:Record<string,number>,rates:Record<string,number>,bindings:Record<string,string>={}){
 const results:Record<string,AmountResult>={},references:Record<string,string>={},dependencies:Record<string,string[]>={};
 const visiting=new Set<string>(),byId=new Map(accounts.map(a=>[a.id,a]));
 function find(reference:string){
  const bound=Object.hasOwn(bindings,reference)?bindings[reference]:undefined;
  if(bound){const account=byId.get(bound);if(!account)throw Error('Referenced account is no longer available.');return account}
  const exact=byId.get(reference);if(exact)return exact;
  const matches=accounts.filter(a=>normalize(a.name)===normalize(reference)||(aliases[a.id]??[]).some(alias=>normalize(alias)===normalize(reference)));
  if(matches.length!==1)throw Error(matches.length?'More than one account matches. Insert its balance using the picker.':'Unknown account: '+reference+'. Choose an account using Insert balance.');
  return matches[0];
 }
 function resolve(id:string):AmountResult{
  if(Object.hasOwn(results,id))return results[id];
  const account=byId.get(id)!;
  if(visiting.has(id))return {ok:false,error:'Circular balance reference involving '+account.name+'.'};
  visiting.add(id);dependencies[id]=[];
  const result=evaluateAmount(Object.hasOwn(expressions,id)?expressions[id]:String(fallback[id]??0),reference=>{
   const source=find(reference);references[reference]=source.id;
   if(!dependencies[id].includes(source.id))dependencies[id].push(source.id);
   const value=resolve(source.id);
   if(!value.ok)throw Error(value.error.startsWith('Circular')?value.error:source.name+': '+value.error);
   if(!(rates[source.currency]>0)||!(rates[account.currency]>0))throw Error('Missing conversion rate.');
   return value.value*rates[source.currency]/rates[account.currency];
  });
  visiting.delete(id);results[id]=result;return result;
 }
 for(const account of accounts)resolve(account.id);
 return {results,references,dependencies};
}
