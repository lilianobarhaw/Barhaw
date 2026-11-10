# La carte GRAND LINE en 3D : le navire de Squirt.exe et ses pieuvres, puis la caméra s'envole sur toute la course.
import asyncio, sys, time
sys.path.insert(0, "/home/claude/teaser2")
from tournage import *
SORTIE = "/home/claude/teaser2/plans"
async def main():
    async with async_playwright() as pw:
        nav = await pw.chromium.launch(args=["--enable-unsafe-swiftshader", "--hide-scrollbars"])
        err = []
        ctx, p = await ouvrir(nav, 960, 540, 2.0, erreurs=err)
        pl = Plateau(p, f"{SORTIE}/salle", 960, 540, 2.0)
        await pl.attendre(2500, vrai=0.05)
        await p.evaluate("document.getElementById('grandline').scrollIntoView()")
        await pl.attendre(1500, vrai=0.05)
        await pl.clic("#flotte-barre [role=tab]", "Squirt.exe")
        await pl.attendre(800, vrai=0.05)
        await pl.clic("#gl-ouvrir-3d")
        t = time.time()
        for k in range(40):
            await pl.attendre(400, vrai=0.3, pas=400)
        print("salle prête", round(time.time() - t), flush=True)
        boutons = await p.evaluate("[...document.querySelectorAll('.gl-salle button')].map(b => b.className + '|' + (b.getAttribute('aria-label') || b.textContent.trim()).slice(0, 30))")
        print(boutons, flush=True)
        fait = set()
        async def agir(t):
            if t >= 0.3 and "zoom" not in fait:
                fait.add("zoom")
                await p.evaluate("(() => { const b = [...document.querySelectorAll('.gl-salle button')].find(b => /rapprocher|zoom|\\+/i.test((b.getAttribute('aria-label') || '') + b.textContent)); b && b.click(); })()")
            if t >= 3.8 and "course" not in fait:
                fait.add("course")
                await pl.clic("[role=tab]", "La course")
            if int(t * 30) % 30 == 0:
                print("t", round(t, 1), round(time.time() - t0), flush=True)
        t0 = time.time()
        await pl.filmer(6.4, agir)
        pl.fin(f"{SORTIE}/salle.mp4")
        await ctx.close(); await nav.close()
        print("fini", err or "0 erreur", flush=True)
asyncio.run(main())
