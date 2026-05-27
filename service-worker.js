const CACHE = 'debt-diff-app-v6-offline-first-20260524';

const FILES = [
  './',
  './index.html',
  './style.css?v=20260524-autobackup1',
  './app.js?v=20260524-autobackup1',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

async function updateInBackground(request) {
  try {
    const response = await fetch(request);
    if (!response || !response.ok) return;

    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());

    if (request.mode === 'navigate') {
      await cache.put('./index.html', response.clone());
    }
  } catch (error) {
    // Нет интернета или плохой VPN — ничего страшного, работаем из кэша.
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);

  if (request.mode === 'navigate') {
    const cachedPage = await cache.match('./index.html');
    updateInBackground(request);
    if (cachedPage) return cachedPage;

    try {
      const response = await fetch(request);
      await cache.put('./index.html', response.clone());
      return response;
    } catch (error) {
      return cache.match('./index.html');
    }
  }

  const cached = await cache.match(request);
  if (cached) {
    updateInBackground(request);
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return cache.match('./index.html');
  }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(cacheFirst(event.request));
});
