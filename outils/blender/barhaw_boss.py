# Les boss du BOSS LIVE, inventés pour Barhaw : MORGHAST (roi des abysses : masque d'os, cornes, halo, cœur de lave, tentacules),
# VORAXIA (reine-tempête : méduse de verre, un seul œil, cœur de foudre) et KRAKOR (colosse de lave : roche fendue, poings énormes).
# Exportés en modeles/boss/<id>.glb ; le site les anime par les noms :
#   boss_tete (regarde autour), boss_halo (tourne), boss_bras_g / boss_bras_d (se lèvent), boss_tentacule0..5 (ondulent),
#   boss_coeur (bat). L'aura, les éclairs et les éclats sont faits par le site (js/boss-3d.js).
import math
from mathutils import Vector
import barhaw_base as B


def _pointes_autour(L, centre, rayon, n, haut, mat, incl=0.5, r=0.22, h=1.2, z_axe=True):
    for k in range(n):
        a = k * 2 * math.pi / n
        if z_axe:
            p = (centre[0] + math.cos(a) * rayon, centre[1] + math.sin(a) * rayon, centre[2])
            rot = (math.sin(a) * -incl, math.cos(a) * incl, 0)
        else:  # autour de l'axe Y (le halo, face à l'avant)
            p = (centre[0] + math.cos(a) * rayon, centre[1], centre[2] + math.sin(a) * rayon)
            rot = (0, math.pi / 2 - a, 0)
        L.ajouter(B.cyl(r, 0.0, h, 8), mat, B.mat4(p, rot))


