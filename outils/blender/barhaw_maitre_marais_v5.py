# Le Roi Crapaud, maître du Marais des Lanternes, « niveau 5 » (voir barhaw_niveau5.py). Tout est inventé. La même
# taille et les mêmes pièces qui bougent que la V4 (barhaw_maitres_v4.roi_crapaud + plus_marais) : le site le fait
# sortir de l'eau devant son île (js/grandline-3d.js, événement « maitre »), un peu plus grand et tourné vers le navire.
#   sur son nénuphar géant (et ses fleurs), un gros crapaud verruqueux, le ventre clair, la gorge rose, une grande
#   bouche ; des yeux d'or à pupille fendue, cerclés de bourrelets ; les pattes avant aux doigts palmés, les cuisses ;
#   sa cape royale violette, son galon d'or et son col d'hermine ; la couronne de bougies (maitre_marais_flammes :
#   elles clignotent doucement) ; la tige qui sort de son crâne et sa lanterne qui se balance (maitre_marais_lanterne) ;
#   le sceptre de roseau, sa massette et sa pierre de lune ; trois libellules qui tournent autour de sa tête
#   (maitre_marais_libellules) ; les lucioles et l'écume (repères : le site les ajoute).
# Sorties : maitre-marais-v5.glb (+ -leger) et son atlas.   Usage, dans Blender : import barhaw_maitre_marais_v5 as R; R.construire()
import math, os, random
import numpy as np
import barhaw_niveau5 as N
import barhaw_vie_mer_v5 as V

PI = math.pi
T, Rx, Ry, Rz, S = N.T, N.Rx, N.Ry, N.Rz, N.S
NOM = "maitre_marais"

N.matiere("r_peau", N.tx_uni, 1.2, 0.8, c=0x5f8a3c, graine=1201, grain=0.35, taches=0.55, c2=0x3d6628, seuil=0.55)
N.matiere("r_ventre", N.tx_uni, 1.0, 0.4, c=0xe8dbad, graine=1202, grain=0.25, taches=0.35, c2=0xcbb983, seuil=0.6)
N.matiere("r_gorge", N.tx_uni, 0.8, 0.3, c=0xf0b7ae, graine=1203, grain=0.2, taches=0.3, c2=0xd8978e, seuil=0.6)
N.matiere("r_levre", N.tx_uni, 0.5, 0.2, c=0x5a2f4a, graine=1204, grain=0.15, taches=0.2, c2=0x41213a, seuil=0.65)
N.matiere("r_verrue", N.tx_uni, 0.4, 0.6, c=0x3d5c27, graine=1205, grain=0.3, taches=0.4, c2=0x2b4419, seuil=0.6)
N.matiere("r_verrue_j", N.tx_uni, 0.4, 0.5, c=0xd8c04a, graine=1206, grain=0.3, taches=0.35, c2=0xa98f2c, seuil=0.6)
N.matiere("r_cape", N.tx_uni, 1.0, 0.3, c=0x6b3b9c, graine=1207, grain=0.2, taches=0.4, c2=0x4d2a74, seuil=0.55)
N.matiere("r_hermine", N.tx_uni, 0.5, 0.4, c=0xf4efe2, graine=1208, grain=0.3, taches=0.3, c2=0xd9d2c0, seuil=0.6)
N.matiere("r_or", N.tx_uni, 0.5, 0.3, rugueux=0.4, metal=0.5, c=0xd9a93a, graine=1209, grain=0.2, taches=0.3, c2=0xa87a20, seuil=0.6)
N.matiere("r_bougie", N.tx_uni, 0.4, 0.2, c=0xf2e6c6, graine=1210, grain=0.15, taches=0.3, c2=0xd8c8a0, seuil=0.6)
N.matiere("r_cire_rouge", N.tx_uni, 0.3, 0.2, c=0x8e2230, graine=1211, grain=0.1, taches=0.2, c2=0x6a1622, seuil=0.6)
N.matiere("r_nenuphar", N.tx_uni, 1.5, 0.4, c=0x4f8a3a, graine=1212, grain=0.3, taches=0.5, c2=0x3a6b2b, seuil=0.55)
N.matiere("r_fleur", N.tx_uni, 0.4, 0.2, c=0xf7cbd9, graine=1213, grain=0.15, taches=0.3, c2=0xe9a6bf, seuil=0.6)
N.matiere("r_fleur2", N.tx_uni, 0.4, 0.2, c=0xec8fb2, graine=1214, grain=0.15, taches=0.3, c2=0xd06d95, seuil=0.6)
N.matiere("r_jaune", N.tx_uni, 0.3, 0.3, c=0xe9c84a, graine=1215, grain=0.2, taches=0.3, c2=0xc29e2c, seuil=0.6)
N.matiere("r_blanc", N.tx_uni, 0.3, 0.1, rugueux=0.4, c=0xf7f3ec, graine=1216, grain=0.05, taches=0.1, c2=0xe2ddd2, seuil=0.7)
N.matiere("r_iris", N.tx_uni, 0.3, 0.1, rugueux=0.4, c=0xe0a52a, graine=1217, grain=0.2, taches=0.3, c2=0xb07a14, seuil=0.6)
N.matiere("r_noir", N.tx_uni, 0.3, 0.1, rugueux=0.3, c=0x140d10, graine=1218, grain=0.05, taches=0.1, c2=0x2a1c22, seuil=0.7)
N.matiere("r_roseau", N.tx_uni, 0.6, 0.3, c=0x40692e, graine=1219, grain=0.25, taches=0.35, c2=0x2f5121, seuil=0.6)
N.matiere("r_massette", N.tx_uni, 0.4, 0.6, c=0x6d4a2a, graine=1220, grain=0.4, taches=0.4, c2=0x4f331b, seuil=0.55)
N.matiere("r_libellule", N.tx_uni, 0.3, 0.2, rugueux=0.4, metal=0.3, c=0x2fb5b0, graine=1221, grain=0.2, taches=0.3, c2=0x1d8a86, seuil=0.6)
N.matiere("r_aile", N.tx_uni, 0.3, 0.1, rugueux=0.3, c=0xdff3f7, graine=1222, grain=0.1, taches=0.2, c2=0xb9dfe8, seuil=0.6)
N.matiere("r_corde", N.tx_corde, 0.4, 0.4, c=0x9a8a62, graine=1223)


