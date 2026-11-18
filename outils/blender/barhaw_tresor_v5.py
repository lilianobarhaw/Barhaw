# L'Île au Trésor de Barhaw, « niveau 5 » : la dernière île de la route. Tout est inventé.
# EN CHANTIER (18/11) : le terrain, le plan et les grandes pièces sont posés ; il reste les détails, la cascade, les
# textures fines, l'essai dans Blender et la cuisson. L'île n'est PAS encore dans ILES_V5 (site.js).
#
# L'idée : un croissant de sable clair et de cocotiers autour d'un lagon ouvert au sud. Au milieu, dans la clairière, la
# Croix Rouge (« la croix rouge sur la carte : le trésor de la commu est là ») : deux longues bandes de planches peintes en
# rouge, posées en croix sur le sable, qu'on voit du ciel. À leur croisement, la Fosse : le trou qu'on a creusé, le Grand
# Coffre ouvert qui déborde d'or, les pelles, les tas de sable, la chèvre de bois qui remonte un petit coffre. Autour : le
# camp des chercheurs (trois tentes, le feu, la table de la carte), la jetée du lagon et son canot, l'épave du galion
# sur la plage de l'ouest, le Mont du Butin au nord. La vie : ceux qui portent le butin de la Fosse à la jetée, ceux qui
# creusent, les crabes, la fumée du feu, l'or qui scintille (effet « etincelles »), les mouettes.
# Sorties (plus tard) : ile-tresor-v5.glb (+ -leger) et son atlas .png. Contrôle du plan : verifier().
import math, random
import numpy as np
import barhaw_niveau5 as N
import barhaw_verif as Vf
import barhaw_ile_v5 as K
import barhaw_port_v5 as P
import barhaw_arbre_v5 as A
import barhaw_vents_v5 as Vt
import barhaw_ambre_v5 as Am
import barhaw_phare_v5 as Ph
import barhaw_plage_v5 as Pl

PI = math.pi
T, Rz, Rx, Ry = N.T, N.Rz, N.Rx, N.Ry
_ecart = Ph._ecart

R_SOL = 10.0  # le sol de l'île est peint d'un seul tenant, de -R_SOL à R_SOL
LAGON = math.radians(-90)  # le lagon s'ouvre au sud
MONT, R_MONT, H_MONT = (0.9, 4.1), 2.3, 3.2  # le Mont du Butin, au nord
CROIX, R_CLAIRIERE, Z_CLAIRIERE = (-0.1, 0.9), 2.5, 0.78  # la clairière de la Croix Rouge
BRAS = 2.15  # la demi-longueur d'une bande de la croix
CAMP = (-3.7, 1.2)  # le camp des chercheurs, à l'ouest de la clairière
TENTES = [(-4.6, 2.25, math.radians(-35)), (-5.05, 0.55, math.radians(10)), (-2.75, 2.95, math.radians(-70))]
EPAVE, CAP_EPAVE = (-6.1, -2.3), math.radians(115)  # le galion, sur la plage de l'ouest


def rivage(th):
    """Le rayon de la côte dans cette direction : un croissant, le lagon au sud entre deux bras de sable."""
    lagon = 4.3 * math.exp(-((_ecart(th, LAGON) / 0.5) ** 4))  # un fond rond, des bords francs
    bras = 1.0 * math.exp(-((_ecart(th, math.radians(-131)) / 0.2) ** 2)) + 1.1 * math.exp(-((_ecart(th, math.radians(-49)) / 0.2) ** 2))
    return 7.3 + 0.5 * math.sin(2 * th + 0.4) + 0.3 * math.sin(3 * th + 2.0) + 0.22 * math.sin(5 * th + 1.1) - lagon + bras


_COTE = np.array([(math.cos(a) * rivage(a), math.sin(a) * rivage(a)) for a in np.linspace(-PI, PI, 720, endpoint=False)])


def bord(x, y):
    """La vraie distance au bord de l'eau (au point de la côte le plus proche) ; > 0 : à terre."""
    d = float(np.sqrt(((_COTE - (x, y)) ** 2).sum(axis=1).min()))
    return d if math.hypot(x, y) < rivage(math.atan2(y, x)) else -d


def vers(angle, dedans):
    """Un point dans cette direction (degrés, 90 = le nord), à cette distance du bord de l'eau (vers l'intérieur)."""
    a = math.radians(angle)
    r = rivage(a) - dedans
    return math.cos(a) * r, math.sin(a) * r


