// Les affiches WANTED en 3D (partie « Chasse » du site, et la Battle Royale) : du vrai papier qui vit.
//   • l'affiche pend à sa punaise : elle se balance, le vent soulève le bas et les coins, la lumière de la lanterne
//     vacille, de la poussière flotte dans le faisceau ; à la souris elle penche vers toi ; un clic la fait valser
//   • la photo de profil ressort en 3D : le fond de la photo est repéré (sa couleur, depuis les bords), la personne est
//     découpée, gonflée en relief (plus épaisse au centre) et posée devant l'affiche ; elle dépasse du cadre par le
//     haut, et la lumière lui fait une ombre sur le papier. Une photo trop chargée pour être découpée ressort quand même,
//     en coussin dans son cadre
//   • l'arrivée : l'affiche tombe, se plante sur sa punaise dans un nuage de poussière, la prime défile jusqu'à son
//     montant, puis le tampon claque s'il y en a un (SURVIVANT, ÉLIMINÉ : la Battle Royale)
// Chaque affiche prend la place d'une affiche de la page (son « emplacement ») : la toile 3D est posée par-dessus,
// un peu plus grande pour que la photo puisse dépasser. Sans WebGL, les affiches de la page restent.
// creerWanted3D(toile, { zone, petit, reduit, photo }) → { placer([{ el, donnees }]), secouer(i), pause(oui), redimensionner(), arreter() }
//   donnees : { nom, avatar, prime, inconnu, tampon: "survivant" | "elimine" | null, epingle: "rose" | "or" | "argent" | "bronze" }
//   photo(url) → l'adresse à charger (le site passe les photos Discord par /api/chopper, pour avoir le droit de les lire)
import * as THREE from "./three-r170.module.min.js";

const RATIO = 860 / 600; // hauteur / largeur de l'affiche (comme celle du bot)
const ENCRE = "#3b2410";
const ENCRE_FONCE = "#1e120a";
// la place des choses sur l'affiche, en fraction de la hauteur (y, depuis le haut) et de la largeur (l)
const P = {
  wanted: 0.112, fenetre: { haut: 0.19, l: 0.64 }, mort: 0.712, nom: 0.785, prime: 0.866, pied: 0.937, clou: 0.034,
};
const EPINGLES = { rose: 0xff4f9a, or: 0xffc83d, argent: 0xd9dde6, bronze: 0xd9824a };
const TAMPONS = { survivant: { mot: "SURVIVANT", couleur: "#1d8a4a", angle: -0.24 }, elimine: { mot: "ÉLIMINÉ", couleur: "#c41e22", angle: -0.3 } };
const nombre = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

