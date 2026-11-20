# La Forteresse des Corsaires, « niveau 5 » : un fort bastionné sur son rocher, qui garde la route du trésor.
# (Son histoire, dans le bot : « Un fort de pierre plein de canons, qui garde la route du trésor. »)
# L'idée : un rocher aux falaises droites, et dessus un fort en étoile (cinq bastions en pointe de flèche, des courtines
# crénelées, des canons dans les embrasures de chaque bastion). Au milieu, le donjon carré et son pavillon, la caserne aux
# tuiles rouges, la poudrière, le puits, des pyramides de boulets, la place d'armes. En bas, le port des corsaires : le
# quai, le brick des corsaires à l'amarre, la jetée et sa tour, la grosse chaîne tendue en travers de l'entrée du port,
# l'escalier taillé dans la falaise jusqu'à la porte du fort. Tout est inventé.
# La vie : la sentinelle fait les cent pas sur la courtine, les corsaires montent et descendent l'escalier, d'autres
# traversent la place d'armes ; le pavillon claque ; la fumée de la cuisine. La nuit : les fenêtres de la caserne, les
# lanternes de la porte, du quai et de la jetée, le fanal de la tour.
import math, random
import numpy as np
import barhaw_niveau5 as N
import barhaw_verif as Vf
import barhaw_ile_v5 as K
import barhaw_port_v5 as P
import barhaw_arbre_v5 as A
import barhaw_ambre_v5 as Am
import barhaw_recif_v5 as Rf

PI = math.pi
T, Rz, Rx, Ry = N.T, N.Rz, N.Rx, N.Ry

R_SOL = 10.0
Z_P = 1.5  # le plateau du fort
Z_B = 0.36  # la grève et le port
H_MUR, EP_MUR = 0.72, 0.44  # la hauteur des remparts au-dessus du plateau, leur épaisseur
DEMI_RAMPE = 0.4
BASTIONS = [-54, 18, 90, 162, 234]  # les angles des pointes (la porte est au sud, entre -54 et -126)
PISTES = []

N.matiere("pierre_fort", N.tx_pierres, 0.9, 1.0, c=0xb8ab92, rangs=7, graine=941, mortier=0x6e6556, mousse=0.18)
N.matiere("bronze", N.tx_uni, 0.5, 0.4, rugueux=0.35, metal=0.7, c=0x8a6a3a, graine=942, grain=0.2, taches=0.4, c2=0x5d6b52, seuil=0.55)
N.matiere("fonte", N.tx_uni, 0.5, 0.4, rugueux=0.5, metal=0.5, c=0x34363a, graine=943, grain=0.25, taches=0.3, c2=0x24252a, seuil=0.55)


def rivage(th):
    sud = math.exp(-(((th + PI / 2 + PI) % (2 * PI) - PI) / 0.55) ** 2)
    return 5.9 + 0.3 * math.sin(2 * th + 1.4) + 0.22 * math.sin(3 * th + 0.3) + 0.15 * math.sin(5 * th + 2.4) + 0.55 * sud


_COTE = np.array([(math.cos(a) * rivage(a), math.sin(a) * rivage(a)) for a in np.linspace(-PI, PI, 720, endpoint=False)])


def bord(x, y):
    d = float(np.sqrt(((_COTE - (x, y)) ** 2).sum(axis=1).min()))
    return d if math.hypot(x, y) < rivage(math.atan2(y, x)) else -d


def vers(angle, dedans):
    a = math.radians(angle)
    r = rivage(a) - dedans
    return math.cos(a) * r, math.sin(a) * r


def r_plat(a):
    sud = math.exp(-(((a + PI / 2 + PI) % (2 * PI) - PI) / 0.35) ** 2)
    return 3.95 + 0.16 * math.sin(3 * a + 1.1) + 0.1 * math.sin(5 * a + 0.2) - 0.25 * sud


def rampe(y):
    y0, y1 = -r_plat(-PI / 2) - 1.25, -r_plat(-PI / 2) + 0.4
    return Z_B + (Z_P - Z_B) * min(1.0, max(0.0, (y - y0) / (y1 - y0)))


