// Public derivatives and owner-only mutations. No list or source-file endpoint.
import {accessIdentity,applyLiveEdit} from './private-context.mjs';
const OWNER='david@thast.se',ORIGIN='https://tsg.thast.live';
const ID=/^[a-f0-9]{32}$/,ASSET=/^[a-f0-9]{64}\.(png|jpg|webp|glb)$/;
const MIME={png:'image/png',jpg:'image/jpeg',webp:'image/webp',glb:'model/gltf-binary'};
const MAX_JSON=2*1024*1024,MAX_IMAGE=4*1024*1024,MAX_CREATE=8*1024*1024;
const BASE={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow, noarchive','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
const response=(body,status=200,extra={})=>new Response(JSON.stringify(body),{status,headers:{...BASE,'Content-Type':'application/json; charset=utf-8',...extra}});
const error=(status,message)=>response({error:message},status);
const str=(v,max=256)=>typeof v==='string'?v.slice(0,max):'';
const number=(v,lo,hi)=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi;
const scalar=v=>v===null||typeof v==='boolean'||typeof v==='string'&&v.length<=256||number(v,-1e9,1e9);
const pick=(o,keys)=>Object.fromEntries(keys.split(' ').filter(k=>scalar(o?.[k])).map(k=>[k,o[k]]));
const point=p=>{if(!number(p?.x,-1e9,1e9)||!number(p?.y,-1e9,1e9))throw Error('Invalid point');return {x:p.x,y:p.y}};
const CAM='id number label chainId positionRole mount body viewfinder lensName x y heading imagerId imagerWidth imagerHeight wide tele throwMetres height floorZ tilt roll headPan focalMm aspect cameraPresetId sensorModeId lensPresetId cameraMount lensMount extender adapterFactor cropFactor apertureStatus reachMin reachMax reach swing baseSize tail roam rf';
export function publicEdit(input){
  if(!input||!Array.isArray(input.cameras)||input.cameras.length>512||!Array.isArray(input.dimensions)||input.dimensions.length>2048)throw Error('Invalid schedule');
  const cameras=input.cameras.map(c=>{
    if(!c||!Array.isArray(c.path)||c.path.length>4096)throw Error('Invalid camera path');
    return {...pick(c,CAM),path:c.path.map(point),grip:pick(c.grip,'system head boomMode boomLength boomElevation pivotHeight headOffsetZ boomMin boomMax rearLength'),integratedOptics:c.integratedOptics?pick(c.integratedOptics,'wide tele hWide hTele aspect source removable'):null};
  });
  const edit={cameras,dimensions:input.dimensions.map(d=>({a:point(d.a),b:point(d.b)})),nextNumber:input.nextNumber,sheet:pick(input.sheet,'paper ratio')};
  // Reuse the existing position, chain and sheet structural checks.
  applyLiveEdit({format:'sightline-live/1',sequence:1,project:{}},edit,0);
  return edit;
}
export function publicProject(p){
  if(!p||!/^camera-plan\/[1-6]$/.test(p.format)||!number(p.content?.width,1,100000)||!number(p.content?.height,1,100000)||!number(p.pxPerMetre,.001,100000))throw Error('Invalid drawing frame');
  const meta={production:str(p.meta?.production)||'Untitled project',venue:str(p.meta?.venue),date:str(p.meta?.date,32),revision:str(p.meta?.revision,32)||'A',author:str(p.meta?.author)};
  const status=['estimated','user-confirmed','verified'].includes(p.scaleEvidence?.status)?p.scaleEvidence.status:'uncalibrated';
  // Source filenames, raw CAD, chain interface data, free-form private
  // references, logo blobs and arbitrary nested attachments are excluded.
  const calibrated=Boolean(p.calibrated)&&status!=='uncalibrated';
  return {format:p.format,meta,content:{width:p.content.width,height:p.content.height},pxPerMetre:p.pxPerMetre,calibrated,scaleEvidence:calibrated?{status,method:'Published drawing reference',source:'Published scale evidence',pxPerMetre:p.pxPerMetre}:null,
    ...publicEdit({...p,dimensions:p.dimensions||[],nextNumber:p.nextNumber||p.cameras?.length+1,sheet:p.sheet||{paper:'A3',ratio:'fit'}}),
    previs:{registration:{...pick(p.previs?.registration,'x y z rotation'),confirmed:false},target:Array.isArray(p.previs?.target)&&p.previs.target.length===3&&p.previs.target.every(v=>number(v,-1e6,1e6))?p.previs.target:[0,0,1.5]},background:null,vector:null,logo:null};
}
// Stable public codes only. A declaration is not a completeness guarantee.
export const GEOMETRY_LIMITATION_CODES=Object.freeze([
  'approximated-seating','omitted-seating','omitted-rigging','omitted-lighting',
  'omitted-pa','omitted-roof','omitted-people','omitted-materials',
  'omitted-video-screens','omitted-stage','omitted-architecture','omitted-fixtures',
  'preliminary-alignment','unverified-vertical-datum'
]);
export function geometryLimitations(value,{strict=false}={}){
  if(value==null)return {status:'unknown',items:[]};
  const validObject=typeof value==='object'&&!Array.isArray(value);
  const items=validObject&&Array.isArray(value.items)?value.items:[];
  const valid=validObject&&['unknown','declared'].includes(value.status)&&Array.isArray(value.items)&&items.length<=GEOMETRY_LIMITATION_CODES.length&&items.every(x=>GEOMETRY_LIMITATION_CODES.includes(x))&&new Set(items).size===items.length&&Object.keys(value).every(k=>['status','items'].includes(k))&&(value.status!=='declared'||items.length>0);
  if(strict&&!valid)throw Error('Invalid geometry limitations');
  const safe=[...new Set(items.slice(0,GEOMETRY_LIMITATION_CODES.length).filter(x=>GEOMETRY_LIMITATION_CODES.includes(x)))];
  return {status:valid&&value.status==='declared'?'declared':'unknown',items:safe};
}
function derivative(a,kind){
  if(!a||!ASSET.test(a.name)||!Number.isSafeInteger(a.bytes)||a.bytes<1||a.bytes>(kind==='geometry'?160:20)*1024*1024)throw Error('Invalid derivative');
  if(kind==='geometry'){
    if(!a.name.endsWith('.glb'))throw Error('Invalid geometry');
    // Completeness is a deliberately small public vocabulary: never expose
    // unreviewed source descriptions or private model metadata here. Missing
    // and unknown values remain conservative for older publications.
    let scope=['partial','complete'].includes(a.scope)?a.scope:'unknown';
    const limitations=geometryLimitations(a.limitations);
    // Explicit omissions or approximations contradict a completeness claim.
    if(scope==='complete'&&limitations.items.length)scope='partial';
    else if(scope==='complete'&&a.limitations!=null){try{geometryLimitations(a.limitations,{strict:true})}catch{scope='unknown'}}
    return {name:a.name,bytes:a.bytes,scope,limitations};
  }
  if(!/\.(png|jpg|webp)$/.test(a.name)||!Number.isSafeInteger(a.width)||!Number.isSafeInteger(a.height)||!number(a.width,1,16384)||!number(a.height,1,16384))throw Error('Invalid raster');
  return {name:a.name,bytes:a.bytes,width:a.width,height:a.height};
}
export function publicRecord(value,id){
  if(value?.format!=='sightline-live/1'||value.publication!=='public-view/1'||value.projectId!==id||!ID.test(id)||!Number.isSafeInteger(value.sequence)||value.sequence<1)throw Error('Invalid publication');
  const assets={};if(value.assets?.background)assets.background=derivative(value.assets.background,'background');if(value.assets?.geometry)assets.geometry=derivative(value.assets.geometry,'geometry');
  return {format:value.format,publication:'public-view/1',projectId:id,sequence:value.sequence,publishedAt:str(value.publishedAt,64),viewKind:assets.background?'drawing':'position-study',project:publicProject(value.project),assets};
}
const tag=o=>{const e=o.httpEtag||(o.etag?'"'+o.etag+'"':'');return /^"[A-Za-z0-9._-]{1,128}"$/.test(e)?e:null};
// HTTP intermediaries can weaken ETag when applying content encoding.
// The application version is the original R2 strong validator. It must
// survive transport transformations for compare-and-swap writes.
const versionHeaders=(etag,role)=>({ETag:etag,'X-Sightline-Version':etag,'X-Sightline-Role':role});
const drop=async o=>{try{await o?.body?.cancel()}catch{}};
async function readJSON(o,limit,expectedHash=null){
  if(Number(o.headers?.get('Content-Length')||o.size)>limit||!o.body)throw Error('Too large');
  const rd=o.body.getReader(),chunks=[];let n=0;
  try{for(;;){const x=await rd.read();if(x.done)break;n+=x.value.byteLength;if(n>limit){await rd.cancel();throw Error('Too large')}chunks.push(x.value)}}finally{rd.releaseLock()}
  const b=new Uint8Array(n);let off=0;for(const x of chunks){b.set(x,off);off+=x.length}if(expectedHash&&await hash(b)!==expectedHash)throw Error('Approved source changed');return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b));
}
const key=id=>'projects/'+id+'/latest.json';
const hash=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),v=>v.toString(16).padStart(2,'0')).join('');
const randomId=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');
function pubMeta(assets){return {visibility:'public',assets:JSON.stringify(Object.values(assets).map(a=>a.name))}}
async function current(bucket,id){
  const obj=await bucket.get(key(id));if(!obj)return {status:404};
  if(obj.customMetadata?.visibility!=='public'){await drop(obj);return {status:404}}
  if(!tag(obj)||!number(obj.size,1,MAX_JSON)){await drop(obj);return {status:503}}
  return {obj};
}
async function approvedObject(bucket,id,name,manifest){
  let names;try{names=JSON.parse(manifest.customMetadata.assets||'[]')}catch{return null}
  if(!Array.isArray(names)||!names.includes(name))return null;
  const a=await bucket.get('projects/'+id+'/assets/'+name);
  if(a&&a.customMetadata?.publicDerivative==='1')return a;
  await drop(a);return null;
}
async function identity(req,env,opts){
  return accessIdentity(req.headers.get('CF-Access-Jwt-Assertion'),env.SIGHTLINE_ACCESS_ISSUER,env.SIGHTLINE_ACCESS_AUD,opts.fetcher,opts.clock);
}
async function notify(env,id){
  if(env.SIGHTLINE_EVENTS){try{await env.SIGHTLINE_EVENTS.get(env.SIGHTLINE_EVENTS.idFromName(id)).fetch('https://events.internal/changed',{method:'POST'})}catch{}}
}
function pngBytes(src){
  if(typeof src!=='string'||src.length>Math.ceil(MAX_IMAGE/3)*4+64)throw Error('Image too large');
  const m=src.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);if(!m)throw Error('Expected rendered PNG');
  const bytes=Uint8Array.from(atob(m[1]),v=>v.charCodeAt(0));
  if(bytes.length<33||bytes.length>MAX_IMAGE||![137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82].every((v,i)=>bytes[i]===v))throw Error('Invalid PNG');
  const dv=new DataView(bytes.buffer),width=dv.getUint32(16),height=dv.getUint32(20);
  if(!number(width,1,4096)||!number(height,1,4096)||width*height>12000000)throw Error('Image dimensions exceed limit');
  const chunks=[bytes.subarray(0,8)];let offset=8,seenIDAT=false,ended=false,count=0;
  const allowed=new Set(['IHDR','PLTE','tRNS','IDAT','IEND','sRGB','gAMA','cHRM','pHYs']);
  while(offset<bytes.length){
    if(++count>8192||offset+12>bytes.length)throw Error('Invalid PNG framing');
    const len=dv.getUint32(offset),end=offset+len+12;
    if(end>bytes.length)throw Error('Truncated PNG');
    const type=String.fromCharCode(...bytes.subarray(offset+4,offset+8));
    if(!/^[A-Za-z]{4}$/.test(type)||type==='IHDR'&&offset!==8||offset===8&&type!=='IHDR')throw Error('Invalid PNG chunk');
    if(type==='IDAT')seenIDAT=true;
    if(type==='IEND'){if(len!==0||end!==bytes.length||!seenIDAT)throw Error('Invalid PNG ending');ended=true}
    if(allowed.has(type))chunks.push(bytes.subarray(offset,end));
    else if(type[0]===type[0].toUpperCase())throw Error('Unsupported PNG critical chunk');
    offset=end;
    if(ended)break;
  }
  if(!ended)throw Error('Incomplete PNG');
  const clean=new Uint8Array(chunks.reduce((n,c)=>n+c.length,0));let pos=0;
  for(const c of chunks){clean.set(c,pos);pos+=c.length}
  return {bytes:clean,width,height};
}
// Explicit release migration. An operator approves one exact private record
// by digest AND SHA-256 in the deployment environment. No other legacy context
// can become public. Keep the original record for authorised access/rollback.
export async function prepareLegacyPublication(record,id,clock=Date.now){
  if(record?.format!=='sightline-context/2'||!ID.test(id))throw Error('Invalid legacy source');
  const p=record.project,b=p?.background;
  if(!b||b.width!==p.content?.width||b.height!==p.content?.height||!p.cameras?.length)throw Error('Missing rendered drawing');
  const raster=pngBytes(b.href);
  if(raster.width!==b.width||raster.height!==b.height)throw Error('Drawing dimensions differ');
  const name=await hash(raster.bytes)+'.png';
  const publication=publicRecord({format:'sightline-live/1',publication:'public-view/1',projectId:id,sequence:1,publishedAt:new Date(clock()).toISOString(),project:p,assets:{background:{name,bytes:raster.bytes.length,width:raster.width,height:raster.height}}},id);
  const body=JSON.stringify(publication);
  if(new TextEncoder().encode(body).byteLength>MAX_JSON)throw Error('Publication too large');
  return {publication,body,raster:raster.bytes};
}
async function resolveLegacyAlias(bucket,digest,env,clock){
  const aliasKey='public-alias/'+digest+'.json';
  const existing=await bucket.head(aliasKey);
  if(existing)return ID.test(existing.customMetadata?.projectId||'')?{id:existing.customMetadata.projectId}:{status:409};
  const legacyKey='context/'+digest+'.json',legacy=await bucket.head(legacyKey);
  if(!legacy)return {status:404};
  if(ID.test(legacy.customMetadata?.projectId||''))return {id:legacy.customMetadata.projectId};
  // Pin the exact source bytes, independently of REST ETag representations.
  const approval=String(env.SIGHTLINE_PUBLIC_LEGACY_APPROVAL||'').split(':');
  if(approval.length!==2||approval[0]!==digest||! /^[a-f0-9]{64}$/.test(approval[1]))return {status:409};
  const sourceHash=approval[1],source=await bucket.get(legacyKey);
  if(!source)return {status:409};
  let record,prepared;
  try{record=await readJSON(source,24*1024*1024,sourceHash);prepared=await prepareLegacyPublication(record,'0'.repeat(32),clock)}catch{return {status:409}}
  // A CAS reservation ensures concurrent initial visits choose one opaque ID.
  // It is separate from the committed alias, which is written only after the
  // derivative and manifest exist. Never overwrite an edited publication.
  const reservation='migration/'+digest+'.json';
  let reserved=await bucket.head(reservation);
  if(!reserved){
    const candidate=randomId();
    const wrote=await bucket.put(reservation,'{}',{onlyIf:{etagDoesNotMatch:'*'},customMetadata:{projectId:candidate,sourceHash}});
    reserved=wrote||await bucket.head(reservation);
  }
  const id=reserved?.customMetadata?.projectId;
  if(!ID.test(id||'')||reserved.customMetadata.sourceHash!==sourceHash)return {status:409};
  prepared=await prepareLegacyPublication(record,id,clock);
  const name=prepared.publication.assets.background.name,assetKey='projects/'+id+'/assets/'+name;
  const existingManifest=await bucket.head(key(id));
  if(!existingManifest){
    const asset=await bucket.put(assetKey,prepared.raster,{onlyIf:{etagDoesNotMatch:'*'},customMetadata:{publicDerivative:'1'},httpMetadata:{contentType:'image/png'}});
    if(!asset&&!(await bucket.head(assetKey))?.customMetadata?.publicDerivative)return {status:409};
    await bucket.put(key(id),prepared.body,{onlyIf:{etagDoesNotMatch:'*'},customMetadata:pubMeta(prepared.publication.assets),httpMetadata:{contentType:'application/json',cacheControl:'private, no-store'}});
  }
  const available=await current(bucket,id);
  if(!available.obj)return {status:409};
  await drop(available.obj);
  const committed=await bucket.put(aliasKey,'{}',{onlyIf:{etagDoesNotMatch:'*'},customMetadata:{projectId:id,sourceHash},httpMetadata:{contentType:'application/json'}});
  const final=committed||await bucket.head(aliasKey);
  return final?.customMetadata?.projectId===id?{id}:{status:409};
}
async function createProject(req,env,opts){
  if(req.headers.get('Origin')!==ORIGIN)return error(403,'Origin not allowed');
  if(!env.SIGHTLINE_CREATE_LIMIT||!env.SIGHTLINE_TURNSTILE_SECRET||!env.SIGHTLINE_TURNSTILE_SITEKEY)return error(503,'Public publishing is not enabled');
  const ip=req.headers.get('CF-Connecting-IP')||'unknown';
  if(!(await env.SIGHTLINE_CREATE_LIMIT.limit({key:'publish:'+ip})).success)return error(429,'Try again later');
  if(!/^application\/json(?:;|$)/i.test(req.headers.get('Content-Type')||''))return error(415,'JSON required');
  let input,p,raster;
  try{input=await readJSON(req,MAX_CREATE);if(input?.consent!==true||typeof input.token!=='string'||input.token.length>2048||!input.token)throw Error('Consent and verification required');p=publicProject(input.project);raster=input.raster?pngBytes(input.raster):null}catch{return error(400,'Invalid project, consent or rendered image')}
  let verified;
  try{const r=await opts.fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:env.SIGHTLINE_TURNSTILE_SECRET,response:input.token,remoteip:ip==='unknown'?undefined:ip})});if(!r.ok)throw Error();verified=await r.json()}catch{return error(503,'Verification unavailable')}
  if(!verified.success||verified.hostname!=='tsg.thast.live'||verified.action!=='publish-project')return error(403,'Verification failed');
  const bucket=env.SIGHTLINE_CONTEXTS,id=randomId(),assets={};
  if(raster){const name=await hash(raster.bytes)+'.png';assets.background={name,bytes:raster.bytes.length,width:raster.width,height:raster.height};
    await bucket.put('projects/'+id+'/assets/'+name,raster.bytes,{onlyIf:{etagDoesNotMatch:'*'},customMetadata:{publicDerivative:'1'},httpMetadata:{contentType:'image/png'}})}
  const publication=publicRecord({format:'sightline-live/1',publication:'public-view/1',projectId:id,sequence:1,publishedAt:new Date(opts.clock()).toISOString(),project:p,assets},id);
  const body=JSON.stringify(publication);
  if(new TextEncoder().encode(body).byteLength>MAX_JSON)return error(413,'Project too large');
  const stored=await bucket.put(key(id),body,{onlyIf:{etagDoesNotMatch:'*'},customMetadata:pubMeta(assets),httpMetadata:{contentType:'application/json',cacheControl:'private, no-store'}});
  if(!stored)return error(409,'Create conflict; retry');
  return response({projectId:id,sequence:1,url:ORIGIN+'/sightline/#project='+id},201,{'ETag':tag(stored)||''});
}
const loginPage='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Sightline · Editor access</title><style>body{font:16px system-ui,sans-serif;background:#151a1f;color:#e2ebee;max-width:28rem;margin:12vh auto;padding:24px}h1{font-size:24px}p{color:#9aadb8;line-height:1.5}a{color:#93c9ee}</style><script defer src="/sightline/context-return.js"></script></head><body><p>TSG / SIGHTLINE</p><h1>Editor access confirmed</h1><p>Your owner session is ready. Return to the project to continue editing.</p><p><a href="/sightline/">Open Sightline</a></p></body></html>';
export async function publicContext(req,env,{fetcher=fetch,clock=Date.now}={}){
  const opts={fetcher,clock},url=new URL(req.url),path=url.pathname,bucket=env.SIGHTLINE_CONTEXTS;
  if(!bucket)return error(503,'Project service unavailable');
  if(path==='/view/config'&&req.method==='GET')return response({sitekey:env.SIGHTLINE_TURNSTILE_SECRET&&env.SIGHTLINE_CREATE_LIMIT?env.SIGHTLINE_TURNSTILE_SITEKEY||null:null});
  if(path==='/view/create')return req.method==='POST'?createProject(req,env,opts):error(405,'Method not allowed');
  const admin=path.startsWith('/context/admin/');
  if(admin){
    const email=await identity(req,env,opts);if(email!==OWNER)return error(email?403:401,'Editor access required');
    if(path==='/context/admin/session'&&req.method==='GET')return response({role:'editor'});
    if(path==='/context/admin/login'&&req.method==='GET')return new Response(loginPage,{headers:{...BASE,'Content-Type':'text/html; charset=utf-8'}});
  }
  const alias=path.match(/^\/view\/alias\/([a-f0-9]{64})\.json$/);
  const manifest=path.match(/^\/view\/project\/([a-f0-9]{32})\.json$/);
  const asset=path.match(/^\/view\/project\/([a-f0-9]{32})\/asset\/([a-f0-9]{64}\.(?:png|jpg|webp|glb))$/);
  const events=path.match(/^\/view\/project\/([a-f0-9]{32})\/events$/);
  const save=path.match(/^\/context\/admin\/project\/([a-f0-9]{32})\.json$/);
  if(!(alias||manifest||asset||events||save))return error(404,'Project not found');
  if(save?req.method!=='PUT':req.method!=='GET')return error(405,'Method not allowed');
  if((save||events)&&req.headers.get('Origin')!==ORIGIN)return error(403,'Origin not allowed');
  let id=manifest?.[1]||asset?.[1]||events?.[1]||save?.[1];
  if(alias){const resolved=await resolveLegacyAlias(bucket,alias[1],env,clock);if(!resolved.id)return error(resolved.status||409,resolved.status===404?'Unregistered link':'Current publication has not been migrated');id=resolved.id}
  const result=await current(bucket,id);if(!result.obj)return error(alias?409:result.status,'Current publication unavailable');
  const o=result.obj,etag=tag(o);
  if(events){await drop(o);if(!env.SIGHTLINE_EVENTS||req.headers.get('Upgrade')?.toLowerCase()!=='websocket')return error(426,'WebSocket required');return env.SIGHTLINE_EVENTS.get(env.SIGHTLINE_EVENTS.idFromName(id)).fetch('https://events.internal/subscribe',{headers:{Upgrade:'websocket'}})}
  if(asset){const name=asset[2],a=await approvedObject(bucket,id,name,o);await drop(o);if(!a)return error(404,'Derivative unavailable');
    const ext=name.split('.').pop(),limit=(ext==='glb'?160:20)*1024*1024;
    if(!number(a.size,1,limit)){await drop(a);return error(413,'Derivative too large')}
    const headers={...BASE,'Content-Type':MIME[ext],'Cache-Control':'public, max-age=86400, immutable','ETag':tag(a)||'','Content-Length':String(a.size)};
    if(tag(a)&&req.headers.get('If-None-Match')===tag(a)){await drop(a);delete headers['Content-Length'];return new Response(null,{status:304,headers})}
    return new Response(a.body,{headers})}
  if(!save&&req.headers.get('If-None-Match')===etag){await drop(o);return new Response(null,{status:304,headers:{...BASE,...versionHeaders(etag,'viewer')}})}
  if(save){
    const expected=req.headers.get('If-Match');if(!expected||expected==='*'){await drop(o);return error(428,'Current ETag required')}
    if(expected!==etag){await drop(o);return error(412,'Newer publication exists')}
    if(!/^application\/json(?:;|$)/i.test(req.headers.get('Content-Type')||'')){await drop(o);return error(415,'JSON required')}
    let next;try{const old=publicRecord(await readJSON(o,MAX_JSON),id);const raw=await readJSON(req,MAX_JSON);
      if(Object.keys(raw).some(k=>!['cameras','dimensions','nextNumber','sheet'].includes(k)))throw Error('Immutable source');next=publicRecord(applyLiveEdit(old,publicEdit(raw),clock()),id)
    }catch{return error(400,'Invalid project edit')}
    const body=JSON.stringify(next);if(new TextEncoder().encode(body).byteLength>MAX_JSON)return error(413,'Project too large');
    const written=await bucket.put(key(id),body,{onlyIf:{etagMatches:o.etag},customMetadata:pubMeta(next.assets),httpMetadata:{contentType:'application/json',cacheControl:'private, no-store'}});
    if(!written)return error(412,'Newer publication exists');
    await notify(env,id);return response({sequence:next.sequence,publishedAt:next.publishedAt},200,versionHeaders(tag(written)||'','editor'));
  }
  try{return response(publicRecord(await readJSON(o,MAX_JSON),id),200,versionHeaders(etag,'viewer'))}catch{return error(503,'Invalid current publication')}
}
// Retained legacy endpoint is owner-only even if an old Access policy grants
// other identities. Public viewers must use the derivative projection above.
export async function legacyOwner(request,env,opts={fetcher:fetch,clock:Date.now}){return await identity(request,env,opts)===OWNER}
