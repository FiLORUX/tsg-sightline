// Check that the single-file deployment embeds the exact tested kernels.
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
for(const [name,expected] of [['spatial-core.mjs',fn=>'const SpatialFactory = ('+fn+');'],['chain-core.mjs',fn=>'const Chains = ('+fn+')();'],['equipment-core.mjs',fn=>'const Equipment = ('+fn+')();']]){
 const module=fs.readFileSync(new URL('./'+name,import.meta.url),'utf8');
 const fn=module.slice(module.indexOf('export function ')+7).trim();
 if(!html.includes(expected(fn)))throw Error('Embedded '+name+' differs from tested source');
}
const spatial=fs.readFileSync(new URL('./spatial-core.mjs',import.meta.url),'utf8');
const factory=spatial.slice(spatial.indexOf('export function ')+7).trim();
const worker=fs.readFileSync(new URL('../geometry-worker.js',import.meta.url),'utf8');
if(!worker.includes('const S=('+factory+')();'))throw Error('Hosted worker differs from spatial kernel');
new vm.Script(worker);
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
new vm.Script(scripts.at(-1)[1]);
console.log('Embedded kernels and application syntax: passed');
