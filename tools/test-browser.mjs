import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { deflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const assets = { '/sightline/': ['index.html','text/html'], '/sightline/geometry-worker.js':['geometry-worker.js','text/javascript'] };
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  const asset=assets[path];
  if(!asset){res.writeHead(404);res.end();return}
  try{
    const bytes=await readFile(new URL('../'+asset[0],import.meta.url));
    res.writeHead(200,{'Content-Type':asset[1],'Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'"});
    res.end(bytes);
  }catch{res.writeHead(500);res.end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port+'/sightline/';
const fixture = fileURLToPath(new URL('../examples/fifteen-camera-build.json', import.meta.url));
const browser = await chromium.launch({args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors = [];
const context = await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
await context.addInitScript(() => {
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__copied=value}}});
  Object.defineProperty(window,'showSaveFilePicker',{configurable:true,value:undefined});
  Object.defineProperty(window,'showOpenFilePicker',{configurable:true,value:undefined});
});
const page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));
const text=async(id,expected)=>{await page.waitForFunction(({id,expected})=>document.getElementById(id)?.textContent.includes(expected),{id,expected});};
const change=async(id,value)=>{await page.locator('#'+id).fill(String(value));await page.locator('#'+id).blur();};
const download=async(id)=>{const [d]=await Promise.all([page.waitForEvent('download'),page.locator('#'+id).click()]);return readFile(await d.path(),'utf8');};
const load=async(p)=>page.locator('#file-project').setInputFiles({name:'fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(p))});
function wallGlb(){
  const coordinates=[9,0,-15,11,0,-15,10,3,-15];
  const bin=Buffer.alloc(coordinates.length*4);coordinates.forEach((v,i)=>bin.writeFloatLE(v,i*4));
  const doc={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0,name:'Synthetic wall'}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3'}],bufferViews:[{buffer:0,byteOffset:0,byteLength:bin.length}],buffers:[{byteLength:bin.length}]};
  let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
  const out=Buffer.alloc(12+8+json.length+8+bin.length);out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(json.length,12);out.writeUInt32LE(0x4e4f534a,16);json.copy(out,20);let offset=20+json.length;out.writeUInt32LE(bin.length,offset);out.writeUInt32LE(0x004e4942,offset+4);bin.copy(out,offset+8);return out;
}
try{
  await page.goto(url);
  await text('readout-calibration','Uncalibrated');
  const picker=page.locator('#mount-palette button');
  assert.equal(await picker.count(),13);
  const registry=JSON.parse(await readFile(new URL('../assets/rig-pictograms-03.json',import.meta.url),'utf8'));
  assert.equal(Object.keys(registry).length,18);
  assert.equal(Object.values(registry).filter(x=>x.legacy).length,12);
  const embedded=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const match=embedded.match(/const MOUNT_PICTOGRAMS = Object\.freeze\((\{[\s\S]*?\})\);\s*\/\/ #endregion mount-pictograms-03/);
  assert(match,'embedded approved icon registry');
  assert.deepEqual(JSON.parse(match[1]),registry,'embedded glyphs match editable registry');
  const selectedStyle=await picker.filter({has:page.locator('svg[data-mount-icon="tripodHeavy"]')}).evaluate(b=>({fg:getComputedStyle(b).color,bg:getComputedStyle(b).backgroundColor}));
  assert.equal(selectedStyle.fg,'rgb(23, 35, 43)');
  assert.equal(selectedStyle.bg,'rgb(229, 237, 240)');
  const glyphs=await picker.evaluateAll(buttons=>buttons.map(b=>{
    const s=b.querySelector('svg'),r=s.getBoundingClientRect(),box=s.getBBox(),label=b.querySelector('span');
    return {id:b.dataset.mount,pressed:b.getAttribute('aria-pressed'),name:b.getAttribute('aria-label'),viewBox:s.getAttribute('viewBox'),markup:s.innerHTML,width:r.width,height:r.height,box:[box.x,box.y,box.width,box.height],colour:getComputedStyle(s).color,overflow:label.scrollWidth>label.clientWidth+1};
  }));
  assert.equal(new Set(glyphs.map(g=>g.markup)).size,13,'distinct elevation pictograms');
  assert(glyphs.every(g=>g.name&&g.viewBox==='0 0 64 48'&&g.width>=63&&g.height>=47&&!g.overflow&&g.box[0]>=0&&g.box[1]>=0&&g.box[0]+g.box[2]<=64&&g.box[1]+g.box[3]<=48),'bounded, legible picker icons');
  assert.equal(glyphs.filter(g=>g.pressed==='true').length,1);
  for (const [id,label] of [['handheld','Handheld'],['easyrig','Easyrig']]) {
    assert.equal(glyphs.find(g=>g.id===id)?.name,label);
    assert(registry[id].compactSvg && registry[id].compactSvg!==registry[id].svg);
  }
  assert(!glyphs.some(g=>g.id==='rf'),'RF is independent of the physical support');
  await picker.filter({has:page.locator('svg[data-mount-icon="jib"]')}).click();
  assert.equal(await page.locator('[data-mount="jib"]').getAttribute('aria-pressed'),'true');
  await page.locator('#mode-select').click();

  const rfNext=page.locator('#next-rf'), transport=page.locator('#cam-rf');
  await page.locator('[data-mount="handheld"]').click();
  await rfNext.check();
  await page.locator('#plan').click({position:{x:300,y:330}});
  assert.equal(await transport.inputValue(),'RF');
  assert(!await rfNext.isChecked(),'RF applies to a single new placement');
  await page.locator('[data-mount="handheld"]').click();
  await page.locator('#plan').click({position:{x:520,y:330}});
  assert.equal(await transport.inputValue(),'Unassigned','a physical mount does not imply RF or a cable');
  assert.equal(await page.locator('#camera-rows [data-mount-icon="rf"]').count(),1);
  await transport.selectOption('Cabled');
  assert.equal(await page.locator('#rf-assignment').isVisible(),false);
  await page.locator('#camera-rows tr').first().click();
  assert.equal(await transport.inputValue(),'RF');

  await page.locator('#file-project').setInputFiles(fixture);
  await text('chain-summary','15 unique chains');
  let svg=await download('action-export-svg');
  assert.match(svg,/DRAFT \/ NOT TO SCALE/);
  assert.doesNotMatch(svg,/id="layer-dimensions"/);
  assert.match(svg,/POSITION STUDY · NO BASE DRAWING/);
  assert(await page.locator('#context-banner').isVisible(),'persistent missing venue context');
  assert(await page.locator('#layer-titleblock svg[data-glyph]').count()>0,'bounded legend glyphs');
  const legend=await page.locator('#layer-titleblock svg[data-glyph]').evaluateAll(nodes=>nodes.map(n=>[Number(n.getAttribute('width')),Number(n.getAttribute('height')),n.getAttribute('viewBox')]));
  assert(legend.every(([w,h,v])=>w===h&&w>0&&v==='-34 -34 68 68'),'all legend glyphs normalised');
  await change('scale-direct',21);
  await text('readout-calibration','Estimated');
  await page.locator('#scale-source').fill('Synthetic checked dimension');
  await page.locator('#action-confirm-scale').click();
  await text('readout-calibration','User-confirmed');
  svg=await download('action-export-svg');assert.match(svg,/SCALE 1:/);assert.match(svg,/USER CONF\./);
  await page.locator('#camera-rows tr').first().click();
  await page.locator('.chain-details').filter({has:page.locator('#chain-role')}).locator('summary').click();
  await page.locator('#action-alternate').click();
  await text('chain-summary','15 unique chains · 16 positions · 1 alternate(s)');
  await transport.selectOption('RF');
  await page.locator('#chain-rfLink').fill('TX-17 / RX-2');
  await page.locator('#camera-rows tr').first().click();
  assert.equal(await transport.inputValue(),'RF','linked primary and alternate share transport');
  assert.equal(await page.locator('#chain-rfLink').inputValue(),'TX-17 / RX-2');
  await change('cam-number',77);
  await page.locator('#chain-umd').fill('TEST UMD');
  await page.locator('#chain-notes').fill('PRIVATE_TEST_INTERFACE');
  const tsv=await download('action-export-chains');
  assert.equal(tsv.trimEnd().split(/\r?\n/).length,16);assert.match(tsv,/TEST UMD/);
  assert.match(tsv,/TX-17 \/ RX-2/);
  await page.locator('#action-share').click();
  await page.waitForFunction(()=>Boolean(window.__copied));
  const share=await page.evaluate(async()=>{
    const packed=window.__copied.split('#plan=')[1];
    const [type,body]=packed.split('.',2);
    const bytes=Uint8Array.from(atob(body.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
    // v6 links currently use either uncompressed JSON or deflate-raw.
    const json=type==='j'?new TextDecoder().decode(bytes):await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
    return JSON.parse(json);
  });
  assert.equal(share.cameras.length,16);assert(!JSON.stringify(share).includes('PRIVATE_TEST_INTERFACE'));assert(!('background' in share));assert(!('previs' in share));
  // Old v5 URLs must reopen without the original asset and preserve the fragment.
  const old=JSON.parse(await readFile(fixture,'utf8'));
  const legacy=deflateRawSync(Buffer.from(JSON.stringify(old))).toString('base64url');
  await page.goto(url+'?case=legacy#plan=d.'+legacy);
  await text('chain-summary','15 unique chains');
  assert.match(page.url(),/#plan=d\./);
  await page.reload();
  await text('chain-summary','15 unique chains');
  assert.match(page.url(),/#plan=d\./);
  // Synthetic private resolver: exact old payload, matching raster frame,
  // no replacement of the camera positions or promotion of scale evidence.
  const key=createHash('sha256').update('d.'+legacy).digest('hex');
  const bg=await page.evaluate(({width,height})=>{
    const c=document.createElement('canvas');c.width=width;c.height=height;
    const g=c.getContext('2d');g.fillStyle='#eee';g.fillRect(0,0,width,height);g.strokeStyle='#555';g.strokeRect(30,30,width-60,height-60);return c.toDataURL('image/png');
  },old.content);
  const privateProject={format:old.format,meta:old.meta,content:old.content,pxPerMetre:old.pxPerMetre,background:{href:bg,...old.content}};
  await page.route('**/view/alias/'+key+'.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(privateProject)}));
  await page.reload();
  await page.waitForFunction(()=>document.getElementById('context-banner').hidden);
  assert.match(await page.locator('#layer-background').getAttribute('href'),/^data:image\/png;base64,/);
  await text('chain-summary','15 unique chains');
  await text('readout-calibration','Uncalibrated');
  assert.match(page.url(),/#plan=d\./);
  await page.unroute('**/view/alias/'+key+'.json');
  // Synthetic authorised revision migration: the later revision has another
  // frame and scale and one alternate position, and the original link must
  // keep working unchanged.
  const R04_SCALE=16.71464,r04bg=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=2000;c.height=1300;const g=c.getContext('2d');g.fillStyle='#ddd';g.fillRect(0,0,2000,1300);return c.toDataURL('image/png')});
  const k=R04_SCALE/old.pxPerMetre;
  const r04cameras=old.cameras.map(c=>({...c,x:c.x*k+37,y:c.y*k+11,path:[]}));
  r04cameras.push({...old.cameras[0],id:'cam-plan-01-alt',positionRole:'alternate',chainId:old.cameras[0].chainId||old.cameras[0].id,x:700,y:600,path:[]});
  const r04={format:'sightline-context/2',
    migration:{from:{revision:old.meta.revision,content:old.content,pxPerMetre:old.pxPerMetre},to:{revision:'R04',pxPerMetre:R04_SCALE}},
    project:{format:old.format,meta:{...old.meta,revision:'R04'},content:{width:2000,height:1300},pxPerMetre:R04_SCALE,calibrated:false,background:{href:r04bg,width:2000,height:1300},cameras:r04cameras,dimensions:[]}};
  await page.route('**/view/alias/'+key+'.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(r04)}));
  await page.reload();
  await page.waitForFunction(()=>document.getElementById('context-banner').hidden);
  assert.equal(await page.locator('#meta-revision').inputValue(),'R04');
  await text('chain-summary','15 unique chains · 16 positions · 1 alternate(s)');
  await text('readout-calibration','Estimated');
  assert.match(page.url(),/#plan=d\./);
  assert.equal(page.url().split('#plan=')[1],'d.'+legacy,'distributed link is unchanged');
  await page.reload();
  await page.waitForFunction(()=>document.getElementById('context-banner').hidden);
  assert.equal(await page.locator('#meta-revision').inputValue(),'R04');
  // Fail closed: a record that names another source frame must not apply.
  r04.migration.from.revision='R99';
  await page.unroute('**/view/alias/'+key+'.json');
  await page.route('**/view/alias/'+key+'.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(r04)}));
  await page.reload();
  await text('context-message','Migration source frame differs');
  assert.equal(await page.locator('#meta-revision').inputValue(),old.meta.revision);
  await page.unroute('**/view/alias/'+key+'.json');
  // Reset to the position-only link before testing the optical editor.
  await page.reload();
  await text('chain-summary','15 unique chains');
  await text('context-message','No private drawing');
  await page.locator('#camera-rows tr').first().click();
  await page.locator('#cam-body-preset').selectOption('sony-hdc-p1');
  await page.locator('#cam-lens').selectOption('ua125');
  await change('cam-current-focal',1000);
  await text('equipment-optics-info','HFOV 0.550°');
  await page.locator('#cam-extender').selectOption('2');
  await text('equipment-optics-info','HFOV 0.275°');
  await page.locator('#cam-extender').selectOption('1');
  await change('cam-crop-factor',2);
  await text('equipment-optics-info','HFOV 0.275°');
  await page.locator('#cam-body-preset').selectOption('arri-alexa-35-live');
  await text('equipment-optics-info','Lens mount mismatch');
  await page.locator('#cam-lens').selectOption('cabrio20');
  await page.locator('#cam-sensor-mode').selectOption('46-169');
  await change('cam-current-focal',20);
  await text('equipment-optics-info','HFOV 69.');
  await page.locator('#cam-sensor-mode').selectOption('4k-169');
  await text('equipment-optics-info','HFOV 63.');
  await load({format:'camera-plan/5',content:{width:2000,height:2000},pxPerMetre:20,calibrated:true,cameras:[{id:'synthetic-1',number:'1',label:'Synthetic camera',mount:'tripodHeavy',x:200,y:1800,heading:0,height:1.5,wide:8.4,tele:100,imagerWidth:9.59,throwMetres:10,path:[]}],dimensions:[]});
  await text('chain-summary','1 unique chains');
  await page.locator('#scale-source').fill('Synthetic plan control distance');
  await page.locator('#action-confirm-scale').click();
  await text('readout-calibration','User-confirmed');
  await page.locator('#action-previs').click();
  const workerResponse=page.waitForResponse(r=>r.url().endsWith('/geometry-worker.js')&&r.status()===200);
  await page.locator('#previs-file').setInputFiles({name:'wall.glb',mimeType:'model/gltf-binary',buffer:wallGlb()});
  await workerResponse;
  await text('previs-model','1 triangles');
  await page.locator('#previs-registration').check();
  await change('previs-tx',10);await change('previs-ty',20);await change('previs-tz',1.5);
  await page.locator('#previs-check').click();await text('previs-hit','Model intersection');
  await page.locator('#previs-view').selectOption('camera');
  await text('previs-info','HFOV');
  assert(await page.locator('#previs-canvas').evaluate(c=>Boolean(c.getContext('webgl2'))),'WebGL2 renderer');
  await change('scale-direct',25);
  await page.waitForFunction(()=>document.getElementById('previs-registration').disabled);
  assert(await page.locator('#previs-registration').isDisabled(),'scale change invalidates registration');
  await page.locator('#previs-check').click();await text('previs-hit','Occlusion not evaluated');
  await page.locator('#previs-remove').click();await text('previs-model','No mesh loaded');
  const saved=JSON.parse(await download('action-save-project'));
  assert.equal(saved.format,'camera-plan/6');assert.equal(saved.previs.registration.confirmed,false);
  await page.setViewportSize({width:390,height:844});
  assert(await page.locator('#previs-pane').isVisible());
  assert.deepEqual(errors,[]);
  // Exercise actual multi-contact input, rather than only resizing a desktop.
  const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,acceptDownloads:true});
  try{
    const mp=await mobile.newPage();
    const mobileErrors=[];mp.on('pageerror',e=>mobileErrors.push(e.message));
    let authenticated=false;
    await mp.route('**/view/alias/'+key+'.json*',route=>{
      if(new URL(route.request().url()).searchParams.get('view')==='authorise')return route.fulfill({status:200,contentType:'text/html',body:'<h1>Venue access confirmed</h1>'});
      return authenticated?route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(privateProject)}):route.fulfill({status:401,contentType:'application/json',body:'{}'});
    });
    await mp.goto(url+'?case=touch#plan=d.'+legacy);
    await mp.waitForFunction(()=>document.getElementById('context-heading').textContent==='Sign in to view venue drawing');
    assert.equal(await mp.locator('#context-message').isVisible(),false);
    const banner=await mp.locator('#context-banner').boundingBox(),canvas=await mp.locator('#plan').boundingBox();
    assert(banner.y+banner.height<=canvas.y+1,'warning does not obscure plan');
    assert(canvas.height>180,'usable canvas');
    await mp.locator('#context-detail-toggle').tap();
    assert(await mp.locator('#context-message').isVisible());
    assert.match(await mp.locator('#context-authorise').getAttribute('href'),/view=authorise/);
    authenticated=true;
    await mp.locator('#context-retry').tap();
    await mp.waitForFunction(()=>document.getElementById('context-banner').hidden&&document.getElementById('layer-background').getAttribute('href')?.startsWith('data:image/'));
    assert.equal(mp.url().split('#plan=')[1],'d.'+legacy);
    await mp.locator('#action-fit').tap();
    const matrix=()=>mp.locator('#viewport').evaluate(g=>{const m=g.transform.baseVal.consolidate().matrix;return {k:m.a,x:m.e,y:m.f}});
    const approx=(a,b,t=.025)=>assert.ok(Math.abs(a-b)<=t,a+' differs from '+b);
    let v=await matrix();
    await mp.locator('#action-zoom-in').tap();approx((await matrix()).k,v.k*1.5);
    await mp.locator('#action-zoom-out').tap();approx((await matrix()).k,v.k);
    const short=await mp.locator('#plan').boundingBox();
    await mp.locator('#action-plan-only').tap();
    await mp.waitForFunction(()=>document.querySelector('.panel').getBoundingClientRect().height===0);
    const tall=await mp.locator('#plan').boundingBox();
    assert(tall.height>short.height+100,'plan-only expands drawing surface');
    await mp.locator('#action-fit').tap();
    const cdp=await mobile.newCDPSession(mp);
    const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y,id])=>({x,y,id,radiusX:2,radiusY:2,force:1}))});
    const r=await mp.locator('#plan').boundingBox(),cx=r.x+r.width*.5,cy=r.y+r.height*.42;
    v=await matrix();
    const world={x:(cx-r.x-v.x)/v.k,y:(cy-r.y-v.y)/v.k};
    const count=await mp.locator('#layer-symbols > g').count();
    await touch('touchStart',[[cx-40,cy,1],[cx+40,cy,2]]);
    await touch('touchMove',[[cx-72+12,cy+16,1],[cx+72+12,cy+16,2]]);
    await touch('touchEnd',[]);
    const after=await matrix();
    approx(after.k,v.k*1.8);
    approx(after.x+world.x*after.k,cx-r.x+12,2);
    approx(after.y+world.y*after.k,cy-r.y+16,2);
    assert.equal(await mp.locator('#layer-symbols > g').count(),count);
    await mp.locator('#action-plan-only').tap();
    await mp.locator('[data-mount="jib"]').tap();
    const pb=await mp.locator('#plan').boundingBox(),mx=pb.x+pb.width/2,my=pb.y+pb.height*.32;
    await touch('touchStart',[[mx-30,my,3],[mx+30,my,4]]);
    await touch('touchMove',[[mx-55,my,3],[mx+55,my,4]]);
    await touch('touchEnd',[]);
    assert.equal(await mp.locator('#layer-symbols > g').count(),count,'pinch must not place camera');
    await mp.locator('#mode-select').tap();
    assert.deepEqual(mobileErrors,[]);
    console.log('Touch input: anchored pinch, midpoint translation, placement safety, explicit zoom, expanded plan and context retry passed.');
  }finally{await mobile.close()}
  // Two independent sessions using the same current publication. Simulate
  // an edge origin; use the real browser code, not an in-page state mock.
  const id='f'.repeat(32),projectUrl=url+'#project='+id,liveKey='/view/project/'+id+'.json',adminKey='/context/admin/project/'+id+'.json';
  const binary=Buffer.from(r04bg.split(',')[1],'base64'),assetName=createHash('sha256').update(binary).digest('hex')+'.png';
  let publication={format:'sightline-live/1',projectId:id,sequence:10,publishedAt:new Date().toISOString(),project:{...r04.project,background:null},assets:{background:{name:assetName,bytes:binary.length,width:2000,height:1300}}};
  let assetGets=0,saves=0,viewerGets=0;const sockets=new Set();let invalidations=0;
  const activeTag=()=>'"publication-'+publication.sequence+'"';
  async function origin(route,role){
    const req=route.request(),u=new URL(req.url());
    if(u.pathname.endsWith('/asset/'+assetName)){assetGets++;return route.fulfill({status:200,contentType:'image/png',body:binary})}
    const headers={'ETag':'W/'+activeTag(),'X-Sightline-Version':activeTag(),'X-Sightline-Role':role,'Cache-Control':'private, no-store'};
    if(req.method()==='PUT'){
      if(role!=='editor')return route.fulfill({status:403,headers,body:'{}'});
      if(req.headers()['if-match']!==activeTag())return route.fulfill({status:412,headers,body:'{}'});
      const edit=req.postDataJSON();publication={...publication,sequence:publication.sequence+1,publishedAt:new Date().toISOString(),project:{...publication.project,...edit}};saves++;
      for(const socket of sockets){socket.send('changed');invalidations++}
      return route.fulfill({status:200,headers:{...headers,ETag:'W/'+activeTag(),'X-Sightline-Version':activeTag()},contentType:'application/json',body:JSON.stringify({sequence:publication.sequence,publishedAt:publication.publishedAt})});
    }
    if(role==='viewer')viewerGets++;
    if(req.headers()['if-none-match']===activeTag())return route.fulfill({status:304,headers});
    return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(publication)});
  }
  const [editorA,editorB,viewer]=await Promise.all([browser.newContext({viewport:{width:1440,height:900}}),browser.newContext({viewport:{width:1440,height:900}}),browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})]);
  try{
    const [a,b,v]=await Promise.all([editorA.newPage(),editorB.newPage(),viewer.newPage()]);
    const errs=[];for(const [p,role] of [[a,'editor'],[b,'editor'],[v,'viewer']]){
      p.on('pageerror',e=>errs.push(e.message));
      await p.route('**/context/admin/session',route=>route.fulfill({status:role==='editor'?200:403,contentType:'application/json',body:JSON.stringify({role})}));
      if(role==='editor')await p.addInitScript(()=>sessionStorage.setItem('sightline.owner-intent','1'));
      await p.route('**'+adminKey,route=>origin(route,role));
      if(role==='editor')await p.routeWebSocket('**/view/project/'+id+'/events',socket=>{sockets.add(socket);socket.onClose(()=>sockets.delete(socket))});
      await p.route('**/view/project/'+id+'/**',route=>origin(route,role));
      await p.route('**'+liveKey,route=>origin(route,role));
      await p.route('**/view/alias/'+key+'.json',route=>origin(route,role));
    }
    await Promise.all([a.goto(projectUrl),b.goto(projectUrl),v.goto(url+'#plan=d.'+legacy)]);
    const live=async(p,txt)=>p.waitForFunction(t=>document.getElementById('live-indicator')?.textContent.includes(t),txt);
    await Promise.all([live(a,'10 · Current'),live(b,'10 · Current'),live(v,'10 · Current')]);
    await a.waitForFunction(()=>!document.getElementById('live-save').hidden);await b.waitForFunction(()=>!document.getElementById('live-save').hidden);
    assert.equal(assetGets,3);assert.equal(await v.locator('#meta-revision').inputValue(),'R04');
    assert(await v.locator('#live-save').isHidden());assert(await v.locator('#live-owner').isVisible());assert(await v.locator('#meta-revision').isDisabled());
    await v.locator('#action-zoom-in').tap();
    const transform=await v.locator('#viewport').getAttribute('transform');
    await a.locator('#camera-rows tr').first().click();await a.locator('#cam-number').fill('101');await a.locator('#cam-number').blur();
    await live(a,'Unsaved changes');await a.locator('#live-save').click();
    await live(a,'11 · Current');await Promise.all([live(b,'11 · Current'),live(v,'11 · Current')]);
    assert.match(await v.locator('#camera-rows tr').first().textContent(),/101/);
    assert.equal(await v.locator('#viewport').getAttribute('transform'),transform);
    assert.equal(assetGets,3,'unchanged background downloaded once per session');
    assert.equal(saves,1);
    // Both editors change a position; B must not lose its local draft.
    await b.locator('#camera-rows tr').first().click();await b.locator('#cam-number').fill('202');await b.locator('#cam-number').blur();await live(b,'Unsaved changes');
    await a.locator('#camera-rows tr').first().click();await a.locator('#cam-number').fill('303');await a.locator('#cam-number').blur();await live(a,'Unsaved changes');await a.locator('#live-save').click();
    await live(a,'12 · Current');await live(b,'Local draft · update available');
    assert.equal(await b.locator('#cam-number').inputValue(),'202');
    assert(await b.locator('#live-save').isDisabled());assert(await b.locator('#live-copy').isVisible());
    b.once('dialog',d=>d.accept());await b.locator('#live-latest').click();await live(b,'12 · Current');
    await b.locator('#camera-rows tr').first().click();assert.equal(await b.locator('#cam-number').inputValue(),'303');
    await live(v,'12 · Current');
    assert.equal(assetGets,3);assert.equal(saves,2);assert(viewerGets>=2);assert(invalidations>=2,'push invalidations sent');
    assert.equal(await v.evaluate(()=>localStorage.getItem('tsg-sightline/autosave')),null,'private project not persisted to autosave');
    assert.deepEqual(errs,[]);
    console.log('Shared publication: two editors, mobile viewer, live save propagation, retained view, no repeated raster fetch and conflict resolution passed.');
  }finally{await editorA.close();await editorB.close();await viewer.close()}
  // Publish a local project without uploading its native source. The real UI
  // handles the public-consent step, verification and local file download.
  const creator=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});
  try{
    const cp=await creator.newPage(),errs=[];cp.on('pageerror',e=>errs.push(e.message));
    await cp.addInitScript(()=>{
      Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true});
      window.turnstile={render:(sel,opts)=>{queueMicrotask(()=>opts.callback('fixture-token'));return 'fixture-widget'},remove(){},reset(){}};
    });
    await cp.route('**/view/config',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({sitekey:'fixture-sitekey'})}));
    let posted=null;const newId='e'.repeat(32);
    await cp.route('**/view/create',route=>{posted=route.request().postDataJSON();return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({projectId:newId,sequence:1})})});
    await cp.goto(url);
    const localProject={...old,background:{href:bg,...old.content},cameras:old.cameras.map((c,i)=>i===0?{...c,chainDetails:{notes:'LOCAL_SECRET'}}:c)};
    await cp.locator('#file-project').setInputFiles({name:'local-project.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(localProject))});
    await cp.waitForFunction(()=>document.getElementById('chain-summary').textContent.includes('15 unique chains'));
    await cp.locator('#action-publish').click();
    await cp.waitForFunction(()=>document.getElementById('publish-status').textContent.includes('Confirm the public'));
    assert(await cp.locator('#publish-confirm').isDisabled());
    await cp.locator('#publish-consent').check();
    const [d]=await Promise.all([cp.waitForEvent('download'),cp.locator('#publish-confirm').click()]);
    const local=JSON.parse(await readFile(await d.path(),'utf8'));
    assert(posted.consent);assert.equal(posted.token,'fixture-token');
    assert.match(posted.raster,/^data:image\/png;base64,/);
    assert(!('background' in posted.project));assert(!('vector' in posted.project));
    assert(!JSON.stringify(posted.project).includes('LOCAL_SECRET'));
    assert.match(JSON.stringify(local),/LOCAL_SECRET/);assert.equal(local.publication.projectId,newId);
    await cp.waitForFunction(()=>document.getElementById('publish-link').value.endsWith('#project='+'e'.repeat(32)));
    assert.deepEqual(errs,[]);
    console.log('Public consent, anonymous publish, local-file retention and safe payload regression passed.');
  }finally{await creator.close()}
  console.log('Browser integration smoke passed (synthetic geometry; not venue acceptance).');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
