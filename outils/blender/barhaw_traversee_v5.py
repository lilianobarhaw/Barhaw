# La Traversée, « niveau 5 » : les pièces du mini-jeu de GRAND LINE, les mêmes que barhaw_traversee_v4 (leur dessin,
# leurs noms, leurs pièces qui bougent : le site les sépare par le début du nom), mais chaque forme garde une carte
# d'atlas et chaque couleur devient une matière texturée du niveau 5, cuite avec la lumière du soir de la Traversée
# (barhaw_compat_v4). Tous inventés, aucun personnage existant.
#   aiguille, jumeaux, recif, tentacule, tourbillon, tonneau, bouteille, bourrasque (voir barhaw_traversee_v4)
# Le dessin de la V4 tourne tel quel, sauf ce qui parlait directement à Blender (bmesh) : poser() et surface() (les
# lancers de rayon sur un rocher) sont refaits ici avec numpy, le Tourbillon et les douves du tonneau aussi.
# Sortie : traversee-v5.glb (+ -leger) et son atlas.   Usage, dans Blender : import barhaw_traversee_v5 as TV; TV.construire()
import math, os, random, types
import numpy as np
import barhaw_niveau5 as N
import barhaw_compat_v4 as C

PI = math.pi
PIECES = ("aiguille", "jumeaux", "recif", "tentacule", "tourbillon", "tonneau", "bouteille", "bourrasque")
# La lumière de la cuisson : le soir de la Traversée (chaud, un ciel rose et violet). Le soleil est presque au-dessus,
# un rien du côté d'où arrive le navire (−X) : le jeu pose les rochers tournés au hasard, leur lumière ne doit pas
# dépendre de leur sens.
SOLEIL = (-0.3, -0.15, 0.94)
# pour la cuisson, chaque pièce est écartée des autres (elles sont toutes dessinées à l'origine)
ECART = 40.0
# le rendu d'essai : les pièces rangées comme dans la V4
VITRINE = {"tentacule": (-9, 9, 0), "aiguille": (-3, 3, 0), "jumeaux": (3, -3, 0), "recif": (9, -9, 0),
           "tourbillon": (-11, -3, 0), "tonneau": (-4.5, -9.5, 0.35), "bouteille": (-3.2, -10.6, 0.25), "bourrasque": (0.5, -14, 2.0)}


# ---------------------------------------------------------------------------------------------------------------------
# ce que la V4 demandait à bmesh : une forme placée (ses sommets, ses faces), et des lancers de rayon dessus
# ---------------------------------------------------------------------------------------------------------------------
class _Sommet:
    __slots__ = ("co", "index")

    def __init__(self, co, index):
        self.co, self.index = co, index


class _Sommets(list):
    def index_update(self):
        return None


class _Face:
    __slots__ = ("verts",)

    def __init__(self, verts):
        self.verts = verts


class Placee(C.Forme):
    """Une forme déjà à sa place (ce que poser() rend) ; pour la V4, elle se lit comme un bmesh : verts[i].co, faces[i].verts."""

    @property
    def verts(self):
        if not hasattr(self, "_sommets"):
            self._sommets = _Sommets(_Sommet(p, i) for i, p in enumerate(self.v))
        return self._sommets

    @property
    def faces(self):
        s = self.verts
        return [_Face([s[i] for i in q]) for q in self.f]

    def triangles(self):
        if not hasattr(self, "_tri"):
            V = np.asarray(self.v, np.float64)
            T = np.asarray([(q[0], q[k], q[k + 1]) for q in self.f for k in range(1, len(q) - 1)], int)
            self._tri = (V[T[:, 0]], V[T[:, 1]], V[T[:, 2]])
        return self._tri


