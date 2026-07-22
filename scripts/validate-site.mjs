import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root = path.resolve('site');
const required = [
  'index.html', 'styles.css', 'game.js', 'data/game-data.js',
  'assets/fourth-bedroom-base.webp', 'assets/the-bedroom-1889.webp',
  '.nojekyll', '404.html', 'favicon.svg', 'site.webmanifest'
];
const failures = [];
const exists = async rel => {
  try { await stat(path.join(root, rel)); return true; }
  catch { return false; }
};
for (const rel of required) if (!await exists(rel)) failures.push(`missing: ${rel}`);

const html = await readFile(path.join(root, 'index.html'), 'utf8');
const css = await readFile(path.join(root, 'styles.css'), 'utf8');
const game = await readFile(path.join(root, 'game.js'), 'utf8');
const gameDataSource = await readFile(path.join(root, 'data/game-data.js'), 'utf8');

for (const [rel, text] of [['index.html', html], ['styles.css', css], ['game.js', game], ['data/game-data.js', gameDataSource]]) {
  if (/\b(?:src|href)=["']\//.test(text)) failures.push(`${rel}: root-absolute src/href found`);
  if (/url\(["']?\//.test(text)) failures.push(`${rel}: root-absolute CSS url found`);
}

const refs = new Set();
for (const match of html.matchAll(/(?:src|href)=["']([^"'#?]+)["']/g)) refs.add(match[1]);
for (const match of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
  const ref = match[1];
  if (!ref.startsWith('data:')) refs.add(ref);
}
for (const match of game.matchAll(/["'`](assets\/[^"'`]+?\.(?:webp|jpg|jpeg|png|svg))["'`]/g)) refs.add(match[1]);
for (const ref of refs) {
  if (/^(?:https?:|data:|mailto:|#|%23)/.test(ref)) continue;
  if (!await exists(ref)) failures.push(`referenced file missing: ${ref}`);
}

for (const rel of ['styles.css', 'data/game-data.js', 'game.js', 'favicon.svg', 'site.webmanifest']) {
  if (!html.includes(rel)) failures.push(`index.html does not reference ${rel}`);
}

try {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(gameDataSource, context, { timeout: 5000 });
  const gameData = context.window.GAME_DATA;
  const nodes = gameData?.nodes;
  if (!Array.isArray(nodes) || nodes.length !== 700) failures.push(`GAME_DATA nodes expected 700, got ${nodes?.length ?? 'missing'}`);
  if (gameData?.meta?.version !== '2.0.0') failures.push(`GAME_DATA version expected 2.0.0, got ${gameData?.meta?.version ?? 'missing'}`);
  const ids = nodes?.map(x => x.id) ?? [];
  const idSet = new Set(ids);
  if (idSet.size !== ids.length) failures.push('GAME_DATA contains duplicate node IDs');
  const allowedModes = new Set(['dialogue','inner','document','system']);
  let segmentCount = 0;
  for (const node of nodes || []) {
    if (!Array.isArray(node.script) || !node.script.length) failures.push(`node ${node.id}: script missing`);
    for (const [i, segment] of (node.script || []).entries()) {
      segmentCount += 1;
      if (!allowedModes.has(segment.mode)) failures.push(`node ${node.id}:${i}: invalid mode ${segment.mode}`);
      if (typeof segment.text !== 'string') failures.push(`node ${node.id}:${i}: segment text missing`);
      if ((segment.text || '').length > 110) failures.push(`node ${node.id}:${i}: segment exceeds 110 characters`);
      if (segment.mode === 'inner' && /澄は|澄が|澄の|澄を|澄に/.test(segment.text || '')) failures.push(`node ${node.id}:${i}: external third-person wording remains in inner segment`);
      if (segment.mode === 'inner' && /^「[\s\S]*」$/.test((segment.text || '').trim())) failures.push(`node ${node.id}:${i}: spoken line remains inside inner segment`);
      if (segment.mode === 'dialogue' && /^「|」$/.test((segment.text || '').trim())) failures.push(`node ${node.id}:${i}: dialogue still includes outer brackets`);
      if (segment.mode === 'dialogue' && segment.speaker === '地の文') failures.push(`node ${node.id}:${i}: narrator mislabeled as dialogue`);
      if (segment.mode === 'dialogue' && segment.speaker && new RegExp(`${segment.speaker}(?:は|が)`).test(segment.text || '')) failures.push(`node ${node.id}:${i}: stage direction appears inside dialogue`);
      if (!(segment.text || '').trim()) failures.push(`node ${node.id}:${i}: empty segment remains`);
      if (segment.speaker === 'ポール・ゴーギャン') failures.push(`node ${node.id}:${i}: Gauguin speaker label not normalized`);
      if (segment.mode === 'dialogue' && segment.speaker === '澄' && /僕|俺/.test(segment.text || '')) failures.push(`node ${node.id}:${i}: Sumi dialogue contains a masculine first-person pronoun`);
      if (segment.mode === 'dialogue' && segment.speaker === 'クレール' && /^a(?:22[1-9]|2[3-9]\d|3\d\d|4\d\d)/.test(node.id)) failures.push(`node ${node.id}:${i}: Claire appears as speaker inside a historical layer`);
    }
    const targets = [];
    if (node.next) targets.push(node.next);
    for (const choice of node.choices || []) if (choice.next) targets.push(choice.next);
    for (const target of targets) if (!idSet.has(target)) failures.push(`node ${node.id}: missing target ${target}`);
  }
  for (const [goId, go] of Object.entries(gameData?.gameovers || {})) if (go.returnTo && !idSet.has(go.returnTo)) failures.push(`gameover ${goId}: missing return target ${go.returnTo}`);

  // Critical attribution checks. These scenes previously contained dialogue assigned
  // to the wrong character after the limited-POV segmentation pass.
  const expectedDialogueOwners = [
    ['a203','あなた、画面の中へ入ったように見えた','クレール'],
    ['a209x3','でも、次に危ないことをするなら、理由の代わりに手順を見せて','クレール'],
    ['a275','次は','澄'],
    ['a305a','似ているからといって、同じ扱いをするな','フィンセント'],
    ['a306x1','今見えているものと、覚えているものを使う','フィンセント'],
    ['a308','そこ。強く引くな。張りが変わる','フィンセント'],
    ['a406x2','この画面を、何だと思います','マルタ'],
    ['a408a','私は、同じにならない場所を見ています','マルタ'],
    ['a412x2','記憶は、嘘ではありません。だから扱いにくい','マルタ'],
    ['a421','会ったことはありません。手紙では、面倒な人です','マルタ'],
    ['a422x1','説明しやすい一語より、面倒な具体の方が多い','マルタ'],
    ['a505x1','正面を撮るか、裏を撮るか。どの光を当てるか。あなたも選んでいる','アンドレ'],
    ['a505x2','あなたは、選んだことを消して、最初から一つしかなかったように見せている','澄'],
    ['a520x4','報告には、分かったこと、分からないこと、研究所が送信を遅らせた事実を分けて書きます','澄'],
    ['a522x1','そうすれば、その下に残ったものだけは救えると','レオン'],
    ['a602','コーヒー、飲む？　砂糖は','クレール'],
    ['a612x2','いい。今の停止は、私がログを見て決めた','クレール']
  ];
  for (const [nodeId,text,speaker] of expectedDialogueOwners) {
    const n = (nodes || []).find(x => x.id === nodeId);
    const segment = (n?.script || []).find(s => s.text === text);
    if (!segment || segment.mode !== 'dialogue' || segment.speaker !== speaker) failures.push(`node ${nodeId}: expected ${speaker} to own dialogue ${text}`);
  }
  const nonDialogueQuoteNodes = ['r14','a260x1','a263d','a265','earlyEnd','a508','a618'];
  for (const nodeId of nonDialogueQuoteNodes) {
    const n = (nodes || []).find(x => x.id === nodeId);
    if ((n?.script || []).some(s => s.mode === 'dialogue')) failures.push(`node ${nodeId}: label/interface quotation is still treated as spoken dialogue`);
  }

  // Simulate the five intended clear routes. This catches a text/engine refactor that
  // accidentally severs a key choice, death return, or ending connection.
  const nodeMap = new Map((nodes || []).map(n => [n.id, n]));
  const baseChoices = {
    p06:0,p13:1,p18:1,p39:0,p48:0,p56:0,p65:0,p71:0,r03:0,r11:1,r14:0,r21:2,
    v07:0,v12:2,v17:0,a203:0,a206:0,a231:3,a243:2,a249:1,a263:1,a270:1,
    a304:1,a305b:1,a310:1,a314:1,a317:1,a407:2,a409c:1,a414:2,a418:1,
    a506:2,a512:1,a521:1,a602:0,a607:1,a615:1,a618:1
  };
  const expectedEndings = ['endBad1','endBad2','endBad3','endNormal','a631'];
  for (let finalChoice = 0; finalChoice < 5; finalChoice += 1) {
    const choices = {...baseChoices, a622:finalChoice};
    let current = 'p01';
    const routeDeaths = [];
    let ended = false;
    for (let step = 0; step < 2000; step += 1) {
      const n = nodeMap.get(current);
      if (!n) { failures.push(`clear route ${finalChoice}: missing node ${current}`); break; }
      if (n.type === 'ending' || n.type === 'earlyEnding') {
        if (current !== expectedEndings[finalChoice]) failures.push(`clear route ${finalChoice}: expected ${expectedEndings[finalChoice]}, reached ${current}`);
        ended = true; break;
      }
      if (n.type === 'deathSequence') {
        routeDeaths.push(n.death);
        const ret = gameData.gameovers?.[n.death]?.returnTo;
        if (!ret) { failures.push(`clear route ${finalChoice}: death ${n.death} has no return`); break; }
        current = ret; continue;
      }
      if (n.type === 'choice') {
        const selected = choices[n.id] ?? 0;
        const target = n.choices?.[selected]?.next;
        if (!target) { failures.push(`clear route ${finalChoice}: choice ${n.id}[${selected}] missing`); break; }
        current = target; continue;
      }
      if (!n.next) { failures.push(`clear route ${finalChoice}: ${n.id} has no next`); break; }
      current = n.next;
    }
    if (!ended) failures.push(`clear route ${finalChoice}: did not reach an ending`);
    const mandatory = ['GO01','GO04','GO26'];
    if (JSON.stringify(routeDeaths) !== JSON.stringify(mandatory)) failures.push(`clear route ${finalChoice}: mandatory death sequence changed (${routeDeaths.join(', ')})`);
  }
  if (segmentCount < 1400) failures.push(`expected at least 1400 narrative segments, got ${segmentCount}`);
} catch (error) {
  failures.push(`GAME_DATA evaluation failed: ${error.message}`);
}

async function walk(dir) {
  const out = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}
const files = await walk(root);
const totalBytes = (await Promise.all(files.map(async f => (await stat(f)).size))).reduce((a,b)=>a+b,0);

if (failures.length) {
  console.error('Static-site validation failed:');
  failures.forEach(x => console.error(`- ${x}`));
  process.exit(1);
}
console.log(`Validated ${files.length} files, ${refs.size} local references, 700 nodes (${(totalBytes/1024/1024).toFixed(2)} MiB).`);
