# La mer qui vit (V4) : tout ce qui nage, flotte et navigue entre les îles de GRAND LINE. Tout est inventé.
#   baleine   une grosse baleine bleue à rainures, sa queue bat (le site la fait plonger et souffler)
#   dauphin   un dauphin gris-bleu, nageoire dorsale ; le site les fait sauter par trois
#   tortue    une tortue de mer, carapace à écailles, les nageoires avant battent
#   raie      une raie manta, ses ailes battent ; elle saute parfois
#   poisson   un poisson volant aux grandes nageoires ; ils jaillissent en banc
#   marchand  un petit navire marchand (voile crème rayée, caisses et tonneaux), qui fait la navette entre les îles
#   peche     une barque de pêche, son pêcheur, sa canne qui se balance, une lanterne
#   bouee     une bouée rouge et blanche, sa cloche, sa lumière qui clignote
#   epave     des tonneaux et une caisse qui flottent, une planche, une mouette posée
# Un seul fichier : vie-mer.glb (et vie-mer-leger.glb pour les téléphones). Le site sépare les sortes par le début du nom.
# Usage, dans Blender :  import barhaw_vie_mer_v4 as V; V.construire()
import math, random, bmesh, bpy
from mathutils import Vector
import barhaw_base as B


class Sorte:
    def __init__(self, nom, coll):
        self.nom, self.coll = nom, coll
        self.L = B.Lot()
        self.lumieres = []
        self.objets = []

    def anim(self, part, lot, genre, origine=None, **reglages):
        o = lot.objet(f"{self.nom}_{part}", self.coll, angle=40, origine=origine)
        o["role"] = "anim"
        B.anime(o, genre, **reglages)
        self.objets.append(o)
        return o

    def finir(self):
        o = self.L.objet(f"{self.nom}_corps", self.coll, angle=40)
        o["role"] = "decor"
        return o


def oeil(L, p, r=0.12, regard=(1, 0, 0)):
    d = Vector(regard).normalized()
    L.ajouter(B.sphere(r, 12, 8), "blanc", B.mat4(p))
    L.ajouter(B.sphere(r * 0.6, 10, 6), "noir", B.mat4(Vector(p) + d * r * 0.55))
    L.ajouter(B.sphere(r * 0.18, 6, 4), "blanc", B.mat4(Vector(p) + d * r * 0.8 + Vector((0, 0, r * 0.3))))


def corps_fuseau(longueur, rayons, mat, L, M=None, aplati=1.0, segments=16):
    """Un corps de poisson : un tube le long de X, des rayons qui varient (le nez en +X)."""
    n = len(rayons)
    pts = [(-longueur / 2 + longueur * k / (n - 1), 0, 0) for k in range(n)]
    bm = B.tube(pts, rayons, segments)
    if aplati != 1.0:
        B.deformer(bm, lambda c: Vector((c.x, c.y, c.z * aplati)))
    L.ajouter(bm, mat, M or B.mat4())


