# L'Île du Grand Arbre, « niveau 5 » : une île ronde et verte, et en son milieu un arbre si grand que ses branches touchent
# les nuages. Tout est inventé.
# (Son histoire, dans le bot : « Un arbre si grand que ses branches touchent les nuages. L'équipage y construit une cabane,
# parce qu'un équipage a besoin d'un endroit à lui. Montez jusqu'en haut. De là, on voit le bord de la carte. »)
# L'arbre : un tronc cannelé qui se tord en montant, ses contreforts, ses racines qui courent jusqu'à la grève (l'une fait
# une arche au-dessus du sentier), cinq maîtresses branches et une couronne en étages, des lianes, un banc de nuages accroché
# au sommet. Les cabanes : la plateforme qui fait le tour du tronc et la cabane de l'équipage (sa cheminée fume), l'escalier
# en colimaçon qui y monte depuis la passerelle, le pont de corde vers la cabane ronde de l'est, la cabane qu'on construit à
# l'ouest (une charpente, un échafaudage, deux charpentiers), le monte-charge qui hisse les planches, les échelons cloués
# jusqu'à la vigie, tout en haut (la longue-vue tournée vers le bord de la carte, et un ruban noir noué à la rambarde :
# quelqu'un est monté avant nous). En bas : la crique, son ponton et la barque, le feu de camp, le chantier du bois, la
# balançoire. La vie : ceux qui marchent (l'un monte jusqu'à la cabane), la charge du monte-charge, la balançoire, les
# feuilles qui tombent, la fumée, les oiseaux.
# Sorties : ile-arbre-v5.glb (+ -leger) et son atlas .png. Contrôle du plan : verifier() (voir barhaw_ile_v5.py).
import math, random
import numpy as np
import barhaw_niveau5 as N
import barhaw_verif as Vf
import barhaw_ile_v5 as K
import barhaw_port_v5 as P
import barhaw_recif_v5 as Rf
import barhaw_plage_v5 as Pl

PI = math.pi
T, Rz, Rx, Ry = N.T, N.Rz, N.Rx, N.Ry


# ---------- les matières ----------
def plaques(n, gx, gy, graine=0, alea=0.85):
    """Des cellules qui se répètent, gx en largeur et gy en hauteur (moins de rangs : des plaques plus hautes que larges).
    Renvoie (distance au joint, en cellules ; numéro de la plaque ; nombre de plaques)."""
    x, y = N.grille(n)
    r = np.random.default_rng(graine)
    f1 = np.full((n, n), 9.0, np.float32)
    f2 = np.full((n, n), 9.0, np.float32)
    ident = np.zeros((n, n), np.int32)
    k = 0
    for j in range(gy):
        for i in range(gx):
            sx, sy = (i + 0.5 + (r.random() - 0.5) * alea) / gx, (j + 0.5 + (r.random() - 0.5) * alea) / gy
            dx = np.abs(x - sx)
            dx = np.minimum(dx, 1 - dx) * gx
            dy = np.abs(y - sy)
            dy = np.minimum(dy, 1 - dy) * gy
            d = np.sqrt(dx * dx + dy * dy)
            plus_pres = d < f1
            f2 = np.where(plus_pres, f1, np.minimum(f2, d))
            ident = np.where(plus_pres, k, ident)
            f1 = np.minimum(f1, d)
            k += 1
    return f2 - f1, ident, k


def tx_ecorce(c=0x6e5843, graine=1, mousse=0.35):
    """Une écorce de très vieil arbre : de longues plaques bombées qui courent le long du tronc (u : le tour, v : la
    longueur), séparées par des crevasses sombres plus ou moins ouvertes ; le fil du bois sur chaque plaque, le gris des
    plaques usées, des plaques de mousse, quelques lichens."""
    n = N.TAILLE
    d, ident, nb = plaques(n, 12, 2, graine, 1.0)
    al = np.random.default_rng(graine + 1).random(nb, dtype=np.float32)[ident]
    d = d + 0.22 * (N.bruit(n, 24, 6, graine + 7, 3) - 0.5)  # des joints qui ne sont pas tirés au cordeau
    ouvert = 0.05 + 0.12 * al  # certaines crevasses sont à peine marquées, d'autres béantes
    crete = N.lisse(0.0, 0.45, d - ouvert)
    crevasse = N.lisse(ouvert + 0.06, ouvert - 0.04, d)
    fibres = N.bruit(n, 110, 5, graine + 2, 2)
    coul = N.hexa(c) * (0.56 + 0.5 * crete * (0.8 + 0.4 * al) + 0.18 * (fibres - 0.5) + 0.1 * (N.bruit(n, 30, 30, graine + 3, 2) - 0.5))[..., None]
    coul = N.mel(coul, N.hexa(0x2a1f17) * (0.8 + 0.4 * fibres)[..., None], crevasse * 0.85)
    coul = N.mel(coul, N.hexa(0x9c9282) * (0.8 + 0.3 * fibres)[..., None], N.lisse(0.6, 0.95, crete * al) * 0.3)  # le gris des plaques usées
    taches = N.lisse(0.6, 0.76, N.bruit(n, 4, 3, graine + 4, 4)) * (0.6 + 0.4 * N.bruit(n, 40, 40, graine + 8, 2))
    coul = N.mel(coul, N.hexa(0x5c7d32) * (0.75 + 0.4 * fibres)[..., None], np.clip(taches * mousse * 1.6, 0, 0.8))
    lichen = (N.bruit(n, 40, 40, graine + 5, 2) > 0.77) * N.lisse(0.5, 0.7, N.bruit(n, 6, 6, graine + 6, 3)) * crete
    coul = N.mel(coul, N.hexa(0xb6bd88), lichen * 0.5)
    return np.clip(coul, 0, 1).astype(np.float32), np.clip(0.1 + 0.85 * crete * (1 - crevasse), 0, 1).astype(np.float32)


def tx_frondaison(c=0x4c8a3a, graine=1, g=11, nb=3400, long_=22):
    """Le feuillage du Grand Arbre : des milliers de petites feuilles en pointe qui se chevauchent, chacune éclairée d'un
    côté et marquée de sa nervure ; l'ombre dans les trous entre elles ; des touffes plus claires ou plus sombres."""
    n = N.TAILLE
    rng = np.random.default_rng(graine)
    touffes = N.bruit(n, 9, 9, graine + 1, 3)
    coul = (N.hexa(c) * 0.44)[None, None, :] * (0.8 + 0.4 * touffes)[..., None]
    relief = np.zeros((n, n), np.float32)
    r = long_ // 2 + 2
    oy, ox = np.mgrid[-r:r + 1, -r:r + 1].astype(np.float32)
    clair = N.hexa(c) * np.array([1.18, 1.12, 0.78], np.float32)
    for k in range(nb):
        cx, cy = rng.random() * n, rng.random() * n
        a = rng.random() * 2 * PI
        L_ = long_ * (0.7 + 0.5 * rng.random())
        W_ = L_ * (0.26 + 0.1 * rng.random())
        u = (ox - (cx % 1)) * math.cos(a) + (oy - (cy % 1)) * math.sin(a)
        v = -(ox - (cx % 1)) * math.sin(a) + (oy - (cy % 1)) * math.cos(a)
        t = u / (L_ / 2)
        dedans = (np.abs(t) < 1) & (np.abs(v) < W_ / 2 * np.clip(1 - t * t, 0, 1) ** 0.75)
        if not dedans.any():
            continue
        i0, j0 = int(cy), int(cx)
        ys = (np.arange(-r, r + 1) + i0) % n
        xs = (np.arange(-r, r + 1) + j0) % n
        lum = (0.72 + 0.38 * rng.random()) * (0.7 + 0.55 * touffes[i0 % n, j0 % n]) * (1 + 0.22 * np.clip(v / (W_ / 2), -1, 1) - 0.1 * t)
        lum = lum * np.where(np.abs(v) < 0.8, 0.84, 1.0)
        teinte = N.hexa(c) if rng.random() < 0.7 else clair
        bloc = coul[np.ix_(ys, xs)]
        bloc[dedans] = (teinte[None, :] * lum[dedans][:, None])
        coul[np.ix_(ys, xs)] = bloc
        rb = relief[np.ix_(ys, xs)]
        rb[dedans] = 0.55 + 0.4 * (1 - np.abs(t[dedans]))
        relief[np.ix_(ys, xs)] = rb
    return np.clip(coul, 0, 1).astype(np.float32), relief.astype(np.float32)


def tx_fronde(graine=1):
    """Une fronde de fougère, posée sur sa bande (u : en travers, v : le long) : la nervure, les folioles en épis."""
    n = N.TAILLE
    x, y = N.grille(n)
    ecart = np.abs(x - 0.5)
    epi = ((y * 16 - ecart * 5) % 1.0)
    foliole = N.lisse(0.75, 0.55, epi) * N.lisse(0.5, 0.42, ecart)
    coul = N.hexa(0x3d7a32) * (0.62 + 0.55 * foliole + 0.1 * (N.bruit(n, 30, 30, graine, 2) - 0.5))[..., None]
    coul = N.mel(coul, N.hexa(0x7fae4a), N.lisse(0.03, 0.0, ecart) * 0.8)  # la nervure
    return np.clip(coul, 0, 1).astype(np.float32), np.clip(0.3 + 0.6 * foliole, 0, 1).astype(np.float32)


N.matiere("ecorce_geant", tx_ecorce, 1.25, 1.0)
N.matiere("ecorce_branche", tx_ecorce, 0.8, 0.9, c=0x75604a, graine=7, mousse=0.5)
N.matiere("frondaison", tx_frondaison, 1.2, 0.8, c=0x48873a, graine=501)
N.matiere("frondaison_claire", tx_frondaison, 1.2, 0.8, c=0x66a044, graine=502)
N.matiere("frondaison_sombre", tx_frondaison, 1.2, 0.8, c=0x35693a, graine=503)
N.matiere("frondaison_doree", tx_frondaison, 1.2, 0.8, c=0x88993c, graine=504)
N.matiere("fronde", tx_fronde, 1.0, 0.5, graine=505)
N.matiere("feuillage_buisson", tx_frondaison, 0.7, 0.7, c=0x4a8238, graine=506, g=9)
N.matiere("nuage", N.tx_uni, 2.4, 0.08, c=0xf6f7fb, graine=507, grain=0.05, taches=0.12, c2=0xdde4ee, seuil=0.55)
N.matiere("corde_arbre", N.tx_corde, 0.3, 0.8, c=0xb89a6a, graine=508)
N.matiere("ruban_noir", N.tx_uni, 0.6, 0.2, c=0x1f1d23, graine=509, grain=0.15, taches=0.25, c2=0x34313a, seuil=0.55)
N.matiere("sciure", N.tx_uni, 0.8, 0.3, c=0xe2c58c, graine=510, grain=0.3, taches=0.3)
for _nom, _c in (("fleur_rose", 0xff6fae), ("fleur_rouge", 0xe8413a), ("fleur_jaune", 0xffd34d), ("fleur_blanche", 0xfff6e8)):
    N.matiere(_nom, N.tx_uni, 0.4, 0.2, c=_c, graine=511 + len(_nom), grain=0.1, taches=0.15)

# ---------- l'île ----------
CRIQUE = math.radians(-95)  # la crique et son ponton, au sud
TRONC = (0.0, 0.8)  # le pied du Grand Arbre
R_SOL = 9.6
PISTES = []
ZONES_SOL = {"sciure": [], "cendre": []}  # (x, y, rayon) : la sciure du chantier, la cendre du feu (peintes sur le sol)


def _ecart(a, b):
    return (a - b + PI) % (2 * PI) - PI


def rivage(th):
    """Le rayon de la côte dans cette direction : une île presque ronde, creusée au sud par la crique."""
    return 6.5 + 0.4 * math.sin(2 * th + 0.4) + 0.28 * math.sin(3 * th + 2.1) + 0.14 * math.sin(7 * th + 0.5) - 1.5 * math.exp(-((_ecart(th, CRIQUE) / 0.4) ** 2))


_COTE = np.array([(math.cos(a) * rivage(a), math.sin(a) * rivage(a)) for a in np.linspace(-PI, PI, 720, endpoint=False)])


def bord(x, y):
    """La vraie distance au bord de l'eau ; > 0 : à terre."""
    d = float(np.sqrt(((_COTE - (x, y)) ** 2).sum(axis=1).min()))
    return d if math.hypot(x, y) < rivage(math.atan2(y, x)) else -d


def sol(x, y):
    """La hauteur du terrain : la grève, la prairie, et la butte que les racines du Grand Arbre ont soulevée."""
    d = bord(x, y)
    if d < 0:
        return max(-1.4, 0.45 * d)
    h = 0.28 * (1 - math.exp(-d / 0.7)) + 0.42 * K.lisse(1.0, 3.4, d)
    h += 0.5 * math.exp(-((x - TRONC[0]) ** 2 + (y - TRONC[1]) ** 2) / 6.5) * K.lisse(0.8, 2.2, d)
    h += (K.bruit2(x * 0.85, y * 0.85, 17) - 0.5) * 0.12 * K.lisse(0.9, 2.4, d)
    return h


