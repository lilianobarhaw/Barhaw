// LES CRÉATURES DE GRAND LINE, en 3D. Des créatures marines inventées (rien d'existant, ni Pokémon ni One Piece),
// faites entièrement en code, sans modèle à télécharger : un corps en dégradé « manga » (3 tons), un contour à l'encre,
// de grands yeux, et des parties qui bougent (nageoires, queue, ailes, crinière). Pour l'aperçu, trois espèces :
// Piquebulle (et ses deux évolutions, Corapouf et Récifort), Nuéraie et Hippoudre, chacune aussi en version nacrée.
// Trois façons de les montrer : la créature sauvage (sur l'eau, avec le filet), la fiche (on la tourne au doigt, elle
// peut évoluer) et l'atelier (un seul rendu partagé, qui dessine les vignettes du Bestiaire et l'image pour Discord).
// three.js r170 (licence MIT, © three.js authors) est rangé à côté : la page n'accepte que ses propres scripts.
import * as THREE from "./three-r170.module.min.js";

THREE.ColorManagement.enabled = false; // comme le reste du site : les couleurs telles quelles
const ENCRE = 0x12050d;
const TAU = Math.PI * 2;
const AVANT = new THREE.Vector3(0, 0, 1);
const HAUT = new THREE.Vector3(0, 1, 0);
const borne = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const doux = (a, b, x) => { const t = borne((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// ---------- les espèces (le bot ne dit que qui a attrapé quoi ; ce qu'est chaque créature est ici)
export const TYPES = {
  corail: { nom: "Corail", couleur: "#ff7a6b", fort: "tempete", faible: "brume" },
  brume: { nom: "Brume", couleur: "#8fb1ff", fort: "corail", faible: "tempete" },
  tempete: { nom: "Tempête", couleur: "#ffcf33", fort: "brume", faible: "corail" },
  abysses: { nom: "Abysses", couleur: "#5468e8" },
  braise: { nom: "Braise", couleur: "#ff8a3d" },
  givre: { nom: "Givre", couleur: "#8fe6ff" },
  lueur: { nom: "Lueur", couleur: "#c8ff6b" },
  sylve: { nom: "Sylve", couleur: "#59d18a" },
};
export const RARETES = {
  commune: { nom: "Commune", couleur: "#8fd9a8", filet: "1 filet sur 2" },
  rare: { nom: "Rare", couleur: "#5ab0ff", filet: "1 filet sur 4" },
  epique: { nom: "Épique", couleur: "#b46bff", filet: "1 filet sur 8" },
  legendaire: { nom: "Légendaire", couleur: "#ffc83d", filet: "1 filet sur 20" },
};
export const ESPECES = {
  piquebulle: { n: 1, nom: "Piquebulle", type: "corail", rarete: "commune", ile: "L'Île des Moussaillons", ligne: ["piquebulle", "corapouf", "recifort"], stats: { force: 30, resistance: 55, vitesse: 35 },
    texte: "Il se gonfle dès qu'on le regarde trop longtemps. Ses piquants sont tout mous : il ne fait peur à personne, mais il ne le sait pas." },
  corapouf: { n: 2, nom: "Corapouf", type: "corail", rarete: "commune", ile: "L'Île des Moussaillons", ligne: ["piquebulle", "corapouf", "recifort"], stats: { force: 50, resistance: 72, vitesse: 40 },
    texte: "Du corail lui pousse sur la tête. Il le peigne tous les matins et boude si quelqu'un y touche." },
  recifort: { n: 3, nom: "Récifort", type: "corail", rarete: "commune", ile: "L'Île des Moussaillons", ligne: ["piquebulle", "corapouf", "recifort"], stats: { force: 72, resistance: 90, vitesse: 38 },
    texte: "Un vrai récif qui nage. Des petits poissons vivent sur son dos, et il fait très attention à eux." },
  nueraie: { n: 13, nom: "Nuéraie", type: "brume", rarete: "rare", ile: "L'Archipel Suspendu", ligne: ["nueraie", null, null], stats: { force: 45, resistance: 50, vitesse: 85 },
    texte: "Elle nage dans les nuages comme dans l'eau. Quand elle passe au-dessus de toi, il pleut trois gouttes, jamais plus." },
  hippoudre: { n: 25, nom: "Hippoudre", type: "tempete", rarete: "epique", ile: "L'Île Tonnerre", ligne: ["hippoudre", null, null], stats: { force: 78, resistance: 45, vitesse: 80 },
    texte: "Sa crinière crépite sans arrêt. Il attend l'orage pour sortir, et il fonce sur chaque éclair comme sur un goûter." },
};

// ---------- les outils
function alea(graine) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function toile(l, h, dessiner) {
  const c = document.createElement("canvas");
  c.width = l; c.height = h;
  dessiner(c.getContext("2d"), l, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}
// le dégradé « manga » : 3 tons, pas de transition douce
let rampe = null;
function rampeToon() {
  if (rampe) return rampe;
  rampe = new THREE.DataTexture(new Uint8Array([122, 122, 122, 255, 196, 196, 196, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  rampe.minFilter = rampe.magFilter = THREE.NearestFilter;
  rampe.needsUpdate = true;
  return rampe;
}
const toon = (couleur, o = {}) => new THREE.MeshToonMaterial({ color: couleur, gradientMap: rampeToon(), ...o });
// le contour à l'encre : la même forme, un peu gonflée le long de ses normales, vue de l'intérieur
const encres = new Map();
function matEncre(e) {
  const cle = e.toFixed(3);
  if (!encres.has(cle)) {
    const m = new THREE.MeshBasicMaterial({ color: ENCRE, side: THREE.BackSide });
    m.onBeforeCompile = (s) => { s.vertexShader = s.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>\n\ttransformed += normalize(normal) * ${cle};`); };
    m.customProgramCacheKey = () => `encre-${cle}`;
    m.userData.partage = true;
    encres.set(cle, m);
  }
  return encres.get(cle);
}
function encrer(mesh, e = 0.03) {
  const c = new THREE.Mesh(mesh.geometry, matEncre(e));
  c.userData.encre = true;
  c.raycast = () => {};
  mesh.add(c);
  return mesh;
}
// plusieurs formes en une seule (les piquants)
function fusionner(geos) {
  const sortie = new THREE.BufferGeometry();
  for (const nom of Object.keys(geos[0].attributes)) {
    const n = geos[0].attributes[nom].itemSize;
    const tab = new Float32Array(geos.reduce((s, g) => s + g.attributes[nom].count * n, 0));
    let k = 0;
    for (const g of geos) { tab.set(g.attributes[nom].array, k); k += g.attributes[nom].count * n; }
    sortie.setAttribute(nom, new THREE.BufferAttribute(tab, n));
  }
  const ind = [];
  let base = 0;
  for (const g of geos) {
    const i = g.index ? g.index.array : Array.from({ length: g.attributes.position.count }, (_, k) => k);
    for (const v of i) ind.push(v + base);
    base += g.attributes.position.count;
  }
  sortie.setIndex(ind);
  return sortie;
}
// un tube qui suit une courbe, plus ou moins épais selon l'endroit (le corps d'Hippoudre, le corail, le museau)
function tubeVariable(courbe, rayon, { n = 64, m = 14, couleur = null } = {}) {
  const cadres = courbe.computeFrenetFrames(n, false);
  const pos = [], nor = [], uv = [], col = [], ind = [];
  const p = new THREE.Vector3(), d = new THREE.Vector3();
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    courbe.getPointAt(t, p);
    const r = rayon(t);
    const N = cadres.normals[i], B = cadres.binormals[i];
    for (let j = 0; j <= m; j++) {
      const a = (j / m) * TAU;
      d.set(0, 0, 0).addScaledVector(N, Math.cos(a)).addScaledVector(B, Math.sin(a)).normalize();
      pos.push(p.x + d.x * r, p.y + d.y * r, p.z + d.z * r);
      nor.push(d.x, d.y, d.z);
      uv.push(t, j / m);
      if (couleur) { const c = couleur(t, d); col.push(c.r, c.g, c.b); }
    }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    const a = i * (m + 1) + j, b = a + m + 1;
    ind.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  if (couleur) g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(ind);
  return g;
}
// les yeux : un grand iris en dégradé, une pupille, deux reflets
const iris = new Map();
function texIris(c) {
  if (!iris.has(c)) {
    iris.set(c, toile(64, 64, (x, l, h) => {
      const base = new THREE.Color(c);
      const fonce = base.clone().multiplyScalar(0.5), clair = base.clone().lerp(new THREE.Color("#ffffff"), 0.4);
      const g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0.3, `#${fonce.getHexString()}`);
      g.addColorStop(0.55, c);
      g.addColorStop(0.72, `#${clair.getHexString()}`);
      x.fillStyle = g;
      x.fillRect(0, 0, l, h);
    }));
    iris.get(c).userData.partage = true;
  }
  return iris.get(c);
}
const matBlanc = new THREE.MeshBasicMaterial({ color: 0xffffff });
const matPupille = new THREE.MeshBasicMaterial({ color: ENCRE });
matBlanc.userData.partage = matPupille.userData.partage = true;
function oeil(r, couleurIris, encre = 0.022) {
  const g = new THREE.Group();
  const blanc = encrer(new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), toon("#ffffff")), encre);
  const ir = new THREE.Mesh(new THREE.SphereGeometry(r * 0.6, 24, 16), toon("#ffffff", { map: texIris(couleurIris) }));
  ir.position.z = r * 0.75;
  ir.scale.z = 0.45;
  const pupille = new THREE.Mesh(new THREE.SphereGeometry(r * 0.36, 18, 12), matPupille);
  pupille.position.z = r * 0.95;
  pupille.scale.z = 0.35;
  const eclat = new THREE.Mesh(new THREE.SphereGeometry(r * 0.17, 12, 8), matBlanc);
  eclat.position.set(r * 0.2, r * 0.24, r * 1.0);
  const eclat2 = new THREE.Mesh(new THREE.SphereGeometry(r * 0.08, 8, 6), matBlanc);
  eclat2.position.set(-r * 0.2, -r * 0.2, r * 1.0);
  g.add(blanc, ir, pupille, eclat, eclat2);
  return g;
}
// cligner des yeux de temps en temps (chaque créature a son rythme)
function clignement(graine) {
  const r = alea(graine);
  let prochain = null, debut = -1;
  return (t) => {
    if (prochain === null || t < prochain - 30) prochain = t + 0.8 + r() * 2;
    if (t >= prochain && debut < 0) debut = t;
    if (debut < 0) return 1;
    const u = (t - debut) / 0.17;
    if (u >= 1 || u < 0) { debut = -1; prochain = t + 2 + r() * 3.5; return 1; }
    return Math.max(0.08, Math.abs(1 - 2 * u));
  };
}
// une touffe de nuage (des boules blanches)
function nuage(taille, couleur, graine, encre = 0.022) {
  const r = alea(graine);
  const g = new THREE.Group();
  const mat = toon(couleur);
  for (const [x, y, z, s] of [[0, 0, 0, 1], [0.78, -0.12, 0.08, 0.72], [-0.74, -0.14, 0.05, 0.68], [0.32, 0.38, -0.1, 0.64], [-0.3, 0.32, 0.14, 0.56]]) {
    const m = encrer(new THREE.Mesh(new THREE.SphereGeometry(taille * s * (0.9 + r() * 0.2), 18, 12), mat), encre);
    m.position.set(x * taille, y * taille, z * taille);
    g.add(m);
  }
  return g;
}
// une forme plate un peu épaisse (nageoires, éclairs)
function plaque(forme, epaisseur = 0.03, biseau = 0.02) {
  const g = new THREE.ExtrudeGeometry(forme, { depth: epaisseur, bevelEnabled: true, bevelThickness: biseau, bevelSize: biseau, bevelSegments: 2, curveSegments: 12 });
  g.translate(0, 0, -epaisseur / 2);
  return g;
}
let texOmbre = null, texEtoile = null, texRond = null;
function toileOmbre() {
  if (!texOmbre) {
    texOmbre = toile(128, 128, (x, l, h) => {
      const g = x.createRadialGradient(l / 2, h / 2, 0, l / 2, h / 2, l / 2);
      g.addColorStop(0, "rgba(18,5,13,0.45)");
      g.addColorStop(0.55, "rgba(18,5,13,0.18)");
      g.addColorStop(1, "rgba(18,5,13,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, l, h);
    });
    texOmbre.userData.partage = true;
  }
  return texOmbre;
}
// une étoile à quatre branches (les reflets nacrés, les étoiles de la capture)
function toileEtoile() {
  if (!texEtoile) {
    texEtoile = toile(64, 64, (x, l, h) => {
      x.translate(l / 2, h / 2);
      const g = x.createRadialGradient(0, 0, 0, 0, 0, 20);
      g.addColorStop(0, "rgba(255,255,255,0.95)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = g;
      x.beginPath(); x.arc(0, 0, 20, 0, TAU); x.fill();
      x.fillStyle = "#ffffff";
      x.beginPath();
      for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, r = i % 2 ? 5 : 31; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      x.closePath();
      x.fill();
    });
    texEtoile.userData.partage = true;
  }
  return texEtoile;
}
function toileRond() {
  if (!texRond) {
    texRond = toile(32, 32, (x, l, h) => {
      x.fillStyle = "#ffffff";
      x.beginPath(); x.arc(l / 2, h / 2, l / 2 - 2, 0, TAU); x.fill();
    });
    texRond.userData.partage = true;
  }
  return texRond;
}
function liberer(o) {
  o.traverse((m) => {
    if (!(m.isMesh || m.isSprite)) return;
    if (m.isMesh && !m.userData.encre && m.geometry && !m.geometry.userData.partage) m.geometry.dispose();
    for (const x of Array.isArray(m.material) ? m.material : [m.material]) {
      if (!x || x.userData.partage) continue;
      for (const t of [x.map, x.emissiveMap]) if (t && !t.userData.partage) t.dispose();
      x.dispose();
    }
  });
}
// placer une partie sur un corps en forme d'œuf, dans une direction donnée
const surEllipsoide = (d, rx, ry, rz, k = 1) => new THREE.Vector3(d.x * rx, d.y * ry, d.z * rz).multiplyScalar(k);

// ---------- Piquebulle, Corapouf, Récifort (Corail) : un poisson-ballon aux piquants tout mous ; le corail pousse en grandissant
const PALETTES_PIQUE = {
  1: { corps: "#ff9270", tache: "#f26c55", ventre: "#ffe9c8", pique: "#ffb48e", bout: "#ffe36e", nageoire: "#ffae87", bouche: "#b3304d", iris: "#2f7bd6", joue: "#ff5f9a" },
  2: { corps: "#ff7c64", tache: "#e2503f", ventre: "#ffe6c4", pique: "#ffa680", bout: "#ffe066", nageoire: "#ff9a78", bouche: "#a82847", iris: "#1f6bc9", joue: "#ff5f9a", corail: "#3fd6c6", corailBout: "#b6fff4" },
  3: { corps: "#f2645a", tache: "#c93d3d", ventre: "#ffdfc0", pique: "#ff9572", bout: "#ffdc5c", nageoire: "#f08770", bouche: "#962040", iris: "#155ab8", joue: "#ff4f8a", corail: "#2fc9b8", corailBout: "#b6fff4", plaque: "#b53b40", lueur: "#8ff7ff" },
};
const NACRE_PIQUE = { corps: "#f6eeff", tache: "#e2d0ff", ventre: "#ffffff", pique: "#fde8ff", bout: "#ffd36b", nageoire: "#e9d9ff", bouche: "#a06bd6", iris: "#9b5cff", joue: "#ffb3e6", corail: "#ffd36b", corailBout: "#fff4c2", plaque: "#d6c2ff", lueur: "#ffe58a" };
function corail(P, taille, graine) {
  const g = new THREE.Group();
  const mat = toon(P.corail), matBout = toon(P.corailBout);
  const r = alea(graine);
  const branche = (pts, r0, r1) => {
    const c = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z).multiplyScalar(taille)));
    g.add(encrer(new THREE.Mesh(tubeVariable(c, (t) => (r0 + (r1 - r0) * t) * taille, { n: 14, m: 10 }), mat), 0.014));
    const bout = encrer(new THREE.Mesh(new THREE.SphereGeometry(r1 * taille * 1.45, 12, 10), matBout), 0.012);
    bout.position.copy(c.getPointAt(1));
    g.add(bout);
  };
  const p = (v) => v * (0.9 + r() * 0.2);
  branche([[0, -0.05, 0], [0.02, 0.22, 0], [-0.03, 0.45, 0.02], [0.03, p(0.64), 0]], 0.09, 0.05);
  branche([[0, 0.24, 0], [0.12, 0.33, 0], [p(0.23), p(0.48), 0.01]], 0.06, 0.04);
  branche([[0, 0.38, 0], [-0.1, 0.46, 0], [-p(0.18), p(0.6), 0]], 0.055, 0.035);
  return g;
}
function piquebulle(stade, nacree) {
  const P = nacree ? NACRE_PIQUE : PALETTES_PIQUE[stade];
  const R = [1, 1.16, 1.32][stade - 1];
  const [RX, RY, RZ] = [R, R * 0.94, R * 0.97];
  const racine = new THREE.Group();
  const boule = new THREE.Group(); // ce qui gonfle
  racine.add(boule);
  // le corps : orange, le ventre clair, des taches (pas sur le visage)
  const tex = toile(512, 256, (x, l, h) => {
    x.fillStyle = P.corps; x.fillRect(0, 0, l, h);
    const g = x.createLinearGradient(0, h * 0.5, 0, h * 0.7);
    g.addColorStop(0, P.corps); g.addColorStop(1, P.ventre);
    x.fillStyle = g; x.fillRect(0, h * 0.5, l, h * 0.2);
    x.fillStyle = P.ventre; x.fillRect(0, h * 0.7, l, h * 0.3);
    const r = alea(7 + stade);
    x.fillStyle = P.tache;
    for (let i = 0; i < 22 + stade * 6; i++) {
      const u = r(), v = 0.12 + r() * 0.38;
      if (u > 0.1 && u < 0.4 && v > 0.18) continue;
      const rr = (5 + r() * 9) * (1 + stade * 0.06);
      x.beginPath(); x.arc(u * l, v * h, rr, 0, TAU); x.fill();
    }
  });
  const corps = encrer(new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32).scale(RX, RY, RZ), toon("#ffffff", { map: tex })), 0.035);
  boule.add(corps);
  // les piquants : mous, arrondis, du saumon au jaune
  const L = [1, 1.18, 1.36][stade - 1];
  const profil = [[0, 0], [0.09, 0], [0.086, 0.07], [0.066, 0.15], [0.042, 0.21], [0.02, 0.245], [0, 0.256]].map(([a, b]) => new THREE.Vector2(a, b));
  const ca = new THREE.Color(P.pique), cb = new THREE.Color(P.bout);
  const pics = [];
  const total = [30, 38, 46][stade - 1];
  const q = new THREE.Quaternion(), m4 = new THREE.Matrix4(), un = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < total; i++) {
    const y = 1 - ((i + 0.5) / total) * 2, rr = Math.sqrt(1 - y * y), a = i * 2.39996;
    const d = new THREE.Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr);
    if (d.y < -0.28) continue; // pas sous le ventre
    if (d.z > 0.42 && d.y < 0.62) continue; // pas sur le visage
    if (Math.abs(d.x) > 0.78 && Math.abs(d.y) < 0.34 && d.z > -0.2) continue; // pas sur les nageoires
    if (d.z < -0.86) continue; // pas sur la queue
    const geo = new THREE.LatheGeometry(profil, 9);
    geo.scale(L, L, L);
    const c = [];
    const pa = geo.attributes.position;
    for (let k = 0; k < pa.count; k++) { const cc = ca.clone().lerp(cb, doux(0.3, 0.95, pa.getY(k) / (0.256 * L))); c.push(cc.r, cc.g, cc.b); }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
    q.setFromUnitVectors(HAUT, d);
    m4.compose(surEllipsoide(d, RX, RY, RZ, 0.96), q, un);
    geo.applyMatrix4(m4);
    pics.push(geo);
  }
  const piquants = encrer(new THREE.Mesh(fusionner(pics), toon("#ffffff", { vertexColors: true })), 0.016);
  pics.forEach((g) => g.dispose());
  boule.add(piquants);
  // les yeux, la bouche en « o », les joues
  const yeux = [];
  for (const s of [-1, 1]) {
    const o = oeil(0.25 + 0.02 * stade, P.iris);
    o.position.copy(surEllipsoide(new THREE.Vector3(s * 0.42, 0.2, 0.88).normalize(), RX, RY, RZ, 0.94));
    o.quaternion.setFromUnitVectors(AVANT, new THREE.Vector3(s * 0.2, 0.06, 1).normalize());
    boule.add(o);
    yeux.push(o);
    const j = new THREE.Mesh(new THREE.CircleGeometry(0.15 * R, 24), new THREE.MeshBasicMaterial({ color: P.joue, transparent: true, opacity: 0.45, depthWrite: false }));
    const dj = new THREE.Vector3(s * 0.64, -0.08, 0.76).normalize();
    j.position.copy(surEllipsoide(dj, RX, RY, RZ, 1.02));
    j.quaternion.setFromUnitVectors(AVANT, dj);
    j.scale.set(1.25, 0.72, 1);
    boule.add(j);
  }
  const db = new THREE.Vector3(0, -0.22, 0.97).normalize();
  const bouche = encrer(new THREE.Mesh(new THREE.TorusGeometry(0.085 * R, 0.042 * R, 10, 24), toon(P.bouche)), 0.014);
  bouche.position.copy(surEllipsoide(db, RX, RY, RZ, 1.0));
  bouche.quaternion.setFromUnitVectors(AVANT, db);
  const trou = new THREE.Mesh(new THREE.CircleGeometry(0.07 * R, 20), new THREE.MeshBasicMaterial({ color: "#4a1028" }));
  trou.position.z = -0.01;
  bouche.add(trou);
  boule.add(bouche);
  // les nageoires (qui battent vite) et la queue (qui frétille)
  const formeNag = new THREE.Shape();
  formeNag.moveTo(0, -0.1);
  formeNag.bezierCurveTo(0.2, -0.3, 0.5, -0.28, 0.56, -0.08);
  formeNag.bezierCurveTo(0.6, 0.02, 0.48, 0.1, 0.44, 0.06);
  formeNag.bezierCurveTo(0.42, 0.2, 0.3, 0.24, 0.26, 0.16);
  formeNag.bezierCurveTo(0.2, 0.26, 0.06, 0.22, 0, 0.1);
  formeNag.closePath();
  const geoNag = plaque(formeNag);
  const matNag = toon(P.nageoire);
  const nageoires = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * RX * 0.9, -0.14 * R, 0.12 * R);
    const m = encrer(new THREE.Mesh(geoNag, matNag), 0.014);
    m.scale.set(s * R, R, R);
    m.rotation.z = -s * 0.25;
    pivot.add(m);
    boule.add(pivot);
    nageoires.push(pivot);
  }
  const formeQueue = new THREE.Shape();
  formeQueue.moveTo(0, 0);
  formeQueue.bezierCurveTo(0.2, 0.06, 0.4, 0.3, 0.6, 0.44);
  formeQueue.bezierCurveTo(0.57, 0.2, 0.5, 0.06, 0.46, 0);
  formeQueue.bezierCurveTo(0.5, -0.06, 0.57, -0.2, 0.6, -0.44);
  formeQueue.bezierCurveTo(0.4, -0.3, 0.2, -0.06, 0, 0);
  const queue = new THREE.Group();
  queue.position.set(0, 0.04 * R, -RZ * 0.9);
  const mq = encrer(new THREE.Mesh(plaque(formeQueue), matNag), 0.014);
  mq.rotation.y = Math.PI / 2;
  mq.scale.setScalar(R);
  queue.add(mq);
  boule.add(queue);
  // en grandissant : du corail sur la tête, puis une carapace et des points qui brillent
  if (stade >= 2) {
    for (const s of [-1, 1]) {
      const c = corail(P, stade === 3 ? 1.12 : 0.92, 30 + s + stade);
      c.position.copy(surEllipsoide(new THREE.Vector3(s * 0.4, 0.88, 0.02).normalize(), RX, RY, RZ, 0.9));
      c.rotation.set(0, s * 0.3, -s * 0.38);
      c.scale.x = s;
      boule.add(c);
    }
  }
  if (stade === 3) {
    const centre = corail(P, 1.28, 44);
    centre.position.copy(surEllipsoide(new THREE.Vector3(0, 1, -0.25).normalize(), RX, RY, RZ, 0.9));
    centre.rotation.x = -0.25;
    boule.add(centre);
    const matPlaque = toon(P.plaque);
    for (const d of [[0.42, 0.62, -0.62], [-0.42, 0.62, -0.62], [0, 0.42, -0.9], [0.62, 0.2, -0.74], [-0.62, 0.2, -0.74]]) {
      const v = new THREE.Vector3(...d).normalize();
      const p = encrer(new THREE.Mesh(new THREE.SphereGeometry(0.3 * R, 20, 12).scale(1, 0.38, 1), matPlaque), 0.014);
      p.position.copy(surEllipsoide(v, RX, RY, RZ, 0.97));
      p.quaternion.setFromUnitVectors(HAUT, v);
      boule.add(p);
    }
    const matLueur = new THREE.MeshBasicMaterial({ color: P.lueur });
    const r = alea(91);
    for (let i = 0; i < 10; i++) {
      const v = new THREE.Vector3(r() * 2 - 1, r() * 0.9 - 0.1, -0.2 - r() * 0.8).normalize();
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.045 * R, 10, 8), matLueur);
      p.position.copy(surEllipsoide(v, RX, RY, RZ, 1.0));
      boule.add(p);
    }
    // les sourcils : il a l'air décidé
    for (const s of [-1, 1]) {
      const sc = encrer(new THREE.Mesh(new THREE.CapsuleGeometry(0.04 * R, 0.2 * R, 4, 8), toon(P.plaque)), 0.012);
      sc.position.copy(surEllipsoide(new THREE.Vector3(s * 0.4, 0.5, 0.77).normalize(), RX, RY, RZ, 1.0));
      sc.rotation.set(-0.5, s * 0.25, Math.PI / 2 - s * 0.32);
      boule.add(sc);
    }
  }
  const cligne = clignement(11 + stade);
  const animer = (t) => {
    racine.position.y = Math.sin(t * 1.6) * 0.07 * R;
    racine.rotation.z = Math.sin(t * 1.05) * 0.05;
    racine.rotation.x = Math.sin(t * 0.8) * 0.04;
    // il se gonfle toutes les 7 secondes, en plissant les yeux
    const p = ((t % 7) + 7) % 7;
    const gonfle = doux(5.5, 5.8, p) * (1 - doux(6.3, 6.85, p));
    boule.scale.setScalar(1 + 0.13 * gonfle);
    piquants.scale.setScalar(1 + 0.07 * gonfle);
    nageoires[0].rotation.y = 0.25 + Math.sin(t * 9) * 0.38;
    nageoires[1].rotation.y = -0.25 - Math.sin(t * 9 + 0.4) * 0.38;
    queue.rotation.y = Math.sin(t * 3.3) * 0.38;
    const k = Math.min(cligne(t), 1 - 0.45 * gonfle);
    for (const o of yeux) o.scale.y = 1.1 * k;
  };
  return { racine, animer, rayon: R * 1.5, centre: [0.02, 0.18, 0.28][stade - 1] * R, bas: -RY * 1.02, sauvage: 0.62 * R, vole: false, hauteur: 0.2 };
}

