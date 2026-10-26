// A reintroduced root duplicate or runtime root URL must fail CI.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const removed=['route-map.jpg','romon-preview.jpg',...['01_odotorii','02_romon','03_honden','04_senbon_torii','05_okusha','06_omokaruishi','07_return_path'].map(n=>'audio_'+n+'.mp3'),'journey-v11.js','journey-v11.css'];
const runtime=['index.html','sw.js','audio-player.js',...fs.readdirSync('app').filter(n=>/\.(js|css)$/.test(n)).map(n=>'app/'+n)];
for(const file of runtime){
 const code=fs.readFileSync(file,'utf8');
 for(const name of removed){
  assert(!code.includes(name),'Removed root reference in '+file+': '+name);
 }
 assert(!code.includes('travel-packs/JP/kyoto/fushimi-inari/'),'Destination path hardcoded in '+file);
}
for(const name of removed)assert(!fs.existsSync(name),'Root duplicate/retired v1.1 asset reintroduced: '+name);
const catalog=JSON.parse(fs.readFileSync('data/catalog.json','utf8'));
for(const entry of catalog.published){
 assert(entry.path.startsWith('travel-packs/'));
 const base=path.dirname(entry.path),pack=JSON.parse(fs.readFileSync(entry.path,'utf8'));
 assert.equal(entry.pack_id,pack.pack_id);
 assert.equal(entry.pack_version,pack.pack_version);
 assert.equal(entry.poi_count,pack.spots.length);
 assert(fs.existsSync(path.join(base,pack.cover)));
}
console.log('PASS: no root duplicates/retired files or root runtime URLs; no hardcoded destination path; catalog-linked pack cover');