def morghast(coll):
    # le corps : torse, plastron noir, cœur de lave, taille qui se perd en fumée
    L = B.Lot()
    L.ajouter(B.sphere(2.4, 24, 14), "prune", B.mat4((0, 0, 6.5), ech=(1.25, 0.9, 1.3)))
    L.ajouter(B.sphere(2.0, 24, 14), "noir", B.mat4((0, -0.75, 6.9), ech=(1.12, 0.6, 1.0)))
    L.ajouter(B.cyl(1.95, 0.85, 2.6, 20), "violet_fonce", B.mat4((0, 0, 3.4)))
    L.ajouter(B.tore(2.0, 0.22, 28, 8), "or", B.mat4((0, 0, 5.0), ech=(1.05, 0.85, 1)))
    for s in (-1, 1):  # les épaulières à pointes
        L.ajouter(B.sphere(1.35, 18, 10), "noir", B.mat4((s * 2.95, 0, 8.0), ech=(1, 1, 0.8)))
        L.ajouter(B.tore(1.2, 0.12, 20, 6), "or", B.mat4((s * 2.95, 0, 7.75)))
        for k, (dx, dz, a) in enumerate(((0.2, 0.9, 0.2), (0.75, 0.55, 0.75), (-0.3, 0.95, -0.25))):
            L.ajouter(B.cyl(0.3, 0.0, 1.6 - k * 0.2, 8), "creme", B.mat4((s * (2.95 + dx), 0, 8.0 + dz), (0, s * a, 0)))
    L.objet("boss_corps", coll)
    C = B.Lot()  # le cœur, la cible : il bat
    C.ajouter(B.etoile(0.75, 0.32, 0.3, 6, 0.6), "lave", B.mat4((0, 0, 0), (math.pi / 2, 0, 0)))
    C.ajouter(B.tore(0.95, 0.09, 24, 6), "or", B.mat4((0, 0.05, 0), (math.pi / 2, 0, 0)))
    C.objet("boss_coeur", coll, origine=(0, 0, 0)).location = (0, -1.95, 7.0)
    # la tête : crâne noir, masque d'os, yeux et bouche de lave, cornes, couronne
    T = B.Lot()
    T.ajouter(B.cyl(0.8, 0.95, 1.2, 14), "prune", B.mat4((0, 0, 8.6)))
    T.ajouter(B.sphere(1.5, 22, 14), "noir", B.mat4((0, 0, 10.0), ech=(1, 0.95, 1.15)))
    T.ajouter(B.sphere(1.28, 22, 14), "creme", B.mat4((0, -0.95, 9.95), ech=(1, 0.5, 1.12)))
    for s in (-1, 1):
        T.ajouter(B.sphere(0.36, 14, 8), "noir", B.mat4((s * 0.5, -1.5, 10.2), (0, s * math.radians(22), 0), ech=(1.5, 0.45, 0.8)))
        T.ajouter(B.sphere(0.27, 14, 8), "lave", B.mat4((s * 0.5, -1.62, 10.18), (0, s * math.radians(22), 0), ech=(1.4, 0.4, 0.55)))
        corne = B.courbe((s * 0.85, 0.1, 10.8), (s * 2.5, 0.5, 13.2), (s * 2.7, 0.1, 10.9), 9)
        T.ajouter(B.tube(corne, [0.42, 0.4, 0.36, 0.31, 0.25, 0.19, 0.13, 0.08, 0.03], 10), "creme")
        T.ajouter(B.tore(0.4, 0.07, 14, 5), "or", B.mat4((s * 1.25, 0.15, 11.0), (0, s * 0.9, 0)))
    T.ajouter(B.boite(1.1, 0.18, 0.22), "lave", B.mat4((0, -1.45, 9.32)))
    for k in range(5):
        x = -0.44 + k * 0.22
        T.ajouter(B.cyl(0.07, 0.0, 0.22, 6), "creme", B.mat4((x, -1.52, 9.43), (math.pi, 0, 0)))
    T.ajouter(B.tore(1.05, 0.13, 24, 6), "or", B.mat4((0, 0, 11.15)))
    _pointes_autour(T, (0, 0, 11.2), 1.05, 7, 1.2, "or", incl=0.35, r=0.2, h=1.25)
    T.ajouter(B.etoile(0.32, 0.14, 0.12, 4, 0.5), "lave", B.mat4((0, -1.0, 11.6), (math.pi / 2, 0, 0)))
    tete = T.objet("boss_tete", coll, origine=(0, 0, 8.6))
    tete.location = (0, 0, 8.6)
    B.anime(tete, "regarde")
    # le halo d'or dans le dos (il tourne)
    H = B.Lot()
    H.ajouter(B.tore(3.3, 0.13, 48, 6), "or", B.mat4((0, 0, 0), (math.pi / 2, 0, 0)))
    H.ajouter(B.tore(2.7, 0.06, 48, 5), "lave", B.mat4((0, 0, 0), (math.pi / 2, 0, 0)))
    _pointes_autour(H, (0, 0, 0), 3.3, 12, 0, "or", r=0.17, h=0.9, z_axe=False)
    halo = H.objet("boss_halo", coll, origine=(0, 0, 0))
    halo.location = (0, 1.1, 10.1)
    B.anime(halo, "tourne")
    # les bras levés, griffes ouvertes
    for s, nom in ((-1, "boss_bras_g"), (1, "boss_bras_d")):
        A = B.Lot()
        epaule, coude, main = (s * 2.9, 0, 7.7), (s * 4.7, -0.5, 6.0), (s * 5.6, -1.4, 8.6)
        A.ajouter(B.tube([epaule, coude], [0.78, 0.6], 12), "prune")
        A.ajouter(B.tube([coude, main], [0.6, 0.48], 12), "prune")
        A.ajouter(B.sphere(0.62, 12, 8), "noir", B.mat4(coude))
        A.ajouter(B.tore(0.6, 0.1, 16, 5), "or", B.mat4(((coude[0] + main[0]) / 2, (coude[1] + main[1]) / 2, (coude[2] + main[2]) / 2), (0.6, s * 0.4, 0)))
        A.ajouter(B.sphere(0.72, 14, 9), "noir", B.mat4(main))
        for k in range(4):
            a = (k - 1.5) * 0.45
            A.ajouter(B.cyl(0.17, 0.0, 1.15, 8), "creme", B.mat4((main[0] + s * math.sin(a) * 0.4, main[1] - 0.2, main[2] + 0.45), (-0.35, s * a, 0)))
        bras = A.objet(nom, coll, origine=epaule)
        bras.location = epaule
        B.anime(bras, "bras")
    # les tentacules à la place des jambes
    for k in range(6):
        a = k * 2 * math.pi / 6 + 0.3
        c, s_ = math.cos(a), math.sin(a)
        base = (c * 1.0, s_ * 1.0, 3.0)
        pts = B.courbe(base, (c * 4.4, s_ * 4.4, -1.6 + (k % 2) * 0.8), (c * 3.2 + s_ * 1.2, s_ * 3.2 - c * 1.2, 1.4), 10)
        P = B.Lot()
        P.ajouter(B.tube(pts, [0.62 - i * 0.058 for i in range(10)], 10), "violet_fonce")
        for i in (3, 5, 7):
            P.ajouter(B.sphere(0.13, 8, 5), "rose", B.mat4(tuple(Vector(pts[i]) + Vector((0, 0, -0.42 + i * 0.03)))))
        P.ajouter(B.sphere(0.12, 8, 5), "lave", B.mat4(pts[-1]))
        t = P.objet(f"boss_tentacule{k}", coll, origine=base)
        t.location = base
        B.anime(t, "ondule", phase=k * 1.05)


