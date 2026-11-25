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
// les raretés, de la plus courante à la plus rare : le rang décide des effets (aura, entrée, capture), la chance du filet
// est celle du bot (« 1 filet sur 2 »…), et « apparait » dit combien de créatures sur 100 sont de cette rareté
export const RARETES = {
  commune: { rang: 0, nom: "Commune", couleur: "#c3ccd8", lueur: "#ffffff", filet: "1 filet sur 2", apparait: 48 },
  peucommune: { rang: 1, nom: "Peu commune", couleur: "#5fdc8f", lueur: "#9dffc0", filet: "1 filet sur 3", apparait: 26 },
  rare: { rang: 2, nom: "Rare", couleur: "#4fa8ff", lueur: "#8fd0ff", filet: "1 filet sur 4", apparait: 15 },
  epique: { rang: 3, nom: "Épique", couleur: "#b56bff", lueur: "#d9a8ff", filet: "1 filet sur 8", apparait: 7 },
  legendaire: { rang: 4, nom: "Légendaire", couleur: "#ff9a2e", lueur: "#ffc46b", filet: "1 filet sur 20", apparait: 3 },
  or: { rang: 5, nom: "Or", couleur: "#ffd23f", lueur: "#fff0a0", filet: "1 filet sur 50", apparait: 1 },
};
const rangDe = (id) => RARETES[ESPECES[id]?.rarete]?.rang || 0;
const rareteDe = (id) => RARETES[ESPECES[id]?.rarete] || RARETES.commune;
export const ESPECES = {
  piquebulle: { n: 1, nom: "Piquebulle", type: "corail", rarete: "commune", ile: "L'Île des Moussaillons", ligne: ["piquebulle", "corapouf", "recifort"], stats: { force: 30, resistance: 55, vitesse: 35 },
    texte: "Il se gonfle dès qu'on le regarde trop longtemps. Ses piquants sont tout mous : il ne fait peur à personne, mais il ne le sait pas." },
  corapouf: { n: 2, nom: "Corapouf", type: "corail", rarete: "peucommune", ile: "L'Île des Moussaillons", ligne: ["piquebulle", "corapouf", "recifort"], stats: { force: 50, resistance: 72, vitesse: 40 },
    texte: "Du corail lui pousse sur la tête. Il le peigne tous les matins et boude si quelqu'un y touche." },
  recifort: { n: 3, nom: "Récifort", type: "corail", rarete: "rare", ile: "L'Île des Moussaillons", ligne: ["piquebulle", "corapouf", "recifort"], stats: { force: 72, resistance: 90, vitesse: 38 },
    texte: "Un vrai récif qui nage. Des petits poissons vivent sur son dos, et il fait très attention à eux." },
  crabouille: { n: 4, nom: "Crabouille", type: "corail", rarete: "commune", ile: "L'Île des Moussaillons", ligne: ["crabouille", null, null], stats: { force: 42, resistance: 58, vitesse: 28 },
    texte: "Il marche de travers, mais il est sûr d'aller tout droit. Sa grosse pince sert surtout à dire bonjour." },
  meduzette: { n: 6, nom: "Méduzette", type: "lueur", rarete: "commune", ile: "L'Archipel des Lucioles", ligne: ["meduzette", null, null], stats: { force: 22, resistance: 40, vitesse: 45 },
    texte: "La nuit, elle s'allume comme une petite lanterne. Elle ne pique pas : elle chatouille." },
  tortuffe: { n: 8, nom: "Tortuffe", type: "sylve", rarete: "peucommune", ile: "L'Île aux Champignons Géants", ligne: ["tortuffe", null, null], stats: { force: 38, resistance: 72, vitesse: 22 },
    texte: "Un champignon lui sert de carapace. Quand il a peur, il rentre la tête et fait semblant d'être un caillou." },
  pieuvrette: { n: 10, nom: "Pieuvrette", type: "abysses", rarete: "peucommune", ile: "La Cité Engloutie", ligne: ["pieuvrette", null, null], stats: { force: 40, resistance: 45, vitesse: 60 },
    texte: "Elle garde une perle trouvée dans la Cité Engloutie et ne la prête à personne. Même pas pour une seconde." },
  nueraie: { n: 13, nom: "Nuéraie", type: "brume", rarete: "rare", ile: "L'Archipel Suspendu", ligne: ["nueraie", null, null], stats: { force: 45, resistance: 50, vitesse: 85 },
    texte: "Elle nage dans les nuages comme dans l'eau. Quand elle passe au-dessus de toi, il pleut trois gouttes, jamais plus." },
  lanterneau: { n: 15, nom: "Lanterneau", type: "lueur", rarete: "rare", ile: "Le Phare du Bout du Monde", ligne: ["lanterneau", null, null], stats: { force: 55, resistance: 50, vitesse: 42 },
    texte: "Sa lanterne guide les bateaux perdus vers le Phare… ou vers son goûter. Ça dépend des jours." },
  narvelin: { n: 17, nom: "Narvélin", type: "givre", rarete: "rare", ile: "L'Île Givre", ligne: ["narvelin", null, null], stats: { force: 58, resistance: 62, vitesse: 66 },
    texte: "Sa corne est faite de glace qui ne fond jamais. Il s'en sert pour dessiner des flocons dans l'eau." },
  braisilotl: { n: 21, nom: "Braisilotl", type: "braise", rarete: "epique", ile: "L'Île Braise", ligne: ["braisilotl", null, null], stats: { force: 80, resistance: 58, vitesse: 62 },
    texte: "Il nage dans la lave comme dans un bain tiède. Ses branchies de feu font fondre les glaçons qu'on lui lance." },
  hippoudre: { n: 25, nom: "Hippoudre", type: "tempete", rarete: "epique", ile: "L'Île Tonnerre", ligne: ["hippoudre", null, null], stats: { force: 78, resistance: 45, vitesse: 80 },
    texte: "Sa crinière crépite sans arrêt. Il attend l'orage pour sortir, et il fonce sur chaque éclair comme sur un goûter." },
  celeste: { n: 28, nom: "Céleste", type: "brume", rarete: "legendaire", ile: "L'Archipel Suspendu", ligne: ["celeste", null, null], stats: { force: 88, resistance: 95, vitesse: 55 },
    texte: "On raconte qu'une île entière vit sur son dos. Quand elle chante, il pleut des arcs-en-ciel sur l'Archipel." },
  doublon: { n: 30, nom: "Doublon", type: "lueur", rarete: "or", ile: "L'Île au Trésor de Barhaw", ligne: ["doublon", null, null], stats: { force: 50, resistance: 70, vitesse: 90 },
    texte: "Chacune de ses écailles est une pièce d'or. Personne n'en a jamais attrapé deux… pour l'instant." },
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
let texHalo = null, texRayons = null, texPiece = null, texColonne = null;
// un rond de lumière, doux sur les bords (le halo des créatures rares)
function toileHalo() {
  if (!texHalo) {
    texHalo = toile(128, 128, (x, l, h) => {
      const g = x.createRadialGradient(l / 2, h / 2, 0, l / 2, h / 2, l / 2);
      g.addColorStop(0, "rgba(255,255,255,0.9)");
      g.addColorStop(0.35, "rgba(255,255,255,0.45)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, l, h);
    });
    texHalo.userData.partage = true;
  }
  return texHalo;
}
// des rayons de soleil (derrière les légendaires et les créatures en or)
function toileRayons() {
  if (!texRayons) {
    texRayons = toile(256, 256, (x, l, h) => {
      x.translate(l / 2, h / 2);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU, w = i % 2 ? 0.07 : 0.12;
        const g = x.createLinearGradient(0, 0, Math.cos(a) * 128, Math.sin(a) * 128);
        g.addColorStop(0, "rgba(255,255,255,0.85)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        x.fillStyle = g;
        x.beginPath();
        x.moveTo(0, 0);
        x.arc(0, 0, 128, a - w, a + w);
        x.closePath();
        x.fill();
      }
    });
    texRayons.userData.partage = true;
  }
  return texRayons;
}
// une pièce d'or (la pluie des créatures en or)
function toilePiece() {
  if (!texPiece) {
    texPiece = toile(64, 64, (x, l, h) => {
      const g = x.createRadialGradient(l * 0.4, h * 0.35, 2, l / 2, h / 2, l / 2);
      g.addColorStop(0, "#fff6c4"); g.addColorStop(0.55, "#ffcf3a"); g.addColorStop(1, "#c98a12");
      x.fillStyle = "#7a4a08";
      x.beginPath(); x.arc(l / 2, h / 2, l / 2 - 1, 0, TAU); x.fill();
      x.fillStyle = g;
      x.beginPath(); x.arc(l / 2, h / 2, l / 2 - 5, 0, TAU); x.fill();
      x.strokeStyle = "rgba(122,74,8,0.55)"; x.lineWidth = 3;
      x.beginPath(); x.arc(l / 2, h / 2, l / 2 - 13, 0, TAU); x.stroke();
    });
    texPiece.userData.partage = true;
  }
  return texPiece;
}
// une colonne de lumière, forte en bas, qui s'efface en montant (l'arrivée des légendaires)
function toileColonne() {
  if (!texColonne) {
    texColonne = toile(64, 256, (x, l, h) => {
      const g = x.createLinearGradient(0, h, 0, 0);
      g.addColorStop(0, "rgba(255,255,255,0.95)");
      g.addColorStop(0.5, "rgba(255,255,255,0.4)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, l, h);
      const b = x.createLinearGradient(0, 0, l, 0);
      b.addColorStop(0, "rgba(0,0,0,0.6)"); b.addColorStop(0.5, "rgba(0,0,0,0)"); b.addColorStop(1, "rgba(0,0,0,0.6)");
      x.globalCompositeOperation = "destination-out";
      x.fillStyle = b;
      x.fillRect(0, 0, l, h);
    });
    texColonne.userData.partage = true;
  }
  return texColonne;
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

// ---------- de petits outils pour les visages et les membres
// poser un objet sur un corps en forme d'œuf, tourné vers l'extérieur
function surCorps(o, d, RX, RY, RZ, k = 1, axe = AVANT) {
  const v = d.clone().normalize();
  o.position.copy(surEllipsoide(v, RX, RY, RZ, k));
  o.quaternion.setFromUnitVectors(axe, new THREE.Vector3(v.x / RX, v.y / RY, v.z / RZ).normalize());
  return o;
}
// un sourire (un arc de tore), une joue rose
function sourire(largeur, epaisseur, couleur, arc = Math.PI * 0.8) {
  const g = new THREE.TorusGeometry(largeur, epaisseur, 8, 24, arc);
  g.rotateZ(Math.PI + (Math.PI - arc) / 2);
  return encrer(new THREE.Mesh(g, toon(couleur)), 0.008);
}
function joueRose(r, couleur) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24), new THREE.MeshBasicMaterial({ color: couleur, transparent: true, opacity: 0.45, depthWrite: false }));
  m.scale.set(1.3, 0.75, 1);
  return m;
}
// un membre qui suit des points (pattes, tentacules, tiges), plus fin au bout
function membre(points, r0, r1, mat, { encre = 0.014, n = 24, m = 10 } = {}) {
  const courbe = new THREE.CatmullRomCurve3(points.map((p) => (p.isVector3 ? p : new THREE.Vector3(...p))));
  return encrer(new THREE.Mesh(tubeVariable(courbe, (t) => r0 + (r1 - r0) * t, { n, m }), mat), encre);
}
// une étoile de mer, une pièce, une forme à branches (extrudée)
function formeEtoile(branches, rExt, rInt) {
  const f = new THREE.Shape();
  for (let i = 0; i <= branches * 2; i++) {
    const a = (i / (branches * 2)) * TAU + Math.PI / 2, r = i % 2 ? rInt : rExt;
    if (i === 0) f.moveTo(Math.cos(a) * r, Math.sin(a) * r); else f.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return f;
}

// ---------- Crabouille (Corail, commune) : un petit crabe qui marche de travers, une grosse pince et une petite
const PAL_CRAB = { corps: "#ff6b5e", fonce: "#d9463f", ventre: "#ffd9c4", pince: "#ff8471", bout: "#ffd2b8", patte: "#e85a50", iris: "#3a2a6a", bouche: "#7a1d2e", joue: "#ff9fc2", etoile: "#ffd75e" };
const NACRE_CRAB = { corps: "#9fe6ff", fonce: "#6cc0ea", ventre: "#f2fcff", pince: "#b8eeff", bout: "#ffffff", patte: "#7fd2f2", iris: "#2a5ad6", bouche: "#3a3f8a", joue: "#ffb3e6", etoile: "#ff9fd6" };
function crabouille(nacree) {
  const P = nacree ? NACRE_CRAB : PAL_CRAB;
  const racine = new THREE.Group();
  const corpsG = new THREE.Group();
  racine.add(corpsG);
  const [RX, RY, RZ] = [1.08, 0.58, 0.74];
  const tex = toile(512, 256, (x, l, h) => {
    x.fillStyle = P.corps; x.fillRect(0, 0, l, h);
    const g = x.createLinearGradient(0, h * 0.52, 0, h * 0.68);
    g.addColorStop(0, P.corps); g.addColorStop(1, P.ventre);
    x.fillStyle = g; x.fillRect(0, h * 0.52, l, h * 0.16);
    x.fillStyle = P.ventre; x.fillRect(0, h * 0.68, l, h * 0.32);
    const r = alea(404);
    x.fillStyle = P.fonce;
    for (let i = 0; i < 18; i++) { const u = r(), v = 0.08 + r() * 0.36; if (u > 0.12 && u < 0.38 && v > 0.2) continue; x.beginPath(); x.arc(u * l, v * h, 4 + r() * 8, 0, TAU); x.fill(); }
  });
  const corps = encrer(new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32).scale(RX, RY, RZ), toon("#ffffff", { map: tex })), 0.032);
  corpsG.add(corps);
  // le bord de la carapace : une petite crête dentelée
  const matFonce = toon(P.fonce);
  for (let i = 0; i < 7; i++) {
    const a = -0.95 + (i / 6) * 1.9;
    const d = new THREE.Vector3(Math.sin(a) * 1, 0.2, Math.cos(a) * 0.6 - 0.15).normalize();
    const pic = encrer(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 10), matFonce), 0.012);
    surCorps(pic, d, RX, RY, RZ, 0.97, HAUT);
    corpsG.add(pic);
  }
  // les yeux au bout de deux tiges
  const matPince = toon(P.pince), matPatte = toon(P.patte);
  const yeux = [];
  for (const s of [-1, 1]) {
    const tige = membre([[s * 0.26, 0.42, 0.42], [s * 0.3, 0.72, 0.5], [s * 0.34, 0.92, 0.52]], 0.07, 0.055, matPince);
    corpsG.add(tige);
    const o = oeil(0.22, P.iris);
    o.position.set(s * 0.35, 1.06, 0.56);
    o.rotation.y = s * 0.12;
    corpsG.add(o);
    yeux.push(o);
    const j = joueRose(0.12, P.joue);
    surCorps(j, new THREE.Vector3(s * 0.62, -0.02, 0.78), RX, RY, RZ, 1.02);
    corpsG.add(j);
  }
  const bouche = sourire(0.15, 0.028, P.bouche);
  surCorps(bouche, new THREE.Vector3(0, 0.02, 1), RX, RY, RZ, 1.0);
  corpsG.add(bouche);
  // une étoile de mer sur la tête
  const etoile = encrer(new THREE.Mesh(plaque(formeEtoile(5, 0.27, 0.12), 0.06, 0.03), toon(P.etoile)), 0.014);
  etoile.position.set(-0.5, 0.5, 0.1);
  etoile.rotation.set(-1.0, -0.35, -0.4);
  corpsG.add(etoile);
  // les pinces : une grosse levée (elle dit bonjour), une petite devant ; chaque pince a deux doigts en croissant,
  // celui du haut s'ouvre et claque
  const matBout = toon(P.bout);
  const doigt = (k, signe) => membre([[0, signe * 0.09 * k, 0.1 * k], [0, signe * 0.2 * k, 0.3 * k], [0, signe * 0.13 * k, 0.5 * k], [0, signe * 0.03 * k, 0.6 * k]], 0.1 * k, 0.012, matBout, { encre: 0.012 });
  const pinces = [];
  for (const [s, k, depart, coude, poignet, rot] of [
    [1, 1.55, [0.8, 0.02, 0.22], [1.2, 0.3, 0.4], [1.22, 0.72, 0.5], [-1.05, -0.25, 0.35]],
    [-1, 0.78, [-0.78, -0.08, 0.3], [-1.02, -0.06, 0.6], [-0.96, 0.02, 0.84], [-0.35, 0.4, -0.2]],
  ]) {
    const epaule = new THREE.Group();
    epaule.position.set(...depart);
    corpsG.add(epaule);
    const rel = (v) => [v[0] - depart[0], v[1] - depart[1], v[2] - depart[2]];
    epaule.add(membre([[0, 0, 0], rel(coude), rel(poignet)], 0.085 * Math.sqrt(k), 0.075 * Math.sqrt(k), matPince));
    const main = new THREE.Group();
    main.position.set(...rel(poignet));
    main.rotation.set(...rot);
    main.add(encrer(new THREE.Mesh(new THREE.SphereGeometry(0.2 * k, 24, 16).scale(0.9, 1.05, 1.0), matPince), 0.016));
    main.add(doigt(k, -1));
    const haut = new THREE.Group();
    haut.add(doigt(k, 1));
    main.add(haut);
    epaule.add(main);
    pinces.push({ epaule, main, haut, s, k });
  }
  // six pattes (trois de chaque côté), qui trottinent
  const pattes = [];
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const z = 0.25 - i * 0.32;
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.86, -0.18, z);
    pivot.add(membre([[0, 0, 0], [s * 0.3, 0.16, 0], [s * 0.5, -0.12, 0.01 * i], [s * 0.56, -0.4, 0.02 * i]], 0.075, 0.04, matPatte));
    corpsG.add(pivot);
    pattes.push({ pivot, s, i });
  }
  const cligne = clignement(404);
  const animer = (t) => {
    racine.position.y = Math.abs(Math.sin(t * 3.2)) * 0.05;
    corpsG.position.x = Math.sin(t * 1.6) * 0.06;
    corpsG.rotation.z = Math.sin(t * 3.2) * 0.04;
    for (const p of pattes) p.pivot.rotation.x = Math.sin(t * 6.4 + p.i * 2.1 + (p.s > 0 ? 0 : 1)) * 0.28;
    for (const p of pinces) {
      const cycle = (t + (p.s > 0 ? 0 : 1.7)) % 3.4;
      const clac = cycle < 0.6 ? Math.abs(Math.sin(cycle * Math.PI * 3.3)) : 0;
      p.haut.rotation.x = 0.42 * (1 - clac);
      // la grosse pince fait coucou, la petite se balance
      p.epaule.rotation.z = p.s > 0 ? Math.sin(t * 3) * 0.22 : Math.sin(t * 1.6) * 0.06;
      p.epaule.rotation.x = p.s > 0 ? Math.sin(t * 1.5) * 0.08 : 0;
    }
    const k = cligne(t);
    for (const o of yeux) { o.scale.y = k; o.position.y = 1.06 + Math.sin(t * 2.5 + o.position.x) * 0.03; }
  };
  return { racine, animer, rayon: 1.9, centre: 0.3, bas: -0.62, sauvage: 0.5, vole: false, hauteur: 0.28 };
}

