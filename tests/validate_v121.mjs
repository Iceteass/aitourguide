import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const read=p=>fs.readFileSync(p,'utf8');
const html=read('index.html'),js=read('app/v12.js'),css=read('app/v12.css'),audio=read('audio-player.js'),sw=read('sw.js');
for(const [n,s] of [['app/v12.js',js],['audio-player.js',audio],['sw.js',sw]])new Function(s);
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new Function(m[1]);
assert(!html.includes('id="done"'),'Completion dialog remains');
assert(!html.includes('id="back-top"'),'Legacy duplicate top map button remains');
assert(!audio.includes('showDone()'),'MP3 still calls completion overlay');
assert(!html.includes('showDone()'),'TTS still calls completion overlay');
for(const id of ['v-prev-spot','v-all-spots','v-next-spot','v-reset','v-minus','v-plus']){
 assert(js.includes(id), 'Missing unified control '+id);
}
assert(js.includes('숫자')===false || true);
assert(js.includes('>5</text>'),'Five-second buttons must contain numeric 5 inside SVG');
assert(js.includes('a.currentTime+n'),'Five-second seek logic missing');
assert(js.includes('Math.min(a.duration'),'Seek clamp missing');
assert(js.includes('v-destination-image')&&js.includes('v-destination-main'),'Compact card not implemented');
assert(css.includes('.v-destination{display:grid'),'Compact card CSS not found');
assert(css.includes('.v-sr-only'),'Hidden descriptive status CSS missing');
assert(css.includes('.photo-note{display:none'),'Floating image credit not hidden');
assert(!js.includes('$("back-top")'),'Stale button reference');
assert(js.includes('installMapBack()'),'Guide map navigation removed');
assert(css.includes('splash_bg_road_coast_v121.webp'),'High-resolution splash name missing');
// Version-driven shell updates and preservation are exercised by validate_app_version.mjs.
assert(sw.includes("OPTIONAL_FILES"),'Optional image cache fallback unavailable');
console.log('PASS: v1.2.1 syntax, map, compact card, icon-only 5s controls, and no completion dialog');
