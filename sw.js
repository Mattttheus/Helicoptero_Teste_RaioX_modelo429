// HeliSense 3D – service worker (app instalável e uso sem internet).
// Código e páginas: rede primeiro (sempre atualizado quando há rede), cópia local quando não há.
// Arquivos pesados e estáveis (Three.js local, texturas, atlas, figuras, modelos .glb, HDRI): cópia local primeiro.
const VERSAO = 'mi-20261123a';
const CACHE = 'mi-' + VERSAO;
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    try { const lista = await (await fetch('offline_lista.json', { cache: 'no-store' })).json(); await Promise.allSettled(lista.map((u) => c.add(u))); /* um arquivo ausente não impede os demais */ } catch (err) { /* sem lista: só o cache em uso */ }
    self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => { for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k); await self.clients.claim(); })());
});
const PESADO = /\/(assets\/(vendor|texturas|hdri|modelos3d|icones)|dados\/atlas|dados\/[^/]+\/figuras)\//;
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || /\/(api|ferramentas)\//.test(url.pathname)) return;
  if (PESADO.test(url.pathname)) {
    e.respondWith((async () => {
      const em = await caches.match(req, { ignoreSearch: true }); if (em) return em;
      const r = await fetch(req); if (r.ok) (await caches.open(CACHE)).put(req, r.clone()); return r;
    })());
  } else {
    e.respondWith((async () => {
      try { const r = await fetch(req); if (r.ok) (await caches.open(CACHE)).put(req, r.clone()); return r; }
      catch { return (await caches.match(req)) || (await caches.match(req, { ignoreSearch: true })) || new Response('Sem conexão e sem cópia local deste arquivo.', { status: 503 }); }
    })());
  }
});
