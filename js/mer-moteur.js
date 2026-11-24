// LA MER EN DIRECT : le moteur de course. Le même fichier tourne dans le bot (qui décide de tout) et sur le site
// (js/mer-moteur.js, qui prédit sa propre barque et fait tourner l'entraînement). Il ne touche ni au réseau ni à
// l'écran : des barques, une ligne de départ qui sert aussi d'arrivée, 4 bouées à passer dans l'ordre, des rochers.
// Le bot avance la course 20 fois par seconde et envoie 10 instantanés par seconde (petits, en binaire).
// Les parcours, les barques et le coffre sont inventés.

export const MER = {
  version: 1, // le site et le bot doivent avoir le même moteur : sinon le site demande de recharger la page
  pas: 0.05, // secondes par pas (20 par seconde)
  envoi: 2, // un instantané tous les 2 pas
  vitesse: 10, // la croisière (unités par seconde)
  vitesseRame: 15.5, // avec le coup de rame
  vitesseFini: 3.5, // une barque arrivée se laisse glisser
  acceleration: 7,
  freinage: 5,
  virage: 2.4, // radians par seconde, au plus
  rame: { conso: 0.45, recharge: 0.16, min: 0.15 }, // la jauge de rame : ~2,2 s pleine, ~6 s pour la refaire
  rayon: 1.3, // une barque
  bouee: 9, // la zone à toucher autour d'une bouée
  coffre: 3.4,
  bord: { x: 100, z: 54 }, // la mer de la feuille de GRAND LINE
  places: 50,
  bouees: 4,
};
export const PHASES = ["fermee", "embarquement", "depart", "course", "resultats", "libre"];
const TAU = Math.PI * 2;

// l'angle ramené entre -π et π
export const angle = (a) => {
  let x = (a + Math.PI) % TAU;
  if (x < 0) x += TAU;
  return x - Math.PI;
};
const borne = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- les parcours ----------
// porte : les deux bouts de la ligne ; sens : le sens de la course quand on la passe ; bouees : dans l'ordre ;
// rochers : [x, z, rayon]. x va vers la droite, z vers le bas de la carte.
const BASE = [
  {
    id: "port", nom: "La Boucle du Port", porte: [[-60, 22], [-60, 52]], sens: [1, 0],
    bouees: [[60, 40], [72, -30], [-8, -40], [-78, -18]],
    rochers: [[0, 0, 13], [34, 14, 4], [-34, -6, 5], [46, -12, 3.5]],
  },
  {
    id: "huit", nom: "Le Huit des Courants", porte: [[-72, -14], [-72, 14]], sens: [1, 0],
    bouees: [[64, 38], [80, -30], [-28, 42], [-86, -38]],
    rochers: [[18, -22, 6], [-10, -28, 4], [40, 4, 3], [-56, 34, 3.5]],
  },
  {
    id: "recifs", nom: "Les Récifs", porte: [[72, 6], [72, 40]], sens: [-1, 0],
    bouees: [[-62, 42], [-84, -26], [-4, -8], [86, -40]],
    rochers: [[30, 14, 5], [-22, 22, 4], [-42, -30, 5], [42, -22, 6], [12, -36, 3], [-30, 4, 3]],
  },
  {
    id: "tour", nom: "Le Grand Tour", porte: [[0, 24], [0, 52]], sens: [1, 0],
    bouees: [[86, 32], [82, -40], [-82, -40], [-86, 32]],
    rochers: [[0, -6, 15], [-46, 0, 9], [46, 0, 9]],
  },
];
export const PARCOURS = BASE.map((p) => ({ id: p.id, nom: p.nom }));