JETEE_A, JETEE_B = np.array(vers(-90, 0.9)), np.array(vers(-90, -1.9))  # la jetée du lagon : du sable vers le large
ZQ = 0.42  # la hauteur de son plancher


def mont(x, y):
    """Le Mont du Butin : un dôme de roche, plus raide au sud (la falaise de la cascade, à venir)."""
    d = math.hypot(x - MONT[0], (y - MONT[1]) * (1.25 if y < MONT[1] else 0.9))
    crete = abs(K.bruit2(x * 1.9 + 3.1, y * 1.9, 5) - 0.5) * 2  # des arêtes et des ravines : pas un pain de sucre
    return H_MONT * max(0.0, 1 - (d / R_MONT) ** 2) ** 1.4 * (0.74 + 0.42 * crete)


def terrain(x, y):
    """La hauteur du sol : la plage qui monte doucement, le plateau des cocotiers, la clairière bien plate, le Mont."""
    d = bord(x, y)
    if d < 0:
        return max(-1.5, 0.4 * d)
    h = 0.32 * (1 - math.exp(-d / 0.8)) + 0.52 * K.lisse(1.4, 3.6, d)
    h += (K.bruit2(x * 0.8, y * 0.8, 3) - 0.5) * 0.14 * K.lisse(0.9, 2.4, d)
    h += mont(x, y) * K.lisse(0.5, 1.6, d)
    plat = K.lisse(R_CLAIRIERE + 0.9, R_CLAIRIERE - 0.2, math.hypot(x - CROIX[0], y - CROIX[1]))
    camp = K.lisse(2.2, 1.1, math.hypot(x - CAMP[0], y - CAMP[1])) * (1 - plat)
    h = h * (1 - plat) + Z_CLAIRIERE * plat
    h = h * (1 - camp) + 0.8 * camp
    quai = K.lisse(1.05, 0.5, math.hypot(x - JETEE_A[0], y - JETEE_A[1]))  # le sable monte jusqu'au plancher de la jetée
    return h * (1 - quai) + (ZQ - 0.015) * quai


sol = terrain
PISTES = []  # les sentiers (remplis par mailles()), pour les peindre