// ---------- Méduzette (Lueur, commune) : une petite méduse qui s'allume la nuit ; elle chatouille, elle ne pique pas
const PAL_MEDU = { cloche: "#ffb6e1", haut: "#ffd9f1", jupe: "#ff8fcf", bras: "#ffc2ea", tentacule: "#ffa6dc", point: "#fff27a", iris: "#7a3fd6", bouche: "#9a2a6a", joue: "#ff6fae" };
const NACRE_MEDU = { cloche: "#b6fff0", haut: "#e8fffa", jupe: "#7fe9d6", bras: "#c2fff4", tentacule: "#9ff2e2", point: "#ffd36b", iris: "#1f8a9a", bouche: "#1f6a6a", joue: "#ff9fd6" };
function meduzette(nacree) {
  const P = nacree ? NACRE_MEDU : PAL_MEDU;
  const racine = new THREE.Group();
  const cloche = new THREE.Group();
  racine.add(cloche);
  const [RX, RY, RZ] = [1, 0.82, 1];
  const tex = toile(256, 256, (x, l, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, P.haut); g.addColorStop(0.55, P.cloche); g.addColorStop(1, P.jupe);
    x.fillStyle = g; x.fillRect(0, 0, l, h);
  });
  const geoCloche = new THREE.SphereGeometry(1, 48, 24, 0, TAU, 0, Math.PI * 0.62).scale(RX, RY, RZ);
  const dome = encrer(new THREE.Mesh(geoCloche, toon("#ffffff", { map: tex, side: THREE.DoubleSide })), 0.03);
  cloche.add(dome);
  // les points qui brillent, sur le haut de la cloche
  const matPoint = new THREE.MeshBasicMaterial({ color: P.point });
  const points = [];
  const r = alea(606);
  for (let i = 0; i < 14; i++) {
    const a = r() * TAU, el = 0.15 + r() * 0.5;
    const d = new THREE.Vector3(Math.cos(a) * Math.sin(el * 1.4), Math.cos(el * 1.4), Math.sin(a) * Math.sin(el * 1.4));
    if (d.z > 0.35 && d.y < 0.75) continue; // pas sur le visage
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.05 + r() * 0.03, 10, 8), matPoint);
    p.position.copy(surEllipsoide(d.normalize(), RX, RY, RZ, 1.0));
    cloche.add(p);
    points.push(p);
  }
  // le bord en volants
  const jupe = encrer(new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.09, 10, 40).rotateX(Math.PI / 2), toon(P.jupe)), 0.014);
  jupe.position.y = Math.cos(Math.PI * 0.62) * RY + 0.02;
  jupe.scale.set(1, 1.4, 1);
  cloche.add(jupe);
  const volants = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const v = encrer(new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8).scale(1, 0.55, 0.6), toon(P.jupe)), 0.01);
    v.position.set(Math.cos(a) * 0.98, jupe.position.y - 0.08, Math.sin(a) * 0.98);
    v.rotation.y = -a;
    cloche.add(v);
    volants.push(v);
  }
  // le visage
  const yeux = [];
  for (const s of [-1, 1]) {
    const o = oeil(0.2, P.iris);
    surCorps(o, new THREE.Vector3(s * 0.36, 0.28, 0.9), RX, RY, RZ, 0.97);
    cloche.add(o);
    yeux.push(o);
    const j = joueRose(0.1, P.joue);
    surCorps(j, new THREE.Vector3(s * 0.58, 0.08, 0.82), RX, RY, RZ, 1.01);
    cloche.add(j);
  }
  const bouche = sourire(0.09, 0.022, P.bouche);
  surCorps(bouche, new THREE.Vector3(0, 0.1, 1), RX, RY, RZ, 1.0);
  cloche.add(bouche);
  // dessous : quatre bras en volants et six tentacules qui ondulent
  const dessous = new THREE.Group();
  dessous.position.y = jupe.position.y;
  racine.add(dessous);
  const matBras = toon(P.bras), matTent = toon(P.tentacule);
  const brins = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.4;
    const pivot = new THREE.Group();
    pivot.position.set(Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25);
    const pts = [];
    for (let k = 0; k <= 6; k++) pts.push([Math.cos(a) * 0.08 * k + Math.sin(k * 1.7) * 0.07, -k * 0.16, Math.sin(a) * 0.08 * k + Math.cos(k * 1.7) * 0.07]);
    pivot.add(membre(pts, 0.085, 0.03, matBras));
    dessous.add(pivot);
    brins.push({ pivot, ph: i * 1.3, amp: 0.18 });
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const pivot = new THREE.Group();
    pivot.position.set(Math.cos(a) * 0.72, 0, Math.sin(a) * 0.72);
    const pts = [];
    for (let k = 0; k <= 8; k++) pts.push([Math.cos(a) * 0.04 * k, -k * 0.15, Math.sin(a) * 0.04 * k + Math.sin(k * 0.9 + i) * 0.06]);
    pivot.add(membre(pts, 0.04, 0.012, matTent, { encre: 0.01 }));
    dessous.add(pivot);
    brins.push({ pivot, ph: i * 0.9 + 2, amp: 0.26 });
  }
  const cligne = clignement(606);
  const animer = (t) => {
    // la cloche se serre et se relâche, la méduse monte un peu à chaque battement
    const b = Math.sin(t * 2.4);
    cloche.scale.set(1 + b * 0.05, 1 - b * 0.07, 1 + b * 0.05);
    racine.position.y = Math.sin(t * 2.4 - 0.8) * 0.09;
    for (const x of brins) { x.pivot.rotation.x = Math.sin(t * 2.4 + x.ph) * x.amp; x.pivot.rotation.z = Math.cos(t * 1.9 + x.ph) * x.amp * 0.7; }
    for (let i = 0; i < volants.length; i++) volants[i].position.y = jupe.position.y - 0.08 + Math.sin(t * 4 + i) * 0.02;
    for (let i = 0; i < points.length; i++) points[i].scale.setScalar(0.75 + 0.35 * Math.max(0, Math.sin(t * 2 + i * 1.7)));
    const k = cligne(t);
    for (const o of yeux) o.scale.y = k;
  };
  return { racine, animer, rayon: 1.58, centre: -0.24, bas: -1.4, sauvage: 0.62, vole: false, hauteur: 0.22 };
}