// un parcours prêt à courir : miroir 0 à 3 (1 : retourné gauche-droite, 2 : haut-bas, 3 : les deux)
export function parcours(id = "port", miroir = 0) {
  const b = BASE.find((x) => x.id === id) || BASE[0];
  const mx = miroir & 1 ? -1 : 1;
  const mz = miroir & 2 ? -1 : 1;
  const pt = ([x, z]) => ({ x: x * mx, z: z * mz });
  const a = pt(b.porte[0]);
  const z = pt(b.porte[1]);
  const sens = { x: b.sens[0] * mx, z: b.sens[1] * mz };
  const p = {
    id: b.id, nom: b.nom, miroir: miroir & 3,
    porte: [a, z], sens, centre: { x: (a.x + z.x) / 2, z: (a.z + z.z) / 2 },
    bouees: b.bouees.map(pt),
    rochers: b.rochers.map(([x, zz, r]) => ({ x: x * mx, z: zz * mz, r })),
  };
  p.grille = grille(p, MER.places);
  return p;
}

// les places de départ, derrière la ligne : en colonnes, la première juste derrière, en quinconce
function grille(p, n) {
  const [a, b] = p.porte;
  const L = Math.hypot(b.x - a.x, b.z - a.z);
  const ux = (b.x - a.x) / L;
  const uz = (b.z - a.z) / L;
  const ecart = 2.75;
  const parColonne = Math.max(1, Math.floor((L - 2) / ecart));
  const cap = Math.atan2(p.sens.z, p.sens.x);
  const places = [];
  for (let col = 0; places.length < n; col++) {
    const decale = col % 2 ? ecart / 2 : 0;
    // de la place du milieu vers les bords : les premiers placés sont au centre
    const ordre = [...Array(parColonne).keys()].sort((i, j) => Math.abs(i - (parColonne - 1) / 2) - Math.abs(j - (parColonne - 1) / 2));
    for (const k of ordre) {
      if (places.length >= n) break;
      const le = 1 + ecart / 2 + k * ecart + decale;
      if (le > L - 1) continue;
      const recul = 4.4 + col * 4.4;
      places.push({ x: a.x + ux * le - p.sens.x * recul, z: a.z + uz * le - p.sens.z * recul, a: cap });
    }
    if (col > 40) break;
  }
  return places;
}

// ---------- une barque ----------
export function nouvelleBarque(id, place = { x: 0, z: 0, a: 0 }) {
  return { id, x: place.x, z: place.z, a: place.a, v: 0, w: 0, e: 1, rame: false, choc: 0, contre: false, prochaine: 0, fini: false, temps: 0, absent: false, fige: false };
}
export function placer(b, place) {
  Object.assign(b, { x: place.x, z: place.z, a: place.a, v: 0, w: 0, e: 1, rame: false, choc: 0, contre: false, prochaine: 0, fini: false, temps: 0 });
}

// un pas de pilotage : e = { t : -1 (à gauche) … 1 (à droite), b : 1 pour ramer fort }
export function piloter(b, e, dt = MER.pas) {
  if (b.fige) return;
  const t = b.absent ? 0 : borne(Number(e?.t) || 0, -1, 1);
  const veut = !b.absent && !b.fini && Boolean(e?.b);
  if (veut && b.e > 0 && (b.rame || b.e >= MER.rame.min)) {
    b.rame = true;
    b.e = Math.max(0, b.e - MER.rame.conso * dt);
    if (b.e <= 0) b.rame = false;
  } else {
    b.rame = false;
    b.e = Math.min(1, b.e + MER.rame.recharge * dt);
  }
  const vise = b.absent ? 0 : b.fini ? MER.vitesseFini : b.rame ? MER.vitesseRame : MER.vitesse;
  const dv = vise - b.v;
  b.v += dv > 0 ? Math.min(dv, MER.acceleration * dt) : Math.max(dv, -MER.freinage * dt);
  // on tourne moins vite à petite vitesse (et un peu moins en ramant fort)
  const k = borne(b.v / MER.vitesse, 0.45, 1) * (b.rame ? 0.85 : 1);
  b.w += (t * MER.virage * k - b.w) * Math.min(1, dt * 10);
  b.a = angle(b.a + b.w * dt);
  b.x += Math.cos(b.a) * b.v * dt;
  b.z += Math.sin(b.a) * b.v * dt;
  if (b.choc > 0) b.choc--;
}

