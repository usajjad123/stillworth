'use client';
import {useLayoutEffect,useRef,useState} from 'react';
import {ArrowRight,Check,Delete} from 'lucide-react';
import {type State,type Entry,balances,latest,audits,total,today,correctAudit,auditRates} from '../lib/ledger';
import {type BalanceDraft,inputBalance} from '../lib/audit-input';
import {calculateAudit} from '../lib/audit-calculations';

const num=(n:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(n);
const round=(n:number)=>Math.round(n*1e6)/1e6;
const importedTabs:Record<string,string>={C:'Wise',D:'Binance',E:'Saudi bank',F:'Cash',G:'Rent',H:'Bills',I:'FlyNas',J:'Udhaar',K:'My PKR',L:'Sister PKR',M:'Sister SAR'};

export default function AuditFlow({s,entry,busy,onSave}:{s:State;entry?:Entry;busy:boolean;onSave:(entry:Entry)=>Promise<void>}){
 const [expected]=useState(()=>entry?.legs??balances(s));
 const [drafts,setDrafts]=useState<Record<string,BalanceDraft>>(()=>Object.fromEntries(s.accounts.map(a=>[a.id,{value:entry?.balanceExpressions?.[a.id]??String(round(expected[a.id]||0)),entered:false,kept:false}])));
 const [active,setActive]=useState(s.accounts[0].id),[undo,setUndo]=useState<Record<string,BalanceDraft>>({}),[review,setReview]=useState(false),[err,setErr]=useState('');
 const [name,setName]=useState(entry?.note??'Monthly audit'),[description,setDescription]=useState(entry?.description??''),[when,setWhen]=useState(entry?.date??today());
 const [referencePicker,setReferencePicker]=useState(false),[bindings,setBindings]=useState<Record<string,string>>(entry?.balanceReferences??{});
 const [calculationRates]=useState(()=>entry?auditRates(s,entry):{...s.rates});
 const referenceSelection=useRef({start:0,end:0});
 const tabRefs=useRef<Record<string,HTMLButtonElement|null>>({});
 const inputRef=useRef<HTMLInputElement>(null),pendingCaret=useRef<number|null>(null);
 useLayoutEffect(()=>{if(pendingCaret.current!==null&&inputRef.current){const position=pendingCaret.current;pendingCaret.current=null;inputRef.current.focus({preventScroll:true});inputRef.current.setSelectionRange(position,position)}});
 useLayoutEffect(()=>{const input=inputRef.current;if(input)input.setSelectionRange(input.value.length,input.value.length)},[active]);
 const a=s.accounts.find(a=>a.id===active)!,draft=drafts[active];
 const balanceExpressions=Object.fromEntries(s.accounts.map(a=>[a.id,drafts[a.id].value.trim()]));
 const calculation=calculateAudit(s.accounts,balanceExpressions,expected,calculationRates,bindings);
 const valid=(id:string)=>calculation.results[id].ok;
 const complete=(id:string)=>valid(id)&&(drafts[id].entered||drafts[id].kept);
 const count=s.accounts.filter(a=>complete(a.id)).length;
 const values=Object.fromEntries(s.accounts.map(a=>{const amount=calculation.results[a.id];return [a.id,amount.ok?amount.value:0]}));
 const result=calculation.results[active];
 const balanceReferences=calculation.references;
 const variance=total(s,values)-total(s,expected);
 const previous=entry?audits(s).filter(a=>a.order<entry.order).at(-1):latest(s);
 const next=entry?audits(s).find(a=>a.order>entry.order):undefined;
 const corrected=entry?{...correctAudit(s,entry,name.trim(),when,values),description:description.trim()||undefined,balanceExpressions,balanceReferences}:undefined;
 function select(id:string){setActive(id);setErr('');setReferencePicker(false)}
 function key(k:string){
  const input=inputRef.current;
  const selection=input&&(draft.entered||input===document.activeElement)?{start:input.selectionStart??draft.value.length,end:input.selectionEnd??draft.value.length}:undefined;
  const updated=inputBalance(draft,k,selection);
  const start=selection?.start??(draft.entered?draft.value.length:0);
  pendingCaret.current=k==='sign'?updated.value.length:k==='Backspace'?Math.max(0,start-((selection?.end??draft.value.length)===start?1:0)):start+(k==='.'&&start===0&&(selection?.end??draft.value.length)===draft.value.length?2:1);
  setDrafts(d=>({...d,[active]:updated}));setUndo(u=>{const next={...u};delete next[active];return next});setErr('');
 }
 function type(value:string){setDrafts(d=>({...d,[active]:{value,entered:true,kept:false}}));setUndo(u=>{const next={...u};delete next[active];return next});setErr('')}
 function clear(){pendingCaret.current=0;setUndo(u=>({...u,[active]:draft}));setDrafts(d=>({...d,[active]:{value:'',entered:true,kept:false}}));setErr('')}
 function restore(){pendingCaret.current=undo[active].value.length;setDrafts(d=>({...d,[active]:undo[active]}));setUndo(u=>{const next={...u};delete next[active];return next});setErr('')}
 function openReferences(){
  const input=inputRef.current;
  referenceSelection.current=draft.entered&&input?{start:input.selectionStart??draft.value.length,end:input.selectionEnd??draft.value.length}:{start:0,end:draft.value.length};
  setReferencePicker(true);
 }
 function insertReference(id:string){
  const account=s.accounts.find(a=>a.id===id)!;
  let name=importedTabs[id]??account.name;
  if(bindings[name]&&bindings[name]!==id)name=account.name+' ['+id+']';
  const token='Bal('+JSON.stringify(name)+')',selection=referenceSelection.current;
  const value=draft.value.slice(0,selection.start)+token+draft.value.slice(selection.end);
  if(value.length>200){setErr('Keep the calculation under 200 characters.');return}
  setBindings(b=>({...b,[name]:id}));pendingCaret.current=selection.start+token.length;type(value);setReferencePicker(false);
 }
 function openReview(){
  setReferencePicker(false);
  const missing=s.accounts.find(a=>!valid(a.id));
  if(missing){setActive(missing.id);setErr(missing.name+': '+(calculation.results[missing.id] as {ok:false;error:string}).error);return}
  setErr('');setReview(true);
 }
 function advance(){
  if(!valid(active)){setErr('Enter a balance, or undo clear.');return}
  setDrafts(d=>({...d,[active]:{...d[active],kept:!d[active].entered}}));
  const index=s.accounts.findIndex(a=>a.id===active);
  for(let offset=1;offset<s.accounts.length;offset++){
   const candidate=s.accounts[(index+offset)%s.accounts.length];
   if(!complete(candidate.id)){select(candidate.id);return}
  }
  openReview();
 }
 async function save(){
  if(!name.trim()){setErr('Give this audit a name.');return}
  if(when>(next?.date??today())||(previous&&when<previous.date)){setErr('Keep the date between '+(previous?.date??'your first audit')+' and '+(next?.date??today())+'.');return}
  if(s.accounts.some(a=>!valid(a.id))){setReview(false);openReview();return}
  const value:Entry=corrected??{id:crypto.randomUUID(),date:when,note:name.trim(),description:description.trim()||undefined,balanceExpressions,balanceReferences,type:'audit',order:Math.max(...s.events.map(e=>e.order))+1,legs:values,recordedSavings:round(total(s,values)),expectedSavings:round(total(s,expected)),adjustment:round(variance),auditRates:{...calculationRates}};
  await onSave(value);
 }
 return <div className={'audit-flow '+(review?'audit-is-review':'')} onKeyDown={e=>{
  if(review||referencePicker||busy||e.ctrlKey||e.metaKey||e.altKey||['INPUT','TEXTAREA','SELECT'].includes((e.target as HTMLElement).tagName))return;
  const tab=(e.target as HTMLElement).closest('[role="tab"]');
  if(tab&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)){
   e.preventDefault();const index=s.accounts.findIndex(a=>a.id===active),offset=e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:e.key==='ArrowUp'?-4:4;
   const target=s.accounts[e.key==='Home'?0:e.key==='End'?s.accounts.length-1:(index+offset+s.accounts.length)%s.accounts.length];select(target.id);tabRefs.current[target.id]?.focus();return;
  }
  if(/^[0-9.+\-*/()]$/.test(e.key)||e.key==='Backspace'){e.preventDefault();key(e.key)}
  if(e.key==='Delete'){e.preventDefault();clear()}
 }}>
  {!review?<>
   <div className="audit-flow-heading"><div><h3>Audit your balances.</h3><p>Jump to any account. Edits stay put.</p></div><span aria-live="polite"><strong>{count}/{s.accounts.length}</strong> entered</span><button className="text-button" type="button" disabled={busy} onClick={openReview}>Review</button></div>
   <div className="audit-account-tabs" role="tablist" aria-label="Choose any account">{s.accounts.map(account=>{
    const status=!drafts[account.id].value.trim()?'empty':!valid(account.id)?'invalid':complete(account.id)?'entered':'prefilled';
    return <button type="button" role="tab" ref={el=>{tabRefs.current[account.id]=el}} id={'audit-tab-'+account.id} key={account.id} aria-selected={active===account.id} aria-controls="audit-balance-panel" aria-label={account.name+', '+status} data-status={status} disabled={busy} onClick={()=>select(account.id)}>{importedTabs[account.id]??account.name}{status!=='prefilled'&&<i aria-hidden="true"/>}</button>
   })}</div>
   <section className="audit-balance-panel" id="audit-balance-panel" role="tabpanel" aria-labelledby={'audit-tab-'+active}>
    <div className="audit-balance-heading"><strong>{a.name}</strong><span>{a.currency}</span></div>
    <div className="audit-balance-amount"><input key={active} ref={inputRef} className={/Bal\s*\(/i.test(draft.value)?'has-expression has-reference':/[+*/()]/.test(draft.value)?'has-expression':''} type="text" inputMode="none" autoComplete="off" spellCheck={false} maxLength={200} aria-label={a.name+' actual balance'} aria-describedby="audit-amount-hint audit-calculation-result" aria-invalid={!result.ok&&draft.value!==''} value={draft.value} placeholder="0" disabled={busy} onFocus={e=>{if(!draft.entered)e.currentTarget.select()}} onChange={e=>type(e.target.value)}/><button type="button" disabled={busy} onClick={draft.value===''&&undo[active]?restore:clear}>{draft.value===''&&undo[active]?'Undo clear':'Clear'}</button></div>
    <p id="audit-calculation-result" className={'audit-calculation-result'+(!result.ok?' invalid':'')} aria-live="polite">{result.ok?'= '+num(result.value)+' '+a.currency:result.error}</p><div className="audit-balance-hint"><p id="audit-amount-hint">{entry?'Recorded':'Estimate'}: {num(expected[active]||0)} {a.currency}<br/>{!draft.entered?'Type to replace, or use a calculation.':'Draft retained. Switch tabs freely.'}</p><div className="audit-expression-tools">{['(',')','sign'].map(k=><button key={k} type="button" disabled={busy} aria-label={k==='sign'?'Toggle negative amount':k==='('?'Open parenthesis':'Close parenthesis'} onPointerDown={e=>e.preventDefault()} onClick={()=>key(k)}>{k==='sign'?'±':k}</button>)}</div></div>
    <div className="audit-reference-row"><button type="button" disabled={busy} onPointerDown={e=>e.preventDefault()} onClick={openReferences}>Insert balance <span>Bal(…)</span></button>{(calculation.dependencies[active]??[]).length>0&&<span>From this audit</span>}</div>
    {(calculation.dependencies[active]??[]).map(id=>{const source=s.accounts.find(a=>a.id===id)!,value=calculation.results[id];return <p className="audit-reference-detail" key={id}>{source.name}: {value.ok?num(value.value)+' '+source.currency:'needs a valid balance'}{value.ok&&source.currency!==a.currency?' → '+num(value.value*calculationRates[source.currency]/calculationRates[a.currency])+' '+a.currency+' at this audit’s rate':''}</p>})}
    <p className="audit-account-context">{a.kind==='savings'?'Included in savings':a.kind==='reserve'?'Reserved for expenses · excluded from savings':'Tracked separately · excluded from savings'}</p>
   </section>
   <div className="audit-flow-error" role="alert">{err}</div>
   {referencePicker?<section className="audit-reference-picker" aria-label="Choose a balance from this audit"><div><strong>Balance from this audit</strong><button type="button" onClick={()=>setReferencePicker(false)}>Cancel</button></div><div className="audit-reference-options">{s.accounts.filter(account=>account.id!==active).map(account=>{const amount=calculation.results[account.id];return <button type="button" key={account.id} disabled={busy} onPointerDown={e=>e.preventDefault()} onClick={()=>insertReference(account.id)}><span>{account.name}</span><small>{amount.ok?num(amount.value):'Needs a balance'} {account.currency}{account.currency!==a.currency?' → '+a.currency:''}</small></button>})}</div></section>:<div className="audit-number-pad" role="group" aria-label="Balance number pad">{['1','2','3','+','4','5','6','-','7','8','9','*','.','0','Backspace','/'].map(k=><button type="button" key={k} aria-label={k==='Backspace'?'Delete digit':k==='.'?'Decimal point':k==='+'?'Add':k==='-'?'Subtract':k==='*'?'Multiply':k==='/'?'Divide':k} disabled={busy} onPointerDown={e=>e.preventDefault()} onClick={()=>key(k)}>{k==='Backspace'?<Delete size={22}/>:k==='*'?'×':k==='/'?'÷':k==='-'?'−':k}</button>)}</div>}
   <div className="audit-flow-footer"><button className="primary full" type="button" disabled={busy||!valid(active)} onClick={count===s.accounts.length?openReview:advance}>{count===s.accounts.length?'Review '+s.accounts.length+' balances':!valid(active)?'Enter a balance to continue':complete(active)?'Next unentered account':'Keep balance & next'} <ArrowRight size={17}/></button></div>
  </>:<>
   <button className="text-button" type="button" disabled={busy} onClick={()=>{setReview(false);setErr('')}}>← Back to balances</button>
   <p className="modal-subtitle">Confirm that these balances match your accounts.</p>
   <div className="audit-review-list">{s.accounts.map(account=><button type="button" key={account.id} disabled={busy} onClick={()=>{select(account.id);setReview(false)}}><span>{account.name}<small>{drafts[account.id].entered?'Entered':entry?'Kept as recorded':'Kept at estimate'}</small>{/[+*/()]/.test(drafts[account.id].value)&&<small>{drafts[account.id].value}</small>}</span><strong>{num(values[account.id])}<small>{account.currency}</small></strong></button>)}</div>
   <div className="review-worth"><small>{entry?'CORRECTED':'VERIFIED'} SAVINGS</small><strong>{num(corrected?.recordedSavings??total(s,values))} <small>SAR</small></strong></div>
   {!entry&&<div className="detail-row"><span>Unrecorded difference</span><strong>{variance>=0?'+':'−'}{num(Math.abs(variance))} SAR</strong></div>}
   <label>Audit name<input maxLength={200} value={name} onChange={e=>setName(e.target.value)} disabled={busy}/></label>
   <label>Audit date<input type="date" min={previous?.date} max={next?.date??today()} value={when} onChange={e=>setWhen(e.target.value)} disabled={busy}/></label>
   <label>Description <span className="optional-label">(optional)</span><textarea maxLength={2000} rows={3} placeholder="Anything to remember about this snapshot…" value={description} onChange={e=>setDescription(e.target.value)} disabled={busy}/></label>
   {err&&<p className="error" role="alert">{err}</p>}
   <div className="audit-flow-footer"><button className="primary full" type="button" disabled={busy} onClick={save}>{busy?'Saving…':entry?'Save audit changes':'Confirm balances & save audit'} <Check size={17}/></button></div>
  </>}
 </div>;
}
