# Accessibilité d'EduQuizAI (RGAA 4.1 / WCAG 2.2)

Ce document recense les critères d'accessibilité que l'application respecte, **comment**
ils ont été obtenus dans le code, et ceux qui ne sont **pas** (ou pas entièrement)
respectés. Il sert de base au dossier de projet et à l'entretien technique.

Référentiels : **RGAA 4.1** (référentiel français, 106 critères) et **WCAG 2.2 niveau AA**
(référentiel international sur lequel le RGAA s'appuie). Chaque ligne cite les deux.

---

## 1. Méthode de vérification (3 octobre 2026)

| Vérification | Outil | Périmètre | Résultat |
|---|---|---|---|
| Test automatique | axe-core 4.10 (règles WCAG 2.0 à 2.2 A/AA + bonnes pratiques) | 9 écrans × 2 largeurs (1280 px et 320 px) | **0 défaut** |
| Adaptation à 320 px | Navigateur Edge piloté par Playwright | 9 écrans | Aucun défilement horizontal de la page |
| Navigation clavier | Touche Tab, ordre et contour de focus relevés | Tableau de bord, connexion, confirmations | Ordre logique, contour de 3 px partout |
| Contrastes | Formule WCAG 2.1 (script `docs/outils/verifier-contrastes.py`) | Toutes les couleurs de texte et d'interface | Tous ≥ 4,5:1 (texte) et ≥ 3:1 (interface) |
| Messages d'erreur | Parcours « mauvais mot de passe », création de cours vide | Connexion, création de cours | Message annoncé et focalisé |

Les 9 écrans : accueil, connexion, inscription, mentions légales, mes cours, nouveau cours,
détail d'un cours, quiz (lecture), quiz (édition).

Un test automatique ne détecte qu'une partie des problèmes (environ un tiers selon les
études). Les vérifications manuelles ci-dessus le complètent, mais ne remplacent pas un
audit RGAA complet (voir §4).

---

## 2. Critères respectés et comment

### Titre de page — RGAA 8.5 et 8.6 / WCAG 2.4.2

**Problème corrigé** : toutes les pages s'appelaient « EduQuizAI — Espace enseignant ». Un
utilisateur de lecteur d'écran, ou qui a plusieurs onglets ouverts, ne savait pas sur
quelle page il se trouvait.

**Solution** : le hook `useTitrePage(titre)` (`front/src/utilitaires/titrePage.js`) donne à
chaque page un titre unique sous la forme « Page – EduQuizAI » : « Mes cours – EduQuizAI »,
« La photosynthèse – EduQuizAI », « Modifier : Quiz – La photosynthèse – EduQuizAI ». Le
titre suit les données : il passe de « Chargement du cours » au titre réel du cours, ou à
« Cours introuvable » en cas d'erreur.

### Langue de la page — RGAA 8.3 et 8.4 / WCAG 3.1.1

`<html lang="fr">` dans `front/index.html` : le lecteur d'écran lit le texte avec une
prononciation française.

### Structure et hiérarchie des titres — RGAA 9.1 et 9.2 / WCAG 1.3.1

- **Un seul `<h1>` par page**, y compris sur les pages d'erreur (« Cours indisponible »,
  « Quiz indisponible »).
- **Problème corrigé** : un « # Titre » écrit dans le Markdown d'un cours devenait un
  second `<h1>`. Le composant `TexteCours.jsx` décale désormais les titres du Markdown d'un
  niveau (`#` → `<h2>`, `##` → `<h3>`…), sans changer leur taille à l'écran.
- **Problème corrigé** : sur la page d'un quiz, on passait du `<h1>` aux questions en
  `<h3>`. Un titre « Questions (n) » de niveau 2 a été ajouté entre les deux, et
  « Modification du quiz » en mode édition.
- **Zones de la page** : `<header>` (en-tête), `<nav aria-label="Navigation principale">`,
  `<main>` (contenu) et `<footer>` (pied de page) sur toutes les pages.

### Accès rapide au contenu — RGAA 12.7 / WCAG 2.4.1

**Problème corrigé** : il fallait traverser tout l'en-tête au clavier sur chaque page.

