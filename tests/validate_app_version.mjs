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
async function runWorker(version,failInstall=false){
 const old='history-journey-v122-shell-20261022';
 const trip='travel-v12-jp-kyoto-fushimi-inari@1.2.0';
 const names=new Set([old,trip,'kyoto-guide-audio-v173','unrelated-cache']);
 const handlers=new Map();let installed=[];
 const self={location:{href:'https://example.test/aitourguide/sw.js'},
  addEventListener:(type,fn)=>handlers.set(type,fn),skipWaiting(){},clients:{claim(){}}};
 const caches={keys:async()=>[...names],delete:async name=>names.delete(name),open:async name=>{
  names.add(name);return {async addAll(paths){
   if(failInstall)throw Error('asset unavailable');
   installed=[];
   for(const request of paths){
    assert.equal(request.cache,'reload','New shells must bypass stale HTTP assets');
    const path='.'+new URL(request.url).pathname.replace('/aitourguide','');
    assert(fs.existsSync(path),'Missing shell asset '+path);installed.push(path);
   }
  },async put(){}};
 }};
 const context=vm.createContext({self,caches,URL,Request,Response,fetch:async()=>new Response('optional'),
  importScripts:(...paths)=>{for(const p of paths){vm.runInContext(fs.readFileSync(p,'utf8'),context);self.APP_VERSION=version;}}});
 vm.runInContext(worker,context);
 const dispatch=type=>{let task;handlers.get(type)({waitUntil(p){task=p}});return task;};
 if(failInstall){
  await assert.rejects(dispatch('install'),/asset unavailable/);
  assert(names.has(old),'Failed install must preserve the old shell');
 }else{
  await dispatch('install');await dispatch('activate');
  assert(!names.has(old),'A successful upgrade must retire the old shell');
  assert(names.has('history-journey-v12-shell-'+version),'Shell must follow the shared app version');
  assert(installed.includes('./app/version.js'),'Offline shell must contain version source');
 }
 for(const name of [trip,'kyoto-guide-audio-v173','unrelated-cache'])assert(names.has(name),'Upgrade deleted user cache '+name);
}
await runWorker('9.8.7');
await runWorker('9.8.8');
await runWorker('9.8.8',true);
console.log('PASS: shared version drives shell updates, offline version asset, cache preservation, failed-install safety');
