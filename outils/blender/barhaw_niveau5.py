# Le « niveau 5 » de la 3D de GRAND LINE : une 3D stylisée mais très détaillée, qui reste légère sur le site.
#   · des matières riches (bois usé, tuiles, pierre, crépi qui s'écaille, pavés, toile rayée, métal rouillé…) : de petites textures
#     dessinées ici en Python (numpy), qui se répètent ; les petits reliefs sont dans la texture, pas dans les polygones ;
#   · la lumière et les ombres calculées une fois pour toutes dans Blender (Cycles) et « cuites » dans UNE image par modèle
#     (l'atlas) : le site n'a plus qu'à afficher cette image, sans aucun calcul de lumière ;
#   · ce qui s'allume la nuit (les vitres, les lanternes) et ce qui bouge (drapeaux, voiles) reste à part, en matières du site.
# Ce fichier marche aussi hors de Blender (pour essayer les textures et les formes) : tout ce qui touche à bpy est à la fin.
import math, os, json
import numpy as np

TAILLE = 512  # le côté d'une texture qui se répète
PI = math.pi


# =====================================================================================================================
# 1. Les textures (numpy) : chacune renvoie (couleur n×n×3, relief n×n), en 0…1, et se répète sans raccord
# =====================================================================================================================
def hexa(h):
    return np.array([(h >> 16) & 255, (h >> 8) & 255, h & 255], np.float32) / 255


def grille(n=TAILLE):
    a = (np.arange(n, dtype=np.float32) + 0.5) / n
    return np.meshgrid(a, a)  # x (u), y (v) ; la ligne 0 est en bas


def bruit(n, cx, cy=None, graine=0, octaves=4, persist=0.5):
    """Un bruit doux qui se répète : cx × cy cellules au départ, puis de plus en plus fin."""
    cy = cy or cx
    r = np.random.default_rng(graine)
    tot = np.zeros((n, n), np.float32)
    amp, somme = 1.0, 0.0
    for _ in range(octaves):
        g = r.random((cy, cx), dtype=np.float32)
        xs = np.arange(n) * cx / n
        x0 = np.floor(xs).astype(int)
        fx = (xs - x0).astype(np.float32)
        fx = fx * fx * (3 - 2 * fx)
        ys = np.arange(n) * cy / n
        y0 = np.floor(ys).astype(int)
        fy = (ys - y0).astype(np.float32)
        fy = fy * fy * (3 - 2 * fy)
        lignes = g[:, x0 % cx] * (1 - fx) + g[:, (x0 + 1) % cx] * fx
        tot += (lignes[y0 % cy, :] * (1 - fy)[:, None] + lignes[(y0 + 1) % cy, :] * fy[:, None]) * amp
        somme += amp
        amp *= persist
        cx, cy = min(cx * 2, n), min(cy * 2, n)
    return tot / somme


