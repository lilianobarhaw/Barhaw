# Les décors des jeux du site pour la VF 1.0 (tous inventés), rendus en images : img/jeux/<nom>.webp
#   memory   : la table de jeu (tapis, bougie, pièces, coffre, boussole) où se posent les cartes
#   quiz     : le plateau télé (grand écran à ampoules, projecteurs, pupitres à buzzer)
#   rumble   : l'arène (le ring, ses cordes, les gradins qui brillent) ; rumble-avant = les cordes de devant, à part
#   docteur  : le cabinet (lit d'examen, étagère à bocaux, fenêtre de nuit, bureau)
#   remedes  : les 8 remèdes de Docteur Chopper (pansement, glace, sieste, viande, tisane, câlin, crème, barbe à papa)
#   iles     : six îles de GRAND LINE vues de côté, pour l'horizon de la course de Chopper (img/jeux/course-ile-<nom>.webp)
# Usage dans Blender :
#   import barhaw_jeux_vf as J ; J.rendre("memory")   (ou "quiz", "rumble", "rumble-avant", "docteur", "remedes", "iles")
import math
import bpy
from mathutils import Vector
import barhaw_base as B

B.PALETTE.update({
    "tapis": 0x3a1640, "scene_sol": 0x241029, "ecran": 0x150a1d, "neon_rose": 0xff4f9a, "neon_violet": 0xa66bff,
    "toile": 0xfbe9f1, "nuit": 0x2a1d5c, "glace_poche": 0x8fd4f0, "viande": 0xb5532e, "the_tisane": 0xc98a3a,
    "carreau_a": 0xf6e6d6, "carreau_b": 0xf2a9c8, "mur_cabinet": 0xf7b6d0,
})
B.LUMINEUX.update({"neon_rose": 5.0, "neon_violet": 5.0})
TAILLE = (1200, 800)


def lot_objet(nom, coll, f, angle=38):
    L = B.Lot()
    f(L)
    return L.objet(nom, coll, angle=angle)


