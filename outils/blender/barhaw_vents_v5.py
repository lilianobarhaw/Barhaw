# L'Île des Vents, « niveau 5 » : une île d'herbe rase que le vent d'ouest ne lâche jamais, et les moulins qu'on y a plantés
# partout pour le faire travailler. Tout est inventé.
# (Son histoire, dans le bot : « Des moulins partout, et un vent si fort qu'il faut se tenir à plusieurs pour ne pas
# s'envoler. »)
# Le vent souffle du sud-ouest vers le nord-est. L'île est dessinée « dans le vent » (le vent le long de +x : tout y penche
# vers +x, les falaises sont du côté de -x, la crique sous le vent), puis tournée d'un huitième de tour à la fin (CAP,
# orienter()) : vues du sud, comme sur la carte, les roues des moulins se présentent de trois quarts, face au soleil. Le hameau de pierre tourne le dos au vent derrière son grand mur ; la « corde de vie »
# (une corde sur des piquets, ses lanternes, ses moulinets) monte du ponton jusqu'au Grand Moulin du sommet, et l'on s'y
# tient à trois. Autour : deux moulins à pivot, un moulin de pierre, des éoliennes de pompage, des champs de blé où le vent
# fait courir sa houle, des arbres couchés, le linge, la manche à air, des cerfs-volants (dont un noir, sans emblème,
# attaché à un piquet de la côte est).
# La vie : les ailes qui tournent, les trois qui montent en se tenant, les cerfs-volants, les flammes au vent, la fumée
# couchée, les rafales (dessinées par le site), les oiseaux.
# Sorties : ile-vents-v5.glb (+ -leger) et son atlas .png. Contrôle du plan : verifier() (voir barhaw_ile_v5.py).
import math, random
import numpy as np
import barhaw_niveau5 as N
import barhaw_verif as Vf
import barhaw_ile_v5 as K
import barhaw_port_v5 as P
import barhaw_recif_v5 as Rf

PI = math.pi
T, Rz, Rx, Ry = N.T, N.Rz, N.Rx, N.Ry


def tx_ble(c=0xe6bd4e, c2=0xffe9a0, graine=1):
    """Des brins couchés par le vent (le blé, l'herbe haute, le chaume d'un toit) : de longues mèches claires et sombres."""
    n = N.TAILLE
    brins = N.bruit(n, 7, 120, graine, 2)
    t = N.bruit(n, 5, 5, graine + 1, 4)
    fin = N.bruit(n, 96, 96, graine + 2, 1)
    coul = N.mel(N.hexa(c) * 0.8, N.hexa(c2), N.lisse(0.28, 0.76, brins * 0.72 + t * 0.28))
    coul = coul * (0.88 + 0.22 * fin)[..., None]
    return np.clip(coul, 0, 1).astype(np.float32), np.clip(0.25 + 0.65 * brins, 0, 1).astype(np.float32)


def tx_touffes(c=0x47763a, graine=1, g=9):
    """Un feuillage en petites touffes, sans cernes sombres : clair au cœur de chaque touffe, à peine plus foncé entre elles."""
    n = N.TAILLE
    d, ident, nb = N.cellules(n, g, graine)
    al = np.random.default_rng(graine + 1).random(nb, dtype=np.float32)[ident]
    fin = N.bruit(n, 48, 48, graine + 2, 2)
    coul = N.hexa(c) * (0.74 + 0.22 * al + 0.3 * N.lisse(0.0, 0.5, d) + 0.16 * (fin - 0.5))[..., None]
    coul = N.mel(coul, coul * np.array([1.18, 1.1, 0.62], np.float32), (al > 0.72) * 0.45)
    return np.clip(coul, 0, 1).astype(np.float32), N.lisse(0.0, 0.5, d).astype(np.float32)


N.matiere("ble", tx_ble, 1.6, 0.6, graine=401)
N.matiere("herbe_haute", tx_ble, 1.6, 0.6, c=0x95b450, c2=0xd6de8c, graine=402)
N.matiere("chaume", tx_ble, 0.42, 0.9, c=0xa3916a, c2=0xd0bc88, graine=403)
N.matiere("bruyere", tx_touffes, 0.5, 0.7, c=0x7d5f8a, graine=404, g=9)
N.matiere("feuillage_vent", tx_touffes, 0.7, 0.8, c=0x4f8a3c, graine=409, g=9)
N.matiere("feuillage_vent_clair", tx_touffes, 0.7, 0.8, c=0x86aa44, graine=410, g=9)
for _nom, _c in (("vif_rose", 0xff5aae), ("vif_or", 0xffc23d), ("vif_turquoise", 0x2fd3c4), ("vif_violet", 0x9b4dff), ("vif_blanc", 0xfff4e0)):
    N.matiere(_nom, N.tx_uni, 0.6, 0.2, c=_c, graine=411 + len(_nom), grain=0.08, taches=0.12)
N.matiere("laine", N.tx_uni, 0.4, 0.5, c=0xefe7d4, graine=405, grain=0.3, taches=0.3)
N.matiere("toile_rature", N.tx_uni, 1.0, 0.3, c=0x1f1d23, graine=406, grain=0.2, taches=0.3, c2=0x35323a, seuil=0.55)
N.matiere("corde_vents", N.tx_corde, 0.3, 0.8, c=0xb89a6a, graine=407)
N.matiere("ecorce_vents", N.tx_corde, 0.5, 0.9, c=0x6a5540, graine=408)

CAP = math.radians(45)  # où va le vent, une fois l'île tournée : vers le nord-est
CRIQUE = math.radians(-72)  # la crique sous le vent (au sud-est avant de tourner l'île, à l'est après)
SOMMET = (0.9, 1.6)  # la butte du Grand Moulin
BUTTE = (-3.4, 0.6)  # la butte de l'ouest : un moulin à pivot
TERTRE = (4.7, 2.9)  # le tertre sous le vent : l'autre moulin à pivot
PUITS = (-0.6, -1.8)  # le puits, au milieu du hameau
MAISONS = [(-1.72, -1.32, 0.1, 1.2, 0.85, "pierres_claires"), (-1.75, -2.55, -0.08, 1.1, 0.8, "pierres"), (0.98, -1.5, 0.05, 1.1, 0.8, "pierres_claires"), (-3.3, -1.95, 0.18, 1.0, 0.76, "pierres")]  # (x, y, cap, long, large, mur)
CHAMPS = [(3.3, -1.4, 2.5, 1.45, 0.1, "ble"), (3.2, 1.75, 1.6, 1.1, -0.15, "ble"), (-1.5, 3.45, 1.6, 1.0, 0.3, "ble")]  # (x, y, long, large, angle)
R_SOL = 9.6
PISTES = []


def _ecart(a, b):
    return (a - b + PI) % (2 * PI) - PI


def rivage(th):
    """Le rayon de la côte dans cette direction : une île étirée d'ouest en est, comme le vent."""
    return 6.25 + 0.7 * math.cos(2 * th) + 0.3 * math.sin(3 * th + 0.6) + 0.16 * math.sin(7 * th + 1.9) - 1.9 * math.exp(-((_ecart(th, CRIQUE) / 0.42) ** 2))


_COTE = np.array([(math.cos(a) * rivage(a), math.sin(a) * rivage(a)) for a in np.linspace(-PI, PI, 720, endpoint=False)])


def bord(x, y):
    """La vraie distance au bord de l'eau ; > 0 : à terre."""
    d = float(np.sqrt(((_COTE - (x, y)) ** 2).sum(axis=1).min()))
    return d if math.hypot(x, y) < rivage(math.atan2(y, x)) else -d


def relief(x, y, d):
    """Le terrain nu : la grève, la lande ; à l'ouest, la côte au vent se dresse en falaise ; la butte du Grand Moulin (plate
    au sommet), celle de l'ouest, le tertre du nord-est. d : la distance au bord de l'eau."""
    h = 0.32 * (1 - math.exp(-d / 0.75)) + 0.5 * K.lisse(1.3, 3.8, d)
    h += K.lisse(0.5, -4.0, x - 0.25 * y) * 0.7 * K.lisse(0.1, 0.55, d)
    rs = math.hypot(x - SOMMET[0], y - SOMMET[1])
    h += 1.35 * math.exp(-max(0.0, rs - 0.8) ** 2 / 2.6) * K.lisse(0.5, 1.8, d)
    h += 0.55 * math.exp(-((x - BUTTE[0]) ** 2 + (y - BUTTE[1]) ** 2) / 1.7) * K.lisse(0.4, 1.4, d)
    h += 0.4 * math.exp(-((x - TERTRE[0]) ** 2 + (y - TERTRE[1]) ** 2) / 1.2) * K.lisse(0.4, 1.4, d)
    h += (K.bruit2(x * 0.9, y * 0.9, 13) - 0.5) * 0.12 * K.lisse(0.9, 2.4, d)
    return h


_TERRASSES = []


def sol(x, y):
    """La hauteur du terrain : le relief nu, aplani en terrasse sous chaque maison du hameau (et raccordé en douceur autour)."""
    d = bord(x, y)
    if d < 0:
        return max(-1.4, 0.45 * d)
    h = relief(x, y, d)
    if not _TERRASSES:
        _TERRASSES.extend(relief(mx, my, bord(mx, my)) for mx, my, *_ in MAISONS)
    for (mx, my, cap, lx, ly, _), h0 in zip(MAISONS, _TERRASSES):
        if abs(x - mx) + abs(y - my) > 3.0:
            continue
        c, s = math.cos(cap), math.sin(cap)
        dehors = max(abs((x - mx) * c + (y - my) * s) - lx / 2, abs(-(x - mx) * s + (y - my) * c) - ly / 2)
        if dehors < 0.7:
            h += (h0 - h) * K.lisse(0.7, 0.14, dehors)
    return h


def sol_monde(x, y):
    """La hauteur du sol une fois l'île tournée (ce que voient le contrôle du plan et le site)."""
    c, s = math.cos(CAP), math.sin(CAP)
    return sol(x * c + y * s, -x * s + y * c)


