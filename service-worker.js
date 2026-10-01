/**
 * Alpha-Mobil Einsatzleitzentrale – Service Worker für die installierbare App.
 * ---------------------------------------------------------------------------
 * Zweck: macht die Seite auf dem Handy/Desktop als "App" installierbar
 * (Icon, Vollbild ohne Browserleiste) und hält die eigenen, statischen
 * Dateien im Cache, damit die App auch bei schlechtem Netz sofort startet.
 *
 * Wichtig: Es wird NUR das eigene (same-origin) Grundgerüst gecacht
 * (index.html, plz-coords.json, Icons). Trello, das geteilte Google-Sheet,
 * LocationIQ und alle CDN-Bibliotheken werden immer live übers Netz
 * geladen – an deren Verhalten ändert dieser Service Worker nichts, und
 * wer die Seite ganz normal im Browser öffnet (ohne sie zu "installieren"),
 * merkt von alldem nichts.
 */

var CACHE_NAME = 'alpha-mobil-shell-v1';
var APP_SHELL = [
  './index.html',
  './plz-coords.json',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(APP_SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  var url = new URL(req.url);

  // Nur eigene GET-Anfragen behandeln – alles andere (Trello, Google Sheet,
  // LocationIQ, CDN-Bibliotheken, Kartenkacheln) läuft unverändert am
  // Service Worker vorbei direkt ans Netz.
  if (url.origin !== self.location.origin || req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || network;
    })
  );
});