Z0 = sol(*TRONC)  # le pied du tronc : toutes les hauteurs de l'arbre (H) se comptent à partir de là


def vers(angle, dedans):
    """Un point dans cette direction (degrés, 90 = le nord), à cette distance du bord de l'eau (vers l'intérieur)."""
    a = math.radians(angle)
    r = rivage(a) - dedans
    return math.cos(a) * r, math.sin(a) * r


# ---------- le tronc ----------
def rayon_tronc(H):
    """Le rayon moyen du tronc à la hauteur H (au-dessus de son pied) : évasé en bas, il s'affine au-dessus de la fourche."""
    r = 0.66 + 0.1 * (1 - min(max(H, 0.0), 6.0) / 6) + 0.5 * math.exp(-max(H, 0.0) / 0.8)
    return r * (1 - 0.55 * K.lisse(4.4, 9.2, H))


def axe(H):
    """Le cœur du tronc à la hauteur H : il ondule un peu en montant."""
    return (TRONC[0] + 0.12 * math.sin(H * 0.55 + 0.5), TRONC[1] + 0.1 * math.sin(H * 0.43 + 2.0))


def bosse(th, H):
    """Le relief du tronc autour de lui (1 : le rayon moyen) : des cannelures qui tournent en montant, le pied plus bossu."""
    return 1 + 0.055 * math.sin(5 * th + 0.35 * H + 0.4) + 0.035 * math.sin(9 * th - 0.6 * H + 1.3) + 0.16 * math.exp(-max(H, 0.0) / 0.3) * max(0.0, math.cos(5 * (th - 0.3))) ** 4


def au_tronc(H, th, r):
    """Un point à la hauteur H, dans la direction th (radians), à la distance r du cœur du tronc."""
    c = axe(H)
    return (c[0] + math.cos(th) * r, c[1] + math.sin(th) * r, Z0 + H)


def anneaux(L, rings, mat, M=None, ferme=True, haut=False, zone=0, doux=False):
    """Une forme tendue sur des anneaux de points (chacun le même nombre) : un tronc, un contrefort. Le motif est déroulé
    (u : le tour, v : la longueur), comme sur un tube ; u est mesuré sur chaque anneau, ramené au tour moyen, pour que
    le motif passe d'un anneau au suivant sans couture."""
    n, m = len(rings[0]), len(rings)
    v = [p for r_ in rings for p in r_]
    f = N.Faces()
    f.deroule = []
    nb = n if ferme else n - 1
    centres = [np.mean(np.asarray(r_), axis=0) for r_ in rings]
    tours = []
    for r_ in rings:
        r_ = np.asarray(r_)
        pas = [float(np.linalg.norm(r_[(k + 1) % n] - r_[k])) for k in range(nb)]
        tours.append(np.concatenate([[0.0], np.cumsum(pas)]))
    moyen = float(np.mean([t[-1] for t in tours]))
    us = [t * (moyen / max(t[-1], 1e-9)) for t in tours]
    long = 0.0
    for j in range(m - 1):
        suite = long + float(np.linalg.norm(centres[j + 1] - centres[j]))
        for k in range(nb):
            k2 = (k + 1) % n
            f.append((j * n + k, j * n + k2, (j + 1) * n + k2, (j + 1) * n + k))
            f.deroule.append([(us[j][k], long), (us[j][k + 1], long), (us[j + 1][k + 1], suite), (us[j + 1][k], suite)])
        long = suite
    if haut:
        f.append(tuple(range((m - 1) * n, m * n)))
        f.deroule.append(None)
    L.ajouter(v, f, mat, M, zone=zone, doux=doux)


def toile(A, v, faces, mat, M=None, ep=0.01, zone=0, uv=None):
    """Une chose fine à deux côtés (une fronde, un ruban) : l'envers est reculé d'un cheveu à l'opposé de la normale, pour
    qu'aucun côté ne fasse d'ombre à l'autre quand on cuit la lumière."""
    P_ = np.asarray(v, np.float64)
    nv = np.zeros_like(P_)
    for f in faces:
        n_ = np.cross(P_[f[1]] - P_[f[0]], P_[f[2]] - P_[f[1]])
        for k in f:
            nv[k] += n_ / (np.linalg.norm(n_) or 1.0)
    nv /= np.maximum(np.linalg.norm(nv, axis=1, keepdims=True), 1e-9)
    dos = [tuple(q) for q in P_ - nv * ep]
    A.ajouter([tuple(q) for q in P_] + dos, list(faces) + [tuple(len(v) + i for i in reversed(f)) for f in faces], mat, M, zone=zone, uv=(list(uv) * 2 if uv else None))


def fondre(D, S_, M):
    """Verse la maille S_ dans la maille D, déplacée par M (une matrice qui peut aussi changer sa taille : un enfant)."""
    if not S_.v:
        return
    v = np.concatenate(S_.v)
    v = v @ M[:3, :3].T + M[:3, 3]
    ech = abs(np.linalg.det(M[:3, :3])) ** (1 / 3)
    base_v, base_c = D.nv, len(D.finesse)
    for (f, k), uvf, (c, plat), z, d in zip(S_.f, S_.uv, S_.cartes, S_.zones, S_.doux):
        D.f.append(([base_v + i for i in f], D.mat(S_.mats[k])))
        D.uv.append(uvf)
        D.cartes.append((base_c + c, plat * ech))
        D.zones.append(z)
        D.doux.append(d)
    D.finesse += S_.finesse
    D.v.append(v)
    D.nv += len(v)


def tronc(L, leger):
    """Le tronc du Grand Arbre, de sous la terre jusqu'à la vigie : cannelé, tordu, évasé au pied."""
    n = 14 if leger else 22
    hauteurs = [-0.5, -0.2, 0.05, 0.3, 0.6, 1.0, 1.5, 2.1, 2.8, 3.5, 4.2, 4.8, 5.4, 6.0, 6.7, 7.4, 8.1, 8.7, 9.25]
    rings = []
    for H in hauteurs:
        r = rayon_tronc(H)
        tord = 0.12 * H
        rings.append([au_tronc(H, k * 2 * PI / n + tord, r * bosse(k * 2 * PI / n + tord, H)) for k in range(n)])
    anneaux(L, rings, "ecorce_geant", haut=True, doux=True)


def contrefort(L, th, D=2.0, haut=0.95, ep=0.4, sens=1):
    """Un contrefort : une lame de bois au dos rond qui part du pied du tronc et s'enfonce dans la terre en s'affinant, un
    peu ondulée."""
    r0 = rayon_tronc(0.0)
    rings = []
    nb = 8
    for k in range(nb + 1):
        t = k / nb
        rho = r0 * 0.75 + (r0 * 0.25 + D) * t
        a = th + sens * 0.16 * math.sin(t * 2.6) / max(1.0, rho)
        x, y = TRONC[0] + math.cos(a) * rho, TRONC[1] + math.sin(a) * rho
        zs = sol(x, y)
        e = ep * (1 - 0.7 * t) / 2
        ztop = Z0 + (haut + 0.3) * (1 - t) ** 2.2
        ztop = max(ztop, zs + e * 0.6 + 0.02)
        nx, ny = -math.sin(a), math.cos(a)
        bas = zs - 0.3
        prof = [(1.35, bas - ztop), (1.0, -e * 1.3), (0.72, -e * 0.38), (0.0, 0.0), (-0.72, -e * 0.38), (-1.0, -e * 1.3), (-1.35, bas - ztop)]
        rings.append([(x + nx * e * u, y + ny * e * u, max(bas, ztop + dz)) for u, dz in prof])
    anneaux(L, rings, "ecorce_geant", ferme=False, doux=True)
    L.ajouter(rings[-1], [tuple(reversed(range(len(rings[-1]))))], "ecorce_geant", doux=True)


def racine(L, pts, rayons, n=6):
    """Une racine qui court sur le sol (des points x, y, z déjà posés) : un tube d'écorce."""
    L.ajouter(*N.tube(pts, rayons, n, bouts=True), "ecorce_branche", doux=True)


def branche(L, pts, rayons, n=7):
    L.ajouter(*N.tube(pts, rayons, n, bouts=True), "ecorce_branche", doux=True)


def grappe(L, rng, cx, cy, cz, r, ez=0.62, mat="frondaison", fin=True, agite=0.82):
    """Une grappe de feuillage : une grosse masse bosselée et aplatie, deux plus petites qui débordent sur ses bords ; toutes
    lisses (pas de facettes), le vent les fait frémir."""
    masses = [(r, 0.0, 0.0, 0.0, mat)]
    a0 = rng.random() * 6.28
    for k in range(3 if fin else 2):
        a = a0 + k * 2.1 + rng.random() * 0.6
        masses.append((r * (0.42 + 0.12 * rng.random()), math.cos(a) * r * 0.8, math.sin(a) * r * 0.8, r * ez * (-0.35 + 0.6 * rng.random()), rng.choice(["frondaison", "frondaison_sombre", "frondaison", "frondaison_claire"])))
    for k, (rk, dx, dy, dz, m) in enumerate(masses):
        v, f = N.sphere(rk, (9 if k == 0 else 6) if fin else (7 if k == 0 else 5), (6 if k == 0 else 4) if fin else (4 if k == 0 else 3), ez)
        g = rng.random() * 9
        v = [(a_ * q, b_ * q, c_ * q) for (a_, b_, c_) in v for q in [1 + 0.15 * math.sin(a_ / rk * 4.1 + g) * math.sin(b_ / rk * 3.6 + g * 1.7) * math.sin(c_ / rk * 5.3 + g * 0.6) + 0.05 * math.sin(a_ / rk * 11 + b_ / rk * 9 + g)]]
        L.ajouter(v, f, m, T(cx + dx, cy + dy, cz + dz) @ Rz(rng.random() * 3), zone=(1.0, round(agite - 0.06 * k, 2), 1.0), doux=True)


# ---------- l'escalier, les plateformes, les cabanes ----------
H_ESC0, H_ESC1, TH_ESC0, TOUR_ESC = 0.45, 3.0, math.radians(-160), math.radians(400)  # l'escalier en colimaçon
HA = 3.0  # le plancher de la plateforme qui fait le tour du tronc
TH_CAB = math.radians(-70)  # la cabane de l'équipage, sur la plateforme (elle regarde le sud-sud-est)
TROU = (math.radians(145), math.radians(240))  # la trémie de l'escalier : là, seul le bord de la plateforme est plancheyé
H_EST, CAP_EST, R_EST = 2.5, math.radians(-7), 4.0  # la cabane ronde, au bout de la branche de l'est
H_OUEST, CAP_OUEST, R_OUEST = 4.25, math.radians(175), 2.85  # la cabane qu'on construit, sur la branche de l'ouest
H_VIGIE = 9.0


def r_escalier(H):
    """Le bord intérieur de l'escalier à la hauteur H (il suit le tronc qui s'affine)."""
    return rayon_tronc(H) * 1.12 + 0.07


def escalier(L, leger):
    """L'escalier en colimaçon : des planches clouées en rayon autour du tronc, une corde pour se tenir, des jambes de force.
    Renvoie (le trajet du marcheur, les planches au sol pour le contrôle)."""
    larg, pas = 0.52, (0.2 if leger else 0.17)
    rw = lambda H: r_escalier(H) + 0.27
    # combien de planches : à peu près une tous les 17 cm, mesurés là où l'on marche
    long = TOUR_ESC * (rw(H_ESC0) + rw(H_ESC1)) / 2
    nb = int(long / pas)
    trajet, ponts, poteaux = [], [], []
    for k in range(nb + 1):
        t = k / nb
        th = TH_ESC0 + TOUR_ESC * t
        H = H_ESC0 + (H_ESC1 - H_ESC0) * t
        ri = r_escalier(H)
        c = axe(H)
        M = T(c[0], c[1], Z0 + H) @ Rz(th)
        L.ajouter(*N.boite(larg + 0.12, 0.15, 0.045), "planches", M @ T(ri + (larg - 0.12) / 2, 0, -0.045))
        q = au_tronc(H, th, rw(H))
        trajet.append((q[0], q[1], q[2] + 0.02))
        coins = [(ri - 0.02, -0.085), (ri + larg, -0.085), (ri + larg, 0.085), (ri - 0.02, 0.085)]
        ponts.append([(c[0] + math.cos(th) * a - math.sin(th) * b, c[1] + math.sin(th) * a + math.cos(th) * b) for a, b in coins])
        if k % 3 == 0 and k > 3:  # la corde : des piquets au bord extérieur (pas au départ : on y arrive par la passerelle)
            q = au_tronc(H, th, ri + larg - 0.035)
            L.ajouter(*N.poutre(q, (q[0], q[1], q[2] + 0.36), 0.03), "planches_sombres")
            poteaux.append((q[0], q[1], q[2] + 0.33))
        if k % 4 == 2 and H > 1.0:  # une jambe de force, du tronc au bout de la planche
            a, b = au_tronc(H - 0.55, th, rayon_tronc(H - 0.55) * 0.95), au_tronc(H - 0.06, th, ri + larg - 0.06)
            L.ajouter(*N.poutre(a, b, 0.04), "planches_sombres")
        elif H < 1.0 and k % 3 == 1:  # près du sol : un pieu sous le bout de la planche
            q = au_tronc(H, th, ri + larg - 0.08)
            L.ajouter(*N.poutre((q[0], q[1], sol(q[0], q[1]) - 0.2), (q[0], q[1], q[2] - 0.04), 0.045), "planches_sombres")
    for a, b in zip(poteaux[:-1], poteaux[1:]):
        L.ajouter(*N.poutre(a, b, 0.012), "corde_arbre")
    return trajet, ponts