def tx_sol_tresor(taille=2048, graine=511):
    """Le sol peint pixel par pixel : le sable clair de la plage (mouillé au bord, ridé par l'eau), le sous-bois des
    cocotiers (herbe, palmes tombées), la clairière de sable piétiné, les sentiers, la roche du Mont."""
    n = taille
    h = K.agrandir(K.champ(terrain, R_SOL, 200), n)
    d = K.agrandir(K.champ(bord, R_SOL, 200), n)
    piste = K.agrandir(K.champ(lambda x, y: min((K.distance_au_trajet(x, y, p) for p in PISTES), default=9.0), R_SOL, 240), n)
    roc = K.agrandir(K.champ(mont, R_SOL, 200), n)
    xs = (np.arange(n) + 0.5) / n * 2 * R_SOL - R_SOL
    X, Y = np.meshgrid(xs, xs)
    b1, b2, b3, fin = N.bruit(n, 7, 7, graine, 4), N.bruit(n, 28, 28, graine + 1, 3), N.bruit(n, 90, 90, graine + 2, 2), N.bruit(n, 256, 256, graine + 3, 1)
    grain = N.bruit(n, 640, 640, graine + 4, 1)
    rides = N.bruit(n, 18, 300, graine + 5, 2)
    sable = N.mel(N.hexa(0xf1dcc0), N.hexa(0xfaeedb), np.clip(0.2 + 0.6 * b2 + 0.3 * (b1 - 0.5), 0, 1)) * (0.94 + 0.1 * (fin - 0.5) + 0.1 * (grain - 0.5) + 0.06 * (rides - 0.5))[..., None]
    mouille = N.mel(N.hexa(0xcdb08e), N.hexa(0xdcc3a2), b3) * (0.95 + 0.1 * (grain - 0.5))[..., None]
    coul = N.mel(sable, mouille, N.lisse(0.55, 0.1, d + (b2 - 0.5) * 0.25))
    herbe = N.mel(N.hexa(0x5d9a3a), N.hexa(0x86b84a), np.clip(0.15 + 0.7 * b2 + 0.3 * (b3 - 0.5), 0, 1)) * (0.86 + 0.26 * (fin - 0.5) + 0.18 * (grain - 0.5))[..., None]
    herbe = N.mel(herbe, N.hexa(0x3f7a2e), N.lisse(0.55, 0.75, N.bruit(n, 14, 14, graine + 6, 3)) * 0.6)
    herbe = N.mel(herbe, N.hexa(0xb59a5a), N.lisse(0.7, 0.8, N.bruit(n, 60, 60, graine + 7, 2)) * 0.5)  # des palmes sèches, tombées
    clairiere = N.lisse(R_CLAIRIERE + 0.25, R_CLAIRIERE - 0.5, np.hypot(X - CROIX[0], Y - CROIX[1]) + (b2 - 0.5) * 0.5)
    m_h = N.lisse(1.5, 2.4, d + (b1 - 0.5) * 1.2 + (b2 - 0.5) * 0.4) * (1 - clairiere) * N.lisse(0.25, 0.1, roc)
    coul = N.mel(coul, herbe, m_h * 0.96)
    pietine = N.mel(N.hexa(0xdcc39c), N.hexa(0xecd9b8), b3) * (0.93 + 0.14 * (grain - 0.5))[..., None]
    coul = N.mel(coul, pietine, np.maximum(clairiere * 0.85, N.lisse(0.22, 0.08, piste + (b2 - 0.5) * 0.1) * N.lisse(0.5, 0.9, d) * 0.9))
    df, idf = Ph._fentes(n, 44, 44, graine + 10, 0.35)
    roche = N.mel(N.hexa(0x8d8478), N.hexa(0xb3a797), np.clip(0.15 + 0.5 * Ph._tirage(graine + 11, idf, 44 * 44) + 0.5 * b2, 0, 1)) * (0.9 + 0.22 * (b3 - 0.5) + 0.14 * (grain - 0.5))[..., None]
    roche = N.mel(roche, N.hexa(0x4a443c), N.lisse(0.05, 0.0, df) * 0.7)
    roche = N.mel(roche, N.hexa(0x6f9a44), N.lisse(0.6, 0.72, N.bruit(n, 20, 20, graine + 12, 3)) * 0.55)  # la mousse
    coul = N.mel(coul, roche, N.lisse(0.12, 0.5, roc + (b2 - 0.5) * 0.3))
    relief = np.clip(0.5 + 0.25 * (b3 - 0.5) + 0.2 * (fin - 0.5) + 0.1 * (rides - 0.5) * (1 - m_h) - 0.3 * N.lisse(0.05, 0.0, df) * N.lisse(0.12, 0.5, roc), 0, 1)
    return np.clip(coul, 0, 1).astype(np.float32), relief.astype(np.float32)


N.matiere("sol_tresor", tx_sol_tresor, 2 * R_SOL, 0.5, 0.92)


# --- les pièces ---
def tente(L, x, y, z, cap, mat="toile_tente_brune", lg=1.25, larg=1.0, h=0.82):
    """Une tente de toile : deux pans tendus sur une faîtière, deux fourches, l'entrée ouverte au bout (côté +x local)."""
    M = T(x, y, z) @ Rz(cap)
    a, b = (-lg / 2, 0, h), (lg / 2, 0, h)
    for s in (-1, 1):
        A.toile(L, [(-lg / 2, s * larg / 2, 0.0), (lg / 2, s * larg / 2, 0.0), b, a], [(0, 1, 2, 3)] if s < 0 else [(3, 2, 1, 0)], mat, M, ep=0.012)
    A.toile(L, [(-lg / 2, -larg / 2, 0.0), a, (-lg / 2, larg / 2, 0.0)], [(0, 1, 2)], mat, M, ep=0.012)  # le fond
    for xx in (-lg / 2 - 0.02, lg / 2 + 0.02):
        L.ajouter(*N.cylindre(0.022, 0.018, h + 0.1, 5), "poutre", M @ T(xx, 0, -0.02))
    L.ajouter(*N.poutre((-lg / 2 - 0.06, 0, h + 0.03), (lg / 2 + 0.06, 0, h + 0.03), 0.03), "poutre", M)
    return Vf.rectangle(x, y, lg + 0.1, larg + 0.1, cap)


