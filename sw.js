// TenderTrack + EMDTrack Service Worker v4
const CACHE = 'tt-emd-v4';
const SHELL = [
  './tendertrack.html',
  './emd.html',
  './manifest.json',
  './emd-manifest.json',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;500;600&display=swap'
];

// Install — cache app shell fresh
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

// Activate — delete ALL old caches immediately
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

// Fetch — network-first for HTML so updates always load fresh
self.addEventListener('fetch', function(e){
  const url = e.request.url;

  // Always network for GitHub API calls
  if(url.includes('api.github.com') || url.includes('script.google.com')){
    return;
  }

  // Network-first for HTML files — ensures latest version always loads
  if(url.endsWith('.html') || e.request.mode === 'navigate'){
    e.respondWith(
      fetch(e.request, {cache: 'no-cache'}).then(function(response){
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

  // Cache-first for everything else (fonts, json)
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
