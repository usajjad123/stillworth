import { z } from 'zod';
import {calculateAudit} from './audit-calculations.ts';
import {auditRates} from './ledger.ts';
const finite=z.number().finite().min(-1e12).max(1e12);
export const schema=z.object({revision:z.number().int().min(0),state:z.object({version:z.literal(1),rateNote:z.string().max(200),rates:z.record(z.enum(['SAR','USD','USDC','PKR']),z.number().positive().max(1e8)),accounts:z.array(z.object({id:z.string().min(1).max(100),name:z.string().min(1).max(100),currency:z.enum(['SAR','USD','USDC','PKR']),kind:z.enum(['savings','reserve','excluded'])})).min(1).max(100),events:z.array(z.object({id:z.string().min(1).max(100),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),note:z.string().min(1).max(200),description:z.string().max(2000).optional(),balanceExpressions:z.record(z.string().min(1).max(100),z.string().max(200)).optional(),balanceReferences:z.record(z.string().min(1).max(200),z.string().min(1).max(100)).optional(),type:z.enum(['audit','imported','expense','income','transfer']),legs:z.record(z.string().max(100),finite),order:z.number().finite(),source:z.string().max(100).optional(),recordedSavings:finite.nullable().optional(),expectedSavings:finite.optional(),adjustment:finite.optional(),auditRates:z.record(z.enum(['SAR','USD','USDC','PKR']),z.number().positive().max(1e8)).optional(),deleted:z.boolean().optional()})).min(1).max(10000)})}).superRefine(({state},ctx)=>{
 const ids=new Set(state.accounts.map(a=>a.id));
 state.events.forEach((entry,index)=>{
  if(!entry.balanceExpressions&&!entry.balanceReferences)return;
  const calculation=calculateAudit(state.accounts,entry.balanceExpressions??{},entry.legs,auditRates(state,entry),entry.balanceReferences);
  if(Object.values(entry.balanceReferences??{}).some(id=>!ids.has(id)))ctx.addIssue({code:'custom',path:['state','events',index,'balanceReferences'],message:'Unknown referenced account.'});
  for(const id of Object.keys(entry.balanceExpressions??{})){
   const result=calculation.results[id];
   if(entry.type!=='audit'||!ids.has(id)||!Object.hasOwn(entry.legs,id)||!result||!result.ok||Math.abs(result.value-entry.legs[id])>0.0000005)ctx.addIssue({code:'custom',path:['state','events',index,'balanceExpressions',id],message:'The saved calculation must match the account balance.'});
  }
 });
});