def _couvercle(l, p, n=5):
    """Un demi-cylindre couché le long de x, le dos bombé vers +z, fermé aux deux bouts et dessous (faces vers le dehors)."""
    v, f = [], []
    for sx in (-l / 2, l / 2):
        for k in range(n + 1):
            a = PI * k / n
            v.append((sx, -math.cos(a) * p / 2, math.sin(a) * p / 2))
    m = n + 1
    for k in range(n):
        f.append((k, m + k, m + k + 1, k + 1))  # le dos
    for k in range(1, n):
        f.append((0, k, k + 1))  # le bout de gauche
        f.append((m, m + k + 1, m + k))  # le bout de droite
    f.append((0, n, m + n, m))  # le dessous
    return v, f


def coffre(L, U, M, l=0.5, p=0.34, h=0.3, ouvert=True, plein=True):
    """Un coffre de bois ferré : la caisse, les ferrures, le couvercle bombé (ouvert : relevé en arrière), l'or dedans."""
    L.ajouter(*N.boite(l, p, h), "planches_sombres", M @ T(0, 0, h / 2))
    for xx in (-l * 0.36, 0, l * 0.36):
        L.ajouter(*N.boite(0.035, p + 0.012, h + 0.01), "fer", M @ T(xx, 0, h / 2))
    Mc = M @ T(0, p / 2, h) @ Rx(math.radians(-112 if ouvert else 0)) @ T(0, -p / 2, 0)
    L.ajouter(*_couvercle(l, p), "planches_sombres", Mc)
    for xx in (-l * 0.36, 0, l * 0.36):
        L.ajouter(*_couvercle(0.035, p + 0.012), "fer", Mc @ T(xx, 0, 0.002))
    if plein:  # l'or : un tas qui dépasse du bord, des gemmes dedans
        U.ajouter(*N.sphere(min(l, p) * 0.56, 8, 5, 0.62), "or", M @ T(0, -0.01, h - 0.03))
        U.ajouter(*N.sphere(p * 0.3, 6, 4, 0.7), "or", M @ T(l * 0.24, -0.03, h + 0.0))
        U.ajouter(*N.sphere(p * 0.27, 6, 4, 0.7), "or", M @ T(-l * 0.25, 0.02, h - 0.01))
        for k, (gx, gy, mat) in enumerate(((0.08, -0.08, "vif_turquoise"), (-0.12, -0.04, "vif_rose"), (0.18, 0.04, "vif_violet"))):
            L.ajouter(*N.sphere(0.03, 4, 2), mat, M @ T(gx * l / 0.5, gy * p / 0.34, h + 0.13 - 0.03 * k))


