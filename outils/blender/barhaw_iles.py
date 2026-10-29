# Les quinze îles de la Grand Line de Barhaw (toutes inventées) : un relief sculpté + des décors par thème.
# Chaque île est une collection « ile_<id> », centrée sur l'origine, qui s'exporte en « ile-<id>.glb ».
# Les objets portent un rôle (propriété « role », exportée dans les extras du glTF) :
#   terrain (le relief, couleurs aux sommets), decor (tout ce qui ne bouge pas),
#   anim (un objet qui bouge : propriété « anim »), repere (un point vide où le site ajoute un effet).
import math, random, bmesh, bpy
from mathutils import Vector, noise
import barhaw_base as B

# la place des îles sur la carte du site (GL_PLACES dans site.js : x, z) et leur thème
ILES = {
    "port": (-86, 30, "port"), "moussaillons": (-72, 6, "plage"), "recif": (-58, -26, "recif"),
    "braise": (-36, -38, "volcan"), "givre": (-42, 4, "glace"), "lucioles": (-20, -16, "lucioles"),
    "champignons": (-6, 20, "champignons"), "engloutie": (10, -10, "ruines"), "vents": (12, 38, "moulins"),
    "marche": (28, 12, "marche"), "arbre": (44, -22, "arbre"), "ambre": (48, 32, "dunes"),
    "phare": (64, 2, "phare"), "tonnerre": (76, -28, "orage"), "tresor": (86, 12, "tresor"),
}


# ---------- outils ----------
def fbm(x, y, freq=0.25, octaves=4, graine=0):
    s, a, f = 0.0, 0.5, freq
    for k in range(octaves):
        s += a * noise.noise(Vector((x * f + graine * 13.17, y * f - graine * 7.31, graine * 3.7 + k * 19.3)))
        f *= 2.0
        a *= 0.5
    return s


def lisse(p):
    p = max(0.0, min(1.0, p))
    return p * p * (3 - 2 * p)


def mel(a, b, k):
    if isinstance(a, int):
        a = B.rgb(a)
    if isinstance(b, int):
        b = B.rgb(b)
    k = max(0.0, min(1.0, k))
    return tuple(a[i] + (b[i] - a[i]) * k for i in range(3))


def lin(c):
    if isinstance(c, int):
        c = B.rgb(c)
    return (B.lineaire(c[0]), B.lineaire(c[1]), B.lineaire(c[2]), 1.0)


def bosse(x, y, cx, cy, h, l):
    return h * math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / l)


class Relief:
    """Une île : un disque en relief au contour irrégulier (plage, puis fond sous l'eau)."""

    def __init__(self, r, graine, plage=0.82, anneaux=30, secteurs=88, ext=1.16):
        rnd = random.Random(graine)
        self.r, self.graine, self.plage = r, graine, plage
        self.anneaux, self.secteurs, self.ext = anneaux, secteurs, ext
        self.harm = [(rnd.uniform(0, 6.283), rnd.uniform(0.025, 0.075), rnd.randint(2, 7)) for _ in range(5)]
        self.decalage = (0.0, 0.0)

    def bord(self, a):
        return self.r * (1 + sum(amp * math.sin(a * f + ph) for ph, amp, f in self.harm))

    def t_de(self, x, y):
        x -= self.decalage[0]
        y -= self.decalage[1]
        return math.hypot(x, y) / self.bord(math.atan2(y, x))

    def terre(self, x, y, marge=0.0):
        return self.t_de(x, y) < self.plage - marge

    def cote(self, t):
        if t > 0.93:
            return -0.3 - (t - 0.93) * 9
        if t > self.plage:
            k = (t - self.plage) / (0.93 - self.plage)
            return 0.3 * (1 - k) - 0.3 * k
        return None

    def rampe(self, t, raideur=2.5):
        return lisse((1 - t / self.plage) * raideur)

    def point(self, rnd, tmin=0.0, tmax=0.7, eviter=(), essais=80):
        for _ in range(essais):
            a = rnd.uniform(0, 2 * math.pi)
            t = math.sqrt(rnd.uniform(tmin * tmin, tmax * tmax))
            x = math.cos(a) * self.bord(a) * t + self.decalage[0]
            y = math.sin(a) * self.bord(a) * t + self.decalage[1]
            if all(math.hypot(x - ex, y - ey) > er for ex, ey, er in eviter):
                return x, y
        return None

    def construire(self, nom, coll, hauteur, couleur, decalage=(0.0, 0.0)):
        self.decalage = decalage
        A, S = self.anneaux, self.secteurs
        dx, dy = decalage
        verts = [(dx, dy, hauteur(dx, dy, 0.0))]
        for i in range(1, A + 1):
            t = self.ext * (1 - (1 - i / A) ** 1.35)
            for j in range(S):
                a = 2 * math.pi * j / S
                rr = self.bord(a) * t
                x, y = math.cos(a) * rr + dx, math.sin(a) * rr + dy
                z = self.cote(t)
                if z is None:
                    z = hauteur(x, y, t)
                verts.append((x, y, z))
        faces = []

        def v(i, j):
            return 0 if i == 0 else 1 + (i - 1) * S + (j % S)
        for j in range(S):
            faces.append([0, v(1, j), v(1, j + 1)])
        for i in range(1, A):
            for j in range(S):
                faces.append([v(i, j), v(i + 1, j), v(i + 1, j + 1), v(i, j + 1)])
        bm = bmesh.new()
        bv = [bm.verts.new(p) for p in verts]
        for f in faces:
            bm.faces.new([bv[k] for k in f])
        bm.normal_update()
        couleurs = []
        for k, (x, y, z) in enumerate(verts):
            t = self.t_de(x, y) if k else 0.0
            couleurs.append(lin(couleur(x, y, z, t, bv[k].normal.copy())))
        bm.free()
        L = B.Lot()
        L.faces(verts, faces, "terrain", True)
        L.couleurs = couleurs
        o = L.objet(nom, coll, angle=180)
        o["role"] = "terrain"
        return o, verts, faces


class Sol:
    def __init__(self):
        self.parts = []

    def ajouter(self, verts, faces):
        self.parts.append(B.Sol(verts, faces))

    def z(self, x, y, defaut=0.0):
        meilleur = None
        for s in self.parts:
            hit = s.bvh.ray_cast(Vector((x, y, 80)), Vector((0, 0, -1)))
            if hit[0] is not None and (meilleur is None or hit[0].z > meilleur):
                meilleur = hit[0].z
        return defaut if meilleur is None else meilleur


def peindre(sable, herbe, sommet, roche, h, plage_z=0.42, var=0.35, graine=0, raide=0.8):
    def c(x, y, z, t, n):
        if z < 0.02:
            return mel(sable, 0x7cc7cf, min(1.0, -z / 0.9))
        if z < plage_z:
            return B.rgb(sable)
        k = min(1.0, (z - plage_z) / max(0.1, h - plage_z))
        col = mel(herbe, sommet, k)
        v = fbm(x, y, 0.45, 2, graine + 3)
        col = mel(col, sommet if v > 0 else herbe, abs(v) * var * 2)
        if z < plage_z + 0.15:
            col = mel(sable, col, (z - plage_z) / 0.15)
        if n.z < raide:
            col = mel(col, roche, min(1.0, (raide - n.z) / 0.25))
        return col
    return c


class Deco:
    """Les décors d'une île : un lot pour ce qui ne bouge pas, et des objets animés à part."""

    def __init__(self, id_, coll, sol, R=None):
        self.id, self.coll, self.sol, self.R = id_, coll, sol, R
        self.L = B.Lot()

    def z(self, x, y, enfonce=0.05):
        return self.sol.z(x, y) - enfonce

    def anim(self, nom, lot, genre, origine=None, **reglages):
        o = lot.objet(f"{self.id}_{nom}", self.coll, angle=40, origine=origine)
        o["role"] = "anim"
        B.anime(o, genre, **reglages)
        return o

    def repere(self, nom, genre, pos, **reglages):
        e = bpy.data.objects.new(f"{self.id}_{nom}", None)
        self.coll.objects.link(e)
        e.location = Vector(pos)
        e.empty_display_size = 0.6
        e["role"] = "repere"
        B.anime(e, genre, **reglages)
        return e

    def finir(self):
        o = self.L.objet(f"{self.id}_decor", self.coll, angle=40)
        o["role"] = "decor"
        return o


# ---------- les petits décors ----------
def palmier(D, x, y, h=3.2, graine=0, L=None):
    L = L or D.L
    rnd = random.Random(graine)
    base = Vector((x, y, D.z(x, y, 0.15)))
    a = rnd.uniform(0, 6.283)
    pench = Vector((math.cos(a), math.sin(a), 0)) * h * rnd.uniform(0.15, 0.32)
    haut = base + Vector((0, 0, h)) + pench
    pts = B.courbe(base, haut, base + Vector((0, 0, h * 0.55)) + pench * 0.1, 12)
    L.ajouter(B.tube(pts, [(0.2 - 0.085 * i / 11) * (1.13 if i % 2 else 1.0) for i in range(12)], 7), "planche")
    for k in range(7):
        b = a + k * 2 * math.pi / 7 + rnd.uniform(-0.2, 0.2)
        d = Vector((math.cos(b), math.sin(b), 0))
        lg = rnd.uniform(1.6, 2.2)
        f = B.courbe(haut, haut + d * lg + Vector((0, 0, -0.95)), haut + d * lg * 0.55 + Vector((0, 0, 0.75)), 7)
        L.ajouter(B.ruban(f, [0.04, 0.24, 0.32, 0.3, 0.22, 0.12, 0.02], pli=0.25), "feuille")
    for k in range(3):
        b = a + k * 2.1
        L.ajouter(B.sphere(0.14, 8, 6), "bois_fonce", B.mat4(haut + Vector((math.cos(b) * 0.2, math.sin(b) * 0.2, -0.16))))


def arbre(D, x, y, h=2.0, r=1.0, mats=("vert", "vert_clair"), graine=0, L=None, penche=(0.0, 0.0)):
    L = L or D.L
    rnd = random.Random(graine)
    base = Vector((x, y, D.z(x, y, 0.1)))
    tete = base + Vector((penche[0] + rnd.uniform(-0.15, 0.15), penche[1] + rnd.uniform(-0.15, 0.15), h))
    L.ajouter(B.tube(B.courbe(base, tete, base + Vector((0, 0, h * 0.6)), 5), [0.2, 0.17, 0.15, 0.13, 0.11], 7), "bois")
    for k in range(3):
        c = tete + Vector((rnd.uniform(-0.45, 0.45) * r, rnd.uniform(-0.45, 0.45) * r, rnd.uniform(0.0, 0.5) * r))
        L.ajouter(B.caillou(r * rnd.uniform(0.62, 0.85), graine * 3 + k, 0.16, 2), mats[k % len(mats)], B.mat4(c))


def sapin(D, x, y, h=2.6, neige=False, L=None):
    L = L or D.L
    base = Vector((x, y, D.z(x, y, 0.1)))
    L.ajouter(B.cyl(0.14, 0.1, h * 0.3, 6), "bois", B.mat4(base))
    for k in range(3):
        z = h * (0.22 + k * 0.22)
        r = h * (0.36 - k * 0.09)
        L.ajouter(B.cyl(r, 0.0, h * 0.42, 9), "vert_fonce", B.mat4(base + Vector((0, 0, z))))
        if neige:
            L.ajouter(B.cyl(r * 0.56, 0.0, h * 0.24, 9), "neige", B.mat4(base + Vector((0, 0, z + h * 0.19))))


def rocher(D, x, y, r, mat="pierre", graine=0, ech=(1, 1, 0.8), enfonce=0.35, rug=0.3, L=None):
    L = L or D.L
    L.ajouter(B.caillou(r, graine, rug, 2, ech), mat, B.mat4((x, y, D.z(x, y, 0) - enfonce * r * ech[2]), (0, 0, graine * 0.7)))


def rochers_cote(D, R, n, graine, mats=("pierre", "pierre_fonce"), rmin=0.25, rmax=0.65, tmin=0.88, tmax=1.02):
    rnd = random.Random(graine)
    for k in range(n):
        p = R.point(rnd, tmin, tmax)
        if p:
            rocher(D, p[0], p[1], rnd.uniform(rmin, rmax), mats[k % len(mats)], graine + k, (1, 1, rnd.uniform(0.6, 1.0)))


def fleurs(D, R, n, graine, couleurs=("rose", "jaune", "blanc", "violet"), tmax=0.7, eviter=()):
    rnd = random.Random(graine)
    for k in range(n):
        p = R.point(rnd, 0.05, tmax, eviter)
        if not p:
            continue
        x, y = p
        z = D.z(x, y, 0.02)
        D.L.ajouter(B.cyl(0.025, 0.025, 0.2, 4, caps=False), "vert", B.mat4((x, y, z)))
        D.L.ajouter(B.ico(0.1, 1), couleurs[k % len(couleurs)], B.mat4((x, y, z + 0.22)))


