# Pour refaire au « niveau 5 » ce qui a été dessiné pour la V4 (barhaw_maitres_v4, barhaw_iles_v4b…) sans le redessiner
# à la main : les mêmes fonctions de dessin tournent ici, sans Blender, mais leurs formes partent dans des mailles du niveau 5
# (barhaw_niveau5 : chaque forme garde son « déroulé », pour une carte d'atlas par forme) et leurs couleurs deviennent des
# matières du niveau 5 (une texture de la couleur de la palette de la V4, cuite avec la lumière dans l'atlas).
#   B   : les formes de barhaw_base (cyl, boite, sphere, ico, demi_sphere, tore, tube, courbe, ruban, etoile, caillou,
#         prisme, deformer, mat4, Lot), mêmes signatures, même placement (posées sur z = 0 comme dans la V4).
#   Vec : ce qu'il faut de mathutils.Vector (+, -, *, /, cross, dot, length, normalized, to_track_quat…).
#   charger(fichier, noms) : les fonctions d'un module de la V4, prêtes à tourner avec B et Vec.
import ast, math, os, random, sys, types
import numpy as np
import barhaw_niveau5 as N

PI = math.pi
ICI = os.path.dirname(os.path.abspath(__file__))


# ---------------------------------------------------------------------------------------------------------------------
# les vecteurs (ce que les dessins de la V4 utilisent de mathutils)
# ---------------------------------------------------------------------------------------------------------------------
class Vec:
    __slots__ = ("a",)

    def __init__(self, p=(0.0, 0.0, 0.0)):
        self.a = np.array([float(x) for x in (p.a if isinstance(p, Vec) else p)], np.float64)

    x = property(lambda s: float(s.a[0]), lambda s, v: s.a.__setitem__(0, v))
    y = property(lambda s: float(s.a[1]), lambda s, v: s.a.__setitem__(1, v))
    z = property(lambda s: float(s.a[2]), lambda s, v: s.a.__setitem__(2, v))

    def __iter__(self):
        return iter(float(x) for x in self.a)

    def __len__(self):
        return len(self.a)

    def __getitem__(self, i):
        return float(self.a[i])

    def __setitem__(self, i, v):
        self.a[i] = v

    def __add__(self, o):
        return Vec(self.a + _np(o))

    __radd__ = __add__

    def __sub__(self, o):
        return Vec(self.a - _np(o))

    def __rsub__(self, o):
        return Vec(_np(o) - self.a)

    def __mul__(self, k):
        if isinstance(k, Vec):
            return float(self.a @ k.a)
        return Vec(self.a * float(k))

    __rmul__ = __mul__

    def __truediv__(self, k):
        return Vec(self.a / float(k))

    def __neg__(self):
        return Vec(-self.a)

    def __repr__(self):
        return f"Vec({self.x:.3f}, {self.y:.3f}, {self.z:.3f})"

    @property
    def length(self):
        return float(np.linalg.norm(self.a))

    def normalized(self):
        n = np.linalg.norm(self.a)
        return Vec(self.a / n if n > 1e-12 else self.a)

    def normalize(self):
        n = np.linalg.norm(self.a)
        if n > 1e-12:
            self.a = self.a / n

    def cross(self, o):
        return Vec(np.cross(self.a, _np(o)))

    def dot(self, o):
        return float(self.a @ _np(o))

    def copy(self):
        return Vec(self.a)

    def lerp(self, o, t):
        return Vec(self.a + (_np(o) - self.a) * t)

    def to_track_quat(self, track="Z", up="Y"):
        """Comme mathutils : la rotation qui pointe l'axe `track` le long du vecteur, l'axe `up` vers le haut du monde."""
        axes = {"X": 0, "Y": 1, "Z": 2}
        t, u = axes[track.lstrip("-")], axes[up]
        d = self.a / (np.linalg.norm(self.a) or 1.0)
        if track.startswith("-"):
            d = -d
        haut = np.array((0.0, 0.0, 1.0))
        w = haut - d * (haut @ d)
        if np.linalg.norm(w) < 1e-6:
            w = np.array((0.0, 1.0, 0.0)) - d * d[1]
        w /= np.linalg.norm(w)
        m = np.zeros((3, 3))
        m[:, t], m[:, u] = d, w
        k = 3 - t - u
        a1, a2 = (k + 1) % 3, (k + 2) % 3  # l'axe qui reste : son produit vectoriel, dans le bon sens (repère direct)
        m[:, k] = np.cross(m[:, a1], m[:, a2])
        return Rot(m)


