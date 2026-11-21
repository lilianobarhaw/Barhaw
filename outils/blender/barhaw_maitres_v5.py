# Les maîtres des îles de la VF, « niveau 5 » : les mêmes que la V4 (barhaw_maitres_v4 : leur dessin, leur taille, leurs
# pièces qui bougent et leurs repères), mais chaque forme garde une carte d'atlas et chaque couleur devient une matière
# texturée du niveau 5, cuite avec la lumière (barhaw_compat_v4). Tous inventés, aucun personnage existant.
#   phare       Mère Brume, la gardienne : faite de brouillard, capuche, yeux qui brillent, vieille lanterne
#   cristal     La Mante Prisme : une mante de cristal, des lames aux bras, des ailes de verre
#   archipel    Nimbus, le serpent des nuages : un long corps de nuages enroulé, une crinière, des cornes dorées
#   cimetiere   Capitaine Calcaire : un capitaine squelette, tricorne à plume verte, manteau en lambeaux, sabre
#   horloge     Le Grand Remontoir : un automate de cuivre, un cadran sur la poitrine, une clé dans le dos qui tourne
#   geants      Ronchon, le géant réveillé : un buste de roche et de mousse, des sourcils froncés, des poings levés
#   forteresse  L'Amiral Boulet : un corsaire costaud, bicorne, grosse moustache, un canon à la place du bras
# (Le Roi Crapaud du Marais a son propre module, dessiné à la main : barhaw_maitre_marais_v5.)
# Sorties : maitre-<île>-v5.glb (+ -leger) et son atlas.   Usage, dans Blender : import barhaw_maitres_v5 as MA; MA.construire("phare")
import math, os, random
import numpy as np
import barhaw_niveau5 as N
import barhaw_vie_mer_v5 as V
import barhaw_compat_v4 as C

PI = math.pi
ILES = ("phare", "cristal", "archipel", "cimetiere", "horloge", "geants", "forteresse")
_ESPACE = None


def espace():
    global _ESPACE
    if _ESPACE is None:
        _ESPACE = C.espace_maitres()
    return _ESPACE


# ---------------------------------------------------------------------------------------------------------------------
# Mère Brume : celle de la V4, sauf sa capuche. Dans la V4, c'était une boule fermée, qui cachait l'ombre du visage et les
# yeux qui brillent (ils étaient dedans : on ne les voyait pas). Ici, elle s'ouvre devant, avec un ourlet, sombre dedans.
# ---------------------------------------------------------------------------------------------------------------------
def capuche(r, ouverture, epaisseur=0.08):
    """Une boule ouverte autour de son pôle (+Z) : le dehors, le dedans (retourné, on le voit par l'ouverture) et la hauteur
    du bord (pour l'ourlet). ouverture : le demi-angle du trou, vu du centre (le bord suit un rang de la boule)."""
    v, f = N.sphere(r, 18, 12)
    lim = r * math.cos(ouverture) + 1e-6
    dehors, dedans = N.Faces(), N.Faces()
    dehors.deroule, dedans.deroule = [], []
    for q, d in zip(f, f.deroule):
        if max(v[i][2] for i in q) <= lim:
            dehors.append(tuple(q))
            dehors.deroule.append(d)
            dedans.append(tuple(reversed(q)))
            dedans.deroule.append(list(reversed(d)))
    bord = max(v[i][2] for q in dehors for i in q)
    k = (r - epaisseur) / r
    return C.Forme(v, dehors), C.Forme([(x * k, y * k, z * k) for x, y, z in v], dedans), bord


def mere_brume(M):
    B, Vector = C.B, C.Vec
    L = M.L
    # la robe de brouillard : des boules de brume empilées, de plus en plus fines vers le haut
    for k in range(9):
        z = -2.0 + k * 0.75
        r = 2.0 - k * 0.15
        for j in range(7):
            a = j * 2 * PI / 7 + k * 0.4
            L.ajouter(B.sphere(r * 0.55, 12, 8), "blanc" if (j + k) % 3 else "glace", B.mat4((math.cos(a) * r * 0.6, math.sin(a) * r * 0.6, z), (0, 0, 0), (1, 1, 0.8)))
    # le châle ; la capuche, ouverte devant (+X), son ourlet et sa pointe ; l'ombre du visage ; les yeux qui brillent
    L.ajouter(B.cyl(1.6, 0.9, 1.4, 20), "gris", B.mat4((0, 0, 4.2)))
    H = B.mat4((0, 0, 6.1), (0, PI / 2, 0), (1.25, 1, 1))  # son pôle regarde +X ; 1,25 fois plus haute que large
    dehors, dedans, bord = capuche(1.05, math.radians(44))
    L.ajouter(dehors, "gris", H)
    L.ajouter(dedans, "noir", H)
    L.ajouter(B.tore(math.sqrt(1.05 ** 2 - bord ** 2), 0.08, 28, 6), "gris", H @ N.T(0, 0, bord))
    L.ajouter(B.cyl(0.95, 0.0, 1.1, 18), "gris", B.mat4((-0.2, 0, 7.0), (0, -0.35, 0)))
    L.ajouter(B.sphere(0.78, 16, 10), "noir", B.mat4((0.42, 0, 6.0), (0, 0, 0), (0.6, 1, 1.15)))
    for s in (-1, 1):
        L.ajouter(B.sphere(0.13, 10, 8), "lumiere", B.mat4((0.9, s * 0.28, 6.15), (0, 0, 0), (0.5, 1, 1.4)))
    # les bras de brume ; une main tient la vieille lanterne (elle se balance)
    for s in (-1, 1):
        pts = [(0.2, s * 1.4, 4.9), (0.9, s * 2.1, 4.0), (1.7, s * 2.2, 3.4 + (s > 0) * 1.2)]
        L.ajouter(B.tube(pts, [0.45, 0.38, 0.3], 10), "gris", B.mat4())
        L.ajouter(B.sphere(0.35, 10, 8), "blanc", B.mat4(pts[-1]))
    G = B.Lot()
    p = Vector((1.9, 2.3, 4.6))
    G.ajouter(B.tube([p, p + Vector((0, 0, -0.6))], 0.04, 4), "fer")
    G.ajouter(B.cyl(0.32, 0.32, 0.12, 8), "fer", B.mat4(p + Vector((0, 0, -0.7))))
    G.ajouter(B.cyl(0.26, 0.26, 0.6, 8), "lumiere", B.mat4(p + Vector((0, 0, -1.3))))
    for k in range(4):
        a = k * PI / 2 + PI / 4
        G.ajouter(B.cyl(0.03, 0.03, 0.62, 4), "fer", B.mat4(p + Vector((math.cos(a) * 0.3, math.sin(a) * 0.3, -1.32))))
    G.ajouter(B.cyl(0.36, 0.05, 0.3, 8), "fer", B.mat4(p + Vector((0, 0, -0.72))))
    G.ajouter(B.cyl(0.34, 0.34, 0.08, 8), "fer", B.mat4(p + Vector((0, 0, -1.38))))
    M.anim("lanterne", G, "balance", origine=tuple(p), axe=[1, 0, 0], ampl=0.18, vitesse=1.3)
    espace()["ecume"](L, 2.4, 12, 12)