# ---------- la baleine ----------
def baleine(S):
    L = S.L
    corps_fuseau(9.0, [0.25, 0.7, 1.35, 1.75, 1.95, 1.95, 1.8, 1.45, 0.9], "ocean", L, aplati=0.82, segments=20)
    L.ajouter(B.sphere(1.0, 18, 12), "ocean", B.mat4((4.35, 0, 0), (0, 0, 0), (0.75, 0.9, 0.74)))  # le museau arrondi
    # le ventre à rainures, clair
    for k in range(9):
        y = -0.9 + k * 0.22
        L.ajouter(B.tube([(3.9, y * 0.55, -0.95), (1.5, y, -1.45), (-0.8, y * 0.9, -1.35)], 0.07, 5), "creme")
    L.ajouter(B.sphere(1.5, 16, 10), "creme", B.mat4((1.9, 0, -0.75), (0, 0, 0), (1.7, 0.95, 0.5)))
    # la bouche (un grand sourire), les yeux, l'évent, des anatifes sur la tête
    L.ajouter(B.tube(B.courbe((4.3, -0.05, -0.15), (1.2, -1.45, -0.55), (3.0, -1.2, -0.1), 8), 0.06, 5), "noir")
    L.ajouter(B.tube(B.courbe((4.3, 0.05, -0.15), (1.2, 1.45, -0.55), (3.0, 1.2, -0.1), 8), 0.06, 5), "noir")
    for s in (-1, 1):
        oeil(L, Vector((1.25, s * 1.45, -0.2)), 0.16, (0.3, s, 0.1))
        # les nageoires pectorales
        L.ajouter(B.tube([(0.9, s * 1.5, -0.8), (0.2, s * 2.6, -1.4), (-0.4, s * 3.1, -1.6)], [0.35, 0.25, 0.08], 8), "ocean", B.mat4((0, 0, 0), (0, 0, 0), (1, 1, 0.45)))
    L.ajouter(B.cyl(0.18, 0.12, 0.12, 10), "noir", B.mat4((2.4, 0, 1.38)))
    rnd = random.Random(3)
    for k in range(14):
        a = rnd.uniform(-0.8, 0.8)
        L.ajouter(B.demi_sphere(rnd.uniform(0.06, 0.12), 8, 3), rnd.choice(("blanc", "pierre")), B.mat4((rnd.uniform(1.8, 3.6), math.sin(a) * 1.2, 1.1 + math.cos(a) * 0.2)))
    L.ajouter(B.cyl(0.25, 0.0, 0.5, 6), "ocean", B.mat4((-2.6, 0, 1.25), (0, -0.6, 0), (1.6, 0.4, 1)))  # la petite dorsale
    # la queue : le pédoncule et les deux lobes (elle bat de haut en bas)
    Q = B.Lot()
    Q.ajouter(B.tube([(-4.4, 0, 0), (-5.4, 0, 0.05), (-6.0, 0, 0.1)], [0.75, 0.5, 0.35], 12), "ocean", B.mat4((0, 0, 0), (0, 0, 0), (1, 1, 0.8)))
    for s in (-1, 1):
        Q.ajouter(B.tube([(-5.9, 0, 0.1), (-6.5, s * 1.1, 0.15), (-7.0, s * 2.0, 0.3)], [0.32, 0.26, 0.06], 8), "ocean", B.mat4((0, 0, 0), (0, 0, 0), (1, 1, 0.35)))
    S.anim("queue", Q, "balance", origine=(-4.2, 0, 0), axe=[0, 1, 0], ampl=0.28, vitesse=1.4)


# ---------- le dauphin ----------
def dauphin(S):
    L = S.L
    corps_fuseau(2.4, [0.08, 0.28, 0.42, 0.45, 0.38, 0.22, 0.1], "dauphin", L, aplati=0.9, segments=14)
    L.ajouter(B.tube([(1.15, 0, -0.05), (1.55, 0, -0.1), (1.75, 0, -0.12)], [0.16, 0.09, 0.06], 10), "dauphin")  # le rostre
    L.ajouter(B.sphere(0.36, 12, 8), "creme", B.mat4((0.3, 0, -0.18), (0, 0, 0), (2.4, 0.9, 0.55)))
    L.ajouter(B.tube(B.courbe((1.55, -0.1, -0.12), (0.95, -0.25, -0.12), (1.25, -0.2, -0.2), 5), 0.025, 4), "noir")
    L.ajouter(B.tube(B.courbe((1.55, 0.1, -0.12), (0.95, 0.25, -0.12), (1.25, 0.2, -0.2), 5), 0.025, 4), "noir")
    for s in (-1, 1):
        oeil(L, Vector((0.9, s * 0.28, 0.05)), 0.07, (0.4, s, 0))
        L.ajouter(B.tube([(0.5, s * 0.3, -0.2), (0.1, s * 0.75, -0.42)], [0.1, 0.03], 6), "dauphin", B.mat4((0, 0, 0), (0, 0, 0), (1, 1, 0.5)))
    L.ajouter(B.tube([(-0.1, 0, 0.35), (-0.35, 0, 0.75), (-0.55, 0, 0.82)], [0.16, 0.08, 0.02], 6), "dauphin", B.mat4((0, 0, 0), (0, 0, 0), (1, 0.35, 1)))
    for s in (-1, 1):
        L.ajouter(B.tube([(-1.15, 0, 0), (-1.45, s * 0.35, 0.02), (-1.6, s * 0.55, 0.05)], [0.08, 0.06, 0.02], 6), "dauphin", B.mat4((0, 0, 0), (0, 0, 0), (1, 1, 0.4)))


