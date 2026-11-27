// Resume the original deep link in the same tab after Access authentication.
try{
  const key='sightline.auth-return.v1',hash=sessionStorage.getItem(key);
  sessionStorage.removeItem(key);
  if(typeof hash==='string'&&hash.length<=32768&&/^#(?:plan=[A-Za-z0-9._-]+|project=[a-f0-9]{32})$/.test(hash))location.replace('/sightline/'+hash);
}catch{}
