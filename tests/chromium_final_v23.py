from __future__ import annotations

import base64
import json
import mimetypes
import re
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
TESTS = ROOT / "tests"
RESULT = TESTS / "browser_final_v23.json"


def data_uri(path: Path) -> str:
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    payload = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{payload}"


def inline_css_assets(css: str) -> str:
    def replace(match: re.Match[str]) -> str:
        raw = match.group(1).strip("\"'")
        if raw.startswith(("data:", "http:", "https:", "#")):
            return match.group(0)
        target = SITE / raw
        if target.exists() and target.is_file():
            return f'url("{data_uri(target)}")'
        return "none"
    return re.sub(r"url\(([^)]+)\)", replace, css)


def build_document() -> tuple[str, dict[str, str]]:
    html = (SITE / "index.html").read_text(encoding="utf-8")
    css = inline_css_assets((SITE / "styles.css").read_text(encoding="utf-8"))
    game_data = (SITE / "data/game-data.js").read_text(encoding="utf-8")
    game = (SITE / "game.js").read_text(encoding="utf-8")

    asset_map: dict[str, str] = {}
    for path in sorted((SITE / "assets" / "characters" / "expressions").rglob("*.webp")):
        asset_map[path.relative_to(SITE).as_posix()] = data_uri(path)
    for rel in ["assets/portrait-vincent.jpg", "assets/portrait-gauguin.jpg"]:
        asset_map[rel] = data_uri(SITE / rel)

    # Use real embedded character images while keeping production path selection intact.
    game = game.replace(
        'src="${portraitAsset}" alt="${label}・${expression}"',
        'src="${window.__PORTRAIT_DATA?.[portraitAsset] || portraitAsset}" alt="${label}・${expression}"',
    )
    game = game.replace("        img.src = portraitAssetFor(id, mood);", "        img.src = window.__PORTRAIT_DATA?.[portraitAssetFor(id, mood)] || portraitAssetFor(id, mood);")
    game = game.replace("            portraitImage.src = portraitAssetFor(id, 'neutral');", "            portraitImage.src = window.__PORTRAIT_DATA?.[portraitAssetFor(id, 'neutral')] || portraitAssetFor(id, 'neutral');")

    # Remove external/preload links and inline all runtime sources.
    html = re.sub(r'<link[^>]+rel="(?:icon|manifest|preload)"[^>]*>\s*', "", html)
    html = html.replace('<link rel="stylesheet" href="styles.css">', f"<style>{css}</style>")
    html = html.replace('<script src="data/game-data.js"></script>', f"<script>{game_data}</script>")
    portrait_json = json.dumps(asset_map, ensure_ascii=False).replace("</", "<\\/")
    html = html.replace('<script src="game.js"></script>', f"<script>window.__PORTRAIT_DATA={portrait_json};</script><script>{game}</script>")

    # Inline static HTML images; these are backgrounds/title images, not the dynamic portraits under test.
    def replace_img(match: re.Match[str]) -> str:
        before, src, after = match.group(1), match.group(2), match.group(3)
        target = SITE / src
        uri = data_uri(target) if target.exists() else "data:image/gif;base64,R0lGODlhAQABAAAAACw="
        return f'<img{before}src="{uri}"{after}>'
    html = re.sub(r'<img([^>]*?)src="([^"]+)"([^>]*)>', replace_img, html)
    return html, asset_map