def maison(D, x, y, rot, w=1.5, d=1.2, h=1.1, mur="creme", toit="rose", cheminee=True, L=None):
    L = L or D.L
    z = min(D.z(x + dx, y + dy, 0.2) for dx in (-w / 2, w / 2) for dy in (-d / 2, d / 2))
    W = B.mat4((x, y, z), (0, 0, rot))
    L.ajouter(B.boite(w, d, h + 0.2), mur, W)
    L.ajouter(B.prisme(w + 0.32, d + 0.34, h * 0.75), toit, W @ B.mat4((0, 0, h + 0.2)))
    L.ajouter(B.boite(0.4, 0.08, 0.66), "bois_fonce", W @ B.mat4((0, -d / 2 - 0.02, 0.2)))
    L.ajouter(B.sphere(0.04, 6, 4), "or", W @ B.mat4((0.12, -d / 2 - 0.07, 0.52)))
    for s in (-1, 1):
        if w >= 1.3:
            L.ajouter(B.boite(0.28, 0.06, 0.3), "lumiere", W @ B.mat4((s * w * 0.32, -d / 2 - 0.02, 0.2 + h * 0.45)))
        L.ajouter(B.boite(0.06, 0.3, 0.3), "lumiere", W @ B.mat4((s * (w / 2 + 0.02), 0, 0.2 + h * 0.45)))
    if cheminee:
        L.ajouter(B.boite(0.26, 0.26, 0.7), "pierre", W @ B.mat4((w * 0.25, d * 0.18, h + 0.2 + h * 0.2)))


