# L'Île Givre, « niveau 5 » : un glacier bleu, un lac gelé, un village de rondins sous la neige. Tout est inventé.
# (Son histoire, dans le bot : « Tout est gelé, même le café. Bataille de boules de neige générale sur le pont. »)
# Le glacier et ses gradins de glace vive, ses aiguilles, ses cristaux qui luisent (la matière « astre » du site) ; le
# torrent gelé qui en descend jusqu'au lac ; le lac gelé (un patineur, un pêcheur devant son trou) ; le ruisseau gelé et son
# pont de bois, où l'on se bat à coups de boules de neige (deux murets de neige, six lanceurs, les boules qui volent : le
# site) ; le village (quatre chalets, le feu de la place, le café gelé : la cafetière verse un filet de café pris en
# glace) ; deux igloos ; le ponton et le navire pris dans les glaces ; l'arche de glace, l'iceberg et les glaçons qui
# dansent sur l'eau ; les sapins chargés de neige (le vent), les manchots, les bonshommes de neige.
# Sorties : ile-givre-v5.glb (+ -leger) et son atlas .png. Contrôle du plan : verifier() (voir barhaw_ile_v5.py).
import math, random
import numpy as np
import barhaw_niveau5 as N
import barhaw_verif as Vf
import barhaw_ile_v5 as K
import barhaw_port_v5 as P
import barhaw_recif_v5 as Rf

PI = math.pi
T, Rz, Rx, Ry = N.T, N.Rz, N.Rx, N.Ry


def tx_glace(c=0xa9dcf2, fond=0x4d9fd2, graine=1, givre=0.45, fissures=1.0):
    """De la glace : un bleu profond par endroits, des fissures blanches (un réseau, de longues veines), du givre par plaques."""
    n = N.TAILLE
    b1, b2, b3 = N.bruit(n, 4, 4, graine, 4), N.bruit(n, 16, 16, graine + 1, 3), N.bruit(n, 70, 70, graine + 2, 2)
    coul = N.mel(np.broadcast_to(N.hexa(fond), (n, n, 3)).copy(), np.broadcast_to(N.hexa(c), (n, n, 3)), N.lisse(0.3, 0.72, b1 + (b2 - 0.5) * 0.3))
    coul *= (0.9 + 0.2 * b3)[..., None]
    d, ident, nb = N.cellules(n, 4, graine + 3)
    veines = np.abs(((b2 * 3.0 + b1 * 2.0) % 1.0) - 0.5)
    blanc = np.maximum(N.lisse(0.035, 0.0, d), N.lisse(0.02, 0.0, veines) * 0.8) * fissures
    coul = N.mel(coul, np.array([0.93, 0.97, 1.0], np.float32), blanc * 0.85)
    coul = N.mel(coul, np.array([0.9, 0.95, 1.0], np.float32), N.lisse(1 - givre, 1 - givre + 0.2, b1 * 0.5 + b2 * 0.5) * 0.7)
    return np.clip(coul, 0, 1).astype(np.float32), np.clip(0.5 - 0.4 * blanc + 0.15 * b3, 0, 1).astype(np.float32)


N.matiere("neige", N.tx_uni, 2.0, 0.3, rugueux=0.75, c=0xd6e1ef, graine=411, grain=0.05, taches=0.1, c2=0xb7cbe4, seuil=0.6)
N.matiere("glace", tx_glace, 2.4, 0.5, rugueux=0.22, lueur=0.22, graine=412)
N.matiere("glace_vive", tx_glace, 2.0, 0.4, rugueux=0.15, lueur=0.3, c=0xc4ecfa, fond=0x6fc0e6, graine=413, givre=0.3)
N.matiere("glace_lac", tx_glace, 3.0, 0.2, rugueux=0.12, lueur=0.12, c=0x9fd3ea, fond=0x3f8fc4, graine=414, givre=0.55)
N.matiere("blocs_neige", N.tx_pierres, 1.0, 0.8, c=0xd3deec, rangs=6, graine=415, mortier=0x9db4cf, mousse=0.0)
N.matiere("rondins", N.tx_planches, 0.9, 1.0, c=0x6e4a2c, nb=5, graine=416, usure=0.5)
N.matiere("sapin", N.tx_feuillage, 0.55, 0.9, c=0x2c5a46, graine=417, g=12)
N.matiere("ecorce_sapin", N.tx_corde, 0.4, 0.9, c=0x4a3526, graine=418)
N.matiere("cafe", N.tx_uni, 0.3, 0.2, rugueux=0.3, c=0x5a3520, graine=419, grain=0.1, taches=0.2)
N.matiere("plume_noire", N.tx_uni, 0.4, 0.2, c=0x23262e, graine=420, grain=0.1, taches=0.15)
N.matiere("eau_trou", N.tx_uni, 0.5, 0.1, rugueux=0.15, c=0x123a52, graine=421, grain=0.05, taches=0.2)

GLACIER = (-0.8, 3.3)  # le sommet du glacier
PIC = (2.9, 3.2)  # le petit pic du nord-est
LAC, R_LAC, Z_LAC = (1.7, -0.4), 1.5, 0.34  # le lac gelé
R_SOL = 9.6
PISTES = []
CASCADE = [(-0.45, 2.75), (0.1, 2.15), (0.6, 1.6), (1.0, 1.15), (1.28, 0.82)]  # le torrent gelé, du glacier au lac
RUISSEAU = [(2.75, -1.45), (3.35, -2.3), (3.8, -3.0), (4.2, -3.85), (4.55, -4.7), (4.62, -4.92)]  # du lac à la mer


def rivage(th):
    """Le rayon de la côte dans cette direction : une côte découpée par la glace."""
    return 6.9 + 0.5 * math.sin(2 * th + 0.9) + 0.35 * math.sin(3 * th + 2.4) + 0.3 * math.sin(5 * th + 0.6) + 0.15 * math.sin(9 * th)


_COTE = np.array([(math.cos(a) * rivage(a), math.sin(a) * rivage(a)) for a in np.linspace(-PI, PI, 720, endpoint=False)])


def bord(x, y):
    """La vraie distance au bord de l'eau ; > 0 : à terre."""
    d = float(np.sqrt(((_COTE - (x, y)) ** 2).sum(axis=1).min()))
    return d if math.hypot(x, y) < rivage(math.atan2(y, x)) else -d


def cascade(x, y):
    return K.distance_au_trajet(x, y, CASCADE)


def ruisseau(x, y):
    return K.distance_au_trajet(x, y, RUISSEAU)


def sol(x, y):
    """La hauteur du terrain : la banquise du rivage (une marche nette), les champs de neige et leurs congères, le glacier
    et ses gradins, le lit du torrent, la cuvette du lac, le lit du ruisseau."""
    d = bord(x, y)
    if d < 0:
        return max(-1.4, 0.5 * d)
    h = 0.24 * (1 - math.exp(-d / 0.4)) + 0.3 * K.lisse(0.8, 3.0, d)
    rg, rp = math.hypot((x - GLACIER[0]) / 1.22, y - GLACIER[1]), math.hypot(x - PIC[0], y - PIC[1])
    gl = 2.75 * math.exp(-((rg / 2.05) ** 3)) + 1.8 * math.exp(-((rp / 1.1) ** 2))  # un dôme au sommet plat, aux flancs raides
    gl *= 1 + 0.5 * (K.bruit2(x * 0.7 + 3.1, y * 0.7, 5) - 0.5) + 0.26 * (K.bruit2(x * 1.9, y * 1.9 + 1.7, 7) - 0.5)  # des gradins cassés, pas des anneaux
    pas = 0.6
    marche = (math.floor(gl / pas) + K.lisse(0.6, 1.0, (gl / pas) % 1.0)) * pas
    dc = cascade(x, y)
    gradins = 0.6 * K.lisse(0.35, 1.0, dc)  # près du torrent gelé, une pente lisse
    h += (gl * (1 - gradins) + marche * gradins) * K.lisse(0.3, 1.5, d)
    h -= 0.14 * K.lisse(0.45, 0.0, dc) * K.lisse(0.4, 1.0, gl)
    dl = math.hypot(x - LAC[0], y - LAC[1])
    h += (0.3 - h) * K.lisse(R_LAC + 0.6, R_LAC - 0.05, dl)
    h -= 0.18 * K.lisse(0.42, 0.0, ruisseau(x, y)) * K.lisse(0.1, 0.6, d) * K.lisse(R_LAC - 0.1, R_LAC + 0.4, dl)
    h += (K.bruit2(x * 1.4, y * 1.4, 23) - 0.5) * 0.12 * K.lisse(0.5, 1.6, d) * K.lisse(R_LAC + 0.1, R_LAC + 0.9, dl)
    return h


