// Catch stale shell versions, missing offline version assets, and destructive upgrades.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const versionPath='app/version.js';
assert(fs.existsSync(versionPath),'A shared app version source is required');
const versionCode=fs.readFileSync(versionPath,'utf8');
const scope={};
vm.runInNewContext(versionCode,{self:scope});
assert.match(scope.APP_VERSION,/^\d+\.\d+\.\d+$/);
const worker=fs.readFileSync('sw.js','utf8');
async function runWorker(version,failInstall=false,{badManifest=false,missingImages=false}={}){
 const old='history-journey-v122-shell-20261022';
 const trip='travel-v12-jp-kyoto-fushimi-inari@1.2.0';
 const names=new Set([old,trip,'kyoto-guide-audio-v173','unrelated-cache']);
 const handlers=new Map();let installed=[];const stored=new Set();
 const self={location:{href:'https://example.test/aitourguide/sw.js'},
  addEventListener:(type,fn)=>handlers.set(type,fn),skipWaiting(){},clients:{claim(){}}};
 const caches={keys:async()=>[...names],delete:async name=>names.delete(name),open:async name=>{
  names.add(name);return {async addAll(paths){
   if(failInstall)throw Error('asset unavailable');
   installed=[];
   for(const request of paths){
    assert.equal(request.cache,'reload','New shells must bypass stale HTTP assets');
    if(missingImages&&/\.(jpg|webp)$/.test(request.url))throw Error('Missing bitmap must not be required: '+request.url);
    const path='.'+new URL(request.url).pathname.replace('/aitourguide','');
    assert(fs.existsSync(path),'Missing shell asset '+path);installed.push(path);
   }
  },async put(url){stored.add(String(url))}};
 }};
 const context=vm.createContext({self,caches,URL,Request,Response,fetch:async url=>String(url).endsWith('/assets/manifest.json')?new Response(badManifest?'{}':fs.readFileSync('assets/manifest.json','utf8')):new Response('optional',{status:missingImages?404:200}),
  importScripts:(...paths)=>{for(const p of paths){vm.runInContext(fs.readFileSync(p,'utf8'),context);self.APP_VERSION=version;}}});
 vm.runInContext(worker,context);
 const dispatch=type=>{let task;handlers.get(type)({waitUntil(p){task=p}});return task;};
 if(failInstall||badManifest){
  await assert.rejects(dispatch('install'),failInstall?/asset unavailable/:/Invalid image manifest/);
  assert(names.has(old),'Failed install must preserve the old shell');
 }else{
  await dispatch('install');await dispatch('activate');
  assert(!names.has(old),'A successful upgrade must retire the old shell');
  assert(names.has('history-journey-v12-shell-'+version),'Shell must follow the shared app version');
  assert(installed.includes('./app/version.js'),'Offline shell must contain version source');
  assert(installed.includes('./app/assets.js'),'Offline shell must contain image selector');
  assert(stored.has('https://example.test/aitourguide/assets/manifest.json'),'Offline shell must contain the validated image manifest');
  assert(installed.includes('./assets/app/fallbacks/road-fallback.svg'),'Offline fallback must be required');
 }
 for(const name of [trip,'kyoto-guide-audio-v173','unrelated-cache'])assert(names.has(name),'Upgrade deleted user cache '+name);
}
await runWorker('9.8.7');
await runWorker('9.8.8');
await runWorker('9.8.8',true);
await runWorker('9.8.8',false,{badManifest:true});
await runWorker('9.8.8',false,{missingImages:true});
console.log('PASS: shared version drives shell updates, offline version asset, cache preservation, failed-install safety');
