import 'server-only';
// public-link is explicitly enabled for the shared ledger until app sign-in exists.
// vercel-protected remains available when deployment authentication is enabled.
export function assertHostingConfigured(){
 const configured=['public-link','vercel-protected'].includes(process.env.LEDGER_ACCESS_MODE||'');
 if(process.env.NODE_ENV==='production'){
  if(process.env.VERCEL!=='1'||!configured)throw new Error('Hosting is not configured.');
 }else if(process.env.LEDGER_ACCESS_MODE!=='local'&&!configured)throw new Error('Set LEDGER_ACCESS_MODE for local development.');
}
export function sameOrigin(req:Request){
 const origin=req.headers.get('origin');
 if(!origin)return false;
 try{return new URL(origin).host===(req.headers.get('x-forwarded-host')||req.headers.get('host')||new URL(req.url).host)}catch{return false}
}
