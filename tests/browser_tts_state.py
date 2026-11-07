"""Controlled SpeechSynthesis callbacks test state/text, not audible device output."""
import json,re,threading
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
s=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT.parent)));threading.Thread(target=s.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{s.server_port}/aitourguide/'
SHIM="""window.__utterances=[];const synth={speaking:false,paused:false,getVoices:()=>[],addEventListener(){},cancel(){this.speaking=false},pause(){this.paused=true},resume(){this.paused=false},speak(u){this.speaking=true;__utterances.push(u);u.onstart?.({})}};Object.defineProperty(window,'speechSynthesis',{value:synth});"""
def sentences(text):return [x.strip() for x in re.findall(r'[^.!?。！？\n]+[.!?。！？]*|[\n]+|[.!?。！？]+',text) if x.strip()]
evidence=[]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  for destination,slug in [('jp-kyoto-fushimi-inari','fushimi-inari'),('jp-kyoto-kinkakuji','kinkakuji-standard')]:
   context=browser.new_context(service_workers='block');context.add_init_script(SHIM);page=context.new_page();page.goto(base);page.locator('[data-action=start]').click();page.locator('[data-action=country]').click();page.locator('[data-action=city]').click()
   card=page.locator(f'[data-destination-id="{destination}"]');expect(card.locator('.v-destination-toggle')).to_be_enabled();card.locator('.v-destination-toggle').click();card.locator('.v-guide-main').click();page.wait_for_function('document.body.classList.contains("v-map")');page.locator('#hotspots button').first.click();page.evaluate('kyotoAudio.selectDefault(selected)')
   pack=json.loads((ROOT/f'travel-packs/JP/kyoto/{slug}/pack.json').read_text());scripts=[]
   for spot in pack['spots'][:2]:
    meta=json.loads((ROOT/f'travel-packs/JP/kyoto/{slug}'/spot['meta']).read_text());scripts.append(sentences((ROOT/f'travel-packs/JP/kyoto/{slug}'/spot['dir']/meta['narration']).read_text()))
   page.locator('#toggle').click();assert page.evaluate('__utterances.at(-1).text')==scripts[0][0]
   page.evaluate('__utterances[0].onend({})');assert page.evaluate('__utterances.at(-1).text')==scripts[0][1]
   page.evaluate('window.__oldSpeech=__utterances.at(-1)');page.locator('#v-next-spot').click();page.evaluate('kyotoAudio.selectDefault(selected)');page.locator('#toggle').click()
   actual=page.evaluate('__utterances.at(-1).text');assert actual==scripts[1][0],f'{slug}: spot switch replayed previous narration'
   evidence.append({'pack':slug,'from_poi':pack['spots'][0]['poi_id'],'to_poi':pack['spots'][1]['poi_id'],'expected_first_sentence':scripts[1][0],'spoken_text':actual,'match':actual==scripts[1][0],'backend':'controlled SpeechSynthesis adapter; audible NOT_RUN'})
   before=page.evaluate('__utterances.length');status=page.locator('#status').inner_text();page.evaluate('__oldSpeech.onstart({});__oldSpeech.onend({});__oldSpeech.onerror({error:"synthesis-failed"})');assert page.evaluate('__utterances.length')==before;assert page.locator('#status').inner_text()==status
   page.evaluate('window.__currentSpeech=__utterances.at(-1);__currentSpeech.onend({});__currentSpeech.onend({})');assert page.evaluate('__utterances.length')==before+1,'Duplicate old onend skipped a sentence';assert page.evaluate('__utterances.at(-1).text')==scripts[1][1]
   expect(page.locator('#v-minus')).to_have_attribute('aria-label','이전 문장');expect(page.locator('#v-plus')).to_have_attribute('aria-label','다음 문장')
   page.evaluate('window.__failedSpeech=__utterances.at(-1);__failedSpeech.onerror({error:"synthesis-failed"})');before=page.evaluate('__utterances.length');status=page.locator('#status').inner_text();page.evaluate('__failedSpeech.onend({});__failedSpeech.onstart({})');assert page.evaluate('__utterances.length')==before and page.locator('#status').inner_text()==status;page.locator('#toggle').click();assert page.evaluate('__utterances.at(-1).text')==scripts[1][1]
   page.locator('#v-plus').click();assert page.evaluate('__utterances.at(-1).text')==scripts[1][2]
   page.locator('#v-minus').click();assert page.evaluate('__utterances.at(-1).text')==scripts[1][1]
   page.locator('#v-reset').click();assert page.evaluate('__utterances.at(-1).text')==scripts[1][0]
   page.locator('#toggle').click();assert page.evaluate('speechSynthesis.paused');page.locator('#v-prev-spot').click();page.evaluate('kyotoAudio.selectDefault(selected)');page.locator('#toggle').click();assert page.evaluate('__utterances.at(-1).text')==scripts[0][0]
   page.evaluate('document.getElementById("voice-preview").click();window.__oldPreview=__utterances.at(-1)');page.locator('#v-next-spot').click();page.evaluate('kyotoAudio.selectDefault(selected)');page.locator('#toggle').click();before=page.evaluate('__utterances.length');status=page.locator('#status').inner_text();page.evaluate('__oldPreview.onstart({});__oldPreview.onend({});__oldPreview.onerror({error:"synthesis-failed"})');assert page.evaluate('__utterances.length')==before and page.locator('#status').inner_text()==status
   context.close();print('PASS:',slug,'current-spot first sentence, stale/duplicate callback isolation, sentence ±1/reset, paused switch',flush=True)
  browser.close()
finally:
 s.shutdown();(ROOT.parent/'tts-state-evidence.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n')
