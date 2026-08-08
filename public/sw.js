self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('biro-image-cache').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json'
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== 'biro-image-cache') {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only cache images and shared assets
  if (event.request.destination === 'image' || event.request.url.includes('supabase.co/storage/v1/object/public')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        
        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && !event.request.url.includes('supabase.co')) {
            return networkResponse;
          }
          
          const responseToCache = networkResponse.clone();
          caches.open('biro-image-cache').then((cache) => {
            cache.put(event.request, responseToCache);
          });
          
          return networkResponse;
        }).catch(() => {
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
    );
  } else {
    event.respondWith(fetch(event.request));
  }
});
