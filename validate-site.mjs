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
  const nodes = context.window.GAME_DATA?.nodes;
  if (!Array.isArray(nodes) || nodes.length !== 700) failures.push(`GAME_DATA nodes expected 700, got ${nodes?.length ?? 'missing'}`);
  const ids = nodes?.map(x => x.id) ?? [];
  if (new Set(ids).size !== ids.length) failures.push('GAME_DATA contains duplicate node IDs');
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
