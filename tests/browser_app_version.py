"""Real-browser upgrade/offline check. Requires Python Playwright and Chromium.
Run from repository root: python3 tests/browser_app_version.py --baseline-ref <baseline commit>
The baseline must exist locally; fixtures and browser storage are temporary.
"""
import argparse
import re
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import subprocess
import tarfile
import tempfile
import threading
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--baseline-ref', required=True)
parser.add_argument('--chromium', default='/usr/bin/chromium')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

# Hash real CacheStorage bodies and photo blobs, not just cache names or sizes.
SNAPSHOT = """async () => {
 const hash=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)))
   .map(x=>x.toString(16).padStart(2,'0')).join('');
 const result={caches:{},photos:{},preferences:{}};
 for(const name of (await caches.keys()).sort()){
   if(name.startsWith('history-journey-v12'))continue;
   const cache=await caches.open(name),entries={};
   for(const r of await cache.keys())entries[r.url]=await hash(await (await cache.match(r)).arrayBuffer());
   result.caches[name]=entries;
 }
 const db=await photoDB();
 const blobs=await new Promise((resolve,reject)=>{
   const all=[];const r=db.transaction('photos','readonly').objectStore('photos').openCursor();
   r.onerror=()=>reject(r.error);r.onsuccess=()=>{const c=r.result;if(!c)return resolve(all);all.push([c.key,c.value]);c.continue()};
 });
 for(const [key,blob] of blobs)result.photos[String(key)]=await hash(await blob.arrayBuffer());
 for(const key of ['kyoto-speed','kyoto-voice'])result.preferences[key]=localStorage.getItem(key);
 return result;
}"""

def version_on_splash(page):
    label = page.locator('.v-app-version')
    label.wait_for()
    version = page.evaluate('window.APP_VERSION')
    assert label.inner_text() == 'App v' + version
    assert page.title().endswith(' · v' + version)
    assert page.locator('.v-touch').evaluate('(e)=>e.firstChild.textContent') == '계속하려면 화면을 터치하세요'
    assert page.locator('.v-brand h1').inner_text() == '여행이\n역사가 되는 순간'
    for width, height in [(375, 812), (320, 568)]:
        page.set_viewport_size({'width': width, 'height': height})
        box = label.bounding_box()
        brand = page.locator('.v-brand').bounding_box()
        assert box and box['y'] > brand['y'] + brand['height']
        assert box['y'] + box['height'] <= height
        assert float(label.evaluate('(e)=>getComputedStyle(e).fontSize').removesuffix('px')) < float(page.locator('.v-touch').evaluate('(e)=>getComputedStyle(e).fontSize').removesuffix('px'))
    return version

def splash_pixels(page):
    # Hide only the expected version-number difference for a design comparison.
    page.set_viewport_size({'width': 375, 'height': 812})
    page.locator('.v-app-version').evaluate("e=>e.style.visibility='hidden'")
    page.evaluate('document.fonts.ready')
    backgrounds=page.locator('.v-bg').evaluate('(e)=>getComputedStyle(e).backgroundImage')
    for url in re.findall(r'url\("([^"\)]+)"\)', backgrounds):
        page.evaluate("url=>new Promise((resolve,reject)=>{const i=new Image();i.onload=resolve;i.onerror=reject;i.src=url})",url)
    pixels=page.locator('.v-bg').screenshot()
    page.locator('.v-app-version').evaluate("e=>e.style.visibility=''")
    return pixels

