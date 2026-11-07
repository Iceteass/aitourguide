// Kyoto Guide v1.7.3 — MP3 default playback; TTS remains available as fallback.
// Optional MP3 slots keep the same indices as POIs; absent slots use device TTS.
(() => {
  'use strict';
  const AUDIO_CACHE = 'kyoto-guide-audio-v173';
  let TRACKS = [];
  const $ = id => document.getElementById(id);
  const fullURL = track => new URL(track.name, document.baseURI).href;
  const player = document.createElement('audio');
  player.preload = 'metadata';
  player.setAttribute('playsinline', '');
  player.style.display = 'none';
  document.body.appendChild(player);
  let active = false, duration = 0;
  let cacheName = null, completeMarker = null, hasCachedMp3 = false, selectionVersion = 0, packVersion = 0;
  // The v1.2 travel pack cache is the authoritative offline source of every POI audio.
  async function isLocallyStored(i) {
    const track = TRACKS[i];
    if (!track || !cacheName || !completeMarker || !('caches' in window)) return false;
    const names = await caches.keys();
    if (!names.includes(cacheName)) return false;
    const cache = await caches.open(cacheName);
    if (!(await cache.match(completeMarker))) return false;
    const response = await cache.match(fullURL(track));
    return !!response && response.ok && Number(response.headers.get('x-byte-size')) === Number(track.bytes);
  }
  async function selectDefault(i) {
    const version = ++selectionVersion;
    // While local-storage verification is pending, default to TTS (never guess MP3 is saved).
    hasCachedMp3 = false;
    mode.value = 'tts'; updateModeUI();
    let exists = false;
    try { exists = await isLocallyStored(i); } catch (e) { exists = false }
    if (version !== selectionVersion || i !== selected) return;
    hasCachedMp3 = exists;
    mode.value = exists ? 'mp3' : 'tts';
    updateModeUI();
    $('status').textContent = exists
      ? '저장된 제작 MP3로 해설합니다. ▶를 누르세요.'
      : (TRACKS[i]?'제작 MP3 미저장':'제작 MP3 미생성')+' · 기기 TTS로 해설합니다. ▶를 누르세요.';
    reportCount().catch(()=>{});
  }
  function fallbackToTTS(reason, autoplay = true) {
    window.stopSpeech(); mode.value = 'tts'; hasCachedMp3 = false; updateModeUI();
    $('status').textContent = reason;
    if (autoplay) {
      originalStartSpeech();
      $('status').textContent = reason + ' · TTS로 전환했습니다.';
    }
  }
  const originalStartSpeech = window.startSpeech;
  const originalStopSpeech = window.stopSpeech;
  const originalToggle = $('toggle').onclick;
  const controls = document.createElement('div');
  controls.className = 'voice-control';
  controls.innerHTML = '<label for="narration-mode">해설 음원</label><select id="narration-mode"><option value="mp3">제작 MP3 (오프라인 권장)</option><option value="tts">기기 TTS (대체)</option></select><small><span id="mp3-hint"></span></small>';
  const voiceBox = document.querySelector('.voice-control');
  voiceBox.parentNode.insertBefore(controls, voiceBox);
  const mode = $('narration-mode');
  mode.value='tts'; try {localStorage.setItem('kyoto-narration-mode','tts')} catch(_) {}
  function updateModeUI() { mode.disabled = !TRACKS[selected]; controls.style.display = TRACKS.some(Boolean) ? '' : 'none'; voiceBox.style.display = mode.value === 'mp3' ? 'none' : ''; $('seek').disabled = mode.value !== 'mp3' || !Number.isFinite(player.duration); window.dispatchEvent?.(new Event('journey-narration-mode')) }
  function fmt(sec) { sec=Math.max(0,Math.floor(Number(sec)||0)); return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0') }
  function stopAudio() { active=false;player.pause();player.removeAttribute('src');player.load();duration=0;$('seek').max=100;$('seek').value=0;$('seek').disabled=true; }
  window.stopSpeech = function() { stopAudio(); return originalStopSpeech() };
  async function playCurrent() {
    try { await player.play(); if (active) { $('toggle').textContent='Ⅱ'; $('status').textContent='제작 MP3 해설 재생 중 · 오프라인 지원' } }
    catch(err) { if(active) fallbackToTTS('MP3 재생 실패', true) }
  }
  function startMP3() {
    window.stopSpeech();
    if(!hasCachedMp3){fallbackToTTS('제작 MP3가 저장되지 않았습니다.',true);return}
    active=true;duration=0;
    const track=TRACKS[selected];
    if(!track) { fallbackToTTS('이 장소의 제작 MP3가 없습니다.',true); return }
    player.src=fullURL(track); player.playbackRate=Number($('speed').value)||1;
    $('status').textContent='제작 MP3를 불러오는 중입니다…';
    $('toggle').textContent='Ⅱ';
    playCurrent();
  }
  window.startSpeech = function() { if(mode.value==='mp3')return startMP3(); return originalStartSpeech() };
  mode.addEventListener('change', () => {
    try { localStorage.setItem('kyoto-narration-mode',mode.value) } catch (_) {}
    if(mode.value==='mp3'&&!hasCachedMp3)mode.value='tts';
    window.stopSpeech();updateModeUI();
    $('status').textContent=mode.value==='mp3'?'저장된 제작 MP3 선택됨 · ▶를 누르세요.':'기기 TTS 선택됨 · ▶를 누르세요.';
  });
  updateModeUI();
  player.addEventListener('loadedmetadata',()=>{if(!active)return;duration=Number.isFinite(player.duration)?player.duration:0;if(duration>0){$('seek').disabled=false;$('seek').max=duration;$('seek').step='0.1'}});
  player.addEventListener('timeupdate',()=>{if(!active)return;$('clock').textContent=fmt(player.currentTime);if(duration>0&&$('seek')!==document.activeElement)$('seek').value=player.currentTime});
  player.addEventListener('play',()=>{if(active)$('toggle').textContent='Ⅱ'});
  player.addEventListener('pause',()=>{if(active)$('toggle').textContent='▶'});
  player.addEventListener('ended',()=>{if(!active)return;active=false;$('toggle').textContent='▶';$('status').textContent='해설 재생 완료'});
  player.addEventListener('error',()=>{if(!active)return;fallbackToTTS('MP3 파일을 열 수 없습니다.',true)});
  $('seek').addEventListener('change',()=>{if(mode.value!=='mp3'||!active||!duration)return;player.currentTime=Math.max(0,Math.min(duration,Number($('seek').value)||0))});
  $('speed').addEventListener('change',()=>{if(mode.value==='mp3'&&active){player.playbackRate=Number($('speed').value)||1;$('status').textContent='MP3 재생 속도 '+$('speed').value+'× 적용됨'}});
  $('toggle').onclick=()=>{if(mode.value!=='mp3')return originalToggle();if(!active)return startMP3();if(player.paused)playCurrent();else player.pause()};
  $('restart').onclick=()=>window.startSpeech();
  const actions=document.querySelector('.offline-actions');
  const btn=document.createElement('button');btn.id='offline-audio';btn.type='button';btn.textContent='음성 오프라인 저장';actions.appendChild(btn);
  const report=document.createElement('p');report.id='offline-audio-status';report.className='pwa-install-status';report.setAttribute('aria-live','polite');
  report.textContent='음성 저장 확인 중…';actions.parentNode.appendChild(report);
  async function cachedCount() {
    if(!('caches' in window))return 0;
    const name=cacheName||AUDIO_CACHE;
    if(!(await caches.keys()).includes(name))return 0;
    const cache=await caches.open(name);let count=0;
    if(cacheName&&(!completeMarker||!(await cache.match(completeMarker))))return 0;
    for(const t of TRACKS.filter(Boolean)){const r=await cache.match(fullURL(t));if(r&&Number(r.headers.get(cacheName?'x-byte-size':'x-kyoto-audio-size'))===t.bytes)count++}
    return count;
  }
  async function reportCount(){
    const version=packVersion,total=TRACKS.filter(Boolean).length,c=await cachedCount();
    if(version!==packVersion)return;
    report.textContent=total===0?'제작 MP3 없음 · 기기 TTS로 해설합니다.':c===total?'✓ '+c+'/'+total+'개 MP3 오프라인 저장 완료 · 비행기 모드 재생 준비됨':'MP3 '+c+'/'+total+'개 저장됨 · Wi-Fi 연결 후 음성을 저장하세요.';
  }
  async function prepare() {
    if(!('caches' in window)||!window.isSecureContext){report.textContent='오프라인 저장은 HTTPS 주소에서만 가능합니다.';return}
    if(!navigator.onLine){report.textContent='인터넷 연결 후 음성을 다운로드하세요.';return}
    btn.disabled=true;
    const version=packVersion,tracks=TRACKS.filter(Boolean),total=tracks.length;
    if(!total)return;
    const cache=await caches.open(AUDIO_CACHE);let saved=0,failures=[];
    try {
      for(const t of tracks){
        if(version!==packVersion)return;
        const key=fullURL(t), existing=await cache.match(key);
        if(existing&&Number(existing.headers.get('x-kyoto-audio-size'))===t.bytes){saved++;report.textContent='음성 저장 확인 중 '+saved+'/'+total;continue}
        report.textContent='MP3 다운로드 중 '+(saved+1)+'/'+total+' · '+t.name;
        try {
          const response=await fetch(key,{cache:'reload'});
          if(!response.ok||response.status!==200)throw new Error('HTTP '+response.status);
          const bytes=await response.arrayBuffer();
          if(bytes.byteLength!==t.bytes)throw new Error('파일 크기 불일치');
          const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');
          if(hash!==t.sha256)throw new Error('파일 무결성 불일치');
          if(version!==packVersion)return;
          await cache.put(key,new Response(bytes,{status:200,headers:{'Content-Type':'audio/mpeg','Content-Length':String(t.bytes),'x-kyoto-audio-size':String(t.bytes)}}));
          saved++;
        } catch(e) {failures.push(t.name+': '+(e.message||e))}
      }
      await reportCount();
      if(failures.length){report.textContent+=' · '+failures.length+'개 실패 (GitHub에 MP3 업로드 여부 확인)';console.warn('Kyoto offline audio missing:',failures)}
    } finally {btn.disabled=!TRACKS.some(Boolean)}
  }
  btn.addEventListener('click',()=>prepare().catch(err=>{btn.disabled=false;report.textContent='MP3 저장 실패 · 인터넷 및 저장 공간을 확인하세요.';console.error(err)}));
  reportCount().catch(()=>{report.textContent='MP3 오프라인 저장 상태를 확인할 수 없습니다.'});
  window.addEventListener('online',()=>reportCount().catch(()=>{}));
  window.kyotoAudio={player,stop:stopAudio,get tracks(){return TRACKS},get hasCachedMp3(){return hasCachedMp3},setTracks(next,config){if(!Array.isArray(next))return;stopAudio();selectionVersion++;packVersion++;hasCachedMp3=false;mode.value='tts';TRACKS=next.map(t=>t?{name:t.name,bytes:t.bytes,sha256:t.sha256}:null);cacheName=config?.cacheName||null;completeMarker=config?.completeMarker||null;const total=TRACKS.filter(Boolean).length;btn.disabled=!total;btn.style.display=report.style.display=total?'':'none';btn.textContent='음성 '+total+'개 오프라인 저장';$('mp3-hint').textContent='제작 MP3 '+total+'개 · 저장 후 오프라인에서 사용할 수 있습니다.';updateModeUI();reportCount().catch(()=>{});},selectDefault,start:startMP3};
})();
