# La Cité Engloutie, « niveau 5 » : une ville de marbre noyée dans son lagon, que la marée basse découvre. Tout est inventé.
# (Son histoire, dans le bot : « À marée basse, des colonnes et des statues sortent de l'eau… et un coffre, vide. Quelqu'un
# est passé avant nous. »)
# Un anneau de terre ouvert au sud ; au milieu du lagon, la grand-place dallée (sa rosace, sa colonnade, l'autel et le
# coffre ouvert, vide : le couvercle rejeté, la serrure forcée, une pelle, une lanterne oubliée, un pavillon noir planté là,
# des pièces semées jusqu'au débarcadère) ; la voie sacrée du sud, bordée de statues les pieds dans l'eau ; au nord, le
# temple et son grand visage de pierre (ses yeux s'allument la nuit : la matière « spectre » du site) ; à l'ouest, le
# colosse brisé (ses jambes sur leur socle, sa tête et sa main qui sortent de l'eau) ; à l'est, le temple rond et
# l'aqueduc qui s'en va dans la mer ; partout dans le lagon, le haut des murs noyés, et l'ombre des rues sous l'eau.
# La vie : des explorateurs qui marchent, des crabes, la barque qui danse, des ronds dans l'eau, les oiseaux.
# Sorties : ile-engloutie-v5.glb (+ -leger) et son atlas .png. Contrôle du plan : verifier() (voir barhaw_ile_v5.py).
import math, random
import numpy as np
import barhaw_niveau5 as N
import barhaw_verif as Vf
import barhaw_ile_v5 as K
import barhaw_port_v5 as P
import barhaw_plage_v5 as I
import barhaw_recif_v5 as Rf
import barhaw_lucioles_v5 as Lu

PI = math.pi
T, Rz, Rx, Ry = N.T, N.Rz, N.Rx, N.Ry


def tx_marbre(c=0xd6d0c0, graine=1, verdi=0.0, assises=4):
    """Du marbre patiné : de grands nuages, quelques veines fines, les joints des assises (ou des tambours d'une colonne), des
    coulures sombres, du lichen ; verdi : la part gagnée par les algues (le bas des colonnes, les murs noyés), et des
    coquillages collés dessus."""
    n = N.TAILLE
    x, y = N.grille(n)
    b1, b2, b3 = N.bruit(n, 3, 3, graine, 4), N.bruit(n, 12, 12, graine + 1, 3), N.bruit(n, 64, 64, graine + 2, 2)
    coul = np.broadcast_to(N.hexa(c), (n, n, 3)).copy() * (0.86 + 0.2 * b1 + 0.08 * b3)[..., None]
    veines = np.abs(((b1 * 3.0 + b2 * 1.2) % 1.0) - 0.5)
    coul = N.mel(coul, coul * 0.72, N.lisse(0.025, 0.0, veines) * 0.6)
    joint = np.minimum((y * assises) % 1.0, 1 - (y * assises) % 1.0) / assises
    coul = N.mel(coul, coul * 0.6, N.lisse(0.012, 0.004, joint) * 0.8)
    coulures = N.bruit(n, 40, 3, graine + 3, 2)
    coul = N.mel(coul, coul * np.array([0.7, 0.72, 0.66], np.float32), N.lisse(0.55, 0.8, coulures) * 0.5)
    coul = N.mel(coul, np.array([0.55, 0.58, 0.34], np.float32), N.lisse(0.68, 0.9, b2) * 0.35)
    if verdi:
        coul = N.mel(coul, N.hexa(0x5f8a5a) * (0.75 + 0.4 * b2)[..., None], np.clip(verdi * (0.7 + 0.6 * b1), 0, 1))
        semis = (np.random.default_rng(graine + 5).random((n, n)) > 0.985).astype(np.float32)
        coul = N.mel(coul, np.array([0.85, 0.86, 0.8], np.float32), semis * 0.6)
    relief = 0.5 + 0.2 * (b3 - 0.5) - 0.3 * N.lisse(0.012, 0.004, joint) - 0.15 * N.lisse(0.025, 0.0, veines)
    return np.clip(coul, 0, 1).astype(np.float32), np.clip(relief, 0, 1).astype(np.float32)


N.matiere("marbre", tx_marbre, 1.2, 0.6, c=0xd6d0c0, graine=431)
N.matiere("marbre_algue", tx_marbre, 1.2, 0.7, c=0xc9c6b4, graine=432, verdi=0.75)
N.matiere("dalles", N.tx_paves, 1.4, 0.9, c=0xb5ae9c, graine=433)
N.matiere("pierre_sombre", N.tx_uni, 0.6, 0.3, c=0x2a2b33, graine=434, grain=0.15, taches=0.3)
N.matiere("bronze", N.tx_uni, 0.8, 0.4, rugueux=0.5, metal=0.4, c=0x4f8f7c, graine=435, taches=0.5, c2=0x8a6a3a, seuil=0.6)
N.matiere("cypres", N.tx_feuillage, 0.6, 0.9, c=0x2f5a3c, graine=436, g=12)

PASSE = -PI / 2  # l'anneau est ouvert au sud : la voie sacrée y passe
R_SOL = 9.6
PLACE, R_PLACE = (0.0, -0.2), 1.55  # la grand-place, au milieu du lagon
TEMPLE = (0.0, 5.6)  # le temple, sur l'anneau, au nord
QUAI = (0.0, -5.4)  # le débarcadère, au bout de la voie sacrée
CHAUSSEES = [[(0.0, 1.2), (0.0, 4.5)], [(0.0, -1.6), QUAI]]  # la voie du temple, la voie sacrée
PISTES = []


def _ecart(a, b):
    return (a - b + PI) % (2 * PI) - PI


def r_dedans(th):
    """Le rayon de la rive du lagon dans cette direction."""
    return 4.2 + 0.3 * math.sin(2 * th + 0.3) + 0.2 * math.sin(5 * th) - 0.25 * math.exp(-((_ecart(th, PI / 2) / 0.6) ** 2))


def r_dehors(th):
    """Le rayon de la rive du large (l'anneau s'élargit au nord, sous le temple)."""
    return 6.9 + 0.45 * math.sin(3 * th + 0.8) + 0.25 * math.sin(7 * th + 2.1) + 0.75 * math.exp(-((_ecart(th, PI / 2) / 0.6) ** 2))


def anneau(x, y):
    """À peu près la distance au bord de l'eau, sur l'anneau de terre ; > 0 : à terre."""
    r, th = math.hypot(x, y), math.atan2(y, x)
    return min(r - r_dedans(th), r_dehors(th) - r) - 3.0 * math.exp(-((_ecart(th, PASSE) / 0.5) ** 2))


def chaussee(x, y):
    return min(K.distance_au_trajet(x, y, c) for c in CHAUSSEES)


def esplanade(x, y):
    """1 sur le parvis du temple, 0 loin de lui."""
    return K.lisse(1.2, 0.92, max(abs(x - TEMPLE[0]) / 2.2, abs(y - TEMPLE[1]) / 1.3))


def sol(x, y):
    """La hauteur du terrain : l'anneau (le sable qui monte des deux rives, l'herbe du milieu, le parvis plat du temple), la
    grand-place, les deux voies dallées, le débarcadère ; le reste est sous l'eau."""
    d = anneau(x, y)
    if d > 0:
        h = 0.3 * (1 - math.exp(-d / 0.45)) + 0.45 * K.lisse(0.6, 1.4, d)
        h += (K.bruit2(x * 0.9, y * 0.9, 5) - 0.5) * 0.14 * K.lisse(0.5, 1.3, d)
        h += (0.74 - h) * esplanade(x, y) * K.lisse(0.1, 0.5, d)
    else:
        h = max(-0.8, 0.5 * d) if math.hypot(x, y) < 5.4 else max(-1.6, 0.6 * d)
    hp = 0.3 - 1.1 * K.lisse(R_PLACE - 0.1, R_PLACE + 0.35, math.hypot(x - PLACE[0], y - PLACE[1]))
    hc = 0.16 - 1.0 * K.lisse(0.3, 0.62, chaussee(x, y))
    hq = 0.16 - 1.0 * K.lisse(0.5, 0.82, math.hypot(x - QUAI[0], y - QUAI[1]))
    return max(h, hp, hc, hq)