def vers(angle, dedans):
    """Un point dans cette direction (degrés, 90 = le nord), à cette distance du bord de l'eau (vers l'intérieur)."""
    a = math.radians(angle)
    r = rivage(a) - dedans
    return math.cos(a) * r, math.sin(a) * r


def tx_sol_givre(taille=2048, graine=101):
    """Le sol peint pixel par pixel : la neige (ses rides de vent, le bleu de ses creux, ses paillettes), la glace vive des
    pentes raides et ses fissures, la banquise mouillée du rivage, les berges du lac et du ruisseau, la neige
    tassée des sentiers et ses traces de pas."""
    n = taille
    hc = K.champ(sol, R_SOL, 240)
    gy, gx = np.gradient(hc)
    pente = K.agrandir(np.hypot(gx, gy) * 240 / (2 * R_SOL), n)  # la pente, relevée grossièrement puis lissée (sinon : des carrés)
    h = K.agrandir(hc, n)
    dl = K.agrandir(K.champ(lambda x, y: math.hypot(x - LAC[0], y - LAC[1]), R_SOL), n)
    dr = K.agrandir(K.champ(lambda x, y: min(ruisseau(x, y), cascade(x, y)), R_SOL), n)
    piste = K.agrandir(K.champ(lambda x, y: min((K.distance_au_trajet(x, y, p) for p in PISTES), default=9.0), R_SOL), n)
    b1, b2, b3, fin = N.bruit(n, 7, 7, graine, 4), N.bruit(n, 28, 28, graine + 1, 3), N.bruit(n, 90, 90, graine + 2, 2), N.bruit(n, 256, 256, graine + 3, 1)
    grain = N.bruit(n, 640, 640, graine + 4, 1)
    semis = np.random.default_rng(graine + 6).random((n, n)).astype(np.float32)
    x, y = N.grille(n)
    rides = np.sin((x * 0.8 + y * 0.6) * 2 * PI * 46 + b1 * 9.0)
    neige, ombre = N.hexa(0xd3deee), N.hexa(0xa3bbdc)
    coul = np.broadcast_to(neige, (n, n, 3)).copy() * (0.95 + 0.05 * b1 + 0.03 * fin + 0.04 * (grain - 0.5) + 0.02 * rides + 0.1 * (semis > 0.992))[..., None]
    coul = N.mel(coul, ombre * (0.95 + 0.1 * b3)[..., None], N.lisse(0.52, 0.3, b2) * 0.45)
    veines = np.abs(((b2 * 4.0 + b1 * 2.0 + b3 * 0.6) % 1.0) - 0.5)
    glace = N.mel(np.broadcast_to(N.hexa(0x5fa9d8), (n, n, 3)).copy(), np.broadcast_to(N.hexa(0x9fd6ee), (n, n, 3)), N.lisse(0.3, 0.7, b3 * 0.6 + b1 * 0.4))
    glace = N.mel(glace, np.array([0.92, 0.97, 1.0], np.float32), N.lisse(0.022, 0.0, veines) * 0.4)
    glace *= (0.93 + 0.14 * fin + 0.08 * (grain - 0.5))[..., None]
    coul = N.mel(coul, glace, N.lisse(0.55, 1.1, pente + (b2 - 0.5) * 0.4))
    coul = N.mel(coul, N.hexa(0x8fc8e4) * (0.92 + 0.14 * b2)[..., None], N.lisse(0.2, 0.06, h + (b2 - 0.5) * 0.06))
    coul = N.mel(coul, N.hexa(0x5aa3cc) * (0.9 + 0.15 * b2)[..., None], N.lisse(0.07, 0.0, h + (b2 - 0.5) * 0.04))
    berges = np.maximum(N.lisse(R_LAC + 0.25, R_LAC, dl + (b2 - 0.5) * 0.2), N.lisse(0.5, 0.25, dr + (b2 - 0.5) * 0.12)) * N.lisse(0.05, 0.15, h)
    coul = N.mel(coul, glace, berges * 0.85)
    tasse = N.hexa(0xb9c8dc) * (0.93 + 0.1 * b3 + 0.06 * (grain - 0.5))[..., None]
    sur = N.lisse(0.2, 0.08, piste + (b2 - 0.5) * 0.1) * N.lisse(0.2, 0.3, h)
    coul = N.mel(coul, tasse, sur * 0.9)
    coul = N.mel(coul, N.hexa(0x93a8c4), sur * (fin > 0.62) * (b3 > 0.45) * 0.6)
    relief = 0.5 + 0.2 * rides * (1 - N.lisse(0.55, 1.1, pente)) + 0.3 * (b3 - 0.5) + 0.2 * (fin - 0.5)
    return np.clip(coul, 0, 1).astype(np.float32), np.clip(relief, 0, 1).astype(np.float32)


N.matiere("sol_givre", tx_sol_givre, 2 * R_SOL, 0.5, rugueux=0.8)