// ---------- Tortuffe (Sylve, peu commune) : une tortue qui porte un champignon en guise de carapace
const PAL_TORT = { peau: "#7fcf6c", peauFonce: "#5aa84e", ventre: "#f5e79a", chapeau: "#e5473d", chapeauFonce: "#b8302c", point: "#fff6ea", lamelle: "#f1dcb4", pied: "#fff0d6", iris: "#3a2410", bouche: "#3d5a1e", joue: "#ff8fa6" };
const NACRE_TORT = { peau: "#c7b2ff", peauFonce: "#a58ae8", ventre: "#fff4d0", chapeau: "#56c8ff", chapeauFonce: "#2f8fd6", point: "#fff9d6", lamelle: "#e2f3ff", pied: "#ffffff", iris: "#2a1f6a", bouche: "#4a2a7a", joue: "#ff9fd6" };
function tortuffe(nacree) {
  const P = nacree ? NACRE_TORT : PAL_TORT;
  const racine = new THREE.Group();
  const corpsG = new THREE.Group();
  racine.add(corpsG);
  const matPeau = toon(P.peau);
  // le dessous (le plastron) et le chapeau du champignon
  const plastron = encrer(new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20).scale(0.92, 0.32, 1.02), toon(P.ventre)), 0.02);
  plastron.position.y = -0.05;
  corpsG.add(plastron);
  const texChapeau = toile(512, 256, (x, l, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, P.chapeau); g.addColorStop(1, P.chapeauFonce);
    x.fillStyle = g; x.fillRect(0, 0, l, h);
    const r = alea(808);
    x.fillStyle = P.point;
    for (let i = 0; i < 16; i++) { const u = r(), v = 0.08 + r() * 0.5; x.beginPath(); x.ellipse(u * l, v * h, 14 + r() * 14, (14 + r() * 14) * (0.6 + v), 0, 0, TAU); x.fill(); }
  });
  const chapeau = encrer(new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24, 0, TAU, 0, Math.PI / 2).scale(1.22, 0.78, 1.28), toon("#ffffff", { map: texChapeau })), 0.032);
  chapeau.position.y = 0.12;
  corpsG.add(chapeau);
  // les lamelles sous le bord du chapeau
  const texLam = toile(256, 32, (x, l, h) => { x.fillStyle = P.lamelle; x.fillRect(0, 0, l, h); x.strokeStyle = "rgba(90,50,20,0.35)"; x.lineWidth = 2; for (let i = 0; i < 48; i++) { x.beginPath(); x.moveTo((i / 48) * l, 0); x.lineTo((i / 48) * l, h); x.stroke(); } });
  const lamelles = new THREE.Mesh(new THREE.RingGeometry(0.75, 1.0, 64).rotateX(Math.PI / 2), toon("#ffffff", { map: texLam, side: THREE.DoubleSide }));
  lamelles.scale.set(1.22, 1, 1.28);
  lamelles.position.y = 0.12;
  corpsG.add(lamelles);
  // un petit champignon qui pousse sur le chapeau
  const pousse = new THREE.Group();
  pousse.position.set(0.25, 0.86, -0.25);
  pousse.add(membre([[0, 0, 0], [0.02, 0.14, 0], [0.04, 0.26, 0.01]], 0.055, 0.045, toon(P.pied), { encre: 0.01 }));
  const petit = encrer(new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 12, 0, TAU, 0, Math.PI / 2).scale(1, 0.75, 1), toon("#ffffff", { map: texChapeau })), 0.012);
  petit.position.set(0.04, 0.25, 0.01);
  pousse.add(petit);
  corpsG.add(pousse);
  // la tête (qui sort de sous le chapeau), le visage
  const tete = new THREE.Group();
  tete.position.set(0, 0.2, 1.1);
  corpsG.add(tete);
  const texTete = toile(256, 128, (x, l, h) => {
    x.fillStyle = P.peau; x.fillRect(0, 0, l, h);
    const g = x.createLinearGradient(0, h * 0.55, 0, h * 0.75); g.addColorStop(0, P.peau); g.addColorStop(1, P.ventre);
    x.fillStyle = g; x.fillRect(0, h * 0.55, l, h * 0.2); x.fillStyle = P.ventre; x.fillRect(0, h * 0.75, l, h * 0.25);
  });
  const [TX, TY, TZ] = [0.5, 0.44, 0.46];
  tete.add(encrer(new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24).scale(TX, TY, TZ), toon("#ffffff", { map: texTete })), 0.024));
  const cou = encrer(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.4, 20), matPeau), 0.018);
  cou.rotation.x = Math.PI / 2;
  cou.position.z = -0.32;
  tete.add(cou);
  const yeux = [];
  for (const s of [-1, 1]) {
    const o = oeil(0.18, P.iris);
    surCorps(o, new THREE.Vector3(s * 0.42, 0.3, 0.86), TX, TY, TZ, 0.93);
    tete.add(o);
    yeux.push(o);
    const j = joueRose(0.07, P.joue);
    surCorps(j, new THREE.Vector3(s * 0.66, -0.12, 0.72), TX, TY, TZ, 1.02);
    tete.add(j);
  }
  const bouche = sourire(0.12, 0.02, P.bouche, Math.PI * 0.7);
  surCorps(bouche, new THREE.Vector3(0, -0.2, 1), TX, TY, TZ, 1.0);
  tete.add(bouche);
  // quatre nageoires qui pagaient, une petite queue
  const formeNag = new THREE.Shape();
  formeNag.moveTo(0, -0.12); formeNag.bezierCurveTo(0.3, -0.2, 0.62, -0.12, 0.72, 0.02); formeNag.bezierCurveTo(0.6, 0.14, 0.3, 0.16, 0, 0.12); formeNag.closePath();
  const geoNag = plaque(formeNag, 0.06, 0.03);
  const nageoires = [];
  for (const [s, z, k] of [[1, 0.62, 1], [-1, 0.62, 1], [1, -0.66, 0.75], [-1, -0.66, 0.75]]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.82, -0.08, z);
    const m = encrer(new THREE.Mesh(geoNag, matPeau), 0.014);
    m.scale.set(s * k, k, k);
    m.rotation.x = -Math.PI / 2;
    pivot.add(m);
    corpsG.add(pivot);
    nageoires.push({ pivot, s, z });
  }
  const queue = encrer(new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 12).rotateX(-Math.PI / 2), matPeau), 0.014);
  queue.position.set(0, -0.08, -1.08);
  corpsG.add(queue);
  const cligne = clignement(808);
  const animer = (t) => {
    racine.position.y = Math.sin(t * 1.4) * 0.05;
    corpsG.rotation.z = Math.sin(t * 1.4) * 0.03;
    for (const n of nageoires) n.pivot.rotation.y = n.s * Math.sin(t * 2.6 + (n.z > 0 ? 0 : 1.6)) * 0.45;
    tete.rotation.y = Math.sin(t * 0.7) * 0.2;
    tete.position.z = 1.1 + Math.sin(t * 1.4) * 0.03;
    pousse.rotation.z = Math.sin(t * 2.1) * 0.12;
    const k = cligne(t);
    for (const o of yeux) o.scale.y = k;
  };
  return { racine, animer, rayon: 1.62, centre: 0.25, bas: -0.42, sauvage: 0.32, vole: false, hauteur: 0.42 };
}

// ---------- Pieuvrette (Abysses, peu commune) : une petite pieuvre à taches de rousseur qui serre sa perle
const PAL_PIEU = { corps: "#9b6bff", fonce: "#6f3fd6", ventre: "#e9dcff", tache: "#5b2fb8", ventouse: "#ffd3f2", iris: "#2a1a5e", bouche: "#3d1466", joue: "#ff8fd0", rousseur: "#6a34c4", perle: "#fff6fb", reflet: "#ffd3ef" };
const NACRE_PIEU = { corps: "#ff9f7f", fonce: "#e36f55", ventre: "#ffe6da", tache: "#cf5a44", ventouse: "#fff1c9", iris: "#7a2a2a", bouche: "#7a2a3a", joue: "#ff6fa8", rousseur: "#c8553f", perle: "#f2fbff", reflet: "#bfe9ff" };
function pieuvrette(nacree) {
  const P = nacree ? NACRE_PIEU : PAL_PIEU;
  const racine = new THREE.Group();
  const tete = new THREE.Group();
  tete.position.y = 0.38;
  racine.add(tete);
  const [RX, RY, RZ] = [0.92, 1.02, 0.86];
  const tex = toile(512, 256, (x, l, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, P.fonce); g.addColorStop(0.45, P.corps); g.addColorStop(0.8, P.corps); g.addColorStop(1, P.ventre);
    x.fillStyle = g; x.fillRect(0, 0, l, h);
    const r = alea(1010);
    x.fillStyle = P.tache;
    for (let i = 0; i < 22; i++) { const u = r(), v = 0.06 + r() * 0.36; if (u > 0.15 && u < 0.35 && v > 0.25) continue; x.globalAlpha = 0.55 + r() * 0.4; x.beginPath(); x.ellipse(u * l, v * h, 5 + r() * 9, 4 + r() * 7, 0, 0, TAU); x.fill(); }
    x.globalAlpha = 1;
  });
  tete.add(encrer(new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32).scale(RX, RY, RZ), toon("#ffffff", { map: tex })), 0.032));
  // le visage, en bas de la tête : de grands yeux, des joues, des taches de rousseur, une petite bouche ronde
  const yeux = [];
  for (const s of [-1, 1]) {
    const o = oeil(0.25, P.iris);
    surCorps(o, new THREE.Vector3(s * 0.38, -0.12, 0.92), RX, RY, RZ, 0.95);
    tete.add(o);
    yeux.push(o);
    const j = joueRose(0.11, P.joue);
    surCorps(j, new THREE.Vector3(s * 0.62, -0.42, 0.7), RX, RY, RZ, 1.01);
    tete.add(j);
    const matR = new THREE.MeshBasicMaterial({ color: P.rousseur });
    for (const [dx, dy] of [[0, 0.06], [0.07, -0.02], [-0.05, -0.05]]) {
      const pt = new THREE.Mesh(new THREE.CircleGeometry(0.022, 10), matR);
      surCorps(pt, new THREE.Vector3(s * (0.6 + dx), -0.3 + dy, 0.76), RX, RY, RZ, 1.012);
      tete.add(pt);
    }
  }
  const bouche = encrer(new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.022, 8, 20), toon(P.bouche)), 0.008);
  surCorps(bouche, new THREE.Vector3(0, -0.5, 0.86), RX, RY, RZ, 0.99);
  tete.add(bouche);
  // six bras qui s'enroulent au bout, deux tons (le dessous plus clair, comme des ventouses)
  const cBras = new THREE.Color(P.corps), cDessous = new THREE.Color(P.ventouse);
  const matBras = toon("#ffffff", { vertexColors: true });
  const brasL = [];
  const tentacule = (pts, r0) => {
    const courbe = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    return encrer(new THREE.Mesh(tubeVariable(courbe, (t) => r0 * (1 - t * 0.82), { n: 40, m: 12, couleur: (t, d) => (d.y < -0.25 ? cDessous : cBras) }), matBras), 0.016);
  };
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI * 0.72 + (i / 5) * Math.PI * 1.44 + Math.PI; // vers l'arrière et les côtés
    const pivot = new THREE.Group();
    pivot.position.set(Math.sin(a) * 0.42, -0.42, Math.cos(a) * 0.38);
    pivot.rotation.y = a;
    const k = 0.9 + (i % 2) * 0.12;
    pivot.add(tentacule([[0, 0, 0], [0, -0.22 * k, 0.3 * k], [0, -0.4 * k, 0.66 * k], [0, -0.36 * k, 0.98 * k], [0, -0.18 * k, 1.1 * k], [0, -0.06 * k, 1.0 * k], [0, -0.1 * k, 0.88 * k]], 0.17));
    racine.add(pivot);
    brasL.push({ pivot, ph: i * 1.1, a });
  }
  // devant : deux bras plus courts, et celui de droite serre la perle
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.28, -0.46, 0.5);
    pivot.rotation.y = s * 0.35;
    const garde = s > 0;
    pivot.add(tentacule(garde ? [[0, 0, 0], [0, -0.2, 0.28], [0, -0.12, 0.6], [0.02, 0.14, 0.72], [0, 0.32, 0.6], [-0.04, 0.3, 0.46]] : [[0, 0, 0], [0, -0.26, 0.26], [0, -0.38, 0.56], [0, -0.28, 0.82], [0, -0.12, 0.84], [0, -0.1, 0.72]], 0.16));
    racine.add(pivot);
    brasL.push({ pivot, ph: s * 2.2, a: s * 0.35, devant: true, garde });
    if (garde) {
      const perle = new THREE.Group();
      perle.position.set(-0.02, 0.2, 0.6);
      perle.add(encrer(new THREE.Mesh(new THREE.SphereGeometry(0.15, 28, 20), toon(P.perle, { emissive: new THREE.Color(P.reflet), emissiveIntensity: 0.25 })), 0.014));
      const eclat = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshBasicMaterial({ color: "#ffffff" }));
      eclat.position.set(0.05, 0.06, 0.12);
      perle.add(eclat);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: toileHalo(), color: P.reflet, transparent: true, depthWrite: false, opacity: 0.5 }));
      halo.scale.setScalar(0.7);
      perle.add(halo);
      pivot.add(perle);
      brasL.at(-1).perle = perle;
      brasL.at(-1).halo = halo;
    }
  }
  const cligne = clignement(1010);
  const animer = (t) => {
    const b = Math.sin(t * 1.9);
    racine.position.y = b * 0.07;
    tete.scale.set(1 - b * 0.02, 1 + b * 0.035, 1 - b * 0.02);
    tete.rotation.z = Math.sin(t * 0.9) * 0.05;
    for (const x of brasL) {
      if (x.devant) { x.pivot.rotation.x = Math.sin(t * 1.9 + x.ph) * (x.garde ? 0.05 : 0.12); continue; }
      x.pivot.rotation.x = Math.sin(t * 1.9 + x.ph) * 0.16;
      x.pivot.rotation.z = Math.cos(t * 1.4 + x.ph) * 0.08;
    }
    const g = brasL.find((x) => x.garde);
    if (g) { g.halo.material.opacity = 0.35 + 0.25 * Math.sin(t * 2.6); g.perle.rotation.y = t * 0.8; }
    const k = cligne(t);
    for (const o of yeux) o.scale.y = k;
  };
  return { racine, animer, rayon: 1.75, centre: 0.12, bas: -0.92, sauvage: 0.72, vole: false, hauteur: 0.25 };
}