// les chocs : entre barques (on se pousse, sans perdre de vitesse), contre les rochers et le bord de la feuille
export function chocs(barques, p) {
  const R = MER.rayon;
  const D = 2 * R;
  const actives = barques.filter((b) => !b.fige && !b.fini && !b.absent);
  for (let i = 0; i < actives.length; i++) {
    const a = actives[i];
    for (let j = i + 1; j < actives.length; j++) {
      const b = actives[j];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const d2 = dx * dx + dz * dz;
      if (d2 >= D * D) continue;
      const d = Math.sqrt(d2) || 0.001;
      const nx = d2 > 1e-9 ? dx / d : Math.cos(a.id * 2.4);
      const nz = d2 > 1e-9 ? dz / d : Math.sin(a.id * 2.4);
      const pousse = (D - d) / 2;
      a.x -= nx * pousse; a.z -= nz * pousse;
      b.x += nx * pousse; b.z += nz * pousse;
    }
  }
  for (const b of barques) {
    if (b.fige) continue;
    let contre = false;
    for (const r of p.rochers) {
      const dx = b.x - r.x;
      const dz = b.z - r.z;
      const min = r.r + R;
      const d2 = dx * dx + dz * dz;
      if (d2 >= min * min) continue;
      const d = Math.sqrt(d2) || 0.001;
      b.x = r.x + (dx / d) * min;
      b.z = r.z + (dz / d) * min;
      contre = true;
    }
    const { x: bx, z: bz } = MER.bord;
    if (Math.abs(b.x) > bx || Math.abs(b.z) > bz) {
      b.x = borne(b.x, -bx, bx);
      b.z = borne(b.z, -bz, bz);
      contre = true;
    }
    // le choc ne ralentit qu'au moment où il arrive (on peut longer un rocher sans s'arrêter)
    if (contre && !b.contre) {
      b.v *= 0.55;
      b.w *= 0.3;
      b.choc = 6;
    }
    b.contre = contre;
  }
}

// le segment (x0,z0)→(x1,z1) coupe-t-il la ligne ? → la part du segment où il la coupe (0 à 1), sinon -1
function coupe(x0, z0, x1, z1, [a, b]) {
  const rx = x1 - x0, rz = z1 - z0, sx = b.x - a.x, sz = b.z - a.z;
  const den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-9) return -1;
  const qx = a.x - x0, qz = a.z - z0;
  const t = (qx * sz - qz * sx) / den;
  const u = (qx * rz - qz * rx) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : -1;
}

// les bouées et l'arrivée : → "bouee", "arrivee" ou null. tick : le pas en cours (pour le temps exact d'arrivée)
export function controler(b, p, x0, z0, tick = 0) {
  if (b.fini || b.fige || b.absent) return null;
  if (b.prochaine < p.bouees.length) {
    const c = p.bouees[b.prochaine];
    if ((b.x - c.x) ** 2 + (b.z - c.z) ** 2 <= MER.bouee ** 2) {
      b.prochaine++;
      return "bouee";
    }
    return null;
  }
  const t = coupe(x0, z0, b.x, b.z, p.porte);
  if (t < 0 || (b.x - x0) * p.sens.x + (b.z - z0) * p.sens.z <= 0) return null;
  b.fini = true;
  b.prochaine = p.bouees.length + 1;
  b.temps = tick - 1 + t; // en pas, avec la fraction du dernier pas
  return "arrivee";
}

// un pas pour toute la mer. entrees : Map id → { t, b }. course : on compte les bouées et l'arrivée
export function avancer(barques, entrees, p, { course = true, tick = 0 } = {}) {
  const depart = new Map();
  for (const b of barques) {
    if (b.fige) continue;
    depart.set(b, [b.x, b.z]);
    piloter(b, entrees?.get?.(b.id), MER.pas);
  }
  chocs(barques, p);
  const evenements = [];
  if (!course) return evenements;
  for (const b of barques) {
    const d = depart.get(b);
    if (!d) continue;
    const e = controler(b, p, d[0], d[1], tick);
    if (e) evenements.push({ type: e, id: b.id, bouee: b.prochaine, temps: b.temps });
  }
  return evenements;
}

