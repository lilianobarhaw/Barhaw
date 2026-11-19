# L'Île-Horloge, « niveau 5 » : une île-mécanique, posée sur ses engrenages.
# (Son histoire, dans le bot : « Des engrenages géants qui tournent sous l'île : on entend le tic-tac jusqu'au navire. »)
# L'idée : un plateau de pierre aux falaises droites, comme le boîtier d'une montre. Dans les falaises, la mécanique de
# l'île sort au grand jour : des roues dentées géantes, deux par deux (elles s'engrènent et tournent en sens contraires),
# et à l'est, dans une fente de la falaise, le grand balancier qui bat la mesure. Sur le plateau, le village des
# horlogers autour de la Tour de l'Horloge (ses cadrans donnent la vraie heure de Paris, sa cloche se balance), des
# tuyaux de cuivre qui courent sur les toits et le long des falaises, des évents qui crachent de la vapeur. On monte du
# débarcadère par l'escalier taillé dans la falaise du sud. Tout est inventé.
# La vie : les horlogers vont et viennent, le remonteur fait le tour de la place, les engrenages tournent, le balancier
# bat, la cloche sonne, la vapeur monte. La nuit : les lanternes de la place, les fenêtres des ateliers, le cadran éclairé.
import math, random
import numpy as np
import barhaw_niveau5 as N
import barhaw_verif as Vf
import barhaw_ile_v5 as K
import barhaw_port_v5 as P
import barhaw_arbre_v5 as A
import barhaw_recif_v5 as Rf

PI = math.pi
T, Rz, Rx, Ry = N.T, N.Rz, N.Rx, N.Ry

R_SOL = 10.0
Z_P = 1.45  # le plateau
Z_B = 0.38  # le pied des falaises (la grève de rochers)
TOUR = (0.0, 0.7)  # la Tour de l'Horloge
R_PLACE = 1.75  # la place pavée autour de la tour
DEMI_RAMPE = 0.42  # l'escalier du sud
PISTES = []

N.matiere("laiton", N.tx_uni, 0.6, 0.4, rugueux=0.35, metal=0.7, c=0xc9a24a, graine=901, grain=0.15, taches=0.35, c2=0x9c7a32, seuil=0.55)
N.matiere("acier_noir", N.tx_uni, 0.6, 0.4, rugueux=0.45, metal=0.6, c=0x3d3f44, graine=902, grain=0.2, taches=0.3, c2=0x2c2d31, seuil=0.55)
N.matiere("falaise_horloge", N.tx_pierres, 1.4, 1.0, c=0xa49680, rangs=5, graine=903, mortier=0x6c6253, mousse=0.12)


def rivage(th):
    sud = math.exp(-(((th + PI / 2 + PI) % (2 * PI) - PI) / 0.5) ** 2)  # la grève s'élargit au pied de l'escalier
    return 6.7 + 0.35 * math.sin(2 * th + 0.8) + 0.25 * math.sin(3 * th + 2.6) + 0.15 * math.sin(5 * th + 1.3) + 0.45 * sud


_COTE = np.array([(math.cos(a) * rivage(a), math.sin(a) * rivage(a)) for a in np.linspace(-PI, PI, 720, endpoint=False)])


def bord(x, y):
    d = float(np.sqrt(((_COTE - (x, y)) ** 2).sum(axis=1).min()))
    return d if math.hypot(x, y) < rivage(math.atan2(y, x)) else -d


def vers(angle, dedans):
    a = math.radians(angle)
    r = rivage(a) - dedans
    return math.cos(a) * r, math.sin(a) * r


def r_plat(a):
    """Le rayon du plateau (le haut des falaises) dans cette direction."""
    sud = math.exp(-(((a + PI / 2 + PI) % (2 * PI) - PI) / 0.4) ** 2)  # une échancrure au sud, pour l'escalier
    return 4.55 + 0.22 * math.sin(3 * a + 0.4) + 0.12 * math.sin(5 * a + 2.0) - 0.35 * sud


def rampe(y):
    """La hauteur de l'escalier du sud, de la grève (au sud) au plateau (au nord)."""
    y0, y1 = -r_plat(-PI / 2) - 1.35, -r_plat(-PI / 2) + 0.45
    return Z_B + (Z_P - Z_B) * min(1.0, max(0.0, (y - y0) / (y1 - y0)))