// ---------- Nuéraie (Brume) : une raie qui nage dans les nuages ; des croissants de lune sur les ailes
const PAL_NUE = { dos: "#7d99ff", flanc: "#aec4ff", ventre: "#f3f3ff", lune: "#fff1a6", nuage: "#ffffff", iris: "#3b4fd8", corne: "#6a84f4", bouche: "#3a1d4a", joue: "#ff8fc4" };
const NACRE_NUE = { dos: "#ffcfee", flanc: "#ffeaf8", ventre: "#ffffff", lune: "#ffcf5a", nuage: "#fff6fd", iris: "#ff4fa6", corne: "#f2b2ff", bouche: "#7a2f6a", joue: "#ff8fc4" };
function geoAile(envergure = 1.62) {
  const g = new THREE.SphereGeometry(1, 48, 24);
  g.rotateZ(-Math.PI / 2); // les pôles aux deux bouts de l'aile (la pointe est fine)
  g.rotateX(-Math.PI / 2); // la couture au bord de fuite
  const p = g.attributes.position, uv = g.attributes.uv;
  let zmin = 9, zmax = -9;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const s = (x + 1) / 2; // 0 à la racine, 1 à la pointe
    const corde = 1.08 * (1 - 0.78 * Math.pow(s, 1.05));
    const Z = z * corde * (z > 0 ? 1 : 0.8) - 0.72 * Math.pow(s, 1.6) + 0.12;
    const Y = y * 0.2 * (1 - 0.7 * s) + 0.08 * Math.pow(s, 2.4);
    p.setXYZ(i, s * envergure, Y, Z);
    zmin = Math.min(zmin, Z);
    zmax = Math.max(zmax, Z);
  }
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / envergure, (p.getZ(i) - zmin) / (zmax - zmin));
  g.computeVertexNormals();
  return g;
}
function nueraie(nacree) {
  const P = nacree ? NACRE_NUE : PAL_NUE;
  const racine = new THREE.Group();
  const corpsG = new THREE.Group();
  racine.add(corpsG);
  const texCorps = toile(512, 256, (x, l, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, P.dos); g.addColorStop(0.4, P.flanc); g.addColorStop(0.5, P.ventre); g.addColorStop(1, P.ventre);
    x.fillStyle = g; x.fillRect(0, 0, l, h);
  });
  const corps = encrer(new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32).scale(0.95, 0.5, 1.15), toon("#ffffff", { map: texCorps })), 0.03);
  corpsG.add(corps);
  // les ailes : un dégradé, deux croissants de lune qui brillent
  const croissants = [[0.34, 0.58, 16], [0.62, 0.52, 11]];
  const fondAile = (x, l) => { const g = x.createLinearGradient(0, 0, l, 0); g.addColorStop(0, P.dos); g.addColorStop(1, P.flanc); return g; };
  const lune = (x, l, h, couleur, fond) => {
    for (const [u, v, r] of croissants) {
      x.save();
      x.beginPath(); x.arc(u * l, v * h, r, 0, TAU); x.clip();
      x.fillStyle = couleur; x.fillRect(u * l - r, v * h - r, 2 * r, 2 * r);
      x.fillStyle = fond; x.beginPath(); x.arc(u * l + r * 0.5, v * h - r * 0.28, r * 0.88, 0, TAU); x.fill();
      x.restore();
    }
  };
  const texAile = toile(256, 128, (x, l, h) => {
    const f = fondAile(x, l);
    x.fillStyle = f; x.fillRect(0, 0, l, h);
    x.fillStyle = "rgba(255,255,255,0.35)"; x.fillRect(0, h * 0.86, l, h * 0.14); // le bord d'attaque, plus clair
    lune(x, l, h, P.lune, f);
  });
  const texLueur = toile(256, 128, (x, l, h) => { x.fillStyle = "#000"; x.fillRect(0, 0, l, h); lune(x, l, h, "#ffffff", "#000000"); });
  const matAile = toon("#ffffff", { map: texAile, emissive: P.lune, emissiveMap: texLueur, emissiveIntensity: 0.55 });
  const geoA = geoAile();
  const ailes = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.5, 0.0, 0.02);
    const m = encrer(new THREE.Mesh(geoA, matAile), 0.03);
    m.scale.x = s;
    pivot.add(m);
    const touffe = nuage(0.15, P.nuage, 3 + s);
    touffe.position.set(s * 1.44, 0.12, -0.56);
    pivot.add(touffe);
    const touffe2 = nuage(0.1, P.nuage, 5 + s);
    touffe2.position.set(s * 0.95, 0.14, 0.24);
    pivot.add(touffe2);
    corpsG.add(pivot);
    ailes.push(pivot);
  }
  // le dos : une touffe de nuage ; devant : deux petites cornes enroulées
  const dos = nuage(0.2, P.nuage, 21);
  dos.position.set(0, 0.44, -0.36);
  corpsG.add(dos);
  const matCorne = toon(P.corne);
  for (const s of [-1, 1]) {
    const lobe = encrer(new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12).scale(0.62, 0.42, 1.35), matCorne), 0.014);
    lobe.position.set(s * 0.42, -0.04, 1.0);
    lobe.rotation.set(0.15, s * 0.45, s * 0.25);
    corpsG.add(lobe);
  }
  const yeux = [];
  for (const s of [-1, 1]) {
    const o = oeil(0.21, P.iris);
    o.position.copy(surEllipsoide(new THREE.Vector3(s * 0.36, 0.5, 0.84).normalize(), 0.95, 0.5, 1.15, 0.92));
    o.quaternion.setFromUnitVectors(AVANT, new THREE.Vector3(s * 0.22, 0.38, 1).normalize());
    corpsG.add(o);
    yeux.push(o);
    const j = new THREE.Mesh(new THREE.CircleGeometry(0.08, 18), new THREE.MeshBasicMaterial({ color: P.joue, transparent: true, opacity: 0.5, depthWrite: false }));
    j.position.copy(surEllipsoide(new THREE.Vector3(s * 0.56, 0.1, 0.82).normalize(), 0.95, 0.5, 1.15, 1.03));
    j.rotation.set(-0.2, s * 0.5, 0);
    j.scale.set(1.3, 0.75, 1);
    corpsG.add(j);
  }
  const arc = Math.PI * 0.62;
  const bouche = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.022, 8, 24, arc), new THREE.MeshBasicMaterial({ color: P.bouche }));
  bouche.position.set(0, -0.06, 1.16);
  bouche.rotation.set(0.35, 0, Math.PI + (Math.PI - arc) / 2);
  corpsG.add(bouche);
  // la queue : trois morceaux qui ondulent, et un petit nuage au bout
  const queue = [];
  let parent = corpsG;
  const longueurs = [0.72, 0.58, 0.48], rayons = [[0.08, 0.058], [0.058, 0.04], [0.04, 0.022]];
  const matQueue = toon(P.dos);
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Group();
    seg.position.set(0, 0, i ? -longueurs[i - 1] : -1.05);
    const geo = new THREE.CylinderGeometry(rayons[i][1], rayons[i][0], longueurs[i], 10, 1, false);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, -longueurs[i] / 2);
    seg.add(encrer(new THREE.Mesh(geo, matQueue), 0.012));
    seg.add(encrer(new THREE.Mesh(new THREE.SphereGeometry(rayons[i][0], 10, 8), matQueue), 0.012));
    parent.add(seg);
    queue.push(seg);
    parent = seg;
  }
  const bout = nuage(0.1, P.nuage, 9);
  bout.position.set(0, 0, -longueurs[2]);
  parent.add(bout);
  // trois gouttes de pluie, de temps en temps
  const gouttes = [];
  const geoGoutte = new THREE.SphereGeometry(0.05, 10, 8).scale(1, 1.6, 1);
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(geoGoutte, new THREE.MeshBasicMaterial({ color: "#8fd0ff", transparent: true, opacity: 0, depthWrite: false }));
    racine.add(m);
    gouttes.push(m);
  }
  const cligne = clignement(23);
  const animer = (t) => {
    const b = Math.sin(t * 2.3);
    racine.position.y = Math.sin(t * 1.15) * 0.12 - b * 0.05;
    racine.rotation.x = Math.sin(t * 1.15 + 0.6) * 0.07;
    racine.rotation.z = Math.sin(t * 0.7) * 0.05;
    ailes[0].rotation.z = -(b * 0.36 + 0.04);
    ailes[1].rotation.z = b * 0.36 + 0.04;
    queue.forEach((s, i) => { s.rotation.y = Math.sin(t * 1.8 - i * 0.8) * 0.3; s.rotation.x = (i ? -0.12 : -0.42) + Math.sin(t * 2.3 - i * 0.7) * 0.1; });
    const k = cligne(t);
    for (const o of yeux) o.scale.y = k;
    const p = ((t % 5) + 5) % 5;
    gouttes.forEach((g, i) => {
      const u = (p - 3 - i * 0.14) / 0.85;
      g.material.opacity = u > 0 && u < 1 ? 1 - u * u : 0;
      g.position.set([-0.35, 0.1, 0.42][i], -0.2 - 2.6 * Math.max(0, u) * Math.max(0, u), [0.1, -0.3, 0.25][i]);
    });
  };
  return { racine, animer, rayon: 2.05, centre: 0.02, bas: -0.62, sauvage: 1.7, vole: true, hauteur: 0.55 };
}

