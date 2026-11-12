import {evaluateAmount} from './amount-expression.ts';
export type BalanceDraft = {value:string; entered:boolean; kept:boolean};
export function validBalance(value:string){return evaluateAmount(value).ok}
export function inputBalance(draft:BalanceDraft,key:string,selection?:{start:number;end:number}):BalanceDraft{
 const text=draft.value;
 let start=selection?.start??(draft.entered?text.length:0),end=selection?.end??text.length,value=text;
 if(key==='Backspace'){if(start===end)start=Math.max(0,start-1);value=text.slice(0,start)+text.slice(end)}
 else if(key==='sign')value=/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)?(text.startsWith('-')?text.slice(1):'-'+text):text.startsWith('-(')&&text.endsWith(')')?text.slice(2,-1):'-('+text+')';
 else if(/^[0-9.+\-*/()]$/.test(key)){
  const insertion=key==='.'&&start===0&&end===text.length?'0.':key;
  value=text.slice(0,start)+insertion+text.slice(end);
 }else return draft;
 return {value,entered:true,kept:false};
}
