"""Check every candidate sentence through real app callbacks; not audible speech."""
import json,re,threading
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT.parent/'kyoto-final-evidence';OUT.mkdir(exist_ok=True)
class H(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
s=ThreadingHTTPServer(('127.0.0.1',0),partial(H,directory=str(ROOT.parent)));threading.Thread(target=s.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{s.server_port}/aitourguide/'
SHIM="""window.__utterances=[];Object.defineProperty(window,'speechSynthesis',{value:{speaking:false,paused:false,getVoices:()=>[],addEventListener(){},cancel(){this.speaking=false},pause(){this.paused=true},resume(){this.paused=false},speak(u){this.speaking=true;__utterances.push(u);u.onstart?.({})}}});"""
def arrive(p):
 p.goto(base);p.locator('[data-action=start]').click();p.locator('[data-action=country]').click();p.locator('[data-action=city]').click();p.wait_for_function('document.querySelectorAll(".v-destination-toggle:not(:disabled)").length===3')
def card(p,d):
 c=p.locator(f'[data-destination-id="jp-kyoto-{d}"]');t=c.locator('.v-destination-toggle')
 if t.get_attribute('aria-expanded')=='false':t.click()
 return c
rows=[]
try:
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);c=b.new_context();c.add_init_script(SHIM);p=c.new_page();arrive(p)
  for dest in ['kinkakuji','kiyomizudera']:
   x=card(p,dest);x.locator('.v-guide-save').click();p.locator('[data-action=confirm-download]').click();expect(x.locator('.v-guide-save')).to_have_attribute('data-save-state','saved',timeout=60000)
  for offline in [False,True]:
   if offline:p.evaluate('async()=>{await navigator.serviceWorker.ready}');p.reload();p.wait_for_function('navigator.serviceWorker.controller!==null');c.set_offline(True);arrive(p)
   for dest in ['kinkakuji','kiyomizudera']:
    packbase=ROOT/'travel-packs/JP/kyoto'/f'{dest}-standard';pack=json.loads((packbase/'pack.json').read_text());card(p,dest).locator('.v-guide-main').click();p.wait_for_function('document.body.classList.contains("v-map")')
    for idx,spot in enumerate(pack['spots']):
     p.locator('#hotspots button').nth(idx).click();meta=json.loads((packbase/spot['meta']).read_text());text=(packbase/spot['dir']/meta['narration']).read_text();assert p.locator('#story').text_content()==text;parts=[x.strip() for x in re.findall(r'[^.!?。！？\n]+[.!?。！？]*|[\n]+|[.!?。！？]+',text) if x.strip()];before=p.evaluate('__utterances.length');p.locator('#toggle').click()
     for i,expected in enumerate(parts):
      assert p.evaluate('__utterances.at(-1).text')==expected,(dest,idx,i)
      p.evaluate('__utterances.at(-1).onend({})')
     actual=p.evaluate('n=>__utterances.slice(n).map(u=>({text:u.text,lang:u.lang}))',before);assert [u['text'] for u in actual]==parts;assert all(u['lang']=='ko-KR' for u in actual);rows.append({'destination':dest,'spot':spot['poi_id'],'offline':offline,'sentences':len(parts),'first':parts[0],'middle':parts[len(parts)//2],'last':parts[-1],'result':'PASS_CALLBACK_SEQUENCE_NOT_AUDIBLE'})
     p.locator('#v-all-spots').click()
    p.locator('#v-map-back').click()
  c.set_offline(False);arrive(p);x=card(p,'fushimi-inari');x.locator('.v-guide-save').click();p.locator('[data-action=confirm-download]').click();expect(x.locator('.v-guide-save')).to_have_attribute('data-save-state','saved',timeout=60000);x.locator('.v-guide-main').click();p.wait_for_function('document.body.classList.contains("v-map")');p.locator('#hotspots button').first.click();p.evaluate('kyotoAudio.selectDefault(selected)');expect(p.locator('#narration-mode')).to_have_value('mp3');p.locator('#toggle').click();p.wait_for_function('!kyotoAudio.player.paused && kyotoAudio.player.currentTime>0');p.locator('#toggle').click();assert p.evaluate('kyotoAudio.player.paused');p.evaluate('kyotoAudio.player.currentTime=10');p.locator('#v-minus').click();assert abs(p.evaluate('kyotoAudio.player.currentTime')-5)<.5;p.locator('#v-plus').click();assert abs(p.evaluate('kyotoAudio.player.currentTime')-10)<.5;p.locator('#speed').select_option('1.5');assert p.evaluate('kyotoAudio.player.playbackRate')==1.5;rows.append({'fushimi_cached_mp3':'PASS play/pause/±5seconds/speed1.5'})
  c.close();b.close();print('PASS:16provided scripts, all sentences online/offline with exact first/middle/last and Korean TTS dispatch; Fushimi cached MP3 play/pause/seek/speed; audible NOT_RUN')
finally:s.shutdown();(OUT/'narration-results.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