def euler(p, a=0.0, b=0.0, c=0.0, ech=(1.0, 1.0, 1.0)):
    """Comme B.mat4 de la V4 : position, rotation d'Euler XYZ de Blender (a, b, c), échelle."""
    return T(*p) @ Rz(c) @ Ry(b) @ Rx(a) @ S(*ech)


def dome(r, nu, nv):
    """Une demi-sphère (le dessus) : la sphère de N, sans le dessous."""
    v, f = N.sphere(r, nu, nv)
    garde = [i for i, p in enumerate(v) if p[2] >= -1e-6]
    ix = {i: k for k, i in enumerate(garde)}
    return [v[i] for i in garde], [tuple(ix[i] for i in q) for q in f if all(i in ix for i in q)]


def anneau(L, M, R, r, mat, n=24):
    """Un tore (dans le plan XY de M) : un tube fermé."""
    pts = [(R * math.cos(t), R * math.sin(t), 0.0) for t in np.linspace(0, 2 * PI, n + 1)]
    L.ajouter(*N.tube(pts, r, 6, bouts=False), mat, M)


def yeux(L, centre, ecart, r, regard):
    c = np.asarray(centre, np.float64)
    d = np.asarray(regard, np.float64)
    d /= np.linalg.norm(d)
    cote = np.cross(d, (0.0, 0.0, 1.0))
    cote /= np.linalg.norm(cote)
    for s in (-1, 1):
        p = c + cote * s * ecart
        L.ajouter(*N.sphere(r, 18, 12), "r_blanc", T(*p))
        L.ajouter(*N.sphere(r * 0.55, 14, 9), "r_iris", T(*(p + d * r * 0.62)))
        # (la pupille fendue et le reflet dépassent de l'iris, sinon ils restent cachés dedans)
        L.ajouter(*N.sphere(r * 0.28, 10, 6), "r_noir", T(*(p + d * r * 1.1)) @ S(0.45, 1.0, 1.6))
        L.ajouter(*N.sphere(r * 0.12, 6, 4), "r_blanc", T(*(p + d * r * 1.13 + (0, 0, r * 0.24))))


