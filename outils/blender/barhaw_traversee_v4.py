# La Traversée (V4) : le mini-jeu de GRAND LINE. On barre le navire de sa commu dans une mer sans fin.
# Ici, tout ce qu'on croise en mer (tout est inventé) :
#   aiguille    L'Aiguille : un piton de roche à strates, sa mousse, un nid de mouette, un crabe, des anatifes, des algues
#   jumeaux     Les Jumeaux : deux gros rochers noirs, un mât brisé planté entre eux, un drapeau déchiré qui claque
#   recif       Le Récif rose : une dalle basse couverte de coraux, d'oursins, d'étoiles de mer et de coquillages
#   tentacule   Le bras du monstre : il sort de l'eau (le site le fait monter), ventouses face au navire, il ondule
#   tourbillon  Le Tourbillon : un entonnoir d'eau, deux spirales d'écume qui tournent, une planche et un tonneau aspirés
#   tonneau     Le tonneau à ramasser : cerclé de fer, une corde, des algues ; il flotte
#   bouteille   La bouteille à la mer : un message roulé, un ruban rouge, un bouchon de cire ; elle flotte
#   bourrasque  Bourrasque, l'esprit du vent : un petit nuage aux joues gonflées qui souffle, des rubans de vent autour
# Un seul fichier : traversee-v4.glb (et traversee-v4-leger.glb pour les téléphones). Le site sépare les pièces par le
# début du nom. Les objets sont modélisés le nez (ou la face) vers −X : c'est de là qu'arrive le navire.
# Usage, dans Blender :  import barhaw_traversee_v4 as T; T.construire()
import math, random, bmesh, bpy
from mathutils import Vector, Matrix
import barhaw_base as B


class Piece:
    """Une pièce : son corps (immobile, sa patine cuite) et des parties animées, rangées par nom."""

    def __init__(self, nom, coll):
        self.nom, self.coll = nom, coll
        self.L = B.Lot()
        self.objets = []
        self.origines = {}

    def anim(self, part, lot, genre, origine=None, parent=None, **reglages):
        o = lot.objet(f"{self.nom}_{part}", self.coll, angle=40, origine=origine)
        self.origines[o.name] = Vector(origine or (0, 0, 0))
        if parent is not None:
            o.parent = parent
            o.matrix_parent_inverse = Matrix.Translation(self.origines[parent.name]).inverted()
        o["role"] = "anim"
        B.anime(o, genre, **reglages)
        self.objets.append(o)
        return o

    def finir(self):
        if self.L.vide():
            return None
        o = self.L.objet(f"{self.nom}_corps", self.coll, angle=40)
        o["role"] = "decor"
        self.objets.append(o)
        return o

    def racines(self):
        return [o for o in self.objets if o.parent is None]


def bruit(x, y, z, f=1.0):
    from mathutils import noise
    return noise.noise(Vector((x * f, y * f, z * f)))


def ecume(L, r=2.0, n=10, graine=0, taille=(0.3, 0.5)):
    """L'écume autour de ce qui sort de l'eau : des boules aplaties sur l'eau."""
    rnd = random.Random(graine)
    for k in range(n):
        a = k * 2 * math.pi / n + rnd.uniform(-0.25, 0.25)
        rr = r * rnd.uniform(0.92, 1.1)
        L.ajouter(B.sphere(rnd.uniform(*taille), 10, 6), "blanc", B.mat4((math.cos(a) * rr, math.sin(a) * rr, 0.02), (0, 0, a), (1.5, 1, 0.32)))


def anatifes(L, pts, graine=0):
    """Des petits coquillages coniques collés au rocher (à hauteur d'eau)."""
    rnd = random.Random(graine)
    for p, n in pts:
        n = Vector(n).normalized()
        rot = n.to_track_quat("Z", "Y").to_euler()
        r = rnd.uniform(0.07, 0.13)
        L.ajouter(B.cyl(r, r * 0.45, r * 1.1, 7), rnd.choice(("creme", "pierre", "blanc")), B.mat4(p, rot))
        L.ajouter(B.cyl(r * 0.35, r * 0.3, r * 1.2, 5), "noir", B.mat4(p, rot))


def algue(L, base, longueur, graine=0, mat="feuille", vers=(0, 0, -1)):
    """Une algue qui pend (ou qui pousse) : un ruban ondulé."""
    rnd = random.Random(graine)
    b = Vector(base)
    d = Vector(vers).normalized()
    pts = [b + d * longueur * t + Vector((math.sin(t * 7 + graine) * 0.12, math.cos(t * 5 + graine) * 0.12, 0)) for t in [k / 6 for k in range(7)]]
    L.ajouter(B.ruban(pts, [0.07, 0.1, 0.11, 0.1, 0.08, 0.05, 0.02], haut=(1, 0, 0) if abs(d.z) > 0.5 else (0, 0, 1), pli=0.3), mat)