def lampe(coll, nom, genre, pos, energie, couleur=0xffffff, taille=1.0, cible=None):
    import bpy
    l = bpy.data.lights.new(nom, genre)
    l.energy = energie
    l.color = B.rgb(couleur)
    if genre == "AREA":
        l.size = taille
    elif genre in ("POINT", "SPOT"):
        l.shadow_soft_size = taille
    o = bpy.data.objects.new(nom, l)
    coll.objects.link(o)
    o.location = Vector(pos)
    if cible:
        o.rotation_euler = (Vector(cible) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()
    return o


# ---------- le Memory : la table de jeu ----------
def memory():
    coll = B.collection("jeu_memory")

    def f(L):
        L.ajouter(B.boite(30, 26, 0.4), "bois2", B.mat4((0, 4, -0.4)))
        for k in range(-5, 14):
            L.ajouter(B.boite(30, 0.05, 0.02), "bois_fonce", B.mat4((0, k * 1.25, 0)))
        L.ajouter(B.boite(10.2, 6.9, 0.06), "tapis", B.mat4((0, 0.2, 0)))
        for (x, y, l, p) in ((0, 3.65, 10.4, 0.18), (0, -3.25, 10.4, 0.18), (-5.1, 0.2, 0.18, 7.1), (5.1, 0.2, 0.18, 7.1)):
            L.ajouter(B.boite(l, p, 0.09), "or", B.mat4((x, y, 0)))
        # la bougie (en haut à gauche)
        L.ajouter(B.cyl(0.62, 0.62, 0.08, 20), "laiton", B.mat4((-6.6, 3.7, 0)))
        L.ajouter(B.cyl(0.3, 0.3, 1.5, 16), "creme", B.mat4((-6.6, 3.7, 0.08)))
        L.ajouter(B.sphere(0.13, 10, 8), "flamme", B.mat4((-6.6, 3.7, 1.78), ech=(1, 1, 2.1)))
        # les pièces (en bas à droite) : une pile et quelques pièces tombées
        for k in range(6):
            L.ajouter(B.cyl(0.38, 0.38, 0.09, 18), "or", B.mat4((6.3 + 0.03 * (k % 2), -3.7 + 0.02 * k, k * 0.09)))
        for (x, y, a) in ((5.4, -4.4, 0.3), (7.1, -3.1, 1.2), (6.6, -4.7, 2.0)):
            L.ajouter(B.cyl(0.38, 0.38, 0.08, 18), "or", B.mat4((x, y, 0), (0.0, 0.0, a)))
        # le petit coffre (en haut à droite)
        L.ajouter(B.boite(1.7, 1.1, 0.9), "bois2", B.mat4((6.6, 3.9, 0)))
        for x in (5.95, 7.25):
            L.ajouter(B.boite(0.12, 1.14, 0.94), "or", B.mat4((x, 3.9, -0.01)))
        L.ajouter(B.boite(1.7, 0.14, 0.95), "bois", B.mat4((6.6, 4.5, 0.85), (math.radians(-25), 0, 0)))
        L.ajouter(B.boite(0.26, 0.1, 0.32), "or", B.mat4((6.6, 3.33, 0.45)))
        for k, c in enumerate(("rose", "violet", "creme")):
            L.ajouter(B.boite(0.5, 0.04, 0.7), c, B.mat4((6.25 + k * 0.32, 3.95, 0.75), (0, math.radians(-14 + 14 * k), 0)))
        # la boussole (en bas à gauche)
        L.ajouter(B.cyl(0.85, 0.85, 0.16, 32), "laiton", B.mat4((-6.4, -3.6, 0)))
        L.ajouter(B.cyl(0.7, 0.7, 0.04, 32), "creme", B.mat4((-6.4, -3.6, 0.16)))
        L.ajouter(B.boite(0.12, 0.6, 0.03), "rouge", B.mat4((-6.4, -3.35, 0.2), (0, 0, 0.5)))
        L.ajouter(B.boite(0.12, 0.6, 0.03), "noir", B.mat4((-6.4, -3.85, 0.2), (0, 0, 0.5)))
        L.ajouter(B.tore(0.16, 0.05, 12, 6), "laiton", B.mat4((-6.4, -2.68, 0.08), (math.pi / 2, 0, 0)))
        # deux cartes tombées au bord du tapis
        L.ajouter(B.boite(0.95, 1.35, 0.03), "rose", B.mat4((-5.7, 0.9, 0.0), (0, 0, 0.35)))
        L.ajouter(B.boite(0.95, 1.35, 0.03), "violet", B.mat4((-5.5, 0.3, 0.03), (0, 0, -0.2)))
        L.ajouter(B.boite(0.95, 1.35, 0.03), "violet", B.mat4((5.7, -0.6, 0.0), (0, 0, 0.5)))

    lot_objet("memory_table", coll, f)
    lampe(coll, "memory_bougie", "POINT", (-6.6, 3.7, 2.2), 120, 0xffb066, 0.4)
    lampe(coll, "memory_ciel", "SPOT", (0, -4, 14), 9000, 0xffe1ef, 1.5, (0, 0.4, 0)).data.spot_size = math.radians(70)
    return [coll.name], (0, -10.2, 12.8), (0, 0.4, 0), 30


# ---------- le quiz : le plateau télé ----------
def quiz():
    coll = B.collection("jeu_quiz")

    def f(L):
        L.ajouter(B.boite(30, 18, 0.2), "scene_sol", B.mat4((0, 2, -0.2)))
        L.ajouter(B.tore(3.4, 0.07, 64, 6), "neon_rose", B.mat4((0, -0.5, 0.02)))
        L.ajouter(B.tore(4.1, 0.05, 64, 6), "neon_violet", B.mat4((0, -0.5, 0.02)))
        L.ajouter(B.boite(30, 0.4, 14), "violet_fonce", B.mat4((0, 6.4, 0)))
        for s in (-1, 1):
            for k in range(3):
                L.ajouter(B.boite(0.16, 0.1, 9.5), "neon_violet" if k % 2 else "neon_rose", B.mat4((s * (7.6 + k * 1.3), 6.15, 1.0)))
        # le grand écran à ampoules
        L.ajouter(B.boite(10.8, 0.5, 6.6), "or", B.mat4((0, 5.9, 3.3)))
        L.ajouter(B.boite(9.8, 0.2, 5.6), "ecran", B.mat4((0, 5.62, 3.8)))
        for k in range(15):
            x = -5.0 + k * (10.0 / 14)
            for z in (3.55, 9.65):
                L.ajouter(B.sphere(0.16, 10, 8), "lumiere", B.mat4((x, 5.6, z)))
        for k in range(1, 8):
            z = 3.55 + k * (6.1 / 8)
            for x in (-5.1, 5.1):
                L.ajouter(B.sphere(0.16, 10, 8), "lumiere", B.mat4((x, 5.6, z)))
        # les projecteurs, en haut
        L.ajouter(B.boite(26, 0.35, 0.35), "fer", B.mat4((0, 3.0, 11.6)))
        for x in (-9, -4.5, 4.5, 9):
            L.ajouter(B.cyl(0.05, 0.05, 0.6, 6), "fer", B.mat4((x, 3.0, 11.0)))
            M = B.mat4((x, 3.0, 11.0), (math.radians(150), 0, math.radians(-8 if x > 0 else 8)))
            L.ajouter(B.cyl(0.55, 0.38, 1.1, 16), "noir", M)
            L.ajouter(B.cyl(0.5, 0.5, 0.05, 16), "lumiere", M @ B.mat4((0, 0, 1.1)))
        # deux pupitres à buzzer, devant
        for s in (-1, 1):
            x = s * 8.2
            L.ajouter(B.boite(2.8, 1.7, 2.5), "rose" if s < 0 else "violet", B.mat4((x, -2.8, 0)))
            L.ajouter(B.boite(3.1, 2.0, 0.16), "prune", B.mat4((x, -2.8, 2.5)))
            L.ajouter(B.boite(2.2, 0.06, 0.5), "or", B.mat4((x, -3.66, 1.5)))
            L.ajouter(B.etoile(0.36, 0.15, 0.08, 5, 0.6), "creme", B.mat4((x, -3.72, 0.9), (math.pi / 2, 0, 0)))
            L.ajouter(B.cyl(0.55, 0.6, 0.18, 20), "noir", B.mat4((x, -2.8, 2.66)))
            L.ajouter(B.demi_sphere(0.46, 20, 6), "rouge", B.mat4((x, -2.8, 2.84)))

    lot_objet("quiz_plateau", coll, f)
    lampe(coll, "quiz_rose", "AREA", (-6, -6, 9), 1800, 0xff8fc2, 6, (0, 4, 3))
    lampe(coll, "quiz_violet", "AREA", (6, -6, 9), 1800, 0xb98cff, 6, (0, 4, 3))
    return [coll.name], (0, -17.5, 4.6), (0, 3, 4.8), 28


# ---------- la Rumble : l'arène ----------
def rumble(avant=False):
    coll = B.collection("jeu_rumble_avant" if avant else "jeu_rumble")
    P = 4.2  # les poteaux aux coins
    hauteurs = (1.75, 2.3, 2.85)
    couleurs = ("rose", "creme", "violet")

    def corde(L, a, b, z, c):
        mil = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z - 0.08)
        L.ajouter(B.tube([(a[0], a[1], z), mil, (b[0], b[1], z)], 0.06, 8), c, None)

    def fond(L):
        L.ajouter(B.boite(60, 60, 0.2), "noir", B.mat4((0, 6, -0.2)))
        L.ajouter(B.boite(9.2, 9.2, 1.0), "violet_fonce", B.mat4((0, 0, 0)))
        L.ajouter(B.boite(9.4, 9.4, 0.3), "prune", B.mat4((0, 0, 0.25)))
        L.ajouter(B.boite(8.8, 8.8, 0.08), "toile", B.mat4((0, 0, 1.0)))
        L.ajouter(B.cyl(2.5, 2.5, 0.02, 64), "rose", B.mat4((0, 0, 1.08)))
        L.ajouter(B.cyl(2.25, 2.25, 0.02, 64), "toile", B.mat4((0, 0, 1.09)))
        for (x, y) in ((-P, P), (P, P)):
            L.ajouter(B.cyl(0.17, 0.17, 2.4, 12), "or", B.mat4((x, y, 1.0)))
            L.ajouter(B.boite(0.42, 0.42, 1.5), "rose", B.mat4((x, y, 1.6)))
        for z, c in zip(hauteurs, couleurs):
            corde(L, (-P, P), (P, P), z, c)
            corde(L, (-P, -P), (-P, P), z, c)
            corde(L, (P, -P), (P, P), z, c)
        # les gradins : des marches sombres, et des bâtons lumineux dans le public
        import random
        r = random.Random(7)
        for k in range(5):
            d = 9.5 + k * 1.6
            h = 0.6 + k * 0.9
            L.ajouter(B.boite(2 * d + 6, 1.6, h), "prune" if k % 2 else "violet_fonce", B.mat4((0, d, 0)))
            for s in (-1, 1):
                L.ajouter(B.boite(1.6, 2 * d, h), "prune" if k % 2 else "violet_fonce", B.mat4((s * d, 0.6, 0)))
            for n in range(26):
                x = r.uniform(-d - 2, d + 2)
                L.ajouter(B.sphere(0.09, 6, 4), "neon_rose" if r.random() < 0.55 else "neon_violet", B.mat4((x, d + r.uniform(-0.5, 0.5), h + 0.35 + r.uniform(0, 0.5))))
        # la rampe de projecteurs au-dessus du ring
        for (x, y, l, p) in ((0, 5.5, 12, 0.3), (0, -5.5, 12, 0.3), (-5.5, 0, 0.3, 12), (5.5, 0, 0.3, 12)):
            L.ajouter(B.boite(l, p, 0.3), "fer", B.mat4((x, y, 9.0)))

    def devant(L):
        for (x, y) in ((-P, -P), (P, -P)):
            L.ajouter(B.cyl(0.17, 0.17, 2.4, 12), "or", B.mat4((x, y, 1.0)))
            L.ajouter(B.boite(0.42, 0.42, 1.5), "rose", B.mat4((x, y, 1.6)))
        for z, c in zip(hauteurs, couleurs):
            corde(L, (-P, -P), (P, -P), z, c)

    lot_objet("rumble_avant" if avant else "rumble_arene", coll, devant if avant else fond)
    lampe(coll, "rumble_haut", "AREA", (0, -2, 11), 2600, 0xfff0f6, 7, (0, 0, 1))
    lampe(coll, "rumble_rose", "SPOT", (-9, -6, 8), 2200, 0xff6fae, 0.5, (0, 0, 1))
    lampe(coll, "rumble_violet", "SPOT", (9, -6, 8), 2200, 0xa66bff, 0.5, (0, 0, 1))
    return [coll.name], (0, -14.2, 9.6), (0, 0.6, 1.4), 34


