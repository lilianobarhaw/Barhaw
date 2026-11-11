# La mer en fête (V4) : ce qui s'ajoute à GRAND LINE pour les défis, la nuit et les grands moments. Tout est inventé.
#   balise      une bouée d'arène (rayures rose, crème, violet), son écusson aux sabres croisés, son fanion, sa lanterne
#   guirlande   8 unités de fanions et d'ampoules entre deux balises (le site l'étire à la bonne longueur)
#   ponton      le ponton de l'arbitre : un radeau sur tonneaux, le gong, le tableau des scores, deux braseros,
#               le grand mât, et le crabe arbitre (casquette de capitaine, un petit drapeau dans chaque pince)
#   barge       la barge des feux d'artifice : mortiers, caisses de fusées, tente rayée, guirlande d'ampoules
#   etoilee     la Baleine étoilée : immense, bleu nuit, le dos semé d'étoiles qui s'allument la nuit, un croissant d'or
#   dirigeable  le Nuage-Voilier : un ballon rayé, sa nacelle en forme de barque, deux hélices, des ailes de toile
#   couronne    la couronne du vainqueur (elle tourne au-dessus du navire qui a gagné le défi)
#   lanterne    une lanterne de papier qui flotte ; lotus : une lanterne-fleur ; celeste : une lanterne qui s'envole
#   meduse      une méduse qui luit, la nuit, juste sous la surface
# Un seul fichier : fete-mer.glb (et fete-mer-leger.glb pour les téléphones). Le site sépare les sortes par le début du nom.
# Usage, dans Blender :  import barhaw_fete_mer_v4 as F; F.construire()
import math, random, bmesh, bpy
from mathutils import Vector, Matrix
import barhaw_base as B
import barhaw_vie_mer_v4 as V

# deux couleurs de plus (le site les connaît aussi : js/grandline-3d.js, COULEURS)
B.PALETTE.setdefault("nuit", 0x2c2f7a)
B.PALETTE.setdefault("astre", 0xa8f0ff)
B.LUMINEUX.setdefault("astre", 3.0)
# les drapeaux et les fanions : une seule épaisseur de toile, visible des deux côtés et sans contour sur le site (matières « fanion_* »)
for _nom, _c in (("fanion_rose", 0xff4f9a), ("fanion_or", 0xffc23d), ("fanion_violet", 0x9b4dff), ("fanion_turquoise", 0x2fd3c4), ("fanion_creme", 0xfff1d6)):
    B.PALETTE.setdefault(_nom, _c)

# (pas de matière « drapeau » ici : sur le site, celle-là porte une toile dessinée, avec des UV)
Sorte, oeil, corps_fuseau = V.Sorte, V.oeil, V.corps_fuseau
PI = math.pi


# ---------- quelques formes de plus ----------
def plaque(pts, double=True, ep=0.0):
    """Un polygone plat (un fanion, une aile) ; double : visible des deux côtés ; ep : une vraie épaisseur."""
    bm = bmesh.new()
    a = [bm.verts.new(p) for p in pts]
    bm.faces.new(a)
    if ep:
        bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=ep)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    elif double:
        b = [bm.verts.new(p) for p in pts]
        bm.faces.new(list(reversed(b)))
    return bm


def drap(longueur, hauteur, n=6, pointe=False, vague=0.08, double=False):
    """Un drapeau qui part de x = 0 vers +x, un peu gondolé ; pointe : un fanion (il finit en pointe)."""
    bm = bmesh.new()
    haut, bas = [], []
    for i in range(n + 1):
        t = i / n
        h = hauteur * (1 - t * (0.94 if pointe else 0.0)) / 2
        y = math.sin(t * PI * 1.7) * vague * (0.3 + t)
        haut.append(bm.verts.new((longueur * t, y, h)))
        bas.append(bm.verts.new((longueur * t, y, -h)))
    for i in range(n):
        bm.faces.new((bas[i], bas[i + 1], haut[i + 1], haut[i]))
    if double:
        copie = bmesh.ops.duplicate(bm, geom=bm.faces[:])
        bmesh.ops.reverse_faces(bm, faces=[g for g in copie["geom"] if isinstance(g, bmesh.types.BMFace)])
    return bm


def coque(longueur, largeur, creux, haut, seg=20, pince=0.3):
    """Une coque de barque : le dessus (plat) à z = haut, la proue en +x."""
    bm = B.demi_sphere(1.0, seg, 6)
    B.deformer(bm, lambda c: Vector((c.x * longueur / 2, c.y * largeur / 2 * (1 - max(0.0, c.x) * pince), -c.z * creux + haut)))
    return bm


def lisse_coque(longueur, largeur, haut, r=0.06, seg=24, pince=0.3):
    t = B.tore(1.0, r, seg, 5)
    B.deformer(t, lambda c: Vector((c.x * longueur / 2, c.y * largeur / 2 * (1 - max(0.0, c.x) * pince), c.z + haut)))
    return t


def tonneau(L, M, r=0.3, h=1.2, mat="planche"):
    L.ajouter(B.tube([(0, 0, -h / 2), (0, 0, 0), (0, 0, h / 2)], [r, r * 1.2, r], 10), mat, M.copy())
    for dz in (-h * 0.29, h * 0.29):
        L.ajouter(B.tore(r * 1.12, 0.03, 12, 4), "fer", M @ B.mat4((0, 0, dz)))


def lampion(S, L, p, r=0.13):
    """Une lanterne posée en haut d'un poteau : un globe qui éclaire sous un petit chapeau de fer."""
    p = Vector(p)
    L.ajouter(B.cyl(r, r, 0.04, 8), "fer", B.mat4(p - Vector((0, 0, r + 0.04))))
    L.ajouter(B.sphere(r, 8, 6), "lumiere", B.mat4(p))
    L.ajouter(B.cyl(r * 1.1, 0.0, r * 0.9, 8), "fer", B.mat4(p + Vector((0, 0, r * 0.8))))
    S.lumieres.append(p.copy())