def surface(o_bm, direction, hauteur, rayon_max=6.0):
    """Le point d'un caillou (bmesh déjà placé) dans une direction horizontale, à une hauteur : un lancer de rayon."""
    from mathutils.bvhtree import BVHTree
    arbre = BVHTree.FromBMesh(o_bm)
    d = Vector((direction[0], direction[1], 0)).normalized()
    hit = arbre.ray_cast(Vector((0, 0, hauteur)) + d * rayon_max, -d)
    return (hit[0], hit[1]) if hit[0] is not None else (d * 1.0 + Vector((0, 0, hauteur)), d)


def poser(L, bm, mat, M):
    """Ajoute un bmesh et rend une copie placée (pour y poser des détails)."""
    copie = bm.copy()
    copie.transform(M)
    L.ajouter(bm, mat, M)
    return copie


# ---------- L'Aiguille ----------
def aiguille(P):
    L = P.L
    rnd = random.Random(11)
    socle = poser(L, B.caillou(1.75, 1, 0.38, 3, (1.0, 0.92, 0.7)), "pierre_fonce", B.mat4((0, 0, -0.2)))
    milieu = poser(L, B.caillou(1.3, 2, 0.42, 3, (0.95, 0.85, 1.35)), "pierre", B.mat4((0.1, 0.05, 1.75), (0.05, -0.07, 0.3)))
    haut = poser(L, B.caillou(0.9, 3, 0.4, 3, (1.0, 0.9, 1.25)), "pierre", B.mat4((0.22, 0.1, 3.35), (0.08, -0.1, 0.8)))
    # des blocs tombés au pied, une corniche
    for k, (x, y, r) in enumerate(((1.5, 0.9, 0.55), (-1.2, 1.25, 0.42), (0.6, -1.6, 0.48), (-1.65, -0.5, 0.35))):
        L.ajouter(B.caillou(r, 20 + k, 0.4, 2, (1, 0.9, 0.75)), "pierre_fonce", B.mat4((x, y, 0.05), (0, 0, k)))
    L.ajouter(B.caillou(0.6, 25, 0.3, 2, (1.4, 1.0, 0.35)), "pierre", B.mat4((-0.75, -0.75, 1.2), (0.1, 0.2, 0.7)))
    # la mousse sur le sommet, des touffes d'herbe, un nid avec un œuf
    L.ajouter(B.demi_sphere(0.82, 18, 6), "mousse", B.mat4((0.3, 0.12, 4.18), (0.06, -0.1, 0), (1.05, 0.95, 0.42)))
    for k in range(9):
        a = k * 2 * math.pi / 9 + rnd.uniform(-0.2, 0.2)
        p = Vector((0.3 + math.cos(a) * 0.55, 0.12 + math.sin(a) * 0.5, 4.3))
        for j in range(3):
            b = a + (j - 1) * 0.35
            L.ajouter(B.ruban([p, p + Vector((math.cos(b) * 0.12, math.sin(b) * 0.12, 0.25)), p + Vector((math.cos(b) * 0.3, math.sin(b) * 0.3, 0.42))], [0.05, 0.035, 0.0], haut=(0, 0, 1), pli=0.4), "vert_clair")
    L.ajouter(B.tore(0.32, 0.1, 16, 6), "paille", B.mat4((0.45, -0.05, 4.48)))
    L.ajouter(B.sphere(0.13, 12, 8), "creme", B.mat4((0.45, -0.05, 4.55), (0.3, 0, 0), (1, 1, 1.25)))
    for k in range(6):
        L.ajouter(B.sphere(0.022, 5, 3), "pierre_fonce", B.mat4((0.45 + rnd.uniform(-0.08, 0.08), -0.05 + rnd.uniform(-0.08, 0.08), 4.6 + rnd.uniform(0, 0.1))))
    # une mouette posée tout en haut, qui regarde le navire arriver
    m = Vector((0.0, 0.35, 4.5))
    L.ajouter(B.sphere(0.2, 12, 8), "blanc", B.mat4(m, (0, -0.2, 0), (1.5, 0.85, 0.85)))
    L.ajouter(B.sphere(0.13, 10, 8), "blanc", B.mat4(m + Vector((-0.24, 0, 0.18))))
    L.ajouter(B.cyl(0.05, 0.0, 0.16, 6), "jaune", B.mat4(m + Vector((-0.34, 0, 0.17)), (0, -math.pi / 2, 0)))
    for s in (-1, 1):
        L.ajouter(B.sphere(0.03, 6, 4), "noir", B.mat4(m + Vector((-0.31, s * 0.08, 0.23))))
        L.ajouter(B.sphere(0.16, 10, 6), "gris", B.mat4(m + Vector((0.05, s * 0.15, 0.04)), (0, -0.25, 0), (1.5, 0.35, 0.6)))
        L.ajouter(B.tube([m + Vector((0.0, s * 0.06, -0.12)), m + Vector((0.02, s * 0.07, -0.3))], 0.015, 4), "orange")
    L.ajouter(B.cyl(0.08, 0.02, 0.25, 6), "noir", B.mat4(m + Vector((0.3, 0, 0.02)), (0, math.pi / 2 + 0.2, 0)))
    # les anatifes et les moules à hauteur d'eau, des algues qui pendent
    pts = []
    for k in range(26):
        a = rnd.uniform(0, 2 * math.pi)
        p, n = surface(socle, (math.cos(a), math.sin(a)), rnd.uniform(0.0, 0.8))
        pts.append((p, n))
    anatifes(L, pts, 3)
    for k in range(10):
        a = rnd.uniform(0, 2 * math.pi)
        p, n = surface(socle, (math.cos(a), math.sin(a)), 0.55)
        L.ajouter(B.sphere(0.12, 8, 5), "violet_fonce", B.mat4(p, n.to_track_quat("Z", "Y").to_euler(), (1.6, 0.7, 0.55)))
    for k in range(8):
        a = rnd.uniform(0, 2 * math.pi)
        p, n = surface(socle, (math.cos(a), math.sin(a)), 0.4)
        algue(L, p + n * 0.05, rnd.uniform(0.5, 0.8), k, "feuille", (n.x * 0.3, n.y * 0.3, -1))
    # le corail rose à la ligne d'eau, face au navire
    for k in range(5):
        p, n = surface(socle, (-1, rnd.uniform(-0.8, 0.8)), 0.05)
        base = p + n * 0.05
        for j in range(3):
            b = j * 2.1 + k
            L.ajouter(B.tube([base, base + Vector((-0.12 + math.cos(b) * 0.1, math.sin(b) * 0.15, 0.25)), base + Vector((-0.2 + math.cos(b) * 0.2, math.sin(b) * 0.25, 0.42))], [0.07, 0.05, 0.03], 6), "corail")
    # un crabe sur une corniche, pinces levées
    p, n = surface(milieu, (-0.7, -0.7), 1.15)
    c = p + n * 0.15
    L.ajouter(B.sphere(0.22, 12, 8), "rouge", B.mat4(c, (0, 0, -0.8), (1.25, 1, 0.55)))
    for s in (-1, 1):
        q = c + Vector((-0.14, s * 0.12, 0.14))
        L.ajouter(B.tube([c + Vector((-0.1, s * 0.08, 0.05)), q], 0.025, 5), "rouge")
        L.ajouter(B.sphere(0.05, 8, 6), "blanc", B.mat4(q))
        L.ajouter(B.sphere(0.028, 6, 4), "noir", B.mat4(q + Vector((-0.035, 0, 0.01))))
        pince = c + Vector((-0.32, s * 0.28, 0.12))
        L.ajouter(B.tube([c + Vector((-0.1, s * 0.18, 0)), pince], [0.04, 0.05], 6), "rouge")
        L.ajouter(B.sphere(0.1, 10, 6), "rouge_fonce", B.mat4(pince + Vector((-0.04, 0, 0.06)), (0, 0.4, s * 0.4), (1.2, 0.7, 0.9)))
        for j in range(3):
            L.ajouter(B.tube([c + Vector((0.05 - j * 0.07, s * 0.16, -0.02)), c + Vector((0.08 - j * 0.1, s * 0.34, -0.12))], 0.02, 4), "rouge_fonce")
    ecume(L, 1.85, 14, 1)