// ---------- Hippoudre (Tempête) : un hippocampe à la crinière d'éclairs
const PAL_HIP = { corps: "#5d40d4", bande: "#4a31b8", ventre: "#cbbcff", criniere: "#ffe14a", nageoire: "#fff1a0", museau: "#8268ea", iris: "#ffb000", joue: "#ff6fb5" };
const NACRE_HIP = { corps: "#f1e9ff", bande: "#ddd0ff", ventre: "#ffffff", criniere: "#6ff0ff", nageoire: "#c8fbff", museau: "#e2d6ff", iris: "#ff4fc8", joue: "#ffb3e6" };
function hippoudre(nacree) {
  const P = nacree ? NACRE_HIP : PAL_HIP;
  const racine = new THREE.Group();
  const corps = new THREE.Group();
  racine.add(corps);
  const courbe = new THREE.CatmullRomCurve3([
    [0, 1.34, -0.02], [0, 1.02, 0.17], [0, 0.62, 0.31], [0, 0.2, 0.27], [0, -0.18, 0.07], [0, -0.5, -0.12],
    [0, -0.82, -0.08], [0, -0.99, 0.12], [0, -0.9, 0.33], [0, -0.69, 0.36], [0, -0.6, 0.21],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, "centripetal");
  const T = [0, 0.1, 0.25, 0.4, 0.52, 0.66, 0.8, 0.92, 1], RV = [0.25, 0.34, 0.44, 0.38, 0.24, 0.15, 0.1, 0.07, 0.045];
  const rayon = (t) => {
    let i = 0;
    while (i < T.length - 2 && t > T[i + 1]) i++;
    const k = borne((t - T[i]) / (T[i + 1] - T[i]));
    return RV[i] + (RV[i + 1] - RV[i]) * k * k * (3 - 2 * k);
  };
  const cCorps = new THREE.Color(P.corps), cBande = new THREE.Color(P.bande), cVentre = new THREE.Color(P.ventre);
  const couleur = (t, d) => (t > 0.05 && t < 0.5 && d.z > 0.55 ? cVentre : Math.floor(t * 34) % 2 ? cBande : cCorps);
  corps.add(encrer(new THREE.Mesh(tubeVariable(courbe, rayon, { n: 90, m: 18, couleur }), toon("#ffffff", { vertexColors: true })), 0.026));
  const finQueue = encrer(new THREE.Mesh(new THREE.SphereGeometry(0.046, 10, 8), toon(P.bande)), 0.012);
  finQueue.position.copy(courbe.getPointAt(1));
  corps.add(finQueue);
  // la tête, le museau en trompette, les yeux sur les côtés
  const tete = new THREE.Group();
  tete.position.set(0, 1.58, 0.02);
  corps.add(tete);
  const matCorps = toon(P.corps);
  tete.add(encrer(new THREE.Mesh(new THREE.SphereGeometry(0.5, 36, 24).scale(0.8, 0.84, 1.02), matCorps), 0.03));
  const cm = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.06, 0.28), new THREE.Vector3(0, -0.15, 0.62), new THREE.Vector3(0, -0.22, 0.9)]);
  tete.add(encrer(new THREE.Mesh(tubeVariable(cm, (t) => 0.18 - 0.065 * t, { n: 16, m: 14 }), matCorps), 0.022));
  const anneau = encrer(new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.042, 10, 22), toon(P.museau)), 0.014);
  anneau.position.copy(cm.getPointAt(1));
  anneau.quaternion.setFromUnitVectors(AVANT, cm.getTangentAt(1));
  const trou = new THREE.Mesh(new THREE.CircleGeometry(0.075, 18), new THREE.MeshBasicMaterial({ color: "#2a0f3a" }));
  trou.position.z = -0.012;
  anneau.add(trou);
  tete.add(anneau);
  const yeux = [];
  for (const s of [-1, 1]) {
    const o = oeil(0.2, P.iris);
    o.position.set(s * 0.29, 0.1, 0.18);
    o.quaternion.setFromUnitVectors(AVANT, new THREE.Vector3(s * 0.55, 0.08, 0.83).normalize());
    tete.add(o);
    yeux.push(o);
    const j = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), new THREE.MeshBasicMaterial({ color: P.joue, transparent: true, opacity: 0.5, depthWrite: false }));
    j.position.set(s * 0.33, -0.14, 0.24);
    j.quaternion.setFromUnitVectors(AVANT, new THREE.Vector3(s * 0.75, -0.1, 0.65).normalize());
    j.scale.set(1.3, 0.75, 1);
    tete.add(j);
  }
  // la crinière : des éclairs qui crépitent, de la tête jusqu'au milieu du dos
  const formeEclair = new THREE.Shape([[0.1, 0.62], [0.3, 0.62], [0.2, 0.36], [0.32, 0.36], [0.02, -0.05], [0.12, 0.26], [0, 0.26]].map(([x, y]) => new THREE.Vector2(x - 0.12, y + 0.05)));
  const geoEclair = plaque(formeEclair, 0.05, 0.018);
  const matCriniere = toon(P.criniere, { emissive: P.criniere, emissiveIntensity: 0.45 });
  for (const [x, y, z, dx, dy, dz, roll, k] of [
    [0, 1.96, -0.02, 0, 1, -0.25, 0.0, 1.05], [0.02, 1.86, -0.24, 0.12, 0.85, -0.55, 0.35, 1.0], [-0.02, 1.68, -0.36, -0.12, 0.55, -0.85, -0.35, 1.08],
    [0.02, 1.42, -0.38, 0.1, 0.3, -0.95, 0.3, 0.95], [-0.02, 1.16, -0.3, -0.1, 0.15, -1, -0.3, 0.85], [0, 0.9, -0.17, 0, 0.05, -1, 0, 0.7],
  ]) {
    const m = encrer(new THREE.Mesh(geoEclair, matCriniere), 0.012);
    m.position.set(x, y, z);
    m.quaternion.setFromUnitVectors(HAUT, new THREE.Vector3(dx, dy, dz).normalize());
    m.rotateY(Math.PI / 2 + roll);
    m.scale.setScalar(k);
    corps.add(m);
  }
  // la nageoire du dos (qui vibre très vite) et deux petites près de la tête
  const formeFan = new THREE.Shape();
  formeFan.moveTo(0, 0);
  formeFan.lineTo(0, 0.42);
  formeFan.bezierCurveTo(0.2, 0.46, 0.42, 0.34, 0.46, 0.1);
  formeFan.bezierCurveTo(0.44, 0.04, 0.3, 0, 0, 0);
  const texFan = toile(64, 64, (x, l, h) => {
    x.fillStyle = P.nageoire; x.fillRect(0, 0, l, h);
    x.strokeStyle = "rgba(18,5,13,0.28)"; x.lineWidth = 2;
    for (let i = 1; i < 7; i++) { x.beginPath(); x.moveTo(0, h); x.lineTo((l * i) / 6.5, 0); x.stroke(); }
  });
  const matFan = toon("#ffffff", { map: texFan, emissive: P.nageoire, emissiveIntensity: 0.12 });
  const geoFan = plaque(formeFan, 0.02, 0.012);
  const dorsale = new THREE.Group();
  dorsale.position.set(0, 0.42, -0.36);
  const md = encrer(new THREE.Mesh(geoFan, matFan), 0.012);
  md.rotation.set(0, Math.PI / 2, 0.35);
  md.scale.setScalar(0.95);
  dorsale.add(md);
  corps.add(dorsale);
  const pectorales = [];
  for (const s of [-1, 1]) {
    const p = new THREE.Group();
    p.position.set(s * 0.22, 1.3, -0.08);
    const m = encrer(new THREE.Mesh(geoFan, matFan), 0.01);
    m.scale.set(s * 0.5, 0.5, 0.5);
    m.rotation.set(0, s * 0.4, -s * 0.9);
    p.add(m);
    corps.add(p);
    pectorales.push(p);
  }
  // les petits éclairs qui partent tout autour
  const texZap = toile(64, 128, (x) => {
    x.strokeStyle = "#ffffff"; x.lineWidth = 6; x.lineJoin = "round";
    x.shadowColor = "#fff7b0"; x.shadowBlur = 10;
    x.beginPath(); x.moveTo(38, 6); x.lineTo(20, 54); x.lineTo(42, 60); x.lineTo(22, 122); x.stroke();
  });
  const zaps = [0, 1, 2].map(() => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texZap, color: P.criniere, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.set(0.34, 0.68, 1);
    racine.add(s);
    return s;
  });
  const cligne = clignement(37);
  const animer = (t) => {
    racine.position.y = Math.sin(t * 1.3) * 0.1;
    racine.rotation.z = Math.sin(t * 0.9) * 0.05;
    corps.rotation.y = -0.85 + Math.sin(t * 0.55) * 0.16;
    tete.rotation.x = Math.sin(t * 1.3 + 1.2) * 0.06;
    dorsale.rotation.y = Math.sin(t * 38) * 0.22;
    pectorales[0].rotation.z = Math.sin(t * 22) * 0.3;
    pectorales[1].rotation.z = -Math.sin(t * 22 + 0.5) * 0.3;
    // la crinière crépite ; toutes les 3,2 s, un éclair part
    const c = ((t % 3.2) + 3.2) % 3.2;
    const zap = c > 2.55 && c < 2.85;
    matCriniere.emissiveIntensity = 0.42 + 0.22 * Math.sin(t * 17) * Math.sin(t * 7.3) + (zap ? 0.9 : 0);
    const tirage = Math.floor(t * 9);
    zaps.forEach((s, i) => {
      const on = zap && (tirage + i) % 3 !== 0;
      s.material.opacity = on ? 1 : 0;
      if (on) {
        const r = alea(tirage * 7 + i * 131);
        const a = r() * TAU;
        s.position.set(Math.cos(a) * (0.6 + r() * 0.4), 0.4 + r() * 1.5, Math.sin(a) * 0.5 - 0.2);
        s.material.rotation = (r() - 0.5) * 1.4;
      }
    });
    const k = cligne(t);
    for (const o of yeux) o.scale.y = k;
  };
  return { racine, animer, rayon: 1.85, centre: 0.58, bas: -1.08, sauvage: 1.25, vole: false, hauteur: 0.2 };
}

