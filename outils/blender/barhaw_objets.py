# Les petits objets 3D des titres du site (tous inventés), rendus sur fond transparent : img/objets/<nom>.webp
#   coffre (Cartes), borne (Jeux), trophee (Tournoi), panneau (Chasse), epees (Faille), lanterne (Events)
#   VF 1.0 : camera (Ma chaîne), chopes (Potes), clap (YouTube), gamelle (Chopper), bouteille (GRAND LINE),
#            casque (BOSS LIVE), cloche (Discord)
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


# ---------- la VF 1.0 : les objets des autres parties ----------
def camera(L):
    """Ma chaîne : une caméra de tournage sur son trépied, ses deux bobines, sa lumière rouge."""
    L.ajouter(B.boite(1.5, 0.95, 1.05), "violet", B.mat4((0, 0, 1.55)))
    L.ajouter(B.boite(1.56, 1.0, 0.12), "rose", B.mat4((0, 0, 2.55)))
    L.ajouter(B.cyl(0.36, 0.42, 0.6, 18), "noir", B.mat4((0, -0.48, 2.07), (math.pi / 2, 0, 0)))
    L.ajouter(B.cyl(0.42, 0.42, 0.1, 18), "or", B.mat4((0, -1.05, 2.07), (math.pi / 2, 0, 0)))
    L.ajouter(B.cyl(0.3, 0.3, 0.04, 18), "glace", B.mat4((0, -1.1, 2.07), (math.pi / 2, 0, 0)))
    for x in (-0.4, 0.45):
        L.ajouter(B.cyl(0.5, 0.5, 0.16, 20), "noir", B.mat4((x, 0.1, 3.2), (math.pi / 2, 0, 0)))
        L.ajouter(B.cyl(0.42, 0.42, 0.18, 20), "gris", B.mat4((x, 0.1, 3.2), (math.pi / 2, 0, 0)))
        for k in range(3):
            a = k * 2 * math.pi / 3
            L.ajouter(B.cyl(0.1, 0.1, 0.2, 10), "noir", B.mat4((x + math.cos(a) * 0.22, 0.1, 3.2 + math.sin(a) * 0.22), (math.pi / 2, 0, 0)))
        L.ajouter(B.cyl(0.05, 0.05, 0.6, 6), "fer", B.mat4((x, 0.1, 2.6)))
    L.ajouter(B.sphere(0.13, 12, 8), "rouge", B.mat4((0.55, -0.5, 2.45)))
    L.ajouter(B.cyl(0.24, 0.3, 0.25, 16), "fer", B.mat4((0, 0, 0.92)))
    for k in range(3):
        a = k * 2 * math.pi / 3 + 0.5
        L.ajouter(B.tube([(0, 0, 0.95), (math.cos(a) * 0.5, math.sin(a) * 0.5, 0.45), (math.cos(a) * 0.85, math.sin(a) * 0.85, 0.0)], 0.07, 6), "bois_fonce")
    L.ajouter(B.etoile(0.18, 0.08, 0.05, 5, 0.5), "or", B.mat4((-0.45, -0.49, 1.6), (math.pi / 2, 0, 0)))


def chopes(L):
    """Les potes : deux chopes qui trinquent, la mousse qui déborde, un petit cœur."""
    for s, coul in ((-1, "bois"), (1, "bois_clair")):
        x, rz = s * 0.62, s * -0.22
        M = B.mat4((x, 0, 0), (0, rz, 0))
        L.ajouter(B.cyl(0.55, 0.6, 1.6, 18), coul, M)
        for z in (0.25, 1.3):
            L.ajouter(B.tore(0.6, 0.06, 20, 4), "fer", M @ B.mat4((0, 0, z)))
        L.ajouter(B.tore(0.38, 0.11, 14, 6), coul, M @ B.mat4((-s * 0.68, 0, 0.82), (math.pi / 2, 0, 0)))
        for k in range(6):
            a = k * 2 * math.pi / 6
            L.ajouter(B.sphere(0.27, 10, 8), "creme", M @ B.mat4((math.cos(a) * 0.33, math.sin(a) * 0.33, 1.68)))
        L.ajouter(B.sphere(0.32, 10, 8), "creme", M @ B.mat4((0, 0, 1.82)))
        L.ajouter(B.sphere(0.16, 8, 6), "creme", M @ B.mat4((s * 0.45, -0.3, 1.45), (0, 0, 0), (1, 1, 1.6)))
    L.ajouter(B.etoile(0.32, 0.14, 0.1, 5, 0.5), "rose", B.mat4((0, -0.2, 2.45), (math.pi / 2, 0, 0)))
    for k in range(3):
        a = math.pi / 2 + (k - 1) * 0.6
        L.ajouter(B.cyl(0.04, 0.0, 0.3, 5), "or", B.mat4((math.cos(a) * 0.55, -0.2, 2.1 + math.sin(a) * 0.55), (0, (k - 1) * 0.6, 0)))