# ---------- Les Jumeaux ----------
def jumeaux(P):
    L = P.L
    rnd = random.Random(21)
    a = poser(L, B.caillou(1.35, 5, 0.32, 3, (1.0, 0.95, 1.05)), "roche_noire", B.mat4((0.1, -1.05, 0.15)))
    b = poser(L, B.caillou(1.15, 6, 0.34, 3, (1.0, 0.9, 1.2)), "pierre_fonce", B.mat4((-0.1, 1.0, 0.25), (0, 0, 0.6)))
    L.ajouter(B.caillou(0.55, 7, 0.4, 2), "pierre_fonce", B.mat4((-0.7, 0.05, -0.05)))
    for bm, g in ((a, 1), (b, 2)):
        pts = [surface(bm, (math.cos(t), math.sin(t)), rnd.uniform(-0.1, 0.6)) for t in [rnd.uniform(0, 6.3) for _ in range(16)]]
        anatifes(L, pts, g)
        for k in range(5):
            t = rnd.uniform(0, 6.3)
            p, n = surface(bm, (math.cos(t), math.sin(t)), 0.35)
            algue(L, p + n * 0.04, rnd.uniform(0.45, 0.7), k + g * 7, "vert_fonce", (n.x * 0.3, n.y * 0.3, -1))
    # le mât brisé, planté entre les deux, sa vergue, une corde qui pend
    pied = Vector((0.15, 0.0, 0.2))
    tete = Vector((0.55, 0.15, 3.6))
    L.ajouter(B.tube([pied, (pied + tete) / 2, tete], [0.16, 0.14, 0.12], 10), "bois2")
    # la cassure en dents de scie
    for k in range(6):
        t = k * 2 * math.pi / 6
        L.ajouter(B.cyl(0.05, 0.0, 0.22 + 0.12 * (k % 2), 4), "bois_clair", B.mat4(tete + Vector((math.cos(t) * 0.08, math.sin(t) * 0.08, -0.04)), (rnd.uniform(-0.3, 0.3), rnd.uniform(-0.3, 0.3), 0)))
    vergue = Vector((0.45, 0.12, 2.75))
    L.ajouter(B.tube([vergue + Vector((0, -1.0, -0.25)), vergue, vergue + Vector((0, 0.7, 0.12))], [0.06, 0.08, 0.05], 8), "bois")
    L.ajouter(B.tube(B.courbe(vergue + Vector((0, -0.95, -0.25)), pied + Vector((0.3, -0.6, 0.6)), vergue + Vector((0.2, -1.0, -1.4)), 8), 0.025, 5), "corde")
    L.ajouter(B.tore(0.22, 0.05, 14, 5), "corde", B.mat4(pied + Vector((0.05, 0, 0.7)), (0.2, 0, 0)))
    # le drapeau déchiré (il claque au vent) : une toile en lambeaux, rose et violet
    D = B.Lot()
    o = Vector((0.55, 0.12, 3.3))
    for k, (lg, dz, m) in enumerate(((1.8, 0.0, "rose"), (1.45, -0.34, "violet"), (1.05, -0.68, "rose"))):
        pts = [o + Vector((0.02 + t * 0.2, -t * lg, dz - t * 0.2 + math.sin(t * 5) * 0.09)) for t in [j / 6 for j in range(7)]]
        D.ajouter(B.ruban(pts, [0.19, 0.19, 0.18, 0.16, 0.13, 0.08, 0.02], haut=(0, 0, 1), pli=0.05), m)
    P.anim("drapeau", D, "drapeau", origine=o)
    ecume(L, 2.0, 16, 2)


