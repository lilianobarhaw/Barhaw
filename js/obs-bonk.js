// LE BONK dans OBS : la page /obs?bonk, une source navigateur grande comme l'écran (1920 × 1080), transparente, au-dessus de
// la cam (obs.js la charge et s'arrête là). Quand un viewer prend la récompense de points de chaîne « BONK », le bot
// (lib/bonk.js) l'envoie ici : un gros marteau gonflable arrive en haut à droite, s'abat sur la tête du streamer, s'écrase et
// rebondit, un « BONK ! » de BD éclate à côté et des étoiles tournent autour de la tête. Le pseudo de celui qui a payé
// s'affiche sous le « BONK ! » (?pseudo=non pour l'enlever). « !bonk » dans le chat (le streamer ou un modo) : un essai gratuit.
// Le marteau, les étoiles et le son (son/bonk/) ont été faits pour Barhaw : rien d'existant, libres de droits. Rien n'est gardé
// (sauf la place de la cible, dans le navigateur d'OBS).
// LA CIBLE : le haut de la tête, en pourcentage de l'écran (65 % depuis la gauche, 42,5 % depuis le haut sans rien). Pour la
// changer : clic droit sur la source dans OBS → « Interagir », puis un clic là où est le haut de la tête (la cible rose se
// voit dans l'aperçu d'OBS) ; les flèches du clavier l'ajustent. Elle est gardée dans le navigateur d'OBS ; ?x=<%>&y=<%>
// dans l'adresse l'impose pour de bon.
// Réglages dans l'adresse : ?x= ?y= (la cible) · ?taille=<%> (la taille du marteau : 100 sans rien, de 40 à 250) ·
// ?son=non · ?pseudo=non · ?essai=bonk (un bonk toutes les 6 s, sans le bot, pour placer la source).

const CAPTURE = Boolean(window.__capture);
const DEFAUT = { x: 65, y: 42.5 };
const CLE = "barhaw-obs-bonk-cible";
const DUREE = 2900; // un bonk, du marteau qui arrive aux dernières étoiles
const IMPACT = 430; // l'instant où le marteau touche la tête (le son est calé dessus)
const SONS = ["bonk-1", "bonk-2", "bonk-3"];
const ENCRE = "#12050d";
// le manche part du milieu de la tête du marteau (caché derrière), monte vers la droite ; la main invisible le tient au bout
const MANCHE = { x: 6, y: -12.5, angle: -14, long: 42 }; // en rem (1rem = 10 px d'un écran 1920 × 1080)
const PIVOT = {
  x: MANCHE.x + MANCHE.long * Math.cos((MANCHE.angle * Math.PI) / 180),
  y: MANCHE.y + MANCHE.long * Math.sin((MANCHE.angle * Math.PI) / 180),
};

const el = (balise, classe, ...enfants) => {
  const n = document.createElement(balise);
  if (classe) n.className = classe;
  for (const e of enfants) if (e !== null && e !== undefined && e !== false) n.append(e);
  return n;
};
// les dessins (fixes, écrits ici : jamais de texte venu d'ailleurs dans ce HTML)
const dessin = (classe, svg) => { const n = el("div", classe); n.innerHTML = svg; return n; };
const lire = async (adresse) => { try { const r = await fetch(adresse, { headers: { Accept: "application/json" }, cache: "no-store" }); return await r.json(); } catch { return null; } };
const doux = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const pourcent = (v) => { const n = Number(String(v ?? "").replace(",", ".")); return String(v ?? "").trim() !== "" && Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 10) / 10 : null; };
function anime(n, images, options) {
  if (!n || typeof n.animate !== "function") return null;
  const a = n.animate(images, options);
  if (CAPTURE) { a.pause(); a.__t0 = performance.now(); }
  return a;
}

