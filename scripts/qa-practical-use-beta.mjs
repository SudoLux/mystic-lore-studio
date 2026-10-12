import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
process.loadEnvFile('.env.beta.import.local'); process.loadEnvFile('.env.beta.local');
const project='iahrcupmyjnyyqszrmcx', url=process.env.ML_BETA_SUPABASE_URL;
if(new URL(url).hostname!==`${project}.supabase.co`) throw new Error('Wrong beta project');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(url,process.env.ML_BETA_SERVICE_ROLE_KEY,options);
const anonKey=process.env.VITE_SUPABASE_ANON_KEY;
const a=createClient(url,anonKey,options), b=createClient(url,anonKey,options), anonymous=createClient(url,anonKey,options);
const email=`ml-practical-qa-${randomUUID()}@example.invalid`, password=randomBytes(24).toString('hex');
const checks=[]; let user,studio,path;
function check(label,value){assert.ok(value,label);checks.push(label);}
async function rpc(client,name,args){for(let attempt=0;;attempt++){const r=await client.schema('ml_private').rpc(name,args);if(r.error?.message==='JWT issued at future'&&attempt<3){await new Promise(resolve=>setTimeout(resolve,1500));continue;}if(r.error)throw new Error(`${name}: ${r.error.message}`);return r.data;}}
function sql(q){const r=spawnSync(resolve('node_modules/.bin/supabase'),['db','query','--linked','--project-ref',project,q],{encoding:'utf8',maxBuffer:8*1024*1024});if(r.status!==0)throw new Error(r.stderr||r.stdout);return JSON.parse(r.stdout).rows;}
async function commit(client,mutations){return rpc(client,'commit_canonical_operation',{p_operation_id:randomUUID(),p_studio_id:studio,p_garment_id:null,p_origin:'user',p_mutations:mutations});}
const mutation=(entityType,entityId,row,action='insert',baseRevision=null)=>({entityType,entityId,row,action,baseRevision});
async function read(client,table){const r=await client.schema('ml_private').from(table).select('*').eq('studio_id',studio).order('id');if(r.error)throw new Error(r.error.message);return r.data;}
try{
 const created=await admin.auth.admin.createUser({email,password,email_confirm:true});if(created.error)throw created.error;user=created.data.user.id;
 const [sa,sb]=await Promise.all([a.auth.signInWithPassword({email,password}),b.auth.signInWithPassword({email,password})]);check('independent sign-in sessions',!sa.error&&!sb.error&&sa.data.session.access_token!==sb.data.session.access_token);
 const duplicates=await Promise.all([email,email.toUpperCase(),`  ${email}  `,email,email].map(v=>createClient(url,anonKey,options).auth.signUp({email:v.trim().toLowerCase(),password})));
 const accounts=await admin.auth.admin.listUsers({perPage:1000});check('duplicate, case, whitespace, repeated and simultaneous signup create no second identity',accounts.data.users.filter(u=>u.email===email).length===1&&duplicates.every(r=>!r.data.session));
 const input={p_name:'Practical use QA',p_timezone:'America/Los_Angeles',p_units:'cm',p_currency:'USD',p_locale:'en-US'};
 const [wa,wb]=await Promise.all([rpc(a,'complete_studio_setup',input),rpc(b,'complete_studio_setup',input)]);studio=wa;check('simultaneous setup creates exactly one workspace',wa===wb);
 check('empty workspace stays empty',(await read(a,'garments')).length===0&&(await read(a,'media_assets')).length===0);
 const task=randomUUID(),g1=randomUUID(),g2=randomUUID(),media=randomUUID(),material=randomUUID(),variant=randomUUID(),story=randomUUID();
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY9sAAAAASUVORK5CYII=','base64');
 path=`studios/${studio}/assets/${media}/qa.png`;
 const upload=await a.storage.from('studio-assets').upload(path,png,{contentType:'image/png',upsert:false});if(upload.error)throw upload.error;
 let result=await commit(a,[mutation('garments',g1,{title:'QA garment one',garment_code:'QA-01'}),mutation('garments',g2,{title:'QA garment two',garment_code:'QA-02'}),mutation('tasks',task,{title:'QA task',garment_id:g1}),mutation('media_assets',media,{storage_path:path,original_filename:'qa.png',mime_type:'image/png',size_bytes:png.length,checksum:createHash('sha256').update(png).digest('hex')}),mutation('garment_media',randomUUID(),{garment_id:g1,asset_id:media,role:'hero'}),mutation('garment_media',randomUUID(),{garment_id:g2,asset_id:media,role:'hero'}),mutation('materials',material,{material_code:'QA-FABRIC',name:'Unused QA fabric',category:'Fabric'}),mutation('material_variants',variant,{material_id:material,color_name:'QA',sku:'QA'}),mutation('editorial_collections',story,{garment_id:g1,title:'QA draft story',template_type:'campaign'})]);
 check('creation and uploads acknowledged atomically',result.status==='applied');check('two fresh sessions see matching records',JSON.stringify(await read(a,'garments'))===JSON.stringify(await read(b,'garments')));
 const signed=await b.storage.from('studio-assets').createSignedUrl(path,1);if(signed.error)throw signed.error;const image=await fetch(signed.data.signedUrl);check('private image loads in a fresh second session',image.ok&&Buffer.from(await image.arrayBuffer()).equals(png));
 const denied=await anonymous.storage.from('studio-assets').createSignedUrl(path,60);check('anonymous private image denied',Boolean(denied.error));
 check('anonymous private workspace denied',Boolean((await anonymous.schema('ml_private').from('garments').select('id').eq('studio_id',studio)).error));
 result=await commit(a,[mutation('tasks',task,{title:'Edited on first device'},'update',1)]);check('cross-session edit acknowledged',result.status==='applied'&&(await read(b,'tasks'))[0].title==='Edited on first device');
 result=await commit(b,[mutation('tasks',task,{title:'Stale second device'},'update',1)]);check('concurrent stale edit returns conflict',result.status==='conflict');
 const deleteTaskOp=randomUUID();result=await rpc(a,'delete_studio_item',{p_studio_id:studio,p_kind:'task',p_item_id:task,p_expected_revision:2,p_operation_id:deleteTaskOp});check('task deletion acknowledged',result.status==='applied');
 result=await rpc(b,'delete_studio_item',{p_studio_id:studio,p_kind:'task',p_item_id:task,p_expected_revision:2,p_operation_id:deleteTaskOp});check('task deletion retry idempotent',result.status==='duplicate'&&(await read(b,'tasks')).length===0);
 result=await commit(b,[mutation('tasks',task,{title:'Stale insert'})]);check('deleted content stays deleted on stale device',result.status==='conflict'&&result.conflicts[0].reason==='deleted');
 await rpc(a,'delete_studio_item',{p_studio_id:studio,p_kind:'editorial',p_item_id:story,p_expected_revision:1,p_operation_id:randomUUID()});check('draft editorial deletion acknowledged',(await read(b,'editorial_collections')).length===0);
 await rpc(a,'delete_studio_item',{p_studio_id:studio,p_kind:'material_variant',p_item_id:variant,p_expected_revision:1,p_operation_id:randomUUID()});check('unused material deletion acknowledged',(await read(b,'material_variants')).length===0&&(await read(b,'materials')).length===0);
 await rpc(a,'delete_studio_item',{p_studio_id:studio,p_kind:'garment',p_item_id:g1,p_expected_revision:1,p_operation_id:randomUUID()});check('garment deletion preserves shared media',(await read(b,'garments')).length===1&&(await read(b,'garment_media')).length===1&&(await read(b,'media_assets')).length===1);
 const download=await b.storage.from('studio-assets').download(path);check('shared original bytes survive deletion',!download.error&&Buffer.from(await download.data.arrayBuffer()).equals(png));
 const refreshed=await b.auth.refreshSession();check('session refresh succeeds',!refreshed.error);
 const retainedProbe=await b.schema('ml_private').from('garments').select('id').eq('studio_id','586ab26d-9713-46b8-bfff-7534ceab7633');check('another account cannot read retained workspace',!retainedProbe.error&&retainedProbe.data.length===0);
 const crossDelete=await b.schema('ml_private').rpc('delete_studio_item',{p_studio_id:'586ab26d-9713-46b8-bfff-7534ceab7633',p_kind:'garment',p_item_id:g2,p_expected_revision:1,p_operation_id:randomUUID()});check('another account cannot delete retained records',Boolean(crossDelete.error));
 console.log(JSON.stringify({status:'passed',checks}));
 await mkdir('docs/implementation/evidence/practical-use',{recursive:true});await writeFile('docs/implementation/evidence/practical-use/backend-qa.json',JSON.stringify({testedAt:new Date().toISOString(),project,status:'passed',checks,physicalDevicesTested:false},null,2)+'\n');
} finally {
 if(studio){if(path){const r=await admin.storage.from('studio-assets').remove([path]);if(r.error)throw r.error;}sql(`begin; select set_config('ml.canonical_operation_context','on',true); delete from ml_private.editorial_collection_garments where studio_id='${studio}'; delete from ml_private.editorial_blocks where studio_id='${studio}'; delete from ml_private.portfolio_projects where studio_id='${studio}'; delete from ml_private.studios where id='${studio}'; commit; select 'test workspace removed' as result;`);}
 if(user){const r=await admin.auth.admin.deleteUser(user);if(r.error)throw r.error;}
}