# ---------- Docteur Chopper : le cabinet ----------
def docteur():
    coll = B.collection("jeu_docteur")

    def f(L):
        for i in range(-12, 12):
            for j in range(-6, 5):
                L.ajouter(B.boite(1, 1, 0.05), "carreau_a" if (i + j) % 2 else "carreau_b", B.mat4((i + 0.5, j + 0.5, -0.05)))
        L.ajouter(B.boite(30, 0.3, 12), "mur_cabinet", B.mat4((0, 4.6, 0)))
        L.ajouter(B.boite(30, 0.34, 2.2), "bois_clair", B.mat4((0, 4.45, 0)))
        L.ajouter(B.boite(30, 0.42, 0.14), "bois", B.mat4((0, 4.4, 2.2)))
        # la fenêtre de nuit, à gauche
        L.ajouter(B.boite(3.2, 0.36, 3.4), "bois", B.mat4((-5, 4.4, 3.1)))
        L.ajouter(B.boite(2.7, 0.1, 2.9), "nuit", B.mat4((-5, 4.22, 3.35)))
        L.ajouter(B.boite(0.12, 0.14, 2.9), "bois", B.mat4((-5, 4.2, 3.35)))
        L.ajouter(B.boite(2.7, 0.14, 0.12), "bois", B.mat4((-5, 4.2, 4.75)))
        L.ajouter(B.sphere(0.32, 14, 10), "luciole", B.mat4((-5.7, 4.1, 5.6)))
        for (x, z) in ((-4.3, 5.9), (-4.6, 4.2), (-5.9, 4.0), (-4.1, 3.7)):
            L.ajouter(B.etoile(0.11, 0.05, 0.03, 4, 0.4), "luciole", B.mat4((x, 4.12, z), (math.pi / 2, 0, 0)))
        # la croix du cabinet, au mur
        L.ajouter(B.cyl(0.95, 0.95, 0.1, 32), "blanc", B.mat4((0, 4.45, 6.5), (math.pi / 2, 0, 0)))
        L.ajouter(B.boite(1.0, 0.1, 0.32), "rouge", B.mat4((0, 4.36, 6.34)))
        L.ajouter(B.boite(0.32, 0.1, 1.0), "rouge", B.mat4((0, 4.36, 6.0)))
        # l'étagère à bocaux, à droite
        for z in (3.3, 4.7):
            L.ajouter(B.boite(4.4, 0.8, 0.12), "bois", B.mat4((5, 4.05, z)))
        for k, (c, z) in enumerate((("rose", 3.42), ("turquoise", 3.42), ("or", 3.42), ("vert_clair", 4.82), ("violet", 4.82), ("rose_pale", 4.82))):
            x = 3.5 + (k % 3) * 1.45
            L.ajouter(B.cyl(0.42, 0.42, 0.95, 16), "verre", B.mat4((x, 4.05, z)))
            L.ajouter(B.cyl(0.37, 0.37, 0.6, 16), c, B.mat4((x, 4.05, z + 0.02)))
            L.ajouter(B.cyl(0.46, 0.46, 0.14, 16), "bois_fonce", B.mat4((x, 4.05, z + 0.95)))
        # le lit d'examen, au milieu
        for (x, y) in ((-2.4, 0.7), (2.4, 0.7), (-2.4, 2.5), (2.4, 2.5)):
            L.ajouter(B.cyl(0.08, 0.08, 1.0, 8), "fer", B.mat4((x, y, 0)))
        L.ajouter(B.boite(5.4, 2.3, 0.18), "fer", B.mat4((0, 1.6, 1.0)))
        L.ajouter(B.boite(5.2, 2.2, 0.45), "blanc", B.mat4((0, 1.6, 1.15)))
        L.ajouter(B.boite(2.6, 2.26, 0.12), "rose_pale", B.mat4((1.3, 1.6, 1.58)))
        L.ajouter(B.sphere(0.6, 16, 10), "rose", B.mat4((-2.0, 1.75, 1.78), ech=(1.2, 1.4, 0.45)))
        L.ajouter(B.boite(0.16, 2.3, 1.6), "fer", B.mat4((-2.75, 1.6, 1.0)))
        # le bureau, devant à droite : des livres et une lampe
        L.ajouter(B.boite(2.8, 1.5, 1.7), "bois", B.mat4((6.4, -1.0, 0)))
        L.ajouter(B.boite(3.0, 1.7, 0.14), "bois_fonce", B.mat4((6.4, -1.0, 1.7)))
        for k, c in enumerate(("rouge", "violet", "turquoise")):
            L.ajouter(B.boite(1.2, 0.85, 0.22), c, B.mat4((5.9, -1.0, 1.84 + k * 0.22), (0, 0, 0.1 * (k - 1))))
        L.ajouter(B.cyl(0.32, 0.32, 0.08, 16), "laiton", B.mat4((7.1, -0.8, 1.84)))
        L.ajouter(B.tube([(7.1, -0.8, 1.9), (7.15, -0.8, 2.6), (6.9, -0.8, 3.0)], 0.05, 8), "laiton", None)
        L.ajouter(B.cyl(0.42, 0.18, 0.5, 16), "rose", B.mat4((6.85, -0.8, 2.75), (math.radians(140), 0, 0)))
        # un pied à perfusion à gauche (sans perfusion : une bouteille de sirop rose)
        L.ajouter(B.cyl(0.4, 0.4, 0.06, 16), "fer", B.mat4((-6.3, -0.6, 0)))
        L.ajouter(B.cyl(0.05, 0.05, 4.0, 8), "fer", B.mat4((-6.3, -0.6, 0)))
        L.ajouter(B.boite(0.9, 0.06, 0.06), "fer", B.mat4((-6.3, -0.6, 4.0)))
        L.ajouter(B.cyl(0.26, 0.26, 0.7, 12), "verre", B.mat4((-6.65, -0.6, 3.05)))
        L.ajouter(B.cyl(0.22, 0.22, 0.45, 12), "rose", B.mat4((-6.65, -0.6, 3.07)))

    lot_objet("docteur_cabinet", coll, f)
    lampe(coll, "docteur_haut", "AREA", (0, -2, 8.5), 1000, 0xfff4e6, 8, (0, 1.5, 0))
    lampe(coll, "docteur_lampe", "POINT", (6.8, -1.2, 2.5), 150, 0xffc78a, 0.3)
    return [coll.name], (0, -12.2, 4.4), (0, 2.0, 2.6), 28