class Rot:
    """Une rotation (ce que rendent to_track_quat() puis to_euler()) : mat4 la prend comme une rotation d'Euler."""

    def __init__(self, m):
        self.m = np.asarray(m, np.float64)

    def to_euler(self):
        return self


def _np(o):
    return o.a if isinstance(o, Vec) else np.asarray([float(x) for x in o], np.float64)


# ---------------------------------------------------------------------------------------------------------------------
# les formes (mêmes signatures et même placement que barhaw_base)
# ---------------------------------------------------------------------------------------------------------------------
class Forme:
    """Des sommets et des faces (les faces de N gardent leur déroulé)."""

    def __init__(self, v, f):
        self.v = [tuple(float(x) for x in p) for p in v]
        self.f = f


def _rot(r):
    if isinstance(r, Rot):
        return r.m
    a, b, c = (float(x) for x in r)
    return (N.Rz(c) @ N.Ry(b) @ N.Rx(a))[:3, :3]


def mat4(loc=(0, 0, 0), rot=(0, 0, 0), ech=1.0):
    if isinstance(ech, (int, float)):
        ech = (ech, ech, ech)
    M = np.eye(4)
    M[:3, :3] = _rot(rot) @ np.diag([float(x) for x in ech])
    M[:3, 3] = _np(loc)
    return M


def cyl(r1, r2, h, seg=12, caps=True):
    return Forme(*N.cylindre(r1, r2, h, seg, haut=caps, bas=caps))


def boite(x, y, z):
    return Forme(*N.boite(x, y, z, bas=True, haut=True))


def sphere(r, seg=16, anneaux=10):
    return Forme(*N.sphere(r, seg, anneaux))


def ico(r, sub=2):
    return Forme(*N.sphere(r, 6 + 4 * sub, 4 + 2 * sub))


def demi_sphere(r, seg=16, anneaux=6, bas=False):
    """Le dôme (le dessus d'une sphère), fermé dessous."""
    v, f = N.sphere(r, seg, anneaux * 2)
    garde = [i for i, p in enumerate(v) if p[2] >= -1e-6]
    ix = {i: k for k, i in enumerate(garde)}
    faces = N.Faces(tuple(ix[i] for i in q) for q in f if all(i in ix for i in q))
    if getattr(f, "deroule", None) is not None:
        faces.deroule = [d for q, d in zip(f, f.deroule) if all(i in ix for i in q)]
    w = [v[i] for i in garde]
    anneau = sorted((i for i, p in enumerate(w) if abs(p[2]) < 1e-6), key=lambda i: math.atan2(w[i][1], w[i][0]))
    if len(anneau) >= 3:
        faces.append(tuple(reversed(anneau)))
        if faces.deroule is not None:
            faces.deroule.append(None)
    return Forme(w, faces)


def tore(R, r, seg=24, segr=8):
    pts = [(R * math.cos(t), R * math.sin(t), 0.0) for t in np.linspace(0, 2 * PI, seg + 1)]
    return Forme(*N.tube(pts, r, segr, bouts=False))


def tube(points, rayons, seg=8, caps=True):
    return Forme(*N.tube([tuple(_np(p)) for p in points], rayons, seg, bouts=caps))


def courbe(a, b, c, n=8):
    a, b, c = Vec(a), Vec(b), Vec(c)
    return [a * (1 - t) ** 2 + c * 2 * t * (1 - t) + b * t * t for t in [i / (n - 1) for i in range(n)]]


