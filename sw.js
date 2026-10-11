// Retire the withdrawn installable version when existing browsers check for updates.
// No fetch listener: all requests use the browser's normal network behavior.
self.addEventListener('install',event=>{
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>
    key.startsWith('brainilab-pwa-')||key.startsWith('brainilab-static-')
  ).map(key=>caches.delete(key)))).then(()=>self.clients.claim()).then(()=>self.registration.unregister()));
});
