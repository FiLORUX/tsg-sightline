// Camera-chain identity and position alternatives; independent of the UI.
export function createChainCore(){
  const fields=[
    ['umd','UMD / source label'],['sourceId','Source ID'],['ccu','CCU / base station'],['rcp','RCP / paint allocation'],['rfLink','RF link / TX-RX assignment'],
    ['handoverFormat','Handover format'],['patch','Router input / patch'],['tally','Tally interface'],['returnVideo','Return video'],
    ['intercom','Camera intercom'],['notes','Open confirmations']
  ];
  const identity=c=>String(c.chainId||c.id);
  const role=c=>c.positionRole==='alternate'?'alternate':'primary';
  const value=(c,key)=>String(c.chainDetails?.[key]??'').trim();
  const details=c=>Object.fromEntries(fields.map(([k])=>[k,value(c,k)]));
  const text=v=>String(v??'').trim();
  // Protect spreadsheet exports from formula injection and embedded delimiters.
  const cell=v=>{const s=String(v??'').replace(/[\t\r\n]+/g,' ').trim();return /^[=+\-@]/.test(s)?"'"+s:s};
  function analyse(positions){
    const map=new Map(),issues=[],numbers=new Map(),sources=new Map();
    for(const p of positions){
      const id=identity(p);if(!map.has(id))map.set(id,[]);map.get(id).push(p);
    }
    const chains=[];
    for(const [id,members] of map){
      const primary=members.filter(p=>role(p)==='primary'),alternates=members.filter(p=>role(p)==='alternate'),lead=primary[0]||members[0],number=text(lead.number),src=value(lead,'sourceId');
      const errors=[];
      if(primary.length!==1)errors.push(primary.length?'More than one primary position':'No primary position');
      if(!number)errors.push('Director number missing');
      for(const [key,label] of [['number','Director number'],['body','Camera body'],['lensName','Lens'],['control','Camera control'],['imagerId','Imager format'],['imagerWidth','Active imager width'],['wide','Wide focal length'],['tele','Tele focal length'],['rf','Link type'],['viewfinder','Viewfinder']]){
        if(members.some(p=>text(p[key])!==text(lead[key])))errors.push(`${label} differs between linked positions`);
      }
      for(const [k,label] of fields){if(members.some(p=>value(p,k)!==value(lead,k)))errors.push(`${label} differs between linked positions`)}
      const chain={id,number,lead,primary,alternates,errors,details:details(lead)};
      chains.push(chain);
      for(const [key,bucket] of [[number,numbers],[src,sources]])if(key){const a=bucket.get(key)||[];a.push(chain);bucket.set(key,a)}
    }
    for(const [key,list] of numbers)if(list.length>1)for(const c of list)c.errors.push(`Director number ${key} is assigned to multiple chains`);
    for(const [key,list] of sources)if(list.length>1)for(const c of list)c.errors.push(`Source ID ${key} is assigned to multiple chains`);
    for(const c of chains)for(const msg of c.errors)issues.push({chainId:c.id,number:c.number,message:msg});
    return {chains,issues,positionCount:positions.length,alternateCount:positions.filter(p=>role(p)==='alternate').length,chainCount:chains.length,primaryCount:positions.filter(p=>role(p)==='primary').length}
  }
  // An absent value in older plans means that transport was never assigned.
  function transport(rf){return rf===true?'RF':rf===false?'Cabled':'Unassigned'}
  function schedule(positions){
    const a=analyse(positions),header=['Director number','Chain ID','UMD / source label','Source ID','Primary coverage call','Alternate positions','Camera body','Lens','Mount','Viewfinder','Camera control','Transport','CCU / base station','RCP / paint','RF link / TX-RX','Handover format','Router input / patch','Tally interface','Return video','Camera intercom','Open confirmations','Validation'];
    const rows=a.chains.map(c=>{const p=c.lead,d=c.details;return [c.number,c.id,d.umd,d.sourceId,c.primary.map(x=>x.label||x.mount).join(' | '),c.alternates.map(x=>x.label||x.mount).join(' | '),p.body,p.lensName||`${p.wide??''}-${p.tele??''} mm`,p.mount,p.viewfinder,p.control,transport(p.rf),d.ccu,d.rcp,d.rfLink,d.handoverFormat,d.patch,d.tally,d.returnVideo,d.intercom,d.notes,c.errors.join('; ')||'No identity conflicts detected; not approved']});
    return [header,...rows].map(row=>row.map(cell).join('\t')).join('\r\n')
  }
  function renumber(positions){const groups=new Map();let next=1;return positions.map(p=>{const id=identity(p);if(!groups.has(id))groups.set(id,String(next++));return {...p,number:groups.get(id)}})}
  function sharedChanges(changes){const keys=['number','body','lensName','control','viewfinder','wide','tele','imagerId','imagerWidth','rf','chainDetails'];return Object.fromEntries(keys.filter(k=>Object.hasOwn(changes,k)).map(k=>[k,changes[k]]))}
  return {fields,identity,role,details,cell,analyse,transport,schedule,renumber,sharedChanges}
}
