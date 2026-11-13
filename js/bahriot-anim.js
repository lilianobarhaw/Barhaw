// La SEMAINE BAHRIOT : les animations de la page (chargées par site.js seulement si l'appareil ne demande pas moins
// d'animations). Tout est dessiné ici, rien n'est repris d'un jeu :
//   • le bandeau : une faille d'énergie qui s'ouvre à l'arrivée (éclair, onde de choc, lettres qui tombent), des braises,
//     des arcs électriques, des rayons ; ses couleurs et son humeur suivent la phase (inscriptions, en cours, dernière
//     soirée avec la foudre, comptage avec un balayage, podium avec des feux d'artifice) ; il suit un peu la souris ;
//   • le compte à rebours : des tuiles qui basculent chaque seconde, rouges la dernière minute, et une explosion à zéro ;
//   • le score : les barres qui se remplissent, les points qui montent, « +12 » qui s'envole, des étincelles, les commus
//     qui changent de place en glissant, et un bandeau « X passe devant Y ! » ;
//   • son inscription : un tampon et des confettis aux couleurs de sa commu ;
//   • le podium : le 3e, le 2e, puis le 1er qui montent, la couronne qui tombe, les projecteurs, les feux d'artifice.
// Rien ne tourne quand le bandeau n'est pas à l'écran ou que l'onglet est caché ; moins de particules sur téléphone.

const PALETTES = {
  bientot: ["#9b4dff", "#5fd0d8", "#ff8fcb"],
  inscriptions: ["#ff4f9a", "#9b4dff", "#ffd36b"],
  "en-cours": ["#ff3b5c", "#ff4f9a", "#ffd36b"],
  derniere: ["#ff3b30", "#ff8a00", "#ffd36b"],
  comptage: ["#5fd0d8", "#9b4dff", "#e8fbff"],
  fini: ["#ffd36b", "#ff9f1c", "#fff3c4"],
};
// par phase : les arcs électriques par seconde, la vitesse des braises, la foudre
const HUMEURS = {
  bientot: { arcs: 0.5, braises: 0.7, foudre: 0 },
  inscriptions: { arcs: 1.1, braises: 1, foudre: 0 },
  "en-cours": { arcs: 1.8, braises: 1.25, foudre: 0 },
  derniere: { arcs: 3.4, braises: 1.6, foudre: 1 },
  comptage: { arcs: 0.4, braises: 0.6, foudre: 0 },
  fini: { arcs: 0.7, braises: 0.9, foudre: 0 },
};
const NOMBRE = new Intl.NumberFormat("fr-FR");
const hasard = (a, b) => a + Math.random() * (b - a);
const choix = (l) => l[Math.floor(Math.random() * l.length)];
const doux = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const lire = (cle) => { try { return localStorage.getItem(cle); } catch { return null; } };
const ecrire = (cle, v) => { try { localStorage.setItem(cle, v); } catch { /* rien */ } };
const lireSession = (cle) => { try { return sessionStorage.getItem(cle); } catch { return null; } };
const ecrireSession = (cle, v) => { try { sessionStorage.setItem(cle, v); } catch { /* rien */ } };
// « --c1:#e3447f;--c2:#ffd36b;… » → ["#e3447f", "#ffd36b"]
const couleursDe = (style) => [/--c1:\s*([^;]+)/.exec(style || "")?.[1], /--c2:\s*([^;]+)/.exec(style || "")?.[1]].filter(Boolean).map((c) => c.trim());

