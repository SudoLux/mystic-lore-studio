import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir,writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
process.loadEnvFile('.env.beta.import.local');process.loadEnvFile('.env.beta.local');
const url=process.env.ML_BETA_SUPABASE_URL;
if(new URL(url).hostname!=='iahrcupmyjnyyqszrmcx.supabase.co')throw new Error('Wrong project');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(url,process.env.ML_BETA_SERVICE_ROLE_KEY,options);
const member=createClient(url,process.env.VITE_SUPABASE_ANON_KEY,options);
const studio='586ab26d-9713-46b8-bfff-7534ceab7633';
// Generate a one-use sign-in link administratively; no email is sent and no token is saved or printed.
const link=await admin.auth.admin.generateLink({type:'magiclink',email:'auriumdesigns@gmail.com'});if(link.error)throw link.error;
const verified=await member.auth.verifyOtp({type:'magiclink',token_hash:link.data.properties.hashed_token});if(verified.error)throw verified.error;
assert.equal(verified.data.user.id,'50cad3e7-6133-4e2c-bb05-3323df03cdcb');
try{
 let assets;
 for(let attempt=0;;attempt++){const r=await member.schema('ml_private').from('media_assets').select('*').eq('studio_id',studio);if(r.error?.message==='JWT issued at future'&&attempt<3){await new Promise(resolve=>setTimeout(resolve,1500));continue;}if(r.error)throw r.error;assets=r.data;break;}
 assert.equal(assets.length,41);
 let bytes=0, completed=0;const failures=[];let next=0;
 await Promise.all(Array.from({length:4},async()=>{while(next<assets.length){const asset=assets[next++];try{const r=await member.storage.from('studio-assets').createSignedUrl(asset.storage_path,60);if(r.error)throw r.error;const response=await fetch(r.data.signedUrl);if(!response.ok)throw new Error(`image HTTP ${response.status}`);const data=Buffer.from(await response.arrayBuffer());assert.equal(createHash('sha256').update(data).digest('hex'),asset.checksum);bytes+=data.length;completed++;}catch(error){failures.push({assetId:asset.id,error:error.message});}}}));
 const result={testedAt:new Date().toISOString(),studioId:studio,status:failures.length?'failed':'passed',freshMemberSession:true,expectedMedia:41,verifiedMedia:completed,verifiedBytes:bytes,failures,physicalDevicesTested:false};
 await mkdir('docs/implementation/evidence/practical-use',{recursive:true});await writeFile('docs/implementation/evidence/practical-use/retained-media.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(failures.length)process.exitCode=1;
}finally{await member.auth.signOut({scope:'local'});}
