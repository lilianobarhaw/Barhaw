# L'Île des Géants Endormis, « niveau 5 » : l'île est un géant couché, endormi depuis si longtemps que l'herbe l'a couvert.
# (Son histoire, dans le bot : « Des collines en forme de géants couchés. Parlez doucement : ils ronflent. »)
# L'idée : le relief de l'île EST le géant, couché sur le dos (la tête à l'ouest, les pieds à l'est) : la tête et son
# visage tourné vers le ciel, qui se lit de profil (le front, le nez, la bouche entrouverte d'où sort son souffle, le
# menton ; les paupières closes, les sourcils de buissons), le tout couvert de mousse, la forêt de sa chevelure, le cou, la poitrine, le ventre où un hameau s'est installé autour du
# Nombril (une mare), les bras le long du corps et leurs mains aux doigts de roche, les genoux relevés (un moulin sur
# l'un), les pieds dont les orteils pointent vers le ciel. Au nord-est, la main d'un autre géant sort de la mer.
# La vie : le berger et ses moutons sur la poitrine, les gens du hameau, le moulin, le souffle du géant (des bouffées
# lentes au-dessus de sa bouche), la fumée des cheminées. Tout est inventé.
# La nuit : les fenêtres et les lanternes du hameau, le feu du berger.
import math, random
import numpy as np
import barhaw_niveau5 as N
import barhaw_verif as Vf
import barhaw_ile_v5 as K
import barhaw_port_v5 as P
import barhaw_arbre_v5 as A
import barhaw_vents_v5 as Vt
import barhaw_recif_v5 as Rf

PI = math.pi
T, Rz, Rx, Ry = N.T, N.Rz, N.Rx, N.Ry

R_SOL = 10.0
ZQ = 0.42
NOMBRIL = (-0.45, 0.0)
R_RONDE = 0.42  # le sentier qui fait le tour de la mare du Nombril
PISTES = []
# le corps : (genre, données, hauteur, forme) ; « bosse » : centre, rayons ; « membre » : deux bouts, rayon
CORPS = [  # (le dernier nombre : la part du rayon qui reste à plat sur le dessus)
    ("bosse", (-4.95, 0.0, 1.5, 1.3), 1.5, 0.25),  # la tête : un crâne rond, le visage tourné vers le ciel
    ("bosse", (-3.7, 0.0, 0.55, 0.7), 0.8, 0.2),  # le cou
    ("bosse", (-2.55, 0.0, 1.35, 1.95), 1.6, 0.35),  # la poitrine
    ("bosse", (-0.55, 0.0, 1.8, 1.95), 1.45, 0.5),  # le ventre : bien rond, un replat sur le dessus pour le hameau
    ("membre", ((-3.1, 1.95), (-1.5, 2.35)), 0.75, 0.6),  # les bras
    ("membre", ((-3.1, -1.95), (-1.5, -2.35)), 0.75, 0.6),
    ("membre", ((-1.5, 2.35), (0.35, 2.6)), 0.6, 0.52),  # les avant-bras
    ("membre", ((-1.5, -2.35), (0.35, -2.6)), 0.6, 0.52),
    ("bosse", (0.75, 2.7, 0.6, 0.5), 0.55, 0.2),  # les mains
    ("bosse", (0.75, -2.7, 0.6, 0.5), 0.55, 0.2),
    ("membre", ((0.75, 0.78), (3.0, 1.0)), 1.25, 0.78),  # les cuisses (elles partent du ventre)
    ("membre", ((0.75, -0.78), (3.0, -1.0)), 1.25, 0.78),
    ("bosse", (3.05, 1.0, 0.8, 0.75), 1.7, 0.25),  # les genoux relevés
    ("bosse", (3.05, -1.0, 0.8, 0.75), 1.7, 0.25),
    ("membre", ((3.1, 1.0), (5.0, 1.05)), 1.0, 0.56),  # les jambes
    ("membre", ((3.1, -1.0), (5.0, -1.05)), 1.0, 0.56),
    ("bosse", (5.45, 1.05, 0.48, 0.5), 1.35, 0.2),  # les pieds, orteils vers le ciel
    ("bosse", (5.45, -1.05, 0.48, 0.5), 1.35, 0.2),
]
PLAT = {"membre": 0.3}  # les membres : un dos rond, à plat sur un tiers de leur rayon
# le visage (en haut de la tête, couché sur le dos : le front vers l'ouest, le menton vers le cou) ; vu du sud, son profil
# se lit d'un coup d'œil : le front, le creux à la racine du nez, l'arête qui monte jusqu'au bout du nez, les lèvres, le menton
NEZ = [(-5.32, 0.0, 0.17), (-5.22, 0.08, 0.18), (-5.0, 0.26, 0.2), (-4.84, 0.42, 0.25), (-4.76, 0.38, 0.29), (-4.7, 0.18, 0.3), (-4.64, 0.0, 0.27)]  # (x, hauteur, demi-largeur)
TRAITS = [
    ((-5.6, 0.0, 0.34, 0.75), 0.42),  # le front bombé
    ((-5.3, 0.0, 0.1, 0.22), -0.1),  # le creux à la racine du nez
    ((-5.36, 0.36, 0.13, 0.28), 0.12),  # les arcades
    ((-5.36, -0.36, 0.13, 0.28), 0.12),
    ((-5.16, 0.36, 0.17, 0.2), -0.12),  # les orbites
    ((-5.16, -0.36, 0.17, 0.2), -0.12),
    ((-5.15, 0.36, 0.13, 0.15), 0.08),  # les paupières closes
    ((-5.15, -0.36, 0.13, 0.15), 0.08),
    ((-4.85, 0.44, 0.22, 0.24), 0.06),  # les pommettes
    ((-4.85, -0.44, 0.22, 0.24), 0.06),
    ((-4.55, 0.0, 0.12, 0.32), 0.08),  # la lèvre du haut
    ((-4.46, 0.0, 0.06, 0.24), -0.08),  # la bouche entrouverte (il ronfle)
    ((-4.36, 0.0, 0.12, 0.3), 0.08),  # la lèvre du bas
    ((-4.14, 0.0, 0.3, 0.45), 0.42),  # le menton
    ((-5.0, 1.32, 0.44, 0.23), 0.58),  # les oreilles, de chaque côté de la tête (vues d'en haut, elles dessinent la tête)
    ((-5.0, -1.32, 0.44, 0.23), 0.58),
    ((-4.97, 1.36, 0.24, 0.1), -0.26),  # le creux de l'oreille
    ((-4.97, -1.36, 0.24, 0.1), -0.26),
]
BOUCHE = (-4.46, 0.0)
NARINES = (-4.69, 0.12)
VISAGE = (-6.1, -3.6, -1.6, 1.6)  # le cadre du maillage fin (le visage et les oreilles)