def terrain(x, y):
    d = bord(x, y)
    if d < 0:
        return max(-1.5, 0.45 * d)
    rr, a = math.hypot(x, y), math.atan2(y, x)
    bas = Z_B * K.lisse(0.0, 0.8, d) + (K.bruit2(x * 0.9, y * 0.9, 41) - 0.5) * 0.12 * K.lisse(0.3, 1.0, d)
    haut = Z_P + (K.bruit2(x * 0.6, y * 0.6, 42) - 0.5) * 0.03
    h = bas + (haut - bas) * K.lisse(r_plat(a) + 0.12, r_plat(a) - 0.06, rr)
    dans = K.lisse(DEMI_RAMPE + 0.18, DEMI_RAMPE, abs(x)) if y < 0 else 0.0
    if dans > 0 and rr > r_plat(a) - 0.6:
        h = h + (rampe(y) - h) * dans
    return h


sol = terrain


def trace():
    """Le tracé du fort : les sommets du polygone en étoile (cinq bastions), dans le sens inverse des aiguilles."""
    pts = []
    for g in BASTIONS:
        for dg, r in ((-24, 2.5), (-14, 2.72), (0, 3.3), (14, 2.72), (24, 2.5)):
            a = math.radians(g + dg)
            pts.append((math.cos(a) * r, math.sin(a) * r))
    return pts


def dedans_du_fort(x, y, marge=0.0):
    """Ce point est-il dans l'enceinte (à `marge` des remparts) ?"""
    pts = trace()
    dedans = False
    for (ax, ay), (bx, by) in zip(pts, pts[1:] + pts[:1]):
        if (ay > y) != (by > y) and x < ax + (y - ay) * (bx - ax) / (by - ay):
            dedans = not dedans
    if not dedans:
        return False
    return all(K.distance_au_trajet(x, y, [(ax, ay, 0.0), (bx, by, 0.0)]) > EP_MUR + marge for (ax, ay), (bx, by) in zip(pts, pts[1:] + pts[:1]))


def tx_sol_fort(taille=2048, graine=951):
    """Le sol : la grève et les galets du port, la roche des falaises, l'herbe rase du plateau ; dans l'enceinte, la terre
    battue de la place d'armes et ses dalles ; le chemin du quai."""
    n = taille
    h = K.agrandir(K.champ(terrain, R_SOL, 240), n)
    gy, gx = np.gradient(h)
    pente = np.hypot(gx, gy) * n / (2 * R_SOL)
    piste = K.agrandir(K.champ(lambda x, y: min((K.distance_au_trajet(x, y, p) for p in PISTES), default=9.0), R_SOL, 240), n)
    enceinte = K.agrandir(K.champ(lambda x, y: 1.0 if dedans_du_fort(x, y, -EP_MUR) else 0.0, R_SOL, 240), n)
    b1, b2, b3, fin = N.bruit(n, 7, 7, graine, 4), N.bruit(n, 30, 30, graine + 1, 3), N.bruit(n, 96, 96, graine + 2, 2), N.bruit(n, 256, 256, graine + 3, 1)
    grain = N.bruit(n, 600, 600, graine + 4, 1)
    greve = N.mel(N.hexa(0x8f877a), N.hexa(0xbcb19b), np.clip(0.3 + 0.8 * (grain - 0.5) + 0.4 * (b2 - 0.5), 0, 1))
    herbe = N.mel(N.hexa(0x6b8d46), N.hexa(0x98b266), np.clip(0.1 + 0.7 * b2 + 0.3 * (b1 - 0.5), 0, 1)) * (0.88 + 0.22 * (fin - 0.5))[..., None]
    herbe = N.mel(herbe, N.hexa(0xb6ab72), N.lisse(0.62, 0.8, b1) * 0.35)
    coul = N.mel(greve, herbe, N.lisse(Z_P - 0.35, Z_P - 0.1, h))
    roche = N.mel(N.hexa(0x857b6c), N.hexa(0xb0a48d), np.clip(0.2 + 0.7 * b3, 0, 1)) * (0.86 + 0.28 * (fin - 0.5))[..., None]
    coul = N.mel(coul, roche, N.lisse(0.6, 1.2, pente))
    battue = N.mel(N.hexa(0x9e8a6a), N.hexa(0xbca684), np.clip(0.2 + 0.7 * b2 + 0.3 * (grain - 0.5), 0, 1))
    coul = N.mel(coul, battue, np.clip(enceinte, 0, 1) * 0.9)
    terre = N.mel(N.hexa(0xa48e6a), N.hexa(0xc2ab82), np.clip(0.2 + 0.7 * b3, 0, 1))
    coul = N.mel(coul, terre, N.lisse(0.22, 0.13, piste + (fin - 0.5) * 0.05) * (1 - enceinte * 0.7))
    relief = np.clip(0.5 + 0.2 * (b3 - 0.5) + 0.15 * (fin - 0.5), 0, 1)
    return np.clip(coul, 0, 1).astype(np.float32), relief.astype(np.float32)