# ---------- la tortue de mer ----------
def tortue(S):
    L = S.L
    L.ajouter(B.demi_sphere(1.0, 20, 6), "vert_fonce", B.mat4((0, 0, 0), (0, 0, 0), (1.15, 0.95, 0.45)))
    L.ajouter(B.cyl(1.05, 1.05, 0.08, 24), "creme", B.mat4((0, 0, -0.05), (0, 0, 0), (1.12, 0.92, 1)))
    # les écailles de la carapace (des plaques bombées)
    for k, (x, y) in enumerate(((0, 0), (0.55, 0), (-0.55, 0), (0.3, 0.5), (-0.3, 0.5), (0.3, -0.5), (-0.3, -0.5))):
        z = 0.42 - (x * x + y * y) * 0.25
        L.ajouter(B.cyl(0.28, 0.24, 0.06, 6), "vert", B.mat4((x, y, z), (y * 0.6, -x * 0.5, 0)))
    L.ajouter(B.sphere(0.32, 12, 8), "mousse", B.mat4((1.3, 0, 0.05), (0, 0, 0), (1.2, 0.9, 0.85)))
    for s in (-1, 1):
        oeil(L, Vector((1.5, s * 0.18, 0.15)), 0.07, (1, s * 0.5, 0))
        L.ajouter(B.tube([(-0.8, s * 0.55, -0.05), (-1.2, s * 0.8, -0.1)], [0.14, 0.04], 6), "mousse", B.mat4((0, 0, 0), (0, 0, 0), (1, 1, 0.5)))
    L.ajouter(B.cyl(0.08, 0.0, 0.35, 5), "mousse", B.mat4((-1.15, 0, -0.02), (0, -math.pi / 2, 0)))
    # les nageoires avant (elles battent)
    for s in (-1, 1):
        G = B.Lot()
        G.ajouter(B.tube([(0.6, s * 0.75, -0.05), (0.4, s * 1.4, -0.1), (0.0, s * 1.85, -0.12)], [0.2, 0.15, 0.05], 8), "mousse", B.mat4((0, 0, 0), (0, 0, 0), (1, 1, 0.4)))
        S.anim(f"nageoire{'d' if s > 0 else 'g'}", G, "balance", origine=(0.6, s * 0.75, -0.05), axe=[1, 0, 0], ampl=0.4, vitesse=1.1, phase=0.0 if s > 0 else math.pi)


# ---------- la raie manta ----------
def raie(S):
    L = S.L
    L.ajouter(B.sphere(1.0, 20, 10), "violet_fonce", B.mat4((0, 0, 0), (0, 0, 0), (1.3, 0.9, 0.28)))
    L.ajouter(B.sphere(0.95, 18, 8), "creme", B.mat4((0, 0, -0.06), (0, 0, 0), (1.2, 0.82, 0.18)))
    for s in (-1, 1):
        L.ajouter(B.tube([(1.15, s * 0.35, 0.0), (1.55, s * 0.45, -0.05)], [0.12, 0.05], 6), "violet_fonce", B.mat4((0, 0, 0), (0, 0, 0), (1, 0.5, 1)))  # les cornes
        oeil(L, Vector((1.05, s * 0.55, 0.1)), 0.07, (0.5, s, 0.3))
    L.ajouter(B.tube([(-1.2, 0, 0), (-2.4, 0, 0.05), (-3.4, 0, 0.1)], [0.08, 0.04, 0.01], 5), "violet_fonce")
    for k in range(5):
        L.ajouter(B.sphere(0.07, 6, 4), "blanc", B.mat4((-0.3 + k * 0.25, 0.2 * (k % 2 * 2 - 1), 0.26)))
    # les ailes (elles battent, l'une avec l'autre)
    for s in (-1, 1):
        G = B.Lot()
        verts = [(0.9, s * 0.6, 0), (-0.6, s * 0.75, 0), (-0.1, s * 2.7, 0.05), (0.2, s * 2.5, 0.05)]
        bm = bmesh.new()
        vs = [bm.verts.new(v) for v in verts]
        bm.faces.new(vs if s > 0 else list(reversed(vs)))
        bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.12)
        G.ajouter(bm, "violet_fonce")
        G.ajouter(B.tube([(0.85, s * 0.62, 0.02), (0.25, s * 2.5, 0.08)], 0.05, 5), "violet_fonce")
        S.anim(f"aile{'d' if s > 0 else 'g'}", G, "balance", origine=(0.0, s * 0.65, 0.0), axe=[1, 0, 0], ampl=0.35, vitesse=1.3, phase=0.0 if s > 0 else math.pi)