// ---------- Lanterneau (Lueur, rare) : un poisson-lanterne au grand sourire ; sa lanterne est un petit phare qui tourne
const PAL_LANT = { dos: "#1f2d60", corps: "#304a8c", ventre: "#6d86c4", nageoire: "#3e63b0", bouche: "#0b1030", dent: "#fffbea", iris: "#ffd23f", joue: "#ff8fb5", tige: "#2d4382", rouge: "#e8423a", blanc: "#fff6ea", lampe: "#fff3a8", toit: "#c8322c", point: "#9fe8ff" };
const NACRE_LANT = { dos: "#145a5a", corps: "#23807d", ventre: "#93e3d3", nageoire: "#4fc6b6", bouche: "#06302e", dent: "#fffbea", iris: "#ff7fd0", joue: "#ff9fc8", tige: "#1f6e6a", rouge: "#3d7be8", blanc: "#f4fbff", lampe: "#c9fbff", toit: "#2c5ec8", point: "#fff2a8" };
function lanterneau(nacree) {
  const P = nacree ? NACRE_LANT : PAL_LANT;
  const racine = new THREE.Group();
  const corpsG = new THREE.Group();
  racine.add(corpsG);
  const [RX, RY, RZ] = [1.02, 0.9, 0.92];
  const tex = toile(512, 256, (x, l, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, P.dos); g.addColorStop(0.45, P.corps); g.addColorStop(0.75, P.corps); g.addColorStop(1, P.ventre);
    x.fillStyle = g; x.fillRect(0, 0, l, h);
    const r = alea(1515);
    x.fillStyle = P.point;
    for (let i = 0; i < 26; i++) { const u = r(), v = 0.3 + r() * 0.3; if (u > 0.12 && u < 0.38) continue; x.globalAlpha = 0.5 + r() * 0.5; x.beginPath(); x.arc(u * l, v * h, 1.5 + r() * 2.5, 0, TAU); x.fill(); }
    x.globalAlpha = 1;
  });
  corpsG.add(encrer(new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32).scale(RX, RY, RZ), toon("#ffffff", { map: tex })), 0.032));
  // la grande bouche : un sourire plein de petites dents (rien de méchant)
  const bouche = new THREE.Group();
  surCorps(bouche, new THREE.Vector3(0, -0.36, 0.93), RX, RY, RZ, 0.97);
  corpsG.add(bouche);
  const formeBouche = new THREE.Shape();
  formeBouche.moveTo(-0.46, 0.06);
  formeBouche.quadraticCurveTo(0, -0.05, 0.46, 0.06);
  formeBouche.quadraticCurveTo(0.3, -0.34, 0, -0.36);
  formeBouche.quadraticCurveTo(-0.3, -0.34, -0.46, 0.06);
  const fond = encrer(new THREE.Mesh(plaque(formeBouche, 0.04, 0.02), toon(P.bouche)), 0.014);
  bouche.add(fond);
  const matDent = toon(P.dent);
  for (let i = 0; i < 6; i++) {
    const u = -0.32 + (i / 5) * 0.64;
    const dent = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.1, 6), matDent);
    dent.position.set(u, -0.31 + 1.6 * u * u, 0.05);
    bouche.add(dent);
  }
  for (const u of [-0.2, 0.2]) {
    const dent = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.09, 6), matDent);
    dent.rotation.z = Math.PI;
    dent.position.set(u, -0.03, 0.05);
    bouche.add(dent);
  }
  const yeux = [];
  for (const s of [-1, 1]) {
    const o = oeil(0.24, P.iris);
    surCorps(o, new THREE.Vector3(s * 0.4, 0.3, 0.86), RX, RY, RZ, 0.95);
    corpsG.add(o);
    yeux.push(o);
    const j = joueRose(0.1, P.joue);
    surCorps(j, new THREE.Vector3(s * 0.68, -0.05, 0.72), RX, RY, RZ, 1.01);
    corpsG.add(j);
  }
  // les nageoires (côtés, dos, queue)
  const matNag = toon(P.nageoire);
  const formeNag = new THREE.Shape();
  formeNag.moveTo(0, -0.1); formeNag.bezierCurveTo(0.25, -0.3, 0.55, -0.22, 0.6, 0); formeNag.bezierCurveTo(0.55, 0.22, 0.25, 0.3, 0, 0.1); formeNag.closePath();
  const nageoires = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.92, -0.12, 0.1);
    const m = encrer(new THREE.Mesh(plaque(formeNag, 0.04, 0.02), matNag), 0.012);
    m.scale.set(s, 1, 1);
    m.rotation.y = s * -0.5;
    pivot.add(m);
    corpsG.add(pivot);
    nageoires.push({ pivot, s });
  }
  const formeQueue = new THREE.Shape();
  formeQueue.moveTo(0, 0); formeQueue.bezierCurveTo(-0.1, 0.3, -0.35, 0.5, -0.5, 0.45); formeQueue.bezierCurveTo(-0.35, 0.15, -0.35, -0.15, -0.5, -0.45); formeQueue.bezierCurveTo(-0.35, -0.5, -0.1, -0.3, 0, 0);
  const queue = new THREE.Group();
  queue.position.set(0, 0.02, -0.86);
  const mq = encrer(new THREE.Mesh(plaque(formeQueue, 0.05, 0.025), matNag), 0.014);
  mq.rotation.y = Math.PI / 2;
  queue.add(mq);
  corpsG.add(queue);
  const formeDos = new THREE.Shape();
  formeDos.moveTo(-0.3, 0); formeDos.lineTo(-0.2, 0.22); formeDos.lineTo(-0.08, 0.06); formeDos.lineTo(0.04, 0.26); formeDos.lineTo(0.14, 0.06); formeDos.lineTo(0.26, 0.18); formeDos.lineTo(0.3, 0); formeDos.closePath();
  const dos = encrer(new THREE.Mesh(plaque(formeDos, 0.035, 0.015), matNag), 0.012);
  dos.rotation.y = Math.PI / 2;
  dos.position.set(0, 0.84, -0.32);
  dos.rotation.x = -0.4;
  corpsG.add(dos);
  // la lanterne : une tige qui part du front et, au bout, un petit phare rayé dont la lampe tourne
  const leurre = new THREE.Group();
  leurre.position.set(0, 0.8, 0.28);
  corpsG.add(leurre);
  leurre.add(membre([[0, 0, 0], [0, 0.36, 0.14], [0, 0.56, 0.48], [0, 0.5, 0.74]], 0.05, 0.035, toon(P.tige), { encre: 0.012 }));
  const phare = new THREE.Group();
  phare.position.set(0, 0.5, 0.78);
  leurre.add(phare);
  const texTour = toile(64, 128, (x, l, h) => { for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? P.blanc : P.rouge; x.fillRect(0, (i * h) / 4, l, h / 4); } });
  const tour = encrer(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.1, 0.3, 20), toon("#ffffff", { map: texTour })), 0.012);
  tour.position.y = 0.15;
  phare.add(tour);
  const balcon = encrer(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 20), toon(P.toit)), 0.01);
  balcon.position.y = 0.315;
  phare.add(balcon);
  const lampe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.11, 16), new THREE.MeshBasicMaterial({ color: P.lampe }));
  lampe.position.y = 0.385;
  phare.add(lampe);
  const toit = encrer(new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.11, 16), toon(P.toit)), 0.01);
  toit.position.y = 0.495;
  phare.add(toit);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: toileHalo(), color: P.lampe, transparent: true, depthWrite: false, opacity: 0.8 }));
  halo.position.y = 0.385;
  halo.scale.setScalar(0.9);
  phare.add(halo);
  // les deux faisceaux qui tournent
  const faisceaux = new THREE.Group();
  faisceaux.position.y = 0.385;
  // (un cône ouvert, étroit contre la lampe, qui s'efface en s'éloignant)
  const texFx = toile(8, 128, (x, l, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "rgba(255,255,255,0.85)"); g.addColorStop(0.5, "rgba(255,255,255,0.3)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, l, h); });
  const matFx = new THREE.MeshBasicMaterial({ color: P.lampe, map: texFx, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.26, 1.5, 24, 1, true), matFx);
    f.rotation.z = s * Math.PI / 2;
    f.position.x = s * 0.75;
    faisceaux.add(f);
  }
  phare.add(faisceaux);
  const cligne = clignement(1515);
  const animer = (t) => {
    racine.position.y = Math.sin(t * 1.5) * 0.08;
    corpsG.rotation.z = Math.sin(t * 1.5 + 0.5) * 0.04;
    for (const n of nageoires) n.pivot.rotation.y = n.s * Math.sin(t * 5) * 0.35;
    queue.rotation.y = Math.sin(t * 3.2) * 0.35;
    leurre.rotation.x = Math.sin(t * 1.5 - 0.6) * 0.1;
    leurre.rotation.z = Math.sin(t * 1.1) * 0.08;
    faisceaux.rotation.y = t * 1.6;
    const p = 0.75 + 0.25 * Math.sin(t * 3.1);
    halo.material.opacity = p;
    halo.scale.setScalar(0.8 + p * 0.25);
    // de temps en temps, il fait « miam » (la bouche s'ouvre un peu plus)
    const m = (t % 4.2) < 0.5 ? Math.sin(((t % 4.2) / 0.5) * Math.PI) : 0;
    bouche.scale.set(1 + m * 0.06, 1 + m * 0.35, 1);
    const k = cligne(t);
    for (const o of yeux) o.scale.y = k;
  };
  return { racine, animer, rayon: 1.95, centre: 0.3, bas: -0.9, sauvage: 0.85, vole: false, hauteur: 0.22 };
}

