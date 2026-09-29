import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { getToken, setToken as persistToken, clearToken } from '../../lib/session.js'
import PasswordField from '../../components/PasswordField.jsx'

const TABS = [
  { id: 'overview', label: 'Tableau de bord' },
  { id: 'trombi', label: 'Trombinoscope' },
  { id: 'courses', label: 'Nos Courses & Covoiturage' },
  { id: 'resultats', label: 'Résultats & Records' },
  { id: 'reseaute', label: 'SAM Réseaute' },
  { id: 'documents', label: 'Plans & Documents' },
  { id: 'vieduclub', label: 'Vie du Club' },
  { id: 'admin', label: 'Admin Club', badge: 'Bureau' },
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

export default function Dashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [search, setSearch] = useState('')
  const [activity, setActivity] = useState('Toutes les activités')
  const [status, setStatus] = useState(null)
  const [nature, setNature] = useState('Toutes')
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [openVieCard, setOpenVieCard] = useState(null)
  const [openAdminCard, setOpenAdminCard] = useState(null)
  const [openMember, setOpenMember] = useState(null)

  const [token, setAuthToken] = useState(() => getToken())
  const [me, setMe] = useState(null)
  const [members, setMembers] = useState([])

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

  function handleLogout() {
    clearToken()
    navigate('/espace-adherent')
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
          prenom: updated.prenom, nom: updated.nom, role: updated.role, groupe: updated.groupe, statut: updated.statut, photoUrl: updated.photoUrl,
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

  const filteredTrombi = useMemo(() => {
    const q = search.toLowerCase()
    return members.filter((m) => {
      const matchesQuery = `${m.prenom} ${m.nom}`.toLowerCase().includes(q) || m.role.toLowerCase().includes(q)
      const matchesActivity = activity === 'Toutes les activités' || m.groupe === activity
      const matchesStatus = !status || m.statut === status
      return matchesQuery && matchesActivity && matchesStatus
    })
  }, [members, search, activity, status])

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

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setProfileMenuOpen((v) => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', padding: '0.3rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <span>
                  <b style={{ display: 'block' }}>{me ? `${me.prenom} ${me.nom[0]}.` : '…'}</b>
                  <span style={{ color: 'var(--ink-soft)', fontSize: '0.66rem' }}>
                    {!me ? 'Chargement…' : (me.numeroLicence ? `FFA N° ${me.numeroLicence}` : 'Licence non renseignée')}
                  </span>
                </span>
                <span style={{ color: 'var(--stone)' }}>{profileMenuOpen ? '▴' : '▾'}</span>
              </button>
              {profileMenuOpen && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.4rem', background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', minWidth: 200, zIndex: 50, fontFamily: 'var(--font-mono)', fontSize: '0.72rem', textAlign: 'left' }}>
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
            {TABS.filter((tab) => tab.id !== 'admin' || me?.isBureau).map((tab) => (
              <button
                key={tab.id}
                className={`adh-tab-btn${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => switchTab(tab.id)}
              >
                {tab.label}
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
                <span className="eyebrow" style={{ color: 'var(--vermilion)', fontWeight: 'bold' }}>Prochaine compétition ciblée</span>
                <h3 style={{ fontSize: '1.4rem', textTransform: 'uppercase', marginTop: '0.3rem' }}>Semi-Marathon de Boulogne-Billancourt</h3>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--ink-soft)', margin: '0.8rem 0 0', lineHeight: 1.6 }}>
                  Date : <strong>Dimanche 15 Novembre 2026</strong><br />
                  38 coureurs du SAM Paris 12 déjà inscrits !<br />
                  Covoiturage et point de rassemblement club prévus sur place.
                </p>
                <div style={{ marginTop: '1.2rem', paddingTop: '0.8rem', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                  <span style={{ color: 'var(--stone)' }}>Tarif préférentiel négocié</span>
                  <button onClick={() => setActiveTab('courses')} className="link-button" style={{ color: 'var(--vermilion)', fontWeight: 'bold' }}>
                    Voir la liste des inscrits →
                  </button>
                </div>
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
                  <h4 style={{ fontSize: '1.2rem', textTransform: 'uppercase', marginTop: '0.2rem' }}>Bénévoles pour les Foulées du 12ème</h4>
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
              <div
                role="dialog" aria-modal="true"
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
                onClick={() => setOpenMember(null)}
              >
                <div
                  style={{ background: 'var(--surface)', border: '1px solid var(--line)', maxWidth: 480, width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: '2rem', position: 'relative', textAlign: 'center' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setOpenMember(null)}
                    aria-label="Fermer"
                    style={{ position: 'absolute', top: '1rem', right: '1rem', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid var(--line)', cursor: 'pointer', color: 'var(--ink)' }}
                  >
                    ✕
                  </button>

                  <div style={{ margin: '0 auto 1rem', display: 'flex', justifyContent: 'center' }}>
                    <Avatar photoUrl={openMember.photoUrl} nom={`${openMember.prenom} ${openMember.nom}`} size={84} />
                  </div>
                  <h3 style={{ fontSize: '1.5rem', textTransform: 'uppercase' }}>{openMember.prenom} {openMember.nom}</h3>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--vermilion)', fontWeight: 'bold' }}>{openMember.role}</span>
                  <div style={{ marginTop: '0.5rem' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--stone)', textTransform: 'uppercase', padding: '0.15rem 0.5rem', background: 'var(--surface-2)' }}>{openMember.groupe} · {openMember.statut}</span>
                  </div>

                  <div style={{ textAlign: 'left', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--line)' }}>
                    <span className="eyebrow">Je me présente</span>
                    <p style={{ fontSize: '0.9rem', color: 'var(--ink-soft)', marginTop: '0.4rem' }}>
                      {openMember.trombiBio || `Membre du groupe ${openMember.groupe}.`}
                    </p>
                  </div>

                  {(openMember.trombiHabite || openMember.trombiNaissance || openMember.trombiOrigine || openMember.trombiProfession || openMember.trombiEmployeur || openMember.trombiDistanceFavorite || openMember.trombiEmail || openMember.trombiTelephone) && (
                    <div style={{ textAlign: 'left', marginTop: '1.2rem', paddingTop: '1.2rem', borderTop: '1px solid var(--line)', display: 'grid', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
                      {openMember.trombiHabite && <p>🏠 J'habite {openMember.trombiHabite}</p>}
                      {openMember.trombiNaissance && <p>🎂 Né le {openMember.trombiNaissance}</p>}
                      {openMember.trombiOrigine && <p>📍 Originaire de {openMember.trombiOrigine}</p>}
                      {(openMember.trombiProfession || openMember.trombiEmployeur) && (
                        <p>💼 {[openMember.trombiProfession, openMember.trombiEmployeur].filter(Boolean).join(' — ')}</p>
                      )}
                      {openMember.trombiDistanceFavorite && <p>🏃 Distance favorite : {openMember.trombiDistanceFavorite}</p>}
                      {openMember.trombiEmail && <p>✉️ <a href={`mailto:${openMember.trombiEmail}`} style={{ color: 'var(--vermilion)' }}>{openMember.trombiEmail}</a></p>}
                      {openMember.trombiTelephone && <p>📞 {openMember.trombiTelephone}</p>}
                    </div>
                  )}

                  <div style={{ textAlign: 'left', marginTop: '1.2rem', paddingTop: '1.2rem', borderTop: '1px solid var(--line)' }}>
                    <span className="eyebrow">Agenda</span>
                    <p style={{ fontSize: '0.9rem', color: 'var(--ink-soft)', marginTop: '0.4rem' }}>Aucune course à venir renseignée pour le moment.</p>
                  </div>

                  <div style={{ textAlign: 'left', marginTop: '1.2rem', paddingTop: '1.2rem', borderTop: '1px solid var(--line)' }}>
                    <span className="eyebrow">Derniers résultats</span>
                    <p style={{ fontSize: '0.85rem', color: 'var(--stone)', marginTop: '0.4rem', fontStyle: 'italic' }}>
                      Fonctionnalité de démonstration — dans l'espace adhérent réel, cette section affiche l'historique des courses de l'adhérent (date, épreuve, temps, classement).
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'courses' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <span className="eyebrow">Compétitions cibles &amp; Déplacements</span>
              <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', marginTop: '0.2rem' }}>Nos Courses &amp; Covoiturage</h2>
              <p style={{ fontSize: '0.95rem', color: 'var(--ink-soft)', marginTop: '0.3rem' }}>Chaque trimestre, le SAM Paris 12 sélectionne des courses pour courir sous les couleurs du club et s'organiser ensemble.</p>
            </div>

            <div style={{ display: 'grid', gap: '1.2rem' }}>
              {[
                {
                  badge: 'Semi-marathon', date: '15 Novembre 2026', titre: 'Semi-Marathon de Boulogne-Billancourt',
                  info: <>Inscrits du club : <strong>38 coureurs</strong> · Statut : <span style={{ color: '#059669', fontWeight: 'bold' }}>Inscriptions ouvertes</span></>,
                  tag: '🚗 Covoiturage actif (6 voitures)', action: 'Rejoindre le groupe',
                },
                {
                  badge: 'Cross', date: '13 Décembre 2026', titre: "Cross Régional d'Île-de-France",
                  info: <>Inscrits du club : <strong>24 coureurs</strong> · Statut : <span style={{ color: '#059669', fontWeight: 'bold' }}>Prise en charge club</span></>,
                  tag: '🚗 Minibus club prévu', action: 'Rejoindre le groupe',
                },
                {
                  badge: '10 km route', date: 'Printemps 2027', titre: 'Les Foulées du 12ème (Bois de Vincennes)',
                  info: <>Organisation + <strong>85 coureurs</strong> du SAM · Statut : <span style={{ color: 'var(--vermilion)', fontWeight: 'bold' }}>Course du club</span></>,
                  secondaryAction: 'S’inscrire comme bénévole', action: 'Dossard club',
                },
                {
                  badge: 'Marathon', date: 'Avril 2027', titre: 'Marathon de Paris',
                  info: <>Inscrits du club : <strong>62 marathoniens</strong> · Statut : <span style={{ color: '#059669', fontWeight: 'bold' }}>Plans prépa en cours</span></>,
                  secondaryAction: 'Télécharger le plan marathon', action: 'Groupe WhatsApp Dédié',
                  onSecondary: () => setActiveTab('documents'),
                },
              ].map((c) => (
                <div key={c.titre} style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '1.5rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1.2rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                      <span style={{ background: 'var(--vermilion)', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 'bold', padding: '0.15rem 0.5rem', textTransform: 'uppercase' }}>{c.badge}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--stone)' }}>{c.date}</span>
                    </div>
                    <h3 style={{ fontSize: '1.4rem', textTransform: 'uppercase' }}>{c.titre}</h3>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--ink-soft)', margin: '0.4rem 0 0' }}>{c.info}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                    {c.tag && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', padding: '0.35rem 0.7rem', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>{c.tag}</span>}
                    {c.secondaryAction && (
                      <button onClick={c.onSecondary} className="btn btn--ghost" style={{ padding: '0.6rem 1.1rem', fontSize: '0.72rem' }}>{c.secondaryAction}</button>
                    )}
                    <button className="btn btn--solid" style={{ padding: '0.6rem 1.1rem', fontSize: '0.72rem' }}>{c.action}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'resultats' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <span className="eyebrow">Performances officielles</span>
              <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', marginTop: '0.2rem' }}>Résultats &amp; Records du Club</h2>
              <p style={{ fontSize: '0.95rem', color: 'var(--ink-soft)', marginTop: '0.3rem' }}>Derniers chronos enregistrés par les athlètes du SAM Paris 12 sur les compétitions officielles.</p>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', overflowX: 'auto', marginBottom: '2rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', color: 'var(--stone)', textTransform: 'uppercase', fontSize: '0.68rem' }}>
                    <th style={{ padding: '0.8rem 1rem' }}>Athlète</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Course</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Distance</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Temps Officiel</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Mention / Classement</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Thomas G.', 'Trail des 25 Bosses (Fontainebleau)', '32 km · 1100m D+', '3h 42m 18s', '14e scratch'],
                    ['Camille R.', '10 km Paris Centre', '10 km', '41m 24s', '3e M0F (Record personnel)'],
                    ['Laurent D.', 'Semi-Marathon de Paris', '21,1 km', '1h 32m 45s', 'Qualif. Championnats de France'],
                    ['Équipe Marche Nordique MNS', 'Nordique de la forêt de Meudon', '15 km', '1h 51m 10s', '2e équipe mixte'],
                  ].map((row) => (
                    <tr key={row[0] + row[1]} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '0.8rem 1rem' }}><b>{row[0]}</b></td>
                      <td style={{ padding: '0.8rem 1rem' }}>{row[1]}</td>
                      <td style={{ padding: '0.8rem 1rem', color: 'var(--vermilion)', fontWeight: 'bold' }}>{row[2]}</td>
                      <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold', fontSize: '0.85rem' }}>{row[3]}</td>
                      <td style={{ padding: '0.8rem 1rem', color: 'var(--stone)' }}>{row[4]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '1.5rem' }}>
              <span className="eyebrow" style={{ color: 'var(--vermilion)', fontWeight: 'bold', marginBottom: '1rem', display: 'block' }}>
                Tableau des records historiques du SAM Paris 12
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', fontFamily: 'var(--font-mono)' }}>
                {[
                  ['10 KM Route', '30m 42s'],
                  ['Semi-Marathon', '1h 07m 15s'],
                  ['Marathon', '2h 24m 50s'],
                  ['100 KM Route', '7h 12m 30s'],
                ].map(([label, val]) => (
                  <div key={label} style={{ background: '#fff', border: '1px solid var(--line)', padding: '1rem' }}>
                    <span style={{ color: 'var(--stone)', fontSize: '0.68rem', textTransform: 'uppercase', display: 'block' }}>{label}</span>
                    <b style={{ fontSize: '1.3rem', color: 'var(--vermilion)', display: 'block', marginTop: '0.2rem' }}>{val}</b>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <span className="eyebrow">Programmes &amp; Vie du club</span>
              <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', marginTop: '0.2rem' }}>Plans d'Entraînement &amp; Documents</h2>
              <p style={{ fontSize: '0.95rem', color: 'var(--ink-soft)', marginTop: '0.3rem' }}>Téléchargez les plans préparés par nos entraîneurs diplômés FFA et les documents officiels de l'association.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.2rem' }}>
              {[
                { kind: 'PDF · Programme trimestriel', titre: 'Plans d’entraînement running', auteur: 'Encadrement SAM Paris 12' },
                { kind: 'PDF · Résultats', titre: 'Résultat du test VMA', auteur: 'Encadrement SAM Paris 12' },
                { kind: 'PDF · Grille d’allures piste', titre: 'Allure fractionné / VMA par niveau', auteur: 'Commission des entraîneurs FFA' },
                { kind: 'PDF · Plan des lieux', titre: 'Plan du stade', auteur: 'SAM Paris 12' },
              ].map((doc) => (
                <div key={doc.titre} style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <span className="eyebrow" style={{ color: 'var(--vermilion)', fontWeight: 'bold' }}>{doc.kind}</span>
                    <h3 style={{ fontSize: '1.25rem', textTransform: 'uppercase', marginTop: '0.2rem' }}>{doc.titre}</h3>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--stone)', margin: '0.4rem 0 0' }}>Auteur{doc.auteur.includes('&') ? 's' : ''} : {doc.auteur}</p>
                  </div>
                  <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn--ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.72rem' }}>Télécharger le document ↓</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
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

        {activeTab === 'admin' && !me?.isBureau && (
          <p style={{ color: 'var(--stone)' }}>Cette section est réservée aux membres du bureau du club.</p>
        )}
        {activeTab === 'admin' && me?.isBureau && (
          <div>
            {!openAdminCard ? (
              <>
                <div style={{ marginBottom: '1.5rem' }}>
                  <span className="eyebrow">Réservé au bureau du club</span>
                  <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', marginTop: '0.2rem' }}>Admin Club</h2>
                  <p style={{ fontSize: '0.95rem', color: 'var(--ink-soft)', marginTop: '0.3rem' }}>Outils de gestion réservés aux membres du bureau et de l'organisation.</p>
                </div>

                <AdminMembersPanel token={token} me={me} />

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

        {activeTab === 'profil' && (
          <ProfilPanel token={token} me={me} onMeUpdate={handleMeUpdate} onPasswordChanged={handlePasswordChanged} />
        )}
      </main>

      <footer style={{ borderTop: '1px solid var(--line)', background: 'var(--surface)', padding: '1rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--stone)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.6rem 1.2rem', marginBottom: '0.6rem' }}>
          <button className="link-button" style={{ textTransform: 'none' }}>Plan du site</button>
          <button onClick={() => navigate('/adhesion/paiement')} className="link-button" style={{ textTransform: 'none' }}>Paiements Club</button>
        </div>
        SAM Paris 12 · Espace réservé aux adhérents (démonstration) · Licence FFA N° 075043<br />
        Contact : <a href="mailto:contact@samparis12.org" style={{ textDecoration: 'underline' }}>contact@samparis12.org</a>
        {' '}· Objets perdus : <a href="mailto:objetsperdus@samparis12.org" style={{ textDecoration: 'underline' }}>objetsperdus@samparis12.org</a>
      </footer>
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
            {infoRow("Droit d'administrer les événements", me.droitAdminEvenements ? 'Oui' : 'Non')}
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

const GROUPES_ADHERENT = ['Running', 'Marche Nordique Sportive', 'Marche Loisir']
const STATUTS_ADHERENT = ['Adhérents 2027', 'Anciens adhérents', 'Nouveaux adhérents']

function adminFormFromMember(m) {
  return {
    prenom: m.prenom || '', nom: m.nom || '', role: m.role || '', groupe: m.groupe || '', statut: m.statut || '',
    isBureau: !!m.isBureau,

    dateNaissance: m.dateNaissance || '', lieuNaissance: m.lieuNaissance || '', adresse: m.adresse || '',
    codePostal: m.codePostal || '', ville: m.ville || '', telephoneDomicile: m.telephoneDomicile || '',
    telephonePortable: m.telephonePortable || '', nationalite: m.nationalite || '', urgenceNom: m.urgenceNom || '',
    urgenceTelephone: m.urgenceTelephone || '', tailleMaillot: m.tailleMaillot || '', vma: m.vma ?? '', vmaDate: m.vmaDate || '',

    numeroLicence: m.numeroLicence || '', licenciePar: m.licenciePar || '', fonctionBureau: m.fonctionBureau || '',
    droitAdminEvenements: !!m.droitAdminEvenements, origineContact: m.origineContact || '',
    anneePremiereAdhesion: m.anneePremiereAdhesion ?? '', datePremiereAdhesion: m.datePremiereAdhesion || '',
    dateDernierCertificat: m.dateDernierCertificat || '', anneeDerniereAdhesion: m.anneeDerniereAdhesion ?? '',
    activiteSaison: m.activiteSaison || '', licenceFfaType: m.licenceFfaType || '',
    montantCotisation: m.montantCotisation ?? '', datePaiementCotisation: m.datePaiementCotisation || '', modePaiement: m.modePaiement || '',
  }
}

const NEW_MEMBER_FORM = { email: '', prenom: '', nom: '', role: '', groupe: '', statut: '', isBureau: false }

function AdminMembersPanel({ token, me }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [deleting, setDeleting] = useState(false)

  const [creating, setCreating] = useState(false)
  const [newForm, setNewForm] = useState(NEW_MEMBER_FORM)
  const [createSaving, setCreateSaving] = useState(false)
  const [createMessage, setCreateMessage] = useState('')

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

  const selected = members.find((m) => m.id === selectedId) || null

  function selectMember(m) {
    setSelectedId(m.id)
    setForm(adminFormFromMember(m))
    setSaveMessage('')
    setCreating(false)
  }

  function openCreateForm() {
    setCreating(true)
    setSelectedId(null)
    setForm(null)
    setNewForm(NEW_MEMBER_FORM)
    setCreateMessage('')
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
      setCreating(false)
      selectMember(created)
      setSaveMessage("Compte créé. L'adhérent doit utiliser « Mot de passe oublié ? » sur l'écran de connexion pour définir son mot de passe.")
    } catch (err) {
      setCreateMessage(err.message)
    } finally {
      setCreateSaving(false)
    }
  }

  async function handleDelete() {
    if (!selected) return
    if (!window.confirm(`Supprimer définitivement le compte de ${selected.prenom} ${selected.nom} ? Cette action est irréversible.`)) {
      return
    }
    setDeleting(true)
    setSaveMessage('')
    try {
      await api.adminDeleteMember(token, selected.id)
      setMembers((prev) => prev.filter((m) => m.id !== selected.id))
      setSelectedId(null)
      setForm(null)
    } catch (err) {
      setSaveMessage(err.message)
    } finally {
      setDeleting(false)
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
      const payload = {
        ...form,
        dateNaissance: form.dateNaissance === '' ? null : form.dateNaissance,
        vmaDate: form.vmaDate === '' ? null : form.vmaDate,
        vma: form.vma === '' ? null : Number(form.vma),
        anneePremiereAdhesion: form.anneePremiereAdhesion === '' ? null : Number(form.anneePremiereAdhesion),
        datePremiereAdhesion: form.datePremiereAdhesion === '' ? null : form.datePremiereAdhesion,
        dateDernierCertificat: form.dateDernierCertificat === '' ? null : form.dateDernierCertificat,
        anneeDerniereAdhesion: form.anneeDerniereAdhesion === '' ? null : Number(form.anneeDerniereAdhesion),
        montantCotisation: form.montantCotisation === '' ? null : Number(form.montantCotisation),
        datePaiementCotisation: form.datePaiementCotisation === '' ? null : form.datePaiementCotisation,
      }
      const updated = await api.adminUpdateMember(token, selectedId, payload)
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
      setSaveMessage('Modifications enregistrées.')
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

      {!loading && !loadError && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 320px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
            <div style={{ padding: '0.8rem', display: 'grid', gap: '0.6rem' }}>
              <button type="button" onClick={openCreateForm} className="btn btn--solid" style={{ justifyContent: 'center', padding: '0.5rem', fontSize: '0.72rem' }}>
                + Nouvel adhérent
              </button>
              <input type="text" placeholder="Rechercher un adhérent…" style={inputStyle} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div style={{ maxHeight: 480, overflowY: 'auto', borderTop: '1px solid var(--line)' }}>
              {filtered.map((m) => (
                <button
                  key={m.id}
                  onClick={() => selectMember(m)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', background: m.id === selectedId ? 'var(--surface-2)' : 'none',
                    border: 'none', borderBottom: '1px solid var(--line)', padding: '0.7rem 0.9rem', cursor: 'pointer',
                    fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
                  }}
                >
                  <b>{m.prenom} {m.nom}</b>
                  {m.isBureau && <span style={{ marginLeft: '0.4rem', fontSize: '0.6rem', padding: '0.1rem 0.35rem', background: 'var(--vermilion)', color: '#fff' }}>Bureau</span>}
                  <div style={{ color: 'var(--ink-soft)', marginTop: '0.2rem' }}>{m.email}</div>
                </button>
              ))}
              {filtered.length === 0 && (
                <p style={{ padding: '0.9rem', color: 'var(--stone)', fontSize: '0.8rem' }}>Aucun adhérent trouvé.</p>
              )}
            </div>
          </div>

          {creating ? (
            <form onSubmit={handleCreate} style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '1.5rem', display: 'grid', gap: '0.9rem' }}>
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
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <input type="checkbox" checked={newForm.isBureau} onChange={(e) => updateNewField('isBureau', e.target.checked)} />
                Membre du bureau (accès à cette page d'administration)
              </label>

              {createMessage && <p style={{ fontSize: '0.8rem', color: 'var(--vermilion)' }}>{createMessage}</p>}
              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <button type="submit" disabled={createSaving} className="btn btn--solid" style={{ justifyContent: 'center', flex: 1 }}>
                  {createSaving ? 'Création…' : "Créer l'adhérent"}
                </button>
                <button type="button" onClick={() => setCreating(false)} className="btn btn--ghost" style={{ justifyContent: 'center' }}>Annuler</button>
              </div>
            </form>
          ) : !selected || !form ? (
            <p style={{ color: 'var(--stone)' }}>Sélectionnez un adhérent pour modifier ses informations, ou créez-en un nouveau.</p>
          ) : (
            <form onSubmit={handleSave} style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '1.5rem', display: 'grid', gap: '0.9rem' }}>
              <div style={{ paddingBottom: '0.8rem', borderBottom: '1px solid var(--line)' }}>
                <b style={{ fontSize: '1.05rem' }}>{selected.prenom} {selected.nom}</b>
                <div style={{ color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{selected.email}</div>
              </div>

              <b style={{ fontSize: '0.85rem' }}>Identité & adhésion</b>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>{fieldLabel('Prénom')}<input type="text" style={inputStyle} value={form.prenom} onChange={(e) => updateField('prenom', e.target.value)} /></div>
                <div>{fieldLabel('Nom')}<input type="text" style={inputStyle} value={form.nom} onChange={(e) => updateField('nom', e.target.value)} /></div>
              </div>
              <div>{fieldLabel('Rôle')}<input type="text" style={inputStyle} value={form.role} onChange={(e) => updateField('role', e.target.value)} /></div>
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
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <input type="checkbox" checked={form.isBureau} onChange={(e) => updateField('isBureau', e.target.checked)} />
                Membre du bureau (accès à cette page d'administration)
              </label>

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
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <input type="checkbox" checked={form.droitAdminEvenements} onChange={(e) => updateField('droitAdminEvenements', e.target.checked)} />
                Droit d'administrer les événements
              </label>
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
                    onClick={handleDelete}
                    disabled={deleting}
                    className="btn btn--ghost"
                    style={{ justifyContent: 'center', color: 'var(--vermilion)', borderColor: 'var(--vermilion)' }}
                  >
                    {deleting ? 'Suppression…' : "Supprimer l'adhérent"}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
