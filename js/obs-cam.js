// LES EFFETS DE CAM de la page des effets (js/obs-effets.js) : ils bougent la vraie cam (et les widgets) dans OBS par la régie
// (js/obs-regie.js), et dessinent par-dessus ce qui va avec. Ils agissent sur la scène en direct : la scène principale (la
// grande cam) comme la scène jeu (la petite cam dans un coin). Tout est remis à sa place à la fin (même après un rechargement).
//   • le séisme (5 s) : tout l'écran tremble (le jeu aussi), de la poussière tombe, un grondement ;
//   • le kraken (7,5 s) : un tentacule géant sort de l'eau, s'enroule autour de la cam, l'emporte sous l'eau, puis la recrache ;
//   • l'écran de veille (30 s) : la cam rapetisse et rebondit partout, change de couleur à chaque bord, « COIN ! » dans un coin ;
//   • le dossier (10 s) : la cam laisse apparaître une photo rangée sur le PC du streamer (lue par OBS, jamais sur le site) ;
//   • le chat prend ta cam (1 min) : « !haut », « !bas », « !gauche », « !droite » la déplacent ;
//   • le chaos total (15 s) : séisme, cam à l'envers, pluie d'emotes, sirène ;
//   • Mini-Liliano (1 min) : la cam devient minuscule dans un coin, sous une loupe ;
//   • la prison (1 min, sans la régie aussi) : des barreaux tombent sur la cam ; « !liberer » 50 fois la libère ;
//   • le replay : les dernières secondes au ralenti, sous un cadre « REPLAY » ; la fausse pub (« !pub ») ;
//   • la voix d'hélium (30 s) et les sons flippants (des fichiers du PC) : par la régie.
// Les dessins (tentacule, eau, barreaux, loupe, ballon…) et les sons (son/effets/) ont été faits pour Barhaw, libres de droits.
import { boite, placeAutour } from "./obs-regie.js";
import { pleuvoir } from "./obs-emotes.js";

