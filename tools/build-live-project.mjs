import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,relative,isAbsolute,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const args=process.argv.slice(2);
const opt=k=>{const i=args.indexOf(k);return i<0?null:args.splice(i,2)[1]};
const id=opt('--project'),sequence=Number(opt('--sequence')),geometry=opt('--glb'),revision=opt('--revision');
const [input,out,...links]=args;
const fail=s=>{throw Error(s)};
if(!input||!out||!/^[a-f0-9]{32}$/.test(id||'')||!Number.isSafeInteger(sequence)||sequence<1)fail('Usage: build-live-project.mjs <project.json> <private-output-dir> --project <32 hex> --sequence <integer> [--revision R04] [--glb file] [legacy links or digests ...]');
const root=fileURLToPath(new URL('../',import.meta.url)),target=resolve(out),rel=relative(root,target);
if(rel===''||(!rel.startsWith('..')&&!isAbsolute(rel)))fail('Output must be outside the public repository');
const raw=JSON.parse(await readFile(input,'utf8')),p=structuredClone(raw.project||raw);
if(!/^camera-plan\/[1-6]$/.test(p.format)||!Array.isArray(p.cameras)||!p.cameras.length||!p.meta?.production||!p.meta?.venue||!p.meta?.revision||!Number.isFinite(p.pxPerMetre)||p.pxPerMetre<=0||![p.content?.width,p.content?.height].every(v=>Number.isFinite(v)&&v>0))fail('Incomplete project');
if(revision&&String(p.meta.revision)!==revision)fail('Revision mismatch');
const ids=new Set();
for(const c of p.cameras){if(!c.id||ids.has(String(c.id))||![c.x,c.y,c.heading].every(Number.isFinite))fail('Invalid or duplicate position');ids.add(String(c.id))}
await mkdir(join(target,'assets'),{recursive:true});
const digest=b=>createHash('sha256').update(b).digest('hex'),assets={};
async function store(bytes,ext,limit,extra={}){
  if(!bytes.length||bytes.length>limit)fail('Asset outside size budget');
  const name=digest(bytes)+'.'+ext;await writeFile(join(target,'assets',name),bytes);
  return {name,bytes:bytes.length,...extra};
}
if(p.background){
  const b=p.background,m=String(b.href||'').match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if(!m||b.width!==p.content.width||b.height!==p.content.height)fail('Raster and source frame differ');
  assets.background=await store(Buffer.from(m[2],'base64'),m[1]==='jpeg'?'jpg':m[1],20*1024*1024,{width:b.width,height:b.height});delete p.background;
}
if(!assets.background&&!p.vector)fail('No venue drawing');
if(geometry){
  const b=await readFile(geometry);
  if(b.length<20||b.readUInt32LE(0)!==0x46546c67||b.readUInt32LE(4)!==2||b.readUInt32LE(8)!==b.length)fail('Expected complete GLB 2.0');
  assets.geometry=await store(b,'glb',160*1024*1024);
}
if(p.previs?.registration)p.previs.registration.confirmed=false;
const manifest={format:'sightline-live/1',projectId:id,sequence,publishedAt:new Date().toISOString(),project:p,assets};
const bytes=Buffer.from(JSON.stringify(manifest));if(bytes.length>24*1024*1024)fail('Manifest too large');
await writeFile(join(target,'latest.json'),bytes);
const aliases=links.map(link=>{
  if(/^[a-f0-9]{64}$/.test(link))return link;
  const s=link.includes('#plan=')?link.split('#plan=')[1]:link;
  if(!/^[dj]\.[A-Za-z0-9_-]+$/.test(s))fail('Invalid legacy link');
  return digest(s);
});
await writeFile(join(target,'alias.json'),JSON.stringify({format:'sightline-alias/1',projectId:id}));
await writeFile(join(target,'publication.json'),JSON.stringify({projectId:id,sequence,revision:p.meta.revision,manifestKey:'projects/'+id+'/latest.json',accessKey:'projects/'+id+'/access.json',manifestSha256:digest(bytes),assetMetadata:JSON.stringify(Object.values(assets).map(a=>a.name)),assetKeys:Object.values(assets).map(a=>'projects/'+id+'/assets/'+a.name),aliasKeys:[...new Set(aliases)].map(a=>'context/'+a+'.json')},null,2));
console.log(JSON.stringify({revision:p.meta.revision,sequence,manifestBytes:bytes.length,positions:p.cameras.length,chains:new Set(p.cameras.map(c=>String(c.chainId||c.id))).size,assets:Object.keys(assets),aliases:aliases.length}));
