# Le Jardin de Cristal, « niveau 5 » : un jardin de cristaux géants, tenu comme un jardin à la française.
# (Son histoire, dans le bot : « Des cristaux plus grands que le mât, qui brillent dès que la nuit tombe. »)
# L'idée : un jardin tenu, tout en symétrie. Une île de roche lilas et de pelouses menthe, en trois terrasses rondes : la
# pelouse basse, la terrasse des plates-bandes, et le piton où pousse la Grande Aiguille, une gerbe de prismes à six pans
# plus haute qu'un mât. Une allée de dalles monte tout droit du débarcadère : l'arche de cristal, le bassin miroir, deux
# volées de marches. Des bouquets de cristaux violets, roses, turquoise tout autour, et des plates-bandes de petits
# cristaux alignés comme des légumes. Les jardiniers vont et viennent. Tout est inventé.
# La nuit : des cœurs bleus cachés dans les grands cristaux font venir les lumières du site sur eux (ils sortent de l'ombre
# avec leurs vraies couleurs), les bornes à cristal bleu éclairent les dalles, les vitres de la serre s'allument.
import math, random
import numpy as np
import barhaw_niveau5 as N
import barhaw_verif as Vf
import barhaw_ile_v5 as K
import barhaw_port_v5 as P
import barhaw_arbre_v5 as A
import barhaw_givre_v5 as Gv
import barhaw_recif_v5 as Rf

PI = math.pi
T, Rz, Rx, Ry = N.T, N.Rz, N.Rx, N.Ry

R_SOL = 10.0
PITON = (0.0, 1.3)  # le piton de la Grande Aiguille, dans l'axe du débarcadère
R2, R3 = 3.7, 1.75  # le rayon de la terrasse des plates-bandes, celui du piton
Z1, Z2, Z3 = 0.42, 0.98, 1.6  # la pelouse basse, la terrasse, le piton
DEMI_ALLEE = 0.42  # la demi-largeur de l'allée (les marches y remplacent le talus)
BASSIN, R_BASSIN = (0.0, -4.3), 0.7  # le bassin miroir, que l'allée contourne
PISTES = []  # les trajets (remplis par mailles()), pour peindre les dalles

def tx_gemme(c=0xdcc0ff, fond=0x8a5fd0, graine=1):
    """Une gemme : la couleur profonde au cœur, plus claire par endroits, de fines stries dans la longueur, quelques
    fractures blanches (des fils, pas des nuages), des points qui scintillent."""
    n = N.TAILLE
    b1 = N.bruit(n, 3, 3, graine, 3)
    stries = N.bruit(n, 40, 3, graine + 1, 2)
    fin = N.bruit(n, 128, 128, graine + 2, 1)
    coul = N.mel(np.broadcast_to(N.hexa(fond), (n, n, 3)).copy(), np.broadcast_to(N.hexa(c), (n, n, 3)), np.clip(0.2 + 0.6 * b1 + 0.35 * (stries - 0.5), 0, 1))
    fil = N.lisse(0.009, 0.0, np.abs(N.bruit(n, 4, 4, graine + 3, 2) - 0.5)) * 0.22
    coul = N.mel(coul, np.array([0.97, 0.97, 1.0], np.float32), fil)
    coul = N.mel(coul, np.array([1.0, 1.0, 1.0], np.float32), N.lisse(0.9, 0.96, fin) * 0.5)
    return np.clip(coul, 0, 1).astype(np.float32), np.clip(0.5 + 0.12 * (stries - 0.5) - 0.2 * fil, 0, 1).astype(np.float32)


N.matiere("cristal_violet", tx_gemme, 1.3, 0.25, rugueux=0.1, lueur=0.45, c=0xe2caff, fond=0x8656d6, graine=701)
N.matiere("cristal_rose", tx_gemme, 1.3, 0.25, rugueux=0.1, lueur=0.45, c=0xffd3ea, fond=0xdc68ae, graine=702)
N.matiere("cristal_turquoise", tx_gemme, 1.3, 0.25, rugueux=0.1, lueur=0.45, c=0xc6f7f2, fond=0x35b3b9, graine=703)
N.matiere("cristal_blanc", tx_gemme, 1.3, 0.25, rugueux=0.08, lueur=0.4, c=0xfafaff, fond=0xb4c0ee, graine=704)
CRISTAUX = ("cristal_violet", "cristal_rose", "cristal_turquoise", "cristal_blanc")
N.matiere("pierres_lilas", N.tx_pierres, 0.8, 1.0, c=0xb9aad8, rangs=6, graine=705, mortier=0x7d6fa6, mousse=0.15)
N.matiere("bois_blanc", N.tx_planches, 1.0, 0.6, c=0xeeeaf4, nb=5, graine=706, usure=0.3)
N.matiere("verre_serre", N.tx_uni, 0.8, 0.1, rugueux=0.08, c=0xcdeef0, graine=707, grain=0.04, taches=0.2, c2=0xeaf8f8, seuil=0.55)
N.matiere("roche_geode", N.tx_uni, 0.9, 0.9, c=0x6b5f88, graine=708, grain=0.3, taches=0.5, c2=0x4d4468, seuil=0.5)
N.matiere("buis", N.tx_feuillage, 0.5, 0.8, c=0x3f8f66, graine=709, g=14)
N.matiere("eau_miroir", N.tx_uni, 1.0, 0.05, rugueux=0.05, c=0x7fc9de, graine=710, grain=0.03, taches=0.2, c2=0xb9ecf2, seuil=0.55)


def rivage(th):
    """Le rayon de la côte dans cette direction."""
    return 7.3 + 0.5 * math.sin(2 * th + 0.3) + 0.3 * math.sin(3 * th + 1.9) + 0.2 * math.sin(5 * th + 0.7)


_COTE = np.array([(math.cos(a) * rivage(a), math.sin(a) * rivage(a)) for a in np.linspace(-PI, PI, 720, endpoint=False)])


