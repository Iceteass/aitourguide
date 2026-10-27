// Additive destination/guide metadata. Stage A deliberately keeps whole-pack storage.
(() => {
'use strict';
const fail=message=>{throw Error('Invalid guide catalog: '+message)};
const id=value=>typeof value==='string'&&/^[a-z0-9][a-z0-9-]{0,127}$/.test(value);
const version=value=>typeof value==='string'&&/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value);
const safePath=value=>typeof value==='string'&&/^travel-packs\/[A-Za-z0-9._/-]+\.json$/.test(value)&&!value.split('/').some(s=>!s||s==='.'||s==='..');
const tags=(value,count)=>Array.isArray(value)&&value.length===count&&value.every(t=>typeof t==='string'&&t.trim().length>0);
function normalize(catalog){
 if(!catalog||!Array.isArray(catalog.published))fail('published');
 const packs=new Map(),paths=new Set(),claimed=new Set(),ids=new Set(),result=[];
 for(const entry of catalog.published){
  if(!entry||!id(entry.pack_id)||!version(entry.pack_version)||!safePath(entry.path)||packs.has(entry.pack_id)||paths.has(entry.path))fail('pack id/version/path');
  if(typeof entry.title!=='string'||!entry.title.trim()||!/^[A-Z]{2}$/.test(entry.country_code)||!id(entry.city_id))fail('pack display/location');
  packs.set(entry.pack_id,entry);paths.add(entry.path);
 }
 if(catalog.destinations!==undefined&&!Array.isArray(catalog.destinations))fail('destinations');
 for(const destination of catalog.destinations||[]){
  if(!destination||!id(destination.destination_id)||ids.has(destination.destination_id)||!tags(destination.destination_tags,3)||!Array.isArray(destination.guides)||!destination.guides.length)fail('destination id/tags/guides');
  ids.add(destination.destination_id);
  const guideIds=new Set(),publicGuides=[];let first=null;
  for(const guide of destination.guides){
   if(!guide||!id(guide.guide_id)||guideIds.has(guide.guide_id)||!['published','draft','review'].includes(guide.status))fail('guide id/status');
   guideIds.add(guide.guide_id);
   if(typeof guide.guide_title!=='string'||!guide.guide_title.trim()||!id(guide.guide_type)||!version(guide.guide_version)||!tags(guide.guide_tags,2))fail('guide metadata');
   const entry=packs.get(guide.pack_id);
   if(!entry||guide.pack_version!==entry.pack_version||guide.path!==entry.path||guide.storage_mode!=='legacy-pack')fail('guide pack link/storage');
   if(first&&(entry.country_code!==first.country_code||entry.city_id!==first.city_id))fail('destination location');
   first ||= entry;
   if(guide.status==='published')publicGuides.push({...guide,entry,guide_key:destination.destination_id+'/'+guide.guide_id});
  }
  // No independent asset manifest/marker exists yet. Never label aliases as independent guides.
  if(publicGuides.length>1)fail('independent guide storage is not implemented');
  for(const guide of destination.guides){if(claimed.has(guide.pack_id))fail('pack claimed by multiple destinations');}
  for(const guide of destination.guides)claimed.add(guide.pack_id);
  if(publicGuides.length)result.push({destination_id:destination.destination_id,destination_tags:destination.destination_tags,entry:publicGuides[0].entry,guides:publicGuides});
 }
 for(const entry of packs.values())if(!claimed.has(entry.pack_id)){
  if(ids.has(entry.pack_id))fail('destination id collision');
  ids.add(entry.pack_id);
  result.push({destination_id:entry.pack_id,destination_tags:[],entry,guides:[{guide_id:'default',guide_key:entry.pack_id+'/default',guide_title:'기본 가이드',guide_type:'unspecified',guide_version:null,guide_tags:[],status:'published',storage_mode:'legacy-pack',entry}]});
 }
 return result;
}
self.JourneyCatalog={normalize};
})();
