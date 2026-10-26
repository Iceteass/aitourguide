// Shared by the page and service worker. Paths are relative to assets/manifest.json.
(() => {
'use strict';
const safePath=p=>typeof p==='string'&&/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(p)&&!p.split('/').some(s=>!s||s==='.'||s==='..');
const fail=message=>{throw Error('Invalid image manifest: '+message)};
function validate(manifest){
 if(!manifest||manifest.schema_version!=='1.0.0'||!Array.isArray(manifest.images))fail('schema_version/images');
 const ids=new Set();
 for(const image of manifest.images){
  if(!image||typeof image.id!=='string'||!/^[a-z0-9][a-z0-9-]*$/.test(image.id)||ids.has(image.id))fail('duplicate/invalid id');
  ids.add(image.id);
  if(!['app','country','city'].includes(image.target)||!['splash','background','fallback'].includes(image.role))fail(image.id+' target/role');
  if(typeof image.enabled!=='boolean'||typeof image.default!=='boolean'||typeof image.offline_required!=='boolean')fail(image.id+' flags');
  if(!['all','spring','summer','autumn','winter'].includes(image.season)||!Array.isArray(image.tags)||image.tags.some(t=>typeof t!=='string'))fail(image.id+' season/tags');
  let prefix='app/';
  if(image.target==='app'){
   if(image.country_code!==null||image.city_id!==null)fail(image.id+' app scope');
  }else{
   if(typeof image.country_code!=='string'||!/^[A-Z]{2}$/.test(image.country_code))fail(image.id+' country_code');
   prefix='countries/'+image.country_code+'/images/';
   if(image.target==='city'){
    if(typeof image.city_id!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(image.city_id))fail(image.id+' city_id');
    prefix='countries/'+image.country_code+'/cities/'+image.city_id+'/images/';
   }else if(image.city_id!==null)fail(image.id+' country scope');
  }
  if(!safePath(image.path)||!image.path.startsWith(prefix)||!Array.isArray(image.fallbacks)||image.fallbacks.some(p=>!safePath(p)))fail(image.id+' paths');
  if(!Number.isInteger(image.bytes)||image.bytes<=0||typeof image.sha256!=='string'||!/^[a-f0-9]{64}$/.test(image.sha256))fail(image.id+' integrity metadata');
  const source=image.source;
  if(!source||typeof source.description!=='string'||typeof source.license!=='string'||!['verified','unverified'].includes(source.status)||(source.url!==null&&(typeof source.url!=='string'||!/^https:\/\//.test(source.url))))fail(image.id+' source');
 }
 for(const role of ['splash','background'])if(!manifest.images.some(i=>i.target==='app'&&i.role===role&&i.enabled&&i.default&&i.season==='all'))fail('missing app '+role+' default');
 return manifest;
}
function select(manifest,{screen,country_code=null,city_id=null}){
 const splash=screen==='splash'||screen==='country';
 const scopes=splash?[['app',null,null]]:[['city',country_code,city_id],['country',country_code,null],['app',null,null]];
 for(const [target,country,city] of scopes){
  if((target!=='app'&&!country)||(target==='city'&&!city))continue;
  const matches=manifest.images.filter(i=>i.enabled&&i.season==='all'&&i.role===(splash?'splash':'background')&&i.target===target&&i.country_code===country&&i.city_id===city);
  matches.sort((a,b)=>Number(b.default)-Number(a.default)||(a.id<b.id?-1:a.id>b.id?1:0));
  if(matches.length)return matches[0];
 }
 return null;
}
function urls(image,manifestURL){return [image.path,...image.fallbacks].map(path=>new URL(path,manifestURL).href)}
function offlineAssets(manifest){
 const required=new Set(),all=new Set();
 for(const image of manifest.images.filter(i=>i.enabled)){
  if(image.offline_required)required.add(image.path);
  for(const path of [image.path,...image.fallbacks])all.add(path);
 }
 return {required:[...required].sort(),optional:[...all].filter(p=>!required.has(p)).sort()};
}
self.JourneyAssets={validate,select,urls,offlineAssets};
})();
