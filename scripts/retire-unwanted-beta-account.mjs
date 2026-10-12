/** One-time, pinned administrative cleanup. Dry-run is the default. No credentials enter the app. */
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const project = 'iahrcupmyjnyyqszrmcx';
const target = { email: 'auriumdesign@gmail.com', user: '8561acbf-3ffc-49ea-aaae-208ce2aa8dbb', studio: '04c63799-8610-4f0a-aa92-80052cc02877' };
const retained = '586ab26d-9713-46b8-bfff-7534ceab7633';
const directory = resolve('.private-backups/account-retirement-2026-10-11');
process.loadEnvFile('.env.beta.import.local');
if (new URL(process.env.ML_BETA_SUPABASE_URL).hostname !== `${project}.supabase.co` || process.env.ML_BETA_PROJECT_REF !== project) throw new Error('Wrong project. Cleanup refused.');
const admin = createClient(process.env.ML_BETA_SUPABASE_URL, process.env.ML_BETA_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const apply = process.argv.includes('--apply');

function query(sql) {
  const cli = spawnSync(resolve('node_modules/.bin/supabase'), ['db','query','--linked','--project-ref',project,sql], { encoding:'utf8', maxBuffer: 32*1024*1024 });
  if (cli.status !== 0) throw new Error(`Administrative database query failed: ${cli.stderr || cli.stdout}`);
  return JSON.parse(cli.stdout).rows;
}
const tables = query("select distinct table_schema,table_name from information_schema.columns where table_schema in ('ml_private','ml_public') and column_name='studio_id' order by 1,2");
const graphSql = (studio) => `select jsonb_object_agg(label,rows) as graph from (${tables.map(({table_schema:s,table_name:t}) => `select '${s}.${t}' as label, coalesce((select jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text) from ${s}.${t} r where studio_id='${studio}'), '[]'::jsonb) as rows`).concat(`select 'ml_private.studios',coalesce((select jsonb_agg(to_jsonb(r)) from ml_private.studios r where id='${studio}'),'[]'::jsonb)`).join(' union all ')}) graph`;
const digestSql = (studio) => `select md5(graph::text) as checksum from (${graphSql(studio)}) g`;
const { data, error } = await admin.auth.admin.getUserById(target.user);
if (error || data.user?.email !== target.email) throw new Error('Target identity differs or no longer exists. Cleanup refused.');
const graph = query(graphSql(target.studio))[0].graph;
if (graph['ml_private.studios'].length !== 1 || graph['ml_private.studios'][0].owner_user_id !== target.user || graph['ml_private.garments'].length !== 5 || graph['ml_private.media_assets'].length || graph['ml_public.publications'].length || graph['ml_private.studio_members'].length !== 1 || graph['ml_private.studio_members'][0].user_id !== target.user) throw new Error('Expected five-garment, no-media, sole-owner workspace differs. Cleanup refused.');
const storage = query(`select id,bucket_id,name,owner_id from storage.objects where owner_id='${target.user}' or name like 'studios/${target.studio}/%'`);
if (storage.length) throw new Error('Unexpected owned storage objects: stop for review.');
const refs = query("select n.nspname as s,t.relname as t,a.attname as c,exists(select 1 from pg_attribute b where b.attrelid=t.oid and b.attname='studio_id') as scoped from pg_constraint f join pg_class t on t.oid=f.conrelid join pg_namespace n on n.oid=t.relnamespace join pg_attribute a on a.attrelid=t.oid and a.attnum=f.conkey[1] where f.contype='f' and f.confrelid='auth.users'::regclass and n.nspname in ('public','ml_private','ml_public')");
const refAssertions = refs.map(({s,t,c,scoped}) => `if exists(select 1 from ${s}.${t} where ${c}='${target.user}' and ${scoped ? `studio_id is distinct from '${target.studio}'::uuid` : s==='ml_private' && t==='studios' ? `id is distinct from '${target.studio}'::uuid` : s==='ml_private'&&t==='profiles' ? 'false' : 'true'}) then raise exception 'Unexpected other workspace/user reference: ${s}.${t}.${c}'; end if;`).join('\n');
query(`do $$ begin ${refAssertions} end $$`);
const targetDigest = query(digestSql(target.studio))[0].checksum;
const retainedDigest = query(digestSql(retained))[0].checksum;
const storageDigest = query("select md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'[]')) as checksum from storage.objects r")[0].checksum;
await mkdir(directory,{recursive:true,mode:0o700});
const backup = JSON.stringify({target,project,createdAt:new Date().toISOString(),graph,profile:query(`select to_jsonb(p) as profile from ml_private.profiles p where user_id='${target.user}'`),auth:data.user,storage,retainedDigest,storageDigest},null,2);
await writeFile(resolve(directory,'verified-backup.json'),backup,{mode:0o600});
await writeFile(resolve(directory,'verified-backup.sha256'),createHash('sha256').update(backup).digest('hex')+'\n',{mode:0o600});
const body = `select pg_advisory_xact_lock(hashtextextended('account-retirement:${target.user}',0));
select 1 from auth.users where id='${target.user}' for update;
select 1 from ml_private.studios where id='${target.studio}' for update;
do $$ begin
if (select email from auth.users where id='${target.user}') is distinct from '${target.email}' then raise exception 'Email differs'; end if;
if (select owner_user_id from ml_private.studios where id='${target.studio}') is distinct from '${target.user}'::uuid then raise exception 'Owner differs'; end if;
if (select checksum from (${digestSql(target.studio)}) d) <> '${targetDigest}' then raise exception 'Workspace changed since backup'; end if;
${refAssertions}
if exists(select 1 from storage.objects where owner_id='${target.user}' or name like 'studios/${target.studio}/%') then raise exception 'Unexpected storage ownership'; end if;
end $$;
select set_config('ml.canonical_operation_context','on',true);
select set_config('ml.operation_id','',true);
delete from auth.sessions where user_id='${target.user}';
delete from ml_private.editorial_collection_garments where studio_id='${target.studio}';
delete from ml_private.editorial_blocks where studio_id='${target.studio}';
delete from ml_private.portfolio_projects where studio_id='${target.studio}';
delete from ml_private.studios where id='${target.studio}';
do $$ begin
if (select checksum from (${digestSql(retained)}) d) <> '${retainedDigest}' then raise exception 'Retained workspace changed'; end if;
if (select md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'[]')) from storage.objects r) <> '${storageDigest}' then raise exception 'Storage changed'; end if;
end $$;`;
await writeFile(resolve(directory,'reviewed-removal.sql'),`begin;\n${body}\nrollback;\n`,{mode:0o600});
query(`begin; ${body} rollback; select 'dry-run passed' as result;`);
if (!apply) { console.log(JSON.stringify({status:'dry-run passed',target,retainedWorkspaceUnchanged:true,storageUnchanged:true,backup:directory})); process.exit(0); }
const banned = await admin.auth.admin.updateUserById(target.user,{ban_duration:'876000h'});
if (banned.error) throw new Error(`Session ban failed: ${banned.error.message}`);
query(`begin; ${body} commit; select 'workspace removed' as result;`);
const removed = await admin.auth.admin.deleteUser(target.user);
if (removed.error) throw new Error(`Workspace retired; Auth account remains banned. Retry trusted Auth deletion: ${removed.error.message}`);
const after = query(`select (select count(*) from auth.users where id='${target.user}') as users,(select count(*) from auth.sessions where user_id='${target.user}') as sessions,(select count(*) from ml_private.studio_members where user_id='${target.user}') as memberships`)[0];
if (Object.values(after).some((n)=>n!==0) || query(digestSql(retained))[0].checksum!==retainedDigest || query("select md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'[]')) as checksum from storage.objects r")[0].checksum!==storageDigest) throw new Error('Post-removal verification failed. Preserve backup and review.');
await writeFile(resolve(directory,'completion.json'),JSON.stringify({status:'removed',target,project,verifiedAt:new Date().toISOString(),retainedDigest,storageDigest,...after},null,2),{mode:0o600});
console.log(JSON.stringify({status:'removed',email:target.email,retainedWorkspaceUnchanged:true,storageUnchanged:true,...after}));
