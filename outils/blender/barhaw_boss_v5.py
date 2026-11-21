# Les boss du BOSS LIVE, « niveau 5 » : MORGHAST, VORAXIA et KRAKOR, les mêmes que barhaw_boss (leur dessin, leurs pièces,
# leurs noms), mais chaque forme garde une carte d'atlas et chaque couleur devient une matière texturée du niveau 5, cuite
# avec la lumière de la page des boss (barhaw_compat_v4). Tous inventés, aucun personnage existant.
# Le site les anime par les noms (js/boss-3d.js) : boss_tete, boss_halo, boss_coeur, boss_bras_g / _d, boss_tentacule0..
# Ce qui brille (la lave, la foudre, le feu) et le verre restent au site : dans un objet « lueur_<pièce> », enfant de sa
# pièce (il bouge avec elle ; son nom ne commence pas par « boss_ », pour que le site ne l'anime pas une seconde fois).
# Sorties : glb/<id>-v5.glb (+ -leger) et leur atlas.   Usage, dans Blender : import barhaw_boss_v5 as BV; BV.construire("krakor")
import math, os, types
import numpy as np
import barhaw_niveau5 as N
import barhaw_compat_v4 as C

PI = math.pi
BOSS = ("morghast", "voraxia", "krakor")
# la lumière de la page des boss : la lampe chaude du site (devant, à droite, en haut), un contre-jour de la couleur du boss,
# un ciel violet sombre (la page est sombre)
CONTRE = {"morghast": (1.0, 0.24, 0.56), "voraxia": (0.25, 0.82, 1.0), "krakor": (1.0, 0.36, 0.1)}
SOLEIL = (0.31, -0.62, 0.72)  # js/boss-3d.js : DirectionalLight en (6, 14, 12) (site) = (6, -12, 14) dans Blender


class Piece:
    """Ce que barhaw_boss attend de Lot.objet() : un objet, son origine, sa place (location), ses réglages (anime)."""

    def __init__(self, nom, lot, origine):
        self.nom, self.lot = nom, lot
        self.origine = np.asarray(origine if origine is not None else (0.0, 0.0, 0.0), np.float64)
        self.location = tuple(float(x) for x in self.origine)
        self.extras = {}


class LotBoss(C.Lot):
    pieces = None  # où vont les objets du boss en cours (posé par mailles())

    def objet(self, nom, coll=None, angle=40, origine=None):
        p = Piece(nom, self, origine)
        LotBoss.pieces.append(p)
        return p


def anime(o, genre, **reglages):
    o.extras = dict(reglages, anim=genre)


B5 = types.SimpleNamespace(**vars(C.B))
B5.Lot = LotBoss
B5.anime = anime
_ESPACE = None


def espace():
    global _ESPACE
    if _ESPACE is None:
        ns = C.charger("barhaw_boss.py", {"_pointes_autour", "morghast", "voraxia", "krakor"})
        ns["B"] = B5
        _ESPACE = ns
    return _ESPACE


def mailles(id_, leger=False):
    """Les pièces du boss (Piece), chacune ramenée autour de son origine (sa maille cuite : lot.maille ; ce qui brille : lot.site)."""
    N.DETAIL = 0.6 if leger else 1.0
    LotBoss.pieces = []
    try:
        espace()[id_](None)
        pieces = LotBoss.pieces
    finally:
        N.DETAIL = 1.0
        LotBoss.pieces = None
    for p in pieces:
        for m in (p.lot.maille, p.lot.site):
            m.v = [np.asarray(a, np.float64) - p.origine for a in m.v]
    return pieces


