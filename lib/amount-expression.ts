export type AmountResult={ok:true;value:number}|{ok:false;error:string};
export function evaluateAmount(expression:string,resolveBalance?:(reference:string)=>number):AmountResult{
 const source=expression.trim().replace(/^=/,'').replaceAll('×','*').replaceAll('÷','/').replaceAll('−','-');
 if(!source)return {ok:false,error:'Enter an amount.'};
 if(source.length>200)return {ok:false,error:'Keep the calculation under 200 characters.'};
 if(!resolveBalance&&/[^\d\s.+\-*/()]/.test(source))return {ok:false,error:'Use numbers, parentheses, and + − × ÷.'};
 let index=0,depth=0;
 const space=()=>{while(index<source.length&&/\s/.test(source[index]))index++};
 const check=(value:number)=>{if(!Number.isFinite(value))throw Error('The calculation is too large.');return value};
 function atom():number{
  space();if(++depth>24)throw Error('Too many nested operations.');
  try{
   const token=source[index];
   const balance=source.slice(index).match(/^Bal\s*\(\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^()]+?)\s*\)/i);
   if(balance){
    if(!resolveBalance)throw Error('Balance references need an audit.');
    index+=balance[0].length;
    const raw=balance[1].trim();
    const reference=raw.startsWith('"')?JSON.parse(raw):raw.startsWith("'")?raw.slice(1,-1).replace(/\\'/g,"'"):raw;
    if(!reference)throw Error('Choose an account for Bal().');
    return check(resolveBalance(reference));
   }
   if(token==='+'||token==='-'){index++;return (token==='-'?-1:1)*atom()}
   if(token==='('){index++;const value=sum();space();if(source[index++]!==')')throw Error('Close the parentheses.');return value}
   const number=source.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
   if(!number)throw Error('Finish the calculation.');index+=number[0].length;return check(Number(number[0]));
  }finally{depth--}
 }
 function product():number{let value=atom();while(true){space();const op=source[index];if(op!=='*'&&op!=='/')return value;index++;const right=atom();if(op==='/'&&right===0)throw Error('Cannot divide by zero.');value=check(op==='*'?value*right:value/right)}}
 function sum():number{let value=product();while(true){space();const op=source[index];if(op!=='+'&&op!=='-')return value;index++;const right=product();value=check(op==='+'?value+right:value-right)}}
 try{const value=sum();space();if(index!==source.length)throw Error('Check the operators and parentheses.');if(Math.abs(value)>1e12)throw Error('The balance must be within ±1 trillion.');return {ok:true,value:Math.round(value*1e6)/1e6}}
 catch(error){return {ok:false,error:(error as Error).message}}
}