def lancer(forme, origine, direction):
    """Là où la demi-droite (origine, direction) touche d'abord la forme, et la normale de la face, tournée vers
    l'origine (comme BVHTree.ray_cast pour une forme fermée) ; (None, None) si elle la manque."""
    A, B_, C_ = forme.triangles()
    o = np.asarray(origine, np.float64)
    d = np.asarray(direction, np.float64)
    e1, e2 = B_ - A, C_ - A
    p = np.cross(d, e2)
    det = (e1 * p).sum(1)
    ok = np.abs(det) > 1e-12
    inv = np.where(ok, 1.0 / np.where(ok, det, 1.0), 0.0)
    s = o - A
    u = (s * p).sum(1) * inv
    q = np.cross(s, e1)
    v = (q * d).sum(1) * inv
    t = (q * e2).sum(1) * inv
    touche = ok & (u >= 0) & (v >= 0) & (u + v <= 1) & (t > 1e-6)
    if not touche.any():
        return None, None
    i = int(np.argmin(np.where(touche, t, np.inf)))
    n = np.cross(e1[i], e2[i])
    n = n / (np.linalg.norm(n) or 1.0)
    if np.dot(n, d) > 0:
        n = -n
    return o + d * t[i], n


def poser(L, forme, mat, M):
    """(barhaw_traversee_v4.poser) ajoute la forme, et rend une copie placée (pour y poser des détails)."""
    L.ajouter(forme, mat, M)
    M = np.asarray(M, np.float64)
    return Placee(np.asarray(forme.v, np.float64) @ M[:3, :3].T + M[:3, 3], forme.f)


def surface(o_bm, direction, hauteur, rayon_max=6.0):
    """(barhaw_traversee_v4.surface) le point d'une forme placée dans une direction horizontale, à une hauteur."""
    d = np.array((direction[0], direction[1], 0.0))
    d = d / (np.linalg.norm(d) or 1.0)
    p, n = lancer(o_bm, d * rayon_max + np.array((0.0, 0.0, hauteur)), -d)
    if p is None:
        return C.Vec(d * 1.0 + np.array((0.0, 0.0, hauteur))), C.Vec(d)
    return C.Vec(p), C.Vec(n)


class Sol:
    """(barhaw_base.Sol) la hauteur d'un sol sous un point (x, y) : un lancer de rayon vers le bas."""

    def __init__(self, verts, faces):
        self.forme = Placee([tuple(float(c) for c in v) for v in verts], faces)

    def z(self, x, y, defaut=0.0):
        p, _ = lancer(self.forme, (x, y, 60.0), (0.0, 0.0, -1.0))
        return float(p[2]) if p is not None else defaut

    def normale(self, x, y):
        _, n = lancer(self.forme, (x, y, 60.0), (0.0, 0.0, -1.0))
        return C.Vec(n) if n is not None else C.Vec((0.0, 0.0, 1.0))


# ---------------------------------------------------------------------------------------------------------------------
# une pièce : son corps (immobile) et ses parties qui bougent (un bras peut pendre au bout d'un autre)
# ---------------------------------------------------------------------------------------------------------------------
class Piece:
    def __init__(self, nom):
        self.nom = nom
        self.L = C.Lot()
        self.parts = []

    def anim(self, part, lot, genre, origine=None, parent=None, **reglages):
        nom = f"{self.nom}_{part}"
        o = np.asarray(origine if origine is not None else (0.0, 0.0, 0.0), np.float64)
        self.parts.append(types.SimpleNamespace(nom=nom, lot=lot, origine=o, parent=parent, extras=dict(reglages, anim=genre)))
        return nom  # (la V4 rendait l'objet, pour le donner en parent au morceau suivant : ici, son nom)


B5 = types.SimpleNamespace(**vars(C.B))
B5.Sol = Sol