// ---------- un peu de hasard qui se rejoue (la même affiche a toujours les mêmes taches) ----------
function hasard(graine) {
  let s = (Math.abs(Math.floor(graine)) % 2147483646) + 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
const hacher = (t) => [...String(t)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 17);
const lisse = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// les polices du site (Dela Gothic One pour les titres, M PLUS Rounded pour le reste) : attendues avant d'imprimer
let policesPretes = null;
function polices() {
  policesPretes ||= Promise.race([
    Promise.all([
      document.fonts?.load?.('400 80px "Dela Gothic One"', "WANTED 0123456789"),
      document.fonts?.load?.('800 40px "M PLUS Rounded 1c"', "DEAD OR ALIVE ฿"),
    ]).catch(() => {}),
    new Promise((ok) => setTimeout(ok, 2500)),
  ]);
  return policesPretes;
}
const TITRE = (t) => `400 ${t}px "Dela Gothic One", "M PLUS Rounded 1c", sans-serif`;
const FORT = (t) => `800 ${t}px "M PLUS Rounded 1c", system-ui, sans-serif`;

function toile(l, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(l));
  c.height = Math.max(1, Math.round(h));
  return c;
}
function texture(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
// un texte espacé (lettre par lettre), centré, réduit pour tenir dans la largeur
function texteEspace(g, texte, x, y, { police, taille, min = taille * 0.5, largeur, espace = 0, couleur }) {
  let t = taille;
  const mesurer = (s) => {
    g.font = police(s);
    return [...texte].reduce((a, c) => a + g.measureText(c).width, 0) + espace * (s / taille) * Math.max(0, [...texte].length - 1);
  };
  while (t > min && mesurer(t) > largeur) t -= 1;
  let mot = texte;
  if (mesurer(t) > largeur) {
    const l = [...texte];
    const essai = (s) => { const garde = texte; texte = s; const m = mesurer(t); texte = garde; return m; };
    while (l.length > 1 && essai(`${l.join("")}…`) > largeur) l.pop();
    mot = `${l.join("")}…`;
  }
  g.font = police(t);
  g.fillStyle = couleur;
  g.textBaseline = "middle";
  const e = espace * (t / taille);
  const total = [...mot].reduce((a, c) => a + g.measureText(c).width, 0) + e * Math.max(0, [...mot].length - 1);
  let cx = x - total / 2;
  for (const c of mot) {
    g.fillText(c, cx, y);
    cx += g.measureText(c).width + e;
  }
  return t;
}

// ---------- le papier ----------
let grain = null;
function motifGrain() {
  if (grain) return grain;
  const c = toile(192, 192);
  const g = c.getContext("2d");
  const im = g.createImageData(192, 192);
  const r = hasard(7);
  for (let k = 0; k < im.data.length; k += 4) {
    const v = 120 + r() * 135;
    im.data[k] = v; im.data[k + 1] = v * 0.92; im.data[k + 2] = v * 0.8; im.data[k + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  grain = c;
  return c;
}
// le bord déchiré et brûlé de l'affiche : un contour qui tremble
function contour(g, L, H, r) {
  const m = L * 0.014;
  const pts = [];
  const cote = (x0, y0, x1, y1, n) => {
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const off = m * (0.35 + r() * 0.9);
      const nx = y1 - y0, ny = x0 - x1, d = Math.hypot(nx, ny) || 1;
      pts.push([x0 + (x1 - x0) * t - (nx / d) * off, y0 + (y1 - y0) * t - (ny / d) * off]);
    }
  };
  cote(0, 0, L, 0, 46); cote(L, 0, L, H, 66); cote(L, H, 0, H, 46); cote(0, H, 0, 0, 66);
  g.beginPath();
  pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
}
// la fenêtre de la photo, en pixels de la texture du papier
function fenetrePx(L, H) {
  const l = L * P.fenetre.l;
  return { x: (L - l) / 2, y: H * P.fenetre.haut, l, h: l };
}
function dessinerPapier(L, d) {
  const H = Math.round(L * RATIO);
  const c = toile(L, H);
  const g = c.getContext("2d");
  const r = hasard(hacher(d.nom || "?") + 3);
  // le fond : papier jauni, plus sombre sur les bords, du grain, des taches
  g.save();
  contour(g, L, H, r);
  g.clip();
  const fond = g.createRadialGradient(L * 0.5, H * 0.45, L * 0.1, L * 0.5, H * 0.5, H * 0.72);
  fond.addColorStop(0, "#f6e3b4");
  fond.addColorStop(0.6, "#ecd29a");
  fond.addColorStop(1, "#c99a58");
  g.fillStyle = fond;
  g.fillRect(0, 0, L, H);
  g.globalCompositeOperation = "multiply";
  g.globalAlpha = 0.22;
  g.fillStyle = g.createPattern(motifGrain(), "repeat");
  g.fillRect(0, 0, L, H);
  g.globalAlpha = 1;
  for (let k = 0; k < 6; k++) {
    const x = r() * L, y = r() * H, rr = L * (0.06 + r() * 0.16);
    const t = g.createRadialGradient(x, y, 0, x, y, rr);
    t.addColorStop(0, `rgba(150,95,35,${0.08 + r() * 0.12})`);
    t.addColorStop(0.7, "rgba(150,95,35,0.04)");
    t.addColorStop(1, "rgba(150,95,35,0)");
    g.fillStyle = t;
    g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  g.globalCompositeOperation = "source-over";
  // les plis (l'affiche a été pliée en quatre)
  for (const [x0, y0, x1, y1] of [[L * 0.5, 0, L * 0.505, H], [0, H * 0.505, L, H * 0.5]]) {
    g.strokeStyle = "rgba(95,55,18,0.16)"; g.lineWidth = L * 0.004;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.strokeStyle = "rgba(255,244,214,0.28)"; g.lineWidth = L * 0.003;
    g.beginPath(); g.moveTo(x0 + L * 0.004, y0 + L * 0.004); g.lineTo(x1 + L * 0.004, y1 + L * 0.004); g.stroke();
  }
  // le bord brûlé
  g.restore();
  g.save();
  contour(g, L, H, hasard(hacher(d.nom || "?") + 3));
  g.clip();
  g.globalCompositeOperation = "multiply";
  for (const [k, a] of [[0.011, 0.42], [0.03, 0.14]]) {
    g.strokeStyle = `rgba(96,58,26,${a})`;
    g.lineWidth = L * k * 2;
    contour(g, L, H, hasard(hacher(d.nom || "?") + 3));
    g.stroke();
  }
  g.restore();

  // l'encre (sur un calque, un peu usée), puis posée sur le papier
  const e = toile(L, H);
  const ge = e.getContext("2d");
  ge.strokeStyle = ENCRE;
  ge.globalAlpha = 0.88;
  ge.lineWidth = L * 0.009;
  ge.strokeRect(L * 0.04, L * 0.04, L * 0.92, H - L * 0.08);
  ge.globalAlpha = 0.5;
  ge.lineWidth = L * 0.0035;
  ge.strokeRect(L * 0.062, L * 0.062, L * 0.876, H - L * 0.124);
  ge.globalAlpha = 1;
  texteEspace(ge, "WANTED", L / 2, H * P.wanted, { police: TITRE, taille: L * 0.175, largeur: L * 0.8, espace: L * 0.012, couleur: ENCRE });
  const f = fenetrePx(L, H);
  ge.lineWidth = L * 0.018;
  ge.strokeStyle = ENCRE;
  ge.strokeRect(f.x - L * 0.009, f.y - L * 0.009, f.l + L * 0.018, f.h + L * 0.018);
  texteEspace(ge, "DEAD OR ALIVE", L / 2, H * P.mort, { police: FORT, taille: L * 0.062, largeur: L * 0.78, espace: L * 0.008, couleur: ENCRE });
  texteEspace(ge, String(d.nom || "?").toUpperCase(), L / 2, H * P.nom, { police: TITRE, taille: L * 0.088, min: L * 0.045, largeur: L * 0.8, espace: L * 0.004, couleur: ENCRE_FONCE });
  ge.globalAlpha = 0.75;
  texteEspace(ge, "BERRYS · BARHAW", L / 2, H * P.pied, { police: FORT, taille: L * 0.032, largeur: L * 0.7, espace: L * 0.016, couleur: ENCRE });
  ge.globalAlpha = 1;
  // l'encre usée : un peu de papier qui transparaît
  ge.globalCompositeOperation = "destination-out";
  ge.globalAlpha = 0.18;
  ge.fillStyle = g.createPattern(motifGrain(), "repeat");
  ge.fillRect(0, 0, L, H);
  g.drawImage(e, 0, 0);
  // le trou de la fenêtre (on voit la photo au fond)
  g.clearRect(f.x, f.y, f.l, f.h);
  return c;
}
// le relief du papier (les fibres et les plis), pour la lumière rasante
function reliefPapier(L) {
  const H = Math.round(L * RATIO);
  const c = toile(L, H);
  const g = c.getContext("2d");
  const r = hasard(11);
  const im = g.createImageData(L, H);
  const h = new Float32Array(L * H);
  for (let k = 0; k < h.length; k++) h[k] = r();
  // un peu de flou pour faire des fibres, et les plis
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < L; x++) {
      const k = y * L + x;
      let v = (h[k] + h[(k + 1) % h.length] + h[(k + L) % h.length]) / 3;
      v -= 0.5 * Math.exp(-(((x - L * 0.5) / (L * 0.004)) ** 2)) + 0.5 * Math.exp(-(((y - H * 0.5) / (L * 0.004)) ** 2));
      h[k] = v;
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < L; x++) {
      const k = y * L + x;
      const dx = h[y * L + Math.min(L - 1, x + 1)] - h[y * L + Math.max(0, x - 1)];
      const dy = h[Math.min(H - 1, y + 1) * L + x] - h[Math.max(0, y - 1) * L + x];
      const n = [-dx * 1.6, -dy * 1.6, 1];
      const ln = Math.hypot(...n);
      im.data[k * 4] = ((n[0] / ln) * 0.5 + 0.5) * 255;
      im.data[k * 4 + 1] = ((-n[1] / ln) * 0.5 + 0.5) * 255;
      im.data[k * 4 + 2] = ((n[2] / ln) * 0.5 + 0.5) * 255;
      im.data[k * 4 + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);
  return c;
}
// la prime : à part, pour la faire défiler sans réimprimer toute l'affiche
function dessinerPrime(c, valeur, inconnu) {
  const g = c.getContext("2d");
  const L = c.width, H = c.height;
  g.clearRect(0, 0, L, H);
  const chiffres = inconnu ? "???" : nombre(valeur);
  let t = H * 0.78;
  const mesure = (s) => { g.font = TITRE(s); const a = g.measureText(chiffres).width; g.font = FORT(s * 0.9); return a + s * 0.25 + g.measureText("฿").width; };
  while (t > H * 0.4 && mesure(t) > L * 0.94) t -= 1;
  const total = mesure(t);
  let x = (L - total) / 2;
  g.textBaseline = "middle";
  g.fillStyle = ENCRE_FONCE;
  g.font = TITRE(t);
  g.fillText(chiffres, x, H * 0.54);
  x += g.measureText(chiffres).width + t * 0.25;
  g.font = FORT(t * 0.9);
  g.fillText("฿", x, H * 0.52);
}
function dessinerTampon(type) {
  const T = TAMPONS[type];
  const c = toile(512, 512);
  if (!T) return c;
  const g = c.getContext("2d");
  g.translate(256, 256);
  g.rotate(T.angle);
  g.font = TITRE(96);
  let t = 96;
  while (t > 40 && g.measureText(T.mot).width > 400) { t -= 2; g.font = TITRE(t); }
  const l = g.measureText(T.mot).width + 56, h = t * 1.25 + 28;
  g.strokeStyle = T.couleur;
  g.fillStyle = T.couleur;
  g.lineWidth = 12;
  g.beginPath();
  g.roundRect(-l / 2, -h / 2, l, h, 20);
  g.stroke();
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(T.mot, 0, 6);
  // l'encre du tampon ne prend pas partout
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = "destination-out";
  const r = hasard(hacher(type));
  for (let k = 0; k < 1400; k++) {
    g.globalAlpha = 0.25 + r() * 0.6;
    g.beginPath();
    g.arc(r() * 512, r() * 512, 0.6 + r() * 2.4, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

// ---------- la photo : on repère le fond, on découpe la personne, on la gonfle ----------
const N = 128; // la taille de l'analyse
function versLab(r, g, b) {
  const f = (v) => { v /= 255; return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92; };
  const R = f(r), G = f(g), B = f(b);
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, y = R * 0.2126 + G * 0.7152 + B * 0.0722, z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const h = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * h(y) - 16, 500 * (h(x) - h(y)), 200 * (h(y) - h(z))];
}
// pixels (RGBA, N × N) → { masque (0..1), profondeur (0..1), plaque (RGBA sans la personne), boite, decoupe }
export function decouper(px, n = N) {
  const T = n * n;
  const lab = new Float32Array(T * 3);
  for (let k = 0; k < T; k++) {
    const [L, a, b] = versLab(px[k * 4], px[k * 4 + 1], px[k * 4 + 2]);
    lab[k * 3] = L; lab[k * 3 + 1] = a; lab[k * 3 + 2] = b;
  }
  const dist = (k, c) => Math.hypot(lab[k * 3] - c[0], lab[k * 3 + 1] - c[1], lab[k * 3 + 2] - c[2]);
  // les couleurs du fond : celles des bords (le haut et les côtés surtout : la personne touche souvent le bas)
  const bords = [];
  for (let k = 0; k < n; k++) {
    for (let e = 0; e < 3; e++) {
      bords.push(e * n + k, k * n + e, k * n + (n - 1 - e));
      if (k % 3 === 0) bords.push((n - 1 - e) * n + k);
    }
  }
  // 3 groupes de couleurs (k-moyennes), on garde ceux qui comptent
  let centres = [0, Math.floor(bords.length / 3), Math.floor((2 * bords.length) / 3)].map((i) => [lab[bords[i] * 3], lab[bords[i] * 3 + 1], lab[bords[i] * 3 + 2]]);
  let groupe = new Int32Array(bords.length);
  for (let it = 0; it < 10; it++) {
    const s = centres.map(() => [0, 0, 0, 0]);
    bords.forEach((p, i) => {
      let m = 0, dm = Infinity;
      centres.forEach((c, j) => { const d = dist(p, c); if (d < dm) { dm = d; m = j; } });
      groupe[i] = m;
      s[m][0] += lab[p * 3]; s[m][1] += lab[p * 3 + 1]; s[m][2] += lab[p * 3 + 2]; s[m][3]++;
    });
    centres = centres.map((c, j) => (s[j][3] ? [s[j][0] / s[j][3], s[j][1] / s[j][3], s[j][2] / s[j][3]] : c));
  }
  const fonds = centres.map((c, j) => {
    const membres = bords.filter((_, i) => groupe[i] === j);
    const ecart = membres.length ? Math.sqrt(membres.reduce((a, p) => a + dist(p, c) ** 2, 0) / membres.length) : 99;
    return { c, part: membres.length / bords.length, seuil: Math.min(26, Math.max(9, ecart * 2.3 + 6)) };
  }).filter((f) => f.part >= 0.12);
  const estFond = (k) => fonds.some((f) => dist(k, f.c) < f.seuil);
  // le fond se répand depuis les bords, sans passer les contours nets
  const fond = new Uint8Array(T);
  const file = [];
  for (const p of bords) if (!fond[p] && estFond(p)) { fond[p] = 1; file.push(p); }
  while (file.length) {
    const p = file.pop();
    const x = p % n, y = (p - x) / n;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + dx, Y = y + dy;
      if (X < 0 || Y < 0 || X >= n || Y >= n) continue;
      const q = Y * n + X;
      if (fond[q] || !estFond(q)) continue;
      const saut = Math.hypot(lab[p * 3] - lab[q * 3], lab[p * 3 + 1] - lab[q * 3 + 1], lab[p * 3 + 2] - lab[q * 3 + 2]);
      if (saut > 22) continue;
      fond[q] = 1;
      file.push(q);
    }
  }
  // la personne : le plus grand morceau qui n'est pas du fond (les petites miettes partent)
  const etiquette = new Int32Array(T).fill(-1);
  const tailles = [];
  for (let k = 0; k < T; k++) {
    if (fond[k] || etiquette[k] >= 0) continue;
    const id = tailles.length;
    let compte = 0;
    const pile = [k];
    etiquette[k] = id;
    while (pile.length) {
      const p = pile.pop();
      compte++;
      const x = p % n, y = (p - x) / n;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= n || Y >= n) continue;
        const q = Y * n + X;
        if (fond[q] || etiquette[q] >= 0) continue;
        etiquette[q] = id;
        pile.push(q);
      }
    }
    tailles.push(compte);
  }
  const garder = new Set(tailles.map((t, i) => [t, i]).filter(([t]) => t >= T * 0.02).map(([, i]) => i));
  const dedans = new Uint8Array(T);
  for (let k = 0; k < T; k++) if (etiquette[k] >= 0 && garder.has(etiquette[k])) dedans[k] = 1;
  const aire = dedans.reduce((a, v) => a + v, 0);
  const part = aire / T;
  let bordFond = 0, bordTotal = 0;
  for (let k = 0; k < n; k++) for (const p of [k, k * n, k * n + n - 1]) { bordTotal++; bordFond += fond[p]; }
  // une bonne découpe : une forme d'un seul tenant, pas trop déchiquetée, sur un fond assez uni
  let perimetre = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (!dedans[y * n + x]) continue;
    if (x === 0 || x === n - 1 || y === 0 || y === n - 1) { if (y !== n - 1) perimetre++; continue; }
    if (!dedans[y * n + x - 1] || !dedans[y * n + x + 1] || !dedans[(y - 1) * n + x] || !dedans[(y + 1) * n + x]) perimetre++;
  }
  const rondeur = perimetre ? (4 * Math.PI * aire) / (perimetre * perimetre) : 0;
  const principal = Math.max(0, ...tailles.filter((t, i) => garder.has(i)));
  const fondUni = fonds.length > 0 && fonds.reduce((a, f) => a + f.seuil * f.part, 0) / fonds.reduce((a, f) => a + f.part, 0) < 19;
  const decoupe = part > 0.1 && part < 0.86 && bordFond / bordTotal > 0.68 && fondUni && rondeur > 0.25 && principal >= aire * 0.45 && garder.size <= 4;
  if (!decoupe) {
    // une photo trop chargée : toute la photo ressort, en coussin
    for (let k = 0; k < T; k++) dedans[k] = 1;
  }
  // le masque adouci
  let m = Float32Array.from(dedans);
  const flou = (a, rayon) => {
    const b = new Float32Array(T);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      let s = 0, c = 0;
      for (let dy = -rayon; dy <= rayon; dy++) for (let dx = -rayon; dx <= rayon; dx++) {
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= n || Y >= n) continue;
        s += a[Y * n + X]; c++;
      }
      b[y * n + x] = s / c;
    }
    return b;
  };
  if (decoupe) m = flou(flou(m, 1), 1);
  // le relief : la distance au bord de la personne (elle est plus épaisse au milieu), un peu de lumière pour les détails
  const d = new Float32Array(T);
  for (let k = 0; k < T; k++) d[k] = dedans[k] ? 1e9 : 0;
  if (!decoupe) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) d[y * n + x] = Math.min(x + 1, y + 1, n - x, n - y);
  else {
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const k = y * n + x;
      if (!d[k]) continue;
      if (x > 0) d[k] = Math.min(d[k], d[k - 1] + 1);
      if (y > 0) d[k] = Math.min(d[k], d[k - n] + 1);
      if (x > 0 && y > 0) d[k] = Math.min(d[k], d[k - n - 1] + 1.4);
      if (x < n - 1 && y > 0) d[k] = Math.min(d[k], d[k - n + 1] + 1.4);
    }
    for (let y = n - 1; y >= 0; y--) for (let x = n - 1; x >= 0; x--) {
      const k = y * n + x;
      if (!d[k]) continue;
      if (x < n - 1) d[k] = Math.min(d[k], d[k + 1] + 1);
      if (y < n - 1) d[k] = Math.min(d[k], d[k + n] + 1);
      if (x < n - 1 && y < n - 1) d[k] = Math.min(d[k], d[k + n + 1] + 1.4);
      if (x > 0 && y < n - 1) d[k] = Math.min(d[k], d[k + n - 1] + 1.4);
    }
  }
  let dmax = 1;
  for (let k = 0; k < T; k++) if (d[k] < 1e8) dmax = Math.max(dmax, d[k]);
  let prof = new Float32Array(T);
  for (let k = 0; k < T; k++) {
    const base = d[k] >= 1e8 ? 0 : Math.sqrt(Math.min(1, d[k] / dmax));
    prof[k] = dedans[k] ? base * (0.9 + (lab[k * 3] / 100 - 0.5) * 0.16) : 0;
  }
  prof = flou(flou(prof, 2), 1);
  // la plaque : la photo sans la personne (on bouche le trou avec la couleur du fond, qu'on diffuse)
  const plaque = new Uint8ClampedArray(px);
  if (decoupe) {
    const trou = new Uint8Array(T);
    for (let k = 0; k < T; k++) if (dedans[k] || m[k] > 0.02) trou[k] = 1;
    for (let k = 0; k < T; k++) if (trou[k]) {
      const x = k % n, y = (k - x) / n;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const X = x + dx, Y = y + dy;
        if (X >= 0 && Y >= 0 && X < n && Y < n) trou[Y * n + X] |= 2;
      }
    }
    const moyenne = [0, 0, 0];
    let c = 0;
    for (let k = 0; k < T; k++) if (!trou[k]) { moyenne[0] += px[k * 4]; moyenne[1] += px[k * 4 + 1]; moyenne[2] += px[k * 4 + 2]; c++; }
    for (let i = 0; i < 3; i++) moyenne[i] = c ? moyenne[i] / c : 128;
    for (let k = 0; k < T; k++) if (trou[k]) { plaque[k * 4] = moyenne[0]; plaque[k * 4 + 1] = moyenne[1]; plaque[k * 4 + 2] = moyenne[2]; }
    for (let it = 0; it < 60; it++) {
      for (let k = 0; k < T; k++) {
        if (!trou[k]) continue;
        const x = k % n, y = (k - x) / n;
        let s0 = 0, s1 = 0, s2 = 0, cc = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const X = x + dx, Y = y + dy;
          if (X < 0 || Y < 0 || X >= n || Y >= n) continue;
          const q = Y * n + X;
          s0 += plaque[q * 4]; s1 += plaque[q * 4 + 1]; s2 += plaque[q * 4 + 2]; cc++;
        }
        plaque[k * 4] = s0 / cc; plaque[k * 4 + 1] = s1 / cc; plaque[k * 4 + 2] = s2 / cc;
      }
    }
  }
  // la boîte de la personne (en fraction de l'image)
  let haut = n, bas = 0, gauche = n, droite = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (dedans[y * n + x]) {
    haut = Math.min(haut, y); bas = Math.max(bas, y); gauche = Math.min(gauche, x); droite = Math.max(droite, x);
  }
  return { masque: m, profondeur: prof, plaque, decoupe, rondeur, criteres: { part, bord: bordFond / bordTotal, fondUni, principal: principal / Math.max(1, aire), fonds: fonds.map((f) => [f.part.toFixed(2), f.seuil.toFixed(1)]) }, boite: { haut: haut / n, bas: (bas + 1) / n, gauche: gauche / n, droite: (droite + 1) / n } };
}

