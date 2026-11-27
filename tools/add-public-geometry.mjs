// One-shot R2 binding transaction, not a network endpoint. A caller must
// authenticate independently and verify that deployed readers support scope.
import {publicRecord} from '../worker/public-projects.mjs';
import {createSpatialCore} from './spatial-core.mjs';

const idPattern=/^[a-f0-9]{32}$/,hashPattern=/^[a-f0-9]{64}$/;
const fail=message=>{throw Error(message)};
const hex=buffer=>Array.from(new Uint8Array(buffer),n=>n.toString(16).padStart(2,'0')).join('');
async function digest(bytes){return hex(await crypto.subtle.digest('SHA-256',bytes))}
const encode=value=>new TextEncoder().encode(JSON.stringify(value));

// Pin all fields that define the model-to-drawing coordinate frame, including
// the drawing asset and the proposed operator registration. Camera edits can
// proceed independently and are taken from the current R2 object at commit.
export async function geometryFrameDigest(record){
  const p=record?.project,reg=p?.previs?.registration||{};
  if(!p?.meta?.revision||!p?.content||!Number.isFinite(p.pxPerMetre)||!record?.assets?.background?.name)fail('Missing drawing frame');
  return digest(encode({revision:p.meta.revision,content:{width:p.content.width,height:p.content.height},pxPerMetre:p.pxPerMetre,background:record.assets.background,registration:{x:reg.x??0,y:reg.y??0,z:reg.z??0,rotation:reg.rotation??0}}));
}

/**
 * Add one approved, incomplete GLB without rebuilding a project from an old
 * local snapshot. The model must already be fitted to the approved drawing
 * frame through the existing registration: this helper never changes it.
 * Invoker must supply a trusted R2 binding and out-of-band
 * approval of this exact digest and frame; no credentials or URLs belong here.
 * A revision mismatch must be explicitly acknowledged; that is not evidence
 * of geometric registration. On conflict, stop and re-review, never blind retry.
 */
export async function addPublicGeometry({bucket,id,bytes,approvedDigest,approvedFrameDigest,sourceRevision,acknowledgeRevisionMismatch=false,publicReleaseApproved=false,scopeSupportConfirmed=false,clock=()=>new Date()}){
  if(!bucket||!idPattern.test(id||'')||!hashPattern.test(approvedDigest||'')||!hashPattern.test(approvedFrameDigest||''))fail('Invalid publication approval');
  if(publicReleaseApproved!==true||scopeSupportConfirmed!==true)fail('Public derivative approval and deployed scope support are required');
  if(typeof sourceRevision!=='string'||!sourceRevision.trim()||sourceRevision.length>128)fail('Record the model source revision');
  if(!(bytes instanceof Uint8Array)||bytes.byteLength<20||bytes.byteLength>160*1024*1024)fail('Invalid geometry bytes');
  // Pin a private copy so caller-side mutation cannot change approved bytes.
  bytes=Uint8Array.from(bytes);
  if(await digest(bytes)!==approvedDigest)fail('Approved geometry digest differs');
  createSpatialCore().parseGlb(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
  const key=`projects/${id}/latest.json`,current=await bucket.get(key);
  if(!current||!current.etag||current.size>2*1024*1024||current.customMetadata?.visibility!=='public')fail('Current public manifest unavailable');
  const raw=await current.arrayBuffer(),record=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));
  publicRecord(record,id);
  if(await geometryFrameDigest(record)!==approvedFrameDigest)fail('Drawing frame differs from approved frame');
  const revision=record.project.meta.revision,revisionMismatch=sourceRevision!==revision;
  if(revisionMismatch&&!acknowledgeRevisionMismatch)fail('Source and drawing revisions differ; explicit review required');
  if(record.assets?.geometry)fail('A geometry asset already exists; review replacement separately');
  let allowed;try{allowed=JSON.parse(current.customMetadata.assets)}catch{fail('Invalid current asset allowlist')}
  if(!Array.isArray(allowed)||!allowed.every(name=>typeof name==='string')||!Object.values(record.assets||{}).every(asset=>allowed.includes(asset.name)))fail('Current asset allowlist differs');
  const name=approvedDigest+'.glb',assetKey=`projects/${id}/assets/${name}`;
  let asset=await bucket.put(assetKey,bytes,{onlyIf:{etagDoesNotMatch:'*'},customMetadata:{publicDerivative:'1'},httpMetadata:{contentType:'model/gltf-binary'}});
  if(!asset){
    asset=await bucket.get(assetKey);
    if(!asset||asset.customMetadata?.publicDerivative!=='1'||asset.size!==bytes.byteLength||await digest(await asset.arrayBuffer())!==approvedDigest)fail('Existing derivative does not match approval');
  }
  const time=clock();if(!(time instanceof Date)||!Number.isFinite(time.getTime()))fail('Invalid publication timestamp');
  const next={...record,sequence:record.sequence+1,publishedAt:time.toISOString(),assets:{...record.assets,geometry:{name,bytes:bytes.byteLength,scope:'partial'}}};
  if(!Number.isSafeInteger(next.sequence))fail('Sequence exhausted');
  publicRecord(next,id);
  const payload=encode(next);if(payload.byteLength>2*1024*1024)fail('Updated manifest exceeds size limit');
  const customMetadata={...current.customMetadata,assets:JSON.stringify([...new Set([...allowed,name])])};
  const committed=await bucket.put(key,payload,{onlyIf:{etagMatches:current.etag},customMetadata,httpMetadata:current.httpMetadata});
  if(!committed)fail('Conflict: manifest changed; derivative left unreferenced. Re-read and review');
  return {projectId:id,sequence:next.sequence,asset:name,scope:'partial',drawingRevision:revision,sourceRevision,revisionMismatch,etag:committed.etag};
}
