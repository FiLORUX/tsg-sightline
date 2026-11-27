// Private venue context. The fragment digest is a lookup key, never a credential.
// Authentication is checked at the origin even if X-Thast-Proxy is spoofed.
const HEADERS=Object.freeze({'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','Pragma':'no-cache','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer','Vary':'Cookie, CF-Access-Jwt-Assertion'});
const reply=(status,message)=>new Response(JSON.stringify({error:message}),{status,headers:HEADERS});
const decoder=new TextDecoder(),encoder=new TextEncoder();
function decode(s){
  if(!/^[A-Za-z0-9_-]+$/.test(s))throw Error('Invalid JWT encoding');
  return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(s.length/4)*4,'=')),c=>c.charCodeAt(0));
}
export async function accessIdentity(token,issuer,audience,fetcher=fetch,clock=Date.now){
  if(typeof token!=='string'||token.length>16384||!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer)||!audience)return null;
  try{
    const pieces=token.split('.');if(pieces.length!==3)return null;
    const header=JSON.parse(decoder.decode(decode(pieces[0]))),claim=JSON.parse(decoder.decode(decode(pieces[1])));
    if(header.alg!=='RS256'||typeof header.kid!=='string'||header.kid.length>200)return null;
    const now=clock()/1000;
    if(claim.iss!==issuer||!(Array.isArray(claim.aud)?claim.aud.includes(audience):claim.aud===audience)||!Number.isFinite(claim.exp)||claim.exp<=now||claim.nbf!==undefined&&(!Number.isFinite(claim.nbf)||claim.nbf>now+30)||typeof claim.email!=='string'||!claim.email.includes('@'))return null;
    const res=await fetcher(issuer+'/cdn-cgi/access/certs',{redirect:'error',headers:{Accept:'application/json'}});
    if(!res.ok)return null;
    const jwks=await res.json(),jwk=jwks.keys?.find(k=>k.kid===header.kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256'));
    if(!jwk)return null;
    const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
    if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(pieces[2]),encoder.encode(pieces[0]+'.'+pieces[1])))return null;
    return claim.email.trim().toLowerCase();
  }catch{return null}
}
export async function privateContext(request,env,{fetcher=fetch,clock=Date.now}={}){
  const path=new URL(request.url).pathname;
  const match=path.match(/^\/context\/([a-f0-9]{64})\.json$/);
  if(!match||!env.SIGHTLINE_CONTEXTS||!env.SIGHTLINE_ACCESS_ISSUER||!env.SIGHTLINE_ACCESS_AUD)return reply(404,'Context unavailable');
  if(request.method!=='GET')return reply(405,'GET required');
  const email=await accessIdentity(request.headers.get('CF-Access-Jwt-Assertion'),env.SIGHTLINE_ACCESS_ISSUER,env.SIGHTLINE_ACCESS_AUD,fetcher,clock);
  if(!email)return reply(401,'Authorisation required');
  const object=await env.SIGHTLINE_CONTEXTS.get('context/'+match[1]+'.json');
  if(!object)return reply(404,'Context unavailable');
  let readers=[];
  try{readers=JSON.parse(object.customMetadata?.readers||'[]')}catch{}
  if(!Array.isArray(readers)||!readers.some(e=>typeof e==='string'&&e.trim().toLowerCase()===email)){
    await object.body?.cancel().catch(()=>{});return reply(403,'Access denied');
  }
  if(!Number.isFinite(object.size)||object.size>24*1024*1024){await object.body?.cancel().catch(()=>{});return reply(413,'Context too large')}
  // The sign-in link opens a status page, not a raw private drawing.
  // The original app tab retries the same authenticated JSON request on return.
  if(new URL(request.url).searchParams.get('view')==='authorise'){
    await object.body?.cancel().catch(()=>{});
    const headers={...HEADERS,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"};
    return new Response('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sightline · Venue access</title><style>body{font:16px system-ui,sans-serif;background:#151a1f;color:#dfe6ec;padding:24px;max-width:32rem;margin:12vh auto}h1{font-size:24px}p{line-height:1.55;color:#b8c6d1}</style></head><body><h1>Venue access confirmed</h1><p>Return to your original Sightline tab. The venue drawing will be requested again automatically. If necessary, use Retry.</p><p>You can close this tab.</p></body></html>',{headers});
  }
  return new Response(object.body,{headers:HEADERS});
}