// ---------- Narvélin (Givre, rare) : un narval tout rond ; sa corne est une spirale de glace qui ne fond jamais
const PAL_NARV = { dos: "#7194dc", tache: "#4e6fbf", ventre: "#f2f8ff", corne: "#dff7ff", spirale: "#ffffff", cristal: "#9fe8ff", iris: "#26408f", bouche: "#25306a", joue: "#ff9fc2", nageoire: "#5f80cc" };
const NACRE_NARV = { dos: "#d7a9ff", tache: "#b47fe6", ventre: "#fff4ff", corne: "#fff1c4", spirale: "#ffe27a", cristal: "#ffc4ef", iris: "#7a2fb0", bouche: "#5a1f6a", joue: "#ff8fd0", nageoire: "#c08fef" };
function narvelin(nacree) {
  const P = nacree ? NACRE_NARV : PAL_NARV;
  const racine = new THREE.Group();
  const corpsG = new THREE.Group();
  racine.add(corpsG);
  const [RX, RY, RZ] = [1.05, 0.82, 0.92];
  const tex = toile(512, 256, (x, l, h) => {
    x.fillStyle = P.dos; x.fillRect(0, 0, l, h);
    const g = x.createLinearGradient(0, h * 0.5, 0, h * 0.66);
    g.addColorStop(0, P.dos); g.addColorStop(1, P.ventre);
    x.fillStyle = g; x.fillRect(0, h * 0.5, l, h * 0.16);
    x.fillStyle = P.ventre; x.fillRect(0, h * 0.66, l, h * 0.34);
    const r = alea(1717);
    x.fillStyle = P.tache;
    for (let i = 0; i < 30; i++) { const u = r(), v = 0.05 + r() * 0.45; if (u > 0.14 && u < 0.36 && v > 0.22) continue; x.globalAlpha = 0.5 + r() * 0.45; x.beginPath(); x.ellipse(u * l, v * h, 4 + r() * 8, 3 + r() * 5, r() * 3, 0, TAU); x.fill(); }
    x.globalAlpha = 1;
  });
  corpsG.add(encrer(new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32).scale(RX, RY, RZ), toon("#ffffff", { map: tex })), 0.032));
  // la corne : un cône de glace autour duquel s'enroule une arête, et une étincelle au bout
  const corne = new THREE.Group();
  corne.position.copy(surEllipsoide(new THREE.Vector3(0.18, 0.62, 0.76).normalize(), RX, RY, RZ, 0.92));
  corne.rotation.set(0.62, 0, -0.3);
  corpsG.add(corne);
  const L = 1.15;
  corne.add(encrer(new THREE.Mesh(new THREE.ConeGeometry(0.11, L, 20).translate(0, L / 2, 0), toon(P.corne, { emissive: new THREE.Color(P.cristal), emissiveIntensity: 0.4 })), 0.014));
  const helice = [];
  for (let i = 0; i <= 48; i++) {
    const u = i / 48, rr = 0.11 * (1 - u) + 0.006;
    helice.push(new THREE.Vector3(Math.cos(u * TAU * 4) * rr, u * L * 0.96, Math.sin(u * TAU * 4) * rr));
  }
  corne.add(new THREE.Mesh(tubeVariable(new THREE.CatmullRomCurve3(helice), (u) => 0.022 * (1 - u) + 0.004, { n: 120, m: 6 }), toon(P.spirale)));
  const pointe = new THREE.Sprite(new THREE.SpriteMaterial({ map: toileEtoile(), color: "#ffffff", transparent: true, depthWrite: false }));
  pointe.position.y = L + 0.02;
  pointe.scale.setScalar(0.35);
  corne.add(pointe);
  // des cristaux de glace sur le dos
  const matCristal = toon(P.cristal, { emissive: new THREE.Color(P.cristal), emissiveIntensity: 0.25, transparent: true, opacity: 0.92 });
  const cristaux = [];
  for (const [x, z, h, rx, rz] of [[-0.25, -0.15, 0.36, -0.3, 0.35], [0.08, -0.32, 0.46, -0.35, -0.05], [0.34, -0.12, 0.3, -0.2, -0.4], [-0.05, 0.05, 0.24, 0.1, 0.15]]) {
    const c = encrer(new THREE.Mesh(new THREE.OctahedronGeometry(1, 0).scale(0.09, h, 0.09), matCristal), 0.012);
    c.position.copy(surEllipsoide(new THREE.Vector3(x, 1, z).normalize(), RX, RY, RZ, 0.97));
    c.rotation.set(rx, 0, rz);
    corpsG.add(c);
    cristaux.push(c);
  }
  // le visage
  const yeux = [];
  for (const s of [-1, 1]) {
    const o = oeil(0.21, P.iris);
    surCorps(o, new THREE.Vector3(s * 0.4, 0.08, 0.9), RX, RY, RZ, 0.95);
    corpsG.add(o);
    yeux.push(o);
    const j = joueRose(0.1, P.joue);
    surCorps(j, new THREE.Vector3(s * 0.64, -0.16, 0.74), RX, RY, RZ, 1.01);
    corpsG.add(j);
  }
  const bouche = sourire(0.12, 0.024, P.bouche);
  surCorps(bouche, new THREE.Vector3(0, -0.2, 1), RX, RY, RZ, 1.0);
  corpsG.add(bouche);
  // les nageoires et la queue qui dépasse derrière
  const matNag = toon(P.nageoire);
  const formeNag = new THREE.Shape();
  formeNag.moveTo(0, -0.1); formeNag.bezierCurveTo(0.25, -0.22, 0.5, -0.18, 0.58, 0); formeNag.bezierCurveTo(0.5, 0.14, 0.25, 0.16, 0, 0.1); formeNag.closePath();
  const nageoires = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.92, -0.3, 0.25);
    const m = encrer(new THREE.Mesh(plaque(formeNag, 0.05, 0.025), matNag), 0.012);
    m.scale.set(s, 1, 1);
    m.rotation.set(-0.3, s * -0.6, s * -0.5);
    pivot.add(m);
    corpsG.add(pivot);
    nageoires.push({ pivot, s });
  }
  const queue = new THREE.Group();
  queue.position.set(0.55, 0.1, -0.7);
  queue.rotation.y = -0.6;
  queue.add(membre([[0, 0, 0], [0.12, 0.25, -0.2], [0.18, 0.55, -0.28]], 0.24, 0.1, toon(P.dos)));
  const formeQ = new THREE.Shape();
  formeQ.moveTo(0, 0); formeQ.bezierCurveTo(0.15, 0.1, 0.38, 0.28, 0.42, 0.12); formeQ.bezierCurveTo(0.42, 0.02, 0.2, -0.04, 0, 0);
  formeQ.bezierCurveTo(-0.2, -0.04, -0.42, 0.02, -0.42, 0.12); formeQ.bezierCurveTo(-0.38, 0.28, -0.15, 0.1, 0, 0);
  const nageQ = encrer(new THREE.Mesh(plaque(formeQ, 0.05, 0.025), matNag), 0.014);
  nageQ.position.set(0.18, 0.6, -0.28);
  nageQ.scale.setScalar(1.25);
  queue.add(nageQ);
  corpsG.add(queue);
  // des flocons qui montent doucement (il dessine dans l'eau)
  const flocons = [];
  for (let i = 0; i < 7; i++) {
    const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: toileEtoile(), color: i % 2 ? "#ffffff" : P.cristal, transparent: true, depthWrite: false }));
    f.userData = { ph: i / 7, x: (alea(i + 7)() - 0.5) * 2.2, z: (alea(i + 70)() - 0.2) * 1.2 };
    racine.add(f);
    flocons.push(f);
  }
  const cligne = clignement(1717);
  const animer = (t) => {
    racine.position.y = Math.sin(t * 1.3) * 0.08;
    corpsG.rotation.z = Math.sin(t * 1.3 + 0.4) * 0.05;
    corpsG.rotation.x = Math.sin(t * 0.8) * 0.03;
    for (const n of nageoires) n.pivot.rotation.z = n.s * Math.sin(t * 3) * 0.25;
    queue.rotation.x = Math.sin(t * 2.2) * 0.2;
    const e = Math.max(0, Math.sin(t * 2.4));
    pointe.material.opacity = e;
    pointe.scale.setScalar(0.2 + e * 0.3);
    pointe.material.rotation = t;
    cristaux.forEach((c, i) => { c.material.emissiveIntensity = 0.2 + 0.15 * Math.sin(t * 2 + i); });
    for (const f of flocons) {
      const u = (t * 0.12 + f.userData.ph) % 1;
      f.position.set(f.userData.x + Math.sin(t + f.userData.ph * 9) * 0.1, -0.6 + u * 2.6, f.userData.z);
      f.material.opacity = Math.sin(u * Math.PI) * 0.85;
      f.scale.setScalar(0.12 + 0.06 * Math.sin(u * Math.PI));
      f.material.rotation = t * 0.5 + f.userData.ph * 6;
    }
    const k = cligne(t);
    for (const o of yeux) o.scale.y = k;
  };
  return { racine, animer, rayon: 1.9, centre: 0.32, bas: -0.78, sauvage: 0.72, vole: false, hauteur: 0.22 };
}

