# Le Marché Flottant, « niveau 5 » : pas de terre, rien que des bateaux noués ensemble sur une eau claire de haut-fond.
# Tout est inventé.
# (Son histoire, dans le bot : « Des dizaines de bateaux attachés ensemble : on y vend de tout, même des cartes rares
# (paraît-il). »)
# Au milieu, la Grande Barge : une vieille coque démâtée devenue halle, ses étals sous une grande toile rayée, son château
# arrière, son mât d'où partent des guirlandes de fanions et de lanternes jusqu'aux quatre coins du marché. Autour, des
# pontons posés sur des tonneaux (le grand quai, trois bras vers le sud, deux ailes, le ponton du nord) ; le long d'eux,
# des bateaux-étals, des bateaux-maisons qui fument, des sampans, deux caboteurs marchands. À la proue de la barge,
# l'étal du marchand de cartes : un cadre est vide. Et, amarré à l'écart (au bout de l'aile de l'ouest), un bateau noir
# sans emblème, une silhouette encapuchonnée à bord.
# La vie : ceux qui marchent sur les pontons et sur la barge, deux sampans qui font le tour du marché à la godille, les
# bateaux qui dansent sur l'eau, la fumée, les fanions, les mouettes.
# Sorties : ile-marche-v5.glb (+ -leger) et son atlas .png. Contrôle du plan : verifier() (voir barhaw_ile_v5.py).
import math, random
import numpy as np
import barhaw_niveau5 as N
import barhaw_verif as Vf
import barhaw_ile_v5 as K
import barhaw_port_v5 as P
import barhaw_recif_v5 as Rf

PI = math.pi
T, Rz, Rx, Ry = N.T, N.Rz, N.Rx, N.Ry
ZP = 0.17  # le plancher des pontons
ZD = 0.42  # le pont de la Grande Barge
BARGE = (0.0, 0.92)  # son milieu ; elle est couchée d'ouest en est, la proue à l'est

N.matiere("natte", N.tx_corde, 0.35, 0.8, c=0xc2a25c, graine=501)
N.matiere("bambou", N.tx_corde, 0.5, 0.6, c=0xcdb873, graine=502)
N.matiere("parchemin", N.tx_uni, 0.4, 0.3, c=0xead9ae, graine=503, grain=0.12, taches=0.35, c2=0xc9b07c, seuil=0.55)
N.matiere("toile_cliente", N.tx_uni, 1.0, 0.3, c=0x1f1d23, graine=504, grain=0.2, taches=0.3, c2=0x34313a, seuil=0.55)
for _nom, _c in (("vif_rose", 0xff5aae), ("vif_or", 0xffc23d), ("vif_turquoise", 0x2fd3c4), ("vif_violet", 0x9b4dff), ("vif_blanc", 0xfff4e0)):
    N.matiere(_nom, N.tx_uni, 0.6, 0.2, c=_c, graine=411 + len(_nom), grain=0.08, taches=0.12)
VIFS = ["vif_rose", "vif_or", "vif_turquoise", "vif_violet", "vif_blanc"]
TOILES = ["toile_rose", "toile_or", "toile_turquoise", "toile_violette", "toile_ecrue"]


def sol(x, y):
    """Le fond, pour le contrôle du plan : un haut-fond de sable sous le marché, toujours sous l'eau (on ne marche que sur les
    pontons). Il n'est pas modelé : la mer du site est opaque, elle dessine elle-même une eau claire de lagon (genre 2)."""
    return -0.32 - 1.1 * K.lisse(3.6, 7.6, math.hypot(x, y * 1.05)) + (K.bruit2(x * 0.8, y * 0.8, 31) - 0.5) * 0.12


# ---------- les pièces ----------
def toile(A, v, faces, mat, M=None, ep=0.012, zone=0):
    """Une toile fine : ses deux côtés. L'envers est reculé d'un cheveu derrière l'endroit (à l'opposé de la normale de
    chaque sommet) : ainsi aucun des deux côtés ne fait d'ombre à l'autre quand on cuit la lumière."""
    P_ = np.asarray(v, np.float64)
    nv = np.zeros_like(P_)
    for f in faces:
        n_ = np.cross(P_[f[1]] - P_[f[0]], P_[f[2]] - P_[f[1]])
        for k in f:
            nv[k] += n_ / (np.linalg.norm(n_) or 1.0)
    nv /= np.maximum(np.linalg.norm(nv, axis=1, keepdims=True), 1e-9)
    dos = [tuple(q) for q in P_ - nv * ep]
    A.ajouter([tuple(q) for q in P_] + dos, list(faces) + [tuple(len(v) + i for i in reversed(f)) for f in faces], mat, M, zone=zone)


def bache(A, M, lx, ly, h0, hh, mat, n=5):
    """Un abri en berceau (un demi-tonneau de natte ou de toile, ouvert aux deux bouts) : celui d'un sampan."""
    v = [(sx * lx / 2, math.cos(PI * k / n) * ly / 2, h0 + math.sin(PI * k / n) * hh) for k in range(n + 1) for sx in (-1, 1)]
    toile(A, v, [(2 * k, 2 * k + 2, 2 * k + 3, 2 * k + 1) for k in range(n)], mat, M)


