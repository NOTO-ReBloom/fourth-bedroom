#!/usr/bin/env python3
from pathlib import Path
from urllib.parse import urlparse, unquote
import json, mimetypes
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]; SITE=ROOT/'site'; OUT=ROOT/'tests'; OUT.mkdir(exist_ok=True)

def ctype(p):
    return {'.js':'text/javascript','.webmanifest':'application/manifest+json','.webp':'image/webp','.mp3':'audio/mpeg','.wav':'audio/wav'}.get(p.suffix.lower()) or mimetypes.guess_type(p.name)[0] or 'application/octet-stream'
def route_files(page,missing):
    def handler(route):
        u=urlparse(route.request.url)
        if u.netloc!='fb.local': route.abort(); return
        rel=unquote(u.path.lstrip('/')) or 'index.html'; p=(SITE/rel).resolve()
        try:p.relative_to(SITE.resolve())
        except ValueError: missing.append(rel);route.fulfill(status=403,body=b'');return
        if not p.is_file(): missing.append(rel);route.fulfill(status=404,body=b'');return
        if p.suffix.lower() in {'.mp3','.wav'}: route.fulfill(status=204,body=b'');return
        route.fulfill(status=200,body=p.read_bytes(),content_type=ctype(p))
    page.route('https://fb.local/**',handler)
def page_open(browser,viewport,mobile=False):
    ctx=browser.new_context(viewport=viewport,is_mobile=mobile,has_touch=mobile)
    p=ctx.new_page();missing=[];errors=[];route_files(p,missing)
    p.on('pageerror',lambda e:errors.append(str(e)))
    p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    html=(SITE/'index.html').read_text('utf-8').replace('<head>','<head><base href="https://fb.local/">',1)
    p.set_content(html,wait_until='domcontentloaded');p.wait_for_function('window.FB_DEBUG && window.GAME_DATA',timeout=30000)
    return ctx,p,missing,errors
def start(p):
    p.click('#new-game');p.wait_for_selector('#premonition-screen:not(.hidden)');p.click('#premonition-skip');p.wait_for_selector('#game-screen:not(.hidden)')
def reveal_interaction(p, selector, steps=12):
    for _ in range(steps):
        if p.locator(selector).count() and p.locator(selector).is_visible(): return
        p.evaluate('FB_DEBUG.completeText()'); p.wait_for_timeout(15)
        if p.locator('#dialogue-panel').is_visible(): p.click('#dialogue-panel')
        p.wait_for_timeout(30)
    p.wait_for_selector(selector)

def clean(p,missing,errors):
    dims=p.evaluate('() => ({w:innerWidth,sw:document.documentElement.scrollWidth,bw:document.body.scrollWidth})')
    assert dims['sw']<=dims['w']+1 and dims['bw']<=dims['w']+1,dims
    assert not missing,missing;assert not errors,errors
    return dims

ALL_UNLOCK=['surface_time_map','underdrawing_map','third_chair_new_nails','new_frame','marta_full_signature','marta_original_plates','andre_additions_sequence','layer_andre','joint_signatures']
DIAG={'visible':'fourth_visible.webp','raking':'fourth_raking.webp','infrared':'fourth_infrared.webp','ultraviolet':'fourth_ultraviolet.webp','xray':'fourth_xray.webp','reverse':'fourth_reverse.webp','marta1948':'fourth_marta_1948.webp','andre1967':'fourth_andre_1967.webp','stratigraphy':'fourth_stratigraphy.webp','conserved':'fourth_conserved.webp'}

