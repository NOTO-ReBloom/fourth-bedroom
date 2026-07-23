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
def open_page(browser,viewport,mobile=False):
    ctx=browser.new_context(viewport=viewport,is_mobile=mobile,has_touch=mobile)
    p=ctx.new_page();missing=[];errors=[];route_files(p,missing)
    p.on('pageerror',lambda e:errors.append(str(e)))
    p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    html=(SITE/'index.html').read_text('utf-8').replace('<head>','<head><base href="https://fb.local/">',1)
    p.set_content(html,wait_until='domcontentloaded');p.wait_for_function('window.FB_DEBUG && window.GAME_DATA',timeout=30000)
    return ctx,p,missing,errors
def start(p):
    p.click('#new-game');p.wait_for_selector('#premonition-screen:not(.hidden)');p.click('#premonition-skip');p.wait_for_selector('#game-screen:not(.hidden)')
def clean(p,missing,errors):
    dims=p.evaluate('() => ({w:innerWidth,sw:document.documentElement.scrollWidth,bw:document.body.scrollWidth})')
    assert dims['sw']<=dims['w']+1 and dims['bw']<=dims['w']+1,dims
    assert not missing,missing;assert not errors,errors
    return dims

def desktop(browser):
    print("desktop start", flush=True)
    ctx,p,missing,errors=open_page(browser,{'width':1440,'height':900});start(p)
    sem={}
    print('semantic start', flush=True)
    for node,expected in [('p01','burden'),('p36','leak'),('v01x1','painted'),('a401','provenance'),('a623','dawn')]:
        p.evaluate(f"FB_DEBUG.goto('{node}')");p.wait_for_timeout(120)
        got=p.locator('#scene').get_attribute('data-semantic') or ''
        assert got==expected,(node,got,expected)
        style=p.locator('#semantic-layer').evaluate('(e)=>getComputedStyle(e).backgroundImage')
        assert expected in style,(node,style)
        sem[node]=got
    print('semantic done', flush=True)
    # Chapter art: jump into ACT4 then use debug chapter briefing and directly show card through a transition to ACT5
    p.evaluate("FB_DEBUG.goto('a401', true)");p.wait_for_timeout(150)
    # chapter card may be transient; call show cards via transition from prior chapter
    p.evaluate("FB_DEBUG.goto('a501', true)");p.wait_for_timeout(150)
    card=p.locator('#chapter-card')
    art=card.evaluate('(e)=>getComputedStyle(e).getPropertyValue("--chapter-art")')
    assert 'act5.webp' in art,art
    print('chapter done', flush=True)
    p.evaluate("document.querySelector('#chapter-briefing-dialog')?.close()")
    # Force archive unlocks and inspect thumbnails
    for kind in ['bad1','bad2','bad3','normal','true']:
        p.evaluate(f"FB_DEBUG.showEnding('{kind}')");p.wait_for_timeout(40)
        src=p.locator('#ending-image').get_attribute('src')
        assert src.endswith(f'{kind}.webp'),(kind,src)
        p.evaluate("document.querySelector('#ending-screen').classList.add('hidden');document.querySelector('#game-screen').classList.remove('hidden')")
    p.evaluate("FB_DEBUG.renderEndingArchive();document.querySelector('#archive-dialog').showModal()")
    p.wait_for_selector('#archive-dialog[open]')
    thumbs=p.locator('#archive-content img.archive-thumb'); assert thumbs.count()==5,thumbs.count()
    for i in range(thumbs.count()):
        ok=thumbs.nth(i).evaluate('(e)=>e.complete && e.naturalWidth===960 && e.naturalHeight===540')
        assert ok,i
    print('archive ready', flush=True)
    p.evaluate("document.querySelector('#archive-dialog')?.close();document.querySelector('#chapter-briefing-dialog')?.close()")
    p.evaluate("FB_DEBUG.goto('a401', true)");p.wait_for_timeout(100)
    print('desktop clean', flush=True)
    dims=clean(p,missing,errors);ctx.close()
    return {'semantic':sem,'archive_thumbs':5,'chapter_art':art,'dims':dims}

def mobile(browser):
    print("mobile start", flush=True)
    ctx,p,missing,errors=open_page(browser,{'width':390,'height':844},True);start(p)
    p.evaluate("FB_DEBUG.goto('v01x1')");p.wait_for_timeout(100)
    assert p.locator('#scene').get_attribute('data-semantic')=='painted'
    p.evaluate("FB_DEBUG.showEnding('true')");p.wait_for_timeout(100)
    box=p.locator('#ending-image').bounding_box();assert box and box['width']<=390 and box['height']>800 and box['height']<900,box
    dims=clean(p,missing,errors);ctx.close();return {'ending_box':box,'dims':dims}

if __name__=='__main__':
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
        result={'version':'2.16.0','desktop':desktop(browser),'mobile':mobile(browser),'passed':True};browser.close()
    (OUT/'visual_continuity_browser_qa_v216.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),'utf-8')
    print(json.dumps(result,ensure_ascii=False,indent=2))
