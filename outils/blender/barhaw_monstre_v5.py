# Le monstre des mers, « niveau 5 » (voir barhaw_niveau5.py) : l'événement en mer de GRAND LINE (js/grandline-3d.js,
# « monstre » : il sort de l'eau autour du navire). Tout est inventé. La même taille et les mêmes pièces qui bougent que
# la V4 (barhaw_creatures.monstre) :
#   monstre_tete          la grosse tête ronde, en poire, à écailles violettes et taches sombres ; la crête de nageoires
#                         roses, les oreilles-nageoires et leurs boucles d'or ; deux yeux énormes (iris d'or, paupières
#                         boudeuses, sourcils) ; le grand sourire plein de petites dents (« flotte » : elle se balance)
#   monstre_tentacule{k}_{j}  six tentacules, chacun une chaîne de cinq morceaux (chaque morceau est l'enfant du précédent,
#                         « balance » autour de son axe X : le site les fait onduler) ; dessous, la bande rose et les
#                         ventouses (côté navire) ; dessus, des taches ; le bout s'affine et s'enroule
#   monstre_ecume…        les repères de l'écume (le site l'ajoute là où la tête et les tentacules sortent de l'eau)
# Sorties : monstre-v5.glb (+ -leger) et son atlas.   Usage, dans Blender : import barhaw_monstre_v5 as Mo; Mo.construire()
import math, os, random
import numpy as np
import barhaw_niveau5 as N

PI = math.pi
T, Rx, Ry, Rz, S = N.T, N.Rx, N.Ry, N.Rz, N.S

N.matiere("m_ecaille", N.tx_tuiles, 1.1, 0.7, c1=0x7a3fd6, c2=0x5b2bab, c3=0x9a6cf0, rangs=9, cols=9, graine=1101, mousse=0.0, rond=True)
N.matiere("m_ventre", N.tx_uni, 0.8, 0.3, c=0xffb3d1, graine=1102, grain=0.2, taches=0.35, c2=0xe592b8, seuil=0.6)
N.matiere("m_ventouse", N.tx_uni, 0.4, 0.4, c=0xffc8de, graine=1103, grain=0.2, taches=0.3, c2=0xdc9cba, seuil=0.6)
N.matiere("m_tache", N.tx_uni, 0.6, 0.3, c=0x4b2392, graine=1104, grain=0.2, taches=0.4, c2=0x5d2db0, seuil=0.6)
N.matiere("m_rose", N.tx_uni, 0.6, 0.3, c=0xff7fb8, graine=1105, grain=0.2, taches=0.35, c2=0xd95e97, seuil=0.6)
N.matiere("m_blanc", N.tx_uni, 0.4, 0.1, rugueux=0.4, c=0xf7f3ec, graine=1106, grain=0.05, taches=0.1, c2=0xe2ddd2, seuil=0.7)
N.matiere("m_or", N.tx_uni, 0.4, 0.2, rugueux=0.4, metal=0.5, c=0xe0b040, graine=1107, grain=0.2, taches=0.3, c2=0xb07f22, seuil=0.6)
N.matiere("m_noir", N.tx_uni, 0.4, 0.1, rugueux=0.3, c=0x170a14, graine=1108, grain=0.05, taches=0.1, c2=0x2a1424, seuil=0.7)

TETE = (0.0, 11.5, 0.0)
# (angle autour du navire, distance, longueurs, rayon, courbure (vers le navire), phase) : comme la V4
REGLAGES = [
    (math.radians(-12), 8.6, [2.6, 2.3, 2.0, 1.8, 1.5], 0.95, [0, 0.28, 0.34, 0.42, 0.55], 0.0),
    (math.radians(28), 9.2, [2.8, 2.5, 2.2, 1.9, 1.6], 1.0, [0, 0.22, 0.3, 0.38, 0.6], 1.3),
    (math.radians(152), 9.0, [2.7, 2.4, 2.1, 1.8, 1.5], 0.98, [0, 0.26, 0.32, 0.4, 0.55], 2.4),
    (math.radians(196), 8.4, [2.4, 2.2, 1.9, 1.6, 1.4], 0.9, [0, 0.3, 0.36, 0.44, 0.6], 3.6),
    (math.radians(62), 13.5, [2.2, 2.0, 1.8, 1.5, 1.3], 0.85, [0, 0.12, 0.2, 0.3, 0.5], 4.5),
    (math.radians(118), 13.2, [2.0, 1.9, 1.7, 1.5, 1.2], 0.8, [0, 0.14, 0.22, 0.32, 0.5], 5.4),
]


