const CACHE_NAME = 'koko-pwa-v2-github';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon.png',
    './css/style.css',
    './js/app.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js'
];

self.addEventListener('install', (e) => {
    console.log('[Service Worker] Install');
    self.skipWaiting(); // Force activate immediately
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching all: app shell and content');
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', (e) => {
    console.log('[Service Worker] Activate');
    // Clear old caches
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim(); // Take control of all clients immediately
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => {
            // Cache hit - return response
            if (response) {
                return response;
            }
            // Not in cache - fetch from network
            return fetch(e.request).catch(() => {
                // Offline and fallback missing
                // Can return a custom offline page here if desired
            });
        })
    );
});
