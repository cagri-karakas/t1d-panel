// ============================================
// METABOLIK MUHENDISLIK PANELI - SERVICE WORKER
// ============================================

const CACHE_ADI = 'mmp-v2';
const ONBELLEK_DOSYALAR = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './api.js',
    './supabase.js',
    './manifest.json'
];

// Kurulum: dosyalari onbellekle
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_ADI).then((cache) => {
            return cache.addAll(ONBELLEK_DOSYALAR);
        })
    );
    self.skipWaiting();
});

// Aktivasyon: eski cache'leri temizle
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((anahtarlar) => {
            return Promise.all(
                anahtarlar
                    .filter((a) => a !== CACHE_ADI)
                    .map((a) => caches.delete(a))
            );
        })
    );
    self.clients.claim();
});

// Fetch: once cache, sonra network
self.addEventListener('fetch', (event) => {
    // API cagrilarini cache'leme
    if (event.request.url.includes('api.anthropic.com') ||
        event.request.url.includes('supabase.co')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cevap) => {
            if (cevap) return cevap;

            return fetch(event.request).then((agCevap) => {
                // Basarili cevaplari cache'le
                if (agCevap && agCevap.status === 200) {
                    const kopyaCevap = agCevap.clone();
                    caches.open(CACHE_ADI).then((cache) => {
                        cache.put(event.request, kopyaCevap);
                    });
                }
                return agCevap;
            }).catch(() => {
                // Offline ve cache'te yok
                return new Response('Offline - sayfa bulunamadi', {
                    status: 503,
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                });
            });
        })
    );
});