def clap(L):
    """YouTube : un clap de tournage (rayé rose et blanc) posé contre une bobine de film."""
    L.ajouter(B.cyl(0.95, 0.95, 0.22, 26), "noir", B.mat4((0.55, 0.45, 1.0), (math.pi / 2 - 0.1, 0, 0.3)))
    for k in range(5):
        a = k * 2 * math.pi / 5
        L.ajouter(B.cyl(0.22, 0.22, 0.24, 12), "gris", B.mat4((0.55 + math.cos(a) * 0.5 * math.cos(0.3), 0.45 + math.cos(a) * 0.5 * math.sin(0.3), 1.0 + math.sin(a) * 0.5), (math.pi / 2 - 0.1, 0, 0.3)))
    L.ajouter(B.cyl(0.14, 0.14, 0.26, 10), "or", B.mat4((0.55, 0.45, 1.0), (math.pi / 2 - 0.1, 0, 0.3)))
    L.ajouter(B.boite(1.7, 0.16, 1.15), "noir", B.mat4((-0.25, -0.2, 0.0), (0, 0.08, 0)))
    for k in range(3):
        L.ajouter(B.boite(1.5, 0.02, 0.06), "blanc", B.mat4((-0.27, -0.29, 0.25 + k * 0.28), (0, 0.08, 0)))
    # la claquette ouverte, rayée
    M = B.mat4((-1.05, -0.2, 1.22), (0, -0.4, 0))
    L.ajouter(B.boite(1.75, 0.16, 0.3), "blanc", M @ B.mat4((0.85, 0, 0)))
    for k in range(4):
        L.ajouter(B.boite(0.2, 0.17, 0.3), "rose", M @ B.mat4((0.22 + k * 0.42, 0, 0), (0, -0.5, 0)))
    M2 = B.mat4((-1.05, -0.2, 1.08), (0, 0.06, 0))
    L.ajouter(B.boite(1.75, 0.16, 0.24), "blanc", M2 @ B.mat4((0.85, 0, 0)))
    for k in range(4):
        L.ajouter(B.boite(0.2, 0.17, 0.24), "violet", M2 @ B.mat4((0.22 + k * 0.42, 0, 0), (0, -0.5, 0)))
    L.ajouter(B.cyl(0.08, 0.08, 0.2, 10), "or", B.mat4((-1.05, -0.2, 1.16), (math.pi / 2, 0, 0)))


def gamelle(L):
    """Chopper : sa gamelle pleine (poissons, baies), une balle à côté."""
    L.ajouter(B.cyl(1.05, 1.25, 0.6, 26), "rose", B.mat4((0, 0, 0)))
    L.ajouter(B.tore(1.05, 0.1, 30, 6), "rose_pale", B.mat4((0, 0, 0.6)))
    L.ajouter(B.cyl(0.95, 0.95, 0.1, 26), "bois_clair", B.mat4((0, 0, 0.5)))
    for k in range(3):
        a = k * 2.1 + 0.3
        p = Vector((math.cos(a) * 0.45, math.sin(a) * 0.45, 0.72))
        L.ajouter(B.sphere(0.3, 12, 8), "turquoise", B.mat4(p, (0.4, 0.2, a), (1.4, 0.55, 0.5)))
        L.ajouter(B.cyl(0.2, 0.0, 0.25, 4), "turquoise", B.mat4(p + Vector((math.cos(a) * -0.45, math.sin(a) * -0.45, 0)), (0, math.pi / 2, a + math.pi), (1, 0.3, 1)))
        L.ajouter(B.sphere(0.05, 6, 4), "noir", B.mat4(p + Vector((math.cos(a) * 0.32, math.sin(a) * 0.32, 0.06))))
    for k in range(7):
        a = k * 0.9
        L.ajouter(B.sphere(0.12, 8, 6), "rouge" if k % 2 else "violet", B.mat4((math.cos(a) * 0.7, math.sin(a) * 0.7, 0.66)))
    L.ajouter(B.etoile(0.22, 0.1, 0.06, 5, 0.4), "or", B.mat4((0, -1.18, 0.32), (math.pi / 2 + 0.2, 0, 0)))
    L.ajouter(B.sphere(0.3, 16, 10), "jaune", B.mat4((1.3, -0.75, 0.3)))
    L.ajouter(B.tore(0.3, 0.045, 20, 4), "rose", B.mat4((1.3, -0.75, 0.3), (0.5, 0.4, 0)))
    L.ajouter(B.tore(0.3, 0.045, 20, 4), "rose", B.mat4((1.3, -0.75, 0.3), (-0.5, 0.9, 0)))