def verifier(id_, leger=False):
    """Sans Blender : il se construit, rien de faux ; ses pièces, sa taille, ses matières."""
    pieces = mailles(id_, leger)
    erreurs = []
    pts = []
    for p in pieces:
        d = np.asarray(p.location) - p.origine  # le déplacement de la pièce (location − origine) ; la maille est autour de l'origine
        for m in (p.lot.maille, p.lot.site):
            if m.v:
                pts.append(np.concatenate(m.v) + p.origine + d)
    pts = np.concatenate(pts)
    if not np.isfinite(pts).all():
        erreurs.append("des points faux (NaN)")
    noms = [p.nom for p in pieces]
    if len(set(noms)) != len(noms):
        erreurs.append(f"des noms en double : {noms}")
    for p in pieces:
        if not (p.lot.maille.f or p.lot.site.f):
            erreurs.append(f"{p.nom} est vide")
    dim = pts.max(0) - pts.min(0)
    mats = sorted({x for p in pieces for m in (p.lot.maille, p.lot.site) for x in m.mats})
    return {"boss": id_, "erreurs": erreurs, "taille": [round(float(x), 2) for x in dim], "bas": round(float(pts[:, 2].min()), 2),
            "haut": round(float(pts[:, 2].max()), 2), "triangles": sum(m.triangles() for p in pieces for m in (p.lot.maille, p.lot.site)),
            "pieces": [(p.nom, bool(p.lot.maille.f), bool(p.lot.site.f), p.extras.get("anim")) for p in pieces], "matieres": mats}


def lumiere(id_):
    """Dans Blender : la lumière de la cuisson (et du rendu)."""
    import bpy
    N.soleil_et_ciel(soleil=SOLEIL, force=3.4, ciel=(0.42, 0.3, 0.68), force_ciel=0.55, taille=6.0)
    d = bpy.data.lights.new("n5_contre", "SUN")  # (« n5_ » : soleil_et_ciel l'enlève la fois suivante)
    d.energy = 2.6
    d.color = CONTRE[id_]
    d.angle = math.radians(8)
    o = bpy.data.objects.new("n5_contre", d)
    bpy.context.scene.collection.objects.link(o)
    v = np.asarray((0.0, 0.85, 0.52))
    v = v / np.linalg.norm(v)
    o.rotation_euler = (math.acos(v[2]), 0, math.atan2(v[0], -v[1]))


def clairs(alpha):
    """Dans Blender : le verre et la glace (que le site rend transparents) laissent passer la lumière pendant la cuisson et le
    rendu (sinon la cloche de VORAXIA garde son dôme dans le noir) ; alpha = 1 les remet comme avant."""
    import bpy
    for c in C.CLAIRS:
        m = bpy.data.materials.get(c + ".m5")
        if m is None or not m.use_nodes:
            continue
        for n in m.node_tree.nodes:
            if n.type == "BSDF_PRINCIPLED":
                n.inputs["Alpha"].default_value = alpha


def construire(id_, rendu=True, cuire=True, exporter=True, taille=2048, echantillons=48, leger=False):
    """Dans Blender : les objets du boss (mêmes noms, mêmes origines que barhaw_boss), la cuisson, un rendu, le .glb."""
    nom = f"{id_}-v5" + ("-leger" if leger else "")
    pieces = mailles(id_, leger)
    cuites = [p.lot.maille for p in pieces if p.lot.maille.f]
    infos = {"triangles": sum(m.triangles() for m in cuites), "finesse": [round(x, 2) for x in N.emballer(cuites, taille)]}
    coll = N.collection(f"boss_{id_}_v5" + ("_leger" if leger else ""))
    objets = []
    for p in pieces:
        extras = dict(p.extras) if p.extras else None
        principal = None
        if p.lot.maille.f:
            principal = N.objet(p.lot.maille, coll, p.nom, origine=p.location, extras=extras)
            objets.append(principal)
        if p.lot.site.f:
            if principal is None:  # tout brille (le cœur de Krakor) : c'est la pièce elle-même
                N.objet(p.lot.site, coll, p.nom, origine=p.location, extras=extras)
            else:
                o = N.objet(p.lot.site, coll, "lueur_" + p.nom)
                o.parent = principal  # sa maille est déjà autour de l'origine de la pièce : il reste à (0, 0, 0) chez elle
    lumiere(id_)
    clairs(0.25)
    try:
        if cuire:
            infos["atlas"] = N.cuire_ensemble(objets, os.path.join(N.dossier(), "glb", nom + ".png"), taille, echantillons, nom=f"boss_{id_}")
        lumiere(id_)
        if rendu:
            infos["rendu"] = N.rendre(nom, (13, -26, 11), (0, 0, 6.2), 50, taille=(1100, 1100), echantillons=64, collections=[coll.name], mer=False, fond=(0.09, 0.05, 0.15))
    finally:
        clairs(1.0)
    if exporter:
        infos["glb"] = N.exporter(coll.name, nom + ".glb")
    return infos