**Solution** : un lien « Aller au contenu » (`App.jsx`) est le premier élément atteint par
la touche Tab. Invisible tant qu'il n'a pas le focus, il apparaît en jaune en haut à
gauche et mène à la zone `#contenu`.

### Focus clavier visible, ordonné et jamais perdu — RGAA 10.7, 12.8 / WCAG 2.4.3, 2.4.7, 2.4.11

- **Contour visible** : 3 px, couleur encre (17,55:1), sur tout élément focalisable
  (`:focus-visible` dans `index.css`). Il reste visible en mode « contraste élevé » de
  Windows (`outline`, pas `box-shadow`).
- **Ordre logique** : lien d'évitement, logo, navigation, puis contenu dans l'ordre de
  lecture (aucun `tabindex` positif).
- **Problème corrigé — changement de page** : React ne recharge pas le navigateur ; le focus
  restait sur `<body>` et la page restait défilée. Le composant `GestionNavigation`
  (`App.jsx`) remonte en haut et place le focus sur le `<h1>` de la nouvelle page.
- **Problème corrigé — après une erreur** : le formulaire est désactivé pendant l'envoi
  (contre le double clic), ce qui faisait perdre le focus. Les messages d'erreur et de
  succès reçoivent maintenant le focus (`placerFocus`, `front/src/utilitaires/focus.js`) :
  l'utilisateur clavier sait ce qui s'est passé et repart de là.
- **Confirmations de suppression** : le focus est placé sur la question (« Supprimer ce
  cours ? ») à l'ouverture ; Tab mène directement aux boutons Confirmer / Annuler.
- **En-tête fixe** (au-delà de 640 px) : `scroll-padding-top` empêche qu'un élément
  focalisé passe sous l'en-tête (WCAG 2.4.11).

### Contrastes — RGAA 3.2 et 3.3 / WCAG 1.4.3 et 1.4.11

Tous les ratios sont calculés avec la formule WCAG (détail dans `docs/charte-graphique.md`,
§3 et §9) :

| Élément | Ratio | Seuil |
|---|---|---|
| Texte courant sur blanc | 17,55:1 | 4,5:1 |
| Texte secondaire (aides, dates) sur blanc | 9,08:1 | 4,5:1 |
| Liens | 7,03:1 | 4,5:1 |
| Texte blanc des boutons violets | 5,55:1 | 4,5:1 |
| Bordure des champs de saisie | 3,60:1 | 3:1 |
| Contour de focus | 17,55:1 | 3:1 |

Seules la bordure des cartes (1,50:1) et l'ombre des boutons blancs sont sous le seuil :
elles sont **décoratives** (une carte n'est pas un composant interactif) et le seuil ne
s'y applique pas.

### Information jamais portée par la seule couleur — RGAA 3.1 / WCAG 1.4.1

- Statut d'un quiz : libellé + icône + forme (« Brouillon à relire » avec un crayon et une
  bordure pointillée ; « Validé » avec une coche et une bordure pleine).
- Bonne réponse d'un QCM : fond vert, coche, graisse forte **et** texte « (bonne réponse) »
  lu par les lecteurs d'écran.
- Type de question : étiquette colorée **avec** son libellé (« QCM », « Vrai ou faux »…).
- Liens soulignés en permanence dans le texte (RGAA 10.6).

### Images et icônes — RGAA 1.1 et 1.2 / WCAG 1.1.1

- Logo en SVG marqué `aria-hidden="true"` ; le lien qui l'entoure porte le nom
  « EduQuizAI, accueil ».
- Icônes d'interface (coche, crayon, alerte, poubelle) dessinées en CSS (`mask`) :
  décoratives, le sens est toujours porté par un texte.
- Les lettres A, B, C des réponses sont décoratives (`content: … / ""`) : elles ne sont
  pas lues, l'ordre est donné par la liste `<ol>`.

### Formulaires — RGAA 11.1, 11.2, 11.5, 11.10, 11.13 / WCAG 1.3.1, 3.3.1, 3.3.2, 1.3.5

- Chaque champ a un `<label for>` visible (aucun champ ne repose sur un `placeholder`).
- Champs regroupés dans des `<fieldset>` avec `<legend>` (types de questions, choix d'un
  QCM, édition de chaque question).