def roi(K, rng):
    L, U = K.corps, K.lumieres
    # le nénuphar géant, et ses fleurs sur le bord
    L.ajouter(*N.cylindre(4.2, 4.2, 0.25, 40, haut=True, bas=True), "r_nenuphar", T(0, 0, -0.15))
    for k in range(12):
        a = k * 2 * PI / 12
        L.ajouter(*N.poutre((0.4 * math.cos(a), 0.4 * math.sin(a), 0.105), (4.0 * math.cos(a), 4.0 * math.sin(a), 0.105), 0.03, 0.006), "r_verrue")
    for k, a in enumerate((0.8, 2.4, 3.6, 5.2)):
        p = (math.cos(a) * 3.5, math.sin(a) * 3.5, 0.1)
        for j in range(2):
            L.ajouter(*N.cylindre(0.55 - j * 0.18, 0.3 - j * 0.1, 0.1, 6 + j), "r_fleur" if j == 0 else "r_fleur2", T(p[0], p[1], p[2] + j * 0.12) @ Rz(a + j * 0.3))
        L.ajouter(*N.sphere(0.12, 8, 6), "r_jaune", T(p[0], p[1], 0.32))
    # le corps rond, le ventre clair, la gorge rose, les verrues, les taches du dos
    L.ajouter(*N.sphere(3.0, 28, 18), "r_peau", euler((0, 0, 2.3), ech=(1.05, 1.0, 0.85)), doux=True)
    L.ajouter(*N.sphere(2.5, 22, 14), "r_ventre", euler((1.1, 0, 1.9), ech=(0.75, 0.95, 0.8)), doux=True)
    L.ajouter(*N.sphere(1.3, 16, 10), "r_gorge", euler((2.3, 0, 2.6), ech=(0.6, 1.0, 0.7)), doux=True)
    for k in range(40 if N.DETAIL >= 1 else 24):
        a, b = rng.uniform(-2.8, 2.8), rng.uniform(0.3, 1.4)
        p = (math.cos(a) * math.cos(b) * 3.1, math.sin(a) * math.cos(b) * 3.0, 2.3 + math.sin(b) * 2.55)
        if p[0] > 1.6 and abs(p[1]) < 1.6:
            continue
        L.ajouter(*dome(rng.uniform(0.12, 0.28), 10, 5), rng.choice(("r_verrue", "r_peau", "r_verrue_j")), euler(p, 0, -b + PI / 2, a))
    for k in range(10):
        a, b = rng.uniform(1.6, 4.6), rng.uniform(0.4, 1.2)
        p = (math.cos(a) * math.cos(b) * 3.1, math.sin(a) * math.cos(b) * 3.0, 2.3 + math.sin(b) * 2.55)
        L.ajouter(*N.sphere(rng.uniform(0.25, 0.45), 10, 6), "r_verrue", euler(p, 0, -b + PI / 2, a, (1, 1, 0.2)))
    # la grande bouche, les yeux d'or sur le dessus et leurs bourrelets
    L.ajouter(*N.tube([(2.4, -1.9, 3.3), (2.9, -1.0, 3.0), (3.05, 0, 2.95), (2.9, 1.0, 3.0), (2.4, 1.9, 3.3)], 0.12, 8), "r_levre")
    yeux(L, (1.7, 0, 4.7), 1.05, 0.72, (1, 0, 0.15))
    for s in (-1, 1):
        anneau(L, euler((1.7, s * 1.05, 4.75), 0, PI / 2 - 0.15, 0), 0.72, 0.16, "r_peau")
    # les cuisses, les pattes avant et leurs doigts palmés
    for s in (-1, 1):
        L.ajouter(*N.sphere(1.3, 16, 10), "r_peau", euler((-0.6, s * 2.6, 1.0), ech=(1.5, 0.8, 0.8)), doux=True)
        L.ajouter(*N.tube([(1.8, s * 1.9, 2.0), (2.6, s * 2.2, 0.9), (3.1, s * 2.1, 0.2)], [0.42, 0.36, 0.3], 10), "r_peau")
        for j in range(3):
            a = -0.5 + j * 0.5
            q = (3.1 + math.cos(a) * 0.7, s * 2.1 + math.sin(a) * 0.7 * s, 0.12)
            L.ajouter(*N.tube([(3.1, s * 2.1, 0.2), q], [0.16, 0.12], 6), "r_peau")
            L.ajouter(*N.sphere(0.16, 8, 6), "r_verrue_j", T(3.1 + math.cos(a) * 0.75, s * 2.1 + math.sin(a) * 0.75 * s, 0.14))
    # la cape royale, son galon d'or, son col d'hermine
    v, f = dome(3.1, 28, 10)
    L.ajouter(v, f, "r_cape", euler((-1.3, 0, 1.0), 0, -0.55, 0, (0.62, 1.18, 1.25)), doux=True)
    anneau(L, euler((-1.25, 0, 1.0), 0, -0.55, 0, (0.62, 1.18, 1.0)), 2.9, 0.12, "r_or", n=40)
    for k in range(17):
        a = PI * 0.55 + k * PI * 0.9 / 16
        p = (-0.1 + math.cos(a) * 1.5, math.sin(a) * 2.6, 4.55 - abs(math.sin(a)) * 0.6)
        L.ajouter(*N.sphere(0.36, 10, 8), "r_hermine", T(*p))
        if k % 3 == 1:
            L.ajouter(*N.sphere(0.07, 6, 4), "r_noir", T(p[0] + 0.1, p[1], p[2] + 0.32) @ S(1, 1, 1.8))
    # la couronne de bougies (les flammes clignotent doucement)
    anneau(L, T(0.2, 0, 4.95), 1.15, 0.16, "r_or", n=32)
    F = K.anim("flammes", (0, 0, 0), anim="clignote", lent=1)
    for k in range(9):
        a = k * 2 * PI / 9
        q = (0.2 + math.cos(a) * 1.15, math.sin(a) * 1.15, 5.05)
        hh = 0.5 + (k % 3) * 0.2
        L.ajouter(*N.cylindre(0.13, 0.12, hh, 8), "r_bougie", T(*q))
        L.ajouter(*N.sphere(0.06, 6, 4), "r_cire_rouge", T(q[0] + math.cos(a) * 0.17, q[1] + math.sin(a) * 0.17, q[2] + 0.05 + hh * 0.6))
        F.ajouter(*N.cylindre(0.08, 0.0, 0.3, 6), "lumiere", T(q[0], q[1], q[2] + hh))
    # la tige qui sort du crâne, et la lanterne qui pend au bout (elle se balance)
    tige = [(-0.4, 0, 5.0), (0.2, 0, 7.0), (1.6, 0, 7.9), (2.9, 0, 7.6)]
    L.ajouter(*N.tube(tige, [0.18, 0.13, 0.09, 0.07], 8), "r_peau")
    p = np.asarray(tige[-1])
    G = K.anim("lanterne", tuple(p), anim="balance", axe=[0, 1, 0], ampl=0.2, vitesse=1.1)
    G.ajouter(*N.tube([tuple(p), tuple(p + (0, 0, -0.7))], 0.025, 4), "r_corde")
    G.ajouter(*N.sphere(0.45, 14, 10), "lumiere", T(*(p + (0, 0, -1.2))) @ S(1, 1, 1.2))
    for dz in (-0.68, -1.72):
        G.ajouter(*N.cylindre(0.22, 0.22, 0.1, 10), "r_noir", T(*(p + (0, 0, dz - 0.05))))
    for j in range(4):
        anneau(G, T(*(p + (0, 0, -1.55 + j * 0.23))), 0.46 - abs(j - 1.5) * 0.06, 0.03, "r_cire_rouge", n=18)
    # le sceptre : un roseau, sa massette, une pierre de lune
    base = np.array((2.4, -3.3, -0.1))
    L.ajouter(*N.tube([tuple(base), tuple(base + (0.15, -0.1, 3.2)), tuple(base + (0.3, -0.15, 5.0))], [0.09, 0.08, 0.06], 7), "r_roseau")
    L.ajouter(*N.cylindre(0.2, 0.2, 0.9, 10), "r_massette", T(*(base + (0.3, -0.15, 5.0))))
    L.ajouter(*N.sphere(0.2, 10, 8), "r_massette", T(*(base + (0.3, -0.15, 5.9))))
    U.ajouter(*N.sphere(0.28, 8, 6), "astre", T(*(base + (0.3, -0.15, 6.3))))
    for k in range(3):
        a = base + (0, 0, 1.2 + k * 0.5)
        L.ajouter(*N.tube([tuple(a), tuple(a + (0.3, -0.5 + k * 0.4, 0.8)), tuple(a + (0.5, -0.8 + k * 0.5, 1.0))], [0.05, 0.035, 0.01], 5), "r_roseau")
    # trois libellules qui tournent autour de sa tête
    D = K.anim("libellules", (0, 0, 0), anim="tourne", axe=[0, 0, 1], vitesse=0.9)
    for k in range(3):
        a = k * 2 * PI / 3
        c = np.array((math.cos(a) * 3.6, math.sin(a) * 3.6, 6.2 + k * 0.4))
        d = np.array((-math.sin(a), math.cos(a), 0.0))
        D.ajouter(*N.tube([tuple(c - d * 0.5), tuple(c + d * 0.5)], [0.05, 0.08], 6), "r_libellule")
        D.ajouter(*N.sphere(0.12, 8, 6), "r_libellule", T(*(c + d * 0.55)))
        cote = np.cross(d, (0.0, 0.0, 1.0))
        for s in (-1, 1):
            for j in (-0.12, 0.12):
                D.ajouter(*N.boite(0.18, 0.55, 0.02), "r_aile", T(*(c + d * (0.2 + j) + cote * s * 0.32)) @ Rz(math.atan2(d[1], d[0]) + s * 0.2))


