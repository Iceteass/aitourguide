// Kyoto Guide v1.7.3 — MP3 default playback; TTS remains available as fallback.
// Seven supplied MP3 files are explicit assets and require one-time offline download.
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
  const originalStartSpeech = window.startSpeech;
  const originalStopSpeech = window.stopSpeech;
  const originalToggle = $('toggle').onclick;
  const controls = document.createElement('div');
  controls.className = 'voice-control';
  controls.innerHTML = '<label for="narration-mode">해설 음원</label><select id="narration-mode"><option value="mp3">제작 MP3 (오프라인 권장)</option><option value="tts">기기 TTS (대체)</option></select><small>MP3는 음성 7개를 먼저 저장해야 비행기 모드에서 사용할 수 있습니다.</small>';
  const voiceBox = document.querySelector('.voice-control');
  voiceBox.parentNode.insertBefore(controls, voiceBox);
  const mode = $('narration-mode');
  mode.value='mp3'; try {localStorage.setItem('kyoto-narration-mode','mp3')} catch(_) {}
  function updateModeUI() { voiceBox.style.display = mode.value === 'mp3' ? 'none' : ''; $('seek').disabled = mode.value !== 'mp3' || !Number.isFinite(player.duration) }
  function fmt(sec) { sec=Math.max(0,Math.floor(Number(sec)||0)); return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0') }
  function stopAudio() { active=false;player.pause();player.removeAttribute('src');player.load();duration=0;$('seek').max=100;$('seek').value=0;$('seek').disabled=true; }
  window.stopSpeech = function() { stopAudio(); return originalStopSpeech() };
  async function playCurrent() {
    try { await player.play(); if (active) { $('toggle').textContent='Ⅱ'; $('status').textContent='제작 MP3 해설 재생 중 · 오프라인 지원' } }
    catch(err) { if(active) { $('toggle').textContent='▶'; $('status').textContent='재생이 시작되지 않았습니다. ▶를 다시 누르거나 음원 저장 상태를 확인하세요.' } }
  }
  function startMP3() {
    window.stopSpeech(); $('done').classList.remove('open');
    active=true;duration=0;
    const track=TRACKS[selected];
    if(!track) { active=false; $('status').textContent='해당 장소 MP3가 없습니다.'; return }
    player.src=fullURL(track); player.playbackRate=Number($('speed').value)||1;
    $('status').textContent='제작 MP3를 불러오는 중입니다…';
    $('toggle').textContent='Ⅱ';
    playCurrent();
  }
  window.startSpeech = function() { if(mode.value==='mp3')return startMP3(); return originalStartSpeech() };
  mode.addEventListener('change', () => {
    try { localStorage.setItem('kyoto-narration-mode',mode.value) } catch (_) {}
    window.stopSpeech();updateModeUI();
    $('status').textContent=mode.value==='mp3'?'제작 MP3 선택됨 · ▶를 누르세요.':'기기 TTS 선택됨 · ▶를 누르세요.';
  });
  updateModeUI();
  player.addEventListener('loadedmetadata',()=>{if(!active)return;duration=Number.isFinite(player.duration)?player.duration:0;if(duration>0){$('seek').disabled=false;$('seek').max=duration;$('seek').step='0.1'}});
  player.addEventListener('timeupdate',()=>{if(!active)return;$('clock').textContent=fmt(player.currentTime);if(duration>0&&$('seek')!==document.activeElement)$('seek').value=player.currentTime});
  player.addEventListener('play',()=>{if(active)$('toggle').textContent='Ⅱ'});
  player.addEventListener('pause',()=>{if(active)$('toggle').textContent='▶'});
  player.addEventListener('ended',()=>{if(!active)return;active=false;$('toggle').textContent='▶';$('status').textContent='해설 재생 완료';window.showDone()});
  player.addEventListener('error',()=>{if(!active)return;active=false;$('toggle').textContent='▶';$('status').textContent='MP3 로드 실패 · GitHub에 음성파일 7개가 있는지, 오프라인 저장이 완료됐는지 확인하세요.'});
  $('seek').addEventListener('change',()=>{if(mode.value!=='mp3'||!active||!duration)return;player.currentTime=Math.max(0,Math.min(duration,Number($('seek').value)||0))});
  $('speed').addEventListener('change',()=>{if(mode.value==='mp3'&&active){player.playbackRate=Number($('speed').value)||1;$('status').textContent='MP3 재생 속도 '+$('speed').value+'× 적용됨'}});
  $('toggle').onclick=()=>{if(mode.value!=='mp3')return originalToggle();if(!active)return startMP3();if(player.paused)playCurrent();else player.pause()};
  $('restart').onclick=()=>window.startSpeech();
  $('done-replay').onclick=()=>window.startSpeech();
  const actions=document.querySelector('.offline-actions');
  const btn=document.createElement('button');btn.id='offline-audio';btn.type='button';btn.textContent='음성 7개 오프라인 저장';actions.appendChild(btn);
  const report=document.createElement('p');report.id='offline-audio-status';report.className='pwa-install-status';report.setAttribute('aria-live','polite');
  report.textContent='음성 저장 확인 중…';actions.parentNode.appendChild(report);
  async function cachedCount() {
    if(!('caches' in window))return 0;
    const cache=await caches.open(AUDIO_CACHE);let count=0;
    for(const t of TRACKS){const r=await cache.match(fullURL(t));if(r&&Number(r.headers.get('x-kyoto-audio-size'))===t.bytes)count++}
    return count;
  }
  async function reportCount(){
    const c=await cachedCount();
    report.textContent=c===7?'✓ 7/7개 MP3 오프라인 저장 완료 · 비행기 모드 재생 준비됨':'MP3 '+c+'/7개 저장됨 · Wi-Fi 연결 후 「음성 7개 오프라인 저장」을 누르세요';
  }
  async function prepare() {
    if(!('caches' in window)||!window.isSecureContext){report.textContent='오프라인 저장은 HTTPS 주소에서만 가능합니다.';return}
    if(!navigator.onLine){report.textContent='인터넷 연결 후 음성을 다운로드하세요.';return}
    btn.disabled=true;
    const cache=await caches.open(AUDIO_CACHE);let saved=0,failures=[];
    try {
      for(const t of TRACKS){
        const key=fullURL(t), existing=await cache.match(key);
        if(existing&&Number(existing.headers.get('x-kyoto-audio-size'))===t.bytes){saved++;report.textContent='음성 저장 확인 중 '+saved+'/7';continue}
        report.textContent='MP3 다운로드 중 '+(saved+1)+'/7 · '+t.name;
        try {
          const response=await fetch(key,{cache:'reload'});
          if(!response.ok||response.status!==200)throw new Error('HTTP '+response.status);
          const bytes=await response.arrayBuffer();
          if(bytes.byteLength!==t.bytes)throw new Error('파일 크기 불일치');
          const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');
          if(hash!==t.sha256)throw new Error('파일 무결성 불일치');
          await cache.put(key,new Response(bytes,{status:200,headers:{'Content-Type':'audio/mpeg','Content-Length':String(t.bytes),'x-kyoto-audio-size':String(t.bytes)}}));
          saved++;
        } catch(e) {failures.push(t.name+': '+(e.message||e))}
      }
      await reportCount();
      if(failures.length){report.textContent+=' · '+failures.length+'개 실패 (GitHub에 MP3 업로드 여부 확인)';console.warn('Kyoto offline audio missing:',failures)}
    } finally {btn.disabled=false}
  }
  btn.addEventListener('click',()=>prepare().catch(err=>{btn.disabled=false;report.textContent='MP3 저장 실패 · 인터넷 및 저장 공간을 확인하세요.';console.error(err)}));
  reportCount().catch(()=>{report.textContent='MP3 오프라인 저장 상태를 확인할 수 없습니다.'});
  window.addEventListener('online',()=>reportCount().catch(()=>{}));
  window.kyotoAudio={player,stop:stopAudio,get tracks(){return TRACKS},setTracks(next){if(!Array.isArray(next)||!next.length)return;stopAudio();TRACKS=next.map(t=>({name:t.name,bytes:t.bytes,sha256:t.sha256}));},start:startMP3};
})();
