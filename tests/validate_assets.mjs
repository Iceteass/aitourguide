// Catch non-deterministic defaults, unsafe paths, broken scope fallback and missing offline assets.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
assert(fs.existsSync('app/assets.js'),'Common image manifest selection must be implemented');
const self={};vm.runInNewContext(fs.readFileSync('app/assets.js','utf8'),{self,URL});
const api=self.JourneyAssets;
const image=(id,target='app',extra={})=>({id,target,role:'background',path:'app/backgrounds/'+id+'.jpg',country_code:null,city_id:null,season:'all',tags:[],enabled:true,default:true,offline_required:false,fallbacks:['app/fallbacks/road.svg'],source:{description:'Test input',url:null,license:'unverified',status:'unverified'},bytes:1,sha256:'0'.repeat(64),...extra});
const app=image('base');
const splash=image('start','app',{role:'splash',path:'app/splash/start.jpg'});
const country=image('japan','country',{country_code:'JP',path:'countries/JP/images/japan.jpg'});
const city=image('kyoto','city',{country_code:'JP',city_id:'kyoto',path:'countries/JP/cities/kyoto/images/kyoto.jpg'});
const make=images=>({schema_version:'1.0.0',images:[app,splash,...images]});
let m=api.validate(make([country,city]));
for(const [context,want] of [[{screen:'splash'},'start'],[{screen:'country',country_code:'JP'},'start'],[{screen:'city',country_code:'JP'},'japan'],[{screen:'destination',country_code:'JP',city_id:'kyoto'},'kyoto'],[{screen:'destination',country_code:'JP',city_id:'osaka'},'japan'],[{screen:'destination',country_code:'KR',city_id:'seoul'},'base']])assert.equal(api.select(m,context).id,want);
const z=image('z','country',{...country,id:'z'}),a=image('a','country',{...country,id:'a'});
for(const entries of [[z,a],[a,z]])assert.equal(api.select(api.validate(make(entries)),{screen:'city',country_code:'JP'}).id,'a','Array order must not change selection');
assert.equal(api.select(api.validate(make([{...country,enabled:false}, {...a,default:false}, {...z,season:'spring'}])),{screen:'city',country_code:'JP'}).id,'a','Disabled and seasonal images must not override the all-season default policy');
const urls=api.urls(splash,'https://example.test/aitourguide/assets/manifest.json');
assert.equal(urls[0],'https://example.test/aitourguide/assets/app/splash/start.jpg');
assert.equal(urls[1],'https://example.test/aitourguide/assets/app/fallbacks/road.svg');
for(const bad of ['../escape.jpg','/absolute.jpg','https://example.test/x.jpg','app/%2e%2e/x.jpg','app/a.jpg?x','app/a.jpg#x','app/a\\b.jpg'])assert.throws(()=>api.validate(make([{...country,path:bad}])));
for(const patch of [{target:'destination'},{enabled:'yes'},{city_id:'wrong'},{sha256:'bad'},{bytes:-1},{source:null}])assert.throws(()=>api.validate(make([{...country,...patch}])));
assert.throws(()=>api.validate(make([country,{...country}])),'Duplicate image IDs must fail');
assert.throws(()=>api.validate({schema_version:'9',images:[]}));
const manifest=api.validate(JSON.parse(fs.readFileSync('assets/manifest.json','utf8')));
const offline=api.offlineAssets(manifest);
for(const entry of manifest.images){
 const file='assets/'+entry.path,bytes=fs.readFileSync(file);
 assert.equal(bytes.length,entry.bytes,file);
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),entry.sha256,file);
 if(entry.source.original_path)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(entry.source.original_path)).digest('hex'),entry.sha256,'Compatibility alias changed: '+entry.source.original_path);
 if(entry.enabled)assert([...offline.required,...offline.optional].includes(entry.path));
 for(const path of entry.fallbacks){assert(fs.existsSync('assets/'+path));if(entry.enabled)assert([...offline.required,...offline.optional].includes(path));}
}
assert(offline.required.includes('app/fallbacks/road-fallback.svg'));
assert(offline.required.includes('app/fallbacks/japan-fallback.svg'));
assert(offline.optional.includes('app/splash/splash_bg_road_coast_v121.webp'));
console.log('PASS: image manifest metadata/hashes, deterministic app/country/city selection, disabled/season rules, safe paths and offline coverage');
