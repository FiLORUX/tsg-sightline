import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium} from 'playwright';

// All geometry and project data are synthetic. Never use this as venue evidence.
const bin=Buffer.alloc(36);[0,0,0,1,0,0,0,1,0].forEach((n,i)=>bin.writeFloatLE(n,i*4));
const doc={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3'}],bufferViews:[{buffer:0,byteLength:36}],buffers:[{byteLength:36}]};
let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
const bytes=Buffer.alloc(20+json.length+8+bin.length);bytes.writeUInt32LE(0x46546c67,0);bytes.writeUInt32LE(2,4);bytes.writeUInt32LE(bytes.length,8);bytes.writeUInt32LE(json.length,12);bytes.writeUInt32LE(0x4e4f534a,16);json.copy(bytes,20);const offset=20+json.length;bytes.writeUInt32LE(bin.length,offset);bytes.writeUInt32LE(0x004e4942,offset+4);bin.copy(bytes,offset+8);
const name=createHash('sha256').update(bytes).digest('hex')+'.glb',id='a'.repeat(32);
let sequence=1,scope='complete',limits={status:'declared',items:['approximated-seating','omitted-rigging','omitted-lighting','omitted-pa','preliminary-alignment','unverified-vertical-datum']};
const manifest=()=>({format:'sightline-live/1',publication:'public-view/1',projectId:id,sequence,publishedAt:'2026-01-01T00:00:00Z',viewKind:'position-study',project:{format:'camera-plan/6',meta:{production:'Synthetic',revision:'A'},content:{width:100,height:100},pxPerMetre:10,cameras:[],dimensions:[],nextNumber:1,sheet:{paper:'A3',ratio:'fit'},previs:{registration:{x:0,y:0,z:0,rotation:0},target:[0,0,1.5]},background:null,vector:null},assets:{geometry:{name,bytes:bytes.length,scope,limitations:limits}}});
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(path===`/sightline/view/project/${id}.json`){res.writeHead(200,{'Content-Type':'application/json','ETag':`"v${sequence}"`,'X-Sightline-Version':`"v${sequence}"`});res.end(JSON.stringify(manifest()));return}
  if(path===`/sightline/view/project/${id}/asset/${name}`){res.writeHead(200,{'Content-Type':'model/gltf-binary'});res.end(bytes);return}
  const file=path==='/sightline/'?'index.html':path==='/sightline/geometry-worker.js'?'geometry-worker.js':null;
  if(!file){res.writeHead(404);res.end();return}
  res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html':'text/javascript'});res.end(await readFile(new URL('../'+file,import.meta.url)));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
const text=async value=>page.waitForFunction(value=>document.getElementById('previs-info').textContent.includes(value),value);
try{
  await page.goto(`http://127.0.0.1:${server.address().port}/sightline/#project=${id}`);
  await page.waitForFunction(()=>document.getElementById('live-status').dataset.state==='ready');
  await page.locator('#action-previs').click();
  await text('Declared model limitations');assert((await page.locator('#previs-status').textContent()).includes('Partial model'),'explicit omissions downgrade a complete claim');await text('Seating is approximated');await text('Rigging omitted');await text('Lighting omitted');await text('PA omitted');await text('Alignment is preliminary and unverified');await text('Vertical datum and model height are unverified');await text('Other omissions or approximations may also exist');
  // Same asset, new manifest: retain mesh but immediately update limitations.
  limits={status:'declared',items:['omitted-roof']};sequence++;
  await page.locator('#live-retry').evaluate(e=>e.click());await text('Roof omitted');
  assert(!(await page.locator('#previs-info').textContent()).includes('Seating is approximated'));
  // Defence in depth if a nonconforming endpoint supplies private strings.
  limits={status:'declared',items:['PRIVATE SOURCE'],notes:'PRIVATE'};sequence++;
  await page.locator('#live-retry').evaluate(e=>e.click());await text('Model limitations unknown');await page.waitForFunction(()=>document.getElementById('previs-status').textContent.includes('Model scope unknown'));
  assert(!(await page.locator('#previs-info').textContent()).includes('PRIVATE'));
  assert.deepEqual(errors,[]);console.log('Public geometry limitations: known, updated, filtered and conservative states passed.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