def terrain(x, y):
    """La grève de rochers au pied des falaises, la falaise droite, le plateau ; au sud, l'escalier."""
    d = bord(x, y)
    if d < 0:
        return max(-1.5, 0.45 * d)
    rr, a = math.hypot(x, y), math.atan2(y, x)
    bas = Z_B * K.lisse(0.0, 0.8, d) + (K.bruit2(x * 0.9, y * 0.9, 21) - 0.5) * 0.1 * K.lisse(0.3, 1.0, d)
    haut = Z_P + (K.bruit2(x * 0.6, y * 0.6, 22) - 0.5) * 0.04
    plateau = K.lisse(r_plat(a) + 0.12, r_plat(a) - 0.06, rr)
    h = bas + (haut - bas) * plateau
    dans_rampe = K.lisse(DEMI_RAMPE + 0.18, DEMI_RAMPE, abs(x)) if y < 0 else 0.0
    if dans_rampe > 0 and rr > r_plat(a) - 0.6:
        h = h + (rampe(y) - h) * dans_rampe
    return h


sol = terrain


def tx_sol_horloge(taille=2048, graine=911):
    """Le sol : la grève de rochers et de galets au pied des falaises ; sur le plateau, l'herbe rase et le trèfle, la roche
    nue au bord, la place pavée autour de la tour et les rues pavées."""
    n = taille
    h = K.agrandir(K.champ(terrain, R_SOL, 240), n)
    gy, gx = np.gradient(h)
    pente = np.hypot(gx, gy) * n / (2 * R_SOL)
    piste = K.agrandir(K.champ(lambda x, y: min((K.distance_au_trajet(x, y, p) for p in PISTES), default=9.0), R_SOL, 240), n)
    b1, b2, b3, fin = N.bruit(n, 7, 7, graine, 4), N.bruit(n, 30, 30, graine + 1, 3), N.bruit(n, 96, 96, graine + 2, 2), N.bruit(n, 256, 256, graine + 3, 1)
    grain = N.bruit(n, 600, 600, graine + 4, 1)
    greve = N.mel(N.hexa(0x8c8478), N.hexa(0xb9ae98), np.clip(0.3 + 0.8 * (grain - 0.5) + 0.4 * (b2 - 0.5), 0, 1))
    herbe = N.mel(N.hexa(0x5f8c45), N.hexa(0x8db462), np.clip(0.1 + 0.7 * b2 + 0.3 * (b1 - 0.5), 0, 1)) * (0.88 + 0.22 * (fin - 0.5))[..., None]
    coul = N.mel(greve, herbe, N.lisse(Z_P - 0.35, Z_P - 0.1, h))
    roche = N.mel(N.hexa(0x8f8574), N.hexa(0xb3a690), np.clip(0.2 + 0.7 * b3, 0, 1)) * (0.86 + 0.28 * (fin - 0.5))[..., None]
    coul = N.mel(coul, roche, N.lisse(0.6, 1.2, pente))
    gx_, gy_ = N.grille(n)
    X, Y = (gx_ * 2 - 1) * R_SOL, (gy_ * 2 - 1) * R_SOL
    rr = np.hypot(X - TOUR[0], Y - TOUR[1])
    # les pavés : des rangées décalées (pas de cellules : trop lent), plus clairs sur la place
    v_ = gy_ * 2 * R_SOL / 0.16
    u_ = gx_ * 2 * R_SOL / 0.22 + 0.5 * (np.floor(v_) % 2)
    dj = np.minimum(1 - 2 * np.abs((u_ % 1) - 0.5), 1 - 2 * np.abs((v_ % 1) - 0.5)).astype(np.float32)
    ident = (np.floor(u_) * 7 + np.floor(v_) * 13).astype(np.int64)
    pave = N.mel(N.hexa(0x9a8f80), N.hexa(0xc2b8a6), ((ident % 5) / 4.0).astype(np.float32)) * (0.94 + 0.12 * (grain - 0.5))[..., None]
    pave = N.mel(pave, N.hexa(0x5b5247), N.lisse(0.12, 0.0, dj)[..., None] * 0.75)
    pavé = np.maximum(N.lisse(R_PLACE + 0.1, R_PLACE - 0.05, rr), N.lisse(0.3, 0.2, piste)) * N.lisse(Z_P - 0.25, Z_P - 0.1, h)
    coul = N.mel(coul, pave, pavé)
    trefle = N.lisse(0.93, 0.97, N.bruit(n, 240, 240, graine + 7, 1)) * N.lisse(Z_P - 0.1, Z_P, h) * (1 - pavé)
    coul = N.mel(coul, N.hexa(0xf2efe2), trefle * 0.6)
    relief = np.clip(0.5 + 0.2 * (b3 - 0.5) + 0.15 * (fin - 0.5) - 0.3 * N.lisse(0.12, 0.0, dj) * pavé, 0, 1)
    return np.clip(coul, 0, 1).astype(np.float32), relief.astype(np.float32)


