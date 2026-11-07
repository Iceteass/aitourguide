#!/usr/bin/env node
// Discover every on-disk pack (including unpublished packs), without catalog edits.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=process.argv[2]||'travel-packs';
let count=0,failed=false;
function visit(dir){
 for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
  const file=path.join(dir,e.name);
  if(e.isDirectory())visit(file);
  else if(e.isFile()&&e.name==='pack.json'){
   count++;const r=spawnSync(process.execPath,['authoring/validators/validate_pack.mjs',dir],{stdio:'inherit'});
   if(r.status!==0)failed=true;
  }
 }
}
try{visit(root)}catch(error){console.error(error.message);failed=true}
if(!count){console.error('FAIL: no travel packs found');failed=true}
console.log('Checked',count,'travel pack(s)');
process.exitCode=failed?1:0;
