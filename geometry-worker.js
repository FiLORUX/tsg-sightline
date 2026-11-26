// Generated from tools/spatial-core.mjs. No network requests or persistent storage.
const S=(function createSpatialCore(){
  'use strict';
  // Local production coordinates: +X sheet right, +Y sheet up, +Z elevation.
  const rad=x=>x*Math.PI/180,deg=x=>x*180/Math.PI;
  const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s),dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>Math.hypot(...a);
  const finite=a=>a.every(Number.isFinite);
  function planPoint(x,y,ppm,height,z=0){if(!finite([x,y,ppm,height,z])||ppm<=0)throw Error('Invalid plan transform');return [x/ppm,(height-y)/ppm,z]}
  function axes(heading,tilt=0,roll=0){
    if(!finite([heading,tilt,roll])||Math.abs(tilt)>=90)throw Error('Invalid optical orientation');
    const h=rad(heading),t=rad(tilt),r=rad(roll),f=[Math.sin(h)*Math.cos(t),Math.cos(h)*Math.cos(t),Math.sin(t)],right=[Math.cos(h),-Math.sin(h),0],up=cross(right,f);
    return {f,right:add(mul(right,Math.cos(r)),mul(up,Math.sin(r))),up:add(mul(up,Math.cos(r)),mul(right,-Math.sin(r)))}
  }
  function optics(width,focal,aspect=16/9){if(!finite([width,focal,aspect])||Math.min(width,focal,aspect)<=0)throw Error('Invalid active imager or focal length');const tanH=width/(2*focal),tanV=tanH/aspect;return {tanH,tanV,hfov:deg(2*Math.atan(tanH)),vfov:deg(2*Math.atan(tanV))}}
  function project(point,pose){const d=sub(point,pose.origin),depth=dot(d,pose.f);if(depth<=0)return {depth,inFrame:false,x:null,y:null};const x=dot(d,pose.right)/(depth*pose.tanH),y=dot(d,pose.up)/(depth*pose.tanV);return {depth,x,y,inFrame:Math.abs(x)<=1&&Math.abs(y)<=1}}
  const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
  function matrixMultiply(a,b){const m=Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)m[c*4+r]+=a[k*4+r]*b[c*4+k];return m}
  function nodeMatrix(n){
    if(n.matrix){if(n.matrix.length!==16||!finite(n.matrix))throw Error('Invalid node matrix');return n.matrix}
    const q=n.rotation||[0,0,0,1],s=n.scale||[1,1,1],t=n.translation||[0,0,0], [x,y,z,w]=q;
    if(q.length!==4||s.length!==3||t.length!==3||!finite([...q,...s,...t])||Math.abs(Math.hypot(...q)-1)>0.001)throw Error('Invalid node TRS');
    return [(1-2*y*y-2*z*z)*s[0],(2*x*y+2*z*w)*s[0],(2*x*z-2*y*w)*s[0],0,(2*x*y-2*z*w)*s[1],(1-2*x*x-2*z*z)*s[1],(2*y*z+2*x*w)*s[1],0,(2*x*z+2*y*w)*s[2],(2*y*z-2*x*w)*s[2],(1-2*x*x-2*y*y)*s[2],0,t[0],t[1],t[2],1]}
  function transform(m,p){const [x,y,z]=p;return [m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]]}
  function register(p,r){const a=rad(r.rotation),c=Math.cos(a),s=Math.sin(a);return [c*p[0]-s*p[1]+r.x,s*p[0]+c*p[1]+r.y,p[2]+r.z]}
  function inverseRegister(p,r){const a=rad(r.rotation),c=Math.cos(a),s=Math.sin(a),x=p[0]-r.x,y=p[1]-r.y;return [c*x+s*y,-s*x+c*y,p[2]-r.z]}
  function fitRegistration(modelA,modelB,planA,planB,zOffset){
    if(![modelA,modelB,planA,planB].every(v=>v.length===2&&finite(v))||!Number.isFinite(zOffset))throw Error('Invalid control points');
    const m=sub(modelB,modelA),p=sub(planB,planA),ml=norm(m),pl=norm(p);if(Math.min(ml,pl)<0.01)throw Error('Control points are too close');
    const rotation=deg(Math.atan2(p[1],p[0])-Math.atan2(m[1],m[0])),r={x:0,y:0,z:zOffset,rotation};
    const a=register([...modelA,0],r),b=register([...modelB,0],r);
    r.x=(planA[0]+planB[0]-a[0]-b[0])/2;r.y=(planA[1]+planB[1]-a[1]-b[1])/2;
    return {...r,residual:Math.abs(ml-pl)/2,modelSpan:ml,planSpan:pl}
  }
  function decode(bytes){
    if(typeof TextDecoder==='function')return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
    // Small ASCII-only fixtures in the isolated regression runner.
    if(bytes.length>65536||bytes.some(x=>x>127))throw Error('UTF-8 decoder required');
    return Array.from(bytes,x=>String.fromCharCode(x)).join('')
  }
  // Khronos glTF 2.0 static geometry subset, Y-up metres. No remote resources.
  function parseGlb(buffer,{triangleLimit=1000000,byteLimit=160*1024*1024}={}){
    const fail=msg=>{throw Error(msg)};
    if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<20||buffer.byteLength>byteLimit)fail('Invalid or oversized GLB');
    const d=new DataView(buffer);if(d.getUint32(0,true)!==0x46546c67||d.getUint32(4,true)!==2||d.getUint32(8,true)!==buffer.byteLength)fail('Expected complete GLB 2.0');
    let j=null,bin=null,offset=12,chunk=0;
    while(offset<buffer.byteLength){if(offset+8>buffer.byteLength)fail('Truncated chunk');const len=d.getUint32(offset,true),type=d.getUint32(offset+4,true);offset+=8;
      if(len%4||offset+len>buffer.byteLength)fail('Invalid chunk length');
      if(type===0x4e4f534a){if(chunk!==0||j)fail('Invalid JSON chunk');j=JSON.parse(decode(new Uint8Array(buffer,offset,len)))}
      else if(type===0x004e4942){if(bin)fail('Multiple BIN chunks');bin=new DataView(buffer,offset,len)}
      offset+=len;chunk++}
    if(!j||!bin||j.asset?.version!=='2.0'||j.buffers?.length!==1||j.buffers[0].uri||!Number.isSafeInteger(j.buffers[0].byteLength)||j.buffers[0].byteLength<0||j.buffers[0].byteLength>bin.byteLength)fail('Use self-contained GLB 2.0');
    if(j.extensionsRequired?.length)fail('Unsupported required extensions: '+j.extensionsRequired.join(', '));
    if(j.animations?.length||j.skins?.length)fail('Export static unskinned geometry');
    function accessor(i,type,allowed){
      const a=j.accessors?.[i],v=j.bufferViews?.[a?.bufferView];
      if(!a||!v||a.sparse||a.normalized||a.type!==type||!allowed.includes(a.componentType)||v.buffer!==0||v.extensions?.EXT_meshopt_compression)fail('Unsupported geometry accessor');
      const size={5121:1,5123:2,5125:4,5126:4}[a.componentType],n=type==='VEC3'?3:1,stride=v.byteStride||size*n,vo=v.byteOffset||0,ao=a.byteOffset||0,start=vo+ao;
      if(![a.count,stride,vo,ao,v.byteLength].every(Number.isSafeInteger)||a.count<1||a.count>triangleLimit*3||stride<size*n||vo<0||ao<0||vo+v.byteLength>j.buffers[0].byteLength||ao+(a.count-1)*stride+size*n>v.byteLength)fail('Geometry accessor out of bounds');
      return {count:a.count,read(row,k=0){if(row<0||row>=a.count)fail('Vertex index out of bounds');const p=start+row*stride+k*size;switch(a.componentType){case 5121:return bin.getUint8(p);case 5123:return bin.getUint16(p,true);case 5125:return bin.getUint32(p,true);case 5126:return bin.getFloat32(p,true)}}}
    }
    const scene=j.scenes?.[j.scene??0];if(!Array.isArray(scene?.nodes))fail('No default scene');
    const chunks=[],bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};let count=0,nonOpaque=0,visits=0;
    function visit(id,parent,path){
      if(path.has(id)||path.size>=128||++visits>100000)fail('Invalid node hierarchy');
      const n=j.nodes?.[id];if(!n||n.skin!==undefined||n.weights||n.extensions?.EXT_mesh_gpu_instancing)fail('Unsupported node');
      const m=matrixMultiply(parent,nodeMatrix(n));if(!finite(m))fail('Invalid transform');
      if(n.mesh!==undefined){const mesh=j.meshes?.[n.mesh];if(!mesh||mesh.weights)fail('Unsupported mesh');
        for(const p of mesh.primitives||[]){
          if((p.mode??4)!==4||p.targets||p.extensions?.KHR_draco_mesh_compression)fail('Export uncompressed TRIANGLES without morphs');
          const pos=accessor(p.attributes?.POSITION,'VEC3',[5126]),idx=p.indices===undefined?null:accessor(p.indices,'SCALAR',[5121,5123,5125]),elements=idx?idx.count:pos.count;
          if(elements%3||count+elements/3>triangleLimit)fail('Triangle budget exceeded; simplify model');
          count+=elements/3;
          const mat=j.materials?.[p.material],opaque=(!mat?.alphaMode||mat.alphaMode==='OPAQUE')&&!mat?.extensions?.KHR_materials_transmission;
          if(!opaque)nonOpaque+=elements/3;
          const colour=mat?.pbrMetallicRoughness?.baseColorFactor?.slice(0,3)||[.55,.59,.64];if(colour.length!==3||!finite(colour))fail('Invalid material');
          const xyz=new Float32Array(elements*3),lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
          for(let k=0;k<elements;k++){const v=idx?idx.read(k):k,q=transform(m,[pos.read(v,0),pos.read(v,1),pos.read(v,2)]),local=[q[0],-q[2],q[1]];
            if(!finite(local)||local.some(x=>Math.abs(x)>1e6))fail('Invalid or excessively distant vertex');xyz.set(local,k*3);
            for(let i=0;i<3;i++){lo[i]=Math.min(lo[i],local[i]);hi[i]=Math.max(hi[i],local[i]);bounds.min[i]=Math.min(bounds.min[i],local[i]);bounds.max[i]=Math.max(bounds.max[i],local[i])}
          }
          chunks.push({name:String(n.name||mesh.name||'Mesh'),xyz,min:lo,max:hi,colour,opaque});if(chunks.length>10000)fail('Too many primitives; consolidate model');
        }}
      const next=new Set(path);next.add(id);for(const child of n.children||[])visit(child,m,next);
    }
    for(const id of scene.nodes)visit(id,identity(),new Set());if(!count)fail('No triangle geometry');return {chunks,bounds,count,nonOpaque}
  }
  // Double-sided finite ray/triangle intersection; per-primitive AABB pruning.
  // Non-opaque surfaces do not occlude the reference point in this model.
  function firstHit(model,origin,target,r){
    const a=inverseRegister(origin,r),b=inverseRegister(target,r),delta=sub(b,a),distance=norm(delta);if(distance<=0.01)return null;
    const dir=mul(delta,1/distance);let best=distance-.005,hit=null;
    function box(lo,hi){let t0=0,t1=best;for(let k=0;k<3;k++){if(Math.abs(dir[k])<1e-12){if(a[k]<lo[k]||a[k]>hi[k])return false;continue}let u=(lo[k]-a[k])/dir[k],v=(hi[k]-a[k])/dir[k];if(u>v)[u,v]=[v,u];t0=Math.max(t0,u);t1=Math.min(t1,v);if(t0>t1)return false}return true}
    for(const c of model.chunks){if(!c.opaque||!box(c.min,c.max))continue;const x=c.xyz;
      for(let i=0;i<x.length;i+=9){const p=[x[i],x[i+1],x[i+2]],e1=[x[i+3]-p[0],x[i+4]-p[1],x[i+5]-p[2]],e2=[x[i+6]-p[0],x[i+7]-p[1],x[i+8]-p[2]],h=cross(dir,e2),det=dot(e1,h);
        if(Math.abs(det)<1e-12)continue;const inv=1/det,s=sub(a,p),u=inv*dot(s,h);if(u<0||u>1)continue;const q=cross(s,e1),v=inv*dot(dir,q);if(v<0||u+v>1)continue;const t=inv*dot(e2,q);if(t>.005&&t<best){best=t;hit={distance:t,name:c.name,point:add(origin,mul(sub(target,origin),t/distance))}}
      }
    }return hit
  }
  const scaleStatus=(e,ppm)=>e&&Number.isFinite(ppm)&&ppm>0&&Math.abs(e.pxPerMetre-ppm)<=1e-8*Math.max(1,ppm)&&['estimated','confirmed','verified'].includes(e.status)?e.status:'uncalibrated';
  const trusted=(e,ppm)=>['confirmed','verified'].includes(scaleStatus(e,ppm));
  return {rad,deg,add,sub,mul,dot,cross,norm,planPoint,axes,optics,project,register,inverseRegister,fitRegistration,parseGlb,firstHit,scaleStatus,trusted}
})();
self.onmessage=async e=>{try{const model=S.parseGlb(await e.data.arrayBuffer());self.postMessage({model},model.chunks.map(c=>c.xyz.buffer))}catch(err){self.postMessage({error:err.message||String(err)})}};
