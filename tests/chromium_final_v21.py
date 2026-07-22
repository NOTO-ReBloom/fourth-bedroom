import base64, json, shutil, subprocess, time, re
from pathlib import Path
import urllib.request, websocket

ROOT=Path(__file__).resolve().parents[1]
TESTS=ROOT/'tests'; TESTS.mkdir(exist_ok=True)
profile=Path('/tmp/fb-v21-cdp'); shutil.rmtree(profile,ignore_errors=True)
chrome=subprocess.Popen(['chromium','--headless=new','--no-sandbox','--disable-gpu','--remote-debugging-port=9371','--remote-allow-origins=*',f'--user-data-dir={profile}','about:blank'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)

def wait_json(url):
    last=None
    for _ in range(120):
        try:
            v=json.loads(urllib.request.urlopen(url,timeout=1).read())
            if v:return v
        except Exception as e:last=e;time.sleep(.1)
    raise RuntimeError(last)

try:
    pages=wait_json('http://127.0.0.1:9371/json/list')
    page=next((x for x in pages if x.get('type')=='page'),pages[0])
    ws=websocket.create_connection(page['webSocketDebuggerUrl'],timeout=60,origin='http://127.0.0.1:9371')
    seq=0; events=[]
    def call(method,params=None):
        nonlocal_seq=None
        global seq
        seq+=1; ident=seq
        ws.send(json.dumps({'id':ident,'method':method,'params':params or {}}))
        while True:
            msg=json.loads(ws.recv())
            if msg.get('id')==ident:
                if 'error' in msg: raise RuntimeError(msg['error'])
                return msg.get('result',{})
            events.append(msg)
    def ev(expr):
        r=call('Runtime.evaluate',{'expression':expr,'returnByValue':True,'awaitPromise':True,'timeout':30000})
        if 'exceptionDetails' in r: raise RuntimeError(r['exceptionDetails'])
        return r.get('result',{}).get('value')
    def shot(name):
        r=call('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False})
        (TESTS/name).write_bytes(base64.b64decode(r['data']))

    call('Page.enable'); call('Runtime.enable'); call('Log.enable')
    html=(ROOT/'site/index.html').read_text(); css=(ROOT/'site/styles.css').read_text(); data=(ROOT/'site/data/game-data.js').read_text(); game=(ROOT/'site/game.js').read_text()
    css=re.sub(r'url\([^)]*\)','none',css)
    html=re.sub(r'<link[^>]+(?:rel="icon"|rel="manifest")[^>]*>','',html)
    html=html.replace('<link rel="stylesheet" href="styles.css">',f'<style>{css}</style>')
    html=html.replace('<script src="data/game-data.js"></script>',f'<script>{data}</script>')
    html=html.replace('<script src="game.js"></script>',f'<script>{game}</script>')
    frame=call('Page.getFrameTree')['frameTree']['frame']['id']
    call('Page.setDocumentContent',{'frameId':frame,'html':html})
    for _ in range(160):
        if ev("document.readyState==='complete' && !!window.FB_DEBUG && !!window.GAME_DATA"):break
        time.sleep(.1)
    checks={}
    checks['title_v21']=ev("document.title.includes('2.1')")
    checks['meta_v21']=ev("GAME_DATA.meta.version==='2.1.0'")
    checks['new_modes']=ev("GAME_DATA.nodes.some(n=>(n.script||[]).some(s=>s.mode==='thought')) && GAME_DATA.nodes.some(n=>(n.script||[]).some(s=>s.mode==='narration'))")
    checks['no_inner_mode']=ev("!GAME_DATA.nodes.some(n=>(n.script||[]).some(s=>s.mode==='inner'))")
    checks['legacy_namespace']=ev("FB_DEBUG.saveKeys().slot1.includes('production-v21-slot1')")

    ev("document.querySelector('#title-settings').click();document.querySelector('#text-speed').value=0;document.querySelector('#text-speed').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#reduce-motion').checked=true;document.querySelector('#reduce-motion').dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#settings-dialog .close-modal').click();document.querySelector('#new-game').click()")
    time.sleep(.15)

    # p01 first is narration
    checks['narration_mode']=ev("document.querySelector('#dialogue-panel').dataset.mode==='narration'")
    checks['narration_no_name']=ev("document.querySelector('#speaker-name').innerText==='' && getComputedStyle(document.querySelector('#dialogue-panel .speaker-row')).display==='none'")
    checks['no_visible_pov_label']=ev("!document.body.innerText.includes('POV') && !document.querySelector('#emotion-label').innerText")
    shot('final_v21_narration_desktop.png')

    # second p01 segment is thought
    ev("FB_DEBUG.completeText();document.querySelector('#dialogue-panel').click()")
    time.sleep(.08)
    checks['thought_mode']=ev("document.querySelector('#dialogue-panel').dataset.mode==='thought'")
    checks['thought_no_name']=ev("document.querySelector('#speaker-name').innerText==='' && getComputedStyle(document.querySelector('#dialogue-panel .speaker-row')).display==='none'")
    checks['thought_accessible_label']=ev("document.querySelector('#dialogue-panel').getAttribute('aria-label')==='澄の心の声'")
    shot('final_v21_thought_desktop.png')

    # dialogue has nameplate and no exposed emotion direction
    ev("FB_DEBUG.goto('p16x1')")
    time.sleep(.08)
    checks['dialogue_mode']=ev("document.querySelector('#dialogue-panel').dataset.mode==='dialogue'")
    checks['dialogue_nameplate']=ev("document.querySelector('#speaker-name').innerText==='澄' && getComputedStyle(document.querySelector('#dialogue-panel .speaker-row')).display!=='none'")
    checks['emotion_hidden']=ev("getComputedStyle(document.querySelector('#emotion-label')).display==='none'")
    checks['polished_line']=ev("document.querySelector('#dialogue-text').innerText==='お待たせしました'")
    shot('final_v21_dialogue_desktop.png')

    # Claire split line at p23 should be two separate dialogue beats after narration.
    ev("FB_DEBUG.goto('p23')")
    for _ in range(2):
        ev("FB_DEBUG.completeText();document.querySelector('#dialogue-panel').click()")
        time.sleep(.04)
    checks['p23_first_claire_beat']=ev("document.querySelector('#speaker-name').innerText==='クレール' && document.querySelector('#dialogue-text').innerText==='仮称。Bedroom Four'")
    ev("FB_DEBUG.completeText();document.querySelector('#dialogue-panel').click()")
    time.sleep(.04)
    checks['p23_second_claire_beat']=ev("document.querySelector('#dialogue-text').innerText.includes('正式な名前はまだない')")

    call('Emulation.setDeviceMetricsOverride',{'width':390,'height':844,'deviceScaleFactor':1,'mobile':True})
    ev("FB_DEBUG.goto('p01')"); time.sleep(.08)
    checks['mobile_no_overflow']=ev("document.documentElement.scrollWidth<=390")
    checks['mobile_narration_mode']=ev("document.querySelector('#dialogue-panel').dataset.mode==='narration'")
    shot('final_v21_narration_mobile.png')

    exceptions=[e for e in events if e.get('method')=='Runtime.exceptionThrown']
    logs=[e for e in events if e.get('method')=='Log.entryAdded' and e.get('params',{}).get('entry',{}).get('level')=='error']
    checks['no_runtime_exceptions']=not exceptions
    checks['no_console_errors']=not logs
    out={'checks':checks,'passed':all(checks.values()),'exceptions':len(exceptions),'consoleErrors':len(logs)}
    (TESTS/'browser_final_v21.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
    print(json.dumps(out,ensure_ascii=False,indent=2))
    if not out['passed']: raise SystemExit(1)
finally:
    try: ws.close()
    except Exception: pass
    chrome.terminate(); chrome.wait(timeout=10)
