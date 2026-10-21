/* History Journey v1.2 — versioned PWA shell and atomic per-destination caches */
const SHELL='history-journey-v12-shell-20261022';
const FILES=['./','./index.html','./app/v12.css','./app/v12.js','./audio-player.js','./assets/road_green_drive.jpg','./assets/japan_kyoto_sunset.webp','./assets/road-fallback.svg','./assets/japan-fallback.svg','./data/catalog.json','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
const ROOT=new URL('./',self.location.href);
const MAIN=new URL('./index.html',ROOT).href;
const INDEX=new URL('./data/catalog.json',ROOT).href;
const TRIP_PREFIX='travel-v12-';
self.addEventListener('install',event=>event.waitUntil(caches.open(SHELL).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('history-journey-v12-shell-')&&k!==SHELL).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
function rangeResponse(req,response){
 const range=req.headers.get('range');if(!range)return Promise.resolve(response);
 const match=/^bytes=(\d*)-(\d*)$/.exec(range);
 if(!match)return Promise.resolve(new Response(null,{status:416}));
 return response.blob().then(blob=>{
  let start=match[1]?Number(match[1]):null;let end=match[2]?Number(match[2]):null;
  if(start===null){if(end===null)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+blob.size}});start=Math.max(0,blob.size-end);end=blob.size-1}
  else if(end===null)end=blob.size-1;
  if(start<0||start>=blob.size||end<start)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+blob.size}});
  end=Math.min(blob.size-1,end);
  const b=blob.slice(start,end+1,'audio/mpeg');
  return new Response(b,{status:206,headers:{'Content-Type':'audio/mpeg','Accept-Ranges':'bytes','Content-Range':'bytes '+start+'-'+end+'/'+blob.size,'Content-Length':String(b.size)}});
 });
}
async function savedMatch(req){
 const names=await caches.keys();
 for(const n of names){
  if(!n.startsWith(TRIP_PREFIX)||n.startsWith(TRIP_PREFIX+'pending-'))continue;
  const c=await caches.open(n);
  // Only fully verified complete packages can serve media.
  const all=await c.keys();
  if(!all.some(item=>item.url.endsWith('/__complete_v12')))continue;
  const r=await c.match(req.url);
  if(r)return r;
 }
 return null;
}
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const target=new URL(req.url);
 if(target.origin!==ROOT.origin)return;
 event.respondWith((async()=>{
  if(req.mode==='navigate'){
   const c=await caches.open(SHELL),saved=await c.match(MAIN);
   if(saved)return saved;
   try{return await fetch(req)}catch(_){return Response.error()}
  }
  if(req.url===INDEX){
   const c=await caches.open(SHELL);
   try{const fresh=await fetch(req);if(fresh.ok){await c.put(INDEX,fresh.clone());return fresh}}catch(_){}
   return await c.match(INDEX)||Response.error();
  }
  if(req.cache==='reload'){try{return await fetch(req)}catch(_){return Response.error()}}
  if(target.pathname.endsWith('/pack.json')||target.pathname.endsWith('/poi.json')){
    try{const fresh=await fetch(req);if(fresh.ok)return fresh}catch(_){}
  }
  const saved=await savedMatch(req);
  if(saved){if(target.pathname.endsWith('.mp3'))return rangeResponse(req,saved);return saved}
  const c=await caches.open(SHELL);
  const app=await c.match(req.url);if(app)return app;
  try{return await fetch(req)}catch(_){return Response.error()}
 })());
});