def vers(angle, t):
    """Un point de l'anneau : à cet angle (degrés, 90 = le nord), de la rive du lagon (t = 0) à celle du large (t = 1)."""
    a = math.radians(angle)
    r = r_dedans(a) + t * (r_dehors(a) - r_dedans(a))
    return math.cos(a) * r, math.sin(a) * r


def tx_sol_engloutie(taille=2048, graine=111):
    """Le sol peint pixel par pixel : le sable (mouillé près de l'eau : la marée vient de se retirer), l'herbe et la mousse
    du milieu de l'anneau, les dalles de la place, des voies et du parvis (leurs joints moussus, leurs flaques), la rosace
    de la place (des anneaux, une étoile à huit branches, usée), la terre des sentiers."""
    n = taille
    h = K.agrandir(K.champ(sol, R_SOL, 200), n)
    da = K.agrandir(K.champ(anneau, R_SOL), n)
    dc = K.agrandir(K.champ(lambda x, y: min(chaussee(x, y), max(0.0, math.hypot(x - QUAI[0], y - QUAI[1]) - 0.22)), R_SOL, 240), n)
    esp = K.agrandir(K.champ(esplanade, R_SOL), n)
    piste = K.agrandir(K.champ(lambda x, y: min((K.distance_au_trajet(x, y, p) for p in PISTES), default=9.0), R_SOL), n)
    u, v = N.grille(n)
    X, Y = (u * 2 - 1) * R_SOL, (v * 2 - 1) * R_SOL
    rp = np.hypot(X - PLACE[0], Y - PLACE[1])
    b1, b2, b3, fin = N.bruit(n, 7, 7, graine, 4), N.bruit(n, 28, 28, graine + 1, 3), N.bruit(n, 90, 90, graine + 2, 2), N.bruit(n, 256, 256, graine + 3, 1)
    grain = N.bruit(n, 640, 640, graine + 4, 1)
    semis = np.random.default_rng(graine + 6).random((n, n)).astype(np.float32)
    sable, mouille = N.hexa(0xd9c9a2), N.hexa(0x8f8266)
    coul = np.broadcast_to(sable, (n, n, 3)).copy() * (0.9 + 0.12 * b1 + 0.08 * fin + 0.12 * (grain - 0.5) + 0.25 * (semis > 0.992))[..., None]
    coul = N.mel(coul, mouille * (0.9 + 0.2 * b2)[..., None], N.lisse(0.2, 0.03, h + (b2 - 0.5) * 0.08))
    coul = N.mel(coul, N.hexa(0x5f7f52) * (0.85 + 0.3 * b3)[..., None], N.lisse(0.1, 0.0, h + (b3 - 0.5) * 0.06) * (b2 > 0.5) * 0.7)  # les algues laissées par la mer
    herbe = N.mel(np.broadcast_to(N.hexa(0x6c9a4c), (n, n, 3)).copy(), np.broadcast_to(N.hexa(0x8fae52), (n, n, 3)), b3) * (0.82 + 0.3 * fin + 0.14 * (grain - 0.5))[..., None]
    coul = N.mel(coul, herbe, N.lisse(0.42, 0.62, h + (b2 - 0.5) * 0.3) * N.lisse(0.3, 0.6, da))
    terre = N.hexa(0x9c8763) * (0.85 + 0.25 * b3 + 0.12 * (grain - 0.5))[..., None]
    coul = N.mel(coul, terre, N.lisse(0.2, 0.08, piste + (b2 - 0.5) * 0.12) * N.lisse(0.2, 0.34, h))
    # les dalles : un appareil de pierres décalées d'un rang sur l'autre, chacune sa teinte, des joints où pousse la mousse
    pave = np.maximum(np.maximum(N.lisse(R_PLACE + 0.08, R_PLACE - 0.06, rp + (b2 - 0.5) * 0.1), N.lisse(0.37, 0.27, dc + (b2 - 0.5) * 0.06)), esp * N.lisse(0.0, 0.3, da))
    gy = Y / 0.36
    gx = X / 0.52 + 0.5 * (np.floor(gy) % 2)
    ton = np.modf(np.sin(np.floor(gx) * 12.9898 + np.floor(gy) * 78.233) * 43758.5453)[0] % 1.0
    joint = np.minimum(np.minimum(gx % 1.0, 1 - gx % 1.0) * 0.52, np.minimum(gy % 1.0, 1 - gy % 1.0) * 0.36)
    dalle = N.hexa(0xb9b19c) * (0.8 + 0.3 * np.abs(ton) + 0.12 * fin + 0.1 * (grain - 0.5))[..., None]
    dalle = N.mel(dalle, N.hexa(0x5c5a4e), N.lisse(0.022, 0.006, joint) * 0.85)
    dalle = N.mel(dalle, N.hexa(0x64864a), N.lisse(0.04, 0.01, joint) * (b2 > 0.46) * 0.8)
    dalle = N.mel(dalle, N.hexa(0x6e8a55) * (0.8 + 0.3 * fin)[..., None], N.lisse(0.6, 0.75, b1 * 0.5 + b3 * 0.5) * 0.55)  # des plaques de mousse
    # la rosace : deux anneaux turquoise, une étoile ocre à huit branches, usée par endroits
    ang = np.arctan2(Y - PLACE[1], X - PLACE[0])
    use = N.lisse(0.3, 0.5, b3 * 0.6 + fin * 0.4)
    anneaux = ((rp > 0.6) & (rp < 0.68)) | ((rp > 1.1) & (rp < 1.2))
    branche = np.abs(((ang * 8 / (2 * PI)) % 1.0) - 0.5) * 2 < np.clip((1.08 - rp) / 0.4, 0, 1) * 0.85
    dalle = N.mel(dalle, N.hexa(0x3f9390) * (0.85 + 0.25 * fin)[..., None], anneaux * use * 0.9)
    dalle = N.mel(dalle, N.hexa(0xc9983f) * (0.85 + 0.25 * fin)[..., None], (branche & (rp > 0.7) & (rp < 1.08)) * use * 0.9)
    dalle = N.mel(dalle, dalle * np.array([0.62, 0.7, 0.78], np.float32), N.lisse(0.36, 0.26, b1 * 0.6 + b2 * 0.4) * 0.8)  # les flaques
    coul = N.mel(coul, dalle, pave)
    return np.clip(coul, 0, 1).astype(np.float32), np.clip(0.45 + 0.3 * b3 + 0.2 * fin - 0.35 * pave * N.lisse(0.022, 0.006, joint), 0, 1).astype(np.float32)


N.matiere("sol_engloutie", tx_sol_engloutie, 2 * R_SOL, 0.5)


