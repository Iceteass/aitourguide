// Exercise actual image-caption code without assuming every illustration is AI.
import fs from 'node:fs';import assert from 'node:assert/strict';
const html=fs.readFileSync('index.html','utf8'),code=html.match(/async function loadPhoto\(i\)\{[^\n]+/)[0];
async function render(kind,origin,i=0,personal=false,label="누문"){
 const elements=new Map(),$=id=>{if(!elements.has(id))elements.set(id,{textContent:'',innerHTML:'',value:''});return elements.get(id)};
 const photos=Array.from({length:2},()=>({kind,assetOrigin:origin,src:'local.jpg',local:'local.jpg',credit:'https://commons.wikimedia.org/example',label,license:'CC BY-SA 3.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/3.0/',sourceCredit:'Vitalie Ciubotaru',modifications:'리사이즈·재인코딩 가능'}));
 const load=new Function('photos','$','photoGet','URL','navigator','fallbackImage','let photoRequest=0,photoURL=null;'+code+';return loadPhoto;')
 (photos,$,async()=>personal?new Blob(['photo']):undefined,{createObjectURL:()=> 'blob:personal',revokeObjectURL(){}},{onLine:true},()=>{});
 await load(i);$('hero-img').onload?.();return {note:$('photo-note').textContent,credit:$('photo-credit').textContent,creditHTML:$('photo-credit').innerHTML};
}
for(const i of [0,1]){const r=await render('illustration','ai_generated',i);assert.match(r.note,/AI 재구성/);assert.match(r.credit,/권리 검수 중/);assert(!/누문|Wikimedia/.test(r.note+r.credit+r.creditHTML));}
const drawn=await render('illustration','hand_drawn');assert.match(drawn.note,/일러스트/);assert(!drawn.note.includes('AI'));
const personal=await render('illustration','ai_generated',0,true);assert.match(personal.note,/이 기기에 저장된 사진/);assert.match(personal.credit,/사용자/);
const romon=await render('photograph','',1);assert.match(romon.note,/누문 사진/);
const saimon=await render('photograph','wikimedia_commons',1,false,'서문');assert.match(saimon.note,/서문 사진/);assert(!/누문/.test(saimon.note));assert.match(saimon.creditHTML,/Vitalie Ciubotaru/);assert.match(saimon.creditHTML,/CC BY-SA 3.0/);assert.match(saimon.creditHTML,/재인코딩/);assert.match(saimon.creditHTML,/동일조건/);
console.log('PASS: metadata-based AI/illustration captions, personal image attribution and existing Romon photo preserved');