# ---------------------------------------------------------------------------------------------------------------------
# refaits ici : le Tourbillon (un bmesh fait à la main) et les douves du tonneau (une matière sur deux)
# ---------------------------------------------------------------------------------------------------------------------
def tourbillon(P):
    """(barhaw_traversee_v4.tourbillon) l'entonnoir, déroulé d'une seule pièce (vu de dessus) ; ses deux spirales."""
    ns = espace()
    B, Vector = C.B, C.Vec
    L = P.L
    R = 4.2
    anneaux, seg = N._cotes(14), N._cotes(48)
    v = []
    for i in range(anneaux + 1):
        r = R * (i / anneaux) ** 0.8
        z = -1.7 * math.exp(-(r / 1.7) ** 2) + 0.02
        for k in range(seg):
            a = 2 * PI * k / seg + i * 0.18
            v.append((math.cos(a) * r, math.sin(a) * r, z))
    f = N.Faces()
    f.deroule = []
    for i in range(anneaux):
        if i == 0:  # le fond : tous les sommets du premier rang sont au centre ; des triangles
            for k in range(seg):
                q = (k, seg + (k + 1) % seg, seg + k)
                f.append(q)
                f.deroule.append([(v[j][0], v[j][1]) for j in q])
            continue
        for k in range(seg):
            a, b = i * seg + k, i * seg + (k + 1) % seg
            q = (a, a + seg, b + seg, b)  # la face regarde en haut
            f.append(q)
            f.deroule.append([(v[j][0], v[j][1]) for j in q])
    L.ajouter(C.Forme(v, f), "ocean")
    ns["ecume"](L, R * 0.98, 22, 5, (0.3, 0.55))
    profond = lambda r: -1.7 * math.exp(-(r / 1.7) ** 2) + 0.07

    def spirale(lot, tours, decalage, larg, mat, n=60):
        for bras in range(3):
            pts, ls = [], []
            for j in range(n):
                t = j / (n - 1)
                r = R * 0.95 * (1 - t) + 0.25 * t
                a = bras * 2 * PI / 3 + decalage + t * tours * 2 * PI
                pts.append(Vector((math.cos(a) * r, math.sin(a) * r, profond(r) + 0.02)))
                ls.append(larg * (0.35 + 0.65 * math.sin(PI * min(1, t * 1.25))))
            lot.ajouter(B.ruban(pts, ls, haut=(0, 0, 1), pli=0.02), mat)
    A = B.Lot()
    spirale(A, 1.35, 0.0, 0.32, "blanc")
    P.anim("spirale", A, "tourne", axe=[0, 0, 1], vitesse=1.6)
    Cl = B.Lot()
    spirale(Cl, 1.1, 1.0, 0.18, "eau_douce")
    r = 2.6
    Cl.ajouter(B.boite(0.9, 0.22, 0.07), "planche", B.mat4((r, 0, profond(r) + 0.08), (0.1, 0.05, 0.9)))
    r2 = 1.9
    Cl.ajouter(B.tube([(-0.25, 0, 0), (0, 0, 0), (0.25, 0, 0)], [0.16, 0.2, 0.16], 10), "bois_clair", B.mat4((-r2 * 0.7, r2 * 0.7, profond(r2) + 0.15), (0.3, 0.2, 0.8)))
    P.anim("remous", Cl, "tourne", axe=[0, 0, 1], vitesse=1.0)