// une image en pixels N × N (recadrée au centre, comme la photo de l'affiche)
function pixels(img, n = N) {
  const c = toile(n, n);
  const g = c.getContext("2d", { willReadFrequently: true });
  const l = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const s = Math.min(l, h);
  g.fillStyle = "#d9bf8a"; // une photo transparente : du papier derrière
  g.fillRect(0, 0, n, n);
  g.drawImage(img, (l - s) / 2, (h - s) / 2, s, s, 0, 0, n, n);
  return g.getImageData(0, 0, n, n).data;
}
function chargerImage(url) {
  return new Promise((ok, ko) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.decoding = "async";
    i.referrerPolicy = "no-referrer";
    i.onload = () => ok(i);
    i.onerror = () => ko(new Error("image"));
    i.src = url;
    setTimeout(() => ko(new Error("trop long")), 12_000);
  });
}
// le pirate mystère (pas encore d'affiche) : une silhouette sombre et un point d'interrogation
function silhouette(n = 256) {
  const c = toile(n, n);
  const g = c.getContext("2d");
  g.fillStyle = "#d7b97f";
  g.fillRect(0, 0, n, n);
  g.strokeStyle = "rgba(160,120,60,0.35)";
  g.lineWidth = n * 0.04;
  for (let k = -n; k < n * 2; k += n * 0.11) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + n, n); g.stroke(); }
  g.fillStyle = "#2a1a10";
  g.beginPath(); g.arc(n * 0.5, n * 0.4, n * 0.19, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(n * 0.5, n * 1.02, n * 0.36, n * 0.36, 0, Math.PI, 0); g.fill();
  g.fillStyle = "#e8c98a";
  g.font = TITRE(n * 0.22);
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("?", n * 0.5, n * 0.42);
  return c;
}