const CAPTURE = Boolean(window.__capture);
const ENCRE = "#12050d";
const el = (balise, classe, ...enfants) => {
  const n = document.createElement(balise);
  if (classe) n.className = classe;
  for (const e of enfants) if (e !== null && e !== undefined && e !== false) n.append(e);
  return n;
};
const dessin = (classe, svg) => { const n = el("div", classe); n.innerHTML = svg; return n; };
function anime(n, images, options) {
  if (!n || typeof n.animate !== "function") return null;
  const a = n.animate(images, options);
  if (CAPTURE) { a.pause(); a.__t0 = performance.now(); }
  return a;
}
const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
const borne = (x, a, b) => Math.max(a, Math.min(b, x));
const doux = (x) => { const u = borne(x, 0, 1); return u * u * (3 - 2 * u); };
const versBas = (x) => { const u = borne(x, 0, 1); return u * u * u; };
const versHaut = (x) => { const u = borne(x, 0, 1); return 1 - (1 - u) ** 3; };
const propre = (t) => String(t || "").replace(/[\u0000-\u001f\u007f<>`@]/g, "").trim().slice(0, 25);
function hasardDe(graine) {
  let s = graine >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
}
const erreur = (code, texte = code) => Object.assign(new Error(texte), { code });
const minutes = (ms) => `${Math.floor(ms / 60000)}:${String(Math.ceil((ms % 60000) / 1000) % 60).padStart(2, "0")}`;

// ---------- les dessins ----------
// le tentacule : une ligne centrale qui ondule, une épaisseur qui diminue, des ventouses du côté intérieur, le bout recourbé
function svgTentacule(graine = 1) {
  const h = hasardDe(graine);
  const ondule = 0.8 + h() * 0.5;
  const C = (t) => ({ x: 120 + 46 * Math.sin(t * Math.PI * 1.1 * ondule) - 20 * t + (t > 0.78 ? 95 * Math.sin(((t - 0.78) / 0.22) * Math.PI * 0.9) : 0), y: 890 - 850 * t + (t > 0.9 ? 60 * ((t - 0.9) / 0.1) ** 2 : 0) });
  const W = (t) => 62 * (1 - t) ** 0.85 + 5;
  const N = 56;
  const gauche = [];
  const droite = [];
  const ventouses = [];
  for (let k = 0; k <= N; k++) {
    const t = k / N;
    const p = C(t);
    const q = C(Math.min(1, t + 0.01));
    const r = C(Math.max(0, t - 0.01));
    let nx = -(q.y - r.y);
    let ny = q.x - r.x;
    const l = Math.hypot(nx, ny) || 1;
    nx /= l; ny /= l;
    const w = W(t);
    gauche.push(`${(p.x + nx * w).toFixed(1)},${(p.y + ny * w).toFixed(1)}`);
    droite.push(`${(p.x - nx * w).toFixed(1)},${(p.y - ny * w).toFixed(1)}`);
    if (k % 3 === 1 && t < 0.9) ventouses.push({ x: p.x + nx * w * 0.5, y: p.y + ny * w * 0.5, r: w * 0.3 });
  }
  const corps = `M${droite[0]} L${droite.join(" L")} L${gauche.slice().reverse().join(" L")} Z`;
  const reflet = `M${droite.slice(4, 44).map((x) => { const [a, b] = x.split(",").map(Number); return `${(a + 13).toFixed(1)},${b}`; }).join(" L")}`;
  return `<svg viewBox="0 0 300 900" aria-hidden="true"><defs><linearGradient id="fx-tent" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3f1585"/><stop offset=".35" stop-color="#9b4dff"/><stop offset=".7" stop-color="#7a35e0"/><stop offset="1" stop-color="#3f1585"/></linearGradient></defs>
    <path d="${corps}" fill="url(#fx-tent)" stroke="${ENCRE}" stroke-width="7" stroke-linejoin="round"/>
    <path d="${reflet}" fill="none" stroke="#e2c6ff" stroke-opacity=".55" stroke-width="7" stroke-linecap="round"/>
    ${ventouses.map((v) => `<circle cx="${v.x.toFixed(1)}" cy="${v.y.toFixed(1)}" r="${v.r.toFixed(1)}" fill="#ffb3d9" stroke="${ENCRE}" stroke-width="3.5"/><circle cx="${v.x.toFixed(1)}" cy="${v.y.toFixed(1)}" r="${(v.r * 0.5).toFixed(1)}" fill="#ff6fae"/>`).join("")}
  </svg>`;
}
// une boucle de tentacule qui s'enroule autour de la cam (une bande courbe avec des ventouses)
const SVG_BOUCLE = `<svg viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="fx-boucle" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b07bff"/><stop offset=".55" stop-color="#7a35e0"/><stop offset="1" stop-color="#3f1585"/></linearGradient></defs>
  <path d="M-10,70 Q500,10 1010,70 L1010,150 Q500,95 -10,150 Z" fill="url(#fx-boucle)" stroke="${ENCRE}" stroke-width="8" stroke-linejoin="round"/>
  <path d="M40,82 Q500,30 960,82" fill="none" stroke="#e2c6ff" stroke-opacity=".55" stroke-width="9" stroke-linecap="round"/>
  ${Array.from({ length: 9 }, (_, i) => { const x = 70 + i * 107; const y = 134 - 26 * Math.sin((x / 1000) * Math.PI); return `<ellipse cx="${x}" cy="${y.toFixed(0)}" rx="26" ry="14" fill="#ffb3d9" stroke="${ENCRE}" stroke-width="5"/>`; }).join("")}
</svg>`;
// l'eau : des vagues qui se répètent tous les 480 (elles défilent sans couture)
const SVG_EAU = (() => {
  const vague = (y, amp, n) => { let d = `M0,${y}`; for (let i = 0; i < n; i++) d += ` C${i * 480 + 160},${y - amp} ${i * 480 + 320},${y + amp} ${(i + 1) * 480},${y}`; return d; };
  return `<svg viewBox="0 0 2880 300" preserveAspectRatio="none" aria-hidden="true">
  <path d="${vague(70, 50, 6)} L2880,300 L0,300 Z" fill="#1f5fc4" fill-opacity=".94" stroke="${ENCRE}" stroke-width="6"/>
  <path d="${vague(112, 40, 6)} L2880,300 L0,300 Z" fill="#2de2e6" fill-opacity=".3"/>
  ${Array.from({ length: 6 }, (_, i) => `<path d="M${i * 480 + 50},64 C${i * 480 + 100},48 ${i * 480 + 150},52 ${i * 480 + 200},60" stroke="#fff" stroke-width="8" stroke-linecap="round" fill="none" opacity=".8"/>`).join("")}
</svg>`;
})();
const SVG_LOUPE = `<svg viewBox="0 0 400 400" aria-hidden="true"><defs><radialGradient id="fx-verre" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".6" stop-color="#bfe9ff" stop-opacity=".1"/><stop offset="1" stop-color="#7fc8ff" stop-opacity=".2"/></radialGradient></defs>
  <path d="M262,262 L372,372" stroke="${ENCRE}" stroke-width="54" stroke-linecap="round"/><path d="M262,262 L372,372" stroke="#9b4dff" stroke-width="36" stroke-linecap="round"/><path d="M276,270 L352,346" stroke="#d1a6ff" stroke-width="9" stroke-linecap="round" opacity=".8"/>
  <circle cx="160" cy="160" r="128" fill="url(#fx-verre)" stroke="${ENCRE}" stroke-width="30"/><circle cx="160" cy="160" r="128" fill="none" stroke="#ffcf5c" stroke-width="16"/>
  <path d="M86,118 A88,88 0 0 1 140,72" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" opacity=".85"/>
</svg>`;
const SVG_BALLON = `<svg viewBox="0 0 120 220" aria-hidden="true"><path d="M60,8 C102,8 114,48 108,78 C100,118 74,134 60,138 C46,134 20,118 12,78 C6,48 18,8 60,8 Z" fill="#ff8fcb" stroke="${ENCRE}" stroke-width="6"/><path d="M52,138 L68,138 L60,150 Z" fill="#ff4f9a" stroke="${ENCRE}" stroke-width="4" stroke-linejoin="round"/><path d="M60,150 C48,170 74,186 58,214" fill="none" stroke="${ENCRE}" stroke-width="4"/><ellipse cx="40" cy="44" rx="11" ry="20" fill="#fff" opacity=".7" transform="rotate(25 40 44)"/></svg>`;
function svgBarreaux(n = 9) {
  const barres = Array.from({ length: n }, (_, i) => { const x = 40 + (i * 920) / (n - 1); return `<rect x="${(x - 16).toFixed(0)}" y="-10" width="32" height="1020" rx="14" fill="url(#fx-metal)" stroke="${ENCRE}" stroke-width="7"/>`; }).join("");
  return `<svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="fx-metal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4a4458"/><stop offset=".35" stop-color="#d9d4e6"/><stop offset=".55" stop-color="#8a8399"/><stop offset="1" stop-color="#3a3446"/></linearGradient></defs>
    ${barres}<rect x="-10" y="70" width="1020" height="40" rx="14" fill="url(#fx-metal)" stroke="${ENCRE}" stroke-width="7"/><rect x="-10" y="880" width="1020" height="40" rx="14" fill="url(#fx-metal)" stroke="${ENCRE}" stroke-width="7"/></svg>`;
}

export function creerEffetsCam({ regie, sonner = () => null, pseudo = true, dossiers = () => "", sons = () => "", bot = { controle: () => {}, prison: () => {} } } = {}) {
  const pret = () => Boolean(regie?.pret?.());
  const exigerRegie = () => { if (!pret()) throw erreur("obs", "la régie n'est pas reliée à OBS"); };

  // ---------- ce qui sert à tous ----------
  function couche(classe = "") { const n = el("div", `fx ${classe}`); document.body.append(n); return n; }
  function bandeau(parent, titre, par, duree = 4200) {
    const nom = propre(par);
    const b = el("div", "fx-bandeau", el("b", "", titre), pseudo && nom ? el("span", "", ` · par ${nom}`) : null);
    parent.append(b);
    anime(b, [
      { offset: 0, transform: "translate(-50%, -3rem)", opacity: 0 },
      { offset: 0.1, transform: "translate(-50%, 0)", opacity: 1 },
      { offset: 0.85, transform: "translate(-50%, 0)", opacity: 1 },
      { offset: 1, transform: "translate(-50%, -2rem)", opacity: 0 },
    ], { duration: duree, easing: "ease-out", fill: "forwards" });
    return b;
  }
  // la cam de la scène en direct, et sa boîte à l'écran en % (sans la régie : tout l'écran)
  async function laCam() {
    if (!pret()) return null;
    const cam = await regie.camera().catch(() => null);
    if (!cam) return null;
    const { base, boite: b } = cam;
    return { cam, base, b, pct: { x: ((b.cx - b.l / 2) / base.l) * 100, y: ((b.cy - b.h / 2) / base.h) * 100, l: (b.l / base.l) * 100, h: (b.h / base.h) * 100 } };
  }
  async function exigerCam() {
    exigerRegie();
    const c = await laCam();
    if (!c) throw erreur("cam");
    return c;
  }
  const placer = (n, p) => { n.style.left = `${p.x}%`; n.style.top = `${p.y}%`; n.style.width = `${p.l}%`; n.style.height = `${p.h}%`; };
  function poussiere(parent, nb = 46, duree = 4600, graine = 7) {
    const h = hasardDe(graine);
    for (let i = 0; i < nb; i++) {
      const p = el("i", "fx-grain");
      p.style.left = `${h() * 100}%`;
      p.style.width = p.style.height = `${0.5 + h() * 1.4}rem`;
      p.style.background = ["#8a7560", "#b8a38a", "#5f5040", "#d7c6ad"][i % 4];
      parent.append(p);
      anime(p, [{ transform: "translateY(-4vh)", opacity: 0 }, { transform: "translateY(20vh)", opacity: 0.9, offset: 0.2 }, { transform: `translate(${((h() - 0.5) * 8).toFixed(1)}rem, 110vh)`, opacity: 0.7 }], { duration: 1600 + h() * 1800, delay: h() * Math.max(0, duree - 1800), easing: "cubic-bezier(.4, 0, .9, .6)", fill: "both" });
    }
  }
  function eclabousser(parent, xPct, yPct, nb = 26, graine = 3, couleur = "#57b8ff") {
    const h = hasardDe(graine);
    for (let i = 0; i < nb; i++) {
      const g = el("i", "fx-goutte");
      g.style.left = `${xPct + (h() - 0.5) * 12}%`;
      g.style.top = `${yPct}%`;
      g.style.background = couleur;
      g.style.width = g.style.height = `${0.9 + h() * 1.8}rem`;
      parent.append(g);
      const vx = (h() - 0.5) * 60;
      const haut = 14 + h() * 26;
      anime(g, [
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: `translate(${(vx * 0.5).toFixed(1)}rem, -${haut.toFixed(1)}rem) scale(1)`, opacity: 1, offset: 0.4 },
        { transform: `translate(${vx.toFixed(1)}rem, ${(haut * 0.4).toFixed(1)}rem) scale(0.6)`, opacity: 0 },
      ], { duration: 900 + h() * 500, easing: "cubic-bezier(.2, .6, .5, 1)", fill: "both" });
    }
  }
  function bulles(parent, xPct, nb = 18, duree = 2200, graine = 11) {
    const h = hasardDe(graine);
    for (let i = 0; i < nb; i++) {
      const b = el("i", "fx-bulle");
      b.style.left = `${xPct + (h() - 0.5) * 18}%`;
      b.style.width = b.style.height = `${1 + h() * 2.6}rem`;
      parent.append(b);
      anime(b, [{ transform: "translate(0, 0)", opacity: 0 }, { transform: `translate(${((h() - 0.5) * 4).toFixed(1)}rem, -12vh)`, opacity: 1, offset: 0.2 }, { transform: `translate(${((h() - 0.5) * 6).toFixed(1)}rem, -32vh)`, opacity: 0 }], { duration: 1300 + h() * 900, delay: h() * duree, easing: "ease-out", fill: "both" });
    }
  }
  function compteARebours(noeud, duree) {
    const debut = performance.now();
    const f = () => { noeud.textContent = minutes(Math.max(0, duree - (performance.now() - debut))); };
    f();
    const t = setInterval(f, 250);
    return () => clearInterval(t);
  }

  // ---------- secouer toute la scène en direct (sauf cette page) ----------
  // les sources plein écran (le jeu) grossissent un peu pendant qu'elles tremblent : pas de bord noir
  async function secouer({ duree, force = 1, cam = null, rotCam = null, echelleCam = null }) {
    const nomScene = await regie.scene();
    const items = await regie.elements(nomScene);
    const moi = await regie.moiDans(nomScene, items).catch(() => null);
    const base = await regie.canevas();
    const cibles = items.filter((x) => x.sceneItemEnabled && !(moi && !moi.parent && x.sceneItemId === moi.sceneItemId) && !(moi?.parent && x.sceneItemId === moi.parent.sceneItemId) && !/^BARHAW /.test(x.sourceName)).map((x) => ({ scene: nomScene, id: x.sceneItemId }));
    const camEnHaut = cam && cam.cible.scene === nomScene;
    if (cam && !camEnHaut) cibles.push({ scene: cam.cible.scene, id: cam.cible.id, role: "cam" });
    if (!cibles.length) throw erreur("cam");
    await regie.animer({
      items: cibles, duree,
      etape: (ms, places) => {
        const a = force * Math.min(1, ms / 350) * (ms > duree - 1400 ? Math.max(0, (duree - ms) / 1400) : 1);
        const s = ms / 1000;
        const poses = [];
        places.forEach((p, i) => {
          const estCam = cam && ((camEnHaut && p.scene === cam.cible.scene && p.id === cam.cible.id) || p.role === "cam");
          if (p.role === "cam") { // la cam dans une grande scène imbriquée : elle se retourne, la scène tremble
            poses.push([p, cam.place(p.t, { rotation: rotCam ? rotCam(ms) : 0, echelle: echelleCam ? echelleCam(ms) : 1 })]);
            return;
          }
          const b = p.boite || (p.boite = boite(p.t));
          if (!(b.l > 2 && b.h > 2)) return; // une source sans image (le son)
          const plein = b.l >= base.l * 0.9 && b.h >= base.h * 0.9;
          const dx = a * 24 * (0.65 * Math.sin(2 * Math.PI * 9.7 * s + i * 1.9) + 0.35 * Math.sin(2 * Math.PI * 15.3 * s + i * 0.7));
          const dy = a * 17 * (0.6 * Math.sin(2 * Math.PI * 11.9 * s + i * 2.6) + 0.4 * Math.sin(2 * Math.PI * 17.1 * s + i * 1.3));
          const r = a * (plein ? 0.7 : 1.8) * Math.sin(2 * Math.PI * 6.3 * s + i);
          if (estCam) poses.push([p, cam.place(p.t, { dx, dy, rotation: r + (rotCam ? rotCam(ms) : 0), echelle: echelleCam ? echelleCam(ms) : 1 })]);
          else poses.push([p, placeAutour(p.t, { dx, dy, rotation: r, echelle: plein ? 1 + 0.045 * a : 1 })]);
        });
        return poses;
      },
    });
  }

  // ---------- le séisme ----------
  async function seisme(par) {
    exigerRegie();
    const c = couche("seisme");
    bandeau(c, "SÉISME !", par, 4600);
    poussiere(c, 52, 4800, Date.now() % 997);
    sonner("effets/seisme");
    try { await secouer({ duree: 5000, force: 1 }); } finally { setTimeout(() => c.remove(), 400); }
  }

  // ---------- le kraken ----------
  async function kraken(par) {
    const { cam, base, b, pct } = await exigerCam();
    const D = base.h - (b.cy - b.h / 2) + 80; // de quoi cacher toute la cam sous le bas de l'écran
    const DUREE = 7600;
    const dy = (ms) => {
      if (ms < 1200) return 0;
      if (ms < 1750) return 7 * Math.sin(ms / 28);
      if (ms < 2900) return D * versBas((ms - 1750) / 1150);
      if (ms < 4300) return D;
      if (ms < 4950) return D + (-0.09 * base.h - D) * versHaut((ms - 4300) / 650);
      if (ms < 6000) { const u = (ms - 4950) / 1050; return -0.09 * base.h * Math.cos(u * Math.PI * 2.5) * (1 - u); }
      return 0;
    };
    const rot = (ms) => (ms > 1750 && ms < 2900 ? 7 * Math.sin(ms / 90) : ms > 4300 && ms < 6000 ? 10 * Math.sin((ms - 4300) / 120) * (1 - (ms - 4300) / 1700) : 0);
    const c = couche("kraken");
    bandeau(c, "LE KRAKEN !", par, 5200);
    const ech = innerHeight / base.h; // des pixels d'OBS aux pixels de la page
    // le tentacule sort de l'eau sur le côté de la cam qui donne vers le milieu de l'écran, et recourbe son bout au-dessus
    const aGauche = pct.x + pct.l / 2 > 50;
    const hauteur = borne(100 - pct.y + 7, 34, 108);
    const tent = dessin(`fx-tentacule${aGauche ? "" : " miroir"}`, svgTentacule((Date.now() % 97) + 1));
    tent.style.left = `${aGauche ? pct.x + pct.l * 0.1 : pct.x + pct.l * 0.9}%`;
    tent.style.height = `${hauteur}%`;
    // les boucles autour de la cam (au niveau du torse), qui suivent la cam jusqu'au fond
    const boucles = [0.6, 0.8].map((f) => {
      const n = dessin(`fx-boucle${aGauche ? "" : " miroir"}`, SVG_BOUCLE);
      n.style.left = `${pct.x - pct.l * 0.04}%`;
      n.style.width = `${pct.l * 1.08}%`;
      n.style.top = `${pct.y + pct.h * f - pct.h * 0.07}%`;
      n.style.height = `${Math.max(3.5, pct.h * 0.14)}%`;
      return n;
    });
    // l'eau, devant le pied du tentacule : d'abord sous le visage, puis elle monte avec la cam qu'on emporte et la recouvre
    // toute (en plein écran pour la grande cam : on voit le fond de la mer), puis elle redescend quand la cam est recrachée
    const haut = borne(100 - (pct.y + pct.h * 0.72), 7, 26);
    const plein = borne(100 - pct.y + 4, 15, 112);
    const vague = dessin("fx-eau-vague", SVG_EAU);
    const eau = el("div", "fx-eau", vague, el("div", "fx-eau-fond", el("i", "fx-rayons")));
    c.append(tent, ...boucles, eau);
    const niveaux = [[0, 0], [900, haut], [1750, haut * 1.15], [2900, plein], [4300, plein], [4950, haut * 1.3], [6000, haut], [7600, 0]];
    anime(eau, niveaux.map(([ms, n]) => ({ offset: ms / DUREE, transform: `translateY(${(100 - n).toFixed(2)}%)` })), { duration: DUREE, easing: "ease-in-out", fill: "both" });
    anime(vague.firstElementChild, [{ transform: "translateX(0)" }, { transform: "translateX(-16.667%)" }], { duration: 2200, iterations: 4, easing: "linear" });
    const images = [];
    for (let k = 0; k <= 76; k++) {
      const ms = (k / 76) * DUREE;
      const monte = ms < 1200 ? 1 - versHaut(ms / 1200) : 0;
      const coule = ms > 6000 ? versBas((ms - 6000) / 1400) : 0;
      const vague = ms > 4950 && ms < 6000 ? 12 * Math.sin((ms - 4950) / 90) : 3.5 * Math.sin(ms / 260);
      const suit = ms < 6000 ? Math.max(0, dy(ms)) * ech : 0;
      images.push({ offset: k / 76, transform: `translate(-50%, calc(${((monte + coule) * 100).toFixed(1)}% + ${suit.toFixed(1)}px)) rotate(${(vague + rot(ms) * 0.6).toFixed(1)}deg)` });
    }
    anime(tent, images, { duration: DUREE, easing: "linear", fill: "both" });
    boucles.forEach((n, i) => {
      const im = [];
      for (let k = 0; k <= 60; k++) {
        const ms = 1200 + (k / 60) * 3100;
        const serre = borne((ms - 1250 - i * 180) / 380, 0, 1);
        im.push({ offset: k / 60, transform: `translateY(${(dy(ms) * ech).toFixed(1)}px) rotate(${(rot(ms) * 0.5).toFixed(1)}deg) scaleX(${versHaut(serre).toFixed(3)})`, opacity: ms > 4200 ? 0 : 1 });
      }
      anime(n, im, { duration: 3100, delay: 1200, easing: "linear", fill: "both" });
    });
    const xEau = pct.x + pct.l / 2;
    sonner("effets/kraken");
    setTimeout(() => { eclabousser(c, xEau, 100 - haut * 1.15, 30, 5); bulles(c, xEau, 30, 1700, 13); }, 2300);
    setTimeout(() => { eclabousser(c, xEau, 100 - haut, 34, 9); }, 4400);
    try {
      await regie.animer({ items: [cam.cible], duree: DUREE, etape: (ms, places) => [[places[0], cam.place(places[0].t, { dy: dy(ms), rotation: rot(ms) })]] });
    } finally { setTimeout(() => c.remove(), 300); }
  }

  // ---------- l'écran de veille ----------
  async function veille(par) {
    const { cam, base, b } = await exigerCam();
    const E = Math.min(1, (0.25 * base.l) / b.l); // un quart de la largeur de l'écran (une petite cam garde sa taille)
    const DUREE = 30_000;
    const c = couche("veille");
    bandeau(c, "ÉCRAN DE VEILLE", par, 4200);
    const h = hasardDe(Date.now() % 9973);
    const vitesse = base.l / 1920;
    let x = b.cx;
    let y = b.cy;
    let vx = (h() > 0.5 ? 1 : -1) * 330 * vitesse;
    let vy = (h() > 0.5 ? 1 : -1) * 240 * vitesse;
    let avant = 0;
    let dernierBord = -9999;
    let teinte = 0;
    const coin = (xPct, yPct) => {
      const t = el("div", "fx-coin", "COIN !");
      t.style.left = `${borne(xPct, 8, 92)}%`;
      t.style.top = `${borne(yPct, 8, 92)}%`;
      c.append(t);
      anime(t, [{ transform: "translate(-50%, -50%) scale(0) rotate(-20deg)", opacity: 1 }, { transform: "translate(-50%, -50%) scale(1.25) rotate(-6deg)", opacity: 1, offset: 0.25 }, { transform: "translate(-50%, -50%) scale(1) rotate(-8deg)", opacity: 1, offset: 0.7 }, { transform: "translate(-50%, -50%) scale(0.6)", opacity: 0 }], { duration: 1800, easing: "ease-out", fill: "both" });
      eclabousser(c, xPct, yPct, 30, Date.now() % 31, "#ffcf5c");
      sonner("effets/coin");
      setTimeout(() => t.remove(), 1900);
    };
    const changerTeinte = () => {
      teinte = ((teinte + 180 + 70 + Math.floor(h() * 140)) % 360) - 180;
      regie.teinte(cam.source, { hue_shift: teinte, saturation: 0.45 }).catch(() => {});
    };
    try {
      await regie.animer({
        items: [cam.cible], duree: DUREE,
        etape: (ms, places) => {
          const t0 = places[0].t;
          const dt = Math.min(0.1, (ms - avant) / 1000);
          avant = ms;
          if (ms < 700) return [[places[0], cam.place(t0, { echelle: 1 - (1 - E) * doux(ms / 700) })]];
          const lw = (b.l * E) / 2;
          const lh = (b.h * E) / 2;
          if (ms < DUREE - 900) {
            x += vx * dt;
            y += vy * dt;
            let bords = 0;
            if (x - lw < 0) { x = lw + (lw - x); vx = Math.abs(vx); bords++; }
            if (x + lw > base.l) { x = base.l - lw - (x + lw - base.l); vx = -Math.abs(vx); bords++; }
            if (y - lh < 0) { y = lh + (lh - y); vy = Math.abs(vy); bords++; }
            if (y + lh > base.h) { y = base.h - lh - (y + lh - base.h); vy = -Math.abs(vy); bords++; }
            if (bords) {
              changerTeinte();
              if (bords > 1 || ms - dernierBord < 150) coin((x / base.l) * 100, (y / base.h) * 100);
              else sonner("effets/bloop", { vitesse: 0.85 + h() * 0.4 });
              dernierBord = ms;
            }
            return [[places[0], cam.place(t0, { dx: x - b.cx, dy: y - b.cy, echelle: E })]];
          }
          // le retour à sa place
          const u = doux((ms - (DUREE - 900)) / 900);
          return [[places[0], cam.place(t0, { dx: (x - b.cx) * (1 - u), dy: (y - b.cy) * (1 - u), echelle: E + (1 - E) * u })]];
        },
        fin: () => regie.enleverTeintes(),
      });
    } finally { setTimeout(() => c.remove(), 300); }
  }

  // ---------- le dossier : une photo rangée sur le PC ----------
  let photos = { liste: [], le: -Infinity, dossier: "" };
  let dernierePhoto = "";
  async function listerPhotos({ force = false } = {}) {
    const d = dossiers();
    if (!force && photos.dossier === d && performance.now() - photos.le < 5 * 60_000 && photos.liste.length) return photos.liste;
    const liste = [];
    for (let n = 1; n <= 99; n++) {
      let trouve = "";
      for (const ext of ["jpg", "png", "jpeg", "webp"]) {
        const f = `dossier-${n}.${ext}`;
        if (await regie.photo(d, f)) { trouve = f; break; }
      }
      if (!trouve) break;
      liste.push(trouve);
    }
    photos = { liste, le: performance.now(), dossier: d };
    return liste;
  }
  async function dossier(par) {
    exigerRegie();
    const liste = await listerPhotos();
    if (!liste.length) throw erreur("dossiers");
    const choix = liste.length > 1 ? liste.filter((f) => f !== dernierePhoto) : liste;
    const f = choix[Math.floor(Math.random() * choix.length)];
    dernierePhoto = f;
    const image = await regie.photo(dossiers(), f);
    if (!image) { photos.le = -Infinity; throw erreur("dossiers"); }
    const lc = await laCam();
    const p = lc ? lc.pct : { x: 0, y: 0, l: 100, h: 100 };
    const DUREE = 10_000;
    const c = couche("dossier");
    const cadre = el("div", "fx-dossier");
    placer(cadre, p);
    const img = el("img", "fx-dossier-photo");
    img.alt = "";
    img.src = image;
    const flou = el("img", "fx-dossier-fond"); // (la même photo, floue, pour remplir les côtés : la photo entière se voit)
    flou.alt = "";
    flou.src = image;
    const tampon = el("div", "fx-tampon", "DOSSIER");
    if (p.h < 40) tampon.classList.add("petit");
    const nom = propre(par);
    const legende = pseudo && nom ? el("div", "fx-legende", el("div", "", el("span", "", "révélé par "), el("b", "", nom))) : null;
    cadre.append(flou, img, tampon);
    if (legende) cadre.append(legende);
    c.append(cadre);
    sonner("effets/dossier");
    // la cam devient transparente : la photo apparaît à travers, en tremblotant comme un fantôme
    anime(img, [
      { offset: 0, opacity: 0, filter: "blur(18px) saturate(0)", transform: "scale(1.06)" },
      { offset: 0.06, opacity: 0.35, filter: "blur(10px) saturate(.3)", transform: "scale(1.04)" },
      { offset: 0.1, opacity: 0.2, filter: "blur(12px) saturate(.3)", transform: "scale(1.04)" },
      { offset: 0.18, opacity: 1, filter: "blur(0px) saturate(1)", transform: "scale(1)" },
      { offset: 0.9, opacity: 1, filter: "blur(0px) saturate(1)", transform: "scale(1)" },
      { offset: 1, opacity: 0, filter: "blur(14px) saturate(0)", transform: "scale(1.03)" },
    ], { duration: DUREE, easing: "ease-out", fill: "both" });
    anime(cadre, [{ offset: 0, opacity: 0 }, { offset: 0.05, opacity: 1 }, { offset: 0.92, opacity: 1 }, { offset: 1, opacity: 0 }], { duration: DUREE, easing: "linear", fill: "both" });
    anime(tampon, [
      { offset: 0, transform: "translate(-50%, -50%) scale(2.6) rotate(-4deg)", opacity: 0 },
      { offset: 0.19, transform: "translate(-50%, -50%) scale(2.6) rotate(-4deg)", opacity: 0 },
      { offset: 0.22, transform: "translate(-50%, -50%) scale(0.92) rotate(-13deg)", opacity: 1 },
      { offset: 0.25, transform: "translate(-50%, -50%) scale(1) rotate(-12deg)", opacity: 1 },
      { offset: 0.9, transform: "translate(-50%, -50%) scale(1) rotate(-12deg)", opacity: 1 },
      { offset: 1, transform: "translate(-50%, -50%) scale(1) rotate(-12deg)", opacity: 0 },
    ], { duration: DUREE, easing: "linear", fill: "both" });
    setTimeout(() => sonner("effets/tampon"), 0.22 * DUREE);
    if (legende) anime(legende, [{ offset: 0, opacity: 0, transform: "translateY(1rem)" }, { offset: 0.27, opacity: 0, transform: "translateY(1rem)" }, { offset: 0.32, opacity: 1, transform: "translateY(0)" }, { offset: 0.9, opacity: 1, transform: "translateY(0)" }, { offset: 1, opacity: 0, transform: "translateY(0)" }], { duration: DUREE, easing: "ease-out", fill: "both" });
    await attendre(DUREE + 100);
    c.remove();
  }

  // ---------- le chat prend ta cam (1 min) ----------
  let pilote = null;
  function bouger(dir) { pilote?.bouger(dir); }
  async function controle(par, { duree = 60_000 } = {}) {
    const { cam, base, b } = await exigerCam();
    const PAS = 70 * (base.l / 1920);
    let cx = 0; let cy = 0; let vx = 0; let vy = 0;
    const comptes = { haut: 0, bas: 0, gauche: 0, droite: 0 };
    const c = couche("controle");
    const fleches = {};
    const pave = el("div", "fx-pave", ...["haut", "gauche", "droite", "bas"].map((d) => (fleches[d] = el("div", `fx-fleche ${d}`, el("i"), el("b", "", "0")))));
    const temps = el("b", "fx-temps", "1:00");
    const hud = el("div", "fx-hud", el("div", "fx-hud-titre", "LE CHAT CONTRÔLE LA CAM"), el("div", "fx-hud-aide", "!haut  !bas  !gauche  !droite"), temps, pave);
    c.append(hud);
    bandeau(c, "TWITCH PREND TA CAM", par, 4200);
    anime(hud, [{ transform: "translate(-50%, -140%)" }, { transform: "translate(-50%, 0)" }], { duration: 600, easing: "cubic-bezier(.2, 1.3, .4, 1)", fill: "both" });
    sonner("effets/controle");
    let dernierBip = 0;
    pilote = {
      bouger(dir) {
        if (!(dir in comptes)) return;
        comptes[dir]++;
        if (dir === "haut") cy -= PAS; else if (dir === "bas") cy += PAS; else if (dir === "gauche") cx -= PAS; else cx += PAS;
        // la cam reste à l'écran (son centre au moins à 8 % du bord)
        cx = borne(cx, base.l * 0.08 - b.cx, base.l * 0.92 - b.cx);
        cy = borne(cy, base.h * 0.08 - b.cy, base.h * 0.92 - b.cy);
        const f = fleches[dir];
        f.querySelector("b").textContent = String(comptes[dir]);
        anime(f, [{ transform: "scale(1.35)", filter: "brightness(1.6)" }, { transform: "scale(1)", filter: "brightness(1)" }], { duration: 260, easing: "ease-out" });
        if (performance.now() - dernierBip > 120) { dernierBip = performance.now(); sonner("effets/bip", { vitesse: dir === "haut" ? 1.25 : dir === "bas" ? 0.8 : 1, volume: 0.5 }); }
      },
    };
    bot.controle(true);
    const arret = compteARebours(temps, duree);
    try {
      await regie.animer({
        items: [cam.cible], duree,
        etape: (ms, places) => {
          const retour = ms > duree - 1000;
          const tx = retour ? 0 : cx;
          const ty = retour ? 0 : cy;
          vx += (tx - vx) * 0.22;
          vy += (ty - vy) * 0.22;
          return [[places[0], cam.place(places[0].t, { dx: vx, dy: vy, rotation: borne((tx - vx) * 0.04, -8, 8) })]];
        },
      });
    } finally {
      pilote = null;
      bot.controle(false);
      arret();
      anime(hud, [{ transform: "translate(-50%, 0)", opacity: 1 }, { transform: "translate(-50%, -140%)", opacity: 0 }], { duration: 500, easing: "ease-in", fill: "both" });
      setTimeout(() => c.remove(), 600);
    }
  }

  // ---------- le chaos total (15 s) ----------
  async function chaos(par, images = [], { essai = false } = {}) {
    exigerRegie();
    const lc = await laCam();
    const DUREE = 15_000;
    const c = couche("chaos");
    const alarme = el("div", "fx-alarme");
    const titre = el("div", "fx-chaos-titre", "CHAOS TOTAL");
    c.append(alarme, titre);
    bandeau(c, "CHAOS TOTAL", par, 4200);
    anime(alarme, [{ opacity: 0.05 }, { opacity: 0.5 }, { opacity: 0.05 }], { duration: 1000, iterations: 15, easing: "ease-in-out" });
    anime(titre, [
      { offset: 0, transform: "translate(-50%, -50%) scale(3) rotate(-10deg)", opacity: 0 },
      { offset: 0.06, transform: "translate(-50%, -50%) scale(0.9) rotate(-4deg)", opacity: 1 },
      { offset: 0.1, transform: "translate(-50%, -50%) scale(1) rotate(-6deg)", opacity: 1 },
      { offset: 0.2, transform: "translate(-50%, -50%) scale(1) rotate(-6deg)", opacity: 1 },
      { offset: 0.26, transform: "translate(-50%, -50%) scale(0.4) rotate(8deg)", opacity: 0 },
      { offset: 1, transform: "translate(-50%, -50%) scale(0.4) rotate(8deg)", opacity: 0 },
    ], { duration: DUREE, easing: "ease-out", fill: "both" });
    poussiere(c, 70, DUREE - 1500, 23);
    const sirene = sonner("effets/sirene", { boucle: true, volume: 0.75 });
    const pluie = images?.length ? pleuvoir({ images, par: "", duree: DUREE - 2500, pseudo: false, densite: 6, essai, bandeau: false }) : Promise.resolve();
    const flip = (ms) => 180 * doux((ms - 700) / 900) * (1 - doux((ms - (DUREE - 1500)) / 900));
    try {
      await secouer({ duree: DUREE, force: 1.45, cam: lc?.cam || null, rotCam: flip, echelleCam: (ms) => 1 + 0.08 * Math.sin(ms / 400) });
    } finally {
      try { sirene?.arreter?.(); } catch { /* rien */ }
      await pluie.catch(() => {});
      setTimeout(() => c.remove(), 300);
    }
  }

  // ---------- Mini-Liliano (1 min) ----------
  async function mini(par, { duree = 60_000 } = {}) {
    const { cam, base, b } = await exigerCam();
    const E = Math.min(0.45, (0.13 * base.l) / b.l); // environ 13 % de la largeur de l'écran
    const marge = base.h * 0.07;
    const fx = marge + (b.l * E) / 2;
    const fy = base.h - marge - (b.h * E) / 2;
    const c = couche("mini");
    bandeau(c, "MINI-LILIANO", par, 4200);
    const loupe = dessin("fx-loupe", SVG_LOUPE);
    const tw = ((b.l * E) / base.l) * 100;
    // la loupe : son verre (le cercle) posé sur la mini cam, le manche vers le haut à droite
    loupe.style.width = `${Math.max(12, tw * 1.9)}%`;
    loupe.style.left = `${((fx / base.l) * 100) - Math.max(12, tw * 1.9) * 0.4}%`;
    loupe.style.top = `${(fy / base.h) * 100}%`;
    c.append(loupe);
    anime(loupe, [{ offset: 0, opacity: 0, transform: "translateY(-40%) scale(0.3) rotate(-30deg)" }, { offset: 0.03, opacity: 1, transform: "translateY(-40%) scale(1) rotate(0deg)" }, { offset: 0.97, opacity: 1, transform: "translateY(-40%) scale(1) rotate(0deg)" }, { offset: 1, opacity: 0, transform: "translateY(-40%) scale(0.3) rotate(20deg)" }], { duration: duree, easing: "ease-out", fill: "both" });
    anime(loupe.firstElementChild, [{ transform: "translate(0, 0) rotate(0deg)" }, { transform: "translate(1rem, -1rem) rotate(4deg)" }, { transform: "translate(0, 0) rotate(0deg)" }], { duration: 2600, iterations: Math.ceil(duree / 2600), easing: "ease-in-out" });
    sonner("effets/retrecit");
    setTimeout(() => sonner("effets/grandit"), duree - 900);
    try {
      await regie.animer({
        items: [cam.cible], duree,
        etape: (ms, places) => {
          const u = ms < 800 ? doux(ms / 800) : ms > duree - 900 ? 1 - doux((ms - (duree - 900)) / 900) : 1;
          return [[places[0], cam.place(places[0].t, { dx: (fx - b.cx) * u, dy: (fy - b.cy) * u, echelle: 1 - (1 - E) * u })]];
        },
      });
    } finally { setTimeout(() => c.remove(), 300); }
  }

  // ---------- la prison (1 min, ou « !liberer » 50 fois) ----------
  let prisonnier = null;
  function liberer() { prisonnier?.liberer(); }
  async function prison(par, { duree = 60_000, besoin = 50 } = {}) {
    const lc = await laCam().catch(() => null);
    const p = lc ? lc.pct : { x: 0, y: 0, l: 100, h: 100 };
    const c = couche("prison");
    const zone = el("div", "fx-prison");
    placer(zone, p);
    if (p.h < 45) zone.classList.add("petite");
    const barreaux = dessin("fx-barreaux", svgBarreaux(p.l < 40 ? 6 : 9));
    const compte = el("b", "", `0/${besoin}`);
    const temps = el("span", "fx-prison-temps", "1:00");
    const panneau = el("div", "fx-panneau", el("div", "fx-panneau-titre", "EN PRISON"), el("div", "fx-panneau-aide", "!liberer ", compte), temps);
    zone.append(barreaux, panneau);
    c.append(zone);
    bandeau(c, "EN PRISON !", par, 4200);
    anime(barreaux, [{ transform: "translateY(-110%)" }, { transform: "translateY(4%)", offset: 0.7 }, { transform: "translateY(-1.5%)", offset: 0.85 }, { transform: "translateY(0)" }], { duration: 520, easing: "cubic-bezier(.5, 0, .9, .5)", fill: "both" });
    anime(panneau, [{ transform: "translate(-50%, -260%) rotate(0deg)" }, { transform: "translate(-50%, 0) rotate(-6deg)", offset: 0.6 }, { transform: "translate(-50%, 0) rotate(4deg)", offset: 0.8 }, { transform: "translate(-50%, 0) rotate(-2deg)" }], { duration: 900, delay: 300, easing: "ease-out", fill: "both" });
    sonner("effets/prison");
    let n = 0;
    let libre = false;
    let finir = null;
    const fin = new Promise((ok) => { finir = ok; });
    let dernierClic = 0;
    prisonnier = {
      liberer() {
        if (libre) return;
        n++;
        compte.textContent = `${Math.min(n, besoin)}/${besoin}`;
        anime(barreaux, [{ transform: "translateX(0)" }, { transform: "translateX(-0.5%)" }, { transform: "translateX(0.5%)" }, { transform: "translateX(0)" }], { duration: 180, easing: "linear" });
        if (performance.now() - dernierClic > 150) { dernierClic = performance.now(); sonner("effets/clic", { vitesse: 0.9 + Math.random() * 0.3, volume: 0.6 }); }
        if (n >= besoin) { libre = true; finir("libere"); }
      },
    };
    bot.prison(true);
    const arret = compteARebours(temps, duree);
    const minuteur = setTimeout(() => finir("temps"), duree);
    const comment = await fin;
    clearTimeout(minuteur);
    arret();
    prisonnier = null;
    bot.prison(false);
    if (comment === "libere") {
      const t = el("div", "fx-libere", "LIBÉRÉ !");
      zone.append(t);
      anime(t, [{ transform: "translate(-50%, -50%) scale(0)", opacity: 1 }, { transform: "translate(-50%, -50%) scale(1.2)", opacity: 1, offset: 0.3 }, { transform: "translate(-50%, -50%) scale(1)", opacity: 1, offset: 0.8 }, { transform: "translate(-50%, -50%) scale(1)", opacity: 0 }], { duration: 2200, easing: "ease-out", fill: "both" });
      eclabousser(c, p.x + p.l / 2, p.y + p.h / 2, 40, 17, "#ffcf5c");
      sonner("effets/libere");
    }
    anime(barreaux, [{ transform: "translateY(0)" }, { transform: "translateY(-115%)" }], { duration: comment === "libere" ? 500 : 900, delay: comment === "libere" ? 250 : 0, easing: "cubic-bezier(.5, 0, .2, 1)", fill: "both" });
    anime(panneau, [{ opacity: 1 }, { opacity: 0 }], { duration: 500, delay: 200, fill: "both" });
    await attendre(comment === "libere" ? 2300 : 1100);
    c.remove();
  }

  // ---------- le replay (« !replay ») : le cadre par-dessus, la vidéo par la régie ----------
  async function replay(secondes = 20) {
    exigerRegie();
    let c = null;
    let fini = false;
    try {
      await regie.replay({
        secondes,
        vitesse: 65,
        surDebut: () => {
          if (fini) return;
          c = couche("replay");
          const point = el("i");
          c.append(el("div", "fx-replay-cadre"), el("div", "fx-replay-titre", point, "REPLAY"), el("div", "fx-replay-vitesse", "RALENTI ×0,65"));
          anime(c, [{ opacity: 0 }, { opacity: 1 }], { duration: 250, fill: "both" });
          anime(point, [{ opacity: 1 }, { opacity: 0.15 }, { opacity: 1 }], { duration: 1000, iterations: 60 });
          sonner("effets/replay");
        },
      });
    } finally {
      fini = true;
      if (c) { anime(c, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "both" }); const n = c; setTimeout(() => n.remove(), 320); }
    }
  }

  // ---------- la fausse pub (« !pub ») ----------
  async function pub(quoi = "grandline", lien = "") {
    const DUREE = 11_000;
    const c = couche("pub");
    const bumper = (texte, classe = "") => el("div", `fx-pub-bumper ${classe}`, el("div", "fx-pub-bruit"), el("b", "", texte));
    const debut = bumper("PUBLICITÉ");
    const fin = bumper("FIN DE LA PUBLICITÉ", "fin");
    const lienPropre = /^https:\/\/[\w.-]+(\/[\w./?=&%-]*)?$/.test(String(lien || "")) ? String(lien).replace(/^https:\/\//, "").replace(/\/$/, "") : "";
    let carte;
    if (quoi === "discord") {
      carte = el("div", "fx-pub-carte discord",
        el("div", "fx-pub-sur", "Le Discord de Barhaw"),
        el("div", "fx-pub-titre", "REJOINS L'ÉQUIPAGE"),
        el("div", "fx-pub-texte", "Les annonces des lives, les potes, GRAND LINE, les jeux, et Henri qui te répond quand tu lui parles."),
        lienPropre ? el("div", "fx-pub-lien", lienPropre) : el("div", "fx-pub-lien", "le lien est dans le chat"),
        el("div", "fx-pub-petit", "Offre valable à vie. Aucun remboursement possible."));
    } else {
      const image = el("img", "fx-pub-image");
      image.alt = "";
      image.src = "/img/grandline-port.webp";
      carte = el("div", "fx-pub-carte grandline", image,
        el("div", "fx-pub-sur", "Nouveau sur Barhaw"),
        el("div", "fx-pub-titre", "GRAND LINE"),
        el("div", "fx-pub-texte", "La course des équipages : ton équipage, ton navire, des îles à conquérir."),
        el("div", "fx-pub-lien", lienPropre || location.host),
        el("div", "fx-pub-petit", "Aucun navire n'a été maltraité pendant le tournage."));
    }
    const fond = el("div", "fx-pub-fond");
    c.append(fond, carte, debut, fin);
    anime(fond, [{ offset: 0, opacity: 0 }, { offset: 0.03, opacity: 1 }, { offset: 0.97, opacity: 1 }, { offset: 1, opacity: 0 }], { duration: DUREE, fill: "both" });
    anime(debut, [{ offset: 0, opacity: 0 }, { offset: 0.03, opacity: 1 }, { offset: 0.13, opacity: 1 }, { offset: 0.16, opacity: 0 }, { offset: 1, opacity: 0 }], { duration: DUREE, fill: "both" });
    anime(carte, [{ offset: 0, opacity: 0, transform: "scale(1.08)" }, { offset: 0.15, opacity: 0, transform: "scale(1.08)" }, { offset: 0.2, opacity: 1, transform: "scale(1)" }, { offset: 0.82, opacity: 1, transform: "scale(1.04)" }, { offset: 0.85, opacity: 0, transform: "scale(1.04)" }, { offset: 1, opacity: 0, transform: "scale(1.04)" }], { duration: DUREE, easing: "ease-out", fill: "both" });
    anime(fin, [{ offset: 0, opacity: 0 }, { offset: 0.84, opacity: 0 }, { offset: 0.87, opacity: 1 }, { offset: 0.97, opacity: 1 }, { offset: 1, opacity: 0 }], { duration: DUREE, fill: "both" });
    sonner("effets/pub");
    setTimeout(() => sonner("effets/pub-fin"), 9300);
    await attendre(DUREE + 100);
    c.remove();
  }

  // ---------- la voix d'hélium (30 s, tout le stream) ----------
  async function helium(par, { duree = 30_000 } = {}) {
    exigerRegie();
    await regie.helium(true);
    const c = couche("helium");
    const temps = el("b", "", "0:30");
    const ballon = dessin("fx-ballon", SVG_BALLON);
    const badge = el("div", "fx-helium", ballon, el("div", "fx-helium-texte", el("span", "", "VOIX D'HÉLIUM"), temps));
    c.append(badge);
    bandeau(c, "VOIX D'HÉLIUM", par, 4200);
    anime(badge, [{ transform: "translateX(-130%)" }, { transform: "translateX(0)" }], { duration: 700, easing: "cubic-bezier(.2, 1.3, .4, 1)", fill: "both" });
    anime(ballon, [{ transform: "translateY(0) rotate(-4deg)" }, { transform: "translateY(-1.2rem) rotate(4deg)" }, { transform: "translateY(0) rotate(-4deg)" }], { duration: 2200, iterations: Math.ceil(duree / 2200), easing: "ease-in-out" });
    sonner("effets/helium");
    const debut = performance.now();
    const f = () => { temps.textContent = `0:${String(Math.ceil(Math.max(0, duree - (performance.now() - debut)) / 1000)).padStart(2, "0")}`; };
    const montre = setInterval(f, 250);
    try { await attendre(duree); } finally {
      clearInterval(montre);
      await regie.helium(false).catch(() => {});
      anime(badge, [{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(-160%)", opacity: 0 }], { duration: 900, easing: "ease-in", fill: "both" });
      setTimeout(() => c.remove(), 950);
    }
  }

  // ---------- un son flippant (les fichiers d'Artlist, sur le PC) ----------
  let dernierSon = 0;
  async function flippant() {
    exigerRegie();
    const essais = [];
    for (let k = 0; k < 4; k++) {
      let n = 1 + Math.floor(Math.random() * 10);
      while (n === dernierSon || essais.includes(n)) n = (n % 10) + 1;
      essais.push(n);
      try {
        const r = await regie.jouerFichier(sons(), `flippant-${String(n).padStart(2, "0")}.aac`);
        dernierSon = n;
        await attendre(Math.min(12_000, (r.duree || 4000) + 600));
        return;
      } catch (e) { if (e?.code !== "sons") throw e; }
    }
    throw erreur("sons");
  }

  return { seisme, kraken, veille, dossier, controle, bouger, chaos, mini, prison, liberer, replay, pub, helium, flippant, listerPhotos, laCam };
}