def deck_bord(th):
    """Le bord de la plateforme dans cette direction : un cercle, et le carré qui avance sous la cabane."""
    a = _ecart(th, TH_CAB)
    u, w = 2.45, 0.98
    t = 9.0
    if math.cos(a) > 1e-6:
        t = min(t, u / math.cos(a))
    if abs(math.sin(a)) > 1e-6:
        t = min(t, w / abs(math.sin(a)))
    return max(1.95, t if math.cos(a) > 0 else 0.0)


def dans_le_trou(th):
    """Cette direction tombe-t-elle sur la trémie de l'escalier ?"""
    return (th - TROU[0]) % (2 * PI) < TROU[1] - TROU[0]


def plateforme(L, U, rng, leger):
    """La plateforme autour du tronc : le plancher (en éventail), les solives, les jambes de force, la rambarde (ouverte au
    pont de corde), les lanternes. Renvoie (les morceaux de plancher pour le contrôle, les points du bord)."""
    c = axe(HA)
    ri = rayon_tronc(HA) * 1.1 + 0.03
    pas = math.radians(4)
    nb = int(round(2 * PI / pas))
    ponts, bord_ = [], []
    for k in range(nb):
        a0, a1 = k * pas, (k + 1) * pas
        am = (a0 + a1) / 2
        r0 = 1.5 if dans_le_trou(am) else ri
        R0, R1 = deck_bord(a0), deck_bord(a1)
        pts = [(c[0] + math.cos(a0) * r0, c[1] + math.sin(a0) * r0), (c[0] + math.cos(a0) * R0, c[1] + math.sin(a0) * R0), (c[0] + math.cos(a1) * R1, c[1] + math.sin(a1) * R1), (c[0] + math.cos(a1) * r0, c[1] + math.sin(a1) * r0)]
        L.ajouter([(x, y, Z0 + HA) for x, y in pts] + [(x, y, Z0 + HA - 0.05) for x, y in pts], [(0, 1, 2, 3), (1, 5, 6, 2)] + ([(3, 7, 4, 0)] if r0 > ri + 0.1 else []), "pont")
        ponts.append(pts)
        bord_.append(pts[1])
    # les solives (en rayon, sous le plancher ; pas sous la trémie, où passe l'escalier)
    for k in range(0, nb, 5 if leger else 3):
        a = k * pas
        r0 = 1.5 if dans_le_trou(a) else ri - 0.08
        R = deck_bord(a) - 0.03
        L.ajouter(*N.poutre(au_tronc(HA - 0.1, a, r0), au_tronc(HA - 0.1, a, R), 0.07, 0.1), "poutre")
    L.ajouter(*N.tube([au_tronc(HA - 0.1, k * 2 * PI / 24, 1.9) for k in range(25)], 0.045, 4, bouts=False), "poutre")  # la ceinture
    for d in (-100, -55, -10, 35, 65):  # les jambes de force (là où l'escalier passe loin dessous)
        a = math.radians(d)
        L.ajouter(*N.poutre(au_tronc(HA - 0.8, a, rayon_tronc(HA - 0.8) * 0.92), au_tronc(HA - 0.13, a, 1.85), 0.06), "poutre")
    return ponts, bord_


def point_a(pts, s):
    """Le point d'une ligne à cette distance de son début."""
    for a, b in zip(pts[:-1], pts[1:]):
        l = math.dist(a, b)
        if s <= l and l > 1e-9:
            return tuple(a[i] + (b[i] - a[i]) * s / l for i in range(3))
        s -= l
    return tuple(pts[-1])


def rambarde(L, pts, h=0.34, pas=0.42, ouvert=()):
    pas = pas * (1.3 if N.DETAIL < 1 else 1.15)
    """Une rambarde de piquets et de corde le long de ces points (x, y, z), sauf sur les tronçons ouverts (indices des
    segments) : des piquets à intervalles réguliers, la corde de l'un à l'autre."""
    morceaux, cur = [], []
    for k in range(len(pts) - 1):
        if k in ouvert:
            if len(cur) > 1:
                morceaux.append(cur)
            cur = []
            continue
        if not cur:
            cur = [pts[k]]
        cur.append(pts[k + 1])
    if len(cur) > 1:
        morceaux.append(cur)
    for m in morceaux:
        total = sum(math.dist(a, b) for a, b in zip(m[:-1], m[1:]))
        nb = max(1, round(total / pas))
        poteaux = []
        for j in range(nb + 1):
            q = point_a(m, total * j / nb)
            L.ajouter(*N.boite(0.035, 0.035, h + 0.02), "planches_sombres", T(q[0], q[1], q[2] - 0.02))
            poteaux.append((q[0], q[1], q[2] + h - 0.03))
        L.ajouter(*N.tube(poteaux, 0.012, 3, bouts=False), "corde_arbre")


def lanterne(L, U, q, grosse=True, crochet=0.12):
    """Une lanterne pendue à son crochet (grosse : elle fait un halo la nuit, sur le site)."""
    x, y, z = q
    L.ajouter(*N.poutre((x, y, z + 0.05), (x, y, z + crochet), 0.012), "fer")
    L.ajouter(*N.cylindre(0.05 if grosse else 0.035, 0.0, 0.05, 5), "fer", T(x, y, z + 0.04))
    U.ajouter(*N.sphere(0.062 if grosse else 0.04, 8 if grosse else 5, 6 if grosse else 3, 1.2), "lumiere", T(x, y, z - 0.03))


def cabane(L, V, U, rng, M, lx=1.2, ly=0.85, hm=0.62, ht=0.42, porte=True):
    """La cabane de planches (sa façade, local -y, porte et fenêtres ; le faîte le long de x), le toit de bardeaux, le tuyau
    de poêle. Renvoie le haut du tuyau (pour la fumée)."""
    L.ajouter(*N.boite(lx, ly, hm, haut=False), "planches_claires", M)
    L.ajouter(*N.pignons(lx, ly, ht), "planches_claires", M @ T(0, 0, hm))
    v, f = N.toit_pignon(lx, ly, ht, 0.12, 0.05)
    L.ajouter(v, [f[0], f[4]], "bardeaux", M @ T(0, 0, hm))
    L.ajouter(v, [q for k, q in enumerate(f) if k not in (0, 4)], "planches_sombres", M @ T(0, 0, hm))
    L.ajouter(*N.poutre((-lx / 2 - 0.14, 0, hm + ht + 0.05), (lx / 2 + 0.14, 0, hm + ht + 0.05), 0.06), "planches_sombres", M)
    for sx in (-1, 1):  # les poteaux d'angle
        for sy in (-1, 1):
            L.ajouter(*N.boite(0.06, 0.06, hm), "poutre", M @ T(sx * (lx / 2 - 0.01), sy * (ly / 2 - 0.01), 0))
    Mf = M @ T(0, -ly / 2, 0)
    if porte:
        L.ajouter(*N.quad((-0.13, -0.012, 0.0), (0.13, -0.012, 0.0), (0.13, -0.012, 0.44), (-0.13, -0.012, 0.44)), "porte", Mf)
        P.plaque_mur(L, "poutre", Mf, -0.17, 0.47, 0.17, 0.47, 0.06, 0.02)
    for xf in (-0.4, 0.4):
        P.fenetre(L, V, rng, Mf, xf, 0.22, 0.2, 0.22, volets="peint_vert", allumee=True)
    for s in (-1, 1):  # une fenêtre à chaque pignon
        P.fenetre(L, V, rng, M @ Rz(s * PI / 2) @ T(0, -lx / 2, 0), 0, 0.24, 0.2, 0.22, allumee=s > 0)
    # le tuyau du poêle, qui sort du toit côté arrière
    xc, yc = lx * 0.28, ly * 0.22
    zc = hm + ht * (1 - yc / (ly / 2)) + 0.02
    L.ajouter(*N.cylindre(0.045, 0.045, 0.42, 7), "fer", M @ T(xc, yc, zc - 0.05))
    L.ajouter(*N.cylindre(0.08, 0.0, 0.06, 7), "fer", M @ T(xc, yc, zc + 0.4))
    return tuple((M @ np.array((xc, yc, zc + 0.55, 1.0)))[:3])


def cabane_ronde(L, V, U, rng, M, r=0.5, h=0.6):
    """La cabane ronde de l'est : un mur de planches debout, un toit pointu de bardeaux et son épi, une porte (local -y), une
    fenêtre ronde, une lanterne."""
    L.ajouter(*N.cylindre(r, r, h, 12, haut=False), "planches_claires", M, tourne=True)
    v, f = N.toit_pointe(r, 0.55, 12, 0.14, 0)
    tour_ = N.Faces(f[:-1])
    tour_.deroule = f.deroule[:-1] if f.deroule else None
    L.ajouter(v, tour_, "bardeaux", M @ T(0, 0, h))
    L.ajouter(*N.cylindre(0.025, 0.012, 0.25, 5), "fer", M @ T(0, 0, h + 0.5))
    L.ajouter(*N.cylindre(r + 0.02, r + 0.02, 0.05, 12, haut=False), "poutre", M @ T(0, 0, h - 0.06))
    Mf = M @ T(0, -r, 0)
    L.ajouter(*N.quad((-0.12, -0.012, 0.0), (0.12, -0.012, 0.0), (0.12, -0.012, 0.42), (-0.12, -0.012, 0.42)), "porte", Mf)
    for s in (-1, 1):
        Mw = M @ Rz(s * 1.25) @ T(0, -r, 0)
        V.ajouter(*N.boite(0.16, 0.03, 0.16), "vitre", Mw @ T(0, -0.005, 0.26))
        L.ajouter(*N.boite(0.22, 0.03, 0.22), "planches_sombres", Mw @ T(0, 0.006, 0.23))
    q = M @ np.array((0.24, -r - 0.1, 0.5, 1.0))
    lanterne(L, U, tuple(q[:3]))


def pont_de_corde(L, a, b, larg=0.42, fleche=0.12):
    """Un pont de corde de a à b (x, y, z : le dessus des planches) : des planches en travers, deux mains courantes qui
    pendent plus que le tablier, les suspentes, un poteau à chaque coin. Renvoie (le trajet au milieu, les morceaux de
    tablier pour le contrôle)."""
    a, b = np.asarray(a, np.float64), np.asarray(b, np.float64)
    lg = float(np.linalg.norm(b[:2] - a[:2]))
    cap = math.atan2(b[1] - a[1], b[0] - a[0])
    nx, ny = -math.sin(cap), math.cos(cap)
    z = lambda t: a[2] + (b[2] - a[2]) * t - fleche * 4 * t * (1 - t)
    nb = max(3, int(lg / 0.13))
    trajet, cotes = [], {-1: [], 1: []}
    for k in range(nb + 1):
        t = k / nb
        x, y = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
        pente = ((z(min(1, t + 0.02)) - z(max(0, t - 0.02))) / (0.04 * lg))
        L.ajouter(*N.boite(0.1, larg, 0.03), "planches_claires", T(x, y, z(t) - 0.03) @ Rz(cap) @ Ry(-math.atan(pente)))
        trajet.append((x, y, z(t) + 0.02))
        for s in (-1, 1):
            cotes[s].append((x + nx * s * (larg / 2 + 0.01), y + ny * s * (larg / 2 + 0.01), z(t)))
    zm = lambda t: a[2] + (b[2] - a[2]) * t + 0.44 - (fleche + 0.08) * 4 * t * (1 - t)
    for s in (-1, 1):
        main = [(a[0] + (b[0] - a[0]) * t + nx * s * (larg / 2 + 0.02), a[1] + (b[1] - a[1]) * t + ny * s * (larg / 2 + 0.02), zm(t)) for t in (k / 10 for k in range(11))]
        L.ajouter(*N.tube(main, 0.013, 4, bouts=False), "corde_arbre")
        L.ajouter(*N.tube(cotes[s][::2] + [cotes[s][-1]], 0.012, 4, bouts=False), "corde_arbre")
        for k in range(1, 10, 2):
            q = cotes[s][int(k / 10 * nb)]
            L.ajouter(*N.poutre(q, main[k], 0.008), "corde_arbre")
        for q in (main[0], main[-1]):
            L.ajouter(*N.poutre((q[0], q[1], q[2] - 0.5), (q[0], q[1], q[2] + 0.05), 0.045), "planches_sombres")
    ponts = []
    for k in range(4):
        t0, t1 = k / 4, (k + 1) / 4
        m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        ponts.append(Vf.rectangle(a[0] + (b[0] - a[0]) * (t0 + t1) / 2, a[1] + (b[1] - a[1]) * (t0 + t1) / 2, lg / 4 + 0.02, larg, cap))
    return trajet, ponts