// ---------- une affiche ----------
function creerAffiche({ petit, epingle = "rose" }) {
  const W = 1, H = RATIO;
  const pivot = new THREE.Group(); // la punaise : l'affiche tourne autour
  const corps = new THREE.Group();
  corps.position.y = -(H / 2 - P.clou * H);
  pivot.add(corps);
  const segX = petit ? 16 : 26, segY = petit ? 23 : 37;
  const geoPapier = new THREE.PlaneGeometry(W, H, segX, segY);
  const base = Float32Array.from(geoPapier.attributes.position.array);
  const matPapier = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86, metalness: 0, alphaTest: 0.5, side: THREE.DoubleSide });
  const papier = new THREE.Mesh(geoPapier, matPapier);
  papier.castShadow = true;
  papier.receiveShadow = true;
  corps.add(papier);
  // la fenêtre : une petite boîte en bois sombre dans l'affiche, la photo au fond
  const fl = P.fenetre.l * W;
  const fy = H / 2 - P.fenetre.haut * H - fl / 2; // le centre de la fenêtre
  const fond = 0.07;
  const matBois = new THREE.MeshStandardMaterial({ color: 0x2a170b, roughness: 0.8, side: THREE.DoubleSide });
  const parois = new THREE.Group();
  for (const [x, y, rz, l] of [[0, fl / 2, 0, fl], [0, -fl / 2, Math.PI, fl], [fl / 2, 0, -Math.PI / 2, fl], [-fl / 2, 0, Math.PI / 2, fl]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(l, fond), matBois);
    p.rotation.set(Math.PI / 2, 0, rz, "ZXY");
    p.position.set(x, fy + y, -fond / 2);
    p.receiveShadow = true;
    parois.add(p);
  }
  corps.add(parois);
  const matPlaque = new THREE.MeshStandardMaterial({ color: 0xfff1dc, roughness: 0.9 });
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(fl, fl), matPlaque);
  plaque.position.set(0, fy, -fond);
  plaque.receiveShadow = true;
  corps.add(plaque);
  // la personne qui ressort
  const segP = petit ? 56 : 88;
  const geoPerso = new THREE.PlaneGeometry(1, 1, segP, segP);
  geoPerso.setAttribute("relief", new THREE.BufferAttribute(new Float32Array(geoPerso.attributes.position.count), 1));
  // uCadre : la personne reste dans la fenêtre en bas (les épaules), elle ne dépasse que par le haut
  const uniformes = { uRelief: { value: 0.1 }, uCadre: { value: new THREE.Vector4(0, 1, 0, 0.55) } };
  const matPerso = new THREE.MeshStandardMaterial({ color: 0xdccfbf, roughness: 0.72, metalness: 0, alphaTest: 0.42, side: THREE.DoubleSide });
  const relief = (s) => {
    s.uniforms.uRelief = uniformes.uRelief;
    s.uniforms.uCadre = uniformes.uCadre;
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float relief;\nuniform float uRelief;\nvarying vec2 vCadre;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed.z += relief * uRelief;\nvCadre = uv;");
    s.fragmentShader = s.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec4 uCadre;\nvarying vec2 vCadre;")
      .replace("void main() {", "void main() {\n  if (vCadre.y < uCadre.w && (vCadre.x < uCadre.x || vCadre.x > uCadre.y)) discard;");
  };
  matPerso.onBeforeCompile = relief;
  const perso = new THREE.Mesh(geoPerso, matPerso);
  perso.castShadow = true;
  perso.receiveShadow = false;
  perso.visible = false;
  corps.add(perso);
  // la prime (sa propre texture, pour défiler)
  const cPrime = toile(petit ? 512 : 768, petit ? 96 : 144);
  const texPrime = texture(cPrime);
  const geoPrime = new THREE.PlaneGeometry(W * 0.9, W * 0.9 * (cPrime.height / cPrime.width), 10, 2);
  const basePrime = Float32Array.from(geoPrime.attributes.position.array);
  const prime = new THREE.Mesh(geoPrime, new THREE.MeshStandardMaterial({ map: texPrime, transparent: true, roughness: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  const yPrime = H / 2 - P.prime * H;
  prime.position.set(0, 0, 0.001);
  corps.add(prime);
  // le tampon
  const matTampon = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0, roughness: 0.7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
  const tampon = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.86, W * 0.86), matTampon);
  tampon.position.set(0, fy - fl * 0.12, 0.16);
  tampon.visible = false;
  corps.add(tampon);
  // la punaise
  const punaise = new THREE.Group();
  const matPunaise = new THREE.MeshStandardMaterial({ color: EPINGLES[epingle] || EPINGLES.rose, roughness: 0.28, metalness: epingle === "or" || epingle === "argent" ? 0.55 : 0.05 });
  const tete = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 14), matPunaise);
  tete.scale.set(1, 1, 0.75);
  tete.position.z = 0.055;
  tete.castShadow = true;
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.032, 0.03, 18), matPunaise);
  col.rotation.x = Math.PI / 2;
  col.position.z = 0.022;
  col.castShadow = true;
  punaise.add(tete, col);
  pivot.add(punaise);

  // la forme du papier : le bas se soulève au vent, les coins se gondolent ; la fenêtre et le haut restent plats
  function deformer(x, y, t, v) {
    const f = (H / 2 - y) / H; // 0 en haut, 1 en bas
    const bas = lisse(0.6, 1.02, f) ** 2;
    const coin = (Math.abs(x) / (W / 2)) ** 2;
    const coinsHaut = (1 - lisse(0, 0.14, f)) * (Math.abs(x) / (W / 2)) ** 3 * (P.clou < f ? 1 : 0);
    const vague = Math.sin(x * 5.2 + t * 3.1) * 0.012 + Math.sin(x * 9.1 - t * 4.3 + f * 6) * 0.006;
    return bas * (v.soulève + vague * v.vent + coin * v.coins) + coinsHaut * v.coinsHaut;
  }
  function poser(t, v) {
    const a = geoPapier.attributes.position.array;
    for (let k = 0; k < a.length; k += 3) a[k + 2] = deformer(base[k], base[k + 1], t, v);
    geoPapier.attributes.position.needsUpdate = true;
    geoPapier.computeVertexNormals();
    const b = geoPrime.attributes.position.array;
    for (let k = 0; k < b.length; k += 3) b[k + 2] = deformer(basePrime[k], basePrime[k + 1] + yPrime, t, v) + 0.0015;
    geoPrime.attributes.position.needsUpdate = true;
    prime.position.y = yPrime;
  }

  const mats = { matPapier, matPlaque, matPerso, matTampon };
  return {
    pivot, corps, papier, plaque, perso, prime, tampon, punaise, tete, uniformes, mats, cPrime, texPrime,
    W, H, fl, fy, poser, geoPerso, segP, relief,
  };
}