# ---------- les 8 remèdes ----------
def r_pansement(L):
    for a in (0.45, -0.45):
        M = B.mat4((0, 0, 0.1 if a > 0 else 0.0), (0, 0, a))
        L.ajouter(B.boite(2.6, 0.85, 0.1), "creme", M)
        L.ajouter(B.boite(0.85, 0.9, 0.14), "rose_pale", M)
        for x in (-0.9, 0.9):
            for y in (-0.18, 0.18):
                L.ajouter(B.cyl(0.04, 0.04, 0.12, 6), "rose", M @ B.mat4((x, y, 0.04)))


def r_glace(L):
    L.ajouter(B.sphere(1.0, 20, 12), "glace_poche", B.mat4((0, 0, 0.4), ech=(1.15, 0.95, 0.42)))
    L.ajouter(B.cyl(0.32, 0.36, 0.42, 16), "turquoise", B.mat4((0, 0.95, 0.42), (math.radians(-80), 0, 0)))
    for (x, y, a) in ((-0.9, -0.9, 0.3), (0.95, -0.75, 0.9), (0.2, -1.2, 1.5)):
        L.ajouter(B.boite(0.42, 0.42, 0.42), "glace", B.mat4((x, y, 0), (0.2, 0.1, a)))


def r_sieste(L):
    L.ajouter(B.sphere(1.0, 24, 14), "blanc", B.mat4((0, 0, 0.45), ech=(1.45, 0.95, 0.45)))
    L.ajouter(B.sphere(1.0, 24, 14), "rose_pale", B.mat4((0, 0, 0.66), ech=(1.2, 0.75, 0.2)))
    L.ajouter(B.etoile(0.38, 0.16, 0.12, 5, 0.6), "luciole", B.mat4((1.05, -0.2, 1.35), (math.pi / 2, 0.3, 0)))
    L.ajouter(B.etoile(0.22, 0.1, 0.08, 5, 0.6), "or", B.mat4((1.55, -0.1, 1.85), (math.pi / 2, -0.2, 0)))