def ruban(points, largeurs, haut=(0, 0, 1), pli=0.18):
    """Une feuille en V (une nervure au milieu). Les deux faces : l'envers un rien décalé du côté opposé à l'endroit
    (sinon elles se regardent et la cuisson les voit noires)."""
    pts = [_np(p) for p in points]
    n = len(pts)
    if isinstance(largeurs, (int, float)):
        largeurs = [largeurs] * n
    up = _np(haut)
    up = up / (np.linalg.norm(up) or 1.0)
    v, f = [], []
    for i, p in enumerate(pts):
        t = pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]
        t = t / (np.linalg.norm(t) or 1.0)
        s = np.cross(t, up)
        if np.linalg.norm(s) < 1e-4:
            s = np.array((1.0, 0, 0))
        s = s / np.linalg.norm(s)
        w = largeurs[i]
        v += [p - s * w - up * pli * w, p + up * pli * w * 0.3, p + s * w - up * pli * w]
    for i in range(n - 1):
        for k in range(2):
            a = i * 3 + k
            f.append((a, a + 1, a + 4, a + 3))
    m = len(v)
    v += [q - up * 0.012 for q in v]
    f += [tuple(m + j for j in reversed(q)) for q in f]
    return Forme(v, f)


def etoile(r1, r2, ep, branches=5, bombe=0.6, depart=PI / 2):
    pts = []
    for k in range(branches * 2):
        a = depart + k * PI / branches
        r = r1 if k % 2 == 0 else r2
        pts.append((math.cos(a) * r, math.sin(a) * r))
    m = len(pts)
    v = [(x, y, ep / 2) for x, y in pts] + [(x, y, -ep / 2) for x, y in pts] + [(0, 0, ep / 2 + bombe * r2), (0, 0, -ep / 2 - bombe * r2 * 0.4)]
    c1, c2 = 2 * m, 2 * m + 1
    f = []
    for k in range(m):
        k2 = (k + 1) % m
        f += [(k, k2, c1), (m + k2, m + k, c2), (k2, k, m + k, m + k2)]
    return Forme(v, f)


def _bruit(p, graine):
    """Un bruit doux (une somme d'ondes, toujours la même pour une graine) : pour cabosser les rochers."""
    rnd = random.Random(graine * 7919 + 17)
    s = 0.0
    for o in range(3):
        f = 1.0 * 2 ** o
        for _ in range(3):
            d = np.array([rnd.uniform(-1, 1) for _ in range(3)])
            d /= np.linalg.norm(d) or 1.0
            s += math.sin(float(p @ d) * f * 2.1 + rnd.uniform(0, 2 * PI)) * 0.5 ** o / 3
    return s


def caillou(r, graine=0, rugosite=0.35, sub=2, ech=(1, 1, 1)):
    v, f = N.sphere(r, 8 + 4 * sub, 5 + 3 * sub)
    w = []
    for p in v:
        q = np.asarray(p, np.float64)
        d = _bruit(q * (1.6 / max(r, 0.01)), graine)
        q = q * (1 + d * rugosite)
        w.append((q[0] * ech[0], q[1] * ech[1], q[2] * ech[2]))
    return Forme(w, f)


def prisme(w, d, h):
    v = [(-w / 2, -d / 2, 0), (w / 2, -d / 2, 0), (w / 2, d / 2, 0), (-w / 2, d / 2, 0), (-w / 2, 0, h), (w / 2, 0, h)]
    return Forme(v, [(0, 1, 5, 4), (2, 3, 4, 5), (0, 4, 3), (1, 2, 5), (0, 3, 2, 1)])


def deformer(forme, fn):
    forme.v = [tuple(Vec(fn(Vec(p)))) for p in forme.v]


