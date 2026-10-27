// Fail closed on invalid guide registration; legacy catalog must remain usable.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
assert(fs.existsSync('app/catalog.js'),'Destination/guide catalog adapter is required');
const self={};vm.runInNewContext(fs.readFileSync('app/catalog.js','utf8'),{self});
const api=self.JourneyCatalog,raw=JSON.parse(fs.readFileSync('data/catalog.json','utf8'));
const legacy={...raw};delete legacy.destinations;
const old=api.normalize(legacy);
assert.equal(old.length,1);assert.equal(old[0].destination_id,raw.published[0].pack_id);assert.equal(old[0].guides[0].guide_id,'default');assert.equal(old[0].guides[0].guide_version,null);assert.equal(old[0].destination_tags.length,0);
const actual=api.normalize(raw);assert.equal(actual[0].destination_tags.join(','),'후시미구,신사,센본도리이');
assert.equal(actual[0].guides[0].guide_title,'역사 해설');assert.equal(actual[0].guides[0].guide_tags.join(','),'기본,역사');
const independent=JSON.parse(JSON.stringify(raw));independent.destinations[0].guides[0].guide_version='9.8.7';assert.equal(api.normalize(independent)[0].guides[0].guide_version,'9.8.7');assert.equal(api.normalize(independent)[0].guides[0].entry.pack_version,'1.2.0');
independent.destinations[0].guides[0].guide_version='1.2.0';assert.equal(api.normalize(independent)[0].guides[0].guide_version,'1.2.0','Independent concepts may legitimately have equal version strings');
const clone=()=>JSON.parse(JSON.stringify(raw));
let c=clone();c.destinations[0].guides[0].status='draft';assert.equal(api.normalize(c).length,0,'Private guide must not fall through to legacy visibility');
c=clone();c.destinations[0].guides.push({...c.destinations[0].guides[0],status:'review',guide_id:'future'});assert.equal(api.normalize(c)[0].guides.length,1);
for(const mutate of [x=>x.destinations.push({...x.destinations[0]}),x=>x.destinations[0].guides.push({...x.destinations[0].guides[0]}),x=>x.destinations[0].guides[0].path='../escape.json',x=>x.destinations[0].guides[0].pack_id='wrong',x=>x.destinations[0].guides[0].pack_version='9.0.0',x=>x.destinations[0].guides[0].status='unknown',x=>x.destinations[0].destination_tags=['invented'],x=>x.published.push({...x.published[0]})]){c=clone();mutate(c);assert.throws(()=>api.normalize(c));}
c=clone();c.destinations[0].guides.push({...c.destinations[0].guides[0],guide_id:'second'});assert.throws(()=>api.normalize(c),/independent/i,'Two published guides must not share legacy whole-pack storage');
for(const d of actual)for(const g of d.guides){const pack=JSON.parse(fs.readFileSync(g.entry.path,'utf8'));assert.equal(pack.pack_id,g.entry.pack_id);assert.equal(pack.pack_version,g.entry.pack_version);assert.equal(pack.spots.length,g.entry.poi_count);}
console.log('PASS: explicit guide metadata, legacy adapter, private guide hiding, ID/path/version checks, independent-storage safety gate');
