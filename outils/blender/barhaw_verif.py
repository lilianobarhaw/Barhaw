# Vérifier une île avant de la cuire : rien ne se chevauche, personne ne traverse un mur.
# Deux outils, en numpy seul (ils tournent aussi dans Blender) :
#   - les emprises : des polygones posés au sol (bateaux, pontons, maisons, étals…) ; penetration() dit de combien deux
#     d'entre eux s'enfoncent l'un dans l'autre ;
#   - les obstacles : la maille elle-même, échantillonnée (murs, caisses, poteaux : tout ce qui n'est pas du sol) ;
#     Obstacles.touche(x, y, z, r) dit si un passant de rayon r, les pieds en z, y bute (entre le genou et la tête).
# Chaque île « niveau 5 » appelle ces contrôles dans sa fonction verifier() ; construire() refuse de cuire s'il reste une erreur.
import math
import numpy as np

PI = math.pi


def rectangle(x, y, lx, ly, angle=0.0):
    c, s = math.cos(angle), math.sin(angle)
    return [(x + c * dx - s * dy, y + s * dx + c * dy) for dx, dy in ((-lx / 2, -ly / 2), (lx / 2, -ly / 2), (lx / 2, ly / 2), (-lx / 2, ly / 2))]


def rond(x, y, r, n=10):
    return [(x + math.cos(k * 2 * PI / n) * r, y + math.sin(k * 2 * PI / n) * r) for k in range(n)]


def penetration(A, B):
    """De combien deux polygones convexes s'enfoncent l'un dans l'autre (0 : ils ne se touchent pas)."""
    mini = 1e9
    for P in (A, B):
        for i in range(len(P)):
            x1, y1 = P[i]
            x2, y2 = P[(i + 1) % len(P)]
            nx, ny = y2 - y1, x1 - x2
            l = math.hypot(nx, ny) or 1.0
            a = [(nx * x + ny * y) / l for x, y in A]
            b = [(nx * x + ny * y) / l for x, y in B]
            rec = min(max(a), max(b)) - max(min(a), min(b))
            if rec <= 0:
                return 0.0
            mini = min(mini, rec)
    return mini


class Obstacles:
    """Tout ce qui, dans une maille, n'est pas du sol : ses faces qui ne sont pas à plat, semées de points (un tous les « pas »)."""

    def __init__(self, maille, pas=0.05, graine=5):
        v, faces, _, _ = maille.tableaux()
        rng = np.random.default_rng(graine)
        lots = []
        for f in faces:
            p = v[list(f)]
            for k in range(1, len(f) - 1):
                a, b, c = p[0], p[k], p[k + 1]
                n = np.cross(b - a, c - a)
                aire = np.linalg.norm(n) / 2
                if aire < 1e-9 or abs(n[2]) / (2 * aire) > 0.94:  # le sol, un toit plat, le dessus d'une caisse
                    continue
                nb = int(aire / (pas * pas) * 1.6) + 3
                u, w = rng.random(nb), rng.random(nb)
                hors = u + w > 1
                u[hors], w[hors] = 1 - u[hors], 1 - w[hors]
                lots.append(a + np.outer(u, b - a) + np.outer(w, c - a))
                lots.append(np.array([a, b, c, (a + b) / 2, (b + c) / 2, (a + c) / 2]))
        self.p = np.concatenate(lots) if lots else np.zeros((0, 3))
        self.pas = pas
        # rangés par cases de 10 cm (numpy seul : le Python de Blender n'a pas scipy)
        self.c = 0.1
        ij = np.floor(self.p[:, :2] / self.c).astype(np.int64)
        cle = ij[:, 0] * 100003 + ij[:, 1]
        ordre = np.argsort(cle, kind="stable")
        self.p, cle = self.p[ordre], cle[ordre]
        self.cles, self.debut = np.unique(cle, return_index=True)
        self.fin = np.append(self.debut[1:], len(cle))

    def touche(self, x, y, z, r=0.07, bas=0.12, haut=0.32):
        """Y a-t-il quelque chose à moins de r, entre z + bas et z + haut ? (bas : on enjambe les marches et les bordures)"""
        rr = r + self.pas * 0.5
        for i in range(math.floor((x - rr) / self.c), math.floor((x + rr) / self.c) + 1):
            for j in range(math.floor((y - rr) / self.c), math.floor((y + rr) / self.c) + 1):
                cle = i * 100003 + j
                k = int(np.searchsorted(self.cles, cle))
                if k < len(self.cles) and self.cles[k] == cle:
                    q = self.p[self.debut[k]:self.fin[k]]
                    if np.any(((q[:, 0] - x) ** 2 + (q[:, 1] - y) ** 2 < rr * rr) & (q[:, 2] >= z + bas) & (q[:, 2] <= z + haut)):
                        return True
        return False


def points_du_chemin(pts, boucle=False, pas=0.06):
    """Des points serrés le long d'un trajet (x, y, z)."""
    pts = [np.array(p, np.float64) for p in pts]
    if boucle:
        pts = pts + [pts[0]]
    sortie = []
    for a, b in zip(pts[:-1], pts[1:]):
        n = max(1, int(np.linalg.norm(b - a) / pas))
        for k in range(n):
            sortie.append(a + (b - a) * k / n)
    sortie.append(pts[-1])
    return sortie


def chemin_bloque(pts, obstacles, r=0.07, boucle=False, bas=0.12):
    """Les endroits d'un trajet où le marcheur bute sur quelque chose : [(x, y, z)…], vide si tout est libre."""
    return [tuple(round(float(c), 2) for c in p) for p in points_du_chemin(pts, boucle) if obstacles.touche(p[0], p[1], p[2], r, bas)]