def ponton(L, U, a, b, larg=0.5, lanternes=True, cote=0):
    """Un ponton flottant de a à b : un tablier de planches sur des tonneaux couchés, des pieux d'amarrage d'un côté puis de
    l'autre (une lanterne sur un pieu sur deux). Renvoie son emprise."""
    Rf.tablier(L, a, b, ZP, ZP, larg)
    dx, dy = b[0] - a[0], b[1] - a[1]
    l = math.hypot(dx, dy)
    cap = math.atan2(dy, dx)
    nx, ny = -dy / l, dx / l
    nb = max(2, int(l / 0.8))
    for k in range(nb):
        t = (k + 0.5) / nb
        L.ajouter(*N.cylindre(0.11, 0.11, larg * 0.92, 7), "planches", T(a[0] + dx * t, a[1] + dy * t, 0.01) @ Rz(cap + PI / 2) @ Ry(PI / 2) @ T(0, 0, -larg * 0.46))
    nb = max(2, round(l / 1.3))
    for k in range(nb if cote else nb + 1):
        t, s = (k + 0.5) / nb if cote else k / nb, cote or (1 if k % 2 else -1)  # d'un seul côté : décalés, pour laisser libre le départ des bras
        x, y = a[0] + dx * t + nx * s * (larg / 2 + 0.04), a[1] + dy * t + ny * s * (larg / 2 + 0.04)
        L.ajouter(*N.cylindre(0.036, 0.03, 1.45, 6), "planches_sombres", T(x, y, -0.9))
        if lanternes and k % 3 == 1:  # de petites lanternes (les grosses, que le site fait rayonner la nuit, sont ailleurs)
            L.ajouter(*N.poutre((x, y, 0.5), (x - nx * s * 0.07, y - ny * s * 0.07, 0.5), 0.012), "fer")
            U.ajouter(*N.sphere(0.03, 5, 3, 1.2), "lumiere", T(x - nx * s * 0.07, y - ny * s * 0.07, 0.44))
    return Vf.rectangle((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, l, larg, cap)


def sampan(A, M, rng, lg=1.3, abri="natte", charge=True, bois="planches"):
    """Un sampan : une coque fine, son plancher, un abri en berceau au milieu, la marchandise à l'avant, la godille à l'arrière."""
    P.coque(A, M, lg, lg * 0.3, 0.16, bois, 7, None, 0.09, "planches_claires")
    A.ajouter(*N.boite(lg * 0.78, lg * 0.19, 0.02), "pont", M @ T(0, 0, -0.03))
    if abri:
        bache(A, M @ T(-0.06 * lg, 0, 0), lg * 0.34, lg * 0.3, 0.07, lg * 0.17, abri)
    if charge:
        A.ajouter(*N.boite(0.13, 0.13, 0.08), "planches_claires", M @ T(lg * 0.24, 0, -0.01))
        for k in range(3):
            A.ajouter(*N.sphere(0.045, 6, 4, 0.75), rng.choice(["fruits", "legumes", "poisson", "or"]), M @ T(lg * 0.24 + (k - 1) * 0.045, (k % 2 - 0.5) * 0.05, 0.08))
    A.ajouter(*N.poutre((-lg * 0.36, 0.03, 0.2), (-lg * 0.64, 0.1, -0.07), 0.02), "planches_sombres", M)


def silhouette(A, M, mat="toile_cliente"):
    """Une silhouette sous sa cape, la capuche rabattue : on ne voit rien d'elle."""
    A.ajouter(*N.cylindre(0.085, 0.035, 0.27, 7, haut=False), mat, M @ T(0, 0, 0.0))
    A.ajouter(*N.sphere(0.052, 7, 5, 1.05), mat, M @ T(0.005, 0, 0.3))


def bateau_etal(L, U, rng, x, y, cap, cote, lg=1.9, toile_="toile_rose"):
    """Un bateau-étal : une coque large et pontée ; dessus, l'étal sous sa toile (ouvert du côté du ponton : cote = +1 à
    bâbord, -1 à tribord), des caisses, un tonneau, une lanterne à la poupe. Renvoie (son emprise, où se tient le marchand)."""
    M = T(x, y, 0) @ Rz(cap)
    P.coque(L, M, lg, lg * 0.4, 0.2, "planches", 7, "pont", 0.12)
    zp = 0.1
    q = M @ np.array((-0.06 * lg, 0.0, 0.0, 1.0))
    P.etal(L, rng, q[0], q[1], cap + (0 if cote > 0 else PI), toile_, zp)
    P.tonneau(L, M @ T(0.34 * lg, 0.0, zp))
    P.caisse(L, M @ T(-0.36 * lg, 0.04 * cote, zp) @ Rz(0.4), 0.14)
    L.ajouter(*N.cylindre(0.015, 0.012, 0.6, 4), "planches_sombres", M @ T(-0.45 * lg, 0, zp))
    U.ajouter(*N.sphere(0.056, 8, 6, 1.2), "lumiere", M @ T(-0.45 * lg, 0, zp + 0.62))
    m = M @ np.array((-0.06 * lg, -0.25 * cote, zp, 1.0))
    return Vf.rectangle(x, y, lg, lg * 0.4, cap), (float(m[0]), float(m[1]), zp, cap + (PI / 2 if cote > 0 else -PI / 2))


def bateau_maison(L, V, U, rng, x, y, cap, lg=2.2, toit="tuiles", mur="planches_claires"):
    """Un bateau-maison : la coque pontée, la cabane (sa porte vers la proue, une fenêtre éclairée de chaque bord), le toit
    à deux pentes, la cheminée, des pots de fleurs, une lanterne à la proue. Renvoie (son emprise, le haut de sa cheminée)."""
    M = T(x, y, 0) @ Rz(cap)
    larg = lg * 0.38
    P.coque(L, M, lg, larg, 0.22, "planches_sombres", 7, "pont", 0.13)
    zp, lx, ly, hm, ht = 0.11, lg * 0.46, larg * 0.62, 0.36, 0.2
    Mc = M @ T(-0.1 * lg, 0, zp)
    L.ajouter(*N.boite(lx, ly, hm, haut=False), mur, Mc, tourne=True)
    L.ajouter(*N.pignons(lx, ly, ht), mur, Mc @ T(0, 0, hm), tourne=True)
    L.ajouter(*N.toit_pignon(lx, ly, ht, 0.06, 0.035), toit, Mc @ T(0, 0, hm))
    xd = lx / 2 + 0.005
    L.ajouter(*N.quad((xd, -0.08, 0.0), (xd, 0.08, 0.0), (xd, 0.08, 0.28), (xd, -0.08, 0.28)), "porte", Mc)
    P.fenetre(L, V, rng, Mc @ T(0, -ly / 2, 0), 0.0, 0.1, 0.16, 0.16, allumee=True)
    P.fenetre(L, V, rng, Mc @ Rz(PI) @ T(0, -ly / 2, 0), 0.0, 0.1, 0.16, 0.16, allumee=True)
    L.ajouter(*N.boite(0.07, 0.07, hm + ht + 0.12), "briques", Mc @ T(-lx * 0.3, ly * 0.2, 0))
    for k in range(2):
        L.ajouter(*N.cylindre(0.035, 0.028, 0.05, 6), "terre", M @ T(lg * (0.24 + 0.09 * k), (k - 0.5) * 0.16, zp))
        L.ajouter(*N.sphere(0.045, 6, 4, 0.8), ("fruits", "feuillage")[k], M @ T(lg * (0.24 + 0.09 * k), (k - 0.5) * 0.16, zp + 0.07))
    L.ajouter(*N.cylindre(0.014, 0.011, 0.5, 4), "planches_sombres", M @ T(0.42 * lg, 0, zp + 0.02))
    U.ajouter(*N.sphere(0.05, 7, 5, 1.2), "lumiere", M @ T(0.42 * lg, 0, zp + 0.54))
    return Vf.rectangle(x, y, lg, larg, cap), (Mc @ np.array((-lx * 0.3, ly * 0.2, hm + ht + 0.2, 1.0)))[:3]


def guirlande(L, U, rng, a, b, fleche=0.5, nb=6, lanternes=True):
    """Une guirlande de a à b : la corde pend, des fanions de couleur y claquent, une lanterne de place en place."""
    pts = [(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - fleche * 4 * t * (1 - t)) for t in (k / nb for k in range(nb + 1))]
    d = math.hypot(b[0] - a[0], b[1] - a[1]) or 1.0
    ux, uy = (b[0] - a[0]) / d, (b[1] - a[1]) / d
    for k, (p, q) in enumerate(zip(pts[:-1], pts[1:])):
        L.ajouter(*N.poutre(p, q, 0.011), "corde")
        for t in (0.3, 0.7):
            m = tuple(p[i] + (q[i] - p[i]) * t for i in range(3))
            toile(L, [(m[0] - ux * 0.05, m[1] - uy * 0.05, m[2]), (m[0] + ux * 0.05, m[1] + uy * 0.05, m[2]), (m[0], m[1], m[2] - 0.13)], [(0, 1, 2)], rng.choice(VIFS), None, zone=(1.0, 0.5, 1.0))
        if lanternes and 0 < k < nb - 1 and k % 2 == 1:
            U.ajouter(*N.sphere(0.034, 5, 3, 1.25), "lumiere", T(q[0], q[1], q[2] - 0.06))


def mailles(graine=113, leger=False):
    """leger : la version téléphone (moins de bateaux et de monde, un fond moins fin, trois marcheurs, un sampan qui tourne)."""
    N.DETAIL = 0.6 if leger else 1.0
    try:
        return _mailles(graine, leger)
    finally:
        N.DETAIL = 1.0


def _mailles(graine, leger):
    rng = random.Random(graine)
    L, V, U = N.Maille("ile_corps"), N.Maille("ile_vitres"), N.Maille("ile_lumieres")
    lots = {"corps": L, "vitres": V, "lumieres": U, "bannieres": [], "animes": [], "copies": [], "libres": [], "reperes": []}
    SOL, emprises, ponts, coques, fumees = [], [], [], [], []
    lots["etapes"] = []  # (ce qu'on commence, le nombre de triangles du corps à ce moment-là) : pour savoir où va le poids
    etape = lambda nom: lots["etapes"].append((nom, L.triangles()))
    Rv = N.Maille("rivage")  # sur l'eau (dessiné par le site) : l'ombre des pontons et des coques

    def ombre(emprise, lx, ly, cap, rond=True):
        cx, cy = sum(p[0] for p in emprise) / len(emprise), sum(p[1] for p in emprise) / len(emprise)
        K.tache(Rv, cx, cy, lx, ly, cap, rond=rond, marge=0.24 if rond else 0.3)

    # --- les pontons : le grand quai (contre la barge), trois bras vers le sud, deux ailes, le ponton du nord ---
    etape("les pontons")
    plans = [  # (de, à, largeur)
        ((-3.6, -0.3), (3.6, -0.3), 0.7), ((-2.6, -0.65), (-3.25, -3.7), 0.5), ((0.0, -0.65), (0.2, -4.4), 0.5), ((2.6, -0.65), (3.3, -3.5), 0.5),
        ((-3.6, 0.05), (-4.05, 2.6), 0.5), ((3.6, 0.05), (3.95, 2.6), 0.5), ((-4.3, 2.4), (4.0, 2.4), 0.5),
    ]

    def le_long(k, t, cote=0.0, large=0.0, recul=0.0, plus=0.0):
        """Un point le long du ponton k (t : de 0 à 1 ; recul : en unités, depuis ses bouts) ; cote = +1 : à sa gauche, bord
        à bord avec une coque de cette largeur (0 : sur le ponton) ; plus : encore plus loin (un bateau à couple). Renvoie (x, y, le cap du ponton)."""
        a, b, larg = plans[k]
        l = math.dist(a, b)
        ux, uy = (b[0] - a[0]) / l, (b[1] - a[1]) / l
        d = recul + (l - 2 * recul) * t
        ecart = cote * (larg / 2 + 0.08 + large / 2 + plus) if cote else 0.0
        return a[0] + ux * d - uy * ecart, a[1] + uy * d + ux * ecart, math.atan2(uy, ux)
    for k, (a, b, larg) in enumerate(plans):
        e = ponton(L, U, a, b, larg, True, -1 if k == 0 else 0)
        ponts.append(e)
        ombre(e, math.dist(a, b), larg, math.atan2(b[1] - a[1], b[0] - a[0]), rond=False)

    # --- la Grande Barge : la vieille coque, son pont, le château arrière, la halle sous sa toile, le mât ---
    etape("la Grande Barge")
    bx, by = BARGE
    Mb = T(bx, by, 0)
    LG, LARG = 4.6, 1.7
    sections = P.coque(L, Mb, LG, LARG, 0.5, "planches_sombres", 9, "pont", ZD + 0.02)
    for sa, sb in zip(sections[1:-2], sections[2:-1]):  # une préceinte peinte, qui suit le bordé de chaque bord
        for k in (0, 4):
            L.ajouter(*N.poutre((sa[k][0], sa[k][1] * 0.975, 0.3), (sb[k][0], sb[k][1] * 0.975, 0.3), 0.06, 0.035), "peint_rouge", Mb)
    emprises.append(("la Grande Barge", Vf.rectangle(bx, by, LG, LARG - 0.1)))
    coques.append(("la Grande Barge", Vf.rectangle(bx, by, LG - 0.5, LARG - 0.12)))
    K.tache(Rv, bx, by, LG * 0.96, LARG * 0.9, 0.0, rond=True, marge=0.34)
    ponts.append(Vf.rectangle(bx + 0.05, by, 2.7, 1.3))  # là où l'on marche, sur le pont
    Mc = Mb @ T(-1.68, 0, ZD)  # le château arrière : une cabane, sa terrasse à rambarde, sa grosse lanterne
    L.ajouter(*N.boite(0.85, 1.0, 0.5, haut=False), "planches", Mc, tourne=True)
    L.ajouter(*N.boite(0.97, 1.12, 0.05, bas=True), "pont", Mc @ T(0, 0, 0.5))
    for k in range(10):
        a = k * 2 * PI / 10
        q = (math.cos(a) * 0.44, math.sin(a) * 0.52)
        L.ajouter(*N.poutre((*q, 0.55), (*q, 0.75), 0.025), "planches_sombres", Mc)
    for a, b in (((-0.44, -0.52), (0.44, -0.52)), ((-0.44, 0.52), (0.44, 0.52)), ((-0.44, -0.52), (-0.44, 0.52))):
        L.ajouter(*N.poutre((*a, 0.75), (*b, 0.75), 0.03), "planches_sombres", Mc)
    L.ajouter(*N.quad((0.43, -0.11, 0.0), (0.43, 0.11, 0.0), (0.43, 0.11, 0.36), (0.43, -0.11, 0.36)), "porte", Mc)
    P.fenetre(L, V, rng, Mc @ T(0, -0.5, 0), 0.0, 0.14, 0.24, 0.2, allumee=True)
    P.fenetre(L, V, rng, Mc @ Rz(PI) @ T(0, -0.5, 0), 0.0, 0.14, 0.24, 0.2, allumee=True)
    L.ajouter(*N.cylindre(0.02, 0.016, 0.5, 5), "fer", Mc @ T(-0.36, 0, 0.55))
    U.ajouter(*N.sphere(0.075, 8, 6, 1.2), "lumiere", Mc @ T(-0.36, 0, 1.1))
    X0, X1, HF, HB, DY = -1.05, 1.3, 1.02, 0.62, 0.6  # la halle : une toile à deux pentes, une couleur par travée
    nt = 5
    L.ajouter(*N.poutre((X0, 0, ZD + HF), (X1, 0, ZD + HF), 0.035), "planches_sombres", Mb)
    for k in range(nt + 1):
        xk = X0 + (X1 - X0) * k / nt
        for sy in (-1, 1):
            L.ajouter(*N.poutre((xk, sy * DY, ZD), (xk, sy * DY, ZD + HB), 0.03), "planches_sombres", Mb)
        if k < nt:
            xk2 = X0 + (X1 - X0) * (k + 1) / nt
            for sy in (-1, 1):
                toile(L, [(xk, 0, ZD + HF + 0.02), (xk2, 0, ZD + HF + 0.02), (xk2, sy * (DY + 0.08), ZD + HB), (xk, sy * (DY + 0.08), ZD + HB)], [(0, 1, 2, 3) if sy > 0 else (3, 2, 1, 0)], TOILES[(k + (sy > 0)) % 4], Mb)
    for xk in (-0.7, 0.5, 1.08):  # trois grosses lanternes de papier pendues au faîte de la halle
        L.ajouter(*N.poutre((xk, 0, ZD + HF - 0.02), (xk, 0, ZD + HF - 0.16), 0.01), "corde", Mb)
        U.ajouter(*N.sphere(0.07, 8, 6, 1.25), "lumiere", Mb @ T(xk, 0, ZD + HF - 0.23))
    marchands = []
    for k, xk in enumerate((-0.815, -0.345, 0.595)[:2 if leger else 3]):  # les étals de la halle, du côté nord
        P.etal(L, rng, bx + xk, by + 0.28, PI, TOILES[(k + 2) % 5], ZD)
        marchands.append((bx + xk, by + 0.56, ZD, -PI / 2))
        SOL.append(("rocher", "un étal de la halle", Vf.rectangle(bx + xk, by + 0.28, 0.6, 0.44)))
    HM = 3.5  # le mât, sa hune, sa vergue et sa voile serrée, sa lanterne tout en haut
    L.ajouter(*N.cylindre(0.07, 0.035, HM, 8), "planches_sombres", Mb @ T(0.13, 0, ZD))
    L.ajouter(*N.cylindre(0.2, 0.24, 0.12, 8), "planches", Mb @ T(0.13, 0, ZD + 2.55))
    L.ajouter(*N.poutre((0.13, -0.95, ZD + 2.1), (0.13, 0.95, ZD + 2.1), 0.045), "planches_sombres", Mb)
    L.ajouter(*N.tube([(0.13, -0.85, ZD + 2.03), (0.13, 0, ZD + 1.98), (0.13, 0.85, ZD + 2.03)], [0.05, 0.075, 0.05], 6), "toile_ecrue", Mb)
    U.ajouter(*N.sphere(0.09, 8, 5, 1.2), "lumiere", Mb @ T(0.13, 0, ZD + HM + 0.08))
    haut_mat = (bx + 0.13, by, ZD + HM - 0.08)
    P.banniere(lots, bx + 0.13, by, ZD + HM + 0.12, 0.5, "rose", 0.4, 0.3, 0.7)
    Mx = Mb @ T(1.62, 0, ZD)  # l'étal du marchand de cartes, à la proue : des cartes pendues à un cadre (une place est vide)
    for sy in (-1, 1):
        L.ajouter(*N.poutre((0, sy * 0.3, 0), (0, sy * 0.3, 0.62), 0.028), "planches_sombres", Mx)
    L.ajouter(*N.poutre((0, -0.33, 0.6), (0, 0.33, 0.6), 0.028), "planches_sombres", Mx)
    for k, yy in enumerate((-0.2, 0.0, 0.2)):
        if k != 1:
            toile(L, [(0.012, yy - 0.075, 0.57), (0.012, yy + 0.075, 0.57), (0.012, yy + 0.075, 0.34), (0.012, yy - 0.075, 0.34)], [(0, 1, 2, 3)], "parchemin", Mx, zone=(1.0, 0.7, 1.0))
        else:
            L.ajouter(*N.poutre((0.012, yy, 0.58), (0.012, yy + 0.02, 0.47), 0.006), "corde", Mx)
    L.ajouter(*N.boite(0.26, 0.5, 0.2), "planches_claires", Mx @ T(-0.22, 0, 0))
    for k in range(5):
        L.ajouter(*N.cylindre(0.02, 0.02, 0.2, 5), "parchemin", Mx @ T(-0.22, -0.18 + 0.09 * k, 0.225) @ Ry(PI / 2) @ T(0, 0, -0.1))
    marchands.append((bx + 1.62 - 0.46, by + 0.0, ZD, 0.0))
    SOL.append(("rocher", "l'étal du marchand de cartes", Vf.rectangle(bx + 1.5, by, 0.5, 0.7)))
    RX = 0.6  # la passerelle, du grand quai au pont de la barge
    Rf.tablier(L, (RX, -0.06), (RX, 0.34), ZP + 0.02, ZD + 0.02, 0.4)
    ponts.append(Vf.rectangle(RX, 0.14, 0.4, 0.44, PI / 2))

    # --- les guirlandes : du haut du mât jusqu'aux grands pieux des quatre coins du marché ---
    etape("les guirlandes")
    coins = [(-3.6, -0.72), (3.6, -0.72)] + [le_long(k, 1.0, recul=-0.27)[:2] for k in (1, 2, 3)] + [(-4.42, 2.72), (4.12, 2.72)]
    for k, (x, y) in enumerate(coins[:5 if leger else 7]):
        L.ajouter(*N.cylindre(0.045, 0.035, 2.0, 6), "planches_sombres", T(x, y, -0.9))
        L.ajouter(*N.poutre((x, y, 0.82), (x + 0.1, y, 0.82), 0.014), "fer")
        U.ajouter(*N.sphere(0.06, 8, 6, 1.25), "lumiere", T(x + 0.1, y, 0.74))
        guirlande(L, U, rng, haut_mat, (x, y, 1.05), 0.45 + 0.1 * (k % 2), 5 if leger else 7)
        if k % 2 == 0:
            P.banniere(lots, x, y, 1.1, 0.3, ("or", "turquoise", "violet", "rose")[k // 2 % 4], 0.8 * k, 0.2, 0.42)

    for a, b in ((2, 3), (3, 4), (0, 2), (4, 1)) if not leger else ((2, 3), (3, 4)):  # et de coin en coin, au sud : le marché est noué
        guirlande(L, U, rng, (*coins[a], 1.0), (*coins[b], 1.0), 0.3, 5, False)
    fa, fb = (-2.2, 2.62), (-1.2, 2.62)  # des filets qui sèchent, sur le ponton du nord
    for q in (fa, fb):
        L.ajouter(*N.cylindre(0.02, 0.016, 0.55, 5), "planches_sombres", T(q[0], q[1], ZP))
    L.ajouter(*N.poutre((*fa, ZP + 0.52), (*fb, ZP + 0.52), 0.014), "planches_sombres")
    toile(L, [(fa[0] + 0.04, fa[1], ZP + 0.52), (fb[0] - 0.04, fb[1], ZP + 0.52), (fb[0] - 0.06, fb[1] + 0.05, ZP + 0.12), (fa[0] + 0.06, fa[1] + 0.05, ZP + 0.1)], [(0, 1, 2, 3)], "filet", None, zone=(1.0, 0.7, 1.0))

    # --- les bateaux à quai : étals, maisons, sampans, caboteurs (tous amarrés le long d'un ponton) ---
    etape("les bateaux")
    def amarrer(nom, e, lx, ly, cap):
        emprises.append((nom, e))
        coques.append((nom, e))
        ombre(e, lx, ly, cap)

    etals = [(1, 0.38, 1, 1.9, "toile_rose"), (2, 0.44, -1, 1.9, "toile_or"), (2, 0.69, 1, 1.9, "toile_turquoise"), (3, 0.42, 1, 1.8, "toile_violette"), (5, 0.44, -1, 1.6, "toile_ecrue")]  # (ponton, où, côté, long, toile)
    for k, t, cote, lg, tl in etals[:3 if leger else 5]:
        x, y, cap = le_long(k, t, cote, lg * 0.4)
        e, m = bateau_etal(L, U, rng, x, y, cap, -cote, lg, tl)
        amarrer("un bateau-étal", e, lg * 0.95, lg * 0.36, cap)
        marchands.append(m)
    maisons = [(3, 0.47, -1, "tuiles", "planches_claires"), (1, 0.45, -1, "tuiles_brunes", "crepi_ocre"), (4, 0.36, 1, "ardoises", "crepi_bleu")]
    for k, t, cote, toit, mur in maisons[:2 if leger else 3]:
        x, y, cap = le_long(k, t, cote, 2.2 * 0.38)
        e, f = bateau_maison(L, V, U, rng, x, y, cap + PI, 2.2, toit, mur)
        amarrer("un bateau-maison", e, 2.1, 0.75, cap)
        fumees.append(f)
    fixes = [(1, 0.89, 1, 1.2, "natte"), (2, 0.86, -1, 1.2, "toile_rose"), (2, 0.24, 1, 1.3, "natte"), (3, 0.94, 1, 1.2, "toile_turquoise"), (6, 0.5, 1, 1.0, "natte")]
    for k, t, cote, lg, abri in fixes[:3 if leger else 5]:
        x, y, cap = le_long(k, t, cote, lg * 0.3)
        sampan(L, T(x, y, 0) @ Rz(cap + (PI if k == 2 else 0)), rng, lg, abri)
        amarrer("un sampan", Vf.rectangle(x, y, lg, lg * 0.3, cap), lg * 0.92, lg * 0.27, cap)
    couples = [(1, 0.45, -1, 0.9, 1.3, "toile_or"), (3, 0.42, 1, 0.78, 1.2, "natte"), (4, 0.36, 1, 0.9, 1.3, "toile_violette"), (6, 0.27, 1, 0.88, 1.3, "natte")]  # amarrés à couple d'un autre bateau
    for k, t, cote, plus, lg, abri in couples[:1 if leger else 4]:
        x, y, cap = le_long(k, t, cote, lg * 0.3, plus=plus)
        sampan(L, T(x, y, 0) @ Rz(cap + (PI if k % 2 else 0)), rng, lg, abri)
        amarrer("un sampan à couple", Vf.rectangle(x, y, lg, lg * 0.3, cap), lg * 0.92, lg * 0.27, cap)
    for t, demi, voile, bande in ((0.27, 0, "toile_rose", "peint_rouge"), (0.72, PI, "toile_ecrue", "peint_vert"))[:1 if leger else 2]:
        x, y, cap = le_long(6, t, 1, 2.4 * 0.34)
        P.caboteur(L, V, rng, x, y, cap + demi, 2.4, voile, bande)
        amarrer("un caboteur", Vf.rectangle(x, y, 2.4, 2.4 * 0.34, cap), 2.3, 0.74, cap)
    for k, (x, y) in enumerate(((-5.3, -3.9), (4.9, -4.3), (5.6, 3.6))[:2 if leger else 3]):  # des bouées, à l'entrée des chenaux
        L.ajouter(*N.sphere(0.13, 8, 5, 0.8), ("peint_rouge", "peint_vert")[k % 2], T(x, y, 0.02))
        L.ajouter(*N.cylindre(0.014, 0.01, 0.42, 4), "fer", T(x, y, 0.08))
        toile(L, [(x, y, 0.5), (x + 0.14, y, 0.45), (x, y, 0.4)], [(0, 1, 2)], VIFS[k], None, zone=(1.0, 0.5, 1.0))

    # --- ce qui traîne sur le quai : des caisses, des tonneaux, des paniers, des filets ---
    etape("le quai")
    for x, s, quoi in ((-3.2, 1, "t"), (-1.5, -1, "c"), (-0.9, 1, "t"), (1.35, -1, "c"), (2.1, 1, "p"), (3.1, -1, "t"), (-2.1, 1, "p"))[:4 if leger else 7]:
        Mq = T(x, -0.3 + s * 0.25, ZP)
        if quoi == "t":
            P.tonneau(L, Mq)
        elif quoi == "c":
            P.caisse(L, Mq @ Rz(x), 0.15)
        else:
            L.ajouter(*N.cylindre(0.07, 0.085, 0.09, 7, haut=False), "natte", Mq)
            L.ajouter(*N.sphere(0.068, 7, 4, 0.5), rng.choice(["fruits", "poisson", "legumes"]), Mq @ T(0, 0, 0.08))

    # --- les gens (immobiles) : les marchands derrière leurs étals, les clients sur le quai et sur la barge ---
    etape("les gens")
    clients = [(-1.2, -0.52, 1.4), (1.75, -0.08, -1.7), (bx - 0.4, by - 0.1, 1.5), (bx + 0.95, by - 0.12, 0.3), (0.95, -0.52, 1.8)]
    for x, y, zz, cap in marchands[:4 if leger else 9]:  # (ceux de la halle d'abord, puis ceux des bateaux-étals)
        P.passant(L, rng, x, y, angle=cap, z=zz)
        SOL.append(("passant", "un marchand", Vf.rond(x, y, 0.065)))
    for x, y, cap in clients[:2 if leger else 3]:
        zz = ZD if abs(x - bx) < 1.4 and abs(y - by) < 0.7 else ZP
        P.passant(L, rng, x, y, angle=cap, z=zz, leve=1 if x > 1.5 else 0)
        SOL.append(("passant", "un client", Vf.rond(x, y, 0.065)))

    # --- le bateau noir, sans emblème, amarré à l'écart : une silhouette encapuchonnée, un coffre de cartes roulées ---
    etape("la vie")
    Bn = N.Maille("bateau_noir")
    nx_, ny_, cap_n = le_long(4, 1.0, 1, 0.39, recul=-0.12)  # tout au bout de l'aile de l'ouest, côté large (à l'est, le navire d'un équipage à l'escale le cacherait)
    Mn = Rz(cap_n)
    sampan(Bn, Mn, rng, 1.3, "toile_cliente", False, "planches_sombres")
    silhouette(Bn, Mn @ T(-0.3, 0, -0.01))
    Bn.ajouter(*N.boite(0.16, 0.12, 0.09), "planches_sombres", Mn @ T(0.3, 0, -0.01))
    for k in range(3):
        Bn.ajouter(*N.cylindre(0.018, 0.018, 0.17, 5), "parchemin", Mn @ T(0.3, -0.035 + 0.035 * k, 0.1) @ Ry(PI / 2) @ T(0, 0, -0.085))
    noir = (nx_, ny_)
    lots["animes"].append((Bn, (*noir, 0.0), {"anim": "flotte", "mer": 1, "ampl": 0.02, "phase": 2.1}))
    amarrer("le bateau noir", Vf.rectangle(*noir, 1.3, 0.39, cap_n), 1.2, 0.35, cap_n)

    # --- les sampans du bassin, qui dansent ; ceux qui font le tour du marché à la godille ---
    Bs = N.Maille("sampan_bassin")
    sampan(Bs, Rz(PI / 2), rng, 1.2, "toile_or")
    for k, (x, y) in enumerate(((-2.95, 1.05), (2.9, 1.0))[:1 if leger else 2]):
        extras = {"anim": "flotte", "mer": 1, "ampl": 0.02, "phase": 0.6 + 1.9 * k}
        if k == 0:
            i_bassin = len(lots["animes"])
            lots["animes"].append((Bs, (x, y, 0.0), extras))
        else:
            lots["copies"].append((i_bassin, (x, y, 0.0), extras))
        amarrer("un sampan du bassin", Vf.rectangle(x, y, 1.2, 0.36, PI / 2), 1.1, 0.33, PI / 2)
    Bt = N.Maille("sampan_godille")
    sampan(Bt, np.eye(4), rng, 1.35, "natte")
    P.passant(Bt, rng, -0.42, 0.0, angle=0.0, z=-0.01)
    tour = [(math.cos(a) * 6.4, -0.3 + math.sin(a) * 6.0, 0.0) for a in np.arange(0, -2 * PI + 0.01, -PI / 18)]
    for k in range(1 if leger else 2):
        extras = {"anim": "marche", "chemin": [float(c) for p in tour for c in p], "boucle": 1, "vitesse": 0.3, "saut": 0.0, "roulis": 0.05, "phase": 0.5 * k}
        if k == 0:
            i_tour = len(lots["animes"])
            lots["animes"].append((Bt, tour[0], extras))
        else:
            lots["copies"].append((i_tour, tour[0], extras))

    # --- ceux qui marchent : sur le grand quai, sur le bras du milieu, du quai à la barge ; puis les ailes et les bras ---
    zp, zd = ZP + 0.02, ZD + 0.02
    chemins = [  # (points, vitesse, départ, pause) ; les trois premiers suffisent au téléphone
        ([(-3.3, -0.3, zp), (3.3, -0.3, zp)], 0.16, 0.0, 3.0),
        ([(0.0, -0.5, zp), (*le_long(2, 0.0, recul=0.2)[:2], zp), (*le_long(2, 1.0, recul=0.25)[:2], zp)], 0.15, 0.3, 3.5),
        ([(RX, -0.42, zp), (RX, -0.06, zp + 0.02), (RX, 0.34, zd + 0.02), (RX, 0.5, zd), (1.15, 0.5, zd)], 0.15, 0.6, 3.0),
        ([(*le_long(4, 0.0, recul=0.15)[:2], zp), (*le_long(4, 1.0, recul=0.2)[:2], zp), (-0.6, 2.4, zp)], 0.16, 0.2, 2.5),
        ([(*le_long(3, 0.0, recul=0.15)[:2], zp), (*le_long(3, 1.0, recul=0.25)[:2], zp)], 0.15, 0.8, 3.0),
        ([(-1.05, 0.5, zd), (0.2, 0.5, zd)], 0.13, 0.5, 4.0),
    ]
    types = []
    for k in range(3):
        Pm = N.Maille(f"marcheur{k}")
        P.passant(Pm, rng, 0, 0, angle=0.0, z=0.0, marcheur=True)
        types.append(Pm)
    deja = {}
    for k, (pts, vit, depart, pause) in enumerate(chemins[:3] if leger else chemins):
        extras = {"anim": "marche", "chemin": [float(c) for p in pts for c in p], "vitesse": vit, "phase": depart, "saut": 0.022, "pause": pause}
        t_ = k % len(types)
        if t_ not in deja:
            deja[t_] = len(lots["animes"])
            lots["animes"].append((types[t_], pts[0], extras))
        else:
            lots["copies"].append((deja[t_], pts[0], extras))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "fumees", "points": [float(c) for p in fumees for c in p], "grosseur": 0.4}))
    lots["reperes"].append(((0.0, 0.0, 6.2), {"anim": "oiseaux", "nb": 4 if leger else 7, "rayon": 5.4, "envergure": 0.14}))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "mer", "rayon": 7.5, "genre": 2}))
    for nom, e in coques[1:]:  # une amarre par bateau : de sa proue au ponton le plus proche
        ex, ey = (e[0][0] + e[1][0] + e[2][0] + e[3][0]) / 4, (e[0][1] + e[1][1] + e[2][1] + e[3][1]) / 4
        proue = max(((e[k][0] + e[(k + 1) % 4][0]) / 2, (e[k][1] + e[(k + 1) % 4][1]) / 2) for k in range(4)) if nom == "un caboteur" else ((e[1][0] + e[2][0]) / 2, (e[1][1] + e[2][1]) / 2)
        px, py = proue[0] + (ex - proue[0]) * 0.12, proue[1] + (ey - proue[1]) * 0.12
        mieux = min(((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t) for a, b, _ in plans for t in (k / 24 for k in range(25))), key=lambda q: math.hypot(q[0] - px, q[1] - py))
        if 0.15 < math.hypot(mieux[0] - px, mieux[1] - py) < 1.6 and "noir" not in nom and "bassin" not in nom and "couple" not in nom:
            L.ajouter(*N.poutre((px, py, 0.13), (mieux[0] + (px - mieux[0]) * 0.2, mieux[1] + (py - mieux[1]) * 0.2, ZP + 0.01), 0.012), "corde")
    lots["libres"].append((Rv, (0.0, 0.0, 0.0), {"role": "decor"}))
    etape("fin")
    lots["plan"] = {"emprises": emprises, "sol": SOL, "ponts": ponts, "coques": coques}
    return lots


def verifier(lots=None, leger=False):
    """Les erreurs de plan (voir barhaw_ile_v5.controler), plus celles d'un marché sur l'eau : une coque qui mord sur un
    ponton. Une liste vide quand tout va bien."""
    lots = lots or mailles(leger=leger)
    erreurs = K.controler(lots, sol)
    plan = lots["plan"]
    for nom, e in plan["coques"]:
        for k, p in enumerate(plan["ponts"][:7]):
            if Vf.penetration(e, p) > 0.03:
                erreurs.append(f"{nom} mord de {Vf.penetration(e, p):.2f} sur le ponton {k}")
    return erreurs


def construire(rendu=True, cuire=True, exporter=True, taille=None, echantillons=48, leger=False, alleger=True):
    lots = mailles(leger=leger)
    rendus = [("marche-v5", (0, -19, 12), (0, 0.0, 1.0), 55), ("marche-v5-barge", (3.5, -9.5, 4.6), (0.2, 0.2, 1.1), 60)] if rendu else []
    return K.construire("ile-marche-v5", lots, verifier(lots), rendus, cuire, exporter, taille or (2048 if leger else 3072), echantillons, leger, alleger, atlas="marche")
