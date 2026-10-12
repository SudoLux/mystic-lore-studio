import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, chmod, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import JSZip from 'jszip';
import { canonicalCodecRegistry, canonicalMutableSnapshot, canonicalValueChecksum, encodeCanonicalMigrationRecord, SupabaseCanonicalWorkspaceRepository } from '../src/domains/persistence/index.ts';
import type { CanonicalWorkspaceState } from '../src/domains/workspace/index.ts';
import type { Database } from '../src/types/database.generated';

const actorColumns = new Set(['actor_id','approved_by','applied_by','assignee_id','created_by','decided_by','inspected_by','owner_id','published_by','released_by','requested_by','user_id','author_id']);
function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>`${key}:${stable(v)}`).join(',')}}`;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toISOString();
  return JSON.stringify(value);
}
function mapped(row: Record<string,unknown>, owner: string) {
  return Object.fromEntries(Object.entries(row).map(([key,value])=>[key,actorColumns.has(key)&&value?owner:value]));
}

async function rehearse() {
    console.log('Reading local runtime status');
    const status = JSON.parse(await readFile('/private/tmp/ml-recovery-local-status.json','utf8'));
    const localUrl = new URL(status.API_URL);
    check(['127.0.0.1','localhost'].includes(localUrl.hostname)&&localUrl.port==='55321','Recovery target must be the dedicated local runtime');
    const originalFetch=globalThis.fetch;
    globalThis.fetch=async(input,init)=>{
      const requestUrl=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
      check(['127.0.0.1','localhost'].includes(requestUrl.hostname)&&requestUrl.port==='55321','Recovery rehearsal attempted a non-local request');
      const callerSignal=init?.signal??(input instanceof Request?input.signal:null);
      const timeout=AbortSignal.timeout(30_000);
      return await originalFetch(input,{...init,signal:callerSignal?AbortSignal.any([callerSignal,timeout]):timeout});
    };
    const source = process.env.LOCAL_RECOVERY_BUNDLE;
    check(source,'Missing private recovery ZIP path');
    const privateDir=resolve('.private-backups/recovery-2026-10-11');
    await mkdir(privateDir,{recursive:true,mode:0o700});await chmod(privateDir,0o700);
    console.log('Copying private archive');
    const bundle=resolve(privateDir,'studio.mlstudio.zip');await copyFile(source,bundle);await chmod(bundle,0o600);
    console.log('Reading archive bytes');
    const zip=await JSZip.loadAsync(await readFile(bundle),{checkCRC32:true});
    console.log('Archive CRC verified');
    const envelope=JSON.parse(await zip.file('workspace.json')!.async('text')) as {format:string;checksum:string;state:CanonicalWorkspaceState};
    const manifest=JSON.parse(await zip.file('manifest.json')!.async('text')) as {format:string;workspaceChecksum:string;studioId:string;media:Array<{path:string;checksum:string;storagePath:string;mimeType:string}>};
    check(envelope.format==='ml-canonical-recovery-v2'&&manifest.format==='ml-canonical-media-manifest-v1','Incorrect archive format');
    check(envelope.state.studioId==='586ab26d-9713-46b8-bfff-7534ceab7633'&&manifest.studioId===envelope.state.studioId,'Recovery source identity mismatch');
    console.log('Verifying workspace checksum');
    check(await canonicalValueChecksum(envelope.state)===envelope.checksum&&manifest.workspaceChecksum===envelope.checksum,'Workspace checksum mismatch');
    console.log('Verifying archived media');
    let verifiedBytes=0;
    for(const asset of manifest.media){const entry=zip.file(asset.path);check(entry,`Missing media ${asset.path}`);const bytes=await entry.async('uint8array');check(createHash('sha256').update(bytes).digest('hex')===asset.checksum,`Archive media checksum mismatch: ${asset.path}`);verifiedBytes+=bytes.length;}
    console.log('Recovery archive validated');
    const options={auth:{persistSession:false,autoRefreshToken:false}};
    const admin=createClient<Database>(localUrl.href,status.SERVICE_ROLE_KEY,options);
    const users=await admin.auth.admin.listUsers({perPage:1000});if(users.error)throw new Error(users.error.message);
    check(users.data.users.every(user=>user.email?.startsWith('recovery-qa-')),'Local recovery runtime contains unrelated users');
    let localOwner=users.data.users[0];
    if(!localOwner){const created=await admin.auth.admin.createUser({email:`recovery-qa-${randomUUID()}@example.invalid`,password:randomBytes(24).toString('hex'),email_confirm:true});if(created.error)throw new Error(created.error.message);check(created.data.user,'Missing local recovery owner');localOwner=created.data.user;}
    console.log('Local recovery owner ready');
    const owner=localOwner.id;
    const members=createClient<Database>(localUrl.href,status.ANON_KEY,options);
    const link=await admin.auth.admin.generateLink({type:'magiclink',email:localOwner.email!});if(link.error)throw new Error(link.error.message);
    console.log('Local sign-in link ready');
    const session=await members.auth.verifyOtp({type:'magiclink',token_hash:link.data.properties.hashed_token});if(session.error)throw new Error(session.error.message);
    console.log('Local member session ready');
    const previousArgs=[...process.argv];const envKeys=['ML_BETA_SUPABASE_URL','ML_BETA_SERVICE_ROLE_KEY','ML_BETA_PROJECT_REF','ML_BETA_OWNER_USER_ID','ML_BETA_CONFIRM_ISOLATED','ML_BETA_ALLOW_LOCAL'];
    const previousEnv=Object.fromEntries(envKeys.map(key=>[key,process.env[key]]));
    try{
      Object.assign(process.env,{ML_BETA_SUPABASE_URL:localUrl.href,ML_BETA_SERVICE_ROLE_KEY:status.SERVICE_ROLE_KEY,ML_BETA_PROJECT_REF:'ml-recovery-20261011',ML_BETA_OWNER_USER_ID:owner,ML_BETA_CONFIRM_ISOLATED:'true',ML_BETA_ALLOW_LOCAL:'true'});
      process.argv[2]=bundle;
      console.log('Starting local restore/import');
      await import('./import-device-canonical-beta.ts');
      console.log('Local restore/import complete');
      const runtimeGlobal=globalThis as unknown as {window?:unknown};
      runtimeGlobal.window={setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
      const repository=new SupabaseCanonicalWorkspaceRepository(members);
      const restored=await (repository as unknown as {loadCloudState:(id:string)=>Promise<CanonicalWorkspaceState>}).loadCloudState(envelope.state.studioId);
      const expected=canonicalMutableSnapshot(envelope.state),actual=canonicalMutableSnapshot(restored);
      check(stable(Object.keys(expected).sort())===stable(Object.keys(actual).sort()),'Restored mutable record identities differ');
      for(const [key,row] of Object.entries(expected))check(stable(mapped(row,owner))===stable(actual[key]),`Restored record differs: ${key}`);
      let protectedRows=0;
      for(const codec of canonicalCodecRegistry.filter(c=>c.stateKey&&!c.mutable&&c.table!=='profiles')){
        const sourceRecords=envelope.state[codec.stateKey!] as unknown as Array<Record<string,unknown>>;
        const targetRecords=restored[codec.stateKey!] as unknown as Array<Record<string,unknown>>;
        if(!Array.isArray(sourceRecords)||!Array.isArray(targetRecords))continue;
        if(codec.table==='change_events'){
          const sourceIds=new Set(sourceRecords.map(row=>row.id));
          const extra=targetRecords.filter(row=>!sourceIds.has(row.id));
          check(extra.length===1&&extra[0].entityType==='studio_member'&&extra[0].operation==='role_change'&&extra[0].origin==='system','Unexpected extra recovery activity');
        }else check(sourceRecords.length===targetRecords.length,`Restored protected record count differs: ${codec.table}`);
        const byId=new Map(targetRecords.map(row=>[row.id,row]));
        for(const row of sourceRecords){const target=byId.get(row.id);check(target,`Missing protected identity: ${codec.table}`);check(stable(mapped(encodeCanonicalMigrationRecord(codec,row),owner))===stable(encodeCanonicalMigrationRecord(codec,target)),`Protected recovery payload differs: ${codec.table}`);protectedRows++;}
      }
      for(const asset of manifest.media){const downloaded=await members.storage.from('studio-assets').download(asset.storagePath);if(downloaded.error)throw new Error(downloaded.error.message);check(createHash('sha256').update(new Uint8Array(await downloaded.data.arrayBuffer())).digest('hex')===asset.checksum,'Restored storage checksum mismatch');}
      const anon=createClient<Database>(localUrl.href,status.ANON_KEY,options);
      const anonData=await anon.schema('ml_private').from('garments').select('id').eq('studio_id',envelope.state.studioId);check(Boolean(anonData.error)||anonData.data?.length===0,'Anonymous recovery workspace access was allowed');
      check(Boolean((await anon.storage.from('studio-assets').createSignedUrl(manifest.media[0].storagePath,60)).error),'Anonymous restored media access was allowed');
      await writeFile('docs/implementation/evidence/practical-use/recovery-restore.json',JSON.stringify({testedAt:new Date().toISOString(),status:'passed',target:'isolated local runtime, port 55321',sourceStudioId:envelope.state.studioId,workspaceChecksum:envelope.checksum,garments:restored.garments.length,mutableRows:Object.keys(actual).length,protectedRows,media:manifest.media.length,verifiedBytes,zipCrcVerified:true,memberHydrationPassed:true,anonymousPrivateAccessDenied:true,hostedWorkspaceModified:false},null,2)+'\n');
    }finally{
      process.argv=previousArgs;
      for(const key of envKeys){if(previousEnv[key]===undefined)delete process.env[key];else process.env[key]=previousEnv[key];}
      globalThis.fetch=originalFetch;
      delete (globalThis as unknown as {window?:unknown}).window;await members.auth.signOut({scope:'local'});
      // The calling test workflow destroys this dedicated local runtime and its
      // volumes. No hosted test account or credentials are created or printed.
    }
}
await rehearse();
