import fs from 'node:fs';
import assert from 'node:assert/strict';
const code=fs.readFileSync('audio-player.js','utf8');
const registry=new Map(),handlers=new Map();
const audio={src:'',style:{},currentTime:0,duration:28,paused:true,playCalls:0,
  load(){},pause(){this.paused=true},play(){this.playCalls++;this.paused=false;return Promise.resolve()},
  removeAttribute(name){if(name==='src')this.src=''},setAttribute(){},
  addEventListener(type,callback){handlers.set('audio:'+type,callback)}
};
function element(id){
  if(registry.has(id))return registry.get(id);
  const n={id,innerHTML:'',textContent:'',value:id==='speed'?'1':'mp3',disabled:false,style:{},
    parentNode:{insertBefore(){},appendChild(){}},classList:{add(){},remove(){}},
    appendChild(){},setAttribute(){},addEventListener(type,callback){handlers.set(id+':'+type,callback)},
    onclick(){}};
  registry.set(id,n);return n;
}
const document={baseURI:'https://iceteass.github.io/kyoto-history-guide/',body:{appendChild(){}},
  createElement(tag){return tag==='audio'?audio:element('created-'+registry.size)},
  querySelector(){return element('voice-existing')},getElementById:element,activeElement:null};
let ttsCalls=0;
const window={startSpeech(){ttsCalls++},stopSpeech(){},addEventListener(){},isSecureContext:true};
const localStorage={setItem(){},getItem(){return null}};
const caches={open:async()=>({match:async()=>undefined})};
const navigator={onLine:true};
new Function('document','window','localStorage','caches','navigator','selected','URL',code)
 (document,window,localStorage,caches,navigator,0,URL);
assert(window.kyotoAudio,'The player must register itself on window.kyotoAudio');
const name='travel-packs/JP/kyoto/fushimi-inari/spots/01-odotorii/audio/ko-N1.mp3';
window.kyotoAudio.setTracks([{name,bytes:452396,sha256:'a0'}]);
assert.equal(window.kyotoAudio.tracks.length,1);
window.kyotoAudio.start();
assert.equal(audio.playCalls,1,'Starting MP3 must call HTMLAudioElement.play()');
assert.equal(audio.src,new URL(name,document.baseURI).href);
handlers.get('audio:loadedmetadata')?.();
assert.equal(element('seek').disabled,false);
handlers.get('audio:ended')?.();
assert.equal(element('status').textContent,'해설 재생 완료','MP3 end must not show a dialog');
element('narration-mode').value='tts';
window.startSpeech();
assert.equal(ttsCalls,1,'TTS fallback must still work');
console.log('PASS: player initialises, loads modular MP3, plays, ends without dialog, and preserves TTS');