N.matiere("sol_horloge", tx_sol_horloge, 2 * R_SOL, 0.5, 0.9)


# --- les pièces ---
def roue_dentee(G, nd, r, ep, mat, M, rayons=5, moyeu="acier_noir"):
    """Une roue dentée (son axe : z local, dans le repère M) : une couronne dentée, le moyeu, les rayons."""
    out, inn = [], []
    d = 2 * PI / nd
    for k in range(nd):
        for fa, rr in ((0.0, 0.88), (0.16, 1.0), (0.46, 1.0), (0.62, 0.88)):
            a = k * d + fa * d
            out.append((math.cos(a) * r * rr, math.sin(a) * r * rr))
            inn.append((math.cos(a) * r * 0.72, math.sin(a) * r * 0.72))
    m = len(out)
    v = [(x, y, ep / 2) for x, y in out] + [(x, y, ep / 2) for x, y in inn] + [(x, y, -ep / 2) for x, y in out] + [(x, y, -ep / 2) for x, y in inn]
    f = [(m + k, k, (k + 1) % m, m + (k + 1) % m) for k in range(m)]  # dessus
    f += [(3 * m + (k + 1) % m, 2 * m + (k + 1) % m, 2 * m + k, 3 * m + k) for k in range(m)]  # dessous
    f += [(k, 2 * m + k, 2 * m + (k + 1) % m, (k + 1) % m) for k in range(m)]  # les dents
    f += [(m + (k + 1) % m, 3 * m + (k + 1) % m, 3 * m + k, m + k) for k in range(m)]  # le dedans de la couronne
    G.ajouter(v, f, mat, M)
    G.ajouter(*N.cylindre(r * 0.16, r * 0.16, ep * 1.6, 12), moyeu, M @ T(0, 0, -ep * 0.8))
    for k in range(rayons):
        a = k * 2 * PI / rayons
        G.ajouter(*N.poutre((math.cos(a) * r * 0.14, math.sin(a) * r * 0.14, 0), (math.cos(a) * r * 0.74, math.sin(a) * r * 0.74, 0), r * 0.09, ep * 0.7), mat, M)


def engrenage(lots, centre, a, r, sens, nd=None, ep=0.16, mat="laiton"):
    """Une roue de la mécanique de l'île, dressée dans la falaise face à la mer (son axe pointe vers le large) ; elle tourne
    (un objet à part) d'autant plus vite qu'elle est petite, dans le sens donné."""
    G = N.Maille("engrenage")
    nd = nd or max(10, int(r * 14))
    roue_dentee(G, nd, r, ep, mat, Rz(a) @ Ry(PI / 2), 5 if r > 0.7 else 4)
    lots["animes"].append((G, tuple(float(c) for c in centre), {"anim": "tourne", "axe": [math.cos(a), math.sin(a), 0.0], "vitesse": sens * 0.42 / r}))


def falaise(L, pas_deg=6):
    """Le parement des falaises : un mur de pierre en léger fruit tout autour du plateau (il cache le bord en escalier de
    la grille du terrain), ouvert au sud pour l'escalier."""
    ouverture = math.degrees(math.asin(min(0.99, (DEMI_RAMPE + 0.04) / r_plat(-PI / 2))))
    angles = [g for g in range(-90 + pas_deg, 270, pas_deg) if abs(g + 90) > ouverture and abs(g - 270) > ouverture]
    angles = [math.radians(g) for g in [-90 + ouverture] + angles + [270 - ouverture]]
    pt = lambda a, plus, z: (math.cos(a) * (r_plat(a) + plus), math.sin(a) * (r_plat(a) + plus), z)
    for a1, a2 in zip(angles[:-1], angles[1:]):
        L.ajouter([pt(a1, 0.02, Z_P + 0.06), pt(a1, 0.3, Z_B - 0.1), pt(a2, 0.3, Z_B - 0.1), pt(a2, 0.02, Z_P + 0.06)], [(0, 1, 2, 3)], "falaise_horloge")
        L.ajouter([pt(a1, -0.12, Z_P + 0.06), pt(a1, 0.02, Z_P + 0.06), pt(a2, 0.02, Z_P + 0.06), pt(a2, -0.12, Z_P + 0.06)], [(0, 1, 2, 3)], "pierres")  # la margelle
    for a in (angles[0], angles[-1]):  # les joues de l'escalier
        L.ajouter([pt(a, 0.02, Z_P + 0.06), pt(a, 0.3, Z_B - 0.1), pt(a, -0.6, Z_B - 0.1), pt(a, -0.6, Z_P + 0.06)], [(0, 1, 2, 3), (3, 2, 1, 0)], "falaise_horloge")


