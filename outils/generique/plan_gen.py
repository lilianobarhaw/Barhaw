# Le découpage du générique (secondes de la vidéo), commun à l'image et au son.
# La musique : « Spark » (Leva, Artlist), 160 BPM ; le temps k de la partie A tombe à 2,5 + 0,375 k.
FPS = 30
DUREE = 45.5
T = 0.375
def b(k):  # le temps k de la musique, en secondes de la vidéo (la mesure 63 de la chanson = le temps 0)
    return 2.5 + T * k

# la musique : (source début, source fin, vidéo début)
MUSIQUE = [(94.728, 121.728, 2.5), (127.728, 140.40, 29.5)]

# les plans : (nom, début, fin, image de départ dans le rendu, réglages)
PLANS = [
    ("brume_loin", 0.0, b(2), 0, {"nuit": True, "fondu_entree": 1.4}),
    ("brume_proue", b(2), b(10), 30, {"nuit": True}),
    ("brume_calcaire", b(10), b(18), 0, {"nuit": True}),
    ("brume_rire", b(18), b(27.33), 0, {"nuit": True}),
    ("nuit_phare", b(27.33), b(30), 20, {"nuit": True}),
    ("nuit_monstre", b(30), b(34), 14, {"nuit": True}),
    ("nuit_boss", b(34), b(38), 0, {"nuit": True}),
    # la montée : des éclats de plus en plus courts
    ("brume_rire", b(38), b(40), 62, {"nuit": True, "zoom": 1.18}),
    ("brume_proue", b(40), b(42), 94, {"nuit": True}),
    ("nuit_phare", b(42), b(44), 34, {"nuit": True}),
    ("nuit_monstre", b(44), b(45), 46, {"nuit": True, "zoom": 1.12}),
    ("nuit_boss", b(45), b(46), 30, {"nuit": True}),
    ("brume_calcaire", b(46), b(47), 62, {"nuit": True, "zoom": 1.1}),
    ("brume_loin", b(47), b(48), 100, {"nuit": True, "fondu_sortie": 0.3}),
    # les deux arrêts de la musique : le noir, deux éclairs
    ("noir", b(48), b(56), 0, {"eclairs": [b(48), b(52)], "aube": True}),
    # le refrain : le plein jour
    ("jour_eveil", b(56), b(64), 0, {"titre": True}),
    ("ile_phare", b(64), b(66), 9, {"ile": "phare"}),
    ("ile_marais", b(66), b(68), 9, {"ile": "marais"}),
    ("ile_cristal", b(68), b(70), 9, {"ile": "cristal"}),
    ("ile_archipel", b(70), b(72), 9, {"ile": "archipel"}),
    ("ile_cimetiere", b(72), b(74), 9, {"ile": "cimetiere"}),
    ("ile_horloge", b(74), b(76), 9, {"ile": "horloge"}),
    ("ile_geants", b(76), b(78), 9, {"ile": "geants"}),
    ("ile_forteresse", b(78), b(80), 9, {"ile": "forteresse"}),
    ("jour_baleine", b(80), b(83), 8, {}),
    ("jour_monstre", b(83), b(88), 6, {}),
    ("boss_krakor", b(88), b(90.67), 8, {"boss": "KRAKOR"}),
    ("boss_morghast", b(90.67), b(93.33), 8, {"boss": "MORGHAST"}),
    ("boss_voraxia", b(93.33), b(96), 8, {"boss": "VORAXIA"}),
    ("logo", b(96), 41.0, 0, {}),
    ("brume_depart", 41.0, DUREE, 0, {"nuit": True, "fondu_entree": 0.35, "fondu_sortie": 1.2}),
]

# les répliques : (fichier, début de la parole dans la vidéo) ; le fichier commence 0,08 s avant la parole
VOIX = [("alors_comme_ca", 0.80), ("vous_voulez", 2.30), ("veyzo", 5.10), ("kikso", 6.45), ("cette_mer", 7.60),
        ("rire", 9.30), ("mes_iles_monstres", 12.95), ("mes_regles", 15.72), ("bienvenue_sur", 19.20), ("grand_line", 22.38),
        ("aucun_equipage", 41.70)]

ILES = {
    "phare": ("MÈRE BRUME", "Le Phare du Bout du Monde"),
    "marais": ("LE ROI CRAPAUD", "Le Marais des Lanternes"),
    "cristal": ("LA MANTE PRISME", "Le Jardin de Cristal"),
    "archipel": ("NIMBUS", "L'Archipel Suspendu"),
    "cimetiere": ("CAPITAINE CALCAIRE", "Le Cimetière de Navires"),
    "horloge": ("LE GRAND REMONTOIR", "L'Île-Horloge"),
    "geants": ("RONCHON", "L'Île des Géants Endormis"),
    "forteresse": ("L'AMIRAL BOULET", "La Forteresse des Corsaires"),
}