def bord(x, y):
    """La vraie distance au bord de la mer ; > 0 : à terre."""
    d = float(np.sqrt(((_COTE - (x, y)) ** 2).sum(axis=1).min()))
    return d if math.hypot(x, y) < rivage(math.atan2(y, x)) else -d


def vers(angle, dedans):
    """Un point dans cette direction (degrés, 90 = le nord), à cette distance du bord de la mer (vers l'intérieur)."""
    a = math.radians(angle)
    r = rivage(a) - dedans
    return math.cos(a) * r, math.sin(a) * r


def r_terrasse(a):
    return R2 * (1 + 0.05 * math.sin(4 * a + 0.6))


def r_piton(a):
    return R3 * (1 + 0.06 * math.sin(3 * a + 2.0))


def terrain(x, y):
    """La hauteur du sol : la plage, la pelouse basse, le talus de la terrasse, celui du piton. Dans l'axe de l'allée, les
    talus s'allongent en rampes (les marches sont posées dessus)."""
    d = bord(x, y)
    if d < 0:
        return max(-1.5, 0.45 * d)
    h = Z1 * K.lisse(0.0, 0.9, d)
    dx, dy = x - PITON[0], y - PITON[1]
    rr, a = math.hypot(dx, dy), math.atan2(dy, dx)
    doux = K.lisse(DEMI_ALLEE + 0.25, DEMI_ALLEE, abs(dx)) if dy < 0 else 0.0  # 1 dans l'allée, au sud du piton
    l2, l3 = 0.1 + 0.45 * doux, 0.12 + 0.4 * doux
    h += (Z2 - Z1) * K.lisse(r_terrasse(a) + l2, r_terrasse(a) - l2, rr)
    h += (Z3 - Z2) * K.lisse(r_piton(a) + l3, r_piton(a) - l3, rr)
    if h > 0.2:
        h += (K.bruit2(x * 0.9, y * 0.9, 5) - 0.5) * 0.04 * (1 - doux)
    return h


sol = terrain


def tx_sol_cristal(taille=2048, graine=711):
    """Le sol peint : le sable lilas pâle de la plage, la pelouse menthe (tondue : des bandes à peine visibles), la roche
    lilas des talus, les dalles claires de l'allée et leurs joints, des éclats de cristal semés dans l'herbe."""
    n = taille
    h = K.agrandir(K.champ(terrain, R_SOL, 240), n)
    gy, gx = np.gradient(h)
    pente = np.hypot(gx, gy) * n / (2 * R_SOL)  # la pente (hauteur par unité de sol)
    piste = K.agrandir(K.champ(lambda x, y: min((K.distance_au_trajet(x, y, p) for p in PISTES), default=9.0), R_SOL, 240), n)
    b1, b2, b3, fin = N.bruit(n, 7, 7, graine, 4), N.bruit(n, 30, 30, graine + 1, 3), N.bruit(n, 96, 96, graine + 2, 2), N.bruit(n, 256, 256, graine + 3, 1)
    grain = N.bruit(n, 640, 640, graine + 4, 1)
    sable = N.mel(N.hexa(0xe4daee), N.hexa(0xf3ecf8), np.clip(0.2 + 0.7 * b2, 0, 1)) * (0.94 + 0.12 * (grain - 0.5))[..., None]
    herbe = N.mel(N.hexa(0x7cc4a0), N.hexa(0xa6dcae), np.clip(0.15 + 0.7 * b2 + 0.3 * (b1 - 0.5), 0, 1)) * (0.9 + 0.2 * (fin - 0.5) + 0.14 * (grain - 0.5))[..., None]
    yy = np.linspace(0, 1, n, endpoint=False)[:, None] * np.ones((1, n))
    herbe *= (1.0 + 0.035 * np.sign(np.sin(yy * 2 * R_SOL * PI / 0.45)))[..., None]  # les bandes de la tonte
    coul = N.mel(sable, herbe, N.lisse(0.26, 0.36, h + (b3 - 0.5) * 0.06))
    roche = N.mel(N.hexa(0x9a86c6), N.hexa(0xc0b0e0), np.clip(0.2 + 0.7 * b3 + 0.3 * (b2 - 0.5), 0, 1)) * (0.88 + 0.24 * (fin - 0.5))[..., None]
    coul = N.mel(coul, roche, N.lisse(0.55, 1.1, pente + (b3 - 0.5) * 0.3) * N.lisse(0.3, 0.42, h))
    # les dalles : des rangées décalées (comme un mur de briques vu de dessus), un joint sombre entre elles.
    # SURTOUT PAS N.cellules(n, 110, …) ici : il parcourt toute l'image pour chaque cellule (12 100 fois 4 millions de
    # points : un quart d'heure dans Blender, vu le 18/11).
    gx_, gy_ = N.grille(n)
    v_ = gy_ * 2 * R_SOL / 0.24
    u_ = gx_ * 2 * R_SOL / 0.36 + 0.5 * (np.floor(v_) % 2)
    d = np.minimum(1 - 2 * np.abs((u_ % 1) - 0.5), 1 - 2 * np.abs((v_ % 1) - 0.5)).astype(np.float32)  # 0 sur un joint
    ident = (np.floor(u_) * 7 + np.floor(v_) * 13).astype(np.int64)
    dalle = N.mel(N.hexa(0xd9d2e6), N.hexa(0xf0ebf6), ((ident % 7) / 6.0).astype(np.float32)) * (0.95 + 0.1 * (grain - 0.5))[..., None]
    dalle = N.mel(dalle, N.hexa(0x8f86a6), N.lisse(0.1, 0.0, d)[..., None] * 0.8)
    coul = N.mel(coul, dalle, N.lisse(0.36, 0.3, piste) * N.lisse(0.28, 0.36, h))
    eclats = N.lisse(0.95, 0.975, N.bruit(n, 230, 230, graine + 7, 1)) * N.lisse(0.3, 0.4, h) * N.lisse(0.4, 0.6, piste)
    coul = N.mel(coul, N.hexa(0xf6ecff), eclats * 0.6)
    relief = np.clip(0.5 + 0.2 * (b3 - 0.5) + 0.15 * (fin - 0.5) - 0.25 * N.lisse(0.1, 0.0, d) * N.lisse(0.36, 0.3, piste), 0, 1)
    return np.clip(coul, 0, 1).astype(np.float32), relief.astype(np.float32)


