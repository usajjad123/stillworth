import 'server-only';
import { neon } from '@neondatabase/serverless';
export function database(){
 const connection=process.env.DATABASE_URL;
 if(!connection)throw new Error('The database connection is not configured.');
 return neon(connection);
}