# ---------- Le Récif rose ----------
def recif(P):
    L = P.L
    rnd = random.Random(31)
    dalle = poser(L, B.caillou(1.6, 9, 0.25, 3, (1.55, 1.1, 0.32)), "pierre", B.mat4((0, 0, -0.05)))
    L.ajouter(B.caillou(0.7, 10, 0.3, 2, (1, 0.9, 0.6)), "pierre_fonce", B.mat4((0.9, 0.45, 0.2)))
    L.ajouter(B.caillou(0.5, 12, 0.35, 2, (1, 1, 0.7)), "pierre_fonce", B.mat4((-1.1, -0.5, 0.15)))
    dalle.verts.index_update()
    sol = B.Sol([v.co for v in dalle.verts], [[v.index for v in f.verts] for f in dalle.faces])
    sur = lambda x, y: Vector((x, y, sol.z(x, y, 0.3)))
    # les coraux branchus
    for k in range(9):
        x, y = rnd.uniform(-1.8, 1.8), rnd.uniform(-1.1, 1.1)
        base = sur(x, y)
        mat = rnd.choice(("corail", "rose", "violet", "orange"))
        for j in range(rnd.randint(3, 4)):
            t = rnd.uniform(0, 6.3)
            h = rnd.uniform(0.4, 0.75)
            mid = base + Vector((math.cos(t) * 0.14, math.sin(t) * 0.14, h * 0.55))
            bout = base + Vector((math.cos(t) * 0.32, math.sin(t) * 0.32, h))
            L.ajouter(B.tube([base, mid, bout], [0.13, 0.1, 0.075], 8), mat)
            L.ajouter(B.sphere(0.095, 10, 6), mat, B.mat4(bout))
    # les éventails de mer
    for k in range(3):
        x, y = rnd.uniform(-1.4, 1.4), rnd.uniform(-0.9, 0.9)
        base = sur(x, y)
        t = rnd.uniform(0, 3.1)
        d = Vector((math.cos(t), math.sin(t), 0))
        pts = [base + Vector((0, 0, h)) + d * math.sin(h * 2.2) * 0.12 for h in (0, 0.2, 0.4, 0.6)]
        L.ajouter(B.ruban(pts, [0.05, 0.25, 0.33, 0.22], haut=d.cross(Vector((0, 0, 1))), pli=0.08), "violet")
    # des oursins (des piquants), des étoiles de mer, des coquillages
    for k in range(5):
        p = sur(rnd.uniform(-1.6, 1.6), rnd.uniform(-1.0, 1.0)) + Vector((0, 0, 0.06))
        L.ajouter(B.sphere(0.13, 10, 6), "violet_fonce", B.mat4(p))
        for j in range(10):
            u, w = rnd.uniform(0, 6.3), rnd.uniform(-0.1, 1.4)
            d = Vector((math.cos(u) * math.cos(w), math.sin(u) * math.cos(w), math.sin(w)))
            L.ajouter(B.cyl(0.04, 0.0, 0.24, 5), "violet_fonce", B.mat4(p + d * 0.1, d.to_track_quat("Z", "Y").to_euler()))
    for k in range(4):
        p = sur(rnd.uniform(-1.6, 1.6), rnd.uniform(-1.0, 1.0)) + Vector((0, 0, 0.03))
        L.ajouter(B.etoile(0.2, 0.08, 0.05, 5, 0.5), rnd.choice(("orange", "jaune", "rose_pale")), B.mat4(p, (0, 0, rnd.uniform(0, 6))))
    for k in range(7):
        p = sur(rnd.uniform(-1.7, 1.7), rnd.uniform(-1.0, 1.0)) + Vector((0, 0, 0.02))
        L.ajouter(B.demi_sphere(0.08, 10, 4), "creme", B.mat4(p, (0, 0, rnd.uniform(0, 6)), (1.2, 1, 0.6)))
    ecume(L, 2.1, 18, 3, (0.25, 0.45))
    L.ajouter(B.tore(1.75, 0.12, 30, 5), "blanc", B.mat4((0, 0, 0.0), (0, 0, 0), (1.15, 0.85, 0.35)))