def echelons(L, H0, H1, th, pas=0.3):
    """Des échelons cloués sur le tronc, de H0 à H1, et la corde qui pend à côté."""
    k, H = 0, H0
    while H <= H1:
        r = rayon_tronc(H) * bosse(th, H) + 0.03
        a, b = au_tronc(H, th - 0.19 / r, r), au_tronc(H, th + 0.19 / r, r)
        L.ajouter(*N.poutre(a, b, 0.05, 0.035), "planches")
        H += pas
        k += 1
    L.ajouter(*N.tube([au_tronc(H, th + 0.32 / rayon_tronc(H), rayon_tronc(H) + 0.06) for H in np.linspace(H0, H1, 6)], 0.012, 4, bouts=False), "corde_arbre")


def fougere(L, rng, x, y, z, nb=6, h=0.3, lg=0.42, ns=3):
    """Une fougère : des frondes qui jaillissent du cœur, se cambrent et retombent (le site les fait frémir)."""
    for k in range(nb):
        a = k * 2 * PI / nb + rng.random() * 0.5
        l = lg * (0.75 + 0.5 * rng.random())
        ca, sa = math.cos(a), math.sin(a)
        nx, ny = -sa, ca
        v, uv, f = [], [], []
        for i in range(ns + 1):
            t = i / ns
            w = 0.075 * math.sin(PI * min(1.0, 0.12 + t)) ** 0.7 * (1 - 0.6 * t)
            cx, cy, cz = x + ca * l * t, y + sa * l * t, z + h * math.sin(PI * t * 0.8) - 0.1 * t * t
            v += [(cx - nx * w, cy - ny * w, cz), (cx + nx * w, cy + ny * w, cz)]
            uv += [(0.0, t), (1.0, t)]
        for i in range(ns):
            f.append((i * 2, i * 2 + 1, i * 2 + 3, i * 2 + 2))
        debut = len(L.f)
        toile(L, v, f, "fronde", ep=0.006, uv=uv)
        for j in range(debut, len(L.f)):
            i = (j - debut) % ns
            L.zones[j] = (1.0, round(0.85 - 0.12 * i, 2), 1.0)


def buisson(L, rng, x, y, z, r=0.3, fleurs=None):
    """Un buisson bosselé, et parfois ses fleurs."""
    for k in range(2):
        a = rng.random() * 6.28
        d = r * 0.5 * (k > 0)
        rk = r * (1.0 if k == 0 else 0.7)
        v, f = N.sphere(rk, 7, 4, 0.75)
        g = rng.random() * 9
        v = [(a_ * q, b_ * q, c_ * q) for (a_, b_, c_) in v for q in [1 + 0.18 * math.sin(a_ / rk * 4.3 + g) * math.sin(b_ / rk * 3.7 + g)]]
        L.ajouter(v, f, "feuillage_buisson", T(x + math.cos(a) * d, y + math.sin(a) * d, z + rk * 0.55), zone=(1.0, 0.82, 1.0), doux=True)
    if fleurs:
        for k in range(4):
            a, el = rng.random() * 6.28, 0.25 + rng.random() * 0.9
            L.ajouter(*N.sphere(0.04, 4, 3), fleurs, T(x + math.cos(a) * math.cos(el) * r * 0.95, y + math.sin(a) * math.cos(el) * r * 0.95, z + r * 0.55 + math.sin(el) * r * 0.75), zone=(1.0, 0.82, 1.0))


def petit_arbre(L, rng, x, y, z, h=1.6, r=0.7):
    """Un arbre ordinaire de l'île (à côté du Grand, il a l'air d'un arbuste)."""
    a0 = rng.random() * 6.28
    tronc_ = [(x, y, z - 0.2), (x + math.cos(a0) * 0.06 * h, y + math.sin(a0) * 0.06 * h, z + h * 0.4), (x + math.cos(a0 + 1.5) * 0.05 * h, y + math.sin(a0 + 1.5) * 0.05 * h, z + h * 0.72)]
    L.ajouter(*N.tube(tronc_, [0.08 * h, 0.055 * h, 0.035 * h], 6, bouts=False), "ecorce_branche", tourne=True)
    for k in range(3 if N.DETAIL >= 1 else 2):
        a = a0 + k * 2.4
        d = r * (0.0 if k == 0 else 0.5)
        grappe(L, rng, tronc_[2][0] + math.cos(a) * d, tronc_[2][1] + math.sin(a) * d, z + h * (0.86 + 0.1 * (k % 2)), r * (0.75 if k == 0 else 0.55), 0.78, rng.choice(["frondaison", "frondaison_claire"]), fin=False, agite=0.72)


def rocher(L, rng, x, y, z, r=0.3, mat="roche"):
    v, f = N.sphere(r, 7, 4, 0.65)
    g = rng.random() * 9
    v = [(a * q, b * q, c * q) for (a, b, c) in v for q in [1 + 0.25 * math.sin(a / r * 3.1 + g) * math.sin(b / r * 2.7 + g * 1.3) + 0.12 * math.sin(c / r * 6 + g)]]
    L.ajouter(v, f, mat, T(x, y, z + r * 0.15) @ Rz(g))


# ---------- le sol ----------
def tx_sol_arbre(taille=2048, graine=131):
    """Le sol peint pixel par pixel : la grève de la crique, l'herbe grasse et ses fleurs, la mousse et les feuilles mortes
    sous le Grand Arbre (la litière dorée tout autour du tronc), la terre des sentiers, la sciure du chantier, la cendre du
    feu."""
    n = taille
    h = K.agrandir(K.champ(sol, R_SOL), n)
    d = K.agrandir(K.champ(bord, R_SOL), n)
    piste = K.agrandir(K.champ(lambda x, y: min((K.distance_au_trajet(x, y, p) for p in PISTES), default=9.0), R_SOL), n)
    pres = K.agrandir(K.champ(lambda x, y: math.hypot(x - TRONC[0], y - TRONC[1]), R_SOL), n)
    tache = lambda nom: K.agrandir(K.champ(lambda x, y: min((math.hypot(x - a, y - b) - r for a, b, r in ZONES_SOL[nom]), default=9.0), R_SOL), n)
    sciure, cendre = tache("sciure"), tache("cendre")
    b1, b2, b3, fin = N.bruit(n, 7, 7, graine, 4), N.bruit(n, 28, 28, graine + 1, 3), N.bruit(n, 90, 90, graine + 2, 2), N.bruit(n, 256, 256, graine + 3, 1)
    grain, brins = N.bruit(n, 640, 640, graine + 4, 1), N.bruit(n, 760, 250, graine + 5, 1)
    semis = np.random.default_rng(graine + 6).random((n, n)).astype(np.float32)
    rive, mouille = N.hexa(0xe9d6a6), N.hexa(0xa99a78)
    coul = np.broadcast_to(rive, (n, n, 3)).copy() * (0.92 + 0.1 * b1 + 0.06 * fin + 0.1 * (grain - 0.5) - 0.12 * (semis < 0.012))[..., None]
    coul *= (1 + 0.015 * np.sin(d * 15 + b1 * 14 + b2 * 4))[..., None]  # les rides du sable
    coul = N.mel(coul, mouille * (0.88 + 0.18 * b2)[..., None], N.lisse(0.16, 0.02, h + (b2 - 0.5) * 0.06))
    herbe = N.hexa(0x74ab48) * (0.78 + 0.32 * b2 + 0.14 * fin + 0.32 * (brins - 0.5) + 0.1 * (grain - 0.5))[..., None]
    herbe = N.mel(herbe, N.hexa(0x5a9440) * (0.85 + 0.3 * b3)[..., None], N.lisse(0.58, 0.8, b2) * 0.6)
    herbe = N.mel(herbe, N.hexa(0x9db357) * (0.85 + 0.25 * b3)[..., None], N.lisse(0.6, 0.78, b1) * 0.45)
    fleurs = (semis > 0.991) & (h > 0.4)
    herbe = np.where(fleurs[..., None], np.array([1.0, 0.95, 0.78], np.float32), herbe)
    herbe = np.where(((semis < 0.004) & (h > 0.4))[..., None], np.array([1.0, 0.55, 0.75], np.float32), herbe)
    ombre = N.lisse(4.6, 2.6, pres + (b1 - 0.5) * 1.2)  # sous la couronne : la mousse
    mousse = N.hexa(0x4f7f3a) * (0.75 + 0.36 * b3 + 0.2 * (grain - 0.5) + 0.12 * (brins - 0.5))[..., None]
    herbe = N.mel(herbe, mousse, ombre * 0.75)
    litiere = N.hexa(0xa77c3e) * (0.7 + 0.35 * b3 + 0.25 * (fin - 0.5) + 0.2 * (grain - 0.5))[..., None]  # les feuilles mortes
    litiere = N.mel(litiere, N.hexa(0xc9a04a), ((semis > 0.6) & (semis < 0.68)) * 0.6)
    litiere = N.mel(litiere, N.hexa(0x7a5a2e), ((semis > 0.3) & (semis < 0.36)) * 0.6)
    herbe = N.mel(herbe, litiere, N.lisse(2.9, 1.5, pres + (b2 - 0.5) * 0.9) * 0.9)
    coul = N.mel(coul, herbe, N.lisse(0.2, 0.36, h + (b2 - 0.5) * 0.12 + (b3 - 0.5) * 0.08))
    terre = N.hexa(0x8f7150) * (0.82 + 0.28 * b3 + 0.14 * (grain - 0.5) - 0.14 * (semis < 0.02))[..., None]
    coul = N.mel(coul, terre, N.lisse(0.22, 0.08, piste + (b2 - 0.5) * 0.12) * N.lisse(0.18, 0.32, h))
    coul = N.mel(coul, N.hexa(0xdcbf86) * (0.85 + 0.3 * fin)[..., None], N.lisse(0.1, -0.15, sciure + (b3 - 0.5) * 0.3) * 0.85)
    coul = N.mel(coul, N.hexa(0x4a443f) * (0.8 + 0.4 * fin)[..., None], N.lisse(0.05, -0.12, cendre + (b3 - 0.5) * 0.2) * 0.9)
    return np.clip(coul, 0, 1).astype(np.float32), np.clip(0.35 + 0.4 * b3 + 0.2 * fin, 0, 1).astype(np.float32)


N.matiere("sol_arbre", tx_sol_arbre, 2 * R_SOL, 0.35)