# ---------- les pièces ----------
def colonne(L, rng, x, y, z, h=1.5, r=0.12, casse=1.0, algue=0.3, chapiteau=True, fin=True):
    """Une colonne de marbre : sa base, son fût (le bas verdi par la mer), son chapiteau ; casse < 1 : brisée à cette
    hauteur (pas de chapiteau, la cassure de travers)."""
    M = T(x, y, z) @ Rz(rng.random() * 6.28)
    hh = h * casse
    L.ajouter(*N.boite(r * 3.0, r * 3.0, 0.07), "marbre_algue" if algue > 0.1 else "marbre", M @ T(0, 0, -0.02))
    L.ajouter(*N.cylindre(r * 1.25, r * 1.1, 0.06, 8, haut=False), "marbre", M @ T(0, 0, 0.05))
    ha = min(hh, h * algue)
    if ha > 0.02:
        L.ajouter(*N.cylindre(r * 1.08, r * 1.04, ha, 9 if fin else 7, haut=False), "marbre_algue", M @ T(0, 0, 0.1))
    if hh > ha:
        L.ajouter(*N.cylindre(r * 1.04, r * 0.9, hh - ha, 9 if fin else 7, haut=casse < 1), "marbre", M @ T(0, 0, 0.1 + ha))
    if casse >= 1 and chapiteau:
        L.ajouter(*N.cylindre(r * 0.95, r * 1.35, 0.07, 8, haut=False), "marbre", M @ T(0, 0, 0.1 + hh))
        L.ajouter(*N.boite(r * 3.0, r * 3.0, 0.06), "marbre", M @ T(0, 0, 0.17 + hh))
    elif casse < 1:
        L.ajouter(*N.cylindre(r * 0.9, r * 0.5, 0.08, 6), "marbre", M @ T(0.02, 0, 0.1 + hh) @ Rx(0.3))
    return 0.23 + hh  # le dessus, au-dessus de z


def tambours(L, rng, x, y, z, r=0.12, nb=2, cap=0.0):
    """Des tambours de colonne tombés : des cylindres couchés, un peu enfoncés."""
    for k in range(nb):
        M = T(x + math.cos(cap) * k * 0.42, y + math.sin(cap) * k * 0.42, z + r * 0.72) @ Rz(cap + 0.25 * (k % 2) + 0.1 * rng.random()) @ Ry(PI / 2)
        L.ajouter(*N.cylindre(r, r * 0.95, 0.3 + 0.1 * rng.random(), 8, haut=True, bas=True), "marbre" if k % 2 else "marbre_algue", M @ T(0, 0, -0.17))


def statue(L, rng, x, y, cap, h=0.8, tete=True, bras=True, fin=True):
    """Une statue sur son socle, les pieds dans l'eau : une longue robe, les épaules, la tête, un bras levé qui tient un
    globe. Certaines ont perdu la tête ou le bras."""
    M = T(x, y, 0) @ Rz(cap)
    L.ajouter(*N.boite(0.34, 0.34, 0.76), "marbre_algue", M @ T(0, 0, -0.45))
    L.ajouter(*N.boite(0.42, 0.42, 0.06), "marbre", M @ T(0, 0, 0.3))
    z0 = 0.36
    L.ajouter(*N.cylindre(0.125, 0.075, h * 0.62, 8 if fin else 6, haut=False), "marbre", M @ T(0, 0, z0))
    L.ajouter(*N.sphere(0.088, 7, 4, 0.7), "marbre", M @ T(0, 0, z0 + h * 0.62))
    if tete:
        L.ajouter(*N.sphere(0.058, 7, 5, 1.12), "marbre", M @ T(0.005, 0, z0 + h * 0.62 + 0.105))
    if bras:
        L.ajouter(*N.tube([(0, -0.085, z0 + h * 0.6), (0.09, -0.11, z0 + h * 0.66), (0.15, -0.1, z0 + h * 0.84)], [0.03, 0.026, 0.022], 5), "marbre", M)
        L.ajouter(*N.sphere(0.04, 6, 4), "bronze", M @ T(0.155, -0.1, z0 + h * 0.9))
    L.ajouter(*N.tube([(0, 0.085, z0 + h * 0.6), (0.02, 0.11, z0 + h * 0.4), (0.06, 0.09, z0 + h * 0.3)], [0.03, 0.026, 0.022], 5), "marbre", M)


def coffre_vide(L, M):
    """Le coffre : ouvert, vide (le fond dans l'ombre), le couvercle rejeté en arrière, la serrure forcée qui pend."""
    L.ajouter(*N.boite(0.3, 0.2, 0.03), "pierre_sombre", M)
    for lx, ly, x, y in ((0.3, 0.026, 0, -0.087), (0.3, 0.026, 0, 0.087), (0.026, 0.2, -0.137, 0), (0.026, 0.2, 0.137, 0)):
        L.ajouter(*N.boite(lx, ly, 0.15), "planches_sombres", M @ T(x, y, 0), tourne=True)
    L.ajouter(*N.boite(0.31, 0.035, 0.2), "planches_sombres", M @ T(0, 0.125, 0.13) @ Rx(-0.55))
    for sx in (-0.1, 0.1):
        L.ajouter(*N.boite(0.03, 0.008, 0.15), "fer", M @ T(sx, -0.104, 0))
    L.ajouter(*N.boite(0.045, 0.012, 0.05), "or", M @ T(0.01, -0.112, 0.07) @ Ry(0.5))


def banc_de_poissons(rng, nb=5):
    """L'ombre d'un banc de poissons sous l'eau : des fuseaux sombres aux bords fondus (la matière « ombre_eau » du site ;
    v = 2 : pleine, 3 : plus rien). Ils nagent vers +x ; le site les promène dans le lagon."""
    B = N.Maille("rivage_poissons")
    for k in range(nb):
        cx, cy, lg = -0.25 * k + 0.1 * rng.random(), (rng.random() - 0.5) * 0.5, 0.2 + 0.1 * rng.random()
        tour = [(cx + lg * 0.5, cy), (cx + lg * 0.15, cy + lg * 0.2), (cx - lg * 0.35, cy + lg * 0.1), (cx - lg * 0.62, cy + lg * 0.2), (cx - lg * 0.55, cy), (cx - lg * 0.62, cy - lg * 0.2), (cx - lg * 0.35, cy - lg * 0.1), (cx + lg * 0.15, cy - lg * 0.2)]
        v = [(cx, cy, 0.0)] + [(x, y, 0.0) for x, y in tour]
        B.ajouter(v, [(0, 1 + i, 1 + (i + 1) % 8) for i in range(8)], "ombre_eau", uv=[(0.5, 2.0)] + [(0.5, 2.7)] * 8)
    return B


def cypres(L, rng, x, y, z, h=1.9):
    """Un cyprès : un fuseau sombre, que le vent fait pencher."""
    M = T(x, y, z)
    L.ajouter(*N.cylindre(0.045, 0.035, h * 0.22, 5, haut=False), "planches_sombres", M @ T(0, 0, -0.1))
    v, f = N.sphere(h * 0.15, 8, 7, 1 / 0.36)
    g = rng.random() * 9
    v = [(px * (1 + 0.14 * math.sin(pz * 7 + g)), py * (1 + 0.14 * math.sin(pz * 6 + g * 1.7)), pz) for px, py, pz in v]
    L.ajouter(v, f, "cypres", M @ T(0, 0, h * 0.56), zone=(1.0, 0.8, 1.0))


def mailles(graine=83, leger=False):
    """leger : la version téléphone (un relief moins fin, moins de murs noyés et de statues, trois marcheurs, un crabe)."""
    N.DETAIL = 0.6 if leger else 1.0
    try:
        return _mailles(graine, leger)
    finally:
        N.DETAIL = 1.0