def r_viande(L):
    L.ajouter(B.sphere(1.0, 22, 14), "viande", B.mat4((0, 0, 0.75), ech=(1.05, 0.8, 0.8)))
    L.ajouter(B.tube([(-1.75, 0, 0.75), (1.75, 0, 0.75)], 0.17, 10), "os", None)
    for x in (-1.85, 1.85):
        for y in (-0.15, 0.15):
            L.ajouter(B.sphere(0.24, 12, 8), "os", B.mat4((x, y, 0.75)))


def r_tisane(L):
    L.ajouter(B.cyl(1.25, 1.25, 0.1, 28), "blanc", B.mat4((0, 0, 0)))
    L.ajouter(B.tube([(0, 0, 0.1), (0, 0, 0.3), (0, 0, 0.8), (0, 0, 1.25)], [0.45, 0.7, 0.85, 0.9], 24), "rose_pale", None)
    L.ajouter(B.cyl(0.82, 0.82, 0.04, 24), "the_tisane", B.mat4((0, 0, 1.1)))
    L.ajouter(B.tore(0.32, 0.08, 16, 6), "rose_pale", B.mat4((0.95, 0, 0.75), (math.pi / 2, 0, 0)))
    for k, x in enumerate((-0.25, 0.25)):
        L.ajouter(B.tube([(x, 0, 1.3), (x + 0.15, 0, 1.7), (x - 0.1, 0, 2.1), (x + 0.1, 0, 2.4)], 0.05, 6), "blanc", None)


