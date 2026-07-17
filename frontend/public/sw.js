/* Service Worker Shopizi — cache offline + notifications push.
   Strategie : ne jamais mettre en cache l'API (onrender) ni les medias
   Cloudinary (assets signes/temporaires) ; navigation en network-first avec
   repli hors-ligne ; assets statiques en cache-first. */

const CACHE_NAME = 'shopizi-v1';
const STATIC_ASSETS = ['/', '/manifest.json', '/logo-shopizi.png', '/offline.html'];

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

  // Ne jamais intercepter l'API ni les medias distants : on laisse le reseau
  // gerer (auth, urls signees, temps reel).
  if (url.hostname.includes('onrender.com') || url.hostname.includes('cloudinary.com')) {
    return;
  }

  // Navigation (pages) : reseau d'abord, repli hors-ligne.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((cached) => cached || caches.match('/offline.html') || caches.match('/'))
      )
    );
    return;
  }

  // Images / styles / scripts : cache d'abord.
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

  // Reste : reseau d'abord, repli cache.
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

// Notification push (necessite un serveur push cote back ; le handler est prêt).
self.addEventListener('push', (event) => {
  let data = { title: 'Shopizi', body: 'Vous avez une nouvelle notification.', url: '/' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) { /* payload texte simple */ }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/logo-shopizi.png',
      badge: '/logo-shopizi.png',
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
