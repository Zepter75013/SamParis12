// Service worker minimal : permet l'installation du site comme application (PWA).
// Il n'intercepte rien (pas de cache) : le site et la messagerie en temps réel se comportent comme d'habitude.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
