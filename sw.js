// Makes the site installable as an app. Always asks the network first, so a deploy shows up
// right away; the saved copy is only used when there's no connection.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
    e.respondWith(fetch(e.request).then(r => {
        if (r.ok) {
            const copy = r.clone();
            caches.open('movies').then(c => c.put(e.request, copy));
        }
        return r;
    }).catch(() => caches.match(e.request)));
});
