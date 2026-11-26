// Check that the single-file deployment embeds the exact tested kernel.
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const module=fs.readFileSync(new URL('./spatial-core.mjs',import.meta.url),'utf8');
const fn=module.slice(module.indexOf('export function ')+7).trim();
const expected='const Spatial = ('+fn+')();';
if(!html.includes(expected))throw Error('Embedded spatial kernel differs from tested source');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
new vm.Script(scripts.at(-1)[1]);
console.log('Embedded kernel and application syntax: passed');