N.matiere("sol_cristal", tx_sol_cristal, 2 * R_SOL, 0.5, 0.85)


# --- les pièces ---
def cristal_m(L, U, M, h, r, mat, nuit=True, pied=0.1):
    """Un prisme à six pans et sa pointe, dans le repère M (son axe : z ; `pied` : ce qui s'enfonce sous l'origine). Ses
    facettes restent nettes. nuit : des cœurs bleus (« astre ») sont cachés dedans, tout le long. On ne les voit pas, mais
    le site compte les sommets brillants pour poser ses lumières de la nuit (eclairerIle, js/grandline-fete.js) : plus un
    cristal est grand, plus il a de cœurs, et la lumière bleue le sort de l'ombre avec ses vraies couleurs."""
    L.ajouter(*N.cylindre(r, r * 0.86, h * 0.8 + pied, 6, haut=False, bas=False), mat, M @ T(0, 0, -pied))
    L.ajouter(*N.cylindre(r * 0.86, 0.0, h * 0.2, 6, bas=False), mat, M @ T(0, 0, h * 0.8))
    if nuit:
        grand = h >= 3.0  # les géants de la Grande Aiguille : davantage de cœurs, plus fins (ils gardent leur lumière au téléphone)
        nb = max(1, int(round(h / (0.4 if grand else 0.75))))
        for j in range(nb):
            Mj = M @ T(0, 0, h * (0.2 + 0.6 * (j + 0.5) / nb))
            U.ajouter(*N.cylindre(r * 0.3, 0.0, r * 0.9, 8 if grand else 4, haut=False), "astre", Mj)
            U.ajouter(*N.cylindre(r * 0.3, 0.0, r * 0.5, 8 if grand else 4, haut=False), "astre", Mj @ Rx(PI))


def cristal(L, U, x, y, z, h, r, mat, cap=0.0, penche=0.0, nuit=True):
    """Un cristal planté dans le sol, penché de `penche` vers `cap`."""
    cristal_m(L, U, T(x, y, z) @ Rz(cap) @ Ry(penche), h, r, mat, nuit)


def boule_buis(L, x, y, z, r=0.16):
    """Un buis taillé en boule sur son petit tronc (le jardin est tenu)."""
    L.ajouter(*N.cylindre(0.028, 0.024, r * 0.9 + 0.05, 5, haut=False), "ecorce_branche", T(x, y, z - 0.05))
    L.ajouter(*N.sphere(r, 9, 6, 0.95), "buis", T(x, y, z + r * 1.6), doux=True)


def borne(L, U, x, y, z):
    """Une borne de pierre au bord d'une allée : un petit cristal bleu luit dessus (la nuit, il éclaire les dalles)."""
    L.ajouter(*N.boite(0.11, 0.11, 0.34), "pierres_lilas", T(x, y, z - 0.06))
    L.ajouter(*N.boite(0.16, 0.16, 0.03), "pierres_lilas", T(x, y, z + 0.28))
    Gv.cristal(U, x, y, z + 0.4, 0.3)


def serre(L, V, x, y, z, cap, lx=1.5, ly=1.0, hm=0.6, ht=0.4):
    """La serre : un soubassement de pierre, une charpente de bois blanc, des murs et un toit de verre, une porte. La nuit,
    ses vitres s'allument."""
    M = T(x, y, z) @ Rz(cap)
    L.ajouter(*N.boite(lx + 0.08, ly + 0.08, 0.14), "pierres_lilas", M @ T(0, 0, -0.04))
    for sx in (-lx / 2, 0.0, lx / 2):
        for sy in (-ly / 2, ly / 2):
            L.ajouter(*N.boite(0.045, 0.045, hm), "bois_blanc", M @ T(sx, sy, 0.1))
    for sy in (-ly / 2, ly / 2):
        L.ajouter(*N.boite(lx + 0.05, 0.045, 0.04), "bois_blanc", M @ T(0, sy, 0.1 + hm))
        L.ajouter(*N.boite(lx - 0.04, 0.012, hm - 0.02), "verre_serre", M @ T(0, sy, 0.1))
        V.ajouter(*N.boite(lx - 0.12, 0.004, hm - 0.1), "vitre", M @ T(0, sy * 1.03, 0.14))
    L.ajouter(*N.boite(lx + 0.05, 0.045, 0.04), "bois_blanc", M @ T(0, 0, 0.1 + hm + ht))
    for sx in (-lx / 2, lx / 2):
        L.ajouter(*N.boite(0.012, ly - 0.04, hm - 0.02), "verre_serre", M @ T(sx, 0, 0.1))
        L.ajouter([(sx, -ly / 2, 0.1 + hm), (sx, ly / 2, 0.1 + hm), (sx, 0.0, 0.1 + hm + ht)], [(0, 1, 2), (2, 1, 0)], "verre_serre", M)
    pente, lp = math.atan2(ht, ly / 2), math.hypot(ht, ly / 2)
    for s_ in (-1, 1):
        Mp = M @ T(0, s_ * ly / 4, 0.1 + hm + ht / 2 + 0.02) @ Rx(-s_ * pente)
        L.ajouter(*N.boite(lx, lp, 0.012), "verre_serre", Mp @ T(0, 0, -0.006))
        V.ajouter(*N.boite(lx - 0.1, lp - 0.1, 0.004), "vitre", Mp @ T(0, 0, 0.01))
        for sx in (-lx / 2, -lx / 4, 0.0, lx / 4, lx / 2):
            L.ajouter(*N.boite(0.035, lp + 0.04, 0.03), "bois_blanc", Mp @ T(sx, 0, 0.0))
    L.ajouter(*N.boite(0.3, 0.03, hm - 0.06), "bois_blanc", M @ T(lx / 4, -ly / 2 - 0.012, 0.1))  # la porte
    L.ajouter(*N.sphere(0.02, 5, 4), "or", M @ T(lx / 4 + 0.1, -ly / 2 - 0.035, 0.1 + hm * 0.45))
    return Vf.rectangle(x, y, lx + 0.16, ly + 0.16, cap)


