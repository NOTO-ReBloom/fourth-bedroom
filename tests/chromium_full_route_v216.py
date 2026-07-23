from __future__ import annotations

import json
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

from chromium_release_v27 import build_bundle, install_storage, attach_error_capture

ROOT = Path(__file__).resolve().parents[1]
RESULT = ROOT / 'tests' / 'browser_full_route_v216.json'

ROUTE_DRIVER = r"""
async ({choices, insightAnswers}) => {
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const sortIds = new Set(['a508','a614','a621']);
  const dragIds = new Set(['a233','a271','a526']);
  const results = {visited:[], advances:0, choices:0, puzzles:0, investigations:0, insights:0, deaths:[], loopPlans:[], consequence:[], chapterBriefings:0};
  let previous = null; let previousMarker = null; let repeated = 0;
  const puzzleMap = id => {
    const n = GAME_DATA.nodes.find(x => x.id === id);
    const fields = n?.puzzle?.fields || [{key:'chair',correct:'line'},{key:'door',correct:'closed'},{key:'bed',correct:'oneboard'}];
    return Object.fromEntries(fields.map(f => [f.key,f.correct]));
  };
  const click = selector => { const el=document.querySelector(selector); if(!el) throw new Error(`missing ${selector}`); el.click(); };

  document.querySelector('#text-speed').value = 0;
  document.querySelector('#text-speed').dispatchEvent(new Event('input',{bubbles:true}));
  document.querySelector('#reduce-motion').checked = true;
  document.querySelector('#reduce-motion').dispatchEvent(new Event('change',{bubbles:true}));
  document.querySelector('#ambient-enabled').checked = false;
  document.querySelector('#ambient-enabled').dispatchEvent(new Event('change',{bubbles:true}));
  for (const id of ['#ambient-volume','#music-volume','#sfx-volume']) { const control=document.querySelector(id); control.value=0; control.dispatchEvent(new Event('input',{bubbles:true})); }
  click('#new-game'); await sleep(2); if(!document.querySelector('#premonition-screen').classList.contains('hidden')) click('#premonition-skip'); await sleep(3);

  for (let step=0; step<9000; step++) {
    const current = FB_DEBUG.getNode(); if (!current) throw new Error(`no active node at ${step}`);
    const id=current.id; const marker=`${id}:${FB_DEBUG.getState().segmentIndex}`;
    if(marker===previousMarker) repeated++; else {repeated=0;previousMarker=marker;}
    if(repeated>1000) throw new Error(`stalled at ${marker}, type=${current.type}`);
    if(id!==previous){results.visited.push(id);previous=id;if(results.visited.length%75===0)console.log(`route ${results.visited.length} ${id}`);}
    FB_DEBUG.completeText();

    const chapterBriefing=document.querySelector('#chapter-briefing-dialog[open]');
    if(chapterBriefing){click('#chapter-briefing-continue');results.chapterBriefings++;await sleep(3);continue;}

    const ending=document.querySelector('#ending-screen:not(.hidden)');
    if(ending){results.ending=id;results.endingVisible=true;results.state=FB_DEBUG.getState();results.profile=FB_DEBUG.profile();return results;}

    const gameover=document.querySelector('#gameover-screen:not(.hidden)');
    if(gameover){
      const go=FB_DEBUG.getState().flags.lastGameover; results.deaths.push(go);
      const plan={GO01:'verify-system',GO04:'read-surface',GO26:'close-four'}[go];
      if(plan){click(`[data-plan="${plan}"]`);results.loopPlans.push(`${go}:${plan}`);await sleep(2);}
      click('#return-button');await sleep(8);continue;
    }

    const insight=document.querySelector('#insight-panel:not(.hidden)');
    if(insight){const pair=insightAnswers[id];if(!pair)throw new Error(`missing insight answer ${id}`);for(const key of pair)click(`#insight-panel [data-id="${key}"]`);click('#insight-panel .insight-check');await sleep(2);click('#insight-panel .insight-continue');results.insights++;await sleep(2);continue;}

    const team=document.querySelector('.consequence-panel .commitment-grid');
    if(team){for(const key of ['claire','marc','leon'])document.querySelector(`.commitment-grid [data-person="${key}"]`)?.click();click('.commitment-finish');results.consequence.push('team');await sleep(150);continue;}
    const custody=document.querySelector('.consequence-panel .custody-grid');
    if(custody){
      for(const [person,proof] of [['claire','role_claire'],['marc','cleanup_cancelled'],['leon','leon_consent_record']]){const b=document.querySelector(`[data-for="${person}"][data-proof="${proof}"]`);if(b&&!b.disabled)b.click();}
      const done=document.querySelector('.custody-finish');if(!done||done.disabled)throw new Error(`custody not ready evidence=${FB_DEBUG.evidence().join(',')} buttons=${[...document.querySelectorAll('.custody-options button')].map(b=>b.dataset.proof+':'+b.disabled).join('|')}`);done.click();results.consequence.push('custody');await sleep(150);continue;
    }
    const signature=document.querySelector('.consequence-panel .signature-layout');
    if(signature){for(const [person,domain] of [['claire','imaging'],['marc','facility'],['leon','provenance']]){const d=document.querySelector(`[data-domain="${domain}"]`);if(d&&d.textContent.includes('未署名')){click(`[data-signer="${person}"]`);d.click();}}const done=document.querySelector('.signature-finish');if(!done||done.disabled)throw new Error('signature not ready');done.click();results.consequence.push('signature');await sleep(150);continue;}

    const art=document.querySelector('.art-comparison-panel');
    if(art){
      click('[data-work="amsterdam"]');click('[data-work="chicago"]');click('.art-compare-check');
      click('[data-mode="color"]');click('[data-work="amsterdam"]');click('[data-work="sketch"]');click('.art-compare-check');
      click('[data-mode="purpose"]');click('[data-work="chicago"]');click('[data-work="orsay"]');click('.art-compare-check');
      const done=document.querySelector('.art-compare-finish');if(done.disabled)throw new Error('comparison incomplete');done.click();results.investigations++;await sleep(5);continue;
    }
    const painted=document.querySelector('.painted-world-trial');
    if(painted){click('[data-route="0"]');const done=document.querySelector('.painted-commit');if(done.disabled)throw new Error('painted trial incomplete');done.click();results.investigations++;await sleep(5);continue;}

    const choiceButtons=[...document.querySelectorAll('#choice-panel:not(.hidden) button')];
    if(choiceButtons.length){const index=choices[id]??0;if(!choiceButtons[index]||choiceButtons[index].disabled)throw new Error(`missing/locked choice ${id}[${index}]`);choiceButtons[index].click();results.choices++;await sleep(2);continue;}

    const spectral=document.querySelector('.spectral-panel');
    if(spectral){for(const mode of [...spectral.querySelectorAll('[data-mode]')]){mode.click();await sleep(1);[...document.querySelectorAll('.spectral-hotspot')].forEach(b=>b.click());}const done=spectral.querySelector('.spectral-finish');if(done.disabled)throw new Error(`spectral incomplete ${id}`);done.click();results.investigations++;await sleep(5);continue;}
    const investigation=document.querySelector('#investigation-panel:not(.hidden)');
    if(investigation){[...document.querySelectorAll('.hotspot')].forEach(b=>b.click());const done=document.querySelector('#finish-investigation');if(done.disabled)throw new Error(`investigation incomplete ${id}`);done.click();results.investigations++;await sleep(5);continue;}
    const puzzle=document.querySelector('.puzzle-panel');
    if(puzzle){const correct=puzzleMap(id);if(id==='vR6'){for(const [piece,zone] of [['chair','chair-line'],['door','door-closed'],['bed','bed-board']]){click(`[data-piece="${piece}"]`);click(`[data-zone="${zone}"]`);}}else if(dragIds.has(id)){for(const [key,value] of Object.entries(correct)){click(`.drag-option-card[data-id="${key}:${value}"]`);click(`.drag-target[data-field="${key}"]`);}}else if(sortIds.has(id)){for(const [key,value] of Object.entries(correct)){click(`.sort-card[data-key="${key}"]`);click(`.sort-bin-target[data-category="${value}"]`);}}else{for(const [key,value] of Object.entries(correct))click(`.tactile-field[data-key="${key}"] button[data-value="${value}"]`);}click('.puzzle-check');results.puzzles++;await sleep(10);continue;}

    FB_DEBUG.advanceForTest();results.advances++;await sleep(current.type==='deathSequence'?75:(current.type==='ending'?12:8));
  }
  throw new Error('route exceeded 9000 UI steps');
}
"""
CHOICES = {
    'p06':0,'p13':1,'p18':1,'p39':0,'p48':0,'p56':0,'p65':0,'p71':0,
    'r03':0,'r11':1,'r14':0,'r21':2,'v07':0,'v12':2,'v17':0,
    'a203':0,'a206':0,'a231':3,'a243':2,'a249':1,'a263':1,'a270':1,
    'a304':1,'a305b':1,'a310':1,'a314':1,'a317':1,'a407':2,'a409c':1,
    'a414':2,'a418':1,'a506':2,'a512':1,'a521':1,'a602':0,'a607':1,
    'a615':1,'a618':1,'v27_reflect_portal':0,'v27_reflect_relation':0,
    'v27_reflect_marta':0,'v27_reflect_archive':0,'v27_reflect_roles':0,
    'v27_reflect_joint_procedure':0,'v27_reflect_floor_test':0,
    'v27_reflect_memory_record':0,'v27_reflect_provenance_boundary':0,
    'v27_reflect_restorable_disclosure':0,'v27_reflect_smoke_report':0,
    'v27_reflect_shutdown_record':0,'v27_reflect_accountability':0,
    'v27_reflect_label':0,
    'v27_reflect_leon_memory':0,'v27_reflect_unknown_room':0,
    'v27_reflect_guest_arrival':0,'v27_reflect_second_vincent':0,
    'v27_reflect_marta_entry':0,
    'a622':4,
}


