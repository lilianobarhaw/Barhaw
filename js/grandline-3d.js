// La Grand Line de Barhaw, en 3D : une carte au trésor en parchemin, vue d'en haut, avec les îles en relief
// (courbes de niveau, hachures), la mer à l'aquarelle qui bouge, la route en pointillés rouges, et le navire
// de la commu, un petit navire-jouet aux couleurs de Barhaw, qui flotte dessus.
// Tout est inventé (la carte, les îles, le navire) ; ce fichier ne fait que dessiner ce que site.js lui donne
// (les données du bot) et dit quand on clique sur une île ou sur la bouteille.
// three.js r170 (licence MIT, © three.js authors) est rangé à côté : la page n'accepte que ses propres scripts.
import * as THREE from "./three-r170.module.min.js";

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
  g.userData = { grande, hune, flamme };
  return g;
}

// ---------- la mer à l'aquarelle, sur une feuille de parchemin ----------
function materiauMer(uniforms) {
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      uniform float uT;
      varying vec2 vXZ;
      void main() {
        vec3 p = position;
        vXZ = p.xz;
        float dans = step(abs(p.x), ${MER_X.toFixed(1)}) * step(abs(p.z), ${MER_Z.toFixed(1)});
        p.y += (sin(p.x * 0.33 + uT * 0.9) * 0.09 + sin(p.z * 0.41 - uT * 1.1) * 0.07) * dans;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      uniform float uT; uniform float uSombre; uniform vec3 uIles[16];
      varying vec2 vXZ;
      float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float bruit(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
      float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int k = 0; k < 5; k++) { s += a * bruit(p); p *= 2.03; a *= 0.5; } return s; }
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
        vec3 profond = vec3(0.43, 0.63, 0.80), clair = vec3(0.71, 0.86, 0.94);
        float cote = 0.0, ecume = 0.0;
        for (int i = 0; i < 16; i++) {
          vec3 il = uIles[i];
          if (il.z <= 0.0) continue;
          float d = length(p - il.xy) - il.z;
          cote = max(cote, 1.0 - smoothstep(0.0, 7.0, d));
          float vague = sin(d * 2.4 - uT * 1.7) * 0.5 + 0.5;
          ecume = max(ecume, (1.0 - smoothstep(0.0, 1.8, abs(d - 0.4))) * vague * step(-0.6, d));
        }
        vec3 mer = mix(profond, clair, n * 0.7 + cote * 0.45);
        float tache = fbm(p * 0.11 + 7.0);
        mer = mix(mer, mer * 0.86, smoothstep(0.55, 0.78, tache));
        float lignes = smoothstep(0.94, 1.0, sin(p.x * 0.75 + sin(p.y * 0.45) * 2.2 + uT * 0.55) * sin(p.y * 1.05 + uT * 0.35));
        mer = mix(mer, vec3(0.97, 0.99, 1.0), lignes * 0.35);
        mer = mix(mer, vec3(1.0), ecume * 0.6);
        mer -= h21(floor(p * 9.0)) * 0.035;
        mer = mix(mer, vec3(0.19, 0.22, 0.32), uSombre * 0.6);
        // les terres du bord de la carte, en sépia hachuré (comme une vieille carte)
        float terre = smoothstep(0.6, 0.64, fbm(p * 0.035 + 21.0) + (1.0 - smoothstep(0.0, 20.0, bordMer)) * 0.45);
        float relief = fbm(p * 0.3);
        vec3 sepia = mix(vec3(0.62, 0.45, 0.26), vec3(0.43, 0.29, 0.16), relief);
        sepia = mix(sepia, sepia * 0.8, step(0.6, fract((p.x + p.y) * 1.2)) * relief);
        float dansMer = smoothstep(0.0, 2.0, bordMer);
        vec3 c = mix(papier, mer, dansMer);
        c = mix(c, sepia, terre * smoothstep(0.0, 1.0, 22.0 - min(mx, mz)) * step(-30.0, -min(mx, mz)) * dansMer);
        // le trait d'encre au bord de la mer
        c = mix(c, vec3(0.32, 0.2, 0.1), (1.0 - smoothstep(0.0, 0.5, abs(bordMer - 0.2))) * 0.55);
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

export function creerGrandLine3D(canvas, { positions, couche, surIle = () => {}, surBouteille = () => {} }) {
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
  const uniformsMer = { uT: { value: 0 }, uSombre: { value: 0 }, uIles: { value: Array.from({ length: 16 }, () => new THREE.Vector3(0, 0, 0)) } };
  const merGeo = new THREE.PlaneGeometry(W, H, 180, 110);
  merGeo.rotateX(-Math.PI / 2);
  const mer = new THREE.Mesh(merGeo, materiauMer(uniformsMer));
  scene.add(mer, roseDesVents());

  // ---------- les îles (toutes, dès le début ; ce qui est visible dépend du voyage) ----------
  const iles = new Map(); // id → { groupe, nuage, cible, theme, x, z, r }
  const anims = [];
  let n = 0;
  for (const [id, [x, z, theme]] of Object.entries(positions)) {
    const t = THEMES[theme] || THEMES.plage;
    const R = hasard(1000 + n * 97);
    const groupe = new THREE.Group();
    groupe.position.set(x, 0, z);
    const ilots = [];
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
      const mat = new THREE.PointsMaterial({ color: 0xfff27a, size: 0.55, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
      const lucioles = new THREE.Points(geo, mat);
      groupe.add(lucioles);
      anims.push((s) => { mat.opacity = 0.55 + Math.sin(s * 3) * 0.35; lucioles.rotation.y = s * 0.05; });
    }
    // le nuage qui cache une île encore inconnue
    const nuage = new THREE.Group();
    for (let k = 0; k < 9; k++) {
      const b = nuageBoule();
      b.scale.set(3 + R() * 2.5, 1.8 + R() * 1.4, 3 + R() * 2.5);
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
    iles.set(id, { id, groupe, nuage, anneau, zone, contenu, theme, x, z, r: t.r * (t.ilots ? 1.9 : 1.05), reliefs: groupe.children.filter((c) => c.userData?.relief).map((c) => c.userData.relief).concat(ilots.map((i) => i.userData.relief)), etat: "", disparition: 0 });
    n++;
  }
  let k = 0;
  for (const i of iles.values()) { if (k < 16) uniformsMer.uIles.value[k].set(i.x, i.z, i.r * 0.92); k++; }

  // ---------- le navire ----------
  const navire = navireJouet();
  navire.scale.setScalar(1.8);
  const ombre = new THREE.Mesh(new THREE.CircleGeometry(5.2, 24), new THREE.MeshBasicMaterial({ color: 0x1a3550, transparent: true, opacity: 0.22, depthWrite: false }));
  ombre.rotation.x = -Math.PI / 2;
  ombre.scale.set(1.4, 0.8, 1);
  const porteur = new THREE.Group();
  porteur.add(ombre, navire);
  scene.add(porteur);
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
    const p = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffd36b, size: 0.5, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
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

  // ---------- les événements en mer ----------
  const mer3d = new THREE.Group();
  scene.add(mer3d);
  let evenement = null; // { type, groupe, maj(s) }
  function creerEvenement(type) {
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
    if (type === "monstre") {
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
  const decalage = v3(0, 0);
  let parallaxe = 0;
  function distanceEnsemble() {
    const fovV = (camera.fov * Math.PI) / 180;
    const fovH = 2 * Math.atan(Math.tan(fovV / 2) * camera.aspect);
    return Math.max((MER_X * 1.08) / Math.tan(fovH / 2), (MER_Z * 1.25) / Math.tan(fovV / 2)) * 1.02;
  }
  function viser() {
    const v = cam.voulu;
    if (mode === "ensemble") { v.cible.set(0, 0, 6).add(decalage); v.dist = distanceEnsemble(); v.tilt = 0.5; }
    else if (mode === "ile" && vise) { v.cible.copy(vise).add(decalage); v.dist = 46; v.tilt = 0.95; }
    else { v.cible.copy(porteur.position).add(decalage); v.dist = camera.aspect < 1 ? 64 : 48; v.tilt = 0.9; }
  }
  let vise = null;

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
  function maj(d) {
    if (!d?.route) return;
    const avant = donnees;
    donnees = d;
    const sig = JSON.stringify([d.voyage, d.etape, d.cible?.id, Boolean(d.vote), d.route.map((e) => e.map((x) => x.etat))]);
    const arrivee = avant && (d.voyage > avant.voyage || (d.voyage === avant.voyage && d.etape > avant.etape));
    if (sig !== signature) {
      signature = sig;
      construireRoute(d);
      if (arrivee) {
        const ile = d.route[d.etape]?.find((x) => x.etat === "atteinte");
        const i = ile && iles.get(ile.id);
        if (i) { i.disparition = 1; vise = v3(i.x, i.z); mode = "ile"; setTimeout(() => { if (mode === "ile") mode = "navire"; }, 4200); }
        progres = 0;
      }
    }
    for (const [id, i] of iles) {
      const e = etatDe(id);
      i.etat = e?.etat || "inconnue";
      const visible = i.etat === "atteinte" || i.etat === "cible" || i.etat === "vote";
      for (const c of i.contenu) c.visible = visible;
      if (!visible) i.nuage.visible = true;
      else if (!i.disparition) i.nuage.visible = false;
      i.anneau.visible = i.etat === "cible" || i.etat === "vote";
      for (const r of i.reliefs) r.material.uniforms.uGris.value = i.etat === "atteinte" || i.etat === "cible" || i.etat === "vote" ? 0 : 0.6;
    }
    progresVoulu = Math.min(1, d.milles / Math.max(1, d.longueur));
    if (premier) { progres = progresVoulu; premier = false; }
    // l'événement en mer
    const type = d.evenement?.type || "";
    if ((evenement?.type || "") !== type) {
      if (evenement) { mer3d.remove(evenement.groupe); evenement.groupe.traverse((o) => o.geometry?.dispose?.()); hemi.intensity = 1.1; }
      evenement = type ? creerEvenement(type) : null;
      if (evenement) mer3d.add(evenement.groupe);
    }
    etincelles.visible = Boolean(d.live);
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
      el.className = `gl-etiquette gl-ile-${i.etat}`;
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
    const t = `⛵ ${Math.floor(Math.min(1, d.milles / d.longueur) * 100)} %${d.live ? " · 🔴 vent arrière" : ""}`;
    if (n.textContent !== t) n.textContent = t;
    vues.add("navire");
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
      else if (o?.userData.ile) { const i = iles.get(o.userData.ile); vise = v3(i.x, i.z); decalage.set(0, 0, 0); mode = "ile"; surIle(o.userData.ile); }
    }
    appui = null;
  };
  canvas.addEventListener("pointerdown", surAppui);
  canvas.addEventListener("pointermove", surBouge);
  canvas.addEventListener("pointerup", surLache);
  canvas.addEventListener("pointercancel", () => { appui = null; });
  canvas.addEventListener("pointerleave", () => { parallaxe = 0; });

  // ---------- l'animation ----------
  let marche = false;
  let dernier = performance.now();
  const debut = dernier;
  let sillageProchain = 0;
  let intro = 1;
  function image(maintenant) {
    if (!marche) return;
    requestAnimationFrame(image);
    const dt = Math.min(0.05, (maintenant - dernier) / 1000);
    dernier = maintenant;
    const s = (maintenant - debut) / 1000;
    uniformsMer.uT.value = s;
    uniformsMer.uSombre.value += ((evenement?.type === "tempete" ? 1 : 0) - uniformsMer.uSombre.value) * Math.min(1, dt * 1.5);
    for (const a of anims) a(s);
    // le navire avance doucement jusqu'à sa place ; la route de l'étape suit
    progres += (progresVoulu - progres) * Math.min(1, dt * 0.8);
    if (donnees && Math.abs(progres - progresTrace) > 0.008) construireEtape(progres);
    if (donnees) {
      const { pos: p, dir } = surRoute(progres);
      porteur.position.set(p.x, 0, p.z);
      porteur.rotation.y = -Math.atan2(dir.z, dir.x);
    }
    const houle = evenement?.type === "tempete" ? 2.4 : 1;
    navire.position.y = 0.05 + Math.sin(s * 1.7) * 0.14 * houle;
    navire.rotation.x = Math.sin(s * 1.3) * 0.05 * houle;
    navire.rotation.z = Math.sin(s * 1.1 + 1) * 0.035 * houle;
    const vent = evenement?.type === "vent" || donnees?.live ? 1.35 : 1;
    navire.userData.grande.scale.z = vent + Math.sin(s * 2.2) * 0.06;
    navire.userData.hune.scale.z = 0.8 * vent;
    navire.userData.flamme.rotation.y = Math.sin(s * 5) * 0.4;
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
    // la caméra
    viser();
    const v = cam.voulu;
    const k = Math.min(1, dt * (intro > 0 ? 0.9 : 2.2));
    intro = Math.max(0, intro - dt * 0.4);
    cam.cible.lerp(v.cible, k);
    cam.dist += (v.dist - cam.dist) * k;
    cam.tilt += (v.tilt - cam.tilt) * k;
    cam.yaw += (parallaxe - cam.yaw) * Math.min(1, dt * 2);
    const hauteur = Math.cos(cam.tilt) * cam.dist;
    const recul = Math.sin(cam.tilt) * cam.dist;
    camera.position.set(cam.cible.x + Math.sin(cam.yaw) * recul, hauteur, cam.cible.z + Math.cos(cam.yaw) * recul);
    camera.lookAt(cam.cible);
    renderer.render(scene, camera);
    // les étiquettes (sur un petit écran, en vue d'ensemble : seulement les emojis)
    couche.classList.toggle("compact", mode === "ensemble" && L < 760);
    for (const [cle, e] of etiquettes) {
      if (cle === "navire") placer(e, porteur.position, 13);
      else if (cle === "bouteille" && evenement) placer(e, evenement.groupe.position, 3.5);
      else if (cle.startsWith("ile:")) { const i = iles.get(cle.slice(4)); placer(e, v3(i.x, i.z), i.etat === "inconnue" || i.etat === "ecartee" ? 8 : 6.5); }
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

  function vue(m) {
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
    arreter();
    for (const e of etiquettes.values()) e.remove();
    canvas.removeEventListener("pointerdown", surAppui);
    canvas.removeEventListener("pointermove", surBouge);
    canvas.removeEventListener("pointerup", surLache);
    scene.traverse((o) => { o.geometry?.dispose?.(); });
    renderer.dispose();
    renderer.forceContextLoss();
  }
  return { maj, taille, vue, demarrer, arreter, tropLent, detruire, mode: () => mode, etat: () => ({ progres, progresVoulu, mode, navire: porteur.position.clone(), camera: camera.position.clone() }) };
}