def geode(L, U, x, y, z, cap, r=0.75, bascule=0.9):
    """Une moitié de géode, debout : une coque de roche sombre ouverte vers `cap` (penchée de `bascule` depuis la verticale),
    le bord poli en un anneau clair, tapissée de cristaux violets qui pointent vers son cœur."""
    M = T(x, y, z + r * 0.9) @ Rz(cap) @ Ry(bascule)
    v, f = N.sphere(r, 12, 8, 1.0)
    coque = [face for face in f if all(v[i][2] <= r * 0.02 for i in face)]
    L.ajouter(v, coque, "roche_geode", M)
    L.ajouter([(a * 0.86, b * 0.86, c * 0.86) for a, b, c in v], [tuple(reversed(face)) for face in coque], "cristal_violet", M)
    n = 16
    anneau = [(math.cos(k * 2 * PI / n) * r, math.sin(k * 2 * PI / n) * r, 0.0) for k in range(n)] + [(math.cos(k * 2 * PI / n) * r * 0.86, math.sin(k * 2 * PI / n) * r * 0.86, 0.0) for k in range(n)]
    L.ajouter(anneau, [(k, (k + 1) % n, n + (k + 1) % n, n + k) for k in range(n)], "cristal_blanc", M)
    for k in range(12):
        th, ph = 0.3 + 1.0 * ((k * 7) % 5) / 4, k * 2.4
        d = (-math.sin(th) * math.cos(ph), -math.sin(th) * math.sin(ph), -math.cos(th))  # un point du dedans de la coque
        cristal_m(L, U, M @ T(*(c * r * 0.84 for c in d)) @ Rz(ph) @ Ry(th), 0.2 + 0.14 * (k % 3), 0.045 + 0.014 * (k % 2), ("cristal_violet", "cristal_rose", "cristal_violet", "cristal_blanc")[k % 4], k % 3 == 0, 0.02)
    return Vf.rond(x, y, r * 0.85, 10)


def atelier(L, U, lots, rng, x, y, z, cap):
    """L'atelier du polisseur : un auvent de toile sur quatre poteaux, l'établi et ses cristaux, la meule sur son chevalet
    (elle tourne), le polisseur."""
    M = T(x, y, z) @ Rz(cap)
    for sx in (-0.6, 0.6):
        for sy, hh in ((-0.45, 0.66), (0.45, 0.84)):
            L.ajouter(*N.cylindre(0.03, 0.026, hh + 0.1, 5, haut=False), "planches_sombres", M @ T(sx, sy, -0.1))
    toile = [(-0.7, -0.55, 0.64), (0.7, -0.55, 0.64), (0.7, 0.55, 0.86), (-0.7, 0.55, 0.86)]
    L.ajouter(toile, [(0, 1, 2, 3), (3, 2, 1, 0)], "toile_ecrue", M)
    L.ajouter(*N.boite(0.74, 0.26, 0.04), "planches", M @ T(0.0, 0.24, 0.26))  # l'établi
    for sx in (-0.33, 0.33):
        for sy in (0.14, 0.34):
            L.ajouter(*N.boite(0.04, 0.04, 0.26), "planches_sombres", M @ T(sx, sy, 0.0))
    for k in range(5):
        cristal_m(L, U, M @ T(-0.27 + 0.135 * k, 0.24 + 0.03 * (k % 2), 0.3), 0.1 + 0.05 * (k % 3), 0.024, CRISTAUX[k % 4], False, 0.0)
    for sx in (-0.11, 0.11):  # le chevalet de la meule
        L.ajouter(*N.poutre((sx, -0.36, 0.0), (sx, -0.22, 0.33), 0.028), "planches_sombres", M)
        L.ajouter(*N.poutre((sx, -0.08, 0.0), (sx, -0.22, 0.33), 0.028), "planches_sombres", M)
    L.ajouter(*N.poutre((-0.15, -0.22, 0.33), (0.15, -0.22, 0.33), 0.022), "fer", M)
    G = N.Maille("meule")
    G.ajouter(*N.cylindre(0.2, 0.2, 0.07, 14), "pierres_claires", Rz(cap) @ Ry(PI / 2) @ T(0, 0, -0.035))
    o = (M @ np.array((0.0, -0.22, 0.33, 1.0)))[:3]
    lots["animes"].append((G, tuple(float(c) for c in o), {"anim": "tourne", "axe": [math.cos(cap), math.sin(cap), 0.0], "vitesse": 0.9}))
    q = (M @ np.array((0.42, -0.2, 0.0, 1.0)))[:3]
    P.passant(L, rng, float(q[0]), float(q[1]), angle=cap + PI, z=float(q[2]))
    return Vf.rectangle(x, y, 1.5, 1.25, cap)


def bouquet(L, U, rng, x, y, z, h, r, mats, nb=6, nuit=True, ouvert=1.0):
    """Un bouquet de cristaux : un grand, droit, et les autres penchés tout autour, de plus en plus petits.
    ouvert : moins de 1, les cristaux du tour se tiennent plus droits (près d'une allée, pour ne pas barrer le passage)."""
    cristal(L, U, x, y, z, h, r, mats[0], rng.random() * 6.28, 0.04, nuit)
    for k in range(1, nb):
        a = k * 2 * PI / (nb - 1) + rng.random() * 0.5
        hh, rr = h * (0.34 + 0.34 * rng.random()), r * (0.42 + 0.26 * rng.random())
        cristal(L, U, x + math.cos(a) * r * 0.75, y + math.sin(a) * r * 0.75, z, hh, rr, mats[k % len(mats)], a, (0.3 + 0.35 * rng.random()) * ouvert, nuit and k % 2 == 1)


