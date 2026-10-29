# Les petits objets 3D des titres du site (tous inventés), rendus sur fond transparent : img/objets/<nom>.webp
#   coffre (Cartes), borne (Jeux), trophee (Tournoi), panneau (Chasse), epees (Faille), lanterne (Events)
import math, bmesh
from mathutils import Vector
import barhaw_base as B


def coffre(L):
    L.ajouter(B.boite(2.2, 1.4, 1.1), "bois", B.mat4((0, 0, 0)))
    for x in (-0.95, 0.95):
        L.ajouter(B.boite(0.16, 1.46, 1.16), "or", B.mat4((x, 0, -0.02)))
    # le couvercle ouvert, penché vers l'arrière
    L.ajouter(B.boite(2.2, 0.18, 1.25), "bois2", B.mat4((0, 0.78, 1.08), (math.radians(-22), 0, 0)))
    L.ajouter(B.boite(2.26, 0.22, 0.14), "or", B.mat4((0, 0.98, 2.2), (math.radians(-22), 0, 0)))
    L.ajouter(B.boite(0.34, 0.12, 0.42), "or", B.mat4((0, -0.72, 0.62)))
    # des cartes qui débordent en éventail
    for k, (coul, a) in enumerate((("rose", -24), ("violet", -8), ("creme", 8), ("or", 24))):
        L.ajouter(B.boite(0.62, 0.05, 0.9), coul, B.mat4((math.sin(math.radians(a)) * 0.5, 0.05 + k * 0.03, 1.15), (0, math.radians(a), 0)))
    for k in range(5):
        L.ajouter(B.cyl(0.13, 0.13, 0.05, 12), "or", B.mat4((-0.7 + k * 0.33, 0.85, 0.0 + (k % 2) * 0.05), (math.radians(80), 0, k)))


def borne(L):
    L.ajouter(B.boite(1.3, 1.1, 3.0), "violet", B.mat4((0, 0, 0)))
    L.ajouter(B.boite(1.36, 1.16, 0.12), "rose", B.mat4((0, 0, 3.0)))
    L.ajouter(B.boite(1.1, 0.06, 0.9), "noir", B.mat4((0, -0.56, 1.75), (math.radians(-12), 0, 0)))
    L.ajouter(B.boite(0.9, 0.04, 0.68), "turquoise", B.mat4((0, -0.6, 1.86), (math.radians(-12), 0, 0)))
    L.ajouter(B.boite(1.3, 0.55, 0.12), "prune", B.mat4((0, -0.75, 1.35)))
    L.ajouter(B.cyl(0.05, 0.05, 0.3, 8), "fer", B.mat4((-0.3, -0.85, 1.47)))
    L.ajouter(B.sphere(0.11, 12, 8), "rouge", B.mat4((-0.3, -0.85, 1.8)))
    for k, c in enumerate(("jaune", "rose", "turquoise")):
        L.ajouter(B.cyl(0.08, 0.08, 0.06, 12), c, B.mat4((0.05 + k * 0.2, -0.85, 1.47)))
    L.ajouter(B.boite(1.1, 0.06, 0.36), "or", B.mat4((0, -0.56, 2.6)))
    L.ajouter(B.etoile(0.14, 0.06, 0.04, 5, 0.5), "rose", B.mat4((0, -0.6, 2.78), (math.pi / 2, 0, 0)))


def trophee(L):
    L.ajouter(B.boite(1.1, 1.1, 0.35), "bois_fonce", B.mat4((0, 0, 0)))
    L.ajouter(B.boite(0.8, 0.8, 0.3), "bois", B.mat4((0, 0, 0.35)))
    L.ajouter(B.cyl(0.12, 0.2, 0.7, 14), "or", B.mat4((0, 0, 0.65)))
    coupe = B.tube([(0, 0, 1.3), (0, 0, 1.5), (0, 0, 1.9), (0, 0, 2.3), (0, 0, 2.55)], [0.2, 0.45, 0.62, 0.7, 0.72], 20)
    L.ajouter(coupe, "or", None)
    for s in (-1, 1):
        L.ajouter(B.tore(0.3, 0.07, 16, 6), "or", B.mat4((s * 0.75, 0, 2.05), (math.pi / 2, 0, 0)))
    L.ajouter(B.etoile(0.32, 0.14, 0.08, 5, 0.6), "rose", B.mat4((0, -0.7, 1.95), (math.pi / 2, 0, 0)))
    L.ajouter(B.boite(0.5, 0.02, 0.14), "or", B.mat4((0, -0.41, 0.42)))


