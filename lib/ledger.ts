export type Account = {id:string;name:string;currency:string;kind:'savings'|'reserve'|'excluded'};
export type Entry = {id:string;date:string;note:string;description?:string;balanceExpressions?:Record<string,string>;balanceReferences?:Record<string,string>;type:string;legs:Record<string,number>;order:number;source?:string;recordedSavings?:number|null;expectedSavings?:number;adjustment?:number;auditRates?:Record<string,number>;deleted?:boolean};
export type State = {accounts:Account[];events:Entry[];rates:Record<string,number>;rateNote:string;version:number};
export function audits(s:State) {return s.events.filter(e=>e.type==='audit'&&!e.deleted).sort((a,b)=>a.order-b.order)}
export function latest(s:State) {return audits(s).at(-1)!}
export function balances(s:State, anchor=latest(s)) {
 const b:Record<string,number>={...anchor.legs};
 for(const e of s.events) if(!e.deleted&&e.type!=='audit'&&e.order>anchor.order&&e.date>=anchor.date) for(const [id,v] of Object.entries(e.legs)) b[id]=(b[id]||0)+v;
 return b;
}
export function total(s:State,b:Record<string,number>,kind='savings') {return s.accounts.filter(a=>kind==='all'?a.kind!=='excluded':a.kind===kind).reduce((n,a)=>n+(b[a.id]||0)*s.rates[a.currency],0)}
export function effect(s:State,e:Entry,kind='savings'){return total(s,e.legs,kind)}
export function auditRates(s:State,e:Entry){return e.auditRates||(e.source?{SAR:1,USD:3.75,USDC:3.82,PKR:1/75}:s.rates)}
export function auditEstimate(s:State,e:Entry){
 const previous=audits(s).filter(a=>a.order<e.order).at(-1);
 if(!previous)return undefined;
 const period={...s,events:s.events.filter(a=>a.order<e.order)};
 return total({...s,rates:auditRates(s,e)},balances(period,previous));
}
export function correctAudit(s:State,e:Entry,note:string,date:string,legs:Record<string,number>):Entry{
 const rates=auditRates(s,e);
 const difference=Object.fromEntries(s.accounts.map(a=>[a.id,(legs[a.id]||0)-(e.legs[a.id]||0)]));
 const recordedSavings=Math.round(((e.recordedSavings??total({...s,rates},e.legs))+total({...s,rates},difference))*1e6)/1e6;
 const corrected={...e,note,date,legs,recordedSavings,auditRates:rates};
 const expectedSavings=auditEstimate(s,corrected);
 return {...corrected,expectedSavings,adjustment:expectedSavings===undefined?undefined:recordedSavings-expectedSavings};
}
export function deleteAudit(s:State,id:string):State{
 const target=s.events.find(e=>e.id===id&&e.type==='audit'&&!e.deleted);
 if(!target)throw new Error('This audit is no longer available. Reload your ledger.');
 if(audits(s).length<=1)throw new Error('Keep one audit as your starting balance. You can edit it instead.');
 return {...s,events:s.events.map(e=>e.id===id?{...e,deleted:true}:e)};
}
export function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