def tonneau(P):
    """(barhaw_traversee_v4.tonneau) couché, l'axe en Y ; des douves claires et foncées, une sur deux."""
    ns = espace()
    B = C.B
    T = B.Lot()
    prof = [(-0.55, 0.4), (-0.4, 0.47), (-0.2, 0.52), (0.0, 0.54), (0.2, 0.52), (0.4, 0.47), (0.55, 0.4)]
    douves = B.tube([(0, y, 0) for y, _ in prof], [r for _, r in prof], 16)
    V = np.asarray(douves.v, np.float64)
    claires, foncees = N.Faces(), N.Faces()
    claires.deroule, foncees.deroule = [], []
    der = getattr(douves.f, "deroule", None) or [None] * len(douves.f)
    for q, d in zip(douves.f, der):
        c = V[list(q)].mean(0)
        k = int(((math.atan2(c[2], c[0]) + PI) / (2 * PI)) * 16) % 2
        cible = foncees if k else claires
        cible.append(tuple(q))
        cible.deroule.append(d)
    T.ajouter(C.Forme(douves.v, claires), "bois_clair")
    T.ajouter(C.Forme(douves.v, foncees), "planche")
    for y, r in ((-0.42, 0.475), (-0.18, 0.53), (0.18, 0.53), (0.42, 0.475)):
        T.ajouter(B.tore(r + 0.015, 0.035, 22, 5), "fer", B.mat4((0, y, 0), (PI / 2, 0, 0)))
    for s in (-1, 1):
        T.ajouter(B.cyl(0.38, 0.38, 0.04, 16), "bois_fonce", B.mat4((0, s * 0.54, 0), (PI / 2, 0, 0)))
    T.ajouter(B.cyl(0.07, 0.06, 0.08, 8), "bois_fonce", B.mat4((0, 0, 0.52)))
    T.ajouter(B.cyl(0.05, 0.05, 0.1, 8), "bois_clair", B.mat4((0, 0, 0.56)))
    T.ajouter(B.tore(0.545, 0.03, 22, 4), "corde", B.mat4((0, 0.05, 0), (PI / 2, 0.15, 0)))
    T.ajouter(B.tube(B.courbe((0.5, 0.05, 0.1), (0.75, 0.3, -0.25), (0.8, 0.0, 0.1), 6), 0.025, 4), "corde")
    ns["algue"](T, (-0.3, -0.2, 0.42), 0.5, 3, "feuille", (-1, -0.2, -0.6))
    ns["algue"](T, (-0.2, 0.25, 0.46), 0.4, 5, "vert_fonce", (-1, 0.3, -0.7))
    T.ajouter(B.etoile(0.14, 0.06, 0.04, 5, 0.5), "orange", B.mat4((-0.25, -0.05, 0.46), (0.5, 0, 0.4)))
    P.anim("flotte", T, "flotte", ampl=0.08, phase=0.0)


REFAITS = {"tourbillon": tourbillon, "tonneau": tonneau}
_ESPACE = None


def espace():
    global _ESPACE
    if _ESPACE is None:
        ns = C.charger("barhaw_traversee_v4.py", {"ecume", "anatifes", "algue", "aiguille", "jumeaux", "recif", "tentacule", "bouteille", "bourrasque"})
        ns.update({"B": B5, "poser": poser, "surface": surface})
        _ESPACE = ns
    return _ESPACE


def mailles(leger=False):
    """Les pièces, chacune avec son corps (P.L) et ses parties (P.parts : maille ramenée autour de son origine)."""
    N.DETAIL = 0.6 if leger else 1.0
    try:
        ns = espace()
        pieces = []
        for nom in PIECES:
            P = Piece(nom)
            (REFAITS.get(nom) or ns[nom])(P)
            pieces.append(P)
    finally:
        N.DETAIL = 1.0
    for P in pieces:
        for a in P.parts:
            for m in (a.lot.maille, a.lot.site):
                m.v = [np.asarray(x, np.float64) - a.origine for x in m.v]
    return pieces


def verifier(leger=False):
    """Sans Blender : tout se construit, rien de faux ; par pièce, sa taille et ses parties."""
    pieces = mailles(leger)
    erreurs, infos = [], {}
    for P in pieces:
        pts = [np.concatenate(m.v) for m in (P.L.maille, P.L.site) if m.v]
        for a in P.parts:
            pts += [np.concatenate(m.v) + a.origine for m in (a.lot.maille, a.lot.site) if m.v]
        X = np.concatenate(pts)
        if not np.isfinite(X).all():
            erreurs.append(f"{P.nom} : des points faux")
        noms = [a.nom for a in P.parts]
        for a in P.parts:
            if a.parent and a.parent not in noms:
                erreurs.append(f"{a.nom} : parent inconnu {a.parent}")
        dim = X.max(0) - X.min(0)
        infos[P.nom] = {"taille": [round(float(x), 2) for x in dim], "bas": round(float(X[:, 2].min()), 2),
                        "triangles": sum(m.triangles() for m in [P.L.maille, P.L.site] + [x for a in P.parts for x in (a.lot.maille, a.lot.site)]),
                        "parties": [(a.nom, a.parent, a.extras.get("anim"), bool(a.lot.maille.f), bool(a.lot.site.f)) for a in P.parts]}
    mats = sorted({x for P in pieces for m in [P.L.maille, P.L.site] + [y for a in P.parts for y in (a.lot.maille, a.lot.site)] for x in m.mats})
    return {"erreurs": erreurs, "pieces": infos, "matieres": mats}