def voraxia(coll):
    """VORAXIA, la Reine-Tempête : une méduse géante de verre, un seul grand œil, un cœur de foudre dans la cloche."""
    T = B.Lot()  # la cloche (elle regarde autour) : verre, bord turquoise, franges, l'œil, la couronne de cristal
    T.ajouter(B.demi_sphere(4.3, 32, 12), "glace", B.mat4((0, 0, 9.0), ech=(1, 1, 0.9)))
    T.ajouter(B.demi_sphere(3.5, 28, 10), "violet", B.mat4((0, 0, 9.05), ech=(1, 1, 0.8)))
    T.ajouter(B.tore(4.3, 0.32, 48, 8), "turquoise", B.mat4((0, 0, 9.0)))
    for k in range(18):
        a = k * 2 * math.pi / 18
        T.ajouter(B.sphere(0.42, 10, 6), "rose" if k % 2 else "violet", B.mat4((math.cos(a) * 4.45, math.sin(a) * 4.45, 8.75), ech=(1, 1, 0.7)))
    T.ajouter(B.sphere(1.3, 22, 14), "blanc", B.mat4((0, -4.05, 10.05), ech=(1.3, 0.55, 1)))
    T.ajouter(B.sphere(0.8, 18, 12), "lave", B.mat4((0, -4.5, 10.05), ech=(1, 0.45, 1)))
    T.ajouter(B.boite(0.24, 0.12, 1.25), "noir", B.mat4((0, -4.86, 10.05)))
    for s_ in (-1, 1):  # les paupières lourdes : un regard méchant
        T.ajouter(B.sphere(1.0, 14, 8), "violet_fonce", B.mat4((s_ * 0.6, -4.25, 10.8), (0, s_ * math.radians(20), 0), ech=(1.15, 0.5, 0.35)))
    T.ajouter(B.tore(1.6, 0.14, 32, 6), "or", B.mat4((0, 0, 12.75)))
    for k in range(9):
        a = k * 2 * math.pi / 9
        h = 2.6 if k % 3 == 0 else 1.7
        T.ajouter(B.cyl(0.38, 0.0, h, 6), "glace", B.mat4((math.cos(a) * 1.6, math.sin(a) * 1.6, 12.7), (math.sin(a) * -0.3, math.cos(a) * 0.3, 0)))
    tete = T.objet("boss_tete", coll, origine=(0, 0, 9.0))
    tete.location = (0, 0, 9.0)
    C = B.Lot()  # le cœur de foudre, dans la cloche
    C.ajouter(B.sphere(1.25, 18, 12), "lumiere")
    C.ajouter(B.etoile(1.9, 0.5, 0.25, 6, 0.4), "turquoise", B.mat4((0, 0, 0), (math.pi / 2, 0, 0)))
    C.objet("boss_coeur", coll, origine=(0, 0, 0)).location = (0, 0, 10.2)
    H = B.Lot()  # l'anneau d'orbes d'orage derrière
    H.ajouter(B.tore(5.8, 0.1, 64, 5), "turquoise", B.mat4((0, 0, 0), (math.pi / 2, 0, 0)))
    for k in range(10):
        a = k * 2 * math.pi / 10
        H.ajouter(B.sphere(0.42 if k % 2 else 0.6, 12, 8), "lumiere" if k % 2 else "glace", B.mat4((math.cos(a) * 5.8, 0, math.sin(a) * 5.8)))
    halo = H.objet("boss_halo", coll, origine=(0, 0, 0))
    halo.location = (0, 1.6, 9.5)
    for k in range(8):  # les tentacules qui pendent, longs, avec des bouts qui brillent
        a = k * 2 * math.pi / 8 + 0.2
        c, s_ = math.cos(a), math.sin(a)
        r0 = 3.4 if k % 2 else 2.4
        base = (c * r0, s_ * r0, 8.6)
        pts = B.courbe(base, (c * (r0 + 1.8), s_ * (r0 + 1.8), -2.5 - (k % 3) * 0.8), (c * (r0 - 1.5) + s_ * 1.5, s_ * (r0 - 1.5) - c * 1.5, 3.5), 12)
        P = B.Lot()
        P.ajouter(B.tube(pts, [0.5 - i * 0.038 for i in range(12)], 10), "violet" if k % 2 else "turquoise")
        P.ajouter(B.sphere(0.24, 10, 6), "lumiere", B.mat4(pts[-1]))
        t = P.objet(f"boss_tentacule{k}", coll, origine=base)
        t.location = base
        B.anime(t, "ondule", phase=k * 0.8)