def r_calin(L):
    for x in (-0.48, 0.48):
        L.ajouter(B.sphere(0.62, 20, 12), "rose", B.mat4((x, 0, 1.45), ech=(1, 0.75, 1)))
    L.ajouter(B.cyl(0.98, 0.02, 1.45, 24), "rose", B.mat4((0, 0, 1.4), (math.pi, 0, 0), (1, 0.62, 1)))
    L.ajouter(B.sphere(0.2, 12, 8), "rose_pale", B.mat4((-0.55, -0.42, 1.65)))
    L.ajouter(B.boite(0.6, 0.12, 0.28), "or", B.mat4((0.4, -0.45, 1.85), (0, 0.4, 0)))


def r_creme(L):
    L.ajouter(B.cyl(0.48, 0.48, 1.9, 20), "blanc", B.mat4((0, 0, 0.5), (0, math.radians(78), 0)))
    L.ajouter(B.boite(0.08, 1.1, 0.12), "blanc", B.mat4((-0.36, 0, 0.42)))
    L.ajouter(B.cyl(0.49, 0.49, 0.55, 20), "rose_pale", B.mat4((0.2, 0, 0.6), (0, math.radians(78), 0)))
    L.ajouter(B.cyl(0.3, 0.3, 0.45, 16), "rose", B.mat4((1.75, 0, 0.88), (0, math.radians(78), 0)))