def marches(L, x, y0, y1, larg, nb=6):
    """Une volée de marches de pierre le long de l'allée (vers le nord) : des blocs pleins, chacun de son nez jusqu'en haut
    de la volée ; le dessus de chaque marche affleure la rampe du terrain en son milieu (un marcheur ne bute pas dessus)."""
    pied = terrain(x, y0) - 0.25
    dy = (y1 - y0) / nb
    for k in range(nb):
        nez = y0 + k * dy
        dessus = terrain(x, nez + dy / 2) + 0.025
        L.ajouter(*N.boite(larg, y1 + 0.03 - nez, dessus - pied), "pierres_lilas", T(x, (nez + y1 + 0.03) / 2, pied))


def muret(L, rayon, z_bas, z_haut, pas=6):
    """Le mur qui tient une terrasse : par-dehors un talus de pierre en pente (il couvre le bord en escalier du terrain),
    dessus un parapet bas, le tout ouvert dans l'axe de l'allée (là où passent les marches), avec un pilier et sa boule de
    cristal de chaque côté."""
    ouverture = math.degrees(math.asin(min(0.99, (DEMI_ALLEE + 0.06) / rayon(-PI / 2))))
    angles = [math.radians(g) for g in range(-90 + pas, 270, pas) if abs(g + 90) > ouverture and abs(g - 270) > ouverture]
    angles = [math.radians(-90 + ouverture)] + angles + [math.radians(270 - ouverture)]

    def pt(a, plus):
        return PITON[0] + math.cos(a) * (rayon(a) + plus), PITON[1] + math.sin(a) * (rayon(a) + plus)

    for a1, a2 in zip(angles[:-1], angles[1:]):
        h1, b1, b2, h2 = (*pt(a1, 0.06), z_haut + 0.02), (*pt(a1, 0.46), z_bas - 0.05), (*pt(a2, 0.46), z_bas - 0.05), (*pt(a2, 0.06), z_haut + 0.02)
        L.ajouter([h1, b1, b2, h2], [(0, 1, 2, 3)], "pierres_lilas")  # le talus de pierre
        (ax, ay), (bx, by) = pt(a1, 0.0), pt(a2, 0.0)
        lg, cap = math.hypot(bx - ax, by - ay), math.atan2(by - ay, bx - ax)
        L.ajouter(*N.boite(lg + 0.04, 0.14, 0.2), "pierres_lilas", T((ax + bx) / 2, (ay + by) / 2, z_haut - 0.06) @ Rz(cap), tourne=True)  # le parapet
    for a in (angles[0], angles[-1]):  # de chaque côté des marches : la joue du talus, le pilier, sa boule de cristal
        h, b, c = (*pt(a, 0.06), z_haut + 0.02), (*pt(a, 0.46), z_bas - 0.05), (*pt(a, 0.06), z_bas - 0.05)
        L.ajouter([h, b, c], [(0, 1, 2), (2, 1, 0)], "pierres_lilas")
        q = pt(a, 0.0)
        L.ajouter(*N.boite(0.2, 0.2, z_haut - z_bas + 0.5), "pierres_lilas", T(q[0], q[1], z_bas - 0.22))
        L.ajouter(*N.sphere(0.085, 8, 6), "cristal_blanc", T(q[0], q[1], z_haut + 0.34))


def mailles(graine=523, leger=False):
    """leger : la version téléphone (pas encore réglée : ce premier jet ne fait qu'alléger le relief)."""
    N.DETAIL = 0.6 if leger else 1.0
    try:
        return _mailles(graine, leger)
    finally:
        N.DETAIL = 1.0


