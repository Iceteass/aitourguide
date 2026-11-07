"""Actual registered pack end-to-end test, with optional catalog fixture override."""
import argparse,json,hashlib,threading
from functools import partial
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];FOLDER='travel-packs/JP/kyoto/kinkakuji-standard/';KID='jp-kyoto-kinkakuji';FID='jp-kyoto-fushimi-inari'
pack=json.loads((ROOT/FOLDER/'pack.json').read_text());points=json.loads((ROOT/FOLDER/pack['route']['points']).read_text())['points'];catalog=(ROOT/'tests/fixtures/kinkakuji-catalog.json').read_bytes()
parser=argparse.ArgumentParser();parser.add_argument('--screenshots',action='store_true');parser.add_argument('--fixture-catalog',action='store_true');args=parser.parse_args()
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  path=urlsplit(self.path).path
  if path=='/aitourguide/data/catalog.json' and args.fixture_catalog:
   self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(catalog);return
  if path.endswith('/kinkakuji-standard/route/path.json') and self.server.bad_path:
   if self.server.bad_path=='missing':self.send_error(404);return
   self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(b'{"coordinate_system":"bad","segments":[]}');return
  super().do_GET()
s=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT.parent)));s.bad_path='';threading.Thread(target=s.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{s.server_port}/aitourguide/'
def arrive(page):
 page.goto(base);page.locator('[data-action=start]').click();page.locator('[data-action=country]').click();page.locator('[data-action=city]').click();page.wait_for_function("document.querySelectorAll('.v-destination-toggle').length===2 && !document.querySelector('.v-destination-toggle').disabled")
def card(page,id):
 c=page.locator(f'[data-destination-id="{id}"]');t=c.locator('.v-destination-toggle');expect(t).to_be_enabled()
 if t.get_attribute('aria-expanded')=='false':t.click()
 return c
def enter(page,id,n):
 card(page,id).locator('.v-guide-main').click();page.wait_for_function('document.body.classList.contains("v-map")');assert page.locator('#hotspots button').count()==n
 page.wait_for_function('document.querySelector("#map-screen .map-wrap img").naturalWidth>0')
def download(page,id):
 c=card(page,id);c.locator('.v-guide-save').click();page.locator('[data-action=confirm-download]').click();expect(c.locator('.v-guide-save')).to_have_attribute('data-save-state','saved',timeout=60000)
def geometry(page):
 data=page.evaluate("""()=>{const wrap=document.querySelector('#map-screen .map-wrap'),r=wrap.getBoundingClientRect();return {w:r.width,h:r.height,pins:[...wrap.querySelectorAll('.v-labelled-pin')].map(b=>{const n=b.querySelector('.v-pin-number'),label=b.querySelector('.v-pin-label'),a=n.getBoundingClientRect(),l=label.getBoundingClientRect(),s=getComputedStyle(n);return {x:(a.x+a.width/2-r.x)/r.width,y:(a.y+a.height/2-r.y)/r.height,color:s.color,background:s.backgroundColor,text:label.textContent,labelX:l.x-r.x,labelRight:l.right-r.x}})}}""")
 assert len(data['pins'])==8
 for actual,p in zip(data['pins'],points):
  anchor=p.get('pin_anchor',p);assert abs(actual['x']-anchor['x'])<.002 and abs(actual['y']-anchor['y'])<.002,(actual,p)
  assert actual['background']!='rgba(0, 0, 0, 0)' and actual['color']!='rgba(0, 0, 0, 0)'
  assert actual['labelX']>=-.5 and actual['labelRight']<=data['w']+.5
 return data

def spots(page):
 for i,spot in enumerate(pack['spots']):
  page.locator('#hotspots button').nth(i).locator('.v-pin-number').click();meta=json.loads((ROOT/FOLDER/spot['meta']).read_text());assert page.locator('#title').inner_text()==meta['title'];text=(ROOT/FOLDER/spot['dir']/meta['narration']).read_text();assert page.locator('#story').text_content()==text
  page.wait_for_function('url=>document.querySelector("#hero-img").src===url && document.querySelector("#hero-img").naturalWidth>0',arg=base+FOLDER+spot['dir']+'/'+meta['image']['path'])
  page.wait_for_function("document.querySelector('#narration-mode').value==='tts'");assert page.evaluate('kyotoAudio.tracks.length===8 && kyotoAudio.tracks.every(t=>t===null)')
  n=page.evaluate('__ttsCalls.length');page.locator('#toggle').click();page.wait_for_function('n=>__ttsCalls.length>n',arg=n);assert page.evaluate('__ttsCalls.at(-1).lang')=='ko-KR';page.evaluate('window.stopSpeech()');page.locator('#v-all-spots').click()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage']);context=browser.new_context(viewport={'width':390,'height':844})
  context.add_init_script("""window.__ttsCalls=[];window.__ttsErrors=[];if('speechSynthesis' in window){const native=speechSynthesis.speak.bind(speechSynthesis);speechSynthesis.speak=u=>{__ttsCalls.push({text:u.text,lang:u.lang});u.addEventListener('error',e=>__ttsErrors.push(e.error));return native(u)}}""")
  page=context.new_page();errors=[];requests=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url));arrive(page);download(page,FID);download(page,KID);enter(page,KID,8)
  assert page.locator('.v-pin-connectors line').count()==8
  svg=page.locator('.v-reference-route');assert svg.locator('polyline').count()==5;assert svg.evaluate('e=>getComputedStyle(e).pointerEvents')=='none'
  pairs=svg.locator('polyline').evaluate_all('lines=>lines.map(l=>[l.dataset.from,l.dataset.to])');assert ['shariden-kinkaku','rikushunomatsu'] not in pairs and ['rikushunomatsu','gingasen-gankasui'] not in pairs
  for width,height in [(360,780),(390,844),(430,932),(390,640)]:
   page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(100);geometry(page)
   if args.screenshots:
    (ROOT/'docs/screenshots').mkdir(exist_ok=True);page.screenshot(path=str(ROOT/f'docs/screenshots/kinkakuji-map-{width}-{height}.png'))
  wrap=page.locator('#map-screen .map-wrap');wrap.evaluate("e=>e.style.transform='scale(1.3)'");geometry(page);wrap.evaluate("e=>e.style.transform=''")
  cdp=context.new_cdp_session(page);cdp.send('Emulation.setPageScaleFactor',{'pageScaleFactor':1.5});geometry(page);cdp.send('Emulation.setPageScaleFactor',{'pageScaleFactor':1})
  page.locator('.v-route-toggle').click();assert not svg.is_visible();page.locator('.v-route-toggle').click();assert svg.is_visible();spots(page)
  images=[str(f.relative_to(ROOT)) for f in (ROOT/FOLDER).rglob('*.jpg')];assert len(images)==10;assert all(page.evaluate('async paths=>Promise.all(paths.map(async path=>{const i=new Image();i.src=path;await i.decode();return i.naturalWidth>0}))',images))
  expected={str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest() for f in (ROOT/FOLDER).rglob('*') if f.is_file()}
  actual=page.evaluate("""async name=>{const c=await caches.open(name),r={};for(const key of await c.keys()){const b=await(await c.match(key)).arrayBuffer();r[new URL(key.url).pathname.replace('/aitourguide/','')]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b))).map(n=>n.toString(16).padStart(2,'0')).join('')}return r}""",arg='travel-v12-'+pack['pack_id']+'@'+pack['pack_version']);assert all(actual[k]==v for k,v in expected.items())
  page.locator('#v-map-back').click();enter(page,FID,7);assert page.locator('.v-labelled-pin').count()==0 and page.locator('.v-reference-route').count()==0 and page.locator('.v-route-toggle').count()==0
  page.locator('#hotspots button').first.click();page.wait_for_function("document.querySelector('#narration-mode').value==='mp3'");page.locator('#toggle').click();page.wait_for_function('!kyotoAudio.player.paused && kyotoAudio.player.currentTime>0');page.locator('#toggle').click();page.evaluate('async()=>{await photoPut(0,new Blob(["keep"]));localStorage.setItem("kyoto-speed","1.25")}');page.locator('#v-all-spots').click();page.locator('#v-map-back').click()
  page.evaluate('async()=>{await navigator.serviceWorker.ready}');page.reload();page.wait_for_function('navigator.serviceWorker.controller!==null');context.set_offline(True);arrive(page);enter(page,KID,8);assert page.locator('.v-reference-route polyline').count()==5;spots(page);page.locator('#v-map-back').click()
  c=card(page,KID);c.locator('.v-guide-save').click();page.locator('[data-action=confirm-delete]').click();expect(c.locator('.v-guide-save')).to_have_attribute('data-save-state','missing');assert 'travel-v12-jp-kyoto-fushimi-inari@1.2.0' in page.evaluate('caches.keys()')
  enter(page,FID,7);page.locator('#hotspots button').first.click();assert page.evaluate('async()=>(await photoGet(0)).text()')=='keep';assert page.evaluate('localStorage.getItem("kyoto-speed")')=='1.25'
  assert not any('/kinkakuji-standard/' in r and '.mp3' in r for r in requests);assert not errors,errors
  print('PASS: visible8pins/clicks, five SVG segments/two omissions, mobile/ratio/zoom geometry, toggle, images10/narratives8, TTS API, offline/cacheSHA/delete and Fushimi isolation',flush=True)
  print('TTS audible NOT_RUN; native errors:',page.evaluate('__ttsErrors'),flush=True);context.close()
  for mode in ['missing','malformed']:
   s.bad_path=mode;context=browser.new_context(service_workers='block');page=context.new_page();arrive(page);enter(page,KID,8);assert page.locator('.v-labelled-pin').count()==8;assert page.locator('.v-reference-route').count()==0;assert page.locator('.v-route-notice').inner_text();page.locator('#hotspots button').first.click();expect(page.locator('#title')).to_have_text('경호지');context.close()
  print('PASS: missing/malformed route files retain visible pins, map and spot selection',flush=True);browser.close()
finally:s.shutdown()
