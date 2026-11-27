// Private venue context. The fragment digest is a lookup key, never a credential.
// Authentication is checked at the origin even if X-Thast-Proxy is spoofed.
const HEADERS=Object.freeze({'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','Pragma':'no-cache','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer','Vary':'Cookie, CF-Access-Jwt-Assertion'});
const reply=(status,message)=>new Response(JSON.stringify({error:message}),{status,headers:HEADERS});
const decoder=new TextDecoder(),encoder=new TextEncoder();
function decode(s){
  if(!/^[A-Za-z0-9_-]+$/.test(s))throw Error('Invalid JWT encoding');
  return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(s.length/4)*4,'=')),c=>c.charCodeAt(0));
}
const keyCache=new WeakMap();
async function getSigningKey(issuer,kid,fetcher,clock){
  let issuers=keyCache.get(fetcher);
  if(!issuers){issuers=new Map();keyCache.set(fetcher,issuers)}
  const now=clock(),entry=issuers.get(issuer);
  if(entry&&entry.expires>now&&entry.keys.has(kid))return entry.keys.get(kid);
  if(entry&&entry.expires>now&&now-entry.checked<10000)return null;
  const res=await fetcher(issuer+'/cdn-cgi/access/certs',{redirect:'error',headers:{Accept:'application/json'}});
  if(!res.ok)return null;
  const jwks=await res.json();if(!Array.isArray(jwks.keys)||jwks.keys.length>32)return null;
  const keys=new Map();
  for(const jwk of jwks.keys){
    if(typeof jwk.kid!=='string'||jwk.kty!=='RSA'||jwk.alg&&jwk.alg!=='RS256')continue;
    try{keys.set(jwk.kid,await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']))}catch{}
  }
  if(!keys.size)return null;
  if(issuers.size>=8&&!issuers.has(issuer))issuers.delete(issuers.keys().next().value);
  issuers.set(issuer,{keys,checked:now,expires:now+300000});
  return keys.get(kid)||null;
}
export async function accessIdentity(token,issuer,audience,fetcher=fetch,clock=Date.now){
  if(typeof token!=='string'||token.length>16384||!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer)||!audience)return null;
  try{
    const pieces=token.split('.');if(pieces.length!==3)return null;
    const header=JSON.parse(decoder.decode(decode(pieces[0]))),claim=JSON.parse(decoder.decode(decode(pieces[1])));
    if(header.alg!=='RS256'||typeof header.kid!=='string'||header.kid.length>200)return null;
    const now=clock()/1000;
    if(claim.iss!==issuer||!(Array.isArray(claim.aud)?claim.aud.includes(audience):claim.aud===audience)||!Number.isFinite(claim.exp)||claim.exp<=now||claim.nbf!==undefined&&(!Number.isFinite(claim.nbf)||claim.nbf>now+30)||typeof claim.email!=='string'||!claim.email.includes('@'))return null;
    const key=await getSigningKey(issuer,header.kid,fetcher,clock);if(!key)return null;
    if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(pieces[2]),encoder.encode(pieces[0]+'.'+pieces[1])))return null;
    return claim.email.trim().toLowerCase();
  }catch{return null}
}