N.matiere("sol_fort", tx_sol_fort, 2 * R_SOL, 0.5, 0.9)


# --- les pièces ---
def falaise(L, pas_deg=6):
    """Le parement des falaises (comme à l'Île-Horloge), ouvert au sud pour l'escalier."""
    ouverture = math.degrees(math.asin(min(0.99, (DEMI_RAMPE + 0.04) / r_plat(-PI / 2))))
    angles = [g for g in range(-90 + pas_deg, 270, pas_deg) if abs(g + 90) > ouverture and abs(g - 270) > ouverture]
    angles = [math.radians(g) for g in [-90 + ouverture] + angles + [270 - ouverture]]
    pt = lambda a, plus, z: (math.cos(a) * (r_plat(a) + plus), math.sin(a) * (r_plat(a) + plus), z)
    for a1, a2 in zip(angles[:-1], angles[1:]):
        L.ajouter([pt(a1, 0.02, Z_P + 0.04), pt(a1, 0.32, Z_B - 0.1), pt(a2, 0.32, Z_B - 0.1), pt(a2, 0.02, Z_P + 0.04)], [(0, 1, 2, 3)], "roche")
    for a in (angles[0], angles[-1]):
        L.ajouter([pt(a, 0.02, Z_P + 0.04), pt(a, 0.32, Z_B - 0.1), pt(a, -0.6, Z_B - 0.1), pt(a, -0.6, Z_P + 0.04)], [(0, 1, 2, 3), (3, 2, 1, 0)], "roche")


def marches(L, x, y0, y1, larg, nb):
    pied = terrain(x, y0) - 0.3
    dy = (y1 - y0) / nb
    for k in range(nb):
        nez = y0 + k * dy
        dessus = terrain(x, nez + dy / 2) + 0.025
        L.ajouter(*N.boite(larg, y1 + 0.03 - nez, dessus - pied), "pierres_claires", T(x, (nez + y1 + 0.03) / 2, pied))


def canon(L, x, y, z, cap, lg=0.42):
    """Un canon sur son affût : le fût de bronze, les flasques de bois, quatre roues ; il pointe vers `cap`."""
    M = T(x, y, z) @ Rz(cap)
    for s in (-1, 1):
        L.ajouter(*N.boite(lg * 0.8, 0.035, 0.12), "planches_sombres", M @ T(-0.02, s * 0.07, 0.04))
        for dx in (-0.12, 0.14):
            L.ajouter(*N.cylindre(0.05, 0.05, 0.03, 8), "planches_sombres", M @ T(dx, s * 0.105, 0.05) @ Rx(PI / 2) @ T(0, 0, -0.015))
    L.ajouter(*N.cylindre(0.058, 0.04, lg, 9), "bronze", M @ T(-lg * 0.35, 0, 0.16) @ Ry(PI / 2 - 0.06))
    L.ajouter(*N.cylindre(0.05, 0.05, 0.03, 9), "bronze", M @ T(lg * 0.63, 0, 0.12) @ Ry(PI / 2))
    L.ajouter(*N.sphere(0.04, 6, 4), "bronze", M @ T(-lg * 0.38, 0, 0.16))


def boulets(L, x, y, z):
    """Une pyramide de boulets de fonte."""
    k = 0
    for etage, nb in enumerate((3, 2, 1)):
        for i in range(nb):
            for j in range(nb):
                L.ajouter(*N.sphere(0.045, 6, 4), "fonte", T(x + (i - (nb - 1) / 2) * 0.09, y + (j - (nb - 1) / 2) * 0.09, z + 0.045 + etage * 0.074))
                k += 1


