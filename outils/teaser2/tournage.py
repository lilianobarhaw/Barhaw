# Le tournage du site pour le teaser : l'aperçu VF filmé image par image (horloge maîtrisée), avec les vraies polices.
# Chaque plan sort en une suite de JPEG (qualité 92) puis en un .mp4 1920×1080 (ou 1080×1920) à 30 i/s.
import asyncio, json, math, os, re, subprocess, sys, time
from datetime import datetime, timezone
from playwright.async_api import async_playwright

FPS = 30
DT = 1000 / FPS
ICI = os.path.dirname(os.path.abspath(__file__))
POLICES = "/mnt/user-data/uploads/Barhaw-3D/son"
CSS_POLICES = """
@font-face{font-family:"Dela Gothic One";src:url(https://polices.barhaw/DelaGothicOne-Regular.ttf) format("truetype");font-display:block}
@font-face{font-family:"M PLUS Rounded 1c";font-weight:400;src:url(https://polices.barhaw/MPLUSRounded1c-Regular.ttf) format("truetype");font-display:block}
@font-face{font-family:"M PLUS Rounded 1c";font-weight:500;src:url(https://polices.barhaw/MPLUSRounded1c-Medium.ttf) format("truetype");font-display:block}
@font-face{font-family:"M PLUS Rounded 1c";font-weight:700;src:url(https://polices.barhaw/MPLUSRounded1c-Bold.ttf) format("truetype");font-display:block}
@font-face{font-family:"M PLUS Rounded 1c";font-weight:800;src:url(https://polices.barhaw/MPLUSRounded1c-ExtraBold.ttf) format("truetype");font-display:block}
"""
# ce qui sert à l'aperçu, et pas au vrai site : caché pendant le tournage
CSS_CACHE = """
[class^="apercu-"]:not(.apercu-vf-garde), [id^="apercu-"], .apercu-vf, .apercu-vf-bulle, .pote-live, #caritatif-bandeau, #caritatif-intro { display: none !important; }
html { scrollbar-width: none; } ::-webkit-scrollbar { display: none; }
"""
INIT = """
(() => {
  try { localStorage.setItem('barhaw-cine-gl2', 'vu'); localStorage.setItem('barhaw-caritatif-vu', '9999'); } catch {}
  const st = document.createElement('style'); st.textContent = %s;
  const poser = () => (document.head || document.documentElement).appendChild(st);
  if (document.head) poser(); else document.addEventListener('DOMContentLoaded', poser);
  // le temps des animations CSS suit l'horloge du tournage
  window.__vt = 0;
  window.__sync = (ms) => {
    window.__vt += ms;
    window.__defile = [scrollX, scrollY];
    for (const a of document.getAnimations()) {
      if (a.__t0 === undefined) a.__t0 = window.__vt - ms;
      try { a.pause(); a.currentTime = Math.max(0, window.__vt - a.__t0); } catch {}
    }
    return [scrollX, scrollY];
  };
})();
""" % json.dumps(CSS_CACHE)


async def router(route):
    u = route.request.url
    if "fonts.googleapis.com" in u:
        return await route.fulfill(body=CSS_POLICES, content_type="text/css")
    if u.startswith("https://polices.barhaw/"):
        return await route.fulfill(path=os.path.join(POLICES, u.rsplit("/", 1)[1]), content_type="font/ttf")
    if "fonts.gstatic.com" in u:
        return await route.abort()
    if "cdn.jsdelivr.net/npm/three" in u:
        return await route.fulfill(path="/home/claude/barhaw/js/three-r170.module.min.js", content_type="text/javascript")
    if "site-barhaw.html" in u:
        return await route.fulfill(path="/home/claude/v4/apercu/site-barhaw.html", content_type="text/html; charset=utf-8")
    if u.startswith("http://127.0.0.1:18090"):
        return await route.continue_()
    return await route.abort()


