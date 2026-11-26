// Manufacturer-sourced optical registry; reviewed 2026-11-26.
export function createEquipment(){
  // Native focal length in mm; lens-side active aperture may differ from the
  // physical sensor where a camera contains an optical relay.
  const sources={
    canon2023:'https://www.usa.canon.com/bin/canon/downloadasset?path=%2Fcontent%2Fdam%2Fcanon-assets%2Fbrochures%2Fpro%2FBroadcast-Cinema-Lens-Catalog_2023.pdf',
    sonyCurrent:'https://pro.sony/en_BE/products/4k-and-hd-camera-systems',
    sonyDiscontinued:'https://pro.sony/ue_US/products/4k-and-hd-camera-systems?discontinued=true',
    canonBox:'https://gdlp01.c-wss.com/gds/1/0300044131/02/boxls-omls-d004b-eng.pdf',
    canonUhd:'https://www.usa.canon.com/content/dam/canon-assets/brochures/pro/Broadcast-and-Cinema-Lens-Catalog-2021.pdf',
    canonHd:'https://downloads.canon.com/bctv/BT1-B070-F_web.pdf',
    canonLong:'https://www.usa.canon.com/content/dam/canon-assets/white-papers/pro/4K_UHDxs_Testimonial_Brochure_2018.pdf',
    canonLegacy:'https://www2.canon.com.hk/myContent/Manual_Download/broadcast/digisuper_76.pdf',
    fuji:'https://global.fujifilm.com/en/business-optical-devices/tv-cine/tv',
    fujiBox:'https://www.fujifilm.com/se/en/business/cine-and-broadcast/studio-field/4k',
    sonyLive:'https://pro.sony/ue_US/products/4k-and-hd-camera-systems?discontinued=false',
    sonyHdc:'https://pro.sony/s3/2020/09/09115012/HDC-5500_3500_3100_3170_P50_P31_Brochure_V3_Sep2021.pdf',
    sonyP1:'https://pro.sony/s3/cms-static-content/file/12/1237486956912.pdf',
    sonyP43:'https://pro.sony/en_GN/products/4k-and-hd-camera-systems/hdc-p43',
    sony2500:'https://pro.sony/en_GB/products/4k-and-hd-camera-systems/hdc-2500',
    sonyLegacy:'https://pro.sony/s3/cms-static-content/file/51/1237494843851.pdf',
    sony2018:'https://pro.sony/s3/2018/09/14074151/IBC-Sales-Enablement-2018_EXTERNAL.pdf',
    sonyX400:'https://pro.sony/en_GB/pdf/pxw-x400',
    sonyZ750:'https://pro.sony/en_SE/products/shoulder-camcorders/pxw-z750',
    sonyFR7:'https://helpguide.sony.net/ilc/2240/v1/en/contents/TP1000673490.html',
    sony28:'https://www.sony.com/en-ae/electronics/camera-lenses/selp28135g/specifications',
    sony18:'https://www.sony.com/electronics/support/lenses-e-mount-lenses/selp18110g/specifications',
    sonyCine:'https://pro.sony/en_GB/products/digital-cinema-cameras/camera-and-display-plugin',
    gv:'https://www.grassvalley.com/ldx-100/',
    gvCompact:'https://wwwapps.grassvalley.com/docs/Manuals/cameras/ldx_compact/3922-496-32531_LDXC82_C86_C86N_UserGuide_v1.0.pdf',
    pana:'https://eu.connect.panasonic.com/sites/default/files/media/document/2024-06/PAV_QR_G09_web_en_1712543302.6245_21.pdf',
    ue160:'https://eu.connect.panasonic.com/se/sv/broadcast-proav/remote-ptz-camera-systems/aw-ue160',
    ue150:'https://ap.connect.panasonic.com/sites/default/files/media/document/2025-08/E_AW-UE150_WEB_0428.pdf',
    ue100:'https://eu.connect.panasonic.com/se/sv/broadcast-proav/remote-ptz-camera-systems/aw-ue100',
    ue80:'https://eu.connect.panasonic.com/fi/en/broadcast-proav/remote-ptz-camera-systems/aw-ue80',
    un70:'https://eu.connect.panasonic.com/se/en/broadcast-proav/aw-un70',
    bmd:'https://www.blackmagicdesign.com/developer/products/camera/techspecs',
    ursa:'https://www.blackmagicdesign.com/uk/products/blackmagicursabroadcast/techspecs',
    marshall:'https://marshall-usa.com/pdf/Marshall-catalog.pdf',
    marshallMini:'https://marshall-usa.com/pdf/Marshall_CV503-506-344-346-manual.pdf',
    cv568:'https://marshall-usa.com/cameras/CV568/',
    tail2:'https://device.report/m/8a37de903383bb72a7a581af20b226d07eff027398bf420a87daf19ef96feb77',
    tailAdv:'https://www.obsbot.com/obsbot-tail-2-advanced-ptzr-4k-live-production-camera/specs',
    tailAir2:'https://www.obsbot.com/obsbot-tail-air-2-streaming-camera/specs',
    tailAir:'https://www.obsbot.com.in/obsbot-tail-air-streaming-camera/specs',
    arri35:'https://www.arri.com/en/live-systems/live-cameras/alexa-35-live',
    arriLF:'https://www.arri.com/en/cine-systems/cine-cameras/alexa-mini-lf',
    amira:'https://www.arri.com/en/live-systems/live-cameras/amira-live'
  };
  const mode=(id,name,width,height,mount,source,confidence='published',note='')=>({id,name,width,height,mount,source,confidence,note});
  const b4=source=>[mode('b4-169','B4 / 16:9 nominal lens-side aperture',9.6,5.4,'B4',source,'nominal','Confirm active acquisition window; a relay can map this aperture onto a larger physical sensor.')];
  const s35=(mount,source)=>[mode('s35-nominal','Super 35 nominal 16:9 — confirm active area',24.89,24.89*9/16,mount,source,'nominal','S35 is a family, not a fixed image aperture.')];
  const cameras=[];
  const cid=(brand,name)=>brand.toLowerCase().replace(/[^a-z0-9]/g,'')+'-'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
  function camera(brand,name,kind,modes,source,extra={}){cameras.push({id:cid(brand,name),brand,name,kind,modes,source,...extra})}
  function group(brand,names,kind,modes,source){for(const name of names)camera(brand,name,kind,modes,source)}
  group('Sony',['HDC-5500','HDC-5500V','HDC-3500','HDC-3500V','HDC-3500R','HDC-3500RV','HDC-3200','HDC-3200R','HDC-3100','HDC-3170','HXC-FZ90'],'system',b4('sonyCurrent'),'sonyCurrent');
  group('Sony',['HDC-2500','HDC-2400','HDC-2570'],'system',b4('sony2500'),'sony2500');
  group('Sony',['HDC-1700','HSC-100R','HSC-100RF','HSC-300R','HSC-300RF','HXC-FB80','HDC-2000B','HDC-2000W'],'system',b4('sonyDiscontinued'),'sonyDiscontinued');
  group('Sony',['HDC-4300'],'system-hfr',b4('sony2018'),'sony2018');
  group('Sony',['HDC-P1','HDC-P1/A'],'compact-b4',b4('sonyP1'),'sonyP1');
  group('Sony',['HDC-P31','HDC-P50','HDC-P50A','HXC-P70'],'compact-b4',b4('sonyCurrent'),'sonyCurrent');
  camera('Sony','HDC-P43','compact-b4',b4('sonyP43'),'sonyP43',{dimensions:{width:119,height:140,depth:212}});
  group('Sony',['HDC-F5500','HDC-F5500V'],'large-sensor-system',s35('PL','sonyCine'),'sonyCine');
  camera('Sony','HDC-4800','system-hfr',s35('PL','sony2018'),'sony2018');
  camera('Sony','PXW-X400','eng',b4('sonyX400'),'sonyX400');
  camera('Sony','PXW-Z750','eng',b4('sonyZ750'),'sonyZ750');
  camera('Sony','ILME-FR7','interchangeable-ptz',[mode('ff-video','Full-frame 16:9 nominal video window',35.6,35.6*9/16,'E','sonyFR7','nominal','Physical sensor 35.6 × 23.8 mm; verify actual active readout.')],'sonyFR7',{dimensions:{width:227,height:289,depth:233}});
  group('Grass Valley',['LDX 110','LDX 135','LDX 150'],'system',b4('gv'),'gv');
  group('Grass Valley',['LDX 135 RF','LDX 150 RF'],'system-rf',b4('gv'),'gv');
  group('Grass Valley',['LDX C110','LDX C135','LDX C150'],'compact-b4',b4('gv'),'gv');
  group('Grass Valley',['LDX C82','LDX C86','LDX C86N'],'compact-b4',b4('gvCompact'),'gvCompact');
  camera('Grass Valley','LDX 180','large-sensor-system',s35('PL','gv'),'gv');
  group('Panasonic',['AK-UCX100','AK-UC4000','AK-UC4000B','AK-UC3300','AK-HC3900'],'system',b4('pana'),'pana');
  camera('Panasonic','AK-UBX100','compact-b4',b4('pana'),'pana');
  camera('Panasonic','AK-PLV100','large-sensor-system',s35('PL','pana'),'pana');
  camera('Blackmagic Design','URSA Broadcast G2','system',[...b4('ursa'),mode('ef-6k','EF / 6K full sensor',23.10,12.99,'EF','ursa','published','Confirm acquisition crop and installed mount.')],'ursa');
  camera('Blackmagic Design','Micro Studio Camera 4K G2','compact',[mode('mft-uhd','UHD 17.78 × 10 mm',17.78,10,'MFT','bmd')],'bmd');
  const manual=(brand,name,kind,mount,source,extra={})=>camera(brand,name,kind,[mode('manual','Enter verified active optical aperture',null,null,mount,source,'unverified','Active acquisition window not established; enter dimensions.')],source,extra);
  manual('Blackmagic Design','Studio Camera 4K Plus G2','studio','MFT','bmd');
  manual('Blackmagic Design','Studio Camera 4K Pro G2','studio','MFT','bmd');
  manual('Blackmagic Design','Studio Camera 6K Pro','studio','EF','bmd');
  const a35=[mode('og','4.6K 3:2 Open Gate',28,19.2,'PL','arri35'),mode('46-169','4.6K 16:9',28,15.7,'PL','arri35'),mode('4k-169','4K 16:9',24.9,14,'PL','arri35'),mode('38-169','3.8K 16:9',23.3,13.1,'PL','arri35'),mode('s16','2K S16 16:9',12.4,7,'PL','arri35')];
  group('ARRI',['ALEXA 35 Live','ALEXA 35'],'large-sensor-system',a35,'arri35');
  const lf=[mode('lf-og','4.5K LF Open Gate',36.7,25.54,'LPL','arriLF'),mode('lf-43','4.3K LF 16:9',35.64,20.05,'LPL','arriLF'),mode('lf-38','3.8K LF 16:9',31.68,17.82,'LPL','arriLF'),mode('s35-32','3.2K S35 16:9',26.4,14.85,'LPL','arriLF')];
  group('ARRI',['ALEXA Mini LF','ALEXA LF'],'cine',lf,'arriLF');
  const am=[mode('uhd','UHD / 3.2K',26.4,14.85,'PL','amira'),mode('hd','HD / 2.8K',23.76,13.37,'PL','amira'),mode('s16','S16 HD',13.2,7.43,'PL','amira')];
  group('ARRI',['AMIRA Live','AMIRA'],'large-sensor-system',am,'amira');
  function integrated(brand,name,kind,wide,tele,hWide,hTele,source,aspect=16/9,note='',mount='integrated',removable=false){
    const width=2*wide*Math.tan(hWide*Math.PI/360);
    camera(brand,name,kind,[mode('factory','Factory optics / published HFOV',width,width/aspect,mount,source,'derived',note||'Published HFOV endpoints; intermediate positions and output crop are modelled.')],source,{integrated:{wide,tele,hWide,hTele,aspect,source,removable}})
  }
  integrated('Panasonic','AW-UE160','ptz',8.8,176,75.1,4,'ue160');
  integrated('Panasonic','AW-UE150','ptz',8.8,176,75.1,4,'ue150');
  integrated('Panasonic','AW-UE100','ptz',4.12,98.9,74.1,3.3,'ue100');
  integrated('Panasonic','AW-UE80','ptz',4.12,98.9,74.1,3.3,'ue80');
  manual('Panasonic','AW-UN70','ptz','integrated','un70',{fixedRange:[4.08,81.6]});
  integrated('Marshall','CV503','miniature-pov',3.6,3.6,72,72,'marshallMini',16/9,'Factory 3.6 mm M12; select another optical configuration if the lens is changed.','M12',true);
  integrated('Marshall','CV506','miniature-pov',3.6,3.6,72,72,'marshallMini',16/9,'Factory 3.6 mm M12; select another optical configuration if the lens is changed.','M12',true);
  integrated('Marshall','CV568','miniature-pov',4.4,4.4,81,81,'cv568',16/9,'Factory 4.4 mm M12; select another optical configuration if the lens is changed.','M12',true);
  manual('Marshall','CV344','compact','C/CS','marshallMini');manual('Marshall','CV346','compact','C/CS','marshallMini');
  manual('Marshall','CV730','ptz','integrated','marshall',{fixedRange:[6.5,202]});
  manual('Marshall','CV355-10X','zoom-block','integrated','marshall',{fixedRange:[4.7,47]});
  integrated('OBSBOT','Tail 2','ptzr',4.6,23,81,18,'tail2',16/9,'Optical 5x; output aspect and intermediate positions modelled. Hybrid zoom is a separate crop.');
  integrated('OBSBOT','Tail 2 ADV','ptzr',5.3,110,55,2.7,'tailAdv',4/3,'Published H/V angles imply approximately 4:3; 16:9 is modelled as a centred crop, not a verified video mode.');
  integrated('OBSBOT','Tail Air 2','ptz',8.7,8.7,72.6,72.6,'tailAir2',4/3,'Fixed optical lens; 16:9 is modelled as a centred crop.');
  manual('OBSBOT','Tail Air','ptz','integrated','tailAir');
  const lenses=[];
  function lens(brand,id,name,wide,tele,mount,kind,source,extenders=[1],coverage=null,extra={}){lenses.push({brand,id,name,wide,tele,mount,kind,source,extenders,coverage,...extra})}
  function batch(brand,rows,mount,kind,source,extenders=[1,2],coverage=11){for(const [id,name,w,t,extra] of rows)lens(brand,id,name,w,t,mount,kind,source,extenders,coverage,extra||{})}
  batch('Canon',[
    ['uj122','UJ122x8.2B',8.2,1000],['uj122af','UJ122x8.2B AF',8.2,1000],['uj111','UJ111x8.3B',8.3,925],['uj90','UJ90x9B',9,810],['uj86','UJ86x9.3B',9.3,800],['uj66','UJ66x9B',9,600],['uj27','UJ27x6.5B',6.5,180],['xj95long','XJ95x12.4B',12.4,1178],['xj95','XJ95x8.6B',8.6,820],['xj80','XJ80x8.8B',8.8,704]
  ],'B4','box','canonBox');
  batch('Canon',[
    ['xj100','XJ100x9.3B',9.3,930,{confidence:'nominal'}],['xj86','XJ86x9.3B',9.3,800,{confidence:'nominal'}],['xj86long','XJ86x13.5B',13.5,1161,{confidence:'nominal'}],['xj75','XJ75x9.3B',9.3,700,{confidence:'nominal'}],['xj76','XJ76x9B',9,690,{confidence:'nominal'}]
  ],'B4','box','canonLegacy');
  batch('Canon',[['cj45wide','CJ45ex9.7B',9.7,437],['cj45long','CJ45ex13.6B',13.6,612]],'B4','field','canonLong');
  batch('Canon',[
    ['cj25','CJ25ex7.6B',7.6,190],['cj24','CJ24ex7.5B',7.5,180],['cj20wide','CJ20ex5.0B',5,100],['cj20','CJ20ex7.8B',7.8,156],['cj18','CJ18ex7.6B',7.6,137],['cj17wide','CJ17ex6.2B',6.2,106],['cj15wide','CJ15ex4.3B',4.3,65],['cj14','CJ14ex4.3B',4.3,60],['cj15','CJ15ex8.5B',8.5,128]
  ],'B4','portable','canonUhd');
  batch('Canon',[
    ['hj14','HJ14ex4.3B',4.3,60],['hj17wide','HJ17ex6.2B',6.2,106],['hj18','HJ18ex7.6B',7.6,137],
    ['hj17','HJ17ex7.6B',7.6,130,{confidence:'nominal'}],['hj22','HJ22ex7.6B',7.6,168,{confidence:'nominal'}],['hj24','HJ24ex7.5B',7.5,180,{confidence:'nominal'}],['hj21','HJ21ex7.5B',7.5,158,{confidence:'nominal'}]
  ],'B4','portable','canonHd');
  batch('Canon',[['hj40','HJ40ex10B',10,400],['hj40long','HJ40ex14B',14,560]],'B4','field','canonUhd');
  batch('Fujinon',[
    ['ua125','UA125x8BESM',8,1000],['ua107','UA107x8.4BESM',8.4,900],['ua107af','UA107x8.4BESM AF',8.4,900],['ua80','UA80x9',9,720],['ua70','UA70x8.7BESM',8.7,610],['ua27','UA27x6.5BESM',6.5,180]
  ],'B4','box','fujiBox');
  lens('Fujinon','ua80-12','UA80x9BESM 1.2x EXT',9,700,'B4','box','fuji',[1,1.2],11,{note:'Specific 1.2x extender variant.'});
  batch('Fujinon',[['xa99','XA99x8.4BESM',8.4,832],['xa77','XA77x9.5BESM',9.5,732],['xa55','XA55x9.5BESM',9.5,525],['ha27','HA27x6.5BESM',6.5,180],['xa22box','XA22x7BES',7,154]],'B4','box','fuji');
  lens('Fujinon','xa101','XA101x8.9 (legacy rental designation)',8.9,900,'B4','box','fuji',[1,2],11,{confidence:'nominal',note:'Verify nameplate, native endpoints and extender on actual lens.'});
  batch('Fujinon',[['ua46','UA46x9.5BERD',9.5,437],['ua46long','UA46x13.5BERD',13.5,621]],'B4','field','fuji');
  batch('Fujinon',[
    ['ua24','UA24x7.8BERD',7.8,187],['ua22','UA22x8BERD',8,176],['ua22wide','UA22x4.8BERD',4.8,106],['ua18','UA18x5.5BERD',5.5,100],['ua14','UA14x4.5BERD',4.5,63],['ua13','UA13x4.5BERD',4.5,59],['ha14','HA14x4.5BERD',4.5,63],['ha18wide','HA18x5.5BERD',5.5,100],['ha18','HA18x7.6BERD',7.6,137],['ha19','HA19x7.4BERD',7.4,141],['ha22','HA22x7.3BERD',7.3,161],['ha23','HA23x7.6BERD',7.6,175]
  ],'B4','portable','fuji');
  lens('Fujinon','ha14legacy','HA14x4.3 (legacy rental designation)',4.3,60,'B4','portable','fuji',[1,2],11,{confidence:'nominal',note:'Check nameplate; not the documented HA14x4.5.'});
  lens('Fujinon','ha24legacy','HA24x7.6 (legacy rental designation)',7.6,182.4,'B4','portable','fuji',[1,2],11,{confidence:'nominal',note:'Rounded ratio × wide focal estimate; verify tele limit.'});
  lens('Fujinon','la30','LA30x7.8BRM-XB2',7.8,234,'B4','portable','fuji',[1],11);
  batch('Fujinon',[['za12','ZA12x4.5',4.5,54],['za17','ZA17x7.6',7.6,130],['za22','ZA22x7.6',7.6,167]],'B4','portable','fuji',[1]);
  batch('Fujinon',[['duvo25','Duvo 25-1000',25,1000,{expandsCoverage:true}]],'PL','box','fuji',[1,1.5],28.55);
  batch('Fujinon',[['duvo24','Duvo 24-300',24,300,{expandsCoverage:true}],['duvo14','Duvo 14-100',14,100,{expandsCoverage:true}]],'PL','field','fuji',[1,1.5],28.55);
  batch('Fujinon',[['cabrio20','Cabrio XK 20-120',20,120],['cabrio19','Cabrio ZK 19-90',19,90],['cabrio25','Cabrio ZK 25-300',25,300],['cabrio85','Cabrio ZK 85-300',85,300],['premista19','Premista 19-45',19,45],['premista28','Premista 28-100',28,100],['premista80','Premista 80-250',80,250]],'PL','portable','sonyCine',[1],null);
  lens('Sony','selp28135','FE PZ 28-135mm F4 G OSS',28,135,'E','portable','sony28',[1],43.27);
  lens('Sony','selp18110','E PZ 18-110mm F4 G OSS',18,110,'E','portable','sony18',[1],null,{note:'APS-C; verify image circle in selected mode.'});
  lens('Canon','cn7','CN7x17 KAS S (PL version)',17,120,'PL','portable','canonUhd',[1],null);
  lens('Canon','cn20','CN20x50 IAS H (PL version)',50,1000,'PL','field','canonUhd',[1,1.5],null);
  lens('Canon','cn8','CN8x15 IAS S (PL version)',15,120,'PL','portable','sonyCine',[1,1.5],null);
  lens('Angénieux','optimo25','Optimo 25-250 (S35)',25,250,'PL','field','sonyCine',[1],null);
  lens('Marshall','m12-36','Stock 3.6 mm M12',3.6,3.6,'M12','mini','marshallMini',[1],null);
  lens('Marshall','m12-44','Stock 4.4 mm M12',4.4,4.4,'M12','mini','cv568',[1],null);
  // A family/catalogue link is not evidence of an individually checked
  // suffix, aperture, mechanical dimension or extender.
  const confirmedCanon=['uj122','uj111','uj90','uj86','uj66','uj27'];
  const confirmedFuji=['ua125','ua107','ua107af','ua80-12','ua70','ua27','xa99','xa77','xa55','ha27','xa22box','ua46','ua46long','ua24','ua22','ua13','duvo25','duvo24','duvo14','za12','za17','za22'];
  for(const l of lenses){
    if(confirmedCanon.includes(l.id)){l.confidence='published';l.source='canon2023';if(l.id!=='uj27')l.mod=3;}
    else if(confirmedFuji.includes(l.id)){l.confidence='published';l.source='fuji';if(l.id==='ua125'){l.dimensions={width:264,height:258,length:635};l.mod=3;}}
    else l.confidence=l.confidence||'catalogue / confirm exact variant';
  }
  const cameraById=id=>cameras.find(c=>c.id===id),lensById=id=>lenses.find(l=>l.id===id);
  const lensName=l=>l.brand+' '+l.name;
  function cameraDefaults(id,modeId){
    const c=cameraById(id);if(!c)return null;const m=c.modes.find(x=>x.id===modeId)||c.modes[0],i=c.integrated;
    const out={cameraPresetId:c.id,body:c.brand+' '+c.name,sensorModeId:m.id,imagerId:'custom',imagerWidth:m.width,imagerHeight:m.height,cameraMount:m.mount,apertureStatus:m.confidence,aspect:m.width&&m.height?m.width/m.height:16/9,adapterFactor:1,adapterNote:'',cropFactor:1,integratedOptics:null};
    if(i)Object.assign(out,{wide:i.wide,tele:i.tele,focalMm:i.wide,lensName:i.removable?'Factory M12 '+i.wide+' mm':'Integrated '+i.wide+'–'+i.tele+' mm optical lens',lensMount:m.mount,lensPresetId:null,extender:1,integratedOptics:{...i},aspect:16/9});
    else if(c.fixedRange)Object.assign(out,{wide:c.fixedRange[0],tele:c.fixedRange[1],focalMm:c.fixedRange[0],lensName:'Integrated optical zoom',lensMount:'integrated',lensPresetId:null,extender:1});
    else if(m.mount==='integrated')Object.assign(out,{wide:null,tele:null,focalMm:null,lensName:'Integrated optics / enter native focal length',lensMount:'integrated',lensPresetId:null,extender:1});
    return out;
  }
  function lensDefaults(id){const l=lensById(id);return l?{lensPresetId:l.id,lensName:lensName(l),lensMount:l.mount,wide:l.wide,tele:l.tele,focalMm:l.wide,extender:1,integratedOptics:null}:null}
  function frame(c,f){
    const rad=Math.PI/180,deg=180/Math.PI,fail=reason=>({valid:false,reason});
    const focal=Number(f),aspect=Number(c.aspect||16/9),wide=Number(c.wide),tele=Number(c.tele),crop=Number(c.cropFactor??1),ext=Number(c.extender??1),adapter=Number(c.adapterFactor??1);
    if(![focal,aspect,wide,tele,crop,ext,adapter].every(Number.isFinite)||Math.min(focal,aspect,wide,tele,adapter)<=0||crop<1||ext<1||wide>tele||focal<wide-1e-6||focal>tele+1e-6)return fail('Invalid optical configuration or focal range.');
    const l=lensById(c.lensPresetId),i=c.integratedOptics;
    if(i&&(![i.wide,i.tele,i.hWide,i.hTele,i.aspect].every(Number.isFinite)||i.wide<=0||i.tele<i.wide||i.hWide<=0||i.hWide>=180||i.hTele<=0||i.hTele>=180||i.aspect<=0||wide!==i.wide||tele!==i.tele))return fail('Invalid integrated optical profile.');
    if(l&&c.lensMount&&c.lensMount!==l.mount)return fail('Lens mount differs from catalogue profile.');
    if(l&&!l.extenders.includes(ext))return fail('Extender not listed for this lens variant.');
    if(c.cameraMount&&c.lensMount&&c.cameraMount!==c.lensMount&&!String(c.adapterNote||'').trim())return fail('Lens mount mismatch; select compatible optics or document the adapter.');
    if(c.cameraMount==='integrated'&&l)return fail('Fixed-lens camera cannot accept a separate interchangeable lens.');
    let w=Number(c.imagerWidth),hh=Number(c.imagerHeight),status=c.apertureStatus||'nominal';
    if(!(w>0))return fail('Enter the active image aperture in millimetres.');
    if(i){
      if(ext!==1||adapter!==1)return fail('Integrated optics: use crop for digital zoom, not an interchangeable extender.');
      const t=i.tele===i.wide?0:Math.log(focal/i.wide)/Math.log(i.tele/i.wide);
      const w0=2*i.wide*Math.tan(i.hWide*rad/2),w1=2*i.tele*Math.tan(i.hTele*rad/2);
      w=w0+(w1-w0)*Math.max(0,Math.min(1,t));hh=w/i.aspect;
      status=(t<1e-8||t>1-1e-8)?'published HFOV / modelled output crop':'interpolated HFOV / modelled output crop';
    }
    if(!(hh>0))hh=w/aspect;
    if(w/hh>aspect)w=hh*aspect;else hh=w/aspect;
    w/=crop;hh/=crop;
    const effectiveFocal=focal*ext*adapter,coverage=l?.coverage?(l.expandsCoverage&&ext===1.5?41.3:l.coverage)*adapter:null;
    if(coverage&&Math.hypot(w,hh)>coverage+0.15)return fail('Active aperture exceeds listed image circle; verify optical adapter or crop.');
    const tanH=w/(2*effectiveFocal),tanV=hh/(2*effectiveFocal);
    return {valid:true,tanH,tanV,hfov:2*Math.atan(tanH)*deg,vfov:2*Math.atan(tanV)*deg,dfov:2*Math.atan(Math.hypot(tanH,tanV))*deg,aspect,width:w,height:hh,effectiveFocal,focal,status,lensStatus:l?.confidence||(l?'published':'custom/legacy'),coverage}
  }
  return {sources,cameras,lenses,cameraById,lensById,cameraDefaults,lensDefaults,frame,lensName}
}
