import { neon } from '@neondatabase/serverless';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
if(!process.env.DATABASE_URL||!process.argv[2])throw new Error('Provide DATABASE_URL and the absolute path to a ledger backup.');
const state=JSON.parse(await readFile(process.argv[2],'utf8'));
if(state.version!==1||!Array.isArray(state.events)||!state.events.some(e=>e.type==='audit'&&!e.deleted)||!Array.isArray(state.accounts))throw new Error('Invalid ledger backup.');
const sql=neon(process.env.DATABASE_URL);
// Never overwrite an existing ledger during provisioning or a retry.
const inserted=await sql`INSERT INTO ledgers (id,body,revision) VALUES ('owner',${JSON.stringify(state)}::jsonb,0) ON CONFLICT (id) DO NOTHING RETURNING id`;
const rows=await sql`SELECT body FROM ledgers WHERE id='owner'`;
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const digest=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
if(digest(state)!==digest(rows[0].body))throw new Error('An existing ledger differs from the backup. No records were overwritten.');
console.log(JSON.stringify({imported:inserted.length>0,verified:true,records:state.events.length,accounts:state.accounts.length,sha256:digest(state)}));
