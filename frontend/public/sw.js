// Service worker minimal : permet l'installation du site comme application (PWA).
// Il ne met rien en cache : le site et la messagerie en temps réel se comportent comme d'habitude. Seule une navigation qui
// échoue (téléphone hors connexion) affiche une courte page d'explication au lieu de l'erreur du navigateur.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

const HORS_CONNEXION = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SAM Paris 12</title></head>'
  + '<body style="font-family:system-ui,sans-serif;background:#17120e;color:#eee8e0;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:1.5rem">'
  + '<div><h1 style="color:#f04c3e;margin:0 0 .5rem">SAM Paris 12</h1><p>Pas de connexion pour le moment.<br>Vérifie ton réseau puis réessaie.</p>'
  + '<p><a href="/" style="color:#fff">Réessayer</a></p></div></body></html>'

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return
  event.respondWith(fetch(event.request).catch(() => new Response(HORS_CONNEXION, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } })))
})