// où doit aller une barque : la bouée suivante, puis la ligne
export function cibleDe(b, p) {
  if (b.prochaine < p.bouees.length) return p.bouees[b.prochaine];
  return p.centre;
}
// la distance qui reste jusqu'à la cible suivante (pour départager ceux qui sont à la même bouée)
const reste = (b, p) => { const c = cibleDe(b, p); return Math.hypot(c.x - b.x, c.z - b.z); };

// le classement : les arrivés par temps, puis les autres par bouée passée et distance qui reste
export function classement(barques, p) {
  return [...barques].sort((a, b) => {
    if (a.fini !== b.fini) return a.fini ? -1 : 1;
    if (a.fini) return a.temps - b.temps || a.id - b.id;
    if (a.absent !== b.absent) return a.absent ? 1 : -1;
    return b.prochaine - a.prochaine || reste(a, p) - reste(b, p) || a.id - b.id;
  });
}

// ---------- les barques d'essai (le bot les fait courir pour /mer essai, le site pour l'entraînement) ----------
// niveau : 0 (maladroit) à 1 (très bon). hasard : une fonction qui rend un nombre entre 0 et 1.
export function pilote(b, p, { hasard = Math.random, niveau = 0.7 } = {}) {
  let c = cibleDe(b, p);
  if (b.prochaine >= p.bouees.length && !b.fini) {
    // la ligne se passe dans le bon sens : si on est déjà devant, on fait le tour pour revenir par derrière
    const devant = (b.x - p.centre.x) * p.sens.x + (b.z - p.centre.z) * p.sens.z;
    c = devant > -3 ? { x: p.centre.x - p.sens.x * 18, z: p.centre.z - p.sens.z * 18 } : { x: p.centre.x + p.sens.x * 12, z: p.centre.z + p.sens.z * 12 };
  }
  if (b.fini) c = { x: b.x + Math.cos(b.a) * 20, z: b.z + Math.sin(b.a) * 20 };
  const dCible = Math.hypot(c.x - b.x, c.z - b.z);
  let vise = Math.atan2(c.z - b.z, c.x - b.x);
  // éviter les rochers devant soi, s'ils sont avant la cible
  const ca = Math.cos(b.a);
  const sa = Math.sin(b.a);
  let evite = 0;
  for (const r of p.rochers) {
    const dx = r.x - b.x;
    const dz = r.z - b.z;
    const devant = dx * ca + dz * sa;
    if (devant < -r.r || devant > r.r + 22 || devant > dCible + r.r) continue;
    const cote = -dx * sa + dz * ca; // > 0 : le rocher est à droite
    const marge = r.r + MER.rayon + 3;
    if (Math.abs(cote) >= marge) continue;
    const force = (marge - Math.abs(cote)) / marge;
    const sens = cote > 0 ? -1 : 1;
    if (force > Math.abs(evite)) evite = sens * (0.5 + force * 1.1);
  }
  if (evite) vise = b.a + evite;
  // le bord de la feuille
  const nx = b.x + ca * 14;
  const nz = b.z + sa * 14;
  if (Math.abs(nx) > MER.bord.x - 2 || Math.abs(nz) > MER.bord.z - 2) vise = Math.atan2(-b.z * 0.6, -b.x);
  const ecart = angle(vise - b.a);
  let t = borne(ecart * 2.4, -1, 1) + (hasard() - 0.5) * (1 - niveau) * 0.9;
  const fort = b.e > 0.5 && Math.abs(ecart) < 0.32 && hasard() < 0.35 + niveau * 0.6;
  return { t: borne(t, -1, 1), b: fort ? 1 : 0 };
}

