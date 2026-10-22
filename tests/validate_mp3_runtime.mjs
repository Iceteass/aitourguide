import fs from 'node:fs';
import assert from 'node:assert/strict';
const code=fs.readFileSync('audio-player.js','utf8');
const elements=new Map(),events=new Map();
const audio={
 src:'',style:{},duration:28,currentTime:0,paused:true,playCalls:0,
 load(){},pause(){this.paused=true},play(){this.playCalls++;this.paused=false;return Promise.resolve()},
 removeAttribute(name){if(name==='src')this.src=''},setAttribute(){},
 addEventListener(type,fn){events.set('audio:'+type,fn)}
};
function el(id){
 if(elements.has(id))return elements.get(id);
 const n={id,textContent:'',innerHTML:'',value:id==='speed'?'1':'tts',disabled:false,style:{},
  parentNode:{insertBefore(){},appendChild(){}},classList:{add(){},remove(){}},
  appendChild(){},setAttribute(){},addEventListener(type,fn){events.set(id+':'+type,fn)},
  onclick(){}};
 elements.set(id,n);return n;
}
const document={
 baseURI:'https://iceteass.github.io/kyoto-history-guide/',
 activeElement:null,body:{appendChild(){}},
 createElement(tag){return tag==='audio'?audio:el('created-'+elements.size)},
 querySelector(){return el('voice-existing')},getElementById:el
};
const window={startSpeech(){window.ttsCalls++},stopSpeech(){},ttsCalls:0,addEventListener(){},isSecureContext:true};
const localStorage={setItem(){},getItem(){return null}};
let isAvailable=false;
const cacheName='travel-v12-jp-kyoto-fushimi-inari@1.2.0',marker=document.baseURI+'travel-packs/JP/kyoto/fushimi-inari/__complete_v12';
const cache={async match(key){
 if(!isAvailable)return undefined;
 if(key===marker)return {ok:true};
 if(String(key).endsWith('/ko-N1.mp3'))return {ok:true,headers:{get:n=>n==='x-byte-size'?'452396':null}};
 return undefined;
}};
const caches={keys:async()=>isAvailable?[cacheName]:[],open:async()=>cache};
const navigator={onLine:true};
new Function('document','window','localStorage','caches','navigator','selected','URL',code)
 (document,window,localStorage,caches,navigator,0,URL);
const manager=window.kyotoAudio;
assert(manager,'Player must register on window.kyotoAudio');
const name='travel-packs/JP/kyoto/fushimi-inari/spots/01-odotorii/audio/ko-N1.mp3';
manager.setTracks([{name,bytes:452396,sha256:'test'}],{cacheName,completeMarker:marker});
await manager.selectDefault(0);
assert.equal(el('narration-mode').value,'tts','Undownloaded MP3 must default to TTS');
manager.start();
assert.equal(window.ttsCalls,1,'Missing MP3 must automatically use TTS');
assert.equal(audio.playCalls,0,'Must not attempt undownloaded audio');
isAvailable=true;
await manager.selectDefault(0);
assert.equal(el('narration-mode').value,'mp3','Downloaded MP3 must become default');
manager.start();
assert.equal(audio.playCalls,1,'MP3 should play when verified in travel pack cache');
assert.equal(audio.src,new URL(name,document.baseURI).href);
events.get('audio:loadedmetadata')?.();
assert.equal(el('seek').disabled,false);
events.get('audio:ended')?.();
assert.equal(el('status').textContent,'해설 재생 완료','MP3 end must not show a dialog');
manager.start();
events.get('audio:error')?.();
assert.equal(el('narration-mode').value,'tts','Audio error must switch to TTS');
assert.equal(window.ttsCalls,2,'Audio playback error must actually invoke TTS');
assert.equal(audio.playCalls,2);
console.log('PASS: missing MP3 selects TTS, cached MP3 plays, errors fall back, no completion dialog');
