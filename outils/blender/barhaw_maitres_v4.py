# Les maîtres des lieux de la V4 (un par île refaite) et le vaisseau fantôme. Tous inventés, aucun personnage existant.
# Chacun sort de l'eau devant son île (le site le fait monter) : le bas du corps est sous l'eau (z < 0).
#   phare       Mère Brume, la gardienne : faite de brouillard, capuche, yeux qui brillent, vieille lanterne
#   marais      Le Roi Crapaud-Lanterne : un crapaud énorme, une couronne de bougies, une lanterne au bout d'une tige
#   cristal     La Mante Prisme : une mante de cristal, des lames aux bras, des ailes de verre
#   archipel    Nimbus, le serpent des nuages : un long corps de nuages enroulé, une crinière, des cornes dorées
#   cimetiere   Capitaine Calcaire : un capitaine squelette, tricorne à plume verte, manteau en lambeaux, sabre
#   horloge     Le Grand Remontoir : un automate de cuivre, un cadran sur la poitrine, une clé dans le dos qui tourne
#   geants      Ronchon, le géant réveillé : un buste de roche et de mousse, des sourcils froncés, des poings levés
#   forteresse  L'Amiral Boulet : un corsaire costaud, bicorne, grosse moustache, un canon à la place du bras
#   fantome     Le vaisseau fantôme : une coque grise, des voiles déchirées, des lueurs vertes (événement en mer)
# Usage, dans Blender :  import barhaw_maitres_v4 as M; M.construire("marais")   (ou M.construire() pour tous)
import math, random, bmesh, bpy
from mathutils import Vector
import barhaw_base as B


class Modele:
    """Un modèle : le corps (un seul objet, sa patine cuite) et des pièces animées à part."""

    def __init__(self, id_, coll):
        self.id, self.coll = id_, coll
        self.L = B.Lot()
        self.lumieres = []

    def anim(self, nom, lot, genre, origine=None, **reglages):
        o = lot.objet(f"{self.id}_{nom}", self.coll, angle=40, origine=origine)
        o["role"] = "anim"
        B.anime(o, genre, **reglages)
        return o

    def repere(self, nom, genre, pos, **reglages):
        e = bpy.data.objects.new(f"{self.id}_{nom}", None)
        self.coll.objects.link(e)
        e.location = Vector(pos)
        e["role"] = "repere"
        B.anime(e, genre, **reglages)
        return e

    def finir(self):
        o = self.L.objet(f"{self.id}_corps", self.coll, angle=40)
        o["role"] = "decor"
        return o


def yeux(L, centre, ecart, r, regard=(1, 0, 0), iris="or", pupille="noir", fente=False):
    c = Vector(centre)
    d = Vector(regard).normalized()
    cote = d.cross(Vector((0, 0, 1))).normalized()
    for s in (-1, 1):
        p = c + cote * s * ecart
        L.ajouter(B.sphere(r, 16, 12), "blanc", B.mat4(p))
        L.ajouter(B.sphere(r * 0.55, 12, 8), iris, B.mat4(p + d * r * 0.62))
        L.ajouter(B.sphere(r * 0.28, 10, 6), pupille, B.mat4(p + d * r * 0.86, (0, 0, 0), (0.6, 1, 1.6) if fente else 1.0))
        L.ajouter(B.sphere(r * 0.12, 6, 4), "blanc", B.mat4(p + d * r * 0.8 + Vector((0, 0, r * 0.3))))


def ecume(L, r=3.0, n=10, graine=0):
    """L'écume autour de ce qui sort de l'eau."""
    rnd = random.Random(graine)
    for k in range(n):
        a = k * 2 * math.pi / n + rnd.uniform(-0.2, 0.2)
        L.ajouter(B.sphere(rnd.uniform(0.35, 0.6), 10, 6), "blanc", B.mat4((math.cos(a) * r, math.sin(a) * r, 0.05), (0, 0, 0), (1.3, 1, 0.4)))


# ---------- Mère Brume, la gardienne du phare ----------
def mere_brume(M):
    L = M.L
    rnd = random.Random(11)
    # la robe de brouillard : des boules de brume empilées, de plus en plus fines vers le haut
    for k in range(9):
        z = -2.0 + k * 0.75
        r = 2.0 - k * 0.15
        for j in range(7):
            a = j * 2 * math.pi / 7 + k * 0.4
            L.ajouter(B.sphere(r * 0.55, 12, 8), "blanc" if (j + k) % 3 else "glace", B.mat4((math.cos(a) * r * 0.6, math.sin(a) * r * 0.6, z), (0, 0, 0), (1, 1, 0.8)))
    # le châle, la capuche, l'ombre du visage, les yeux qui brillent
    L.ajouter(B.cyl(1.6, 0.9, 1.4, 20), "gris", B.mat4((0, 0, 4.2)))
    L.ajouter(B.sphere(1.05, 18, 12), "gris", B.mat4((0, 0, 6.1), (0, 0, 0), (1, 1, 1.25)))
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
        a = k * math.pi / 2 + math.pi / 4
        G.ajouter(B.cyl(0.03, 0.03, 0.62, 4), "fer", B.mat4(p + Vector((math.cos(a) * 0.3, math.sin(a) * 0.3, -1.32))))
    G.ajouter(B.cyl(0.36, 0.05, 0.3, 8), "fer", B.mat4(p + Vector((0, 0, -0.72))))
    G.ajouter(B.cyl(0.34, 0.34, 0.08, 8), "fer", B.mat4(p + Vector((0, 0, -1.38))))
    M.anim("lanterne", G, "balance", origine=tuple(p), axe=[1, 0, 0], ampl=0.18, vitesse=1.3)
    M.lumieres += [p + Vector((0, 0, -1.0)), Vector((0.9, 0, 6.15))]
    ecume(L, 2.4, 12, 12)