def _cotes():
    """Les deux rives de l'anneau, de degré en degré, à partir de la passe : (rive du large, rive du lagon)."""
    large, lagon = [], []
    for k in range(360):
        a = PASSE + math.radians(k)
        ca, sa = math.cos(a), math.sin(a)
        rm = (r_dedans(a) + r_dehors(a)) / 2
        if anneau(ca * rm, sa * rm) <= 0.03:  # la passe : pas de terre dans cette direction
            continue
        res = []
        for loin in (10.0, 0.4):
            r0, r1 = rm, loin
            for _ in range(22):
                r = (r0 + r1) / 2
                if anneau(ca * r, sa * r) > 0:
                    r0 = r
                else:
                    r1 = r
            res.append((ca, sa, r1))
        large.append(res[0])
        if abs(_ecart(a, PI / 2)) > 0.12:  # pas de ressac là où la voie du temple rejoint l'anneau
            lagon.append(res[1])
    return large, lagon


def _mailles(graine, leger):
    rng = random.Random(graine)
    L, V, U = N.Maille("ile_corps"), N.Maille("ile_vitres"), N.Maille("ile_lumieres")
    lots = {"corps": L, "vitres": V, "lumieres": U, "bannieres": [], "animes": [], "copies": [], "libres": [], "reperes": []}
    SOL, emprises, ponts = [], [], []
    Rv = N.Maille("rivage")
    sous_eau = []  # ce qui a les pieds dans l'eau : son ombre sur l'eau (x, y, lx, ly, angle, rond)

    # --- le plan : la place et son autel, les deux voies, le parvis du temple, les chemins (rien d'autre ne s'y pose) ---
    z = lambda p: (p[0], p[1], sol(p[0], p[1]) + 0.02)
    terre = lambda pts: K.suivre(pts, sol)
    arc = lambda a0, a1, t, pas=3: [z(vers(a, t)) for a in np.arange(a0, a1 + 0.01, pas)]
    ronde = [(PLACE[0] + math.cos(k * 2 * PI / 18) * 0.86, PLACE[1] + math.sin(k * 2 * PI / 18) * 0.86, sol(*PLACE) + 0.02) for k in range(18)]
    chemins = [  # (points, en rond, vitesse, départ, pause) ; les trois premiers suffisent au téléphone
        (terre([(0.0, -5.25), (0.0, -3.4), (0.0, -1.95), (0.2, -1.5)]), False, 0.18, 0.0, 3.0),
        (ronde, True, 0.16, 0.3, 0.0),
        (terre([(-0.1, 1.5), (0.0, 2.6), (0.0, 3.78)]), False, 0.17, 0.5, 4.0),
        (arc(150, 207, 0.5), False, 0.16, 0.7, 2.5),
    ]
    crabes = [arc(196, 214, 0.1, 2), arc(-18, -4, 0.1, 2), arc(118, 132, 0.86, 2)]
    couloirs = [(pts, 0.07) for pts, *_ in chemins] + [(pts, 0.05) for pts in crabes]

    def libre(x, y, r):
        """Cette place est-elle sur l'anneau, hors des passages, du parvis et de ce qui est déjà posé ?"""
        if anneau(x, y) < r + 0.25 or esplanade(x, y) > 0.02 or chaussee(x, y) < r + 0.7:
            return False
        if any(K.distance_au_trajet(x, y, pts) < r + rc + 0.04 for pts, rc in couloirs):
            return False
        return all(Vf.penetration(Vf.rond(x, y, r), p) == 0 for _, _, p in SOL)

    # --- le terrain (d'un seul tenant, à sommets partagés) ---
    n, R = (58 if leger else 76), R_SOL
    xs = [-R + 2 * R * i / n for i in range(n + 1)]
    H = [[sol(x, y) for x in xs] for y in xs]
    PISTES[:] = [chemins[3][0]]
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
    L.ajouter(sommets, faces, "sol_engloutie", uv=uvs)
    L.regrouper(0, None, 4, 0.75)

    # --- la grand-place : sa bordure de pierre, la colonnade, l'autel, le coffre vide et les traces de ceux d'avant ---
    zp = sol(*PLACE)
    nb_b = 14 if leger else 22
    for k in range(nb_b):  # la bordure : des blocs tout autour, certains manquent
        a = (k + 0.5) * 2 * PI / nb_b
        if abs(_ecart(a, PI / 2)) < 0.3 or abs(_ecart(a, -PI / 2)) < 0.3 or k % 7 == 3:
            continue
        L.ajouter(*N.boite(2 * PI * R_PLACE / nb_b * 0.93, 0.2, 0.34), "marbre_algue", T(PLACE[0] + math.cos(a) * (R_PLACE + 0.02), PLACE[1] + math.sin(a) * (R_PLACE + 0.02), zp - 0.27) @ Rz(a + PI / 2))
    cassees = {55: 0.55, 200: 0.3, 305: 0.72}
    hauts = {}
    for a in (20, 55, 125, 160, 200, 235, 305, 340):
        x, y = PLACE[0] + math.cos(math.radians(a)) * 1.28, PLACE[1] + math.sin(math.radians(a)) * 1.28
        hauts[a] = colonne(L, rng, x, y, zp, 1.45, 0.11, cassees.get(a, 1.0), 0.22, fin=not leger)
        SOL.append(("decor", "une colonne de la place", Vf.rond(x, y, 0.19)))
    for a0, a1 in ((125, 160), (340, 20)):  # deux linteaux encore en place
        p0 = (PLACE[0] + math.cos(math.radians(a0)) * 1.28, PLACE[1] + math.sin(math.radians(a0)) * 1.28, zp + hauts[a0] + 0.07)
        p1 = (PLACE[0] + math.cos(math.radians(a1)) * 1.28, PLACE[1] + math.sin(math.radians(a1)) * 1.28, zp + hauts[a1] + 0.07)
        L.ajouter(*N.poutre(p0, p1, 0.26, 0.14), "marbre")
    tambours(L, rng, -1.85, -1.15, -0.12, 0.11, 2, 0.4)  # deux tambours ont roulé dans l'eau
    sous_eau.append((-1.66, -1.07, 0.9, 0.34, 0.4, False))
    Ma = T(PLACE[0], PLACE[1], zp) @ Rz(0.0)
    L.ajouter(*N.boite(0.86, 0.86, 0.13), "marbre", Ma @ T(0, 0, -0.02))
    L.ajouter(*N.boite(0.58, 0.58, 0.13), "marbre", Ma @ T(0, 0, 0.11))
    coffre_vide(L, Ma @ T(0, 0, 0.24) @ Rz(PI))  # il s'ouvre vers le sud : on le voit vide en arrivant
    SOL.append(("dur", "l'autel et le coffre vide", Vf.rectangle(PLACE[0], PLACE[1], 0.9, 0.9, 0.0)))
    L.ajouter(*N.poutre((-0.36, -0.2, 0.11), (-0.36, -0.2, 0.62), 0.016), "planches_claires", Ma)  # la pelle, plantée contre l'autel
    L.ajouter(*N.boite(0.09, 0.012, 0.13), "fer", Ma @ T(-0.36, -0.2, 0.6))
    L.ajouter(*N.cylindre(0.03, 0.025, 0.06, 6), "fer", Ma @ T(0.34, -0.3, 0.11))  # la lanterne oubliée, encore allumée
    U.ajouter(*N.sphere(0.03, 6, 4), "lumiere", Ma @ T(0.34, -0.3, 0.2))
    L.ajouter(*N.cylindre(0.014, 0.012, 0.95, 5), "planches_sombres", Ma @ T(0.2, 0.2, 0.24))  # le pavillon noir de ceux d'avant
    L.ajouter([(0, 0, 0.9), (0.3, 0.02, 0.86), (0.25, 0.0, 0.79), (0.32, 0.03, 0.7), (0, 0, 0.68)], [(0, 1, 2, 3, 4), (4, 3, 2, 1, 0)], "tissu_sombre", Ma @ T(0.2, 0.2, 0.24) @ Rz(0.5))
    for k in range(6 if leger else 11):  # les pièces qu'ils ont semées en repartant, de l'autel au débarcadère
        t = k / 10.0
        px, py = 0.16 * math.sin(k * 2.1), PLACE[1] - 0.62 - t * 4.3
        L.ajouter(*N.cylindre(0.024, 0.024, 0.007, 6), "or", T(px, py, sol(px, py) + 0.004) @ Rz(k))

    # --- la voie sacrée du sud : ses bordures, les statues les pieds dans l'eau, le débarcadère et sa barque ---
    for k, yb in enumerate(np.arange(-2.15, -4.9, -0.46)):
        for s in (-1, 1):
            if (k * 2 + (s > 0)) % 5 == 2:
                continue
            L.ajouter(*N.boite(0.14, 0.42, 0.3), "marbre_algue", T(s * 0.4, yb, -0.1))
    faites = 0
    for k, yb in enumerate((-2.45, -3.4, -4.35)):
        for s in (-1, 1):
            if leger and k == 1:
                continue
            if k == 2 and s > 0:  # celle-là est tombée : il ne reste que son socle et un morceau
                L.ajouter(*N.boite(0.34, 0.34, 0.6), "marbre_algue", T(s * 0.82, yb, -0.45))
                L.ajouter(*N.cylindre(0.12, 0.08, 0.5, 7), "marbre", T(s * 0.82 + 0.36, yb - 0.1, 0.02) @ Rz(0.7) @ Ry(PI / 2 - 0.15))
            else:
                statue(L, rng, s * 0.82, yb, PI / 2 + s * PI / 2, 0.78 + 0.1 * rng.random(), tete=(k, s) != (0, -1), bras=(k, s) != (1, 1), fin=not leger)
            sous_eau.append((s * 0.82, yb, 0.36, 0.36, 0.0, False))
            faites += 1
    for s in (-1, 1):  # deux bornes d'amarrage au débarcadère, une lanterne sur chacune
        L.ajouter(*N.cylindre(0.08, 0.065, 0.42, 7), "marbre", T(QUAI[0] + s * 0.36, QUAI[1] - 0.25, sol(*QUAI) - 0.03))
        U.ajouter(*N.sphere(0.04, 6, 4), "lumiere", T(QUAI[0] + s * 0.36, QUAI[1] - 0.25, sol(*QUAI) + 0.44))
        SOL.append(("decor", "une borne du débarcadère", Vf.rond(QUAI[0] + s * 0.36, QUAI[1] - 0.25, 0.09)))
    bq = (QUAI[0] + 0.25, QUAI[1] - 1.05)
    Bq = N.Maille("barque")
    P.barque(Bq, rng, 0, 0, 0.35)
    lots["animes"].append((Bq, (bq[0], bq[1], 0.075), {"anim": "flotte", "mer": 1, "ampl": 0.02, "phase": 0.7}))
    emprises.append(("la barque", Vf.rectangle(bq[0], bq[1], 0.8, 0.32, 0.35)))
    sous_eau.append((bq[0], bq[1], 0.78, 0.3, 0.35, True))

    # --- le temple, au nord : trois degrés, six colonnes (deux brisées), deux linteaux et ce qui reste du fronton, le mur du
    # fond et son grand visage de pierre (les yeux et la porte luisent la nuit) ---
    zt0 = sol(*TEMPLE)
    Mt = T(TEMPLE[0], TEMPLE[1], zt0)
    for k, (lx, ly) in enumerate(((3.7, 2.3), (3.3, 1.95), (2.9, 1.6))):
        L.ajouter(*N.boite(lx, ly, 0.2), "marbre_algue" if k == 0 else "marbre", Mt @ T(0, 0, -0.04 + 0.16 * k))
    for k in range(4):  # l'escalier qui monte de la voie au parvis
        L.ajouter(*N.boite(1.1, 0.13, 0.26 + 0.12 * k), "marbre", T(TEMPLE[0], 4.02 + 0.12 * k, 0.0))
    SOL.append(("decor", "l'escalier du temple", Vf.rectangle(TEMPLE[0], 4.2, 1.1, 0.5, 0.0)))
    zt = 0.46  # le dessus du dernier degré, au-dessus de zt0
    xc = [-1.15 + 0.46 * k for k in range(6)]
    etat = [1.0, 1.0, 0.58, 1.0, 1.0, 0.22]
    dessus = [colonne(L, rng, TEMPLE[0] + xc[k], TEMPLE[1] - 0.6, zt0 + zt, 1.5, 0.105, etat[k], 0.0, fin=not leger) for k in range(6)]
    for a_, b_, sens in ((0, 1, 1), (3, 4, -1)):
        za = zt + dessus[a_]
        L.ajouter(*N.poutre((xc[a_] - 0.16, -0.6, za + 0.08), (xc[b_] + 0.16, -0.6, za + 0.08), 0.3, 0.16), "marbre", Mt)
        x0, x1 = (xc[a_] - 0.16, xc[b_] + 0.16) if sens > 0 else (xc[b_] + 0.16, xc[a_] - 0.16)
        v = [(x0, -0.74, za + 0.16), (x1, -0.74, za + 0.16), (x1, -0.74, za + 0.16 + 0.36), (x0, -0.46, za + 0.16), (x1, -0.46, za + 0.16), (x1, -0.46, za + 0.16 + 0.36)]
        f = [(0, 1, 2), (5, 4, 3), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)] if sens > 0 else [(2, 1, 0), (3, 4, 5), (1, 4, 3, 0), (2, 5, 4, 1), (0, 3, 5, 2)]
        L.ajouter(v, f, "marbre", Mt)  # un pan du fronton
    tambours(L, rng, TEMPLE[0] + 1.05, TEMPLE[1] - 1.5, sol(TEMPLE[0] + 1.25, TEMPLE[1] - 1.5), 0.105, 2, 0.15)
    for sx in (-1.15, 1.15):  # deux colonnes au fond, aux angles
        colonne(L, rng, TEMPLE[0] + sx, TEMPLE[1] + 0.25, zt0 + zt, 1.5, 0.105, 1.0 if sx < 0 else 0.4, 0.0, fin=not leger)
    Mm = Mt @ T(0, 0.55, zt)  # le mur du fond, face au sud : le grand visage regarde par-dessus la colonnade
    L.ajouter(*N.boite(2.7, 0.3, 3.3), "marbre", Mm)
    for dx, lz in ((-1.14, 0.24), (-0.9, 0.1), (0.94, 0.3), (1.16, 0.12)):  # sa crête ébréchée
        L.ajouter(*N.boite(0.3, 0.3, lz), "marbre", Mm @ T(dx, 0, 3.3))
    L.ajouter(*N.boite(1.56, 0.36, 0.26), "marbre", Mm @ T(0, 0, 3.3))  # la coiffe du visage
    L.ajouter(*N.boite(0.94, 0.36, 0.22), "marbre", Mm @ T(0, 0, 3.56))
    ys = -0.15  # la face sud du mur
    L.ajouter(*N.boite(2.0, 0.17, 0.2), "marbre", Mm @ T(0, ys - 0.07, 2.92))  # l'arcade des sourcils
    L.ajouter(*N.boite(0.25, 0.22, 0.74), "marbre", Mm @ T(0, ys - 0.09, 2.18))  # le nez
    L.ajouter(*N.boite(0.44, 0.14, 0.11), "marbre", Mm @ T(0, ys - 0.06, 2.1))
    for s_ in (-1, 1):
        L.ajouter(*N.boite(0.52, 0.03, 0.25), "pierre_sombre", Mm @ T(s_ * 0.57, ys - 0.012, 2.58))  # les orbites
        U.ajouter(*N.sphere(0.092, 8, 6), "spectre", Mm @ T(s_ * 0.57, ys - 0.04, 2.705))  # les yeux : ils s'allument la nuit
        L.ajouter(*N.boite(0.56, 0.1, 0.07), "marbre", Mm @ T(s_ * 0.57, ys - 0.04, 2.5))  # les paupières du bas
        L.ajouter(*N.boite(0.28, 0.11, 0.62), "marbre", Mm @ T(s_ * 0.94, ys - 0.045, 1.82))  # les joues
    L.ajouter(*N.boite(0.86, 0.03, 0.13), "pierre_sombre", Mm @ T(0, ys - 0.012, 1.84))  # la bouche
    L.ajouter(*N.boite(1.0, 0.1, 0.06), "marbre", Mm @ T(0, ys - 0.04, 1.97))
    L.ajouter(*N.boite(1.1, 0.15, 0.18), "marbre", Mm @ T(0, ys - 0.06, 1.6))  # le menton
    L.ajouter(*N.boite(0.5, 0.03, 0.9), "pierre_sombre", Mm @ T(0, ys - 0.012, 0.0))  # la porte, sous le menton
    U.ajouter(*N.boite(0.3, 0.012, 0.46), "spectre", Mm @ T(0, ys - 0.03, 0.06))  # une lueur au fond
    for s_ in (-1, 1):
        L.ajouter(*N.boite(0.13, 0.09, 0.98), "marbre", Mm @ T(s_ * 0.33, ys - 0.035, 0.0))
    L.ajouter(*N.boite(0.9, 0.11, 0.12), "marbre", Mm @ T(0, ys - 0.045, 0.98))
    SOL.append(("decor", "le temple", Vf.rectangle(TEMPLE[0], TEMPLE[1], 3.75, 2.35, 0.0)))
    SOL.append(("decor", "des tambours tombés", Vf.rectangle(TEMPLE[0] + 1.25, TEMPLE[1] - 1.47, 0.95, 0.36, 0.15)))

    # --- le colosse brisé, à l'ouest, dans le lagon : ses jambes sur leur socle, sa tête et sa main qui sortent de l'eau ---
    cx, cy = -2.85, -0.35
    Mc = T(cx, cy, 0) @ Rz(-0.25)
    L.ajouter(*N.boite(1.35, 1.0, 0.95), "marbre_algue", Mc @ T(0, 0, -0.55))
    L.ajouter(*N.boite(1.5, 1.15, 0.08), "marbre", Mc @ T(0, 0, 0.4))
    for s, hj in ((-1, 1.25), (1, 0.7)):
        L.ajouter(*N.boite(0.5, 0.26, 0.12), "marbre", Mc @ T(0.08, s * 0.3, 0.48))  # le pied
        L.ajouter(*N.cylindre(0.17, 0.2, hj, 9, haut=False), "marbre", Mc @ T(-0.06, s * 0.3, 0.56))
        L.ajouter(*N.cylindre(0.2, 0.1, 0.14, 6), "marbre", Mc @ T(-0.06, s * 0.3, 0.56 + hj) @ Rx(0.25 * s))  # la cassure
    emprises.append(("le socle du colosse", Vf.rectangle(cx, cy, 1.5, 1.15, -0.25)))
    sous_eau.append((cx, cy, 1.5, 1.15, -0.25, False))
    tx_, ty_ = -3.0, -2.45  # sa tête, couchée sur la joue
    Mh = T(tx_, ty_, 0.08) @ Rz(0.5) @ Rx(-1.05)
    L.ajouter(*N.sphere(0.62, 12, 8, 1.12), "marbre", Mh)
    L.ajouter(*N.boite(0.16, 0.2, 0.34), "marbre", Mh @ T(0, -0.6, -0.05))  # le nez
    L.ajouter(*N.boite(0.74, 0.14, 0.1), "marbre", Mh @ T(0, -0.57, 0.2))  # les sourcils
    L.ajouter(*N.boite(0.36, 0.1, 0.06), "pierre_sombre", Mh @ T(0, -0.585, -0.26))  # la bouche
    for s in (-1, 1):
        L.ajouter(*N.boite(0.22, 0.07, 0.07), "marbre", Mh @ T(s * 0.23, -0.565, 0.09))  # les paupières closes
        L.ajouter(*N.sphere(0.1, 6, 4, 1.5), "marbre", Mh @ T(s * 0.6, 0.0, -0.05))  # les oreilles
    L.ajouter(*N.cylindre(0.6, 0.57, 0.13, 12, haut=False), "bronze", Mh @ T(0, 0, 0.27))  # son bandeau de bronze
    L.ajouter(*N.boite(0.2, 0.5, 0.2), "marbre", Mh @ T(0, -0.42, -0.62))  # le menton
    emprises.append(("la tête du colosse", Vf.rond(tx_, ty_, 0.7)))
    sous_eau.append((tx_, ty_, 1.3, 1.3, 0.0, True))
    mx, my = -1.85, -3.3  # sa main, dressée hors de l'eau
    Mn = T(mx, my, 0) @ Rz(1.1)
    L.ajouter(*N.cylindre(0.16, 0.13, 0.75, 8, haut=False), "marbre_algue", Mn @ T(0, 0, -0.5))
    L.ajouter(*N.boite(0.32, 0.12, 0.3), "marbre", Mn @ T(0, 0, 0.25))
    for k in range(4):
        L.ajouter(*N.tube([(-0.12 + 0.08 * k, 0, 0.53), (-0.13 + 0.085 * k, -0.04, 0.72), (-0.13 + 0.085 * k, -0.11, 0.84)], [0.036, 0.032, 0.026], 5), "marbre", Mn)
    L.ajouter(*N.tube([(0.16, 0, 0.3), (0.26, -0.04, 0.42), (0.28, -0.1, 0.52)], [0.04, 0.035, 0.028], 5), "marbre", Mn)
    emprises.append(("la main du colosse", Vf.rond(mx, my, 0.3)))
    sous_eau.append((mx, my, 0.5, 0.5, 0.0, True))

    # --- le temple rond, à l'est, sur l'anneau : deux degrés, huit colonnes (deux brisées), des linteaux, la vasque de bronze
    # où brûle encore une flamme verte ---
    rx, ry = vers(8, 0.5)
    zr = sol(rx, ry)
    L.ajouter(*N.cylindre(0.98, 0.98, 0.18, 14), "marbre_algue", T(rx, ry, zr - 0.05))
    L.ajouter(*N.cylindre(0.82, 0.82, 0.14, 14), "marbre", T(rx, ry, zr + 0.13))
    hr = {}
    for k in range(8):
        a = k * PI / 4 + 0.39
        hr[k] = colonne(L, rng, rx + math.cos(a) * 0.64, ry + math.sin(a) * 0.64, zr + 0.27, 1.05, 0.075, {2: 0.45, 5: 0.7}.get(k, 1.0), 0.0, fin=not leger)
    for k in (0, 3, 6, 7):
        if k in (2, 5) or (k + 1) % 8 in (2, 5):
            continue
        a0, a1 = k * PI / 4 + 0.39, (k + 1) * PI / 4 + 0.39
        L.ajouter(*N.poutre((rx + math.cos(a0) * 0.64, ry + math.sin(a0) * 0.64, zr + 0.27 + hr[k] + 0.06), (rx + math.cos(a1) * 0.64, ry + math.sin(a1) * 0.64, zr + 0.27 + hr[k] + 0.06), 0.2, 0.12), "marbre")
    L.ajouter(*N.cylindre(0.1, 0.13, 0.36, 7, haut=False), "marbre", T(rx, ry, zr + 0.27))
    L.ajouter(*N.cylindre(0.12, 0.24, 0.1, 9), "bronze", T(rx, ry, zr + 0.63))
    Fl = N.Maille("flammes")
    Fl.ajouter(*N.cylindre(0.1, 0.0, 0.26, 6, haut=False), "spectre", T(0, 0, 0))
    Fl.ajouter(*N.cylindre(0.055, 0.0, 0.17, 5, haut=False), "spectre", T(0.05, 0.03, 0))
    lots["libres"].append((Fl, (rx, ry, zr + 0.72), {"anim": "clignote"}))
    SOL.append(("decor", "le temple rond", Vf.rond(rx, ry, 1.02)))

    # --- l'aqueduct : des piles et des arches, de l'anneau jusque dans la mer, de plus en plus ruinées ---
    piles = [(4.72 - 0.4 * k, -1.55 - 1.02 * k) for k in range(7)]
    hpile = [1.5, 1.5, 1.5, 1.5, 1.15, 0.7, 0.36]
    cap_a = math.atan2(piles[1][1] - piles[0][1], piles[1][0] - piles[0][0])
    for k, ((ax, ay), ha) in enumerate(zip(piles, hpile)):
        if leger and k == 6:
            continue
        za = max(0.0, sol(ax, ay))
        mouille_ = sol(ax, ay) < 0.03
        L.ajouter(*N.boite(0.3, 0.42, ha + 0.5), "marbre_algue" if mouille_ else "marbre", T(ax, ay, za - 0.5) @ Rz(cap_a))
        if ha >= 1.5:
            L.ajouter(*N.boite(0.36, 0.48, 0.07), "marbre", T(ax, ay, za + ha - 0.42) @ Rz(cap_a))
        if mouille_:
            sous_eau.append((ax, ay, 0.34, 0.46, cap_a, False))
            emprises.append((f"une pile de l'aqueduc ({k})", Vf.rectangle(ax, ay, 0.34, 0.46, cap_a)))
        else:
            SOL.append(("decor", f"une pile de l'aqueduc ({k})", Vf.rectangle(ax, ay, 0.34, 0.46, cap_a)))
    for k in range(3):  # trois arches entières : la voûte, le canal dessus
        (ax, ay), (bx, by) = piles[k], piles[k + 1]
        za, zb_ = max(0.0, sol(ax, ay)) + 1.5, max(0.0, sol(bx, by)) + 1.5
        zh = max(za, zb_)
        pts = []
        for i in range(7):
            t = i / 6.0
            pts.append((ax + (bx - ax) * t, ay + (by - ay) * t, zh - 0.5 + 0.34 * math.sin(t * PI)))
        L.ajouter(*N.tube(pts, 0.1, 4), "marbre")
        L.ajouter(*N.poutre((ax, ay, zh + 0.06), (bx, by, zh + 0.06), 0.4, 0.2), "marbre")
    (ax, ay), (bx, by) = piles[3], piles[4]  # la quatrième : il n'en reste que le départ
    zh = max(0.0, sol(ax, ay)) + 1.5
    L.ajouter(*N.tube([(ax + (bx - ax) * t, ay + (by - ay) * t, zh - 0.5 + 0.34 * math.sin(t * PI)) for t in (0.0, 0.17, 0.34)], 0.1, 4), "marbre")
    L.ajouter(*N.poutre((ax, ay, zh + 0.06), (ax + (bx - ax) * 0.34, ay + (by - ay) * 0.34, zh + 0.06), 0.4, 0.2), "marbre")

    # --- le haut des murs noyés, dans le lagon : les rues de la ville se devinent ; leur ombre sur l'eau ---
    faits = 0
    rues = [(-1.7, 2.3, 0.3), (-2.6, 1.6, -0.2), (1.9, 2.2, -0.35), (2.7, 1.2, 0.25), (2.6, -0.9, 0.1), (1.9, -2.6, -0.3), (-1.6, 1.0, 0.15), (2.0, 0.5, -0.1), (-3.3, 1.0, 0.4), (1.3, 3.1, 0.2)]
    for qx, qy, cap in rues[:6 if leger else 10]:
        if sol(qx, qy) > -0.3:
            continue
        lx, ly = 0.9 + 0.5 * rng.random(), 0.6 + 0.3 * rng.random()
        Mr = T(qx, qy, 0) @ Rz(cap)
        for (wx, wy, wl, wang) in ((0, -ly / 2, lx, 0.0), (-lx / 2, 0, ly, PI / 2), (lx / 2, 0.1, ly * 0.6, PI / 2)):
            ht = 0.08 + 0.22 * rng.random()
            L.ajouter(*N.boite(wl, 0.13, 0.5 + ht), "marbre_algue", Mr @ T(wx, wy, -0.5) @ Rz(wang))
        if faits % 3 == 0:
            L.ajouter(*N.sphere(0.16, 6, 4, 0.5), "feuillage", Mr @ T(-lx / 2, -ly / 2, 0.22), zone=(1.0, 0.85, 1.0))  # une touffe a poussé dans l'angle
        K.tache(Rv, qx, qy, lx + 0.5, ly + 0.5, cap, marge=0.5)
        faits += 1
    for qx, qy, lx, ly, cap in ((-1.0, -3.2, 1.1, 0.7, 0.2), (1.4, -4.0, 0.9, 0.6, -0.4), (0.0, 2.9, 0.0, 0.0, 0.0), (-2.2, 3.0, 1.2, 0.7, 0.5), (3.3, -0.1, 1.0, 0.7, 0.0)):
        if lx and sol(qx, qy) < -0.3:  # des maisons tout à fait noyées : rien que leur ombre
            K.tache(Rv, qx, qy, lx, ly, cap, marge=0.55)

    # --- les arbres : deux grands arbres sur l'anneau, des cyprès autour du temple, des palmiers au bord de la passe ---
    for a, t, hh in ((158, 0.55, 2.0), (38, 0.5, 1.8)):
        x, y = vers(a, t)
        if libre(x, y, 0.3):
            Lu.arbre(L, U, rng, x, y, sol(x, y), hh, 0.8)
            SOL.append(("arbre", "un grand arbre", Vf.rond(x, y, 0.16)))
    for x, y in ((-2.25, 5.0), (2.25, 5.0), (-2.5, 6.1), (2.5, 6.1), (-3.05, 5.35))[:3 if leger else 5]:
        if anneau(x, y) > 0.3:
            cypres(L, rng, x, y, sol(x, y), 1.7 + 0.5 * rng.random())
            SOL.append(("arbre", "un cyprès", Vf.rond(x, y, 0.12)))
    for a, t, cap in ((-128, 0.45, -1.2), (-52, 0.5, -1.9), (-162, 0.75, 2.6), (64, 0.8, 0.9))[:3 if leger else 4]:
        x, y = vers(a, t)
        if libre(x, y, 0.2):
            I.palmier(L, rng, x, y, 2.1 + 0.5 * rng.random(), 0.5, cap, leger, z=sol(x, y))
            SOL.append(("arbre", "un palmier", Vf.rond(x, y, 0.13)))

    # --- ce qui reste du rempart, le long de la rive du large : des pans de mur, de plus en plus bas ---
    for a in (22, 52, 146, 172, 198, 224, 330, 352)[:5 if leger else 8]:
        x, y = vers(a, 0.84)
        cap = math.radians(a) + PI / 2
        if not libre(x, y, 0.5):
            continue
        Mw = T(x, y, sol(x, y) - 0.08) @ Rz(cap)
        hw = 0.5 + 0.45 * rng.random()
        L.ajouter(*N.boite(1.0, 0.24, hw), "marbre", Mw)
        L.ajouter(*N.boite(0.4, 0.24, hw * 0.45), "marbre", Mw @ T(0.7, 0, 0))
        L.ajouter(*N.boite(0.26, 0.24, 0.16), "marbre", Mw @ T(-0.3, 0, hw))
        L.ajouter(*N.sphere(0.17, 6, 4, 0.6), "feuillage_sombre", Mw @ T(0.25, 0.02, hw + 0.03), zone=(1.0, 0.85, 1.0))
        SOL.append(("decor", "un pan du rempart", Vf.rectangle(x + math.cos(cap) * 0.2, y + math.sin(cap) * 0.2, 1.45, 0.3, cap)))

    # --- des blocs, des tronçons de colonnes et des buissons sur l'anneau ---
    faits = 0
    for essai in range(300):
        if faits >= (9 if leger else 20):
            break
        x, y = vers(rng.random() * 360, 0.15 + rng.random() * 0.7)
        if not libre(x, y, 0.3):
            continue
        if faits % 3 == 0:
            colonne(L, rng, x, y, sol(x, y) - 0.03, 1.2, 0.1, 0.25 + 0.5 * rng.random(), 0.0, fin=not leger)
            SOL.append(("rocher", "une colonne brisée", Vf.rond(x, y, 0.18)))
        elif faits % 3 == 1:
            L.ajouter(*N.boite(0.3 + 0.2 * rng.random(), 0.24, 0.18 + 0.12 * rng.random()), "marbre", T(x, y, sol(x, y) - 0.05) @ Rz(rng.random() * 3) @ Rx(0.12))
            L.ajouter(*N.sphere(0.13, 6, 4, 0.6), "feuillage_sombre", T(x + 0.16, y + 0.1, sol(x, y) + 0.06), zone=(1.0, 0.85, 1.0))
            SOL.append(("rocher", "un bloc de marbre", Vf.rond(x, y, 0.26)))
        else:
            for q in range(3):
                L.ajouter(*N.sphere(0.14 + 0.08 * rng.random(), 7, 4, 0.7), ("feuillage", "feuillage_sombre", "feuillage")[q], T(x + 0.14 * math.cos(q * 2.1), y + 0.14 * math.sin(q * 2.1), sol(x, y) + 0.08), zone=(1.0, 0.82, 1.0))
            SOL.append(("rocher", "un buisson", Vf.rond(x, y, 0.26)))
        faits += 1

    # --- les explorateurs (immobiles) : devant le coffre vide, au pied du temple, sur l'anneau ---
    def poser(x, y, cap=None, leve=0):
        if any(K.distance_au_trajet(x, y, pts) < 0.07 + rc + 0.04 for pts, rc in couloirs) or any(Vf.penetration(Vf.rond(x, y, 0.07), p) > 0 for _, _, p in SOL):
            return
        P.passant(L, rng, x, y, angle=cap, z=sol(x, y), leve=leve)
        SOL.append(("passant", "un explorateur", Vf.rond(x, y, 0.065)))

    poser(PLACE[0] - 0.2, PLACE[1] - 0.6, PI / 2, 1)  # celui-là lève le bras au ciel : le coffre est vide
    poser(PLACE[0] + 0.24, PLACE[1] - 0.62, PI / 2)
    poser(TEMPLE[0] + 0.3, 3.75, PI / 2)
    poser(TEMPLE[0] - 0.95, 4.42, PI / 2 - 0.3)
    q = vers(8, 0.5)
    poser(q[0] - 1.3, q[1] - 0.25, 0.2)
    poser(QUAI[0] - 0.18, QUAI[1] - 0.05, -PI / 2)

    # --- la vie : les explorateurs qui marchent, les crabes, les ronds dans l'eau, les oiseaux ---
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
    Cr, premier = I.crabe(), None
    for k, pts in enumerate(crabes[:1] if leger else crabes):
        extras = {"anim": "marche", "chemin": [float(c) for p in pts for c in p], "vitesse": 0.1 + 0.03 * k, "phase": 0.3 * k, "saut": 0.0, "pause": 1.5, "rayon": 0.05}
        if premier is None:
            premier = len(lots["animes"])
            lots["animes"].append((Cr, pts[0], extras))
        else:
            lots["copies"].append((premier, pts[0], extras))
    for x, y, r in ((mx + 0.5, my - 0.3, 0.3), (0.9, -3.0, 0.26), (-1.3, 2.2, 0.3), (3.3, 0.9, 0.28))[:2 if leger else 4]:
        if sol(x, y) < -0.3:
            lots["reperes"].append(((float(x), float(y), K.H_RIVAGE + 0.01), {"anim": "ecume", "rayon": r}))
    for k, (ray, sens, vit) in enumerate(((2.55, 1, 0.42), (3.15, -1, 0.34))[:1 if leger else 2]):  # l'ombre des poissons, sous l'eau du lagon
        tour = [(PLACE[0] + math.cos(sens * i * 2 * PI / 28) * ray, PLACE[1] + 0.3 + math.sin(sens * i * 2 * PI / 28) * ray * 0.92, K.H_RIVAGE + 0.004) for i in range(28)]
        lots["libres"].append((banc_de_poissons(rng, 4 if leger else 6), tour[0], {"anim": "marche", "chemin": [float(c) for q in tour for c in q], "boucle": 1, "vitesse": vit, "saut": 0.0, "phase": 0.4 * k}))
    lots["reperes"].append(((0.0, 0.0, 4.6), {"anim": "oiseaux", "nb": 3 if leger else 6, "rayon": 5.2, "envergure": 0.13}))
    lots["reperes"].append(((0.0, 0.0, 0.0), {"anim": "mer", "rayon": 7.9, "genre": 2}))

    # --- sur l'eau (dessiné par le site) : le ressac sur les deux rives de l'anneau, l'ombre de ce qui sort de l'eau ---
    large, lagon = _cotes()
    fin = lambda k, nb: min(1.0, k / 6, (nb - 1 - k) / 6)
    K.bande(Rv, [(ca * (r - 0.04), sa * (r - 0.04)) for ca, sa, r in large], [(ca * (r + 0.06 + 1.0 * fin(k, len(large))), sa * (r + 0.06 + 1.0 * fin(k, len(large)))) for k, (ca, sa, r) in enumerate(large)], mat="ecume")
    K.bande(Rv, [(ca * (r + 0.04), sa * (r + 0.04)) for ca, sa, r in lagon], [(ca * (r - 0.06 - 0.45 * fin(k, len(lagon))), sa * (r - 0.06 - 0.45 * fin(k, len(lagon)))) for k, (ca, sa, r) in enumerate(lagon)], mat="ecume")
    for x, y, lx, ly, cap, rond in sous_eau:
        K.tache(Rv, x, y, lx, ly, cap, rond=rond, marge=0.24)
    lots["libres"].append((Rv, (0.0, 0.0, 0.0), {"role": "decor"}))
    lots["plan"] = {"emprises": emprises, "sol": SOL, "ponts": ponts}
    return lots


def verifier(lots=None, leger=False):
    """Les erreurs de plan (voir barhaw_ile_v5.controler) : une liste vide quand tout va bien."""
    return K.controler(lots or mailles(leger=leger), sol)


def construire(rendu=True, cuire=True, exporter=True, taille=None, echantillons=48, leger=False, alleger=True):
    lots = mailles(leger=leger)
    rendus = [("engloutie-v5", (10, -20, 12), (0.0, 0.4, 0.8), 55), ("engloutie-v5-place", (3.2, -6.2, 3.0), (0.0, 0.6, 0.6), 60)] if rendu else []
    return K.construire("ile-engloutie-v5", lots, verifier(lots), rendus, cuire, exporter, taille or (2048 if leger else 3072), echantillons, leger, alleger, atlas="engloutie")