def orienter(lots, a=CAP):
    """Tourne toute l'île autour de son centre : les mailles (celles des marcheurs exceptées : le site les tourne lui-même
    le long de leur chemin), les origines, les axes, les chemins, les repères et le plan."""
    c, s = math.cos(a), math.sin(a)
    Rm = np.array(((c, -s, 0.0), (s, c, 0.0), (0.0, 0.0, 1.0)))
    pt = lambda p: (float(p[0] * c - p[1] * s), float(p[0] * s + p[1] * c), *[float(q) for q in p[2:]])

    def maille(Mm):
        Mm.v = [v @ Rm.T for v in Mm.v]
        return Mm

    def extras(e):
        if "axe" in e:
            e["axe"] = [round(float(q), 5) for q in Rm @ np.array(e["axe"])]
        for cle in ("chemin", "points"):
            if cle in e:
                q = e[cle]
                e[cle] = [x for k in range(0, len(q), 3) for x in pt(q[k:k + 3])]
        return e

    for Mm in (lots["corps"], lots["vitres"], lots["lumieres"]):
        maille(Mm)
    lots["animes"] = [(A if e.get("anim") == "marche" else maille(A), pt(o), extras(e)) for A, o, e in lots["animes"]]
    lots["copies"] = [(k, pt(o), extras(e)) for k, o, e in lots["copies"]]
    for cle in ("bannieres", "libres"):
        lots[cle] = [(maille(Mm), pt(o), extras(e)) for Mm, o, e in lots[cle]]
    lots["reperes"] = [(pt(q), extras(e)) for q, e in lots["reperes"]]
    plan = lots["plan"]
    plan["emprises"] = [(nom, [pt(q) for q in poly]) for nom, poly in plan["emprises"]]
    plan["sol"] = [(g, nom, [pt(q) for q in poly]) for g, nom, poly in plan["sol"]]
    plan["ponts"] = [[pt(q) for q in poly] for poly in plan["ponts"]]
    return lots


def vers(angle, dedans):
    """Un point dans cette direction (degrés, 90 = le nord), à cette distance du bord de l'eau (vers l'intérieur)."""
    a = math.radians(angle)
    r = rivage(a) - dedans
    return math.cos(a) * r, math.sin(a) * r


def dans_un_champ(x, y):
    """> 0 : dans un champ de blé (la distance à sa lisière) ; < 0 : dehors."""
    mieux = -9.0
    for cx, cy, lx, ly, an, _ in CHAMPS:
        c, s = math.cos(an), math.sin(an)
        u, w = (x - cx) * c + (y - cy) * s, -(x - cx) * s + (y - cy) * c
        mieux = max(mieux, min(lx / 2 - abs(u), ly / 2 - abs(w)))
    return mieux


def tx_sol_vents(taille=2048, graine=121):
    """Le sol peint pixel par pixel : la grève, l'herbe claire peignée par le vent (de longues mèches dans son sens), plus
    sèche et plus jaune sur les hauteurs et du côté du vent, la bruyère, la craie des falaises, le chaume doré sous les
    blés, la terre battue des chemins."""
    n = taille
    h = K.agrandir(K.champ(sol, R_SOL), n)
    d = K.agrandir(K.champ(bord, R_SOL), n)
    piste = K.agrandir(K.champ(lambda x, y: min((K.distance_au_trajet(x, y, p) for p in PISTES), default=9.0), R_SOL), n)
    cult = K.agrandir(K.champ(dans_un_champ, R_SOL), n)
    gy, gx = np.gradient(h)
    pente = np.hypot(gx, gy) * n / (2 * R_SOL)
    xs = ((np.arange(n) + 0.5) / n * 2 - 1) * R_SOL
    ouest = N.lisse(0.5, -4.0, xs[None, :] - 0.25 * xs[:, None])
    b1, b2, b3, fin = N.bruit(n, 7, 7, graine, 4), N.bruit(n, 28, 28, graine + 1, 3), N.bruit(n, 90, 90, graine + 2, 2), N.bruit(n, 256, 256, graine + 3, 1)
    grain = N.bruit(n, 640, 640, graine + 4, 1)
    peigne, meches = N.bruit(n, 30, 560, graine + 5, 2), N.bruit(n, 9, 150, graine + 6, 2)
    semis = np.random.default_rng(graine + 7).random((n, n)).astype(np.float32)
    rive, mouille = N.hexa(0xe8d8ae), N.hexa(0x9a957a)
    coul = np.broadcast_to(rive, (n, n, 3)).copy() * (0.9 + 0.12 * b1 + 0.06 * fin + 0.1 * (grain - 0.5) - 0.12 * (semis < 0.015))[..., None]
    coul = N.mel(coul, mouille * (0.88 + 0.18 * b2)[..., None], N.lisse(0.16, 0.02, h + (b2 - 0.5) * 0.06))
    herbe = N.hexa(0xa4c65a) * (0.8 + 0.3 * b2 + 0.14 * fin + 0.36 * (peigne - 0.5) + 0.22 * (meches - 0.5) + 0.1 * (grain - 0.5))[..., None]
    seche = N.hexa(0xd4cb78) * (0.82 + 0.3 * b3 + 0.34 * (peigne - 0.5) + 0.1 * (grain - 0.5))[..., None]
    expo = np.clip(N.lisse(0.9, 2.0, h + (b1 - 0.5) * 0.5) * 0.7 + ouest * 0.4, 0, 0.9)  # là où le vent brûle l'herbe
    herbe = N.mel(herbe, seche, expo)
    herbe = N.mel(herbe, N.hexa(0x6a9648) * (0.85 + 0.3 * b3)[..., None], N.lisse(0.62, 0.82, b2) * 0.5 * (1 - expo))
    bruy = N.hexa(0x9a5f9e) * (0.75 + 0.4 * b3 + 0.14 * (grain - 0.5))[..., None]  # la bruyère des hauteurs
    herbe = N.mel(herbe, bruy, N.lisse(0.56, 0.7, b1 * 0.6 + b2 * 0.4) * N.lisse(0.75, 1.3, h) * 0.8)
    herbe = N.mel(herbe, np.array([1.0, 0.97, 0.8], np.float32), ((semis > 0.992) & (h > 0.4)) * 0.8)  # des fleurs blanches
    coul = N.mel(coul, herbe, N.lisse(0.2, 0.36, h + (b2 - 0.5) * 0.12 + (b3 - 0.5) * 0.08))
    eteule = N.hexa(0xddb650) * (0.82 + 0.25 * b3 + 0.3 * (peigne - 0.5))[..., None]  # sous les blés et à leur lisière
    coul = N.mel(coul, eteule, N.lisse(-0.14, 0.04, cult + (b3 - 0.5) * 0.1))
    strate = 0.5 + 0.5 * np.sin((h * 5.5 + b1 * 2.4) * 2 * PI)
    roche = N.hexa(0xe6dfcc) * (0.74 + 0.22 * strate + 0.22 * b3 + 0.1 * (grain - 0.5))[..., None]
    coul = N.mel(coul, roche, N.lisse(0.85, 1.2, pente + (b3 - 0.5) * 0.25) * N.lisse(1.9, 1.1, d))  # la craie : seulement les falaises de la côte
    terre = N.hexa(0xb09668) * (0.84 + 0.28 * b3 + 0.14 * (grain - 0.5) - 0.14 * (semis < 0.02))[..., None]
    coul = N.mel(coul, terre, N.lisse(0.2, 0.07, piste + (b2 - 0.5) * 0.12) * N.lisse(0.18, 0.3, h))
    return np.clip(coul, 0, 1).astype(np.float32), np.clip(0.35 + 0.4 * b3 + 0.2 * fin, 0, 1).astype(np.float32)


N.matiere("sol_vents", tx_sol_vents, 2 * R_SOL, 0.35)


# ---------- les trajets ----------
def point_a(pts, s):
    """Le point d'un trajet à cette distance de son début."""
    for a, b in zip(pts[:-1], pts[1:]):
        l = math.dist(a, b)
        if s <= l and l > 1e-9:
            return tuple(a[i] + (b[i] - a[i]) * s / l for i in range(3))
        s -= l
    return tuple(pts[-1])


def troncon(pts, s0, s1):
    """Le morceau d'un trajet entre deux distances : pour que trois marcheurs se suivent de près sans jamais se rejoindre."""
    sortie, fait = [point_a(pts, s0)], 0.0
    for a, b in zip(pts[:-1], pts[1:]):
        fait += math.dist(a, b)
        if s0 + 0.02 < fait < s1 - 0.02:
            sortie.append(tuple(b))
    return sortie + [point_a(pts, s1)]


def longueur(pts):
    return sum(math.dist(a, b) for a, b in zip(pts[:-1], pts[1:]))


# ---------- les pièces ----------
VERS_LE_VENT = Rz(PI) @ Ry(PI / 2)  # une roue dessinée à plat (son axe : z, vers l'avant) se dresse face à l'ouest


def toile(A, v, faces, mat, M, recul=(0.0, 0.0, -0.012), zone=0):
    """Une toile fine : ses deux côtés (l'envers un cheveu derrière, pour qu'ils ne se battent pas à l'écran)."""
    dos = [(a + recul[0], b + recul[1], c + recul[2]) for a, b, c in v]
    A.ajouter(list(v) + dos, list(faces) + [tuple(len(v) + i for i in reversed(f)) for f in faces], mat, M, zone=zone)


def corde(L, a, b, fleche=0.035, ep=0.011):
    """Une corde entre deux points, un peu pendante."""
    m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2 - fleche)
    L.ajouter(*N.poutre(a, m, ep), "corde_vents")
    L.ajouter(*N.poutre(m, b, ep), "corde_vents")


def roue_a_voiles(A, R, M, voiles):
    """La roue du Grand Moulin : des antennes en étoile autour d'un beaupré, une voile triangulaire sur chacune, bordée à
    la pointe de la suivante et creusée par le vent ; des étais du beaupré aux pointes, un cordage qui fait le tour."""
    n = len(voiles)
    A.ajouter(*N.cylindre(0.11, 0.09, 0.3, 8), "fer", M @ T(0, 0, -0.2))
    A.ajouter(*N.poutre((0, 0, 0.05), (0, 0, 0.66), 0.05), "planches_sombres", M)
    pointes = [(math.cos(k * 2 * PI / n) * R, math.sin(k * 2 * PI / n) * R, 0.0) for k in range(n)]
    for k in range(n):
        a = k * 2 * PI / n
        c, s = math.cos(a), math.sin(a)
        A.ajouter(*N.poutre((c * 0.08, s * 0.08, 0), pointes[k], 0.042), "planches", M)
        A.ajouter(*N.poutre((0, 0, 0.64), pointes[k], 0.012), "corde_vents", M)
        A.ajouter(*N.poutre(pointes[k], pointes[(k + 1) % n], 0.012), "corde_vents", M)
        am = a + 0.86 * 2 * PI / n
        p0, p1, p2 = (c * R * 0.16, s * R * 0.16, -0.012), (c * R * 0.97, s * R * 0.97, -0.012), (math.cos(am) * R * 0.8, math.sin(am) * R * 0.8, -0.15)
        ventre = ((p0[0] + p1[0] + p2[0]) / 3, (p0[1] + p1[1] + p2[1]) / 3, -0.19)
        toile(A, [p0, p1, p2, ventre], [(0, 1, 3), (1, 2, 3), (2, 0, 3)], voiles[k], M)
        A.ajouter(*N.poutre(p2, pointes[(k + 1) % n], 0.01), "corde_vents", M)


