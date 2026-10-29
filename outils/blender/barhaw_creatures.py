# Les créatures et les objets de la mer de la Grand Line de Barhaw (tous inventés) :
#   monstre   : le monstre marin qui barre la route (une tête qui sort de l'eau, des tentacules articulés)
#   mouette   : la mouette qui tourne autour du navire (les ailes battent)
#   bouteille : la bouteille à la mer (le message roulé dedans, avec un ruban)
# Chaque créature est une collection qui s'exporte en « <nom>.glb » (même repère que le site : 1 unité Blender = 1 unité du site,
# le haut en Z, l'eau à z = 0). Les objets qui bougent portent « anim » (voir js/grandline-3d.js, animateurs()).
import math, bmesh, bpy
from mathutils import Vector, Matrix, Euler
import barhaw_base as B

B.PALETTE.update({"verre": 0x5fd39a, "ventre": 0xffb3d1, "ecaille": 0x7a3fd6, "ventouse": 0xffc6dc, "tache": 0x5a2aa8})


def tour(profil, seg=20):
    """Un objet de révolution autour de Z : profil = [(rayon, z), …] de bas en haut."""
    bm = bmesh.new()
    rangs = []
    for r, z in profil:
        if r < 1e-4:
            rangs.append([bm.verts.new((0, 0, z))])
        else:
            rangs.append([bm.verts.new((math.cos(2 * math.pi * k / seg) * r, math.sin(2 * math.pi * k / seg) * r, z)) for k in range(seg)])
    for a, b in zip(rangs, rangs[1:]):
        if len(a) == 1 and len(b) == 1:
            continue
        if len(a) == 1:
            for k in range(seg):
                bm.faces.new((a[0], b[k], b[(k + 1) % seg]))
        elif len(b) == 1:
            for k in range(seg):
                bm.faces.new((a[k], b[0], a[(k + 1) % seg]))
        else:
            for k in range(seg):
                bm.faces.new((a[k], a[(k + 1) % seg], b[(k + 1) % seg], b[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm


def _objet(lot, nom, coll, parent=None, loc=(0, 0, 0), rot=(0, 0, 0), angle=40):
    o = lot.objet(nom, coll, angle=angle)
    if parent is not None:
        o.parent = parent
    o.location = Vector(loc)
    o.rotation_euler = Euler(rot)
    return o


def _repere(coll, nom, genre, pos, **reglages):
    e = bpy.data.objects.new(nom, None)
    coll.objects.link(e)
    e.location = Vector(pos)
    e.empty_display_size = 0.6
    e["role"] = "repere"
    B.anime(e, genre, **reglages)
    return e


# ---------- le monstre marin ----------
def segment(longueur, r0, r1, ventouses=True, bout=False):
    """Un morceau de tentacule, de z = 0 à z = longueur ; les ventouses du côté +Y (vers le navire)."""
    L = B.Lot()
    n = 6
    pts = [(0, 0, longueur * k / (n - 1)) for k in range(n)]
    if bout:
        # le bout : il s'affine et s'enroule un peu vers le navire
        pts = [(0, 0.35 * (k / (n - 1)) ** 2.4 * longueur, longueur * k / (n - 1)) for k in range(n)]
        rayons = [r0 * (1 - k / (n - 1)) ** 0.9 + 0.04 for k in range(n)]
    else:
        rayons = [r0 + (r1 - r0) * k / (n - 1) for k in range(n)]
    L.ajouter(B.tube(pts, rayons, 10), "ecaille")
    L.ajouter(B.sphere(r0 * 1.02, 10, 6), "ecaille")  # l'articulation (pas de trou quand ça plie)
    # le dessous rose (le ventre du tentacule), une bande du côté des ventouses
    bande = B.tube(pts, [r * 0.82 for r in rayons], 8)
    bmesh.ops.translate(bande, verts=bande.verts, vec=(0, rayons[0] * 0.22, 0))
    L.ajouter(bande, "ventre")
    if ventouses:
        nb = 3 if not bout else 2
        for k in range(nb):
            t = (k + 0.5) / nb * (0.7 if bout else 1.0)
            z = longueur * t
            r = r0 + (r1 - r0) * t if not bout else r0 * (1 - t) + 0.04
            y = r * 1.0 + (0.35 * t ** 2.4 * longueur if bout else 0)
            d = max(0.07, r * 0.38)
            L.ajouter(B.cyl(d, d * 0.8, 0.12, 8), "ventouse", B.mat4((0, y - 0.02, z), (-math.pi / 2, 0, 0)))
            L.ajouter(B.cyl(d * 0.45, d * 0.45, 0.13, 6), "rose", B.mat4((0, y + 0.0, z), (-math.pi / 2, 0, 0)))
    # des taches sombres sur le dessus (le côté qu'on voit de loin)
    if not bout:
        for k in range(2):
            t = 0.3 + k * 0.4
            r = r0 + (r1 - r0) * t
            a = (k - 0.5) * 1.1
            p = Vector((math.sin(a) * r * 0.93, -math.cos(a) * r * 0.93, longueur * t))
            n = Vector((math.sin(a), -math.cos(a), 0))
            L.ajouter(B.sphere(r * 0.34, 8, 5), "tache", B.mat4(p, n.to_track_quat("Z", "Y").to_euler(), ech=(1, 1, 0.3)))
    return L


def tentacule(coll, nom, base, angle, longueurs, r_base, courbure, phase, ampl=0.16, vitesse=1.6, penche=0.18):
    """Une chaîne de morceaux : chacun est l'enfant du précédent (le site les balance en vague)."""
    rayons = [r_base * (1 - 0.8 * k / len(longueurs)) for k in range(len(longueurs) + 1)]
    parent = None
    objets = []
    for k, l in enumerate(longueurs):
        bout = k == len(longueurs) - 1
        lot = segment(l, rayons[k], rayons[k + 1], True, bout)
        if parent is None:
            o = _objet(lot, f"{nom}_{k}", coll, None, base, (penche, 0, angle + math.pi / 2))
        else:
            o = _objet(lot, f"{nom}_{k}", coll, parent, (0, 0, longueurs[k - 1]), (-courbure[k], 0, 0))
        B.anime(o, "balance", axe=[1, 0, 0], ampl=ampl * (1 + k * 0.12), vitesse=vitesse, phase=phase - k * 0.55)
        parent = o
        objets.append(o)
    return objets


def oeil(L, centre, r, regard=Vector((0, -1, 0.15))):
    c = Vector(centre)
    d = regard.normalized()
    L.ajouter(B.sphere(r, 20, 14), "blanc", B.mat4(c))
    L.ajouter(B.sphere(r * 0.62, 16, 10), "or", B.mat4(c + d * r * 0.5, ech=(1, 1, 1)))
    L.ajouter(B.sphere(r * 0.38, 14, 10), "noir", B.mat4(c + d * r * 0.78))
    L.ajouter(B.sphere(r * 0.13, 10, 6), "blanc", B.mat4(c + d * r * 1.0 + Vector((r * 0.22, 0, r * 0.25))))
    # la paupière (un demi-dôme sombre, l'air pas content)
    paupiere = B.demi_sphere(r * 1.08, 20, 6)
    L.ajouter(paupiere, "ecaille", B.mat4(c, (math.radians(-42), 0, 0)))


def monstre(rendu=True):
    coll = B.collection("monstre")
    # la tête : elle sort de l'eau loin derrière le navire et le regarde
    T = B.Lot()
    tete = B.sphere(4.0, 28, 16)
    for v in tete.verts:
        # une grosse tête ronde, un peu en poire vers le haut, aplatie devant
        v.co.x *= 1.12
        v.co.z *= 1.2 if v.co.z > 0 else 1.0
        if v.co.y < 0:
            v.co.y *= 0.82
    T.ajouter(tete, "ecaille", B.mat4((0, 0, 0.6)))
    # les taches sur le crâne
    for x, y, z, r in ((-1.6, 1.2, 4.1, 0.75), (1.3, 1.8, 4.3, 0.6), (0.2, 0.4, 5.0, 0.55), (2.6, 0.6, 2.8, 0.5), (-2.8, 0.9, 2.6, 0.55), (0.9, 2.9, 3.0, 0.5)):
        n = Vector((x, y, z - 0.6)).normalized()
        T.ajouter(B.sphere(r, 14, 8), "violet_fonce", B.mat4(Vector((x * 1.02, y * 1.02, z)), n.to_track_quat("Z", "Y").to_euler(), ech=(1, 1, 0.3)))
    # la crête : des nageoires roses en éventail sur le dessus
    for k in range(5):
        a = (k - 2) * 0.32
        base = Vector((math.sin(a) * 1.2, 0.8 + abs(k - 2) * 0.35, 5.2 - abs(k - 2) * 0.35))
        T.ajouter(B.cyl(0.42, 0.02, 1.7 - abs(k - 2) * 0.3, 10), "rose", B.mat4(base, (math.radians(-18), a * 0.9, 0), ech=(1, 0.32, 1)))
    # les oreilles-nageoires sur les côtés
    for s in (-1, 1):
        T.ajouter(B.cyl(0.9, 0.05, 2.0, 12), "rose", B.mat4((s * 4.1, 0.3, 2.4), (0, s * math.radians(62), 0), ech=(1, 0.28, 1)))
        T.ajouter(B.tore(0.5, 0.08, 14, 5), "or", B.mat4((s * 4.25, -0.1, 1.6), (math.pi / 2, 0, 0)))  # une boucle d'oreille dorée
    # les yeux (énormes) et la bouche (un grand sourire plein de petites dents)
    for s in (-1, 1):
        oeil(T, (s * 1.55, -2.85, 2.6), 1.12, Vector((-s * 0.08, -1, -0.12)))
        sourcil = B.tube(B.courbe((s * 2.6, -3.1, 4.05), (s * 0.55, -3.55, 3.55), (s * 1.5, -3.6, 4.3), 8), [0.16, 0.24, 0.27, 0.28, 0.27, 0.25, 0.2, 0.14], 8)
        T.ajouter(sourcil, "tache")
    bouche = B.courbe((-2.2, -3.0, 0.8), (2.2, -3.0, 0.8), (0, -3.45, -0.5), 14)
    T.ajouter(B.tube(bouche, [0.18, 0.26, 0.32, 0.36, 0.38, 0.4, 0.4, 0.4, 0.4, 0.38, 0.36, 0.32, 0.26, 0.18], 10), "noir")
    for k in range(1, 12, 2):
        p = bouche[k]
        T.ajouter(B.cyl(0.13, 0.0, 0.34, 6), "blanc", B.mat4(p + Vector((0, -0.28, 0.24)), (math.pi, 0, 0)))
    tete_o = _objet(T, "monstre_tete", coll, None, (0, 11.5, 0))
    B.anime(tete_o, "flotte", ampl=0.35, phase=0.0)
    _repere(coll, "monstre_ecume_tete", "ecume", (0, 11.5, 0.05), rayon=5.2)

    # les tentacules : sur les côtés et derrière le navire (jamais devant : on doit voir le navire)
    reglages = [
        # (angle autour du navire, distance, longueurs, rayon, courbure (vers le navire), phase)
        (math.radians(-12), 8.6, [2.6, 2.3, 2.0, 1.8, 1.5], 0.95, [0, 0.28, 0.34, 0.42, 0.55], 0.0),
        (math.radians(28), 9.2, [2.8, 2.5, 2.2, 1.9, 1.6], 1.0, [0, 0.22, 0.3, 0.38, 0.6], 1.3),
        (math.radians(152), 9.0, [2.7, 2.4, 2.1, 1.8, 1.5], 0.98, [0, 0.26, 0.32, 0.4, 0.55], 2.4),
        (math.radians(196), 8.4, [2.4, 2.2, 1.9, 1.6, 1.4], 0.9, [0, 0.3, 0.36, 0.44, 0.6], 3.6),
        (math.radians(62), 13.5, [2.2, 2.0, 1.8, 1.5, 1.3], 0.85, [0, 0.12, 0.2, 0.3, 0.5], 4.5),
        (math.radians(118), 13.2, [2.0, 1.9, 1.7, 1.5, 1.2], 0.8, [0, 0.14, 0.22, 0.32, 0.5], 5.4),
    ]
    for k, (a, d, longueurs, r, courbure, ph) in enumerate(reglages):
        base = (math.cos(a) * d, math.sin(a) * d, -0.4)
        tentacule(coll, f"monstre_tentacule{k}", base, a, longueurs, r, courbure, ph)
        _repere(coll, f"monstre_ecume{k}", "ecume", (base[0], base[1], 0.05), rayon=r * 1.7)

    B.nettoyer()
    infos = {"objets": len(coll.objects), "triangles": sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in coll.objects if o.type == "MESH")}
    if rendu:
        # pour juger : le navire au milieu, comme sur le site
        # le navire à la taille du site (×1,5), le temps du rendu
        navire = bpy.data.collections.get("navire")
        bouges = [o for o in navire.objects if o.parent is None] if navire else []
        for o in bouges:
            o.location *= 1.5
            o.scale *= 1.5
        try:
            infos["rendu"] = B.vitrine(["monstre", "navire"], cam=(0, -34, 24), cible=(0, 3, 3.5), objectif=36, nom="monstre", taille=(1600, 1000), mer_taille=120)
        finally:
            for o in bouges:
                o.location /= 1.5
                o.scale /= 1.5
            B.fin_vitrine()
    return infos


# ---------- la mouette ----------
def aile(cote):
    """Une aile (l'épaule à l'origine, l'aile vers +Y·côté), le bout gris, un peu relevée."""
    L = B.Lot()
    blanc = [(0.25, 0.0), (0.31, 0.3), (0.29, 0.6), (0.2, 0.86), (-0.17, 0.86), (-0.28, 0.6), (-0.33, 0.3), (-0.3, 0.0)]
    gris = [(0.2, 0.86), (0.07, 1.12), (-0.04, 1.3), (-0.1, 1.12), (-0.17, 0.86)]
    for contour, mat in ((blanc, "blanc"), (gris, "gris")):
        bm = bmesh.new()
        v = [bm.verts.new((x, y, 0.12 * y * y)) for x, y in contour]
        bm.faces.new(v)
        bmesh.ops.triangulate(bm, faces=bm.faces[:])
        bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.045)
        bm.transform(B.mat4(ech=(1, cote, 1)))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        L.ajouter(bm, mat)
    return L


def mouette(rendu=True):
    coll = B.collection("mouette")
    C = B.Lot()
    corps = B.sphere(0.32, 18, 12)
    for v in corps.verts:
        v.co.x *= 1.9
        if v.co.x < 0:
            v.co.z *= 0.8
    C.ajouter(corps, "blanc")
    C.ajouter(B.sphere(0.21, 16, 10), "blanc", B.mat4((0.62, 0, 0.18)))
    C.ajouter(B.cyl(0.07, 0.0, 0.3, 8), "orange", B.mat4((0.8, 0, 0.16), (0, math.radians(100), 0)))
    for s in (-1, 1):
        C.ajouter(B.sphere(0.04, 8, 6), "noir", B.mat4((0.74, s * 0.15, 0.25)))
    C.ajouter(B.cyl(0.18, 0.02, 0.42, 6), "gris", B.mat4((-0.55, 0, 0.02), (0, math.radians(-95), 0), ech=(1, 1.6, 1)))
    for s in (-1, 1):
        C.ajouter(B.cyl(0.03, 0.03, 0.18, 5), "orange", B.mat4((0.0, s * 0.1, -0.38)))
    corps_o = _objet(C, "mouette_corps", coll)
    for s, nom in ((1, "mouette_aile_g"), (-1, "mouette_aile_d")):
        o = _objet(aile(s), nom, coll, corps_o, (0.08, s * 0.22, 0.12))
        B.anime(o, "balance", axe=[s * 1, 0, 0], ampl=0.62, vitesse=7.0, phase=0.0)
    B.nettoyer()
    infos = {"objets": len(coll.objects)}
    if rendu:
        infos["rendu"] = B.vitrine(["mouette"], cam=(2.4, -3.4, 1.6), cible=(0, 0, 0.2), objectif=50, nom="mouette", taille=(900, 700), mer=False)
        B.fin_vitrine()
    return infos


# ---------- la bouteille à la mer ----------
def bouteille(rendu=True):
    coll = B.collection("bouteille")
    V = B.Lot()
    profil = [(0.0, 0.0), (0.5, 0.0), (0.55, 0.08), (0.56, 1.25), (0.5, 1.5), (0.3, 1.72), (0.22, 1.85), (0.22, 2.2), (0.27, 2.24), (0.27, 2.3), (0.0, 2.3)]
    V.ajouter(tour(profil, 22), "verre")
    P = B.Lot()
    P.ajouter(B.cyl(0.19, 0.21, 0.36, 12), "planche", B.mat4((0, 0, 2.06)))  # le bouchon (il dépasse du goulot)
    P.ajouter(B.cyl(0.23, 0.23, 0.06, 14), "rouge", B.mat4((0, 0, 2.4)))  # la cire
    # le message roulé, son ruban et le sceau
    P.ajouter(B.cyl(0.28, 0.28, 1.15, 16), "creme", B.mat4((0, 0, 0.18)))
    P.ajouter(B.tore(0.29, 0.035, 16, 5), "rouge", B.mat4((0, 0, 0.75)))
    P.ajouter(B.cyl(0.1, 0.1, 0.05, 10), "or", B.mat4((0.0, -0.3, 0.75), (math.pi / 2, 0, 0)))
    P.ajouter(B.etoile(0.08, 0.035, 0.02, 5, 0.4), "rouge", B.mat4((0.0, -0.335, 0.75), (math.pi / 2, 0, 0)))
    _objet(P, "bouteille_dedans", coll)
    _objet(V, "bouteille_verre", coll)
    B.nettoyer()
    infos = {"objets": len(coll.objects)}
    if rendu:
        infos["rendu"] = B.vitrine(["bouteille"], cam=(3.2, -4.4, 2.6), cible=(0, 0, 1.1), objectif=50, nom="bouteille", taille=(900, 700), mer=False)
        B.fin_vitrine()
    return infos


def tout(rendu=True, exporter=True):
    infos = {"monstre": monstre(rendu), "mouette": mouette(rendu), "bouteille": bouteille(rendu)}
    if exporter:
        for nom in ("monstre", "mouette", "bouteille"):
            infos[nom]["glb"] = B.exporter(nom, f"{nom}.glb")[1]
    return infos