def mailles(leger=False):
    N.DETAIL = 0.6 if leger else 1.0
    try:
        K = V.Sorte(NOM)
        roi(K, random.Random(121))
        K.recentrer()
        return K
    finally:
        N.DETAIL = 1.0


def verifier(leger=False):
    """Sans Blender : il se construit, rien de faux, la taille de la V4 (le nénuphar : 8,4 de large ; ≈ 9 de haut)."""
    K = mailles(leger)
    tout = [K.corps, K.lumieres] + [m for m, *_ in K.anims]
    pts = np.concatenate([np.concatenate(K.corps.v)] + [np.concatenate(m.v) + np.asarray(o) for m, _, o, _ in K.anims if m.v])
    erreurs = []
    if not np.isfinite(pts).all():
        erreurs.append("des points faux (NaN)")
    dim = pts.max(0) - pts.min(0)
    if not 8.0 < dim[1] < 9.5 or not 8.0 < dim[2] < 10.0:
        erreurs.append(f"taille {dim.round(2).tolist()} (la V4 : ≈ 8,4 de large, 9 de haut)")
    return {"erreurs": erreurs, "taille": [round(float(x), 2) for x in dim], "triangles": sum(m.triangles() for m in tout), "pieces": [p for _, p, _, _ in K.anims]}


