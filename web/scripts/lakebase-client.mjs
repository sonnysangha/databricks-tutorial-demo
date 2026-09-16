import {execFileSync} from 'node:child_process';
import {Pool} from 'pg';
import {loadEnvFile} from 'node:process';
loadEnvFile('.env.local');
export function client() {
  return new Pool({host:process.env.PGHOST,port:5432,database:process.env.PGDATABASE,user:process.env.PGUSER,
    ssl:{rejectUnauthorized:true},connectionTimeoutMillis:20000,
    password:async()=>JSON.parse(execFileSync('databricks',['postgres','generate-database-credential',process.env.LAKEBASE_ENDPOINT,'--profile',process.env.DATABRICKS_PROFILE,'-o','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']})).token});
}