# ---------- le poisson volant ----------
def poisson(S):
    L = S.L
    corps_fuseau(0.9, [0.04, 0.12, 0.15, 0.12, 0.06], "turquoise", L, aplati=0.85, segments=10)
    L.ajouter(B.sphere(0.1, 8, 6), "creme", B.mat4((0.1, 0, -0.06), (0, 0, 0), (2.6, 0.9, 0.5)))
    for s in (-1, 1):
        oeil(L, Vector((0.32, s * 0.09, 0.03)), 0.04, (0.5, s, 0))
        L.ajouter(B.boite(0.35, 0.6, 0.02), "glace", B.mat4((0.05, s * 0.4, 0.04), (0, 0, s * 0.25)))
    for s in (-1, 1):
        L.ajouter(B.tube([(-0.42, 0, 0), (-0.62, 0, s * 0.18)], [0.04, 0.01], 4), "turquoise")


# ---------- le navire marchand ----------
def marchand(S):
    L = S.L
    bm = B.demi_sphere(1.0, 20, 6)
    B.deformer(bm, lambda c: Vector((c.x * 2.6, c.y * 1.0 * (1 - max(0.0, c.x) * 0.3), -c.z * 0.9 + 0.75)))
    L.ajouter(bm, "bois", B.mat4())
    t = B.tore(1.0, 0.07, 28, 5)
    B.deformer(t, lambda c: Vector((c.x * 2.6, c.y * 1.0 * (1 - max(0.0, c.x) * 0.3), c.z + 0.75)))
    L.ajouter(t, "jaune")
    L.ajouter(B.boite(4.6, 1.6, 0.08), "planche", B.mat4((-0.1, 0, 0.62)))
    L.ajouter(B.boite(1.3, 1.7, 0.7), "bois2", B.mat4((-2.0, 0, 0.62)))
    L.ajouter(B.boite(0.08, 0.35, 0.3), "lumiere", B.mat4((-2.66, 0, 0.95)))
    # la cargaison : des caisses, des tonneaux, des sacs
    rnd = random.Random(9)
    for k in range(5):
        x, y = rnd.uniform(-1.0, 1.4), rnd.uniform(-0.5, 0.5)
        L.ajouter(B.boite(0.45, 0.45, 0.45), rnd.choice(("bois_clair", "planche")), B.mat4((x, y, 0.66), (0, 0, rnd.uniform(0, 0.4))))
    for k in range(3):
        L.ajouter(B.tube([(0, 0, 0), (0, 0, 0.25), (0, 0, 0.5)], [0.18, 0.22, 0.18], 10), "planche", B.mat4((1.6 - k * 0.45, 0.55, 0.66)))
    for k in range(3):
        L.ajouter(B.sphere(0.22, 8, 6), "paille", B.mat4((-0.6 + k * 0.4, -0.55, 0.8), (0, 0, 0), (1, 0.8, 0.7)))
    # le mât, la vergue, la voile crème à rayures rouges, un fanion turquoise
    L.ajouter(B.cyl(0.08, 0.06, 4.4, 8), "bois_fonce", B.mat4((0.3, 0, 0.65)))
    L.ajouter(B.cyl(0.05, 0.05, 2.6, 6), "bois_fonce", B.mat4((0.36, -1.3, 4.3), (-math.pi / 2, 0, 0)))
    for k in range(5):
        L.ajouter(B.boite(0.06, 2.4, 0.52), "creme" if k % 2 == 0 else "rouge", B.mat4((0.45 + k * 0.02, 0, 3.75 - k * 0.52), (0, -0.04, 0)))
    L.ajouter(B.boite(0.03, 0.9, 0.35), "turquoise", B.mat4((0.3, 0.45, 5.05)))
    L.ajouter(B.tube([(2.6, 0, 0.8), (3.5, 0, 1.3)], 0.06, 6), "bois_fonce")
    L.ajouter(B.tube([(3.5, 0, 1.3), (0.35, 0, 4.9)], 0.015, 3), "corde")
    L.ajouter(B.tube([(-2.6, 0, 1.3), (0.3, 0, 4.9)], 0.015, 3), "corde")
    S.lumieres.append(Vector((-2.7, 0, 0.95)))