def marches(L, x, y0, y1, larg, nb):
    """L'escalier taillé dans la falaise : des blocs pleins ; le dessus de chaque marche affleure la rampe en son milieu."""
    pied = terrain(x, y0) - 0.3
    dy = (y1 - y0) / nb
    for k in range(nb):
        nez = y0 + k * dy
        dessus = terrain(x, nez + dy / 2) + 0.025
        L.ajouter(*N.boite(larg, y1 + 0.03 - nez, dessus - pied), "pierres_claires", T(x, (nez + y1 + 0.03) / 2, pied))


def tour_horloge(L, V, U, lots, rng, x, y, z):
    """La Tour de l'Horloge : un fût de pierre claire, des cordons sombres, quatre cadrans (ceux du sud et de l'est donnent
    la vraie heure de Paris), la chambre des cloches et sa cloche qui se balance, la flèche d'ardoise, la girouette."""
    Mb = T(x, y, z)
    l, h = 1.2, 4.2
    L.ajouter(*N.boite(l + 0.3, l + 0.3, 0.4, haut=True), "pierres", Mb @ T(0, 0, -0.25))
    L.ajouter(*N.boite(l, l, h, haut=False), "pierres_claires", Mb @ T(0, 0, 0.1))
    for zc in (1.3, 2.6, 3.95):
        L.ajouter(*N.boite(l + 0.12, l + 0.12, 0.09, bas=True), "pierres_sombres", Mb @ T(0, 0, zc))
    for k in range(4):
        Mw = Mb @ Rz(k * PI / 2) @ T(0, -l / 2 - 0.006, 0)
        L.ajouter(*N.quad((-0.42, -0.012, 2.82), (0.42, -0.012, 2.82), (0.42, -0.012, 3.66), (-0.42, -0.012, 3.66)), "cadran_nu", Mw)
        L.ajouter(*N.tube([(math.cos(t) * 0.45, -0.018, 3.24 + math.sin(t) * 0.45) for t in np.linspace(0, 2 * PI, 17)], 0.025, 4, bouts=False), "laiton", Mw)
        P.fenetre(L, V, rng, Mw, 0, 1.6, 0.26, 0.55, mat="fenetre_haute", allumee=True)
        if k == 0:
            L.ajouter(*N.quad((-0.26, -0.012, 0.1), (0.26, -0.012, 0.1), (0.26, -0.012, 0.78), (-0.26, -0.012, 0.78)), "porte", Mw)
        if k in (0, 3):  # les aiguilles : le site les met à l'heure de Paris
            for nom_, lg_, ep_, tour_, dy_ in (("aiguille_minutes", 0.36, 0.036, 3600, 0.026), ("aiguille_heures", 0.24, 0.05, 43200, 0.04)):
                Ai = N.Maille(nom_)
                Ai.ajouter(*N.boite(ep_, 0.01, lg_ + 0.04, bas=True), "acier_noir", T(0, 0, -0.04))
                o = Mb @ Rz(k * PI / 2) @ np.array((0.0, -l / 2 - 0.006 - 0.012 - dy_, 3.24, 1.0))
                axe = Rz(k * PI / 2) @ np.array((0.0, -1.0, 0.0, 0.0))
                lots["animes"].append((Ai, tuple(float(c) for c in o[:3]), {"anim": "aiguille", "axe": [float(axe[0]), float(axe[1]), 0.0], "tour": tour_}))
    zc = 4.05
    for sx in (-1, 1):
        for sy in (-1, 1):
            L.ajouter(*N.boite(0.22, 0.22, 0.8), "pierres_claires", Mb @ T(sx * 0.49, sy * 0.49, zc))
    Cl = N.Maille("cloche")
    Cl.ajouter(*N.cylindre(0.24, 0.1, 0.3, 10, bas=True), "laiton", T(0, 0, -0.36))
    Cl.ajouter(*N.sphere(0.05, 6, 4), "acier_noir", T(0, 0, -0.4))
    Cl.ajouter(*N.poutre((-0.36, 0, 0), (0.36, 0, 0), 0.06), "planches_sombres")
    lots["animes"].append((Cl, (x, y, z + zc + 0.62), {"anim": "balance", "axe": [1.0, 0.0, 0.0], "ampl": 0.3, "vitesse": 2.0}))
    L.ajouter(*N.boite(l + 0.14, l + 0.14, 0.1, bas=True), "pierres_sombres", Mb @ T(0, 0, zc + 0.8))
    v, f = N.toit_pointe(0.68, 1.9, 4, 0.1)
    L.ajouter(v, f, "ardoises", Mb @ T(0, 0, zc + 0.9))
    L.ajouter(*N.sphere(0.09, 7, 5), "or", Mb @ T(0, 0, zc + 2.85))
    Gi = N.Maille("girouette")  # une girouette en forme de clé de remontoir (elle tourne doucement)
    Gi.ajouter(*N.cylindre(0.012, 0.012, 0.35, 4), "laiton")
    Gi.ajouter(*N.boite(0.42, 0.02, 0.05), "laiton", T(0.1, 0, 0.24))
    Gi.ajouter(*N.tube([(0.31 + math.cos(t) * 0.07, 0, 0.265 + math.sin(t) * 0.07) for t in np.linspace(0, 2 * PI, 9)], 0.012, 4, bouts=False), "laiton")
    lots["animes"].append((Gi, (x, y, z + zc + 2.9), {"anim": "tourne", "axe": [0.0, 0.0, 1.0], "vitesse": 0.25}))
    for k in range(4):  # les lanternes de la place, aux coins de la tour
        a = PI / 4 + k * PI / 2
        P.lampadaire(L, U, x + math.cos(a) * 1.15, y + math.sin(a) * 1.15, z)
    return Vf.rectangle(x, y, l + 0.3, l + 0.3, 0.0)


