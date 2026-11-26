import { createChainCore } from './chain-core.mjs';
const chainTests = function chainTests(C){
  let n=0;const check=(ok,msg)=>{if(!ok)throw Error(msg);n++};
  const c={id:'p1',number:'8',body:'Test body',lensName:'Test lens',mount:'handheld',rf:true,label:'Primary',chainDetails:{sourceId:'RF-2',umd:'MOBIL 2'}};
  const p={...c,id:'p2',chainId:'p1',positionRole:'alternate',label:'Alternate'};
  check(C.analyse([c,p]).chainCount===1&&C.analyse([c,p]).alternateCount===1,'alternate not a feed');
  check(C.analyse([c,p]).issues.length===0,'consistent link');
  check(C.analyse([p]).issues.some(x=>x.message==='No primary position'),'missing primary');
  check(C.analyse([c,{...p,positionRole:'primary'}]).issues.some(x=>x.message==='More than one primary position'),'duplicate primary');
  check(C.analyse([c,{...p,body:'Different'}]).issues.some(x=>x.message.includes('Camera body')),'chain mismatch');
  check(C.analyse([c,{...p,id:'p3',chainId:'p3',positionRole:'primary'}]).issues.some(x=>x.message.includes('multiple chains')),'duplicate director/source identity');
  check(C.renumber([c,p,{...c,id:'p3',number:'9',chainDetails:{sourceId:'RF-3'}}]).map(x=>x.number).join(',')==='1,1,2','renumber by chain');
  check(C.schedule([c,p]).split('\r\n').length===2&&C.schedule([c,p]).includes('Alternate'),'one schedule row per chain');
  check(C.cell('=1+2')==="'=1+2"&&C.cell('a\tb\nc')==='a b c','spreadsheet escaping');
  check(Object.keys(C.sharedChanges({heading:4,number:'8',body:'Test'})).sort().join(',')==='body,number','position and chain fields distinct');
  return n;
};
console.log(chainTests(createChainCore())+' chain assertions passed');
