import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { decoderPolyline } from '../../lib/polyline.js'

// Carte d'une activité Strava : le tracé GPS sur un fond OpenStreetMap, avec le départ et l'arrivée.
// Chargée à la demande (Leaflet n'alourdit pas le reste du site) ; visible de l'adhérent seul, comme le reste de l'écran.
export default function CarteTrace({ activite, couleur, titre, details, onClose }) {
  const boite = useRef(null)
  const fermer = useRef(null)

  useEffect(() => {
    const points = decoderPolyline(activite.trace)
    const carte = L.map(boite.current, { scrollWheelZoom: true, zoomControl: true })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
    }).addTo(carte)
    const ligne = L.polyline(points, { color: couleur, weight: 4, opacity: 0.9 }).addTo(carte)
    const plot = (p, fond, libelle) => L.circleMarker(p, { radius: 6, color: '#fff', weight: 2, fillColor: fond, fillOpacity: 1 }).bindTooltip(libelle).addTo(carte)
    // l'arrivée d'abord : sur une boucle, le départ reste visible par-dessus
    plot(points[points.length - 1], '#1C1917', 'Arrivée')
    plot(points[0], '#2F7D6D', 'Départ')
    carte.fitBounds(ligne.getBounds(), { padding: [24, 24] })
    return () => carte.remove()
  }, [activite.trace, couleur])

  useEffect(() => {
    const prec = document.activeElement
    fermer.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prec?.focus?.()
    }
  }, [onClose])

  return (
    <div className="trace-carte" role="dialog" aria-modal="true" aria-label={`Tracé : ${activite.nom}`} onClick={onClose}>
      <div className="trace-carte__boite" onClick={(e) => e.stopPropagation()}>
        <div className="trace-carte__tete">
          <div>
            <b>{titre}</b>
            <small>{details}</small>
          </div>
          <button type="button" className="trace-carte__fermer" ref={fermer} onClick={onClose} aria-label="Fermer la carte">✕</button>
        </div>
        <div className="trace-carte__carte" ref={boite} />
        <div className="trace-carte__pied">
          <span><i style={{ background: '#2F7D6D' }} /> Départ <i style={{ background: '#1C1917' }} /> Arrivée</span>
          <a href={`https://www.strava.com/activities/${activite.id}`} target="_blank" rel="noopener noreferrer" className="strava-lien">Voir sur Strava ↗</a>
        </div>
      </div>
    </div>
  )
}