REFAITS = {"phare": mere_brume}  # les maîtres redessinés ici (les autres : tels quels, ceux de la V4)


def mailles(ile, leger=False):
    N.DETAIL = 0.6 if leger else 1.0
    try:
        ns = espace()
        K = V.Sorte(f"maitre_{ile}")
        M = C.Modele(f"maitre_{ile}", K)
        REFAITS.get(ile, ns["MAITRES"][ile])(M)
        ns["DETAILS"][ile](M)
        K.recentrer()
        return K, M
    finally:
        N.DETAIL = 1.0


def verifier(ile, leger=False):
    """Sans Blender : il se construit, rien de faux ; sa taille (à comparer avec la V4, même dessin)."""
    K, M = mailles(ile, leger)
    tout = [K.corps, K.lumieres] + [m for m, *_ in K.anims]
    pts = np.concatenate([np.concatenate(K.corps.v)] + [np.concatenate(m.v) + np.asarray(o) for m, _, o, _ in K.anims if m.v])
    erreurs = []
    if not np.isfinite(pts).all():
        erreurs.append("des points faux (NaN)")
    dim = pts.max(0) - pts.min(0)
    if not (2.0 < dim.max() < 22.0):
        erreurs.append(f"taille étrange : {dim.round(2).tolist()}")
    mats = sorted({x for m in tout for x in m.mats})
    return {"ile": ile, "erreurs": erreurs, "taille": [round(float(x), 2) for x in dim], "bas": round(float(pts[:, 2].min()), 2),
            "triangles": sum(m.triangles() for m in tout), "pieces": [(p, e.get("anim")) for _, p, _, e in K.anims],
            "reperes": [(n, e.get("anim")) for n, _, e in M.reperes], "matieres": mats}


def construire(ile, rendu=True, cuire=True, exporter=True, taille=2048, echantillons=48, leger=False):
    """Dans Blender. Le site pose les maîtres à rotation.y = -0.75 PI (échelle 1,35) : le soleil de la cuisson est celui
    des îles (-0.5, -0.62, 0.62) tourné de +3/4 de tour autour de Z."""
    nom = f"maitre-{ile}-v5" + ("-leger" if leger else "")
    K, M = mailles(ile, leger)
    site = lambda m: not C.cuite(m)
    cuites = [K.corps] + [m for m, *_ in K.anims if not site(m)]
    infos = {"triangles": sum(m.triangles() for m in cuites), "finesse": [round(x, 2) for x in N.emballer(cuites, taille)]}
    coll = N.collection(f"maitre_{ile}_v5" + ("_leger" if leger else ""))
    objets = [N.objet(K.corps, coll, f"maitre_{ile}_corps", extras={"role": "decor"})]
    if K.lumieres.v:
        N.objet(K.lumieres, coll, f"maitre_{ile}_lumieres", extras={"role": "decor"})
    for m, partie, origine, extras in K.anims:
        o = N.objet(m, coll, f"maitre_{ile}_{partie}", origine=origine, extras=dict(extras, role="anim"))
        if not site(m):
            objets.append(o)
    for n, pos, extras in M.reperes:
        N.repere(coll, f"maitre_{ile}_{n}", pos, extras)
    a = 0.75 * PI
    soleil = (-0.5 * math.cos(a) + 0.62 * math.sin(a), -0.5 * math.sin(a) - 0.62 * math.cos(a), 0.62)
    if cuire:
        N.soleil_et_ciel(soleil=soleil, force=3.8, force_ciel=1.0, taille=6.0)
        infos["atlas"] = N.cuire_ensemble(objets, os.path.join(N.dossier(), "glb", nom + ".png"), taille, echantillons, nom=f"maitre_{ile}")
    N.soleil_et_ciel(soleil=soleil)
    if rendu:
        pts = np.concatenate([np.concatenate(K.corps.v)])
        h = float(pts[:, 2].max())
        infos["rendu"] = N.rendre(nom, (17, -13, 4 + h * 0.6), (0, 0, h * 0.45), 50, taille=(1200, 1200), echantillons=64, collections=[coll.name])
    if exporter:
        infos["glb"] = N.exporter(coll.name, nom + ".glb")
    return infos