def fanions(L, a, b, creux, nb, r=0.02, taille=0.42, ampoules=True, S=None):
    """Une corde qui pend entre a et b, des fanions de toutes les couleurs, une ampoule entre deux fanions."""
    a, b = Vector(a), Vector(b)
    n = nb * 2
    pts = [a.lerp(b, k / n) - Vector((0, 0, creux * math.sin(PI * k / n))) for k in range(n + 1)]
    L.ajouter(B.tube(pts, r, 4), "corde")
    d = (b - a)
    d.z = 0
    d.normalize()
    cols = ("fanion_rose", "fanion_or", "fanion_violet", "fanion_turquoise", "fanion_creme")
    for k in range(1, n):
        p = pts[k]
        if k % 2:
            L.ajouter(plaque([p - d * taille * 0.45, p + d * taille * 0.45, p - Vector((0, 0, taille))], double=False), cols[(k // 2) % 5], lisse=False)
        elif ampoules:
            q = p - Vector((0, 0, 0.1))
            L.ajouter(B.sphere(0.075, 6, 4), "lumiere", B.mat4(q))
            if S is not None:
                S.lumieres.append(q)


# ---------- la balise d'arène ----------
def balise(S):
    L = S.L
    L.ajouter(B.tore(0.72, 0.26, 20, 8), "rose", B.mat4((0, 0, 0.12)))  # le flotteur
    L.ajouter(B.cyl(0.62, 0.5, 0.42, 16), "violet_fonce", B.mat4((0, 0, 0.1)))
    L.ajouter(B.cyl(0.5, 0.38, 0.42, 16), "creme", B.mat4((0, 0, 0.52)))
    L.ajouter(B.cyl(0.38, 0.26, 0.42, 16), "rose", B.mat4((0, 0, 0.94)))
    L.ajouter(B.tore(0.27, 0.05, 14, 5), "or", B.mat4((0, 0, 1.36)))
    L.ajouter(B.cyl(0.055, 0.04, 2.3, 6), "bois_fonce", B.mat4((0, 0, 1.36)))  # le mât
    L.ajouter(B.sphere(0.075, 8, 6), "or", B.mat4((0, 0, 3.68)))
    # l'écusson du défi, des deux côtés : un rond violet cerclé d'or, deux sabres croisés
    c = Vector((0, 0, 2.45))
    L.ajouter(B.cyl(0.36, 0.36, 0.08, 18), "violet_fonce", B.mat4(c + Vector((-0.04, 0, 0)), (0, PI / 2, 0)))
    L.ajouter(B.tore(0.36, 0.05, 18, 5), "or", B.mat4(c, (0, PI / 2, 0)))
    for cote in (-1, 1):
        for s in (-1, 1):
            M = B.mat4(c + Vector((cote * 0.055, 0, 0)), (s * PI / 4, 0, 0))
            L.ajouter(B.boite(0.02, 0.07, 0.5), "blanc", M @ B.mat4((0, 0, -0.22)))
            L.ajouter(B.boite(0.03, 0.2, 0.04), "or", M @ B.mat4((0, 0, -0.16)))
            L.ajouter(B.boite(0.03, 0.06, 0.1), "bois", M @ B.mat4((0, 0, -0.27)))
    # la lanterne (elle clignote doucement), sous son chapeau
    L.ajouter(B.tore(0.17, 0.03, 10, 4), "fer", B.mat4((0, 0, 1.62)))
    L.ajouter(B.cyl(0.2, 0.0, 0.16, 8), "fer", B.mat4((0, 0, 1.94)))
    G = B.Lot()
    G.ajouter(B.sphere(0.17, 10, 8), "lumiere", B.mat4((0, 0, 1.8)))
    S.anim("feu", G, "clignote", lent=1)
    S.lumieres.append(Vector((0, 0, 1.8)))
    # le fanion, tout en haut
    D = B.Lot()
    D.ajouter(drap(1.0, 0.52, 5, pointe=True), "fanion_rose", B.mat4((0.04, 0, 3.36)))
    S.anim("fanion", D, "drapeau", origine=(0, 0, 3.36))


# ---------- la guirlande entre deux balises ----------
def guirlande(S):
    fanions(S.L, (-4, 0, 2.3), (4, 0, 2.3), 0.75, 8, S=S)


# ---------- le ponton de l'arbitre ----------
def ponton(S):
    L = S.L
    z0 = 0.42  # le dessus du plancher
    for x in (-1.6, 0, 1.6):
        for y in (-1.25, 1.25):
            tonneau(L, B.mat4((x, y, 0.08), (0, PI / 2, 0)), 0.3, 1.2)
    for k in range(8):
        L.ajouter(B.boite(4.9, 0.4, 0.1), "planche" if k % 2 else "bois_clair", B.mat4((0, -1.47 + k * 0.42, z0 - 0.1)))
    for y in (-1.72, 1.72):
        L.ajouter(B.boite(5.1, 0.12, 0.2), "bois_fonce", B.mat4((0, y, z0 - 0.14)))
    for x in (-2.5, 2.5):
        L.ajouter(B.boite(0.12, 3.5, 0.2), "bois_fonce", B.mat4((x, 0, z0 - 0.14)))
    # quatre poteaux à lanterne, une corde sur trois côtés (l'avant, +x, reste ouvert sur l'arène)
    coins = [(-2.35, -1.55), (2.35, -1.55), (2.35, 1.55), (-2.35, 1.55)]
    for x, y in coins:
        L.ajouter(B.cyl(0.07, 0.055, 1.5, 6), "bois_fonce", B.mat4((x, y, z0)))
        lampion(S, L, (x, y, z0 + 1.68))
    for a, b in ((0, 3), (3, 2), (1, 0)):
        (x1, y1), (x2, y2) = coins[a], coins[b]
        L.ajouter(B.tube(B.courbe((x1, y1, z0 + 1.1), (x2, y2, z0 + 1.1), ((x1 + x2) / 2, (y1 + y2) / 2, z0 + 0.7), 7), 0.03, 4), "corde")
    # le gong : un portique, le disque de laiton qui se balance, son maillet
    gx, gy = -1.35, -0.95
    for y in (gy - 0.68, gy + 0.68):
        L.ajouter(B.cyl(0.08, 0.07, 2.15, 6), "bois_fonce", B.mat4((gx, y, z0)))
    L.ajouter(B.boite(0.16, 1.75, 0.14), "bois_fonce", B.mat4((gx, gy, z0 + 2.1)))
    for y in (gy - 0.88, gy + 0.88):
        L.ajouter(B.sphere(0.1, 8, 6), "or", B.mat4((gx, y, z0 + 2.17)))
    G = B.Lot()
    G.ajouter(B.cyl(0.52, 0.52, 0.07, 20), "laiton", B.mat4((gx - 0.035, gy, z0 + 1.25), (0, PI / 2, 0)))
    G.ajouter(B.tore(0.52, 0.05, 20, 5), "cuivre", B.mat4((gx, gy, z0 + 1.25), (0, PI / 2, 0)))
    G.ajouter(B.sphere(0.15, 10, 8), "or", B.mat4((gx + 0.04, gy, z0 + 1.25), (0, 0, 0), (0.5, 1, 1)))
    G.ajouter(B.tore(0.3, 0.02, 16, 4), "cuivre", B.mat4((gx + 0.04, gy, z0 + 1.25), (0, PI / 2, 0)))
    for s in (-1, 1):
        G.ajouter(B.tube([(gx, gy + s * 0.3, z0 + 1.68), (gx, gy + s * 0.3, z0 + 2.1)], 0.02, 4), "corde")
    S.anim("gong", G, "balance", origine=(gx, gy, z0 + 2.1), axe=[0, 1, 0], ampl=0.1, vitesse=1.7)
    L.ajouter(B.tube([(gx + 0.5, gy - 0.5, z0), (gx + 0.32, gy - 0.62, z0 + 0.9)], 0.03, 5), "bois_clair")
    L.ajouter(B.sphere(0.12, 8, 6), "rouge", B.mat4((gx + 0.3, gy - 0.63, z0 + 1.0)))
    # le tableau des scores : un chevalet, un panneau crème, une moitié rose, une moitié violette, une étoile au milieu
    tx, ty = -1.45, 0.95
    for s in (-1, 1):
        L.ajouter(B.tube([(tx - 0.35, ty + s * 0.6, z0), (tx, ty + s * 0.55, z0 + 1.9)], 0.04, 5), "bois_fonce")
        L.ajouter(B.tube([(tx + 0.3, ty + s * 0.6, z0), (tx, ty + s * 0.55, z0 + 1.2)], 0.035, 5), "bois_fonce")
    L.ajouter(B.boite(0.08, 1.4, 0.9), "creme", B.mat4((tx + 0.05, ty, z0 + 0.95)))
    for y, m in ((ty - 0.36, "rose"), (ty + 0.36, "violet")):
        L.ajouter(B.boite(0.03, 0.5, 0.62), m, B.mat4((tx + 0.1, y, z0 + 1.09)))
    for dz in (0.93, 1.87):
        L.ajouter(B.boite(0.12, 1.5, 0.07), "bois", B.mat4((tx + 0.05, ty, z0 + dz - 0.03)))
    for y in (ty - 0.72, ty + 0.72):
        L.ajouter(B.boite(0.12, 0.07, 0.96), "bois", B.mat4((tx + 0.05, y, z0 + 0.92)))
    L.ajouter(B.etoile(0.2, 0.09, 0.04, 5, 0.5), "or", B.mat4((tx + 0.13, ty, z0 + 1.4), (0, PI / 2, 0)))
    # deux braseros à l'avant
    for k, y in enumerate((-1.2, 1.2)):
        x = 1.95
        for a in range(3):
            an = a * 2 * PI / 3 + 0.5
            L.ajouter(B.tube([(x + math.cos(an) * 0.3, y + math.sin(an) * 0.3, z0), (x, y, z0 + 0.7)], 0.03, 4), "fer")
        L.ajouter(B.sphere(0.27, 12, 6), "fer", B.mat4((x, y, z0 + 0.78), (0, 0, 0), (1, 1, 0.5)))
        L.ajouter(B.tore(0.26, 0.035, 12, 4), "cuivre", B.mat4((x, y, z0 + 0.82)))
        F = B.Lot()
        F.ajouter(B.cyl(0.2, 0.0, 0.62, 7), "feu", B.mat4((x, y, z0 + 0.8)))
        F.ajouter(B.cyl(0.1, 0.0, 0.34, 6), "lumiere", B.mat4((x + 0.02, y, z0 + 0.82)))
        S.anim(f"flamme{k}", F, "flamme", origine=(x, y, z0 + 0.8), phase=k * 1.7)
        S.lumieres.append(Vector((x, y, z0 + 1.05)))
    # le grand mât, son drapeau, deux guirlandes de fanions qui descendent vers l'avant
    mx = -2.1
    L.ajouter(B.cyl(0.085, 0.055, 4.5, 8), "bois_fonce", B.mat4((mx, 0, z0)))
    L.ajouter(B.sphere(0.1, 8, 6), "or", B.mat4((mx, 0, z0 + 4.55)))
    D = B.Lot()
    D.ajouter(drap(1.55, 0.9, 6, vague=0.1), "fanion_rose", B.mat4((mx + 0.06, 0, z0 + 3.95)))
    S.anim("drapeau", D, "drapeau", origine=(mx, 0, z0 + 3.95))
    for s in (-1, 1):
        fanions(L, (mx, 0, z0 + 4.4), (2.35, s * 1.55, z0 + 1.85), 0.5, 6, taille=0.34, ampoules=False)
    # le crabe arbitre : rond, casquette de capitaine, les yeux au bout de deux tiges, il agite ses deux drapeaux
    c = Vector((0.75, 0, z0))
    L.ajouter(B.sphere(0.5, 16, 10), "rouge", B.mat4(c + Vector((0, 0, 0.55)), (0, 0, 0), (0.95, 1.3, 0.72)))
    L.ajouter(B.sphere(0.42, 12, 8), "creme", B.mat4(c + Vector((0.13, 0, 0.44)), (0, 0, 0), (0.85, 1.12, 0.6)))
    for dx, dy in ((-0.2, 0.36), (-0.24, -0.3), (-0.36, 0.04)):
        L.ajouter(B.sphere(0.07, 6, 4), "rouge_fonce", B.mat4(c + Vector((dx, dy, 0.86 - abs(dy) * 0.16)), (0, 0, 0), (1, 1, 0.5)))
    for s in (-1, 1):
        L.ajouter(B.cyl(0.045, 0.04, 0.34, 6), "rouge", B.mat4(c + Vector((0.3, s * 0.2, 0.8))))
        oeil(L, c + Vector((0.32, s * 0.2, 1.22)), 0.13, (1, s * 0.12, 0.05))
        for k in range(3):
            x = -0.26 + k * 0.22
            L.ajouter(B.tube([c + Vector((x, s * 0.5, 0.42)), c + Vector((x - 0.04, s * 0.84, 0.52)), c + Vector((x - 0.08, s * 1.0, 0.02))], [0.065, 0.05, 0.02], 5), "rouge_fonce")
    L.ajouter(B.tube(B.courbe(c + Vector((0.46, -0.2, 0.56)), c + Vector((0.46, 0.2, 0.56)), c + Vector((0.52, 0, 0.36)), 6), 0.022, 4), "noir")
    # la casquette (derrière les yeux) : la visière, la coiffe, le galon d'or, l'étoile
    h = c + Vector((-0.02, 0, 0.9))
    L.ajouter(B.cyl(0.32, 0.36, 0.2, 14), "violet_fonce", B.mat4(h))
    L.ajouter(B.cyl(0.4, 0.38, 0.08, 14), "creme", B.mat4(h + Vector((0, 0, 0.2))))
    L.ajouter(B.tore(0.335, 0.035, 14, 4), "or", B.mat4(h + Vector((0, 0, 0.05))))
    L.ajouter(B.cyl(0.3, 0.3, 0.03, 12), "noir", B.mat4(h + Vector((0.2, 0, 0.0)), (0, 0.25, 0), (0.75, 1, 1)))
    L.ajouter(B.etoile(0.1, 0.045, 0.03, 5, 0.5), "or", B.mat4(h + Vector((0.35, 0, 0.13)), (0, PI / 2, 0)))
    # un sifflet d'or au coin du sourire
    L.ajouter(B.cyl(0.05, 0.05, 0.14, 8), "or", B.mat4(c + Vector((0.47, 0.12, 0.47)), (0, PI / 2, 0)))
    # les deux bras : la pince tient un petit drapeau (rose à droite, turquoise à gauche), ils s'agitent l'un après l'autre
    for s, m in ((1, "fanion_rose"), (-1, "fanion_turquoise")):
        A = B.Lot()
        ep = c + Vector((0.12, s * 0.56, 0.6))
        co = c + Vector((0.34, s * 0.98, 0.86))
        po = c + Vector((0.4, s * 1.1, 1.3))
        A.ajouter(B.tube([ep, co, po], [0.09, 0.075, 0.07], 6), "rouge")
        A.ajouter(B.sphere(0.2, 10, 8), "rouge", B.mat4(po + Vector((0, 0, 0.16)), (0, 0, 0), (0.9, 0.8, 1.15)))
        for d in (-1, 1):
            A.ajouter(B.cyl(0.1, 0.0, 0.32, 6), "rouge_fonce", B.mat4(po + Vector((d * 0.09, 0, 0.3)), (0, d * 0.28, 0)))
        A.ajouter(B.cyl(0.022, 0.022, 1.0, 5), "bois_clair", B.mat4(po + Vector((0, s * 0.02, 0.2))))
        A.ajouter(drap(0.55, 0.4, 3, vague=0.05), m, B.mat4(po + Vector((0.02, s * 0.02, 0.98))))
        S.anim(f"bras{'d' if s > 0 else 'g'}", A, "balance", origine=tuple(ep), axe=[1, 0, 0], ampl=0.3, vitesse=2.4, phase=0.0 if s > 0 else PI)
    # un tambour, un coffre de récompenses
    L.ajouter(B.cyl(0.3, 0.3, 0.42, 12), "rouge", B.mat4((0.1, 1.2, z0)))
    for dz in (0.0, 0.4):
        L.ajouter(B.tore(0.3, 0.03, 12, 4), "or", B.mat4((0.1, 1.2, z0 + dz + 0.01)))
    L.ajouter(B.cyl(0.28, 0.28, 0.02, 12), "creme", B.mat4((0.1, 1.2, z0 + 0.42)))
    L.ajouter(B.boite(0.7, 0.45, 0.36), "bois", B.mat4((0.0, -1.2, z0)))
    L.ajouter(B.cyl(0.225, 0.225, 0.7, 10), "bois2", B.mat4((-0.35, -1.2, z0 + 0.36), (0, PI / 2, 0)))
    for x in (-0.25, 0.25):
        L.ajouter(B.boite(0.06, 0.48, 0.38), "or", B.mat4((x, -1.2, z0)))
    L.ajouter(B.boite(0.1, 0.04, 0.12), "or", B.mat4((0.0, -0.97, z0 + 0.24)))


# ---------- la barge des feux d'artifice ----------
def barge(S):
    L = S.L
    forme = lambda c, z: Vector((c.x * 3.0, c.y * 1.5 * (1 - abs(c.x) ** 3 * 0.15), z))
    bm = B.demi_sphere(1.0, 24, 6)
    B.deformer(bm, lambda c: forme(c, -c.z * 0.7 + 0.55))
    L.ajouter(bm, "bois2", B.mat4())
    for r, z, m, ep in ((1.0, 0.55, "or", 0.07), (0.955, 0.33, "rose", 0.05)):
        t = B.tore(r, ep, 28, 5)
        B.deformer(t, lambda c, z=z: forme(c, c.z + z))
        L.ajouter(t, m)
    L.ajouter(B.cyl(1.0, 1.0, 0.06, 24), "planche", B.mat4((0, 0, 0.55), (0, 0, 0), (2.88, 1.4, 1)))
    zd = 0.61
    # la batterie de mortiers (douze tubes de fer cerclés de cuivre, un peu penchés) sur son râtelier
    L.ajouter(B.boite(2.2, 1.3, 0.18), "bois_fonce", B.mat4((0.3, 0, zd)))
    for i, x in enumerate((-0.45, 0.05, 0.55, 1.05)):
        for y in (-0.4, 0, 0.4):
            M = B.mat4((x, y, zd + 0.14), (-y * 0.4, (x - 0.3) * 0.22, 0))
            L.ajouter(B.cyl(0.13, 0.13, 0.75, 8), "fer", M.copy())
            L.ajouter(B.tore(0.135, 0.03, 8, 4), "cuivre", M @ B.mat4((0, 0, 0.72)))
            L.ajouter(B.tore(0.135, 0.025, 8, 4), "cuivre", M @ B.mat4((0, 0, 0.3)))
    # le gros mortier de proue sur son affût à roues
    L.ajouter(B.boite(0.9, 0.7, 0.22), "bois", B.mat4((2.0, 0, zd)))
    for y in (-0.42, 0.42):
        L.ajouter(B.cyl(0.24, 0.24, 0.1, 12), "bois_fonce", B.mat4((2.0, y - 0.05 * (1 if y > 0 else -1), zd + 0.2), (PI / 2, 0, 0)))
    M = B.mat4((1.85, 0, zd + 0.2), (0, 0.4, 0))
    L.ajouter(B.cyl(0.36, 0.3, 1.15, 12), "fer", M.copy())
    for dz in (0.2, 0.75, 1.1):
        L.ajouter(B.tore(0.33, 0.04, 12, 4), "or", M @ B.mat4((0, 0, dz)))
    # les caisses de fusées sous la tente rayée, les tonneaux de poudre
    L.ajouter(B.boite(0.8, 0.7, 0.5), "bois_clair", B.mat4((-1.65, 0.5, zd)))
    L.ajouter(B.boite(0.6, 0.55, 0.42), "planche", B.mat4((-1.75, -0.2, zd), (0, 0, 0.3)))
    rnd = random.Random(21)
    for k in range(7):
        x, y = -1.65 + rnd.uniform(-0.25, 0.25), 0.5 + rnd.uniform(-0.2, 0.2)
        M = B.mat4((x, y, zd + 0.35), (rnd.uniform(-0.3, 0.3), rnd.uniform(-0.3, 0.3), 0))
        L.ajouter(B.cyl(0.055, 0.055, 0.55, 6), ("rouge", "violet", "turquoise")[k % 3], M.copy())
        L.ajouter(B.cyl(0.085, 0.0, 0.18, 6), "or", M @ B.mat4((0, 0, 0.55)))
    for x, y in ((-1.1, -0.75), (-0.75, -0.9)):
        tonneau(L, B.mat4((x, y, zd + 0.28)), 0.2, 0.56)
    for x in (-2.3, -1.1):
        for y in (-0.95, 0.95):
            L.ajouter(B.cyl(0.04, 0.035, 1.55, 5), "bois_fonce", B.mat4((x, y, zd)))
    L.ajouter(B.prisme(1.5, 2.25, 0.45), "rose", B.mat4((-1.7, 0, zd + 1.55)))
    for dx in (-0.5, 0, 0.5):
        L.ajouter(B.prisme(0.22, 2.3, 0.47), "creme", B.mat4((-1.7 + dx, 0, zd + 1.55)))
    # un pot à feu pour allumer les mèches
    L.ajouter(B.sphere(0.2, 10, 6), "fer", B.mat4((0.5, -1.0, zd + 0.14), (0, 0, 0), (1, 1, 0.6)))
    F = B.Lot()
    F.ajouter(B.cyl(0.14, 0.0, 0.42, 6), "feu", B.mat4((0.5, -1.0, zd + 0.18)))
    S.anim("flamme", F, "flamme", origine=(0.5, -1.0, zd + 0.18))
    S.lumieres.append(Vector((0.5, -1.0, zd + 0.4)))
    # deux mâts, une guirlande d'ampoules de l'un à l'autre, le drapeau à l'arrière
    L.ajouter(B.cyl(0.06, 0.045, 2.3, 6), "bois_fonce", B.mat4((2.7, 0, zd)))
    L.ajouter(B.cyl(0.07, 0.05, 2.9, 6), "bois_fonce", B.mat4((-2.78, 0, zd)))
    lampion(S, L, (2.7, 0, zd + 2.45))
    fanions(L, (2.7, 0, zd + 2.25), (-2.78, 0, zd + 2.6), 0.55, 7, taille=0.3, S=S)
    D = B.Lot()
    D.ajouter(drap(1.0, 0.6, 5, vague=0.08), "fanion_violet", B.mat4((-2.78 - 0.05, 0, zd + 2.6), (0, 0, PI)))
    S.anim("drapeau", D, "drapeau", origine=(-2.78, 0, zd + 2.6))


# ---------- la Baleine étoilée ----------
RAYONS_ETOILEE = [1.05, 1.5, 2.0, 2.5, 2.85, 2.85, 2.6, 2.1, 1.4]
LONG_ETOILEE = 14.0
APLATI = 0.8


def peau(x, a, sortie=1.0):
    """Un point sur le dos de la Baleine étoilée : x le long du corps, a l'angle depuis le haut."""
    n = len(RAYONS_ETOILEE)
    t = max(0.0, min(n - 1.001, (x + LONG_ETOILEE / 2) / LONG_ETOILEE * (n - 1)))
    i = int(t)
    r = RAYONS_ETOILEE[i] + (RAYONS_ETOILEE[i + 1] - RAYONS_ETOILEE[i]) * (t - i)
    return Vector((x, math.sin(a) * r * sortie, math.cos(a) * r * APLATI * sortie))


def flanc(x, z, s=1, sortie=1.0):
    """Un point sur le flanc de la Baleine étoilée, à la hauteur z (s : le côté)."""
    r = peau(x, PI / 2).y
    return Vector((x, s * r * math.sqrt(max(0.0, 1 - (z / (r * APLATI)) ** 2)) * sortie, z))


def etoilee(S):
    L = S.L
    corps_fuseau(LONG_ETOILEE, RAYONS_ETOILEE, "nuit", L, aplati=APLATI, segments=22)
    L.ajouter(B.sphere(1.5, 20, 12), "nuit", B.mat4((6.75, 0, 0), (0, 0, 0), (0.8, 0.94, 0.76)))  # le museau
    # le ventre rose à rainures
    L.ajouter(B.sphere(2.3, 18, 10), "ventre", B.mat4((3.0, 0, -1.15), (0, 0, 0), (1.7, 0.95, 0.5)))
    for k in range(9):
        y = -1.4 + k * 0.35
        L.ajouter(B.tube([(6.0, y * 0.55, -1.47), (2.3, y, -2.26), (-1.2, y * 0.9, -2.1)], 0.1, 5), "rose_pale")
    # le sourire, les yeux, l'évent
    for s in (-1, 1):
        # la bouche : elle fait le tour du museau puis remonte en sourire sur le flanc
        k = math.sqrt(1 - (0.3 / 1.14) ** 2) * 1.01
        bouche = [Vector((6.75 + 1.2 * math.cos(f) * k, s * 1.41 * math.sin(f) * k, -0.3)) for f in [j * PI / 2 / 5 for j in range(6)]]
        for j in range(1, 9):
            u = j / 8
            bouche.append(flanc(6.7 - u * 4.0, -0.3 - 0.62 * math.sin(u * PI / 2) + 0.22 * max(0.0, u - 0.75) * 4, s, 1.012))
        L.ajouter(B.tube(bouche, 0.075, 5), "noir")
        oeil(L, flanc(3.5, 0.3, s, 0.97), 0.27, (0.25, s, 0.25))
        L.ajouter(B.tube(B.courbe(flanc(3.95, 0.72, s, 1.0), flanc(3.05, 0.72, s, 1.0), flanc(3.5, 0.9, s, 1.02), 6), 0.05, 4), "noir")  # la paupière, douce
        L.ajouter(B.sphere(0.34, 10, 6), "ventouse", B.mat4(flanc(2.9, -0.45, s, 0.985), (0, 0, 0), (1, 0.22, 0.7)))  # la joue rose
    L.ajouter(B.cyl(0.28, 0.19, 0.16, 10), "noir", B.mat4((3.72, 0, 2.12)))
    L.ajouter(B.cyl(0.42, 0.0, 0.85, 6), "nuit", B.mat4(peau(-4.4, 0.0, 0.9), (0, -0.6, 0), (1.7, 0.4, 1)))  # la petite dorsale
    # le croissant d'or sur le front
    arc = [Vector((5.25 + math.cos(a) * 0.55, math.sin(a) * 0.55, 1.6)) for a in [0.6 + k * (2 * PI - 1.2) / 10 for k in range(11)]]
    arc = [Vector((p.x, p.y, peau(p.x, math.asin(max(-1, min(1, p.y / 2.3))), 1.0).z + 0.03)) for p in arc]
    L.ajouter(B.tube(arc, [0.02, 0.07, 0.11, 0.14, 0.16, 0.17, 0.16, 0.14, 0.11, 0.07, 0.02], 6), "or", B.mat4())
    # le ciel sur son dos : de grandes étoiles à quatre branches, une poussière de petites, et les traits des constellations
    rnd = random.Random(77)
    grandes = []
    for k in range(13):
        x = rnd.uniform(-5.2, 4.4)
        a = rnd.uniform(-1.05, 1.05)
        if abs(x - 3.72) < 0.7 and abs(a) < 0.3:
            continue
        grandes.append((x, a))
        p = peau(x, a, 1.012)
        r = rnd.uniform(0.2, 0.34)
        L.ajouter(B.etoile(r, r * 0.33, 0.03, 4, 0.5, depart=rnd.uniform(0, 1.5)), "astre", B.mat4(p, (-a, 0, 0)), lisse=False)
    for k in range(46):
        x = rnd.uniform(-6.0, 5.6)
        a = rnd.uniform(-1.25, 1.25)
        p = peau(x, a, 1.004)
        L.ajouter(B.sphere(rnd.uniform(0.045, 0.1), 5, 3), "astre", B.mat4(p, (-a, 0, 0), (1, 1, 0.45)))
    grandes.sort()
    for i in range(0, len(grandes) - 1):
        (x1, a1), (x2, a2) = grandes[i], grandes[i + 1]
        if i % 3 == 2 or abs(x2 - x1) > 2.6:
            continue
        pts = [peau(x1 + (x2 - x1) * t, a1 + (a2 - a1) * t, 1.01) for t in [j / 6 for j in range(7)]]
        L.ajouter(B.tube(pts, 0.022, 3), "astre")
    # des cristaux qui ont poussé sur son dos, des anatifes sur la tête
    for k, (x, a, h) in enumerate(((-1.6, 0.0, 1.1), (-1.25, 0.14, 0.75), (-1.95, -0.12, 0.8), (-1.5, -0.2, 0.55), (-1.1, -0.08, 0.5))):
        p = peau(x, a, 0.97)
        L.ajouter(B.cyl(0.2, 0.03, h, 6), "cristal", B.mat4(p, (-a + (k % 2 - 0.5) * 0.3, (k % 3 - 1) * 0.22, k * 0.7)), lisse=False)
    for k in range(12):
        p = peau(rnd.uniform(4.6, 6.4), rnd.uniform(-0.8, 0.8), 0.99)
        L.ajouter(B.demi_sphere(rnd.uniform(0.08, 0.15), 6, 2), "os", B.mat4(p))
    # les grandes nageoires (longues, comme des ailes) : elles battent lentement
    for s in (-1, 1):
        G = B.Lot()
        racine = Vector((1.4, s * 2.25, -1.2))
        M = B.mat4(racine) @ B.mat4((0, 0, 0), (s * 0.15, 0, 0), (1, 1, 0.38)) @ B.mat4(-racine)
        G.ajouter(B.tube([racine, (0.5, s * 4.3, -1.9), (-1.0, s * 6.3, -2.2), (-1.9, s * 7.3, -2.2)], [0.62, 0.5, 0.3, 0.06], 8), "nuit", M)
        for k in range(5):
            t = 0.25 + k * 0.16
            q = racine.lerp(Vector((-1.0, s * 6.3, -2.2)), t)
            q = M @ q
            G.ajouter(B.sphere(0.07, 5, 3), "astre", B.mat4(q + Vector((0, 0, 0.17 - t * 0.06)), (0, 0, 0), (1, 1, 0.5)))
        S.anim(f"nageoire{'d' if s > 0 else 'g'}", G, "balance", origine=tuple(racine), axe=[1, 0, 0], ampl=0.2, vitesse=0.9, phase=0.0 if s > 0 else PI)
    # la queue : le pédoncule et les deux grands lobes (elle bat de haut en bas)
    Q = B.Lot()
    Q.ajouter(B.tube([(-6.4, 0, 0), (-7.0, 0, 0), (-8.3, 0, 0.06), (-9.4, 0, 0.14)], [1.0, 1.02, 0.72, 0.5], 14), "nuit", B.mat4((0, 0, 0), (0, 0, 0), (1, 1, APLATI)))
    base = Vector((-9.2, 0, 0.13))
    Mq = B.mat4(base) @ B.mat4((0, 0, 0), (0, 0, 0), (1, 1, 0.3)) @ B.mat4(-base)
    for s in (-1, 1):
        Q.ajouter(B.tube([base, (-10.0, s * 1.6, 0.25), (-10.9, s * 3.0, 0.4), (-11.9, s * 3.9, 0.5)], [0.75, 0.85, 0.6, 0.05], 10), "nuit", Mq)
        Q.ajouter(B.sphere(0.1, 5, 3), "astre", B.mat4((-10.3, s * 1.7, 0.4), (0, 0, 0), (1, 1, 0.5)))
    Q.ajouter(B.sphere(0.55, 10, 6), "nuit", B.mat4((-9.45, 0, 0.14), (0, 0, 0), (1.3, 1.2, 0.36)))  # l'encoche entre les deux lobes, comblée
    S.anim("queue", Q, "balance", origine=(-6.6, 0, 0), axe=[0, 1, 0], ampl=0.24, vitesse=1.2)
    S.lumieres.extend([peau(x, a, 1.0) for x, a in grandes])


# ---------- le Nuage-Voilier (un dirigeable) ----------
def dirigeable(S):
    L = S.L
    # le ballon : des fuseaux crème et rose, le nez en +x, un peu plus fin à l'arrière
    bm = B.sphere(1.0, 24, 12)
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(PI / 2, 3, "Y"), verts=bm.verts)
    couche = bm.faces.layers.int.new("m")
    for f in bm.faces:
        c = f.calc_center_median()
        f[couche] = int((math.atan2(c.z, c.y) + PI) / (2 * PI) * 12 + 0.5) % 2
    ballon = lambda c: Vector((c.x * 4.0, c.y * 1.5 * (1 - 0.3 * max(0.0, -c.x) ** 2), c.z * 1.5 * (1 - 0.3 * max(0.0, -c.x) ** 2)))
    B.deformer(bm, ballon)
    L.ajouter(bm, None, None, couche_mat=("m", ["creme", "rose"]))
    L.ajouter(B.sphere(0.4, 12, 8), "or", B.mat4((3.82, 0, 0), (0, 0, 0), (0.8, 1, 1)))
    L.ajouter(B.cyl(0.09, 0.0, 0.6, 6), "or", B.mat4((4.05, 0, 0), (0, PI / 2, 0)))
    for x, r, m in ((0.0, 1.52, "or"), (2.0, 1.32, "violet"), (-2.0, 1.215, "violet")):
        L.ajouter(B.tore(r, 0.055, 24, 5), m, B.mat4((x, 0, 0), (0, PI / 2, 0)))
    # l'empennage : quatre ailerons violets bordés d'or
    for k in range(4):
        R = B.mat4((0, 0, 0), (PI / 4 + k * PI / 2, 0, 0))
        L.ajouter(plaque([(-2.7, 0, 0.9), (-4.5, 0, 2.0), (-4.6, 0, 0.45), (-3.9, 0, 0.3)], ep=0.08), "violet", R.copy())
        L.ajouter(B.tube([(-2.7, 0, 0.92), (-4.5, 0, 2.03), (-4.63, 0, 0.45)], 0.045, 4), "or", R.copy())
    # la nacelle : une barque, sa cabine au toit rose, ses hublots éclairés
    zn = -2.35
    L.ajouter(coque(3.6, 1.25, 0.72, zn, 18, 0.35), "bois", B.mat4())
    L.ajouter(lisse_coque(3.6, 1.25, zn, 0.055, 22, 0.35), "or")
    L.ajouter(B.cyl(1.0, 1.0, 0.05, 18), "planche", B.mat4((-0.05, 0, zn - 0.02), (0, 0, 0), (1.7, 0.52, 1)))
    L.ajouter(B.boite(1.1, 0.8, 0.55), "bois2", B.mat4((-0.55, 0, zn)))
    L.ajouter(B.prisme(1.3, 0.95, 0.3), "rose", B.mat4((-0.55, 0, zn + 0.55)))
    for s in (-1, 1):
        for dx in (-0.3, 0.2):
            L.ajouter(B.boite(0.26, 0.04, 0.24), "lumiere", B.mat4((-0.55 + dx, s * 0.4, zn + 0.18)))
        S.lumieres.append(Vector((-0.55, s * 0.45, zn + 0.3)))
    L.ajouter(B.tube([(1.75, 0, zn), (2.5, 0, zn + 0.35)], [0.05, 0.03], 5), "bois_fonce")
    lampion(S, L, (2.5, 0, zn + 0.2), 0.11)
    # les suspentes
    for x in (-1.3, 0.0, 1.2):
        for s in (-1, 1):
            L.ajouter(B.tube([(x, s * 0.5, zn), (x * 1.5, s * 1.02, -1.02)], 0.022, 4), "corde")
    # les deux hélices de laiton, à l'arrière
    for s in (-1, 1):
        p = Vector((-1.95, s * 0.85, zn - 0.2))
        L.ajouter(B.tube([(-1.3, s * 0.45, zn - 0.2), p + Vector((0.12, 0, 0))], 0.05, 5), "bois_fonce")
        P = B.Lot()
        P.ajouter(B.sphere(0.11, 8, 6), "laiton", B.mat4(p))
        for k in range(3):
            P.ajouter(B.boite(0.04, 0.2, 0.62), "laiton", B.mat4(p, (k * 2 * PI / 3, 0, 0)) @ B.mat4((0, 0, 0.05), (0, 0, 0.35)))
        S.anim(f"helice{'d' if s > 0 else 'g'}", P, "tourne", origine=tuple(p), axe=[1, 0, 0], vitesse=13 * s)
    # deux ailes de toile sur les côtés (elles battent doucement), leurs baleines de bois
    for s in (-1, 1):
        A = B.Lot()
        r0 = Vector((0.1, s * 0.62, zn - 0.05))
        pts = [(0.9, s * 0.62, zn - 0.05), (-0.9, s * 0.62, zn - 0.05), (-1.3, s * 2.5, zn + 0.25), (-0.2, s * 2.9, zn + 0.32), (0.75, s * 2.3, zn + 0.22)]
        A.ajouter(plaque(pts, double=False), "fanion_creme", lisse=False)
        for q in pts[2:]:
            A.ajouter(B.tube([r0, q], [0.035, 0.015], 4), "bois_clair")
        S.anim(f"aile{'d' if s > 0 else 'g'}", A, "balance", origine=tuple(r0), axe=[1, 0, 0], ampl=0.16, vitesse=1.5, phase=0.0 if s > 0 else PI)
    # trois lanternes pendues sous la coque, une ancre
    for x in (-1.0, 0.0, 1.0):
        z = zn - 0.72 * math.sqrt(max(0.0, 1 - (x / 1.8) ** 2))
        L.ajouter(B.tube([(x, 0, z + 0.05), (x, 0, z - 0.4)], 0.015, 3), "corde")
        L.ajouter(B.sphere(0.15, 8, 6), "lumiere", B.mat4((x, 0, z - 0.52)))
        L.ajouter(B.cyl(0.16, 0.0, 0.1, 8), "fer", B.mat4((x, 0, z - 0.42)))
        S.lumieres.append(Vector((x, 0, z - 0.52)))
    L.ajouter(B.tube([(1.45, 0.3, zn - 0.3), (1.5, 0.34, zn - 1.5)], 0.018, 3), "fer")
    L.ajouter(B.tore(0.2, 0.04, 10, 4), "fer", B.mat4((1.5, 0.34, zn - 1.72), (PI / 2, 0, 0), (1, 1, 1)))
    L.ajouter(B.boite(0.5, 0.06, 0.06), "fer", B.mat4((1.5, 0.34, zn - 1.58)))
    # la longue banderole qui traîne derrière
    D = B.Lot()
    D.ajouter(drap(3.4, 0.75, 9, vague=0.22), "fanion_rose", B.mat4((-4.05, 0, -0.1), (0, 0, PI)))
    S.anim("banderole", D, "drapeau", origine=(-4.0, 0, -0.1))


# ---------- la couronne du vainqueur ----------
def couronne(S):
    L = S.L
    L.ajouter(B.cyl(0.66, 0.7, 0.36, 18), "or")
    for z, r in ((0.02, 0.69), (0.36, 0.71)):
        L.ajouter(B.tore(r, 0.06, 18, 5), "or", B.mat4((0, 0, z)))
    L.ajouter(B.demi_sphere(0.6, 14, 4), "rouge_fonce", B.mat4((0, 0, 0.3), (0, 0, 0), (1, 1, 0.75)))
    L.ajouter(B.sphere(0.1, 8, 6), "or", B.mat4((0, 0, 0.8)))
    for k in range(6):
        a = k * PI / 3
        x, y = math.cos(a), math.sin(a)
        L.ajouter(B.cyl(0.17, 0.0, 0.52, 4), "or", B.mat4((x * 0.64, y * 0.64, 0.36), (-y * 0.18, x * 0.18, a + PI / 4)), lisse=False)
        L.ajouter(B.sphere(0.075, 6, 4), "lumiere", B.mat4((x * 0.73, y * 0.73, 0.9)))
        b = a + PI / 6
        L.ajouter(B.sphere(0.1, 8, 6), ("rose", "turquoise", "violet")[k % 3], B.mat4((math.cos(b) * 0.7, math.sin(b) * 0.7, 0.19), (0, 0, 0), (1, 1, 1.25)))
    S.lumieres.append(Vector((0, 0, 0.6)))


# ---------- les lanternes (légères : le site en pose des dizaines) ----------
def lanterne(S):
    L = S.L
    L.ajouter(B.boite(0.56, 0.56, 0.07), "bois_clair", B.mat4((0, 0, -0.02)), lisse=False)
    L.ajouter(B.boite(0.38, 0.38, 0.44), "lumiere", B.mat4((0, 0, 0.05)), lisse=False)
    for x in (-0.2, 0.2):
        for y in (-0.2, 0.2):
            L.ajouter(B.boite(0.05, 0.05, 0.48), "rose", B.mat4((x, y, 0.05)), lisse=False)
    L.ajouter(B.boite(0.47, 0.47, 0.05), "rose", B.mat4((0, 0, 0.49)), lisse=False)


def lotus(S):
    L = S.L
    L.ajouter(B.cyl(0.42, 0.42, 0.03, 8), "vert_clair", B.mat4((0, 0, -0.01)), lisse=False)
    for k in range(8):
        a = k * PI / 4
        L.ajouter(B.cyl(0.13, 0.0, 0.36, 4), "rose_pale", B.mat4((math.cos(a) * 0.2, math.sin(a) * 0.2, 0.03), (0, 0.75, a), (1, 0.5, 1)), lisse=False)
    for k in range(5):
        a = k * 2 * PI / 5 + 0.3
        L.ajouter(B.cyl(0.1, 0.0, 0.3, 4), "rose", B.mat4((math.cos(a) * 0.09, math.sin(a) * 0.09, 0.05), (0, 0.3, a), (1, 0.5, 1)), lisse=False)
    L.ajouter(B.sphere(0.12, 6, 4), "lumiere", B.mat4((0, 0, 0.2)))


def celeste(S):
    L = S.L
    L.ajouter(B.cyl(0.2, 0.32, 0.52, 8), "lumiere", B.mat4((0, 0, 0.0)))
    L.ajouter(B.demi_sphere(0.32, 8, 2), "lumiere", B.mat4((0, 0, 0.52), (0, 0, 0), (1, 1, 0.55)))
    L.ajouter(B.tore(0.2, 0.025, 8, 3), "bois", B.mat4((0, 0, 0.0)))
    L.ajouter(B.cyl(0.07, 0.0, 0.16, 5), "feu", B.mat4((0, 0, -0.04)))


def meduse(S):
    L = S.L
    L.ajouter(B.demi_sphere(0.5, 10, 3), "spectre", B.mat4((0, 0, 0), (0, 0, 0), (1, 1, 0.8)))
    L.ajouter(B.tore(0.48, 0.05, 10, 3), "spectre", B.mat4((0, 0, 0.0)))
    L.ajouter(B.sphere(0.13, 6, 4), "luciole", B.mat4((0, 0, 0.38), (0, 0, 0), (1, 1, 0.5)))
    for k in range(4):
        a = k * PI / 2 + 0.4
        L.ajouter(B.sphere(0.09, 5, 3), "luciole", B.mat4((math.cos(a) * 0.24, math.sin(a) * 0.24, 0.31), (0, 0, 0), (1, 1, 0.45)))
    for k in range(5):
        a = k * 2 * PI / 5
        x, y = math.cos(a) * 0.3, math.sin(a) * 0.3
        L.ajouter(B.tube([(x, y, 0), (x * 1.25, y * 1.25, -0.4), (x * 0.9, y * 0.9, -0.8), (x * 1.15, y * 1.15, -1.25)], [0.045, 0.04, 0.03, 0.01], 3), "spectre")


SORTES = {"balise": balise, "guirlande": guirlande, "ponton": ponton, "barge": barge, "etoilee": etoilee, "dirigeable": dirigeable,
          "couronne": couronne, "lanterne": lanterne, "lotus": lotus, "celeste": celeste, "meduse": meduse}
SANS_PATINE = {"lanterne", "lotus", "celeste", "meduse", "guirlande"}  # posées par dizaines : on les garde les plus légères possible
# où poser chaque sorte pour la planche (le rendu qui montre tout)
PLANCHE = {"balise": (9, -9, 0), "guirlande": (13, -9, 0), "ponton": (2, -10, 0), "barge": (-7, -9, 0), "etoilee": (0, 3, 2.7),
           "dirigeable": (-10, 12, 9), "couronne": (15, -4, 0.3), "lanterne": (11, -13, 0.1), "lotus": (12.5, -13.4, 0.1),
           "celeste": (14, -12.5, 1.6), "meduse": (15.5, -13, 1.3)}


def deplacer(coll, sens=1):
    for o in coll.objects:
        d = PLANCHE.get(o.name.split("_")[0].split(".")[0], (0, 0, 0))
        o.location = Vector(o.location) + Vector(d) * sens


def construire(rendu=True, exporter=True, seulement=None):
    import barhaw_iles_v4 as I
    coll = B.collection("fete_mer")
    infos = {}
    for nom, fabrique in SORTES.items():
        if seulement and nom not in seulement:
            continue
        S = Sorte(nom, coll)
        fabrique(S)
        corps = S.finir()
        infos[nom] = True if nom in SANS_PATINE else I.patiner(corps, S.lumieres)
    B.nettoyer()
    infos["triangles"] = {}
    for o in coll.objects:
        if o.type == "MESH":
            k = o.name.split("_")[0]
            infos["triangles"][k] = infos["triangles"].get(k, 0) + sum(len(p.vertices) - 2 for p in o.data.polygons)
    if exporter:
        infos["glb"] = B.exporter(coll.name, "fete-mer.glb")
        infos["leger"] = B.exporter_leger(coll.name, "fete-mer-leger.glb", ratio=0.5, garder=("lanterne", "lotus", "celeste", "meduse", "guirlande", "couronne"))
    if rendu:
        infos["rendus"] = planches(coll)
    return infos


def planches(coll=None):
    coll = coll or bpy.data.collections["fete_mer"]
    deplacer(coll, 1)
    try:
        vues = [("fete-mer", (24, -34, 20), (1, -2, 2.5), 40, (1600, 1000)),
                ("fete-mer-arbitre", (9.5, -15.5, 4.2), (2.3, -10, 1.6), 50, (1400, 900)),
                ("fete-mer-etoilee", (15, -12, 8), (-1, 3, 2.2), 40, (1400, 900)),
                ("fete-mer-dirigeable", (-2, 2, 11), (-10, 12, 8), 50, (1400, 900)),
                ("fete-mer-barge", (-2, -17, 5), (-7, -9, 1.4), 50, (1400, 900))]
        return [B.vitrine([coll.name], cam=cam, cible=cible, objectif=obj, nom=nom, taille=taille) for nom, cam, cible, obj, taille in vues]
    finally:
        B.fin_vitrine()
        deplacer(coll, -1)
