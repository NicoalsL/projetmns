# Charte graphique EduQuizAI

Version 2.1 « ludique », octobre 2026. SchoolUp.
Accessibilité visée : RGAA 4.1 / WCAG 2.1 niveau AA.

---

## 1. Concept

EduQuizAI prend l'énergie d'un jeu de quiz : un violet électrique pour agir, un jaune soleil pour l'IA, des formes très arrondies et des boutons en relief qui s'enfoncent sous le doigt. Ce ton ludique rend la création d'un quiz gratifiante pour l'enseignant et rappelle l'univers de ses élèves. Il reste encadré par des règles strictes de contraste et de lisibilité, car l'outil manipule des données personnelles et de l'IA. Le jaune est réservé à ce que produit l'IA : elle est toujours visible et identifiée, accompagnée du rappel « Une IA peut se tromper ». Chaque état important (brouillon, validé, erreur) se lit par un mot, une icône et une forme, jamais par la seule couleur, et seul ce qui se clique a du relief.

---

## 2. Logo

Le pictogramme est une bulle de dialogue violette. Elle contient un « ? » blanc (le quiz) dont le point est une étincelle jaune (l'IA qui complète la question). Dans le nom, « EduQuiz » est en graisse 800 et « AI » en 400 et en violet : l'IA est présente sans dominer. Le pictogramme reste lisible à 16 × 16 px.

### Version horizontale (851 octets)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 32" width="150" height="32" role="img" aria-labelledby="t"><title id="t">EduQuizAI</title><style>.m{fill:#1B1530}.a{fill:#5F33DB}@media(prefers-color-scheme:dark){.m{fill:#F1EEFA}.a{fill:#B8A4FF}}</style><path fill="#7048E8" d="M9 0h14a9 9 0 0 1 9 9v10a9 9 0 0 1-9 9H14l-7 4 1.3-4.1A9 9 0 0 1 0 19V9a9 9 0 0 1 9-9z"/><path d="M11.8 9.8a4.2 4.2 0 1 1 6.6 3.4c-1.4.9-2.4 1.7-2.4 3.3" fill="none" stroke="#FFF" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path fill="#FFC83D" d="M16 19.7q.9 2 2.9 2.9-2 .9-2.9 2.9-.9-2-2.9-2.9 2-.9 2.9-2.9z"/><text x="42" y="23" font-family="Nunito,ui-rounded,system-ui,-apple-system,'Segoe UI',sans-serif" font-size="20"><tspan class="m" font-weight="800">EduQuiz</tspan><tspan class="a" dx="1.5" font-weight="400">AI</tspan></text></svg>
```

### Pictogramme seul, pour le favicon (426 octets)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="#7048E8" d="M9 0h14a9 9 0 0 1 9 9v10a9 9 0 0 1-9 9H14l-7 4 1.3-4.1A9 9 0 0 1 0 19V9a9 9 0 0 1 9-9z"/><path d="M11.8 9.8a4.2 4.2 0 1 1 6.6 3.4c-1.4.9-2.4 1.7-2.4 3.3" fill="none" stroke="#FFF" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path fill="#FFC83D" d="M16 19.7q.9 2 2.9 2.9-2 .9-2.9 2.9-.9-2-2.9-2.9 2-.9 2.9-2.9z"/></svg>
```

### Contrastes et usage

- Bulle sur fond clair : 5,13:1 ; sur fond sombre : 3,40:1.
- « ? » blanc sur la bulle : 5,55:1 ; étincelle jaune sur la bulle : 3,59:1.
- « AI » : 7,03:1 en clair, 8,80:1 en sombre.
- Zone de protection : 8 px tout autour. Taille minimale : 16 px pour le pictogramme, 120 px de large pour le logo horizontal. Ne pas déformer, recolorer ni incliner.
- Le texte du logo est du texte SVG. Intégré dans le JSX (`exemples/Logo.jsx`), il utilise Nunito et suit le thème ; dans une balise `<img>`, il s'affiche en police système. Texte alternatif en image : `alt="EduQuizAI – accueil"`.
- Variantes fournies dans `images/logo/` : texte foncé pour fond clair, texte clair pour fond sombre, en SVG et en PNG à fond transparent.

---

## 3. Palette

Méthode : formule WCAG 2.1 de luminance relative, ratios tronqués au centième (jamais arrondis vers le haut). Seuils : 4,5:1 pour le texte, 3:1 pour le grand texte et les éléments d'interface. Script de vérification : `outils/verifier-contrastes.py`.

### Marque

| Nom | Hex | Usage | Ratios mesurés | Statut |
|---|---|---|---|---|
| Violet électrique | #7048E8 | Boutons principaux, bulle du logo | Texte blanc dessus 5,55 · sur fond 5,13 · sur surface sombre 3,09 | AA |
| Violet survol / relief | #5A2FD6 / #4A22B8 | Bouton survolé / tranche du bouton | Texte blanc sur survol 7,46 · relief décoratif | AA |
| Violet clair | #EEE8FF | Onglet actif, page courante, case cochée | Violet texte dessus 5,90 · texte 14,72 | AA |
| Violet texte | #5F33DB | Liens, boutons secondaires | Sur blanc 7,03 · sur fond 6,51 | AA |
| Reflet violet | #A08AF5 | Reflet de la barre de progression | Décoratif | — |
| Jaune soleil | #FFC83D | Badge IA, étincelle, focus en mode sombre | Encre dessus 11,35 · étincelle sur violet 3,59 | AA avec l'encre dessus |
| Jaune clair | #FFF4CC | Encadré « Explication » | Texte 15,93 · lien 6,39 | AA |

### Neutres (teintés de violet)

| Nom | Hex | Usage | Ratios mesurés | Statut |
|---|---|---|---|---|
| Fond | #F7F5FD | Fond de page, champs « remplis » | Texte 16,24 · texte secondaire 6,38 | AA |
| Surface | #FFFFFF | Cartes, en-tête, champ au focus | Texte 17,55 · texte secondaire 6,90 | AA |
| Surface 2 | #F0EDFA | En-têtes de tableau, rail des onglets, code | Texte 15,20 · texte secondaire 5,98 | AA |
| Bordure | #8A82A6 | Bordure des champs (2 px), touches A/B/C | Sur blanc 3,60 · sur fond 3,33 | ≥ 3:1 |
| Bordure légère | #E4DFF3 | Contour des cartes | Sur blanc 1,30 | **Échec : décoratif uniquement** |
| Bordure relief | #CFC7E6 | Relief des boutons blancs | Sur blanc 1,61 | Décoratif |
| Encre (texte) | #1B1530 | Texte, titres, focus en mode clair | Sur blanc 17,55 · sur fond 16,24 | AAA |
| Texte secondaire | #5C5675 | Aides, dates, onglets inactifs | Sur blanc 6,90 · sur surface 2 5,98 | AA |

### Sémantiques et types de question

| Nom | Hex (texte / fond / bordure) | Usage | Ratios mesurés | Statut |
|---|---|---|---|---|
| Succès | #0E7A4D / #DFF7EA / #178F55 | « Validé », bonne réponse | Sur son fond 4,76 · sur blanc 5,37 · bordure 4,12 | AA |
| Avertissement | #8F4D00 / #FFF0D6 / #B86A00 | « Brouillon à relire », « Une IA peut se tromper », cours trop court | Sur son fond 5,78 · bordure 4,11 | AA |
| Erreur / danger | #C42340 / #FFE9EC ; survol #A31A33 | Erreurs, champ invalide, suppression | Sur son fond 4,94 · sur blanc 5,73 · blanc sur rouge 5,73 · blanc sur survol 7,62 | AA |
| Information | #1A62C9 / #E6F0FF | Conseils | Sur son fond 5,02 · sur blanc 5,77 | AA |
| Désactivé | #625D78 / #E9E6F2 | Bouton plat, sans relief | 5,08 | Exempté, gardé lisible |
| Type QCM | #4A22B8 / #EEE8FF | Étiquette QCM | 7,96 | AA |
| Type Vrai / faux | #1A4F9E / #E6F0FF | Étiquette Vrai / faux | 6,87 | AA |
| Type Ouverte | #A3165F / #FFE6F3 | Étiquette Question ouverte | 6,29 | AA |

### Mode sombre

Ratios mesurés sur la surface #1C1830 (fond #120F1D, surface 2 #262140).

| Rôle | Hex | Ratios mesurés |
|---|---|---|
| Texte | #F1EEFA | 15,00 · sur fond 16,50 · sur surface 2 13,35 |
| Texte secondaire | #B7B0CF | 8,28 · sur fond 9,10 · sur surface 2 7,36 |
| Violet texte (liens) | #B8A4FF | 8,00 · sur violet clair #2D2350 6,67 |
| Violet bouton | #7048E8 ; survol #7652EE | Texte blanc 5,55 et 4,98 · bouton sur surface 3,09 |
| Focus jaune | #FFC83D | 11,10 · sur fond 12,21 |
| Bordure | #8F87AE | 5,10 · sur fond 5,61 |
| Bordure légère / relief | #352E52 / #4A4170 | 1,36 et 1,86 : décoratifs |
| Succès | #5FE0A0 sur #123324 ; bordure #3CB97C | 8,30 · bordure 6,88 |
| Avertissement | #FFC266 sur #3A2A0E ; bordure #D99A3A | 8,67 · bordure 7,06 |
| Erreur | #FF8A9A sur #3D1820 | 6,92 · bouton danger #C42340 avec texte blanc 5,73 |
| Information | #8CB8FF sur #16264A | 7,38 |
| Explication | texte #F1EEFA sur #3A3115 | 11,25 |

### Limites assumées

- **Bordure légère** (1,30:1 en clair, 1,36:1 en sombre) : réservée aux cartes, qui ne sont pas des composants interactifs. Jamais utilisée pour délimiter un champ ou un bouton.
- **Jaune soleil sur fond clair** (1,54:1) : interdit en texte et en contour ; il sert uniquement de fond, avec l'encre posée dessus (11,35:1).
- **Bouton secondaire** : sa bordure claire ne passe pas 3:1, mais le bouton est identifié par son texte violet (7,03:1). WCAG 1.4.11 n'exige pas de contour contrasté pour un bouton qui a un texte.
- **Badges « Brouillon » et « Validé »** : leurs fonds ont une clarté proche ; le libellé, l'icône (crayon ou coche) et la bordure (pointillée ou pleine) sont donc obligatoires.

---

## 4. Typographie

**Nunito**, une seule famille web, en deux graisses (400 et 800), sous licence libre OFL. Ses formes rondes portent le ton ludique, ses chiffres sont très lisibles et elle couvre tous les accents français. Elle est hébergée avec l'application, sans appel à un service tiers (pas de transfert de données, RGPD). Les deux fichiers woff2 du sous-ensemble latin pèsent 16,3 et 16,5 Ko. Grâce à `font-display: swap`, le texte s'affiche tout de suite avec la police de repli (`ui-rounded, system-ui…`), puis bascule sur Nunito.

| Élément | Taille | Équivalent (mobile) | Graisse | Interligne |
|---|---|---|---|---|
| H1 | 2,25rem (1,75rem sous 640 px) | 36 px (28 px) | 800 | 1,2 |
| H2 | 1,5rem (1,375rem) | 24 px (22 px) | 800 | 1,2 |
| H3 | 1,25rem | 20 px | 800 | 1,2 |
| Texte | 1,0625rem | 17 px | 400 | 1,6 (1,7 pour les cours) |
| Petit (taille minimale) | 0,9375rem | 15 px | 400 | 1,6 |
| Boutons, menu, onglets, en-têtes de tableau | 0,9375rem, majuscules, +6 % d'espacement | 15 px | 800 | 1,2 |

La longueur de ligne des cours est limitée à 68 caractères. Toutes les tailles sont en rem pour suivre le réglage de taille du navigateur. Les majuscules sont appliquées en CSS uniquement : les lecteurs d'écran lisent le texte normal.

---

## 5. Espacements, rayons, relief

- **Espacements :** 4 / 8 / 12 / 16 / 24 / 32 / 48 px (`--espace-1` à `--espace-7`, en rem). Cible tactile de 48 px (40 px dans les tableaux et l'en-tête).
- **Rayons :** 8 px (badges de type, touches A/B/C, code) · 12 px (champs, choix, messages) · 16 px (boutons, cartes) · pilule (badges de statut).
- **Bordures :** 2 px partout ; 3 px pour un champ en erreur.
- **Relief = cliquable :** une ombre pleine de 4 px, sans flou, se place uniquement sous ce qui se clique (boutons, cases à cocher en tuiles, onglet actif). Les cartes, les réponses affichées et les messages restent plats. Au clic, le bouton descend de 4 px et son relief disparaît ; un bouton désactivé est plat.

---

## 6. Règles d'usage

### À faire

1. Afficher chaque statut avec sa couleur, son icône, son libellé complet et sa forme : « Brouillon à relire » (crayon, bordure pointillée), « Validé » (coche, trait plein).
2. Signaler tout contenu généré par l'IA avec la pastille jaune à étincelle, et afficher « Une IA peut se tromper » tant que le quiz n'est pas validé.
3. Garder un seul bouton violet plein par zone ; les autres actions utilisent le bouton blanc. Du relief seulement sur ce qui se clique.

### À ne pas faire

1. Écrire en jaune sur fond clair, ou délimiter un champ avec la bordure légère : ces couleurs ne passent pas les seuils.
2. Utiliser le vert ou l'orange comme décoration : le vert veut dire « validé par l'enseignant », l'orange « à vérifier ». Un quiz non validé n'est jamais vert.
3. Supprimer le contour de focus, retirer le soulignement des liens dans le texte, ou afficher un type de question par sa seule couleur, sans son libellé.

---

## 7. Feuille de style

Le fichier complet est `index.css` (environ 1 940 lignes, 12,6 Ko compressé). Il contient :

- les jetons dans `:root` (thème clair) et deux blocs pour le thème sombre (réglage du système, ou `data-theme="sombre"` forcé) ;
- la police Nunito (`@font-face`, 2 graisses) ;
- les styles de base (corps, titres, liens soulignés, focus visible, formulaires, boutons, tableaux) ;
- les styles de toutes les classes du projet : `.connexion .carte .onglets .entete .contenu .formulaire-cours .detail-cours .texte-cours .table-conteneur .confirmation .actions .section-quiz .formulaire-generation .choix-generation .ligne-parametres .types-questions .case .liste-quiz .historique-generations .statut .statut-brouillon .statut-valide .avertissement .erreur .succes .aide .question .question-edition .type-question .choix .bonne-reponse .explication .ligne-choix .consentement .section-compte .entete-contenu .apercu-markdown .pied-de-page .sr-only` ;
- les classes ajoutées : `.bouton`, `.bouton-secondaire`, `.bouton-danger`, `.badge-ia`, `.info`, `.generation-en-cours`, `.lien-evitement`, `.type-qcm`, `.type-vrai-faux`, `.type-ouverte` ;
- la prise en compte de « réduire les animations », du contraste élevé de Windows et de l'impression.

Les commentaires du fichier expliquent les choix de contraste, d'accessibilité et d'éco-conception. Le guide d'installation est dans `README.md`.

---

## 8. Texte pour le dossier de projet

**Charte graphique**

La charte graphique d'EduQuizAI vise des enseignants de l'école primaire au supérieur, souvent peu familiers des outils numériques, qui utilisent l'application sur ordinateur, tablette ou téléphone. Elle poursuit trois objectifs : donner envie d'utiliser l'outil grâce à une identité dynamique et ludique, rester lisible et accessible à tous conformément au RGAA 4.1 (niveau AA des WCAG 2.1), et limiter l'impact environnemental de l'interface.

*Identité.* L'univers visuel s'inspire des applications d'apprentissage sous forme de jeu : couleurs vives, formes très arrondies et boutons en relief qui s'enfoncent au clic, pour un retour immédiat sous le doigt. Une règle simple guide l'ensemble : seul ce qui se clique a du relief ; les cartes et les contenus à lire restent plats. Le logo est une bulle de dialogue violette contenant un point d'interrogation blanc, symbole du quiz, dont le point est une étincelle jaune qui représente l'IA. Dans le nom, « EduQuiz » est en gras et « AI » en graisse normale : l'IA est présente, mais au service de l'enseignant. Le logo est un fichier SVG de 851 octets ; le pictogramme seul (426 octets) sert de favicon et reste lisible à 16 × 16 pixels.

*Couleurs.* Le violet électrique (#7048E8) est réservé aux actions principales ; le jaune soleil (#FFC83D) est réservé à ce que produit l'IA, ce qui la rend toujours identifiable. Les neutres sont légèrement teintés de violet pour garder une ambiance chaleureuse. Quatre couleurs sémantiques (succès, avertissement, erreur, information) ont chacune un fond clair associé, et les trois types de question (QCM, vrai/faux, question ouverte) ont chacun une couleur en plus de leur libellé. Chaque association a été vérifiée par le calcul du ratio de contraste WCAG, à l'aide d'un script fourni avec la charte :

- texte courant : 17,55:1 ;
- liens : 7,03:1 ;
- texte blanc des boutons : 5,55:1 ;
- bordures de champs : 3,60:1 ;
- contour de focus : 17,55:1.

Les couleurs qui n'atteignent pas ces seuils sont limitées à un usage où le seuil ne s'applique pas : la bordure légère des cartes et le relief des boutons blancs (décoratifs), et le jaune, jamais employé en texte sur fond clair mais toujours avec l'encre posée dessus (11,35:1). Le violet a été légèrement éclairci pour que les boutons restent visibles en mode sombre (3,09:1 sur la surface sombre).

*Information jamais portée par la seule couleur.* Les statuts des quiz combinent un libellé, une icône et une forme : « Brouillon à relire » avec un crayon et une bordure pointillée, « Validé » avec une coche et une bordure pleine. Les réponses d'un quiz sont repérées par une lettre (A, B, C) ; la bonne réponse est signalée par une coche, une graisse forte, une bordure verte et un texte destiné aux lecteurs d'écran. Les liens dans le texte sont toujours soulignés, un champ en erreur a une bordure plus épaisse et un message explicite, et un bouton désactivé perd son relief. L'encadré « Une IA peut se tromper » accompagne tout quiz non validé : il rappelle que la relecture humaine est obligatoire.

*Typographie.* L'application utilise une seule police web, Nunito, sous licence libre, en deux graisses (400 et 800). Ses formes arrondies portent le ton ludique, et ses chiffres et accents restent très lisibles. Elle est hébergée avec l'application, sans appel à un service tiers, et ne pèse que 33 Ko pour les deux graisses ; le texte s'affiche immédiatement avec une police système en attendant son chargement. Le texte courant mesure 17 px (jamais moins de 15 px), avec un interlignage de 1,6 et des lignes limitées à 68 caractères pour la lecture des cours. Toutes les tailles sont exprimées en rem afin de respecter les réglages de l'utilisateur.

*Adaptation aux supports.* Une échelle d'espacement unique (4 à 48 px), quatre rayons et un relief de 4 px garantissent la cohérence. La feuille de style est écrite « mobile d'abord » : dès 320 px de large, les colonnes s'empilent, les boutons d'action prennent toute la largeur, les tableaux défilent dans leur cadre sans entraîner la page, et les cibles tactiles mesurent 48 px. Le focus clavier est un contour de 3 px toujours visible (encre en mode clair, jaune en mode sombre). Les préférences « réduire les animations » et « contraste élevé » de Windows sont prises en compte.

*Mode sombre et éco-conception.* Un mode sombre suit automatiquement le réglage du système, et ses couleurs ont été vérifiées avec les mêmes seuils. La charte tient dans un seul fichier index.css, à base de variables CSS, sans framework ni bibliothèque. Les icônes et le logo sont en SVG, les reliefs sont des ombres pleines sans flou, et le fond à pois de la page de connexion est un simple dégradé CSS : aucune image décorative n'est chargée. Le poids total de la charte (feuille de style compressée, police, logo et favicon) est d'environ 47 Ko.

---

## 9. Adaptation « lisibilité » appliquée au projet (version 2.2)

Après application de la charte 2.1, l'interface a été ajustée pour privilégier la
lecture. Les changements sont regroupés dans la section 15 de `front/src/index.css`
(les sections 1 à 13 restent celles de la charte d'origine).

| Changement | Avant | Après | Raison |
|---|---|---|---|
| Fond de page | #F7F5FD (lavande) | #FFFFFF | Fond blanc demandé, contraste maximal |
| Thème | Clair ou sombre selon le système | Clair imposé (`data-theme="clair"` sur `<html>`) | Fond blanc garanti sur tous les postes |
| Texte secondaire | #5C5675 (6,90:1) | #4A4560 (9,08:1 sur blanc) | Aides et dates plus lisibles |
| Surface 2 | #F0EDFA | #F4F2FA (texte 15,81:1, lien 6,34:1) | Fond teinté plus discret sur le blanc |
| Bordure légère | #E4DFF3 | #D6CFEA (décorative, 1,50:1) | Cartes mieux délimitées sur le blanc |
| Boutons, menu, en-têtes de tableau | Majuscules espacées | Casse normale, 16 px | Un mot en majuscules perd sa silhouette et se lit plus lentement |
| Fonds à pois | Connexion, accueil | Retirés | Un motif derrière le texte gêne la lecture |
| Largeur des pages | 72rem | 60rem pour toutes les pages, même espacement vertical | Pages homogènes ; moins de chemin pour l'œil d'une ligne à l'autre |

Adaptations d'ergonomie associées :

- en-tête unique sur toutes les pages (le logo mène à l'accueil), fixe au défilement au-delà
  de 640 px, avec `scroll-padding-top` pour qu'un élément focalisé ne passe pas dessous ;
- bouton « Afficher / Masquer » sur le mot de passe (`aria-pressed`) ;
- focus placé sur le titre d'une confirmation de suppression à son ouverture ;
- liens de retour précédés d'une flèche, état vide du tableau de bord avec un bouton « Créer mon premier cours » ;
- accessibilité détaillée (critères respectés et non respectés) : `docs/accessibilite.md`.