def ailes(A, R, M, larg=0.25):
    """Quatre ailes de moulin : une verge, son treillis de lattes, la toile tendue dessus (vrillée : plus couchée au bout)."""
    A.ajouter(*N.cylindre(0.07, 0.06, 0.2, 7), "fer", M @ T(0, 0, -0.12))
    for k in range(4):
        Mk = M @ Rz(k * PI / 2 + 0.35)
        x0, x1 = R * 0.22, R * 0.98
        A.ajouter(*N.poutre((0, 0, 0), (R, 0, 0), 0.036), "planches_sombres", Mk)
        toile(A, [(x0, 0.018, -0.012), (x1, 0.018, -0.008), (x1, larg, -0.055), (x0, larg, -0.032)], [(0, 1, 2, 3)], "toile_ecrue", Mk)
        A.ajouter(*N.poutre((x0, larg, -0.03), (x1, larg, -0.05), 0.016), "planches", Mk)
        for j in range(6):
            xx = x0 + (x1 - x0) * j / 5
            A.ajouter(*N.poutre((xx, 0.0, 0.0), (xx, larg + 0.012, -0.028 - 0.02 * j / 5), 0.014), "planches", Mk)


def rosette(A, R, M, nb=10):
    """La roue d'une éolienne de pompage : des pales de bois inclinées, cerclées de fer."""
    A.ajouter(*N.cylindre(0.035, 0.03, 0.08, 6), "fer", M @ T(0, 0, -0.04))
    for k in range(nb):
        Mk = M @ Rz(k * 2 * PI / nb)
        toile(A, [(R * 0.2, -0.012, 0.0), (R, -R * 0.2, 0.025), (R, R * 0.2, -0.025), (R * 0.2, 0.012, 0.0)], [(0, 1, 2, 3)], "planches_claires", Mk, (0, 0, -0.008))
        a, b = k * 2 * PI / nb, (k + 1) * 2 * PI / nb
        A.ajouter(*N.poutre((math.cos(a) * R * 0.97, math.sin(a) * R * 0.97, 0), (math.cos(b) * R * 0.97, math.sin(b) * R * 0.97, 0), 0.012), "fer", M)


def moulinet(A, M, r=0.085):
    """Un moulinet d'enfant : quatre ailettes de toile de couleur autour d'un clou doré."""
    for k, mat in enumerate(("vif_rose", "vif_or", "vif_turquoise", "vif_violet")):
        toile(A, [(0, 0, 0.004), (r, 0, 0.004), (r * 0.55, r * 0.55, 0.022)], [(0, 1, 2)], mat, M @ Rz(k * PI / 2), (0, 0, -0.006))
    A.ajouter(*N.sphere(0.012, 5, 3), "or", M)


def cerf_volant(nom, d, mat, noeuds, env=0.56):
    """Un cerf-volant au bout de son fil (l'origine : là où le fil est tenu ; d : où vole le cerf-volant). Un losange, le nez
    en l'air, face à celui qui le tient ; sa bride, sa longue queue à nœuds que le vent emporte vers l'est."""
    A = N.Maille(nom)
    c = np.array(d, np.float64)
    u = c / np.linalg.norm(c)
    cote = np.cross(u, (0, 0, 1.0))
    cote /= np.linalg.norm(cote)
    haut = np.cross(cote, u)
    axe = haut * math.cos(0.45) + u * math.sin(0.45)  # il se couche un peu sur le vent
    nez, queue = c + axe * env * 0.55, c - axe * env * 0.78
    g, dr = c + cote * env * 0.44 + axe * env * 0.1, c - cote * env * 0.44 + axe * env * 0.1
    dos = u * 0.012
    A.ajouter([tuple(nez), tuple(g), tuple(queue), tuple(dr)] + [tuple(p + dos) for p in (nez, g, queue, dr)], [(0, 1, 2, 3), (7, 6, 5, 4)], mat)
    A.ajouter(*N.poutre(nez - dos, queue - dos, 0.014), "planches_sombres")
    A.ajouter(*N.poutre(g - dos, dr - dos, 0.014), "planches_sombres")
    attache = c - u * env * 0.5
    for p in (c + axe * env * 0.3, c - axe * env * 0.4):
        A.ajouter(*N.poutre(p - dos, attache, 0.008), "corde_vents")
    A.ajouter(*N.poutre((0, 0, 0), attache, 0.011), "corde_vents")
    p = queue
    for k in range(len(noeuds)):  # la queue : elle part vers l'est en ondulant, un nœud de couleur à chaque brasse
        q = p + np.array((0.17, 0.05 * math.sin(k * 1.9), -0.075 + 0.03 * math.cos(k * 1.3)))
        A.ajouter(*N.poutre(p, q, 0.007), "corde_vents")
        for s in (-1, 1):
            toile(A, [tuple(q), tuple(q + np.array((0.02, s * 0.055, 0.03))), tuple(q + np.array((0.02, s * 0.055, -0.03)))], [(0, 1, 2)], noeuds[k], None, (0.008, 0, 0), zone=(1.0, 0.35, 1.0))
        p = q
    return A


def maisonnette(L, V, U, rng, x, y, z, cap, lx=1.15, ly=0.82, mur="pierres_claires", fin=True):
    """Une maison basse du hameau, le faîte dans le sens du vent : des murs de pierre sur un soubassement, un toit de chaume
    tenu par des cordes lestées de pierres, la cheminée au pignon du vent, la porte (et sa lanterne) au pignon abrité, deux
    petites fenêtres. Renvoie le haut de sa cheminée (pour la fumée)."""
    M = T(x, y, z - 0.07) @ Rz(cap)
    z0, hm, ht = 0.06, 0.4, 0.4
    L.ajouter(*N.boite(lx + 0.08, ly + 0.08, 0.3), "pierres", M @ T(0, 0, -0.22))
    L.ajouter(*N.boite(lx, ly, hm, haut=False), mur, M @ T(0, 0, z0))
    L.ajouter(*N.pignons(lx, ly, ht), mur, M @ T(0, 0, z0 + hm))
    L.ajouter(*N.toit_pignon(lx, ly, ht, 0.1, 0.09), "chaume", M @ T(0, 0, z0 + hm), tourne=True)
    zf = z0 + hm + ht + 0.085
    L.ajouter(*N.poutre((-lx / 2 - 0.1, 0, zf), (lx / 2 + 0.1, 0, zf), 0.15, 0.07), "chaume", M)
    for sx in (-1, 1):
        for sy in (-1, 1):
            L.ajouter(*N.poutre((sx * (lx / 2 + 0.085), -sy * 0.1, zf - 0.08), (sx * (lx / 2 + 0.085), sy * 0.1, zf + 0.13), 0.022), "planches_sombres", M)
    pente = ht / (ly / 2)
    nb = 3 if fin else 2
    for kx in range(nb):  # les cordes par-dessus le toit, une pierre pendue à chaque bout
        xx = -lx / 2 + lx * (kx + 0.5) / nb
        for sy in (-1, 1):
            bas = (xx, sy * (ly / 2 + 0.115), z0 + hm - 0.115 * pente + 0.09)
            L.ajouter(*N.poutre((xx, 0, zf + 0.03), bas, 0.014), "corde_vents", M)
            L.ajouter(*N.poutre(bas, (xx, bas[1], bas[2] - 0.13), 0.012), "corde_vents", M)
            L.ajouter(*N.boite(0.075, 0.06, 0.06, bas=True), "roche", M @ T(xx, bas[1], bas[2] - 0.19) @ Rz(kx + sy))
    xd = lx / 2 + 0.006
    L.ajouter(*N.quad((xd, -0.12, z0), (xd, 0.12, z0), (xd, 0.12, z0 + 0.36), (xd, -0.12, z0 + 0.36)), "porte", M)
    L.ajouter(*N.boite(0.05, 0.32, 0.04), "planches_sombres", M @ T(lx / 2 + 0.02, 0, z0 + 0.36))
    L.ajouter(*N.boite(0.18, 0.34, 0.05), "pierres_sombres", M @ T(lx / 2 + 0.1, 0, z0 - 0.045))
    L.ajouter(*N.poutre((lx / 2 + 0.01, 0.2, z0 + 0.38), (lx / 2 + 0.1, 0.2, z0 + 0.38), 0.018), "fer", M)
    U.ajouter(*N.sphere(0.034, 6, 4), "lumiere", M @ T(lx / 2 + 0.1, 0.2, z0 + 0.33))
    P.fenetre(L, V, rng, M @ T(0, -ly / 2, 0), -0.1, z0 + 0.14, 0.2, 0.2, volets="peint_bleu", allumee=True)
    P.fenetre(L, V, rng, M @ Rz(PI) @ T(0, -ly / 2, 0), 0.12, z0 + 0.14, 0.2, 0.2, allumee=rng.random() < 0.7)
    xc, hc = -lx / 2 + 0.16, hm + ht + 0.24
    L.ajouter(*N.boite(0.2, 0.22, hc), "pierres_sombres", M @ T(xc, 0, z0))
    L.ajouter(*N.boite(0.26, 0.28, 0.04, bas=True), "pierres", M @ T(xc, 0, z0 + hc))
    return (M @ np.array((xc, 0, z0 + hc + 0.12, 1)))[:3]


def moulin_pivot(L, V, x, y, z):
    """Un moulin à pivot : une cage de planches juchée sur un trépied de chêne, le toit à deux pentes, l'arbre au pignon du
    vent, la porte et son échelle au pignon abrité, une lucarne éclairée. Renvoie (le moyeu, le faîte)."""
    M = T(x, y, z)
    for sx in (-1, 1):
        for sy in (-1, 1):
            L.ajouter(*N.poutre((sx * 0.46, sy * 0.46, -0.06), (sx * 0.1, sy * 0.1, 0.64), 0.06), "planches_sombres", M)
    for s in (-1, 1):
        L.ajouter(*N.poutre((-0.56, -0.56 * s, 0.02), (0.56, 0.56 * s, 0.02), 0.07), "planches_sombres", M)
    L.ajouter(*N.cylindre(0.085, 0.075, 0.86, 7), "poutre", M @ T(0, 0, -0.1))
    zc, lx, ly, hc, ht = 0.66, 0.82, 0.62, 0.92, 0.36
    L.ajouter(*N.boite(lx, ly, hc, bas=True, haut=False), "planches", M @ T(0, 0, zc), tourne=True)
    L.ajouter(*N.pignons(lx, ly, ht), "planches", M @ T(0, 0, zc + hc), tourne=True)
    L.ajouter(*N.toit_pignon(lx, ly, ht, 0.07, 0.045), "bardeaux", M @ T(0, 0, zc + hc), tourne=True)
    zh = zc + hc + 0.02
    L.ajouter(*N.poutre((-lx / 2 + 0.05, 0, zh), (-lx / 2 - 0.16, 0, zh), 0.09), "planches_sombres", M)
    xd = lx / 2 + 0.006
    L.ajouter(*N.quad((xd, -0.1, zc + 0.03), (xd, 0.1, zc + 0.03), (xd, 0.1, zc + 0.4), (xd, -0.1, zc + 0.4)), "porte", M)
    for s in (-1, 1):
        L.ajouter(*N.poutre((lx / 2 + 0.02, s * 0.12, zc + 0.02), (lx / 2 + 0.62, s * 0.12, -0.03), 0.035), "planches_sombres", M)
    for k in range(5):
        t = (k + 0.5) / 5
        L.ajouter(*N.poutre((lx / 2 + 0.02 + 0.6 * t, -0.12, (zc + 0.02) * (1 - t)), (lx / 2 + 0.02 + 0.6 * t, 0.12, (zc + 0.02) * (1 - t)), 0.03, 0.02), "planches", M)
    V.ajouter(*N.boite(0.16, 0.03, 0.16), "vitre", M @ T(0.05, -ly / 2 - 0.002, zc + 0.5))
    L.ajouter(*N.boite(0.22, 0.03, 0.22), "planches_sombres", M @ T(0.05, -ly / 2 + 0.004, zc + 0.47))
    return (x - lx / 2 - 0.2, y, z + zh), (x, y, z + zc + hc + ht + 0.04)