def remparts(L, lots, ponts, leger):
    """Les remparts en étoile : pour chaque pan, un mur plein en léger fruit, le chemin de ronde dessus, le parapet crénelé
    côté dehors (des embrasures sur les faces des bastions, un canon dans chacune), une échauguette à la pointe de chaque
    bastion. La porte au milieu de la courtine du sud. Renvoie les emprises des pans (pour le contrôle)."""
    pts = trace()
    n = len(pts)
    pans = []
    for i in range(n):
        a, b = np.array(pts[i]), np.array(pts[(i + 1) % n])
        d = b - a
        lg = float(np.linalg.norm(d))
        cap = math.atan2(d[1], d[0])
        nx, ny = math.sin(cap), -math.cos(cap)  # vers le dehors (le tracé tourne dans le sens inverse des aiguilles)
        m = (a + b) / 2
        mi = (m[0] - nx * EP_MUR / 2, m[1] - ny * EP_MUR / 2)
        porte = abs(math.degrees(math.atan2(m[1], m[0])) + 90) < 3
        M = T(mi[0], mi[1], Z_P - 0.25) @ Rz(cap)
        if porte:  # la porte : deux piles, l'arc, les vantaux ouverts, les lanternes
            for s in (-1, 1):
                L.ajouter(*N.boite((lg - 0.7) / 2, EP_MUR, H_MUR + 0.25), "pierre_fort", M @ T(s * (lg + 0.7) / 4, 0, 0))
            L.ajouter(*N.boite(0.74, EP_MUR + 0.06, 0.22), "pierre_fort", M @ T(0, 0, H_MUR + 0.03))
            L.ajouter(*N.boite(0.9, 0.12, 0.08), "pierres_claires", M @ T(0, EP_MUR / 2 + 0.03, H_MUR + 0.25))
            for s in (-1, 1):
                L.ajouter(*N.boite(0.3, 0.04, 0.62), "planches_sombres", M @ T(s * 0.5, -EP_MUR / 2 + 0.1, 0.25) @ Rz(s * 1.2))
        else:
            L.ajouter(*N.boite(lg + 0.02, EP_MUR, H_MUR + 0.25), "pierre_fort", M)
        # le talus de pierre en pied de mur, côté dehors (il cache le joint avec le terrain) ; pas devant la porte
        if not porte:
            L.ajouter([(a[0] + nx * 0.0, a[1] + ny * 0.0, Z_P + 0.25), (a[0] + nx * 0.22, a[1] + ny * 0.22, Z_P - 0.08), (b[0] + nx * 0.22, b[1] + ny * 0.22, Z_P - 0.08), (b[0], b[1], Z_P + 0.25)], [(0, 1, 2, 3)], "pierre_fort")
        # le parapet crénelé (côté dehors) ; des embrasures sur les faces des bastions
        face = i % 5 in (1, 2)
        nb = max(2, int(lg / 0.24))
        for k in range(nb):
            t = (k + 0.5) / nb
            if face and k == nb // 2:
                continue  # l'embrasure
            if porte and abs(t - 0.5) < 0.3:
                continue
            q = a + d * t
            L.ajouter(*N.boite(lg / nb * 0.55, 0.11, 0.16), "pierre_fort", T(q[0] - nx * 0.055, q[1] - ny * 0.055, Z_P + H_MUR) @ Rz(cap))
        if face and not leger or face and i % 10 in (1, 2):
            q = a + d * 0.5
            canon(L, q[0] - nx * 0.28, q[1] - ny * 0.28, Z_P + H_MUR, cap - PI / 2)
        if not porte:
            pans.append(Vf.rectangle(mi[0], mi[1], lg + 0.02, EP_MUR, cap))
            ponts.append(Vf.rectangle(mi[0], mi[1], lg + 0.02, EP_MUR, cap))
        if i % 5 == 2:  # l'échauguette, à la pointe
            L.ajouter(*N.cylindre(0.2, 0.2, 0.42, 10, haut=False), "pierre_fort", T(a[0] - nx * 0.05, a[1] - ny * 0.05, Z_P + H_MUR - 0.1))
            L.ajouter(*N.cylindre(0.08, 0.22, 0.18, 10, haut=False), "pierre_fort", T(a[0] - nx * 0.05, a[1] - ny * 0.05, Z_P + H_MUR - 0.28))
            v, f = N.toit_pointe(0.24, 0.3, 10, 0.03, 0.0)
            L.ajouter(v, f, "tuiles_rouges", T(a[0] - nx * 0.05, a[1] - ny * 0.05, Z_P + H_MUR + 0.32))
    for p in pts:  # des chaînes d'angle (elles cachent les joints entre les pans)
        L.ajouter(*N.cylindre(EP_MUR * 0.5, EP_MUR * 0.5, H_MUR + 0.25, 8), "pierre_fort", T(p[0] * 0.97, p[1] * 0.97, Z_P - 0.25))
    return pans


