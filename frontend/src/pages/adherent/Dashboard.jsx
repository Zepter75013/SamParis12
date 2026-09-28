import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

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

// Reprend les rubriques réelles de "Le Club > Vie du Club" et "Préparation"
const VIE_DU_CLUB_CARDS = [
  { kind: 'Gouvernance', titre: 'Conseil d’Administration', texte: 'Composition du Conseil d’Administration de la SAM Paris 12.' },
  { kind: 'Histoire', titre: 'Histoire du Club', texte: 'Résumé de l’histoire de la SAM, de 1887 à nos jours.' },
  { kind: 'Équipement', titre: 'Maillots du Club', texte: 'Comment se procurer les maillots et accessoires aux couleurs du club.' },
  { kind: 'Règlement', titre: 'Respectons les règles', texte: 'Règles de vie sociale et d’équité sportive au sein du club.' },
  { kind: 'Entraînement', titre: 'Notre terrain de jeu', texte: 'Stades, points de RDV et parcours d’entraînement (Bois de Vincennes et Île-de-France).' },
  { kind: 'Discipline', titre: 'La Marche (Nordique Sportive & Loisir)', texte: 'Horaires, encadrement et informations pratiques pour les deux sections marche.' },
  { kind: 'Pratique', titre: 'Ressources', texte: 'Liens et outils utiles pour les adhérents (FFA, plateformes d’inscription, etc.).' },
]

const ADMIN_CARDS = [
  { titre: 'Gérer les événements', texte: 'Créer, modifier ou clôturer les événements de l’agenda du club (compétitions, séances spéciales, vie associative).' },
  { titre: 'Inscriptions aux événements', texte: 'Suivre et gérer les inscriptions des adhérents aux événements créés.' },
]