- Aides liées au champ par `aria-describedby` (règle du mot de passe, limite de
  caractères du cours).
- `autocomplete` renseigné (`name`, `email`, `current-password`, `new-password`) : le
  navigateur peut préremplir les champs.
- Bouton « Afficher / Masquer » le mot de passe, avec `aria-pressed` et `aria-controls`.
- Messages d'erreur explicites (« Le titre doit contenir entre 1 et 200 caractères »,
  « Question 3 : les choix doivent être tous différents ») et annoncés (`role="alert"`).

### Messages de statut — RGAA 7.5 / WCAG 4.1.3

`role="status"` pour les informations (chargement, « Génération en cours… », succès) et
`role="alert"` pour les erreurs : le lecteur d'écran les annonce sans déplacer
l'utilisateur. La zone « Génération en cours » existe avant la génération pour que son
changement soit bien lu.

### Composants interactifs — RGAA 7.1 et 7.3 / WCAG 4.1.2, 2.1.1

- Uniquement des éléments natifs (`<button>`, `<a>`, `<input>`, `<select>`, `<details>`) :
  accessibles au clavier sans code supplémentaire.
- États exposés : `aria-pressed` (onglets Connexion / Inscription, bouton Aperçu,
  Afficher le mot de passe), `aria-busy` (envoi en cours), `aria-current="page"` (page
  courante dans la navigation, posé automatiquement par `NavLink`).
- Boutons-icônes nommés : la corbeille d'un choix s'annonce « Supprimer le choix 2 ».

### Tableaux — RGAA 5.4, 5.6, 5.7 / WCAG 1.3.1

`<caption>` (titre du tableau, masqué visuellement quand le titre de la page suffit),
en-têtes `<th scope="col">`.

### Liens — RGAA 6.1 et 13.2 / WCAG 2.4.4, 3.2.5

- Intitulés explicites hors contexte (« Lire la politique de confidentialité », « Retour
  aux cours »).