def batiment(L, V, rng, x, y, z, cap, lx, ly, hm, ht, mur="pierres", toit="tuiles_rouges", fenetres=3):
    M = T(x, y, z) @ Rz(cap)
    L.ajouter(*N.boite(lx, ly, hm + 0.2, haut=False), mur, M @ T(0, 0, -0.2))
    L.ajouter(*N.pignons(lx, ly, ht), mur, M @ T(0, 0, hm))
    v, f = N.toit_pignon(lx, ly, ht, 0.1, 0.05)
    L.ajouter(v, [f[0], f[4]], toit, M @ T(0, 0, hm))
    L.ajouter(v, [q for k, q in enumerate(f) if k not in (0, 4)], "planches_sombres", M @ T(0, 0, hm))
    Mf = M @ T(0, -ly / 2, 0)
    for k in range(fenetres):
        xf = -lx / 2 + lx * (k + 0.5) / fenetres
        if k == fenetres // 2:
            L.ajouter(*N.quad((xf - 0.11, -0.012, 0.0), (xf + 0.11, -0.012, 0.0), (xf + 0.11, -0.012, 0.38), (xf - 0.11, -0.012, 0.38)), "porte", Mf)
        else:
            P.fenetre(L, V, rng, Mf, xf, 0.2, 0.15, 0.2, allumee=True)
    return Vf.rectangle(x, y, lx + 0.1, ly + 0.1, cap)


def donjon(L, V, U, lots, rng, x, y, z):
    """Le donjon : une tour carrée crénelée, une porte, des archères, une échauguette ; le mât du pavillon sur la terrasse."""
    l, h = 1.05, 1.9
    M = T(x, y, z)
    L.ajouter(*N.boite(l + 0.16, l + 0.16, 0.3, haut=True), "pierres", M @ T(0, 0, -0.2))
    L.ajouter(*N.boite(l, l, h, haut=True), "pierre_fort", M @ T(0, 0, 0.1))
    L.ajouter(*N.boite(l + 0.14, l + 0.14, 0.1, bas=True), "pierres_sombres", M @ T(0, 0, h + 0.05))
    for k in range(4):
        Mw = M @ Rz(k * PI / 2) @ T(0, -l / 2 - 0.004, 0)
        for j in range(4):
            if j % 2 == 0:
                L.ajouter(*N.boite(l / 4 * 0.8, 0.12, 0.16), "pierre_fort", Mw @ T(-l / 2 + l / 8 + j * l / 4, -0.0, h + 0.15))
        P.fenetre(L, V, rng, Mw, 0.0, 1.2, 0.12, 0.26, allumee=True)
        if k == 0:
            L.ajouter(*N.quad((-0.14, -0.012, 0.1), (0.14, -0.012, 0.1), (0.14, -0.012, 0.56), (-0.14, -0.012, 0.56)), "porte", Mw)
    L.ajouter(*N.cylindre(0.025, 0.02, 1.0, 6), "planches_sombres", M @ T(0.3, 0.3, h + 0.15))
    Fl = N.Maille("pavillon")
    v, f = [], []
    for k in range(5):
        t = k / 4
        v += [(0.03 + 0.62 * t, 0.025 * math.sin(t * 4.5), 0.0), (0.03 + 0.62 * t, 0.025 * math.sin(t * 4.5), -0.4)]
    for k in range(4):
        f += [(k * 2, k * 2 + 2, k * 2 + 3, k * 2 + 1), (k * 2 + 1, k * 2 + 3, k * 2 + 2, k * 2)]
    Fl.ajouter(v, f, "tissu_rouge")
    lots["animes"].append((Fl, (x + 0.3, y + 0.3, z + h + 1.12), {"anim": "drapeau", "ampl": 0.18, "vitesse": 1.4, "phase": 0.4}))
    return Vf.rectangle(x, y, l + 0.2, l + 0.2, 0.0)