# ---------- Le Roi Crapaud-Lanterne ----------
def roi_crapaud(M):
    L = M.L
    F = B.Lot()
    # le nénuphar géant sur lequel il est assis
    L.ajouter(B.cyl(4.2, 4.2, 0.25, 36), "vert", B.mat4((0, 0, -0.15)))
    L.ajouter(B.boite(4.2, 0.6, 0.3), "vert_fonce", B.mat4((2.4, 0, -0.12), (0, 0, 0.2)))
    # le corps (rond, verruqueux), le ventre clair, la gorge
    L.ajouter(B.sphere(3.0, 24, 16), "mousse", B.mat4((0, 0, 2.3), (0, 0, 0), (1.05, 1.0, 0.85)))
    L.ajouter(B.sphere(2.5, 20, 14), "creme", B.mat4((1.1, 0, 1.9), (0, 0, 0), (0.75, 0.95, 0.8)))
    L.ajouter(B.sphere(1.3, 16, 10), "rose_pale", B.mat4((2.3, 0, 2.6), (0, 0, 0), (0.6, 1.0, 0.7)))
    rnd = random.Random(21)
    for k in range(40):
        a, b = rnd.uniform(-2.8, 2.8), rnd.uniform(0.3, 1.4)
        p = Vector((math.cos(a) * math.cos(b) * 3.1, math.sin(a) * math.cos(b) * 3.0, 2.3 + math.sin(b) * 2.55))
        if p.x > 1.6 and abs(p.y) < 1.6:
            continue
        L.ajouter(B.demi_sphere(rnd.uniform(0.12, 0.28), 10, 4), rnd.choice(("vert_fonce", "vert", "jaune")), B.mat4(p, (0, -b + math.pi / 2, a)))
    # la grande bouche (une lèvre sombre), les yeux énormes sur le dessus
    L.ajouter(B.tube([(2.4, -1.9, 3.3), (2.9, -1.0, 3.0), (3.05, 0, 2.95), (2.9, 1.0, 3.0), (2.4, 1.9, 3.3)], 0.12, 8), "prune")
    yeux(L, (1.7, 0, 4.7), 1.05, 0.72, (1, 0, 0.15), "or", "noir", fente=True)
    for s in (-1, 1):
        L.ajouter(B.tore(0.72, 0.16, 20, 6), "mousse", B.mat4((1.7, s * 1.05, 4.75), (0, math.pi / 2 - 0.15, 0)))
    # les pattes avant (doigts palmés) et les cuisses
    for s in (-1, 1):
        L.ajouter(B.sphere(1.3, 16, 10), "mousse", B.mat4((-0.6, s * 2.6, 1.0), (0, 0, 0), (1.5, 0.8, 0.8)))
        L.ajouter(B.tube([(1.8, s * 1.9, 2.0), (2.6, s * 2.2, 0.9), (3.1, s * 2.1, 0.2)], [0.42, 0.36, 0.3], 10), "mousse")
        for j in range(3):
            a = -0.5 + j * 0.5
            L.ajouter(B.tube([(3.1, s * 2.1, 0.2), (3.1 + math.cos(a) * 0.7, s * 2.1 + math.sin(a) * 0.7 * s, 0.12)], [0.16, 0.12], 6), "mousse")
            L.ajouter(B.sphere(0.16, 8, 6), "jaune", B.mat4((3.1 + math.cos(a) * 0.75, s * 2.1 + math.sin(a) * 0.75 * s, 0.14)))
    # la couronne de bougies
    L.ajouter(B.tore(1.15, 0.16, 28, 6), "or", B.mat4((0.2, 0, 4.95)))
    for k in range(9):
        a = k * 2 * math.pi / 9
        q = Vector((0.2 + math.cos(a) * 1.15, math.sin(a) * 1.15, 5.05))
        hh = 0.5 + (k % 3) * 0.2
        L.ajouter(B.cyl(0.13, 0.12, hh, 8), "creme", B.mat4(q))
        F.ajouter(B.cyl(0.08, 0.0, 0.3, 6), "lumiere", B.mat4(q + Vector((0, 0, hh))))
        L.ajouter(B.sphere(0.06, 6, 4), "rouge_fonce", B.mat4(q + Vector((math.cos(a) * 0.17, math.sin(a) * 0.17, 0.05))))
    M.anim("flammes", F, "clignote", lent=1)
    # la tige qui sort du crâne et la lanterne qui pend au bout (elle se balance)
    tige = [(-0.4, 0, 5.0), (0.2, 0, 7.0), (1.6, 0, 7.9), (2.9, 0, 7.6)]
    L.ajouter(B.tube(tige, [0.18, 0.13, 0.09, 0.07], 8), "mousse")
    G = B.Lot()
    p = Vector(tige[-1])
    G.ajouter(B.tube([p, p + Vector((0, 0, -0.7))], 0.025, 4), "corde")
    G.ajouter(B.sphere(0.45, 14, 10), "lumiere", B.mat4(p + Vector((0, 0, -1.2)), (0, 0, 0), (1, 1, 1.2)))
    for dz in (-0.68, -1.72):
        G.ajouter(B.cyl(0.22, 0.22, 0.1, 10), "noir", B.mat4(p + Vector((0, 0, dz - 0.05))))
    for j in range(4):
        G.ajouter(B.tore(0.46 - abs(j - 1.5) * 0.06, 0.03, 18, 3), "rouge_fonce", B.mat4(p + Vector((0, 0, -1.55 + j * 0.23))))
    M.anim("lanterne", G, "balance", origine=tuple(p), axe=[0, 1, 0], ampl=0.2, vitesse=1.1)
    M.lumieres += [p + Vector((0, 0, -1.2)), Vector((0.2, 0, 5.6))]
    ecume(L, 4.3, 14, 22)


# ---------- La Mante Prisme ----------
def prisme_(L, a, b, r, mat):
    a, b = Vector(a), Vector(b)
    d = b - a
    rot = d.to_track_quat("Z", "Y").to_euler()
    L.ajouter(B.cyl(r, r * 0.8, d.length * 0.82, 6), mat, B.mat4(a, rot))
    L.ajouter(B.cyl(r * 0.8, 0.0, d.length * 0.18, 6), mat, B.mat4(a + d * 0.82, rot))


