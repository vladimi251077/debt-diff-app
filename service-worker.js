const CACHE='debt-diff-app-v7-offline-first-20260527';
const FILES=['./','./index.html','./style.css?v=20260524-autobackup1','./app.js?v=20260524-autobackup1','./manifest.json','./icon.svg'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;

  const isNavigate=e.request.mode==='navigate';

  if(isNavigate){
    e.respondWith(
      caches.match('./index.html').then(cached=>cached||fetch(e.request))
    );

    e.waitUntil(
      fetch(e.request)
        .then(r=>{
          if(!r || !r.ok) return;
          const copy=r.clone();
          return caches.open(CACHE).then(cache=>cache.put('./index.html',copy));
        })
        .catch(()=>{})
    );

    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached=>{
      if(cached){
        e.waitUntil(
          fetch(e.request)
            .then(r=>{
              if(!r || !r.ok) return;
              const copy=r.clone();
              return caches.open(CACHE).then(cache=>cache.put(e.request,copy));
            })
            .catch(()=>{})
        );
        return cached;
      }

      return fetch(e.request)
        .then(r=>{
          if(!r || !r.ok) return r;
          const copy=r.clone();
          caches.open(CACHE).then(cache=>cache.put(e.request,copy));
          return r;
        })
        .catch(()=>caches.match('./index.html'));
    })
  );
});