def courbe(a, b, c, n):
    """Une courbe de Bézier (a, contrôle c, b) en n points."""
    a, b, c = (np.asarray(x, np.float64) for x in (a, b, c))
    return [tuple((1 - t) ** 2 * a + 2 * (1 - t) * t * c + t * t * b) for t in np.linspace(0, 1, n)]


def tete(G):
    """La tête, dessinée autour de son origine (le site la pose à TETE et la fait flotter)."""
    v, f = N.sphere(4.0, 30 if N.DETAIL >= 1 else 18, 18 if N.DETAIL >= 1 else 11)
    w = []
    for x, y, z in v:
        z2 = z * (1.2 if z > 0 else 1.0)
        y2 = y * (0.82 if y < 0 else 1.0)
        w.append((x * 1.12, y2, z2 + 0.6))
    G.ajouter(w, f, "m_ecaille", doux=True)
    for x, y, z, r in ((-1.6, 1.2, 4.1, 0.75), (1.3, 1.8, 4.3, 0.6), (0.2, 0.4, 5.0, 0.55), (2.6, 0.6, 2.8, 0.5), (-2.8, 0.9, 2.6, 0.55), (0.9, 2.9, 3.0, 0.5)):
        n = np.array((x, y, z - 0.6))
        n /= np.linalg.norm(n)
        a = math.atan2(n[1], n[0])
        b = math.acos(max(-1.0, min(1.0, n[2])))
        G.ajouter(*N.sphere(r, 12, 7), "m_tache", T(x * 1.03, y * 1.03, z) @ Rz(a) @ Ry(b) @ S(1, 1, 0.3))
    for k in range(5):
        a = (k - 2) * 0.32
        G.ajouter(*N.cylindre(0.42, 0.02, 1.7 - abs(k - 2) * 0.3, 10), "m_rose", T(math.sin(a) * 1.2, 0.8 + abs(k - 2) * 0.35, 5.2 - abs(k - 2) * 0.35) @ Rx(math.radians(-18)) @ Ry(a * 0.9) @ S(1, 0.32, 1))
    for s in (-1, 1):
        G.ajouter(*N.cylindre(0.9, 0.05, 2.0, 12), "m_rose", T(s * 4.1, 0.3, 2.4) @ Ry(s * math.radians(62)) @ S(1, 0.28, 1))
        anneau = [(s * 4.25 + 0.5 * math.cos(t), -0.1, 1.6 + 0.5 * math.sin(t)) for t in np.linspace(0, 2 * PI, 17)]
        G.ajouter(*N.tube(anneau, 0.08, 6, bouts=False), "m_or")
    for s in (-1, 1):  # les yeux, énormes, et leurs paupières boudeuses
        c = np.array((s * 1.55, -2.85, 2.6))
        d = np.array((-s * 0.08, -1.0, -0.12))
        d /= np.linalg.norm(d)
        r = 1.12
        G.ajouter(*N.sphere(r, 20, 14), "m_blanc", T(*c))
        G.ajouter(*N.sphere(r * 0.62, 16, 10), "m_or", T(*(c + d * r * 0.5)))
        G.ajouter(*N.sphere(r * 0.38, 14, 10), "m_noir", T(*(c + d * r * 0.78)))
        G.ajouter(*N.sphere(r * 0.13, 8, 6), "m_blanc", T(*(c + d * r * 1.0 + (r * 0.22, 0, r * 0.25))))
        pv, pf = N.sphere(r * 1.08, 20, 10)
        haut = [i for i, p in enumerate(pv) if p[2] >= -1e-6]
        reste = {i: k for k, i in enumerate(haut)}
        pf2 = [tuple(reste[i] for i in q) for q in pf if all(i in reste for i in q)]
        G.ajouter([pv[i] for i in haut], pf2, "m_ecaille", T(*c) @ Rx(math.radians(-42)))
        sourcil = courbe((s * 2.6, -3.1, 4.05), (s * 0.55, -3.55, 3.55), (s * 1.5, -3.6, 4.3), 8)
        G.ajouter(*N.tube(sourcil, [0.16, 0.24, 0.27, 0.28, 0.27, 0.25, 0.2, 0.14], 8), "m_tache")
    bouche = courbe((-2.2, -3.0, 0.8), (2.2, -3.0, 0.8), (0, -3.45, -0.5), 14)
    G.ajouter(*N.tube(bouche, [0.18, 0.26, 0.32, 0.36, 0.38, 0.4, 0.4, 0.4, 0.4, 0.38, 0.36, 0.32, 0.26, 0.18], 10), "m_noir")
    for k in range(1, 12, 2):
        p = np.asarray(bouche[k])
        G.ajouter(*N.cylindre(0.13, 0.0, 0.34, 6), "m_blanc", T(*(p + (0, -0.28, 0.24))) @ Rx(PI))