def panneau(L):
    for x in (-1.0, 1.0):
        L.ajouter(B.cyl(0.08, 0.08, 2.9, 8), "bois_fonce", B.mat4((x, 0.05, 0)))
    L.ajouter(B.boite(2.4, 0.12, 1.8), "planche", B.mat4((0, 0, 0.9)))
    L.ajouter(B.boite(2.55, 0.16, 0.16), "bois", B.mat4((0, 0, 2.7)))
    L.ajouter(B.boite(1.0, 0.03, 1.3), "creme", B.mat4((-0.45, -0.08, 1.15), (0, math.radians(-4), 0)))
    L.ajouter(B.boite(0.62, 0.02, 0.52), "bois_clair", B.mat4((-0.45, -0.1, 1.6), (0, math.radians(-4), 0)))
    L.ajouter(B.boite(0.8, 0.02, 0.12), "rouge_fonce", B.mat4((-0.45, -0.1, 2.25), (0, math.radians(-4), 0)))
    L.ajouter(B.boite(0.7, 0.03, 0.9), "creme", B.mat4((0.62, -0.08, 1.05), (0, math.radians(6), 0)))
    L.ajouter(B.boite(0.5, 0.02, 0.1), "rouge_fonce", B.mat4((0.62, -0.1, 1.38), (0, math.radians(6), 0)))
    # le poignard planté
    L.ajouter(B.cyl(0.06, 0.0, 0.7, 6), "fer", B.mat4((0.3, -0.35, 2.0), (math.radians(-70), 0, 0)))
    L.ajouter(B.boite(0.3, 0.06, 0.06), "or", B.mat4((0.3, -0.42, 1.98), (math.radians(-70), 0, 0)))
    L.ajouter(B.cyl(0.05, 0.05, 0.25, 8), "bois_fonce", B.mat4((0.3, -0.62, 2.07), (math.radians(-70), 0, 0)))


def epees(L):
    for s in (-1, 1):
        rot = (0, s * math.radians(38), 0)
        L.ajouter(B.boite(0.18, 0.05, 2.6), "gris", B.mat4((s * -0.05, 0, 0.6), rot))
        L.ajouter(B.boite(0.9, 0.12, 0.14), "or", B.mat4((s * 0.52, 0, 0.35), rot))
        L.ajouter(B.cyl(0.07, 0.07, 0.55, 8), "bois_fonce", B.mat4((s * 0.75, 0, -0.1), rot))
        L.ajouter(B.sphere(0.11, 10, 6), "or", B.mat4((s * 0.98, 0, -0.38)))
    bouclier = B.cyl(0.85, 0.85, 0.18, 6)
    L.ajouter(bouclier, "violet", B.mat4((0, -0.25, 0.9), (math.pi / 2, 0, 0)))
    L.ajouter(B.tore(0.85, 0.07, 6, 4), "or", B.mat4((0, -0.36, 0.9), (math.pi / 2, math.pi / 6, 0)))
    L.ajouter(B.etoile(0.42, 0.18, 0.08, 5, 0.6), "rose", B.mat4((0, -0.4, 0.9), (math.pi / 2, 0, 0)))


def lanterne(L):
    L.ajouter(B.tore(0.12, 0.03, 12, 5), "fer", B.mat4((0, 0, 2.55), (math.pi / 2, 0, 0)))
    L.ajouter(B.cyl(0.32, 0.32, 0.12, 16), "noir", B.mat4((0, 0, 2.3)))
    corps = B.tube([(0, 0, 0.35), (0, 0, 0.7), (0, 0, 1.3), (0, 0, 1.9), (0, 0, 2.3)], [0.32, 0.72, 0.85, 0.72, 0.32], 16)
    L.ajouter(corps, "rose", None)
    for z in (0.75, 1.3, 1.85):
        r = 0.72 if z != 1.3 else 0.86
        L.ajouter(B.tore(r, 0.03, 24, 4), "rouge_fonce", B.mat4((0, 0, z)))
    L.ajouter(B.cyl(0.32, 0.32, 0.12, 16), "noir", B.mat4((0, 0, 0.23)))
    for k in range(5):
        a = k * 2 * math.pi / 5
        L.ajouter(B.cyl(0.025, 0.01, 0.5, 5), "or", B.mat4((math.cos(a) * 0.2, math.sin(a) * 0.2, -0.27)))


OBJETS = {"coffre": coffre, "borne": borne, "trophee": trophee, "panneau": panneau, "epees": epees, "lanterne": lanterne}


def tout(taille=(560, 560)):
    faits = {}
    for nom, f in OBJETS.items():
        coll = B.collection("objet_" + nom)
        L = B.Lot()
        f(L)
        L.objet("objet_" + nom, coll, angle=40)
        o = coll.objects[0]
        coins = [o.matrix_world @ Vector(k) for k in o.bound_box]
        mn = Vector((min(v.x for v in coins), min(v.y for v in coins), min(v.z for v in coins)))
        mx = Vector((max(v.x for v in coins), max(v.y for v in coins), max(v.z for v in coins)))
        c = (mn + mx) / 2
        R = (mx - mn).length / 2
        cam = c + Vector((0.55, -0.85, 0.35)).normalized() * R * 3.0
        try:
            faits[nom] = B.vitrine([coll.name], cam=tuple(cam), cible=tuple(c), objectif=42, nom="objet-" + nom, taille=taille, mer=False, trait=1.4, transparent=True)
        finally:
            B.fin_vitrine()
    return faits