// ---------- une créature, nacrée ou non (la version nacrée a des reflets qui scintillent autour d'elle)
export function creerCreature(id, { nacree = false } = {}) {
  const e = ESPECES[id] ? id : "piquebulle";
  const c = e === "nueraie" ? nueraie(nacree) : e === "hippoudre" ? hippoudre(nacree) : piquebulle(ESPECES[e].n, nacree);
  c.id = e;
  c.nacree = nacree;
  if (nacree) {
    const r = alea(e.length * 97);
    const eclats = [];
    for (let i = 0; i < 12; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: toileEtoile(), color: ["#fff6c2", "#ffd6f5", "#d4f7ff"][i % 3], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      const a = r() * TAU, h = (r() - 0.35) * c.rayon * 1.1, d = c.rayon * (0.55 + r() * 0.45);
      s.position.set(Math.cos(a) * d, c.centre + h, Math.sin(a) * d);
      s.userData.phase = r() * TAU;
      s.userData.taille = 0.14 + r() * 0.16;
      c.racine.add(s);
      eclats.push(s);
    }
    const animer = c.animer;
    c.animer = (t) => {
      animer(t);
      for (const s of eclats) { const k = Math.max(0, Math.sin(t * 2.6 + s.userData.phase)); s.scale.setScalar(s.userData.taille * (0.15 + k)); s.material.opacity = k; }
    };
  }
  return c;
}

