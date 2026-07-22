import base64, json, shutil, subprocess, time, urllib.request
from pathlib import Path
import websocket

ROOT = Path(__file__).resolve().parents[1]
TESTS = ROOT / 'tests'
TESTS.mkdir(exist_ok=True)
profile = Path('/tmp/fb-v20-cdp')
shutil.rmtree(profile, ignore_errors=True)
server = None
chrome = subprocess.Popen(
    [
        'chromium', '--headless=new', '--no-sandbox', '--disable-gpu',
        '--remote-debugging-port=9360', '--remote-allow-origins=*',
        f'--user-data-dir={profile}', 'about:blank'
    ],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)


def wait_http(url, attempts=100):
    last = None
    for _ in range(attempts):
        try:
            with urllib.request.urlopen(url, timeout=1) as response:
                if response.status == 200:
                    return True
        except Exception as exc:
            last = exc
            time.sleep(.1)
    raise RuntimeError(last)


def wait_json(url, attempts=100):
    last = None
    for _ in range(attempts):
        try:
            value = json.loads(urllib.request.urlopen(url, timeout=1).read())
            if value:
                return value
        except Exception as exc:
            last = exc
            time.sleep(.1)
    raise RuntimeError(last)


try:
    pages = wait_json('http://127.0.0.1:9360/json/list')
    page = next((item for item in pages if item.get('type') == 'page'), pages[0])
    ws = websocket.create_connection(
        page['webSocketDebuggerUrl'], timeout=60, origin='http://127.0.0.1:9360'
    )
    seq = 0
    events = []

    def call(method, params=None):
        global seq
        seq += 1
        ident = seq
        ws.send(json.dumps({'id': ident, 'method': method, 'params': params or {}}))
        while True:
            message = json.loads(ws.recv())
            if message.get('id') == ident:
                if 'error' in message:
                    raise RuntimeError(message['error'])
                return message.get('result', {})
            events.append(message)

    def ev(expr):
        result = call('Runtime.evaluate', {
            'expression': expr,
            'returnByValue': True,
            'awaitPromise': True,
            'timeout': 30000,
        })
        if 'exceptionDetails' in result:
            raise RuntimeError(result['exceptionDetails'])
        return result.get('result', {}).get('value')

    def shot(name):
        result = call('Page.captureScreenshot', {
            'format': 'png', 'captureBeyondViewport': False
        })
        (TESTS / name).write_bytes(base64.b64decode(result['data']))

    call('Page.enable')
    call('Runtime.enable')
    call('Log.enable')

    # The execution environment blocks browser navigation to localhost and file URLs.
    # Inject the exact shipped HTML/CSS/JS into about:blank instead.
    html = (ROOT / 'site' / 'index.html').read_text(encoding='utf-8')
    css = (ROOT / 'site' / 'styles.css').read_text(encoding='utf-8')
    data_js = (ROOT / 'site' / 'data' / 'game-data.js').read_text(encoding='utf-8')
    game_js = (ROOT / 'site' / 'game.js').read_text(encoding='utf-8')
    # Network art assets are irrelevant to this functional pass and are unavailable
    # under administrator navigation restrictions.
    import re
    css = re.sub(r'url\([^)]*\)', 'none', css)
    html = re.sub(r'<link[^>]+(?:rel="icon"|rel="manifest")[^>]*>', '', html)
    html = html.replace('<link rel="stylesheet" href="styles.css">', f'<style>{css}</style>')
    html = html.replace('<script src="data/game-data.js"></script>', f'<script>{data_js}</script>')
    html = html.replace('<script src="game.js"></script>', f'<script>{game_js}</script>')
    frame_tree = call('Page.getFrameTree')
    frame_id = frame_tree['frameTree']['frame']['id']
    call('Page.setDocumentContent', {'frameId': frame_id, 'html': html})

    ready = False
    for _ in range(160):
        try:
            ready = bool(ev(
                "document.readyState==='complete' && !!window.FB_DEBUG && !!window.GAME_DATA"
            ))
        except Exception:
            ready = False
        if ready:
            break
        time.sleep(.1)
    if not ready:
        raise RuntimeError('Game page did not initialize in Chromium')

    checks = {}
    checks['title_v20'] = ev("document.title.includes('Final Candidate 2.0')")
    checks['data_v20'] = ev(
        "window.GAME_DATA.meta.version==='2.0.0' && window.GAME_DATA.nodes.length===700"
    )
    checks['save_namespace'] = ev(
        "FB_DEBUG.saveKeys().slot1.includes('production-v20-slot1')"
    )
    checks['gauguin_normalized'] = ev(
        "!window.GAME_DATA.nodes.some(n=>(n.script||[]).some(s=>s.speaker==='ポール・ゴーギャン'))"
    )
    checks['no_empty_segments'] = ev(
        "!window.GAME_DATA.nodes.some(n=>(n.script||[]).some(s=>!(s.text||'').trim()))"
    )

    # Verify corrected ownership and order directly in the shipped data.
    data_cases = {
        'p09x1': [
            ('澄', 'スマートフォンに、通知が二つ並んでいる。'),
            ('母からのメッセージ', '着いたら一言だけ。'),
            ('弟からのメッセージ', 'ゴッホに会ったらサインをもらって。'),
        ],
        'r11bad': [
            ('澄', '「このままでは事故が起きる」と言おうとする。'),
            ('澄', 'このままでは、停止基準を確認する必要があります'),
            ('クレール', '今、言い直した？'),
        ],
        'a222x2': [
            ('澄', '私を信じるんですか'),
            ('フィンセント', '言葉はまだだ。壁の方を信じている'),
        ],
        'a303': [
            ('澄', '水瀬澄です'),
            ('フィンセント', '聞いたことがない'),
        ],
        'a404x2': [
            ('澄', '「この部屋へ前にも来た」と言おうとする。'),
            ('澄', '資料で見ました'),
        ],
        'a520x1': [
            ('マルク', '報告を変えろとは言いません'),
            ('マルク', '午前六時半まで、外部サーバへの確定送信を待ってほしい。契約が成立すれば、研究所は一年持ちます'),
        ],
        'a608x1': [
            ('クレール', 'あなた、これから起きることを知っている？'),
            ('澄', '温度上昇の予測があります'),
        ],
        'a625': [
            ('マルク', '辞任の意向は、今朝中に伝えます'),
            ('クレール', 'それで終わらせないでください。まず全部出してください'),
        ],
    }
    for node_id, expected in data_cases.items():
        expression = f"""
        (() => {{
          const n = window.GAME_DATA.nodes.find(x => x.id === {json.dumps(node_id)});
          const pairs = (n.script || []).map(s => [s.speaker || '', s.text || '']);
          const expected = {json.dumps(expected, ensure_ascii=False)};
          return expected.every(([speaker,text]) => pairs.some(([s,t]) => s===speaker && t===text));
        }})()
        """
        checks[f'{node_id}_data'] = ev(expression)

    # Use instant text and reduced motion for deterministic UI checks.
    ev("""
      (() => {
        document.querySelector('#title-settings').click();
        const speed = document.querySelector('#text-speed');
        speed.value = 0;
        speed.dispatchEvent(new Event('input',{bubbles:true}));
        const motion = document.querySelector('#reduce-motion');
        motion.checked = true;
        motion.dispatchEvent(new Event('change',{bubbles:true}));
        document.querySelector('#settings-dialog .close-modal').click();
        document.querySelector('#new-game').click();
      })()
    """)
    time.sleep(.2)

    # First segment renders as Sumi, then Vincent; delivery metadata must follow.
    ev("FB_DEBUG.goto('a303')")
    time.sleep(.08)
    checks['a303_first_sumi'] = ev(
        "document.querySelector('#speaker-name').innerText==='澄' && "
        "document.querySelector('#dialogue-text').innerText==='水瀬澄です'"
    )
    checks['a303_controlled'] = ev(
        "document.querySelector('#dialogue-panel').dataset.delivery==='controlled'"
    )
    ev("FB_DEBUG.completeText();document.querySelector('#dialogue-panel').click()")
    time.sleep(.08)
    checks['a303_second_vincent'] = ev(
        "document.querySelector('#speaker-name').innerText==='フィンセント' && "
        "document.querySelector('#dialogue-text').innerText==='聞いたことがない'"
    )
    checks['a303_measured'] = ev(
        "document.querySelector('#dialogue-panel').dataset.delivery==='measured'"
    )

    # The corrected-output line appears only after the three preceding segments.
    ev("FB_DEBUG.goto('a608x1')")
    for _ in range(3):
        ev("FB_DEBUG.completeText();document.querySelector('#dialogue-panel').click()")
        time.sleep(.04)
    checks['a608_sumi_corrected_output'] = ev(
        "document.querySelector('#speaker-name').innerText==='澄' && "
        "document.querySelector('#dialogue-text').innerText==='温度上昇の予測があります' && "
        "document.querySelector('#dialogue-panel').dataset.delivery==='constrained'"
    )

    # A multi-segment choice node must not expose choices before its last segment.
    ev("FB_DEBUG.goto('a203')")
    time.sleep(.05)
    checks['choice_hidden_before_final_segment'] = ev(
        "document.querySelector('#choice-panel').classList.contains('hidden')"
    )
    ev("FB_DEBUG.completeText();document.querySelector('#dialogue-panel').click()")
    time.sleep(.05)
    checks['choice_after_final_segment'] = ev(
        "!document.querySelector('#choice-panel').classList.contains('hidden') && "
        "document.querySelector('#dialogue-text').innerText.includes('画面の中へ入った')"
    )

    # Mobile layout and screenshot.
    call('Emulation.setDeviceMetricsOverride', {
        'width': 390, 'height': 844, 'deviceScaleFactor': 1, 'mobile': True
    })
    ev("FB_DEBUG.goto('a303')")
    time.sleep(.1)
    checks['mobile_no_overflow'] = ev(
        "document.documentElement.scrollWidth<=390"
    )
    shot('final_v20_functional_mobile.png')

    exceptions = [e for e in events if e.get('method') == 'Runtime.exceptionThrown']
    logs = [
        e for e in events
        if e.get('method') == 'Log.entryAdded'
        and e.get('params', {}).get('entry', {}).get('level') == 'error'
    ]
    report = {
        'passed': all(checks.values()) and not exceptions and not logs,
        'method': 'Chromium CDP Final Candidate 2.0 functional validation (navigation blocked by administrator policy)',
        'checks': checks,
        'exceptions': exceptions,
        'console_errors': logs,
        'screenshot': 'final_v20_functional_mobile.png',
    }
    (TESTS / 'browser_final_v20_functional.json').write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8'
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    ws.close()
finally:
    chrome.terminate()
    if server:
        server.terminate()
    try:
        chrome.wait(timeout=3)
    except subprocess.TimeoutExpired:
        chrome.kill()
    if server:
        try:
            server.wait(timeout=3)
        except subprocess.TimeoutExpired:
            server.kill()
