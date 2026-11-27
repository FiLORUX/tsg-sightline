import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

// The fixture and its coloured plan are synthetic; no production assets are used.
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const files = {'/sightline/':['index.html','text/html'], '/sightline/geometry-worker.js':['geometry-worker.js','text/javascript']};
  if (!files[path]) { res.writeHead(404); res.end(); return; }
  try { const [file, type] = files[path]; res.writeHead(200, {'Content-Type':type}); res.end(await readFile(new URL('../'+file, import.meta.url))); }
  catch { res.writeHead(500); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/sightline/`;
const browser = await chromium.launch({args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors = [];
const context = await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
await context.addInitScript(() => Object.defineProperty(window,'showSaveFilePicker',{configurable:true,value:undefined}));
const page = await context.newPage();
page.setDefaultTimeout(10000);
page.on('pageerror', error => errors.push(error.message));
const capture = async () => { await page.waitForTimeout(180); return page.locator('#previs-canvas').screenshot(); };
const distinct = (a,b,message) => assert.notDeepEqual(a,b,message);
const drag = async (dx,dy,shift=false) => {
  const r=await page.locator('#previs-canvas').boundingBox(), x=r.x+r.width*.5, y=r.y+r.height*.5;
  if(shift) await page.keyboard.down('Shift');
  await page.mouse.move(x,y); await page.mouse.down(); await page.mouse.move(x+dx,y+dy,{steps:5}); await page.mouse.up();
  if(shift) await page.keyboard.up('Shift');
};
try {
  await page.goto(url);
  const background = await page.evaluate(() => {
    const c=document.createElement('canvas'); c.width=400; c.height=400; const g=c.getContext('2d');
    for(const [colour,x,y] of [['#ff0000',0,0],['#00ff00',200,0],['#0000ff',0,200],['#ffff00',200,200]]) { g.fillStyle=colour; g.fillRect(x,y,200,200); }
    return c.toDataURL('image/png');
  });
  const camera=(id,x,y)=>({id,number:id,label:'Synthetic '+id,mount:'tripodHeavy',x,y,heading:0,height:1.5,wide:8.4,tele:100,imagerWidth:9.59,throwMetres:10,path:[]});
  const project={format:'camera-plan/5',meta:{production:'Synthetic',revision:'A'},content:{width:400,height:400},pxPerMetre:10,calibrated:true,background:{href:background,width:400,height:400},cameras:[camera('1',40,40),camera('2',360,360)],dimensions:[]};
  await page.locator('#file-project').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
  await page.waitForFunction(()=>document.getElementById('chain-summary').textContent.includes('2 unique chains'));
  assert.match(await page.locator('#placement-notice').textContent(),/placement/i);
  assert.match(await page.locator('#layer-titleblock').textContent(),/CAMERA PLACEMENT AND POSE REQUIRE REVIEW/);
  await page.locator('#action-previs').click();
  await page.waitForFunction(()=>document.getElementById('previs-info').textContent.includes('there are no walls'));
  assert.match(await page.locator('#previs-status').textContent(),/No venue model/);
  assert.match(await page.locator('#previs-info').textContent(),/positions, height and orientation are inputs/);
  assert(await page.locator('#previs-registration').isDisabled());
  assert(await page.locator('#previs-canvas').evaluate(c=>Boolean(c.getContext('webgl2'))));

  // At an almost overhead, north-up view, the quadrant colours must agree with
  // the 2D drawing: top-left red, top-right green, bottom-left blue, bottom-right yellow.
  await page.locator('#previs-orbit').fill('0'); await page.locator('#previs-orbit').dispatchEvent('input');
  await page.locator('#previs-elevation').fill('85'); await page.locator('#previs-elevation').dispatchEvent('input');
  await page.waitForTimeout(500);
  const png=await capture();
  const colours=await page.evaluate(async encoded=>{
    const img=new Image(); img.src='data:image/png;base64,'+encoded; await img.decode();
    const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);
    const d=ctx.getImageData(0,0,c.width,c.height).data, groups={red:[],green:[],blue:[],yellow:[]};
    for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4,r=d[i],g=d[i+1],b=d[i+2];let key='';
      if(r>230&&g<25&&b<25)key='red';else if(g>230&&r<25&&b<25)key='green';else if(b>230&&r<25&&g<25)key='blue';else if(r>230&&g>230&&b<25)key='yellow';
      if(key)groups[key].push([x,y]);}
    return Object.fromEntries(Object.entries(groups).map(([k,p])=>[k,{count:p.length,x:p.reduce((s,v)=>s+v[0],0)/p.length,y:p.reduce((s,v)=>s+v[1],0)/p.length}]));
  },png.toString('base64'));
  for(const c of Object.values(colours)) assert(c.count>100,'all four drawing quadrants rendered');
  assert(colours.red.x<colours.green.x && colours.blue.x<colours.yellow.x,'drawing left and right match plan');
  assert(colours.red.y<colours.blue.y && colours.green.y<colours.yellow.y,'drawing top and bottom match plan');

  await page.locator('#previs-fit-view').click(); const fit=await capture();
  const orbitBefore=await page.locator('#previs-orbit').inputValue(), elevationBefore=await page.locator('#previs-elevation').inputValue();
  await drag(65,25);
  assert.notEqual(await page.locator('#previs-orbit').inputValue(),orbitBefore,'drag orbits');
  assert.notEqual(await page.locator('#previs-elevation').inputValue(),elevationBefore,'drag changes elevation');
  distinct(await capture(),fit,'orbit redraws overview');
  await page.locator('#previs-fit-view').click(); assert.deepEqual(await capture(),fit,'fit resets orbit and overview');
  await drag(45,20,true); distinct(await capture(),fit,'shift drag pans');
  await page.locator('#previs-fit-view').click(); assert.deepEqual(await capture(),fit,'fit resets pan');
  await page.locator('#previs-canvas').hover(); await page.mouse.wheel(0,-100); distinct(await capture(),fit,'wheel zooms');
  await page.locator('#previs-fit-view').click(); assert.deepEqual(await capture(),fit,'fit resets wheel zoom');
  await page.locator('#previs-zoom-in').click(); distinct(await capture(),fit,'zoom button changes view');
  await page.locator('#previs-zoom-out').click(); assert.deepEqual(await capture(),fit,'opposite zoom buttons restore view');
  const poseSnapshot=()=>page.evaluate(()=>({symbols:document.querySelector('#layer-symbols').innerHTML,pose:['previs-floor','previs-tilt','previs-roll','previs-pan','previs-focal'].map(id=>document.getElementById(id).value)}));
  const savedBefore=await poseSnapshot();
  await page.locator('#previs-focus').click(); distinct(await capture(),fit,'focus changes overview framing');
  assert.deepEqual(await poseSnapshot(),savedBefore,'focusing does not move cameras or alter their pose');
  await page.locator('#previs-fit-view').click(); assert.deepEqual(await capture(),fit,'fit exits focused view');
  const small=await page.locator('#previs-canvas').boundingBox();
  await page.locator('#previs-expand').click(); assert.equal(await page.locator('#previs-expand').getAttribute('aria-pressed'),'true');
  const large=await page.locator('#previs-canvas').boundingBox(); assert(large.width>small.width && large.height>small.height,'expand makes viewport larger');
  await capture();
  await page.locator('#previs-expand').click(); assert.equal(await page.locator('#previs-expand').getAttribute('aria-pressed'),'false');
  assert.deepEqual(await capture(),fit,'restore keeps the original framing');
  assert.deepEqual(await poseSnapshot(),savedBefore,'resizing does not alter positions or pose');
  await page.locator('#previs-view').selectOption('camera');
  await page.waitForFunction(()=>document.getElementById('previs-info').textContent.includes('HFOV'));
  assert.match(await page.locator('#previs-info').textContent(),/No venue model/,'camera frame does not imply a venue model');
  await page.locator('#previs-tilt').fill('-60'); await page.locator('#previs-tilt').blur();
  const frame=await capture(); await drag(60,20); assert.deepEqual(await capture(),frame,'overview drag does not alter camera pose');
  assert(await page.locator('#previs-fit-view').isDisabled(),'overview controls are disabled in camera mode');
  await page.locator('#camera-rows tr').first().click();
  await page.locator('#cam-lens').selectOption('ua125');
  await page.locator('#cam-body-preset').selectOption('arri-alexa-35-live');
  await page.waitForFunction(()=>document.getElementById('previs-info').textContent.includes('Camera frame unavailable; no previous frame is displayed.'));
  const invalid=await capture(); distinct(invalid,frame,'an invalid pose clears the previous camera frame');
  await page.locator('#previs-view').selectOption('overview');
  await page.waitForFunction(()=>!document.getElementById('previs-fit-view').disabled);
  distinct(await capture(),invalid,'overview remains usable when the camera optics are invalid');

  // Real multi-contact events through Chromium's input stack, not synthetic DOM events.
  const mobile=await browser.newContext({viewport:{width:700,height:900},isMobile:true,hasTouch:true});
  try {
    const mp=await mobile.newPage();mp.setDefaultTimeout(10000);mp.on('pageerror',e=>errors.push(e.message));await mp.goto(url);
    await mp.locator('#file-project').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
    await mp.waitForFunction(()=>document.getElementById('chain-summary').textContent.includes('2 unique chains'));
    const notice=await mp.locator('#placement-notice').boundingBox(),plan=await mp.locator('#plan').boundingBox();
    assert(notice && notice.y+notice.height<=plan.y+1,'mobile placement warning does not obscure the plan');
    await mp.locator('#action-previs').tap();await mp.waitForFunction(()=>document.getElementById('previs-info').textContent.includes('there are no walls'));
    const cdp=await mobile.newCDPSession(mp), r=await mp.locator('#previs-canvas').boundingBox();
    const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y,id])=>({x,y,id,radiusX:2,radiusY:2,force:1}))});
    const cx=r.x+r.width/2,cy=r.y+r.height/2;await mp.waitForTimeout(300);const before=await mp.locator('#previs-canvas').screenshot();
    await touch('touchStart',[[cx-30,cy,1],[cx+30,cy,2]]);await touch('touchMove',[[cx-55,cy+12,1],[cx+70,cy+12,2]]);await touch('touchEnd',[]);
    await mp.waitForTimeout(200);distinct(await mp.locator('#previs-canvas').screenshot(),before,'pinch and translation update overview');
    await mp.locator('#previs-fit-view').tap();await mp.waitForTimeout(200);assert.deepEqual(await mp.locator('#previs-canvas').screenshot(),before,'fit resets touch navigation');
    await mp.locator('#previs-focus').tap();await mp.waitForTimeout(200);distinct(await mp.locator('#previs-canvas').screenshot(),before,'touch focus changes framing');
    await mp.locator('#previs-fit-view').tap();await mp.waitForTimeout(200);assert.deepEqual(await mp.locator('#previs-canvas').screenshot(),before,'touch fit exits focus');
    await mp.locator('#previs-expand').tap();assert.equal(await mp.locator('#previs-expand').getAttribute('aria-pressed'),'true');
    await mp.locator('#previs-expand').tap();assert.equal(await mp.locator('#previs-expand').getAttribute('aria-pressed'),'false');
    await mp.waitForTimeout(200);assert.deepEqual(await mp.locator('#previs-canvas').screenshot(),before,'touch restore preserves framing');
    await mp.locator('#action-clear-plan').dispatchEvent('click');
    await mp.waitForFunction(()=>document.getElementById('previs-info').textContent.includes('No venue model or floor drawing'));
  } finally { await mobile.close(); }
  assert.deepEqual(errors,[]);
  console.log('3D overview: synthetic raster orientation, orbit, pan, wheel/button zoom, fit, camera frame and touch navigation passed.');
} finally { await context.close(); await browser.close(); await new Promise(resolve=>server.close(resolve)); }
