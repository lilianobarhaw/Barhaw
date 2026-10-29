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
