// GRAND LINE (Barhaw), en 3D : une carte au trésor en parchemin, vue d'en haut, avec les îles en relief
// (courbes de niveau, hachures), la mer à l'aquarelle qui bouge, la route en pointillés rouges, et le navire
// de la commu, un petit navire-jouet aux couleurs de Barhaw, qui flotte dessus.
// Tout est inventé (la carte, les îles, le navire) ; ce fichier ne fait que dessiner ce que site.js lui donne
// (les données du bot) et dit quand on clique sur une île ou sur la bouteille.
// three.js r170 (licence MIT, © three.js authors) est rangé à côté : la page n'accepte que ses propres scripts.
import * as THREE from "./three-r170.module.min.js";
// le jour et la nuit, les lanternes, les feux d'artifice, l'arène des défis, la Baleine étoilée… (V4)
import { creerFete } from "./grandline-fete.js";

THREE.ColorManagement.enabled = false;

const ENCRE = 0x2a160c;
const W = 236; // la feuille de parchemin
const H = 146;
const MER_X = 104; // la mer : de −104 à 104 en x, de −58 à 58 en z (le reste : la marge en parchemin)
const MER_Z = 58;

const hasard = (graine) => () => { graine = (graine * 16807) % 2147483647; return (graine - 1) / 2147483646; };
function toile(l, h, dessin) {
  const c = document.createElement("canvas");
  c.width = l;
  c.height = h;
  dessin(c.getContext("2d"), l, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}
const v3 = (x, z, y = 0) => new THREE.Vector3(x, y, z);
// un petit rond lumineux (pour les lucioles, la neige, les étincelles : sinon les points sont carrés)
let rond = null;
function pastille() {
  rond ||= toile(64, 64, (x, l) => {
    const d = x.createRadialGradient(l / 2, l / 2, 0, l / 2, l / 2, l / 2);
    d.addColorStop(0, "rgba(255,255,255,1)");
    d.addColorStop(0.45, "rgba(255,255,255,.85)");
    d.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = d;
    x.fillRect(0, 0, l, l);
  });
  return rond;
}
// une nuée d'orage (l'Île Tonnerre) : des bouillons qui se chevauchent, clairs en haut, un ventre sombre et presque plat
let toileNuee = null;
function nuee() {
  toileNuee ||= toile(256, 128, (x, l, h) => {
    const R = hasard(4242);
    for (let k = 0; k < 30; k++) {
      const u = R();
      const r = h * (0.15 + 0.2 * R()) * (1.05 - 1.1 * Math.abs(u - 0.5));
      const cx = l * (0.13 + 0.74 * u), cy = h * 0.66 - r * (0.15 + 0.8 * R());
      const d = x.createRadialGradient(cx, cy, r * 0.25, cx, cy, r);
      d.addColorStop(0, "rgba(255,255,255,1)");
      d.addColorStop(0.72, "rgba(255,255,255,.96)");
      d.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = d;
      x.beginPath();
      x.arc(cx, cy, r, 0, 7);
      x.fill();
    }
    // le ventre : il s'efface en bas, à plat
    x.globalCompositeOperation = "destination-out";
    const bas = x.createLinearGradient(0, h * 0.6, 0, h * 0.82);
    bas.addColorStop(0, "rgba(0,0,0,0)");
    bas.addColorStop(1, "rgba(0,0,0,1)");
    x.fillStyle = bas;
    x.fillRect(0, h * 0.6, l, h * 0.4);
    // l'ombre : le dessous est sombre, le dessus garde un peu de jour
    x.globalCompositeOperation = "source-atop";
    const ombre = x.createLinearGradient(0, h * 0.12, 0, h * 0.74);
    ombre.addColorStop(0, "rgba(0,0,0,0)");
    ombre.addColorStop(1, "rgba(0,0,0,.6)");
    x.fillStyle = ombre;
    x.fillRect(0, 0, l, h);
  });
  return toileNuee;
}

// ---------- ce que les îles ont l'air d'être (couleurs du parchemin, et ce qu'il y a dessus) ----------
const THEMES = {
  port: { h: 1.8, r: 8, sable: 0xf1ddb0, terre: 0xb9c28a, sommet: 0x8f9a62 },
  plage: { h: 2.2, r: 8, sable: 0xf6e2b6, terre: 0xa9c873, sommet: 0x7e9d4e },
  recif: { h: 2.4, r: 7, sable: 0xd9c7a2, terre: 0x9a8a74, sommet: 0x6f6252 },
  volcan: { h: 2.6, r: 8.5, sable: 0x8d6a52, terre: 0x6f4d3b, sommet: 0x4c3329 },
  glace: { h: 2.8, r: 8, sable: 0xd5e9f6, terre: 0xeaf4fb, sommet: 0xffffff },
  lucioles: { h: 1.6, r: 4.2, sable: 0xe9d6a8, terre: 0x5d8a62, sommet: 0x3f6b4b, ilots: 4 },
  champignons: { h: 2, r: 8, sable: 0xeedcae, terre: 0x8fbf5f, sommet: 0x6a9b43 },
  ruines: { h: 0.9, r: 8.5, sable: 0xe6d3a6, terre: 0xc7b385, sommet: 0xa8946a },
  moulins: { h: 3.2, r: 8, sable: 0xeedbb0, terre: 0xb2cf78, sommet: 0x86a653 },
  marche: { h: 0.4, r: 6, sable: 0xe8d5a8, terre: 0xd8c08d, sommet: 0xc4a874 },
  arbre: { h: 2.2, r: 8.5, sable: 0xf0dcae, terre: 0x84b55a, sommet: 0x5f8f3b },
  dunes: { h: 2, r: 9, sable: 0xf3d48f, terre: 0xe7bd6a, sommet: 0xd59f48 },
  phare: { h: 2.6, r: 5.5, sable: 0xcfc1a4, terre: 0x938676, sommet: 0x6e6457 },
  orage: { h: 3.6, r: 8, sable: 0x8f8a99, terre: 0x5c586b, sommet: 0x3d3a4a },
  tresor: { h: 2.4, r: 8.5, sable: 0xf6e0b0, terre: 0xb7c97a, sommet: 0x8ea854 },
  // la V4 : les nouvelles îles (leur modèle Blender ile-<id>-v4.glb remplace ce dessin dès qu'il est chargé)
  marais: { h: 0.7, r: 8, sable: 0x6f6a4a, terre: 0x4f6b3c, sommet: 0x3a5230 },
  cristal: { h: 2, r: 7.5, sable: 0xe8e0f0, terre: 0xb8a9d6, sommet: 0x9a86c6 },
  ciel: { h: 1.4, r: 4.5, sable: 0xf3e3b8, terre: 0x8fcf6a, sommet: 0x6aae4a, ilots: 3 },
  epaves: { h: 0.6, r: 8.5, sable: 0xb9b2a4, terre: 0x8a8578, sommet: 0x6c685e },
  horloge: { h: 2.6, r: 7.5, sable: 0xe6cf9a, terre: 0xb89b62, sommet: 0x8f7442 },
  geants: { h: 3.4, r: 9, sable: 0xe9d7a6, terre: 0x93b86a, sommet: 0x6f9550 },
  fort: { h: 2.8, r: 7.5, sable: 0xe4d2a4, terre: 0xa79b82, sommet: 0x7f7562 },
};

// ---------- le relief : une carte en courbes de niveau, ombrée à la main ----------
function materiauRelief(uniforms) {
  return new THREE.ShaderMaterial({
    uniforms: { uLumiere: uniforms.uLumiere, uGris: { value: 0 } },
    vertexColors: true,
    vertexShader: `
      varying vec3 vCouleur; varying vec3 vNormale; varying vec3 vPos;
      void main() {
        vCouleur = color; vNormale = normalize(normalMatrix * normal);
        vec4 m = modelMatrix * vec4(position, 1.0); vPos = position;
        gl_Position = projectionMatrix * viewMatrix * m;
      }`,
    fragmentShader: `
      uniform vec3 uLumiere; uniform float uGris;
      varying vec3 vCouleur; varying vec3 vNormale; varying vec3 vPos;
      void main() {
        float d = max(dot(normalize(vNormale), uLumiere), 0.0);
        vec3 c = vCouleur * (0.58 + 0.55 * d);
        float n = fract(vPos.y / 0.55);
        float ligne = 1.0 - smoothstep(0.0, 0.09, min(n, 1.0 - n));
        c = mix(c, c * 0.62, ligne * step(0.12, vPos.y));
        float h = step(0.55, fract((vPos.x - vPos.z) * 1.4));
        c = mix(c, c * 0.82, h * (1.0 - d) * 0.75 * step(0.05, vPos.y));
        float g = dot(c, vec3(0.3, 0.59, 0.11));
        c = mix(c, vec3(g) * vec3(1.0, 0.97, 0.9), uGris);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}

// une île : un disque en relief, au contour irrégulier, avec un plateau sous l'eau (turquoise)
function terrain(t, graine, uniforms, r = t.r, h = t.h) {
  const R = hasard(graine);
  const bosses = Array.from({ length: 5 }, () => [R() * Math.PI * 2, 0.05 + R() * 0.11, 1 + Math.floor(R() * 4)]);
  const creux = Array.from({ length: 4 }, () => [R() * Math.PI * 2, R() * 0.5, 0.4 + R() * 0.4]);
  const bord = (a) => r * (1 + bosses.reduce((s, [ph, amp, f]) => s + amp * Math.sin(a * f + ph), 0));
  const ANNEAUX = 16;
  const SECTEURS = 56;
  const pos = [];
  const col = [];
  const idx = [];
  const sable = new THREE.Color(t.sable);
  const terre = new THREE.Color(t.terre);
  const sommet = new THREE.Color(t.sommet);
  const lagon = new THREE.Color(0x8fd3d0);
  const hauteur = (tt, a) => {
    if (tt > 0.9) return -0.25 - (tt - 0.9) * 6; // sous l'eau
    const p = Math.pow(1 - tt / 0.9, 1.25);
    const relief = creux.reduce((s, [ph, x, l]) => s + l * 0.25 * Math.exp(-Math.pow(Math.sin((a - ph) / 2), 2) * 6) * Math.exp(-Math.pow(tt - x, 2) * 12), 0);
    return Math.max(0.05, h * p * (0.85 + relief)) + (tt > 0.78 ? -0.6 * (tt - 0.78) : 0);
  };
  const couleur = (y, tt) => {
    if (y < 0) return lagon.clone().lerp(new THREE.Color(0x6fb0c8), Math.min(1, -y / 1.2));
    if (y < 0.28 || tt > 0.8) return sable.clone();
    const k = Math.min(1, y / h);
    return k < 0.55 ? sable.clone().lerp(terre, Math.min(1, (k - 0.05) * 3)) : terre.clone().lerp(sommet, (k - 0.55) / 0.45);
  };
  pos.push(0, hauteur(0, 0), 0);
  const c0 = couleur(hauteur(0, 0), 0);
  col.push(c0.r, c0.g, c0.b);
  for (let i = 1; i <= ANNEAUX; i++) {
    const tt = (i / ANNEAUX) * 1.08;
    for (let j = 0; j < SECTEURS; j++) {
      const a = (j / SECTEURS) * Math.PI * 2;
      const rr = bord(a) * tt;
      const y = hauteur(tt, a) + (R() - 0.5) * 0.06 * (tt < 0.9 ? 1 : 0);
      pos.push(Math.cos(a) * rr, y, Math.sin(a) * rr);
      const c = couleur(y, tt);
      col.push(c.r, c.g, c.b);
    }
  }
  const v = (i, j) => (i === 0 ? 0 : 1 + (i - 1) * SECTEURS + (j % SECTEURS));
  for (let j = 0; j < SECTEURS; j++) idx.push(0, v(1, j + 1), v(1, j));
  for (let i = 1; i < ANNEAUX; i++) for (let j = 0; j < SECTEURS; j++) idx.push(v(i, j), v(i, j + 1), v(i + 1, j), v(i, j + 1), v(i + 1, j + 1), v(i + 1, j));
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, materiauRelief(uniforms));
  // le trait de côte, à l'encre
  const cote = [];
  for (let j = 0; j <= SECTEURS; j++) {
    const a = (j / SECTEURS) * Math.PI * 2;
    const rr = bord(a) * 0.9;
    cote.push(new THREE.Vector3(Math.cos(a) * rr, 0.06, Math.sin(a) * rr));
  }
  const trait = new THREE.Line(new THREE.BufferGeometry().setFromPoints(cote), new THREE.LineBasicMaterial({ color: ENCRE, transparent: true, opacity: 0.55 }));
  const groupe = new THREE.Group();
  groupe.add(m, trait);
  groupe.userData.relief = m;
  groupe.userData.hauteur = (x, z) => {
    const a = Math.atan2(z, x);
    const tt = Math.hypot(x, z) / bord(a);
    return hauteur(Math.min(1.08, tt), a);
  };
  return groupe;
}

// ---------- les petits objets (style figurine : plastique brillant) ----------
const plastique = (couleur, o = {}) => new THREE.MeshPhongMaterial({ color: couleur, shininess: 45, specular: 0x333333, ...o });
function avecContour(mesh, epaisseur = 1.07) {
  const c = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color: ENCRE, side: THREE.BackSide }));
  c.scale.setScalar(epaisseur);
  mesh.add(c);
  return mesh;
}
function palmier(R) {
  const g = new THREE.Group();
  const tronc = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 2.4, 6), plastique(0x8a5a33));
  tronc.position.y = 1.2;
  tronc.rotation.z = (R() - 0.5) * 0.4;
  g.add(tronc);
  for (let k = 0; k < 5; k++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.8, 4), plastique(0x4f9e4a));
    f.position.set(Math.cos(k * 1.26) * 0.7, 2.35, Math.sin(k * 1.26) * 0.7);
    f.rotation.set(Math.sin(k * 1.26) * 1.2, 0, -Math.cos(k * 1.26) * 1.2);
    g.add(f);
  }
  return g;
}
function maison(couleur) {
  const g = new THREE.Group();
  const murs = avecContour(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 1), plastique(0xf5e6c8)));
  murs.position.y = 0.45;
  const toit = avecContour(new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.8, 4), plastique(couleur)));
  toit.position.y = 1.3;
  toit.rotation.y = Math.PI / 4;
  g.add(murs, toit);
  return g;
}
function nuageBoule(couleur = 0xffffff, opacite = 1) {
  const clair = couleur === 0xffffff;
  return new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshLambertMaterial({ color: couleur, emissive: clair ? 0x8a8088 : 0x1a1620, transparent: opacite < 1, opacity: opacite }));
}

// ce qu'il y a sur chaque île ; renvoie une fonction d'animation (ou rien)
function decor(theme, ile, R, anims) {
  const sol = ile.userData.hauteur;
  const poser = (o, x, z, dy = 0) => { o.position.set(x, sol(x, z) + dy, z); ile.add(o); return o; };
  const t = THEMES[theme];
  if (theme === "plage" || theme === "tresor") for (let k = 0; k < 4; k++) poser(palmier(R), (R() - 0.5) * t.r, (R() - 0.5) * t.r);
  if (theme === "port") {
    for (let k = 0; k < 5; k++) poser(maison([0xff4f9a, 0x9b4dff, 0xe0533c, 0xffb347][k % 4]), -2 + (k % 3) * 1.7, -1.5 + Math.floor(k / 3) * 2);
    const quai = avecContour(new THREE.Mesh(new THREE.BoxGeometry(5, 0.25, 1.1), plastique(0x9a6a40)));
    quai.position.set(t.r * 0.7, 0.3, 2);
    ile.add(quai);
    const mat = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3), plastique(0x6b4226));
    poser(mat, 1.2, 1.4, 1.5);
    const drapeau = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.7), new THREE.MeshLambertMaterial({ color: 0xff4f9a, side: THREE.DoubleSide }));
    drapeau.position.set(1.8, sol(1.2, 1.4) + 2.6, 1.4);
    ile.add(drapeau);
    anims.push((s) => { drapeau.rotation.y = Math.sin(s * 3) * 0.3; });
  }
  if (theme === "recif") for (let k = 0; k < 7; k++) {
    const p = avecContour(new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 + R() * 0.8, 0), plastique(0x8b7d6b)));
    p.scale.y = 1.6 + R() * 1.8;
    poser(p, (R() - 0.5) * t.r * 1.3, (R() - 0.5) * t.r * 1.3, 0.4);
  }
  if (theme === "volcan") {
    const cone = avecContour(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 4.2, 5, 18, 1, true), plastique(0x5a3b2e, { side: THREE.DoubleSide })));
    poser(cone, 0, 0, 2.2);
    const lave = new THREE.Mesh(new THREE.CircleGeometry(1.05, 18), new THREE.MeshBasicMaterial({ color: 0xff6a1a }));
    lave.rotation.x = -Math.PI / 2;
    poser(lave, 0, 0, 4.4);
    const lumiere = new THREE.PointLight(0xff6a1a, 2, 14);
    poser(lumiere, 0, 0, 5.5);
    const fumees = Array.from({ length: 6 }, (_, k) => { const f = nuageBoule(0x8c8077, 0.8); f.scale.setScalar(0.7); f.userData.k = k; ile.add(f); return f; });
    anims.push((s) => {
      lave.material.color.setHSL(0.05, 1, 0.5 + Math.sin(s * 4) * 0.08);
      for (const f of fumees) {
        const p = ((s * 0.25 + f.userData.k / 6) % 1);
        f.position.set(Math.sin(p * 5 + f.userData.k) * 0.8, sol(0, 0) + 5 + p * 7, p * 2);
        f.scale.setScalar(0.5 + p * 1.6);
        f.material.opacity = 0.85 * (1 - p);
      }
    });
  }
  if (theme === "glace") for (let k = 0; k < 9; k++) {
    const c = avecContour(new THREE.Mesh(new THREE.ConeGeometry(0.5 + R() * 0.5, 2 + R() * 3, 5), plastique(0xcfe9ff, { shininess: 120, specular: 0xffffff, transparent: true, opacity: 0.92 })));
    c.rotation.z = (R() - 0.5) * 0.5;
    poser(c, (R() - 0.5) * t.r * 1.1, (R() - 0.5) * t.r * 1.1, 1);
  }
  if (theme === "champignons") for (let k = 0; k < 6; k++) {
    const g = new THREE.Group();
    const h = 1.5 + R() * 2.5;
    const pied = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, h, 8), plastique(0xf6ead2));
    pied.position.y = h / 2;
    const chapeau = avecContour(new THREE.Mesh(new THREE.SphereGeometry(1 + R() * 0.6, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), plastique([0xe0533c, 0xff4f9a, 0x9b4dff][k % 3])));
    chapeau.position.y = h;
    chapeau.scale.y = 0.7;
    g.add(pied, chapeau);
    for (let p = 0; p < 4; p++) {
      const point = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 4), plastique(0xffffff));
      const a = R() * Math.PI * 2;
      point.position.set(Math.cos(a) * 0.6, h + 0.55, Math.sin(a) * 0.6);
      g.add(point);
    }
    poser(g, (R() - 0.5) * t.r * 1.1, (R() - 0.5) * t.r * 1.1);
  }
  if (theme === "ruines") for (let k = 0; k < 8; k++) {
    const h = 1 + R() * 2.4;
    const c = avecContour(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, h, 10), plastique(0xe9e0cc)));
    poser(c, Math.cos(k * 0.785) * 4.2, Math.sin(k * 0.785) * 4.2, h / 2 - 0.3);
    if (k % 2 === 0) { c.rotation.z = (R() - 0.5) * 0.4; }
  }
  if (theme === "moulins") for (let k = 0; k < 2; k++) {
    const g = new THREE.Group();
    const tour = avecContour(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 3.2, 10), plastique(0xf5e6c8)));
    tour.position.y = 1.6;
    const toit = avecContour(new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.9, 10), plastique(0xe0533c)));
    toit.position.y = 3.6;
    const pales = new THREE.Group();
    for (let p = 0; p < 4; p++) {
      const pale = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.4, 0.05), plastique(0xfff2f8));
      pale.position.y = 1.2;
      const bras = new THREE.Group();
      bras.rotation.z = (p * Math.PI) / 2;
      bras.add(pale);
      pales.add(bras);
    }
    pales.position.set(0, 3, 0.8);
    g.add(tour, toit, pales);
    poser(g, k ? 2.5 : -2.5, k ? -1.5 : 1.5);
    g.rotation.y = 0.5;
    anims.push((s) => { pales.rotation.z = s * (1.5 + k * 0.4); });
  }
  if (theme === "marche") for (let k = 0; k < 7; k++) {
    const b = new THREE.Group();
    const coque = avecContour(new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), plastique(0x9a6a40)));
    coque.scale.set(1.4, 0.6, 0.7);
    const tente = avecContour(new THREE.Mesh(new THREE.ConeGeometry(0.7, 1, 4), plastique([0xff4f9a, 0xffd36b, 0x9b4dff, 0x3ddc84][k % 4])));
    tente.position.y = 0.6;
    b.add(coque, tente);
    const a = (k / 7) * Math.PI * 2;
    b.position.set(Math.cos(a) * 4.5, 0.15, Math.sin(a) * 4.5);
    b.rotation.y = -a;
    b.userData.a = a;
    ile.add(b);
    anims.push((s) => { b.position.y = 0.15 + Math.sin(s * 1.5 + a * 3) * 0.08; });
  }
  if (theme === "arbre") {
    const tronc = avecContour(new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.6, 7, 10), plastique(0x7a4b2a)));
    poser(tronc, 0, 0, 3.4);
    for (let k = 0; k < 7; k++) {
      const f = avecContour(nuageBoule(0x5fa646), 1.05);
      f.material = plastique([0x5fa646, 0x6fbf55, 0x4f8f3a][k % 3]);
      f.scale.setScalar(2 + R() * 1.4);
      poser(f, (R() - 0.5) * 4, (R() - 0.5) * 4, 7 + R() * 3);
    }
  }
  if (theme === "dunes") for (let k = 0; k < 2; k++) {
    const c = avecContour(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 1.8, 8), plastique(0x5aa04a)));
    poser(c, k ? 3 : -3, k ? -2 : 2, 0.9);
  }
  if (theme === "phare") {
    const tour = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const anneau = new THREE.Mesh(new THREE.CylinderGeometry(0.9 - k * 0.12, 1 - k * 0.12, 1.4, 14), plastique(k % 2 ? 0xffffff : 0xe0533c));
      anneau.position.y = 0.7 + k * 1.4;
      tour.add(anneau);
    }
    const lanterne = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff1a8 }));
    lanterne.position.y = 6;
    const faisceau = new THREE.Mesh(new THREE.ConeGeometry(2.5, 14, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
    faisceau.rotation.z = Math.PI / 2;
    faisceau.position.x = 7;
    const pivot = new THREE.Group();
    pivot.position.y = 6;
    pivot.add(faisceau);
    tour.add(lanterne, pivot);
    poser(tour, 0, 0);
    anims.push((s) => { pivot.rotation.y = s * 0.9; });
  }
  if (theme === "orage") {
    const nuage = new THREE.Group();
    for (let k = 0; k < 8; k++) {
      const b = nuageBoule(0x585466);
      b.scale.set(2 + R() * 1.5, 1.2 + R(), 2 + R() * 1.5);
      b.position.set((R() - 0.5) * 8, 0, (R() - 0.5) * 6);
      nuage.add(b);
    }
    nuage.position.y = 11;
    ile.add(nuage);
    const eclair = new THREE.Line(new THREE.BufferGeometry().setFromPoints([[0, 10], [1, 7.5], [-0.5, 5.5], [0.8, 3.2]].map(([x, y]) => new THREE.Vector3(x, y + sol(0, 0), 0))), new THREE.LineBasicMaterial({ color: 0xfff6a0 }));
    ile.add(eclair);
    anims.push((s) => {
      const f = (s * 0.7) % 3;
      eclair.visible = f < 0.12 || (f > 0.2 && f < 0.26);
      nuage.position.x = Math.sin(s * 0.3) * 0.8;
    });
  }
  // la V4 : un dessin simple en attendant le modèle (ou si le modèle ne vient pas)
  if (theme === "marais") for (let k = 0; k < 9; k++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.5, 8), plastique(0xfff1d6));
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb347 }));
    f.position.y = 0.38;
    b.add(f);
    poser(b, (R() - 0.5) * t.r * 1.4, (R() - 0.5) * t.r * 1.4, 0.25);
    anims.push((s) => { f.scale.setScalar(0.85 + Math.sin(s * 9 + k * 1.7) * 0.15); });
  }
  if (theme === "cristal") for (let k = 0; k < 7; k++) {
    const c = avecContour(new THREE.Mesh(new THREE.OctahedronGeometry(0.7 + R() * 0.9, 0), plastique([0x9be7ff, 0xd7a8ff, 0xffb3d1][k % 3], { emissive: 0x2a2050, shininess: 120 })));
    c.scale.y = 2.2;
    c.rotation.z = (R() - 0.5) * 0.5;
    poser(c, (R() - 0.5) * t.r, (R() - 0.5) * t.r, 1.2);
  }
  if (theme === "epaves") for (let k = 0; k < 4; k++) {
    const c = avecContour(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.7, 3.4, 10, 1, true, 0, Math.PI), plastique(0x5a4a3a, { side: THREE.DoubleSide })));
    c.rotation.set(Math.PI / 2 + (R() - 0.5) * 0.6, R() * 3, 0.5);
    poser(c, (R() - 0.5) * t.r * 1.2, (R() - 0.5) * t.r * 1.2, 0.3);
  }
  if (theme === "horloge") {
    const roue = avecContour(new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.35, 8, 24), plastique(0xc89b4a)));
    roue.rotation.x = Math.PI / 2.4;
    poser(roue, 0, 0, 2.6);
    anims.push((s) => { roue.rotation.z = s * 0.5; });
  }
  if (theme === "geants") for (let k = 0; k < 3; k++) {
    const tete = avecContour(new THREE.Mesh(new THREE.SphereGeometry(1.4, 14, 10), plastique(0x88ad62)));
    tete.scale.set(1, 0.7, 1);
    poser(tete, -4 + k * 4, (R() - 0.5) * 3, 0.4);
  }
  if (theme === "fort") {
    const tour = avecContour(new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 3.2, 10), plastique(0xb9ad94)));
    poser(tour, 0, 0, 1.6);
    for (let k = 0; k < 4; k++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.4, 8), plastique(0x2a2a33)); c.rotation.z = Math.PI / 2; c.rotation.y = (k / 4) * Math.PI * 2; poser(c, Math.cos((k / 4) * Math.PI * 2) * 2, Math.sin((k / 4) * Math.PI * 2) * 2, 2.6); }
  }
  if (theme === "ciel") for (let k = 0; k < 4; k++) {
    const n = nuageBoule();
    n.scale.set(1.6, 0.7, 1.4);
    poser(n, (R() - 0.5) * 6, (R() - 0.5) * 6, -0.6);
  }
  if (theme === "tresor") {
    const coffre = new THREE.Group();
    const caisse = avecContour(new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 1.2), plastique(0x8a5a2b)));
    caisse.position.y = 0.55;
    const couvercle = avecContour(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.8, 12, 1, false, 0, Math.PI), plastique(0x9b6a35)));
    couvercle.rotation.z = Math.PI / 2;
    couvercle.position.y = 1.1;
    const or = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd36b }));
    or.position.y = 1.25;
    coffre.add(caisse, couvercle, or);
    poser(coffre, 0, 0);
    const croix = new THREE.Group();
    for (const a of [Math.PI / 4, -Math.PI / 4]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.08, 0.6), new THREE.MeshBasicMaterial({ color: 0xc2283a }));
      b.rotation.y = a;
      croix.add(b);
    }
    poser(croix, 0, 2.6, 0.06);
    anims.push((s) => { or.material.color.setHSL(0.12, 1, 0.6 + Math.sin(s * 5) * 0.1); });
  }
}

// ---------- le navire de la commu : un petit navire-jouet aux couleurs de Barhaw (dessin original) ----------
function voile(l, h, texture) {
  const g = new THREE.PlaneGeometry(l, h, 12, 8);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) / l + 0.5;
    const v = p.getY(i) / h + 0.5;
    p.setZ(i, Math.sin(u * Math.PI) * Math.sin(v * Math.PI * 0.9 + 0.15) * 0.45);
  }
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshPhongMaterial({ map: texture, side: THREE.DoubleSide, shininess: 10 }));
}
function navireJouet() {
  const g = new THREE.Group();
  const bois = plastique(0x7a3b2e);
  const rose = plastique(0xff4f9a);
  const coque = avecContour(new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bois), 1.05);
  coque.scale.set(2.7, 1.35, 1.3);
  coque.position.y = 0.55;
  const liseret = new THREE.Mesh(new THREE.TorusGeometry(1, 0.09, 8, 40), rose);
  liseret.rotation.x = Math.PI / 2;
  liseret.scale.set(2.7, 1.3, 1);
  liseret.position.y = 0.58;
  const pont = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.12, 28), plastique(0xd2a676));
  pont.scale.set(2.55, 1, 1.2);
  pont.position.y = 0.58;
  const chateau = avecContour(new THREE.Mesh(new THREE.BoxGeometry(1.3, 1, 2), plastique(0x8f4a35)));
  chateau.position.set(-1.9, 1.05, 0);
  const toitChateau = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.15, 2.15), rose);
  toitChateau.position.set(-1.9, 1.6, 0);
  g.add(coque, liseret, pont, chateau, toitChateau);
  for (const z of [-0.55, 0, 0.55]) {
    const fen = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.32), new THREE.MeshBasicMaterial({ color: 0xffe08a }));
    fen.position.set(-2.56, 1.1, z);
    fen.rotation.y = -Math.PI / 2;
    g.add(fen);
  }
  // le beaupré et l'étoile dorée à la proue
  const beaupre = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 2, 8), plastique(0x6b4226));
  beaupre.rotation.z = -1.2;
  beaupre.position.set(3.1, 1.25, 0);
  const forme = new THREE.Shape();
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + Math.PI / 2;
    const r = k % 2 ? 0.2 : 0.45;
    if (k) forme.lineTo(Math.cos(a) * r, Math.sin(a) * r); else forme.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const etoile = avecContour(new THREE.Mesh(new THREE.ExtrudeGeometry(forme, { depth: 0.15, bevelEnabled: false }), plastique(0xffd36b, { shininess: 90, specular: 0xffffff })), 1.12);
  etoile.rotation.y = Math.PI / 2;
  etoile.position.set(2.75, 0.95, -0.07);
  g.add(beaupre, etoile);
  // les canons
  for (const z of [-1.2, 1.2]) for (const x of [-0.4, 0.8]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.6, 10), plastique(0x2a2a33));
    c.rotation.x = Math.PI / 2;
    c.position.set(x, 0.75, z * 1.02);
    g.add(c);
  }
  // le mât, la vigie, les voiles et le drapeau
  const mat = avecContour(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 5.4, 10), plastique(0x6b4226)), 1.25);
  mat.position.set(0.3, 3.2, 0);
  const vigie = avecContour(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.4, 12), plastique(0x8f4a35)));
  vigie.position.set(0.3, 5.2, 0);
  const tissu = toile(256, 192, (x, l, h) => {
    x.fillStyle = "#fbf1df";
    x.fillRect(0, 0, l, h);
    x.strokeStyle = "rgba(160,120,80,.18)";
    x.lineWidth = 3;
    for (let k = 1; k < 6; k++) { x.beginPath(); x.moveTo((k * l) / 6, 0); x.lineTo((k * l) / 6, h); x.stroke(); }
    x.fillStyle = "#ff4f9a";
    x.beginPath(); x.arc(l / 2, h / 2, 58, 0, Math.PI * 2); x.fill();
    x.lineWidth = 8; x.strokeStyle = "#7a1f4d"; x.stroke();
    x.fillStyle = "#fff6fb";
    x.font = "900 86px 'Dela Gothic One', Arial Black, sans-serif";
    x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText("B", l / 2, h / 2 + 4);
  });
  const grande = voile(2.9, 2.3, tissu);
  grande.position.set(0.55, 2.75, 0);
  grande.rotation.y = Math.PI / 2;
  const hune = voile(2.1, 1.3, tissu);
  hune.position.set(0.5, 4.35, 0);
  hune.rotation.y = Math.PI / 2;
  hune.scale.set(1, 1, 0.8);
  const vergues = [2.75 + 1.15, 4.35 + 0.65].map((y) => { const v = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.1, 6), plastique(0x6b4226)); v.rotation.x = Math.PI / 2; v.position.set(0.32, y, 0); return v; });
  const flamme = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.5, 8, 1), new THREE.MeshLambertMaterial({ map: toile(128, 64, (x, l, h) => { const d = x.createLinearGradient(0, 0, l, 0); d.addColorStop(0, "#ff4f9a"); d.addColorStop(1, "#9b4dff"); x.fillStyle = d; x.fillRect(0, 0, l, h); }), side: THREE.DoubleSide }));
  flamme.position.set(-0.25, 5.75, 0);
  g.add(mat, vigie, grande, hune, flamme, ...vergues);
  // les lanternes
  for (const z of [-0.8, 0.8]) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd36b }));
    l.position.set(-2.55, 1.85, z);
    g.add(l);
  }
  g.userData = {
    grande, hune, flamme,
    animer(s, vent) {
      grande.scale.z = vent + Math.sin(s * 2.2) * 0.06;
      hune.scale.z = 0.8 * vent;
      flamme.rotation.y = Math.sin(s * 5) * 0.4;
    },
  };
  return g;
}

// ---------- les modèles faits dans Blender (outils/blender) ----------
// Les fichiers .glb sont compactés par outils/blender/compacter_glb.py ; ce petit lecteur sait les relire
// (pas de chargeur externe : la page n'accepte que ses propres scripts). Les matières sont celles du site,
// retrouvées par leur nom ; les objets disent eux-mêmes comment ils bougent (les « extras » du glTF).
const COULEURS = {
  bois: 0x7a3b2e, bois2: 0x683025, bois_fonce: 0x4a2219, bois_clair: 0xd2a676, planche: 0x9a6a40, rose: 0xff4f9a, rose_pale: 0xffb3d1,
  violet: 0x9b4dff, violet_fonce: 0x5e2bb0, prune: 0x5b1f4a, or: 0xffd36b, creme: 0xfbf1df, blanc: 0xffffff, rouge: 0xe0533c,
  rouge_fonce: 0xc2283a, jaune: 0xffb347, orange: 0xff8a3d, vert: 0x5fa646, vert_clair: 0x8fcf5f, vert_fonce: 0x3f7a35, feuille: 0x4f9e4a,
  pierre: 0xa39a8c, pierre_fonce: 0x6b6258, roche_noire: 0x3b3236, neige: 0xf4f8ff, glace: 0xbfe6ff, lave: 0xff6a1a, fer: 0x2a2a33,
  corde: 0xc9a66b, lumiere: 0xfff1a8, eau: 0x6fb0c8, turquoise: 0x3fd0c9, luciole: 0xfff27a, gres: 0xd98a4a, paille: 0xe8c66a,
  feu: 0xff9a1f, eau_douce: 0x5fd0d8, corail: 0xff7a8a, noir: 0x1f1a22, sable: 0xe9cf98, gris: 0x8a8796, champi_pied: 0xf6ead2,
  mirage: 0xffe3f0, pois: 0xffffff, ecaille: 0x7a3fd6, nuit: 0x2c2f7a, astre: 0xa8f0ff, vitre: 0xffd27a,
  fanion_rose: 0xff4f9a, fanion_or: 0xffc23d, fanion_violet: 0x9b4dff, fanion_turquoise: 0x2fd3c4, fanion_creme: 0xfff1d6,
  cuivre: 0xc8743a, laiton: 0xd9b45a, mousse: 0x5f7a3a, vase: 0x5a5236, spectre: 0x8affc8, os: 0xf0e6cc, cristal: 0xd7b8ff, ocean: 0x4a6aa0, dauphin: 0x8aa2c4, ventre: 0xffb3d1, ventouse: 0xffc6dc, tache: 0x5a2aa8, verre: 0x5fd39a, voile: 0xfbf1df, voile_b: 0xfbf1df, drapeau: 0xff4f9a, flamme: 0xff4f9a,
};
const BRILLANTS = new Set(["lumiere", "luciole", "lave", "feu", "spectre", "astre", "vitre"]);
const FANIONS = ["fanion_rose", "fanion_or", "fanion_violet", "fanion_turquoise", "fanion_creme"]; // les drapeaux de la mer en fête : une épaisseur de toile
const DEUX_FACES = new Set(["feuille", "voile", "voile_b", "drapeau", "flamme", "corde", ...FANIONS]);
const SANS_CONTOUR = new Set(["pois", "ventouse", "tache", "verre", "corde", "feuille", "glace", "cristal", "spectre", "eau", "eau_douce", "voile", "voile_b", "drapeau", "flamme", "lumiere", "luciole", "feu", "lave", "astre", "vitre", ...FANIONS]);
const TYPES_GLB = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const MAX_GLB = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 };
const COMPOSANTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

// Chaque .glb a sa version compressée à côté (<nom>.glbz, outils/blender/compresser_glb.py : environ 4 fois plus légère,
// sans perte). Le navigateur qui sait décompresser (DecompressionStream) la prend ; les autres lisent le .glb.
const TYPES_FILTRE = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array };
async function telechargerGLB(url) {
  if (typeof DecompressionStream === "function" && /\.glb$/.test(url)) {
    try {
      const r = await fetch(`${url}z`);
      if (r.ok && r.body) return await new Response(r.body.pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
    } catch {}
  }
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} : ${r.status}`);
  return r.arrayBuffer();
}
// le chemin inverse de compresser_glb.py : les octets rangés par plans reviennent à leur place, puis chaque valeur
// redevient la somme des écarts (même arithmétique que Python : elle « boucle » comme les entiers du fichier)
function defiltrerGLB(g, bin) {
  for (const a of g.accessors || []) {
    const v = g.bufferViews[a.bufferView];
    const T = TYPES_FILTRE[a.componentType];
    if (!T) continue;
    const taille = T.BYTES_PER_ELEMENT;
    const pas = v.byteStride || taille * COMPOSANTS[a.type];
    const cols = pas / taille;
    const n = a.count;
    const debut = (v.byteOffset || 0) + (a.byteOffset || 0);
    const plans = new Uint8Array(bin, debut, n * pas).slice();
    const octets = new Uint8Array(bin, debut, n * pas);
    for (let o = 0; o < taille; o++) for (let c = 0; c < cols; c++) {
      const base = (o * cols + c) * n;
      for (let i = 0; i < n; i++) octets[i * pas + c * taille + o] = plans[base + i];
    }
    const x = new T(bin, debut, n * cols);
    for (let i = cols; i < x.length; i++) x[i] += x[i - cols];
  }
}
async function lireGLB(url) {
  const buf = await telechargerGLB(url);
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error(`${url} : pas un .glb`);
  const lj = dv.getUint32(12, true);
  const g = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, lj)));
  const lb = dv.getUint32(20 + lj, true);
  const bin = buf.slice(28 + lj, 28 + lj + lb);
  if (g.asset?.extras?.filtre === "delta-octets") defiltrerGLB(g, bin);
  // niveau 5 : une matière « atlas_… » veut dire que les couleurs et la lumière sont dans l'image du même nom (.webp)
  const atlas = (g.materials || []).some((m) => /^atlas/.test(m.name || "")) ? await lireAtlas(url.replace(/\.glb$/, ".webp")) : null;
  // les modèles V4 (ile-<id>-v4.glb, navire-<commu>.glb, maitre-<île>.glb, fantome.glb) ont leur lumière cuite
  return { g, bin, atlas, cuit: /(-v4|navire-[a-z0-9]{2,20}|maitre-[a-z]{2,20}|fantome)(-leger)?\.glb$/.test(url) };
}
// ---------- le niveau 5 (démo) : matières riches et lumière de Blender, cuites dans UNE image par modèle (l'atlas) ----------
// Le modèle s'affiche avec cette image telle quelle (pas d'éclairage à calculer : un seul dessin, même sur téléphone).
// Les fenêtres (« vitre ») sont à part : éteintes le jour, elles s'allument avec les lampes (js/grandline-fete.js).
const atlasLus = new Map();
function lireAtlas(url) {
  if (!atlasLus.has(url)) {
    const lu = (async () => {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${url} : ${r.status}`);
      const blob = new Blob([await r.arrayBuffer()], { type: "image/webp" });
      let image;
      if (typeof createImageBitmap === "function") image = await createImageBitmap(blob, { premultiplyAlpha: "none", colorSpaceConversion: "none" });
      else {
        // un vieux navigateur : l'image passe par une adresse « data: » (la page n'accepte pas les adresses « blob: »)
        const adresse = await new Promise((ok, non) => { const l = new FileReader(); l.onload = () => ok(l.result); l.onerror = () => non(new Error(`${url} : illisible`)); l.readAsDataURL(blob); });
        image = await new Promise((ok, non) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => non(new Error(`${url} : image refusée`)); i.src = adresse; });
      }
      const t = new THREE.Texture(image);
      t.flipY = false; // les UV d'un .glb partent du haut de l'image
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.anisotropy = 4;
      t.needsUpdate = true;
      return cine5(new THREE.MeshBasicMaterial({ map: t }));
    })();
    atlasLus.set(url, lu);
    lu.catch(() => atlasLus.delete(url));
  }
  return atlasLus.get(url);
}
// Les faces peintes d'un modèle « niveau 5 » : cuites en blanc dans l'atlas, marquées dans le .glb par une couleur de sommet
// (rouge : la couleur principale de la commu ; vert : la seconde). Ici, la marque devient la vraie couleur, que l'image vient
// multiplier : la peinture garde ainsi le grain du bois et les ombres de Blender.
function teindreZones(geo, theme) {
  const z = geo.getAttribute("color");
  if (!z || geo.userData.teinte) return;
  const c1 = new THREE.Color(theme.c1);
  const c2 = new THREE.Color(theme.c2);
  for (let n = 0; n < z.count; n++) {
    const r = z.getX(n);
    const v = z.getY(n);
    const t = r > 0.5 && v < 0.5 ? c1 : v > 0.5 && r < 0.5 ? c2 : null;
    if (t) z.setXYZ(n, t.r, t.g, t.b);
    else z.setXYZ(n, 1, 1, 1);
  }
  z.needsUpdate = true;
  geo.userData.teinte = true;
}
const atlasTeintes = new WeakMap();
function atlasTeinte(base) {
  if (!atlasTeintes.has(base)) { const m = base.clone(); m.vertexColors = true; cine5(m); atlasTeintes.set(base, m); }
  return atlasTeintes.get(base);
}
let matVitre = null;
function matiereVitre() {
  matVitre ||= new THREE.MeshBasicMaterial({ color: COULEURS.vitre, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  matVitre.visible = matVitre.opacity > 0.01;
  return matVitre;
}
// les fenêtres s'allument avec les lampes (0 : plein jour ; 1 : nuit)
let lampesAllumees = 0;
function allumerVitres(f) {
  const m = matiereVitre();
  lampesAllumees = Math.max(0, Math.min(1, f));
  m.opacity = lampesAllumees;
  m.visible = m.opacity > 0.01;
}
function accesseur(g, bin, i, brut = false) {
  const a = g.accessors[i];
  const v = g.bufferViews[a.bufferView];
  const T = TYPES_GLB[a.componentType];
  const k = COMPOSANTS[a.type];
  const debut = (v.byteOffset || 0) + (a.byteOffset || 0);
  if (brut) return new T(bin, debut, a.count * k);
  const pas = (v.byteStride || T.BYTES_PER_ELEMENT * k) / T.BYTES_PER_ELEMENT;
  const src = new T(bin, debut, pas * (a.count - 1) + k);
  const max = a.normalized ? MAX_GLB[a.componentType] : 1;
  const x = new Float32Array(a.count * k);
  const e = a.extras || {};
  for (let n = 0; n < a.count; n++) {
    for (let c = 0; c < k; c++) {
      let val = Math.max(-1, src[n * pas + c] / max);
      if (e.centre) val = e.centre[c] + val * e.demi[c];
      else if (e.min) val = e.min[c] + val * e.ecart[c];
      x[n * k + c] = val;
    }
  }
  return { x, k, srgb: Boolean(e.srgb) };
}
function geometrieGLB(g, bin, p, sansLumiere = false) {
  const geo = new THREE.BufferGeometry();
  const at = p.attributes;
  geo.setAttribute("position", new THREE.BufferAttribute(accesseur(g, bin, at.POSITION).x, 3));
  if (at.NORMAL !== undefined) {
    const { x } = accesseur(g, bin, at.NORMAL);
    for (let n = 0; n < x.length; n += 3) { const l = Math.hypot(x[n], x[n + 1], x[n + 2]) || 1; x[n] /= l; x[n + 1] /= l; x[n + 2] /= l; }
    geo.setAttribute("normal", new THREE.BufferAttribute(x, 3));
  }
  if (at.COLOR_0 !== undefined) {
    const { x, k, srgb } = accesseur(g, bin, at.COLOR_0);
    const c = new Float32Array((x.length / k) * 3);
    for (let n = 0; n < x.length / k; n++) for (let j = 0; j < 3; j++) { const v = x[n * k + j]; c[n * 3 + j] = srgb ? v : v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; }
    geo.setAttribute("color", new THREE.BufferAttribute(c, 3));
  }
  if (at.TEXCOORD_0 !== undefined) geo.setAttribute("uv", new THREE.BufferAttribute(accesseur(g, bin, at.TEXCOORD_0).x, 2));
  if (p.indices !== undefined) geo.setIndex(new THREE.BufferAttribute(accesseur(g, bin, p.indices, true), 1));
  if (at.NORMAL === undefined && !sansLumiere) geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}
function noeudGLB(g, bin, i) {
  const n = g.nodes[i];
  let o;
  if (n.mesh !== undefined) {
    const prims = g.meshes[n.mesh].primitives.map((p) => {
      const matiere = String(g.materials?.[p.material]?.name || "").split(".")[0];
      const m = new THREE.Mesh(geometrieGLB(g, bin, p, matiere.startsWith("atlas") || matiere === "vitre"));
      m.userData.matiere = matiere;
      return m;
    });
    if (prims.length === 1) o = prims[0];
    else { o = new THREE.Group(); o.add(...prims); }
  } else o = new THREE.Group();
  o.name = n.name || "";
  Object.assign(o.userData, n.extras || {});
  if (n.translation) o.position.fromArray(n.translation);
  if (n.rotation) o.quaternion.fromArray(n.rotation);
  if (n.scale) o.scale.fromArray(n.scale);
  for (const c of n.children || []) o.add(noeudGLB(g, bin, c));
  return o;
}
function sceneGLB({ g, bin, atlas = null }) {
  const racine = new THREE.Group();
  for (const i of g.scenes[g.scene || 0].nodes) racine.add(noeudGLB(g, bin, i));
  racine.userData.atlas = atlas; // niveau 5 : habiller() s'en sert
  return racine;
}
// le contour à l'encre : la même forme, gonflée le long des normales, vue de dos
const contours = new Map();
function matiereContour(ep) {
  if (!contours.has(ep)) {
    const c = new THREE.Color(ENCRE);
    contours.set(ep, new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: { uEp: { value: ep } },
      vertexShader: "uniform float uEp; void main() { vec3 p = position + normalize(normal) * uEp; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }",
      fragmentShader: `void main() { gl_FragColor = vec4(${c.r.toFixed(3)}, ${c.g.toFixed(3)}, ${c.b.toFixed(3)}, 1.0); }`,
    }));
  }
  return contours.get(ep);
}
// les couleurs d'un navire : Barhaw par défaut ; chaque commu de la flotte (V4) a les siennes et son emblème
const hexa = (c, defaut) => (/^#[0-9a-f]{6}$/i.test(String(c || "")) ? String(c).toLowerCase() : defaut);
function melange(a, b, t) {
  const x = parseInt(a.slice(1), 16);
  const y = parseInt(b.slice(1), 16);
  const c = (d) => Math.round(((x >> d) & 255) * (1 - t) + ((y >> d) & 255) * t);
  return `#${((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, "0")}`;
}
function themeNavire(couleurs = {}, embleme = "B", drapeau = "", modele = "") {
  const c1 = hexa(couleurs.principale, "#ff4f9a");
  const c2 = hexa(couleurs.secondaire, "#9b4dff");
  const e = String(embleme || "B").replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2).toUpperCase() || "B";
  // le vrai drapeau de la commu (une image du site) : en haut du grand mât et au milieu de la grande voile
  const d = /^(\/|https:\/\/|img\/)[\w./:-]+\.(webp|png|jpg)$/i.test(String(drapeau || "")) ? String(drapeau) : "";
  // le navire V4 de la commu (navire-<id>.glb), s'il existe ; sinon le navire de base
  const m = /^navire-[a-z0-9]{2,20}\.glb$/.test(String(modele || "")) ? String(modele) : "navire.glb";
  return { cle: `${c1}${c2}${e}${d}${m}`, c1, c2, fonce: melange(c1, "#12050d", 0.55), embleme: e, drapeau: d, modele: m };
}
const THEME_BARHAW = themeNavire();
// les toiles du navire et les drapeaux (dessinées ici ; les UV viennent de Blender)
const toiles = {};
function toileGLB(nom, theme = THEME_BARHAW) {
  const cle = `${nom}|${theme.cle}`;
  if (toiles[cle]) return toiles[cle];
  const { c1, c2, fonce, embleme } = theme;
  const lettre = (x, taille, l, y) => { x.font = `900 ${embleme.length > 1 ? Math.round(taille * 0.7) : taille}px 'Dela Gothic One', Arial Black, sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; return [l / 2, y]; };
  const voileDessin = (avecEmbleme) => (x, l, h) => {
    x.fillStyle = "#fbf1df";
    x.fillRect(0, 0, l, h);
    x.strokeStyle = "rgba(160,120,80,.18)";
    x.lineWidth = 4;
    for (let k = 1; k < 8; k++) { x.beginPath(); x.moveTo((k * l) / 8, 0); x.lineTo((k * l) / 8, h); x.stroke(); }
    // l'usure (V4, navires de la flotte) : des taches d'eau salée et des pièces rapportées, cousues
    const R = hasard(l + h + (avecEmbleme ? 7 : 3));
    for (let k = 0; k < (theme === THEME_BARHAW ? 0 : 7); k++) {
      const g = x.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, "rgba(150,118,80,.2)"); g.addColorStop(1, "rgba(150,118,80,0)");
      x.save(); x.translate(R() * l, R() * h * 0.85); x.scale(30 + R() * 70, 20 + R() * 50); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 1, 0, Math.PI * 2); x.fill(); x.restore();
    }
    for (let k = 0; k < (theme === THEME_BARHAW ? 0 : 2); k++) {
      const [px, py, pw, ph] = [40 + R() * (l - 140), 30 + R() * (h - 150), 50 + R() * 40, 40 + R() * 30];
      x.fillStyle = k ? "#efe0c2" : "#f6e9cf"; x.fillRect(px, py, pw, ph);
      x.strokeStyle = "rgba(120,90,60,.55)"; x.lineWidth = 2; x.setLineDash([6, 5]); x.strokeRect(px + 4, py + 4, pw - 8, ph - 8); x.setLineDash([]);
    }
    x.fillStyle = "#ffd36b";
    x.fillRect(0, h - 44, l, 8);
    x.fillStyle = c1;
    x.fillRect(0, h - 34, l, 34);
    if (!avecEmbleme) return;
    x.fillStyle = c1;
    x.beginPath(); x.arc(l / 2, h / 2 - 14, 104, 0, Math.PI * 2); x.fill();
    x.lineWidth = 12; x.strokeStyle = fonce; x.stroke();
    x.lineWidth = 6; x.strokeStyle = "#ffd36b";
    x.beginPath(); x.arc(l / 2, h / 2 - 14, 84, 0, Math.PI * 2); x.stroke();
    const [cx, cy] = lettre(x, 150, l, h / 2 - 8);
    x.lineWidth = 10; x.strokeStyle = fonce; x.strokeText(embleme, cx, cy);
    x.fillStyle = "#fff6fb"; x.fillText(embleme, cx, cy);
  };
  const dessins = {
    voile_b: [512, 384, voileDessin(true)],
    voile: [512, 384, voileDessin(false)],
    drapeau: [512, 320, (x, l, h) => {
      x.fillStyle = c1; x.fillRect(0, 0, l, h);
      x.fillStyle = c2; x.beginPath(); x.moveTo(0, h); x.lineTo(l, h * 0.55); x.lineTo(l, h); x.closePath(); x.fill();
      x.beginPath();
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5; const r = k % 2 ? 52 : 120; x.lineTo(l / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r); }
      x.closePath(); x.fillStyle = "#ffd36b"; x.fill(); x.lineWidth = 8; x.strokeStyle = fonce; x.stroke();
      const [cx, cy] = lettre(x, 78, l, h / 2 + 10);
      x.fillStyle = fonce; x.fillText(embleme, cx, cy);
    }],
    flamme: [256, 32, (x, l, h) => { const d = x.createLinearGradient(0, 0, l, 0); d.addColorStop(0, c1); d.addColorStop(1, c2); x.fillStyle = d; x.fillRect(0, 0, l, h); }],
  };
  const [l, h, f] = dessins[nom];
  const t = toile(l, h, f);
  t.flipY = false;
  toiles[cle] = t;
  // le drapeau de la commu, dessiné par-dessus dès qu'il est chargé (sinon : l'emblème reste)
  if (theme.drapeau && (nom === "drapeau" || nom === "voile_b")) {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      const x = t.image.getContext("2d");
      if (nom === "drapeau") {
        x.fillStyle = "#0b0b0b";
        x.fillRect(0, 0, l, h);
        const s = Math.max(l / img.width, h / img.height);
        x.drawImage(img, (l - img.width * s) / 2, (h - img.height * s) / 2, img.width * s, img.height * s);
      } else {
        const r = 104;
        x.save();
        x.beginPath(); x.arc(l / 2, h / 2 - 14, r, 0, Math.PI * 2); x.closePath();
        x.fillStyle = "#0b0b0b"; x.fill(); x.clip();
        x.drawImage(img, l / 2 - r * 1.08, h / 2 - 14 - r * 1.08, r * 2.16, r * 2.16);
        x.restore();
        x.lineWidth = 12; x.strokeStyle = fonce; x.beginPath(); x.arc(l / 2, h / 2 - 14, r, 0, Math.PI * 2); x.stroke();
      }
      t.needsUpdate = true;
    };
    img.src = theme.drapeau;
  }
  return t;
}

// ---------- la traînée d'un navire de la flotte (V4) : ce qui tombe du bateau et traîne derrière lui ----------
// petales : des pétales de cerisier qui tombent des voiles, tourbillonnent et flottent dans le sillage ;
// pieces : des pièces d'or au V qui tombent du pont, brillent, rebondissent sur l'eau et coulent ;
// encre : des bulles d'encre qui s'étalent dans le sillage ;
// pieuvres : des petites pieuvres roses qui sautent du pont, font plouf, nagent un peu dans le sillage puis plongent.
// Peu de particules (moitié moins sur un petit écran).
let textures = null;
function texturesTrainee() {
  if (textures) return textures;
  const petale = toile(64, 64, (x) => {
    const d = x.createLinearGradient(0, 0, 64, 64);
    d.addColorStop(0, "#ffe1ef"); d.addColorStop(1, "#ff8cc0");
    x.fillStyle = d;
    x.beginPath(); x.moveTo(32, 60); x.bezierCurveTo(4, 42, 6, 10, 24, 6); x.lineTo(32, 14); x.lineTo(40, 6); x.bezierCurveTo(58, 10, 60, 42, 32, 60); x.fill();
    x.strokeStyle = "rgba(194,40,110,.55)"; x.lineWidth = 2; x.stroke();
  });
  const piece = toile(64, 64, (x) => {
    x.fillStyle = "#ffcf4a"; x.fillRect(0, 0, 64, 64);
    x.strokeStyle = "#a8741a"; x.lineWidth = 5; x.beginPath(); x.arc(32, 32, 25, 0, Math.PI * 2); x.stroke();
    x.font = "900 34px 'Dela Gothic One', Arial Black, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillStyle = "#a8741a"; x.fillText("V", 32, 35);
  });
  textures = { petale, piece };
  return textures;
}
// ---------- une petite pieuvre-jouet en 3D (dessin original) : tête ronde, deux yeux, six tentacules enroulés ----------
// un tube qui s'affine (un tentacule), fait comme le TubeGeometry de three.js, avec un bout arrondi
function tubeEffile(courbe, segs, radial, r0, r1) {
  const cadres = courbe.computeFrenetFrames(segs, false);
  const pos = [];
  const nor = [];
  const idx = [];
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    courbe.getPointAt(i / segs, p);
    const r = r0 + (r1 - r0) * (i / segs);
    const N = cadres.normals[i];
    const B = cadres.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const v = (j / radial) * Math.PI * 2;
      const sn = Math.sin(v);
      const cs = -Math.cos(v);
      n.set(cs * N.x + sn * B.x, cs * N.y + sn * B.y, cs * N.z + sn * B.z).normalize();
      nor.push(n.x, n.y, n.z);
      pos.push(p.x + r * n.x, p.y + r * n.y, p.z + r * n.z);
    }
  }
  for (let i = 1; i <= segs; i++) {
    for (let j = 1; j <= radial; j++) {
      const a = (radial + 1) * (i - 1) + (j - 1);
      const b = (radial + 1) * i + (j - 1);
      const c = (radial + 1) * i + j;
      const d = (radial + 1) * (i - 1) + j;
      idx.push(a, b, d, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}
// des morceaux de couleurs différentes en une seule forme (une seule copie par pieuvre à dessiner)
function fusionner(morceaux) {
  const pos = [];
  const nor = [];
  const col = [];
  const idx = [];
  for (const { g, c } of morceaux) {
    const base = pos.length / 3;
    const P = g.attributes.position;
    const N = g.attributes.normal;
    for (let k = 0; k < P.count; k++) { pos.push(P.getX(k), P.getY(k), P.getZ(k)); nor.push(N.getX(k), N.getY(k), N.getZ(k)); col.push(c.r, c.g, c.b); }
    if (g.index) for (let k = 0; k < g.index.count; k++) idx.push(base + g.index.getX(k));
    else for (let k = 0; k < P.count; k++) idx.push(base + k);
    g.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}
// la pieuvre debout sur l'eau, regard vers +z ; environ 1,3 de large et 0,9 de haut
function geoPieuvre(petit) {
  const C = (h) => new THREE.Color(h);
  const ROSE = C(0xff62a6);
  const TACHE = C(0xc9246f);
  const NOIR = C(0x0a0206);
  const BLANC = C(0xffffff);
  const JOUE = C(0xff2f86);
  const m = [];
  const boule = (r, x, y, z, couleur, sx = 1, sy = 1, sz = 1, l = 10, h = 8) => {
    const g = new THREE.SphereGeometry(r, l, h);
    g.scale(sx, sy, sz);
    g.translate(x, y, z);
    m.push({ g, c: couleur });
  };
  // la tête, un peu plus haute que large, penchée vers l'arrière comme une vraie pieuvre
  const placerTete = (g) => { g.scale(1, 1.12, 1); g.rotateX(-0.22); g.translate(0, 0.5, -0.03); return g; };
  m.push({ g: placerTete(new THREE.SphereGeometry(0.36, petit ? 12 : 16, petit ? 9 : 12)), c: ROSE });
  // des taches sur le haut et l'arrière de la tête : de petites boules à peine sorties de la peau
  for (const [x, y, z, r] of [[0.3, 0.85, -0.1, 0.06], [-0.35, 0.75, -0.4, 0.05], [0.05, 0.55, -0.85, 0.055], [-0.62, 0.45, 0.2, 0.045], [0.55, 0.35, -0.55, 0.05]]) {
    const d = new THREE.Vector3(x, y, z).normalize().multiplyScalar(0.36 - r * 0.72);
    m.push({ g: placerTete(new THREE.SphereGeometry(r, 8, 6).translate(d.x, d.y, d.z)), c: TACHE });
  }
  // les yeux : deux gros points noirs avec un reflet, et les joues
  for (const s of [-1, 1]) {
    boule(0.075, s * 0.13, 0.46, 0.31, NOIR, 1, 1.3, 0.55);
    boule(0.026, s * 0.13 + 0.025, 0.5, 0.35, BLANC, 1, 1, 0.6, 6, 5);
    boule(0.05, s * 0.24, 0.36, 0.27, JOUE, 1, 0.6, 0.4, 8, 5);
  }
  // six tentacules qui partent sous la tête, s'étalent sur l'eau et s'enroulent vers le haut au bout
  const profil = [[0.12, 0.3], [0.28, 0.1], [0.46, 0.04], [0.6, 0.1], [0.66, 0.24], [0.58, 0.32], [0.5, 0.27]];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
    const tord = k % 2 ? 0.09 : -0.09; // chaque tentacule tourne un peu sur le côté
    const pts = profil.map(([r, y], i) => {
      const b = a + tord * (i / (profil.length - 1)) * 2;
      return new THREE.Vector3(Math.sin(b) * r, y, Math.cos(b) * r);
    });
    const courbe = new THREE.CatmullRomCurve3(pts);
    m.push({ g: tubeEffile(courbe, petit ? 9 : 14, petit ? 5 : 7, 0.1, 0.032), c: ROSE });
    const bout = courbe.getPointAt(1);
    boule(0.034, bout.x, bout.y, bout.z, ROSE, 1, 1, 1, 6, 5);
  }
  return fusionner(m);
}
// le contour à l'encre, pour des formes copiées (InstancedMesh)
let contourCopies = null;
function matiereContourCopies() {
  const c = new THREE.Color(ENCRE);
  contourCopies ||= new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: "void main() { vec3 p = position + normalize(normal) * 0.035; vec4 m = vec4(p, 1.0);\n#ifdef USE_INSTANCING\n m = instanceMatrix * m;\n#endif\n gl_Position = projectionMatrix * modelViewMatrix * m; }",
    fragmentShader: `void main() { gl_FragColor = vec4(${c.r.toFixed(3)}, ${c.g.toFixed(3)}, ${c.b.toFixed(3)}, 1.0); }`,
  });
  return contourCopies;
}
function creerTrainee(type, scene, petit) {
  const n = petit ? 14 : 28;
  let geo;
  let mat;
  if (type === "pieces") {
    const t = texturesTrainee().piece;
    geo = new THREE.CylinderGeometry(0.42, 0.42, 0.09, 16);
    const face = new THREE.MeshPhongMaterial({ map: t, emissive: 0x6a4500, emissiveMap: t, shininess: 110, specular: 0xffffff });
    mat = [new THREE.MeshPhongMaterial({ color: 0xe8a92a, emissive: 0x5a3a00, shininess: 110, specular: 0xffffff }), face, face];
  } else if (type === "pieuvres") {
    geo = geoPieuvre(petit);
    mat = retoucher(new THREE.MeshLambertMaterial({ vertexColors: true }), { cuit: true }); // un peu de lumière propre : du rose qui reste doux à l'ombre, des yeux bien noirs
  } else if (type === "petales") {
    geo = new THREE.PlaneGeometry(0.62, 0.62);
    mat = new THREE.MeshBasicMaterial({ map: texturesTrainee().petale, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, depthWrite: false });
  } else {
    geo = new THREE.SphereGeometry(0.38, 10, 7);
    mat = new THREE.MeshBasicMaterial({ color: type === "encre" ? 0x4a2a78 : 0xffffff, transparent: true, opacity: type === "encre" ? 0.75 : 0.6, depthWrite: false });
  }
  const im = new THREE.InstancedMesh(geo, mat, n);
  im.frustumCulled = false;
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(im);
  // les pieuvres : un trait d'encre autour (les mêmes copies, vues de dos et gonflées), et des roses un peu différents
  let trait = null;
  if (type === "pieuvres") {
    trait = new THREE.InstancedMesh(geo, matiereContourCopies(), n);
    trait.instanceMatrix = im.instanceMatrix;
    trait.frustumCulled = false;
    scene.add(trait);
    const teintes = [0xffffff, 0xffe4f0, 0xf3dcff].map((h) => new THREE.Color(h));
    for (let k = 0; k < n; k++) im.setColorAt(k, teintes[k % 3]);
    im.instanceColor.needsUpdate = true;
  }
  const parts = Array.from({ length: n }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), age: 99, vie: 1, r: new THREE.Euler(), rv: new THREE.Vector3(), eau: false, k: Math.random() * 10 }));
  const o = new THREE.Object3D();
  const cadence = type === "pieces" ? 0.42 : type === "petales" ? 0.2 : type === "pieuvres" ? 0.55 : 0.35;
  let t = 0;
  let prochain = 0;
  return {
    type,
    maj(dt, porteur) {
      t += dt;
      const ry = porteur.rotation.y;
      const fx = Math.cos(ry);
      const fz = -Math.sin(ry);
      const lateral = (m) => v3(-fz * m, fx * m);
      if (t >= prochain) {
        prochain = t + cadence * (0.6 + Math.random() * 0.8);
        const q = parts.find((x) => x.age >= x.vie);
        if (q) {
          const a = Math.random();
          q.age = 0;
          q.eau = false;
          q.p.copy(porteur.position);
          if (type === "petales") {
            q.p.add(lateral((a - 0.5) * 3.2)).add(v3(fx * (Math.random() * 3 - 1.5), fz * (Math.random() * 3 - 1.5), 5 + Math.random() * 4));
            q.v.set(-fx * 1.6, -0.5, -fz * 1.6).add(lateral((Math.random() - 0.5) * 1.2));
            q.vie = 7;
          } else if (type === "pieces") {
            const cote = a < 0.5 ? -1 : 1;
            q.p.add(lateral(cote * 1.7)).add(v3(fx * (Math.random() * 2.4 - 1.2), fz * (Math.random() * 2.4 - 1.2), 2.2));
            q.v.set(-fx * 1.2, 3.4 + Math.random(), -fz * 1.2).add(lateral(cote * 1.3));
            q.vie = 4.6;
          } else if (type === "pieuvres") {
            // elle saute par-dessus le bastingage et retombe à l'eau bien à côté de la coque (sinon on ne la voit pas)
            q.cote = a < 0.5 ? -1 : 1;
            q.p.add(lateral(q.cote * 2)).add(v3(fx * (Math.random() * 3 - 2), fz * (Math.random() * 3 - 2), 2.6));
            q.v.set(-fx * 0.9, 4.2 + Math.random() * 1.2, -fz * 0.9).add(lateral(q.cote * (2.6 + Math.random() * 0.8)));
            q.vie = 7 + Math.random() * 2;
            q.cap = Math.random() * Math.PI * 2;
          } else {
            q.p.add(v3(-fx * 4, -fz * 4, 0.15)).add(lateral((a - 0.5) * 2));
            q.v.set(-fx * 0.7, 0, -fz * 0.7);
            q.vie = 5;
          }
          q.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
          q.rv.set((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);
        }
      }
      parts.forEach((q, k) => {
        let s = 0;
        if (q.age < q.vie) {
          q.age += dt;
          const fin = Math.max(0, Math.min(1, (q.vie - q.age) / 1.2));
          if (type === "petales") {
            if (!q.eau) {
              q.v.y = Math.max(q.v.y - dt * 0.5, -1.1);
              q.v.x += Math.sin(t * 2.2 + q.k) * dt * 1.4;
              q.v.z += Math.cos(t * 1.8 + q.k) * dt * 1.4;
              q.p.addScaledVector(q.v, dt);
              q.r.x += q.rv.x * dt; q.r.y += q.rv.y * dt; q.r.z += q.rv.z * dt;
              if (q.p.y <= 0.14) { q.eau = true; q.p.y = 0.14; q.r.set(-Math.PI / 2, 0, q.r.z); }
            } else {
              q.p.x -= fx * 0.35 * dt;
              q.p.z -= fz * 0.35 * dt;
              q.p.y = 0.14 + Math.sin(t * 2 + q.k) * 0.04;
              q.r.z += dt * 0.4;
            }
            s = fin;
          } else if (type === "pieces") {
            if (!q.eau) {
              q.v.y -= 9.8 * dt;
              q.p.addScaledVector(q.v, dt);
              if (q.p.y <= 0.12) {
                if (q.v.y < -2.5) { q.p.y = 0.12; q.v.y = -q.v.y * 0.42; q.v.x *= 0.5; q.v.z *= 0.5; } // un rebond sur l'eau
                else { q.eau = true; q.v.set(0, -0.55, 0); }
              }
            } else q.p.addScaledVector(q.v, dt); // elle coule
            q.r.x = 0.35; q.r.y += dt * 9; q.r.z = 0;
            s = q.p.y > -0.2 ? 1 : Math.max(0, 1 + (q.p.y + 0.2) * 1.4);
          } else if (type === "pieuvres") {
            if (!q.eau) {
              // le saut : elle fait la roue en l'air, tentacules écartés
              q.v.y -= 9.8 * dt;
              q.p.addScaledVector(q.v, dt);
              q.r.x += q.rv.x * dt; q.r.z += q.rv.z * dt;
              if (q.p.y <= -0.08 && q.v.y < 0) { q.eau = true; q.p.y = -0.08; q.v.set(-fx * 0.5, 0, -fz * 0.5).add(lateral(q.cote * (0.25 + Math.random() * 0.3))); q.r.set(0, q.cap, 0); }
              s = Math.min(1, q.age * 5);
            } else {
              // dans l'eau : elle se redresse, flotte, nage par petites poussées, puis plonge
              const pousse = Math.max(0, Math.sin(t * 5 + q.k));
              q.p.addScaledVector(q.v, dt * (0.4 + pousse * 1.6));
              const plonge = Math.max(0, 1.4 - (q.vie - q.age));
              q.p.y = -0.08 + Math.sin(t * 2.4 + q.k) * 0.05 - plonge * 0.7;
              q.r.x = Math.sin(t * 2 + q.k) * 0.12;
              q.r.z = Math.cos(t * 1.7 + q.k) * 0.12;
              q.r.y = q.cap + Math.sin(t * 0.8 + q.k) * 0.5;
              s = 1;
            }
            s *= Math.min(1, (q.vie - q.age) / 0.6) * 1.5;
          } else {
            q.p.addScaledVector(q.v, dt);
            q.v.multiplyScalar(1 - dt * 0.5);
            s = Math.min(1, q.age * 2) * (1 + q.age * 0.35) * fin;
            q.r.set(0, 0, 0);
          }
        }
        o.position.copy(q.p);
        o.rotation.copy(q.r);
        if (type === "encre") o.scale.set(s, s * 0.25, s);
        else if (type === "pieuvres" && q.eau && q.age < q.vie) { const b = Math.sin(t * 5 + q.k); o.scale.set(s * (1 - b * 0.08), s * (1 + b * 0.14), s * (1 - b * 0.08)); }
        else o.scale.setScalar(s);
        o.updateMatrix();
        im.setMatrixAt(k, o.matrix);
      });
      im.instanceMatrix.needsUpdate = true;
    },
    detruire() { scene.remove(im); if (trait) scene.remove(trait); geo.dispose(); },
  };
}
// les matières qui changent avec les couleurs du navire
const THEMEES = new Set(["rose", "violet", "voile", "voile_b", "drapeau", "flamme"]);
const matieres = new Map();
// le grain du bois (V4) : des veines dessinées par la carte graphique, sans texture à charger
const BOIS = new Set(["bois", "bois2", "bois_fonce", "bois_clair", "planche"]);
// les modèles V4 ont leur lumière et leurs ombres cuites dans Blender (couleurs de sommets) : on leur ajoute une part de
// lumière propre, sinon les murs blancs tournés à l'ombre deviennent gris foncé avec l'éclairage de la carte
const CUIT = 0.5;
function retoucher(m, { grain = false, cuit = false } = {}) {
  if (!grain && !cuit) return m;
  m.onBeforeCompile = (s) => {
    if (grain) {
      s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vGrain;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvGrain = position;");
      s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vGrain;").replace("#include <color_fragment>",
        "#include <color_fragment>\nfloat veine = sin(vGrain.x * 34.0 + sin(vGrain.z * 7.0 + vGrain.y * 5.0) * 2.6) * 0.5 + 0.5;\nfloat fin = fract(sin(dot(floor(vGrain * 60.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453);\ndiffuseColor.rgb *= 0.84 + 0.12 * veine + 0.06 * fin;");
    }
    if (cuit) s.fragmentShader = s.fragmentShader.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * ${CUIT.toFixed(2)};`);
  };
  m.customProgramCacheKey = () => `${grain ? "grain" : ""}|${cuit ? "cuit" : ""}`;
  return m;
}
function matiereGLB(nom, theme = THEME_BARHAW, couleursSommets = false, cuit = false) {
  if (couleursSommets && !toileGLB.noms.has(nom) && !BRILLANTS.has(nom)) {
    const cle = `${nom}|${theme.cle}|vc${cuit ? "|cuit" : ""}`;
    if (!matieres.has(cle)) { const m = matiereGLB(nom, theme).clone(); m.vertexColors = true; retoucher(m, { grain: BOIS.has(nom), cuit }); matieres.set(cle, m); }
    return matieres.get(cle);
  }
  const cle = THEMEES.has(nom) && theme !== THEME_BARHAW ? `${nom}|${theme.cle}` : nom;
  if (matieres.has(cle)) return matieres.get(cle);
  const couleur = nom === "rose" && cle !== nom ? parseInt(theme.c1.slice(1), 16) : nom === "violet" && cle !== nom ? parseInt(theme.c2.slice(1), 16) : COULEURS[nom] ?? 0xcccccc;
  let m;
  if (BRILLANTS.has(nom)) m = new THREE.MeshBasicMaterial({ color: couleur });
  else if (nom === "pois") m = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x777777 });
  else if (nom === "glace" || nom === "cristal") m = plastique(couleur, { shininess: 120, specular: 0xffffff, transparent: true, opacity: nom === "cristal" ? 0.78 : 0.86 });
  else if (nom === "eau" || nom === "eau_douce") m = plastique(couleur, { shininess: 100, specular: 0xffffff, transparent: true, opacity: 0.85 });
  else if (nom === "verre") m = plastique(couleur, { shininess: 140, specular: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide });
  else if (nom === "ecaille") m = plastique(couleur, { shininess: 70, specular: 0x6a5a8a });
  else if (toileGLB.noms.has(nom)) m = new THREE.MeshPhongMaterial({ map: toileGLB(nom, theme), emissiveMap: toileGLB(nom, theme), emissive: 0x8a8580, side: THREE.DoubleSide, shininess: 10 });
  else m = plastique(couleur, DEUX_FACES.has(nom) ? { side: THREE.DoubleSide } : {});
  matieres.set(cle, m);
  return m;
}
toileGLB.noms = new Set(["voile", "voile_b", "drapeau", "flamme"]);

// ---------- niveau 5 : le grain de près, la lumière commune, les toiles ----------
// 1 : plein jour ; l'orage assombrit ensemble les modèles cuits et leurs toiles (la nuit, c'est la teinte de la fête qui joue)
const eclairage5 = { value: 1 };
// L'ombre des nuages qui passent, la même pour la mer « cinéma » et pour les îles « niveau 5 » : 1 au soleil, plus sombre
// dessous. p : la position dans le monde (x, z) ; t : l'heure de la scène.
const NUAGES5 = `
  float h5n(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float b5n(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(h5n(i), h5n(i + vec2(1.0, 0.0)), u.x), mix(h5n(i + vec2(0.0, 1.0)), h5n(i + vec2(1.0, 1.0)), u.x), u.y); }
  float nuages5(vec2 p, float t) {
    float n = b5n(p * 0.05 + t * vec2(0.014, 0.007)) * 0.62 + b5n(p * 0.12 - t * vec2(0.009, 0.012)) * 0.38;
    return mix(0.76, 1.0, smoothstep(0.36, 0.6, n));
  }`;
const temps5 = { value: 0 }; // l'heure de la scène, en secondes : le vent, les pas, l'écume, les toiles
// le grain : une petite image de bruit qui se répète, multipliée à l'atlas. De loin elle s'efface toute seule (ses mipmaps
// tendent vers le gris moyen) ; de près elle redonne du piqué aux pavés, au bois, aux tuiles
let detail5 = null;
function textureDetail5() {
  if (detail5) return detail5;
  const T = 256, d = new Uint8Array(T * T * 4), R = hasard(9173);
  const grilles = [[8, 0.26], [32, 0.36], [128, 0.38]].map(([n, poids]) => { const g = new Float32Array(n * n); for (let k = 0; k < g.length; k++) g[k] = R(); return [n, poids, g]; });
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    let v = 0;
    for (const [n, poids, g] of grilles) {
      const fx = (x / T) * n, fy = (y / T) * n, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = g[(iy % n) * n + (ix % n)], b = g[(iy % n) * n + ((ix + 1) % n)], c = g[((iy + 1) % n) * n + (ix % n)], e = g[((iy + 1) % n) * n + ((ix + 1) % n)];
      v += poids * (a + (b - a) * sx + (c - a) * sy + (a - b - c + e) * sx * sy);
    }
    const o = Math.round(255 * Math.min(1, Math.max(0, 0.5 + (v - 0.5) * 1.7)));
    d.set([o, o, o, 255], (y * T + x) * 4);
  }
  detail5 = new THREE.DataTexture(d, T, T, THREE.RGBAFormat);
  detail5.wrapS = detail5.wrapT = THREE.RepeatWrapping;
  detail5.generateMipmaps = true;
  detail5.minFilter = THREE.LinearMipmapLinearFilter;
  detail5.magFilter = THREE.LinearFilter;
  detail5.needsUpdate = true;
  return detail5;
}
// la matière d'un modèle cuit : son image, le grain de près, la lumière commune
function cine5(m) {
  m.onBeforeCompile = (s) => {
    s.uniforms.uEclairage5 = eclairage5;
    s.uniforms.uDetail5 = { value: textureDetail5() };
    s.uniforms.uTemps5 = temps5;
    s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vNuage5;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvNuage5 = (modelMatrix * vec4(transformed, 1.0)).xz;");
    s.fragmentShader = s.fragmentShader.replace("#include <common>", `#include <common>\nuniform float uEclairage5;\nuniform sampler2D uDetail5;\nuniform float uTemps5;\nvarying vec2 vNuage5;${NUAGES5}`)
      .replace("#include <map_fragment>", "#include <map_fragment>\ndiffuseColor.rgb *= (0.87 + 0.26 * texture2D(uDetail5, vMapUv * 52.0).r) * uEclairage5 * nuages5(vNuage5, uTemps5);");
  };
  m.customProgramCacheKey = () => `cine5n${m.vertexColors ? "c" : ""}`;
  return m;
}
// Ce qui vit dans un modèle cuit, animé par la carte graphique à partir d'une couleur de sommet posée dans Blender :
//   « vent » : le feuillage (vert < 1 : plus il est bas, plus la feuille bouge) ; et la houle du vent (rouge < 1) : des
//   risées claires et sombres qui courent avec le vent, du sud-ouest au nord-est, sur les blés et l'herbe (l'Île des Vents) ;
//   « marche » : les membres d'un marcheur (bleu sous 0,5 : un membre ; rouge : le sens ; vert : 0 une jambe, 1 un bras), qui
//   balancent autour de la hanche ou de l'épaule au rythme de ses pas (uPas, de -1 à 1, que donne l'animateur « marche »).
const VENT5 = `
  float vent5 = 1.0 - color.g;
  if (vent5 > 0.01) {
    float ph5 = uTemps5 * 1.25 + position.x * 0.7 + position.z * 0.55;
    float raf5 = 0.65 + 0.35 * sin(uTemps5 * 0.31 + position.x * 0.13);
    transformed.x += (sin(ph5) * 0.05 + sin(ph5 * 2.3 + 1.7) * 0.016) * vent5 * raf5;
    transformed.z += cos(ph5 * 0.8 + 0.6) * 0.034 * vent5 * raf5;
    transformed.y += sin(ph5 * 1.6) * 0.014 * vent5;
  }
  float houle5 = 1.0 - color.r;
  vHoule5 = 0.0;
  if (houle5 > 0.02) {
    float long5 = (position.x - position.z) * 0.7071; // le long du vent (il souffle vers le nord-est)
    float travers5 = (position.x + position.z) * 0.7071;
    float onde5 = sin(uTemps5 * 2.3 - long5 * 3.1 + travers5 * 0.9 + sin(travers5 * 1.7 + uTemps5 * 0.45) * 1.3);
    float risee5 = 0.55 + 0.45 * sin(uTemps5 * 0.41 - long5 * 0.5 + travers5 * 0.33);
    vHoule5 = onde5 * risee5 * houle5;
  }`;
const MARCHE5 = `
  vHoule5 = 0.0;
  if (color.b < 0.5) {
    float axe5 = color.b - 0.25; // où se tient le marcheur dans son objet (le pousseur d'une charrette est derrière elle)
    // une patte de bête (un dromadaire) : vert entre 0,45 et 0,95, sa hanche est à (vert - 0,45) × 1,5 ; « axe » : où est la
    // patte, d'avant en arrière ; les pattes en diagonale vont ensemble (rouge)
    float bete5 = step(0.42, color.g) * step(color.g, 0.95);
    float pivot5 = mix(mix(0.137, 0.207, color.g), (color.g - 0.45) * 1.5, bete5); // la hanche, l'épaule
    float ang5 = uPas * (color.r * 2.0 - 1.0) * mix(mix(0.5, 0.4, color.g), 0.3, bete5);
    vec2 d5 = vec2(transformed.x - axe5, transformed.y - pivot5);
    transformed.x = axe5 + cos(ang5) * d5.x - sin(ang5) * d5.y;
    transformed.y = pivot5 + sin(ang5) * d5.x + cos(ang5) * d5.y;
  }`;
const vents5 = new Map();
function animee5(base, genre, pas = { value: 0 }) {
  if (genre === "vent" && vents5.has(base)) return vents5.get(base);
  const m = base.clone();
  m.vertexColors = true;
  m.userData.uPas = pas;
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, { uEclairage5: eclairage5, uDetail5: { value: textureDetail5() }, uTemps5: temps5, uPas: m.userData.uPas });
    s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nuniform float uTemps5;\nuniform float uPas;\nvarying vec2 vNuage5;\nvarying float vHoule5;").replace("#include <begin_vertex>", `#include <begin_vertex>\n${genre === "marche" ? MARCHE5 : VENT5}\nvNuage5 = (modelMatrix * vec4(transformed, 1.0)).xz;`);
    s.fragmentShader = s.fragmentShader.replace("#include <common>", `#include <common>\nuniform float uEclairage5;\nuniform sampler2D uDetail5;\nuniform float uTemps5;\nvarying vec2 vNuage5;\nvarying float vHoule5;${NUAGES5}`)
      .replace("#include <map_fragment>", "#include <map_fragment>\ndiffuseColor.rgb *= (0.87 + 0.26 * texture2D(uDetail5, vMapUv * 52.0).r) * uEclairage5 * nuages5(vNuage5, uTemps5) * (1.0 + vHoule5 * 0.55);")
      .replace("#include <color_fragment>", ""); // la couleur de sommet sert à animer, pas à teindre
  };
  m.customProgramCacheKey = () => `animee5h-${genre}`;
  if (genre === "vent") vents5.set(base, m);
  return m;
}
// Sur l'eau, au bord d'une île « niveau 5 » : « ecume », le ressac d'une plage (des lames qui arrivent, s'étalent et se
// retirent) ; « ombre_eau », le reflet sombre d'un quai, d'un ponton, d'une coque, avec un liseré d'écume au pied du mur.
// Les UV viennent de Blender (bande() et tache() dans barhaw_ile_v5.py) : u le long du bord, v du bord (0) vers le large (1) ;
// pour une tache, v va de 2 (sous l'objet) à 3.
const rivages5 = {};
function matiereRivage5(nom) {
  if (rivages5[nom]) return rivages5[nom];
  const ressac = nom === "ecume";
  rivages5[nom] = new THREE.ShaderMaterial({
    uniforms: { uTemps5: temps5, uEclairage5: eclairage5 },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `
      uniform float uTemps5; uniform float uEclairage5; varying vec2 vUv;
      float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      // un bruit qui se répète tous les « per » le long du bord : le ruban qui fait le tour d'une île se referme sans couture
      float bruit(vec2 p, float per) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
        float x0 = mod(i.x, per), x1 = mod(i.x + 1.0, per);
        return mix(mix(h21(vec2(x0, i.y)), h21(vec2(x1, i.y)), u.x), mix(h21(vec2(x0, i.y + 1.0)), h21(vec2(x1, i.y + 1.0)), u.x), u.y); }
      void main() {
        vec2 q = vec2(vUv.x, 1.0 - vUv.y); // q.x : le long du bord ; q.y : 0 contre le bord, 1 au large
        float g1 = bruit(vec2(q.x * 6.0, q.y * 5.0 + uTemps5 * 0.22), 96.0);
        float g2 = bruit(vec2(q.x * 14.0 + 5.0, q.y * 11.0 - uTemps5 * 0.31), 224.0);
        float grain = g1 * 0.55 + g2 * 0.45;
        float dentelle = smoothstep(0.5, 0.92, (1.0 - abs(g1 * 2.0 - 1.0)) * 0.72 + g2 * 0.42); // l'écume en dentelle, qui dérive
        ${ressac ? `
        // deux lames décalées : chacune vient du large, grossit, déferle contre le sable, puis se retire en laissant sa dentelle
        float a = 0.0;
        for (int k = 0; k < 2; k++) {
          float fk = float(k);
          float t = fract(uTemps5 * 0.085 + fk * 0.5 + bruit(vec2(q.x * 0.375 + fk * 3.0, fk * 9.0), 6.0) * 0.5);
          float avance = smoothstep(0.0, 0.58, t);
          float retrait = smoothstep(0.58, 1.0, t);
          float ondule = (bruit(vec2(q.x * 1.5 + fk * 11.0, uTemps5 * 0.05), 24.0) - 0.5) * 0.18;
          float front = mix(0.96, 0.05, avance) + retrait * 0.2 + ondule * (1.0 - avance * 0.6);
          float dv = q.y - front; // > 0 : derrière la lame, côté large
          float force = smoothstep(0.0, 0.22, t) * (1.0 - retrait);
          float crete = smoothstep(-0.035, 0.0, dv) * smoothstep(0.11, 0.01, dv);
          float nappe = smoothstep(0.0, 0.06, dv) * smoothstep(0.55, 0.08, dv) * dentelle;
          a = max(a, (crete * (0.5 + 0.5 * smoothstep(0.25, 0.6, grain)) + nappe * 0.8) * force);
          a = max(a, retrait * (1.0 - retrait) * 4.0 * smoothstep(0.45, 0.0, q.y) * dentelle * 0.6);
        }
        a = max(a, smoothstep(0.1, 0.0, q.y) * smoothstep(0.35, 0.65, grain) * 0.7); // le liseré, contre le sable
        a *= smoothstep(1.0, 0.85, q.y);
        gl_FragColor = vec4(vec3(0.97, 0.99, 1.0) * uEclairage5, clamp(a, 0.0, 1.0) * 0.9);` : `
        // l'eau sombre au pied d'un quai (un ruban : q.y de 0 à 1, avec son liseré d'écume qui bat contre le mur) ou sous un
        // ponton, autour d'une coque (une tache : q.y de 2 à 3, sans liseré)
        float tache = step(1.5, q.y);
        float loin = clamp(q.y - 2.0 * tache, 0.0, 1.0);
        float ombre = pow(1.0 - loin, 1.7) * (0.52 + 0.06 * sin(uTemps5 * 0.9 + q.x * 2.0 + grain * 5.0));
        float lisere = (1.0 - tache) * smoothstep(0.1, 0.0, loin - 0.025 * sin(uTemps5 * 1.3 + q.x * 3.0)) * smoothstep(0.45, 0.72, grain + 0.08);
        vec3 c = mix(vec3(0.03, 0.14, 0.18), vec3(0.95, 0.98, 1.0), lisere);
        gl_FragColor = vec4(c * uEclairage5, max(ombre, lisere * 0.7));`}
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  return rivages5[nom];
}
// La lave d'une île « niveau 5 » : elle coule (u le long de la coulée, v en travers), sa croûte sombre dérive et se
// fend, les bords refroidissent. Les UV viennent de Blender (barhaw_braise_v5.py).
let lave5 = null;
function matiereLave5() {
  lave5 ||= new THREE.ShaderMaterial({
    uniforms: { uTemps5: temps5 },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `
      uniform float uTemps5; varying vec2 vUv;
      float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float bruit(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y); }
      void main() {
        vec2 q = vec2(vUv.x, 1.0 - vUv.y);
        float coule = uTemps5 * 0.22;
        float chaud = bruit(vec2(q.x * 1.6 - coule, q.y * 2.6)) * 0.6 + bruit(vec2(q.x * 4.2 - coule * 1.7, q.y * 6.0 + 3.0)) * 0.4;
        float croute = smoothstep(0.56, 0.78, bruit(vec2(q.x * 2.4 - coule * 0.8, q.y * 3.4 + 7.0)) * 0.7 + bruit(vec2(q.x * 7.0 - coule * 0.8, q.y * 9.0)) * 0.3);
        float bords = smoothstep(0.0, 0.2, q.y) * smoothstep(1.0, 0.8, q.y); // 0 sur les deux bords : la lave y refroidit
        vec3 c = mix(vec3(1.0, 0.3, 0.04), vec3(1.0, 0.82, 0.3), smoothstep(0.35, 0.75, chaud) * (0.6 + 0.4 * sin(uTemps5 * 1.7 + q.x * 2.0)));
        c = mix(c, vec3(0.22, 0.07, 0.03), max(croute * 0.8, (1.0 - bords) * 0.6));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  return lave5;
}
// les toiles d'un navire « niveau 5 » : de la vraie toile (laizes cousues, bandes de ris, ralingue, usure), les couleurs de la
// commu peintes dessus. En haut de l'image : le bas de la voile ; en bas : sa têtière, contre la vergue
const toiles5 = {};
function toile5(nom, theme) {
  const cle = `${nom}|${theme.cle}`;
  if (toiles5[cle]) return toiles5[cle];
  const { c1, c2, fonce, embleme } = theme;
  const R = hasard(nom.length * 131 + theme.cle.length * 17 + 5);
  const tissu = (x, l, h, base = [236, 226, 204]) => {
    // le fond : la couleur de la toile, pixel par pixel (la trame), plus claire au milieu de chaque laize
    const im = x.createImageData(l, h);
    const laize = l / 8;
    for (let j = 0; j < h; j++) for (let i = 0; i < l; i++) {
      const dansLaize = (i % laize) / laize;
      const bombe = 0.96 + 0.05 * Math.sin(dansLaize * Math.PI);
      const trame = 0.975 + 0.025 * ((i + j) % 2) + (R() - 0.5) * 0.05;
      const sale = 1 - 0.1 * Math.pow(1 - j / h, 2.2); // le bas de la voile (le haut de l'image), sali par les embruns
      const k = (j * l + i) * 4, f = bombe * trame * sale;
      im.data[k] = base[0] * f; im.data[k + 1] = base[1] * f; im.data[k + 2] = base[2] * f; im.data[k + 3] = 255;
    }
    x.putImageData(im, 0, 0);
    // l'usure : des auréoles d'eau salée, des coulures
    for (let k = 0; k < 26; k++) {
      const g = x.createRadialGradient(0, 0, 0, 0, 0, 1);
      const sombre = R() < 0.7;
      g.addColorStop(0, sombre ? "rgba(128,104,72,.13)" : "rgba(255,250,236,.16)"); g.addColorStop(1, "rgba(128,104,72,0)");
      x.save(); x.translate(R() * l, R() * h); x.rotate(R() * 3); x.scale(18 + R() * 60, 12 + R() * 34); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 1, 0, Math.PI * 2); x.fill(); x.restore();
    }
    for (let k = 0; k < 14; k++) { const cx = R() * l; const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "rgba(110,88,60,.16)"); g.addColorStop(0.6 + R() * 0.4, "rgba(110,88,60,0)"); x.fillStyle = g; x.fillRect(cx, 0, 2 + R() * 5, h); }
  };
  const coutures = (x, l, h) => {
    // les laizes : une couture double entre deux bandes de toile ; les bandes de ris et leurs garcettes ; la ralingue autour
    for (let k = 1; k < 8; k++) {
      const cx = Math.round((k * l) / 8);
      x.fillStyle = "rgba(96,74,50,.34)"; x.fillRect(cx - 1, 0, 1.5, h);
      x.fillStyle = "rgba(255,252,240,.3)"; x.fillRect(cx + 1.5, 0, 1.5, h);
      x.fillStyle = "rgba(96,74,50,.16)"; x.fillRect(cx + 4, 0, 1, h);
    }
    for (const part of [0.3, 0.5]) {
      const y = Math.round(h * part);
      x.fillStyle = "rgba(120,96,66,.2)"; x.fillRect(0, y - 5, l, 10);
      x.fillStyle = "rgba(90,68,46,.4)"; x.fillRect(0, y - 5, l, 1); x.fillRect(0, y + 4, l, 1);
      for (let i = 12; i < l; i += 26) { x.fillStyle = "rgba(74,54,36,.6)"; x.fillRect(i, y - 1, 2, 2); x.fillStyle = "rgba(92,70,48,.42)"; x.fillRect(i, y - 15, 1.6, 14); }
    }
    x.strokeStyle = "rgba(92,68,44,.62)"; x.lineWidth = 9; x.strokeRect(1, 1, l - 2, h - 2);
    x.strokeStyle = "rgba(240,228,200,.3)"; x.lineWidth = 1.5; x.strokeRect(8, 8, l - 16, h - 16);
  };
  const peinture = (x, l, h) => {
    // les couleurs de la commu, peintes sur la toile près de la vergue : deux bandes, un peu passées
    x.globalAlpha = 0.86; x.fillStyle = c1; x.fillRect(0, h - 62, l, 30);
    x.globalAlpha = 0.8; x.fillStyle = c2; x.fillRect(0, h - 26, l, 9);
    x.globalAlpha = 1;
  };
  const dessins = {
    voile: [512, 384, (x, l, h) => { tissu(x, l, h); peinture(x, l, h); coutures(x, l, h); }],
    voile_b: [512, 384, (x, l, h) => {
      tissu(x, l, h); peinture(x, l, h);
      // l'emblème, peint : un disque à la couleur de la commu, sa lettre (le logo de la commu vient par-dessus dès qu'il est chargé)
      const cy = h / 2 - 20;
      x.globalAlpha = 0.9; x.fillStyle = c1; x.beginPath(); x.arc(l / 2, cy, 100, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1;
      x.lineWidth = 10; x.strokeStyle = fonce; x.beginPath(); x.arc(l / 2, cy, 100, 0, Math.PI * 2); x.stroke();
      x.font = `900 ${embleme.length > 1 ? 100 : 144}px 'Dela Gothic One', Arial Black, sans-serif`; x.textAlign = "center"; x.textBaseline = "middle";
      x.lineWidth = 9; x.strokeStyle = fonce; x.strokeText(embleme, l / 2, cy + 6); x.fillStyle = "#fff6ec"; x.fillText(embleme, l / 2, cy + 6);
      coutures(x, l, h);
    }],
    drapeau: [512, 320, (x, l, h) => { x.fillStyle = c1; x.fillRect(0, 0, l, h); x.fillStyle = c2; x.fillRect(0, h * 0.62, l, h * 0.38); plis(x, l, h); }],
    flamme: [256, 32, (x, l, h) => { const d = x.createLinearGradient(0, 0, l, 0); d.addColorStop(0, c1); d.addColorStop(1, c2); x.fillStyle = d; x.fillRect(0, 0, l, h); x.fillStyle = "rgba(0,0,0,.14)"; x.fillRect(0, 0, l, 3); x.fillRect(0, h - 3, l, 3); }],
  };
  // un drapeau n'est jamais plat : des plis d'ombre et de lumière, l'ourlet, la gaine du côté de la hampe
  function plis(x, l, h) {
    for (let k = 0; k < 7; k++) {
      const cx = (k + 0.5) * (l / 7) + (R() - 0.5) * 18;
      const g = x.createLinearGradient(cx - 30, 0, cx + 30, 0);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.45, "rgba(0,0,0,.2)"); g.addColorStop(0.62, "rgba(255,255,255,.13)"); g.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = g; x.fillRect(cx - 30, 0, 60, h);
    }
    x.strokeStyle = "rgba(0,0,0,.3)"; x.lineWidth = 6; x.strokeRect(0, 0, l, h);
    x.fillStyle = "rgba(235,226,205,.9)"; x.fillRect(0, 0, 12, h);
  }
  const [l, h, f] = dessins[nom];
  const t = toile(l, h, f);
  t.flipY = false;
  toiles5[cle] = t;
  if (theme.drapeau && (nom === "drapeau" || nom === "voile_b")) {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      const x = t.image.getContext("2d");
      if (nom === "drapeau") {
        x.fillStyle = "#0b0b0b"; x.fillRect(0, 0, l, h);
        const e = Math.max(l / img.width, h / img.height);
        x.drawImage(img, (l - img.width * e) / 2, (h - img.height * e) / 2, img.width * e, img.height * e);
        plis(x, l, h);
      } else {
        const r = 100, cy = h / 2 - 20;
        x.save(); x.beginPath(); x.arc(l / 2, cy, r, 0, Math.PI * 2); x.closePath(); x.fillStyle = "#0b0b0b"; x.fill(); x.clip();
        x.globalAlpha = 0.93; x.drawImage(img, l / 2 - r * 1.08, cy - r * 1.08, r * 2.16, r * 2.16); x.globalAlpha = 1;
        x.restore();
        x.lineWidth = 10; x.strokeStyle = fonce; x.beginPath(); x.arc(l / 2, cy, r, 0, Math.PI * 2); x.stroke();
        coutures(x, l, h);
      }
      t.needsUpdate = true;
    };
    img.src = theme.drapeau;
  }
  return t;
}
// la toile prend le soleil des modèles (le même que dans Blender), et en laisse passer un peu : le côté à l'ombre reste clair
function matiereToile5(nom, theme) {
  const cle = `toile5|${nom}|${theme.cle}`;
  if (matieres.has(cle)) return matieres.get(cle);
  const m = new THREE.MeshBasicMaterial({ map: toile5(nom, theme), side: THREE.DoubleSide });
  m.onBeforeCompile = (s) => {
    s.uniforms.uEclairage5 = eclairage5;
    s.uniforms.uTemps5 = temps5;
    s.uniforms.uOnde5 = { value: nom === "drapeau" ? 1 : nom === "flamme" ? 0.6 : 0 };
    s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vN5;\nuniform float uTemps5;\nuniform float uOnde5;").replace("#include <begin_vertex>", `#include <begin_vertex>
      vN5 = normalize(mat3(modelMatrix) * normal);
      // un drapeau claque depuis sa hampe (u = 0) ; une voile respire, tenue par ses bords
      transformed += normal * (uOnde5 > 0.0
        ? (sin(uTemps5 * 6.5 - uv.x * 8.0) * 0.045 + sin(uTemps5 * 9.1 - uv.x * 13.0 + uv.y * 3.0) * 0.018) * uv.x * uOnde5
        : sin(uTemps5 * 1.3 + uv.y * 2.4) * 0.022 * sin(3.1416 * uv.x) * sin(3.1416 * uv.y));`);
    s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vN5;\nuniform float uEclairage5;").replace("#include <map_fragment>", `#include <map_fragment>
      vec3 n5 = normalize(vN5) * (gl_FrontFacing ? 1.0 : -1.0);
      float soleil5 = dot(n5, normalize(vec3(-0.5, 0.62, 0.62)));
      float lum5 = 0.6 + 0.42 * smoothstep(-0.85, 0.9, soleil5);
      diffuseColor.rgb *= lum5 * uEclairage5 * mix(vec3(1.0, 0.93, 0.84), vec3(1.0), smoothstep(-0.3, 0.5, soleil5));`);
  };
  m.customProgramCacheKey = () => "toile5";
  matieres.set(cle, m);
  return m;
}
// habiller un modèle : les matières du site, les contours ; renvoie ce qui bouge et les reliefs
function habiller(racine, { relief, contour = 0.045, theme = THEME_BARHAW, cuit = false, ile = false }) {
  const reliefs = [];
  const bouge = [];
  const reperes = [];
  const parcourir = (o, sansContour, marcheur = null) => {
    const anim = o.userData.anim;
    if (anim === "marche" && !o.userData.roulis) marcheur = o; // ses mailles balancent bras et jambes
    else if (anim) marcheur = null;
    if (anim && o.userData.role === "repere") reperes.push(o);
    else if (anim) bouge.push(o);
    const calme = sansContour || anim === "mirage" || anim === "clignote";
    const enfants = [...o.children];
    if (o.isMesh) {
      const nom = o.userData.matiere;
      if (nom === "terrain") {
        o.material = relief();
        reliefs.push(o);
      } else if (nom.startsWith("atlas")) {
        // niveau 5 : tout est dans l'image, pas de contour ; les faces « peintes » prennent les couleurs de la commu
        const base = racine.userData.atlas;
        if (!base) o.material = matiereGLB("pierre");
        else if (o.geometry.getAttribute("color") && ile) o.material = marcheur ? animee5(base, "marche", (marcheur.userData.pas5 ??= { value: 0 })) : animee5(base, "vent"); // une île : les pas, le vent
        else if (o.geometry.getAttribute("color")) { teindreZones(o.geometry, theme); o.material = atlasTeinte(base); }
        else o.material = base;
      } else if (nom === "vitre") {
        o.material = matiereVitre();
      } else if (nom === "lave" && racine.userData.atlas) {
        o.material = matiereLave5(); // niveau 5 : une lave qui coule
      } else if (nom === "ecume" || nom === "ombre_eau") {
        o.material = matiereRivage5(nom);
        o.renderOrder = 2;
      } else if (racine.userData.atlas && toileGLB.noms.has(nom)) {
        o.material = matiereToile5(nom, theme); // niveau 5 : de la vraie toile, éclairée comme le reste du modèle
      } else {
        o.material = matiereGLB(nom, theme, Boolean(o.geometry.getAttribute("color")), cuit);
        if (!calme && !SANS_CONTOUR.has(nom)) o.add(new THREE.Mesh(o.geometry, matiereContour(contour)));
      }
    }
    for (const c of enfants) parcourir(c, calme, marcheur);
  };
  parcourir(racine, false);
  return { reliefs, bouge, reperes };
}
// le trait de côte à l'encre : là où le relief coupe l'eau
function traitDeCote(geo, niveau = 0.08) {
  const p = geo.attributes.position;
  const ix = geo.index ? geo.index.array : Array.from({ length: p.count }, (_, k) => k);
  const pts = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (let t = 0; t < ix.length; t += 3) {
    const coupe = [];
    for (let k = 0; k < 3; k++) {
      a.fromBufferAttribute(p, ix[t + k]);
      b.fromBufferAttribute(p, ix[t + ((k + 1) % 3)]);
      if ((a.y - niveau) * (b.y - niveau) < 0) coupe.push(a.clone().lerp(b, (niveau - a.y) / (b.y - a.y)));
    }
    if (coupe.length === 2) pts.push(...coupe);
  }
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: ENCRE, transparent: true, opacity: 0.55 }));
}
// l'heure de Paris, en secondes depuis minuit (relue une fois par seconde, pas à chaque image)
let heureLue = 0;
let heureVue = -1;
const formatParis = (() => { try { return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23" }); } catch { return null; } })();
function secondesParis() {
  const t = Date.now();
  if (t - heureVue > 1000) {
    heureVue = t;
    const d = new Date(t);
    let h = d.getHours(), m = d.getMinutes(), sec = d.getSeconds();
    try { for (const x of formatParis.formatToParts(d)) { if (x.type === "hour") h = Number(x.value); else if (x.type === "minute") m = Number(x.value); else if (x.type === "second") sec = Number(x.value); } } catch {}
    heureLue = h * 3600 + m * 60 + sec;
  }
  return heureLue;
}
// l'Île-Horloge sonne les heures de Paris (de 1 à 12 coups) et un petit carillon aux quarts d'heure. Ce que l'on sait de
// la sonnerie en cours : f, sa force (0 : rien) ; n, le nombre de coups ; k, ceux déjà sonnés ; dk, le temps depuis le
// dernier (s) ; t, depuis le début ; fin, sa durée ; quart ; phase, celle de la cloche (son sinus vaut ±1 à chaque coup).
// Pour les essais : window.__sonnerie = h (1 à 12) la fait sonner tout de suite (une fois par nouvelle valeur).
const SONNE = { debut: 2.2, ecart: 1.8 }; // le coucou sort, puis un coup toutes les 1,8 s
let sonnerieVue = -1, sonnerieLue = null, essaiH, essaiT0 = 0;
function sonnerieParis() {
  const ms = performance.now();
  if (sonnerieLue && ms - sonnerieVue < 8) return sonnerieLue; // une fois par image suffit
  sonnerieVue = ms;
  let t, n, quart = false;
  const essai = typeof window === "undefined" ? undefined : window.__sonnerie;
  if (essai !== essaiH) { essaiH = essai; essaiT0 = ms / 1000; }
  if (essaiH) {
    t = ms / 1000 - essaiT0;
    n = Math.max(1, Math.min(12, Math.round(Number(essaiH)) || 12));
  } else {
    const p = secondesParis() + Math.min(0.999, (Date.now() - heureVue) / 1000);
    quart = Math.floor(p / 900) % 4 !== 0;
    t = p % 900;
    n = quart ? 1 : Math.floor(p / 3600) % 12 || 12;
  }
  const fin = SONNE.debut + (n - 1) * SONNE.ecart + 3;
  const f = t >= 0 && t < fin ? Math.min(1, t / 0.8) * Math.min(1, (fin - t) / 2.5) * (quart ? 0.45 : 1) : 0;
  const k = t < SONNE.debut || t >= fin ? 0 : Math.min(n, Math.floor((t - SONNE.debut) / SONNE.ecart) + 1); // (0 en dehors de la sonnerie)
  sonnerieLue = { f, n, k, dk: k ? t - SONNE.debut - (k - 1) * SONNE.ecart : 99, t, fin, quart, phase: Math.PI / 2 + Math.PI * (t - SONNE.debut) / SONNE.ecart };
  return sonnerieLue;
}
// la houle de la mer, la même que dans son shader : ce qui flotte près d'une île (barques, canots) monte et descend avec elle
const houleMer = (x, z, s) => Math.sin(x * 0.33 + s * 0.9) * 0.09 + Math.sin(z * 0.41 - s * 1.1) * 0.07;
function niveauMer(o, s) {
  const m = o.parent?.matrixWorld.elements;
  if (!m) return 0;
  const p = o.position;
  // à l'abri de son île (dans son port), la houle se calme : la même pente douce que dans le shader de la mer
  let racine = o.parent;
  while (racine && racine.userData.rMer === undefined && racine.parent) racine = racine.parent;
  const d = Math.hypot(p.x, p.z) - (racine?.userData.rMer ?? -99);
  const t = Math.min(1, Math.max(0, (d + 1) / 4.5));
  const abri = racine?.userData.rMer === undefined ? 1 : t * t * (3 - 2 * t);
  return houleMer(m[0] * p.x + m[4] * p.y + m[8] * p.z + m[12], m[2] * p.x + m[6] * p.y + m[10] * p.z + m[14], s) * abri / (Math.hypot(m[4], m[5], m[6]) || 1);
}
// Blender a le haut en Z ; le site en Y
const axeBlender = (a = [0, 0, 1]) => new THREE.Vector3(a[0], a[2], -a[1]).normalize();
// ce qui bouge sur un modèle : une fonction par objet animé
function animateurs(bouge, vent = () => 1) {
  const q = new THREE.Quaternion();
  return bouge.map((o) => {
    const u = o.userData;
    const q0 = o.quaternion.clone();
    const p0 = o.position.clone();
    const axe = axeBlender(u.axe);
    const ph = u.phase || 0;
    const ampl = u.ampl ?? 0.3;
    const v = u.vitesse ?? 1;
    if (u.anim === "tourne" && u.sonne) {
      // un engrenage de l'Île-Horloge : il file quand l'heure sonne (l'angle s'additionne, pour ne pas sauter)
      let angle = 0, avant = null;
      return (s) => {
        const dt = avant === null ? 0 : Math.min(0.1, Math.max(0, s - avant));
        avant = s;
        angle += dt * v * (1 + 3.5 * sonnerieParis().f);
        o.quaternion.copy(q0).multiply(q.setFromAxisAngle(axe, angle));
      };
    }
    if (u.anim === "tourne") return (s) => { o.quaternion.copy(q0).multiply(q.setFromAxisAngle(axe, s * v)); };
    // la vie des îles (niveau 5) : un passant, une charrette, une barque qui suit son chemin (points x, y, z de Blender, à plat
    // dans « chemin ») ; aller-retour, ou en rond avec « boucle » ; « saut » : le petit pas sautillant ; « roulis » : sur l'eau ;
    // « dandine » : il se balance d'une patte sur l'autre en avançant (un manchot)
    if (u.anim === "marche") {
      const c = Array.isArray(u.chemin) ? u.chemin : [];
      const pts = [];
      for (let k = 0; k + 2 < c.length; k += 3) pts.push(new THREE.Vector3(c[k], c[k + 2], -c[k + 1]));
      if (pts.length < 2) return () => {};
      if (u.boucle) pts.push(pts[0].clone());
      const longs = [];
      let total = 0;
      for (let k = 0; k < pts.length - 1; k++) { const d = pts[k].distanceTo(pts[k + 1]); longs.push(d); total += d; }
      const saut = u.saut ?? 0.02;
      const roulis = u.roulis || 0;
      const dandine = u.dandine || 0;
      const pause = u.pause ?? 1.5; // il s'arrête un instant au bout du chemin
      const tour = (u.boucle ? total : total * 2) + (u.boucle ? 0 : pause * v * 2);
      const depart = ((ph % 1) + 1) % 1;
      return (s) => {
        let d = (s * v + depart * tour) % tour;
        let sens = 1;
        let arret = false;
        if (!u.boucle) {
          const aller = total + pause * v;
          if (d > aller) { d -= aller; sens = -1; }
          if (d > total) { d = total; arret = true; }
          if (sens < 0) d = total - d;
        }
        const fait = d; // la distance depuis le début du chemin
        let k = 0;
        while (k < longs.length - 1 && d > longs[k]) { d -= longs[k]; k++; }
        o.position.lerpVectors(pts[k], pts[k + 1], longs[k] ? Math.min(1, d / longs[k]) : 0);
        if (u.pas5) {
          // un marcheur « niveau 5 » : ses jambes et ses bras suivent la distance parcourue (une foulée fait 0,26) ; il se
          // calme en arrivant au bout du chemin, et son corps monte un peu quand ses jambes se croisent
          const elan = arret ? 0 : u.boucle ? 1 : Math.min(1, Math.min(fait, total - fait) / 0.1);
          const foulee = (s * v + depart * tour) * 24;
          u.pas5.value = Math.sin(foulee) * elan;
          o.position.y += Math.cos(foulee) ** 2 * 0.005 * elan;
        } else if (!arret) o.position.y += Math.abs(Math.sin(s * 9 + ph * 7)) * saut;
        const penche = roulis ? Math.sin(s * 1.3 + ph) * roulis : dandine && !arret ? Math.sin(s * 7.5 + ph * 5) * dandine : 0;
        o.rotation.set(penche, Math.atan2(-(pts[k + 1].z - pts[k].z) * sens, (pts[k + 1].x - pts[k].x) * sens), 0, "YXZ");
        if (roulis) o.position.y += niveauMer(o, s) + Math.sin(s * 1.6 + ph) * roulis * 0.2;
      };
    }
    // l'horloge du beffroi donne la vraie heure de Paris : « tour » = la durée d'un tour d'aiguille, en secondes
    if (u.anim === "aiguille") {
      const tour = u.tour || 3600;
      return () => { o.quaternion.copy(q0).multiply(q.setFromAxisAngle(axe, -(secondesParis() % tour) / tour * Math.PI * 2)); };
    }
    if (u.anim === "balance" && u.sonne === "cloche") return (s) => { // la cloche de l'Île-Horloge : à toute volée, un coup à chaque bout
      const so = sonnerieParis();
      o.quaternion.copy(q0).multiply(q.setFromAxisAngle(axe, Math.sin(s * v + ph) * ampl * (1 - so.f) + Math.sin(so.phase) * 0.75 * so.f));
    };
    if (u.anim === "balance" && u.sonne) return (s) => { o.quaternion.copy(q0).multiply(q.setFromAxisAngle(axe, Math.sin(s * v + ph) * ampl * (1 + 0.8 * sonnerieParis().f))); };
    if (u.anim === "balance") return (s) => { o.quaternion.copy(q0).multiply(q.setFromAxisAngle(axe, Math.sin(s * v + ph) * ampl)); };
    if (u.anim === "flotte") return (s) => {
      o.position.y = p0.y + (u.mer ? niveauMer(o, s) : 0) + Math.sin(s * 1.3 + ph) * ampl;
      o.quaternion.copy(q0).multiply(q.setFromAxisAngle(X, Math.sin(s * 1.1 + ph) * 0.05));
    };
    if (u.anim === "drapeau" || u.anim === "flamme") return (s) => { o.quaternion.copy(q0).multiply(q.setFromAxisAngle(Y, Math.sin(s * (u.anim === "flamme" ? 5 : 3) + ph) * 0.3)); };
    if (u.anim === "voile") {
      const k = Math.abs(axe.x) > 0.5 ? "x" : Math.abs(axe.y) > 0.5 ? "y" : "z";
      return (s) => { o.scale[k] = vent() * (1 + Math.sin(s * 2.2 + ph) * 0.05); };
    }
    if (u.anim === "clignote" || u.anim === "mirage") {
      const mats = [];
      o.traverse((m) => {
        if (!m.isMesh || m.material.type === "ShaderMaterial") return;
        m.material = m.material.clone();
        if (u.anim === "mirage") Object.assign(m.material, { transparent: true, depthWrite: false });
        mats.push([m.material, m.material.color.clone()]);
      });
      // « eclipse » (le buffet du Désert d'Ambre) : il ne tourne pas ; il apparaît, tremble dans la chaleur (il s'étire et
      // se tasse un peu), puis s'efface tout à fait, et il n'y a plus rien pendant un moment ; « cycle » : la durée d'un tour
      if (u.anim === "mirage" && u.eclipse) {
        const s0 = o.scale.clone();
        const cycle = u.cycle || 14;
        return (s) => {
          const t = ((s / cycle + ph) % 1 + 1) % 1;
          const vu = Math.max(0, Math.sin(t * Math.PI * 2)) ** 1.4 * (1 - lampesAllumees); // pas de mirage la nuit
          o.visible = vu > 0.01;
          if (!o.visible) return;
          o.position.y = p0.y + Math.sin(s * 1.1) * ampl;
          o.scale.set(s0.x * (1 + Math.sin(s * 9.3) * 0.012), s0.y * (1 + Math.sin(s * 6.1 + 1) * 0.04 + Math.sin(s * 13.3) * 0.015), s0.z * (1 + Math.sin(s * 7.7 + 2) * 0.012));
          for (const [m] of mats) m.opacity = vu * 0.7 * (0.88 + Math.sin(s * 11) * 0.12);
        };
      }
      if (u.anim === "mirage") return (s) => {
        o.position.y = p0.y + Math.sin(s * 1.2) * ampl;
        o.rotation.y = s * 0.2;
        for (const [m] of mats) m.opacity = 0.42 + Math.sin(s * 1.7) * 0.22;
      };
      const lent = u.lent ? 0.35 : 1;
      return (s) => {
        const f = 0.82 + Math.sin(s * 7 * lent) * 0.1 + Math.sin(s * 13.7 * lent + 1.3) * 0.08;
        for (const [m, c] of mats) m.color.copy(c).multiplyScalar(f);
      };
    }
    return () => {};
  });
}
const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
// les effets posés sur les repères des îles (fumée, neige, lucioles, phare, orage…)
function points(nb, couleur, taille, place) {
  const pos = new Float32Array(nb * 3);
  for (let k = 0; k < nb; k++) pos.set(place(k), k * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color: couleur, size: taille, map: pastille(), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
}
// les rêves du géant endormi (l'Île des Géants) : une bulle de savon, et dedans ce dont il rêve, dessiné en doré
function dessinReve(x, l, nom) {
  const c = l / 2;
  const bulle = x.createRadialGradient(c * 0.8, c * 0.75, c * 0.1, c, c, c * 0.98);
  bulle.addColorStop(0, "rgba(255, 255, 255, 0.10)");
  bulle.addColorStop(0.78, "rgba(200, 230, 255, 0.16)");
  bulle.addColorStop(0.93, "rgba(214, 236, 255, 0.75)");
  bulle.addColorStop(1, "rgba(214, 236, 255, 0)");
  x.fillStyle = bulle;
  x.beginPath(); x.arc(c, c, c * 0.98, 0, Math.PI * 2); x.fill();
  x.fillStyle = "rgba(255, 255, 255, 0.85)"; // le reflet
  x.beginPath(); x.ellipse(c * 0.62, c * 0.55, c * 0.16, c * 0.08, -0.6, 0, Math.PI * 2); x.fill();
  x.save();
  x.translate(c, c * 1.04);
  x.fillStyle = "#ffd76a";
  x.strokeStyle = "#9a6a12";
  x.lineWidth = l * 0.025;
  x.lineJoin = "round";
  const s = l * 0.3;
  x.beginPath();
  if (nom === "etoile") {
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? s * 0.42 : s; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    x.closePath();
  } else if (nom === "lune") {
    x.arc(0, 0, s * 0.9, Math.PI * 0.35, Math.PI * 1.65);
    x.arc(s * 0.38, -s * 0.05, s * 0.72, Math.PI * 1.45, Math.PI * 0.55, true);
    x.closePath();
  } else if (nom === "poisson") {
    x.ellipse(-s * 0.1, 0, s * 0.7, s * 0.42, 0, 0, Math.PI * 2);
    x.moveTo(s * 0.5, 0); x.lineTo(s * 1.0, -s * 0.45); x.lineTo(s * 1.0, s * 0.45); x.closePath();
  } else if (nom === "navire") {
    x.moveTo(-s, s * 0.25); x.lineTo(s, s * 0.25); x.lineTo(s * 0.7, s * 0.7); x.lineTo(-s * 0.7, s * 0.7); x.closePath();
    x.moveTo(-s * 0.05, s * 0.2); x.lineTo(-s * 0.05, -s * 0.95); x.lineTo(s * 0.75, s * 0.05); x.closePath();
    x.moveTo(-s * 0.15, -s * 0.75); x.lineTo(-s * 0.15, s * 0.05); x.lineTo(-s * 0.8, s * 0.05); x.closePath();
  } else if (nom === "baleine") {
    x.ellipse(-s * 0.15, s * 0.15, s * 0.75, s * 0.48, 0, 0, Math.PI * 2);
    x.moveTo(s * 0.5, s * 0.1); x.lineTo(s * 1.0, -s * 0.35); x.lineTo(s * 0.95, s * 0.3); x.closePath();
  } else {
    x.arc(-s * 0.45, s * 0.15, s * 0.42, 0, Math.PI * 2); x.arc(s * 0.05, -s * 0.15, s * 0.55, 0, Math.PI * 2); x.arc(s * 0.55, s * 0.15, s * 0.4, 0, Math.PI * 2);
  }
  x.fill();
  x.stroke();
  if (nom === "poisson" || nom === "baleine") { // l'œil
    x.fillStyle = "#3b2a10";
    x.beginPath(); x.arc(-s * 0.55, -s * (nom === "baleine" ? 0.05 : 0.08), l * 0.022, 0, Math.PI * 2); x.fill();
  }
  if (nom === "baleine") { // le jet d'eau
    x.strokeStyle = "#cfeaff"; x.lineWidth = l * 0.03;
    x.beginPath(); x.moveTo(-s * 0.35, -s * 0.4); x.quadraticCurveTo(-s * 0.55, -s * 0.85, -s * 0.8, -s * 0.8); x.moveTo(-s * 0.35, -s * 0.4); x.quadraticCurveTo(-s * 0.15, -s * 0.85, s * 0.1, -s * 0.8); x.stroke();
  }
  x.restore();
}
// des repères d'effets que le site ajoute à une île déjà cuite, tant que son modèle n'a pas le sien (le même que celui que
// Blender y mettra à la prochaine cuisson : outils/blender/barhaw_horloge_v5.py, donnees_heures). « ici » : sa place
// (x, y, z de Blender) ; le reste, ses données (des points de Blender, comme pour les autres repères)
const REPERES_SITE = {
  engloutie: [{ anim: "noyee", ici: [0.0, 0.0, 0.0], mer: 0.02, points: [2.41,0.97,1.97,2.52,-1.86,2.22,-2.23,0.9,-3.14,-1.02,-1.81,-2.01,2.23,-2.01,2.3,-0.7] }],
  marche: [{ anim: "lanternes", ici: [0.0, 0.0, 0.0], departs: [-1.68,0.92,1.0,2.05,0.92,0.52,-2.0,-0.3,0.21,1.8,-0.3,0.21,-3.219,-3.553,0.21,0.192,-4.25,0.21,3.264,-3.354,0.21,0.3,2.4,0.21], chenaux: [-1.35,-0.85,-1.4,-2.0,-1.45,-3.2,-1.7,-4.6,-2.0,-5.8,1.15,-0.9,1.27,-2.0,1.62,-3.2,1.95,-4.4,2.3,-5.6], par: 5, vent: [0.5, 0.3], mer: 0.02, nb: 10 }],
  moussaillons: [{ anim: "cerfsvolants", ici: [0.0, 0.0, 0.0], vent: [0.3, 1.0], ancres: [0.92, -5.23, 0.23, -5.45, -4.57, 0.25, 4.72, -2.2, 0.2] }],
  recif: [{ anim: "meduses", ici: [0.0, 0.0, 0.0], nb: 7, rayon: 2.6, mer: 0.03 }],
  forteresse: [{ anim: "garde", ici: [0.0, 0.85, 3.75], donjon: [0.0, 0.85, 3.75], canons: [1.524,-2.319,2.22,-1.73,1.735,-2.166,2.22,-0.155,0.131,2.772,2.22,0.783,-0.131,2.772,2.22,-3.925,-1.735,-2.166,2.22,-2.987,-1.524,-2.319,2.22,-1.412] }],
  geants: [{ anim: "sommeil", ici: [-4.95, 0.1, 2.35], cadence: 8 }],
  horloge: [{ anim: "heures", ici: [0.0,0.7,1.468], cloche: [0.0,0.7,6.138], coucou: [0.0,0.08,5.888], events: [1.981,-3.432,2.07,-0.669,3.793,2.07], rayon: 8.0, haut: 2.3, heure: [0,0,1,2,3,4,5,7,8,9,10,11], index: [0.142,3.327,1.449,0.142,3.967,1.455,0.058,3.967,1.454,0.058,3.327,1.448,-0.058,3.327,1.448,-0.058,3.967,1.454,-0.142,3.967,1.455,-0.142,3.327,1.449,1.838,3.087,1.481,2.158,3.641,1.48,2.074,3.689,1.479,1.754,3.135,1.482,3.196,1.79,1.454,3.751,2.11,1.46,3.703,2.193,1.461,3.148,1.873,1.455,3.775,-0.07,1.461,4.415,-0.07,1.471,4.415,0.07,1.471,3.775,0.07,1.461,2.84,-1.695,1.472,3.395,-2.015,1.469,3.443,-1.932,1.469,2.888,-1.612,1.472,1.68,-3.005,1.473,2.0,-3.56,1.471,2.083,-3.512,1.47,1.763,-2.957,1.473,-1.794,-3.011,1.474,-2.114,-3.565,1.47,-2.031,-3.613,1.471,-1.711,-3.059,1.475,-3.052,-1.707,1.453,-3.606,-2.027,1.453,-3.558,-2.11,1.452,-3.004,-1.79,1.453,-3.385,0.07,1.455,-4.025,0.07,1.462,-4.025,-0.07,1.462,-3.385,-0.07,1.455,-3.312,1.968,1.452,-3.866,2.288,1.453,-3.914,2.205,1.452,-3.36,1.885,1.452,-1.786,3.189,1.466,-2.106,3.743,1.466,-2.189,3.695,1.466,-1.869,3.141,1.466], lunette: [0.464,-4.463,1.55,0.469,-4.463,1.55,0.939,-4.418,1.55,1.397,-4.299,1.55,1.824,-4.096,1.55,2.206,-3.821,1.55,2.543,-3.5,1.55,2.845,-3.16,1.55,3.13,-2.818,1.55,3.414,-2.481,1.55,3.704,-2.139,1.55,3.994,-1.778,1.55,4.267,-1.386,1.55,4.498,-0.956,1.55,4.663,-0.49,1.55,4.745,0.0,1.55,4.738,0.498,1.55,4.646,0.988,1.55,4.484,1.457,1.55,4.268,1.9,1.55,4.012,2.317,1.55,3.727,2.708,1.55,3.414,3.074,1.55,3.07,3.41,1.55,2.693,3.706,1.55,2.281,3.951,1.55,1.841,4.134,1.55,1.382,4.252,1.55,0.916,4.309,1.55,0.454,4.318,1.55,0.0,4.297,1.55,-0.448,4.262,1.55,-0.898,4.223,1.55,-1.357,4.176,1.55,-1.83,4.11,1.55,-2.312,4.005,1.55,-2.788,3.838,1.55,-3.236,3.594,1.55,-3.629,3.268,1.55,-3.947,2.867,1.55,-4.176,2.411,1.55,-4.319,1.923,1.55,-4.388,1.426,1.55,-4.404,0.936,1.55,-4.388,0.461,1.55,-4.355,0.0,1.55,-4.313,-0.453,1.55,-4.255,-0.904,1.55,-4.171,-1.355,1.55,-4.046,-1.801,1.55,-3.868,-2.233,1.55,-3.634,-2.64,1.55,-3.345,-3.012,1.55,-3.011,-3.344,1.55,-2.639,-3.632,1.55,-2.237,-3.875,1.55,-1.813,-4.072,1.55,-1.372,-4.223,1.55,-0.921,-4.332,1.55,-0.463,-4.407,1.55,-0.458,-4.407,1.55] }],
};
function effetRepere(r) {
  const g = new THREE.Group();
  g.position.copy(r.position);
  const R = hasard(777);
  let maj = () => {};
  const genre = r.userData.anim;
  if (r.userData.taille) g.scale.setScalar(r.userData.taille);
  if (genre === "fumees") {
    // la fumée de toutes les cheminées d'une île : des bouffées qui montent, grossissent et s'effacent (un seul dessin)
    const c = Array.isArray(r.userData.points) ? r.userData.points : [];
    const nbC = Math.floor(c.length / 3);
    const par = 5;
    const N = nbC * par;
    // « cap » (où va le vent, en radians de Blender), « force » et « monte » : un vent qui couche la fumée (l'Île des Vents)
    const cap = r.userData.cap;
    const force = r.userData.force || 0.5;
    const monte = r.userData.monte ?? 1.5;
    const [ventX, ventZ] = cap === undefined ? [0.5, 0.16] : [Math.cos(cap) * force, -Math.sin(cap) * force];
    const pos = new Float32Array(N * 3);
    const vie = new Float32Array(N);
    const geo = new THREE.BufferGeometry();
    const aPos = new THREE.BufferAttribute(pos, 3);
    const aVie = new THREE.BufferAttribute(vie, 1);
    aPos.setUsage(THREE.DynamicDrawUsage);
    aVie.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("position", aPos);
    geo.setAttribute("aVie", aVie);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 3, 0), 40);
    // uTaille : le diamètre d'une bouffée, en unités de la scène ; uPx : la demi-hauteur du dessin, en pixels (lue à chaque image)
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTaille: { value: r.userData.grosseur || 0.5 }, uPx: { value: 450 } },
      vertexShader: "attribute float aVie; uniform float uTaille; uniform float uPx; varying float vVie; void main() { vVie = aVie; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = uTaille * (0.55 + aVie * 1.25) * projectionMatrix[1][1] * uPx / -mv.z; gl_Position = projectionMatrix * mv; }",
      fragmentShader: "varying float vVie; void main() { float d = length(gl_PointCoord - 0.5) * 2.0; float f = smoothstep(1.0, 0.35, d) * min(1.0, vVie * 6.0) * (1.0 - vVie) * 0.85; gl_FragColor = vec4(vec3(0.9, 0.88, 0.86), f); }",
      transparent: true, depthWrite: false,
    });
    const bouffees = new THREE.Points(geo, mat);
    const dessin = new THREE.Vector2();
    bouffees.onBeforeRender = (renderer) => { mat.uniforms.uPx.value = renderer.getDrawingBufferSize(dessin).y / 2; };
    g.add(bouffees);
    maj = (s) => {
      for (let k = 0; k < N; k++) {
        const ch = Math.floor(k / par);
        const p = (s * 0.16 + (k % par) / par + ch * 0.37) % 1;
        pos[k * 3] = c[ch * 3] + Math.sin(p * 4 + ch) * 0.1 * p + p * ventX;
        pos[k * 3 + 1] = c[ch * 3 + 2] + p * monte;
        pos[k * 3 + 2] = -c[ch * 3 + 1] + p * ventZ;
        vie[k] = p;
      }
      aPos.needsUpdate = true;
      aVie.needsUpdate = true;
    };
  } else if (genre === "oiseaux") {
    // des mouettes qui tournent au-dessus du port : un corps, deux ailes coudées au bout gris ; elles battent, puis planent
    // (un seul dessin pour toutes : 8 triangles par oiseau)
    const nb = Math.max(1, Math.min(12, r.userData.nb || 5));
    const rayon = r.userData.rayon || 4;
    const pos = new Float32Array(nb * 72);
    const coul = new Float32Array(nb * 72);
    const BLANC = [0.97, 0.96, 0.93], GRIS = [0.8, 0.83, 0.87], BOUT = [0.3, 0.32, 0.36];
    // l'ordre des sommets : le corps (2 triangles), puis pour chaque aile le bras (2 triangles) et la main (1 triangle)
    const TEINTES = [BLANC, BLANC, BLANC, BLANC, BLANC, BLANC, BLANC, BLANC, GRIS, BLANC, GRIS, GRIS, GRIS, GRIS, BOUT, BLANC, BLANC, GRIS, BLANC, GRIS, GRIS, GRIS, GRIS, BOUT];
    for (let k = 0; k < nb; k++) TEINTES.forEach((t, j) => coul.set(t, k * 72 + j * 3));
    const geo = new THREE.BufferGeometry();
    const aPos = new THREE.BufferAttribute(pos, 3);
    aPos.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("position", aPos);
    geo.setAttribute("color", new THREE.BufferAttribute(coul, 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), rayon * 2 + 4);
    g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));
    const env = r.userData.envergure || 0.3;
    const sommets = new Float32Array(72);
    maj = (s) => {
      for (let k = 0; k < nb; k++) {
        const sens = k % 2 ? -1 : 1;
        const a = s * (0.32 + (k % 3) * 0.07) * sens + k * 2.4;
        const rr = rayon * (0.55 + ((k * 37) % 10) / 20);
        const cx = Math.cos(a) * rr, cz = Math.sin(a) * rr * 0.8;
        const cy = Math.sin(s * 0.5 + k * 1.7) * 0.6 + (k % 4) * 0.35;
        const dx = -Math.sin(a) * sens, dz = Math.cos(a) * sens * 0.8; // le sens du vol
        const l = Math.hypot(dx, dz) || 1;
        const ux = dx / l, uz = dz / l;
        // quelques battements, puis un long plané
        const bat = Math.sin(s * 6.5 + k * 1.3) * env * (0.1 + 0.34 * Math.max(0, Math.sin(s * 0.45 + k * 2.1)));
        let n = 0;
        // un point : « le long » du corps (vers l'avant), « de côté » (vers l'aile gauche), et sa hauteur
        const P = (long, cote, haut) => { sommets[n++] = cx + (ux * long - uz * cote) * env; sommets[n++] = cy + haut; sommets[n++] = cz + (uz * long + ux * cote) * env; };
        P(0.5, 0, 0); P(0, 0.09, 0); P(-0.42, 0, 0); P(0.5, 0, 0); P(-0.42, 0, 0); P(0, -0.09, 0);
        for (const c of [1, -1]) {
          const coude = env * 0.1 + bat * 0.6, bout = bat * 1.5;
          P(0.2, c * 0.06, 0); P(-0.1, c * 0.06, 0); P(-0.02, c * 0.52, coude);
          P(0.2, c * 0.06, 0); P(-0.02, c * 0.52, coude); P(0.22, c * 0.5, coude);
          P(0.22, c * 0.5, coude); P(-0.02, c * 0.52, coude); P(-0.16, c * 1.0, bout);
        }
        pos.set(sommets, k * 72);
      }
      aPos.needsUpdate = true;
    };
  } else if (genre === "fumee") {
    const bouffees = Array.from({ length: 7 }, (_, k) => { const f = nuageBoule(0x8c8077, 0.8); f.userData.k = k; g.add(f); return f; });
    maj = (s) => {
      for (const f of bouffees) {
        const p = (s * 0.22 + f.userData.k / 7) % 1;
        f.position.set(Math.sin(p * 5 + f.userData.k) * 0.9, p * 8, p * 2.5);
        f.scale.setScalar(0.5 + p * 2);
        f.material.opacity = 0.8 * (1 - p);
      }
    };
  } else if (genre === "lucioles" && r.userData.nb) {
    // niveau 5 : chaque luciole scintille à son rythme et se promène ; certaines dessinent des étoiles au-dessus de l'eau
    // (« etoiles » : x, y, z, rayon, dans le repère de Blender). On les voit surtout la nuit, quand les lampes s'allument.
    const u = r.userData;
    const et = Array.isArray(u.etoiles) ? u.etoiles : [];
    const pos = [], phase = [], fixe = [], lueurs = [];
    for (let k = 0; k < u.nb; k++) { const a = R() * Math.PI * 2; const d = Math.sqrt(R()) * (u.rayon || 7); pos.push(Math.cos(a) * d, 0.25 + R() * (u.haut || 2.5), Math.sin(a) * d); phase.push(R()); fixe.push(0); }
    for (let e = 0; e + 3 < et.length; e += 4) {
      const x = et[e], y = et[e + 1], z = et[e + 2], ray = et[e + 3];
      const tourne = R() * 6.28;
      const coins = Array.from({ length: 10 }, (_, k) => { const a = tourne + (k * Math.PI) / 5; const d = k % 2 ? ray * 0.42 : ray; return [x + Math.cos(a) * d, y + Math.sin(a) * d]; });
      for (let k = 0; k < 10; k++) for (let t = 0; t < 5; t++) { const [ax, ay] = coins[k]; const [bx, by] = coins[(k + 1) % 10]; pos.push(ax + ((bx - ax) * t) / 5, z, -(ay + ((by - ay) * t) / 5)); phase.push(R()); fixe.push(1); }
      lueurs.push({ x, y: z, z: -y, r: ray * 3.6 });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("phase", new THREE.Float32BufferAttribute(phase, 1));
    geo.setAttribute("etoile", new THREE.Float32BufferAttribute(fixe, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTemps5: temps5, uNuit5: { value: 0 }, uTaille: { value: 40 } },
      vertexShader: `
        attribute float phase; attribute float etoile; uniform float uTemps5; uniform float uNuit5; uniform float uTaille; varying float vA;
        void main() {
          vec3 p = position;
          float libre = 1.0 - etoile; // les libres se promènent, celles d'une étoile tiennent leur place
          p.x += sin(uTemps5 * 0.4 + phase * 6.28) * 0.4 * libre;
          p.z += cos(uTemps5 * 0.33 + phase * 9.1) * 0.4 * libre;
          p.y += sin(uTemps5 * 0.6 + phase * 4.7) * (0.2 * libre + 0.03);
          float scint = 0.5 + 0.5 * sin(uTemps5 * (1.6 + phase * 2.2) + phase * 40.0);
          vA = (0.3 + 0.7 * scint * scint) * mix(0.12, 1.0, uNuit5);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = uTaille * (0.75 + 0.5 * scint + 0.25 * etoile) / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying float vA;
        void main() {
          float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
          gl_FragColor = vec4(vec3(1.0, 0.96, 0.5) * (0.5 + 0.9 * a), a * vA);
        }`,
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    });
    const p = new THREE.Points(geo, mat);
    p.frustumCulled = false;
    const taille = new THREE.Vector2();
    p.onBeforeRender = (renderer, scene, camera) => { mat.uniforms.uTaille.value = (0.17 * camera.projectionMatrix.elements[5] * renderer.getDrawingBufferSize(taille).y) / 2; };
    g.userData.calque = p; // dessiné après la teinte de la nuit, pour rester vif (voir chargerIle et grandline-fete.js)
    g.userData.lueurs = lueurs; // là où une étoile de lucioles éclaire la nuit (voir chargerIle)
    maj = () => { mat.uniforms.uNuit5.value = lampesAllumees; };
  } else if (genre === "boules") {
    // la bataille de boules de neige (l'Île Givre) : « tirs » = le lanceur puis sa cible (x, y, z de Blender), six nombres par
    // tir. Chaque boule part, monte, retombe, s'écrase (elle s'aplatit et s'élargit un instant), puis attend son tour ; un seul
    // dessin pour toutes.
    const t = Array.isArray(r.userData.tirs) ? r.userData.tirs : [];
    const nb = Math.floor(t.length / 6);
    const boules = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 7, 5), new THREE.MeshBasicMaterial({ color: 0xffffff }), Math.max(1, nb));
    boules.count = nb;
    boules.frustumCulled = false;
    const M = new THREE.Matrix4();
    g.add(boules);
    maj = (s) => {
      for (let k = 0; k < nb; k++) {
        const tour = 1.7 + (k % 3) * 0.35; // chacun son rythme, et son moment (pour qu'il y ait toujours des boules en l'air)
        const p = ((s + ((k * 0.618) % 1) * tour) % tour) / 0.75; // le vol dure 0,75 s
        const e = Math.min(1, p);
        const a = k * 6;
        const choc = p < 1 ? 0 : (p - 1) / 0.3; // 0 en vol ; de 0 à 1 : l'éclat de neige ; au-delà : plus rien
        if (choc >= 1) M.makeScale(0, 0, 0);
        else M.makeScale(1 + choc * 2.2, 1 - choc * 0.75, 1 + choc * 2.2);
        M.setPosition(t[a] + (t[a + 3] - t[a]) * e, t[a + 2] + (t[a + 5] - t[a + 2]) * e + Math.sin(e * Math.PI) * 0.3, -(t[a + 1] + (t[a + 4] - t[a + 1]) * e));
        boules.setMatrixAt(k, M);
      }
      boules.instanceMatrix.needsUpdate = true;
    };
  } else if (genre === "aurore") {
    // une aurore boréale (l'Île Givre) : deux rideaux de lumière derrière le glacier, la nuit seulement. Dessinée après la teinte de
    // la nuit (le calque de grandline-fete.js) pour rester vive ; elle éclaire un peu la glace, en vert (lueurs).
    const R0 = r.userData.rayon || 3.6; // le rayon du premier rideau, autour du repère (le sommet du glacier)
    const H0 = r.userData.haut || 3; // le bas des rideaux
    const SEG = 40;
    const pos = [], uv = [], rideau = [], idx = [];
    for (let c = 0; c < 2; c++) {
      const base = pos.length / 3;
      for (let k = 0; k <= SEG; k++) {
        const u = k / SEG;
        const a = (0.07 + 0.86 * u) * Math.PI + c * 0.16; // du côté du nord, derrière le glacier
        const ray = R0 + c * 1.5 + Math.sin(u * 7 + c * 2) * 0.4;
        const x = Math.cos(a) * ray, z = -Math.sin(a) * ray;
        pos.push(x, H0 + c * 0.7, z, x, H0 + c * 0.7 + 4.0 - c * 0.6, z);
        uv.push(u, 0, u, 1);
        rideau.push(c, c);
        if (k < SEG) { const i = base + k * 2; idx.push(i, i + 2, i + 1, i + 1, i + 2, i + 3); }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute("rideau", new THREE.Float32BufferAttribute(rideau, 1));
    geo.setIndex(idx);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTemps5: temps5, uNuit5: { value: 0 } },
      vertexShader: `
        attribute float rideau; uniform float uTemps5; uniform float uNuit5; varying vec2 vUv; varying float vR;
        void main() {
          vUv = uv; vR = rideau;
          vec3 p = position;
          p.x += sin(uv.x * 11.0 + uTemps5 * 0.35 + rideau * 2.0) * 0.45 * (0.4 + uv.y);
          p.z += cos(uv.x * 8.0 - uTemps5 * 0.27 + rideau * 4.0) * 0.45 * (0.4 + uv.y);
          gl_Position = uNuit5 < 0.02 ? vec4(2.0, 2.0, 2.0, 1.0) : projectionMatrix * modelViewMatrix * vec4(p, 1.0); // de jour : rien
        }`,
      fragmentShader: `
        uniform float uTemps5; uniform float uNuit5; varying vec2 vUv; varying float vR;
        ${NUAGES5}
        void main() {
          float rayons = b5n(vec2(vUv.x * 34.0 + vR * 17.0 + sin(vUv.x * 5.0 + uTemps5 * 0.2) * 1.5, uTemps5 * 0.25 + vR * 3.0));
          rayons = 0.25 + 0.75 * smoothstep(0.25, 0.8, rayons);
          float pans = b5n(vec2(vUv.x * 5.0 - uTemps5 * 0.06, vR * 9.0 + uTemps5 * 0.05)); // des pans plus vifs que d'autres
          float haut = smoothstep(0.0, 0.14, vUv.y) * pow(1.0 - vUv.y, 1.5);
          float bouts = smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x);
          vec3 c = mix(vec3(0.2, 1.0, 0.55), vec3(0.55, 0.3, 1.0), smoothstep(0.15, 0.95, vUv.y));
          gl_FragColor = vec4(c, rayons * (0.4 + 0.6 * pans) * haut * bouts * uNuit5 * 0.95);
        }`,
      transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    });
    const rideaux = new THREE.Mesh(geo, mat);
    rideaux.frustumCulled = false;
    g.userData.calque = rideaux; // dessiné après la teinte de la nuit (voir chargerIle et grandline-fete.js)
    g.userData.lueurs = [{ x: r.position.x, y: 3.4, z: r.position.z + 1.2, r: 7.5, c: [0.35, 1, 0.72] }];
    maj = () => { mat.uniforms.uNuit5.value = lampesAllumees; };
  } else if (genre === "neige" || genre === "spores" || genre === "etincelles" || genre === "lucioles") {
    const reglage = {
      neige: [200, 0xffffff, 0.35, 9, 11, -1.1],
      spores: [70, 0xff9cc8, 0.45, 7, 6, 0.35],
      etincelles: [40, 0xffd36b, 0.4, 1.4, 2.4, 0.6],
      lucioles: [80, 0xfff27a, 0.55, r.userData.rayon || 10, 5, 0],
    }[genre];
    const [nb0, couleur, taille0, rayon, haut, vitesse] = reglage;
    const nb = r.userData.nb || nb0; // une île « niveau 5 », vue de près : plus de flocons, plus petits
    const taille = r.userData.grosseur || taille0;
    const p = points(nb, couleur, taille, () => { const a = R() * Math.PI * 2; const d = Math.sqrt(R()) * rayon; return [Math.cos(a) * d, R() * haut - (genre === "neige" ? 9 : 0), Math.sin(a) * d]; });
    const bas = genre === "neige" ? -9 : 0;
    g.add(p);
    maj = (s, dt) => {
      const a = p.geometry.attributes.position;
      if (vitesse) {
        for (let k = 0; k < nb; k++) {
          let y = a.getY(k) + vitesse * dt * (0.6 + (k % 5) * 0.15);
          if (y < bas) y += haut;
          if (y > bas + haut) y -= haut;
          a.setY(k, y);
          a.setX(k, a.getX(k) + Math.sin(s + k) * dt * 0.15);
        }
        a.needsUpdate = true;
      }
      p.material.opacity = genre === "etincelles" ? 0.5 + Math.sin(s * 6) * 0.4 : genre === "lucioles" ? 0.55 + Math.sin(s * 3) * 0.35 : 0.85;
      if (genre === "lucioles") p.rotation.y = s * 0.05;
    };
  } else if (genre === "rafales") {
    // les rafales de l'Île des Vents : des traits de vent clairs qui filent en ondulant, s'effilent et s'effacent (des
    // rubans posés de biais, pour se voir d'en haut comme de côté ; un seul dessin pour tous). « cap » : où va le vent
    // (en radians de Blender ; sans lui, vers l'est). « couleur » [r, g, b] (du sable soulevé, au Désert d'Ambre) ; « bas » :
    // la hauteur des plus basses.
    g.rotation.y = r.userData.cap || 0;
    const teinteR = Array.isArray(r.userData.couleur) ? r.userData.couleur.map(Number) : [1.0, 0.99, 0.94];
    const basR = r.userData.bas ?? 0.45;
    const nb = Math.max(1, Math.min(24, r.userData.nb || 12));
    const rayon = r.userData.rayon || 7;
    const haut = r.userData.haut || 4;
    const SEG = 8;
    const pos = new Float32Array(nb * (SEG + 1) * 6);
    const voile = new Float32Array(nb * (SEG + 1) * 2);
    const idx = [];
    for (let k = 0; k < nb; k++) for (let j = 0; j < SEG; j++) { const i = (k * (SEG + 1) + j) * 2; idx.push(i, i + 2, i + 1, i + 1, i + 2, i + 3); }
    const geo = new THREE.BufferGeometry();
    const aPos = new THREE.BufferAttribute(pos, 3);
    const aVoile = new THREE.BufferAttribute(voile, 1);
    aPos.setUsage(THREE.DynamicDrawUsage);
    aVoile.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("position", aPos);
    geo.setAttribute("aVoile", aVoile);
    geo.setIndex(idx);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, haut / 2, 0), rayon * 2 + 4);
    const mat = new THREE.ShaderMaterial({
      vertexShader: "attribute float aVoile; varying float vA; void main() { vA = aVoile; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform vec3 uTeinte; varying float vA; void main() { gl_FragColor = vec4(uTeinte, vA); }",
      uniforms: { uTeinte: { value: new THREE.Vector3(...teinteR) } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    g.add(new THREE.Mesh(geo, mat));
    const alea = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
    maj = (s) => {
      for (let k = 0; k < nb; k++) {
        const duree = 3.4 + (k % 4) * 0.55; // le temps d'une traversée
        const tour = s / duree + k * 0.618;
        const t = tour % 1;
        const passe = Math.floor(tour) * 7 + k * 13; // à chaque traversée, une autre place dans le ciel
        const z0 = (alea(passe) * 2 - 1) * rayon * 0.8;
        const y0 = basR + alea(passe + 3) * haut;
        const long = 1.1 + alea(passe + 5) * 1.0;
        const tete = -rayon + t * (rayon * 2 + long);
        const fondu = Math.sin(t * Math.PI);
        for (let j = 0; j <= SEG; j++) {
          const u = j / SEG; // de la queue (0) à la tête (1)
          const x = tete - (1 - u) * long;
          const y = y0 + Math.sin(x * 1.6 + k * 2.1 + s * 0.8) * 0.13;
          const z = z0 + Math.cos(x * 1.1 + k) * 0.25;
          const demi = 0.026 * Math.sin(u * Math.PI) + 0.003;
          const i = (k * (SEG + 1) + j) * 2;
          pos[i * 3] = x; pos[i * 3 + 1] = y + demi; pos[i * 3 + 2] = z - demi;
          pos[i * 3 + 3] = x; pos[i * 3 + 4] = y - demi; pos[i * 3 + 5] = z + demi;
          voile[i] = voile[i + 1] = Math.sin(u * Math.PI) * fondu * 0.5;
        }
      }
      aPos.needsUpdate = true;
      aVoile.needsUpdate = true;
    };
  } else if (genre === "tourbillon") {
    // le tourbillon de sable du Désert d'Ambre : une colonne de poussière qui tourne sur elle-même, s'évase vers le haut, se
    // tord et se promène lentement sur son cercle (« rayon ») ; elle se forme, vit un moment, retombe, et renaît plus loin.
    // « haut » : sa hauteur ; « large » : son évasement en haut ; « couleur » [r, g, b] ; « vie » : la durée d'un tourbillon.
    const haut = r.userData.haut || 1.8;
    const rayon = r.userData.rayon || 1.2;
    const large = r.userData.large || 0.35;
    const vie = r.userData.vie || 22;
    const nbG = Math.max(20, Math.min(240, r.userData.nb || 150));
    const nbV = Math.round(nbG / 5);
    const coul = new THREE.Color(...(Array.isArray(r.userData.couleur) ? r.userData.couleur.map(Number) : [0.86, 0.68, 0.42]));
    const gros = r.userData.grosseur || 0.09;
    const grains = points(nbG, coul, gros, () => [0, 0, 0]);
    const voile = points(nbV, coul, gros * 5.5, () => [0, 0, 0]);
    for (const p of [grains, voile]) {
      Object.assign(p.material, { blending: THREE.NormalBlending, opacity: 0 });
      p.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, haut / 2, 0), rayon + large + haut);
    }
    g.add(grains, voile);
    const graine = Array.from({ length: nbG }, () => [R(), R(), R()]);
    maj = (s) => {
      const t = (s / vie) % 1;
      const n = Math.floor(s / vie);
      const force = Math.min(1, t * 6, (1 - t) * 4); // il se forme, puis retombe
      const a0 = n * 2.4 + t * 1.6; // il se promène sur son cercle
      const cx = Math.cos(a0) * rayon, cz = Math.sin(a0) * rayon;
      for (const [p, nb, fin] of [[grains, nbG, true], [voile, nbV, false]]) {
        const a = p.geometry.attributes.position;
        for (let k = 0; k < nb; k++) {
          const [g1, g2, g3] = graine[k];
          const h = (g1 + s * (0.16 + g2 * 0.18)) % 1; // chaque grain monte, et repart d'en bas
          const rr = (0.05 + large * h ** 1.4) * (0.75 + g3 * 0.5) * (fin ? 1 : 0.7);
          const ang = s * (3.2 - h * 1.4) + g2 * 6.283;
          const tord = Math.sin(h * 2.4 + s * 0.7) * 0.18 * h;
          a.setXYZ(k, cx + tord + Math.cos(ang) * rr, h * haut * force, cz + Math.sin(ang) * rr + tord * 0.5);
        }
        a.needsUpdate = true;
        p.material.opacity = (fin ? 0.75 : 0.26) * force;
      }
    };
  } else if (genre === "feuilles") {
    // les feuilles qui tombent du Grand Arbre : chacune se détache de la couronne, tournoie en descendant (elle bascule d'un
    // bord sur l'autre, le vent la pousse un peu vers l'est) et s'efface près du sol ; un seul dessin pour toutes.
    // « rayon » : la couronne ; « haut » : d'où elles partent ; « bas » : où elles s'effacent (au-dessus du repère).
    const nb = Math.max(1, Math.min(60, r.userData.nb || 30));
    const rayon = r.userData.rayon || 4;
    const haut = r.userData.haut || 7;
    const bas = r.userData.bas ?? 0.5;
    const pos = new Float32Array(nb * 12);
    const coul = new Float32Array(nb * 12);
    const idx = [];
    const TEINTES = [[0.16, 0.34, 0.07], [0.3, 0.46, 0.09], [0.62, 0.42, 0.07], [0.7, 0.25, 0.05], [0.22, 0.4, 0.06]];
    for (let k = 0; k < nb; k++) {
      idx.push(k * 4, k * 4 + 1, k * 4 + 2, k * 4, k * 4 + 2, k * 4 + 3);
      for (let j = 0; j < 4; j++) coul.set(TEINTES[k % TEINTES.length].map((c) => c * (j === 2 ? 0.7 : 1)), (k * 4 + j) * 3); // la pointe plus sombre
    }
    const geo = new THREE.BufferGeometry();
    const aPos = new THREE.BufferAttribute(pos, 3);
    aPos.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("position", aPos);
    geo.setAttribute("color", new THREE.BufferAttribute(coul, 3));
    geo.setIndex(idx);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, haut / 2, 0), rayon + haut);
    g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));
    const alea = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
    maj = (s) => {
      for (let k = 0; k < nb; k++) {
        const duree = 9 + (k % 5) * 1.4; // le temps d'une chute
        const tour = s / duree + k * 0.618;
        const t = tour % 1;
        const passe = Math.floor(tour) * 7 + k * 13; // à chaque chute, une autre feuille, ailleurs dans la couronne
        const a = alea(passe) * Math.PI * 2;
        const d = Math.sqrt(alea(passe + 1)) * rayon;
        const cx = Math.cos(a) * d + Math.sin(s * 1.1 + k) * 0.35 * t + t * 0.7;
        const cz = Math.sin(a) * d + Math.cos(s * 0.9 + k * 1.7) * 0.3 * t - t * 0.25;
        const cy = haut - (haut - bas) * t + Math.sin(s * 2.6 + k) * 0.04;
        const taille = 0.075 * Math.min(1, t * 10, (1 - t) * 6);
        const b = s * (1.6 + (k % 3) * 0.5) + k; // elle tourne sur elle-même
        const c = Math.sin(s * 1.9 + k * 2.3) * 1.2; // et bascule
        const ux = Math.cos(b), uz = Math.sin(b);
        const vx = -Math.sin(b) * Math.sin(c), vy = Math.cos(c), vz = Math.cos(b) * Math.sin(c);
        const L = taille, l = taille * 0.5;
        const i = k * 12;
        pos[i] = cx + ux * L; pos[i + 1] = cy; pos[i + 2] = cz + uz * L;
        pos[i + 3] = cx + vx * l; pos[i + 4] = cy + vy * l; pos[i + 5] = cz + vz * l;
        pos[i + 6] = cx - ux * L; pos[i + 7] = cy; pos[i + 8] = cz - uz * L;
        pos[i + 9] = cx - vx * l; pos[i + 10] = cy - vy * l; pos[i + 11] = cz - vz * l;
      }
      aPos.needsUpdate = true;
    };
  } else if (genre === "ecume") {
    const rayon = r.userData.rayon || 1.5;
    const ronds = Array.from({ length: 3 }, (_, k) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(rayon * 0.8, rayon, 28), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.userData.k = k;
      g.add(m);
      return m;
    });
    // l'eau à z = 0 : le repère est à la surface (il ne suit pas la tête qui flotte)
    maj = (s) => {
      for (const m of ronds) {
        const p = (s * 0.5 + m.userData.k / 3) % 1;
        m.scale.setScalar(1 + p * 1.1);
        m.material.opacity = 0.75 * (1 - p);
      }
    };
  } else if (genre === "faisceau") {
    const faisceau = new THREE.Mesh(new THREE.ConeGeometry(2.6, 15, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
    faisceau.rotation.z = Math.PI / 2;
    faisceau.position.x = 7.5;
    const pivot = new THREE.Group();
    pivot.add(faisceau);
    g.add(pivot);
    // « nuit » : le phare ne s'allume qu'avec les lampes (rien en plein jour)
    const plein = faisceau.material.opacity * 1.5;
    maj = (s) => {
      pivot.rotation.y = s * 0.9;
      if (r.userData.nuit) { faisceau.material.opacity = plein * lampesAllumees; faisceau.visible = lampesAllumees > 0.02; }
    };
  } else if (genre === "phare") {
    // le feu du Phare du Bout du Monde, vu de près. L'optique du modèle tourne (anim « tourne ») et, la nuit, la fête pose
    // ses deux grands pinceaux sur la mer à la même vitesse (grandline-fete.js : 0,5). Ici : deux cônes de lumière qui
    // sortent de la lanterne, dos à dos, dans l'axe des lentilles ; et l'éclat : quand une lentille passe face à l'œil,
    // elle flamboie (la nuit, avec un trait de lumière en travers), ou renvoie juste un reflet de soleil (le jour).
    // Dessiné après la teinte de la nuit (le calque) pour rester vif. « portee » : la longueur des cônes.
    const portee = r.userData.portee || 14;
    const vit = r.userData.vitesse ?? 0.5;
    const feu = new THREE.Group();
    const pivot = new THREE.Group();
    const uForce = { value: 0 };
    const matCone = new THREE.ShaderMaterial({
      uniforms: { uForce },
      vertexShader: "varying float vL; varying vec3 vN; varying vec3 vV; void main() { vL = uv.y; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalMatrix * normal; vV = -mv.xyz; gl_Position = projectionMatrix * mv; }",
      fragmentShader: "uniform float uForce; varying float vL; varying vec3 vN; varying vec3 vV; void main() { float coeur = pow(abs(dot(normalize(vN), normalize(vV))), 1.8); gl_FragColor = vec4(1.0, 0.93, 0.66, coeur * smoothstep(0.0, 0.04, vL) * pow(1.0 - vL, 1.7) * 0.5 * uForce); }",
      transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    });
    const geoCone = new THREE.CylinderGeometry(portee * 0.075, 0.08, portee, 24, 1, true);
    geoCone.rotateZ(-Math.PI / 2); // l'axe du cône : +x, la petite ouverture à la lanterne
    geoCone.translate(portee / 2 + 0.2, 0, 0);
    for (const sens of [0, Math.PI]) {
      const cone = new THREE.Mesh(geoCone, matCone);
      cone.rotation.y = sens;
      cone.frustumCulled = false;
      pivot.add(cone);
    }
    const lueur = (c) => new THREE.Sprite(new THREE.SpriteMaterial({ map: pastille(), color: c, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
    const eclat = lueur(0xfff0b8);
    const trait = lueur(0xffe6a0);
    feu.add(pivot, eclat, trait);
    g.userData.calque = feu;
    let oeil = null;
    eclat.onBeforeRender = (renderer, scene, camera) => { oeil = camera; };
    const ici = new THREE.Vector3();
    maj = (s) => {
      const L = r.userData.nuit ? lampesAllumees : 1;
      const a = s * vit;
      pivot.rotation.y = a;
      uForce.value = L;
      pivot.visible = L > 0.02;
      let e = 0;
      if (oeil) {
        feu.getWorldPosition(ici);
        const dx = oeil.position.x - ici.x, dz = oeil.position.z - ici.z;
        e = Math.pow(Math.abs(Math.cos(a) * dx - Math.sin(a) * dz) / (Math.hypot(dx, dz) || 1), 70); // 1 : une lentille regarde l'œil
      }
      eclat.scale.setScalar((0.5 + 1.8 * e) * (1 - L) + (1.3 + 6 * e) * L);
      eclat.material.opacity = 0.75 * e * (1 - L) + (0.4 + 0.6 * e) * L;
      trait.scale.set(0.01 + 15 * e * L, 0.36, 1);
      trait.material.opacity = 0.7 * e * e * L;
    };
  } else if (genre === "brume") {
    // la brume du Phare (Mère Brume, sa gardienne, est faite de brouillard) : des bancs bas qui glissent sur l'eau avec le
    // vent, s'étirent, s'effacent et reviennent ailleurs ; deux écharpes restent accrochées au Rocher. « rayon » : jusqu'où ;
    // « nb » : combien ; « haut » : leur hauteur ; « cap » : où va le vent (radians de Blender ; sans lui, vers l'est).
    // La nuit, la teinte les assombrit, et les lumières du phare les rallument quand elles passent dessus.
    g.rotation.y = r.userData.cap || 0;
    const nb = Math.max(2, Math.min(14, r.userData.nb || 8));
    const rayon = r.userData.rayon || 8;
    const haut = r.userData.haut ?? 0.5;
    const alea = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
    const bancs = [];
    for (let k = 0; k < nb; k++) {
      const banc = new THREE.Sprite(new THREE.SpriteMaterial({ map: pastille(), color: 0xf2f5f7, transparent: true, opacity: 0, depthWrite: false }));
      g.add(banc);
      bancs.push(banc);
    }
    maj = (s) => {
      for (let k = 0; k < nb; k++) {
        const banc = bancs[k];
        const accroche = k < 2;
        const duree = accroche ? 21 + k * 6 : 30 + (k % 4) * 6; // le temps d'un passage
        const tour = s / duree + k * 0.618;
        const t = tour % 1;
        const passe = Math.floor(tour) * 7 + k * 13; // à chaque passage, une autre place
        const fondu = Math.sin(t * Math.PI);
        if (accroche) {
          const a = alea(passe) * 6.283 + t * 0.9;
          const d = 2.9 + alea(passe + 2) * 0.6;
          banc.position.set(Math.cos(a) * d, 1.2 + alea(passe + 3) * 1.3 + t * 0.3, Math.sin(a) * d);
          banc.scale.set(3 + alea(passe + 4) * 1.6 + t, 0.7 + alea(passe + 5) * 0.4, 1);
          banc.material.opacity = 0.34 * fondu;
        } else {
          // au large de l'île, d'un côté ou de l'autre (pas en travers des maisons), plus rarement tout contre le rivage
          const cote = (k + Math.floor(tour)) % 2 ? 1 : -1;
          const z0 = cote * rayon * (0.5 + alea(passe) * 0.46);
          const demi = Math.sqrt(Math.max(1, rayon * rayon - z0 * z0)) + 2; // la moitié de la traversée, à cette place
          const epais = 1.3 + alea(passe + 5) * 0.9;
          banc.position.set(-demi + t * 2 * demi, haut * 0.5 + epais * 0.18, z0);
          banc.scale.set((5 + alea(passe + 4) * 4) * (0.8 + 0.4 * t), epais, 1);
          banc.material.opacity = (0.42 + alea(passe + 6) * 0.16) * fondu;
        }
      }
    };
  } else if (genre === "foudre") {
    // l'orage de l'Île Tonnerre (« l'orage ne s'arrête jamais ici ») : un plafond de nuées sombres qui tourne lentement
    // au-dessus du Pic, la pluie en biais, et la foudre. Toutes les « cadence » secondes (à peu près), un éclair tombe sur
    // le Grand Paratonnerre (le repère est à sa pointe) ou sur une borne (« ailleurs » : x, y, z de Blender) ; les nuées
    // s'allument, l'île sort de l'ombre (la nuit : une lueur, voir chargerIle), puis l'étincelle court le long du câble de
    // cuivre (« cable ») jusqu'aux bocaux de la forge (« bocaux »), qui flambent un instant. Entre deux coups, des
    // éclairs sourds dans les nuées. L'éclair, les éclats et les bocaux sont dessinés après la teinte de la nuit (le calque).
    const haut = r.userData.haut ?? 4;
    const rayon = r.userData.rayon || 8;
    const cadence = Math.max(1.5, r.userData.cadence || 5.5);
    const lent = r.userData.lent || 1; // pour regarder un coup au ralenti (les essais)
    const nbN = Math.max(3, Math.min(14, r.userData.nuages || 9));
    const nbP = Math.max(0, Math.min(700, r.userData.pluie ?? 400));
    const alea = (n) => { const x = Math.sin(n * 127.1 + 11.7) * 43758.5453; return x - Math.floor(x); };
    // un point de Blender (dans l'île) → ici (le repère pour origine)
    const ici = (t, k) => new THREE.Vector3(t[k] - r.position.x, t[k + 2] - r.position.y, -t[k + 1] - r.position.z);
    const liste = (t) => { const o = []; if (Array.isArray(t)) for (let k = 0; k + 2 < t.length; k += 3) o.push(ici(t, k)); return o; };
    const ailleurs = liste(r.userData.ailleurs);
    const cable = liste(r.userData.cable);
    const bocaux = liste(r.userData.bocaux);
    const centre = new THREE.Vector3(-r.position.x, 0, -r.position.z); // le milieu de l'île
    const sol = -r.position.y; // la mer
    // --- les nuées : de gros nuages sombres (voir nuee()), les uns devant les autres, plus clairs quand ils sont hauts ---
    const SOMBRE = new THREE.Color(0x5b5f6d), DOS = new THREE.Color(0x9aa0ae), VIF = new THREE.Color(0xe6f2ff);
    const nuees = [];
    for (let k = 0; k < nbN; k++) {
      const bas = k < Math.ceil(nbN * 0.45);
      const base = SOMBRE.clone().lerp(DOS, bas ? alea(k) * 0.3 : 0.4 + alea(k) * 0.6);
      const nu = new THREE.Sprite(new THREE.SpriteMaterial({ map: nuee(), color: base, transparent: true, opacity: 0.94, depthWrite: false }));
      const a = k * 2.399, d = rayon * 0.52 * Math.sqrt((k + 0.4) / nbN);
      const l = (bas ? 8.2 : 6) + alea(k + 40) * 3;
      nu.userData = { base, a, d, y: haut + (bas ? alea(k + 20) * 0.6 : 0.9 + alea(k + 20) * 1.3), l, h: l * (0.44 + alea(k + 60) * 0.12) };
      g.add(nu);
      nuees.push(nu);
    }
    // --- la pluie : des traits qui tombent en biais, tout se fait dans le dessin ---
    const uPluie = { uT: { value: 0 }, uH: { value: haut - 0.4 - sol }, uY: { value: haut - 0.4 }, uVif: { value: 0 } };
    if (nbP) {
      const pos = new Float32Array(nbP * 6), bout = new Float32Array(nbP * 2), ph = new Float32Array(nbP * 2);
      for (let k = 0; k < nbP; k++) {
        const a = alea(k * 3 + 1) * 6.283, d = rayon * 0.74 * Math.sqrt(alea(k * 3 + 2));
        for (let j = 0; j < 2; j++) {
          pos[k * 6 + j * 3] = centre.x + Math.cos(a) * d - 1.9;
          pos[k * 6 + j * 3 + 2] = centre.z + Math.sin(a) * d;
          bout[k * 2 + j] = j;
          ph[k * 2 + j] = alea(k * 3 + 3);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("aBout", new THREE.BufferAttribute(bout, 1));
      geo.setAttribute("aPhase", new THREE.BufferAttribute(ph, 1));
      const pluie = new THREE.LineSegments(geo, new THREE.ShaderMaterial({
        uniforms: uPluie,
        vertexShader: `
          attribute float aBout; attribute float aPhase; uniform float uT; uniform float uH; uniform float uY; varying float vA;
          void main() {
            float t = fract(uT * (0.95 + aPhase * 0.35) + aPhase * 9.0); // 0 : sous la nuée ; 1 : au sol
            float chute = t * uH + aBout * 0.7;
            vec3 p = vec3(position.x + chute * 0.3, uY - chute, position.z + chute * 0.06);
            vA = smoothstep(0.0, 0.1, t) * smoothstep(1.0, 0.9, t) * (0.55 + 0.45 * aPhase);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }`,
        fragmentShader: "uniform float uVif; varying float vA; void main() { gl_FragColor = vec4(mix(vec3(0.74, 0.83, 0.93), vec3(0.93, 0.98, 1.0), uVif), vA * (0.34 + 0.5 * uVif)); }",
        transparent: true, depthWrite: false,
      }));
      pluie.frustumCulled = false;
      g.add(pluie);
    }
    // --- la foudre : un ruban en zigzag (le trait et deux branches), tourné vers l'œil à chaque coup ---
    const feu = new THREE.Group();
    const K = 14, KB = 4; // les morceaux du trait, ceux d'une branche
    const nbPts = K + 1 + 2 * (KB + 1);
    const posE = new Float32Array(nbPts * 6), bordE = new Float32Array(nbPts * 2), longE = new Float32Array(nbPts * 2), forceE = new Float32Array(nbPts * 2);
    const indices = [];
    const ruban = (debut, n, force) => {
      for (let k = 0; k <= n; k++) for (let j = 0; j < 2; j++) { bordE[(debut + k) * 2 + j] = j ? 1 : -1; longE[(debut + k) * 2 + j] = k / n; forceE[(debut + k) * 2 + j] = force; }
      for (let k = 0; k < n; k++) { const a = (debut + k) * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    };
    ruban(0, K, 1);
    ruban(K + 1, KB, 0.5);
    ruban(K + 1 + KB + 1, KB, 0.5);
    const geoE = new THREE.BufferGeometry();
    const aPosE = new THREE.BufferAttribute(posE, 3);
    aPosE.setUsage(THREE.DynamicDrawUsage);
    geoE.setAttribute("position", aPosE);
    geoE.setAttribute("aBord", new THREE.BufferAttribute(bordE, 1));
    geoE.setAttribute("aLong", new THREE.BufferAttribute(longE, 1));
    geoE.setAttribute("aForce", new THREE.BufferAttribute(forceE, 1));
    geoE.setIndex(indices);
    const uE = { uA: { value: 0 } };
    const eclair = new THREE.Mesh(geoE, new THREE.ShaderMaterial({
      uniforms: uE,
      vertexShader: "attribute float aBord; attribute float aLong; attribute float aForce; varying float vB; varying float vL; varying float vF; void main() { vB = aBord; vL = aLong; vF = aForce; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `
        uniform float uA; varying float vB; varying float vL; varying float vF;
        void main() {
          float d = abs(vB);
          float coeur = smoothstep(0.3, 0.06, d);
          float halo = (1.0 - d) * (1.0 - d) * 0.42;
          float bouts = smoothstep(0.0, 0.1, vL) * mix(1.0, 1.0 - vL * 0.85, step(vF, 0.9)); // il sort de la nuée ; une branche s'éteint au bout
          gl_FragColor = vec4(mix(vec3(0.5, 0.78, 1.0), vec3(1.0, 1.0, 1.0), coeur), (coeur + halo) * bouts * vF * uA);
        }`,
      transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    }));
    eclair.frustumCulled = false;
    eclair.visible = false;
    const lueur = (c) => new THREE.Sprite(new THREE.SpriteMaterial({ map: pastille(), color: c, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
    const eclat = lueur(0xcfe8ff); // là où il tombe
    const ventre = lueur(0xbcdcff); // dans la nuée, au-dessus
    const sourd = lueur(0xa9c8f5); // les éclairs sourds, entre deux coups
    const etincelle = lueur(0xd6f4ff); // celle qui court le long du câble
    const flammes = bocaux.map((p) => { const f = lueur(0xa8f0ff); f.position.copy(p); return f; });
    feu.add(eclair, eclat, ventre, sourd, etincelle, ...flammes);
    g.userData.calque = feu;
    // la nuit, l'éclair éclaire l'île : une lueur dont le rayon suit le coup (voir chargerIle)
    const jour = { x: r.position.x, y: r.position.y - 2.5, z: r.position.z, r: 0, c: [0.72, 0.88, 1], fixe: true }; // autour du Pic
    const jourBas = { x: 0, y: 1.6, z: 0, r: 0, c: [0.72, 0.88, 1], fixe: true }; // et toute l'île, avec la mer autour (une lueur très large : la lumière d'une lanterne tombe vite)
    g.userData.lueurs = [jour, jourBas];
    let oeil = null;
    eclat.onBeforeRender = (renderer, scene, camera) => { oeil = camera; };
    const origine = new THREE.Vector3(), vers = new THREE.Vector3(), tang = new THREE.Vector3(), cote = new THREE.Vector3();
    const tracerRuban = (pts, debut, large) => {
      for (let k = 0; k < pts.length; k++) {
        tang.subVectors(pts[Math.min(pts.length - 1, k + 1)], pts[Math.max(0, k - 1)]);
        vers.subVectors(origine, pts[k]);
        cote.crossVectors(tang, vers).normalize().multiplyScalar(large);
        const a = (debut + k) * 6;
        posE[a] = pts[k].x - cote.x; posE[a + 1] = pts[k].y - cote.y; posE[a + 2] = pts[k].z - cote.z;
        posE[a + 3] = pts[k].x + cote.x; posE[a + 4] = pts[k].y + cote.y; posE[a + 5] = pts[k].z + cote.z;
      }
    };
    let coup = null; // { t0, cible, grand }
    let numero = 0, prochain = 1.2, avant = 0;
    const frapper = (s) => {
      const n = numero++;
      const grand = !ailleurs.length || alea(n * 5 + 1) < 0.55;
      const cible = grand ? new THREE.Vector3(0, 0, 0) : ailleurs[Math.floor(alea(n * 5 + 2) * ailleurs.length) % ailleurs.length];
      const depart = new THREE.Vector3(cible.x * 0.55 + (alea(n * 5 + 3) - 0.5) * 2.6, haut * (0.86 + alea(n * 5 + 4) * 0.2), cible.z * 0.55 + (alea(n * 5 + 5) - 0.5) * 1.6);
      const long = depart.distanceTo(cible);
      // où est l'œil, vu d'ici (le calque est posé au repère, sans tourner)
      if (oeil) { feu.getWorldPosition(origine); origine.subVectors(oeil.position, origine); } else origine.set(0, 12, 30);
      const pts = [];
      for (let k = 0; k <= K; k++) {
        const t = k / K;
        const ampl = 0.085 * long * (1 - t * t * t) * (k ? 1 : 0.4);
        pts.push(new THREE.Vector3().lerpVectors(depart, cible, t).add(new THREE.Vector3((alea(n * 91 + k * 3) - 0.5) * 2 * ampl, (alea(n * 91 + k * 3 + 1) - 0.5) * ampl * 0.5, (alea(n * 91 + k * 3 + 2) - 0.5) * ampl)));
      }
      pts[K].copy(cible);
      tracerRuban(pts, 0, 0.27);
      for (let b = 0; b < 2; b++) {
        const k0 = 3 + Math.floor(alea(n * 13 + b) * 6) + b * 2;
        const sens = alea(n * 17 + b) < 0.5 ? -1 : 1;
        const br = [pts[k0].clone()];
        for (let k = 1; k <= KB; k++) br.push(br[k - 1].clone().add(new THREE.Vector3(sens * long * (0.05 + alea(n * 23 + b * 7 + k) * 0.06), -long * (0.035 + alea(n * 29 + b * 7 + k) * 0.05), (alea(n * 31 + b * 7 + k) - 0.5) * long * 0.05)));
        tracerRuban(br, K + 1 + b * (KB + 1), 0.16);
      }
      aPosE.needsUpdate = true;
      eclat.position.copy(cible);
      ventre.position.copy(depart);
      coup = { t0: s, cible, grand, tiers: alea(n * 5 + 6) < 0.6 };
    };
    // la force du coup au fil du temps : deux ou trois décharges, puis la lueur qui retombe
    const enveloppe = (t, tiers) => t < 0 ? 0 : t < 0.06 ? 1 : t < 0.11 ? 0.12 : t < 0.2 ? 1 : t < 0.26 ? 0.25 : t < 0.32 ? (tiers ? 0.85 : 0.2) : (tiers ? 0.85 : 0.2) * Math.exp(-(t - 0.32) / 0.13);
    const surCable = new THREE.Vector3();
    maj = (s) => {
      const L = lampesAllumees;
      if (s < avant - 1 || s > prochain + 30) { prochain = s + 0.8; coup = null; } // l'horloge a sauté
      avant = s;
      if (s >= prochain) { frapper(s); prochain = s + cadence * (0.45 + alea(numero * 5 + 7) * 1.1); }
      const t = coup ? (s - coup.t0) / lent : 99;
      const e = coup ? enveloppe(t, coup.tiers) : 0;
      const fort = coup?.grand ? 1 : 0.7;
      // les nuées tournent, respirent, et s'allument de l'intérieur
      const es = Math.pow(Math.max(0, Math.sin(s * 1.9) * Math.sin(s * 0.83 + 1.3)), 6); // un éclair sourd, de temps en temps
      const ks = Math.floor(s * 1.9 / Math.PI);
      const as = alea(ks) * 6.283, ds = rayon * 0.3 * alea(ks + 50);
      sourd.position.set(centre.x * 0.5 + Math.cos(as) * ds, haut + 0.6, centre.z * 0.5 + Math.sin(as) * ds);
      sourd.scale.set(6.5, 3, 1);
      sourd.material.opacity = es * (0.2 + 0.25 * L);
      for (const nu of nuees) {
        const u = nu.userData;
        const a = u.a + s * 0.016;
        nu.position.set(centre.x * 0.45 + Math.cos(a) * u.d, u.y + Math.sin(s * 0.21 + u.a) * 0.12, centre.z * 0.45 + Math.sin(a) * u.d * 0.8);
        const souffle = 1 + Math.sin(s * 0.17 + u.a * 3) * 0.05;
        nu.scale.set(u.l * souffle, u.h, 1);
        const pres = coup ? Math.max(0, 1 - Math.hypot(nu.position.x - ventre.position.x, nu.position.z - ventre.position.z) / (rayon * 0.7)) : 0;
        const vs = Math.max(0, 1 - nu.position.distanceTo(sourd.position) / 4.5) * es * 0.5;
        nu.material.color.copy(u.base).lerp(VIF, Math.min(0.85, e * fort * (0.25 + 0.6 * pres) + vs));
      }
      uPluie.uT.value = s;
      uPluie.uVif.value = Math.min(1, e * fort);
      // l'éclair, son éclat, la nuée qui s'allume
      eclair.visible = e > 0.06;
      uE.uA.value = Math.min(1, e * 1.15) * fort;
      eclat.scale.setScalar((1.6 + 2.6 * e) * (1 + 0.9 * L) * fort);
      eclat.material.opacity = Math.min(1, e) * (0.55 + 0.35 * L);
      ventre.scale.set(9 * fort, 4.2, 1);
      ventre.material.opacity = Math.min(1, e) * (0.34 + 0.3 * L);
      jour.r = L > 0.02 ? 12.5 * Math.min(1, e) * fort : 0;
      jourBas.r = jour.r * 4;
      // l'étincelle descend le câble, puis les bocaux flambent
      const tc = coup?.grand && cable.length > 1 ? (t - 0.12) / 0.55 : -1;
      if (tc >= 0 && tc <= 1) {
        const f = tc * (cable.length - 1), k = Math.min(cable.length - 2, Math.floor(f));
        surCable.lerpVectors(cable[k], cable[k + 1], f - k);
        etincelle.position.copy(surCable);
        etincelle.scale.setScalar(0.5 + 0.35 * Math.sin(s * 60) + 0.5 * L);
        etincelle.material.opacity = 0.95;
      } else etincelle.material.opacity = 0;
      const tb = coup?.grand ? t - 0.67 : -1;
      const flambe = tb >= 0 ? Math.exp(-tb / 0.9) * Math.min(1, tb * 14) : 0;
      for (let k = 0; k < flammes.length; k++) {
        const veille = 0.5 + 0.5 * Math.sin(s * 2.3 + k * 2.1); // elle bat doucement, comme un cœur
        flammes[k].scale.setScalar(0.5 + 0.12 * veille + (0.25 + 0.14 * veille) * L + flambe * (0.8 + 0.6 * L));
        flammes[k].material.opacity = Math.min(1, 0.1 + 0.07 * veille + (0.3 + 0.12 * veille) * L + flambe * 0.7);
      }
    };
  } else if (genre === "heures") {
    // l'Île-Horloge sonne les heures de Paris (voir sonnerieParis). À l'heure pile, le coucou de laiton (un oiseau à clé de
    // remontoir) sort au sud de la chambre des cloches et salue à chaque coup ; la cloche s'emballe, les engrenages filent, le
    // balancier bat plus fort (animateurs : « sonne ») ; à chaque coup (toutes les 1,8 s), une onde dorée part de la cloche,
    // passe au-dessus de l'île et s'étale sur la mer, les évents crachent leur vapeur, l'index de l'heure s'allume et son
    // chiffre, sur le cercle des heures, s'illumine. Aux quarts : un seul coup, léger, sans le coucou. La nuit, le cadran est
    // lumineux comme une montre : les douze index de l'herbe, la lunette du bord, les cadrans de la tour. Le cercle des
    // heures : douze chiffres romains dorés qui flottent autour de l'île et tournent lentement (un tour en 6 minutes).
    // Ce qui luit est dans le calque (après la teinte de la nuit) : la tour y est refaite sans couleur, pour cacher ce qui
    // est derrière elle.
    const d = r.userData;
    const ici = (t, k) => new THREE.Vector3(t[k] - r.position.x, t[k + 2] - r.position.y, -t[k + 1] - r.position.z);
    const liste = (t) => { const o = []; if (Array.isArray(t)) for (let k = 0; k + 2 < t.length; k += 3) o.push(ici(t, k)); return o; };
    const calque = new THREE.Group();
    g.userData.calque = calque;
    const mer = 0.06 - r.position.y;
    const cloche = Array.isArray(d.cloche) ? ici(d.cloche, 0) : new THREE.Vector3(0, 4.7, 0);
    const events = liste(d.events);
    const rayon = d.rayon || 8;
    const haut = d.haut ?? 2.3;
    const lisse = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const alea = (n) => { const x = Math.sin(n * 127.1 + 11.7) * 43758.5453; return x - Math.floor(x); };
    // --- la profondeur, dans le calque : on la remet à zéro, puis la tour (sans couleur) la remplit ---
    const efface = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0.001, 0), new THREE.Vector3(0.001, 0, 0)]), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false }));
    efface.frustumCulled = false;
    efface.renderOrder = -20;
    efface.onBeforeRender = (renderer) => renderer.clearDepth();
    calque.add(efface);
    const cache = new THREE.MeshBasicMaterial({ colorWrite: false });
    const bloc = (geo, x, y, z) => { const m = new THREE.Mesh(geo, cache); m.position.set(x, y, z); m.renderOrder = -10; calque.add(m); return m; };
    bloc(new THREE.BoxGeometry(1.2, 4.2, 1.2), 0, 2.2, 0); // le fût
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) bloc(new THREE.BoxGeometry(0.22, 0.8, 0.22), sx * 0.49, 4.45, sz * 0.49); // les piliers de la chambre des cloches
    bloc(new THREE.BoxGeometry(1.34, 0.1, 1.34), 0, 4.9, 0);
    bloc(new THREE.ConeGeometry(0.68 * Math.SQRT2, 1.9, 4), 0, 5.9, 0).rotation.y = Math.PI / 4; // la flèche
    // --- le cadran lumineux : les index de l'herbe (une matière par heure : ils s'allument un à un), la lunette, les cadrans ---
    const lueur = (c, plus = {}) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, ...plus });
    const index = new Map(); // heure (0 : XII) → [cœur, halo]
    const q = Array.isArray(d.index) ? d.index : [];
    const hs = Array.isArray(d.heure) ? d.heure : [];
    const e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
    for (let j = 0; j * 12 + 11 < q.length; j++) {
      const h = hs[j] ?? 0;
      if (!index.has(h)) index.set(h, [lueur(0xb6ffd9), lueur(0x7dffc0)]);
      const c = [0, 1, 2, 3].map((m) => ici(q, j * 12 + m * 3));
      const [coeur, halo] = index.get(h);
      calque.add(new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([c[0], c[1], c[2], c[0], c[2], c[3]]), coeur));
      e1.subVectors(c[1], c[0]).normalize().multiplyScalar(0.07);
      e2.subVectors(c[3], c[0]).normalize().multiplyScalar(0.07);
      const l = [c[0].clone().sub(e1).sub(e2), c[1].clone().add(e1).sub(e2), c[2].clone().add(e1).add(e2), c[3].clone().sub(e1).add(e2)];
      for (const p of l) p.y += 0.004;
      calque.add(new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([l[0], l[1], l[2], l[0], l[2], l[3]]), halo));
    }
    const ptsLunette = liste(d.lunette);
    const matLunette = lueur(0xffc867);
    if (ptsLunette.length > 1) calque.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ptsLunette), ptsLunette.length * 3, 0.06, 6, false), matLunette));
    const matCadran = lueur(0xfff0c4);
    for (let k = 0; k < 4; k++) { // les quatre cadrans de la tour (le centre à 3,24 au-dessus du pied, à 0,6 du milieu)
      const a = k * Math.PI / 2;
      const disque = new THREE.Mesh(new THREE.CircleGeometry(0.47, 24), matCadran);
      disque.position.set(Math.sin(a) * 0.63, 3.24, Math.cos(a) * 0.63);
      disque.rotation.y = a;
      calque.add(disque);
    }
    // --- le cercle des heures : douze chiffres romains dorés, chacun avec son halo (la nuit) ---
    const ROMAINS = ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"]; // (IIII : comme sur les vieux cadrans)
    const chiffres = ROMAINS.map((txt, k) => {
      const l = 40 + txt.length * 62;
      const tex = toile(l, 128, (x, L, H) => {
        x.font = 'bold 104px Georgia, "Times New Roman", serif';
        x.textAlign = "center";
        x.textBaseline = "middle";
        x.lineJoin = "round";
        x.lineWidth = 12;
        x.strokeStyle = "rgba(58, 34, 10, 0.9)";
        x.strokeText(txt, L / 2, H / 2 + 6);
        const dg = x.createLinearGradient(0, 18, 0, 112);
        dg.addColorStop(0, "#fff4c2");
        dg.addColorStop(0.45, "#e9bf55");
        dg.addColorStop(1, "#a8731f");
        x.fillStyle = dg;
        x.fillText(txt, L / 2, H / 2 + 6);
      });
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: pastille(), color: 0xffc95c, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.renderOrder = 2;
      h.renderOrder = 1;
      calque.add(h, s);
      return { s, h, l: l / 128 };
    });
    // --- le coucou : il attend dans la chambre des cloches, et sort au sud sur son perchoir (dans la scène : la nuit le teinte) ---
    const pc = Array.isArray(d.coucou) ? ici(d.coucou, 0) : new THREE.Vector3(0, 4.12, 0.62);
    const mat = (c) => new THREE.MeshBasicMaterial({ color: c });
    const LAITON = mat(0xd0a64c), LAITON2 = mat(0x9b7631), BOIS = mat(0x4b2e1b), BEC = mat(0xd5652a), NOIR = mat(0x15110c), CLE = mat(0xead083);
    const niche = new THREE.Group();
    niche.position.copy(pc);
    niche.scale.setScalar(2.4); // (l'oiseau est dessiné à 15 cm : à cette taille, on le voit de loin)
    g.add(niche);
    const oiseau = new THREE.Group(); // il regarde vers +z (le sud, le large)
    const perchoir = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.016, 0.3), BOIS);
    perchoir.position.set(0, -0.075, -0.06);
    const corps = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 9), LAITON);
    corps.scale.set(0.9, 0.82, 1.3);
    const tete = new THREE.Group();
    tete.position.set(0, 0.062, 0.07);
    const crane = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 8), LAITON);
    const haut_ = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.05, 6), BEC);
    haut_.rotation.x = Math.PI / 2;
    haut_.position.set(0, 0.006, 0.066);
    const bas_ = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.04, 6), BEC);
    const machoire = new THREE.Group();
    machoire.position.set(0, -0.008, 0.042);
    bas_.rotation.x = Math.PI / 2;
    bas_.position.z = 0.02;
    machoire.add(bas_);
    const yeux = [-1, 1].map((sx) => { const o = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 4), NOIR); o.position.set(sx * 0.03, 0.014, 0.034); return o; });
    const crete = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.01, 8), LAITON2); // un petit rouage sur la tête
    crete.rotation.z = Math.PI / 2;
    crete.position.set(0, 0.05, -0.004);
    tete.add(crane, haut_, machoire, crete, ...yeux);
    const queue = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.1), LAITON2);
    queue.position.set(0, 0.02, -0.12);
    queue.rotation.x = 0.45;
    const ailes = [-1, 1].map((sx) => {
      const a = new THREE.Group();
      a.position.set(sx * 0.058, 0.012, 0.0);
      const plume = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.05, 0.11), LAITON2);
      plume.position.set(0, -0.004, -0.02);
      a.add(plume);
      a.userData.sx = sx;
      return a;
    });
    const cle = new THREE.Group(); // la clé de remontoir, dans son dos
    cle.position.set(0, 0.03, -0.075);
    const tige = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 5), CLE);
    tige.rotation.x = Math.PI / 2;
    tige.position.z = -0.02;
    const anneau = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.007, 5, 10), CLE);
    anneau.position.z = -0.05;
    anneau.rotation.y = Math.PI / 2;
    cle.add(tige, anneau);
    oiseau.add(perchoir, corps, tete, queue, cle, ...ailes);
    oiseau.visible = false;
    niche.add(oiseau);
    // --- les ondes dorées (au calque) et les bouffées de vapeur (dans la scène) : des réserves que l'on recycle ---
    const ondes = Array.from({ length: 6 }, () => {
      const o = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 96), lueur(0xffd27a, { side: THREE.DoubleSide }));
      o.rotation.x = -Math.PI / 2;
      o.visible = false;
      o.userData = { t0: -99, force: 0 };
      calque.add(o);
      return o;
    });
    const bouffees = Array.from({ length: Math.max(6, events.length * 5) }, () => {
      const b = new THREE.Sprite(new THREE.SpriteMaterial({ map: pastille(), color: 0xf3efe6, transparent: true, opacity: 0, depthWrite: false }));
      b.visible = false;
      b.userData = { t0: -99, ou: new THREE.Vector3(), vx: 0, vz: 0, force: 0 };
      g.add(b);
      return b;
    });
    let nO = 0, nB = 0, kVu = 0;
    const coup = (s, so) => {
      const o = ondes[nO++ % ondes.length];
      o.userData.t0 = s;
      o.userData.force = so.quart ? 0.55 : 1;
      for (let e = 0; e < events.length; e++) {
        for (let j = 0; j < (so.quart ? 1 : 2); j++) {
          const b = bouffees[nB++ % bouffees.length];
          const a = alea(nB * 3.1) * 6.283;
          b.userData.t0 = s + j * 0.18;
          b.userData.ou.copy(events[e]);
          b.userData.vx = Math.cos(a) * 0.35;
          b.userData.vz = Math.sin(a) * 0.35;
          b.userData.force = so.quart ? 0.6 : 1;
        }
      }
    };
    maj = (s) => {
      const L = lampesAllumees;
      const so = sonnerieParis();
      // les coups : une onde et de la vapeur pour chacun (si l'on arrive en pleine sonnerie : seulement le dernier)
      if (so.k < kVu) kVu = so.k; // une autre sonnerie, ou la fin de celle-ci
      if (so.k > kVu) { coup(s, so); kVu = so.k; }
      for (const o of ondes) {
        const p = (s - o.userData.t0) / 3.4;
        o.visible = p >= 0 && p < 1;
        if (!o.visible) continue;
        const rr = 0.6 + 9.6 * (1 - (1 - p) * (1 - p));
        o.scale.set(rr, rr, 1);
        o.position.set(cloche.x, cloche.y + (mer - cloche.y) * lisse(0.32, 0.68, p), cloche.z);
        o.material.opacity = Math.pow(1 - p, 1.5) * o.userData.force * (0.5 + 0.4 * L);
      }
      for (const b of bouffees) {
        const p = (s - b.userData.t0) / 2.3;
        b.visible = p >= 0 && p < 1;
        if (!b.visible) continue;
        const u = b.userData;
        b.position.set(u.ou.x + u.vx * p, u.ou.y + 0.1 + p * 1.5, u.ou.z + u.vz * p);
        b.scale.setScalar(0.28 + 1.0 * p);
        b.material.opacity = 0.78 * Math.pow(1 - p, 1.3) * u.force * Math.min(1, p * 8);
      }
      // le cadran lumineux : il respire la nuit ; à chaque coup, l'index de l'heure s'allume (un à un, autour du cadran)
      for (const [h, [coeur, halo]] of index) {
        const m = h || 12; // le coup qui l'allume (XII : le douzième)
        const allume = so.k >= m && !so.quart ? so.f * (0.55 + 0.45 * Math.exp(-(so.t - SONNE.debut - (m - 1) * SONNE.ecart) * 1.2)) : 0;
        const v = Math.min(1, L * (0.6 + 0.12 * Math.sin(s * 1.1 + h)) + allume * 0.9);
        coeur.opacity = v;
        halo.opacity = v * 0.38;
      }
      matLunette.opacity = Math.min(0.6, L * 0.26 + so.f * 0.14);
      matCadran.opacity = L * 0.36;
      // le cercle des heures : il tourne dans le sens des aiguilles (vu d'en haut) et flotte sur la mer
      const rot = -s * Math.PI * 2 / 360;
      const heureLa = Math.floor(secondesParis() / 3600) % 12; // l'heure qu'il est (0 : XII)
      for (let k = 0; k < 12; k++) {
        const c = chiffres[k];
        const a = Math.PI / 2 - k * Math.PI / 6 + rot;
        const x = Math.cos(a) * rayon, y = Math.sin(a) * rayon;
        c.s.position.set(x - r.position.x, haut + Math.sin(s * 0.8 + k * 1.7) * 0.16 - r.position.y, -y - r.position.z);
        c.h.position.copy(c.s.position);
        const m = k || 12;
        const eclat = so.k >= m && !so.quart ? so.f * Math.exp(-(so.t - SONNE.debut - (m - 1) * SONNE.ecart) * 0.9) : 0;
        const ici_ = k === heureLa ? 1 : 0;
        const t_ = 0.82 * (1 + 0.12 * ici_ + 0.35 * eclat);
        c.s.scale.set(t_ * c.l, t_, 1);
        c.s.material.opacity = 0.9 + 0.1 * L;
        c.h.scale.setScalar(t_ * (1.9 + 0.6 * eclat));
        c.h.material.opacity = Math.min(1, L * (0.32 + 0.2 * ici_) + eclat * 0.75);
      }
      // le coucou : il glisse sur son perchoir, salue à chaque coup (le bec, les ailes), la clé tourne dans son dos
      const sort = so.quart ? 0 : lisse(0.2, 1.3, so.t) * (1 - lisse(so.fin - 1.5, so.fin - 0.5, so.t));
      oiseau.visible = sort > 0.01;
      if (oiseau.visible) {
        const salut = so.k ? Math.exp(-so.dk * 4.5) : 0;
        oiseau.position.set(0, 0.055 + salut * 0.02, -0.12 + sort * 0.22);
        oiseau.rotation.x = salut * 0.42;
        machoire.rotation.x = salut * 0.6;
        tete.rotation.x = -salut * 0.25;
        for (const a of ailes) a.rotation.z = a.userData.sx * salut * (0.7 + 0.3 * Math.sin(so.dk * 26));
        cle.rotation.z = so.t * 5;
      }
    };
  } else if (genre === "sommeil") {
    // l'Île des Géants : le géant dort à poings fermés. Toutes les « cadence » secondes, trois « Z » montent de son visage
    // et s'envolent (le dernier plus gros), un peu plus fort une fois sur trois (il ronfle) ; et il rêve : de temps en temps
    // une bulle monte de son front, avec dedans ce dont il rêve (une étoile, la lune, un poisson, un navire, une baleine,
    // un nuage), et elle éclate tout en haut. Dans le calque : la nuit, ils restent clairs.
    const d = r.userData;
    const cadence = Math.max(4, d.cadence || 8);
    const calque = new THREE.Group();
    g.userData.calque = calque;
    const alea = (n) => { const x = Math.sin(n * 127.1 + 11.7) * 43758.5453; return x - Math.floor(x); };
    const lettre = toile(128, 128, (x, l) => {
      x.font = 'bold 108px "Trebuchet MS", Verdana, sans-serif';
      x.textAlign = "center";
      x.textBaseline = "middle";
      x.lineJoin = "round";
      x.lineWidth = 16;
      x.strokeStyle = "rgba(38, 66, 112, 0.9)";
      x.strokeText("Z", l / 2, l / 2 + 4);
      x.fillStyle = "#f5f9ff";
      x.fillText("Z", l / 2, l / 2 + 4);
    });
    const zeds = Array.from({ length: 9 }, () => {
      const z = new THREE.Sprite(new THREE.SpriteMaterial({ map: lettre, transparent: true, opacity: 0, depthWrite: false, depthTest: false }));
      z.visible = false;
      calque.add(z);
      return z;
    });
    const REVES = ["etoile", "lune", "poisson", "navire", "baleine", "nuage"];
    const images = REVES.map((nom) => toile(128, 128, (x, l) => dessinReve(x, l, nom)));
    const bulles = Array.from({ length: 3 }, () => {
      const b = new THREE.Sprite(new THREE.SpriteMaterial({ map: images[0], transparent: true, opacity: 0, depthWrite: false, depthTest: false }));
      b.visible = false;
      calque.add(b);
      return b;
    });
    const lisse = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    maj = (s) => {
      const L = lampesAllumees;
      // les Z : trois par souffle, à 0,9 s l'un de l'autre (ils montent en file, sans se chevaucher) ; chacun vit 4,6 s
      const n = Math.floor(s / cadence);
      for (let j = 0; j < 9; j++) {
        const cycle = n - Math.floor(j / 3), rang = j % 3;
        const t = s - cycle * cadence - rang * 0.9;
        const z = zeds[j];
        z.visible = cycle >= 0 && t >= 0 && t < 4.6;
        if (!z.visible) continue;
        const fort = cycle % 3 === 2 ? 1.3 : 1; // il ronfle
        const p = t / 4.6;
        z.position.set(-0.25 - 0.9 * p + Math.sin(t * 2.2 + j) * 0.1, 0.3 + p * 3.0, -0.15 * p);
        const taille = (0.26 + rang * 0.1) * fort * (0.75 + 0.6 * p);
        z.scale.set(taille, taille, 1);
        z.material.rotation = Math.sin(t * 1.7 + j) * 0.25 - 0.15;
        z.material.opacity = lisse(0, 0.35, t) * (1 - lisse(3.0, 4.6, t)) * (0.92 + 0.08 * L);
      }
      // les rêves : une bulle toutes les 1,6 × cadence, qui vit 7 s
      const per = cadence * 1.6;
      const m = Math.floor(s / per);
      for (let j = 0; j < bulles.length; j++) {
        const num = m - j;
        const t = s - num * per - per * 0.4;
        const b = bulles[j];
        b.visible = num >= 0 && t >= 0 && t < 7;
        if (!b.visible) continue;
        const reve = images[Math.floor(alea(num * 3.7) * images.length) % images.length];
        if (b.material.map !== reve) { b.material.map = reve; b.material.needsUpdate = true; }
        const p = t / 7;
        const eclate = lisse(6.5, 7, t);
        b.position.set(0.3 + Math.sin(t * 0.9 + num) * 0.25, 0.6 + p * 3.0, 0.25 + Math.cos(t * 0.7 + num) * 0.15);
        const taille = (0.75 + 0.35 * lisse(0, 1.5, t)) * (1 + eclate * 0.5);
        b.scale.set(taille, taille, 1);
        b.material.opacity = lisse(0, 0.8, t) * (1 - eclate) * (0.75 + 0.25 * L);
      }
    };
  } else if (genre === "garde") {
    // la Forteresse : à chaque heure de Paris, elle répond à l'Île-Horloge par une salve, un coup de canon par heure, au
    // rythme de sa cloche (voir sonnerieParis), tiré tour à tour par les canons des bastions : l'éclair à la gueule, la
    // fumée, puis la gerbe d'eau là où le boulet tombe, au large. La nuit, deux projecteurs balaient la mer depuis le donjon.
    const d = r.userData;
    const ici = (t, k) => new THREE.Vector3(t[k] - r.position.x, t[k + 2] - r.position.y, -t[k + 1] - r.position.z);
    const lisse = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const alea = (n) => { const x = Math.sin(n * 127.1 + 11.7) * 43758.5453; return x - Math.floor(x); };
    const calque = new THREE.Group();
    g.userData.calque = calque;
    const mer = 0.05 - r.position.y;
    const c = Array.isArray(d.canons) ? d.canons : [];
    const canons = [];
    for (let k = 0; k + 3 < c.length; k += 4) {
      const dir = new THREE.Vector3(Math.cos(c[k + 3]), 0, -Math.sin(c[k + 3]));
      canons.push({ gueule: ici(c, k).addScaledVector(dir, 0.36).add(new THREE.Vector3(0, 0.15, 0)), dir });
    }
    const lueur = (couleur) => new THREE.Sprite(new THREE.SpriteMaterial({ map: pastille(), color: couleur, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
    const tirs = Array.from({ length: 4 }, () => {
      const eclair = lueur(0xffb04a);
      const fumees = Array.from({ length: 4 }, () => { const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: pastille(), color: 0xe8e4dc, transparent: true, opacity: 0, depthWrite: false })); g.add(f); return f; });
      const gerbe = new THREE.Sprite(new THREE.SpriteMaterial({ map: pastille(), color: 0xf2fbff, transparent: true, opacity: 0, depthWrite: false }));
      const rond = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      rond.rotation.x = -Math.PI / 2;
      calque.add(eclair);
      g.add(gerbe, rond);
      return { eclair, fumees, gerbe, rond, t0: -99, canon: null, chute: new THREE.Vector3() };
    });
    // les projecteurs : deux cônes de lumière, dos à dos, qui tournent lentement (la nuit seulement)
    const pivot = new THREE.Group();
    if (Array.isArray(d.donjon)) pivot.position.copy(ici(d.donjon, 0));
    for (const sens of [1, -1]) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.5, 9, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0b8, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
      cone.rotation.z = sens * (Math.PI / 2 - 0.12); // couché, la lumière un peu vers la mer
      cone.position.set(sens * 4.5, -0.55, 0);
      pivot.add(cone);
    }
    calque.add(pivot);
    let nT = 0, kVu = 0;
    maj = (s) => {
      const L = lampesAllumees;
      const so = sonnerieParis();
      if (so.k < kVu) kVu = so.k;
      if (so.k > kVu && !so.quart && canons.length) {
        const t = tirs[nT++ % tirs.length];
        t.t0 = s;
        t.canon = canons[(so.k - 1) % canons.length];
        t.chute.copy(t.canon.gueule).addScaledVector(t.canon.dir, 4.2 + alea(so.k * 7.3) * 2.2);
        t.chute.y = mer;
        kVu = so.k;
      }
      for (const t of tirs) {
        const a = s - t.t0;
        const vu = t.canon && a >= 0 && a < 4.5;
        t.eclair.visible = vu && a < 0.45;
        if (t.eclair.visible) {
          t.eclair.position.copy(t.canon.gueule).addScaledVector(t.canon.dir, 0.15);
          t.eclair.scale.setScalar(0.8 + 2.4 * Math.sin(Math.min(1, a / 0.45) * Math.PI));
          t.eclair.material.opacity = 1 - a / 0.45;
        }
        t.fumees.forEach((f, j) => {
          const b = a - j * 0.07;
          f.visible = vu && b >= 0 && b < 3.2;
          if (!f.visible) return;
          const p = b / 3.2;
          f.position.copy(t.canon.gueule).addScaledVector(t.canon.dir, 0.3 + 0.9 * Math.sqrt(p) + j * 0.14);
          f.position.y += p * 0.7 + j * 0.06;
          f.scale.setScalar(0.4 + 1.1 * p + j * 0.08);
          f.material.opacity = 0.85 * Math.pow(1 - p, 1.3) * Math.min(1, b * 10);
        });
        const e = a - 1.1; // le boulet est tombé
        t.gerbe.visible = vu && e >= 0 && e < 1.3;
        if (t.gerbe.visible) {
          const h = Math.sin(Math.min(1, e / 1.3) * Math.PI);
          t.gerbe.position.set(t.chute.x, mer + 0.45 * h, t.chute.z);
          t.gerbe.scale.set(0.6 + 0.3 * h, 0.3 + 1.6 * h, 1);
          t.gerbe.material.opacity = 0.9 * (1 - e / 1.3);
        }
        t.rond.visible = vu && e >= 0 && e < 2.5;
        if (t.rond.visible) {
          const p = e / 2.5;
          t.rond.position.copy(t.chute);
          t.rond.scale.setScalar(0.3 + 2.2 * p);
          t.rond.material.opacity = 0.7 * (1 - p);
        }
      }
      pivot.rotation.y = s * 0.16;
      pivot.visible = L > 0.02;
      for (const cone of pivot.children) cone.material.opacity = 0.11 * L;
    };
  } else if (genre === "cerfsvolants") {
    // la Plage des Moussaillons : les mousses font voler leurs cerfs-volants au-dessus de la plage, la ficelle nouée à un
    // piquet dans le sable ; ils dansent dans le vent (un huit lent), leur queue de nœuds ondule, la ficelle pend un peu.
    const d = r.userData;
    const ici = (t, k) => new THREE.Vector3(t[k] - r.position.x, t[k + 2] - r.position.y, -t[k + 1] - r.position.z);
    const ancres = [];
    if (Array.isArray(d.ancres)) for (let k = 0; k + 2 < d.ancres.length; k += 3) ancres.push(ici(d.ancres, k));
    const vent = new THREE.Vector3(d.vent?.[0] ?? 0.3, 0, -(d.vent?.[1] ?? 1)).normalize(); // (x, y de Blender)
    const HAUT = new THREE.Vector3(0, 1, 0);
    const COULEURS = [[0xe8463a, 0xffd23f], [0x2f7fd8, 0xf6f2e6], [0x37b36b, 0xff8f2e], [0x9b59d0, 0xffe066]];
    const bois = new THREE.MeshBasicMaterial({ color: 0x6b4a2b });
    const trait = new THREE.LineBasicMaterial({ color: 0x3a2a1c });
    const fil = new THREE.LineBasicMaterial({ color: 0xf1ead8, transparent: true, opacity: 0.85 });
    const tri = (a, b, c, couleur) => new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([a, b, c]), new THREE.MeshBasicMaterial({ color: couleur, side: THREE.DoubleSide }));
    const cerfs = ancres.map((a, k) => {
      const [c1, c2] = COULEURS[k % COULEURS.length];
      const piquet = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.3, 6), bois);
      piquet.position.copy(a).add(new THREE.Vector3(0, 0.15, 0));
      const cerf = new THREE.Group();
      const H = new THREE.Vector3(0, 0.65, 0), B = new THREE.Vector3(0, -0.72, 0), G = new THREE.Vector3(-0.42, 0.13, 0), D = new THREE.Vector3(0.42, 0.13, 0); // (1,3 fois la taille d'un vrai : on le voit de loin)
      cerf.add(tri(H, G, B, c1), tri(H, B, D, c2));
      cerf.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([H, B, G, D]), trait));
      const noeuds = Array.from({ length: 6 }, (_, j) => {
        const n = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.08), new THREE.MeshBasicMaterial({ color: j % 2 ? c1 : c2, side: THREE.DoubleSide }));
        g.add(n);
        return n;
      });
      const pos = new Float32Array(10 * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const ficelle = new THREE.Line(geo, fil);
      ficelle.frustumCulled = false;
      g.add(piquet, cerf, ficelle);
      return { a: piquet.position.clone().add(new THREE.Vector3(0, 0.15, 0)), cerf, noeuds, geo, pos, ph: k * 2.1, L: 3.3 + 0.4 * k };
    });
    const dir = new THREE.Vector3(), p = new THREE.Vector3(), x = new THREE.Vector3(), y = new THREE.Vector3(), z = new THREE.Vector3(), m = new THREE.Matrix4(), bas = new THREE.Vector3();
    maj = (s) => {
      for (const c of cerfs) {
        const el = 0.85 + 0.1 * Math.sin(0.6 * s + c.ph) + 0.08 * Math.sin(0.84 * s + 2 * c.ph);
        const az = 0.35 * Math.sin(0.42 * s + c.ph);
        dir.copy(vent).applyAxisAngle(HAUT, az);
        p.copy(c.a).addScaledVector(dir, c.L * Math.cos(el)).addScaledVector(HAUT, c.L * Math.sin(el));
        c.cerf.position.copy(p);
        // la face tournée vers le piquet, le nez vers le ciel ; il penche dans ses virages
        z.subVectors(c.a, p).normalize().addScaledVector(HAUT, 0.9).normalize();
        x.crossVectors(HAUT, z).normalize();
        y.crossVectors(z, x);
        m.makeBasis(x, y, z);
        c.cerf.quaternion.setFromRotationMatrix(m);
        c.cerf.rotateZ(-az * 0.9);
        // la ficelle : du piquet au cerf-volant, avec un peu de mou
        for (let j = 0; j < 10; j++) {
          const u = j / 9;
          c.pos[j * 3] = c.a.x + (p.x - c.a.x) * u;
          c.pos[j * 3 + 1] = c.a.y + (p.y - c.a.y) * u - 0.35 * 4 * u * (1 - u);
          c.pos[j * 3 + 2] = c.a.z + (p.z - c.a.z) * u;
        }
        c.geo.attributes.position.needsUpdate = true;
        // la queue : des nœuds qui pendent sous le cerf-volant et ondulent
        bas.set(0, -0.72, 0).applyQuaternion(c.cerf.quaternion).add(p);
        c.noeuds.forEach((n, j) => {
          const t = j + 1;
          n.position.copy(bas).addScaledVector(HAUT, -0.17 * t).addScaledVector(dir, 0.07 * t).addScaledVector(x, Math.sin(s * 4.2 - t * 0.9 + c.ph) * 0.05 * t);
          n.quaternion.copy(c.cerf.quaternion);
          n.rotateZ(Math.sin(s * 4.2 - t * 0.9) * 0.6);
        });
      }
    };
  } else if (genre === "meduses") {
    // le Récif des Murmures : des méduses flottent dans le lagon, leurs cloches translucides battent doucement et elles
    // tournent lentement autour du lagon ; la nuit, elles s'allument (bleu et rose, dans le calque) : c'est le murmure du récif.
    const d = r.userData;
    const nb = Math.max(1, Math.min(12, d.nb || 7));
    const rayon = d.rayon || 2.6;
    const eau = (d.mer ?? 0.03) - r.position.y;
    const calque = new THREE.Group();
    g.userData.calque = calque;
    const alea = (n) => { const v = Math.sin(n * 127.1 + 11.7) * 43758.5453; return v - Math.floor(v); };
    const TEINTES = [0x8fd8ff, 0xff9ad5, 0xb6a8ff];
    const meduses = Array.from({ length: nb }, (_, k) => {
      const c = TEINTES[k % TEINTES.length];
      const cloche = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55, depthWrite: false }));
      const coeur = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }));
      coeur.position.y = 0.05;
      cloche.add(coeur);
      const lueur = new THREE.Sprite(new THREE.SpriteMaterial({ map: pastille(), color: c, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
      g.add(cloche);
      calque.add(lueur);
      return { cloche, lueur, r: rayon * (0.35 + 0.65 * alea(k * 3 + 1)), a0: alea(k * 3 + 2) * Math.PI * 2, v: (0.03 + 0.04 * alea(k * 3 + 3)) * (k % 2 ? 1 : -1), ph: alea(k * 7) * 6.28 };
    });
    maj = (s) => {
      const L = lampesAllumees;
      for (const m of meduses) {
        const a = m.a0 + s * m.v;
        const x = Math.cos(a) * m.r - r.position.x, z = -Math.sin(a) * m.r - r.position.z;
        const bat = Math.sin(s * 2.1 + m.ph);
        m.cloche.position.set(x + Math.sin(s * 0.3 + m.ph) * 0.15, eau + 0.02 + 0.02 * bat, z);
        m.cloche.scale.set(1 - 0.08 * bat, 1 + 0.2 * bat, 1 - 0.08 * bat);
        m.lueur.position.set(m.cloche.position.x, eau + 0.12, m.cloche.position.z);
        m.lueur.scale.setScalar(0.9 + 0.25 * bat);
        m.lueur.material.opacity = L * (0.55 + 0.25 * bat);
      }
    };
  } else if (genre === "noyee") {
    // la Cité Engloutie : la ville respire encore sous le lagon. Des bulles remontent des rues noyées et crèvent à la
    // surface (un petit rond sur l'eau) ; la nuit, les fenêtres de la cité s'allument sous l'eau (des lueurs vertes et
    // dorées qui battent lentement, dans le calque). « points » : les endroits du lagon (x, y de Blender).
    const d = r.userData;
    const eau = (d.mer ?? 0.02) - r.position.y;
    const pts = [];
    if (Array.isArray(d.points)) for (let k = 0; k + 1 < d.points.length; k += 2) pts.push(new THREE.Vector3(d.points[k] - r.position.x, eau, -d.points[k + 1] - r.position.z));
    const calque = new THREE.Group();
    g.userData.calque = calque;
    const alea = (n) => { const v = Math.sin(n * 127.1 + 11.7) * 43758.5453; return v - Math.floor(v); };
    const bulles = pts.flatMap((p, k) => Array.from({ length: 2 }, (_, j) => {
      const b = new THREE.Sprite(new THREE.SpriteMaterial({ map: pastille(), color: 0xeaffff, transparent: true, opacity: 0, depthWrite: false }));
      const rond = new THREE.Mesh(new THREE.RingGeometry(0.75, 1, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      rond.rotation.x = -Math.PI / 2;
      g.add(b, rond);
      return { b, rond, p, per: 2.2 + alea(k * 5 + j) * 2.4, ph: alea(k * 9 + j * 3) * 10, dx: (alea(k * 11 + j) - 0.5) * 0.3, dz: (alea(k * 13 + j) - 0.5) * 0.3 };
    }));
    const COUL = [0x6dffd8, 0xffd27a];
    const fenetres = pts.map((p, k) => {
      const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: pastille(), color: COUL[k % 2], transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
      f.position.set(p.x + (alea(k * 17) - 0.5) * 0.4, eau + 0.02, p.z + (alea(k * 19) - 0.5) * 0.4);
      calque.add(f);
      return { f, ph: alea(k * 23) * 6.28 };
    });
    maj = (s) => {
      const L = lampesAllumees;
      for (const u of bulles) {
        const t = ((s + u.ph) % u.per) / u.per; // une bulle par période : elle monte (0 → 0,7), puis crève
        const x = u.p.x + u.dx, z = u.p.z + u.dz;
        u.b.visible = t < 0.78;
        if (u.b.visible) {
          u.b.position.set(x, eau - 0.06 + Math.min(1, t / 0.7) * 0.1, z);
          u.b.scale.setScalar(0.07 + 0.09 * Math.min(1, t / 0.7) + (t > 0.7 ? (t - 0.7) * 2 : 0));
          u.b.material.opacity = t > 0.7 ? 0.8 * (1 - (t - 0.7) / 0.08) : 0.8 * Math.min(1, t * 6);
        }
        const tr = (t - 0.72) / 0.28;
        u.rond.visible = tr >= 0 && tr <= 1;
        if (u.rond.visible) {
          u.rond.position.set(x, eau + 0.01, z);
          u.rond.scale.setScalar(0.06 + 0.32 * tr);
          u.rond.material.opacity = 0.55 * (1 - tr);
        }
      }
      for (const w of fenetres) {
        w.f.scale.setScalar(0.6 + 0.15 * Math.sin(s * 0.9 + w.ph));
        w.f.material.opacity = L * (0.42 + 0.22 * Math.sin(s * 0.7 + w.ph));
      }
    };
  } else if (genre === "lanternes") {
    // le Marché Flottant, la nuit : le marché lâche ses lanternes. Des lanternes de papier partent du pont de la Grande
    // Barge, du bout des pontons et du quai : elles se gonflent, montent en se balançant, dérivent avec le vent et
    // s'éteignent tout en haut. Sur l'eau des deux chenaux du sud, de petites lanternes posées sur l'eau descendent vers le
    // large, chacune dans sa flaque de lumière. Rien le jour (tout suit lampesAllumees). Dans le calque, pour rester vives :
    // la profondeur de l'île y est gardée, le mât et la halle les cachent. « departs » : d'où partent les grandes (x, y, z
    // de Blender) ; « chenaux » : les chemins des petites (« par » points x, y chacun) ; « vent » : vers où tout dérive.
    const d = r.userData;
    const ici = (x, y, z) => new THREE.Vector3(x - r.position.x, z - r.position.y, -y - r.position.z);
    const calque = new THREE.Group();
    g.userData.calque = calque;
    const alea = (n) => { const v = Math.sin(n * 127.1 + 11.7) * 43758.5453; return v - Math.floor(v); };
    const lisse = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const departs = [];
    if (Array.isArray(d.departs)) for (let k = 0; k + 2 < d.departs.length; k += 3) departs.push(ici(d.departs[k], d.departs[k + 1], d.departs[k + 2]));
    if (!departs.length) departs.push(ici(0, 0, 0.5));
    const eau = (d.mer ?? 0.02) - r.position.y;
    const par = d.par || 5;
    const chenaux = [];
    if (Array.isArray(d.chenaux)) for (let k = 0; k + 2 * par <= d.chenaux.length; k += 2 * par) {
      const pts = [];
      for (let j = 0; j < par; j++) pts.push(ici(d.chenaux[k + 2 * j], d.chenaux[k + 2 * j + 1], 0).setY(eau));
      chenaux.push(new THREE.CatmullRomCurve3(pts));
    }
    const vent = new THREE.Vector3(d.vent?.[0] ?? 0.5, 0, -(d.vent?.[1] ?? 0.3));
    const papier = toile(64, 96, (x, l, h) => {
      const corps = new Path2D(); // plus large en haut, le haut bombé ; le papier est clair en bas, où brûle la mèche
      corps.moveTo(l * 0.18, h * 0.1);
      corps.quadraticCurveTo(l * 0.5, h * 0.0, l * 0.82, h * 0.1);
      corps.lineTo(l * 0.7, h * 0.84);
      corps.quadraticCurveTo(l * 0.5, h * 0.9, l * 0.3, h * 0.84);
      corps.closePath();
      const gr = x.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, "#e2702a");
      gr.addColorStop(0.45, "#ffae48");
      gr.addColorStop(0.86, "#fff0b8");
      x.fillStyle = gr;
      x.fill(corps);
      x.save();
      x.clip(corps);
      const lu = x.createRadialGradient(l * 0.5, h * 0.74, 0, l * 0.5, h * 0.74, l * 0.38);
      lu.addColorStop(0, "rgba(255,255,236,0.95)");
      lu.addColorStop(1, "rgba(255,228,160,0)");
      x.fillStyle = lu;
      x.fillRect(0, 0, l, h);
      x.strokeStyle = "rgba(120,50,15,0.35)"; // les côtes de bambou
      x.lineWidth = 1.5;
      for (const u of [0.25, 0.5, 0.75]) {
        x.beginPath();
        x.moveTo(l * (0.18 + 0.64 * u), h * 0.06);
        x.lineTo(l * (0.3 + 0.4 * u), h * 0.86);
        x.stroke();
      }
      x.restore();
      x.strokeStyle = "rgba(90,40,10,0.8)"; // l'anneau du bas
      x.lineWidth = 2.5;
      x.beginPath();
      x.moveTo(l * 0.3, h * 0.85);
      x.quadraticCurveTo(l * 0.5, h * 0.91, l * 0.7, h * 0.85);
      x.stroke();
      const fl = x.createRadialGradient(l * 0.5, h * 0.9, 0, l * 0.5, h * 0.9, l * 0.13); // la mèche
      fl.addColorStop(0, "rgba(255,255,220,1)");
      fl.addColorStop(1, "rgba(255,180,60,0)");
      x.fillStyle = fl;
      x.fillRect(l * 0.3, h * 0.78, l * 0.4, h * 0.22);
    });
    const TEINTES = [0xffffff, 0xffd6be, 0xfff0c8, 0xffc4ae];
    // tout près de l'œil (quand on zoome et qu'une lanterne monte vers lui), elle s'efface : on compare sa distance à l'œil
    // à celle de l'île (un rapport : la taille de l'île dans la scène n'y fait rien). L'opacité voulue est dans userData.vu.
    const centre = new THREE.Vector3();
    const loinDeLoeil = (o) => {
      o.userData.vu = 0;
      o.onBeforeRender = (rd, sc, cam) => {
        const m = o.matrixWorld.elements;
        centre.setFromMatrixPosition(g.matrixWorld);
        const dl = Math.hypot(cam.position.x - m[12], cam.position.y - m[13], cam.position.z - m[14]);
        o.material.opacity = o.userData.vu * lisse(0.3, 0.5, dl / (cam.position.distanceTo(centre) || 1));
      };
    };
    const lanterne = (k, chaud) => {
      const corps = new THREE.Sprite(new THREE.SpriteMaterial({ map: papier, color: TEINTES[k % 4], transparent: true, opacity: 0, depthWrite: false }));
      const lueur = new THREE.Sprite(new THREE.SpriteMaterial({ map: pastille(), color: chaud, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      loinDeLoeil(corps);
      loinDeLoeil(lueur);
      calque.add(lueur, corps);
      return { corps, lueur };
    };
    const ciel = Array.from({ length: d.nb || 10 }, (_, k) => ({ ...lanterne(k, 0xff9a3c), k, per: 26 + alea(k * 7 + 1) * 10, ph: alea(k * 3 + 2) * 40, sens: alea(k * 5 + 3) * 6.28, haut: 3.2 + alea(k * 11) * 1.3 }));
    const petites = chenaux.flatMap((ch, i) => Array.from({ length: 3 }, (_, j) => {
      const flaque = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: pastille(), color: 0xff8a30, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      flaque.rotation.x = -Math.PI / 2;
      calque.add(flaque);
      return { ...lanterne(i + j + 1, 0xffa44a), flaque, ch, k: i * 3 + j, per: 70 + alea(i * 13 + j) * 20, ph: j / 3 + alea(i * 7 + j * 5) * 0.1 };
    }));
    maj = (s) => {
      const L = lampesAllumees;
      calque.visible = L > 0.01;
      if (!calque.visible) return;
      for (const u of ciel) {
        const c = (s + u.ph) / u.per, n = Math.floor(c), t = c - n;
        const p = departs[(u.k + n * 3) % departs.length]; // à chaque tour, un autre départ
        const gonfle = Math.min(1, t / 0.05); // posée, elle se gonfle ; puis elle monte, de plus en plus vite
        const vol = Math.max(0, (t - 0.05) / 0.95);
        const bal = Math.sin(s * 0.9 + u.sens) * 0.12 * Math.min(1, vol * 4);
        const x = p.x + vent.x * vol * 3 + Math.cos(u.sens) * bal;
        const z = p.z + vent.z * vol * 3 + Math.sin(u.sens) * bal;
        const y = p.y + 0.11 + Math.pow(vol, 1.25) * u.haut;
        const vu = L * Math.min(1, t / 0.03) * (1 - lisse(0.62, 1, t));
        const fl = 0.85 + 0.15 * Math.sin(s * 11 + u.k) * Math.sin(s * 6.7 + u.k * 2);
        const loin = 1 - 0.4 * vol; // elle s'éloigne dans le ciel
        u.corps.position.set(x, y, z);
        u.corps.scale.set(0.2 * (0.75 + 0.25 * gonfle) * loin, 0.27 * (0.55 + 0.45 * gonfle) * loin, 1);
        u.corps.userData.vu = vu;
        u.lueur.position.set(x, y - 0.03 * loin, z);
        u.lueur.scale.setScalar(0.7 * fl * loin);
        u.lueur.userData.vu = vu * 0.55 * fl;
      }
      for (const w of petites) {
        const t = (s / w.per + w.ph) % 1;
        const q = w.ch.getPointAt(t);
        const vu = L * lisse(0, 0.06, t) * (1 - lisse(0.85, 1, t));
        const y = eau + 0.07 + Math.sin(s * 1.4 + w.k * 2.1) * 0.012;
        const fl = 0.85 + 0.15 * Math.sin(s * 9 + w.k * 3) * Math.sin(s * 5.3 + w.k);
        w.corps.position.set(q.x, y, q.z);
        w.corps.scale.set(0.1, 0.13, 1);
        w.corps.userData.vu = vu;
        w.lueur.position.set(q.x, y, q.z);
        w.lueur.scale.setScalar(0.26 * fl);
        w.lueur.userData.vu = vu * 0.5 * fl;
        w.flaque.position.set(q.x, eau + 0.012, q.z);
        w.flaque.scale.setScalar(0.5 * fl);
        w.flaque.material.opacity = vu * 0.3;
      }
    };
  } else if (genre === "orage") {
    const nuage = new THREE.Group();
    for (let k = 0; k < 9; k++) {
      const b = nuageBoule(0x585466);
      b.scale.set(2.2 + R() * 1.6, 1.2 + R(), 2.2 + R() * 1.6);
      b.position.set((R() - 0.5) * 9, R() * 0.8, (R() - 0.5) * 7);
      nuage.add(b);
    }
    const eclair = new THREE.Line(new THREE.BufferGeometry().setFromPoints([[0, 0], [1, -2.5], [-0.5, -4.5], [0.8, -6.8], [0, -9]].map(([x, y]) => new THREE.Vector3(x, y, 0))), new THREE.LineBasicMaterial({ color: 0xfff6a0 }));
    g.add(nuage, eclair);
    maj = (s) => {
      const f = (s * 0.7) % 3;
      eclair.visible = f < 0.12 || (f > 0.2 && f < 0.26);
      eclair.position.x = Math.sin(Math.floor(s * 0.7 / 3) * 7.1) * 2.5;
      nuage.position.x = Math.sin(s * 0.3) * 0.8;
    };
  }
  return { groupe: g, maj };
}

// ---------- la mer à l'aquarelle, sur une feuille de parchemin ----------
function materiauMer(uniforms) {
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      uniform float uT; uniform float uCine; uniform vec3 uIles[24];
      varying vec2 vXZ;
      varying vec3 vMonde;
      void main() {
        vec3 p = position;
        vXZ = p.xz;
        // en mode cinéma, la houle se calme à l'abri d'une île (son port, sa lagune) : voir niveauMer(), qui fait le même calcul
        float abri = 1.0;
        if (uCine > 0.5) for (int i = 0; i < 24; i++) { vec3 il = uIles[i]; if (il.z > 0.0) abri = min(abri, smoothstep(-1.0, 3.5, length(p.xz - il.xy) - il.z)); }
        float dans = step(abs(p.x), ${MER_X.toFixed(1)}) * step(abs(p.z), ${MER_Z.toFixed(1)});
        p.y += (sin(p.x * 0.33 + uT * 0.9) * 0.09 + sin(p.z * 0.41 - uT * 1.1) * 0.07) * dans * abri;
        vMonde = (modelMatrix * vec4(p, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      uniform float uT; uniform float uSombre; uniform float uVie; uniform vec3 uIles[24];
      uniform float uNuit; uniform float uOr; uniform float uReflet;
      uniform float uCine; uniform float uRive[24];
      varying vec2 vXZ;
      varying vec3 vMonde;
      float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      ${NUAGES5}
      float bruit(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
      float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int k = 0; k < 5; k++) { s += a * bruit(p); p *= 2.03; a *= 0.5; } return s; }
      // le clapot : trois couches de vagues, tournées chacune d'un angle différent, qui glissent l'une sur l'autre
      float clapot(vec2 p) {
        vec2 a = mat2(0.825, 0.565, -0.565, 0.825) * p * 0.46 + vec2(uT * 0.10, uT * 0.06);
        vec2 b = mat2(0.454, -0.891, 0.891, 0.454) * p * 1.25 + vec2(-uT * 0.14, uT * 0.19);
        vec2 c = mat2(-0.588, 0.809, -0.809, -0.588) * p * 3.1 + vec2(uT * 0.31, -uT * 0.22);
        vec2 d = mat2(0.276, 0.961, -0.961, 0.276) * p * 7.4 + vec2(-uT * 0.47, -uT * 0.33);
        return bruit(a) * 0.58 + bruit(b) * 0.27 + bruit(c) * 0.105 + bruit(d) * 0.045;
      }
      void main() {
        vec2 p = vXZ;
        // la feuille : les bords déchirés et brûlés
        float bx = ${(W / 2).toFixed(1)} - abs(p.x), bz = ${(H / 2).toFixed(1)} - abs(p.y);
        float bordFeuille = min(bx, bz) + (fbm(p * 0.18) - 0.5) * 7.0;
        if (bordFeuille < 0.0) discard;
        vec3 papier = mix(vec3(0.93, 0.84, 0.64), vec3(0.86, 0.74, 0.52), fbm(p * 0.07 + 11.0));
        papier = mix(papier, vec3(0.45, 0.28, 0.14), 1.0 - smoothstep(0.0, 4.5, bordFeuille));
        // la mer
        float mx = ${MER_X.toFixed(1)} - abs(p.x), mz = ${MER_Z.toFixed(1)} - abs(p.y);
        float bordMer = min(mx, mz) + (fbm(p * 0.09 + 3.0) - 0.5) * 12.0;
        float n = fbm(p * 0.045 + vec2(uT * 0.008, -uT * 0.005));
        vec3 mer;
        float cote = 0.0;
        float dIle = 99.0;
        if (uCine > 0.5) {
          // ----- la mer « cinéma » (niveau 5) : une eau profonde, des lagons clairs autour des îles, des vagues qui prennent
          // la lumière, le ciel qui s'y reflète au loin, l'écume. Tout est calculé ici, sans image à charger -----
          // uRive : 1, une île ronde d'avant (frange claire, anneau d'écume) ; 0, un port « niveau 5 » (eau de bassin à
          // l'intérieur) ; 2, une île naturelle « niveau 5 » (lagon clair autour et dans ses anses, pas d'anneau)
          float rive = 0.0, frange = 0.0, bassin = 0.0, lagon = 0.0;
          float fb = bruit(p * 1.6 + vec2(uT * 0.2, -uT * 0.13));
          for (int i = 0; i < 24; i++) {
            vec3 il = uIles[i];
            if (il.z <= 0.0) continue;
            float d = length(p - il.xy) - il.z;
            dIle = min(dIle, d);
            // les îles rondes d'avant ont leur frange claire et leur écume en anneau ; les îles « niveau 5 » ont une vraie côte
            float genre = uRive[i];
            float ronde = 1.0 - min(1.0, abs(genre - 1.0)), naturelle = step(1.5, genre);
            rive = max(rive, ronde * (1.0 - smoothstep(0.0, 2.2, abs(d - 0.2))));
            float bat = d - 0.35 - 0.3 * sin(uT * 0.8 + fb * 6.0) - fb * 0.5;
            frange = max(frange, ronde * (1.0 - smoothstep(0.0, 0.8, abs(bat))) * step(-1.0, d));
            bassin = max(bassin, (1.0 - step(0.5, genre)) * (1.0 - smoothstep(-2.6, -0.6, d)));
            lagon = max(lagon, naturelle * (1.0 - smoothstep(-1.5, 2.4 + fb * 0.8, d)));
          }
          float bas = 1.0 - smoothstep(0.0, 11.0, dIle); // 1 contre la côte, 0 au large
          cote = bas;
          // les vagues : deux couches qui glissent l'une sur l'autre ; leur pente donne le relief de l'eau
          float agite = 1.0 + uSombre * 1.7;
          const float e = 0.3;
          float h0 = clapot(p), hx = clapot(p + vec2(e, 0.0)), hz = clapot(p + vec2(0.0, e));
          float calme = 1.0 - bassin * 0.6; // un bassin est plus lisse que le large
          vec3 N = normalize(vec3(-(hx - h0) / e * 0.8 * agite * calme - cos(p.x * 0.33 + uT * 0.9) * 0.03, 1.0, -(hz - h0) / e * 0.8 * agite * calme - cos(p.y * 0.41 - uT * 1.1) * 0.029));
          vec3 V = normalize(cameraPosition - vMonde);
          vec3 L = normalize(vec3(-0.5, 0.62, 0.62)); // le soleil des modèles (le même que dans Blender)
          // la couleur de l'eau : selon la profondeur
          vec3 fond = mix(vec3(0.030, 0.185, 0.365), vec3(0.055, 0.315, 0.490), n);
          vec3 eau = mix(fond, vec3(0.13, 0.66, 0.66), bas * bas * 0.92);
          eau = mix(eau, vec3(0.58, 0.86, 0.78), rive * 0.62);
          eau = mix(eau, vec3(0.36, 0.80, 0.74), lagon * 0.7);
          eau = mix(eau, vec3(0.085, 0.42, 0.47), bassin * 0.9);
          eau *= 1.0 + 1.25 * (dot(N, L) - L.y * N.y); // les pentes tournées vers le soleil s'éclairent
          // le fond qui danse sous l'eau claire
          vec2 cq = mat2(0.94, 0.34, -0.34, 0.94) * p * 2.5 + vec2(hx - h0, hz - h0) * 7.0;
          float danse = pow(0.5 + 0.5 * sin(cq.x * 2.3 + uT * 1.1 + sin(cq.y * 1.7 - uT * 0.8) * 1.6), 7.0) + pow(0.5 + 0.5 * sin(cq.y * 2.6 - uT * 0.9 + sin(cq.x * 1.4 + uT * 0.7) * 1.8), 7.0);
          eau += vec3(0.42, 0.62, 0.5) * danse * 0.075 * bas * bas * (1.0 - bassin * 0.6);
          // le ciel dans l'eau : presque rien quand on regarde d'en haut, beaucoup au loin
          vec3 R = reflect(-V, N);
          float hR = pow(clamp(R.y, 0.0, 1.0), 0.55);
          vec3 ciel = mix(mix(vec3(0.82, 0.91, 0.97), vec3(0.32, 0.57, 0.90), hR), mix(vec3(1.0, 0.76, 0.5), vec3(0.45, 0.52, 0.8), hR), uOr);
          ciel = mix(ciel, vec3(0.44, 0.47, 0.54), uSombre * 0.85);
          float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
          mer = mix(eau, ciel, fres);
          // le soleil sur les crêtes, et de petits miroitements qui s'allument et s'éteignent
          float jour = (1.0 - uSombre) * (1.0 - uNuit);
          mer += vec3(1.0, 0.95, 0.82) * pow(max(dot(R, L), 0.0), 60.0) * 0.55 * jour;
          vec2 cel = floor(p * 1.25), fc = fract(p * 1.25) - 0.5;
          float eclat = step(0.972, h21(cel + floor(uT * 1.5 + h21(cel) * 5.0) * 7.0)) * (1.0 - smoothstep(0.03, 0.12, length(fc * vec2(1.0, 2.0))));
          mer += vec3(1.0, 0.98, 0.9) * eclat * 0.5 * jour * (1.0 - bassin);
          // l'écume : la frange qui bat la côte des îles rondes, les moutons au large (plus nombreux sous l'orage)
          float mouton = smoothstep(0.80 - uSombre * 0.14, 0.88 - uSombre * 0.1, bruit(p * 0.5 + vec2(uT * 0.3, uT * 0.1)) * (0.72 + 0.28 * fb)) * smoothstep(0.42, 0.7, fbm(p * 0.06 + vec2(uT * 0.02, 0.0)));
          float blanc = max(frange * (0.55 + 0.45 * fb), mouton * (0.34 + uSombre * 0.5) * (1.0 - bas));
          mer = mix(mer, vec3(0.96, 0.98, 1.0), clamp(blanc, 0.0, 1.0) * 0.85);
        } else {
          vec3 profond = vec3(0.43, 0.63, 0.80), clair = vec3(0.71, 0.86, 0.94);
          float ecume = 0.0;
          for (int i = 0; i < 24; i++) {
            vec3 il = uIles[i];
            if (il.z <= 0.0) continue;
            float d = length(p - il.xy) - il.z;
            cote = max(cote, 1.0 - smoothstep(0.0, 7.0, d));
            float vague = sin(d * 2.4 - uT * 1.7) * 0.5 + 0.5;
            ecume = max(ecume, (1.0 - smoothstep(0.0, 1.8, abs(d - 0.4))) * vague * step(-0.6, d));
          }
          mer = mix(profond, clair, n * 0.7 + cote * 0.45);
          float tache = fbm(p * 0.11 + 7.0);
          mer = mix(mer, mer * 0.86, smoothstep(0.55, 0.78, tache));
          float lignes = smoothstep(0.94, 1.0, sin(p.x * 0.75 + sin(p.y * 0.45) * 2.2 + uT * 0.55) * sin(p.y * 1.05 + uT * 0.35));
          mer = mix(mer, vec3(0.97, 0.99, 1.0), lignes * 0.35);
          mer = mix(mer, vec3(1.0), ecume * 0.6);
          // la V4 : les hauts-fonds turquoise autour des îles, les moutons que pousse le vent, les reflets du soleil, les courants
          if (uVie > 0.5) {
            mer = mix(mer, vec3(0.42, 0.86, 0.84), cote * cote * 0.42);
            float mouton = smoothstep(0.78, 0.86, bruit(p * 0.55 + vec2(uT * 0.35, uT * 0.12))) * smoothstep(0.45, 0.7, fbm(p * 0.06 + vec2(uT * 0.02, 0.0)));
            mer = mix(mer, vec3(1.0), mouton * 0.35 * (1.0 - cote));
            vec2 cel = floor(p * 0.9), fc = fract(p * 0.9) - 0.5;
            float eclat = step(0.985, h21(cel + floor(uT * 1.3) * 7.0)) * (1.0 - smoothstep(0.04, 0.11, length(fc * vec2(1.0, 2.2))));
            mer = mix(mer, vec3(1.0, 0.98, 0.88), eclat * 0.9 * (1.0 - cote));
            float courant = smoothstep(0.975, 1.0, sin(p.y * 0.22 + sin(p.x * 0.045) * 3.2)) * step(0.55, fract(p.x * 0.12 - uT * 0.25));
            mer = mix(mer, vec3(0.93, 0.97, 1.0), courant * 0.32);
          }
          mer -= h21(floor(p * 9.0)) * 0.035;
        }
        // la nuit : le chemin de lune, des paillettes qui dansent jusqu'à nous ; le soir : le même, en or
        float soir = max(uNuit, uOr);
        if (soir > 0.01) {
          vec2 cl = floor(p * 1.5), fl = fract(p * 1.5) - 0.5;
          float paillette = step(0.9, h21(cl + floor(uT * 1.1 + h21(cl) * 6.0) * 3.0)) * (1.0 - smoothstep(0.05, 0.16, length(fl * vec2(1.0, 2.3))));
          float chemin = exp(-pow((p.x - uReflet + sin(p.y * 0.21 + uT * 0.4) * 1.4) / 7.5, 2.0));
          mer = mix(mer, vec3(1.0), paillette * chemin * soir * 0.95 * (1.0 - cote));
          mer = mix(mer, vec3(1.0), chemin * soir * 0.1 * (1.0 - cote));
        }
        mer = mix(mer, vec3(0.19, 0.22, 0.32), uSombre * 0.6);
        // les terres du bord de la carte, en sépia hachuré (comme une vieille carte)
        float t0 = fbm(p * 0.035 + 21.0) + (1.0 - smoothstep(0.0, 20.0, bordMer)) * 0.45;
        float terre = smoothstep(0.6, 0.64, t0);
        float relief = fbm(p * 0.3);
        float dansMer = smoothstep(0.0, 2.0, bordMer);
        float bordCarte = smoothstep(0.0, 1.0, 22.0 - min(mx, mz)) * step(-30.0, -min(mx, mz)) * dansMer;
        vec3 c;
        if (uCine > 0.5) {
          // une vraie côte : l'eau s'éclaircit, le ressac va et vient, le sable est mouillé puis sec ; jamais dans les eaux d'une île
          float tc = mix(0.3, t0 - smoothstep(13.0, 24.0, min(mx, mz)) * 0.32, smoothstep(2.5, 9.0, dIle)); // loin du bord : plus de terre
          bordCarte = dansMer;
          mer = mix(mer, vec3(0.24, 0.76, 0.71), smoothstep(0.49, 0.6, tc) * 0.8 * bordCarte);
          float ressac = 1.0 - smoothstep(0.0, 0.011, abs(tc - 0.597 - 0.005 * sin(uT * 0.9 + relief * 9.0)));
          mer = mix(mer, vec3(0.97, 0.99, 1.0), ressac * 0.8 * bordCarte * (0.6 + 0.4 * bruit(p * 2.3)));
          vec3 sable = mix(vec3(0.93, 0.86, 0.68), vec3(0.80, 0.71, 0.52), relief);
          sable = mix(sable * vec3(0.66, 0.70, 0.72), sable, smoothstep(0.606, 0.66, tc));
          mer *= nuages5(p, uT); // l'ombre des nuages qui passent (la même que sur les îles « niveau 5 »)
          c = mix(papier, mer, dansMer);
          c = mix(c, sable, smoothstep(0.602, 0.612, tc) * bordCarte);
        } else {
          vec3 sepia = mix(vec3(0.62, 0.45, 0.26), vec3(0.43, 0.29, 0.16), relief);
          sepia = mix(sepia, sepia * 0.8, step(0.6, fract((p.x + p.y) * 1.2)) * relief);
          c = mix(papier, mer, dansMer);
          c = mix(c, sepia, terre * bordCarte);
        }
        // le trait d'encre au bord de la mer
        c = mix(c, vec3(0.32, 0.2, 0.1), (1.0 - smoothstep(0.0, 0.5, abs(bordMer - 0.2))) * 0.55 * (1.0 - uCine * 0.75));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}

// la rose des vents, dans un coin de la feuille
function roseDesVents() {
  const t = toile(512, 512, (x, l) => {
    const c = l / 2;
    x.translate(c, c);
    x.strokeStyle = "rgba(90,55,25,.7)";
    x.lineWidth = 4;
    for (const r of [230, 200, 120]) { x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2); x.stroke(); }
    for (let k = 0; k < 32; k++) { x.save(); x.rotate((k / 32) * Math.PI * 2); x.beginPath(); x.moveTo(0, -200); x.lineTo(0, k % 4 ? -188 : -176); x.stroke(); x.restore(); }
    for (let k = 0; k < 8; k++) {
      x.save();
      x.rotate((k / 8) * Math.PI * 2);
      const long = k % 2 ? 140 : 215;
      x.beginPath(); x.moveTo(0, -long); x.lineTo(24, 0); x.lineTo(0, 0); x.closePath();
      x.fillStyle = k % 2 ? "#b88a5a" : "#c2283a"; x.fill(); x.stroke();
      x.beginPath(); x.moveTo(0, -long); x.lineTo(-24, 0); x.lineTo(0, 0); x.closePath();
      x.fillStyle = k % 2 ? "#e9d3a6" : "#f4d9a0"; x.fill(); x.stroke();
      x.restore();
    }
    x.fillStyle = "#5a3719";
    x.font = "900 54px Georgia, serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText("N", 0, -245 + 26);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(-W / 2 + 18, 0.03, H / 2 - 18);
  return m;
}

// ---------- la route ----------
function courbe(a, b, sens = 1, force = 0.16) {
  const m = a.clone().add(b).multiplyScalar(0.5);
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const c = new THREE.Vector3(m.x - dz * force * sens, 0, m.z + dx * force * sens);
  return new THREE.QuadraticBezierCurve3(a, c, b);
}

export function creerGrandLine3D(canvas, { positions, couche, surIle = () => {}, surBouteille = () => {}, surNavire = () => {}, surAmbiance = () => {}, ambiance = null, ilesV4 = [], ilesV5 = [], modeles = "/modeles/grandline/" }) {
  const ratio = Math.min(1.5, window.devicePixelRatio || 1);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: ratio < 1.5, alpha: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(ratio);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 16 / 9, 1, 2000);
  const uLumiere = { value: new THREE.Vector3(-0.5, 0.8, 0.35).normalize() };
  const hemi = new THREE.HemisphereLight(0xfff4e0, 0x6a4a6a, 1.1);
  const soleil = new THREE.DirectionalLight(0xffffff, 1.3);
  soleil.position.set(-60, 120, 40);
  scene.add(hemi, soleil);

  // la feuille et la mer
  const uniformsMer = { uT: { value: 0 }, uSombre: { value: 0 }, uNuit: { value: 0 }, uOr: { value: 0 }, uReflet: { value: 0 }, uVie: { value: ilesV4.length ? 1 : 0 }, uCine: { value: ilesV5.length ? 1 : 0 }, uRive: { value: Array.from({ length: 24 }, () => 1) }, uIles: { value: Array.from({ length: 24 }, () => new THREE.Vector3(0, 0, 0)) } };
  const merGeo = new THREE.PlaneGeometry(W, H, 180, 110);
  merGeo.rotateX(-Math.PI / 2);
  const mer = new THREE.Mesh(merGeo, materiauMer(uniformsMer));
  scene.add(mer, roseDesVents());

  // ---------- les îles (toutes, dès le début ; ce qui est visible dépend du voyage) ----------
  const iles = new Map(); // id → { groupe, nuage, cible, theme, x, z, r }
  let n = 0;
  for (const [id, [x, z, theme]] of Object.entries(positions)) {
    const t = THEMES[theme] || THEMES.plage;
    const R = hasard(1000 + n * 97);
    const groupe = new THREE.Group();
    groupe.position.set(x, 0, z);
    const ilots = [];
    const anims = []; // ce qui bouge sur cette île (seulement quand on la voit)
    if (t.ilots) {
      for (let k = 0; k < t.ilots; k++) {
        const ilot = terrain(t, 77 + n * 13 + k, { uLumiere }, t.r * (0.8 + R() * 0.4));
        ilot.position.set(Math.cos(k * 1.7) * 6.5, 0, Math.sin(k * 1.7) * 5);
        groupe.add(ilot);
        ilots.push(ilot);
      }
    } else if (theme !== "marche") {
      const sol = terrain(t, 77 + n * 13, { uLumiere });
      groupe.add(sol);
      groupe.userData.hauteur = sol.userData.hauteur;
      decor(theme, sol, R, anims);
    } else {
      const radeau = avecContour(new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.35, 8), plastique(0x9a6a40)));
      radeau.position.y = 0.15;
      groupe.add(radeau);
      groupe.userData.hauteur = () => 0.3;
      decor(theme, groupe, R, anims);
    }
    if (t.ilots) {
      // les lucioles : des points qui clignotent au-dessus de l'archipel
      const nb = 70;
      const pts = new Float32Array(nb * 3);
      for (let k = 0; k < nb; k++) pts.set([(R() - 0.5) * 22, 1 + R() * 5, (R() - 0.5) * 18], k * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
      const mat = new THREE.PointsMaterial({ color: 0xfff27a, size: 0.55, map: pastille(), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
      const lucioles = new THREE.Points(geo, mat);
      groupe.add(lucioles);
      anims.push((s) => { mat.opacity = 0.55 + Math.sin(s * 3) * 0.35; lucioles.rotation.y = s * 0.05; });
    }
    // le nuage qui cache une île encore inconnue
    const nuage = new THREE.Group();
    // la V4 a beaucoup plus d'îles : des nuages un peu plus petits, sinon la mer disparaît sous le brouillard
    const v4 = ilesV4.length > 0;
    for (let k = 0; k < (v4 ? 7 : 9); k++) {
      const b = nuageBoule();
      b.scale.set((3 + R() * 2.5) * (v4 ? 0.8 : 1), 1.8 + R() * 1.4, (3 + R() * 2.5) * (v4 ? 0.8 : 1));
      b.position.set((R() - 0.5) * t.r * 1.6, 2 + R() * 2, (R() - 0.5) * t.r * 1.4);
      nuage.add(b);
    }
    // l'anneau doré autour de la prochaine île
    const anneau = new THREE.Mesh(new THREE.TorusGeometry(t.r * (t.ilots ? 2.2 : 1.35), 0.22, 8, 64), new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.8 }));
    anneau.rotation.x = Math.PI / 2;
    anneau.position.y = 0.15;
    // la zone à cliquer
    const zone = new THREE.Mesh(new THREE.CylinderGeometry(t.r * (t.ilots ? 2 : 1.25), t.r * (t.ilots ? 2 : 1.25), 10, 12), new THREE.MeshBasicMaterial({ visible: false }));
    zone.position.y = 3;
    zone.userData.ile = id;
    const contenu = [...groupe.children]; // l'île elle-même : cachée tant qu'elle est inconnue
    groupe.add(nuage, anneau, zone);
    scene.add(groupe);
    iles.set(id, { id, groupe, nuage, anneau, zone, contenu, theme, x, z, r: t.r * (t.ilots ? 1.9 : 1.05), reliefs: groupe.children.filter((c) => c.userData?.relief).map((c) => c.userData.relief).concat(ilots.map((i) => i.userData.relief)), etat: "", disparition: 0, anims, visible: false, modele: undefined, haut: 6.5 });
    n++;
  }
  let k = 0;
  // l'écume autour des îles (celles qui ne sont pas sur la route n'en ont pas : voir maj)
  // la place de chaque île dans la mer : son rayon (une île « niveau 5 » donne le sien quand son modèle arrive)
  const rayonMer = (i) => i.rMer ?? i.r * 0.92;
  for (const i of iles.values()) { if (k < 24) { i.indexMer = k; uniformsMer.uIles.value[k].set(i.x, i.z, rayonMer(i)); } k++; }

  // ---------- les modèles de Blender : chaque île se charge quand on la voit (en attendant : la version dessinée ici) ----------
  let detruit = false;
  let fete = null; // le jour et la nuit, les lumières, les feux d'artifice, l'arène… (js/grandline-fete.js), créée plus bas
  const erreurs = []; // pour les essais (etat())
  // sur téléphone (ou petit appareil), les modèles V4 existent en version légère (<nom>-leger.glb) : on la prend d'abord
  const leger = (() => { try { return matchMedia("(max-width: 760px), (pointer: coarse)").matches || (navigator.deviceMemory || 8) <= 4; } catch { return false; } })();
  const lireV4 = (nom) => (leger ? lireGLB(`${modeles}${nom.replace(/\.glb$/, "-leger.glb")}`).catch(() => lireGLB(`${modeles}${nom}`)) : lireGLB(`${modeles}${nom}`));
  function chargerIle(i) {
    if (i.modele !== undefined || detruit) return;
    i.modele = null;
    // la version V4 d'une île (ile-<id>-v4.glb) quand elle existe et que la V4 est ouverte ; sinon l'île de base
    const v4 = ilesV4.includes(i.id);
    const avant = () => (v4 ? lireV4(`ile-${i.id}-v4.glb`).catch(() => lireGLB(`${modeles}ile-${i.id}.glb`)) : lireGLB(`${modeles}ile-${i.id}.glb`));
    // niveau 5 (démo) : ile-<id>-v5.glb et son image ; si l'un des deux manque, l'île d'avant
    (ilesV5.includes(i.id) ? lireV4(`ile-${i.id}-v5.glb`).catch(avant) : avant()).then((glb) => {
      i.niveau = glb.atlas ? 5 : v4 ? 4 : 3;
      if (detruit) return;
      const modele = sceneGLB(glb);
      const { reliefs, bouge, reperes } = habiller(modele, { relief: () => materiauRelief({ uLumiere }), cuit: glb.cuit, ile: true });
      for (const r of reliefs) modele.add(traitDeCote(r.geometry));
      const boite = new THREE.Box3().setFromObject(modele);
      if (i.niveau === 5 && i.indexMer !== undefined) {
        // une île « niveau 5 » a une vraie côte (un port, des rochers) : pas d'anneau d'écume, et la mer connaît sa taille
        const mer5 = reperes.find((r) => r.userData.anim === "mer")?.userData; // { rayon, genre } : 0 un port, 2 une île naturelle
        i.rMer = mer5?.rayon ?? Math.max(boite.max.x - boite.min.x, boite.max.z - boite.min.z) * 0.5 * 0.95;
        modele.userData.rMer = i.rMer;
        uniformsMer.uRive.value[i.indexMer] = mer5?.genre ?? 0;
        if (uniformsMer.uIles.value[i.indexMer].z > 0) uniformsMer.uIles.value[i.indexMer].z = i.rMer;
      }
      for (const d of REPERES_SITE[i.id] || []) {
        if (reperes.some((r) => r.userData.anim === d.anim)) continue; // le modèle a déjà le sien
        const r = new THREE.Object3D();
        r.position.set(d.ici[0], d.ici[2], -d.ici[1]);
        r.userData = { ...d, role: "repere" };
        modele.add(r);
        reperes.push(r);
      }
      // l'Île-Horloge : la cloche (en haut de la tour), les engrenages et le balancier (dans les falaises) suivent la sonnerie
      if (reperes.some((r) => r.userData.anim === "heures")) {
        for (const o of bouge) {
          const u = o.userData;
          if (u.anim === "balance") u.sonne ??= o.position.y > 4 ? "cloche" : "balancier";
          else if (u.anim === "tourne" && o.position.y < 4) u.sonne ??= "engrenage";
        }
      }
      const anims = animateurs(bouge);
      for (const r of reperes) {
        const e = effetRepere(r);
        r.parent.add(e.groupe);
        anims.push(e.maj);
        // les étoiles de lucioles éclairent la nuit, comme des lanternes (tant que l'île est visible)
        const luit = e.groupe.userData.calque;
        if (luit && fete?.calque) {
          luit.position.set(i.x + r.position.x, r.position.y, i.z + r.position.z);
          Object.defineProperty(luit, "visible", { get: () => Boolean(i.visible && i.groupe.visible), set() {} }); // elles suivent leur île
          fete.calque.add(luit);
        } else if (luit) e.groupe.add(luit);
        for (const l of e.groupe.userData.lueurs || []) lanternes.push({ g: { get visible() { return Boolean(i.visible && i.groupe.visible && l.r > 0); }, position: new THREE.Vector3(i.x + l.x, 0, i.z + l.z) }, y: l.y, get r() { return l.r; }, c: l.c, clignote: !l.fixe }); // « r » se relit : l'éclair de l'Île Tonnerre
      }
      for (const c of i.contenu) { i.groupe.remove(c); c.traverse((o) => o.geometry?.dispose?.()); }
      i.groupe.add(modele);
      i.contenu = [modele];
      i.reliefs = reliefs;
      i.anims = anims;
      i.haut = Math.max(6.5, boite.max.y + 1.2);
      i.modele = modele;
      fete?.eclairerIle(i, modele); // ses lanternes, ses fenêtres, sa lave : autant de lumières pour la nuit
      const feu = reperes.find((r) => r.userData.anim === "phare"); // le Phare : ses pinceaux partent du cœur de sa lanterne
      if (feu && fete) i.lampe = { x: i.x + feu.position.x, y: feu.position.y, z: i.z + feu.position.z, m: "lumiere" };
      modele.visible = i.visible;
      for (const r of reliefs) r.material.uniforms.uGris.value = i.visible ? 0 : 0.6;
    }).catch((e) => { i.modele = false; erreurs.push(`${i.id} : ${e.message}`); });
  }
  // les créatures (le monstre, la mouette, la bouteille) : chaque fichier se lit une fois, chaque copie est neuve
  const glbCreatures = new Map();
  function creature(nom, contour) {
    if (!glbCreatures.has(nom)) glbCreatures.set(nom, lireGLB(`${modeles}${nom}.glb`));
    return glbCreatures.get(nom).then((glb) => {
      const modele = sceneGLB(glb);
      const { bouge, reperes } = habiller(modele, { relief: () => null, contour, cuit: glb.cuit });
      const anims = animateurs(bouge);
      for (const r of reperes) {
        const e = effetRepere(r);
        e.groupe.userData.effet = true;
        r.parent.add(e.groupe);
        anims.push(e.maj);
      }
      return { modele, anims };
    });
  }

  // ---------- le navire ----------
  let navire = navireJouet();
  navire.scale.setScalar(1.8);
  const ombre = new THREE.Mesh(new THREE.CircleGeometry(5.2, 24), new THREE.MeshBasicMaterial({ color: 0x1a3550, transparent: true, opacity: 0.22, depthWrite: false }));
  ombre.rotation.x = -Math.PI / 2;
  ombre.scale.set(1.4, 0.8, 1);
  const porteur = new THREE.Group();
  porteur.add(ombre, navire);
  scene.add(porteur);
  // le navire modélisé dans Blender remplace le petit navire dessiné ici dès qu'il est chargé ; le fichier est lu une fois,
  // et chaque navire de la flotte (V4) en est une copie habillée aux couleurs de sa commu
  const glbNavires = new Map(); // un fichier par modèle (navire.glb, navire-<commu>.glb), lu une fois
  const lireNavire = (m) => {
    if (!glbNavires.has(m)) glbNavires.set(m, (m === "navire.glb" ? lireGLB(`${modeles}${m}`) : lireV4(m)).catch((e) => (m === "navire.glb" ? Promise.reject(e) : lireNavire("navire.glb"))));
    return glbNavires.get(m);
  };
  const naviresFaits = new Map(); // un navire par jeu de couleurs : il passe du rôle de navire regardé à celui de la flotte sans être refait
  function navireBlender(theme) {
    if (naviresFaits.has(theme.cle)) return naviresFaits.get(theme.cle);
    const fait = lireNavire(theme.modele || "navire.glb").then((glb) => {
      const modele = sceneGLB(glb);
      const { bouge } = habiller(modele, { relief: () => null, contour: 0.03, theme, cuit: glb.cuit });
      let ventIci = 1;
      const anims = animateurs(bouge, () => ventIci);
      const g = new THREE.Group();
      g.add(modele);
      g.scale.setScalar(glb.atlas ? 1.56 : 1.5); // le galion « niveau 5 » : plus fin que le navire d'avant, donc un rien plus grand pour garder sa présence
      g.userData.animer = (s, vent) => { ventIci = vent; for (const a of anims) a(s); };
      g.userData.blender = true;
      return g;
    });
    naviresFaits.set(theme.cle, fait);
    fait.catch(() => naviresFaits.delete(theme.cle));
    return fait;
  }
  let themeNavireActuel = "";
  function habillerNavire(theme) {
    if (theme.cle === themeNavireActuel) return;
    themeNavireActuel = theme.cle;
    navireBlender(theme).then((nouveau) => {
      if (detruit || theme.cle !== themeNavireActuel) return;
      nouveau.position.copy(navire.position);
      porteur.remove(navire);
      if (!navire.userData.blender) navire.traverse((o) => o.geometry?.dispose?.());
      navire = nouveau;
      porteur.add(navire);
    }).catch((e) => { erreurs.push(`navire : ${e.message}`); });
  }
  // les mouettes : elles tournent autour du navire (elles se cachent pendant la tempête)
  const mouettes = [];
  Promise.all([0, 1, 2].map(() => creature("mouette", 0.018))).then((liste) => {
    if (detruit) return;
    liste.forEach((c, k) => {
      const m = new THREE.Group();
      m.add(c.modele);
      m.rotation.order = "YXZ";
      m.scale.setScalar(1.2);
      m.userData = { anims: c.anims, r: 6.5 + k * 1.8, h: 10 + k * 1.4, v: 0.5 - k * 0.07, a0: k * 2.1, sens: k === 1 ? -1 : 1 };
      scene.add(m);
      mouettes.push(m);
    });
  }).catch((e) => { erreurs.push(`mouette : ${e.message}`); });
  // ---------- la mer qui vit (V4) : baleines, dauphins, tortues, raies, poissons volants, navires marchands,
  // pêcheurs, bouées, épaves qui dérivent, nuages de pluie (modèles : vie-mer.glb ; les mouvements sont calculés ici) ----------
  const vie = [];
  const lanternes = []; // ce qui porte une lanterne (marchands, barques, bouées) : { g, y, r, clignote }, pour la nuit
  const pointDeMer = (R, marge = 6) => {
    for (let k = 0; k < 80; k++) {
      const x = (R() * 2 - 1) * (MER_X - 16);
      const z = (R() * 2 - 1) * (MER_Z - 12);
      let ok = true;
      for (const i of iles.values()) if (Math.hypot(x - i.x, z - i.z) < i.r + marge) { ok = false; break; }
      if (ok) return v3(x, z);
    }
    return v3((R() * 2 - 1) * 60, (R() * 2 - 1) * 30);
  };
  const cap = (dx, dz) => Math.atan2(-dz, dx); // l'angle pour qu'un modèle tourné vers +x regarde dans ce sens
  // des éclaboussures (des ronds d'écume) et les jets d'eau des baleines
  const eclabs = Array.from({ length: 12 }, () => {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.8, 18), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    r.rotation.x = -Math.PI / 2;
    r.userData.age = 9;
    scene.add(r);
    return r;
  });
  let prochaineEclab = 0;
  const eclabousse = (x, z, taille = 1) => { const r = eclabs[prochaineEclab++ % eclabs.length]; r.position.set(x, 0.12, z); r.userData = { age: 0, taille }; };
  function jetDeau() {
    const nb = 18;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(nb * 3), 3));
    const p = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, map: pastille(), transparent: true, opacity: 0.9, depthWrite: false }));
    p.visible = false;
    p.userData = { age: 9, graines: Array.from({ length: nb }, () => [Math.random() * Math.PI * 2, 0.3 + Math.random() * 0.7, 0.6 + Math.random() * 0.4]) };
    scene.add(p);
    return p;
  }
  if (ilesV4.length) lireV4("vie-mer.glb").then((glb) => {
    if (detruit) return;
    const base = sceneGLB(glb);
    const sortes = new Map();
    for (const o of base.children) { const k = String(o.name).split("_")[0]; if (!sortes.has(k)) sortes.set(k, []); sortes.get(k).push(o); }
    const faire = (k, ech = 1) => {
      const modele = new THREE.Group();
      for (const o of sortes.get(k) || []) modele.add(o.clone(true));
      const { bouge } = habiller(modele, { relief: () => null, contour: 0.03, cuit: true });
      const g = new THREE.Group();
      g.add(modele);
      g.scale.setScalar(ech);
      g.rotation.order = "YXZ";
      scene.add(g);
      return { g, anims: animateurs(bouge) };
    };
    const R = hasard(4747);
    const n = (beaucoup, peu) => (leger ? peu : beaucoup);
    // les baleines : un grand cercle lent, elles plongent et ressortent en soufflant
    for (let k = 0; k < n(2, 1); k++) {
      const { g, anims } = faire("baleine", 0.95);
      const c = pointDeMer(R, 14);
      const rr = 9 + R() * 6, w = (0.03 + R() * 0.015) * (k ? -1 : 1), ph = R() * 6.28, dec = R() * 30;
      const jet = jetDeau();
      let avant = 0;
      vie.push((s, dt) => {
        const a = ph + s * w;
        g.position.set(c.x + Math.cos(a) * rr, 0, c.z + Math.sin(a) * rr);
        g.rotation.y = cap(-Math.sin(a) * Math.sign(w), Math.cos(a) * Math.sign(w));
        const u = (s + dec) % 32;
        let y = -0.55 + Math.sin(s * 0.8 + ph) * 0.08, tangage = 0;
        if (u > 16 && u < 19) { const t = (u - 16) / 3; y = -0.55 - t * 5; tangage = -0.35 * Math.sin(t * Math.PI); }
        else if (u >= 19 && u < 28) y = -7;
        else if (u >= 28 && u < 31) { const t = (u - 28) / 3; y = -5.5 + t * 5; tangage = 0.3 * Math.sin(t * Math.PI); }
        g.position.y = y;
        g.rotation.z = tangage;
        g.visible = y > -6;
        // le jet d'eau : en sortant de l'eau, et une fois en surface
        if ((avant < 30.5 && u >= 30.5) || (avant < 8 && u >= 8)) { jet.userData.age = 0; jet.visible = true; eclabousse(g.position.x, g.position.z, 2); }
        avant = u;
        if (jet.visible) {
          const j = jet.userData;
          j.age += dt;
          const tete = v3(g.position.x + Math.cos(-g.rotation.y) * 2.2, g.position.z + Math.sin(-g.rotation.y) * 2.2);
          const pos = jet.geometry.attributes.position;
          j.graines.forEach(([an, f, h], i) => { const t = Math.min(1, j.age / 1.6); pos.setXYZ(i, tete.x + Math.cos(an) * f * t * 1.4, 1 + h * 4.5 * Math.sin(t * Math.PI * 0.85), tete.z + Math.sin(an) * f * t * 1.4); });
          pos.needsUpdate = true;
          jet.material.opacity = 0.9 * (1 - Math.min(1, j.age / 1.8));
          if (j.age > 1.8) jet.visible = false;
        }
        for (const f of anims) f(s, dt);
      });
    }
    // les dauphins : par trois, ils sautent l'un après l'autre
    for (let b = 0; b < n(3, 2); b++) {
      const c = pointDeMer(R, 8);
      const rr = 7 + R() * 5, w = (0.1 + R() * 0.05) * (b % 2 ? -1 : 1), ph = R() * 6.28;
      for (let k = 0; k < 3; k++) {
        const { g } = faire("dauphin", 1.0);
        const off = k * 0.4 + b * 1.7;
        let avant = 0;
        vie.push((s) => {
          const a = ph + s * w - k * 0.09 * Math.sign(w);
          g.position.x = c.x + Math.cos(a) * (rr + k * 0.6);
          g.position.z = c.z + Math.sin(a) * (rr + k * 0.6);
          g.rotation.y = cap(-Math.sin(a) * Math.sign(w), Math.cos(a) * Math.sign(w));
          const v = (s + off) % 5.5;
          if (v < 1.4) {
            const t = v / 1.4;
            g.position.y = Math.sin(t * Math.PI) * 2.2 - 0.3;
            g.rotation.z = Math.cos(t * Math.PI) * 0.75;
            if (avant >= 1.4 || (avant < 1.3 && v >= 1.3)) eclabousse(g.position.x, g.position.z, 0.8);
          } else { g.position.y = -0.42 + Math.sin(s * 2 + k) * 0.05; g.rotation.z = 0; }
          avant = v;
        });
      }
    }
    // les tortues : de petits cercles près des îles
    const ilesListe = [...iles.values()];
    for (let k = 0; k < n(4, 2); k++) {
      const { g, anims } = faire("tortue", 0.9);
      const i = ilesListe[Math.floor(R() * ilesListe.length)];
      const an = R() * 6.28;
      const c = v3(i.x + Math.cos(an) * (i.r + 4), i.z + Math.sin(an) * (i.r + 4));
      const rr = 2 + R() * 1.5, w = 0.1 + R() * 0.05, ph = R() * 6.28;
      vie.push((s, dt) => {
        if (!i.groupe.visible) { g.visible = false; return; }
        g.visible = true;
        const a = ph + s * w;
        g.position.set(c.x + Math.cos(a) * rr, -0.22 + Math.sin(s * 1.1 + ph) * 0.05, c.z + Math.sin(a) * rr);
        g.rotation.y = cap(-Math.sin(a), Math.cos(a));
        for (const f of anims) f(s, dt);
      });
    }
    // les raies : elles planent en rond, et sautent de temps en temps
    for (let k = 0; k < n(2, 1); k++) {
      const { g, anims } = faire("raie", 1.0);
      const c = pointDeMer(R, 10);
      const rr = 6 + R() * 4, w = 0.07 * (k ? -1 : 1), ph = R() * 6.28, off = R() * 20;
      let avant = 0;
      vie.push((s, dt) => {
        const a = ph + s * w;
        g.position.x = c.x + Math.cos(a) * rr;
        g.position.z = c.z + Math.sin(a) * rr;
        g.rotation.y = cap(-Math.sin(a) * Math.sign(w), Math.cos(a) * Math.sign(w));
        const v = (s + off) % 20;
        if (v < 1.8) { const t = v / 1.8; g.position.y = Math.sin(t * Math.PI) * 3 - 0.3; g.rotation.x = Math.sin(t * Math.PI * 2) * 0.3; if (avant > 1.7 || (avant < 1.75 && v >= 1.75)) eclabousse(g.position.x, g.position.z, 1.4); }
        else { g.position.y = -0.32; g.rotation.x = 0; }
        avant = v;
        for (const f of anims) f(s, dt);
      });
    }
    // les poissons volants : un banc jaillit, file au ras de l'eau, replonge
    for (let b = 0; b < n(2, 1); b++) {
      const banc = Array.from({ length: n(6, 4) }, () => faire("poisson", 1.1).g);
      const off = b * 4.5;
      let cycle = -1, depart = v3(0, 0), dir = 0;
      vie.push((s) => {
        const v = (s + off) % 9;
        const nc = Math.floor((s + off) / 9);
        if (nc !== cycle) { cycle = nc; const r2 = hasard(900 + nc * 7 + b); depart = pointDeMer(r2, 8); dir = r2() * 6.28; }
        banc.forEach((g, i) => {
          const t = (v - i * 0.09) / 1.5;
          g.visible = t > 0 && t < 1;
          if (!g.visible) return;
          const lat = (i - banc.length / 2) * 0.7;
          g.position.set(depart.x + Math.cos(dir) * t * 11 - Math.sin(dir) * lat, Math.sin(t * Math.PI) * 1.7, depart.z + Math.sin(dir) * t * 11 + Math.cos(dir) * lat);
          g.rotation.y = cap(Math.cos(dir), Math.sin(dir));
          g.rotation.z = Math.cos(t * Math.PI) * 0.5;
        });
      });
    }
    // les navires marchands : une boucle entre les îles
    for (let k = 0; k < n(3, 2); k++) {
      const { g } = faire("marchand", 0.85);
      lanternes.push({ g, y: 2.2, r: 3.6 });
      const pts = Array.from({ length: 5 }, () => pointDeMer(R, 7)).sort((a, b) => Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x));
      const courbe = new THREE.CatmullRomCurve3(pts, true, "centripetal");
      const L = courbe.getLength();
      const off = R(), ph = R() * 6.28;
      // sa place sur la boucle. La boucle peut couper une île (seuls ses points sont choisis en mer) : le marchand la
      // contourne, sa route s'écarte en douceur (de [0 ; 1,5 R] vers [R ; 1,5 R]). Une île « niveau 5 » est large et
      // haute : sans cela, on voyait passer sa voile à travers le Phare.
      const place = (u) => {
        const p = courbe.getPointAt(u);
        for (const i of iles.values()) {
          if (!i.groupe.visible) continue;
          const Ri = Math.max(i.r, i.rMer || 0) + 2.4;
          const dx = p.x - i.x, dz = p.z - i.z;
          const d = Math.hypot(dx, dz);
          if (d >= Ri * 1.5) continue;
          const d2 = Ri + d / 3;
          if (d < 0.01) p.x = i.x + d2;
          else { p.x = i.x + (dx / d) * d2; p.z = i.z + (dz / d) * d2; }
        }
        return p;
      };
      vie.push((s) => {
        const u = (off + (s * 1.5) / L) % 1;
        const p = place(u);
        const q = place((u + 0.7 / L) % 1); // un peu plus loin sur sa route : là où il regarde
        g.position.set(p.x, Math.sin(s * 1.2 + ph) * 0.08, p.z);
        g.rotation.y = cap(q.x - p.x, q.z - p.z);
        g.rotation.x = Math.sin(s * 0.9 + ph) * 0.05;
      });
    }
    // les barques de pêche, au mouillage près des îles
    for (let k = 0; k < n(4, 2); k++) {
      const { g, anims } = faire("peche", 0.95);
      lanternes.push({ g, y: 1.9, r: 3 });
      const i = ilesListe[Math.floor(R() * ilesListe.length)];
      const an = R() * 6.28;
      g.position.set(i.x + Math.cos(an) * (i.r + 3.5), 0, i.z + Math.sin(an) * (i.r + 3.5));
      const ph = R() * 6.28;
      vie.push((s, dt) => {
        g.visible = i.groupe.visible;
        if (!g.visible) return;
        g.position.y = Math.sin(s * 1.3 + ph) * 0.07;
        g.rotation.y = an + Math.sin(s * 0.15 + ph) * 0.4;
        g.rotation.x = Math.sin(s * 1.1 + ph) * 0.06;
        for (const f of anims) f(s, dt);
      });
    }
    // les bouées
    for (let k = 0; k < n(6, 3); k++) {
      const { g, anims } = faire("bouee", 1.0);
      lanternes.push({ g, y: 1.8, r: 2.4, clignote: true });
      const p = pointDeMer(R, 6);
      const ph = R() * 6.28;
      g.position.copy(p);
      vie.push((s, dt) => {
        g.position.y = Math.sin(s * 1.6 + ph) * 0.1 - 0.05;
        g.rotation.x = Math.sin(s * 1.2 + ph) * 0.12;
        g.rotation.z = Math.cos(s * 1.4 + ph) * 0.1;
        for (const f of anims) f(s + ph, dt);
      });
    }
    // les épaves qui dérivent avec le courant
    for (let k = 0; k < n(6, 3); k++) {
      const { g } = faire("epave", 1.0);
      const p = pointDeMer(R, 5);
      const ph = R() * 6.28, v = 0.35 + R() * 0.3;
      vie.push((s) => {
        let x = p.x + s * v;
        const larg = (MER_X - 12) * 2;
        x = ((((x + MER_X - 12) % larg) + larg) % larg) - (MER_X - 12);
        let z = p.z + Math.sin(s * 0.1 + ph) * 3;
        // le courant contourne les îles : l'épave glisse le long du rivage (du côté de sa route), jamais à travers l'île
        for (const i of iles.values()) {
          const R = Math.max(i.r, i.rMer || 0) + 1.6;
          const dx = Math.abs(x - i.x);
          if (dx >= R + 5) continue;
          const cote = p.z >= i.z ? 1 : -1;
          const contourne = i.z + cote * Math.max(cote * (z - i.z), Math.sqrt(Math.max(0, R * R - dx * dx)));
          const t = Math.min(1, (R + 5 - dx) / 5);
          z += (contourne - z) * t * t * (3 - 2 * t);
        }
        g.position.set(x, Math.sin(s * 1.4 + ph) * 0.08, z);
        g.rotation.y = s * 0.08 + ph;
      });
    }
  }).catch((e) => { erreurs.push(`vie-mer : ${e.message}`); });
  // les nuages de pluie qui traversent la carte (V4)
  const pluies = [];
  if (ilesV4.length) {
    const R = hasard(3131);
    for (let k = 0; k < (leger ? 1 : 2); k++) {
      const g = new THREE.Group();
      for (let j = 0; j < 7; j++) {
        const b = nuageBoule(0x6b6f86, 0.94);
        b.scale.set(2.4 + R() * 2, 1.2 + R(), 2.2 + R() * 1.6);
        b.position.set((R() - 0.5) * 9, R() * 1.2, (R() - 0.5) * 6);
        g.add(b);
      }
      const nb = 90;
      const pos = new Float32Array(nb * 6);
      const gouttes = Array.from({ length: nb }, () => [(R() - 0.5) * 10, R() * 15, (R() - 0.5) * 7]);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const pluie = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xc9d8f0, transparent: true, opacity: 0.55 }));
      pluie.position.y = -15;
      g.add(pluie);
      const ombre = new THREE.Mesh(new THREE.CircleGeometry(7, 24), new THREE.MeshBasicMaterial({ color: 0x1a2a44, transparent: true, opacity: 0.13, depthWrite: false }));
      ombre.rotation.x = -Math.PI / 2;
      scene.add(g, ombre);
      const z0 = (R() * 2 - 1) * (MER_Z - 16), v = 1.1 + R() * 0.6, x0 = (R() * 2 - 1) * MER_X;
      pluies.push((s, dt) => {
        const larg = MER_X * 2 + 30;
        const x = ((((x0 + s * v + MER_X + 15) % larg) + larg) % larg) - MER_X - 15;
        g.position.set(x, 16, z0 + Math.sin(s * 0.05 + k) * 6);
        ombre.position.set(x + 2, 0.15, g.position.z + 1);
        for (let i = 0; i < nb; i++) {
          const d = gouttes[i];
          d[1] -= dt * 22;
          if (d[1] < 0) d[1] += 15;
          pos.set([d[0], d[1], d[2], d[0] - 0.12, d[1] + 0.9, d[2]], i * 6);
        }
        geo.attributes.position.needsUpdate = true;
      });
    }
  }
  // le sillage : des ronds d'écume qui s'élargissent
  const sillages = Array.from({ length: 10 }, () => {
    const s = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.9, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    s.rotation.x = -Math.PI / 2;
    s.userData.age = 99;
    scene.add(s);
    return s;
  });
  // les étincelles du live (vent arrière)
  const etincelles = (() => {
    const nb = 60;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(nb * 3), 3));
    const p = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffd36b, size: 0.5, map: pastille(), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    p.visible = false;
    p.userData.graines = Array.from({ length: nb }, () => [Math.random() * Math.PI * 2, Math.random(), 2 + Math.random() * 4]);
    scene.add(p);
    return p;
  })();

  // ---------- la route ----------
  const route = new THREE.Group(); // ce qui ne bouge pas : les étapes faites (trait plein) et à venir (pointillés pâles)
  const routeEtape = new THREE.Group(); // l'étape en cours : pleine jusqu'au navire, pointillés rouges ensuite
  scene.add(route, routeEtape);
  const tiret = new THREE.BoxGeometry(1.1, 0.06, 0.32);
  const point = new THREE.CylinderGeometry(0.28, 0.28, 0.06, 10);
  const matTiret = new THREE.MeshBasicMaterial({ color: 0xc2283a });
  const matTiretLoin = new THREE.MeshBasicMaterial({ color: 0x9b5a3a, transparent: true, opacity: 0.6 });
  const matTrace = new THREE.MeshBasicMaterial({ color: 0x8e1630 });
  let etape = { chemins: [], plages: [], carrefour: null };
  let progresTrace = -1;
  const pos = (id) => { const i = iles.get(id); return i ? v3(i.x, i.z) : v3(0, 0); };
  function poserLeLong(groupe, c, geo, mat, pas, de = 0, a = 1) {
    const L = c.getLength();
    const nb = Math.floor((L * (a - de)) / pas);
    if (nb < 1) return;
    const im = new THREE.InstancedMesh(geo, mat, nb);
    const o = new THREE.Object3D();
    for (let k = 0; k < nb; k++) {
      const u = de + ((k + 0.5) / nb) * (a - de);
      const p = c.getPointAt(u);
      const t = c.getTangentAt(u);
      o.position.set(p.x, 0.12, p.z);
      o.rotation.set(0, -Math.atan2(t.z, t.x), 0);
      o.updateMatrix();
      im.setMatrixAt(k, o.matrix);
    }
    groupe.add(im);
  }
  const vider = (g) => { for (const c of [...g.children]) { g.remove(c); c.dispose?.(); } };
  // le bord d'une île plutôt que son centre (la route s'arrête au rivage)
  const rivage = (de, vers) => { const i = iles.get(de); const d = vers.clone().sub(pos(de)).normalize(); return pos(de).add(d.multiplyScalar(i ? i.r * 1.05 : 0)); };
  function construireRoute(d) {
    vider(route);
    const etapes = d.route; // [[{ id, etat }], …] : la première, c'est le port
    const choisi = (k) => etapes[k].find((x) => x.etat === "atteinte") || etapes[k].find((x) => x.etat === "cible");
    const sources = (k) => { const c = choisi(k); return c ? [c.id] : etapes[k].filter((x) => x.etat !== "ecartee").map((x) => x.id); };
    etape = { chemins: [], plages: [], carrefour: null };
    for (let k = 1; k < etapes.length; k++) {
      const vers = etapes[k].filter((x) => x.etat !== "ecartee");
      const fait = k <= d.etape;
      const courante = k === d.etape + 1;
      for (const s of sources(k - 1)) {
        if (etapes[k].length > 1) {
          // un carrefour : la route se sépare à mi-chemin
          const tout = etapes[k].reduce((m, x) => m.add(pos(x.id)), v3(0, 0)).multiplyScalar(1 / etapes[k].length);
          const f = pos(s).lerp(tout, 0.5);
          const c1 = courbe(rivage(s, f), f, k % 2 ? 1 : -1, 0.08);
          vers.forEach((x, n) => {
            const c2 = courbe(f, rivage(x.id, f), n ? -1 : 1, 0.14);
            if (courante) {
              etape.carrefour = f;
              if (d.vote) { etape.chemins = [c1]; etape.plages = [[0, 0.5]]; poserLeLong(route, c2, tiret, matTiret, 1.8); }
              else { etape.chemins = [c1, c2]; etape.plages = [[0, 0.5], [0.5, 1]]; }
            } else if (fait) { poserLeLong(route, c1, point, matTrace, 0.55); poserLeLong(route, c2, point, matTrace, 0.55); }
            else { poserLeLong(route, c1, tiret, matTiretLoin, 2.2); poserLeLong(route, c2, tiret, matTiretLoin, 2.2); }
          });
        } else {
          const b = etapes[k][0].id;
          const c = courbe(rivage(s, pos(b)), rivage(b, pos(s)), k % 2 ? 1 : -1);
          if (courante) { etape.chemins = [c]; etape.plages = [[0, 1]]; }
          else if (fait) poserLeLong(route, c, point, matTrace, 0.55);
          else poserLeLong(route, c, tiret, matTiretLoin, 2.2);
        }
      }
    }
    progresTrace = -1;
  }
  function construireEtape(p) {
    vider(routeEtape);
    etape.chemins.forEach((c, k) => {
      const [de, a] = etape.plages[k];
      const ici = Math.min(1, Math.max(0, (p - de) / (a - de)));
      if (ici > 0.01) poserLeLong(routeEtape, c, point, matTrace, 0.55, 0, ici);
      if (ici < 0.99) poserLeLong(routeEtape, c, tiret, matTiret, 1.8, ici, 1);
    });
    progresTrace = p;
  }
  function surRoute(p) {
    if (!etape.chemins.length) return { pos: pos("port"), dir: v3(1, 0) };
    let k = etape.plages.findIndex(([de, a]) => p >= de && p <= a);
    if (k < 0) k = p < etape.plages[0][0] ? 0 : etape.plages.length - 1;
    const [de, a] = etape.plages[k];
    const u = Math.min(0.999, Math.max(0.001, (p - de) / (a - de)));
    return { pos: etape.chemins[k].getPointAt(u), dir: etape.chemins[k].getTangentAt(u) };
  }

  // ---------- la flotte des commus (V4) : les autres navires, sur la même mer, chacun sur sa route ----------
  // (l'étape en cours de chacun est calculée comme celle du navire qu'on regarde, sans être dessinée)
  function etapeDe(d) {
    const etapes = d.route || [];
    const k = (d.etape || 0) + 1;
    if (!etapes[k] || !etapes[k - 1]) return { chemins: [], plages: [] };
    const avant = etapes[k - 1].find((x) => x.etat === "atteinte") || etapes[k - 1].find((x) => x.etat === "cible") || etapes[k - 1][0];
    const s0 = avant.id;
    const vers = etapes[k].filter((x) => x.etat !== "ecartee");
    if (etapes[k].length > 1) {
      const tout = etapes[k].reduce((m, x) => m.add(pos(x.id)), v3(0, 0)).multiplyScalar(1 / etapes[k].length);
      const f = pos(s0).lerp(tout, 0.5);
      const c1 = courbe(rivage(s0, f), f, k % 2 ? 1 : -1, 0.08);
      if (d.vote || !vers.length) return { chemins: [c1], plages: [[0, 0.5]] };
      const c2 = courbe(f, rivage(vers[vers.length - 1].id, f), vers.length > 1 ? -1 : 1, 0.14);
      return { chemins: [c1, c2], plages: [[0, 0.5], [0.5, 1]] };
    }
    const b = etapes[k][0].id;
    return { chemins: [courbe(rivage(s0, pos(b)), rivage(b, pos(s0)), k % 2 ? 1 : -1)], plages: [[0, 1]] };
  }
  function surChemins({ chemins, plages }, p) {
    if (!chemins.length) return { pos: pos("port"), dir: v3(1, 0) };
    let k = plages.findIndex(([de, a]) => p >= de && p <= a);
    if (k < 0) k = p < plages[0][0] ? 0 : plages.length - 1;
    const [de, a] = plages[k];
    const u = Math.min(0.999, Math.max(0.001, (p - de) / (a - de)));
    return { pos: chemins[k].getPointAt(u), dir: chemins[k].getTangentAt(u) };
  }
  const flotte = new Map(); // id → { porteur, navire, theme, etape, sig, progres, voulu, d, decal }
  function navireFlotte(id, theme) {
    const f = { porteur: new THREE.Group(), navire: null, theme, etape: { chemins: [], plages: [] }, sig: "", progres: -1, voulu: 0, d: null, decal: flotte.size + 1 };
    const o = new THREE.Mesh(ombre.geometry, ombre.material);
    o.rotation.x = -Math.PI / 2;
    o.scale.copy(ombre.scale);
    f.porteur.add(o);
    f.porteur.scale.setScalar(0.92);
    scene.add(f.porteur);
    navireBlender(theme).then((g) => {
      if (detruit || flotte.get(id) !== f || themeNavireActuel === theme.cle) return;
      g.position.set(0, 0, 0);
      g.rotation.set(0, 0, 0);
      f.navire = g;
      f.porteur.add(g);
    }).catch((e) => { erreurs.push(`navire ${id} : ${e.message}`); });
    flotte.set(id, f);
    return f;
  }
  function retirerFlotte(id) {
    const f = flotte.get(id);
    if (!f) return;
    scene.remove(f.porteur);
    f.trainee?.detruire();
    flotte.delete(id);
  }
  function majFlotte(autres) {
    const vus = new Set();
    for (const o of autres) {
      if (!o?.id || !o.route) continue;
      vus.add(o.id);
      const theme = themeNavire(o.couleurs, o.embleme, o.drapeau, o.modele);
      let f = flotte.get(o.id);
      if (f && f.theme.cle !== theme.cle) { retirerFlotte(o.id); f = null; }
      f ||= navireFlotte(o.id, theme);
      if ((f.trainee?.type || "") !== (o.trainee || "")) { f.trainee?.detruire(); f.trainee = o.trainee ? creerTrainee(o.trainee, scene, L < 760) : null; }
      f.d = o;
      const sig = JSON.stringify([o.voyage, o.etape, Boolean(o.vote), o.route.map((e) => e.map((x) => x.etat))]);
      if (sig !== f.sig) { f.sig = sig; f.etape = etapeDe(o); f.progres = -1; }
      f.voulu = Math.min(o.vote ? 0.5 : 1, (o.milles || 0) / Math.max(1, o.longueur || 1));
      if (f.progres < 0) f.progres = f.voulu;
    }
    for (const id of [...flotte.keys()]) if (!vus.has(id)) retirerFlotte(id);
  }

  // ---------- les événements en mer ----------
  const mer3d = new THREE.Group();
  scene.add(mer3d);
  let evenement = null; // { type, groupe, maj(s) }
  function creerEvenement(type, ev = {}) {
    const g = new THREE.Group();
    const R = hasard(4242);
    let maj = () => {};
    if (type === "tempete") {
      // les nuages noirs, derrière le navire (vus d'en haut, ils ne le cachent pas)
      for (let k = 0; k < 11; k++) {
        const b = nuageBoule(0x4e5064, 0.88);
        const a = Math.PI + (k / 10) * Math.PI + (R() - 0.5) * 0.2;
        const r = 15 + R() * 9;
        b.scale.set(5 + R() * 4, 1.6 + R() * 1.2, 4 + R() * 3);
        b.position.set(Math.cos(a) * r, 9 + R() * 4, Math.sin(a) * r * 0.9 - 4);
        g.add(b);
      }
      const nb = 700;
      const pts = new Float32Array(nb * 6);
      for (let k = 0; k < nb; k++) { const x = (R() - 0.5) * 44; const z = (R() - 0.5) * 32; const y = R() * 16; pts.set([x, y, z, x - 0.3, y - 1.2, z], k * 6); }
      const pluieGeo = new THREE.BufferGeometry();
      pluieGeo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
      const pluie = new THREE.LineSegments(pluieGeo, new THREE.LineBasicMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0.55 }));
      const eclair = new THREE.Line(new THREE.BufferGeometry().setFromPoints([[0, 17], [2, 12], [-1, 8], [1.5, 4], [0, 0]].map(([x, y]) => new THREE.Vector3(x, y, 0))), new THREE.LineBasicMaterial({ color: 0xfffbd0 }));
      eclair.visible = false;
      g.add(pluie, eclair);
      let prochain = 0;
      maj = (s, dt) => {
        const p = pluieGeo.attributes.position;
        for (let k = 0; k < nb; k++) {
          let y = p.getY(k * 2) - dt * 26;
          if (y < 0) y += 16;
          p.setY(k * 2, y);
          p.setY(k * 2 + 1, y - 1.2);
        }
        p.needsUpdate = true;
        if (s > prochain) { prochain = s + 1.6 + Math.random() * 3; eclair.position.set((Math.random() - 0.5) * 24, 0, (Math.random() - 0.5) * 16); eclair.userData.fin = s + 0.18; }
        eclair.visible = s < (eclair.userData.fin || 0);
        hemi.intensity = eclair.visible ? 2.4 : 0.75;
      };
    }
    // le monstre marin ; le maître des lieux (V4) sort de l'eau de la même façon, devant son île (maitre-<île>.glb)
    if (type === "monstre" || type === "maitre") {
      const tentacules = [];
      for (let k = 0; k < 5; k++) {
        const t = new THREE.Group();
        const a = (k / 5) * Math.PI * 2 + 0.4;
        t.position.set(Math.cos(a) * 7, 0, Math.sin(a) * 6);
        const boules = [];
        for (let b = 0; b < 11; b++) {
          const m = new THREE.Mesh(new THREE.SphereGeometry(0.75 - b * 0.055, 12, 8), plastique(b % 2 ? 0x9b4dff : 0x8a3fe6));
          if (b % 3 === 1) { const v = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), plastique(0xff9cc8)); v.position.set(0.55 - b * 0.03, 0, 0); m.add(v); }
          t.add(m);
          boules.push(m);
        }
        t.userData = { a, boules };
        tentacules.push(t);
        g.add(t);
      }
      const oeil = (x) => { const o = new THREE.Mesh(new THREE.SphereGeometry(1.1, 14, 10), plastique(0xffffff)); const p = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), plastique(0x12050d)); p.position.set(0.75, 0.1, 0); o.add(p); o.position.set(x, 0.4, 9.5); return o; };
      const yeux = new THREE.Group();
      yeux.add(oeil(-1.3), oeil(1.3));
      yeux.rotation.y = -Math.PI / 2;
      g.add(yeux);
      maj = (s) => {
        for (const t of tentacules) {
          t.userData.boules.forEach((b, i) => {
            const u = i / 10;
            b.position.set(Math.sin(s * 1.8 + t.userData.a * 3 + u * 3) * u * 2.2, u * 9 + Math.sin(s * 2 + i) * 0.1, Math.cos(s * 1.4 + u * 2) * u * 1.2);
          });
        }
        yeux.position.y = Math.sin(s * 1.3) * 0.25;
      };
      const dessines = [...g.children];
      const majDessin = maj;
      let corps = null;
      let anims = [];
      let sortie = 0;
      const nomModele = type === "maitre" && /^[a-z]{2,20}$/.test(String(ev.ile || "")) ? `maitre-${ev.ile}` : "monstre";
      if (type === "maitre") g.userData.decalage = v3(7, -2);
      creature(nomModele, 0.06).then((c) => {
        if (detruit) return;
        for (const o of dessines) { g.remove(o); o.traverse((x) => x.geometry?.dispose?.()); }
        // ce qui sort de l'eau (la tête, les tentacules) ; l'écume reste à la surface
        corps = new THREE.Group();
        for (const o of [...c.modele.children]) if (!o.userData.effet) corps.add(o);
        c.modele.add(corps);
        corps.position.y = -16;
        anims = c.anims;
        if (type === "maitre") { c.modele.scale.setScalar(1.35); c.modele.rotation.y = -Math.PI * 0.75; } // plus grand, tourné vers le navire et vers nous
        g.add(c.modele);
      }).catch((e) => { erreurs.push(`${nomModele} : ${e.message}`); });
      maj = (s, dt) => {
        if (!corps) return majDessin(s, dt);
        sortie = Math.min(1, sortie + dt / 2.6);
        corps.position.y = -16 * Math.pow(1 - sortie, 3);
        for (const a of anims) a(s, dt);
      };
      g.userData.modele = () => Boolean(corps);
    }
    if (type === "fantome") {
      g.userData.decalage = v3(-8, 6);
      const brume = [];
      for (let k = 0; k < 9; k++) {
        const b = nuageBoule(0xc9d4dc, 0.5);
        b.scale.set(2.4 + R() * 2, 0.8 + R() * 0.6, 2.4 + R() * 2);
        b.position.set((R() - 0.5) * 14, 0.4, (R() - 0.5) * 10);
        b.userData.a = R() * 6;
        g.add(b);
        brume.push(b);
      }
      let corps = null;
      let anims = [];
      let sortie = 0;
      creature("fantome", 0.03).then((c) => {
        if (detruit) return;
        corps = c.modele;
        corps.scale.setScalar(1.5);
        corps.rotation.y = Math.PI;
        anims = c.anims;
        g.add(corps);
      }).catch((e) => { erreurs.push(`fantome : ${e.message}`); });
      maj = (s, dt) => {
        for (const b of brume) { b.position.x += Math.sin(s * 0.3 + b.userData.a) * 0.01; b.material.opacity = 0.38 + Math.sin(s * 0.8 + b.userData.a) * 0.12; }
        if (!corps) return;
        sortie = Math.min(1, sortie + dt / 3);
        corps.position.y = -6 * Math.pow(1 - sortie, 2) + Math.sin(s * 1.1) * 0.25;
        corps.rotation.z = Math.sin(s * 0.9) * 0.05;
        for (const a of anims) a(s, dt);
      };
      g.userData.modele = () => Boolean(corps);
    }
    if (type === "vent") {
      const traits = Array.from({ length: 16 }, () => {
        const t = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.12), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
        t.rotation.x = -Math.PI / 2;
        t.userData = { phase: Math.random(), y: 1 + Math.random() * 6, z: (Math.random() - 0.5) * 22 };
        g.add(t);
        return t;
      });
      maj = (s) => {
        for (const t of traits) {
          const p = (s * 0.45 + t.userData.phase) % 1;
          t.position.set(-22 + p * 44, t.userData.y, t.userData.z);
          t.material.opacity = Math.sin(p * Math.PI) * 0.75;
        }
      };
    }
    if (type === "bouteille") {
      const b = new THREE.Group();
      const verre = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.9, 14), new THREE.MeshPhongMaterial({ color: 0x5fd39a, transparent: true, opacity: 0.6, shininess: 120, specular: 0xffffff }));
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.4, 0.7, 12), verre.material);
      col.position.y = 1.25;
      const bouchon = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 10), plastique(0x9a6a40));
      bouchon.position.y = 1.7;
      const papier = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.3, 10), plastique(0xf3e2bd));
      b.add(verre, col, bouchon, papier);
      b.rotation.z = 1.3;
      const halo = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.7, 30), new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.6, depthWrite: false }));
      halo.rotation.x = -Math.PI / 2;
      const zone = new THREE.Mesh(new THREE.SphereGeometry(3.6, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
      zone.userData.bouteille = true;
      g.add(b, halo, zone);
      g.userData.decalage = v3(6, 5);
      creature("bouteille", 0.025).then((c) => {
        if (detruit) return;
        for (const o of [verre, col, bouchon, papier]) { b.remove(o); o.geometry.dispose(); }
        c.modele.position.y = -1.3;
        c.modele.scale.setScalar(1.15);
        b.add(c.modele);
        g.userData.modele = () => true;
      }).catch((e) => { erreurs.push(`bouteille : ${e.message}`); });
      maj = (s) => {
        b.position.y = 0.3 + Math.sin(s * 2) * 0.25;
        b.rotation.x = Math.sin(s * 1.3) * 0.2;
        halo.scale.setScalar(1 + ((s * 0.8) % 1) * 0.8);
        halo.material.opacity = 0.7 * (1 - ((s * 0.8) % 1));
      };
    }
    return { type, groupe: g, maj };
  }

  // ---------- les étiquettes (en HTML, au-dessus de la toile) ----------
  const etiquettes = new Map();
  function etiquette(cle, classe) {
    let e = etiquettes.get(cle);
    if (!e) {
      e = document.createElement("div");
      e.className = `gl-etiquette ${classe}`;
      couche.append(e);
      etiquettes.set(cle, e);
    }
    return e;
  }
  const projete = new THREE.Vector3();
  function placer(e, p, dy = 0) {
    projete.copy(p);
    projete.y += dy;
    projete.project(camera);
    const vis = projete.z < 1 && Math.abs(projete.x) < 1.1 && Math.abs(projete.y) < 1.1;
    e.style.opacity = vis ? "" : "0";
    if (vis) e.style.transform = `translate(${((projete.x + 1) / 2) * L}px, ${((1 - projete.y) / 2) * Hc}px) translate(-50%, -100%)`;
  }

  // ---------- la caméra ----------
  let L = 960;
  let Hc = 540;
  const cam = { cible: v3(0, 0), dist: 200, tilt: 0.62, yaw: 0, voulu: { cible: v3(0, 0), dist: 200, tilt: 0.62 } };
  let mode = "navire";
  let zoom = 1; // les boutons ＋ / − (et le pincement sur un pavé tactile)
  const decalage = v3(0, 0);
  let parallaxe = 0;
  function distanceEnsemble() {
    const fovV = (camera.fov * Math.PI) / 180;
    const fovH = 2 * Math.atan(Math.tan(fovV / 2) * camera.aspect);
    return Math.max((MER_X * 1.08) / Math.tan(fovH / 2), (MER_Z * 1.25) / Math.tan(fovV / 2)) * 1.02;
  }
  function viser() {
    const v = cam.voulu;
    if (mode === "ensemble") { v.cible.set(0, 0, 6).add(decalage); v.dist = distanceEnsemble() * Math.min(1, zoom * 1.6); v.tilt = 0.5; }
    else if (mode === "ile" && vise) {
      v.cible.copy(vise).add(decalage);
      // une île très haute (le Grand Arbre) : on vise un peu plus haut que la mer, pour la voir en entier
      if (viseIle?.haut > 8) v.cible.y += Math.min(4, (viseIle.haut - 8) * 0.55);
      v.dist = 46 * zoom;
      v.tilt = 0.95 - (1 - Math.min(1, zoom)) * 0.25;
    }
    else {
      v.cible.copy(porteur.position);
      v.dist = (camera.aspect < 1 ? 64 : 48) * zoom;
      // pendant le défi du navire qu'on regarde : toute l'arène dans l'image
      const a = fete?.cadre();
      if (a) { v.cible.x += (a.x - v.cible.x) * a.e; v.cible.z += (a.z - v.cible.z) * a.e; v.dist *= 1 + (camera.aspect < 1 ? 0.8 : 0.42) * a.e; }
      v.cible.add(decalage);
      v.tilt = 0.9 - (1 - Math.min(1, zoom)) * 0.2;
    }
  }
  let vise = null;
  let viseIle = null; // l'île que la caméra regarde (pour sa hauteur)

  // ---------- les données ----------
  let donnees = null;
  let signature = "";
  let progres = 0;
  let progresVoulu = 0;
  let premier = true;
  function etatDe(id) {
    for (const e of donnees?.route || []) for (const x of e) if (x.id === id) return x;
    return null;
  }
  let flotteVue = "";
  let traineeNavire = null;
  function maj(d) {
    if (!d?.route) return;
    const avant = donnees;
    // la flotte (V4) : on change de navire regardé → il prend tout de suite sa place, sans glisser depuis l'autre
    const vue = d.flotte?.id || "";
    if (vue !== flotteVue) { flotteVue = vue; signature = ""; premier = true; if (avant) mode = d.flotte?.ensemble ? "ensemble" : "navire"; }
    habillerNavire(d.flotte ? themeNavire(d.flotte.couleurs, d.flotte.embleme, d.flotte.drapeau, d.flotte.modele) : THEME_BARHAW);
    const typeTrainee = d.flotte?.trainee || "";
    if ((traineeNavire?.type || "") !== typeTrainee) { traineeNavire?.detruire(); traineeNavire = typeTrainee ? creerTrainee(typeTrainee, scene, L < 760) : null; }
    majFlotte(d.flotte?.autres || []);
    donnees = d;
    const sig = JSON.stringify([d.voyage, d.etape, d.cible?.id, Boolean(d.vote), d.route.map((e) => e.map((x) => x.etat))]);
    const arrivee = avant && (d.voyage > avant.voyage || (d.voyage === avant.voyage && d.etape > avant.etape));
    if (sig !== signature) {
      signature = sig;
      construireRoute(d);
      if (arrivee) {
        const ile = d.route[d.etape]?.find((x) => x.etat === "atteinte");
        const i = ile && iles.get(ile.id);
        if (i) { i.disparition = 1; vise = v3(i.x, i.z); viseIle = i; mode = "ile"; setTimeout(() => { if (mode === "ile") mode = "navire"; }, 4200); fete.feter(i.x, i.z, leger ? 5 : 8); } // terre ! un feu d'artifice
        progres = 0;
      }
    }
    for (const [id, i] of iles) {
      const e = etatDe(id);
      // une île qui n'est pas sur la route de ce voyage (les îles de la V4 avant le 22 décembre) n'existe pas sur la carte
      i.groupe.visible = Boolean(e);
      if (i.indexMer !== undefined) uniformsMer.uIles.value[i.indexMer].z = e ? rayonMer(i) : 0;
      i.etat = e?.etat || "inconnue";
      const visible = i.etat === "atteinte" || i.etat === "cible" || i.etat === "vote";
      for (const c of i.contenu) c.visible = visible;
      i.visible = visible;
      if (visible) chargerIle(i);
      if (!visible) i.nuage.visible = true;
      else if (!i.disparition) i.nuage.visible = false;
      i.anneau.visible = i.etat === "cible" || i.etat === "vote";
      for (const r of i.reliefs) r.material.uniforms.uGris.value = i.etat === "atteinte" || i.etat === "cible" || i.etat === "vote" ? 0 : 0.6;
    }
    progresVoulu = Math.min(1, d.milles / Math.max(1, d.longueur));
    if (premier) { progres = progresVoulu; premier = false; }
    // l'événement en mer
    const type = d.evenement?.type || "";
    const cleEv = type === "maitre" ? `maitre:${d.evenement.ile}` : type;
    if ((evenement?.cle || "") !== cleEv) {
      if (evenement) { mer3d.remove(evenement.groupe); evenement.groupe.traverse((o) => o.geometry?.dispose?.()); hemi.intensity = 1.1; }
      evenement = type ? creerEvenement(type, d.evenement) : null;
      if (evenement) { evenement.cle = cleEv; mer3d.add(evenement.groupe); }
    }
    etincelles.visible = Boolean(d.live);
    fete.maj(d);
    majEtiquettes();
  }
  function majEtiquettes() {
    const d = donnees;
    const vues = new Set();
    for (const [id, i] of iles) {
      const e = etatDe(id);
      if (!e) continue;
      const inconnue = i.etat === "inconnue" || i.etat === "ecartee";
      const el = etiquette(`ile:${id}`, "");
      el.className = `gl-etiquette gl-ile-${i.etat}${d.recit?.includes(id) ? " gl-recit" : ""}`; // gl-recit : une page du récit attend d'être écoutée
      const voix = d.vote?.choix.find((c) => c.id === id);
      const texte = inconnue ? (i.etat === "ecartee" ? "Pas cette fois" : "?") : `${e.emoji}|${e.nom}${i.etat === "cible" ? " · prochaine île" : ""}${voix ? ` · ${voix.voix} voix` : ""}`;
      if (el.dataset.texte !== texte) {
        el.dataset.texte = texte;
        const [emoji, nom] = texte.split("|");
        el.textContent = emoji;
        if (nom) { const sp = document.createElement("span"); sp.className = "gl-nom-ile"; sp.textContent = ` ${nom}`; el.append(sp); }
      }
      vues.add(`ile:${id}`);
    }
    const n = etiquette("navire", "gl-etiquette-navire");
    // pendant un défi : les points de la commu ; après : la couronne du vainqueur
    const duel = (id, nom) => {
      const pts = fete?.score(id);
      if (pts !== null && pts !== undefined) return `⚔️ ${nom} · ${pts.toLocaleString("fr-FR")} pts`;
      return fete?.gagnant() === id ? `👑 ${nom} · vainqueur du défi` : "";
    };
    // dans la flotte : le nom et le rang dans la course ; sinon, l'avance de l'étape
    const t = d.flotte?.nom ? duel(d.flotte.id, d.flotte.nom) || `⛵ ${d.flotte.nom}${d.flotte.rang ? ` · ${d.flotte.rang}` : ""}${d.live ? " · 🔴" : ""}` : `⛵ ${Math.floor(Math.min(1, d.milles / d.longueur) * 100)} %${d.live ? " · 🔴 vent arrière" : ""}`;
    if (n.textContent !== t) n.textContent = t;
    if (d.flotte) n.style.setProperty("--c1", themeNavire(d.flotte.couleurs).c1); else n.style.removeProperty("--c1");
    vues.add("navire");
    // les autres navires de la flotte : leur nom et leur avance ; un clic les regarde
    for (const [id, f] of flotte) {
      const e = etiquette(`flotte:${id}`, "gl-etiquette-flotte");
      const tf = duel(id, f.d.nom || id) || `⛵ ${f.d.nom || id}${f.d.rang ? ` · ${f.d.rang}` : ""}${f.d.live ? " · 🔴" : ""}`;
      if (e.dataset.texte !== tf) {
        e.dataset.texte = tf;
        e.textContent = tf;
        e.style.setProperty("--c1", f.theme.c1);
        e.setAttribute("role", "button");
        e.setAttribute("tabindex", "0");
        e.setAttribute("aria-label", `Regarder le navire de ${f.d.nom || id}`);
      }
      if (!e.dataset.pret) {
        e.dataset.pret = "1";
        e.addEventListener("click", () => surNavire(id));
        e.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); surNavire(id); } });
      }
      vues.add(`flotte:${id}`);
    }
    if (d.evenement?.type === "bouteille") {
      const b = etiquette("bouteille", "gl-etiquette-bouteille");
      if (!b.dataset.pret) {
        b.dataset.pret = "1";
        b.textContent = "🍾 Ouvre-moi !";
        b.setAttribute("role", "button");
        b.addEventListener("click", () => surBouteille());
      }
      vues.add("bouteille");
    }
    for (const [cle, e] of etiquettes) if (!vues.has(cle)) { e.remove(); etiquettes.delete(cle); }
  }

  // ---------- souris et doigts : glisser pour se déplacer, cliquer sur une île ou la bouteille ----------
  const rayon = new THREE.Raycaster();
  const souris = new THREE.Vector2();
  let appui = null;
  const cliquables = () => [...[...iles.values()].map((i) => i.zone), ...(evenement?.type === "bouteille" ? [evenement.groupe.children.find((c) => c.userData.bouteille)] : [])];
  function viseSous(ev) {
    const r = canvas.getBoundingClientRect();
    souris.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    rayon.setFromCamera(souris, camera);
    return rayon.intersectObjects(cliquables(), false)[0]?.object || null;
  }
  const surAppui = (ev) => { appui = { x: ev.clientX, y: ev.clientY, d: decalage.clone(), bouge: false, id: ev.pointerId }; };
  const surBouge = (ev) => {
    const r = canvas.getBoundingClientRect();
    parallaxe = ((ev.clientX - r.left) / r.width - 0.5) * 0.12;
    if (!appui) { canvas.style.cursor = viseSous(ev) ? "pointer" : "grab"; return; }
    const dx = ev.clientX - appui.x;
    const dy = ev.clientY - appui.y;
    if (!appui.bouge && Math.hypot(dx, dy) < 6) return;
    if (!appui.bouge) { appui.bouge = true; try { canvas.setPointerCapture(appui.id); } catch {} }
    const echelle = cam.dist / Math.max(300, Hc) * 1.1;
    decalage.set(Math.max(-110, Math.min(110, appui.d.x - dx * echelle)), 0, Math.max(-60, Math.min(60, appui.d.z - dy * echelle)));
    canvas.style.cursor = "grabbing";
  };
  const surLache = (ev) => {
    if (appui && !appui.bouge) {
      const o = viseSous(ev);
      if (o?.userData.bouteille) surBouteille();
      else if (o?.userData.ile) { const i = iles.get(o.userData.ile); vise = v3(i.x, i.z); viseIle = i; decalage.set(0, 0, 0); mode = "ile"; surIle(o.userData.ile); }
    }
    appui = null;
  };
  canvas.addEventListener("pointerdown", surAppui);
  canvas.addEventListener("pointermove", surBouge);
  canvas.addEventListener("pointerup", surLache);
  canvas.addEventListener("pointercancel", () => { appui = null; });
  canvas.addEventListener("pointerleave", () => { parallaxe = 0; });

  // ---------- la fête (V4) : le jour et la nuit, les lumières, le ciel, l'arène des défis (js/grandline-fete.js) ----------
  fete = creerFete({
    renderer, scene, camera, iles, flotte, porteur, cam, leger, v4: ilesV4.length > 0, v3, hasard, cap, pointDeMer, lireV4, sceneGLB, habiller, animateurs,
    matiere: (nom, vc) => matiereGLB(nom, THEME_BARHAW, vc, true), BRILLANTS, eclabousse, jetDeau, sillages, eclabs, lanternes, uniformsMer, MER_X, MER_Z, erreurs,
    evenement: () => evenement, tempete: () => evenement?.type === "tempete", eclair: () => hemi.intensity > 2, detruit: () => detruit, surAmbiance, surLampes: allumerVitres,
  });
  if (ambiance) fete.ambiance(ambiance);

  // ---------- l'animation ----------
  let marche = false;
  let dernier = performance.now();
  const debut = dernier;
  let sillageProchain = 0;
  let intro = 1;
  let images = 0;
  let lenteur = 0.016;
  let prochainReglage = 0;
  const pRoute = new THREE.Vector3();
  function image(maintenant) {
    if (!marche) return;
    images++;
    requestAnimationFrame(image);
    const ecoule = (maintenant - dernier) / 1000;
    // la caméra suit le vrai temps, même si l'appareil est lent ; jamais en arrière (sur un appareil lent, la première image peut
    // dater d'avant le démarrage : les traînées attendaient alors autant de secondes avant de commencer)
    const dtReel = Math.max(0, Math.min(0.3, ecoule));
    if (images > 20 && ecoule < 1) {
      lenteur = lenteur * 0.95 + ecoule * 0.05;
      if (lenteur > 0.045 && renderer.getPixelRatio() > 0.75 && maintenant > prochainReglage) {
        // l'appareil peine (moins de ~22 images par seconde) : on dessine moins de pixels
        renderer.setPixelRatio(Math.max(0.75, renderer.getPixelRatio() - 0.25));
        renderer.setSize(Math.round(L), Math.round(Hc), false);
        prochainReglage = maintenant + 3000;
        lenteur = 0.03;
      }
    }
    const dt = Math.min(0.05, dtReel);
    dernier = maintenant;
    const s = (maintenant - debut) / 1000;
    uniformsMer.uT.value = s;
    uniformsMer.uSombre.value += ((evenement?.type === "tempete" ? 1 : 0) - uniformsMer.uSombre.value) * Math.min(1, dt * 1.5);
    eclairage5.value = 1 - 0.36 * uniformsMer.uSombre.value;
    temps5.value = s;
    for (const i of iles.values()) if (i.visible) for (const a of i.anims) a(s, dt);
    // le navire avance doucement jusqu'à sa place ; la route de l'étape suit
    progres += (progresVoulu - progres) * Math.min(1, dt * 0.8);
    if (donnees && Math.abs(progres - progresTrace) > 0.008) construireEtape(progres);
    let coupCanon = 0; // le coup de roulis quand il tire au canon (pendant un défi)
    if (donnees) {
      const { pos: p, dir } = surRoute(progres);
      // pendant un défi, le navire quitte sa route pour l'arène : la fête dit où il est vraiment
      const q = fete.pose(donnees.flotte?.id || "moi", p, dir, dt);
      porteur.position.set(q.x, 0, q.z);
      porteur.rotation.y = q.cap;
      coupCanon = q.roulis;
    }
    const houle = evenement?.type === "tempete" ? 2.4 : 1;
    navire.position.y = 0.05 + Math.sin(s * 1.7) * 0.14 * houle;
    navire.rotation.x = Math.sin(s * 1.3) * 0.05 * houle + coupCanon;
    navire.rotation.z = Math.sin(s * 1.1 + 1) * 0.035 * houle;
    const vent = evenement?.type === "vent" || donnees?.live ? 1.35 : 1;
    navire.userData.animer(s, vent);
    // les autres navires de la flotte : chacun glisse jusqu'à sa place sur sa route, et se balance
    for (const [id, f] of flotte) {
      f.progres += (f.voulu - f.progres) * Math.min(1, dt * 0.8);
      const { pos: p, dir } = surChemins(f.etape, f.progres);
      // deux navires au même endroit (au port, au départ) : on les décale un peu
      const ecart = p.distanceTo(porteur.position) < 6 ? f.decal * 5.5 : 0;
      const q = fete.pose(id, pRoute.set(p.x - dir.z * ecart, 0, p.z + dir.x * ecart), dir, dt);
      f.porteur.position.set(q.x, 0, q.z);
      f.porteur.rotation.y = q.cap;
      if (f.navire) {
        f.navire.position.y = 0.05 + Math.sin(s * 1.6 + f.decal) * 0.14;
        f.navire.rotation.x = Math.sin(s * 1.2 + f.decal) * 0.05 + q.roulis;
        f.navire.rotation.z = Math.sin(s * 1.05 + 1 + f.decal) * 0.035;
        f.navire.userData.animer(s + f.decal, f.d?.live ? 1.35 : 1);
      }
      f.trainee?.maj(dt, f.porteur);
    }
    traineeNavire?.maj(dt, porteur);
    // le sillage
    if (donnees && s > sillageProchain) {
      sillageProchain = s + 0.45;
      const libre = sillages.reduce((a, b) => (b.userData.age > a.userData.age ? b : a));
      const arriere = v3(-Math.cos(porteur.rotation.y) * 5, Math.sin(porteur.rotation.y) * 5);
      libre.position.set(porteur.position.x + arriere.x, 0.14, porteur.position.z + arriere.z);
      libre.userData.age = 0;
    }
    for (const w of sillages) {
      w.userData.age += dt;
      const a = w.userData.age / 2.6;
      w.material.opacity = a < 1 ? 0.55 * (1 - a) : 0;
      w.scale.setScalar(1 + a * 3);
    }
    if (etincelles.visible) {
      const p = etincelles.geometry.attributes.position;
      etincelles.userData.graines.forEach(([a, ph, r], k) => {
        const u = (s * 0.4 + ph) % 1;
        p.setXYZ(k, porteur.position.x + Math.cos(a + s) * r, 1 + u * 8, porteur.position.z + Math.sin(a + s) * r);
      });
      p.needsUpdate = true;
    }
    // les îles : l'anneau de la prochaine qui pulse, le nuage qui s'en va à l'arrivée
    for (const i of iles.values()) {
      if (i.anneau.visible) { const k = 1 + ((s * 0.6) % 1) * 0.25; i.anneau.scale.set(k, k, k); i.anneau.material.opacity = 0.9 - ((s * 0.6) % 1) * 0.7; }
      if (i.nuage.visible) i.nuage.position.y = Math.sin(s * 0.8 + i.x) * 0.4;
      if (i.disparition > 0) {
        i.disparition = Math.max(0, i.disparition - dt * 0.45);
        const k = 1 + (1 - i.disparition) * 1.6;
        i.nuage.scale.setScalar(k);
        i.nuage.children.forEach((b) => { b.material.transparent = true; b.material.opacity = i.disparition; });
        if (i.disparition === 0) { i.nuage.visible = false; i.nuage.scale.setScalar(1); i.nuage.children.forEach((b) => { b.material.opacity = 1; }); }
      }
    }
    if (evenement) {
      const decal = evenement.groupe.userData.decalage || v3(0, 0);
      evenement.groupe.position.set(porteur.position.x + decal.x, 0, porteur.position.z + decal.z);
      evenement.maj(s, dt);
    }
    // la mer qui vit (V4)
    for (const f of vie) f(s, dt);
    for (const f of pluies) f(s, dt);
    fete.image(s, dt);
    for (const r of eclabs) {
      const u = r.userData;
      if (u.age > 1.4) { r.material.opacity = 0; continue; }
      u.age += dt;
      const k = (u.taille || 1) * (1 + u.age * 2.4);
      r.scale.set(k, k, k);
      r.material.opacity = 0.75 * Math.max(0, 1 - u.age / 1.4);
    }
    for (const m of mouettes) {
      const u = m.userData;
      m.visible = evenement?.type !== "tempete";
      if (!m.visible) continue;
      const a = u.a0 + s * u.v * u.sens;
      m.position.set(porteur.position.x + Math.cos(a) * u.r, u.h + Math.sin(s * 0.9 + u.a0) * 0.6, porteur.position.z + Math.sin(a) * u.r);
      m.rotation.y = -(a + (u.sens * Math.PI) / 2);
      m.rotation.x = 0.32 * u.sens; // penchée vers l'intérieur du virage
      // elles battent des ailes, puis planent un moment
      const bat = Math.sin(s * 0.45 + u.a0 * 3) > -0.25;
      for (const f of u.anims) f(bat ? s + u.a0 : 0, dt);
    }
    // la caméra
    viser();
    const v = cam.voulu;
    const k = Math.min(1, dtReel * (intro > 0 ? 0.9 : 2.2));
    intro = Math.max(0, intro - dtReel * 0.4);
    cam.cible.lerp(v.cible, k);
    cam.dist += (v.dist - cam.dist) * k;
    cam.tilt += (v.tilt - cam.tilt) * k;
    cam.yaw += (parallaxe - cam.yaw) * Math.min(1, dt * 2);
    const hauteur = Math.cos(cam.tilt) * cam.dist;
    const recul = Math.sin(cam.tilt) * cam.dist;
    camera.position.set(cam.cible.x + Math.sin(cam.yaw) * recul, hauteur, cam.cible.z + Math.cos(cam.yaw) * recul);
    camera.lookAt(cam.cible);
    fete.rendre(s); // de jour : la scène telle quelle ; le soir et la nuit : teintée, avec ses lumières
    // les étiquettes (sur un petit écran, en vue d'ensemble : seulement les emojis)
    couche.classList.toggle("compact", mode === "ensemble" && L < 760);
    for (const [cle, e] of etiquettes) {
      if (cle === "navire") placer(e, porteur.position, 13);
      else if (cle.startsWith("flotte:")) { const f = flotte.get(cle.slice(7)); if (f) placer(e, f.porteur.position, 11); }
      else if (cle === "bouteille" && evenement) placer(e, evenement.groupe.position, 3.5);
      else if (cle.startsWith("ile:")) { const i = iles.get(cle.slice(4)); placer(e, v3(i.x, i.z), i.etat === "inconnue" || i.etat === "ecartee" ? 8 : i.haut); }
    }
  }
  function demarrer() { if (marche) return; marche = true; dernier = performance.now(); requestAnimationFrame(image); }
  function arreter() { marche = false; }

  function taille(l, h) {
    L = Math.max(200, l);
    Hc = Math.max(200, h);
    renderer.setSize(Math.round(L), Math.round(Hc), false);
    camera.aspect = L / Hc;
    camera.updateProjectionMatrix();
  }
  // le départ : vue d'ensemble de haut, puis la caméra descend vers le navire
  taille(canvas.clientWidth || 960, canvas.clientHeight || 540);
  cam.dist = distanceEnsemble() * 1.5;
  cam.tilt = 0.15;

  function zoomer(f) {
    zoom = Math.max(ilesV5.length && leger ? 0.33 : 0.28, Math.min(1.6, zoom * f)); // sur téléphone, le niveau 5 s'arrête un peu avant : ses images sont plus petites
    return zoom;
  }
  canvas.addEventListener("wheel", (ev) => {
    if (!ev.ctrlKey) return; // la molette seule fait défiler la page ; le pincement (ou Ctrl + molette) zoome
    ev.preventDefault();
    zoomer(Math.exp(ev.deltaY * 0.01));
  }, { passive: false });
  function vue(m) {
    zoom = 1;
    mode = m === "ensemble" ? "ensemble" : "navire";
    decalage.set(0, 0, 0);
    vise = null;
  }
  function tropLent() {
    const gl = renderer.getContext();
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const nom = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(nom)) return true;
    const t0 = performance.now();
    for (let k = 0; k < 3; k++) renderer.render(scene, camera);
    gl.finish();
    return performance.now() - t0 > 300;
  }
  function detruire() {
    detruit = true;
    arreter();
    for (const e of etiquettes.values()) e.remove();
    canvas.removeEventListener("pointerdown", surAppui);
    canvas.removeEventListener("pointermove", surBouge);
    canvas.removeEventListener("pointerup", surLache);
    scene.traverse((o) => { o.geometry?.dispose?.(); });
    fete.detruire();
    renderer.dispose();
    renderer.forceContextLoss();
  }
  // regarder une île de près (la démo V4, les essais)
  function voirIle(id) {
    const i = iles.get(id);
    if (!i) return;
    vise = v3(i.x, i.z);
    viseIle = i;
    decalage.set(0, 0, 0);
    zoom = 0.8;
    mode = "ile";
  }
  // l'ambiance : { phase: "jour" | "aube" | "crepuscule" | "nuit", nuit: 0…1, or: 0…1 } (site.js la donne, à l'heure de Paris)
  const reglerAmbiance = (a) => fete.ambiance(a);
  const feter = (n) => fete.feter(porteur.position.x, porteur.position.z, n || 7, { large: 18 });
  return { voirIle, maj, taille, vue, zoomer, demarrer, arreter, tropLent, detruire, ambiance: reglerAmbiance, feter, saut: () => fete.saut(), mode: () => mode, etat: () => ({ fete: fete.etat(), leger, progres, progresVoulu, mode, navire: porteur.position.clone(), camera: camera.position.clone(), modeles: [...iles.values()].filter((i) => i.modele).map((i) => i.id), niveau5: [...iles.values()].filter((i) => i.modele && i.niveau === 5).map((i) => i.id), vitres: Math.round((matVitre?.opacity || 0) * 100) / 100, vie: vie.length, pluies: pluies.length, navireBlender: Boolean(navire.userData.blender), erreurs, images, creatures: [...glbCreatures.keys()], mouettes: mouettes.length, evenementModele: Boolean(evenement?.groupe.userData.modele?.()), flotte: [...flotte].map(([id, f]) => ({ id, blender: Boolean(f.navire), x: f.porteur.position.x, z: f.porteur.position.z })) }) };
}
export { lireGLB, sceneGLB, habiller, animateurs, themeNavire, creerTrainee, pastille, toile };