// ---------- la scène ----------
export function creerWanted3D(toileGL, { zone = toileGL.parentElement, petit = false, reduit = false, photo = (u) => u } = {}) {
  const rendu = new THREE.WebGLRenderer({ canvas: toileGL, antialias: !petit, alpha: true, powerPreference: "high-performance" });
  rendu.setPixelRatio(Math.min(window.devicePixelRatio || 1, petit ? 1.5 : 2));
  rendu.setClearColor(0x000000, 0);
  rendu.outputColorSpace = THREE.SRGBColorSpace;
  rendu.toneMapping = THREE.ACESFilmicToneMapping;
  rendu.toneMappingExposure = 1.05;
  rendu.shadowMap.enabled = true;
  rendu.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
  camera.position.set(0, 0, 9);
  camera.lookAt(0, 0, 0);

  // les lumières : la lanterne (chaude, elle vacille), un peu de ciel, et deux lumières de côté (rose et violet, le site)
  scene.add(new THREE.HemisphereLight(0xffe7c4, 0x251630, 0.75));
  const lanterne = new THREE.DirectionalLight(0xffd29a, 2.6);
  lanterne.position.set(-2.6, 3.4, 6.5);
  lanterne.castShadow = true;
  lanterne.shadow.mapSize.set(petit ? 1024 : 2048, petit ? 1024 : 2048);
  lanterne.shadow.bias = -0.0004;
  lanterne.shadow.normalBias = 0.015;
  lanterne.shadow.radius = 5;
  scene.add(lanterne, lanterne.target);
  const froid = new THREE.DirectionalLight(0xa9b8ff, 0.42);
  froid.position.set(3, -1.5, 4);
  scene.add(froid);
  const rose = new THREE.PointLight(0xff5fa8, 6, 7, 1.6);
  const violet = new THREE.PointLight(0x8f6bff, 4.5, 7, 1.6);
  scene.add(rose, violet);
  // le mur (invisible : seulement l'ombre des affiches)
  const mur = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.34 }));
  mur.receiveShadow = true;
  mur.position.z = 0;
  scene.add(mur);
  // la poussière dans la lumière
  const NP = petit ? 50 : 110;
  const posP = new Float32Array(NP * 3);
  const graines = new Float32Array(NP * 4);
  const rp = hasard(5);
  for (let k = 0; k < NP; k++) {
    graines[k * 4] = rp(); graines[k * 4 + 1] = rp(); graines[k * 4 + 2] = rp(); graines[k * 4 + 3] = rp();
  }
  const geoP = new THREE.BufferGeometry();
  geoP.setAttribute("position", new THREE.BufferAttribute(posP, 3));
  const point = toile(64, 64);
  {
    const g = point.getContext("2d");
    const d = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    d.addColorStop(0, "rgba(255,236,200,1)"); d.addColorStop(0.4, "rgba(255,220,170,0.35)"); d.addColorStop(1, "rgba(255,220,170,0)");
    g.fillStyle = d; g.fillRect(0, 0, 64, 64);
  }
  const poussiere = new THREE.Points(geoP, new THREE.PointsMaterial({ map: texture(point), size: 0.05, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  poussiere.visible = !reduit;
  scene.add(poussiere);
  // les nuages de poussière quand une affiche se plante sur sa punaise
  const nuages = [];
  const texNuage = texture((() => {
    const c = toile(64, 64);
    const g = c.getContext("2d");
    const d = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    d.addColorStop(0, "rgba(235,210,170,0.9)"); d.addColorStop(1, "rgba(235,210,170,0)");
    g.fillStyle = d; g.fillRect(0, 0, 64, 64);
    return c;
  })());
  function nuage(x, y, s) {
    for (let k = 0; k < 9; k++) {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: texNuage, transparent: true, opacity: 0.7, depthWrite: false }));
      const a = (k / 9) * Math.PI * 2;
      m.position.set(x, y, 0.15);
      m.scale.setScalar(0.12 * s);
      m.userData = { vx: Math.cos(a) * 0.9 * s, vy: Math.sin(a) * 0.5 * s + 0.2 * s, vie: 0, s };
      scene.add(m);
      nuages.push(m);
    }
  }

  const liste = []; // { el, d, a (l'affiche 3D), etat }
  let largeur = 1, hauteur = 1, parPx = 0.01;
  let horloge = performance.now() / 1000;
  let raf = 0, enPause = true, arrete = false;
  let pointeur = null; // { x, y } en pixels dans la toile
  let secousse = 0;
  const cadre = { gauche: 0, haut: 0 };

  function redimensionner() {
    const r = toileGL.getBoundingClientRect();
    largeur = Math.max(1, r.width); hauteur = Math.max(1, r.height);
    cadre.gauche = r.left; cadre.haut = r.top;
    rendu.setSize(largeur, hauteur, false);
    camera.aspect = largeur / hauteur;
    camera.updateProjectionMatrix();
    parPx = (2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z) / hauteur;
    for (const x of liste) caler(x);
    const t = 1 + Math.max(largeur, hauteur) * parPx * 0.6;
    lanterne.shadow.camera.left = -t; lanterne.shadow.camera.right = t;
    lanterne.shadow.camera.top = t; lanterne.shadow.camera.bottom = -t;
    lanterne.shadow.camera.updateProjectionMatrix();
    if (enPause) dessiner(0);
  }
  // l'affiche 3D se met exactement à la place de l'affiche de la page
  function caler(x) {
    const r = x.el.getBoundingClientRect();
    const t = toileGL.getBoundingClientRect();
    const l = x.el.offsetWidth || r.width;
    const cx = r.left + r.width / 2 - (t.left + t.width / 2);
    const cy = r.top + r.height / 2 - (t.top + t.height / 2);
    const echelle = l * parPx;
    x.echelle = echelle;
    x.a.pivot.scale.setScalar(echelle);
    // la punaise est en haut au milieu ; l'affiche de la page est centrée : on remonte le pivot
    const hauteurMonde = echelle * x.a.H;
    x.repos = { x: cx * parPx, y: -cy * parPx + hauteurMonde / 2 - P.clou * hauteurMonde };
    const rot = parseFloat(getComputedStyle(x.el).rotate) || 0;
    x.angle = (-rot * Math.PI) / 180;
  }

  // ---------- les textures d'une affiche ----------
  async function habiller(x) {
    const d = x.d;
    const L = petit ? 512 : 768;
    await polices();
    if (arrete || !x.vivante) return;
    const papier = dessinerPapier(L, d);
    const anciennes = [x.a.mats.matPapier.map, x.a.mats.matPapier.normalMap];
    x.a.mats.matPapier.map = texture(papier);
    x.a.mats.matPapier.normalMap = texture(reliefPapier(petit ? 160 : 256), false);
    x.a.mats.matPapier.normalScale = new THREE.Vector2(0.55, 0.55);
    x.a.mats.matPapier.needsUpdate = true;
    anciennes.forEach((t) => t?.dispose());
    x.primeAffichee = x.primeAffichee ?? 0;
    dessinerPrime(x.a.cPrime, x.primeAffichee, d.inconnu);
    x.a.texPrime.needsUpdate = true;
    if (d.tampon && TAMPONS[d.tampon]) {
      x.a.mats.matTampon.map?.dispose();
      x.a.mats.matTampon.map = texture(dessinerTampon(d.tampon));
      x.a.mats.matTampon.needsUpdate = true;
    }
    // la photo
    let image = null;
    if (d.inconnu || !d.avatar) image = silhouette();
    else {
      try { image = await chargerImage(photo(d.avatar)); } catch { image = silhouette(); }
    }
    if (arrete || !x.vivante) return;
    const n = petit ? 96 : N;
    let analyse;
    try { analyse = decouper(pixels(image, n), n); } catch { analyse = null; }
    poserPhoto(x, image, analyse, n);
    x.pret = true;
    toileGL.dispatchEvent(new CustomEvent("wanted-pret"));
  }
  function poserPhoto(x, image, an, n) {
    const a = x.a;
    // la photo en grand (pour la personne), la plaque (le fond sans la personne), le masque
    const s = toile(512, 512);
    const gs = s.getContext("2d");
    const l = image.naturalWidth || image.width, h = image.naturalHeight || image.height, c = Math.min(l, h);
    gs.fillStyle = "#d9bf8a";
    gs.fillRect(0, 0, 512, 512);
    gs.drawImage(image, (l - c) / 2, (h - c) / 2, c, c, 0, 0, 512, 512);
    // un peu de chaleur, comme une vieille photo (sans perdre les couleurs)
    gs.globalCompositeOperation = "soft-light";
    gs.fillStyle = "rgba(255,190,120,0.25)";
    gs.fillRect(0, 0, 512, 512);
    gs.globalCompositeOperation = "source-over";
    const texPhoto = texture(s);
    const ancien = [a.mats.matPerso.map, a.mats.matPerso.alphaMap, a.mats.matPlaque.map];
    if (!an) {
      a.mats.matPlaque.map = texPhoto;
      a.mats.matPlaque.needsUpdate = true;
      a.perso.visible = false;
      ancien.forEach((t) => t && t !== texPhoto && t.dispose());
      return;
    }
    const p = toile(n, n);
    const gp = p.getContext("2d");
    const ip = gp.createImageData(n, n);
    ip.data.set(an.plaque);
    gp.putImageData(ip, 0, 0);
    const pg = toile(256, 256);
    const gpg = pg.getContext("2d");
    gpg.imageSmoothingQuality = "high";
    gpg.filter = "blur(2px)";
    gpg.drawImage(p, 0, 0, 256, 256);
    gpg.filter = "none";
    gpg.globalCompositeOperation = "soft-light";
    gpg.fillStyle = "rgba(255,190,120,0.25)";
    gpg.fillRect(0, 0, 256, 256);
    // un peu d'ombre au fond de la boîte
    gpg.globalCompositeOperation = "source-over";
    const v = gpg.createRadialGradient(128, 118, 60, 128, 128, 190);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(30,15,5,0.45)");
    gpg.fillStyle = v; gpg.fillRect(0, 0, 256, 256);
    a.mats.matPlaque.map = an.decoupe ? texture(pg) : texPhoto;
    a.mats.matPlaque.needsUpdate = true;
    // le masque (en niveaux de gris → transparence)
    const m = toile(n, n);
    const gm = m.getContext("2d");
    const im = gm.createImageData(n, n);
    for (let k = 0; k < n * n; k++) {
      const v2 = Math.round(an.masque[k] * 255);
      im.data[k * 4] = im.data[k * 4 + 1] = im.data[k * 4 + 2] = v2; im.data[k * 4 + 3] = 255;
    }
    gm.putImageData(im, 0, 0);
    const m2 = toile(256, 256);
    const gm2 = m2.getContext("2d");
    gm2.imageSmoothingQuality = "high";
    gm2.drawImage(m, 0, 0, 256, 256);
    if (!an.decoupe) {
      // en coussin : les coins arrondis
      gm2.globalCompositeOperation = "destination-in";
      gm2.fillStyle = "#fff";
      gm2.beginPath(); gm2.roundRect(6, 6, 244, 244, 26); gm2.fill();
    }
    a.mats.matPerso.map = texPhoto;
    a.mats.matPerso.alphaMap = texture(m2, false);
    a.mats.matPerso.needsUpdate = true;
    ancien.forEach((t) => t && t !== a.mats.matPerso.map && t !== a.mats.matPlaque.map && t.dispose());
    // le relief, sommet par sommet
    const geo = a.geoPerso;
    const pos = geo.attributes.position;
    const rel = geo.attributes.relief;
    const uv = geo.attributes.uv;
    const lire = (u, w) => {
      const X = Math.min(n - 1, Math.max(0, u * (n - 1))), Y = Math.min(n - 1, Math.max(0, (1 - w) * (n - 1)));
      const x0 = Math.floor(X), y0 = Math.floor(Y), x1 = Math.min(n - 1, x0 + 1), y1 = Math.min(n - 1, y0 + 1);
      const fx = X - x0, fy = Y - y0;
      const P0 = an.profondeur;
      return (P0[y0 * n + x0] * (1 - fx) + P0[y0 * n + x1] * fx) * (1 - fy) + (P0[y1 * n + x0] * (1 - fx) + P0[y1 * n + x1] * fx) * fy;
    };
    for (let k = 0; k < pos.count; k++) rel.array[k] = lire(uv.array[k * 2], uv.array[k * 2 + 1]);
    rel.needsUpdate = true;
    // les normales du relief (pour la lumière), calculées pour un relief moyen
    const sauve = Float32Array.from(pos.array);
    for (let k = 0; k < pos.count; k++) pos.array[k * 3 + 2] = rel.array[k] * 0.14;
    geo.computeVertexNormals();
    pos.array.set(sauve);
    pos.needsUpdate = true;
    // la taille et la place : la personne dépasse du cadre par le haut (un peu plus grande que la fenêtre)
    const fl = a.fl;
    let echelle = 1;
    if (an.decoupe) echelle = Math.max(1.06, Math.min(1.32, 1.14 / Math.max(0.3, 1 - an.boite.haut)));
    a.perso.scale.set(fl * echelle, fl * echelle, 1);
    // en bas de la fenêtre, la personne ne déborde pas sur les côtés du cadre
    a.uniformes.uCadre.value.set(0.5 - 0.5 / echelle + 0.004, 0.5 + 0.5 / echelle - 0.004, 0, an.decoupe ? 0.62 / echelle : 2);
    a.perso.position.set(0, a.fy - fl / 2 + (fl * echelle) / 2, 0.02);
    a.perso.userData.decoupe = an.decoupe;
    // l'ombre de la personne suit sa forme (sinon c'est un carré qui fait de l'ombre)
    a.perso.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaMap: a.mats.matPerso.alphaMap, alphaTest: 0.42 });
    a.perso.customDepthMaterial.onBeforeCompile = a.relief;
    a.perso.visible = true;
  }

  // ---------- placer les affiches ----------
  function placer(entrees) {
    entrees = entrees.filter((e) => e?.el);
    // on garde les affiches qui n'ont pas changé de personne ; les autres sont refaites
    const cle = (d) => `${d.nom}|${d.avatar}|${d.inconnu ? 1 : 0}|${d.tampon || ""}|${d.epingle || ""}`;
    const nouvelles = entrees.map((e, i) => {
      const deja = liste[i];
      if (deja && deja.cle === cle(e.donnees)) {
        deja.el = e.el;
        const avant = deja.d.prime;
        deja.d = e.donnees;
        if (deja.pret && e.donnees.prime !== avant) deja.compte = { de: deja.primeAffichee ?? avant, a: e.donnees.prime, t0: horloge, duree: 1.4 };
        caler(deja);
        return deja;
      }
      if (deja) jeter(deja);
      const a = creerAffiche({ petit, epingle: e.donnees.epingle });
      scene.add(a.pivot);
      const x = {
        el: e.el, d: e.donnees, a, cle: cle(e.donnees), vivante: true, pret: false, i,
        // le balancement autour de la punaise (un ressort) et le vent
        th: 0, om: 0, inclX: 0, inclY: 0, avance: 0, rafale: 0, prochaineRafale: 2 + Math.random() * 4,
        entree: null, compte: null, tamponT: null, primeAffichee: 0, phase: Math.random() * 100,
      };
      caler(x);
      a.pivot.visible = false;
      habiller(x);
      return x;
    });
    for (const x of liste.slice(entrees.length)) jeter(x);
    liste.length = 0;
    liste.push(...nouvelles);
    if (enPause) dessiner(0);
  }
  function jeter(x) {
    x.vivante = false;
    scene.remove(x.a.pivot);
    x.a.pivot.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        for (const k of ["map", "alphaMap", "normalMap"]) o.material[k]?.dispose?.();
        o.material.dispose();
      }
    });
    x.a.texPrime.dispose();
  }

  // ---------- l'animation ----------
  function suivre(e) {
    const r = toileGL.getBoundingClientRect();
    pointeur = { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  const quitter = () => { pointeur = null; };
  zone?.addEventListener("pointermove", suivre, { passive: true });
  zone?.addEventListener("pointerleave", quitter);
  // un clic sur une affiche : elle valse
  function secouer(i = 0, force = 1) {
    const x = liste[i];
    if (!x) return;
    x.om += (Math.random() < 0.5 ? -1 : 1) * 2.4 * force;
    x.rafale = 1;
  }
  const clic = (e) => {
    liste.forEach((x, i) => {
      const b = x.el.getBoundingClientRect();
      if (e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom) secouer(i);
    });
  };
  zone?.addEventListener("click", clic);

  function animer(dt) {
    const t = horloge;
    // la lanterne vacille
    const v = 0.9 + 0.06 * Math.sin(t * 7.3) + 0.04 * Math.sin(t * 13.1 + 1.3) + 0.03 * Math.sin(t * 2.1);
    lanterne.intensity = 2.6 * (reduit ? 1 : v);
    for (const x of liste) {
      const a = x.a;
      if (!x.pret) continue;
      if (!x.entree) {
        x.entree = { t0: t };
        x.compte = { de: 0, a: x.d.prime || 0, t0: t + (reduit ? 0 : 0.55), duree: reduit ? 0.01 : 1.5 };
        if (x.d.tampon) x.tamponT = t + (reduit ? 0 : 2.3);
      }
      const e = t - x.entree.t0;
      // l'arrivée : l'affiche se rabat sur le mur depuis sa punaise (comme quand on la plaque), puis rebondit
      let rabat = 0;
      if (!reduit && e < 0.42) {
        const k = e / 0.42;
        rabat = (1 - k * k) * 1.45;
        a.pivot.visible = true;
      } else if (!x.plantee) {
        x.plantee = true;
        a.pivot.visible = true;
        if (!reduit) {
          x.om += (x.i % 2 ? 1 : -1) * 2.8;
          nuage(x.repos.x, x.repos.y, x.echelle);
          secousse = 0.12;
          x.planteT = t;
        }
      }
      // le ressort (le balancement) et le vent
      let vent = 0;
      if (!reduit) {
        x.prochaineRafale -= dt;
        if (x.prochaineRafale <= 0) { x.rafale = 0.6 + Math.random() * 0.6; x.prochaineRafale = 4 + Math.random() * 7; x.om += (Math.random() - 0.5) * 0.9; }
        x.rafale = Math.max(0, x.rafale - dt * 0.5);
        vent = 0.25 + x.rafale;
        const couple = -14 * x.th - 1.6 * x.om + Math.sin(t * 0.9 + x.phase) * 0.5 * vent;
        x.om += couple * dt;
        x.th += x.om * dt;
      }
      // la souris : l'affiche pointée penche vers toi et avance un peu, la personne sort davantage
      let cibleX = 0, cibleY = 0, cibleAv = 0;
      if (pointeur) {
        const b = x.el.getBoundingClientRect(), r = toileGL.getBoundingClientRect();
        const cx = b.left - r.left + b.width / 2, cy = b.top - r.top + b.height / 2;
        const px = (pointeur.x - cx) / (b.width / 2), py = (pointeur.y - cy) / (b.height / 2);
        const pres = Math.max(Math.abs(px), Math.abs(py)) < 1.25;
        if (pres) { cibleY = Math.max(-1, Math.min(1, px)) * 0.32; cibleX = Math.max(-1, Math.min(1, py)) * 0.22; cibleAv = 1; }
      }
      const k = 1 - Math.exp(-dt * 7);
      x.inclX += (cibleX - x.inclX) * k;
      x.inclY += (cibleY - x.inclY) * k;
      x.avance += (cibleAv - x.avance) * (1 - Math.exp(-dt * 4));
      // le petit rebond quand elle touche le mur
      const pl0 = x.planteT ? t - x.planteT : 9;
      const rebond = pl0 < 0.6 ? Math.sin(pl0 * 18) * Math.exp(-pl0 * 7) * 0.12 : 0;
      a.pivot.position.set(x.repos.x, x.repos.y, x.echelle * (0.09 + x.avance * 0.22 + rabat * 0.08));
      a.pivot.rotation.set(x.inclX - rabat - rebond, x.inclY, x.angle + x.th * 0.16);
      // la punaise s'enfonce quand l'affiche se plante
      const pl = x.planteT ? t - x.planteT : 9;
      a.tete.position.z = 0.055 + (pl < 0.25 ? (1 - pl / 0.25) * 0.08 : 0);
      // le papier : le vent soulève le bas, les coins se gondolent
      a.poser(t + x.phase, {
        soulève: reduit ? 0.02 : 0.035 + 0.05 * vent * (0.6 + 0.4 * Math.sin(t * 1.7 + x.phase)) + Math.abs(x.om) * 0.02,
        vent: reduit ? 0 : 0.6 + vent * 1.4,
        coins: reduit ? 0.03 : 0.05 + 0.05 * Math.sin(t * 1.3 + x.phase * 2),
        coinsHaut: reduit ? 0.01 : 0.02 + 0.015 * Math.sin(t * 2.1 + x.phase),
      });
      // la personne respire un peu, et sort quand on pointe l'affiche
      a.uniformes.uRelief.value = 0.11 + 0.012 * Math.sin(t * 1.6 + x.phase) + x.avance * 0.09;
      a.perso.position.z = 0.02 + x.avance * 0.05;
      // la prime défile
      if (x.compte) {
        const c = x.compte;
        const u = Math.max(0, Math.min(1, (t - c.t0) / c.duree));
        const e2 = 1 - (1 - u) ** 4;
        const val = Math.round(c.de + (c.a - c.de) * e2);
        if (val !== x.primeAffichee) {
          x.primeAffichee = val;
          dessinerPrime(a.cPrime, val, x.d.inconnu);
          a.texPrime.needsUpdate = true;
        }
        if (u >= 1) x.compte = null;
      }
      // le tampon claque
      if (x.tamponT !== null && t >= x.tamponT) {
        const u = Math.min(1, (t - x.tamponT) / 0.32);
        a.tampon.visible = true;
        const s = 1 + (1 - u) ** 2 * 1.6;
        a.tampon.scale.set(s, s, 1);
        a.tampon.position.z = 0.16 + (1 - u) * 0.6;
        a.mats.matTampon.opacity = Math.min(0.92, u * 1.6);
        if (u >= 1 && !x.tamponPose) { x.tamponPose = true; secousse = 0.1; nuage(x.repos.x, x.repos.y - x.echelle * 0.55, x.echelle * 0.7); }
      }
    }
    // les lumières de côté suivent la première affiche
    const r0 = liste[0];
    if (r0) {
      rose.position.set(r0.repos.x + r0.echelle * 1.1, r0.repos.y - r0.echelle * 0.3, 1.2 * r0.echelle);
      violet.position.set(r0.repos.x - r0.echelle * 1.1, r0.repos.y - r0.echelle * 0.6, 1.0 * r0.echelle);
      rose.distance = violet.distance = 4 * r0.echelle;
    }
    // la poussière flotte
    if (!reduit) {
      const lx = largeur * parPx, ly = hauteur * parPx;
      for (let k = 0; k < NP; k++) {
        const g0 = graines[k * 4], g1 = graines[k * 4 + 1], g2 = graines[k * 4 + 2], g3 = graines[k * 4 + 3];
        posP[k * 3] = (g0 - 0.5) * lx + Math.sin(t * 0.21 + g2 * 9) * 0.25;
        posP[k * 3 + 1] = ((g1 + t * 0.012 * (0.5 + g3)) % 1 - 0.5) * ly;
        posP[k * 3 + 2] = 0.3 + g2 * 1.6;
      }
      geoP.attributes.position.needsUpdate = true;
      poussiere.material.size = 0.035 * (liste[0]?.echelle || 1);
    }
    for (let k = nuages.length - 1; k >= 0; k--) {
      const m = nuages[k];
      const u = m.userData;
      u.vie += dt;
      m.position.x += u.vx * dt * 0.8; m.position.y += u.vy * dt * 0.8;
      u.vx *= 0.94; u.vy *= 0.94;
      m.scale.setScalar(u.s * (0.12 + u.vie * 0.5));
      m.material.opacity = Math.max(0, 0.7 * (1 - u.vie / 0.9));
      if (u.vie > 0.9) { scene.remove(m); m.material.dispose(); nuages.splice(k, 1); }
    }
    // la secousse quand ça claque
    secousse = Math.max(0, secousse - dt);
    const s = secousse * 0.25;
    camera.position.x = (Math.random() - 0.5) * s;
    camera.position.y = (Math.random() - 0.5) * s;
  }
  function dessiner(dt) {
    horloge += dt;
    animer(Math.min(dt, 0.05));
    rendu.render(scene, camera);
  }
  let avant = performance.now();
  function image(maintenant) {
    const dt = (maintenant - avant) / 1000;
    avant = maintenant;
    dessiner(Math.max(0, Math.min(dt, 0.1)));
    raf = enPause ? 0 : requestAnimationFrame(image);
  }
  function pause(oui) {
    if (arrete) return;
    enPause = Boolean(oui);
    if (!enPause && !raf) { avant = performance.now(); raf = requestAnimationFrame(image); }
    if (enPause && raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => redimensionner()) : null;
  ro?.observe(toileGL);
  toileGL.addEventListener("webglcontextlost", (e) => { e.preventDefault(); toileGL.dispatchEvent(new CustomEvent("wanted-perdu")); });
  redimensionner();
  return {
    placer, secouer, pause, redimensionner,
    // pour les essais : faire avancer le temps à la main (sans dessiner, pour aller vite)
    avancer(dt, rendre = true) {
      horloge += dt;
      animer(Math.min(dt, 0.05));
      if (rendre) rendu.render(scene, camera);
    },
    pretes: () => liste.length > 0 && liste.every((x) => x.pret),
    arreter() {
      arrete = true;
      pause(true);
      ro?.disconnect();
      zone?.removeEventListener("pointermove", suivre);
      zone?.removeEventListener("pointerleave", quitter);
      zone?.removeEventListener("click", clic);
      for (const x of liste) jeter(x);
      liste.length = 0;
      rendu.dispose();
    },
  };
}