def mante_prisme(M):
    L = M.L
    C = B.Lot()
    # l'abdomen (dans l'eau), le thorax dressé, la tête triangulaire
    for k in range(5):
        L.ajouter(B.sphere(1.1 - k * 0.12, 12, 8), "cristal" if k % 2 else "violet", B.mat4((-2.6 + k * 0.62, 0, 0.2 + k * 0.25), (0, 0, 0), (1.0, 0.9, 0.75)))
    prisme_(L, (0.1, 0, 1.0), (0.6, 0, 5.4), 0.55, "cristal")
    C.ajouter(B.cyl(0.18, 0.15, 3.2, 6), "lumiere", B.mat4((0.15, 0, 1.4), (0, 0.11, 0)))
    L.ajouter(B.sphere(0.95, 3, 2), "rose_pale", B.mat4((0.9, 0, 6.0), (0, 0, 0), (0.9, 1.4, 1.0)))
    yeux(L, (1.2, 0, 6.3), 0.8, 0.42, (1, 0, 0), "turquoise", "violet_fonce")
    for s in (-1, 1):
        L.ajouter(B.tube([(1.0, s * 0.25, 6.7), (1.4, s * 0.7, 8.0), (2.4, s * 1.4, 8.6)], [0.05, 0.04, 0.02], 5), "cristal")
    # les bras ravisseurs repliés : deux grandes lames de cristal (elles bougent)
    for s in (-1, 1):
        G = B.Lot()
        epaule = Vector((0.7, s * 0.55, 4.6))
        coude = epaule + Vector((1.4, s * 0.6, 0.6))
        main = coude + Vector((0.6, s * 0.1, -1.9))
        prisme_(G, epaule, coude, 0.28, "cristal")
        prisme_(G, coude, main, 0.22, "violet")
        for j in range(4):
            q = coude + (main - coude) * (0.2 + j * 0.2)
            G.ajouter(B.cyl(0.07, 0.0, 0.4, 4), "glace", B.mat4(q, (0, -1.2, 0)))
        prisme_(G, main, main + Vector((-0.2, 0, 1.4)), 0.12, "glace")
        M.anim(f"bras{s > 0}", G, "balance", origine=tuple(epaule), axe=[0, 1, 0], ampl=0.18, vitesse=1.6, phase=1.5 * (s > 0))
    # les pattes fines, les ailes de verre
    for s in (-1, 1):
        for k in range(2):
            h0 = Vector((-0.3 - k * 0.9, s * 0.5, 1.4))
            L.ajouter(B.tube([h0, h0 + Vector((0.2, s * 1.6, 1.0)), h0 + Vector((0.4, s * 2.4, -1.6))], [0.12, 0.1, 0.06], 6), "cristal")
        for j in range(2):
            bm = B.boite(4.2 - j * 0.8, 0.05, 1.2)
            L.ajouter(bm, "glace", B.mat4((-1.4, s * (0.5 + j * 0.3), 3.2 + j * 0.2), (s * 0.5, -0.35, s * 0.25)))
    M.anim("coeur", C, "clignote", lent=1)
    M.lumieres += [Vector((0.2, 0, 3.0))]
    ecume(L, 2.8, 12, 33)


# ---------- Nimbus, le serpent des nuages ----------
def nimbus(M):
    L = M.L
    rnd = random.Random(41)
    # le corps : des boules de nuage le long d'une courbe qui s'enroule et sort de l'eau
    pts = []
    for k in range(48):
        t = k / 47
        a = t * math.pi * 3.2
        r = 3.2 * (1 - t * 0.55)
        pts.append(Vector((math.cos(a) * r - 1.0, math.sin(a) * r, -0.5 + t * 7.5 + math.sin(t * 9) * 0.6)))
    for k, p in enumerate(pts):
        rr = 0.55 + 0.45 * math.sin(k / 47 * math.pi) + 0.2
        for j in range(3):
            q = p + Vector((rnd.uniform(-0.25, 0.25), rnd.uniform(-0.25, 0.25), rnd.uniform(-0.15, 0.2)))
            L.ajouter(B.sphere(rr * rnd.uniform(0.75, 1.0), 12, 8), "blanc" if j else rnd.choice(("blanc", "glace", "creme")), B.mat4(q))
    # le ventre bleuté (des écailles rondes dessous)
    for k in range(0, 46, 2):
        p = pts[k]
        L.ajouter(B.demi_sphere(0.35 + 0.2 * math.sin(k / 47 * math.pi), 10, 3, bas=True), "glace", B.mat4(p + Vector((0, 0, -0.45))))
    # la tête : un museau rond, des yeux dorés, deux cornes, une crinière de nuages bleus, des moustaches
    t = pts[-1]
    d = (pts[-1] - pts[-4]).normalized()
    av = Vector((d.x, d.y, 0)).normalized()
    tete = t + av * 0.9 + Vector((0, 0, 0.4))
    L.ajouter(B.sphere(1.2, 18, 12), "blanc", B.mat4(tete, (0, 0, math.atan2(av.y, av.x)), (1.35, 1.0, 0.9)))
    L.ajouter(B.sphere(0.7, 14, 10), "creme", B.mat4(tete + av * 1.2 + Vector((0, 0, -0.25)), (0, 0, math.atan2(av.y, av.x)), (1.2, 1.0, 0.7)))
    yeux(L, tete + av * 0.55 + Vector((0, 0, 0.55)), 0.62, 0.32, (av.x, av.y, 0.1), "or", "noir", fente=True)
    cote = av.cross(Vector((0, 0, 1))).normalized()
    for s in (-1, 1):
        base = tete + cote * s * 0.5 + Vector((0, 0, 0.8)) - av * 0.3
        L.ajouter(B.tube([base, base + Vector((0, 0, 0.8)) - av * 0.6 + cote * s * 0.3, base + Vector((0, 0, 1.3)) - av * 1.3 + cote * s * 0.2], [0.17, 0.12, 0.04], 8), "or")
        m0 = tete + av * 1.6 + cote * s * 0.4 + Vector((0, 0, -0.2))
        L.ajouter(B.tube([m0, m0 + cote * s * 0.9 + Vector((0, 0, -0.2)), m0 + cote * s * 1.7 - av * 0.4 + Vector((0, 0, -0.7))], [0.06, 0.04, 0.02], 5), "glace")
        for k in range(5):
            L.ajouter(B.sphere(0.45, 10, 8), rnd.choice(("glace", "turquoise")), B.mat4(tete - av * (0.6 + k * 0.4) + cote * s * 0.75 + Vector((0, 0, 0.6 - k * 0.15))))
    # la queue : un petit nuage gris qui fait pleuvoir
    q = pts[0]
    L.ajouter(B.sphere(0.9, 12, 8), "gris", B.mat4(q + Vector((0.5, -0.6, 1.2))))
    for k in range(8):
        L.ajouter(B.cyl(0.04, 0.02, 0.35, 4), "glace", B.mat4(q + Vector((0.5 + rnd.uniform(-0.6, 0.6), -0.6 + rnd.uniform(-0.6, 0.6), 0.2 + rnd.uniform(0, 0.4)))))
    M.repere("etincelles", "etincelles", tuple(tete + Vector((0, 0, 1.0))))
    M.lumieres += [tete + Vector((0, 0, 0.5))]
    ecume(L, 3.4, 14, 42)