# ---------- la barque de pêche ----------
def peche(S):
    L = S.L
    bm = B.demi_sphere(1.0, 16, 5)
    B.deformer(bm, lambda c: Vector((c.x * 1.5, c.y * 0.7 * (1 - max(0.0, c.x) * 0.4), -c.z * 0.5 + 0.3)))
    L.ajouter(bm, "bois2", B.mat4())
    t = B.tore(1.0, 0.05, 20, 4)
    B.deformer(t, lambda c: Vector((c.x * 1.5, c.y * 0.7 * (1 - max(0.0, c.x) * 0.4), c.z + 0.3)))
    L.ajouter(t, "turquoise")
    L.ajouter(B.boite(0.16, 1.1, 0.06), "bois_clair", B.mat4((-0.2, 0, 0.22)))
    # le pêcheur (rond, chapeau de paille) assis, un seau, un filet
    L.ajouter(B.sphere(0.28, 12, 8), "orange", B.mat4((-0.2, 0, 0.5), (0, 0, 0), (1, 1, 1.1)))
    L.ajouter(B.sphere(0.2, 12, 8), "gres", B.mat4((-0.2, 0, 0.88)))
    L.ajouter(B.cyl(0.36, 0.2, 0.1, 14), "paille", B.mat4((-0.2, 0, 1.0)))
    L.ajouter(B.cyl(0.18, 0.0, 0.2, 10), "paille", B.mat4((-0.2, 0, 1.08)))
    for s in (-1, 1):
        L.ajouter(B.sphere(0.04, 6, 4), "noir", B.mat4((-0.03, s * 0.08, 0.92)))
    L.ajouter(B.cyl(0.14, 0.12, 0.2, 10), "fer", B.mat4((0.6, 0.25, 0.15)))
    for k in range(6):
        L.ajouter(B.tube([(0.3 + k * 0.06, -0.3, 0.3), (0.5 + k * 0.05, -0.75, 0.05)], 0.01, 3), "corde")
    L.ajouter(B.cyl(0.03, 0.03, 1.0, 5), "bois_fonce", B.mat4((-1.2, 0, 0.3)))
    L.ajouter(B.cyl(0.08, 0.08, 0.16, 8), "lumiere", B.mat4((-1.2, 0, 1.25)))
    L.ajouter(B.cyl(0.1, 0.0, 0.1, 8), "fer", B.mat4((-1.2, 0, 1.41)))
    # la canne à pêche (elle se balance), son fil et son bouchon
    G = B.Lot()
    G.ajouter(B.tube([(0.0, 0.15, 0.6), (1.2, 0.5, 1.6), (2.0, 0.7, 1.9)], [0.025, 0.018, 0.01], 4), "bois")
    G.ajouter(B.tube([(2.0, 0.7, 1.9), (2.15, 0.75, 0.1)], 0.006, 3), "blanc")
    G.ajouter(B.sphere(0.07, 8, 6), "rouge", B.mat4((2.15, 0.75, 0.08)))
    S.anim("canne", G, "balance", origine=(0.0, 0.15, 0.6), axe=[0, 1, 0], ampl=0.08, vitesse=0.9)
    S.lumieres.append(Vector((-1.2, 0, 1.3)))


# ---------- la bouée ----------
def bouee(S):
    L = S.L
    L.ajouter(B.demi_sphere(0.6, 18, 6, bas=True), "rouge", B.mat4((0, 0, 0.1)))
    for k in range(3):
        L.ajouter(B.cyl(0.45 - k * 0.08, 0.38 - k * 0.08, 0.3, 14), "rouge" if k % 2 else "blanc", B.mat4((0, 0, 0.1 + k * 0.3)))
    for k in range(4):
        a = k * math.pi / 2
        L.ajouter(B.cyl(0.03, 0.03, 0.6, 4), "fer", B.mat4((math.cos(a) * 0.2, math.sin(a) * 0.2, 1.0)))
    L.ajouter(B.cyl(0.3, 0.3, 0.05, 12), "fer", B.mat4((0, 0, 1.0)))
    L.ajouter(B.cyl(0.18, 0.28, 0.25, 12), "or", B.mat4((0, 0, 1.15)))  # la cloche
    L.ajouter(B.cyl(0.25, 0.0, 0.2, 8), "fer", B.mat4((0, 0, 1.6)))
    G = B.Lot()
    G.ajouter(B.sphere(0.13, 10, 8), "lumiere", B.mat4((0, 0, 1.5)))
    S.anim("feu", G, "clignote", lent=1)
    S.lumieres.append(Vector((0, 0, 1.5)))