// ---------- outils pour les grandes créatures : un ruban qui suit une courbe (cascade), un aileron le long d'une courbe
function ruban(points, largeur, axe = new THREE.Vector3(1, 0, 0), n = 32) {
  const courbe = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const pos = [], uv = [], ind = [];
  const p = new THREE.Vector3();
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    courbe.getPointAt(t, p);
    const w = largeur(t) / 2;
    pos.push(p.x - axe.x * w, p.y - axe.y * w, p.z - axe.z * w, p.x + axe.x * w, p.y + axe.y * w, p.z + axe.z * w);
    uv.push(0, 1 - t, 1, 1 - t);
    if (i < n) { const a = i * 2; ind.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(ind);
  g.computeVertexNormals();
  return g;
}
function aileron(courbe, t0, t1, haut, bas, n = 28) {
  const pos = [], ind = [];
  const p = new THREE.Vector3();
  for (let i = 0; i <= n; i++) {
    const u = i / n, t = t0 + (t1 - t0) * u;
    courbe.getPointAt(t, p);
    pos.push(p.x, p.y + haut(u), p.z, p.x, p.y - bas(u), p.z);
    if (i < n) { const a = i * 2; ind.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(ind);
  g.computeVertexNormals();
  return g;
}
// une flamme (une goutte à l'envers, du jaune au rouge, qui s'efface au bout)
const texFlammes = new Map();
function texFlamme(bas, milieu, haut) {
  const cle = bas + milieu + haut;
  if (!texFlammes.has(cle)) {
    const t = toile(16, 128, (x, l, h) => {
      const g = x.createLinearGradient(0, h, 0, 0);
      g.addColorStop(0, bas); g.addColorStop(0.45, milieu); g.addColorStop(0.8, haut);
      g.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = g; x.fillRect(0, 0, l, h);
    });
    t.userData.partage = true;
    texFlammes.set(cle, t);
  }
  return texFlammes.get(cle);
}
const geoFlamme = new THREE.LatheGeometry([[0, 0], [0.06, 0.02], [0.09, 0.07], [0.1, 0.13], [0.085, 0.2], [0.055, 0.27], [0.025, 0.33], [0, 0.4]].map(([x, y]) => new THREE.Vector2(x, y)), 16);
geoFlamme.userData.partage = true;

// ---------- Braisilotl (Braise, épique) : un axolotl couleur charbon, fendillé de lave ; ses branchies sont des flammes
const PAL_BRAI = { peau: "#2d2630", ventre: "#4a3a40", magma: "#ff7a1a", lueur: "#ffd36b", iris: "#ffb000", bouche: "#ffc78a", joue: "#ff6a3d", f1: "#fff4c2", f2: "#ffb020", f3: "#ff4a1a", nageoire: "#3a2c34" };
const NACRE_BRAI = { peau: "#ffe1ec", ventre: "#fff3f7", magma: "#38d7ff", lueur: "#c9fbff", iris: "#2fb8ff", bouche: "#ff7fae", joue: "#ff9fc8", f1: "#ffffff", f2: "#7fe9ff", f3: "#3a8bff", nageoire: "#ffd0e2" };
function braisilotl(nacree) {
  const P = nacree ? NACRE_BRAI : PAL_BRAI;
  const racine = new THREE.Group();
  const corpsG = new THREE.Group();
  corpsG.rotation.y = 0.2;
  racine.add(corpsG);
  // la peau et ses fissures (les fissures servent aussi de carte de lumière)
  const r = alea(2121);
  const fissures = [];
  for (let k = 0; k < 16; k++) {
    let x = r() * 512, y = r() * 256;
    const pts = [[x, y]];
    let a = r() * TAU;
    for (let i = 0; i < 6; i++) { a += (r() - 0.5) * 1.4; x += Math.cos(a) * (10 + r() * 18); y += Math.sin(a) * (8 + r() * 14); pts.push([x, y]); }
    fissures.push(pts);
  }
  const tracer = (x, couleur, larg, flou) => {
    x.strokeStyle = couleur; x.lineWidth = larg; x.lineJoin = x.lineCap = "round"; x.shadowColor = couleur; x.shadowBlur = flou;
    for (const pts of fissures) { x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke(); }
  };
  const texPeau = toile(512, 256, (x, l, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, P.peau); g.addColorStop(0.7, P.peau); g.addColorStop(1, P.ventre);
    x.fillStyle = g; x.fillRect(0, 0, l, h);
    tracer(x, P.magma, 3, 0);
    tracer(x, P.lueur, 1.2, 0);
    // le visage reste lisse (pas de fissure sous les yeux ni sur le sourire)
    const v = x.createRadialGradient(128, 138, 20, 128, 138, 78);
    v.addColorStop(0, P.peau); v.addColorStop(0.75, P.peau); v.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = v; x.fillRect(40, 50, 176, 176);
  });
  const texLave = toile(512, 256, (x, l, h) => {
    x.fillStyle = "#000"; x.fillRect(0, 0, l, h); tracer(x, "#ffffff", 4, 6);
    x.shadowBlur = 0;
    const v = x.createRadialGradient(128, 138, 20, 128, 138, 78);
    v.addColorStop(0, "#000"); v.addColorStop(0.75, "#000"); v.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = v; x.fillRect(40, 50, 176, 176);
  });
  const matPeau = toon("#ffffff", { map: texPeau, emissive: new THREE.Color(P.magma), emissiveMap: texLave, emissiveIntensity: 1 });
  // la tête, large et plate, et le corps qui part en arrière vers la gauche, puis la queue
  const tete = new THREE.Group();
  tete.position.y = 0.12;
  corpsG.add(tete);
  const [RX, RY, RZ] = [1.0, 0.66, 0.84];
  tete.add(encrer(new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32).scale(RX, RY, RZ), matPeau), 0.032));
  const courbe = new THREE.CatmullRomCurve3([[0, 0.06, -0.35], [-0.08, 0.02, -0.95], [-0.5, 0.04, -1.38], [-1.05, 0.12, -1.42], [-1.5, 0.22, -1.2]].map((p) => new THREE.Vector3(...p)));
  corpsG.add(encrer(new THREE.Mesh(tubeVariable(courbe, (t) => 0.52 * (1 - t * 0.82), { n: 48, m: 16 }), matPeau), 0.028));
  const bout = encrer(new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 10), matPeau), 0.016);
  bout.position.copy(courbe.getPointAt(1));
  corpsG.add(bout);
  const queue = new THREE.Mesh(aileron(courbe, 0.42, 1, (u) => 0.12 + 0.3 * Math.sin(u * Math.PI * 0.9), (u) => 0.08 + 0.2 * Math.sin(u * Math.PI * 0.9)), toon(P.nageoire, { side: THREE.DoubleSide, emissive: new THREE.Color(P.magma), emissiveIntensity: 0.15 }));
  corpsG.add(queue);
  // les pattes (4 petites, avec 3 doigts)
  const pattes = [];
  const pCorps = courbe.getPointAt(0.3), tCorps = courbe.getTangentAt(0.3);
  const cote = new THREE.Vector3(-tCorps.z, 0, tCorps.x).normalize();
  const arriere = (s) => pCorps.clone().addScaledVector(cote, -s * 0.3);
  for (const [x, z, s] of [[0.72, -0.12, 1], [-0.72, -0.12, -1], [arriere(1).x, arriere(1).z, 1], [arriere(-1).x, arriere(-1).z, -1]]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, -0.28, z);
    pivot.add(membre([[0, 0, 0], [s * 0.18, -0.12, 0.04], [s * 0.24, -0.3, 0.08]], 0.1, 0.07, matPeau, { encre: 0.014 }));
    for (const d of [-1, 0, 1]) {
      const doigt = encrer(new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), matPeau), 0.008);
      doigt.position.set(s * 0.24 + d * 0.05, -0.33, 0.14 + Math.abs(d) * -0.02);
      pivot.add(doigt);
    }
    corpsG.add(pivot);
    pattes.push({ pivot, ph: x + z });
  }
  // le visage : de petits yeux brillants et le grand sourire d'axolotl
  const yeux = [];
  for (const s of [-1, 1]) {
    const o = oeil(0.2, P.iris);
    surCorps(o, new THREE.Vector3(s * 0.44, 0.24, 0.86), RX, RY, RZ, 0.95);
    tete.add(o);
    yeux.push(o);
    const j = joueRose(0.1, P.joue);
    surCorps(j, new THREE.Vector3(s * 0.66, -0.12, 0.72), RX, RY, RZ, 1.01);
    tete.add(j);
  }
  const ptsBouche = [];
  for (let i = 0; i <= 12; i++) {
    const u = -1 + i / 6, x = u * 0.56, y = -0.16 + 0.12 * u * u;
    ptsBouche.push(new THREE.Vector3(x, y, RZ * Math.sqrt(Math.max(0, 1 - (x / RX) ** 2 - (y / RY) ** 2)) * 1.004));
  }
  tete.add(membre(ptsBouche, 0.028, 0.022, toon(P.bouche), { encre: 0.008 }));
  // les branchies : trois flammes de chaque côté, sur une petite tige
  const matTige = toon(P.peau, { emissive: new THREE.Color(P.magma), emissiveIntensity: 0.35 });
  const matFlamme = new THREE.MeshBasicMaterial({ map: texFlamme(P.f1, P.f2, P.f3), transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const flammes = [];
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const g = new THREE.Group();
    g.position.copy(surEllipsoide(new THREE.Vector3(s * 0.8, 0.38 + i * 0.22, -0.3 - i * 0.12).normalize(), RX, RY, RZ, 0.96));
    g.rotation.set(-0.35 - i * 0.2, 0, -s * (1.0 - i * 0.28));
    g.add(membre([[0, 0, 0], [0, 0.14, 0], [0, 0.26, -0.02]], 0.05, 0.035, matTige, { encre: 0.01 }));
    const f = new THREE.Mesh(geoFlamme, matFlamme);
    f.position.y = 0.22;
    const k = 1.15 - i * 0.12;
    f.scale.set(k, k * 1.25, k);
    g.add(f);
    tete.add(g);
    flammes.push({ f, k, ph: s * 1.7 + i * 2.3 });
  }
  // des braises qui s'échappent des branchies
  const braises = [];
  for (let i = 0; i < 8; i++) {
    const b = new THREE.Sprite(new THREE.SpriteMaterial({ map: toileRond(), color: i % 2 ? P.f2 : P.f3, transparent: true, depthWrite: false }));
    b.userData = { ph: i / 8, x: (i % 2 ? 1 : -1) * (0.8 + alea(i + 3)() * 0.3), z: -0.2 - alea(i + 30)() * 0.3 };
    tete.add(b);
    braises.push(b);
  }
  const cligne = clignement(2121);
  const animer = (t) => {
    racine.position.y = Math.sin(t * 1.6) * 0.05;
    tete.rotation.z = Math.sin(t * 0.9) * 0.05;
    tete.rotation.y = Math.sin(t * 0.6) * 0.08;
    corpsG.rotation.y = 0.2 + Math.sin(t * 1.2) * 0.05;
    for (const p of pattes) p.pivot.rotation.x = Math.sin(t * 2.4 + p.ph) * 0.18;
    matPeau.emissiveIntensity = 0.85 + 0.35 * Math.sin(t * 2.2) + 0.1 * Math.sin(t * 7.3);
    for (const x of flammes) {
      const v = Math.sin(t * 11 + x.ph) * 0.5 + Math.sin(t * 17.3 + x.ph * 2) * 0.5;
      x.f.scale.set(x.k * (1 + v * 0.08), x.k * 1.25 * (1 + v * 0.22), x.k * (1 + v * 0.08));
      x.f.rotation.z = Math.sin(t * 6 + x.ph) * 0.12;
    }
    for (const b of braises) {
      const u = (t * 0.45 + b.userData.ph) % 1;
      b.position.set(b.userData.x + Math.sin(t * 3 + b.userData.ph * 9) * 0.08, 0.6 + u * 1.3, b.userData.z);
      b.material.opacity = Math.sin(u * Math.PI);
      b.scale.setScalar(0.09 * (1 - u * 0.6));
    }
    const k = cligne(t);
    for (const o of yeux) o.scale.y = k;
  };
  return { racine, animer, rayon: 1.78, centre: 0.18, bas: -0.66, sauvage: 0.58, vole: false, hauteur: 0.3 };
}

