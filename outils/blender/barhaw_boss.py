# Le BOSS LIVE : un roi des abysses inventé pour Barhaw (masque d'os, cornes, couronne, halo d'or, cœur de lave,
# bras levés et tentacules à la place des jambes). Exporté en modeles/boss/boss.glb ; le site l'anime par les noms :
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


def construire():
    coll = B.collection("boss")
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
    return {"objets": len(coll.objects)}


def tout(taille=(1100, 1100)):
    import bpy
    infos = construire()
    infos["glb"] = B.exporter("boss", "boss.glb")
    try:
        infos["rendu"] = B.vitrine(["boss"], cam=(13, -26, 11), cible=(0, 0, 6.2), objectif=50, nom="boss", taille=taille, mer=False, trait=1.4, transparent=True)
    finally:
        B.fin_vitrine()
    return infos