def bouteille(L):
    """GRAND LINE : un navire dans une bouteille, sur son socle de bois."""
    L.ajouter(B.boite(2.7, 1.0, 0.25), "bois_fonce", B.mat4((0, 0, 0)))
    for x in (-0.8, 0.8):
        L.ajouter(B.boite(0.25, 0.9, 0.45), "bois", B.mat4((x, 0, 0.25)))
    L.ajouter(B.boite(0.9, 0.05, 0.18), "or", B.mat4((0, -0.52, 0.1)))
    # le navire (en petit) dans la bouteille
    L.ajouter(B.demi_sphere(1.0, 16, 4, bas=False), "bois", B.mat4((0.0, 0, 0.95), (math.pi, 0, 0), (0.85, 0.3, 0.32)))
    L.ajouter(B.boite(1.6, 0.5, 0.06), "bois_clair", B.mat4((0, 0, 0.95)))
    for x, h in ((-0.35, 0.95), (0.25, 1.15)):
        L.ajouter(B.cyl(0.03, 0.03, h, 6), "bois_fonce", B.mat4((x, 0, 0.95)))
        L.ajouter(B.boite(0.05, 0.6, h * 0.55), "creme", B.mat4((x + 0.05, 0, 1.15)))
        L.ajouter(B.boite(0.055, 0.6, h * 0.12), "rose", B.mat4((x + 0.05, 0, 1.15 + h * 0.3)))
    L.ajouter(B.boite(0.02, 0.22, 0.14), "violet", B.mat4((0.25, 0.1, 2.05)))
    L.ajouter(B.demi_sphere(0.8, 18, 4), "eau", B.mat4((0, 0, 0.9), (0, 0, 0), (1.6, 0.48, 0.12)))
    # le verre, le goulot, le bouchon, la ficelle
    prof = [(-1.25, 0.05), (-1.22, 0.55), (-1.0, 0.72), (0.9, 0.72), (1.05, 0.5), (1.25, 0.26), (1.65, 0.24), (1.7, 0.28)]
    L.ajouter(B.tube([(x, 0, 1.25) for x, _ in prof], [r for _, r in prof], 22), "verre")
    L.ajouter(B.cyl(0.22, 0.2, 0.35, 12), "bois_clair", B.mat4((1.75, 0, 1.25), (0, math.pi / 2, 0)))
    L.ajouter(B.tore(0.26, 0.03, 14, 4), "rouge", B.mat4((1.5, 0, 1.25), (0, math.pi / 2, 0)))