def nez(x, y):
    if not NEZ[0][0] < x < NEZ[-1][0]:
        return 0.0
    for (xa, ha, la), (xb, hb, lb) in zip(NEZ, NEZ[1:]):
        if xa <= x <= xb:
            t = (x - xa) / (xb - xa)
            h, l_ = ha + (hb - ha) * t, la + (lb - la) * t
            return h * (1 - K.lisse(0.1, 1.0, abs(y) / l_)) if abs(y) < l_ else 0.0
    return 0.0


TETE = (-4.95, 0.0)
H_TETE = 1.5


def rivage(th):
    """Une île en long (le géant y est couché), la côte un peu découpée."""
    a_, b_ = 7.7, 5.0
    r = 1.0 / math.sqrt((math.cos(th) / a_) ** 2 + (math.sin(th) / b_) ** 2)
    return r + 0.25 * math.sin(3 * th + 0.9) + 0.18 * math.sin(5 * th + 2.2) + 0.12 * math.sin(7 * th + 0.4)


_COTE = np.array([(math.cos(a) * rivage(a), math.sin(a) * rivage(a)) for a in np.linspace(-PI, PI, 720, endpoint=False)])


def bord(x, y):
    d = float(np.sqrt(((_COTE - (x, y)) ** 2).sum(axis=1).min()))
    return d if math.hypot(x, y) < rivage(math.atan2(y, x)) else -d


def vers(angle, dedans):
    a = math.radians(angle)
    r = rivage(a) - dedans
    return math.cos(a) * r, math.sin(a) * r


def _bosse(x, y, cx, cy, rx, ry, H, plat):
    """Une colline ronde : à plat sur le dessus (jusqu'à `plat` de son rayon), puis elle descend en douceur, sans bord net."""
    r = math.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2)
    return H * (1 - K.lisse(plat, 1.0, r)) if r < 1 else 0.0


def _membre(x, y, a, b, H, r):
    ax, ay = a
    bx, by = b
    vx, vy = bx - ax, by - ay
    t = max(0.0, min(1.0, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)))
    d = math.hypot(x - ax - vx * t, y - ay - vy * t) / r
    return H * (1 - K.lisse(PLAT["membre"], 1.0, d)) if d < 1 else 0.0


def _smax(a, b, k=0.35):
    k = min(k, 2 * min(a, b))  # (près du bord d'une bosse, le raccord s'efface : pas de marche autour)
    if k <= 0:
        return max(a, b)
    h = max(k - abs(a - b), 0.0) / k
    return max(a, b) + h * h * k / 4


def corps(x, y):
    """La hauteur du géant en (x, y), sans le sol autour."""
    h = 0.0
    for genre, dn, H, f in CORPS:
        v = _bosse(x, y, *dn, H, f) if genre == "bosse" else _membre(x, y, dn[0], dn[1], H, f)  # (f : le plat, ou le rayon du membre)
        if v > 0:
            h = _smax(h, v)
    if VISAGE[0] < x < VISAGE[1] and VISAGE[2] < y < VISAGE[3]:
        h += nez(x, y)
        for (cx, cy, rx, ry), dz in TRAITS:
            h += _bosse(x, y, cx, cy, rx, ry, dz, 0.0)
    return h


