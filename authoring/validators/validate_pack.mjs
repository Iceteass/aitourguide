#!/usr/bin/env node
// Travel pack validation for History Journey v1.2 — no npm dependencies.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const folder=process.argv[2];
if(!folder){console.error('Usage: node authoring/validators/validate_pack.mjs <travel-packs/.../destination>');process.exit(2)}
const cwd=path.resolve(folder),errors=[];
const fail=m=>errors.push(m);
const readJson=file=>{try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch(e){fail('Cannot read JSON '+file+': '+e.message);return null}};
const root=readJson(path.join(cwd,'pack.json'));
if(!root){process.exit(1)}
for(const key of ['schema_version','pack_id','pack_version','country_code','city_id','title','cover','route','poi_ids','spots','files'])if(!root[key])fail('Missing '+key);
const safe=p=>typeof p==='string'&&p.length>0&&!path.isAbsolute(p)&&!p.split('/').some(s=>s==='..'||s==='.')&&!p.includes('\\')&&!p.includes('://');
const source=rel=>{if(!safe(rel)){fail('Unsafe relative path: '+rel);return null}const full=path.join(cwd,rel);if(!full.startsWith(cwd+path.sep)){fail('Path outside pack: '+rel);return null}if(!fs.existsSync(full)){fail('Missing file: '+rel);return null}return full};
const found=new Set();
for(const f of root.files||[]){const abs=source(f.path);if(found.has(f.path))fail('Duplicate file path '+f.path);found.add(f.path);if(!abs)continue;const body=fs.readFileSync(abs);if(Number.isInteger(f.bytes)&&body.length!==f.bytes)fail('Byte size differs: '+f.path);if(f.sha256&&crypto.createHash('sha256').update(body).digest('hex').toLowerCase()!==f.sha256.toLowerCase())fail('SHA-256 mismatch: '+f.path)}
source(root.cover);if(root.route){source(root.route.image);const pts=source(root.route.points);if(pts){const points=readJson(pts)?.points||[];const ids=new Set();for(const p of points){if(ids.has(p.poi_id))fail('Duplicate map poi_id '+p.poi_id);ids.add(p.poi_id);if(!(p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1))fail('Invalid normalized coordinates: '+p.poi_id)}for(const id of root.poi_ids||[])if(!ids.has(id))fail('Missing map point for '+id)}}
const ids=new Set();for(const s of root.spots||[]){if(ids.has(s.poi_id))fail('Duplicate spot ID '+s.poi_id);ids.add(s.poi_id);const abs=source(s.meta);if(!abs)continue;const meta=readJson(abs);if(!meta)continue;if(meta.poi_id!==s.poi_id)fail('POI ID mismatch for '+s.meta);const folder=path.posix.dirname(s.meta);source(folder+'/'+meta.narration);source(folder+'/'+meta.image.path);source(folder+'/'+meta.audio.path)}
if((root.poi_ids||[]).length!==ids.size)fail('poi_ids and spots counts differ');
if(!fs.existsSync(path.join(cwd,'LICENSES.md')))fail('Missing LICENSES.md');
if(errors.length){for(const e of errors)console.error('FAIL:',e);console.error('Total failures: '+errors.length);process.exit(1)}
console.log('PASS:',root.pack_id,root.pack_version,root.spots.length,'spots,',root.files.length,'assets');
