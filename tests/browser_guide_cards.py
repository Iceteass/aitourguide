"""Stage A: real text-size layout, accessible expand/focus, cancel/retry and legacy UI.
Run with --screenshots to refresh the two reviewed after images.
"""
import argparse,json,threading
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright,expect
from browser_helpers import expand_guides,store_button,wait_saved
parser=argparse.ArgumentParser();parser.add_argument('--screenshots',action='store_true');args=parser.parse_args()
ROOT=Path(__file__).resolve().parents[1];CATALOG=json.loads((ROOT/'data/catalog.json').read_text())
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT.parent)))
t=threading.Thread(target=server.serve_forever,daemon=True);t.start();base=f'http://127.0.0.1:{server.server_port}/aitourguide/'
def arrive(page):
 page.goto(base);page.locator('[data-action=start]').click();page.locator('[data-action=country]').click();page.locator('[data-action=city]').click();expect(page.locator('.v-destination-toggle')).to_be_enabled()
def layout(page):
 data=page.evaluate("""() => {
 const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};
 return {image:box('.v-destination-image img'),arrow:box('.v-expand-icon'),save:box('.v-guide-save'),main:box('.v-guide-main'),meta:box('.v-guide-meta'),title:box('.v-destination-main'),background:getComputedStyle(document.querySelector('.v-destination')).backgroundColor,root:box('#journey-root'),scroll:document.documentElement.scrollWidth,viewport:innerWidth,font:parseFloat(getComputedStyle(document.querySelector('.v-destination-title')).fontSize)};
 }""")
 assert abs(data['image']['w']-60)<.1 and abs(data['image']['h']-60)<.1,data
 assert data['save']['w']>=44 and data['save']['h']>=44
 assert abs(data['arrow']['x']+22-data['save']['x']-22)<1
 assert abs(data['image']['y']+30-data['arrow']['y']-22)<1
 assert data['main']['right']<=data['save']['x']-5
 assert data['meta']['right']<=data['main']['right']+.5
 assert data['title']['right']<=data['arrow']['x']+.5
 assert data['background']=='rgba(4, 33, 48, 0.65)'
 assert data['scroll']<=data['viewport'] and data['root']['y']==0
 return data
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  context=browser.new_context(viewport={'width':390,'height':844});page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));arrive(page)
  toggle=page.locator('.v-destination-toggle');expect(toggle).to_have_attribute('aria-expanded','false')
  assert page.locator('button button').count()==0
  assert page.locator('.v-destination-tags span').all_text_contents()==['#후시미구','#신사','#센본도리이']
  assert not page.locator('.v-guide-main').is_visible()
  assert page.locator('.v-destination').count()==1
  if args.screenshots:page.screenshot(path=str(ROOT/'docs/screenshots/destination-collapsed.png'))
  toggle.focus();page.keyboard.press('Space');expect(toggle).to_have_attribute('aria-expanded','true');expect(toggle).to_be_focused()
  page.keyboard.press('Enter');expect(toggle).to_have_attribute('aria-expanded','false');expect(toggle).to_be_focused()
  page.locator('.v-destination-image img').click();expect(toggle).to_have_attribute('aria-expanded','true')
  page.locator('.v-destination-title').click();expect(toggle).to_have_attribute('aria-expanded','false')
  expand_guides(page)
  assert page.locator('.v-guide-tags span').all_text_contents()==['#기본','#역사']
  assert page.locator('.v-guide-version').inner_text()=='v1.0.0'
  assert page.locator('.v-guide-main').get_attribute('data-value').endswith('/default')
  for width in [360,390,430]:
   for scale in [1,1.25,1.5,2]:
    page.set_viewport_size({'width':width,'height':844})
    css=f'.v-destination-title{{font-size:{18*scale}px!important}}.v-destination-tags{{font-size:{12*scale}px!important}}.v-guide-title{{font-size:{14*scale}px!important}}.v-guide-meta{{font-size:{12*scale}px!important}}'
    page.evaluate("css=>{let s=document.getElementById('text-size-test');if(!s){s=document.createElement('style');s.id='text-size-test';document.head.append(s)}s.textContent=css}",css)
    actual=layout(page);assert abs(actual['font']-18*scale)<.01
  page.evaluate("document.getElementById('text-size-test').remove()")
  page.set_viewport_size({'width':390,'height':844})
  if args.screenshots:page.screenshot(path=str(ROOT/'docs/screenshots/destination-expanded.png'))
  button=store_button(page);button.focus();button.click();page.locator('[role=dialog]').wait_for()
  first=page.locator('[data-action=dismiss]');expect(first).to_be_focused();page.keyboard.press('Shift+Tab');expect(page.locator('[data-action=confirm-download]')).to_be_focused()
  page.keyboard.press('Escape');expect(store_button(page)).to_be_focused()
  page.locator('.v-guide-main').click();page.wait_for_function("document.body.classList.contains('v-map')");page.locator('#v-map-back').click();expect(page.locator('.v-guide-main')).to_be_focused()
  assert not errors,errors
  context.close();print('PASS: 12 text-size/width layouts, 60px image, 44px controls/alignment, tags/version, expand via image/title/keyboard, focus and dialog trap',flush=True)

  context=browser.new_context(service_workers='block');page=context.new_page();arrive(page);held=[]
  def hold(route):
   if not held:held.append(route);route.request.frame.evaluate('window.__blockedAudio=true')
   else:route.continue_()
  context.route('**/audio/ko-N1.mp3',hold)
  store_button(page).click();page.locator('[data-action=confirm-download]').click();page.wait_for_function('window.__blockedAudio===true')
  assert page.locator('.v-guide-save').get_attribute('data-save-state')=='busy';assert page.locator('.v-guide-save').is_disabled()
  page.keyboard.press('Escape');expect(page.locator('[role=dialog]')).to_be_visible();expect(page.locator('[data-action=cancel-download]')).to_be_enabled()
  page.locator('[data-action=cancel-download]').click();held[0].continue_()
  page.locator('[role=dialog]').wait_for(state='detached');expect(store_button(page)).to_have_attribute('data-save-state','missing')
  assert page.evaluate("async () => {for(const n of await caches.keys()){if(n.startsWith('travel-v12-')&&!n.includes('pending-')){const c=await caches.open(n);if((await c.keys()).some(r=>r.url.endsWith('/__complete_v12')))return false}}return true}")
  context.unroute('**/audio/ko-N1.mp3',hold)
  store_button(page).click();page.locator('[data-action=confirm-download]').click();wait_saved(page)
  expect(store_button(page,True)).to_be_focused()
  store_button(page,True).click();page.locator('[data-action=confirm-delete]').click();page.locator('[role=dialog]').wait_for(state='detached');expect(store_button(page)).to_have_attribute('data-save-state','missing')
  context.close();print('PASS: actual pending audio cancellation never marks complete; retry resumes/downloads; saved icon/delete confirmation/state/focus are real',flush=True)

  legacy=json.loads(json.dumps(CATALOG));del legacy['destinations']
  context=browser.new_context(service_workers='block');context.route('**/data/catalog.json',lambda route:route.fulfill(json=legacy));page=context.new_page();arrive(page);expand_guides(page)
  assert page.locator('.v-destination-tags').inner_text()=='태그 미등록';assert page.locator('.v-guide-version').inner_text()=='버전 미등록';assert page.locator('.v-guide-title').inner_text()=='기본 가이드';context.close()
  private=json.loads(json.dumps(CATALOG));private['destinations'][0]['guides'][0]['status']='review'
  context=browser.new_context(service_workers='block');context.route('**/data/catalog.json',lambda route:route.fulfill(json=private));page=context.new_page();page.goto(base);page.locator('[data-action=start]').click();page.wait_for_function("document.getElementById('journey-root').getAttribute('aria-busy')==='false'");assert page.locator('[data-action=country]').count()==0;context.close()
  long=json.loads(json.dumps(CATALOG));long['published'][0]['title']='매우 긴 여행지 이름 '*20;long['destinations'][0]['destination_tags']=['아주긴지역태그'*20,'아주긴유형태그'*20,'아주긴특징태그'*20];long['destinations'][0]['guides'][0]['guide_title']='아주 긴 가이드 제목 '*20;long['destinations'][0]['guides'][0]['guide_tags']=['긴가이드태그'*20,'또다른태그'*20]
  context=browser.new_context(service_workers='block',viewport={'width':360,'height':844});context.route('**/data/catalog.json',lambda route:route.fulfill(json=long));page=context.new_page();arrive(page);expand_guides(page);layout(page);context.close()
  print('PASS: legacy metadata placeholders, non-public guide hidden, long title/tags clip without overlapping controls',flush=True)
  browser.close()
finally:server.shutdown();server.server_close();t.join()
