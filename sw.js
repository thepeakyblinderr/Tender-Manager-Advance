// TenderTrack + EMDTrack Service Worker v6
const CACHE = 'tt-emd-v6';
const SHELL = [
  './tendertrack.html',
  './emd.html',
  './manifest.json',
  './emd-manifest.json',
  'https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,600;0,700;0,800;1,600&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(cache){
      return cache.addAll(SHELL.map(function(url){
        return new Request(url, {cache: 'reload'});
      })).catch(function(){});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e){
  const url = e.request.url;

  // Always network for API calls
  if(url.includes('api.github.com') || url.includes('script.google.com')){
    return;
  }

  // Network-first for ALL HTML and navigation — always fresh
  if(url.endsWith('.html') || url.endsWith('.htm') || e.request.mode === 'navigate'){
    e.respondWith(
      fetch(e.request, {cache: 'no-store'}).then(function(response){
        if(response.status === 200){
          const clone = response.clone();
          caches.open(CACHE).then(function(cache){ cache.put(e.request, clone); });
        }
        return response;
      }).catch(function(){
        return caches.match(e.request);
      })
    );
    return;
  }

  // Cache-first for fonts and manifests
  e.respondWith(
    caches.match(e.request).then(function(cached){
      if(cached) return cached;
      return fetch(e.request).then(function(response){
        if(e.request.method === 'GET' && response.status === 200){
          const clone = response.clone();
          caches.open(CACHE).then(function(cache){ cache.put(e.request, clone); });
        }
        return response;
      });
    })
  );
});