def _mailles(graine, leger):
    rng = random.Random(graine)
    L, V, U = N.Maille("ile_corps"), N.Maille("ile_vitres"), N.Maille("ile_lumieres")
    lots = {"corps": L, "vitres": V, "lumieres": U, "bannieres": [], "animes": [], "copies": [], "libres": [], "reperes": []}
    SOL, emprises, ponts = [], [], []
    lots["etapes"] = []
    etape = lambda nom: lots["etapes"].append((nom, L.triangles()))

    # --- le plan : l'allée (le débarcadère, l'arche, le tour du bassin, les deux volées de marches), les trajets ---
    quai_mer, quai_terre = vers(-90, -1.6), vers(-90, 0.75)
    y_t, y_p = PITON[1] - r_terrasse(-PI / 2), PITON[1] - r_piton(-PI / 2)  # là où l'allée coupe les deux talus
    tour_bassin = lambda cote: [(BASSIN[0] + cote * math.cos(a) * (R_BASSIN + 0.45), BASSIN[1] + math.sin(a) * (R_BASSIN + 0.45)) for a in (-PI / 2, -PI / 4, 0.0, PI / 4, PI / 2)]
    allee_est = [quai_terre, (0.0, quai_terre[1] + 0.55)] + tour_bassin(1) + [(0.0, y_t - 0.52), (0.0, y_t + 0.8), (0.0, y_p - 0.75), (0.0, y_p + 0.62)]
    allee_ouest = [(0.0, quai_terre[1] + 0.55)] + tour_bassin(-1) + [(0.0, y_t - 0.52)]
    ronde = [(PITON[0] + math.cos(a) * (R2 - 0.9), PITON[1] + math.sin(a) * (R2 - 0.9)) for a in np.arange(-PI / 2, 3 * PI / 2 - 0.01, PI / 10)]  # le tour de la terrasse
    chemins = [  # (points au sol, en rond, vitesse, départ, pause)
        (K.suivre([quai_mer] + allee_est, sol, 0.22), False, 0.16, 0.0, 4.0),
        (K.suivre(ronde + ronde[:1], sol, 0.25)[:-1], True, 0.14, 0.4, 0),
        (K.suivre(allee_ouest[::-1] + [quai_terre], sol, 0.22), False, 0.15, 0.6, 3.0),
    ]
    for pts, *_ in chemins:  # sur le débarcadère, on marche sur les planches
        for k, q in enumerate(pts):
            if bord(q[0], q[1]) < 0.75 and abs(q[0]) < 0.3:
                pts[k] = (q[0], q[1], Z1 + 0.02)
    PISTES[:] = [[(x, y, 0.0) for x, y in pts] for pts in (allee_est, allee_ouest, ronde + ronde[:1])]  # peu de points : la texture du sol mesure sa distance à chacun
    couloirs = [(pts, 0.12) for pts in PISTES]
    loin_des_allees = lambda x, y, r: all(K.distance_au_trajet(x, y, pts) > r + rc + 0.05 for pts, rc in couloirs)

    def libre(x, y, r, bas=0.3):
        """Cette place est-elle à terre, hors des allées et de ce qui est déjà posé ?"""
        if terrain(x, y) < bas or not loin_des_allees(x, y, r):
            return False
        return all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for _, _, p in SOL) and all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for _, p in emprises)

    etape("le terrain")
    n, R = (48 if leger else 76), R_SOL
    xs = [-R + 2 * R * i / n for i in range(n + 1)]
    H_ = [[terrain(x, y) for x in xs] for y in xs]
    rang, sommets, uvs, faces = {}, [], [], []

    def sommet(i, j):
        if (i, j) not in rang:
            rang[(i, j)] = len(sommets)
            sommets.append((xs[i], xs[j], H_[j][i]))
            uvs.append(((xs[i] + R) / (2 * R), (xs[j] + R) / (2 * R)))
        return rang[(i, j)]

    debut_sol = len(L.f)
    for j in range(n):
        for i in range(n):
            if max(H_[j][i], H_[j][i + 1], H_[j + 1][i + 1], H_[j + 1][i]) < -0.25:
                continue
            faces.append((sommet(i, j), sommet(i + 1, j), sommet(i + 1, j + 1), sommet(i, j + 1)))
    L.ajouter(sommets, faces, "sol_cristal", uv=uvs)
    L.regrouper(debut_sol, None, 4, 0.75)

    etape("l'allée")
    # --- le débarcadère et sa bannière, les deux volées de marches, le bassin miroir, l'arche de cristal ---
    e = Rf.tablier(L, quai_mer, quai_terre, Z1, Z1, 0.5)
    lg = quai_terre[1] - quai_mer[1]
    for t in (0.12, 0.45, 0.78):
        for s in (-1, 1):
            L.ajouter(*N.cylindre(0.04, 0.034, Z1 + 0.95, 6, haut=False), "planches_sombres", T(quai_mer[0] + s * 0.21, quai_mer[1] + lg * t, -0.95))
    quai = Vf.rectangle(0.0, (quai_mer[1] + quai_terre[1]) / 2, lg, 0.5, PI / 2)
    emprises.append(("le débarcadère", quai))
    ponts.append(quai)
    P.banniere(lots, quai_mer[0] + 0.34, quai_mer[1] + 0.25, -0.3, 1.75, "rose", math.radians(100))
    muret(L, r_terrasse, Z1, Z2, 9 if leger else 6)
    muret(L, r_piton, Z2, Z3, 12 if leger else 8)
    marches(L, 0.0, y_t - 0.5, y_t + 0.5, 2 * DEMI_ALLEE, 6)
    marches(L, 0.0, y_p - 0.48, y_p + 0.48, 2 * DEMI_ALLEE, 6)
    zb = sol(*BASSIN)
    L.ajouter(*N.cylindre(R_BASSIN + 0.1, R_BASSIN + 0.1, 0.16, 20, haut=False), "pierres_lilas", T(BASSIN[0], BASSIN[1], zb - 0.06))
    L.ajouter(*N.cylindre(R_BASSIN, R_BASSIN, 0.02, 20, bas=False), "eau_miroir", T(BASSIN[0], BASSIN[1], zb + 0.06))
    cristal(L, U, BASSIN[0], BASSIN[1], zb + 0.05, 0.75, 0.13, "cristal_blanc", 0.4, 0.0)
    SOL.append(("decor", "le bassin miroir", Vf.rond(BASSIN[0], BASSIN[1], R_BASSIN + 0.12, 14)))
    ya = quai_terre[1] + 0.4  # l'arche : deux gerbes qui se penchent l'une vers l'autre et se croisent haut au-dessus de l'allée
    for s_ in (-1, 1):
        for k in range(4):
            cristal(L, U, s_ * (1.1 - 0.07 * k), ya + 0.07 * (k % 2) * s_, sol(s_ * 1.0, ya), 1.2 + 0.5 * k, 0.13 - 0.012 * k, CRISTAUX[(k + (s_ > 0)) % 3], PI if s_ > 0 else 0.0, 0.08 + 0.127 * k, k >= 2)
        SOL.append(("decor", "un pied de l'arche", Vf.rond(s_ * 1.0, ya, 0.22)))

    etape("le jardin")
    # --- la serre (à l'ouest), les deux moitiés de la géode (à l'est), l'atelier du polisseur (au nord-ouest) ---
    xs_, ys_ = -5.0, 0.2
    SOL.append(("decor", "la serre", serre(L, V, xs_, ys_, sol(xs_, ys_), PI / 2 + 0.12)))
    xt, yt = xs_ + 0.05, ys_ - 1.2  # les jeunes pousses, sur une table au bout de la serre
    zt = sol(xt, yt)
    L.ajouter(*N.boite(0.78, 0.22, 0.03), "planches", T(xt, yt, zt + 0.22))
    for sx in (-0.33, 0.33):
        L.ajouter(*N.boite(0.04, 0.18, 0.24), "planches_sombres", T(xt + sx, yt, zt - 0.02))
    for k in range(6):
        cristal_m(L, U, T(xt - 0.3 + 0.12 * k, yt + 0.02 * (k % 2), zt + 0.25), 0.07 + 0.03 * (k % 3), 0.018, CRISTAUX[k % 4], False, 0.0)
    SOL.append(("decor", "la table des pousses", Vf.rectangle(xt, yt, 0.9, 0.34, 0.0)))
    for (gx_, gy_, cap_g, rg) in ((4.75, -0.2, math.radians(-78), 0.75), (5.55, 0.55, math.radians(-118), 0.6)):
        SOL.append(("decor", "une moitié de la géode", geode(L, U, gx_, gy_, sol(gx_, gy_), cap_g, rg)))
    xa, ya_ = -3.9, 4.25
    SOL.append(("decor", "l'atelier du polisseur", atelier(L, U, lots, rng, xa, ya_, sol(xa, ya_), math.radians(-40))))

    etape("la Grande Aiguille")
    # --- la Grande Aiguille : une gerbe de prismes sur le piton, le plus haut plus grand qu'un mât ---
    zp = sol(PITON[0], PITON[1] + 0.3)
    bouquet(L, U, rng, PITON[0], PITON[1] + 0.3, zp, 5.4, 0.5, ("cristal_violet", "cristal_blanc", "cristal_rose", "cristal_violet", "cristal_turquoise"), 5 if leger else 9)
    SOL.append(("decor", "la Grande Aiguille", Vf.rond(PITON[0], PITON[1] + 0.3, 0.95, 12)))
    prismes = [(PITON[0], PITON[1] + 0.3, 5.4, 0.34)]  # (x, y, hauteur, où la lumière la traverse) : pour les taches d'arc-en-ciel

    etape("les bouquets")
    # --- les bouquets : aux quatre coins de la terrasse, sur la pelouse basse, au bord de l'eau ---
    places = [(PITON[0] + math.cos(a) * (R2 - 0.36), PITON[1] + math.sin(a) * (R2 - 0.36), 1.9 + 0.4 * (k % 2), 0.21) for k, a in enumerate(math.radians(g) for g in (35, 145, 215, 325))]
    places += [(*vers(g, 1.5 + 0.5 * (k % 2)), 1.5 + 0.7 * ((k * 5) % 3) / 2, 0.2) for k, g in enumerate((24, 62, 100, 150, 208, 248, 285, 308))]
    for k, (x, y, h, r) in enumerate(places[: 7 if leger else 12]):
        if libre(x, y, r * (1.3 if k < 4 else 2.2)):
            bouquet(L, U, rng, x, y, sol(x, y), h, r, tuple(CRISTAUX[(k + j) % 4] for j in range(3)), 4 if leger else 6, True, 0.4 if k < 4 else 1.0)
            SOL.append(("decor", "un bouquet de cristaux", Vf.rond(x, y, r * (1.3 if k < 4 else 2.0))))
            prismes.append((x, y, h, 0.35))

    for k, g in enumerate((40, 128, 190, 232, 310)[: 2 if leger else 5]):  # quelques cristaux les pieds dans l'eau
        x, y = vers(g, -0.25)
        bouquet(L, U, rng, x, y, -0.08, 0.9 + 0.3 * (k % 2), 0.13, tuple(CRISTAUX[(k + j + 1) % 4] for j in range(3)), 4, k % 2 == 0)

    semes, hasard = 0, random.Random(88)
    for _ in range(400):
        if semes >= (12 if leger else 34):
            break
        x, y = vers(hasard.random() * 360, 1.1 + hasard.random() * 2.6)
        if math.hypot(x - PITON[0], y - PITON[1]) > R2 + 0.75 and libre(x, y, 0.1):
            cristal(L, U, x, y, sol(x, y), 0.14 + 0.2 * hasard.random(), 0.03 + 0.02 * hasard.random(), CRISTAUX[semes % 4], hasard.random() * 6.28, 0.25 * hasard.random(), False)
            SOL.append(("rocher", "un petit cristal", Vf.rond(x, y, 0.06)))
            semes += 1

    etape("les bordures")
    # --- les bornes à cristal bleu et les buis en boule : le long de l'allée, autour du bassin, sur la terrasse ---
    for x, y in [(sx * 0.66, quai_terre[1] + 1.0) for sx in (-1, 1)] + [(BASSIN[0] + sx * (R_BASSIN + 0.95), BASSIN[1] + sy * (R_BASSIN + 0.2)) for sx in (-1, 1) for sy in (-1, 1)] + [(PITON[0] + math.cos(a) * (R2 - 0.42), PITON[1] + math.sin(a) * (R2 - 0.42)) for a in (0.0, PI / 2, PI)]:
        if libre(x, y, 0.09):
            borne(L, U, x, y, sol(x, y))
            SOL.append(("rocher", "une borne", Vf.rond(x, y, 0.08)))
    for x, y in [(sx * 1.55, y_t - 1.0) for sx in (-1, 1)] + [(sx * 2.6, y_t - 0.45 - 0.5 * abs(sx)) for sx in (-1, 1, -1.7, 1.7)] + [(PITON[0] + math.cos(a) * (R2 - 0.4), PITON[1] + math.sin(a) * (R2 - 0.4)) for a in (PI / 4, 3 * PI / 4, -PI / 4 + 0.25, -3 * PI / 4 - 0.25)]:
        if libre(x, y, 0.17):
            boule_buis(L, x, y, sol(x, y), 0.15 + 0.03 * ((x * 7) % 2 > 1))
            SOL.append(("rocher", "un buis", Vf.rond(x, y, 0.15)))

    etape("les plates-bandes")
    # --- les plates-bandes de la terrasse : de petits cristaux alignés comme des légumes, entre l'allée ronde et le piton ---
    for q in range(4 if leger else 8):
        a0 = PI / 8 + q * PI / 4
        for rang_ in range(2):
            rr = R3 + 0.5 + 0.32 * rang_
            for k in range(3 if leger else 5):
                a = a0 + (k - 2) * 0.13
                x, y = PITON[0] + math.cos(a) * rr, PITON[1] + math.sin(a) * rr
                if libre(x, y, 0.06, 0.8):
                    cristal(L, U, x, y, sol(x, y), 0.2 + 0.12 * ((k + rang_ + q) % 3), 0.045, CRISTAUX[q % 4], a, 0.08, False)

    etape("les jardiniers")
    def poser(x, y, cap=None, **plus):
        if libre(x, y, 0.07):
            P.passant(L, rng, x, y, angle=cap, z=sol(x, y), **plus)
            SOL.append(("passant", "un jardinier", Vf.rond(x, y, 0.065)))

    places_j = [(BASSIN[0] - 1.7, BASSIN[1] + 0.4, 0.2), (PITON[0] + math.cos(-0.45) * 3.3, PITON[1] + math.sin(-0.45) * 3.3, 2.7), (PITON[0] + math.cos(2.75) * 3.3, PITON[1] + math.sin(2.75) * 3.3, -0.4),
                (-5.0, -1.75, 1.5), (3.75, -1.3, 0.5), (1.6, y_t - 1.5, 1.9), (3.6, -1.9, 0.6), (-2.6, -4.2, 0.9), (PITON[0] + math.cos(1.2) * 3.3, PITON[1] + math.sin(1.2) * 3.3, -1.9)]
    faits = 0
    for k, (x, y, cap) in enumerate(places_j):
        if faits >= (3 if leger else 7):
            break
        avant = len(SOL)
        poser(x, y, cap, **({"leve": 1} if k == 2 else {}))
        faits += len(SOL) - avant

    etape("la vie")
    types = []
    for k in range(2):
        Pm = N.Maille(f"marcheur{k}")
        P.passant(Pm, rng, 0, 0, angle=0.0, z=0.0, marcheur=True, tient=("toile_ecrue", None)[k])
        types.append(Pm)
    deja = {}
    for k, (pts, rond, vit, depart, pause) in enumerate(chemins[:2] if leger else chemins):
        extras = {"anim": "marche", "chemin": [float(c) for p in pts for c in p], "vitesse": vit, "phase": depart, "saut": 0.02, "pause": pause}
        if rond:
            extras["boucle"] = 1
        t_ = k % len(types)
        if t_ not in deja:
            deja[t_] = len(lots["animes"])
            lots["animes"].append((types[t_], pts[0], extras))
        else:
            lots["copies"].append((deja[t_], pts[0], extras))
    lots["reperes"].append(((float(PITON[0]), float(PITON[1] + 0.3), float(zp + 3.6)), {"anim": "etincelles"}))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "mer", "rayon": 8.5, "genre": 2}))
    # le jour, le soleil de la cuisson (N.soleil_et_ciel : du sud-ouest, assez bas) traverse les cristaux : de l'autre côté,
    # une tache d'arc-en-ciel sur le sol, là où il est à peu près plat et à terre (le site la dessine : grandline-3d.js, « prismes »)
    pr_n = math.hypot(0.5, 0.62)
    pr_u, pr_pente = (0.5 / pr_n, 0.62 / pr_n), pr_n / 0.62
    pr_taches = []
    for x, y, h, t_ in prismes:
        cx, cy = x + pr_u[0] * pr_pente * t_ * h, y + pr_u[1] * pr_pente * t_ * h
        lg_, lr_ = min(1.3, 0.75 + 0.2 * h), 0.4 + 0.05 * min(h, 2.4)
        pts = [(cx + pr_u[0] * a * lg_ / 2 - pr_u[1] * b * lr_ / 2, cy + pr_u[1] * a * lg_ / 2 + pr_u[0] * b * lr_ / 2) for a in (-1, 0, 1) for b in (-1, 0, 1)]
        hs = [sol(*q) for q in pts]
        if max(hs) - min(hs) < 0.06 and min(bord(*q) for q in pts) > 0.3:
            pr_taches += [round(cx, 3), round(cy, 3), round(max(hs) + 0.03, 3), round(lg_, 3), round(lr_, 3)]
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "prismes", "cap": round(math.atan2(pr_u[1], pr_u[0]), 4), "taches": pr_taches}))

    etape("sur l'eau")
    Rv = N.Maille("rivage")
    cote = [(_COTE[i % 720][0], _COTE[i % 720][1]) for i in range(0, 724, 4)]
    K.bande(Rv, [(x * 0.995, y * 0.995) for x, y in cote], [(x * (1 + 0.9 / math.hypot(x, y)), y * (1 + 0.9 / math.hypot(x, y))) for x, y in cote], mat="ecume", boucle=True)
    qa, qb = np.array(quai_mer), np.array(vers(-90, 0.0))
    K.tache(Rv, *((qa + qb) / 2), float(np.linalg.norm(qb - qa)), 0.56, PI / 2)
    lots["libres"].append((Rv, (0.0, 0.0, 0.0), {"role": "decor"}))
    etape("fin")
    lots["plan"] = {"emprises": emprises, "sol": SOL, "ponts": ponts}
    return lots


def verifier(lots=None, leger=False):
    """Les erreurs de plan (voir barhaw_ile_v5.controler) : une liste vide quand tout va bien."""
    return K.controler(lots or mailles(leger=leger), sol)


def construire(rendu=True, cuire=True, exporter=True, taille=None, echantillons=48, leger=False, alleger=True):
    lots = mailles(leger=leger)
    rendus = [("cristal-v5", (1.0, -30.5, 17.5), (0.0, 0.4, 1.6), 50), ("cristal-v5-aiguille", (-3.5, -10.5, 6.0), (0.0, 0.2, 2.0), 50)] if rendu else []
    return K.construire("ile-cristal-v5", lots, verifier(lots), rendus, cuire, exporter, taille or (2048 if leger else 3072), echantillons, leger, alleger, atlas="cristal")
