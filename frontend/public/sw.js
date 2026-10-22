/* Service Worker Shopizi — cache offline + PWA installabilité.
   Stratégie :
   - Réseau d'abord pour les pages (navigation) et les données.
   - Cache d'abord pour les assets statiques (scripts, styles, images, polices).
   - Ne JAMAIS mettre en cache l'API (shopizi-api.onrender.com),
     les requêtes d'authentification, de paiement, de chat temps réel (Socket.io),
     ni les médias Cloudinary.
*/

const CACHE_NAME = 'shopizi-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/icon-192.png',
  '/icon-192-maskable.png',
  '/icon-512.png',
  '/icon-512-maskable.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1. Exclusions strictes : API Render, Cloudinary, auth, paiements, chat Socket.io
  const isExcluded =
    url.hostname.includes('onrender.com') ||
    url.hostname.includes('cloudinary.com') ||
    url.pathname.includes('/socket.io') ||
    url.pathname.includes('/api/') ||
    url.pathname.includes('/auth') ||
    url.pathname.includes('/payments') ||
    url.pathname.includes('/checkout') ||
    url.pathname.includes('/webhook');

  if (isExcluded) {
    return;
  }

  // 2. Navigation (pages) : réseau d'abord, repli hors-ligne
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((cached) => cached || caches.match('/offline.html') || caches.match('/'))
      )
    );
    return;
  }

  // 3. Assets statiques (images, styles, scripts, polices) : cache d'abord
  if (['image', 'style', 'script', 'font'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok && url.origin === self.location.origin) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // 4. Autres requêtes GET : réseau d'abord, repli cache
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Notifications push
self.addEventListener('push', (event) => {
  let data = { title: 'Shopizi', body: 'Vous avez une nouvelle notification.', url: '/' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) { /* payload texte */ }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
