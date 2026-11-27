export function createGrip(){
  // Legacy mount identifiers are placement templates, NOT equipment IDs.
  // Do not infer payload, head, optical aperture, RF or certified limits.
  const templates={
    tripodHeavy:{family:'tripod',mobility:'fixed',geometry:'nominal tripod footprint'},
    tripodEng:{family:'tripod',mobility:'fixed',geometry:'nominal tripod footprint'},
    tripodDolly:{family:'tripod-dolly',mobility:'free-planar',geometry:'nominal caster footprint'},
    ped:{family:'pedestal',mobility:'planar-and-lift',geometry:'nominal pedestal footprint'},
    crane:{family:'telescopic-boom',mobility:'pivot-boom',geometry:'nominal horizontal boom'},
    jib:{family:'fixed-boom',mobility:'pivot-boom',geometry:'nominal horizontal boom'},
    steadicam:{family:'body-mounted-sled',mobility:'operator-path',geometry:'nominal operator and sled'},
    handheld:{family:'shoulder',mobility:'operator-path',geometry:'nominal operator footprint'},
    robo:{family:'remote-fixed',mobility:'fixed',geometry:'nominal mounting point'},
    pov:{family:'fixed-bracket',mobility:'fixed',geometry:'nominal mounting point'},
    rail:{family:'rail',mobility:'track-constrained',geometry:'nominal carriage and route'},
    special:{family:'custom',mobility:'unknown',geometry:'schematic point only'}
  };
  const systems=[
    {id:'',name:'Unspecified / custom'},
    {id:'vinten-hdt2',name:'Vinten HDT-2 tripod',families:['tripod','tripod-dolly'],source:'https://www.vinten.com/en/product/hdt-2-heavy-duty-tripod/',note:'Two-stage legs; flat four-bolt / Quickfix interface; 120 kg tripod rating, not an assembled system rating.'},
    {id:'sachtler-ob2000',name:'Sachtler OB 2000 tripod',families:['tripod','tripod-dolly'],source:'https://www.sachtler.com/en/product/tripod-ob-2000/',note:'Flat-base tripod; 140 kg tripod rating. Head, dolly and centre of gravity are independent.'},
    {id:'sachtler-ob-dolly',name:'Sachtler OB 2000 + Dolly XL',families:['tripod-dolly'],source:'https://www.sachtler.com/en/product/system-video-75-ob-2000/',note:'Caster-supported tripod. A floor dolly does not imply a rail-constrained movement.'},
    {id:'vinten-hp419',name:'Vinten HP 419 I',families:['pedestal'],source:'https://collection.sciencemuseumgroup.org.uk/objects/co8356226/vinten-hp-419-i-television-camera-pedestal',note:'Studio pedestal with a steering ring and domed housings. Confirm the installed base and wheel geometry on site.'},
    {id:'vinten-osprey',savedOnly:true,name:'Vinten Osprey Plus pedestal',families:['pedestal'],source:'https://www.vinten.com/wp-content/uploads/2023/08/v4170-0001-osprey-plus-user-guide.pdf',note:'Balanced vertical column and wheeled base; distinguish studio and OB versions.'},
    {id:'scorpio45',name:"Servicevision Scorpio 45′",families:['telescopic-boom'],source:'https://scorpio.servicevision.es/en/product/grips-en/telescopic-cranes/scorpio-45-en/scorpio-45/',note:'Published length 2.41–14 m; column extension 0.65 m; maximum optic-axis height 14.1 m. Published overall length is not automatically pivot-to-head distance. Use the configured boom and head offsets.'},
    {id:'jimmy-jib',name:'Stanton Jimmy Jib Triangle',families:['fixed-boom'],source:'https://www.jimmyjib.com/docs/manuals/Triangle_Pro_Standard_4C.pdf',note:'Modular fixed-length boom; identify installed sections, pivot and rear arm from the supplier drawing.'},
    {id:'steadicam',name:'Steadicam vest / arm / sled',families:['body-mounted-sled'],source:'https://flysteadicam.tiffen.com/products/steadicam-g-50x-arm',note:'Iso-elastic arm supports the balanced sled; sled mass is part of arm payload.'},
    {id:'glidecam-v25',name:'Glidecam V-25',families:['body-mounted-sled'],note:'Vest, spring arm and balanced sled. Confirm installed arm and sled configuration; not an electronic gimbal.'},
    {id:'agito-trax',name:'AGITO Trax',families:['rail','custom'],source:'https://motion-impossible.com/products/agito/agito-trax/',note:'Rail-constrained carriage; published chassis and gauge depend on configuration. Independent column and remote head.'},
    {id:'agito-sports',name:'AGITO Sports',families:['custom'],source:'https://motion-impossible.com/products/agito/agito-sports/',note:'Free-roaming steerable chassis; not a circular roaming envelope or a rail.'},
    {id:'cablecam',name:'Cable-suspended camera / Spidercam-type',families:['custom'],note:'Suspended translation within a configured cable volume; anchors, cable sag, tension and load cases require vendor model. No generic clearance.'},
    {id:'vertical',name:'Vertical lift / tower',families:['custom'],note:'Constrained vertical travel; enter base and upper/lower optical datum independently.'},
    {id:'motor-gimbal',name:'Handheld motorised gimbal',families:['custom','shoulder'],source:'https://www.dji.com/rs-4-pro/specs',note:'Motorised pan/tilt/roll; not an iso-elastic support arm. Payload balance and angular limits depend on actual build.'},
    {id:'fixed-clamp',name:'Fixed bracket / clamp',families:['fixed-bracket','remote-fixed','custom'],note:'Mounting structure, elevation, secondary retention and allowable load require local rigging approval.'}
  ];
  const heads=[
    {id:'',name:'Unspecified / custom'},
    {id:'vector900',name:'Vinten Vector 900 — manual pan/tilt head',source:'https://www.vinten.com/wp-content/uploads/2023/06/1_vector-950.pdf'},
    {id:'video75',name:'Sachtler Video 75 Plus Studio — fluid head',source:'https://www.sachtler.com/en/product/system-video-75-ob-2000-2/'},
    {id:'video90',name:'Sachtler Video 90 — fluid head',source:'https://www.sachtler.com/en/product/system-video-90-ob-2000/'},
    {id:'remote2',name:'Remote pan/tilt head — two axis'},
    {id:'srh3',name:'ARRI SRH-3 — stabilised three-axis remote head',source:'https://www.arri.com/en/cine-systems/camera-stabilizer-systems/legacy/stabilized-remote-heads/srh-3'},
    {id:'remote3',name:'Stabilised remote head — three axis'},
    {id:'integratedptz',name:'Integrated PTZ / PTZR camera'},
    {id:'none',name:'Rigid bracket / no pan-tilt head'},
    {id:'sled',name:'Mechanical sled / gimbal bearing'}
  ];
  const template=c=>templates[c.mount]||templates.special;
  const profile=(c)=>{const p=c.grip||{};return {system:typeof p.system==='string'?p.system:'',head:typeof p.head==='string'?p.head:'',reference:typeof p.reference==='string'?p.reference:'',...p}};
  // Only explicit user-entered pivot-to-head length and elevation are used.
  // Legacy reach is a horizontal projection. Existing coordinates stay intact.
  function boom(c){
    const p=profile(c),legacy={explicit:false,valid:true,reach:Number(c.reach)||0,min:Number(c.reachMin)||0,max:Number(c.reachMax)||0,tail:Number(c.tail)||0,z:Number(c.height)||0};
    if(p.boomMode!=='spatial')return legacy;
    const values=[p.boomLength,p.boomElevation,p.pivotHeight,p.headOffsetZ,p.boomMin,p.boomMax,p.rearLength];
    if(!values.every(Number.isFinite)||p.boomLength<=0||p.boomMin<=0||p.boomMax<p.boomMin||p.boomLength<p.boomMin-1e-8||p.boomLength>p.boomMax+1e-8||Math.abs(p.boomElevation)>=90||p.rearLength<0)return {...legacy,valid:false};
    if(c.mount==='jib'&&(Math.abs(p.boomMax-p.boomMin)>1e-8||Math.abs(p.boomLength-p.boomMin)>1e-8))return {...legacy,valid:false};
    const a=p.boomElevation*Math.PI/180,co=Math.cos(a);
    return {explicit:true,valid:true,reach:p.boomLength*co,min:p.boomMin*co,max:p.boomMax*co,tail:p.rearLength*co,z:p.pivotHeight+p.boomLength*Math.sin(a)+p.headOffsetZ};
  }
  const placementSystems={ped:'vinten-hp419',jib:'jimmy-jib'};
  function placementGrip(mount,previous={}){
    const system=placementSystems[mount];
    if(!system||previous?.system===system)return {...previous};
    return previous?.head ? {system,head:previous.head} : {system};
  }
  function systemOptions(c){
    const current=profile(c).system,family=template(c).family;
    return systems.filter(s=>s.id===current||(!s.savedOnly&&(!s.families||s.families.includes(family))));
  }
  const compatible=c=>{const s=systems.find(x=>x.id===profile(c).system);return !s||!s.families||s.families.includes(template(c).family)};
  return {templates,systems,heads,template,profile,boom,compatible,placementGrip,systemOptions};
}