def desktop(browser):
    ctx,p,missing,errors=page_open(browser,{'width':1440,'height':900});start(p)
    p.evaluate("FB_DEBUG.grantEvidence(%s)"%json.dumps(ALL_UNLOCK))
    p.evaluate("FB_DEBUG.goto('p58')");p.wait_for_timeout(80)
    reveal_interaction(p,'.spectral-panel')
    assert p.locator('#painting-image').get_attribute('src').endswith('fourth_visible.webp')
    p.click('.spectral-modes [data-mode="raking"]');p.wait_for_timeout(100)
    assert p.locator('#painting-image').get_attribute('src').endswith('fourth_raking.webp')
    p.click('.spectral-modes [data-mode="infrared"]');p.wait_for_timeout(100)
    assert p.locator('#painting-image').get_attribute('src').endswith('fourth_infrared.webp')
    p.click('.spectral-diagnostics');p.wait_for_selector('#diagnostics-dialog[open]')
    buttons=p.locator('#diagnostic-mode-list [data-diagnostic]');assert buttons.count()==10
    decoded=[]
    for mode,file in DIAG.items():
        b=p.locator(f'#diagnostic-mode-list [data-diagnostic="{mode}"]');assert b.is_enabled(),mode;b.click();p.wait_for_timeout(60)
        src=p.locator('#diagnostic-active-image').get_attribute('src');assert src.endswith(file),(mode,src)
        ok=p.evaluate("document.querySelector('#diagnostic-active-image').complete && document.querySelector('#diagnostic-active-image').naturalWidth===1280")
        assert ok,mode;decoded.append(mode)
    p.locator('#diagnostic-opacity').evaluate('(e)=>{e.value=42;e.dispatchEvent(new Event("input",{bubbles:true}))}')
    opacity=float(p.evaluate("getComputedStyle(document.querySelector('#diagnostic-active-image')).opacity"));assert 0.40<=opacity<=0.44,opacity
    p.locator('#diagnostic-zoom').evaluate('(e)=>{e.value=150;e.dispatchEvent(new Event("input",{bubbles:true}))}')
    zoom=p.evaluate("getComputedStyle(document.querySelector('#diagnostic-canvas')).getPropertyValue('--diagnostic-zoom').trim()");assert zoom=='1.5',zoom
    p.locator('#diagnostics-dialog').screenshot(path=str(OUT/'final_v216_diagnostic_desktop.png'),timeout=30000)
    p.click('#diagnostics-dialog .close-modal');p.wait_for_function("!document.querySelector('#diagnostics-dialog').open")

    p.evaluate("FB_DEBUG.grantEvidence(['pressure_drop','condensation','marc_card','third_chair','keyhole','portrait','night_window','marta_full_signature','fake_provenance_drafts','purchase_ticket','cleanup_task'])")
    p.evaluate("document.querySelector('[data-open=\"notebook\"]').click()");p.wait_for_selector('#notebook-dialog[open]')
    thumbs=p.locator('#notebook-content .evidence-thumb');thumb_count=thumbs.count();assert thumb_count>=8,thumb_count
    thumbs.first.click();p.wait_for_selector('#evidence-image-dialog[open]')
    p.wait_for_function("document.querySelector('#evidence-image-full').complete && document.querySelector('#evidence-image-full').naturalWidth>500",timeout=10000)
    p.locator('#evidence-image-dialog').screenshot(path=str(OUT/'final_v216_evidence_notebook_desktop.png'),timeout=30000)
    p.click('#evidence-image-dialog .close-modal');p.click('#notebook-dialog .close-modal')

    p.evaluate("FB_DEBUG.goto('p58')");p.wait_for_timeout(80)
    cut=p.locator('#action-cut-in .action-cut-in-icon');style=cut.get_attribute('style') or ''
    assert 'scan.webp' in style,style
    dims=clean(p,missing,errors);ctx.close()
    return {'modes':decoded,'thumbs':thumb_count,'opacity':opacity,'zoom':zoom,'dims':dims}

def mobile(browser):
    ctx,p,missing,errors=page_open(browser,{'width':390,'height':844},True);start(p)
    p.evaluate("FB_DEBUG.grantEvidence(%s)"%json.dumps(ALL_UNLOCK))
    p.keyboard.press('d');p.wait_for_selector('#diagnostics-dialog[open]')
    assert p.locator('#diagnostic-mode-list [data-diagnostic]').count()==10
    p.locator('#diagnostic-mode-list [data-diagnostic="stratigraphy"]').click();p.wait_for_timeout(80)
    assert p.locator('#diagnostic-active-image').get_attribute('src').endswith('fourth_stratigraphy.webp')
    box=p.locator('#diagnostic-canvas').bounding_box();assert box and box['width']<=390 and box['height']>220,box
    p.locator('#diagnostics-dialog').screenshot(path=str(OUT/'final_v216_diagnostic_mobile.png'))
    dims=clean(p,missing,errors);ctx.close();return {'canvas':box,'dims':dims}

if __name__=='__main__':
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
        result={'version':'2.16.0','desktop':desktop(browser),'mobile':mobile(browser),'passed':True};browser.close()
    (OUT/'diagnostic_atlas_browser_qa_v216.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),'utf-8')
    print(json.dumps(result,ensure_ascii=False,indent=2))
