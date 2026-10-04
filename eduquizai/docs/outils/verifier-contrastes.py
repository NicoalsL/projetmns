"""Vérifie les ratios de contraste de la charte EduQuizAI (WCAG 2.1).

Utilisation : python3 verifier-contrastes.py
Les ratios sont tronqués à 2 décimales (jamais arrondis vers le haut).
Les associations marquées « décoratif » ne sont pas soumises au seuil
(élément non interactif ou couleur interdite pour cet usage) : elles sont
listées pour être transparentes sur leurs limites.
"""
import math


def luminance(hexa):
    hexa = hexa.lstrip('#')
    r, g, b = (int(hexa[i:i + 2], 16) / 255 for i in (0, 2, 4))
    lin = lambda v: v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)


def ratio(a, b):
    la, lb = sorted((luminance(a), luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def tronque(x):
    return math.floor(x * 100) / 100


CLAIR = {
    'principale': '#7048E8', 'principale-survol': '#5A2FD6', 'principale-claire': '#EEE8FF',
    'principale-texte': '#5F33DB', 'blanc': '#FFFFFF', 'jaune': '#FFC83D', 'jaune-clair': '#FFF4CC',
    'encre': '#1B1530', 'fond': '#F7F5FD', 'surface': '#FFFFFF', 'surface-2': '#F0EDFA',
    'bordure': '#8A82A6', 'bordure-legere': '#E4DFF3', 'bordure-relief': '#CFC7E6',
    'texte': '#1B1530', 'texte-secondaire': '#5C5675',
    'succes': '#0E7A4D', 'succes-fond': '#DFF7EA', 'succes-bordure': '#178F55',
    'avertissement': '#8F4D00', 'avertissement-fond': '#FFF0D6', 'avertissement-bordure': '#B86A00',
    'erreur': '#C42340', 'erreur-fond': '#FFE9EC', 'danger': '#C42340', 'danger-survol': '#A31A33',
    'info': '#1A62C9', 'info-fond': '#E6F0FF', 'desactive-fond': '#E9E6F2', 'desactive-texte': '#625D78',
    'focus': '#1B1530', 'qcm': '#4A22B8', 'qcm-fond': '#EEE8FF', 'vrai-faux': '#1A4F9E',
    'vrai-faux-fond': '#E6F0FF', 'ouverte': '#A3165F', 'ouverte-fond': '#FFE6F3',
}

SOMBRE = {
    'principale': '#7048E8', 'principale-survol': '#7652EE', 'principale-claire': '#2D2350',
    'principale-texte': '#B8A4FF', 'blanc': '#FFFFFF', 'jaune': '#FFC83D', 'jaune-clair': '#3A3115',
    'encre': '#1B1530', 'fond': '#120F1D', 'surface': '#1C1830', 'surface-2': '#262140',
    'bordure': '#8F87AE', 'bordure-legere': '#352E52', 'bordure-relief': '#4A4170',
    'texte': '#F1EEFA', 'texte-secondaire': '#B7B0CF',
    'succes': '#5FE0A0', 'succes-fond': '#123324', 'succes-bordure': '#3CB97C',
    'avertissement': '#FFC266', 'avertissement-fond': '#3A2A0E', 'avertissement-bordure': '#D99A3A',
    'erreur': '#FF8A9A', 'erreur-fond': '#3D1820', 'danger': '#C42340', 'danger-survol': '#A31A33',
    'info': '#8CB8FF', 'info-fond': '#16264A', 'desactive-fond': '#2E2945', 'desactive-texte': '#B0A9C8',
    'focus': '#FFC83D', 'qcm': '#CDBEFF', 'qcm-fond': '#2D2350', 'vrai-faux': '#A9CBFF',
    'vrai-faux-fond': '#16264A', 'ouverte': '#FFA8D6', 'ouverte-fond': '#3D1830',
}

T, UI, DECO = 4.5, 3.0, None  # seuils : texte, élément d'interface, décoratif

PAIRES = [
    # (premier plan, arrière-plan, seuil, usage)
    ('texte', 'surface', T, 'Texte courant sur carte'),
    ('texte', 'fond', T, 'Texte courant sur fond / dans un champ rempli'),
    ('texte', 'surface-2', T, 'Texte sur surface 2'),
    ('texte', 'principale-claire', T, 'Texte sur violet clair'),
    ('texte', 'jaune-clair', T, 'Texte de l\'encadré Explication'),
    ('texte', 'succes-fond', T, 'Texte d\'un message de succès'),
    ('texte', 'avertissement-fond', T, 'Texte d\'un avertissement'),
    ('texte', 'erreur-fond', T, 'Texte d\'un message d\'erreur'),
    ('texte', 'info-fond', T, 'Texte d\'une information'),
    ('encre', 'jaune', T, 'Badge IA, lien d\'évitement'),
    ('texte-secondaire', 'surface', T, 'Aides, dates, touches A/B/C'),
    ('texte-secondaire', 'fond', T, 'Texte secondaire, texte indicatif des champs'),
    ('texte-secondaire', 'surface-2', T, 'En-têtes de tableau, onglets inactifs'),
    ('principale-texte', 'surface', T, 'Liens, boutons secondaires'),
    ('principale-texte', 'fond', T, 'Liens sur le fond'),
    ('principale-texte', 'principale-claire', T, 'Onglet actif, page courante, tuile cochée'),
    ('blanc', 'principale', T, 'Texte des boutons principaux'),
    ('blanc', 'principale-survol', T, 'Bouton principal survolé'),
    ('blanc', 'danger', T, 'Bouton danger'),
    ('blanc', 'danger-survol', T, 'Bouton danger survolé'),
    ('succes', 'succes-fond', T, 'Badge Validé'),
    ('succes', 'surface', T, 'Touche de la bonne réponse'),
    ('avertissement', 'avertissement-fond', T, 'Badge Brouillon à relire'),
    ('erreur', 'erreur-fond', T, 'Titre d\'un message d\'erreur'),
    ('erreur', 'surface', T, 'Icône poubelle, erreur sur carte'),
    ('info', 'info-fond', T, 'Titre d\'une information'),
    ('desactive-texte', 'desactive-fond', T, 'Bouton désactivé (exempté, gardé lisible)'),
    ('qcm', 'qcm-fond', T, 'Étiquette QCM'),
    ('vrai-faux', 'vrai-faux-fond', T, 'Étiquette Vrai / faux'),
    ('ouverte', 'ouverte-fond', T, 'Étiquette Question ouverte'),
    ('focus', 'surface', UI, 'Contour de focus sur carte'),
    ('focus', 'fond', UI, 'Contour de focus sur fond'),
    ('bordure', 'surface', UI, 'Bordure des champs sur carte'),
    ('bordure', 'fond', UI, 'Bordure des champs remplis'),
    ('principale', 'surface', UI, 'Bouton principal sur carte'),
    ('succes-bordure', 'surface', UI, 'Bordure de la bonne réponse'),
    ('avertissement-bordure', 'surface', UI, 'Bordure pointillée du brouillon'),
    ('bordure-legere', 'surface', DECO, 'Contour des cartes (décoratif)'),
    ('bordure-relief', 'surface', DECO, 'Relief des boutons blancs (décoratif)'),
    ('jaune', 'surface', DECO, 'Jaune : interdit en texte sur fond clair'),
]


def rapport(nom, palette):
    print(f'\n=== {nom} ===')
    echecs = 0
    for avant, arriere, seuil, usage in PAIRES:
        r = tronque(ratio(palette[avant], palette[arriere]))
        if seuil is None:
            etat = 'DÉCO'
        elif r >= seuil:
            etat = 'OK  '
        else:
            etat = 'ÉCHEC'
            echecs += 1
        cible = f'≥ {seuil}' if seuil else 'non requis'
        print(f'{etat} {r:5.2f}:1 ({cible:>10}) {palette[avant]} / {palette[arriere]}  {usage}')
    print(f'Échecs sur les associations soumises à un seuil : {echecs}')
    return echecs


if __name__ == '__main__':
    total = rapport('MODE CLAIR', CLAIR) + rapport('MODE SOMBRE', SOMBRE)
    raise SystemExit(1 if total else 0)
