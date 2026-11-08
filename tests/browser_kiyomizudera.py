"""Review-only integration of untouched Creator pack; no production catalog edits."""
import json,re,hashlib,threading
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
ROOT=Path(__file__).resolve().parents[1]
HERE=ROOT.parent/'kiyomizudera-release-evidence';HERE.mkdir(exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
def make_server():return ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT.parent)))
FOLDER='travel-packs/JP/kyoto/kiyomizudera-standard/';KID='jp-kyoto-kiyomizudera';FID='jp-kyoto-fushimi-inari';GID='jp-kyoto-kinkakuji'
pack=json.loads((ROOT/FOLDER/'pack.json').read_text());points=json.loads((ROOT/FOLDER/pack['route']['points']).read_text())['points'];route=json.loads((ROOT/FOLDER/pack['route']['path']).read_text())
cache_name='travel-v12-'+pack['pack_id']+'@'+pack['pack_version'];s=make_server();threading.Thread(target=s.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{s.server_port}/aitourguide/'
results={'base_commit':'df29e027e52727eaf53b5ccba5865d096a9f3759','app_version':'read from app/version.js','pack_version':pack['pack_version'],'publication_status':'APPROVED_BETA_REGISTRATION','tests':[],'screenshots':[]}
GEOMETRY=re.search(r"counts=page.evaluate\('''(.*?)'''\)",(ROOT/'tests/browser_map_collisions.py').read_text(),re.S).group(1)
def passed(text):print('PASS:',text,flush=True);results['tests'].append({'name':text,'result':'PASS'})
def arrive(page,n=None):
 if n is None:n=len(json.loads((ROOT/'data/catalog.json').read_text())['published'])
 page.goto(base);page.locator('[data-action=start]').click();page.get_by_role('button',name='일본',exact=False).click();page.get_by_role('button',name='교토',exact=False).click();page.wait_for_function('n=>document.querySelectorAll(".v-destination-toggle").length===n && !document.querySelector(".v-destination-toggle").disabled',arg=n)
def card(page,id):
 c=page.locator(f'[data-destination-id="{id}"]');t=c.locator('.v-destination-toggle');expect(t).to_be_enabled()
 if t.get_attribute('aria-expanded')=='false':t.click()
 return c
def open_map(page,id,n):
 card(page,id).locator('.v-guide-main').click();page.wait_for_function('document.body.classList.contains("v-map")');assert page.locator('#hotspots button').count()==n
 page.wait_for_function('document.querySelector("#map-screen .map-wrap img").naturalWidth>0')
def save(page,id):
 c=card(page,id);c.locator('.v-guide-save').click();page.locator('[data-action=confirm-download]').click();expect(c.locator('.v-guide-save')).to_have_attribute('data-save-state','saved',timeout=60000)
def verify_route(page):
 lines=page.locator('.v-reference-route polyline');assert lines.count()==3
 actual=lines.evaluate_all('lines=>lines.map(e=>[e.dataset.from,e.dataset.to])');wanted=[[p['from_poi_id'],p['to_poi_id']] for p in route['segments'] if p.get('visibility')=='show'];assert actual==wanted
 forbidden={tuple(sorted([p['from_poi_id'],p['to_poi_id']])) for p in route['omitted_connections']};assert len(forbidden)==4 and not any(tuple(sorted(pair)) in forbidden for pair in actual)
def all_spots(page,offline):
 spoken=[]
 for i,spot in enumerate(pack['spots']):
  page.locator('#hotspots button').nth(i).locator('.v-pin-number').click();meta=json.loads((ROOT/FOLDER/spot['meta']).read_text());text=(ROOT/FOLDER/spot['dir']/meta['narration']).read_text();expect(page.locator('#title')).to_have_text(meta['title']);assert page.locator('#story').text_content()==text
  page.wait_for_function('url=>document.querySelector("#hero-img").src===url && document.querySelector("#hero-img").naturalWidth>0',arg=base+FOLDER+spot['dir']+'/'+meta['image']['path']);page.evaluate('kyotoAudio.selectDefault(selected)')
  expect(page.locator('#v-duration')).to_have_text('--:--')
  expect(page.locator('#photo-note')).to_contain_text('AI 재구성')
  assert 'Wikimedia' not in page.locator('#photo-credit').inner_text()
  expect(page.locator('#narration-mode')).to_have_value('tts');expect(page.locator('#narration-mode')).not_to_be_visible();assert page.evaluate('kyotoAudio.tracks.length===8 && kyotoAudio.tracks.every(x=>x===null)')
  expect(page.locator('#v-minus')).to_have_attribute('aria-label','이전 문장');expect(page.locator('#v-plus')).to_have_attribute('aria-label','다음 문장')
  if i==0 and not offline:page.screenshot(path=str(HERE/'kiyomizudera-detail.png'))
  n=page.evaluate('__ttsCalls.length');page.locator('#toggle').click();page.wait_for_function('n=>__ttsCalls.length>n',arg=n);call=page.evaluate('__ttsCalls.at(-1)');first=next(p.strip() for p in re.findall(r'[^.!?。！？\n]+[.!?。！？]*|[\n]+|[.!?。！？]+',text) if p.strip());assert call['text']==first and call['lang']=='ko-KR';spoken.append({'poi_id':spot['poi_id'],'first_sentence':call['text']});page.evaluate('window.stopSpeech()');page.locator('#v-all-spots').click()
 results['offline_spoken' if offline else 'online_spoken']=spoken
 passed(('offline' if offline else 'online')+':8 original spots/order, exact narratives/images and first-sentence native TTS dispatch, null8tracks')
SNAPSHOT="""async names=>{const result={};for(const name of names){const c=await caches.open(name),entries={};for(const r of await c.keys()){const b=await(await c.match(r)).arrayBuffer();entries[r.url]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b))).map(x=>x.toString(16).padStart(2,'0')).join('')}result[name]=entries}return result}"""
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage']);s.preview=False
  c=browser.new_context(service_workers='block');page=c.new_page();arrive(page);results['app_version']=page.evaluate('APP_VERSION');assert page.locator(f'[data-destination-id="{KID}"]').count()==1;c.close();passed('actual catalog includes approved Kiyomizudera and existing destinations')
  s.preview=False;c=browser.new_context(viewport={'width':390,'height':844});c.add_init_script("""window.__ttsCalls=[];window.__ttsErrors=[];const original=speechSynthesis.speak.bind(speechSynthesis);speechSynthesis.speak=u=>{__ttsCalls.push({text:u.text,lang:u.lang});u.addEventListener('error',e=>__ttsErrors.push(e.error));return original(u)}""")
  page=c.new_page();errors=[];requests=[];bad=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url));page.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None);arrive(page);passed('Japan→Kyoto→Kiyomizudera via actual catalog')
  save(page,FID);save(page,GID);others=['travel-v12-jp-kyoto-fushimi-inari@1.2.0','travel-v12-jp-kyoto-kinkakuji-standard@0.1.0-beta.1'];before=page.evaluate(SNAPSHOT,others)
  open_map(page,FID,7);page.locator('#hotspots button').first.click();page.evaluate('kyotoAudio.selectDefault(selected)');expect(page.locator('#narration-mode')).to_have_value('mp3');page.locator('#toggle').click();page.wait_for_function('!kyotoAudio.player.paused && kyotoAudio.player.currentTime>0');page.locator('#toggle').click();page.evaluate('async()=>{await photoPut(0,new Blob(["keep-fushimi-photo"]));localStorage.setItem("kyoto-speed","1.25")}');page.locator('#v-all-spots').click();page.locator('#v-map-back').click()
  open_map(page,GID,8);assert page.locator('.v-reference-route polyline').count()==5;page.locator('#hotspots button').first.click();page.evaluate('kyotoAudio.selectDefault(selected)');expect(page.locator('#narration-mode')).to_have_value('tts');page.locator('#v-all-spots').click();page.locator('#v-map-back').click();passed('existing Fushimi MP3/map and Kinkakuji8pins/5segments intact in3pack selection')
  card(page,KID);page.screenshot(path=str(HERE/'kiyomizudera-card.png'));open_map(page,KID,8);verify_route(page);page.evaluate('p=>window.__mapExpectedPoints=p',points);layouts=[]
  for width,height in [(360,780),(390,844),(430,932)]:
   page.set_viewport_size({'width':width,'height':height});page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');page.wait_for_function('document.querySelector("#map-screen .map-wrap").dataset.labelLayout==="placed"');counts=page.evaluate(GEOMETRY);assert not any(counts.values()),counts
   assert page.locator('.v-pin-label:visible').count()==8;layouts.append({'width':width,'height':height,**counts});name=f'kiyomizudera-map-{width}.png';page.screenshot(path=str(HERE/name));results['screenshots'].append(name)
  results['mobile_collisions']=layouts;passed('360/390/430:8visible pins/labels, original normalized positions, zero5collision categories,3reference/4omitted connections')
  all_spots(page,False)
  images=[str(f.relative_to(ROOT)) for f in (ROOT/FOLDER).rglob('*.jpg')];assert len(images)==10;assert all(page.evaluate('async paths=>Promise.all(paths.map(async path=>{const i=new Image();i.src=path;await i.decode();return i.naturalWidth>0}))',images));passed('10 original JPGs decode')
  page.locator('#v-map-back').click();save(page,KID);cached=page.evaluate(SNAPSHOT,[cache_name])[cache_name]
  for file in (ROOT/FOLDER).rglob('*'):
   if file.is_file():assert cached[base+str(file.relative_to(ROOT))]==hashlib.sha256(file.read_bytes()).hexdigest()
  assert any(k.endswith('/__complete_v12') for k in cached);assert page.evaluate(SNAPSHOT,others)==before;passed('download caches30exact original files+marker; existing2pack cache bodies unchanged')
  page.evaluate('async()=>{await navigator.serviceWorker.ready}');page.reload();page.wait_for_function('navigator.serviceWorker.controller!==null');c.set_offline(True);arrive(page);open_map(page,KID,8);verify_route(page);all_spots(page,True);page.locator('#v-map-back').click();passed('service worker reload and offline map/8spots/reference path')
  card(page,KID).locator('.v-guide-save').click();page.locator('[data-action=confirm-delete]').click();expect(card(page,KID).locator('.v-guide-save')).to_have_attribute('data-save-state','missing');assert cache_name not in page.evaluate('caches.keys()');assert page.evaluate(SNAPSHOT,others)==before
  card(page,KID).locator('.v-guide-main').click();expect(page.locator('.v-warning')).to_contain_text('인터넷');passed('offline delete removes onlyKiyomizudera and blocks deleted offline entry')
  c.set_offline(False);save(page,KID);assert page.evaluate(SNAPSHOT,others)==before;passed('redownload succeeds without disturbing2existing packs')
  open_map(page,FID,7);page.locator('#hotspots button').first.click();page.evaluate('kyotoAudio.selectDefault(selected)');expect(page.locator('#narration-mode')).to_have_value('mp3');assert page.evaluate('async()=>(await photoGet(0)).text()')=='keep-fushimi-photo';assert page.evaluate('localStorage.getItem("kyoto-speed")')=='1.25';passed('switch back restores existing MP3/default state and personal photo/settings')
  assert not any('/kiyomizudera-standard/' in url and '.mp3' in url for url in requests);assert not errors,errors
  results['page_errors']=errors;results['http_errors']=bad;results['native_tts_errors']=page.evaluate('__ttsErrors');results['korean_voice_count']=page.evaluate('speechSynthesis.getVoices().filter(v=>v.lang.toLowerCase().startsWith("ko")).length');results['audible_device_speech']='NOT_RUN';passed('no ungenerated MP3 requests and no JS exceptions')
  c.close();browser.close()
finally:
 s.shutdown();(HERE/'integration-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
