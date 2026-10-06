import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { getToken, setToken as persistToken, clearToken } from '../../lib/session.js'
import { getTheme, setTheme as applyThemeChoice } from '../../lib/theme.js'
import PasswordField from '../../components/PasswordField.jsx'
import AboutContent from '../../components/AboutContent.jsx'
import { ord } from '../../components/Ord.jsx'
import ChatPanel from './Chat.jsx'
import RolesPanel from './RolesPanel.jsx'
import { useChat } from '../../lib/chat.js'

const TABS = [
  { id: 'overview', label: 'Tableau de bord' },
  { id: 'chat', label: 'Messagerie' },
  { id: 'trombi', label: 'Trombinoscope' },
  { id: 'courses', label: 'Nos Courses' },
  { id: 'resultats', label: 'Résultats' },
  { id: 'records', label: 'Records du Club' },
  { id: 'reseaute', label: 'SAM Réseaute' },
  { id: 'documents', label: 'Plans & Documents' },
  { id: 'vieduclub', label: 'Vie du Club' },
  { id: 'admin', label: 'Admin Club', badge: 'Bureau' },
  { id: 'droitsBureau', label: 'Rôles et droits', badge: 'Admin' },
]

// Reprend les rubriques réelles de "Le Club > Vie du Club" et "Préparation".
// Contenu détaillé : histoire/terrain/marche repris du vrai site (public,
// pages "Qui sommes-nous"/"Histoire"/"Terrain de jeu"/"Marche nordique") ;
// conseil d'administration = noms et rôles déjà publics, sans coordonnées ;
// maillots/règles/ressources = contenu générique, non scrapé du vrai site.
const VIE_DU_CLUB_CARDS = [
  {
    kind: 'Gouvernance', titre: 'Conseil d’Administration',
    texte: 'Composition du Conseil d’Administration de la SAM Paris 12.',
    detail: {
      intro: 'Le club est administré par un bureau bénévole, élu en Assemblée Générale.',
      liste: [
        ['Marie Frank', 'Présidente'],
        ['Jean-Pierre Schulz', 'Secrétaire Général'],
        ['David Madelaine', 'Trésorier'],
        ['Germaine Jallas', 'Présidente d’honneur'],
        ['Claude Mercier', 'Vice-Président'],
        ['Alain Temin', 'Vice-Président'],
        ['Diana Temin', 'Secrétaire générale adjointe'],
        ['Michaëlle Simkovitch', 'Entraîneure'],
        ['Jérôme Gay', 'Entraîneur'],
        ['Daniel Lichtenauer', 'Entraîneur'],
        ['Anne Corbel-Trinh', 'Référente discrimination sexuelle et sexiste'],
        ['Frédéric Magne', 'SAM Réseaute'],
        ['Laurent Attal', 'Gentil Organisateur'],
        ['Philippe Durand', 'Site internet'],
      ],
    },
  },
  {
    kind: 'Histoire', titre: 'Histoire du Club',
    texte: 'Résumé de l’histoire de la SAM, de 1887 à nos jours.',
    detail: {
      paragraphes: [
        "Le club trouve son origine en 1887, autour d'un groupe de joueurs de tambourin constitué à Montrouge, place Denfert-Rochereau (sur le territoire des anciennes fortifications). Le 1er juin 1890, ce groupe se structure en société sportive parrainée par le Comité de Propagation des Exercices Physiques : la Société Athlétique de Montrouge (SAM) était née.",
        "Les décennies suivantes voient le club devenir l'un des plus importants clubs multisports de Paris, avec des sections tambourin, athlétisme, pelote basque, cyclisme, football, rugby et natation, jusqu'à dépasser 1500 adhérents au début du XXe siècle.",
        "Après une interruption liée à la Première Guerre mondiale, le club est reconstitué en 1920, puis retrouve une nouvelle vie en 1946 au Stade Léo Lagrange, se recentrant progressivement sur la course à pied.",
        "En 1998, la Société Athlétique de Montrouge devient la SA Montrouge Paris 12, ancrée dans le 12e arrondissement. En 2005, le club reprend l'organisation des Foulées d'Aligre, qui deviennent Les Foulées du 12ème. En 2019, le nom d'usage devient le nom officiel : SAM Paris 12.",
        "Aujourd'hui, la SAM Paris 12 est le premier club d'athlétisme hors stade de Paris, avec plus de 680 adhérents.",
      ],
    },
  },
  {
    kind: 'Équipement', titre: 'Maillots du Club',
    texte: 'Comment se procurer les maillots et accessoires aux couleurs du club.',
    detail: {
      paragraphes: [
        "Le maillot officiel du club (rouge, hexagone SAM Paris 12) est disponible auprès du bureau lors des permanences d'inscription, ou sur commande groupée organisée en début de saison.",
        "Notre partenaire Team Outdoor propose un tarif préférentiel aux adhérents sur une sélection d'équipements running et trail — présentez votre licence en boutique ou en ligne.",
        "Pour une commande groupée (sacs, vestes, accessoires), une annonce est publiée dans l'agenda du club avec les tailles et délais.",
      ],
    },
  },
  {
    kind: 'Règlement', titre: 'Respectons les règles',
    texte: 'Règles de vie sociale et d’équité sportive au sein du club.',
    detail: {
      paragraphes: [
        "Le club s'engage à accueillir tous les publics sans discrimination et à promouvoir une pratique inclusive de l'athlétisme.",
        "Les valeurs partagées par les adhérents : respect des règles sportives, esprit d'équipe et solidarité, éthique et fair-play — sur le terrain comme dans les échanges au sein du club.",
        "Toute question ou signalement peut être adressé au bureau ou, pour les questions de discrimination, à la référente dédiée du Conseil d'Administration.",
      ],
    },
  },
  {
    kind: 'Entraînement', titre: 'Notre terrain de jeu',
    texte: 'Stades, points de RDV et parcours d’entraînement (Bois de Vincennes et Île-de-France).',
    detail: {
      paragraphes: [
        "Le Bois de Vincennes est le terrain d'entraînement principal du club : boisé, plat pour l'essentiel, il permet de varier les parcours toute l'année.",
      ],
      liste: [
        ['Stade Léo Lagrange', 'Point de RDV de toutes les séances, et lieu du fractionné sur piste (400 m).'],
        ['Circuit Michel Jazy', "2,3 km sur terrain souple et entièrement boisé, tracé par le champion du même nom."],
        ['Butte aux Canons', "Ancien terrain d'entraînement militaire, aujourd'hui utilisé pour le renforcement musculaire des trailers."],
        ['Circuit Kiosque', "860 m, utilisé pour enchaîner les tours sans récupération."],
        ['Circuit Cross', "2 700 m, 80 m de dénivelé par tour."],
        ['Sorties du samedi (Trail)', "Bures-sur-Yvette, 25 bosses de Fontainebleau, parc de Saint-Cloud, Buttes Chaumont, 100 marches de Champigny."],
      ],
    },
  },
  {
    kind: 'Discipline', titre: 'La Marche (Nordique Sportive & Loisir)',
    texte: 'Horaires, encadrement et informations pratiques pour les deux sections marche.',
    detail: {
      paragraphes: [
        "La Marche Nordique Sportive est une discipline athlétique à part entière (FFA), dérivée du ski de fond, qui mobilise environ 80 % des chaînes musculaires tout en réduisant l'impact sur les articulations.",
        "Séances encadrées : mardi 19h30–21h00 et jeudi 19h30–21h30 (départ Carrefour de la Conservation), dimanche 9h30–11h30 (départ Stade Léo Lagrange).",
        "La Marche Loisir, section créée en 2012, propose une pratique plus détendue, sans objectif de compétition.",
        "Contact section marche : entraineurmns@samparis12.org",
      ],
    },
  },
  {
    kind: 'Pratique', titre: 'Ressources',
    texte: 'Liens et outils utiles pour les adhérents (FFA, plateformes d’inscription, etc.).',
    detail: {
      liste: [
        ['Portail FFA (licence & PPS)', 'Gestion de votre licence et de votre Parcours de Prévention Santé.'],
        ['Plans d’entraînement', 'Disponibles dans l’onglet Plans & Documents.'],
        ['Calendrier des compétitions FFA', 'Recherche de courses officielles par région et distance.'],
        ['Objets perdus', 'objetsperdus@samparis12.org'],
      ],
    },
  },
]

const ADMIN_CARDS = [
  {
    titre: 'Gérer les événements',
    texte: 'Créer, modifier ou clôturer les événements de l’agenda du club (compétitions, séances spéciales, vie associative).',
    detail: {
      type: 'events',
      liste: [
        ['Test VMA 2026', 'Mardi 29 septembre 2026', 'Publié'],
        ['Commande de sac d’hydratation KINETIK', 'Dimanche 18 octobre 2026', 'Publié'],
        ['Ekiden de Paris', 'Dimanche 1 novembre 2026', 'Inscriptions closes'],
      ],
    },
  },
  {
    titre: 'Inscriptions aux événements',
    texte: 'Suivre et gérer les inscriptions des adhérents aux événements créés.',
    detail: {
      type: 'inscriptions',
      liste: [
        ['Semi-Marathon de Boulogne-Billancourt', 38],
        ['Cross Régional d’Île-de-France', 24],
        ['Les Foulées du 12ème', 85],
        ['Marathon de Paris', 62],
      ],
    },
  },
]

// Taxonomie reprise du vrai espace adhérent (trombinoscope.php)
const ACTIVITY_FILTERS = ['Toutes les activités', 'Running', 'Marche Nordique Sportive', 'Marche Loisir']
const STATUS_FILTERS = ['Adhérents 2027', 'Anciens adhérents', 'Nouveaux adhérents']

// Taxonomie reprise du vrai espace adhérent (reseau.php)
const NATURE_FILTERS = ['Toutes', 'Bons plans', 'Le Bon Coin', 'Rendre service', 'Vie professionnelle']

const RESEAU_POSTS = [
  { nature: 'Le Bon Coin', domaine: 'Sport', par: 'Julien M. (Adhérent Running)', date: '8 Septembre 2026', titre: 'Don / Cède chaussures Vaporfly Next% taille 43 (très peu servies)', texte: "Achetées trop petites pour mon pied, courues 30 km seulement. À donner ou troquer contre une bière après la séance du jeudi au club ! Me contacter par WhatsApp." },
  { nature: 'Rendre service', domaine: 'Santé', par: 'Élise B. (Marche Nordique)', date: '3 Septembre 2026', titre: 'Recommandation cabinet kiné du sport spécialisé genou & foulée (Nation)', texte: "Pour ceux qui préparent le marathon ou ont des douleurs d'essuie-glace : je vous recommande le cabinet de rééducation sportive rue du Faubourg Saint-Antoine, bilans de foulée très professionnels." },
  { nature: 'Bons plans', domaine: 'Sport', par: 'Nicolas P. (Trail)', date: '1er Septembre 2026', titre: 'Sortie off samedi matin à Bures-sur-Yvette — 2 places disponibles', texte: "Départ 8h30 Porte de Charenton en voiture. Parcours de 22 km / 500m D+ en vallée de Chevreuse. Retour vers 12h30. Me contacter au vestiaire mardi soir." },
]

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

function firstLetter(nom) {
  return (nom || '').normalize('NFD').replace(/[̀-ͯ]/g, '').charAt(0).toUpperCase()
}

