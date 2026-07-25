const CACHE = 'fourth-bedroom-v2.20.0';
const MANIFEST_URL = './asset-manifest.json?v=2.20.0';
const CORE = [
  './', './index.html', './styles.css?v=2.20.0', './game.js?v=2.20.0',
  './data/game-data.js?v=2.20.0', './favicon.svg?v=2.20.0', './site.webmanifest?v=2.20.0',
  './version.json', MANIFEST_URL,
  './assets/painting-diagnostics/fourth_visible.webp?v=2.20.0',
  './assets/historical/bedroom-1888-amsterdam.webp?v=2.20.0',
  './assets/historical/bedroom-1889-chicago.webp?v=2.20.0',
  './assets/historical/bedroom-1889-orsay.webp?v=2.20.0',
  './assets/event-cg/painted_collapse.webp?v=2.20.0'
];

let cacheJob = null;
let cacheStatus = {completed:0,total:0,complete:false,failed:0};

async function broadcast(message) {
  const clients = await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for (const client of clients) client.postMessage(message);
}

async function playableFiles() {
  const response = await fetch(MANIFEST_URL, {cache:'no-store'});
  if (!response.ok) throw new Error(`manifest ${response.status}`);
  const manifest = await response.json();
  return (manifest.files || [])
    .map(item => item.path)
    .filter(path => path && !path.endsWith('.md') && path !== '.nojekyll')
    .map(path => new URL(path, self.registration.scope).href);
}

async function cacheOne(cache, url) {
  const existing = await cache.match(url, {ignoreSearch:true});
  if (existing) return true;
  const response = await fetch(url, {cache:'reload'});
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  await cache.put(url, response.clone());
  return true;
}

async function cacheCompleteLibrary() {
  if (cacheJob) return cacheJob;
  cacheJob = (async () => {
    const cache = await caches.open(CACHE);
    const urls = [...new Set(await playableFiles())];
    cacheStatus = {completed:0,total:urls.length,complete:false,failed:0};
    await broadcast({type:'CACHE_STATUS',...cacheStatus});
    const batchSize = 6;
    for (let index = 0; index < urls.length; index += batchSize) {
      const batch = urls.slice(index,index+batchSize);
      const results = await Promise.allSettled(batch.map(url => cacheOne(cache,url)));
      cacheStatus.completed += results.filter(result => result.status === 'fulfilled').length;
      cacheStatus.failed += results.filter(result => result.status === 'rejected').length;
      await broadcast({type:'CACHE_PROGRESS',...cacheStatus});
    }
    cacheStatus.complete = cacheStatus.failed === 0 && cacheStatus.completed === cacheStatus.total;
    if (cacheStatus.complete) await broadcast({type:'CACHE_COMPLETE',...cacheStatus});
    else await broadcast({type:'CACHE_ERROR',...cacheStatus,percent:cacheStatus.total ? (cacheStatus.completed/cacheStatus.total)*100 : 0});
    return cacheStatus;
  })().finally(() => { cacheJob = null; });
  return cacheJob;
}

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('message', event => {
  const data = event.data || {};
  if (data === 'SKIP_WAITING' || data.type === 'SKIP_WAITING') self.skipWaiting();
  if (data.type === 'CACHE_ALL_ASSETS') event.waitUntil(cacheCompleteLibrary());
  if (data.type === 'GET_CACHE_STATUS') event.waitUntil(broadcast({type:'CACHE_STATUS',...cacheStatus}));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const navigationOrCode = event.request.mode === 'navigate' || /\.(?:html|css|js|json|webmanifest)$/.test(url.pathname);
  if (navigationOrCode) {
    event.respondWith(fetch(event.request).then(response => {
      if (response && response.ok) caches.open(CACHE).then(cache => cache.put(event.request,response.clone()));
      return response;
    }).catch(async () => (await caches.match(event.request,{ignoreSearch:true})) || (await caches.match('./index.html',{ignoreSearch:true}))));
    return;
  }
  event.respondWith(caches.match(event.request,{ignoreSearch:true}).then(cached => {
    if (cached) return cached;
    return fetch(event.request).then(response => {
      if (response && response.ok) caches.open(CACHE).then(cache => cache.put(event.request,response.clone()));
      return response;
    });
  }));
});