# ---------- les pièces ----------
def ruban_de_glace(L, pts, haut, l0, l1, mat, bombe=0.1, dessus=0.05, vagues=0.0):
    """De l'eau prise en glace qui suit le relief (le torrent, le ruisseau) : un ruban bombé au milieu ; vagues : l'eau s'est
    figée en bourrelets (le torrent)."""
    trajet = K.suivre(pts, haut, 0.22)
    v, f = [], []
    ech = N.MATIERES[mat]["taille"]  # le motif posé à plat, d'un seul tenant (sinon chaque face aurait le sien)
    for k, q in enumerate(trajet):
        a, b = trajet[max(0, k - 1)], trajet[min(len(trajet) - 1, k + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        lg = math.hypot(dx, dy) or 1.0
        t = k / (len(trajet) - 1)
        larg = (l0 + (l1 - l0) * t) * (1 + 0.07 * math.sin(k * 1.1) + 0.5 * vagues * abs(math.sin(k * 1.3)) * 0.3)
        for s in (-1, 0, 1):
            x, y = q[0] + s * dy / lg * larg / 2, q[1] - s * dx / lg * larg / 2
            v.append((x, y, max(0.04, haut(x, y)) + dessus + (bombe * (1 + vagues * math.sin(k * 2.4)) if s == 0 else 0.0)))
        if k:
            f += [(3 * k - 3, 3 * k - 2, 3 * k + 1, 3 * k), (3 * k - 2, 3 * k - 1, 3 * k + 2, 3 * k + 1)]
    L.ajouter(v, f, mat, uv=[(x / ech, y / ech) for x, y, _ in v])


def glacons(L, rng, a, b, nb, h=0.1, mat="glace_vive"):
    """Des glaçons qui pendent le long d'un bord (d'un point à l'autre) : de petits cônes, la pointe en bas."""
    a, b = np.asarray(a, float)[:3], np.asarray(b, float)[:3]
    for k in range(nb):
        q = a + (b - a) * (k + 0.3 + 0.4 * rng.random()) / nb
        L.ajouter(*N.cylindre(0.014 + 0.008 * rng.random(), 0.0, h * (0.5 + rng.random()), 4, haut=False), mat, T(*q) @ Rx(PI))


def sapin(L, rng, x, y, z, h=1.5, etages=5):
    """Un sapin chargé de neige : un tronc, des étages de branches (le vent les balance : couleur de sommet), la neige dessus."""
    M = T(x, y, z) @ Rz(rng.random() * 6.28)
    L.ajouter(*N.cylindre(0.05 * h, 0.03 * h, h * 0.42, 6, haut=False), "ecorce_sapin", M @ T(0, 0, -0.1))
    for k in range(etages):
        t = k / max(1, etages - 1)
        r, zz, hh = h * (0.37 - 0.25 * t) * (0.92 + 0.16 * rng.random()), h * (0.18 + 0.6 * t), h * (0.36 - 0.1 * t)
        vert = 0.88 - 0.2 * t  # le vent : 1 - vert ; la cime bouge plus que le pied
        a = rng.random() * 6.28
        L.ajouter(*N.cylindre(r, 0.0, hh, 10, haut=False, bas=True), "sapin", M @ T(0, 0, zz) @ Rz(a), zone=(1.0, vert, 1.0))
        part = 0.5 + 0.2 * rng.random()  # la neige ne couvre que le haut de l'étage, un peu de travers
        L.ajouter(*N.cylindre(r * part, 0.0, hh * part, 10, haut=False), "neige", M @ T(0.02 * h * math.cos(a), 0.02 * h * math.sin(a), zz + hh * (1.045 - part)) @ Rz(a + 0.3), zone=(1.0, vert, 1.0))


def seracs(L, U, rng, x, y, z, nb=5, h=1.2, r=0.4, luit=False, penche=1.0):
    """Des aiguilles de glace : des prismes bleus, de travers ; parfois un cristal qui luit au milieu (« astre »)."""
    for k in range(nb):
        a, dd = rng.random() * 6.28, rng.random() * r
        hh = h * (0.45 + 0.55 * rng.random()) * (1 - 0.4 * dd / max(r, 0.01))
        L.ajouter(*N.cylindre(0.07 + 0.09 * rng.random(), 0.0, hh, 5, haut=False), rng.choice(["glace", "glace_vive"]), T(x + math.cos(a) * dd, y + math.sin(a) * dd, z - 0.1) @ Rz(a) @ Rx((0.08 + 0.3 * rng.random()) * penche))
    if luit:
        cristal(U, x, y, z + 0.16, 0.34)


def cristal(U, x, y, z, h=0.3):
    """Un cristal qui luit : deux pointes dos à dos (la matière « astre » du site ; la nuit, il éclaire la glace)."""
    M = T(x, y, z) @ Rz(0.6)
    U.ajouter(*N.cylindre(h * 0.17, 0.0, h * 0.72, 4, haut=False), "astre", M)
    U.ajouter(*N.cylindre(h * 0.17, 0.0, h * 0.28, 4, haut=False), "astre", M @ Rx(PI))


def chalet(L, V, U, rng, x, y, z, cap, lx=1.1, ly=0.85, fin=True):
    """Un chalet de rondins : ses murs, les bouts de rondins aux angles, un toit à deux pentes chargé de neige, des glaçons au
    bord du toit, la porte (vers +x) et sa lanterne, deux fenêtres qui s'allument, une cheminée de pierre. Renvoie le haut de
    la cheminée (pour la fumée)."""
    M = T(x, y, z - 0.06) @ Rz(cap)
    hm, ht = 0.5, 0.42
    L.ajouter(*N.boite(lx, ly, hm, haut=False), "rondins", M)
    if fin:
        for sx in (-1, 1):
            for sy in (-1, 1):
                for k in range(4):
                    L.ajouter(*N.poutre((sx * (lx / 2 - 0.03), sy * (ly / 2 + 0.06), 0.07 + k * 0.125), (sx * (lx / 2 - 0.03), sy * (ly / 2 - 0.02), 0.07 + k * 0.125), 0.075), "planches_sombres", M)
    L.ajouter(*N.pignons(lx, ly, ht), "rondins", M @ T(0, 0, hm))
    L.ajouter(*N.toit_pignon(lx, ly, ht, 0.12, 0.05), "bardeaux", M @ T(0, 0, hm), tourne=True)
    L.ajouter(*N.toit_pignon(lx - 0.05, ly - 0.05, ht, 0.1, 0.075), "neige", M @ T(0, 0, hm + 0.045))
    pente = ht / (ly / 2)
    zb = hm - 0.12 * pente  # le bas du toit
    for sy in (-1, 1):
        glacons(L, rng, M @ np.array((-lx / 2, sy * (ly / 2 + 0.115), zb, 1)), M @ np.array((lx / 2, sy * (ly / 2 + 0.115), zb, 1)), 7 if fin else 4)
    L.ajouter(*N.quad((lx / 2 + 0.004, -0.13, 0.02), (lx / 2 + 0.004, 0.13, 0.02), (lx / 2 + 0.004, 0.13, 0.42), (lx / 2 + 0.004, -0.13, 0.42)), "porte", M)
    L.ajouter(*N.boite(0.2, 0.36, 0.03), "neige", M @ T(lx / 2 + 0.12, 0, 0.04))  # le seuil enneigé
    for sy in (-1, 1):
        V.ajouter(*N.boite(0.2, 0.03, 0.17), "vitre", M @ T(-0.08, sy * (ly / 2 + 0.002), 0.2))
        L.ajouter(*N.boite(0.26, 0.05, 0.03), "neige", M @ T(-0.08, sy * (ly / 2 + 0.02), 0.17))  # la neige sur l'appui
    L.ajouter(*N.poutre((lx / 2 + 0.01, 0.22, 0.4), (lx / 2 + 0.11, 0.22, 0.4), 0.02), "fer", M)
    U.ajouter(*N.sphere(0.036, 6, 4), "lumiere", M @ T(lx / 2 + 0.11, 0.22, 0.35))
    L.ajouter(*N.boite(0.17, 0.17, 0.5), "pierres_sombres", M @ T(-lx * 0.26, -ly * 0.18, hm + 0.18))
    L.ajouter(*N.boite(0.21, 0.21, 0.04), "neige", M @ T(-lx * 0.26, -ly * 0.18, hm + 0.68))
    return (M @ np.array((-lx * 0.26, -ly * 0.18, hm + 0.76, 1)))[:3]


def igloo(L, U, x, y, z, cap, r=0.5):
    """Un igloo : un dôme de blocs de neige, son tunnel d'entrée (vers +x), une lanterne au-dessus."""
    M = T(x, y, z) @ Rz(cap)
    L.ajouter(*N.sphere(r, 12, 8, 0.84), "blocs_neige", M @ T(0, 0, -0.03))
    L.ajouter(*N.cylindre(0.2, 0.19, 0.36, 8, haut=True), "blocs_neige", M @ T(r * 0.78, 0, -0.02) @ Ry(PI / 2))
    L.ajouter(*N.cylindre(0.125, 0.125, 0.006, 8), "plume_noire", M @ T(r * 0.78 + 0.357, 0, -0.02) @ Ry(PI / 2))
    L.ajouter(*N.poutre((r * 0.78 + 0.3, 0, 0.16), (r * 0.78 + 0.3, 0, 0.3), 0.016), "fer", M)
    U.ajouter(*N.sphere(0.034, 6, 4), "lumiere", M @ T(r * 0.78 + 0.3, 0, 0.32))


def manchot(L, rng, x, y, z, cap, s=1.0):
    """Un manchot (inventé, tout simple) : un corps noir, un ventre blanc, un bec et des pattes orange, deux ailerons."""
    M = T(x, y, z) @ Rz(cap) @ N.S(s)
    L.ajouter(*N.sphere(0.055, 7, 5, 1.55), "plume_noire", M @ T(0, 0, 0.088))
    L.ajouter(*N.sphere(0.044, 7, 5, 1.5), "neige", M @ T(0.02, 0, 0.08))
    L.ajouter(*N.sphere(0.037, 7, 5), "plume_noire", M @ T(0.004, 0, 0.192))
    L.ajouter(*N.cylindre(0.013, 0.0, 0.042, 5, haut=False), "fruits", M @ T(0.034, 0, 0.186) @ Ry(PI / 2))
    for c in (-1, 1):
        L.ajouter(*N.boite(0.034, 0.012, 0.09), "plume_noire", M @ T(0, c * 0.058, 0.07) @ Rx(-c * 0.28))
        L.ajouter(*N.boite(0.048, 0.028, 0.01), "fruits", M @ T(0.022, c * 0.026, 0))


def bonhomme(L, rng, x, y, z, cap):
    """Un bonhomme de neige pirate : trois boules, un nez de carotte, deux bras de bois, une écharpe, un tricorne."""
    M = T(x, y, z) @ Rz(cap)
    for r, zz in ((0.15, 0.11), (0.11, 0.3), (0.08, 0.44)):
        L.ajouter(*N.sphere(r, 9, 6, 0.9), "neige", M @ T(0, 0, zz))
    L.ajouter(*N.cylindre(0.018, 0.0, 0.085, 5, haut=False), "fruits", M @ T(0.07, 0, 0.44) @ Ry(PI / 2))
    for s in (-1, 1):
        L.ajouter(*N.sphere(0.012, 4, 3), "plume_noire", M @ T(0.068, s * 0.03, 0.47))
        L.ajouter(*N.tube([(0, s * 0.09, 0.32), (0.02, s * 0.2, 0.4), (0.03, s * 0.27, 0.38)], [0.012, 0.009, 0.006], 4), "planches_sombres", M)
    L.ajouter(*N.cylindre(0.086, 0.086, 0.032, 8, haut=False), "tissu_rouge", M @ T(0, 0, 0.372))
    L.ajouter(*N.cylindre(0.125, 0.105, 0.014, 3), "tissu_sombre", M @ T(0, 0, 0.502) @ Rz(PI))
    L.ajouter(*N.cylindre(0.06, 0.045, 0.05, 6), "tissu_sombre", M @ T(0, 0, 0.512))


def plaque(L, rng, x, y, r, z0=-0.08, z1=0.06, neige=True):
    """Une plaque de banquise : un polygone de glace, de la neige dessus."""
    n, a0 = 6, rng.random() * 6.28
    pts = [(x + math.cos(a0 + k * 2 * PI / n) * r * (0.75 + 0.35 * rng.random()), y + math.sin(a0 + k * 2 * PI / n) * r * (0.75 + 0.35 * rng.random())) for k in range(n)]
    L.ajouter(*N.polygone(pts, z0, z1), "glace")
    if neige:
        L.ajouter(*N.polygone([(x + (px - x) * 0.72, y + (py - y) * 0.72) for px, py in pts], z1, z1 + 0.018), "neige")


def muret(L, rng, c, u, n_, sens):
    """Un muret de blocs de neige, en arc, bombé vers l'adversaire (sens : +1, il est du côté de u) ; derrière, un tas de boules."""
    cap = math.atan2(u[1], u[0])
    for rang, (nb, zz, lz) in enumerate(((7, -0.03, 0.15), (6, 0.118, 0.12))):  # deux rangs de blocs de neige, décalés d'un demi-bloc
        for i in range(nb):
            k = i - (nb - 1) / 2
            q = c + n_ * k * 0.156 - u * sens * 0.014 * k * k
            L.ajouter(*N.boite(0.15 + 0.02 * (i % 2), 0.15, lz), "neige", T(q[0], q[1], sol(*c) + zz + 0.012 * ((i * 7 + rang) % 3)) @ Rz(cap - sens * 0.09 * k))
    t = c - u * sens * 0.26
    for k, (dx, dy, dz) in enumerate(((0, 0, 0), (0.06, 0, 0), (0.03, 0.055, 0), (0.03, -0.055, 0), (0.03, 0, 0.048))):
        L.ajouter(*N.sphere(0.032, 6, 4), "neige", T(t[0] + dx - 0.03, t[1] + dy, sol(*t) + 0.03 + dz))


def mailles(graine=79, leger=False):
    """leger : la version téléphone (un relief moins fin, moins de sapins et d'aiguilles, trois marcheurs, un seul manchot
    qui se promène)."""
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

    # --- le plan : le ponton, le pont du ruisseau, la place du village, le café, les chemins (rien d'autre ne s'y pose) ---
    pa, pb = np.array(vers(-100, 0.6)), np.array(vers(-100, -2.3))  # le ponton : de la grève vers le large
    dp = (pb - pa) / np.linalg.norm(pb - pa)
    nq = np.array((-dp[1], dp[0]))
    lg, ZQ = float(np.linalg.norm(pb - pa)), 0.4
    C = np.array((3.8, -2.95))  # le pont de bois, par-dessus le ruisseau gelé : là où l'on se bat
    ub = np.array((0.88, 0.48)) / math.hypot(0.88, 0.48)
    nb_ = np.array((-ub[1], ub[0]))
    A, B = C - ub * 0.95, C + ub * 0.95
    ZP = max(sol(*A), sol(*B)) + 0.12
    place = (-3.15, -2.75)  # la place du village, son feu
    chalets = [(-4.5, -3.8), (-2.55, -4.3), (-4.55, -1.85), (-2.7, -1.25)]
    cafe, cap_cafe = (-1.6, -2.75), PI  # le café gelé : son comptoir regarde la place
    igloos = [(-0.6, -0.55, -0.5), (-2.0, 0.25, -0.9)]
    z = lambda p: (p[0], p[1], sol(p[0], p[1]) + 0.02)
    arc = lambda a0, a1, dedans, pas=3: [z(vers(a, dedans)) for a in np.arange(a0, a1 + 0.01, pas)]
    terre = lambda pts: K.suivre(pts, sol)
    patinoire = [(LAC[0] + math.cos(k * 2 * PI / 20) * 0.85, LAC[1] + math.sin(k * 2 * PI / 20) * 0.85, Z_LAC + 0.02) for k in range(20)]
    chemins = [  # (points, en rond, vitesse, départ, pause) ; les trois premiers suffisent au téléphone
        ([(*(pa + dp * (lg - 0.6)), ZQ + 0.02), (*(pa + dp * 0.5), ZQ + 0.02)] + terre([pa - dp * 0.3, (-1.35, -4.6), (-1.75, -3.7), (-2.55, -3.1)]), False, 0.18, 0.0, 3.0),
        (patinoire, True, 0.4, 0.0, 0.0),
        (terre([(-2.45, -2.3), (-1.85, -1.85), (-0.9, -2.0), (0.3, -2.45), (1.4, -2.7), (2.0, -2.75)]), False, 0.17, 0.4, 4.0),
        (arc(-14, 26, 1.6), False, 0.16, 0.7, 2.5),
    ]
    plage_manchots = arc(0, 22, 0.42, 2)  # là où les manchots se dandinent
    couloirs = [(pts, 0.07) for pts, *_ in chemins if pts is not patinoire] + [(plage_manchots, 0.06)]

    def libre(x, y, r):
        """Cette place est-elle à terre, hors des passages, loin du lac, du torrent, du ruisseau et de ce qui est déjà posé ?"""
        if sol(x, y) < 0.14 or math.hypot(x - LAC[0], y - LAC[1]) < R_LAC + r + 0.3 or min(cascade(x, y), ruisseau(x, y)) < r + 0.45:
            return False
        if any(K.distance_au_trajet(x, y, pts) < r + rc + 0.04 for pts, rc in couloirs):
            return False
        return all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for _, _, p in SOL) and all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for p in ponts)

    # --- le terrain (d'un seul tenant, à sommets partagés) ---
    n, R = (56 if leger else 74), R_SOL
    xs = [-R + 2 * R * i / n for i in range(n + 1)]
    H = [[sol(x, y) for x in xs] for y in xs]
    PISTES[:] = [chemins[0][0][2:], chemins[2][0], chemins[3][0]]
    rang, sommets, uvs, faces = {}, [], [], []

    def sommet(i, j):
        if (i, j) not in rang:
            rang[(i, j)] = len(sommets)
            sommets.append((xs[i], xs[j], H[j][i]))
            uvs.append(((xs[i] + R) / (2 * R), (xs[j] + R) / (2 * R)))
        return rang[(i, j)]

    for j in range(n):
        for i in range(n):
            if max(H[j][i], H[j][i + 1], H[j + 1][i + 1], H[j + 1][i]) < -0.25:
                continue
            faces.append((sommet(i, j), sommet(i + 1, j), sommet(i + 1, j + 1), sommet(i, j + 1)))
    L.ajouter(sommets, faces, "sol_givre", uv=uvs)
    L.regrouper(0, None, 4, 0.75)

    def dessus(x, y):
        """La hauteur de la maille du terrain (plus haute que sol() entre deux points de la grille, sur les gradins)."""
        fx, fy = (x + R) / (2 * R) * n, (y + R) / (2 * R) * n
        i, j = min(n - 1, max(0, int(fx))), min(n - 1, max(0, int(fy)))
        tx, ty = fx - i, fy - j
        return max(sol(x, y), H[j][i] * (1 - tx) * (1 - ty) + H[j][i + 1] * tx * (1 - ty) + H[j + 1][i] * (1 - tx) * ty + H[j + 1][i + 1] * tx * ty)

    # --- le lac gelé, le torrent gelé qui y descend, le ruisseau gelé qui en sort ---
    nl = 16 if leger else 26
    tour_lac = [(LAC[0] + math.cos(k * 2 * PI / nl) * R_LAC * (1.03 + 0.05 * math.sin(3 * k * 2 * PI / nl + 1.0)), LAC[1] + math.sin(k * 2 * PI / nl) * R_LAC * (1.03 + 0.05 * math.sin(3 * k * 2 * PI / nl + 1.0)), Z_LAC) for k in range(nl)]
    L.ajouter([(LAC[0], LAC[1], Z_LAC)] + tour_lac, [(0, 1 + k, 1 + (k + 1) % nl) for k in range(nl)], "glace_lac")
    ruban_de_glace(L, CASCADE, dessus, 0.34, 0.66, "glace_vive", 0.13, 0.06, 0.7)
    ruban_de_glace(L, RUISSEAU, dessus, 0.5, 0.62, "glace_lac", 0.03, 0.05)
    bords = K.suivre(CASCADE, dessus, 0.3)
    for k in range(1, len(bords) - 1, 2 if leger else 1):  # des glaçons dressés le long du torrent, d'un côté puis de l'autre
        a, b = bords[k - 1], bords[k + 1]
        lgb = math.hypot(b[0] - a[0], b[1] - a[1]) or 1.0
        cote_ = 1 if k % 2 else -1
        x, y = bords[k][0] + cote_ * (b[1] - a[1]) / lgb * 0.33, bords[k][1] - cote_ * (b[0] - a[0]) / lgb * 0.33
        L.ajouter(*N.cylindre(0.05 + 0.03 * abs(math.sin(k * 1.9)), 0.0, 0.22 + 0.3 * abs(math.sin(k * 2.7)), 5, haut=False), "glace_vive", T(x, y, dessus(x, y) - 0.04) @ Rz(k) @ Rx(0.12 * cote_))
    for k in range(5 if leger else 9):  # au pied du torrent, de gros glaçons dressés
        t = k / 8.0
        q = np.array(CASCADE[-1]) + np.array((-0.38 + 0.76 * t, 0.12 * math.sin(t * PI) + 0.1))
        L.ajouter(*N.cylindre(0.05 + 0.03 * math.sin(k * 2.1) ** 2, 0.0, 0.3 + 0.25 * abs(math.sin(k * 1.7)), 5, haut=False), "glace_vive", T(q[0], q[1], dessus(*q) - 0.05) @ Rz(k))
    trou = (LAC[0] + 0.85, LAC[1] + 0.85)  # le trou du pêcheur
    L.ajouter(*N.cylindre(0.13, 0.13, 0.005, 9), "eau_trou", T(trou[0], trou[1], Z_LAC + 0.002))
    for k in range(7):
        a = k * 2 * PI / 7
        L.ajouter(*N.sphere(0.04 + 0.015 * (k % 2), 5, 4, 0.6), "neige", T(trou[0] + math.cos(a) * 0.17, trou[1] + math.sin(a) * 0.17, Z_LAC + 0.01))
    pecheur = (trou[0] + 0.22, trou[1] + 0.14)
    cap_p = math.atan2(trou[1] - pecheur[1], trou[0] - pecheur[0])
    P.passant(L, rng, pecheur[0], pecheur[1], angle=cap_p, z=Z_LAC + 0.01)
    L.ajouter(*N.poutre((pecheur[0] + math.cos(cap_p) * 0.03, pecheur[1] + math.sin(cap_p) * 0.03 - 0.05, Z_LAC + 0.12), (trou[0], trou[1], Z_LAC + 0.42), 0.012), "planches_claires")
    L.ajouter(*N.tube([(trou[0], trou[1], Z_LAC + 0.42), (trou[0], trou[1], Z_LAC + 0.01)], 0.004, 3, bouts=False), "corde")
    L.ajouter(*N.cylindre(0.045, 0.055, 0.08, 7, haut=False), "planches", T(pecheur[0] + 0.04, pecheur[1] + 0.17, Z_LAC))  # son seau
    L.ajouter(*N.sphere(0.04, 6, 4, 0.5), "poisson", T(pecheur[0] + 0.04, pecheur[1] + 0.17, Z_LAC + 0.08))

    # --- le ponton, le navire pris dans les glaces, la banquise autour de lui ---
    Rf.tablier(L, tuple(pa), tuple(pb), ZQ, ZQ, 0.5)
    L.ajouter(*N.boite(lg * 0.5, 0.36, 0.022), "neige", T(*(pa + dp * lg * 0.45), ZQ + 0.02) @ Rz(math.atan2(dp[1], dp[0])))  # la neige sur les planches
    for k in range(int(lg / 0.6) + 1):
        for s in (-1, 1):
            q = pa + dp * (0.2 + k * 0.6) + nq * s * 0.22
            L.ajouter(*N.cylindre(0.04, 0.035, 1.3, 6, haut=False), "planches_sombres", T(q[0], q[1], -0.85))
            L.ajouter(*N.sphere(0.045, 5, 4, 0.5), "neige", T(q[0], q[1], 0.46))
    ponts.append(Vf.rectangle(*(pa + dp * lg / 2), lg, 0.5, math.atan2(dp[1], dp[0])))
    emprises.append(("le ponton", ponts[0]))
    lgn = 2.2
    nav = pa + dp * (lg - 1.2) - nq * 0.95
    cap_n = math.atan2(-dp[1], -dp[0])  # la proue vers la grève
    tete = P.caboteur(L, V, rng, nav[0], nav[1], cap_n, lgn, "toile_ecrue", "peint_bleu")
    L.ajouter([(0, 0, -0.02), (-0.24, 0.02, -0.04), (-0.2, 0.0, -0.1), (-0.26, 0.03, -0.17), (0, 0, -0.18)], [(0, 1, 2, 3, 4), (4, 3, 2, 1, 0)], "tissu_sombre", tete)  # un pavillon noir, en lambeaux
    Mn = T(nav[0], nav[1], 0.0) @ Rz(cap_n)
    hm_n = lgn * 0.95
    zv = 0.2 + hm_n * 0.72
    L.ajouter(*N.boite(lgn * 0.23, lgn * 0.26, 0.035), "neige", Mn @ T(-lgn * 0.34, 0, 0.59))  # la neige : le château, la vergue, la proue
    L.ajouter(*N.poutre((lgn * 0.05, -lgn * 0.3, zv + 0.03), (lgn * 0.05, lgn * 0.3, zv + 0.03), 0.045, 0.03), "neige", Mn)
    L.ajouter(*N.sphere(0.13, 7, 4, 0.4), "neige", Mn @ T(lgn * 0.36, 0, 0.3))
    glacons(L, rng, Mn @ np.array((lgn * 0.05, -lgn * 0.3, zv - 0.07, 1)), Mn @ np.array((lgn * 0.05, lgn * 0.3, zv - 0.07, 1)), 5 if leger else 9, 0.13)
    emprises.append(("le navire pris dans les glaces", Vf.rectangle(nav[0], nav[1], lgn, lgn * 0.34, cap_n)))
    for k in range(6 if leger else 10):  # la banquise qui le serre
        a = k * 2 * PI / (6 if leger else 10) + 0.3
        q = Mn @ np.array((math.cos(a) * lgn * 0.66, math.sin(a) * lgn * 0.42, 0, 1))
        if bord(q[0], q[1]) < -0.12 and Vf.penetration(Vf.rond(q[0], q[1], 0.3), ponts[0]) == 0:
            plaque(L, rng, q[0], q[1], 0.36 + 0.16 * rng.random())

    # --- le pont de bois du ruisseau : le tablier, quatre poteaux coiffés de neige, deux cordes, deux lanternes, des glaçons ---
    Rf.tablier(L, tuple(A), tuple(B), ZP, ZP, 0.6)
    for t in (0.0, 1.0):
        for s in (-1, 1):
            q = A + (B - A) * t + nb_ * s * 0.28
            L.ajouter(*N.cylindre(0.035, 0.03, 0.55 + ZP - sol(*q), 6), "planches_sombres", T(q[0], q[1], sol(*q) - 0.1))
            L.ajouter(*N.sphere(0.042, 5, 4, 0.55), "neige", T(q[0], q[1], ZP + 0.46))
            if s > 0:
                U.ajouter(*N.sphere(0.04, 6, 4, 1.2), "lumiere", T(q[0] + nb_[0] * 0.07, q[1] + nb_[1] * 0.07, ZP + 0.36))
    for s in (-1, 1):
        L.ajouter(*N.poutre((*(A + nb_ * s * 0.28), ZP + 0.32), (*(B + nb_ * s * 0.28), ZP + 0.32), 0.016), "corde")
        glacons(L, rng, (*(A + ub * 0.2 + nb_ * s * 0.3), ZP - 0.05), (*(B - ub * 0.2 + nb_ * s * 0.3), ZP - 0.05), 5 if leger else 9, 0.12)
    ponts.append(Vf.rectangle(*C, float(np.linalg.norm(B - A)), 0.6, math.atan2(ub[1], ub[0])))

    # --- la bataille : deux murets de neige (un sur chaque rive), six lanceurs, les boules qui volent (le site) ---
    lanceurs = []

    def lanceur(q, cap, zz=None):
        P.passant(L, rng, q[0], q[1], angle=cap, z=sol(*q) if zz is None else zz, leve=rng.choice((-1, 1)), tient="neige")
        SOL.append(("passant", "un lanceur", Vf.rond(q[0], q[1], 0.065)))
        lanceurs.append((float(q[0]), float(q[1]), float((sol(*q) if zz is None else zz) + 0.34)))

    cap_u = math.atan2(ub[1], ub[0])
    for sens, bout in ((1, A), (-1, B)):  # sens : +1, le camp de l'ouest (il tire vers +u)
        c = bout - ub * sens * 0.7
        muret(L, rng, c, ub, nb_, sens)
        SOL.append(("decor", "un muret de neige", Vf.rectangle(c[0], c[1], 0.34, 1.12, cap_u)))
        for cote in (-1, 1):
            lanceur(c - ub * sens * 0.42 + nb_ * cote * 0.3, cap_u if sens > 0 else cap_u + PI)
    lanceur(A + (B - A) * 0.3 + nb_ * 0.08, cap_u, ZP + 0.02)
    lanceur(A + (B - A) * 0.72 - nb_ * 0.08, cap_u + PI, ZP + 0.02)
    # qui vise qui : (0, 1) le camp de l'ouest, (2, 3) celui de l'est, 4 et 5 sur le pont
    tirs = [c for a, b in ((0, 5), (2, 4), (4, 3), (5, 1), (1, 2), (3, 0), (4, 5), (5, 4)) for c in (*lanceurs[a], lanceurs[b][0], lanceurs[b][1], lanceurs[b][2] - 0.12)]
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "boules", "tirs": tirs[:36 if leger else 48]}))

    # --- le village : quatre chalets autour de la place, le feu, ses bancs de rondins ---
    cheminees = []
    for k, (x, y) in enumerate(chalets[:3 if leger else 4]):
        cap = math.atan2(place[1] - y, place[0] - x)
        cheminees.append(chalet(L, V, U, rng, x, y, sol(x, y), cap, fin=not leger))
        SOL.append(("decor", "un chalet", Vf.rectangle(x, y, 1.38, 1.12, cap)))
    fz = sol(*place)
    for k in range(7):
        a = k * 2 * PI / 7
        L.ajouter(*N.sphere(0.07 + 0.02 * (k % 2), 6, 4, 0.75), "roche", T(place[0] + math.cos(a) * 0.24, place[1] + math.sin(a) * 0.24, fz + 0.02) @ Rz(k))
    for k in range(3):
        a = k * PI / 3
        L.ajouter(*N.poutre((place[0] - math.cos(a) * 0.17, place[1] - math.sin(a) * 0.17, fz + 0.05), (place[0] + math.cos(a) * 0.17, place[1] + math.sin(a) * 0.17, fz + 0.07), 0.04), "planches_sombres")
    Fl = N.Maille("flammes")
    Fl.ajouter(*N.cylindre(0.11, 0.0, 0.22, 6, haut=False), "lumiere", T(0, 0, 0))
    Fl.ajouter(*N.cylindre(0.06, 0.0, 0.15, 5, haut=False), "lumiere", T(0.06, 0.03, 0))
    lots["libres"].append((Fl, (place[0], place[1], fz + 0.04), {"anim": "clignote"}))
    SOL.append(("dur", "le feu", Vf.rond(place[0], place[1], 0.36)))
    for a in (1.75, 3.15, 4.4):  # trois bancs : un rondin fendu sur deux billots
        bx, by = place[0] + math.cos(a) * 0.72, place[1] + math.sin(a) * 0.72
        Mb = T(bx, by, sol(bx, by)) @ Rz(a + PI / 2)
        L.ajouter(*N.boite(0.5, 0.13, 0.05), "planches", Mb @ T(0, 0, 0.09))
        for sx in (-0.18, 0.18):
            L.ajouter(*N.cylindre(0.05, 0.05, 0.1, 6, haut=False), "ecorce_sapin", Mb @ T(sx, 0, -0.01))
        SOL.append(("decor", "un banc", Vf.rectangle(bx, by, 0.52, 0.16, a + PI / 2)))

    # --- le café gelé : un comptoir sous un auvent de neige, la cafetière qui verse un filet de café pris en glace ---
    Mc = T(cafe[0], cafe[1], sol(*cafe) - 0.04) @ Rz(cap_cafe)
    L.ajouter(*N.boite(0.95, 0.78, 0.07), "planches", Mc)
    L.ajouter(*N.boite(0.07, 0.78, 0.62), "rondins", Mc @ T(-0.44, 0, 0.07))
    for sy in (-1, 1):
        L.ajouter(*N.cylindre(0.03, 0.028, 0.6, 6, haut=False), "planches_sombres", Mc @ T(0.42, sy * 0.35, 0.07))
        L.ajouter(*N.boite(0.9, 0.05, 0.3), "rondins", Mc @ T(0, sy * 0.365, 0.07))
    L.ajouter(*N.boite(0.13, 0.7, 0.24), "planches_claires", Mc @ T(0.37, 0, 0.07))
    L.ajouter(*N.boite(0.2, 0.74, 0.025), "planches_sombres", Mc @ T(0.37, 0, 0.31))
    L.ajouter(*N.toit_pignon(0.95, 0.78, 0.26, 0.14, 0.045), "bardeaux", Mc @ T(0, 0, 0.67), tourne=True)
    L.ajouter(*N.toit_pignon(0.9, 0.73, 0.26, 0.12, 0.08), "neige", Mc @ T(0, 0, 0.71))
    L.ajouter(*N.pignons(0.95, 0.78, 0.26), "rondins", Mc @ T(0, 0, 0.67))
    zb_c = 0.67 - 0.14 * (0.26 / 0.39)
    for sy in (-1, 1):
        glacons(L, rng, Mc @ np.array((-0.47, sy * 0.525, zb_c, 1)), Mc @ np.array((0.47, sy * 0.525, zb_c, 1)), 5 if leger else 8, 0.11)
    for k, dy in enumerate((-0.24, -0.08, 0.24)):  # les tasses : le café y est pris en glace
        L.ajouter(*N.cylindre(0.022, 0.02, 0.04, 6, haut=False), ("cuivre", "fer", "cuivre")[k], Mc @ T(0.38, dy, 0.335))
        L.ajouter(*N.cylindre(0.017, 0.012, 0.022, 5), "cafe", Mc @ T(0.38, dy, 0.375))
    L.ajouter(*N.sphere(0.05, 7, 5, 0.9), "cuivre", Mc @ T(0.37, 0.09, 0.4) @ Ry(0.5))  # la cafetière, penchée
    L.ajouter(*N.cylindre(0.03, 0.02, 0.03, 6), "cuivre", Mc @ T(0.36, 0.09, 0.44))
    L.ajouter(*N.tube([(0.41, 0.09, 0.41), (0.5, 0.09, 0.4), (0.56, 0.09, 0.31), (0.58, 0.09, 0.19)], [0.012, 0.011, 0.01, 0.014], 5), "cafe", Mc)  # le filet de café gelé
    P.tonneau(L, Mc @ T(0.58, 0.09, 0.02), 0.07, 0.15)
    L.ajouter(*N.cylindre(0.026, 0.023, 0.04, 6, haut=False), "fer", Mc @ T(0.58, 0.09, 0.17))
    L.ajouter(*N.cylindre(0.02, 0.018, 0.5, 5, haut=False), "planches_sombres", Mc @ T(0.62, -0.42, 0.0))  # l'enseigne : une tasse de cuivre
    L.ajouter(*N.boite(0.03, 0.26, 0.2), "planches_claires", Mc @ T(0.62, -0.42, 0.5))
    L.ajouter(*N.cylindre(0.05, 0.042, 0.09, 7), "cuivre", Mc @ T(0.645, -0.42, 0.55) @ Ry(PI / 2) @ T(0, 0, -0.01))
    L.ajouter(*N.boite(0.05, 0.28, 0.025), "neige", Mc @ T(0.62, -0.42, 0.7))
    U.ajouter(*N.sphere(0.036, 6, 4), "lumiere", Mc @ T(0.44, 0.3, 0.6))
    cq = Mc @ np.array((0.15, 0, 0, 1))
    SOL.append(("decor", "le café gelé", Vf.rectangle(cq[0], cq[1], 1.3, 1.06, cap_cafe)))
    cheminees.append((Mc @ np.array((0.37, 0.09, 0.5, 1)))[:3])

    # --- deux igloos, près du lac ---
    for x, y, cap in igloos[:1 if leger else 2]:
        igloo(L, U, x, y, sol(x, y), cap)
        SOL.append(("decor", "un igloo", Vf.rectangle(x + math.cos(cap) * 0.14, y + math.sin(cap) * 0.14, 1.36, 1.08, cap)))

    # --- le glacier : la couronne d'aiguilles du sommet et son cristal, le pic, l'arche de glace, des aiguilles un peu partout ---
    zg = sol(*GLACIER)
    seracs(L, U, rng, GLACIER[0], GLACIER[1], zg, 4 if leger else 7, 1.5, 0.35, True)
    for k in range(4 if leger else 7):
        a = k * 2 * PI / (4 if leger else 7) + 0.4
        x, y = GLACIER[0] + math.cos(a) * 1.05, GLACIER[1] + math.sin(a) * 1.05
        if cascade(x, y) > 0.5:
            seracs(L, U, rng, x, y, sol(x, y), 3 if leger else 4, 0.95, 0.3)
    seracs(L, U, rng, PIC[0], PIC[1], sol(*PIC), 4 if leger else 6, 1.2, 0.3, True)
    SOL.append(("decor", "les aiguilles du glacier", Vf.rond(GLACIER[0], GLACIER[1], 1.4)))
    SOL.append(("decor", "les aiguilles du pic", Vf.rond(PIC[0], PIC[1], 0.45)))
    cristal(U, CASCADE[-1][0] - 0.1, CASCADE[-1][1] + 0.3, dessus(CASCADE[-1][0] - 0.1, CASCADE[-1][1] + 0.3) + 0.2, 0.3)  # au pied du torrent
    p1, p2 = np.array(vers(186, 0.45)), np.array(vers(186, -1.25))  # l'arche : un pied à terre, l'autre dans l'eau
    pts_a, ray_a = [], []
    for k in range(9):
        t = k / 8.0
        q = p1 + (p2 - p1) * (0.5 - 0.5 * math.cos(t * PI))
        pts_a.append((q[0], q[1], -0.3 + 1.75 * math.sin(t * PI) ** 0.8))
        ray_a.append(0.3 - 0.13 * math.sin(t * PI))
    L.ajouter(*N.tube(pts_a, ray_a, 6 if leger else 7), "glace")
    mi = (p1 + p2) / 2
    glacons(L, rng, (*(mi - (p2 - p1) * 0.2), 1.3), (*(mi + (p2 - p1) * 0.2), 1.3), 4 if leger else 7, 0.22)
    cristal(U, mi[0], mi[1], 0.95, 0.28)
    SOL.append(("decor", "le pied de l'arche", Vf.rond(p1[0], p1[1], 0.4)))
    faits = 0
    for essai in range(300):
        if faits >= (6 if leger else 13):
            break
        x, y = vers(rng.random() * 360, 0.4 + rng.random() * 3.6)
        if not libre(x, y, 0.36) or math.hypot(x - place[0], y - place[1]) < 2.4:
            continue
        seracs(L, U, rng, x, y, sol(x, y), 3 if leger else 4, 0.5 + 0.5 * rng.random(), 0.2, penche=0.45)
        SOL.append(("rocher", "des aiguilles de glace", Vf.rond(x, y, 0.28)))
        faits += 1

    # --- les sapins, les rochers coiffés de neige, les bonshommes de neige, le traîneau ---
    faits = 0
    for essai in range(400):
        if faits >= (9 if leger else 18):
            break
        x, y = vers(rng.random() * 360, 0.8 + rng.random() * 3.4)
        hs = 1.1 + 0.8 * rng.random()
        if not libre(x, y, 0.37 * hs) or sol(x, y) > 1.3 or math.hypot(x - place[0], y - place[1]) < 1.0:  # ses branches basses : à hauteur d'homme
            continue
        sapin(L, rng, x, y, sol(x, y), hs, 3 if leger else 5)
        SOL.append(("arbre", "un sapin", Vf.rond(x, y, 0.3 * hs)))
        faits += 1
    for k in range(7 if leger else 13):
        x, y = vers(rng.random() * 360, 0.35 + rng.random() * 3.4)
        r = 0.14 + rng.random() * 0.22
        if not libre(x, y, r):
            continue
        L.ajouter(*N.sphere(r, 9, 6, 0.72), "roche", T(x, y, sol(x, y)) @ Rz(k) @ Rx(0.2 * math.sin(k)) @ N.S(1.0, 0.8 + 0.3 * rng.random(), 1.0))
        L.ajouter(*N.sphere(r * 0.98, 9, 5, 0.5), "neige", T(x, y, sol(x, y) + r * 0.36) @ Rz(k + 0.4) @ N.S(1.0, 0.86, 1.0))
        SOL.append(("rocher", "un rocher", Vf.rond(x, y, r * 0.85)))
    for x, y, cap in ((-3.75, -2.0, -0.6), (5.35, -1.25, 3.6))[:1 if leger else 2]:
        if libre(x, y, 0.2):
            bonhomme(L, rng, x, y, sol(x, y), cap)
            SOL.append(("decor", "un bonhomme de neige", Vf.rond(x, y, 0.2)))
    tr = pa - dp * 0.55 + nq * 0.85  # le traîneau, au bout du ponton : deux patins, un plateau, des caisses
    Mt = T(tr[0], tr[1], sol(*tr)) @ Rz(math.atan2(dp[1], dp[0]) + 0.5)
    for sy in (-0.13, 0.13):
        L.ajouter(*N.tube([(-0.3, sy, 0.02), (0.26, sy, 0.02), (0.36, sy, 0.1)], 0.015, 4), "planches_sombres", Mt)
    L.ajouter(*N.boite(0.5, 0.3, 0.025), "planches_claires", Mt @ T(-0.03, 0, 0.07))
    P.caisse(L, Mt @ T(-0.14, 0, 0.095), 0.17)
    P.tonneau(L, Mt @ T(0.1, 0.02, 0.095), 0.07, 0.16)
    SOL.append(("decor", "le traîneau", Vf.rectangle(tr[0], tr[1], 0.72, 0.36, math.atan2(dp[1], dp[0]) + 0.5)))

    # --- les lanternes des chemins ---
    for x, y in ((-1.05, -4.75), (-2.25, -3.45), (-1.4, -1.7), (0.6, -2.75), (5.0, 0.35), (2.55, -2.45)):
        if libre(x, y, 0.06):
            P.lampadaire(L, U, x, y, sol(x, y))
            L.ajouter(*N.sphere(0.04, 5, 4, 0.5), "neige", T(x, y, sol(x, y) + 0.74))
            SOL.append(("rocher", "une lanterne", Vf.rond(x, y, 0.05)))

    # --- les manchots : une colonie sur la côte de l'est ---
    faits = 0
    for essai in range(200):
        if faits >= (4 if leger else 8):
            break
        x, y = vers(-4 + rng.random() * 30, 0.62 + rng.random() * 0.75)
        if not libre(x, y, 0.07):
            continue
        manchot(L, rng, x, y, sol(x, y), rng.random() * 6.28, 0.85 + 0.35 * rng.random())
        SOL.append(("passant", "un manchot", Vf.rond(x, y, 0.06)))
        faits += 1

    # --- les habitants (immobiles) : au café, autour du feu, au bout du ponton ---
    def poser(x, y, zz=None, cap=None):
        if zz is None and not libre(x, y, 0.07):
            return
        P.passant(L, rng, x, y, angle=cap, z=sol(x, y) if zz is None else zz)
        SOL.append(("passant", "un habitant", Vf.rond(x, y, 0.065)))

    q = Mc @ np.array((0.14, 0, 0.07, 1))
    poser(q[0], q[1], q[2], cap_cafe)  # celui qui sert
    for dy in (-0.26, 0.3):
        q = Mc @ np.array((0.78, dy, 0, 1))
        poser(q[0], q[1], None, cap_cafe + PI)
    for a in (0.5, 5.4):
        poser(place[0] + math.cos(a) * 0.62, place[1] + math.sin(a) * 0.62, None, a + PI)
    bout = pa + dp * (lg - 0.2) + nq * 0.12
    poser(bout[0], bout[1], ZQ + 0.02, math.atan2(dp[1], dp[0]))

    # --- la vie : les habitants qui marchent, le patineur du lac, les manchots qui se dandinent ---
    types = []
    for k in range(3):
        Pm = N.Maille(f"habitant{k}")
        P.passant(Pm, rng, 0, 0, angle=0.0, z=0.0, marcheur=True)
        types.append(Pm)
    deja = {}
    for k, (pts, rond, vit, depart, pause) in enumerate(chemins[:3] if leger else chemins):
        extras = {"anim": "marche", "chemin": [float(c) for p in pts for c in p], "vitesse": vit, "phase": depart, "saut": 0.022, "pause": pause}
        if rond:
            extras["boucle"] = 1
        t_ = k % len(types)
        if t_ not in deja:
            deja[t_] = len(lots["animes"])
            lots["animes"].append((types[t_], pts[0], extras))
        else:
            lots["copies"].append((deja[t_], pts[0], extras))
    Mm = N.Maille("manchot")
    manchot(Mm, rng, 0, 0, 0, 0.0)
    for k in range(1 if leger else 2):
        pts = plage_manchots if k == 0 else plage_manchots[::-1][2:]
        extras = {"anim": "marche", "chemin": [float(c) for p in pts for c in p], "vitesse": 0.07 + 0.02 * k, "phase": 0.3 * k, "saut": 0.0, "pause": 2.0 + k, "rayon": 0.05, "dandine": 0.22}
        if k == 0:
            num = len(lots["animes"])
            lots["animes"].append((Mm, pts[0], extras))
        else:
            lots["copies"].append((num, pts[0], extras))

    # --- sur l'eau : l'iceberg et les glaçons, qui dansent avec la houle ---
    Ib = N.Maille("iceberg")
    for k, (dx, dy, r, hh, pen) in enumerate(((0, 0, 0.62, 1.5, 0.1), (0.5, 0.2, 0.42, 1.0, -0.2), (-0.35, 0.4, 0.36, 0.75, 0.25), (0.1, -0.5, 0.34, 0.6, -0.15))):
        Ib.ajouter(*N.cylindre(r, r * 0.3, hh + 0.45, 6), "glace" if k % 2 else "glace_vive", T(dx, dy, -0.45) @ Rz(k * 1.1) @ Rx(pen))
    Ib.ajouter(*N.sphere(0.3, 6, 4, 0.3), "neige", T(0.02, 0.0, 1.5 * 0.86))
    ib = vers(38, -2.0)
    lots["animes"].append((Ib, (ib[0], ib[1], 0.0), {"anim": "flotte", "mer": 1, "ampl": 0.03, "phase": 1.9}))
    emprises.append(("l'iceberg", Vf.rond(ib[0], ib[1], 0.95)))
    Gl = N.Maille("glacon")
    plaque(Gl, rng, 0, 0, 0.42, -0.07, 0.07)
    num = len(lots["animes"])
    radeaux = [vers(-62, -1.5), vers(-128, -1.3), vers(8, -1.6), vers(205, -1.4), vers(-30, -2.1), vers(100, -1.5)][:3 if leger else 6]
    for k, q in enumerate(radeaux):
        extras = {"anim": "flotte", "mer": 1, "ampl": 0.025, "phase": 0.9 * k + 0.3}
        if k == 0:
            lots["animes"].append((Gl, (q[0], q[1], 0.0), extras))
        else:
            lots["copies"].append((num, (q[0], q[1], 0.0), extras))

    # --- les effets du site : la neige qui tombe, les fumées, les oiseaux, la mer ---
    lots["reperes"].append(((0.0, 0.0, 9.0), {"anim": "neige", "nb": 180 if leger else 340, "grosseur": 0.15}))
    fumees = [c for q in cheminees for c in (float(q[0]), float(q[1]), float(q[2]))] + [float(place[0]), float(place[1]), float(fz + 0.3)]
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "fumees", "points": fumees, "grosseur": 0.5}))
    lots["reperes"].append(((0.0, 0.0, 5.4), {"anim": "oiseaux", "nb": 2 if leger else 4, "rayon": 5.6, "envergure": 0.13}))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "mer", "rayon": 7.8, "genre": 2}))
    lots["reperes"].append(((float(GLACIER[0]), float(GLACIER[1]), 0.0), {"anim": "aurore", "rayon": 3.6, "haut": 3.0}))

    # --- sur l'eau (dessiné par le site) : le ressac le long du rivage, l'ombre du ponton, du navire, de l'iceberg ---
    Rv = N.Maille("rivage")
    cote = [(_COTE[i % 720][0], _COTE[i % 720][1]) for i in range(0, 724, 4)]
    K.bande(Rv, [(x * 0.995, y * 0.995) for x, y in cote], [(x * (1 + 0.9 / math.hypot(x, y)), y * (1 + 0.9 / math.hypot(x, y))) for x, y in cote], mat="ecume", boucle=True)
    K.tache(Rv, *(pa + dp * (lg / 2 + 0.3)), lg - 0.7, 0.5, math.atan2(dp[1], dp[0]))
    K.tache(Rv, nav[0], nav[1], lgn * 1.1, lgn * 0.5, cap_n, rond=True, marge=0.3)
    lots["libres"].append((Rv, (0.0, 0.0, 0.0), {"role": "decor"}))
    lots["plan"] = {"emprises": emprises, "sol": SOL, "ponts": ponts}
    return lots


def verifier(lots=None, leger=False):
    """Les erreurs de plan (voir barhaw_ile_v5.controler) : une liste vide quand tout va bien."""
    return K.controler(lots or mailles(leger=leger), sol)


def construire(rendu=True, cuire=True, exporter=True, taille=None, echantillons=48, leger=False, alleger=True):
    lots = mailles(leger=leger)
    rendus = [("givre-v5", (10, -20, 12), (0.3, 0.3, 1.0), 55), ("givre-v5-pont", (7.6, -8.2, 2.8), (3.5, -2.8, 0.5), 60)] if rendu else []
    return K.construire("ile-givre-v5", lots, verifier(lots), rendus, cuire, exporter, taille or (2048 if leger else 3072), echantillons, leger, alleger, atlas="givre")
