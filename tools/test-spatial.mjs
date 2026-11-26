import { createSpatialCore } from './spatial-core.mjs';
const runTests = function runTests(S){
  let n=0;const check=(ok,msg)=>{if(!ok)throw Error(msg);n++},near=(a,b)=>Math.abs(a-b)<1e-6;
  check(JSON.stringify(S.planPoint(200,300,20,500,2))==='[10,10,2]','metric plan transform');
  const a=S.axes(0);check(near(a.f[1],1)&&near(a.right[0],1)&&near(a.up[2],1),'north/up/right');
  const b=S.axes(90,30,20);check(near(S.norm(b.f),1)&&near(S.dot(b.f,b.up),0)&&near(S.dot(b.right,b.up),0),'orthonormal optical pose');
  const o=S.optics(9.59,8.4),pose={origin:[0,0,1],...a,...o};check(near(o.hfov,2*Math.atan(9.59/16.8)*180/Math.PI)&&o.vfov<o.hfov,'optical field of view');
  check(S.project([0,10,1],pose).inFrame,'on-axis target');check(!S.project([100,10,1],pose).inFrame&&!S.project([0,-10,1],pose).inFrame,'off-axis and behind');
  check(near(S.project([10*o.tanH,10,1],pose).x,1),'frame edge');
  const reg={x:12,y:7,z:2,rotation:35};check(S.norm(S.sub(S.inverseRegister(S.register([2,3,4],reg),reg),[2,3,4]))<1e-6,'registration roundtrip');
  const fit=S.fitRegistration([0,0],[10,0],[4,3],[4,13],2);check(near(fit.rotation,90)&&near(fit.x,4)&&near(fit.y,3)&&near(fit.residual,0),'paired control points');
  check(near(S.fitRegistration([0,0],[10,0],[0,0],[0,12],0).residual,1),'scale mismatch residual');
  const mesh={chunks:[{name:'Wall',opaque:true,min:[-1,5,0],max:[1,5,3],xyz:new Float32Array([-1,5,0,1,5,0,0,5,3])}]},r={x:0,y:0,z:0,rotation:0};
  check(near(S.firstHit(mesh,[0,0,1],[0,10,1],r).distance,5),'nearest hit');check(S.firstHit(mesh,[0,0,1],[0,4,1],r)===null,'finite ray');
  check(S.firstHit({...mesh,chunks:[{...mesh.chunks[0],opaque:false}]},[0,0,1],[0,10,1],r)===null,'transparent excluded');
  check(near(S.firstHit(mesh,S.register([0,0,1],reg),S.register([0,10,1],reg),reg).distance,5),'registered ray');
  check(!S.trusted({status:'verified',pxPerMetre:20},21)&&S.trusted({status:'confirmed',pxPerMetre:20},20),'scale evidence invalidated');
  function glb(j,bytes){const json=Uint8Array.from(JSON.stringify(j),x=>x.charCodeAt(0)),pad=(4-json.length%4)%4,bl=(bytes.byteLength+3)&~3,out=new ArrayBuffer(12+8+json.length+pad+8+bl),v=new DataView(out),u=new Uint8Array(out);v.setUint32(0,0x46546c67,true);v.setUint32(4,2,true);v.setUint32(8,out.byteLength,true);v.setUint32(12,json.length+pad,true);v.setUint32(16,0x4e4f534a,true);u.set(json,20);u.fill(32,20+json.length,20+json.length+pad);const k=20+json.length+pad;v.setUint32(k,bl,true);v.setUint32(k+4,0x004e4942,true);u.set(new Uint8Array(bytes),k+8);return out}
  const vertices=new Float32Array([-1,0,-5,1,0,-5,0,3,-5]);
  const j={asset:{version:'2.0'},buffers:[{byteLength:36}],bufferViews:[{buffer:0,byteLength:36}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3'}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],nodes:[{translation:[1,0,0],children:[1]},{mesh:0}],scenes:[{nodes:[0]}],scene:0};
  const file=glb(j,vertices.buffer),m=S.parseGlb(file);check(m.count===1&&m.bounds.min[0]===0&&m.bounds.min[1]===5&&m.bounds.max[2]===3,'GLB nested transform and axis mapping');
  check(near(S.firstHit(m,[1,0,1],[1,10,1],r).distance,5),'GLB intersection');
  for(const fn of [()=>S.parseGlb(file.slice(0,-1)),()=>S.parseGlb(glb({...j,extensionsRequired:['KHR_draco_mesh_compression']},vertices.buffer)),()=>S.parseGlb(glb({...j,accessors:[{...j.accessors[0],count:6}]},vertices.buffer)),()=>S.parseGlb(file,{triangleLimit:0})]){let rejected=false;try{fn()}catch{rejected=true}check(rejected,'reject invalid GLB')}
  const ib=new ArrayBuffer(56),iv=new DataView(ib);for(let k=0;k<3;k++){for(let a=0;a<3;a++)iv.setFloat32(k*16+a*4,vertices[k*3+a],true);iv.setUint16(48+k*2,k,true)}
  const ji={...j,buffers:[{byteLength:56}],bufferViews:[{buffer:0,byteLength:48,byteStride:16},{buffer:0,byteOffset:48,byteLength:6}],accessors:[j.accessors[0],{bufferView:1,componentType:5123,count:3,type:'SCALAR'}],meshes:[{primitives:[{attributes:{POSITION:0},indices:1}]}]};check(S.parseGlb(glb(ji,ib)).count===1,'interleaved indexed geometry');
  return n
};
console.log(runTests(createSpatialCore()) + ' spatial assertions passed');
