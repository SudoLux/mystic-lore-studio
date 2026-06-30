const CACHE_VERSION = 'mystic-lore-studio-v2';
const APP_SHELL_CACHE = `${CACHE_VERSION}-app-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/ml-studio-icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(cacheAppShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  const expectedCaches = new Set([APP_SHELL_CACHE, RUNTIME_CACHE]);

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith('mystic-lore-studio-'))
            .filter((cacheName) => !expectedCaches.has(cacheName))
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);

  if (request.method !== 'GET' || requestUrl.origin !== self.location.origin) {
    return;
  }

  if (isDevelopmentRequest(requestUrl.pathname)) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

function isDevelopmentRequest(pathname) {
  return [
    '/src/',
    '/@vite/',
    '/@react-refresh',
    '/@id/',
    '/@fs/',
    '/node_modules/.vite/',
  ].some((prefix) => pathname.startsWith(prefix));
}

async function networkFirstNavigation(request) {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(APP_SHELL_CACHE);
    cache.put('/index.html', networkResponse.clone());
    return networkResponse;
  } catch {
    return caches.match('/index.html');
  }
}

async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  const networkFetch = fetch(request)
    .then(async (networkResponse) => {
      if (networkResponse.ok) {
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, networkResponse.clone());
      }

      return networkResponse;
    })
    .catch(() => undefined);

  return cachedResponse || networkFetch || caches.match('/index.html');
}

async function cacheAppShell() {
  const cache = await caches.open(APP_SHELL_CACHE);
  await cache.addAll(APP_SHELL_URLS);

  const indexResponse = await fetch('/index.html');
  const indexMarkup = await indexResponse.clone().text();
  await cache.put('/index.html', indexResponse);

  const assetUrls = Array.from(
    indexMarkup.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g),
    (match) => match[1],
  );

  if (assetUrls.length > 0) {
    await cache.addAll(assetUrls);
  }
}