# ---------- Le bras du monstre ----------
def tentacule(P):
    L = P.L
    # la ligne du bras : il sort de l'eau, monte, puis s'enroule vers le navire (vers −X)
    ligne = [Vector(p) for p in [(0.3, 0, -1.2), (0.2, 0, 0.6), (0.0, 0, 2.0), (-0.1, 0, 3.2), (-0.45, 0, 4.2), (-1.0, 0, 4.75), (-1.55, 0, 4.6), (-1.75, 0, 4.05), (-1.45, 0, 3.7), (-1.15, 0, 3.95)]]
    rayons = [0.78, 0.7, 0.6, 0.5, 0.42, 0.34, 0.27, 0.2, 0.14, 0.08]
    coupes = [0, 3, 5, 7, 9]  # quatre morceaux, chacun ondule sur le précédent
    precedent = None
    rnd = random.Random(41)
    for k in range(4):
        i0, i1 = coupes[k], coupes[k + 1]
        S = B.Lot()
        pts = ligne[i0:i1 + 1]
        rs = rayons[i0:i1 + 1]
        # un peu de recouvrement entre deux morceaux, pour que l'articulation ne se voie pas
        if k > 0:
            pts = [ligne[i0] + (ligne[i0] - ligne[i0 + 1]) * 0.15] + pts
            rs = [rayons[i0] * 1.02] + rs
        fins = []
        for j in range(len(pts) - 1):
            for u in range(4):
                t = u / 4
                fins.append((pts[j] * (1 - t) + pts[j + 1] * t, rs[j] * (1 - t) + rs[j + 1] * t))
        fins.append((pts[-1], rs[-1]))
        S.ajouter(B.tube([p for p, _ in fins], [r for _, r in fins], 18), "violet_fonce")
        # le dessous clair et les ventouses, du côté du navire (−X, et vers le bas dans la boucle)
        for j, (p, r) in enumerate(fins[:-1]):
            q = fins[j + 1][0]
            t = (q - p).normalized()
            dehors = t.cross(Vector((0, 1, 0))).normalized()  # le côté intérieur de la courbe
            if dehors.x > 0:
                dehors = -dehors
            S.ajouter(B.sphere(r * 0.98, 12, 8), "ventre", B.mat4(p + dehors * r * 0.18, (0, 0, 0), 1.0))
            if j % 2 == 0 and r > 0.1:
                for s in (-1, 1):
                    c = p + dehors * r * 0.92 + Vector((0, s * r * 0.38, 0))
                    rot = (dehors * 1.0 + Vector((0, s * 0.35, 0))).normalized().to_track_quat("Z", "Y").to_euler()
                    S.ajouter(B.cyl(r * 0.24, r * 0.2, r * 0.18, 12), "ventouse", B.mat4(c, rot))
                    S.ajouter(B.tore(r * 0.15, r * 0.045, 12, 4), "ventre", B.mat4(c + (dehors * r * 0.16), rot))
        # des taches sur le dessus
        for j in range(5 if k < 3 else 2):
            p, r = fins[rnd.randrange(len(fins) - 1)]
            u = rnd.uniform(-1.2, 1.2)
            d = Vector((math.cos(u) * 0.6 + 0.4, math.sin(u), rnd.uniform(-0.3, 0.3))).normalized()
            S.ajouter(B.sphere(r * 0.28, 8, 5), "tache", B.mat4(p + d * r * 0.92, d.to_track_quat("Z", "Y").to_euler(), (1, 1, 0.25)))
        o = P.anim(f"s{k + 1}", S, "balance", origine=tuple(ligne[i0]), parent=precedent, axe=[0, 1, 0], ampl=[0.07, 0.13, 0.2, 0.3][k], vitesse=1.8, phase=k * 0.75)
        precedent = o
    # l'eau qui bouillonne autour du bras
    ecume(L, 1.15, 12, 4, (0.3, 0.5))
    L.ajouter(B.tore(1.3, 0.14, 26, 5), "blanc", B.mat4((0.3, 0, 0.0), (0, 0, 0), (1, 1, 0.3)))
    for k in range(8):
        a = k * 0.8
        L.ajouter(B.sphere(0.1 + (k % 3) * 0.04, 8, 5), "blanc", B.mat4((0.3 + math.cos(a) * 1.7, math.sin(a) * 1.7, 0.05)))


