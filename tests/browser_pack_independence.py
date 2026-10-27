"""Rootless app, metadata cover resolution, no-pack offline gating and legacy photo API.
Requires Python Playwright and Chromium. Does not register or write any new pack.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import json,threading,urllib.request,urllib.error
from playwright.sync_api import sync_playwright
from browser_helpers import open_guide,store_button,wait_saved
ROOT=Path(__file__).resolve().parents[1]
catalog=json.loads((ROOT/'data/catalog.json').read_text());entry=catalog['published'][0]
pack=json.loads((ROOT/entry['path']).read_text());folder=entry['path'].rsplit('/',1)[0]+'/'
removed=['route-map.jpg','romon-preview.jpg']+['audio_'+n+'.mp3' for n in ['01_odotorii','02_romon','03_honden','04_senbon_torii','05_okusha','06_omokaruishi','07_return_path']]+['journey-v11.js','journey-v11.css']
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT.parent)))
thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
base=f'http://127.0.0.1:{server.server_port}/aitourguide/'
def choose(page):
 page.locator('[data-action="start"]').click();page.locator('[data-action="country"]').click();page.locator('[data-action="city"]').click()
 page.wait_for_function("window.kyotoAudio.tracks[0]?.name.startsWith('travel-packs/')")
def detail(page):
 open_guide(page);page.wait_for_function("document.body.classList.contains('v-map')")
 page.locator('#hotspots button').first.click();page.wait_for_function("document.body.classList.contains('v-detail')")
def observe(context):
 requests=[]
 context.on('request',lambda req:requests.append(req.url))
 return requests
all_requests=[]
try:
 for name in removed:
  try:urllib.request.urlopen(base+name);raise AssertionError('Deleted URL still exists: '+name)
  except urllib.error.HTTPError as error:assert error.code==404
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  # Only a test response changes the metadata filename; runtime must not assume cover.jpg.
  context=browser.new_context(service_workers='block');all_requests.append(observe(context))
  no_cover=json.loads(json.dumps(catalog));del no_cover['published'][0]['cover']
  alternate=json.loads(json.dumps(pack));alternate['cover']='alternate-cover.jpg'
  context.route('https://commons.wikimedia.org/**',lambda route:route.abort())
  context.route('**/data/catalog.json',lambda route:route.fulfill(json=no_cover))
  context.route('**/pack.json',lambda route:route.fulfill(json=alternate))
  context.route('**/alternate-cover.jpg',lambda route:route.fulfill(content_type='image/jpeg',body=(ROOT/folder/pack['cover']).read_bytes()))
  page=context.new_page();page.goto(base);choose(page)
  page.wait_for_function("document.querySelector('.v-destination-image img').src.endsWith('/alternate-cover.jpg') && document.querySelector('.v-destination-image img').naturalWidth>0")
  detail(page)
  for index,spot in enumerate(pack['spots']):
   if index:page.locator('#v-next-spot').click()
   meta=json.loads((ROOT/folder/spot['meta']).read_text())
   assert page.locator('#title').inner_text()==meta['title']
   assert page.locator('#story').text_content()==(ROOT/folder/spot['dir']/meta['narration']).read_text()
   page.wait_for_function("expected=>document.querySelector('#hero-img').src===expected && document.querySelector('#hero-img').naturalWidth>0",arg=base+folder+spot['dir']+'/'+meta['image']['path'])
  page.evaluate('openPlace(0)')
  expected=(ROOT/folder/pack['cover']).stat().st_size
  page.evaluate("""async () => {
   const entry=(await (await fetch('data/catalog.json')).json()).published[0];
   const pack=await (await fetch(entry.path)).json();
   const blob=await (await fetch(new URL(pack.cover,new URL(entry.path,location.href)))).blob();
   const db=await photoDB();await new Promise((resolve,reject)=>{const tx=db.transaction('photos','readwrite');tx.objectStore('photos').put(blob,0);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
  }""")
  assert page.evaluate('async () => (await photoGet(0)).size')==expected,'Old numeric photo key no longer readable'
  page.evaluate("async () => {await photoPut(0,new Blob(['new personal photo']));}")
  assert page.evaluate('async () => (await photoGet(0)).text()')=='new personal photo'
  page.evaluate('async () => {await photoDelete(0);}')
  assert page.evaluate('async () => (await photoGet(0)) === undefined')
  assert page.evaluate("async () => {const db=await photoDB();return new Promise(resolve=>{const r=db.transaction('photos').objectStore('photos').get(0);r.onsuccess=()=>resolve(r.result===undefined)})}")
  context.close()
  print('PASS: missing catalog cover resolves pack metadata filename; old numeric photos read, new keys preferred, delete removes both',flush=True)

  context=browser.new_context(service_workers='block');all_requests.append(observe(context))
  context.route('**/cover.jpg',lambda route:route.fulfill(status=404,body='missing'))
  context.route('**/spots/**/images/main.jpg',lambda route:route.fulfill(status=404,body='missing'))
  context.route('https://commons.wikimedia.org/**',lambda route:route.abort())
  page=context.new_page();page.goto(base);choose(page)
  page.wait_for_function("document.querySelector('.v-destination-image img').src.endsWith('/assets/app/fallbacks/road-fallback.svg') && document.querySelector('.v-destination-image img').naturalWidth>0")
  detail(page)
  page.wait_for_function("document.querySelector('#hero-img').src.endsWith('/assets/app/fallbacks/road-fallback.svg') && document.querySelector('#hero-img').naturalWidth>0")
  context.close()
  context=browser.new_context(service_workers='block');all_requests.append(observe(context))
  context.route('**/data/catalog.json',lambda route:route.fulfill(json={'schema_version':'1.0.0','published':[]}))
  page=context.new_page();page.goto(base);page.locator('[data-action="start"]').click()
  assert page.locator('[data-action="country"]').count()==0
  assert page.locator('#hotspots button').count()==0
  assert page.locator('#map-screen .map-wrap img').get_attribute('src').endswith('assets/app/fallbacks/road-fallback.svg')
  context.close()
  print('PASS: missing card and spot images use common fallback; empty catalog has no destination map/content',flush=True)

  context=browser.new_context();all_requests.append(observe(context));page=context.new_page();page.goto(base)
  page.evaluate('async () => {await navigator.serviceWorker.ready;}');page.reload();page.wait_for_function('navigator.serviceWorker.controller!==null')
  context.set_offline(True);page.reload()
  page.locator('[data-action="start"]').click();page.locator('[data-action="country"]').click();page.locator('[data-action="city"]').click()
  open_guide(page)
  page.wait_for_function("document.querySelector('.v-warning')?.textContent.includes('여행지를 열 수 없습니다')")
  assert not page.evaluate("document.body.classList.contains('v-map')")
  context.close();browser.close()
  for requests in all_requests:
   for name in removed:assert base+name not in requests,'App requested deleted root URL '+name
  print('PASS: undownloaded pack blocked offline; deleted 11 URLs return 404; app requested none of them',flush=True)
finally:
 server.shutdown();server.server_close();thread.join()
