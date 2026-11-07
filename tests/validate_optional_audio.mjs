// Temporary copies only: never register synthetic content in the public catalog.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const source='travel-packs/JP/kyoto/fushimi-inari';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'optional-audio-'));
const write=(file,obj)=>fs.writeFileSync(file,JSON.stringify(obj,null,2));
function fixture(name,keep,eighth=false){
 const dir=path.join(temp,name);fs.cpSync(source,dir,{recursive:true});
 const file=path.join(dir,'pack.json'),pack=JSON.parse(fs.readFileSync(file));
 if(eighth){
  // Synthetic eighth POI reuses fixture bytes, never new public travel content.
  const last=pack.spots.at(-1),next={poi_id:'fixture-eighth',sequence:8,dir:'spots/08-fixture',meta:'spots/08-fixture/poi.json'};
  fs.cpSync(path.join(dir,last.dir),path.join(dir,next.dir),{recursive:true});
  const meta=JSON.parse(fs.readFileSync(path.join(dir,next.meta)));meta.poi_id=next.poi_id;meta.sequence=8;write(path.join(dir,next.meta),meta);
  pack.files.push(...pack.files.filter(f=>f.path.startsWith(last.dir+'/')).map(f=>({...f,path:f.path.replace(last.dir+'/',next.dir+'/')})));
  pack.spots.push(next);pack.poi_ids.push(next.poi_id);
  const pointsFile=path.join(dir,pack.route.points),points=JSON.parse(fs.readFileSync(pointsFile));points.points.push({...points.points.at(-1),poi_id:next.poi_id});write(pointsFile,points);
  pack.files.find(f=>f.path===pack.route.points).bytes=fs.statSync(pointsFile).size;
 }
 for(const [i,spot] of pack.spots.entries())if(!keep.includes(i)){
  const metaPath=path.join(dir,spot.meta),meta=JSON.parse(fs.readFileSync(metaPath));
  const audio=spot.dir+'/'+meta.audio.path;
  fs.unlinkSync(path.join(dir,audio));
  pack.files=pack.files.filter(f=>f.path!==audio);
  meta.audio={...meta.audio,status:'not_generated',bytes:null,sha256:null};write(metaPath,meta);
  pack.files.find(f=>f.path===spot.meta).bytes=fs.statSync(metaPath).size;
 }
 write(file,pack);return {dir,pack,file};
}
function check(f,pass,label){const r=spawnSync(process.execPath,['authoring/validators/validate_pack.mjs',f.dir],{encoding:'utf8'});assert.equal(r.status,pass?0:1,label+'\n'+r.stdout+r.stderr);console.log('PASS:',label)}
try{
 check(fixture('all',[0,1,2,3,4,5,6]),true,'all MP3');
 check(fixture('eight-zero',[],true),true,'synthetic eight-spot zero MP3');
 const zero=fixture('zero',[]);check(zero,true,'zero MP3');
 check(fixture('partial',[1,4]),true,'partial MP3 / gaps');
 assert.equal(spawnSync(process.execPath,['authoring/validators/validate_all_packs.mjs',temp]).status,0,'CI discovers multiple valid packs');
 zero.pack.files.push({path:zero.pack.spots[0].dir+'/audio/ko-N1.mp3',bytes:1});write(zero.file,zero.pack);check(zero,false,'not_generated contradicts files');
 assert.equal(spawnSync(process.execPath,['authoring/validators/validate_all_packs.mjs',temp]).status,1,'CI fails when any discovered pack is invalid');
 const missing=fixture('missing',[0]);fs.unlinkSync(path.join(missing.dir,missing.pack.spots[0].dir,'audio/ko-N1.mp3'));check(missing,false,'declared MP3 missing');
 const corrupt=fixture('corrupt',[0]);fs.appendFileSync(path.join(corrupt.dir,corrupt.pack.spots[0].dir,'audio/ko-N1.mp3'),'damage');check(corrupt,false,'MP3 size/hash damaged');
 const hash=fixture('hash',[0]);const audio=hash.pack.files.find(f=>f.role==='audio');audio.sha256='0'.repeat(64);write(hash.file,hash.pack);check(hash,false,'MP3 SHA damaged at correct size');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