def moulin_de_pierre(L, V, x, y, z):
    """Un petit moulin-tour de pierre coiffé de chaume : sa porte sous le vent, une fenêtre éclairée. Renvoie (le moyeu, le faîte)."""
    M = T(x, y, z)
    L.ajouter(*N.cylindre(0.48, 0.34, 1.95, 10, haut=False), "pierres", M @ T(0, 0, -0.2))
    L.ajouter(*N.toit_pointe(0.36, 0.52, 10, 0.08, 0), "chaume", M @ T(0, 0, 1.75), tourne=True)
    L.ajouter(*N.boite(0.08, 0.3, 0.46), "pierres_sombres", M @ T(0.42, 0, -0.04))
    L.ajouter(*N.quad((0.466, -0.1, 0.0), (0.466, 0.1, 0.0), (0.466, 0.1, 0.38), (0.466, -0.1, 0.38)), "porte", M)
    V.ajouter(*N.boite(0.13, 0.03, 0.16), "vitre", M @ T(0, -0.405, 0.9))
    L.ajouter(*N.boite(0.19, 0.04, 0.22), "planches_sombres", M @ T(0, -0.39, 0.87))
    L.ajouter(*N.poutre((-0.2, 0, 1.87), (-0.52, 0, 1.87), 0.08), "planches_sombres", M)
    return (x - 0.56, y, z + 1.87), (x, y, z + 2.3)


COINS = ((-1, -1), (1, -1), (1, 1), (-1, 1))


def eolienne(L, x, y, z, h=1.3):
    """Une éolienne de pompage : un pylône de bois à quatre pieds, l'axe et sa queue rouge (qui la tient face au vent), la
    tringle de la pompe, un abreuvoir de pierre. Renvoie la place de sa roue."""
    M = T(x, y, z)
    for sx, sy in COINS:
        L.ajouter(*N.poutre((sx * 0.2, sy * 0.2, -0.05), (sx * 0.05, sy * 0.05, h), 0.035), "planches_grises", M)
    for t in (0.33, 0.68):
        r = 0.2 - 0.15 * t
        for k in range(4):
            a, b = COINS[k], COINS[(k + 1) % 4]
            L.ajouter(*N.poutre((a[0] * r, a[1] * r, h * t), (b[0] * r, b[1] * r, h * t), 0.025), "planches_grises", M)
    L.ajouter(*N.boite(0.16, 0.16, 0.03), "planches_sombres", M @ T(0, 0, h))
    L.ajouter(*N.poutre((-0.14, 0, h + 0.07), (0.42, 0, h + 0.07), 0.03), "planches_sombres", M)
    toile(L, [(0.24, -0.006, h - 0.04), (0.47, -0.006, h - 0.07), (0.47, -0.006, h + 0.21), (0.24, -0.006, h + 0.18)], [(0, 1, 2, 3)], "peint_rouge", M, (0, 0.012, 0))
    L.ajouter(*N.poutre((0, 0, 0), (0, 0, h), 0.015), "fer", M)
    L.ajouter(*N.boite(0.46, 0.2, 0.11), "pierres", M @ T(0.45, 0, -0.03))
    return (x - 0.18, y, z + h + 0.07)


def arbre_vent(L, rng, x, y, z, h=1.5, fin=True):
    """Un arbre que le vent d'ouest a couché : son tronc penche vers l'est, sa couronne s'étire en drapeau (de petites
    touffes bosselées, de plus en plus fines vers la pointe, qui bougent d'autant plus qu'elles sont loin du tronc)."""
    M = T(x, y, z) @ Rz((rng.random() - 0.5) * 0.5)
    tronc = [(0, 0, -0.2), (0.06 * h, 0, 0.28 * h), (0.2 * h, 0.02 * h, 0.52 * h), (0.42 * h, 0, 0.7 * h)]
    L.ajouter(*N.tube(tronc, [0.07 * h, 0.05 * h, 0.036 * h, 0.02 * h], 6, bouts=False), "ecorce_vents", M, tourne=True)
    nb = 8 if fin else 5
    for k in range(nb):
        t = k / (nb - 1)
        cx = (0.3 + 0.82 * t) * h + (rng.random() - 0.5) * 0.08 * h
        cy = (rng.random() - 0.5) * 0.36 * h * (1 - 0.6 * t)
        cz = (0.74 + 0.2 * t - 0.14 * t * t) * h + (rng.random() - 0.5) * 0.08 * h
        rk = h * (0.21 - 0.1 * t) * (0.85 + 0.3 * rng.random())
        v, f = N.sphere(rk, 7, 4, 0.85)
        g = rng.random() * 9
        v = [(a * q * 1.25, b * q, c * q) for (a, b, c) in v for q in [1 + 0.24 * math.sin(a / rk * 4.3 + g) * math.sin(b / rk * 3.7 + g * 1.7) * math.sin(c / rk * 5.1 + g * 0.6)]]
        L.ajouter(v, f, ("feuillage_vent", "feuillage_vent_clair", "feuillage_vent")[k % 3], M @ T(cx, cy, cz) @ Ry(0.2) @ Rz(g), zone=(1.0, round(0.66 - 0.24 * t, 2), 1.0))
        if k in (1, 3, 5):
            L.ajouter(*N.tube([tronc[2 if k < 3 else 3], (cx * 0.92, cy, cz - rk * 0.35)], [0.028 * h, 0.012 * h], 4, bouts=False), "ecorce_vents", M)


def herbes(L, rng, x, y, z, nb=5):
    """Une touffe d'herbes hautes : quelques brins effilés, couchés vers l'est, que le vent secoue."""
    for k in range(nb):
        a, dd, hh = rng.random() * 6.28, rng.random() * 0.13, 0.17 + rng.random() * 0.15
        px, py = x + math.cos(a) * dd, y + math.sin(a) * dd
        L.ajouter(*N.tube([(px, py, z - 0.02), (px + hh * 0.3, py, z + hh * 0.62), (px + hh * 0.85, py, z + hh)], [0.02, 0.014, 0.003], 3, bouts=False), "herbe_haute", zone=(0.75, 0.42, 1.0))


def meule(L, rng, x, y, z, r=0.26):
    """Une meule de foin : un dôme de paille autour de sa perche."""
    L.ajouter(*N.cylindre(r, r * 0.86, r * 0.75, 9, haut=False), "ble", T(x, y, z - 0.04), tourne=True)
    L.ajouter(*N.cylindre(r * 0.92, 0.03, r * 0.95, 9, haut=False), "ble", T(x, y, z - 0.04 + r * 0.75), tourne=True)
    L.ajouter(*N.cylindre(0.014, 0.01, r * 0.5, 4), "planches_sombres", T(x, y, z + r * 1.55))


def mouton(L, rng, x, y, z, cap, broute=False):
    M = T(x, y, z) @ Rz(cap)
    v, f = N.sphere(0.075, 7, 5, 0.82)
    L.ajouter([(a * 1.35, b, c) for a, b, c in v], f, "laine", M @ T(0, 0, 0.115))
    L.ajouter(*N.sphere(0.034, 6, 4, 1.1), "tissu_sombre", M @ T(0.12, 0, 0.06 if broute else 0.135))
    for sx in (-0.055, 0.055):
        for sy in (-0.03, 0.03):
            L.ajouter(*N.boite(0.016, 0.016, 0.075), "tissu_sombre", M @ T(sx, sy, 0.0))


def rocher(L, rng, x, y, z, r=0.25, mat="roche_claire"):
    v, f = N.sphere(r, 6, 4, 0.7)
    g = rng.random() * 9
    v = [(a * q, b * q, c * q) for (a, b, c) in v for q in [1 + 0.25 * math.sin(a / r * 3.1 + g) * math.sin(b / r * 2.7 + g * 1.3) + 0.12 * math.sin(c / r * 6 + g)]]
    L.ajouter(v, f, mat, T(x, y, z + r * 0.2) @ Rz(g))


def muret(L, rng, pts, h=0.27, ep=0.14):
    """Un mur de pierres sèches le long de ces points : des blocs inégaux, des pierres plates posées dessus. Renvoie ses
    emprises (un rectangle par tronçon)."""
    emp, total, pas = [], longueur([(*p, 0.0) for p in pts]), 0.17
    nb = max(2, int(total / pas))
    for k in range(nb):
        a, b = point_a([(*p, 0.0) for p in pts], total * k / nb), point_a([(*p, 0.0) for p in pts], total * (k + 1) / nb)
        mx, my, cap = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, math.atan2(b[1] - a[1], b[0] - a[0])
        hh = h * (0.82 + 0.36 * rng.random())
        L.ajouter(*N.boite(pas + 0.03, ep * (0.9 + 0.25 * rng.random()), hh + 0.1), ("pierres", "pierres_sombres", "pierres", "pierres_claires")[k % 4], T(mx, my, sol(mx, my) - 0.1) @ Rz(cap + (rng.random() - 0.5) * 0.12))
        if k % 3 != 1:
            L.ajouter(*N.boite(0.12, ep * 0.8, 0.045), "pierres_sombres", T(mx, my, sol(mx, my) + hh - 0.005) @ Rz(cap + (rng.random() - 0.5) * 0.5))
        emp.append(Vf.rectangle(mx, my, pas + 0.03, ep + 0.04, cap))
    return emp