// Noms et rôles déjà publics sur samparis12.org (page "Qui sommes-nous") —
// aucune coordonnée personnelle (adresse, tél., email, naissance) reprise.
const TROMBI = [
  { nom: 'Marie Frank', role: 'Présidente & Entraîneure 2e degré Running', groupe: 'Running', statut: 'Adhérents 2027', tag: 'Running · Adhérente 2027' },
  { nom: 'Jean-Pierre Schulz', role: 'Secrétaire Général', groupe: 'Running', statut: 'Adhérents 2027', tag: 'Running · Adhérent 2027' },
  { nom: 'David Madelaine', role: 'Trésorier', groupe: 'Running', statut: 'Adhérents 2027', tag: 'Running · Adhérent 2027' },
  { nom: 'Claude Mercier', role: 'Vice-Président & Entraîneur 1er degré Running', groupe: 'Running', statut: 'Adhérents 2027', tag: 'Running · Adhérent 2027' },
  { nom: 'Sylvain Darrasse', role: 'Entraîneur 3e degré Running Hors-Stade', groupe: 'Running', statut: 'Adhérents 2027', tag: 'Running · Adhérent 2027' },
  { nom: 'Anne Corbel-Trinh', role: 'Entraîneure 1er degré MNS', groupe: 'Marche Nordique Sportive', statut: 'Adhérents 2027', tag: 'Marche Nordique Sportive · Adhérente 2027' },
  { nom: 'Jérôme Borroz', role: 'Entraîneur MNS', groupe: 'Marche Nordique Sportive', statut: 'Adhérents 2027', tag: 'Marche Nordique Sportive · Adhérent 2027' },
  { nom: 'Gabriel Kasmi', role: 'Entraîneur 2e degré Running Hors-Stade', groupe: 'Running', statut: 'Adhérents 2027', tag: 'Running · Adhérent 2027' },
  { nom: 'Daniel Lichtenauer', role: 'Entraîneur Hors-Stade 1er niveau', groupe: 'Running', statut: 'Adhérents 2027', tag: 'Running · Adhérent 2027' },
  { nom: 'Camille Renard', role: 'Adhérente depuis 2022', groupe: 'Running', statut: 'Adhérents 2027', tag: 'Running · Adhérente 2027' },
  { nom: 'Thomas Guérin', role: 'Adhérent depuis 2024', groupe: 'Running', statut: 'Nouveaux adhérents', tag: 'Running · Nouvel adhérent' },
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

export default function Dashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [search, setSearch] = useState('')
  const [activity, setActivity] = useState('Toutes les activités')
  const [status, setStatus] = useState(null)
  const [nature, setNature] = useState('Toutes')
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)

  const filteredReseau = useMemo(() => {
    return RESEAU_POSTS.filter((p) => nature === 'Toutes' || p.nature === nature)
  }, [nature])

  const filteredTrombi = useMemo(() => {
    const q = search.toLowerCase()
    return TROMBI.filter((m) => {
      const matchesQuery = m.nom.toLowerCase().includes(q) || m.role.toLowerCase().includes(q)
      const matchesActivity = activity === 'Toutes les activités' || m.groupe === activity
      const matchesStatus = !status || m.statut === status
      return matchesQuery && matchesActivity && matchesStatus
    })
  }, [search, activity, status])

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
                  <b style={{ display: 'block' }}>Laurent D.</b>
                  <span style={{ color: 'var(--stone)', fontSize: '0.66rem' }}>
                    FFA N° 1894023 · <span style={{ color: '#059669', fontWeight: 600 }}>Licence Valide</span>
                  </span>
                </span>
                <span style={{ color: 'var(--stone)' }}>{profileMenuOpen ? '▴' : '▾'}</span>
              </button>
              {profileMenuOpen && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.4rem', background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', minWidth: 200, zIndex: 50, fontFamily: 'var(--font-mono)', fontSize: '0.72rem', textAlign: 'left' }}>
                  <button
                    onClick={() => { setActiveTab('overview'); setProfileMenuOpen(false) }}
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
            <button onClick={() => navigate('/espace-adherent')} className="btn btn--ghost" style={{ padding: '0.45rem 0.85rem', fontSize: '0.68rem' }}>
              Déconnexion
            </button>
          </div>
        </div>

        <div className="shell">
          <nav className="adherent-tabs-nav">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`adh-tab-btn${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
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

      <main className="shell" style={{ paddingBlock: '2rem', flex: 1 }}>
        {activeTab === 'overview' && (
          <div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderLeft: '4px solid var(--vermilion)', padding: '1.5rem', marginBottom: '1.8rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--line)', marginBottom: '1.2rem' }}>
                <div>
                  <span className="eyebrow">Profil Membre Actif</span>
                  <h2 style={{ fontSize: '1.8rem', textTransform: 'uppercase', marginTop: '0.2rem' }}>Laurent D.</h2>
                </div>
                <div style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '0.4rem 0.8rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 'bold' }}>
                  ✓ Licence Valide (Saison 2026-2027)
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                <div>
                  <span style={{ color: 'var(--stone)', display: 'block', textTransform: 'uppercase', fontSize: '0.68rem' }}>Numéro Licence</span>
                  <b style={{ fontSize: '0.95rem' }}>FFA N° 1894023</b>
                </div>
                <div>
                  <span style={{ color: 'var(--stone)', display: 'block', textTransform: 'uppercase', fontSize: '0.68rem' }}>Groupe d'entraînement</span>
                  <b style={{ fontSize: '0.95rem' }}>Hors-Stade · Préparation Marathon</b>
                </div>
                <div>
                  <span style={{ color: 'var(--stone)', display: 'block', textTransform: 'uppercase', fontSize: '0.68rem' }}>Coach Référent</span>
                  <b style={{ fontSize: '0.95rem' }}>Sylvain Darrasse</b>
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
                style={{ padding: '0.6rem 0.8rem', background: '#fff', border: '1px solid var(--line)', minWidth: 280, width: '100%', fontFamily: 'inherit', fontSize: 'inherit', marginBottom: '0.8rem' }}
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
                <div key={m.nom} style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--surface-2)', border: '2px solid var(--vermilion)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 'bold', fontSize: '1.3rem', color: 'var(--vermilion)', marginBottom: '0.8rem' }}>
                    {initials(m.nom)}
                  </div>
                  <h4 style={{ fontSize: '1.2rem', textTransform: 'uppercase' }}>{m.nom}</h4>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--vermilion)', fontWeight: 'bold', marginTop: '0.2rem' }}>{m.role}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--stone)', textTransform: 'uppercase', marginTop: '0.6rem', padding: '0.15rem 0.5rem', background: 'var(--surface-2)' }}>{m.tag}</span>
                </div>
              ))}
              {filteredTrombi.length === 0 && (
                <p style={{ color: 'var(--stone)' }}>Aucun membre ne correspond à cette recherche.</p>
              )}
            </div>
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
                    <button className="btn btn--ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.72rem' }}>Ouvrir →</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'admin' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <span className="eyebrow">Réservé au bureau du club</span>
              <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', marginTop: '0.2rem' }}>Admin Club</h2>
              <p style={{ fontSize: '0.95rem', color: 'var(--ink-soft)', marginTop: '0.3rem' }}>Outils de gestion réservés aux membres du bureau et de l'organisation.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
              {ADMIN_CARDS.map((c) => (
                <div key={c.titre} style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.2rem', textTransform: 'uppercase' }}>{c.titre}</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--ink-soft)', margin: '0.5rem 0 0' }}>{c.texte}</p>
                  <div style={{ marginTop: '1.2rem', paddingTop: '0.8rem', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn--solid" style={{ padding: '0.5rem 1rem', fontSize: '0.72rem' }}>Ouvrir →</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer style={{ borderTop: '1px solid var(--line)', background: 'var(--surface)', padding: '1rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--stone)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.6rem 1.2rem', marginBottom: '0.6rem' }}>
          <button className="link-button" style={{ textTransform: 'none' }}>Plan du site</button>
          <button className="link-button" style={{ textTransform: 'none' }}>Paiements Club</button>
        </div>
        SAM Paris 12 · Espace réservé aux adhérents (démonstration) · Licence FFA N° 075043<br />
        Contact : <a href="mailto:contact@samparis12.org" style={{ textDecoration: 'underline' }}>contact@samparis12.org</a>
        {' '}· Objets perdus : <a href="mailto:objetsperdus@samparis12.org" style={{ textDecoration: 'underline' }}>objetsperdus@samparis12.org</a>
      </footer>
    </div>
  )
}