def terrain(x, y):
    d = bord(x, y)
    if d < 0:
        return max(-1.5, 0.45 * d)
    h = 0.36 * K.lisse(0.0, 0.9, d) + (K.bruit2(x * 0.8, y * 0.8, 31) - 0.5) * 0.08 * K.lisse(0.4, 1.4, d)
    h += corps(x, y) * K.lisse(0.15, 1.0, d) + (K.bruit2(x * 1.6, y * 1.6, 32) - 0.5) * 0.06 * min(1.0, corps(x, y))
    dn = math.hypot(x - NOMBRIL[0], y - NOMBRIL[1])
    return h - 0.08 * (1 - K.lisse(0.16, 0.34, dn)) if dn < 0.34 else h  # le creux du Nombril, où l'eau de pluie fait une mare


sol = terrain


def tx_sol_geants(taille=2048, graine=931):
    """Le sol : le sable gris et les galets du rivage, l'herbe et la mousse qui couvrent le géant, la roche à nu sur les
    pentes raides (son nez, ses doigts, ses orteils), le pli sombre de ses paupières, les sentiers."""
    n = taille
    h = K.agrandir(K.champ(terrain, R_SOL, 260), n)
    gy, gx = np.gradient(h)
    pente = np.hypot(gx, gy) * n / (2 * R_SOL)
    piste = K.agrandir(K.champ(lambda x, y: min((K.distance_au_trajet(x, y, p) for p in PISTES), default=9.0), R_SOL, 240), n)
    b1, b2, b3, fin = N.bruit(n, 7, 7, graine, 4), N.bruit(n, 30, 30, graine + 1, 3), N.bruit(n, 96, 96, graine + 2, 2), N.bruit(n, 256, 256, graine + 3, 1)
    grain = N.bruit(n, 600, 600, graine + 4, 1)
    sable = N.mel(N.hexa(0xb6ad97), N.hexa(0xd2c8ae), np.clip(0.3 + 0.7 * b2 + 0.3 * (grain - 0.5), 0, 1))
    herbe = N.mel(N.hexa(0x52803d), N.hexa(0x86ae58), np.clip(0.1 + 0.7 * b2 + 0.35 * (b1 - 0.5), 0, 1)) * (0.86 + 0.26 * (fin - 0.5))[..., None]
    mousse = N.mel(N.hexa(0x45683a), N.hexa(0x6c8f4a), np.clip(b3, 0, 1))
    herbe = N.mel(herbe, mousse, N.lisse(0.55, 0.75, b1) * 0.6)
    coul = N.mel(sable, herbe, N.lisse(0.28, 0.42, h + (b3 - 0.5) * 0.08))
    roche = N.mel(N.hexa(0x7f7a6e), N.hexa(0xaaa291), np.clip(0.2 + 0.7 * b3 + 0.3 * (b2 - 0.5), 0, 1)) * (0.85 + 0.3 * (fin - 0.5))[..., None]
    gx_, gy_ = N.grille(n)
    X, Y = (gx_ * 2 - 1) * R_SOL, (gy_ * 2 - 1) * R_SOL
    crane = N.lisse(1.0, 0.8, np.hypot((X - TETE[0]) / 1.5, (Y - TETE[1]) / 1.55)) * (1 - N.lisse(0.35, 0.2, np.hypot((X + 4.85) / 0.4, Y / 0.3)))
    coul = N.mel(coul, mousse * 0.92, crane * 0.75)  # la tête : une mousse épaisse, plus sombre (seul le bout du nez reste en roche)
    sur_lui = N.lisse(0.2, 0.55, K.agrandir(K.champ(corps, R_SOL, 260), n))  # le corps du géant (pas le sol autour)
    raide = N.lisse(1.3, 2.1, pente + (b3 - 0.5) * 0.5) * N.lisse(0.3, 0.45, h)
    coul = N.mel(coul, mousse * 0.86, raide * sur_lui * 0.8)  # ses flancs : de la mousse, comme une couverture
    roc_nu = np.maximum(1 - sur_lui, N.lisse(0.62, 0.74, b2))  # par endroits seulement, la roche du géant perce la mousse
    coul = N.mel(coul, roche, raide * 0.85 * (1 - 0.85 * crane) * roc_nu)  # la roche perce seulement sur les flancs les plus raides
    for sy in (-1, 1):  # les yeux clos : l'orbite dans l'ombre, le pli de la paupière en arc vers le menton, les cils
        coul = N.mel(coul, N.hexa(0x33402a), N.lisse(1.0, 0.45, np.hypot((X + 5.16) / 0.24, (Y - sy * 0.36) / 0.26)) * 0.4)
        rho = np.hypot((X + 5.2) / 0.15, (Y - sy * 0.36) / 0.16)
        phi = np.arctan2((Y - sy * 0.36) / 0.16, (X + 5.2) / 0.15)
        bas = (X > -5.2) & (np.abs(Y - sy * 0.36) < 0.17)
        coul = N.mel(coul, N.hexa(0x222a1c), N.lisse(0.3, 0.0, np.abs(rho - 1.0)) * bas)
        cils = (rho > 1.0) & (rho < 1.42) & (np.cos(phi) > 0.25) & (np.abs(np.sin(7 * phi)) < 0.22)
        coul = N.mel(coul, N.hexa(0x222a1c), cils * 0.9)
    coul = N.mel(coul, N.hexa(0x2a2018), N.lisse(1.0, 0.0, np.hypot((X - BOUCHE[0]) / 0.05, Y / 0.27)) * 0.9)  # la fente de la bouche
    for sy in (-1, 1):  # les narines
        coul = N.mel(coul, N.hexa(0x2a241c), N.lisse(1.0, 0.3, np.hypot((X - NARINES[0]) / 0.06, (Y - sy * NARINES[1]) / 0.045)) * 0.85)
    terre = N.mel(N.hexa(0xa58e68), N.hexa(0xc2aa7e), np.clip(0.2 + 0.7 * b3, 0, 1)) * (0.92 + 0.16 * (grain - 0.5))[..., None]
    coul = N.mel(coul, terre, N.lisse(0.22, 0.13, piste + (fin - 0.5) * 0.05) * N.lisse(0.3, 0.4, h))
    fleurs = N.lisse(0.93, 0.96, N.bruit(n, 250, 250, graine + 7, 1)) * N.lisse(0.5, 0.7, h) * (1 - N.lisse(0.8, 1.2, pente))
    coul = N.mel(coul, N.mel(N.hexa(0xf4f1e6), N.hexa(0xe8d36a), N.lisse(0.4, 0.6, b2)), fleurs * 0.7)
    relief = np.clip(0.5 + 0.2 * (b3 - 0.5) + 0.15 * (fin - 0.5), 0, 1)
    return np.clip(coul, 0, 1).astype(np.float32), relief.astype(np.float32)