def nappe(L, cx, cy, lx, ly, angle, mat="ble", haut=0.11, pas=0.2, onde=0.42):
    """Un champ : une nappe d'épis au-dessus du sol, qui épouse le relief (ses bords redescendent à terre). Le site y fait
    courir la houle du vent (le rouge de sa couleur de sommet : voir VENT5 dans js/grandline-3d.js)."""
    nx, ny = max(2, round(lx / pas)), max(2, round(ly / pas))
    c, s = math.cos(angle), math.sin(angle)
    ech = N.MATIERES[mat]["taille"]
    v, uv, f = [], [], []
    for j in range(ny + 1):
        for i in range(nx + 1):
            u, w = -lx / 2 + lx * i / nx, -ly / 2 + ly * j / ny
            x, y = cx + c * u - s * w, cy + s * u + c * w
            lisiere = i in (0, nx) or j in (0, ny)
            v.append((x, y, sol(x, y) + (-0.03 if lisiere else haut * (0.8 + 0.4 * K.bruit2(x * 3, y * 3, 5)))))
            uv.append((x / ech, y / ech))
    for j in range(ny):
        for i in range(nx):
            a = j * (nx + 1) + i
            f.append((a, a + 1, a + nx + 2, a + nx + 1))
    debut = len(L.f)
    L.ajouter(v, f, mat, uv=uv, zone=(round(1 - onde, 2), 0.88, 1.0))
    L.regrouper(debut, None, 1, 0.8)


def flamme(lots, x, y, z, long=0.9, couleur="rose", haut=0.17):
    """Une flamme (un long fanion en pointe) qui claque à l'horizontale, vers l'est : un objet à part, que le site agite."""
    B = N.Maille()
    n = 5
    v = []
    for k in range(n + 1):
        t = k / n
        yy = math.sin(t * PI * 1.6) * 0.045 * t
        v += [(0.02 + long * t, yy, haut / 2 * (1 - t) - 0.05 * t * t), (0.02 + long * t, yy, -haut / 2 * (1 - t) - 0.05 * t * t)]
    B.ajouter(v, [(k * 2 + 1, k * 2 + 3, k * 2 + 2, k * 2) for k in range(n)], "fanion_" + couleur)
    lots["bannieres"].append((B, (x, y, z), {"anim": "flamme", "phase": (x * 3 + y) % 6.28}))


