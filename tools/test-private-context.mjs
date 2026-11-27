import assert from 'node:assert/strict';
import { accessIdentity, privateContext } from '../worker/private-context.mjs';
const issuer='https://test-team.cloudflareaccess.com',aud='synthetic-access-app',email='engineer@example.invalid',now=1700000000000;
const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk=await crypto.subtle.exportKey('jwk',keys.publicKey);jwk.kid='test-key';jwk.alg='RS256';
const fetcher=async url=>{assert.equal(url,issuer+'/cdn-cgi/access/certs');return Response.json({keys:[jwk]})};
const b64=x=>Buffer.from(x).toString('base64url');
async function jwt(claims={},header={}){
 const data=b64(JSON.stringify({alg:'RS256',kid:'test-key',...header}))+'.'+b64(JSON.stringify({iss:issuer,aud:[aud],exp:now/1000+300,email,...claims}));
 return data+'.'+b64(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(data)));
}
const token=await jwt(),ctx={fetcher,clock:()=>now},path='https://example.invalid/context/'+'a'.repeat(64)+'.json';
const req=(t=token,method='GET')=>new Request(path,{method,headers:t?{'CF-Access-Jwt-Assertion':t,'X-Thast-Proxy':'tsg'}:{'X-Thast-Proxy':'tsg'}});
let gets=0;const obj=(readers=[email])=>({size:2,customMetadata:{readers:JSON.stringify(readers)},body:new Response('{}').body});
const env={SIGHTLINE_ACCESS_ISSUER:issuer,SIGHTLINE_ACCESS_AUD:aud,SIGHTLINE_CONTEXTS:{async get(key){assert.equal(key,'context/'+'a'.repeat(64)+'.json');gets++;return obj()}}};
assert.equal(await accessIdentity(token,issuer,aud,fetcher,()=>now),email);
assert.equal(await accessIdentity(await jwt({aud:['other']}),issuer,aud,fetcher,()=>now),null);
assert.equal(await accessIdentity(await jwt({exp:now/1000-1}),issuer,aud,fetcher,()=>now),null);
assert.equal(await accessIdentity(await jwt({iss:'https://other.cloudflareaccess.com'}),issuer,aud,fetcher,()=>now),null);
const tampered=token.split('.');tampered[1]=b64(JSON.stringify({iss:issuer,aud:[aud],exp:now/1000+300,email:'intruder@example.invalid'}));
assert.equal(await accessIdentity(tampered.join('.'),issuer,aud,fetcher,()=>now),null);
assert.equal((await privateContext(req(),{},ctx)).status,404);
assert.equal((await privateContext(req(null),env,ctx)).status,401);assert.equal(gets,0);
assert.equal((await privateContext(req('forged'),env,ctx)).status,401);assert.equal(gets,0);
assert.equal((await privateContext(req(),{...env,SIGHTLINE_CONTEXTS:{async get(){return obj(['someone@example.invalid'])}}},ctx)).status,403);
const res=await privateContext(req(),env,ctx);assert.equal(res.status,200);assert.equal(res.headers.get('cache-control'),'private, no-store');assert.equal(await res.text(),'{}');
assert.equal((await privateContext(req(token,'POST'),env,ctx)).status,405);
console.log('Private context: signature, expiry, audience, issuer, ACL, disabled binding and no-store tests passed');