// ---------- les dessins ----------
const DEGRADES = `<svg class="bonk-degrades" aria-hidden="true" focusable="false"><defs>
  <linearGradient id="bk-rose" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b3245f"/><stop offset=".16" stop-color="#ff5fa6"/><stop offset=".34" stop-color="#ffa6d0"/><stop offset=".55" stop-color="#ff6fae"/><stop offset=".82" stop-color="#ff4f9a"/><stop offset="1" stop-color="#a81f5c"/></linearGradient>
  <linearGradient id="bk-or" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c98a12"/><stop offset=".2" stop-color="#ffd86e"/><stop offset=".38" stop-color="#fff0b8"/><stop offset=".62" stop-color="#ffcf5c"/><stop offset=".86" stop-color="#f0a92e"/><stop offset="1" stop-color="#b77a0c"/></linearGradient>
  <linearGradient id="bk-or-v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".45" stop-color="#ffcf5c"/><stop offset="1" stop-color="#c98a12"/></linearGradient>
  <linearGradient id="bk-violet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2c6ff"/><stop offset=".32" stop-color="#b07bff"/><stop offset=".62" stop-color="#9b4dff"/><stop offset="1" stop-color="#5e22c0"/></linearGradient>
</defs></svg>`;
// la tête du marteau, debout : un gros boudin rose gonflé, deux bourrelets jaunes au bout (celui du bas frappe), une valve
const TETE = `<svg viewBox="0 0 220 270" aria-hidden="true">
  <path d="M26,44 C13,92 13,178 26,226 L194,226 C207,178 207,92 194,44 Z" fill="url(#bk-rose)" stroke="${ENCRE}" stroke-width="7" stroke-linejoin="round"/>
  <path d="M80,60 C73,102 73,168 80,210" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="3.5"/>
  <path d="M142,60 C149,102 149,168 142,210" fill="none" stroke="#7a1240" stroke-opacity=".35" stroke-width="3.5"/>
  <path d="M48,76 C42,112 42,158 48,190" fill="none" stroke="#fff" stroke-opacity=".82" stroke-width="11" stroke-linecap="round"/>
  <circle cx="51" cy="206" r="5" fill="#fff" fill-opacity=".8"/>
  <rect x="150" y="176" width="21" height="13" rx="5" fill="#ffd1e8" stroke="${ENCRE}" stroke-width="4"/>
  <path d="M12,31 C12,12 26,8 44,8 L176,8 C194,8 208,12 208,31 L208,35 C208,54 194,58 176,58 L44,58 C26,58 12,54 12,35 Z" fill="url(#bk-or)" stroke="${ENCRE}" stroke-width="7"/>
  <ellipse cx="47" cy="23" rx="16" ry="5.5" fill="#fff" fill-opacity=".85"/>
  <path d="M12,235 C12,216 26,212 44,212 L176,212 C194,212 208,216 208,235 L208,239 C208,258 194,262 176,262 L44,262 C26,262 12,258 12,239 Z" fill="url(#bk-or)" stroke="${ENCRE}" stroke-width="7"/>
  <ellipse cx="47" cy="227" rx="16" ry="5.5" fill="#fff" fill-opacity=".85"/>
</svg>`;
// le manche : un tube violet gonflé, deux bagues roses, une poignée jaune au bout
const MANCHE_SVG = `<svg viewBox="0 0 460 54" aria-hidden="true">
  <rect x="0" y="7" width="420" height="40" rx="20" fill="url(#bk-violet)" stroke="${ENCRE}" stroke-width="7"/>
  <path d="M34,18 L376,18" stroke="#fff" stroke-opacity=".55" stroke-width="6" stroke-linecap="round"/>
  <rect x="288" y="4" width="18" height="46" rx="6" fill="#ff8fcb" stroke="${ENCRE}" stroke-width="5"/>
  <rect x="320" y="4" width="18" height="46" rx="6" fill="#ff8fcb" stroke="${ENCRE}" stroke-width="5"/>
  <rect x="380" y="2" width="76" height="50" rx="25" fill="url(#bk-or-v)" stroke="${ENCRE}" stroke-width="7"/>
  <path d="M396,14 L438,14" stroke="#fff" stroke-opacity=".75" stroke-width="6" stroke-linecap="round"/>
</svg>`;
const etoilePoints = (R, r) => Array.from({ length: 10 }, (_, k) => {
  const a = (-90 + k * 36) * (Math.PI / 180);
  const d = k % 2 ? r : R;
  return `${(d * Math.cos(a)).toFixed(1)},${(d * Math.sin(a)).toFixed(1)}`;
}).join(" ");
const ETOILE = (couleur) => `<svg viewBox="-32 -32 64 64" aria-hidden="true">
  <polygon points="${etoilePoints(27, 12)}" fill="${couleur}" stroke="${ENCRE}" stroke-width="4.5" stroke-linejoin="round"/>
  <circle cx="-6" cy="-7" r="3.6" fill="#fff" fill-opacity=".9"/>
</svg>`;
const ECLAT = `<svg viewBox="-24 -24 48 48" aria-hidden="true"><path d="M0,-21 Q3,-3 21,0 Q3,3 0,21 Q-3,3 -21,0 Q-3,-3 0,-21 Z" fill="#fff6c9" stroke="${ENCRE}" stroke-width="3" stroke-linejoin="round"/></svg>`;
const ONDE = `<svg viewBox="0 0 320 90" aria-hidden="true"><ellipse cx="160" cy="45" rx="150" ry="36" fill="none" stroke="#fff" stroke-width="9"/><ellipse cx="160" cy="45" rx="118" ry="27" fill="none" stroke="#ff8fcb" stroke-width="6"/></svg>`;
// la bulle de BD : une étoile à pointes irrégulières (toujours les mêmes), rose, du jaune dedans, l'ombre violette de Barhaw
const BOSSES = [1, 0.86, 1.08, 0.9, 1.02, 0.84, 1.1, 0.92, 1, 0.85, 1.06, 0.9, 0.98, 0.87];
const pointes = (rx, ry, creux) => BOSSES.flatMap((b, k) => {
  const a1 = ((k / BOSSES.length) * 2 - 0.5) * Math.PI;
  const a2 = a1 + Math.PI / BOSSES.length;
  return [`${(rx * b * Math.cos(a1)).toFixed(1)},${(ry * b * Math.sin(a1)).toFixed(1)}`, `${(rx * creux * Math.cos(a2)).toFixed(1)},${(ry * creux * Math.sin(a2)).toFixed(1)}`];
}).join(" ");
const BULLE = `<svg viewBox="-240 -150 480 300" aria-hidden="true">
  <polygon points="${pointes(216, 132, 0.7)}" transform="translate(11 12)" fill="#6f22c9" stroke="${ENCRE}" stroke-width="7" stroke-linejoin="round"/>
  <polygon points="${pointes(216, 132, 0.7)}" fill="#ff4f9a" stroke="${ENCRE}" stroke-width="7" stroke-linejoin="round"/>
  <polygon points="${pointes(170, 100, 0.74)}" fill="#ffcf5c"/>
  <text x="6" y="38" text-anchor="middle" font-size="104" fill="#c2286e" stroke="${ENCRE}" stroke-width="16" stroke-linejoin="round" paint-order="stroke" style="font-family: var(--titre)">BONK !</text>
  <text x="0" y="31" text-anchor="middle" font-size="104" fill="#fff" stroke="${ENCRE}" stroke-width="16" stroke-linejoin="round" paint-order="stroke" style="font-family: var(--titre)">BONK !</text>
</svg>`;
const COULEURS_ETOILES = ["#ffcf5c", "#ff8fcb", "#ffcf5c", "#d1a6ff", "#ffe48a"];
const TRAITS = [-168, -146, -34, -12, 164, 16]; // les traits de choc, autour du point d'impact (en degrés)
const ECLATS = [{ x: -17, y: -21, t: 620 }, { x: 18, y: -25, t: 880 }, { x: -21, y: -6, t: 1180 }, { x: 20, y: -9, t: 1480 }, { x: -6, y: -27, t: 1760 }];

