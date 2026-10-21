/* History Journey UX/FD v1.1. Intentionally excludes later v1.2 designs. */
(() => {
  'use strict';
  const DEST_ID='jp-kyoto-fushimi-inari';
  const CACHE='kyoto-trip-'+DEST_ID+'-v11';
  const MARK='__offline-complete-v11';
  const TRACKS=[
    ['audio_01_odotorii.mp3',452396,'a0b319794b900345e733695aa2a37ae6837075c9f478973a2204153528b2f172'],
    ['audio_02_romon.mp3',3776684,'8aaeb690cf952008f4ffe34cb28bdb37b4bbfe0a679e2c28337df927decdafcf'],
    ['audio_03_honden.mp3',4001324,'6463af626c0eb12cf867ea44cdb82f7d2629d5a93a33f69c23285491ccf2b7d7'],
    ['audio_04_senbon_torii.mp3',4855724,'a4cac280de6bfd87823eb541614b9218e1dafc11e8f79effac118ce41e331bea'],
    ['audio_05_okusha.mp3',4479020,'60b582814c51c391c68d325243299d534e6725fb7f3bdeae90f16ac827269c8f'],
    ['audio_06_omokaruishi.mp3',577580,'0f42f65d4d83db690c1a81078c79f3397ac34f9deb3bd399be222bbac308a3f7'],
    ['audio_07_return_path.mp3',319916,'825e937e29e55cb9263b41f4e2ca61bfe84cf1d52932c1db933b7e40d4f73ad']
  ];
  const $=id=>document.getElementById(id);
  const url=path=>new URL(path,document.baseURI).href;
  const root=document.createElement('div');
  root.id='journey-root';
  document.body.append(root);
  const app={stage:'splash',modal:'',offline:false,busy:false,progress:0,task:'',error:'',cancel:false};
  const names={country:'국가 선택',city:'도시 선택',destination:'여행지 선택'};
  function uiStage(stage,push=true){
    if(app.busy && stage!==app.stage)return;
    app.modal='';app.stage=stage;
    if(push)history.pushState({journeyStage:stage},'', '#'+stage);
    render();
  }
  function bg(stage){return stage==='splash'||stage==='country'?'road':'japan'}
  function header(stage){
    return '<header class="j-top"><button class="j-back" type="button" data-action="back" aria-label="뒤로 가기">‹</button><span class="j-crumb">'+(stage==='country'?'여행이 역사가 되는 순간':stage==='city'?'일본':'일본 › 교토')+'</span></header>';
  }
  function render(){
    const stage=app.stage;
    const isMap=stage==='map',isAudio=stage==='detail';
    root.hidden=isMap||isAudio;
    document.body.classList.toggle('journey-select',!isMap&&!isAudio);
    document.body.classList.toggle('journey-map',isMap);
    document.body.classList.toggle('journey-audio',isAudio);
    if(isMap||isAudio)return;
    const background='<div class="j-bg '+bg(stage)+'"></div><div class="j-shade"></div>';
    if(stage==='splash'){
      root.innerHTML='<main class="j-screen j-splash" role="button" tabindex="0" aria-label="계속하려면 화면을 터치하세요" data-action="start">'+background+'<p>계속하려면 화면을 터치하세요</p></main>';
      return;
    }
    let body='';
    if(stage==='country')body='<h1>국가를 선택해주세요</h1><p class="j-sub">어느 나라의 역사를 만나볼까요?</p><div class="j-cards"><button class="j-card" data-action="country"><span class="flag">🇯🇵</span><span><span class="main">일본</span><span class="hint">여행지 1곳</span></span><span class="arrow">›</span></button></div>';
    if(stage==='city')body='<h1>도시를 선택해주세요</h1><p class="j-sub">일본에서 가보고 싶은 도시를 골라주세요.</p><div class="j-cards"><button class="j-card" data-action="city"><img src="./assets/japan_kyoto_sunset.webp" onerror="this.src=\'./assets/japan-fallback.svg\'" alt=""><span><span class="main">교토</span><span class="hint">여행지 1곳</span></span><span class="arrow">›</span></button></div>';
    if(stage==='destination'){
      const state=app.offline?'✓ 저장 완료 · 오프라인 사용 가능':app.busy?'다운로드 중 '+app.progress+'%':app.error?'일부 저장됨 · 다시 다운로드해주세요':'온라인 이용 가능';
      const button=app.offline?'✓ 저장됨':'↓ 다운로드';
      body='<h1>여행지를 선택해주세요</h1><p class="j-sub">일본 › 교토</p><article class="j-destination"><button type="button" class="j-card" data-action="open"><img src="./romon-preview.jpg" alt="후시미 이나리 누문"><span><span class="main">후시미 이나리 신사</span><span class="hint">7개 장소 · 관람 지도 · 사진 · MP3</span></span><span class="arrow">›</span></button><div class="j-save-row"><span class="j-state" role="status">'+state+'</span><button type="button" class="j-action" data-action="manage" '+(app.busy?'disabled':'')+'>'+button+'</button></div></article>'+(app.error?'<p class="j-message">'+app.error+'</p>':'');
    }
    root.innerHTML='<div class="j-screen">'+background+header(stage)+'<section class="j-content">'+body+'</section>'+(app.modal?modalHTML():'')+'</div>';
  }
  function modalHTML(){
    if(app.modal==='delete')return '<div class="j-modal-layer"><div class="j-modal" role="dialog" aria-modal="true" aria-label="저장 데이터 삭제"><h2>저장한 여행지 데이터를 삭제할까요?</h2><p>다운로드한 사진·음성·지도 데이터를 삭제합니다. 여행지 목록은 남으며, 인터넷이 있으면 다시 이용할 수 있습니다.</p><div class="j-actions"><button data-action="cancel">아니요</button><button class="danger" data-action="delete">예, 삭제</button></div></div></div>';
    const busy=app.modal==='saving';
    return '<div class="j-modal-layer"><div class="j-modal" role="dialog" aria-modal="true" aria-label="여행지 다운로드"><h2>후시미 이나리 신사</h2><p>관람 지도 · 해설 원고 · 사진 7곳 · 제작 MP3 7개를 이 기기에 저장합니다.</p><p>예상 크기 약 20MB + 사진 원본 용량</p>'+(busy?'<div class="j-progress" role="progressbar" aria-valuenow="'+app.progress+'" aria-valuemin="0" aria-valuemax="100"><div style="width:'+app.progress+'%"></div></div><p aria-live="polite">'+app.progress+'% · '+app.task+'</p><div class="j-actions"><button data-action="abort">다운로드 취소</button></div>':'<div class="j-actions"><button data-action="cancel">아니요</button><button class="main" data-action="download">다운로드</button></div>')+'</div></div>';
  }
  function report(message){app.error=message;render()}
  function requirements(){return ['./route-map.jpg','./romon-preview.jpg',...TRACKS.map(t=>'./'+t[0]),...photos.filter((_,i)=>i!==1).map(p=>p.src)].map(url)}
  async function ready(){
    if(!('caches' in window))return false;
    const all=await caches.keys();if(!all.includes(CACHE))return false;
    const cache=await caches.open(CACHE);
    if(!(await cache.match(url(MARK))))return false;
    for(const key of requirements())if(!(await cache.match(key)))return false;
    for(const [name,size] of TRACKS){const r=await cache.match(url(name));if(!r||Number(r.headers.get('x-kyoto-audio-size'))!==size)return false}
    return true;
  }
  async function refresh(){try{app.offline=await ready()}catch(e){app.offline=false}render()}
  function verifyCancel(){if(app.cancel)throw new Error('다운로드를 취소했습니다.')}
  async function cacheFile(cache,path){
    const key=url(path);
    const old=await cache.match(key);if(old&&old.ok)return;
    const response=await fetch(key,{cache:'reload'});
    if(!response.ok||response.status!==200)throw new Error(path+' 파일을 받을 수 없습니다.');
    await cache.put(key,response);
  }
  async function cacheAudio(cache,t){
    const [name,size,expected]=t,key=url(name),old=await cache.match(key);
    if(old&&Number(old.headers.get('x-kyoto-audio-size'))===size)return;
    const oldCache=await caches.open('kyoto-guide-audio-v173');
    let response=await oldCache.match(key);
    if(!response||!response.ok)response=await fetch(key,{cache:'reload'});
    if(!response.ok||response.status!==200)throw new Error(name+' 다운로드 실패');
    const raw=await response.arrayBuffer();
    if(raw.byteLength!==size)throw new Error(name+' 크기 불일치');
    const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',raw))).map(b=>b.toString(16).padStart(2,'0')).join('');
    if(digest!==expected)throw new Error(name+' 음원 검증 실패');
    await cache.put(key,new Response(raw,{headers:{'Content-Type':'audio/mpeg','x-kyoto-audio-size':String(size)}}));
  }
  async function cachePhoto(cache,p){
    const key=p.src,exists=await cache.match(key);
    if(exists)return;
    await new Promise((resolve,reject)=>{const img=new Image();const timeout=setTimeout(()=>{img.onload=img.onerror=null;reject(new Error('사진 응답 시간 초과'))},17000);img.onload=()=>{clearTimeout(timeout);resolve()};img.onerror=()=>{clearTimeout(timeout);reject(new Error('사진을 불러올 수 없습니다.'))};img.src=key});
    let response=await caches.match(key);
    if(!response)response=await fetch(key,{mode:'no-cors',cache:'reload'});
    if(!response || !(response.ok||response.type==='opaque'))throw new Error('사진 저장 실패');
    await cache.put(key,response);
  }
  async function download(){
    if(app.busy)return;
    if(!navigator.onLine){app.modal='';return report('인터넷 연결 후 다운로드해주세요.')}
    if(!('caches' in window)||!window.isSecureContext){app.modal='';return report('HTTPS 주소에서만 다운로드할 수 있습니다.')}
    app.busy=true;app.cancel=false;app.progress=0;app.error='';app.modal='saving';render();
    const cache=await caches.open(CACHE);const tasks=[
      ['관람 지도','local','./route-map.jpg'],['누문 사진','local','./romon-preview.jpg'],
      ...TRACKS.map(t=>[t[0],'audio',t]),
      ...photos.map((p,i)=>i===1?null:[p.label+' 사진','photo',p]).filter(Boolean)
    ];
    try{
      await cache.delete(url(MARK));
      let index=0;
      for(const [label,type,arg] of tasks){
        verifyCancel();app.task=label;app.progress=Math.round(index/tasks.length*100);render();
        if(type==='local')await cacheFile(cache,arg);
        if(type==='audio')await cacheAudio(cache,arg);
        if(type==='photo')await cachePhoto(cache,arg);
        index++;app.progress=Math.round(index/tasks.length*100);render();
      }
      verifyCancel();
      await cache.put(url(MARK),new Response(JSON.stringify({id:DEST_ID,version:'1.1',files:tasks.length,downloadedAt:Date.now()}),{headers:{'Content-Type':'application/json'}}));
      app.offline=await ready();
      if(!app.offline)throw new Error('저장 파일 확인 실패');
      app.error='';app.modal='';app.task='';
    }catch(err){app.offline=false;app.modal='';app.error='일부 저장됨 · '+(err.message||'저장 실패')+' Wi-Fi 연결 후 다시 다운로드해주세요.'}
    finally{app.busy=false;render()}
  }
  async function removeSaved(){
    if(app.busy)return;app.busy=true;render();
    try{
      if(window.kyotoAudio?.stop)window.kyotoAudio.stop();
      await caches.delete(CACHE);
      // Previous versions stored this same destination in separate caches.
      await caches.delete('kyoto-guide-audio-v173');
      await caches.delete('kyoto-guide-photos-v172');
      if((await caches.keys()).includes(CACHE))throw new Error('삭제 후 파일이 남아 있습니다.');
      app.offline=false;app.error='';app.modal='';
    }catch(err){app.error='삭제 실패 · 다시 시도해주세요.';app.modal=''}
    finally{app.busy=false;render()}
  }
  function gotoMap(){
    root.hidden=true;document.body.classList.remove('journey-select');document.getElementById('detail-screen').classList.remove('active');document.getElementById('map-screen').classList.add('active');
    uiStage('map');
  }
  root.addEventListener('click',async e=>{
    const target=e.target.closest('[data-action]');if(!target)return;
    const act=target.dataset.action;
    if(act==='start')uiStage('country');
    if(act==='back')uiStage(({country:'splash',city:'country',destination:'city'})[app.stage]||'splash');
    if(act==='country')uiStage('city');
    if(act==='city')uiStage('destination');
    if(act==='cancel'){app.modal='';render()}
    if(act==='manage'){app.modal=app.offline?'delete':'download';render()}
    if(act==='download')download();
    if(act==='abort'){app.cancel=true;app.task='취소 중';render()}
    if(act==='delete')removeSaved();
    if(act==='open'){
      if(!app.offline){
        if(!navigator.onLine)return report('인터넷 연결이 필요합니다. 연결 후 이용하거나 미리 다운로드해주세요.');
        try {
          const check=await fetch(url('./route-map.jpg'),{cache:'no-store'});
          if(!check.ok)throw new Error('route-map not reachable');
        } catch(_) {return report('관람 지도에 연결할 수 없습니다. 인터넷 연결을 확인하거나 여행지를 다운로드해주세요.')}
      }
      gotoMap();
    }
  });
  root.addEventListener('keydown',e=>{if(app.stage==='splash'&&(e.key==='Enter'||e.key===' ')){e.preventDefault();uiStage('country')}});
  function audioLayout(){
    const detail=document.querySelector('#detail-screen .detail');
    const heroBottom=document.querySelector('#detail-screen .hero-bottom');
    const bar=document.createElement('aside');bar.className='j-player';bar.setAttribute('aria-label','음성 해설 재생 조작');detail.append(bar);
    const mode=$('narration-mode');
    if(mode){mode.parentElement.classList.add('j-player-mode');bar.append(mode.parentElement)}
    const speed=heroBottom.querySelector('.speed-control');if(speed)bar.append(speed);
    const voices=heroBottom.querySelector('.voice-control');if(voices)bar.append(voices);
    const line=heroBottom.querySelector('.playline');if(line)bar.append(line);
    const row=document.createElement('div');row.className='j-player-row';
    row.innerHTML='<button type="button" data-player="prev">◀ 이전 장소</button><button type="button" data-player="rewind" class="j-skip">↶ 10초</button><button type="button" data-player="forward" class="j-skip">10초 ↷</button><button type="button" data-player="next">다음 장소 ▶</button>';
    bar.append(row);
    row.addEventListener('click',e=>{
      const control=e.target.closest('[data-player]');if(!control)return;const action=control.dataset.player;
      if(action==='prev'){selected===0?goMap():openPlace(selected-1);return}
      if(action==='next'){selected===6?goMap():openPlace(selected+1);return}
      const player=window.kyotoAudio?.player;
      if($('narration-mode')?.value==='mp3'&&player&&Number.isFinite(player.duration)){
        player.currentTime=Math.max(0,Math.min(player.duration,player.currentTime+(action==='forward'?10:-10)));
      }
    });
  }
  function attachMap(){
    const el=document.querySelector('#map-screen .map-screen');
    const hdr=document.createElement('div');hdr.className='j-map-head';
    hdr.innerHTML='<button id="journey-map-back" type="button">‹ 여행지 선택</button><span>후시미 이나리 관람 지도 · 7곳</span>';
    el.append(hdr);
    $('journey-map-back').onclick=()=>{window.stopSpeech?.();uiStage('destination')};
    // Hide old in-map download controls: destination card is the single download/delete authority.
  }
  const oldOpen=window.openPlace;
  const oldMap=window.goMap;
  if(typeof oldOpen==='function')window.openPlace=function(i){oldOpen(i);uiStage('detail')};
  if(typeof oldMap==='function')window.goMap=function(){oldMap();uiStage('map')};
  ['back-top','map-bottom','done-map'].forEach(id=>{const el=$(id);if(el)el.onclick=()=>window.goMap()});
  $('previous').onclick=()=>selected===0?window.goMap():window.openPlace(selected-1);
  $('next').onclick=()=>selected===6?window.goMap():window.openPlace(selected+1);
  attachMap();audioLayout();
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&app.modal){app.modal='';render()}});
  window.addEventListener('popstate',e=>{
    if(app.busy)return;const s=e.state?.journeyStage||'splash';
    if(['splash','country','city','destination'].includes(s)){window.stopSpeech?.();uiStage(s,false)}
    else if(s==='map'){window.stopSpeech?.();oldMap?.();uiStage('map',false)}
    else if(s==='detail'){uiStage('detail',false)}
  });
  history.replaceState({journeyStage:'splash'},'','#splash');
  refresh();
})();