// ---------- Céleste (Brume, légendaire) : une baleine du ciel ; sur son dos, une petite île avec un arbre, une cascade
// et un arc-en-ciel ; ses nageoires et sa queue sont des nuages
const PAL_CEL = { dos: "#3d62e6", flanc: "#86a8ff", ventre: "#eef3ff", terre: "#a0714f", herbe: "#7ed957", herbeFonce: "#4fae3f", tronc: "#8a5a3c", feuille: "#5fcf6a", feuille2: "#8fe36a", eau: "#dff7ff", nuage: "#ffffff", iris: "#2a3a8f", bouche: "#2a3a8f", joue: "#ff9fc8" };
const NACRE_CEL = { dos: "#ff9fcf", flanc: "#ffc9e6", ventre: "#fff6fb", terre: "#b77d5c", herbe: "#a8e07a", herbeFonce: "#7cc45a", tronc: "#7a4a3a", feuille: "#ffb3d9", feuille2: "#ffd6ea", eau: "#e6f7ff", nuage: "#fffaff", iris: "#a02f7a", bouche: "#8a2a6a", joue: "#ff7fb8" };
function celeste(nacree) {
  const P = nacree ? NACRE_CEL : PAL_CEL;
  const racine = new THREE.Group();
  const corpsG = new THREE.Group();
  racine.add(corpsG);
  // le corps : de la tête (à droite) vers la queue (à gauche), plus foncé sur le dos, clair dessous
  const courbe = new THREE.CatmullRomCurve3([[1.55, -0.02, 0], [0.9, 0.02, 0], [0.1, 0.04, 0], [-0.8, 0.12, 0], [-1.5, 0.3, 0]].map((p) => new THREE.Vector3(...p)));
  const cDos = new THREE.Color(P.dos), cFlanc = new THREE.Color(P.flanc), cVentre = new THREE.Color(P.ventre), c = new THREE.Color();
  const rayon = (t) => (t < 0.2 ? 0.96 * Math.sqrt(Math.max(0, 1 - ((0.2 - t) / 0.2) ** 2)) : 0.96 * (1 - ((t - 0.2) / 0.8) ** 1.25 * 0.82));
  const geo = tubeVariable(courbe, rayon, { n: 72, m: 28, couleur: (t, d) => (d.y > 0.25 ? c.copy(cFlanc).lerp(cDos, Math.min(1, (d.y - 0.25) * 2.2)) : d.y > -0.35 ? c.copy(cFlanc) : c.copy(cFlanc).lerp(cVentre, Math.min(1, (-0.35 - d.y) * 3))) });
  const corps = encrer(new THREE.Mesh(geo, toon("#ffffff", { vertexColors: true })), 0.034);
  corpsG.add(corps);
  // le visage, sur le flanc qui nous regarde
  const surFlanc = (t, d, k) => courbe.getPointAt(t).add(d.clone().normalize().multiplyScalar(rayon(t) * k));
  const yeux = [];
  const dOeil = new THREE.Vector3(0.25, 0.32, 1).normalize();
  const o = oeil(0.21, P.iris);
  o.position.copy(surFlanc(0.155, dOeil, 0.93));
  o.quaternion.setFromUnitVectors(AVANT, dOeil);
  corpsG.add(o);
  yeux.push(o);
  const dJoue = new THREE.Vector3(0, -0.18, 1).normalize();
  const j = joueRose(0.13, P.joue);
  j.position.copy(surFlanc(0.215, dJoue, 1.012));
  j.quaternion.setFromUnitVectors(AVANT, dJoue);
  corpsG.add(j);
  const ptsBouche = [];
  for (let i = 0; i <= 10; i++) ptsBouche.push(surFlanc(0.035 + i * 0.019, new THREE.Vector3(0, -0.5 + i * 0.03 + (i > 7 ? (i - 7) * 0.05 : 0), 1), 1.006));
  corpsG.add(membre(ptsBouche, 0.026, 0.02, toon(P.bouche), { encre: 0.008 }));
  // l'île sur son dos : de la terre, de l'herbe, un arbre, une cascade qui tombe sur le côté, un arc-en-ciel
  const ile = new THREE.Group();
  ile.position.set(0.15, 0.78, 0.08);
  corpsG.add(ile);
  const texHerbe = toile(128, 64, (x, l, h) => { x.fillStyle = P.herbe; x.fillRect(0, 0, l, h); const rr = alea(2828); x.fillStyle = P.herbeFonce; for (let i = 0; i < 40; i++) { x.beginPath(); x.arc(rr() * l, rr() * h, 1.5 + rr() * 2.5, 0, TAU); x.fill(); } });
  const terre = encrer(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.42, 0.22, 24), toon(P.terre)), 0.02);
  terre.position.y = -0.02;
  ile.add(terre);
  const herbe = encrer(new THREE.Mesh(new THREE.SphereGeometry(0.64, 32, 12, 0, TAU, 0, Math.PI / 2).scale(1, 0.38, 1), toon("#ffffff", { map: texHerbe })), 0.02);
  herbe.position.y = 0.08;
  ile.add(herbe);
  const arbre = new THREE.Group();
  arbre.position.set(-0.18, 0.22, -0.05);
  ile.add(arbre);
  arbre.add(membre([[0, 0, 0], [0.02, 0.22, 0], [-0.02, 0.42, 0.01]], 0.07, 0.045, toon(P.tronc), { encre: 0.012 }));
  const matF = toon(P.feuille), matF2 = toon(P.feuille2);
  for (const [x, y, z, s, m] of [[0, 0.56, 0, 0.26, matF], [0.18, 0.48, 0.06, 0.18, matF2], [-0.17, 0.5, 0.04, 0.19, matF], [0.02, 0.72, 0.02, 0.17, matF2], [0.05, 0.5, 0.18, 0.15, matF2]]) {
    const b = encrer(new THREE.Mesh(new THREE.SphereGeometry(s, 20, 14), m), 0.016);
    b.position.set(x, y, z);
    arbre.add(b);
  }
  // la cascade : un ruban d'eau qui part du bord de l'île et tombe devant le flanc, jusqu'à un petit nuage
  const texEau = toile(32, 128, (x, l, h) => {
    x.fillStyle = "rgba(255,255,255,0)"; x.fillRect(0, 0, l, h);
    const rr = alea(2829);
    for (let i = 0; i < 14; i++) { x.fillStyle = i % 3 ? "rgba(255,255,255,0.95)" : "rgba(180,230,255,0.9)"; const px = rr() * l; x.fillRect(px, rr() * h, 2 + rr() * 3, 20 + rr() * 50); }
  });
  texEau.wrapS = texEau.wrapT = THREE.RepeatWrapping;
  const eau = new THREE.Mesh(ruban([[0.45, 0.88, 0.55], [0.48, 0.8, 0.82], [0.5, 0.4, 1.0], [0.5, -0.2, 1.01], [0.5, -0.78, 0.96]], (t) => 0.16 + t * 0.08), new THREE.MeshBasicMaterial({ color: P.eau, map: texEau, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  const voile = new THREE.Mesh(ruban([[0.45, 0.88, 0.54], [0.48, 0.8, 0.81], [0.5, 0.4, 0.99], [0.5, -0.2, 1.0], [0.5, -0.78, 0.95]], (t) => 0.18 + t * 0.1), new THREE.MeshBasicMaterial({ color: P.eau, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
  corpsG.add(voile, eau);
  const brume = nuage(0.16, P.nuage, 2830, 0.016);
  brume.position.set(0.5, -0.84, 0.96);
  corpsG.add(brume);
  // l'arc-en-ciel au-dessus de l'île (des anneaux de couleur)
  const arc = new THREE.Group();
  const couleursArc = ["#ff6b6b", "#ffb347", "#ffe66d", "#7ee081", "#6ec6ff", "#a78bfa"];
  couleursArc.forEach((col, i) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.5 - i * 0.045, 0.545 - i * 0.045, 40, 1, 0, Math.PI), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide }));
    arc.add(m);
  });
  arc.position.set(0.28, 1.0, 0.36);
  arc.rotation.y = 0.15;
  corpsG.add(arc);
  // les nageoires et la queue en nuages
  const nageoire = nuage(0.22, P.nuage, 2831, 0.018);
  nageoire.position.set(0.98, -0.56, 0.58);
  corpsG.add(nageoire);
  const nageoireLoin = nuage(0.2, P.nuage, 2832, 0.018);
  nageoireLoin.position.set(0.98, -0.56, -0.58);
  corpsG.add(nageoireLoin);
  const queue = new THREE.Group();
  queue.position.copy(courbe.getPointAt(1));
  corpsG.add(queue);
  for (const [x, y, z, s, g] of [[-0.2, 0.1, 0.34, 0.27, 2833], [-0.2, 0.1, -0.34, 0.25, 2834], [-0.32, 0.36, 0, 0.21, 2835], [-0.04, -0.06, 0, 0.18, 2836]]) {
    const n = nuage(s, P.nuage, g, 0.02);
    n.position.set(x, y, z);
    queue.add(n);
  }
  // des petits nuages qui flottent autour
  const vapeurs = [];
  for (let i = 0; i < 3; i++) {
    const n = nuage(0.12 + i * 0.03, P.nuage, 2840 + i, 0.014);
    n.userData = { a: (i / 3) * TAU, h: -0.4 + i * 0.5 };
    racine.add(n);
    vapeurs.push(n);
  }
  const cligne = clignement(2828);
  const animer = (t) => {
    racine.position.y = Math.sin(t * 0.9) * 0.14;
    corpsG.rotation.z = Math.sin(t * 0.9 + 0.8) * 0.06;
    corpsG.rotation.x = Math.sin(t * 0.6) * 0.04;
    queue.rotation.z = Math.sin(t * 1.8) * 0.28;
    queue.position.y = courbe.getPointAt(1).y + Math.sin(t * 1.8 - 0.6) * 0.06;
    nageoire.rotation.x = Math.sin(t * 1.6) * 0.3;
    nageoire.position.y = -0.56 + Math.sin(t * 1.6) * 0.06;
    nageoireLoin.position.y = -0.56 + Math.sin(t * 1.6 + 0.4) * 0.06;
    texEau.offset.y = -t * 1.2;
    arc.children.forEach((m, i) => { m.material.opacity = 0.55 + 0.25 * Math.sin(t * 1.7 + i * 0.5); });
    arbre.rotation.z = Math.sin(t * 1.3) * 0.04;
    for (const n of vapeurs) {
      const a = n.userData.a + t * 0.18;
      n.position.set(Math.cos(a) * 2.1, n.userData.h + Math.sin(t * 0.8 + n.userData.a) * 0.1, Math.sin(a) * 1.1 - 0.2);
    }
    const k = cligne(t);
    for (const y of yeux) y.scale.y = k;
  };
  return { racine, animer, rayon: 2.3, centre: 0.25, bas: -1.0, sauvage: 1.9, vole: true, hauteur: 0.28 };
}

// ---------- Doublon (Or) : un poisson tout en or ; chaque écaille est une pièce ; une petite couronne, des yeux de rubis
const PAL_DOUB = { or: "#ffc93a", clair: "#fff0a8", fonce: "#c88a12", voile: "#ffb12e", voileBout: "#ff7a3d", couronne: "#ffd84a", g1: "#e0115f", g2: "#2f6dff", g3: "#18c47a", iris: "#e0115f", bouche: "#8a4a00", joue: "#ff8f6b" };
const NACRE_DOUB = { or: "#e3eaf4", clair: "#ffffff", fonce: "#9aa8bd", voile: "#c9d8f2", voileBout: "#9fb8ff", couronne: "#eef3fb", g1: "#2f6dff", g2: "#a64dff", g3: "#18c4c4", iris: "#2f6dff", bouche: "#3a4a6a", joue: "#ff9fc8" };
function doublon(nacree) {
  const P = nacree ? NACRE_DOUB : PAL_DOUB;
  const racine = new THREE.Group();
  const corpsG = new THREE.Group();
  racine.add(corpsG);
  const [RX, RY, RZ] = [0.98, 0.86, 0.78];
  // les écailles : des pièces qui se chevauchent
  const tex = toile(512, 256, (x, l, h) => {
    x.fillStyle = P.or; x.fillRect(0, 0, l, h);
    for (let ry = -1, rang = 0; ry < h + 24; ry += 17, rang++) {
      for (let rx = (rang % 2) * 13 - 13; rx < l + 26; rx += 26) {
        const g = x.createRadialGradient(rx - 4, ry - 4, 2, rx, ry, 15);
        g.addColorStop(0, P.clair); g.addColorStop(0.55, P.or); g.addColorStop(1, P.fonce);
        x.fillStyle = g; x.beginPath(); x.arc(rx, ry, 14, 0, TAU); x.fill();
        x.strokeStyle = P.fonce; x.lineWidth = 1.6; x.stroke();
        x.strokeStyle = "rgba(255,255,255,0.5)"; x.lineWidth = 1; x.beginPath(); x.arc(rx, ry, 9.5, Math.PI * 1.05, Math.PI * 1.75); x.stroke();
      }
    }
  });
  const matOr = toon("#ffffff", { map: tex, emissive: new THREE.Color(P.fonce), emissiveIntensity: 0.22 });
  corpsG.add(encrer(new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32).scale(RX, RY, RZ), matOr), 0.032));
  // le visage : des yeux de rubis, des joues, une petite bouche ronde
  const yeux = [];
  for (const s of [-1, 1]) {
    const o = oeil(0.24, P.iris);
    surCorps(o, new THREE.Vector3(s * 0.42, 0.18, 0.88), RX, RY, RZ, 0.95);
    corpsG.add(o);
    yeux.push(o);
    const j = joueRose(0.11, P.joue);
    surCorps(j, new THREE.Vector3(s * 0.66, -0.16, 0.72), RX, RY, RZ, 1.01);
    corpsG.add(j);
  }
  const bouche = encrer(new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.026, 8, 20), toon(P.bouche)), 0.008);
  surCorps(bouche, new THREE.Vector3(0, -0.28, 1), RX, RY, RZ, 0.99);
  corpsG.add(bouche);
  // la petite couronne posée de travers sur la tête, avec ses pierres
  const couronne = new THREE.Group();
  couronne.position.copy(surEllipsoide(new THREE.Vector3(0.12, 1, 0.18).normalize(), RX, RY, RZ, 0.96));
  couronne.rotation.set(0.18, 0, -0.2);
  couronne.scale.setScalar(1.35);
  corpsG.add(couronne);
  const matCour = toon(P.couronne, { emissive: new THREE.Color(P.fonce), emissiveIntensity: 0.25, side: THREE.DoubleSide });
  couronne.add(encrer(new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.14, 28, 1, true), matCour), 0.012));
  const gemmes = [P.g1, P.g2, P.g3, P.g2, P.g1];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + 0.3;
    const pointe = encrer(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 10), matCour), 0.01);
    pointe.position.set(Math.cos(a) * 0.27, 0.16, Math.sin(a) * 0.27);
    couronne.add(pointe);
    const bille = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), toon(gemmes[i], { emissive: new THREE.Color(gemmes[i]), emissiveIntensity: 0.35 }));
    bille.position.set(Math.cos(a) * 0.27, 0.27, Math.sin(a) * 0.27);
    couronne.add(bille);
    const pierre = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), toon(gemmes[(i + 1) % 5], { emissive: new THREE.Color(gemmes[(i + 1) % 5]), emissiveIntensity: 0.4 }));
    pierre.position.set(Math.cos(a + 0.63) * 0.305, 0.0, Math.sin(a + 0.63) * 0.305);
    couronne.add(pierre);
  }
  // les voiles : une grande queue en trois pans qui ondulent, deux petites nageoires
  const voileCouleurs = (geo, longueur) => {
    const pos = geo.attributes.position, cols = [];
    const a = new THREE.Color(P.voile), b = new THREE.Color(P.voileBout), cc = new THREE.Color();
    for (let i = 0; i < pos.count; i++) { cc.copy(a).lerp(b, Math.min(1, Math.abs(pos.getX(i)) / longueur)); cols.push(cc.r, cc.g, cc.b); }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
    return geo;
  };
  const formeVoile = new THREE.Shape();
  formeVoile.moveTo(0, -0.12); formeVoile.bezierCurveTo(-0.5, -0.5, -1.0, -0.4, -1.15, -0.62); formeVoile.bezierCurveTo(-1.1, -0.2, -1.2, 0.2, -1.12, 0.52); formeVoile.bezierCurveTo(-0.9, 0.36, -0.45, 0.46, 0, 0.12); formeVoile.closePath();
  const matVoile = toon("#ffffff", { vertexColors: true, transparent: true, opacity: 0.88, side: THREE.DoubleSide });
  const voiles = [];
  for (const [y, rz, ry, k] of [[0.14, 0.42, 0.7, 1], [-0.02, 0, 0, 1.1], [-0.16, -0.42, -0.7, 0.96]]) {
    const pivot = new THREE.Group();
    pivot.position.set(0, y, -0.66);
    pivot.rotation.set(0, -Math.PI / 2 + ry, rz);
    const m = encrer(new THREE.Mesh(voileCouleurs(plaque(formeVoile, 0.02, 0.012), 1.15), matVoile), 0.012);
    m.scale.setScalar(k * 1.3);
    pivot.add(m);
    corpsG.add(pivot);
    voiles.push({ pivot, ry, rz, ph: y * 9 });
  }
  const formeNag = new THREE.Shape();
  formeNag.moveTo(0, -0.08); formeNag.bezierCurveTo(0.2, -0.3, 0.5, -0.3, 0.58, -0.1); formeNag.bezierCurveTo(0.5, 0.1, 0.25, 0.14, 0, 0.08); formeNag.closePath();
  const nageoires = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.86, -0.28, 0.18);
    const m = encrer(new THREE.Mesh(voileCouleurs(plaque(formeNag, 0.02, 0.012), 0.58), matVoile), 0.01);
    m.scale.set(s, 1, 1);
    m.rotation.y = s * -0.5;
    pivot.add(m);
    corpsG.add(pivot);
    nageoires.push({ pivot, s });
  }
  // des éclats qui brillent sur les pièces
  const eclats = [];
  for (let i = 0; i < 6; i++) {
    const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: toileEtoile(), color: "#ffffff", transparent: true, depthWrite: false }));
    const rr = alea(3030 + i);
    e.position.copy(surEllipsoide(new THREE.Vector3(rr() * 1.6 - 0.8, rr() * 1.4 - 0.5, 0.75).normalize(), RX, RY, RZ, 1.06));
    e.userData.ph = rr() * TAU;
    corpsG.add(e);
    eclats.push(e);
  }
  const cligne = clignement(3030);
  const animer = (t) => {
    racine.position.y = Math.sin(t * 1.5) * 0.09;
    corpsG.rotation.z = Math.sin(t * 1.5 + 0.5) * 0.05;
    corpsG.rotation.y = 0.38 + Math.sin(t * 0.7) * 0.1;
    for (const v of voiles) {
      v.pivot.rotation.y = -Math.PI / 2 + v.ry + Math.sin(t * 2.2 + v.ph) * 0.22;
      v.pivot.rotation.z = v.rz + Math.sin(t * 1.7 + v.ph) * 0.08;
    }
    for (const n of nageoires) n.pivot.rotation.y = n.s * Math.sin(t * 4.5) * 0.35;
    couronne.rotation.z = -0.2 + Math.sin(t * 1.5 + 1) * 0.05;
    for (const e of eclats) { const k = Math.max(0, Math.sin(t * 2.3 + e.userData.ph)) ** 3; e.material.opacity = k; e.scale.setScalar(0.08 + k * 0.24); e.material.rotation = t; }
    const k = cligne(t);
    for (const o of yeux) o.scale.y = k;
  };
  return { racine, animer, rayon: 2.0, centre: 0.25, bas: -0.86, sauvage: 0.88, vole: false, hauteur: 0.22 };
}