export function creerAnimBahriot({ zero = null } = {}) {
  const telephone = () => innerWidth < 700;
  const memo = { points: new Map(), largeurs: new Map(), ordre: [], zeros: new Set() };
  const minuteurs = new Set();
  const plus_tard = (f, ms) => { const t = setTimeout(() => { minuteurs.delete(t); f(); }, ms); minuteurs.add(t); return t; };

  // ---------- le bandeau : la faille ----------
  const B = { el: null, canvas: null, ctx: null, w: 0, h: 0, dpr: 1, phase: "inscriptions", visible: false, ouverture: 1, intro: 0, flash: 0,
    base: [], braises: [], arcs: [], anneaux: [], feux: [], foudre: [], prochainArc: 0, prochaineFoudre: 0, prochainFeu: 0, balayage: 0,
    souris: { x: 0, y: 0, cx: 0, cy: 0 } };
  let raf = 0, avantT = 0;
  const vueBandeau = new IntersectionObserver((l) => {
    for (const e of l) if (e.target === B.el) {
      B.visible = e.isIntersecting;
      if (B.visible && B.el.classList.contains("br-attente") && e.intersectionRatio >= 0.6) lancerIntro();
    }
    boucle();
  }, { threshold: [0, 0.6] });
  const taille = new ResizeObserver(() => redimensionner());
  document.addEventListener("visibilitychange", () => boucle());

  function brancherBandeau(el) {
    if (B.el === el) return;
    if (B.el) { vueBandeau.unobserve(B.el); taille.unobserve(B.el); }
    const phaseAvant = B.phase;
    B.el = el;
    B.canvas = el.querySelector("canvas.br-fond");
    B.ctx = B.canvas?.getContext("2d") || null;
    B.phase = el.dataset.brBanniere || "inscriptions";
    el.classList.add("br-anime");
    el.addEventListener("pointermove", (ev) => {
      const r = el.getBoundingClientRect();
      B.souris.x = ((ev.clientX - r.left) / r.width - 0.5) * 2;
      B.souris.y = ((ev.clientY - r.top) / r.height - 0.5) * 2;
    }, { passive: true });
    el.addEventListener("pointerleave", () => { B.souris.x = 0; B.souris.y = 0; }, { passive: true });
    redimensionner();
    // l'arrivée : une fois par visite et par phase (la semaine qui commence la rejoue)
    const cle = `br-intro-${B.phase}`;
    if (!lireSession(cle)) { el.classList.add("br-attente"); B.ouverture = 0; }
    else if (phaseAvant !== B.phase || !B.base.length) B.ouverture = 1;
    vueBandeau.observe(el);
    taille.observe(el);
  }
  function redimensionner() {
    if (!B.el || !B.canvas) return;
    const r = B.el.getBoundingClientRect();
    B.dpr = Math.min(devicePixelRatio || 1, telephone() ? 1.25 : 1.75);
    B.w = Math.max(1, Math.round(r.width));
    B.h = Math.max(1, Math.round(r.height));
    B.canvas.width = Math.round(B.w * B.dpr);
    B.canvas.height = Math.round(B.h * B.dpr);
    // la faille : une ligne brisée d'un bord à l'autre, un peu au-dessus du milieu, derrière le grand titre
    const n = telephone() ? 18 : 30;
    B.base = Array.from({ length: n + 1 }, (_, i) => ({ x: (i / n) * B.w, y: B.h * 0.5 + (i === 0 || i === n ? 0 : hasard(-1, 1) * B.h * 0.09), p: hasard(0, 6.28) }));
    const voulu = Math.round(Math.min(telephone() ? 34 : 90, B.w / 11));
    while (B.braises.length < voulu) B.braises.push(braise(true));
    B.braises.length = Math.min(B.braises.length, voulu);
  }
  function braise(partout = false) {
    const c = PALETTES[B.phase] || PALETTES.inscriptions;
    return { x: hasard(0, B.w), y: partout ? hasard(0, B.h) : B.h + hasard(0, 20), vx: hasard(-8, 8), vy: -hasard(14, 46), r: hasard(0.8, 2.4), vie: hasard(0, 1), c: choix(c), p: hasard(0, 6.28) };
  }
  function lancerIntro() {
    const el = B.el;
    if (!el) return;
    ecrireSession(`br-intro-${B.phase}`, "1");
    el.classList.remove("br-attente");
    el.classList.add("br-entree");
    B.intro = performance.now();
    B.ouverture = 0;
    plus_tard(() => { B.flash = 0.75; onde(B.w / 2, B.h / 2, 1.4); gerbe(B.w / 2, B.h / 2, telephone() ? 26 : 50); }, 160);
    plus_tard(() => el.classList.remove("br-entree"), 2600);
    boucle();
  }
  function onde(x, y, force = 1) { B.anneaux.push({ x, y, r: 6, v: 520 * force, vie: 1, l: 4 * force }); }
  function gerbe(x, y, n) {
    const c = PALETTES[B.phase] || PALETTES.inscriptions;
    for (let i = 0; i < n; i++) {
      const a = hasard(0, Math.PI * 2), v = hasard(80, 360);
      B.feux.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vie: 1, duree: hasard(0.6, 1.2), c: choix(c), r: hasard(1, 2.6), g: 160 });
    }
  }
  // un arc électrique qui part de la faille
  function arc(depuis = null, longueur = hasard(40, 130)) {
    const pts = cheminFaille();
    const o = depuis || pts[Math.floor(hasard(2, pts.length - 2))];
    const sens = Math.random() < 0.5 ? -1 : 1;
    let x = o.x, y = o.y;
    const l = [{ x, y }];
    const n = Math.round(longueur / 12);
    const dir = hasard(-0.9, 0.9);
    for (let i = 0; i < n; i++) { x += dir * 12 + hasard(-9, 9); y += sens * hasard(6, 13); l.push({ x, y }); }
    B.arcs.push({ l, vie: 1, duree: hasard(0.16, 0.34), c: choix(PALETTES[B.phase] || PALETTES.inscriptions) });
  }
  // la foudre (dernière soirée) : du haut du bandeau jusqu'à la faille
  function foudre() {
    const x0 = hasard(B.w * 0.1, B.w * 0.9);
    const cible = cheminFaille().reduce((m, p) => (Math.abs(p.x - x0) < Math.abs(m.x - x0) ? p : m));
    const l = [{ x: x0 + hasard(-30, 30), y: -4 }];
    const n = 9;
    for (let i = 1; i <= n; i++) l.push({ x: l[0].x + (cible.x - l[0].x) * (i / n) + (i < n ? hasard(-22, 22) : 0), y: (cible.y + 4) * (i / n) });
    B.foudre.push({ l, vie: 1, duree: 0.42 });
    B.flash = Math.max(B.flash, 0.4);
    onde(cible.x, cible.y, 0.6);
    for (let i = 0; i < 2; i++) arc(cible, hasard(60, 140));
    B.el?.classList.remove("br-secousse");
    void B.el?.offsetWidth;
    B.el?.classList.add("br-secousse");
  }
  // le chemin de la faille à cet instant (elle frémit ; pendant l'ouverture, elle part du milieu vers les bords)
  function cheminFaille(t = performance.now() / 1000) {
    const mx = B.souris.cx * 10, my = B.souris.cy * 6;
    const amp = 0.25 + 0.75 * B.ouverture;
    return B.base.map((p) => ({ x: p.x + mx, y: B.h * 0.5 + (p.y - B.h * 0.5) * amp + Math.sin(t * 3.1 + p.p) * 1.8 + my }));
  }
  function boucle() {
    const marche = B.visible && !document.hidden && B.ctx;
    if (marche && !raf) { avantT = performance.now(); raf = requestAnimationFrame(image); }
    if (!marche && raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  function image(t) {
    raf = 0;
    const dt = Math.min(0.05, (t - avantT) / 1000);
    avantT = t;
    dessiner(t, dt);
    boucle();
  }
  function dessiner(t, dt) {
    const g = B.ctx, w = B.w, h = B.h;
    if (!g) return;
    const hum = HUMEURS[B.phase] || HUMEURS.inscriptions;
    const pal = PALETTES[B.phase] || PALETTES.inscriptions;
    const s = t / 1000;
    B.souris.cx += (B.souris.x - B.souris.cx) * Math.min(1, dt * 4);
    B.souris.cy += (B.souris.y - B.souris.cy) * Math.min(1, dt * 4);
    if (B.intro) {
      const e = (t - B.intro) / 1100;
      B.ouverture = doux(e);
      if (e >= 1) B.intro = 0;
    }
    g.setTransform(B.dpr, 0, 0, B.dpr, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.clearRect(0, 0, w, h);
    // le fond : la lueur de la faille, qui respire
    const respire = 0.75 + 0.25 * Math.sin(s * (B.phase === "derniere" ? 5 : 1.6));
    const lueur = g.createRadialGradient(w / 2 + B.souris.cx * 18, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.62);
    lueur.addColorStop(0, hexA(pal[0], 0.38 * B.ouverture * respire));
    lueur.addColorStop(0.45, hexA(pal[1], 0.13 * B.ouverture));
    lueur.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = lueur;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "lighter";
    // les rayons, qui tournent lentement depuis le cœur de la faille
    const nr = telephone() ? 4 : 7;
    for (let i = 0; i < nr; i++) {
      const a = s * 0.12 + (i / nr) * Math.PI * 2;
      const L = Math.max(w, h);
      g.beginPath();
      g.moveTo(w / 2, h / 2);
      g.lineTo(w / 2 + Math.cos(a - 0.05) * L, h / 2 + Math.sin(a - 0.05) * L);
      g.lineTo(w / 2 + Math.cos(a + 0.05) * L, h / 2 + Math.sin(a + 0.05) * L);
      g.closePath();
      g.fillStyle = hexA(pal[i % 2 ? 1 : 2], 0.035 * B.ouverture);
      g.fill();
    }
    // la faille : trois passes (halo, lueur, cœur blanc) ; pendant l'ouverture, seulement autour du milieu
    const pts = cheminFaille(s);
    const demi = (w / 2) * B.ouverture + 2;
    const visibles = pts.filter((p) => Math.abs(p.x - w / 2) <= demi);
    if (visibles.length > 1) {
      for (const [lw, a, c] of [[26 * B.ouverture + 6, 0.08, pal[0]], [9, 0.35, pal[1]], [3.2, 0.7, pal[2]], [1.4, 0.95, "#ffffff"]]) {
        g.beginPath();
        visibles.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
        g.lineWidth = lw * (lw > 5 ? respire : 1);
        g.lineJoin = "round";
        g.lineCap = "round";
        g.strokeStyle = hexA(c, a);
        g.stroke();
      }
      // les bouts de la faille qui crépitent pendant l'ouverture
      if (B.ouverture < 1) {
        for (const p of [visibles[0], visibles[visibles.length - 1]]) {
          g.beginPath(); g.arc(p.x, p.y, 7 + Math.random() * 5, 0, Math.PI * 2);
          g.fillStyle = hexA("#ffffff", 0.6); g.fill();
        }
      }
    }
    // les arcs
    if (B.ouverture > 0.6 && s > B.prochainArc) { arc(); B.prochainArc = s + hasard(0.4, 1.6) / hum.arcs; }
    for (const a of B.arcs) {
      a.vie -= dt / a.duree;
      g.beginPath();
      a.l.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      g.lineWidth = 2.2;
      g.strokeStyle = hexA(a.c, Math.max(0, a.vie));
      g.stroke();
      g.lineWidth = 0.9;
      g.strokeStyle = hexA("#ffffff", Math.max(0, a.vie) * 0.9);
      g.stroke();
    }
    B.arcs = B.arcs.filter((a) => a.vie > 0);
    // la foudre de la dernière soirée
    if (hum.foudre && B.ouverture > 0.9 && s > B.prochaineFoudre) { foudre(); B.prochaineFoudre = s + hasard(2.2, 5); }
    for (const f of B.foudre) {
      f.vie -= dt / f.duree;
      const a = Math.max(0, f.vie) * (Math.random() < 0.25 ? 0.4 : 1);
      g.beginPath();
      f.l.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      g.lineWidth = 7; g.strokeStyle = hexA(pal[1], a * 0.35); g.stroke();
      g.lineWidth = 2.4; g.strokeStyle = hexA("#ffffff", a); g.stroke();
    }
    B.foudre = B.foudre.filter((f) => f.vie > 0);
    // le comptage : un balayage qui monte et descend
    if (B.phase === "comptage") {
      B.balayage = (B.balayage + dt * 0.35) % 2;
      const y = (B.balayage < 1 ? B.balayage : 2 - B.balayage) * h;
      const bande = g.createLinearGradient(0, y - 30, 0, y + 30);
      bande.addColorStop(0, "rgba(95,208,216,0)"); bande.addColorStop(0.5, "rgba(95,208,216,0.22)"); bande.addColorStop(1, "rgba(95,208,216,0)");
      g.fillStyle = bande; g.fillRect(0, y - 30, w, 60);
    }
    // le podium : des feux d'artifice derrière le titre
    if (B.phase === "fini" && s > B.prochainFeu) {
      const x = hasard(w * 0.12, w * 0.88), y = hasard(h * 0.12, h * 0.45);
      gerbe(x, y, telephone() ? 22 : 40);
      onde(x, y, 0.35);
      B.prochainFeu = s + hasard(1.2, 2.6);
    }
    // les braises
    for (const b of B.braises) {
      b.x += (b.vx + Math.sin(s * 1.3 + b.p) * 10 + B.souris.cx * 6) * dt * hum.braises;
      b.y += b.vy * dt * hum.braises;
      b.vie += dt * 0.25;
      if (b.y < -10 || b.x < -20 || b.x > w + 20) Object.assign(b, braise());
      const a = 0.35 + 0.45 * Math.abs(Math.sin(s * 2.4 + b.p));
      g.beginPath(); g.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      g.fillStyle = hexA(b.c, a * B.ouverture + 0.08); g.fill();
    }
    // les étincelles (gerbes, feux d'artifice)
    for (const f of B.feux) {
      f.vie -= dt / f.duree;
      f.vx *= 1 - dt * 1.6; f.vy = f.vy * (1 - dt * 1.6) + f.g * dt;
      f.x += f.vx * dt; f.y += f.vy * dt;
      g.beginPath(); g.arc(f.x, f.y, f.r * (0.4 + f.vie * 0.6), 0, Math.PI * 2);
      g.fillStyle = hexA(f.c, Math.max(0, f.vie)); g.fill();
    }
    B.feux = B.feux.filter((f) => f.vie > 0);
    // les ondes de choc
    for (const o of B.anneaux) {
      o.vie -= dt * 1.4; o.r += o.v * dt;
      g.beginPath(); g.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      g.lineWidth = o.l * Math.max(0, o.vie); g.strokeStyle = hexA("#ffffff", Math.max(0, o.vie) * 0.7); g.stroke();
    }
    B.anneaux = B.anneaux.filter((o) => o.vie > 0);
    // l'éclair blanc
    if (B.flash > 0) {
      g.globalCompositeOperation = "source-over";
      g.fillStyle = `rgba(255,255,255,${(B.flash * 0.55).toFixed(3)})`;
      g.fillRect(0, 0, w, h);
      B.flash = Math.max(0, B.flash - dt * 2.4);
    }
  }

  // ---------- le compte à rebours ----------
  let tic = 0;
  function battre() {
    tic = 0;
    for (const c of document.querySelectorAll(".br-rebours[data-cible]")) majCompte(c);
    tic = setTimeout(battre, 1000 - (Date.now() % 1000) + 5);
  }
  function majCompte(c) {
    const cible = Number(c.dataset.cible) || 0;
    const r = Math.max(0, cible - Date.now());
    const v = { j: Math.floor(r / 86_400_000), h: Math.floor(r / 3_600_000) % 24, m: Math.floor(r / 60_000) % 60, s: Math.floor(r / 1000) % 60 };
    for (const u of ["j", "h", "m", "s"]) {
      const gpe = c.querySelector(`.br-groupe[data-u="${u}"]`);
      if (!gpe) continue;
      if (u === "j") {
        gpe.hidden = !v.j;
        const nom = gpe.querySelector("small");
        if (nom) nom.textContent = v.j > 1 ? "jours" : "jour";
      }
      const txt = String(v[u]).padStart(2, "0");
      const zone = gpe.querySelector(".br-chiffres");
      while (zone.children.length < txt.length) zone.prepend(Object.assign(document.createElement("span"), { className: "br-chiffre", textContent: "0" }));
      while (zone.children.length > txt.length) zone.firstElementChild.remove();
      [...zone.children].forEach((d, i) => {
        if (d.textContent === txt[i]) return;
        d.textContent = txt[i];
        d.classList.remove("bascule");
        void d.offsetWidth;
        d.classList.add("bascule");
      });
    }
    c.classList.toggle("br-urgent", r > 0 && r <= 60_000);
    // les 10 dernières secondes : une onde à chaque seconde ; à zéro, l'explosion
    if (r > 0 && r <= 10_000 && B.el?.contains(c)) { onde(B.w / 2, B.h / 2, 0.5); B.el.classList.remove("br-secousse"); void B.el.offsetWidth; B.el.classList.add("br-secousse"); }
    if (r === 0 && !memo.zeros.has(cible) && Date.now() - cible < 5000) {
      memo.zeros.add(cible);
      boum(c);
      zero?.();
    }
  }
  function boum(c) {
    if (B.el?.contains(c)) {
      B.flash = 1;
      onde(B.w / 2, B.h / 2, 2);
      gerbe(B.w / 2, B.h / 2, telephone() ? 40 : 80);
    }
    const r = c.getBoundingClientRect();
    fete(r.left + r.width / 2, r.top + r.height / 2, PALETTES[B.phase] || PALETTES.inscriptions, { n: telephone() ? 120 : 220, feux: 3 });
  }

  // ---------- les confettis et les feux d'artifice, par-dessus la page ----------
  const F = { canvas: null, ctx: null, p: [], raf: 0, t: 0, attente: 0 };
  function fete(x, y, couleurs, { n = 140, feux = 0, pluie = false } = {}) {
    if (!F.canvas) {
      F.canvas = Object.assign(document.createElement("canvas"), { className: "br-fete" });
      F.canvas.setAttribute("aria-hidden", "true");
      document.body.append(F.canvas);
      F.ctx = F.canvas.getContext("2d");
    }
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    F.canvas.width = Math.round(innerWidth * dpr);
    F.canvas.height = Math.round(innerHeight * dpr);
    F.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const c = couleurs?.length ? [...couleurs, "#ffffff"] : PALETTES.inscriptions;
    n = Math.min(n, telephone() ? 140 : 260);
    for (let i = 0; i < n; i++) {
      const a = pluie ? hasard(Math.PI * 0.35, Math.PI * 0.65) : hasard(-Math.PI, 0) + hasard(-0.4, 0.4);
      const v = pluie ? hasard(40, 160) : hasard(260, 820);
      F.p.push({ type: "confetti", x: pluie ? hasard(0, innerWidth) : x, y: pluie ? hasard(-innerHeight * 0.4, 0) : y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: hasard(6, 11), h: hasard(3, 6), r: hasard(0, 6.28), vr: hasard(-9, 9), c: choix(c), vie: hasard(2.4, 3.6) });
    }
    for (let k = 0; k < feux; k++) {
      F.attente++;
      plus_tard(() => {
        F.attente--;
        if (!F.ctx) return;
        const fx = x + hasard(-200, 200), fy = Math.max(60, y - hasard(80, 260));
        for (let i = 0; i < (telephone() ? 30 : 56); i++) {
          const a = (i / 56) * Math.PI * 2 + hasard(-0.05, 0.05), v = hasard(140, 330);
          F.p.push({ type: "feu", x: fx, y: fy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, c: choix(c), vie: hasard(1, 1.5), r: hasard(1.4, 2.6), px: fx, py: fy });
        }
      }, k * 380);
    }
    if (!F.raf) { F.t = performance.now(); F.raf = requestAnimationFrame(imageFete); }
  }
  function imageFete(t) {
    const dt = Math.min(0.05, (t - F.t) / 1000);
    F.t = t;
    const g = F.ctx;
    g.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of F.p) {
      p.vie -= dt;
      if (p.type === "confetti") {
        p.vx *= 1 - dt * 1.9; p.vy = p.vy * (1 - dt * 1.9) + 900 * dt * 0.55;
        p.x += (p.vx + Math.sin(t / 220 + p.r) * 30) * dt; p.y += p.vy * dt; p.r += p.vr * dt;
        g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.scale(1, Math.cos(t / 160 + p.r));
        g.globalAlpha = Math.min(1, p.vie); g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore();
      } else {
        p.px = p.x; p.py = p.y;
        p.vx *= 1 - dt * 1.2; p.vy = p.vy * (1 - dt * 1.2) + 120 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        g.globalAlpha = Math.max(0, Math.min(1, p.vie));
        g.strokeStyle = p.c; g.lineWidth = p.r; g.lineCap = "round";
        g.beginPath(); g.moveTo(p.px - p.vx * 0.04, p.py - p.vy * 0.04); g.lineTo(p.x, p.y); g.stroke();
      }
    }
    g.globalAlpha = 1;
    F.p = F.p.filter((p) => p.vie > 0 && p.y < innerHeight + 40);
    if (F.p.length || F.attente) F.raf = requestAnimationFrame(imageFete);
    else { F.raf = 0; F.canvas?.remove(); F.canvas = null; F.ctx = null; }
  }

  // ---------- le score ----------
  const attendreVue = (el, f, seuil = 0.25) => {
    const o = new IntersectionObserver((l) => { if (l.some((e) => e.isIntersecting)) { o.disconnect(); f(); } }, { threshold: seuil });
    o.observe(el);
  };
  function compter(b, de, a, duree = 1300) {
    const t0 = performance.now();
    const f = (t) => {
      const e = doux((t - t0) / duree);
      b.textContent = `${NOMBRE.format(Math.round(de + (a - de) * e))} pts`;
      if (e < 1) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  }
  function remplir(barre, de, a, delai = 0) {
    if (!barre) return;
    barre.style.transition = "none";
    barre.style.width = `${de}%`;
    void barre.offsetWidth;
    plus_tard(() => { barre.style.transition = ""; barre.style.width = `${a}%`; }, delai + 20);
  }
  function flotteur(ligne, n) {
    const f = Object.assign(document.createElement("span"), { className: "br-flotteur", textContent: `+${NOMBRE.format(n)}` });
    f.setAttribute("aria-hidden", "true");
    ligne.append(f);
    plus_tard(() => f.remove(), 1800);
  }
  function etincelles(ligne, barre) {
    if (!barre) return;
    const z = Object.assign(document.createElement("span"), { className: "br-etincelles" });
    z.setAttribute("aria-hidden", "true");
    z.style.left = `${barre.offsetLeft + barre.offsetWidth}px`;
    z.style.top = `${barre.offsetTop + barre.offsetHeight / 2}px`;
    for (let i = 0; i < 9; i++) {
      const a = hasard(-Math.PI * 0.8, Math.PI * 0.8);
      const i_ = Object.assign(document.createElement("i"), {});
      i_.style.setProperty("--x", `${Math.round(Math.cos(a) * hasard(18, 46))}px`);
      i_.style.setProperty("--y", `${Math.round(Math.sin(a) * hasard(14, 36))}px`);
      z.append(i_);
    }
    barre.parentElement.parentElement.append(z);
    plus_tard(() => z.remove(), 900);
  }
  function bandeauDepasse(zone, texte) {
    const liste = zone.querySelector(".br-scores");
    if (!liste) return;
    liste.querySelector(".br-depasse")?.remove();
    const b = Object.assign(document.createElement("p"), { className: "br-depasse", textContent: texte });
    b.setAttribute("role", "status");
    liste.prepend(b);
    plus_tard(() => b.classList.add("part"), 4200);
    plus_tard(() => b.remove(), 4800);
  }
  function animerScores(zone, avant) {
    const liste = zone.querySelector(".br-liste");
    const lignes = [...zone.querySelectorAll(".br-liste [data-br-id]")];
    if (!liste || !lignes.length) return;
    const premiere = memo.points.size === 0;
    // les commus qui changent de place glissent jusqu'à la nouvelle
    if (avant?.places) {
      const haut = liste.getBoundingClientRect().top;
      for (const l of lignes) {
        const y0 = avant.places.get(l.dataset.brId);
        if (y0 === undefined) continue;
        const dy = y0 - (l.getBoundingClientRect().top - haut);
        if (Math.abs(dy) > 2) l.animate([{ transform: `translateY(${dy}px)`, zIndex: 2 }, { transform: "none", zIndex: 2 }], { duration: 800, easing: "cubic-bezier(.2,.8,.2,1)" });
      }
    }
    const ordre = [];
    lignes.forEach((l, k) => {
      const id = l.dataset.brId;
      const b = l.querySelector("[data-points]");
      const barre = l.querySelector(".br-barre i");
      if (!b) return;
      const v = Number(b.dataset.points) || 0;
      const largeur = parseFloat(barre?.style.width) || 0;
      const ancien = memo.points.get(id), ancienneL = memo.largeurs.get(id) ?? 0;
      memo.points.set(id, v);
      memo.largeurs.set(id, largeur);
      ordre.push({ id, nom: l.dataset.brNom || id, v });
      if (ancien === undefined) {
        if (!premiere) return;
        // la première fois : les barres se remplissent et les points montent quand le score arrive à l'écran
        b.textContent = "0 pts";
        if (barre) { barre.style.transition = "none"; barre.style.width = "0%"; }
        attendreVue(liste, () => { remplir(barre, 0, largeur, k * 140); plus_tard(() => compter(b, 0, v), k * 140); });
        return;
      }
      if (ancien !== v || ancienneL !== largeur) {
        remplir(barre, ancienneL, largeur);
        compter(b, ancien, v, 1000);
        if (v > ancien) { flotteur(l, v - ancien); plus_tard(() => etincelles(l, barre), 700); }
      }
    });
    // quelqu'un passe devant ?
    const avantOrdre = memo.ordre;
    memo.ordre = ordre.map((x) => x.id);
    if (premiere || avantOrdre.length < 2) return;
    for (let i = 0; i < ordre.length; i++) {
      const x = ordre[i];
      const iAvant = avantOrdre.indexOf(x.id);
      if (iAvant <= i || x.v <= 0) continue;
      const depasse = ordre.slice(i + 1).find((y) => avantOrdre.indexOf(y.id) < iAvant && avantOrdre.indexOf(y.id) >= i);
      if (!depasse) continue;
      bandeauDepasse(zone, i === 0 ? `👑 ${x.nom} prend la tête !` : `⚔️ ${x.nom} passe devant ${depasse.nom} !`);
      const l = lignes.find((y) => y.dataset.brId === x.id);
      if (l) { l.classList.remove("br-eclat"); void l.offsetWidth; l.classList.add("br-eclat"); }
      break;
    }
  }

  // ---------- le podium ----------
  function jouerPodium(ol) {
    if (!ol?.isConnected) return;
    const cle = `br-podium-${ol.dataset.brPodium}`;
    ol.classList.remove("pas-1", "pas-2", "pas-3", "fige");
    ol.classList.add("anim");
    void ol.offsetWidth;
    plus_tard(() => ol.classList.add("pas-3"), 250);
    plus_tard(() => ol.classList.add("pas-2"), 1150);
    plus_tard(() => ol.classList.add("pas-1"), 2050);
    plus_tard(() => {
      const m = ol.querySelector(".place-1 .br-drapeau") || ol;
      const r = m.getBoundingClientRect();
      const c = couleursDe((ol.dataset.brCouleurs || "").split("|")[0]);
      fete(r.left + r.width / 2, r.top + r.height / 2, c.length ? [...c, "#ffd36b"] : PALETTES.fini, { n: telephone() ? 120 : 220, feux: 4 });
    }, 2600);
    plus_tard(() => fete(0, 0, PALETTES.fini, { n: telephone() ? 50 : 110, pluie: true }), 3300);
    plus_tard(() => { ol.classList.add("fige"); ecrire(cle, "1"); }, 4300);
  }
  function podium(zone) {
    const ol = zone.querySelector("[data-br-podium]");
    if (!ol) return;
    if (lire(`br-podium-${ol.dataset.brPodium}`)) { ol.classList.add("fige"); return; }
    ol.classList.add("anim");
    attendreVue(ol, () => jouerPodium(ol), 0.4);
  }

  // ---------- son inscription ----------
  function inscription(zone) {
    const p = zone.querySelector(".br-inscrit");
    if (!p) return;
    p.classList.add("br-tampon");
    const r = p.getBoundingClientRect();
    fete(r.left + r.width / 2, r.top + r.height / 2, couleursDe(p.getAttribute("style")), { n: telephone() ? 90 : 160, feux: 1 });
  }

  return {
    // avant que site.js refasse la carte : où était chaque commu
    avant(zone) {
      const liste = zone.querySelector(".br-liste");
      if (!liste) return null;
      const haut = liste.getBoundingClientRect().top;
      return { places: new Map([...liste.querySelectorAll("[data-br-id]")].map((l) => [l.dataset.brId, l.getBoundingClientRect().top - haut])) };
    },
    // après : on branche le bandeau et on anime ce qui a changé
    apres(zone, s, { avant = null, fete: f = null } = {}) {
      const b = zone.querySelector(".br-banniere");
      if (b) brancherBandeau(b);
      if (!tic) battre();
      animerScores(zone, avant);
      if (s?.phase === "fini") podium(zone);
      if (f === "inscription") inscription(zone);
      for (const j of zone.querySelectorAll(".br-jeu")) j.classList.add("br-brille");
    },
    rejouerPodium() { jouerPodium(document.querySelector("[data-br-podium]")); },
    fete,
  };
}

// « #ff4f9a » + 0.4 → « rgba(255,79,154,0.4) »
function hexA(hex, a) {
  const h = String(hex).replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}
