export type BalanceDraft = {value:string; entered:boolean; kept:boolean};
export function validBalance(value:string){return value.trim()!==''&&Number.isFinite(Number(value))&&Math.abs(Number(value))<=1e12}
export function inputBalance(draft:BalanceDraft,key:string):BalanceDraft{
 let value=draft.entered?draft.value:'';
 if(key==='Backspace')value=value.slice(0,-1);
 else if(key==='sign')value=draft.value.startsWith('-')?draft.value.slice(1):'-'+draft.value;
 else if(/^[0-9.]$/.test(key)){
  if(key==='.'&&value.includes('.'))return draft;
  value+=key;
  if(value==='.')value='0.';
  if(value==='-.')value='-0.';
 }else return draft;
 return {value,entered:true,kept:false};
}
