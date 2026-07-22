from pathlib import Path
import json,re
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
TESTS=ROOT/'tests'; TESTS.mkdir(exist_ok=True)
checks={}; errors=[]
html=(ROOT/'site/index.html').read_text()
css=(ROOT/'site/styles.css').read_text()
data=(ROOT/'site/data/game-data.js').read_text()
game=(ROOT/'site/game.js').read_text()
css=re.sub(r'url\([^)]*\)','none',css)
html=re.sub(r'<link[^>]+(?:rel="icon"|rel="manifest"|rel="preload")[^>]*>','',html)
html=re.sub(r'<img([^>]+)src="[^"]+"',r'<img\1src="data:image/gif;base64,R0lGODlhAQABAAAAACw="',html)
html=html.replace('<link rel="stylesheet" href="styles.css">',f'<style>{css}</style><script>(()=>{{const s=new Map();Object.defineProperty(window,\"localStorage\",{{configurable:true,value:{{getItem:k=>s.has(k)?s.get(k):null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),clear:()=>s.clear(),key:i=>[...s.keys()][i]||null,get length(){{return s.size}}}}}});}})();</script>')
html=html.replace('<script src="data/game-data.js"></script>',f'<script>{data}</script>')
html=html.replace('<script src="game.js"></script>',f'<script>{game}</script>')
try:
  with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-gpu'])
    page=browser.new_page(viewport={'width':1440,'height':900})
    page.on('pageerror', lambda e: errors.append(f'pageerror:{e}'))
    page.on('console', lambda m: errors.append(f'console:{m.text}') if m.type=='error' else None)
    page.set_content(html, wait_until='load')
    page.wait_for_function("!!window.FB_DEBUG && !!window.GAME_DATA")
    checks['title_v22']=page.title().endswith('Final Candidate 2.2')
    checks['meta_v22']=page.evaluate("GAME_DATA.meta.version==='2.2.0'")
    checks['service_worker_file']=(ROOT/'site/service-worker.js').exists()
    page.screenshot(path=str(TESTS/'final_v22_title.png'), full_page=True)

    page.click('#title-settings')
    page.eval_on_selector('#text-speed', "e=>{e.value=0;e.dispatchEvent(new Event('input',{bubbles:true}))}")
    page.eval_on_selector('#music-volume', "e=>{e.value=17;e.dispatchEvent(new Event('input',{bubbles:true}))}")
    page.click('#settings-dialog .close-modal')
    page.click('#new-game')
    page.wait_for_timeout(150)
    checks['music_setting']=page.evaluate("FB_DEBUG.getState().settings.musicVolume===17")
    checks['save_indicator_exists']=page.locator('#save-indicator').count()==1
    checks['narration_mode']=page.get_attribute('#dialogue-panel','data-mode')=='narration'

    page.evaluate("FB_DEBUG.goto('a406')")
    page.wait_for_timeout(30)
    page.evaluate("FB_DEBUG.goto('a503')")
    page.wait_for_timeout(90)
    checks['cinematic_transition']=page.locator('#cinematic-transition.active').count()==1
    checks['camera_mode']=page.get_attribute('#scene','data-camera') in ['normal','close','wide','detail','uneasy']
    page.screenshot(path=str(TESTS/'final_v22_transition.png'), full_page=True)

    page.evaluate("FB_DEBUG.goto('p16x1')")
    page.wait_for_timeout(80)
    checks['dialogue_nameplate']=page.inner_text('#speaker-name')=='澄'
    checks['portrait_line_staging']=page.locator('.character-card.speaking.line-enter').count()>=1
    page.evaluate("document.querySelector('#menu-button').click()")
    page.wait_for_timeout(20)
    page.evaluate("document.querySelector('#manual-save').click()")
    page.wait_for_timeout(100)
    checks['manual_save_feedback']=page.locator('#save-indicator.visible').count()==1
    page.keyboard.press('Escape')

    page.evaluate("FB_DEBUG.goto('p06')")
    for _ in range(12):
      page.evaluate("FB_DEBUG.completeText()")
      if page.locator('#choice-panel:not(.hidden)').count(): break
      page.click('#dialogue-panel')
      page.wait_for_timeout(20)
    checks['choice_panel']=page.locator('#choice-panel:not(.hidden)').count()==1
    checks['choice_stagger']=page.locator('#choice-panel.choice-enter button[style*="--choice-index"]').count()>=2

    page.keyboard.press('ArrowUp')
    page.wait_for_timeout(40)
    checks['previous_line_peek']=page.locator('#toast:not(.hidden)').count()==1

    page.set_viewport_size({'width':390,'height':844})
    page.evaluate("FB_DEBUG.goto('p16x1')")
    page.wait_for_timeout(80)
    checks['mobile_no_overflow']=page.evaluate("document.documentElement.scrollWidth<=390")
    checks['mobile_save_indicator']=page.locator('#save-indicator').count()==1
    page.screenshot(path=str(TESTS/'final_v22_mobile.png'), full_page=True)
    browser.close()
except Exception as e:
  errors.append(f'test:{e}')
checks['no_console_or_page_errors']=len(errors)==0
out={'checks':checks,'passed':all(checks.values()),'errors':errors}
(TESTS/'browser_final_v22.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
print(json.dumps(out,ensure_ascii=False,indent=2))
if not out['passed']: raise SystemExit(1)