def lisse(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def mel(a, b, t):
    """Mélange deux couleurs (ou deux images) selon t (une image n×n ou un nombre)."""
    t = np.asarray(t, np.float32)
    return a + (b - a) * (t[..., None] if t.ndim == 2 else t)


def cellules(n, g, graine=0, alea=0.8):
    """Des cellules (Voronoï) qui se répètent : distance au bord (0 sur le joint), numéro de la cellule."""
    x, y = grille(n)
    r = np.random.default_rng(graine)
    f1 = np.full((n, n), 9.0, np.float32)
    f2 = np.full((n, n), 9.0, np.float32)
    ident = np.zeros((n, n), np.int32)
    k = 0
    for j in range(g):
        for i in range(g):
            sx, sy = (i + 0.5 + (r.random() - 0.5) * alea) / g, (j + 0.5 + (r.random() - 0.5) * alea) / g
            dx = np.abs(x - sx)
            dx = np.minimum(dx, 1 - dx)
            dy = np.abs(y - sy)
            dy = np.minimum(dy, 1 - dy)
            d = np.sqrt(dx * dx + dy * dy)
            plus_pres = d < f1
            f2 = np.where(plus_pres, f1, np.minimum(f2, d))
            ident = np.where(plus_pres, k, ident)
            f1 = np.minimum(f1, d)
            k += 1
    return (f2 - f1) * g, ident, k


def tx_tuiles(c1=0xd9703a, c2=0xb24e2b, c3=0xeda765, rangs=8, cols=8, graine=1, mousse=0.3, rond=True):
    """Des tuiles en écailles : rangées décalées, lèvre claire en bas, ombre sous la rangée du dessus, quelques tuiles délavées, de la mousse."""
    n = TAILLE
    x, y = grille(n)
    r = np.floor(y * rangs)
    fy = y * rangs - r
    xo = x * cols + (r % 2) * 0.5
    c = np.floor(xo) % cols
    fx = xo - np.floor(xo)
    rng = np.random.default_rng(graine)
    a = rng.random((rangs, cols), dtype=np.float32)[r.astype(int), c.astype(int)]
    a2 = rng.random((rangs, cols), dtype=np.float32)[r.astype(int), c.astype(int)]
    coul = mel(hexa(c1), hexa(c2), a)
    coul = mel(coul, hexa(c3), (a2 > 0.78) * 0.75)
    coul = mel(coul, hexa(c2) * 0.62, (a2 < 0.1) * 0.8)
    bord = np.minimum(fx, 1 - fx)
    # le bas de la tuile est arrondi : dans les coins du bas, on voit la tuile du dessous (plus sombre)
    coin = (lisse(0.0, 0.2, 0.2 - fy) * lisse(0.0, 0.14, 0.14 - bord)) if rond else 0 * fy
    lumiere = 0.88 + 0.16 * (1 - fy) + 0.1 * lisse(0.14, 0.0, fy) - 0.42 * lisse(0.7, 1.0, fy) - 0.5 * coin
    lumiere *= 0.55 + 0.45 * lisse(0.0, 0.05, bord)
    t = bruit(n, 4, 4, graine + 1, 4)
    coul = coul * (lumiere * (0.9 + 0.18 * bruit(n, 48, 48, graine + 2, 2)))[..., None]
    coul = mel(coul, np.array([0.36, 0.4, 0.22], np.float32) * (0.7 + 0.5 * lumiere[..., None]), lisse(0.62, 0.86, t) * mousse)
    relief = np.clip(0.2 + 0.7 * (1 - fy) * lisse(0.0, 0.05, bord) - 0.5 * coin, 0, 1)
    return np.clip(coul, 0, 1), relief


def tx_planches(c=0x8b5a33, nb=6, graine=2, usure=0.5):
    """Des planches (le long de u) : veines, joints sombres, bouts de planche, clous, taches ; certaines ont grisé au soleil."""
    n = TAILLE
    x, y = grille(n)
    p = np.floor(y * nb).astype(int)
    fy = y * nb - p
    rng = np.random.default_rng(graine)
    al = rng.random(nb, dtype=np.float32)[p]
    al2 = rng.random(nb, dtype=np.float32)[p]
    coul = hexa(c) * (0.76 + 0.42 * al)[..., None]
    gris = np.array([0.6, 0.56, 0.5], np.float32) * (0.62 + 0.3 * al)[..., None]
    coul = mel(coul, gris, (al2 > 0.66) * usure * 0.65)
    g1 = bruit(n, 3, 40, graine + 1, 3)
    veine = np.sin((y * nb * 7 + g1 * 5 + al * 20) * 2 * PI) * 0.5 + 0.5
    coul = coul * (0.88 + 0.16 * veine * (0.4 + g1))[..., None]
    bord = np.minimum(fy, 1 - fy)
    joint = lisse(0.0, 0.07, bord)
    coul = coul * (0.3 + 0.7 * joint)[..., None] + (lisse(0.06, 0.11, bord) * (1 - lisse(0.11, 0.24, bord)) * 0.07)[..., None]
    fin = rng.random(nb, dtype=np.float32)[p]
    dx = np.abs(((x - fin + 0.5) % 1) - 0.5)
    coul = coul * (0.4 + 0.6 * lisse(0.0, 0.006, dx))[..., None]
    clou = (np.abs(dx - 0.028) < 0.007) & ((np.abs(fy - 0.25) < 0.08) | (np.abs(fy - 0.75) < 0.08))
    coul[clou] *= 0.38
    coul = coul * (0.8 + 0.34 * bruit(n, 5, 5, graine + 2, 4))[..., None]
    return np.clip(coul, 0, 1), np.clip(joint * 0.75 + veine * 0.12 + 0.1, 0, 1)


def _blocs(n, rangs, graine, kmin=2, kmax=4):
    """Des blocs en rangées (largeurs au hasard) : distance au bord en pixels, hasard par bloc."""
    x, y = grille(n)
    r = np.floor(y * rangs).astype(int)
    fy = y * rangs - r
    rng = np.random.default_rng(graine)
    du = np.zeros((n, n), np.float32)
    alea = np.zeros((n, n), np.float32)
    for k in range(rangs):
        nbk = int(rng.integers(kmin, kmax + 1))
        bornes = np.sort(rng.random(nbk)).astype(np.float32)
        bande = r[:, 0] == k
        xs = x[0]
        i = np.searchsorted(bornes, xs) % nbk
        d = np.min(np.abs(((xs[None, :] - bornes[:, None] + 0.5) % 1) - 0.5), axis=0)
        du[bande, :] = d[None, :]
        alea[bande, :] = rng.random(nbk, dtype=np.float32)[i][None, :]
    dv = np.minimum(fy, 1 - fy) / rangs
    return np.minimum(du, dv) * n, alea


def tx_pierres(c=0xb7ab95, rangs=6, graine=3, mortier=0x5f574d, mousse=0.2, kmin=2, kmax=4):
    """Des pierres de taille : blocs inégaux, joints creux, arêtes usées, taches."""
    n = TAILLE
    d, al = _blocs(n, rangs, graine, kmin, kmax)
    base = hexa(c)
    coul = base * (0.8 + 0.34 * al)[..., None]
    coul = mel(coul, coul * np.array([1.08, 0.98, 0.86], np.float32), (al > 0.6) * 0.7)
    coul = coul * (0.86 + 0.22 * bruit(n, 24, 24, graine + 1, 3))[..., None]
    arete = lisse(1.5, 9.0, d)
    coul = coul * (0.62 + 0.38 * arete)[..., None]
    t = bruit(n, 4, 4, graine + 2, 4)
    coul = mel(coul, np.array([0.38, 0.42, 0.25], np.float32), lisse(0.6, 0.85, t) * mousse * (1.3 - arete))
    coul = mel(coul, hexa(mortier) * (0.8 + 0.3 * t)[..., None], 1 - lisse(1.2, 3.2, d))
    return np.clip(coul, 0, 1), np.clip(arete * 0.9 + 0.05, 0, 1)


def tx_briques(c=0xa5553b, rangs=12, graine=4, mortier=0xb9a98f):
    n = TAILLE
    x, y = grille(n)
    r = np.floor(y * rangs).astype(int)
    fy = y * rangs - r
    cols = rangs // 2
    xo = x * cols + (r % 2) * 0.5
    c_ = (np.floor(xo) % cols).astype(int)
    fx = xo - np.floor(xo)
    al = np.random.default_rng(graine).random((rangs, cols), dtype=np.float32)[r, c_]
    coul = hexa(c) * (0.72 + 0.5 * al)[..., None]
    coul = coul * (0.86 + 0.24 * bruit(n, 32, 32, graine + 1, 2))[..., None]
    d = np.minimum(np.minimum(fx, 1 - fx) * 2, np.minimum(fy, 1 - fy))
    j = lisse(0.05, 0.16, d)
    coul = mel(hexa(mortier) * 0.78, coul, j)
    return np.clip(coul, 0, 1), j


def tx_paves(c=0x9c9184, g=7, graine=5):
    """Des pavés ronds, usés, de couleurs voisines."""
    n = TAILLE
    d, ident, nb = cellules(n, g, graine)
    al = np.random.default_rng(graine + 1).random(nb, dtype=np.float32)[ident]
    coul = hexa(c) * (0.74 + 0.44 * al)[..., None]
    coul = mel(coul, coul * np.array([1.1, 0.96, 0.84], np.float32), (al > 0.7) * 0.8)
    haut = lisse(0.03, 0.42, d)
    coul = coul * (0.5 + 0.5 * lisse(0.02, 0.14, d) + 0.1 * haut)[..., None] * (0.9 + 0.2 * bruit(n, 40, 40, graine + 2, 2))[..., None]
    coul = mel(coul, np.array([0.33, 0.36, 0.24], np.float32), (1 - lisse(0.0, 0.1, d)) * lisse(0.5, 0.8, bruit(n, 4, 4, graine + 3, 3)) * 0.6)
    return np.clip(coul, 0, 1), haut


def tx_crepi(c=0xe8dabb, graine=6, briques=0.5, sale=1.0):
    """Un crépi vieilli : taches, coulures, fissures, et par endroits l'enduit est tombé (on voit la brique)."""
    n = TAILLE
    x, y = grille(n)
    coul = np.broadcast_to(hexa(c), (n, n, 3)).copy()
    coul *= (0.84 + 0.22 * bruit(n, 4, 4, graine, 4))[..., None]
    coul *= (1 - 0.14 * sale * lisse(0.55, 0.9, bruit(n, 22, 3, graine + 1, 3)))[..., None]  # les coulures
    coul *= (0.96 + 0.08 * bruit(n, 96, 96, graine + 2, 2))[..., None]
    relief = np.full((n, n), 0.6, np.float32) + 0.1 * bruit(n, 64, 64, graine + 3, 2)
    rng = np.random.default_rng(graine + 4)
    for _ in range(4):  # les fissures
        px, py, an = rng.random() * n, rng.random() * n, rng.random() * 6.28
        for _ in range(int(60 + rng.random() * 120)):
            an += (rng.random() - 0.5) * 0.9
            px, py = (px + math.cos(an) * 1.3) % n, (py + math.sin(an) * 1.3) % n
            coul[int(py) % n, int(px) % n] *= 0.6
            relief[int(py) % n, int(px) % n] = 0.2
    if briques > 0:
        masque = lisse(0.66, 0.72, bruit(n, 3, 3, graine + 5, 3)) * briques * 1.4
        masque = np.clip(masque, 0, 1)
        b, bj = tx_briques(graine=graine + 6)
        bordure = lisse(0.05, 0.5, masque) * (1 - lisse(0.5, 0.95, masque))
        coul = mel(coul * (1 - 0.3 * bordure)[..., None], b * 0.92, lisse(0.5, 0.7, masque))
        relief = relief * (1 - masque) + (0.25 + 0.2 * bj) * masque
    return np.clip(coul, 0, 1), np.clip(relief, 0, 1)


def tx_colombage(c=0xe8dabb, bois=0x4a2f1c, graine=16, sale=1.0):
    """Un mur à pans de bois : exactement un étage de haut et deux panneaux de large (un panneau à écharpe, un panneau plein).
    Les poutres sont dans la texture (et dans son relief), pas en polygones : sablières en haut et en bas, poteaux, écharpe."""
    n = TAILLE
    x, y = grille(n)
    coul, relief = tx_crepi(c, graine, briques=0.0, sale=sale)
    relief = relief * 0.5
    # la distance à chaque pièce de bois (en parts de la texture) : négative dedans
    d_h = np.minimum(y, 1 - y) - 0.075  # les sablières (haut et bas)
    d_p1 = np.abs(((x + 0.5) % 1) - 0.5) - 0.05  # le poteau en u = 0
    d_p2 = np.abs(x - 0.5) - 0.05  # le poteau en u = 0,5
    # l'écharpe du premier panneau : de (0,05 ; 0,075) à (0,45 ; 0,925)
    ax, ay, bx, by = 0.05, 0.075, 0.45, 0.925
    lg = math.hypot(bx - ax, by - ay)
    le_long = ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / lg
    d_e = np.where((le_long > 0) & (le_long < lg), np.abs((x - ax) * (by - ay) - (y - ay) * (bx - ax)) / lg - 0.036, 9.0)
    d = np.minimum(np.minimum(d_h, d_p1), np.minimum(d_p2, d_e))
    dedans = d < 0
    # le bois : des veines le long de chaque pièce, plus sombre au bord
    g1 = bruit(n, 4, 40, graine + 1, 3)
    g2 = bruit(n, 40, 4, graine + 2, 3)
    horizontal = d_h <= np.minimum(np.minimum(d_p1, d_p2), d_e)
    veine = np.where(horizontal, np.sin((y * 60 + g1 * 5) * 2 * PI), np.sin((x * 60 + g2 * 5) * 2 * PI)) * 0.5 + 0.5
    b = hexa(bois) * (0.82 + 0.3 * veine * (0.5 + np.where(horizontal, g1, g2)))[..., None]
    b = b * (0.6 + 0.4 * lisse(0.0, 0.016, -d))[..., None] * (0.85 + 0.3 * bruit(n, 6, 6, graine + 3, 3))[..., None]
    coul = coul * (0.72 + 0.28 * lisse(0.0, 0.03, d))[..., None]  # l'ombre de la poutre sur l'enduit
    coul[dedans] = b[dedans]
    # des chevilles de bois aux assemblages
    for cx in (0.0, 0.5, 1.0):
        for cy in (0.038, 0.962):
            coul[((x - cx) ** 2 + (y - cy) ** 2) < 0.00012] *= 0.5
    relief = np.where(dedans, 0.75 + 0.2 * lisse(0.0, 0.012, -d), relief)
    return np.clip(coul, 0, 1), np.clip(relief, 0, 1).astype(np.float32)


def tx_toile(c1=0xff4f9a, c2=0xfff1d6, bandes=6, graine=7, usure=0.6):
    """Une toile rayée (auvents, tentes), un peu passée au soleil, avec sa trame."""
    n = TAILLE
    x, y = grille(n)
    b = (np.floor(x * bandes) % 2).astype(np.float32)
    coul = mel(hexa(c1), hexa(c2), b)
    trame = 0.96 + 0.04 * np.sin(x * n * 0.9) * np.sin(y * n * 0.9)
    coul = coul * (trame * (0.86 + 0.2 * bruit(n, 5, 5, graine, 4)))[..., None]
    coul = mel(coul, np.array([0.86, 0.82, 0.74], np.float32), lisse(0.5, 0.9, bruit(n, 3, 3, graine + 1, 3)) * usure * 0.45)
    pli = np.sin(x * bandes * PI) ** 2
    return np.clip(coul, 0, 1), np.clip(0.4 + 0.3 * pli, 0, 1)


def tx_uni(c=0x8a8a8a, graine=8, grain=0.2, taches=0.25, c2=None, seuil=0.6):
    """Une matière simple : une couleur, du grain, des taches (et une seconde couleur par plaques : rouille, lichen…)."""
    n = TAILLE
    coul = np.broadcast_to(hexa(c), (n, n, 3)).copy()
    t = bruit(n, 5, 5, graine, 4)
    coul *= (1 - taches / 2 + taches * t)[..., None]
    coul *= (1 - grain / 2 + grain * bruit(n, 64, 64, graine + 1, 2))[..., None]
    if c2 is not None:
        coul = mel(coul, hexa(c2) * (0.8 + 0.4 * bruit(n, 32, 32, graine + 2, 2))[..., None], lisse(seuil, seuil + 0.18, bruit(n, 6, 6, graine + 3, 4)))
    return np.clip(coul, 0, 1), np.clip(0.4 + 0.4 * bruit(n, 24, 24, graine + 4, 3), 0, 1)


def tx_roche(c=0x8d8376, graine=9):
    """De la roche : des strates, des fissures, un peu de lichen."""
    n = TAILLE
    x, y = grille(n)
    t = bruit(n, 4, 4, graine, 4)
    strate = np.sin((y * 9 + t * 2.2) * 2 * PI) * 0.5 + 0.5
    coul = hexa(c) * (0.72 + 0.3 * strate + 0.2 * bruit(n, 20, 20, graine + 1, 3))[..., None]
    d, ident, nb = cellules(n, 5, graine + 2)
    coul = coul * (0.55 + 0.45 * lisse(0.0, 0.06, d))[..., None]
    coul = mel(coul, np.array([0.5, 0.52, 0.3], np.float32), lisse(0.66, 0.9, bruit(n, 6, 6, graine + 3, 3)) * 0.4)
    return np.clip(coul, 0, 1), np.clip(0.3 + 0.5 * strate * lisse(0.0, 0.08, d), 0, 1)


def tx_herbe(c=0x7ea54f, graine=10, fleurs=True):
    n = TAILLE
    t = bruit(n, 6, 6, graine, 4)
    coul = mel(hexa(c) * 0.78, hexa(c) * 1.16 * np.array([1.04, 1.0, 0.8], np.float32), t)
    coul = coul * (0.86 + 0.28 * bruit(n, 90, 90, graine + 1, 2))[..., None]
    if fleurs:
        rng = np.random.default_rng(graine + 2)
        for _ in range(70):
            px, py = int(rng.random() * n), int(rng.random() * n)
            col = [(1, 0.95, 0.6), (1, 0.75, 0.85), (1, 1, 1)][int(rng.integers(0, 3))]
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    coul[(py + dy) % n, (px + dx) % n] = col
    return np.clip(coul, 0, 1), t


def tx_feuillage(c=0x4c8a3a, graine=11, g=9):
    """Des touffes de feuilles : claires au milieu, sombres entre elles."""
    n = TAILLE
    d, ident, nb = cellules(n, g, graine)
    al = np.random.default_rng(graine + 1).random(nb, dtype=np.float32)[ident]
    coul = hexa(c) * (0.6 + 0.3 * al + 0.55 * lisse(0.0, 0.5, d))[..., None]
    coul = mel(coul, coul * np.array([1.2, 1.12, 0.6], np.float32), (al > 0.75) * 0.5)
    return np.clip(coul, 0, 1), lisse(0.0, 0.5, d)


def tx_corde(c=0xc9a877, graine=12):
    n = TAILLE
    x, y = grille(n)
    tors = np.sin((x * 5 + y * 24) * 2 * PI) * 0.5 + 0.5
    coul = hexa(c) * (0.62 + 0.5 * tors)[..., None] * (0.9 + 0.2 * bruit(n, 32, 32, graine, 2))[..., None]
    return np.clip(coul, 0, 1), tors


def tx_fenetre(cadre=0x4a2f1c, carreaux=(2, 3), graine=13, volet=None):
    """Une fenêtre entière (elle ne se répète pas) : le cadre, les petits carreaux sombres où le ciel se reflète, un rideau."""
    n = 256
    x, y = grille(n)
    coul = np.broadcast_to(hexa(cadre), (n, n, 3)).copy() * (0.8 + 0.4 * bruit(n, 6, 30, graine, 2))[..., None]
    m = 0.11
    dedans = (x > m) & (x < 1 - m) & (y > m) & (y < 1 - m)
    u, v = (x - m) / (1 - 2 * m), (y - m) / (1 - 2 * m)
    verre = mel(hexa(0x1d2b45), hexa(0x6f93b3), np.clip(lisse(0.2, 1.1, u * 0.6 + v * 0.7), 0, 1))
    verre = mel(verre, hexa(0xcfe3f2), lisse(0.0, 0.05, 0.05 - np.abs(u - v * 0.6 - 0.25)) * 0.5)  # un reflet en biais
    rideau = (v > 0.55) & ((u < 0.28 * (v - 0.4) * 2.2) | (u > 1 - 0.28 * (v - 0.4) * 2.2))
    verre[rideau] = hexa(0xd8b98c) * 0.9
    cx, cy = carreaux
    fu, fv = (u * cx) % 1, (v * cy) % 1
    croisillon = (np.minimum(fu, 1 - fu) < 0.07) | (np.minimum(fv, 1 - fv) < 0.05)
    coul[dedans] = verre[dedans]
    coul[dedans & croisillon] = hexa(cadre) * 1.15
    appui = y < m * 0.8
    coul[appui] = hexa(cadre) * 1.5
    bord = np.minimum(np.minimum(x, 1 - x), np.minimum(y, 1 - y))
    coul *= (0.7 + 0.3 * lisse(0.0, 0.03, bord))[..., None]
    relief = np.where(dedans & ~croisillon, 0.15, 0.8).astype(np.float32)
    return np.clip(coul, 0, 1), relief


def tx_porte(c=0x6b4427, graine=14, fer=0x2e2c30):
    """Une porte entière : planches debout, deux pentures de fer à rivets, un anneau."""
    n = 256
    x, y = grille(n)
    p, _ = tx_planches(c, 5, graine)
    p = np.transpose(p[::2, ::2], (1, 0, 2))  # les planches debout
    coul = p.copy()
    for yc in (0.26, 0.74):
        bande = np.abs(y - yc) < 0.045
        coul[bande] = hexa(fer) * (0.8 + 0.5 * bruit(n, 30, 30, graine + 1, 2))[bande][..., None]
        rivet = bande & (((x * 7) % 1 - 0.5) ** 2 + ((y - yc) * 7) ** 2 < 0.018)
        coul[rivet] = hexa(fer) * 2.2
    anneau = np.abs(np.sqrt((x - 0.78) ** 2 + (y - 0.5) ** 2) - 0.06) < 0.014
    coul[anneau] = hexa(0xc9a24a)
    bord = np.minimum(np.minimum(x, 1 - x), np.minimum(y, 1 - y))
    coul *= (0.55 + 0.45 * lisse(0.0, 0.05, bord))[..., None]
    return np.clip(coul, 0, 1), lisse(0.0, 0.05, bord)


def tx_cadran(graine=15, aiguilles=True):
    """Le cadran du beffroi : un disque crème cerclé d'or, douze traits, deux aiguilles (peintes, ou de vraies qui tournent)."""
    n = 256
    x, y = grille(n)
    r = np.sqrt((x - 0.5) ** 2 + (y - 0.5) ** 2)
    an = np.arctan2(y - 0.5, x - 0.5)
    coul = np.broadcast_to(hexa(0x8a8172), (n, n, 3)).copy()
    coul[r < 0.47] = hexa(0xd9a93c)
    coul[r < 0.41] = hexa(0xf3e7c8) * (0.92 + 0.1 * bruit(n, 8, 8, graine, 3))[r < 0.41][..., None]
    trait = (r > 0.31) & (r < 0.39) & (np.abs(((an / (2 * PI) * 12) % 1) - 0.5) > 0.44)
    coul[trait] = hexa(0x2a160c)
    for a, long, ep in ((1.9, 0.3, 0.018), (0.5, 0.2, 0.026)) if aiguilles else ():
        dx, dy = math.cos(a), math.sin(a)
        le_long = (x - 0.5) * dx + (y - 0.5) * dy
        de_cote = np.abs(-(x - 0.5) * dy + (y - 0.5) * dx)
        coul[(le_long > -0.03) & (le_long < long) & (de_cote < ep)] = hexa(0x2a160c)
    coul[r < 0.035] = hexa(0xd9a93c)
    return np.clip(coul, 0, 1), np.where(r < 0.47, 0.7, 0.4).astype(np.float32)


# Les matières : nom → (fabrique, réglages, taille dans le monde d'une répétition (0 : l'image entière sur chaque face), réglages Blender)
MATIERES = {}


def matiere(nom, fabrique, taille=1.5, relief=0.5, rugueux=0.9, metal=0.0, **reglages):
    MATIERES[nom] = {"fabrique": fabrique, "reglages": reglages, "taille": taille, "relief": relief, "rugueux": rugueux, "metal": metal}


matiere("tuiles", tx_tuiles, 1.5, 0.9)
matiere("tuiles_rouges", tx_tuiles, 1.5, 0.9, c1=0xc4553a, c2=0x93392a, c3=0xdc8a5c, graine=21)
matiere("tuiles_brunes", tx_tuiles, 1.5, 0.9, c1=0xb57a45, c2=0x8a5530, c3=0xd2a368, graine=22, mousse=0.45)
matiere("ardoises", tx_tuiles, 1.3, 0.8, c1=0x5f6875, c2=0x454b57, c3=0x7f8a97, rangs=9, cols=7, graine=23, mousse=0.2, rond=False)
matiere("bardeaux", tx_tuiles, 1.3, 0.8, c1=0x8a6744, c2=0x664a31, c3=0xa98a66, rangs=9, cols=9, graine=24, mousse=0.4, rond=False)
matiere("planches", tx_planches, 1.2, 0.8)
matiere("planches_sombres", tx_planches, 1.2, 0.8, c=0x5a3a22, graine=31, usure=0.3)
matiere("planches_claires", tx_planches, 1.2, 0.8, c=0xb58a55, graine=32, usure=0.7)
matiere("planches_grises", tx_planches, 1.2, 0.8, c=0x8d8273, graine=33, usure=0.9)
matiere("pont", tx_planches, 1.0, 0.8, c=0xa07a4c, nb=8, graine=34, usure=0.8)
matiere("poutre", tx_planches, 1.6, 0.5, c=0x4a2f1c, nb=2, graine=35, usure=0.2)
matiere("peint_bleu", tx_planches, 1.2, 0.6, c=0x4f7fa6, graine=36, usure=0.8)
matiere("peint_vert", tx_planches, 1.2, 0.6, c=0x5d8a5a, graine=37, usure=0.8)
matiere("peint_rouge", tx_planches, 1.2, 0.6, c=0xb04a3c, graine=38, usure=0.8)
matiere("pierres", tx_pierres, 1.5, 1.0)
matiere("pierres_claires", tx_pierres, 1.5, 1.0, c=0xd5c9ae, graine=41, mortier=0x8a7d6a, mousse=0.1)
matiere("pierres_sombres", tx_pierres, 1.5, 1.0, c=0x8a8378, graine=42, mousse=0.35)
matiere("quai", tx_pierres, 2.0, 1.0, c=0xa39a88, rangs=5, graine=43, mousse=0.5, kmin=2, kmax=3)
matiere("briques", tx_briques, 1.0, 0.7)
matiere("paves", tx_paves, 1.6, 1.0)
matiere("paves_clairs", tx_paves, 1.6, 1.0, c=0xb8ab95, graine=51)
matiere("crepi", tx_crepi, 2.4, 0.5)
matiere("crepi_ocre", tx_crepi, 2.4, 0.5, c=0xe2b872, graine=61)
matiere("crepi_rose", tx_crepi, 2.4, 0.5, c=0xe6b0a0, graine=62)
matiere("crepi_blanc", tx_crepi, 2.4, 0.5, c=0xf2ecdc, graine=63, briques=0.3)
matiere("crepi_bleu", tx_crepi, 2.4, 0.5, c=0xb7cdd6, graine=64)
for _nom, _c, _g in (("colombage", 0xe8dabb, 160), ("colombage_ocre", 0xe2b872, 161), ("colombage_rose", 0xe6b0a0, 162), ("colombage_blanc", 0xf2ecdc, 163), ("colombage_bleu", 0xb7cdd6, 164)):
    matiere(_nom, tx_colombage, 0.52, 1.0, c=_c, graine=_g)  # 0,52 : la hauteur d'un étage
matiere("toile_rose", tx_toile, 1.2, 0.3)
matiere("toile_violette", tx_toile, 1.2, 0.3, c1=0x9b4dff, graine=71)
matiere("toile_or", tx_toile, 1.2, 0.3, c1=0xe9a93a, graine=72)
matiere("toile_turquoise", tx_toile, 1.2, 0.3, c1=0x2fb3a8, graine=73)
matiere("toile_ecrue", tx_uni, 1.5, 0.3, c=0xe9dcc0, graine=74, taches=0.3, c2=0xbfa57c, seuil=0.62)
matiere("fer", tx_uni, 1.0, 0.5, rugueux=0.6, metal=0.4, c=0x3b3a3f, graine=81, taches=0.4, c2=0x8a4a22, seuil=0.56)
matiere("or", tx_uni, 1.0, 0.4, rugueux=0.45, metal=0.3, c=0xe2ad36, graine=82, taches=0.5, c2=0x9a6a1c, seuil=0.66)
matiere("cuivre", tx_uni, 1.0, 0.4, rugueux=0.5, metal=0.3, c=0xb8693a, graine=83, taches=0.4, c2=0x5fa593, seuil=0.6)
matiere("roche", tx_roche, 3.0, 1.0)
matiere("roche_claire", tx_roche, 3.0, 1.0, c=0xb5a88f, graine=91)
matiere("herbe", tx_herbe, 3.0, 0.3)
matiere("herbe_seche", tx_herbe, 3.0, 0.3, c=0xa9a55a, graine=101, fleurs=False)
matiere("sable", tx_uni, 2.5, 0.3, c=0xe7d3a2, graine=111, grain=0.14, taches=0.16, c2=0xc9b07a, seuil=0.7)
matiere("terre", tx_uni, 2.0, 0.5, c=0x9b7b56, graine=112, grain=0.3, taches=0.3, c2=0x6f5638, seuil=0.6)
matiere("feuillage", tx_feuillage, 1.4, 0.8)
matiere("feuillage_sombre", tx_feuillage, 1.4, 0.8, c=0x356b3a, graine=121)
matiere("feuillage_dore", tx_feuillage, 1.4, 0.8, c=0x9aa53c, graine=122)
matiere("corde", tx_corde, 0.5, 0.4)
matiere("peau", tx_uni, 1.0, 0.1, c=0xe8b38a, graine=131, grain=0.05, taches=0.08)
matiere("peau_brune", tx_uni, 1.0, 0.1, c=0xa9714a, graine=132, grain=0.05, taches=0.08)
matiere("tissu_rouge", tx_uni, 0.6, 0.2, c=0xb8483f, graine=133, grain=0.2, taches=0.3)
matiere("tissu_bleu", tx_uni, 0.6, 0.2, c=0x40618f, graine=134, grain=0.2, taches=0.3)
matiere("tissu_vert", tx_uni, 0.6, 0.2, c=0x4f7a4a, graine=135, grain=0.2, taches=0.3)
matiere("tissu_creme", tx_uni, 0.6, 0.2, c=0xe6d9bd, graine=136, grain=0.2, taches=0.3)
matiere("tissu_sombre", tx_uni, 0.6, 0.2, c=0x3a2f36, graine=137, grain=0.2, taches=0.3)
matiere("fruits", tx_feuillage, 0.5, 0.6, c=0xd9642f, graine=138, g=7)
matiere("legumes", tx_feuillage, 0.5, 0.6, c=0x7fb04a, graine=139, g=7)
matiere("poisson", tx_feuillage, 0.5, 0.4, c=0x9fb6c4, graine=140, g=8)
matiere("fenetre", tx_fenetre, 0, 0.6)
matiere("fenetre_haute", tx_fenetre, 0, 0.6, carreaux=(2, 4), graine=141)
matiere("porte", tx_porte, 0, 0.6)
matiere("cadran", tx_cadran, 0, 0.3)
matiere("cadran_nu", tx_cadran, 0, 0.5, aiguilles=False)

# Les matières du site (pas cuites) : ce qui s'allume, ce qui bouge, ce qui prend les couleurs de la commu
SITE = ("ecume", "ombre_eau", "vitre", "lumiere", "luciole", "lave", "feu", "rose", "violet", "voile", "voile_b", "drapeau", "flamme", "fanion_rose", "fanion_or", "fanion_violet", "fanion_turquoise", "fanion_creme")


# =====================================================================================================================
# 2. Les formes : une maille qu'on remplit (sommets, faces, matière par face, UV du motif), puis des pièces toutes faites
# =====================================================================================================================
def T(x=0.0, y=0.0, z=0.0):
    m = np.eye(4)
    m[:3, 3] = (x, y, z)
    return m


def Rz(a):
    m = np.eye(4)
    c, s = math.cos(a), math.sin(a)
    m[0, 0], m[0, 1], m[1, 0], m[1, 1] = c, -s, s, c
    return m


def Rx(a):
    m = np.eye(4)
    c, s = math.cos(a), math.sin(a)
    m[1, 1], m[1, 2], m[2, 1], m[2, 2] = c, -s, s, c
    return m


def Ry(a):
    m = np.eye(4)
    c, s = math.cos(a), math.sin(a)
    m[0, 0], m[0, 2], m[2, 0], m[2, 2] = c, s, -s, c
    return m


def S(x=1.0, y=None, z=None):
    return np.diag([x, x if y is None else y, x if z is None else z, 1.0])


class Faces(list):
    """Des faces, avec pour certaines leur « déroulé » : leurs coordonnées à plat sur une surface courbe (un cylindre, une sphère,
    un tube), pour que tout le tour partage une seule carte de l'atlas et que le motif continue d'une facette à l'autre."""
    deroule = None


class Maille:
    """Une maille en construction. Chaque face a sa matière ; les UV du « motif » se calculent tout seuls (voir ajouter)."""

    def __init__(self, nom="maille"):
        self.nom = nom
        self.v = []  # des tableaux (k, 3)
        self.nv = 0
        self.f = []  # (indices, numéro de matière)
        self.uv = []  # par face : (k, 2), le motif
        self.cartes = []  # par face : (numéro de carte, coordonnées à plat (k, 2) en unités du monde)
        self.finesse = []  # par carte : la finesse voulue dans l'atlas (1 : normale)
        self.atlas = None  # par face : (k, 2), rempli par emballer()
        self.zones = []  # par face : 0, ou 1 / 2 = peinte aux couleurs de la commu (le site teinte ces faces : rouge / vert dans le .glb)
        self.mats = []

    def mat(self, nom):
        if nom not in self.mats:
            self.mats.append(nom)
        return self.mats.index(nom)

    def ajouter(self, verts, faces, mat, M=None, tourne=False, plein=None, decal=(0.0, 0.0), finesse=1.0, cale=False, uv=None, zone=0):
        """verts (k, 3), faces (listes d'indices, dans le sens inverse des aiguilles vu de dehors).
        Le motif : chaque face est dépliée à plat, à l'échelle du monde (u à l'horizontale, v vers le haut de la face) ;
        tourne : motif tourné d'un quart de tour ; plein : l'image entière sur chaque face (les fenêtres, les portes) ;
        cale : le motif part du coin de chaque face (les pans de bois) ; finesse : la place de ces faces dans l'atlas ;
        uv : les UV donnés par sommet (les voiles, les drapeaux : l'image du site s'y pose) ; zone : 1 ou 2, une face peinte
        aux couleurs de la commu (cuite en blanc, teintée par le site)."""
        v = np.asarray(verts, np.float64)
        if M is not None:
            v = v @ M[:3, :3].T + M[:3, 3]
        k = self.mat(mat)
        info = MATIERES.get(mat)
        ech = (info["taille"] if info else 1.0) or 1.0
        entier = plein if plein is not None else bool(info and info["taille"] == 0)
        plans = {}  # dans cet ajout : les faces d'un même plan partagent leur carte
        deroule = getattr(faces, "deroule", None)
        agrandi = abs(np.linalg.det(M[:3, :3])) ** (1 / 3) if M is not None else 1.0
        for nf, f in enumerate(faces):
            p = v[list(f)]
            n = np.zeros(3)
            for i in range(len(f)):  # la normale (Newell)
                a, b = p[i], p[(i + 1) % len(f)]
                n += np.array([(a[1] - b[1]) * (a[2] + b[2]), (a[2] - b[2]) * (a[0] + b[0]), (a[0] - b[0]) * (a[1] + b[1])])
            ln = np.linalg.norm(n)
            n = n / ln if ln > 1e-12 else np.array([0, 0, 1.0])
            t = np.cross([0, 0, 1.0], n)
            lt = np.linalg.norm(t)
            t = t / lt if lt > 0.05 else np.array([1.0, 0, 0])
            b = np.cross(n, t)
            plat = np.stack([p @ t, p @ b], axis=1)
            courbe = deroule is not None and deroule[nf] is not None
            if courbe:
                plat = np.asarray(deroule[nf], np.float64) * agrandi
            if uv is not None:
                uvf = np.asarray([uv[i] for i in f], np.float64)
            elif entier and len(f) == 4:
                uvf = np.array([(0, 0), (1, 0), (1, 1), (0, 1)], np.float64)
            else:
                uvf = (plat - plat.min(0) if cale else plat) / ech  # cale : le motif part du coin en bas à gauche de la face
                if tourne:
                    uvf = uvf[:, ::-1] * (1, -1)
                uvf = uvf + decal
            cle = "courbe" if courbe else (round(n[0], 2), round(n[1], 2), round(n[2], 2), round(float(p[0] @ n), 2))
            if cle not in plans:
                plans[cle] = len(self.finesse)
                self.finesse.append(finesse)
            self.cartes.append((plans[cle], plat))
            self.f.append(([self.nv + i for i in f], k))
            self.uv.append(uvf)
            self.zones.append(zone)
        self.v.append(v)
        self.nv += len(v)
        return self

    def regrouper(self, debut, fin=None, tuiles=4, finesse=0.7, raide=0.62):
        """Les faces de `debut` à `fin` (un terrain) partagent de grandes cartes, par tuiles : vues de dessus pour le sol,
        vues de côté (du nord, du sud, de l'est ou de l'ouest) pour les falaises, sinon leur roche s'étire en traînées."""
        fin = len(self.f) if fin is None else fin
        v = np.concatenate(self.v)
        pts = [v[self.f[k][0]] for k in range(debut, fin)]
        tout = np.concatenate(pts)
        mn, mx = tout[:, :2].min(0), tout[:, :2].max(0)
        ids = {}
        for k, p in zip(range(debut, fin), pts):
            c = p.mean(0)
            n = np.zeros(3)
            for i in range(len(p)):
                a, b = p[i], p[(i + 1) % len(p)]
                n += np.array([(a[1] - b[1]) * (a[2] + b[2]), (a[2] - b[2]) * (a[0] + b[0]), (a[0] - b[0]) * (a[1] + b[1])])
            n = n / (np.linalg.norm(n) or 1)
            tuile = (int((c[0] - mn[0]) / (mx[0] - mn[0] + 1e-9) * tuiles), int((c[1] - mn[1]) / (mx[1] - mn[1] + 1e-9) * tuiles))
            if n[2] >= raide:
                cle, plat = ("sol",) + tuile, p[:, :2].copy()
            elif abs(n[0]) >= abs(n[1]):  # une falaise tournée vers l'est ou l'ouest : on la regarde de côté
                s_ = 1.0 if n[0] > 0 else -1.0
                cle, plat = ("x", s_, int(c[0] // 1.5)) + tuile, np.stack([p[:, 1] * s_, p[:, 2]], axis=1)
            else:
                s_ = 1.0 if n[1] > 0 else -1.0
                cle, plat = ("y", s_, int(c[1] // 1.5)) + tuile, np.stack([-p[:, 0] * s_, p[:, 2]], axis=1)
            if cle not in ids:
                ids[cle] = len(self.finesse)
                self.finesse.append(finesse)
            self.cartes[k] = (ids[cle], plat)

    def garder(self, masque):
        """Ne garde que les faces où masque est vrai (et les sommets qui servent encore). Renvoie le nombre de faces retirées."""
        masque = [bool(x) for x in masque]
        avant = len(self.f)
        v = np.concatenate(self.v) if self.v else np.zeros((0, 3))
        sert = np.zeros(len(v), bool)
        for (f, _), g in zip(self.f, masque):
            if g:
                sert[f] = True
        neuf = np.cumsum(sert) - 1
        self.f = [([int(neuf[i]) for i in f], k) for (f, k), g in zip(self.f, masque) if g]
        self.uv = [x for x, g in zip(self.uv, masque) if g]
        self.cartes = [x for x, g in zip(self.cartes, masque) if g]
        self.zones = [x for x, g in zip(self.zones, masque) if g]
        if self.atlas is not None:
            self.atlas = [x for x, g in zip(self.atlas, masque) if g]
        self.v = [v[sert]]
        self.nv = int(sert.sum())
        return avant - len(self.f)

    def tableaux(self):
        v = np.concatenate(self.v) if self.v else np.zeros((0, 3))
        return v, [f for f, _ in self.f], np.array([k for _, k in self.f], np.int32), (np.concatenate(self.uv) if self.uv else np.zeros((0, 2)))

    def triangles(self):
        return sum(len(f) - 2 for f, _ in self.f)


def emballer(mailles, taille=2048, marge=2):
    """Range toutes les cartes de ces mailles dans UN atlas carré (par étagères), à la même finesse partout, la plus grande
    qui tienne. Remplit maille.atlas (les UV, par face) ; renvoie (pixels par unité du monde, part de l'atlas occupée)."""
    cartes = []  # (maille, numéro, [faces], coordonnées redressées, largeur, hauteur, finesse)
    for M in mailles:
        par = {}
        for k, (c, plat) in enumerate(M.cartes):
            par.setdefault(c, []).append(k)
        for c, faces in par.items():
            pts = np.concatenate([M.cartes[k][1] for k in faces])
            # on redresse la carte : son plus long bord à l'horizontale (un rectangle ne gaspille alors rien)
            p0 = M.cartes[faces[0]][1]
            bords = [(np.linalg.norm(p0[(i + 1) % len(p0)] - p0[i]), i) for i in range(len(p0))]
            i = max(bords)[1]
            d = p0[(i + 1) % len(p0)] - p0[i]
            d = d / (np.linalg.norm(d) or 1)
            R = np.array([[d[0], d[1]], [-d[1], d[0]]])
            q = pts @ R.T
            mn = q.min(0)
            l, h = q.max(0) - mn
            if h > l:  # couchée
                R = np.array([[0.0, 1.0], [-1.0, 0.0]]) @ R
                q = pts @ R.T
                mn = q.min(0)
                l, h = q.max(0) - mn
            cartes.append((M, c, faces, R, mn, l, h, M.finesse[c]))

    def ranger(D, poser=False):
        tailles = sorted(((max(1, math.ceil(h * D * fi)) + 2 * marge, max(1, math.ceil(l * D * fi)) + 2 * marge, k) for k, (_, _, _, _, _, l, h, fi) in enumerate(cartes)), reverse=True)
        x = y = 0
        etagere = 0
        places = {}
        for hp, lp, k in tailles:
            if lp > taille:
                return None
            if x + lp > taille:
                x, y = 0, y + etagere
                etagere = 0
            if etagere == 0:
                etagere = hp
            if y + hp > taille:
                return None
            places[k] = (x, y)
            x += lp
        return places

    bas, haut = 1.0, 400.0
    for _ in range(26):
        D = (bas + haut) / 2
        if ranger(D) is None:
            haut = D
        else:
            bas = D
    D = bas
    places = ranger(D)
    occupe = 0
    for M in mailles:
        M.atlas = [None] * len(M.f)
    for k, (M, c, faces, R, mn, l, h, fi) in enumerate(cartes):
        x, y = places[k]
        occupe += (math.ceil(l * D * fi) + 2 * marge) * (math.ceil(h * D * fi) + 2 * marge)
        for f in faces:
            q = (M.cartes[f][1] @ R.T - mn) * D * fi
            M.atlas[f] = (q + (x + marge, y + marge)) / taille
    return D, occupe / (taille * taille)


def cachees(maille, pixels, seuil=1e-4):
    """Les faces qu'aucune lumière n'atteint dans une cuisson d'essai (pixels : l'atlas cuit, (h, l, 3), ligne 0 en bas) :
    enfermées dans un mur, sous une maison, au fond d'une caisse… Ce qu'on voit de dehors, le ciel l'éclaire toujours un
    peu : une face toute noire ne se voit donc de nulle part, on peut la retirer. Renvoie un masque (vrai : cachée)."""
    h, l = pixels.shape[:2]
    lum = pixels[:, :, :3].max(2)
    res = []
    for q in maille.atlas:
        c = q.mean(0)
        pts = [c] + [c + (a - c) * 0.72 for a in q] + [c + ((q[i] + q[(i + 1) % len(q)]) / 2 - c) * 0.72 for i in range(len(q))] + [c + (a - c) * 0.4 for a in q]
        pts = np.asarray(pts)
        x = np.clip((pts[:, 0] * l).astype(int), 0, l - 1)
        y = np.clip((pts[:, 1] * h).astype(int), 0, h - 1)
        res.append(bool(lum[y, x].max() < seuil))
    return res


# ---- les formes de base : chacune renvoie (sommets, faces) ----
def boite(lx, ly, lz, bas=False, haut=True):
    """Une boîte centrée en x, y, posée sur z = 0."""
    x, y = lx / 2, ly / 2
    v = [(-x, -y, 0), (x, -y, 0), (x, y, 0), (-x, y, 0), (-x, -y, lz), (x, -y, lz), (x, y, lz), (-x, y, lz)]
    f = [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    if haut:
        f.append((4, 5, 6, 7))
    if bas:
        f.append((3, 2, 1, 0))
    return v, f


DETAIL = 1.0  # la version légère (téléphone) : moins de côtés aux formes rondes


def _cotes(n, mini=5):
    return n if DETAIL >= 1 else max(min(n, mini), int(round(n * DETAIL)))


def cylindre(r1, r2, h, n=10, haut=True, bas=False, z0=0.0):
    n = _cotes(n)
    v = [(math.cos(k * 2 * PI / n) * r1, math.sin(k * 2 * PI / n) * r1, z0) for k in range(n)] + [(math.cos(k * 2 * PI / n) * r2, math.sin(k * 2 * PI / n) * r2, z0 + h) for k in range(n)]
    f = Faces((k, (k + 1) % n, n + (k + 1) % n, n + k) for k in range(n))
    pas = 2 * PI * max(r1, r2) / n
    cote = math.hypot(h, r1 - r2)
    f.deroule = [[(k * pas, 0), ((k + 1) * pas, 0), ((k + 1) * pas, cote), (k * pas, cote)] for k in range(n)]
    if haut and r2 > 1e-6:
        f.append(tuple(range(n, 2 * n)))
        f.deroule.append(None)
    if bas and r1 > 1e-6:
        f.append(tuple(reversed(range(n))))
        f.deroule.append(None)
    return v, f


def sphere(r, nu=10, nv=6, ez=1.0):
    nu, nv = _cotes(nu), _cotes(nv, 4)
    v = [(0, 0, -r * ez)]
    for j in range(1, nv):
        a = -PI / 2 + j * PI / nv
        for i in range(nu):
            v.append((math.cos(a) * math.cos(i * 2 * PI / nu) * r, math.cos(a) * math.sin(i * 2 * PI / nu) * r, math.sin(a) * r * ez))
    v.append((0, 0, r * ez))
    pu, pv = 2 * PI * r * 0.8 / nu, PI * r * (0.5 + 0.5 * ez) / nv
    f = Faces((0, 1 + (i + 1) % nu, 1 + i) for i in range(nu))
    f.deroule = [[((i + 0.5) * pu, 0), ((i + 1) * pu, pv), (i * pu, pv)] for i in range(nu)]
    for j in range(nv - 2):
        for i in range(nu):
            a, b = 1 + j * nu + i, 1 + j * nu + (i + 1) % nu
            f.append((a, b, b + nu, a + nu))
            f.deroule.append([(i * pu, (j + 1) * pv), ((i + 1) * pu, (j + 1) * pv), ((i + 1) * pu, (j + 2) * pv), (i * pu, (j + 2) * pv)])
    d = 1 + (nv - 2) * nu
    for i in range(nu):
        f.append((d + i, d + (i + 1) % nu, len(v) - 1))
        f.deroule.append([(i * pu, (nv - 1) * pv), ((i + 1) * pu, (nv - 1) * pv), ((i + 0.5) * pu, nv * pv)])
    return v, f


def tube(points, rayons, n=6, bouts=True):
    """Un tube qui suit des points (rayons : un nombre, ou un par point)."""
    P = [np.asarray(p, np.float64) for p in points]
    R = [rayons] * len(P) if isinstance(rayons, (int, float)) else list(rayons)
    v, f = [], []
    for i, p in enumerate(P):
        d = (P[min(i + 1, len(P) - 1)] - P[max(i - 1, 0)])
        d = d / (np.linalg.norm(d) or 1)
        a = np.cross(d, [0, 0, 1.0])
        if np.linalg.norm(a) < 0.1:
            a = np.cross(d, [1.0, 0, 0])
        a = a / np.linalg.norm(a)
        b = np.cross(d, a)
        for k in range(n):
            an = k * 2 * PI / n
            v.append(tuple(p + (a * math.cos(an) + b * math.sin(an)) * R[i]))
    f = Faces()
    f.deroule = []
    pas = 2 * PI * max(R) / n
    long = 0.0
    for i in range(len(P) - 1):
        suite = long + float(np.linalg.norm(P[i + 1] - P[i]))
        for k in range(n):
            a, b = i * n + k, i * n + (k + 1) % n
            f.append((a, b, b + n, a + n))
            f.deroule.append([(k * pas, long), ((k + 1) * pas, long), ((k + 1) * pas, suite), (k * pas, suite)])
        long = suite
    if bouts:
        f.append(tuple(reversed(range(n))))
        f.append(tuple(range((len(P) - 1) * n, len(P) * n)))
        f.deroule += [None, None]
    return v, f


def poutre(a, b, ep=0.05, ep2=None):
    """Une poutre carrée entre deux points."""
    a, b = np.asarray(a, np.float64), np.asarray(b, np.float64)
    d = b - a
    L = np.linalg.norm(d)
    d = d / (L or 1)
    c = np.cross(d, [0, 0, 1.0])
    if np.linalg.norm(c) < 0.1:
        c = np.cross(d, [1.0, 0, 0])
    c = c / np.linalg.norm(c)
    e = np.cross(d, c)
    c, e = c * ep / 2, e * (ep2 or ep) / 2
    v = [a - c - e, a + c - e, a + c + e, a - c + e, b - c - e, b + c - e, b + c + e, b - c + e]
    return [tuple(p) for p in v], [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7), (4, 5, 6, 7), (3, 2, 1, 0)]


def quad(a, b, c, d):
    return [tuple(a), tuple(b), tuple(c), tuple(d)], [(0, 1, 2, 3)]


def polygone(pts, z0, z1, haut=True):
    """Un prisme droit sur un polygone convexe (points dans le sens inverse des aiguilles)."""
    n = len(pts)
    v = [(x, y, z0) for x, y in pts] + [(x, y, z1) for x, y in pts]
    f = [(k, (k + 1) % n, n + (k + 1) % n, n + k) for k in range(n)]
    if haut:
        f.append(tuple(range(n, 2 * n)))
    return v, f


def toit_pignon(lx, ly, h, debord=0.1, ep=0.05):
    """Un toit à deux pentes (faîtage le long de x), posé sur z = 0 : deux plaques épaisses qui débordent des murs."""
    x, y = lx / 2 + debord, ly / 2 + debord
    pente = h / (ly / 2)
    zb = -debord * pente
    v, f = [], []
    for s in (-1, 1):
        k = len(v)
        v += [(-x, s * y, zb), (x, s * y, zb), (x, 0, h), (-x, 0, h), (-x, s * y, zb + ep), (x, s * y, zb + ep), (x, 0, h + ep), (-x, 0, h + ep)]
        faces = [(4, 5, 6, 7), (0, 1, 5, 4), (0, 4, 7, 3), (1, 2, 6, 5)]  # le dessus, la rive du bas, les deux rives de pignon (pas le dessous : on ne le voit jamais)
        f += [tuple(k + i for i in (q if s < 0 else reversed(q))) for q in faces]
    return v, f


def pignons(lx, ly, h):
    """Les deux triangles de mur sous un toit à deux pentes."""
    x, y = lx / 2, ly / 2
    return [(-x, -y, 0), (-x, y, 0), (-x, 0, h), (x, -y, 0), (x, y, 0), (x, 0, h)], [(1, 0, 2), (3, 4, 5)]


def toit_pointe(r, h, n=4, debord=0.08, depart=PI / 4):
    """Un toit en pointe (pyramide ou cône) qui déborde un peu."""
    n = _cotes(n) if n > 4 else n
    R = r + debord
    v = [(math.cos(depart + k * 2 * PI / n) * R, math.sin(depart + k * 2 * PI / n) * R, 0) for k in range(n)] + [(0, 0, h)]
    f = Faces((k, (k + 1) % n, n) for k in range(n))
    if n > 4:  # un cône : tout le tour dans une seule carte, le motif tourne avec lui
        pas, cote = 2 * PI * R / n, math.hypot(h, R)
        f.deroule = [[(k * pas, 0), ((k + 1) * pas, 0), ((k + 0.5) * pas, cote)] for k in range(n)] + [None]
    f.append(tuple(reversed(range(n))))
    return v, f


# =====================================================================================================================
# 3. Dans Blender : les matières, l'objet, la cuisson de la lumière dans l'atlas, l'export, les rendus
# =====================================================================================================================
try:
    import bpy
except ImportError:  # hors de Blender : on s'arrête là (les essais de textures et de formes)
    bpy = None


def dossier():
    return os.path.join(os.path.expanduser("~"), "Documents", "Barhaw-3D")


_images = {}


def image_de(nom):
    """Les deux images d'une matière (couleur, relief), fabriquées une fois."""
    if nom in _images:
        return _images[nom]
    info = MATIERES[nom]
    coul, relief = info["fabrique"](**info["reglages"])
    n = coul.shape[0]
    res = []
    for suffixe, tab, espace in (("", np.concatenate([coul, np.ones((n, n, 1), np.float32)], axis=2), "sRGB"), ("_relief", np.repeat(relief[..., None], 4, axis=2), "Non-Color")):
        img = bpy.data.images.get(f"n5_{nom}{suffixe}") or bpy.data.images.new(f"n5_{nom}{suffixe}", n, n, alpha=False)
        img.colorspace_settings.name = espace
        img.pixels.foreach_set(np.ascontiguousarray(tab, np.float32).ravel())
        img.pack()
        res.append(img)
    _images[nom] = tuple(res)
    return _images[nom]


def oublier(*noms):
    """À appeler dans Blender après avoir changé la fabrique d'une matière : sa texture sera refaite (sinon Blender garde
    celle d'avant, même après avoir rechargé les scripts)."""
    for nom in noms:
        _images.pop(nom, None)
        m = bpy.data.materials.get(nom)
        if m is not None:
            m["n5"] = 0
        for suffixe in ("", "_relief"):
            img = bpy.data.images.get(f"n5_{nom}{suffixe}")
            if img is not None:
                bpy.data.images.remove(img)


COULEURS_SITE = {"luciole": (1.0, 0.95, 0.48), "lave": (1.0, 0.36, 0.08), "ecume": (0.95, 0.98, 1.0), "ombre_eau": (0.05, 0.2, 0.24), "vitre": (1.0, 0.82, 0.45), "lumiere": (1.0, 0.95, 0.66), "feu": (1.0, 0.6, 0.12), "rose": (1.0, 0.31, 0.6), "violet": (0.61, 0.3, 1.0), "voile": (0.98, 0.95, 0.87), "voile_b": (0.98, 0.95, 0.87),
                 "drapeau": (1.0, 0.31, 0.6), "flamme": (1.0, 0.31, 0.6), "fanion_rose": (1.0, 0.31, 0.6), "fanion_or": (1.0, 0.76, 0.24), "fanion_violet": (0.61, 0.3, 1.0), "fanion_turquoise": (0.18, 0.83, 0.77), "fanion_creme": (1.0, 0.95, 0.84)}


def materiau(nom):
    """La matière Blender : pour une matière du niveau 5, sa texture (motif) et son relief ; pour une matière du site, sa couleur."""
    m = bpy.data.materials.get(nom)
    if m is not None and m.get("n5") == 2:
        return m
    m = m or bpy.data.materials.new(nom)
    m["n5"] = 2
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    sortie = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs[0], sortie.inputs[0])
    if nom in COULEURS_SITE:
        c = COULEURS_SITE[nom]
        lin = tuple(pow(x, 2.2) for x in c)
        bsdf.inputs["Base Color"].default_value = (*lin, 1)
        if nom in ("vitre", "lumiere", "luciole", "lave", "feu"):
            bsdf.inputs["Emission Color"].default_value = (*lin, 1)
            bsdf.inputs["Emission Strength"].default_value = {"vitre": 0.0, "lave": 6.0}.get(nom, 2.0)  # la lave éclaire la roche autour d'elle
        if nom.startswith("voile") and "toile_ecrue" in MATIERES:  # pour les rendus : de la vraie toile (le site, lui, dessine la sienne)
            coul, relief = image_de("toile_ecrue")
            uv = nt.nodes.new("ShaderNodeUVMap")
            uv.uv_map = "motif"
            pose = nt.nodes.new("ShaderNodeMapping")
            pose.inputs["Scale"].default_value = (2.0, 3.0, 1.0)
            tc = nt.nodes.new("ShaderNodeTexImage")
            tc.image = coul
            tr = nt.nodes.new("ShaderNodeTexImage")
            tr.image = relief
            bosse = nt.nodes.new("ShaderNodeBump")
            bosse.inputs["Strength"].default_value = 0.3
            bosse.inputs["Distance"].default_value = 0.02
            nt.links.new(uv.outputs[0], pose.inputs[0])
            nt.links.new(pose.outputs[0], tc.inputs[0])
            nt.links.new(pose.outputs[0], tr.inputs[0])
            nt.links.new(tc.outputs[0], bsdf.inputs["Base Color"])
            nt.links.new(tr.outputs[0], bosse.inputs["Height"])
            nt.links.new(bosse.outputs[0], bsdf.inputs["Normal"])
            bsdf.inputs["Roughness"].default_value = 0.95
        return m
    info = MATIERES[nom]
    coul, relief = image_de(nom)
    uv = nt.nodes.new("ShaderNodeUVMap")
    uv.uv_map = "motif"
    tc = nt.nodes.new("ShaderNodeTexImage")
    tc.image = coul
    tr = nt.nodes.new("ShaderNodeTexImage")
    tr.image = relief
    bosse = nt.nodes.new("ShaderNodeBump")
    bosse.inputs["Strength"].default_value = info["relief"]
    bosse.inputs["Distance"].default_value = 0.03
    nt.links.new(uv.outputs[0], tc.inputs[0])
    nt.links.new(uv.outputs[0], tr.inputs[0])
    te = nt.nodes.new("ShaderNodeMix")
    te.name = "n5_teinte"
    te.data_type = "RGBA"
    te.blend_type = "MULTIPLY"
    te.inputs[0].default_value = 1.0
    te.inputs[7].default_value = (1, 1, 1, 1)
    nt.links.new(tc.outputs[0], te.inputs[6])
    nt.links.new(te.outputs[2], bsdf.inputs["Base Color"])
    nt.links.new(tr.outputs[0], bosse.inputs["Height"])
    nt.links.new(bosse.outputs[0], bsdf.inputs["Normal"])
    bsdf.inputs["Roughness"].default_value = info["rugueux"]
    bsdf.inputs["Metallic"].default_value = info["metal"]
    return m


def teinter(nom, couleur=(1.0, 1.0, 1.0)):
    """Pour un rendu : la matière prend cette teinte (sRGB, 0..1) ; blanc pour la cuisson (c'est le site qui teinte)."""
    m = bpy.data.materials.get(nom)
    n = m and m.node_tree.nodes.get("n5_teinte")
    if n:
        n.inputs[7].default_value = (*[pow(x, 2.2) for x in couleur], 1)


def collection(nom, vider=True):
    c = bpy.data.collections.get(nom)
    if c is None:
        c = bpy.data.collections.new(nom)
        bpy.context.scene.collection.children.link(c)
    elif vider:
        for o in list(c.objects):
            bpy.data.objects.remove(o, do_unlink=True)
    return c


def objet(maille, coll, nom=None, lisse_angle=40, origine=None, extras=None):
    """La maille devient un objet Blender (avec ses matières et l'UV « motif »).
    origine : l'objet est posé là, et la maille est déjà dessinée autour de ce point (ce qui tourne, ce qui flotte au vent)."""
    v, faces, mats, uv = maille.tableaux()
    me = bpy.data.meshes.new(nom or maille.nom)
    me.from_pydata([tuple(p) for p in v], [], faces)
    me.polygons.foreach_set("material_index", mats)
    for m in maille.mats:
        me.materials.append(materiau(m))
    couche = me.uv_layers.new(name="motif")
    couche.data.foreach_set("uv", np.ascontiguousarray(uv, np.float32).ravel())
    if maille.atlas is not None:
        at = me.uv_layers.new(name="atlas")
        at.data.foreach_set("uv", np.ascontiguousarray(np.concatenate(maille.atlas), np.float32).ravel())
    if any(maille.zones):
        ca = me.color_attributes.new(name="Color", type="BYTE_COLOR", domain="CORNER")
        teintes = {0: (1.0, 1.0, 1.0, 1.0), 1: (1.0, 0.0, 0.0, 1.0), 2: (0.0, 1.0, 0.0, 1.0)}
        # une zone peut aussi être une couleur (r, v, b) : le site s'en sert pour animer (le vent dans les feuilles, les
        # membres d'un marcheur), voir animee5() dans js/grandline-3d.js
        # (Blender range cette couleur en linéaire et le site la relit en sRGB : on l'écrit donc « délinéarisée », pour que le
        # site retrouve exactement la valeur voulue)
        lin = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
        ca.data.foreach_set("color", np.asarray([(teintes[z] if not isinstance(z, tuple) else (*[lin(c) for c in z], 1.0)) for f, z in zip(faces, maille.zones) for _ in f], np.float32).ravel())
        me.color_attributes.active_color = ca
        try:
            me.color_attributes.render_color_index = 0
        except Exception:
            pass
    me.update()
    me.polygons.foreach_set("use_smooth", np.ones(len(faces), bool))
    try:
        me.set_sharp_from_angle(angle=math.radians(lisse_angle))
    except Exception:
        pass
    o = bpy.data.objects.new(nom or maille.nom, me)
    if origine is not None:
        o.location = tuple(origine)
    for k, val in (extras or {}).items():
        o[k] = val
    coll.objects.link(o)
    return o


def copie(source, coll, nom, origine, extras=None):
    """Le même objet ailleurs (il partage sa maille, donc sa place dans l'atlas) : dix passants, quatre modèles de passant."""
    o = bpy.data.objects.new(nom, source.data)
    o.location = tuple(origine)
    for k, val in (extras or {}).items():
        o[k] = val
    coll.objects.link(o)
    return o


def repere(coll, nom, position=(0, 0, 0), extras=None):
    """Un repère (un objet vide) : le site y pose un effet (anim = « fumees », « oiseaux », « faisceau »…)."""
    o = bpy.data.objects.new(nom, None)
    o.empty_display_size = 0.2
    o.location = tuple(position)
    o["role"] = "repere"
    for k, val in (extras or {}).items():
        o[k] = val
    coll.objects.link(o)
    return o


def soleil_et_ciel(soleil=(-0.5, -0.62, 0.62), force=4.2, chaud=(1.0, 0.87, 0.68), ciel=(0.5, 0.66, 1.0), force_ciel=0.75, taille=3.0):
    """La lumière du niveau 5 : un soleil chaud, assez bas, et un ciel bleuté qui débouche les ombres."""
    sc = bpy.context.scene
    for o in [o for o in sc.objects if o.type == "LIGHT" and o.name.startswith("n5_")]:
        bpy.data.objects.remove(o, do_unlink=True)
    d = bpy.data.lights.new("n5_soleil", "SUN")
    d.energy = force
    d.color = chaud
    d.angle = math.radians(taille)
    o = bpy.data.objects.new("n5_soleil", d)
    sc.collection.objects.link(o)
    v = np.asarray(soleil, np.float64)
    v = v / np.linalg.norm(v)
    o.rotation_euler = (math.acos(v[2]), 0, math.atan2(v[0], -v[1]))
    w = sc.world or bpy.data.worlds.new("n5_monde")
    sc.world = w
    w.use_nodes = True
    fond = w.node_tree.nodes.get("Background")
    if fond:
        fond.inputs[0].default_value = (*ciel, 1)
        fond.inputs[1].default_value = force_ciel
    return o


def cycles(echantillons=64):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    try:
        cp = bpy.context.preferences.addons["cycles"].preferences
        for genre in ("OPTIX", "CUDA"):
            try:
                cp.compute_device_type = genre
                cp.get_devices()
                if any(d.type == genre for d in cp.devices):
                    for d in cp.devices:
                        d.use = d.type == genre
                    sc.cycles.device = "GPU"
                    break
            except Exception:
                continue
    except Exception:
        pass
    sc.cycles.samples = echantillons
    sc.cycles.use_denoising = True
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.render.use_freestyle = False  # (les contours à l'encre, c'était l'ancien style : ici, pas de trait)
    return sc.cycles.device


def pixels_atlas(nom):
    """L'atlas cuit, en tableau (h, l, 3), ligne 0 en bas (comme les UV)."""
    img = bpy.data.images["n5_atlas_" + nom]
    l, h = img.size
    px = np.empty(l * h * 4, np.float32)
    img.pixels.foreach_get(px)
    return px.reshape(h, l, 4)[:, :, :3]


def cuire_ensemble(objets, fichier, taille=2048, echantillons=48, marge=2, nom="modele", fond=(0.07, 0.3, 0.46), remplacer=True):
    """Cuit couleur + lumière + ombres (Cycles) de tous ces objets dans UN atlas (leurs UV « atlas » viennent d'emballer()),
    enregistre l'image, puis remplace leurs matières par une seule : « atlas_<nom> » (le site la reconnaît à son nom et y met
    l'image). Renvoie le chemin de l'image.
    Pendant la cuisson, SEULES les collections de ces objets sont visibles : la scène de travail garde les autres modèles à
    l'origine, et ils feraient de l'ombre (une ville cuite sous une autre île sort toute noire)."""
    sc = bpy.context.scene
    cycles(echantillons)
    garder = {c.name for o in objets for c in o.users_collection}
    avant_col = {col.name: col.hide_render for col in sc.collection.children}
    for col in sc.collection.children:
        col.hide_render = col.name not in garder
    for x in [x for x in sc.objects if x.name.startswith("n5r_") or x.name.startswith("n5c_")]:
        bpy.data.objects.remove(x, do_unlink=True)
    avant_obj = {}
    for x in sc.collection.objects:
        if x.type != "LIGHT" and x not in objets:
            avant_obj[x.name] = x.hide_render
            x.hide_render = True
    sol = None
    if fond is not None:
        # le fond de la mer : il renvoie un peu de bleu sous les quais, et le ciel n'éclaire pas la ville par en dessous
        bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, -2.6))
        sol = bpy.context.active_object
        sol.name = "n5c_fond"
        mf = bpy.data.materials.get("n5c_fond") or bpy.data.materials.new("n5c_fond")
        mf.use_nodes = True
        bs = mf.node_tree.nodes["Principled BSDF"]
        bs.inputs["Base Color"].default_value = (*fond, 1)
        bs.inputs["Roughness"].default_value = 1.0
        sol.data.materials.append(mf)
    for x in sc.objects:
        x.select_set(False)
    for o in objets:
        me = o.data
        me.uv_layers.active = me.uv_layers["atlas"]
        o.hide_set(False)
    img = bpy.data.images.get("n5_atlas_" + nom)
    if img is None or img.size[0] != taille:
        if img is not None:
            bpy.data.images.remove(img)
        img = bpy.data.images.new("n5_atlas_" + nom, taille, taille, alpha=False)
    b = sc.render.bake
    b.use_pass_direct = b.use_pass_indirect = b.use_pass_diffuse = b.use_pass_emit = True
    b.use_pass_glossy = b.use_pass_transmission = False
    b.margin = marge
    b.target = "IMAGE_TEXTURES"
    try:
        vide = np.zeros(taille * taille * 4, np.float32)
        vide[3::4] = 1.0
        img.pixels.foreach_set(vide)
        for x in sc.objects:
            x.select_set(False)
        for o in objets:
            o.select_set(True)
            for m in o.data.materials:
                nt = m.node_tree
                n = nt.nodes.get("n5_cible") or nt.nodes.new("ShaderNodeTexImage")
                n.name = "n5_cible"
                n.image = img
                for x in nt.nodes:
                    x.select = False
                n.select = True
                nt.nodes.active = n
        bpy.context.view_layer.objects.active = objets[0]
        b.use_clear = False
        bpy.ops.object.bake(type="COMBINED")
    finally:
        if sol is not None:
            bpy.data.objects.remove(sol, do_unlink=True)
        for col in sc.collection.children:
            col.hide_render = avant_col.get(col.name, False)
        for x in sc.collection.objects:
            if x.name in avant_obj:
                x.hide_render = avant_obj[x.name]
    if not remplacer:  # une cuisson d'essai (pour trouver les faces cachées) : on ne touche à rien
        return None
    os.makedirs(os.path.dirname(fichier), exist_ok=True)
    img.filepath_raw = fichier
    img.file_format = "PNG"
    img.save()
    m = bpy.data.materials.get("atlas_" + nom) or bpy.data.materials.new("atlas_" + nom)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    sortie = nt.nodes.new("ShaderNodeOutputMaterial")
    emi = nt.nodes.new("ShaderNodeEmission")
    tx = nt.nodes.new("ShaderNodeTexImage")
    tx.image = img
    nt.links.new(tx.outputs[0], emi.inputs[0])
    nt.links.new(emi.outputs[0], sortie.inputs[0])
    for o in objets:
        # une seule matière, donc un seul paquet de triangles par objet dans le GLB (un seul appel de dessin sur le site)
        me = o.data
        me.polygons.foreach_set("material_index", [0] * len(me.polygons))
        me.materials.clear()
        me.materials.append(m)
        if me.uv_layers.get("motif"):
            me.uv_layers.remove(me.uv_layers["motif"])
        me.update()
    return fichier


def exporter(coll_nom, fichier, normales=False, couleurs=False):
    """Exporte une collection en GLB (sans image dedans : l'atlas voyage à côté, en .webp)."""
    sc = bpy.context.scene
    for x in sc.objects:
        x.select_set(False)
    for o in bpy.data.collections[coll_nom].all_objects:
        o.hide_set(False)
        o.select_set(True)
    chemin = os.path.join(dossier(), "glb", fichier)
    os.makedirs(os.path.dirname(chemin), exist_ok=True)
    reglages = dict(filepath=chemin, export_format="GLB", use_selection=True, export_apply=True, export_yup=True, export_extras=True, export_materials="EXPORT",
                    export_texcoords=True, export_normals=normales, export_cameras=False, export_lights=False, export_animations=False, export_image_format="NONE")
    try:
        if couleurs:  # les zones à teindre (rouge : couleur principale de la commu ; vert : la seconde)
            bpy.ops.export_scene.gltf(**reglages, export_vertex_color="ACTIVE", export_all_vertex_colors=False, export_active_vertex_color_when_no_material=True)
        else:
            bpy.ops.export_scene.gltf(**reglages, export_vertex_color="NONE")
    except TypeError:
        bpy.ops.export_scene.gltf(**reglages)
    return chemin, os.path.getsize(chemin)


def rendre(nom, cam, cible, objectif=50, taille=(1600, 1000), echantillons=96, collections=None, mer=True, fond=(0.62, 0.78, 0.93)):
    """Un beau rendu d'essai (Cycles) : la mer, le ciel, le soleil du niveau 5."""
    sc = bpy.context.scene
    cycles(echantillons)
    for o in [o for o in sc.objects if o.name.startswith("n5r_")]:
        bpy.data.objects.remove(o, do_unlink=True)
    if mer:
        bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, 0))
        p = bpy.context.active_object
        p.name = "n5r_mer"
        m = bpy.data.materials.new("n5r_mer")
        m.use_nodes = True
        bs = m.node_tree.nodes["Principled BSDF"]
        bs.inputs["Base Color"].default_value = (0.07, 0.3, 0.46, 1)
        bs.inputs["Roughness"].default_value = 0.12
        vague = m.node_tree.nodes.new("ShaderNodeTexNoise")
        vague.inputs["Scale"].default_value = 1.6
        vague.inputs["Detail"].default_value = 3.0
        bosse = m.node_tree.nodes.new("ShaderNodeBump")
        bosse.inputs["Strength"].default_value = 0.12
        m.node_tree.links.new(vague.outputs[0], bosse.inputs["Height"])
        m.node_tree.links.new(bosse.outputs[0], bs.inputs["Normal"])
        p.data.materials.append(m)
    c = bpy.data.cameras.new("n5r_cam")
    c.lens = objectif
    co = bpy.data.objects.new("n5r_cam", c)
    sc.collection.objects.link(co)
    co.location = cam
    d = np.asarray(cible, np.float64) - np.asarray(cam, np.float64)
    co.rotation_euler = __import__("mathutils").Vector(d).to_track_quat("-Z", "Y").to_euler()
    sc.camera = co
    sc.render.resolution_x, sc.render.resolution_y = taille
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = False
    if collections is not None:
        for col in sc.collection.children:
            col.hide_render = col.name not in collections
    chemin = os.path.join(dossier(), "rendus", nom + ".png")
    sc.render.image_settings.file_format = "PNG"
    sc.render.filepath = chemin
    bpy.ops.render.render(write_still=True)
    for o in [o for o in sc.objects if o.name.startswith("n5r_")]:
        bpy.data.objects.remove(o, do_unlink=True)
    if collections is not None:
        for col in sc.collection.children:
            col.hide_render = False
    return chemin