const CANONICAL_ORIGIN='https://tsg.thast.live';
const PROJECT=/^[a-f0-9]{32}$/;
const ASSET=/^[a-f0-9]{64}\.(png|jpg|webp|glb)$/;
const TYPES={png:'image/png',jpg:'image/jpeg',webp:'image/webp',glb:'model/gltf-binary'};
const MAX_MANIFEST=24*1024*1024,MAX_EDIT=2*1024*1024;
const discard=async o=>{try{await o?.body?.cancel()}catch{}};
function list(o,key){try{const a=JSON.parse(o.customMetadata?.[key]||'[]');return Array.isArray(a)?a:[]}catch{return []}}
function permitted(o,key,email){return list(o,key).some(e=>typeof e==='string'&&e.trim().toLowerCase()===email)}
function tag(o){const e=o.httpEtag||(typeof o.etag==='string'?'"'+o.etag+'"':'');return /^"[a-zA-Z0-9._-]{1,128}"$/.test(e)?e:null}
function headers(o,role,type='application/json; charset=utf-8'){
  const h=new Headers(HEADERS);h.set('Content-Type',type);const t=tag(o);if(t)h.set('ETag',t);
  if(role)h.set('X-Sightline-Role',role);
  if(Number.isSafeInteger(o.size)&&o.size>=0)h.set('Content-Length',String(o.size));return h;
}
function unchanged(req,o){return Boolean(tag(o)&&req.headers.get('If-None-Match')===tag(o))}
function notModified(o,role){const h=headers(o,role);h.delete('Content-Length');return new Response(null,{status:304,headers:h})}
function json(value,status=200,extra={}){return new Response(JSON.stringify(value),{status,headers:{...HEADERS,...extra}})}
async function readBounded(message,limit){
  const length=Number(message.headers?.get('Content-Length'));
  if(length>limit)throw Error('Body too large');
  if(!message.body)throw Error('Missing body');
  const rd=message.body.getReader(),parts=[];let total=0;
  try{for(;;){const {done,value}=await rd.read();if(done)break;total+=value.byteLength;if(total>limit){await rd.cancel();throw Error('Body too large')}parts.push(value)}}finally{rd.releaseLock()}
  const bytes=new Uint8Array(total);let offset=0;for(const chunk of parts){bytes.set(chunk,offset);offset+=chunk.byteLength}
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
const mounts=new Set(['tripodHeavy','ped','tripodDolly','tripodEng','crane','jib','steadicam','handheld','easyrig','robo','pov','rail','special']);
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1e9;
const point=p=>p&&finite(p.x)&&finite(p.y);
const plain=o=>o&&typeof o==='object'&&!Array.isArray(o);
function safeValue(v,depth=0){
  if(depth>8)return false;
  if(v===null||typeof v==='boolean')return true;
  if(typeof v==='number')return finite(v);
  if(typeof v==='string')return v.length<=4096;
  if(Array.isArray(v))return v.length<=10000&&v.every(x=>safeValue(x,depth+1));
  return plain(v)&&Object.keys(v).length<=160&&Object.entries(v).every(([k,x])=>/^[A-Za-z0-9_.-]{1,80}$/.test(k)&&!['__proto__','constructor','prototype'].includes(k)&&safeValue(x,depth+1));
}
export function applyLiveEdit(current,edit,now){
  if(current?.format!=='sightline-live/1'||!Number.isSafeInteger(current.sequence)||current.sequence<1||!plain(current.project)||!plain(edit)||!safeValue(edit))throw Error('Invalid edit');
  const keys=['cameras','dimensions','nextNumber','sheet'];
  if(Object.keys(edit).some(k=>!keys.includes(k))||!Array.isArray(edit.cameras)||edit.cameras.length>512||!Array.isArray(edit.dimensions)||edit.dimensions.length>2048||!Number.isSafeInteger(edit.nextNumber)||edit.nextNumber<1||edit.nextNumber>100000)throw Error('Invalid position schedule');
  const ids=new Set();
  for(const c of edit.cameras){
    if(!plain(c)||typeof c.id!=='string'||!c.id||c.id.length>128||ids.has(c.id)||!mounts.has(c.mount)||!point(c)||!finite(c.heading)||!Array.isArray(c.path)||c.path.length>4096||!c.path.every(point))throw Error('Invalid camera or duplicate position');
    ids.add(c.id);
  }
  if(!edit.dimensions.every(d=>plain(d)&&point(d.a)&&point(d.b)))throw Error('Invalid dimensions');
  const sheet=edit.sheet;
  if(!plain(sheet)||!['A0','A1','A2','A3','A4'].includes(sheet.paper)||typeof sheet.ratio!=='string'||sheet.ratio!=='fit'&&!/^\d{1,5}$/.test(sheet.ratio))throw Error('Invalid sheet');
  // Keep source geometry, frame, calibration evidence, asset references and
  // drawing identity under publication control. A browser Save edits the plot.
  return {...current,sequence:current.sequence+1,publishedAt:new Date(now).toISOString(),
    project:{...current.project,cameras:edit.cameras,dimensions:edit.dimensions,nextNumber:edit.nextNumber,sheet}};
}
const signInHTML='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sightline · Venue access</title><style>body{font:16px system-ui,sans-serif;background:#151a1f;color:#dfe6ec;padding:24px;max-width:32rem;margin:12vh auto}h1{font-size:24px}p{line-height:1.55;color:#b8c6d1}a{color:#9bc6ed}</style><script defer src="/sightline/context-return.js"></script></head><body><h1>Venue access confirmed</h1><p>Returning to Sightline…</p><p><a href="/sightline/">Open Sightline</a></p></body></html>';
export async function privateContext(request,env,{fetcher=fetch,clock=Date.now}={}){
  const url=new URL(request.url),path=url.pathname;
  const legacy=path.match(/^\/context\/([a-f0-9]{64})\.json$/);
  const live=path.match(/^\/context\/project\/([a-f0-9]{32})\.json$/);
  const asset=path.match(/^\/context\/project\/([a-f0-9]{32})\/asset\/([a-f0-9]{64}\.(?:png|jpg|webp|glb))$/);
  const events=path.match(/^\/context\/project\/([a-f0-9]{32})\/events$/);
  if(!(legacy||live||asset||events)||!env.SIGHTLINE_CONTEXTS||!env.SIGHTLINE_ACCESS_ISSUER||!env.SIGHTLINE_ACCESS_AUD)return reply(404,'Context unavailable');
  const write=request.method==='PUT';
  if(request.method!=='GET'&&!(write&&live))return reply(405,'Method not allowed');
  if((write||events)&&request.headers.get('Origin')!==CANONICAL_ORIGIN)return reply(403,'Origin not allowed');
  const email=await accessIdentity(request.headers.get('CF-Access-Jwt-Assertion'),env.SIGHTLINE_ACCESS_ISSUER,env.SIGHTLINE_ACCESS_AUD,fetcher,clock);
  if(!email)return reply(401,'Authorisation required');
  const bucket=env.SIGHTLINE_CONTEXTS;
  let id=live?.[1]||asset?.[1]||events?.[1]||null,object;
  if(legacy){
    object=await bucket.get('context/'+legacy[1]+'.json');
    if(!object)return reply(404,'Context unavailable');
    if(Object.hasOwn(object.customMetadata||{},'projectId')){
      id=object.customMetadata.projectId;await discard(object);object=null;
      if(typeof id!=='string'||!PROJECT.test(id))return reply(503,'Current publication unavailable');
    }
  }
  const key=id?'projects/'+id+'/latest.json':null;
  if(id){object=await bucket.get(key);if(!object)return reply(503,'Current publication unavailable')}
  let access=object;
  if(id){
    access=await bucket.head('projects/'+id+'/access.json');
    if(!access){await discard(object);return reply(403,'Project access unavailable')}
  }
  if(!permitted(access,'readers',email)){await discard(object);return reply(403,'Access denied')}
  const role=id&&permitted(access,'editors',email)?'editor':'viewer';
  if(!Number.isFinite(object.size)||object.size<0||object.size>MAX_MANIFEST){await discard(object);return reply(413,'Context too large')}
  if(events){
    await discard(object);
    if(!env.SIGHTLINE_EVENTS||request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return reply(426,'WebSocket required');
    const stub=env.SIGHTLINE_EVENTS.get(env.SIGHTLINE_EVENTS.idFromName(id));
    return stub.fetch('https://events.internal/subscribe',{headers:{Upgrade:'websocket'}});
  }
  if(asset){
    const name=asset[2],names=list(object,'assets');await discard(object);
    if(!ASSET.test(name)||!names.includes(name))return reply(404,'Current asset unavailable');
    const o=await bucket.get('projects/'+id+'/assets/'+name);if(!o)return reply(404,'Current asset unavailable');
    const ext=name.split('.').pop(),limit=ext==='glb'?160*1024*1024:20*1024*1024;
    if(!Number.isSafeInteger(o.size)||o.size<=0||o.size>limit){await discard(o);return reply(413,'Asset too large')}
    if(unchanged(request,o)){await discard(o);return notModified(o,role)}
    return new Response(o.body,{headers:headers(o,role,TYPES[ext])});
  }
  if(write){
    if(role!=='editor'){await discard(object);return reply(403,'Read-only access')}
    const expected=request.headers.get('If-Match');
    if(!expected||expected==='*'){await discard(object);return reply(428,'A current publication ETag is required')}
    if(expected!==tag(object)){await discard(object);return reply(412,'A newer publication exists')}
    if(!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||'')){await discard(object);return reply(415,'JSON required')}
    let next;
    try{
      const current=await readBounded(object,MAX_MANIFEST),edit=await readBounded(request,MAX_EDIT);
      if(current.projectId!==id)throw Error('Publication identity differs');
      next=applyLiveEdit(current,edit,clock());
    }catch(err){await discard(object);return reply(400,'Invalid project edit')}
    const body=JSON.stringify(next);
    if(new TextEncoder().encode(body).byteLength>MAX_MANIFEST)return reply(413,'Publication too large');
    const currentAccess=await bucket.head('projects/'+id+'/access.json');
    if(!currentAccess||!permitted(currentAccess,'readers',email)||!permitted(currentAccess,'editors',email))return reply(403,'Write permission withdrawn');
    const stored=await bucket.put(key,body,{onlyIf:{etagMatches:object.etag},customMetadata:{...object.customMetadata},httpMetadata:{contentType:'application/json',cacheControl:'private, no-store'}});
    if(!stored)return reply(412,'A newer publication exists');
    // Only an invalidation, not a payload, is sent over the socket. Every
    // client must reauthorise and fetch the committed current pointer.
    if(env.SIGHTLINE_EVENTS){try{await env.SIGHTLINE_EVENTS.get(env.SIGHTLINE_EVENTS.idFromName(id)).fetch('https://events.internal/changed',{method:'POST'})}catch{}}
    return json({sequence:next.sequence,publishedAt:next.publishedAt},200,{'ETag':tag(stored)||'','X-Sightline-Role':role});
  }
  if(url.searchParams.get('view')==='authorise'){
    await discard(object);
    return new Response(signInHTML,{headers:{...HEADERS,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"}});
  }
  if(unchanged(request,object)){await discard(object);return notModified(object,role)}
  return new Response(object.body,{headers:headers(object,role)});
}