def casque(L):
    """BOSS LIVE : le casque à cornes du boss, visière qui luit, gemme rouge."""
    L.ajouter(B.demi_sphere(1.1, 22, 8), "violet_fonce", B.mat4((0, 0, 0.5), (0, 0, 0), (1, 1.05, 1.2)))
    L.ajouter(B.cyl(1.12, 1.18, 0.5, 22), "violet_fonce", B.mat4((0, 0, 0.0)))
    L.ajouter(B.tore(1.16, 0.1, 30, 5), "or", B.mat4((0, 0, 0.05)))
    L.ajouter(B.tore(1.13, 0.08, 30, 5), "or", B.mat4((0, 0, 0.5)))
    L.ajouter(B.boite(1.3, 0.2, 0.18), "noir", B.mat4((0, -1.0, 0.75), (0.2, 0, 0)))
    L.ajouter(B.boite(1.1, 0.21, 0.07), "feu", B.mat4((0, -1.04, 0.77), (0.2, 0, 0)))
    L.ajouter(B.boite(0.22, 0.25, 0.9), "or", B.mat4((0, -1.02, 0.2)))
    L.ajouter(B.ico(0.2, 1), "rouge", B.mat4((0, -1.1, 1.25)))
    L.ajouter(B.cyl(0.12, 0.0, 0.5, 10), "or", B.mat4((0, 0, 1.75)))
    for s in (-1, 1):
        pts = [(s * 0.85, 0, 0.9), (s * 1.6, -0.1, 1.3), (s * 1.9, -0.2, 2.1), (s * 1.75, -0.3, 2.7)]
        L.ajouter(B.tube(pts, [0.3, 0.24, 0.14, 0.02], 12), "creme")
        for k in range(3):
            L.ajouter(B.tore(0.27 - k * 0.04, 0.03, 14, 3), "or", B.mat4(Vector(pts[0]) * 0.6 + Vector(pts[1]) * 0.4 + Vector((s * 0.12 * k, 0, 0.12 * k)), (0, s * 0.9, 0)))
    for k in range(5):
        a = math.pi * 1.25 + k * 0.25
        L.ajouter(B.sphere(0.07, 6, 4), "or", B.mat4((math.cos(a) * 1.17, math.sin(a) * 1.17, 0.27)))


def cloche(L):
    """Discord : la cloche du navire qui appelle tout le monde (集合), sa potence et sa corde."""
    L.ajouter(B.boite(0.25, 0.25, 2.7), "bois_fonce", B.mat4((-1.0, 0, 0)))
    L.ajouter(B.boite(1.6, 0.22, 0.22), "bois", B.mat4((-0.3, 0, 2.6)))
    L.ajouter(B.boite(1.2, 1.0, 0.18), "bois", B.mat4((-0.8, 0, 0)))
    L.ajouter(B.tube([(-0.95, 0, 1.9), (-0.55, 0, 2.55)], 0.06, 6), "bois_fonce")
    prof = [(0.0, 0.18), (0.2, 0.32), (0.55, 0.42), (0.9, 0.5), (1.15, 0.68), (1.22, 0.72)]
    L.ajouter(B.tube([(0.2, 0, 2.55 - z) for z, _ in prof], [r for _, r in prof], 22), "or")
    L.ajouter(B.tore(0.7, 0.06, 26, 5), "laiton" if "laiton" in B.PALETTE else "or", B.mat4((0.2, 0, 1.4)))
    L.ajouter(B.tore(0.1, 0.03, 10, 4), "fer", B.mat4((0.2, 0, 2.62), (math.pi / 2, 0, 0)))
    L.ajouter(B.sphere(0.15, 10, 8), "fer", B.mat4((0.2, 0, 1.2)))
    L.ajouter(B.tube([(0.2, 0, 1.2), (0.25, 0, 0.75), (0.35, 0, 0.4)], 0.035, 5), "corde")
    L.ajouter(B.tore(0.07, 0.03, 10, 4), "rose", B.mat4((0.35, 0, 0.35), (math.pi / 2, 0, 0)))
    L.ajouter(B.etoile(0.16, 0.07, 0.04, 5, 0.4), "rose", B.mat4((0.2, -0.62, 1.75), (math.pi / 2, 0, 0)))
    for k in range(3):
        a = 0.3 + k * 0.45
        L.ajouter(B.tube(B.courbe((0.2 + math.cos(a) * 1.0, -0.1, 2.0 - k * 0.3), (0.2 + math.cos(a) * 1.5, -0.1, 2.2 - k * 0.45), (0.2 + math.cos(a) * 1.3, -0.1, 2.25 - k * 0.3), 5), 0.035, 4), "jaune")


OBJETS = {"coffre": coffre, "borne": borne, "trophee": trophee, "panneau": panneau, "epees": epees, "lanterne": lanterne,
          "camera": camera, "chopes": chopes, "clap": clap, "gamelle": gamelle, "bouteille": bouteille, "casque": casque, "cloche": cloche}


def tout(taille=(560, 560), noms=None):
    faits = {}
    for nom, f in OBJETS.items():
        if noms and nom not in noms:
            continue
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