# ---------- l'île entière ----------
def mailles(graine=127, leger=False):
    """leger : la version téléphone (un relief moins fin, une couronne moins fournie, moins de monde, trois marcheurs)."""
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
    fumees = []
    lots["etapes"] = []
    etape = lambda nom: lots["etapes"].append((nom, L.triangles()))
    z = lambda p: (p[0], p[1], sol(p[0], p[1]) + 0.02)
    terre = lambda pts: K.suivre(pts, sol)
    dir_ = lambda a: (math.cos(a), math.sin(a))

    # --- le plan : le ponton, la passerelle, l'escalier, la plateforme et ses ponts, les sentiers ---
    ac = math.degrees(CRIQUE)
    pa, pb = np.array(vers(ac, 0.55)), np.array(vers(ac, -2.3))  # le ponton : de la grève vers le large
    dp = (pb - pa) / np.linalg.norm(pb - pa)
    cote_p = np.array((-dp[1], dp[0]))
    lg, ZQ = float(np.linalg.norm(pb - pa)), 0.4
    c0 = axe(H_ESC0)
    pied = (c0[0] + math.cos(TH_ESC0) * 4.3, c0[1] + math.sin(TH_ESC0) * 4.3)  # le pied de la passerelle
    haut_p = (c0[0] + math.cos(TH_ESC0) * (r_escalier(H_ESC0) + 0.6), c0[1] + math.sin(TH_ESC0) * (r_escalier(H_ESC0) + 0.6))
    CAMP = (-2.15, -3.0)
    CHANTIER = (2.55, -2.35)
    racine_arche = math.radians(-78)

    # le trajet de celui qui monte : du bout du ponton jusqu'à la porte de la cabane
    etape("l'escalier")
    trajet_esc, ponts_esc = escalier(L, leger)
    ponts += ponts_esc
    haut_t = (c0[0] + math.cos(TH_ESC0) * (r_escalier(H_ESC0) + 0.42), c0[1] + math.sin(TH_ESC0) * (r_escalier(H_ESC0) + 0.42))
    zp0, zp1 = sol(*pied) + 0.03, Z0 + H_ESC0
    Rf.tablier(L, pied, haut_t, zp0, zp1, 0.44)
    lg_p = math.dist(pied, haut_t)
    up = ((haut_t[0] - pied[0]) / lg_p, (haut_t[1] - pied[1]) / lg_p)
    np_ = (-up[1], up[0])
    sur_p = lambda t, s_=0.0, dz=0.0: (pied[0] + up[0] * lg_p * t + np_[0] * s_, pied[1] + up[1] * lg_p * t + np_[1] * s_, zp0 + (zp1 - zp0) * t + dz)
    for k in range(1, int(lg_p / 0.25)):  # les tasseaux, pour ne pas glisser
        t = k * 0.25 / lg_p
        L.ajouter(*N.poutre(sur_p(t, -0.2, 0.012), sur_p(t, 0.2, 0.012), 0.03, 0.022), "planches_sombres")
    for t in (0.4, 0.72):  # les tréteaux
        for s_ in (-0.17, 0.17):
            q = sur_p(t, s_)
            L.ajouter(*N.poutre((q[0], q[1], sol(q[0], q[1]) - 0.15), (q[0], q[1], q[2] - 0.05), 0.05), "planches_sombres")
        L.ajouter(*N.poutre(sur_p(t, -0.2, -0.09), sur_p(t, 0.2, -0.09), 0.05), "planches_sombres")
    for s_ in (-0.21, 0.21):
        rambarde(L, [sur_p(t, s_) for t in (0.2, 0.58, 0.95)], 0.36, 0.5)
    ponts.append(Vf.rectangle((pied[0] + haut_t[0]) / 2, (pied[1] + haut_t[1]) / 2, lg_p, 0.44, math.atan2(up[1], up[0])))
    cA = axe(HA)
    eu, ew = np.array(dir_(TH_CAB)), np.array(dir_(TH_CAB + PI / 2))
    loc = lambda u, w, dz=0.02: (cA[0] + eu[0] * u + ew[0] * w, cA[1] + eu[1] * u + ew[1] * w, Z0 + HA + dz)
    th_fin = TH_ESC0 + TOUR_ESC
    sur_plateforme = [au_tronc(HA, th_fin + 0.1, r_escalier(HA) + 0.35), au_tronc(HA, th_fin + 0.25, 1.62)] + [loc(1.3, -1.17), loc(1.5, -0.79), loc(2.25, -0.79), loc(2.25, -0.05)]
    sur_plateforme = [(x, y, Z0 + HA + 0.02) for x, y, _ in sur_plateforme]
    up0 = (-math.cos(TH_ESC0), -math.sin(TH_ESC0))  # le long de la passerelle, vers le tronc
    sentier1 = terre([tuple(pa - dp * 0.15), (-0.45, -3.3), (-1.35, -2.25), (-2.75, -1.55), (pied[0] - up0[0] * 0.6, pied[1] - up0[1] * 0.6), pied])
    passerelle = [(pied[0], pied[1], sol(*pied) + 0.02), (haut_p[0], haut_p[1], Z0 + H_ESC0 + 0.02)]
    monte = [(*(pa + dp * (lg - 0.6)), ZQ + 0.02), (*(pa + dp * 0.75), ZQ + 0.02), (*(pa + dp * 0.05), sol(*pa) + 0.06)] + sentier1 + passerelle + trajet_esc + sur_plateforme
    sentier2 = terre([(CAMP[0] + 0.55, CAMP[1] + 0.32), (-0.6, -2.55), (0.9, -2.45), (CHANTIER[0] - 0.75, CHANTIER[1] + 0.15)])
    greve = [z(vers(a, 0.45)) for a in np.arange(-134, -104, 3.0)]
    chemins = [  # (points, en rond, vitesse, départ, pause, nom) ; les trois premiers suffisent au téléphone
        (monte, False, 0.17, 0.0, 4.0),
        (sentier2, False, 0.16, 0.35, 3.0),
        (None, False, 0.15, 0.6, 3.5),  # sur le pont de corde de l'est (rempli plus bas)
        (greve, False, 0.32, 0.2, 1.5),  # un mousse qui court sur la grève
        (terre([(3.35, -3.2), (4.15, -2.35), (3.5, -1.45)]), False, 0.12, 0.5, 4.0),  # celui qui porte les planches au chantier
    ]
    PISTES[:] = [sentier1, sentier2]
    ZONES_SOL["sciure"][:] = [(CHANTIER[0], CHANTIER[1], 0.75)]
    ZONES_SOL["cendre"][:] = [(CAMP[0], CAMP[1], 0.32)]

    etape("le terrain")
    # --- le terrain (d'un seul tenant, à sommets partagés) ---
    n, R = (48 if leger else 62), R_SOL
    xs = [-R + 2 * R * i / n for i in range(n + 1)]
    H_ = [[sol(x, y) for x in xs] for y in xs]
    rang, sommets, uvs, faces = {}, [], [], []

    def sommet(i, j):
        if (i, j) not in rang:
            rang[(i, j)] = len(sommets)
            sommets.append((xs[i], xs[j], H_[j][i]))
            uvs.append(((xs[i] + R) / (2 * R), (xs[j] + R) / (2 * R)))
        return rang[(i, j)]

    for j in range(n):
        for i in range(n):
            if max(H_[j][i], H_[j][i + 1], H_[j + 1][i + 1], H_[j + 1][i]) < -0.25:
                continue
            faces.append((sommet(i, j), sommet(i + 1, j), sommet(i + 1, j + 1), sommet(i, j + 1)))
    L.ajouter(sommets, faces, "sol_arbre", uv=uvs)
    L.regrouper(0, None, 4, 0.75)

    etape("le tronc et ses racines")
    # --- le tronc, les contreforts, les racines (l'une fait une arche au-dessus du sentier) ---
    tronc(L, leger)
    SOL.append(("decor", "le pied du Grand Arbre", Vf.rond(TRONC[0], TRONC[1], rayon_tronc(0.0) * 1.05)))
    for k, th in enumerate((-45, 5, 55, 105, 152)):
        contrefort(L, math.radians(th), 1.8 + 0.4 * (k % 2), 0.95, 0.42, 1 if k % 2 else -1)
        SOL.append(("rocher", "un contrefort", Vf.rond(*(np.array(TRONC) + np.array(dir_(math.radians(th))) * (rayon_tronc(0) + 0.6)), 0.5)))
    couloirs = [(monte[:3], 0.3), (monte[3:3 + len(sentier1) + 1], 0.12), (passerelle, 0.3), (sentier2, 0.12), (greve, 0.1), (chemins[4][0], 0.1)]
    loin_des_sentiers = lambda x, y, r: all(K.distance_au_trajet(x, y, pts) > r + rc + 0.05 for pts, rc in couloirs)

    def libre(x, y, r):
        if sol(x, y) < 0.14 or not loin_des_sentiers(x, y, r):
            return False
        if math.hypot(x - TRONC[0], y - TRONC[1]) < rayon_tronc(0) + r + 0.15:
            return False
        if math.hypot(x - pied[0], y - pied[1]) < r + 0.3 or K.distance_au_trajet(x, y, [pied, haut_p]) < r + 0.35:
            return False
        return all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for _, _, p in SOL) and all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for _, p in emprises)

    for k, th in enumerate((-118, -20, 28, 80, 128, 178, -88)):
        if leger and k % 2:
            continue
        a = math.radians(th) + rng.random() * 0.1
        long_ = 2.6 + rng.random() * 1.6
        pts, ray = [], []
        for j in range(8):
            t = j / 7
            rho = rayon_tronc(0) * 0.8 + long_ * t
            aa = a + 0.22 * math.sin(t * 3.1 + k) / max(1.0, rho)
            x, y = TRONC[0] + math.cos(aa) * rho, TRONC[1] + math.sin(aa) * rho
            rr = 0.24 * (1 - t) + 0.05
            if t > 0.15 and not loin_des_sentiers(x, y, rr):
                break
            zz = (Z0 + 0.25) if j == 0 else sol(x, y) + rr * (0.3 if j < 7 else -1.0)
            pts.append((x, y, zz))
            ray.append(rr)
        if len(pts) >= 4:
            racine(L, pts, ray, 6 if not leger else 5)
            for q, rr in zip(pts[1::2], ray[1::2]):
                SOL.append(("rocher", "une racine", Vf.rond(q[0], q[1], rr + 0.06)))
    # l'arche : une grosse racine qui sort de terre, passe au-dessus du sentier et replonge plus loin
    pts, ray = [], []
    for j in range(10):
        t = j / 9
        rho = rayon_tronc(0) * 0.8 + 4.0 * t
        x, y = TRONC[0] + math.cos(racine_arche) * rho, TRONC[1] + math.sin(racine_arche) * rho
        d2 = K.distance_au_trajet(x, y, sentier2)
        leve = 0.62 * math.exp(-(d2 / 0.75) ** 2)
        rr = 0.22 * (1 - t) + 0.07
        zz = (Z0 + 0.25) if j == 0 else sol(x, y) + rr * 0.3 + leve
        if j == 9:
            zz = sol(x, y) - rr
        pts.append((x, y, zz))
        ray.append(rr)
    racine(L, pts, ray, 7 if not leger else 5)
    for q, rr in zip(pts, ray):
        if K.distance_au_trajet(q[0], q[1], sentier2) > 0.5:
            SOL.append(("rocher", "la racine en arche", Vf.rond(q[0], q[1], rr + 0.06)))

    etape("les branches")
    # --- les branches : les deux basses (elles portent les cabanes de l'est et de l'ouest), les cinq maîtresses, la flèche ---
    bE = au_tronc(H_EST, CAP_EST, R_EST)
    branche(L, [au_tronc(2.2, CAP_EST + 0.05, 0.3), au_tronc(2.3, CAP_EST + 0.02, 1.3), au_tronc(2.2, CAP_EST, 2.6), (bE[0], bE[1], Z0 + 2.16), au_tronc(2.6, CAP_EST - 0.06, R_EST + 0.75), au_tronc(3.4, CAP_EST - 0.1, R_EST + 1.05)], [0.36, 0.28, 0.22, 0.17, 0.12, 0.06])
    bO = au_tronc(H_OUEST, CAP_OUEST, R_OUEST)
    branche(L, [au_tronc(3.72, CAP_OUEST, 0.3), au_tronc(3.85, CAP_OUEST - 0.04, 1.3), (bO[0], bO[1], Z0 + 3.98), au_tronc(4.7, CAP_OUEST + 0.05, R_OUEST + 0.7), au_tronc(5.4, CAP_OUEST + 0.08, R_OUEST + 1.0)], [0.32, 0.25, 0.18, 0.11, 0.05])
    maitresses = [(-30, 4.7, 3.3, 6.4), (20, 4.9, 3.5, 6.2), (75, 4.8, 3.2, 6.5), (125, 5.0, 3.0, 6.6), (175, 4.75, 3.4, 6.3)]
    bouts = []
    for k, (az, h0, re, he) in enumerate(maitresses):
        a = math.radians(az)
        tort = 0.12 * (1 if k % 2 else -1)
        pts = [au_tronc(h0 - 0.25, a, 0.25), au_tronc(h0 + 0.45, a + tort, 1.15), au_tronc(he - 0.55, a - tort * 0.5, 2.25), au_tronc(he, a, re)]
        branche(L, pts, [0.36, 0.27, 0.17, 0.1], 8 if not leger else 6)
        bouts.append((pts[-1], a, pts[2]))
    branche(L, [au_tronc(H_VIGIE + 0.1, 0.4, 0.05), au_tronc(H_VIGIE + 0.55, 0.6, 0.12), au_tronc(H_VIGIE + 0.85, 0.5, 0.18)], [0.12, 0.07, 0.03], 5)

    etape("la couronne")
    # --- la couronne : des grappes au bout de chaque maîtresse branche, autour de la flèche, au-dessus des cabanes ---
    grappes = []
    for k, ((ex, ey, ez), a, mil) in enumerate(bouts):
        ca, sa = math.cos(a), math.sin(a)
        offs = [(0.0, 0.0, 0.4, 1.3), (-0.35, 0.95, 0.15, 1.05), (-0.3, -0.95, 0.1, 1.0), (0.65, 0.0, -0.2, 0.95), (-1.1, 0.3, 0.6, 0.9)]
        for j, (du, dw, dz, r) in enumerate(offs[:3 if leger else 4]):
            cx, cy = ex + ca * du - sa * dw, ey + sa * du + ca * dw
            grappes.append((cx, cy, ez + dz, r * (0.92 + 0.16 * rng.random()), (ex, ey, ez)))
    for j, (az, rr, H, r) in enumerate(((-100, 1.3, 7.7, 1.05), (-160, 1.5, 7.4, 1.0), (40, 1.7, 7.9, 1.1), (110, 1.6, 7.6, 1.1), (170, 1.2, 8.05, 0.95), (-30, 1.4, 8.2, 0.9))[:3 if leger else 5]):
        q = au_tronc(H, math.radians(az), rr)
        grappes.append((q[0], q[1], q[2], r, au_tronc(H - 0.8, math.radians(az), 0.2)))
    for (q, H) in ((au_tronc(4.55, CAP_EST - 0.08, R_EST + 0.85), 4.55), (au_tronc(6.2, CAP_OUEST + 0.1, R_OUEST + 0.9), 6.2)):
        grappes.append((q[0], q[1], q[2], 0.9, au_tronc(H - 1.0, math.atan2(q[1] - TRONC[1], q[0] - TRONC[0]), math.hypot(q[0] - TRONC[0], q[1] - TRONC[1]) - 0.3)))
    for k, (cx, cy, cz, r, pied_) in enumerate(grappes):
        branche(L, [pied_, (cx * 0.85 + pied_[0] * 0.15, cy * 0.85 + pied_[1] * 0.15, cz - r * 0.3)], [0.08, 0.03], 5)
        grappe(L, rng, cx, cy, cz, r, 0.6, ("frondaison", "frondaison_claire", "frondaison", "frondaison_sombre", "frondaison_doree")[k % 5], fin=not leger, agite=0.84)

    etape("les nuages")
    # --- le banc de nuages accroché au sommet (il se balance doucement autour de l'arbre) ---
    Nu = N.Maille("nuages")
    oN = (TRONC[0], TRONC[1], Z0 + 7.25)
    for az, rr, dz, nb in ((5, 4.0, 0.15, 5), (80, 3.7, 0.55, 4), (160, 4.2, 0.0, 5)):
        a = math.radians(az)
        for j in range(nb if not leger else nb - 2):
            b = a + (j - nb / 2) * 0.17
            rk = 0.55 + 0.45 * math.sin(PI * (j + 0.5) / nb) + 0.1 * rng.random()
            v, f = N.sphere(rk, 9 if not leger else 6, 5 if not leger else 4, 0.58)
            Nu.ajouter(v, f, "nuage", T(math.cos(b) * (rr + 0.3 * rng.random()), math.sin(b) * (rr + 0.3 * rng.random()), dz + rk * 0.15 + 0.2 * rng.random()), doux=True)
    lots["animes"].append((Nu, oN, {"anim": "balance", "axe": [0.0, 0.0, 1.0], "ampl": 0.1, "vitesse": 0.12, "phase": 0.0}))

    etape("les plateformes")
    # --- la plateforme et la cabane de l'équipage ---
    ponts_A, bord_A = plateforme(L, U, rng, leger)
    ponts += ponts_A
    bA = [(x, y, Z0 + HA) for x, y in bord_A]
    th_pont = math.radians(0)  # le pont de corde part vers l'est
    k_pont = int(round((th_pont % (2 * PI)) / math.radians(4)))
    k_mc = int(round((math.radians(-140) % (2 * PI)) / math.radians(4)))
    rambarde(L, bA + [bA[0]], 0.34, 0.42, ouvert={(k_pont + d) % len(bA) for d in (-2, -1, 0, 1)} | {k_mc})
    etape("la cabane")
    Mc = T(*loc(1.625, 0.0, 0.0)) @ Rz(TH_CAB + PI / 2)
    tuyau = cabane(L, V, U, rng, Mc)
    fumees.append(tuyau)
    lanterne(L, U, loc(2.08, 0.32, 0.55))
    L.ajouter(*N.poutre(loc(2.03, 0.32, 0.6), loc(2.1, 0.32, 0.62), 0.02), "fer")
    P.tonneau(L, T(*loc(2.2, 0.72, 0.0)), 0.08, 0.18)
    P.caisse(L, T(*loc(1.05, -1.42, 0.0)) @ Rz(0.4), 0.16)
    P.banniere(lots, *loc(1.62, 0.0, 0.0)[:2], Z0 + HA + 1.08, 0.5, "rose", TH_CAB + PI / 2, 0.2, 0.42)
    etape("les échelons")
    echelons(L, HA + 0.15, H_VIGIE - 0.1, math.radians(-100))
    etape("le monte-charge")
    # le monte-charge : la potence au bord de la plateforme, la poulie, le treuil ; la charge monte et descend
    am = math.radians(-140)
    q0, q1 = au_tronc(HA, am, 1.82), au_tronc(HA + 0.85, am, 1.82)
    L.ajouter(*N.poutre(q0, q1, 0.07), "poutre")
    qb = au_tronc(HA + 0.85, am, 2.42)
    L.ajouter(*N.poutre(q1, qb, 0.065), "poutre")
    L.ajouter(*N.poutre(au_tronc(HA + 0.35, am, 1.82), au_tronc(HA + 0.82, am, 2.15), 0.045), "poutre")
    L.ajouter(*N.cylindre(0.075, 0.075, 0.04, 9, bas=True), "planches_sombres", T(qb[0], qb[1], qb[2] - 0.08) @ Rz(am) @ Rx(PI / 2) @ T(0, 0, -0.02))
    sol_mc = sol(qb[0], qb[1])
    L.ajouter(*N.poutre((qb[0], qb[1], qb[2] - 0.12), (qb[0], qb[1], sol_mc + 0.05), 0.012), "corde_arbre")
    L.ajouter(*N.cylindre(0.025, 0.02, 0.12, 5), "planches_sombres", T(qb[0], qb[1], sol_mc - 0.06))
    at = am - 0.2
    tr = au_tronc(HA, at, 1.68)
    L.ajouter(*N.poutre(q1, (tr[0], tr[1], tr[2] + 0.22), 0.012), "corde_arbre")
    for s in (-1, 1):
        L.ajouter(*N.boite(0.05, 0.05, 0.22), "planches_sombres", T(*au_tronc(HA, at + s * 0.1, 1.68)))
    L.ajouter(*N.cylindre(0.06, 0.06, 0.3, 8, bas=True), "planches", T(tr[0], tr[1], tr[2] + 0.2) @ Rz(at + PI / 2) @ Ry(PI / 2) @ T(0, 0, -0.15))
    SOL.append(("dur", "le monte-charge", Vf.rond(qb[0], qb[1], 0.32)))
    Ch = N.Maille("charge")
    for j in range(5):
        Ch.ajouter(*N.boite(0.72, 0.075, 0.035), "planches_claires", T(0, (j - 2) * 0.08, 0.035 * (j % 2)))
    for sx in (-0.24, 0.24):
        Ch.ajouter(*N.boite(0.025, 0.44, 0.09), "corde_arbre", T(sx, 0, -0.015))
        Ch.ajouter(*N.poutre((sx, 0, 0.07), (0, 0, 0.36), 0.012), "corde_arbre")
    Ch.ajouter(*N.cylindre(0.03, 0.03, 0.02, 6), "fer", T(0, 0, 0.36))
    haut_charge = Z0 + HA - 0.5
    lots["animes"].append((Ch, (qb[0], qb[1], sol_mc + 0.04), {"anim": "marche", "suspendu": True, "chemin": [float(qb[0]), float(qb[1]), float(sol_mc + 0.04), float(qb[0]), float(qb[1]), float(haut_charge)], "vitesse": 0.14, "phase": 0.3, "saut": 0.0, "pause": 5.0}))
    ap = math.radians(-123)
    pile = au_tronc(0.0, ap, 2.7)[:2]
    for j in range(6):
        L.ajouter(*N.boite(0.9, 0.09, 0.04), "planches_claires", T(pile[0], pile[1], sol(*pile) + 0.04 * j) @ Rz(ap + 0.04 * (j % 3 - 1)) @ T(0, ((j % 3) - 1) * 0.1, 0))
    SOL.append(("dur", "la pile de planches", Vf.rectangle(pile[0], pile[1], 0.95, 0.4, ap)))

    etape("le pont de l'est")
    # --- le pont de corde vers la cabane ronde de l'est ---
    cE = au_tronc(H_EST, CAP_EST, R_EST)
    dE = np.array(cE[:2]) - np.array(au_tronc(HA, th_pont, 1.95)[:2])
    entree = np.array(cE[:2]) - dE / np.linalg.norm(dE) * 0.86
    depart = au_tronc(HA, th_pont, 1.92)
    trajet_pont, ponts_pont = pont_de_corde(L, depart, (entree[0], entree[1], Z0 + H_EST), 0.42, 0.13)
    ponts += ponts_pont
    etape("la cabane de l'est")
    # le plancher de la cabane de l'est (sur la branche), sa rambarde, la cabane
    oct_ = [(cE[0] + math.cos(k * PI / 6 + PI / 12) * 0.94, cE[1] + math.sin(k * PI / 6 + PI / 12) * 0.94) for k in range(12)]
    L.ajouter(*N.polygone(oct_, Z0 + H_EST - 0.06, Z0 + H_EST), "pont")
    ponts.append(oct_)
    for k in range(4):
        a = k * PI / 2 + 0.4
        L.ajouter(*N.poutre((cE[0] + math.cos(a) * 0.7, cE[1] + math.sin(a) * 0.7, Z0 + H_EST - 0.07), (cE[0] + math.cos(a) * 0.2, cE[1] + math.sin(a) * 0.2, Z0 + 2.2), 0.05), "poutre")
    cap_porte_E = math.atan2(-0.62, -0.78)  # la porte regarde le sud-ouest (vers le pont et la côte)
    Mr = T(cE[0], cE[1], Z0 + H_EST) @ Rz(cap_porte_E + PI / 2)
    cabane_ronde(L, V, U, rng, Mr)
    a_pont = math.atan2(-dE[1], -dE[0])
    pts_r = [(cE[0] + math.cos(a_pont + 0.3 + k * (2 * PI - 0.6) / 16) * 0.9, cE[1] + math.sin(a_pont + 0.3 + k * (2 * PI - 0.6) / 16) * 0.9, Z0 + H_EST) for k in range(17)]
    rambarde(L, pts_r, 0.32, 0.4)
    tour_E = [(cE[0] + math.cos(a) * 0.7, cE[1] + math.sin(a) * 0.7, Z0 + H_EST + 0.02) for a in np.linspace(a_pont, cap_porte_E if cap_porte_E > a_pont else cap_porte_E + 2 * PI, 5)]
    trajet_E = [au_tronc(HA, th_pont, 1.45)] + trajet_pont + tour_E
    trajet_E = [(x, y, zz if k else Z0 + HA + 0.02) for k, (x, y, zz) in enumerate(trajet_E)]
    chemins[2] = (trajet_E, False, 0.15, 0.6, 3.5)

    etape("la cabane de l'ouest")
    # --- la cabane qu'on construit, à l'ouest : le plancher, la charpente, l'échafaudage, les charpentiers ---
    cO = au_tronc(H_OUEST, CAP_OUEST, R_OUEST)
    oct_ = [(cO[0] + math.cos(k * PI / 4 + PI / 8) * 0.78, cO[1] + math.sin(k * PI / 4 + PI / 8) * 0.78) for k in range(8)]
    L.ajouter(*N.polygone(oct_, Z0 + H_OUEST - 0.06, Z0 + H_OUEST), "pont")
    ponts.append(oct_)
    Mo = T(cO[0], cO[1], Z0 + H_OUEST) @ Rz(math.radians(215) + PI / 2)  # local -y : la façade, vers le sud-ouest
    lxo, lyo, hmo = 0.95, 0.7, 0.6
    for sx in (-1, 1):
        for sy in (-1, 1):
            L.ajouter(*N.boite(0.06, 0.06, hmo), "planches", Mo @ T(sx * lxo / 2, sy * lyo / 2, 0))
    for sy in (-1, 1):
        L.ajouter(*N.poutre((-lxo / 2 - 0.05, sy * lyo / 2, hmo + 0.03), (lxo / 2 + 0.05, sy * lyo / 2, hmo + 0.03), 0.06), "planches", Mo)
    for sx in (-1, 1):
        L.ajouter(*N.poutre((sx * lxo / 2, -lyo / 2 - 0.05, hmo + 0.03), (sx * lxo / 2, lyo / 2 + 0.05, hmo + 0.03), 0.06), "planches", Mo)
    for k in range(3):  # les chevrons (le toit n'est pas encore couvert)
        xk = -lxo / 2 + lxo * k / 2
        for sy in (-1, 1):
            L.ajouter(*N.poutre((xk, sy * (lyo / 2 + 0.1), hmo - 0.02), (xk, 0, hmo + 0.36), 0.04), "planches", Mo)
    L.ajouter(*N.poutre((-lxo / 2 - 0.08, 0, hmo + 0.36), (lxo / 2 + 0.08, 0, hmo + 0.36), 0.05), "planches", Mo)
    for j in range(6):  # le mur de derrière, déjà fermé ; un côté à moitié
        L.ajouter(*N.boite(lxo, 0.03, 0.09), "planches_claires", Mo @ T(0, lyo / 2, j * 0.1))
    for j in range(3):
        L.ajouter(*N.boite(0.03, lyo, 0.09), "planches_claires", Mo @ T(-lxo / 2, 0, j * 0.1))
    for sx in (-0.32, 0.32):  # l'échafaudage devant la façade
        L.ajouter(*N.poutre(tuple((Mo @ np.array((sx, -lyo / 2 - 0.28, -0.02, 1)))[:3]), tuple((Mo @ np.array((sx, -lyo / 2 - 0.28, 0.75, 1)))[:3]), 0.035), "planches_grises")
    L.ajouter(*N.boite(0.8, 0.16, 0.03), "planches_grises", Mo @ T(0, -lyo / 2 - 0.2, 0.32))
    for j in range(4):
        L.ajouter(*N.boite(0.7, 0.08, 0.035), "planches_claires", Mo @ T(0.15, 0.18, 0.035 * j) @ Rz(0.1))
    lanterne(L, U, tuple((Mo @ np.array((lxo / 2 + 0.06, -lyo / 2, hmo + 0.02, 1)))[:3]), True, 0.08)
    # l'échelle de corde, de la plateforme à la cabane de l'ouest
    pied_e = au_tronc(HA, CAP_OUEST + 0.12, 1.72)
    haut_e = (cO[0] + (pied_e[0] - cO[0]) * 0.6 / math.dist(pied_e[:2], cO[:2]), cO[1] + (pied_e[1] - cO[1]) * 0.6 / math.dist(pied_e[:2], cO[:2]), Z0 + H_OUEST)
    for s in (-1, 1):
        dx, dy = -math.sin(CAP_OUEST) * 0.12 * s, math.cos(CAP_OUEST) * 0.12 * s
        L.ajouter(*N.poutre((pied_e[0] + dx, pied_e[1] + dy, pied_e[2]), (haut_e[0] + dx, haut_e[1] + dy, haut_e[2] + 0.05), 0.014), "corde_arbre")
    for j in range(1, 6):
        t = j / 6
        q = [pied_e[i] + (haut_e[i] - pied_e[i]) * t for i in range(3)]
        L.ajouter(*N.poutre((q[0] - math.sin(CAP_OUEST) * 0.12, q[1] + math.cos(CAP_OUEST) * 0.12, q[2]), (q[0] + math.sin(CAP_OUEST) * 0.12, q[1] - math.cos(CAP_OUEST) * 0.12, q[2]), 0.03), "planches")

    etape("la vigie")
    # --- la vigie, tout en haut : le plancher, la rambarde, la longue-vue, le drapeau, le ruban noir ---
    cV = axe(H_VIGIE)
    oct_ = [(cV[0] + math.cos(k * PI / 4 + PI / 8) * 0.62, cV[1] + math.sin(k * PI / 4 + PI / 8) * 0.62) for k in range(8)]
    L.ajouter(*N.polygone(oct_, Z0 + H_VIGIE - 0.06, Z0 + H_VIGIE), "pont")
    for k in range(4):
        a = k * PI / 2 + 0.3
        L.ajouter(*N.poutre((cV[0] + math.cos(a) * 0.55, cV[1] + math.sin(a) * 0.55, Z0 + H_VIGIE - 0.06), au_tronc(H_VIGIE - 0.7, a, rayon_tronc(H_VIGIE - 0.7) * 0.9), 0.045), "poutre")
    rambarde(L, [(x, y, Z0 + H_VIGIE) for x, y in oct_] + [(oct_[0][0], oct_[0][1], Z0 + H_VIGIE)], 0.32, 0.3, ouvert=(5,))
    vue = math.radians(40)  # la longue-vue regarde le nord-est : le bord de la carte
    pt = au_tronc(H_VIGIE, vue, 0.46)
    for k in range(3):
        a = k * 2 * PI / 3
        L.ajouter(*N.poutre((pt[0] + math.cos(a) * 0.08, pt[1] + math.sin(a) * 0.08, pt[2]), (pt[0], pt[1], pt[2] + 0.3), 0.018), "planches_sombres")
    L.ajouter(*N.cylindre(0.03, 0.022, 0.36, 7), "cuivre", T(pt[0], pt[1], pt[2] + 0.31) @ Rz(vue) @ Ry(PI / 2 - 0.12) @ T(0, 0, -0.12))
    P.passant(L, rng, *au_tronc(H_VIGIE, vue + 0.95, 0.47)[:2], angle=vue, z=Z0 + H_VIGIE, leve=1)
    P.banniere(lots, *au_tronc(H_VIGIE, vue + PI, 0.5)[:2], Z0 + H_VIGIE, 0.95, "rose", vue + PI / 2, 0.24, 0.5)
    rq = au_tronc(H_VIGIE + 0.3, vue - 0.5, 0.62)
    toile(L, [rq, (rq[0] + 0.1, rq[1] - 0.12, rq[2] - 0.18), (rq[0] + 0.03, rq[1] - 0.04, rq[2] - 0.3), (rq[0] - 0.02, rq[1] + 0.01, rq[2] - 0.05)], [(0, 1, 2, 3)], "ruban_noir", zone=(1.0, 0.5, 1.0))
    ql = au_tronc(H_VIGIE + 0.3, vue - PI / 2, 0.6)
    lanterne(L, U, ql, True, 0.1)

    etape("le bas")
    # --- le ponton de la crique, la barque, la grève ---
    pr = pa + dp * 0.7  # la rampe : du sable jusqu'au plancher
    Rf.tablier(L, tuple(pa), tuple(pr), sol(*pa) + 0.03, ZQ, 0.55)
    Rf.tablier(L, tuple(pr), tuple(pb), ZQ, ZQ, 0.55)
    for k in range(int(lg / 0.6) + 1):
        for s in (-1, 1):
            q = pa + dp * (0.2 + k * 0.6) + cote_p * s * 0.24
            L.ajouter(*N.cylindre(0.04, 0.035, 1.3, 6, haut=False), "planches_sombres", T(q[0], q[1], -0.85))
    ponts.append(Vf.rectangle(*(pa + dp * lg / 2), lg, 0.55, math.atan2(dp[1], dp[0])))
    emprises.append(("le ponton", ponts[-1]))
    lp = pa + dp * (lg - 0.1) + cote_p * 0.22
    L.ajouter(*N.cylindre(0.03, 0.025, 0.75, 5), "planches_sombres", T(lp[0], lp[1], ZQ))
    L.ajouter(*N.poutre((lp[0], lp[1], ZQ + 0.72), (lp[0] - cote_p[0] * 0.14, lp[1] - cote_p[1] * 0.14, ZQ + 0.72), 0.02), "fer")
    lanterne(L, U, (lp[0] - cote_p[0] * 0.14, lp[1] - cote_p[1] * 0.14, ZQ + 0.6), True, 0.1)
    brq = pa + dp * (lg - 0.9) + cote_p * 0.6
    cap_b = math.atan2(dp[1], dp[0])
    P.barque(L, rng, brq[0], brq[1], cap_b, 0.9)
    emprises.append(("la barque", Vf.rectangle(brq[0], brq[1], 0.9, 0.36, cap_b)))
    sable = vers(-79, 0.32)
    Mb = T(sable[0], sable[1], sol(*sable) + 0.06) @ Rz(math.radians(-79) + PI * 0.92) @ Rx(0.12)
    bq = N.Maille("barque_sec")
    P.barque(bq, rng, 0, 0, 0.0, 0.85)
    fondre(L, bq, Mb)
    SOL.append(("dur", "la barque tirée au sec", Vf.rectangle(sable[0], sable[1], 0.9, 0.38, math.radians(-79) + PI * 0.92)))
    for k, (dx, dy) in enumerate(((0.32, 0.18), (0.45, -0.12))):
        q = pa - dp * 0.35 + cote_p * dx + dp * dy
        (P.caisse if k == 0 else P.tonneau)(L, T(q[0], q[1], sol(q[0], q[1])) @ Rz(0.5))
        SOL.append(("dur", "le fret du ponton", Vf.rond(q[0], q[1], 0.15)))
    etape("les cocotiers")
    for k, (a, dd, hh, pc) in enumerate(((-128, 0.85, 2.0, -60), (-62, 0.9, 1.85, -120))[:1 if leger else 2]):
        x, y = vers(a, dd)
        Pl.palmier(L, rng, x, y, hh, 0.5, math.radians(pc), True, sol(x, y))
        SOL.append(("arbre", "un cocotier", Vf.rond(x, y, 0.2)))

    etape("le feu de camp")
    # --- le feu de camp ---
    fz = sol(*CAMP)
    for k in range(8):
        a = k * 2 * PI / 8
        L.ajouter(*N.sphere(0.07 + 0.02 * (k % 2), 6, 4, 0.75), "roche", T(CAMP[0] + math.cos(a) * 0.24, CAMP[1] + math.sin(a) * 0.24, fz + 0.02) @ Rz(k))
    for k in range(3):
        a = k * PI / 3
        L.ajouter(*N.poutre((CAMP[0] - math.cos(a) * 0.17, CAMP[1] - math.sin(a) * 0.17, fz + 0.05), (CAMP[0] + math.cos(a) * 0.17, CAMP[1] + math.sin(a) * 0.17, fz + 0.07), 0.04), "planches_sombres")
    for k in range(3):  # le trépied et la marmite
        a = k * 2 * PI / 3 + 0.3
        L.ajouter(*N.poutre((CAMP[0] + math.cos(a) * 0.3, CAMP[1] + math.sin(a) * 0.3, fz), (CAMP[0], CAMP[1], fz + 0.55), 0.022), "planches_sombres")
    L.ajouter(*N.poutre((CAMP[0], CAMP[1], fz + 0.55), (CAMP[0], CAMP[1], fz + 0.36), 0.01), "fer")
    L.ajouter(*N.cylindre(0.1, 0.12, 0.12, 8), "fer", T(CAMP[0], CAMP[1], fz + 0.24))
    Fl = N.Maille("flammes")
    Fl.ajouter(*N.cylindre(0.11, 0.0, 0.2, 6, haut=False), "lumiere", T(0, 0, 0))
    Fl.ajouter(*N.cylindre(0.06, 0.0, 0.14, 5, haut=False), "lumiere", T(0.06, 0.03, 0))
    lots["libres"].append((Fl, (CAMP[0], CAMP[1], fz + 0.04), {"anim": "clignote"}))
    SOL.append(("dur", "le feu", Vf.rond(CAMP[0], CAMP[1], 0.4)))
    fumees.append((CAMP[0], CAMP[1], fz + 0.6))
    for k, a in enumerate((2.0, 3.6, 5.0)):  # les bancs : des rondins
        q = (CAMP[0] + math.cos(a) * 0.75, CAMP[1] + math.sin(a) * 0.75)
        L.ajouter(*N.tube([(q[0] - math.sin(a) * 0.28, q[1] + math.cos(a) * 0.28, sol(*q) + 0.08), (q[0] + math.sin(a) * 0.28, q[1] - math.cos(a) * 0.28, sol(*q) + 0.08)], 0.08, 7), "ecorce_branche")
        SOL.append(("dur", "un banc", Vf.rectangle(q[0], q[1], 0.2, 0.62, a)))

    etape("le chantier")
    # --- le chantier du bois : le grand chevalet et sa grume, la scie de long, les planches, l'établi, les souches ---
    cz = sol(*CHANTIER)
    a_c = 0.35
    Mch = T(CHANTIER[0], CHANTIER[1], cz) @ Rz(a_c)
    for sx in (-0.55, 0.55):
        for sy in (-1, 1):
            L.ajouter(*N.poutre(tuple((Mch @ np.array((sx, sy * 0.2, -0.02, 1)))[:3]), tuple((Mch @ np.array((sx, 0, 0.42, 1)))[:3]), 0.04), "planches_sombres")
    L.ajouter(*N.tube([tuple((Mch @ np.array((-0.9, 0, 0.52, 1)))[:3]), tuple((Mch @ np.array((0.9, 0, 0.5, 1)))[:3])], [0.11, 0.09], 8), "ecorce_branche", tourne=True)
    L.ajouter(*N.boite(0.012, 0.92, 0.09), "fer", Mch @ T(0.15, 0, 0.5))
    for s_ in (-1, 1):
        L.ajouter(*N.poutre(tuple((Mch @ np.array((0.15, s_ * 0.46, 0.5, 1)))[:3]), tuple((Mch @ np.array((0.15, s_ * 0.46, 0.66, 1)))[:3]), 0.025), "planches")
    SOL.append(("dur", "le chevalet", Vf.rectangle(CHANTIER[0], CHANTIER[1], 1.9, 0.5, a_c)))
    for s in (-1, 1):
        q = Mch @ np.array((0.15, s * 0.42, 0, 1))
        P.passant(L, rng, q[0], q[1], angle=a_c - s * PI / 2, z=sol(q[0], q[1]), leve=1 if s > 0 else 0)
        SOL.append(("passant", "un scieur de long", Vf.rond(q[0], q[1], 0.07)))
    est = Mch @ np.array((0.3, 0.95, 0, 1))
    Me = T(est[0], est[1], sol(est[0], est[1])) @ Rz(a_c + 0.2)
    L.ajouter(*N.boite(0.74, 0.34, 0.04, bas=True), "planches", Me @ T(0, 0, 0.3))
    for sx in (-0.32, 0.32):
        for sy in (-0.13, 0.13):
            L.ajouter(*N.boite(0.045, 0.045, 0.3), "planches_sombres", Me @ T(sx, sy, -0.02))
    L.ajouter(*N.boite(0.66, 0.04, 0.04), "planches_sombres", Me @ T(0, 0, 0.1))
    L.ajouter(*N.boite(0.14, 0.05, 0.03), "fer", Me @ T(0.15, 0.05, 0.34) @ Rz(0.7))
    L.ajouter(*N.boite(0.3, 0.06, 0.03), "planches_claires", Me @ T(-0.15, -0.04, 0.34) @ Rz(-0.2))
    SOL.append(("dur", "l'établi", Vf.rectangle(est[0], est[1], 0.75, 0.36, a_c + 0.2)))
    tas = Mch @ np.array((-0.4, -1.0, 0, 1))
    for j in range(4 if leger else 7):
        L.ajouter(*N.boite(1.0, 0.1, 0.04), "planches_claires", T(tas[0], tas[1], sol(tas[0], tas[1]) + 0.04 * j) @ Rz(a_c + 0.02 * (j % 2)) @ T(0, ((j % 3) - 1) * 0.11, 0))
    SOL.append(("dur", "le tas de planches", Vf.rectangle(tas[0], tas[1], 1.05, 0.42, a_c)))
    for k, (dx, dy) in enumerate(((1.15, -0.4), (-1.25, -0.6))[:1 if leger else 2]):
        q = Mch @ np.array((dx, dy, 0, 1))
        L.ajouter(*N.cylindre(0.13, 0.15, 0.2, 8), "ecorce_branche", T(q[0], q[1], sol(q[0], q[1]) - 0.05), tourne=True)
        L.ajouter(*N.cylindre(0.125, 0.125, 0.01, 8), "planches_claires", T(q[0], q[1], sol(q[0], q[1]) + 0.15))
        SOL.append(("dur", "une souche", Vf.rond(q[0], q[1], 0.16)))
    hache = Mch @ np.array((1.15, -0.4, 0, 1))
    L.ajouter(*N.poutre((hache[0], hache[1], sol(hache[0], hache[1]) + 0.16), (hache[0] + 0.12, hache[1], sol(hache[0], hache[1]) + 0.42), 0.02), "planches")
    L.ajouter(*N.boite(0.08, 0.02, 0.06), "fer", T(hache[0], hache[1], sol(hache[0], hache[1]) + 0.12))

    etape("la balançoire")
    # --- la balançoire, sous la branche de l'est (un objet à part, qui se balance) ---
    rs = 2.05
    piv = au_tronc(2.2 - 0.2, CAP_EST, rs)
    zs = sol(piv[0], piv[1])
    lc = piv[2] - (zs + 0.46)
    Ba = N.Maille("balancoire")
    for sx in (-0.15, 0.15):
        Ba.ajouter(*N.poutre((sx, 0, 0), (sx, 0, -lc), 0.013), "corde_arbre")
    Ba.ajouter(*N.boite(0.38, 0.13, 0.03), "planches", T(0, 0, -lc - 0.03))
    Ef = N.Maille("enfant")
    P.passant(Ef, rng, 0, 0, angle=PI / 2, z=0.0)
    fondre(Ba, Ef, T(0, 0, -lc) @ np.diag([0.72, 0.72, 0.72, 1.0]))
    lots["animes"].append((Ba, piv, {"anim": "balance", "axe": [math.cos(CAP_EST), math.sin(CAP_EST), 0.0], "ampl": 0.42, "vitesse": 1.5, "phase": 0.0}))
    L.ajouter(*N.cylindre(0.05, 0.05, 0.36, 6), "corde_arbre", T(piv[0], piv[1], piv[2] + 0.06) @ Rz(CAP_EST) @ Ry(PI / 2) @ T(0, 0, -0.18))
    SOL.append(("dur", "la balançoire", Vf.rectangle(piv[0], piv[1], 0.55, 1.6, CAP_EST)))

    etape("les gens")
    # --- les gens (immobiles) : autour du feu, au treuil, au bout du ponton, à la cabane qu'on construit ---
    def poser(x, y, cap, zz=None, leve=0, genre="un pirate"):
        if zz is None and not libre(x, y, 0.07):
            return
        P.passant(L, rng, x, y, angle=cap, z=sol(x, y) if zz is None else zz, leve=leve)
        SOL.append(("passant", genre, Vf.rond(x, y, 0.065)))

    for a in (2.4, 4.3, 0.2)[:2 if leger else 3]:
        poser(CAMP[0] + math.cos(a) * 0.52, CAMP[1] + math.sin(a) * 0.52, a + PI)
    q = au_tronc(HA, at - 0.22, 1.74)
    poser(q[0], q[1], at - 0.22 + PI / 2, Z0 + HA, genre="celui qui tourne le treuil")
    poser(*(pa + dp * (lg - 0.25) - cote_p * 0.12), math.atan2(dp[1], dp[0]), ZQ)
    q = Mo @ np.array((0.0, -lyo / 2 - 0.2, 0.35, 1))
    poser(q[0], q[1], CAP_OUEST + PI, q[2], leve=1, genre="le charpentier sur l'échafaudage")
    if not leger:
        q = Mo @ np.array((0.15, 0.0, 0.0, 1))
        poser(q[0], q[1], CAP_OUEST + 0.6, Z0 + H_OUEST, genre="le charpentier")
        poser(qb[0] + 0.3, qb[1] + 0.25, am + PI, None, genre="celui qui attache les planches")
        q = loc(2.27, 0.46)
        poser(q[0], q[1], TH_CAB, Z0 + HA)

    etape("les plantes")
    # --- les plantes : des fougères à l'ombre, des buissons fleuris, des arbres ordinaires près de la côte, des rochers ---
    for x, y, h, r in ((-4.3, 2.7, 1.7, 0.75), (3.8, 3.6, 1.5, 0.7), (4.9, -0.9, 1.4, 0.65), (-1.9, 4.9, 1.6, 0.72), (-4.9, -1.9, 1.3, 0.6), (1.6, 5.0, 1.4, 0.62))[:3 if leger else 5]:
        if libre(x, y, 0.2):
            petit_arbre(L, rng, x, y, sol(x, y), h, r)
            SOL.append(("arbre", "un arbre", Vf.rond(x, y, 0.15)))
    faits = 0
    for essai in range(400):
        if faits >= (5 if leger else 13):
            break
        a, d = rng.random() * 2 * PI, 1.6 + rng.random() * 3.0
        x, y = TRONC[0] + math.cos(a) * d, TRONC[1] + math.sin(a) * d
        if not libre(x, y, 0.5):
            continue
        fougere(L, rng, x, y, sol(x, y), 4 if leger else 6)
        SOL.append(("rocher", "une fougère", Vf.rond(x, y, 0.45)))
        faits += 1
    faits = 0
    for essai in range(400):
        if faits >= (3 if leger else 7):
            break
        x, y = vers(rng.random() * 360, 0.9 + rng.random() * 2.0)
        if not libre(x, y, 0.32):
            continue
        buisson(L, rng, x, y, sol(x, y), 0.24 + 0.1 * rng.random(), rng.choice([None, "fleur_rose", "fleur_rouge", "fleur_jaune", "fleur_blanche"]))
        SOL.append(("rocher", "un buisson", Vf.rond(x, y, 0.3)))
        faits += 1
    faits = 0
    for essai in range(300):
        if faits >= (3 if leger else 8):
            break
        x, y = vers(rng.random() * 360, 0.05 + rng.random() * 0.35)
        if abs(_ecart(math.atan2(y, x), CRIQUE)) < 0.6:
            continue
        r = 0.18 + rng.random() * 0.25
        if any(Vf.penetration(Vf.rond(x, y, r), p) > 0 for _, _, p in SOL) or not loin_des_sentiers(x, y, r):
            continue
        rocher(L, rng, x, y, sol(x, y), r, rng.choice(["roche", "roche_claire"]))
        SOL.append(("rocher", "un rocher", Vf.rond(x, y, r)))
        faits += 1

    etape("les lianes")
    # --- les lianes qui pendent des maîtresses branches (loin des cabanes et des passages) ---
    faites = 0
    for k, ((ex, ey, ez), a, mil) in enumerate(bouts):
        for t in (0.45, 0.75):
            q = np.array(mil) + (np.array((ex, ey, ez)) - np.array(mil)) * t
            x, y = float(q[0]), float(q[1])
            if math.hypot(x - cA[0], y - cA[1]) < 2.7 or math.hypot(x - cE[0], y - cE[1]) < 1.3 or math.hypot(x - cO[0], y - cO[1]) < 1.2:
                continue
            bas_ = max(sol(x, y) + 1.0, q[2] - 1.6 - 0.8 * rng.random())
            if not loin_des_sentiers(x, y, 0.1) and bas_ < sol(x, y) + 1.2:
                continue
            pts = [(x, y, q[2] - 0.05), (x + 0.05, y - 0.03, (q[2] + bas_) / 2), (x + 0.02, y + 0.02, bas_)]
            L.ajouter(*N.tube(pts, [0.02, 0.016, 0.012], 4, bouts=False), "ecorce_branche")
            for j in range(len(L.f) - 8, len(L.f)):
                L.zones[j] = (1.0, 0.85 if j < len(L.f) - 4 else 0.62, 1.0)
            faites += 1
            if leger and faites >= 4:
                break

    etape("la vie")
    # --- la vie : ceux qui marchent, la fumée, les feuilles qui tombent, les oiseaux autour de la couronne ---
    types = []
    for k in range(3):
        Pm = N.Maille(f"marcheur{k}")
        P.passant(Pm, rng, 0, 0, angle=0.0, z=0.0, marcheur=True)
        types.append(Pm)
    deja = {}
    for k, (pts, rond, vit, depart, pause) in enumerate(chemins[:3] if leger else chemins):
        extras = {"anim": "marche", "chemin": [float(c) for p in pts for c in p], "vitesse": vit, "phase": depart, "saut": 0.02, "pause": pause}
        t_ = k % len(types)
        if t_ not in deja:
            deja[t_] = len(lots["animes"])
            lots["animes"].append((types[t_], pts[0], extras))
        else:
            lots["copies"].append((deja[t_], pts[0], extras))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "fumees", "points": [float(c) for p in fumees for c in p], "grosseur": 0.42}))
    lots["reperes"].append(((TRONC[0], TRONC[1], Z0), {"anim": "feuilles", "nb": 16 if leger else 34, "rayon": 4.2, "haut": 6.6, "bas": -0.6}))
    lots["reperes"].append(((TRONC[0], TRONC[1], Z0 + 8.6), {"anim": "oiseaux", "nb": 3 if leger else 6, "rayon": 5.2, "envergure": 0.14}))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "mer", "rayon": 7.8, "genre": 2}))

    etape("sur l'eau")
    # --- sur l'eau (dessiné par le site) : le ressac tout le long du rivage, l'ombre du ponton et de la barque ---
    Rv = N.Maille("rivage")
    cote = [(_COTE[i % 720][0], _COTE[i % 720][1]) for i in range(0, 724, 4)]
    K.bande(Rv, [(x * 0.995, y * 0.995) for x, y in cote], [(x * (1 + 1.1 / math.hypot(x, y)), y * (1 + 1.1 / math.hypot(x, y))) for x, y in cote], mat="ecume", boucle=True)
    K.tache(Rv, *(pa + dp * (lg / 2 + 0.35)), lg - 0.8, 0.55, math.atan2(dp[1], dp[0]))
    K.tache(Rv, brq[0], brq[1], 0.85, 0.32, cap_b, rond=True, marge=0.16)
    lots["libres"].append((Rv, (0.0, 0.0, 0.0), {"role": "decor"}))
    etape("fin")
    lots["plan"] = {"emprises": emprises, "sol": SOL, "ponts": ponts}
    return lots


def verifier(lots=None, leger=False):
    """Les erreurs de plan (voir barhaw_ile_v5.controler) : une liste vide quand tout va bien."""
    return K.controler(lots or mailles(leger=leger), sol)


def construire(rendu=True, cuire=True, exporter=True, taille=None, echantillons=48, leger=False, alleger=True):
    lots = mailles(leger=leger)
    rendus = [("arbre-v5", (0, -31, 17), (0, 0.6, 4.6), 55), ("arbre-v5-cabanes", (2.2, -9.5, 6.2), (0.4, 0.2, 3.9), 58)] if rendu else []
    return K.construire("ile-arbre-v5", lots, verifier(lots), rendus, cuire, exporter, taille or (2048 if leger else 3072), echantillons, leger, alleger, atlas="arbre")
