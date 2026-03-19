// RandevuBot Service Worker — Temel offline cache stratejisi
const CACHE_NAME = 'randevubot-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install — statik asset'leri cache'le
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — eski cache'leri temizle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch — Network first, cache fallback stratejisi
self.addEventListener('fetch', (event) => {
  // API çağrılarını cache'leme
  if (event.request.url.includes('/rest/v1/') ||
      event.request.url.includes('supabase.co') ||
      event.request.url.includes('n8n.') ||
      event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Başarılı yanıtları cache'le
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline — cache'den sun
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // SPA fallback — tüm navigasyonları index.html'e yönlendir
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// Push notification handler (Capacitor/native push için hazırlık)
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'RandevuBot';
  const options = {
    body: data.body || 'Yeni bildirim',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: data.url || '/dashboard',
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click — ilgili sayfaya yönlendir
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/dashboard')
  );
});