- Le seul lien qui ouvre un nouvel onglet (politique de confidentialité, depuis le
  formulaire d'inscription, pour ne pas perdre la saisie) l'annonce : « (s'ouvre dans un
  nouvel onglet) ».

### Adaptation à l'écran et au zoom — RGAA 10.11 / WCAG 1.4.10, 1.4.4

- Mise en page « mobile d'abord » : aucun défilement horizontal de la page à 320 px
  (vérifié sur les 9 écrans).
- Toutes les tailles en `rem` : elles suivent la taille de texte choisie dans le
  navigateur.
- **Problème corrigé** : le tableau « Mes cours » défilait horizontalement sur mobile et
  cachait la date ; il tient maintenant dans la largeur de l'écran.
- **Problème corrigé** : l'en-tête fixe occupait près d'un cinquième d'un écran de
  mobile ; il n'est fixe qu'au-delà de 640 px.

### Animations — RGAA 13.8 / WCAG 2.3.3

`@media (prefers-reduced-motion: reduce)` coupe les animations (étincelle, barre de
génération, effet d'enfoncement des boutons). Le texte « Génération en cours… » reste
affiché : l'animation n'est jamais la seule information.

### Contraste élevé de Windows — WCAG 1.4.11

`@media (forced-colors: active)` restitue les bordures et les icônes, qui disparaîtraient
sinon dans ce mode.

### Cibles tactiles — WCAG 2.5.8

Boutons et champs de 48 px de haut (40 px dans l'en-tête), au-delà du minimum de 24 px.
Seuls les liens placés dans une phrase sont plus petits, ce que WCAG autorise.

---

### Corrections du 3 octobre 2026 (soir)

- **Erreur rattachée au champ — RGAA 11.10 / WCAG 3.3.1** : à la connexion, à l'inscription et
  dans le formulaire de cours, le champ fautif reçoit `aria-invalid="true"` (bordure rouge
  de 3 px de la charte) et `aria-describedby` vers le message d'erreur : le lecteur d'écran
  lit l'erreur en arrivant sur le champ. Test : `tests/composants/FormulaireCours.test.jsx`.
- **Focus après chargement — RGAA 12.8 / WCAG 2.4.3** : sur les pages qui chargent leurs
  données (cours, quiz, modification, test du quiz), le focus est déplacé sur le `<h1>` une
  fois les données reçues (`useFocusTitreApresChargement`, `utilitaires/focus.js`), sauf si
  l'utilisateur a déjà déplacé le focus.
- **Liens externes d'un cours — RGAA 6.1** : un lien vers un autre site écrit dans le Markdown
  d'un cours est annoncé « (site externe) » et ne transmet pas l'adresse du cours
  (`TexteCours.jsx`, testé).
- **Identifiant en double** : le champ « Contenu du cours » et la zone de contenu portaient
  le même identifiant ; l'étiquette du champ n'y était plus reliée. Trouvé par le parcours
  navigateur, corrigé (`contenu-cours`), et ce contrôle fait désormais partie du parcours.
- **Mode « Tester le quiz »** : focus déplacé sur chaque nouvelle question et sur la
  correction, choix en `fieldset` nommé par l'énoncé, progression annoncée en texte
  (« Question 2 sur 5 »), boutons d'auto-évaluation avec `aria-pressed`.

- **Éditeur de quiz — RGAA 11.10** (4 octobre) : l'API renvoie le numéro de la question et le
  champ en cause (`{ erreur, question, champ }`) ; l'éditeur marque ce seul champ
  (`aria-invalid`, bordure rouge) et le relie au message (`aria-describedby`). Vérifié dans
  le navigateur : « Question 2 : les choix doivent être tous différents » ne marque que les
  choix de la question 2. Le critère 11.10 est désormais respecté sur tous les formulaires.

## 3. Critères non respectés ou partiellement respectés

| Critère | État | Explication | Piste de correction |
|---|---|---|---|
| RGAA 8.2 / WCAG 4.1.1 — code HTML valide | **Non vérifié** | Le HTML généré n'a pas été passé au validateur du W3C. | Valider les pages rendues avec validator.w3.org. |
| RGAA 10.4 / WCAG 1.4.4 — zoom à 200 % | **Non vérifié** | La mise en page en `rem` et le test à 320 px le laissent supposer, sans test réel. | Tester chaque page à 200 % de zoom. |
| RGAA 10.12 / WCAG 1.4.12 — espacement du texte | **Non vérifié** | Interligne de 1,6, mais pas de test avec les espacements imposés par le critère. | Appliquer le « bookmarklet » d'espacement et vérifier qu'aucun texte n'est coupé. |
| Thème sombre (préférence de l'utilisateur) | **Désactivé** | Les styles existent, mais le fond blanc a été imposé pour la lisibilité. Ce n'est pas une exigence du RGAA. | Ajouter un bouton de bascule clair / sombre. |

---

## 4. Ce qui n'a pas été fait (limites assumées)

- **Pas d'audit RGAA complet** : les 106 critères n'ont pas été évalués un par un sur un
  échantillon de pages. On ne peut donc pas annoncer de taux de conformité, ni une
  conformité « totale » ou « partielle » au sens officiel.
- **Pas de test avec un vrai lecteur d'écran** (NVDA sous Windows, VoiceOver sous macOS) :
  les rôles et attributs ARIA sont en place, mais leur restitution réelle n'a pas été
  écoutée.
- **Pas de page « Déclaration d'accessibilité »** : elle est obligatoire pour les services
  publics et les grandes entreprises. EduQuizAI étant un projet de formation pour une
  entreprise fictive, elle n'a pas été rédigée ; ce document en contient la matière.

---

## 5. Rejouer les vérifications

- Tests automatiques : injecter axe-core dans chaque page (extension navigateur « axe
  DevTools » ou script Playwright) et lancer `axe.run()`.
- Contrastes : `python3 docs/outils/verifier-contrastes.py` (couleurs de la charte 2.1 ; les
  ratios des couleurs ajustées pour la lisibilité sont dans `charte-graphique.md`, §9).
- Clavier : parcourir chaque page à la touche Tab uniquement, de « Aller au contenu »
  jusqu'au pied de page, puis provoquer une erreur (mauvais mot de passe).