def atelier(L, V, rng, x, y, z, cap, lx=1.05, ly=0.8, hm=0.62, ht=0.4, mur="colombage", toit="tuiles_brunes", enseigne=True):
    """Un atelier d'horloger : des murs à pans de bois sur un soubassement de pierre, un toit, une grande vitrine (allumée
    la nuit), une enseigne ronde (un cadran) pendue à sa potence, une cheminée."""
    M = T(x, y, z) @ Rz(cap)
    L.ajouter(*N.boite(lx + 0.04, ly + 0.04, 0.28, haut=False), "pierres", M @ T(0, 0, -0.22))
    L.ajouter(*N.boite(lx, ly, hm - 0.06, haut=False), mur, M @ T(0, 0, 0.06))
    L.ajouter(*N.pignons(lx, ly, ht), mur, M @ T(0, 0, hm))
    v, f = N.toit_pignon(lx, ly, ht, 0.1, 0.05)
    L.ajouter(v, [f[0], f[4]], toit, M @ T(0, 0, hm))
    L.ajouter(v, [q for k, q in enumerate(f) if k not in (0, 4)], "planches_sombres", M @ T(0, 0, hm))
    Mf = M @ T(0, -ly / 2, 0)
    xp = lx * 0.28
    L.ajouter(*N.quad((xp - 0.1, -0.012, 0.0), (xp + 0.1, -0.012, 0.0), (xp + 0.1, -0.012, 0.36), (xp - 0.1, -0.012, 0.36)), "porte", Mf)
    L.ajouter(*N.quad((-lx * 0.42, -0.012, 0.1), (-lx * 0.02, -0.012, 0.1), (-lx * 0.02, -0.012, 0.42), (-lx * 0.42, -0.012, 0.42)), "fenetre_haute", Mf, plein=True)
    V.ajouter(*N.quad((-lx * 0.4, -0.02, 0.12), (-lx * 0.04, -0.02, 0.12), (-lx * 0.04, -0.02, 0.4), (-lx * 0.4, -0.02, 0.4)), "vitre", Mf)
    P.fenetre(L, V, rng, M @ Rz(PI) @ T(0, -ly / 2, 0), 0.0, 0.22, 0.16, 0.18, allumee=rng.random() < 0.5)
    if enseigne:
        L.ajouter(*N.poutre((-lx * 0.5, -0.02, 0.5), (-lx * 0.5, -0.3, 0.5), 0.025), "acier_noir", Mf)
        L.ajouter(*N.cylindre(0.1, 0.1, 0.02, 12), "cadran_nu", Mf @ T(-lx * 0.5, -0.24, 0.36) @ Rx(PI / 2))
    P.cheminee(L, M, -lx * 0.3, ly * 0.18, hm + ht * 0.45, 0.32, 0.13)
    return Vf.rectangle(x, y, lx + 0.1, ly + 0.1, cap)


