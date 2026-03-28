// ============================================
// METABOLIK MUHENDISLIK PANELI - SERVICE WORKER
// ============================================

const CACHE_ADI = 'mmp-v9';
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
    // API cagrilarini ve POST isteklerini cache'leme
    if (event.request.method !== 'GET' ||
        event.request.url.includes('api.anthropic.com') ||
        event.request.url.includes('supabase.co') ||
        event.request.url.includes('googleapis.com') ||
        event.request.url.includes('generativelanguage')) {
        return;
    }

    const isJs = event.request.url.match(/\.(js)(\?|$)/);

    if (isJs) {
        // JS dosyalari: network-first (her deploy'da guncel kod gelsin)
        event.respondWith(
            fetch(event.request).then((agCevap) => {
                if (agCevap && agCevap.status === 200) {
                    const kopyaCevap = agCevap.clone();
                    caches.open(CACHE_ADI).then((cache) => {
                        cache.put(event.request, kopyaCevap);
                    });
                }
                return agCevap;
            }).catch(() => {
                return caches.match(event.request).then((cevap) => {
                    return cevap || new Response('Offline - sayfa bulunamadi', {
                        status: 503,
                        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                    });
                });
            })
        );
        return;
    }

    // Diger dosyalar (HTML, CSS, assets): cache-first
    event.respondWith(
        caches.match(event.request).then((cevap) => {
            if (cevap) return cevap;

            return fetch(event.request).then((agCevap) => {
                if (agCevap && agCevap.status === 200) {
                    const kopyaCevap = agCevap.clone();
                    caches.open(CACHE_ADI).then((cache) => {
                        cache.put(event.request, kopyaCevap);
                    });
                }
                return agCevap;
            }).catch(() => {
                return new Response('Offline - sayfa bulunamadi', {
                    status: 503,
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                });
            });
        })
    );
});
