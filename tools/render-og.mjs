import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
try {
  const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
  const svg=await readFile(new URL('../og.svg',import.meta.url),'utf8');
  await page.setContent('<body style="margin:0">'+svg+'</body>');
  await page.evaluate(()=>document.fonts.ready);
  const png=await page.screenshot({path:fileURLToPath(new URL('../og.png',import.meta.url)),type:'png'});
  assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
  console.log('Generated generic Open Graph PNG (1200 × 630).');
} finally { await browser.close(); }