def morceau(G, longueur, r0, r1, bout=False):
    """Un morceau de tentacule, de z = 0 à z = longueur ; les ventouses du côté +Y (vers le navire)."""
    n = 7 if N.DETAIL >= 1 else 5
    if bout:
        pts = [(0, 0.35 * (k / (n - 1)) ** 2.4 * longueur, longueur * k / (n - 1)) for k in range(n)]
        rayons = [r0 * (1 - k / (n - 1)) ** 0.9 + 0.04 for k in range(n)]
    else:
        pts = [(0, 0, longueur * k / (n - 1)) for k in range(n)]
        rayons = [r0 + (r1 - r0) * k / (n - 1) for k in range(n)]
    G.ajouter(*N.tube(pts, rayons, 10 if N.DETAIL >= 1 else 7), "m_ecaille", doux=True)
    G.ajouter(*N.sphere(r0 * 1.02, 10, 6), "m_ecaille")  # l'articulation (pas de trou quand ça plie)
    bande = [(x, y + rayons[0] * 0.22, z) for x, y, z in pts]
    G.ajouter(*N.tube(bande, [r * 0.82 for r in rayons], 8 if N.DETAIL >= 1 else 6), "m_ventre", doux=True)
    nb = 2 if bout else 3
    for k in range(nb):
        t = (k + 0.5) / nb * (0.7 if bout else 1.0)
        z = longueur * t
        r = r0 + (r1 - r0) * t if not bout else r0 * (1 - t) + 0.04
        y = r * 1.0 + (0.35 * t ** 2.4 * longueur if bout else 0)
        d = max(0.07, r * 0.38)
        G.ajouter(*N.cylindre(d, d * 0.8, 0.12, 8), "m_ventouse", T(0, y - 0.02, z) @ Rx(-PI / 2))
        G.ajouter(*N.cylindre(d * 0.45, d * 0.45, 0.13, 6), "m_rose", T(0, y, z) @ Rx(-PI / 2))
    if not bout:
        for k in range(2):
            t = 0.3 + k * 0.4
            r = r0 + (r1 - r0) * t
            a = (k - 0.5) * 1.1
            G.ajouter(*N.sphere(r * 0.34, 10, 6), "m_tache", T(math.sin(a) * r * 0.93, -math.cos(a) * r * 0.93, longueur * t) @ Rz(a - PI / 2) @ Ry(PI / 2) @ S(1, 1, 0.3))


def mailles(leger=False):
    """La tête et les 6 × 5 morceaux de tentacules, chacun dessiné autour de sa propre origine."""
    N.DETAIL = 0.6 if leger else 1.0
    try:
        tete_m = N.Maille("monstre_tete")
        tete(tete_m)
        tentacules = []
        for k, (a, d, longueurs, r, courbure, ph) in enumerate(REGLAGES):
            rayons = [r * (1 - 0.8 * j / len(longueurs)) for j in range(len(longueurs) + 1)]
            chaine = []
            for j, l in enumerate(longueurs):
                m = N.Maille(f"monstre_tentacule{k}_{j}")
                morceau(m, l, rayons[j], rayons[j + 1], j == len(longueurs) - 1)
                chaine.append(m)
            tentacules.append(chaine)
        return tete_m, tentacules
    finally:
        N.DETAIL = 1.0