def krakor(coll):
    """KRAKOR, le Colosse de Lave : un géant de roche noire fendue de lave, poings énormes, volcans sur les épaules."""
    L = B.Lot()
    L.ajouter(B.caillou(3.1, 7, 0.22, 2, ech=(1.25, 0.95, 1.05)), "roche_noire", B.mat4((0, 0, 6.6)))
    for k, (x, z, a, lg) in enumerate(((-1.2, 7.6, 0.5, 1.6), (0.9, 6.2, -0.7, 1.9), (-0.4, 5.2, 1.2, 1.3), (1.6, 8.0, 0.2, 1.2), (-1.9, 6.1, -0.4, 1.1))):
        L.ajouter(B.boite(lg, 0.25, 0.16), "lave", B.mat4((x, -2.75, z), (0, a, 0)))
    for s_ in (-1, 1):
        L.ajouter(B.cyl(1.15, 0.95, 3.2, 12), "roche_noire", B.mat4((s_ * 1.5, 0, 1.0)))
        L.ajouter(B.boite(1.9, 2.3, 0.8), "pierre_fonce", B.mat4((s_ * 1.5, -0.3, 0.0)))
        L.ajouter(B.caillou(1.6, 20 + s_, 0.3, 2), "pierre_fonce", B.mat4((s_ * 3.3, 0, 8.7)))
        L.ajouter(B.cyl(0.75, 0.45, 0.7, 10), "lave", B.mat4((s_ * 3.3, 0, 9.9)))
        L.ajouter(B.tore(0.6, 0.12, 14, 5), "noir", B.mat4((s_ * 3.3, 0, 10.6)))
    L.ajouter(B.tore(2.6, 0.25, 32, 6), "lave", B.mat4((0, 0, 4.0), ech=(1.1, 0.9, 1)))
    L.objet("boss_corps", coll)
    C = B.Lot()  # le cœur de magma
    C.ajouter(B.sphere(0.95, 16, 10), "feu")
    C.ajouter(B.etoile(1.35, 0.55, 0.3, 8, 0.5), "lave", B.mat4((0, 0, 0), (math.pi / 2, 0, 0)))
    C.objet("boss_coeur", coll, origine=(0, 0, 0)).location = (0, -2.85, 6.9)
    T = B.Lot()  # la tête : petite, massive, cornes d'obsidienne, yeux et bouche de lave
    T.ajouter(B.caillou(1.35, 33, 0.2, 2, ech=(1.1, 1, 0.95)), "roche_noire", B.mat4((0, -0.2, 10.4)))
    T.ajouter(B.boite(2.0, 0.6, 0.35), "pierre_fonce", B.mat4((0, -1.05, 10.85), (0.15, 0, 0)))
    for s_ in (-1, 1):
        T.ajouter(B.sphere(0.24, 12, 8), "lave", B.mat4((s_ * 0.45, -1.32, 10.45), ech=(1.3, 0.6, 0.8)))
        corne = B.courbe((s_ * 0.9, 0, 11.0), (s_ * 2.0, -0.4, 12.9), (s_ * 2.1, 0, 11.2), 8)
        T.ajouter(B.tube(corne, [0.38, 0.34, 0.29, 0.23, 0.17, 0.11, 0.06, 0.02], 8), "noir")
    T.ajouter(B.boite(0.9, 0.14, 0.14), "lave", B.mat4((0, -1.38, 9.85)))
    tete = T.objet("boss_tete", coll, origine=(0, 0, 9.3))
    tete.location = (0, 0, 9.3)
    for s_, nom in ((-1, "boss_bras_g"), (1, "boss_bras_d")):  # les bras, et les poings énormes
        A = B.Lot()
        epaule, coude, poing = (s_ * 3.5, 0, 8.0), (s_ * 5.0, -0.6, 5.6), (s_ * 4.9, -1.5, 3.2)
        A.ajouter(B.tube([epaule, coude], [1.05, 0.95], 12), "roche_noire")
        A.ajouter(B.tube([coude, poing], [0.95, 0.9], 12), "roche_noire")
        A.ajouter(B.sphere(0.9, 12, 8), "lave", B.mat4(coude, ech=(0.8, 0.8, 0.8)))
        A.ajouter(B.caillou(1.65, 40 + s_, 0.25, 2), "pierre_fonce", B.mat4(poing))
        for k in range(3):
            A.ajouter(B.boite(1.1, 0.18, 0.14), "lave", B.mat4((poing[0], poing[1] - 1.3, poing[2] + 0.5 - k * 0.5)))
        bras = A.objet(nom, coll, origine=epaule)
        bras.location = epaule
    H = B.Lot()  # l'anneau de rochers qui flottent derrière
    for k in range(11):
        a = k * 2 * math.pi / 11
        H.ajouter(B.caillou(0.5 + (k % 3) * 0.2, 60 + k, 0.35, 1), "pierre_fonce" if k % 2 else "roche_noire", B.mat4((math.cos(a) * 6.0, 0, math.sin(a) * 6.0)))
        if k % 3 == 0:
            H.ajouter(B.sphere(0.22, 8, 5), "lave", B.mat4((math.cos(a) * 6.0, -0.5, math.sin(a) * 6.0 + 0.5)))
    halo = H.objet("boss_halo", coll, origine=(0, 0, 0))
    halo.location = (0, 1.8, 7.5)


BOSS = {"morghast": morghast, "voraxia": voraxia, "krakor": krakor}


def construire(ids=None):
    faits = {}
    for id_, f in BOSS.items():
        if ids and id_ not in ids:
            continue
        coll = B.collection("boss_" + id_)
        f(coll)
        faits[id_] = len(coll.objects)
    return faits


def tout(ids=None, taille=(1100, 1100), rendu=True):
    import bpy
    faits = construire(ids)
    infos = {}
    for id_ in faits:
        infos[id_] = {"glb": B.exporter("boss_" + id_, f"{id_}.glb")}
        if rendu:
            try:
                bpy.context.scene.render.image_settings.media_type = "IMAGE"
            except Exception:
                pass
            try:
                infos[id_]["rendu"] = B.vitrine(["boss_" + id_], cam=(13, -26, 11), cible=(0, 0, 6.2), objectif=50, nom="boss-" + id_, taille=taille, mer=False, trait=1.4, transparent=True)
            finally:
                B.fin_vitrine()
    return infos
