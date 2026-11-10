import { database } from '../../../lib/db';
import { assertHostingConfigured,sameOrigin } from '../../../lib/access';
import { schema } from '../../../lib/validation';
export const dynamic='force-dynamic';
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
 try{
  assertHostingConfigured();
  const sql=database();
  const rows=await sql`SELECT body,revision FROM ledgers WHERE id='owner'`;
  if(!rows.length)return json({error:'The ledger has not been imported yet.'},503);
  return json({state:rows[0].body,revision:rows[0].revision});
 }catch{return json({error:'Could not load the ledger. Please try again shortly.'},503)}
}
export async function PUT(req:Request){
 try{assertHostingConfigured()}catch{return json({error:'Hosting is not configured.'},503)}
 if(!sameOrigin(req))return json({error:'Save entries from this app.'},403);
 const raw=await req.text();if(raw.length>2000000)return json({error:'Ledger is too large.'},413);
 let parsed;try{parsed=schema.safeParse(JSON.parse(raw))}catch{return json({error:'Invalid request.'},400)}
 if(!parsed.success)return json({error:'Check the amounts and dates, then try again.'},400);
 const {state,revision}=parsed.data,ids=new Set(state.accounts.map(a=>a.id));
 if(ids.size!==state.accounts.length||new Set(state.events.map(e=>e.id)).size!==state.events.length||state.rates.SAR!==1||!(['USD','USDC','PKR'] as const).every(c=>(state.rates[c]||0)>0)||!state.events.some(e=>e.type==='audit'&&!e.deleted)||state.events.some(e=>Object.keys(e.legs).some(id=>!ids.has(id))))return json({error:'Keep at least one audit and valid account balances.'},400);
 try{
  const sql=database();
  const rows=await sql`UPDATE ledgers SET body=${JSON.stringify(state)}::jsonb,revision=revision+1,updated_at=now() WHERE id='owner' AND revision=${revision} RETURNING revision`;
  if(!rows.length)return json({error:'This ledger changed on another device. Reload to get the latest version; your open entry has been kept.'},409);
  return json({revision:rows[0].revision});
 }catch{return json({error:'Could not save. Your entry is still open; please try again.'},503)}
}
