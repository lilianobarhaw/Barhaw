# Les images de GRAND LINE rendues dans Blender (fond transparent) pour la page :
#   port : le navire de la commu amarré à Port Barhaw, sur un rond d'eau (la carte « Accès restreint », l'en-tête)
# À lancer après barhaw_navire.construire() et barhaw_iles.construire() (les collections « navire » et « ile_port »).
import math, os, bmesh, bpy
from mathutils import Vector, Euler
import barhaw_base as B


def _instance(coll_dest, source, loc=(0, 0, 0), rot=(0, 0, 0), ech=1.0):
    e = bpy.data.objects.new("aff_" + source, None)
    e.instance_type = "COLLECTION"
    e.instance_collection = bpy.data.collections[source]
    e.location = Vector(loc)
    e.rotation_euler = Euler(rot)
    e.scale = (ech, ech, ech)
    coll_dest.objects.link(e)
    return e


def rond_d_eau(coll, r=15.5, ep=1.2):
    """Un socle d'eau rond (comme une figurine) avec un liseré d'écume."""
    L = B.Lot()
    L.ajouter(B.cyl(r, r, ep, 64), "eau", B.mat4((0, 0, -ep)))
    L.ajouter(B.tore(r, 0.18, 64, 6), "blanc", B.mat4((0, 0, -0.02)))
    L.ajouter(B.cyl(r + 0.25, r + 0.25, 0.5, 64), "bois_fonce", B.mat4((0, 0, -ep - 0.5)))
    L.ajouter(B.tore(r + 0.25, 0.12, 64, 6), "or", B.mat4((0, 0, -ep - 0.02)))
    return L.objet("aff_socle", coll)


def port(taille=(1400, 1000), nav=(9.6, 4.6, -118), cam=(26, -34, 22), cible=(1.5, 0.5, 2.5), objectif=48):
    coll = B.collection("affiche")
    rond_d_eau(coll)
    _instance(coll, "ile_port")
    _instance(coll, "navire", loc=(nav[0], nav[1], 0.0), rot=(0, 0, math.radians(nav[2])), ech=1.5)
    # les collections sources : rendables (pour les instances) mais exclues de la vue (sinon les originaux se voient)
    sources = ["navire", "ile_port"]
    lcs = {lc.name: lc for lc in bpy.context.view_layer.layer_collection.children}
    avant = {n: lcs[n].exclude for n in sources if n in lcs}
    try:
        for n in avant:
            lcs[n].exclude = True
        chemin = B.vitrine(["affiche"] + sources, cam=cam, cible=cible, objectif=objectif, nom="affiche-port", taille=taille, mer=False, trait=1.2, transparent=True)
    finally:
        B.fin_vitrine()
        for n, v in avant.items():
            lcs[n].exclude = v
    return chemin


def iles(taille=(720, 600), ids=None):
    """Une vignette par île (fond transparent, un rond d'eau dessous) : img/iles/<id>.webp sur le site
    (« Terre en vue ! », la fiche de l'île, les escales, la carte 2D)."""
    import barhaw_iles
    from mathutils import Vector
    faits = {}
    lcs = {lc.name: lc for lc in bpy.context.view_layer.layer_collection.children}
    for id_ in barhaw_iles.ILES:
        if ids and id_ not in ids:
            continue
        nom_c = "ile_" + id_
        c = bpy.data.collections.get(nom_c)
        if not c:
            continue
        if nom_c in lcs:
            lcs[nom_c].exclude = False
        coins = [o.matrix_world @ Vector(k) for o in c.all_objects if o.type == "MESH" for k in o.bound_box]
        mn = Vector((min(v.x for v in coins), min(v.y for v in coins), max(-0.5, min(v.z for v in coins))))
        mx = Vector((max(v.x for v in coins), max(v.y for v in coins), max(v.z for v in coins)))
        centre = (mn + mx) / 2
        rayon_eau = max(mx.x - mn.x, mx.y - mn.y) / 2 * 0.98
        socle = B.collection("affiche")
        L = B.Lot()
        L.ajouter(B.cyl(rayon_eau, rayon_eau, 2.2, 72), "eau", B.mat4((centre.x, centre.y, -2.22)))  # épais : cache le fond de l'île sous l'eau
        L.ajouter(B.tore(rayon_eau, 0.14, 72, 6), "blanc", B.mat4((centre.x, centre.y, -0.03)))
        L.objet("aff_eau", socle)
        R = (mx - mn).length / 2
        d = Vector((0.5, -0.78, 0.62)).normalized()
        cam = centre + d * R * 2.35
        try:
            faits[id_] = B.vitrine([nom_c, "affiche"], cam=tuple(cam), cible=tuple(centre), objectif=38, nom=f"vignette-{id_}", taille=taille, mer=False, trait=1.0, transparent=True)
        finally:
            B.fin_vitrine()
    return faits
