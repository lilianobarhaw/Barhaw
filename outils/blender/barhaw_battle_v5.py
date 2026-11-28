# L'Île sans retour (la Battle Royale), « niveau 5 » : le volcan, son lac de lave et ses cinq coulées, la jungle, les
# cocotiers, la grève, les épaves, les camps de ceux qui ont débarqué. Tout est inventé.
# Le relief est EXACTEMENT celui du site (js/battle-3d.js, hauteur()) : les pirates se posent dessus au même endroit.
# Ici, une unité vaut 6 unités du site ; x = X / 6, y = -Z / 6 (le site remet le modèle à sa taille).
# Ce qui sort :
#   · ile_corps : le terrain et tout ce qui ne bouge pas (rochers de mer, épaves, camps), sa lumière cuite dans l'atlas ;
#   · ile_typeN : la végétation, par « types » cuits une seule fois (une version au soleil, une à l'ombre du volcan) ; le
#     site sème chaque type aux places écrites dans ses extras (x, y, z, taille, teinte), d'un seul dessin par type. Le vent
#     les fait frémir (la couleur de sommet : 1 - vert = ce qui bouge), la marée les avale (le site enfonce chaque pied ; les
#     rochers, eux, restent en place et la mer les recouvre) ;
#   · ile_lumieres : les coulées de lave (matière « lave » : le site la fait couler) et les braises des feux (« feu ») ;
#   · ile_libre0 : le lac de lave du cratère.
# Pendant la cuisson, chaque plante est vraiment posée à sa place (une copie) : son ombre est cuite sur le sol.
# Sorties : ile-battle-v5.glb (+ -leger) et son atlas .png, dans Documents/Barhaw-3D/glb.
import math, os, json, time, random
import numpy as np
import barhaw_niveau5 as N
import barhaw_ile_v5 as K
import barhaw_port_v5 as P
import barhaw_arbre_v5 as Ar
import barhaw_ambre_v5 as Am
import barhaw_tresor_v5 as Tr
import barhaw_cimetiere_v5 as Ci
import barhaw_braise_v5 as Bz

PI = math.pi
T, Rz, Rx, Ry, S = N.T, N.Rz, N.Rx, N.Ry, N.S
E = 6.0  # une unité d'ici = 6 unités du site
R3, VX, VZ, VR, VH = 44.0, 7.0, -9.0, 19.0, 31.0  # comme dans js/battle-3d.js (en unités du site)
NIVEAUX = (0.0, 1.6, 3.6, 6.2, 9.5)  # la mer à chaque marée (unités du site)
R_SOL = 8.0  # le sol est peint d'un seul tenant, de -R_SOL à R_SOL
VOLCAN = (VX / E, -VZ / E)
SOLEIL = (-0.62, 0.78, 0.53)  # d'où vient la lumière cuite : le soleil couchant du site, remonté à 28° (sinon l'île est noire)
_PX = "145,406,146,342,148,412,152,365,154,302,154,321,156,304,157,292,157,390,160,330,162,294,166,278,166,372,166,419,166,440,167,358,172,351,172,453,173,328,173,334,174,292,174,340,175,460,176,443,178,342,179,335,180,320,182,287,182,310,182,357,183,316,186,280,186,318,190,374,190,378,192,234,193,242,195,455,196,220,197,333,199,381,202,238,205,440,207,469,208,208,208,414,210,330,212,258,212,341,213,381,213,396,214,275,214,404,215,186,216,344,216,364,216,418,218,452,219,186,219,378,220,260,220,344,224,266,224,268,224,368,225,426,226,367,226,385,227,440,228,226,228,352,230,256,230,328,230,398,232,198,232,282,233,407,234,246,234,444,234,450,234,467,234,470,236,363,236,398,236,436,237,338,238,373,238,394,238,434,238,496,238,508,239,248,239,484,240,189,242,335,243,482,244,275,244,410,245,348,245,490,246,431,246,441,247,266,248,212,248,356,248,512,248,543,249,188,250,330,250,386,250,434,252,226,252,365,254,312,256,497,256,522,258,206,258,284,258,320,258,322,258,484,259,366,259,538,261,474,262,266,262,275,262,336,262,554,262,568,264,335,265,313,265,368,265,424,265,584,266,179,266,222,266,271,266,370,266,425,266,434,268,206,269,287,269,409,269,488,270,218,271,226,271,374,271,416,272,158,272,540,273,519,274,252,274,286,274,288,274,346,275,340,275,355,275,396,276,377,276,420,276,430,276,472,278,450,279,430,279,460,279,524,279,572,280,358,280,364,280,428,280,504,280,534,282,192,282,274,284,159,284,444,284,565,285,548,286,272,287,168,288,246,288,323,288,456,288,471,288,486,288,492,290,246,290,272,292,277,292,343,292,354,292,381,294,284,294,370,294,384,294,408,294,547,295,390,295,560,296,152,296,172,296,474,297,375,298,154,298,330,298,375,298,483,299,338,299,382,299,476,300,246,300,335,300,498,301,314,301,318,302,225,302,298,302,374,303,550,304,330,304,448,305,380,305,394,305,546,306,348,307,267,307,338,308,198,308,258,308,359,308,400,308,523,310,334,310,526,311,246,311,346,312,272,312,334,312,362,312,394,312,406,313,304,314,210,314,277,314,278,314,313,314,319,314,322,314,408,315,222,315,310,315,339,315,576,316,287,316,313,316,316,316,469,316,480,317,295,318,284,318,342,318,358,318,374,319,298,320,342,320,524,321,446,322,220,322,271,322,330,322,432,322,498,323,372,324,360,324,392,324,412,324,428,324,476,325,336,326,228,326,306,326,328,326,399,327,347,328,276,328,280,328,281,328,287,328,332,328,369,329,273,329,350,330,178,330,282,330,318,330,388,330,434,330,436,330,505,330,518,331,368,332,146,332,248,332,268,332,378,332,380,332,411,332,424,333,228,333,444,333,452,333,469,334,140,334,256,334,263,334,326,334,389,334,432,335,329,335,400,336,222,336,297,336,359,336,419,336,488,338,214,338,311,338,402,338,426,338,458,338,469,338,492,338,558,338,578,339,254,339,309,339,395,339,468,340,168,340,314,340,373,340,404,340,520,341,282,341,500,342,281,342,340,342,360,342,374,342,468,342,477,343,314,343,334,343,462,344,346,344,372,344,379,344,394,344,458,344,509,347,302,348,204,348,226,348,228,348,254,348,262,348,280,348,312,348,355,348,402,348,432,348,454,348,538,349,314,349,376,349,385,350,246,350,390,350,424,352,218,352,225,352,336,352,370,353,381,353,410,353,456,354,280,354,292,354,312,356,309,356,322,356,358,356,370,356,437,357,336,357,355,358,196,358,210,358,310,358,356,358,378,358,392,358,418,359,176,360,306,360,316,360,355,360,380,360,416,361,268,361,336,362,212,362,276,362,300,362,360,362,411,362,448,362,462,362,580,364,232,364,346,364,396,364,406,364,448,364,484,364,536,366,145,366,238,366,272,366,278,366,299,366,368,366,380,366,384,366,400,366,425,366,448,366,464,366,518,366,532,366,538,366,576,367,342,368,335,368,344,369,222,369,270,369,310,369,352,369,516,370,176,370,270,370,386,371,388,372,333,372,337,372,358,372,472,372,534,373,389,374,286,374,364,374,388,376,133,376,218,376,237,376,362,376,363,376,376,376,404,377,384,378,325,378,350,378,360,378,390,378,402,379,202,379,250,379,328,379,440,380,230,380,328,380,368,380,386,380,392,380,442,380,447,380,448,380,454,380,474,382,252,382,336,382,439,382,462,382,489,383,268,383,345,384,353,384,430,384,460,385,136,386,260,386,400,386,407,386,487,386,593,387,369,387,380,387,424,388,168,388,226,388,274,388,338,389,354,389,410,389,432,389,559,389,562,390,206,390,268,390,394,390,428,390,436,392,189,392,379,392,382,392,404,394,233,394,245,394,266,394,272,394,412,394,483,396,150,396,241,396,386,397,492,398,200,398,251,398,253,398,272,398,356,398,362,398,396,398,428,399,144,399,369,400,346,400,480,402,229,402,374,402,396,402,425,402,592,403,447,404,182,404,204,404,388,404,557,404,566,406,244,406,262,406,266,406,270,406,374,406,546,407,406,407,428,409,368,409,497,410,242,410,246,410,352,410,514,410,543,412,252,412,373,412,496,413,241,414,382,414,390,414,406,414,455,415,147,415,376,415,406,416,262,416,266,416,566,417,222,417,394,418,230,418,269,418,336,419,468,420,204,420,531,422,226,422,254,422,362,422,576,423,370,424,232,424,244,424,254,424,380,424,396,424,399,426,244,426,352,426,400,426,454,426,502,426,544,429,456,430,152,430,243,430,274,430,370,430,406,430,487,431,504,432,163,432,237,432,256,432,340,432,369,432,400,432,442,432,466,433,269,433,335,434,328,434,362,434,578,435,366,435,393,435,414,436,354,436,534,437,390,437,466,438,227,438,400,438,486,439,264,440,218,440,266,440,299,440,300,440,344,440,359,440,373,440,378,440,382,440,500,440,512,441,228,441,259,441,448,442,350,442,366,442,404,444,360,444,412,445,326,445,358,446,250,446,322,446,338,446,375,446,381,446,444,447,307,447,410,448,170,448,326,448,331,448,364,448,377,448,397,448,398,448,416,448,466,448,566,449,299,450,294,451,322,452,217,452,220,452,232,452,255,452,310,452,502,453,306,453,418,454,228,454,270,454,293,454,320,454,339,454,357,454,456,456,224,456,375,456,438,457,338,458,212,458,322,458,325,458,400,458,438,459,172,460,258,460,420,462,317,462,370,462,392,462,407,463,368,463,424,464,172,464,236,464,306,464,309,464,468,465,355,465,376,465,506,466,260,466,379,467,516,468,264,468,327,468,462,470,184,470,297,472,291,472,293,472,372,472,524,473,422,474,274,474,324,474,399,474,412,474,482,475,249,475,290,475,371,476,170,476,329,476,436,476,443,477,232,477,236,478,273,478,317,478,328,478,366,478,374,478,406,479,258,479,274,479,304,480,189,480,448,482,160,482,271,482,304,482,336,483,467,484,210,484,322,484,434,486,304,486,388,486,436,487,148,488,302,488,311,488,408,489,282,489,354,489,394,490,167,490,462,490,516,491,506,492,285,492,296,492,386,492,408,494,218,494,234,494,271,494,305,494,351,494,484,494,499,496,346,497,394,498,260,498,399,498,484,498,498,499,452,502,185,502,244,502,286,502,390,502,396,502,415,503,236,504,212,504,221,504,399,504,466,506,290,506,413,507,321,507,348,508,310,508,398,508,438,510,312,510,398,512,448,514,241,514,259,515,331,516,272,516,311,520,258,520,346,522,182,522,197,522,232,522,238,523,435,523,509,524,368,524,422,526,468,529,338,530,184,530,232,530,256,530,405,532,424,532,434,534,327,536,318,536,322,536,376,537,496,538,318,538,346,538,398,538,449,544,470,545,254,546,482,548,372,550,276,550,358,552,266,552,362,554,310,554,438,556,236,557,288,568,372,569,295,570,445"  # les places des pirates sur la carte du bot (720 × 720), toutes marées confondues