class Plateau:
    def __init__(self, page, dossier, L=1280, H=720, echelle=1.5):
        self.p = page
        self.L, self.H, self.echelle = L, H, echelle
        self.dossier = dossier
        self.n = 0
        self.clics = []
        os.makedirs(dossier, exist_ok=True)

    async def attendre(self, ms, vrai=0.0, pas=100):
        """Fait avancer le temps sans filmer (chargement, réglages) : par sauts, sans dessiner chaque image."""
        fait = 0
        while fait < ms:
            d = min(pas, ms - fait)
            await self.p.clock.fast_forward(int(d))
            await self.p.evaluate(f"window.__sync({d})")
            fait += d
            if vrai:
                await asyncio.sleep(vrai)

    async def cadrer(self, selecteur, marge=16, echelle=2.5):
        """Les images suivantes ne prennent que cet élément (un panneau de jeu), à taille fixe, en suivant sa place."""
        self.cadre = (selecteur, marge, echelle)
        b = await self.p.evaluate("(s) => { const r = document.querySelector(s).getBoundingClientRect(); return [r.width, r.height]; }", selecteur)
        self.taille_cadre = (round(b[0] + 2 * marge), round(b[1] + 2 * marge))

    async def image(self):
        await self.p.clock.fast_forward(round(DT * (self.n + 1)) - round(DT * self.n))
        sx, sy = await self.p.evaluate(f"window.__sync({DT})")
        cadre = getattr(self, "cadre", None)
        if cadre:
            x, y = await self.p.evaluate("(s) => { const r = document.querySelector(s).getBoundingClientRect(); return [r.x + scrollX, r.y + scrollY]; }", cadre[0])
            w, h = self.taille_cadre
            clip = {"x": x - cadre[1], "y": y - cadre[1], "width": w, "height": h, "scale": cadre[2]}
        else:
            clip = {"x": sx, "y": sy, "width": self.L, "height": self.H, "scale": self.echelle}
        if not hasattr(self, "cdp"):
            self.cdp = await self.p.context.new_cdp_session(self.p)
        r = await self.cdp.send("Page.captureScreenshot", {"format": "jpeg", "quality": 92, "optimizeForSpeed": True, "clip": clip})
        open(os.path.join(self.dossier, f"{self.n:05d}.jpg"), "wb").write(__import__("base64").b64decode(r["data"]))
        self.n += 1

    async def filmer(self, secondes, chaque=None):
        for k in range(round(secondes * FPS)):
            if chaque:
                await chaque(k / FPS)
            await self.image()

    async def touche(self, code="Space", duree=0.0):
        await self.p.evaluate("(c) => document.dispatchEvent(new KeyboardEvent('keydown', { code: c, key: c === 'Space' ? ' ' : c, bubbles: true }))", code)
        if duree <= 0:
            await self.p.evaluate("(c) => document.dispatchEvent(new KeyboardEvent('keyup', { code: c, key: c === 'Space' ? ' ' : c, bubbles: true }))", code)

    async def lacher(self, code="Space"):
        await self.p.evaluate("(c) => document.dispatchEvent(new KeyboardEvent('keyup', { code: c, key: c === 'Space' ? ' ' : c, bubbles: true }))", code)

    async def clic(self, selecteur, texte=None):
        """Un clic en JavaScript (sans attendre d'image : l'horloge est arrêtée), noté pour dessiner le curseur au montage."""
        r = await self.p.evaluate("""([s, t]) => {
            const els = [...document.querySelectorAll(s)].filter(e => !t || e.textContent.includes(t));
            const e = els[0]; if (!e) return null;
            const b = e.getBoundingClientRect(); e.click();
            return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
        }""", [selecteur, texte])
        if r:
            self.clics.append({"image": self.n, **r})
        return r

    def fin(self, sortie):
        tmp = sortie[:-4] + ".tmp.mp4"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-i", os.path.join(self.dossier, "%05d.jpg"),
                        "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", "-c:v", "libx264", "-crf", "14", "-preset", "veryfast", "-pix_fmt", "yuv420p", tmp], check=True)
        os.replace(tmp, sortie)
        json.dump(self.clics, open(sortie[:-4] + ".clics.json", "w"))


async def ouvrir(nav, largeur, hauteur, echelle, url="http://127.0.0.1:18090/site-barhaw.html", erreurs=None):
    ctx = await nav.new_context(viewport={"width": largeur, "height": hauteur}, device_scale_factor=1)
    p = await ctx.new_page()
    if erreurs is not None:
        p.on("pageerror", lambda e: erreurs.append(str(e)))
    await p.route("**/*", router)
    await p.add_init_script(INIT)
    await p.clock.install(time=datetime(2026, 12, 23, 20, 0, tzinfo=timezone.utc))
    await p.goto(url, wait_until="domcontentloaded")
    return ctx, p