with tempfile.TemporaryDirectory(prefix='aitourguide-version-') as temp:
    fixture = Path(temp)
    old = fixture / 'baseline'
    old.mkdir()
    archive = fixture / 'baseline.tar'
    subprocess.run(['git', 'archive', '--format=tar', '-o', str(archive), args.baseline_ref], cwd=root, check=True)
    with tarfile.open(archive) as contents:
        contents.extractall(old, filter='data')
    baseline_source=old / 'app/version.js'
    baseline_version=re.search(r"APP_VERSION\s*=\s*'([^']+)'", baseline_source.read_text())[1] if baseline_source.exists() else '1.2.2'
    baseline_shell='history-journey-v12-shell-'+baseline_version if baseline_source.exists() else 'history-journey-v122-shell-20261022'
    site = fixture / 'aitourguide'
    site.symlink_to(old, target_is_directory=True)
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(fixture)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_port}/aitourguide/'
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=args.chromium, args=['--no-sandbox', '--disable-dev-shm-usage'])
            context = browser.new_context(viewport={'width': 375, 'height': 812})
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(base)
            assert page.title().endswith('v'+baseline_version), 'Use the requested real baseline'
            assert page.locator('.v-app-version').count() == int(baseline_source.exists())
            old_pixels=splash_pixels(page) if baseline_source.exists() else None
            page.locator('[data-action="start"]').click()
            page.locator('[data-action="country"]').click()
            page.locator('[data-action="city"]').click()
            page.locator('[data-action="manage"]').click()
            page.locator('[data-action="confirm-download"]').click()
            page.get_by_role('button', name='다운로드 완료', exact=True).wait_for(timeout=60000)
            page.evaluate('async () => {await navigator.serviceWorker.ready;}')
            page.reload()
            page.wait_for_function('navigator.serviceWorker.controller !== null')
            assert baseline_shell in page.evaluate('caches.keys()')
            page.evaluate("""async () => {
              localStorage.setItem('kyoto-speed','1.5');localStorage.setItem('kyoto-voice','upgrade-test-voice');
              const blob=await (await fetch('romon-preview.jpg')).blob();
              const db=await photoDB();
              await new Promise((resolve,reject)=>{
                const tx=db.transaction('photos','readwrite'),s=tx.objectStore('photos');
                s.put(blob,0);s.put(blob,'jp-kyoto-fushimi-inari:odotorii');
                tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
              });
              const c=await caches.open('kyoto-guide-audio-v173');
              await c.put(new URL('upgrade-probe',location.href),new Response('preserve legacy cache'));
            }""")
            before = page.evaluate(SNAPSHOT)
            site.unlink()
            site.symlink_to(root, target_is_directory=True)
            page.evaluate("""async () => {
              const reg=await navigator.serviceWorker.ready;
              const changed=new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
              await reg.update();await changed;
            }""")
            page.reload()
            version = version_on_splash(page)
            if old_pixels is not None:
                assert splash_pixels(page)==old_pixels,'Splash design changed beyond the version label'
            assert page.evaluate(SNAPSHOT) == before, 'Upgrade changed trip/legacy cache, personal photos or preferences'
            names = page.evaluate('caches.keys()')
            assert baseline_shell not in names
            assert 'history-journey-v12-shell-' + version in names
            assert page.evaluate('async () => (await navigator.serviceWorker.ready).scope') == base
            context.set_offline(True)
            page.reload()
            assert version_on_splash(page) == version
            assert page.evaluate(SNAPSHOT) == before
            page.locator('.v-app-version').click()
            page.locator('[data-action="country"]').wait_for()
            page.locator('[data-action="back"]').click()
            page.locator('[data-action="start"]').focus()
            page.keyboard.press('Enter')
            page.locator('[data-action="country"]').click()
            page.locator('[data-action="city"]').click()
            page.wait_for_function("window.kyotoAudio?.tracks?.[0]?.name?.startsWith('travel-packs/')")
            page.locator('[data-action="open"]').first.click()
            page.wait_for_function("document.body.classList.contains('v-map')")
            assert page.locator('#hotspots button').count() == 7
            page.wait_for_function("document.querySelector('#map-screen .map-wrap img').naturalWidth > 0")
            page.locator('#hotspots button').first.click()
            page.wait_for_function("document.body.classList.contains('v-detail')")
            page.wait_for_function("document.querySelector('#hero-img').naturalWidth > 0 && document.querySelector('#story').textContent.length > 0")
            page.wait_for_function("document.querySelector('#narration-mode').value === 'mp3'")
            result = page.evaluate("""async () => {
              const r=await fetch(window.kyotoAudio.tracks[0].name,{headers:{Range:'bytes=0-99'}});
              return [r.status,(await r.arrayBuffer()).byteLength];
            }""")
            assert result == [206, 100], result
            assert not errors, errors
            print('PASS: real v'+baseline_version+' → v' + version + ' worker upgrade; cached pack bytes, legacy cache, old/new photo keys and preferences preserved')
            print('PASS: offline version/title, small-screen layout, version tap/Enter, navigation, 7 map pins, detail image/narration, MP3 default/range')
            # A new visitor must also get the same version offline without a trip download.
            fresh = browser.new_context()
            page = fresh.new_page()
            page.goto(base)
            assert version_on_splash(page) == version
            page.evaluate('async () => {await navigator.serviceWorker.ready;}')
            page.reload()
            page.wait_for_function('navigator.serviceWorker.controller !== null')
            fresh.set_offline(True)
            page.reload()
            assert version_on_splash(page) == version
            print('PASS: fresh install and offline splash version without a travel pack')
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join()
