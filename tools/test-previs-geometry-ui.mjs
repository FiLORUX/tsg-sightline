import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

// Synthetic venue and wall: never rely on these assertions for a real venue.
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  const file=path==='/sightline/'?'index.html':path==='/sightline/geometry-worker.js'?'geometry-worker.js':null;
  if(!file){res.writeHead(404);res.end();return}
  res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html':'text/javascript'});res.end(await readFile(new URL('../'+file,import.meta.url)));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}), errors=[];
page.on('pageerror',e=>errors.push(e.message));
const text=async(id,value)=>page.waitForFunction(({id,value})=>document.getElementById(id).textContent.includes(value),{id,value});
function glb(){
  const bin=Buffer.alloc(36);[9,0,-15,11,0,-15,10,3,-15].forEach((n,i)=>bin.writeFloatLE(n,i*4));
  const doc={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3'}],bufferViews:[{buffer:0,byteLength:36}],buffers:[{byteLength:36}]};
  let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
  const b=Buffer.alloc(20+json.length+8+bin.length);b.writeUInt32LE(0x46546c67,0);b.writeUInt32LE(2,4);b.writeUInt32LE(b.length,8);b.writeUInt32LE(json.length,12);b.writeUInt32LE(0x4e4f534a,16);json.copy(b,20);const o=20+json.length;b.writeUInt32LE(bin.length,o);b.writeUInt32LE(0x004e4942,o+4);bin.copy(b,o+8);return b;
}
try{
  await page.goto(`http://127.0.0.1:${server.address().port}/sightline/`);
  const camera=(id,x,y)=>({id,number:id,label:'Synthetic '+id,mount:'tripodHeavy',x,y,heading:0,height:1.5,wide:8.4,tele:100,imagerWidth:9.59,throwMetres:10,path:[]});
  const background=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=400;const ctx=c.getContext('2d');ctx.fillStyle='#ff0000';ctx.fillRect(0,0,400,400);return c.toDataURL('image/png')});
  const project={format:'camera-plan/5',content:{width:400,height:400},pxPerMetre:10,calibrated:true,background:{href:background,width:400,height:400},cameras:[camera('1',20,20),camera('2',380,380)],dimensions:[]};
  await page.locator('#file-project').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});await text('chain-summary','2 unique chains');
  await page.locator('#scale-source').fill('Synthetic control');await page.locator('#action-confirm-scale').click();await text('readout-calibration','User-confirmed');
  await page.locator('#action-previs').click();await text('previs-info','No venue model');
  await page.waitForTimeout(500);const withPlan=await page.locator('#previs-canvas').screenshot();
  await page.locator('#previs-show-plan').uncheck();await page.waitForTimeout(200);assert.notDeepEqual(await page.locator('#previs-canvas').screenshot(),withPlan,'plan reference can be hidden');
  await page.locator('#previs-show-plan').check();await page.waitForTimeout(200);assert.deepEqual(await page.locator('#previs-canvas').screenshot(),withPlan,'plan reference can be restored');
  // Compute the projected second camera from the known synthetic overview.
  const pos=await page.locator('#previs-canvas').evaluate(c=>{
    const rect=c.getBoundingClientRect(), aspect=c.clientWidth/c.clientHeight, a=35*Math.PI/180,t=-45*Math.PI/180;
    const f=[Math.sin(a)*Math.cos(t),Math.cos(a)*Math.cos(t),Math.sin(t)],right=[Math.cos(a),-Math.sin(a),0],up=[-Math.sin(a)*Math.sin(t),-Math.cos(a)*Math.sin(t),Math.cos(t)], centre=[20,20,.75];
    const span=Math.hypot(36,36,1.5),dist=span*.6/Math.sin(Math.atan(Math.tan(32*Math.PI/180)/Math.max(1,aspect))),origin=centre.map((v,i)=>v-f[i]*dist),d=[38-origin[0],2-origin[1],1.5-origin[2]],dot=v=>d.reduce((s,n,i)=>s+n*v[i],0),z=dot(f),x=dot(right)/(z*Math.tan(32*Math.PI/180)),y=dot(up)/(z*Math.tan(32*Math.PI/180)/aspect);
    return {x:rect.left+(x+1)*rect.width/2,y:rect.top+(1-y)*rect.height/2};
  });
  await page.mouse.click(pos.x,pos.y);await page.waitForFunction(()=>document.getElementById('previs-camera').value==='2');
  await page.locator('#previs-camera').selectOption('1');
  await page.locator('#previs-file').setInputFiles({name:'wall.glb',mimeType:'model/gltf-binary',buffer:glb()});await text('previs-model','1 triangles');
  await text('previs-status','Model scope unknown');await text('previs-info','Model limitations unknown');await text('previs-info','Other omissions or approximations may also exist');await text('previs-info','intersections can be false positives and obstructions can be missed');await page.locator('#previs-registration').check();
  await page.locator('#previs-tx').fill('1');await page.locator('#previs-ty').fill('1');await page.locator('#previs-tz').fill('1.5');await page.locator('#previs-tz').blur();await page.locator('#previs-check').click();await text('previs-hit','Indeterminate');await text('previs-hit','intersections can be false positives and obstructions can be missed');
  await page.locator('#previs-tx').fill('13.5');await page.locator('#previs-ty').fill('5');await page.locator('#previs-ty').blur();await page.locator('#previs-check').click();await text('previs-hit','Model intersection');await text('previs-hit','intersections can be false positives and obstructions can be missed');
  await page.locator('summary').filter({hasText:'Fit two paired'}).click();
  for(const [id,value] of [['previs-ma','0,0'],['previs-pa','10,20'],['previs-mb','10,0'],['previs-pb','20,20'],['previs-mc','0,10'],['previs-pc','10,30']])await page.locator('#'+id).fill(value);
  await page.locator('#previs-fit').click();await text('previs-residual','Endpoint residual 0.000');await page.locator('#previs-check-registration').click();await text('previs-residual','Independent point difference 0.000');
  await page.locator('#previs-pc').fill('11,30');assert.equal(await page.locator('#previs-residual').textContent(),'');await page.locator('#previs-check-registration').click();await text('previs-residual','Independent point difference 1.000');
  await page.locator('#previs-canvas').evaluate(c=>{c.style.width='2000px';c.style.height='1000px';c.style.maxHeight='none'});
  await page.waitForFunction(()=>{const c=document.getElementById('previs-canvas');return c.width===1600&&c.height===800});
  assert.deepEqual(errors,[]);console.log('3D geometry UI: camera selection, conservative local scope, independent registration and proportional canvas passed.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
