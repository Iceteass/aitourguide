import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
assert(fs.existsSync('app/map-overlay.js'),'Independent map overlay module must exist');
const self={};vm.runInNewContext(fs.readFileSync('app/map-overlay.js','utf8'),{self});
const api=self.JourneyMapOverlay;
const folder='travel-packs/JP/kyoto/kinkakuji-standard/';
const pack=JSON.parse(fs.readFileSync(folder+'pack.json')),points=JSON.parse(fs.readFileSync(folder+pack.route.points)).points,path=JSON.parse(fs.readFileSync(folder+pack.route.path));
assert.equal(pack.route.pin_style,'number-label');assert(pack.files.every(f=>!Object.hasOwn(f,'pin_style')));
const lines=api.visibleSegments(path,points);assert.equal(lines.length,5);
const forbidden=new Set(path.omitted_connections.map(x=>x.from_poi_id+'>'+x.to_poi_id));assert(lines.every(x=>!forbidden.has(x.from_poi_id+'>'+x.to_poi_id)));
const dirty=structuredClone(path);dirty.segments.push({...dirty.segments[0],...dirty.omitted_connections[0],visibility:'show'});assert.equal(api.visibleSegments(dirty,points).length,5);
const reverse=structuredClone(path);reverse.segments.push({...reverse.segments[0],from_poi_id:'rikushunomatsu',to_poi_id:'shariden-kinkaku'});assert.equal(api.visibleSegments(reverse,points).length,5,'Omitted connections also block reverse geometry');
for(const change of [p=>p.segments[0].waypoints[0].x=2,p=>p.segments[0].from_poi_id='missing',p=>p.segments[0].waypoints=[],p=>p.coordinate_system='geographic']){const bad=structuredClone(path);change(bad);assert.throws(()=>api.visibleSegments(bad,points));}
assert.equal(api.visibleSegments(null,points).length,0);
console.log('PASS: five valid reference segments; omissions win; invalid paths fail closed');