def mailles(graine=941, leger=False):
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

    quai_mer, quai_terre = vers(-90, -1.5), vers(-90, 0.45)
    y_bas, y_haut = -r_plat(-PI / 2) - 1.25, -r_plat(-PI / 2) + 0.4
    y_porte = -2.5 * math.cos(math.radians(24))
    montee = [quai_terre, (0.0, y_bas - 0.1), (0.0, y_haut + 0.2), (0.0, y_porte - EP_MUR - 0.2), (0.0, y_porte + 0.35), (0.0, -0.9)]
    place = [(-1.2, -0.6), (0.0, -0.9), (1.2, -0.55)]
    PISTES[:] = [[(x, y, 0.0) for x, y in pts] for pts in (montee, place)]
    couloirs = [(pts, 0.14) for pts in PISTES]
    loin = lambda x, y, r: all(K.distance_au_trajet(x, y, pts) > r + rc + 0.05 for pts, rc in couloirs)

    def libre(x, y, r, dans=True):
        if dans and not dedans_du_fort(x, y, r + 0.05):
            return False
        if not loin(x, y, r):
            return False
        return all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for _, _, p in SOL) and all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for _, p in emprises)

    etape("le terrain")
    n, R = (48 if leger else 80), R_SOL
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
    L.ajouter(sommets, faces, "sol_fort", uv=uvs)
    L.regrouper(debut_sol, None, 4, 0.75)
    falaise(L, 9 if leger else 6)

    etape("les remparts")
    remparts(L, lots, ponts, leger)  # (leurs pans se touchent aux angles : ils ne vont pas dans les emprises)
    for s in (-1, 1):  # les lanternes de la porte
        A.lanterne(L, U, (s * 0.48, y_porte - EP_MUR - 0.06, Z_P + 0.62), True, 0.1)

    etape("l'escalier et le port")
    marches(L, 0.0, y_bas, y_haut, 2 * DEMI_RAMPE, 9 if leger else 13)
    SOL.append(("decor", "l'escalier", Vf.rectangle(0.0, (y_bas + y_haut) / 2, 2 * DEMI_RAMPE, y_haut - y_bas, PI / 2)))
    Rf.tablier(L, quai_mer, quai_terre, Z_B, Z_B, 0.55)
    lg = quai_terre[1] - quai_mer[1]
    for t in (0.12, 0.45, 0.78):
        for s in (-1, 1):
            L.ajouter(*N.cylindre(0.04, 0.034, Z_B + 0.95, 6, haut=False), "planches_sombres", T(quai_mer[0] + s * 0.23, quai_mer[1] + lg * t, -0.95))
    quai = Vf.rectangle(0.0, (quai_mer[1] + quai_terre[1]) / 2, lg, 0.55, PI / 2)
    emprises.append(("le quai", quai))
    ponts.append(quai)
    P.banniere(lots, quai_mer[0] + 0.36, quai_mer[1] + 0.25, -0.3, 1.75, "rose", math.radians(100))
    P.lampadaire(L, U, quai_mer[0] - 0.2, quai_mer[1] + 0.2, Z_B)
    # le brick des corsaires, à l'amarre le long du quai
    W, Wv = N.Maille("brick"), N.Maille("brick_vitres")
    P.caboteur(W, Wv, rng, 0.0, 0.0, 0.0, 2.0, "toile_ecrue", "peint_rouge")
    A.fondre(L, W, T(quai_mer[0] + 0.8, quai_mer[1] + 0.4, 0.0) @ Rz(PI / 2))
    A.fondre(V, Wv, T(quai_mer[0] + 0.8, quai_mer[1] + 0.4, 0.0) @ Rz(PI / 2))
    # la jetée de pierre à l'ouest et sa tour ; la chaîne tendue jusqu'au rocher de l'est
    ja, jb = vers(-116, -0.2), vers(-110, -3.4)  # (la chaîne ferme le port au large du brick, sans le toucher)
    L.ajouter(*N.polygone(Vf.rectangle((ja[0] + jb[0]) / 2, (ja[1] + jb[1]) / 2, math.dist(ja, jb), 0.42, math.atan2(jb[1] - ja[1], jb[0] - ja[0])), -0.6, Z_B + 0.05), "pierre_fort")
    L.ajouter(*N.cylindre(0.32, 0.36, Z_B + 1.25, 12, haut=True), "pierre_fort", T(jb[0], jb[1], -0.6))
    v, f = N.toit_pointe(0.36, 0.42, 12, 0.04, 0.0)
    L.ajouter(v, f, "tuiles_rouges", T(jb[0], jb[1], Z_B + 0.68))
    U.ajouter(*N.sphere(0.07, 8, 6), "lumiere", T(jb[0], jb[1], Z_B + 0.55))  # le fanal
    rc_ = vers(-70, -3.4)
    A.rocher(L, rng, rc_[0], rc_[1], -0.3, 0.45, "roche")
    L.ajouter(*N.cylindre(0.12, 0.12, 0.85, 8), "fonte", T(rc_[0], rc_[1], -0.2))
    # sur la jetée : un parapet du côté du large, des bittes d'amarrage
    dj = np.array(jb) - np.array(ja)
    lj = float(np.linalg.norm(dj))
    gauche = np.array((-dj[1], dj[0])) / lj  # (vers le port)
    cp = (np.array(ja) + np.array(jb)) / 2 - gauche * 0.16
    L.ajouter(*N.polygone(Vf.rectangle(cp[0], cp[1], lj - 0.3, 0.1, math.atan2(dj[1], dj[0])), Z_B + 0.04, Z_B + 0.24), "pierre_fort")
    for t in (0.3, 0.55, 0.8):
        q = np.array(ja) + dj * t + gauche * 0.1
        L.ajouter(*N.cylindre(0.05, 0.045, 0.16, 8, haut=True), "fonte", T(q[0], q[1], Z_B + 0.04))
        L.ajouter(*N.cylindre(0.065, 0.065, 0.03, 8, haut=True), "fonte", T(q[0], q[1], Z_B + 0.2))
    # la grosse chaîne : de vrais maillons, un sur deux à plat, qui pendent entre la tour et le rocher
    pts_ch = [np.array((jb[0] + (rc_[0] - jb[0]) * t, jb[1] + (rc_[1] - jb[1]) * t, 0.55 - 0.5 * 4 * t * (1 - t))) for t in np.linspace(0, 1, 201)]
    cum = [0.0]
    for a_, b_ in zip(pts_ch, pts_ch[1:]):
        cum.append(cum[-1] + float(np.linalg.norm(b_ - a_)))
    pas_m, lm, wm, rm = (0.28, 0.34, 0.2, 0.028) if leger else (0.19, 0.24, 0.14, 0.022)
    nm = int(cum[-1] / pas_m)
    for k in range(nm):
        s_ = (k + 0.5) * cum[-1] / nm
        i = min(len(cum) - 2, max(0, int(np.searchsorted(cum, s_)) - 1))
        u = (s_ - cum[i]) / max(1e-9, cum[i + 1] - cum[i])
        c = pts_ch[i] + (pts_ch[i + 1] - pts_ch[i]) * u
        d = (pts_ch[i + 1] - pts_ch[i]) / max(1e-9, cum[i + 1] - cum[i])
        h_ = np.cross(d, (0.0, 0.0, 1.0))
        h_ = h_ / np.linalg.norm(h_)
        nrm = np.cross(h_, d) if k % 2 else h_
        boucle = [tuple(c + d * (lm / 2 - rm) * math.cos(th) + nrm * (wm / 2 - rm) * math.sin(th)) for th in np.linspace(0, 2 * PI, 9)]
        L.ajouter(*N.tube(boucle, rm, 4, bouts=False), "fonte")

    for k in range(10 if leger else 22):
        x, y = vers(rng.random() * 360, 0.15 + rng.random() * 1.1)
        if abs(math.degrees(math.atan2(y, x)) + 90) > 28 and libre(x, y, 0.2, False) and terrain(x, y) > 0.05:
            A.rocher(L, rng, x, y, terrain(x, y) - 0.06, 0.16 + 0.2 * rng.random(), "roche")
            SOL.append(("rocher", "un rocher", Vf.rond(x, y, 0.18)))
    for k, (g, cap) in enumerate(((-140, 0.6), (-35, 2.4), (150, 4.0))[: 1 if leger else 3]):
        x, y = vers(g, 0.35)
        if libre(x, y, 0.4, False):
            P.barque(L, rng, x, y, cap, 0.7)
            SOL.append(("decor", "une barque tirée au sec", Vf.rectangle(x, y, 0.75, 0.32, cap)))

    etape("l'enceinte")
    emprises.append(("le donjon", donjon(L, V, U, lots, rng, 0.0, 0.85, Z_P)))
    SOL.append(("decor", "la caserne", batiment(L, V, rng, -1.45, 0.35, Z_P, math.radians(-62), 1.5, 0.6, 0.45, 0.3, fenetres=5)))
    P.cheminee(L, T(-1.45, 0.35, Z_P) @ Rz(math.radians(-62)), 0.5, 0.12, 0.6, 0.3, 0.12)
    SOL.append(("decor", "la poudrière", batiment(L, V, rng, 1.45, 0.3, Z_P, math.radians(62), 0.8, 0.55, 0.32, 0.22, "pierres_claires", "ardoises", 1)))
    for x, y in ((-0.85, -1.15), (0.9, -1.2), (0.55, 2.05), (-0.6, 2.05))[: 2 if leger else 4]:
        if libre(x, y, 0.15):
            boulets(L, x, y, terrain(x, y))
            SOL.append(("decor", "des boulets", Vf.rond(x, y, 0.15)))
    xp, yp = -0.45, -0.25
    if libre(xp, yp, 0.2):
        L.ajouter(*N.cylindre(0.17, 0.17, 0.24, 12, haut=False), "pierres", T(xp, yp, Z_P - 0.04))
        L.ajouter(*N.cylindre(0.14, 0.14, 0.02, 12, bas=False), "eau_bassin", T(xp, yp, Z_P + 0.12))
        SOL.append(("decor", "le puits", Vf.rond(xp, yp, 0.2)))
    for x, y in ((1.9, -0.6), (-1.9, -0.7), (0.0, 2.3))[: 2 if leger else 3]:
        if libre(x, y, 0.06):
            P.lampadaire(L, U, x, y, Z_P)
            SOL.append(("rocher", "une lanterne", Vf.rond(x, y, 0.06)))

    etape("les corsaires")
    for k, (x, y, cap) in enumerate(((0.5, -0.45, 2.0), (-0.95, 1.4, 0.3), (1.0, 1.3, 3.5), (quai_terre[0] + 0.5, quai_terre[1] + 0.25, 1.2)) [: 2 if leger else 4]):
        if (k == 3 and libre(x, y, 0.07, False)) or (k < 3 and libre(x, y, 0.07)):
            P.passant(L, rng, x, y, angle=cap, z=terrain(x, y))
            SOL.append(("passant", "un corsaire", Vf.rond(x, y, 0.065)))
    pts = trace()
    i_c = 9  # la courtine entre le bastion de l'est et celui du nord : la sentinelle y fait les cent pas
    a_, b_ = np.array(pts[i_c]), np.array(pts[i_c + 1])
    cap_c = math.atan2(*(b_ - a_)[::-1])
    nx, ny = math.sin(cap_c), -math.cos(cap_c)
    ronde = [(float(p[0] - nx * EP_MUR * 0.62), float(p[1] - ny * EP_MUR * 0.62), Z_P + H_MUR + 0.01) for p in (a_ + (b_ - a_) * 0.12, b_ - (b_ - a_) * 0.12)]
    chemins = [
        (K.suivre([quai_mer] + montee, sol, 0.2), False, 0.14, 0.0, 4.0),
        (K.suivre(place, sol, 0.2), False, 0.13, 0.5, 3.0),
        (ronde, False, 0.1, 0.3, 2.0),
    ]
    for pts_, *_ in chemins[:2]:
        for k, q in enumerate(pts_):
            if bord(q[0], q[1]) < 0.45 and abs(q[0]) < 0.3:
                pts_[k] = (q[0], q[1], Z_B + 0.02)
    types = []
    for k in range(2):
        Pm = N.Maille(f"marcheur{k}")
        P.passant(Pm, rng, 0, 0, angle=0.0, z=0.0, marcheur=True, tient=("planches_sombres", None)[k])
        types.append(Pm)
    deja = {}
    for k, (pts_, rond, vit, depart, pause) in enumerate(chemins[:2] if leger else chemins):
        extras = {"anim": "marche", "chemin": [float(c) for p in pts_ for c in p], "vitesse": vit, "phase": depart, "saut": 0.02, "pause": pause}
        t_ = k % 2
        if t_ not in deja:
            deja[t_] = len(lots["animes"])
            lots["animes"].append((types[t_], pts_[0], extras))
        else:
            lots["copies"].append((deja[t_], pts_[0], extras))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "fumees", "points": [float(c) for p in P.CHEMINEES for c in p], "grosseur": 0.4}))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "mer", "rayon": 8.4, "genre": 2}))
    lots["reperes"].append(((0.0, 0.0, Z_P + 2.2), {"anim": "oiseaux", "nb": 3 if leger else 5, "rayon": 4.2}))

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
    rendus = [("forteresse-v5", (1.0, -30.0, 17.0), (0.0, 0.0, 1.6), 50), ("forteresse-v5-porte", (2.5, -8.5, 3.6), (0.0, -2.2, 1.8), 40)] if rendu else []
    return K.construire("ile-forteresse-v5", lots, verifier(lots), rendus, cuire, exporter, taille or (2048 if leger else 3072), echantillons, leger, alleger, atlas="forteresse")