N.matiere("sol_geants", tx_sol_geants, 2 * R_SOL, 0.6, 0.9)
N.matiere("roche_geant", N.tx_roche, 1.6, 1.0, c=0x8e887a, graine=932)


# --- les pièces ---
def roc(L, rng, x, y, z, r, ez=1.0, mat="roche_geant", n=7):
    v, f = N.sphere(r, n, max(4, n - 3), ez)
    g = rng.random() * 9
    v = [(a * q, b * q, c * q) for (a, b, c) in v for q in [1 + 0.2 * math.sin(a / r * 3.1 + g) * math.sin(b / r * 2.7 + g * 1.3) + 0.1 * math.sin(c / r * 5 + g)]]
    L.ajouter(v, f, mat, T(x, y, z) @ Rz(g))


def doigt(L, a, b, r, nb=3, mat="roche_geant"):
    """Un doigt de roche : des phalanges de plus en plus fines, de a à b, un ongle de pierre claire au bout."""
    a, b = np.asarray(a, np.float64), np.asarray(b, np.float64)
    pts = [a + (b - a) * k / nb for k in range(nb + 1)]
    for k in range(nb):
        L.ajouter(*N.tube([tuple(pts[k]), tuple(pts[k + 1])], [r * (1 - 0.12 * k), r * (1 - 0.12 * (k + 1))], 7, bouts=True), mat)
        L.ajouter(*N.sphere(r * (1.05 - 0.12 * k), 7, 5), mat, T(*pts[k]))


def maisonnette(L, V, rng, x, y, z, cap, lx=0.8, ly=0.62, hm=0.46, ht=0.36, mur="crepi_ocre", toit="chaume", socle=0.3):
    """Une maison du hameau : un soubassement de pierre, des murs crépis, un toit de chaume, une porte, des fenêtres
    (allumées la nuit), une cheminée."""
    M = T(x, y, z) @ Rz(cap)
    L.ajouter(*N.boite(lx + 0.04, ly + 0.04, socle, haut=False), "pierres", M @ T(0, 0, 0.06 - socle))  # (plus haut au bord du replat : il descend dans la pente)
    L.ajouter(*N.boite(lx, ly, hm - 0.06, haut=False), mur, M @ T(0, 0, 0.06))
    L.ajouter(*N.pignons(lx, ly, ht), mur, M @ T(0, 0, hm))
    v, f = N.toit_pignon(lx, ly, ht, 0.12, 0.07)
    L.ajouter(v, [f[0], f[4]], toit, M @ T(0, 0, hm))
    L.ajouter(v, [q for k, q in enumerate(f) if k not in (0, 4)], "planches_sombres", M @ T(0, 0, hm))
    Mf = M @ T(0, -ly / 2, 0)
    xp = rng.choice([-1, 1]) * lx * 0.24
    L.ajouter(*N.quad((xp - 0.1, -0.012, 0.0), (xp + 0.1, -0.012, 0.0), (xp + 0.1, -0.012, 0.33), (xp - 0.1, -0.012, 0.33)), "porte", Mf)
    P.fenetre(L, V, rng, Mf, -xp, 0.16, 0.16, 0.18, volets="peint_vert", allumee=True)
    P.fenetre(L, V, rng, M @ Rz(PI) @ T(0, -ly / 2, 0), 0.0, 0.18, 0.15, 0.16, allumee=rng.random() < 0.5)
    P.cheminee(L, M, lx * 0.28, ly * 0.15, hm + ht * 0.45, 0.28, 0.12)
    return Vf.rectangle(x, y, lx + 0.1, ly + 0.1, cap)


