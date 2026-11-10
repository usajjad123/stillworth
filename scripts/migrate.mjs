import { neon } from '@neondatabase/serverless';
import { readFile } from 'node:fs/promises';
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required.');
const sql=neon(process.env.DATABASE_URL);
await sql.query(await readFile(new URL('../migrations/001_ledgers.sql',import.meta.url),'utf8'));
console.log('Ledger schema is ready.');
