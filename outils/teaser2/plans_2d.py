# Les plans du site sans 3D : l'accueil, et trois jeux cadrés sur leur panneau (rumble, course, memory).
import asyncio, sys, time, math
sys.path.insert(0, "/home/claude/teaser2")
from tournage import *

SORTIE = "/home/claude/teaser2/plans"
os.makedirs(SORTIE, exist_ok=True)
lisse = lambda x: 0.5 - 0.5 * math.cos(math.pi * max(0.0, min(1.0, x)))


async def accueil(nav):
    ctx, p = await ouvrir(nav, 1280, 720, 1.5, url="http://127.0.0.1:18090/site-barhaw.html?3d=non")
    pl = Plateau(p, f"{SORTIE}/accueil")
    await pl.attendre(400, vrai=0.6)  # les données et les polices arrivent ; les animations d'entrée commencent ici

    async def defiler(t):
        if t > 4.6:
            await p.evaluate(f"window.scrollTo(0, {round(620 * lisse((t - 4.6) / 3.2))})")
    await pl.filmer(8.4, defiler)
    pl.fin(f"{SORTIE}/accueil.mp4")
    await ctx.close()


async def jeu(nav, nom, bouton, secondes, action):
    ctx, p = await ouvrir(nav, 1280, 720, 1.5, url="http://127.0.0.1:18090/site-barhaw.html?3d=non")
    pl = Plateau(p, f"{SORTIE}/{nom}")
    await pl.attendre(2500, vrai=0.05)
    await p.evaluate(f"document.getElementById('{nom}').scrollIntoView({{block: 'center'}})")
    await pl.attendre(1500, vrai=0.05)
    await pl.cadrer(f"#{nom}", marge=14, echelle=2.5)
    await pl.filmer(0.6)
    await pl.clic(f"#{nom} button", bouton)
    await pl.filmer(secondes, lambda t: action(pl, t))
    pl.fin(f"{SORTIE}/{nom}.mp4")
    await ctx.close()


def rythme(pas, depart=0.4, duree=0.0):
    fait = set()

    async def agir(pl, t):
        k = int((t - depart) / pas)
        if t >= depart and k not in fait:
            fait.add(k)
            await pl.touche("Space")
    return agir


async def rien(pl, t):
    return None


async def main():
    quoi = sys.argv[1:] or ["accueil", "rumble", "course", "memory"]
    async with async_playwright() as pw:
        nav = await pw.chromium.launch(args=["--enable-unsafe-swiftshader", "--hide-scrollbars"])
        for q in quoi:
            t = time.time()
            if q == "accueil":
                await accueil(nav)
            elif q == "rumble":
                await jeu(nav, "rumble", "Avaler", 3.6, rien)
            elif q == "course":
                await jeu(nav, "course", "Courir", 5.0, rythme(0.85, 1.6))
            elif q == "memory":
                await jeu(nav, "memory", "Distribuer", 3.4, rien)
            print(q, "fait en", round(time.time() - t), "s", flush=True)
        await nav.close()

asyncio.run(main())