def moulin(L, lots, x, y, z, cap, h=1.05):
    """Le moulin du Genou : une tour de pierre ronde, son toit, ses quatre ailes de toile qui tournent (un objet à part)."""
    L.ajouter(*N.cylindre(0.3, 0.22, h, 10, haut=False), "pierres_claires", T(x, y, z - 0.08))
    v, f = N.toit_pointe(0.28, 0.36, 10, 0.05, 0.0)
    L.ajouter(v, f, "chaume", T(x, y, z + h - 0.08))
    L.ajouter(*N.quad((-0.09, -0.012, 0.0), (0.09, -0.012, 0.0), (0.09, -0.012, 0.3), (-0.09, -0.012, 0.3)), "porte", T(x, y, z) @ Rz(cap + PI / 2) @ T(0, -0.29, -0.02))
    W = N.Maille("ailes")
    for k in range(4):
        Ma = Rx(k * PI / 2 + 0.4)
        W.ajouter(*N.poutre((0, 0, 0), (0, 0, 0.85), 0.03), "planches_sombres", Ma)
        W.ajouter(*N.boite(0.01, 0.22, 0.62), "toile_ecrue", Ma @ T(0.0, 0.12, 0.22))
    W.ajouter(*N.sphere(0.06, 6, 4), "planches_sombres")
    o = (x + math.cos(cap) * 0.3, y + math.sin(cap) * 0.3, z + h * 0.8)
    lots["animes"].append((W, o, {"anim": "tourne", "axe": [math.cos(cap), math.sin(cap), 0.0], "vitesse": 0.9}))
    return Vf.rond(x, y, 0.32, 10)


