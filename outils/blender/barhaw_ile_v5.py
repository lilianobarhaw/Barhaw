# Ce que toutes les îles « niveau 5 » ont en commun (voir barhaw_niveau5.py et barhaw_verif.py) :
#   - controler(lots, sol) : les erreurs de plan, à corriger avant de cuire ;
#   - construire(nom, lots, erreurs, …) : dans Blender, la lumière cuite dans un atlas, l'export, les rendus d'essai ;
#   - de petits outils pour le terrain (bruit2, lisse).
# Une île est un module (barhaw_plage_v5.py…) qui donne mailles(leger), verifier(lots) et construire(**reglages).
# « lots » : corps (tout ce qui est cuit), vitres, lumieres, bannieres [(Maille, origine, extras)], animes [(Maille, origine,
# extras)] (cuits, ils bougent), copies [(numéro dans animes, origine, extras)], libres [(Maille, origine, extras)] (matières du
# site, pas cuits : les flammes), reperes [(position, extras)] (les effets du site), plan {emprises, sol, ponts}.
import math
import os
import numpy as np
import barhaw_niveau5 as N
import barhaw_verif as Vf


def lisse(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def _h2(i, j, g):
    return (math.sin(i * 127.1 + j * 311.7 + g * 74.7) * 43758.5453) % 1.0


def bruit2(x, y, g=0):
    """Un bruit doux entre 0 et 1 (pour le relief : toujours le même au même endroit)."""
    i, j = math.floor(x), math.floor(y)
    fx, fy = x - i, y - j
    sx, sy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a, b, c, d = _h2(i, j, g), _h2(i + 1, j, g), _h2(i, j + 1, g), _h2(i + 1, j + 1, g)
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy


def champ(f, R, n=160):
    """f(x, y) relevé sur une grille grossière de l'île (de -R à R) : un tableau (n, n), la ligne 0 au sud."""
    xs = (np.arange(n) + 0.5) / n * 2 * R - R
    return np.array([[f(x, y) for x in xs] for y in xs], np.float32)


def agrandir(a, taille):
    """Le même tableau, plus fin (lissé entre les points) : pour peindre le sol d'une île pixel par pixel."""
    n = a.shape[0]
    p = (np.arange(taille) + 0.5) / taille * n - 0.5
    i0 = np.clip(np.floor(p).astype(int), 0, n - 1)
    i1 = np.clip(i0 + 1, 0, n - 1)
    t = np.clip(p - np.floor(p), 0, 1).astype(np.float32)
    lignes = a[i0] * (1 - t)[:, None] + a[i1] * t[:, None]
    return lignes[:, i0] * (1 - t)[None, :] + lignes[:, i1] * t[None, :]


def distance_au_trajet(x, y, pts):
    q = np.array((x, y))
    mini = 1e9
    for a_, b_ in zip(pts[:-1], pts[1:]):
        a2, b2 = np.array(a_[:2]), np.array(b_[:2])
        t = min(1.0, max(0.0, float(np.dot(q - a2, b2 - a2) / max(1e-9, np.dot(b2 - a2, b2 - a2)))))
        mini = min(mini, float(np.linalg.norm(q - (a2 + (b2 - a2) * t))))
    return mini


def suivre(pts, sol, pas=0.3):
    """Un trajet à terre qui épouse le relief : des points serrés, chacun à la hauteur du sol (les pieds 2 cm au-dessus)."""
    sortie = []
    for a_, b_ in zip(pts[:-1], pts[1:]):
        n = max(1, int(math.hypot(b_[0] - a_[0], b_[1] - a_[1]) / pas))
        for k_ in range(n):
            x, y = a_[0] + (b_[0] - a_[0]) * k_ / n, a_[1] + (b_[1] - a_[1]) * k_ / n
            sortie.append((x, y, sol(x, y) + 0.02))
    sortie.append((pts[-1][0], pts[-1][1], sol(pts[-1][0], pts[-1][1]) + 0.02))
    return sortie


H_RIVAGE = 0.035  # la hauteur de ce qui est dessiné sur l'eau : juste au-dessus de la mer du site, au calme près d'une île


def tache(Rv, cx, cy, lx, ly, angle=0.0, z=H_RIVAGE, mat="ombre_eau", marge=0.34, rond=False, decal=(0.07, 0.1)):
    """L'ombre d'une chose sur l'eau (un ponton, une coque) : pleine sous elle (son emprise lx × ly, ronde pour une coque), puis
    fondue sur « marge », un peu plus loin du côté opposé au soleil (decal). v va de 2 (pleine) à 3 (plus rien) : au-dessus
    de 1, le site sait que c'est une tache, sans liseré d'écume."""
    c, s = math.cos(angle), math.sin(angle)
    if rond:
        forme = [(math.cos(t), math.sin(t)) for t in (k * math.pi / 6 for k in range(12))]
    else:
        forme = [(-1, -1), (1, -1), (1, 1), (-1, 1)]
    n = len(forme)
    def tour(ax, ay, dx, dy):
        return [(cx + dx + c * fx * ax - s * fy * ay, cy + dy + s * fx * ax + c * fy * ay, z) for fx, fy in forme]
    dedans, dehors = tour(lx / 2, ly / 2, 0, 0), tour(lx / 2 + marge, ly / 2 + marge, *decal)
    Rv.ajouter([(cx, cy, z)] + dedans, [(0, 1 + k, 1 + (k + 1) % n) for k in range(n)], mat, uv=[(0.5, 2.0)] * (n + 1))
    Rv.ajouter(dedans + dehors, [(k, n + k, n + (k + 1) % n, (k + 1) % n) for k in range(n)], mat, uv=[(0.5, 2.0)] * n + [(0.5, 3.0)] * n)


def bande(Rv, dedans, dehors, z=H_RIVAGE, mat="ecume", boucle=False):
    """Un ruban sur l'eau le long d'un bord (une plage, un quai) : dedans et dehors, deux lignes de points face à face.
    u court le long du bord (en unités du monde), v va du bord (0) vers le large (1). Le site y dessine l'écume ou le reflet.
    boucle : le ruban fait le tour de l'île ; u est alors ramené à un multiple de 16, pour que le bruit du site (périodique
    tous les 16) se referme sans couture."""
    longs = [math.hypot(dedans[i + 1][0] - dedans[i][0], dedans[i + 1][1] - dedans[i][1]) for i in range(len(dedans) - 1)]
    total = sum(longs)
    k = 16 * max(1, round(total / 16)) / total if boucle else 1.0
    u = 0.0
    for i, l in enumerate(longs):
        Rv.ajouter([(*dedans[i], z), (*dehors[i], z), (*dehors[i + 1], z), (*dedans[i + 1], z)], [(0, 1, 2, 3)], mat, uv=[(u, 0.0), (u, 1.0), (u + l * k, 1.0), (u + l * k, 0.0)])
        u += l * k


def controler(lots, sol):
    """Les erreurs de plan d'une île : deux choses l'une dans l'autre (emprises au sol), un marcheur qui bute sur quelque chose
    ou qui n'est pas à la hauteur du sol (sauf sur un pont de bois : plan["ponts"]). Renvoie la liste (vide : tout va bien)."""
    erreurs = []
    plan = lots["plan"]
    E = plan.get("emprises", []) + [(n, p) for g, n, p in plan.get("sol", []) if g not in ("arbre", "rocher", "passant")]
    for i in range(len(E)):
        for j in range(i + 1, len(E)):
            e = Vf.penetration(E[i][1], E[j][1])
            if e > 0.03:
                erreurs.append(f"{E[i][0]} et {E[j][0]} se chevauchent de {e:.2f}")
    durs = [(n, p) for g, n, p in plan.get("sol", []) if g not in ("arbre", "rocher", "passant")]
    for g, n, p in plan.get("sol", []):
        if g == "arbre":
            for n2, p2 in durs:
                if Vf.penetration(p, p2) > 0.05:
                    erreurs.append(f"{n} et {n2} se chevauchent de {Vf.penetration(p, p2):.2f}")
    O = Vf.Obstacles(lots["corps"])
    ponts = plan.get("ponts", [])
    marcheurs = [(A.nom, e) for A, _, e in lots["animes"]] + [(lots["animes"][k][0].nom, e) for k, _, e in lots["copies"]]
    for n, (nom, e) in enumerate(marcheurs):
        if e.get("anim") != "marche" or e.get("roulis"):
            continue
        c = e["chemin"]
        pts = [c[k:k + 3] for k in range(0, len(c), 3)]
        rayon = e.get("rayon", 0.07)
        bloques = Vf.chemin_bloque(pts, O, rayon, bool(e.get("boucle")), bas=0.17 if max(q[2] for q in pts) - min(q[2] for q in pts) > 0.5 else 0.12)
        if bloques:
            erreurs.append(f"{nom} (trajet {n}) bute {len(bloques)} fois, par exemple en {bloques[0]} et {bloques[-1]}")
        for q in Vf.points_du_chemin(pts, bool(e.get("boucle"))):
            sur_pont = any(Vf.penetration(Vf.rond(q[0], q[1], 0.03), poly) > 0 for poly in ponts)
            if not sur_pont and (sol(q[0], q[1]) < 0.03 or abs(q[2] - sol(q[0], q[1])) > 0.25):
                erreurs.append(f"{nom} (trajet {n}) n'est pas sur le sol en ({q[0]:.2f}, {q[1]:.2f}) : {q[2]:.2f} pour {sol(q[0], q[1]):.2f}")
                break
    return erreurs


def construire(nom, lots, erreurs, rendus=(), cuire=True, exporter=True, taille=2048, echantillons=48, leger=False, alleger=True, atlas="ile"):
    """Dans Blender : l'île posée, sa lumière cuite dans l'atlas, l'export, les rendus. rendus : [(nom, caméra, cible, objectif)]."""
    if erreurs:
        raise RuntimeError("Plan à corriger avant de cuire : " + " | ".join(erreurs[:8]))
    fichier = nom + ("-leger" if leger else "")
    coll_nom = fichier.replace("-", "_")
    cuites = [lots["corps"]] + [A for A, _, _ in lots["animes"]]
    infos = {"triangles_avant": sum(M.triangles() for M in cuites)}

    def poser():
        coll = N.collection(coll_nom)
        infos["finesse"] = [round(x, 2) for x in N.emballer(cuites, taille)]
        cuits = [N.objet(lots["corps"], coll, "ile_corps", extras={"role": "decor"})]
        for k, (A, origine, extras) in enumerate(lots["animes"]):
            o = N.objet(A, coll, f"ile_anime{k}", origine=origine, extras=extras)
            o.visible_shadow = False  # ce qui bouge ne laisse pas son ombre figée
            cuits.append(o)
        for k, (source, origine, extras) in enumerate(lots["copies"]):
            N.copie(cuits[1 + source], coll, f"ile_copie{k}", origine, extras).visible_shadow = False
        for k, (position, extras) in enumerate(lots["reperes"]):
            N.repere(coll, f"ile_repere{k}", position, extras)
        vitres = N.objet(lots["vitres"], coll, "ile_vitres", extras={"role": "decor"}) if lots["vitres"].f else None
        if lots["lumieres"].f:
            N.objet(lots["lumieres"], coll, "ile_lumieres", extras={"role": "decor"})
        for k, (Bm, origine, extras) in enumerate(lots["bannieres"]):
            N.objet(Bm, coll, f"ile_banniere{k}", origine=origine, extras=extras)
        for k, (Lm, origine, extras) in enumerate(lots.get("libres", [])):
            o = N.objet(Lm, coll, f"ile_libre{k}", origine=origine, extras=extras)
            o.visible_shadow = False
            o.hide_render = Lm.nom.startswith("rivage")  # l'écume et les reflets sont dessinés par le site, pas par Blender
        if vitres:
            vitres.hide_render = True  # de jour, les vitres allumées ne se voient pas
        return coll, cuits, vitres

    def au_soleil(cuits, sens):
        # ce qui se promène est cuit en plein soleil, au-dessus de l'île : sinon il garderait l'ombre de son point de départ
        for o, (A, origine, extras) in zip(cuits[1:], lots["animes"]):
            if extras.get("anim") == "marche":
                o.location.z += 40 * sens

    N.soleil_et_ciel()
    if cuire and alleger:
        coll, cuits, vitres = poser()
        N.cuire_ensemble(cuits[:1], None, 1024, 16, nom="essai", remplacer=False)
        infos["faces_retirees"] = cuites[0].garder([not c for c in N.cachees(cuites[0], N.pixels_atlas("essai"))])
    coll, cuits, vitres = poser()
    infos["triangles"] = sum(M.triangles() for M in cuites)
    if rendus:
        infos["rendus"] = [N.rendre(n, cam, cible, objectif, collections=[coll.name]) for n, cam, cible, objectif in rendus]
    if cuire:
        au_soleil(cuits, 1)
        infos["atlas"] = N.cuire_ensemble(cuits, os.path.join(N.dossier(), "glb", fichier + ".png"), taille, echantillons, nom=atlas)
        au_soleil(cuits, -1)
    if vitres:
        vitres.hide_render = False
    if exporter:
        infos["glb"] = N.exporter(coll.name, fichier + ".glb", couleurs=True)  # les couleurs de sommet : ce que le site anime
    return infos