INSIGHT_ANSWERS = {
    'p58x1':['crack','under'],'a230x1':['cost','bags'],'a406x1':['reuse','index'],
    'a416x1':['number','process'],'a503x1':['drafts','ticket'],'a613x2':['purchase','signature']
}


def main():
    # Shorten only the post-success presentation pause inside the test harness.
    # The production bundle itself remains unchanged and is separately checksum-verified.
    bundle = build_bundle().replace("}, 950);", "}, 8);")
    bundle = bundle.replace("completeText: () => completeTyping(),", "completeText: () => completeTyping(), advanceForTest: () => advance(),")
    tiny = 'data:image/gif;base64,R0lGODlhAQABAAAAACw='
    bundle = re.sub(r"function portraitAssetFor\(id, mood\) \{[\s\S]*?\n  \}", f"function portraitAssetFor(id, mood) {{ return '{tiny}';\n  }}", bundle, count=1)
    bundle = bundle.replace("function saveGame(manual = false, key = SAVE_KEYS.auto) {\n    return writeSave(key, manual);\n  }", "function saveGame(manual = false, key = SAVE_KEYS.auto) { return true; }")
    bundle = re.sub(r"function pulseLinePresentation\(\) \{[\s\S]*?\n  \}\n\n  function setSystemStatus", "function pulseLinePresentation() {}\n\n  function setSystemStatus", bundle, count=1)
    page_errors, console_errors = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-gpu'])
        page = browser.new_page(viewport={'width':1440,'height':900})
        page.set_default_timeout(300000)
        attach_error_capture(page, page_errors, console_errors)
        page.on('console', lambda m: print(m.text, flush=True) if m.type == 'log' and m.text.startswith('route ') else None)
        install_storage(page)
        page.set_content(bundle, wait_until='load', timeout=120000)
        page.wait_for_function('!!window.FB_DEBUG')
        result = page.evaluate(ROUTE_DRIVER, {'choices':CHOICES,'insightAnswers':INSIGHT_ANSWERS})
        result['page_errors'] = page_errors
        result['console_errors'] = console_errors
        result['visited_nodes'] = len(result['visited'])
        result['evidence_count'] = len(result['state']['evidence'])
        result['choice_history_count'] = len(result['state']['choiceHistory'])
        result['pass'] = (
            result.get('ending') == 'a631'
            and result.get('deaths') == ['GO01','GO04','GO26']
            and result.get('puzzles') == 11
            and result.get('investigations') >= 25
            and result.get('endingVisible') is True
            and result.get('choice_history_count',0) >= 55
            and result.get('loopPlans') == ['GO01:verify-system','GO04:read-surface','GO26:close-four']
            and result.get('consequence') == ['team','custody','signature']
            and result.get('insights') == 6
            and result.get('chapterBriefings',0) >= 5
            and not page_errors and not console_errors
        )
        browser.close()
    RESULT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k:v for k,v in result.items() if k not in ('visited','state')}, ensure_ascii=False, indent=2))
    if not result['pass']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