# ---------- l'épave flottante ----------
def epave(S):
    L = S.L
    for k, (x, y, r) in enumerate(((0, 0, 0.0), (0.7, 0.4, 1.4), (-0.6, 0.5, 0.6))):
        L.ajouter(B.tube([(0, 0, -0.28), (0, 0, 0), (0, 0, 0.28)], [0.22, 0.27, 0.22], 12), "planche", B.mat4((x, y, 0.05), (math.pi / 2, 0, r)))
        for dz in (-0.18, 0.18):
            L.ajouter(B.tore(0.25, 0.025, 14, 4), "fer", B.mat4((x, y, 0.05), (math.pi / 2, 0, r)) @ B.mat4((0, 0, dz)))
    L.ajouter(B.boite(0.5, 0.5, 0.45), "bois_clair", B.mat4((-0.1, -0.6, -0.15), (0.2, 0.1, 0.5)))
    L.ajouter(B.boite(1.8, 0.25, 0.06), "bois2", B.mat4((0.2, -0.2, 0.0), (0, 0, 0.3)))
    # une mouette posée sur la caisse
    L.ajouter(B.sphere(0.13, 10, 8), "blanc", B.mat4((-0.1, -0.6, 0.42), (0, 0, 0), (1.4, 0.9, 0.9)))
    L.ajouter(B.sphere(0.08, 8, 6), "blanc", B.mat4((0.08, -0.6, 0.55)))
    L.ajouter(B.cyl(0.03, 0.0, 0.1, 5), "jaune", B.mat4((0.15, -0.6, 0.55), (0, math.pi / 2, 0)))
    L.ajouter(B.boite(0.25, 0.04, 0.08), "gris", B.mat4((-0.15, -0.5, 0.45), (0, 0.3, 0)))


SORTES = {"baleine": baleine, "dauphin": dauphin, "tortue": tortue, "raie": raie, "poisson": poisson,
          "marchand": marchand, "peche": peche, "bouee": bouee, "epave": epave}


def construire(rendu=True, exporter=True):
    import barhaw_iles_v4 as I
    coll = B.collection("vie_mer")
    infos = {}
    for nom, fabrique in SORTES.items():
        S = Sorte(nom, coll)
        fabrique(S)
        corps = S.finir()
        infos[nom] = I.patiner(corps, S.lumieres)
    B.nettoyer()
    infos["triangles"] = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in coll.objects if o.type == "MESH")
    if exporter:
        infos["glb"] = B.exporter(coll.name, "vie-mer.glb")
        infos["leger"] = B.exporter_leger(coll.name, "vie-mer-leger.glb", ratio=0.5)
    if rendu:
        # une planche de tout ce qui vit dans la mer (les sortes côte à côte)
        decal = {"baleine": (0, 0, 0), "dauphin": (0, 7, 0), "tortue": (4, 6, 0), "raie": (-6, 5, 0), "poisson": (6, 3, 1),
                 "marchand": (-8, -6, 0), "peche": (3, -6, 0), "bouee": (8, -3, 0), "epave": (7, 0, 0)}
        for o in coll.objects:
            d = decal.get(o.name.split("_")[0].split(".")[0], (0, 0, 0))
            o.location = Vector(o.location) + Vector(d)
        infos["rendu"] = B.vitrine([coll.name], cam=(18, -22, 14), cible=(0, 0, 0.5), objectif=40, nom="vie-mer", taille=(1400, 900))
        B.fin_vitrine()
        for o in coll.objects:
            d = decal.get(o.name.split("_")[0].split(".")[0], (0, 0, 0))
            o.location = Vector(o.location) - Vector(d)
    return infos
