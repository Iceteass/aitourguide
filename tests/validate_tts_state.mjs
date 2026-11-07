// Exercise actual inline TTS state code with controlled speech callbacks (no device voice).
import fs from 'node:fs';import assert from 'node:assert/strict';
const html=fs.readFileSync(process.argv[2]||'index.html','utf8');
const stop=html.match(/function stopSpeech\(\)\{[^\n]+/)[0];
const code=html.slice(html.indexOf('let narrationParts='),html.indexOf("$('voice-select').onchange="));
for(const slug of ['fushimi-inari','kinkakuji-standard']){
 const folder='travel-packs/JP/kyoto/'+slug+'/',pack=JSON.parse(fs.readFileSync(folder+'pack.json'));
 const scripts=pack.spots.slice(0,2).map(s=>{const p=JSON.parse(fs.readFileSync(folder+s.meta));return fs.readFileSync(folder+s.dir+'/'+p.narration,'utf8')});
 const elements=new Map(),spoken=[];
 const $=id=>{if(!elements.has(id))elements.set(id,{textContent:'',value:0,scrollTop:0,clientHeight:200,offsetTop:0,replaceChildren(){},append(){}});return elements.get(id)};
 const document={createDocumentFragment:()=>({append(){}}),createTextNode:text=>({textContent:text}),createElement:()=>({classList:{add(){},remove(){}},offsetTop:0})};
 const speech={paused:false,speaking:false,cancel(){this.speaking=false;this.paused=false},resume(){this.paused=false},speak(u){spoken.push(u);this.speaking=true;u.onstart?.()}};
 const setup="let selected=0,token=0,activeSpeech=null,speaking=false,paused=false,utterance=null,timer=null,began=0;";
 const api=new Function('document','$','window','speechSynthesis','data','newUtterance','refreshVoices','fmt','setInterval','clearInterval',setup+stop+'\n'+code+';return {start:startSpeech,move:typeof moveSpeechSentence==="function"?moveSpeechSentence:null,select:i=>{stopSpeech();selected=i},state:()=>({parts:narrationParts,index:narrationIndex,utterance,speaking,paused})};')
 (document,$,{speechSynthesis:speech},speech,scripts.map(s=>['','','',s]),text=>({text}),()=>{},()=>'',()=>1,()=>{});
 const first=text=>text.match(/[^.!?。！？\n]+[.!?。！？]*/)[0].trim();
 api.start();assert.equal(spoken.at(-1).text,first(scripts[0]));spoken.at(-1).onend();const stale=spoken.at(-1);
 api.select(1);assert.equal(api.state().parts.length,0,'Switch must discard previous narration parts');assert.equal(api.state().index,0);assert.equal(api.state().utterance,null);
 api.start();assert.equal(spoken.at(-1).text,first(scripts[1]));const count=spoken.length,status=$('status').textContent;
 stale.onstart();stale.onend();stale.onerror({error:'synthesis-failed'});assert.equal(spoken.length,count);assert.equal($('status').textContent,status);
 const current=spoken.at(-1);current.onend();current.onend();assert.equal(spoken.length,count+1,'Stale duplicate onend must not skip a sentence');
 api.move(1);assert.equal(api.state().index,2);api.move(-1);assert.equal(api.state().index,1);api.start();assert.equal(api.state().index,0);
 const failed=spoken.at(-1);failed.onerror({error:'synthesis-failed'});const errorCount=spoken.length,errorStatus=$('status').textContent;failed.onstart();failed.onend();assert.equal(spoken.length,errorCount,'Callbacks after terminal error must be ignored');assert.equal($('status').textContent,errorStatus);api.start();
 while(api.state().index<api.state().parts.length)spoken.at(-1).onend();const finished=api.state().index;spoken.at(-1).onend();assert.equal(api.state().index,finished,'Duplicate final callback must not advance finished state');
 console.log('PASS:',slug,'TTS reset, current script first sentence, stale callback isolation and sentence navigation');
}