def mailles(graine=89, leger=False):
    """leger : la version téléphone (un relief moins fin, moins de maisons, d'arbres et de moulins, trois marcheurs)."""
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
    lots["etapes"] = []  # (ce qu'on commence, le nombre de triangles du corps à ce moment-là) : pour savoir où va le poids
    etape = lambda nom: lots["etapes"].append((nom, L.triangles()))

    # --- le plan : le ponton, la porte du Grand Moulin, la corde de vie, les chemins (rien d'autre ne s'y pose) ---
    ac = math.degrees(CRIQUE)
    pa, pb = np.array(vers(ac, 0.7)), np.array(vers(ac, -2.3))  # le ponton : de la grève vers le large
    dp = (pb - pa) / np.linalg.norm(pb - pa)
    cote_p = np.array((-dp[1], dp[0]))  # vers l'est
    lg, ZQ = float(np.linalg.norm(pb - pa)), 0.4
    cap_porte = math.atan2(PUITS[1] - SOMMET[1], PUITS[0] - SOMMET[0])  # la porte du Grand Moulin regarde le hameau
    seuil = (SOMMET[0] + math.cos(cap_porte) * 1.1, SOMMET[1] + math.sin(cap_porte) * 1.1)
    z = lambda p: (p[0], p[1], sol(p[0], p[1]) + 0.02)
    arc = lambda a0, a1, dedans, pas=3: [z(vers(a, dedans)) for a in np.arange(a0, a1 + 0.01, pas)]
    terre = lambda pts: K.suivre(pts, sol)
    etapes = [tuple(pa - dp * 0.3), (0.05, -1.9), (-0.7, -0.75), (0.75, -0.3), (-0.3, 0.3), seuil]  # la corde de vie, à terre : elle monte en lacets
    monte = terre(etapes)
    ligne = [(*(pa + dp * (lg - 0.85)), ZQ + 0.02), (*(pa + dp * 0.5), ZQ + 0.02)] + monte
    ECART = 0.15  # ils se tiennent : trois marcheurs sur le même trajet, à un pas l'un de l'autre
    total = longueur(ligne)
    pivot_a = (BUTTE[0] + 1.15, BUTTE[1] - 0.2)  # le pied de l'échelle du moulin de l'ouest
    vers_butte = terre([(-1.1, -0.5), (-2.0, -0.3), pivot_a])
    lb = longueur(vers_butte)
    chemins = [  # (points, en rond, vitesse, départ, pause) ; les trois premiers (ceux qui se tiennent) suffisent au téléphone
        (troncon(ligne, 2 * ECART, total), False, 0.15, 0.0, 3.0),
        (troncon(ligne, ECART, total - ECART), False, 0.15, 0.002, 3.0),
        (troncon(ligne, 0.0, total - 2 * ECART), False, 0.15, 0.004, 3.0),
        (troncon(vers_butte, ECART, lb), False, 0.14, 0.45, 3.5),
        (troncon(vers_butte, 0.0, lb - ECART), False, 0.14, 0.452, 3.5),
        (arc(-36, 2, 0.7), False, 0.3, 0.2, 1.5),  # un enfant qui court sur la grève de l'est
        (terre([(5.38, 0.25), (5.12, 0.98), (2.75, 0.9)]), False, 0.16, 0.7, 3.0),  # du moulin de pierre au bout du champ
    ]
    couloirs = [(pts, 0.07) for pts, *_ in chemins]

    def libre(x, y, r, pente=9.0):
        """Cette place (un objet de rayon r) est-elle à terre, hors des passages et loin de ce qui est déjà posé ?"""
        if sol(x, y) < 0.14 or any(K.distance_au_trajet(x, y, pts) < r + rc + 0.04 for pts, rc in couloirs):
            return False
        if pente < 9 and abs(sol(x + 0.2, y) - sol(x - 0.2, y)) + abs(sol(x, y + 0.2) - sol(x, y - 0.2)) > pente * 0.4:
            return False
        return all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for _, _, p in SOL)

    etape("le terrain")
    # --- le terrain (d'un seul tenant, à sommets partagés) ; l'herbe rase reçoit un peu de la houle du vent ---
    n, R = (52 if leger else 68), R_SOL
    xs = [-R + 2 * R * i / n for i in range(n + 1)]
    H = [[sol(x, y) for x in xs] for y in xs]
    PISTES[:] = [monte, vers_butte, chemins[6][0]]
    rang, sommets, uvs, faces = {}, [], [], []

    def sommet(i, j):
        if (i, j) not in rang:
            rang[(i, j)] = len(sommets)
            sommets.append((xs[i], xs[j], H[j][i]))
            uvs.append(((xs[i] + R) / (2 * R), (xs[j] + R) / (2 * R)))
        return rang[(i, j)]

    pas = 2 * R / n
    herbes_ici = {}

    def herbe(i, j):
        """Ce sommet du terrain est-il dans l'herbe (1) ? Ni la grève, ni une pente raide, ni un chemin : la houle du vent
        n'y court pas. Donné par sommet, pour un dégradé sans marches d'une face à l'autre."""
        if (i, j) not in herbes_ici:
            x, y, h = xs[i], xs[j], H[j][i]
            raide = math.hypot(H[j][min(n, i + 1)] - H[j][max(0, i - 1)], H[min(n, j + 1)][i] - H[max(0, j - 1)][i]) / (2 * pas)
            herbes_ici[(i, j)] = 0.0 if h < 0.3 else K.lisse(0.36, 0.62, h) * K.lisse(0.8, 0.5, raide) * K.lisse(0.12, 0.36, min(K.distance_au_trajet(x, y, p) for p in PISTES))
        return herbes_ici[(i, j)]

    houle = []
    for j in range(n):
        for i in range(n):
            coins = (H[j][i], H[j][i + 1], H[j + 1][i + 1], H[j + 1][i])
            if max(coins) < -0.25:
                continue
            faces.append((sommet(i, j), sommet(i + 1, j), sommet(i + 1, j + 1), sommet(i, j + 1)))
            houle.append([(round(1 - 0.3 * herbe(a, b), 3), 1.0, 1.0) for a, b in ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))])
    L.ajouter(sommets, faces, "sol_vents", uv=uvs)
    for k, coins in enumerate(houle):
        if min(c[0] for c in coins) < 0.995:
            L.zones[k] = coins
    L.regrouper(0, None, 4, 0.75)

    etape("le ponton de la crique")
    # --- le ponton de la crique, le caboteur à l'abri le long de lui, une barque, la manche à air ---
    Rf.tablier(L, tuple(pa), tuple(pb), ZQ, ZQ, 0.5)
    for k in range(int(lg / 0.6) + 1):
        for s in (-1, 1):
            q = pa + dp * (0.2 + k * 0.6) + cote_p * s * 0.22
            L.ajouter(*N.cylindre(0.04, 0.035, 1.3, 6, haut=False), "planches_sombres", T(q[0], q[1], -0.85))
    ponts.append(Vf.rectangle(*(pa + dp * lg / 2), lg, 0.5, math.atan2(dp[1], dp[0])))
    emprises.append(("le ponton", ponts[0]))
    P.tonneau(L, T(*(pa + dp * (lg - 0.25) - cote_p * 0.13), ZQ))
    P.caisse(L, T(*(pa + dp * (lg - 0.55) - cote_p * 0.14), ZQ) @ Rz(0.3), 0.15)
    nav = pa + dp * (lg - 1.0) + cote_p * 0.86
    cap_n = math.atan2(-dp[1], -dp[0])  # la proue vers la grève
    P.caboteur(L, V, rng, nav[0], nav[1], cap_n, 2.3, "toile_ecrue", "peint_bleu")
    emprises.append(("le caboteur", Vf.rectangle(nav[0], nav[1], 2.3, 2.3 * 0.34, cap_n)))
    brq = pa + dp * 1.55 - cote_p * 0.6
    n0 = len(L.v)
    P.barque(L, rng, brq[0], brq[1], cap_n + 0.2, 0.85)
    for k in range(n0, len(L.v)):  # une barque vide flotte haut : sinon la houle du site la recouvre
        L.v[k] = L.v[k] + (0.0, 0.0, 0.05)
    emprises.append(("la barque", Vf.rectangle(brq[0], brq[1], 0.85, 0.34, cap_n + 0.2)))
    bout = pa + dp * (lg - 0.12) + cote_p * 0.17
    L.ajouter(*N.cylindre(0.024, 0.018, 1.25, 5), "planches_sombres", T(bout[0], bout[1], ZQ))
    U.ajouter(*N.sphere(0.04, 6, 4, 1.2), "lumiere", T(bout[0] - 0.07, bout[1], ZQ + 0.62))
    L.ajouter(*N.poutre((bout[0], bout[1], ZQ + 0.7), (bout[0] - 0.07, bout[1], ZQ + 0.7), 0.014), "fer")
    for k, (r0, r1, mat) in enumerate(((0.075, 0.062, "toile_rose"), (0.062, 0.048, "toile_ecrue"), (0.048, 0.03, "toile_rose"))):  # la manche à air
        L.ajouter(*N.cylindre(r0, r1, 0.17, 7, haut=False), mat, T(bout[0] + 0.03 + 0.165 * k, bout[1], ZQ + 1.17 - 0.012 * k * k) @ Ry(PI / 2 + 0.07 * k), zone=(1.0, round(0.62 - 0.14 * k, 2), 1.0))

    etape("le hameau")
    # --- le hameau : des maisons basses, le dos au vent, derrière leur grand mur de pierres sèches ; le puits, le linge ---
    maisons = MAISONS
    for x, y, cap, lx, ly, mur in maisons[:3 if leger else 4]:
        fumees.append(maisonnette(L, V, U, rng, x, y, sol(x, y) + 0.03, cap, lx, ly, mur, not leger))
        SOL.append(("decor", "une maison du hameau", Vf.rectangle(x, y, lx + 0.14, ly + 0.2, cap)))
    for k, e in enumerate(muret(L, rng, [(-3.5, -0.5), (-3.95, -0.95), (-4.2, -1.8), (-3.95, -2.7), (-3.25, -3.35)], 0.25)):
        SOL.append(("rocher", "le grand mur", e))
    zp = sol(*PUITS)  # le puits : une margelle ronde, deux montants, un petit toit, le treuil et son seau
    Mp = T(PUITS[0], PUITS[1], zp)
    L.ajouter(*N.cylindre(0.17, 0.16, 0.2, 9), "pierres", Mp @ T(0, 0, -0.04))
    L.ajouter(*N.cylindre(0.12, 0.12, 0.02, 8), "tissu_sombre", Mp @ T(0, 0, 0.145))
    for s in (-1, 1):
        L.ajouter(*N.poutre((0, s * 0.15, 0.1), (0, s * 0.15, 0.52), 0.03), "planches_sombres", Mp)
    L.ajouter(*N.poutre((0, -0.17, 0.4), (0, 0.17, 0.4), 0.03), "planches", Mp)
    L.ajouter(*N.toit_pignon(0.3, 0.44, 0.12, 0.03, 0.025), "bardeaux", Mp @ T(0, 0, 0.52) @ Rz(PI / 2))
    L.ajouter(*N.poutre((0, 0.04, 0.4), (0, 0.04, 0.24), 0.008), "corde_vents", Mp)
    L.ajouter(*N.cylindre(0.03, 0.036, 0.05, 6), "planches", Mp @ T(0, 0.04, 0.19))
    SOL.append(("dur", "le puits", Vf.rond(PUITS[0], PUITS[1], 0.24)))
    la, lb_ = (-0.86, -2.92), (-0.84, -2.2)  # la corde à linge : le vent couche tout vers l'est
    for q in (la, lb_):
        L.ajouter(*N.cylindre(0.02, 0.016, 0.5, 5), "planches_sombres", T(q[0], q[1], sol(*q) - 0.05))
        SOL.append(("rocher", "un piquet du linge", Vf.rond(q[0], q[1], 0.05)))
    zl = (sol(*la) + sol(*lb_)) / 2 + 0.42
    L.ajouter(*N.poutre((*la, zl), (*lb_, zl), 0.009), "corde_vents")
    for k, (mat, larg, long) in enumerate((("tissu_creme", 0.16, 0.2), ("tissu_rouge", 0.1, 0.14), ("toile_ecrue", 0.2, 0.22), ("tissu_bleu", 0.1, 0.15))[:3 if leger else 4]):
        yy = la[1] + 0.1 + k * 0.165
        toile(L, [(la[0], yy, zl), (la[0], yy + larg * 0.8, zl), (la[0] + long * 0.82, yy + larg * 0.8, zl - long * 0.55), (la[0] + long * 0.82, yy, zl - long * 0.6)], [(0, 3, 2, 1)], mat, None, (0, 0, -0.008), zone=(1.0, 0.4, 1.0))
    SOL.append(("rocher", "le linge", Vf.rectangle(-0.76, -2.56, 0.24, 0.7)))
    fa, fb = (0.05, -3.35), (0.0, -2.78)  # les filets qui sèchent près de la grève, gonflés par le vent
    for q in (fa, fb):
        L.ajouter(*N.cylindre(0.02, 0.016, 0.52, 5), "planches_sombres", T(q[0], q[1], sol(*q) - 0.05))
    zf = (sol(*fa) + sol(*fb)) / 2 + 0.44
    L.ajouter(*N.poutre((*fa, zf), (*fb, zf), 0.014), "planches_sombres")
    toile(L, [(fa[0], fa[1] + 0.04, zf), (fb[0], fb[1] - 0.04, zf), (fb[0] + 0.2, fb[1] - 0.06, zf - 0.36), (fa[0] + 0.22, fa[1] + 0.06, zf - 0.38)], [(0, 1, 2, 3)], "filet", None, (0.008, 0, 0), zone=(1.0, 0.55, 1.0))
    SOL.append(("rocher", "les filets", Vf.rectangle(0.1, -3.06, 0.3, 0.66)))

    etape("le Grand Moulin")
    # --- le Grand Moulin, au sommet : une haute tour de pierre, sa galerie de bois, sa calotte, la queue qui l'oriente ---
    sx, sy = SOMMET
    zs = sol(sx, sy)
    Mg = T(sx, sy, zs)
    HT, ZG, RG, ZH, RR = 2.9, 0.95, 1.18, 3.1, 1.7
    rt = lambda zz: 0.8 - 0.28 * (zz + 0.3) / (HT + 0.3)  # le rayon de la tour à cette hauteur
    L.ajouter(*N.cylindre(0.8, 0.52, HT + 0.3, 14, haut=False), "pierres_claires", Mg @ T(0, 0, -0.3))
    L.ajouter(*N.cylindre(0.92, 0.86, 0.26, 14), "pierres_sombres", Mg @ T(0, 0, -0.2))
    for zz in (ZG - 0.07, 2.05):
        L.ajouter(*N.cylindre(rt(zz) + 0.035, rt(zz + 0.07) + 0.035, 0.07, 14), "pierres_sombres", Mg @ T(0, 0, zz))
    L.ajouter(*N.cylindre(RG, RG, 0.05, 14, bas=True), "pont", Mg @ T(0, 0, ZG))
    nb = 7 if leger else 14
    for k in range(nb):
        a = k * 2 * PI / nb
        c, s = math.cos(a), math.sin(a)
        if k % 2 == 0 or leger:
            L.ajouter(*N.poutre((c * rt(0.45), s * rt(0.45), 0.45), (c * (RG - 0.08), s * (RG - 0.08), ZG), 0.045), "planches_sombres", Mg)
        L.ajouter(*N.poutre((c * (RG - 0.04), s * (RG - 0.04), ZG + 0.04), (c * (RG - 0.04), s * (RG - 0.04), ZG + 0.3), 0.028), "planches_sombres", Mg)
        a2 = (k + 1) * 2 * PI / nb
        L.ajouter(*N.poutre((c * (RG - 0.04), s * (RG - 0.04), ZG + 0.29), (math.cos(a2) * (RG - 0.04), math.sin(a2) * (RG - 0.04), ZG + 0.29), 0.022), "planches", Mg)
        L.ajouter(*N.poutre((c * (RG - 0.04), s * (RG - 0.04), ZG + 0.16), (math.cos(a2) * (RG - 0.04), math.sin(a2) * (RG - 0.04), ZG + 0.16), 0.011), "corde_vents", Mg)
    Mpo = Mg @ Rz(cap_porte)
    L.ajouter(*N.boite(0.1, 0.42, 0.62), "pierres_sombres", Mpo @ T(rt(0.3) - 0.02, 0, -0.06))
    xd = rt(0.3) + 0.036
    L.ajouter(*N.quad((xd, -0.14, 0.0), (xd, 0.14, 0.0), (xd, 0.14, 0.5), (xd, -0.14, 0.5)), "porte", Mpo)
    for k in range(2):
        L.ajouter(*N.boite(0.14, 0.5 - 0.08 * k, 0.05), "pierres", Mpo @ T(xd + 0.08 + 0.13 * (1 - k), 0, -0.1 + 0.05 * k))
    L.ajouter(*N.poutre((xd - 0.02, 0.26, 0.56), (xd + 0.1, 0.26, 0.56), 0.02), "fer", Mpo)
    U.ajouter(*N.sphere(0.042, 6, 4, 1.2), "lumiere", Mpo @ T(xd + 0.1, 0.26, 0.5))
    for b, zz in ((1.3, 0.4), (-1.5, 1.5), (0.35, 1.55), (2.7, 2.25), (-0.5, 2.3)):
        V.ajouter(*N.boite(0.04, 0.15, 0.2), "vitre", Mg @ Rz(cap_porte + b) @ T(rt(zz + 0.1) - 0.006, 0, zz))
        L.ajouter(*N.boite(0.03, 0.21, 0.26), "planches_sombres", Mg @ Rz(cap_porte + b) @ T(rt(zz + 0.1) - 0.02, 0, zz - 0.03))
    L.ajouter(*N.cylindre(0.6, 0.62, 0.14, 14), "planches_sombres", Mg @ T(0, 0, HT))  # la calotte
    L.ajouter(*N.cylindre(0.7, 0.4, 0.44, 14, haut=False), "bardeaux", Mg @ T(0, 0, HT + 0.12), tourne=True)
    L.ajouter(*N.toit_pointe(0.4, 0.5, 14, 0.0, 0), "bardeaux", Mg @ T(0, 0, HT + 0.56), tourne=True)
    L.ajouter(*N.cylindre(0.03, 0.018, 0.34, 5), "fer", Mg @ T(0, 0, HT + 1.03))
    L.ajouter(*N.sphere(0.045, 6, 4), "or", Mg @ T(0, 0, HT + 1.08))
    L.ajouter(*N.boite(0.56, 0.32, 0.32), "planches_sombres", Mg @ T(-0.52, 0, ZH - 0.16))  # la lucarne de l'arbre
    L.ajouter(*N.poutre((-0.7, 0, ZH), (-0.9, 0, ZH), 0.11), "fer", Mg)
    L.ajouter(*N.poutre((0.45, 0, HT + 0.2), (RG - 0.06, 0, ZG + 0.3), 0.06), "planches_sombres", Mg)  # la queue, jusqu'à la galerie
    for s in (-1, 1):
        L.ajouter(*N.poutre((0.4, s * 0.34, HT + 0.14), (0.86, 0, ZG + 1.05), 0.035), "planches_sombres", Mg)
    SOL.append(("decor", "le Grand Moulin", Vf.rond(sx, sy, 0.98)))
    G = N.Maille("grand_moulin_roue")
    roue_a_voiles(G, RR, VERS_LE_VENT, ["toile_ecrue", "toile_rose", "toile_ecrue", "toile_ecrue", "toile_turquoise", "toile_ecrue", "toile_or", "toile_ecrue"])
    lots["animes"].append((G, (sx - 0.94, sy, zs + ZH), {"anim": "tourne", "axe": [-1.0, 0.0, 0.0], "vitesse": 0.55}))
    Gi = N.Maille("girouette")  # la girouette : sa flèche pointe vers d'où vient le vent, et tremble
    Gi.ajouter(*N.poutre((-0.26, 0, 0), (0.2, 0, 0), 0.016), "fer")
    toile(Gi, [(-0.26, 0, 0), (-0.16, 0, 0.05), (-0.16, 0, -0.05)], [(0, 2, 1)], "or", None, (0, 0.01, 0))
    toile(Gi, [(0.06, 0, 0), (0.24, 0, 0.09), (0.24, 0, -0.03)], [(0, 1, 2)], "or", None, (0, 0.01, 0))
    lots["animes"].append((Gi, (sx, sy, zs + HT + 1.28), {"anim": "balance", "axe": [0.0, 0.0, 1.0], "ampl": 0.2, "vitesse": 2.3}))
    flamme(lots, sx, sy, zs + HT + 1.4, 1.25, "rose", 0.2)

    etape("les autres moulins")
    # --- les autres moulins : deux à pivot (la butte de l'ouest, le tertre du nord-est), un de pierre près des blés ---
    A4 = N.Maille("ailes")
    ailes(A4, 1.05, VERS_LE_VENT)
    tourne = {"anim": "tourne", "axe": [-1.0, 0.0, 0.0]}
    moyeu, faite = moulin_pivot(L, V, BUTTE[0], BUTTE[1], sol(*BUTTE))
    i_ailes = len(lots["animes"])
    lots["animes"].append((A4, moyeu, {**tourne, "vitesse": 0.8}))
    SOL.append(("decor", "le moulin de l'ouest", Vf.rectangle(BUTTE[0] + 0.1, BUTTE[1], 1.5, 1.2)))
    flamme(lots, faite[0], faite[1], faite[2], 0.7, "or", 0.13)
    L.ajouter(*N.cylindre(0.014, 0.01, 0.2, 4), "fer", T(faite[0], faite[1], faite[2] - 0.16))
    mx, my = 4.6, 0.2
    moyeu, faite = moulin_de_pierre(L, V, mx, my, sol(mx, my))
    lots["copies"].append((i_ailes, moyeu, {**tourne, "vitesse": 0.95}))
    SOL.append(("decor", "le moulin de pierre", Vf.rond(mx, my, 0.56)))
    if not leger:
        moyeu, faite = moulin_pivot(L, V, TERTRE[0], TERTRE[1], sol(*TERTRE))
        lots["copies"].append((i_ailes, moyeu, {**tourne, "vitesse": 0.7}))
        SOL.append(("decor", "le moulin du tertre", Vf.rectangle(TERTRE[0] + 0.1, TERTRE[1], 1.5, 1.2)))
        flamme(lots, faite[0], faite[1], faite[2], 0.7, "turquoise", 0.13)
        L.ajouter(*N.cylindre(0.014, 0.01, 0.2, 4), "fer", T(faite[0], faite[1], faite[2] - 0.16))

    etape("les champs de blé")
    # --- les champs de blé (la houle du vent y court), l'épouvantail au tricorne ; les éoliennes de pompage ---
    for cx, cy, lx, ly, an, mat in CHAMPS[:2 if leger else 3]:
        nappe(L, cx, cy, lx, ly, an, mat, 0.12, 0.26 if leger else 0.2)
        SOL.append(("decor", "un champ de blé", Vf.rectangle(cx, cy, lx, ly, an)))
    for x, y, r in ((4.9, -1.45, 0.27), (4.95, -2.0, 0.21)):  # les meules, au bout du grand champ
        meule(L, rng, x, y, sol(x, y), r)
        SOL.append(("rocher", "une meule de foin", Vf.rond(x, y, r)))
    c0, s0 = math.cos(CHAMPS[0][4]), math.sin(CHAMPS[0][4])
    for u, w in ((0.85, 0.35), (1.0, -0.15), (0.7, -0.5)):  # des gerbes dressées, dans le coin déjà moissonné
        gx, gy = CHAMPS[0][0] + c0 * u - s0 * w, CHAMPS[0][1] + s0 * u + c0 * w
        L.ajouter(*N.cylindre(0.075, 0.03, 0.22, 6, haut=False), "ble", T(gx, gy, sol(gx, gy) + 0.05), tourne=True)
        L.ajouter(*N.cylindre(0.03, 0.06, 0.07, 6), "ble", T(gx, gy, sol(gx, gy) + 0.27), tourne=True)
    ex, ey = CHAMPS[0][0] - 0.3, CHAMPS[0][1] + 0.1
    Me = T(ex, ey, sol(ex, ey))
    L.ajouter(*N.cylindre(0.018, 0.015, 0.62, 5), "planches_sombres", Me @ T(0, 0, -0.05))
    L.ajouter(*N.poutre((0, -0.2, 0.42), (0, 0.2, 0.42), 0.022), "planches_sombres", Me)
    L.ajouter(*N.sphere(0.05, 6, 4), "toile_ecrue", Me @ T(0, 0, 0.56))
    L.ajouter(*N.cylindre(0.1, 0.085, 0.012, 3), "tissu_sombre", Me @ T(0, 0, 0.595) @ Rz(PI))  # un tricorne
    L.ajouter(*N.cylindre(0.05, 0.035, 0.04, 6), "tissu_sombre", Me @ T(0, 0, 0.6))
    for s in (-1, 1):  # les pans de sa vieille veste, emportés vers l'est
        toile(L, [(0, s * 0.02, 0.44), (0, s * 0.19, 0.42), (0.2, s * 0.17, 0.3), (0.16, s * 0.03, 0.22)], [(0, 1, 2, 3) if s > 0 else (3, 2, 1, 0)], "tissu_rouge", Me, (0, 0, -0.008), zone=(1.0, 0.35, 1.0))
    Ro = N.Maille("rosette")
    rosette(Ro, 0.3, VERS_LE_VENT)
    i_rosette = None
    for k, (x, y) in enumerate(((2.25, -0.25), (-4.9, -1.3), (0.3, 3.7))[:2 if leger else 3]):
        roue = eolienne(L, x, y, sol(x, y))
        extras = {**tourne, "vitesse": 2.3 + 0.4 * k}
        if i_rosette is None:
            i_rosette = len(lots["animes"])
            lots["animes"].append((Ro, roue, extras))
        else:
            lots["copies"].append((i_rosette, roue, extras))
        SOL.append(("dur", "une éolienne de pompage", Vf.rectangle(x + 0.14, y, 0.96, 0.5)))

    etape("la corde de vie")
    # --- la corde de vie : des piquets le long de la montée, la corde de l'un à l'autre, des lanternes, des moulinets ---
    Mo = N.Maille("moulinet")
    moulinet(Mo, VERS_LE_VENT)
    moulinets, piquets = [], []
    gauche = lambda a, b: np.array((-(b[1] - a[1]), b[0] - a[0])) / math.hypot(b[0] - a[0], b[1] - a[1])  # à main gauche en montant
    places = []
    for i, (a, b) in enumerate(zip(etapes[:-1], etapes[1:])):
        a, b = np.array(a), np.array(b)
        n1 = gauche(a, b)
        if i == 0:
            coin = a + (b - a) * 0.12 / np.linalg.norm(b - a) + n1 * 0.17
        else:  # au coude : sur la bissectrice, pour que la corde reste à la même distance des deux côtés
            n0 = gauche(etapes[i - 1], a)
            bis = (n0 + n1) / np.linalg.norm(n0 + n1)
            coin = a + bis * 0.17 / float(bis @ n1)
        long = float(np.linalg.norm(b - a)) - (0.4 if i == len(etapes) - 2 else 0.0)
        nb = max(1, round(long / 0.5))
        places += [coin] + [a + (b - a) / np.linalg.norm(b - a) * long * k / nb + n1 * 0.17 for k in range(1, nb + (1 if i == len(etapes) - 2 else 0))]
    for k, (x, y) in enumerate(places):
        zz = sol(x, y)
        grand = k % 3 == 0
        L.ajouter(*N.cylindre(0.024, 0.018, (0.5 if grand else 0.3) + 0.06, 5), "planches_sombres", T(x, y, zz - 0.06))
        if grand:
            L.ajouter(*N.poutre((x, y, zz + 0.44), (x + 0.07, y, zz + 0.44), 0.012), "fer")
            U.ajouter(*N.sphere(0.034, 6, 4, 1.2), "lumiere", T(x + 0.07, y, zz + 0.385))
            if k % 6 == 0 or not leger:
                moulinets.append((x - 0.035, y, zz + 0.53))
        piquets.append((x, y, zz + 0.24))
        SOL.append(("rocher", "un piquet de la corde de vie", Vf.rond(x, y, 0.045)))
    for a, b in zip(piquets[:-1], piquets[1:]):
        corde(L, a, b)

    etape("la bergerie")
    # --- la bergerie : un enclos rond de pierres sèches à l'abri de la butte, ses moutons ---
    bx, by = -1.55, 1.95
    for e in muret(L, rng, [(bx + math.cos(a) * 0.72, by + math.sin(a) * 0.72) for a in np.arange(0.5, 2 * PI - 0.15, 0.3)], 0.24, 0.12):
        SOL.append(("rocher", "l'enclos", e))
    for k, (dx, dy, cap) in enumerate(((0.1, 0.15, 0.4), (-0.25, -0.1, 2.6), (0.2, -0.3, 4.4), (1.25, -0.35, 0.3), (1.5, 0.3, 5.6))[:3 if leger else 5]):
        mouton(L, rng, bx + dx, by + dy, sol(bx + dx, by + dy), cap, k % 2 == 1)
        SOL.append(("rocher", "un mouton", Vf.rond(bx + dx, by + dy, 0.11)))

    etape("les gens")
    # --- les gens (immobiles) : ils penchent contre le vent. Trois qui se tiennent en haut de la falaise, un chapeau
    #     qui s'envole ; ceux du hameau, du ponton, de la galerie, le berger ; ceux qui tiennent les cerfs-volants ---
    def poser(x, y, cap, zz=None, penche=0.16, leve=0, genre="un habitant"):
        if zz is None and not libre(x, y, 0.07):
            return None
        n0 = len(L.v)
        zz = sol(x, y) if zz is None else zz
        P.passant(L, rng, x, y, angle=cap, z=zz, leve=leve)
        if penche:  # tout le bonhomme tourne autour de ses pieds, la tête vers l'ouest
            Mi = T(x, y, zz) @ Ry(-penche) @ T(-x, -y, -zz)
            for k in range(n0, len(L.v)):
                L.v[k] = L.v[k] @ Mi[:3, :3].T + Mi[:3, 3]
        SOL.append(("passant", genre, Vf.rond(x, y, 0.065)))
        return x, y, zz

    fx, fy = vers(168, 0.95)
    for k in range(3):
        poser(fx + 0.06 * (k % 2), fy - 0.17 + 0.17 * k, PI + 0.1 * (k - 1), None, 0.24, 0, "un de ceux qui se tiennent")
    ch = (fx + 0.75, fy + 0.2, sol(fx + 0.75, fy + 0.2) + 0.55)  # le chapeau envolé
    L.ajouter(*N.cylindre(0.078, 0.072, 0.01, 8), "sable", T(*ch) @ Ry(0.6), zone=(1.0, 0.25, 1.0))
    L.ajouter(*N.cylindre(0.04, 0.032, 0.034, 7), "sable", T(*ch) @ Ry(0.6), zone=(1.0, 0.25, 1.0))
    poser(PUITS[0] + 0.3, PUITS[1] - 0.12, 2.9)
    if not leger:
        poser(-0.95, -1.12, -0.6)
        poser(0.98 + 0.78, -1.42, 0.3)
        poser(*(pa + dp * (lg - 0.45) + cote_p * 0.12), math.atan2(dp[1], dp[0]), ZQ + 0.02, 0.12)
        poser(bx + 1.0, by - 0.75, 2.2, None, 0.2, 0, "le berger")
    main = lambda q, cap: (q[0] + math.cos(cap) * 0.012 - math.sin(cap) * 0.066, q[1] + math.sin(cap) * 0.012 + math.cos(cap) * 0.066, q[2] + 0.34)  # la main levée
    qg = Mg @ Rz(-0.5) @ np.array((RG - 0.2, 0, ZG + 0.05, 1))  # celui de la galerie tient un cerf-volant, lui aussi
    pilote_g = main(poser(qg[0], qg[1], -0.3, qg[2], 0.0, 1, "le meunier au cerf-volant"), -0.3)
    pilotes = []
    for k, (x, y) in enumerate((vers(-44, 0.95), (0.9, 4.3))[:1 if leger else 2]):
        q = poser(x, y, 0.0, None, 0.0, 1, "un enfant au cerf-volant")
        if q:
            pilotes.append(main(q, 0.0))

    etape("les cerfs-volants")
    # --- les cerfs-volants : ceux des enfants, celui de la galerie ; et le noir, sans emblème, au piquet de la côte est ---
    volants = [(p, d, mat, nd) for p, (d, mat, nd) in zip(pilotes, (((2.3, 0.35, 2.5), "vif_rose", ["vif_or", "vif_turquoise", "vif_blanc", "vif_or", "vif_turquoise"]), ((2.0, -0.5, 2.7), "vif_turquoise", ["vif_rose", "vif_blanc", "vif_rose", "vif_or", "vif_rose"])))]
    volants.append((pilote_g, (2.2, -0.7, 1.9), "vif_or", ["vif_violet", "vif_rose", "vif_violet", "vif_blanc", "vif_violet"]))
    px, py = vers(14, 0.8)
    zpq = sol(px, py)
    L.ajouter(*N.cylindre(0.026, 0.02, 0.34, 5), "planches_sombres", T(px, py, zpq - 0.08) @ Ry(-0.25))
    SOL.append(("rocher", "le piquet du cerf-volant noir", Vf.rond(px, py, 0.06)))
    volants.append(((px - 0.05, py, zpq + 0.24), (2.5, 0.45, 2.1), "toile_rature", ["toile_rature"] * 4))
    for k, (p, d, mat, nd) in enumerate(volants):
        lots["animes"].append((cerf_volant(f"cerf_volant{k}", d, mat, nd if not leger else nd[:3]), p, {"anim": "balance", "axe": [1.0, 0.0, 0.0], "ampl": 0.07 + 0.02 * (k % 3), "vitesse": 0.75 + 0.17 * k, "phase": 1.7 * k}))

    etape("les arbres couchés par le vent")
    # --- les arbres couchés par le vent, les rochers des hauteurs, les touffes de bruyère et d'herbe haute ---
    arbres = [(-0.35, -3.35, 1.5), (1.75, -2.45, 1.3), (2.1, 0.75, 1.6), (-2.5, -0.62, 1.2), (5.2, 1.9, 1.4), (4.9, -0.75, 1.1), (-4.3, 2.3, 1.0), (1.95, 2.6, 1.2), (-1.0, 0.95, 1.3)]
    for x, y, h in arbres[:5 if leger else 9]:
        if not libre(x, y, 0.16):
            continue
        arbre_vent(L, rng, x, y, sol(x, y), h, not leger)
        SOL.append(("arbre", "un arbre couché par le vent", Vf.rond(x, y, 0.1)))
    faits = 0
    for essai in range(300):
        if faits >= (6 if leger else 12):
            break
        x, y = vers(100 + rng.random() * 190, 0.35 + rng.random() * 2.4)  # du côté du vent
        r = 0.14 + rng.random() * 0.2
        if not libre(x, y, r + 0.05):
            continue
        rocher(L, rng, x, y, sol(x, y), r, rng.choice(["roche_claire", "roche_claire", "roche"]))
        SOL.append(("rocher", "un rocher", Vf.rond(x, y, r)))
        faits += 1
    faits = 0
    for essai in range(400):
        if faits >= (10 if leger else 22):
            break
        x, y = vers(rng.random() * 360, 0.8 + rng.random() * 4.6)
        if not libre(x, y, 0.2):
            continue
        if faits % 2 == 0:
            herbes(L, rng, x, y, sol(x, y), 4 if leger else 6)
        else:
            for q in range(3):
                v, f = N.sphere(0.09 + 0.06 * rng.random(), 5, 3, 0.42)
                L.ajouter([(a * 1.5, b, c) for a, b, c in v], f, "bruyere", T(x + 0.15 * q - 0.1, y + 0.12 * math.sin(q * 2.3 + faits), sol(x, y) + 0.02), zone=(1.0, 0.86, 1.0))
        SOL.append(("rocher", "une touffe", Vf.rond(x, y, 0.2)))
        faits += 1

    etape("les moulinets")
    # --- les moulinets (un modèle, des copies) : sur les grands piquets de la corde de vie, au pignon des maisons ---
    for x, y, cap, lx, ly, mur in maisons[:3 if leger else 4]:
        zf = sol(x, y) + 0.03 - 0.07 + 0.06 + 0.4 + 0.4 + 0.1
        q = (x + math.cos(cap) * (lx / 2 + 0.08), y + math.sin(cap) * (lx / 2 + 0.08))
        L.ajouter(*N.cylindre(0.012, 0.01, 0.22, 4), "planches_sombres", T(q[0], q[1], zf))
        moulinets.append((q[0] - 0.03, q[1], zf + 0.2))
    i_moulinet = None
    for k, q in enumerate(moulinets):
        extras = {**tourne, "vitesse": 5.5 + 1.3 * (k % 3)}
        if i_moulinet is None:
            i_moulinet = len(lots["animes"])
            lots["animes"].append((Mo, q, extras))
        else:
            lots["copies"].append((i_moulinet, q, extras))

    etape("la vie")
    # --- la vie : ceux qui marchent (les trois de la corde de vie d'abord), la fumée couchée, les rafales, les oiseaux ---
    types = []
    for k in range(3):
        Pm = N.Maille(f"marcheur{k}")
        P.passant(Pm, rng, 0, 0, angle=0.0, z=0.0, marcheur=True)
        types.append(Pm)
    deja = {}
    for k, (pts, rond, vit, depart, pause) in enumerate(chemins[:3] if leger else chemins):
        extras = {"anim": "marche", "chemin": [float(c) for p in pts for c in p], "vitesse": vit, "phase": depart, "saut": 0.022, "pause": pause}
        t_ = k % len(types)
        if t_ not in deja:
            deja[t_] = len(lots["animes"])
            lots["animes"].append((types[t_], pts[0], extras))
        else:
            lots["copies"].append((deja[t_], pts[0], extras))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "fumees", "points": [float(c) for p in fumees for c in p], "grosseur": 0.45, "cap": CAP, "force": 1.25, "monte": 0.75}))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "rafales", "nb": 9 if leger else 16, "rayon": 7.6, "haut": 4.6, "cap": CAP}))
    lots["reperes"].append(((0.0, 0.0, 6.4), {"anim": "oiseaux", "nb": 3 if leger else 5, "rayon": 5.6, "envergure": 0.14}))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "mer", "rayon": 8.1, "genre": 2}))

    etape("sur l'eau")
    # --- sur l'eau (dessiné par le site) : le ressac tout le long du rivage, l'ombre du ponton, du caboteur, de la barque ---
    Rv = N.Maille("rivage")
    cote = [(_COTE[i % 720][0], _COTE[i % 720][1]) for i in range(0, 724, 4)]
    K.bande(Rv, [(x * 0.995, y * 0.995) for x, y in cote], [(x * (1 + 1.1 / math.hypot(x, y)), y * (1 + 1.1 / math.hypot(x, y))) for x, y in cote], mat="ecume", boucle=True)
    decal = (0.12, 0.021)  # du côté opposé au soleil (une fois l'île tournée)
    K.tache(Rv, *(pa + dp * (lg / 2 + 0.35)), lg - 0.8, 0.5, math.atan2(dp[1], dp[0]), decal=decal)
    K.tache(Rv, nav[0], nav[1], 2.3 * 0.96, 2.3 * 0.34 * 0.9, cap_n, rond=True, marge=0.3, decal=decal)
    K.tache(Rv, brq[0], brq[1], 0.8, 0.3, cap_n + 0.2, rond=True, marge=0.16, decal=decal)
    lots["libres"].append((Rv, (0.0, 0.0, 0.0), {"role": "decor"}))
    etape("fin")
    lots["plan"] = {"emprises": emprises, "sol": SOL, "ponts": ponts}
    return orienter(lots)


def verifier(lots=None, leger=False):
    """Les erreurs de plan (voir barhaw_ile_v5.controler) : une liste vide quand tout va bien."""
    return K.controler(lots or mailles(leger=leger), sol_monde)


def construire(rendu=True, cuire=True, exporter=True, taille=None, echantillons=48, leger=False, alleger=True):
    lots = mailles(leger=leger)
    rendus = [("vents-v5", (0, -21, 13), (0, 0.3, 1.6), 55), ("vents-v5-hameau", (2.5, -11, 4.2), (0.2, -2.0, 1.0), 60)] if rendu else []
    return K.construire("ile-vents-v5", lots, verifier(lots), rendus, cuire, exporter, taille or (2048 if leger else 3072), echantillons, leger, alleger, atlas="vents")