# ---------- Capitaine Calcaire ----------
def calcaire(M, echelle=1.0, pose=True, decal=(0.0, 0.0, 0.0)):
    L = M.L
    S = lambda *p: Vector(p) * echelle + Vector(decal)  # une position
    V = lambda *p: Vector(p) * echelle  # un déplacement
    rnd = random.Random(51)
    # le manteau long en lambeaux (prune foncé), les épaulettes dorées, la ceinture et sa boucle
    L.ajouter(B.cyl(1.7 * echelle, 1.25 * echelle, 3.4 * echelle, 16), "prune", B.mat4(S(0, 0, -0.6)))
    for k in range(14):
        a = k * 2 * math.pi / 14
        L.ajouter(B.boite(0.5 * echelle, 0.08 * echelle, rnd.uniform(0.4, 1.0) * echelle), "prune", B.mat4(S(math.cos(a) * 1.68, math.sin(a) * 1.68, -1.1), (0, 0, a + math.pi / 2)))
    L.ajouter(B.cyl(1.3 * echelle, 1.05 * echelle, 1.9 * echelle, 16), "prune", B.mat4(S(0, 0, 2.8)))
    L.ajouter(B.tore(1.28 * echelle, 0.14 * echelle, 24, 6), "noir", B.mat4(S(0, 0, 2.85)))
    L.ajouter(B.boite(0.5 * echelle, 0.12 * echelle, 0.4 * echelle), "or", B.mat4(S(1.28, 0, 2.66), (0, 0, math.pi / 2)))
    for s in (-1, 1):
        L.ajouter(B.cyl(0.55 * echelle, 0.5 * echelle, 0.18 * echelle, 14), "or", B.mat4(S(0, s * 1.2, 4.65), (s * 0.3, 0, 0)))
        for k in range(6):
            a = k * math.pi / 5 - math.pi / 2
            L.ajouter(B.cyl(0.03 * echelle, 0.03 * echelle, 0.3 * echelle, 4), "or", B.mat4(S(math.cos(a) * 0.45, s * 1.2 + math.sin(a) * 0.1 * s, 4.45)))
    # les côtes qu'on voit par le col ouvert, le crâne, la mâchoire, les yeux verts
    for k in range(4):
        L.ajouter(B.tore(0.55 * echelle - k * 0.05 * echelle, 0.06 * echelle, 16, 4), "os", B.mat4(S(0.75, 0, 3.4 + k * 0.32), (0, math.pi / 2, 0), (1, 1.4, 1)))
    L.ajouter(B.cyl(0.18 * echelle, 0.18 * echelle, 0.6 * echelle, 8), "os", B.mat4(S(0, 0, 4.7)))
    L.ajouter(B.sphere(0.95 * echelle, 18, 14), "os", B.mat4(S(0.15, 0, 5.9), (0, 0, 0), (1.0, 0.92, 1.0)))
    L.ajouter(B.boite(0.8 * echelle, 1.1 * echelle, 0.45 * echelle), "os", B.mat4(S(0.55, 0, 4.95)))
    for k in range(6):
        L.ajouter(B.boite(0.12 * echelle, 0.14 * echelle, 0.22 * echelle), "creme", B.mat4(S(0.95, -0.4 + k * 0.16, 5.25)))
    for s in (-1, 1):
        L.ajouter(B.sphere(0.3 * echelle, 12, 8), "noir", B.mat4(S(0.85, s * 0.36, 6.0)))
        L.ajouter(B.sphere(0.13 * echelle, 8, 6), "spectre", B.mat4(S(1.05, s * 0.36, 6.0)))
    L.ajouter(B.cyl(0.14 * echelle, 0.0, 0.25 * echelle, 3), "noir", B.mat4(S(1.05, 0, 5.6), (0, math.pi / 2, 0)))
    # des anatifes collés à l'épaule (il a longtemps dormi sous l'eau)
    for k in range(9):
        L.ajouter(B.cyl(0.1 * echelle, 0.04 * echelle, 0.18 * echelle, 6), "pierre", B.mat4(S(rnd.uniform(-0.3, 0.3), -1.3 + rnd.uniform(-0.2, 0.2), 4.6 + rnd.uniform(0, 0.3)), (rnd.uniform(-0.4, 0.4), rnd.uniform(-0.4, 0.4), 0)))
    # le tricorne noir à galon doré et sa plume verte qui luit
    L.ajouter(B.cyl(1.25 * echelle, 1.1 * echelle, 0.2 * echelle, 3), "noir", B.mat4(S(0.1, 0, 6.6), (0, 0, math.pi / 3)))
    L.ajouter(B.tore(1.05 * echelle, 0.06 * echelle, 3, 4), "or", B.mat4(S(0.1, 0, 6.8), (0, 0, math.pi / 3)))
    L.ajouter(B.demi_sphere(0.8 * echelle, 16, 6), "noir", B.mat4(S(0.1, 0, 6.75)))
    L.ajouter(B.tube([S(-0.4, 0.5, 7.1), S(-0.9, 0.9, 8.0), S(-1.6, 1.1, 8.4)], [0.12 * echelle, 0.16 * echelle, 0.04 * echelle], 8), "spectre")
    # les bras : un sabre courbe levé, une lanterne verte de l'autre côté
    for s in (-1, 1):
        epaule = S(0.1, s * 1.35, 4.5)
        coude = S(0.9, s * 2.0, 3.6 if s < 0 else 4.9)
        main = S(1.6, s * 1.9, 3.5 if s < 0 else 6.1)
        L.ajouter(B.tube([epaule, coude], 0.42 * echelle, 10), "prune")
        L.ajouter(B.tube([coude, main], [0.16 * echelle, 0.12 * echelle], 6), "os")
        L.ajouter(B.sphere(0.24 * echelle, 10, 8), "os", B.mat4(main))
        L.ajouter(B.tore(0.36 * echelle, 0.12 * echelle, 12, 5), "creme", B.mat4(coude, (0, math.pi / 2, 0)))
    m = S(1.6, 1.9, 6.1)
    L.ajouter(B.tube(B.courbe(m, m + V(0.9, 0.1, 2.6), m + V(1.0, 0, 0.9), 9), [0.12 * echelle] * 4 + [0.1 * echelle, 0.08 * echelle, 0.06 * echelle, 0.04 * echelle, 0.01 * echelle], 4), "os")
    L.ajouter(B.tore(0.26 * echelle, 0.06 * echelle, 12, 4), "or", B.mat4(m + V(0, 0, 0.1), (0, math.pi / 2, 0)))
    G = B.Lot()
    p = S(1.6, -1.9, 3.4)
    G.ajouter(B.tube([p, p + V(0, 0, -0.5)], 0.03 * echelle, 4), "fer")
    G.ajouter(B.cyl(0.25 * echelle, 0.25 * echelle, 0.5 * echelle, 8), "spectre", B.mat4(p + V(0, 0, -1.05)))
    G.ajouter(B.cyl(0.3 * echelle, 0.04 * echelle, 0.25 * echelle, 8), "fer", B.mat4(p + V(0, 0, -0.55)))
    G.ajouter(B.cyl(0.28 * echelle, 0.28 * echelle, 0.07 * echelle, 8), "fer", B.mat4(p + V(0, 0, -1.1)))
    M.anim("lanterne", G, "balance", origine=tuple(p), axe=[1, 0, 0], ampl=0.2, vitesse=1.2)
    if pose:
        ecume(L, 2.2, 12, 52)


