#!/usr/bin/env python3
from pathlib import Path
import json,hashlib,argparse

def load(p):
 s=Path(p).read_text('utf-8'); return json.loads(s[len('window.GAME_DATA='):].rstrip(' ;\n'))
def h(x): return hashlib.sha256(json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
pa=argparse.ArgumentParser();pa.add_argument('--baseline',required=True);pa.add_argument('--current',default='site/data/game-data.js');pa.add_argument('--output',default='tests/visual_continuity_integrity_v216.json');a=pa.parse_args()
b=load(a.baseline);c=load(a.current)
checks={
 'version_is_2_16_0':c.get('meta',{}).get('version')=='2.16.0',
 'node_count_unchanged':len(b.get('nodes',[]))==len(c.get('nodes',[]))==730,
 'evidence_count_unchanged':len(b.get('evidence',{}))==len(c.get('evidence',{}))==173,
 'nodes_hash_unchanged':h(b.get('nodes'))==h(c.get('nodes')),
 'evidence_hash_unchanged':h(b.get('evidence'))==h(c.get('evidence')),
 'gameovers_hash_unchanged':h(b.get('gameovers'))==h(c.get('gameovers')),
 'endings_hash_unchanged':h(b.get('endings'))==h(c.get('endings')),
}
out={'baseline_version':b.get('meta',{}).get('version'),'current_version':c.get('meta',{}).get('version'),'checks':checks,'hashes':{'nodes':h(c.get('nodes')),'evidence':h(c.get('evidence')),'gameovers':h(c.get('gameovers')),'endings':h(c.get('endings'))},'passed':all(checks.values())}
Path(a.output).write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n','utf-8');print(json.dumps(out,ensure_ascii=False,indent=2));raise SystemExit(0 if out['passed'] else 1)
