export default function Club() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl sm:text-4xl font-bold">Le club</h1>
      <p className="mt-4 text-gray-600">
        Contenu à personnaliser : histoire du club, valeurs, chiffres clés (nombre de licenciés,
        palmarès), présentation du bureau et des entraîneurs.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {[
          { label: 'Licenciés', value: '—' },
          { label: 'Sections', value: '—' },
          { label: "Années d'existence", value: '—' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-200 p-6 text-center">
            <p className="font-display text-4xl text-club-red">{stat.value}</p>
            <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <section className="mt-14">
        <h2 className="text-2xl font-bold">Le bureau</h2>
        <p className="mt-2 text-gray-600">
          Liste des membres du bureau à ajouter (président·e, trésorier·e, secrétaire…).
        </p>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-bold">Rejoindre le club</h2>
        <p className="mt-2 text-gray-600">
          Modalités d'inscription, documents à fournir (certificat médical, licence FFA) et
          tarifs à détailler ici.
        </p>
      </section>
    </div>
  )
}
