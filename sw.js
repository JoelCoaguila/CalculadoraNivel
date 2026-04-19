const CACHE_NAME = 'calc-dp-v1';
const ASSETS = ['./index.html','./style.css','./utils.js','./app.js','./manifest.json'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener('fetch', e => {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