// ---------- le coffre ----------
export function placeCoffre(p, hasard = Math.random) {
  for (let essai = 0; essai < 60; essai++) {
    const x = (hasard() * 2 - 1) * (MER.bord.x - 16);
    const z = (hasard() * 2 - 1) * (MER.bord.z - 10);
    if (p.rochers.some((r) => Math.hypot(r.x - x, r.z - z) < r.r + 6)) continue;
    if (Math.hypot(p.centre.x - x, p.centre.z - z) < 22) continue;
    return { x, z };
  }
  return { x: 0, z: MER.bord.z - 12 };
}

// ---------- l'instantané, en binaire (11 octets par barque) ----------
// 0 : 1 (le type) · 1-4 : le pas · 5 : la phase · 6 : le nombre de barques · 7 : 1 si le coffre est là · 8 : libre
// [le coffre : x, z ×100 en 2 × int16] puis par barque : id, x ×100, z ×100, cap, vitesse ×10, virage ×40, rame, drapeaux
const ENTETE = 9;
const PAR_BARQUE = 11;
const q16 = (v) => borne(Math.round(v * 100), -32767, 32767);
export function coder({ tick = 0, phase = "course", coffre = null, barques = [] }) {
  const n = Math.min(255, barques.length);
  const buf = new ArrayBuffer(ENTETE + (coffre ? 4 : 0) + n * PAR_BARQUE);
  const v = new DataView(buf);
  v.setUint8(0, 1);
  v.setUint32(1, tick >>> 0);
  v.setUint8(5, Math.max(0, PHASES.indexOf(phase)));
  v.setUint8(6, n);
  v.setUint8(7, coffre ? 1 : 0);
  let o = ENTETE;
  if (coffre) {
    v.setInt16(o, q16(coffre.x));
    v.setInt16(o + 2, q16(coffre.z));
    o += 4;
  }
  for (let k = 0; k < n; k++) {
    const b = barques[k];
    const cap = ((b.a % TAU) + TAU) % TAU;
    v.setUint8(o, b.id & 255);
    v.setInt16(o + 1, q16(b.x));
    v.setInt16(o + 3, q16(b.z));
    v.setUint16(o + 5, Math.round((cap / TAU) * 65535));
    v.setUint8(o + 7, borne(Math.round(b.v * 10), 0, 255));
    v.setInt8(o + 8, borne(Math.round(b.w * 40), -127, 127));
    v.setUint8(o + 9, borne(Math.round(b.e * 255), 0, 255));
    v.setUint8(o + 10, (b.rame ? 1 : 0) | (b.choc > 0 ? 2 : 0) | (b.fini ? 4 : 0) | (b.absent ? 64 : 0) | (Math.min(5, b.prochaine) << 3));
    o += PAR_BARQUE;
  }
  return buf;
}
export function decoder(source) {
  const v = source instanceof DataView ? source : new DataView(source.buffer ? source.buffer : source, source.byteOffset || 0, source.byteLength);
  if (v.byteLength < ENTETE || v.getUint8(0) !== 1) return null;
  const n = v.getUint8(6);
  const avecCoffre = v.getUint8(7) === 1;
  if (v.byteLength < ENTETE + (avecCoffre ? 4 : 0) + n * PAR_BARQUE) return null;
  const s = { tick: v.getUint32(1), phase: PHASES[v.getUint8(5)] || "course", coffre: null, barques: [] };
  let o = ENTETE;
  if (avecCoffre) {
    s.coffre = { x: v.getInt16(o) / 100, z: v.getInt16(o + 2) / 100 };
    o += 4;
  }
  for (let k = 0; k < n; k++) {
    const f = v.getUint8(o + 10);
    s.barques.push({
      id: v.getUint8(o), x: v.getInt16(o + 1) / 100, z: v.getInt16(o + 3) / 100,
      a: angle((v.getUint16(o + 5) / 65535) * TAU), v: v.getUint8(o + 7) / 10, w: v.getInt8(o + 8) / 40, e: v.getUint8(o + 9) / 255,
      rame: Boolean(f & 1), choc: f & 2 ? 1 : 0, fini: Boolean(f & 4), absent: Boolean(f & 64), prochaine: (f >> 3) & 7,
    });
    o += PAR_BARQUE;
  }
  return s;
}