def construire(rendu=True, cuire=True, exporter=True, taille=2048, echantillons=48, leger=False):
    """Dans Blender : les objets (mêmes noms que la V4), la cuisson (chaque pièce écartée des autres), un rendu, le .glb."""
    import bpy
    from mathutils import Matrix, Vector
    nom = "traversee-v5" + ("-leger" if leger else "")
    pieces = mailles(leger)
    cuites = [m for P in pieces for m in [P.L.maille] + [a.lot.maille for a in P.parts] if m.f]
    infos = {"triangles": sum(m.triangles() for m in cuites), "finesse": [round(x, 2) for x in N.emballer(cuites, taille)]}
    coll = N.collection("traversee_v5" + ("_leger" if leger else ""))
    objets, racines = [], {}
    for P in pieces:
        r = racines[P.nom] = []
        if P.L.maille.f:
            o = N.objet(P.L.maille, coll, f"{P.nom}_corps", extras={"role": "decor"})
            objets.append(o)
            r.append(o)
        if P.L.site.f:
            r.append(N.objet(P.L.site, coll, f"{P.nom}_lumieres", extras={"role": "decor"}))
        faits = {}
        for a in P.parts:
            extras = dict(a.extras, role="anim")
            principal = None
            if a.lot.maille.f:
                principal = N.objet(a.lot.maille, coll, a.nom, origine=tuple(a.origine), extras=extras)
                objets.append(principal)
            if a.lot.site.f:
                if principal is None:  # tout brille ou tout est transparent : c'est la partie elle-même
                    principal = N.objet(a.lot.site, coll, a.nom, origine=tuple(a.origine), extras=extras)
                else:  # ce que le site rend lui-même : un enfant (il bouge avec elle)
                    N.objet(a.lot.site, coll, a.nom + "_lueur").parent = principal
            if a.parent:  # au bout du morceau d'avant (le bras du monstre) : il garde sa place
                p = faits[a.parent]
                principal.parent = p
                principal.matrix_parent_inverse = Matrix.Translation(Vector(p.location)).inverted()
            else:
                r.append(principal)
            faits[a.nom] = principal

    def deplacer(decalages):
        for k, P in enumerate(pieces):
            d = Vector(decalages(k, P.nom))
            for o in racines[P.nom]:
                o.location = o.location + d
        bpy.context.view_layer.update()

    N.soleil_et_ciel(soleil=SOLEIL, force=3.6, chaud=(1.0, 0.84, 0.7), ciel=(0.78, 0.62, 0.86), force_ciel=0.9, taille=8.0)
    if cuire:
        deplacer(lambda k, n: (k * ECART, 300.0, 0.0))
        try:
            infos["atlas"] = N.cuire_ensemble(objets, os.path.join(N.dossier(), "glb", nom + ".png"), taille, echantillons, nom="traversee")
        finally:
            deplacer(lambda k, n: (-k * ECART, -300.0, 0.0))
    if rendu:
        N.soleil_et_ciel(soleil=SOLEIL, force=3.6, chaud=(1.0, 0.84, 0.7), ciel=(0.78, 0.62, 0.86), force_ciel=0.9, taille=8.0)
        deplacer(lambda k, n: VITRINE[n])
        try:
            infos["rendu"] = N.rendre(nom, (-24, -24, 12), (-2, -2, 1.0), 38, taille=(1600, 1000), echantillons=64, collections=[coll.name])
        finally:
            deplacer(lambda k, n: tuple(-x for x in VITRINE[n]))
    if exporter:
        infos["glb"] = N.exporter(coll.name, nom + ".glb")
    return infos