// ---------- qui fabrique quelle créature
const FABRIQUES = {
  piquebulle: (n) => piquebulle(1, n), corapouf: (n) => piquebulle(2, n), recifort: (n) => piquebulle(3, n),
  nueraie, hippoudre, crabouille, meduzette, tortuffe, pieuvrette, lanterneau, narvelin, braisilotl, celeste, doublon,
};

// ---------- l'aura de la rareté : rien pour une commune ; des étincelles (peu commune), un halo (rare), des étoiles qui
// tournent autour (épique), des rayons et des braises qui montent (légendaire), une pluie d'éclats d'or (or).
// Les sprites portent userData.aura : l'atelier les cache pour dessiner une silhouette.
function aura(c, rarete) {
  const R = RARETES[rarete];
  if (!R?.rang) return null;
  const rang = R.rang;
  const groupe = new THREE.Group();
  groupe.userData.aura = true;
  const col = new THREE.Color(R.lueur), fort = new THREE.Color(R.couleur);
  const rnd = alea(rang * 131 + c.rayon * 17);
  const sprite = (tex, couleur, o = {}) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: couleur, transparent: true, depthWrite: false, ...o }));
    sp.userData.aura = true;
    groupe.add(sp);
    return sp;
  };
  const vie = [];
  // le halo (rare et plus) : un rond de lumière derrière la créature, qui respire
  if (rang >= 2) {
    const halo = sprite(toileHalo(), fort, { opacity: 0.5 });
    halo.renderOrder = -2;
    halo.position.y = c.centre;
    const base = c.rayon * (2.2 + rang * 0.18);
    vie.push((t) => { const k = 0.5 + 0.5 * Math.sin(t * 1.8); halo.scale.setScalar(base * (0.92 + 0.08 * k)); halo.material.opacity = 0.32 + 0.12 * k + (rang >= 4 ? 0.1 : 0); });
  }
  // les rayons (légendaire, or) : ils tournent lentement derrière
  if (rang >= 4) {
    const rayons = sprite(toileRayons(), rang === 5 ? new THREE.Color("#ffe27a") : col, { opacity: 0.4 });
    rayons.renderOrder = -1;
    rayons.position.y = c.centre;
    const base = c.rayon * 3.1;
    vie.push((t) => { rayons.material.rotation = t * 0.25; rayons.scale.setScalar(base * (0.96 + 0.04 * Math.sin(t * 2.3))); rayons.material.opacity = 0.32 + 0.08 * Math.sin(t * 1.7); });
  }
  // des étincelles qui scintillent (peu commune et plus)
  const nb = [0, 5, 7, 8, 10, 16][rang];
  for (let i = 0; i < nb; i++) {
    const s = sprite(toileEtoile(), i % 3 ? col : new THREE.Color("#ffffff"));
    const a = rnd() * TAU, h = (rnd() - 0.3) * c.rayon * 1.1, d = c.rayon * (0.6 + rnd() * 0.45);
    s.position.set(Math.cos(a) * d, c.centre + h, Math.sin(a) * d);
    const ph = rnd() * TAU, taille = (0.1 + rnd() * 0.12) * (1 + rang * 0.08);
    vie.push((t) => { const k = Math.max(0, Math.sin(t * 2.4 + ph)); s.scale.setScalar(taille * (0.1 + k)); s.material.opacity = k; });
  }
  // des étoiles qui tournent autour (épique et plus)
  if (rang >= 3) {
    const n = rang === 3 ? 6 : 8;
    for (let i = 0; i < n; i++) {
      const s = sprite(toileEtoile(), i % 2 ? fort : col);
      const ph = (i / n) * TAU, haut = (rnd() - 0.5) * c.rayon * 0.9, d = c.rayon * (0.95 + rnd() * 0.2), v = 0.7 + rnd() * 0.4;
      const taille = 0.12 + rnd() * 0.08;
      vie.push((t) => {
        const a = ph + t * v;
        s.position.set(Math.cos(a) * d, c.centre + haut + Math.sin(t * 1.3 + ph) * 0.15 * c.rayon, Math.sin(a) * d);
        s.scale.setScalar(taille * (0.75 + 0.25 * Math.sin(t * 5 + ph)));
        s.material.opacity = 0.65 + 0.35 * Math.sin(t * 3 + ph);
      });
    }
  }
  // des braises qui montent (légendaire) ; des éclats d'or qui descendent en tournant (or)
  if (rang >= 4) {
    const n = rang === 5 ? 14 : 12;
    for (let i = 0; i < n; i++) {
      const or = rang === 5;
      const s = sprite(or ? toilePiece() : toileRond(), or ? new THREE.Color("#ffe27a") : i % 2 ? fort : new THREE.Color("#ffe0a0"));
      const ph = rnd(), a = rnd() * TAU, d = c.rayon * (0.3 + rnd() * 0.75), v = 0.18 + rnd() * 0.16;
      const taille = (or ? 0.13 : 0.07) + rnd() * 0.05;
      const bas = c.bas, haut = c.centre + c.rayon * 1.1;
      vie.push((t) => {
        const u = (t * v + ph) % 1;
        const y = or ? haut - (haut - bas) * u : bas + (haut - bas) * u;
        s.position.set(Math.cos(a + t * 0.3) * d, y, Math.sin(a + t * 0.3) * d);
        s.scale.setScalar(taille * (or ? 1 : 1 - u * 0.6));
        s.material.opacity = Math.sin(u * Math.PI) * (or ? 1 : 0.9);
        if (or) s.material.rotation = t * 2 + ph * 6;
      });
    }
  }
  c.racine.add(groupe);
  return (t) => { for (const f of vie) f(t); };
}

// ---------- une créature, nacrée ou non (la version nacrée a des reflets qui scintillent autour d'elle)
export function creerCreature(id, { nacree = false } = {}) {
  const e = ESPECES[id] ? id : "piquebulle";
  const fab = FABRIQUES[e];
  const c = fab ? fab(nacree) : piquebulle(1, nacree);
  c.id = e;
  c.nacree = nacree;
  const auraVie = aura(c, ESPECES[e].rarete);
  if (auraVie) { const animer = c.animer; c.animer = (t) => { animer(t); auraVie(t); }; }
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
  let filet = null, cachee = false, camCible = null, tremble = 0;
  // une onde de lumière qui s'élargit sur l'eau
  function onde(couleur, retard = 0, taille = 1) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: couleur, transparent: true, opacity: 0, depthWrite: false }));
    m.position.y = 0.04;
    scene.add(m);
    let t0 = null;
    return (t) => {
      if (t0 === null) t0 = t + retard;
      const u = (t - t0) / 1.25;
      if (u < 0) return true;
      if (u >= 1) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); return false; }
      m.scale.setScalar(c.rayon * taille * (0.6 + 3.2 * doux(0, 1, u)));
      m.material.opacity = 0.85 * (1 - u);
      return true;
    };
  }
  // une colonne de lumière qui descend du ciel sur la créature (légendaire, or)
  function colonne(couleur, duree = 1.6) {
    const geo = new THREE.CylinderGeometry(1, 1, 16, 40, 1, true);
    geo.translate(0, 8, 0);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: toileColonne(), color: couleur, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    m.position.y = sauvage ? -0.2 : c.bas;
    scene.add(m);
    let t0 = null;
    return (t) => {
      if (t0 === null) t0 = t;
      const u = (t - t0) / duree;
      if (u >= 1) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); return false; }
      m.material.opacity = u < 0.12 ? u / 0.12 : 1 - doux(0.35, 1, u);
      const rr = c.rayon * (0.5 + 0.3 * Math.sin(Math.min(1, u * 1.4) * Math.PI * 0.5));
      m.scale.set(rr, 1, rr);
      return true;
    };
  }
  // ce que fait la rareté quand la créature arrive (entree), est attrapée (attrape) ou s'affiche sur la fiche (fiche)
  function effetsRarete(quand) {
    const R = rareteDe(idActuel), rang = R.rang;
    if (!rang || !c) return rang;
    const y = (sauvage ? c.sauvage : 0) + c.centre;
    const origine = new THREE.Vector3(0, y, 0);
    if (quand !== "fiche" || rang >= 3) {
      effets.push(gerbe(scene, { n: 8 + rang * 6, couleurs: [R.lueur, R.couleur, "#ffffff"], origine, vitesse: 2 + rang * 0.35, haut: 2.6, gravite: 2.2, duree: 1.1 + rang * 0.1, taille: 0.22 + rang * 0.025, tex: toileEtoile(), graine: rang * 7 + quand.length }));
    }
    if (sauvage && rang >= 2) effets.push(onde(R.couleur, 0, 1));
    if (sauvage && rang >= 3) effets.push(onde(R.lueur, 0.28, 1.35));
    if (rang >= 4) {
      effets.push(colonne(R.lueur, quand === "entree" ? 1.9 : 1.3));
      if (sauvage) tremble = quand === "entree" ? 1 : 0.55;
    }
    if (rang >= 5) effets.push(gerbe(scene, { n: 28, couleurs: ["#ffe27a", "#ffd23f", "#fff6c4"], origine: new THREE.Vector3(0, y + c.rayon * 2.4, 0), vitesse: 2.6, haut: 0.4, gravite: 4.5, duree: 1.8, taille: 0.32, tex: toilePiece(), graine: 41 + quand.length }));
    return rang;
  }
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
    if (tremble > 0) {
      tremble = Math.max(0, tremble - dt * 1.4);
      const a = reduit ? 0 : tremble * tremble;
      scene.position.set((Math.random() - 0.5) * a * 0.3, (Math.random() - 0.5) * a * 0.2, 0);
    }
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
    const rang = effetsRarete("entree");
    surEvenement("entree", rang);
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
            surEvenement("attrape", effetsRarete("attrape"));
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
    changer(id, opts = {}) { const autre = id !== idActuel; poser(id, opts); if (sauvage) entree(); else if (autre) effetsRarete("fiche"); },
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
    const auras = [];
    if (silhouette) c.racine.traverse((o) => { if (o.userData.aura && o.visible) { o.visible = false; auras.push(o); } });
    renderer.render(scene, camera);
    for (const o of auras) o.visible = true;
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