def verifier(leger=False):
    """Sans Blender : tout se construit, rien de faux ; la tête fait la taille de la V4 (≈ 11,7 de large, oreilles comprises)."""
    tete_m, tentacules = mailles(leger)
    erreurs = []
    pts = np.concatenate(tete_m.v)
    if not np.isfinite(pts).all():
        erreurs.append("tête : des points faux")
    dim = pts.max(0) - pts.min(0)
    if not 10.5 < dim[0] < 13.0:
        erreurs.append(f"la tête fait {dim[0]:.2f} de large (la V4 : ≈ 11,7)")
    for k, chaine in enumerate(tentacules):
        for j, m in enumerate(chaine):
            q = np.concatenate(m.v)
            if not np.isfinite(q).all() or q[:, 2].max() > REGLAGES[k][2][j] + 1.2:
                erreurs.append(f"tentacule {k}, morceau {j} : forme fausse")
    tri = tete_m.triangles() + sum(m.triangles() for c in tentacules for m in c)
    return {"erreurs": erreurs, "tete": [round(float(x), 2) for x in dim], "triangles": tri, "morceaux": sum(len(c) for c in tentacules)}


def construire(rendu=True, cuire=True, exporter=True, taille=2048, echantillons=48, leger=False):
    """Dans Blender : la tête, les tentacules (chaque morceau enfant du précédent), la lumière cuite dans un atlas,
    l'export, un rendu. N.objet ne fait pas de parenté : on la pose après coup (origine et rotation locales)."""
    nom = "monstre-v5" + ("-leger" if leger else "")
    tete_m, tentacules = mailles(leger)
    tout = [tete_m] + [m for c in tentacules for m in c]
    infos = {"triangles": sum(m.triangles() for m in tout), "finesse": [round(x, 2) for x in N.emballer(tout, taille)]}
    coll = N.collection("monstre_v5" + ("_leger" if leger else ""))
    objets = [N.objet(tete_m, coll, "monstre_tete", origine=TETE, extras={"role": "anim", "anim": "flotte", "ampl": 0.35, "phase": 0.0})]
    N.repere(coll, "monstre_ecume_tete", (TETE[0], TETE[1], 0.05), {"anim": "ecume", "rayon": 5.2})
    for k, (a, d, longueurs, r, courbure, ph) in enumerate(REGLAGES):
        base = (math.cos(a) * d, math.sin(a) * d, -0.4)
        avant = None
        for j, m in enumerate(tentacules[k]):
            ext = {"role": "anim", "anim": "balance", "axe": [1, 0, 0], "ampl": 0.16 * (1 + j * 0.12), "vitesse": 1.6, "phase": ph - j * 0.55}
            o = N.objet(m, coll, f"monstre_tentacule{k}_{j}", origine=(0, 0, 0), extras=ext)
            if avant is None:
                o.location = base
                o.rotation_euler = (0.18, 0.0, a + PI / 2)
            else:
                o.parent = avant
                o.location = (0.0, 0.0, longueurs[j - 1])
                o.rotation_euler = (-courbure[j], 0.0, 0.0)
            objets.append(o)
            avant = o
        N.repere(coll, f"monstre_ecume{k}", (base[0], base[1], 0.05), {"anim": "ecume", "rayon": r * 1.7})
    import bpy
    bpy.context.view_layer.update()
    if cuire:
        N.soleil_et_ciel(soleil=(-0.16, -0.28, 0.95), force=3.3, force_ciel=1.2, taille=8.0)
        infos["atlas"] = N.cuire_ensemble(objets, os.path.join(N.dossier(), "glb", nom + ".png"), taille, echantillons, nom="monstre")
    N.soleil_et_ciel()
    if rendu:
        infos["rendu"] = N.rendre(nom, (0, -34, 24), (0, 3, 3.5), 36, taille=(1600, 1000), echantillons=64, collections=[coll.name])
    if exporter:
        infos["glb"] = N.exporter(coll.name, nom + ".glb")
    return infos
