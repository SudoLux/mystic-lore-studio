import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
const siteId='3216e913-f78e-4b48-9040-a531830e7b1a';
const config=JSON.parse(await readFile(join(homedir(),'Library/Preferences/netlify/config.json'),'utf8'));
const token=config.users[config.userId].auth.token;
async function api(path,init={}){const r=await fetch(`https://api.netlify.com/api/v1${path}`,{...init,headers:{Authorization:`Bearer ${token}`,...init.headers}});if(!r.ok)throw new Error(`Netlify ${r.status}: ${await r.text()}`);return await r.json();}
const site=await api(`/sites/${siteId}`);assert.equal(site.name,'mystic-lore-studio');
const original=site.published_deploy.id;
const bytes=new Map();
async function scan(dir,prefix=''){for(const entry of await readdir(dir,{withFileTypes:true})){const path=prefix+'/'+entry.name;if(entry.isDirectory())await scan(join(dir,entry.name),path);else bytes.set(path,await readFile(join(dir,entry.name)));}}
await scan(resolve('dist'));
assert.ok([...bytes.values()].some(b=>b.includes(Buffer.from('iahrcupmyjnyyqszrmcx.supabase.co'))),'beta build required');
// Preserve the existing Netlify SPA fallback when using a manual file deploy.
if(!bytes.has('/_redirects'))bytes.set('/_redirects',Buffer.from('/* /index.html 200\n'));
const files=Object.fromEntries([...bytes].map(([path,data])=>[path,createHash('sha1').update(data).digest('hex')]));
let deploy=await api(`/sites/${siteId}/deploys`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({files,draft:true,title:'Practical-use QA preview'})});
let next=0;
await Promise.all(Array.from({length:4},async()=>{while(next<deploy.required.length){const hash=deploy.required[next++];const path=Object.keys(files).find(p=>files[p]===hash);await api(`/deploys/${deploy.id}/files${path.split('/').map(encodeURIComponent).join('/')}`,{method:'PUT',headers:{'Content-Type':'application/octet-stream'},body:bytes.get(path)});}}));
for(let attempt=0;attempt<45;attempt++){deploy=await api(`/deploys/${deploy.id}`);if(deploy.state==='ready')break;if(deploy.state==='error')throw new Error('Netlify preview processing failed');await new Promise(resolve=>setTimeout(resolve,1000));}
assert.equal(deploy.state,'ready');assert.equal((await api(`/sites/${siteId}`)).published_deploy.id,original,'production changed unexpectedly');
const result={testedAt:new Date().toISOString(),state:deploy.state,draft:true,deployId:deploy.id,url:deploy.deploy_ssl_url,productionUnchanged:true,files:Object.keys(files).length};
await mkdir('docs/implementation/evidence/practical-use',{recursive:true});await writeFile('docs/implementation/evidence/practical-use/preview-deploy.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