# ---------- Le Tourbillon ----------
def tourbillon(P):
    L = P.L
    R = 4.2
    # l'entonnoir : un disque creusé au centre
    bm = bmesh.new()
    anneaux, seg = 14, 48
    rangs = []
    for i in range(anneaux + 1):
        r = R * (i / anneaux) ** 0.8
        z = -1.7 * math.exp(-(r / 1.7) ** 2) + 0.02
        rangs.append([bm.verts.new((math.cos(2 * math.pi * k / seg + i * 0.18) * r, math.sin(2 * math.pi * k / seg + i * 0.18) * r, z)) for k in range(seg)])
    for i in range(anneaux):
        for k in range(seg):
            bm.faces.new((rangs[i][k], rangs[i][(k + 1) % seg], rangs[i + 1][(k + 1) % seg], rangs[i + 1][k]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.001)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        if f.normal.z < 0:
            f.normal_flip()
    L.ajouter(bm, "ocean")
    ecume(L, R * 0.98, 22, 5, (0.3, 0.55))
    profond = lambda r: -1.7 * math.exp(-(r / 1.7) ** 2) + 0.07

    def spirale(lot, tours, decalage, larg, mat, n=60):
        for bras in range(3):
            pts, ls = [], []
            for j in range(n):
                t = j / (n - 1)
                r = R * 0.95 * (1 - t) + 0.25 * t
                a = bras * 2 * math.pi / 3 + decalage + t * tours * 2 * math.pi
                pts.append(Vector((math.cos(a) * r, math.sin(a) * r, profond(r) + 0.02)))
                ls.append(larg * (0.35 + 0.65 * math.sin(math.pi * min(1, t * 1.25))))
            lot.ajouter(B.ruban(pts, ls, haut=(0, 0, 1), pli=0.02), mat)
    A = B.Lot()
    spirale(A, 1.35, 0.0, 0.32, "blanc")
    P.anim("spirale", A, "tourne", axe=[0, 0, 1], vitesse=1.6)
    C = B.Lot()
    spirale(C, 1.1, 1.0, 0.18, "eau_douce")
    # aspirés : une planche et un petit tonneau sur la spirale lente
    r = 2.6
    C.ajouter(B.boite(0.9, 0.22, 0.07), "planche", B.mat4((r, 0, profond(r) + 0.08), (0.1, 0.05, 0.9)))
    r2 = 1.9
    C.ajouter(B.tube([(-0.25, 0, 0), (0, 0, 0), (0.25, 0, 0)], [0.16, 0.2, 0.16], 10), "bois_clair", B.mat4((-r2 * 0.7, r2 * 0.7, profond(r2) + 0.15), (0.3, 0.2, 0.8)))
    P.anim("remous", C, "tourne", axe=[0, 0, 1], vitesse=1.0)


# ---------- Le tonneau à ramasser ----------
def tonneau(P):
    T = B.Lot()
    # couché, l'axe en Y (de travers par rapport au navire)
    prof = [(-0.55, 0.4), (-0.4, 0.47), (-0.2, 0.52), (0.0, 0.54), (0.2, 0.52), (0.4, 0.47), (0.55, 0.4)]
    douves = B.tube([(0, y, 0) for y, _ in prof], [r for _, r in prof], 16)
    # des douves claires et foncées (une sur deux)
    couche = douves.faces.layers.int.new("mat")
    for i, f in enumerate(douves.faces):
        c = f.calc_center_median()
        a = math.atan2(c.z, c.x)
        f[couche] = int(((a + math.pi) / (2 * math.pi)) * 16) % 2
    T.ajouter(douves, None, couche_mat=("mat", ["bois_clair", "planche"]))
    for y, r in ((-0.42, 0.475), (-0.18, 0.53), (0.18, 0.53), (0.42, 0.475)):
        T.ajouter(B.tore(r + 0.015, 0.035, 22, 5), "fer", B.mat4((0, y, 0), (math.pi / 2, 0, 0)))
    for s in (-1, 1):
        T.ajouter(B.cyl(0.38, 0.38, 0.04, 16), "bois_fonce", B.mat4((0, s * 0.54, 0), (math.pi / 2, 0, 0)))
    T.ajouter(B.cyl(0.07, 0.06, 0.08, 8), "bois_fonce", B.mat4((0, 0, 0.52)))
    T.ajouter(B.cyl(0.05, 0.05, 0.1, 8), "bois_clair", B.mat4((0, 0, 0.56)))
    # une corde nouée, des algues accrochées, une étoile de mer collée
    T.ajouter(B.tore(0.545, 0.03, 22, 4), "corde", B.mat4((0, 0.05, 0), (math.pi / 2, 0.15, 0)))
    T.ajouter(B.tube(B.courbe((0.5, 0.05, 0.1), (0.75, 0.3, -0.25), (0.8, 0.0, 0.1), 6), 0.025, 4), "corde")
    algue(T, (-0.3, -0.2, 0.42), 0.5, 3, "feuille", (-1, -0.2, -0.6))
    algue(T, (-0.2, 0.25, 0.46), 0.4, 5, "vert_fonce", (-1, 0.3, -0.7))
    T.ajouter(B.etoile(0.14, 0.06, 0.04, 5, 0.5), "orange", B.mat4((-0.25, -0.05, 0.46), (0.5, 0, 0.4)))
    P.anim("flotte", T, "flotte", ampl=0.08, phase=0.0)


# ---------- La bouteille à la mer ----------
def bouteille(P):
    T = B.Lot()
    prof = [(-0.42, 0.0), (-0.41, 0.17), (-0.3, 0.2), (0.15, 0.2), (0.27, 0.15), (0.33, 0.075), (0.5, 0.07), (0.53, 0.085)]
    pts = [(x, 0, 0) for x, _ in prof]
    rs = [max(r, 0.02) for _, r in prof]
    T.ajouter(B.tube(pts, rs, 16), "verre")
    # dedans : le message roulé et son ruban rouge
    T.ajouter(B.tube([(-0.3, 0, -0.02), (0.18, 0, -0.02)], 0.1, 12), "creme")
    T.ajouter(B.tore(0.105, 0.022, 14, 4), "rouge", B.mat4((-0.05, 0, -0.02), (0, math.pi / 2, 0)))
    T.ajouter(B.cyl(0.06, 0.06, 0.16, 10), "bois_clair", B.mat4((0.48, 0, 0), (0, math.pi / 2, 0)))
    T.ajouter(B.sphere(0.09, 10, 6), "rouge_fonce", B.mat4((0.62, 0, 0), (0, 0, 0), (0.5, 1, 1)))
    P.anim("flotte", T, "flotte", ampl=0.1, phase=1.3, origine=None)


# ---------- Bourrasque, l'esprit du vent ----------
def bourrasque(P):
    T = B.Lot()
    rnd = random.Random(61)
    # le corps : un nuage dodu (la face vers −X)
    for p, r in (((0, 0, 0), 0.75), ((0.35, 0.45, 0.15), 0.5), ((0.35, -0.45, 0.15), 0.5), ((0.2, 0, 0.55), 0.5), ((0.55, 0, -0.15), 0.55), ((0.75, 0.3, 0.25), 0.35), ((0.75, -0.3, 0.25), 0.35)):
        T.ajouter(B.sphere(r, 18, 12), "blanc", B.mat4(p))
    # la queue qui s'enroule
    queue = [Vector((0.9 + t * 1.3, math.sin(t * 5) * 0.35 * t, -0.1 + math.cos(t * 5) * 0.35 * t)) for t in [k / 9 for k in range(10)]]
    T.ajouter(B.tube(queue, [0.42 * (1 - t) + 0.04 for t in [k / 9 for k in range(10)]], 12), "creme")
    # la figure : de grands yeux, les joues gonflées et roses, la bouche en O qui souffle
    for s in (-1, 1):
        e = Vector((-0.62, s * 0.24, 0.18))
        T.ajouter(B.sphere(0.15, 14, 10), "blanc", B.mat4(e, (0, 0, 0), (0.6, 1, 1.2)))
        T.ajouter(B.sphere(0.1, 12, 8), "noir", B.mat4(e + Vector((-0.06, -s * 0.01, -0.01)), (0, 0, 0), (0.5, 1, 1.2)))
        T.ajouter(B.sphere(0.035, 6, 4), "blanc", B.mat4(e + Vector((-0.1, -s * 0.03, 0.06))))
        T.ajouter(B.tube([e + Vector((0.02, s * -0.12, 0.2)), e + Vector((-0.04, 0, 0.25)), e + Vector((0.0, s * 0.12, 0.22))], 0.02, 4), "noir")
        T.ajouter(B.sphere(0.24, 12, 8), "blanc", B.mat4((-0.5, s * 0.36, -0.15)))
        T.ajouter(B.sphere(0.1, 10, 6), "rose_pale", B.mat4((-0.7, s * 0.4, -0.12), (0, 0, 0), (0.4, 1, 0.7)))
    T.ajouter(B.tore(0.08, 0.035, 14, 6), "rose", B.mat4((-0.78, 0, -0.17), (0, math.pi / 2, 0)))
    T.ajouter(B.cyl(0.07, 0.07, 0.02, 10), "noir", B.mat4((-0.77, 0, -0.17), (0, math.pi / 2, 0)))
    corps = P.anim("corps", T, "flotte", ampl=0.22, phase=0.4)
    # les rubans de vent qui tournent autour
    V = B.Lot()
    for k in range(3):
        a0 = k * 2 * math.pi / 3
        pts, ls = [], []
        for j in range(18):
            t = j / 17
            a = a0 + t * 2.4
            pts.append(Vector((0.3 + math.cos(a) * 1.25, math.sin(a) * 1.25, 0.15 + math.sin(t * 6 + k) * 0.18)))
            ls.append(0.11 * math.sin(math.pi * t) + 0.01)
        V.ajouter(B.ruban(pts, ls, haut=(0, 0, 1), pli=0.04), "turquoise" if k == 1 else "creme")
    P.anim("rubans", V, "tourne", axe=[0, 0, 1], vitesse=2.2)
    # devant la bouche : trois petites rafales
    R = B.Lot()
    for k in range(3):
        y = (k - 1) * 0.22
        R.ajouter(B.tube(B.courbe((-0.95, y, -0.17), (-1.9, y * 1.8, -0.1 + (k - 1) * 0.08), (-1.4, y * 0.5 + 0.12, -0.3), 7), [0.05, 0.07, 0.08, 0.075, 0.06, 0.04, 0.015], 7), "glace")
    P.anim("souffle", R, "balance", origine=(-0.9, 0, -0.17), axe=[0, 0, 1], ampl=0.12, vitesse=4.0)


PIECES = {"aiguille": aiguille, "jumeaux": jumeaux, "recif": recif, "tentacule": tentacule, "tourbillon": tourbillon,
          "tonneau": tonneau, "bouteille": bouteille, "bourrasque": bourrasque}


def cuire(o, echantillons=32, mouille=True):
    """L'ombre des recoins (AO) dans les couleurs des sommets, et la bande mouillée à hauteur d'eau."""
    scene = bpy.context.scene
    me = o.data
    attr = me.color_attributes.get("Couleur") or me.color_attributes.new("Couleur", "FLOAT_COLOR", "POINT")
    me.color_attributes.active_color = attr
    moteur = scene.render.engine
    ok = True
    try:
        scene.render.engine = "CYCLES"
        scene.cycles.samples = echantillons
        for x in bpy.context.selected_objects:
            x.select_set(False)
        for c in o.users_collection:
            B.inclure(c.name)
        o.hide_set(False)
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        scene.render.bake.target = "VERTEX_COLORS"
        bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
    except Exception as e:
        ok = str(e)
    finally:
        scene.render.engine = moteur
    mw = o.matrix_world
    roche = set()
    noms = [m.name for m in me.materials]
    for p in me.polygons:
        if noms[p.material_index] in ("pierre", "pierre_fonce", "roche_noire"):
            roche.update(p.vertices)
    for i, v in enumerate(me.vertices):
        c = attr.data[i].color
        ao = 0.72 + 0.28 * (max(0.0, min(1.0, c[0])) if ok is True else 1.0)
        z = (mw @ v.co).z
        bande = max(0.0, 1 - abs(z - 0.15) / 0.55) if mouille else 0.0
        m = 1.0 - 0.16 * bande  # la roche mouillée, juste au-dessus de l'eau
        if i in roche:  # les strates de la roche, un peu penchées
            m *= 0.9 + 0.1 * (1 if math.sin(z * 4.2 + (mw @ v.co).x * 0.6) > 0 else 0) + 0.04 * math.sin(z * 17)
        attr.data[i].color = (ao * m, ao * m, min(1.4, ao * m * (1.0 + 0.08 * bande)), 1.0)
    me.update()
    return ok


def construire(rendu=True, exporter=True):
    coll = B.collection("traversee")
    B.nettoyer()
    infos = {}
    pieces = {}
    for k, (nom, fabrique) in enumerate(PIECES.items()):
        P = Piece(nom, coll)
        fabrique(P)
        P.finir()
        pieces[nom] = P
    # chaque pièce est cuite seule (écartée des autres le temps de la cuisson)
    for k, (nom, P) in enumerate(pieces.items()):
        loin = Vector((k * 40.0, 300.0, 0))
        for o in P.racines():
            o.location = o.location + loin
        bpy.context.view_layer.update()
    bpy.context.view_layer.update()
    for nom, P in pieces.items():
        infos[nom] = [cuire(o, mouille=nom in ("aiguille", "jumeaux", "recif", "tentacule")) for o in P.objets if o.type == "MESH"]
    for k, (nom, P) in enumerate(pieces.items()):
        loin = Vector((k * 40.0, 300.0, 0))
        for o in P.racines():
            o.location = o.location - loin
    bpy.context.view_layer.update()
    B.nettoyer()
    infos["triangles"] = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in coll.objects if o.type == "MESH")
    if exporter:
        infos["glb"] = B.exporter(coll.name, "traversee-v4.glb")
        infos["leger"] = B.exporter_leger(coll.name, "traversee-v4-leger.glb", ratio=0.5)
    if rendu:
        decal = {"tentacule": (-9, 9, 0), "aiguille": (-3, 3, 0), "jumeaux": (3, -3, 0), "recif": (9, -9, 0),
                 "tourbillon": (-11, -3, -0.0), "tonneau": (-4.5, -9.5, 0.35), "bouteille": (-3.2, -10.6, 0.25), "bourrasque": (0.5, -14, 2.0)}
        for nom, P in pieces.items():
            for o in P.racines():
                o.location = o.location + Vector(decal[nom])
        infos["rendu"] = B.vitrine([coll.name], cam=(-24, -24, 12), cible=(-2, -2, 1.0), objectif=38, nom="traversee", taille=(1600, 1000), mer=False)
        B.fin_vitrine()
        for nom, P in pieces.items():
            for o in P.racines():
                o.location = o.location - Vector(decal[nom])
    return infos