# ---------- Le vaisseau fantôme ----------
def vaisseau_fantome(M):
    L = M.L
    rnd = random.Random(61)
    # la coque : grise, longue, abîmée ; des sabords qui luisent en vert
    bm = B.demi_sphere(1.0, 26, 8)
    B.deformer(bm, lambda c: Vector((c.x * 4.2, c.y * 1.35 * (1 - max(0.0, c.x) * 0.35), -c.z * 1.5 + 1.2)))
    trous = [f for f in bm.faces if abs(f.calc_center_median().x + 1.0) < 0.4 and f.calc_center_median().y > 0.6 and f.calc_center_median().z > 0.3]
    bmesh.ops.delete(bm, geom=trous, context="FACES")
    L.ajouter(bm, "gris", B.mat4())
    t = B.tore(1.0, 0.09, 32, 5)
    B.deformer(t, lambda c: Vector((c.x * 4.2, c.y * 1.35 * (1 - max(0.0, c.x) * 0.35), c.z + 1.2)))
    L.ajouter(t, "prune", B.mat4())
    L.ajouter(B.boite(8.0, 2.2, 0.1), "bois_fonce", B.mat4((-0.2, 0, 1.05), (0, 0, 0), (1.0, 0.95, 1)))
    for k in range(6):
        x = -2.6 + k * 1.05
        for s in (-1, 1):
            w = 1.35 * (1 - max(0.0, x / 4.2) * 0.35) * math.sqrt(max(0.0, 1 - (x / 4.2) ** 2))
            L.ajouter(B.boite(0.32, 0.06, 0.26), "spectre", B.mat4((x, s * (w - 0.02), 0.62), (0, 0, 0)))
    # le château arrière, ses fenêtres vertes, une proue pointue
    L.ajouter(B.boite(1.8, 2.2, 1.3), "gris", B.mat4((-3.3, 0, 1.0)))
    for k in range(3):
        L.ajouter(B.boite(0.06, 0.35, 0.4), "spectre", B.mat4((-4.21, -0.6 + k * 0.6, 1.4)))
    L.ajouter(B.tube([(4.0, 0, 1.2), (5.2, 0, 1.9), (6.2, 0, 2.5)], [0.14, 0.1, 0.05], 6), "bois_fonce")
    # trois mâts (un cassé), des voiles grises déchirées, des cordages qui pendent
    for k, (x, h, casse) in enumerate(((1.8, 6.0, False), (-0.6, 7.2, False), (-2.8, 4.0, True))):
        L.ajouter(B.cyl(0.14, 0.1, h, 8), "bois_fonce", B.mat4((x, 0, 1.0), (0.0, 0.08 if casse else 0, 0)))
        if casse:
            L.ajouter(B.cyl(0.1, 0.08, 2.4, 8), "bois_fonce", B.mat4((x + 0.6, 0.5, 1.2), (0.9, 0.4, 0)))
            continue
        for j in range(2):
            zz = 2.4 + j * (h - 2.4) * 0.5
            hh = (h - 2.4) * 0.42
            L.ajouter(B.cyl(0.07, 0.07, 3.0 - j * 0.6, 6), "bois_fonce", B.mat4((x, -1.5 + j * 0.3, zz + hh + 0.1), (-math.pi / 2, 0, 0)))
            # une voile en lambeaux : une grille dont on enlève des carreaux
            nx, ny = 6, 4
            larg = 2.8 - j * 0.6
            verts, faces = [], []
            for jj in range(ny + 1):
                for ii in range(nx + 1):
                    verts.append((x + 0.15 + math.sin(ii * 0.9) * 0.08, -larg / 2 + ii * larg / nx, zz + hh - jj * hh / ny - (rnd.random() * 0.25 if jj == ny else 0)))
            for jj in range(ny):
                for ii in range(nx):
                    if rnd.random() < 0.22:
                        continue
                    q = jj * (nx + 1) + ii
                    faces.append([q, q + 1, q + nx + 2, q + nx + 1])
            G = B.Lot()
            G.faces(verts, faces, "gris", True)
            o = G.objet(f"{M.id}_voile{k}{j}", M.coll, angle=80)
            o["role"] = "anim"
            B.anime(o, "drapeau", phase=k + j)
    for k in range(10):
        a = Vector((rnd.uniform(-3, 3), rnd.uniform(-1.2, 1.2), 1.2))
        L.ajouter(B.tube([a, a + Vector((rnd.uniform(-0.3, 0.3), rnd.uniform(-0.3, 0.3), rnd.uniform(1.5, 4.5)))], 0.025, 3), "corde")
    # des lanternes vertes à la poupe et à la proue, une ancre qui pend, des algues sur la coque
    for x in (-4.0, 3.8):
        L.ajouter(B.cyl(0.03, 0.03, 0.9, 4), "fer", B.mat4((x, 0, 1.2)))
        L.ajouter(B.cyl(0.18, 0.18, 0.35, 8), "spectre", B.mat4((x, 0, 2.1)))
        L.ajouter(B.cyl(0.22, 0.03, 0.2, 8), "fer", B.mat4((x, 0, 2.45)))
    L.ajouter(B.tube([(3.4, 0.9, 1.1), (3.6, 1.0, 0.0)], 0.04, 4), "fer")
    L.ajouter(B.tube(B.courbe((3.3, 1.0, -0.2), (3.9, 1.0, -0.2), (3.6, 1.0, -0.6), 6), 0.06, 5), "fer")
    for k in range(24):
        a = rnd.uniform(-3.8, 3.8)
        w = 1.35 * math.sqrt(max(0.0, 1 - (a / 4.2) ** 2)) * (1 - max(0.0, a / 4.2) * 0.35)
        s = rnd.choice((-1, 1))
        p = Vector((a, s * (w + 0.02), rnd.uniform(0.0, 0.7)))
        L.ajouter(B.tube([p, p + Vector((0, s * 0.05, -rnd.uniform(0.3, 0.8)))], [0.05, 0.015], 4), "mousse")
    # le capitaine à la barre (en petit)
    L.ajouter(B.cyl(0.05, 0.05, 1.0, 6), "bois_fonce", B.mat4((-3.0, 0, 1.65)))
    L.ajouter(B.tore(0.45, 0.04, 16, 4), "bois_fonce", B.mat4((-2.9, 0, 2.6), (0, math.pi / 2, 0)))
    calcaire(M, 0.3, pose=False, decal=(-3.5, 0.0, 1.55))
    M.repere("brume", "fumee", (0.0, 0.0, 0.8))
    M.lumieres += [Vector((-4.0, 0, 2.2)), Vector((3.8, 0, 2.2))]


