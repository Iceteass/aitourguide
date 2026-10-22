import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app/v12.js','utf8');
const css=fs.readFileSync('app/v12.css','utf8');
assert(!app.includes('audio.currentTime/audio.duration'),'MP3 must not auto-scroll by elapsed fraction');
assert(!app.includes('addEventListener("timeupdate",()=>syncNarration'),'MP3 timeline scrolling must be disabled');
assert(html.includes('u.onstart=()=>{if(run!==narrationRun)return;highlightSpokenSentence(narrationIndex);'),'Highlight must begin on actual TTS utterance start');
assert(html.includes('u.onend=()=>{if(run!==narrationRun)return;narrationIndex++;speakNext(run)'),'Sentence advance must occur on utterance end');
assert(css.includes('.narration-segment.tts-current'),'Current TTS sentence CSS is missing');
const a=html.indexOf('let narrationParts=[],narrationIndex=0,narrationRun=0;');
const b=html.indexOf('function splitNarration(',a);
assert(a>=0&&b>a,'Missing TTS sentence rendering functions');
const code=html.slice(a,b);
const classes=()=>({current:new Set(),add(c){this.current.add(c)},remove(c){this.current.delete(c)},contains(c){return this.current.has(c)}});
const root={segments:[],scrollTop:0,offsetTop:0,clientHeight:220,
 replaceChildren(){this.segments=[]},append(fragment){this.segments=fragment.nodes}};
const document={
 createDocumentFragment(){return{nodes:[],append(node){this.nodes.push(node)}}},
 createTextNode(text){return{nodeType:3,textContent:text}},
 createElement(tag){const count=elements.length;const obj={tagName:tag,className:'',textContent:'',classList:classes(),offsetTop:count*200};elements.push(obj);return obj}
};
const elements=[];
const $=id=>id==='story'?root:null;
const harness=new Function('document','$','Date','window',code+';return{segmentVisibleNarration,highlightSpokenSentence,clearSpeechHighlight,parts:()=>narrationParts,nodes:()=>narrationNodes};')
(document,$,Date,{historyJourneyManualScrollUntil:0});
const original='첫 번째 문장입니다.\n두 번째 문장입니다. 그리고 세 번째 문장입니다.';
const sentences=harness.segmentVisibleNarration(original);
assert.equal(sentences.length,3,'Should separate sentences');
assert.equal(root.segments.map(x=>x.textContent).join(''),original,'Original paragraph and punctuation should remain exact');
harness.highlightSpokenSentence(0);
assert(elements[0].classList.contains('tts-current'),'First spoken sentence should be highlighted');
assert.equal(root.scrollTop,0,'Should not scroll while first sentence begins');
harness.highlightSpokenSentence(1);
assert(!elements[0].classList.contains('tts-current'),'Old sentence highlight should be removed');
assert(elements[1].classList.contains('tts-current'),'Second sentence should be highlighted');
assert(root.scrollTop>0,'Should reposition when advancing to next spoken sentence');
harness.clearSpeechHighlight();
assert(!elements[1].classList.contains('tts-current'),'Highlight should be cleared when playback ends');
console.log('PASS: MP3 manual scroll, TTS sentence highlights, preserved original text, and end-of-sentence advancement');
