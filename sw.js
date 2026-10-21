// Kyoto Guide v1.7.2: guaranteed offline app shell, best-effort separately downloaded photos.
const CACHE_NAME = 'kyoto-guide-v172-offline-20261021';
const PHOTO_CACHE = 'kyoto-guide-photos-v172';
const OFFLINE_FILES = ['./','./index.html','./route-map.jpg','./romon-preview.jpg','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
const offlineUrl = new URL('./index.html', self.location.href).href;
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(names.filter(name => name.startsWith('kyoto-guide-') && name !== CACHE_NAME && name !== PHOTO_CACHE).map(name => caches.delete(name)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req=event.request, url=new URL(req.url);
  if(req.method!=='GET') return;
  // A user opt-in image download stores remote Wikimedia image responses even when opaque/no-CORS.
  if(req.destination==='image' && (url.hostname==='commons.wikimedia.org' || url.hostname==='upload.wikimedia.org')){
    event.respondWith((async()=>{
      const cache=await caches.open(PHOTO_CACHE);
      const found=await cache.match(req);
      if(found) return found;
      try {
        const response=await fetch(req);
        if(response.ok || response.type==='opaque') await cache.put(req,response.clone()).catch(()=>{});
        return response;
      } catch(e){return Response.error();}
    })());
    return;
  }
  if(url.origin!==self.location.origin) return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    // Cache-first: offline startup never waits for a network timeout.
    if(req.mode==='navigate'){
      const fallback=await cache.match(offlineUrl);
      if(fallback) return fallback;
      try {return await fetch(req)}catch(e){return Response.error()}
    }
    const saved=await cache.match(req);
    if(saved) return saved;
    try {
      const response=await fetch(req);
      if(response.ok) await cache.put(req,response.clone()).catch(()=>{});
      return response;
    } catch(e){return Response.error()}
  })());
});