def tuyau(L, pts, r=0.04):
    """Un tuyau de cuivre qui suit ces points, ses colliers."""
    L.ajouter(*N.tube(pts, r, 6, bouts=True), "cuivre")
    for p in pts[1:-1]:
        L.ajouter(*N.sphere(r * 1.5, 6, 4), "laiton", T(*p))


def mailles(graine=901, leger=False):
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
    y_bas, y_haut = -r_plat(-PI / 2) - 1.35, -r_plat(-PI / 2) + 0.45
    montee = [quai_terre, (0.0, y_bas - 0.1), (0.0, y_haut + 0.25), (0.0, TOUR[1] - R_PLACE - 0.15)]
    ronde = [(TOUR[0] + math.cos(a) * (R_PLACE - 0.3), TOUR[1] + math.sin(a) * (R_PLACE - 0.3)) for a in np.arange(-PI / 2, 3 * PI / 2 - 0.01, PI / 8)]
    rue_est = [(TOUR[0] + R_PLACE - 0.1, TOUR[1] - 0.2), (2.4, 0.2), (3.4, -0.6)]
    rue_ouest = [(TOUR[0] - R_PLACE + 0.1, TOUR[1] + 0.1), (-2.3, 0.9), (-3.3, 1.7)]
    PISTES[:] = [[(x, y, 0.0) for x, y in pts] for pts in (montee, ronde + ronde[:1], rue_est, rue_ouest)]
    couloirs = [(pts, 0.14) for pts in PISTES]
    loin = lambda x, y, r: all(K.distance_au_trajet(x, y, pts) > r + rc + 0.05 for pts, rc in couloirs)

    def libre(x, y, r, bas=Z_P - 0.1):
        if terrain(x, y) < bas or not loin(x, y, r):
            return False
        if math.hypot(x, y) + r > r_plat(math.atan2(y, x)) - 0.15 and bas > 1.0:
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
    L.ajouter(sommets, faces, "sol_horloge", uv=uvs)
    L.regrouper(debut_sol, None, 4, 0.75)
    falaise(L, 9 if leger else 6)

    etape("le débarcadère et l'escalier")
    Rf.tablier(L, quai_mer, quai_terre, Z_B, Z_B, 0.5)
    lg = quai_terre[1] - quai_mer[1]
    for t in (0.12, 0.45, 0.78):
        for s in (-1, 1):
            L.ajouter(*N.cylindre(0.04, 0.034, Z_B + 0.95, 6, haut=False), "planches_sombres", T(quai_mer[0] + s * 0.21, quai_mer[1] + lg * t, -0.95))
    quai = Vf.rectangle(0.0, (quai_mer[1] + quai_terre[1]) / 2, lg, 0.5, PI / 2)
    emprises.append(("le débarcadère", quai))
    ponts.append(quai)
    P.banniere(lots, quai_mer[0] + 0.34, quai_mer[1] + 0.25, -0.3, 1.75, "rose", math.radians(100))
    marches(L, 0.0, y_bas, y_haut, 2 * DEMI_RAMPE, 10 if leger else 14)
    SOL.append(("decor", "l'escalier", Vf.rectangle(0.0, (y_bas + y_haut) / 2, 2 * DEMI_RAMPE, y_haut - y_bas, PI / 2)))
    for s in (-1, 1):  # deux lanternes en haut de l'escalier
        P.lampadaire(L, U, s * (DEMI_RAMPE + 0.25), y_haut + 0.2, Z_P)
        SOL.append(("rocher", "une lanterne", Vf.rond(s * (DEMI_RAMPE + 0.25), y_haut + 0.2, 0.06)))

    etape("la tour")
    emprises.append(("la Tour de l'Horloge", tour_horloge(L, V, U, lots, rng, TOUR[0], TOUR[1], sol(*TOUR))))

    etape("les ateliers")
    places = [(-2.15, -0.75, 0.35), (2.2, -1.05, -0.4), (-1.0, 2.75, 0.1), (1.35, 2.7, -0.15), (-2.85, 1.95, 0.95), (2.9, 1.5, -1.0), (-1.6, -2.4, 0.55), (1.65, -2.55, -0.55)]
    murs = ("colombage", "colombage_blanc", "colombage_ocre", "colombage_bleu")
    toits = ("tuiles_brunes", "ardoises", "tuiles_rouges")
    for k, (x, y, cap) in enumerate(places[: 5 if leger else 8]):
        if libre(x, y, 0.62):
            SOL.append(("decor", f"un atelier ({x:.1f}, {y:.1f})", atelier(L, V, rng, x, y, sol(x, y), cap, mur=murs[k % 4], toit=toits[k % 3])))

    etape("la mécanique")
    # --- les engrenages dans les falaises, deux par deux ; le grand balancier à l'est ---
    paires = [(-28, 1.05, 0.66, -1), (32, 1.2, 0.0, 0), (75, 0.9, 0.6, -1), (140, 1.15, 0.72, 1), (195, 1.0, 0.0, 0), (238, 0.85, 0.55, -1)]
    for k, (deg, r1, r2, cote) in enumerate(paires[: 4 if leger else 6]):
        a = math.radians(deg)
        rp = r_plat(a) + 0.36
        c1 = (math.cos(a) * rp, math.sin(a) * rp, Z_B + 0.5 + 0.15 * (k % 2))
        engrenage(lots, c1, a, r1, 1 if k % 2 else -1)
        L.ajouter(*N.cylindre(0.07, 0.07, 0.5, 8), "acier_noir", T(math.cos(a) * (rp - 0.42), math.sin(a) * (rp - 0.42), c1[2]) @ Rz(a) @ Ry(PI / 2))
        if r2:
            tx, ty = -math.sin(a) * cote, math.cos(a) * cote
            dist = (r1 + r2) * 0.92
            c2 = (c1[0] + tx * dist * 0.94, c1[1] + ty * dist * 0.94, c1[2] + dist * 0.34)
            a2 = math.atan2(c2[1], c2[0])
            engrenage(lots, c2, a, r2, -1 if k % 2 else 1, max(8, int(r2 * 14)), 0.14, "cuivre")
            L.ajouter(*N.cylindre(0.06, 0.06, 0.5, 8), "acier_noir", T(c2[0] - math.cos(a) * 0.42, c2[1] - math.sin(a) * 0.42, c2[2]) @ Rz(a) @ Ry(PI / 2))
    # le grand balancier : pendu à une potence au bord du plateau, il bat la mesure au-dessus de la grève de l'est
    ab = math.radians(-2)
    rb = r_plat(ab)
    piv = (math.cos(ab) * (rb + 0.45), math.sin(ab) * (rb + 0.45), Z_P + 0.55)
    for s in (-1, 1):
        q = (math.cos(ab) * (rb - 0.25) - math.sin(ab) * s * 0.28, math.sin(ab) * (rb - 0.25) + math.cos(ab) * s * 0.28)
        L.ajouter(*N.poutre((q[0], q[1], Z_P - 0.05), (piv[0] - math.sin(ab) * s * 0.28, piv[1] + math.cos(ab) * s * 0.28, piv[2] + 0.06), 0.09), "acier_noir")
    L.ajouter(*N.poutre((piv[0] - math.sin(ab) * 0.32, piv[1] + math.cos(ab) * 0.32, piv[2] + 0.06), (piv[0] + math.sin(ab) * 0.32, piv[1] - math.cos(ab) * 0.32, piv[2] + 0.06), 0.1), "acier_noir")
    Bal2 = N.Maille("balancier")
    Bal2.ajouter(*N.boite(0.05, 0.05, 1.45), "laiton", T(0, 0, -1.45))
    Bal2.ajouter(*N.cylindre(0.32, 0.32, 0.07, 18), "laiton", T(0, 0, -1.55) @ Rz(ab) @ Ry(PI / 2) @ T(0, 0, -0.035))
    Bal2.ajouter(*N.sphere(0.08, 8, 6), "acier_noir", T(0, 0, -1.55))
    lots["animes"].append((Bal2, piv, {"anim": "balance", "axe": [math.cos(ab), math.sin(ab), 0.0], "ampl": 0.32, "vitesse": 1.6}))
    SOL.append(("decor", "la potence du balancier", Vf.rond(math.cos(ab) * (rb - 0.25), math.sin(ab) * (rb - 0.25), 0.4)))
    # les tuyaux de cuivre : le long du bord du plateau, puis ils plongent dans la falaise ; trois évents qui fument
    events = []
    for k, (d0, d1) in enumerate(((-60, -40), (100, 125), (205, 225))[: 2 if leger else 3]):
        pts = []
        for g in np.linspace(d0, d1, 5):
            a = math.radians(g)
            pts.append((math.cos(a) * (r_plat(a) - 0.25), math.sin(a) * (r_plat(a) - 0.25), Z_P + 0.08))
        a = math.radians(d1)
        pts.append((math.cos(a) * (r_plat(a) + 0.2), math.sin(a) * (r_plat(a) + 0.2), Z_P + 0.08))
        pts.append((math.cos(a) * (r_plat(a) + 0.22), math.sin(a) * (r_plat(a) + 0.22), Z_B + 0.4))
        tuyau(L, pts)
        a0 = math.radians(d0)
        ev = (math.cos(a0) * (r_plat(a0) - 0.45), math.sin(a0) * (r_plat(a0) - 0.45))
        L.ajouter(*N.cylindre(0.07, 0.06, 0.5, 8), "cuivre", T(ev[0], ev[1], Z_P - 0.02))
        L.ajouter(*N.cylindre(0.11, 0.07, 0.08, 8), "laiton", T(ev[0], ev[1], Z_P + 0.48))
        events.append((ev[0], ev[1], Z_P + 0.62))
        SOL.append(("decor", "un évent", Vf.rond(ev[0], ev[1], 0.12)))

    etape("les habitants")
    for k, (x, y, cap) in enumerate([(-0.9, -0.85, 0.6), (0.95, 1.95, 3.6), (-1.2, 1.85, 5.6), (0.6, -2.0, 2.3), (-2.9, 0.4, 0.2)][: 3 if leger else 5]):
        if libre(x, y, 0.07):
            P.passant(L, rng, x, y, angle=cap, z=sol(x, y))
            SOL.append(("passant", "un horloger", Vf.rond(x, y, 0.065)))
    chemins = [
        (K.suivre([quai_mer] + montee, sol, 0.2), False, 0.15, 0.0, 4.0),
        (K.suivre(ronde + ronde[:1], sol, 0.25)[:-1], True, 0.13, 0.3, 0),
        (K.suivre(rue_est[::-1], sol, 0.22), False, 0.14, 0.5, 3.0),
        (K.suivre(rue_ouest, sol, 0.22), False, 0.14, 0.7, 3.0),
    ]
    for pts, *_ in chemins:
        for k, q in enumerate(pts):
            if bord(q[0], q[1]) < 0.45 and abs(q[0]) < 0.3:
                pts[k] = (q[0], q[1], Z_B + 0.02)
    types = []
    for k in range(2):
        Pm = N.Maille(f"marcheur{k}")
        P.passant(Pm, rng, 0, 0, angle=0.0, z=0.0, marcheur=True, tient=("laiton", None)[k])
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
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "fumees", "points": [float(c) for p in P.CHEMINEES + events for c in p], "grosseur": 0.4}))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "mer", "rayon": 8.4, "genre": 2}))
    lots["reperes"].append(((0.0, 0.0, Z_P + 2.0), {"anim": "oiseaux", "nb": 3 if leger else 5, "rayon": 4.0}))

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
    rendus = [("horloge-v5", (1.0, -30.0, 17.0), (0.0, 0.3, 1.8), 50), ("horloge-v5-engrenages", (9.5, -6.5, 3.2), (3.8, -1.5, 1.2), 40)] if rendu else []
    return K.construire("ile-horloge-v5", lots, verifier(lots), rendus, cuire, exporter, taille or (2048 if leger else 3072), echantillons, leger, alleger, atlas="horloge")
