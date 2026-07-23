from __future__ import annotations
import json, re, shutil, tempfile, threading, urllib.request
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'site'
RESULT=ROOT/'tests/github_pages_subpath_v216.json'

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

html=(SITE/'index.html').read_text(encoding='utf-8')
css=(SITE/'styles.css').read_text(encoding='utf-8')
js=(SITE/'game.js').read_text(encoding='utf-8')
refs=set(re.findall(r'(?:src|href)=["\']([^"\'#?]+)',html))
refs.update(x for x in re.findall(r'url\(["\']?([^"\')]+)',css) if not x.startswith('data:'))
# Dynamic portrait assets are validated through the production path pattern plus representative files.
refs.update(['assets/characters/expressions/sumi/neutral.webp','assets/characters/expressions/claire/neutral.webp'])
refs={r for r in refs if not re.match(r'^(?:https?:|mailto:|data:|#|%23)',r) and '${' not in r}

with tempfile.TemporaryDirectory() as td:
    host=Path(td); shutil.copytree(SITE,host/'fourth-bedroom')
    handler=lambda *args, **kwargs: Quiet(*args,directory=str(host),**kwargs)
    server=ThreadingHTTPServer(('127.0.0.1',0),handler)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    base=f'http://127.0.0.1:{server.server_port}/fourth-bedroom/'
    checked={}
    try:
        for rel in sorted({'',*refs}):
            with urllib.request.urlopen(base+rel,timeout=20) as response:
                response.read()
                checked[rel or './']=response.status
    finally:
        server.shutdown(); server.server_close()

checks={
 'base_path':'/fourth-bedroom/',
 'root_200':checked.get('./')==200,
 'all_relative_references_200':all(v==200 for v in checked.values()),
 'reference_count':len(checked),
 'root_absolute_html':bool(re.search(r'(?:src|href)=["\']/',html)),
 'root_absolute_css':bool(re.search(r'url\(["\']?/',css)),
 'dynamic_portrait_path_relative':'assets/characters/expressions/${id}/${safeMood}.webp' in js,
 'service_worker_scope_relative':"const CORE=['./','./index.html'" in (SITE/'service-worker.js').read_text(encoding='utf-8'),
 'failed':{k:v for k,v in checked.items() if v!=200}
}
checks['pass']=checks['root_200'] and checks['all_relative_references_200'] and not checks['root_absolute_html'] and not checks['root_absolute_css'] and checks['dynamic_portrait_path_relative'] and checks['service_worker_scope_relative']
RESULT.write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(checks,ensure_ascii=False,indent=2))
if not checks['pass']: raise SystemExit(1)
