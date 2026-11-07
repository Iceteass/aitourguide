"""Chromium geometry regression: real map, labels, pins, and connector intersections."""
import json, threading, argparse, subprocess
from time import perf_counter
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--baseline',action='store_true');args=parser.parse_args()
baseline_code=subprocess.check_output(['git','show','86ca243c50cc5a0c62b241a2b840b28dc18c4a8e:app/map-overlay.js'],cwd=ROOT) if args.baseline else None
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  if baseline_code is not None and self.path.split('?')[0].endswith('/app/map-overlay.js'):
   self.send_response(200);self.send_header('Content-Type','application/javascript');self.end_headers();self.wfile.write(baseline_code);return
  super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT.parent)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844});page.goto(f'http://127.0.0.1:{server.server_port}/aitourguide/')
 page.locator('[data-action=start]').click();page.locator('[data-action=country]').click();page.locator('[data-action=city]').click()
 card=page.locator('[data-destination-id="jp-kyoto-kinkakuji"]');card.locator('.v-destination-toggle').click();card.locator('.v-guide-main').click()
 page.wait_for_function('document.querySelectorAll(".v-pin-label").length===8 && document.querySelector("#map-screen .map-wrap img").naturalWidth>0')
 page.evaluate('points=>window.__mapExpectedPoints=points',json.loads((ROOT/'travel-packs/JP/kyoto/kinkakuji-standard/route/points.json').read_text())['points'])
 results=[]
 errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
 for width,height in [(360,780),(390,844),(430,932),(390,640)]:
  page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(150)
  counts=page.evaluate('''()=>{
   const wrap=document.querySelector('#map-screen .map-wrap'),r=wrap.getBoundingClientRect(),box=e=>{const b=e.getBoundingClientRect();return {l:b.left-r.left,t:b.top-r.top,r:b.right-r.left,b:b.bottom-r.top}};
   const labels=[...wrap.querySelectorAll('.v-pin-label')].map(box),pins=[...wrap.querySelectorAll('.v-pin-number')].map(box);
   const lines=[...wrap.querySelectorAll('.v-pin-connectors line')].map(e=>[+e.getAttribute('x1')*r.width/1000,+e.getAttribute('y1')*r.height/1000,+e.getAttribute('x2')*r.width/1000,+e.getAttribute('y2')*r.height/1000]);
   const overlap=(a,b)=>a.l<b.r&&a.r>b.l&&a.t<b.b&&a.b>b.t;
   const cross=(a,b)=>{const orient=(x,y,z)=>(y[0]-x[0])*(z[1]-x[1])-(y[1]-x[1])*(z[0]-x[0]);const x=a.slice(0,2),y=a.slice(2),u=b.slice(0,2),v=b.slice(2);const on=(p,q,r)=>Math.abs(orient(p,q,r))<.001&&r[0]>=Math.min(p[0],q[0])-.001&&r[0]<=Math.max(p[0],q[0])+.001&&r[1]>=Math.min(p[1],q[1])-.001&&r[1]<=Math.max(p[1],q[1])+.001;return (orient(x,y,u)*orient(x,y,v)<0&&orient(u,v,x)*orient(u,v,y)<0)||on(x,y,u)||on(x,y,v)||on(u,v,x)||on(u,v,y)};
   const hit=(l,b)=>[[b.l,b.t,b.r,b.t],[b.r,b.t,b.r,b.b],[b.r,b.b,b.l,b.b],[b.l,b.b,b.l,b.t]].some(e=>cross(l,e))|| (l[0]>b.l&&l[0]<b.r&&l[1]>b.t&&l[1]<b.b);
   const counts={labelLabel:0,labelPin:0,lineLabel:0,linePin:0,lineLine:0};
   labels.forEach((a,i)=>{labels.forEach((b,j)=>{if(j>i&&overlap(a,b))counts.labelLabel++});pins.forEach(b=>{if(overlap(a,b))counts.labelPin++})});
   lines.forEach((a,i)=>{labels.forEach((b,j)=>{if(i!==j&&hit(a,b))counts.lineLabel++});pins.forEach((b,j)=>{if(i!==j&&hit(a,b))counts.linePin++});lines.forEach((b,j)=>{if(j>i&&cross(a,b))counts.lineLine++})});
   const points=window.__mapExpectedPoints;
   pins.forEach((b,i)=>{const a=points[i].pin_anchor||points[i];if(Math.abs((b.l+b.r)/2/r.width-a.x)>.002||Math.abs((b.t+b.b)/2/r.height-a.y)>.002)throw Error('Pin anchor moved');});
   labels.forEach(b=>{if(b.l<-.5||b.r>r.width+.5||b.t<-.5||b.b>r.height+.5)throw Error('Label outside map');});
   return counts;
  }''')
  out=ROOT.parent/'map-evidence';out.mkdir(exist_ok=True);page.screenshot(path=str(out/f'{"baseline" if args.baseline else "fixed"}-{width}-{height}.png'))
  results.append({'width':width,'height':height,**counts})
 assert page.locator('.v-reference-route polyline').count()==5
 pairs=page.locator('.v-reference-route polyline').evaluate_all('lines=>lines.map(l=>[l.dataset.from,l.dataset.to])')
 assert ['shariden-kinkaku','rikushunomatsu'] not in pairs and ['rikushunomatsu','gingasen-gankasui'] not in pairs
 if not args.baseline:
  # An impossible tiny map with enlarged captions must terminate and expose a
  # numbered scrollable legend instead of stale, overlapping floating labels.
  enlarged_style=page.add_style_tag(content='.v-pin-label{font-size:42px!important;max-width:none!important}')
  fallback_started=perf_counter()
  page.set_viewport_size({'width':180,'height':320})
  page.wait_for_function('document.querySelector(".map-wrap").dataset.labelLayout==="legend"',timeout=3000)
  fallback_seconds=perf_counter()-fallback_started
  assert fallback_seconds<2,fallback_seconds
  assert page.locator('.v-pin-label:visible').count()==0
  assert not page.locator('.v-pin-connectors').is_visible()
  legend=page.locator('.v-map-label-legend');assert legend.locator('summary').bounding_box()['height']>=44,'Legend disclosure needs44px touch target';legend.locator('summary').click()
  assert legend.locator('button').count()==8
  rectangles=legend.locator('button').evaluate_all('buttons=>buttons.map(b=>{const r=b.getBoundingClientRect();return {top:r.top,bottom:r.bottom}})')
  assert all(a['bottom']<=b['top'] for a,b in zip(rectangles,rectangles[1:]))
  page.screenshot(path=str(out/'fixed-pathological-180-320.png'))
  # A normal resize restores captions and connectors without re-entering map.
  enlarged_style.evaluate('element=>element.remove()')
  page.set_viewport_size({'width':390,'height':844})
  page.wait_for_function('document.querySelector(".map-wrap").dataset.labelLayout==="placed"',timeout=3000)
  assert page.locator('.v-pin-label:visible').count()==8 and page.locator('.v-pin-connectors').is_visible()
  print('Pathological viewport change to fallback (including browser rendering):',round(fallback_seconds,3),'seconds')
 assert not errors,errors
 print(json.dumps(results,indent=2));browser.close()
server.shutdown()
if not args.baseline:assert all(not any(v for k,v in row.items() if k not in ('width','height')) for row in results),results

if args.baseline:assert any(row['lineLabel'] or row['lineLine'] for row in results),'Baseline did not reproduce collisions'
