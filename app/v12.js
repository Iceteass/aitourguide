/* 여행이 역사가 되는 순간 - release v1.2; UX change specification CR-01..09 */
(() => {
"use strict";
const $=id=>document.getElementById(id);
const root=document.createElement("div");root.id="journey-root";document.body.append(root);
const state={screen:"splash",catalog:null,entry:null,pack:null,packBase:"",pois:[],points:[],country:null,city:null,offline:false,busy:false,percent:0,task:"",modal:"",message:"",abort:false};
const APP_PREFIX="travel-v12-";const COMPLETE="__complete_v12";
const svgCheck='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
const svgDownload='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 17v3h14v-3"/></svg>';
const svgTrash='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16m-10 4v7m4-7v7M6 7l1 14h10l1-14M9 7V4h6v3"/></svg>';
const baseUrl=path=>new URL(path,document.baseURI).href;
const safePath=p=>typeof p==="string"&&!p.startsWith("/")&&!p.includes("..")&&!p.includes("\\")&&!p.includes("://")&&!p.includes("?")&&!p.includes("#");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function readJSON(url){const r=await fetch(url);if(!r.ok)throw Error("데이터를 불러올 수 없습니다: "+url);return r.json()}
const published=()=>Array.isArray(state.catalog?.published)?state.catalog.published.filter(p=>p&&p.pack_id&&p.path&&safePath(p.path)):[];
const baseName=()=>APP_PREFIX+state.pack.pack_id+"@"+state.pack.pack_version;
const pendingName=()=>APP_PREFIX+"pending-"+state.pack.pack_id+"@"+state.pack.pack_version;
function setScreen(screen,push=true){if(state.busy)return;state.screen=screen;state.modal="";state.message="";if(push)history.pushState({travelScreen:screen},"","#"+screen);render()}
function back(){if(state.modal){state.modal="";render();return}const prev={country:"splash",city:"country",destination:"city",map:"destination",detail:"map"};const s=prev[state.screen];if(!s)return;window.stopSpeech?.();if(s==="map")goMap();else setScreen(s)}
function formatSize(n){return (n/1048576).toFixed(n>=10485760?1:2)+"MB"}
function offlineText(){return state.offline?"오프라인 저장 완료":state.busy?"다운로드 중 "+state.percent+"%":state.message?"저장 상태 확인 필요":"온라인 이용 가능"}
function imgForCountry(country){return country==="JP"?"country-jp":"country-generic"}
function card(action,label,hint,icon,asset,value){return '<button type="button" class="v-card" data-value="'+esc(value||"")+'" data-action="'+action+'"><span class="v-icon">'+(asset?'<img src="'+esc(asset)+'" alt="">':esc(icon||""))+'</span><span class="v-card-text"><strong>'+esc(label)+'</strong><small>'+esc(hint||"")+'</small></span><span class="v-chevron">›</span></button>'}
function modalHTML(){
 const {modal,percent,task,pack}=state;if(!modal)return "";
 if(modal==="delete")return '<div class="v-modal-layer"><section class="v-modal" role="dialog" aria-modal="true" aria-label="저장 자료 삭제"><h2>저장한 여행지를 삭제할까요?</h2><p>이 여행지의 다운로드한 지도·사진·음성 파일만 삭제됩니다. 온라인 여행지는 목록에 계속 남습니다.</p><div class="v-modal-actions"><button data-action="dismiss">아니요</button><button class="danger" data-action="confirm-delete">예, 삭제</button></div></section></div>';
 const bytes=pack?.files?.reduce((s,f)=>s+(f.bytes||0),0)||0;
 return '<div class="v-modal-layer"><section class="v-modal" role="dialog" aria-modal="true" aria-label="여행지 다운로드"><h2>'+esc(state.entry?.title||"여행지")+'</h2><p>관람 지도, 장소별 사진·원고, 제작 MP3를 저장해 비행기 모드에서 이용합니다.</p><p class="v-size">예상 저장 용량 '+formatSize(bytes)+'</p>'+(modal==="saving"?'<div class="v-progress"><div style="width:'+percent+'%"></div></div><p role="status">'+percent+'% · '+esc(task)+'</p><div class="v-modal-actions"><button data-action="cancel-download">취소</button></div>':'<div class="v-modal-actions"><button data-action="dismiss">아니요</button><button class="main" data-action="confirm-download">다운로드</button></div>')+'</section></div>'
}
function render(){
 const s=state.screen;
 document.body.classList.toggle("v-select",s==="splash"||s==="country"||s==="city"||s==="destination");
 document.body.classList.toggle("v-map",s==="map");document.body.classList.toggle("v-detail",s==="detail");
 root.hidden=(s==="map"||s==="detail");if(root.hidden)return;
 const bg=s==="splash"||s==="country"?"road":imgForCountry(state.country);
 const shade='<div class="v-bg '+bg+'"></div><div class="v-shade"></div>';
 if(s==="splash"){
 root.innerHTML='<main class="v-screen v-splash" tabindex="0" role="button" aria-label="계속하려면 화면을 터치하세요" data-action="start">'+shade+'<div class="v-brand"><h1>여행이<br>역사가 되는 순간</h1><p>아름다운 여행지의 이야기,<br>당신의 특별한 하루가 됩니다.</p></div><p class="v-touch">계속하려면 화면을 터치하세요</p></main>';return;
 }
 let items="",heading="",note="";
 if(s==="country"){
 heading="국가를 선택해주세요";note="떠나고 싶은 나라를 선택하세요.";
 const seen=new Set();for(const e of published()){if(seen.has(e.country_code))continue;seen.add(e.country_code);items+=card("country",e.country_name||e.country_code,"",e.country_code==="JP"?"🇯🇵":"🌏",null,e.country_code)}
 }else if(s==="city"){
 heading="도시를 선택해주세요";note="가보고 싶은 도시를 선택하세요.";
 const seen=new Set();for(const e of published().filter(x=>x.country_code===state.country)){if(seen.has(e.city_id))continue;seen.add(e.city_id);items+=card("city",e.city_name||e.city_id,"여행지 "+published().filter(x=>x.country_code===e.country_code&&x.city_id===e.city_id).length+"곳","🏯",null,e.city_id)}
 }else{
 heading="여행지를 선택해주세요";note="관람 지도와 해설을 이용할 여행지를 선택하세요.";
 for(const e of published().filter(x=>x.country_code===state.country&&x.city_id===state.city)){
 const disabled=state.busy?" disabled":"";
 const download=state.offline&&state.entry?.pack_id===e.pack_id;
 const status=state.entry?.pack_id===e.pack_id?offlineText():"온라인 이용 가능";
 items+='<article class="v-destination">'+
 '<button class="v-destination-image" type="button" data-action="open" data-value="'+esc(e.pack_id)+'" aria-label="'+esc(e.title)+' 관람 지도 열기"><img src="'+esc(baseUrl(e.cover||"romon-preview.jpg"))+'" alt=""></button>'+
 '<div class="v-destination-main"><button type="button" class="v-destination-title" data-action="open" data-value="'+esc(e.pack_id)+'"><strong>'+esc(e.title)+'</strong><small>'+(e.poi_count||0)+'개 장소 · 관람 지도 · MP3</small></button>'+
 '<div class="v-destination-actions"><span class="v-sr-only" role="status">'+esc(status)+'</span>'+
 '<button class="v-circle v-download" aria-label="'+(download?"다운로드 완료":"여행지 다운로드")+'" title="'+(download?"저장 완료":"다운로드")+'" data-action="manage" data-value="'+esc(e.pack_id)+'"'+disabled+(download?" disabled":"")+'>'+(download?svgCheck:state.busy?"◌":svgDownload)+'</button>'+
 '<button class="v-circle v-delete" aria-label="저장 자료 삭제" title="저장 자료 삭제" data-action="delete" data-value="'+esc(e.pack_id)+'"'+(state.offline||state.message?"":" disabled")+disabled+'>'+svgTrash+'</button>'+
 '</div></div></article>';
 }
 }
 if(!items)items='<div class="v-empty">현재 선택 가능한 여행지가 없습니다.</div>';
 root.innerHTML='<main class="v-screen">'+shade+'<header class="v-top"><button class="v-back" data-action="back" aria-label="뒤로 가기">‹</button><div class="v-crumb">'+esc(s==="country"?"여행이 역사가 되는 순간":s==="city"?published().find(e=>e.country_code===state.country)?.country_name||"국가 선택":(published().find(e=>e.city_id===state.city)?.city_name||"도시 선택"))+'</div></header><section class="v-list"><h2>'+heading+'</h2><p class="v-hint">'+note+'</p><div class="v-cards">'+items+'</div>'+(state.message?'<p class="v-warning">'+esc(state.message)+'</p>':"")+'</section>'+modalHTML()+'</main>';
}
async function loadCatalog(){
 try {const c=await readJSON(baseUrl("./data/catalog.json"));if(!c||!Array.isArray(c.published))throw Error("등록 목록 형식 오류");state.catalog=c}
 catch(e){state.message="여행지 목록을 불러오지 못했습니다. 인터넷 연결을 확인하세요.";state.catalog={published:[]}}
 render();
}
function packPath(relative){if(!safePath(relative))throw Error("허용되지 않는 여행지 파일 경로: "+relative);return state.packBase+relative}
async function loadPack(entry){
 if(state.pack&&state.entry?.pack_id===entry.pack_id&&state.pois?.length)return;
 const metadata=await readJSON(baseUrl(entry.path));if(metadata.pack_id!==entry.pack_id||!metadata.route||!Array.isArray(metadata.spots)||!Array.isArray(metadata.files))throw Error("여행지 자료 형식이 올바르지 않습니다.");
 state.pack=metadata;state.entry=entry;state.packBase=entry.path.slice(0,entry.path.lastIndexOf("/")+1);
 const points=await readJSON(baseUrl(packPath(metadata.route.points)));
 const spotArray=await Promise.all(metadata.spots.map(async spot=>{
 if(!safePath(spot.meta))throw Error("장소 메타데이터 경로 오류");
 const poi=await readJSON(baseUrl(packPath(spot.meta)));
 if(poi.poi_id!==spot.poi_id)throw Error("장소 ID가 다릅니다.");
 const base=spot.dir+"/";
 const scriptPath=packPath(base+poi.narration);
 const response=await fetch(baseUrl(scriptPath));if(!response.ok)throw Error("해설 원고 불러오기 실패");
 return {...poi,script:await response.text(),base:state.packBase+base};
 }));
 const pointMap=new Map(points.points.map(p=>[p.poi_id,p]));
 if(spotArray.some(p=>!pointMap.has(p.poi_id)))throw Error("관람 지도 좌표가 누락되었습니다.");
 state.pois=spotArray;state.points=spotArray.map(p=>pointMap.get(p.poi_id));
 state.offline=await checkOffline();state.message="";
 syncLegacy();
}
function syncLegacy(){
 window.historyJourneyPackTitle=state.pack.title;
 const p=state.pois;
 data.splice(0,data.length,...p.map(x=>[x.title,x.title_ja||"",x.summary||"",x.script]));
 photos.splice(0,photos.length,...p.map(x=>({src:x.image.type==="photograph"?baseUrl(x.base+x.image.path):(x.image.remote_url||baseUrl(x.base+x.image.path)),local:baseUrl(x.base+x.image.path),credit:x.image.credit_url||"",label:x.title,remote:x.image.remote_url||"",kind:x.image.type})));
 coords.splice(0,coords.length,...state.points.map(pt=>[100*pt.x,100*pt.y]));
 $("hotspots").replaceChildren();$("mini").replaceChildren();makePins();
 const map=$("map-screen").querySelector(".map-wrap img");map.alt=state.pack.title+" 관람 가이드 지도";map.src=baseUrl(packPath(state.pack.route.image));$("v-map-top-label").textContent="관람 가이드 지도 · "+p.length+"개 장소";
 map.onload=()=>{if(map.naturalWidth&&map.naturalHeight)document.documentElement.style.setProperty("--v-map-ratio",map.naturalWidth+"/"+map.naturalHeight)};
 const tracks=p.map(x=>({name:x.base+x.audio.path,bytes:x.audio.bytes,sha256:x.audio.sha256}));
 window.kyotoAudio?.setTracks?.(tracks,{cacheName:baseName(),completeMarker:marker()});
 window.kyotoAudio?.selectDefault?.(selected);
}
function marker(){return baseUrl(state.packBase+COMPLETE)}
async function checkOffline(){
 if(!("caches" in window)||!state.pack)return false;
 const c=await caches.open(baseName());if(!(await c.match(marker())))return false;
 for(const f of state.pack.files){const r=await c.match(baseUrl(packPath(f.path)));if(!r||!r.ok&&r.type!=="opaque")return false;if(f.bytes&&Number(r.headers.get("x-byte-size")||0)!==f.bytes)return false}
 return true;
}
async function cachedBlob(c,resource,expected){
 const response=await fetch(baseUrl(resource),{cache:"reload"});if(!response.ok||response.status!==200)throw Error("파일을 가져올 수 없습니다: "+resource);
 const buf=await response.arrayBuffer();if(expected?.bytes&&buf.byteLength!==expected.bytes)throw Error("파일 용량 확인 실패: "+resource);
 if(expected?.sha256){const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",buf))).map(b=>b.toString(16).padStart(2,"0")).join("");if(digest.toLowerCase()!==expected.sha256.toLowerCase())throw Error("파일 검증 실패: "+resource)}
 await c.put(baseUrl(resource),new Response(buf,{headers:{"Content-Type":resource.endsWith(".mp3")?"audio/mpeg":resource.endsWith(".jpg")?"image/jpeg":resource.endsWith(".json")?"application/json":"text/plain;charset=utf-8","x-byte-size":String(buf.byteLength)}}));
}
async function download(){
 if(state.busy)return;if(!navigator.onLine){state.message="인터넷 연결 후 다운로드해주세요.";state.modal="";render();return}
 if(!("caches" in window)||!window.isSecureContext){state.message="HTTPS 주소에서만 다운로드할 수 있습니다.";state.modal="";render();return}
 state.busy=true;state.abort=false;state.percent=0;state.modal="saving";render();
 const tempName=pendingName(),temp=await caches.open(tempName);
 try{
 const entries=[{path:state.entry.path},{path:packPath(state.pack.route.points)},...state.pack.files.map(f=>({...f,path:packPath(f.path)}))];
 for(let i=0;i<entries.length;i++){
 if(state.abort)throw Error("사용자가 다운로드를 취소했습니다.");
 const item=entries[i],key=baseUrl(item.path);
 state.task=item.path.split("/").pop();state.percent=Math.round(i*100/entries.length);render();
 const previous=await temp.match(key);
 if(!previous||!previous.ok||item.bytes&&Number(previous.headers.get("x-byte-size"))!==item.bytes)await cachedBlob(temp,item.path,item);
 }
 if(state.abort)throw Error("다운로드가 취소되었습니다.");
 const target=await caches.open(baseName());
 for(const item of entries){const key=baseUrl(item.path);const value=await temp.match(key);if(!value)throw Error("임시 저장 파일 누락");await target.put(key,value)}
 await target.put(marker(),new Response(JSON.stringify({pack_id:state.pack.pack_id,pack_version:state.pack.pack_version,completed_at:Date.now()}),{headers:{"Content-Type":"application/json"}}));
 state.offline=await checkOffline();if(!state.offline)throw Error("저장 완료 검증 실패");
 await caches.delete(tempName);state.modal="";state.message="";
 }catch(e){state.offline=await checkOffline().catch(()=>false);state.modal="";state.message=(e.message||"다운로드 오류")+" · 다시 시도해주세요."}
 finally{state.busy=false;state.percent=0;render()}
}
async function removeSaved(){
 if(state.busy||!state.pack)return;state.busy=true;render();
 try{
 window.stopSpeech?.();
 const names=await caches.keys();for(const name of names){
 const current=name.startsWith(APP_PREFIX+state.pack.pack_id+"@")||name.startsWith(APP_PREFIX+"pending-"+state.pack.pack_id+"@");
 const previous=state.pack.pack_id==="jp-kyoto-fushimi-inari"&&["kyoto-guide-audio-v173","kyoto-guide-photos-v172","kyoto-trip-jp-kyoto-fushimi-inari-v11"].includes(name);
 if(current||previous)await caches.delete(name);
 }
 state.offline=await checkOffline();if(state.offline)throw Error("삭제 확인 실패");
 state.modal="";state.message="";
 }catch(e){state.modal="";state.message="삭제하지 못했습니다. 다시 시도해주세요."}
 finally{state.busy=false;render()}
}
function goMapScreen(){
 $("detail-screen").classList.remove("active");$("map-screen").classList.add("active");
 state.screen="map";render();window.scrollTo(0,0);
}
const baseOpen=openPlace,baseMap=goMap;
openPlace=function(i){baseOpen(i);state.screen="detail";render();window.kyotoAudio?.selectDefault?.(i);};
goMap=function(){baseMap();state.screen="map";render();};
async function chooseDestination(id){
 const entry=published().find(p=>p.pack_id===id&&p.country_code===state.country&&p.city_id===state.city);
 if(!entry){state.message="등록된 여행지가 없습니다.";render();return}
 try{await loadPack(entry);if(!state.offline&&!navigator.onLine){state.message="인터넷 연결이 필요합니다. 미리 다운로드한 여행지만 오프라인으로 열 수 있습니다.";render();return}
 goMapScreen();
 }catch(e){state.message="여행지를 열 수 없습니다: "+e.message;render()}
}
async function onAction(action,value){
 if(action==="start")setScreen("country");
 else if(action==="back")back();
 else if(action==="country"){const e=published().find(p=>p.country_code===value);if(e){state.country=e.country_code;setScreen("city")}}
 else if(action==="city"){const e=published().find(x=>x.country_code===state.country&&x.city_id===value);if(e){state.city=e.city_id;setScreen("destination");try{await loadPack(e)}catch(err){state.message=err.message;render()}}}
 else if(action==="open")await chooseDestination(value);
 else if(action==="dismiss"){state.modal="";render()}
 else if(action==="manage"){const entry=published().find(e=>e.pack_id===value);if(!entry)return;try{await loadPack(entry)}catch(e){state.message=e.message;render();return}if(state.offline)return;state.modal="download";render()}
 else if(action==="delete"){const entry=published().find(e=>e.pack_id===value);if(!entry)return;try{await loadPack(entry)}catch(e){state.message=e.message;render();return}if(state.offline||state.message){state.modal="delete";render()}}
 else if(action==="confirm-download")await download();
 else if(action==="cancel-download"){state.abort=true;state.task="다운로드 중지 요청";render()}
 else if(action==="confirm-delete")await removeSaved();
}
root.addEventListener("click",e=>{const hit=e.target.closest("[data-action]");if(hit&&!hit.disabled)onAction(hit.dataset.action,hit.dataset.value).catch(err=>{state.message=err.message;state.modal="";render()})});
root.addEventListener("keydown",e=>{if(state.screen==="splash"&&(e.key==="Enter"||e.key===" ")){e.preventDefault();setScreen("country")}});
// Preserve previous per-spot personal photos but use stable destination/POI keys for new packs.
const legacyPhotoGet=photoGet,legacyPhotoDelete=photoDelete;
function personalKey(i){return (state.pack?.pack_id||"legacy")+":"+(state.pois[i]?.poi_id||String(i))}
async function personalPhoto(action,i,value){
 const db=await photoDB();const key=personalKey(i);
 return new Promise((resolve,reject)=>{const tx=db.transaction("photos",action==="get"?"readonly":"readwrite");const store=tx.objectStore("photos");let req;
 if(action==="get")req=store.get(key);else if(action==="put")req=store.put(value,key);else req=store.delete(key);
 req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
}
photoGet=async function(i){const own=await personalPhoto("get",i);if(own)return own;return state.pack?.pack_id==="jp-kyoto-fushimi-inari"?legacyPhotoGet(i):undefined};
photoPut=async function(i,blob){return personalPhoto("put",i,blob)};
photoDelete=async function(i){await personalPhoto("delete",i);if(state.pack?.pack_id==="jp-kyoto-fushimi-inari")await legacyPhotoDelete(i)};

function installMapBack(){
 const h=document.createElement("div");h.className="v-map-top";h.innerHTML='<button type="button" id="v-map-back">‹ 여행지 선택</button><span id="v-map-top-label">관람 가이드 지도</span>';
 $("map-screen").querySelector(".map-screen").append(h);
 $("v-map-back").onclick=()=>{window.stopSpeech?.();setScreen("destination")};
}
function installAudio(){
 const detail=$("detail-screen").querySelector(".detail");
 const bar=document.createElement("aside");
 bar.className="v-player";bar.setAttribute("aria-label","장소 이동 및 음성 해설 조작");
 const seek=$("seek"),clock=$("clock"),speed=$("speed"),toggle=$("toggle");
 const seekRow=document.createElement("div");seekRow.className="v-seekrow";
 seekRow.append(clock,seek);
 const total=document.createElement("span");total.id="v-duration";total.textContent="0:00";seekRow.append(total);
 const speedWrap=document.createElement("span");speedWrap.className="v-speed";speedWrap.append(speed);seekRow.append(speedWrap);
 const svg=(inside)=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+inside+'</svg>';
 const icons={
   prev:svg('<path d="M15.5 4.5 8 12l7.5 7.5"/>'),
   map:svg('<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2z"/><path d="M9 3v16M15 5v16"/>'),
   next:svg('<path d="m8.5 4.5 7.5 7.5-7.5 7.5"/>'),
   reset:svg('<path d="M4 4v16"/><path d="m19 5-12 7 12 7z"/>'),
   minus:svg('<path d="M6 7a8 8 0 1 1-1.3 9.5"/><path d="M6 2v5H1"/><text x="12" y="16" text-anchor="middle" font-size="9" stroke="none" fill="currentColor" font-weight="800">5</text>'),
   plus:svg('<path d="M18 7a8 8 0 1 0 1.3 9.5"/><path d="M18 2v5h5"/><text x="12" y="16" text-anchor="middle" font-size="9" stroke="none" fill="currentColor" font-weight="800">5</text>')
 };
 const button=(id,aria,icon)=>'<button type="button" id="'+id+'" aria-label="'+aria+'" title="'+aria+'">'+icons[icon]+'</button>';
 const controls=document.createElement("div");controls.className="v-controls";
 controls.innerHTML='<div class="v-place-controls" role="group" aria-label="장소 이동">'+
 button("v-prev-spot","이전 장소","prev")+button("v-all-spots","전체 관람 지도","map")+button("v-next-spot","다음 장소","next")+
 '</div><div class="v-audio-controls" role="group" aria-label="음성 재생">'+
 button("v-reset","처음부터","reset")+button("v-minus","5초 뒤로","minus")+button("v-plus","5초 앞으로","plus")+'</div>';
 const playback=controls.querySelector(".v-audio-controls");playback.append(toggle);
 toggle.setAttribute("aria-label","재생 또는 일시정지");toggle.setAttribute("title","재생 또는 일시정지");
 const settings=document.createElement("details");settings.className="v-settings";settings.innerHTML="<summary>음성 설정</summary>";
 const mode=$("narration-mode");if(mode)settings.append(mode.closest(".voice-control"));
 const voice=$("voice-select");if(voice){const row=voice.closest(".voice-control");if(row)settings.append(row)}
 bar.append(seekRow,controls,settings);detail.append(bar);
 $("v-prev-spot").onclick=()=>selected===0?goMap():openPlace(selected-1);
 $("v-next-spot").onclick=()=>selected>=data.length-1?goMap():openPlace(selected+1);
 $("v-all-spots").onclick=()=>goMap();
 $("v-reset").onclick=()=>{const a=window.kyotoAudio?.player;if(mode?.value==="mp3"&&a){a.currentTime=0;seek.value=0;clock.textContent="0:00"}};
 for(const [id,n] of [["v-minus",-5],["v-plus",5]])$(id).onclick=()=>{
   const a=window.kyotoAudio?.player;
   if(mode?.value==="mp3"&&a&&Number.isFinite(a.duration)&&a.duration>0)a.currentTime=Math.min(a.duration,Math.max(0,a.currentTime+n));
 };
 const a=window.kyotoAudio?.player;
 if(a){
   a.addEventListener("loadedmetadata",()=>{if(Number.isFinite(a.duration))total.textContent=toTime(a.duration)});
   // MP3 has no sentence timestamps: manual script scrolling only.
 }
 document.querySelector("#detail-screen .hero-bottom .playline")?.remove();
}
function toTime(s){s=Math.max(0,Math.floor(s||0));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")}
// Only user-controlled scrolling for MP3. TTS advances on actual utterance events.
$("story").addEventListener("touchstart",()=>{window.historyJourneyManualScrollUntil=Date.now()+10000},{passive:true});
$("story").addEventListener("wheel",()=>{window.historyJourneyManualScrollUntil=Date.now()+10000},{passive:true});
installMapBack();installAudio();
$("map-bottom").onclick=()=>goMap();
$("previous").onclick=()=>selected===0?goMap():openPlace(selected-1);
$("next").onclick=()=>selected>=data.length-1?goMap():openPlace(selected+1);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&state.modal){state.modal="";render()}});
window.addEventListener("popstate",()=>{if(state.busy)return;const h=location.hash.replace("#","");if(["splash","country","city","destination"].includes(h)){window.stopSpeech?.();state.screen=h;render()}else if(h==="map")goMap()});
history.replaceState({travelScreen:"splash"},"","#splash");
render();loadCatalog();
})();