def rgb(h):
    return ((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255


# ---------------------------------------------------------------------------------------------------------------------
# les couleurs de la V4 → des matières du niveau 5
# ---------------------------------------------------------------------------------------------------------------------
def _palette():
    src = open(os.path.join(ICI, "barhaw_base.py"), encoding="utf-8").read()
    i = src.index("PALETTE = {")
    j = src.index("\n}\n", i)
    return ast.literal_eval(src[i + len("PALETTE = "):j + 2])


PALETTE = _palette()
LUMINEUX = ("lumiere", "luciole", "lave", "feu", "spectre")  # elles brillent : le site les allume (matières du site)
METAL = ("or", "fer", "cuivre", "laiton")
LISSE = ("cristal", "glace", "verre", "eau_douce", "eau", "neige", "blanc", "noir", "gris")  # gris : brume, nuage, moustache (pas de la pierre)

# Recharger ce module (importlib.reload, dans Blender) refait ses matières « v4_… » : sinon N garderait celles d'avant, et
# leurs images, même si leurs réglages ont changé ici.
for _m in [k for k in N.MATIERES if k.startswith("v4_")]:
    N.MATIERES.pop(_m)
    if N.bpy is not None:  # hors de Blender : pas d'image à oublier
        N.oublier(_m)


def _sombre(c, k=0.72):
    r, g, b = (c >> 16) & 255, (c >> 8) & 255, c & 255
    return (int(r * k) << 16) | (int(g * k) << 8) | int(b * k)


def matiere(nom):
    """Le nom de la matière du niveau 5 pour une couleur de la V4 (créée la première fois)."""
    if nom in LUMINEUX or nom in N.SITE and nom not in ("rose", "violet", "voile", "voile_b"):
        return nom
    m = "v4_" + nom
    if m not in N.MATIERES:
        c = PALETTE.get(nom, 0xff00ff)
        g = sum(ord(x) for x in nom) * 13 + 1700
        if nom in METAL:
            N.matiere(m, N.tx_uni, 0.5, 0.3, rugueux=0.4, metal=0.5, c=c, graine=g, grain=0.2, taches=0.3, c2=_sombre(c), seuil=0.6)
        elif nom in LISSE:
            N.matiere(m, N.tx_uni, 0.6, 0.15, rugueux=0.35, c=c, graine=g, grain=0.1, taches=0.2, c2=_sombre(c, 0.86), seuil=0.65,
                      **({"lueur": 0.25} if nom in ("cristal", "glace", "verre") else {}))
        else:
            N.matiere(m, N.tx_uni, 0.9, 0.45, c=c, graine=g, grain=0.28, taches=0.42, c2=_sombre(c), seuil=0.58)
    return m


# ---------------------------------------------------------------------------------------------------------------------
# le lot (une maille du niveau 5) et le modèle (le corps, les pièces qui bougent, les repères)
# ---------------------------------------------------------------------------------------------------------------------
CLAIRS = ("cristal", "glace", "verre", "eau", "eau_douce")  # le site les rend transparentes et brillantes : on ne les cuit pas
# Leur matière Blender s'appelle « cristal.m5 »… : une simple couleur (comme les matières du site), qui ne se mêle pas aux
# matières texturées « cristal » ou « glace » des îles ; le site ne lit que ce qui précède le point (« cristal »).
for _c in CLAIRS:
    N.COULEURS_SITE.setdefault(_c + ".m5", rgb(PALETTE.get(_c, 0xcccccc)))
NON_CUITES = set(N.SITE) | {c + ".m5" for c in CLAIRS}


def cuite(m):
    """Une maille à cuire (sinon toutes ses matières sont rendues par le site : lumières, verre, cristal…)."""
    return not (bool(m.mats) and all(x in NON_CUITES for x in m.mats))


class Lot:
    """Deux mailles : ce qui se cuit, et ce que le site rend lui-même (les lumières qui s'allument la nuit, le cristal, la
    glace, l'eau, transparents) ; une pièce qui bouge garde les deux ensemble (deux objets, la même animation)."""

    def __init__(self, maille=None, site=None):
        self.maille = maille if maille is not None else N.Maille("lot")
        self.site = site if site is not None else N.Maille("lot_site")

    def _cible(self, mat):
        m = matiere(mat)
        if mat in CLAIRS:
            return self.site, mat + ".m5"
        return (self.site, m) if m in N.SITE else (self.maille, m)

    def ajouter(self, forme, mat, M=None, lisse=True, couche_mat=None):
        cible, m = self._cible(mat)
        cible.ajouter(forme.v, forme.f, m, M)
        return self

    def faces(self, verts, faces, mat, lisse=True, uvs=None):
        cible, m = self._cible(mat)
        cible.ajouter([tuple(_np(p)) for p in verts], [tuple(q) for q in faces], m)
        return self

    def vide(self):
        return not self.maille.f


class Modele:
    """Comme le Modele de la V4 : M.L (le corps), M.anim(nom, lot, genre, origine, …), M.repere(nom, genre, pos, …)."""

    def __init__(self, id_, sorte):
        self.id, self.K = id_, sorte
        self.L = Lot(sorte.corps, sorte.lumieres)
        self.lumieres = []  # (la V4 y posait ses lumières de patine ; ici, la cuisson les trouve dans les matières du site)
        self.reperes = []
        self.coll = None

    def anim(self, nom, lot, genre, origine=None, **reglages):
        o = tuple(_np(origine)) if origine is not None else (0.0, 0.0, 0.0)
        if lot.maille.f:
            self.K.anims.append((lot.maille, nom, o, dict(reglages, anim=genre)))
        if lot.site.f:  # sa part rendue par le site : un second objet, qui bouge avec elle
            self.K.anims.append((lot.site, nom + "_lueur", o, dict(reglages, anim=genre)))
        return lot

    def repere(self, nom, genre, pos, **reglages):
        self.reperes.append((nom, tuple(_np(pos)), dict(reglages, anim=genre)))

    def finir(self):
        return None


B = types.SimpleNamespace(cyl=cyl, boite=boite, sphere=sphere, ico=ico, demi_sphere=demi_sphere, tore=tore, tube=tube, courbe=courbe,
                          ruban=ruban, etoile=etoile, caillou=caillou, prisme=prisme, deformer=deformer, mat4=mat4, rgb=rgb, Lot=Lot,
                          PALETTE=PALETTE)


def charger(fichier, noms=None, espace=None):
    """Les fonctions (def) d'un module de la V4, exécutées avec B, Vec, math et random à la place de Blender."""
    src = open(os.path.join(ICI, fichier), encoding="utf-8").read()
    arbre = ast.parse(src)
    garde = [n for n in arbre.body if isinstance(n, ast.FunctionDef) and (noms is None or n.name in noms)]
    module = ast.Module(body=garde, type_ignores=[])
    ns = espace if espace is not None else {}
    ns.update({"B": B, "Vector": Vec, "math": math, "random": random, "PI": PI})
    exec(compile(module, fichier, "exec"), ns)
    return ns


def espace_maitres():
    """Les dessins des maîtres de la V4 (et ce qu'ils empruntent à barhaw_iles_v4b), prêts à tourner ici."""
    il2 = charger("barhaw_iles_v4b.py", {"cristal", "arbre_rond", "engrenage"})
    sys.modules["barhaw_iles_v4b"] = types.SimpleNamespace(cristal=il2["cristal"], arbre_rond=il2["arbre_rond"], engrenage=il2["engrenage"])
    ns = charger("barhaw_maitres_v4.py")
    ns["MAITRES"] = {"phare": ns["mere_brume"], "marais": ns["roi_crapaud"], "cristal": ns["mante_prisme"], "archipel": ns["nimbus"],
                     "cimetiere": ns["calcaire"], "horloge": ns["grand_remontoir"], "geants": ns["ronchon"], "forteresse": ns["amiral_boulet"]}
    ns["DETAILS"] = {"phare": ns["plus_phare"], "marais": ns["plus_marais"], "cristal": ns["plus_cristal"], "archipel": ns["plus_archipel"],
                     "cimetiere": ns["plus_cimetiere"], "horloge": ns["plus_horloge"], "geants": ns["plus_geants"], "forteresse": ns["plus_forteresse"]}
    return ns