def construire(rendu=True, cuire=True, exporter=True, taille=2048, echantillons=48, leger=False):
    """Dans Blender. Le site le tourne de -3/4 de tour (rotation.y = -0.75 PI) : le soleil de la cuisson est celui des îles
    (-0.5, -0.62, 0.62) tourné de +3/4 de tour autour de Z."""
    nom = "maitre-marais-v5" + ("-leger" if leger else "")
    K = mailles(leger)
    site = lambda m: bool(m.mats) and all(x in N.SITE for x in m.mats)
    cuites = [K.corps] + [m for m, *_ in K.anims if not site(m)]
    infos = {"triangles": sum(m.triangles() for m in cuites), "finesse": [round(x, 2) for x in N.emballer(cuites, taille)]}
    coll = N.collection(NOM + "_v5" + ("_leger" if leger else ""))
    objets = [N.objet(K.corps, coll, f"{NOM}_corps", extras={"role": "decor"})]
    if K.lumieres.v:
        N.objet(K.lumieres, coll, f"{NOM}_lumieres", extras={"role": "decor"})
    for m, partie, origine, extras in K.anims:
        o = N.objet(m, coll, f"{NOM}_{partie}", origine=origine, extras=dict(extras, role="anim"))
        if not site(m):
            objets.append(o)
    N.repere(coll, f"{NOM}_lucioles", (0.0, 0.0, 1.0), {"anim": "lucioles", "rayon": 6})
    N.repere(coll, f"{NOM}_eau", (0.0, 0.0, 0.05), {"anim": "ecume", "rayon": 4.4})
    a = 0.75 * PI
    soleil = (-0.5 * math.cos(a) + 0.62 * math.sin(a), -0.5 * math.sin(a) - 0.62 * math.cos(a), 0.62)
    if cuire:
        N.soleil_et_ciel(soleil=soleil, force=3.8, force_ciel=1.0, taille=6.0)
        infos["atlas"] = N.cuire_ensemble(objets, os.path.join(N.dossier(), "glb", nom + ".png"), taille, echantillons, nom="maitre_marais")
    N.soleil_et_ciel(soleil=soleil)
    if rendu:
        infos["rendu"] = N.rendre(nom, (17, -13, 9), (0, 0, 3.4), 50, taille=(1200, 1200), echantillons=64, collections=[coll.name])
    if exporter:
        infos["glb"] = N.exporter(coll.name, nom + ".glb")
    return infos
