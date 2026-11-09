"""Candidate photo credits/crop regression; no claim of rights or audible speech."""
import json,threading
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT.parent/'kyoto-final-evidence';OUT.mkdir(exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT.parent)));threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/aitourguide/'
def arrive(page):
 page.goto(base);page.locator('[data-action=start]').click();page.locator('[data-action=country]').click();page.locator('[data-action=city]').click();page.wait_for_function('document.querySelectorAll(".v-destination-toggle:not(:disabled)").length===3')
def card(page,dest):
 c=page.locator(f'[data-destination-id="jp-kyoto-{dest}"]');t=c.locator('.v-destination-toggle')
 if t.get_attribute('aria-expanded')=='false':t.click()
 return c
def enter(page,dest):card(page,dest).locator('.v-guide-main').click();page.wait_for_function('document.body.classList.contains("v-map")')
results=[]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=browser.new_context(viewport={'width':390,'height':844});page=context.new_page();arrive(page)
  for dest in ['kinkakuji','kiyomizudera']:
   c=card(page,dest);c.locator('.v-guide-save').click();page.locator('[data-action=confirm-download]').click();expect(c.locator('.v-guide-save')).to_have_attribute('data-save-state','saved',timeout=60000)
  page.evaluate('async()=>{await navigator.serviceWorker.ready}');page.reload();page.wait_for_function('navigator.serviceWorker.controller!==null');context.set_offline(True);arrive(page)
  for dest,indices in [('kinkakuji',[4]),('kiyomizudera',[1,6,7])]:
   enter(page,dest)
   for idx in indices:
    page.locator('#hotspots button').nth(idx).click();page.wait_for_function('document.querySelector("#hero-img").naturalWidth>0');page.locator('[data-tab=photo]').click();credit=page.locator('#photo-credit');expect(credit).to_be_visible();credit.scroll_into_view_if_needed();expect(credit).to_contain_text('CC BY-SA');expect(credit).to_contain_text('https://commons.wikimedia.org/wiki/File:');expect(credit).to_contain_text('creativecommons.org/licenses/by-sa/');expect(credit).to_contain_text('재인코딩');expect(credit).to_contain_text('동일조건');expect(credit).to_contain_text('Vitalie Ciubotaru' if dest=='kiyomizudera' and idx==1 else 'そらみみ')
    if dest=='kiyomizudera' and idx==1:assert '누문' not in page.locator('#photo-note').inner_text() and '인왕문' not in credit.inner_text();expect(page.locator('#photo-note')).to_contain_text('서문')
    for width in [360,390,430]:
     page.set_viewport_size({'width':width,'height':844});page.screenshot(path=str(OUT/f'{dest}-{idx+1}-credit-{width}.png'),full_page=True)
     if dest=='kiyomizudera' and idx==7:assert page.locator('#hero-img').evaluate('e=>getComputedStyle(e).objectFit')=='contain'
    results.append({'destination':dest,'spot':idx+1,'offline_credit':'PASS','caption':page.locator('#photo-note').inner_text()});page.locator('#v-all-spots').click()
   page.locator('#v-map-back').click()
  context.close();browser.close();print('PASS:4offline author/license/source/modification credits; Saimon label; Koyasu contain at3widths')
finally:server.shutdown();(OUT/'photo-credit-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
