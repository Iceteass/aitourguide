"""Synthetic pack variants in a temporary checkout; public catalog/content untouched."""
import json,shutil,tempfile,threading
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright,expect
from browser_helpers import expand_guides
ROOT=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
with tempfile.TemporaryDirectory(prefix='optional-audio-browser-') as tmp:
 site=Path(tmp)/'aitourguide';shutil.copytree(ROOT,site,ignore=shutil.ignore_patterns('.git','__pycache__'))
 catalog=json.loads((site/'data/catalog.json').read_text());catalog.pop('destinations',None)
 source=site/'travel-packs/JP/kyoto/fushimi-inari'
 for name,keep in [('fixture-zero',[]),('fixture-partial',[1,4])]:
  folder=source.parent/name;shutil.copytree(source,folder)
  pack=json.loads((folder/'pack.json').read_text());pack['pack_id']=name
  for i,spot in enumerate(pack['spots']):
   if i in keep:continue
   file=folder/spot['meta'];meta=json.loads(file.read_text());audio=spot['dir']+'/'+meta['audio']['path']
   (folder/audio).unlink();pack['files']=[f for f in pack['files'] if f['path']!=audio]
   meta['audio'].update(status='not_generated',bytes=None,sha256=None);file.write_text(json.dumps(meta,ensure_ascii=False))
   next(f for f in pack['files'] if f['path']==spot['meta'])['bytes']=file.stat().st_size
  (folder/'pack.json').write_text(json.dumps(pack))
  entry=dict(catalog['published'][0]);entry.update(pack_id=name,title=name,path=f'travel-packs/JP/kyoto/{name}/pack.json');catalog['published'].append(entry)
 (site/'data/catalog.json').write_text(json.dumps(catalog))
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=tmp));threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
   context=browser.new_context();page=context.new_page();errors=[];requests=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
   page.goto(f'http://127.0.0.1:{server.server_port}/aitourguide/')
   page.locator('[data-action=start]').click();page.locator('[data-action=country]').click();page.locator('[data-action=city]').click()
   page.wait_for_function("document.querySelectorAll('.v-destination-toggle').length===3 && !document.querySelector('.v-destination-toggle').disabled")
   for name,total in [('fixture-zero',0),('fixture-partial',2)]:
    card=page.locator(f'[data-destination-id="{name}"]');card.locator('.v-destination-toggle').click()
    card.locator('.v-guide-save').click();page.locator('[data-action=confirm-download]').click()
    expect(card.locator('.v-guide-save')).to_have_attribute('data-save-state','saved',timeout=60000)
    card.locator('.v-guide-main').click();page.locator('#hotspots button').first.click()
    page.wait_for_function("document.querySelector('#narration-mode').value==='tts'")
    assert page.evaluate('kyotoAudio.tracks.length')==7
    assert page.evaluate('kyotoAudio.tracks.filter(Boolean).length')==total
    if total:expect(page.locator('#offline-audio-status')).to_have_text('✓ 2/2개 MP3 오프라인 저장 완료 · 비행기 모드 재생 준비됨')
    expect(page.locator('#narration-mode')).to_be_disabled()
    expect(page.locator('#story')).not_to_be_empty()
    # Invoke original TTS via the real UI; no audio hardware claim.
    page.locator('#toggle').click();page.evaluate('window.stopSpeech()')
    page.locator('#v-all-spots').click()
    if total:
     page.locator('#hotspots button').nth(1).click();page.wait_for_function("document.querySelector('#narration-mode').value==='mp3'")
     page.locator('#toggle').click();page.wait_for_function('!kyotoAudio.player.paused && kyotoAudio.player.currentTime>0');page.locator('#toggle').click()
     assert '/02-romon/' in page.evaluate('kyotoAudio.player.src')
     page.locator('#v-all-spots').click()
    page.locator('#v-map-back').click()
   await_ready='async () => {await navigator.serviceWorker.ready}'
   page.evaluate(await_ready);page.reload();page.wait_for_function('navigator.serviceWorker.controller!==null');context.set_offline(True);page.reload()
   page.locator('[data-action=start]').click();page.locator('[data-action=country]').click();page.locator('[data-action=city]').click()
   for name in ['fixture-zero','fixture-partial']:
    card=page.locator(f'[data-destination-id="{name}"]');card.locator('.v-destination-toggle').click();card.locator('.v-guide-main').click()
    page.locator('#hotspots button').first.click();page.wait_for_function("document.querySelector('#narration-mode').value==='tts'")
    expect(page.locator('#story')).not_to_be_empty();page.wait_for_function('document.querySelector("#hero-img").naturalWidth>0')
    page.locator('#v-all-spots').click()
    if name=='fixture-partial':
     page.locator('#hotspots button').nth(1).click();page.wait_for_function("document.querySelector('#narration-mode').value==='mp3'")
     page.locator('#toggle').click();page.wait_for_function('!kyotoAudio.player.paused && kyotoAudio.player.currentTime>0');page.locator('#toggle').click();page.locator('#v-all-spots').click()
    page.locator('#v-map-back').click()
   card=page.locator('[data-destination-id="fixture-zero"]');card.locator('.v-guide-save').click();page.locator('[data-action=confirm-delete]').click()
   expect(card.locator('.v-guide-save')).to_have_attribute('data-save-state','missing')
   assert 'travel-v12-fixture-partial@1.2.0' in page.evaluate('caches.keys()')
   assert not any('/fixture-zero/' in url and '.mp3' in url for url in requests)
   assert not any('/fixture-partial/' in url and '.mp3' in url and '/02-romon/' not in url and '/05-okusha/' not in url for url in requests)
   assert not errors,errors
   browser.close();print('PASS: zero/partial MP3 packs, indices, playback/TTS UI, offline story/image/map, deletion isolation')
 finally:server.shutdown()
