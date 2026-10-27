"""Common image loading/failure order and existing app functional checks.
Requires Python Playwright + Chromium. Run from repository root.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
from playwright.sync_api import sync_playwright
from browser_helpers import open_guide,store_button,wait_saved

ROOT=Path(__file__).resolve().parents[1]
MANIFEST=(ROOT/'assets/manifest.json').read_text()
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
    def do_GET(self):
        if self.path.split('?')[0] in self.server.missing:
            self.send_error(404);return
        super().do_GET()

def check_background(page,want):
    page.wait_for_function('(want)=>document.querySelector(".v-bg")?.dataset.assetId===want',arg=want)

def destinations(page):
    page.locator('[data-action="start"]').click()
    check_background(page,'app-splash')
    page.locator('[data-action="country"]').click()
    check_background(page,'country-jp-background')
    page.locator('[data-action="city"]').click()
    page.wait_for_function("window.kyotoAudio?.tracks?.[0]?.name?.startsWith('travel-packs/')")
    check_background(page,'country-jp-background')

def map_detail(page):
    open_guide(page)
    page.wait_for_function("document.body.classList.contains('v-map')")
    assert page.locator('#hotspots button').count()==7
    page.locator('#hotspots button').first.click()
    page.wait_for_function("document.body.classList.contains('v-detail')")
    page.wait_for_function("document.querySelector('#hero-img').naturalWidth>0 && document.querySelector('#story').textContent.length>0")

server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT.parent)))
server.missing=set()
thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
base=f'http://127.0.0.1:{server.server_port}/aitourguide/'
try:
 with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    context=browser.new_context(viewport={'width':375,'height':812})
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(base);check_background(page,'app-splash')
    assert page.locator('.v-app-version').inner_text()=='App v'+page.evaluate('APP_VERSION')
    destinations(page);map_detail(page)
    page.wait_for_function("document.querySelector('#narration-mode').value==='tts'")
    page.locator('#v-all-spots').click();page.locator('#v-map-back').click()
    store_button(page).click();page.locator('[data-action="confirm-download"]').click()
    wait_saved(page)
    page.evaluate('async () => {await navigator.serviceWorker.ready;}');page.reload()
    page.wait_for_function('navigator.serviceWorker.controller !== null')
    cached=page.evaluate("""async () => {
      const c=await caches.open('history-journey-v12-shell-'+APP_VERSION);
      return (await c.keys()).map(r=>new URL(r.url).pathname);
    }""")
    for path in ['assets/manifest.json','app/assets.js','assets/app/splash/splash_bg_road_coast_v121.webp','assets/app/backgrounds/road_green_drive.jpg','assets/countries/JP/images/japan_kyoto_sunset.webp','assets/app/fallbacks/road-fallback.svg','assets/app/fallbacks/japan-fallback.svg']:
        assert '/aitourguide/'+path in cached,path
    context.set_offline(True);page.reload();check_background(page,'app-splash')
    destinations(page);map_detail(page)
    page.wait_for_function("document.querySelector('#narration-mode').value==='mp3'")
    page.locator('#toggle').click()
    page.wait_for_function('!kyotoAudio.player.paused && kyotoAudio.player.currentTime>0')
    page.locator('#toggle').click();assert page.evaluate('kyotoAudio.player.paused')
    page.evaluate('kyotoAudio.player.currentTime=10')
    page.locator('#v-minus').click();assert abs(page.evaluate('kyotoAudio.player.currentTime')-5)<0.2
    page.locator('#v-plus').click();assert abs(page.evaluate('kyotoAudio.player.currentTime')-10)<0.2
    page.locator('#speed').select_option('1.5')
    page.wait_for_function('kyotoAudio.player.playbackRate===1.5')
    page.locator('#toggle').click();page.wait_for_function('!kyotoAudio.player.paused')
    page.locator('#toggle').click()
    page.evaluate("""async () => {
      const b=await (await fetch('travel-packs/JP/kyoto/fushimi-inari/cover.jpg')).blob();await photoPut(0,b);
      const c=await caches.open('travel-v12-unrelated-test@1.0.0');await c.put(new URL('keep',location.href),new Response('keep'));
    }""")
    photo_size=page.evaluate('async () => (await photoGet(0)).size')
    page.locator('#v-all-spots').click();page.locator('#v-map-back').click()
    store_button(page,True).click();page.locator('[data-action="confirm-delete"]').click()
    page.locator('[data-action="confirm-delete"]').wait_for(state='detached')
    assert store_button(page).get_attribute('data-save-state')=='missing'
    assert page.evaluate("async () => (await (await caches.open('travel-v12-jp-kyoto-fushimi-inari@1.2.0')).keys()).length")==0
    assert page.evaluate('async () => (await photoGet(0)).size')==photo_size
    assert page.evaluate("localStorage.getItem('kyoto-speed')")=='1.5'
    assert 'travel-v12-unrelated-test@1.0.0' in page.evaluate('caches.keys()')
    assert 'history-journey-v12-shell-'+page.evaluate('APP_VERSION') in page.evaluate('caches.keys()')
    assert not errors,errors
    context.close()
    print('PASS: manifest-backed backgrounds, TTS default without MP3, download/offline map/detail, actual MP3 play/pause/±5s/rate, delete isolation and personal photo/settings preservation',flush=True)

    # A delayed manifest must style the CURRENT screen, not restore an old splash.
    context=browser.new_context(service_workers='block');pending=[]
    context.route('**/assets/manifest.json',lambda route:pending.append(route))
    page=context.new_page();page.goto(base,wait_until='domcontentloaded')
    page.locator('[data-action="start"]').click();page.locator('[data-action="country"]').click()
    assert page.locator('.v-bg').get_attribute('data-asset-id') is None
    assert pending
    pending[0].fulfill(status=200,content_type='application/json',body=MANIFEST)
    check_background(page,'country-jp-background')
    assert page.get_by_text('도시를 선택해주세요',exact=True).is_visible()
    context.close()
    for body,status in [('not JSON',200),('{}',200),('',404)]:
        context=browser.new_context(service_workers='block')
        context.route('**/assets/manifest.json',lambda route,request,b=body,s=status:route.fulfill(status=s,body=b))
        page=context.new_page();page.goto(base)
        page.locator('[data-action="start"]').click();page.locator('[data-action="country"]').click()
        assert 'countries/JP/images/japan_kyoto_sunset.webp' in page.locator('.v-bg').evaluate('(e)=>getComputedStyle(e).backgroundImage')
        assert page.get_by_text('도시를 선택해주세요',exact=True).is_visible()
        context.close()
    print('PASS: late manifest preserves current screen; missing/malformed manifest retains bootstrap design/navigation',flush=True)

    # Fail canonical bitmaps for page AND worker, while required SVGs stay available.
    server.missing={'/aitourguide/assets/'+path for path in ['app/splash/splash_bg_road_coast_v121.webp','app/backgrounds/road_green_drive.jpg','countries/JP/images/japan_kyoto_sunset.webp','splash_bg_road_coast_v121.webp','road_green_drive.jpg','japan_kyoto_sunset.webp']}
    context=browser.new_context(viewport={'width':375,'height':812});page=context.new_page()
    page.goto(base);check_background(page,'app-splash')
    page.evaluate('async () => {await navigator.serviceWorker.ready;}');page.reload()
    page.wait_for_function('navigator.serviceWorker.controller !== null')
    context.set_offline(True);page.reload();check_background(page,'app-splash')
    for want,fallback in [('app-splash','road-fallback.svg'),('country-jp-background','japan-fallback.svg')]:
        if want!='app-splash':page.locator('[data-action="start"]').click();page.locator('[data-action="country"]').click()
        check_background(page,want)
        url=base+'assets/app/fallbacks/'+fallback
        page.evaluate("url=>new Promise((resolve,reject)=>{const i=new Image();i.onload=resolve;i.onerror=reject;i.src=url})",url)
        page.evaluate('document.fonts.ready')
        actual=page.locator('.v-bg').screenshot()
        page.locator('.v-bg').evaluate('(e,url)=>e.style.backgroundImage=`url("${url}")`',url)
        expected=page.locator('.v-bg').screenshot()
        assert actual==expected,'Fallback pixels did not render: '+fallback
    context.close();server.missing=set()
    print('PASS: failed optional bitmaps do not block SW installation; offline app/country SVG fallback pixels match expected rendering',flush=True)
    browser.close()
finally:
 server.shutdown();server.server_close();thread.join()