# ---------- Le Grand Remontoir ----------
def grand_remontoir(M):
    L = M.L
    # le torse en tonneau de cuivre, ses rivets, ses bandes de laiton
    L.ajouter(B.tube([(0, 0, -1.5), (0, 0, 1.0), (0, 0, 3.0), (0, 0, 4.8)], [2.0, 2.3, 2.3, 1.9], 24), "cuivre")
    for z in (0.0, 2.0, 4.0):
        L.ajouter(B.tore(2.28 - (z > 3) * 0.25, 0.12, 32, 5), "laiton", B.mat4((0, 0, z)))
        for k in range(16):
            a = k * 2 * math.pi / 16
            r = 2.36 - (z > 3) * 0.25
            L.ajouter(B.sphere(0.07, 6, 4), "laiton", B.mat4((math.cos(a) * r, math.sin(a) * r, z + 0.22)))
    # le cadran sur la poitrine (les aiguilles tournent)
    c = Vector((2.3, 0, 2.6))
    L.ajouter(B.cyl(1.0, 1.0, 0.14, 32), "creme", B.mat4(c, (0, math.pi / 2, 0)))
    L.ajouter(B.tore(1.02, 0.1, 32, 5), "laiton", B.mat4(c + Vector((0.08, 0, 0)), (0, math.pi / 2, 0)))
    for k in range(12):
        a = k * math.pi / 6
        L.ajouter(B.boite(0.04, 0.07, 0.18 if k % 3 else 0.28), "noir", B.mat4(c + Vector((0.15, math.cos(a) * 0.78, math.sin(a) * 0.78 - 0.09)), (a, 0, 0)))
    for nom, lg, larg, vit in (("minutes", 0.75, 0.07, 0.9), ("heures", 0.5, 0.1, 0.12)):
        G = B.Lot()
        G.ajouter(B.boite(0.04, larg, lg), "noir", B.mat4(c + Vector((0.18 + (nom == "minutes") * 0.03, 0, 0))))
        G.ajouter(B.cyl(0.09, 0.09, 0.1, 10), "laiton", B.mat4(c + Vector((0.16, 0, 0)), (0, math.pi / 2, 0)))
        M.anim(nom, G, "tourne", origine=tuple(c), axe=[1, 0, 0], vitesse=vit)
    # la tête ronde, deux hublots qui brillent, une bouche grillagée, une cheminée qui fume
    L.ajouter(B.sphere(1.3, 20, 14), "cuivre", B.mat4((0.1, 0, 6.0), (0, 0, 0), (1, 1, 0.9)))
    L.ajouter(B.cyl(0.6, 0.7, 0.6, 16), "laiton", B.mat4((0.1, 0, 4.7)))
    for s in (-1, 1):
        L.ajouter(B.tore(0.36, 0.1, 18, 5), "laiton", B.mat4((1.15, s * 0.5, 6.2), (0, math.pi / 2, 0)))
        L.ajouter(B.cyl(0.3, 0.3, 0.08, 16), "lumiere", B.mat4((1.1, s * 0.5, 6.2), (0, math.pi / 2, 0)))
    for k in range(5):
        L.ajouter(B.boite(0.08, 0.06, 0.4), "noir", B.mat4((1.2, -0.4 + k * 0.2, 5.4)))
    L.ajouter(B.cyl(0.25, 0.3, 1.3, 12), "fer", B.mat4((-0.4, 0.3, 6.8)))
    L.ajouter(B.tore(0.3, 0.08, 12, 4), "laiton", B.mat4((-0.4, 0.3, 8.05)))
    M.repere("vapeur", "fumee", (-0.4, 0.3, 8.3))
    # les épaules à engrenages, les bras articulés, les gros poings levés
    for s in (-1, 1):
        sh = Vector((0, s * 2.4, 4.2))
        L.ajouter(B.sphere(0.8, 14, 10), "laiton", B.mat4(sh))
        L.ajouter(B.tore(0.75, 0.14, 24, 4), "cuivre", B.mat4(sh + Vector((0, s * 0.3, 0)), (math.pi / 2, 0, 0)))
        coude = sh + Vector((1.2, s * 1.0, 1.2 if s > 0 else -1.0))
        poing = coude + Vector((1.0, s * 0.2, 1.6 if s > 0 else 0.2))
        L.ajouter(B.tube([sh, coude], 0.42, 12), "cuivre")
        L.ajouter(B.sphere(0.5, 12, 8), "laiton", B.mat4(coude))
        L.ajouter(B.tube([coude, poing], [0.38, 0.45], 12), "cuivre")
        L.ajouter(B.sphere(0.85, 14, 10), "laiton", B.mat4(poing, (0, 0, 0), (1.1, 1, 0.95)))
        for k in range(4):
            L.ajouter(B.sphere(0.25, 8, 6), "laiton", B.mat4(poing + Vector((0.65, -0.45 + k * 0.3, 0.3))))
    # la grande clé dans le dos : elle tourne
    G = B.Lot()
    k0 = Vector((-2.2, 0, 3.0))
    G.ajouter(B.cyl(0.18, 0.18, 1.4, 10), "laiton", B.mat4(k0 + Vector((-1.4, 0, 0)), (0, math.pi / 2, 0)))
    for s in (-1, 1):
        G.ajouter(B.tore(0.75, 0.2, 20, 6), "laiton", B.mat4(k0 + Vector((-3.4, s * 0.85, 0))))
    M.anim("cle", G, "tourne", origine=tuple(k0), axe=[1, 0, 0], vitesse=1.4)
    M.lumieres += [Vector((1.1, 0, 6.2))]
    ecume(L, 2.6, 14, 72)


