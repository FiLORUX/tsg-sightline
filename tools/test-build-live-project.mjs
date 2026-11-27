import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// All source material in this test is synthetic; release artefacts remain in
// a temporary directory outside the public repository.
const dir=await mkdtemp(join(tmpdir(),'sightline-build-'));
const script=fileURLToPath(new URL('./build-live-project.mjs',import.meta.url));
function fixtureGlb(){
  const bin=Buffer.alloc(36);
  [0,0,0,1,0,0,0,1,0].forEach((v,i)=>bin.writeFloatLE(v,i*4));
  const doc={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3'}],bufferViews:[{buffer:0,byteOffset:0,byteLength:bin.length}],buffers:[{byteLength:bin.length}]};
  let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
  const b=Buffer.alloc(12+8+json.length+8+bin.length);b.writeUInt32LE(0x46546c67,0);b.writeUInt32LE(2,4);b.writeUInt32LE(b.length,8);b.writeUInt32LE(json.length,12);b.writeUInt32LE(0x4e4f534a,16);json.copy(b,20);const offset=20+json.length;b.writeUInt32LE(bin.length,offset);b.writeUInt32LE(0x004e4942,offset+4);bin.copy(b,offset+8);return b;
}
try{
  const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const project={format:'camera-plan/6',meta:{production:'Synthetic',venue:'Fixture',revision:'R1'},content:{width:1,height:1},pxPerMetre:1,background:{href:png,width:1,height:1},cameras:[{id:'1',number:'1',mount:'tripodHeavy',x:0,y:0,heading:0,path:[]}],dimensions:[],nextNumber:2};
  const input=join(dir,'project.json'),model=join(dir,'synthetic.glb');await writeFile(input,JSON.stringify(project));await writeFile(model,fixtureGlb());
  const id='a'.repeat(32),base=[script,input,join(dir,'out'),'--project',id,'--sequence','1','--public-approved'];
  const run=(...extra)=>execFileSync(process.execPath,[...base,...extra],{stdio:'pipe'});
  run('--glb',model,'--geometry-scope','partial');
  let out=JSON.parse(await readFile(join(dir,'out','latest.json'),'utf8'));
  assert.equal(out.assets.geometry.scope,'partial');
  run('--glb',model);out=JSON.parse(await readFile(join(dir,'out','latest.json'),'utf8'));assert.equal(out.assets.geometry.scope,'unknown');
  assert.throws(()=>run('--geometry-scope','partial'),'scope without a model is rejected');
  assert.throws(()=>run('--glb',model,'--geometry-scope','unverified text'),'scope is constrained to a fixed vocabulary');
  const invalid=Buffer.alloc(20);invalid.writeUInt32LE(0x46546c67,0);invalid.writeUInt32LE(2,4);invalid.writeUInt32LE(20,8);await writeFile(model,invalid);
  assert.throws(()=>run('--glb',model),'a header-only GLB cannot be published');
  console.log('Live project builder: geometry scope and production parser validation passed.');
}finally{await rm(dir,{recursive:true,force:true})}