def mailles(graine=377, leger=False):
    """leger : la version téléphone (un relief moins fin, moins de cocotiers et de monde)."""
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
    terre = lambda pts: K.suivre(pts, sol)

    # --- le plan : la jetée du lagon, les sentiers (la Fosse → la jetée, la Fosse → le camp, le camp → l'épave) ---
    pa, pb = JETEE_A, JETEE_B
    dp = (pb - pa) / np.linalg.norm(pb - pa)
    lg = float(np.linalg.norm(pb - pa))
    cap_j = math.atan2(dp[1], dp[0])
    bord_fosse = (CROIX[0] + 0.15, CROIX[1] - 0.95)
    butin = [(*(pa + dp * (lg - 0.5)), ZQ + 0.02), (*(pa + dp * 0.3), ZQ + 0.02)] + terre([tuple(pa - dp * 0.2), (0.25, -1.0), bord_fosse])
    vers_camp = terre([(CROIX[0] - 0.95, CROIX[1] + 0.1), (CROIX[0] - 2.1, CROIX[1] + 0.45), (CAMP[0] + 0.55, CAMP[1] + 0.1)])
    vers_epave = terre([(CAMP[0] - 0.1, CAMP[1] - 0.75), (-4.6, -0.9), (EPAVE[0] + 1.0, EPAVE[1] + 0.85)])
    chemins = [(butin, False, 0.16, 0.0, 4.0), (vers_camp, False, 0.15, 0.4, 4.0), (vers_epave, False, 0.14, 0.2, 5.0)]
    PISTES[:] = [butin[1:], vers_camp, vers_epave]
    couloirs = [(butin[1:], 0.12), (vers_camp, 0.12), (vers_epave, 0.12)]
    loin_des_sentiers = lambda x, y, r: all(K.distance_au_trajet(x, y, pts) > r + rc + 0.05 for pts, rc in couloirs)

    def libre(x, y, r):
        """Cette place est-elle à terre, hors des passages et de ce qui est déjà posé ?"""
        if terrain(x, y) < 0.16 or bord(x, y) < r + 0.12 or not loin_des_sentiers(x, y, r):
            return False
        return all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for _, _, p in SOL) and all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for _, p in emprises)

    etape("le terrain")
    n, R = (52 if leger else 76), R_SOL
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
    L.ajouter(sommets, faces, "sol_tresor", uv=uvs)
    L.regrouper(debut_sol, None, 4, 0.75)
    SOL.append(("decor", "le Mont du Butin", Vf.rond(MONT[0], MONT[1], R_MONT * 0.72, 16)))

    etape("la Croix Rouge")
    # --- la Croix Rouge : deux bandes de planches peintes, posées en croix sur le sable ; au croisement, la Fosse ---
    cx, cy, zc = CROIX[0], CROIX[1], Z_CLAIRIERE
    for cap in (PI / 4, -PI / 4):
        for s in (-1, 1):  # chaque bande s'arrête au bord de la Fosse
            for k in range(6):
                t = 0.72 + k * (BRAS - 0.72) / 5.4
                q = (cx + math.cos(cap) * s * t, cy + math.sin(cap) * s * t)
                L.ajouter(*N.boite(0.27, 0.46 + 0.05 * rng.random(), 0.03), "peint_rouge", T(q[0], q[1], zc + 0.012 + 0.006 * rng.random()) @ Rz(cap + (rng.random() - 0.5) * 0.09))
    # la Fosse : le rebord de sable rejeté, le fond sombre, le Grand Coffre ouvert qui déborde, les pelles
    L.ajouter(*N.cylindre(0.62, 0.74, 0.09, 12, haut=False), "sable_mouille", T(cx, cy, zc - 0.02))
    L.ajouter(*N.cylindre(0.6, 0.6, 0.012, 12, haut=True), "terre", T(cx, cy, zc - 0.01))
    coffre(L, U, T(cx, cy + 0.05, zc + 0.0) @ Rz(0.25), 0.62, 0.42, 0.36)
    for k in range(7 if leger else 12):  # l'or tombé autour du coffre
        a, d_ = rng.random() * 2 * PI, 0.36 + rng.random() * 0.2
        U.ajouter(*N.cylindre(0.028, 0.028, 0.012, 6, haut=True), "or", T(cx + math.cos(a) * d_, cy + math.sin(a) * d_, zc + 0.012))
    SOL.append(("decor", "la Fosse et le Grand Coffre", Vf.rond(cx, cy, 0.78, 12)))
    for a in (math.radians(100), math.radians(200), math.radians(335)):  # les tas de sable, une pelle plantée dans chacun
        q = (cx + math.cos(a) * 1.3, cy + math.sin(a) * 1.3)
        L.ajouter(*N.sphere(0.3, 8, 4, 0.5), "sable_rose", T(q[0], q[1], zc - 0.02))
        L.ajouter(*N.poutre((q[0], q[1], zc + 0.08), (q[0] + 0.08, q[1] + 0.03, zc + 0.62), 0.022), "poutre")
        L.ajouter(*N.boite(0.09, 0.012, 0.13), "fer", T(q[0] - 0.008, q[1] - 0.003, zc + 0.11))
        SOL.append(("decor", "un tas de sable", Vf.rond(q[0], q[1], 0.3)))

    # la chèvre : trois perches liées au-dessus de la Fosse, une poulie, un petit coffre qui remonte au bout de sa corde
    haut_chevre = (cx, cy, zc + 1.62)
    for a in (math.radians(75), math.radians(195), math.radians(315)):
        L.ajouter(*N.poutre((cx + math.cos(a) * 0.7, cy + math.sin(a) * 0.7, zc + 0.02), (cx - math.cos(a) * 0.06, cy - math.sin(a) * 0.06, haut_chevre[2] + 0.1), 0.04), "poutre")
    L.ajouter(*N.cylindre(0.07, 0.07, 0.05, 8, haut=True, bas=True), "corde", T(cx, cy, haut_chevre[2] - 0.05))
    Pc = N.Maille("petit_coffre")
    Pc.ajouter(*N.tube([(0, 0, 0), (0, 0, -0.52)], 0.012, 4, bouts=False), "corde")
    coffre(Pc, Pc, T(0, 0, -0.74) @ Rz(0.6), 0.3, 0.2, 0.18, ouvert=False, plein=False)
    lots["animes"].append((Pc, haut_chevre, {"anim": "balance", "axe": [0.6, 0.8, 0.0], "ampl": 0.05, "vitesse": 0.8, "phase": 0.3}))
    for k, (dx, dy) in enumerate(((-1.75, -0.55), (1.8, -0.35), (-0.4, 1.6), (1.45, 1.05))):  # les lanternes de la clairière
        if leger and k > 1:
            break
        P.lampadaire(L, U, cx + dx, cy + dy, zc, 0.66)
        SOL.append(("decor", "une lanterne", Vf.rond(cx + dx, cy + dy, 0.05)))

    etape("le camp")
    # --- le camp des chercheurs : trois tentes, le feu, des tonneaux, la table de la carte ---
    for k, (x, y, cap) in enumerate(TENTES):
        SOL.append(("decor", "une tente", tente(L, x, y, sol(x, y) - 0.02, cap, ("toile_tente_brune", "toile_tente_indigo", "toile_tente_rouge")[k])))
    feu = (CAMP[0] + 0.1, CAMP[1] + 0.2)
    zf = sol(*feu)
    for k in range(7):
        a = k * 2 * PI / 7
        L.ajouter(*N.sphere(0.06, 5, 3), "pierres_sombres", T(feu[0] + math.cos(a) * 0.19, feu[1] + math.sin(a) * 0.19, zf + 0.015))
    for k in range(3):
        a = k * PI / 3
        L.ajouter(*N.poutre((feu[0] - math.cos(a) * 0.15, feu[1] - math.sin(a) * 0.15, zf + 0.04), (feu[0] + math.cos(a) * 0.15, feu[1] + math.sin(a) * 0.15, zf + 0.09), 0.04), "bois_epave_sombre")
    U.ajouter(*N.sphere(0.07, 6, 4, 1.5), "feu", T(feu[0], feu[1], zf + 0.14))
    SOL.append(("decor", "le feu du camp", Vf.rond(feu[0], feu[1], 0.27)))
    tb = (CAMP[0] + 0.75, CAMP[1] - 0.55)
    zt = sol(*tb)
    L.ajouter(*N.boite(0.62, 0.4, 0.035), "planches_claires", T(tb[0], tb[1], zt + 0.3) @ Rz(0.3))
    for sx in (-1, 1):
        for sy in (-1, 1):
            L.ajouter(*N.cylindre(0.02, 0.02, 0.3, 4), "poutre", T(tb[0], tb[1], zt - 0.01) @ Rz(0.3) @ T(sx * 0.26, sy * 0.15, 0))
    L.ajouter(*N.boite(0.36, 0.26, 0.006), "toile_ecrue", T(tb[0], tb[1], zt + 0.322) @ Rz(0.42))  # la carte (sa croix rouge est à peindre)
    SOL.append(("decor", "la table de la carte", Vf.rectangle(tb[0], tb[1], 0.7, 0.48, 0.3)))

    etape("la jetée")
    # --- la jetée du lagon : des planches sur pilotis, le canot ---
    Mj = T(*((pa + pb) / 2), 0) @ Rz(cap_j)
    L.ajouter(*N.boite(lg + 0.3, 0.62, 0.06), "planches", Mj @ T(0, 0, ZQ - 0.03))
    for k in range(5):
        for s in (-1, 1):
            L.ajouter(*N.cylindre(0.04, 0.035, ZQ + 0.75, 5), "poutre", Mj @ T(-lg / 2 + 0.1 + k * (lg / 4), s * 0.27, -0.6))
    emprises.append(("la jetée", Vf.rectangle(*((pa + pb) / 2), lg + 0.3, 0.62, cap_j)))
    ponts.append(Vf.rectangle(*((pa + pb) / 2), lg + 0.3, 0.62, cap_j))
    bq = pa + dp * (lg * 0.55) + np.array((-dp[1], dp[0])) * 0.72
    Bq = N.Maille("canot")
    Ph.canot(Bq, Rz(cap_j + 0.1), 0.85)
    lots["animes"].append((Bq, (float(bq[0]), float(bq[1]), 0.02), {"anim": "flotte", "ampl": 0.02, "roulis": 0.03, "phase": 0.6}))

    # le butin qui attend d'embarquer : deux coffres fermés et des sacs, sur le plancher, côté ouest
    cote_o = np.array((dp[1], -dp[0]))
    for k, t in enumerate((0.25, 0.42)):
        q = pa + dp * (lg * t) + cote_o * 0.225
        coffre(L, U, T(q[0], q[1], ZQ) @ Rz(cap_j + 0.08 * k), 0.24, 0.15, 0.15, ouvert=False, plein=False)
    for k in range(3):
        q = pa + dp * (lg * (0.56 + 0.07 * k)) + cote_o * (0.215 + 0.02 * (k % 2))
        L.ajouter(*N.sphere(0.07, 6, 4, 1.15), "toile_ecrue", T(q[0], q[1], ZQ + 0.065))

    etape("l'épave")
    # --- l'épave du galion, échouée sur la plage de l'ouest ---
    ze = sol(*EPAVE)
    Am.epave(L, rng, T(EPAVE[0], EPAVE[1], ze - 0.12) @ Rz(CAP_EPAVE) @ Rx(0.28), 3.2, 1.05, 0.55, 0.14, leger)
    SOL.append(("decor", "l'épave du galion", Vf.rectangle(EPAVE[0], EPAVE[1], 3.4, 1.5, CAP_EPAVE)))

    etape("les cocotiers")
    # --- les cocotiers : sur tout le plateau, hors de la clairière, du camp et des passages ---
    nb, essais = 0, 0
    voulus = 9 if leger else 18
    while nb < voulus and essais < 900:
        essais += 1
        a = (nb + 0.5 + (rng.random() - 0.5) * 0.9) / voulus * 2 * PI  # un par secteur : tout le tour de l'île en a
        x, y = vers(math.degrees(a), 1.1 + rng.random() * 2.6)
        if (y < CROIX[1] - 0.3 and abs(x - CROIX[0]) < 2.3) or bord(x, y) < 0.9 or mont(x, y) > 0.5 or math.hypot(x - CROIX[0], y - CROIX[1]) < R_CLAIRIERE + 0.35 or math.hypot(x - CAMP[0], y - CAMP[1]) < 1.5 or not libre(x, y, 0.16):
            continue
        Pl.palmier(L, rng, x, y, 2.1 + rng.random() * 1.2, 0.3 + rng.random() * 0.6, rng.random() * 2 * PI, leger or nb >= 5, z=sol(x, y))  # cinq cocotiers fournis, les autres plus simples
        SOL.append(("arbre", "un cocotier", Vf.rond(x, y, 0.13)))
        nb += 1

    etape("le sous-bois")
    # --- le sous-bois : des buissons en fleur, des herbes hautes, des rochers au pied du Mont ---
    for k in range(5 if leger else 12):
        for _ in range(30):
            a = rng.random() * 2 * PI
            x, y = vers(math.degrees(a), 1.9 + rng.random() * 2.4)
            if math.hypot(x - CROIX[0], y - CROIX[1]) > R_CLAIRIERE + 0.4 and mont(x, y) < 0.3 and libre(x, y, 0.3):
                A.buisson(L, rng, x, y, sol(x, y) - 0.03, 0.22 + rng.random() * 0.12, ("fleur_rouge", "fleur_jaune", None, "fleur_blanche")[k % 4])
                SOL.append(("rocher", "un buisson", Vf.rond(x, y, 0.26)))
                break
    for k in range(6 if leger else 14):
        a = rng.random() * 2 * PI
        x, y = vers(math.degrees(a), 1.6 + rng.random() * 2.2)
        if math.hypot(x - CROIX[0], y - CROIX[1]) > R_CLAIRIERE + 0.2 and mont(x, y) < 0.3 and libre(x, y, 0.1):
            Vt.herbes(L, rng, x, y, sol(x, y), 5)
    for k in range(4 if leger else 8):
        a = math.radians(200 + k * 44 + rng.random() * 20)
        x, y = MONT[0] + math.cos(a) * (R_MONT * (0.92 + 0.14 * rng.random())), MONT[1] + math.sin(a) * (R_MONT * (0.8 + 0.12 * rng.random()))
        r = 0.2 + rng.random() * 0.2
        if bord(x, y) > 0.6 and libre(x, y, r):
            A.rocher(L, rng, x, y, sol(x, y) - 0.05, r, "roche_claire")
            SOL.append(("rocher", "un rocher du Mont", Vf.rond(x, y, r)))

    etape("les habitants")
    # --- ceux qui restent sur place ---
    def poser(x, y, zz=None, cap=None, **plus):
        if zz is None and not libre(x, y, 0.07):
            return
        P.passant(L, rng, x, y, angle=cap, z=sol(x, y) if zz is None else zz, **plus)
        SOL.append(("passant", "un chercheur", Vf.rond(x, y, 0.065)))

    poser(cx - 0.98, cy - 0.35, None, 0.3, leve=1)  # il a trouvé !
    poser(cx + 1.0, cy + 0.45, None, PI + 0.4)
    poser(feu[0] + 0.5, feu[1] + 0.25, None, PI + 0.5)
    poser(tb[0] - 0.1, tb[1] - 0.42, None, PI / 2)  # penché sur la carte

    etape("la vie")
    types = []
    for k in range(3):
        Pm = N.Maille(f"marcheur{k}")
        P.passant(Pm, rng, 0, 0, angle=0.0, z=0.0, marcheur=True)
        types.append(Pm)
    deja = {}
    for k, (pts, rond, vit, depart, pause) in enumerate(chemins):
        extras = {"anim": "marche", "chemin": [float(c) for p in pts for c in p], "vitesse": vit, "phase": depart, "saut": 0.02, "pause": pause}
        t_ = k % len(types)
        if t_ not in deja:
            deja[t_] = len(lots["animes"])
            lots["animes"].append((types[t_], pts[0], extras))
        else:
            lots["copies"].append((deja[t_], pts[0], extras))
    # les crabes de la plage : ils vont et viennent le long de l'eau
    Cr = Pl.crabe()
    premier = None
    for k, (a0, a1, depart) in enumerate(((-160, -146, 0.0), (-20, -34, 0.5), (150, 138, 0.3))[:1 if leger else 3]):
        pts = terre([vers(a0 + (a1 - a0) * t / 3, 0.45 + 0.12 * (t % 2)) for t in range(4)])
        extras = {"anim": "marche", "chemin": [float(c) for p in pts for c in p], "vitesse": 0.09, "phase": depart, "saut": 0.0, "pause": 2.5, "rayon": 0.04}
        if premier is None:
            premier = len(lots["animes"])
            lots["animes"].append((Cr, pts[0], extras))
        else:
            lots["copies"].append((premier, pts[0], extras))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "fumees", "points": [float(feu[0]), float(feu[1]), float(zf + 0.25)], "grosseur": 0.45}))
    lots["reperes"].append(((0.5, 0.5, 4.6), {"anim": "oiseaux", "nb": 3 if leger else 6, "rayon": 5.0, "envergure": 0.13}))
    lots["reperes"].append(((float(cx), float(cy), float(zc + 0.5)), {"anim": "etincelles"}))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "mer", "rayon": 8.6, "genre": 2}))

    etape("sur l'eau")
    Rv = N.Maille("rivage")
    cote = [(_COTE[i % 720][0], _COTE[i % 720][1]) for i in range(0, 724, 4)]
    K.bande(Rv, [(x * 0.995, y * 0.995) for x, y in cote], [(x * (1 + 0.9 / math.hypot(x, y)), y * (1 + 0.9 / math.hypot(x, y))) for x, y in cote], mat="ecume", boucle=True)
    K.tache(Rv, *((pa + pb) / 2 + dp * 0.3), lg - 0.6, 0.62, cap_j)
    lots["libres"].append((Rv, (0.0, 0.0, 0.0), {"role": "decor"}))
    etape("fin")
    lots["plan"] = {"emprises": emprises, "sol": SOL, "ponts": ponts}
    return lots


def verifier(lots=None, leger=False):
    """Les erreurs de plan (voir barhaw_ile_v5.controler) : une liste vide quand tout va bien."""
    return K.controler(lots or mailles(leger=leger), sol)


def construire(rendu=True, cuire=True, exporter=True, taille=None, echantillons=48, leger=False, alleger=True):
    lots = mailles(leger=leger)
    rendus = [("tresor-v5", (1.0, -30.5, 17.5), (0.0, 0.2, 1.4), 50), ("tresor-v5-croix", (-4.5, -9.5, 6.0), (-0.1, 0.9, 0.8), 55)] if rendu else []
    return K.construire("ile-tresor-v5", lots, verifier(lots), rendus, cuire, exporter, taille or (2048 if leger else 3072), echantillons, leger, alleger, atlas="tresor")
