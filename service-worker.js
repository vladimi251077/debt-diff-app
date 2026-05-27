const CACHE = 'debt-diff-app-v7-offline-first-20260527';

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

async function updateRequestInBackground(request, cacheKey = request) {
  try {
    const response = await fetch(request);
    if (!response || !response.ok) return;

    const cache = await caches.open(CACHE);
    await cache.put(cacheKey, response.clone());
  } catch (error) {
    // Плохой интернет/VPN или офлайн — игнорируем, приложение работает из кэша.
  }
}

async function handleNavigate(request) {
  const cache = await caches.open(CACHE);

  const cachedIndex =
    await cache.match('./index.html') ||
    await caches.match('./index.html') ||
    await cache.match('./');

  updateRequestInBackground(request, './index.html');

  if (cachedIndex) {
    return cachedIndex;
  }

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put('./index.html', response.clone());
    }
    return response;
  } catch (error) {
    return new Response(
      '<!doctype html><html lang="ru"><meta charset="utf-8"><title>Разница</title><body><h1>Разница</h1><p>Приложение не успело сохраниться в кэш. Откройте его один раз с интернетом.</p></body></html>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

async function handleAsset(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);

  if (cached) {
    updateRequestInBackground(request);
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

  if (event.request.mode === 'navigate') {
    event.respondWith(handleNavigate(event.request));
    return;
  }

  event.respondWith(handleAsset(event.request));
});
