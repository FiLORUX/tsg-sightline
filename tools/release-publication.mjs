import {writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {prepareLegacyPublication} from '../worker/public-projects.mjs';
const [mode]=process.argv.slice(2);
const digest=process.env.LEGACY_DIGEST,account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
const endpoint='https://tsg.thast.live/sightline/';
const fail=message=>{throw Error(message)};
if(!/^[a-f0-9]{64}$/.test(digest||''))fail('Invalid approved digest');
async function fetchBytes(url,headers={},limit=24*1024*1024){
  const r=await fetch(url,{headers,redirect:'manual',signal:AbortSignal.timeout(30000)});
  if(!r.ok)fail('Release preflight HTTP '+r.status);
  const b=new Uint8Array(await r.arrayBuffer());if(b.length>limit)fail('Release asset too large');
  return {r,b};
}
const decode=b=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b));
function verify(publication){
  const p=publication.project,cams=p.cameras||[];
  const info={revision:p.meta?.revision,scale:p.pxPerMetre,positions:cams.length,chains:new Set(cams.map(c=>c.chainId||c.id)).size,positiveThrows:cams.filter(c=>c.throwMetres>0).length};
  if(!/^R04(?:\s|$)/.test(info.revision||'')||Math.abs(info.scale-16.714640291524066)>1e-6||info.positions!==16||info.chains!==15||info.positiveThrows!==16||!publication.assets?.background||p.vector||p.background)fail('Approved R04 release facts differ');
  return info;
}
if(mode==='preflight'){
  if(!/^[a-f0-9]{32}$/.test(account||'')||!token)fail('Cloudflare deployment credential unavailable');
  const root='https://api.cloudflare.com/client/v4/accounts/'+account+'/r2/buckets/sightline-contexts/objects';
  const headers={Authorization:'Bearer '+token};
  const path='context/'+digest+'.json';
  const {r,b}=await fetchBytes(root+'/'+path,headers);
  const record=decode(b);
  const sourceHash=createHash('sha256').update(b).digest('hex');
  const p=await prepareLegacyPublication(record,'0'.repeat(32));
  console.log('Validated actual R2 source and public raster projection:',JSON.stringify(verify(p.publication)));
  await writeFile(process.env.RUNNER_TEMP+'/sightline-approval',digest+':'+sourceHash,{mode:0o600});
}else if(mode==='verify'){
  const html=await (await fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(30000)})).text();
  if(!html.includes('./view/alias/'))fail('Canonical host still serves old code');
  const current=await fetchBytes(endpoint+'view/alias/'+digest+'.json',{},2*1024*1024);
  const version=current.r.headers.get('X-Sightline-Version');
  if(!/^"[A-Za-z0-9._-]{1,128}"$/.test(version||''))fail('Strong application version missing at canonical proxy');
  const publication=decode(current.b);
  const info=verify(publication);
  if(publication.publication!=='public-view/1'||!/^[a-f0-9]{32}$/.test(publication.projectId||''))fail('Public manifest invalid');
  const asset=publication.assets.background;
  const {b}=await fetchBytes(endpoint+'view/project/'+publication.projectId+'/asset/'+asset.name,{},20*1024*1024);
  if(b.length!==asset.bytes||createHash('sha256').update(b).digest('hex')+'.png'!==asset.name)fail('Public raster hash mismatch');
  const edit=await fetch(endpoint+'context/admin/project/'+publication.projectId+'.json',{method:'PUT',headers:{Origin:'https://tsg.thast.live','Content-Type':'application/json'},body:'{}',redirect:'manual',signal:AbortSignal.timeout(30000)});
  if(![302,303,307,308,401,403].includes(edit.status))fail('Anonymous edit denial not verified: '+edit.status);
  console.log('LIVE: old link resolves public R04 with verified raster; anonymous edit denied.',JSON.stringify(info));
}else fail('Unknown release step');