def barque(L, M, coque="bois", liseret="rose", taille=1.0):
    """Une petite barque, la pointe vers +X, posée sur l'eau (z = 0)."""
    S = B.mat4(ech=taille)
    bm = B.demi_sphere(1.0, 16, 5)
    B.deformer(bm, lambda c: Vector((c.x * 1.1, c.y * 0.52 * (1 - max(0.0, c.x) * 0.45), -c.z * 0.4 + 0.14)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    L.ajouter(bm, coque, M @ S)
    t = B.tore(1.0, 0.055, 20, 5)
    B.deformer(t, lambda c: Vector((c.x * 1.1, c.y * 0.52 * (1 - max(0.0, c.x) * 0.45), c.z + 0.14)))
    L.ajouter(t, liseret, M @ S)
    L.ajouter(B.boite(0.14, 0.8, 0.06), "bois_clair", M @ S @ B.mat4((-0.1, 0, 0.14)))
    for s in (-1, 1):
        L.ajouter(B.tube([(-0.25, s * 0.3, 0.2), (0.55, s * 0.95, -0.12)], 0.03, 5), "bois_clair", M @ S)


def ponton(D, p0, p1, largeur=1.2, z=0.55, mat=("bois_clair", "planche")):
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    lg = d.length
    u = d.normalized()
    n = Vector((-u.y, u.x, 0))
    rot = math.atan2(u.y, u.x)
    nb = max(1, int(lg / 0.3))
    for k in range(nb):
        c = p0 + u * (k + 0.5) * lg / nb
        D.L.ajouter(B.boite(lg / nb - 0.03, largeur, 0.09), mat[k % 2], B.mat4((c.x, c.y, z - 0.09), (0, 0, rot)))
    for k in range(int(lg / 1.4) + 1):
        c = p0 + u * min(lg, k * 1.4 + 0.3)
        for s in (-1, 1):
            q = c + n * s * largeur * 0.5
            D.L.ajouter(B.cyl(0.09, 0.09, z + 1.6, 7), "bois", B.mat4((q.x, q.y, -1.4)))


def lampadaire(D, x, y, h=1.6, L=None):
    L = L or D.L
    z = D.z(x, y, 0.05)
    L.ajouter(B.cyl(0.05, 0.04, h, 6), "fer", B.mat4((x, y, z)))
    L.ajouter(B.cyl(0.13, 0.1, 0.06, 8), "fer", B.mat4((x, y, z + h)))
    L.ajouter(B.sphere(0.13, 10, 6), "lumiere", B.mat4((x, y, z + h + 0.16)))
    L.ajouter(B.cyl(0.14, 0.0, 0.14, 8), "fer", B.mat4((x, y, z + h + 0.27)))


def tonneau(L, M):
    L.ajouter(B.tube([(0, 0, 0), (0, 0, 0.12), (0, 0, 0.28), (0, 0, 0.44), (0, 0, 0.56)], [0.16, 0.2, 0.215, 0.2, 0.16], 12), "planche", M)
    for dz in (0.1, 0.46):
        L.ajouter(B.tore(0.205, 0.022, 14, 4), "fer", M @ B.mat4((0, 0, dz)))


def caisse(L, M, mat="bois_clair"):
    L.ajouter(B.boite(0.45, 0.45, 0.45), mat, M)
    L.ajouter(B.boite(0.47, 0.08, 0.47), "bois", M @ B.mat4((0, 0, -0.01)))
    L.ajouter(B.boite(0.08, 0.47, 0.47), "bois", M @ B.mat4((0, 0, -0.01)))


def drapeau(D, nom, pos, taille=(1.4, 0.9), rot=0.0):
    nx, ny = 8, 4
    verts, faces, uvs = [], [], []
    for j in range(ny + 1):
        for i in range(nx + 1):
            verts.append((i / nx * taille[0], 0, -j / ny * taille[1]))
    for j in range(ny):
        for i in range(nx):
            q = j * (nx + 1) + i
            faces.append([q, q + nx + 1, q + nx + 2, q + 1])
            uvs.append([(i / nx, 1 - j / ny), (i / nx, 1 - (j + 1) / ny), ((i + 1) / nx, 1 - (j + 1) / ny), ((i + 1) / nx, 1 - j / ny)])
    o = B.Lot().faces(verts, faces, "drapeau", True, uvs).objet(f"{D.id}_{nom}", D.coll, angle=80)
    o.location = Vector(pos)
    o.rotation_euler = (0, 0, rot)
    o["role"] = "anim"
    B.anime(o, "drapeau")
    return o


def trace_sol(D, pts, largeur, mat, dz=0.05, pas=0.3, L=None):
    """Un ruban plat qui suit le relief (coulées de lave, chemins, la croix du trésor…)."""
    L = L or D.L
    pts = [Vector(p) for p in pts]
    res = [pts[0].copy()]
    for a, b in zip(pts, pts[1:]):
        n = max(1, int((b - a).length / pas))
        for k in range(1, n + 1):
            res.append(a.lerp(b, k / n))
    for p in res:
        p.z = D.sol.z(p.x, p.y) + dz
    if isinstance(largeur, (int, float)):
        lg = [largeur] * len(res)
    else:
        lg = [largeur[0] + (largeur[-1] - largeur[0]) * i / max(1, len(res) - 1) for i in range(len(res))]
    L.ajouter(B.ruban(res, lg, pli=0.0), mat)


def champignon(D, x, y, h, r, cap="rouge", maison_=False, graine=0, L=None):
    L = L or D.L
    rnd = random.Random(graine)
    base = Vector((x, y, D.z(x, y, 0.15)))
    pied = 0.9 if maison_ else max(0.12, r * 0.24)
    haut = base + Vector((rnd.uniform(-0.25, 0.25) * h * 0.15, rnd.uniform(-0.25, 0.25) * h * 0.15, h))
    L.ajouter(B.tube(B.courbe(base, haut, base + Vector((0, 0, h * 0.5)), 6), [pied * 1.25, pied * 1.05, pied, pied * 0.92, pied * 0.85, pied * 0.8], 14 if maison_ else 9), "champi_pied")
    chap = B.demi_sphere(r, 20 if r > 1 else 12, 6)
    B.deformer(chap, lambda c: Vector((c.x, c.y, c.z * 0.6)))
    L.ajouter(chap, cap, B.mat4(haut - Vector((0, 0, 0.12))))
    L.ajouter(B.cyl(r * 0.93, r * 0.93, 0.06, 20 if r > 1 else 12), "creme", B.mat4(haut - Vector((0, 0, 0.16))))
    for k in range(int(5 + r * 3)):
        th = rnd.uniform(0.25, 1.15)
        ph = rnd.uniform(0, 2 * math.pi)
        p = haut - Vector((0, 0, 0.12)) + Vector((math.sin(th) * math.cos(ph) * r, math.sin(th) * math.sin(ph) * r, math.cos(th) * r * 0.6))
        L.ajouter(B.sphere(r * rnd.uniform(0.1, 0.16), 8, 5), "pois", B.mat4(p, ech=(1, 1, 0.55)))
    if maison_:
        dehors = Vector((x, y, 0)).normalized() if Vector((x, y)).length > 0.1 else Vector((0, -1, 0))
        rot = dehors.to_track_quat("Z", "Y").to_euler()
        porte = base + dehors * (pied * 1.12) + Vector((0, 0, 0.75))
        L.ajouter(B.cyl(0.42, 0.42, 0.1, 16), "bois_fonce", B.mat4(porte, rot))
        L.ajouter(B.sphere(0.06, 6, 4), "or", B.mat4(porte + dehors * 0.12 + Vector((0.15, 0, 0))))
        for k, dz in enumerate((1.9, 2.8)):
            cote = Vector((-dehors.y, dehors.x, 0)) * (0.45 if k == 0 else -0.35)
            p = base + dehors * pied * 0.92 + cote + Vector((0, 0, dz))
            L.ajouter(B.cyl(0.2, 0.2, 0.08, 12), "lumiere", B.mat4(p, rot))
            L.ajouter(B.tore(0.2, 0.04, 12, 4), "bois", B.mat4(p, rot))


# ---------- les îles ----------
def ile_port(id_, coll):
    R = Relief(8, 11, plage=0.84)

    def h(x, y, t):
        return 0.3 + R.rampe(t, 3.0) * (0.55 + bosse(x, y, -2.6, 2.8, 2.0, 7.0) + fbm(x, y, 0.35, 3, 2) * 0.15)
    o, v, f = R.construire(f"{id_}_terrain", coll, h, peindre(0xf1ddb0, 0xb9c28a, 0x8f9a62, 0xa39a8c, 2.6, graine=2))
    sol = Sol()
    sol.ajouter(v, f)
    D = Deco(id_, coll, sol, R)
    # la place, le mât et le grand drapeau de Barhaw
    place = Vector((0.7, -0.6, 0))
    D.L.ajouter(B.cyl(1.7, 1.7, 0.1, 24), "pierre", B.mat4((place.x, place.y, D.z(place.x, place.y, 0.06))))
    D.L.ajouter(B.tore(1.7, 0.08, 32, 5), "pierre_fonce", B.mat4((place.x, place.y, D.z(place.x, place.y, 0.0) + 0.08)))
    zp = D.z(place.x, place.y, 0.0)
    D.L.ajouter(B.cyl(0.32, 0.26, 0.4, 10), "pierre_fonce", B.mat4((place.x, place.y, zp)))
    D.L.ajouter(B.cyl(0.07, 0.05, 3.6, 8), "bois_fonce", B.mat4((place.x, place.y, zp)))
    D.L.ajouter(B.sphere(0.12, 8, 6), "or", B.mat4((place.x, place.y, zp + 3.65)))
    drapeau(D, "drapeau", (place.x + 0.05, place.y, zp + 3.5), (1.5, 0.95))
    # les maisons autour de la place
    toits = ["rose", "violet", "rouge", "jaune", "rose", "violet", "rouge", "jaune", "rose"]
    murs = ["creme", "blanc", "rose_pale", "creme", "blanc", "creme", "rose_pale", "blanc", "creme"]
    angles = [-165, -130, -95, -60, -25, 10, 105, 140, 175]
    k = 0
    for i, ang in enumerate(angles):
        a = math.radians(ang)
        for r in (3.4, 3.0, 2.7):
            x, y = place.x + math.cos(a) * r, place.y + math.sin(a) * r
            if R.terre(x, y, 0.12) and math.hypot(x + 2.6, y - 2.8) > 2.2:
                maison(D, x, y, a + math.pi / 2, w=1.3 + (i % 3) * 0.25, d=1.1 + (i % 2) * 0.2, h=1.0 + (i % 4) * 0.25, mur=murs[i], toit=toits[i], cheminee=i % 2 == 0)
                k += 1
                break
    # la capitainerie, en haut de la colline
    cx, cy = -2.6, 2.8
    zc = D.z(cx, cy, 0.2)
    D.L.ajouter(B.cyl(0.8, 0.7, 2.6, 14), "creme", B.mat4((cx, cy, zc)))
    D.L.ajouter(B.tore(0.78, 0.07, 20, 5), "or", B.mat4((cx, cy, zc + 2.0)))
    D.L.ajouter(B.cyl(0.95, 0.0, 1.3, 14), "violet", B.mat4((cx, cy, zc + 2.6)))
    D.L.ajouter(B.sphere(0.12, 8, 6), "or", B.mat4((cx, cy, zc + 3.95)))
    for a in (0.0, 2.1, 4.2):
        D.L.ajouter(B.boite(0.08, 0.3, 0.4), "lumiere", B.mat4((cx + math.cos(a) * 0.72, cy + math.sin(a) * 0.72, zc + 1.4), (0, 0, a)))
    D.L.ajouter(B.cyl(0.36, 0.36, 0.06, 18), "or", B.mat4((cx + 0.2, cy - 0.75, zc + 2.25), (math.pi / 2, 0, 0)))
    # le quai et le ponton, tournés vers la première île
    a = math.radians(60)
    d = Vector((math.cos(a), math.sin(a), 0))
    p0 = d * R.bord(a) * 0.8
    p1 = d * (R.bord(a) * 0.8 + 4.6)
    for k2 in range(-3, 4):
        b = a + k2 * 0.12
        q = Vector((math.cos(b), math.sin(b), 0)) * R.bord(b) * 0.86
        D.L.ajouter(B.boite(1.3, 0.9, 1.2), "pierre" if k2 % 2 else "pierre_fonce", B.mat4((q.x, q.y, -0.6), (0, 0, b + math.pi / 2)))
    ponton(D, p0, p1, 1.25, 0.6)
    n = Vector((-d.y, d.x, 0))
    for s, t in ((1, 0.35), (-1, 0.75)):
        q = p0 + d * 4.6 * t + n * s * 0.4
        lampadaire(D, q.x, q.y, 1.3)
    q = p0 + d * 0.6 - n * 0.3
    caisse(D.L, B.mat4((q.x, q.y, 0.6), (0, 0, a)))
    caisse(D.L, B.mat4((q.x, q.y, 1.05), (0, 0, a + 0.4)))
    q = p0 + d * 1.1 + n * 0.35
    tonneau(D.L, B.mat4((q.x, q.y, 0.6)))
    tonneau(D.L, B.mat4((q.x + 0.3, q.y - 0.2, 0.6)))
    # la grue du port
    g = p0 + d * 0.3 + n * 0.9
    zg = D.z(g.x, g.y, 0.0)
    D.L.ajouter(B.boite(0.25, 0.25, 2.6), "bois", B.mat4((g.x, g.y, zg)))
    bout = g + d * 1.8 + Vector((0, 0, zg + 2.5))
    D.L.ajouter(B.tube([Vector((g.x, g.y, zg + 2.3)), bout], 0.08, 6), "bois")
    D.L.ajouter(B.tube([Vector((g.x, g.y, zg + 1.2)), Vector((g.x, g.y, zg + 2.3)) + d * 0.9], 0.05, 6), "bois")
    D.L.ajouter(B.tube([bout, bout - Vector((0, 0, 1.3))], 0.015, 4), "corde")
    caisse(D.L, B.mat4(bout - Vector((0, 0, 1.75)), (0, 0, 0.3)), "rose")
    # deux barques amarrées
    for k2, (t, s) in enumerate(((0.45, 1), (0.8, -1))):
        q = p0 + d * 4.6 * t + n * s * 1.35
        lot = B.Lot()
        barque(lot, B.mat4((0, 0, 0), (0, 0, a + (0.15 if s > 0 else -0.15))), "bois" if k2 else "bois2", "rose" if k2 else "violet", 0.85)
        D.anim(f"barque{k2}", lot, "flotte", origine=None, phase=k2 * 1.7, ampl=0.07).location = (q.x, q.y, 0.0)
    # des arbres, des fleurs, des rochers
    rnd = random.Random(5)
    for k2 in range(6):
        p = R.point(rnd, 0.25, 0.72, [(place.x, place.y, 3.7), (p0.x, p0.y, 2.0)])
        if p:
            arbre(D, p[0], p[1], 1.6 + rnd.random(), 0.9 + rnd.random() * 0.3, graine=k2 + 20)
    fleurs(D, R, 26, 8, eviter=[(place.x, place.y, 1.9)])
    rochers_cote(D, R, 8, 31)
    D.finir()


def ile_plage(id_, coll):
    R = Relief(8, 23, plage=0.74)

    def h(x, y, t):
        return 0.3 + R.rampe(t, 2.0) * (0.25 + bosse(x, y, 0.4, 0.3, 1.9, 13) + fbm(x, y, 0.3, 3, 4) * 0.2)
    o, v, f = R.construire(f"{id_}_terrain", coll, h, peindre(0xf8cfc4, 0xa9c873, 0x7e9d4e, 0x9a8f80, 2.3, plage_z=0.5, graine=4))
    sol = Sol()
    sol.ajouter(v, f)
    D = Deco(id_, coll, sol, R)
    rnd = random.Random(7)
    # les cocotiers
    for k in range(8):
        p = R.point(rnd, 0.35, 0.72, [(-2.2, 1.6, 2.2), (2.3, -2.2, 1.6)])
        if p:
            palmier(D, p[0], p[1], 2.8 + rnd.random() * 1.2, graine=k + 3)
    # la paillote sur pilotis
    hx, hy = -2.2, 1.6
    zh = D.z(hx, hy, 0.1)
    for sx in (-1, 1):
        for sy in (-1, 1):
            D.L.ajouter(B.cyl(0.08, 0.08, 0.9, 6), "bois", B.mat4((hx + sx * 0.7, hy + sy * 0.6, zh)))
    D.L.ajouter(B.boite(1.8, 1.6, 0.12), "planche", B.mat4((hx, hy, zh + 0.8)))
    D.L.ajouter(B.boite(1.4, 1.2, 1.0), "bois_clair", B.mat4((hx, hy, zh + 0.92)))
    D.L.ajouter(B.cyl(1.45, 0.0, 1.2, 4), "paille", B.mat4((hx, hy, zh + 1.9), (0, 0, math.pi / 4)))
    D.L.ajouter(B.boite(0.42, 0.06, 0.65), "bois_fonce", B.mat4((hx, hy - 0.62, zh + 0.95)))
    D.L.ajouter(B.boite(0.3, 0.06, 0.3), "lumiere", B.mat4((hx + 0.45, hy - 0.62, zh + 1.3)))
    for k in range(4):
        D.L.ajouter(B.boite(0.16, 0.5, 0.06), "bois", B.mat4((hx, hy - 1.0 - k * 0.22, zh + 0.65 - k * 0.2)))
    # le feu de camp (les flammes bougent)
    fx, fy = 2.3, -2.2
    zf = D.z(fx, fy, 0.0)
    for k in range(9):
        a = k * 2 * math.pi / 9
        rocher(D, fx + math.cos(a) * 0.55, fy + math.sin(a) * 0.55, 0.16, "pierre_fonce", k, (1, 1, 0.8), 0.2)
    for k in range(3):
        a = k * math.pi / 3
        D.L.ajouter(B.tube([(fx - math.cos(a) * 0.45, fy - math.sin(a) * 0.45, zf + 0.08), (fx + math.cos(a) * 0.45, fy + math.sin(a) * 0.45, zf + 0.08)], 0.07, 6), "bois")
    feu = B.Lot()
    feu.ajouter(B.cyl(0.32, 0.0, 0.9, 7), "feu", B.mat4((0, 0, 0.05)))
    feu.ajouter(B.cyl(0.18, 0.0, 0.55, 6), "lumiere", B.mat4((0.05, 0.03, 0.05)))
    D.anim("feu", feu, "clignote").location = (fx, fy, zf)
    for k in range(3):  # des bûches pour s'asseoir
        a = k * 2.1 + 0.4
        D.L.ajouter(B.tube([(fx + math.cos(a) * 1.25 - math.sin(a) * 0.5, fy + math.sin(a) * 1.25 + math.cos(a) * 0.5, zf + 0.15), (fx + math.cos(a) * 1.25 + math.sin(a) * 0.5, fy + math.sin(a) * 1.25 - math.cos(a) * 0.5, zf + 0.15)], 0.18, 8), "planche")
    # le parasol et la serviette, sur le sable
    a = math.radians(-35)
    q = Vector((math.cos(a), math.sin(a), 0)) * R.bord(a) * 0.8
    zq = D.z(q.x, q.y, 0.0)
    D.L.ajouter(B.cyl(0.03, 0.03, 1.8, 5), "blanc", B.mat4((q.x, q.y, zq - 0.1)))
    for k in range(8):
        bm = bmesh.new()
        a0, a1 = k * math.pi / 4, (k + 1) * math.pi / 4
        p = [bm.verts.new((0, 0, 0.45)), bm.verts.new((math.cos(a0) * 1.1, math.sin(a0) * 1.1, 0)), bm.verts.new((math.cos(a1) * 1.1, math.sin(a1) * 1.1, 0))]
        bm.faces.new(p)
        D.L.ajouter(bm, "rose" if k % 2 else "blanc", B.mat4((q.x, q.y, zq + 1.35)))
    D.L.ajouter(B.boite(1.5, 0.8, 0.03), "turquoise", B.mat4((q.x + 1.0, q.y + 0.4, zq), (0, 0, 0.3)))
    # des étoiles de mer et des coquillages
    for k in range(9):
        p = R.point(rnd, 0.78, 0.9)
        if p:
            D.L.ajouter(B.etoile(0.22, 0.09, 0.05, 5, 0.4), ("orange", "rose", "corail")[k % 3], B.mat4((p[0], p[1], D.z(p[0], p[1], 0.0) + 0.02), (0, 0, rnd.uniform(0, 6))))
    for k in range(7):
        p = R.point(rnd, 0.78, 0.9)
        if p:
            D.L.ajouter(B.demi_sphere(0.14, 10, 3), "rose_pale", B.mat4((p[0], p[1], D.z(p[0], p[1], 0.03)), ech=(1, 0.8, 0.6)))
    # une barque tirée sur la plage
    a = math.radians(200)
    q = Vector((math.cos(a), math.sin(a), 0)) * R.bord(a) * 0.86
    barque(D.L, B.mat4((q.x, q.y, D.z(q.x, q.y, 0.0) + 0.1), (0.08, 0.1, a + math.pi)), "bois2", "rose", 0.9)
    # le panneau de bienvenue
    px, py = -0.6, -2.9
    zp = D.z(px, py, 0.1)
    D.L.ajouter(B.cyl(0.06, 0.06, 1.5, 6), "bois", B.mat4((px, py, zp)))
    D.L.ajouter(B.boite(1.0, 0.08, 0.42), "bois_clair", B.mat4((px + 0.3, py, zp + 1.0), (0, 0, 0.1)))
    D.L.ajouter(B.etoile(0.14, 0.06, 0.04), "rose", B.mat4((px + 0.3, py - 0.06, zp + 1.21), (math.pi / 2, 0, 0.1)))
    fleurs(D, R, 22, 9, ("rose", "jaune", "blanc"), tmax=0.6, eviter=[(hx, hy, 1.5), (fx, fy, 1.6)])
    rochers_cote(D, R, 5, 33)
    D.finir()


def ile_recif(id_, coll):
    R = Relief(7, 37, plage=0.8)

    def h(x, y, t):
        return 0.3 + R.rampe(t, 2.2) * (0.45 + 0.9 * abs(fbm(x, y, 0.35, 3, 4)))
    o, v, f = R.construire(f"{id_}_terrain", coll, h, peindre(0xd9c7a2, 0x8f8a6a, 0x6f6252, 0x6f6252, 1.4, graine=4))
    sol = Sol()
    sol.ajouter(v, f)
    D = Deco(id_, coll, sol, R)
    rnd = random.Random(3)
    # les aiguilles de pierre (sur l'île et dans la mer)
    pics = [(-1.8, 1.2, 5.5), (0.6, 2.6, 4.2), (2.4, -0.6, 3.6), (-0.2, -1.4, 2.6), (-3.2, -1.6, 3.2), (1.4, 0.4, 2.2),
            (8.2, 2.4, 3.4), (-7.6, 3.8, 2.6), (3.6, -7.4, 4.0), (-5.4, -6.0, 2.2), (6.8, -4.0, 1.8)]
    for k, (x, y, hh) in enumerate(pics):
        base = D.z(x, y, 0.0) if R.t_de(x, y) < 0.95 else -0.8
        r = rnd.uniform(0.75, 1.1)
        D.L.ajouter(B.caillou(r, k + 50, 0.32, 2, (1, 1, hh / r * 0.55)), ("pierre", "pierre_fonce", "pierre")[k % 3], B.mat4((x, y, base + hh * 0.4 - 0.2), (rnd.uniform(-0.1, 0.1), rnd.uniform(-0.1, 0.1), rnd.uniform(0, 6))))
        D.L.ajouter(B.caillou(r * 0.7, k + 80, 0.35, 1, (1.2, 1.2, 0.6)), "pierre_fonce", B.mat4((x + 0.4, y - 0.3, base)))
    # l'arche
    arche = B.tube(B.courbe((-1.0, -3.4, -0.4), (2.6, -4.6, -0.4), (0.9, -4.0, 5.2), 14), [0.75, 0.68, 0.6, 0.55, 0.52, 0.5, 0.5, 0.5, 0.52, 0.55, 0.6, 0.66, 0.72, 0.8], 10)
    for vv in arche.verts:
        vv.co += vv.normal * fbm(vv.co.x, vv.co.y + vv.co.z, 1.1, 2, 9) * 0.35
    D.L.ajouter(arche, "pierre")
    # les pierres percées (le vent y siffle)
    for k, (x, y, a) in enumerate(((-3.6, 1.4, 0.4), (3.0, 2.4, 1.6))):
        t = B.tore(0.85, 0.36, 18, 8)
        for vv in t.verts:
            vv.co *= 1 + fbm(vv.co.x * 2, vv.co.y * 2 + vv.co.z, 1.0, 2, k + 4) * 0.25
        D.L.ajouter(t, "pierre_fonce", B.mat4((x, y, D.z(x, y, 0.0) + 0.75), (math.pi / 2, 0, a)))
    # l'épave
    D.L.ajouter(B.tube([(4.6, 3.6, -1.0), (5.2, 4.2, 3.6)], [0.14, 0.09], 8), "bois_fonce")
    D.L.ajouter(B.tube([(4.5, 3.4, 2.6), (5.7, 4.8, 2.9)], 0.06, 6), "bois_fonce")
    voile = B.ruban([(5.0, 4.0, 2.75), (5.05, 4.1, 2.2), (5.1, 4.2, 1.6), (5.15, 4.3, 1.2)], [0.55, 0.6, 0.45, 0.2], haut=(-0.7, 0.7, 0), pli=0.05)
    D.L.ajouter(voile, "creme")
    bm = B.demi_sphere(1.0, 14, 5)
    B.deformer(bm, lambda c: Vector((c.x * 1.7, c.y * 0.75, -c.z * 0.7)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    D.L.ajouter(bm, "bois2", B.mat4((4.4, 3.2, 0.05), (0.5, -0.3, 0.8)))
    rochers_cote(D, R, 14, 39, ("pierre", "pierre_fonce"), 0.3, 0.8, 0.82, 1.05)
    for k in range(6):  # des algues
        p = R.point(rnd, 0.9, 1.02)
        if p:
            D.L.ajouter(B.ruban([(p[0], p[1], -0.4), (p[0] + 0.1, p[1], 0.2), (p[0] - 0.05, p[1] + 0.1, 0.7)], [0.12, 0.1, 0.03], haut=(1, 0, 0), pli=0.1), "feuille")
    D.finir()


def ile_volcan(id_, coll):
    R = Relief(8.5, 41, plage=0.88)

    def h(x, y, t):
        tt = t / R.plage
        cone = 8.2 * (1 - max(tt, 0.2)) ** 1.15
        cratere = -1.6 * lisse(1 - tt / 0.2) if tt < 0.2 else 0.0
        stries = abs(fbm(x, y, 0.55, 3, 7)) * 1.1 * (1 - tt * 0.4) + abs(math.sin(math.atan2(y, x) * 9 + fbm(x, y, 0.3, 2, 8) * 4)) * 0.35 * tt
        return 0.3 + R.rampe(t, 1.4) * (cone + cratere + stries)

    def c(x, y, z, t, n):
        tt = t / R.plage
        col = peindre(0x4a3b3b, 0x6f4d3b, 0x3b3236, 0x2f2a2e, 6.5, plage_z=0.45, graine=7)(x, y, z, t, n)
        if 0.3 < tt < 0.8 and fbm(x, y, 0.4, 2, 12) > 0.12:
            col = mel(col, 0x5d6b3a, 0.6)
        if tt < 0.3 and z > 4.2:
            col = mel(col, 0xb5452a, lisse((0.3 - tt) / 0.12) * 0.8)
        return col
    o, v, f = R.construire(f"{id_}_terrain", coll, h, c)
    sol = Sol()
    sol.ajouter(v, f)
    D = Deco(id_, coll, sol, R)
    zc = D.z(0, 0, 0.0)
    rbord = R.bord(0) * R.plage * 0.2
    lave = B.Lot()
    lave.ajouter(B.cyl(rbord * 0.95, rbord * 0.95, 0.12, 24), "lave", B.mat4((0, 0, zc + 0.15)))
    for k, a0 in enumerate((0.35, 2.4, 4.3)):
        pts = []
        for i in range(12):
            tt = 0.2 + i * 0.055
            a = a0 + math.sin(i * 0.9 + k) * 0.12
            rr = R.bord(a) * R.plage * tt
            pts.append((math.cos(a) * rr, math.sin(a) * rr, 0))
        trace_sol(D, pts, [0.42, 0.16], "lave", dz=0.06, L=lave)
    # le barbecue au bord de l'eau : on fait griller des brochettes au-dessus de la lave
    a = math.radians(300)
    q = Vector((math.cos(a), math.sin(a), 0)) * R.bord(a) * 0.72
    zq = D.z(q.x, q.y, 0.0)
    for k in range(8):
        b = k * math.pi / 4
        rocher(D, q.x + math.cos(b) * 0.55, q.y + math.sin(b) * 0.55, 0.17, "roche_noire", k + 3, (1, 1, 0.9), 0.2)
    lave.ajouter(B.cyl(0.42, 0.42, 0.08, 12), "lave", B.mat4((q.x, q.y, zq + 0.08)))
    lave.ajouter(B.cyl(0.25, 0.0, 0.6, 6), "feu", B.mat4((q.x, q.y, zq + 0.12)))
    D.L.ajouter(B.boite(1.0, 0.9, 0.04), "fer", B.mat4((q.x, q.y, zq + 0.55)))
    for k in range(3):
        y0 = q.y - 0.3 + k * 0.3
        D.L.ajouter(B.tube([(q.x - 0.7, y0, zq + 0.68), (q.x + 0.7, y0, zq + 0.68)], 0.02, 4), "bois_clair")
        for i in range(4):
            D.L.ajouter(B.boite(0.16, 0.14, 0.14), ("rouge", "jaune", "vert", "orange")[(i + k) % 4], B.mat4((q.x - 0.36 + i * 0.24, y0, zq + 0.61)))
    D.anim("lave", lave, "clignote")
    # des rochers noirs et des arbres morts
    rnd = random.Random(9)
    for k in range(14):
        p = R.point(rnd, 0.3, 0.86)
        if p:
            rocher(D, p[0], p[1], rnd.uniform(0.25, 0.6), "roche_noire", k + 7)
    for k in range(4):
        p = R.point(rnd, 0.5, 0.78, [(q.x, q.y, 1.5)])
        if p:
            x, y = p
            z = D.z(x, y, 0.1)
            D.L.ajouter(B.tube([(x, y, z), (x + 0.1, y, z + 0.9), (x - 0.1, y + 0.1, z + 1.6)], [0.11, 0.08, 0.04], 6), "bois_fonce")
            for b in (0.5, 2.6, 4.4):
                D.L.ajouter(B.tube([(x, y, z + 1.0), (x + math.cos(b) * 0.6, y + math.sin(b) * 0.6, z + 1.5)], [0.05, 0.02], 5), "bois_fonce")
    D.repere("fumee", "fumee", (0, 0, zc + 0.6))
    rochers_cote(D, R, 10, 43, ("roche_noire", "pierre_fonce"))
    D.finir()


def ile_glace(id_, coll):
    R = Relief(8, 53, plage=0.84)
    lac = (2.8, 2.6)

    def h(x, y, t):
        z = 0.3 + R.rampe(t, 2.2) * (0.4 + bosse(x, y, 0.8, -0.8, 2.6, 11) + bosse(x, y, -3.0, 2.2, 1.2, 5) + fbm(x, y, 0.35, 3, 5) * 0.3)
        d = math.hypot(x - lac[0], y - lac[1])
        return z + (0.75 - z) * lisse(1 - (d - 1.4) / 1.2) if d < 2.6 else z
    o, v, f = R.construire(f"{id_}_terrain", coll, h, peindre(0xd5e9f6, 0xf4f8ff, 0xffffff, 0x9fb6cf, 3.0, plage_z=0.38, var=0.1, graine=5, raide=0.86))
    sol = Sol()
    sol.ajouter(v, f)
    D = Deco(id_, coll, sol, R)
    rnd = random.Random(11)
    D.L.ajouter(B.cyl(1.5, 1.5, 0.06, 24), "glace", B.mat4((lac[0], lac[1], 0.74)))
    # les cristaux de glace
    for k in range(13):
        a = rnd.uniform(-1.2, 0.6)
        r = rnd.uniform(2.0, 5.2)
        x, y = math.cos(a) * r, math.sin(a) * r - 1.0
        if R.t_de(x, y) > 0.84:
            continue
        hh = rnd.uniform(1.6, 4.6)
        D.L.ajouter(B.cyl(rnd.uniform(0.35, 0.7), 0.0, hh, 5), "glace", B.mat4((x, y, D.z(x, y, 0.3)), (rnd.uniform(-0.3, 0.3), rnd.uniform(-0.3, 0.3), rnd.uniform(0, 6))))
    # les sapins enneigés
    for k in range(8):
        p = R.point(rnd, 0.3, 0.75, [(lac[0], lac[1], 2.2), (-2.6, -2.2, 1.8), (0.6, -3.4, 1.4)])
        if p:
            sapin(D, p[0], p[1], 2.2 + rnd.random() * 1.2, neige=True)
    # l'igloo
    ix, iy = -2.6, -2.2
    zi = D.z(ix, iy, 0.1)
    D.L.ajouter(B.demi_sphere(1.25, 20, 7), "neige", B.mat4((ix, iy, zi)))
    for k in range(1, 4):
        D.L.ajouter(B.tore(1.25 * math.cos(k * 0.38), 0.03, 24, 4), "glace", B.mat4((ix, iy, zi + 1.25 * math.sin(k * 0.38))))
    D.L.ajouter(B.tube([(ix + 0.6, iy - 0.6, zi + 0.3), (ix + 1.3, iy - 1.3, zi + 0.3)], 0.48, 12), "neige")
    D.L.ajouter(B.cyl(0.36, 0.36, 0.05, 12), "fer", B.mat4((ix + 1.33, iy - 1.33, zi + 0.3), (math.pi / 2, 0, math.radians(45))))
    # le bonhomme de neige, sa luge
    sx, sy = 0.6, -3.4
    zs = D.z(sx, sy, 0.1)
    for r, dz in ((0.55, 0.45), (0.4, 1.2), (0.3, 1.75)):
        D.L.ajouter(B.sphere(r, 14, 9), "neige", B.mat4((sx, sy, zs + dz)))
    D.L.ajouter(B.cyl(0.07, 0.0, 0.4, 6), "orange", B.mat4((sx, sy - 0.28, zs + 1.75), (math.pi / 2, 0, 0)))
    for e in (-0.1, 0.1):
        D.L.ajouter(B.sphere(0.04, 6, 4), "fer", B.mat4((sx + e, sy - 0.26, zs + 1.86)))
    D.L.ajouter(B.tore(0.33, 0.08, 16, 6), "rose", B.mat4((sx, sy, zs + 1.5)))
    D.L.ajouter(B.cyl(0.22, 0.22, 0.35, 12), "fer", B.mat4((sx, sy, zs + 1.98)))
    for s in (-1, 1):
        D.L.ajouter(B.tube([(sx + s * 0.35, sy, zs + 1.25), (sx + s * 0.95, sy, zs + 1.6)], 0.035, 5), "bois_fonce")
    D.L.ajouter(B.boite(1.1, 0.5, 0.08), "rouge", B.mat4((sx + 1.3, sy + 0.3, zs + 0.25), (0, 0, 0.4)))
    for s in (-1, 1):
        D.L.ajouter(B.tube([(sx + 0.8, sy + 0.3 + s * 0.22, zs + 0.1), (sx + 1.9, sy + 0.75 + s * 0.22, zs + 0.1)], 0.03, 4), "fer")
    for k in range(5):
        D.L.ajouter(B.sphere(0.18, 8, 6), "neige", B.mat4((sx - 0.9 + (k % 3) * 0.3, sy + 0.5 + (k // 3) * 0.1, zs + 0.15 + (k // 3) * 0.3)))
    D.repere("neige", "neige", (0, 0, 9))
    rochers_cote(D, R, 8, 57, ("glace", "neige"), 0.3, 0.7)
    D.finir()


def ile_lucioles(id_, coll):
    sol = Sol()
    D = Deco(id_, coll, sol)
    ilots = []
    rayons = [4.4, 3.6, 4.0, 3.4]
    for k in range(4):
        dx, dy = math.cos(k * 1.7) * 6.5, -math.sin(k * 1.7) * 5
        R = Relief(rayons[k], 61 + k, plage=0.8, anneaux=22, secteurs=64)

        def h(x, y, t, R=R, dx=dx, dy=dy):
            return 0.3 + R.rampe(t, 2.0) * (0.3 + bosse(x, y, dx, dy, 1.3, 4) + fbm(x, y, 0.4, 3, k + 2) * 0.2)
        o, v, f = R.construire(f"{id_}_terrain{k}", coll, h, peindre(0xe9d6a8, 0x5d8a62, 0x3f6b4b, 0x55705a, 1.8, graine=k), (dx, dy))
        sol.ajouter(v, f)
        ilots.append((R, dx, dy))
    rnd = random.Random(13)
    for k, (R, dx, dy) in enumerate(ilots):
        # un palétuvier (des racines en arceaux)
        x, y = dx + rnd.uniform(-0.6, 0.6), dy + rnd.uniform(-0.6, 0.6)
        z = D.z(x, y, 0.0)
        tete = Vector((x, y, z + 2.4))
        for i in range(6):
            a = i * math.pi / 3 + k
            pied = Vector((x + math.cos(a) * 1.3, y + math.sin(a) * 1.3, D.z(x + math.cos(a) * 1.3, y + math.sin(a) * 1.3, 0.2)))
            D.L.ajouter(B.tube(B.courbe(pied, Vector((x, y, z + 0.9)), Vector((x + math.cos(a) * 1.1, y + math.sin(a) * 1.1, z + 1.3)), 6), [0.07, 0.09, 0.11, 0.12, 0.14, 0.16], 6), "bois")
        D.L.ajouter(B.tube([(x, y, z + 0.8), tete], [0.2, 0.13], 7), "bois")
        for i in range(4):
            D.L.ajouter(B.caillou(1.1 + rnd.random() * 0.4, k * 7 + i, 0.18, 2), ("vert_fonce", "feuille")[i % 2], B.mat4(tete + Vector((rnd.uniform(-0.8, 0.8), rnd.uniform(-0.8, 0.8), rnd.uniform(0, 0.6)))))
        # des champignons qui brillent
        for i in range(5):
            p = R.point(rnd, 0.3, 0.7, [(x, y, 1.5)])
            if p:
                zz = D.z(p[0], p[1], 0.05)
                hh = rnd.uniform(0.3, 0.7)
                D.L.ajouter(B.cyl(0.06, 0.05, hh, 6), "champi_pied", B.mat4((p[0], p[1], zz)))
                D.L.ajouter(B.demi_sphere(rnd.uniform(0.18, 0.32), 10, 3), "luciole", B.mat4((p[0], p[1], zz + hh), ech=(1, 1, 0.7)))
        # une lanterne
        p = R.point(rnd, 0.4, 0.6, [(x, y, 1.6)])
        if p:
            lampadaire(D, p[0], p[1], 1.2)
    # les ponts de corde entre les îlots
    for k in range(4):
        (R1, x1, y1), (R2, x2, y2) = ilots[k], ilots[(k + 1) % 4]
        d = Vector((x2 - x1, y2 - y1, 0))
        if d.length > 11:
            continue
        u = d.normalized()
        a = Vector((x1, y1, 0)) + u * R1.r * 0.62
        b = Vector((x2, y2, 0)) - u * R2.r * 0.62
        a.z = D.z(a.x, a.y, 0.0) + 0.1
        b.z = D.z(b.x, b.y, 0.0) + 0.1
        n = Vector((-u.y, u.x, 0))
        pts = B.courbe(a, b, (a + b) / 2 - Vector((0, 0, 0.6)), 14)
        for i, p in enumerate(pts[1:-1]):
            D.L.ajouter(B.boite(0.22, 0.85, 0.05), "planche", B.mat4(p, (0, 0, math.atan2(u.y, u.x))))
        for s in (-1, 1):
            D.L.ajouter(B.tube([p + n * s * 0.45 + Vector((0, 0, 0.6)) for p in pts], 0.025, 4, caps=False), "corde")
            for p in (a, b):
                D.L.ajouter(B.cyl(0.06, 0.06, 0.8, 6), "bois", B.mat4(p + n * s * 0.45 - Vector((0, 0, 0.1))))
    D.repere("lucioles", "lucioles", (0, 0, 2.0), rayon=11.0)
    D.finir()


def ile_champignons(id_, coll):
    R = Relief(8, 61, plage=0.82)

    def h(x, y, t):
        return 0.3 + R.rampe(t, 2.2) * (0.6 + bosse(x, y, 0, 0, 1.1, 18) + fbm(x, y, 0.35, 3, 6) * 0.25)
    o, v, f = R.construire(f"{id_}_terrain", coll, h, peindre(0xeedcae, 0x8fbf5f, 0x6a9b43, 0x7c8a5a, 2.0, graine=6))
    sol = Sol()
    sol.ajouter(v, f)
    D = Deco(id_, coll, sol, R)
    grands = [(-2.6, 1.6, 5.6, 2.4, "rouge", True), (2.4, 2.6, 4.2, 2.0, "rose", False), (2.0, -2.6, 4.9, 2.2, "violet", True),
              (-2.9, -2.6, 3.4, 1.6, "rouge", False), (4.4, -0.2, 2.8, 1.4, "rose", False), (-0.2, 0.1, 2.3, 1.15, "violet", False)]
    for k, (x, y, hh, r, c, m) in enumerate(grands):
        champignon(D, x, y, hh, r, c, m, graine=k)
    rnd = random.Random(17)
    eviter = [(x, y, r + 0.3) for x, y, hh, r, c, m in grands]
    for k in range(16):
        p = R.point(rnd, 0.1, 0.76, eviter)
        if p:
            champignon(D, p[0], p[1], rnd.uniform(0.35, 0.9), rnd.uniform(0.22, 0.5), ("rouge", "rose", "violet", "orange")[k % 4], graine=k + 40)
    # le chemin de pierres plates entre les maisons
    for k in range(9):
        t = k / 8
        x, y = -2.6 + (2.0 + 2.6) * t, 1.6 + (-2.6 - 1.6) * t + math.sin(t * 6) * 0.5
        x += 1.2 * (1 - abs(2 * t - 1))
        D.L.ajouter(B.cyl(0.32, 0.32, 0.08, 10), "pierre", B.mat4((x, y, D.z(x, y, 0.02)), (0, 0, k)))
    fleurs(D, R, 26, 19, ("blanc", "jaune", "rose"), eviter=eviter)
    D.repere("spores", "spores", (0, 0, 3.5), rayon=8.0)
    rochers_cote(D, R, 6, 63)
    D.finir()


def ile_ruines(id_, coll):
    R = Relief(8.5, 71, plage=0.86)

    def h(x, y, t):
        return 0.3 + R.rampe(t, 2.0) * (0.35 + fbm(x, y, 0.3, 3, 8) * 0.25)
    o, v, f = R.construire(f"{id_}_terrain", coll, h, peindre(0xe6d3a6, 0xc7b385, 0xa8946a, 0x9a8a6e, 0.9, plage_z=0.4, graine=8))
    sol = Sol()
    sol.ajouter(v, f)
    D = Deco(id_, coll, sol, R)
    z0 = D.z(0, 0, 0.1)
    for k, (l, hh) in enumerate(((6.0, 0.45), (4.6, 0.45), (3.2, 0.45))):
        D.L.ajouter(B.boite(l, l, hh), "pierre" if k % 2 == 0 else "creme", B.mat4((0, 0, z0 + k * 0.45)))
    zt = z0 + 1.35
    # l'obélisque et le coffre vide
    D.L.ajouter(B.cyl(0.55, 0.36, 2.8, 4), "pierre", B.mat4((-0.6, 0.5, zt), (0, 0, math.pi / 4)))
    D.L.ajouter(B.cyl(0.36, 0.0, 0.5, 4), "or", B.mat4((-0.6, 0.5, zt + 2.8), (0, 0, math.pi / 4)))
    cx, cy = 0.7, -0.5
    for dx, dy, w, d in ((0, -0.38, 1.1, 0.08), (0, 0.38, 1.1, 0.08), (-0.51, 0, 0.08, 0.68), (0.51, 0, 0.08, 0.68), (0, 0, 1.1, 0.76)):
        D.L.ajouter(B.boite(w, d, 0.55 if d < 0.7 else 0.06), "bois", B.mat4((cx + dx, cy + dy, zt)))
    D.L.ajouter(B.boite(1.14, 0.8, 0.12), "bois", B.mat4((cx, cy + 0.38, zt + 0.55), (math.radians(-105), 0, 0)) @ B.mat4((0, -0.4, 0)))
    for dx in (-0.35, 0.35):
        D.L.ajouter(B.boite(0.08, 0.82, 0.58), "or", B.mat4((cx + dx, cy, zt - 0.01)))
    # les colonnes
    hauteurs = [3.2, 2.1, 3.2, 1.0, 3.2, 0.6, 2.6, 3.2, 1.5, 3.2]
    for k, hh in enumerate(hauteurs):
        a = k * 2 * math.pi / len(hauteurs) + 0.2
        x, y = math.cos(a) * 4.6, math.sin(a) * 4.6
        if not R.terre(x, y, 0.02):
            continue
        z = D.z(x, y, 0.15)
        D.L.ajouter(B.boite(0.9, 0.9, 0.28), "pierre", B.mat4((x, y, z), (0, 0, a)))
        D.L.ajouter(B.cyl(0.34, 0.31, hh, 12), "creme", B.mat4((x, y, z + 0.28)))
        if hh >= 3.0:
            D.L.ajouter(B.boite(0.9, 0.9, 0.25), "pierre", B.mat4((x, y, z + 0.28 + hh), (0, 0, a)))
        else:
            D.L.ajouter(B.cyl(0.31, 0.2, 0.25, 7), "creme", B.mat4((x, y, z + 0.28 + hh), (0.2, 0.1, k)))
    # une colonne tombée, des tambours éparpillés
    a = 1.2
    for i in range(3):
        p = Vector((math.cos(a) * 6.0, math.sin(a) * 6.0, 0)) + Vector((-math.sin(a), math.cos(a), 0)) * (i * 1.0 - 1.0)
        D.L.ajouter(B.tube([p - Vector((-math.sin(a), math.cos(a), 0)) * 0.45, p + Vector((-math.sin(a), math.cos(a), 0)) * 0.45], 0.33, 12), "creme", B.mat4((0, 0, D.z(p.x, p.y, 0.0) + 0.3)))
    # des colonnes à moitié sous l'eau
    for k, (x, y) in enumerate(((8.8, -3.2), (-6.6, -6.4), (5.6, 7.4))):
        D.L.ajouter(B.cyl(0.36, 0.33, 2.2 + k * 0.5, 12), "creme", B.mat4((x, y, -1.4), (0.08 * k, -0.1, 0)))
    # l'arche
    ax, ay, aa = -3.6, -3.6, math.radians(45)
    n = Vector((math.cos(aa), math.sin(aa), 0))
    for s in (-1, 1):
        q = Vector((ax, ay, 0)) + n * s * 1.25
        D.L.ajouter(B.boite(0.7, 0.7, 3.0), "pierre", B.mat4((q.x, q.y, D.z(q.x, q.y, 0.2)), (0, 0, aa)))
    D.L.ajouter(B.boite(3.4, 0.85, 0.6), "creme", B.mat4((ax, ay, D.z(ax, ay, 0.2) + 2.9), (0, 0, aa)))
    rnd = random.Random(21)
    for k in range(10):
        p = R.point(rnd, 0.45, 0.86, [(0, 0, 3.6)])
        if p:
            D.L.ajouter(B.boite(0.5, 0.4, 0.35), "pierre", B.mat4((p[0], p[1], D.z(p[0], p[1], 0.1)), (rnd.uniform(-0.3, 0.3), 0, rnd.uniform(0, 3))))
    for k in range(7):  # du corail dans l'eau claire
        p = R.point(rnd, 0.92, 1.05)
        if p:
            for i in range(3):
                b = rnd.uniform(0, 6.28)
                D.L.ajouter(B.tube([(p[0], p[1], -0.5), (p[0] + math.cos(b) * 0.3, p[1] + math.sin(b) * 0.3, 0.25)], [0.08, 0.04], 5), "corail")
    rochers_cote(D, R, 6, 73)
    D.finir()


def ile_moulins(id_, coll):
    R = Relief(8, 83, plage=0.84)
    collines = [(-2.5, 2.0, 2.4), (2.6, 1.2, 1.9), (0.2, -2.8, 2.1)]

    def h(x, y, t):
        return 0.3 + R.rampe(t, 2.5) * (0.45 + sum(bosse(x, y, cx, cy, ch, 6) for cx, cy, ch in collines) + fbm(x, y, 0.35, 3, 9) * 0.15)
    champs = [0xb2cf78, 0x9cc265, 0xe8d27a, 0xc9df8a, 0x86a653, 0xe0c25e]
    base = peindre(0xeedbb0, 0xb2cf78, 0x86a653, 0x9a8f80, 3.0, graine=9)

    def c(x, y, z, t, n):
        col = base(x, y, z, t, n)
        if z > 0.55 and n.z > 0.8:
            i = int(math.floor((x + 0.4 * y) / 2.0) * 7 + math.floor((y - 0.3 * x) / 2.0) * 13) % len(champs)
            col = mel(col, champs[i], 0.75)
        return col
    o, v, f = R.construire(f"{id_}_terrain", coll, h, c)
    sol = Sol()
    sol.ajouter(v, f)
    D = Deco(id_, coll, sol, R)
    for k, (cx, cy, ch) in enumerate(collines):
        z = D.z(cx, cy, 0.2)
        D.L.ajouter(B.tube([(cx, cy, z), (cx, cy, z + 1.2), (cx, cy, z + 2.4), (cx, cy, z + 3.4)], [0.98, 0.88, 0.76, 0.66], 14), "creme")
        D.L.ajouter(B.cyl(1.05, 1.05, 0.25, 14), "pierre", B.mat4((cx, cy, z)))
        D.L.ajouter(B.cyl(0.85, 0.0, 1.25, 14), ("rouge", "violet", "rose")[k], B.mat4((cx, cy, z + 3.35)))
        D.L.ajouter(B.boite(0.08, 0.5, 0.75), "bois_fonce", B.mat4((cx + 0.96, cy, z + 0.2)))
        for dz, a in ((1.6, 0.0), (2.5, 2.2)):
            D.L.ajouter(B.boite(0.08, 0.28, 0.32), "lumiere", B.mat4((cx + math.cos(a) * 0.85, cy + math.sin(a) * 0.85, z + dz), (0, 0, a)))
        # les ailes (elles tournent ; elles regardent vers le bas de la carte)
        ailes = B.Lot()
        ailes.ajouter(B.sphere(0.24, 10, 6), "bois_fonce")
        ailes.ajouter(B.tube([(-0.5, 0, 0), (0.25, 0, 0)], 0.09, 8), "bois_fonce")
        for i in range(4):
            th = i * math.pi / 2 + math.pi / 4
            d = Vector((0, math.cos(th), math.sin(th)))
            cote = Vector((0, -math.sin(th), math.cos(th)))
            ailes.ajouter(B.tube([Vector((0.15, 0, 0)), Vector((0.15, 0, 0)) + d * 2.7], [0.07, 0.05], 6), "bois")
            for j in range(4):
                p = Vector((0.15, 0, 0)) + d * (0.7 + j * 0.55) + cote * 0.32
                ailes.ajouter(B.boite(0.03, 0.62, 0.48), "voile", B.mat4(p, (th, 0, 0)))
        o2 = D.anim(f"ailes{k}", ailes, "tourne", axe=[1, 0, 0], vitesse=0.9 + k * 0.25)
        o2.location = (cx, cy - 0.98, z + 3.0)
        o2.rotation_euler = (0, 0, -math.pi / 2)
    # des arbres pliés par le vent, des meules de foin, une ferme, des clôtures
    rnd = random.Random(23)
    eviter = [(cx, cy, 1.8) for cx, cy, ch in collines]
    for k in range(7):
        p = R.point(rnd, 0.35, 0.78, eviter)
        if p:
            arbre(D, p[0], p[1], 1.7 + rnd.random() * 0.6, 0.85, ("vert", "vert_clair", "feuille"), graine=k + 60, penche=(0.9, 0.2))
    for k in range(4):
        p = R.point(rnd, 0.3, 0.7, eviter)
        if p:
            z = D.z(p[0], p[1], 0.05)
            D.L.ajouter(B.cyl(0.45, 0.45, 0.45, 12), "paille", B.mat4((p[0], p[1], z)))
            D.L.ajouter(B.demi_sphere(0.45, 12, 4), "paille", B.mat4((p[0], p[1], z + 0.45)))
    maison(D, -0.4, 0.3, 0.3, 1.6, 1.2, 1.0, "blanc", "rouge")
    for (x0, y0), (x1, y1) in (((-4.4, -1.0), (-1.6, -2.0)), ((3.6, -2.0), (4.6, 0.6))):
        n = 6
        for i in range(n + 1):
            x, y = x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n
            D.L.ajouter(B.boite(0.1, 0.1, 0.6), "bois_clair", B.mat4((x, y, D.z(x, y, 0.1))))
        for dz in (0.25, 0.48):
            D.L.ajouter(B.tube([(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, D.z(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, 0.1) + dz) for i in range(n + 1)], 0.03, 4), "bois_clair")
    fleurs(D, R, 16, 25, ("jaune", "blanc", "rose"), eviter=eviter)
    rochers_cote(D, R, 7, 85)
    D.finir()


def ile_marche(id_, coll):
    sol = Sol()
    bm = B.cyl(2.7, 2.7, 0.4, 8)
    verts = [tuple(v.co) for v in bm.verts]
    faces = [[v.index for v in f.verts] for f in bm.faces]
    bm.free()
    sol.ajouter([(x, y, z - 0.05) for x, y, z in verts], faces)
    D = Deco(id_, coll, sol)
    D.L.ajouter(B.cyl(2.7, 2.7, 0.4, 8), "planche", B.mat4((0, 0, -0.05), (0, 0, math.pi / 8)))
    D.L.ajouter(B.tore(2.62, 0.08, 8, 4), "bois", B.mat4((0, 0, 0.36), (0, 0, math.pi / 8)))
    for k in range(-2, 3):
        D.L.ajouter(B.boite(0.06, 4.6 - abs(k) * 0.9, 0.02), "bois", B.mat4((k * 0.9, 0, 0.35)))
    # la grande tente rayée
    tente = bmesh.new()
    sommet = tente.verts.new((0, 0, 2.9))
    anneau = [tente.verts.new((math.cos(k * math.pi / 6) * 1.7, math.sin(k * math.pi / 6) * 1.7, 1.25)) for k in range(12)]
    couche = tente.faces.layers.int.new("mat")
    for k in range(12):
        f = tente.faces.new((anneau[k], anneau[(k + 1) % 12], sommet))
        f[couche] = k % 2
    D.L.ajouter(tente, None, couche_mat=("mat", ["rose", "creme"]))
    for k in range(4):
        a = k * math.pi / 2 + math.pi / 4
        D.L.ajouter(B.cyl(0.06, 0.06, 1.0, 6), "bois", B.mat4((math.cos(a) * 1.45, math.sin(a) * 1.45, 0.35)))
    D.L.ajouter(B.cyl(0.04, 0.04, 0.8, 5), "bois_fonce", B.mat4((0, 0, 2.85)))
    drapeau(D, "drapeau", (0.03, 0, 3.6), (0.8, 0.5))
    D.L.ajouter(B.boite(1.2, 0.6, 0.6), "bois_clair", B.mat4((0, -0.4, 0.35)))
    for k in range(5):
        D.L.ajouter(B.sphere(0.12, 8, 6), ("rouge", "jaune", "orange", "vert", "violet")[k], B.mat4((-0.4 + k * 0.2, -0.45, 1.05)))
    # les bateaux-boutiques autour, reliés par des planches et des guirlandes
    etals = [("rose", "fruits"), ("jaune", "caisses"), ("violet", "cartes"), ("turquoise", "tonneaux"), ("rouge", "pots"), ("rose", "fruits"), ("jaune", "cartes")]
    poteaux = []
    for k, (couleur, genre) in enumerate(etals):
        a = k * 2 * math.pi / len(etals) + 0.25
        p = Vector((math.cos(a), math.sin(a), 0)) * 5.0
        lot = B.Lot()
        barque(lot, B.mat4((0, 0, 0), (0, 0, 0)), ("bois", "bois2", "planche")[k % 3], couleur, 1.45)
        for s in (-1, 1):
            lot.ajouter(B.cyl(0.05, 0.05, 1.3, 5), "bois", B.mat4((s * 0.55, 0.0, 0.2)))
        for i in range(6):
            lot.ajouter(B.boite(0.24, 1.1, 0.04), couleur if i % 2 == 0 else "blanc", B.mat4((-0.6 + i * 0.24, 0.0, 1.5), (0.25, 0, 0)))
        if genre == "fruits":
            for i in range(9):
                lot.ajouter(B.sphere(0.12, 8, 6), ("rouge", "jaune", "orange", "vert")[i % 4], B.mat4((-0.5 + (i % 5) * 0.25, -0.1 + (i // 5) * 0.2, 0.3 + (i // 5) * 0.1)))
        elif genre == "caisses":
            caisse(lot, B.mat4((-0.3, 0, 0.2)))
            caisse(lot, B.mat4((0.3, 0.05, 0.2), (0, 0, 0.3)), "rose")
        elif genre == "cartes":
            for i in range(6):
                lot.ajouter(B.boite(0.04, 0.2, 0.3), ("violet", "or", "rose", "turquoise", "or", "violet")[i], B.mat4((-0.45 + i * 0.18, -0.15, 0.25), (0, -0.25, 0)))
        elif genre == "tonneaux":
            tonneau(lot, B.mat4((-0.3, 0, 0.15), ech=0.9))
            tonneau(lot, B.mat4((0.3, 0, 0.15), ech=0.9))
        else:
            for i in range(4):
                lot.ajouter(B.tube([(-0.45 + i * 0.3, 0, 0.18), (-0.45 + i * 0.3, 0, 0.32), (-0.45 + i * 0.3, 0, 0.48)], [0.1, 0.15, 0.08], 10), ("orange", "gres", "turquoise", "orange")[i])
        lot.ajouter(B.cyl(0.04, 0.04, 1.9, 5), "bois_fonce", B.mat4((0.9, 0, 0.1)))
        lot.ajouter(B.sphere(0.13, 8, 6), "lumiere", B.mat4((0.9, 0, 2.05)))
        o2 = D.anim(f"bateau{k}", lot, "flotte", phase=k * 0.9, ampl=0.08)
        o2.location = p
        o2.rotation_euler = (0, 0, a + math.pi / 2)
        poteaux.append(p + Vector((-math.sin(a), math.cos(a), 0)) * 0.9 * 1.0 + Vector((0, 0, 2.0)))
        # la passerelle vers le radeau
        q0 = Vector((math.cos(a), math.sin(a), 0)) * 2.55
        q1 = Vector((math.cos(a), math.sin(a), 0)) * 4.4
        ponton(D, q0, q1, 0.6, 0.38)
    for k in range(len(poteaux)):
        a, b = poteaux[k], poteaux[(k + 1) % len(poteaux)]
        pts = B.courbe(a, b, (a + b) / 2 - Vector((0, 0, 0.7)), 9)
        D.L.ajouter(B.tube(pts, 0.018, 4, caps=False), "corde")
        for p in pts[2:-2:2]:
            D.L.ajouter(B.sphere(0.09, 6, 4), ("lumiere", "rose", "lumiere", "jaune")[k % 4], B.mat4(p - Vector((0, 0, 0.1))))
    D.finir()


def ile_arbre(id_, coll):
    R = Relief(8.5, 97, plage=0.82)

    def h(x, y, t):
        return 0.3 + R.rampe(t, 2.2) * (0.7 + bosse(x, y, 0, 0, 1.1, 20) + fbm(x, y, 0.35, 3, 10) * 0.25)
    o, v, f = R.construire(f"{id_}_terrain", coll, h, peindre(0xf0dcae, 0x84b55a, 0x5f8f3b, 0x7a8a5a, 2.0, graine=10))
    sol = Sol()
    sol.ajouter(v, f)
    D = Deco(id_, coll, sol, R)
    z0 = D.z(0, 0, 0.0)
    D.L.ajouter(B.tube([(0, 0, z0 - 0.6), (0.2, 0.1, z0 + 3.0), (0.05, -0.2, z0 + 6.0), (0.4, 0.0, z0 + 9.0)], [1.75, 1.25, 1.0, 0.7], 14), "bois")
    for k in range(7):
        a = k * 2 * math.pi / 7 + 0.3
        pied = Vector((math.cos(a) * 4.2, math.sin(a) * 4.2, D.z(math.cos(a) * 4.2, math.sin(a) * 4.2, 0.35)))
        D.L.ajouter(B.tube(B.courbe(Vector((math.cos(a) * 0.9, math.sin(a) * 0.9, z0 + 1.4)), pied, Vector((math.cos(a) * 2.8, math.sin(a) * 2.8, z0 + 1.5)), 8), [0.62, 0.55, 0.46, 0.38, 0.3, 0.24, 0.18, 0.14], 8), "bois")
    feuillage = ("vert", "vert_clair", "feuille", "vert")
    branches = []
    for k in range(6):
        a = k * math.pi / 3 + 0.5
        z = z0 + 6.2 + (k % 3) * 0.9
        debut = Vector((math.cos(a) * 0.5, math.sin(a) * 0.5, z))
        fin = Vector((math.cos(a) * 4.0, math.sin(a) * 4.0, z + 2.2))
        D.L.ajouter(B.tube(B.courbe(debut, fin, Vector((math.cos(a) * 2.6, math.sin(a) * 2.6, z + 0.4)), 7), [0.5, 0.42, 0.36, 0.3, 0.25, 0.2, 0.16], 8), "bois")
        D.L.ajouter(B.caillou(2.2 + (k % 2) * 0.45, k + 90, 0.2, 2), feuillage[k % 4], B.mat4(fin + Vector((0, 0, 0.5))))
        branches.append((a, debut, fin))
    D.L.ajouter(B.caillou(2.9, 99, 0.2, 2), "vert_clair", B.mat4((0.4, 0, z0 + 10.6)))
    D.L.ajouter(B.caillou(2.2, 98, 0.2, 2), "vert", B.mat4((-1.2, 1.4, z0 + 9.8)))
    # la cabane dans l'arbre
    zp = z0 + 5.0
    D.L.ajouter(B.cyl(2.5, 2.5, 0.22, 20), "planche", B.mat4((0, 0, zp)))
    for k in range(20):
        a = k * 2 * math.pi / 20
        D.L.ajouter(B.cyl(0.05, 0.05, 0.6, 5), "bois_clair", B.mat4((math.cos(a) * 2.4, math.sin(a) * 2.4, zp + 0.22)))
    D.L.ajouter(B.tore(2.4, 0.05, 32, 4), "bois_clair", B.mat4((0, 0, zp + 0.82)))
    for k in range(4):
        a = k * math.pi / 2 + 0.4
        D.L.ajouter(B.tube([(math.cos(a) * 0.9, math.sin(a) * 0.9, zp - 1.6), (math.cos(a) * 2.2, math.sin(a) * 2.2, zp)], 0.09, 6), "bois")
    cx, cy = 1.3, -0.9
    D.L.ajouter(B.boite(1.5, 1.3, 1.15), "bois_clair", B.mat4((cx, cy, zp + 0.22), (0, 0, -0.6)))
    D.L.ajouter(B.prisme(1.85, 1.65, 0.85), "rouge", B.mat4((cx, cy, zp + 1.37), (0, 0, -0.6)))
    D.L.ajouter(B.boite(0.3, 0.06, 0.3), "lumiere", B.mat4((cx + 0.35, cy - 0.68, zp + 0.8), (0, 0, -0.6)))
    D.L.ajouter(B.boite(0.4, 0.06, 0.66), "bois_fonce", B.mat4((cx - 0.25, cy - 0.7, zp + 0.22), (0, 0, -0.6)))
    # l'échelle de corde
    ex, ey = -1.6, -1.8
    zb = D.z(ex, ey, 0.0)
    for s in (-1, 1):
        D.L.ajouter(B.tube([(ex + s * 0.25, ey, zp + 0.1), (ex + s * 0.25 + 0.2, ey - 0.4, zb)], 0.025, 4), "corde")
    for k in range(1, 9):
        t = k / 9
        D.L.ajouter(B.boite(0.55, 0.06, 0.05), "bois_clair", B.mat4((ex + 0.2 * t, ey - 0.4 * t, zp + 0.1 + (zb - zp - 0.1) * t)))
    # la balançoire (elle se balance)
    a, debut, fin = branches[3]
    pivot = debut.lerp(fin, 0.62)
    bal = B.Lot()
    corde = pivot.z - (D.z(pivot.x, pivot.y, 0.0) + 0.7)
    for s in (-1, 1):
        bal.ajouter(B.tube([(0, s * 0.35, 0), (0, s * 0.35, -corde)], 0.022, 4), "corde")
    bal.ajouter(B.boite(0.35, 0.85, 0.08), "rose", B.mat4((0, 0, -corde - 0.04)))
    o2 = D.anim("balancoire", bal, "balance", axe=[0, 1, 0], ampl=0.35, vitesse=1.6)
    o2.location = pivot
    o2.rotation_euler = (0, 0, a)
    rnd = random.Random(29)
    for k in range(8):
        p = R.point(rnd, 0.55, 0.8)
        if p:
            D.L.ajouter(B.caillou(0.55 + rnd.random() * 0.3, k + 120, 0.2, 1), ("vert", "feuille")[k % 2], B.mat4((p[0], p[1], D.z(p[0], p[1], 0.1) + 0.3)))
    fleurs(D, R, 30, 31, eviter=[(0, 0, 3.0)])
    rochers_cote(D, R, 6, 99)
    D.finir()


def ile_dunes(id_, coll):
    R = Relief(9, 109, plage=0.84)
    oasis = (-2.8, 1.6)

    def h(x, y, t):
        crete = 1 - abs(math.sin(x * 0.62 + y * 0.22 + fbm(x, y, 0.16, 2, 11) * 3.0))
        z = 0.3 + R.rampe(t, 2.0) * (0.35 + 1.5 * crete ** 1.7 + fbm(x, y, 0.3, 2, 12) * 0.2)
        d = math.hypot(x - oasis[0], y - oasis[1])
        return z + (0.55 - z) * lisse(1 - (d - 1.7) / 1.6) if d < 3.3 else z

    def c(x, y, z, t, n):
        col = peindre(0xf3d48f, 0xe7bd6a, 0xd59f48, 0xc98a3e, 2.0, plage_z=0.45, var=0.2, graine=12)(x, y, z, t, n)
        col = mel(col, 0xffe6a8, max(0.0, n.x) * 0.5)
        col = mel(col, 0xb97a32, max(0.0, -n.x) * 0.35)
        d = math.hypot(x - oasis[0], y - oasis[1])
        if d < 2.7 and z > 0.4:
            col = mel(col, 0x7fb24f, lisse((2.7 - d) / 0.6))
        return col
    o, v, f = R.construire(f"{id_}_terrain", coll, h, c)
    sol = Sol()
    sol.ajouter(v, f)
    D = Deco(id_, coll, sol, R)
    D.L.ajouter(B.cyl(1.65, 1.65, 0.06, 24), "eau_douce", B.mat4((oasis[0], oasis[1], 0.56)))
    for k in range(3):
        a = k * 2.1 + 0.5
        palmier(D, oasis[0] + math.cos(a) * 2.1, oasis[1] + math.sin(a) * 2.1, 2.6 + k * 0.4, graine=k + 70)
    rnd = random.Random(37)
    for k in range(7):
        p = R.point(rnd, 0.25, 0.76, [(oasis[0], oasis[1], 3.2), (3.8, -2.6, 2.2), (2.5, 3.0, 1.6)])
        if not p:
            continue
        x, y = p
        z = D.z(x, y, 0.15)
        hh = rnd.uniform(1.6, 2.8)
        r = rnd.uniform(0.22, 0.3)
        a = rnd.uniform(0, 6.28)
        M = B.mat4((x, y, z), (0, 0, a))
        D.L.ajouter(B.tube([(0, 0, 0), (0, 0, hh)], [r, r * 0.95], 10), "vert", M)
        D.L.ajouter(B.sphere(r * 0.95, 10, 5), "vert", M @ B.mat4((0, 0, hh)))
        for s, zz in ((1, 0.45), (-1, 0.6)):
            if s < 0 and k % 2:
                continue
            bras = [(0, 0, hh * zz), (s * 0.55, 0, hh * zz + 0.08), (s * 0.62, 0, hh * zz + 0.75)]
            D.L.ajouter(B.tube(bras, r * 0.62, 8), "vert", M)
            D.L.ajouter(B.sphere(r * 0.6, 8, 5), "vert", M @ B.mat4(bras[-1]))
        D.L.ajouter(B.ico(0.07, 1), "rose", M @ B.mat4((0, 0, hh + r * 0.9)))
    # l'arche de grès
    arche = B.tube(B.courbe((2.9, -3.4, -0.2), (4.9, -1.5, -0.2), (4.6, -3.2, 4.4), 14), [0.75, 0.7, 0.62, 0.58, 0.55, 0.55, 0.55, 0.55, 0.58, 0.6, 0.64, 0.68, 0.72, 0.78], 10)
    for vv in arche.verts:
        vv.co += vv.normal * fbm(vv.co.x * 1.3, vv.co.y + vv.co.z, 1.0, 2, 14) * 0.3
        vv.co.z += math.floor(vv.co.z / 0.5) * 0.02
    D.L.ajouter(arche, "gres")
    for k in range(6):
        p = R.point(rnd, 0.3, 0.86, [(oasis[0], oasis[1], 3.0)])
        if p:
            rocher(D, p[0], p[1], rnd.uniform(0.3, 0.7), "gres", k + 140, (1.2, 1, 0.7))
    # le mirage : un buffet à volonté qui flotte… et qui n'existe pas
    mi = B.Lot()
    mi.ajouter(B.cyl(0.95, 0.95, 0.1, 20), "creme", B.mat4((0, 0, 0.75)))
    for a in (0.6, 2.7, 4.8):
        mi.ajouter(B.cyl(0.05, 0.05, 0.75, 5), "bois_clair", B.mat4((math.cos(a) * 0.6, math.sin(a) * 0.6, 0)))
    mi.ajouter(B.cyl(0.42, 0.42, 0.3, 16), "rose_pale", B.mat4((-0.25, 0.1, 0.85)))
    mi.ajouter(B.cyl(0.32, 0.32, 0.25, 16), "creme", B.mat4((-0.25, 0.1, 1.15)))
    mi.ajouter(B.sphere(0.08, 8, 6), "rouge", B.mat4((-0.25, 0.1, 1.45)))
    mi.ajouter(B.demi_sphere(0.32, 14, 4), "or", B.mat4((0.42, -0.2, 1.1), (math.pi, 0, 0)))
    for i in range(5):
        mi.ajouter(B.sphere(0.11, 8, 6), ("rouge", "jaune", "orange", "vert", "violet")[i], B.mat4((0.42 + math.cos(i * 1.3) * 0.15, -0.2 + math.sin(i * 1.3) * 0.15, 1.15)))
    mi.ajouter(B.tube([(0.2, 0.45, 0.88), (0.5, 0.55, 0.95)], [0.12, 0.05], 8), "gres")
    mx, my = 2.5, 3.0
    D.anim("mirage", mi, "mirage", ampl=0.25, phase=0.0).location = (mx, my, D.z(mx, my, 0.0) + 1.6)
    rochers_cote(D, R, 5, 111, ("gres", "pierre"))
    D.finir()


def ile_phare(id_, coll):
    R = Relief(5.5, 113, plage=0.86, anneaux=26, secteurs=72)

    def h(x, y, t):
        return 0.3 + lisse((1 - t / R.plage) * 5.0) * (2.8 + fbm(x, y, 0.45, 3, 13) * 0.4)
    o, v, f = R.construire(f"{id_}_terrain", coll, h, peindre(0xcfc1a4, 0x9fb070, 0x86a060, 0x938676, 3.1, plage_z=0.4, graine=13, raide=0.75))
    sol = Sol()
    sol.ajouter(v, f)
    D = Deco(id_, coll, sol, R)
    px, py = 0.3, 0.4
    z = D.z(px, py, 0.1)
    D.L.ajouter(B.cyl(1.3, 1.2, 0.7, 18), "pierre", B.mat4((px, py, z)))
    z += 0.7
    for k in range(5):
        r1 = 0.98 - k * 0.075
        D.L.ajouter(B.cyl(r1, r1 - 0.075, 1.25, 18), "rouge" if k % 2 == 0 else "blanc", B.mat4((px, py, z + k * 1.25)))
    z += 5 * 1.25
    for k in range(2):
        D.L.ajouter(B.boite(0.08, 0.32, 0.45), "lumiere", B.mat4((px + 0.72 - k * 0.07, py, z - 2.4 - k * 2.5)))
    D.L.ajouter(B.cyl(1.05, 1.05, 0.14, 18), "fer", B.mat4((px, py, z)))
    for k in range(18):
        a = k * 2 * math.pi / 18
        D.L.ajouter(B.cyl(0.025, 0.025, 0.45, 4), "fer", B.mat4((px + math.cos(a) * 0.98, py + math.sin(a) * 0.98, z + 0.14)))
    D.L.ajouter(B.tore(0.98, 0.035, 28, 4), "fer", B.mat4((px, py, z + 0.6)))
    lum = B.Lot()
    lum.ajouter(B.cyl(0.58, 0.58, 0.9, 14), "lumiere", B.mat4((0, 0, 0)))
    D.anim("lanterne", lum, "clignote", lent=1).location = (px, py, z + 0.14)
    for k in range(6):
        a = k * math.pi / 3
        D.L.ajouter(B.cyl(0.04, 0.04, 0.9, 4), "fer", B.mat4((px + math.cos(a) * 0.6, py + math.sin(a) * 0.6, z + 0.14)))
    D.L.ajouter(B.demi_sphere(0.7, 16, 5), "rouge", B.mat4((px, py, z + 1.04)))
    D.L.ajouter(B.cyl(0.05, 0.0, 0.6, 5), "fer", B.mat4((px, py, z + 1.7)))
    D.L.ajouter(B.sphere(0.1, 8, 6), "or", B.mat4((px, py, z + 2.3)))
    D.repere("faisceau", "faisceau", (px, py, z + 0.6))
    maison(D, -1.8, -1.3, 0.5, 1.5, 1.2, 0.95, "blanc", "violet")
    # l'escalier taillé dans la falaise, et un petit ponton
    a = math.radians(235)
    for k in range(12):
        t = 0.55 + k * 0.035
        x, y = math.cos(a + k * 0.04) * R.bord(a) * t, math.sin(a + k * 0.04) * R.bord(a) * t
        D.L.ajouter(B.boite(0.5, 0.7, 0.18), "pierre_fonce", B.mat4((x, y, D.z(x, y, 0.05)), (0, 0, a)))
    q0 = Vector((math.cos(a + 0.48), math.sin(a + 0.48), 0)) * R.bord(a) * 0.95
    ponton(D, q0, q0 * 1.5, 0.8, 0.45)
    rochers_cote(D, R, 14, 115, ("pierre", "pierre_fonce"), 0.35, 0.9, 0.86, 1.06)
    D.finir()


def ile_orage(id_, coll):
    R = Relief(8, 127, plage=0.84)

    def h(x, y, t):
        return 0.3 + R.rampe(t, 2.0) * (0.7 + 1.4 * abs(fbm(x, y, 0.3, 4, 13)) + bosse(x, y, -1.0, 1.0, 1.4, 10))
    o, v, f = R.construire(f"{id_}_terrain", coll, h, peindre(0x8f8a99, 0x5c586b, 0x3d3a4a, 0x4a4656, 2.6, graine=14))
    sol = Sol()
    sol.ajouter(v, f)
    D = Deco(id_, coll, sol, R)
    rnd = random.Random(41)
    pics = [(2.2, -1.8, 6.0), (-3.0, -2.2, 4.6), (3.4, 2.6, 4.0), (-3.6, 2.8, 3.4), (0.4, 3.6, 2.8), (4.6, -0.2, 2.4), (-0.8, -3.8, 3.0)]
    for k, (x, y, hh) in enumerate(pics):
        r = rnd.uniform(0.8, 1.15)
        D.L.ajouter(B.caillou(r, k + 150, 0.48, 2, (1, 1, hh / r * 0.5)), ("roche_noire", "pierre_fonce")[k % 2], B.mat4((x, y, D.z(x, y, 0.3) + hh * 0.35), (rnd.uniform(-0.15, 0.15), rnd.uniform(-0.15, 0.15), rnd.uniform(0, 6))))
    for k in range(6):
        p = R.point(rnd, 0.2, 0.75, [(x, y, 1.3) for x, y, hh in pics])
        if not p:
            continue
        x, y = p
        z = D.z(x, y, 0.1)
        tronc = [Vector((x, y, z)), Vector((x + 0.15, y, z + 1.0)), Vector((x - 0.05, y + 0.1, z + 1.9))]
        D.L.ajouter(B.tube(tronc, [0.14, 0.1, 0.05], 6), "bois_fonce")
        for i in range(4):
            b = rnd.uniform(0, 6.28)
            debut = tronc[1].lerp(tronc[2], rnd.uniform(0.0, 0.8))
            fin = debut + Vector((math.cos(b) * 0.8, math.sin(b) * 0.8, rnd.uniform(0.2, 0.7)))
            D.L.ajouter(B.tube([debut, fin], [0.06, 0.02], 5), "bois_fonce")
            D.L.ajouter(B.tube([fin, fin + Vector((math.cos(b + 0.8) * 0.35, math.sin(b + 0.8) * 0.35, 0.3))], [0.025, 0.01], 4), "bois_fonce")
    # le paratonnerre, sur la colline
    x, y = -1.0, 1.0
    z = D.z(x, y, 0.1)
    D.L.ajouter(B.tube([(x, y, z), (x, y, z + 5.0)], [0.12, 0.05], 8), "fer")
    for a in (0.0, 2.1, 4.2):
        D.L.ajouter(B.tube([(x + math.cos(a) * 1.0, y + math.sin(a) * 1.0, D.z(x + math.cos(a), y + math.sin(a), 0.1)), (x, y, z + 2.6)], 0.04, 5), "fer")
    for k in range(3):
        D.L.ajouter(B.tore(0.14, 0.03, 10, 4), "or", B.mat4((x, y, z + 3.4 + k * 0.4)))
    D.L.ajouter(B.sphere(0.16, 10, 6), "or", B.mat4((x, y, z + 5.1)))
    for k in range(4):
        p = R.point(rnd, 0.2, 0.7, [(x, y, 1.5)])
        if p:
            D.L.ajouter(B.cyl(rnd.uniform(0.5, 0.9), rnd.uniform(0.5, 0.9), 0.04, 14), "eau", B.mat4((p[0], p[1], D.z(p[0], p[1], 0.0) + 0.03), ech=(1, 0.7, 1)))
    D.repere("orage", "orage", (0, 0, 11.0))
    rochers_cote(D, R, 10, 129, ("roche_noire", "pierre_fonce"))
    D.finir()


def ile_tresor(id_, coll):
    R = Relief(8.5, 139, plage=0.8)

    def h(x, y, t):
        return 0.3 + R.rampe(t, 2.4) * (0.55 + bosse(x, y, -2.0, 2.0, 1.7, 9) + fbm(x, y, 0.35, 3, 15) * 0.2)
    o, v, f = R.construire(f"{id_}_terrain", coll, h, peindre(0xf6e0b0, 0xb7c97a, 0x8ea854, 0x9a8f80, 2.4, graine=15))
    sol = Sol()
    sol.ajouter(v, f)
    D = Deco(id_, coll, sol, R)
    cx, cy = 2.0, -1.4
    for a in (math.pi / 4, -math.pi / 4):
        d = Vector((math.cos(a), math.sin(a), 0)) * 2.0
        trace_sol(D, [(cx - d.x, cy - d.y, 0), (cx + d.x, cy + d.y, 0)], 0.22, "rouge_fonce", dz=0.05)
    zc = D.z(cx, cy, 0.0)
    D.L.ajouter(B.cyl(1.0, 1.0, 0.04, 20), "bois_fonce", B.mat4((cx, cy, zc + 0.03)))
    for k in range(5):
        a = k * 0.5 + 2.6
        D.L.ajouter(B.caillou(0.45, k + 160, 0.25, 1, (1.3, 1, 0.55)), "sable", B.mat4((cx + math.cos(a) * 1.35, cy + math.sin(a) * 1.35, zc + 0.1)))
    # le coffre ouvert, plein d'or
    W = B.mat4((cx, cy, zc - 0.1), (0, 0, 0.5))
    D.L.ajouter(B.boite(1.25, 0.82, 0.62), "bois", W)
    for dx in (-0.42, 0.42):
        D.L.ajouter(B.boite(0.1, 0.86, 0.64), "or", W @ B.mat4((dx, 0, -0.01)))
    D.L.ajouter(B.boite(0.18, 0.06, 0.2), "or", W @ B.mat4((0, -0.43, 0.35)))
    ouvert = W @ B.mat4((0, 0.41, 0.62)) @ B.mat4(rot=(math.radians(-105), 0, 0))
    D.L.ajouter(B.boite(1.27, 0.84, 0.14), "bois", ouvert @ B.mat4((0, -0.42, 0)))
    D.L.ajouter(B.boite(0.1, 0.86, 0.16), "or", ouvert @ B.mat4((0.42, -0.42, -0.01)))
    D.L.ajouter(B.boite(0.1, 0.86, 0.16), "or", ouvert @ B.mat4((-0.42, -0.42, -0.01)))
    D.L.ajouter(B.demi_sphere(0.55, 14, 4), "or", W @ B.mat4((0, 0, 0.5), ech=(1.05, 0.68, 0.6)))
    rnd = random.Random(43)
    for k in range(34):
        a = rnd.uniform(0, 6.28)
        r = rnd.uniform(0.7, 1.9)
        x, y = cx + math.cos(a) * r, cy + math.sin(a) * r
        D.L.ajouter(B.cyl(0.11, 0.11, 0.035, 10), "or", B.mat4((x, y, D.z(x, y, 0.0) + 0.03), (rnd.uniform(-0.4, 0.4), rnd.uniform(-0.4, 0.4), 0)))
    for k in range(9):
        a = rnd.uniform(0, 6.28)
        D.L.ajouter(B.ico(0.13, 1), ("rose", "violet", "turquoise", "rouge")[k % 4], B.mat4((cx + math.cos(a) * 0.3, cy + math.sin(a) * 0.25, zc + 0.75 + rnd.uniform(0, 0.15))))
    # la pelle plantée dans le tas
    a = 2.9
    p = Vector((cx + math.cos(a) * 1.4, cy + math.sin(a) * 1.4, zc + 0.2))
    D.L.ajouter(B.tube([p, p + Vector((0.2, 0.1, 1.5))], 0.04, 6), "bois_clair")
    D.L.ajouter(B.boite(0.34, 0.06, 0.42), "fer", B.mat4(p - Vector((0, 0, 0.2)), (0, -0.13, 0.4)))
    D.L.ajouter(B.boite(0.3, 0.06, 0.06), "bois_fonce", B.mat4(p + Vector((0.2, 0.1, 1.5)), (0, 0, 0.4)))
    # le panneau, les cocotiers, les rochers de la colline
    sx, sy = -0.6, 0.6
    zs = D.z(sx, sy, 0.1)
    D.L.ajouter(B.cyl(0.07, 0.07, 1.8, 6), "bois", B.mat4((sx, sy, zs)))
    for k, (a, dz) in enumerate(((-0.5, 1.45), (2.3, 1.1))):
        D.L.ajouter(B.boite(0.95, 0.07, 0.28), "bois_clair", B.mat4((sx + math.cos(a) * 0.4, sy + math.sin(a) * 0.4, zs + dz), (0, 0, a)))
    for k in range(6):
        p = R.point(rnd, 0.35, 0.78, [(cx, cy, 4.3), (-2.0, 2.0, 1.6), (sx, sy, 1.5)])
        if p:
            palmier(D, p[0], p[1], 2.6 + rnd.random() * 1.2, graine=k + 90)
    for k in range(3):
        rocher(D, -2.0 + k * 0.7, 2.0 + (k % 2) * 0.6, 0.9 - k * 0.15, "pierre", k + 170, (1, 1, 1.1), 0.25)
    fleurs(D, R, 14, 47, eviter=[(cx, cy, 2.4)])
    D.repere("etincelles", "etincelles", (cx, cy, zc + 0.9))
    rochers_cote(D, R, 6, 141)
    D.finir()


CONSTRUCTEURS = {
    "port": ile_port, "plage": ile_plage, "recif": ile_recif, "volcan": ile_volcan, "glace": ile_glace,
    "lucioles": ile_lucioles, "champignons": ile_champignons, "ruines": ile_ruines, "moulins": ile_moulins,
    "marche": ile_marche, "arbre": ile_arbre, "dunes": ile_dunes, "phare": ile_phare, "orage": ile_orage, "tresor": ile_tresor,
}


def construire(ids=None, rendu=True):
    infos = {}
    for id_, (mx, mz, theme) in ILES.items():
        if ids and id_ not in ids:
            continue
        coll = B.collection("ile_" + id_)
        CONSTRUCTEURS[theme](id_, coll)
        tri = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in coll.objects if o.type == "MESH")
        infos[id_] = {"triangles": tri, "objets": len(coll.objects)}
        if rendu:
            grand = theme in ("arbre", "phare", "volcan")
            cam, cible = ((16, -27, 20), (0, 0, 4.0)) if grand else ((13, -21, 15), (0, 0, 1.6))
            infos[id_]["rendu"] = B.vitrine(["ile_" + id_], cam=cam, cible=cible, objectif=50, nom="ile-" + id_, taille=(1000, 680))
    if rendu:
        B.fin_vitrine()
    B.nettoyer()
    return infos


def exporter_tout(ids=None):
    """Exporte le navire et chaque île en .glb (dans Barhaw-3D/glb) et enregistre le .blend."""
    faits = {}
    if bpy.data.collections.get("navire") and not ids:
        faits["navire"] = B.exporter("navire", "navire.glb")[1]
    for id_ in ILES:
        if ids and id_ not in ids:
            continue
        if bpy.data.collections.get("ile_" + id_):
            faits[id_] = B.exporter("ile_" + id_, f"ile-{id_}.glb")[1]
    import os
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(B.DOSSIER, "Barhaw-GrandLine.blend"), copy=True)
    return faits


def vue_carte(nom="grand-line", taille=(1920, 1080), cam=(0, -118, 96), cible=(0, 4, 0), objectif=30, trait=0.6):
    """Un rendu de toute la Grand Line : chaque île à sa place sur la carte (et le navire en route)."""
    scene = bpy.context.scene
    carte = B.collection("carte")
    sources = ["navire"] + ["ile_" + i for i in ILES]
    for (id_, (mx, mz, theme)) in list(ILES.items()) + [("navire", (2.0, 5.0, None))]:
        c = bpy.data.collections.get("ile_" + id_ if id_ != "navire" else "navire")
        if not c:
            continue
        e = bpy.data.objects.new("carte_" + id_, None)
        e.instance_type = "COLLECTION"
        e.instance_collection = c
        e.location = (mx, -mz, 0)
        if id_ == "navire":
            e.rotation_euler = (0, 0, math.radians(35))
            e.scale = (1.5, 1.5, 1.5)
        carte.objects.link(e)
    exclus = {}
    for lc in bpy.context.view_layer.layer_collection.children:
        if lc.name in sources:
            exclus[lc.name] = lc.exclude
            lc.exclude = True
    try:
        chemin = B.vitrine(["carte"] + sources, cam=cam, cible=cible, objectif=objectif, nom=nom, taille=taille, mer_taille=300, trait=trait)
    finally:
        for n, v in exclus.items():
            bpy.context.view_layer.layer_collection.children[n].exclude = v
        B.fin_vitrine()
        B.collection("carte")
    return chemin
