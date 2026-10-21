// Kyoto guide v1.7.3: cache-first shell and offline MP3 HTTP Range support.
const CACHE_NAME='kyoto-ux-v11-app-shell-20261021';
const AUDIO_CACHE='kyoto-guide-audio-v173';
const PHOTO_CACHE='kyoto-guide-photos-v172';
const TOUR_CACHE='kyoto-trip-jp-kyoto-fushimi-inari-v11';
const OFFLINE_FILES=['./','./index.html','./journey-v11.js','./journey-v11.css','./audio-player.js','./assets/road-fallback.svg','./assets/japan-fallback.svg','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
const offlineUrl=new URL('./index.html',self.location.href).href;
const mp3Names=/^audio_0[1-7]_[a-z_]+\.mp3$/;
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(OFFLINE_FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(name=>name.startsWith('kyoto-guide-')&&![CACHE_NAME,AUDIO_CACHE,PHOTO_CACHE,TOUR_CACHE].includes(name)).map(name=>caches.delete(name)))).then(()=>self.clients.claim()))});
async function rangedAudio(req,cached){
  const range=req.headers.get('range');if(!range)return cached;
  const blob=await cached.blob();
  const m=/^bytes=(\d*)-(\d*)$/.exec(range);
  if(!m)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+blob.size}});
  let start=m[1]?Number(m[1]):null,end=m[2]?Number(m[2]):null;
  if(start===null){const suffix=end;start=Math.max(0,blob.size-suffix);end=blob.size-1}
  else if(end===null)end=blob.size-1;
  if(start<0||start>=blob.size||end<start)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+blob.size}});
  end=Math.min(end,blob.size-1);
  const chunk=blob.slice(start,end+1,'audio/mpeg');
  return new Response(chunk,{status:206,headers:{'Content-Type':'audio/mpeg','Accept-Ranges':'bytes','Content-Length':String(chunk.size),'Content-Range':'bytes '+start+'-'+end+'/'+blob.size}});
}
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);
  if(req.method!=='GET')return;
  if(url.origin===self.location.origin&&mp3Names.test(url.pathname.split('/').pop())){
    event.respondWith((async()=>{
      const tour=await caches.open(TOUR_CACHE);
      const tourAudio=await tour.match(url.href);
      if(tourAudio)return rangedAudio(req,tourAudio);
      const cache=await caches.open(AUDIO_CACHE);
      const cached=await cache.match(url.href);
      if(cached)return rangedAudio(req,cached);
      try{return await fetch(req)}catch(_){return Response.error()}
    })());return;
  }
  if(req.destination==='image'&&(url.hostname==='commons.wikimedia.org'||url.hostname==='upload.wikimedia.org')){
    event.respondWith((async()=>{
      const tour=await caches.open(TOUR_CACHE),ready=await tour.match(req);
      if(ready)return ready;
      const cache=await caches.open(PHOTO_CACHE),hit=await cache.match(req);
      if(hit)return hit;
      try{const response=await fetch(req);if(response.ok||response.type==='opaque')await cache.put(req,response.clone()).catch(()=>{});return response}catch(_){return Response.error()}
    })());return;
  }
  if(url.origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    if(url.pathname.endsWith('/route-map.jpg')||url.pathname.endsWith('/romon-preview.jpg')){
      const tour=await caches.open(TOUR_CACHE);const hit=await tour.match(req);
      if(hit)return hit;
      try{return await fetch(req)}catch(_){return Response.error()}
    }
    if(req.mode==='navigate'){const fallback=await cache.match(offlineUrl);if(fallback)return fallback;try{return await fetch(req)}catch(_){return Response.error()}}
    const saved=await cache.match(req);if(saved)return saved;
    try{const response=await fetch(req);if(response.ok)await cache.put(req,response.clone()).catch(()=>{});return response}catch(_){return Response.error()}
  })());
});