def main() -> None:
    html, asset_map = build_document()
    checks: dict[str, object] = {}
    errors: list[str] = []
    console_errors: list[str] = []
    chars = ["sumi", "claire", "marta", "marc", "leon", "andre"]
    moods = ["neutral", "quiet", "soft", "focused", "working", "guarded", "wary", "resolved", "down", "shaken", "alarm", "tense", "breathless"]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox", "--disable-gpu"])
        page = browser.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
        page.on("pageerror", lambda e: errors.append(f"pageerror:{e}"))
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
        page.set_content(html, wait_until="load", timeout=120000)
        page.wait_for_function("!!window.FB_DEBUG && !!window.GAME_DATA")

        checks["title_v23"] = page.title().endswith("Final Candidate 2.3")
        checks["meta_v23"] = page.evaluate("GAME_DATA.meta.version === '2.3.0'")
        checks["title_version_text"] = "VERSION 2.3.0" in page.inner_text(".version")
        page.screenshot(path=str(TESTS / "final_v23_title_desktop.png"), full_page=True)

        asset_result = page.evaluate(
            """async ({chars,moods}) => {
              const keys = chars.flatMap(id => moods.map(mood => `assets/characters/expressions/${id}/${mood}.webp`));
              const results = await Promise.all(keys.map(key => new Promise(resolve => {
                const img = new Image();
                img.onload = async () => {
                  try { if (img.decode) await img.decode(); } catch (_) {}
                  resolve({key, ok: img.naturalWidth === 720 && img.naturalHeight === 960, w: img.naturalWidth, h: img.naturalHeight});
                };
                img.onerror = () => resolve({key, ok:false, w:0, h:0});
                img.src = window.__PORTRAIT_DATA[key];
              })));
              return {count:results.length, failed:results.filter(x=>!x.ok)};
            }""",
            {"chars": chars, "moods": moods},
        )
        checks["all_78_portraits_loaded"] = asset_result["count"] == 78 and not asset_result["failed"]
        checks["portrait_asset_failures"] = asset_result["failed"]
        checks["portrait_map_count"] = len([k for k in asset_map if "/expressions/" in k]) == 78

        page.click("#title-settings")
        page.eval_on_selector("#text-speed", "e=>{e.value=0;e.dispatchEvent(new Event('input',{bubbles:true}))}")
        page.click("#settings-dialog .close-modal")
        page.click("#new-game")
        page.wait_for_timeout(100)
        checks["save_version_v23"] = page.evaluate("FB_DEBUG.getState().saveVersion === '2.3.0'")

        representative = {
            "sumi": ("p04x1", "down"),
            "claire": ("p16x1", "guarded"),
            "marta": ("a410x5", "soft"),
            "marc": ("a520x1", "down"),
            "leon": ("p38x1", "down"),
            "andre": ("a510x2", "alarm"),
        }
        portrait_checks = {}
        for char_id, (node_id, expected_mood) in representative.items():
            page.evaluate("id => FB_DEBUG.goto(id)", node_id)
            page.wait_for_timeout(80)
            card = page.locator(f".portrait-{char_id}")
            img = card.locator("img")
            portrait_checks[char_id] = {
                "present": card.count() == 1,
                "mood": card.get_attribute("data-mood") if card.count() else None,
                "loaded": img.evaluate("e => e.complete && e.naturalWidth === 720 && e.naturalHeight === 960") if img.count() else False,
            }
        checks["representative_portraits"] = portrait_checks
        checks["representative_portraits_pass"] = all(
            v["present"] and v["mood"] == representative[k][1] and v["loaded"]
            for k, v in portrait_checks.items()
        )

        page.evaluate("FB_DEBUG.goto('a228x2')")
        page.wait_for_timeout(80)
        checks["historical_series"] = {
            "vincent": page.locator(".portrait-vincent.painted-portrait img").count() == 1,
            "gauguin": page.locator(".portrait-gauguin.painted-portrait img").count() == 1,
        }

        # Dialogue / thought / observation display grammar.
        page.evaluate("FB_DEBUG.goto('p16x1')")
        page.wait_for_timeout(60)
        checks["dialogue_nameplate"] = page.inner_text("#speaker-name") == "澄"
        checks["dialogue_mode"] = page.get_attribute("#dialogue-panel", "data-mode") == "dialogue"
        checks["speaker_focus"] = page.locator(".character-card.speaking").count() >= 1

        page.evaluate("FB_DEBUG.goto('p04x2')")
        page.wait_for_timeout(60)
        checks["thought_mode"] = page.get_attribute("#dialogue-panel", "data-mode") == "thought"
        checks["thought_has_no_nameplate"] = not page.locator("#speaker-name").is_visible()
        checks["no_inner_label"] = "内心" not in page.inner_text("#dialogue-panel")

        page.evaluate("FB_DEBUG.goto('p01')")
        page.wait_for_timeout(60)
        checks["observation_narration_mode"] = page.get_attribute("#dialogue-panel", "data-mode") == "narration"
        checks["observation_has_no_nameplate"] = not page.locator("#speaker-name").is_visible()

        page.evaluate("FB_DEBUG.goto('p16x1')")
        page.wait_for_timeout(80)
        desktop_geometry = page.evaluate(
            """() => {
              const card=document.querySelector('.portrait-sumi');
              const panel=document.querySelector('#dialogue-panel');
              if(!card||!panel) return null;
              const c=card.getBoundingClientRect(), p=panel.getBoundingClientRect();
              return {faceBottom:c.top+c.height*.42, panelTop:p.top, overflow:document.documentElement.scrollWidth-innerWidth};
            }"""
        )
        checks["desktop_face_clear"] = bool(desktop_geometry and desktop_geometry["faceBottom"] < desktop_geometry["panelTop"] + 4)
        checks["desktop_no_overflow"] = bool(desktop_geometry and desktop_geometry["overflow"] <= 0)
        page.screenshot(path=str(TESTS / "final_v23_sumi_desktop.png"), full_page=True)

        page.set_viewport_size({"width": 390, "height": 844})
        page.evaluate("FB_DEBUG.goto('p16x1')")
        page.wait_for_timeout(100)
        mobile_geometry = page.evaluate(
            """() => {
              const cards=[...document.querySelectorAll('.character-card')].map(el=>{const r=el.getBoundingClientRect();return {top:r.top,h:r.height}});
              const panel=document.querySelector('#dialogue-panel').getBoundingClientRect();
              return {cards,panelTop:panel.top,scrollWidth:document.documentElement.scrollWidth,innerWidth};
            }"""
        )
        checks["mobile_no_overflow"] = mobile_geometry["scrollWidth"] <= mobile_geometry["innerWidth"]
        checks["mobile_two_portraits"] = len(mobile_geometry["cards"]) == 2
        checks["mobile_faces_clear"] = all(c["top"] + c["h"] * .42 < mobile_geometry["panelTop"] + 6 for c in mobile_geometry["cards"])
        page.screenshot(path=str(TESTS / "final_v23_dialogue_mobile.png"), full_page=True)

        page.set_viewport_size({"width": 1440, "height": 900})
        route_result = page.evaluate("""() => {
          const nodeMap = new Map(GAME_DATA.nodes.map(n => [n.id, n]));
          const baseChoices = {
            p06:0,p13:1,p18:1,p39:0,p48:0,p56:0,p65:0,p71:0,r03:0,r11:1,r14:0,r21:2,
            v07:0,v12:2,v17:0,a203:0,a206:0,a231:3,a243:2,a249:1,a263:1,a270:1,
            a304:1,a305b:1,a310:1,a314:1,a317:1,a407:2,a409c:1,a414:2,a418:1,
            a506:2,a512:1,a521:1,a602:0,a607:1,a615:1,a618:1
          };
          const expected = ['endBad1','endBad2','endBad3','endNormal','a631'];
          const routes=[];
          for(let finalChoice=0; finalChoice<5; finalChoice++){
            const choices={...baseChoices,a622:finalChoice};
            let current='p01'; const deaths=[]; let end=null;
            for(let step=0; step<2000; step++){
              const n=nodeMap.get(current); if(!n){end='MISSING:'+current;break;}
              if(n.type==='ending'||n.type==='earlyEnding'){end=current;break;}
              if(n.type==='deathSequence'){deaths.push(n.death);current=GAME_DATA.gameovers[n.death].returnTo;continue;}
              if(n.type==='choice'){current=n.choices[choices[n.id]??0].next;continue;}
              current=n.next;
            }
            routes.push({finalChoice,end,deaths,ok:end===expected[finalChoice]&&JSON.stringify(deaths)===JSON.stringify(['GO01','GO04','GO26'])});
          }
          return routes;
        }""")
        checks["five_routes"] = route_result
        checks["five_routes_pass"] = len(route_result) == 5 and all(r["ok"] for r in route_result)

        worker = (SITE / "service-worker.js").read_text(encoding="utf-8")
        checks["service_worker_v23_cache"] = "fourth-bedroom-v2.3.0" in worker and "./index.html" in worker
        checks["runtime_contact_sheet_refs"] = page.evaluate("() => [...document.images].some(i => /contact_sheet|character_v23_.*_qa/i.test(i.src))")
        browser.close()

    checks["page_errors"] = errors
    checks["console_errors"] = console_errors
    required_boolean_keys = [
        "title_v23", "meta_v23", "title_version_text", "save_version_v23", "all_78_portraits_loaded", "portrait_map_count",
        "representative_portraits_pass", "dialogue_nameplate", "dialogue_mode", "speaker_focus", "thought_mode",
        "thought_has_no_nameplate", "no_inner_label", "observation_narration_mode", "observation_has_no_nameplate",
        "desktop_face_clear", "desktop_no_overflow", "mobile_no_overflow", "mobile_two_portraits", "mobile_faces_clear",
        "five_routes_pass", "service_worker_v23_cache",
    ]
    checks["pass"] = all(checks.get(k) is True for k in required_boolean_keys) and not errors and not console_errors and not checks["runtime_contact_sheet_refs"] and all(checks["historical_series"].values())

    RESULT.write_text(json.dumps(checks, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(checks, ensure_ascii=False, indent=2))
    if not checks["pass"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