def mailles(graine=931, leger=False):
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
    P.CHEMINEES.clear()

    quai_mer, quai_terre = vers(-90, -1.5), vers(-90, 0.7)
    montee = [quai_terre, (0.9, -4.05), (1.9, -3.75), (2.4, -3.45)]  # le long de la grève, jusqu'à la main
    # (le tour de la mare, serré : les maisons du hameau tiennent sur le replat du ventre, autour)
    ronde = [(NOMBRIL[0] + math.cos(a) * R_RONDE, NOMBRIL[1] + math.sin(a) * R_RONDE) for a in np.arange(0, 2 * PI - 0.01, PI / 8)]
    vers_poitrine = [(NOMBRIL[0] - R_RONDE, NOMBRIL[1]), (-1.6, 0.3), (-1.7, 0.5), (-2.2, 0.8), (-2.5, 0.35), (-3.15, 0.25)]  # (un lacet pour monter sur la poitrine)
    vers_genou = [(NOMBRIL[0] + R_RONDE * math.cos(PI / 6), NOMBRIL[1] + R_RONDE * math.sin(PI / 6)), (0.55, 0.62), (1.5, 0.85), (2.35, 0.93)]
    PISTES[:] = [[(x, y, 0.0) for x, y in pts] for pts in (montee, ronde + ronde[:1], vers_poitrine, vers_genou)]
    couloirs = [(pts, 0.13) for pts in PISTES]
    loin = lambda x, y, r: all(K.distance_au_trajet(x, y, pts) > r + rc + 0.05 for pts, rc in couloirs)

    def libre(x, y, r, bas=0.3):
        if terrain(x, y) < bas or not loin(x, y, r):
            return False
        return all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for _, _, p in SOL) and all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for _, p in emprises)

    etape("le terrain")
    n, R = (52 if leger else 92), R_SOL
    xs = [-R + 2 * R * i / n for i in range(n + 1)]
    H_ = [[terrain(x, y) for x in xs] for y in xs]
    rang, sommets, uvs, faces = {}, [], [], []

    def sommet(i, j):
        if (i, j) not in rang:
            rang[(i, j)] = len(sommets)
            sommets.append((xs[i], xs[j], H_[j][i]))
            uvs.append(((xs[i] + R) / (2 * R), (xs[j] + R) / (2 * R)))
        return rang[(i, j)]

    pas, fin = 2 * R / n, 3
    i0, i1 = int((VISAGE[0] + R) / pas), int(math.ceil((VISAGE[1] + R) / pas))
    j0, j1 = int((VISAGE[2] + R) / pas), int(math.ceil((VISAGE[3] + R) / pas))
    na, nb = (i1 - i0) * fin, (j1 - j0) * fin
    rang_fin = {}

    def sommet_fin(a, b):
        """Un point du maillage fin ; sur son bord, il suit exactement l'arête du gros maillage (pas de fente), puis le
        relief vrai reprend en une case."""
        if a % fin == 0 and b % fin == 0:
            return sommet(i0 + a // fin, j0 + b // fin)
        if (a, b) not in rang_fin:
            x, y = xs[i0] + a * pas / fin, xs[j0] + b * pas / fin
            ci, cj = i0 + min(a // fin, i1 - i0 - 1), j0 + min(b // fin, j1 - j0 - 1)
            u, v = (x - xs[ci]) / pas, (y - xs[cj]) / pas
            bil = (H_[cj][ci] * (1 - u) + H_[cj][ci + 1] * u) * (1 - v) + (H_[cj + 1][ci] * (1 - u) + H_[cj + 1][ci + 1] * u) * v
            w = min(1.0, min(a, na - a, b, nb - b) / fin)
            rang_fin[(a, b)] = len(sommets)
            sommets.append((x, y, w * terrain(x, y) + (1 - w) * bil))
            uvs.append(((x + R) / (2 * R), (y + R) / (2 * R)))
        return rang_fin[(a, b)]

    debut_sol = len(L.f)
    for j in range(n):
        for i in range(n):
            if max(H_[j][i], H_[j][i + 1], H_[j + 1][i + 1], H_[j + 1][i]) < -0.25 or (i0 <= i < i1 and j0 <= j < j1):
                continue
            faces.append((sommet(i, j), sommet(i + 1, j), sommet(i + 1, j + 1), sommet(i, j + 1)))
    for b_ in range(nb):
        for a_ in range(na):
            faces.append((sommet_fin(a_, b_), sommet_fin(a_ + 1, b_), sommet_fin(a_ + 1, b_ + 1), sommet_fin(a_, b_ + 1)))
    L.ajouter(sommets, faces, "sol_geants", uv=uvs)
    L.regrouper(debut_sol, None, 4, 0.75)

    etape("le visage")
    # --- le nez de roche, les sourcils de buissons, la lèvre ; la chevelure : une forêt autour de la tête ---
    for s in (-1, 1):
        for k in range(3):  # les sourcils, en buissons sur les arcades
            t = k / 2
            x, y = -5.38 - 0.05 * math.sin(t * PI), s * (0.2 + 0.34 * t)
            A.buisson(L, rng, x, y, terrain(x, y) - 0.07, 0.12 + 0.02 * math.sin(t * PI), None)
    SOL.append(("decor", "le visage", Vf.rectangle(-4.95, 0.0, 1.95, 1.4, 0.0)))
    n_ch = 0
    for k in range(16 if leger else 34):  # la chevelure : un bois derrière le front, sans rien devant le profil
        x, y = -7.1 + 1.05 * rng.random(), -1.45 + 2.9 * rng.random()
        if n_ch < (6 if leger else 11) and (x < -6.35 or abs(y) < 0.9) and terrain(x, y) > 0.22 and libre(x, y, 0.3, 0.2):
            n_ch += 1
            A.petit_arbre(L, rng, x, y, terrain(x, y), 1.0 + 0.5 * rng.random(), 0.5)
            SOL.append(("arbre", "un arbre de la chevelure", Vf.rond(x, y, 0.22)))

    for k in range(14 if leger else 30):  # les mèches : des buissons bas tout autour du crâne
        an = math.radians(118 + 124 * rng.random())
        d = 0.95 + 0.5 * rng.random()
        x, y = TETE[0] + math.cos(an) * d * 1.16, TETE[1] + math.sin(an) * d
        if terrain(x, y) > 0.45 and libre(x, y, 0.13, 0.4):
            A.buisson(L, rng, x, y, terrain(x, y) - 0.05, 0.13 + 0.07 * rng.random(), None)
            SOL.append(("buisson", "une mèche", Vf.rond(x, y, 0.12)))

    etape("les mains, les pieds")
    # --- les doigts de roche des deux mains, les orteils des deux pieds ; la main de l'autre géant, dans la mer ---
    for s in (-1, 1):
        cx, cy = 0.75, s * 2.7
        zc = terrain(cx, cy)
        for k in range(4):
            yy = cy + s * (-0.27 + 0.18 * k)
            doigt(L, (cx + 0.25, yy, zc - 0.2), (cx + 0.95 + 0.1 * (k in (1, 2)), yy + s * 0.04 * (k - 1.5), terrain(cx + 0.95, yy) + 0.05), 0.11, 3)
        doigt(L, (cx - 0.1, cy - s * 0.38, zc - 0.25), (cx + 0.45, cy - s * 0.62, terrain(cx + 0.45, cy - s * 0.62) + 0.12), 0.12, 2)
        SOL.append(("decor", "une main", Vf.rectangle(cx + 0.45, cy, 1.4, 1.1, 0.0)))
        fx, fy = 5.45, s * 1.05
        zf = terrain(fx, fy)
        for k in range(5):
            yy = fy + s * (-0.3 + 0.15 * k)
            r = 0.12 if k == 0 else 0.085 - 0.006 * k
            doigt(L, (fx + 0.2, yy, zf - 0.35), (fx + 0.32, yy, zf + 0.05 - 0.04 * k), r, 2)
        SOL.append(("decor", "un pied", Vf.rond(fx + 0.1, fy, 0.55)))
    # la main de l'autre géant, qui sort de la mer au nord-est
    mx, my = 4.6, 6.3
    roc(L, rng, mx, my, -0.5, 0.75, 0.6, n=9)
    for k in range(4):
        a = math.radians(-40 + 26 * k)
        base = (mx + math.cos(a) * 0.45, my + math.sin(a) * 0.45, 0.0)
        mil = (base[0] + math.cos(a) * 0.2, base[1] + math.sin(a) * 0.2, 0.9 + 0.15 * (k in (1, 2)))
        bout = (mil[0] + math.cos(a) * 0.12 - 0.15, mil[1] + math.sin(a) * 0.12, mil[2] + 0.5)
        doigt(L, base, mil, 0.13, 2)
        doigt(L, mil, bout, 0.11, 2)
    doigt(L, (mx - 0.4, my - 0.4, -0.1), (mx - 0.75, my - 0.6, 0.55), 0.14, 2)

    etape("le hameau du Ventre")
    # --- le hameau autour du Nombril (une mare), le puits, des lanternes ; le moulin du Genou ---
    zn = terrain(*NOMBRIL)
    L.ajouter(*N.cylindre(0.28, 0.28, 0.02, 16, bas=False), "eau_bassin", T(NOMBRIL[0], NOMBRIL[1], zn + 0.004))  # (le bord sous l'herbe)
    for k in range(12):
        a = k * 2 * PI / 12 + rng.uniform(-0.12, 0.12)
        px, py = NOMBRIL[0] + math.cos(a) * 0.29, NOMBRIL[1] + math.sin(a) * 0.29
        roc(L, rng, px, py, terrain(px, py) - 0.015, rng.uniform(0.038, 0.05), 0.7, "pierres_claires", 5)
    SOL.append(("decor", "le Nombril", Vf.rond(NOMBRIL[0], NOMBRIL[1], 0.33, 12)))
    # les maisons, posées sur le replat du ventre, la porte vers la mare (pas sur la pente : elles ne glissent pas)
    # (trois seulement : les deux sentiers, vers la poitrine et vers le genou, laissent la place de trois maisons autour)
    for k, (g, lx, ly, r) in enumerate(((105, 0.62, 0.5, 0.86), (225, 0.6, 0.5, 0.86), (288, 0.58, 0.48, 0.845))):
        a = math.radians(g)
        x, y = NOMBRIL[0] + math.cos(a) * r, NOMBRIL[1] + math.sin(a) * r
        if libre(x, y, 0.22, 0.7):
            SOL.append(("decor", f"une maison ({x:.1f}, {y:.1f})", maisonnette(L, V, rng, x, y, terrain(x, y), a - PI / 2, lx, ly, 0.52, 0.32, mur=("crepi_ocre", "crepi_blanc", "crepi_rose")[k % 3], socle=0.62)))
    poses = 0
    for g, r in ((160, 0.72), (265, 0.7), (345, 0.68), (60, 0.72), (200, 0.74)):
        x, y = NOMBRIL[0] + math.cos(math.radians(g)) * r, NOMBRIL[1] + math.sin(math.radians(g)) * r
        if poses < (2 if leger else 4) and libre(x, y, 0.06, 0.8):
            P.lampadaire(L, U, x, y, terrain(x, y))
            SOL.append(("rocher", "une lanterne", Vf.rond(x, y, 0.06)))
            poses += 1
    gx, gy = 3.05, 1.0
    if libre(gx, gy, 0.35, 1.0):
        SOL.append(("decor", "le moulin du Genou", moulin(L, lots, gx, gy, terrain(gx, gy), math.radians(30))))

    etape("le berger")
    # --- le berger et son feu sur la poitrine, les moutons qui paissent sur la poitrine et les cuisses ---
    bx, by = -2.45, -0.75
    if libre(bx, by, 0.2, 1.0):
        zb = terrain(bx, by)
        for k in range(6):
            a = k * PI / 3
            L.ajouter(*N.poutre((bx + math.cos(a) * 0.12, by + math.sin(a) * 0.12, zb + 0.01), (bx - math.cos(a) * 0.04, by - math.sin(a) * 0.04, zb + 0.09), 0.03), "planches_sombres")
        U.ajouter(*N.cylindre(0.06, 0.0, 0.16, 6, haut=False), "feu", T(bx, by, zb + 0.03))
        SOL.append(("decor", "le feu du berger", Vf.rond(bx, by, 0.16)))
        P.passant(L, rng, bx + 0.25, by + 0.1, angle=PI + 0.3, z=terrain(bx + 0.25, by + 0.1))
        SOL.append(("passant", "le berger", Vf.rond(bx + 0.25, by + 0.1, 0.065)))
        P.lampadaire(L, U, bx - 0.3, by + 0.05, terrain(bx - 0.3, by + 0.05), 0.45)
    hx, hy = -2.7, -0.22  # la cabane du berger, en pierres sèches, la porte tournée vers son feu
    if not leger and libre(hx, hy, 0.3, 1.0):
        SOL.append(("decor", "la cabane du berger", maisonnette(L, V, rng, hx, hy, terrain(hx, hy), 0.44, 0.5, 0.42, 0.42, 0.28, mur="pierres", socle=0.4)))
    moutons, hasard = 0, random.Random(41)
    for _ in range(200):
        if moutons >= (6 if leger else 14):
            break
        x, y = -3.2 + hasard.random() * 6.0, -1.6 + hasard.random() * 3.2
        if libre(x, y, 0.1, 0.9) and abs(x - NOMBRIL[0]) > 1.6:
            Vt.mouton(L, rng, x, y, terrain(x, y), hasard.random() * 6.28, moutons % 2 == 0)
            SOL.append(("passant", "un mouton", Vf.rond(x, y, 0.1)))
            moutons += 1

    etape("le rivage")
    # --- le débarcadère et sa bannière, une barque, des rochers sur la grève, quelques arbres au pied du géant ---
    Rf.tablier(L, quai_mer, quai_terre, ZQ, ZQ, 0.5)
    lg = quai_terre[1] - quai_mer[1]
    for t in (0.12, 0.45, 0.78):
        for s in (-1, 1):
            L.ajouter(*N.cylindre(0.04, 0.034, ZQ + 0.95, 6, haut=False), "planches_sombres", T(quai_mer[0] + s * 0.21, quai_mer[1] + lg * t, -0.95))
    quai = Vf.rectangle(0.0, (quai_mer[1] + quai_terre[1]) / 2, lg, 0.5, PI / 2)
    emprises.append(("le débarcadère", quai))
    ponts.append(quai)
    P.banniere(lots, quai_mer[0] + 0.34, quai_mer[1] + 0.25, -0.3, 1.75, "rose", math.radians(100))
    P.barque(L, rng, quai_mer[0] - 0.55, quai_mer[1] + 0.9, math.radians(80), 0.75)
    P.lampadaire(L, U, quai_mer[0] + 0.18, quai_mer[1] + 0.15, ZQ)  # la lanterne du bout du débarcadère
    for x, y in [(-1.6, 0.66), (-3.1, 0.78), (1.55, 1.18), (2.6, -3.05)][: 2 if leger else 4]:  # des lanternes le long des sentiers
        if libre(x, y, 0.06, 0.3):
            P.lampadaire(L, U, x, y, terrain(x, y), 0.55)
            SOL.append(("rocher", "une lanterne", Vf.rond(x, y, 0.06)))
    for k in range(12 if leger else 26):
        x, y = vers(rng.random() * 360, 0.15 + rng.random() * 0.8)
        if libre(x, y, 0.2, 0.05):
            roc(L, rng, x, y, terrain(x, y) - 0.06, 0.15 + 0.15 * rng.random(), 0.7, "roche_geant", 6)
            SOL.append(("rocher", "un rocher", Vf.rond(x, y, 0.16)))
    for k in range(6 if leger else 12):
        x, y = vers(rng.random() * 360, 1.0 + rng.random() * 1.0)
        if corps(x, y) < 0.15 and not -6.6 < x < -3.3 and libre(x, y, 0.35, 0.3):  # (rien devant le visage)
            A.petit_arbre(L, rng, x, y, terrain(x, y), 1.0 + 0.4 * rng.random(), 0.5)
            SOL.append(("arbre", "un arbre", Vf.rond(x, y, 0.22)))

    etape("la vie")
    for k, (x, y, cap) in enumerate(((NOMBRIL[0] + 0.68, NOMBRIL[1] - 0.2, 2.9), (-2.35, -0.05, 3.3), (1.1, -0.3, 3.4))[: 2 if leger else 3]):
        if libre(x, y, 0.07, 0.8):
            P.passant(L, rng, x, y, angle=cap, z=terrain(x, y))
            SOL.append(("passant", "un habitant", Vf.rond(x, y, 0.065)))
    chemins = [
        (K.suivre([quai_mer] + montee, sol, 0.2), False, 0.14, 0.0, 4.0),
        (K.suivre(ronde + ronde[:1], sol, 0.2)[:-1], True, 0.11, 0.2, 0),
        (K.suivre(vers_poitrine, sol, 0.2), False, 0.13, 0.4, 3.0),
        (K.suivre(vers_genou, sol, 0.2), False, 0.13, 0.7, 3.0),
    ]
    for pts, *_ in chemins:
        for k, q in enumerate(pts):
            if bord(q[0], q[1]) < 0.7 and abs(q[0]) < 0.3:
                pts[k] = (q[0], q[1], ZQ + 0.02)
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
        t_ = k % 2
        if t_ not in deja:
            deja[t_] = len(lots["animes"])
            lots["animes"].append((types[t_], pts[0], extras))
        else:
            lots["copies"].append((deja[t_], pts[0], extras))
    # le souffle du géant : des bouffées lentes au-dessus de sa bouche ; et la fumée des cheminées
    bouche = (BOUCHE[0], BOUCHE[1], terrain(*BOUCHE) + 0.1)
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "fumees", "points": list(bouche) + [NARINES[0], NARINES[1], terrain(*NARINES) + 0.1], "grosseur": 0.75, "monte": 0.7}))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "fumees", "points": [float(c) for p in P.CHEMINEES for c in p], "grosseur": 0.35}))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "mer", "rayon": 8.6, "genre": 2}))
    lots["reperes"].append(((-1.0, 0.0, 3.5), {"anim": "oiseaux", "nb": 3 if leger else 5, "rayon": 4.5}))

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
    return K.controler(lots or mailles(leger=leger), sol)


def construire(rendu=True, cuire=True, exporter=True, taille=None, echantillons=48, leger=False, alleger=True):
    lots = mailles(leger=leger)
    rendus = [("geants-v5", (1.0, -30.0, 17.0), (0.0, 0.0, 1.2), 50), ("geants-v5-visage", (-8.5, -4.5, 5.5), (-4.9, 0.0, 2.2), 40), ("geants-v5-hameau", (2.6, -5.2, 5.0), (-0.6, 0.0, 1.85), 55)] if rendu else []
    return K.construire("ile-geants-v5", lots, verifier(lots), rendus, cuire, exporter, taille or (2048 if leger else 3072), echantillons, leger, alleger, atlas="geants")