# ---------- le relief : le même calcul que le site, au nombre près ----------
def _hash(x, y):
    s = np.sin(x * 127.1 + y * 311.7) * 43758.5453
    return s - np.floor(s)


def _bruit(x, y):
    xi, yi = np.floor(x), np.floor(y)
    xf, yf = x - xi, y - yi
    u, v = xf * xf * (3 - 2 * xf), yf * yf * (3 - 2 * yf)
    a, b, c, d = _hash(xi, yi), _hash(xi + 1, yi), _hash(xi, yi + 1), _hash(xi + 1, yi + 1)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v


def _fbm(x, y, o=5):
    s, a, f = 0.0, 0.5, 1.0
    for _ in range(o):
        s = s + a * _bruit(x * f, y * f)
        f *= 2.03
        a *= 0.5
    return s


def _lisse01(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def hauteur(x, z):
    """La hauteur du terrain en (x, z), en unités du site : la copie exacte de hauteur() dans js/battle-3d.js."""
    x, z = np.asarray(x, np.float64), np.asarray(z, np.float64)
    ang = np.arctan2(z, x)
    bord = 1 + 0.42 * (_fbm(np.cos(ang) * 1.6 + 5, np.sin(ang) * 1.6 + 5, 4) - 0.5)
    dd = np.hypot(x, z) / R3 / bord
    h = (1 - dd * dd) * 8 - 1.4
    h = h + (_fbm(x * 0.07 + 3, z * 0.07 + 7, 5) - 0.42) * 8 * np.maximum(0, 1 - dd)
    dv = np.hypot(x - VX, z - VZ) / VR
    # le cône, creusé d'un vrai cratère ; les ravines qui descendent de son bord, le grain de la roche
    cone = np.minimum(np.maximum(0, 1 - dv) ** 1.7 * VH, 16 + 130 * dv * dv) * (0.85 + 0.3 * _fbm(x * 0.2, z * 0.2, 3))
    av = np.arctan2(z - VZ, x - VX)
    flanc = _lisse01(0.2, 0.32, dv) * _lisse01(1.0, 0.55, dv)
    ravines = flanc * (np.cos(av * 11 + 4 * _fbm(x * 0.06 + 9, z * 0.06 + 4, 2)) * 1.5 + (_fbm(x * 0.55 + 2, z * 0.55 + 8, 3) - 0.5) * 2)
    h = np.where(dv < 1, h + cone + ravines, h)
    return np.where(dd > 1, np.minimum(h, -1.5 - (dd - 1) * 26), h)


def sol(x, y):
    """La hauteur du sol ici (unités d'ici)."""
    return float(hauteur(E * x, -E * y)) / E


_CHAMPS = {}


def _axes(n):
    a = (np.arange(n) + 0.5) / n * 2 * R_SOL - R_SOL
    return np.meshgrid(a, a)  # la ligne 0 au sud


def grille(n=1024):
    """Le relief relevé une fois sur une grille de l'île (n × n)."""
    if ("h", n) not in _CHAMPS:
        X, Y = _axes(n)
        _CHAMPS[("h", n)] = (hauteur(E * X, -E * Y) / E).astype(np.float32)
    return _CHAMPS[("h", n)]


def lire(champ, x, y):
    """La valeur d'un champ (une grille carrée sur l'île) en (x, y), lissée entre ses points. x, y : nombres ou tableaux."""
    n = champ.shape[0]
    fx = (np.asarray(x, np.float64) + R_SOL) / (2 * R_SOL) * n - 0.5
    fy = (np.asarray(y, np.float64) + R_SOL) / (2 * R_SOL) * n - 0.5
    x0 = np.clip(np.floor(fx).astype(int), 0, n - 2)
    y0 = np.clip(np.floor(fy).astype(int), 0, n - 2)
    tx, ty = np.clip(fx - x0, 0, 1), np.clip(fy - y0, 0, 1)
    return (champ[y0, x0] * (1 - tx) + champ[y0, x0 + 1] * tx) * (1 - ty) + (champ[y0 + 1, x0] * (1 - tx) + champ[y0 + 1, x0 + 1] * tx) * ty


def sol_r(x, y):
    """Le sol lu sur la grille (rapide, au millimètre près)."""
    return lire(grille(), x, y)


def pente_champ():
    if "pente" not in _CHAMPS:
        g = grille()
        gy, gx = np.gradient(g.astype(np.float64), 2 * R_SOL / g.shape[0])
        _CHAMPS["pente"] = np.hypot(gx, gy).astype(np.float32)
    return _CHAMPS["pente"]


def places():
    """Les places des pirates, en unités d'ici."""
    a = np.array([int(v) for v in _PX.split(",")], np.float64).reshape(-1, 2)
    return np.stack([(a[:, 0] / 360 - 1) * 58 / E, -(a[:, 1] / 360 - 1) * 58 / E], 1)


def distance_aux_points(pts, n=512):
    """Pour chaque point d'une grille de l'île, la distance au plus proche de ces points."""
    X, Y = _axes(n)
    d = np.full((n, n), 99.0, np.float32)
    pts = np.asarray(pts, np.float64)
    for k in range(0, len(pts), 48):
        q = pts[k:k + 48]
        d = np.minimum(d, np.sqrt(((X[..., None] - q[:, 0]) ** 2 + (Y[..., None] - q[:, 1]) ** 2).min(axis=2)).astype(np.float32))
    return d


def loin_des_places():
    if "places" not in _CHAMPS:
        _CHAMPS["places"] = distance_aux_points(places())
    return _CHAMPS["places"]


def coulees():
    """Les cinq coulées de lave : du bord du cratère, chacune descend la pente (comme sur le site), puis son tracé est adouci."""
    if "coulees" not in _CHAMPS:
        rng = random.Random(4711)
        res = []
        for a0 in (0.6, 1.9, 2.6, 4.4, 5.3):
            x, z = VX + math.cos(a0) * VR * 0.225, VZ + math.sin(a0) * VR * 0.225  # juste dehors du bord du cratère
            pts = []
            for k in range(90):
                if float(hauteur(x, z)) < 3:
                    break
                pts.append((x / E, -z / E))
                e = 0.3
                gx, gz = float(hauteur(x + e, z) - hauteur(x - e, z)), float(hauteur(x, z + e) - hauteur(x, z - e))
                gg = math.hypot(gx, gz) or 1.0
                x -= gx / gg * 0.55 + math.cos(a0) * 0.12 + (rng.random() - 0.5) * 0.25
                z -= gz / gg * 0.55 + math.sin(a0) * 0.12 + (rng.random() - 0.5) * 0.25
            p = np.array(pts)
            for _ in range(3):  # adouci (les deux bouts restent en place)
                p[1:-1] = (p[:-2] + 2 * p[1:-1] + p[2:]) / 4
            res.append(p)
        _CHAMPS["coulees"] = res
    return _CHAMPS["coulees"]


def loin_des_coulees():
    if "dcoul" not in _CHAMPS:
        pts = []
        for p in coulees():
            for a, b in zip(p[:-1], p[1:]):
                pts += [a + (b - a) * t for t in (0.0, 0.34, 0.67)]
        _CHAMPS["dcoul"] = distance_aux_points(np.array(pts))
    return _CHAMPS["dcoul"]


# ---------- les matières ----------
_LUEUR = {}


def tx_sol_battle(cote=4096, graine=71):
    """Le sol peint pixel par pixel : le sable et sa laisse de mer, l'herbe rase, le sol de la jungle (la mousse, la litière),
    la roche partout où c'est raide et en altitude, la cendre du cône, le lit brûlé des coulées. Ce qui rougeoie (les
    fissures du haut du cône, le bord des coulées) est rangé à part : _LUEUR["sol"]."""
    n = cote
    g = grille()
    h = K.agrandir(g, n) * E  # en unités du site, comme les seuils de js/battle-3d.js
    pente = K.agrandir(pente_champ(), n)
    X, Y = _axes(n)
    dv = (np.hypot(X - VOLCAN[0], Y - VOLCAN[1]) * E / VR).astype(np.float32)
    del X, Y
    dc = K.agrandir(loin_des_coulees(), n)
    Xc, Yc = _axes(1024)
    X3, Z3 = E * Xc, -E * Yc
    av = np.arctan2(Z3 - VZ, X3 - VX)
    ravine = K.agrandir(np.cos(av * 11 + 4 * _fbm(X3 * 0.06 + 9, Z3 * 0.06 + 4, 2)).astype(np.float32), n)  # -1 : le fond d'une ravine ; 1 : une crête
    trainee = K.agrandir((0.5 + 0.5 * np.sin(av * 43 + 6 * _fbm(X3 * 0.11 + 1, Z3 * 0.11 + 6, 2) + np.hypot(X3 - VX, Z3 - VZ) * 0.5)).astype(np.float32), n)
    del Xc, Yc, X3, Z3, av
    b1, b2, b3 = N.bruit(n, 6, 6, graine, 4), N.bruit(n, 24, 24, graine + 1, 3), N.bruit(n, 80, 80, graine + 2, 2)
    fin, grain = N.bruit(n, 220, 220, graine + 3, 2), N.bruit(n, 700, 700, graine + 4, 1)
    semis = np.random.default_rng(graine + 6).random((n, n), dtype=np.float32)
    hb = h + (b2 - 0.5) * 0.9  # la hauteur, un peu brouillée : les limites ne suivent pas les courbes de niveau
    # la grève : le sable et ses rides, le sable mouillé, la laisse de mer, des coquillages
    coul = N.hexa(0xdcbd88)[None, None, :] * (0.9 + 0.14 * b1 + 0.07 * fin + 0.1 * (grain - 0.5))[..., None]
    rides = 0.5 + 0.5 * np.sin((h * 5.5 + b1 * 4.0) * 2 * PI)
    coul *= (1 - 0.07 * rides * N.lisse(0.3, 0.9, h) * N.lisse(2.0, 1.2, h))[..., None]
    coul = N.mel(coul, N.hexa(0x8f7352)[None, None, :] * (0.88 + 0.18 * b2)[..., None], N.lisse(0.75, 0.1, h + (b2 - 0.5) * 0.35))
    coul = N.mel(coul, N.hexa(0x5a5234), 0.42 * np.exp(-((h - 0.95 - 0.9 * (b1 - 0.5) - 0.5 * (b2 - 0.5)) / 0.07) ** 2) * N.lisse(0.4, 0.6, b3) * N.lisse(0.35, 0.55, fin))
    coul = N.mel(coul, N.hexa(0xf3ead6), (semis > 0.9975) * N.lisse(0.4, 0.8, h) * 0.8)
    # l'herbe rase, puis le sol de la jungle
    herbe = N.hexa(0x7a9a44)[None, None, :] * (0.78 + 0.34 * b3 + 0.14 * (grain - 0.5))[..., None]
    herbe = N.mel(herbe, N.hexa(0xa9a85a)[None, None, :] * (0.85 + 0.2 * fin)[..., None], N.lisse(0.55, 0.75, b2) * 0.6)
    jungle = N.hexa(0x3f5a2c)[None, None, :] * (0.7 + 0.4 * b3 + 0.16 * (grain - 0.5))[..., None]
    jungle = N.mel(jungle, N.hexa(0x5a4a2c)[None, None, :] * (0.8 + 0.3 * fin)[..., None], N.lisse(0.45, 0.7, b2) * 0.55)
    jungle = N.mel(jungle, N.hexa(0x2c4424), N.lisse(0.5, 0.8, b1) * 0.5)
    vert = N.mel(herbe, jungle, N.lisse(2.6, 5.2, hb + (b1 - 0.5) * 2.5))
    del herbe, jungle
    coul = N.mel(coul, vert, N.lisse(1.45, 2.3, hb))
    del vert
    # la roche : en altitude, et partout où la pente est raide
    strates = 0.5 + 0.5 * np.sin((h * 0.55 + b1 * 6.0 + b2 * 2.4 + b3 * 0.6) * 2 * PI)
    roche = N.hexa(0x5a4f56)[None, None, :] * (0.66 + 0.26 * b3 + 0.14 * fin + 0.12 * (grain - 0.5) + 0.1 * strates)[..., None]
    roche = N.mel(roche, N.hexa(0x8a7f7a)[None, None, :] * (0.85 + 0.25 * b3)[..., None], N.lisse(0.6, 0.8, b1) * 0.5)
    veines = np.abs(N.bruit(n, 60, 60, graine + 7, 2) - 0.5) + N.lisse(0.6, 0.45, b3) * 0.2  # des fissures : des bouts de traits fins
    roche *= (1 - 0.4 * N.lisse(0.035, 0.0, veines))[..., None]
    roche = N.mel(roche, N.hexa(0x2e262c)[None, None, :] * (0.8 + 0.3 * b3)[..., None], N.lisse(11.0, 22.0, h + (b1 - 0.5) * 5))
    t_roche = np.maximum(N.lisse(9.5, 13.0, h + (b1 - 0.5) * 5.0 + (b2 - 0.5) * 2.0), N.lisse(0.62, 1.0, pente + (b2 - 0.5) * 0.25) * N.lisse(1.2, 2.2, h))
    coul = N.mel(coul, roche, t_roche)
    del roche
    # le cône : ses crêtes plus claires, la cendre au fond des ravines, des traînées qui descendent ; plus haut la cendre
    # noire, la roche rougie et le soufre au bord du cratère ; dedans, la roche brûlée
    cone = N.lisse(0.95, 0.6, dv) * N.lisse(8.0, 12.0, h)
    coul = N.mel(coul, coul * 1.6 + 0.02, np.clip(ravine, 0, 1) * cone * 0.6)
    coul = N.mel(coul, N.hexa(0x2a2428)[None, None, :] * (0.8 + 0.3 * b3)[..., None], np.clip(-ravine - 0.15, 0, 1) * cone * 0.7)
    coul *= (1 - 0.2 * trainee * cone * N.lisse(0.3, 0.6, fin))[..., None]
    coul = N.mel(coul, N.hexa(0x1e181c)[None, None, :] * (0.8 + 0.35 * b3)[..., None], N.lisse(0.5, 0.3, dv + (b2 - 0.5) * 0.1) * N.lisse(12.0, 15.0, h) * 0.85)
    coul = N.mel(coul, N.hexa(0x7a2c18)[None, None, :] * (0.8 + 0.3 * b3)[..., None], N.lisse(0.34, 0.22, dv + (b2 - 0.5) * 0.08) * N.lisse(13.0, 15.0, h) * 0.6)
    coul = N.mel(coul, N.hexa(0xa89a44)[None, None, :] * (0.85 + 0.25 * fin)[..., None], N.lisse(0.3, 0.2, dv + (b1 - 0.5) * 0.1) * N.lisse(0.66, 0.8, b3) * N.lisse(0.17, 0.21, dv) * 0.7)
    coul = N.mel(coul, N.hexa(0x140e10)[None, None, :] * (0.8 + 0.4 * b3)[..., None], N.lisse(0.205, 0.17, dv) * 0.9)
    # le lit des coulées : la roche brûlée de leurs bords
    coul = N.mel(coul, N.hexa(0x16100f), N.lisse(0.34, 0.14, dc + (b3 - 0.5) * 0.08) * N.lisse(2.4, 3.4, h) * 0.85)
    # ce qui rougeoie (cuit comme une lumière)
    lueur = N.lisse(0.03, 0.0, veines) * N.lisse(0.5, 0.24, dv) * N.lisse(12.0, 15.0, h) * 0.75
    lueur = np.maximum(lueur, N.lisse(0.05, 0.0, np.abs(N.bruit(n, 60, 60, graine + 7, 2) - 0.5)) * N.lisse(0.2, 0.15, dv))  # dans le cratère : un réseau serré
    lueur = np.maximum(lueur, N.lisse(0.135, 0.105, dv) * 0.9)  # le bord du lac
    lueur = np.maximum(lueur, N.lisse(0.16, 0.06, dc + (b3 - 0.5) * 0.05) * N.lisse(2.6, 3.4, h) * (0.5 + 0.5 * b3) * 0.8)
    _LUEUR["sol"] = lueur.astype(np.float32)
    relief = np.clip(0.35 + 0.35 * b3 + 0.2 * fin + 0.12 * strates * t_roche, 0, 1)
    return np.clip(coul, 0, 1).astype(np.float32), relief.astype(np.float32)


def tx_tronc_palmier(c=0x8a7458, graine=1):
    """Le tronc d'un cocotier : les cicatrices des palmes tombées, en anneaux serrés (v : le long du tronc)."""
    n = N.TAILLE
    x, y = N.grille(n)
    t = N.bruit(n, 8, 8, graine, 3)
    anneau = ((y * 22 + t * 0.35) % 1.0)
    creux = N.lisse(0.16, 0.0, anneau) + N.lisse(0.9, 1.0, anneau)
    coul = N.hexa(c)[None, None, :] * (0.78 + 0.3 * N.bruit(n, 40, 40, graine + 1, 2) + 0.12 * t)[..., None]
    coul *= (1 - 0.42 * np.clip(creux, 0, 1))[..., None]
    return np.clip(coul, 0, 1).astype(np.float32), np.clip(0.75 - 0.6 * np.clip(creux, 0, 1), 0, 1).astype(np.float32)


def tx_grande_feuille(c=0x4f8a36, graine=1):
    """Une grande feuille posée sur sa bande (u : en travers, v : le long) : la nervure claire, les nervures de côté."""
    n = N.TAILLE
    x, y = N.grille(n)
    ecart = np.abs(x - 0.5)
    cotes = np.abs(((y * 26 - ecart * 9) % 1.0) - 0.5)
    coul = N.hexa(c)[None, None, :] * (0.8 + 0.25 * N.bruit(n, 10, 10, graine, 3) + 0.14 * N.lisse(0.0, 0.25, cotes))[..., None]
    coul = N.mel(coul, N.hexa(0xa8c860), N.lisse(0.035, 0.0, ecart) * 0.85)
    coul *= (1 - 0.25 * N.lisse(0.36, 0.5, ecart))[..., None]
    return np.clip(coul, 0, 1).astype(np.float32), np.clip(0.4 + 0.4 * N.lisse(0.0, 0.2, cotes), 0, 1).astype(np.float32)


N.matiere("br_sol", tx_sol_battle, 2 * R_SOL, 0.6, 0.92)
N.matiere("br_tronc_palmier", tx_tronc_palmier, 0.5, 0.9)
N.matiere("br_palme", N.tx_uni, 0.4, 0.3, rugueux=0.6, c=0x3d7a30, graine=702, grain=0.2, taches=0.35, c2=0x5f9a3c, seuil=0.5)
N.matiere("br_palme_jeune", N.tx_uni, 0.4, 0.3, rugueux=0.6, c=0x6a9e3a, graine=703, grain=0.2, taches=0.3, c2=0x8fb44a, seuil=0.55)
N.matiere("br_palme_seche", N.tx_uni, 0.4, 0.3, c=0x9a8246, graine=704, grain=0.25, taches=0.4, c2=0x6f5a30, seuil=0.5)
N.matiere("br_noix", N.tx_uni, 0.2, 0.3, c=0x5e4a30, graine=705, grain=0.25, taches=0.3)
N.matiere("br_feuille", tx_grande_feuille, 0, 0.5, rugueux=0.55)
N.matiere("br_feuille_claire", tx_grande_feuille, 0, 0.5, rugueux=0.55, c=0x6fa23c, graine=706)
N.matiere("br_tige", N.tx_uni, 0.3, 0.4, c=0x6f8a40, graine=707, grain=0.2, taches=0.4, c2=0x4f6a30, seuil=0.5)
N.matiere("br_herbe", N.tx_uni, 0.3, 0.2, c=0x6f9a3e, graine=708, grain=0.25, taches=0.3, c2=0x9aae52, seuil=0.6)
N.matiere("br_voile_rouge", N.tx_uni, 0.9, 0.3, c=0x7a2420, graine=709, grain=0.2, taches=0.55, c2=0x4a1614, seuil=0.45)
N.matiere("br_pierre_feu", N.tx_roche, 0.5, 0.9, c=0x5a5458, graine=710)
N.matiere("br_galet", N.tx_roche, 0.9, 0.8, c=0xb4a894, graine=711)
N.matiere("br_galet_gris", N.tx_roche, 0.9, 0.8, c=0x9a968e, graine=712)

# ce que chaque genre de plante prend de place dans l'atlas (1 : comme le terrain)
FINESSE = {"palmier": 0.8, "arbre": 0.75, "arbuste": 0.7, "bananier": 0.75, "buisson": 0.7, "fougere": 0.7, "touffe": 0.5, "fleurs": 0.5, "rocher": 0.7, "calcine": 0.6, "aiguilles": 0.6}
# la taille de chaque genre (les plantes sont petites à côté du volcan : c'est ce qui le rend grand)
TAILLES = {"palmier": 0.6, "arbre": 0.6, "arbuste": 0.65, "bananier": 0.7, "buisson": 0.75, "fougere": 0.8, "touffe": 0.9, "fleurs": 0.9, "rocher": 0.7, "calcine": 0.42, "aiguilles": 0.32}
DETAILS = {"buisson": 0.75, "arbuste": 0.8, "fleurs": 0.75}  # des formes un peu plus simples pour ce qui est petit et nombreux


# ---------- les plantes (chacune autour de son pied, en 0, 0, 0) ----------
def palmier(M, rng, h=1.2, penche=0.45, leger=False):
    """Un cocotier : un tronc courbe à anneaux, une couronne de palmes (une nervure, des folioles de chaque côté) sur trois
    étages (dressées, à l'horizontale, pendantes), deux palmes sèches, des noix."""
    cap = rng.random() * 2 * PI
    nt = 6 if leger else 9
    pts = [(math.cos(cap) * penche * (k / nt) ** 2, math.sin(cap) * penche * (k / nt) ** 2, -0.08 + (h + 0.08) * (k / nt) * (1.06 - 0.06 * k / nt)) for k in range(nt + 1)]
    M.ajouter(*N.tube(pts, [0.07 * (1 - 0.5 * k / nt) * (1.4 if k == 0 else 1.0) for k in range(nt + 1)], 6 if leger else 8, bouts=False), "br_tronc_palmier", doux=True)
    cx, cy, cz = pts[-1]
    M.ajouter(*N.sphere(0.06, 6, 4, 0.9), "br_tronc_palmier", T(cx, cy, cz - 0.01))
    nb, ns = (7, 5) if leger else (11, 6)
    for k in range(nb + (1 if leger else 2)):
        seche = k >= nb
        a = cap + k * 2 * PI / nb + rng.random() * 0.4 + (1.3 if seche else 0.0)
        lg = (0.6 + rng.random() * 0.26) * (0.86 + 0.14 * h) * (0.8 if seche else 1.0)
        etage = 2 if seche else k % 3
        monte = (0.62, 0.3, 0.0)[etage] + rng.random() * 0.12
        tombe = (0.42, 0.62, 1.25 if seche else 0.9)[etage]
        ca, sa = math.cos(a), math.sin(a)
        nrm = np.array((-sa, ca, 0.0))
        nerv = [np.array((cx + ca * lg * t, cy + sa * lg * t, cz + 0.03 + monte * lg * math.sin(PI * min(1.0, t * 1.1)) * 0.6 - tombe * lg * t * t)) for t in (i / ns for i in range(ns + 1))]
        v, f = [], []
        for i in range(ns):  # la nervure : une lame étroite
            q = len(v)
            v += [nerv[i] - nrm * 0.008, nerv[i] + nrm * 0.008, nerv[i + 1] + nrm * 0.006, nerv[i + 1] - nrm * 0.006]
            f.append((q, q + 1, q + 2, q + 3))
        for i in range(1, ns + 1):  # les folioles : un triangle de chaque côté, la pointe vers le bas et vers le bout
            t = i / ns
            w = 0.17 * math.sin(PI * (0.1 + 0.86 * t)) ** 0.7
            pas = nerv[i] - nerv[i - 1]
            for s_ in (-1, 1):
                q = len(v)
                pointe = nerv[i] + nrm * s_ * w + pas * 0.55 - np.array((0, 0, w * 0.75))
                v += [nerv[i - 1] + pas * 0.12, nerv[i] + pas * 0.02, pointe]
                f.append((q, q + 1, q + 2) if s_ > 0 else (q, q + 2, q + 1))
        M.ajouter(v, f + [tuple(reversed(g)) for g in f], "br_palme_seche" if seche else ("br_palme" if k % 3 else "br_palme_jeune"))
        poids = [(i + 0.5) / ns for i in range(ns)] + [i / ns for i in range(1, ns + 1) for _ in (0, 1)]
        M.zones[-2 * len(f):] = [(1.0, round(1.0 - 0.9 * w ** 1.4, 2), 1.0) for w in poids] * 2
    for k in range(3):
        a = cap + k * 2.1 + 0.5
        M.ajouter(*N.sphere(0.04, 6, 4), "br_noix", T(cx + math.cos(a) * 0.065, cy + math.sin(a) * 0.065, cz - 0.07))


def arbre(M, rng, h=0.9, r=0.45, leger=False, branches=None):
    """Un arbre de la jungle : un tronc qui se tord, deux ou trois branches, une grappe de feuillage au bout de chacune."""
    a0 = rng.random() * 2 * PI
    haut = (math.cos(a0) * 0.1 * h, math.sin(a0) * 0.1 * h, h * 0.6)
    M.ajouter(*N.tube([(0, 0, -0.1), (math.cos(a0) * 0.04 * h, math.sin(a0) * 0.04 * h, h * 0.3), haut], [0.075 * h, 0.05 * h, 0.036 * h], 6, bouts=False), "ecorce_branche", tourne=True, doux=True)
    nbb = branches or (2 if leger else 3)
    bouts = [haut]
    for k in range(nbb):
        a = a0 + 0.8 + k * 2 * PI / nbb
        b = (haut[0] + math.cos(a) * r * 0.55, haut[1] + math.sin(a) * r * 0.55, haut[2] + h * (0.1 + 0.1 * rng.random()))
        M.ajouter(*N.tube([haut, ((haut[0] + b[0]) / 2, (haut[1] + b[1]) / 2, haut[2] + h * 0.09), b], [0.03 * h, 0.022 * h, 0.012 * h], 5, bouts=False), "ecorce_branche", doux=True)
        bouts.append(b)
    for k, b in enumerate(bouts):
        Ar.grappe(M, rng, b[0], b[1], b[2] + r * (0.3 if k == 0 else 0.2), r * (0.8 if k == 0 else 0.58), 0.7, rng.choice(["frondaison", "frondaison_claire", "frondaison_sombre"]), fin=False, agite=0.75)


def bananier(M, rng, h=0.5, leger=False):
    """Un bananier sauvage : un faux tronc, de grandes feuilles pliées le long de leur nervure, qui se cambrent et retombent."""
    M.ajouter(*N.cylindre(0.035, 0.02, h * 0.55, 6, haut=False), "br_tige", T(0, 0, -0.03), doux=True)
    nb, ns = (5, 3) if leger else (7, 4)
    for k in range(nb):
        a = k * 2 * PI / nb + rng.random() * 0.6
        lg = h * (0.9 + 0.5 * rng.random())
        larg = lg * 0.2
        monte = 0.8 - 0.45 * (k % 2) + 0.1 * rng.random()
        ca, sa = math.cos(a), math.sin(a)
        v, uv, f = [], [], []
        for i in range(ns + 1):
            t = i / ns
            w = larg * math.sin(PI * min(1.0, 0.1 + 0.9 * t)) ** 0.6 * (1 - 0.3 * t)
            px, py = ca * lg * t * 0.9, sa * lg * t * 0.9
            pz = h * 0.5 + monte * lg * math.sin(PI * 0.5 * min(1.0, t * 1.3)) * 0.8 - 0.55 * lg * t * t
            v += [(px + sa * w, py - ca * w, pz + 0.25 * w), (px, py, pz), (px - sa * w, py + ca * w, pz + 0.25 * w)]
            uv += [(0.0, t), (0.5, t), (1.0, t)]
        for i in range(ns):
            f += [(i * 3, i * 3 + 1, i * 3 + 4, i * 3 + 3), (i * 3 + 1, i * 3 + 2, i * 3 + 5, i * 3 + 4)]
        debut = len(M.f)
        Ar.toile(M, v, f, "br_feuille" if k % 3 else "br_feuille_claire", ep=0.006, uv=uv)
        for j in range(debut, len(M.f)):
            i = ((j - debut) % (2 * ns)) // 2
            M.zones[j] = (1.0, round(0.9 - 0.5 * (i + 0.5) / ns, 2), 1.0)


def touffe(M, rng, h=0.13, nb=6):
    for k in range(nb):
        a = k * 2 * PI / nb + rng.random()
        M.ajouter(*N.cylindre(0.012, 0.0, h * (0.6 + 0.6 * rng.random()), 3, haut=False), "br_herbe", T(math.cos(a) * 0.03, math.sin(a) * 0.03, -0.01) @ Rz(a) @ Rx(0.3 + 0.35 * rng.random()), zone=(1.0, 0.8, 1.0))


def fleurs(M, rng, mat="fleur_rose"):
    for k in range(5):
        a, d, hh = rng.random() * 2 * PI, 0.02 + 0.07 * rng.random(), 0.06 + 0.08 * rng.random()
        M.ajouter(*N.cylindre(0.004, 0.003, hh, 3, haut=False), "br_herbe", T(math.cos(a) * d, math.sin(a) * d, 0))
        M.ajouter(*N.sphere(0.022, 5, 3, 0.7), mat, T(math.cos(a) * d, math.sin(a) * d, hh), zone=(1.0, 0.72, 1.0))


def caillou(M, rng, r, mat="roche"):
    """Un caillou rond, cabossé."""
    v, f = N.sphere(r, 9, 6, 0.85)
    g1, g2, g3 = rng.random() * 9, rng.random() * 9, rng.random() * 9
    q = []
    for (a, b, c) in v:
        k = 0.8 + 0.2 * math.sin(a / r * 2.3 + g1) * math.sin(b / r * 2.1 + g2) + 0.12 * math.sin(c / r * 3.4 + g3)
        q.append((a * k, b * k, c * k))
    M.ajouter(q, f, mat, T(0, 0, r * 0.3) @ Rz(g1), doux=True)  # (le quart du bas dans le sol : le reste se voit)


def _variantes(leger):
    """genre → la liste des fabriques (chacune : (Maille, rng) → rien). Un type par fabrique et par éclairage."""
    V = {
        "palmier": [lambda M, r, h=h, p=p: palmier(M, r, h, p, leger) for h, p in ((0.95, 0.3), (1.1, 0.5), (1.2, 0.25), (1.28, 0.62), (1.36, 0.4), (1.45, 0.55), (1.05, 0.7), (1.5, 0.3))],
        "arbre": [lambda M, r, h=h, rr=rr: arbre(M, r, h, rr, leger) for h, rr in ((0.7, 0.36), (0.85, 0.42), (0.95, 0.5), (1.05, 0.46), (1.15, 0.55), (0.78, 0.48))],
        "arbuste": [lambda M, r, h=h, rr=rr: arbre(M, r, h, rr, True, 1) for h, rr in ((0.4, 0.22), (0.46, 0.26), (0.52, 0.3), (0.58, 0.27), (0.44, 0.3))],
        "bananier": [lambda M, r, h=h: bananier(M, r, h, leger) for h in (0.36, 0.44, 0.52, 0.6)],
        "buisson": [lambda M, r, rr=rr, fl=fl: Ar.buisson(M, r, 0, 0, -0.03, rr, fl) for rr, fl in ((0.11, None), (0.14, None), (0.17, None), (0.2, None), (0.23, None), (0.15, "fleur_rose"), (0.18, "fleur_jaune"), (0.13, "fleur_blanche"))],
        "fougere": [lambda M, r, nb=nb, h=h, lg=lg: Ar.fougere(M, r, 0, 0, 0.0, nb, h, lg, 3) for nb, h, lg in ((6, 0.16, 0.24), (7, 0.2, 0.3), (5, 0.14, 0.2), (8, 0.22, 0.34))],
        "touffe": [lambda M, r, h=h: touffe(M, r, h) for h in (0.1, 0.13, 0.17)],
        "fleurs": [lambda M, r, m=m: fleurs(M, r, m) for m in ("fleur_rose", "fleur_jaune", "fleur_blanche", "fleur_rouge")],
        "rocher": [lambda M, r, rr=rr, m=m: caillou(M, r, rr, m) for rr, m in ((0.13, "br_galet"), (0.19, "br_galet"), (0.26, "br_galet_gris"), (0.12, "basalte_clair"), (0.18, "basalte"), (0.25, "basalte_clair"))],  # les trois premiers : ceux de la grève
        "calcine": [lambda M, r: Bz.arbre_calcine(M, r, 0, 0, 0) for _ in range(3)],
        "aiguilles": [lambda M, r, nb=nb: Bz.aiguilles(M, r, 0, 0, 0, nb) for nb in (3, 4, 5)],
    }
    return V


# ce qu'il faut de chaque (ordinateur, téléphone), et où : (h mini, h maxi en unités du site, pente maxi, écart entre deux,
# distance mini aux places des pirates)
SEMIS = {
    "palmier": ((90, 44), (1.1, 5.2, 0.45, 0.5, 0.26)),
    "arbre": ((120, 56), (2.6, 12.5, 0.7, 0.36, 0.22)),
    "arbuste": ((300, 130), (2.6, 13.0, 0.8, 0.22, 0.06)),
    "bananier": ((180, 70), (2.0, 9.0, 0.6, 0.22, 0.12)),
    "buisson": ((1200, 480), (2.0, 14.0, 0.9, 0.12, 0.0)),
    "fougere": ((520, 200), (2.0, 12.5, 0.9, 0.1, 0.0)),
    "touffe": ((520, 200), (1.3, 5.0, 0.6, 0.09, 0.0)),
    "fleurs": ((200, 70), (1.8, 9.0, 0.6, 0.1, 0.0)),
    "rocher": ((400, 150), (0.25, 30.0, 9.0, 0.13, 0.0)),
    "calcine": ((26, 12), (6.0, 20.0, 1.4, 0.3, 0.15)),
    "aiguilles": ((18, 8), (12.0, 30.0, 9.0, 0.3, 0.1)),
}


def a_l_ombre(x, y, z):
    """Ces points sont-ils dans l'ombre du relief (le soleil de la cuisson) ? x, y, z : des tableaux."""
    g = grille()
    s = np.asarray(SOLEIL, np.float64)
    s = s / np.linalg.norm(s)
    x, y, z = np.asarray(x, np.float64), np.asarray(y, np.float64), np.asarray(z, np.float64) + 0.2
    ombre = np.zeros(len(x), bool)
    for t in np.arange(0.12, 14.0, 0.12):
        px, py, pz = x + s[0] * t, y + s[1] * t, z + s[2] * t
        dedans = (np.abs(px) < R_SOL) & (np.abs(py) < R_SOL)
        ombre |= dedans & (lire(g, np.clip(px, -R_SOL, R_SOL), np.clip(py, -R_SOL, R_SOL)) > pz)
    return ombre


def semer(leger=False, graine=2027, emprises=()):
    """Où pousse quoi : genre → un tableau (n, 7) : x, y, z, taille, teinte, variante, à l'ombre (0 ou 1)."""
    rng = np.random.default_rng(graine)
    g, pente, dp, dcl = grille(), pente_champ(), loin_des_places(), loin_des_coulees()
    V = _variantes(leger)
    res = {}
    pris = {}  # les grands, sur une grille : pas deux au même endroit

    def libre(x, y, ecart, cle):
        i, j = int((x + R_SOL) / ecart), int((y + R_SOL) / ecart)
        for di in (-1, 0, 1):
            for dj in (-1, 0, 1):
                for (qx, qy) in pris.get((cle, i + di, j + dj), ()):
                    if (qx - x) ** 2 + (qy - y) ** 2 < ecart * ecart:
                        return False
        pris.setdefault((cle, i, j), []).append((x, y))
        return True

    for genre, ((nb_pc, nb_tel), (h0, h1, pmax, ecart, loin)) in SEMIS.items():
        voulu = nb_tel if leger else nb_pc
        m = 90000
        x, y = (rng.random(m) * 2 - 1) * 7.7, (rng.random(m) * 2 - 1) * 7.9
        z = lire(g, x, y)
        h = z * E
        X3, Z3 = x * E, -y * E
        dv = np.hypot(X3 - VX, Z3 - VZ) / VR
        veg = _fbm(X3 * 0.09, Z3 * 0.09, 3)
        ok = (h > h0) & (h < h1) & (lire(pente, x, y) < pmax) & (lire(dp, x, y) > loin) & (lire(dcl, x, y) > 0.2)
        if genre in ("arbre", "arbuste", "bananier", "buisson", "fougere", "fleurs"):
            ok &= (dv > (0.56 if genre == "arbre" else 0.5)) & (veg > {"arbre": 0.38, "arbuste": 0.38, "bananier": 0.36, "buisson": 0.4, "fougere": 0.34, "fleurs": 0.3}[genre])
        if genre == "palmier":
            ok &= dv > 0.62
        if genre == "touffe":
            ok &= dv > 0.6
        if genre == "rocher":  # en amas sur la grève (pas un semis régulier), partout sur les pentes raides et le volcan
            amas = _fbm(X3 * 0.16 + 31.0, Z3 * 0.16 + 7.0, 2)
            ok &= (lire(pente, x, y) > 0.5) | ((h < 1.4) & (amas > 0.45)) | (dv < 0.75) | (rng.random(m) < 0.05)
        if genre == "calcine":
            ok &= (dv > 0.42) & (dv < 0.72)
        if genre == "aiguilles":
            ok &= (dv < 0.5) & (dv > 0.24)
        for (ex, ey, er) in emprises:
            ok &= (x - ex) ** 2 + (y - ey) ** 2 > (er + ecart * 0.5) ** 2
        lot = []
        cle = "grand" if genre in ("palmier", "arbre", "arbuste", "calcine") else genre
        for i in np.flatnonzero(ok):
            if len(lot) >= voulu:
                break
            if not libre(float(x[i]), float(y[i]), ecart, cle):
                continue
            var = rng.integers(0, len(V[genre]))
            ech = 0.85 + 0.35 * rng.random()
            if genre == "rocher":  # clairs sur la grève, sombres (et plus petits) sur le volcan ; beaucoup de petits, peu de gros
                var = rng.integers(0, 3) if h[i] < 2.4 else rng.integers(3, 6)
                ech = (0.38 + 0.95 * rng.random() ** 3) * (0.62 if dv[i] < 0.8 else 1.0)
            lot.append((x[i], y[i], z[i] - 0.012, ech, 0.9 + 0.18 * rng.random(), var))
        a = np.array(lot, np.float64).reshape(-1, 6)
        res[genre] = np.concatenate([a, a_l_ombre(a[:, 0], a[:, 1], a[:, 2])[:, None].astype(np.float64)], axis=1) if len(a) else np.zeros((0, 7))
    return res


# ---------- les choses posées (uniques, cuites avec le terrain) ----------
def gros_rocher(L, rng, x, y, z, r, haut=1.0, mat="basalte"):
    """Un rocher de mer : une boule bosselée, cabossée par trois vagues de bosses."""
    v, f = N.sphere(r, 12, 8, haut)  # (à sa vraie taille : sa place dans l'atlas en dépend)
    g1, g2, g3 = rng.random() * 9, rng.random() * 9, rng.random() * 9
    q = []
    for (a, b, c) in v:
        a1, b1, c1 = a / r, b / r, c / (r * haut)
        k = 0.78 + 0.22 * math.sin(a1 * 2.3 + g1) * math.sin(b1 * 2.1 + g2) + 0.14 * math.sin(c1 * 3.4 + g3) * math.sin(a1 * 3.7 + g2) + 0.07 * math.sin(a1 * 7.1 + b1 * 6.3 + g3)
        q.append((a * k, b * k, c * k))
    debut = len(L.finesse)
    L.ajouter(q, f, mat, T(x, y, z) @ Rz(g1) @ Rx(0.25 * math.sin(g2)), doux=True)
    L.finesse[debut:] = [0.6] * (len(L.finesse) - debut)


def epave(L, rng, x, y, z, cap, roulis, lg, leger):
    """Une épave couchée dans l'eau : la coque ouverte (voir barhaw_ambre_v5), un mât penché, un lambeau de voile rouge."""
    M = T(x, y, z) @ Rz(cap) @ Rx(roulis) @ Ry(0.5 * roulis)
    debut = len(L.finesse)
    Am.epave(L, rng, M, lg, lg * 0.36, lg * 0.2, 0.12, leger)
    hm = lg * 0.8
    Mm = M @ T(lg * 0.1, 0, 0.1) @ Ry(0.3)
    L.ajouter(*N.cylindre(0.05, 0.035, hm, 7, haut=True), "bois_epave_sombre", Mm, tourne=True)
    L.ajouter(*N.poutre((0, -lg * 0.2, hm * 0.78), (0, lg * 0.2, hm * 0.74), 0.035), "bois_epave_sombre", Mm)
    n = 5
    v, f = [], []
    for i in range(n + 1):
        for j in range(n + 1):
            u, w = i / n, j / n
            yy = (u - 0.5) * lg * 0.36 * (1 - 0.25 * w)
            zz = hm * 0.76 - w * hm * 0.42 * (1 - 0.35 * abs(u - 0.4))
            v.append((0.02 + 0.07 * math.sin(u * 3.3 + w * 2.0) * (0.3 + w), yy, zz))
    for i in range(n):
        for j in range(n):
            if (i * 7 + j * 3) % 11 == 0 and j > 1:
                continue  # des trous
            f.append((i * (n + 1) + j, (i + 1) * (n + 1) + j, (i + 1) * (n + 1) + j + 1, i * (n + 1) + j + 1))
    Ar.toile(L, v, f, "br_voile_rouge", Mm, ep=0.008)
    L.finesse[debut:] = [0.7] * (len(L.finesse) - debut)


def feu_de_camp(L, U, rng, x, y, z):
    """Un feu de camp : un cercle de pierres, trois bûches en étoile, la braise au milieu (une matière du site)."""
    for k in range(9):
        a = k * 2 * PI / 9 + rng.random() * 0.2
        Ar.rocher(L, rng, x + math.cos(a) * 0.17, y + math.sin(a) * 0.17, z - 0.03, 0.045 + 0.02 * rng.random(), "br_pierre_feu")
    for k in range(3):
        a = k * 2 * PI / 3 + 0.4
        L.ajouter(*N.tube([(x - math.cos(a) * 0.14, y - math.sin(a) * 0.14, z + 0.02), (x + math.cos(a) * 0.12, y + math.sin(a) * 0.12, z + 0.09)], 0.022, 6, bouts=True), "bois_brule")
    U.ajouter(*N.sphere(0.07, 7, 4, 0.45), "feu", T(x, y, z + 0.035))
    for k in range(3):  # des bûches pour s'asseoir
        a = k * 2 * PI / 3 + 1.3
        cx, cy = x + math.cos(a) * 0.42, y + math.sin(a) * 0.42
        L.ajouter(*N.tube([(cx - math.sin(a) * 0.16, cy + math.cos(a) * 0.16, sol(cx, cy) + 0.04), (cx + math.sin(a) * 0.16, cy - math.cos(a) * 0.16, sol(cx, cy) + 0.04)], 0.05, 7, bouts=True), "ecorce_branche")


def coin_tranquille(angle, h0, h1, loin=0.2):
    """Près de la côte dans cette direction (degrés, 90 = le nord) : l'endroit à cette hauteur (unités du site) le plus loin
    des places des pirates. Renvoie (x, y, z, cap vers la mer)."""
    g, dp, pente = grille(), loin_des_places(), pente_champ()
    mieux = None
    for da in np.arange(-14, 14.1, 2.0):
        a = math.radians(angle + da)
        for r in np.arange(8.4, 2.0, -0.05):
            x, y = math.cos(a) * r, math.sin(a) * r
            h = float(lire(g, x, y)) * E
            if h < h0:
                continue
            if h > h1:
                break
            d, p = float(lire(dp, x, y)), float(lire(pente, x, y))
            if p < 0.4 and (mieux is None or d > mieux[0]):
                mieux = (d, x, y, a)
    if mieux is None:
        return None
    d, x, y, a = mieux
    return x, y, float(lire(g, x, y)), a


def _mailles(graine, leger):
    rng = random.Random(graine)
    L, U, Lac = N.Maille("ile_corps"), N.Maille("ile_lumieres"), N.Maille("lac")
    emprises = []

    # --- le terrain (d'un seul tenant, à sommets partagés) ---
    n = 150 if leger else 256
    xs = [-R_SOL + 2 * R_SOL * i / n for i in range(n + 1)]
    Xg, Yg = np.meshgrid(xs, xs)
    H = hauteur(E * Xg, -E * Yg) / E
    rang, sommets, uvs, faces = {}, [], [], []

    def sommet(i, j):
        if (i, j) not in rang:
            rang[(i, j)] = len(sommets)
            sommets.append((xs[i], xs[j], float(H[j, i])))
            uvs.append(((xs[i] + R_SOL) / (2 * R_SOL), (xs[j] + R_SOL) / (2 * R_SOL)))
        return rang[(i, j)]

    for j in range(n):
        for i in range(n):
            if max(H[j, i], H[j, i + 1], H[j + 1, i + 1], H[j + 1, i]) < -0.27:  # sous la mer (et ses creux de vague) : inutile
                continue
            faces.append((sommet(i, j), sommet(i + 1, j), sommet(i + 1, j + 1), sommet(i, j + 1)))
    L.ajouter(sommets, faces, "br_sol", uv=uvs)
    L.regrouper(0, None, 4, 1.0)

    # --- la lave : le lac du cratère, les cinq coulées ---
    zc = (float(hauteur(VX, VZ)) + 1.6) / E  # au fond du cratère (comme sur le site)
    rl, nl = VR * 0.135 / E, 40
    v = [(VOLCAN[0], VOLCAN[1], zc)] + [(VOLCAN[0] + math.cos(2 * PI * k / nl) * rl, VOLCAN[1] + math.sin(2 * PI * k / nl) * rl, zc) for k in range(nl)]
    Lac.ajouter(v, [(0, 1 + k, 1 + (k + 1) % nl) for k in range(nl)], "lave", uv=[(0.5 + (p[0] - VOLCAN[0]) / rl * 0.5, 0.5 + (p[1] - VOLCAN[1]) / rl * 0.5) for p in v])
    for p in coulees():
        long_ = np.concatenate([[0.0], np.cumsum(np.hypot(*(p[1:] - p[:-1]).T))])
        v, uv, f = [], [], []
        for k in range(len(p)):
            a, b = p[max(0, k - 1)], p[min(len(p) - 1, k + 1)]
            d = (b - a) / (np.linalg.norm(b - a) or 1.0)
            t = long_[k] / long_[-1]
            larg = (0.03 + 0.028 * t) * (1 + 0.16 * math.sin(k * 0.9))
            g_, d_ = p[k] + np.array((-d[1], d[0])) * larg, p[k] - np.array((-d[1], d[0])) * larg
            zg, zm, zd = sol(*g_), sol(*p[k]), sol(*d_)
            v += [(g_[0], g_[1], zg + 0.008), (p[k][0], p[k][1], max(zm, (zg + zd) / 2) + 0.04), (d_[0], d_[1], zd + 0.008)]
            uv += [(long_[k] / 0.45, 0.0), (long_[k] / 0.45, 0.5), (long_[k] / 0.45, 1.0)]
            if k:
                f += [(3 * k - 3, 3 * k - 2, 3 * k + 1, 3 * k), (3 * k - 2, 3 * k - 1, 3 * k + 2, 3 * k + 1)]
        U.ajouter(v, f, "lave", uv=uv)

    # --- les rochers de mer, tout autour ; ceux du bord du cratère ---
    for k in range(14):
        a, d = rng.random() * 2 * PI, R3 / E * (0.95 + rng.random() * 0.35)
        r = (1.4 + rng.random() * 3.2) / E
        gros_rocher(L, rng, math.cos(a) * d, math.sin(a) * d, -0.05, r, 0.9 + rng.random() * 0.9)
    for k in range(7 if leger else 13):
        a = k * 2 * PI / 13 + rng.random() * 0.3
        d = VR * (0.2 + 0.05 * rng.random()) / E
        x, y = VOLCAN[0] + math.cos(a) * d, VOLCAN[1] + math.sin(a) * d
        gros_rocher(L, rng, x, y, sol(x, y), 0.04 + 0.06 * rng.random(), 0.8 + 0.6 * rng.random(), rng.choice(["basalte", "obsidienne", "basalte"]))

    # --- les trois épaves (aux mêmes endroits que sur le site) ---
    for (X3, Z3, rot, incl, taille) in ((-44, 30, 0.6, 0.38, 1.1), (40, 36, -1.1, -0.3, 0.9), (-30, -46, 2.2, 0.25, 0.8)):
        epave(L, rng, X3 / E, -Z3 / E, -0.02 * taille, rot, incl, 2.35 * taille, leger)
        emprises.append((X3 / E, -Z3 / E, 1.4 * taille))

    # --- sur la grève : les barques de ceux qui ont débarqué, leurs caisses, un feu ; une carcasse au nord ; un coffre ---
    def barque(x, y, z, cap, roulis):
        W = N.Maille("barque")
        P.barque(W, rng, 0, 0, 0.0, 0.62)
        Ar.fondre(L, W, T(x, y, z + 0.05) @ Rz(cap) @ Rx(roulis))
        emprises.append((x, y, 0.4))

    for angle, nb in ((-92, 3), (176, 2), (20, 2)):
        c = coin_tranquille(angle, 0.7, 1.3)
        if c is None:
            continue
        x, y, z, a = c
        tx, ty = -math.sin(a), math.cos(a)  # le long du rivage
        for k in range(nb):
            bx, by = x + tx * (k - (nb - 1) / 2) * 0.62, y + ty * (k - (nb - 1) / 2) * 0.62
            barque(bx, by, sol(bx, by), a + PI + (rng.random() - 0.5) * 0.5, (rng.random() - 0.5) * 0.5)
        c2 = coin_tranquille(angle + 5, 1.5, 2.1)
        if c2 is not None and angle != 20:
            x, y, z, a = c2
            feu_de_camp(L, U, rng, x, y, z)
            emprises.append((x, y, 0.6))
            for k in range(4 if leger else 7):
                aa, dd = a + PI + (rng.random() - 0.5) * 1.5, 0.5 + 0.3 * rng.random()
                cx, cy = x + math.cos(aa) * dd, y + math.sin(aa) * dd
                if k % 2:
                    P.tonneau(L, T(cx, cy, sol(cx, cy) - 0.01) @ Rz(rng.random() * 3), 0.07, 0.17)
                else:
                    P.caisse(L, T(cx, cy, sol(cx, cy) - 0.01) @ Rz(rng.random() * 3), 0.15)
            emprises.append((x + math.cos(a + PI) * 0.6, y + math.sin(a + PI) * 0.6, 0.55))
    c = coin_tranquille(105, 0.9, 1.5)
    if c is not None:
        Ci.carcasse(L, c[0], c[1], c[2] - 0.03, c[3] + 1.2, 1.7, 0.7, 7 if leger else 9)
        emprises.append((c[0], c[1], 1.0))
    c = coin_tranquille(-150, 1.6, 2.4)
    if c is not None:
        Tr.coffre(L, L, T(c[0], c[1], c[2] - 0.06) @ Rz(c[3] + 0.4) @ Rx(0.12), 0.34, 0.24, 0.2)
        emprises.append((c[0], c[1], 0.35))

    # --- la végétation : où pousse quoi, puis un type par variante et par éclairage ---
    semis = semer(leger, graine + 3, emprises)
    V = _variantes(leger)
    types = []
    for genre, a in semis.items():
        for var in range(len(V[genre])):
            for ombre in (0, 1):
                lot = a[(a[:, 5] == var) & (a[:, 6] == ombre)]
                if not len(lot):
                    continue
                M = N.Maille(f"{genre}{var}{'o' if ombre else 's'}")
                detail = N.DETAIL
                N.DETAIL = min(detail, DETAILS.get(genre, 1.0))
                try:
                    V[genre][var](M, random.Random(graine * 31 + var * 7 + sum(ord(ch) for ch in genre)))
                finally:
                    N.DETAIL = detail
                k_ = TAILLES[genre]  # à sa taille : les sommets, et sa place dans l'atlas
                M.v = [v_ * k_ for v_ in M.v]
                M.cartes = [(c_, plat * k_) for c_, plat in M.cartes]
                M.finesse = [q * FINESSE[genre] for q in M.finesse]
                types.append((M, {"role": "type", "genre": genre, "ombre": int(ombre), "places": [round(float(q), 4) for row in lot[:, :5] for q in row]}))
    return {"corps": L, "lumieres": U, "lac": Lac, "types": types, "semis": semis, "emprises": emprises}


def mailles(graine=407, leger=False):
    """leger : la version téléphone (un relief moins fin, moins de plantes, des formes plus simples)."""
    N.DETAIL = 0.6 if leger else 1.0
    try:
        return _mailles(graine, leger)
    finally:
        N.DETAIL = 1.0


def bilan(lots):
    """Ce que pèse l'île : les triangles du corps, des types, et de tout ce que le site dessinera."""
    tri_types = sum(M.triangles() for M, _ in lots["types"])
    ecran = sum(M.triangles() * (len(e["places"]) // 5) for M, e in lots["types"])
    return {"corps": lots["corps"].triangles(), "types": len(lots["types"]), "triangles_types": tri_types, "pieds": {g: len(a) for g, a in lots["semis"].items()},
            "a_l_ombre": {g: int(a[:, 6].sum()) for g, a in lots["semis"].items()}, "triangles_a_l_ecran": lots["corps"].triangles() + ecran + lots["lumieres"].triangles() + lots["lac"].triangles()}


# ---------- dans Blender : la lumière du soir, la cuisson, l'export ----------
def _matiere_sol():
    """Le sol : sa peinture, plus un grain en volume (lui ne s'étire pas sur les pentes raides) et ce qui rougeoie."""
    import bpy
    m = N.materiau("br_sol")
    if m.get("br_riche"):
        return m
    nt = m.node_tree
    bsdf = next(x for x in nt.nodes if x.type == "BSDF_PRINCIPLED")
    te = nt.nodes["n5_teinte"]
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    b = nt.nodes.new("ShaderNodeTexNoise")
    b.inputs["Scale"].default_value = 26.0
    b.inputs["Detail"].default_value = 7.0
    nt.links.new(geo.outputs["Position"], b.inputs["Vector"])
    mr = nt.nodes.new("ShaderNodeMapRange")
    for k, val in ((1, 0.25), (2, 0.75), (3, 0.76), (4, 1.2)):
        mr.inputs[k].default_value = val
    nt.links.new(b.outputs[0], mr.inputs[0])
    nt.links.new(mr.outputs[0], te.inputs[7])
    bosse0 = next(x for x in nt.nodes if x.type == "BUMP")
    bosse = nt.nodes.new("ShaderNodeBump")
    bosse.inputs["Strength"].default_value = 0.5
    bosse.inputs["Distance"].default_value = 0.03
    nt.links.new(b.outputs[0], bosse.inputs["Height"])
    nt.links.new(bosse0.outputs[0], bosse.inputs["Normal"])
    nt.links.new(bosse.outputs[0], bsdf.inputs["Normal"])
    lu = _LUEUR.get("sol")
    if lu is not None:
        n = lu.shape[0]
        img = bpy.data.images.get("br_sol_lueur")
        if img is not None and img.size[0] != n:
            bpy.data.images.remove(img)
            img = None
        img = img or bpy.data.images.new("br_sol_lueur", n, n, alpha=False)
        img.colorspace_settings.name = "Non-Color"
        px = np.ones((n, n, 4), np.float32)
        px[..., :3] = lu[..., None]
        img.pixels.foreach_set(px.ravel())
        img.pack()
        uv = next(x for x in nt.nodes if x.type == "UVMAP")
        tl = nt.nodes.new("ShaderNodeTexImage")
        tl.image = img
        nt.links.new(uv.outputs[0], tl.inputs[0])
        bsdf.inputs["Emission Color"].default_value = (1.0, 0.22, 0.02, 1)
        mu = nt.nodes.new("ShaderNodeMath")
        mu.operation = "MULTIPLY"
        mu.inputs[1].default_value = 4.0
        nt.links.new(tl.outputs[0], mu.inputs[0])
        nt.links.new(mu.outputs[0], bsdf.inputs["Emission Strength"])
    m["br_riche"] = 1
    return m


def lumiere_du_soir():
    """Le soleil couchant (chaud, bas), le ciel du soir, et une lueur froide à l'opposé : le côté à l'ombre garde ses formes."""
    import bpy
    N.soleil_et_ciel(soleil=SOLEIL, force=5.2, chaud=(1.0, 0.56, 0.3), ciel=(0.3, 0.34, 0.8), force_ciel=0.58, taille=2.5)
    d = bpy.data.lights.new("n5_lune", "SUN")
    d.energy, d.color, d.angle = 0.95, (0.5, 0.62, 1.0), math.radians(32)
    o = bpy.data.objects.new("n5_lune", d)
    bpy.context.scene.collection.objects.link(o)
    v = np.array((-SOLEIL[0], -SOLEIL[1], 1.25))
    v = v / np.linalg.norm(v)
    o.rotation_euler = (math.acos(v[2]), 0, math.atan2(v[0], -v[1]))


def ciel_des_rendus(oui):
    """Pour les images d'essai seulement : un ciel du soir en dégradé (la cuisson, elle, garde son ciel uni)."""
    import bpy
    nt = bpy.context.scene.world.node_tree
    for n in [n for n in nt.nodes if n.name.startswith("br_ciel")]:
        nt.nodes.remove(n)
    fond = nt.nodes.get("Background")
    if not oui or fond is None:
        return
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    r = nt.nodes.new("ShaderNodeValToRGB")
    tc.name, sep.name, r.name = "br_ciel_tc", "br_ciel_sep", "br_ciel_rampe"
    el = r.color_ramp.elements
    el[0].position, el[0].color = 0.0, (0.95, 0.42, 0.14, 1)
    el[1].position, el[1].color = 1.0, (0.02, 0.045, 0.17, 1)
    for pos, c in ((0.1, (0.6, 0.3, 0.4, 1)), (0.32, (0.11, 0.15, 0.42, 1))):
        e = el.new(pos)
        e.color = c
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    nt.links.new(sep.outputs[2], r.inputs[0])
    nt.links.new(r.outputs[0], fond.inputs[0])


def construire(rendu=True, cuire=True, exporter=True, taille=None, echantillons=64, leger=False, alleger=True, cote_sol=None, rendus=None):
    """Dans Blender : l'île posée, sa lumière cuite dans l'atlas, l'export. Le bilan (ou l'erreur) est écrit dans
    glb/ile-battle-v5[-leger].json : un appel long ne répond pas toujours, on suit ce fichier."""
    import bpy, traceback
    t0 = time.time()
    fichier = "ile-battle-v5" + ("-leger" if leger else "")
    infos = {"fichier": fichier, "etape": "depart"}

    def noter(etape=None):
        if etape:
            infos["etape"] = etape
        infos["temps"] = round(time.time() - t0, 1)
        os.makedirs(os.path.join(N.dossier(), "glb"), exist_ok=True)
        with open(os.path.join(N.dossier(), "glb", fichier + ".json"), "w", encoding="utf-8") as f:
            json.dump(infos, f, ensure_ascii=False)

    try:
        noter()
        taille = taille or (2048 if leger else 4096)
        N.MATIERES["br_sol"]["reglages"]["cote"] = cote_sol or (2048 if leger else 4096)
        N.oublier("br_sol")
        m = bpy.data.materials.get("br_sol")
        if m is not None:
            m["br_riche"] = 0
        lots = mailles(leger=leger)
        corps, types = lots["corps"], lots["types"]
        cuites = [corps] + [M for M, _ in types]
        infos["bilan"] = bilan(lots)
        noter("mailles")
        lumiere_du_soir()
        s = np.array(SOLEIL[:2]) / np.linalg.norm(SOLEIL[:2])  # vers le soleil
        t = np.array((s[1], -s[0]))  # le long de la scène
        C = np.array((0.0, -60.0))
        nb = (sum(1 for _, e in types if not e["ombre"]), sum(1 for _, e in types if e["ombre"]))
        coll_nom = fichier.replace("-", "_")

        def poser(copies=True):
            coll = N.collection(coll_nom)
            infos["finesse"] = [round(x, 2) for x in N.emballer(cuites, taille)]
            objs = [N.objet(corps, coll, "ile_corps", extras={"role": "decor"})]
            _matiere_sol()
            rang = [0, 0]
            temp = []
            Bloc = N.Maille("types")
            for k, (M, extras) in enumerate(types):
                o_ = extras["ombre"]
                p = C + t * (rang[o_] - nb[o_] / 2) * 1.6 - s * (10.0 if o_ else 0.0)
                rang[o_] += 1
                o = N.objet(M, coll, f"ile_type{k}", origine=(p[0], p[1], 0.0), extras=extras)
                o.hide_render = True  # (lui sert à l'export et aux copies ; il est cuit dans le bloc ci-dessous)
                objs.append(o)
                Ar.fondre(Bloc, M, T(p[0], p[1], 0.0))
            # tous les types dans une seule maille, chacun à sa place sur la scène : deux cuissons au lieu de cent
            Bloc.atlas = [q for M, _ in types for q in M.atlas]
            bloc = N.objet(Bloc, coll, "br_types")
            temp.append(bloc)
            if lots["lumieres"].f:
                N.objet(lots["lumieres"], coll, "ile_lumieres", extras={"role": "decor"}).visible_shadow = False
            N.objet(lots["lac"], coll, "ile_libre0", extras={"role": "lac"}).visible_shadow = False
            # la scène des types : un sol, et entre les deux rangs un mur qui ne fait QUE de l'ombre
            lg = max(nb) * 1.6 + 16
            mat = bpy.data.materials.get("br_scene") or bpy.data.materials.new("br_scene")
            mat.use_nodes = True
            bs = mat.node_tree.nodes.get("Principled BSDF")
            if bs:
                bs.inputs["Base Color"].default_value = (0.2, 0.22, 0.12, 1)
                bs.inputs["Roughness"].default_value = 1.0
            c = C - s * 5.0
            for nom_o, pts in (("br_scene_sol", [(*(c - t * lg / 2 - s * 20), 0.0), (*(c + t * lg / 2 - s * 20), 0.0), (*(c + t * lg / 2 + s * 20), 0.0), (*(c - t * lg / 2 + s * 20), 0.0)]),
                               ("br_scene_mur", [(*(c - s * 0.5 - t * lg / 2), -0.5), (*(c - s * 0.5 + t * lg / 2), -0.5), (*(c - s * 0.5 + t * lg / 2), 5.4), (*(c - s * 0.5 - t * lg / 2), 5.4)])):
                me = bpy.data.meshes.new(nom_o)
                me.from_pydata(pts, [], [(0, 1, 2, 3)])
                me.materials.append(mat)
                o = bpy.data.objects.new(nom_o, me)
                coll.objects.link(o)
                temp.append(o)
                if nom_o.endswith("mur"):
                    o.visible_camera = o.visible_diffuse = o.visible_glossy = o.visible_transmission = False
            if copies:  # chaque plante à sa place : son ombre sera cuite sur le sol
                for k, (M, extras) in enumerate(types):
                    pl = extras["places"]
                    for i in range(0, len(pl), 5):
                        o = bpy.data.objects.new("br_copie", objs[1 + k].data)
                        o.location = pl[i:i + 3]
                        o.scale = (pl[i + 3],) * 3
                        coll.objects.link(o)
                        temp.append(o)
            return coll, objs, temp, bloc

        if cuire and alleger:
            coll, objs, temp, bloc = poser(copies=False)
            noter("essai")
            N.cuire_ensemble(objs[:1], None, 1024, 16, nom="essai", remplacer=False)
            infos["faces_retirees"] = corps.garder([not c_ for c_ in N.cachees(corps, N.pixels_atlas("essai"))])
        coll, objs, temp, bloc = poser()
        infos["triangles"] = sum(M.triangles() for M in cuites)
        noter("pose")
        if rendu:
            vues = rendus or [("battle-v5", (-13.1, -9.2, 6.5), (0.0, 0.0, 1.67), 37), ("battle-v5-plage", (-2.5, -11.5, 2.2), (0.4, -5.0, 0.7), 50), ("battle-v5-volcan", (6.5, -5.5, 4.6), (1.2, 1.3, 3.4), 40)]
            ciel_des_rendus(True)
            try:
                infos["rendus"] = [N.rendre(n_ + ("-leger" if leger else ""), cam, cible, objectif, collections=[coll.name]) for n_, cam, cible, objectif in vues]
            finally:
                ciel_des_rendus(False)
            noter("rendus")
        if cuire:
            t1 = time.time()
            infos["atlas"] = N.cuire_ensemble([objs[0], bloc], os.path.join(N.dossier(), "glb", fichier + ".png"), taille, echantillons, nom="battle")
            infos["cuisson"] = round(time.time() - t1, 1)
            mat = bpy.data.materials["atlas_battle"]
            for o in objs[1:]:  # les types : la même image, leurs UV d'atlas
                me = o.data
                me.polygons.foreach_set("material_index", [0] * len(me.polygons))
                me.materials.clear()
                me.materials.append(mat)
                if me.uv_layers.get("motif"):
                    me.uv_layers.remove(me.uv_layers["motif"])
                me.update()
            noter("cuit")
        for o in temp:
            bpy.data.objects.remove(o, do_unlink=True)
        for o in objs[1:]:
            o.hide_render = False
        if exporter:
            infos["glb"] = N.exporter(coll.name, fichier + ".glb", couleurs=True)
        infos["ok"] = True
        noter("fini")
    except Exception:
        infos["erreur"] = traceback.format_exc()[-2500:]
        noter()
    return infos
