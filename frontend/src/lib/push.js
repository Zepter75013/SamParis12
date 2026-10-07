// Notifications push du navigateur (standard Web Push) : détection, autorisation, abonnement de l'appareil.

const estIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const estInstalle = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

// État du push sur cet appareil :
//   'indisponible' (navigateur trop ancien), 'ios-a-installer' (iPhone : ajouter d'abord le site à l'écran d'accueil),
//   'refuse' (notifications bloquées dans le navigateur), 'possible' (pas encore activé), 'actif'.
export async function etatPush() {
  const supporte = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (!supporte) return estIOS() && !estInstalle() ? 'ios-a-installer' : 'indisponible'
  if (Notification.permission === 'denied') return 'refuse'
  const reg = await navigator.serviceWorker.getRegistration('/')
  const abo = reg ? await reg.pushManager.getSubscription() : null
  return abo ? 'actif' : 'possible'
}

function cleVersOctets(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const brut = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(brut, (c) => c.charCodeAt(0))
}

// Nom lisible de l'appareil, pour s'y retrouver s'il y en a plusieurs.
function nomAppareil() {
  const ua = navigator.userAgent
  const sys = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Appareil'
  const nav = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : ''
  return nav ? `${sys} · ${nav}` : sys
}

// Demande l'autorisation, abonne l'appareil et le déclare à l'API. Renvoie l'abonnement (format JSON du navigateur).
export async function activerPush(clePublique) {
  if (Notification.permission !== 'granted') {
    const choix = await Notification.requestPermission()
    if (choix !== 'granted') throw new Error(choix === 'denied' ? 'Les notifications sont bloquées pour ce site dans le navigateur.' : "Autorisation non accordée.")
  }
  const reg = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  let abo = await reg.pushManager.getSubscription()
  if (!abo) abo = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: cleVersOctets(clePublique) })
  return { ...abo.toJSON(), appareil: nomAppareil() }
}

// Désabonne l'appareil ; renvoie l'adresse d'abonnement à oublier côté API (ou null s'il n'y en avait pas).
export async function desactiverPush() {
  const reg = await navigator.serviceWorker.getRegistration('/')
  const abo = reg ? await reg.pushManager.getSubscription() : null
  if (!abo) return null
  const endpoint = abo.endpoint
  await abo.unsubscribe()
  return endpoint
}