// ---------- la lumière (la même que la mer de GRAND LINE, un peu plus douce)
function eclairer(scene) {
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x6a4a6a, 1.2));
  const soleil = new THREE.DirectionalLight(0xffffff, 1.35);
  soleil.position.set(-2.5, 4.5, 4);
  const contre = new THREE.DirectionalLight(0xffc9ef, 0.5);
  contre.position.set(3, 1.5, -4);
  scene.add(soleil, contre);
}
// la mer de la créature sauvage : des bandes de couleur, des reflets en traits, et l'horizon qui se fond dans le ciel
function creerEau() {
  const u = { uTemps: { value: 0 }, uC1: { value: new THREE.Color("#c9fbff") }, uC2: { value: new THREE.Color("#3cc6ea") }, uC3: { value: new THREE.Color("#1d86d2") }, uC4: { value: new THREE.Color("#1a5fb0") } };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false,
    vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform float uTemps; uniform vec3 uC1, uC2, uC3, uC4; varying vec3 vP;
      void main(){
        float r = length(vP.xz);
        float w = sin(vP.x * 1.1 + uTemps * 1.1) + sin(vP.z * 1.5 - uTemps * 0.8) * 0.8 + sin((vP.x + vP.z) * 0.7 + uTemps * 0.5) * 0.6;
        float prof = smoothstep(2.5, 20.0, r);
        vec3 c = mix(uC2, uC3, prof);
        c = mix(c, uC4, smoothstep(12.0, 24.0, r));
        float trait = step(1.78, w + sin(vP.x * 3.1 - uTemps * 1.7) * 0.3);
        c = mix(c, uC1, trait * (1.0 - prof * 0.6) * 0.9);
        float a = (1.0 - smoothstep(16.0, 28.0, r)) * mix(0.82, 1.0, smoothstep(0.0, 3.0, r));
        gl_FragColor = vec4(c, a);
      }`,
  });
  const groupe = new THREE.Group();
  groupe.add(new THREE.Mesh(new THREE.CircleGeometry(30, 96).rotateX(-Math.PI / 2), mat));
  const ronds = [];
  const geoRond = new THREE.RingGeometry(0.93, 1, 56).rotateX(-Math.PI / 2);
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(geoRond, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    m.position.y = 0.02;
    groupe.add(m);
    ronds.push(m);
  }
  return { groupe, u, ronds };
}
// le filet : un dôme de corde (une texture en quadrillage), un bord épais et des petits plombs
function creerFilet() {
  const g = new THREE.Group();
  const tex = toile(512, 128, (x, l, h) => {
    x.clearRect(0, 0, l, h);
    const lignes = (couleur, epaisseur) => {
      x.strokeStyle = couleur; x.lineWidth = epaisseur;
      for (let k = 0; k < 18; k++) { const px = ((k + 0.5) * l) / 18; x.beginPath(); x.moveTo(px, 0); x.lineTo(px, h); x.stroke(); }
      for (let j = 1; j < 6; j++) { const py = (j * h) / 6; x.beginPath(); x.moveTo(0, py); x.lineTo(l, py); x.stroke(); }
    };
    lignes("#3a2410", 9);
    lignes("#f4dfae", 4.5);
    x.fillStyle = "#c79a5a";
    for (let k = 0; k < 18; k++) for (let j = 1; j < 6; j++) { x.beginPath(); x.arc(((k + 0.5) * l) / 18, (j * h) / 6, 4.5, 0, TAU); x.fill(); }
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 14, 0, TAU, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }));
  const matBord = toon("#b5793a", { transparent: true });
  const bord = encrer(new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 8, 56).rotateX(Math.PI / 2), matBord), 0.014);
  g.add(dome, bord);
  const matPlomb = toon("#6d6170", { transparent: true });
  for (let i = 0; i < 8; i++) {
    const p = encrer(new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), matPlomb), 0.012);
    const a = (i / 8) * TAU;
    p.position.set(Math.cos(a), -0.03, Math.sin(a));
    g.add(p);
  }
  g.userData.mats = [dome.material, matBord, matPlomb];
  return g;
}
// des petites choses qui volent (gouttes, étoiles), avec la gravité
function gerbe(scene, { n = 16, couleurs = ["#ffffff"], origine, vitesse = 3, haut = 3, gravite = 9, duree = 0.9, taille = 0.16, tex = toileRond(), graine = 1 }) {
  const r = alea(graine);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: couleurs[i % couleurs.length], transparent: true, depthWrite: false }));
    const a = r() * TAU;
    const v = new THREE.Vector3(Math.cos(a) * vitesse * (0.4 + r() * 0.6), haut * (0.6 + r() * 0.6), Math.sin(a) * vitesse * (0.4 + r() * 0.6));
    s.position.copy(origine);
    s.scale.setScalar(taille * (0.6 + r() * 0.8));
    scene.add(s);
    pts.push({ s, v, t0: null, base: s.scale.x });
  }
  return (t, dt) => {
    let vivant = false;
    for (const p of pts) {
      if (p.t0 === null) p.t0 = t;
      const u = (t - p.t0) / duree;
      if (u >= 1) { if (p.s.parent) { scene.remove(p.s); p.s.material.dispose(); } continue; }
      vivant = true;
      p.v.y -= gravite * dt;
      p.s.position.addScaledVector(p.v, dt);
      p.s.material.opacity = 1 - u * u;
      p.s.material.rotation += dt * 3;
    }
    return vivant;
  };
}

// ---------- la vue d'une créature : « fiche » (on la tourne, elle évolue) ou « sauvage » (sur l'eau, le filet)
export function creerVueCreature(canvas, { espece = "piquebulle", nacree = false, mode = "fiche", reduit = false, vide = false, surEvenement = () => {} } = {}) {
  const sauvage = mode === "sauvage";
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(ratio);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  eclairer(scene);
  const plateau = new THREE.Group(); // la créature tourne dessus (au doigt, ou toute seule)
  scene.add(plateau);
  const ombre = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: toileOmbre(), transparent: true, depthWrite: false }));
  if (!sauvage) scene.add(ombre);
  const eau = sauvage ? creerEau() : null;
  if (eau) scene.add(eau.groupe);
  let c = null, idActuel = espece, estNacree = nacree;
  let horloge = 0, derniere = 0, visible = true, actif = true, raf = 0;
  let angle = 0, elan = 0, tire = false, xTire = 0, dernierGeste = -10;
  const effets = []; // les animations en cours : (t, dt) → encore vivante ?
  let filet = null, cachee = false, camCible = null;
  function poser(id, opts = {}) {
    if (c) { plateau.remove(c.racine); liberer(c.racine); }
    idActuel = id;
    if ("nacree" in opts) estNacree = opts.nacree;
    c = creerCreature(idActuel, { nacree: estNacree });
    plateau.add(c.racine);
    cachee = false;
    cadrer();
  }
  function placement() {
    const l = canvas.clientWidth || 320, h = canvas.clientHeight || 240;
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * (l / h));
    const r = c.rayon * (sauvage ? 1.15 : 1.06);
    const d = Math.max(r / Math.sin(vfov / 2), r / Math.sin(hfov / 2));
    if (sauvage) {
      const y = c.sauvage + c.centre;
      return { pos: new THREE.Vector3(0, y + d * (c.vole ? 0.34 : 0.2), d * 1.08), cible: new THREE.Vector3(0, y - r * 0.12, 0) };
    }
    return { pos: new THREE.Vector3(0, c.centre + d * (c.hauteur ?? 0.2), d), cible: new THREE.Vector3(0, c.centre, 0) };
  }
  function cadrer() {
    const l = canvas.clientWidth || 320, h = canvas.clientHeight || 240;
    renderer.setSize(l, h, false);
    camera.aspect = l / h;
    camera.updateProjectionMatrix();
    const p = placement();
    camera.position.copy(p.pos);
    camera.lookAt(p.cible);
    camCible = null;
    plateau.position.y = sauvage ? c.sauvage : 0;
    ombre.position.y = c.bas - 0.06;
    ombre.scale.setScalar(c.rayon * 1.25);
  }
  // tourner la créature au doigt (fiche) ; elle revient de face toute seule
  if (!sauvage) {
    canvas.style.touchAction = "pan-y";
    canvas.addEventListener("pointerdown", (e) => { tire = true; xTire = e.clientX; elan = 0; canvas.setPointerCapture?.(e.pointerId); });
    canvas.addEventListener("pointermove", (e) => { if (!tire) return; const dx = e.clientX - xTire; xTire = e.clientX; angle += dx * 0.012; elan = dx * 0.012; dernierGeste = horloge; });
    const lacher = () => { tire = false; dernierGeste = horloge; };
    canvas.addEventListener("pointerup", lacher);
    canvas.addEventListener("pointercancel", lacher);
  }
  function boucle(ms) {
    raf = 0;
    if (!actif || !visible || document.hidden) return;
    const dt = Math.min(0.05, derniere ? (ms - derniere) / 1000 : 0.016) * (reduit ? 0.5 : 1);
    derniere = ms;
    horloge += dt;
    const t = horloge;
    if (c && !cachee) c.animer(t);
    if (!sauvage) {
      if (!tire) {
        angle += elan;
        elan *= 0.9;
        if (t - dernierGeste > 2.2) angle += (Math.round(angle / TAU) * TAU - angle) * Math.min(1, dt * 2.5);
      }
      plateau.rotation.y = angle + Math.sin(t * 0.45) * 0.32;
      ombre.material.opacity = 1 - (c?.racine.position.y || 0) * 0.8;
    } else {
      eau.u.uTemps.value = t;
      eau.ronds.forEach((m, i) => {
        const p = (t * 0.45 + i / 3) % 1;
        m.scale.setScalar((c?.rayon || 1) * (c?.vole ? 0.5 + 1.3 * p : 0.62 + 1.25 * p));
        m.material.opacity = cachee || !c ? 0 : (c.vole ? 0.28 : 0.55) * (1 - p);
      });
    }
    if (camCible) {
      camera.position.lerp(camCible.pos, Math.min(1, dt * 3));
      camera.lookAt(camCible.cible);
    }
    for (let i = effets.length - 1; i >= 0; i--) if (!effets[i](t, dt)) effets.splice(i, 1);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(boucle);
  }
  function demarrer() { if (!raf && actif && visible && !document.hidden) { derniere = 0; raf = requestAnimationFrame(boucle); } }
  const io = "IntersectionObserver" in window ? new IntersectionObserver((e) => { visible = e.some((x) => x.isIntersecting); demarrer(); }, { rootMargin: "120px" }) : null;
  io?.observe(canvas);
  const ro = "ResizeObserver" in window ? new ResizeObserver(() => { if (c) cadrer(); }) : null;
  ro?.observe(canvas);
  document.addEventListener("visibilitychange", demarrer);
  poser(espece);
  // (vide : la mer seule, la créature arrivera avec entree() ou changer())
  if (vide && sauvage) { cachee = true; c.racine.visible = false; }
  demarrer();

  // la créature sauvage sort de l'eau (ou descend du ciel)
  function entree() {
    cachee = false;
    c.racine.visible = true;
    const t0 = horloge;
    plateau.scale.setScalar(1);
    plateau.rotation.set(0, 0, 0);
    effets.push((t) => {
      const u = (t - t0) / 0.9;
      const k = borne(u);
      // un saut qui dépasse un peu, puis se pose
      plateau.position.y = c.sauvage + (c.vole ? 3 * (1 - k) * (1 - k) : -2.2 * (1 - k) * (1 - k) + Math.sin(k * Math.PI) * 0.55);
      plateau.scale.setScalar(0.4 + 0.6 * doux(0, 0.5, u));
      return u < 1;
    });
    if (!c.vole) effets.push(gerbe(scene, { n: 18, couleurs: ["#ffffff", "#c9fbff"], origine: new THREE.Vector3(0, 0.1, 0), vitesse: 2.6, haut: 4.2, duree: 0.95, taille: 0.2, graine: Math.floor(horloge * 10) }));
    surEvenement("entree");
  }
  // elle repart au large : elle plonge (ou s'envole), puis la mer reste vide (entree() la fait revenir)
  function partir() {
    if (!sauvage || cachee || filet || !c) return;
    const t0 = horloge;
    const y0 = plateau.position.y;
    effets.push((t) => {
      const k = borne((t - t0) / 0.7);
      plateau.position.y = y0 + (c.vole ? 2.6 * k * k : -1.8 * k * k);
      plateau.scale.setScalar(1 - 0.6 * k);
      if (k < 1) return true;
      c.racine.visible = false;
      cachee = true;
      plateau.scale.setScalar(1);
      return false;
    });
    if (!c.vole) effets.push(gerbe(scene, { n: 12, couleurs: ["#ffffff", "#c9fbff"], origine: new THREE.Vector3(0, 0.1, 0), vitesse: 2, haut: 3, duree: 0.8, taille: 0.18, graine: 3 }));
  }
  // lancer le filet : il vole, s'ouvre, tombe sur la créature, secoue trois fois, puis l'attrape (ou elle s'échappe)
  function lancerFilet(issue = "attrape") {
    return new Promise((fin) => {
      if (!sauvage || filet || cachee) return fin(null);
      filet = creerFilet();
      scene.add(filet);
      const R = c.rayon * (c.vole ? 0.72 : 1.0);
      const yC = c.sauvage + c.centre;
      const t0 = horloge;
      const depart = new THREE.Vector3(0.9, yC - 1.4, camera.position.z * 0.62);
      const haut = new THREE.Vector3(0, yC + R * 1.8, 0);
      const vus = new Set();
      effets.push((t) => {
        const u = t - t0;
        if (u < 0.55) {
          const k = u / 0.55;
          filet.position.lerpVectors(depart, haut, k);
          filet.position.y += Math.sin(k * Math.PI) * 1.1;
          filet.scale.setScalar(0.25 + k * (R * 1.3 - 0.25));
          filet.rotation.set(1.3 * (1 - k), k * 5, 0.5 * (1 - k));
          return true;
        }
        if (u < 0.8) {
          const k = doux(0, 1, (u - 0.55) / 0.25);
          filet.position.set(0, yC + R * 1.8 - k * R * 1.95, 0);
          filet.rotation.set(0, 5, 0);
          filet.scale.setScalar(R * 1.3);
          if (!vus.has("pose") && k > 0.95) { vus.add("pose"); surEvenement("filet"); }
          return true;
        }
        if (u < 1.0) { filet.scale.setScalar(R * (1.3 - 0.22 * doux(0, 1, (u - 0.8) / 0.2))); return true; }
        // trois secousses
        const s = u - 1.0;
        if (s < 2.25) {
          const i = Math.floor(s / 0.75), v = (s % 0.75) / 0.75;
          const a = v < 0.55 ? Math.sin((v / 0.55) * Math.PI * 3) * 0.24 * (1 - v / 0.55) : 0;
          filet.rotation.z = a;
          plateau.rotation.z = a * 1.1;
          if (!vus.has(i)) { vus.add(i); surEvenement("secousse", i + 1); }
          return true;
        }
        const f = s - 2.25;
        if (issue === "attrape") {
          if (!vus.has("fin")) {
            vus.add("fin");
            for (const m of filet.userData.mats) if (m.emissive) { m.emissive.set("#ffd36b"); m.emissiveIntensity = 0.8; }
            effets.push(gerbe(scene, { n: 22, couleurs: ["#ffe58a", "#ffffff", "#ffb3e6"], origine: new THREE.Vector3(0, yC, 0), vitesse: 3.4, haut: 3, gravite: 3, duree: 1.1, taille: 0.32, tex: toileEtoile(), graine: 5 }));
            surEvenement("attrape");
          }
          const k = doux(0.35, 1.0, f);
          filet.scale.setScalar(R * 1.08 * (1 - k));
          plateau.scale.setScalar(1 - k);
          filet.position.y = yC - R * 0.15 + k * 0.6;
          plateau.position.y = c.sauvage + k * 0.6;
          filet.rotation.y += 0.25 * k;
          if (f < 1.05) return true;
          scene.remove(filet); liberer(filet); filet = null;
          cachee = true;
          c.racine.visible = false;
          fin("attrape");
          return false;
        }
        if (!vus.has("fin")) {
          vus.add("fin");
          for (const m of filet.userData.mats) m.transparent = true;
          surEvenement("echappe");
          if (!c.vole) effets.push(gerbe(scene, { n: 14, couleurs: ["#ffffff", "#c9fbff"], origine: new THREE.Vector3(0, 0.1, 0), vitesse: 2.2, haut: 3.6, duree: 0.9, taille: 0.18, graine: 9 }));
        }
        const k = borne(f / 0.4);
        filet.scale.setScalar(R * (1.08 + 0.7 * k));
        for (const m of filet.userData.mats) m.opacity = 1 - k;
        plateau.rotation.z = 0;
        const v = borne(f / 0.9);
        if (c.vole) plateau.position.set(0, c.sauvage + v * v * 5, -v * v * 6);
        else plateau.position.y = c.sauvage + Math.sin(Math.min(v, 0.5) * Math.PI) * 0.9 - doux(0.5, 1, v) * 3.2;
        if (f < 0.95) return true;
        scene.remove(filet); liberer(filet); filet = null;
        cachee = true;
        c.racine.visible = false;
        plateau.position.set(0, c.sauvage, 0);
        fin("echappe");
        return false;
      });
    });
  }
  // évoluer : elle brille, devient blanche, clignote avec sa nouvelle forme de plus en plus vite, puis flash
  function evoluer(versId) {
    return new Promise((fin) => {
      if (sauvage || !ESPECES[versId]) return fin(false);
      const ancien = c;
      const nouveau = creerCreature(versId, { nacree: estNacree });
      nouveau.racine.visible = false;
      plateau.add(nouveau.racine);
      const blanchir = (o, oui) => o.racine.traverse((m) => {
        if (!m.isMesh) return;
        if (m.userData.encre) { m.visible = !oui; return; }
        if (oui && !m.userData.vraie) { m.userData.vraie = m.material; m.material = matBlanc; }
        if (!oui && m.userData.vraie) { m.material = m.userData.vraie; delete m.userData.vraie; }
      });
      const lueurs = [];
      ancien.racine.traverse((m) => { if (m.isMesh && !m.userData.encre && m.material?.emissive && !m.material.userData.partage) lueurs.push([m.material, m.material.emissive.clone(), m.material.emissiveIntensity]); });
      const t0 = horloge;
      const vus = new Set();
      surEvenement("evolution");
      effets.push((t, dt) => {
        const u = t - t0;
        nouveau.animer(t);
        if (u < 0.8) {
          const k = doux(0, 0.8, u);
          for (const [m] of lueurs) { m.emissive.set(0xffffff); m.emissiveIntensity = k * 0.9; }
          return true;
        }
        if (u < 3.0) {
          if (!vus.has("blanc")) { vus.add("blanc"); blanchir(ancien, true); blanchir(nouveau, true); }
          const v = (u - 0.8) / 2.2;
          const periode = 0.42 - 0.37 * v;
          const montre = Math.floor((u - 0.8) / periode) % 2 === 1;
          ancien.racine.visible = !montre;
          nouveau.racine.visible = montre;
          angle += dt * (2 + 10 * v);
          dernierGeste = t;
          return true;
        }
        if (!vus.has("flash")) {
          vus.add("flash");
          surEvenement("flash");
          plateau.remove(ancien.racine);
          liberer(ancien.racine);
          blanchir(nouveau, false);
          nouveau.racine.visible = true;
          c = nouveau;
          idActuel = versId;
          angle = Math.round(angle / TAU) * TAU;
          dernierGeste = horloge;
          camCible = placement();
          ombre.position.y = c.bas - 0.06;
          ombre.scale.setScalar(c.rayon * 1.25);
          effets.push(gerbe(scene, { n: 26, couleurs: ["#ffe58a", "#ffffff", "#9ff3ff"], origine: new THREE.Vector3(0, c.centre, 0), vitesse: 3.2, haut: 2.6, gravite: 2.5, duree: 1.3, taille: 0.3, tex: toileEtoile(), graine: 77 }));
        }
        const w = u - 3.0;
        plateau.scale.setScalar(1 + Math.sin(Math.min(1, w / 0.6) * Math.PI) * 0.12);
        if (w < 0.8) return true;
        plateau.scale.setScalar(1);
        fin(true);
        return false;
      });
    });
  }
  return {
    changer(id, opts = {}) { poser(id, opts); if (sauvage) entree(); },
    nacree(oui) { poser(idActuel, { nacree: oui }); },
    entree,
    partir,
    lancerFilet,
    evoluer,
    espece: () => idActuel,
    etat: () => ({ horloge, cachee, visible: Boolean(c?.racine.visible), y: plateau.position.y, echelle: plateau.scale.x, filet: Boolean(filet), effets: effets.length }),
    // l'image de la créature telle qu'on la voit (pour Discord)
    instantane() { renderer.render(scene, camera); return canvas.toDataURL("image/png"); },
    detruire() {
      actif = false;
      if (raf) cancelAnimationFrame(raf);
      io?.disconnect();
      ro?.disconnect();
      document.removeEventListener("visibilitychange", demarrer);
      if (c) liberer(c.racine);
      renderer.dispose();
    },
  };
}

// ---------- l'atelier : un seul rendu caché, qui dessine les vignettes du Bestiaire (vivantes, en silhouette) et l'image pour Discord
export function creerAtelier() {
  const canvas = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  eclairer(scene);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const support = new THREE.Group();
  scene.add(support);
  const ombre = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: toileOmbre(), transparent: true, depthWrite: false }));
  scene.add(ombre);
  const noir = new THREE.MeshBasicMaterial({ color: 0x2b1838 });
  const cache = new Map();
  const obtenir = (id, nacree) => {
    const k = `${id}|${nacree}`;
    if (!cache.has(k)) cache.set(k, creerCreature(id, { nacree }));
    return cache.get(k);
  };
  function rendre(id, { nacree = false, silhouette = false, t = performance.now() / 1000, l = 256, h = 256, angle = -0.42, marge = 1.08, hauteur = null }) {
    if (canvas.width !== l || canvas.height !== h) renderer.setSize(l, h, false);
    const c = obtenir(id, nacree);
    support.add(c.racine);
    support.rotation.y = angle;
    c.animer(t);
    camera.aspect = l / h;
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const r = c.rayon * marge;
    const d = Math.max(r / Math.sin(vfov / 2), r / Math.sin(hfov / 2));
    camera.position.set(0, c.centre + d * (hauteur ?? c.hauteur ?? 0.2), d);
    camera.lookAt(0, c.centre, 0);
    camera.updateProjectionMatrix();
    ombre.visible = !silhouette;
    ombre.position.y = c.bas - 0.06;
    ombre.scale.setScalar(c.rayon * 1.25);
    scene.overrideMaterial = silhouette ? noir : null;
    renderer.render(scene, camera);
    scene.overrideMaterial = null;
    support.remove(c.racine);
  }
  return {
    dessiner(ctx, id, o = {}) {
      const { width: l, height: h } = ctx.canvas;
      rendre(id, { ...o, l, h });
      ctx.clearRect(0, 0, l, h);
      ctx.drawImage(canvas, 0, 0, l, h);
    },
    instantane(id, o = {}) { rendre(id, { l: 640, h: 400, ...o }); return canvas.toDataURL("image/png"); },
    detruire() { for (const c of cache.values()) liberer(c.racine); cache.clear(); renderer.dispose(); },
  };
}