# ---------- Ronchon, le géant réveillé ----------
def ronchon(M):
    L = M.L
    rnd = random.Random(81)
    # le buste de roche (des blocs), la mousse et l'herbe dessus, des fleurs
    L.ajouter(B.caillou(3.2, 801, 0.18, 3, (1.0, 1.3, 1.0)), "pierre", B.mat4((0, 0, 0.8)))
    L.ajouter(B.caillou(2.3, 802, 0.15, 3, (0.95, 1.0, 1.05)), "pierre", B.mat4((0.3, 0, 4.4)))
    L.ajouter(B.caillou(2.1, 803, 0.22, 2, (1.0, 1.05, 0.45)), "mousse", B.mat4((0.0, 0, 6.2)))
    for k in range(14):
        a = rnd.uniform(0, 6.28)
        L.ajouter(B.ico(0.12, 1), rnd.choice(("rose", "jaune", "blanc")), B.mat4((math.cos(a) * 1.6, math.sin(a) * 1.6, 6.5 + rnd.uniform(0, 0.4))))
    for k in range(5):  # des petits arbres qui lui font des cheveux
        a = 1.6 + k * 0.7
        p = Vector((math.cos(a) * 1.3 - 0.4, math.sin(a) * 1.5, 6.6))
        L.ajouter(B.tube([p, p + Vector((0, 0, 0.7))], 0.08, 5), "bois")
        L.ajouter(B.caillou(0.45, 810 + k, 0.2, 1), "feuille", B.mat4(p + Vector((0, 0, 0.9))))
    # le visage grognon : sourcils froncés, yeux qui brûlent, gros nez, bouche en bas, oreilles
    for s in (-1, 1):
        L.ajouter(B.boite(0.4, 1.1, 0.35), "roche_noire", B.mat4((2.25, s * 0.65, 5.6), (s * 0.45, 0, 0)))
        L.ajouter(B.sphere(0.32, 12, 8), "noir", B.mat4((2.3, s * 0.6, 5.05)))
        L.ajouter(B.sphere(0.16, 8, 6), "feu", B.mat4((2.5, s * 0.6, 5.05)))
        L.ajouter(B.caillou(0.6, 820 + (s > 0), 0.2, 2, (0.5, 0.9, 1.2)), "pierre", B.mat4((0.4, s * 2.2, 4.7)))
    L.ajouter(B.caillou(0.6, 830, 0.15, 2, (1.2, 0.8, 0.9)), "pierre_fonce", B.mat4((2.6, 0, 4.5)))
    L.ajouter(B.tube(B.courbe((2.2, -0.9, 3.5), (2.2, 0.9, 3.5), (2.6, 0, 3.95), 7), 0.13, 6), "roche_noire")
    # les poings levés (de gros rochers), les bras de pierre
    for s in (-1, 1):
        sh = Vector((0, s * 3.0, 2.8))
        poing = Vector((2.6, s * 3.6, 5.8 if s > 0 else 2.2))
        L.ajouter(B.tube([sh, (sh + poing) / 2 + Vector((0.4, s * 0.6, 0)), poing], [1.0, 0.85, 0.8], 12), "pierre")
        L.ajouter(B.caillou(1.2, 840 + (s > 0), 0.2, 2), "pierre_fonce", B.mat4(poing))
        L.ajouter(B.caillou(0.9, 845 + (s > 0), 0.25, 2, (1, 1, 0.4)), "mousse", B.mat4(sh + Vector((0, 0, 0.8))))
    M.repere("souffle", "fumee", (2.9, 0.0, 4.2))
    M.lumieres += [Vector((2.5, 0, 5.05))]
    ecume(L, 3.6, 16, 82)


