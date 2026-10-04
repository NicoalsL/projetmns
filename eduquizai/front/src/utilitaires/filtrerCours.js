// Recherche et tri de la liste « Mes cours », côté navigateur : la liste ne
// contient que titres et dates (pas les textes), elle est donc légère.
// Fonctions pures, sans React : testées directement (tests/filtrerCours.test.js).

// Ordres de tri proposés dans la liste déroulante.
export const TRIS = {
  recent: 'Plus récents d’abord',
  ancien: 'Plus anciens d’abord',
  titre: 'Titre (A → Z)',
}

// Minuscules et sans accents : « Révolution » est trouvé en tapant « revolution ».
function normaliser(texte) {
  return texte.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

function comparerDates(a, b) {
  return new Date(a.date_creation) - new Date(b.date_creation)
}

// Renvoie une NOUVELLE liste (la liste reçue n'est jamais modifiée).
export function filtrerEtTrierCours(cours, recherche, tri) {
  const motCherche = normaliser(recherche.trim())
  const trouves = cours.filter((unCours) => normaliser(unCours.titre).includes(motCherche))

  if (tri === 'ancien') {
    return trouves.sort(comparerDates)
  }
  if (tri === 'titre') {
    // sensitivity 'base' : ni la casse ni les accents ne changent l'ordre.
    return trouves.sort((a, b) => a.titre.localeCompare(b.titre, 'fr', { sensitivity: 'base' }))
  }
  return trouves.sort((a, b) => comparerDates(b, a))
}
