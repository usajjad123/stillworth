import 'server-only';
// This single-owner app uses Vercel Authentication on ALL deployment URLs.
// The provisioning script verifies that setting before production deployment.
export function assertPrivateHosting(){
 if(process.env.NODE_ENV==='production'){
  if(process.env.VERCEL!=='1'||process.env.LEDGER_ACCESS_MODE!=='vercel-protected')throw new Error('Private hosting is not configured.');
 }else if(process.env.LEDGER_ACCESS_MODE!=='local'&&process.env.LEDGER_ACCESS_MODE!=='vercel-protected')throw new Error('Set LEDGER_ACCESS_MODE for local development.');
}
export function sameOrigin(req:Request){
 const origin=req.headers.get('origin');
 if(!origin)return false;
 try{return new URL(origin).host===(req.headers.get('x-forwarded-host')||req.headers.get('host')||new URL(req.url).host)}catch{return false}
}