def r_bonbon(L):
    L.ajouter(B.cyl(0.07, 0.07, 1.6, 8), "bois_clair", B.mat4((0, 0, 0)))
    import random
    r = random.Random(3)
    for k in range(9):
        a = k * 0.7
        L.ajouter(B.ico(0.42 + r.random() * 0.18, 2), "rose_pale" if k % 3 else "rose", B.mat4((math.cos(a) * 0.4, math.sin(a) * 0.3, 1.9 + (k % 3) * 0.25)))


REMEDES = {"pansement": r_pansement, "glace": r_glace, "sieste": r_sieste, "viande": r_viande, "tisane": r_tisane, "calin": r_calin, "creme": r_creme, "bonbon": r_bonbon}


def remedes(taille=(320, 320), noms=None):
    faits = {}
    for nom, f in REMEDES.items():
        if noms and nom not in noms:
            continue
        coll = B.collection("remede_" + nom)
        o = lot_objet("remede_" + nom, coll, f, angle=40)
        coins = [o.matrix_world @ Vector(k) for k in o.bound_box]
        mn = Vector((min(v.x for v in coins), min(v.y for v in coins), min(v.z for v in coins)))
        mx = Vector((max(v.x for v in coins), max(v.y for v in coins), max(v.z for v in coins)))
        c = (mn + mx) / 2
        R = (mx - mn).length / 2
        cam = c + Vector((0.45, -0.85, 0.55)).normalized() * R * 3.0
        try:
            faits[nom] = B.vitrine([coll.name], cam=tuple(cam), cible=tuple(c), objectif=42, nom="remede-" + nom, taille=taille, mer=False, trait=1.3, transparent=True)
        finally:
            B.fin_vitrine()
    return faits


# ---------- les îles de l'horizon de la course (déjà faites pour GRAND LINE), vues de côté ----------
ILES_COURSE = ("ile_phare_v4", "ile_cristal_v4", "ile_archipel_v4", "ile_forteresse_v4", "ile_champignons", "ile_tonnerre")


def iles_course(taille=(640, 360)):
    faits = {}
    for nom in ILES_COURSE:
        coll = bpy.data.collections.get(nom)
        objs = [o for o in coll.all_objects if o.type == "MESH"] if coll else []
        if not objs:
            continue
        coins = [o.matrix_world @ Vector(k) for o in objs for k in o.bound_box]
        mn = Vector((min(v.x for v in coins), min(v.y for v in coins), min(v.z for v in coins)))
        mx = Vector((max(v.x for v in coins), max(v.y for v in coins), max(v.z for v in coins)))
        c = (mn + mx) / 2
        R = max((mx - mn).x, (mx - mn).z * 1.6) / 2
        cam = c + Vector((0, -1, 0.16)).normalized() * R * 3.2
        try:
            faits[nom] = B.vitrine([coll.name], cam=tuple(cam), cible=tuple(c), objectif=50, nom="course-" + nom.replace("ile_", "").replace("_v4", ""), taille=taille, mer=False, trait=1.2, transparent=True)
        finally:
            B.fin_vitrine()
    return faits


SCENES = {"memory": memory, "quiz": quiz, "rumble": rumble, "rumble-avant": lambda: rumble(avant=True), "docteur": docteur}


def rendre(nom, taille=TAILLE):
    if nom == "remedes":
        return remedes()
    if nom == "iles":
        return iles_course()
    B.nettoyer()
    colls, cam, cible, objectif = SCENES[nom]()
    try:
        return B.vitrine(colls, cam=cam, cible=cible, objectif=objectif, nom="jeu-" + nom, taille=taille, mer=False, trait=1.5, transparent=(nom == "rumble-avant"), fond=0x1a0a14, fond_force=0.45)
    finally:
        B.fin_vitrine()