function initials(nom) {
  return nom.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

function Avatar({ photoUrl, nom, size }) {
  const base = { width: size, height: size, borderRadius: '50%', border: '2px solid var(--vermilion)', flex: 'none' }
  if (photoUrl) {
    return <img src={photoUrl} alt={nom} style={{ ...base, objectFit: 'cover' }} />
  }
  return (
    <div style={{ ...base, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 'bold', fontSize: size * 0.32, color: 'var(--vermilion)' }}>
      {initials(nom)}
    </div>
  )
}

// AvatarButton : même rendu que Avatar, mais cliquable pour ouvrir la fiche
// détaillée de l'adhérent (comme dans le Trombinoscope).
function AvatarButton({ photoUrl, nom, size, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%' }}
      aria-label={`Voir la fiche de ${nom}`}
    >
      <Avatar photoUrl={photoUrl} nom={nom} size={size} />
    </button>
  )
}

function MemberDetailModal({ member, token, onClose }) {
  const [results, setResults] = useState([])
  const [resultsLoading, setResultsLoading] = useState(true)

  useEffect(() => {
    if (!member) return
    setResultsLoading(true)
    api.getMemberResults(token, member.id, 5)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setResultsLoading(false))
  }, [member, token])

  if (!member) return null
  return (
    <div
      role="dialog" aria-modal="true"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surface)', border: '1px solid var(--line)', maxWidth: 480, width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: '2rem', position: 'relative', textAlign: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          style={{ position: 'absolute', top: '1rem', right: '1rem', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid var(--line)', cursor: 'pointer', color: 'var(--ink)' }}
        >
          ✕
        </button>

        <div style={{ margin: '0 auto 1rem', display: 'flex', justifyContent: 'center' }}>
          <Avatar photoUrl={member.photoUrl} nom={`${member.prenom} ${member.nom}`} size={84} />
        </div>
        <h3 style={{ fontSize: '1.5rem', textTransform: 'uppercase' }}>{member.prenom} {member.nom}</h3>
        {member.role && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--vermilion)', fontWeight: 'bold' }}>{member.role}</span>}
        {(member.groupe || member.statut) && (
          <div style={{ marginTop: '0.5rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--stone)', textTransform: 'uppercase', padding: '0.15rem 0.5rem', background: 'var(--surface-2)' }}>{member.groupe} · {member.statut}</span>
          </div>
        )}

        <div style={{ textAlign: 'left', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--line)' }}>
          <span className="eyebrow">Je me présente</span>
          <p style={{ fontSize: '0.9rem', color: 'var(--ink-soft)', marginTop: '0.4rem' }}>
            {member.trombiBio || (member.groupe ? `Membre du groupe ${member.groupe}.` : 'Aucune présentation renseignée.')}
          </p>
        </div>

        {(member.trombiHabite || member.trombiNaissance || member.trombiOrigine || member.trombiProfession || member.trombiEmployeur || member.trombiDistanceFavorite || member.trombiEmail || member.trombiTelephone) && (
          <div style={{ textAlign: 'left', marginTop: '1.2rem', paddingTop: '1.2rem', borderTop: '1px solid var(--line)', display: 'grid', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
            {member.trombiHabite && <p>🏠 J'habite {member.trombiHabite}</p>}
            {member.trombiNaissance && <p>🎂 Né le {member.trombiNaissance}</p>}
            {member.trombiOrigine && <p>📍 Originaire de {member.trombiOrigine}</p>}
            {(member.trombiProfession || member.trombiEmployeur) && (
              <p>💼 {[member.trombiProfession, member.trombiEmployeur].filter(Boolean).join(' — ')}</p>
            )}
            {member.trombiDistanceFavorite && <p>🏃 Distance favorite : {member.trombiDistanceFavorite}</p>}
            {member.trombiEmail && <p>✉️ <a href={`mailto:${member.trombiEmail}`} style={{ color: 'var(--vermilion)' }}>{member.trombiEmail}</a></p>}
            {member.trombiTelephone && <p>📞 {member.trombiTelephone}</p>}
          </div>
        )}

        <div style={{ textAlign: 'left', marginTop: '1.2rem', paddingTop: '1.2rem', borderTop: '1px solid var(--line)' }}>
          <span className="eyebrow">Agenda</span>
          <p style={{ fontSize: '0.9rem', color: 'var(--ink-soft)', marginTop: '0.4rem' }}>Aucune course à venir renseignée pour le moment.</p>
        </div>

        <div style={{ textAlign: 'left', marginTop: '1.2rem', paddingTop: '1.2rem', borderTop: '1px solid var(--line)' }}>
          <span className="eyebrow">Derniers résultats</span>
          {resultsLoading ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--stone)', marginTop: '0.4rem' }}>Chargement…</p>
          ) : results.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--stone)', marginTop: '0.4rem' }}>Aucun résultat enregistré pour le moment.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.6rem' }}>
              {results.map((r) => (
                <div key={r.raceId} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', padding: '0.6rem 0.8rem', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <span><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--stone)', marginRight: '0.5rem' }}>{formatRaceDate(r.raceDate)}</span><b>{r.raceTitre}</b></span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{formatTempsCourse(r.tempsSecondes)}</span>
                  </div>
                  {(r.classementGeneral || r.categorie) && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--ink-soft)', marginTop: '0.25rem' }}>
                      {r.classementGeneral && `Général : ${r.classementGeneral}${r.classementGeneralTotal ? `/${r.classementGeneralTotal}` : ''}`}
                      {r.classementGeneral && r.categorie && ' · '}
                      {r.categorie}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [search, setSearch] = useState('')
  const [activity, setActivity] = useState('Toutes les activités')
  const [status, setStatus] = useState(null)
  const [letter, setLetter] = useState(null)
  const [nature, setNature] = useState('Toutes')
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [openVieCard, setOpenVieCard] = useState(null)
  const [openAdminCard, setOpenAdminCard] = useState(null)
  const [openMember, setOpenMember] = useState(null)
  const [aboutOpen, setAboutOpen] = useState(false)

  const [token, setAuthToken] = useState(() => getToken())
  const [me, setMe] = useState(null)
  const [members, setMembers] = useState([])
  const [myUpcomingRaces, setMyUpcomingRaces] = useState([])
  const chat = useChat(token, me?.id)
  // Fonctionnalités d'administration du rôle de l'adhérent connecté (voir l'écran Rôles et droits)
  const can = (feature) => !!me?.features?.includes(feature)

  // Nombre de messages à lire : dans le titre de l'onglet « (3) … » et sur l'icône de l'application installée.
  useEffect(() => {
    const n = chat.unreadTotal
    const titre = document.title.replace(/^\(\d+\+?\)\s*/, '')
    document.title = n > 0 ? `(${n > 99 ? '99+' : n}) ${titre}` : titre
    try {
      if (n > 0) navigator.setAppBadge?.(n)?.catch?.(() => {})
      else navigator.clearAppBadge?.()?.catch?.(() => {})
    } catch { /* non pris en charge */ }
    return () => {
      document.title = document.title.replace(/^\(\d+\+?\)\s*/, '')
      try { navigator.clearAppBadge?.()?.catch?.(() => {}) } catch { /* ignore */ }
    }
  }, [chat.unreadTotal])

  useEffect(() => {
    if (!token) {
      navigate('/espace-adherent')
      return
    }
    let cancelled = false
    Promise.all([api.getMe(token), api.listMembers(token)])
      .then(([meData, membersData]) => {
        if (cancelled) return
        setMe(meData)
        setMembers(membersData)
      })
      .catch(() => {
        if (cancelled) return
        clearToken()
        navigate('/espace-adherent')
      })
    return () => { cancelled = true }
  }, [token, navigate])

  useEffect(() => {
    if (!token || !me?.id) return
    let cancelled = false
    api.getMemberUpcomingRaces(token, me.id)
      .then((data) => { if (!cancelled) setMyUpcomingRaces(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [token, me?.id])

  function handleLogout() {
    clearToken()
    navigate('/')
  }

  function handlePasswordChanged(newToken) {
    persistToken(newToken)
    setAuthToken(newToken)
  }

  function handleMeUpdate(updated) {
    setMe(updated)
    setMembers((prev) => prev.map((m) => (
      m.id === updated.id
        ? {
          ...m,
          prenom: updated.prenom, nom: updated.nom, role: updated.role, groupe: updated.groupe, statut: updated.statut, sexe: updated.sexe, photoUrl: updated.photoUrl,
          trombiHabite: updated.trombiHabite, trombiNaissance: updated.trombiNaissance, trombiOrigine: updated.trombiOrigine,
          trombiEmail: updated.trombiEmail, trombiTelephone: updated.trombiTelephone, trombiProfession: updated.trombiProfession,
          trombiEmployeur: updated.trombiEmployeur, trombiDistanceFavorite: updated.trombiDistanceFavorite, trombiBio: updated.trombiBio,
        }
        : m
    )))
  }

  function switchTab(id) {
    setActiveTab(id)
    setOpenVieCard(null)
    setOpenAdminCard(null)
  }

  const filteredReseau = useMemo(() => {
    return RESEAU_POSTS.filter((p) => nature === 'Toutes' || p.nature === nature)
  }, [nature])

  const trombiBeforeLetter = useMemo(() => {
    const q = search.toLowerCase()
    return members.filter((m) => {
      const matchesQuery = `${m.prenom} ${m.nom}`.toLowerCase().includes(q) || m.role.toLowerCase().includes(q)
      const matchesActivity = activity === 'Toutes les activités' || m.groupe === activity
      const matchesStatus = !status || m.statut === status
      return matchesQuery && matchesActivity && matchesStatus
    })
  }, [members, search, activity, status])

  const availableLetters = useMemo(
    () => new Set(trombiBeforeLetter.map((m) => firstLetter(m.nom))),
    [trombiBeforeLetter]
  )

  const filteredTrombi = useMemo(() => {
    if (!letter) return trombiBeforeLetter
    return trombiBeforeLetter.filter((m) => firstLetter(m.nom) === letter)
  }, [trombiBeforeLetter, letter])

  return (
    <div className="adherent-layout">
      <header className="adherent-header">
        <div className="shell adherent-top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/')} className="link-button">
              ← Site public
            </button>
            <span style={{ color: 'var(--line)' }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <img src="/logo.png" alt="SAM Paris 12" style={{ width: 26, height: 24, objectFit: 'contain' }} />
              <span className="dot-status" />
              <b style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                Espace Adhérent SAM Paris 12
              </b>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', padding: '0.15rem 0.5rem', background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--stone)', textTransform: 'uppercase' }}>
                Saison 2026-2027
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '0.6rem 1.2rem' }}>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setProfileMenuOpen((v) => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', padding: '0.3rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', maxWidth: '100%' }}
                aria-label="Mon profil"
              >
                {me && <Avatar photoUrl={me.photoUrl} nom={`${me.prenom} ${me.nom}`} size={40} />}
                <span style={{ minWidth: 0 }}>
                  <b style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '15rem' }}>{me ? `${me.prenom} ${me.nom}` : '…'}</b>
                  <span style={{ color: 'var(--ink-soft)', fontSize: '0.66rem' }}>
                    {!me ? 'Chargement…' : (me.numeroLicence ? `FFA N° ${me.numeroLicence}` : 'Licence non renseignée')}
                  </span>
                </span>
                <span style={{ color: 'var(--stone)' }}>{profileMenuOpen ? '▴' : '▾'}</span>
              </button>
              {profileMenuOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '0.4rem', background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', minWidth: 200, zIndex: 50, fontFamily: 'var(--font-mono)', fontSize: '0.72rem', textAlign: 'left' }}>
                  <button
                    onClick={() => { setActiveTab('profil'); setProfileMenuOpen(false) }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '0.7rem 0.9rem', cursor: 'pointer', color: 'var(--ink)' }}
                  >
                    Tes informations
                  </button>
                  <button
                    onClick={() => { setActiveTab('documents'); setProfileMenuOpen(false) }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '0.7rem 0.9rem', cursor: 'pointer', color: 'var(--ink)', borderTop: '1px solid var(--line)' }}
                  >
                    Tes documents
                  </button>
                </div>
              )}
            </div>
            <button onClick={handleLogout} className="btn btn--ghost" style={{ padding: '0.45rem 0.85rem', fontSize: '0.68rem' }}>
              Déconnexion
            </button>
          </div>
        </div>

        <div className="shell">
          <nav className="adherent-tabs-nav">
            {TABS.filter((tab) => {
              if (tab.id === 'admin') return can('membres.admin')
              if (tab.id === 'droitsBureau') return can('roles.admin')
              return true
            }).map((tab) => (
              <button
                key={tab.id}
                className={`adh-tab-btn${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => switchTab(tab.id)}
              >
                {tab.label}
                {tab.id === 'chat' && chat.unreadTotal > 0 && (
                  <span className="adh-tab-badge" aria-label={`${chat.unreadTotal} message${chat.unreadTotal > 1 ? 's' : ''} à lire`}>
                    {chat.unreadTotal > 99 ? '99+' : chat.unreadTotal}
                  </span>
                )}
                {tab.badge && (
                  <span style={{ marginLeft: '0.4rem', fontSize: '0.6rem', padding: '0.1rem 0.35rem', background: 'var(--vermilion)', color: '#fff', borderRadius: 2 }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {profileMenuOpen && (
        // z-index sous le header (40) pour que le menu déroulant, imbriqué
        // dans le header, reste cliquable ; au-dessus de <main> (statique)
        // pour que cliquer n'importe où en dehors ferme bien le menu.
        <div onClick={() => setProfileMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 39 }} />
      )}

      <main className="shell" style={{ paddingBlock: '2rem', flex: 1 }}>
        {activeTab === 'overview' && !me && (
          <p style={{ color: 'var(--stone)' }}>Chargement de votre profil…</p>
        )}
        {activeTab === 'overview' && me && (
          <div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderLeft: '4px solid var(--vermilion)', padding: '1.5rem', marginBottom: '1.8rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--line)', marginBottom: '1.2rem' }}>
                <div>
                  <span className="eyebrow">Profil Membre Actif</span>
                  <h2 style={{ fontSize: '1.8rem', textTransform: 'uppercase', marginTop: '0.2rem' }}>{me.prenom} {me.nom}</h2>
                </div>
                {me.numeroLicence ? (
                  <div style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '0.4rem 0.8rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    ✓ Licence N° {me.numeroLicence}
                  </div>
                ) : (
                  <div style={{ background: 'var(--surface-2)', color: 'var(--ink-soft)', border: '1px solid var(--line)', padding: '0.4rem 0.8rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    Licence non renseignée
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                <div>
                  <span style={{ color: 'var(--stone)', display: 'block', textTransform: 'uppercase', fontSize: '0.68rem' }}>Numéro Licence</span>
                  <b style={{ fontSize: '0.95rem' }}>{me.numeroLicence || 'Non renseigné'}</b>
                </div>
                <div>
                  <span style={{ color: 'var(--stone)', display: 'block', textTransform: 'uppercase', fontSize: '0.68rem' }}>Groupe d'entraînement</span>
                  <b style={{ fontSize: '0.95rem' }}>{me.groupe || '—'}</b>
                </div>
                <div>
                  <span style={{ color: 'var(--stone)', display: 'block', textTransform: 'uppercase', fontSize: '0.68rem' }}>Rôle dans l'application</span>
                  <b style={{ fontSize: '0.95rem' }}>{me.roleApp?.nom || '—'}</b>
                </div>
                <div>
                  <span style={{ color: 'var(--stone)', display: 'block', textTransform: 'uppercase', fontSize: '0.68rem' }}>Statut</span>
                  <b style={{ fontSize: '0.95rem' }}>{me.statut || '—'}</b>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.8rem' }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '1.5rem' }}>
                <span className="eyebrow" style={{ color: 'var(--vermilion)', fontWeight: 'bold' }}>Prochain rendez-vous club</span>
                <h3 style={{ fontSize: '1.4rem', textTransform: 'uppercase', marginTop: '0.3rem' }}>Mardi soir · Fractionné VMA court sur piste</h3>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--ink-soft)', margin: '0.8rem 0 0', lineHeight: 1.6 }}>
                  Lieu : <strong>Stade Léo Lagrange</strong> (Porte de Charenton)<br />
                  Horaires : Échauffement <strong>18h30</strong> (groupe 1) ou <strong>19h30</strong> (groupe 2)<br />
                  Séance type : 20 min échauffement + gammes + 10x400m r=1' + retour au calme.
                </p>
                <div style={{ marginTop: '1.2rem', paddingTop: '0.8rem', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                  <span style={{ color: 'var(--stone)' }}>Vestiaires &amp; douches ouverts</span>
                  <span style={{ color: 'var(--vermilion)', fontWeight: 'bold' }}>RDV Piste 400m</span>
                </div>
              </div>

              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '1.5rem' }}>
                <span className="eyebrow" style={{ color: 'var(--vermilion)', fontWeight: 'bold' }}>Ma prochaine course</span>
                {myUpcomingRaces.length === 0 ? (
                  <>
                    <h3 style={{ fontSize: '1.4rem', textTransform: 'uppercase', marginTop: '0.3rem' }}>Aucune course à venir</h3>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--ink-soft)', margin: '0.8rem 0 0', lineHeight: 1.6 }}>
                      Inscris-toi à une course depuis l'onglet Nos Courses pour la retrouver ici.
                    </p>
                    <div style={{ marginTop: '1.2rem', paddingTop: '0.8rem', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                      <button onClick={() => setActiveTab('courses')} className="link-button" style={{ color: 'var(--vermilion)', fontWeight: 'bold' }}>
                        Voir Nos Courses →
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 style={{ fontSize: '1.4rem', textTransform: 'uppercase', marginTop: '0.3rem' }}>{myUpcomingRaces[0].titre}</h3>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--ink-soft)', margin: '0.8rem 0 0', lineHeight: 1.6 }}>
                      Date : <strong>{formatRaceDate(myUpcomingRaces[0].date)}</strong><br />
                      {myUpcomingRaces[0].lieu && <>Lieu : <strong>{myUpcomingRaces[0].lieu}</strong><br /></>}
                      {myUpcomingRaces[0].distanceKm > 0 && <>Distance : <strong>{myUpcomingRaces[0].distanceKm} km</strong><br /></>}
                      {myUpcomingRaces[0].inscritsCount} adhérent{myUpcomingRaces[0].inscritsCount > 1 ? 's' : ''} du SAM Paris 12 inscrit{myUpcomingRaces[0].inscritsCount > 1 ? 's' : ''} !
                    </p>
                    <div style={{ marginTop: '1.2rem', paddingTop: '0.8rem', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                      <button onClick={() => setActiveTab('courses')} className="link-button" style={{ color: 'var(--vermilion)', fontWeight: 'bold' }}>
                        Voir la liste des inscrits →
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '1.5rem' }}>
              <span className="eyebrow" style={{ fontWeight: 'bold', marginBottom: '1rem', display: 'block' }}>Informations &amp; Vie Associative</span>
              <div style={{ display: 'grid', gap: '1.4rem' }}>
                <div style={{ borderLeft: '2px solid var(--vermilion)', paddingLeft: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                    <span style={{ color: 'var(--vermilion)', fontWeight: 'bold' }}>Marie Frank (Présidente)</span>
                    <span style={{ color: 'var(--stone)' }}>10 Septembre 2026</span>
                  </div>
                  <h4 style={{ fontSize: '1.2rem', textTransform: 'uppercase', marginTop: '0.2rem' }}>Reprise des entraînements au Stade Léo Lagrange</h4>
                  <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '0.3rem 0 0' }}>
                    Bienvenue à toutes et tous pour cette nouvelle saison ! Les créneaux du mardi et du jeudi soir reprennent aux horaires habituels (échauffements à 18h30 et 19h30). Pensez à vérifier la validation de votre PPS sur le portail FFA.
                  </p>
                </div>

                <div style={{ borderLeft: '2px solid var(--vermilion)', paddingLeft: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                    <span style={{ color: 'var(--vermilion)', fontWeight: 'bold' }}>Comité d'Organisation</span>
                    <span style={{ color: 'var(--stone)' }}>5 Septembre 2026</span>
                  </div>
                  <h4 style={{ fontSize: '1.2rem', textTransform: 'uppercase', marginTop: '0.2rem' }}>{ord('Bénévoles pour les Foulées du 12ème')}</h4>
                  <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '0.3rem 0 0' }}>
                    L'organisation des Foulées du 12ème recherche des signaleurs et des responsables ravitaillement pour l'édition du printemps. Inscrivez-vous dès maintenant via l'onglet Nos Courses.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trombi' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <span className="eyebrow">Annuaire des membres &amp; Encadrement</span>
              <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', marginTop: '0.2rem' }}>Trombinoscope</h2>
              <p style={{ fontSize: '0.95rem', color: 'var(--ink-soft)', marginTop: '0.3rem' }}>Faites connaissance avec les adhérents, le bureau et les entraîneurs bénévoles diplômés du club.</p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '1.2rem' }}>
              <button
                type="button"
                onClick={() => setLetter(null)}
                className={`btn ${!letter ? 'btn--solid' : 'btn--ghost'}`}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.7rem' }}
              >
                Tous
              </button>
              {ALPHABET.map((l) => {
                const has = availableLetters.has(l)
                return (
                  <button
                    key={l}
                    type="button"
                    disabled={!has}
                    onClick={() => setLetter(letter === l ? null : l)}
                    className={`btn ${letter === l ? 'btn--solid' : 'btn--ghost'}`}
                    style={{ padding: '0.35rem 0.55rem', minWidth: 30, fontSize: '0.72rem', fontWeight: 'bold', opacity: has ? 1 : 0.3, cursor: has ? 'pointer' : 'default' }}
                  >
                    {l}
                  </button>
                )
              })}
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '1rem', marginBottom: '1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
              <input
                type="text"
                placeholder="Rechercher par prénom, nom ou fonction..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ padding: '0.6rem 0.8rem', background: '#fff', color: '#1C1917', border: '1px solid var(--line)', minWidth: 280, width: '100%', fontFamily: 'inherit', fontSize: 'inherit', marginBottom: '0.8rem' }}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem' }}>
                {ACTIVITY_FILTERS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setActivity(a)}
                    className={`btn ${activity === a ? 'btn--solid' : 'btn--ghost'}`}
                    style={{ padding: '0.4rem 0.7rem', fontSize: '0.7rem' }}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                <button
                  onClick={() => setStatus(null)}
                  className={`btn ${!status ? 'btn--solid' : 'btn--ghost'}`}
                  style={{ padding: '0.4rem 0.7rem', fontSize: '0.7rem' }}
                >
                  Tous statuts
                </button>
                {STATUS_FILTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`btn ${status === s ? 'btn--solid' : 'btn--ghost'}`}
                    style={{ padding: '0.4rem 0.7rem', fontSize: '0.7rem' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
              {filteredTrombi.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setOpenMember(m)}
                  style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--vermilion)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)' }}
                >
                  <div style={{ marginBottom: '0.8rem' }}>
                    <Avatar photoUrl={m.photoUrl} nom={`${m.prenom} ${m.nom}`} size={60} />
                  </div>
                  <h4 style={{ fontSize: '1.2rem', textTransform: 'uppercase' }}>{m.prenom} {m.nom}</h4>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--vermilion)', fontWeight: 'bold', marginTop: '0.2rem' }}>{m.role}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--stone)', textTransform: 'uppercase', marginTop: '0.6rem', padding: '0.15rem 0.5rem', background: 'var(--surface-2)' }}>{m.groupe} · {m.statut}</span>
                </button>
              ))}
              {filteredTrombi.length === 0 && (
                <p style={{ color: 'var(--stone)' }}>Aucun membre ne correspond à cette recherche.</p>
              )}
            </div>

            {openMember && (
              <MemberDetailModal member={openMember} token={token} onClose={() => setOpenMember(null)} />
            )}
          </div>
        )}

        {activeTab === 'chat' && me && (
          <ChatPanel chat={chat} token={token} me={me} members={members} onExit={() => switchTab('overview')} />
        )}

        {activeTab === 'courses' && (
          <CoursesPanel token={token} me={me} members={members} />
        )}

        {activeTab === 'resultats' && (
          <ResultatsPanel token={token} me={me} members={members} />
        )}

        {activeTab === 'records' && (
          <RecordsPanel token={token} me={me} members={members} />
        )}

        {activeTab === 'reseaute' && (
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <span className="eyebrow">Entraide &amp; Communauté</span>
                <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', marginTop: '0.2rem' }}>SAM Réseaute</h2>
                <p style={{ fontSize: '0.95rem', color: 'var(--ink-soft)', marginTop: '0.3rem' }}>L'espace de partage d'annonces, de matériel, de covoiturage et de réseau professionnel entre adhérents.</p>
              </div>
              <button className="btn btn--solid" style={{ padding: '0.6rem 1.2rem', fontSize: '0.72rem' }}>+ Déposer une annonce</button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.2rem' }}>
              {NATURE_FILTERS.map((n) => (
                <button
                  key={n}
                  onClick={() => setNature(n)}
                  className={`btn ${nature === n ? 'btn--solid' : 'btn--ghost'}`}
                  style={{ padding: '0.4rem 0.7rem', fontSize: '0.7rem' }}
                >
                  {n}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gap: '1.2rem' }}>
              {filteredReseau.map((post) => (
                <div key={post.titre} style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <span>
                      <span style={{ padding: '0.15rem 0.5rem', background: 'var(--surface-2)', color: 'var(--vermilion)', fontWeight: 'bold', textTransform: 'uppercase' }}>{post.nature}</span>
                      {' '}
                      <span style={{ padding: '0.15rem 0.5rem', color: 'var(--stone)', textTransform: 'uppercase' }}>{post.domaine}</span>
                    </span>
                    <span style={{ color: 'var(--stone)' }}>Publié par <strong>{post.par}</strong> le {post.date}</span>
                  </div>
                  <h3 style={{ fontSize: '1.3rem', textTransform: 'uppercase' }}>{post.titre}</h3>
                  <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '0.4rem 0 0', lineHeight: 1.6 }}>{post.texte}</p>
                </div>
              ))}
              {filteredReseau.length === 0 && (
                <p style={{ color: 'var(--stone)' }}>Aucune contribution dans cette catégorie.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <DocumentsPanel token={token} me={me} />
        )}

        {activeTab === 'vieduclub' && (
          <div>
            {!openVieCard ? (
              <>
                <div style={{ marginBottom: '1.5rem' }}>
                  <span className="eyebrow">Gouvernance, histoire &amp; pratique</span>
                  <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', marginTop: '0.2rem' }}>Vie du Club</h2>
                  <p style={{ fontSize: '0.95rem', color: 'var(--ink-soft)', marginTop: '0.3rem' }}>Tout savoir sur l'association, son fonctionnement et ses lieux de pratique.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
                  {VIE_DU_CLUB_CARDS.map((c) => (
                    <div key={c.titre} style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <span className="eyebrow" style={{ color: 'var(--vermilion)', fontWeight: 'bold' }}>{c.kind}</span>
                        <h3 style={{ fontSize: '1.2rem', textTransform: 'uppercase', marginTop: '0.2rem' }}>{c.titre}</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--ink-soft)', margin: '0.5rem 0 0' }}>{c.texte}</p>
                      </div>
                      <div style={{ marginTop: '1.2rem', paddingTop: '0.8rem', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => setOpenVieCard(c.titre)} className="btn btn--ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.72rem' }}>Ouvrir →</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              (() => {
                const card = VIE_DU_CLUB_CARDS.find((c) => c.titre === openVieCard)
                return (
                  <div>
                    <button onClick={() => setOpenVieCard(null)} className="link-button" style={{ marginBottom: '1.2rem' }}>← Retour à Vie du Club</button>
                    <span className="eyebrow" style={{ color: 'var(--vermilion)', fontWeight: 'bold' }}>{card.kind}</span>
                    <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', marginTop: '0.2rem', marginBottom: '1.2rem' }}>{card.titre}</h2>
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '1.5rem', maxWidth: '68ch' }}>
                      {card.detail.intro && (
                        <p style={{ fontSize: '0.95rem', color: 'var(--ink-soft)', margin: '0 0 1.2rem', lineHeight: 1.6 }}>{card.detail.intro}</p>
                      )}
                      {card.detail.paragraphes && card.detail.paragraphes.map((p, i) => (
                        <p key={i} style={{ fontSize: '0.95rem', color: 'var(--ink-soft)', margin: i === 0 ? 0 : '1rem 0 0', lineHeight: 1.6 }}>{p}</p>
                      ))}
                      {card.detail.liste && (
                        <ul style={{ listStyle: 'none', padding: 0, margin: card.detail.paragraphes || card.detail.intro ? '1.2rem 0 0' : 0, display: 'grid', gap: '0.8rem' }}>
                          {card.detail.liste.map(([a, b]) => (
                            <li key={a} style={{ borderLeft: '2px solid var(--vermilion)', paddingLeft: '0.9rem' }}>
                              <b style={{ display: 'block', fontSize: '0.95rem' }}>{a}</b>
                              <span style={{ fontSize: '0.88rem', color: 'var(--ink-soft)' }}>{b}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )
              })()
            )}
          </div>
        )}

        {activeTab === 'admin' && !can('membres.admin') && (
          <p style={{ color: 'var(--stone)' }}>Cette section est réservée aux adhérents dont le rôle comprend « Administrer les adhérents ».</p>
        )}
        {activeTab === 'admin' && can('membres.admin') && (
          <div>
            {!openAdminCard ? (
              <>
                <div style={{ marginBottom: '1.5rem' }}>
                  <span className="eyebrow">Réservé au bureau du club</span>
                  <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', marginTop: '0.2rem' }}>Admin Club</h2>
                  <p style={{ fontSize: '0.95rem', color: 'var(--ink-soft)', marginTop: '0.3rem' }}>Outils de gestion réservés aux membres du bureau et de l'organisation.</p>
                </div>

                <AdminMembersPanel token={token} me={me} onMembersChanged={() => api.listMembers(token).then(setMembers).catch(() => {})} />

                <div style={{ marginTop: '2.2rem', marginBottom: '1rem' }}>
                  <b style={{ fontSize: '0.95rem', textTransform: 'uppercase' }}>Autres outils</b>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
                  {ADMIN_CARDS.map((c) => (
                    <div key={c.titre} style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '1.5rem' }}>
                      <h3 style={{ fontSize: '1.2rem', textTransform: 'uppercase' }}>{c.titre}</h3>
                      <p style={{ fontSize: '0.9rem', color: 'var(--ink-soft)', margin: '0.5rem 0 0' }}>{c.texte}</p>
                      <div style={{ marginTop: '1.2rem', paddingTop: '0.8rem', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => setOpenAdminCard(c.titre)} className="btn btn--solid" style={{ padding: '0.5rem 1rem', fontSize: '0.72rem' }}>Ouvrir →</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              (() => {
                const card = ADMIN_CARDS.find((c) => c.titre === openAdminCard)
                return (
                  <div>
                    <button onClick={() => setOpenAdminCard(null)} className="link-button" style={{ marginBottom: '1.2rem' }}>← Retour à Admin Club</button>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
                      <h2 style={{ fontSize: '2rem', textTransform: 'uppercase' }}>{card.titre}</h2>
                      {card.detail.type === 'events' && (
                        <button className="btn btn--solid" style={{ padding: '0.6rem 1.1rem', fontSize: '0.72rem' }}>+ Créer un événement</button>
                      )}
                    </div>

                    {card.detail.type === 'events' && (
                      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                          <thead>
                            <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', color: 'var(--stone)', textTransform: 'uppercase', fontSize: '0.68rem' }}>
                              <th style={{ padding: '0.8rem 1rem' }}>Événement</th>
                              <th style={{ padding: '0.8rem 1rem' }}>Date</th>
                              <th style={{ padding: '0.8rem 1rem' }}>Statut</th>
                              <th style={{ padding: '0.8rem 1rem' }} />
                            </tr>
                          </thead>
                          <tbody>
                            {card.detail.liste.map(([nom, date, statut]) => (
                              <tr key={nom} style={{ borderBottom: '1px solid var(--line)' }}>
                                <td style={{ padding: '0.8rem 1rem' }}><b>{nom}</b></td>
                                <td style={{ padding: '0.8rem 1rem', color: 'var(--ink-soft)' }}>{date}</td>
                                <td style={{ padding: '0.8rem 1rem' }}>{statut}</td>
                                <td style={{ padding: '0.8rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                  <button className="link-button" style={{ marginRight: '0.8rem' }}>Modifier</button>
                                  <button className="link-button" style={{ color: 'var(--vermilion)' }}>Supprimer</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {card.detail.type === 'inscriptions' && (
                      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                          <thead>
                            <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', color: 'var(--stone)', textTransform: 'uppercase', fontSize: '0.68rem' }}>
                              <th style={{ padding: '0.8rem 1rem' }}>Événement</th>
                              <th style={{ padding: '0.8rem 1rem' }}>Inscrits</th>
                              <th style={{ padding: '0.8rem 1rem' }} />
                            </tr>
                          </thead>
                          <tbody>
                            {card.detail.liste.map(([nom, count]) => (
                              <tr key={nom} style={{ borderBottom: '1px solid var(--line)' }}>
                                <td style={{ padding: '0.8rem 1rem' }}><b>{nom}</b></td>
                                <td style={{ padding: '0.8rem 1rem', color: 'var(--vermilion)', fontWeight: 'bold' }}>{count}</td>
                                <td style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>
                                  <button className="link-button">Exporter la liste</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })()
            )}
          </div>
        )}

        {activeTab === 'droitsBureau' && !can('roles.admin') && (
          <p style={{ color: 'var(--stone)' }}>Cette section est réservée aux adhérents dont le rôle comprend « Gérer les rôles et les droits ».</p>
        )}
        {activeTab === 'droitsBureau' && can('roles.admin') && (
          <RolesPanel token={token} />
        )}

        {activeTab === 'profil' && (
          <ProfilPanel token={token} me={me} onMeUpdate={handleMeUpdate} onPasswordChanged={handlePasswordChanged} />
        )}
      </main>

      <footer style={{ borderTop: '1px solid var(--line)', background: 'var(--surface)', padding: '1rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--stone)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.6rem 1.2rem', marginBottom: '0.6rem' }}>
          <button className="link-button" style={{ textTransform: 'none' }}>Plan du site</button>
          <button onClick={() => navigate('/adhesion/paiement')} className="link-button" style={{ textTransform: 'none' }}>Paiements Club</button>
          <button onClick={() => setAboutOpen(true)} className="link-button" style={{ textTransform: 'none' }}>À propos</button>
        </div>
        SAM Paris 12 · Espace réservé aux adhérents (démonstration) · Licence FFA N° 075043<br />
        Contact : <a href="mailto:contact@samparis12.org" style={{ textDecoration: 'underline' }}>contact@samparis12.org</a>
        {' '}· Objets perdus : <a href="mailto:objetsperdus@samparis12.org" style={{ textDecoration: 'underline' }}>objetsperdus@samparis12.org</a>
      </footer>

      {aboutOpen && (
        <AdminModal onClose={() => setAboutOpen(false)} maxWidth={560}>
          <AboutContent />
        </AdminModal>
      )}
    </div>
  )
}

const TAILLES_MAILLOT = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

function fieldLabel(text) {
  return (
    <label style={{ display: 'block', textTransform: 'uppercase', color: 'var(--stone)', letterSpacing: '0.08em', fontSize: '0.65rem', marginBottom: '0.25rem' }}>
      {text}
    </label>
  )
}

function infoRow(label, value) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.55rem 0', borderBottom: '1px solid var(--line)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
      <span style={{ color: 'var(--stone)' }}>{label}</span>
      <b style={{ textAlign: 'right' }}>{value || '—'}</b>
    </div>
  )
}

function ProfilPanel({ token, me, onMeUpdate, onPasswordChanged }) {
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  const [newEmail, setNewEmail] = useState('')
  const [emailMessage, setEmailMessage] = useState('')

  const [pwdStep, setPwdStep] = useState('idle') // 'idle' | 'code'
  const [pwdCode, setPwdCode] = useState('')
  const [pwdNew, setPwdNew] = useState('')
  const [pwdNew2, setPwdNew2] = useState('')
  const [pwdMessage, setPwdMessage] = useState('')

  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoMessage, setPhotoMessage] = useState('')

  const [theme, setThemeState] = useState(getTheme)

  function handleThemeChange(value) {
    applyThemeChoice(value)
    setThemeState(value)
  }

  const [trombiForm, setTrombiForm] = useState(null)
  const [savingTrombi, setSavingTrombi] = useState(false)
  const [trombiMessage, setTrombiMessage] = useState('')

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUploading(true)
    setPhotoMessage('')
    try {
      const updated = await api.uploadPhoto(token, file)
      onMeUpdate(updated)
      setPhotoMessage('Photo mise à jour.')
    } catch (err) {
      setPhotoMessage(err.message)
    } finally {
      setPhotoUploading(false)
      e.target.value = ''
    }
  }

  useEffect(() => {
    if (!me) return
    setForm({
      dateNaissance: me.dateNaissance || '',
      lieuNaissance: me.lieuNaissance || '',
      adresse: me.adresse || '',
      codePostal: me.codePostal || '',
      ville: me.ville || '',
      telephoneDomicile: me.telephoneDomicile || '',
      telephonePortable: me.telephonePortable || '',
      nationalite: me.nationalite || '',
      urgenceNom: me.urgenceNom || '',
      urgenceTelephone: me.urgenceTelephone || '',
      tailleMaillot: me.tailleMaillot || '',
      vma: me.vma ?? '',
      vmaDate: me.vmaDate || '',
    })
    setTrombiForm({
      trombiHabite: me.trombiHabite || '',
      trombiNaissance: me.trombiNaissance || '',
      trombiOrigine: me.trombiOrigine || '',
      trombiEmail: me.trombiEmail || '',
      trombiTelephone: me.trombiTelephone || '',
      trombiProfession: me.trombiProfession || '',
      trombiEmployeur: me.trombiEmployeur || '',
      trombiDistanceFavorite: me.trombiDistanceFavorite || '',
      trombiBio: me.trombiBio || '',
    })
  }, [me])

  if (!me || !form || !trombiForm) {
    return <p style={{ color: 'var(--stone)' }}>Chargement de votre profil…</p>
  }

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function updateTrombiField(key, value) {
    setTrombiForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSaveTrombi(e) {
    e.preventDefault()
    setSavingTrombi(true)
    setTrombiMessage('')
    try {
      const updated = await api.updateTrombi(token, trombiForm)
      onMeUpdate(updated)
      setTrombiMessage('Informations enregistrées.')
    } catch (err) {
      setTrombiMessage(err.message)
    } finally {
      setSavingTrombi(false)
    }
  }

  async function handleSaveConfidential(e) {
    e.preventDefault()
    setSaving(true)
    setSaveMessage('')
    try {
      const payload = {
        ...form,
        dateNaissance: form.dateNaissance === '' ? null : form.dateNaissance,
        vmaDate: form.vmaDate === '' ? null : form.vmaDate,
        vma: form.vma === '' ? null : Number(form.vma),
      }
      const updated = await api.updateMe(token, payload)
      onMeUpdate(updated)
      setSaveMessage('Informations enregistrées.')
    } catch (err) {
      setSaveMessage(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleChangeEmail(e) {
    e.preventDefault()
    setEmailMessage('')
    try {
      await api.updateEmail(token, newEmail)
      const updated = await api.getMe(token)
      onMeUpdate(updated)
      setNewEmail('')
      setEmailMessage('Adresse email mise à jour.')
    } catch (err) {
      setEmailMessage(err.message)
    }
  }

  async function handleRequestPasswordCode() {
    setPwdMessage('')
    try {
      await api.requestCode(me.email)
      setPwdStep('code')
      setPwdMessage('Un code vient de vous être envoyé par email.')
    } catch (err) {
      setPwdMessage(err.message)
    }
  }

  async function handleConfirmPasswordCode(e) {
    e.preventDefault()
    setPwdMessage('')
    if (pwdNew.length < 8) {
      setPwdMessage('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (pwdNew !== pwdNew2) {
      setPwdMessage('Les deux mots de passe ne correspondent pas.')
      return
    }
    try {
      const { token: newToken } = await api.confirmCode(me.email, pwdCode, pwdNew)
      onPasswordChanged(newToken)
      setPwdStep('idle')
      setPwdCode('')
      setPwdNew('')
      setPwdNew2('')
      setPwdMessage('Mot de passe modifié avec succès.')
    } catch (err) {
      setPwdMessage(err.message)
    }
  }

  const inputStyle = { padding: '0.6rem 0.75rem', background: '#fff', color: '#1C1917', border: '1px solid var(--line)', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '0.85rem' }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <span className="eyebrow">Mon compte</span>
        <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', marginTop: '0.2rem' }}>Tes informations</h2>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <Avatar photoUrl={me.photoUrl} nom={`${me.prenom} ${me.nom}`} size={84} />
        <div>
          <span className="eyebrow" style={{ fontWeight: 'bold' }}>Ta photo</span>
          <p style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', margin: '0.3rem 0 0.8rem' }}>
            Affichée dans le trombinoscope du club (JPEG, PNG ou WebP, 5 Mo maximum).
          </p>
          <label className="btn btn--ghost" style={{ cursor: 'pointer', display: 'inline-flex' }}>
            {photoUploading ? 'Envoi…' : 'Changer ta photo'}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} disabled={photoUploading} style={{ display: 'none' }} />
          </label>
          {photoMessage && <p style={{ fontSize: '0.8rem', color: 'var(--vermilion)', marginTop: '0.6rem' }}>{photoMessage}</p>}
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <span className="eyebrow" style={{ fontWeight: 'bold' }}>Préférences</span>
        <p style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', margin: '0.3rem 0 1rem' }}>
          Thème de l'application sur cet appareil.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.8rem' }}>
          {[
            { value: 'dark', label: 'Sombre', hint: 'Fond sombre, comme aujourd’hui.' },
            { value: 'light', label: 'Clair', hint: 'Fond clair pour un usage de jour.' },
            { value: 'system', label: 'Système', hint: 'Suit le réglage de ton appareil.' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleThemeChange(opt.value)}
              className={`btn ${theme === opt.value ? 'btn--solid' : 'btn--ghost'}`}
              style={{ flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', padding: '0.9rem 1rem', gap: '0.2rem', height: 'auto' }}
            >
              <b style={{ fontSize: '0.85rem' }}>{opt.label}</b>
              <span style={{ fontSize: '0.72rem', fontWeight: 'normal', opacity: 0.85 }}>{opt.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '1.5rem' }}>
          <span className="eyebrow" style={{ fontWeight: 'bold' }}>Informations confidentielles</span>
          <p style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', margin: '0.3rem 0 1.2rem' }}>
            Visibles uniquement des responsables du club — modifiables par vous.
          </p>
          <form onSubmit={handleSaveConfidential} style={{ display: 'grid', gap: '0.9rem' }}>
            <div>
              {fieldLabel('Date de naissance')}
              <input type="date" style={inputStyle} value={form.dateNaissance} onChange={(e) => updateField('dateNaissance', e.target.value)} />
            </div>
            <div>
              {fieldLabel('Lieu de naissance')}
              <input type="text" style={inputStyle} value={form.lieuNaissance} onChange={(e) => updateField('lieuNaissance', e.target.value)} />
            </div>
            <div>
              {fieldLabel('Adresse postale')}
              <input type="text" style={inputStyle} value={form.adresse} onChange={(e) => updateField('adresse', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.8rem' }}>
              <div>
                {fieldLabel('Code postal')}
                <input type="text" style={inputStyle} value={form.codePostal} onChange={(e) => updateField('codePostal', e.target.value)} />
              </div>
              <div>
                {fieldLabel('Localité')}
                <input type="text" style={inputStyle} value={form.ville} onChange={(e) => updateField('ville', e.target.value)} />
              </div>
            </div>
            <div>
              {fieldLabel('Téléphone domicile')}
              <input type="tel" style={inputStyle} value={form.telephoneDomicile} onChange={(e) => updateField('telephoneDomicile', e.target.value)} />
            </div>
            <div>
              {fieldLabel('Téléphone portable')}
              <input type="tel" style={inputStyle} value={form.telephonePortable} onChange={(e) => updateField('telephonePortable', e.target.value)} />
            </div>
            <div>
              {fieldLabel('Nationalité')}
              <input type="text" style={inputStyle} value={form.nationalite} onChange={(e) => updateField('nationalite', e.target.value)} />
            </div>

            <div style={{ marginTop: '0.4rem', paddingTop: '0.8rem', borderTop: '1px solid var(--line)' }}>
              <b style={{ fontSize: '0.85rem' }}>Personne à prévenir en cas d'urgence</b>
            </div>
            <div>
              {fieldLabel('Prénom Nom')}
              <input type="text" style={inputStyle} value={form.urgenceNom} onChange={(e) => updateField('urgenceNom', e.target.value)} />
            </div>
            <div>
              {fieldLabel('Téléphone')}
              <input type="tel" style={inputStyle} value={form.urgenceTelephone} onChange={(e) => updateField('urgenceTelephone', e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <div>
                {fieldLabel('Taille de maillot')}
                <select style={inputStyle} value={form.tailleMaillot} onChange={(e) => updateField('tailleMaillot', e.target.value)}>
                  <option value="">—</option>
                  {TAILLES_MAILLOT.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                {fieldLabel('VMA')}
                <input type="number" step="0.1" style={inputStyle} value={form.vma} onChange={(e) => updateField('vma', e.target.value)} />
              </div>
            </div>
            <div>
              {fieldLabel('Date de la VMA')}
              <input type="date" style={inputStyle} value={form.vmaDate} onChange={(e) => updateField('vmaDate', e.target.value)} />
            </div>

            {saveMessage && <p style={{ fontSize: '0.8rem', color: 'var(--vermilion)' }}>{saveMessage}</p>}
            <button type="submit" disabled={saving} className="btn btn--solid" style={{ justifyContent: 'center' }}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </form>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '1.5rem' }}>
          <span className="eyebrow" style={{ fontWeight: 'bold' }}>Tes informations visibles des autres adhérents</span>
          <p style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', margin: '0.3rem 0 1.2rem' }}>
            Affichées dans le trombinoscope du club, invisibles en dehors de l'espace adhérent.
          </p>
          <form onSubmit={handleSaveTrombi} style={{ display: 'grid', gap: '0.9rem' }}>
            <div>
              {fieldLabel("J'habite")}
              <input type="text" style={inputStyle} value={trombiForm.trombiHabite} onChange={(e) => updateTrombiField('trombiHabite', e.target.value)} />
            </div>
            <div>
              {fieldLabel('Je suis né')}
              <input type="text" style={inputStyle} placeholder="Ex : 23 Juillet 1967" value={trombiForm.trombiNaissance} onChange={(e) => updateTrombiField('trombiNaissance', e.target.value)} />
            </div>
            <div>
              {fieldLabel('Originaire de')}
              <input type="text" style={inputStyle} value={trombiForm.trombiOrigine} onChange={(e) => updateTrombiField('trombiOrigine', e.target.value)} />
            </div>
            <div>
              {fieldLabel('E-mail (affiché aux autres adhérents)')}
              <input type="email" style={inputStyle} value={trombiForm.trombiEmail} onChange={(e) => updateTrombiField('trombiEmail', e.target.value)} />
            </div>
            <div>
              {fieldLabel('Téléphone (affiché aux autres adhérents)')}
              <input type="tel" style={inputStyle} value={trombiForm.trombiTelephone} onChange={(e) => updateTrombiField('trombiTelephone', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <div>
                {fieldLabel('Profession')}
                <input type="text" style={inputStyle} value={trombiForm.trombiProfession} onChange={(e) => updateTrombiField('trombiProfession', e.target.value)} />
              </div>
              <div>
                {fieldLabel('Employeur')}
                <input type="text" style={inputStyle} value={trombiForm.trombiEmployeur} onChange={(e) => updateTrombiField('trombiEmployeur', e.target.value)} />
              </div>
            </div>
            <div>
              {fieldLabel('Distance favorite')}
              <input type="text" style={inputStyle} value={trombiForm.trombiDistanceFavorite} onChange={(e) => updateTrombiField('trombiDistanceFavorite', e.target.value)} />
            </div>
            <div>
              {fieldLabel('Je me présente')}
              <textarea rows={4} style={{ ...inputStyle, resize: 'vertical' }} value={trombiForm.trombiBio} onChange={(e) => updateTrombiField('trombiBio', e.target.value)} />
            </div>

            {trombiMessage && <p style={{ fontSize: '0.8rem', color: 'var(--vermilion)' }}>{trombiMessage}</p>}
            <button type="submit" disabled={savingTrombi} className="btn btn--solid" style={{ justifyContent: 'center' }}>
              {savingTrombi ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </form>
        </div>

        <div style={{ display: 'grid', gap: '1.5rem', alignContent: 'start' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '1.5rem' }}>
            <span className="eyebrow" style={{ fontWeight: 'bold' }}>Informations administratives</span>
            <p style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', margin: '0.3rem 0 1rem' }}>
              Non modifiables par vous — gérées par le bureau du club.
            </p>
            {infoRow('Numéro de licence', me.numeroLicence)}
            {infoRow('Licencié(e) par', me.licenciePar)}
            {infoRow('Fonction au bureau', me.fonctionBureau)}
            {infoRow('Origine du contact', me.origineContact)}
            {infoRow('Année de première adhésion', me.anneePremiereAdhesion)}
            {infoRow('Date de première adhésion', me.datePremiereAdhesion)}
            {infoRow('Date du dernier certificat médical', me.dateDernierCertificat)}
            {infoRow('Année de dernière adhésion', me.anneeDerniereAdhesion)}
            {infoRow('Activité pour la saison', me.activiteSaison)}
            {infoRow('Licence FFA pour la saison', me.licenceFfaType)}
            {infoRow('Montant de la cotisation', me.montantCotisation != null ? `${me.montantCotisation} €` : null)}
            {infoRow('Date de paiement', me.datePaiementCotisation)}
            {infoRow('Mode de paiement', me.modePaiement)}
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '1.5rem' }}>
            <span className="eyebrow" style={{ fontWeight: 'bold' }}>Changer ton adresse email</span>
            <form onSubmit={handleChangeEmail} style={{ display: 'grid', gap: '0.7rem', marginTop: '0.8rem' }}>
              <div>
                {fieldLabel('Adresse actuelle')}
                <input type="text" style={{ ...inputStyle, background: 'var(--surface-2)', color: 'var(--ink)' }} value={me.email} disabled />
              </div>
              <div>
                {fieldLabel('Nouvelle adresse')}
                <input type="email" style={inputStyle} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
              </div>
              {emailMessage && <p style={{ fontSize: '0.8rem', color: 'var(--vermilion)' }}>{emailMessage}</p>}
              <button type="submit" className="btn btn--ghost" style={{ justifyContent: 'center' }}>Envoyer</button>
            </form>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '1.5rem' }}>
            <span className="eyebrow" style={{ fontWeight: 'bold' }}>Changer ton mot de passe</span>
            {pwdMessage && <p style={{ fontSize: '0.8rem', color: 'var(--vermilion)', marginTop: '0.5rem' }}>{pwdMessage}</p>}

            {pwdStep === 'idle' && (
              <button onClick={handleRequestPasswordCode} className="btn btn--ghost" style={{ justifyContent: 'center', marginTop: '0.8rem', width: '100%' }}>
                Recevoir un code par email
              </button>
            )}

            {pwdStep === 'code' && (
              <form onSubmit={handleConfirmPasswordCode} style={{ display: 'grid', gap: '0.7rem', marginTop: '0.8rem' }}>
                <div>
                  {fieldLabel('Code reçu par email')}
                  <input type="text" inputMode="numeric" style={inputStyle} value={pwdCode} onChange={(e) => setPwdCode(e.target.value)} required />
                </div>
                <div>
                  {fieldLabel('Nouveau mot de passe')}
                  <PasswordField inputStyle={inputStyle} value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} required />
                </div>
                <div>
                  {fieldLabel('Confirmer le mot de passe')}
                  <PasswordField inputStyle={inputStyle} value={pwdNew2} onChange={(e) => setPwdNew2(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn--solid" style={{ justifyContent: 'center' }}>Valider</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const NEW_RACE_FORM = { titre: '', date: '', lieu: '', type: '', distanceKm: '', description: '', siteInternet: '' }

function formatRaceDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function CoursesPanel({ token, me, members }) {
  const [openMemberId, setOpenMemberId] = useState(null)
  const openMember = members?.find((m) => m.id === openMemberId) || null
  const [races, setRaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const [creating, setCreating] = useState(false)
  const [newForm, setNewForm] = useState(NEW_RACE_FORM)
  const [createSaving, setCreateSaving] = useState(false)
  const [createMessage, setCreateMessage] = useState('')

  const [openRaceId, setOpenRaceId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [registering, setRegistering] = useState(false)
  const [seekingBusy, setSeekingBusy] = useState(false)
  const [cedingBusy, setCedingBusy] = useState(false)
  const [showEmails, setShowEmails] = useState(false)
  const [showWarning, setShowWarning] = useState(false)

  function loadRaces() {
    return api.listRaces(token)
      .then((data) => setRaces(data))
      .catch((err) => setLoadError(err.message))
  }

  useEffect(() => {
    setLoading(true)
    loadRaces().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  function openRace(id) {
    setOpenRaceId(id)
    setDetail(null)
    setDetailError('')
    setDetailLoading(true)
    setShowEmails(false)
    setShowWarning(false)
    api.getRace(token, id)
      .then((data) => setDetail(data))
      .catch((err) => setDetailError(err.message))
      .finally(() => setDetailLoading(false))
  }

  function closeRace() {
    setOpenRaceId(null)
    setDetail(null)
  }

  function updateNewField(key, value) {
    setNewForm((f) => ({ ...f, [key]: value }))
  }

  async function handleCreate(e) {
    e.preventDefault()
    setCreateSaving(true)
    setCreateMessage('')
    try {
      await api.createRace(token, { ...newForm, distanceKm: newForm.distanceKm === '' ? 0 : Number(newForm.distanceKm) })
      setCreating(false)
      setNewForm(NEW_RACE_FORM)
      await loadRaces()
    } catch (err) {
      setCreateMessage(err.message)
    } finally {
      setCreateSaving(false)
    }
  }

  async function handleToggleRegister() {
    if (!detail) return
    setRegistering(true)
    try {
      if (detail.race.isRegisteredByMe) {
        await api.unregisterRace(token, detail.race.id)
      } else {
        await api.registerRace(token, detail.race.id)
      }
      const [freshDetail] = await Promise.all([api.getRace(token, detail.race.id), loadRaces()])
      setDetail(freshDetail)
    } catch (err) {
      setDetailError(err.message)
    } finally {
      setRegistering(false)
    }
  }

  async function handleToggleSeekDossard() {
    if (!detail) return
    setSeekingBusy(true)
    try {
      if (detail.isSeekingByMe) {
        await api.unseekDossard(token, detail.race.id)
      } else {
        await api.seekDossard(token, detail.race.id)
      }
      setDetail(await api.getRace(token, detail.race.id))
    } catch (err) {
      setDetailError(err.message)
    } finally {
      setSeekingBusy(false)
    }
  }

  async function handleToggleCedeDossard() {
    if (!detail) return
    setCedingBusy(true)
    try {
      if (detail.isCedingByMe) {
        await api.uncedeDossard(token, detail.race.id)
      } else {
        await api.cedeDossard(token, detail.race.id)
      }
      setDetail(await api.getRace(token, detail.race.id))
    } catch (err) {
      setDetailError(err.message)
    } finally {
      setCedingBusy(false)
    }
  }

  const inputStyle = { padding: '0.6rem 0.75rem', background: '#fff', color: '#1C1917', border: '1px solid var(--line)', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '0.85rem' }

  // Les courses passées sont consultables dans Résultats — Nos Courses ne
  // montre que ce qui reste à venir.
  const todayISO = new Date().toISOString().slice(0, 10)
  const upcomingRaces = races.filter((r) => r.date.slice(0, 10) >= todayISO)

  const raceTypes = [...new Set(upcomingRaces.map((r) => r.type).filter(Boolean))].sort()
  const filteredRaces = upcomingRaces.filter((r) => {
    if (typeFilter && r.type !== typeFilter) return false
    if (search) {
      const needle = search.toLowerCase()
      if (!r.titre.toLowerCase().includes(needle) && !r.lieu.toLowerCase().includes(needle)) return false
    }
    return true
  })

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem' }}>
        <div>
          <span className="eyebrow">Compétitions cibles &amp; Déplacements</span>
          <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', marginTop: '0.2rem' }}>Nos Courses</h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--ink-soft)', marginTop: '0.3rem' }}>Proposez une course et voyez qui du club y participe. N'importe quel adhérent peut créer une course ou s'y inscrire.</p>
        </div>
        <button type="button" onClick={() => { setCreating(true); setCreateMessage('') }} className="btn btn--solid" style={{ padding: '0.65rem 1.2rem', fontSize: '0.75rem' }}>
          + Créer une course
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '1.2rem' }}>
        <input
          type="text" placeholder="Rechercher par titre ou lieu…"
          style={{ ...inputStyle, flex: '1 1 220px' }}
          value={search} onChange={(e) => setSearch(e.target.value)}
        />
        <select style={{ ...inputStyle, flex: '0 1 220px' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">Tous les types</option>
          {raceTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {loading && <p style={{ color: 'var(--stone)' }}>Chargement des courses…</p>}
      {loadError && <p style={{ color: 'var(--vermilion)' }}>{loadError}</p>}

      {!loading && !loadError && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filteredRaces.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => openRace(r.id)}
              style={{
                background: 'var(--surface)', border: '1px solid var(--line)', padding: '1.3rem 1.5rem', textAlign: 'left',
                display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
                cursor: 'pointer', fontFamily: 'inherit', width: '100%',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                  {r.type && (
                    <span style={{ background: 'var(--vermilion)', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', fontWeight: 'bold', padding: '0.15rem 0.5rem', textTransform: 'uppercase' }}>{r.type}</span>
                  )}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--stone)' }}>{formatRaceDate(r.date)}</span>
                  {r.isRegisteredByMe && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: '#065f46', fontWeight: 'bold' }}>✓ Tu participes</span>
                  )}
                </div>
                <h3 style={{ fontSize: '1.3rem', textTransform: 'uppercase' }}>{r.titre}</h3>
                {r.lieu && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--ink-soft)', margin: '0.3rem 0 0' }}>{r.lieu}</p>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--vermilion)' }}>
                  {r.inscritsCount} inscrit{r.inscritsCount > 1 ? 's' : ''}
                </span>
                <span className="btn btn--ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.7rem' }}>Voir →</span>
              </div>
            </button>
          ))}
          {upcomingRaces.length === 0 && (
            <p style={{ color: 'var(--stone)' }}>Aucune course à venir proposée pour le moment. Soyez le premier à en créer une !</p>
          )}
          {upcomingRaces.length > 0 && filteredRaces.length === 0 && (
            <p style={{ color: 'var(--stone)' }}>Aucune course ne correspond à ces filtres.</p>
          )}
        </div>
      )}

      {creating && (
        <AdminModal onClose={() => setCreating(false)} maxWidth={560}>
          <form onSubmit={handleCreate} style={{ display: 'grid', gap: '0.9rem' }}>
            <b style={{ fontSize: '1.05rem' }}>Créer une course</b>
            <div>{fieldLabel('Titre')}<input type="text" required style={inputStyle} value={newForm.titre} onChange={(e) => updateNewField('titre', e.target.value)} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <div>{fieldLabel('Date')}<input type="date" required style={inputStyle} value={newForm.date} onChange={(e) => updateNewField('date', e.target.value)} /></div>
              <div>{fieldLabel('Type (ex : Semi-marathon, Trail…)')}<input type="text" style={inputStyle} value={newForm.type} onChange={(e) => updateNewField('type', e.target.value)} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <div>{fieldLabel('Lieu')}<input type="text" style={inputStyle} value={newForm.lieu} onChange={(e) => updateNewField('lieu', e.target.value)} /></div>
              <div>{fieldLabel('Distance (km)')}<input type="number" min="0" step="0.1" style={inputStyle} value={newForm.distanceKm} onChange={(e) => updateNewField('distanceKm', e.target.value)} /></div>
            </div>
            <div>{fieldLabel('Site internet')}<input type="url" placeholder="https://…" style={inputStyle} value={newForm.siteInternet} onChange={(e) => updateNewField('siteInternet', e.target.value)} /></div>
            <div>{fieldLabel('Description')}<textarea rows={4} style={{ ...inputStyle, resize: 'vertical' }} value={newForm.description} onChange={(e) => updateNewField('description', e.target.value)} /></div>

            {createMessage && <p style={{ fontSize: '0.8rem', color: 'var(--vermilion)' }}>{createMessage}</p>}
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button type="submit" disabled={createSaving} className="btn btn--solid" style={{ justifyContent: 'center', flex: 1 }}>
                {createSaving ? 'Création…' : 'Créer la course'}
              </button>
              <button type="button" onClick={() => setCreating(false)} className="btn btn--ghost" style={{ justifyContent: 'center' }}>Annuler</button>
            </div>
          </form>
        </AdminModal>
      )}

      {openRaceId && (
        <AdminModal onClose={closeRace} maxWidth={640}>
          {detailLoading && <p style={{ color: 'var(--stone)' }}>Chargement…</p>}
          {detailError && <p style={{ color: 'var(--vermilion)' }}>{detailError}</p>}
          {detail && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '0.8rem', borderBottom: '1px solid var(--line)', marginBottom: '1rem' }}>
                <div>
                  {detail.race.type && (
                    <span style={{ background: 'var(--vermilion)', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', fontWeight: 'bold', padding: '0.15rem 0.5rem', textTransform: 'uppercase' }}>{detail.race.type}</span>
                  )}
                  <h3 style={{ fontSize: '1.5rem', textTransform: 'uppercase', marginTop: '0.4rem' }}>{detail.race.titre}</h3>
                </div>
                <button type="button" onClick={closeRace} className="link-button" style={{ fontSize: '0.8rem' }}>Fermer ✕</button>
              </div>

              {detail.seekingDossard.length > 0 && (
                <div style={{ marginBottom: '1.2rem' }}>
                  <b style={{ fontSize: '0.95rem', display: 'block', marginBottom: '0.8rem' }}>
                    Recherchent un dossard ({detail.seekingDossard.length})
                  </b>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
                    {detail.seekingDossard.map((p) => (
                      <div key={p.memberId} style={{ textAlign: 'center' }}>
                        <AvatarButton photoUrl={p.photoUrl} nom={`${p.prenom} ${p.nom}`} size={48} onClick={() => setOpenMemberId(p.memberId)} />
                        <div style={{ fontSize: '0.75rem', marginTop: '0.3rem' }}>{p.prenom} {p.nom}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--stone)' }}>{p.email}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detail.cedingDossard.length > 0 && (
                <div style={{ marginBottom: '1.2rem' }}>
                  <b style={{ fontSize: '0.95rem', display: 'block', marginBottom: '0.8rem' }}>
                    Cèdent un dossard ({detail.cedingDossard.length})
                  </b>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
                    {detail.cedingDossard.map((p) => (
                      <div key={p.memberId} style={{ textAlign: 'center' }}>
                        <AvatarButton photoUrl={p.photoUrl} nom={`${p.prenom} ${p.nom}`} size={48} onClick={() => setOpenMemberId(p.memberId)} />
                        <div style={{ fontSize: '0.75rem', marginTop: '0.3rem' }}>{p.prenom} {p.nom}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--stone)' }}>{p.email}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gap: '0.55rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', marginBottom: '1.2rem' }}>
                {infoRow('Date', formatRaceDate(detail.race.date))}
                {detail.race.lieu && infoRow('Lieu', detail.race.lieu)}
                {detail.race.distanceKm > 0 && infoRow('Distance', `${detail.race.distanceKm} km`)}
                {detail.race.description && infoRow('Description', detail.race.description)}
                {detail.race.siteInternet && infoRow('Site internet', <a href={detail.race.siteInternet} target="_blank" rel="noreferrer" style={{ color: 'var(--vermilion)' }}>{detail.race.siteInternet}</a>)}
                {infoRow('Créée par', `${detail.race.createdByPrenom} ${detail.race.createdByNom}`)}
                {infoRow('Inscrits', detail.race.inscritsCount)}
              </div>

              {detail.isCedingByMe && (
                <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginBottom: '1rem' }}>
                  Tu as déclaré céder ton dossard sur cette course : annule cette déclaration ci-dessous si tu veux à nouveau participer ou chercher un dossard.
                </p>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1.5rem' }}>
                {!detail.isCedingByMe && (
                  <button
                    type="button"
                    onClick={handleToggleRegister}
                    disabled={registering}
                    className={`btn ${detail.race.isRegisteredByMe ? 'btn--ghost' : 'btn--solid'}`}
                    style={{ justifyContent: 'center', flex: '1 1 160px' }}
                  >
                    {registering ? 'Enregistrement…' : detail.race.isRegisteredByMe ? "Je ne participe plus" : "J'y participe"}
                  </button>
                )}
                {!detail.race.isRegisteredByMe && !detail.isCedingByMe && (
                  <button
                    type="button"
                    onClick={handleToggleSeekDossard}
                    disabled={seekingBusy}
                    className={`btn ${detail.isSeekingByMe ? 'btn--ghost' : 'btn--solid'}`}
                    style={{ justifyContent: 'center', flex: '1 1 160px' }}
                  >
                    {seekingBusy ? 'Enregistrement…' : detail.isSeekingByMe ? 'Je renonce (dossard recherché)' : 'Je cherche un dossard'}
                  </button>
                )}
                {(detail.race.isRegisteredByMe || detail.isCedingByMe) && (
                  <button
                    type="button"
                    onClick={handleToggleCedeDossard}
                    disabled={cedingBusy}
                    className={`btn ${detail.isCedingByMe ? 'btn--ghost' : 'btn--solid'}`}
                    style={{ justifyContent: 'center', flex: '1 1 160px' }}
                  >
                    {cedingBusy ? 'Enregistrement…' : detail.isCedingByMe ? 'Je renonce (dossard cédé)' : 'Je cède un dossard'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowWarning((v) => !v)}
                  className="btn btn--ghost"
                  style={{ justifyContent: 'center', flex: '1 1 160px' }}
                >
                  Avertissements importants
                </button>
              </div>

              {showWarning && (
                <p style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', padding: '0.9rem 1rem', fontSize: '0.8rem', color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                  Cette rubrique permet de faire savoir aux autres adhérents que tu participes à cette course, que tu recherches un dossard ou que tu cherches à céder le tien. Sauf mention contraire, l'inscription officielle à la course reste à faire séparément auprès de l'organisateur — ce site ne s'en charge pas. Lors des échanges de dossard, merci de rester prudent (vérifier l'identité de la personne, respecter les règles de transfert de l'organisateur) et de mentionner ton appartenance à la SAM Paris 12 lors de ton inscription officielle si possible.
                </p>
              )}

              <b style={{ fontSize: '0.95rem', display: 'block', marginBottom: '0.8rem' }}>
                Adhérents inscrits ({detail.participants.length})
              </b>
              {detail.participants.length === 0 ? (
                <p style={{ color: 'var(--stone)', fontSize: '0.85rem' }}>Personne ne s'est encore inscrit à cette course.</p>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem', marginBottom: '0.8rem' }}>
                    {detail.participants.map((p) => (
                      <div key={p.memberId} style={{ textAlign: 'center' }}>
                        <AvatarButton photoUrl={p.photoUrl} nom={`${p.prenom} ${p.nom}`} size={56} onClick={() => setOpenMemberId(p.memberId)} />
                        <div style={{ fontSize: '0.78rem', marginTop: '0.4rem' }}>{p.prenom} {p.nom}</div>
                        {showEmails && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--stone)', wordBreak: 'break-word' }}>{p.email}</div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', alignItems: 'center' }}>
                    <button type="button" onClick={() => setShowEmails((v) => !v)} className="link-button" style={{ fontSize: '0.78rem' }}>
                      {showEmails ? 'Masquer les emails' : 'Voir les emails des participants'}
                    </button>
                    <a
                      href={`mailto:${detail.participants.map((p) => p.email).join(',')}`}
                      className="btn btn--ghost"
                      style={{ padding: '0.45rem 0.9rem', fontSize: '0.72rem', textDecoration: 'none' }}
                    >
                      ✉️ Envoyer un email à tous les inscrits
                    </a>
                  </div>
                </>
              )}
            </div>
          )}
        </AdminModal>
      )}

      {openMember && (
        <MemberDetailModal member={openMember} token={token} onClose={() => setOpenMemberId(null)} />
      )}
    </div>
  )
}

// Formate un temps de course en secondes vers "32'16"" (ou "1h32'16""
// au-delà d'une heure), comme affiché sur les sites de chronométrage.
function formatTempsCourse(sec) {
  if (sec === null || sec === undefined) return ''
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}'${ss}"` : `${m}'${ss}"`
}

function formatAllure(kmh) {
  if (!kmh) return ''
  return `${kmh.toLocaleString('fr-FR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} km/h`
}

const RESULT_FORM = { memberId: '', heures: '', minutes: '', secondes: '', classementGeneral: '', classementGeneralTotal: '', categorie: '', classementCategorie: '', classementCategorieTotal: '' }

function resultFormFromResult(res) {
  const h = Math.floor(res.tempsSecondes / 3600)
  const m = Math.floor((res.tempsSecondes % 3600) / 60)
  const s = res.tempsSecondes % 60
  return {
    memberId: String(res.memberId),
    heures: h ? String(h) : '', minutes: String(m), secondes: String(s),
    classementGeneral: res.classementGeneral ?? '', classementGeneralTotal: res.classementGeneralTotal ?? '',
    categorie: res.categorie || '',
    classementCategorie: res.classementCategorie ?? '', classementCategorieTotal: res.classementCategorieTotal ?? '',
  }
}

// Affiché quand on clique sur la photo d'un coureur depuis Résultats : son
// historique de courses (prochaines + derniers résultats), plutôt que sa
// fiche profil complète (trombinoscope).
function MemberRaceCardModal({ member, token, onClose }) {
  const [upcoming, setUpcoming] = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (!member) return
    setLoading(true)
    setShowAll(false)
    Promise.all([
      api.getMemberUpcomingRaces(token, member.id),
      api.getMemberResults(token, member.id),
    ])
      .then(([u, r]) => { setUpcoming(u); setResults(r) })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false))
  }, [member, token])

  if (!member) return null

  const visibleResults = showAll ? results : results.slice(0, 5)

  return (
    <div
      role="dialog" aria-modal="true"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surface)', border: '1px solid var(--line)', maxWidth: 520, width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: '2rem', position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button" onClick={onClose} aria-label="Fermer"
          style={{ position: 'absolute', top: '1rem', right: '1rem', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid var(--line)', cursor: 'pointer', color: 'var(--ink)' }}
        >
          ✕
        </button>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.8rem' }}>
            <Avatar photoUrl={member.photoUrl} nom={`${member.prenom} ${member.nom}`} size={72} />
          </div>
          <h3 style={{ fontSize: '1.3rem', textTransform: 'uppercase' }}>{member.prenom} {member.nom}</h3>
        </div>

        {loading && <p style={{ color: 'var(--stone)' }}>Chargement…</p>}
        {loadError && <p style={{ color: 'var(--vermilion)' }}>{loadError}</p>}

        {!loading && !loadError && (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <b style={{ fontSize: '0.9rem', display: 'block', marginBottom: '0.6rem' }}>Prochaines courses</b>
              {upcoming.length === 0 ? (
                <p style={{ color: 'var(--stone)', fontSize: '0.85rem' }}>Aucune course à venir renseignée.</p>
              ) : (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {upcoming.map((r) => (
                    <div key={r.id} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', padding: '0.6rem 0.9rem', fontSize: '0.82rem' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--stone)', marginRight: '0.6rem' }}>{formatRaceDate(r.date)}</span>
                      <b>{r.titre}</b>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <b style={{ fontSize: '0.9rem', display: 'block', marginBottom: '0.6rem' }}>
                Derniers résultats{!showAll && results.length > 5 ? ' (5 plus récents)' : ''}
              </b>
              {results.length === 0 ? (
                <p style={{ color: 'var(--stone)', fontSize: '0.85rem' }}>Aucun résultat enregistré.</p>
              ) : (
                <>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {visibleResults.map((r) => (
                      <div key={r.raceId} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', padding: '0.6rem 0.9rem', fontSize: '0.82rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap' }}>
                          <span><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--stone)', marginRight: '0.6rem' }}>{formatRaceDate(r.raceDate)}</span><b>{r.raceTitre}</b></span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{formatTempsCourse(r.tempsSecondes)}</span>
                        </div>
                        {(r.classementGeneral || r.categorie) && (
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-soft)', marginTop: '0.3rem' }}>
                            {r.classementGeneral && `Général : ${r.classementGeneral}${r.classementGeneralTotal ? `/${r.classementGeneralTotal}` : ''}`}
                            {r.classementGeneral && r.categorie && ' · '}
                            {r.categorie}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {results.length > 5 && (
                    <button type="button" onClick={() => setShowAll((v) => !v)} className="link-button" style={{ fontSize: '0.78rem', marginTop: '0.6rem' }}>
                      {showAll ? 'Voir moins' : `Voir tous les résultats (${results.length})`}
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ResultatsPanel({ token, me, members }) {
  const [openMemberId, setOpenMemberId] = useState(null)
  const openMember = members?.find((m) => m.id === openMemberId) || null
  const [races, setRaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [openRaceId, setOpenRaceId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  const [editingResult, setEditingResult] = useState(null) // null = fermé, {} = nouveau, result = édition
  const [resultForm, setResultForm] = useState(RESULT_FORM)
  const [resultSaving, setResultSaving] = useState(false)
  const [resultMessage, setResultMessage] = useState('')

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')

  useEffect(() => {
    setLoading(true)
    api.listRaces(token)
      .then((data) => setRaces(data))
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  const todayISO = new Date().toISOString().slice(0, 10)
  const pastRaces = races
    .filter((r) => r.date.slice(0, 10) < todayISO)
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  const raceTypes = [...new Set(pastRaces.map((r) => r.type).filter(Boolean))].sort()
  const raceYears = [...new Set(pastRaces.map((r) => r.date.slice(0, 4)))].sort().reverse()
  const filteredPastRaces = pastRaces.filter((r) => {
    if (typeFilter && r.type !== typeFilter) return false
    if (yearFilter && r.date.slice(0, 4) !== yearFilter) return false
    if (search) {
      const needle = search.toLowerCase()
      if (!r.titre.toLowerCase().includes(needle) && !r.lieu.toLowerCase().includes(needle)) return false
    }
    return true
  })

  function refreshDetail(id) {
    return api.getRace(token, id).then((data) => setDetail(data))
  }

  function openRace(id) {
    setOpenRaceId(id)
    setDetail(null)
    setDetailError('')
    setDetailLoading(true)
    setEditingResult(null)
    refreshDetail(id).catch((err) => setDetailError(err.message)).finally(() => setDetailLoading(false))
  }

  function closeRace() {
    setOpenRaceId(null)
    setDetail(null)
  }

  function startNewResult() {
    setResultForm(RESULT_FORM)
    setResultMessage('')
    setEditingResult({})
  }

  function startEditResult(res) {
    setResultForm(resultFormFromResult(res))
    setResultMessage('')
    setEditingResult(res)
  }

  function updateResultField(key, value) {
    setResultForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSaveResult(e) {
    e.preventDefault()
    if (!resultForm.memberId) {
      setResultMessage('Choisis un adhérent.')
      return
    }
    const tempsSecondes = (Number(resultForm.heures) || 0) * 3600 + (Number(resultForm.minutes) || 0) * 60 + (Number(resultForm.secondes) || 0)
    if (tempsSecondes <= 0) {
      setResultMessage('Renseigne un temps.')
      return
    }
    setResultSaving(true)
    setResultMessage('')
    try {
      await api.upsertRaceResult(token, detail.race.id, Number(resultForm.memberId), {
        tempsSecondes,
        classementGeneral: resultForm.classementGeneral === '' ? null : Number(resultForm.classementGeneral),
        classementGeneralTotal: resultForm.classementGeneralTotal === '' ? null : Number(resultForm.classementGeneralTotal),
        categorie: resultForm.categorie,
        classementCategorie: resultForm.classementCategorie === '' ? null : Number(resultForm.classementCategorie),
        classementCategorieTotal: resultForm.classementCategorieTotal === '' ? null : Number(resultForm.classementCategorieTotal),
      })
      setEditingResult(null)
      await Promise.all([refreshDetail(detail.race.id), api.listRaces(token).then(setRaces)])
    } catch (err) {
      setResultMessage(err.message)
    } finally {
      setResultSaving(false)
    }
  }

  async function handleDeleteResult(res) {
    try {
      await api.deleteRaceResult(token, detail.race.id, res.memberId)
      await Promise.all([refreshDetail(detail.race.id), api.listRaces(token).then(setRaces)])
    } catch (err) {
      setDetailError(err.message)
    }
  }

  const inputStyle = { padding: '0.6rem 0.75rem', background: '#fff', color: '#1C1917', border: '1px solid var(--line)', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '0.85rem' }
  const availableMembers = (members || []).filter((m) => editingResult?.memberId === m.id || !detail?.results?.some((r) => r.memberId === m.id))

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <span className="eyebrow">Performances officielles</span>
        <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', marginTop: '0.2rem' }}>Résultats</h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--ink-soft)', marginTop: '0.3rem' }}>Chronos et classements des adhérents sur les courses passées du club.</p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '1.2rem' }}>
        <input
          type="text" placeholder="Rechercher par titre ou lieu…"
          style={{ ...inputStyle, flex: '1 1 220px' }}
          value={search} onChange={(e) => setSearch(e.target.value)}
        />
        <select style={{ ...inputStyle, flex: '0 1 220px' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">Tous les types</option>
          {raceTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select style={{ ...inputStyle, flex: '0 1 140px' }} value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
          <option value="">Toutes les années</option>
          {raceYears.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading && <p style={{ color: 'var(--stone)' }}>Chargement des courses…</p>}
      {loadError && <p style={{ color: 'var(--vermilion)' }}>{loadError}</p>}

      {!loading && !loadError && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filteredPastRaces.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => openRace(r.id)}
              style={{
                background: 'var(--surface)', border: '1px solid var(--line)', padding: '1.3rem 1.5rem', textAlign: 'left',
                display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
                cursor: 'pointer', fontFamily: 'inherit', width: '100%',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                  {r.type && (
                    <span style={{ background: 'var(--vermilion)', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', fontWeight: 'bold', padding: '0.15rem 0.5rem', textTransform: 'uppercase' }}>{r.type}</span>
                  )}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--stone)' }}>{formatRaceDate(r.date)}</span>
                </div>
                <h3 style={{ fontSize: '1.3rem', textTransform: 'uppercase' }}>{r.titre}</h3>
                {(r.lieu || r.distanceKm > 0) && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--ink-soft)', margin: '0.3rem 0 0' }}>
                    {[r.lieu, r.distanceKm > 0 ? `${r.distanceKm} km` : null].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--vermilion)' }}>
                  {r.resultsCount} résultat{r.resultsCount > 1 ? 's' : ''}
                </span>
                <span className="btn btn--ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.7rem' }}>Voir →</span>
              </div>
            </button>
          ))}
          {pastRaces.length === 0 && (
            <p style={{ color: 'var(--stone)' }}>Aucune course passée pour le moment.</p>
          )}
          {pastRaces.length > 0 && filteredPastRaces.length === 0 && (
            <p style={{ color: 'var(--stone)' }}>Aucune course ne correspond à ces filtres.</p>
          )}
        </div>
      )}

      {openRaceId && (
        <AdminModal onClose={closeRace} maxWidth={720}>
          {detailLoading && <p style={{ color: 'var(--stone)' }}>Chargement…</p>}
          {detailError && <p style={{ color: 'var(--vermilion)' }}>{detailError}</p>}
          {detail && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '0.8rem', borderBottom: '1px solid var(--line)', marginBottom: '1rem' }}>
                <div>
                  {detail.race.type && (
                    <span style={{ background: 'var(--vermilion)', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', fontWeight: 'bold', padding: '0.15rem 0.5rem', textTransform: 'uppercase' }}>{detail.race.type}</span>
                  )}
                  <h3 style={{ fontSize: '1.5rem', textTransform: 'uppercase', marginTop: '0.4rem' }}>{detail.race.titre}</h3>
                </div>
                <button type="button" onClick={closeRace} className="link-button" style={{ fontSize: '0.8rem' }}>Fermer ✕</button>
              </div>

              <div style={{ display: 'grid', gap: '0.55rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', marginBottom: '1.2rem' }}>
                {infoRow('Date', formatRaceDate(detail.race.date))}
                {detail.race.lieu && infoRow('Lieu', detail.race.lieu)}
                {detail.race.distanceKm > 0 && infoRow('Distance', `${detail.race.distanceKm} km`)}
                {detail.race.siteInternet && infoRow('Site internet', <a href={detail.race.siteInternet} target="_blank" rel="noreferrer" style={{ color: 'var(--vermilion)' }}>{detail.race.siteInternet}</a>)}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <b style={{ fontSize: '0.95rem' }}>Résultats ({detail.results.length})</b>
                {detail.canEnterResults && (
                  <button type="button" onClick={startNewResult} className="btn btn--solid" style={{ padding: '0.5rem 1rem', fontSize: '0.72rem' }}>+ Ajouter un résultat</button>
                )}
              </div>

              {detail.results.length === 0 ? (
                <p style={{ color: 'var(--stone)', fontSize: '0.85rem' }}>Aucun résultat enregistré pour cette course pour le moment.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                  {detail.results.map((res) => (
                    <div key={res.memberId} style={{ textAlign: 'center', background: 'var(--surface-2)', border: '1px solid var(--line)', padding: '0.8rem' }}>
                      <AvatarButton photoUrl={res.photoUrl} nom={`${res.prenom} ${res.nom}`} size={56} onClick={() => setOpenMemberId(res.memberId)} />
                      <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginTop: '0.4rem' }}>{res.prenom} {res.nom}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', marginTop: '0.3rem' }}>{formatTempsCourse(res.tempsSecondes)}</div>
                      {res.allureKmh > 0 && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--stone)' }}>Allure : {formatAllure(res.allureKmh)}</div>}
                      {res.classementGeneral && (
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-soft)' }}>Général : {res.classementGeneral}{res.classementGeneralTotal ? `/${res.classementGeneralTotal}` : ''}</div>
                      )}
                      {res.categorie && (
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-soft)' }}>
                          {res.categorie}{res.classementCategorie ? ` : ${res.classementCategorie}${res.classementCategorieTotal ? `/${res.classementCategorieTotal}` : ''}` : ''}
                        </div>
                      )}
                      {detail.canEnterResults && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', marginTop: '0.5rem' }}>
                          <button type="button" onClick={() => startEditResult(res)} className="link-button" style={{ fontSize: '0.68rem' }}>Modifier</button>
                          <button type="button" onClick={() => handleDeleteResult(res)} className="link-button" style={{ fontSize: '0.68rem', color: 'var(--vermilion)' }}>Supprimer</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </AdminModal>
      )}

      {editingResult && detail && (
        <AdminModal onClose={() => setEditingResult(null)} maxWidth={480}>
          <form onSubmit={handleSaveResult} style={{ display: 'grid', gap: '0.9rem' }}>
            <b style={{ fontSize: '1.05rem' }}>{editingResult.memberId ? 'Modifier le résultat' : 'Ajouter un résultat'}</b>

            <div>
              {fieldLabel('Adhérent')}
              <select
                required
                disabled={!!editingResult.memberId}
                style={inputStyle}
                value={resultForm.memberId}
                onChange={(e) => updateResultField('memberId', e.target.value)}
              >
                <option value="">— Choisir —</option>
                {availableMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>
                ))}
              </select>
            </div>

            <div>
              {fieldLabel('Temps')}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <input type="number" min="0" placeholder="h" style={inputStyle} value={resultForm.heures} onChange={(e) => updateResultField('heures', e.target.value)} />
                <input type="number" min="0" max="59" placeholder="min" style={inputStyle} value={resultForm.minutes} onChange={(e) => updateResultField('minutes', e.target.value)} />
                <input type="number" min="0" max="59" placeholder="sec" style={inputStyle} value={resultForm.secondes} onChange={(e) => updateResultField('secondes', e.target.value)} />
              </div>
            </div>

            <div>
              {fieldLabel('Classement général')}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <input type="number" min="1" placeholder="Place" style={inputStyle} value={resultForm.classementGeneral} onChange={(e) => updateResultField('classementGeneral', e.target.value)} />
                <input type="number" min="1" placeholder="Total participants" style={inputStyle} value={resultForm.classementGeneralTotal} onChange={(e) => updateResultField('classementGeneralTotal', e.target.value)} />
              </div>
            </div>

            <div>
              {fieldLabel('Catégorie (ex : SEH, M4F, M0H…)')}
              <input type="text" style={inputStyle} value={resultForm.categorie} onChange={(e) => updateResultField('categorie', e.target.value)} />
            </div>

            <div>
              {fieldLabel('Classement catégorie')}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <input type="number" min="1" placeholder="Place" style={inputStyle} value={resultForm.classementCategorie} onChange={(e) => updateResultField('classementCategorie', e.target.value)} />
                <input type="number" min="1" placeholder="Total catégorie" style={inputStyle} value={resultForm.classementCategorieTotal} onChange={(e) => updateResultField('classementCategorieTotal', e.target.value)} />
              </div>
            </div>

            {resultMessage && <p style={{ fontSize: '0.8rem', color: 'var(--vermilion)' }}>{resultMessage}</p>}
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button type="submit" disabled={resultSaving} className="btn btn--solid" style={{ justifyContent: 'center', flex: 1 }}>
                {resultSaving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button type="button" onClick={() => setEditingResult(null)} className="btn btn--ghost" style={{ justifyContent: 'center' }}>Annuler</button>
            </div>
          </form>
        </AdminModal>
      )}

      {openMember && (
        <MemberRaceCardModal member={openMember} token={token} onClose={() => setOpenMemberId(null)} />
      )}
    </div>
  )
}

// Vues disponibles pour Records du Club — reprend les rubriques du vrai site
// (reportage.php > Records du Club). Les données ne sont pas encore
// importées : cette structure est prête à être alimentée.
const RECORD_VIEWS = [
  { id: 'feminin', label: 'Féminin' },
  { id: 'masculin', label: 'Masculin' },
  { id: 'type', label: 'Par type de course' },
  { id: 'categorie', label: 'Par catégorie' },
  { id: 'hitparade', label: 'Hit-parade' },
  { id: 'autres', label: 'Autres records' },
]

function recordsToCsv(rows) {
  const header = ['Type', 'Catégorie', 'Genre', 'Adhérent', 'Temps', 'Allure (km/h)', 'Course', 'Date']
  const lines = [header, ...rows.map((r) => [
    r.type || '', r.categorie || '', r.genre || '', `${r.prenom} ${r.nom}`,
    formatTempsCourse(r.tempsSecondes), r.allureKmh ? r.allureKmh.toFixed(1).replace('.', ',') : '',
    r.raceTitre, r.raceDate ? r.raceDate.slice(0, 10) : '',
  ])]
  return lines.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n')
}

function RecordsPanel({ token, members }) {
  const [view, setView] = useState('feminin')
  const [data, setData] = useState({ byType: [], byCategory: [], hitParade: [] })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [openMemberId, setOpenMemberId] = useState(null)
  const openMember = members?.find((m) => m.id === openMemberId) || null

  useEffect(() => {
    setLoading(true)
    api.getClubRecords(token)
      .then(setData)
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  const rows = view === 'feminin' ? data.byType.filter((r) => r.genre === 'femme')
    : view === 'masculin' ? data.byType.filter((r) => r.genre === 'homme')
    : view === 'type' ? data.byType
    : view === 'categorie' ? data.byCategory
    : view === 'hitparade' ? data.hitParade
    : []

  function handleExport() {
    if (rows.length === 0) {
      window.alert("Aucune donnée à exporter pour cette vue.")
      return
    }
    const blob = new Blob(['﻿' + recordsToCsv(rows)], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `records-club-${view}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <span className="eyebrow">Performances historiques</span>
        <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', marginTop: '0.2rem' }}>Records du Club</h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--ink-soft)', marginTop: '0.3rem' }}>
          Meilleures performances des adhérents du SAM Paris 12, calculées à partir des résultats enregistrés dans l'onglet Résultats.
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {RECORD_VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            className={`btn ${view === v.id ? 'btn--solid' : 'btn--ghost'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}
          >
            {v.label}
          </button>
        ))}
        <button
          type="button"
          onClick={handleExport}
          className="btn btn--ghost"
          style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', marginLeft: 'auto' }}
        >
          Télécharger Excel
        </button>
      </div>

      {loading && <p style={{ color: 'var(--stone)' }}>Chargement des records…</p>}
      {loadError && <p style={{ color: 'var(--vermilion)' }}>{loadError}</p>}

      {!loading && !loadError && (
        view === 'autres' ? (
          <p style={{ color: 'var(--stone)' }}>Aucun record de ce type pour le moment.</p>
        ) : rows.length === 0 ? (
          <p style={{ color: 'var(--stone)' }}>Aucun résultat chronométré enregistré pour le moment — saisis des résultats dans l'onglet Résultats pour voir apparaître les records ici.</p>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', color: 'var(--stone)', textTransform: 'uppercase', fontSize: '0.68rem' }}>
                  {view === 'hitparade' && <th style={{ padding: '0.8rem 1rem' }}>#</th>}
                  <th style={{ padding: '0.8rem 1rem' }}>Type</th>
                  {(view === 'categorie') && <th style={{ padding: '0.8rem 1rem' }}>Catégorie</th>}
                  {(view === 'type' || view === 'hitparade') && <th style={{ padding: '0.8rem 1rem' }}>Genre</th>}
                  <th style={{ padding: '0.8rem 1rem' }}>Adhérent</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Temps</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Allure</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Course</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.raceId}-${r.memberId}-${r.categorie}`} style={{ borderBottom: '1px solid var(--line)' }}>
                    {view === 'hitparade' && <td style={{ padding: '0.8rem 1rem', color: 'var(--vermilion)', fontWeight: 'bold' }}>{i + 1}</td>}
                    <td style={{ padding: '0.8rem 1rem' }}>{r.type}</td>
                    {view === 'categorie' && <td style={{ padding: '0.8rem 1rem' }}>{r.categorie}</td>}
                    {(view === 'type' || view === 'hitparade') && <td style={{ padding: '0.8rem 1rem', textTransform: 'capitalize' }}>{r.genre}</td>}
                    <td style={{ padding: '0.8rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <AvatarButton photoUrl={r.photoUrl} nom={`${r.prenom} ${r.nom}`} size={32} onClick={() => setOpenMemberId(r.memberId)} />
                        <button type="button" onClick={() => setOpenMemberId(r.memberId)} className="link-button" style={{ fontFamily: 'inherit', fontSize: 'inherit' }}>
                          {r.prenom} {r.nom}
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold' }}>{formatTempsCourse(r.tempsSecondes)}</td>
                    <td style={{ padding: '0.8rem 1rem', color: 'var(--ink-soft)' }}>{formatAllure(r.allureKmh)}</td>
                    <td style={{ padding: '0.8rem 1rem', color: 'var(--ink-soft)' }}>{r.raceTitre} · {formatRaceDate(r.raceDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {openMember && (
        <MemberRaceCardModal member={openMember} token={token} onClose={() => setOpenMemberId(null)} />
      )}
    </div>
  )
}

// Les 4 cases sont fixes : chacune ne contient qu'un seul document à la
// fois (un nouvel upload dans une case remplace le précédent).
const DOCUMENT_SLOTS = [
  { categorie: 'Programme trimestriel', defaultTitre: 'Plans d’entraînement running', defaultAuteur: 'Encadrement SAM Paris 12' },
  { categorie: 'Résultats', defaultTitre: 'Résultat du test VMA', defaultAuteur: 'Encadrement SAM Paris 12' },
  { categorie: 'Grille d’allures piste', defaultTitre: 'Allure fractionné / VMA par niveau', defaultAuteur: 'Commission des entraîneurs FFA' },
  { categorie: 'Plan des lieux', defaultTitre: 'Plan du stade', defaultAuteur: 'SAM Paris 12' },
]

function formatDocDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Formate une date MySQL 'YYYY-MM-DD HH:MM:SS' (ex. welcomeEmailSentAt, activatedAt).
// Les dates/heures viennent du serveur (MySQL NOW() ou Go time.Now()) sous
// forme de chaîne naïve 'YYYY-MM-DD HH:MM:SS' en UTC (conteneurs Docker, pas
// d'heure locale configurée) — on l'indique explicitement avec le suffixe
// 'Z' pour que le navigateur la convertisse vers l'heure locale du lecteur
// au lieu de l'afficher telle quelle.
function formatDateTime(s) {
  if (!s) return ''
  const d = new Date(s.replace(' ', 'T') + 'Z')
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function DocumentsPanel({ token, me }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [editingCategorie, setEditingCategorie] = useState(null)
  const [slotForm, setSlotForm] = useState({ titre: '', auteur: '' })
  const [slotFile, setSlotFile] = useState(null)
  const [slotUploading, setSlotUploading] = useState(false)
  const [slotMessage, setSlotMessage] = useState('')

  const canUpload = !!me?.features?.includes('documents.upload')

  function loadDocs() {
    return api.listDocuments(token)
      .then((data) => setDocs(data))
      .catch((err) => setLoadError(err.message))
  }

  useEffect(() => {
    setLoading(true)
    loadDocs().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  function openSlotForm(slot, doc) {
    setEditingCategorie(slot.categorie)
    setSlotForm({ titre: doc?.titre || slot.defaultTitre, auteur: doc?.auteur || slot.defaultAuteur })
    setSlotFile(null)
    setSlotMessage('')
  }

  function closeSlotForm() {
    setEditingCategorie(null)
  }

  async function handleSlotUpload(e, categorie) {
    e.preventDefault()
    if (!slotFile) {
      setSlotMessage('Choisissez un fichier PDF.')
      return
    }
    setSlotUploading(true)
    setSlotMessage('')
    try {
      const form = new FormData()
      form.append('titre', slotForm.titre)
      form.append('categorie', categorie)
      form.append('auteur', slotForm.auteur)
      form.append('document', slotFile)
      await api.uploadDocument(token, form)
      setEditingCategorie(null)
      await loadDocs()
    } catch (err) {
      setSlotMessage(err.message)
    } finally {
      setSlotUploading(false)
    }
  }

  const inputStyle = { padding: '0.6rem 0.75rem', background: '#fff', color: '#1C1917', border: '1px solid var(--line)', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '0.85rem' }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <span className="eyebrow">Programmes &amp; Vie du club</span>
        <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', marginTop: '0.2rem' }}>Plans d'Entraînement &amp; Documents</h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--ink-soft)', marginTop: '0.3rem' }}>Téléchargez les plans préparés par nos entraîneurs diplômés FFA et les documents officiels de l'association.</p>
      </div>

      {loading && <p style={{ color: 'var(--stone)' }}>Chargement des documents…</p>}
      {loadError && <p style={{ color: 'var(--vermilion)' }}>{loadError}</p>}

      {!loading && !loadError && (
        <div className="doc-slots-grid" style={{ width: '100vw', position: 'relative', left: '50%', marginLeft: '-50vw', paddingInline: 'var(--edge)', boxSizing: 'border-box', display: 'grid', gap: '1.2rem' }}>
          {DOCUMENT_SLOTS.map((slot) => {
            const doc = docs.find((d) => d.categorie === slot.categorie)
            const isEditing = editingCategorie === slot.categorie
            return (
              <div key={slot.categorie} style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <span className="eyebrow" style={{ color: 'var(--vermilion)', fontWeight: 'bold' }}>PDF · {slot.categorie}</span>
                  <h3 style={{ fontSize: '1.25rem', textTransform: 'uppercase', marginTop: '0.2rem' }}>{doc ? doc.titre : slot.defaultTitre}</h3>
                  {doc ? (
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--stone)', margin: '0.4rem 0 0' }}>
                      {doc.auteur && <>Auteur : {doc.auteur} · </>}
                      Ajouté par {doc.uploadedByPrenom} {doc.uploadedByNom} le {formatDocDate(doc.createdAt)}
                    </p>
                  ) : (
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--stone)', margin: '0.4rem 0 0' }}>
                      Aucun document ajouté pour le moment.
                    </p>
                  )}
                </div>

                {!isEditing ? (
                  <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    {doc ? (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="btn btn--ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.72rem', textDecoration: 'none' }}>
                          Visualiser
                        </a>
                        <a href={doc.fileUrl} download target="_blank" rel="noreferrer" className="btn btn--ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.72rem', textDecoration: 'none' }}>
                          Télécharger ↓
                        </a>
                      </div>
                    ) : <span />}
                    {canUpload && (
                      <button type="button" onClick={() => openSlotForm(slot, doc)} className="btn btn--ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.72rem' }}>
                        {doc ? 'Remplacer' : 'Ajouter'} le document
                      </button>
                    )}
                  </div>
                ) : (
                  <form onSubmit={(e) => handleSlotUpload(e, slot.categorie)} style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--line)', display: 'grid', gap: '0.6rem' }}>
                    <div>{fieldLabel('Titre')}<input type="text" required style={inputStyle} value={slotForm.titre} onChange={(e) => setSlotForm((f) => ({ ...f, titre: e.target.value }))} /></div>
                    <div>{fieldLabel('Auteur')}<input type="text" style={inputStyle} value={slotForm.auteur} onChange={(e) => setSlotForm((f) => ({ ...f, auteur: e.target.value }))} /></div>
                    <div>
                      {fieldLabel('Fichier PDF (20 Mo maximum)')}
                      <input type="file" accept="application/pdf" required onChange={(e) => setSlotFile(e.target.files?.[0] || null)} />
                    </div>
                    {slotMessage && <p style={{ fontSize: '0.8rem', color: 'var(--vermilion)' }}>{slotMessage}</p>}
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                      <button type="submit" disabled={slotUploading} className="btn btn--solid" style={{ justifyContent: 'center', flex: 1, padding: '0.5rem', fontSize: '0.72rem' }}>
                        {slotUploading ? 'Envoi…' : 'Enregistrer'}
                      </button>
                      <button type="button" onClick={closeSlotForm} className="btn btn--ghost" style={{ padding: '0.5rem 0.8rem', fontSize: '0.72rem' }}>Annuler</button>
                    </div>
                  </form>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const GROUPES_ADHERENT = ['Running', 'Marche Nordique Sportive', 'Marche Loisir']
const STATUTS_ADHERENT = ['Adhérents 2027', 'Anciens adhérents', 'Nouveaux adhérents']

function adminFormFromMember(m) {
  return {
    prenom: m.prenom || '', nom: m.nom || '', role: m.role || '', groupe: m.groupe || '', statut: m.statut || '', sexe: m.sexe || '',
    roleAppId: m.roleApp?.id ?? '',

    dateNaissance: m.dateNaissance || '', lieuNaissance: m.lieuNaissance || '', adresse: m.adresse || '',
    codePostal: m.codePostal || '', ville: m.ville || '', telephoneDomicile: m.telephoneDomicile || '',
    telephonePortable: m.telephonePortable || '', nationalite: m.nationalite || '', urgenceNom: m.urgenceNom || '',
    urgenceTelephone: m.urgenceTelephone || '', tailleMaillot: m.tailleMaillot || '', vma: m.vma ?? '', vmaDate: m.vmaDate || '',

    numeroLicence: m.numeroLicence || '', licenciePar: m.licenciePar || '', fonctionBureau: m.fonctionBureau || '',
    origineContact: m.origineContact || '',
    anneePremiereAdhesion: m.anneePremiereAdhesion ?? '', datePremiereAdhesion: m.datePremiereAdhesion || '',
    dateDernierCertificat: m.dateDernierCertificat || '', anneeDerniereAdhesion: m.anneeDerniereAdhesion ?? '',
    activiteSaison: m.activiteSaison || '', licenceFfaType: m.licenceFfaType || '',
    montantCotisation: m.montantCotisation ?? '', datePaiementCotisation: m.datePaiementCotisation || '', modePaiement: m.modePaiement || '',
  }
}

// Convertit un formulaire (issu de adminFormFromMember, éventuellement modifié)
// vers le format attendu par l'API (chaînes vides -> null pour les champs nullable).
function toAdminUpdatePayload(form) {
  return {
    ...form,
    dateNaissance: form.dateNaissance === '' ? null : form.dateNaissance,
    roleAppId: form.roleAppId === '' || form.roleAppId == null ? null : Number(form.roleAppId),
    vmaDate: form.vmaDate === '' ? null : form.vmaDate,
    vma: form.vma === '' ? null : Number(form.vma),
    anneePremiereAdhesion: form.anneePremiereAdhesion === '' ? null : Number(form.anneePremiereAdhesion),
    datePremiereAdhesion: form.datePremiereAdhesion === '' ? null : form.datePremiereAdhesion,
    dateDernierCertificat: form.dateDernierCertificat === '' ? null : form.dateDernierCertificat,
    anneeDerniereAdhesion: form.anneeDerniereAdhesion === '' ? null : Number(form.anneeDerniereAdhesion),
    montantCotisation: form.montantCotisation === '' ? null : Number(form.montantCotisation),
    datePaiementCotisation: form.datePaiementCotisation === '' ? null : form.datePaiementCotisation,
  }
}

const NEW_MEMBER_FORM = { email: '', prenom: '', nom: '', role: '', groupe: '', statut: '', sexe: '', roleAppId: '' }

function AdminModal({ onClose, maxWidth = 640, children }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(28,25,23,0.5)', zIndex: 55, display: 'flex', justifyContent: 'center', padding: '2rem 1rem', overflowY: 'auto' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--surface)', border: '1px solid var(--line)', maxWidth, width: '100%', height: 'fit-content', padding: '1.6rem' }}
      >
        {children}
      </div>
    </div>
  )
}

function sortValue(m, key) {
  if (key === 'roleApp') return (m.roleApp?.nom || '').toLowerCase()
  return (m[key] || '').toString().toLowerCase()
}

function AdminMembersPanel({ token, me, onMembersChanged }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('nom')
  const [sortDir, setSortDir] = useState('asc')
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const [creating, setCreating] = useState(false)
  const [newForm, setNewForm] = useState(NEW_MEMBER_FORM)
  const [createSaving, setCreateSaving] = useState(false)
  const [createMessage, setCreateMessage] = useState('')

  const [emailValue, setEmailValue] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailMessage, setEmailMessage] = useState('')

  const [createdMember, setCreatedMember] = useState(null)
  const [sendingWelcomeId, setSendingWelcomeId] = useState(null)
  const [actionError, setActionError] = useState('')
  const [generatingCodeId, setGeneratingCodeId] = useState(null)
  const [generatedCode, setGeneratedCode] = useState(null) // { member, code, expiresAt }
  const [roles, setRoles] = useState([])
  const peutChangerRole = !!me?.features?.includes('roles.admin')

  useEffect(() => {
    api.getRoles(token).then((d) => setRoles(d.roles)).catch(() => {})
  }, [token])

  useEffect(() => {
    let cancelled = false
    api.adminListMembers(token)
      .then((data) => { if (!cancelled) setMembers(data) })
      .catch((err) => { if (!cancelled) setLoadError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return members.filter((m) => `${m.prenom} ${m.nom} ${m.email}`.toLowerCase().includes(q))
  }, [members, search])

  const sorted = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) => {
      const va = sortValue(a, sortKey)
      const vb = sortValue(b, sortKey)
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [filtered, sortKey, sortDir])

  function sortBy(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function sortIndicator(key) {
    if (sortKey !== key) return null
    return sortDir === 'asc' ? ' ▲' : ' ▼'
  }

  const selected = members.find((m) => m.id === selectedId) || null

  function selectMember(m) {
    setSelectedId(m.id)
    setForm(adminFormFromMember(m))
    setSaveMessage('')
    setCreating(false)
    setEmailValue(m.email)
    setEmailMessage('')
  }

  async function handleSaveEmail() {
    setEmailSaving(true)
    setEmailMessage('')
    try {
      const updated = await api.adminUpdateEmail(token, selectedId, emailValue)
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
      setEmailMessage('Adresse email mise à jour.')
      onMembersChanged?.()
    } catch (err) {
      setEmailMessage(err.message)
    } finally {
      setEmailSaving(false)
    }
  }

  function openCreateForm() {
    setCreating(true)
    setSelectedId(null)
    setForm(null)
    setNewForm(NEW_MEMBER_FORM)
    setCreateMessage('')
    setCreatedMember(null)
  }

  async function handleSendWelcome(targetMember) {
    setSendingWelcomeId(targetMember.id)
    setActionError('')
    try {
      const updated = await api.adminSendWelcomeEmail(token, targetMember.id)
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
      if (createdMember && createdMember.id === updated.id) setCreatedMember(updated)
      return updated
    } catch (err) {
      setActionError(err.message)
      throw err
    } finally {
      setSendingWelcomeId(null)
    }
  }

  async function handleGenerateCode(targetMember) {
    setGeneratingCodeId(targetMember.id)
    setActionError('')
    try {
      const { code, expiresAt } = await api.adminGenerateCode(token, targetMember.id)
      setGeneratedCode({ member: targetMember, code, expiresAt })
    } catch (err) {
      setActionError(err.message)
    } finally {
      setGeneratingCodeId(null)
    }
  }

  function updateNewField(key, value) {
    setNewForm((f) => ({ ...f, [key]: value }))
  }

  async function handleCreate(e) {
    e.preventDefault()
    setCreateSaving(true)
    setCreateMessage('')
    try {
      const created = await api.adminCreateMember(token, newForm)
      setMembers((prev) => [...prev, created])
      setCreatedMember(created)
      onMembersChanged?.()
    } catch (err) {
      setCreateMessage(err.message)
    } finally {
      setCreateSaving(false)
    }
  }

  function closeCreatedPrompt() {
    setCreating(false)
    setCreatedMember(null)
  }

  async function handleDelete() {
    if (!selected) return
    setDeleting(true)
    setSaveMessage('')
    try {
      await api.adminDeleteMember(token, selected.id)
      setMembers((prev) => prev.filter((m) => m.id !== selected.id))
      setSelectedId(null)
      setForm(null)
      onMembersChanged?.()
    } catch (err) {
      setSaveMessage(err.message)
    } finally {
      setDeleting(false)
      setConfirmingDelete(false)
    }
  }

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaveMessage('')
    try {
      const payload = toAdminUpdatePayload(form)
      const updated = await api.adminUpdateMember(token, selectedId, payload)
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
      setSaveMessage('Modifications enregistrées.')
      onMembersChanged?.()
    } catch (err) {
      setSaveMessage(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = { padding: '0.6rem 0.75rem', background: '#fff', color: '#1C1917', border: '1px solid var(--line)', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '0.85rem' }

  return (
    <div>
      <span className="eyebrow" style={{ fontWeight: 'bold' }}>Gestion des adhérents</span>
      <p style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', margin: '0.3rem 0 1.2rem' }}>
        Modifier les informations confidentielles et administratives de n'importe quel adhérent.
      </p>

      {loading && <p style={{ color: 'var(--stone)' }}>Chargement des adhérents…</p>}
      {loadError && <p style={{ color: 'var(--vermilion)' }}>{loadError}</p>}
      {actionError && !createdMember && <p style={{ color: 'var(--vermilion)' }}>{actionError}</p>}

      {!loading && !loadError && (
        // Sort de la largeur de .shell (max-width: 1180px) pour profiter de
        // tout l'écran disponible sur un tableau à nombreuses colonnes.
        <div style={{ width: '100vw', position: 'relative', left: '50%', right: '50%', marginLeft: '-50vw', marginRight: '-50vw', paddingInline: 'var(--edge)', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '1.2rem', alignItems: 'center' }}>
            <button type="button" onClick={openCreateForm} className="btn btn--solid" style={{ padding: '0.65rem 1.2rem', fontSize: '0.8rem' }}>
              + Nouvel adhérent
            </button>
            <input
              type="text"
              placeholder="Rechercher un adhérent…"
              style={{ ...inputStyle, flex: 1, minWidth: 240, width: 'auto', padding: '0.7rem 0.9rem', fontSize: '0.95rem' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--stone)' }}>
              {sorted.length} adhérent{sorted.length > 1 ? 's' : ''}
            </span>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: '0.95rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', color: 'var(--stone)', textTransform: 'uppercase', fontSize: '0.78rem' }}>
                  <th style={{ padding: '1rem', width: 64 }}></th>
                  <th style={{ padding: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => sortBy('nom')}>Nom{sortIndicator('nom')}</th>
                  <th style={{ padding: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => sortBy('prenom')}>Prénom{sortIndicator('prenom')}</th>
                  <th style={{ padding: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => sortBy('email')}>Email{sortIndicator('email')}</th>
                  <th style={{ padding: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => sortBy('groupe')}>Groupe{sortIndicator('groupe')}</th>
                  <th style={{ padding: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => sortBy('statut')}>Statut{sortIndicator('statut')}</th>
                  <th style={{ padding: '1rem', cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'center' }} onClick={() => sortBy('roleApp')}>Rôle{sortIndicator('roleApp')}</th>
                  <th style={{ padding: '1rem', whiteSpace: 'nowrap' }}>Activation du compte</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => selectMember(m)}
                    style={{ borderBottom: '1px solid var(--line)', cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                  >
                    <td style={{ padding: '0.5rem 1rem' }}><Avatar photoUrl={m.photoUrl} nom={`${m.prenom} ${m.nom}`} size={44} /></td>
                    <td style={{ padding: '0.9rem 1rem' }}><b>{m.nom}</b></td>
                    <td style={{ padding: '0.9rem 1rem' }}>{m.prenom}</td>
                    <td style={{ padding: '0.9rem 1rem', color: 'var(--ink-soft)' }}>{m.email}</td>
                    <td style={{ padding: '0.9rem 1rem' }}>{m.groupe || '—'}</td>
                    <td style={{ padding: '0.9rem 1rem' }}>{m.statut || '—'}</td>
                    <td style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>
                      {m.roleApp && m.roleApp.nom !== 'Adhérent'
                        ? <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.55rem', background: 'var(--vermilion)', color: '#fff', whiteSpace: 'nowrap' }}>{m.roleApp.nom}</span>
                        : <span style={{ fontSize: '0.72rem', color: 'var(--stone)' }}>{m.roleApp?.nom || '—'}</span>}
                    </td>
                    <td style={{ padding: '0.9rem 1rem' }} onClick={(e) => e.stopPropagation()}>
                      {m.activatedAt ? (
                        <div style={{ fontSize: '0.78rem', color: '#065f46' }}>✓ Activé le {formatDateTime(m.activatedAt)}</div>
                      ) : (
                        <>
                          <div style={{ fontSize: '0.78rem', color: 'var(--stone)' }}>
                            {m.welcomeEmailSentAt ? `Email envoyé le ${formatDateTime(m.welcomeEmailSentAt)}` : 'En attente'}
                          </div>
                          <button
                            type="button"
                            disabled={sendingWelcomeId === m.id}
                            onClick={() => handleSendWelcome(m)}
                            className="link-button"
                            style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}
                          >
                            {sendingWelcomeId === m.id ? 'Envoi…' : m.welcomeEmailSentAt ? "Renvoyer l'email" : "Envoyer l'email de bienvenue"}
                          </button>
                        </>
                      )}
                      <div>
                        <button
                          type="button"
                          disabled={generatingCodeId === m.id}
                          onClick={() => handleGenerateCode(m)}
                          className="link-button"
                          style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}
                        >
                          {generatingCodeId === m.id ? 'Génération…' : "Générer un code d'accès"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: '1.2rem 1rem', color: 'var(--stone)' }}>Aucun adhérent trouvé.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {creating && !createdMember && (
        <AdminModal onClose={() => setCreating(false)} maxWidth={560}>
          <form onSubmit={handleCreate} style={{ display: 'grid', gap: '0.9rem' }}>
              <b style={{ fontSize: '1.05rem' }}>Nouvel adhérent</b>
              <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
                Seule l'identité de base est nécessaire ici. L'adhérent complétera ses informations confidentielles et définira son mot de passe lui-même via « Mot de passe oublié ? ».
              </p>
              <div>{fieldLabel('Email')}<input type="email" required style={inputStyle} value={newForm.email} onChange={(e) => updateNewField('email', e.target.value)} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>{fieldLabel('Prénom')}<input type="text" required style={inputStyle} value={newForm.prenom} onChange={(e) => updateNewField('prenom', e.target.value)} /></div>
                <div>{fieldLabel('Nom')}<input type="text" required style={inputStyle} value={newForm.nom} onChange={(e) => updateNewField('nom', e.target.value)} /></div>
              </div>
              <div>{fieldLabel('Rôle')}<input type="text" style={inputStyle} value={newForm.role} onChange={(e) => updateNewField('role', e.target.value)} /></div>
              <div>
                {fieldLabel('Sexe')}
                <select style={inputStyle} value={newForm.sexe || ''} onChange={(e) => updateNewField('sexe', e.target.value)}>
                  <option value="">Non renseigné</option>
                  <option value="F">Femme</option>
                  <option value="H">Homme</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>
                  {fieldLabel('Groupe')}
                  <select style={inputStyle} value={newForm.groupe} onChange={(e) => updateNewField('groupe', e.target.value)}>
                    <option value="">—</option>
                    {GROUPES_ADHERENT.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  {fieldLabel('Statut')}
                  <select style={inputStyle} value={newForm.statut} onChange={(e) => updateNewField('statut', e.target.value)}>
                    <option value="">—</option>
                    {STATUTS_ADHERENT.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                {fieldLabel("Rôle dans l'application")}
                <select style={inputStyle} value={newForm.roleAppId ?? ''} disabled={!peutChangerRole} onChange={(e) => updateNewField('roleAppId', e.target.value)}>
                  {!peutChangerRole && !newForm.roleAppId && <option value="">—</option>}
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
                </select>
                <small style={{ color: 'var(--stone)', fontSize: '0.72rem' }}>{peutChangerRole ? "Détermine les fonctionnalités d'administration de l'adhérent (écran Rôles et droits)." : "Seul un administrateur des rôles peut changer le rôle d'un adhérent."}</small>
              </div>

              {createMessage && <p style={{ fontSize: '0.8rem', color: 'var(--vermilion)' }}>{createMessage}</p>}
              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <button type="submit" disabled={createSaving} className="btn btn--solid" style={{ justifyContent: 'center', flex: 1 }}>
                  {createSaving ? 'Création…' : "Créer l'adhérent"}
                </button>
                <button type="button" onClick={() => setCreating(false)} className="btn btn--ghost" style={{ justifyContent: 'center' }}>Annuler</button>
              </div>
          </form>
        </AdminModal>
      )}

      {createdMember && (
        <AdminModal onClose={closeCreatedPrompt} maxWidth={480}>
          <div style={{ display: 'grid', gap: '0.9rem' }}>
            <b style={{ fontSize: '1.05rem' }}>Adhérent créé ✓</b>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
              <b>{createdMember.prenom} {createdMember.nom}</b> ({createdMember.email}) a été créé. Veux-tu lui envoyer tout de suite l'email de bienvenue, avec le lien pour définir son mot de passe ?
            </p>
            {createdMember.welcomeEmailSentAt && (
              <p style={{ fontSize: '0.8rem', color: '#065f46' }}>✓ Email envoyé le {formatDateTime(createdMember.welcomeEmailSentAt)}.</p>
            )}
            {actionError && <p style={{ fontSize: '0.8rem', color: 'var(--vermilion)' }}>{actionError}</p>}
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button
                type="button"
                disabled={sendingWelcomeId === createdMember.id}
                onClick={() => handleSendWelcome(createdMember)}
                className="btn btn--solid"
                style={{ justifyContent: 'center', flex: 1 }}
              >
                {sendingWelcomeId === createdMember.id ? 'Envoi…' : createdMember.welcomeEmailSentAt ? "Renvoyer l'email" : "Envoyer l'email maintenant"}
              </button>
              <button type="button" onClick={closeCreatedPrompt} className="btn btn--ghost" style={{ justifyContent: 'center' }}>
                {createdMember.welcomeEmailSentAt ? 'Fermer' : 'Plus tard'}
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {generatedCode && (
        <AdminModal onClose={() => setGeneratedCode(null)} maxWidth={480}>
          <div style={{ display: 'grid', gap: '0.9rem' }}>
            <b style={{ fontSize: '1.05rem' }}>Code de connexion généré</b>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
              Un envoi par email a été tenté vers {generatedCode.member.email}, mais si l'adhérent ne le reçoit pas
              (filtrage anti-spam par ex.), communique-lui ce code par un autre moyen (téléphone, SMS, en personne) :
            </p>
            <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 'bold', letterSpacing: '0.2em' }}>{generatedCode.code}</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
              Valable jusqu'à {formatDateTime(generatedCode.expiresAt)}. L'adhérent doit se rendre sur la page de connexion,
              cliquer sur « J'ai déjà un code (communiqué par le bureau) », puis saisir ce code pour définir son mot de passe —
              <b> surtout pas « Mot de passe oublié ? »</b>, qui générerait un nouveau code et invaliderait celui-ci.
            </p>
            <button type="button" onClick={() => setGeneratedCode(null)} className="btn btn--solid" style={{ justifyContent: 'center' }}>
              Fermer
            </button>
          </div>
        </AdminModal>
      )}

      {selected && form && (
        <AdminModal onClose={() => { setSelectedId(null); setForm(null); setSaveMessage('') }} maxWidth={760}>
            <form onSubmit={handleSave} style={{ display: 'grid', gap: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '0.8rem', borderBottom: '1px solid var(--line)' }}>
                <b style={{ fontSize: '1.05rem' }}>{selected.prenom} {selected.nom}</b>
                <button
                  type="button"
                  onClick={() => { setSelectedId(null); setForm(null); setSaveMessage('') }}
                  className="link-button"
                  style={{ fontSize: '0.8rem' }}
                >
                  Fermer ✕
                </button>
              </div>

              <b style={{ fontSize: '0.85rem' }}>Adresse email</b>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                <input type="email" style={inputStyle} value={emailValue} onChange={(e) => setEmailValue(e.target.value)} />
                <button
                  type="button"
                  onClick={handleSaveEmail}
                  disabled={emailSaving || emailValue === selected.email}
                  className="btn btn--ghost"
                  style={{ padding: '0.6rem 1rem', fontSize: '0.72rem', whiteSpace: 'nowrap' }}
                >
                  {emailSaving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
              {emailMessage && <p style={{ fontSize: '0.8rem', color: 'var(--vermilion)', marginTop: '-0.3rem' }}>{emailMessage}</p>}

              <b style={{ fontSize: '0.85rem' }}>Identité & adhésion</b>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>{fieldLabel('Prénom')}<input type="text" style={inputStyle} value={form.prenom} onChange={(e) => updateField('prenom', e.target.value)} /></div>
                <div>{fieldLabel('Nom')}<input type="text" style={inputStyle} value={form.nom} onChange={(e) => updateField('nom', e.target.value)} /></div>
              </div>
              <div>{fieldLabel('Rôle')}<input type="text" style={inputStyle} value={form.role} onChange={(e) => updateField('role', e.target.value)} /></div>
              <div>
                {fieldLabel('Sexe')}
                <select style={inputStyle} value={form.sexe || ''} onChange={(e) => updateField('sexe', e.target.value)}>
                  <option value="">Non renseigné</option>
                  <option value="F">Femme</option>
                  <option value="H">Homme</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>
                  {fieldLabel('Groupe')}
                  <select style={inputStyle} value={form.groupe} onChange={(e) => updateField('groupe', e.target.value)}>
                    <option value="">—</option>
                    {GROUPES_ADHERENT.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  {fieldLabel('Statut')}
                  <select style={inputStyle} value={form.statut} onChange={(e) => updateField('statut', e.target.value)}>
                    <option value="">—</option>
                    {STATUTS_ADHERENT.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                {fieldLabel("Rôle dans l'application")}
                <select style={inputStyle} value={form.roleAppId ?? ''} disabled={!peutChangerRole} onChange={(e) => updateField('roleAppId', e.target.value)}>
                  {!peutChangerRole && !form.roleAppId && <option value="">—</option>}
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
                </select>
                <small style={{ color: 'var(--stone)', fontSize: '0.72rem' }}>{peutChangerRole ? "Détermine les fonctionnalités d'administration de l'adhérent (écran Rôles et droits)." : "Seul un administrateur des rôles peut changer le rôle d'un adhérent."}</small>
              </div>

              <b style={{ fontSize: '0.85rem', marginTop: '0.6rem' }}>Informations confidentielles</b>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>{fieldLabel('Date de naissance')}<input type="date" style={inputStyle} value={form.dateNaissance} onChange={(e) => updateField('dateNaissance', e.target.value)} /></div>
                <div>{fieldLabel('Lieu de naissance')}<input type="text" style={inputStyle} value={form.lieuNaissance} onChange={(e) => updateField('lieuNaissance', e.target.value)} /></div>
              </div>
              <div>{fieldLabel('Adresse postale')}<input type="text" style={inputStyle} value={form.adresse} onChange={(e) => updateField('adresse', e.target.value)} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.8rem' }}>
                <div>{fieldLabel('Code postal')}<input type="text" style={inputStyle} value={form.codePostal} onChange={(e) => updateField('codePostal', e.target.value)} /></div>
                <div>{fieldLabel('Localité')}<input type="text" style={inputStyle} value={form.ville} onChange={(e) => updateField('ville', e.target.value)} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>{fieldLabel('Téléphone domicile')}<input type="tel" style={inputStyle} value={form.telephoneDomicile} onChange={(e) => updateField('telephoneDomicile', e.target.value)} /></div>
                <div>{fieldLabel('Téléphone portable')}<input type="tel" style={inputStyle} value={form.telephonePortable} onChange={(e) => updateField('telephonePortable', e.target.value)} /></div>
              </div>
              <div>{fieldLabel('Nationalité')}<input type="text" style={inputStyle} value={form.nationalite} onChange={(e) => updateField('nationalite', e.target.value)} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>{fieldLabel("Urgence : prénom nom")}<input type="text" style={inputStyle} value={form.urgenceNom} onChange={(e) => updateField('urgenceNom', e.target.value)} /></div>
                <div>{fieldLabel('Urgence : téléphone')}<input type="tel" style={inputStyle} value={form.urgenceTelephone} onChange={(e) => updateField('urgenceTelephone', e.target.value)} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.8rem' }}>
                <div>
                  {fieldLabel('Taille de maillot')}
                  <select style={inputStyle} value={form.tailleMaillot} onChange={(e) => updateField('tailleMaillot', e.target.value)}>
                    <option value="">—</option>
                    {TAILLES_MAILLOT.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>{fieldLabel('VMA')}<input type="number" step="0.1" style={inputStyle} value={form.vma} onChange={(e) => updateField('vma', e.target.value)} /></div>
                <div>{fieldLabel('Date de la VMA')}<input type="date" style={inputStyle} value={form.vmaDate} onChange={(e) => updateField('vmaDate', e.target.value)} /></div>
              </div>

              <b style={{ fontSize: '0.85rem', marginTop: '0.6rem' }}>Informations administratives</b>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>{fieldLabel('Numéro de licence')}<input type="text" style={inputStyle} value={form.numeroLicence} onChange={(e) => updateField('numeroLicence', e.target.value)} /></div>
                <div>{fieldLabel('Licencié(e) par')}<input type="text" style={inputStyle} value={form.licenciePar} onChange={(e) => updateField('licenciePar', e.target.value)} /></div>
              </div>
              <div>{fieldLabel('Fonction au bureau')}<input type="text" style={inputStyle} value={form.fonctionBureau} onChange={(e) => updateField('fonctionBureau', e.target.value)} /></div>
              <div>{fieldLabel('Origine du contact')}<input type="text" style={inputStyle} value={form.origineContact} onChange={(e) => updateField('origineContact', e.target.value)} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>{fieldLabel('Année de première adhésion')}<input type="number" style={inputStyle} value={form.anneePremiereAdhesion} onChange={(e) => updateField('anneePremiereAdhesion', e.target.value)} /></div>
                <div>{fieldLabel('Date de première adhésion')}<input type="date" style={inputStyle} value={form.datePremiereAdhesion} onChange={(e) => updateField('datePremiereAdhesion', e.target.value)} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>{fieldLabel('Année de dernière adhésion')}<input type="number" style={inputStyle} value={form.anneeDerniereAdhesion} onChange={(e) => updateField('anneeDerniereAdhesion', e.target.value)} /></div>
                <div>{fieldLabel('Date du dernier certificat médical')}<input type="date" style={inputStyle} value={form.dateDernierCertificat} onChange={(e) => updateField('dateDernierCertificat', e.target.value)} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>{fieldLabel('Activité pour la saison')}<input type="text" style={inputStyle} value={form.activiteSaison} onChange={(e) => updateField('activiteSaison', e.target.value)} /></div>
                <div>{fieldLabel('Licence FFA pour la saison')}<input type="text" style={inputStyle} value={form.licenceFfaType} onChange={(e) => updateField('licenceFfaType', e.target.value)} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.8rem' }}>
                <div>{fieldLabel('Montant de la cotisation')}<input type="number" step="0.01" style={inputStyle} value={form.montantCotisation} onChange={(e) => updateField('montantCotisation', e.target.value)} /></div>
                <div>{fieldLabel('Date de paiement')}<input type="date" style={inputStyle} value={form.datePaiementCotisation} onChange={(e) => updateField('datePaiementCotisation', e.target.value)} /></div>
                <div>{fieldLabel('Mode de paiement')}<input type="text" style={inputStyle} value={form.modePaiement} onChange={(e) => updateField('modePaiement', e.target.value)} /></div>
              </div>

              {saveMessage && <p style={{ fontSize: '0.8rem', color: 'var(--vermilion)' }}>{saveMessage}</p>}
              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <button type="submit" disabled={saving} className="btn btn--solid" style={{ justifyContent: 'center', flex: 1 }}>
                  {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
                </button>
                {me && selected.id !== me.id && (
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    disabled={deleting}
                    className="btn btn--ghost"
                    style={{ justifyContent: 'center', color: 'var(--vermilion)', borderColor: 'var(--vermilion)' }}
                  >
                    {deleting ? 'Suppression…' : "Supprimer l'adhérent"}
                  </button>
                )}
              </div>
            </form>
        </AdminModal>
      )}

      {confirmingDelete && selected && (
        <div
          onClick={() => !deleting && setConfirmingDelete(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(28,25,23,0.5)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--surface)', border: '1px solid var(--line)', maxWidth: 420, width: '100%', padding: '1.6rem' }}
          >
            <h3 style={{ fontSize: '1.2rem', textTransform: 'uppercase', marginBottom: '0.8rem' }}>Supprimer cet adhérent ?</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', marginBottom: '1.4rem' }}>
              Le compte de <b>{selected.prenom} {selected.nom}</b> ({selected.email}) sera définitivement supprimé. Cette action est irréversible.
            </p>
            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setConfirmingDelete(false)} disabled={deleting} className="btn btn--ghost" style={{ justifyContent: 'center' }}>
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="btn btn--solid"
                style={{ justifyContent: 'center', background: 'var(--vermilion)', borderColor: 'var(--vermilion)' }}
              >
                {deleting ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