export function demarrer({ P }) {
  const ESSAI = (P.get("essai") || "").toLowerCase() === "bonk";
  const SON = P.get("son") !== "non";
  const PSEUDO = P.get("pseudo") !== "non";
  const t = Number(P.get("taille"));
  const TAILLE = /^\d{2,3}$/.test(P.get("taille") || "") ? Math.min(250, Math.max(40, t)) / 100 : 1;
  const DANS_OBS = Boolean(window.obsstudio);

  try { document.fonts.load('104px "Dela Gothic One"'); document.fonts.load('800 28px "M PLUS Rounded 1c"'); } catch { /* elles viendront */ }
  const degrades = el("div", "bonk-degrades-boite");
  degrades.innerHTML = DEGRADES;
  document.body.append(degrades);

  // ---------- la cible (le haut de la tête) ----------
  const imposee = pourcent(P.get("x")) !== null && pourcent(P.get("y")) !== null;
  function cibleDeDepart() {
    if (imposee) return { x: pourcent(P.get("x")), y: pourcent(P.get("y")) };
    try {
      const m = JSON.parse(localStorage.getItem(CLE) || "null");
      if (m && pourcent(m.x) !== null && pourcent(m.y) !== null) return { x: pourcent(m.x), y: pourcent(m.y) };
    } catch { /* pas de stockage : la cible de départ */ }
    return { ...DEFAUT };
  }
  let cible = cibleDeDepart();
  function viser(x, y, garder = true) {
    cible = { x: Math.round(Math.min(98, Math.max(2, x)) * 10) / 10, y: Math.round(Math.min(98, Math.max(2, y)) * 10) / 10 };
    if (garder) { try { localStorage.setItem(CLE, JSON.stringify(cible)); } catch { /* pas de stockage */ } }
    placerMire();
    majAide();
  }

  // ---------- le son (trois coups un peu différents, jamais deux fois le même de suite) ----------
  const EXT = new Audio().canPlayType('audio/ogg; codecs="opus"') ? "ogg" : "mp3";
  const audios = SONS.map((s) => { const a = new Audio(`/son/bonk/${s}.${EXT}`); a.preload = "auto"; return a; });
  let dernierSon = -1;
  let bloque = false; // un navigateur qui attend un clic avant de laisser passer le son (pas OBS)
  function sonner() {
    if (!SON || CAPTURE) return;
    let i = Math.floor(Math.random() * audios.length);
    if (i === dernierSon) i = (i + 1) % audios.length;
    dernierSon = i;
    const a = audios[i];
    try { a.pause(); a.currentTime = 0; } catch { /* pas encore chargé */ }
    const p = a.play();
    if (p && typeof p.catch === "function") p.then(() => { if (bloque) { bloque = false; majAide(); } }).catch(() => { bloque = true; majAide(); });
  }

  // ---------- un bonk ----------
  let joues = 0;
  function bonk(par = "") {
    joues += 1;
    const gauche = cible.x < 42; // la tête est à gauche : le marteau vient de la gauche, la bulle part à droite
    const haut = cible.y < 22; // trop près du haut : la bulle passe en dessous
    const racine = el("div", `bonk${gauche ? " gauche" : ""}`);
    racine.style.left = `${cible.x}%`;
    racine.style.top = `${cible.y}%`;
    if (TAILLE !== 1) racine.style.transform = `scale(${TAILLE})`;

    // le marteau (retourné quand il vient de la gauche), l'onde et les traits du choc
    const cote = el("div", "bonk-cote");
    const onde = dessin("bonk-onde", ONDE);
    const traits = TRAITS.map((a) => { const n = el("div", "bonk-trait"); n.dataset.a = String(a); return n; });
    const tete = dessin("bonk-tete", TETE);
    const manche = dessin("bonk-manche", MANCHE_SVG);
    const marteau = el("div", "bonk-marteau", manche, tete);
    marteau.style.transformOrigin = `${PIVOT.x.toFixed(2)}rem ${PIVOT.y.toFixed(2)}rem`;
    cote.append(onde, ...traits, marteau);

    // les étoiles qui tournent autour de la tête, et quelques éclats
    const etoiles = COULEURS_ETOILES.map((c) => dessin("bonk-etoile", ETOILE(c)));
    const eclats = ECLATS.map((e) => { const n = dessin("bonk-eclat", ECLAT); n.style.left = `${e.x - 2.4}rem`; n.style.top = `${e.y - 2.4}rem`; return n; });

    // la bulle « BONK ! » et le pseudo
    const bulle = el("div", "bonk-bulle");
    bulle.style.left = `${gauche ? 38 : -38}rem`;
    bulle.style.top = `${haut ? 13 : -16}rem`;
    const dedans = dessin("bonk-bulle-in", BULLE);
    const nom = String(par || "").replace(/[\u0000-\u001f\u007f<>`@]/g, "").trim().slice(0, 25);
    let ligne = null;
    if (PSEUDO && nom) {
      ligne = el("span", "", "par ", el("b", "", nom));
      dedans.append(el("div", "bonk-par", ligne));
    }
    bulle.append(dedans);
    racine.append(cote, ...eclats, bulle, ...etoiles);
    document.body.append(racine);

    // — le marteau : il arrive en haut à droite déjà levé, s'arme, s'abat (impact à 430 ms), rebondit, puis repart —
    const pose = (x, y, a) => `translate(${x}rem, ${y}rem) rotate(${a}deg)`;
    anime(marteau, [
      { offset: 0, transform: pose(56, -36, 30), opacity: 0, easing: "cubic-bezier(.2, .8, .3, 1)" },
      { offset: 0.05, opacity: 1 },
      { offset: 0.147, transform: pose(0, 0, 34), easing: "ease-in-out" },
      { offset: 0.207, transform: pose(0, 0, 43), easing: "cubic-bezier(.55, 0, 1, .45)" },
      { offset: IMPACT / 1500, transform: pose(0, 0, -4) },
      { offset: 0.32, transform: pose(0, 0, -2), easing: "cubic-bezier(.2, .7, .3, 1)" },
      { offset: 0.4, transform: pose(0, 0, 25), easing: "ease-in-out" },
      { offset: 0.507, transform: pose(0, 0, 9), easing: "ease-in-out" },
      { offset: 0.6, transform: pose(0, 0, 15), easing: "ease-in-out" },
      { offset: 0.7, transform: pose(0, 0, 11), opacity: 1, easing: "cubic-bezier(.5, 0, .9, .5)" },
      { offset: 0.86, opacity: 1 },
      { offset: 1, transform: pose(62, -58, 52), opacity: 0 },
    ], { duration: 1500, easing: "linear" });
    // la tête du marteau s'écrase sur la tête, puis reprend sa forme en tremblotant (c'est gonflable)
    anime(tete, [
      { offset: 0, transform: "scale(1, 1)" },
      { offset: (IMPACT - 5) / 1500, transform: "scale(1, 1)" },
      { offset: (IMPACT + 15) / 1500, transform: "scale(1.24, 0.7)" },
      { offset: 0.34, transform: "scale(0.9, 1.13)" },
      { offset: 0.39, transform: "scale(1.07, 0.94)" },
      { offset: 0.45, transform: "scale(0.97, 1.03)" },
      { offset: 0.52, transform: "scale(1, 1)" },
      { offset: 1, transform: "scale(1, 1)" },
    ], { duration: 1500, easing: "ease-out" });
    // le choc : une onde et des traits qui partent
    anime(onde, [{ transform: "scale(0.35)", opacity: 1 }, { transform: "scale(1.45)", opacity: 0 }], { duration: 420, delay: IMPACT, easing: "cubic-bezier(.2, .8, .3, 1)" });
    for (const n of traits) {
      const a = Number(n.dataset.a);
      anime(n, [
        { transform: `rotate(${a}deg) translateX(10.5rem) scaleX(0.3)`, opacity: 1 },
        { transform: `rotate(${a}deg) translateX(19rem) scaleX(1)`, opacity: 0 },
      ], { duration: 340, delay: IMPACT + 10, easing: "cubic-bezier(.2, .8, .3, 1)" });
    }
    // les étoiles : une ellipse autour du haut de la tête (celles de derrière plus petites et plus pâles)
    const T0 = IMPACT + 10;
    const T1 = DUREE;
    const RX = 16.5;
    const RY = 4.2;
    const CY = -2.2;
    const TOUR = 1050;
    etoiles.forEach((n, i) => {
      const images = [];
      const N = 90;
      const phase = (i / etoiles.length) * Math.PI * 2;
      for (let k = 0; k <= N; k++) {
        const u = (k / N) * (T1 - T0);
        const th = phase + (u / TOUR) * Math.PI * 2;
        const d = (Math.sin(th) + 1) / 2;
        const entree = doux(u / 170);
        const sortie = doux((T1 - T0 - u) / 380);
        const s = (0.62 + 0.38 * d) * entree * (0.55 + 0.45 * sortie);
        images.push({ transform: `translate(${(RX * Math.cos(th)).toFixed(2)}rem, ${(CY + RY * Math.sin(th)).toFixed(2)}rem) scale(${s.toFixed(3)})`, opacity: ((0.5 + 0.5 * d) * sortie).toFixed(3) });
      }
      anime(n, images, { duration: T1 - T0, delay: T0, easing: "linear" });
      anime(n.firstElementChild, [{ transform: "rotate(0deg)" }, { transform: `rotate(${i % 2 ? -360 : 360}deg)` }], { duration: 900, delay: T0, iterations: Math.ceil((T1 - T0) / 900), easing: "linear" });
    });
    for (const [k, n] of eclats.entries()) {
      anime(n, [{ transform: "scale(0) rotate(0deg)", opacity: 1 }, { transform: "scale(1) rotate(45deg)", opacity: 1, offset: 0.45 }, { transform: "scale(0) rotate(90deg)", opacity: 0 }], { duration: 460, delay: ECLATS[k].t, easing: "ease-out" });
    }
    // la bulle : elle éclate au moment du choc, tremble un peu, reste, puis se replie
    anime(dedans, [
      { offset: 0, transform: "scale(0) rotate(-28deg)", opacity: 1 },
      { offset: 0.06, transform: "scale(1.2) rotate(-5deg)", opacity: 1 },
      { offset: 0.1, transform: "scale(0.93) rotate(-10deg)" },
      { offset: 0.14, transform: "scale(1.03) rotate(-7deg)" },
      { offset: 0.18, transform: "scale(1) rotate(-8deg)" },
      { offset: 0.84, transform: "scale(1) rotate(-8deg)", opacity: 1, easing: "cubic-bezier(.5, 0, .9, .5)" },
      { offset: 1, transform: "scale(0.3) rotate(-24deg)", opacity: 0 },
    ], { duration: DUREE - IMPACT + 20, delay: IMPACT - 10, easing: "linear" });
    if (ligne) {
      anime(ligne, [
        { offset: 0, transform: "translateY(1.4rem)", opacity: 0 },
        { offset: 0.12, transform: "translateY(0)", opacity: 1 },
        { offset: 0.8, transform: "translateY(0)", opacity: 1 },
        { offset: 1, transform: "translateY(-0.6rem)", opacity: 0 },
      ], { duration: DUREE - 660, delay: 640, easing: "ease-out" });
    }
    sonner();
    setTimeout(() => racine.remove(), DUREE + 80);
  }

  // un à la fois : ceux qui arrivent pendant un bonk attendent leur tour
  const file = [];
  let enCours = false;
  function suivant() {
    if (enCours || !file.length) return;
    enCours = true;
    bonk(file.shift());
    setTimeout(() => { enCours = false; suivant(); }, DUREE + 350);
  }
  function demander(par) {
    if (file.length >= 30) return;
    file.push(par);
    suivant();
  }

  // ---------- la connexion au serveur en direct du bot (l'adresse vient du site) ----------
  let ws = null;
  let adresse = "";
  let lu = false;
  let branche = false;
  let recompense = "";
  let droit = true;
  let essais = 0;
  let vu = 0;
  let minuteur = null;
  function debrancher() {
    const s = ws;
    ws = null;
    branche = false;
    if (s) { s.onopen = s.onmessage = s.onclose = s.onerror = null; try { s.close(); } catch { /* déjà fermée */ } }
  }
  function plusTard(ms) { clearTimeout(minuteur); minuteur = setTimeout(brancher, ms); }
  async function brancher() {
    clearTimeout(minuteur);
    if (ws) return;
    const d = await lire("/api/public");
    if (ws) return;
    if (d && !d.horsLigne) {
      lu = true;
      const x = d.bonk?.adresse;
      adresse = typeof x === "string" && /^wss:\/\/[a-z0-9.-]+(:\d{1,5})?\/bonk$/i.test(x) ? x : "";
    }
    majAide();
    if (!adresse) { plusTard(20_000); return; }
    let s = null;
    try { s = new WebSocket(adresse); } catch { s = null; }
    if (!s) { plusTard(20_000); return; }
    ws = s;
    s.onopen = () => { vu = Date.now(); s.send(JSON.stringify({ k: "bonjour", role: "obs" })); };
    s.onmessage = (e) => {
      vu = Date.now();
      let m = null;
      try { m = JSON.parse(e.data); } catch { return; }
      if (m?.k === "etat") { branche = true; essais = 0; recompense = String(m.recompense || "").slice(0, 60); droit = m.droit !== false; majAide(); }
      else if (m?.k === "bonk") demander(typeof m.par === "string" ? m.par : "");
    };
    s.onclose = () => {
      if (ws !== s) return;
      debrancher();
      essais += 1;
      majAide();
      plusTard(Math.min(30_000, 1_500 * 2 ** Math.min(essais, 5)));
    };
  }
  setInterval(() => {
    if (!ws || ws.readyState !== 1) return;
    if (Date.now() - vu > 50_000) { debrancher(); majAide(); plusTard(1_000); return; }
    try { ws.send(JSON.stringify({ k: "p", c: Date.now() })); } catch { /* elle se ferme */ }
  }, 15_000);

  // ---------- hors du live (navigateur, ou « Interagir » dans OBS) : l'aide, la cible, un bouton pour essayer ----------
  let aide = null;
  let aideLigne = null;
  let cibleLigne = null;
  let mire = null;
  let aideMinuteur = null;
  function placerMire() {
    if (!mire) return;
    mire.style.left = `${cible.x}%`;
    mire.style.top = `${cible.y}%`;
  }
  function majAide() {
    if (!aideLigne) return;
    const etat = ESSAI ? "Essai : un bonk toutes les 6 secondes, sans le bot."
      : !lu ? "Connexion au site…"
      : !adresse ? "⏳ Le bot ne propose pas encore le BONK (sa mise à jour n'est pas installée)."
      : branche && !droit ? "⛔ Le bot ne voit pas encore tes récompenses : refais /objectif connecter sur le Discord de Barhaw."
      : branche ? `✅ Branchée au bot${recompense ? ` : récompense « ${recompense} »` : " : la récompense pas encore trouvée (sur Twitch, une récompense avec « bonk » dans son titre)"}.`
      : "⏳ Connexion au bot…";
    const plus = bloque ? " 🔇 Clique une fois sur la page pour autoriser le son." : "";
    if (aideLigne.textContent !== etat + plus) aideLigne.textContent = etat + plus;
    const c = `🎯 Cible : ${String(cible.x).replace(".", ",")} % depuis la gauche, ${String(cible.y).replace(".", ",")} % depuis le haut.${imposee ? " (Imposée par l'adresse : change ?x= et ?y= dans les propriétés de la source.)" : ` Pour la garder à coup sûr, ajoute à l'adresse : &x=${cible.x}&y=${cible.y}`}`;
    if (cibleLigne.textContent !== c) cibleLigne.textContent = c;
  }
  function montrerAide() {
    if (CAPTURE) return;
    if (!aide) {
      aideLigne = el("p", "aide-etat", "");
      cibleLigne = el("p", "", "");
      const essai = el("button", "", "▶ Essayer");
      essai.type = "button";
      essai.addEventListener("click", () => demander("Moussaillon"));
      const zero = el("button", "", "↺ Cible de départ");
      zero.type = "button";
      zero.addEventListener("click", () => { try { localStorage.removeItem(CLE); } catch { /* rien */ } viser(DEFAUT.x, DEFAUT.y, false); });
      aide = el("div", "aide",
        el("b", "", "Le BONK (points de chaîne)"),
        el("p", "", "Quand un viewer prend ta récompense « BONK », un gros marteau gonflable tombe sur ta tête, avec un « BONK ! » et des étoiles. « !bonk » dans ton chat (toi ou un modo) : un essai gratuit."),
        el("p", "", "Dans OBS : une source « Navigateur » avec cette adresse, en 1920 × 1080 (tout l'écran), au-dessus de ta cam, « Contrôler l'audio via OBS » coché."),
        el("p", "", "Viser ta tête : clic droit sur la source → « Interagir », puis clique ici là où est le haut de ta tête (la cible rose se voit dans l'aperçu d'OBS). Les flèches du clavier l'ajustent."),
        aideLigne,
        cibleLigne,
        el("div", "aide-sons", essai, zero));
      mire = el("div", "bonk-mire", el("i"), el("span", "", "le haut de ta tête"));
      document.body.append(mire, aide);
      placerMire();
      majAide();
    }
    aide.hidden = false;
    mire.hidden = false;
    clearTimeout(aideMinuteur);
    aideMinuteur = setTimeout(() => { if (aide) aide.hidden = true; if (mire) mire.hidden = true; }, DANS_OBS ? 10_000 : 15_000);
  }
  for (const geste of ["pointermove", "pointerdown", "keydown"]) window.addEventListener(geste, montrerAide, { passive: true });
  // un clic (hors de l'aide) pose la cible ; un clic autorise aussi le son dans un navigateur
  window.addEventListener("pointerdown", (e) => {
    if (CAPTURE) return;
    if (bloque) {
      bloque = false;
      const a = audios[0];
      try { a.muted = true; a.play().then(() => { a.pause(); a.muted = false; a.currentTime = 0; }).catch(() => { a.muted = false; }); } catch { /* tant pis */ }
    }
    if (aide && aide.contains(e.target)) return;
    viser((e.clientX / Math.max(1, window.innerWidth)) * 100, (e.clientY / Math.max(1, window.innerHeight)) * 100);
  }, { passive: true });
  window.addEventListener("keydown", (e) => {
    const pas = e.shiftKey ? 2 : 0.5;
    const dx = e.key === "ArrowLeft" ? -pas : e.key === "ArrowRight" ? pas : 0;
    const dy = e.key === "ArrowUp" ? -pas : e.key === "ArrowDown" ? pas : 0;
    if (!dx && !dy) return;
    e.preventDefault();
    viser(cible.x + dx, cible.y + dy);
  });

  window.__obsBonk = {
    etat: () => ({ essai: ESSAI, adresse, lu, branche, recompense, droit, bloque, ext: EXT, joues, cible: { ...cible }, imposee, taille: TAILLE, file: file.length, enCours }),
    bonk: (par = "") => demander(par),
    viser: (x, y) => viser(x, y, false),
  };

  if (ESSAI) {
    const tour = () => { demander("Moussaillon"); setTimeout(tour, 6_000); };
    setTimeout(tour, 600);
  } else brancher();
}