# ---------- L'Amiral Boulet ----------
def amiral_boulet(M):
    L = M.L
    # le gros corps dans son manteau rouge, les boutons dorés, la ceinture
    L.ajouter(B.tube([(0, 0, -1.5), (0, 0, 1.2), (0, 0, 3.4), (0, 0, 4.8)], [2.1, 2.5, 2.3, 1.6], 24), "rouge_fonce")
    L.ajouter(B.tore(2.42, 0.25, 32, 6), "noir", B.mat4((0, 0, 1.4)))
    L.ajouter(B.boite(0.25, 0.8, 0.6), "or", B.mat4((2.55, 0, 1.12)))
    for k in range(5):
        L.ajouter(B.sphere(0.13, 8, 6), "or", B.mat4((2.38 - k * 0.05, 0.35, 2.0 + k * 0.55)))
        L.ajouter(B.sphere(0.13, 8, 6), "or", B.mat4((2.38 - k * 0.05, -0.35, 2.0 + k * 0.55)))
    for s in (-1, 1):
        L.ajouter(B.tube([(1.2, s * 0.4, 4.6), (2.0, s * 0.9, 3.4), (2.2, s * 1.2, 2.0)], 0.12, 6), "or")
        L.ajouter(B.cyl(0.65, 0.6, 0.2, 14), "or", B.mat4((0, s * 1.6, 4.55), (s * 0.35, 0, 0)))
    # la tête : visage tanné, gros nez, une moustache énorme, un bandeau sur l'œil, des sourcils broussailleux
    L.ajouter(B.sphere(1.25, 20, 14), "gres", B.mat4((0.2, 0, 5.9)))
    L.ajouter(B.sphere(0.42, 12, 8), "corail", B.mat4((1.45, 0, 5.75), (0, 0, 0), (1.1, 0.9, 1)))
    for s in (-1, 1):
        L.ajouter(B.tube([(1.4, s * 0.15, 5.35), (1.5, s * 0.9, 5.25), (1.2, s * 1.7, 5.7), (1.0, s * 1.9, 6.1)], [0.22, 0.26, 0.18, 0.06], 10), "gris")
        L.ajouter(B.caillou(0.3, 900 + (s > 0), 0.4, 1, (1.3, 0.8, 0.5)), "gris", B.mat4((1.2, s * 0.5, 6.55)))
    L.ajouter(B.sphere(0.25, 10, 8), "blanc", B.mat4((1.25, 0.5, 6.2)))
    L.ajouter(B.sphere(0.12, 8, 6), "noir", B.mat4((1.45, 0.5, 6.2)))
    L.ajouter(B.cyl(0.3, 0.3, 0.08, 14), "noir", B.mat4((1.28, -0.5, 6.2), (0, math.pi / 2, 0)))
    L.ajouter(B.tore(1.2, 0.05, 24, 4), "noir", B.mat4((0.2, 0, 6.2), (0.25, 0, 0)))
    # le bicorne, son galon, sa plume rouge et la cocarde
    L.ajouter(B.sphere(1.0, 18, 10), "noir", B.mat4((0.1, 0, 7.0), (0, 0, 0), (0.9, 2.2, 0.7)))
    L.ajouter(B.tore(1.0, 0.07, 28, 4), "or", B.mat4((0.1, 0, 7.0), (math.pi / 2, 0, 0), (0.9, 0.7, 2.2)))
    L.ajouter(B.cyl(0.25, 0.25, 0.06, 14), "rose", B.mat4((0.95, 0, 7.15), (0, math.pi / 2, 0)))
    L.ajouter(B.tube([(-0.2, 0, 7.6), (-0.8, 0.2, 8.4), (-1.6, 0.4, 8.6)], [0.18, 0.22, 0.04], 8), "rouge")
    # le bras-canon (à gauche) qui fume, la longue-vue dans l'autre main
    sh = Vector((0, -2.4, 3.9))
    L.ajouter(B.sphere(0.75, 14, 10), "rouge_fonce", B.mat4(sh))
    L.ajouter(B.tube([sh, sh + Vector((1.0, -0.6, 0.2))], 0.55, 12), "rouge_fonce")
    L.ajouter(B.tube([sh + Vector((0.9, -0.55, 0.2)), sh + Vector((2.0, -0.7, 0.6)), sh + Vector((3.4, -0.8, 1.1))], [0.6, 0.5, 0.45], 14), "fer")
    for t in (0.3, 0.65, 1.0):
        L.ajouter(B.tore(0.55 - t * 0.1, 0.08, 18, 4), "or", B.mat4(sh + Vector((0.9 + t * 2.5, -0.55 - t * 0.25, 0.2 + t * 0.9)), (0, math.pi / 2 - 0.3, 0)))
    M.repere("fumee", "fumee", tuple(sh + Vector((3.6, -0.8, 1.2))))
    s2 = Vector((0, 2.4, 3.9))
    L.ajouter(B.sphere(0.75, 14, 10), "rouge_fonce", B.mat4(s2))
    coude = s2 + Vector((1.1, 0.6, -0.6))
    main = coude + Vector((0.9, -0.2, 1.4))
    L.ajouter(B.tube([s2, coude], 0.5, 12), "rouge_fonce")
    L.ajouter(B.tube([coude, main], 0.42, 12), "rouge_fonce")
    L.ajouter(B.sphere(0.45, 12, 8), "gres", B.mat4(main))
    L.ajouter(B.tube([main + Vector((-0.6, 0, -0.5)), main + Vector((0.8, 0, 0.6))], [0.12, 0.16], 10), "laiton")
    M.lumieres += []
    ecume(L, 2.8, 14, 92)


MAITRES = {"phare": mere_brume, "marais": roi_crapaud, "cristal": mante_prisme, "archipel": nimbus, "cimetiere": calcaire,
           "horloge": grand_remontoir, "geants": ronchon, "forteresse": amiral_boulet, "fantome": vaisseau_fantome}


def construire(ids=None, rendu=True, exporter=True):
    import barhaw_iles_v4 as I
    out = {}
    for id_ in ids or list(MAITRES):
        nom = "fantome" if id_ == "fantome" else f"maitre-{id_}"
        coll = B.collection(nom.replace("-", "_"))
        M = Modele(nom.replace("-", "_"), coll)
        MAITRES[id_](M)
        corps = M.finir()
        infos = {"patine": I.patiner(corps, M.lumieres, teinte=(0.85, 0.95, 0.92) if id_ in ("fantome", "cimetiere") else (1.0, 1.0, 1.0))}
        B.nettoyer()
        infos["triangles"] = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in coll.objects if o.type == "MESH")
        if exporter:
            infos["glb"] = B.exporter(coll.name, f"{nom}.glb")
            infos["leger"] = B.exporter_leger(coll.name, f"{nom}-leger.glb")
        if rendu:
            infos["rendu"] = B.vitrine([coll.name], cam=(17, -13, 9), cible=(0, 0, 3.4), objectif=50, nom=nom, taille=(900, 900))
            B.fin_vitrine()
        out[id_] = infos
    return out
